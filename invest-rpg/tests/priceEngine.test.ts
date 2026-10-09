import { describe, expect, it } from 'vitest';
import { makeConfig, rateToPercent } from '../src/engine/config.ts';
import { PriceEngine, applyRate, type TickResult } from '../src/engine/priceEngine.ts';
import { createRng } from '../src/engine/rng.ts';
import { makeEra } from './fixtures/makeEra.ts';

const config = makeConfig();
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
  const map = new Map<string, { rate: number; cause: string; price: number }[]>();
  for (const r of results) {
    for (const ch of r.changes) {
      if (!map.has(ch.stockId)) map.set(ch.stockId, []);
      map.get(ch.stockId)!.push({ rate: ch.rate, cause: ch.cause, price: ch.price });
    }
  }
  return map;
}

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
  it('[시드 150개] 어떤 종목이든 1분(6틱) 윈도우 누적 변동률이 ±3%를 넘지 않는다', () => {
    for (const seed of SEEDS) {
      const { results } = runTicks(seed, config.ticksPerEra);
      for (const [stockId, ticks] of perStock(results)) {
        for (let start = 0; start < ticks.length; start += config.windowTicks) {
          const sum = ticks.slice(start, start + config.windowTicks).reduce((a, t) => a + t.rate, 0);
          if (Math.abs(sum) > config.windowMaxRate) {
            throw new Error(`seed ${seed} ${stockId} 윈도우 ${start}: 합 ${rateToPercent(sum)}%`);
          }
        }
      }
    }
  });

  it('[시드 150개] 모든 틱 변동률은 -3.0%~+3.0%이고 소수점 첫째 자리까지다', () => {
    for (const seed of SEEDS) {
      const { results } = runTicks(seed, config.ticksPerEra);
      for (const r of results) {
        for (const ch of r.changes) {
          const pct = rateToPercent(ch.rate);
          const ok =
            Number.isInteger(ch.rate) &&
            Math.abs(ch.rate) <= config.tickMaxRate &&
            Math.round(pct * 10) / 10 === pct;
          if (!ok) throw new Error(`seed ${seed} tick ${r.tick} ${ch.stockId}: 변동률 ${pct}%`);
        }
      }
    }
  });

  it('[시드 150개] 가격은 항상 1 이상의 정수다', () => {
    for (const seed of SEEDS) {
      const { results } = runTicks(seed, config.ticksPerEra);
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
    const b = runTicks(77, 200).results;
    expect(a).toEqual(b);
    const c = runTicks(78, 200).results;
    expect(c).not.toEqual(a);
  });
});

describe('주가 엔진 — 뉴스 반영 틱', () => {
  it('영향받는 종목은 정확히 영향도×3%, 나머지는 평소 규칙(랜덤)', () => {
    const impacts = new Map([['t0', 7], ['t5', -6]]);
    const { era, results } = runTicks(3, 10, (t) => (t === 4 ? impacts : undefined));
    const tick4 = results[3]!;
    for (const ch of tick4.changes) {
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
    expect(byStock.get('test-s0')![0]!.rate).toBe(300);
    expect(byStock.get('test-s0')![0]!.price).toBe(1300);
    expect(byStock.get('test-s1')![0]!.price).toBe(700);
    expect(byStock.get('test-s2')![0]!.rate).toBe(300);
  });

  it('뉴스 받은 종목은 그 틱에 윈도우가 리셋되고 다음 틱부터 새 6틱 윈도우가 시작된다', () => {
    for (const seed of SEEDS.slice(0, 50)) {
      // 3틱, 40틱, 41틱에 테마 t0 뉴스 (연속 뉴스 포함)
      const newsTicks = new Set([3, 40, 41]);
      const { results } = runTicks(seed, 120, (t) => (newsTicks.has(t) ? new Map([['t0', 4]]) : undefined));
      const ticks = perStock(results).get('test-s0')!;
      // 윈도우를 직접 재구성: 1틱부터 시작, 뉴스 틱 다음에 새로 시작
      let sum = 0;
      let elapsed = 0;
      ticks.forEach((t, i) => {
        if (newsTicks.has(i + 1)) {
          expect(t.cause).toBe('news');
          sum = 0;
          elapsed = 0;
          return;
        }
        if (elapsed === config.windowTicks) {
          sum = 0;
          elapsed = 0;
        }
        sum += t.rate;
        elapsed++;
        if (Math.abs(sum) > config.windowMaxRate) throw new Error(`seed ${seed} 틱 ${i + 1}: 합 ${sum}`);
      });
    }
  });

  it('악재가 반복돼도 가격은 1 아래로 내려가지 않는다', () => {
    const { results } = runTicks(9, 40, () => new Map([['t0', -10]]));
    const prices = perStock(results).get('test-s0')!.map((t) => t.price);
    expect(prices.at(-1)).toBe(1);
    expect(Math.min(...prices)).toBe(1);
  });
});

describe('주가 엔진 — 차트 이력', () => {
  it('시대 초반에는 있는 만큼만 (시작가 포함)', () => {
    const { engine } = runTicks(1, 5);
    const h = engine.getHistory('test-s0');
    expect(h).toHaveLength(6);
    expect(h[0]).toEqual({ tick: 0, price: 1000 });
    expect(h.map((p) => p.tick)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('최근 120개(20분)까지만 보관한다', () => {
    const { engine } = runTicks(1, 300);
    const h = engine.getHistory('test-s0');
    expect(h).toHaveLength(120);
    expect(h[0]!.tick).toBe(181);
    expect(h.at(-1)!.tick).toBe(300);
    expect(h.at(-1)!.price).toBe(engine.getPrice('test-s0'));
  });

  it('돌려받은 이력을 수정해도 엔진 내부는 안 바뀐다', () => {
    const { engine } = runTicks(1, 3);
    engine.getHistory('test-s0')[0]!.price = 5;
    expect(engine.getHistory('test-s0')[0]!.price).toBe(1000);
  });
});
