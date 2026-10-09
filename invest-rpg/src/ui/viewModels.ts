// 화면 로직 (DOM 없는 순수 함수): 무엇을 어떤 글자로 보여줄지 정한다. 테스트: tests/ui.test.ts
// 화면 코드는 여기서 만든 값을 그대로 그리기만 한다.

import type { Locale } from '../data/schema.ts';
import { changeColor, type ChangeColor, type ColorScheme } from '../engine/colors.ts';
import type {
  PublicFeedEntry, PublicSettlement, PublicStockReport, PublicStockReportItem, PublicStockView,
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
  /** 이번 틱 가격 변화 방향 (칸 번쩍임) */
  tick: 'up' | 'down' | null;
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
    tick: s.lastTickPct > 0 ? 'up' : s.lastTickPct < 0 ? 'down' : null,
  }));
}

// ───────── 주문 패널 ─────────

export type OrderSide = 'buy' | 'sell';

export interface OrderState {
  stockId: string;
  side: OrderSide;
  quantity: number;
}

export const newOrderState = (stockId: string): OrderState => ({ stockId, side: 'buy', quantity: 1 });

/** 수량 입력: 정수, 1 이상 (상한은 '최대' 버튼이 따로 맞춘다. 넘으면 주문 때 오류 문구) */
export function setQuantity(o: OrderState, quantity: number): OrderState {
  const q = Number.isFinite(quantity) ? Math.floor(quantity) : 1;
  return { ...o, quantity: Math.max(1, q) };
}

export const stepQuantity = (o: OrderState, delta: number) => setQuantity(o, o.quantity + delta);

/** '최대': 매수면 수수료 포함 최대 수량, 매도면 보유 수량 전부 (0이면 1로 두고 오류 문구로 알린다) */
export function setMax(o: OrderState, maxQty: number): OrderState {
  return { ...o, quantity: Math.max(1, maxQty) };
}

export function setSide(o: OrderState, side: OrderSide): OrderState {
  return { ...o, side, quantity: 1 };
}

// ───────── 뉴스 피드·주가 리포트 행 ─────────

export interface ReportRowView {
  title: string;
  /** 종목별 1줄 (최대 3개): "{종목} {합계} — {이유}" */
  lines: { text: string; split: string }[];
  /** "외 N종목" */
  more: string | null;
  /** 잠정 뉴스 안내 / 결과 반응 이유 */
  notes: string[];
  unread: boolean;
}

export interface FeedRowView {
  id: string;
  kind: string;
  title: string;
  /** 펼쳐진 뉴스만 본문 */
  body: string | null;
  expanded: boolean;
  fictional: boolean;
  unread: boolean;
  time: string;
  /** 펼쳐진 뉴스에 리포트가 붙었으면 */
  report: ReportRowView | null;
  hasReport: boolean;
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

export function reportRow(r: PublicStockReport, locale: Locale, unread = false): ReportRowView {
  const notes: string[] = [];
  if (r.tentativeNote) notes.push(t(locale, 'report.tentativeNote'));
  if (r.reactionNote) notes.push(localize(r.reactionNote, locale));
  return {
    title: t(locale, 'report.title'),
    lines: r.items.map((it) => ({
      text: t(locale, 'report.line', { stock: localize(it.stockName, locale), pct: fmtPct(it.appliedPct), reason: reportReason(it, locale) }),
      split: t(locale, 'report.split', { instant: fmtPct(it.instantPct), delayed: fmtPct(it.delayedPct), total: fmtPct(it.appliedPct) }),
    })),
    more: r.moreCount > 0 ? t(locale, 'report.more', { count: r.moreCount }) : null,
    notes,
    unread,
  };
}

/** 게임 시간(초) → "0:07:00" 꼴의 발표 시각 */
function clockOf(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * 피드: 최신 뉴스는 제목+본문을 펼치고, 이전 뉴스는 제목 한 줄로 접는다 (누르면 리포트까지 펼침).
 * 리포트는 그 뉴스 바로 아래. 호재/악재 방향 표시는 없다.
 */
export function feedRows(entries: readonly PublicFeedEntry[], expanded: ReadonlySet<string>, locale: Locale): FeedRowView[] {
  return entries.map((e, i) => {
    const open = i === 0 || expanded.has(e.news.id);
    return {
      id: e.news.id,
      kind: t(locale, `news.type.${e.news.kind}`),
      title: localize(e.news.title, locale),
      body: open ? localize(e.news.body, locale) : null,
      expanded: open,
      fictional: e.news.fictional === true,
      unread: e.unread,
      time: clockOf(e.news.elapsedSeconds),
      report: open && e.report ? reportRow(e.report, locale, e.reportUnread) : null,
      hasReport: e.report !== undefined,
    };
  });
}

/** 접힌 뉴스를 누르면 펼치고, 펼친 것을 누르면 접는다 (최신 뉴스는 늘 펼침) */
export function toggleExpanded(expanded: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(expanded);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

// ───────── 정산 창 ─────────

export interface SettlementView {
  title: string;
  investment: { coins: string; pct: string };
  workIncome: string;
  total: string;
  /** 투자 결과 + 작업 수입 = 합계가 맞는지 (화면 확인용) */
  sumOk: boolean;
  formula: string;
  versionChange: string | null;
}

export function settlementView(s: PublicSettlement, locale: Locale): SettlementView {
  return {
    title: t(locale, 'settlement.title', { era: localize(s.eraName, locale) }),
    investment: { coins: fmtNum(s.investmentResult.coins, locale), pct: fmtPct(s.investmentResult.returnPct) },
    workIncome: fmtNum(s.workIncome, locale),
    total: fmtNum(s.finalTotal, locale),
    sumOk: s.investmentResult.coins + s.workIncome === s.finalTotal,
    formula: t(locale, 'settlement.formulaTotal'),
    versionChange: s.settledOnVersionChange ? t(locale, 'settlement.versionChange') : null,
  };
}

// ───────── 주문 결과 안내 ─────────

export function orderMessage(
  r: { ok: true; trade: { quantity: number; amount: number } } | { ok: true; queued: true } | { ok: false; error: string },
  stockName: string,
  locale: Locale,
): { ok: boolean; text: string } {
  if (!r.ok) return { ok: false, text: t(locale, `error.${r.error}`) };
  if ('queued' in r) return { ok: true, text: t(locale, 'trade.queued') };
  return { ok: true, text: t(locale, 'order.filled', { name: stockName, count: r.trade.quantity, amount: fmtNum(r.trade.amount, locale) }) };
}
