import { describe, expect, it } from 'vitest';
import { Account } from '../src/engine/account.ts';

const prices = (entries: Record<string, number>) => new Map(Object.entries(entries));

describe('계좌 — 매수/매도', () => {
  it('현재가 × 정수 수량으로 매수하고 현금이 줄어든다', () => {
    const acc = new Account(10_000);
    const r = acc.buy('A', 3, 1000);
    expect(r.ok).toBe(true);
    expect(acc.cash).toBe(7000);
    expect(acc.getQuantity('A')).toBe(3);
  });

  it('잘못된 수량·현금 부족·보유 부족은 거절되고 아무것도 안 바뀐다', () => {
    const acc = new Account(10_000);
    expect(acc.buy('A', 0, 1000)).toEqual({ ok: false, error: 'invalid-quantity' });
    expect(acc.buy('A', 1.5, 1000)).toEqual({ ok: false, error: 'invalid-quantity' });
    expect(acc.buy('A', 11, 1000)).toEqual({ ok: false, error: 'insufficient-cash' });
    expect(acc.sell('A', 1, 1000)).toEqual({ ok: false, error: 'insufficient-shares' });
    acc.buy('A', 2, 1000);
    expect(acc.sell('A', 3, 1000)).toEqual({ ok: false, error: 'insufficient-shares' });
    expect(acc.cash).toBe(8000);
    expect(acc.getQuantity('A')).toBe(2);
  });

  it('구입 순서를 보존한다 (추가 매수해도 순서 유지, 전량 매도 후 재매수는 맨 뒤)', () => {
    const acc = new Account(100_000);
    acc.buy('C', 1, 1000);
    acc.buy('A', 1, 1000);
    acc.buy('B', 1, 1000);
    acc.buy('C', 1, 1000); // 추가 매수
    expect(acc.getHoldings().map((h) => h.stockId)).toEqual(['C', 'A', 'B']);
    acc.sell('A', 1, 1000);
    acc.buy('A', 1, 1000);
    expect(acc.getHoldings().map((h) => h.stockId)).toEqual(['C', 'B', 'A']);
  });

  it('최대 매수 가능 수량', () => {
    const acc = new Account(10_000);
    expect(acc.maxBuyQuantity(1000)).toBe(10);
    expect(acc.maxBuyQuantity(3000)).toBe(3);
    expect(new Account(10_000, 0.01).maxBuyQuantity(1000)).toBe(9); // 수수료 1%면 10주는 10,100
  });
});

describe('계좌 — 평균가와 미실현손익', () => {
  it('평균가·평가금액·미실현손익(금액/%)이 정확하다', () => {
    const acc = new Account(10_000);
    acc.buy('A', 2, 1000);
    acc.buy('A', 2, 1200); // 평균 1100
    acc.buy('B', 5, 400);
    const p = acc.getPortfolio(prices({ A: 1210, B: 300 }));

    const a = p.holdings[0]!;
    expect(a.avgPrice).toBe(1100);
    expect(a.marketValue).toBe(4840);
    expect(a.unrealizedPnl).toBe(440);
    expect(a.unrealizedPnlPct).toBeCloseTo(10, 10);

    const b = p.holdings[1]!;
    expect(b.unrealizedPnl).toBe(-500);
    expect(b.unrealizedPnlPct).toBeCloseTo(-25, 10);

    expect(p.cash).toBe(10_000 - 4400 - 2000);
    expect(p.totalCostBasis).toBe(6400);
    expect(p.totalMarketValue).toBe(6340);
    expect(p.totalUnrealizedPnl).toBe(-60);
    expect(p.totalUnrealizedPnlPct).toBeCloseTo((-60 / 6400) * 100, 10);
    expect(p.totalAssets).toBe(3600 + 6340);
  });

  it('일부 매도해도 평균가는 그대로, 실현손익이 기록된다', () => {
    const acc = new Account(10_000);
    acc.buy('A', 3, 1000);
    acc.buy('A', 1, 1400); // 평균 1100
    const r = acc.sell('A', 2, 1300);
    expect(r.ok && r.trade.realizedPnl).toBe(400); // (1300-1100)*2
    const h = acc.getPortfolio(prices({ A: 1300 })).holdings[0]!;
    expect(h.avgPrice).toBe(1100);
    expect(h.quantity).toBe(2);
    expect(acc.getPerformance()).toEqual([{ stockId: 'A', totalBought: 4400, realizedPnl: 400 }]);
  });

  it('수수료는 설정값이고, 매입원가와 실현손익에 반영된다', () => {
    const acc = new Account(10_000, 0.01);
    acc.buy('A', 5, 1000); // 5000 + 수수료 50
    expect(acc.cash).toBe(4950);
    expect(acc.getHoldings()[0]!.costBasis).toBe(5050);
    const r = acc.sell('A', 5, 1100); // 5500 - 수수료 55
    expect(acc.cash).toBe(4950 + 5445);
    expect(r.ok && r.trade.realizedPnl).toBe(5445 - 5050);
  });

  it('보유 종목이 없으면 수익률 0% (0으로 나누지 않음)', () => {
    const p = new Account(10_000).getPortfolio(new Map());
    expect(p.totalUnrealizedPnlPct).toBe(0);
    expect(p.totalAssets).toBe(10_000);
  });
});

describe('계좌 — 전량 청산', () => {
  it('보유 종목을 모두 현재가로 팔아 현금화한다', () => {
    const acc = new Account(10_000);
    acc.buy('A', 4, 1000);
    acc.buy('B', 2, 2000);
    const trades = acc.liquidateAll(prices({ A: 1500, B: 1000 }));
    expect(trades.map((t) => t.stockId)).toEqual(['A', 'B']);
    expect(acc.getHoldings()).toEqual([]);
    expect(acc.cash).toBe(2000 + 6000 + 2000);
  });
});
