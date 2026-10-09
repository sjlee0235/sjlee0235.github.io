import { describe, expect, it } from 'vitest';
import { getTickRules, makeConfig } from '../src/engine/config.ts';
import {
  NewsEngine,
  buildNewsSchedule,
  makeNewsSlots,
  multiplierRange,
  newsToRates,
  outcomeWeights,
  tagOf,
} from '../src/engine/newsEngine.ts';
import { createRng } from '../src/engine/rng.ts';
import { effect, makeEra, makeNews, makeStory } from './fixtures/makeEra.ts';

const config = makeConfig();
const rules = getTickRules(config);
const SEEDS = Array.from({ length: 200 }, (_, i) => i + 1);
const THEMES = Array.from({ length: 20 }, (_, i) => `t${i}`);

describe('뉴스 자리 (불규칙 간격)', () => {
  it('[시드 200개] 첫 뉴스 1~3분, 간격 3~6분, 마지막 뉴스도 반영·관성이 시대 안에 끝난다', () => {
    for (const seed of SEEDS) {
      for (const mode of ['real', 'practice'] as const) {
        const r = getTickRules(config, mode);
        const slots = makeNewsSlots(r, createRng(seed));
        expect(slots[0]).toBeGreaterThanOrEqual(12);
        expect(slots[0]).toBeLessThanOrEqual(36);
        for (let i = 1; i < slots.length; i++) {
          const gap = slots[i]! - slots[i - 1]!;
          if (gap < 36 || gap > 72) throw new Error(`seed ${seed}: 간격 ${gap}틱`);
        }
        expect(slots.at(-1)!).toBeLessThanOrEqual(r.ticksPerEra - 6);
      }
    }
  });
});

describe('스토리 슬롯 규칙 (실전)', () => {
  const era = makeEra({ newsCount: 30, storylineCount: 6, withClues: true });

  it('[시드 200개] 결과는 낌새 후 15분 안의 뉴스 자리에 나오고, 단서는 그 사이에, 간격 3~6분은 유지', () => {
    let stories = 0;
    for (const seed of SEEDS) {
      const schedule = buildNewsSchedule(era, createRng(seed), config, 'real');
      for (let i = 1; i < schedule.length; i++) {
        const gap = schedule[i]!.tick - schedule[i - 1]!.tick;
        if (gap < 36 || gap > 72) throw new Error(`seed ${seed}: 뉴스 간격 ${gap}틱`);
      }
      const ids = new Set(schedule.filter((s) => s.storylineId).map((s) => s.storylineId!));
      for (const id of ids) {
        stories++;
        const items = schedule.filter((s) => s.storylineId === id);
        const kinds = items.map((s) => s.kind);
        expect(kinds[0]).toBe('signal');
        expect(kinds.at(-1)).toBe('outcome');
        expect(kinds.filter((k) => k === 'outcome')).toHaveLength(1);
        const gap = items.at(-1)!.tick - items[0]!.tick;
        if (gap <= 0 || gap > 180) throw new Error(`seed ${seed} ${id}: 낌새→결과 ${gap}틱`);
      }
    }
    expect(stories).toBeGreaterThan(200 * 3);
  });

  it('[시드 200개] 동시에 진행되는 스토리는 1개 (결과 전까지 새 낌새 없음)', () => {
    for (const seed of SEEDS) {
      const schedule = buildNewsSchedule(era, createRng(seed), config, 'real');
      let open: string | null = null;
      for (const s of schedule) {
        if (s.kind === 'signal') {
          expect(open, `seed ${seed}`).toBeNull();
          open = s.storylineId!;
        }
        if (s.kind === 'clue') expect(s.storylineId).toBe(open);
        if (s.kind === 'outcome') {
          expect(s.storylineId).toBe(open);
          open = null;
        }
      }
    }
  });

  it('[시드 200개] 시대 종료 15분 전부터는 새 낌새가 시작되지 않는다', () => {
    for (const seed of SEEDS) {
      for (const s of buildNewsSchedule(era, createRng(seed), config, 'real')) {
        if (s.kind === 'signal') expect(s.tick).toBeLessThanOrEqual(rules.ticksPerEra - 180);
      }
    }
  });

  it('[시드 200개] 결과는 실제 역사 쪽 약 70%, 가상 시나리오는 isHistorical=false', () => {
    let hist = 0;
    let total = 0;
    for (const seed of SEEDS) {
      for (const s of buildNewsSchedule(era, createRng(seed), config, 'real')) {
        if (s.kind !== 'outcome') continue;
        total++;
        if (s.isHistorical) {
          hist++;
          expect(s.news.id.endsWith('-hist')).toBe(true);
        } else {
          expect(s.news.id.endsWith('-fict')).toBe(true);
        }
      }
    }
    expect(hist / total).toBeGreaterThan(0.65);
    expect(hist / total).toBeLessThan(0.75);
  });

  it('단서는 실제로 뽑힌 결과를 가리키는 것만 나온다', () => {
    for (const seed of SEEDS) {
      const schedule = buildNewsSchedule(era, createRng(seed), config, 'real');
      for (const clue of schedule.filter((s) => s.kind === 'clue')) {
        const outcome = schedule.find((s) => s.kind === 'outcome' && s.storylineId === clue.storylineId)!;
        expect(clue.news.id.endsWith(outcome.isHistorical ? 'clue-hist' : 'clue-fict')).toBe(true);
        expect(clue.isHistorical).toBe(outcome.isHistorical);
        expect(clue.tick).toBeLessThan(outcome.tick);
      }
    }
  });

  it('가중치를 직접 주면 그 비율을 따르고, 없으면 실제 역사 70%', () => {
    const story = makeStory('w', 't0');
    expect(outcomeWeights(story, 0.7)).toEqual([0.7, expect.closeTo(0.3, 10)]);
    story.outcomes[0]!.weight = 1;
    story.outcomes[1]!.weight = 3;
    expect(outcomeWeights(story, 0.7)).toEqual([1, 3]);
  });
});

describe('풀 고갈과 중복', () => {
  it('[시드 200개] 같은 뉴스는 다시 나오지 않는다', () => {
    const era = makeEra({ newsCount: 30, storylineCount: 6, withClues: true });
    for (const seed of SEEDS) {
      const ids = buildNewsSchedule(era, createRng(seed), config, 'real').map((s) => s.news.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('풀이 바닥나면 더 내보내지 않는다 (반복 없음)', () => {
    const small = makeEra({ newsCount: 5 });
    expect(buildNewsSchedule(small, createRng(1), config, 'real')).toHaveLength(5);
    expect(buildNewsSchedule(small, createRng(1), config, 'practice')).toHaveLength(3); // 직접 뉴스 0,2,4번
  });
});

describe('연습 모드 뉴스', () => {
  it('[시드 100개] 직접(1차) 뉴스만, 스토리·2차 뉴스는 나오지 않는다', () => {
    const era = makeEra({ newsCount: 40, storylineCount: 6, withClues: true });
    for (const seed of SEEDS.slice(0, 100)) {
      const schedule = buildNewsSchedule(era, createRng(seed), config, 'practice');
      expect(schedule.length).toBeGreaterThan(0);
      for (const s of schedule) {
        expect(s.kind).toBe('standalone');
        expect(s.news.effects.every((e) => e.link === 'direct')).toBe(true);
        expect(s.tick).toBeLessThan(360);
      }
    }
  });
});

describe('반영 배율', () => {
  it('배율 범위: 실전 직접 0.6~1.4, 간접 0.4~1.6, 연습 0.85~1.15', () => {
    expect(multiplierRange(config, 'real', 'direct')).toEqual([0.6, 1.4]);
    expect(multiplierRange(config, 'real', 'indirect')).toEqual([0.4, 1.6]);
    expect(multiplierRange(config, 'practice', 'direct')).toEqual([0.85, 1.15]);
  });

  it('[대량 표본] 실제 변동률 = 영향도 × 3% × 배율, 배율이 범위 안에서 고르게 나온다', () => {
    const news = makeNews('x', [effect('t0', 5), effect('t1', -5, 'indirect')]);
    const rng = createRng(9);
    const direct: number[] = [];
    const indirect: number[] = [];
    for (let i = 0; i < 5000; i++) {
      const rates = newsToRates(news, THEMES, config, 'real', rng);
      direct.push(rates.get('t0')! / 150);
      indirect.push(rates.get('t1')! / -150);
    }
    // 0.1% 단위 반올림 때문에 양 끝에 약간의 여유
    expect(Math.min(...direct)).toBeGreaterThanOrEqual(0.6 - 0.004);
    expect(Math.max(...direct)).toBeLessThanOrEqual(1.4 + 0.004);
    expect(Math.min(...indirect)).toBeGreaterThanOrEqual(0.4 - 0.004);
    expect(Math.max(...indirect)).toBeLessThanOrEqual(1.6 + 0.004);
    const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
    expect(avg(direct)).toBeCloseTo(1, 1);
    expect(avg(indirect)).toBeCloseTo(1, 1);
    expect(Math.min(...direct)).toBeLessThan(0.65);
    expect(Math.max(...direct)).toBeGreaterThan(1.35);
  });

  it('연습 모드 배율은 0.85~1.15', () => {
    const news = makeNews('x', [effect('t0', 10)]);
    const rng = createRng(3);
    for (let i = 0; i < 2000; i++) {
      const r = newsToRates(news, THEMES, config, 'practice', rng).get('t0')!;
      expect(r).toBeGreaterThanOrEqual(255);
      expect(r).toBeLessThanOrEqual(300); // 345는 ±30%에서 잘림
    }
  });

  it('배율을 곱해도 ±30%를 넘지 않는다', () => {
    const rng = createRng(1);
    for (let i = 0; i < 500; i++) {
      const r = newsToRates(makeNews('x', [effect('t0', -10)]), THEMES, config, 'real', rng).get('t0')!;
      expect(r).toBeGreaterThanOrEqual(-300);
    }
  });
});

describe('보관함 태그', () => {
  it('direct / indirect / market / hint / outcome', () => {
    expect(tagOf(makeNews('a', [effect('t0', 3)]), 'standalone')).toBe('direct');
    expect(tagOf(makeNews('b', [effect('t0', 3), effect('t1', 2, 'indirect')]), 'standalone')).toBe('indirect');
    expect(tagOf(makeNews('c', [effect('t0', 3)], { category: 'market' }), 'standalone')).toBe('market');
    expect(tagOf(makeNews('d', [effect('t0', 2)]), 'signal')).toBe('hint');
    expect(tagOf(makeNews('e', [effect('t0', 2)]), 'clue')).toBe('hint');
    expect(tagOf(makeNews('f', [effect('t0', 7)]), 'outcome')).toBe('outcome');
  });
});

describe('NewsEngine — 반영 시점과 재현성', () => {
  const era = makeEra();
  const engineOf = (mode: 'real' | 'practice', seed = 1) => new NewsEngine(era, createRng(seed), createRng(seed + 1000), config, mode);

  it('실전: 뉴스가 뜬 틱 + 2틱(10초)에 반영, 팝업 없음', () => {
    const engine = engineOf('real');
    const first = engine.schedule[0]!;
    expect(engine.checkTrigger(first.tick)).toBe(first);
    expect(engine.isPopupOpen).toBe(false);
    expect(engine.consumeRatesFor(first.tick + 1)).toBeUndefined();
    expect(engine.consumeRatesFor(first.tick + 2)).toBeDefined();
  });

  it('연습: 팝업, 확인한 틱 + 2틱에 반영', () => {
    const engine = engineOf('practice');
    const first = engine.schedule[0]!;
    engine.checkTrigger(first.tick);
    expect(engine.isPopupOpen).toBe(true);
    expect(engine.consumeRatesFor(first.tick + 2)).toBeUndefined();
    engine.confirm(first.tick);
    expect(engine.consumeRatesFor(first.tick + 1)).toBeUndefined();
    expect(engine.consumeRatesFor(first.tick + 2)).toBeDefined();
  });

  it('같은 시드면 같은 일정과 같은 반영값', () => {
    const run = () => {
      const e = engineOf('real', 5);
      const out: unknown[] = [];
      for (let t = 0; t < 1440; t++) {
        if (e.checkTrigger(t)) out.push(t);
        const r = e.consumeRatesFor(t);
        if (r) out.push([...r]);
      }
      return out;
    };
    expect(run()).toEqual(run());
  });
});
