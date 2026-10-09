// 밸런스 시뮬레이터: 여러 전략을 시드 200개로 돌려 시대당 수익률 분포를 본다.
// 실행: npm run sim              (기본: 시드 200개, 결과표 + 조정 수단별 효과표)
//       npm run sim -- 50        (시드 50개로 빠르게)
// 전략 설명은 scripts/simLib.ts 맨 위 참고.

import { ALL_ERAS } from '../src/data/eras/index.ts';
import { makeConfig, type GameConfig } from '../src/engine/config.ts';
import { fmt, run, stallShare } from './simLib.ts';

declare const process: { argv: string[] };

const SEEDS = Number(process.argv[2] ?? 200);

const TARGETS: Record<string, string> = {
  'random/real': '-10% ~ +5%',
  'random/practice': '-10% ~ +5%',
  'hold/real': '-10% ~ +20%',
  'hold/practice': '-10% ~ +20%',
  'follow/real': '+30% ~ +60%',
  'follow/practice': '+60% ~ +100%',
  'learned/real': 'follow보다 높게, +150% 미만',
};

console.log(`\n밸런스 시뮬레이션 — 시드 ${SEEDS}개, 시대당 수익률 (수수료 ${makeConfig().feeRate * 100}% 포함)\n`);
console.log('시대    모드      전략       중앙값    하위10%   상위10%   목표 중앙값');
for (const era of ALL_ERAS) {
  for (const mode of ['real', 'practice'] as const) {
    for (const strategy of ['random', 'hold', 'follow', 'learned'] as const) {
      if (strategy === 'learned' && mode === 'practice') continue;
      const r = run(era, mode, strategy, SEEDS);
      const target = TARGETS[`${strategy}/${mode}`] ?? '';
      console.log(
        `${era.id.padEnd(7)} ${mode.padEnd(9)} ${strategy.padEnd(8)} ${fmt(r.median)} ${fmt(r.p10)} ${fmt(r.p90)}   ${target}`,
      );
    }
  }
  console.log(`${era.id} 평소 틱 중 0.0% 비율: ${(stallShare(era, Math.min(SEEDS, 50)) * 100).toFixed(1)}% (목표 5% 이하)\n`);
}

// 조정 수단별 효과: 즉시 추종 전략의 중앙값이 단계마다 어떻게 변하는지
console.log('조정 수단별 효과 (즉시 추종 중앙값, 2000년대)');
const era = ALL_ERAS[0]!;
const noMult = { realDirect: [1, 1], realIndirect: [1, 1], practice: [1, 1] } as const;
const steps: Array<[string, Partial<GameConfig>]> = [
  ['0) 배율 없음·수수료 0·관성 0.1~1.5%', { impactMultiplier: noMult, feeRate: 0, momentumRate: [1, 15] }],
  ['1) + 반영 배율 무작위', { feeRate: 0, momentumRate: [1, 15] }],
  ['3) + 수수료 0.2%', { momentumRate: [1, 15] }],
  ['4) + 관성 크기 0.1~0.5% (현재 기본값)', {}],
];
console.log('단계                              실전 2시간   연습 30분');
for (const [label, cfg] of steps) {
  const real = run(era, 'real', 'follow', SEEDS, cfg).median;
  const practice = run(era, 'practice', 'follow', SEEDS, cfg).median;
  console.log(`${label.padEnd(32)} ${fmt(real)}   ${fmt(practice)}`);
}
console.log('(2단계 영향도 분포 40/40/20은 데이터에 이미 적용됨 — 적용 전후 비교는 README 6장 참고)\n');
