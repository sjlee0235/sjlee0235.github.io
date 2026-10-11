import { describe, expect, it } from 'vitest';
import { Game } from '../src/engine/game.ts';
import { applyDeposit, cumulativeReturnPct, startTwr, twrPct } from '../src/engine/returns.ts';
import { makeSpecEra } from './fixtures/makeEra.ts';

const era = makeSpecEra({ id: 'twr' });
const noFee = { feeRate: 0 };

describe('시간가중수익률 (계산 함수)', () => {
  it('입금이 없으면 단순 수익률과 같다', () => {
    expect(twrPct(startTwr(10_000), 13_000)).toBeCloseTo(30, 10);
  });

  it('큰 상승 직전에 큰돈을 넣어도 수익률은 같다 (원금만 늘어남)', () => {
    // 1만 → 1.2만(+20%), 10만 입금, 그 뒤 전체 +50%
    let t = startTwr(10_000);
    t = applyDeposit(t, 12_000, 100_000, 'purchase');
    expect(twrPct(t, 112_000 * 1.5)).toBeCloseTo(80, 10); // 1.2 × 1.5 − 1
    expect(twrPct(startTwr(10_000), 18_000)).toBeCloseTo(80, 10); // 입금 없이 같은 흐름
  });

  it('구간 시작 자산이 0이면 그 구간은 건너뛴다', () => {
    let t = startTwr(0);
    t = applyDeposit(t, 0, 5_000, 'work');
    expect(twrPct(t, 6_000)).toBeCloseTo(20, 10);
  });

  it('출처별 입금 합계', () => {
    let t = startTwr(1_000);
    t = applyDeposit(t, 1_000, 100, 'work');
    t = applyDeposit(t, 1_100, 200, 'ad');
    t = applyDeposit(t, 1_300, 300, 'work');
    expect(t.deposits).toEqual({ work: 400, purchase: 0, ad: 200, other: 0 });
  });

  it('누적 수익률 = 시대별 (1 + 수익률)의 곱 − 1', () => {
    expect(cumulativeReturnPct([10, -20, 50])).toBeCloseTo((1.1 * 0.8 * 1.5 - 1) * 100, 10);
    expect(cumulativeReturnPct([])).toBe(0);
  });
});

/** 시대 내내 가장 크게 오른 뉴스가 붙은 종목과 그 뉴스 발표 틱 */
function biggestJump(seed: number) {
  const probe = new Game({ eras: [era], seed, config: noFee });
  let best = { stockId: '', tick: 0, rate: -Infinity };
  while (probe.phase === 'running') {
    const r = probe.advanceTick();
    if (!r.advanced) continue;
    for (const c of r.instantChanges) if (c.rate > best.rate && r.tick > 20) best = { stockId: c.stockId, tick: r.tick, rate: c.rate };
  }
  return best;
}

describe('시간가중수익률 (게임)', () => {
  it('[시드 10개] 큰 상승 직전 입금: 같은 비율로 투자하면 returnPct가 입금 없는 판과 똑같다', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const { stockId, tick } = biggestJump(seed);
      const a = new Game({ eras: [era], seed, config: noFee });
      const b = new Game({ eras: [era], seed, config: noFee });
      let deposit = 0;
      while (a.phase === 'running') {
        a.advanceTick();
        b.advanceTick();
        if (a.tick === 10) {
          a.buy(stockId, a.maxBuyQuantity(stockId));
          b.buy(stockId, b.maxBuyQuantity(stockId));
        }
        if (a.tick === tick - 1) {
          // 큰 상승 직전: B는 지금 자산만큼 더 넣고 같은 종목을 같은 수량만큼 더 산다 → 정확히 A의 2배
          deposit = b.totalAssets;
          b.deposit(deposit, 'purchase');
          b.buy(stockId, a.account.getQuantity(stockId));
        }
      }
      const sa = a.settlements[0]!;
      const sb = b.settlements[0]!;
      expect(sb.endAssets).toBe(sa.endAssets * 2);
      expect(sb.returnPct).toBeCloseTo(sa.returnPct, 9);
      expect(sb.profitAmount).toBe(sb.endAssets - 10_000 - deposit);
      expect(sb.deposits.purchase).toBe(deposit);
      // 단순 수익률이었다면 크게 부풀었을 것
      expect(((sb.endAssets - 10_000) / 10_000) * 100).toBeGreaterThan(sb.returnPct + 50);
    }
  });

  it('[시드 10개] 시대 막바지 큰 입금은 수익률을 부풀리지 않는다', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const a = new Game({ eras: [era], seed, config: noFee });
      const b = new Game({ eras: [era], seed, config: noFee });
      let before = 0;
      while (a.phase === 'running') {
        a.advanceTick();
        b.advanceTick();
        if (a.tick === 30) {
          const s = a.activeStocks[seed % 20]!.id;
          a.buy(s, a.maxBuyQuantity(s));
          b.buy(s, b.maxBuyQuantity(s));
        }
        if (a.tick === 1430) {
          before = a.totalAssets;
          b.deposit(50_000, 'ad');
        }
      }
      const ra = a.settlements[0]!.returnPct;
      const rb = b.settlements[0]!.returnPct;
      const simpleB = ((b.settlements[0]!.endAssets - 10_000) / 10_000) * 100;
      expect(simpleB).toBeGreaterThan(rb + 400); // 단순 수익률은 입금 5만을 수익으로 셈
      // TWR은 입금 직전까지의 수익률과 끝 수익률 사이
      const atDeposit = ((before - 10_000) / 10_000) * 100;
      expect(rb).toBeGreaterThanOrEqual(Math.min(ra, atDeposit) - 1e-9);
      expect(rb).toBeLessThanOrEqual(Math.max(ra, atDeposit) + 1e-9);
    }
  });

  it('입금이 없으면 정산 수익률 = 단순 수익률, 순손익 = 끝 자산 − 시작 자금', () => {
    const g = new Game({ eras: [era], seed: 3 });
    while (g.phase === 'running') {
      const r = g.advanceTick();
      if (r.advanced && r.tick === 100) g.buy(g.activeStocks[0]!.id, 4);
    }
    const s = g.settlements[0]!;
    expect(s.returnPct).toBeCloseTo(((s.endAssets - 10_000) / 10_000) * 100, 10);
    expect(s.profitAmount).toBe(s.endAssets - 10_000);
    expect(s.deposits).toEqual({ work: 0, purchase: 0, ad: 0, other: 0 });
  });

  it('여러 시대 누적: 시대별 수익률의 곱. 시대 사이 입금은 다음 시대 시작 자금에 들어가고 수익으로 세지 않는다', () => {
    const eras = [makeSpecEra({ id: 'a', order: 1 }), makeSpecEra({ id: 'b', order: 2, seed: 2 }), makeSpecEra({ id: 'c', order: 3, seed: 3 })];
    const g = new Game({ eras, seed: 4 });
    for (let e = 0; e < 3; e++) {
      while (g.phase === 'running') {
        const r = g.advanceTick();
        if (r.advanced && r.tick === 50) g.buy(g.activeStocks[e]!.id, Math.floor(g.maxBuyQuantity(g.activeStocks[e]!.id) / 2));
        if (r.advanced && r.tick === 800) g.deposit(3_000, 'work');
      }
      if (e === 0) g.deposit(10_000, 'purchase'); // 시대 사이 입금
      if (g.hasNextEra) g.startNextEra();
    }
    const [s1, s2, s3] = g.settlements;
    expect(s2!.startCash).toBe(s1!.endAssets + 10_000);
    expect(s2!.deposits.purchase).toBe(0);
    const expected = ((1 + s1!.returnPct / 100) * (1 + s2!.returnPct / 100) * (1 + s3!.returnPct / 100) - 1) * 100;
    expect(g.cumulativeReturnPct).toBeCloseTo(expected, 9);
    expect(g.eraReturns).toEqual([s1!.returnPct, s2!.returnPct, s3!.returnPct]);
  });

  it('잘못된 입금(0 이하, 소수, 모르는 출처)은 거부', () => {
    const g = new Game({ eras: [era], seed: 1 });
    expect(g.deposit(0, 'work').ok).toBe(false);
    expect(g.deposit(10.5, 'work').ok).toBe(false);
    expect(g.deposit(100, 'lottery' as never).ok).toBe(false);
    expect(g.account.cash).toBe(10_000);
  });
});
