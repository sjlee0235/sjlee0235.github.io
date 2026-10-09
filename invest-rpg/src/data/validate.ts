// JSON 데이터가 규칙에 맞는지 검사한다.
// errors = 반드시 고쳐야 하는 문제, warnings = 게임은 돌아가지만 확인이 필요한 문제.

import type { Era, LocalizedText } from './schema.ts';

export interface EraRules {
  themeCount: number;
  sentimentCounts: { positive: number; negative: number; neutral: number };
  /** 시대당 실제로 뜨는 뉴스 수. 풀이 이보다 작으면 경고 */
  newsPerEra: number;
  impactMin: number;
  impactMax: number;
}

export const DEFAULT_ERA_RULES: EraRules = {
  themeCount: 20,
  sentimentCounts: { positive: 7, negative: 7, neutral: 6 },
  newsPerEra: 24,
  impactMin: -10,
  impactMax: 10,
};

export interface ValidationResult {
  errors: string[];
  warnings: string[];
}

const REQUIRED_LOCALES = ['ko', 'en'] as const;

function checkText(text: LocalizedText | undefined, where: string, errors: string[]): void {
  for (const locale of REQUIRED_LOCALES) {
    const value = text?.[locale];
    if (typeof value !== 'string' || value.trim() === '') {
      errors.push(`${where}: ${locale} 텍스트가 비어 있음`);
    }
  }
}

function findDuplicates(ids: string[]): string[] {
  const seen = new Set<string>();
  const dup = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) dup.add(id);
    seen.add(id);
  }
  return [...dup];
}

export function validateEra(era: Era, rules: EraRules = DEFAULT_ERA_RULES): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const at = `[${era.id}]`;

  checkText(era.displayName, `${at} displayName`, errors);

  // 테마
  if (era.themes.length !== rules.themeCount) {
    errors.push(`${at} 테마 수 ${era.themes.length}개 (규칙: ${rules.themeCount}개)`);
  }
  for (const dup of findDuplicates(era.themes.map((t) => t.id))) {
    errors.push(`${at} 테마 id 중복: ${dup}`);
  }
  const counts = { positive: 0, negative: 0, neutral: 0 };
  for (const theme of era.themes) {
    if (!(theme.sentiment in counts)) {
      errors.push(`${at} 테마 ${theme.id}: sentiment 값이 이상함 (${String(theme.sentiment)})`);
      continue;
    }
    counts[theme.sentiment]++;
    checkText(theme.name, `${at} 테마 ${theme.id} name`, errors);
  }
  for (const key of ['positive', 'negative', 'neutral'] as const) {
    if (counts[key] !== rules.sentimentCounts[key]) {
      errors.push(`${at} ${key} 테마 ${counts[key]}개 (규칙: ${rules.sentimentCounts[key]}개)`);
    }
  }

  // 종목: 테마당 정확히 1개
  const themeIds = new Set(era.themes.map((t) => t.id));
  for (const dup of findDuplicates(era.stocks.map((s) => s.id))) {
    errors.push(`${at} 종목 id 중복: ${dup}`);
  }
  for (const dup of findDuplicates(era.stocks.map((s) => s.themeId))) {
    errors.push(`${at} 한 테마에 종목이 2개 이상: ${dup}`);
  }
  for (const stock of era.stocks) {
    if (!themeIds.has(stock.themeId)) {
      errors.push(`${at} 종목 ${stock.id}: 없는 테마 ${stock.themeId}`);
    }
    checkText(stock.name, `${at} 종목 ${stock.id} name`, errors);
    checkText(stock.description, `${at} 종목 ${stock.id} description`, errors);
  }
  const themesWithStock = new Set(era.stocks.map((s) => s.themeId));
  for (const id of themeIds) {
    if (!themesWithStock.has(id)) errors.push(`${at} 테마 ${id}에 종목이 없음`);
  }

  // 뉴스
  for (const dup of findDuplicates(era.newsPool.map((n) => n.id))) {
    errors.push(`${at} 뉴스 id 중복: ${dup}`);
  }
  for (const news of era.newsPool) {
    const where = `${at} 뉴스 ${news.id}`;
    checkText(news.title, `${where} title`, errors);
    checkText(news.body, `${where} body`, errors);
    if (news.effects.length === 0) warnings.push(`${where}: 영향받는 테마가 없음`);
    for (const effect of news.effects) {
      if (!themeIds.has(effect.themeId)) {
        errors.push(`${where}: 없는 테마 ${effect.themeId}`);
      }
      if (
        !Number.isInteger(effect.impact) ||
        effect.impact < rules.impactMin ||
        effect.impact > rules.impactMax
      ) {
        errors.push(`${where}: 영향도 ${effect.impact}는 ${rules.impactMin}~${rules.impactMax} 정수여야 함`);
      }
      if (effect.impact === 0) warnings.push(`${where}: 영향도 0인 테마 ${effect.themeId}`);
    }
    for (const dup of findDuplicates(news.effects.map((e) => e.themeId))) {
      warnings.push(`${where}: 같은 테마 ${dup}가 2번 이상 (영향도를 합산함)`);
    }
    if (!news.source?.event || !news.source?.date || !news.source?.impactRationale) {
      errors.push(`${where}: 근거 메모(source)가 비어 있음`);
    }
  }
  if (era.newsPool.length < rules.newsPerEra) {
    warnings.push(
      `${at} 뉴스 풀 ${era.newsPool.length}개 < 시대당 필요 ${rules.newsPerEra}개 (풀이 떨어지면 뉴스가 더 안 뜸)`,
    );
  }

  return { errors, warnings };
}

/** 여러 시대를 한꺼번에 검사. 시대 순서(order)와 종목 id의 전역 중복도 확인한다. */
export function validateEras(eras: Era[], rules: EraRules = DEFAULT_ERA_RULES): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  for (const era of eras) {
    const r = validateEra(era, rules);
    errors.push(...r.errors);
    warnings.push(...r.warnings);
  }
  for (const dup of findDuplicates(eras.map((e) => e.id))) errors.push(`시대 id 중복: ${dup}`);
  for (const dup of findDuplicates(eras.map((e) => String(e.order)))) errors.push(`시대 order 중복: ${dup}`);
  for (const dup of findDuplicates(eras.flatMap((e) => e.stocks.map((s) => s.id)))) {
    errors.push(`종목 id가 여러 시대에 중복: ${dup}`);
  }
  return { errors, warnings };
}
