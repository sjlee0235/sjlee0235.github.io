// 주식창 (DESIGN_HANDOFF 11.2): 위에서 아래로 계좌 바 → 종목 목록 → 주문 패널(종목을 누르면) → 뉴스 창.
// 배경은 거실 그림을 어둡게 (App 장면 층).
//
// 지키는 것
// - 공개용 뷰(PublicGame)만 쓴다. 호재/악재 방향, 테마 분위기·비중은 어디에도 표시하지 않는다
// - 뉴스는 팝업이 아니다. 뉴스 창에 쌓이고(최신이 위, 스크롤하면 이전 뉴스), 발표 120초 뒤 그 뉴스 아래 '주가 리포트'
// - 주문: 수량을 맞추고 [매수]/[매도]를 누르면 현재가로 바로 체결, 짧은 안내만

import type { PublicAdvanceResult } from '../../engine/publicView.ts';
import { localize } from '../../i18n/index.ts';
import type { Screen, UiContext } from '../context.ts';
import { clear, h, setText } from '../dom.ts';
import { fmtNum, fmtPct } from '../format.ts';
import { ico, inner, playIcon, pbtn, pnl } from '../kit.ts';
import {
  dirClass, linePoints, needView, newOrderState, newsItems, orderMessage, parseQuantity, setMax, setQuantity, sparkPoints,
  stepQuantity, stockRows, accountSummary, holdingRows, type NewsItemView, type OrderState, type StockRowView,
} from '../viewModels.ts';

const SVG = 'http://www.w3.org/2000/svg';
const CHART_W = 362;
const CHART_H = 62;
const CHART_SLOTS = 240; // 20분 = 5초 × 240
const REPORT_NOTICE_KEY = 'invest-rpg.reportNoticeSeen';

function svgEl<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
}

export class TradingScreen implements Screen {
  readonly el: HTMLElement;
  private readonly ctx: UiContext;
  // 계좌 바
  private readonly assetsV: HTMLElement;
  private readonly timeV: HTMLElement;
  private readonly retV: HTMLElement;
  private readonly cashV: HTMLElement;
  // 목록 보기: 전체 종목 / 내 계좌(보유 종목)
  private mode: 'all' | 'mine' = 'all';
  private readonly modeBtns: Record<'all' | 'mine', HTMLButtonElement>;
  private readonly allHead: HTMLElement;
  private readonly mineHead: HTMLElement;
  private readonly mineBody: HTMLElement;
  private mineSig = '';
  private readonly speedBtns: Record<1 | 2, HTMLButtonElement>;
  // 종목 목록
  private readonly listPnl: HTMLElement;
  private readonly listBody: HTMLElement;
  private rows = new Map<string, { row: HTMLElement; price: HTMLElement; chg: HTMLElement; spark: SVGPolylineElement; star: HTMLElement }>();
  private listSig = '';
  // 주문
  private readonly orderPnl: HTMLElement;
  private order: OrderState | null = null;
  private orderOpenedAt = 0;
  private orderDone = false;
  private orderEls: {
    name: HTMLElement; price: HTMLElement; pct: HTMLElement; line: SVGPolylineElement; area: SVGPolygonElement; cur: HTMLElement;
    desc: HTMLElement; qty: HTMLInputElement; needL: HTMLElement; needV: HTMLElement; need: HTMLElement;
  } | null = null;
  // 뉴스
  private readonly newsWin: HTMLElement;
  private newsSig = '';
  private topNewsId: string | null = null;

  constructor(ctx: UiContext) {
    this.ctx = ctx;
    const t = ctx.t;

    // 계좌 바
    this.assetsV = h('span', { class: 'v' });
    this.timeV = h('span', { class: 'acct-time' });
    this.retV = h('b', {});
    this.cashV = h('b', {});
    const speedBtn = (s: 1 | 2) => {
      const b = pbtn('', playIcon(s), { 'aria-label': t(s === 1 ? 'speed.x1' : 'speed.x2') });
      b.addEventListener('click', () => {
        if (ctx.game.getSpeed() === s) return;
        ctx.game.setSpeed(s);
        ctx.onSpeedChanged();
        ctx.persist();
        this.updateAccount();
      });
      return b;
    };
    this.speedBtns = { 1: speedBtn(1), 2: speedBtn(2) };
    const acct = pnl(
      'acct',
      h(
        'div',
        { class: 'acct-top' },
        h('div', { class: 'acct-col' }, h('span', { class: 'lbl' }, t('portfolio.totalAssets')), h('div', { class: 'acct-assets' }, ico('coin', 24), this.assetsV)),
        h('div', { class: 'acct-col r' }, h('span', { class: 'lbl' }, t('trading.remaining')), this.timeV),
      ),
      h('div', { class: 'acct-sep' }),
      h(
        'div',
        { class: 'acct-bot' },
        h(
          'div',
          { class: 'acct-figs' },
          h('div', { class: 'acct-ret' }, h('span', { class: 'lbl' }, t('trading.return')), this.retV),
          h('div', { class: 'acct-ret acct-cash' }, h('span', { class: 'lbl' }, t('portfolio.cash')), ico('coin', 14), this.cashV),
        ),
        h('div', { class: 'speeds' }, this.speedBtns[1], this.speedBtns[2]),
      ),
    );

    // 종목 목록
    this.listBody = h('div', { class: 'stock-scroll' });
    this.mineBody = h('div', { class: 'stock-scroll mine' });
    const modeBtn = (m: 'all' | 'mine') => {
      const b = h('button', { class: 'list-tab', type: 'button' }, t(m === 'all' ? 'trading.listTitle' : 'trading.myAccount'));
      b.addEventListener('click', () => this.setMode(m));
      return b;
    };
    this.modeBtns = { all: modeBtn('all'), mine: modeBtn('mine') };
    this.allHead = h(
      'div',
      { class: 'row head' },
      h('span', {}),
      h('span', {}, t('trading.colName')),
      h('span', { style: 'text-align:center' }, t('trading.colTrend')),
      h('span', { style: 'text-align:right' }, t('portfolio.currentPrice')),
      h('span', { style: 'text-align:right' }, t('trading.colChange')),
    );
    this.mineHead = h(
      'div',
      { class: 'row hold head' },
      h('span', {}, t('trading.colName')),
      h('span', { style: 'text-align:center' }, t('trading.colQty')),
      h('span', { style: 'text-align:right' }, t('trading.colValue')),
      h('span', { style: 'text-align:right' }, t('trading.colPnl')),
    );
    this.listPnl = pnl(
      'list-pnl tall',
      h('div', { class: 'hd list-tabs' }, this.modeBtns.all, this.modeBtns.mine),
      this.allHead,
      this.mineHead,
      this.listBody,
      this.mineBody,
    );
    this.applyMode();

    this.orderPnl = pnl('order-pnl');
    this.orderPnl.hidden = true;

    // 뉴스
    this.newsWin = h('div', { class: 'news-win' });
    const news = pnl(
      'news-pnl',
      h('div', { class: 'hd', style: 'height:24px' }, h('span', {}, t('trading.feedTitle')), h('span', { class: 'note' }, t('trading.scrollHint'))),
      this.newsWin,
    );

    this.el = h('div', { class: 'view trading' }, acct, this.listPnl, this.orderPnl, news);
  }

  enter(): void {
    this.listSig = '';
    this.newsSig = '';
    this.update();
  }

  /** 시대가 바뀌면 종목 id가 바뀐다 → 목록·주문·뉴스 상태를 비운다 */
  resetForEra(): void {
    this.closeOrder(false);
    this.rows.clear();
    this.listSig = '';
    this.newsSig = '';
    this.topNewsId = null;
  }

  update(_r?: PublicAdvanceResult): void {
    this.updateAccount();
    this.updateList();
    this.updateMine();
    this.updateOrder();
    this.updateNews();
  }

  // ───────── 계좌 바 ─────────

  /** 남은 시간 (App이 0.25초마다 1초 단위로 넘김) */
  setRemaining(text: string): void {
    setText(this.timeV, text);
  }

  private updateAccount(): void {
    const { ctx } = this;
    const p = ctx.game.getPortfolio();
    setText(this.assetsV, fmtNum(p.totalAssets, ctx.locale()));

    setText(this.retV, fmtPct(p.currentReturnPct));
    setText(this.cashV, fmtNum(p.cash, ctx.locale()));
    this.retV.className = dirClass(p.currentReturnPct);
    const speed = ctx.game.getSpeed();
    for (const s of [1, 2] as const) {
      const on = speed === s;
      this.speedBtns[s].className = `pbtn ${on ? 'accent' : ''}`;
      this.speedBtns[s].setAttribute('aria-pressed', on ? 'true' : 'false');
    }
  }

  // ───────── 목록 보기 전환: 종목 / 내 계좌 ─────────

  /** (화면·디버그) 목록 보기 바꾸기 */
  setMode(m: 'all' | 'mine'): void {
    if (m === this.mode) return;
    this.mode = m;
    this.applyMode();
    this.mineSig = '';
    this.update();
  }

  get listMode(): 'all' | 'mine' {
    return this.mode;
  }

  private applyMode(): void {
    const mine = this.mode === 'mine';
    this.allHead.hidden = mine;
    this.listBody.hidden = mine;
    this.mineHead.hidden = !mine;
    this.mineBody.hidden = !mine;
    for (const m of ['all', 'mine'] as const) {
      this.modeBtns[m].classList.toggle('on', this.mode === m);
      this.modeBtns[m].setAttribute('aria-pressed', this.mode === m ? 'true' : 'false');
    }
  }

  /** 내 계좌: 현금·주식 평가 요약 + 보유 종목 (종목명, 수량, 평가금액, 산 뒤 손익률). 누르면 주문 패널 */
  private updateMine(): void {
    const { ctx } = this;
    const p = ctx.game.getPortfolio();
    const s = accountSummary(p, ctx.locale());
    setText(this.modeBtns.mine, `${ctx.t('trading.myAccount')} (${s.count})`);
    if (this.mode !== 'mine') return;
    const rows = holdingRows(p, ctx.locale());
    const sig = rows.map((r) => r.id).join('|') + ctx.locale();
    if (sig !== this.mineSig) {
      this.mineSig = sig;
      clear(this.mineBody);
      this.mineBody.append(
        h('div', { class: 'row hold sum' }, h('span', { class: 'lbl' }, ctx.t('portfolio.cash')), h('span', { class: 'n sum-cash' }), h('span', { class: 'lbl', style: 'text-align:right' }, ctx.t('trading.stockValue')), h('span', { class: 'n sum-stock' })),
      );
      if (rows.length === 0) this.mineBody.append(h('div', { class: 'mine-empty' }, ctx.t('trading.noHoldings')));
      for (const r of rows) {
        const row = h('div', { class: 'row hold', 'data-id': r.id, role: 'button' },
          h('span', { class: 'nm' }, r.name), h('span', { class: 'q' }), h('span', { class: 'n v' }), h('span', { class: 'n p' }));
        row.addEventListener('click', () => this.openOrder(r.id));
        this.mineBody.append(row);
      }
    }
    setText(this.mineBody.querySelector('.sum-cash')!, s.cash);
    setText(this.mineBody.querySelector('.sum-stock')!, s.stockValue);
    for (const r of rows) {
      const row = this.mineBody.querySelector<HTMLElement>(`.row[data-id="${r.id}"]`);
      if (!row) continue;
      setText(row.querySelector('.q')!, r.qty);
      setText(row.querySelector('.v')!, r.value);
      const pe = row.querySelector<HTMLElement>('.p')!;
      setText(pe, r.pnlPct);
      pe.className = `n p ${r.dir}`;
      row.classList.toggle('sel', this.order?.stockId === r.id);
    }
  }

  // ───────── 종목 목록 ─────────

  private updateList(): void {
    const { ctx } = this;
    const views = stockRows(ctx.game.getStockList(ctx.locale()), ctx.scheme(), ctx.locale());
    const sig = views.map((v) => `${v.id}:${v.favorite ? 1 : 0}:${v.name}`).join('|');
    if (sig !== this.listSig) {
      this.listSig = sig;
      this.buildList(views);
    }
    for (const v of views) {
      const row = this.rows.get(v.id);
      if (!row) continue;
      const dir = dirClass(Number.parseFloat(v.changePct));
      setText(row.price, v.price);
      setText(row.chg, v.changePct);
      row.price.className = `n ${dir}`;
      row.chg.className = `n ${dir}`;
      row.row.classList.toggle('sel', this.order?.stockId === v.id);
      const pts = linePoints(sparkPoints(ctx.game.getChart(v.id).slice(-CHART_SLOTS)), 56, 14, 1).map((q) => `${q.x + 1},${q.y + 1}`).join(' ');
      row.spark.setAttribute('points', pts);
      row.spark.setAttribute('class', dir || 'flat');
    }
  }

  private buildList(views: StockRowView[]): void {
    clear(this.listBody);
    this.rows.clear();
    for (const v of views) {
      const star = h('button', { class: 'star', 'aria-label': this.ctx.t('trading.favorite'), 'aria-pressed': v.favorite ? 'true' : 'false' }, ico(v.favorite ? 'star_on' : 'star_off', 22));
      star.addEventListener('click', (e) => {
        e.stopPropagation();
        this.ctx.game.toggleFavorite(v.id);
        this.ctx.persist();
        this.updateList();
      });
      const spark = svgEl('polyline', { fill: 'none', 'stroke-width': 2, 'stroke-linejoin': 'round', stroke: 'currentColor' });
      const sparkSvg = svgEl('svg', { class: 'spark', viewBox: '0 0 58 16' });
      sparkSvg.append(spark);
      const price = h('span', { class: 'n' }, v.price);
      const chg = h('span', { class: 'n' }, v.changePct);
      const row = h('div', { class: 'row', 'data-id': v.id, role: 'button' }, star, h('span', { class: 'nm' }, v.name), sparkSvg as unknown as HTMLElement, price, chg);
      row.addEventListener('click', () => this.openOrder(v.id));
      this.listBody.append(row);
      this.rows.set(v.id, { row, price, chg, spark, star });
    }
  }

  // ───────── 주문 패널 ─────────

  /** (화면·디버그) 종목 주문 패널 열기. 같은 종목을 다시 누르면 닫는다 */
  openOrder(stockId: string): void {
    if (this.order?.stockId === stockId) {
      this.closeOrder(true);
      this.updateList();
      this.updateMine();
      return;
    }
    this.closeOrder(true);
    this.order = newOrderState(stockId);
    this.orderOpenedAt = this.ctx.now();
    this.orderDone = false;
    this.buildOrder();
    this.updateOrder();
    this.updateList();
    this.updateMine();
    // 고른 종목이 목록 칸 안에 보이게
    this.rows.get(stockId)?.row.scrollIntoView({ block: 'nearest' });
  }

  closeOrder(trackAbandon: boolean): void {
    if (this.order && trackAbandon && !this.orderDone) {
      this.ctx.track('order_abandoned', { stockId: this.order.stockId, side: 'buy', dwellMs: Math.max(0, this.ctx.now() - this.orderOpenedAt) });
    }
    this.order = null;
    this.orderEls = null;
    clear(inner(this.orderPnl));
    this.orderPnl.hidden = true;
    this.listPnl.className = 'pnl list-pnl tall';
  }

  private buildOrder(): void {
    const { ctx } = this;
    const t = ctx.t;
    const o = this.order!;
    const stock = ctx.game.getStockList().find((s) => s.id === o.stockId);
    if (!stock) return;
    const box = inner(this.orderPnl);
    clear(box);
    this.orderPnl.hidden = false;
    this.listPnl.className = 'pnl list-pnl short';

    const name = h('span', { class: 'nm' }, localize(stock.name, ctx.locale()));
    const price = h('span', { class: 'pr' });
    const pct = h('span', { class: 'pc' });
    const close = pbtn('', ico('x', 14), { 'aria-label': t('common.close') });
    close.addEventListener('click', () => {
      this.closeOrder(true);
      this.updateList();
      this.updateMine();
    });

    const chartSvg = svgEl('svg', { viewBox: `0 0 ${CHART_W} ${CHART_H}`, preserveAspectRatio: 'none' });
    for (const y of [0.25, 0.5, 0.75]) {
      chartSvg.append(svgEl('line', { x1: 0, x2: CHART_W, y1: CHART_H * y, y2: CHART_H * y, stroke: 'var(--line)', 'stroke-width': 1, 'stroke-dasharray': '4 4' }));
    }
    const area = svgEl('polygon', { fill: 'currentColor', 'fill-opacity': 0.22, stroke: 'none' });
    const line = svgEl('polyline', { fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linejoin': 'round' });
    chartSvg.append(area, line);
    const cur = h('span', { class: 'cur' });
    const chart = h('div', { class: 'chart' }, chartSvg as unknown as HTMLElement, cur);

    const desc = h('div', { class: 'desc' });
    const qty = h('input', { inputmode: 'numeric', 'aria-label': t('order.quantity'), value: String(o.quantity), maxlength: 3 });
    qty.addEventListener('input', () => {
      this.order = setQuantity(this.order!, parseQuantity(qty.value));
      this.updateOrder(false);
    });
    qty.addEventListener('blur', () => this.updateOrder());
    const minus = pbtn('', '−', { 'aria-label': t('order.less') });
    const plus = pbtn('', '+', { 'aria-label': t('order.more') });
    const max = pbtn('max', t('order.max'));
    minus.addEventListener('click', () => {
      this.order = stepQuantity(this.order!, -1);
      this.updateOrder();
    });
    plus.addEventListener('click', () => {
      this.order = stepQuantity(this.order!, 1);
      this.updateOrder();
    });
    max.addEventListener('click', () => {
      const id = this.order!.stockId;
      const m = ctx.game.maxQty('buy', id);
      const held = ctx.game.getPortfolio().holdings.find((x) => x.id === id)?.quantity ?? 0;
      this.order = setMax(this.order!, m, held);
      ctx.track('max_button', { stockId: id, side: m > 0 ? 'buy' : 'sell', quantity: this.order.quantity });
      this.updateOrder();
    });
    const needL = h('div', { class: 'lbl2' });
    const needV = h('div', { class: 'v' });
    const need = h('div', { class: 'need' }, needL, needV);
    const buy = pbtn('buy', t('trade.buy'));
    const sell = pbtn('sell', t('trade.sell'));
    buy.addEventListener('click', () => this.execute('buy'));
    sell.addEventListener('click', () => this.execute('sell'));

    box.append(
      h(
        'div',
        { class: 'order' },
        h('div', { class: 'order-head' }, name, price, pct, h('span', { class: 'sp' }), close),
        chart,
        desc,
        h('div', { class: 'qty-row' }, minus, h('div', { class: 'pnl qty-box' }, h('div', { class: 'in' }, qty)), plus, max, need),
        h('div', { class: 'trade-row' }, buy, sell),
      ),
    );
    this.orderEls = { name, price, pct, line, area, cur, desc, qty, needL, needV, need };
  }

  private updateOrder(syncInput = true): void {
    const o = this.order;
    const els = this.orderEls;
    if (!o || !els) return;
    const { ctx } = this;
    const t = ctx.t;
    const locale = ctx.locale();
    const stock = ctx.game.getStockList().find((s) => s.id === o.stockId);
    if (!stock) return;
    const dir = dirClass(stock.changePct);
    setText(els.price, fmtNum(stock.price, locale));
    setText(els.pct, fmtPct(stock.changePct));
    els.price.className = `pr ${dir}`;
    els.pct.className = `pc ${dir}`;
    // 차트: 최근 20분, 선 2도트 + 같은 색 22% 면 + 지금 위치 사각형
    const pts = linePoints(ctx.game.getChart(o.stockId).slice(-CHART_SLOTS).map((p) => p.price), CHART_W, CHART_H, 6, CHART_SLOTS);
    const chartBox = els.line.ownerSVGElement?.parentElement;
    if (chartBox) chartBox.className = `chart ${dir}`;
    els.line.setAttribute('points', pts.map((p) => `${p.x},${p.y}`).join(' '));
    const first = pts[0];
    const last = pts.at(-1);
    els.area.setAttribute('points', first && last ? `${first.x},${CHART_H} ${pts.map((p) => `${p.x},${p.y}`).join(' ')} ${last.x},${CHART_H}` : '');
    if (last) {
      els.cur.style.left = `${Math.min(CHART_W - 6, Math.max(0, last.x - 3))}px`;
      els.cur.style.top = `${Math.min(CHART_H - 6, Math.max(0, last.y - 3))}px`;
    }
    const held = ctx.game.getPortfolio().holdings.find((x) => x.id === o.stockId);
    const holding = held
      ? t('trading.holding', { qty: held.quantity, pnl: fmtPct(held.unrealizedPnlPct) })
      : t('trading.noHolding');
    setText(els.desc, `${localize(stock.description, locale)} · ${holding}`);
    if (syncInput && els.qty.value !== String(o.quantity)) els.qty.value = String(o.quantity);
    const nv = needView(ctx.game.previewOrder('buy', o.stockId, Math.max(1, o.quantity)), locale);
    const shown = o.quantity === 0 ? { ...nv, value: '0', error: false } : nv;
    setText(els.needL, shown.label);
    setText(els.needV, shown.value);
    els.need.classList.toggle('err', shown.error);
  }

  private execute(side: 'buy' | 'sell'): void {
    const o = this.order;
    if (!o) return;
    const { ctx } = this;
    if (o.quantity <= 0) {
      ctx.toast(ctx.t('order.zero'), 'error');
      return;
    }
    const stock = ctx.game.getStockList().find((s) => s.id === o.stockId);
    const r = side === 'buy' ? ctx.game.buy(o.stockId, o.quantity) : ctx.game.sell(o.stockId, o.quantity);
    const msg = orderMessage(r, stock ? localize(stock.name, ctx.locale()) : '', ctx.locale());
    ctx.toast(msg.text, msg.ok ? 'info' : 'error');
    if (r.ok) {
      this.orderDone = true;
      ctx.persist();
      ctx.refreshTop();
    }
    this.update();
  }

  // ───────── 뉴스 창 ─────────

  private updateNews(): void {
    const { ctx } = this;
    const items = newsItems(ctx.game.getFeed(), ctx.locale());
    const sig = items.map((r) => `${r.id}:${r.report ? 1 : 0}`).join('|') + ctx.locale();
    if (sig === this.newsSig) return;
    this.newsSig = sig;
    const keep = this.newsWin.scrollTop;
    const newTop = items[0]?.id ?? null;
    clear(this.newsWin);
    if (items.length === 0) {
      this.newsWin.append(h('div', { class: 'news-empty' }, ctx.t('era.graceNotice')));
      return;
    }
    for (const it of items) this.newsWin.append(this.newsItem(it));
    // 새 뉴스가 오면 맨 위(최신)로, 아니면 보던 자리 그대로
    this.newsWin.scrollTop = newTop !== this.topNewsId ? 0 : keep;
    this.topNewsId = newTop;
    // 처음 본 리포트 한 번만: "게임 안 가상 수치, 투자 권유 아님"
    if (items.some((i) => i.report) && !readFlag(REPORT_NOTICE_KEY)) {
      writeFlag(REPORT_NOTICE_KEY);
      ctx.toast(ctx.t('report.firstNotice'));
    }
  }

  private newsItem(it: NewsItemView): HTMLElement {
    const { ctx } = this;
    const el = h(
      'article',
      { class: 'ni', 'data-id': it.id },
      h(
        'div',
        { class: 'ni-top' },
        h('span', { class: `kind ${it.latest ? 'new' : ''}` }, it.kind),
        it.fictional ? h('span', { class: 'tag' }, ctx.t('news.fictionalTag')) : null,
        h('span', { class: 'sp' }),
        h('span', { class: 'time' }, it.time),
      ),
      h('div', { class: 'hl' }, it.title),
      h('div', { class: 'bd' }, it.body),
    );
    if (it.report) {
      el.append(
        h(
          'div',
          { class: 'rep' },
          h('div', { class: 'rep-t' }, it.report.title),
          ...it.report.lines.map((l) =>
            h('div', { class: 'rep-i' }, h('div', { class: 'rep-l' }, h('b', { class: l.dir }, l.head), h('span', {}, l.reason)), h('div', { class: 'rep-s' }, l.split)),
          ),
          it.report.more ? h('div', { class: 'rep-note' }, it.report.more) : null,
          ...it.report.notes.map((n) => h('div', { class: 'rep-note' }, n)),
        ),
      );
    }
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
