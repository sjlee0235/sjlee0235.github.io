import { describe, expect, it } from 'vitest';
import { getTickRules, makeConfig, rateToPercent } from '../src/engine/config.ts';
import { PriceEngine, applyRate, type StockTickChange, type TickResult } from '../src/engine/priceEngine.ts';
import { createRng } from '../src/engine/rng.ts';
import { makeEra } from './fixtures/makeEra.ts';

const config = makeConfig();
const rules = getTickRules(config);
const SEEDS = Array.from({ length: 150 }, (_, i) => i + 1);

function runTicks(seed: number, ticks: number, impactsAt?: (tick: number) => Map<string, number> | undefined) {
  const era = makeEra();
  const engine = new PriceEngine(era.stocks, createRng(seed), config);
  const results: TickResult[] = [];
  for (let t = 1; t <= ticks; t++) results.push(engine.step(impactsAt?.(t)));
  return { era, engine, results };
}

/** 종목별 [틱 결과] 배열로 바꾼다 */
function perStock(results: TickResult[]) {
  const map = new Map<string, StockTickChange[]>();
  for (const r of results) {
    for (const ch of r.changes) {
      if (!map.has(ch.stockId)) map.set(ch.stockId, []);
      map.get(ch.stockId)!.push(ch);
    }
  }
  return map;
}

/**
 * 1분 윈도우 규칙을 테스트 쪽에서 직접 재구성해 검사한다.
 * 윈도우는 1틱부터 windowTicks씩, 뉴스 반영 틱이 오면 그다음 틱부터 새로 시작.
 * 뉴스 반영 틱 자체의 변동은 어느 윈도우에도 포함되지 않는다.
 */
function assertWindows(ticks: StockTickChange[], label: string) {
  let sum = 0;
  let elapsed = 0;
  ticks.forEach((t, i) => {
    if (t.cause === 'news') {
      sum = 0;
      elapsed = 0;
      return;
    }
    if (elapsed === rules.windowTicks) {
      sum = 0;
      elapsed = 0;
    }
    sum += t.rate;
    elapsed++;
    if (Math.abs(sum) > config.windowMaxRate) throw new Error(`${label} 틱 ${i + 1}: 윈도우 합 ${rateToPercent(sum)}%`);
  });
}

describe('시간 규칙 (5초 틱)', () => {
  it('1틱 5초 → 시대 1440틱(2시간), 1분 윈도우 12틱, 차트 240개(20분), 관성 4틱(20초), 반영 지연 2틱(10초)', () => {
    expect(rules.ticksPerEra).toBe(1440);
    expect(rules.windowTicks).toBe(12);
    expect(rules.chartHistoryLength).toBe(240);
    expect(rules.momentumTicks).toBe(4);
    expect(rules.newsDelayTicks).toBe(2);
  });

  it('틱 길이로 나누어떨어지지 않는 설정은 오류', () => {
    expect(() => getTickRules(makeConfig({ tickSeconds: 7 }))).toThrow();
  });

  it('틱을 10초로 바꾸면 틱 수가 자동으로 맞춰진다', () => {
    const r = getTickRules(makeConfig({ tickSeconds: 10 }));
    expect(r.ticksPerEra).toBe(720);
    expect(r.windowTicks).toBe(6);
  });
});

describe('가격 계산 (applyRate)', () => {
  it('정수로 반올림하고 최소 1', () => {
    expect(applyRate(1000, 13, 1)).toBe(1013); // +1.3%
    expect(applyRate(1000, -2, 1)).toBe(998); // -0.2%
    expect(applyRate(1005, 5, 1)).toBe(1010); // 1010.025 → 1010
    expect(applyRate(150, 30, 1)).toBe(155); // 154.5 → 155 (0.5는 올림)
    expect(applyRate(1, -30, 1)).toBe(1);
    expect(applyRate(2, -300, 1)).toBe(1); // 1.4 → 1
  });
});

describe('주가 엔진 — 뉴스 없는 구간', () => {
  it('[시드 150개] 어떤 종목이든 1분(12틱) 윈도우 누적 변동률이 ±3%를 넘지 않는다', () => {
    for (const seed of SEEDS) {
      const { results } = runTicks(seed, rules.ticksPerEra);
      for (const [stockId, ticks] of perStock(results)) {
        for (let start = 0; start < ticks.length; start += rules.windowTicks) {
          const sum = ticks.slice(start, start + rules.windowTicks).reduce((a, t) => a + t.rate, 0);
          if (Math.abs(sum) > config.windowMaxRate) {
            throw new Error(`seed ${seed} ${stockId} 윈도우 ${start}: 합 ${rateToPercent(sum)}%`);
          }
        }
      }
    }
  });

  it('[시드 150개] 모든 틱 변동률은 -3.0%~+3.0%이고 소수점 첫째 자리까지다', () => {
    for (const seed of SEEDS) {
      const { results } = runTicks(seed, rules.ticksPerEra);
      for (const r of results) {
        for (const ch of r.changes) {
          const pct = rateToPercent(ch.rate);
          const ok =
            Number.isInteger(ch.rate) && Math.abs(ch.rate) <= config.tickMaxRate && Math.round(pct * 10) / 10 === pct;
          if (!ok) throw new Error(`seed ${seed} tick ${r.tick} ${ch.stockId}: 변동률 ${pct}%`);
        }
      }
    }
  });

  it('[시드 150개] 가격은 항상 1 이상의 정수다', () => {
    for (const seed of SEEDS) {
      const { results } = runTicks(seed, rules.ticksPerEra);
      for (const r of results) {
        for (const ch of r.changes) {
          if (!Number.isInteger(ch.price) || ch.price < 1) {
            throw new Error(`seed ${seed} tick ${r.tick} ${ch.stockId}: 가격 ${ch.price}`);
          }
        }
      }
    }
  });

  it('변동이 실제로 일어나고 상승·하락이 모두 나온다', () => {
    const { results } = runTicks(1, 60);
    const rates = results.flatMap((r) => r.changes.map((c) => c.rate));
    expect(rates.some((r) => r > 0)).toBe(true);
    expect(rates.some((r) => r < 0)).toBe(true);
  });

  it('같은 시드면 같은 가격 흐름', () => {
    const a = runTicks(77, 200).results;
    expect(runTicks(77, 200).results).toEqual(a);
    expect(runTicks(78, 200).results).not.toEqual(a);
  });
});

describe('주가 엔진 — 뉴스 반영 틱', () => {
  it('영향받는 종목은 정확히 영향도×3%, 나머지는 평소 규칙(랜덤)', () => {
    const impacts = new Map([['t0', 7], ['t5', -6]]);
    const { era, results } = runTicks(3, 10, (t) => (t === 4 ? impacts : undefined));
    for (const ch of results[3]!.changes) {
      const theme = era.stocks.find((s) => s.id === ch.stockId)!.themeId;
      if (theme === 't0') {
        expect(ch.cause).toBe('news');
        expect(ch.rate).toBe(210); // +21.0%
        expect(ch.price).toBe(applyRate(ch.prevPrice, 210, 1));
      } else if (theme === 't5') {
        expect(ch.cause).toBe('news');
        expect(ch.rate).toBe(-180); // -18.0%
      } else {
        expect(ch.cause).toBe('random');
        expect(Math.abs(ch.rate)).toBeLessThanOrEqual(30);
      }
    }
  });

  it('영향도 ±10 → ±30%, 범위를 넘는 값은 ±10으로 잘린다', () => {
    const { results } = runTicks(5, 1, () => new Map([['t0', 10], ['t1', -10], ['t2', 15]]));
    const byStock = perStock(results);
    expect(byStock.get('test-s0')![0]!.price).toBe(1300);
    expect(byStock.get('test-s1')![0]!.price).toBe(700);
    expect(byStock.get('test-s2')![0]!.rate).toBe(300);
  });

  it('[시드 50개] 뉴스·관성이 섞여도 1분 윈도우 한도를 지킨다 (뉴스 틱 다음부터 새 윈도우)', () => {
    for (const seed of SEEDS.slice(0, 50)) {
      const newsTicks = new Set([3, 40, 41, 100, 150]);
      const { results } = runTicks(seed, 240, (t) => (newsTicks.has(t) ? new Map([['t0', 4], ['t1', -6]]) : undefined));
      const map = perStock(results);
      assertWindows(map.get('test-s0')!, `seed ${seed} s0`);
      assertWindows(map.get('test-s1')!, `seed ${seed} s1`);
    }
  });

  it('악재가 반복돼도 가격은 1 아래로 내려가지 않는다', () => {
    const { results } = runTicks(9, 40, () => new Map([['t0', -10]]));
    const prices = perStock(results).get('test-s0')!.map((t) => t.price);
    expect(prices.at(-1)).toBe(1);
    expect(Math.min(...prices)).toBe(1);
  });
});

describe('주가 엔진 — 뉴스 후 관성 (20초 = 4틱)', () => {
  it('뉴스 반영 다음 4틱은 관성, 5틱째부터 다시 평소 랜덤', () => {
    const { results } = runTicks(1, 12, (t) => (t === 2 ? new Map([['t0', 5]]) : undefined));
    const causes = perStock(results).get('test-s0')!.map((c) => c.cause);
    expect(causes).toEqual([
      'random', 'news', 'momentum', 'momentum', 'momentum', 'momentum',
      'random', 'random', 'random', 'random', 'random', 'random',
    ]);
    // 영향 없는 종목은 계속 랜덤
    expect(perStock(results).get('test-s3')!.every((c) => c.cause === 'random')).toBe(true);
  });

  it('[대량 표본] 유지 60% / 반대 20% / 정지 20% 확률로 뽑힌다', () => {
    const count = { keep: 0, reverse: 0, flat: 0 };
    for (const seed of SEEDS) {
      const all = new Map(Array.from({ length: 20 }, (_, i) => [`t${i}`, i % 2 ? 4 : -4]));
      const { results } = runTicks(seed, 30, (t) => (t === 1 || t === 15 ? all : undefined));
      for (const r of results) for (const ch of r.changes) if (ch.momentum) count[ch.momentum]++;
    }
    const total = count.keep + count.reverse + count.flat;
    expect(total).toBe(150 * 20 * 2 * 4);
    expect(count.keep / total).toBeGreaterThan(0.58);
    expect(count.keep / total).toBeLessThan(0.62);
    expect(count.reverse / total).toBeGreaterThan(0.18);
    expect(count.reverse / total).toBeLessThan(0.22);
    expect(count.flat / total).toBeGreaterThan(0.18);
    expect(count.flat / total).toBeLessThan(0.22);
  });

  it('유지는 뉴스와 같은 방향, 반대는 반대 방향, 정지는 0% (한도에 걸리면 0%까지만)', () => {
    for (const seed of SEEDS) {
      const impacts = new Map([['t0', 6], ['t1', -6]]);
      const { results } = runTicks(seed, 10, (t) => (t === 1 ? impacts : undefined));
      const map = perStock(results);
      for (const [stockId, dir] of [['test-s0', 1], ['test-s1', -1]] as const) {
        for (const ch of map.get(stockId)!) {
          if (!ch.momentum) continue;
          const sign = Math.sign(ch.rate);
          if (ch.momentum === 'flat') expect(ch.rate).toBe(0);
          if (ch.momentum === 'keep') expect([dir, 0]).toContain(sign);
          if (ch.momentum === 'reverse') expect([-dir, 0]).toContain(sign);
        }
      }
    }
  });
});

describe('주가 엔진 — 차트 이력', () => {
  it('시대 초반에는 있는 만큼만 (시작가 포함)', () => {
    const { engine } = runTicks(1, 5);
    const h = engine.getHistory('test-s0');
    expect(h).toHaveLength(6);
    expect(h[0]).toEqual({ tick: 0, price: 1000 });
  });

  it('최근 240개(20분)까지만 보관한다', () => {
    const { engine } = runTicks(1, 500);
    const h = engine.getHistory('test-s0');
    expect(h).toHaveLength(240);
    expect(h[0]!.tick).toBe(261);
    expect(h.at(-1)!.tick).toBe(500);
    expect(h.at(-1)!.price).toBe(engine.getPrice('test-s0'));
  });

  it('돌려받은 이력을 수정해도 엔진 내부는 안 바뀐다', () => {
    const { engine } = runTicks(1, 3);
    engine.getHistory('test-s0')[0]!.price = 5;
    expect(engine.getHistory('test-s0')[0]!.price).toBe(1000);
  });
});
