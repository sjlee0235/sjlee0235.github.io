// 앱 본체: 무대(390×844), 장면 그림, 상단(NEWS!·코인·지급 예정·설정), 하단 탭 바, 창, 안내, 게임 루프, 저장.
//
// 구성 (DESIGN_HANDOFF.md)
//   #app
//    └ .stage (390×844, 화면에 맞춰 통째로 확대·축소. data-tod = night|day)
//       ├ .scene      장면 그림 (탭·시대·밤낮·인테리어 단계). 주식창에서는 거실 그림을 어둡게
//       ├ .view-host  지금 탭 화면 (screens/*)
//       ├ .hud        NEWS!(왼쪽 위) · 코인 칩 · 지급 예정 칩(작업실) · 설정(맨 오른쪽 위)
//       ├ .tabbar     하단 탭 4개
//       ├ .overlays   정산·최종 요약·설정·처음 안내·기록 동의
//       └ .toasts
//
// 밤/낮: 기기 현지 시각 18:00~06:00 밤, 30초마다 확인해서 바뀌면 2초 동안 그림이 바뀐다 (색 토큰은 바로).

import { MusicPlayer, type MusicTrack } from '../audio/music.ts';
import musicData from '../data/audio/music.json' with { type: 'json' };
import type { Era, Locale } from '../data/schema.ts';
import { TICK_SECONDS } from '../engine/config.ts';
import type { FinalSummary } from '../engine/game.ts';
import { TABS, TabController, type TabId } from '../engine/homeActivities.ts';
import {
  PublicGame, restorePublicGame, savePublicGame, type PublicAdvanceResult, type PublicSettlement,
} from '../engine/publicView.ts';
import { createPresentationRng } from '../engine/rng.ts';
import { setTelemetryConsent, type SaveData } from '../engine/save.ts';
import type { AppEventMap, AppEventType } from '../engine/telemetry.ts';
import { localize, t as tr } from '../i18n/index.ts';
import { effectiveColorScheme, loadSettings, saveSettings, type AppSettings, type SettingsStorage } from '../settings/settings.ts';
import { artEraFor, LP_FRAMES, LP_H, LP_W, lpFile, lpPos, lpTier, sceneFile, sceneFrames, timeOfDayAt, type ArtEra, type SceneKind, type TimeOfDay } from './art.ts';
import { HtmlAudioBackend } from './audioBackend.ts';
import type { Screen, UiContext } from './context.ts';
import { clear, flash, h, setText } from './dom.ts';
import { displayRemaining, fmtNum, fmtTime } from './format.ts';
import { hourglassIcon, ico, inner, pbtn, playIcon, pnl } from './kit.ts';
import type { IconName } from './icons.ts';
import { GameLoop, type Clock } from './loop.ts';
import {
  confirmNewOverlay, confirmOverlay, consentOverlay, eraIntroOverlay, finalOverlay, samsungDarkNoticeOverlay, settingsOverlay, settlementOverlay, titleScreen,
  tutorialOverlay,
} from './overlays.ts';
import { SceneLayer } from './scene.ts';
import { LivingRoomScreen } from './screens/livingRoom.ts';
import { TradingScreen } from './screens/trading.ts';
import { TvShoppingScreen } from './screens/tvShopping.ts';
import { WorkshopScreen } from './screens/workshop.ts';
import { loadSave, SAVE_KEY, writeSave } from './storage.ts';
import { isSamsungInternet } from './viewModels.ts';
import type { ClientInfo, TelemetryUploader } from './telemetryUploader.ts';
import { TELEMETRY_BUILD } from './telemetryConfig.ts';

export const STAGE_W = 390;
export const STAGE_H = 844;
/** 무대 밖 흐린 배경이 화면 가장자리까지 번지도록 바깥으로 넓히는 폭 (CSS .backdrop의 inset과 같게) */
const BACKDROP_PAD = 40;
/** 플레이 기록 동의를 물은 적이 있는가 (게임 세이브와 따로) */
export const FIRST_RUN_KEY = 'invest-rpg.introSeen';
/** 삼성 인터넷 다크 모드 안내를 보여 줬는가 (11차) */
export const SAMSUNG_NOTICE_KEY = 'invest-rpg.samsungDarkNoticeSeen';

const TAB_ICON: Record<TabId, IconName> = { living_room: 'sofa', trading: 'monitor', workshop: 'doll', tv_shopping: 'tv' };
const TAB_SCENE: Record<TabId, SceneKind> = { living_room: 'living', trading: 'living', workshop: 'workshop', tv_shopping: 'tv' };

export interface AppOptions {
  root: HTMLElement;
  eras: readonly Era[];
  /** 새 게임 시드 (디버그에서 고정) */
  seed: number;
  storage: SettingsStorage & { remove?(key: string): void };
  clock: Clock;
  now: () => number;
  /** 밤/낮 판정용 현지 시각 (디버그·점검에서 바꿀 수 있게) */
  localTime?: () => Date;
  assetBase: string;
  /** 이 시대가 가상 데이터(아직 콘텐츠 없음)면 true → 화면에 표시 */
  isVirtual: (eraId: string) => boolean;
  /** (디버그) 이 시대부터 새로 시작 */
  startEraIndex?: number;
  /** (디버그) 저장된 게임을 무시하고 새로 */
  fresh?: boolean;
  /** (디버그·점검) 첫 화면·튜토리얼·동의 창을 건너뛰고 바로 게임 */
  skipIntro?: boolean;
  /** 플레이 기록 전송 통 (18차). 없으면 기록하지 않는다. 동의 전에는 엔진이 아무것도 넘기지 않는다 */
  telemetry?: TelemetryUploader;
  /** 접속 환경 (유입 경로·기기 분류). session_begin에 담는다 */
  clientInfo?: () => ClientInfo;
}

export class App {
  game!: PublicGame;
  tabs!: TabController;
  loop!: GameLoop;
  readonly music: MusicPlayer;
  settings: AppSettings;
  readonly scene: SceneLayer;
  /** 무대 밖 빈 곳을 채우는 흐린 배경 (17차) */
  private readonly backdrop: HTMLElement;
  private backdropFile: string | null = null;
  private backdropFrames = 1;
  /** 이번 접속에서 session_begin을 보냈나 (동의가 켜진 판에서 한 번) */
  private sessionBegun = false;
  private entry: 'new' | 'continue' | 'resume' = 'continue';
  private save: SaveData;
  private readonly opts: AppOptions;
  private readonly stage: HTMLElement;
  private readonly viewHost: HTMLElement;
  private readonly hud: HTMLElement;
  private readonly tabbar: HTMLElement;
  private readonly overlays: HTMLElement;
  private readonly toasts: HTMLElement;
  private readonly newsChip: HTMLButtonElement;
  private readonly timeChip: HTMLElement;
  private readonly timeV: HTMLElement;
  private readonly coinChip: HTMLElement;
  private readonly coinV: HTMLElement;
  private readonly x2Mark: HTMLElement;
  private readonly pendChip: HTMLElement;
  private readonly pendV: HTMLElement;
  private readonly virtualMark: HTMLElement;
  private screens!: Record<TabId, Screen>;
  private trading!: TradingScreen;
  private living!: LivingRoomScreen;
  private tabEnteredAt = 0;
  private settlementOpen = false;
  /** 끝난 판의 최종 요약을 보여주는 중: 아무것도 저장하지 않는다 */
  saveLocked = false;
  private tod: TimeOfDay = 'night';
  private forcedTod: TimeOfDay | null = null;
  /** 지금 거실 배경이면 LP를 얹을 시대·단계 (아니면 null) */
  private lpScene: { era: ArtEra; level: number } | null = null;
  private lpTick = 0;

  constructor(opts: AppOptions) {
    this.opts = opts;
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
    this.backdrop = h('div', { class: 'backdrop', 'aria-hidden': 'true' });
    this.scene = new SceneLayer(opts.assetBase);
    this.viewHost = h('div', { class: 'view-host' });

    // 상단
    this.newsChip = h('button', { class: 'news-chip', 'aria-label': this.t('newsBadge') }, h('span', { class: 'frame' }, h('span', { class: 'face' }, this.t('newsBadge'))));
    this.newsChip.addEventListener('click', () => {
      this.game.track('news_badge_click', { fromTab: this.tabs.current, unreadCount: this.game.getUnreadCount() }, this.opts.now());
      this.selectTab('trading');
    });
    this.coinV = h('span', { class: 'v' });
    this.x2Mark = h('span', { class: 'x2-mark' }, playIcon(2));
    this.coinChip = pnl('chip coin-chip', this.x2Mark, ico('coin', 20), this.coinV);
    this.pendV = h('span', { class: 'v' });
    this.pendChip = pnl('chip pend-chip', h('span', {}, this.t('work.pendingShort')), this.pendV, ico('coin_s', 16));
    const gear = pbtn('panel gear-btn', ico('gear', 30), { 'aria-label': this.t('settings.title') });
    gear.addEventListener('click', () => this.openSettings());
    this.virtualMark = h('div', { class: 'virtual-mark' }, 'VIRTUAL DATA');
    // 남은 시간 (주식창 밖 탭): 왼쪽 위, NEWS!는 그 오른쪽
    this.timeV = h('span', { class: 'v' });
    this.timeChip = pnl('chip time-chip', hourglassIcon(), this.timeV);
    this.timeChip.setAttribute('aria-label', this.t('trading.remaining'));
    this.hud = h('div', { class: 'hud' }, this.timeChip, this.newsChip, this.coinChip, this.pendChip, gear, this.virtualMark);

    this.tabbar = h('nav', { class: 'tabbar' });
    this.overlays = h('div', { class: 'overlays' });
    this.toasts = h('div', { class: 'toasts', 'aria-live': 'polite' });
    this.stage = h('div', { class: 'stage' }, this.scene.el, this.viewHost, this.hud, this.tabbar, this.overlays, this.toasts);
    // 화면의 첫 터치가 소리 잠금 해제를 겸한다 (브라우저는 사용자가 누르기 전에는 소리를 못 낸다)
    this.stage.addEventListener('pointerdown', () => {
      if (!this.music.getNowPlaying().unlocked) this.music.unlock();
    });
    clear(opts.root);
    opts.root.append(this.backdrop, this.stage);
  }

  // ───────── 시작 ─────────

  /** 앱 켜기: 무대·밤낮을 맞추고 첫 화면(제목 + 이어하기/새로하기). 디버그 nointro면 바로 게임 */
  start(): void {
    this.fitStage();
    this.applyTod(false);
    window.addEventListener('resize', () => this.fitStage());
    const tel = this.opts.telemetry;
    if (tel) {
      // 쌓인 기록: 20초마다, 페이지를 닫을 때 보낸다. 지난 접속에서 못 보낸 것도 여기서 보낸다
      window.setInterval(() => void tel.flush(false), 20_000);
      window.addEventListener('pagehide', () => void tel.flush(true));
      window.addEventListener('error', (ev) => {
        if (this.game) this.game.track('client_error', { code: 'window_error', message: String(ev.message).slice(0, 200) }, this.opts.now());
      });
      void tel.flush(false);
    }
    document.addEventListener('visibilitychange', () => this.onVisibility(document.hidden));
    window.setInterval(() => this.applyTod(true), 30_000);
    // 남은 시간은 3초 틱 사이에도 1초씩 줄어들게 (0.25초마다 다시 그림)
    window.setInterval(() => this.renderClock(), 250);
    // LP 재생 애니메이션 (4프레임, 약 8fps). 거실 배경이 보일 때만 그림을 바꾼다
    window.setInterval(() => {
      this.lpTick++;
      this.renderLp();
    }, 125);
    if (this.opts.skipIntro) {
      this.begin(this.opts.fresh ?? false, false);
      return;
    }
    this.showTitle();
  }

  /** 저장된 진행이 있는가 (이어하기 가능) */
  get hasSave(): boolean {
    return this.save.game !== null;
  }

  private showTitle(): void {
    this.stage.classList.add('at-title');
    const el = titleScreen(this.settings.locale, this.hasSave, {
      continue: () => {
        el.remove();
        this.stage.classList.remove('at-title');
        this.begin(false, false);
      },
      newGame: () => {
        const go = () => {
          el.remove();
          this.stage.classList.remove('at-title');
          this.begin(true, true);
        };
        if (!this.hasSave) {
          go();
          return;
        }
        const ask = confirmNewOverlay(this.settings.locale, (ok) => {
          ask.remove();
          if (ok) go();
        });
        this.overlays.append(ask);
      },
    });
    this.overlays.append(el);
    this.refreshScene(0);
    this.maybeSamsungNotice();
  }

  /** 삼성 인터넷이면 다크 모드 안내를 한 번 (첫 화면 위에) */
  private maybeSamsungNotice(): void {
    if (!isSamsungInternet(navigator.userAgent) || this.opts.storage.get(SAMSUNG_NOTICE_KEY) === '1') return;
    const note = samsungDarkNoticeOverlay(this.settings.locale, () => {
      note.remove();
      this.opts.storage.set(SAMSUNG_NOTICE_KEY, '1');
    });
    this.overlays.append(note);
  }

  /**
   * 게임 시작. fresh = 저장된 진행을 지우고 새로(새로하기), tutorial = 이야기·게임 방법을 먼저 보여 줌.
   * 처음 실행이면(기록 동의를 물은 적이 없으면) 시작 전에 플레이 기록 동의 창.
   */
  private begin(fresh: boolean, tutorial: boolean): void {
    if (fresh) {
      this.save = { ...this.save, game: null };
      writeSave(this.opts.storage, this.save);
    }
    this.entry = this.opts.skipIntro ? 'resume' : fresh ? 'new' : 'continue';
    const tel = this.opts.telemetry;
    if (tel && this.save.game) tel.setGame(String(this.save.game.seed));
    const restored = fresh ? null : restorePublicGame(this.save, this.opts.eras, undefined, { locale: this.settings.locale, ...(tel ? { telemetry: tel } : {}) });
    let pendingSettlement: PublicSettlement | null = null;
    let finishedSummary: FinalSummary | null = null;
    if (restored?.status === 'resumed' || restored?.status === 'restarted_legacy') {
      this.game = restored.game;
    } else if (restored?.status === 'settled_on_version_change') {
      // 앱 업데이트(또는 끝난 판): 저장 시점 가격으로 정산 → 정산 창 → 다음 시대 (게임이 없으면 최종 요약)
      // restored.game이 있으면 이미 다음 시대가 시작된 상태(phase 'running')다
      pendingSettlement = restored.settlement;
      if (restored.game) this.game = restored.game;
      else finishedSummary = restored.finalSummary;
    }
    if (!this.game) {
      tel?.setGame(String(this.opts.seed));
      this.game = this.newGame();
      if (tel) this.game.attachTelemetry(tel);
    }
    // 끝난 판을 다시 열었을 때: 최종 요약을 보여주고, '처음부터 다시'를 누르기 전까지 새 판을 저장하지 않는다
    if (finishedSummary) this.saveLocked = true;
    this.game.locale = this.settings.locale;
    if (this.save.telemetryConsent) this.game.setConsent(true);
    this.trackSessionBegin(this.entry);

    this.tabs = new TabController(this.game);
    this.loop = new GameLoop(this.game, this.opts.clock, (r) => this.onTick(r));
    this.buildScreens();
    this.buildTabbar();
    this.showTab(this.tabs.current);
    this.applyEraMarks();

    if (finishedSummary) {
      const summary = finishedSummary;
      if (pendingSettlement) this.showSettlement(pendingSettlement, () => this.showFinal(summary));
      else this.showFinal(summary);
      return;
    }
    const go = () => {
      if (pendingSettlement) this.showSettlement(pendingSettlement, () => this.afterSettlement());
      else if (this.game.phase === 'era-ended') this.showSettlementFromGame();
      else if (this.game.phase === 'finished') this.showFinal();
      // 시대가 막 시작된 판이면(새로하기) 시대 시작 카드부터
      else if (this.game.tick === 0 && !this.opts.skipIntro) this.showEraIntro(() => this.loop.start());
      else this.loop.start();
      // 숨긴 탭에서 열렸으면 처음부터 백그라운드 일시정지
      if (document.hidden) this.onVisibility(true);
      this.persist(true);
    };
    const askConsent = !this.opts.skipIntro && this.opts.storage.get(FIRST_RUN_KEY) !== '1';
    // 9차: 튜토리얼이 있으면 그 마지막 장에서 기록 동의를 받는다. 튜토리얼 없이 들어왔는데 아직 안 물었으면 따로 묻는다
    if (tutorial) this.showTutorial(go, askConsent ? (agree) => this.applyConsent(agree) : undefined);
    else if (askConsent) this.askConsent(go);
    else go();
  }

  private applyConsent(agree: boolean): void {
    this.save = setTelemetryConsent(this.save, agree);
    this.game.setConsent(agree);
    this.opts.storage.set(FIRST_RUN_KEY, '1');
    if (agree) this.trackSessionBegin('consent');
  }

  /** 접속 정보 한 번 (동의가 켜져 있을 때만 실제로 기록된다) */
  private trackSessionBegin(entry: 'new' | 'continue' | 'resume' | 'consent'): void {
    const tel = this.opts.telemetry;
    if (this.sessionBegun || !tel || !this.game.telemetryConsent) return;
    this.sessionBegun = true;
    const info = this.opts.clientInfo?.();
    this.game.track('session_begin', {
      entry,
      sessionIndex: tel.sessionIndex,
      daysSinceFirst: tel.daysSinceFirst,
      build: TELEMETRY_BUILD,
      source: info?.source ?? 'unknown',
      inApp: info?.inApp ?? 'none',
      os: info?.os ?? 'other',
      browser: info?.browser ?? 'other',
      mobile: info?.mobile ?? false,
      screenW: info?.screenW ?? 0,
      screenH: info?.screenH ?? 0,
      standalone: info?.standalone ?? false,
      lang: info?.lang ?? '',
      tzOffsetMin: info?.tzOffsetMin ?? 0,
    }, this.opts.now());
  }

  /** (점검용) 플레이 기록 전송 통 */
  get telemetry(): TelemetryUploader | undefined {
    return this.opts.telemetry;
  }

  /** 처음 실행: 플레이 기록 동의 (기본 꺼짐) */
  private askConsent(done: () => void): void {
    const el = consentOverlay(this.settings.locale, (agree) => {
      el.remove();
      this.applyConsent(agree);
      done();
    });
    this.overlays.append(el);
  }

  private showTutorial(done: () => void, consent?: (agree: boolean) => void): void {
    const el = tutorialOverlay(this.settings.locale, () => {
      el.remove();
      done();
    }, consent);
    this.overlays.append(el);
  }

  private newGame(): PublicGame {
    return PublicGame.create({
      eras: this.opts.eras,
      seed: this.opts.seed,
      locale: this.settings.locale,
      ...(this.opts.startEraIndex ? { startEraIndex: this.opts.startEraIndex } : {}),
    });
  }

  // ───────── 무대 크기·밤낮 ─────────

  /** 390×844 무대를 화면에 맞춰 확대·축소하고 가운데에 둔다 */
  private fitStage(): void {
    const w = window.innerWidth;
    const hgt = window.innerHeight;
    const k = Math.min(w / STAGE_W, hgt / STAGE_H);
    this.stage.style.transform = `translate(${Math.round((w - STAGE_W * k) / 2)}px, ${Math.round((hgt - STAGE_H * k) / 2)}px) scale(${k})`;
    this.layoutBackdrop();
  }

  /**
   * 무대 밖 빈 곳(양옆·위아래) 채우기 (17차): 지금 장면 그림을 화면을 덮을 만큼 키워 흐리고 어둡게 깐다.
   * 장면 그림이 여러 칸(작업실 시트)이어도 첫 칸만 보이게 크기·위치를 직접 정한다.
   */
  private setBackdrop(file: string, frames: number): void {
    if (this.backdropFile === file) return;
    this.backdropFile = file;
    this.backdropFrames = frames;
    this.backdrop.style.backgroundImage = `url("${this.opts.assetBase}${file}")`;
    this.layoutBackdrop();
  }

  private layoutBackdrop(): void {
    const w = window.innerWidth;
    const hgt = window.innerHeight;
    const pad = BACKDROP_PAD;
    const bw = Math.max(w, (hgt * STAGE_W) / STAGE_H) * 1.1;
    const fh = (bw * STAGE_H) / STAGE_W;
    this.backdrop.style.backgroundSize = `${Math.round(bw)}px ${Math.round(fh * this.backdropFrames)}px`;
    this.backdrop.style.backgroundPosition = `${Math.round((w - bw) / 2 + pad)}px ${Math.round((hgt - fh) / 2 + pad)}px`;
  }

  private applyTod(fade: boolean): void {
    const next = this.forcedTod ?? timeOfDayAt(this.opts.localTime?.() ?? new Date());
    if (next === this.tod && this.stage.dataset.tod) return;
    this.tod = next;
    this.stage.dataset.tod = next;
    this.opts.root.style.setProperty('--app-bg', next === 'night' ? '#0c0818' : '#2a1a30');
    this.refreshScene(fade ? 2000 : 0);
  }

  /** (디버그·점검) 밤/낮 고정. null이면 현지 시각대로 */
  forceTod(tod: TimeOfDay | null): void {
    this.forcedTod = tod;
    this.applyTod(false);
  }

  private refreshScene(fadeMs: number): void {
    // 첫 화면: 처음 상태(Lv0)의 거실
    if (!this.game) {
      this.scene.show(sceneFile('living', '2000s', this.tod, 0), 1, 0, fadeMs);
      this.setBackdrop(sceneFile('living', '2000s', this.tod, 0), 1);
      this.scene.setDim(false);
      this.lpScene = { era: '2000s', level: 0 };
      this.renderLp();
      return;
    }
    const tab = this.tabs.current;
    const kind = TAB_SCENE[tab];
    const era = artEraFor(this.game.eraId);
    const file = sceneFile(kind, era, this.tod, this.game.interiorLevel);
    this.scene.show(file, sceneFrames(kind, era), this.screens[tab].frame?.() ?? 0, fadeMs);
    this.setBackdrop(file, sceneFrames(kind, era));
    this.scene.setDim(tab === 'trading');
    // 거실 배경(거실 탭·주식창)에는 LP 그림을 얹는다 (15차: 배경에서는 옛 LP를 지웠다)
    this.lpScene = kind === 'living' ? { era, level: this.game.interiorLevel } : null;
    this.renderLp();
    // 작업실 작업물 그림(2010·2020년대)도 시대·밤낮·단계에 맞춘다
    this.screens[tab].onSceneChanged?.();
  }

  /** LP 그림: 방 단계별 종류(낡은 가방형 / 깨끗한 가방형 / 월넛), 음악이 들리면 재생 4프레임, 아니면 정지 */
  private renderLp(): void {
    const s = this.lpScene;
    if (!s) {
      this.scene.setOverlay(null);
      return;
    }
    const np = this.music.getNowPlaying();
    const playing = np.unlocked && !np.background && np.track !== null && this.music.effectiveGain > 0;
    const frame = playing ? LP_FRAMES[1 + (this.lpTick % 4)]! : 'idle';
    this.scene.setOverlay({ file: lpFile(lpTier(s.level), s.era, this.tod, frame), ...lpPos(s.level), w: LP_W, h: LP_H });
  }

  // ───────── 공통 ─────────

  get context(): UiContext {
    return {
      game: this.game,
      music: this.music,
      scene: this.scene,
      locale: () => this.settings.locale,
      scheme: () => effectiveColorScheme(this.settings),
      t: (k, p) => tr(this.settings.locale, k, p),
      artEra: () => artEraFor(this.game.eraId),
      tod: () => this.tod,
      assetBase: this.opts.assetBase,
      now: this.opts.now,
      toast: (text, kind) => this.toast(text, kind),
      confirm: (o) => {
        const ask = confirmOverlay(o.title, o.body, tr(this.settings.locale, 'common.cancel'), o.yes, (ok) => {
          ask.remove();
          if (ok) o.onYes();
        });
        this.overlays.append(ask);
      },
      persist: () => this.persist(),
      onSpeedChanged: () => {
        this.loop.reschedule();
        this.persist(true); // 배속 변경은 엔진의 저장 신호가 없어서 바로 저장
        this.renderTop();
      },
      onInteriorChanged: () => {
        this.refreshScene(400);
        this.scene.flash();
        flash(this.coinChip, 'bump', 350);
        this.renderTop();
        this.persist(true);
      },
      onCoinsChanged: () => {
        flash(this.coinChip, 'bump', 350);
        this.renderTop();
      },
      goTab: (tab) => this.selectTab(tab),
      refreshTop: () => this.renderTop(),
      flyTo: (text, x, y, target) => this.flyTo(text, x, y, target),
      track: <K extends AppEventType>(type: K, data: AppEventMap[K]) => this.game.track(type, data, this.opts.now()),
    };
  }

  get seed(): number {
    return this.opts.seed;
  }

  private t(k: string, p?: Record<string, string | number>): string {
    return tr(this.settings.locale, k, p);
  }

  private buildScreens(): void {
    const ctx = this.context;
    this.trading = new TradingScreen(ctx);
    this.living = new LivingRoomScreen(ctx, this.opts.seed);
    this.screens = {
      living_room: this.living,
      trading: this.trading,
      workshop: new WorkshopScreen(ctx),
      tv_shopping: new TvShoppingScreen(ctx),
    };
  }

  private applyEraMarks(): void {
    this.virtualMark.hidden = !this.opts.isVirtual(this.game.eraId);
    // 시대 색 테마 (style.css data-era)
    this.stage.dataset.era = artEraFor(this.game.eraId);
    this.stage.dataset.scheme = effectiveColorScheme(this.settings);
  }

  private onVisibility(hidden: boolean): void {
    if (!this.game) {
      this.music.setBackground(hidden);
      if (!hidden) this.applyTod(true);
      return;
    }
    this.loop.setHidden(hidden);
    this.music.setBackground(hidden);
    this.game.track('app_session', { phase: hidden ? 'background' : 'foreground' }, this.opts.now());
    if (!hidden) this.applyTod(true);
    this.persist();
    // 화면을 떠나면(앱 전환·끄기) 쌓인 기록을 바로 보낸다
    if (hidden) void this.opts.telemetry?.flush(true);
  }

  // ───────── 탭 ─────────

  private buildTabbar(): void {
    clear(this.tabbar);
    for (const tab of [...TABS].sort((a, b) => a.order - b.order)) {
      const b = h(
        'button',
        { class: `tab ${tab.enabled ? '' : 'off'}`, 'data-tab': tab.id, 'aria-label': this.t(tab.labelKey) },
        ico(TAB_ICON[tab.id], 28),
        h('span', {}, this.t(tab.labelKey)),
      );
      // 비활성 탭은 흐리게 (눌러서 들어가면 "방송 준비 중" 화면 + 눌린 회색 버튼 모양)
      if (!tab.enabled) b.setAttribute('aria-disabled', 'true');
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
    this.stage.dataset.tab = tab;
    this.tabEnteredAt = this.opts.now();
    for (const b of this.tabbar.querySelectorAll<HTMLElement>('.tab')) {
      const on = b.dataset.tab === tab;
      b.classList.toggle('active', on);
      if (on) b.setAttribute('aria-current', 'page');
      else b.removeAttribute('aria-current');
    }
    this.refreshScene(0);
    this.renderTop();
  }

  // ───────── 상단 ─────────

  /** 화면에 보일 남은 시간(초) */
  get shownRemainingSeconds(): number {
    if (!this.game) return 0;
    const running = this.game.phase === 'running' && !this.game.isPaused;
    return displayRemaining(this.game.remainingSeconds, running ? this.loop.tickProgress : 0, TICK_SECONDS);
  }

  /** 남은 시간 표시만 다시 (주식창 계좌 바 + 다른 탭의 왼쪽 위 칩) */
  private renderClock(): void {
    if (!this.game || !this.tabs) return;
    const text = fmtTime(this.shownRemainingSeconds);
    setText(this.timeV, text);
    if (this.tabs.current === 'trading') this.trading.setRemaining(text);
  }

  renderTop(): void {
    const v = this.tabs.topBar();
    const locale = this.settings.locale;
    const onTrading = v.accountBar !== null;
    this.timeChip.hidden = onTrading;
    this.newsChip.hidden = !v.newsBadge;
    this.newsChip.classList.toggle('blink', v.newsBadge);
    this.coinChip.hidden = onTrading || v.cash === null;
    if (v.cash !== null) setText(this.coinV, fmtNum(v.cash, locale));
    const x2 = this.game.getSpeed() === 2;
    this.coinChip.classList.toggle('x2', x2);
    this.x2Mark.hidden = !x2;
    this.pendChip.hidden = v.workPending === null;
    if (v.workPending !== null) setText(this.pendV, `+${fmtNum(v.workPending, locale)}`);
    // 지급 예정이 세 자리를 넘거나 2배속이면 칩을 2배속 코인 칩과 같은 폭(130)으로
    this.pendChip.classList.toggle('wide', x2 || (v.workPending ?? 0) >= 100);
    this.renderClock();
  }

  private flyTo(text: string, x: number, y: number, target: 'pending' | 'coins'): void {
    const el = h('div', { class: 'fly' }, text);
    el.style.left = `${x - 14}px`;
    el.style.top = `${y - 12}px`;
    this.stage.append(el);
    // 칩 가운데: 오른쪽 60 + 폭 112의 절반, 위 9(코인) / 48(지급 예정) + 높이 34의 절반
    const tx = STAGE_W - 60 - 56 - 14;
    const ty = (target === 'pending' ? 48 : 9) + 17 - 12;
    void el.offsetWidth;
    el.style.transform = `translate(${tx - (x - 14)}px, ${ty - (y - 12)}px) scale(.8)`;
    el.style.opacity = '0.2';
    window.setTimeout(() => {
      el.remove();
      this.renderTop();
      flash(target === 'pending' ? this.pendChip : this.coinChip, 'bump', 350);
    }, 600);
  }

  // ───────── 틱 ─────────

  private onTick(r: PublicAdvanceResult): void {
    if (!r.advanced) return;
    this.tabs.onTick();
    this.screens[this.tabs.current].update(r);
    this.renderTop();
    if (r.saveNeeded) this.persist();
    if (r.settlement) this.showSettlement(r.settlement, () => this.afterSettlement());
  }

  // ───────── 정산·다음 시대·최종 ─────────

  private showSettlementFromGame(): void {
    const d = this.game.getEraDebrief();
    if (d.settlement) this.showSettlement(d.settlement, () => this.afterSettlement());
  }

  private showSettlement(s: PublicSettlement, onConfirm: () => void): void {
    if (this.settlementOpen) return;
    this.settlementOpen = true;
    let debrief = null;
    try {
      debrief = this.game.phase === 'era-ended' ? this.game.getEraDebrief() : null;
    } catch {
      debrief = null;
    }
    const opened = this.opts.now();
    const el = settlementOverlay(s, debrief, this.game.getWorkStatus(), this.settings.locale, () => {
      this.game.track('screen_view', { screen: 'settlement', dwellMs: this.opts.now() - opened }, this.opts.now());
      el.remove();
      this.settlementOpen = false;
      onConfirm();
    });
    this.overlays.append(el);
  }

  /** 정산 창 '확인' 뒤: 다음 시대 시작, 마지막이면 최종 요약 */
  private afterSettlement(): void {
    // 앱 업데이트로 정산된 경우: 엔진이 이미 다음 시대를 시작해 두었다
    if (this.game.phase === 'running') {
      this.beginEra();
      return;
    }
    if (this.game.phase === 'era-ended' && this.game.startNextEra()) {
      this.beginEra();
      return;
    }
    this.persist(true);
    this.showFinal();
  }

  private beginEra(): void {
    this.tabs.onEraStart();
    this.trading.resetForEra();
    this.applyEraMarks();
    this.showTab(this.tabs.current);
    this.persist(true);
    const start = () => {
      this.toast(this.t('era.graceNotice'));
      this.loop.start();
    };
    // 디버그 &nointro=1이면 카드 없이 바로
    if (this.opts.skipIntro) start();
    else this.showEraIntro(start);
  }

  /** 시대 시작 카드: [시작하기]를 누르면 시간이 흐르기 시작한다 (디버그 패널에서도 부른다) */
  showEraIntro(done: () => void): void {
    const ids = this.opts.eras.map((e) => e.id);
    const era = this.opts.eras.find((e) => e.id === this.game.eraId);
    const el = eraIntroOverlay(
      this.settings.locale,
      artEraFor(this.game.eraId),
      era ? localize(era.displayName, this.settings.locale) : this.game.eraId,
      Math.max(0, ids.indexOf(this.game.eraId)),
      ids.length,
      () => {
        el.remove();
        done();
      },
    );
    this.overlays.append(el);
  }

  private showFinal(given?: FinalSummary): void {
    let summary = given;
    if (!summary) {
      try {
        summary = this.game.getFinalSummary();
      } catch (e) {
        this.game.track('client_error', { code: 'final_summary', message: String(e) }, this.opts.now());
        return;
      }
    }
    this.game.track('ending_view', {
      ending: String(summary.ending),
      finalCoins: summary.finalCoins,
      cumulativeReturnPct: summary.cumulativeReturnPct,
      interiorLevel: summary.interiorLevel,
      totalWorkIncome: summary.totalWorkIncome,
    }, this.opts.now());
    void this.opts.telemetry?.flush(false);
    const names: Record<string, string> = {};
    for (const e of this.opts.eras) names[e.id] = localize(e.displayName, this.settings.locale);
    this.overlays.append(
      finalOverlay(
        summary,
        names,
        this.settings.locale,
        () => {
          this.opts.storage.remove?.(SAVE_KEY);
          this.saveLocked = true; // 새로 고침 전에 끝난 판이 다시 저장되지 않게
          window.location.reload();
        },
        // 엔딩 칸 배경: 마지막 단계의 거실 (지금 시대 그림·밤낮)
        this.opts.assetBase + sceneFile('living', artEraFor(this.game.eraId), this.tod, summary.interiorLevel),
      ),
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
            if (on) this.trackSessionBegin('consent');
            this.persist(true);
          },
          saveAndExit: () => {
            // 저장하고 첫 화면으로 (새로 고침하면 첫 화면, [이어하기]로 지금 시점부터)
            this.persist(true);
            this.saveLocked = true;
            window.location.reload();
          },
          showSamsungNotice: isSamsungInternet(navigator.userAgent)
            ? () => {
                const note = samsungDarkNoticeOverlay(this.settings.locale, () => note.remove());
                this.overlays.append(note);
              }
            : undefined,
          replayTutorial: () => {
            this.overlays.querySelector('.overlay.settings')?.remove();
            this.showTutorial(() => undefined);
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
    this.stage.dataset.scheme = effectiveColorScheme(next);
    this.screens[this.tabs.current].update();
    this.renderTop();
  }

  private rebuildForLocale(locale: Locale): void {
    this.game.locale = locale;
    const current = this.tabs.current;
    this.screens[current].leave?.();
    this.buildScreens();
    this.buildTabbar();
    setText(inner(this.pendChip).firstElementChild!, this.t('work.pendingShort'));
    setText(this.newsChip.querySelector('.face')!, this.t('newsBadge'));
    this.showTab(current);
  }

  // ───────── 저장·안내 ─────────

  /** 엔진이 저장을 원하면(또는 force) 세이브를 기기에 쓴다 */
  persist(force = false): void {
    if (this.saveLocked || !this.game) return;
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
    const el = pnl(`toast ${kind}`, text);
    this.toasts.append(el);
    while (this.toasts.children.length > 3) this.toasts.firstElementChild?.remove();
    // 긴 안내는 읽을 시간을 더 준다 (2.4초 ~ 4초)
    window.setTimeout(() => el.remove(), Math.min(4000, Math.max(2400, text.length * 110)));
  }

  // ───────── 디버그용 (debug.ts·점검 스크립트에서만) ─────────

  /** 틱 n개를 바로 진행 (정산이 나오면 멈춤) */
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

  get livingScreen(): LivingRoomScreen {
    return this.living;
  }

  /** (디버그) 표시를 강제로 갱신 */
  debugRefresh(): void {
    this.screens[this.tabs.current].update();
    this.refreshScene(0);
    this.renderTop();
  }
}
