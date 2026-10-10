import { describe, expect, it } from 'vitest';
import {
  getTickRules, INERTIA_PROBS, INERTIA_TICKS, makeConfig, MAX_TICK_MOVE, NEWS_BAND_PCT, NEWS_REACTION_TICKS,
  TICK_SECONDS, WINDOW_CAP, WINDOW_TICKS,
} from '../src/engine/config.ts';
import { PriceEngine, applyRate, reflect, reflectIntoWindow, type StockTickChange, type TickResult } from '../src/engine/priceEngine.ts';
import { createRng } from '../src/engine/rng.ts';
import { makeSpecEra } from './fixtures/makeEra.ts';

const config = makeConfig();
const rules = getTickRules(config);
const SEEDS = Array.from({ length: 150 }, (_, i) => i + 1);
const STOCKS = makeSpecEra().stocks.slice(0, 20);

function runTicks(seed: number, ticks: number, opts: { newsAt?: (t: number) => Map<string, number> | undefined; publishAt?: Set<number> } = {}) {
  const engine = new PriceEngine(STOCKS, createRng(seed), config);
  const results: TickResult[] = [];
  for (let t = 1; t <= ticks; t++) {
    results.push(engine.step(opts.newsAt?.(t)));
    if (opts.publishAt?.has(t)) engine.markNewsPublished();
  }
  return { engine, results };
}

function perStock(results: TickResult[]) {
  const map = new Map<string, StockTickChange[]>();
  for (const r of results) for (const ch of r.changes) {
    if (!map.has(ch.stockId)) map.set(ch.stockId, []);
    map.get(ch.stockId)!.push(ch);
  }
  return map;
}

describe('상수', () => {
  it('5초 틱, 틱당 ±1.5%, 1분=12틱 ±3%, 1틱 뒤 반영, 2틱 관성 50/25/25, 뉴스 사이 ±30%', () => {
    expect([TICK_SECONDS, MAX_TICK_MOVE, WINDOW_TICKS, WINDOW_CAP]).toEqual([5, 1.5, 12, 3.0]);
    expect([NEWS_REACTION_TICKS, INERTIA_TICKS, NEWS_BAND_PCT]).toEqual([1, 2, 30]);
    expect(INERTIA_PROBS).toEqual({ same: 50, opposite: 25, flat: 25 });
    expect(rules.ticksPerEra).toBe(1440);
    expect(rules.chartHistoryLength).toBe(240);
    expect(rules.reportDelayTicks).toBe(24);
  });

  it('틱 길이로 나누어떨어지지 않는 설정은 오류', () => {
    expect(() => getTickRules(makeConfig({ tickSeconds: 7 }))).toThrow();
  });
});

describe('가격 계산과 반사', () => {
  it('정수 반올림, 최소 1', () => {
    expect(applyRate(1000, 13, 1)).toBe(1013);
    expect(applyRate(150, 30, 1)).toBe(155);
    expect(applyRate(2, -300, 1)).toBe(1);
  });

  it('반사: 넘친 만큼 반대로', () => {
    expect(reflect(12, -15, 5)).toBe(-2);
    expect(reflectIntoWindow(12, 25, 15, 30)).toBe(-2);
    expect(reflectIntoWindow(-10, -28, 15, 30)).toBe(6);
    expect(reflect(7, -15, 15)).toBe(7);
  });
});

describe('뉴스 없는 구간', () => {
  it('[시드 150개] 1분(12틱) 누적 ±3% 이내, 틱당 ±1.5% 소수점 1자리, 가격 1 이상 정수', () => {
    for (const seed of SEEDS) {
      const { results } = runTicks(seed, rules.ticksPerEra);
      for (const [id, ticks] of perStock(results)) {
        for (let start = 0; start < ticks.length; start += 12) {
          const sum = ticks.slice(start, start + 12).reduce((a, t) => a + t.rate, 0);
          if (Math.abs(sum) > 30) throw new Error(`seed ${seed} ${id}: ${sum}`);
        }
        for (const t of ticks) {
          if (!Number.isInteger(t.rate) || Math.abs(t.rate) > 15 || !Number.isInteger(t.price) || t.price < 1) {
            throw new Error(`seed ${seed} ${id}: ${t.rate}/${t.price}`);
          }
        }
      }
    }
  });

  it('[시드 150개] 0.0% 틱은 5% 이하 (반사 효과)', () => {
    let zero = 0;
    let total = 0;
    for (const seed of SEEDS) for (const r of runTicks(seed, rules.ticksPerEra).results) for (const ch of r.changes) {
      total++;
      if (ch.rate === 0) zero++;
    }
    expect(zero / total).toBeLessThanOrEqual(0.05);
  });

  it('같은 시드면 같은 가격', () => {
    expect(runTicks(7, 200).results).toEqual(runTicks(7, 200).results);
    expect(runTicks(8, 200).results).not.toEqual(runTicks(7, 200).results);
  });
});

describe('뉴스 반영과 관성', () => {
  const theme0 = STOCKS[0]!.themeId;
  const theme1 = STOCKS[1]!.themeId;

  it('반영 틱에 변동률 그대로, 다음 2틱 관성, 그 뒤 일반', () => {
    const { results } = runTicks(1, 8, { newsAt: (t) => (t === 2 ? new Map([[theme0, 120]]) : undefined), publishAt: new Set([1]) });
    const s0 = perStock(results).get(STOCKS[0]!.id)!;
    expect(s0.map((c) => c.cause)).toEqual(['random', 'news', 'inertia', 'inertia', 'random', 'random', 'random', 'random']);
    expect(s0[1]!.rate).toBe(120);
    expect(perStock(results).get(STOCKS[2]!.id)!.every((c) => c.cause === 'random')).toBe(true);
  });

  it('[대량 표본] 관성: 같은 방향 50% / 반대 25% / 변동 없음 25%, 크기 0.1~1.5%', () => {
    const count = { same: 0, opposite: 0, flat: 0 };
    for (const seed of SEEDS) {
      const all = new Map(STOCKS.map((s, i) => [s.themeId, i % 2 ? 60 : -60]));
      const { results } = runTicks(seed, 40, { newsAt: (t) => (t === 2 || t === 20 ? all : undefined), publishAt: new Set([1, 19]) });
      for (const r of results) for (const ch of r.changes) {
        if (!ch.inertia) continue;
        count[ch.inertia]++;
        if (ch.inertia === 'flat') expect(ch.rate).toBe(0);
        else expect(Math.abs(ch.rate)).toBeGreaterThanOrEqual(1);
        expect(Math.abs(ch.rate)).toBeLessThanOrEqual(15);
      }
    }
    const total = count.same + count.opposite + count.flat;
    expect(total).toBe(150 * 20 * 2 * 2);
    expect(count.same / total).toBeGreaterThan(0.48);
    expect(count.same / total).toBeLessThan(0.52);
    expect(count.opposite / total).toBeGreaterThan(0.23);
    expect(count.opposite / total).toBeLessThan(0.27);
  });

  it('관성 방향: 상승 반영이면 같은 방향=상승, 하락 반영이면 같은 방향=하락', () => {
    for (const seed of SEEDS) {
      const { results } = runTicks(seed, 5, { newsAt: (t) => (t === 1 ? new Map([[theme0, 60], [theme1, -60]]) : undefined), publishAt: new Set([0]) });
      const map = perStock(results);
      for (const [id, dir] of [[STOCKS[0]!.id, 1], [STOCKS[1]!.id, -1]] as const) {
        for (const ch of map.get(id)!) {
          if (ch.inertia === 'same') expect(Math.sign(ch.rate)).toBe(dir);
          if (ch.inertia === 'opposite') expect(Math.sign(ch.rate)).toBe(-dir);
        }
      }
    }
  });
});

describe('뉴스 사이 ±30% 한도', () => {
  it('뉴스 반영은 남은 한도까지만 적용 (실제 적용값 기록)', () => {
    const engine = new PriceEngine(STOCKS, createRng(1), config);
    engine.markNewsPublished(); // P0 = 1000 → [700, 1300]
    const r1 = engine.step(new Map([[STOCKS[0]!.themeId, 250]]));
    const c1 = r1.changes[0]!;
    expect(c1.price).toBe(1250);
    for (let i = 0; i < 30; i++) engine.step(); // 관성·일반 변동
    const before = engine.getPrice(STOCKS[0]!.id);
    const r2 = engine.step(new Map([[STOCKS[0]!.themeId, 250]]));
    const c2 = r2.changes[0]!;
    expect(c2.requestedRate).toBe(250);
    expect(c2.price).toBeLessThanOrEqual(1300);
    expect(c2.rate).toBeLessThan(250);
    expect(c2.rate).toBe(Math.floor(((1300 - before) * 1000) / before));
  });

  it('[시드 150개] 뉴스 구간 중 가격이 [0.7×P0, 1.3×P0]를 벗어나지 않는다 (반영·관성·일반 변동 포함)', () => {
    for (const seed of SEEDS) {
      const publish = new Set([1, 60, 120, 200, 300]);
      const rng = createRng(seed + 999);
      const newsAt = (t: number) => (publish.has(t - 1)
        ? new Map(STOCKS.map((s) => [s.themeId, rng.int(-300, 300)]))
        : undefined);
      const engine = new PriceEngine(STOCKS, createRng(seed), config);
      let base = new Map(STOCKS.map((s) => [s.id, 1000]));
      for (let t = 1; t <= 400; t++) {
        const r = engine.step(newsAt(t));
        for (const ch of r.changes) {
          const p0 = base.get(ch.stockId)!;
          if (ch.price < Math.ceil(p0 * 0.7) || ch.price > Math.floor(p0 * 1.3)) {
            throw new Error(`seed ${seed} t${t} ${ch.stockId}: ${ch.price} (P0 ${p0})`);
          }
        }
        if (publish.has(t)) {
          engine.markNewsPublished();
          base = engine.getPrices();
        }
      }
    }
  });
});

describe('차트', () => {
  it('최근 240개(20분)', () => {
    const { engine } = runTicks(1, 500);
    expect(engine.getHistory(STOCKS[0]!.id)).toHaveLength(240);
  });
});

