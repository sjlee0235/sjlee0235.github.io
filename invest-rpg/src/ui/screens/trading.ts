// 주식창 (HTS 스타일): 위에서 아래로 종목 목록 → 주문 패널(종목을 누르면) → 뉴스 피드.
// 계좌 바(총 자산·손익률·남은 시간·1배/2배)는 App의 상단 바가 그린다.
//
// 지키는 것 (docs/ui_handoff.md)
// - 공개용 뷰(PublicGame)만 쓴다. 호재/악재 방향, 테마 분위기·비중은 어디에도 표시하지 않는다
// - 뉴스는 팝업이 아니다. 피드에 쌓이고, 발표 120초 뒤 그 뉴스 바로 아래 '주가 리포트' 행이 붙는다
// - 주문은 현재가로 확인 창 없이 바로 체결하고 짧은 안내만

import type { PublicAdvanceResult } from '../../engine/publicView.ts';
import type { Screen, UiContext } from '../context.ts';
import { clear, flash, h, setText } from '../dom.ts';
import { fmtNum, fmtPct } from '../format.ts';
import {
  feedRows, newOrderState, orderMessage, setMax, setQuantity, setSide, stepQuantity, stockRows, toggleExpanded,
  type FeedRowView, type OrderSide, type OrderState, type StockRowView,
} from '../viewModels.ts';
import { changeColor } from '../../engine/colors.ts';
import { localize } from '../../i18n/index.ts';

/** 미니 차트: 최근 20분 (5초 틱 × 240) */
const CHART_TICKS = 240;
const REPORT_NOTICE_KEY = 'invest-rpg.reportNoticeSeen';

export class TradingScreen implements Screen {
  readonly el: HTMLElement;
  private readonly ctx: UiContext;
  private readonly listBody: HTMLElement;
  private readonly orderBox: HTMLElement;
  private readonly feedBox: HTMLElement;
  private rows = new Map<string, { row: HTMLElement; price: HTMLElement; chg: HTMLElement }>();
  private listSig = '';
  private order: OrderState | null = null;
  private orderOpenedAt = 0;
  private orderDone = false;
  private chartOpen = true;
  private expanded = new Set<string>();
  private feedSig = '';
  private seenNews = new Set<string>();
  private seenReports = new Set<string>();
  private firstNoticeNewsId: string | null = null;
  private orderEls: {
    price: HTMLElement; chg: HTMLElement; holding: HTMLElement; qty: HTMLInputElement; total: HTMLElement;
    exec: HTMLButtonElement; canvas: HTMLCanvasElement; chartWrap: HTMLElement; sideBtns: Record<OrderSide, HTMLButtonElement>;
  } | null = null;

  constructor(ctx: UiContext) {
    this.ctx = ctx;
    const t = ctx.t;
    this.listBody = h('div', { class: 'stock-body' });
    this.orderBox = h('div', { class: 'order-box' });
    this.feedBox = h('div', { class: 'feed-body' });
    this.el = h(
      'div',
      { class: 'view trading hts' },
      h(
        'section',
        { class: 'hts-win stock-list' },
        h('div', { class: 'hts-title' }, t('trading.listTitle')),
        h(
          'div',
          { class: 'stock-head' },
          h('span', { class: 'c-star' }, '★'),
          h('span', { class: 'c-name' }, t('trading.colName')),
          h('span', { class: 'c-price' }, t('portfolio.currentPrice')),
          h('span', { class: 'c-chg' }, t('trading.colChange')),
        ),
        this.listBody,
      ),
      this.orderBox,
      h('section', { class: 'hts-win feed' }, h('div', { class: 'hts-title' }, t('trading.feedTitle')), this.feedBox),
    );
  }

  enter(): void {
    this.listSig = '';
    this.feedSig = '';
    this.update();
  }

  /** 시대가 바뀌면 종목 id가 바뀐다 → 목록·주문·피드 상태를 비운다 */
  resetForEra(): void {
    this.closeOrder(false);
    this.rows.clear();
    this.listSig = '';
    this.feedSig = '';
    this.expanded.clear();
  }

  update(r?: PublicAdvanceResult): void {
    this.updateList(r);
    this.updateOrder();
    this.updateFeed();
  }

  // ───────── 종목 목록 ─────────

  private updateList(r?: PublicAdvanceResult): void {
    const { ctx } = this;
    const views = stockRows(ctx.game.getStockList(ctx.locale()), ctx.scheme(), ctx.locale());
    const sig = views.map((v) => `${v.id}:${v.favorite ? 1 : 0}:${v.name}`).join('|') + ctx.scheme();
    if (sig !== this.listSig) {
      this.listSig = sig;
      this.buildList(views);
    }
    const ticked = r?.advanced === true;
    for (const v of views) {
      const row = this.rows.get(v.id);
      if (!row) continue;
      setText(row.price, v.price);
      setText(row.chg, v.changePct);
      row.chg.className = `c-chg c-${v.color}`;
      row.price.className = `c-price c-${v.color}`;
      row.row.classList.toggle('selected', this.order?.stockId === v.id);
      // 5초마다 가격이 바뀌면 칸이 잠깐 번쩍
      if (ticked && v.tick) flash(row.price, v.tick === 'up' ? 'flash-up' : 'flash-down', 500);
    }
  }

  private buildList(views: StockRowView[]): void {
    clear(this.listBody);
    this.rows.clear();
    for (const v of views) {
      const star = h('button', { class: `c-star star ${v.favorite ? 'on' : ''}`, 'aria-label': 'favorite', 'aria-pressed': v.favorite ? 'true' : 'false' });
      star.addEventListener('click', (e) => {
        e.stopPropagation();
        this.ctx.game.toggleFavorite(v.id);
        this.ctx.persist();
        this.updateList();
      });
      const price = h('span', { class: 'c-price' }, v.price);
      const chg = h('span', { class: `c-chg c-${v.color}` }, v.changePct);
      const row = h('div', { class: 'stock-row', 'data-id': v.id, role: 'button' }, star, h('span', { class: 'c-name' }, v.name), price, chg);
      row.addEventListener('click', () => this.openOrder(v.id));
      this.listBody.append(row);
      this.rows.set(v.id, { row, price, chg });
    }
  }

  // ───────── 주문 패널 ─────────

  /** (화면·디버그) 종목 주문 패널 열기 */
  openOrder(stockId: string): void {
    if (this.order?.stockId === stockId) {
      this.closeOrder(true);
      return;
    }
    this.closeOrder(true);
    this.order = newOrderState(stockId);
    this.orderOpenedAt = this.ctx.now();
    this.orderDone = false;
    this.buildOrder();
    this.updateOrder();
    this.updateList();
  }

  closeOrder(trackAbandon: boolean): void {
    if (this.order && trackAbandon && !this.orderDone) {
      this.ctx.track('order_abandoned', { stockId: this.order.stockId, side: this.order.side, dwellMs: Math.max(0, this.ctx.now() - this.orderOpenedAt) });
    }
    this.order = null;
    this.orderEls = null;
    clear(this.orderBox);
    this.orderBox.classList.remove('open');
  }

  private buildOrder(): void {
    const { ctx } = this;
    const t = ctx.t;
    const o = this.order!;
    const stock = ctx.game.getStockList().find((s) => s.id === o.stockId);
    if (!stock) return;
    clear(this.orderBox);
    this.orderBox.classList.add('open');

    const price = h('span', { class: 'op-price' });
    const chg = h('span', { class: 'op-chg' });
    const holding = h('div', { class: 'op-holding' });
    const qty = h('input', { class: 'op-qty', type: 'number', inputmode: 'numeric', min: 1, step: 1, value: o.quantity, 'aria-label': t('order.quantity') });
    const total = h('div', { class: 'op-total' });
    const exec = h('button', { class: 'btn op-exec' });
    const canvas = h('canvas', { class: 'op-chart', height: 48 });
    const chartWrap = h('div', { class: 'op-chart-wrap' }, canvas);
    const sideBtn = (side: OrderSide) => {
      const b = h('button', { class: `btn tab-btn side-${side}` }, t(`trade.${side}`));
      b.addEventListener('click', () => {
        this.order = setSide(this.order!, side);
        this.updateOrder();
      });
      return b;
    };
    const sideBtns = { buy: sideBtn('buy'), sell: sideBtn('sell') };
    const minus = h('button', { class: 'btn small' }, '−');
    const plus = h('button', { class: 'btn small' }, '+');
    const max = h('button', { class: 'btn small op-max' }, t('order.max'));
    minus.addEventListener('click', () => {
      this.order = stepQuantity(this.order!, -1);
      this.updateOrder();
    });
    plus.addEventListener('click', () => {
      this.order = stepQuantity(this.order!, 1);
      this.updateOrder();
    });
    max.addEventListener('click', () => {
      const m = ctx.game.maxQty(this.order!.side, this.order!.stockId);
      this.order = setMax(this.order!, m);
      ctx.track('max_button', { stockId: this.order.stockId, side: this.order.side, quantity: m });
      this.updateOrder();
    });
    qty.addEventListener('input', () => {
      this.order = setQuantity(this.order!, Number(qty.value));
      this.updateOrder(false);
    });
    exec.addEventListener('click', () => this.execute());
    const close = h('button', { class: 'btn small op-close', 'aria-label': t('common.close') }, '×');
    close.addEventListener('click', () => {
      this.closeOrder(true);
      this.updateList();
    });
    const chartToggle = h('button', { class: 'btn small op-chart-toggle' }, t('trading.chart'));
    chartToggle.addEventListener('click', () => {
      this.chartOpen = !this.chartOpen;
      this.updateOrder();
    });

    this.orderBox.append(
      h(
        'section',
        { class: 'hts-win order' },
        h('div', { class: 'hts-title op-head' }, h('span', { class: 'op-name' }, localize(stock.name, ctx.locale())), price, chg, chartToggle, close),
        chartWrap,
        h('div', { class: 'op-desc' }, localize(stock.description, ctx.locale())),
        holding,
        h('div', { class: 'op-row' }, sideBtns.buy, sideBtns.sell, minus, qty, plus, max),
        h('div', { class: 'op-row' }, total, exec),
      ),
    );
    this.orderEls = { price, chg, holding, qty, total, exec, canvas, chartWrap, sideBtns };
  }

  private updateOrder(syncInput = true): void {
    const o = this.order;
    const els = this.orderEls;
    if (!o || !els) return;
    const { ctx } = this;
    const t = ctx.t;
    const stock = ctx.game.getStockList().find((s) => s.id === o.stockId);
    if (!stock) return;
    const color = changeColor(Number(stock.changePct.toFixed(1)), ctx.scheme());
    setText(els.price, fmtNum(stock.price, ctx.locale()));
    setText(els.chg, fmtPct(stock.changePct));
    els.price.className = `op-price c-${color}`;
    els.chg.className = `op-chg c-${color}`;
    const h1 = ctx.game.getPortfolio().holdings.find((x) => x.id === o.stockId);
    setText(
      els.holding,
      h1
        ? t('trading.holding', { qty: h1.quantity, avg: fmtNum(h1.avgPrice, ctx.locale()), pnl: fmtPct(h1.unrealizedPnlPct) })
        : t('trading.noHolding'),
    );
    if (syncInput && els.qty.value !== String(o.quantity)) els.qty.value = String(o.quantity);
    for (const side of ['buy', 'sell'] as const) els.sideBtns[side].classList.toggle('active', o.side === side);
    const p = ctx.game.previewOrder(o.side, o.stockId, o.quantity);
    setText(
      els.total,
      p.error && p.error !== 'invalid-quantity'
        ? t(`error.${p.error}`)
        : t(o.side === 'buy' ? 'trading.totalBuy' : 'trading.totalSell', { total: fmtNum(p.total, ctx.locale()), fee: fmtNum(p.fee, ctx.locale()) }),
    );
    els.total.classList.toggle('err', p.error !== null);
    els.exec.textContent = t(`trading.exec.${o.side}`);
    els.exec.className = `btn op-exec side-${o.side}`;
    els.chartWrap.hidden = !this.chartOpen;
    if (this.chartOpen) this.drawChart(els.canvas, o.stockId, color);
  }

  private execute(): void {
    const o = this.order;
    if (!o) return;
    const { ctx } = this;
    const stock = ctx.game.getStockList().find((s) => s.id === o.stockId);
    const r = o.side === 'buy' ? ctx.game.buy(o.stockId, o.quantity) : ctx.game.sell(o.stockId, o.quantity);
    const msg = orderMessage(r, stock ? localize(stock.name, ctx.locale()) : '', ctx.locale());
    ctx.toast(msg.text, msg.ok ? 'info' : 'error');
    if (r.ok) {
      this.orderDone = true;
      ctx.persist();
      ctx.refreshTop();
    }
    this.update();
  }

  private drawChart(canvas: HTMLCanvasElement, stockId: string, color: string): void {
    const w = Math.max(100, Math.floor(canvas.parentElement?.clientWidth ?? 300));
    if (canvas.width !== w) canvas.width = w;
    const hgt = canvas.height;
    const g = canvas.getContext('2d');
    if (!g) return;
    const pts = this.ctx.game.getChart(stockId).slice(-CHART_TICKS);
    g.clearRect(0, 0, w, hgt);
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.fillRect(0, 0, w, hgt);
    if (pts.length < 2) return;
    const prices = pts.map((p) => p.price);
    const lo = Math.min(...prices);
    const hi = Math.max(...prices);
    const span = Math.max(1, hi - lo);
    const css = getComputedStyle(canvas).getPropertyValue(`--c-${color}`).trim() || '#ccc';
    g.fillStyle = css;
    // 픽셀 느낌: 2px 점으로 계단처럼
    const n = CHART_TICKS;
    let prevY: number | null = null;
    pts.forEach((p, i) => {
      const x = Math.floor(((n - pts.length + i) / (n - 1)) * (w - 2));
      const y = Math.floor((1 - (p.price - lo) / span) * (hgt - 4)) + 1;
      if (prevY !== null) g.fillRect(x, Math.min(prevY, y), 2, Math.abs(y - prevY) + 2);
      else g.fillRect(x, y, 2, 2);
      prevY = y;
    });
  }

  // ───────── 뉴스 피드 ─────────

  private updateFeed(): void {
    const { ctx } = this;
    const entries = ctx.game.getFeed();
    const rows = feedRows(entries, this.expanded, ctx.locale());
    const sig = rows.map((r) => `${r.id}:${r.expanded ? 1 : 0}:${r.hasReport ? 1 : 0}`).join('|') + ctx.locale();
    if (sig === this.feedSig) return;
    this.feedSig = sig;
    clear(this.feedBox);
    if (rows.length === 0) {
      this.feedBox.append(h('div', { class: 'feed-empty' }, ctx.t('era.graceNotice')));
      return;
    }
    for (const r of rows) this.feedBox.append(this.feedRow(r));
  }

  private feedRow(r: FeedRowView): HTMLElement {
    const { ctx } = this;
    const freshNews = !this.seenNews.has(r.id);
    this.seenNews.add(r.id);
    const head = h(
      'div',
      { class: 'news-head' },
      h('span', { class: 'news-kind' }, r.kind),
      h('span', { class: 'news-title' }, r.title),
      r.fictional ? h('span', { class: 'news-tag' }, ctx.t('news.fictionalTag')) : null,
      h('span', { class: 'news-time' }, r.time),
    );
    const el = h('article', { class: `news ${r.expanded ? 'open' : 'closed'} ${freshNews ? 'fresh' : ''}` }, head);
    if (r.body) el.append(h('p', { class: 'news-body' }, r.body));
    if (r.report) {
      const freshReport = !this.seenReports.has(r.id);
      this.seenReports.add(r.id);
      const rep = h(
        'div',
        { class: `report ${freshReport ? 'fresh' : ''}` },
        h('div', { class: 'report-title' }, r.report.title),
        ...r.report.lines.map((l) => h('div', { class: 'report-line' }, h('div', {}, l.text), h('div', { class: 'report-split' }, l.split))),
        r.report.more ? h('div', { class: 'report-more' }, r.report.more) : null,
        ...r.report.notes.map((n) => h('div', { class: 'report-note' }, n)),
      );
      // 처음 본 리포트 한 번만: "게임 안 가상 수치, 투자 권유 아님"
      if (this.firstNoticeNewsId === null && !readFlag(REPORT_NOTICE_KEY)) {
        this.firstNoticeNewsId = r.id;
        writeFlag(REPORT_NOTICE_KEY);
      }
      if (this.firstNoticeNewsId === r.id) rep.append(h('div', { class: 'report-note first' }, ctx.t('report.firstNotice')));
      el.append(rep);
    }
    // 접힌 뉴스를 누르면 리포트까지 펼친다 (최신 뉴스는 늘 펼쳐져 있음)
    head.setAttribute('role', 'button');
    head.addEventListener('click', () => {
      this.expanded = toggleExpanded(this.expanded, r.id);
      if (this.expanded.has(r.id)) ctx.track('feed_expand', { newsId: r.id, hasReport: r.hasReport });
      this.updateFeed();
    });
    return el;
  }
}

function readFlag(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function writeFlag(key: string): void {
  try {
    window.localStorage.setItem(key, '1');
  } catch {
    // 무시
  }
}
