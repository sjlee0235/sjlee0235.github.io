// 콘텐츠 점검: npm run lint:content
// 등록된 시대 데이터를 구조 검사(validate) + 작성 가이드 점검(lint)해서 목록으로 출력한다.
// 등록된 시대가 없으면(단계 B 전) 가상 시대로 점검 결과 예시를 보여준다.

import { ALL_ERAS } from '../src/data/eras/index.ts';
import { lintEra, lintWords, type LintIssue } from '../src/data/lint.ts';
import type { Era } from '../src/data/schema.ts';
import { validateEra } from '../src/data/validate.ts';
import { TUTORIAL_ERA } from '../src/engine/tutorial.ts';
import { makeSpecEra } from '../tests/fixtures/makeEra.ts';

declare const process: { exitCode?: number };

const RULE_LABEL: Record<string, string> = {
  pool: '풀 크기·구성 (core 24 : peripheral 12, 분위기 13/13/10)',
  existsEvidence: '시대 존재 근거 누락',
  keywords: '테마 키워드 개수(5~8) / 강도 3 키워드 누락',
  effectCount: '영향 테마 수 (6~9)',
  formula: '영향도 공식 위반 (±1 초과, 또는 ±1인데 adjustNote 없음)',
  newsTerm: '강도 3인데 newsTerm이 본문에 없음',
  themeTerm: '강도 3인데 themeTerm이 테마 키워드에 없음',
  chain: '강도 2·1인데 chain 없음',
  reasonKo: '상위 4개 reason 누락 (한국어)',
  reasonEn: '영어 reason 누락 (나중에 가능)',
  date: '본문 속 연도·월 표기',
  sentimentBias: '테마별 호재/악재 비율 (분위기 편향 75% ±10%p 밖)',
  peripheralHits: '비주류 테마 영향 횟수 2회 미만',
  stockName: '종목명 형식 ("2글자 중립 수식어 + 업종", 끝에 \'주\' 금지, 평가·전망 어감 단어 금지)',
  stockDescription: '종목 설명의 전망·평가 표현',
  newsDirection: '뉴스 제목·본문의 주가 방향 표현 (호재, 악재, 수혜, 수혜주, 타격주, 상승 예상, 하락 예상)',
};

function report(era: Era, label: string) {
  console.log(`\n=== ${label} ===`);
  const v = validateEra(era);
  console.log(`구조 오류: ${v.errors.length}개`);
  for (const e of v.errors) console.log(`  ✗ ${e}`);
  if (v.errors.length > 0) process.exitCode = 1;

  const issues = lintEra(era);
  const byRule = new Map<string, LintIssue[]>();
  for (const i of issues) byRule.set(i.rule, [...(byRule.get(i.rule) ?? []), i]);
  console.log(`가이드 점검: ${issues.length}건`);
  for (const rule of Object.keys(RULE_LABEL)) {
    const list = byRule.get(rule) ?? [];
    console.log(`  ${list.length === 0 ? '✓' : '•'} ${RULE_LABEL[rule]}: ${list.length}건`);
    for (const i of list.slice(0, 15)) console.log(`      - ${i.where}: ${i.message}`);
    if (list.length > 15) console.log(`      … 외 ${list.length - 15}건`);
  }
}

// 튜토리얼 데이터는 풀 크기 규칙과 무관하므로 금지어만 본다
const tutorialIssues = lintWords(TUTORIAL_ERA);
console.log(`\n=== 튜토리얼 금지어 점검: ${tutorialIssues.length}건 ===`);
for (const i of tutorialIssues) console.log(`  - ${i.where}: ${i.message}`);

if (ALL_ERAS.length === 0) {
  console.log('등록된 시대 데이터가 없습니다 (단계 B에서 2000년대 작성 예정). 점검 예시로 가상 시대를 검사합니다.');
  report(makeSpecEra({ id: 'spec' }), '가상 시대 (예시)');
} else {
  for (const era of ALL_ERAS) report(era, `${era.id} (${era.displayName.ko})`);
}
