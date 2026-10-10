// 플레이 기록 분석 리포트.
// 실행: npm run telemetry:report                 (봇 전략들로 기록을 만들어 분석 → 분석 도구 점검용)
//       npm run telemetry:report -- 기록.jsonl    (실제 기록 파일 분석. 한 줄에 이벤트 하나, gid 필드 필요)
//
// 봇 기록을 같은 분석 코드에 넣어 보는 이유:
//   나중에 실제 플레이어 기록이 오면 "이 사람들은 어느 봇과 비슷하게 노는가"를 같은 잣대로 비교하려고.

import { dropoutTicks, eraMetrics, groupByGame, newsMetrics, type PlayerEraMetrics, type TelemetryRecord } from '../src/analytics/metrics.ts';
import { TelemetryBuffer } from '../src/engine/telemetry.ts';
import { makeSpecEra } from '../src/dev/specEra.ts';
import { play, REFERENCE_STRATEGIES, STRATEGIES, STRATEGY_LABEL } from './simLib.ts';

declare const process: {
  argv: string[];
  getBuiltinModule(id: 'node:fs'): { readFileSync(path: string, encoding: 'utf8'): string };
};

const pct = (v: number | null) => (v === null ? '   -  ' : `${(v * 100).toFixed(0)}%`.padStart(6));
const num = (v: number | null, d = 1) => (v === null ? '   -  ' : v.toFixed(d).padStart(6));
const avg = (xs: number[]) => (xs.length === 0 ? null : xs.reduce((a, b) => a + b, 0) / xs.length);
const avgOf = (ms: PlayerEraMetrics[], f: (m: PlayerEraMetrics) => number | null) =>
  avg(ms.map(f).filter((v): v is number => v !== null));

function printGroup(label: string, ms: PlayerEraMetrics[]) {
  const types = new Map<string, number>();
  for (const m of ms) types.set(m.archetype, (types.get(m.archetype) ?? 0) + 1);
  const top = [...types.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${Math.round((v / ms.length) * 100)}%`).join(', ');
  console.log(
    `${label.padEnd(9, '　')} ${num(avgOf(ms, (m) => m.returnPct))}% ${num(avgOf(ms, (m) => m.trades), 0)} ${pct(avgOf(ms, (m) => m.followRate))} ${num(avgOf(ms, (m) => m.medianReactionTicks))} ${pct(avgOf(ms, (m) => m.agreeRate))} ${pct(avgOf(ms, (m) => m.instantBuyShare))} ${pct(avgOf(ms, (m) => m.leanBuyShare))} ${pct(avgOf(ms, (m) => m.investedShare))}  ${top}`,
  );
}

const header = `${'묶음'.padEnd(9, '　')}  수익률  매매  반응률 반응틱  방향일치 즉시매수 단서매수 보유시간  유형 분류`;
const file = process.argv[2];

if (file) {
  const text = process.getBuiltinModule('node:fs').readFileSync(file, 'utf8');
  const records = text.split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l) as TelemetryRecord);
  const games = groupByGame(records);
  const metrics = [...games.values()].flatMap((g) => eraMetrics(g));
  console.log(`\n기록 ${records.length}줄, 게임 ${games.size}판, 시대 기록 ${metrics.length}개\n`);
  console.log(header);
  printGroup('전체', metrics);
  const drop = dropoutTicks(metrics);
  console.log(`\n중간 이탈: ${drop.length}판 (이탈 시점 중앙값 ${drop.length ? drop.sort((a, b) => a - b)[Math.floor(drop.length / 2)]! * 5 : '-'}초)`);
  const nm = newsMetrics(games.values()).sort((a, b) => (a.agreeRate ?? 1) - (b.agreeRate ?? 1));
  console.log('\n방향 일치율이 낮은 뉴스 (헷갈리는 뉴스 후보) 상위 5개');
  for (const n of nm.slice(0, 5)) console.log(`  ${n.newsId.padEnd(24)} ${n.kind.padEnd(9)} 본 판 ${n.shown}  반응 ${pct(n.reactRate)}  일치 ${pct(n.agreeRate)}`);
} else {
  const SEEDS = 30;
  const era = makeSpecEra({ id: 'spec', seed: 1001 });
  console.log(`\n봇 전략 ${STRATEGIES.length + REFERENCE_STRATEGIES.length}개 × 시드 ${SEEDS}개로 기록을 만들어 분석합니다 (분석 도구 점검용).\n`);
  console.log(header);
  const all: TelemetryRecord[][] = [];
  for (const s of [...STRATEGIES, ...REFERENCE_STRATEGIES]) {
    const ms: PlayerEraMetrics[] = [];
    for (let seed = 1; seed <= SEEDS; seed++) {
      const buf = new TelemetryBuffer(100_000);
      play(era, s, seed, {}, buf);
      const events = buf.drain().map((e) => ({ ...e, gid: `${s}-${seed}` }));
      all.push(events);
      ms.push(...eraMetrics(events));
    }
    printGroup(STRATEGY_LABEL[s], ms);
  }
  const nm = newsMetrics(all);
  const outcomes = nm.filter((n) => n.followedLeanRate !== null);
  const lean = outcomes.reduce((a, n) => a + n.followedLeanRate! * n.shown, 0) / outcomes.reduce((a, n) => a + n.shown, 0);
  console.log(`\n뉴스별 지표 ${nm.length}개 계산됨. 결과 뉴스가 단서대로 나온 비율 ${pct(lean)} (설정 70%)`);
  console.log('반응률 = 뉴스 뒤 1분 안에 엮인 종목 매매 / 반응틱 = 발표 뒤 첫 매매까지 틱(0 = 발표 즉시) / 단서매수 = 스토리 중 매수가 잠정 뉴스 호재 쪽인 비율\n');
}
