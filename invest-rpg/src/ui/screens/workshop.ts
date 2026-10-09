// 작업실 (1인칭): 책상 위 인형에 눈 붙이기.
// - 터치마다 눈 하나 → 눈 둘 → 완성 (옆으로 빠지고 눈 없는 인형이 들어옴). 화면 어디를 눌러도 인식
// - 완성하면 "+3"이 상단의 정산 예정 작업 수입 카운터로 날아가고 숫자가 는다
// - 2터치까지는 보상 없음, 초당 터치 상한 넘으면 무시 (엔진 규칙)

import type { Screen, UiContext } from '../context.ts';
import { flash, h, setText } from '../dom.ts';
import { setFrame, sprite } from '../sprite.ts';
import { Scene } from './scene.ts';

const DOLL_POS = { x: 70, y: 140 };
/** 인형 눈 위치 (인형 그림 안, 기준 픽셀) */
const EYE_POS = [
  { x: 13, y: 11 },
  { x: 23, y: 11 },
];

export class WorkshopScreen implements Screen {
  private readonly scene = new Scene('workshop');
  private readonly ctx: UiContext;
  private dollEl: HTMLElement | null = null;
  private infoEl: HTMLElement | null = null;

  constructor(ctx: UiContext) {
    this.ctx = ctx;
  }

  get el(): HTMLElement {
    return this.scene.el;
  }

  enter(): void {
    const { ctx } = this;
    const s = ctx.scale();
    const stage = this.scene.layout(`bg.${ctx.theme().workshopVariant}`, s, ctx.assetBase);
    const st = ctx.game.getWorkStatus();
    this.dollEl = sprite('doll.body', s, ctx.assetBase, { ...DOLL_POS, frame: st.eyes, class: 'doll' });
    this.infoEl = h('div', { class: 'scene-hint work-info' });
    stage.append(
      this.dollEl,
      this.infoEl,
      h('div', { class: 'scene-note' }, ctx.t('work.payoutNote')),
    );
    // 화면(탭 바·상단 바 제외) 어디를 눌러도 인식
    this.scene.el.onpointerdown = (e) => {
      e.preventDefault();
      this.touch();
    };
    this.update();
  }

  update(): void {
    if (!this.infoEl) return;
    const st = this.ctx.game.getWorkStatus();
    // 진행 중인 인형 상태는 탭을 옮겨도·저장해도 유지 (엔진이 기억) → 그림을 엔진 값에 맞춘다
    if (this.dollEl && !this.dollEl.classList.contains('doll-in')) setFrame(this.dollEl, st.eyes);
    setText(this.infoEl, `${this.ctx.t('work.eyes', { count: st.eyes })} · ${this.ctx.t('work.done', { count: st.dollsCompleted })}`);
  }

  private touch(): void {
    const r = this.ctx.game.workTouch(this.ctx.now());
    if (!r.accepted || !this.dollEl) return;
    const s = this.ctx.scale();
    if (r.completed) {
      this.complete();
    } else {
      setFrame(this.dollEl, r.eyes);
      const eye = EYE_POS[r.eyes - 1];
      if (eye) {
        const fx = sprite('doll.eye', s, this.ctx.assetBase, { x: DOLL_POS.x + eye.x - 1, y: DOLL_POS.y + eye.y - 1, class: 'fx fx-eye' });
        this.scene.stage.append(fx);
        window.setTimeout(() => fx.remove(), 300);
      }
    }
    this.update();
    this.ctx.persist();
  }

  private complete(): void {
    const doll = this.dollEl!;
    const s = this.ctx.scale();
    const coins = this.ctx.game.getWorkStatus().coinsPerDoll;
    // 완성 그림 → 오른쪽으로 빠짐 → 새 인형이 왼쪽에서 들어옴
    const done = doll.cloneNode() as HTMLElement;
    setFrame(done, 3);
    done.classList.add('doll-out');
    this.scene.stage.append(done);
    window.setTimeout(() => done.remove(), 450);
    setFrame(doll, 0);
    flash(doll, 'doll-in', 450);

    // "+3"이 정산 예정 카운터로 날아간다
    const plus = h('div', { class: 'plus-fly' }, this.ctx.t('work.plus', { coins }));
    const stageRect = this.scene.stage.getBoundingClientRect();
    const target = document.querySelector('.top-pending');
    const startX = stageRect.left + (DOLL_POS.x + 20) * s;
    const startY = stageRect.top + DOLL_POS.y * s;
    plus.style.left = `${startX}px`;
    plus.style.top = `${startY}px`;
    document.body.append(plus);
    const t = target?.getBoundingClientRect();
    requestAnimationFrame(() => {
      if (t) plus.style.transform = `translate(${t.left + t.width / 2 - startX}px, ${t.top - startY}px) scale(0.7)`;
      plus.style.opacity = '0.2';
    });
    window.setTimeout(() => {
      plus.remove();
      this.ctx.refreshTop();
      const counter = document.querySelector<HTMLElement>('.top-pending');
      if (counter) flash(counter, 'bump', 300);
    }, 520);
  }
}
