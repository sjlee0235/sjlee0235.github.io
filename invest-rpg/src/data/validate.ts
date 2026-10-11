// 데이터 구조 검사: 이게 틀리면 게임이 제대로 돌아가지 않는다 (errors).
// 작성 가이드(영향 테마 수, 영향도 공식, 분위기 편향 등)는 lint.ts가 따로 점검한다.

import { DEFAULT_CONFIG } from '../engine/config.ts';
import { allNewsOf, type Era, type LocalizedText, type News, type NewsType } from './schema.ts';

export interface ValidationResult {
  errors: string[];
  warnings: string[];
}

const REQUIRED_LOCALES = ['ko', 'en'] as const;
const SENTIMENTS = ['positive', 'negative', 'neutral'] as const;
/** 뉴스 종류별 magnitude 허용 범위 */
export const MAGNITUDE_RANGE: Record<NewsType, readonly [number, number]> = {
  breaking: [3, 10],
  tentative: [1, 3],
  outcome: [7, 10],
};

function checkText(text: LocalizedText | undefined, where: string, errors: string[]): void {
  for (const locale of REQUIRED_LOCALES) {
    const value = text?.[locale];
    if (typeof value !== 'string' || value.trim() === '') errors.push(`${where}: ${locale} 텍스트가 비어 있음`);
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

function checkNews(news: News, expectedType: NewsType, themeIds: Set<string>, at: string, errors: string[]): void {
  const where = `${at} 뉴스 ${news.id}`;
  if (news.type !== expectedType) errors.push(`${where}: type은 ${expectedType}이어야 함 (${news.type})`);
  const [min, max] = MAGNITUDE_RANGE[expectedType];
  if (!Number.isInteger(news.magnitude) || news.magnitude < min || news.magnitude > max) {
    errors.push(`${where}: magnitude ${news.magnitude}는 ${min}~${max} 정수여야 함`);
  }
  checkText(news.title, `${where} title`, errors);
  checkText(news.body, `${where} body`, errors);
  if (!news.realDate) errors.push(`${where}: realDate가 비어 있음`);
  if (news.effects.length === 0) errors.push(`${where}: 영향받는 테마가 없음`);
  for (const dup of findDuplicates(news.effects.map((e) => e.themeId))) errors.push(`${where}: 같은 테마 ${dup}가 2번 이상`);
  for (const e of news.effects) {
    const ew = `${where} [${e.themeId}]`;
    if (!themeIds.has(e.themeId)) errors.push(`${where}: 없는 테마 ${e.themeId}`);
    if (!Number.isInteger(e.impact) || e.impact === 0 || Math.abs(e.impact) > 10) {
      errors.push(`${ew}: 영향도 ${e.impact}는 0이 아닌 -10~10 정수여야 함`);
    }
    if (![1, 2, 3].includes(e.link?.strength)) errors.push(`${ew}: 연결 강도는 1, 2, 3 중 하나여야 함`);
    if (!Array.isArray(e.link?.keywords)) errors.push(`${ew}: link.keywords가 없음`);
  }
  if (news.reactionNote) checkText(news.reactionNote, `${where} reactionNote`, errors);
}

export function validateEra(era: Era): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const at = `[${era.id}]`;
  const rules = DEFAULT_CONFIG.draw;

  checkText(era.displayName, `${at} displayName`, errors);

  // 테마 풀
  for (const dup of findDuplicates(era.themes.map((t) => t.id))) errors.push(`${at} 테마 id 중복: ${dup}`);
  for (const t of era.themes) {
    const tw = `${at} 테마 ${t.id}`;
    if (!SENTIMENTS.includes(t.sentiment)) errors.push(`${tw}: sentiment 값이 이상함`);
    if (t.relevance !== 'core' && t.relevance !== 'peripheral') errors.push(`${tw}: relevance는 core/peripheral`);
    checkText(t.name, `${tw} name`, errors);
    if (!t.keywords || !Array.isArray(t.keywords.ko) || !Array.isArray(t.keywords.en)) errors.push(`${tw}: keywords {ko, en}가 없음`);
  }
  // 추첨이 가능한가: 분위기별 개수와 core 수
  for (const s of SENTIMENTS) {
    const have = era.themes.filter((t) => t.sentiment === s).length;
    if (have < rules.sentimentCounts[s]) errors.push(`${at} ${s} 테마 ${have}개 < 추첨에 필요한 ${rules.sentimentCounts[s]}개`);
  }
  if (era.themes.filter((t) => t.relevance === 'core').length < rules.minCore) {
    errors.push(`${at} core 테마가 ${rules.minCore}개보다 적어 추첨 조건을 만족할 수 없음`);
  }

  // 종목: 테마당 정확히 1개
  const themeIds = new Set(era.themes.map((t) => t.id));
  for (const dup of findDuplicates(era.stocks.map((s) => s.id))) errors.push(`${at} 종목 id 중복: ${dup}`);
  for (const dup of findDuplicates(era.stocks.map((s) => s.themeId))) errors.push(`${at} 한 테마에 종목이 2개 이상: ${dup}`);
  for (const s of era.stocks) {
    if (!themeIds.has(s.themeId)) errors.push(`${at} 종목 ${s.id}: 없는 테마 ${s.themeId}`);
    checkText(s.name, `${at} 종목 ${s.id} name`, errors);
    checkText(s.description, `${at} 종목 ${s.id} description`, errors);
  }
  for (const id of themeIds) if (!era.stocks.some((s) => s.themeId === id)) errors.push(`${at} 테마 ${id}에 종목이 없음`);

  // 속보
  for (const n of era.breaking) checkNews(n, 'breaking', themeIds, at, errors);

  // 스토리
  for (const s of era.stories) {
    const sw = `${at} 스토리 ${s.id}`;
    checkNews(s.tentative, 'tentative', themeIds, sw, errors);
    const byId = new Map(s.news.map((n) => [n.id, n]));
    if (s.outcomes.length !== 2) errors.push(`${sw}: 결과는 정확히 2개여야 함 (${s.outcomes.length})`);
    if (!s.outcomes.some((o) => o.isHistorical)) errors.push(`${sw}: 실제 역사 쪽 결과(isHistorical: true)가 없음`);
    for (const o of s.outcomes) {
      const n = byId.get(o.newsId);
      if (!n) errors.push(`${sw}: 결과 ${o.newsId}가 news 목록에 없음`);
      else checkNews(n, 'outcome', themeIds, sw, errors);
      if (o.weight !== undefined && !(o.weight > 0)) errors.push(`${sw}: 결과 ${o.newsId} weight는 0보다 커야 함`);
    }
    const lean = s.outcomes.find((o) => o.newsId === s.leansTo);
    if (!lean) errors.push(`${sw}: leansTo ${s.leansTo}가 결과 중에 없음`);
    const other = s.outcomes.find((o) => o.newsId !== s.leansTo);
    if (lean?.weight !== undefined && other?.weight !== undefined && lean.weight <= other.weight) {
      errors.push(`${sw}: leansTo 쪽 가중치가 더 커야 함`);
    }
    // 두 결과는 서로 반대 방향: 공통 테마에서 부호가 반대여야 한다
    const [a, b] = s.outcomes.map((o) => byId.get(o.newsId));
    if (a && b) {
      const bMap = new Map(b.effects.map((e) => [e.themeId, e.impact]));
      const shared = a.effects.filter((e) => bMap.has(e.themeId));
      if (shared.length === 0) errors.push(`${sw}: 두 결과가 공유하는 테마가 없음`);
      for (const e of shared) {
        if (Math.sign(e.impact) === Math.sign(bMap.get(e.themeId)!)) {
          errors.push(`${sw}: 두 결과의 ${e.themeId} 영향 방향이 같음 (서로 반대여야 함)`);
        }
      }
    }
    const outcomeIds = new Set(s.outcomes.map((o) => o.newsId));
    for (const c of s.clues ?? []) {
      const n = byId.get(c.newsId);
      if (!n) errors.push(`${sw}: 단서 ${c.newsId}가 news 목록에 없음`);
      else checkNews(n, 'tentative', themeIds, sw, errors);
      if (!outcomeIds.has(c.pointsTo)) errors.push(`${sw}: 단서 ${c.newsId}가 가리키는 결과가 없음`);
    }
  }

  const all = allNewsOf(era);
  for (const dup of findDuplicates(all.map((n) => n.id))) errors.push(`${at} 뉴스 id 중복: ${dup}`);
  for (const dup of findDuplicates(era.stories.map((s) => s.id))) errors.push(`${at} 스토리 id 중복: ${dup}`);

  return { errors, warnings };
}

/** 여러 시대를 한꺼번에 검사. 시대 순서(order)와 종목 id의 전역 중복도 확인한다. */
export function validateEras(eras: Era[]): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  for (const era of eras) {
    const r = validateEra(era);
    errors.push(...r.errors);
    warnings.push(...r.warnings);
  }
  for (const dup of findDuplicates(eras.map((e) => e.id))) errors.push(`시대 id 중복: ${dup}`);
  for (const dup of findDuplicates(eras.map((e) => String(e.order)))) errors.push(`시대 order 중복: ${dup}`);
  for (const dup of findDuplicates(eras.flatMap((e) => e.stocks.map((s) => s.id)))) errors.push(`종목 id가 여러 시대에 중복: ${dup}`);
  return { errors, warnings };
}
