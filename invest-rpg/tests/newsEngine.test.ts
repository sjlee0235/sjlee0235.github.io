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
  it('[시드 200개] 첫 뉴스는 정확히 7분(84틱), 간격 4~7분, 평균 약 21개', () => {
    let total = 0;
    for (const seed of SEEDS) {
      const slots = makeNewsSlots(rules, createRng(seed));
      expect(slots[0]).toBe(84);
      for (let i = 1; i < slots.length; i++) {
        const gap = slots[i]! - slots[i - 1]!;
        if (gap < 48 || gap > 84) throw new Error(`seed ${seed}: ${gap}`);
      }
      expect(slots.length).toBeLessThanOrEqual(30);
      total += slots.length;
    }
    expect(total / 200).toBeGreaterThan(20);
    expect(total / 200).toBeLessThan(23);
  });
});

describe('시대 시작 7분 유예와 첫 잠정 뉴스', () => {
  it('상수: 유예 420초, 첫 뉴스 420초, 첫 뉴스 종류 잠정', () => {
    expect(config.gracePeriodSeconds).toBe(420);
    expect(config.firstNewsAtSeconds).toBe(420);
    expect(config.firstNewsType).toBe('tentative');
    expect(rules.gracePeriodTicks).toBe(84);
  });

  it('[시드 200개] 420초 전 뉴스 0개, 첫 뉴스는 정확히 420초·잠정·opener, 그 결과 뉴스는 15분 안', () => {
    const openerIds = new Set(era.stories.filter((s) => s.opener).map((s) => s.id));
    const usedOpeners = new Set<string>();
    for (const seed of SEEDS) {
      const s = scheduleFor(seed);
      expect(s.filter((n) => n.tick < 84)).toEqual([]);
      const first = s[0]!;
      expect(first.tick).toBe(84);
      expect(first.kind).toBe('tentative');
      expect(openerIds.has(first.storyId!)).toBe(true);
      usedOpeners.add(first.storyId!);
      const outcome = s.find((n) => n.kind === 'outcome' && n.storyId === first.storyId)!;
      expect(outcome.tick - first.tick).toBeLessThanOrEqual(180);
    }
    // opener 여러 개 중 시드에 따라 다르게 고른다
    expect(usedOpeners.size).toBeGreaterThan(1);
  });

  it('opener 스토리가 하나도 쓸 수 없으면 추첨을 다시 한다 (추첨 조건)', () => {
    const noOpener = { ...era, stories: era.stories.map((s) => ({ ...s, opener: false })) };
    const d = drawEra(noOpener, 1, config);
    expect(d.ok).toBe(false);
    expect(d.warning).toMatch(/opener/);
    const ok = drawEra(era, 1, config);
    expect(ok.usableOpeners).toBeGreaterThanOrEqual(1);
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

  it('[시드 200개] 결과는 단서(leansTo)대로 약 65%, 아니면 35%', () => {
    let lean = 0;
    let total = 0;
    for (const seed of SEEDS) for (const n of scheduleFor(seed)) {
      if (n.kind !== 'outcome') continue;
      total++;
      if (n.followedLean) lean++;
    }
    expect(lean / total).toBeGreaterThan(0.6);
    expect(lean / total).toBeLessThan(0.7);
  });

  it('가중치 기본값: leansTo 65%, 다른 쪽 35%. 직접 주면 그 값', () => {
    const story = era.stories[0]!;
    expect(config.leansToChance).toBe(0.65);
    expect(outcomeWeights(story, 0.65)).toEqual([0.65, expect.closeTo(0.35, 10)]);
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
