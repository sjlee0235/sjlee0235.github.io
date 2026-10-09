// 밸런스 시뮬레이터: 전략별로 시드 200개를 돌려 시대당 수익률 분포를 본다. 매 판 테마 추첨이 다르다.
// 실행: npm run sim          (시드 200개)
//       npm run sim -- 50    (시드 50개로 빠르게)
// 등록된 시대 데이터가 없으면(단계 B 전) 기획 조건을 흉내 낸 가상 시대로 돌린다.

import { ALL_ERAS } from '../src/data/eras/index.ts';
import type { Era } from '../src/data/schema.ts';
import { makeSpecEra } from '../tests/fixtures/makeEra.ts';
import { fmt, labelOf, REFERENCE_STRATEGIES, runMany, STRATEGIES, STRATEGY_LABEL, summarize, targetLabel, TARGET_RANGE } from './simLib.ts';

declare const process: { argv: string[] };

const SEEDS = Number(process.argv[2] ?? 200);
const eras: Era[] = ALL_ERAS.length > 0 ? [...ALL_ERAS] : [makeSpecEra({ id: 'spec' })];


if (ALL_ERAS.length === 0) console.log('\n※ 등록된 시대 데이터가 없어 가상 시대(기획 조건 흉내)로 시뮬레이션합니다. 실제 수치는 단계 B 이후.');
console.log(`\n밸런스 시뮬레이션 — 시드 ${SEEDS}개, 시대당(2시간) 수익률, 수수료 0.2% 포함\n`);

for (const era of eras) {
  console.log(`[${era.id}] 전략           중앙값    하위10%   상위10%   목표 중앙값`);
  for (const s of [...STRATEGIES, ...REFERENCE_STRATEGIES]) {
    const r = summarize(runMany(era, s, SEEDS).map((x) => x.returnPct));
    console.log(`  ${labelOf(s).padEnd(12, '　')} ${fmt(r.median)} ${fmt(r.p10)} ${fmt(r.p90)}   ${targetLabel(TARGET_RANGE[s])}`);
  }

  console.log('\n(참고) 기본 OFF 옵션을 켰을 때 — 추종 전략 중앙값');
  console.log('  옵션                              지연 추종   초고속 추종');
  for (const [label, cfg] of [
    ['기본 (모두 OFF)', {}],
    ['ORDER_DELAY_TICKS=1', { orderDelayTicks: 1 }],
    ['INDIRECT_EXTRA_DELAY_TICKS=2', { indirectExtraDelayTicks: 2 }],
  ] as const) {
    const d = summarize(runMany(era, 'delayedFollow', SEEDS, cfg).map((x) => x.returnPct)).median;
    const f = summarize(runMany(era, 'fastFollow', SEEDS, cfg).map((x) => x.returnPct)).median;
    console.log(`  ${label.padEnd(32)} ${fmt(d)}   ${fmt(f)}`);
  }

  console.log('\n잠정 뉴스 단서 확률(leansTo)별 — 잠정 전략 중앙값');
  console.log('  단서대로 나올 확률     정방향     역방향     차이');
  for (const chance of [0.6, 0.65, 0.7, 0.75]) {
    const f = summarize(runMany(era, 'leanForward', SEEDS, { leansToChance: chance }).map((x) => x.returnPct)).median;
    const r = summarize(runMany(era, 'leanReverse', SEEDS, { leansToChance: chance }).map((x) => x.returnPct)).median;
    console.log(`  ${`${chance * 100}%`.padEnd(20)} ${fmt(f)} ${fmt(r)} ${fmt(f - r)}`);
  }

  console.log('\n추첨 조합별 차이 — 활성 core 테마 수에 따른 중앙값');
  for (const s of ['hold', 'sentiment', 'leanForward'] as const) {
    const res = runMany(era, s, SEEDS);
    const groups = new Map<string, number[]>();
    for (const x of res) {
      const key = x.coreCount <= 12 ? 'core 11~12' : x.coreCount <= 14 ? 'core 13~14' : 'core 15+';
      groups.set(key, [...(groups.get(key) ?? []), x.returnPct]);
    }
    const parts = [...groups.entries()].sort().map(([k, v]) => `${k}: ${fmt(summarize(v).median).trim()} (${v.length}판)`);
    console.log(`  ${labelOf(s).padEnd(12, '　')} ${parts.join(' | ')}`);
  }
  console.log('');
}
