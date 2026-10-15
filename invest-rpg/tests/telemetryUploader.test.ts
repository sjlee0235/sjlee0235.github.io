// 플레이 기록 전송 통 (18차): 구분자 붙이기, 기기 큐, 묶음 크기, 보내기 조건, 접속 환경 분류

import { describe, expect, it } from 'vitest';
import { PublicGame } from '../src/engine/publicView.ts';
import type { TelemetryEvent } from '../src/engine/telemetry.ts';
import { ALL_ERAS, orderBySequence } from '../src/data/eras/index.ts';
import { shouldSendTelemetry } from '../src/ui/telemetryConfig.ts';
import {
  describeClient, FLUSH_AT, MAX_BATCH_BYTES, MAX_QUEUE, PID_KEY, QUEUE_KEY, takeBatch, TelemetryUploader,
  type SendFn, type UploaderOptions, type UploadRow,
} from '../src/ui/telemetryUploader.ts';

class MemStorage {
  m = new Map<string, string>();
  get(k: string) {
    return this.m.get(k) ?? null;
  }
  set(k: string, v: string) {
    this.m.set(k, v);
  }
}

const ev = (seq: number, data: unknown = {}): TelemetryEvent =>
  ({ v: 3, seq, type: 'favorite_toggled', eraId: '2000s', eraIndex: 0, tick: seq, data } as unknown as TelemetryEvent);

function make(over: Partial<UploaderOptions> = {}) {
  const sent: { body: string; beacon: boolean }[] = [];
  let n = 0;
  const send: SendFn = async (_url, body, beacon) => {
    sent.push({ body, beacon });
    return true;
  };
  const storage = new MemStorage();
  const up = new TelemetryUploader({
    endpoint: 'https://example.test/exec', sendEnabled: true, storage, now: () => 1_000_000, send, build: 't', randomId: () => `id${++n}`, ...over,
  });
  return { up, sent, storage };
}

describe('전송 통', () => {
  it('무작위 설치 id는 기기에 남고, 접속 id는 접속마다 새로. 접속 횟수·처음 연 날을 센다', () => {
    const storage = new MemStorage();
    let n = 0;
    const base = { endpoint: '', sendEnabled: false, storage, send: async () => true, build: 't', randomId: () => `id${++n}` };
    const a = new TelemetryUploader({ ...base, now: () => 0 + 1 });
    const b = new TelemetryUploader({ ...base, now: () => 3 * 86_400_000 + 1 });
    expect(a.pid).toBe(b.pid);
    expect(storage.get(PID_KEY)).toBe(a.pid);
    expect(a.sid).not.toBe(b.sid);
    expect([a.sessionIndex, b.sessionIndex]).toEqual([1, 2]);
    expect([a.daysSinceFirst, b.daysSinceFirst]).toEqual([0, 3]);
  });

  it('줄마다 pid·sid·gid·build·clientMs를 붙인다', () => {
    const { up } = make();
    up.setGame('777');
    up.record(ev(1));
    const r = up.peek()[0]!;
    expect(r).toMatchObject({ pid: up.pid, sid: up.sid, gid: '777', build: 't', clientMs: 1_000_000, seq: 1 });
  });

  it('보낼 곳이 없거나 꺼져 있으면 보내지 않고 기기 큐에 남긴다 → 다음 접속 때 보낸다', async () => {
    const off = make({ endpoint: '' });
    off.up.record(ev(1));
    await off.up.flush(false);
    expect(off.sent).toHaveLength(0);
    expect(JSON.parse(off.storage.get(QUEUE_KEY)!)).toHaveLength(1);
    // 같은 기기에서 주소가 생긴 뒤 다시 열면 남은 것을 보낸다
    const sent: string[] = [];
    const next = new TelemetryUploader({
      endpoint: 'https://example.test/exec', sendEnabled: true, storage: off.storage, now: () => 2, build: 't',
      send: async (_u, body) => (sent.push(body), true),
    });
    expect(next.size).toBe(1);
    await next.flush(false);
    expect(next.size).toBe(0);
    expect(JSON.parse(sent[0]!).rows[0].seq).toBe(1);
  });

  it('보내기 실패하면 큐에 그대로 두고, 성공하면 비운다', async () => {
    let ok = false;
    const { up } = make({ send: async () => ok });
    up.record(ev(1));
    up.record(ev(2));
    await up.flush(false);
    expect(up.size).toBe(2);
    ok = true;
    await up.flush(false);
    expect(up.size).toBe(0);
  });

  it(`${FLUSH_AT}개가 모이면 바로 보낸다`, async () => {
    const { up, sent } = make();
    for (let i = 1; i <= FLUSH_AT; i++) up.record(ev(i));
    await Promise.resolve();
    await Promise.resolve();
    expect(sent.length).toBeGreaterThan(0);
  });

  it('묶음 하나는 크기 한도 아래 (sendBeacon 64KB), 큐는 최대 개수까지만', async () => {
    const { up, sent } = make();
    const big = 'x'.repeat(2000);
    for (let i = 1; i <= 60; i++) up.record(ev(i, { big }));
    await up.flush(true);
    await new Promise((r) => setTimeout(r, 0));
    expect(sent.length).toBeGreaterThan(1);
    for (const s of sent) expect(s.body.length).toBeLessThan(MAX_BATCH_BYTES + 100);
    expect(sent.some((s) => s.beacon)).toBe(true);
    expect(up.size).toBe(0);
    // 보내는 중에 떠나도(beacon) 같은 줄을 두 번 보내지 않는다
    const seqs = sent.flatMap((s) => (JSON.parse(s.body).rows as UploadRow[]).map((r) => r.seq));
    expect([...seqs].sort((a, b) => a - b)).toEqual(Array.from({ length: 60 }, (_, i) => i + 1));
    const q = make({ endpoint: '' });
    for (let i = 0; i < MAX_QUEUE + 10; i++) q.up.record(ev(i));
    expect(q.up.size).toBe(MAX_QUEUE);
    expect(q.up.peek()[0]!.seq).toBe(10);
  });

  it('너무 큰 줄 하나도 단독 묶음으로 보낸다 (막히지 않게)', () => {
    const rows = [{ seq: 1, data: 'y'.repeat(MAX_BATCH_BYTES * 2) }, { seq: 2 }] as unknown as UploadRow[];
    expect(takeBatch(rows, MAX_BATCH_BYTES)).toHaveLength(1);
  });

  it('엔진에 붙이면 동의 전에는 아무것도 받지 않고, 동의하면 판 시작부터 받는다', () => {
    const { up } = make({ endpoint: '' });
    const g = PublicGame.create({ eras: orderBySequence(ALL_ERAS), seed: 5 });
    g.attachTelemetry(up);
    g.track('lp_touch', { genre: 'jazz' }, 1);
    expect(up.size).toBe(0);
    g.setConsent(true);
    const types = up.peek().map((r) => r.type);
    expect(types[0]).toBe('game_start');
    expect(types).toContain('era_start');
  });

  it('보내는 곳: GitHub Pages에서만, 디버그는 빼고', () => {
    expect(shouldSendTelemetry('sjlee0235.github.io', false)).toBe(true);
    expect(shouldSendTelemetry('sjlee0235.github.io', true)).toBe(false);
    expect(shouldSendTelemetry('localhost', false)).toBe(false);
    expect(shouldSendTelemetry('claude.ai', false)).toBe(false);
  });
});

describe('접속 환경 분류', () => {
  const base = { search: '', width: 412, height: 731, standalone: false, lang: 'ko-KR', tzOffsetMin: 540 };
  it('인스타그램 앱 안 브라우저 → 유입 instagram, 화면은 20단위로 뭉갬', () => {
    const c = describeClient({ ...base, ua: 'Mozilla/5.0 (Linux; Android 14; SM-S921N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Mobile Safari/537.36 Instagram 330.0.0' });
    expect(c).toMatchObject({ source: 'instagram', inApp: 'instagram', os: 'android', browser: 'chrome', mobile: true, screenW: 420, screenH: 740 });
  });
  it('카카오톡 아이폰, 주소의 ?src=가 있으면 그것이 유입', () => {
    const c = describeClient({ ...base, search: '?src=Story_1', ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 10.4.0' });
    expect(c).toMatchObject({ source: 'story_1', inApp: 'kakao', os: 'ios' });
  });
  it('삼성 인터넷 직접 접속', () => {
    const c = describeClient({ ...base, ua: 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/27.0 Chrome/125.0.0.0 Mobile Safari/537.36' });
    expect(c).toMatchObject({ source: 'direct', inApp: 'none', browser: 'samsung' });
  });
});
