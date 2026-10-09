// 3시대 연속 이월 시뮬레이션: 가상 시대 3개를 이어서(자금 이월) 전략별 누적 결과를 본다.
// 실행: npm run sim:carry            (시드 200개)
//       npm run sim:carry -- 50      (빠르게)

import { cumulativeReturnPct } from '../src/engine/returns.ts';
import { makeSpecEra } from '../tests/fixtures/makeEra.ts';
import { labelOf, playCarry, quantile, REFERENCE_STRATEGIES, STRATEGIES } from './simLib.ts';

declare const process: { argv: string[] };

const SEEDS = Number(process.argv[2] ?? 200);
const eras = [
  makeSpecEra({ id: 'era1', order: 1, seed: 2001 }),
  makeSpecEra({ id: 'era2', order: 2, seed: 2002 }),
  makeSpecEra({ id: 'era3', order: 3, seed: 2003 }),
];
const n = (v: number) => Math.round(v).toLocaleString('ko-KR').padStart(10);
const signed = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(0)}%`.padStart(8);

console.log(`\n3시대 연속 이월 — 가상 시대 3개 × 시드 ${SEEDS}개, 시작 10,000비트, 입금 없음, 수수료 0.2%`);
console.log(`\n전략　　　　　　　   최종자산 중앙   하위10%    상위10%   누적수익률 중앙  자산<1,000 경험   최종<1,000`);
for (const s of [...STRATEGIES, ...REFERENCE_STRATEGIES]) {
  const res = Array.from({ length: SEEDS }, (_, i) => playCarry(eras, s, 900_000 + i + 1));
  const finals = res.map((r) => r.finalAssets).sort((a, b) => a - b);
  const cums = res.map((r) => cumulativeReturnPct(r.returns)).sort((a, b) => a - b);
  const fell = (res.filter((r) => r.fellBelow10Pct).length / SEEDS) * 100;
  const endLow = (res.filter((r) => r.finalAssets < 1_000).length / SEEDS) * 100;
  console.log(
    `${labelOf(s).padEnd(10, '　')} ${n(quantile(finals, 0.5))} ${n(quantile(finals, 0.1))} ${n(quantile(finals, 0.9))}   ${signed(quantile(cums, 0.5))}        ${`${fell.toFixed(1)}%`.padStart(6)}        ${`${endLow.toFixed(1)}%`.padStart(6)}`,
  );
}
console.log('\n자산<1,000 경험 = 3시대 중 한 번이라도 총자산이 시작 자금의 10%(1,000비트) 아래로 내려간 판의 비율 (틱 단위 최저 자산 기준)');
console.log('† 방향(호재/악재·분위기·단서)을 정확히 아는 전략 = 사람이 본문을 읽고 해석해서 얻을 수 있는 이득의 이론상 상한.\n');
