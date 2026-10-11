// 거실: 인테리어 업그레이드 버튼 + 단계 점, LP 플레이어(누르면 음악 장르가 바뀜), 돌아다니는 강아지.
// - 배경 그림은 App의 장면 층 (시대·밤낮·인테리어 단계)
// - LP 안내 문구는 없다 (기능은 그대로). 화면의 첫 터치가 소리 잠금 해제를 겸한다 (App)
// - 강아지: dogBrain.ts 상태 머신. 연출 난수는 시장 난수와 분리

import type { MusicGenre } from '../../audio/music.ts';
import { createPresentationRng, type Rng } from '../../engine/rng.ts';
import { dogFile, dogStageFor, DOG_POSES, heartsFile, SCALE, type DogArtStage } from '../art.ts';
import type { Screen, UiContext } from '../context.ts';
import { flash, h, setText } from '../dom.ts';
import { dogSprite, newDog, stepDog, touchDog, type DogEnv, type DogState } from '../dogBrain.ts';
import { face, ico, pbtn } from '../kit.ts';
import { upgradeView } from '../viewModels.ts';

/** LP 플레이어 자리 (도트): Lv0~2 상자 위 (9,127), Lv3부터 서랍장 위 (13,129). 39×25 */
const lpRect = (level: number) => ({ x: level < 3 ? 9 : 13, y: level < 3 ? 127 : 129, w: 39, h: 25 });

export class LivingRoomScreen implements Screen {
  readonly el: HTMLElement;
  private readonly ctx: UiContext;
  private readonly rng: Rng;
  private readonly upBtn: HTMLButtonElement;
  private readonly upLabel: HTMLElement;
  private readonly pips: HTMLElement[];
  private readonly lpHit: HTMLButtonElement;
  private readonly dogEl: HTMLElement;
  private readonly heartsEl: HTMLElement;
  private readonly dogHit: HTMLButtonElement;
  private dog: DogState | null = null;
  private dogStage: DogArtStage = 'pup';
  private raf: number | null = null;
  private lastFrameMs = 0;
  private shownPose = '';
  private shownHearts = -1;

  constructor(ctx: UiContext, presentationSeed: number) {
    this.ctx = ctx;
    this.rng = createPresentationRng(presentationSeed, 'dog');
    this.upLabel = h('span', {});
    this.upBtn = pbtn('sel', [this.upLabel, ico('coin_s', 16)]);
    this.upBtn.addEventListener('click', () => this.upgrade());
    this.pips = Array.from({ length: ctx.game.interiorMaxLevel }, () => h('span', { class: 'pip' }));
    this.lpHit = h('button', { class: 'hit lp-hit', 'aria-label': 'LP' });
    this.lpHit.addEventListener('click', () => this.touchLp());
    this.dogEl = h('div', { class: 'dog' });
    this.heartsEl = h('div', { class: 'dog-hearts', hidden: true });
    this.dogHit = h('button', { class: 'hit dog-hit', 'aria-label': ctx.t('living.dog') });
    this.dogHit.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.touchDog();
    });
    this.el = h(
      'div',
      { class: 'view living' },
      h('div', { class: 'upgrade' }, this.upBtn, h('div', { class: 'pips' }, ...this.pips)),
      this.lpHit,
      this.dogEl,
      this.heartsEl,
      this.dogHit,
    );
  }

  enter(): void {
    const stage = dogStageFor(this.ctx.game.eraId);
    if (!this.dog || stage !== this.dogStage) {
      this.dogStage = stage;
      this.dog = newDog(this.env());
      this.preloadDog();
    }
    this.shownPose = '';
    this.shownHearts = -1;
    this.update();
    this.renderDog();
    this.lastFrameMs = performance.now();
    if (this.raf === null) this.raf = requestAnimationFrame((t) => this.frameLoop(t));
  }

  leave(): void {
    if (this.raf !== null) cancelAnimationFrame(this.raf);
    this.raf = null;
  }

  update(): void {
    const { ctx } = this;
    const g = ctx.game;
    const v = upgradeView(g.interiorLevel, g.interiorMaxLevel, g.interiorNextCost, g.cash, ctx.locale());
    setText(this.upLabel, v.label);
    const coin = this.upBtn.querySelector<HTMLElement>('.ico');
    if (coin) coin.hidden = v.state === 'done';
    this.upBtn.className = `pbtn ${v.state === 'done' ? 'off' : 'sel'} ${v.state === 'poor' ? 'poor' : ''}`;
    this.upBtn.setAttribute('aria-label', v.aria);
    this.upBtn.disabled = v.state === 'done';
    this.pips.forEach((p, i) => p.classList.toggle('on', i < v.filled));
    const lp = lpRect(g.interiorLevel);
    Object.assign(this.lpHit.style, { left: `${lp.x * SCALE}px`, top: `${lp.y * SCALE}px`, width: `${lp.w * SCALE}px`, height: `${lp.h * SCALE}px` });
  }

  private env(): DogEnv {
    return { stage: this.dogStage, hasSofa: this.ctx.game.interiorLevel >= 1, rng: this.rng };
  }

  // ───────── 인테리어 ─────────

  private upgrade(): void {
    const { ctx } = this;
    const g = ctx.game;
    if (g.interiorNextCost === null) return;
    const r = g.upgradeInterior();
    if (r.ok) {
      ctx.onInteriorChanged();
      this.update();
      flash(face(this.upBtn), 'bump', 350);
      return;
    }
    if (r.error === 'insufficient-cash') {
      ctx.track('interior_insufficient', { level: g.interiorLevel, cash: g.cash });
      ctx.toast(ctx.t('living.notEnough'), 'error');
    }
  }

  // ───────── LP ─────────

  private touchLp(): void {
    const { ctx } = this;
    if (!ctx.music.getNowPlaying().unlocked) ctx.music.unlock();
    const genre: MusicGenre = ctx.music.cycleGenre();
    ctx.track('lp_touch', { genre });
    ctx.toast(ctx.t(`music.genre.${genre}`));
    ctx.persist();
    flash(this.lpHit, 'spin', 1500);
  }

  // ───────── 강아지 ─────────

  private touchDog(): void {
    if (!this.dog) return;
    const r = touchDog(this.dog, this.ctx.now(), this.env());
    this.dog = r.state;
    if (r.reaction) this.ctx.track('dog_touch', { count: r.count, reaction: r.reaction });
    if (r.reaction === 'belly') this.ctx.track('dog_belly', {});
    this.renderDog();
  }

  private frameLoop(nowMs: number): void {
    this.raf = requestAnimationFrame((t) => this.frameLoop(t));
    // 백그라운드에서 돌아오면 큰 dt가 생기므로 한 번에 0.25초까지만
    const dt = Math.min(0.25, Math.max(0, (nowMs - this.lastFrameMs) / 1000));
    this.lastFrameMs = nowMs;
    if (!this.dog || document.hidden) return;
    this.dog = stepDog(this.dog, dt, this.env());
    this.renderDog();
  }

  private renderDog(): void {
    if (!this.dog) return;
    const base = this.ctx.assetBase;
    const sp = dogSprite(this.dog, this.dogStage);
    if (sp.pose !== this.shownPose) {
      this.shownPose = sp.pose;
      this.dogEl.style.backgroundImage = `url("${base}${dogFile(this.dogStage, sp.pose)}")`;
    }
    const left = sp.x * SCALE;
    const top = sp.top * SCALE;
    this.dogEl.style.left = `${left}px`;
    this.dogEl.style.top = `${top}px`;
    this.dogEl.classList.toggle('flip', sp.flip);
    // 터치 범위: 그림 칸(42×40)보다 조금 작게, 몸통 쪽으로
    Object.assign(this.dogHit.style, { left: `${left + 6}px`, top: `${top + 24}px`, width: '114px', height: '96px' });
    if (sp.hearts) {
      this.heartsEl.hidden = false;
      if (sp.hearts.frame !== this.shownHearts) {
        this.shownHearts = sp.hearts.frame;
        this.heartsEl.style.backgroundImage = `url("${base}${heartsFile(sp.hearts.frame)}")`;
      }
      this.heartsEl.style.left = `${sp.hearts.x * SCALE}px`;
      this.heartsEl.style.top = `${top}px`;
      this.heartsEl.classList.toggle('flip', sp.flip);
    } else if (!this.heartsEl.hidden) {
      this.heartsEl.hidden = true;
      this.shownHearts = -1;
    }
  }

  private preloadDog(): void {
    const base = this.ctx.assetBase;
    for (const p of DOG_POSES) new Image().src = `${base}${dogFile(this.dogStage, p)}`;
    for (let f = 0; f < 3; f++) new Image().src = `${base}${heartsFile(f)}`;
  }

  /** (디버그·점검) 강아지 상태 */
  get dogState(): DogState | null {
    return this.dog;
  }
}
