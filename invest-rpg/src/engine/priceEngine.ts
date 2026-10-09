// 주가 엔진: 한 시대 동안 활성 종목 20개의 가격을 틱 단위로 움직인다.
//
// 규칙 요약
// - 평소: 매 틱 종목별로 -1.5% ~ +1.5% (0.1% 단위) 랜덤 변동.
// - 1분(12틱) 윈도우 안 변동률 합이 ±3%를 넘으려 하면 넘친 만큼 반대로 튕겨낸다(반사).
// - 뉴스 사이 한도: 뉴스가 발표된 순간의 가격 P0 기준으로, 다음 뉴스 발표 전까지 [0.7×P0, 1.3×P0] 안에 머문다.
//   (모든 종목, 뉴스 반영·관성·일반 변동 포함) 뉴스 반영은 남은 한도까지만, 일반·관성 변동은 반사.
// - 발표 순간(즉시 몫): 틱을 진행하지 않고 영향받는 종목 가격을 바로 옮긴다 (1분 한도·관성과 무관).
// - 뉴스 반영 틱(발표 1틱 뒤, 나머지 몫): 영향받는 종목은 랜덤 대신 뉴스 변동률을 한 번에 적용, 1분 윈도우 리셋.
// - 관성(반영 후 2틱): 반영 방향과 같은 방향 50% / 반대 25% / 변동 없음 25%, 크기 0.1~1.5%.
//   관성 구간은 1분 한도에서 제외하고, 끝나면 윈도우를 새로 시작한다.
// - 가격 = 정수, 최소 1. (반올림은 0.5에서 올림)

import type { Stock } from '../data/schema.ts';
import { getTickRules, type GameConfig, type TickRules } from './config.ts';
import type { Rng } from './rng.ts';

/** instant = 뉴스 발표 순간 즉시 반영된 몫 */
export type ChangeCause = 'random' | 'news' | 'inertia' | 'instant';
export type InertiaDecision = 'same' | 'opposite' | 'flat';

export interface PricePoint {
  tick: number;
  price: number;
}

export interface StockTickChange {
  stockId: string;
  prevPrice: number;
  price: number;
  /** 실제 적용된 변동률 (0.1% 단위 정수, 한도 적용 후). 13 = +1.3% */
  rate: number;
  cause: ChangeCause;
  /** 뉴스 반영 틱: 한도로 깎이기 전 원래 변동률 */
  requestedRate?: number;
  /** 관성 틱: 뽑힌 방향 */
  inertia?: InertiaDecision;
}

export interface TickResult {
  tick: number;
  changes: StockTickChange[];
}

export interface StockPriceState {
  stockId: string;
  themeId: string;
  price: number;
  /** 시대 시작 가격 */
  openPrice: number;
  /** 뉴스 사이 한도의 기준가 (마지막 뉴스 발표 시점 가격) */
  bandBase: number;
  windowSum: number;
  windowElapsed: number;
  lastRate: number;
  inertiaLeft: number;
  inertiaDir: 1 | -1;
  history: PricePoint[];
}

/** 가격에 변동률(0.1% 단위)을 적용한 새 정수 가격 */
export function applyRate(price: number, rate: number, minPrice: number): number {
  return Math.max(minPrice, Math.round((price * (1000 + rate)) / 1000));
}

/** 범위를 넘으면 넘친 만큼 반대로 튕기고, 그래도 넘치면 자른다 */
export function reflect(rate: number, lo: number, hi: number): number {
  let r = rate;
  if (r > hi) r = 2 * hi - r;
  else if (r < lo) r = 2 * lo - r;
  return Math.max(lo, Math.min(hi, r));
}

/** 1분 한도 반사 (기존 호환용 이름) */
export function reflectIntoWindow(wanted: number, windowSum: number, tickMax: number, windowMax: number): number {
  return reflect(wanted, Math.max(-tickMax, -windowMax - windowSum), Math.min(tickMax, windowMax - windowSum));
}

export class PriceEngine {
  tick = 0;
  private readonly states: StockPriceState[];
  private readonly byId: Map<string, StockPriceState>;
  private readonly rng: Rng;
  private readonly config: GameConfig;
  private readonly rules: TickRules;

  constructor(stocks: readonly Stock[], rng: Rng, config: GameConfig) {
    this.rng = rng;
    this.config = config;
    this.rules = getTickRules(config);
    this.states = stocks.map((s) => ({
      stockId: s.id,
      themeId: s.themeId,
      price: config.startPrice,
      openPrice: config.startPrice,
      bandBase: config.startPrice,
      windowSum: 0,
      windowElapsed: 0,
      lastRate: 0,
      inertiaLeft: 0,
      inertiaDir: 1,
      history: [{ tick: 0, price: config.startPrice }],
    }));
    this.byId = new Map(this.states.map((s) => [s.stockId, s]));
  }

  /** 뉴스가 발표된 순간: 모든 종목의 한도 기준가를 지금 가격으로 다시 잡는다 */
  markNewsPublished(): void {
    for (const s of this.states) s.bandBase = s.price;
  }

  /**
   * 뉴스 발표 순간의 즉시 반영 몫. 틱은 그대로이고, 1분 한도·관성에는 영향을 주지 않는다.
   * 한도 기준가(P0)는 반영 전 가격이므로 즉시 몫 + 5초 뒤 몫을 합쳐 ±30% 안에 머문다.
   */
  applyInstant(rates: ReadonlyMap<string, number>): StockTickChange[] {
    const changes: StockTickChange[] = [];
    for (const s of this.states) {
      const wanted = rates.get(s.themeId);
      if (wanted === undefined || wanted === 0) continue;
      const [lo, hi] = this.bandRange(s);
      const rate = Math.max(lo, Math.min(hi, wanted));
      const prevPrice = s.price;
      s.price = this.clampToBand(s, applyRate(prevPrice, rate, this.config.minPrice));
      s.lastRate += rate;
      s.history[s.history.length - 1] = { tick: this.tick, price: s.price };
      changes.push({ stockId: s.stockId, prevPrice, price: s.price, rate, cause: 'instant', requestedRate: wanted });
    }
    return changes;
  }

  /** 뉴스 사이 한도를 0.1% 단위 변동률 범위로 (현재 가격 기준) */
  private bandRange(s: StockPriceState): [number, number] {
    const pct = this.config.newsBandPct;
    const lowP = Math.max(this.config.minPrice, Math.ceil((s.bandBase * (100 - pct)) / 100));
    const highP = Math.floor((s.bandBase * (100 + pct)) / 100);
    const lo = Math.min(0, Math.ceil(((lowP - s.price) * 1000) / s.price));
    const hi = Math.max(0, Math.floor(((highP - s.price) * 1000) / s.price));
    return [lo, hi];
  }

  /** 가격이 반올림 때문에 한도를 살짝 넘지 않게 맞춘다 */
  private clampToBand(s: StockPriceState, price: number): number {
    const pct = this.config.newsBandPct;
    const lowP = Math.max(this.config.minPrice, Math.ceil((s.bandBase * (100 - pct)) / 100));
    const highP = Math.max(lowP, Math.floor((s.bandBase * (100 + pct)) / 100));
    return Math.max(lowP, Math.min(highP, price));
  }

  /**
   * 한 틱 진행한다.
   * @param newsRates 이번 틱에 반영할 뉴스 변동률 (테마 id → 0.1% 단위). 없으면 평소 변동만.
   */
  step(newsRates?: ReadonlyMap<string, number>): TickResult {
    const c = this.config;
    this.tick++;
    const changes: StockTickChange[] = [];

    for (const s of this.states) {
      // 종목마다 매 틱 난수를 항상 3개씩 뽑는다 → 다른 종목들의 난수 순서가 흔들리지 않는다
      const drawn = this.rng.int(-c.tickMaxRate, c.tickMaxRate);
      const roll = this.rng.next();
      const magnitude = this.rng.int(c.inertiaRate[0], c.inertiaRate[1]);

      const prevPrice = s.price;
      const [bandLo, bandHi] = this.bandRange(s);
      const newsRate = newsRates?.get(s.themeId);
      let rate: number;
      let cause: ChangeCause;
      let inertia: InertiaDecision | undefined;
      let requestedRate: number | undefined;

      if (newsRate !== undefined && newsRate !== 0) {
        // 뉴스 반영: 남은 한도까지만 (반사 없이 자름)
        requestedRate = newsRate;
        rate = Math.max(bandLo, Math.min(bandHi, newsRate));
        cause = 'news';
        s.windowSum = 0;
        s.windowElapsed = 0;
        s.inertiaLeft = this.rules.inertiaTicks;
        s.inertiaDir = newsRate > 0 ? 1 : -1;
      } else if (s.inertiaLeft > 0) {
        // 관성: 1분 한도에서 제외, 뉴스 사이 한도 안으로만 반사
        s.inertiaLeft--;
        cause = 'inertia';
        let wanted: number;
        if (roll < c.inertiaSameChance) {
          inertia = 'same';
          wanted = s.inertiaDir * magnitude;
        } else if (roll < c.inertiaSameChance + c.inertiaOppositeChance) {
          inertia = 'opposite';
          wanted = -s.inertiaDir * magnitude;
        } else {
          inertia = 'flat';
          wanted = 0;
        }
        rate = reflect(wanted, bandLo, bandHi);
        if (s.inertiaLeft === 0) {
          s.windowSum = 0;
          s.windowElapsed = 0;
        }
      } else {
        if (s.windowElapsed >= this.rules.windowTicks) {
          s.windowSum = 0;
          s.windowElapsed = 0;
        }
        // 1분 한도와 뉴스 사이 한도를 함께 만족하는 범위 안으로 반사 (두 범위 모두 0을 포함한다)
        const lo = Math.max(-c.tickMaxRate, -c.windowMaxRate - s.windowSum, bandLo);
        const hi = Math.min(c.tickMaxRate, c.windowMaxRate - s.windowSum, bandHi);
        rate = reflect(drawn, lo, hi);
        cause = 'random';
        s.windowSum += rate;
        s.windowElapsed++;
      }

      s.price = this.clampToBand(s, applyRate(prevPrice, rate, c.minPrice));
      s.lastRate = rate;
      s.history.push({ tick: this.tick, price: s.price });
      if (s.history.length > this.rules.chartHistoryLength) {
        s.history.splice(0, s.history.length - this.rules.chartHistoryLength);
      }
      const change: StockTickChange = { stockId: s.stockId, prevPrice, price: s.price, rate, cause };
      if (requestedRate !== undefined) change.requestedRate = requestedRate;
      if (inertia) change.inertia = inertia;
      changes.push(change);
    }
    return { tick: this.tick, changes };
  }

  getPrice(stockId: string): number {
    return this.require(stockId).price;
  }

  getPrices(): Map<string, number> {
    return new Map(this.states.map((s) => [s.stockId, s.price]));
  }

  getHistory(stockId: string): PricePoint[] {
    return this.require(stockId).history.map((p) => ({ ...p }));
  }

  getState(stockId: string): Readonly<StockPriceState> {
    const s = this.require(stockId);
    return { ...s, history: s.history.map((p) => ({ ...p })) };
  }

  hasStock(stockId: string): boolean {
    return this.byId.has(stockId);
  }

  get stockIds(): string[] {
    return this.states.map((s) => s.stockId);
  }

  private require(stockId: string): StockPriceState {
    const s = this.byId.get(stockId);
    if (!s) throw new Error(`없는 종목: ${stockId}`);
    return s;
  }
}
