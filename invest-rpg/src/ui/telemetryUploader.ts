// 플레이 기록 전송 (18차): 엔진이 내보내는 이벤트(TelemetryEvent)에 구분자를 붙여 모았다가 묶어서 보낸다.
//
// - 엔진은 동의(setConsent(true)) 뒤에만 record()를 부른다. 이 통은 받은 것만 다룬다 (동의 판단은 엔진·앱 몫).
// - 붙이는 것: pid(무작위 설치 id), sid(이번 접속 id), gid(판 id = 시드), clientMs(실제 시각), build(배포 버전).
//   이름·연락처·기기 고유 번호·IP는 담지 않는다. pid는 이 브라우저에서 처음 열 때 만든 무작위 문자열일 뿐이다.
// - 보낼 곳(endpoint)이 비어 있거나 보내기가 꺼져 있으면(개발·디버그) 기기에만 쌓아 둔다.
//   기기 큐는 localStorage에 남아서, 주소가 나중에 정해져도 다음 접속 때 보낸다 (최대 MAX_QUEUE개, 넘치면 오래된 것부터).
// - 묶음 하나는 MAX_BATCH_BYTES 아래로 (브라우저의 keepalive·sendBeacon 한도 64KB).
// - 받는 쪽은 구글 Apps Script 웹 앱 (tools/telemetry_apps_script.gs). CORS 사전 요청을 피하려고 text/plain으로 보낸다.

import type { TelemetryEvent, TelemetrySink } from '../engine/telemetry.ts';

/** 보내는 한 줄 = 엔진 이벤트 + 구분자 */
export type UploadRow = TelemetryEvent & { pid: string; sid: string; gid: string; build: string };

export interface UploaderStorage {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

/** 실제 전송. beacon = 페이지를 떠나는 중 (응답을 기다릴 수 없음). 성공하면 true */
export type SendFn = (endpoint: string, body: string, beacon: boolean) => Promise<boolean>;

export interface UploaderOptions {
  endpoint: string;
  /** false면 큐에만 쌓고 보내지 않는다 (개발 서버·디버그) */
  sendEnabled: boolean;
  storage: UploaderStorage;
  now: () => number;
  send: SendFn;
  build: string;
  /** 무작위 id 만들기 (테스트에서 고정) */
  randomId?: () => string;
}

export const PID_KEY = 'invest-rpg.pid';
export const FIRST_SEEN_KEY = 'invest-rpg.firstSeen';
export const SESSION_COUNT_KEY = 'invest-rpg.sessions';
export const QUEUE_KEY = 'invest-rpg.telemetryQueue';
export const MAX_QUEUE = 3000;
export const MAX_BATCH_BYTES = 48_000;
/** 이 개수가 모이면 바로 보낸다 (그 전에는 주기적으로) */
export const FLUSH_AT = 40;

export function randomId(): string {
  const a = new Uint8Array(12);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('');
}

export class TelemetryUploader implements TelemetrySink {
  readonly pid: string;
  readonly sid: string;
  /** 이 브라우저에서 몇 번째 접속인가 (1부터) */
  readonly sessionIndex: number;
  /** 처음 연 날로부터 지난 날 수 (재방문 분석용) */
  readonly daysSinceFirst: number;
  private gid = 'none';
  private queue: UploadRow[] = [];
  /** 지금 보내는 중인 줄 (두 전송이 같은 줄을 맡지 않게) */
  private readonly claimed = new Set<UploadRow>();
  /** 평소 전송이 돌고 있나 */
  private looping = false;
  private readonly o: UploaderOptions;

  constructor(o: UploaderOptions) {
    this.o = o;
    const rid = o.randomId ?? randomId;
    const s = o.storage;
    let pid = s.get(PID_KEY);
    if (!pid) {
      pid = rid();
      s.set(PID_KEY, pid);
    }
    this.pid = pid;
    this.sid = rid();
    const now = o.now();
    const first = Number(s.get(FIRST_SEEN_KEY));
    const firstSeen = Number.isFinite(first) && first > 0 ? first : now;
    if (firstSeen === now) s.set(FIRST_SEEN_KEY, String(now));
    this.daysSinceFirst = Math.max(0, Math.floor((now - firstSeen) / 86_400_000));
    this.sessionIndex = (Number(s.get(SESSION_COUNT_KEY)) || 0) + 1;
    s.set(SESSION_COUNT_KEY, String(this.sessionIndex));
    try {
      const saved = JSON.parse(s.get(QUEUE_KEY) ?? '[]') as UploadRow[];
      if (Array.isArray(saved)) this.queue = saved.slice(-MAX_QUEUE);
    } catch {
      this.queue = [];
    }
  }

  /** 판이 바뀔 때 (새 게임·이어 하기) 판 id를 정한다 */
  setGame(gid: string): void {
    this.gid = gid;
  }

  get size(): number {
    return this.queue.length;
  }

  /** (점검용) 쌓인 줄 복사본 */
  peek(): UploadRow[] {
    return this.queue.map((r) => ({ ...r }));
  }

  record(event: TelemetryEvent): void {
    const row = { ...event, clientMs: event.clientMs ?? this.o.now(), pid: this.pid, sid: this.sid, gid: this.gid, build: this.o.build } as UploadRow;
    this.queue.push(row);
    if (this.queue.length > MAX_QUEUE) this.queue.splice(0, this.queue.length - MAX_QUEUE);
    if (this.queue.length >= FLUSH_AT) void this.flush(false);
  }

  /** 기기 큐 저장 (페이지를 떠날 때도 부른다) */
  persist(): void {
    try {
      this.o.storage.set(QUEUE_KEY, JSON.stringify(this.queue));
    } catch {
      // 저장 공간이 꽉 차면 절반을 버리고 한 번 더
      this.queue = this.queue.slice(Math.floor(this.queue.length / 2));
      try {
        this.o.storage.set(QUEUE_KEY, JSON.stringify(this.queue));
      } catch {
        /* 포기: 메모리에만 */
      }
    }
  }

  /** 보낼 수 있는 상태인가 */
  get canSend(): boolean {
    return this.o.sendEnabled && this.o.endpoint.length > 0;
  }

  /**
   * 쌓인 것을 묶음으로 보낸다. beacon = 페이지를 떠나는 중 (한 번에 다 던지고 성공으로 친다).
   * 실패하면 큐에 그대로 두고 다음에 다시 보낸다.
   */
  async flush(beacon: boolean): Promise<void> {
    if (!this.canSend || this.queue.length === 0) {
      this.persist();
      return;
    }
    // 평소 전송은 한 줄기만. 떠날 때(beacon)는 평소 전송이 돌고 있어도 남은 것을 바로 던진다
    if (!beacon && this.looping) return;
    if (!beacon) this.looping = true;
    try {
      for (;;) {
        // 다른 전송이 맡은 줄은 빼고 묶는다 (같은 줄을 두 번 보내지 않게)
        const batch = takeBatch(this.queue.filter((r) => !this.claimed.has(r)), MAX_BATCH_BYTES);
        if (batch.length === 0) break;
        for (const r of batch) this.claimed.add(r);
        const ok = await this.trySend(batch, beacon);
        for (const r of batch) this.claimed.delete(r);
        if (!ok) break;
        const sent = new Set(batch);
        this.queue = this.queue.filter((r) => !sent.has(r));
      }
    } finally {
      if (!beacon) this.looping = false;
      this.persist();
    }
  }

  private async trySend(batch: UploadRow[], beacon: boolean): Promise<boolean> {
    try {
      return await this.o.send(this.o.endpoint, JSON.stringify({ v: 1, rows: batch }), beacon);
    } catch {
      return false;
    }
  }
}

/** 앞에서부터 maxBytes 아래로 묶음 하나 (한 줄이 너무 크면 그 줄만 단독으로) */
export function takeBatch(queue: readonly UploadRow[], maxBytes: number): UploadRow[] {
  const out: UploadRow[] = [];
  let bytes = 20;
  for (const row of queue) {
    const n = JSON.stringify(row).length + 1;
    if (out.length > 0 && bytes + n > maxBytes) break;
    out.push(row);
    bytes += n;
  }
  return out;
}

/** 브라우저 전송: 평소엔 fetch(keepalive), 떠날 때는 sendBeacon */
export const browserSend: SendFn = async (endpoint, body, beacon) => {
  if (beacon && typeof navigator.sendBeacon === 'function') {
    return navigator.sendBeacon(endpoint, new Blob([body], { type: 'text/plain;charset=utf-8' }));
  }
  // no-cors: 응답 내용은 못 읽지만 Apps Script로 보내기에는 충분하다 (네트워크 오류면 예외 → 실패로 처리)
  await fetch(endpoint, { method: 'POST', mode: 'no-cors', keepalive: true, headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body });
  return true;
};

// ───────── 접속 환경 (기기 고유 정보 없이 큰 분류만) ─────────

export interface ClientInfo {
  /** 어디서 들어왔나: 주소의 ?src= / utm_source, 없으면 앱 안 브라우저로 추정 (instagram, kakao …), 그래도 없으면 direct */
  source: string;
  /** 앱 안 브라우저 (instagram / kakao / facebook / naver / line / none) */
  inApp: string;
  os: 'android' | 'ios' | 'windows' | 'mac' | 'linux' | 'other';
  browser: 'samsung' | 'chrome' | 'safari' | 'firefox' | 'edge' | 'whale' | 'other';
  mobile: boolean;
  /** 화면(CSS px)을 20px 단위로 뭉갠 크기 (기기 특정 방지) */
  screenW: number;
  screenH: number;
  /** 홈 화면에 추가해서 열었나 */
  standalone: boolean;
  lang: string;
  /** UTC와의 시차(분). 한국 = 540 */
  tzOffsetMin: number;
}

export function describeClient(env: {
  ua: string;
  search: string;
  width: number;
  height: number;
  standalone: boolean;
  lang: string;
  tzOffsetMin: number;
}): ClientInfo {
  const ua = env.ua;
  const inApp = /Instagram/i.test(ua) ? 'instagram'
    : /KAKAOTALK/i.test(ua) ? 'kakao'
    : /FBAN|FBAV/i.test(ua) ? 'facebook'
    : /NAVER\(inapp/i.test(ua) ? 'naver'
    : /\bLine\//i.test(ua) ? 'line'
    : 'none';
  const p = new URLSearchParams(env.search);
  const tagged = (p.get('src') ?? p.get('utm_source') ?? '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 24);
  const os = /Android/i.test(ua) ? 'android'
    : /iPhone|iPad|iPod/i.test(ua) ? 'ios'
    : /Windows/i.test(ua) ? 'windows'
    : /Macintosh|Mac OS X/i.test(ua) ? 'mac'
    : /Linux/i.test(ua) ? 'linux'
    : 'other';
  const browser = /SamsungBrowser/i.test(ua) ? 'samsung'
    : /Whale/i.test(ua) ? 'whale'
    : /Edg\//i.test(ua) ? 'edge'
    : /Firefox|FxiOS/i.test(ua) ? 'firefox'
    : /Chrome|CriOS/i.test(ua) ? 'chrome'
    : /Safari/i.test(ua) ? 'safari'
    : 'other';
  const round = (n: number) => Math.round(n / 20) * 20;
  return {
    source: tagged || (inApp !== 'none' ? inApp : 'direct'),
    inApp,
    os,
    browser,
    mobile: /Mobi|Android|iPhone|iPad/i.test(ua),
    screenW: round(env.width),
    screenH: round(env.height),
    standalone: env.standalone,
    lang: env.lang.slice(0, 8),
    tzOffsetMin: env.tzOffsetMin,
  };
}
