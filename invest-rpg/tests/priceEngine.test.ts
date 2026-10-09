import { describe, expect, it } from 'vitest';
import {
  getTickRules,
  makeConfig,
  MAX_TICK_MOVE,
  rateToPercent,
  TICK_SECONDS,
  WINDOW_CAP,
  WINDOW_TICKS,
} from '../src/engine/config.ts';
import { PriceEngine, applyRate, reflectIntoWindow, type StockTickChange, type TickResult } from '../src/engine/priceEngine.ts';
import { createRng } from '../src/engine/rng.ts';
import { makeEra } from './fixtures/makeEra.ts';

const config = makeConfig();
const rules = getTickRules(config);
const SEEDS = Array.from({ length: 150 }, (_, i) => i + 1);

function runTicks(seed: number, ticks: number, ratesAt?: (tick: number) => Map<string, number> | undefined) {
  const era = makeEra();
  const engine = new PriceEngine(era.stocks, createRng(seed), config);
  const results: TickResult[] = [];
  for (let t = 1; t <= ticks; t++) results.push(engine.step(ratesAt?.(t)));
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
 * - 윈도우는 1틱부터 12틱씩. 뉴스 반영 틱과 관성 틱은 윈도우에서 제외.
 * - 뉴스 틱에서 리셋, 관성이 끝난 뒤에도 리셋 → 관성 다음 랜덤 틱부터 새 윈도우.
 */
function assertWindows(ticks: StockTickChange[], label: string) {
  let sum = 0;
  let elapsed = 0;
  ticks.forEach((t, i) => {
    if (t.cause !== 'random') {
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

describe('시간·가격 상수', () => {
  it('상수: 5초 틱, 틱당 ±1.5%, 1분=12틱, 1분 한도 ±3%', () => {
    expect([TICK_SECONDS, MAX_TICK_MOVE, WINDOW_TICKS, WINDOW_CAP]).toEqual([5, 1.5, 12, 3.0]);
    expect(config.tickMaxRate).toBe(15);
    expect(config.windowMaxRate).toBe(30);
  });

  it('상수에서 계산: 실전 시대 1440틱(2시간), 연습 판 360틱(30분), 차트 240개(20분), 관성 4틱, 반영 지연 2틱', () => {
    expect(rules.ticksPerEra).toBe(1440);
    expect(getTickRules(config, 'practice').ticksPerEra).toBe(360);
    expect(rules.windowTicks).toBe(12);
    expect(rules.chartHistoryLength).toBe(240);
    expect(rules.momentumTicks).toBe(4);
    expect(rules.newsDelayTicks).toBe(2);
  });

  it('틱 길이로 나누어떨어지지 않는 설정, 일반 틱 범위를 벗어난 관성 크기는 오류', () => {
    expect(() => getTickRules(makeConfig({ tickSeconds: 7 }))).toThrow();
    expect(() => getTickRules(makeConfig({ momentumRate: [1, 20] }))).toThrow();
  });
});

describe('가격 계산', () => {
  it('정수로 반올림하고 최소 1', () => {
    expect(applyRate(1000, 13, 1)).toBe(1013);
    expect(applyRate(1005, 5, 1)).toBe(1010);
    expect(applyRate(150, 30, 1)).toBe(155); // 154.5 → 155
    expect(applyRate(2, -300, 1)).toBe(1);
  });

  it('반사: 한도를 넘친 만큼 반대로 튕긴다', () => {
    // 남은 위쪽 한도 +0.5%(합 2.5%)에서 +1.2% → 0.5 - 0.7 = -0.2%
    expect(reflectIntoWindow(12, 25, 15, 30)).toBe(-2);
    // 아래쪽: 합 -2.8%에서 -1.0% → 남은 -0.2%, 넘친 0.8% → +0.6%
    expect(reflectIntoWindow(-10, -28, 15, 30)).toBe(6);
    // 한도 안이면 그대로
    expect(reflectIntoWindow(7, 10, 15, 30)).toBe(7);
    // 한도에 딱 닿은 상태에서 같은 방향 → 반대로
    expect(reflectIntoWindow(15, 30, 15, 30)).toBe(-15);
  });
});

describe('주가 엔진 — 뉴스 없는 구간', () => {
  it('[시드 150개] 1분(12틱) 윈도우 누적 변동률이 ±3%를 넘지 않는다', () => {
    for (const seed of SEEDS) {
      const { results } = runTicks(seed, rules.ticksPerEra);
      for (const [stockId, ticks] of perStock(results)) {
        for (let start = 0; start < ticks.length; start += rules.windowTicks) {
          const sum = ticks.slice(start, start + rules.windowTicks).reduce((a, t) => a + t.rate, 0);
          if (Math.abs(sum) > config.windowMaxRate) throw new Error(`seed ${seed} ${stockId} ${start}: ${sum}`);
        }
      }
    }
  });

  it('[시드 150개] 0.0% 틱은 전체의 5% 이하 (반사 처리 효과)', () => {
    let zero = 0;
    let total = 0;
    for (const seed of SEEDS) {
      for (const r of runTicks(seed, rules.ticksPerEra).results) {
        for (const ch of r.changes) {
          total++;
          if (ch.rate === 0) zero++;
        }
      }
    }
    expect(zero / total).toBeLessThanOrEqual(0.05);
  });

  it('[시드 150개] 모든 틱 변동률은 -1.5%~+1.5%이고 소수점 첫째 자리까지, 가격은 1 이상 정수', () => {
    for (const seed of SEEDS) {
      for (const r of runTicks(seed, rules.ticksPerEra).results) {
        for (const ch of r.changes) {
          const pct = rateToPercent(ch.rate);
          const ok =
            Number.isInteger(ch.rate) &&
            Math.abs(ch.rate) <= 15 &&
            Math.round(pct * 10) / 10 === pct &&
            Number.isInteger(ch.price) &&
            ch.price >= 1;
          if (!ok) throw new Error(`seed ${seed} tick ${r.tick} ${ch.stockId}: ${pct}% / ${ch.price}`);
        }
      }
    }
  });

  it('같은 시드면 같은 가격 흐름', () => {
    const a = runTicks(77, 200).results;
    expect(runTicks(77, 200).results).toEqual(a);
    expect(runTicks(78, 200).results).not.toEqual(a);
  });
});

describe('주가 엔진 — 뉴스 반영과 관성', () => {
  it('뉴스 변동률이 그대로 적용되고(±30%에서 자름), 나머지는 랜덤', () => {
    const { results } = runTicks(3, 4, (t) => (t === 2 ? new Map([['t0', 210], ['t1', -180], ['t2', 420]]) : undefined));
    const tick2 = perStock(results);
    expect(tick2.get('test-s0')![1]).toMatchObject({ cause: 'news', rate: 210 });
    expect(tick2.get('test-s1')![1]).toMatchObject({ cause: 'news', rate: -180 });
    expect(tick2.get('test-s2')![1]).toMatchObject({ cause: 'news', rate: 300 });
    expect(tick2.get('test-s3')![1]!.cause).toBe('random');
  });

  it('뉴스 다음 4틱(20초)은 관성, 그 뒤 다시 랜덤', () => {
    const { results } = runTicks(1, 10, (t) => (t === 2 ? new Map([['t0', 150]]) : undefined));
    expect(perStock(results).get('test-s0')!.map((c) => c.cause)).toEqual([
      'random', 'news', 'momentum', 'momentum', 'momentum', 'momentum', 'random', 'random', 'random', 'random',
    ]);
  });

  it('[대량 표본] 관성은 유지 60% / 반대 20% / 정지 20%, 크기는 0.1~1.5%', () => {
    const count = { keep: 0, reverse: 0, flat: 0 };
    for (const seed of SEEDS) {
      const all = new Map(Array.from({ length: 20 }, (_, i) => [`t${i}`, i % 2 ? 120 : -120]));
      const { results } = runTicks(seed, 30, (t) => (t === 1 || t === 15 ? all : undefined));
      for (const r of results) {
        for (const ch of r.changes) {
          if (!ch.momentum) continue;
          count[ch.momentum]++;
          if (ch.momentum === 'flat') expect(ch.rate).toBe(0);
          else expect(Math.abs(ch.rate)).toBeGreaterThanOrEqual(1);
          expect(Math.abs(ch.rate)).toBeLessThanOrEqual(15);
        }
      }
    }
    const total = count.keep + count.reverse + count.flat;
    expect(total).toBe(150 * 20 * 2 * 4);
    expect(count.keep / total).toBeGreaterThan(0.58);
    expect(count.keep / total).toBeLessThan(0.62);
    expect(count.reverse / total).toBeGreaterThan(0.18);
    expect(count.reverse / total).toBeLessThan(0.22);
  });

  it('관성 방향: 유지는 뉴스와 같은 방향, 반대는 반대 방향 (1분 한도에 잘리지 않음)', () => {
    for (const seed of SEEDS) {
      const { results } = runTicks(seed, 8, (t) => (t === 1 ? new Map([['t0', 90], ['t1', -90]]) : undefined));
      const map = perStock(results);
      for (const [stockId, dir] of [['test-s0', 1], ['test-s1', -1]] as const) {
        for (const ch of map.get(stockId)!) {
          if (ch.momentum === 'keep') expect(Math.sign(ch.rate)).toBe(dir);
          if (ch.momentum === 'reverse') expect(Math.sign(ch.rate)).toBe(-dir);
        }
      }
    }
  });

  it('[시드 100개] 뉴스·관성이 섞여도 랜덤 틱의 1분 한도를 지킨다', () => {
    for (const seed of SEEDS.slice(0, 100)) {
      const newsTicks = new Set([3, 40, 41, 100, 150]);
      const { results } = runTicks(seed, 300, (t) => (newsTicks.has(t) ? new Map([['t0', 120], ['t1', -180]]) : undefined));
      const map = perStock(results);
      assertWindows(map.get('test-s0')!, `seed ${seed} s0`);
      assertWindows(map.get('test-s1')!, `seed ${seed} s1`);
    }
  });
});

describe('주가 엔진 — 차트 이력', () => {
  it('시대 초반에는 있는 만큼만, 이후 최근 240개(20분)', () => {
    expect(runTicks(1, 5).engine.getHistory('test-s0')).toHaveLength(6);
    const { engine } = runTicks(1, 500);
    const h = engine.getHistory('test-s0');
    expect(h).toHaveLength(240);
    expect(h[0]!.tick).toBe(261);
    expect(h.at(-1)!.price).toBe(engine.getPrice('test-s0'));
  });
});
