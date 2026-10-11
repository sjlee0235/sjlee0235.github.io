// 장면 그림 층: 130×281 도트 그림을 3배로 (390×843) 깔고, 그림이 바뀌면 겹쳐서 서서히 바꾼다.
// - 밤/낮이 바뀌면 2초, 인테리어 단계가 바뀌면 0.4초 크로스페이드 (DESIGN_HANDOFF 4장, 14장)
// - 같은 파일의 다른 칸(작업실 눈 0·1·2, TV 노이즈 4프레임)은 바로 바꾼다
// - 새 그림은 다 불러온 뒤에 보여 준다 (빈 화면으로 깜빡이지 않게)

import { SCALE, SCENE_H } from './art.ts';
import { h } from './dom.ts';

const FRAME_PX = SCENE_H * SCALE; // 843

export class SceneLayer {
  readonly el: HTMLElement;
  private readonly flashEl: HTMLElement;
  private current: { file: string; div: HTMLElement; frames: number } | null = null;
  private pending: string | null = null;
  private frame = 0;
  private readonly base: string;

  constructor(base: string) {
    this.base = base;
    this.flashEl = h('div', { class: 'scene-flash' });
    this.el = h('div', { class: 'scene' }, this.flashEl);
  }

  /** 지금 보이는 파일 */
  get file(): string | null {
    return this.pending ?? this.current?.file ?? null;
  }

  /** 그림을 바꾼다. fadeMs = 0이면 바로 */
  show(file: string, frames: number, frame: number, fadeMs: number): void {
    this.frame = frame;
    if (this.current && this.current.file === file && this.pending === null) {
      this.place(this.current.div, frames);
      return;
    }
    if (this.pending === file) return;
    this.pending = file;
    const url = `${this.base}${file}`;
    const div = h('div', { class: 'scene-img', style: `background-image:url("${url}")` });
    this.place(div, frames);
    const reveal = () => {
      if (this.pending !== file) return;
      this.pending = null;
      const old = this.current;
      this.current = { file, div, frames };
      this.place(div, frames);
      if (!old || fadeMs <= 0) {
        this.el.insertBefore(div, this.flashEl);
        old?.div.remove();
        return;
      }
      div.style.opacity = '0';
      div.style.setProperty('--fade', `${fadeMs}ms`);
      this.el.insertBefore(div, this.flashEl);
      void div.offsetWidth;
      div.style.opacity = '1';
      window.setTimeout(() => old.div.remove(), fadeMs + 50);
    };
    const img = new Image();
    img.src = url;
    // 불러오기에 실패해도 화면은 바꾼다 (빈 칸이 오래 남지 않게)
    img.decode().then(reveal, reveal);
  }

  /** 같은 그림의 다른 칸 (작업실 눈 수, TV 노이즈) */
  setFrame(frame: number): void {
    this.frame = frame;
    if (this.current) this.place(this.current.div, this.current.frames);
  }

  /** 주식창 배경: 어둡게 (밤 밝기 .4 / 낮 .5, 채도 .85) */
  setDim(on: boolean): void {
    this.el.classList.toggle('dim', on);
  }

  /** 인테리어가 바뀔 때 흰 번쩍임 (알파 .35 → 0, 0.3초) */
  flash(): void {
    this.flashEl.classList.remove('on');
    void this.flashEl.offsetWidth;
    this.flashEl.classList.add('on');
  }

  private place(div: HTMLElement, frames: number): void {
    const f = Math.min(this.frame, frames - 1);
    div.style.backgroundSize = `390px ${FRAME_PX * frames}px`;
    div.style.backgroundPosition = `0 ${-FRAME_PX * f}px`;
  }
}
