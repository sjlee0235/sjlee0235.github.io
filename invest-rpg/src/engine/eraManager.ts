// 시대 관리: 시대 순서, 시대별 엔진 준비, 시대 종료 정산.

import type { Era } from '../data/schema.ts';
import type { Account, TradeRecord } from './account.ts';
import { pct } from './account.ts';
import type { GameConfig, GameMode } from './config.ts';
import { NewsEngine } from './newsEngine.ts';
import { PriceEngine } from './priceEngine.ts';
import { createRng, deriveSeed } from './rng.ts';

/** order 값 기준으로 시대를 정렬한 새 배열 (1980s, 1990s, 2000s ... 순) */
export function sortEras(eras: readonly Era[]): Era[] {
  return [...eras].sort((a, b) => a.order - b.order);
}

/** 한 시대가 진행되는 동안의 상태 */
export interface EraSession {
  era: Era;
  index: number;
  prices: PriceEngine;
  news: NewsEngine;
  /** 즐겨찾기 (그룹 맨 위 → 아래). 시대가 바뀌면 종목이 바뀌므로 새로 시작 */
  favorites: string[];
  /** 시대 시작 시 총 자산 */
  startAssets: number;
  /** 이번 시대에 투자 수익이 아닌 방법으로 들어온 돈 (광고 보상 등) */
  deposits: number;
  /** 이번 시대 광고 보상 횟수 */
  adRewards: number;
}

/**
 * 시대 시작 준비. 시드는 시대 id와 모드로 나눠 쓰므로,
 * 나중에 시대를 추가·삭제해도 다른 시대의 결과는 바뀌지 않는다.
 */
export function startEraSession(
  era: Era,
  index: number,
  seed: number,
  startAssets: number,
  config: GameConfig,
  mode: GameMode,
): EraSession {
  return {
    era,
    index,
    prices: new PriceEngine(era.stocks, createRng(deriveSeed(seed, 'price', era.id)), config),
    news: new NewsEngine(era, createRng(deriveSeed(seed, 'news', era.id, mode)), config, mode),
    favorites: [],
    startAssets,
    deposits: 0,
    adRewards: 0,
  };
}

export interface StockSettlement {
  stockId: string;
  /** 이번 시대에 산 총 금액 */
  totalBought: number;
  /** 이번 시대 손익 (청산분 포함) */
  pnl: number;
  /** 손익률 % = 손익 / 산 총 금액 */
  pnlPct: number;
}

export interface EraSettlement {
  eraId: string;
  /** 시대 시작 자산 */
  startAssets: number;
  /** 시대 중 추가로 들어온 돈 (광고 보상 등) */
  deposits: number;
  /** 시대 종료 자산 (청산 후 현금) */
  endAssets: number;
  /** 투자 손익 = 종료 자산 - 시작 자산 - 추가 입금 */
  profit: number;
  /** 수익률 % = 투자 손익 / (시작 자산 + 추가 입금) */
  returnPct: number;
  /** 종목별 손익 (이번 시대에 처음 거래한 순서) */
  stocks: StockSettlement[];
  /** 자동 청산으로 일어난 매도 기록 */
  liquidations: TradeRecord[];
}

/** 시대 종료: 보유 종목 전량을 현재가로 청산하고 정산 결과를 만든다 */
export function settleEra(session: EraSession, account: Account): EraSettlement {
  const liquidations = account.liquidateAll(session.prices.getPrices(), session.prices.tick);
  const endAssets = account.cash;
  const profit = endAssets - session.startAssets - session.deposits;
  return {
    eraId: session.era.id,
    startAssets: session.startAssets,
    deposits: session.deposits,
    endAssets,
    profit,
    returnPct: pct(profit, session.startAssets + session.deposits),
    stocks: account.getPerformance().map((p) => ({
      stockId: p.stockId,
      totalBought: p.totalBought,
      pnl: p.realizedPnl,
      pnlPct: pct(p.realizedPnl, p.totalBought),
    })),
    liquidations,
  };
}
