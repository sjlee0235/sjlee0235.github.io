// 테스트 전용 가상 시대 데이터 생성기.
// 실제 데이터(2000s.json 등)와 상관없이 엔진 규칙만 검증하기 위해 쓴다.

import type { Era, News, NewsEffect, Sentiment, Theme, Stock } from '../../src/data/schema.ts';

export interface MakeEraOptions {
  id?: string;
  order?: number;
  newsCount?: number;
  /** 뉴스 i번째의 영향을 직접 정하고 싶을 때 */
  effectsFor?: (newsIndex: number, themeIds: string[]) => NewsEffect[];
}

const SENTIMENTS: Sentiment[] = [
  ...Array<Sentiment>(7).fill('positive'),
  ...Array<Sentiment>(7).fill('negative'),
  ...Array<Sentiment>(6).fill('neutral'),
];

export function makeEra(options: MakeEraOptions = {}): Era {
  const id = options.id ?? 'test';
  const newsCount = options.newsCount ?? 40;

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

  // 기본: 뉴스 i는 테마 (i % 20)에 +5, 테마 ((i+1) % 20)에 -4
  const defaultEffects = (i: number): NewsEffect[] => [
    { themeId: themeIds[i % 20]!, impact: 5 },
    { themeId: themeIds[(i + 1) % 20]!, impact: -4 },
  ];
  const newsPool: News[] = Array.from({ length: newsCount }, (_, i) => ({
    id: `${id}-n${i}`,
    title: { ko: `뉴스${i}`, en: `News${i}` },
    body: { ko: '본문', en: 'Body' },
    effects: options.effectsFor ? options.effectsFor(i, themeIds) : defaultEffects(i),
    source: { event: 'fake', date: '2000', impactRationale: 'test', needsVerification: false },
  }));

  return {
    id,
    order: options.order ?? 0,
    displayName: { ko: `테스트 시대 ${id}`, en: `Test Era ${id}` },
    period: { startYear: 2000, endYear: 2009 },
    themes,
    stocks,
    newsPool,
  };
}
