// 광고 보상 (연습 모드 전용).
// 실제 광고 SDK는 연동하지 않는다. 화면/앱 쪽에서 AdRewardService를 구현해 넘겨주면 되고,
// 개발·테스트에는 MockAdRewardService(가짜 광고)를 쓴다.

import type { GameConfig } from './config.ts';
import { addAdReward, type PracticeWallet } from './wallet.ts';

/** 보상형 광고를 보여주는 서비스. 끝까지 시청하면 true */
export interface AdRewardService {
  showRewardedAd(): Promise<boolean>;
}

/** 개발용 가짜 광고: 실제로 아무것도 보여주지 않고 바로 결과를 돌려준다 */
export class MockAdRewardService implements AdRewardService {
  /** 광고를 보여준 횟수 */
  shownCount = 0;
  /** false로 두면 "시청을 중간에 그만둔" 경우를 흉내 낸다 */
  completes: boolean;

  constructor(completes = true) {
    this.completes = completes;
  }

  async showRewardedAd(): Promise<boolean> {
    this.shownCount++;
    return this.completes;
  }
}

export type AdRewardError = 'ad-limit-reached' | 'ad-not-completed' | 'not-available-in-real';
export type AdRewardResult =
  | { ok: true; amount: number; cash: number; remaining: number }
  | { ok: false; error: AdRewardError };

/** 이번 판에 남은 광고 보상 횟수 */
export function remainingAdRewards(wallet: PracticeWallet, config: GameConfig): number {
  return Math.max(0, config.adRewardMaxPerRound - wallet.adRewardCount);
}

/** 광고 시청이 끝난 뒤 보상을 지급한다 (판당 최대 횟수 확인) */
export function grantAdReward(wallet: PracticeWallet, config: GameConfig): AdRewardResult {
  if (remainingAdRewards(wallet, config) <= 0) return { ok: false, error: 'ad-limit-reached' };
  addAdReward(wallet, config.adRewardBits);
  return {
    ok: true,
    amount: config.adRewardBits,
    cash: wallet.account.cash,
    remaining: remainingAdRewards(wallet, config),
  };
}

/** 광고를 보여주고, 끝까지 보면 보상을 지급한다. 횟수가 남지 않았으면 광고를 띄우지 않는다 */
export async function watchAdForReward(
  wallet: PracticeWallet,
  service: AdRewardService,
  config: GameConfig,
): Promise<AdRewardResult> {
  if (remainingAdRewards(wallet, config) <= 0) return { ok: false, error: 'ad-limit-reached' };
  const completed = await service.showRewardedAd();
  if (!completed) return { ok: false, error: 'ad-not-completed' };
  return grantAdReward(wallet, config);
}
