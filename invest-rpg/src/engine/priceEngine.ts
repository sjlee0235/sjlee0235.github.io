// 주가 엔진: 한 시대 동안 종목 20개의 가격을 틱 단위로 움직인다.
//
// 규칙 요약
// - 평소: 매 틱 종목별로 -1.5% ~ +1.5% (0.1% 단위) 랜덤 변동.
// - 1분(12틱) 윈도우 안 변동률 합이 ±3%를 넘지 않게 한다.
//   넘으려 하면 한도에서 자르지(clamp) 않고, 넘친 만큼 반대 방향으로 튕겨낸다(반사, reflect).
//   예) 남은 한도 +0.5%인데 +1.2%가 나오면 → 0.5 - (1.2 - 0.5) = -0.2%
// - 뉴스 반영 틱: 영향받는 종목은 랜덤 대신 뉴스 엔진이 계산한 변동률(영향도×3%×배율)이 그대로 적용되고,
//   그 종목의 윈도우는 리셋된다.
// - 뉴스 반영 후 관성: 이어지는 20초(4틱) 동안 각 틱은 60% 같은 방향 / 20% 반대 / 20% 변동 없음.
//   크기는 일반 틱 범위(0.1~1.5%) 안. 관성 틱은 1분 한도에서 제외하고, 관성이 끝나면 윈도우를 다시 리셋한다.
// - 가격 = 정수, 최소 1. (반올림은 0.5에서 올림)

import type { Stock } from '../data/schema.ts';
import { getTickRules, type GameConfig, type GameMode, type TickRules } from './config.ts';
import type { Rng } from './rng.ts';

export type ChangeCause = 'random' | 'news' | 'momentum';
export type MomentumDecision = 'keep' | 'reverse' | 'flat';

export interface PricePoint {
  tick: number;
  price: number;
}

export interface StockTickChange {
  stockId: string;
  prevPrice: number;
  price: number;
  /** 적용된 변동률 (0.1% 단위 정수). 13 = +1.3% */
  rate: number;
  cause: ChangeCause;
  /** 관성 틱일 때 뽑힌 결과 (같은 방향/반대/정지) */
  momentum?: MomentumDecision;
}

export interface TickResult {
  /** 방금 끝난 틱 번호 (시대 시작 후 1, 2, 3, ...) */
  tick: number;
  changes: StockTickChange[];
}

export interface StockPriceState {
  stockId: string;
  themeId: string;
  price: number;
  /** 시대 시작 가격 */
  openPrice: number;
  /** 현재 윈도우의 변동률 합 (0.1% 단위) */
  windowSum: number;
  /** 현재 윈도우에서 지난 틱 수 */
  windowElapsed: number;
  /** 마지막 틱 변동률 (0.1% 단위) */
  lastRate: number;
  /** 남은 관성 틱 수 */
  momentumLeft: number;
  /** 관성 방향 (+1 상승 / -1 하락) */
  momentumDir: 1 | -1;
  /** 최근 가격 이력 (오래된 것부터) */
  history: PricePoint[];
}

/** 가격에 변동률(0.1% 단위)을 적용한 새 정수 가격 */
export function applyRate(price: number, rate: number, minPrice: number): number {
  // price*(1000+rate)는 정수라서 나눗셈 결과의 .5도 정확히 표현된다
  return Math.max(minPrice, Math.round((price * (1000 + rate)) / 1000));
}

/**
 * 랜덤 변동을 1분 한도 안으로 넣는다. 한도를 넘으면 넘친 만큼 반대로 튕겨낸다(반사).
 * 반사해도 범위를 벗어나는 드문 경우에만 마지막 안전장치로 자른다.
 */
export function reflectIntoWindow(wanted: number, windowSum: number, tickMax: number, windowMax: number): number {
  const upper = windowMax - windowSum; // 위쪽으로 남은 한도
  const lower = -windowMax - windowSum; // 아래쪽으로 남은 한도
  let rate = wanted;
  if (rate > upper) rate = 2 * upper - rate;
  else if (rate < lower) rate = 2 * lower - rate;
  return Math.max(Math.max(-tickMax, lower), Math.min(Math.min(tickMax, upper), rate));
}

export class PriceEngine {
  /** 마지막으로 끝난 틱 번호 (0 = 아직 한 번도 안 움직임) */
  tick = 0;
  private readonly states: StockPriceState[];
  private readonly byId: Map<string, StockPriceState>;
  private readonly rng: Rng;
  private readonly config: GameConfig;
  private readonly rules: TickRules;

  constructor(stocks: readonly Stock[], rng: Rng, config: GameConfig, mode: GameMode = 'real') {
    this.rng = rng;
    this.config = config;
    this.rules = getTickRules(config, mode);
    this.states = stocks.map((s) => ({
      stockId: s.id,
      themeId: s.themeId,
      price: config.startPrice,
      openPrice: config.startPrice,
      windowSum: 0,
      windowElapsed: 0,
      lastRate: 0,
      momentumLeft: 0,
      momentumDir: 1,
      history: [{ tick: 0, price: config.startPrice }],
    }));
    this.byId = new Map(this.states.map((s) => [s.stockId, s]));
  }

  /**
   * 한 틱 진행한다.
   * @param newsRates 이번 틱에 반영할 뉴스 변동률 (테마 id → 0.1% 단위 변동률). 없으면 평소 변동만.
   */
  step(newsRates?: ReadonlyMap<string, number>): TickResult {
    const c = this.config;
    const maxNewsRate = c.impactMax * c.impactUnitRate;
    this.tick++;
    const changes: StockTickChange[] = [];

    for (const s of this.states) {
      // 종목마다 매 틱 난수를 항상 3개씩 뽑는다.
      // → 뉴스·관성 여부와 관계없이 다른 종목들의 난수 순서가 흔들리지 않는다.
      const drawn = this.rng.int(-c.tickMaxRate, c.tickMaxRate);
      const roll = this.rng.next();
      const magnitude = this.rng.int(c.momentumRate[0], c.momentumRate[1]);

      const prevPrice = s.price;
      const newsRate = newsRates?.get(s.themeId);
      let rate: number;
      let cause: ChangeCause;
      let momentum: MomentumDecision | undefined;

      if (newsRate !== undefined && newsRate !== 0) {
        rate = Math.max(-maxNewsRate, Math.min(maxNewsRate, newsRate));
        cause = 'news';
        this.resetWindow(s);
        s.momentumLeft = this.rules.momentumTicks;
        s.momentumDir = rate > 0 ? 1 : -1;
      } else if (s.momentumLeft > 0) {
        // 관성 구간: 1분 한도에서 제외
        s.momentumLeft--;
        cause = 'momentum';
        if (roll < c.momentumKeepChance) {
          momentum = 'keep';
          rate = s.momentumDir * magnitude;
        } else if (roll < c.momentumKeepChance + c.momentumReverseChance) {
          momentum = 'reverse';
          rate = -s.momentumDir * magnitude;
        } else {
          momentum = 'flat';
          rate = 0;
        }
        if (s.momentumLeft === 0) this.resetWindow(s); // 관성이 끝나면 새 1분 윈도우
      } else {
        if (s.windowElapsed >= this.rules.windowTicks) this.resetWindow(s);
        rate = reflectIntoWindow(drawn, s.windowSum, c.tickMaxRate, c.windowMaxRate);
        cause = 'random';
        s.windowSum += rate;
        s.windowElapsed++;
      }

      s.price = applyRate(prevPrice, rate, c.minPrice);
      s.lastRate = rate;
      s.history.push({ tick: this.tick, price: s.price });
      if (s.history.length > this.rules.chartHistoryLength) {
        s.history.splice(0, s.history.length - this.rules.chartHistoryLength);
      }
      const change: StockTickChange = { stockId: s.stockId, prevPrice, price: s.price, rate, cause };
      if (momentum) change.momentum = momentum;
      changes.push(change);
    }

    return { tick: this.tick, changes };
  }

  private resetWindow(s: StockPriceState): void {
    s.windowSum = 0;
    s.windowElapsed = 0;
  }

  getPrice(stockId: string): number {
    return this.require(stockId).price;
  }

  /** 모든 종목의 현재가 (종목 id → 가격) */
  getPrices(): Map<string, number> {
    return new Map(this.states.map((s) => [s.stockId, s.price]));
  }

  /** 차트용 최근 가격 이력 (있는 만큼만, 최대 20분 분량). 복사본을 돌려준다 */
  getHistory(stockId: string): PricePoint[] {
    return this.require(stockId).history.map((p) => ({ ...p }));
  }

  /** 종목 상태의 읽기 전용 복사본 */
  getState(stockId: string): Readonly<StockPriceState> {
    const s = this.require(stockId);
    return { ...s, history: s.history.map((p) => ({ ...p })) };
  }

  hasStock(stockId: string): boolean {
    return this.byId.has(stockId);
  }

  private require(stockId: string): StockPriceState {
    const s = this.byId.get(stockId);
    if (!s) throw new Error(`없는 종목: ${stockId}`);
    return s;
  }
}
