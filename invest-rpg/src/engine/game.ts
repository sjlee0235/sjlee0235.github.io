// 게임 창구(facade): 화면 코드는 이 Game 하나만 쓰면 된다.
//
// 엔진은 실제 시계를 쓰지 않는다. 화면 쪽 타이머가 5초마다 advanceTick()을 부른다.
// - 뉴스가 떠도 시간은 멈추지 않는다. (튜토리얼만 pauseOnNews로 예외)
// - 뉴스 발표(틱 k): 영향의 75%가 그 순간 바로 반영(instantChanges) → 틱 k+1에 나머지 반영 → 틱 k+2, k+3 관성 → 일반 움직임
// - 뉴스 발표 120초 뒤 해설 알림(recap)이 AdvanceResult.recaps로 나온다
//
// 상태(phase)
//   running   : 시간이 흐르는 중
//   news      : (튜토리얼 전용) 뉴스 팝업 열림, 시간 정지
//   era-ended : 시대 종료. 자동 청산·정산 완료. startNextEra()로 다음 시대
//   finished  : 마지막 시대까지 끝남
// suspend()   : 앱이 백그라운드로 갔을 때. 틱·뉴스·해설 타이머·매매 모두 정지, resume()으로 재개

import type { Era, LinkStrength, LocalizedText, News, Stock, Theme } from '../data/schema.ts';
import { effectKind } from '../data/schema.ts';
import { Account, type PortfolioView, type TradeError, type TradeRecord } from './account.ts';
import { changeColor, DEFAULT_COLOR_SCHEME, type ChangeColor, type ColorScheme } from './colors.ts';
import { getTickRules, makeConfig, type GameConfig, type TickRules } from './config.ts';
import type { ActiveEra, EraDraw } from './eraDraw.ts';
import { settleEra, sortEras, startEraSession, type EraSession, type EraSettlement } from './eraManager.ts';
import type { NewsTag, ScheduledKind, ScheduledNews } from './newsEngine.ts';
import type { PricePoint, StockTickChange } from './priceEngine.ts';
import { buildRecap, type RecapNotice } from './recap.ts';
import {
  balanceHash, ENGINE_VERSION, TELEMETRY_SCHEMA_VERSION,
  type AppEventMap, type AppEventType, type DecisionContext, type EngineEventMap, type StockRate,
  type TelemetryEvent, type TelemetrySink,
} from './telemetry.ts';
import { addFavorite, sortByFavorites, toggleFavorite } from './watchlist.ts';

export type GamePhase = 'running' | 'news' | 'era-ended' | 'finished';

export interface GameOptions {
  eras: readonly Era[];
  seed: number;
  config?: Partial<GameConfig>;
  colorScheme?: ColorScheme;
  /** 처음 시작할 시대 순번과 그때의 자금 (세이브 불러오기용) */
  startEraIndex?: number;
  startCash?: number;
  /** 저장된 시대별 추첨 결과 (시대 id → 추첨) */
  draws?: Readonly<Record<string, EraDraw>>;
  /** (튜토리얼) 뉴스가 뜨면 시간 정지 */
  pauseOnNews?: boolean;
  /** (튜토리얼) 고정 뉴스 일정 */
  fixedSchedule?: (active: ActiveEra) => ScheduledNews[];
  /** 플레이 기록을 받을 곳 (없으면 기록하지 않음). telemetry.ts 참고 */
  telemetry?: TelemetrySink;
  /** 기록에 남길 모드 (기본 main) */
  telemetryMode?: 'main' | 'tutorial';
  /** 세이브에서 이어 하기인가 (기록용) */
  restored?: boolean;
}

/** 시대 동안 모으는 기록용 통계 */
interface EraStats {
  peak: number;
  trough: number;
  maxDrawdownPct: number;
  investedTicks: number;
  ticks: number;
  buys: number;
  sells: number;
  fees: number;
  /** 종목별 현재 포지션을 처음 산 틱 */
  firstBuyTick: Map<string, number>;
}

export interface OrderFill {
  side: 'buy' | 'sell';
  stockId: string;
  quantity: number;
  result: GameTradeResult;
}

export type AdvanceResult =
  | { advanced: false; phase: GamePhase; suspended: boolean }
  | {
      advanced: true;
      tick: number;
      changes: StockTickChange[];
      /** 이 틱이 끝나고 새로 뜬 뉴스 */
      news: ScheduledNews | null;
      /** 뉴스 발표 순간 바로 반영된 가격 변화 (뉴스가 없으면 빈 배열) */
      instantChanges: StockTickChange[];
      /** 이 틱에 만들어진 해설 알림 */
      recaps: RecapNotice[];
      /** (주문 지연 옵션) 이 틱에 체결된 주문 */
      fills: OrderFill[];
      settlement: EraSettlement | null;
    };

export type GameTradeError = TradeError | 'unknown-stock' | 'not-tradable';
export type GameTradeResult =
  | { ok: true; trade: TradeRecord }
  | { ok: true; queued: true; executeTick: number }
  | { ok: false; error: GameTradeError };

export interface StockListItem {
  stock: Stock;
  theme: Theme;
  price: number;
  openPrice: number;
  change: number;
  changePct: number;
  lastTickPct: number;
  color: ChangeColor;
  isFavorite: boolean;
  quantity: number;
}

export interface RelatedTheme {
  themeId: string;
  name: LocalizedText;
  direction: 'positive' | 'negative';
  strength: LinkStrength;
  kind: 'direct' | 'indirect';
}

/** 뉴스 팝업 화면용 데이터 */
export interface NewsPopup {
  news: News;
  kind: ScheduledKind;
  tag: NewsTag;
  /** false면 "가상 시나리오" 태그 */
  isHistorical: boolean;
  relatedThemes: RelatedTheme[];
  reactionNote?: LocalizedText;
  relatedTentativeId?: string;
}

export interface NewsArchiveEntry {
  tick: number;
  elapsedSeconds: number;
  kind: ScheduledKind;
  tag: NewsTag;
  isHistorical: boolean;
  news: News;
  /** 영향 테마별 연결 강도 */
  effects: { themeId: string; strength: LinkStrength; kind: 'direct' | 'indirect' }[];
  relatedTentativeId?: string;
  /** 해설 알림 (발표 120초 뒤에 생김) */
  recap?: RecapNotice;
}

interface PendingOrder {
  executeTick: number;
  side: 'buy' | 'sell';
  stockId: string;
  quantity: number;
}

export class Game {
  readonly config: GameConfig;
  readonly rules: TickRules;
  readonly seed: number;
  readonly eras: readonly Era[];
  readonly account: Account;
  colorScheme: ColorScheme;
  private session: EraSession;
  private _phase: GamePhase = 'running';
  private _suspended = false;
  private readonly _settlements: EraSettlement[] = [];
  private readonly options: GameOptions;
  /** 뉴스 id → (종목 id → 실제 적용된 변동률) */
  private applied = new Map<string, Map<string, number>>();
  private pendingRecaps: { tick: number; scheduled: ScheduledNews }[] = [];
  private recaps = new Map<string, RecapNotice>();
  private orders: PendingOrder[] = [];
  private readonly _draws: Record<string, EraDraw> = {};
  private readonly telemetry: TelemetrySink | null;
  private telemetrySeq = 0;
  private stats: EraStats = Game.emptyStats(0);

  constructor(options: GameOptions) {
    if (options.eras.length === 0) throw new Error('시대 데이터가 없음');
    this.options = options;
    this.config = makeConfig(options.config);
    this.rules = getTickRules(this.config);
    this.seed = options.seed;
    this.eras = sortEras(options.eras);
    this.colorScheme = options.colorScheme ?? DEFAULT_COLOR_SCHEME;
    this.account = new Account(options.startCash ?? this.config.startCash, this.config.feeRate);
    this.telemetry = options.telemetry ?? null;
    const startEraIndex = options.startEraIndex ?? 0;
    if (this.telemetry) {
      this.emitRaw('game_start', this.eras[startEraIndex]?.id ?? '', startEraIndex, 0, {
        mode: options.telemetryMode ?? 'main',
        seed: this.seed,
        engineVersion: ENGINE_VERSION,
        balanceHash: balanceHash(this.config),
        startCash: this.account.cash,
        startEraIndex,
        restored: options.restored ?? false,
      });
    }
    this.session = this.beginEra(startEraIndex);
  }

  // ───────── 상태 조회 ─────────

  get phase(): GamePhase {
    return this._phase;
  }
  get isSuspended(): boolean {
    return this._suspended;
  }
  get era(): Era {
    return this.session.era;
  }
  get eraIndex(): number {
    return this.session.index;
  }
  /** 이번 시대 추첨 결과 */
  get draw(): EraDraw {
    return this.session.draw;
  }
  /** 지금까지 시작한 시대들의 추첨 결과 (세이브용) */
  get draws(): Readonly<Record<string, EraDraw>> {
    return this._draws;
  }
  /** 이번 판 활성 테마·종목 */
  get activeThemes(): Theme[] {
    return this.session.active.themes;
  }
  get activeStocks(): Stock[] {
    return this.session.active.stocks;
  }
  get tick(): number {
    return this.session.prices.tick;
  }
  get remainingTicks(): number {
    return this.rules.ticksPerEra - this.tick;
  }
  get elapsedSeconds(): number {
    return this.tick * this.config.tickSeconds;
  }
  /** 이번 시대 시작 자금 */
  get eraStartCash(): number {
    return this.session.startCash;
  }
  /** (튜토리얼) 열려 있는 뉴스 팝업 */
  get pendingNews(): ScheduledNews | null {
    return this.session.news.pendingNews;
  }
  get shownNews(): ScheduledNews[] {
    return this.session.news.shown;
  }
  /** 이번 시대 뉴스 일정 (테스트·시뮬레이션용. 화면에 미리 보여주면 안 됨) */
  get newsSchedule(): readonly ScheduledNews[] {
    return this.session.news.schedule;
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

  advanceTick(): AdvanceResult {
    if (this._suspended || this._phase !== 'running') {
      return { advanced: false, phase: this._phase, suspended: this._suspended };
    }
    const nextTick = this.tick + 1;
    const due = this.session.news.consumeRatesFor(nextTick);
    const merged = new Map<string, number>();
    for (const d of due) for (const [k, v] of d.rates) merged.set(k, (merged.get(k) ?? 0) + v);
    const { tick, changes } = this.session.prices.step(merged.size > 0 ? merged : undefined);

    for (const d of due) {
      this.recordApplied(d.newsId, d.rates, changes);
      if (this.telemetry) this.emit('news_reacted', { newsId: d.newsId, applied: this.stockRates(d.rates, changes) });
    }

    const fills = this.executeOrders(tick);

    let news: ScheduledNews | null = null;
    let instantChanges: StockTickChange[] = [];
    if (tick < this.rules.ticksPerEra) {
      news = this.session.news.checkTrigger(tick);
      if (news) {
        this.session.prices.markNewsPublished();
        const instant = this.session.news.consumeInstant();
        if (instant) {
          instantChanges = this.session.prices.applyInstant(instant.rates);
          this.recordApplied(instant.newsId, instant.rates, instantChanges);
        }
        if (this.telemetry) {
          this.emit('news_published', {
            newsId: news.news.id,
            kind: news.kind,
            storyId: news.storyId ?? null,
            followedLean: news.followedLean ?? null,
            isHistorical: news.isHistorical,
            magnitude: news.news.magnitude,
            effects: news.news.effects.map((e) => ({ themeId: e.themeId, impact: e.impact, strength: e.link.strength })),
            instant: this.stockRates(instant?.rates ?? new Map(), instantChanges),
          });
        }
        const recapTick = tick + this.rules.recapDelayTicks;
        if (recapTick <= this.rules.ticksPerEra) this.pendingRecaps.push({ tick: recapTick, scheduled: news });
        if (this.options.pauseOnNews) this._phase = 'news';
      }
    }

    const recaps: RecapNotice[] = [];
    for (const p of this.pendingRecaps.filter((r) => r.tick === tick)) {
      const notice = buildRecap(
        p.scheduled,
        this.applied.get(p.scheduled.news.id) ?? new Map(),
        this.session.active.stocks,
        new Map(this.session.active.themes.map((t) => [t.id, t])),
        tick,
        this.config.recapMaxItems,
      );
      this.recaps.set(notice.newsId, notice);
      recaps.push(notice);
      if (this.telemetry) this.emit('recap_created', { newsId: notice.newsId, stockIds: notice.items.map((i) => i.stockId) });
    }
    this.pendingRecaps = this.pendingRecaps.filter((r) => r.tick !== tick);

    if (this.telemetry) this.updateStats(tick);

    let settlement: EraSettlement | null = null;
    if (tick >= this.rules.ticksPerEra) {
      const contexts = this.telemetry
        ? new Map(this.account.getHoldings().map((h) => [h.stockId, this.decisionContext(h.stockId)]))
        : null;
      settlement = settleEra(this.session, this.account);
      this._settlements.push(settlement);
      this._phase = 'era-ended';
      if (contexts) {
        for (const t of settlement.liquidations) this.emitTrade(t, contexts.get(t.stockId)!, true);
        const st = this.stats;
        this.emit('era_end', {
          endAssets: settlement.endAssets,
          returnPct: settlement.returnPct,
          trades: st.buys + st.sells,
          buys: st.buys,
          sells: st.sells,
          feesPaid: st.fees,
          peakAssets: st.peak,
          troughAssets: st.trough,
          maxDrawdownPct: st.maxDrawdownPct,
          investedShare: st.ticks === 0 ? 0 : st.investedTicks / st.ticks,
        });
      }
    }
    return { advanced: true, tick, changes, news, instantChanges, recaps, fills, settlement };
  }

  suspend(): void {
    if (!this._suspended && this.telemetry) this.emit('suspended', {});
    this._suspended = true;
  }

  resume(): void {
    if (this._suspended && this.telemetry) this.emit('resumed', {});
    this._suspended = false;
  }

  /**
   * 화면(앱) 이벤트 기록. 예) 뉴스 팝업을 닫을 때 game.track('news_popup', { newsId, dwellMs, closedBy })
   * clientMs는 실제 시각(앱이 Date.now() 등으로 넣는다. 엔진은 시계를 쓰지 않음)
   */
  track<K extends AppEventType>(type: K, data: AppEventMap[K], clientMs?: number): void {
    if (!this.telemetry) return;
    this.emitRaw(type, this.session.era.id, this.session.index, this.tick, data, clientMs);
  }

  /** (튜토리얼) 뉴스 팝업 '확인'. 1틱(5초) 뒤 반영 */
  confirmNews(): ScheduledNews {
    if (this._phase !== 'news') throw new Error('열린 뉴스 팝업이 없음');
    const s = this.session.news.confirm(this.tick);
    this._phase = 'running';
    return s;
  }

  startNextEra(): boolean {
    if (this._phase !== 'era-ended') throw new Error('시대가 아직 끝나지 않음');
    if (!this.hasNextEra) {
      this._phase = 'finished';
      return false;
    }
    this.session = this.beginEra(this.session.index + 1);
    return true;
  }

  // ───────── 뉴스 팝업·해설·보관함 ─────────

  getNewsPopup(s: ScheduledNews): NewsPopup {
    const themes = new Map(this.session.era.themes.map((t) => [t.id, t]));
    const popup: NewsPopup = {
      news: s.news,
      kind: s.kind,
      tag: s.tag,
      isHistorical: s.isHistorical,
      relatedThemes: s.news.effects.map((e) => ({
        themeId: e.themeId,
        name: themes.get(e.themeId)!.name,
        direction: e.impact > 0 ? 'positive' : 'negative',
        strength: e.link.strength,
        kind: effectKind(e),
      })),
    };
    if (s.news.reactionNote) popup.reactionNote = s.news.reactionNote;
    if (s.relatedTentativeId) popup.relatedTentativeId = s.relatedTentativeId;
    return popup;
  }

  /** 뉴스 보관함: 지금까지 뜬 뉴스와 (있으면) 해설 알림 */
  getNewsArchive(): NewsArchiveEntry[] {
    return this.session.news.shown.map((s) => {
      const entry: NewsArchiveEntry = {
        tick: s.tick,
        elapsedSeconds: s.tick * this.config.tickSeconds,
        kind: s.kind,
        tag: s.tag,
        isHistorical: s.isHistorical,
        news: s.news,
        effects: s.news.effects.map((e) => ({ themeId: e.themeId, strength: e.link.strength, kind: effectKind(e) })),
      };
      if (s.relatedTentativeId) entry.relatedTentativeId = s.relatedTentativeId;
      const recap = this.recaps.get(s.news.id);
      if (recap) entry.recap = recap;
      return entry;
    });
  }

  // ───────── 매매 ─────────

  buy(stockId: string, quantity: number): GameTradeResult {
    return this.order('buy', stockId, quantity);
  }

  sell(stockId: string, quantity: number): GameTradeResult {
    return this.order('sell', stockId, quantity);
  }

  maxBuyQuantity(stockId: string): number {
    if (!this.session.prices.hasStock(stockId)) return 0;
    return this.account.maxBuyQuantity(this.session.prices.getPrice(stockId));
  }

  // ───────── 목록·차트·계좌 ─────────

  toggleFavorite(stockId: string): void {
    if (!this.session.prices.hasStock(stockId)) throw new Error(`없는 종목: ${stockId}`);
    this.session.favorites = toggleFavorite(this.session.favorites, stockId);
    if (this.telemetry) this.emit('favorite_toggled', { stockId, on: this.session.favorites.includes(stockId) });
  }

  getStockList(): StockListItem[] {
    const { active, prices, favorites } = this.session;
    const themes = new Map(active.themes.map((t) => [t.id, t]));
    const items = active.stocks.map((stock): StockListItem => {
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

  getChart(stockId: string): PricePoint[] {
    return this.session.prices.getHistory(stockId);
  }

  getPrice(stockId: string): number {
    return this.session.prices.getPrice(stockId);
  }

  // ───────── 내부 ─────────

  /** 뉴스별로 실제 적용된 변동률 기록 (해설 알림용) */
  private recordApplied(newsId: string, rates: ReadonlyMap<string, number>, changes: readonly StockTickChange[]): void {
    const map = this.applied.get(newsId) ?? new Map<string, number>();
    for (const ch of changes) {
      if (ch.cause !== 'news' && ch.cause !== 'instant') continue;
      if (rates.has(this.themeOf(ch.stockId))) map.set(ch.stockId, (map.get(ch.stockId) ?? 0) + ch.rate);
    }
    this.applied.set(newsId, map);
  }

  private themeOf(stockId: string): string {
    return this.session.prices.getState(stockId).themeId;
  }

  private beginEra(index: number): EraSession {
    const era = this.eras[index];
    if (!era) throw new Error(`없는 시대 순번: ${index}`);
    this.account.resetPerformance();
    this.applied = new Map();
    this.pendingRecaps = [];
    this.recaps = new Map();
    this.orders = [];
    this.stats = Game.emptyStats(this.account.cash);
    const session = startEraSession(era, index, this.seed, this.config, this.account.cash, {
      ...(this.options.draws?.[era.id] ? { draw: this.options.draws[era.id] } : {}),
      ...(this.options.pauseOnNews ? { pauseOnNews: true } : {}),
      ...(this.options.fixedSchedule ? { fixedSchedule: this.options.fixedSchedule } : {}),
    });
    this._draws[era.id] = session.draw;
    this.session = session;
    this._phase = 'running';
    if (this.telemetry) {
      const core = new Set(era.themes.filter((t) => t.relevance === 'core').map((t) => t.id));
      this.emit('era_start', {
        startCash: session.startCash,
        drawAttempt: session.draw.attempt,
        drawOk: session.draw.ok,
        activeThemeIds: [...session.draw.activeThemeIds],
        coreCount: session.draw.activeThemeIds.filter((id) => core.has(id)).length,
        usableBreaking: session.draw.usableBreaking,
        usableStories: session.draw.usableStories,
      });
    }
    return session;
  }

  private checkTradable(stockId: string): GameTradeError | null {
    // 튜토리얼에서는 뉴스 팝업으로 시간이 멈춘 동안에도 매매할 수 있다
    if (this._suspended || this._phase === 'era-ended' || this._phase === 'finished') return 'not-tradable';
    if (!this.session.prices.hasStock(stockId)) return 'unknown-stock';
    return null;
  }

  private order(side: 'buy' | 'sell', stockId: string, quantity: number): GameTradeResult {
    const check = this.checkTradable(stockId);
    if (check) {
      if (this.telemetry) this.emit('trade_rejected', { side, stockId, quantity, error: check });
      return { ok: false, error: check };
    }
    if (this.config.orderDelayTicks > 0) {
      const executeTick = this.tick + this.config.orderDelayTicks;
      this.orders.push({ executeTick, side, stockId, quantity });
      return { ok: true, queued: true, executeTick };
    }
    return this.execute(side, stockId, quantity);
  }

  private execute(side: 'buy' | 'sell', stockId: string, quantity: number): GameTradeResult {
    const price = this.session.prices.getPrice(stockId);
    const context = this.telemetry ? this.decisionContext(stockId) : null;
    const r = side === 'buy' ? this.account.buy(stockId, quantity, price, this.tick) : this.account.sell(stockId, quantity, price, this.tick);
    if (r.ok && side === 'buy') this.session.favorites = addFavorite(this.session.favorites, stockId);
    if (context) {
      if (r.ok) this.emitTrade(r.trade, context, false);
      else this.emit('trade_rejected', { side, stockId, quantity, error: r.error });
    }
    return r;
  }

  // ───────── 기록(텔레메트리) 내부 ─────────

  private static emptyStats(assets: number): EraStats {
    return {
      peak: assets, trough: assets, maxDrawdownPct: 0, investedTicks: 0, ticks: 0,
      buys: 0, sells: 0, fees: 0, firstBuyTick: new Map(),
    };
  }

  private emitRaw(type: string, eraId: string, eraIndex: number, tick: number, data: unknown, clientMs?: number): void {
    const event = { v: TELEMETRY_SCHEMA_VERSION, seq: ++this.telemetrySeq, type, eraId, eraIndex, tick, data } as TelemetryEvent;
    if (clientMs !== undefined) event.clientMs = clientMs;
    this.telemetry!.record(event);
  }

  private emit<K extends keyof EngineEventMap>(type: K, data: EngineEventMap[K]): void {
    this.emitRaw(type, this.session.era.id, this.session.index, this.tick, data);
  }

  private stockRates(rates: ReadonlyMap<string, number>, changes: readonly StockTickChange[]): StockRate[] {
    const out: StockRate[] = [];
    for (const ch of changes) {
      if ((ch.cause !== 'news' && ch.cause !== 'instant') || !rates.has(this.themeOf(ch.stockId))) continue;
      const r: StockRate = { stockId: ch.stockId, rate: ch.rate };
      if (ch.requestedRate !== undefined && ch.requestedRate !== ch.rate) r.requested = ch.requestedRate;
      out.push(r);
    }
    return out;
  }

  private updateStats(tick: number): void {
    const st = this.stats;
    const assets = this.account.totalAssets(this.session.prices.getPrices());
    st.ticks++;
    if (this.account.getHoldings().length > 0) st.investedTicks++;
    st.peak = Math.max(st.peak, assets);
    st.trough = Math.min(st.trough, assets);
    st.maxDrawdownPct = Math.max(st.maxDrawdownPct, st.peak === 0 ? 0 : ((st.peak - assets) / st.peak) * 100);
    if (tick % this.rules.windowTicks === 0) {
      const holdings = this.account.getHoldings();
      this.emit('asset_snapshot', {
        cash: this.account.cash,
        holdingsValue: assets - this.account.cash,
        positions: holdings.length,
      });
    }
  }

  /** 매매 순간의 상황 (DecisionContext) */
  private decisionContext(stockId: string): DecisionContext {
    const shown = this.session.news.shown;
    const last = shown.at(-1) ?? null;
    const themeId = this.themeOf(stockId);
    const link = last?.news.effects.find((e) => e.themeId === themeId);
    // 결과가 아직 안 나온 잠정 뉴스
    let open: ScheduledNews | null = null;
    for (const s of shown) {
      if (s.kind === 'tentative') open = s;
      else if (s.kind === 'outcome' && open && s.storyId === open.storyId) open = null;
    }
    const storyEffect = open?.news.effects.find((e) => e.themeId === themeId);
    const state = this.session.prices.getState(stockId);
    const back = state.history.find((p) => p.tick >= this.tick - this.rules.windowTicks) ?? state.history[0]!;
    return {
      lastNewsId: last?.news.id ?? null,
      ticksSinceNews: last ? this.tick - last.tick : null,
      newsLink: link ? { impact: link.impact, strength: link.link.strength } : null,
      openStoryId: open?.storyId ?? null,
      storyLink: storyEffect?.impact ?? null,
      eraChangePct: ((state.price - state.openPrice) / state.openPrice) * 100,
      recentChangePct: ((state.price - back.price) / back.price) * 100,
      assetsBefore: this.account.totalAssets(this.session.prices.getPrices()),
    };
  }

  private emitTrade(t: TradeRecord, context: DecisionContext, auto: boolean): void {
    const st = this.stats;
    st.fees += t.fee;
    if (!auto) {
      if (t.side === 'buy') st.buys++;
      else st.sells++;
    }
    const quantityAfter = this.account.getQuantity(t.stockId);
    let holdTicks: number | null = null;
    if (t.side === 'buy') {
      if (!st.firstBuyTick.has(t.stockId)) st.firstBuyTick.set(t.stockId, this.tick);
    } else {
      const first = st.firstBuyTick.get(t.stockId);
      holdTicks = first === undefined ? null : this.tick - first;
      if (quantityAfter === 0) st.firstBuyTick.delete(t.stockId);
    }
    this.emit('trade', {
      side: t.side,
      stockId: t.stockId,
      themeId: this.themeOf(t.stockId),
      quantity: t.quantity,
      price: t.price,
      fee: t.fee,
      cashAfter: this.account.cash,
      quantityAfter,
      realizedPnl: t.realizedPnl ?? null,
      holdTicks,
      auto,
      context,
    });
  }

  private executeOrders(tick: number): OrderFill[] {
    const due = this.orders.filter((o) => o.executeTick === tick);
    this.orders = this.orders.filter((o) => o.executeTick !== tick);
    return due.map((o) => ({ side: o.side, stockId: o.stockId, quantity: o.quantity, result: this.execute(o.side, o.stockId, o.quantity) }));
  }
}
