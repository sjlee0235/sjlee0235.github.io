// 지갑: 모드별 계좌 + 시작 자금 + 광고 보상 기록.
//
// 연습 지갑(Wallet<'practice'>)과 실전 지갑(Wallet<'real'>)은 mode 값의 "타입"이 달라서
// 한쪽을 받는 함수에 다른 쪽을 넣으면 코드가 컴파일되지 않는다(섞일 수 없음).
//   예) addAdReward(실전지갑, ...) → 타입 오류

import { Account } from './account.ts';
import type { GameConfig, GameMode } from './config.ts';

export interface Wallet<M extends GameMode> {
  readonly mode: M;
  readonly account: Account;
  /** 이번 판(연습) 또는 이번 시대(실전)를 시작할 때의 자금 */
  startCash: number;
  /** 이번 판에 받은 광고 보상 합계 (실전은 항상 0) */
  adRewardTotal: number;
  /** 이번 판에 받은 광고 보상 횟수 (실전은 항상 0) */
  adRewardCount: number;
}

export type PracticeWallet = Wallet<'practice'>;
export type RealWallet = Wallet<'real'>;

export function createWallet<M extends GameMode>(mode: M, config: GameConfig): Wallet<M> {
  return {
    mode,
    account: new Account(config.startCash, config.feeRate),
    startCash: config.startCash,
    adRewardTotal: 0,
    adRewardCount: 0,
  };
}

/** 연습 지갑을 새 판 상태로 되돌린다: 현금 10,000 비트, 보유·기록·광고 횟수 초기화 (무료) */
export function resetPracticeWallet(wallet: PracticeWallet, config: GameConfig): void {
  wallet.account.reset(config.startCash);
  wallet.startCash = config.startCash;
  wallet.adRewardTotal = 0;
  wallet.adRewardCount = 0;
}

/** 실전 지갑: 새 시대를 시작할 때 이월된 현금을 그 시대의 시작 자금으로 기록한다 */
export function beginRealEra(wallet: RealWallet): void {
  wallet.startCash = wallet.account.cash;
}

/** 광고 보상 입금 (연습 지갑만 받는다) */
export function addAdReward(wallet: PracticeWallet, amount: number): void {
  wallet.account.cash += amount;
  wallet.adRewardTotal += amount;
  wallet.adRewardCount++;
}

/**
 * 정산 수익률(%) = (최종 자산 − 시작 자금 − 누적 광고 보상) ÷ (시작 자금 + 누적 광고 보상) × 100
 */
export function returnPct(finalAssets: number, startCash: number, adRewardTotal: number): number {
  const base = startCash + adRewardTotal;
  return base === 0 ? 0 : ((finalAssets - startCash - adRewardTotal) / base) * 100;
}
