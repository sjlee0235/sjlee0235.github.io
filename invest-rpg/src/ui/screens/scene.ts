// 1인칭 그림 화면의 바탕: 시대별 배경(180×400, 가운데 180×320이 기본 영역) + 그 위에 놓는 무대(stage).
// 배경과 무대는 화면 가운데를 기준으로 정수 배율로 맞춘다 (docs/art_spec.md).

import { art } from '../assets.ts';
import { clear, h } from '../dom.ts';
import { BASE_HEIGHT, BASE_WIDTH } from '../scale.ts';

export class Scene {
  readonly el: HTMLElement;
  readonly stage: HTMLElement;

  constructor(cls: string) {
    this.stage = h('div', { class: 'stage' });
    this.el = h('div', { class: `view scene ${cls}` }, this.stage);
  }

  /** 배경 그림과 무대 크기를 다시 맞추고 무대를 비운다 */
  layout(bgKey: string, scale: number, base: string): HTMLElement {
    const a = art(bgKey);
    this.el.style.backgroundColor = a.color;
    this.el.style.backgroundImage = `url("${base}${a.file}")`;
    this.el.style.backgroundSize = `${a.width * scale}px ${a.height * scale}px`;
    this.stage.style.width = `${BASE_WIDTH * scale}px`;
    this.stage.style.height = `${BASE_HEIGHT * scale}px`;
    clear(this.stage);
    return this.stage;
  }
}
