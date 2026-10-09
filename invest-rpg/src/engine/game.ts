// 게임 창구(facade): 화면 코드는 이 Game 하나만 쓰면 된다.
//
// 엔진은 실제 시계를 쓰지 않는다. 화면 쪽 타이머가 10초마다 advanceTick()을 부른다.
//   - 뉴스 팝업이 열려 있으면 advanceTick()은 아무것도 하지 않는다(시간 정지).
//   - 화면은 '확인' 버튼에서 confirmNews()를 부르고, 그때부터 10초 타이머를 새로 시작하면 된다.
//
// 상태(phase)
//   running   : 시간이 흐르는 중. 매매 가능
//   news      : 뉴스 팝업 열림. 시간 정지, 매매 불가
//   era-ended : 시대 종료(720틱). 자동 청산·정산 완료. startNextEra()로 다음 시대
//   finished  : 마지막 시대까지 끝남

import type { Era, News, Stock, Theme } from '../data/schema.ts';
import { Account, type PortfolioView, type TradeError, type TradeRecord } from './account.ts';
import { changeColor, DEFAULT_COLOR_SCHEME, type ChangeColor, type ColorScheme } from './colors.ts';
import { makeConfig, type GameConfig } from './config.ts';
import { settleEra, sortEras, startEraSession, type EraSession, type EraSettlement } from './eraManager.ts';
import type { PricePoint, StockTickChange } from './priceEngine.ts';
import { addFavorite, sortByFavorites, toggleFavorite } from './watchlist.ts';

export type GamePhase = 'running' | 'news' | 'era-ended' | 'finished';

export interface GameOptions {
  eras: readonly Era[];
  seed: number;
  config?: Partial<GameConfig>;
  colorScheme?: ColorScheme;
}

export type AdvanceResult =
  | { advanced: false; phase: GamePhase }
  | {
      advanced: true;
      /** 방금 끝난 틱 */
      tick: number;
      changes: StockTickChange[];
      /** 이 틱이 끝나고 새로 뜬 뉴스 (없으면 null) */
      news: News | null;
      /** 이 틱으로 시대가 끝났으면 정산 결과 */
      settlement: EraSettlement | null;
    };

export type GameTradeError = TradeError | 'unknown-stock' | 'not-tradable';
export type GameTradeResult = { ok: true; trade: TradeRecord } | { ok: false; error: GameTradeError };

export interface StockListItem {
  stock: Stock;
  theme: Theme;
  price: number;
  /** 시대 시작가 */
  openPrice: number;
  /** 시대 시작 대비 변동 (비트) */
  change: number;
  /** 시대 시작 대비 변동률 % */
  changePct: number;
  /** 직전 틱 변동률 % (소수점 1자리) */
  lastTickPct: number;
  /** 시대 시작 대비 등락 색 */
  color: ChangeColor;
  isFavorite: boolean;
  /** 보유 수량 */
  quantity: number;
}

export class Game {
  readonly config: GameConfig;
  readonly seed: number;
  readonly eras: readonly Era[];
  readonly account: Account;
  colorScheme: ColorScheme;
  private session: EraSession;
  private _phase: GamePhase = 'running';
  private readonly _settlements: EraSettlement[] = [];

  constructor(options: GameOptions) {
    if (options.eras.length === 0) throw new Error('시대 데이터가 없음');
    this.config = makeConfig(options.config);
    this.seed = options.seed;
    this.eras = sortEras(options.eras);
    this.colorScheme = options.colorScheme ?? DEFAULT_COLOR_SCHEME;
    this.account = new Account(this.config.startCash, this.config.feeRate);
    this.session = this.beginEra(0);
  }

  // ───────── 상태 조회 ─────────

  get phase(): GamePhase {
    return this._phase;
  }
  get era(): Era {
    return this.session.era;
  }
  get eraIndex(): number {
    return this.session.index;
  }
  /** 이번 시대에서 지난 틱 수 (0 ~ 720) */
  get tick(): number {
    return this.session.prices.tick;
  }
  get remainingTicks(): number {
    return this.config.ticksPerEra - this.tick;
  }
  /** 열려 있는 뉴스 팝업 (없으면 null) */
  get pendingNews(): News | null {
    return this.session.news.pendingNews;
  }
  /** 이번 시대에 지금까지 뜬 뉴스 */
  get shownNews(): News[] {
    return this.session.news.shown;
  }
  get favorites(): readonly string[] {
    return this.session.favorites;
  }
  get settlements(): readonly EraSettlement[] {
    return this._settlements;
  }
  get hasNextEra(): boolean {
    return this.session.index + 1 < this.eras.length;
  }

  // ───────── 시간 진행 ─────────

  /** 한 틱(10초) 진행. 뉴스 팝업 중이거나 시대가 끝났으면 아무것도 안 한다 */
  advanceTick(): AdvanceResult {
    if (this._phase !== 'running') return { advanced: false, phase: this._phase };

    const impacts = this.session.news.consumeQueuedImpacts();
    const { tick, changes } = this.session.prices.step(impacts);

    let settlement: EraSettlement | null = null;
    let news: News | null = null;
    if (tick >= this.config.ticksPerEra) {
      settlement = settleEra(this.session, this.account);
      this._settlements.push(settlement);
      this._phase = 'era-ended';
    } else {
      news = this.session.news.checkTrigger(tick);
      if (news) this._phase = 'news';
    }
    return { advanced: true, tick, changes, news, settlement };
  }

  /** 뉴스 팝업 '확인'. 영향은 다음 advanceTick()에 반영된다 */
  confirmNews(): News {
    if (this._phase !== 'news') throw new Error('열린 뉴스 팝업이 없음');
    const news = this.session.news.confirm();
    this._phase = 'running';
    return news;
  }

  /** 시대 종료 후 다음 시대 시작. 다음 시대가 없으면 finished가 되고 false */
  startNextEra(): boolean {
    if (this._phase !== 'era-ended') throw new Error('시대가 아직 끝나지 않음');
    if (!this.hasNextEra) {
      this._phase = 'finished';
      return false;
    }
    this.session = this.beginEra(this.session.index + 1);
    return true;
  }

  // ───────── 매매 ─────────

  buy(stockId: string, quantity: number): GameTradeResult {
    const check = this.checkTradable(stockId);
    if (check) return { ok: false, error: check };
    const r = this.account.buy(stockId, quantity, this.session.prices.getPrice(stockId), this.tick);
    if (r.ok) this.session.favorites = addFavorite(this.session.favorites, stockId);
    return r;
  }

  sell(stockId: string, quantity: number): GameTradeResult {
    const check = this.checkTradable(stockId);
    if (check) return { ok: false, error: check };
    return this.account.sell(stockId, quantity, this.session.prices.getPrice(stockId), this.tick);
  }

  maxBuyQuantity(stockId: string): number {
    if (!this.session.prices.hasStock(stockId)) return 0;
    return this.account.maxBuyQuantity(this.session.prices.getPrice(stockId));
  }

  // ───────── 목록·차트·계좌 ─────────

  toggleFavorite(stockId: string): void {
    if (!this.session.prices.hasStock(stockId)) throw new Error(`없는 종목: ${stockId}`);
    this.session.favorites = toggleFavorite(this.session.favorites, stockId);
  }

  /** 종목 목록 (즐겨찾기 우선 정렬) */
  getStockList(): StockListItem[] {
    const { era, prices, favorites } = this.session;
    const themes = new Map(era.themes.map((t) => [t.id, t]));
    const items = era.stocks.map((stock): StockListItem => {
      const s = prices.getState(stock.id);
      const change = s.price - s.openPrice;
      return {
        stock,
        theme: themes.get(stock.themeId)!,
        price: s.price,
        openPrice: s.openPrice,
        change,
        changePct: (change / s.openPrice) * 100,
        lastTickPct: s.lastRate / 10,
        color: changeColor(change, this.colorScheme),
        isFavorite: favorites.includes(stock.id),
        quantity: this.account.getQuantity(stock.id),
      };
    });
    return sortByFavorites(items, favorites, (it) => it.stock.id);
  }

  getPortfolio(): PortfolioView {
    return this.account.getPortfolio(this.session.prices.getPrices());
  }

  /** 최근 20분(120개) 가격 이력. 시대 초반엔 있는 만큼만 */
  getChart(stockId: string): PricePoint[] {
    return this.session.prices.getHistory(stockId);
  }

  getPrice(stockId: string): number {
    return this.session.prices.getPrice(stockId);
  }

  // ───────── 내부 ─────────

  private beginEra(index: number): EraSession {
    const era = this.eras[index]!;
    this.account.resetPerformance();
    const session = startEraSession(era, index, this.seed, this.account.cash, this.config);
    this.session = session;
    this._phase = 'running';
    // 시대 시작(틱 0)에도 뉴스 시점이면 첫 뉴스가 뜬다
    if (session.news.checkTrigger(0)) this._phase = 'news';
    return session;
  }

  private checkTradable(stockId: string): GameTradeError | null {
    if (this._phase !== 'running') return 'not-tradable';
    if (!this.session.prices.hasStock(stockId)) return 'unknown-stock';
    return null;
  }
}
