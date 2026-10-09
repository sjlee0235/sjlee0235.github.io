// 앱 본체: 공통 프레임(상단 바·탭 바·창·안내), 탭 전환, 게임 루프, 저장.
//
// 구성
//   #app
//    ├ .view (지금 탭 화면)          ← screens/*
//    ├ .topbar (상단: NEWS! · 설정 · 코인 / 주식창은 계좌 바)
//    ├ .tabbar (하단 탭 4개)
//    ├ .overlays (정산·최종 요약·설정)
//    └ .toasts
//
// 설정 버튼 위치: 상단 바 **가운데** (모든 탭에서 같은 자리).
//   왼쪽 위는 NEWS!, 오른쪽 위는 보유 코인 자리라 가운데만 늘 비어 있다. 같은 자리에 있어야 찾기 쉽고,
//   엄지가 주로 닿는 아래쪽(탭 바·주문 버튼)과 멀어서 잘못 누를 일이 적다.

import { MusicPlayer, type MusicTrack } from '../audio/music.ts';
import musicData from '../data/audio/music.json' with { type: 'json' };
import type { Era, Locale } from '../data/schema.ts';
import { createPresentationRng } from '../engine/dogPetting.ts';
import { eraThemeFor, type EraTheme } from '../engine/eraTheme.ts';
import { TABS, TabController, type TabId } from '../engine/homeActivities.ts';
import {
  PublicGame, restorePublicGame, savePublicGame, type PublicAdvanceResult, type PublicSettlement,
} from '../engine/publicView.ts';
import { setTelemetryConsent, type SaveData } from '../engine/save.ts';
import type { AppEventMap, AppEventType } from '../engine/telemetry.ts';
import { localize, t as tr } from '../i18n/index.ts';
import { effectiveColorScheme, loadSettings, saveSettings, type AppSettings, type SettingsStorage } from '../settings/settings.ts';
import { HtmlAudioBackend } from './audioBackend.ts';
import type { Screen, UiContext } from './context.ts';
import { clear, flash, h } from './dom.ts';
import { fmtNum, fmtPct, fmtTime } from './format.ts';
import { GameLoop, type Clock } from './loop.ts';
import { finalOverlay, settingsOverlay, settlementOverlay } from './overlays.ts';
import { pixelScale } from './scale.ts';
import { LivingRoomScreen } from './screens/livingRoom.ts';
import { TradingScreen } from './screens/trading.ts';
import { TvShoppingScreen } from './screens/tvShopping.ts';
import { WorkshopScreen } from './screens/workshop.ts';
import { loadSave, SAVE_KEY, writeSave } from './storage.ts';

export interface AppOptions {
  root: HTMLElement;
  eras: readonly Era[];
  /** 새 게임 시드 (디버그에서 고정) */
  seed: number;
  storage: SettingsStorage & { remove?(key: string): void };
  clock: Clock;
  now: () => number;
  assetBase: string;
  /** 가상 데이터로 실행 중이면 표시 */
  virtualData: boolean;
  /** (디버그) 이 시대부터 새로 시작 */
  startEraIndex?: number;
  /** (디버그) 저장된 게임을 무시하고 새로 */
  fresh?: boolean;
}

export class App {
  game!: PublicGame;
  tabs!: TabController;
  loop!: GameLoop;
  readonly music: MusicPlayer;
  settings: AppSettings;
  private save: SaveData;
  private readonly opts: AppOptions;
  private readonly root: HTMLElement;
  private readonly viewHost: HTMLElement;
  private readonly topbar: HTMLElement;
  private readonly tabbar: HTMLElement;
  private readonly overlays: HTMLElement;
  private readonly toasts: HTMLElement;
  private screens!: Record<TabId, Screen>;
  private trading!: TradingScreen;
  private scale = 2;
  private tabEnteredAt = 0;
  private settlementOpen = false;

  constructor(opts: AppOptions) {
    this.opts = opts;
    this.root = opts.root;
    this.settings = loadSettings(opts.storage);
    this.save = loadSave(opts.storage);
    const tracks = musicData.tracks as MusicTrack[];
    this.music = new MusicPlayer(
      tracks,
      new HtmlAudioBackend(opts.assetBase, () => this.music.onTrackEnded()),
      createPresentationRng(opts.seed, 'music'),
      this.settings.music,
      this.settings.masterVolume,
    );
    this.viewHost = h('div', { class: 'view-host' });
    this.topbar = h('header', { class: 'topbar' });
    this.tabbar = h('nav', { class: 'tabbar' });
    this.overlays = h('div', { class: 'overlays' });
    this.toasts = h('div', { class: 'toasts', 'aria-live': 'polite' });
    clear(this.root);
    this.root.append(this.viewHost, this.topbar, this.tabbar, this.overlays, this.toasts);
  }

  // ───────── 시작 ─────────

  start(): void {
    this.applyScale();
    const restored = this.opts.fresh ? null : restorePublicGame(this.save, this.opts.eras, undefined, { locale: this.settings.locale });
    let pendingSettlement: PublicSettlement | null = null;
    let finished = false;
    if (restored?.status === 'resumed' || restored?.status === 'restarted_legacy') {
      this.game = restored.game;
    } else if (restored?.status === 'settled_on_version_change') {
      // 앱 업데이트: 저장 시점 가격으로 정산 → 정산 창 → 다음 시대 (마지막이면 최종 요약)
      pendingSettlement = restored.settlement;
      if (restored.game) this.game = restored.game;
      else finished = true;
    }
    if (!this.game) this.game = this.newGame();
    this.game.locale = this.settings.locale;
    if (this.save.telemetryConsent) this.game.setConsent(true);

    this.tabs = new TabController(this.game);
    this.loop = new GameLoop(this.game, this.opts.clock, (r) => this.onTick(r));
    this.buildScreens();
    this.buildTabbar();
    this.showTab(this.tabs.current);
    this.applySkin();

    window.addEventListener('resize', () => this.onResize());
    document.addEventListener('visibilitychange', () => this.onVisibility(document.hidden));

    if (pendingSettlement) this.showSettlement(pendingSettlement, finished);
    else if (this.game.phase === 'era-ended') this.showSettlementFromGame();
    else this.loop.start();
    this.persist(true);
  }

  private newGame(): PublicGame {
    const g = PublicGame.create({
      eras: this.opts.eras,
      seed: this.opts.seed,
      locale: this.settings.locale,
      ...(this.opts.startEraIndex ? { startEraIndex: this.opts.startEraIndex } : {}),
    });
    return g;
  }

  // ───────── 공통 ─────────

  get context(): UiContext {
    return {
      game: this.game,
      music: this.music,
      locale: () => this.settings.locale,
      scheme: () => effectiveColorScheme(this.settings),
      t: (k, p) => tr(this.settings.locale, k, p),
      theme: () => this.theme,
      scale: () => this.scale,
      assetBase: this.opts.assetBase,
      now: this.opts.now,
      toast: (text, kind) => this.toast(text, kind),
      persist: () => this.persist(),
      onSpeedChanged: () => this.loop.reschedule(),
      goTab: (tab) => this.selectTab(tab),
      refreshTop: () => this.renderTop(),
      track: <K extends AppEventType>(type: K, data: AppEventMap[K]) => this.game.track(type, data, this.opts.now()),
    };
  }

  get seed(): number {
    return this.opts.seed;
  }

  get theme(): EraTheme {
    return eraThemeFor(this.game.eraId);
  }

  private t(k: string, p?: Record<string, string | number>): string {
    return tr(this.settings.locale, k, p);
  }

  private buildScreens(): void {
    const ctx = this.context;
    this.trading = new TradingScreen(ctx);
    this.screens = {
      living_room: new LivingRoomScreen(ctx, this.opts.seed),
      trading: this.trading,
      workshop: new WorkshopScreen(ctx),
      tv_shopping: new TvShoppingScreen(ctx),
    };
  }

  /** 시대별 주식창 색 세트 → CSS 변수 */
  private applySkin(): void {
    const c = this.theme.htsSkin.colors as Record<string, string>;
    for (const [k, v] of Object.entries(c)) this.root.style.setProperty(`--hts-${k}`, v);
    this.root.dataset.skin = this.theme.htsSkin.id;
    this.root.dataset.virtual = this.opts.virtualData ? '1' : '0';
  }

  private applyScale(): void {
    this.scale = pixelScale(window.innerWidth, window.innerHeight);
    this.root.style.setProperty('--s', String(this.scale));
  }

  private onResize(): void {
    const before = this.scale;
    this.applyScale();
    if (before !== this.scale) this.screens[this.tabs.current].enter();
  }

  private onVisibility(hidden: boolean): void {
    this.loop.setHidden(hidden);
    this.music.setBackground(hidden);
    this.game.track('app_session', { phase: hidden ? 'background' : 'foreground' }, this.opts.now());
    this.persist();
  }

  // ───────── 탭 ─────────

  private buildTabbar(): void {
    clear(this.tabbar);
    for (const tab of [...TABS].sort((a, b) => a.order - b.order)) {
      const b = h(
        'button',
        { class: `tab ${tab.enabled ? '' : 'disabled'}`, 'data-tab': tab.id, 'aria-label': this.t(tab.labelKey) },
        h('span', { class: 'tab-icon', style: `background-image:url("${this.opts.assetBase}art/ui/tab_${tab.id}.png")` }),
        h('span', { class: 'tab-label' }, this.t(tab.labelKey)),
      );
      // 비활성 탭은 흐리게만 (눌러서 들어가면 "방송 준비 중" 화면)
      if (!tab.enabled) b.title = this.t('tabs.comingSoon');
      b.addEventListener('click', () => this.selectTab(tab.id));
      this.tabbar.append(b);
    }
  }

  selectTab(tab: TabId): void {
    const from = this.tabs.current;
    if (!this.tabs.select(tab)) {
      this.renderTop();
      return;
    }
    this.game.track('tab_switch', { from, to: tab, dwellMs: Math.max(0, this.opts.now() - this.tabEnteredAt) }, this.opts.now());
    this.screens[from].leave?.();
    this.showTab(tab);
    this.persist();
  }

  private showTab(tab: TabId): void {
    clear(this.viewHost);
    const screen = this.screens[tab];
    this.viewHost.append(screen.el);
    screen.enter();
    this.root.dataset.tab = tab;
    this.tabEnteredAt = this.opts.now();
    for (const b of this.tabbar.querySelectorAll<HTMLElement>('.tab')) b.classList.toggle('active', b.dataset.tab === tab);
    this.renderTop();
  }

  // ───────── 상단 바 ─────────

  renderTop(): void {
    const v = this.tabs.topBar();
    const locale = this.settings.locale;
    clear(this.topbar);
    const gear = h('button', { class: 'gear', 'aria-label': this.t('settings.title') });
    gear.addEventListener('click', () => this.openSettings());

    if (v.accountBar) {
      const a = v.accountBar;
      const speedBtn = (s: 1 | 2) => {
        const b = h('button', { class: `btn small speed ${a.speed === s ? 'active' : ''}`, 'aria-pressed': a.speed === s ? 'true' : 'false' }, this.t(s === 1 ? 'speed.x1' : 'speed.x2'));
        b.addEventListener('click', () => {
          if (this.game.getSpeed() === s) return;
          this.game.setSpeed(s);
          this.loop.reschedule();
          this.persist();
          this.renderTop();
        });
        return b;
      };
      const pctCls = a.returnPct > 0 ? 'up' : a.returnPct < 0 ? 'down' : 'flat';
      this.topbar.className = 'topbar account';
      this.topbar.append(
        h(
          'div',
          { class: 'acct-left' },
          h('div', { class: 'acct-label' }, this.t('portfolio.totalAssets')),
          h('div', { class: 'acct-assets' }, h('span', { class: 'coin-ico' }), fmtNum(a.totalAssets, locale)),
          h('div', { class: `acct-pct pct-${pctCls}`, 'data-dir': pctCls }, `${this.t('trading.return')} ${fmtPct(a.returnPct)}`),
        ),
        gear,
        h(
          'div',
          { class: 'acct-right' },
          h('div', { class: 'acct-time' }, this.t('era.remaining', { time: fmtTime(a.remainingSeconds) })),
          h('div', { class: 'speed-group' }, speedBtn(1), speedBtn(2)),
        ),
      );
      this.colorAccountPct();
      return;
    }

    this.topbar.className = 'topbar';
    const left = h('div', { class: 'top-left' });
    if (v.newsBadge) {
      const badge = h('button', { class: 'news-badge', 'aria-label': this.t('newsBadge') }, this.t('newsBadge'));
      badge.addEventListener('click', () => {
        this.game.track('news_badge_click', { fromTab: this.tabs.current, unreadCount: this.game.getUnreadCount() }, this.opts.now());
        this.selectTab('trading');
      });
      left.append(badge);
    }
    const right = h(
      'div',
      { class: 'top-right' },
      h('div', { class: 'top-cash' }, h('span', { class: 'coin-ico' }), v.cash !== null ? fmtNum(v.cash, locale) : ''),
      v.workPending !== null
        ? h('div', { class: 'top-pending', title: this.t('work.payoutNote') }, `${this.t('work.pendingShort')} +${fmtNum(v.workPending, locale)}`)
        : null,
      v.speedBadge ? h('div', { class: 'speed-badge' }, this.t('speed.badge')) : null,
    );
    this.topbar.append(left, gear, right);
  }

  /** 손익률 색도 설정의 상승 색상 모드를 따른다 */
  private colorAccountPct(): void {
    const el = this.topbar.querySelector<HTMLElement>('.acct-pct');
    if (!el) return;
    const scheme = effectiveColorScheme(this.settings);
    const dir = el.dataset.dir;
    const color = dir === 'up' ? (scheme === 'korean' ? 'red' : 'green') : dir === 'down' ? (scheme === 'korean' ? 'blue' : 'red') : 'neutral';
    el.classList.add(`c-${color}`);
  }

  // ───────── 틱 ─────────

  private onTick(r: PublicAdvanceResult): void {
    if (!r.advanced) return;
    this.tabs.onTick();
    this.screens[this.tabs.current].update(r);
    this.renderTop();
    if (r.saveNeeded) this.persist();
    if (r.settlement) this.showSettlement(r.settlement, !this.game.hasNextEra);
  }

  // ───────── 정산·다음 시대·최종 ─────────

  private showSettlementFromGame(): void {
    const d = this.game.getEraDebrief();
    if (d.settlement) this.showSettlement(d.settlement, !this.game.hasNextEra);
  }

  private showSettlement(s: PublicSettlement, isLast: boolean): void {
    if (this.settlementOpen) return;
    this.settlementOpen = true;
    let debrief = null;
    try {
      debrief = this.game.phase === 'era-ended' ? this.game.getEraDebrief() : null;
    } catch {
      debrief = null;
    }
    const opened = this.opts.now();
    const el = settlementOverlay(s, debrief, this.settings.locale, () => {
      this.game.track('screen_view', { screen: 'settlement', dwellMs: this.opts.now() - opened }, this.opts.now());
      el.remove();
      this.settlementOpen = false;
      this.afterSettlement(isLast);
    });
    this.overlays.append(el);
  }

  private afterSettlement(isLast: boolean): void {
    if (!isLast && this.game.phase === 'era-ended' && this.game.startNextEra()) {
      this.tabs.onEraStart();
      this.trading.resetForEra();
      this.applySkin();
      this.showTab(this.tabs.current);
      this.toast(this.t('era.graceNotice'));
      this.persist(true);
      this.loop.start();
      return;
    }
    if (this.game.phase === 'era-ended') this.game.startNextEra();
    this.persist(true);
    this.showFinal();
  }

  private showFinal(): void {
    let summary;
    try {
      summary = this.game.getFinalSummary();
    } catch {
      return;
    }
    const names: Record<string, string> = {};
    for (const e of this.opts.eras) names[e.id] = localize(e.displayName, this.settings.locale);
    this.overlays.append(
      finalOverlay(summary, names, this.settings.locale, () => {
        this.opts.storage.remove?.(SAVE_KEY);
        window.location.reload();
      }),
    );
  }

  // ───────── 설정 ─────────

  openSettings(): void {
    const opened = this.opts.now();
    const render = () => {
      this.overlays.querySelector('.overlay.settings')?.remove();
      this.overlays.append(
        settingsOverlay(this.settings, {
          credits: this.music.getCredits(),
          telemetryConsent: this.save.telemetryConsent,
          change: (next, key, value) => {
            const localeChanged = next.locale !== this.settings.locale;
            this.applySettings(next);
            this.game.track('setting_changed', { key, value }, this.opts.now());
            if (localeChanged) this.rebuildForLocale(next.locale);
            render();
          },
          setConsent: (on) => {
            this.save = setTelemetryConsent(this.save, on);
            this.game.setConsent(on);
            this.persist(true);
          },
          close: () => {
            this.game.track('screen_view', { screen: 'settings', dwellMs: this.opts.now() - opened }, this.opts.now());
            this.overlays.querySelector('.overlay.settings')?.remove();
          },
        }),
      );
    };
    render();
  }

  private applySettings(next: AppSettings): void {
    this.settings = next;
    saveSettings(this.opts.storage, next);
    this.music.setMasterVolume(next.masterVolume);
    this.music.setVolume(next.music.volume);
    if (this.music.getSettings().muted !== next.music.muted) this.music.toggleMute();
    this.screens[this.tabs.current].update();
    this.renderTop();
  }

  private rebuildForLocale(locale: Locale): void {
    this.game.locale = locale;
    const current = this.tabs.current;
    this.buildScreens();
    this.buildTabbar();
    this.showTab(current);
  }

  // ───────── 저장·안내 ─────────

  /** 엔진이 저장을 원하면(또는 force) 세이브를 기기에 쓴다 */
  persist(force = false): void {
    if (!force && this.game.pendingSaveReasons.length === 0) {
      this.saveMusicSettings();
      return;
    }
    this.save = savePublicGame(this.save, this.game);
    writeSave(this.opts.storage, this.save);
    this.saveMusicSettings();
  }

  private saveMusicSettings(): void {
    const m = this.music.getSettings();
    if (m.genre !== this.settings.music.genre || m.muted !== this.settings.music.muted) {
      this.settings = { ...this.settings, music: { ...this.settings.music, genre: m.genre, muted: m.muted } };
      saveSettings(this.opts.storage, this.settings);
    }
  }

  toast(text: string, kind: 'info' | 'error' = 'info'): void {
    const el = h('div', { class: `toast ${kind}` }, text);
    this.toasts.append(el);
    while (this.toasts.children.length > 3) this.toasts.firstElementChild?.remove();
    window.setTimeout(() => el.remove(), 2200);
  }

  // ───────── 디버그용 (debug.ts에서만) ─────────

  /** 틱 n개를 바로 진행 (정산·뉴스가 나오면 멈춤) */
  debugAdvance(maxTicks: number, until: (r: PublicAdvanceResult) => boolean = () => false): number {
    let n = 0;
    while (n < maxTicks && this.game.phase === 'running') {
      const r = this.loop.step();
      n++;
      if (!r.advanced) break;
      if (r.settlement || until(r)) break;
    }
    return n;
  }

  get tradingScreen(): TradingScreen {
    return this.trading;
  }

  /** (디버그) 표시를 강제로 갱신 */
  debugRefresh(): void {
    this.screens[this.tabs.current].update();
    this.renderTop();
    const pending = this.topbar.querySelector<HTMLElement>('.top-pending');
    if (pending) flash(pending, 'bump', 300);
  }
}
