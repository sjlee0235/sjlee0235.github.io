// 게임 엔진 본체 (Game). 시뮬레이션·테스트·분석·세이브가 쓰는 "내부용" 창구다.
// ★ 화면 코드는 이 클래스를 직접 쓰지 않고 publicView.ts의 PublicGame만 쓴다.
//   Game은 뉴스의 영향 테마·방향, 테마 분위기 등 플레이 중 숨겨야 할 정보를 그대로 들고 있기 때문이다.
//
// 엔진은 실제 시계를 쓰지 않는다. 화면 쪽 타이머가 5초마다 advanceTick()을 부른다.
// - 뉴스가 떠도, 주가 리포트가 붙어도 시간은 멈추지 않는다.
// - 시간이 멈추는 경우는 일시정지 사유가 하나라도 있을 때뿐: 'tutorial'(튜토리얼 뉴스 확인 대기), 'background'(앱이 백그라운드)
// - 배속(1배/2배)은 실제 시간만 바꾼다. 게임 시간 단위(5초 틱, 7분 유예, 120초 리포트)와 결과는 그대로
// - 뉴스 발표(틱 k): 영향의 75%가 그 순간 바로 반영(instantChanges) → 틱 k+1에 나머지 반영 → 틱 k+2, k+3 관성 → 일반 움직임
// - 뉴스 발표 120초 뒤 주가 리포트(report)이 AdvanceResult.reports로 나온다
//
// 상태(phase)
//   running   : 시대 진행 중 (일시정지 사유가 있으면 틱이 멈춘다)
//   era-ended : 시대 종료. 자동 청산·정산 완료. startNextEra()로 다음 시대
//   finished  : 마지막 시대까지 끝남
// pause('background') / resume('background') : 앱이 백그라운드로 갔을 때 (suspend()/resume()과 같음). 틱·뉴스·매매 정지
// pause('tutorial')   : 튜토리얼 뉴스 확인 대기. 틱은 멈추지만 매매는 된다

import type { Era, LinkStrength, LocalizedText, News, Stock, Theme } from '../data/schema.ts';
import { effectKind } from '../data/schema.ts';
import {
  Account, type DepositResult, type DepositSource, type Holding, type PortfolioView, type StockPerformance,
  type TradeError, type TradeRecord,
} from './account.ts';
import { changeColor, DEFAULT_COLOR_SCHEME, type ChangeColor, type ColorScheme } from './colors.ts';
import { getTickRules, makeConfig, type GameConfig, type TickRules } from './config.ts';
import type { ActiveEra, EraDraw } from './eraDraw.ts';
import { settleEra, sortEras, startEraSession, type EraSession, type EraSettlement } from './eraManager.ts';
import type { NewsTag, ScheduledKind, ScheduledNews } from './newsEngine.ts';
import type { PricePoint, StockTickChange } from './priceEngine.ts';
import { buildReport, type AppliedRate, type StockReport } from './report.ts';
import { applyDeposit, cumulativeReturnPct, startTwr, twrPct, type TwrState } from './returns.ts';
import {
  balanceHash, ENGINE_VERSION, TELEMETRY_SCHEMA_VERSION,
  type AppEventMap, type AppEventType, type DecisionContext, type EngineEventMap, type SavedActionData,
  type StockRate, type TelemetryEvent, type TelemetrySink,
} from './telemetry.ts';
import { addFavorite, sortByFavorites, toggleFavorite } from './watchlist.ts';

export type GamePhase = 'running' | 'era-ended' | 'finished';

/** 일시정지 사유. 하나라도 있으면 시간이 멈춘다 (주가 리포트는 시간을 멈추지 않는다) */
export type PauseReason = 'tutorial' | 'background';

/** 배속: 실제 시간만 바뀐다 (게임 결과는 같다) */
export type GameSpeed = 1 | 2;

/** 뉴스 피드 한 줄: 뉴스와 (발표 120초 뒤 붙는) 주가 리포트 */
export interface FeedEntry {
  scheduled: ScheduledNews;
  report?: StockReport;
  unread: boolean;
  reportUnread: boolean;
}

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
  /** 플레이 기록 동의 여부 (기본 false = 기록 안 함). 나중에 setConsent()로 바꿀 수 있다 */
  telemetryConsent?: boolean;
  /** 이전 시대들의 수익률 % (세이브 불러오기용, 누적 수익률 계산) */
  pastEraReturns?: readonly number[];
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
  | { advanced: false; phase: GamePhase; paused: boolean; pauseReasons: PauseReason[] }
  | {
      advanced: true;
      tick: number;
      changes: StockTickChange[];
      /** 이 틱이 끝나고 새로 뜬 뉴스 */
      news: ScheduledNews | null;
      /** 뉴스 발표 순간 바로 반영된 가격 변화 (뉴스가 없으면 빈 배열) */
      instantChanges: StockTickChange[];
      /** 이 틱에 만들어진 주가 리포트 */
      reports: StockReport[];
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
  /** 주가 리포트 (발표 120초 뒤에 생김) */
  report?: StockReport;
}

/** 이번 시대에 플레이어가 한 행동: 매매 또는 입금 (세이브·리플레이용) */
export type SavedAction = SavedActionData;

/** 저장이 필요한 이유 (화면은 이 값이 있으면 saveGame()을 부른다) */
export type SaveReason = 'trade' | 'deposit' | 'news' | 'background' | 'interval' | 'era-end';

/** 세이브용 상태 스냅샷 (가격·계좌·즐겨찾기·수익률 진행 상태) */
export interface GameStateSnapshot {
  tick: number;
  phase: GamePhase;
  /** 종목 id → 현재가 */
  prices: Record<string, number>;
  cash: number;
  holdings: Holding[];
  performance: StockPerformance[];
  favorites: string[];
  twr: TwrState;
  /** 뉴스 피드 읽음 상태 (내부 뉴스 id) */
  readNewsIds: string[];
  readReportIds: string[];
}

/** 시대 종료 후 공개 (사후 학습용, 내부 id 그대로) */
export interface EraDebrief {
  eraId: string;
  displayName: LocalizedText;
  settlement: EraSettlement | null;
  /** 이번 판 활성 테마와 종목 (분위기·관련도 포함) */
  themes: { theme: Theme; stock: Stock }[];
  /** 이번 판에 나온 스토리: 단서 방향과 실제 결과 */
  stories: {
    storyId: string;
    tentative: News;
    /** 단서가 가리킨 결과 */
    leansTo: News;
    /** 실제로 나온 결과 */
    outcome: News;
    followedLean: boolean;
    isHistorical: boolean;
    clue: News | null;
  }[];
  /** 이번 판 뉴스 전부와 해설 전체 (상위 3개 제한 없음) */
  news: { scheduled: ScheduledNews; report: StockReport }[];
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
  private readonly pauseReasons = new Set<PauseReason>();
  private _speed: GameSpeed = 1;
  private readNews = new Set<string>();
  private readReports = new Set<string>();
  private readonly _settlements: EraSettlement[] = [];
  private readonly options: GameOptions;
  /** 뉴스 id → (종목 id → 실제 적용된 변동률: 즉시 / 5초 뒤) */
  private applied = new Map<string, Map<string, AppliedRate>>();
  private pendingReports: { tick: number; scheduled: ScheduledNews }[] = [];
  private reports = new Map<string, StockReport>();
  private orders: PendingOrder[] = [];
  private readonly _draws: Record<string, EraDraw> = {};
  private telemetry: TelemetrySink | null;
  private consent = false;
  private telemetrySeq = 0;
  private stats: EraStats = Game.emptyStats(0);
  private _eraActions: SavedAction[] = [];
  private twr: TwrState = startTwr(0);
  private readonly pastEraReturns: number[];
  private readonly saveReasons = new Set<SaveReason>();
  private lastSavedTick = 0;

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
    this.pastEraReturns = [...(options.pastEraReturns ?? [])];
    this.session = this.beginEra(options.startEraIndex ?? 0);
    if (options.telemetryConsent) this.setConsent(true, options.restored ?? false);
  }

  /** 플레이 기록이 실제로 나가는 중인가 (기록 통이 있고, 동의했을 때만) */
  get isRecording(): boolean {
    return this.telemetry !== null && this.consent;
  }

  get telemetryConsent(): boolean {
    return this.consent;
  }

  /**
   * 플레이 기록 동의 켜기/끄기. 기본은 꺼짐.
   * 판 도중에 켜면 그 순간부터 기록하고, game_start에 그때까지의 행동을 담아 리플레이할 수 있게 한다.
   */
  setConsent(on: boolean, restored = false): void {
    const was = this.isRecording;
    this.consent = on;
    if (!was && this.isRecording) this.emitStart(restored);
  }

  /** (세이브 불러오기용) 기록 통을 나중에 붙인다. 동의가 켜져 있으면 바로 기록을 시작한다 */
  attachTelemetry(sink: TelemetrySink, restored = true): void {
    const was = this.isRecording;
    this.telemetry = sink;
    if (!was && this.isRecording) this.emitStart(restored);
  }

  private emitStart(restored: boolean): void {
    this.emitRaw('game_start', this.session.era.id, this.session.index, this.tick, {
      mode: this.options.telemetryMode ?? 'main',
      seed: this.seed,
      engineVersion: ENGINE_VERSION,
      balanceHash: balanceHash(this.config),
      startCash: this.session.startCash,
      startEraIndex: this.session.index,
      restored,
      resumeTick: this.tick === 0 && this._eraActions.length === 0 ? null : this.tick,
      priorActions: this._eraActions.map((a) => ({ ...a })),
      pastEraReturns: [...this.pastEraReturns, ...this._settlements.map((s) => s.returnPct)],
    });
    this.emitEraStart();
  }

  // ───────── 상태 조회 ─────────

  get phase(): GamePhase {
    return this._phase;
  }
  /** 일시정지 사유가 하나라도 있는가 */
  get isPaused(): boolean {
    return this.pauseReasons.size > 0;
  }
  get currentPauseReasons(): PauseReason[] {
    return [...this.pauseReasons].sort();
  }
  /** 앱이 백그라운드라 멈춘 상태인가 */
  get isSuspended(): boolean {
    return this.pauseReasons.has('background');
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
  /** 이번 시대에 한 행동(매매·입금) 목록 (세이브용) */
  get eraActions(): readonly SavedAction[] {
    return this._eraActions;
  }
  /** 이번 시대 매매만 */
  get eraTrades(): readonly Extract<SavedAction, { kind: 'trade' }>[] {
    return this._eraActions.filter((a): a is Extract<SavedAction, { kind: 'trade' }> => a.kind === 'trade');
  }
  /** 지금 총자산 (현금 + 보유 평가액) */
  get totalAssets(): number {
    return this.account.totalAssets(this.session.prices.getPrices());
  }
  /** 이번 시대 지금까지의 수익률 % (시간가중). 시대가 끝났으면 정산 수익률 */
  get currentReturnPct(): number {
    if (this._phase === 'era-ended' || this._phase === 'finished') return this._settlements.at(-1)?.returnPct ?? 0;
    return twrPct(this.twr, this.totalAssets);
  }
  /** 이전 시대 + 끝난 시대들의 수익률 % */
  get eraReturns(): number[] {
    return [...this.pastEraReturns, ...this._settlements.map((s) => s.returnPct)];
  }
  /** 누적 수익률 % = 시대별 시간가중수익률을 곱해서 */
  get cumulativeReturnPct(): number {
    return cumulativeReturnPct(this.eraReturns);
  }
  /** 저장이 필요한 이유들 (비어 있으면 저장 불필요). saveGame()이 비운다 */
  get pendingSaveReasons(): readonly SaveReason[] {
    return [...this.saveReasons];
  }
  /** 저장했음을 알린다 (saveGame()이 부른다) */
  markSaved(): void {
    this.saveReasons.clear();
    this.lastSavedTick = this.tick;
  }
  /** 시대 동안의 자산 최고·최저 (시뮬레이션·기록용) */
  get assetRange(): { peak: number; trough: number } {
    return { peak: this.stats.peak, trough: this.stats.trough };
  }
  get hasNextEra(): boolean {
    return this.session.index + 1 < this.eras.length;
  }

  // ───────── 시간 진행 ─────────

  advanceTick(): AdvanceResult {
    if (this.isPaused || this._phase !== 'running') {
      return { advanced: false, phase: this._phase, paused: this.isPaused, pauseReasons: this.currentPauseReasons };
    }
    const nextTick = this.tick + 1;
    const due = this.session.news.consumeRatesFor(nextTick);
    const merged = new Map<string, number>();
    for (const d of due) for (const [k, v] of d.rates) merged.set(k, (merged.get(k) ?? 0) + v);
    const { tick, changes } = this.session.prices.step(merged.size > 0 ? merged : undefined);

    for (const d of due) {
      this.recordApplied(d.newsId, d.rates, changes, 'delayed');
      if (this.isRecording) this.emit('news_reacted', { newsId: d.newsId, applied: this.stockRates(d.rates, changes) });
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
          this.recordApplied(instant.newsId, instant.rates, instantChanges, 'instant');
        }
        this.saveReasons.add('news');
        if (this.isRecording) {
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
        const reportTick = tick + this.rules.reportDelayTicks;
        if (reportTick <= this.rules.ticksPerEra) this.pendingReports.push({ tick: reportTick, scheduled: news });
        if (this.options.pauseOnNews) this.pause('tutorial');
      }
    }

    const reports: StockReport[] = [];
    for (const p of this.pendingReports.filter((r) => r.tick === tick)) {
      const notice = buildReport(
        p.scheduled,
        this.applied.get(p.scheduled.news.id) ?? new Map(),
        this.session.active.stocks,
        new Map(this.session.active.themes.map((t) => [t.id, t])),
        tick,
        this.config.reportMaxItems,
      );
      this.reports.set(notice.newsId, notice);
      reports.push(notice);
      if (this.isRecording) this.emit('report_created', { newsId: notice.newsId, stockIds: notice.items.map((i) => i.stockId) });
    }
    this.pendingReports = this.pendingReports.filter((r) => r.tick !== tick);

    this.updateStats(tick);
    if (tick - this.lastSavedTick >= this.rules.autosaveTicks) this.saveReasons.add('interval');

    let settlement: EraSettlement | null = null;
    if (tick >= this.rules.ticksPerEra) {
      const contexts = this.isRecording
        ? new Map(this.account.getHoldings().map((h) => [h.stockId, this.decisionContext(h.stockId)]))
        : null;
      settlement = settleEra(this.session, this.account, this.twr);
      this._settlements.push(settlement);
      this._phase = 'era-ended';
      this.saveReasons.add('era-end');
      for (const t of settlement.liquidations) {
        const holdTicks = this.recordTradeStats(t, true);
        if (contexts) this.emitTrade(t, contexts.get(t.stockId)!, true, holdTicks);
      }
      if (contexts) {
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
          profitAmount: settlement.profitAmount,
          deposits: { ...settlement.deposits },
        });
      }
    }
    return { advanced: true, tick, changes, news, instantChanges, reports, fills, settlement };
  }

  /**
   * 일시정지. 사유: 'tutorial'(튜토리얼 뉴스 확인 대기) / 'background'(앱이 백그라운드).
   * 사유가 하나라도 남아 있으면 시간이 멈춘다. 'background'는 저장이 필요하다고 알린다.
   */
  pause(reason: PauseReason): void {
    if (this.pauseReasons.has(reason)) return;
    this.pauseReasons.add(reason);
    if (reason === 'background') this.saveReasons.add('background');
    if (this.isRecording) this.emit('paused', { reason });
  }

  resume(reason: PauseReason = 'background'): void {
    if (!this.pauseReasons.delete(reason)) return;
    if (this.isRecording) this.emit('resumed', { reason });
  }

  /** 앱이 백그라운드로 갈 때 (= pause('background')) */
  suspend(): void {
    this.pause('background');
  }

  // ───────── 배속 ─────────

  /** 1배 / 2배. 실제 시간만 바뀐다 (틱 간격은 tickIntervalMs(speed)) */
  setSpeed(speed: GameSpeed): void {
    if (speed !== 1 && speed !== 2) throw new Error(`지원하지 않는 배속: ${speed}`);
    if (speed === this._speed) return;
    this._speed = speed;
    if (this.isRecording) this.emit('speed_changed', { speed });
  }

  getSpeed(): GameSpeed {
    return this._speed;
  }

  // ───────── 뉴스 피드 ─────────

  /** 뉴스 피드 (최신순): 뉴스와, 발표 120초 뒤 그 아래 붙는 주가 리포트 */
  getFeed(): FeedEntry[] {
    return this.session.news.shown
      .map((s): FeedEntry => {
        const report = this.reports.get(s.news.id);
        const entry: FeedEntry = { scheduled: s, unread: !this.readNews.has(s.news.id), reportUnread: false };
        if (report) {
          entry.report = report;
          entry.reportUnread = !this.readReports.has(s.news.id);
        }
        return entry;
      })
      .reverse();
  }

  /** 읽지 않은 뉴스 수 (NEWS! 알림은 이것만 본다) */
  getUnreadCount(): number {
    return this.session.news.shown.filter((s) => !this.readNews.has(s.news.id)).length;
  }

  /** 읽지 않은 주가 리포트 수 (피드 안 강조 표시용) */
  getUnreadReportCount(): number {
    return [...this.reports.keys()].filter((id) => !this.readReports.has(id)).length;
  }

  /** 지금까지 나온 뉴스와 리포트를 모두 읽음 처리 (주식창에 들어가면) */
  markAllRead(): void {
    for (const s of this.session.news.shown) this.readNews.add(s.news.id);
    for (const id of this.reports.keys()) this.readReports.add(id);
  }

  /** (세이브 불러오기용) 읽음 상태를 되돌린다 */
  restoreReadState(readNewsIds: readonly string[], readReportIds: readonly string[]): void {
    this.readNews = new Set(readNewsIds);
    this.readReports = new Set(readReportIds);
  }

  /**
   * 외부 유입 입금 (source: work = 인형 눈 붙이기, purchase = 결제, ad = 광고 보상, other).
   * - 시대 진행 중: 입금 직전 자산으로 수익률 구간을 나눈다 (시간가중수익률). 일시정지 중에도 가능
   * - 시대가 끝난 뒤(정산 후): 현금만 늘고, 다음 시대 시작 자금에 들어간다
   * 결제·광고 SDK 연동은 엔진 밖(앱) 일이다. 엔진은 결과 금액만 받는다.
   */
  deposit(amount: number, source: DepositSource): DepositResult {
    const inEra = this._phase === 'running';
    const assetsBefore = inEra ? this.totalAssets : 0;
    const r = this.account.deposit(amount, source, this.tick);
    if (!r.ok) return r;
    if (inEra) this.twr = applyDeposit(this.twr, assetsBefore, amount, source);
    this._eraActions.push({ kind: 'deposit', tick: this.tick, amount, source });
    this.saveReasons.add('deposit');
    if (this.isRecording) this.emit('deposit', { amount, source, cashAfter: this.account.cash, inEra });
    return r;
  }

  /**
   * 화면(앱) 이벤트 기록. 예) 뉴스 팝업을 닫을 때 game.track('news_popup', { newsId, dwellMs, closedBy })
   * clientMs는 실제 시각(앱이 Date.now() 등으로 넣는다. 엔진은 시계를 쓰지 않음)
   */
  track<K extends AppEventType>(type: K, data: AppEventMap[K], clientMs?: number): void {
    if (!this.isRecording) return;
    this.emitRaw(type, this.session.era.id, this.session.index, this.tick, data, clientMs);
  }

  /** (튜토리얼) 뉴스 팝업 '확인'. 1틱(5초) 뒤 반영 */
  confirmNews(): ScheduledNews {
    if (!this.session.news.pendingNews) throw new Error('확인할 튜토리얼 뉴스가 없음');
    const s = this.session.news.confirm(this.tick);
    this.resume('tutorial');
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

  /** 이 뉴스의 주가 리포트 (발표 120초 뒤에 생김, 없으면 undefined) */
  getReport(newsId: string): StockReport | undefined {
    return this.reports.get(newsId);
  }

  /**
   * 시대 종료 후 공개 (사후 학습용): 활성 테마의 분위기·관련도, 스토리별 단서 방향과 실제 결과,
   * 실제 역사 여부, 뉴스별 해설 전체. 시대가 끝나기 전에 부르면 오류.
   */
  getEraDebrief(): EraDebrief {
    if (this._phase !== 'era-ended' && this._phase !== 'finished') {
      throw new Error('시대가 끝난 뒤에만 볼 수 있음 (진행 중 공개 금지)');
    }
    const { era, active, news } = this.session;
    const shown = news.shown;
    const themeById = new Map(active.themes.map((t) => [t.id, t]));
    const stories: EraDebrief['stories'] = [];
    for (const s of shown.filter((x) => x.kind === 'outcome')) {
      const story = active.stories.find((x) => x.id === s.storyId)!;
      const byId = new Map(story.news.map((n) => [n.id, n]));
      const clue = shown.find((x) => x.kind === 'clue' && x.storyId === story.id);
      stories.push({
        storyId: story.id,
        tentative: story.tentative,
        leansTo: byId.get(story.leansTo)!,
        outcome: s.news,
        followedLean: s.followedLean ?? false,
        isHistorical: s.isHistorical,
        clue: clue?.news ?? null,
      });
    }
    return {
      eraId: era.id,
      displayName: era.displayName,
      settlement: this._settlements.find((x) => x.eraId === era.id) ?? null,
      themes: active.stocks.map((stock) => ({ theme: themeById.get(stock.themeId)!, stock })),
      stories,
      news: shown.map((s) => ({
        scheduled: s,
        report: buildReport(
          s, this.applied.get(s.news.id) ?? new Map(), active.stocks, themeById,
          this.reports.get(s.news.id)?.reportTick ?? this.tick, Number.POSITIVE_INFINITY,
        ),
      })),
    };
  }

  /** 뉴스 보관함 (내부용): 지금까지 뜬 뉴스와 (있으면) 주가 리포트 */
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
      const report = this.reports.get(s.news.id);
      if (report) entry.report = report;
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
    if (this.isRecording) this.emit('favorite_toggled', { stockId, on: this.session.favorites.includes(stockId) });
  }

  /** (세이브 불러오기용) 관심 종목 목록을 저장된 그대로 되돌린다 */
  restoreFavorites(stockIds: readonly string[]): void {
    this.session.favorites = stockIds.filter((id) => this.session.prices.hasStock(id));
  }

  getStockList(): StockListItem[] {
    const { active, prices, favorites } = this.session;
    const themes = new Map(active.themes.map((t) => [t.id, t]));
    const items = active.stocks.map((stock): StockListItem => {
      const s = prices.peek(stock.id);
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

  /** (세이브용) 지금 상태 스냅샷 */
  captureState(): GameStateSnapshot {
    return {
      tick: this.tick,
      phase: this._phase,
      prices: Object.fromEntries(this.session.prices.getPrices()),
      cash: this.account.cash,
      holdings: this.account.getHoldings(),
      performance: this.account.getPerformance(),
      favorites: [...this.session.favorites],
      twr: { ...this.twr, deposits: { ...this.twr.deposits } },
      readNewsIds: [...this.readNews].sort(),
      readReportIds: [...this.readReports].sort(),
    };
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

  /** 뉴스별로 실제 적용된 변동률 기록 (주가 리포트용) */
  private recordApplied(
    newsId: string, rates: ReadonlyMap<string, number>, changes: readonly StockTickChange[], part: 'instant' | 'delayed',
  ): void {
    const map = this.applied.get(newsId) ?? new Map<string, AppliedRate>();
    for (const ch of changes) {
      if (ch.cause !== 'news' && ch.cause !== 'instant') continue;
      if (!rates.has(this.themeOf(ch.stockId))) continue;
      const a = map.get(ch.stockId) ?? { instant: 0, delayed: 0 };
      a[part] += ch.rate;
      map.set(ch.stockId, a);
    }
    this.applied.set(newsId, map);
  }

  private themeOf(stockId: string): string {
    return this.session.prices.peek(stockId).themeId;
  }

  private beginEra(index: number): EraSession {
    const era = this.eras[index];
    if (!era) throw new Error(`없는 시대 순번: ${index}`);
    this.account.resetPerformance();
    this.applied = new Map();
    this.pendingReports = [];
    this.reports = new Map();
    this.readNews = new Set();
    this.readReports = new Set();
    this.orders = [];
    this.stats = Game.emptyStats(this.account.cash);
    this._eraActions = [];
    this.twr = startTwr(this.account.cash);
    const session = startEraSession(era, index, this.seed, this.config, this.account.cash, {
      ...(this.options.draws?.[era.id] ? { draw: this.options.draws[era.id] } : {}),
      ...(this.options.pauseOnNews ? { pauseOnNews: true } : {}),
      ...(this.options.fixedSchedule ? { fixedSchedule: this.options.fixedSchedule } : {}),
    });
    this._draws[era.id] = session.draw;
    this.session = session;
    this._phase = 'running';
    this.lastSavedTick = 0;
    if (this.isRecording) this.emitEraStart();
    return session;
  }

  private emitEraStart(): void {
    const { era, draw, startCash } = this.session;
    const core = new Set(era.themes.filter((t) => t.relevance === 'core').map((t) => t.id));
    this.emit('era_start', {
      startCash,
      drawAttempt: draw.attempt,
      drawOk: draw.ok,
      activeThemeIds: [...draw.activeThemeIds],
      coreCount: draw.activeThemeIds.filter((id) => core.has(id)).length,
      usableBreaking: draw.usableBreaking,
      usableStories: draw.usableStories,
    });
  }

  private checkTradable(stockId: string): GameTradeError | null {
    // 튜토리얼에서는 뉴스 팝업으로 시간이 멈춘 동안에도 매매할 수 있다
    if (this.isSuspended || this._phase === 'era-ended' || this._phase === 'finished') return 'not-tradable';
    if (!this.session.prices.hasStock(stockId)) return 'unknown-stock';
    return null;
  }

  private order(side: 'buy' | 'sell', stockId: string, quantity: number): GameTradeResult {
    const check = this.checkTradable(stockId);
    if (check) {
      if (this.isRecording) this.emit('trade_rejected', { side, stockId, quantity, error: check });
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
    const context = this.isRecording ? this.decisionContext(stockId) : null;
    const r = side === 'buy' ? this.account.buy(stockId, quantity, price, this.tick) : this.account.sell(stockId, quantity, price, this.tick);
    if (r.ok && side === 'buy') this.session.favorites = addFavorite(this.session.favorites, stockId);
    if (r.ok) {
      this._eraActions.push({ kind: 'trade', tick: this.tick, side, stockId, quantity });
      this.saveReasons.add('trade');
      const holdTicks = this.recordTradeStats(r.trade, false);
      if (context) this.emitTrade(r.trade, context, false, holdTicks);
    } else if (context) {
      this.emit('trade_rejected', { side, stockId, quantity, error: r.error });
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
    if (this.isRecording && tick % this.rules.windowTicks === 0) {
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

  /** 매매 통계 갱신. 매도면 그 포지션을 들고 있던 틱 수를 돌려준다 */
  private recordTradeStats(t: TradeRecord, auto: boolean): number | null {
    const st = this.stats;
    st.fees += t.fee;
    if (!auto) {
      if (t.side === 'buy') st.buys++;
      else st.sells++;
    }
    if (t.side === 'buy') {
      if (!st.firstBuyTick.has(t.stockId)) st.firstBuyTick.set(t.stockId, this.tick);
      return null;
    }
    const first = st.firstBuyTick.get(t.stockId);
    if (this.account.getQuantity(t.stockId) === 0) st.firstBuyTick.delete(t.stockId);
    return first === undefined ? null : this.tick - first;
  }

  private emitTrade(t: TradeRecord, context: DecisionContext, auto: boolean, holdTicks: number | null): void {
    const quantityAfter = this.account.getQuantity(t.stockId);
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
