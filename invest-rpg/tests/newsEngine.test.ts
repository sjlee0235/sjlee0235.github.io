import { describe, expect, it } from 'vitest';
import { getTickRules, makeConfig } from '../src/engine/config.ts';
import {
  NewsEngine,
  buildNewsSchedule,
  makeNewsSlots,
  newsForMode,
  newsToImpacts,
} from '../src/engine/newsEngine.ts';
import { createRng } from '../src/engine/rng.ts';
import { effect, makeEra, makeNews } from './fixtures/makeEra.ts';

const config = makeConfig();
const rules = getTickRules(config);
const SEEDS = Array.from({ length: 200 }, (_, i) => i + 1);
const THEMES = Array.from({ length: 20 }, (_, i) => `t${i}`);

describe('뉴스 자리 (불규칙 간격)', () => {
  it('[시드 200개] 첫 뉴스는 1~3분, 이후 간격은 3~6분, 마지막 뉴스도 반영·관성이 시대 안에 끝난다', () => {
    for (const seed of SEEDS) {
      const slots = makeNewsSlots(rules, createRng(seed));
      expect(slots[0]).toBeGreaterThanOrEqual(12); // 60초
      expect(slots[0]).toBeLessThanOrEqual(36); // 180초
      for (let i = 1; i < slots.length; i++) {
        const gap = slots[i]! - slots[i - 1]!;
        if (gap < 36 || gap > 72) throw new Error(`seed ${seed}: 간격 ${gap}틱`);
      }
      expect(slots.at(-1)!).toBeLessThanOrEqual(rules.ticksPerEra - 2 - 4);
      // 다음 자리가 들어갈 수 없을 만큼만 남아 있어야 한다 (늘어지지 않게)
      expect(rules.ticksPerEra - slots.at(-1)!).toBeLessThanOrEqual(72 + 6);
      expect(slots.length).toBeGreaterThanOrEqual(20);
      expect(slots.length).toBeLessThanOrEqual(40);
    }
  });

  it('시드마다 간격이 다르다 (불규칙)', () => {
    const a = makeNewsSlots(rules, createRng(1));
    const b = makeNewsSlots(rules, createRng(2));
    expect(a).not.toEqual(b);
    const gaps = a.slice(1).map((t, i) => t - a[i]!);
    expect(new Set(gaps).size).toBeGreaterThan(3);
  });
});

describe('뉴스 일정표', () => {
  const era = makeEra({ newsCount: 30, storylineCount: 6 });

  it('[시드 200개] 같은 뉴스가 두 번 나오지 않는다', () => {
    for (const seed of SEEDS) {
      const ids = buildNewsSchedule(era, createRng(seed), config, 'real').map((s) => s.news.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('같은 시드면 같은 일정, 다른 시드면 다른 일정', () => {
    const a = buildNewsSchedule(era, createRng(10), config, 'real');
    expect(buildNewsSchedule(era, createRng(10), config, 'real')).toEqual(a);
    expect(buildNewsSchedule(era, createRng(11), config, 'real')).not.toEqual(a);
  });

  it('[시드 200개] 낌새 뉴스 뒤 15분(180틱) 안에 결과 뉴스가 반드시 나온다', () => {
    let storiesSeen = 0;
    for (const seed of SEEDS) {
      const schedule = buildNewsSchedule(era, createRng(seed), config, 'real');
      const byStory = new Map<string, typeof schedule>();
      for (const s of schedule) {
        if (!s.storylineId) continue;
        if (!byStory.has(s.storylineId)) byStory.set(s.storylineId, []);
        byStory.get(s.storylineId)!.push(s);
      }
      for (const [id, items] of byStory) {
        storiesSeen++;
        const signals = items.filter((i) => i.kind === 'signal');
        const outcomes = items.filter((i) => i.kind === 'outcome');
        expect(signals).toHaveLength(1);
        expect(outcomes, `${id} 결과`).toHaveLength(1);
        const gap = outcomes[0]!.tick - signals[0]!.tick;
        if (gap <= 0 || gap > rules.signalOutcomeWithinTicks) throw new Error(`seed ${seed} ${id}: 간격 ${gap}`);
      }
    }
    expect(storiesSeen).toBeGreaterThan(200 * 3);
  });

  it('[시드 200개] 결과는 긍정·부정이 무작위로, 시기도 15분 안에서 무작위로 정해진다', () => {
    const tones = { positive: 0, negative: 0 };
    const gaps = new Set<number>();
    for (const seed of SEEDS) {
      const schedule = buildNewsSchedule(era, createRng(seed), config, 'real');
      for (const s of schedule) {
        if (s.kind !== 'outcome') continue;
        tones[s.tone!]++;
        const signal = schedule.find((x) => x.kind === 'signal' && x.storylineId === s.storylineId)!;
        gaps.add(s.tick - signal.tick);
      }
    }
    const total = tones.positive + tones.negative;
    expect(tones.positive / total).toBeGreaterThan(0.45);
    expect(tones.positive / total).toBeLessThan(0.55);
    expect(gaps.size).toBeGreaterThan(50);
    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(36);
    expect(Math.max(...gaps)).toBeLessThanOrEqual(180);
  });

  it('[시드 100개] 낌새가 2개인 스토리라인: 낌새1 → 낌새2 → 결과 순서, 모두 첫 낌새로부터 15분 안', () => {
    const era2 = makeEra({ newsCount: 30, storylineCount: 5, signalsPerStoryline: 2 });
    for (const seed of SEEDS.slice(0, 100)) {
      const schedule = buildNewsSchedule(era2, createRng(seed), config, 'real');
      const ids = new Set(schedule.filter((s) => s.storylineId).map((s) => s.storylineId!));
      for (const id of ids) {
        const items = schedule.filter((s) => s.storylineId === id);
        expect(items.map((i) => i.kind)).toEqual(['signal', 'signal', 'outcome']);
        expect(items[0]!.news.id.endsWith('sig0')).toBe(true);
        expect(items[1]!.news.id.endsWith('sig1')).toBe(true);
        expect(items[2]!.tick - items[0]!.tick).toBeLessThanOrEqual(180);
      }
    }
  });

  it('뉴스 풀이 부족하면 있는 만큼만 나온다', () => {
    const small = makeEra({ newsCount: 5 });
    expect(buildNewsSchedule(small, createRng(1), config, 'real')).toHaveLength(5);
  });
});

describe('연습 모드 뉴스', () => {
  it('1차(direct) 영향만 남기고, 1차 영향이 없는 뉴스는 빠진다', () => {
    const mixed = makeNews('m', [effect('t0', 5, 'direct'), effect('t1', -3, 'indirect')]);
    const onlyIndirect = makeNews('i', [effect('t2', 4, 'indirect')]);
    expect(newsForMode(mixed, 'practice')!.effects.map((e) => e.themeId)).toEqual(['t0']);
    expect(newsForMode(onlyIndirect, 'practice')).toBeNull();
    expect(newsForMode(onlyIndirect, 'real')).toBe(onlyIndirect);
  });

  it('[시드 50개] 연습 모드 일정에는 2차 영향이 하나도 없다', () => {
    const era = makeEra({
      newsCount: 40,
      effectsFor: (i, ids) => (i % 3 === 0 ? [effect(ids[i % 20]!, 3, 'indirect')] : [effect(ids[i % 20]!, 5), effect(ids[(i + 1) % 20]!, -2, 'indirect')]),
    });
    for (let seed = 1; seed <= 50; seed++) {
      const schedule = buildNewsSchedule(era, createRng(seed), config, 'practice');
      expect(schedule.length).toBeGreaterThan(0);
      for (const s of schedule) {
        expect(s.news.effects.every((e) => e.link === 'direct')).toBe(true);
      }
    }
  });
});

describe('영향도 계산 (newsToImpacts)', () => {
  it('같은 테마는 합산 후 ±10으로 자른다', () => {
    const news = makeNews('x', [effect('t0', 7), effect('t0', 6), effect('t1', -3)]);
    expect(newsToImpacts(news, THEMES, 10)).toEqual(new Map([['t0', 10], ['t1', -3]]));
  });

  it('시장 전체(market) 영향은 모든 테마에 더해진다', () => {
    const news = makeNews('x', [effect('market', -2), effect('t0', 5), effect('t1', 2)]);
    const map = newsToImpacts(news, THEMES, 10);
    expect(map.get('t0')).toBe(3);
    expect(map.has('t1')).toBe(false); // -2 + 2 = 0 → 영향 없음 (평소 랜덤)
    expect(map.get('t7')).toBe(-2);
    expect(map.size).toBe(19);
  });
});

describe('NewsEngine — 반영 시점', () => {
  const era = makeEra();

  it('실전: 뉴스가 뜬 틱 + 2틱(10초)에 반영, 시간은 멈추지 않는다', () => {
    const engine = new NewsEngine(era, createRng(1), config, 'real');
    const first = engine.schedule[0]!;
    for (let t = 0; t < first.tick; t++) expect(engine.checkTrigger(t)).toBeNull();
    expect(engine.checkTrigger(first.tick)).toBe(first);
    expect(engine.isPopupOpen).toBe(false);
    expect(engine.consumeImpactsFor(first.tick + 1)).toBeUndefined();
    expect(engine.consumeImpactsFor(first.tick + 2)).toEqual(newsToImpacts(first.news, THEMES, 10));
    expect(engine.consumeImpactsFor(first.tick + 2)).toBeUndefined();
  });

  it('연습: 팝업이 열리고, 확인한 틱 + 2틱에 반영', () => {
    const engine = new NewsEngine(era, createRng(1), config, 'practice');
    const first = engine.schedule[0]!;
    expect(engine.checkTrigger(first.tick)).toBe(first);
    expect(engine.isPopupOpen).toBe(true);
    expect(engine.consumeImpactsFor(first.tick + 2)).toBeUndefined(); // 확인 전에는 예약 없음
    engine.confirm(first.tick);
    expect(engine.isPopupOpen).toBe(false);
    expect(engine.consumeImpactsFor(first.tick + 1)).toBeUndefined();
    expect(engine.consumeImpactsFor(first.tick + 2)).toBeDefined();
  });

  it('팝업이 없는데 확인하면 오류', () => {
    const engine = new NewsEngine(era, createRng(1), config, 'practice');
    expect(() => engine.confirm(0)).toThrow();
  });
});
