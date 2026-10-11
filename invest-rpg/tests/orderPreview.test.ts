import { describe, expect, it } from 'vitest';
import { PublicGame } from '../src/engine/publicView.ts';
import { makeSpecEra } from './fixtures/makeEra.ts';

const era = makeSpecEra({ id: 'op' });

function game(feeRate = 0.002) {
  return PublicGame.create({ eras: [era], seed: 3, config: { feeRate } });
}

describe('주문 미리보기·최대 수량', () => {
  it("매수 '최대'는 수수료를 포함해 살 수 있는 최대 수량이고, 그만큼 실제로 살 수 있다", () => {
    const g = game();
    const s = g.getStockList()[0]!;
    const max = g.maxQty('buy', s.id);
    expect(max).toBe(g.maxBuyQuantity(s.id));
    const p = g.previewOrder('buy', s.id, max);
    expect(p.error).toBeNull();
    expect(p.total).toBe(p.amount + p.fee);
    expect(p.total).toBeLessThanOrEqual(g.cash);
    expect(g.previewOrder('buy', s.id, max + 1).error).toBe('insufficient-cash');
    const r = g.buy(s.id, max);
    expect(r.ok).toBe(true);
  });

  it("매도 '최대'는 보유 수량 전부, 보유가 없으면 0", () => {
    const g = game();
    const s = g.getStockList()[0]!;
    expect(g.maxQty('sell', s.id)).toBe(0);
    expect(g.previewOrder('sell', s.id, 1).error).toBe('insufficient-shares');
    g.buy(s.id, 7);
    expect(g.maxQty('sell', s.id)).toBe(7);
    const p = g.previewOrder('sell', s.id, 7);
    expect(p.error).toBeNull();
    expect(p.total).toBe(p.amount - p.fee);
  });

  it('미리보기는 상태를 바꾸지 않는다', () => {
    const g = game();
    const s = g.getStockList()[0]!;
    const cash = g.cash;
    g.previewOrder('buy', s.id, 3);
    g.previewOrder('sell', s.id, 3);
    expect(g.cash).toBe(cash);
    expect(g.getPortfolio().holdings).toHaveLength(0);
  });

  it('수량 오류와 없는 종목', () => {
    const g = game();
    const s = g.getStockList()[0]!;
    expect(g.previewOrder('buy', s.id, 0).error).toBe('invalid-quantity');
    expect(g.previewOrder('buy', s.id, 1.5).error).toBe('invalid-quantity');
    expect(g.previewOrder('buy', 'nope', 1).error).toBe('unknown-stock');
    expect(g.maxQty('buy', 'nope')).toBe(0);
  });

  it('시대가 끝나면 거래 불가', () => {
    const g = game();
    const s = g.getStockList()[0]!;
    while (g.phase === 'running') g.advanceTick();
    expect(g.previewOrder('buy', s.id, 1).error).toBe('not-tradable');
  });
});
