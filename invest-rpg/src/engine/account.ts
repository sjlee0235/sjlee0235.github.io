// 계좌: 현금, 보유 종목, 매매 기록, 손익 계산.
//
// - 매수/매도는 "현재가"로만, 정수 주 단위.
// - 수수료 = floor(거래금액 × feeRate). 기본 0.
// - 매수 수수료는 매입원가(costBasis)에 포함 → 평균가·손익이 실제 낸 돈 기준.
// - 보유 목록은 "처음 산 순서"를 유지. 전량 매도 후 다시 사면 맨 뒤로 간다.

export interface Holding {
  stockId: string;
  quantity: number;
  /** 지금 보유분을 사는 데 든 총 금액 (수수료 포함). 일부 매도 시 비율만큼 줄어든다 */
  costBasis: number;
}

export type TradeSide = 'buy' | 'sell';

export interface TradeRecord {
  /** 거래 일련번호 (1부터) */
  seq: number;
  side: TradeSide;
  stockId: string;
  quantity: number;
  price: number;
  /** price × quantity */
  amount: number;
  fee: number;
  /** 매도일 때 실현손익 */
  realizedPnl?: number;
  /** 거래가 일어난 틱 (기록용) */
  tick?: number;
}

export type TradeError =
  | 'invalid-quantity' // 0 이하 또는 정수가 아님
  | 'invalid-price'
  | 'insufficient-cash'
  | 'insufficient-shares';

export type TradeResult = { ok: true; trade: TradeRecord } | { ok: false; error: TradeError };

export interface HoldingView {
  stockId: string;
  quantity: number;
  /** 매수 평균가 = costBasis / quantity */
  avgPrice: number;
  currentPrice: number;
  costBasis: number;
  /** 평가금액 = 현재가 × 수량 */
  marketValue: number;
  /** 미실현손익 금액 = 평가금액 - 매입원가 */
  unrealizedPnl: number;
  /** 미실현손익 % */
  unrealizedPnlPct: number;
}

export interface PortfolioView {
  cash: number;
  /** 처음 산 순서 */
  holdings: HoldingView[];
  totalCostBasis: number;
  totalMarketValue: number;
  totalUnrealizedPnl: number;
  totalUnrealizedPnlPct: number;
  /** 총 자산 = 현금 + 평가금액 */
  totalAssets: number;
}

/** 종목별 누적 성과 (시대 정산용) */
export interface StockPerformance {
  stockId: string;
  /** 이번 시대에 산 총 금액 (수수료 포함) */
  totalBought: number;
  /** 이번 시대 실현손익 합 */
  realizedPnl: number;
}

export function pct(part: number, whole: number): number {
  return whole === 0 ? 0 : (part / whole) * 100;
}

export class Account {
  cash: number;
  readonly feeRate: number;
  /** Map은 넣은 순서를 기억하므로 이것이 곧 "구입 순서"다 */
  private readonly holdings = new Map<string, Holding>();
  private readonly performance = new Map<string, StockPerformance>();
  private readonly trades: TradeRecord[] = [];
  private seq = 0;

  constructor(cash: number, feeRate = 0) {
    this.cash = cash;
    this.feeRate = feeRate;
  }

  feeFor(amount: number): number {
    return Math.floor(amount * this.feeRate);
  }

  /** 지금 현금으로 살 수 있는 최대 수량 */
  maxBuyQuantity(price: number): number {
    if (!(price > 0)) return 0;
    let q = Math.floor(this.cash / price);
    while (q > 0 && q * price + this.feeFor(q * price) > this.cash) q--;
    return q;
  }

  buy(stockId: string, quantity: number, price: number, tick?: number): TradeResult {
    if (!Number.isInteger(quantity) || quantity <= 0) return { ok: false, error: 'invalid-quantity' };
    if (!Number.isInteger(price) || price < 1) return { ok: false, error: 'invalid-price' };
    const amount = price * quantity;
    const fee = this.feeFor(amount);
    if (amount + fee > this.cash) return { ok: false, error: 'insufficient-cash' };

    this.cash -= amount + fee;
    const h = this.holdings.get(stockId);
    if (h) {
      h.quantity += quantity;
      h.costBasis += amount + fee;
    } else {
      this.holdings.set(stockId, { stockId, quantity, costBasis: amount + fee });
    }
    const perf = this.perf(stockId);
    perf.totalBought += amount + fee;

    return { ok: true, trade: this.record({ side: 'buy', stockId, quantity, price, amount, fee, tick }) };
  }

  sell(stockId: string, quantity: number, price: number, tick?: number): TradeResult {
    if (!Number.isInteger(quantity) || quantity <= 0) return { ok: false, error: 'invalid-quantity' };
    if (!Number.isInteger(price) || price < 1) return { ok: false, error: 'invalid-price' };
    const h = this.holdings.get(stockId);
    if (!h || h.quantity < quantity) return { ok: false, error: 'insufficient-shares' };

    const amount = price * quantity;
    const fee = this.feeFor(amount);
    // 전량 매도면 원가 전부, 일부면 비율만큼 (평균가는 그대로 유지)
    const costRemoved = quantity === h.quantity ? h.costBasis : (h.costBasis * quantity) / h.quantity;
    const realizedPnl = amount - fee - costRemoved;

    this.cash += amount - fee;
    h.quantity -= quantity;
    h.costBasis -= costRemoved;
    if (h.quantity === 0) this.holdings.delete(stockId);
    this.perf(stockId).realizedPnl += realizedPnl;

    return {
      ok: true,
      trade: this.record({ side: 'sell', stockId, quantity, price, amount, fee, realizedPnl, tick }),
    };
  }

  /** 보유 종목 전부를 주어진 가격으로 매도 (시대 종료 자동 청산) */
  liquidateAll(prices: ReadonlyMap<string, number>, tick?: number): TradeRecord[] {
    const out: TradeRecord[] = [];
    for (const h of [...this.holdings.values()]) {
      const price = prices.get(h.stockId);
      if (price === undefined) throw new Error(`청산 가격 없음: ${h.stockId}`);
      const r = this.sell(h.stockId, h.quantity, price, tick);
      if (!r.ok) throw new Error(`청산 실패: ${h.stockId} (${r.error})`);
      out.push(r.trade);
    }
    return out;
  }

  /** 보유 목록 (처음 산 순서). 복사본 */
  getHoldings(): Holding[] {
    return [...this.holdings.values()].map((h) => ({ ...h }));
  }

  getQuantity(stockId: string): number {
    return this.holdings.get(stockId)?.quantity ?? 0;
  }

  getTrades(): TradeRecord[] {
    return this.trades.map((t) => ({ ...t }));
  }

  /** 종목별 성과 (처음 거래한 순서) */
  getPerformance(): StockPerformance[] {
    return [...this.performance.values()].map((p) => ({ ...p }));
  }

  /** 계좌를 처음 상태로 되돌린다 (현금 = cash, 보유·거래·성과 기록 모두 삭제) */
  reset(cash: number): void {
    this.cash = cash;
    this.holdings.clear();
    this.performance.clear();
    this.trades.length = 0;
    this.seq = 0;
  }

  /** 새 시대 시작 시 호출: 종목별 성과 기록을 비운다 (현금·거래 기록은 유지) */
  resetPerformance(): void {
    this.performance.clear();
  }

  getPortfolio(prices: ReadonlyMap<string, number>): PortfolioView {
    const holdings: HoldingView[] = [];
    for (const h of this.holdings.values()) {
      const currentPrice = prices.get(h.stockId);
      if (currentPrice === undefined) throw new Error(`현재가 없음: ${h.stockId}`);
      const marketValue = currentPrice * h.quantity;
      const unrealizedPnl = marketValue - h.costBasis;
      holdings.push({
        stockId: h.stockId,
        quantity: h.quantity,
        avgPrice: h.costBasis / h.quantity,
        currentPrice,
        costBasis: h.costBasis,
        marketValue,
        unrealizedPnl,
        unrealizedPnlPct: pct(unrealizedPnl, h.costBasis),
      });
    }
    const totalCostBasis = holdings.reduce((a, h) => a + h.costBasis, 0);
    const totalMarketValue = holdings.reduce((a, h) => a + h.marketValue, 0);
    const totalUnrealizedPnl = totalMarketValue - totalCostBasis;
    return {
      cash: this.cash,
      holdings,
      totalCostBasis,
      totalMarketValue,
      totalUnrealizedPnl,
      totalUnrealizedPnlPct: pct(totalUnrealizedPnl, totalCostBasis),
      totalAssets: this.cash + totalMarketValue,
    };
  }

  totalAssets(prices: ReadonlyMap<string, number>): number {
    return this.getPortfolio(prices).totalAssets;
  }

  private perf(stockId: string): StockPerformance {
    let p = this.performance.get(stockId);
    if (!p) {
      p = { stockId, totalBought: 0, realizedPnl: 0 };
      this.performance.set(stockId, p);
    }
    return p;
  }

  private record(t: Omit<TradeRecord, 'seq'>): TradeRecord {
    const rec: TradeRecord = { seq: ++this.seq, ...t };
    if (rec.tick === undefined) delete rec.tick;
    if (rec.realizedPnl === undefined) delete rec.realizedPnl;
    this.trades.push(rec);
    return { ...rec };
  }
}
