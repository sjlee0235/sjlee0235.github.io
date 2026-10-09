import { describe, expect, it } from 'vitest';
import { getTickRules, makeConfig } from '../src/engine/config.ts';
import { applyDraw, drawEra } from '../src/engine/eraDraw.ts';
import { NewsEngine, buildNewsSchedule, makeNewsSlots, newsToRates, outcomeWeights } from '../src/engine/newsEngine.ts';
import { createRng } from '../src/engine/rng.ts';
import { effect, makeNews, makeSpecEra } from './fixtures/makeEra.ts';

const config = makeConfig();
const rules = getTickRules(config);
const era = makeSpecEra();
const SEEDS = Array.from({ length: 200 }, (_, i) => i + 1);
const activeFor = (seed: number) => applyDraw(era, drawEra(era, seed, config), config);
const scheduleFor = (seed: number, cfg = config) => buildNewsSchedule(activeFor(seed), createRng(seed), cfg);

describe('뉴스 슬롯', () => {
  it('[시드 200개] 첫 뉴스 1~3분, 간격 4~7분, 최대 30슬롯, 평균 약 22개', () => {
    let total = 0;
    for (const seed of SEEDS) {
      const slots = makeNewsSlots(rules, createRng(seed));
      expect(slots[0]).toBeGreaterThanOrEqual(12);
      expect(slots[0]).toBeLessThanOrEqual(36);
      for (let i = 1; i < slots.length; i++) {
        const gap = slots[i]! - slots[i - 1]!;
        if (gap < 48 || gap > 84) throw new Error(`seed ${seed}: ${gap}`);
      }
      expect(slots.length).toBeLessThanOrEqual(30);
      total += slots.length;
    }
    expect(total / 200).toBeGreaterThan(20);
    expect(total / 200).toBeLessThan(24);
  });
});

describe('스토리 규칙', () => {
  it('[시드 200개] 결과는 잠정 후 15분 안의 슬롯, 간격 4~7분 유지, 동시 1개, 종료 15분 전 새 잠정 없음', () => {
    for (const seed of SEEDS) {
      const s = scheduleFor(seed);
      let open: string | null = null;
      let openTick = 0;
      for (let i = 0; i < s.length; i++) {
        const n = s[i]!;
        if (i > 0) {
          const gap = n.tick - s[i - 1]!.tick;
          if (gap < 48 || gap > 84) throw new Error(`seed ${seed}: 간격 ${gap}`);
        }
        if (n.kind === 'tentative') {
          expect(open, `seed ${seed}`).toBeNull();
          expect(n.tick).toBeLessThanOrEqual(rules.ticksPerEra - 180);
          open = n.storyId!;
          openTick = n.tick;
        } else if (n.kind === 'outcome') {
          expect(n.storyId).toBe(open);
          expect(n.tick - openTick).toBeLessThanOrEqual(180);
          expect(n.relatedTentativeId).toBeDefined();
          open = null;
        }
      }
      expect(open).toBeNull();
    }
  });

  it('[시드 200개] 슬롯 기준 속보 비율 평균 28~40%', () => {
    let breaking = 0;
    let total = 0;
    for (const seed of SEEDS) {
      const s = scheduleFor(seed);
      total += s.length;
      breaking += s.filter((n) => n.kind === 'breaking').length;
    }
    expect(breaking / total).toBeGreaterThanOrEqual(0.28);
    expect(breaking / total).toBeLessThanOrEqual(0.4);
  });

  it('[시드 200개] 결과는 단서(leansTo)대로 약 70%, 아니면 30%', () => {
    let lean = 0;
    let total = 0;
    for (const seed of SEEDS) for (const n of scheduleFor(seed)) {
      if (n.kind !== 'outcome') continue;
      total++;
      if (n.followedLean) lean++;
    }
    expect(lean / total).toBeGreaterThan(0.65);
    expect(lean / total).toBeLessThan(0.75);
  });

  it('가중치 기본값: leansTo 70%, 다른 쪽 30%. 직접 주면 그 값', () => {
    const story = era.stories[0]!;
    expect(config.leansToChance).toBe(0.7);
    expect(outcomeWeights(story, 0.7)).toEqual([0.7, expect.closeTo(0.3, 10)]);
    expect(outcomeWeights({ ...story, outcomes: story.outcomes.map((o, i) => ({ ...o, weight: i ? 1 : 3 })) }, 0.6)).toEqual([3, 1]);
  });

  it('잠정 magnitude 1~3, 결과 7~9', () => {
    for (const s of era.stories) {
      expect(s.tentative.magnitude).toBeGreaterThanOrEqual(1);
      expect(s.tentative.magnitude).toBeLessThanOrEqual(3);
      for (const n of s.news) {
        expect(n.magnitude).toBeGreaterThanOrEqual(7);
        expect(n.magnitude).toBeLessThanOrEqual(9);
      }
    }
  });
});

describe('풀 고갈과 중복', () => {
  it('[시드 200개] 같은 뉴스가 다시 나오지 않는다', () => {
    for (const seed of SEEDS) {
      const ids = scheduleFor(seed).map((n) => n.news.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('뉴스가 바닥나면 더 내보내지 않는다', () => {
    const small = makeSpecEra({ id: 'small', breakingCount: 2, storyCount: 1 });
    const active = applyDraw(small, { ...drawEra(small, 1, config), activeThemeIds: small.themes.map((t) => t.id) }, config);
    const s = buildNewsSchedule(active, createRng(1), config);
    expect(s.length).toBeLessThanOrEqual(4); // 속보 2 + 잠정 1 + 결과 1
    expect(new Set(s.map((n) => n.news.id)).size).toBe(s.length);
  });

  it('같은 시드면 같은 일정', () => {
    expect(scheduleFor(5)).toEqual(scheduleFor(5));
    expect(scheduleFor(6)).not.toEqual(scheduleFor(5));
  });
});

describe('반영 배율', () => {
  it('[대량 표본] 강도 3은 0.6~1.4, 강도 2·1은 0.4~1.6, ±30%에서 자름', () => {
    const news = makeNews('x', 'breaking', 5, [effect('a', 5, 3), effect('b', -5, 2), effect('c', 10, 3)]);
    const rng = createRng(9);
    const s: number[] = [];
    const w: number[] = [];
    for (let i = 0; i < 5000; i++) {
      const r = newsToRates(news, config, rng);
      s.push(r.strong.get('a')! / 150);
      w.push(r.weak.get('b')! / -150);
      expect(Math.abs(r.strong.get('c')!)).toBeLessThanOrEqual(300);
    }
    expect(Math.min(...s)).toBeGreaterThanOrEqual(0.6 - 0.004);
    expect(Math.max(...s)).toBeLessThanOrEqual(1.4 + 0.004);
    expect(Math.min(...w)).toBeGreaterThanOrEqual(0.4 - 0.004);
    expect(Math.max(...w)).toBeLessThanOrEqual(1.6 + 0.004);
    expect(Math.min(...s)).toBeLessThan(0.65);
    expect(Math.max(...w)).toBeGreaterThan(1.55);
  });
});

describe('NewsEngine 반영 시점', () => {
  const active = activeFor(1);
  it('발표 틱 + 1틱에 반영', () => {
    const engine = new NewsEngine(active, createRng(1), createRng(2), config);
    const first = engine.schedule[0]!;
    expect(engine.checkTrigger(first.tick)).toBe(first);
    expect(engine.consumeRatesFor(first.tick)).toEqual([]);
    const due = engine.consumeRatesFor(first.tick + 1);
    expect(due).toHaveLength(1);
    expect(due[0]!.newsId).toBe(first.news.id);
  });

  it('(옵션) 간접 영향 추가 지연: 강도 2·1은 N틱 더 늦게', () => {
    const cfg = makeConfig({ indirectExtraDelayTicks: 2 });
    const engine = new NewsEngine(active, createRng(1), createRng(2), cfg);
    const first = engine.schedule[0]!;
    engine.checkTrigger(first.tick);
    const now = engine.consumeRatesFor(first.tick + 1)[0]!;
    const later = engine.consumeRatesFor(first.tick + 3)[0]!;
    const strongThemes = first.news.effects.filter((e) => e.link.strength === 3).map((e) => e.themeId);
    expect([...now.rates.keys()].every((k) => strongThemes.includes(k))).toBe(true);
    expect([...later.rates.keys()].every((k) => !strongThemes.includes(k))).toBe(true);
  });
});
