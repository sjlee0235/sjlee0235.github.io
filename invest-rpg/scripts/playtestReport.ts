// 지인 테스트 플레이 기록 보고서 (18차)
// 사용: npm run playtest:report -- <구글 시트에서 내려받은 events.csv 또는 웹 앱 ?key= JSON 파일>
//   시트: [파일] → [다운로드] → [쉼표로 구분된 값(.csv)] (events 탭)
// 지표 뜻과 "이 숫자가 이러면 무엇을 바꾼다"는 docs/telemetry.md 10장.

import { classify, eraMetrics, groupByGame, type TelemetryRecord } from '../src/analytics/metrics.ts';

declare const process: {
  argv: string[];
  exit(code: number): never;
  getBuiltinModule(id: 'node:fs'): { readFileSync(path: string, encoding: 'utf8'): string };
};
const readFileSync = (path: string, enc: 'utf8') => process.getBuiltinModule('node:fs').readFileSync(path, enc);

interface Row {
  pid: string;
  sid: string;
  gid: string;
  build: string;
  seq: number;
  type: string;
  eraId: string;
  eraIndex: number;
  tick: number;
  clientMs: number;
  data: any;
}

/** 따옴표·줄바꿈이 든 칸까지 읽는 CSV 파서 */
function parseCsv(text: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (q) {
      if (c === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') {
      row.push(cell);
      cell = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      out.push(row);
      row = [];
      cell = '';
    } else cell += c;
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    out.push(row);
  }
  return out.filter((r) => r.some((c) => c.length > 0));
}

function load(path: string): Row[] {
  const text = readFileSync(path, 'utf8').replace(/^﻿/, '');
  const parseData = (s: unknown) => {
    if (typeof s !== 'string') return s ?? null;
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  };
  if (text.trimStart().startsWith('[')) {
    return (JSON.parse(text) as any[]).map((r) => ({ ...r, seq: +r.seq, eraIndex: +r.eraIndex, tick: +r.tick, clientMs: +r.clientMs, data: parseData(r.data) }));
  }
  const [head, ...rest] = parseCsv(text);
  const col = (name: string) => head!.indexOf(name);
  const idx = { pid: col('pid'), sid: col('sid'), gid: col('gid'), build: col('build'), seq: col('seq'), type: col('type'), eraId: col('eraId'), eraIndex: col('eraIndex'), tick: col('tick'), clientMs: col('clientMs'), data: col('data') };
  if (idx.type < 0) throw new Error('events 탭의 CSV가 아닌 것 같아요 (type 칸이 없음)');
  return rest.map((r) => ({
    pid: r[idx.pid] ?? '', sid: r[idx.sid] ?? '', gid: r[idx.gid] ?? '', build: r[idx.build] ?? '',
    seq: +(r[idx.seq] ?? 0), type: r[idx.type] ?? '', eraId: r[idx.eraId] ?? '', eraIndex: +(r[idx.eraIndex] ?? 0),
    tick: +(r[idx.tick] ?? 0), clientMs: +(r[idx.clientMs] ?? 0), data: parseData(r[idx.data]),
  }));
}

const median = (xs: number[]) => {
  if (xs.length === 0) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};
const pct = (a: number, b: number) => (b === 0 ? '-' : `${Math.round((a / b) * 100)}%`);
const fmt = (n: number, d = 1) => (Number.isFinite(n) ? n.toFixed(d) : '-');
const count = <T>(xs: T[], key: (x: T) => string) => {
  const m = new Map<string, number>();
  for (const x of xs) m.set(key(x), (m.get(key(x)) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', ');
};
const line = (t: string) => console.log(t);

const path = process.argv[2];
if (!path) {
  console.log('사용: npm run playtest:report -- <events.csv 또는 .json>');
  process.exit(1);
}
const rows = load(path).filter((r) => r.type);
const by = (t: string) => rows.filter((r) => r.type === t);
const players = new Set(rows.map((r) => r.pid));
const sessionsRows = by('session_begin');

line(`# 역전의 방 플레이 기록 보고서 (${rows.length}줄)`);
line('');
line('## 1. 누가, 어디서 왔나');
line(`- 플레이어(무작위 설치 id) ${players.size}명 · 접속 ${new Set(rows.map((r) => r.sid)).size}번 · 판 ${new Set(rows.map((r) => `${r.pid}:${r.gid}`)).size}개`);
line(`- 유입: ${count(sessionsRows, (r) => r.data?.source ?? '?')}`);
line(`- 기기: ${count(sessionsRows, (r) => `${r.data?.os}/${r.data?.browser}${r.data?.inApp && r.data.inApp !== 'none' ? `(${r.data.inApp} 앱 안)` : ''}`)}`);
line(`- 배포: ${count(rows.filter((r) => r.type === 'game_start'), (r) => r.build || '?')}`);

line('');
line('## 2. 다시 오나 (재방문)');
const firstByPid = new Map<string, number>();
const daysByPid = new Map<string, Set<number>>();
for (const r of sessionsRows) {
  firstByPid.set(r.pid, Math.max(firstByPid.get(r.pid) ?? 0, r.data?.sessionIndex ?? 1));
  const s = daysByPid.get(r.pid) ?? new Set<number>();
  s.add(r.data?.daysSinceFirst ?? 0);
  daysByPid.set(r.pid, s);
}
const returned = [...firstByPid.values()].filter((n) => n >= 2).length;
const nextDay = [...daysByPid.values()].filter((s) => [...s].some((d) => d >= 1)).length;
line(`- 2번 이상 접속 ${returned}/${firstByPid.size}명 (${pct(returned, firstByPid.size)}) · 다음 날 이후 다시 옴 ${nextDay}명 (${pct(nextDay, firstByPid.size)})`);
// 접속 길이: 같은 접속(sid) 안 기록 사이 간격 중 5분 넘는 빈틈(백그라운드)은 빼고 더한다
const sessLen: number[] = [];
for (const [, rs] of groupBy(rows, (r) => r.sid)) {
  const ts = rs.map((r) => r.clientMs).filter((t) => t > 0).sort((a, b) => a - b);
  let sum = 0;
  for (let i = 1; i < ts.length; i++) sum += Math.min(ts[i]! - ts[i - 1]!, 5 * 60_000);
  if (ts.length > 1) sessLen.push(sum / 60_000);
}
line(`- 접속 1번 길이(분) 중앙값 ${fmt(median(sessLen))} · 접속 수 ${sessLen.length}`);

line('');
line('## 3. 어디까지 가나 (진행 단계)');
const games = groupBy(rows, (r) => `${r.pid}:${r.gid}`);
const reached = (pred: (rs: Row[]) => boolean) => [...games.values()].filter(pred).length;
const g = games.size;
const endOf = (i: number) => (rs: Row[]) => rs.some((r) => r.type === 'era_end' && r.eraIndex === i);
line(`- 판 시작 ${g} → 첫 매매 ${reached((rs) => rs.some((r) => r.type === 'trade' && !r.data?.auto))} → 2000년대 끝 ${reached(endOf(0))} → 2010년대 끝 ${reached(endOf(1))} → 2020년대 끝 ${reached(endOf(2))} → 엔딩 화면 ${reached((rs) => rs.some((r) => r.type === 'ending_view'))}`);
line(`- 엔딩: ${count(by('ending_view'), (r) => String(r.data?.ending))}`);
// 그만둔 곳: 엔딩을 못 본 판의 마지막 기록 (시대, 10분 단위)
const quits = [...games.values()].filter((rs) => !rs.some((r) => r.type === 'ending_view')).map((rs) => {
  const last = rs.reduce((a, b) => (b.clientMs > a.clientMs ? b : a));
  return `${last.eraId} ${Math.floor((last.tick * 3) / 600) * 10}분대`;
});
line(`- 멈춘 곳(엔딩 전 마지막 기록): ${count(quits, (x) => x) || '-'}`);

line('');
line('## 4. 난이도 (시대별)');
const recs: TelemetryRecord[] = rows.map((r) => ({ v: 3, seq: r.seq, type: r.type, eraId: r.eraId, eraIndex: r.eraIndex, tick: r.tick, clientMs: r.clientMs, data: r.data, pid: r.pid, gid: `${r.pid}:${r.gid}` }) as unknown as TelemetryRecord);
const ends = by('era_end');
for (const era of [...new Set(ends.map((r) => r.eraId))].sort()) {
  const es = ends.filter((r) => r.eraId === era).map((r) => r.data);
  const ret = es.map((d) => d.returnPct as number);
  line(`- ${era} (${es.length}판): 수익률 중앙값 ${fmt(median(ret))}% · 플러스로 끝낸 비율 ${pct(ret.filter((x) => x > 0).length, ret.length)} · 최대 하락 중앙값 ${fmt(median(es.map((d) => d.maxDrawdownPct)))}% · 매매 수 중앙값 ${median(es.map((d) => d.trades))} · 돈이 묶여 못 산 시간 >0 비율 ${pct(es.filter((d) => d.brokeTimeSec > 0).length, es.length)}`);
}
const types: string[] = [];
for (const [, evs] of groupByGame(recs)) for (const m of eraMetrics(evs)) types.push(m.archetype ?? classify(m));
line(`- 플레이 유형: ${count(types, (x) => x) || '-'}`);

line('');
line('## 5. 돈 버는 방식 (사업 모델 단서)');
const work = ends.map((d) => d.data.workIncome as number);
const profit = ends.map((d) => d.data.profitAmount as number);
line(`- 시대당 작업 수입 중앙값 ${median(work)}코인 · 투자 순손익 중앙값 ${median(profit)}코인 → 작업 비중 ${pct(work.reduce((a, b) => a + b, 0), work.reduce((a, b) => a + b, 0) + Math.max(0, profit.reduce((a, b) => a + b, 0)))}`);
const ins = by('interior_insufficient');
line(`- 인생 업그레이드: 올린 횟수 ${by('interior_upgrade').length} · "코인 부족"으로 못 올린 시도 ${ins.length}번 (${new Set(ins.map((r) => r.pid)).size}명) ← 코인 보상 광고·구매 수요 신호`);
const sp = by('speed_changed').filter((r) => r.data?.speed === 2);
line(`- 2배속을 쓴 플레이어 ${new Set(sp.map((r) => r.pid)).size}/${players.size}명 ← "시간 건너뛰기" 보상 수요 신호`);
const settle = by('screen_view').filter((r) => r.data?.screen === 'settlement').map((r) => r.data.dwellMs / 1000);
line(`- 정산 화면 머문 시간(초) 중앙값 ${fmt(median(settle))} · 시대 끝 ${ends.length}번 ← 전면 광고 후보 지점(시대 사이)`);
line(`- 강아지 터치 ${by('dog_touch').length} · LP 터치 ${by('lp_touch').length} ← 꾸미기·애착 요소 관심도`);

line('');
line('## 6. 문제 신호');
line(`- 오류 ${by('client_error').length}건: ${count(by('client_error'), (r) => r.data?.code ?? '?') || '-'}`);
line(`- 거부된 주문 ${by('trade_rejected').length}건: ${count(by('trade_rejected'), (r) => r.data?.error ?? '?') || '-'}`);
line(`- 주문 창 열었다 그냥 닫음 ${by('order_abandoned').length}번`);

function groupBy<T>(xs: T[], key: (x: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const x of xs) {
    const k = key(x);
    const a = m.get(k) ?? [];
    a.push(x);
    m.set(k, a);
  }
  return m;
}
