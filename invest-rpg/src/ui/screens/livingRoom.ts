// 거실 (1인칭): LP 플레이어와 강아지 한 마리.
// - LP 터치: cycleGenre() + 회전 + 장르 이름 토스트. 첫 터치 이후부터 소리
// - 강아지 터치: 매번 쓰다듬기 효과, 3번째마다 반응 (dogPetting.ts). 연출 난수는 시장 난수와 분리

import type { MusicGenre } from '../../audio/music.ts';
import { createPresentationRng, DOG_STAGES, newDogState, petDog, type DogReaction, type DogStage, type DogState } from '../../engine/dogPetting.ts';
import type { Rng } from '../../engine/rng.ts';
import { frameIndex } from '../assets.ts';
import type { Screen, UiContext } from '../context.ts';
import { flash, h } from '../dom.ts';
import { loopSheet, setFrame, sprite, stopLoop } from '../sprite.ts';
import { Scene } from './scene.ts';

/** 기준 해상도 좌표 (art_spec 참고: 위 20·아래 32는 UI가 덮음) */
const LP_POS = { x: 14, y: 150 };
const DOG_POS = { x: 106, y: 222 };

export class LivingRoomScreen implements Screen {
  private readonly scene = new Scene('living');
  private readonly ctx: UiContext;
  private dog: DogState = newDogState();
  private readonly rng: Rng;
  private dogEl: HTMLElement | null = null;
  private lpEl: HTMLElement | null = null;
  private hintEl: HTMLElement | null = null;
  private idleTimer: number | null = null;
  private busyUntil = 0;
  private spinTimer: number | null = null;

  constructor(ctx: UiContext, presentationSeed: number) {
    this.ctx = ctx;
    this.rng = createPresentationRng(presentationSeed, 'dog');
  }

  get el(): HTMLElement {
    return this.scene.el;
  }

  enter(): void {
    const { ctx } = this;
    const s = ctx.scale();
    const theme = ctx.theme();
    const stage = this.scene.layout(`bg.${theme.livingRoomVariant}`, s, ctx.assetBase);

    this.lpEl = sprite('lp.player', s, ctx.assetBase, { ...LP_POS, class: 'lp hit' });
    this.lpEl.setAttribute('role', 'button');
    this.lpEl.setAttribute('aria-label', 'LP');
    this.lpEl.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.touchLp();
    });

    const stageKey = `dog.${theme.dogStage}`;
    this.dogEl = sprite(stageKey, s, ctx.assetBase, { ...DOG_POS, class: 'dog hit' });
    this.dogEl.setAttribute('role', 'button');
    this.dogEl.setAttribute('aria-label', 'dog');
    this.dogEl.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      this.touchDog(theme.dogStage as DogStage);
    });

    const np = ctx.music.getNowPlaying();
    this.hintEl = h('div', { class: 'scene-hint' }, np.unlocked ? '' : ctx.t('music.tapToStart'));
    stage.append(this.lpEl, this.dogEl, this.hintEl);
    stage.addEventListener('pointerdown', () => this.unlockMusic());
    this.startIdle();
  }

  leave(): void {
    if (this.idleTimer !== null) window.clearInterval(this.idleTimer);
    this.idleTimer = null;
  }

  update(): void {
    // 거실은 시간에 따라 바뀌는 것이 없다 (상단 코인·NEWS!는 App이 그린다)
  }

  private unlockMusic(): void {
    if (this.ctx.music.getNowPlaying().unlocked) return;
    this.ctx.music.unlock();
    if (this.hintEl) this.hintEl.textContent = '';
  }

  private touchLp(): void {
    this.unlockMusic();
    const genre: MusicGenre = this.ctx.music.cycleGenre();
    this.ctx.track('lp_touch', { genre });
    this.ctx.toast(this.ctx.t(`music.genre.${genre}`));
    this.ctx.persist();
    // 회전: 잠깐 시트를 돌린다
    if (!this.lpEl) return;
    loopSheet(this.lpEl, 4, 8);
    if (this.spinTimer !== null) window.clearTimeout(this.spinTimer);
    this.spinTimer = window.setTimeout(() => {
      if (this.lpEl) {
        stopLoop(this.lpEl);
        setFrame(this.lpEl, 0);
      }
    }, 2000);
  }

  private touchDog(stage: DogStage): void {
    this.unlockMusic();
    const r = petDog(this.dog, stage, this.rng);
    this.dog = r.state;
    this.ctx.track('dog_touch', { reaction: r.reaction });
    const dog = this.dogEl;
    if (!dog) return;
    const key = `dog.${stage}`;
    const speed = r.speedMultiplier;
    // 쓰다듬기 효과
    setFrame(dog, frameIndex(key, 'pet'));
    this.spawn('fx.pet', DOG_POS.x + 28, DOG_POS.y - 6, 'fx-pet', 500 / speed);
    this.busyUntil = performance.now() + 350 / speed;
    if (r.reaction) this.react(r.reaction, key, speed);
    window.setTimeout(() => {
      if (performance.now() >= this.busyUntil) setFrame(dog, 0);
    }, 360 / speed);
  }

  private react(reaction: DogReaction, key: string, speed: number): void {
    const dog = this.dogEl!;
    dog.dataset.reaction = reaction;
    dog.style.setProperty('--dog-speed', String(speed));
    switch (reaction) {
      case 'tail_wag': {
        const a = frameIndex(key, 'tail0');
        const b = frameIndex(key, 'tail1');
        const step = 120 / speed;
        this.busyUntil = performance.now() + step * 6;
        for (let i = 0; i < 6; i++) window.setTimeout(() => setFrame(dog, i % 2 ? b : a), step * i);
        window.setTimeout(() => setFrame(dog, 0), step * 6);
        break;
      }
      case 'ear_perk': {
        this.busyUntil = performance.now() + 700 / speed;
        window.setTimeout(() => setFrame(dog, frameIndex(key, 'ear')), 0);
        window.setTimeout(() => setFrame(dog, 0), 700 / speed);
        break;
      }
      case 'heart_pop':
        this.spawn('fx.heart', DOG_POS.x + 36, DOG_POS.y - 4, 'fx-heart', 1000 / speed);
        break;
      case 'afterimage_sway': {
        // 잔상: 반투명 복사본 두 개가 조금 늦게 따라온다
        const ghosts = [1, 2].map((n) => {
          const g = dog.cloneNode() as HTMLElement;
          g.classList.add('ghost');
          g.style.animationDelay = `${(n * 70) / speed}ms`;
          g.style.opacity = String(0.4 / n);
          dog.parentElement?.insertBefore(g, dog);
          return g;
        });
        flash(dog, 'sway', 900 / speed);
        for (const g of ghosts) {
          g.classList.add('sway');
          window.setTimeout(() => g.remove(), 1000 / speed);
        }
        break;
      }
    }
  }

  /** 잠깐 떴다 사라지는 효과 그림 */
  private spawn(key: string, x: number, y: number, cls: string, ms: number): void {
    const el = sprite(key, this.ctx.scale(), this.ctx.assetBase, { x, y, class: `fx ${cls}` });
    el.style.animationDuration = `${ms}ms`;
    this.scene.stage.append(el);
    window.setTimeout(() => el.remove(), ms);
  }

  /** 가만히 숨 쉬기 (idle0 ↔ idle1) */
  private startIdle(): void {
    if (this.idleTimer !== null) window.clearInterval(this.idleTimer);
    const stage = this.ctx.theme().dogStage as DogStage;
    const key = `dog.${stage}`;
    const ms = 600 / DOG_STAGES[stage].speedMultiplier;
    let on = false;
    this.idleTimer = window.setInterval(() => {
      if (!this.dogEl || performance.now() < this.busyUntil) return;
      on = !on;
      setFrame(this.dogEl, frameIndex(key, on ? 'idle1' : 'idle0'));
    }, ms);
  }
}
