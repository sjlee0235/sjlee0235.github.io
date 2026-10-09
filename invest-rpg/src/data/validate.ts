// JSON 데이터가 규칙에 맞는지 검사한다.
// errors = 반드시 고쳐야 하는 문제, warnings = 게임은 돌아가지만 확인이 필요한 문제.

import { DEFAULT_CONFIG, getTickRules } from '../engine/config.ts';
import { MARKET_THEME_ID, type Era, type LocalizedText, type News } from './schema.ts';

export interface EraRules {
  themeCount: number;
  sentimentCounts: { positive: number; negative: number; neutral: number };
  /** 시대 하나에 뉴스가 뜰 수 있는 최대 자리 수. 뉴스 공급이 이보다 적으면 경고 */
  maxNewsSlots: number;
  impactMin: number;
  impactMax: number;
  /** 낌새 뉴스 영향도 크기 상한 */
  signalImpactMax: number;
}

/** 기본 설정으로 시대 하나에 생길 수 있는 뉴스 자리의 최대 개수 (첫 뉴스 최소 시점 + 최소 간격 반복) */
export function maxNewsSlots(): number {
  const r = getTickRules(DEFAULT_CONFIG);
  const last = r.ticksPerEra - r.newsDelayTicks - r.momentumTicks;
  return 1 + Math.floor((last - r.firstNewsMinTicks) / r.newsGapMinTicks);
}

export const DEFAULT_ERA_RULES: EraRules = {
  themeCount: 20,
  sentimentCounts: { positive: 7, negative: 7, neutral: 6 },
  maxNewsSlots: maxNewsSlots(),
  impactMin: -10,
  impactMax: 10,
  signalImpactMax: 4,
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

function maxAbsImpact(news: News): number {
  return Math.max(0, ...news.effects.map((e) => Math.abs(e.impact)));
}

function hasDirect(news: News): boolean {
  return news.effects.some((e) => e.link === 'direct');
}

function checkNews(
  news: News,
  where: string,
  themeIds: Set<string>,
  rules: EraRules,
  errors: string[],
  warnings: string[],
): void {
  checkText(news.title, `${where} title`, errors);
  checkText(news.body, `${where} body`, errors);
  if (news.effects.length === 0) warnings.push(`${where}: 영향받는 테마가 없음`);
  for (const effect of news.effects) {
    const at = `${where} [${effect.themeId}]`;
    if (effect.themeId !== MARKET_THEME_ID && !themeIds.has(effect.themeId)) {
      errors.push(`${where}: 없는 테마 ${effect.themeId}`);
    }
    if (!Number.isInteger(effect.impact) || effect.impact < rules.impactMin || effect.impact > rules.impactMax) {
      errors.push(`${at}: 영향도 ${effect.impact}는 ${rules.impactMin}~${rules.impactMax} 정수여야 함`);
    }
    if (effect.impact === 0) warnings.push(`${at}: 영향도 0`);
    if (effect.link !== 'direct' && effect.link !== 'indirect') {
      errors.push(`${at}: link는 direct 또는 indirect여야 함 (${String(effect.link)})`);
    }
    checkText(effect.explanation, `${at} explanation`, errors);
  }
  for (const dup of findDuplicates(news.effects.map((e) => e.themeId))) {
    warnings.push(`${where}: 같은 테마 ${dup}가 2번 이상 (영향도를 합산함)`);
  }
  if (!news.source?.event || !news.source?.date || !news.source?.impactRationale) {
    errors.push(`${where}: 근거 메모(source)가 비어 있음`);
  }
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
    if (theme.id === MARKET_THEME_ID) errors.push(`${at} 테마 id "${MARKET_THEME_ID}"는 예약어라 쓸 수 없음`);
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
    if (!themeIds.has(stock.themeId)) errors.push(`${at} 종목 ${stock.id}: 없는 테마 ${stock.themeId}`);
    checkText(stock.name, `${at} 종목 ${stock.id} name`, errors);
    checkText(stock.description, `${at} 종목 ${stock.id} description`, errors);
  }
  const themesWithStock = new Set(era.stocks.map((s) => s.themeId));
  for (const id of themeIds) {
    if (!themesWithStock.has(id)) errors.push(`${at} 테마 ${id}에 종목이 없음`);
  }

  // 단독 뉴스
  for (const news of era.newsPool) checkNews(news, `${at} 뉴스 ${news.id}`, themeIds, rules, errors, warnings);

  // 스토리라인
  for (const s of era.storylines) {
    const where = `${at} 스토리라인 ${s.id}`;
    if (s.signals.length === 0) errors.push(`${where}: 낌새 뉴스가 없음`);
    if (s.branches.length < 2) errors.push(`${where}: 결과 갈래가 2개 이상이어야 함`);
    for (const n of s.signals) {
      checkNews(n, `${where} 낌새 ${n.id}`, themeIds, rules, errors, warnings);
      if (maxAbsImpact(n) > rules.signalImpactMax) {
        errors.push(`${where} 낌새 ${n.id}: 낌새 영향도는 ±${rules.signalImpactMax} 이하여야 함`);
      }
    }
    const signalMax = Math.max(0, ...s.signals.map(maxAbsImpact));
    for (const b of s.branches) {
      checkNews(b.news, `${where} 결과 ${b.news.id}`, themeIds, rules, errors, warnings);
      if (b.tone !== 'positive' && b.tone !== 'negative') errors.push(`${where} 결과 ${b.news.id}: tone 값이 이상함`);
      if (b.weight !== undefined && !(b.weight > 0)) errors.push(`${where} 결과 ${b.news.id}: weight는 0보다 커야 함`);
      if (maxAbsImpact(b.news) <= signalMax) {
        errors.push(`${where} 결과 ${b.news.id}: 결과 뉴스의 최대 영향도가 낌새 뉴스보다 커야 함`);
      }
    }
  }

  const allNews = [...era.newsPool, ...era.storylines.flatMap((s) => [...s.signals, ...s.branches.map((b) => b.news)])];
  for (const dup of findDuplicates(allNews.map((n) => n.id))) errors.push(`${at} 뉴스 id 중복: ${dup}`);
  for (const dup of findDuplicates(era.storylines.map((s) => s.id))) errors.push(`${at} 스토리라인 id 중복: ${dup}`);

  // 뉴스 공급량: 스토리라인 1개는 (낌새 수 + 결과 1) 자리를 쓴다
  const realSupply = era.newsPool.length + era.storylines.reduce((a, s) => a + s.signals.length + 1, 0);
  const practiceSupply =
    era.newsPool.filter(hasDirect).length +
    era.storylines
      .filter((s) => s.signals.every(hasDirect) && s.branches.every((b) => hasDirect(b.news)))
      .reduce((a, s) => a + s.signals.length + 1, 0);
  if (realSupply < rules.maxNewsSlots) {
    warnings.push(`${at} 실전 모드 뉴스 공급 ${realSupply}자리 < 최대 ${rules.maxNewsSlots}자리 (부족하면 뒤쪽에 뉴스가 안 뜸)`);
  }
  if (practiceSupply < rules.maxNewsSlots) {
    warnings.push(`${at} 연습 모드 뉴스 공급 ${practiceSupply}자리 < 최대 ${rules.maxNewsSlots}자리 (1차 영향 뉴스만 사용)`);
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
