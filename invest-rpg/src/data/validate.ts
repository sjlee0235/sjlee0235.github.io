// JSON 데이터가 규칙에 맞는지 검사한다.
// errors = 반드시 고쳐야 하는 문제, warnings = 게임은 돌아가지만 확인이 필요한 문제.

import { DEFAULT_CONFIG, getTickRules, type GameMode } from '../engine/config.ts';
import { isAllDirect, MARKET_THEME_ID, type Era, type LocalizedText, type News } from './schema.ts';

export interface EraRules {
  themeCount: number;
  sentimentCounts: { positive: number; negative: number; neutral: number };
  impactMin: number;
  impactMax: number;
  /** 낌새 뉴스 영향도 크기 범위 */
  signalImpactMin: number;
  signalImpactMax: number;
  /** 뉴스 하나가 직접 영향을 주는 테마 최대 개수 */
  maxDirectThemesPerNews: number;
  /** 해설 문장 수 범위 */
  explanationSentences: readonly [number, number];
  /** 실전 뉴스 공급 목표 (자리 수) */
  realSupplyTarget: number;
  /** 연습 직접 뉴스 공급 목표 (개수) */
  practiceSupplyTarget: number;
  /** 영향도 크기 분포 목표 (1~3 / 4~6 / 7~10 비율)와 허용 오차 */
  impactDistribution: { low: number; mid: number; high: number; tolerance: number };
}

/** 기본 설정으로 한 판에 생길 수 있는 뉴스 자리의 최대 개수 (첫 뉴스 최소 시점 + 최소 간격 반복) */
export function maxNewsSlots(mode: GameMode = 'real'): number {
  const r = getTickRules(DEFAULT_CONFIG, mode);
  const last = r.ticksPerEra - r.newsDelayTicks - r.momentumTicks;
  return 1 + Math.floor((last - r.firstNewsMinTicks) / r.newsGapMinTicks);
}

export const DEFAULT_ERA_RULES: EraRules = {
  themeCount: 20,
  sentimentCounts: { positive: 7, negative: 7, neutral: 6 },
  impactMin: -10,
  impactMax: 10,
  signalImpactMin: 1,
  signalImpactMax: 3,
  maxDirectThemesPerNews: 8,
  explanationSentences: [3, 4],
  realSupplyTarget: 36,
  practiceSupplyTarget: 14,
  impactDistribution: { low: 0.4, mid: 0.4, high: 0.2, tolerance: 0.1 },
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

/** 문장 수 (마침표·물음표·느낌표로 끝나는 덩어리) */
export function countSentences(text: string): number {
  return (text.match(/[.!?](?=\s|$)/g) ?? []).length;
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

/** 시대의 모든 뉴스 (단독 + 스토리 낌새·결과·단서) */
export function allNewsOf(era: Era): News[] {
  return [...era.newsPool, ...era.storylines.flatMap((s) => [s.signal, ...s.news])];
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
  if (news.category !== undefined && news.category !== 'theme' && news.category !== 'market') {
    errors.push(`${where}: category는 theme 또는 market이어야 함`);
  }
  if (news.effects.length === 0) errors.push(`${where}: 영향받는 테마가 없음`);
  for (const effect of news.effects) {
    const at = `${where} [${effect.themeId}]`;
    if (effect.themeId !== MARKET_THEME_ID && !themeIds.has(effect.themeId)) {
      errors.push(`${where}: 없는 테마 ${effect.themeId}`);
    }
    if (!Number.isInteger(effect.impact) || effect.impact < rules.impactMin || effect.impact > rules.impactMax) {
      errors.push(`${at}: 영향도 ${effect.impact}는 ${rules.impactMin}~${rules.impactMax} 정수여야 함`);
    }
    if (effect.impact === 0) errors.push(`${at}: 영향도 0`);
    if (effect.link !== 'direct' && effect.link !== 'indirect') {
      errors.push(`${at}: link는 direct 또는 indirect여야 함 (${String(effect.link)})`);
    }
    if (effect.explanation) checkText(effect.explanation, `${at} explanation`, errors);
  }
  const directThemes = news.effects.filter((e) => e.link === 'direct' && e.themeId !== MARKET_THEME_ID);
  if (directThemes.length > rules.maxDirectThemesPerNews) {
    errors.push(`${where}: 직접 영향 테마 ${directThemes.length}개 (최대 ${rules.maxDirectThemesPerNews}개)`);
  }
  for (const dup of findDuplicates(news.effects.map((e) => e.themeId))) {
    errors.push(`${where}: 같은 테마 ${dup}가 2번 이상`);
  }
  if (news.explanation) {
    checkText(news.explanation, `${where} explanation`, errors);
    const [min, max] = rules.explanationSentences;
    for (const locale of REQUIRED_LOCALES) {
      const n = countSentences(news.explanation[locale] ?? '');
      if (n < min || n > max) errors.push(`${where} explanation(${locale}): ${n}문장 (${min}~${max}문장)`);
    }
  }
  if (news.reactionNote) checkText(news.reactionNote, `${where} reactionNote`, errors);
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
  for (const dup of findDuplicates(era.themes.map((t) => t.id))) errors.push(`${at} 테마 id 중복: ${dup}`);
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
  for (const dup of findDuplicates(era.stocks.map((s) => s.id))) errors.push(`${at} 종목 id 중복: ${dup}`);
  for (const dup of findDuplicates(era.stocks.map((s) => s.themeId))) errors.push(`${at} 한 테마에 종목이 2개 이상: ${dup}`);
  for (const stock of era.stocks) {
    if (!themeIds.has(stock.themeId)) errors.push(`${at} 종목 ${stock.id}: 없는 테마 ${stock.themeId}`);
    checkText(stock.name, `${at} 종목 ${stock.id} name`, errors);
    checkText(stock.description, `${at} 종목 ${stock.id} description`, errors);
  }
  const themesWithStock = new Set(era.stocks.map((s) => s.themeId));
  for (const id of themeIds) if (!themesWithStock.has(id)) errors.push(`${at} 테마 ${id}에 종목이 없음`);

  // 단독 뉴스: 연습 모드에 나오는(영향이 모두 직접인) 뉴스는 해설 필수
  for (const news of era.newsPool) {
    const where = `${at} 뉴스 ${news.id}`;
    checkNews(news, where, themeIds, rules, errors, warnings);
    if (isAllDirect(news) && !news.explanation) errors.push(`${where}: 연습 모드용(직접) 뉴스는 해설(explanation)이 필수`);
  }

  // 스토리
  for (const s of era.storylines) {
    const where = `${at} 스토리 ${s.id}`;
    checkNews(s.signal, `${where} 낌새 ${s.signal.id}`, themeIds, rules, errors, warnings);
    for (const e of s.signal.effects) {
      const a = Math.abs(e.impact);
      if (a < rules.signalImpactMin || a > rules.signalImpactMax) {
        errors.push(`${where} 낌새: 영향도는 ${rules.signalImpactMin}~${rules.signalImpactMax} 크기여야 함 (${e.themeId} ${e.impact})`);
      }
    }
    const storyNews = new Map(s.news.map((n) => [n.id, n]));
    for (const n of s.news) checkNews(n, `${where} ${n.id}`, themeIds, rules, errors, warnings);
    if (s.outcomes.length < 2) errors.push(`${where}: 결과가 2개 이상이어야 함`);
    if (!s.outcomes.some((o) => o.isHistorical)) errors.push(`${where}: 실제 역사 쪽 결과(isHistorical: true)가 없음`);
    const signalMax = maxAbsImpact(s.signal);
    for (const o of s.outcomes) {
      const n = storyNews.get(o.newsId);
      if (!n) {
        errors.push(`${where}: 결과 ${o.newsId}가 news 목록에 없음`);
        continue;
      }
      if (o.weight !== undefined && !(o.weight > 0)) errors.push(`${where} 결과 ${o.newsId}: weight는 0보다 커야 함`);
      if (maxAbsImpact(n) <= signalMax) errors.push(`${where} 결과 ${o.newsId}: 결과 영향도가 낌새보다 커야 함`);
    }
    const outcomeIds = new Set(s.outcomes.map((o) => o.newsId));
    for (const c of s.clues ?? []) {
      if (!storyNews.has(c.newsId)) errors.push(`${where}: 단서 ${c.newsId}가 news 목록에 없음`);
      if (!outcomeIds.has(c.pointsTo)) errors.push(`${where}: 단서 ${c.newsId}가 가리키는 결과 ${c.pointsTo}가 없음`);
      const clue = storyNews.get(c.newsId);
      if (clue && maxAbsImpact(clue) > rules.signalImpactMax) {
        errors.push(`${where}: 단서 ${c.newsId} 영향도는 ±${rules.signalImpactMax} 이하여야 함`);
      }
    }
    const used = new Set([...outcomeIds, ...(s.clues ?? []).map((c) => c.newsId)]);
    for (const n of s.news) if (!used.has(n.id)) warnings.push(`${where}: 쓰이지 않는 뉴스 ${n.id}`);
  }

  const all = allNewsOf(era);
  for (const dup of findDuplicates(all.map((n) => n.id))) errors.push(`${at} 뉴스 id 중복: ${dup}`);
  for (const dup of findDuplicates(era.storylines.map((s) => s.id))) errors.push(`${at} 스토리 id 중복: ${dup}`);

  // 영향도 분포 (낌새·단서 제외: 이들은 일부러 작게 쓴다)
  const clueIds = new Set(era.storylines.flatMap((s) => (s.clues ?? []).map((c) => c.newsId)));
  const sized = [...era.newsPool, ...era.storylines.flatMap((s) => s.news.filter((n) => !clueIds.has(n.id)))]
    .flatMap((n) => n.effects)
    .map((e) => Math.abs(e.impact));
  if (sized.length > 0) {
    const share = (f: (a: number) => boolean) => sized.filter(f).length / sized.length;
    const d = rules.impactDistribution;
    const actual = { low: share((a) => a <= 3), mid: share((a) => a >= 4 && a <= 6), high: share((a) => a >= 7) };
    for (const k of ['low', 'mid', 'high'] as const) {
      if (Math.abs(actual[k] - d[k]) > d.tolerance) {
        warnings.push(`${at} 영향도 분포 ${k} ${(actual[k] * 100).toFixed(0)}% (목표 ${d[k] * 100}%±${d.tolerance * 100})`);
      }
    }
  }

  // 뉴스 공급량. 스토리 1개는 최소 2자리(낌새 + 결과)를 쓴다
  const realSupply = era.newsPool.length + era.storylines.length * 2;
  const practiceSupply = era.newsPool.filter(isAllDirect).length;
  if (realSupply < rules.realSupplyTarget) {
    warnings.push(`${at} 실전 모드 뉴스 공급 ${realSupply}자리 < 목표 ${rules.realSupplyTarget}자리`);
  }
  if (practiceSupply < rules.practiceSupplyTarget) {
    warnings.push(`${at} 연습 모드 뉴스 공급 ${practiceSupply}개 < 목표 ${rules.practiceSupplyTarget}개`);
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
