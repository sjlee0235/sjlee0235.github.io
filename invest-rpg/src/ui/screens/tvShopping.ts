// TV홈쇼핑 (1차 비활성): 브라운관 TV + 지지직 노이즈(4프레임, 0.12초마다) + "방송 준비 중".
// 눌러도 아무 일도 없다. TV 모양은 지금 모든 시대가 브라운관 (DESIGN_HANDOFF 11.4)

import type { Screen, UiContext } from '../context.ts';
import { h } from '../dom.ts';

const NOISE_FRAMES = 4;
const NOISE_MS = 120;

export class TvShoppingScreen implements Screen {
  readonly el: HTMLElement;
  private readonly ctx: UiContext;
  private timer: number | null = null;
  private f = 0;

  constructor(ctx: UiContext) {
    this.ctx = ctx;
    this.el = h('div', { class: 'view tv' }, h('div', { class: 'tv-text' }, ctx.t('tabs.comingSoon')));
  }

  enter(): void {
    if (this.timer !== null) return;
    this.timer = window.setInterval(() => {
      if (document.hidden) return;
      this.f = (this.f + 1) % NOISE_FRAMES;
      this.ctx.scene.setFrame(this.f);
    }, NOISE_MS);
  }

  leave(): void {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
  }

  frame(): number {
    return this.f;
  }

  update(): void {
    // 바뀌는 것이 없다
  }
}
