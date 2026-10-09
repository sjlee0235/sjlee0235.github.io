// 수익률 계산: 시간가중수익률(TWR, Time-Weighted Return).
//
// 시대 중간에 돈이 들어오면(인형 눈 붙이기·결제·광고 보상) 단순 수익률 (끝 자산 − 시작 자금) ÷ 시작 자금 은
// 입금액까지 "번 돈"으로 세어 부풀려진다. 그래서 입금 시점마다 구간을 나눈다.
//   구간 수익률 = 구간 끝 자산(입금 직전) ÷ 구간 시작 자산(직전 입금 직후) − 1
//   시대 수익률 = (1 + 구간1) × (1 + 구간2) × … − 1
// → 입금 자체는 수익률을 바꾸지 않고, "투자로 늘린 비율"만 남는다.
// 구간 시작 자산이 0이면(파산 상태에서 입금 등) 그 구간은 건너뛴다.
//
// 입금이 없으면 단순 수익률과 똑같다.

import type { DepositSource } from './account.ts';

export type DepositTotals = Record<DepositSource, number>;

export const emptyDepositTotals = (): DepositTotals => ({ work: 0, purchase: 0, ad: 0, other: 0 });

export interface TwrState {
  /** 지난 구간들의 (1 + 구간 수익률) 곱 */
  factor: number;
  /** 지금 구간의 시작 자산 */
  segmentStart: number;
  /** 이번 시대 출처별 입금 합계 */
  deposits: DepositTotals;
}

export function startTwr(startAssets: number): TwrState {
  return { factor: 1, segmentStart: startAssets, deposits: emptyDepositTotals() };
}

/** 입금 직전 자산으로 구간을 닫고, 입금 뒤 자산으로 새 구간을 연다 */
export function applyDeposit(twr: TwrState, assetsBefore: number, amount: number, source: DepositSource): TwrState {
  const factor = twr.segmentStart > 0 ? twr.factor * (assetsBefore / twr.segmentStart) : twr.factor;
  return {
    factor,
    segmentStart: assetsBefore + amount,
    deposits: { ...twr.deposits, [source]: twr.deposits[source] + amount },
  };
}

/** 지금 자산 기준 시대 수익률 (%) */
export function twrPct(twr: TwrState, assetsNow: number): number {
  const factor = twr.segmentStart > 0 ? twr.factor * (assetsNow / twr.segmentStart) : twr.factor;
  return (factor - 1) * 100;
}

export function depositTotal(d: DepositTotals): number {
  return d.work + d.purchase + d.ad + d.other;
}

/** 여러 시대 누적 수익률 (%) = (1 + r1)(1 + r2)… − 1 */
export function cumulativeReturnPct(eraReturnsPct: readonly number[]): number {
  return (eraReturnsPct.reduce((f, r) => f * (1 + r / 100), 1) - 1) * 100;
}
