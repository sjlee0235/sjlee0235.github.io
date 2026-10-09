// 게임 창구(facade): 화면 코드는 이 Game 하나만 쓰면 된다.
//
// 엔진은 실제 시계를 쓰지 않는다. 화면 쪽 타이머가 5초마다 advanceTick()을 부른다.
//
// 모드
//   practice(연습): 시대를 골라 30분짜리 한 판. 매 판 10,000 비트로 시작(이월 없음).
//                   뉴스가 뜨면 phase가 'news'가 되어 시간 정지. getNewsPopup()으로 관련 테마·해설을 보여주고,
//                   '확인'에서 confirmNews() → 그때부터 10초 뒤 반영. 광고 보상 가능(판당 3회).
//   real(실전)    : 시대당 2시간, 2000s → 2010s → 2020s 순서, 자금 이월.
//                   뉴스가 떠도 시간은 계속 흐르고, 뉴스가 뜬 뒤 10초 뒤 반영.
//
// 상태(phase)
//   running   : 시간이 흐르는 중. 매매 가능
//   news      : (연습 전용) 뉴스 팝업 열림. 시간 정지, 매매 불가
//   era-ended : 시대(판) 종료. 자동 청산·정산 완료
//   finished  : (실전) 마지막 시대까지 끝남
// suspend()   : 앱이 백그라운드로 갔을 때. 틱·뉴스 타이머·매매 모두 정지, resume()으로 재개

import { MARKET_THEME_ID, type EffectLink, type Era, type LocalizedText, type News, type Stock, type Theme } from '../data/schema.ts';
import type { PortfolioView, TradeError, TradeRecord } from './account.ts';
import type { Account } from './account.ts';
import { grantAdReward, remainingAdRewards, watchAdForReward, type AdRewardResult, type AdRewardService } from './adReward.ts';
import { changeColor, DEFAULT_COLOR_SCHEME, type ChangeColor, type ColorScheme } from './colors.ts';
import { getTickRules, makeConfig, type GameConfig, type GameMode, type TickRules } from './config.ts';
import { settleEra, sortEras, startEraSession, type EraSession, type EraSettlement } from './eraManager.ts';
import type { NewsKind, NewsTag, ScheduledNews } from './newsEngine.ts';
import type { PricePoint, StockTickChange } from './priceEngine.ts';
import { beginRealEra, createWallet, resetPracticeWallet, type RealWallet, type Wallet } from './wallet.ts';
import { addFavorite, sortByFavorites, toggleFavorite } from './watchlist.ts';

export type GamePhase = 'running' | 'news' | 'era-ended' | 'finished';

export interface GameOptions<M extends GameMode> {
  eras: readonly Era[];
  seed: number;
  mode: M;
  /** 연습 모드에서 플레이할 시대 id (기본: 첫 시대) */
  eraId?: string;
  config?: Partial<GameConfig>;
  colorScheme?: ColorScheme;
}

export type AdvanceResult =
  | { advanced: false; phase: GamePhase; suspended: boolean }
  | {
      advanced: true;
      /** 방금 끝난 틱 */
      tick: number;
      changes: StockTickChange[];
      /** 이 틱이 끝나고 새로 뜬 뉴스 (없으면 null) */
      news: ScheduledNews | null;
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

export interface RelatedTheme {
  /** 테마 id 또는 "market" */
  themeId: string;
  name: LocalizedText;
  direction: 'positive' | 'negative';
  link: EffectLink;
}

/** 뉴스 팝업·보관함 화면용 데이터 */
export interface NewsPopup {
  news: News;
  kind: NewsKind;
  tag: NewsTag;
  /** false면 "가상 시나리오" 태그를 붙인다 */
  isHistorical: boolean;
  /** '관련 테마' (긍정/부정 구분) */
  relatedThemes: RelatedTheme[];
  /** '해설 보기' 내용 (연습 모드 뉴스는 항상 있음) */
  explanation?: LocalizedText;
  /** 결과 뉴스가 예상과 반대로 반응할 때의 한 줄 해설 */
  reactionNote?: LocalizedText;
  /** 몇 초 뒤 주가에 반영되는지 */
  appliesInSeconds: number;
}

export interface NewsArchiveEntry {
  tick: number;
  /** 판 시작 후 몇 초에 떴는지 */
  elapsedSeconds: number;
  kind: NewsKind;
  tag: NewsTag;
  isHistorical: boolean;
  storylineId?: string;
  news: News;
}

const MARKET_NAME: LocalizedText = { ko: '시장 전체', en: 'Whole market' };

export class Game<M extends GameMode = GameMode> {
  readonly config: GameConfig;
  readonly rules: TickRules;
  readonly seed: number;
  readonly mode: M;
  readonly eras: readonly Era[];
  readonly wallet: Wallet<M>;
  colorScheme: ColorScheme;
  private session: EraSession;
  private _phase: GamePhase = 'running';
  private _suspended = false;
  private round = 0;
  private readonly _settlements: EraSettlement[] = [];

  constructor(options: GameOptions<M>) {
    if (options.eras.length === 0) throw new Error('시대 데이터가 없음');
    this.config = makeConfig(options.config);
    this.mode = options.mode;
    this.rules = getTickRules(this.config, this.mode);
    this.seed = options.seed;
    this.eras = sortEras(options.eras);
    this.colorScheme = options.colorScheme ?? DEFAULT_COLOR_SCHEME;
    this.wallet = createWallet(options.mode, this.config);
    this.session = this.beginEra(this.eraIndexOf(options.eraId));
  }

  // ───────── 상태 조회 ─────────

  get phase(): GamePhase {
    return this._phase;
  }
  get isSuspended(): boolean {
    return this._suspended;
  }
  get account(): Account {
    return this.wallet.account;
  }
  get era(): Era {
    return this.session.era;
  }
  get eraIndex(): number {
    return this.session.index;
  }
  /** 이번 시대(판)에서 지난 틱 수 */
  get tick(): number {
    return this.session.prices.tick;
  }
  get remainingTicks(): number {
    return this.rules.ticksPerEra - this.tick;
  }
  /** 이번 시대(판)에서 흐른 게임 시간(초) */
  get elapsedSeconds(): number {
    return this.tick * this.config.tickSeconds;
  }
  /** (연습 모드) 열려 있는 뉴스 팝업 (없으면 null) */
  get pendingNews(): ScheduledNews | null {
    return this.session.news.pendingNews;
  }
  /** 이번 시대에 지금까지 뜬 뉴스 */
  get shownNews(): ScheduledNews[] {
    return this.session.news.shown;
  }
  get favorites(): readonly string[] {
    return this.session.favorites;
  }
  get settlements(): readonly EraSettlement[] {
    return this._settlements;
  }
  /** (실전) 다음 시대가 있는가 */
  get hasNextEra(): boolean {
    return this.mode === 'real' && this.session.index + 1 < this.eras.length;
  }

  // ───────── 시간 진행 ─────────

  /** 한 틱(5초) 진행. 일시정지·연습 모드 팝업 중·시대 종료 후에는 아무것도 안 한다 */
  advanceTick(): AdvanceResult {
    if (this._suspended || this._phase !== 'running') {
      return { advanced: false, phase: this._phase, suspended: this._suspended };
    }
    const rates = this.session.news.consumeRatesFor(this.tick + 1);
    const { tick, changes } = this.session.prices.step(rates);

    let settlement: EraSettlement | null = null;
    let news: ScheduledNews | null = null;
    if (tick >= this.rules.ticksPerEra) {
      settlement = settleEra(this.session, this.wallet);
      this._settlements.push(settlement);
      this._phase = 'era-ended';
    } else {
      news = this.session.news.checkTrigger(tick);
      if (news && this.mode === 'practice') this._phase = 'news';
    }
    return { advanced: true, tick, changes, news, settlement };
  }

  /** 앱이 백그라운드로 갈 때: 틱·뉴스 타이머·매매 모두 정지 */
  suspend(): void {
    this._suspended = true;
  }

  /** 다시 앱으로 돌아왔을 때 */
  resume(): void {
    this._suspended = false;
  }

  /** (연습 모드) 뉴스 팝업 '확인'. 영향은 10초 뒤(2틱 뒤)에 반영된다 */
  confirmNews(): ScheduledNews {
    if (this._phase !== 'news') throw new Error('열린 뉴스 팝업이 없음');
    const s = this.session.news.confirm(this.tick);
    this._phase = 'running';
    return s;
  }

  /** (실전) 시대 종료 후 다음 시대 시작. 다음 시대가 없으면 finished가 되고 false */
  startNextEra(): boolean {
    if (this.mode !== 'real') throw new Error('연습 모드는 startPracticeRound()로 새 판을 시작');
    if (this._phase !== 'era-ended') throw new Error('시대가 아직 끝나지 않음');
    if (!this.hasNextEra) {
      this._phase = 'finished';
      return false;
    }
    this.session = this.beginEra(this.session.index + 1);
    return true;
  }

  /** (연습) 새 판 시작: 지갑을 10,000 비트로 되돌리고 고른 시대를 30분 플레이 */
  startPracticeRound(this: Game<'practice'>, eraId?: string): void {
    this.round++;
    resetPracticeWallet(this.wallet, this.config);
    this.session = this.beginEra(this.eraIndexOf(eraId ?? this.era.id));
  }

  // ───────── 광고 보상 (연습 전용) ─────────

  /** 이번 판에 남은 광고 보상 횟수 */
  remainingAdRewards(this: Game<'practice'>): number {
    return remainingAdRewards(this.wallet, this.config);
  }

  /** 광고 시청이 끝난 뒤 보상 지급 (+3,000 비트, 판당 3회) */
  grantAdReward(this: Game<'practice'>): AdRewardResult {
    if (this.mode !== 'practice') return { ok: false, error: 'not-available-in-real' };
    return grantAdReward(this.wallet, this.config);
  }

  /** 광고를 보여주고(AdRewardService), 끝까지 보면 보상 지급 */
  watchAdForReward(this: Game<'practice'>, service: AdRewardService): Promise<AdRewardResult> {
    if (this.mode !== 'practice') return Promise.resolve({ ok: false, error: 'not-available-in-real' });
    return watchAdForReward(this.wallet, service, this.config);
  }

  // ───────── 뉴스 팝업·보관함 ─────────

  /** 뉴스 팝업용 데이터: 본문, 관련 테마(긍정/부정), 해설, 가상 시나리오 여부 */
  getNewsPopup(s: ScheduledNews): NewsPopup {
    const themes = new Map(this.session.era.themes.map((t) => [t.id, t]));
    const popup: NewsPopup = {
      news: s.news,
      kind: s.kind,
      tag: s.tag,
      isHistorical: s.isHistorical,
      relatedThemes: s.news.effects.map((e) => ({
        themeId: e.themeId,
        name: e.themeId === MARKET_THEME_ID ? MARKET_NAME : themes.get(e.themeId)!.name,
        direction: e.impact > 0 ? 'positive' : 'negative',
        link: e.link,
      })),
      appliesInSeconds: this.config.newsDelaySeconds,
    };
    if (s.news.explanation) popup.explanation = s.news.explanation;
    if (s.news.reactionNote) popup.reactionNote = s.news.reactionNote;
    return popup;
  }

  /** 뉴스 보관함: 이번 시대(판)에 지금까지 뜬 뉴스 목록 */
  getNewsArchive(): NewsArchiveEntry[] {
    return this.session.news.shown.map((s) => {
      const entry: NewsArchiveEntry = {
        tick: s.tick,
        elapsedSeconds: s.tick * this.config.tickSeconds,
        kind: s.kind,
        tag: s.tag,
        isHistorical: s.isHistorical,
        news: s.news,
      };
      if (s.storylineId) entry.storylineId = s.storylineId;
      return entry;
    });
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

  /** 최근 20분 가격 이력. 시대 초반엔 있는 만큼만 */
  getChart(stockId: string): PricePoint[] {
    return this.session.prices.getHistory(stockId);
  }

  getPrice(stockId: string): number {
    return this.session.prices.getPrice(stockId);
  }

  // ───────── 내부 ─────────

  private eraIndexOf(eraId?: string): number {
    if (eraId === undefined) return 0;
    const i = this.eras.findIndex((e) => e.id === eraId);
    if (i < 0) throw new Error(`없는 시대: ${eraId}`);
    return i;
  }

  private beginEra(index: number): EraSession {
    const era = this.eras[index]!;
    this.account.resetPerformance();
    if (this.mode === 'real') beginRealEra(this.wallet as RealWallet);
    const session = startEraSession(era, index, this.seed, this.config, this.mode, this.round);
    this.session = session;
    this._phase = 'running';
    return session;
  }

  private checkTradable(stockId: string): GameTradeError | null {
    if (this._suspended || this._phase !== 'running') return 'not-tradable';
    if (!this.session.prices.hasStock(stockId)) return 'unknown-stock';
    return null;
  }
}
