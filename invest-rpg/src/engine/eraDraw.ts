// 시대 시작 추첨: 테마 풀(예: 36개)에서 이번 판에 쓸 테마 20개를 뽑는다.
//
// 1) 분위기 층화 추첨: 긍정 7 / 부정 7 / 중립 6 (분위기 그룹마다 따로 무작위로 뽑음)
// 2) 주요(core) 테마가 11개 미만이면 재추첨
// 3) 활성 테마 기준으로 뉴스마다 "유효 영향 테마"를 계산 (활성 아닌 테마 영향은 제거)
//    유효 영향 테마가 3개 미만인 뉴스는 이번 판에서 제외
// 4) 스토리는 잠정 뉴스와 결과 뉴스 2개가 모두 유효해야 사용 가능
// 5) 사용 가능한 속보 10개 미만 또는 스토리 8개 미만이면 다음 시드로 재추첨 (최대 50회)
//    끝까지 안 되면 가장 나은 추첨을 쓰고 warning을 남긴다
// 추첨 결과(EraDraw)는 저장해 두면 같은 판을 그대로 다시 만들 수 있다.

import type { Era, News, Story } from '../data/schema.ts';
import type { GameConfig } from './config.ts';
import { createRng, deriveSeed, shuffle } from './rng.ts';

export interface EraDraw {
  eraId: string;
  /** 추첨에 쓴 원래 시드 */
  seed: number;
  /** 몇 번째 시도에서 정해졌는지 (0 = 첫 시도) */
  attempt: number;
  /** 활성 테마 id (테마 풀 순서대로) */
  activeThemeIds: string[];
  /** 이번 판에 쓸 수 있는 속보·스토리 수 */
  usableBreaking: number;
  usableStories: number;
  /** 이번 판에 쓸 수 있는 opener 스토리 수 (옛 세이브에는 없음) */
  usableOpeners?: number;
  /** 조건을 모두 만족했는가 */
  ok: boolean;
  /** 조건을 못 맞췄을 때의 경고 */
  warning?: string;
}

/** 이번 판에 실제로 쓰는 시대 데이터 (활성 테마만, 영향도 유효한 것만 남김) */
export interface ActiveEra {
  era: Era;
  draw: EraDraw;
  themes: Era['themes'];
  stocks: Era['stocks'];
  breaking: News[];
  stories: Story[];
}

/** 활성 테마 영향만 남긴 뉴스. 유효 영향이 minEffective개 미만이면 null */
export function effectiveNews(news: News, active: ReadonlySet<string>, minEffective: number): News | null {
  const effects = news.effects.filter((e) => active.has(e.themeId));
  return effects.length >= minEffective ? { ...news, effects } : null;
}

/** 스토리를 활성 테마 기준으로 거른다. 잠정·결과가 모두 유효해야 사용 가능. 유효하지 않은 단서는 뺀다 */
export function effectiveStory(story: Story, active: ReadonlySet<string>, minEffective: number): Story | null {
  const tentative = effectiveNews(story.tentative, active, minEffective);
  if (!tentative) return null;
  const outcomeIds = new Set(story.outcomes.map((o) => o.newsId));
  const news: News[] = [];
  for (const n of story.news) {
    const eff = effectiveNews(n, active, minEffective);
    if (outcomeIds.has(n.id) && !eff) return null;
    if (eff) news.push(eff);
  }
  const kept = new Set(news.map((n) => n.id));
  const out: Story = { ...story, tentative, news };
  if (story.clues) out.clues = story.clues.filter((c) => kept.has(c.newsId));
  return out;
}

/** 추첨 결과로 이번 판 데이터를 만든다 */
export function applyDraw(era: Era, draw: EraDraw, config: GameConfig): ActiveEra {
  const active = new Set(draw.activeThemeIds);
  const min = config.draw.minEffectiveThemes;
  return {
    era,
    draw,
    themes: era.themes.filter((t) => active.has(t.id)),
    stocks: era.stocks.filter((s) => active.has(s.themeId)),
    breaking: era.breaking.map((n) => effectiveNews(n, active, min)).filter((n): n is News => n !== null),
    stories: era.stories.map((s) => effectiveStory(s, active, min)).filter((s): s is Story => s !== null),
  };
}

/** 한 번 뽑아 본다 (조건 검사는 하지 않음) */
function pickOnce(era: Era, seed: number, config: GameConfig): string[] {
  const rng = createRng(seed);
  const picked = new Set<string>();
  for (const sentiment of ['positive', 'negative', 'neutral'] as const) {
    const group = era.themes.filter((t) => t.sentiment === sentiment);
    for (const t of shuffle(group, rng).slice(0, config.draw.sentimentCounts[sentiment])) picked.add(t.id);
  }
  return era.themes.filter((t) => picked.has(t.id)).map((t) => t.id);
}

/** 시대 시작 추첨 (같은 seed → 같은 결과) */
export function drawEra(era: Era, seed: number, config: GameConfig): EraDraw {
  const rules = config.draw;
  let best: EraDraw | null = null;
  let bestScore = -Infinity;

  for (let attempt = 0; attempt < rules.maxAttempts; attempt++) {
    const activeThemeIds = pickOnce(era, deriveSeed(seed, 'draw', era.id, attempt), config);
    const active = new Set(activeThemeIds);
    const core = era.themes.filter((t) => active.has(t.id) && t.relevance === 'core').length;
    const usableBreaking = era.breaking.filter((n) => effectiveNews(n, active, rules.minEffectiveThemes)).length;
    const usable = era.stories.filter((s) => effectiveStory(s, active, rules.minEffectiveThemes));
    const usableStories = usable.length;
    const usableOpeners = usable.filter((s) => s.opener).length;
    const ok = core >= rules.minCore && usableBreaking >= rules.minBreaking && usableStories >= rules.minStories
      && usableOpeners >= rules.minOpenerStories;
    const draw: EraDraw = { eraId: era.id, seed, attempt, activeThemeIds, usableBreaking, usableStories, usableOpeners, ok };
    if (ok) return draw;
    // 가장 나은 추첨: core 조건을 먼저 보고, 그다음 속보·스토리 충족 정도
    const score =
      (core >= rules.minCore ? 1000 : 0) +
      Math.min(1, usableBreaking / rules.minBreaking) * 10 +
      Math.min(1, usableStories / rules.minStories) * 10 +
      (usableOpeners >= rules.minOpenerStories ? 5 : 0);
    if (score > bestScore) {
      best = draw;
      bestScore = score;
    }
  }
  const b = best!;
  return {
    ...b,
    warning: `추첨 ${rules.maxAttempts}회 안에 조건을 못 맞춤: 속보 ${b.usableBreaking}/${rules.minBreaking}, 스토리 ${b.usableStories}/${rules.minStories}, opener ${b.usableOpeners ?? 0}/${rules.minOpenerStories}`,
  };
}
