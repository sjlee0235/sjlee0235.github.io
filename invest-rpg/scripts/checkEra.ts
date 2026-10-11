// 시대 데이터 파일 하나 점검: node scripts/checkEra.ts src/data/eras/2010s.json [시드 수]
// 등록(eras/index.ts) 전에도 쓸 수 있다. 구조 검사(validate) + 작성 가이드 점검(lint) + 전략별 밸런스(sim).

import { lintEra } from '../src/data/lint.ts';
import type { Era } from '../src/data/schema.ts';
import { validateEra } from '../src/data/validate.ts';
import { fmt, inTarget, labelOf, runMany, STRATEGIES, summarize, targetLabel, TARGET_RANGE } from './simLib.ts';

declare const process: {
  argv: string[];
  exitCode?: number;
  getBuiltinModule(id: 'node:fs'): { readFileSync(path: string, enc: 'utf8'): string };
};

const file = process.argv[2];
if (!file) throw new Error('사용법: node scripts/checkEra.ts <시대 JSON 경로> [시드 수]');
const seeds = Number(process.argv[3] ?? 100);
const era = JSON.parse(process.getBuiltinModule('node:fs').readFileSync(file, 'utf8')) as Era;

const v = validateEra(era);
console.log(`\n[${era.id}] 구조 오류 ${v.errors.length}개`);
for (const e of v.errors) console.log(`  ✗ ${e}`);
const issues = lintEra(era);
const errors = issues.filter((i) => i.severity !== 'warning');
console.log(`가이드 점검 ${issues.length}건 (오류 ${errors.length}, 경고 ${issues.length - errors.length})`);
for (const i of issues) console.log(`  ${i.severity === 'warning' ? '•' : '✗'} [${i.rule}] ${i.where}: ${i.message}`);
if (v.errors.length > 0) {
  process.exitCode = 1;
} else {
  console.log(`\n밸런스 (시드 ${seeds}개, 시대당 수익률 중앙값)`);
  for (const s of STRATEGIES) {
    const m = summarize(runMany(era, s, seeds).map((x) => x.returnPct)).median;
    console.log(`  ${inTarget(s, m) ? '✓' : '✗'} ${labelOf(s).padEnd(12, '　')} ${fmt(m)}   목표 ${targetLabel(TARGET_RANGE[s])}`);
  }
}
