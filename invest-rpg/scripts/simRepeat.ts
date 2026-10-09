// 반복 시뮬레이션: 서로 독립인 실험을 N번(기본 5번) 돌려 평균을 낸다.
// 실험마다 ① 가상 시대 데이터를 새로 만들고(데이터 생성 시드가 다름) ② 게임 시드도 겹치지 않게 바꾼다.
// → "우연히 이 데이터·이 시드에서만 좋게 나온 것"인지 가려낼 수 있다.
// 실행: npm run sim:repeat                 (5번 × 시드 200개)
//       npm run sim:repeat -- 5 100        (5번 × 시드 100개)
//       npm run sim:repeat -- 5 200 '{"feeRate":0.001}'   (설정을 바꿔서)
//       npm run sim:repeat -- 5 200 '{}' '{"sentimentBias":0.75}'   (가상 데이터 생성 옵션을 바꿔서)

import type { GameConfig } from '../src/engine/config.ts';
import { makeSpecEra, type SpecEraOptions } from '../tests/fixtures/makeEra.ts';
import {
  fmt, inTarget, labelOf, REFERENCE_STRATEGIES, runMany, STRATEGIES, summarize, targetLabel, TARGET_RANGE, type Strategy,
} from './simLib.ts';

declare const process: { argv: string[] };

const RUNS = Number(process.argv[2] ?? 5);
const SEEDS = Number(process.argv[3] ?? 200);
const config: Partial<GameConfig> = JSON.parse(process.argv[4] ?? '{}');
const eraOptions: SpecEraOptions = JSON.parse(process.argv[5] ?? '{}');

console.log(`\n반복 시뮬레이션 — ${RUNS}번 × 시드 ${SEEDS}개 (실험마다 가상 시대 데이터와 게임 시드가 다름), 수수료 0.2% 포함`);
if (Object.keys(config).length > 0) console.log(`설정 변경: ${JSON.stringify(config)}`);
if (Object.keys(eraOptions).length > 0) console.log(`데이터 생성 옵션: ${JSON.stringify(eraOptions)}`);

const ALL = [...STRATEGIES, ...REFERENCE_STRATEGIES];
type Row = ReturnType<typeof summarize>;
const rows = new Map<Strategy, Row[]>(ALL.map((s) => [s, []]));
for (let run = 1; run <= RUNS; run++) {
  const era = makeSpecEra({ ...eraOptions, id: 'spec', seed: 1000 + run });
  for (const s of ALL) rows.get(s)!.push(summarize(runMany(era, s, SEEDS, config, run * 100_000).map((x) => x.returnPct)));
}

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const pct = (v: number) => `${v.toFixed(0)}%`.padStart(6);
const head = Array.from({ length: RUNS }, (_, i) => `${i + 1}회`.padStart(9)).join('');
console.log(`\n전략(중앙값)　　　　　 ${head}   평균중앙  평균하위10 평균상위10  손실확률 큰손실(<-50%)  목표          판정`);
const avgOf = new Map<Strategy, { median: number; bigLoss: number }>();
for (const s of ALL) {
  if (s === REFERENCE_STRATEGIES[0]) console.log('(참고: 사람형 몰빵)');
  const r = rows.get(s)!;
  const median = avg(r.map((x) => x.median));
  const bigLoss = avg(r.map((x) => x.bigLossPct));
  avgOf.set(s, { median, bigLoss });
  const judge = TARGET_RANGE[s] ? (inTarget(s, median) ? '✓' : '✗') : ' ';
  console.log(
    `${labelOf(s).padEnd(10, '　')} ${r.map((x) => fmt(x.median)).join('')} ${fmt(median)} ${fmt(avg(r.map((x) => x.p10)))} ${fmt(avg(r.map((x) => x.p90)))}   ${pct(avg(r.map((x) => x.lossPct)))}   ${pct(bigLoss)}        ${targetLabel(TARGET_RANGE[s]).padEnd(13)} ${judge}`,
  );
}
console.log('\n† 방향(호재/악재·분위기·단서)을 정확히 아는 전략 = 사람이 본문을 읽고 해석해서 얻을 수 있는 이득의 이론상 상한.');

const all = avgOf.get('leanAllIn')!;
const spread = avgOf.get('leanSpread')!;
const ok = spread.median > 0 && spread.bigLoss <= all.bigLoss / 2;
console.log(`\n분산 투자 점검: 잠정 분산 중앙값 ${fmt(spread.median).trim()} (양수여야 함), 큰 손실 확률 ${spread.bigLoss.toFixed(1)}% vs 잠정 몰빵 ${all.bigLoss.toFixed(1)}% (절반 이하여야 함) → ${ok ? '✓ 기대대로' : '✗ 기대와 다름'}\n`);
