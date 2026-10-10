// TV홈쇼핑 (1차 비활성): 시대별 TV 위에 "방송 준비 중" 노이즈 화면. 터치해도 아무 일 없음.
// 나중에 켤 때는 homeActivities.ts의 TAB_ENABLED.tv_shopping 한 곳만 바꾸고, 이 화면에 방송 내용을 넣는다.

import { art } from '../assets.ts';
import type { Screen, UiContext } from '../context.ts';
import { h } from '../dom.ts';
import { loopSheet, sprite } from '../sprite.ts';
import { Scene } from './scene.ts';

export class TvShoppingScreen implements Screen {
  private readonly scene = new Scene('tv');
  private readonly ctx: UiContext;

  constructor(ctx: UiContext) {
    this.ctx = ctx;
  }

  get el(): HTMLElement {
    return this.scene.el;
  }

  enter(): void {
    const { ctx } = this;
    const s = ctx.scale();
    const stage = this.scene.layout('bg.tv_room', s, ctx.assetBase);
    const key = `tv.${ctx.theme().tvVariant}`;
    const tv = art(key);
    const x = Math.floor((180 - tv.width) / 2);
    // TV 바닥이 받침대 윗면(무대 y 212 = 배경 y 252)에 닿게
    const y = 212 - tv.height;
    const [sx, sy, sw, sh] = tv.screen ?? [10, 10, tv.width - 20, tv.height - 20];
    const noise = sprite('tv.noise', s, ctx.assetBase, { x: x + sx!, y: y + sy!, fitWidth: sw, fitHeight: sh, class: 'tv-noise' });
    loopSheet(noise, 4, 12);
    const label = h('div', { class: 'tv-label' }, ctx.t('tabs.comingSoon'));
    label.style.left = `${(x + sx!) * s}px`;
    label.style.top = `${(y + sy!) * s}px`;
    label.style.width = `${sw! * s}px`;
    label.style.height = `${sh! * s}px`;
    stage.append(sprite(key, s, ctx.assetBase, { x, y, class: 'tv-set' }), noise, label);
  }

  update(): void {
    // 비활성: 바뀌는 것 없음
  }
}
