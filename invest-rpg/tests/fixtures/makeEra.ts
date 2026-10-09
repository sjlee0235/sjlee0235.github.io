// 테스트·시뮬레이션용 가상 시대 데이터 생성기.
// 실제 콘텐츠(2000s.json)가 없어도 엔진 규칙을 검증할 수 있도록, 콘텐츠 기획 조건을 흉내 낸 데이터를 만든다.
// - 테마 풀 36개: core 24 / peripheral 12, 분위기 13 / 13 / 10 (두 태그는 독립)
// - 속보(기본 14개, magnitude 3~9), 스토리(기본 10개: 잠정 1~3 + 서로 반대인 결과 2개, 7~9)
// - 뉴스마다 영향 테마 6~9개 (주로 core), 연결 강도 3/2/1, 영향도 공식, 분위기 편향 75%

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

/** 종목명 수식어: 색·사물·자연물처럼 평가·전망 어감이 없는 2글자 단어 */
export const NEUTRAL_MODIFIERS: { ko: string; en: string }[] = [
  ['하늘', 'Sky'], ['바다', 'Sea'], ['노을', 'Dusk'], ['구름', 'Cloud'], ['파랑', 'Blue'], ['초록', 'Green'],
  ['은빛', 'Silver'], ['검정', 'Black'], ['하양', 'White'], ['노랑', 'Yellow'], ['보라', 'Violet'], ['주황', 'Orange'],
  ['솔잎', 'Pine'], ['단풍', 'Maple'], ['갈대', 'Reed'], ['들꽃', 'Wildflower'], ['이슬', 'Dew'], ['안개', 'Mist'],
  ['모래', 'Sand'], ['자갈', 'Pebble'], ['호수', 'Lake'], ['강물', 'River'], ['새벽', 'Dawn'], ['저녁', 'Evening'],
  ['돛배', 'Sailboat'], ['등대', 'Lighthouse'], ['연필', 'Pencil'], ['우산', 'Umbrella'], ['종이', 'Paper'], ['유리', 'Glass'],
  ['평화', 'Peace'], ['온유', 'Gentle'], ['고요', 'Calm'], ['물결', 'Wave'], ['바람', 'Wind'], ['별빛', 'Starlight'],
].map(([ko, en]) => ({ ko: ko!, en: en! }));

const INDUSTRIES: { ko: string; en: string }[] = [
  ['반도체', 'Chips'], ['조선', 'Shipyards'], ['철강', 'Steel'], ['정유', 'Refining'], ['제약', 'Pharma'], ['건설', 'Builders'],
  ['통신', 'Telecom'], ['항공', 'Airlines'], ['해운', 'Shipping'], ['은행', 'Bank'], ['증권', 'Securities'], ['보험', 'Insurance'],
  ['게임', 'Games'], ['식품', 'Foods'], ['화학', 'Chemicals'], ['자동차', 'Motors'], ['부품', 'Parts'], ['전자', 'Electronics'],
  ['방산', 'Defense'], ['유통', 'Retail'], ['여행', 'Travel'], ['교육', 'Education'], ['포털', 'Portal'], ['소프트', 'Software'],
  ['바이오', 'Bio'], ['태양광', 'Solar'], ['풍력', 'Wind Power'], ['전지', 'Cells'], ['디스플레이', 'Display'], ['광고', 'Ads'],
  ['패션', 'Fashion'], ['가구', 'Furniture'], ['제지', 'Paper Mills'], ['비료', 'Fertilizer'], ['물류', 'Logistics'], ['화장품', 'Cosmetics'],
].map(([ko, en]) => ({ ko: ko!, en: en! }));

/** 기획 조건을 흉내 낸 가상 시대 */
export function makeSpecEra(options: SpecEraOptions = {}): Era {
  const id = options.id ?? 'spec';
  const rng = createRng(deriveSeed(options.seed ?? 1, 'spec-era', id));
  const bias = options.sentimentBias ?? 0.75;
  const themes = themeList(id, rng);
  // 종목명: "2글자 수식어 + 업종주" / "... Stock". 풀 순서와 상관없도록 따로 섞는다 (데이터 생성 난수와 분리)
  const nameRng = createRng(deriveSeed(options.seed ?? 1, 'spec-names', id));
  const mods = shuffle(NEUTRAL_MODIFIERS, nameRng);
  const inds = shuffle(INDUSTRIES, nameRng);
  const stocks: Stock[] = themes.map((t, i) => ({
    id: `${id}-s${i}`,
    themeId: t.id,
    name: { ko: `${mods[i]!.ko} ${inds[i]!.ko}주`, en: `${mods[i]!.en} ${inds[i]!.en} Stock` },
    description: { ko: '테스트용 가상 회사다.', en: 'A test company.' },
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
      // 앞의 4개는 시대 첫 뉴스로 쓸 수 있는 opener 스토리
      ...(i < 4 ? { opener: true } : {}),
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
