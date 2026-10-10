// 공개용 뷰 (public view): 화면 코드가 받는 유일한 창구.
//
// 왜 필요한가
//   엔진 본체(Game)는 뉴스의 영향 테마·방향·규모, 테마 분위기·비중, 스토리 결과 확률 등을 들고 있다.
//   화면이 이것을 받으면 실수로라도 보여줄 수 있고, 앱 데이터를 들여다보면 "정답"이 새어 나간다.
//   그래서 화면에는 플레이어가 알아도 되는 것만 담은 데이터(공개용 뷰)만 넘긴다.
//
// 규칙
// - 뉴스: id(무작위 문자열), 표시용 종류(속보/잠정/결과), 제목, 본문, 발표 시각.
//         결과 뉴스만 발표된 뒤 "가상 시나리오" 태그 여부(fictional)를 담는다.
//   담지 않는 것: effects, impact, magnitude, link, sentiment, relevance, leansTo, outcomes, weight, isHistorical, themeId
// - 종목: id(판마다 바뀌는 무작위 문자열), 이름, 설명, 가격, 즐겨찾기 여부. 테마 id·분위기·비중은 담지 않는다.
// - 종목 목록: 즐겨찾기 먼저, 그 안팎은 이름 가나다순. 데이터에 저장된 순서(분위기별로 묶여 있을 수 있음)는 드러나지 않는다.
// - 주가 리포트(발표 120초 뒤): 반영이 끝난 사실이라 방향과 %를 보여준다 (발표 즉시분 / 5초 뒤분 / 합계).
// - 시대가 끝난 뒤에만 getEraDebrief()로 분위기·비중, 스토리 단서와 실제 결과, 실제 역사 여부, 해설 전체를 공개한다.

import type { LocalizedText, Locale } from '../data/schema.ts';
import type { DepositResult, DepositSource, TradeError } from './account.ts';
import { changeColor, type ChangeColor } from './colors.ts';
import type { GameConfig } from './config.ts';
import type { Era } from '../data/schema.ts';
import type { EraSettlement } from './eraManager.ts';
import {
  Game, type FinalSummary, type GameOptions, type GamePhase, type GameSpeed, type GameTradeResult, type OrderPreview, type PauseReason,
  type InteriorResult, type SaveReason, type WorkStatus,
} from './game.ts';
import type { TouchResult } from './work.ts';
import type { ScheduledNews } from './newsEngine.ts';
import type { PricePoint } from './priceEngine.ts';
import type { StockReport } from './report.ts';
import { cumulativeReturnPct } from './returns.ts';
import { deriveSeed } from './rng.ts';
import { restoreGame, saveGame, type RestoreOptions, type SaveData } from './save.ts';
import type { AppEventMap, AppEventType, TelemetrySink } from './telemetry.ts';

export type PublicNewsKind = 'breaking' | 'tentative' | 'outcome';

export interface PublicNewsView {
  /** 무작위 문자열 id (내용을 짐작할 수 없음) */
  id: string;
  /** 표시용 종류: 속보 / 잠정 / 결과 (후속 뉴스는 잠정으로 표시) */
  kind: PublicNewsKind;
  title: LocalizedText;
  body: LocalizedText;
  publishedTick: number;
  elapsedSeconds: number;
  /** 결과 뉴스만: 실제와 다른 가상 시나리오인가 (발표된 뒤에만 존재) */
  fictional?: boolean;
  /** 결과 뉴스만: 이 결과로 이어진 잠정 뉴스의 공개 id (결과가 나온 뒤라 정답 누설 없음) */
  relatedTentativeId?: string;
}

/** 뉴스 피드 한 줄 (최신순): 뉴스와, 발표 120초 뒤 그 바로 아래 붙는 주가 리포트 */
export interface PublicFeedEntry {
  news: PublicNewsView;
  report?: PublicStockReport;
  /** 아직 안 읽은 뉴스 (NEWS! 알림 대상) */
  unread: boolean;
  /** 아직 안 읽은 리포트 (피드 안 강조 표시만) */
  reportUnread: boolean;
}

export interface PublicStockView {
  /** 판마다 바뀌는 무작위 문자열 id */
  id: string;
  name: LocalizedText;
  description: LocalizedText;
  price: number;
  openPrice: number;
  changePct: number;
  lastTickPct: number;
  color: ChangeColor;
  isFavorite: boolean;
  quantity: number;
}

export interface PublicStockReportItem {
  stockId: string;
  stockName: LocalizedText;
  /** 합계 = instantPct + delayedPct */
  appliedPct: number;
  /** 발표 즉시 반영분 */
  instantPct: number;
  /** 5초 뒤 반영분 */
  delayedPct: number;
  reason: Partial<LocalizedText> | null;
  /** reason이 없을 때 자동 문구 재료 */
  auto: { newsTerm: string; industry: LocalizedText; positive: boolean };
}

export interface PublicStockReport {
  newsId: string;
  kind: PublicNewsKind;
  publishedTick: number;
  reportTick: number;
  items: PublicStockReportItem[];
  moreCount: number;
  /** 잠정 뉴스: "잠정 발표라 결과에 따라 달라질 수 있어요" 문구 (결과 방향은 암시하지 않음) */
  tentativeNote: boolean;
  /** 결과 뉴스가 예상과 반대로 반응한 이유 */
  reactionNote?: LocalizedText;
  /** 결과 뉴스의 리포트만: 이어진 잠정 뉴스의 공개 id */
  relatedTentativeId?: string;
}

export interface PublicSettlement {
  eraId: string;
  eraName: LocalizedText;
  startCash: number;
  endAssets: number;
  /** 시간가중수익률 % */
  returnPct: number;
  /** 입금을 뺀 순손익 */
  profitAmount: number;
  deposits: Record<DepositSource, number>;
  /** 지금까지 끝난 시대들의 누적 수익률 % */
  cumulativeReturnPct: number;
  stocks: { id: string; name: LocalizedText; totalBought: number; pnl: number; pnlPct: number }[];
  settledOnVersionChange: boolean;
  /** 투자 결과: 청산 후 투자 코인과 수익률 (작업 수입 제외) */
  investmentResult: { coins: number; returnPct: number };
  /** 시대 종료 때 합산된 작업 수입 */
  workIncome: number;
  /** 합계 = 투자 결과 + 작업 수입 (다음 시대 시작 자금) */
  finalTotal: number;
  /** 파산 대기 시간(초) */
  brokeTimeSec: number;
}

export interface PublicPortfolio {
  cash: number;
  totalAssets: number;
  /** 이번 시대 지금까지 수익률 % (시간가중) */
  currentReturnPct: number;
  cumulativeReturnPct: number;
  holdings: {
    id: string;
    name: LocalizedText;
    quantity: number;
    avgPrice: number;
    currentPrice: number;
    marketValue: number;
    unrealizedPnl: number;
    unrealizedPnlPct: number;
  }[];
}

export type PublicTradeResult =
  | { ok: true; trade: { side: 'buy' | 'sell'; stockId: string; quantity: number; price: number; amount: number; fee: number; realizedPnl?: number } }
  | { ok: true; queued: true; executeTick: number }
  | { ok: false; error: TradeError | 'unknown-stock' | 'not-tradable' };

export type PublicAdvanceResult =
  | { advanced: false; phase: GamePhase; paused: boolean; pauseReasons: PauseReason[] }
  | {
      advanced: true;
      tick: number;
      elapsedSeconds: number;
      remainingSeconds: number;
      /** 모든 종목의 새 가격 (뉴스 발표 순간 반영분 포함) */
      prices: { id: string; price: number; lastTickPct: number }[];
      news: PublicNewsView | null;
      reports: PublicStockReport[];
      settlement: PublicSettlement | null;
      /** 저장이 필요하면 true (saveGame 호출) */
      saveNeeded: boolean;
    };

/** 시대 종료 후 공개 (사후 학습용) */
export interface PublicEraDebrief {
  eraId: string;
  eraName: LocalizedText;
  settlement: PublicSettlement | null;
  themes: {
    stockId: string;
    stockName: LocalizedText;
    themeName: LocalizedText;
    sentiment: 'positive' | 'negative' | 'neutral';
    relevance: 'core' | 'peripheral';
  }[];
  stories: {
    tentative: { id: string; title: LocalizedText };
    clue: { id: string; title: LocalizedText } | null;
    /** 단서가 가리킨 결과 */
    leansTo: { title: LocalizedText };
    /** 실제로 나온 결과 */
    outcome: { id: string; title: LocalizedText };
    followedLean: boolean;
    isHistorical: boolean;
  }[];
  news: {
    news: PublicNewsView;
    isHistorical: boolean;
    /** 영향 테마별 영향도·연결 강도 (사후 공개) */
    effects: { stockId: string; stockName: LocalizedText; impact: number; strength: 1 | 2 | 3 }[];
    /** 해설 전체 (상위 3개 제한 없음) */
    report: PublicStockReport;
  }[];
}

const engines = new WeakMap<PublicGame, Game>();

function compareName(locale: Locale) {
  return (a: { name: LocalizedText; id: string }, b: { name: LocalizedText; id: string }) => {
    const x = a.name[locale].toLowerCase();
    const y = b.name[locale].toLowerCase();
    return x < y ? -1 : x > y ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  };
}

export class PublicGame {
  locale: Locale;
  private idCache: { eraId: string; toPublic: Map<string, string>; toInternal: Map<string, string> } | null = null;

  private constructor(game: Game, locale: Locale) {
    engines.set(this, game);
    this.locale = locale;
  }

  /** 새 게임 */
  static create(options: GameOptions & { locale?: Locale }): PublicGame {
    const { locale, ...rest } = options;
    return new PublicGame(new Game(rest), locale ?? 'ko');
  }

  /** (엔진 내부용: 튜토리얼·세이브) 이미 만든 Game을 공개용 뷰로 감싼다 */
  static wrap(game: Game, locale: Locale = 'ko'): PublicGame {
    return new PublicGame(game, locale);
  }

  private get g(): Game {
    return engines.get(this)!;
  }

  // ───────── 상태 ─────────

  get phase(): GamePhase {
    return this.g.phase;
  }
  get isSuspended(): boolean {
    return this.g.isSuspended;
  }
  get isPaused(): boolean {
    return this.g.isPaused;
  }
  get tick(): number {
    return this.g.tick;
  }
  get elapsedSeconds(): number {
    return this.g.elapsedSeconds;
  }
  get remainingSeconds(): number {
    return this.g.remainingTicks * this.g.config.tickSeconds;
  }
  get eraId(): string {
    return this.g.era.id;
  }
  get eraName(): LocalizedText {
    return this.g.era.displayName;
  }
  get hasNextEra(): boolean {
    return this.g.hasNextEra;
  }
  get pendingSaveReasons(): readonly SaveReason[] {
    return this.g.pendingSaveReasons;
  }
  get telemetryConsent(): boolean {
    return this.g.telemetryConsent;
  }
  /** (튜토리얼) 시간이 멈춘 채 열려 있는 뉴스 */
  get pendingNews(): PublicNewsView | null {
    const p = this.g.pendingNews;
    return p ? this.newsView(p) : null;
  }

  // ───────── 진행 ─────────

  advanceTick(): PublicAdvanceResult {
    const r = this.g.advanceTick();
    if (!r.advanced) return r;
    return {
      advanced: true,
      tick: r.tick,
      elapsedSeconds: this.g.elapsedSeconds,
      remainingSeconds: this.remainingSeconds,
      prices: this.g.getStockList().map((it) => ({ id: this.pub(it.stock.id), price: it.price, lastTickPct: it.lastTickPct })),
      news: r.news ? this.newsView(r.news) : null,
      reports: r.reports.map((n) => this.reportView(n)),
      settlement: r.settlement ? this.settlementView(r.settlement) : null,
      saveNeeded: this.g.pendingSaveReasons.length > 0,
    };
  }

  /** 일시정지 (사유: 'tutorial' / 'background'). 주가 리포트는 시간을 멈추지 않는다 */
  pause(reason: PauseReason): void {
    this.g.pause(reason);
  }
  resume(reason: PauseReason = 'background'): void {
    this.g.resume(reason);
  }
  /** 앱이 백그라운드로 갈 때 (= pause('background')) */
  suspend(): void {
    this.g.suspend();
  }

  /** 1배 / 2배 (실제 시간만 바뀐다. 틱 간격은 config의 tickIntervalMs(speed)) */
  setSpeed(speed: GameSpeed): void {
    this.g.setSpeed(speed);
  }
  getSpeed(): GameSpeed {
    return this.g.getSpeed();
  }

  // ───────── 뉴스 피드 ─────────

  /** 뉴스 피드 (최신순). 리포트는 해당 뉴스 바로 아래 붙는다 */
  getFeed(): PublicFeedEntry[] {
    return this.g.getFeed().map((e) => {
      const v: PublicFeedEntry = { news: this.newsView(e.scheduled), unread: e.unread, reportUnread: e.reportUnread };
      if (e.report) v.report = this.reportView(e.report);
      return v;
    });
  }
  /** 읽지 않은 뉴스 수 (NEWS! 알림) */
  getUnreadCount(): number {
    return this.g.getUnreadCount();
  }
  /** 읽지 않은 주가 리포트 수 (피드 안 강조 표시만, NEWS! 알림에는 쓰지 않는다) */
  getUnreadReportCount(): number {
    return this.g.getUnreadReportCount();
  }
  /** 모두 읽음 (주식창 탭에 들어가면) */
  markAllRead(): void {
    this.g.markAllRead();
  }
  /** (튜토리얼) 뉴스 팝업 확인 */
  confirmNews(): PublicNewsView {
    return this.newsView(this.g.confirmNews());
  }
  startNextEra(): boolean {
    this.idCache = null;
    return this.g.startNextEra();
  }

  // ───────── 종목·차트·계좌 ─────────

  /** 종목 목록: 즐겨찾기 먼저, 각 묶음 안은 이름 가나다순 */
  getStockList(locale: Locale = this.locale): PublicStockView[] {
    const items = this.g.getStockList().map((it): PublicStockView => ({
      id: this.pub(it.stock.id),
      name: it.stock.name,
      description: it.stock.description,
      price: it.price,
      openPrice: it.openPrice,
      changePct: it.changePct,
      lastTickPct: it.lastTickPct,
      color: changeColor(it.change, this.g.colorScheme),
      isFavorite: it.isFavorite,
      quantity: it.quantity,
    }));
    const cmp = compareName(locale);
    return [...items.filter((i) => i.isFavorite).sort(cmp), ...items.filter((i) => !i.isFavorite).sort(cmp)];
  }

  getChart(stockId: string): PricePoint[] {
    return this.g.getChart(this.internal(stockId));
  }

  getPortfolio(): PublicPortfolio {
    const p = this.g.getPortfolio();
    return {
      cash: p.cash,
      totalAssets: p.totalAssets,
      currentReturnPct: this.g.currentReturnPct,
      cumulativeReturnPct: this.g.cumulativeReturnPct,
      holdings: p.holdings.map((h) => ({
        id: this.pub(h.stockId),
        name: this.stockName(h.stockId),
        quantity: h.quantity,
        avgPrice: h.avgPrice,
        currentPrice: h.currentPrice,
        marketValue: h.marketValue,
        unrealizedPnl: h.unrealizedPnl,
        unrealizedPnlPct: h.unrealizedPnlPct,
      })),
    };
  }

  buy(stockId: string, quantity: number): PublicTradeResult {
    const id = this.internalOrNull(stockId);
    return id ? this.tradeView(this.g.buy(id, quantity)) : { ok: false, error: 'unknown-stock' };
  }

  sell(stockId: string, quantity: number): PublicTradeResult {
    const id = this.internalOrNull(stockId);
    return id ? this.tradeView(this.g.sell(id, quantity)) : { ok: false, error: 'unknown-stock' };
  }

  maxBuyQuantity(stockId: string): number {
    const id = this.internalOrNull(stockId);
    return id ? this.g.maxBuyQuantity(id) : 0;
  }

  /** 주문할 수 있는 최대 수량 ('최대' 버튼): 매수는 수수료 포함, 매도는 보유 수량 전부 */
  maxQty(side: 'buy' | 'sell', stockId: string): number {
    const id = this.internalOrNull(stockId);
    return id ? this.g.maxQty(side, id) : 0;
  }

  /** 주문 미리보기: 금액·수수료·최대 수량·오류 (상태를 바꾸지 않는다) */
  previewOrder(side: 'buy' | 'sell', stockId: string, quantity: number): OrderPreview {
    const id = this.internalOrNull(stockId);
    if (!id) {
      return { side, stockId, quantity, price: 0, amount: 0, fee: 0, total: 0, maxQuantity: 0, error: 'unknown-stock' };
    }
    return { ...this.g.previewOrder(side, id, quantity), stockId };
  }

  toggleFavorite(stockId: string): void {
    this.g.toggleFavorite(this.internal(stockId));
  }

  // ───────── 작업실 ─────────

  /** 작업실 터치 (nowMs = 실제 시각). 3번째 터치마다 인형 완성 → 지급 예정 +3, 100개를 채우면 바로 지급 */
  workTouch(nowMs: number): TouchResult {
    return this.g.workTouch(nowMs);
  }
  /** 지금 인형의 눈 수, 정산 예정 작업 수입 등 */
  getWorkStatus(): WorkStatus {
    return this.g.getWorkStatus();
  }
  /** 마지막 시대가 끝난 뒤에만: 시대별 투자 수익률, 작업 수입, 최종 총 코인 */
  getFinalSummary(): FinalSummary {
    return this.g.getFinalSummary();
  }
  /** 보유 현금 (주식창 밖 탭의 오른쪽 위 표시) */
  get cash(): number {
    return this.g.account.cash;
  }

  /** 마지막 작업 수입 묶음 지급 (seq가 바뀌면 화면이 알림을 띄운다) */
  get lastWorkPayout(): { coins: number; seq: number } | null {
    return this.g.lastWorkPayout;
  }

  /** 외부 유입 입금 (결제·광고 보상). 결제·광고 SDK는 앱이 붙이고, 결과 금액만 여기로 */
  deposit(amount: number, source: DepositSource): DepositResult {
    return this.g.deposit(amount, source);
  }

  // ───────── 인테리어 ─────────

  /** 인테리어 단계 (0~7, 세 화면 공통, 시대를 넘어 이어짐) */
  get interiorLevel(): number {
    return this.g.interiorLevel;
  }
  get interiorMaxLevel(): number {
    return this.g.config.interior.maxLevel;
  }
  /** 다음 단계 값 (최고 단계면 null) */
  get interiorNextCost(): number | null {
    return this.g.interiorNextCost;
  }
  /** 한 단계 올리기 (보유 현금에서) */
  upgradeInterior(): InteriorResult {
    return this.g.upgradeInterior();
  }

  // ───────── 뉴스·해설·사후 공개 ─────────

  getNewsArchive(): { news: PublicNewsView; report?: PublicStockReport }[] {
    return this.g.shownNews.map((s) => {
      const report = this.g.getReport(s.news.id);
      return report ? { news: this.newsView(s), report: this.reportView(report) } : { news: this.newsView(s) };
    });
  }

  /** 시대가 끝난 뒤에만. 진행 중에 부르면 오류 */
  getEraDebrief(): PublicEraDebrief {
    const d = this.g.getEraDebrief();
    const stockOfTheme = new Map(d.themes.map((t) => [t.theme.id, t.stock]));
    const shownById = new Map(this.g.shownNews.map((s) => [s.news.id, s]));
    const titleOf = (id: string) => ({ id: this.newsPub(id), title: shownById.get(id)!.news.title });
    return {
      eraId: d.eraId,
      eraName: d.displayName,
      settlement: d.settlement ? this.settlementView(d.settlement) : null,
      themes: [...d.themes]
        .map((t) => ({
          stockId: this.pub(t.stock.id),
          stockName: t.stock.name,
          themeName: t.theme.name,
          sentiment: t.theme.sentiment,
          relevance: t.theme.relevance,
        }))
        .sort((a, b) => compareName(this.locale)({ name: a.stockName, id: a.stockId }, { name: b.stockName, id: b.stockId })),
      stories: d.stories.map((s) => ({
        tentative: titleOf(s.tentative.id),
        clue: s.clue ? titleOf(s.clue.id) : null,
        leansTo: { title: s.leansTo.title },
        outcome: titleOf(s.outcome.id),
        followedLean: s.followedLean,
        isHistorical: s.isHistorical,
      })),
      news: d.news.map((n) => ({
        news: this.newsView(n.scheduled),
        isHistorical: n.scheduled.isHistorical,
        effects: n.scheduled.news.effects
          .filter((e) => stockOfTheme.has(e.themeId))
          .map((e) => {
            const stock = stockOfTheme.get(e.themeId)!;
            return { stockId: this.pub(stock.id), stockName: stock.name, impact: e.impact, strength: e.link.strength };
          }),
        report: this.reportView(n.report),
      })),
    };
  }

  // ───────── 기록(텔레메트리) ─────────

  /** 플레이 기록 동의 (기본 꺼짐). 동의 화면에서 켠다 */
  setConsent(on: boolean): void {
    this.g.setConsent(on);
  }
  attachTelemetry(sink: TelemetrySink): void {
    this.g.attachTelemetry(sink, false);
  }
  track<K extends AppEventType>(type: K, data: AppEventMap[K], clientMs?: number): void {
    this.g.track(type, data, clientMs);
  }

  // ───────── 내부: id 바꾸기·변환 ─────────

  private ids() {
    const eraId = this.g.era.id;
    if (this.idCache?.eraId !== eraId) {
      const toPublic = new Map<string, string>();
      const toInternal = new Map<string, string>();
      for (const s of this.g.activeStocks) {
        const pid = `s${deriveSeed(this.g.seed, 'public-stock', eraId, s.id).toString(36).padStart(7, '0')}`;
        if (toInternal.has(pid)) throw new Error('공개 종목 id가 겹침');
        toPublic.set(s.id, pid);
        toInternal.set(pid, s.id);
      }
      this.idCache = { eraId, toPublic, toInternal };
    }
    return this.idCache;
  }

  private pub(stockId: string): string {
    return this.ids().toPublic.get(stockId)!;
  }

  private internalOrNull(publicId: string): string | null {
    return this.ids().toInternal.get(publicId) ?? null;
  }

  private internal(publicId: string): string {
    const id = this.internalOrNull(publicId);
    if (!id) throw new Error(`없는 종목: ${publicId}`);
    return id;
  }

  private newsPub(newsId: string): string {
    return `n${deriveSeed(this.g.seed, 'public-news', this.g.era.id, newsId).toString(36).padStart(7, '0')}`;
  }

  private stockName(stockId: string): LocalizedText {
    return this.g.activeStocks.find((s) => s.id === stockId)!.name;
  }

  private newsView(s: ScheduledNews): PublicNewsView {
    const v: PublicNewsView = {
      id: this.newsPub(s.news.id),
      kind: s.tag,
      title: s.news.title,
      body: s.news.body,
      publishedTick: s.tick,
      elapsedSeconds: s.tick * this.g.config.tickSeconds,
    };
    if (s.kind === 'outcome') {
      v.fictional = !s.isHistorical;
      if (s.relatedTentativeId) v.relatedTentativeId = this.newsPub(s.relatedTentativeId);
    }
    return v;
  }

  private reportView(n: StockReport): PublicStockReport {
    const r: PublicStockReport = {
      newsId: this.newsPub(n.newsId),
      kind: n.tag,
      publishedTick: n.publishedTick,
      reportTick: n.reportTick,
      items: n.items.map((it) => ({
        stockId: this.pub(it.stockId),
        stockName: this.stockName(it.stockId),
        appliedPct: it.appliedPct,
        instantPct: it.instantPct,
        delayedPct: it.delayedPct,
        reason: it.reason,
        auto: { newsTerm: it.auto.newsTerm, industry: it.auto.themeName, positive: it.auto.positive },
      })),
      moreCount: n.moreCount,
      tentativeNote: n.tentativeNote,
    };
    if (n.reactionNote) r.reactionNote = n.reactionNote;
    if (n.tag === 'outcome' && n.relatedTentativeId) r.relatedTentativeId = this.newsPub(n.relatedTentativeId);
    return r;
  }

  private settlementView(s: EraSettlement): PublicSettlement {
    const era = this.g.eras.find((e) => e.id === s.eraId);
    const idx = this.g.eraReturns.length;
    return publicSettlement(s, era?.displayName ?? { ko: s.eraId, en: s.eraId }, cumulativeReturnPct(this.g.eraReturns.slice(0, idx)), (id) => ({
      id: this.pub(id),
      name: this.stockName(id),
    }));
  }

  private tradeView(r: GameTradeResult): PublicTradeResult {
    if (!r.ok) return r;
    if ('queued' in r) return r;
    const t = r.trade;
    const trade: Extract<PublicTradeResult, { trade: unknown }>['trade'] = {
      side: t.side, stockId: this.pub(t.stockId), quantity: t.quantity, price: t.price, amount: t.amount, fee: t.fee,
    };
    if (t.realizedPnl !== undefined) trade.realizedPnl = t.realizedPnl;
    return { ok: true, trade };
  }
}

function publicSettlement(
  s: EraSettlement,
  eraName: LocalizedText,
  cumulative: number,
  stock: (internalId: string) => { id: string; name: LocalizedText } | null,
): PublicSettlement {
  return {
    eraId: s.eraId,
    eraName,
    startCash: s.startCash,
    endAssets: s.endAssets,
    returnPct: s.returnPct,
    profitAmount: s.profitAmount,
    deposits: { ...s.deposits },
    cumulativeReturnPct: cumulative,
    stocks: s.stocks.flatMap((x) => {
      const v = stock(x.stockId);
      return v ? [{ ...v, totalBought: x.totalBought, pnl: x.pnl, pnlPct: x.pnlPct }] : [];
    }),
    settledOnVersionChange: s.settledOnVersionChange ?? false,
    investmentResult: { ...s.investmentResult },
    workIncome: s.workIncome,
    finalTotal: s.finalTotal,
    brokeTimeSec: s.brokeTimeSec,
  };
}

// ───────── 세이브 (공개용 뷰 기준) ─────────

/** 지금 상태를 세이브에 담는다 (pendingSaveReasons가 있을 때 부른다) */
export function savePublicGame(save: SaveData, game: PublicGame): SaveData {
  return saveGame(save, engines.get(game)!);
}

export type PublicRestoreResult =
  | { status: 'resumed'; game: PublicGame }
  | {
      status: 'settled_on_version_change';
      game: PublicGame | null;
      settlement: PublicSettlement | null;
      reason: 'version' | 'replay-mismatch';
      finalSummary: FinalSummary | null;
    }
  | { status: 'restarted_legacy'; game: PublicGame };

/** 세이브 불러오기 (save.ts의 정책 그대로, 결과만 공개용 뷰로) */
export function restorePublicGame(
  save: SaveData, eras: readonly Era[], config?: Partial<GameConfig>, options: RestoreOptions & { locale?: Locale } = {},
): PublicRestoreResult | null {
  const r = restoreGame(save, eras, config, options);
  if (!r) return null;
  const locale = options.locale ?? 'ko';
  if (r.status !== 'settled_on_version_change') return { status: r.status, game: PublicGame.wrap(r.game, locale) };
  const g = save.game!;
  const era = eras.find((e) => e.id === g.eraId);
  const names = new Map((era?.stocks ?? []).map((s) => [s.id, s.name]));
  return {
    status: r.status,
    reason: r.reason,
    finalSummary: r.finalSummary,
    game: r.game ? PublicGame.wrap(r.game, locale) : null,
    // 정산된 시대는 이미 끝나 다시 매매할 일이 없으므로, 종목 id는 같은 규칙의 무작위 문자열로만 보여준다
    settlement: r.settlement
      ? publicSettlement(
          r.settlement,
          era?.displayName ?? { ko: g.eraId, en: g.eraId },
          cumulativeReturnPct([...g.pastEraReturns, r.settlement.returnPct]),
          (id) => ({
            id: `s${deriveSeed(g.seed, 'public-stock', g.eraId, id).toString(36).padStart(7, '0')}`,
            name: names.get(id) ?? { ko: '', en: '' },
          }),
        )
      : null,
  };
}
