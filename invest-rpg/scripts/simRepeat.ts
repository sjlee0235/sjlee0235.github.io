// 반복 시뮬레이션: 서로 독립인 실험을 N번(기본 5번) 돌려 평균을 낸다.
// 실험마다 ① 가상 시대 데이터를 새로 만들고(데이터 생성 시드가 다름) ② 게임 시드도 겹치지 않게 바꾼다.
// → "우연히 이 데이터·이 시드에서만 좋게 나온 것"인지 가려낼 수 있다.
// 실행: npm run sim:repeat                 (5번 × 시드 200개)
//       npm run sim:repeat -- 5 100        (5번 × 시드 100개)
//       npm run sim:repeat -- 5 200 '{"feeRate":0.001}'   (설정을 바꿔서)
//       npm run sim:repeat -- 5 200 '{}' '{"sentimentBias":0.75}'   (가상 데이터 생성 옵션을 바꿔서)

import type { GameConfig } from '../src/engine/config.ts';
import { makeSpecEra, type SpecEraOptions } from '../tests/fixtures/makeEra.ts';
import { fmt, inTarget, REFERENCE_STRATEGIES, runMany, STRATEGIES, STRATEGY_LABEL, summarize, targetLabel, TARGET_RANGE } from './simLib.ts';

declare const process: { argv: string[] };

const RUNS = Number(process.argv[2] ?? 5);
const SEEDS = Number(process.argv[3] ?? 200);
const config: Partial<GameConfig> = JSON.parse(process.argv[4] ?? '{}');
const eraOptions: SpecEraOptions = JSON.parse(process.argv[5] ?? '{}');

console.log(`\n반복 시뮬레이션 — ${RUNS}번 × 시드 ${SEEDS}개 (실험마다 가상 시대 데이터와 게임 시드가 다름)`);
if (Object.keys(config).length > 0) console.log(`설정 변경: ${JSON.stringify(config)}`);
if (Object.keys(eraOptions).length > 0) console.log(`데이터 생성 옵션: ${JSON.stringify(eraOptions)}`);

const ALL = [...STRATEGIES, ...REFERENCE_STRATEGIES];
const medians = new Map(ALL.map((s) => [s, [] as number[]]));
const lossShare = new Map(ALL.map((s) => [s, [] as number[]]));
for (let run = 1; run <= RUNS; run++) {
  const era = makeSpecEra({ ...eraOptions, id: 'spec', seed: 1000 + run });
  for (const s of ALL) {
    const res = runMany(era, s, SEEDS, config, run * 100_000).map((x) => x.returnPct);
    medians.get(s)!.push(summarize(res).median);
    lossShare.get(s)!.push((res.filter((v) => v < 0).length / res.length) * 100);
  }
}

const head = Array.from({ length: RUNS }, (_, i) => `${i + 1}회`.padStart(9)).join('');
console.log(`\n전략(중앙값)　　　　　${head}     평균      목표          판정   손해 본 판(평균)`);
for (const s of ALL) {
  if (s === REFERENCE_STRATEGIES[0]) console.log('(참고: 사람형 몰빵)');
  const m = medians.get(s)!;
  const avg = m.reduce((a, b) => a + b, 0) / m.length;
  const loss = lossShare.get(s)!.reduce((a, b) => a + b, 0) / RUNS;
  console.log(
    `${STRATEGY_LABEL[s].padEnd(9, '　')} ${m.map(fmt).join('')} ${fmt(avg)}   ${targetLabel(TARGET_RANGE[s]).padEnd(13)} ${TARGET_RANGE[s] ? (inTarget(s, avg) ? '✓' : '✗') : ' '}      ${loss.toFixed(0)}%`,
  );
}
console.log('');
