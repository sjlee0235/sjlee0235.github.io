// 테스트·시뮬레이션용 가상 시대 데이터 생성기.
// 실제 콘텐츠(2000s.json)가 없어도 엔진 규칙을 검증할 수 있도록, 콘텐츠 기획 조건을 흉내 낸 데이터를 만든다.
// - 테마 풀 36개: core 24 / peripheral 12, 분위기 13 / 13 / 10 (두 태그는 독립)
// - 속보(기본 14개, magnitude 3~9), 스토리(기본 10개: 잠정 1~3 + 서로 반대인 결과 2개, 7~9)
// - 뉴스마다 영향 테마 6~9개 (주로 core), 연결 강도 3/2/1, 영향도 공식, 분위기 편향 65%

import type {
  Era, LinkStrength, News, NewsEffect, NewsType, Sentiment, Stock, Story, Theme,
} from '../../src/data/schema.ts';
import { expectedImpact } from '../../src/data/schema.ts';
import { createRng, deriveSeed, shuffle, type Rng } from '../../src/engine/rng.ts';

export interface SpecEraOptions {
  id?: string;
  order?: number;
  /** 데이터 생성 시드 (게임 시드와 별개) */
  seed?: number;
  breakingCount?: number;
  storyCount?: number;
  /** 분위기 편향 (긍정 테마가 호재일 확률) */
  sentimentBias?: number;
}

export function effect(themeId: string, impact: number, strength: LinkStrength = 3, reasonKo?: string): NewsEffect {
  const e: NewsEffect = {
    themeId,
    impact,
    link: strength === 3
      ? { strength, keywords: [{ newsTerm: `${themeId}단어`, themeTerm: `${themeId}단어` }] }
      : { strength, keywords: [], chain: '가상 연결' },
  };
  if (reasonKo) e.reason = { ko: reasonKo, en: 'reason' };
  return e;
}

export function makeNews(id: string, type: NewsType, magnitude: number, effects: NewsEffect[]): News {
  const terms = effects.flatMap((e) => e.link.keywords.map((k) => k.newsTerm)).join(' ');
  return {
    id,
    type,
    magnitude,
    title: { ko: `뉴스 ${id}`, en: `News ${id}` },
    body: { ko: `본문 ${terms}`, en: 'Body' },
    effects,
    realDate: '2000',
  };
}

function themeList(id: string, rng: Rng): Theme[] {
  const sentiments: Sentiment[] = shuffle(
    [...Array<Sentiment>(13).fill('positive'), ...Array<Sentiment>(13).fill('negative'), ...Array<Sentiment>(10).fill('neutral')],
    rng,
  );
  return sentiments.map((sentiment, i) => {
    const tid = `t${i}`;
    return {
      id: tid,
      name: { ko: `테마${i}`, en: `Theme${i}` },
      sentiment,
      relevance: i < 24 ? 'core' : 'peripheral',
      keywords: {
        ko: [`${tid}단어`, `${tid}키2`, `${tid}키3`, `${tid}키4`, `${tid}키5`],
        en: [`${tid}word`, `${tid}k2`, `${tid}k3`, `${tid}k4`, `${tid}k5`],
      },
      existsEvidence: `${id} 가상 테마`,
    };
  });
}

/** 영향 테마 고르기: 6~9개, core 75% / peripheral 25% */
function pickThemes(themes: Theme[], rng: Rng): Theme[] {
  const n = rng.int(6, 9);
  const core = shuffle(themes.filter((t) => t.relevance === 'core'), rng);
  const peri = shuffle(themes.filter((t) => t.relevance === 'peripheral'), rng);
  const out: Theme[] = [];
  while (out.length < n) out.push(rng.next() < 0.75 && core.length > 0 ? core.shift()! : peri.shift() ?? core.shift()!);
  return out;
}

const STRENGTHS: LinkStrength[] = [3, 3, 3, 2, 2, 1, 1, 1, 1];

function signFor(t: Theme, rng: Rng, bias: number): 1 | -1 {
  const r = rng.next();
  if (t.sentiment === 'positive') return r < bias ? 1 : -1;
  if (t.sentiment === 'negative') return r < bias ? -1 : 1;
  return r < 0.5 ? 1 : -1;
}

function buildEffects(targets: Theme[], magnitude: number, signs: (1 | -1)[]): NewsEffect[] {
  return targets.map((t, i) => {
    const strength = STRENGTHS[i]!;
    return effect(t.id, signs[i]! * expectedImpact(magnitude, strength), strength, `${t.id} 이유`);
  });
}

/** 기획 조건을 흉내 낸 가상 시대 */
export function makeSpecEra(options: SpecEraOptions = {}): Era {
  const id = options.id ?? 'spec';
  const rng = createRng(deriveSeed(options.seed ?? 1, 'spec-era', id));
  const bias = options.sentimentBias ?? 0.65;
  const themes = themeList(id, rng);
  const stocks: Stock[] = themes.map((t, i) => ({
    id: `${id}-s${i}`,
    themeId: t.id,
    name: { ko: `가상 종목${i}`, en: `Fake ${i}` },
    description: { ko: '테스트용 종목', en: 'Test stock' },
  }));

  const breaking = Array.from({ length: options.breakingCount ?? 14 }, (_, i) => {
    const targets = pickThemes(themes, rng);
    const m = rng.int(3, 9);
    return makeNews(`${id}-b${i}`, 'breaking', m, buildEffects(targets, m, targets.map((t) => signFor(t, rng, bias))));
  });

  const stories: Story[] = Array.from({ length: options.storyCount ?? 10 }, (_, i) => {
    const targets = pickThemes(themes, rng);
    const leanSigns = targets.map((t) => signFor(t, rng, bias));
    const mA = rng.int(7, 9);
    const mB = rng.int(7, 9);
    const sid = `${id}-st${i}`;
    const lean = makeNews(`${sid}-lean`, 'outcome', mA, buildEffects(targets, mA, leanSigns));
    const other = makeNews(`${sid}-other`, 'outcome', mB, buildEffects(targets, mB, leanSigns.map((s) => (s === 1 ? -1 : 1))));
    const mT = rng.int(1, 3);
    return {
      id: sid,
      tentative: makeNews(`${sid}-tent`, 'tentative', mT, buildEffects(targets, mT, leanSigns)),
      news: [lean, other],
      outcomes: [
        { newsId: lean.id, isHistorical: true },
        { newsId: other.id, isHistorical: false },
      ],
      leansTo: lean.id,
    };
  });

  return {
    id,
    order: options.order ?? 0,
    displayName: { ko: `가상 시대 ${id}`, en: `Spec Era ${id}` },
    period: { startYear: 2000, endYear: 2009 },
    themes,
    stocks,
    breaking,
    stories,
  };
}
