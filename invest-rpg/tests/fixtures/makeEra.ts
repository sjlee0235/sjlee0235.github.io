// 테스트 전용 가상 시대 데이터 생성기.
// 실제 데이터(2000s.json 등)와 상관없이 엔진 규칙만 검증하기 위해 쓴다.

import type { Era, News, NewsEffect, Sentiment, Stock, Storyline, Theme } from '../../src/data/schema.ts';

export interface MakeEraOptions {
  id?: string;
  order?: number;
  /** 단독 뉴스 개수 (기본 50) */
  newsCount?: number;
  /** 스토리라인 개수 (기본 0) */
  storylineCount?: number;
  /** 스토리라인당 낌새 뉴스 수 (기본 1) */
  signalsPerStoryline?: number;
  /** 단독 뉴스 i번째의 영향을 직접 정하고 싶을 때 */
  effectsFor?: (newsIndex: number, themeIds: string[]) => NewsEffect[];
}

const SENTIMENTS: Sentiment[] = [
  ...Array<Sentiment>(7).fill('positive'),
  ...Array<Sentiment>(7).fill('negative'),
  ...Array<Sentiment>(6).fill('neutral'),
];

const EXPLAIN = { ko: '해설', en: 'Explanation' };

export function effect(themeId: string, impact: number, link: 'direct' | 'indirect' = 'direct'): NewsEffect {
  return { themeId, impact, link, explanation: EXPLAIN };
}

export function makeNews(id: string, effects: NewsEffect[]): News {
  return {
    id,
    title: { ko: `뉴스 ${id}`, en: `News ${id}` },
    body: { ko: '본문', en: 'Body' },
    effects,
    source: { event: 'fake', date: '2000', impactRationale: 'test', needsVerification: false },
  };
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

  // 기본: 뉴스 i는 테마 (i % 20)에 +5(1차), 테마 ((i+1) % 20)에 -4(2차)
  const defaultEffects = (i: number): NewsEffect[] => [
    effect(themeIds[i % 20]!, 5, 'direct'),
    effect(themeIds[(i + 1) % 20]!, -4, 'indirect'),
  ];
  const newsPool: News[] = Array.from({ length: newsCount }, (_, i) =>
    makeNews(`${id}-n${i}`, options.effectsFor ? options.effectsFor(i, themeIds) : defaultEffects(i)),
  );

  const signalsPer = options.signalsPerStoryline ?? 1;
  const storylines: Storyline[] = Array.from({ length: options.storylineCount ?? 0 }, (_, i) => ({
    id: `${id}-story${i}`,
    signals: Array.from({ length: signalsPer }, (_, k) =>
      makeNews(`${id}-story${i}-sig${k}`, [effect(themeIds[i % 20]!, 2)]),
    ),
    branches: [
      { tone: 'positive' as const, news: makeNews(`${id}-story${i}-pos`, [effect(themeIds[i % 20]!, 7)]) },
      { tone: 'negative' as const, news: makeNews(`${id}-story${i}-neg`, [effect(themeIds[i % 20]!, -7)]) },
    ],
  }));

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
