// 시대 관리: 시대 순서, 시대 시작(추첨 + 엔진 준비), 시대 종료 정산.

import type { Era } from '../data/schema.ts';
import type { Account, TradeRecord } from './account.ts';
import { pct } from './account.ts';
import type { GameConfig } from './config.ts';
import { applyDraw, drawEra, type ActiveEra, type EraDraw } from './eraDraw.ts';
import { NewsEngine, type ScheduledNews } from './newsEngine.ts';
import { PriceEngine } from './priceEngine.ts';
import { depositTotal, twrPct, type DepositTotals, type TwrState } from './returns.ts';
import { createRng, deriveSeed } from './rng.ts';

/** order 값 기준으로 시대를 정렬한 새 배열 (1980s, 1990s, 2000s ... 순) */
export function sortEras(eras: readonly Era[]): Era[] {
  return [...eras].sort((a, b) => a.order - b.order);
}

/** 한 시대가 진행되는 동안의 상태 */
export interface EraSession {
  era: Era;
  index: number;
  /** 시대 시작 추첨 결과 (세이브에 저장하면 같은 판을 다시 만들 수 있다) */
  draw: EraDraw;
  active: ActiveEra;
  prices: PriceEngine;
  news: NewsEngine;
  favorites: string[];
  /** 시대 시작 자금 */
  startCash: number;
}

export interface SessionOptions {
  /** 저장된 추첨 결과가 있으면 그대로 쓴다 */
  draw?: EraDraw;
  pauseOnNews?: boolean;
  fixedSchedule?: (active: ActiveEra) => ScheduledNews[];
}

/**
 * 시대 시작 준비. 시드는 시대 id로 나눠 쓴다
 * → 시대를 추가·삭제해도 다른 시대의 결과는 바뀌지 않는다.
 */
export function startEraSession(
  era: Era,
  index: number,
  seed: number,
  config: GameConfig,
  startCash: number,
  options: SessionOptions = {},
): EraSession {
  const draw = options.draw ?? drawEra(era, seed, config);
  const active = applyDraw(era, draw, config);
  const engineOptions: { pauseOnNews?: boolean; fixedSchedule?: ScheduledNews[] } = {};
  if (options.pauseOnNews) engineOptions.pauseOnNews = true;
  if (options.fixedSchedule) engineOptions.fixedSchedule = options.fixedSchedule(active);
  return {
    era,
    index,
    draw,
    active,
    prices: new PriceEngine(active.stocks, createRng(deriveSeed(seed, 'price', era.id)), config),
    news: new NewsEngine(
      active,
      createRng(deriveSeed(seed, 'news', era.id)),
      createRng(deriveSeed(seed, 'impact', era.id)),
      config,
      engineOptions,
    ),
    favorites: [],
    startCash,
  };
}

export interface StockSettlement {
  stockId: string;
  totalBought: number;
  pnl: number;
  pnlPct: number;
}

export interface EraSettlement {
  eraId: string;
  /** 시대 시작 자금 */
  startCash: number;
  /** 시대 종료 자산 (전량 청산 뒤 현금) */
  endAssets: number;
  /** 수익률 % = 시간가중수익률(TWR). 입금이 없으면 (종료 자산 − 시작 자금) ÷ 시작 자금 × 100 과 같다 */
  returnPct: number;
  /** 입금을 뺀 순손익 = 종료 자산 − 시작 자금 − 이번 시대 입금 합계 */
  profitAmount: number;
  /** 이번 시대 출처별 입금 합계 */
  deposits: DepositTotals;
  stocks: StockSettlement[];
  liquidations: TradeRecord[];
  /** 앱 업데이트로 버전이 바뀌어 세이브 스냅샷 가격으로 정산했는가 */
  settledOnVersionChange?: boolean;
}

/** 시대 종료: 보유 종목 전량을 주어진 가격으로 청산하고 정산 결과를 만든다 */
export function settleAccount(
  eraId: string,
  startCash: number,
  account: Account,
  prices: ReadonlyMap<string, number>,
  tick: number,
  twr: TwrState,
): EraSettlement {
  const liquidations = account.liquidateAll(prices, tick);
  const endAssets = account.cash;
  return {
    eraId,
    startCash,
    endAssets,
    returnPct: twrPct(twr, endAssets),
    profitAmount: endAssets - startCash - depositTotal(twr.deposits),
    deposits: { ...twr.deposits },
    stocks: account.getPerformance().map((p) => ({
      stockId: p.stockId,
      totalBought: p.totalBought,
      pnl: p.realizedPnl,
      pnlPct: pct(p.realizedPnl, p.totalBought),
    })),
    liquidations,
  };
}

/** 시대 종료: 현재가로 청산 */
export function settleEra(session: EraSession, account: Account, twr: TwrState): EraSettlement {
  return settleAccount(session.era.id, session.startCash, account, session.prices.getPrices(), session.prices.tick, twr);
}
