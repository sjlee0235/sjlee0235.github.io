// 픽셀 그림 요소: 스프라이트 시트에서 프레임 하나를 정수 배율로 보여준다.
// - 정적 프레임: setFrame()  /  계속 도는 애니메이션: CSS steps() (loopSheet)

import { art } from './assets.ts';
import { h } from './dom.ts';

export interface SpriteOptions {
  /** 기준 해상도 좌표 (scene 안 위치) */
  x?: number;
  y?: number;
  frame?: number;
  /** 그림 크기를 이 크기(기준 픽셀)로 늘려서 (TV 노이즈처럼) */
  fitWidth?: number;
  fitHeight?: number;
  class?: string;
}

export function sprite(key: string, scale: number, base: string, o: SpriteOptions = {}): HTMLDivElement {
  const el = h('div', { class: `sprite ${o.class ?? ''}`.trim(), 'data-art': key });
  styleSprite(el, key, scale, base, o);
  return el;
}

export function styleSprite(el: HTMLElement, key: string, scale: number, base: string, o: SpriteOptions = {}): void {
  const a = art(key);
  const w = (o.fitWidth ?? a.width) * scale;
  const hgt = (o.fitHeight ?? a.height) * scale;
  el.style.width = `${w}px`;
  el.style.height = `${hgt}px`;
  el.style.backgroundImage = `url("${base}${a.file}")`;
  el.style.backgroundSize = `${w * a.frames}px ${hgt}px`;
  el.style.setProperty('--sheet-w', `${w * a.frames}px`);
  el.style.setProperty('--frames', String(a.frames));
  if (o.x !== undefined) el.style.left = `${o.x * scale}px`;
  if (o.y !== undefined) el.style.top = `${o.y * scale}px`;
  el.dataset.frameW = String(w);
  setFrame(el, o.frame ?? 0);
}

export function setFrame(el: HTMLElement, frame: number): void {
  const w = Number(el.dataset.frameW ?? 0);
  el.style.backgroundPosition = `${-frame * w}px 0`;
  el.dataset.frame = String(frame);
}

/** 시트 전체를 계속 돌린다 (CSS steps). fps = 초당 프레임 */
export function loopSheet(el: HTMLElement, frames: number, fps: number): void {
  el.style.animation = `sheet ${frames / fps}s steps(${frames}) infinite`;
}

export function stopLoop(el: HTMLElement): void {
  el.style.animation = '';
}
