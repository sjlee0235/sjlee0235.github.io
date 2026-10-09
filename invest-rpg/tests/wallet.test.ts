import { describe, expect, it } from 'vitest';
import { MockAdRewardService, grantAdReward, watchAdForReward } from '../src/engine/adReward.ts';
import { makeConfig } from '../src/engine/config.ts';
import { Game } from '../src/engine/game.ts';
import {
  addAdReward,
  createWallet,
  resetPracticeWallet,
  returnPct,
  type PracticeWallet,
  type RealWallet,
} from '../src/engine/wallet.ts';
import { makeEra } from './fixtures/makeEra.ts';

const config = makeConfig();

describe('수익률 공식', () => {
  it('(최종 자산 − 시작 자금 − 누적 광고 보상) ÷ (시작 자금 + 누적 광고 보상)', () => {
    expect(returnPct(13_000, 10_000, 3_000)).toBe(0); // 광고로만 늘어난 돈은 수익이 아님
    expect(returnPct(15_600, 10_000, 3_000)).toBe(20); // (15600-13000)/13000
    expect(returnPct(11_000, 10_000, 0)).toBe(10);
    expect(returnPct(6_500, 10_000, 3_000)).toBe(-50);
  });
});

describe('지갑 분리', () => {
  it('연습 지갑과 실전 지갑은 타입이 달라 섞을 수 없다', () => {
    const practice = createWallet('practice', config);
    const real = createWallet('real', config);
    addAdReward(practice, 3000);
    // @ts-expect-error 실전 지갑에는 광고 보상을 넣을 수 없다 (타입 오류)
    addAdReward(real, 3000);
    // @ts-expect-error 실전 지갑을 연습 지갑 자리에 넣을 수 없다
    const p: PracticeWallet = real;
    // @ts-expect-error 연습 지갑을 실전 지갑 자리에 넣을 수 없다
    const r: RealWallet = practice;
    expect([p, r]).toHaveLength(2);
  });

  it('두 지갑은 서로 다른 계좌라 한쪽 매매가 다른 쪽에 영향이 없다', () => {
    const practice = createWallet('practice', config);
    const real = createWallet('real', config);
    practice.account.buy('x', 5, 1000);
    expect(real.account.cash).toBe(10_000);
    expect(real.account.getHoldings()).toEqual([]);
  });

  it('연습 지갑 리셋: 현금 10,000, 보유·광고 횟수 초기화', () => {
    const w = createWallet('practice', config);
    w.account.buy('x', 5, 1000);
    addAdReward(w, 3000);
    resetPracticeWallet(w, config);
    expect(w.account.cash).toBe(10_000);
    expect(w.account.getHoldings()).toEqual([]);
    expect(w.adRewardCount).toBe(0);
    expect(w.adRewardTotal).toBe(0);
  });

  it('게임 지갑의 mode가 게임 모드와 같다', () => {
    const eras = [makeEra()];
    expect(new Game({ eras, seed: 1, mode: 'practice' }).wallet.mode).toBe('practice');
    expect(new Game({ eras, seed: 1, mode: 'real' }).wallet.mode).toBe('real');
  });
});

describe('광고 보상 (연습)', () => {
  it('1회 3,000 비트, 판당 최대 3회', () => {
    const w = createWallet('practice', config);
    expect(grantAdReward(w, config)).toEqual({ ok: true, amount: 3000, cash: 13_000, remaining: 2 });
    expect(grantAdReward(w, config).ok).toBe(true);
    expect(grantAdReward(w, config)).toMatchObject({ ok: true, remaining: 0 });
    expect(grantAdReward(w, config)).toEqual({ ok: false, error: 'ad-limit-reached' });
    expect(w.account.cash).toBe(19_000);
  });

  it('mock 광고: 끝까지 보면 지급, 중간에 그만두면 미지급, 횟수가 없으면 광고를 띄우지 않는다', async () => {
    const w = createWallet('practice', config);
    const quit = new MockAdRewardService(false);
    expect(await watchAdForReward(w, quit, config)).toEqual({ ok: false, error: 'ad-not-completed' });
    expect(w.account.cash).toBe(10_000);

    const ad = new MockAdRewardService();
    for (let i = 0; i < 3; i++) expect((await watchAdForReward(w, ad, config)).ok).toBe(true);
    expect(await watchAdForReward(w, ad, config)).toEqual({ ok: false, error: 'ad-limit-reached' });
    expect(ad.shownCount).toBe(3);
  });

  it('게임: 정산 수익률에서 광고 보상을 뺀다', async () => {
    const game = new Game({ eras: [makeEra()], seed: 1, mode: 'practice' });
    await game.watchAdForReward(new MockAdRewardService());
    game.grantAdReward();
    while (game.phase !== 'era-ended') {
      if (game.phase === 'news') game.confirmNews();
      game.advanceTick();
    }
    const st = game.settlements[0]!;
    expect(st.adRewardTotal).toBe(6000);
    expect(st.endAssets).toBe(16_000);
    expect(st.profit).toBe(0);
    expect(st.returnPct).toBe(0);
  });

  it('판당 횟수 제한은 설정값', () => {
    const c = makeConfig({ adRewardMaxPerRound: 1 });
    const w = createWallet('practice', c);
    expect(grantAdReward(w, c).ok).toBe(true);
    expect(grantAdReward(w, c).ok).toBe(false);
  });

  it('실전 모드에는 광고 보상이 없다', () => {
    const game = new Game({ eras: [makeEra()], seed: 1, mode: 'real' });
    // 타입상 실전 게임에서는 호출 자체가 막혀 있다. 강제로 불러도 거절된다.
    const forced = game as unknown as Game<'practice'>;
    expect(forced.grantAdReward()).toEqual({ ok: false, error: 'not-available-in-real' });
    expect(game.account.cash).toBe(10_000);
  });
});
