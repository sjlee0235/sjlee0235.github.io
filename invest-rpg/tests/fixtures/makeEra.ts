// 테스트 전용 가상 시대 데이터 생성기.
// 실제 데이터(2000s.json 등)와 상관없이 엔진 규칙만 검증하기 위해 쓴다.

import type { Era, News, NewsEffect, Sentiment, Stock, Storyline, Theme } from '../../src/data/schema.ts';

export interface MakeEraOptions {
  id?: string;
  order?: number;
  /** 단독 뉴스 개수 (기본 50). 짝수 번째는 직접 뉴스(연습용), 홀수 번째는 간접 영향이 섞인 뉴스 */
  newsCount?: number;
  /** 스토리 개수 (기본 0) */
  storylineCount?: number;
  /** 스토리에 단서 뉴스를 넣을지 (기본 false) */
  withClues?: boolean;
  /** 단독 뉴스 i번째의 영향을 직접 정하고 싶을 때 */
  effectsFor?: (newsIndex: number, themeIds: string[]) => NewsEffect[];
}

const SENTIMENTS: Sentiment[] = [
  ...Array<Sentiment>(7).fill('positive'),
  ...Array<Sentiment>(7).fill('negative'),
  ...Array<Sentiment>(6).fill('neutral'),
];

const EXPLANATION = { ko: '첫 문장이에요. 둘째 문장이에요. 셋째 문장이에요.', en: 'First. Second. Third.' };

export function effect(themeId: string, impact: number, link: 'direct' | 'indirect' = 'direct'): NewsEffect {
  return { themeId, impact, link };
}

export function makeNews(id: string, effects: NewsEffect[], extra: Partial<News> = {}): News {
  const n: News = {
    id,
    title: { ko: `뉴스 ${id}`, en: `News ${id}` },
    body: { ko: '본문', en: 'Body' },
    effects,
    source: { event: 'fake', date: '2000', impactRationale: 'test', needsVerification: false },
    ...extra,
  };
  if (effects.length > 0 && effects.every((e) => e.link === 'direct') && !n.explanation) n.explanation = EXPLANATION;
  return n;
}

export function makeStory(id: string, themeId: string, withClues = false): Storyline {
  const story: Storyline = {
    id,
    signal: makeNews(`${id}-sig`, [effect(themeId, 2)]),
    news: [
      makeNews(`${id}-hist`, [effect(themeId, 7)]),
      makeNews(`${id}-fict`, [effect(themeId, -7)]),
    ],
    outcomes: [
      { newsId: `${id}-hist`, isHistorical: true },
      { newsId: `${id}-fict`, isHistorical: false },
    ],
  };
  if (withClues) {
    story.news.push(makeNews(`${id}-clue-hist`, [effect(themeId, 1)]), makeNews(`${id}-clue-fict`, [effect(themeId, -1)]));
    story.clues = [
      { newsId: `${id}-clue-hist`, pointsTo: `${id}-hist` },
      { newsId: `${id}-clue-fict`, pointsTo: `${id}-fict` },
    ];
  }
  return story;
}

export function makeEra(options: MakeEraOptions = {}): Era {
  const id = options.id ?? 'test';
  const newsCount = options.newsCount ?? 50;

  const themes: Theme[] = SENTIMENTS.map((sentiment, i) => ({
    id: `t${i}`,
    name: { ko: `테마${i}`, en: `Theme${i}` },
    sentiment,
  }));
  const themeIds = themes.map((t) => t.id);
  const stocks: Stock[] = themes.map((t, i) => ({
    id: `${id}-s${i}`,
    themeId: t.id,
    name: { ko: `가상 종목${i}`, en: `Fake Stock ${i}` },
    description: { ko: '테스트용 종목', en: 'Test stock' },
  }));

  // 기본: 짝수 뉴스는 테마 (i % 20)에 +5(직접), 홀수 뉴스는 +5(직접)와 다음 테마 -4(간접)
  const defaultEffects = (i: number): NewsEffect[] =>
    i % 2 === 0
      ? [effect(themeIds[i % 20]!, 5)]
      : [effect(themeIds[i % 20]!, 5), effect(themeIds[(i + 1) % 20]!, -4, 'indirect')];
  const newsPool: News[] = Array.from({ length: newsCount }, (_, i) =>
    makeNews(`${id}-n${i}`, options.effectsFor ? options.effectsFor(i, themeIds) : defaultEffects(i)),
  );

  const storylines = Array.from({ length: options.storylineCount ?? 0 }, (_, i) =>
    makeStory(`${id}-story${i}`, themeIds[i % 20]!, options.withClues),
  );

  return {
    id,
    order: options.order ?? 0,
    displayName: { ko: `테스트 시대 ${id}`, en: `Test Era ${id}` },
    period: { startYear: 2000, endYear: 2009 },
    themes,
    stocks,
    newsPool,
    storylines,
  };
}
