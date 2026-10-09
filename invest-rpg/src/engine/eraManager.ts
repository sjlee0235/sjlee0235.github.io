// 시대 관리: 시대 순서, 시대(또는 연습 판)별 엔진 준비, 종료 정산.

import type { Era } from '../data/schema.ts';
import type { TradeRecord } from './account.ts';
import { pct } from './account.ts';
import type { GameConfig, GameMode } from './config.ts';
import { NewsEngine } from './newsEngine.ts';
import { PriceEngine } from './priceEngine.ts';
import { createRng, deriveSeed } from './rng.ts';
import { returnPct, type Wallet } from './wallet.ts';

/** order 값 기준으로 시대를 정렬한 새 배열 (1980s, 1990s, 2000s ... 순) */
export function sortEras(eras: readonly Era[]): Era[] {
  return [...eras].sort((a, b) => a.order - b.order);
}

/** 한 시대(실전) 또는 한 판(연습)이 진행되는 동안의 상태 */
export interface EraSession {
  era: Era;
  index: number;
  /** 연습 모드에서 몇 번째 판인지 (실전은 0) */
  round: number;
  prices: PriceEngine;
  news: NewsEngine;
  /** 즐겨찾기 (그룹 맨 위 → 아래). 종목이 바뀌므로 매번 새로 시작 */
  favorites: string[];
}

/**
 * 시대 시작 준비. 시드는 시대 id·모드·판 번호로 나눠 쓴다.
 * → 시대를 추가·삭제해도 다른 시대의 결과는 바뀌지 않고, 연습 판마다 다른 흐름이 나온다.
 */
export function startEraSession(
  era: Era,
  index: number,
  seed: number,
  config: GameConfig,
  mode: GameMode,
  round = 0,
): EraSession {
  const key = mode === 'real' ? [era.id] : [era.id, 'practice', round];
  return {
    era,
    index,
    round,
    prices: new PriceEngine(era.stocks, createRng(deriveSeed(seed, 'price', ...key)), config, mode),
    news: new NewsEngine(
      era,
      createRng(deriveSeed(seed, 'news', mode, ...key)),
      createRng(deriveSeed(seed, 'impact', mode, ...key)),
      config,
      mode,
    ),
    favorites: [],
  };
}

export interface StockSettlement {
  stockId: string;
  /** 이번 시대에 산 총 금액 */
  totalBought: number;
  /** 이번 시대 손익 (청산분 포함, 수수료 반영) */
  pnl: number;
  /** 손익률 % = 손익 / 산 총 금액 */
  pnlPct: number;
}

export interface EraSettlement {
  eraId: string;
  mode: GameMode;
  /** 시작 자금 (실전: 이월된 현금, 연습: 10,000) */
  startCash: number;
  /** 누적 광고 보상 (연습만) */
  adRewardTotal: number;
  /** 최종 자산 (청산 후 현금) */
  endAssets: number;
  /** 투자 손익 = 최종 자산 − 시작 자금 − 누적 광고 보상 */
  profit: number;
  /** 수익률 % = 투자 손익 ÷ (시작 자금 + 누적 광고 보상) × 100 */
  returnPct: number;
  /** 종목별 손익 (이번 시대에 처음 거래한 순서) */
  stocks: StockSettlement[];
  /** 자동 청산으로 일어난 매도 기록 */
  liquidations: TradeRecord[];
}

/** 시대 종료: 보유 종목 전량을 현재가로 청산하고 정산 결과를 만든다 */
export function settleEra(session: EraSession, wallet: Wallet<GameMode>): EraSettlement {
  const account = wallet.account;
  const liquidations = account.liquidateAll(session.prices.getPrices(), session.prices.tick);
  const endAssets = account.cash;
  return {
    eraId: session.era.id,
    mode: wallet.mode,
    startCash: wallet.startCash,
    adRewardTotal: wallet.adRewardTotal,
    endAssets,
    profit: endAssets - wallet.startCash - wallet.adRewardTotal,
    returnPct: returnPct(endAssets, wallet.startCash, wallet.adRewardTotal),
    stocks: account.getPerformance().map((p) => ({
      stockId: p.stockId,
      totalBought: p.totalBought,
      pnl: p.realizedPnl,
      pnlPct: pct(p.realizedPnl, p.totalBought),
    })),
    liquidations,
  };
}
