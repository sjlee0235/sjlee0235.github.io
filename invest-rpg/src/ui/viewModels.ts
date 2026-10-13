// 화면 로직 (DOM 없는 순수 함수): 무엇을 어떤 글자로 보여줄지 정한다. 테스트: tests/ui.test.ts
// 화면 코드는 여기서 만든 값을 그대로 그리기만 한다.

import type { Locale } from '../data/schema.ts';
import { changeColor, type ChangeColor, type ColorScheme } from '../engine/colors.ts';
import { endingFor, type Ending } from '../engine/config.ts';
import type { FinalSummary, WorkStatus } from '../engine/game.ts';
import type { PricePoint } from '../engine/priceEngine.ts';
import type {
  PublicFeedEntry, PublicPortfolio, PublicSettlement, PublicStockReport, PublicStockReportItem, PublicStockView,
} from '../engine/publicView.ts';
import { localize, t } from '../i18n/index.ts';
import { fmtNum, fmtPct } from './format.ts';

// ───────── 종목 목록 ─────────

export interface StockRowView {
  id: string;
  name: string;
  price: string;
  changePct: string;
  color: ChangeColor;
  favorite: boolean;
}

/**
 * 종목 목록 한 줄씩. 순서는 엔진이 준 그대로(즐겨찾기 먼저, 가나다순).
 * 색은 설정의 상승 색상 모드로 화면이 정한다 (게임 시작 뒤 설정을 바꿔도 바로 반영).
 */
export function stockRows(list: readonly PublicStockView[], scheme: ColorScheme, locale: Locale): StockRowView[] {
  return list.map((s) => ({
    id: s.id,
    name: localize(s.name, locale),
    price: fmtNum(s.price, locale),
    changePct: fmtPct(s.changePct),
    color: changeColor(Number(s.changePct.toFixed(1)), scheme),
    favorite: s.isFavorite,
  }));
}

/** 색 이름 → CSS 클래스 (상승 up / 하락 dn / 보합 없음). 실제 색은 설정의 상승 색상 모드가 CSS에서 정한다 */
export function dirClass(changePct: number): '' | 'up' | 'dn' {
  const v = Number(changePct.toFixed(1));
  return v > 0 ? 'up' : v < 0 ? 'dn' : '';
}

// ───────── 내 계좌 (보유 종목) ─────────

export interface HoldingRowView {
  id: string;
  name: string;
  /** "12주" */
  qty: string;
  /** 평가금액 (현재가 × 수량) */
  value: string;
  /** 구매 평단가 (수수료 포함 평균 매입가, 반올림) */
  avg: string;
  /** 산 뒤 손익률 (평균 매입가 대비, 수수료 포함) */
  pnlPct: string;
  dir: '' | 'up' | 'dn';
}

export interface AccountSummaryView {
  cash: string;
  stockValue: string;
  /** 보유 종목 수 */
  count: number;
}

/** 보유 종목 줄 (처음 산 순서) */
export function holdingRows(p: PublicPortfolio, locale: Locale): HoldingRowView[] {
  return p.holdings.map((h) => ({
    id: h.id,
    name: localize(h.name, locale),
    qty: t(locale, 'trading.shares', { count: fmtNum(h.quantity, locale) }),
    value: fmtNum(h.marketValue, locale),
    avg: fmtNum(Math.round(h.avgPrice), locale),
    pnlPct: fmtPct(h.unrealizedPnlPct),
    dir: dirClass(h.unrealizedPnlPct),
  }));
}

export function accountSummary(p: PublicPortfolio, locale: Locale): AccountSummaryView {
  return {
    cash: fmtNum(p.cash, locale),
    stockValue: fmtNum(p.holdings.reduce((a, h) => a + h.marketValue, 0), locale),
    count: p.holdings.length,
  };
}

// ───────── 추이선·차트 (SVG 좌표) ─────────

/** 20분 추이선: 최근 20분 가격에서 고르게 n점 (점이 모자라면 있는 만큼) */
export function sparkPoints(history: readonly PricePoint[], n = 10): number[] {
  if (history.length === 0) return [];
  if (history.length <= n) return history.map((p) => p.price);
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(history[Math.round((i * (history.length - 1)) / (n - 1))]!.price);
  return out;
}

/**
 * 가격 목록 → SVG 꺾은선 좌표 (w×h 상자, 위아래 pad 여백). 가격이 모두 같으면 가운데 수평선.
 * slots를 주면 그 칸 수 기준으로 오른쪽에 붙인다 (시대 초반 차트가 짧을 때)
 */
export function linePoints(
  prices: readonly number[], w: number, h: number, pad = 2, slots = prices.length, alsoFit: readonly number[] = [],
): { x: number; y: number }[] {
  if (prices.length === 0) return [];
  const y = chartScaleY([...prices, ...alsoFit], h, pad);
  const n = Math.max(2, slots);
  const offset = n - prices.length;
  return prices.map((p, i) => ({
    x: Number((((offset + i) / (n - 1)) * w).toFixed(2)),
    y: y(p),
  }));
}

/** 값들의 최저~최고를 h 높이(위아래 pad 여백)에 맞추는 y 좌표 함수. 값이 모두 같으면 가운데 */
function chartScaleY(values: readonly number[], h: number, pad: number): (v: number) => number {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo;
  return (v) => Number((span === 0 ? h / 2 : pad + (1 - (v - lo) / span) * (h - pad * 2)).toFixed(2));
}

export interface ChartView {
  points: { x: number; y: number }[];
  /** 평단가 가로 점선의 y (보유하지 않으면 null) */
  avgY: number | null;
  /** 산 시점 세로 점선의 x들 (차트에 보이는 20분 안의 매수만) */
  buyXs: number[];
}

/**
 * 주문 패널 차트: 최근 slots칸 가격 + (보유 종목이면) 평단가 가로 점선, 산 시점 세로 점선.
 * 평단가가 차트 범위 밖이어도 보이도록 세로 범위에 평단가를 함께 넣는다.
 */
export function chartView(
  history: readonly PricePoint[], w: number, h: number, pad: number, slots: number,
  holding: { avgPrice: number; buyTicks: readonly number[] } | null,
): ChartView {
  const shown = history.slice(-slots);
  const prices = shown.map((p) => p.price);
  const fit = holding ? [holding.avgPrice] : [];
  const points = linePoints(prices, w, h, pad, slots, fit);
  if (!holding || prices.length === 0) return { points, avgY: null, buyXs: [] };
  const avgY = chartScaleY([...prices, ...fit], h, pad)(holding.avgPrice);
  const xByTick = new Map(shown.map((p, i) => [p.tick, points[i]!.x]));
  const buyXs = [...new Set(holding.buyTicks.map((t) => xByTick.get(t)).filter((x): x is number => x !== undefined))];
  return { points, avgY, buyXs };
}

// ───────── 주문 패널 (매수·매도를 먼저 고르고 → 수량·최대 → 매수하기/매도하기) ─────────

export const QTY_MAX = 999;

export type OrderSide = 'buy' | 'sell';

export interface OrderState {
  stockId: string;
  quantity: number;
  /** 고른 방향. null이면 아직 고르지 않음 (수량 칸이 잠겨 있다) */
  side: OrderSide | null;
}

export const newOrderState = (stockId: string): OrderState => ({ stockId, quantity: 0, side: null });

/** 매수·매도 고르기: 수량은 1 (그 방향으로 1주도 안 되면 0) */
export function chooseSide(o: OrderState, side: OrderSide, maxQty: number): OrderState {
  return { ...o, side, quantity: Math.min(1, Math.max(0, maxQty)) };
}

/** 방향 고르기 전으로 (취소·체결 뒤) */
export const clearSide = (o: OrderState): OrderState => ({ ...o, side: null, quantity: 0 });

/** 수량 입력: 숫자만, 0~999 */
export function setQuantity(o: OrderState, quantity: number): OrderState {
  const q = Number.isFinite(quantity) ? Math.floor(quantity) : 0;
  return { ...o, quantity: Math.max(0, Math.min(QTY_MAX, q)) };
}

/** 입력칸 글자 → 수량 (숫자가 아닌 글자는 버린다) */
export function parseQuantity(text: string): number {
  const digits = text.replace(/\D/g, '');
  return digits === '' ? 0 : Number(digits.slice(0, 4));
}

export const stepQuantity = (o: OrderState, delta: number) => setQuantity(o, o.quantity + delta);

/** '최대': 고른 방향의 최대 수량 (매수 = 지금 현금으로 수수료까지 내고 살 수 있는 수, 매도 = 보유 수량). 999 이하 */
export function setMax(o: OrderState, maxForSide: number): OrderState {
  return setQuantity(o, maxForSide);
}

export interface NeedView {
  label: string;
  value: string;
  error: boolean;
}

/** 매수: "필요 코인 (수수료 19)" + 9,715 / 매도: "받을 코인 (수수료 19)" + 9,677. 현금·보유가 모자라면 오류 문구 */
export function needView(p: { side: OrderSide; total: number; fee: number; error: string | null }, locale: Locale): NeedView {
  const label = t(locale, p.side === 'buy' ? 'trading.need' : 'trading.receive', { fee: fmtNum(p.fee, locale) });
  if (p.error === 'insufficient-cash' || p.error === 'insufficient-shares') return { label, value: t(locale, `error.${p.error}`), error: true };
  return { label, value: fmtNum(p.total, locale), error: false };
}

// ───────── 뉴스 창 (한 건씩, 아래로 스크롤하면 이전 뉴스) ─────────

export interface ReportLineView {
  head: string;
  dir: '' | 'up' | 'dn';
  reason: string;
  split: string;
}

export interface ReportView {
  title: string;
  lines: ReportLineView[];
  more: string | null;
  notes: string[];
}

export interface NewsItemView {
  id: string;
  kind: string;
  latest: boolean;
  title: string;
  body: string;
  time: string;
  fictional: boolean;
  report: ReportView | null;
}

function reportReason(it: PublicStockReportItem, locale: Locale): string {
  const r = it.reason?.[locale] ?? it.reason?.ko;
  if (r) return r;
  return t(locale, 'report.auto', {
    newsTerm: it.auto.newsTerm,
    theme: localize(it.auto.industry, locale),
    effect: t(locale, it.auto.positive ? 'report.benefit' : 'report.burden'),
  });
}

export function reportView(r: PublicStockReport, locale: Locale): ReportView {
  const notes: string[] = [];
  if (r.tentativeNote) notes.push(t(locale, 'report.tentativeNote'));
  if (r.reactionNote) notes.push(localize(r.reactionNote, locale));
  return {
    title: t(locale, 'report.title'),
    lines: r.items.map((it) => ({
      head: `${localize(it.stockName, locale)} ${fmtPct(it.appliedPct)}`,
      dir: dirClass(it.appliedPct),
      reason: reportReason(it, locale),
      split: [
        t(locale, 'report.split', { instant: fmtPct(it.instantPct) }),
        ...it.stages.filter((st) => st.pct !== 0).map((st) => t(locale, 'report.splitAfter', { sec: st.afterSec, pct: fmtPct(st.pct) })),
      ].join(' · '),
    })),
    more: r.moreCount > 0 ? t(locale, 'report.more', { count: r.moreCount }) : null,
    notes,
  };
}

/** 게임 시간(초) → "0:07:00" 꼴의 발표 시각 */
export function clockOf(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** 뉴스 창: 최신이 맨 위. 모든 뉴스가 같은 구조(종류·시각, 제목 한 줄, 본문 3줄 이내, 리포트) */
export function newsItems(entries: readonly PublicFeedEntry[], locale: Locale): NewsItemView[] {
  return entries.map((e, i) => ({
    id: e.news.id,
    kind: t(locale, `news.type.${e.news.kind}`),
    latest: i === 0,
    title: localize(e.news.title, locale),
    body: localize(e.news.body, locale),
    time: clockOf(e.news.elapsedSeconds),
    fictional: e.news.fictional === true,
    report: e.report ? reportView(e.report, locale) : null,
  }));
}

// ───────── 거실: 인테리어 업그레이드 버튼 ─────────

export interface UpgradeView {
  label: string;
  aria: string;
  /** ok = 살 수 있음 / poor = 코인 부족(55% 흐리게, 누르면 안내) / done = 완성 */
  state: 'ok' | 'poor' | 'done';
  /** 채워진 단계 점 수 */
  filled: number;
}

export function upgradeView(level: number, maxLevel: number, nextCost: number | null, cash: number, locale: Locale): UpgradeView {
  if (nextCost === null || level >= maxLevel) {
    const label = t(locale, 'living.upgradeDone');
    return { label, aria: label, state: 'done', filled: maxLevel };
  }
  const cost = fmtNum(nextCost, locale);
  return {
    label: t(locale, 'living.upgrade', { cost }),
    aria: t(locale, 'living.upgradeAria', { cost, level, max: maxLevel }),
    state: cash >= nextCost ? 'ok' : 'poor',
    filled: level,
  };
}

// ───────── 작업실 ─────────

export interface WorkshopView {
  eyesPrefix: string;
  eyes: string;
  eyesSuffix: string;
  donePrefix: string;
  done: string;
  doneSuffix: string;
}

/** "눈 1개 | 완성 2개" — 완성은 이번 묶음(100개)에서 만든 수, 100개가 되면 지급되고 0으로 */
export function workshopView(w: WorkStatus, locale: Locale): WorkshopView {
  const split = (key: string, n: number) => {
    const [pre, post] = t(locale, key, { count: '\u0000' }).split('\u0000');
    return [pre ?? '', String(n), post ?? ''] as const;
  };
  const [eyesPrefix, eyes, eyesSuffix] = split('work.eyes', w.eyes);
  const [donePrefix, done, doneSuffix] = split('work.done', w.payoutMode === 'batch' ? w.batchDolls : w.dollsCompleted);
  return { eyesPrefix, eyes, eyesSuffix, donePrefix, done, doneSuffix };
}

// ───────── 정산 창 ─────────

export interface SettlementView {
  title: string;
  investment: { coins: string; pct: string; dir: '' | 'up' | 'dn' };
  /** 이번 시대에 받은 작업 수입 (100개 묶음 지급분, 시대 종료 합산분) */
  workIncome: string;
  interior: string | null;
  /** 다음 시대 시작 자금 */
  total: string;
  /** 투자 결과 = 다음 시대 시작 자금 (작업 수입은 이미 현금에 들어가 있음) */
  sumOk: boolean;
  /** "인형 N개를 더 완성하면 작업 수입 M코인이 지급돼요." (지급 예정이 있을 때만) */
  pendingNote: string | null;
  versionChange: string | null;
}

export function settlementView(s: PublicSettlement, work: Pick<WorkStatus, 'pending' | 'batchDolls' | 'batchSize'> | null, locale: Locale): SettlementView {
  const paid = s.workIncome + s.deposits.work;
  const pendingNote = work && work.pending > 0
    ? t(locale, 'settlement.pendingWork', { dolls: work.batchSize - work.batchDolls, coins: fmtNum(work.pending, locale) })
    : null;
  return {
    title: t(locale, 'settlement.title', { era: localize(s.eraName, locale) }),
    investment: { coins: fmtNum(s.investmentResult.coins, locale), pct: fmtPct(s.investmentResult.returnPct), dir: dirClass(s.investmentResult.returnPct) },
    workIncome: fmtNum(paid, locale),
    interior: s.withdrawals > 0 ? fmtNum(s.withdrawals, locale) : null,
    total: fmtNum(s.finalTotal, locale),
    sumOk: s.investmentResult.coins + s.workIncome === s.finalTotal,
    pendingNote,
    versionChange: s.settledOnVersionChange ? t(locale, 'settlement.versionChange') : null,
  };
}

// ───────── 최종 요약 ─────────

export interface FinalView {
  title: string;
  lines: string[];
  total: string;
  cumulative: string;
  totalWork: string;
  unpaid: string | null;
  interior: string;
  /** 엔딩 (마지막 인테리어 단계: 0~2 새드 / 3~6 중립 / 7 해피) */
  ending: Ending;
  endingTitle: string;
  endingBody: string;
}

export function finalView(f: FinalSummary, eraNames: Readonly<Record<string, string>>, locale: Locale): FinalView {
  return {
    title: t(locale, 'final.title'),
    lines: f.eras.map((e) => t(locale, 'final.eraLine', {
      era: eraNames[e.eraId] ?? e.eraId, pct: fmtPct(e.returnPct), work: fmtNum(e.workIncome, locale),
    })),
    total: fmtNum(f.finalCoins, locale),
    cumulative: fmtPct(f.cumulativeReturnPct),
    totalWork: fmtNum(f.totalWorkIncome, locale),
    unpaid: f.unpaidWork > 0 ? t(locale, 'final.unpaid', { coins: fmtNum(f.unpaidWork, locale) }) : null,
    interior: t(locale, 'final.interior', { level: f.interiorLevel }),
    // 예전 저장(엔딩 필드 없음)도 같은 규칙으로
    ending: endingFor(f.interiorLevel),
    endingTitle: t(locale, `ending.${endingFor(f.interiorLevel)}.title`),
    endingBody: t(locale, `ending.${endingFor(f.interiorLevel)}.body`),
  };
}

// ───────── 주문 결과 안내 ─────────

export function orderMessage(
  r: { ok: true; trade: { side: 'buy' | 'sell'; quantity: number; amount: number } } | { ok: true; queued: true } | { ok: false; error: string },
  stockName: string,
  locale: Locale,
): { ok: boolean; text: string } {
  if (!r.ok) return { ok: false, text: t(locale, `error.${r.error}`) };
  if ('queued' in r) return { ok: true, text: t(locale, 'trade.queued') };
  return {
    ok: true,
    text: t(locale, r.trade.side === 'buy' ? 'order.filledBuy' : 'order.filledSell', {
      name: stockName, count: r.trade.quantity, amount: fmtNum(r.trade.amount, locale),
    }),
  };
}

// ───────── 브라우저 ─────────

/** 삼성 인터넷인가 (사용자 에이전트에 "SamsungBrowser/"가 들어 있다) */
export function isSamsungInternet(userAgent: string): boolean {
  return /SamsungBrowser\//.test(userAgent);
}
