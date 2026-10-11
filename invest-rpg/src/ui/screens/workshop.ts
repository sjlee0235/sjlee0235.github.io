// 작업실: 인형을 누르면 눈 하나 → 눈 둘 → 완성(+3코인은 지급 예정으로). 인형 100개를 채우면 바로 지급되고
// 지급 예정 +0, 완성 0개로 돌아간다 (엔진 'batch' 지급).
// - 배경 그림은 눈 0·1·2개 세 칸 시트 (App 장면 층의 칸 = 지금 인형의 눈 수)
// - 진행 토스트 "눈 N개 | 완성 M개" (위 548, Lv0만 606), 안내 문구는 왼쪽 위 (사용자 요청으로 시안의 위 716에서 옮김)

import type { Screen, UiContext } from '../context.ts';
import { h } from '../dom.ts';
import { pnl } from '../kit.ts';
import { SCALE } from '../art.ts';
import { workshopView } from '../viewModels.ts';

/** 작업 중인 인형의 자리 (도트, 그림 원점): Lv0 박스 위 / Lv1~2 접이식 상 / Lv3부터 책상 */
export function dollOrigin(level: number): { x: number; y: number } {
  if (level === 0) return { x: 52, y: 155 };
  if (level <= 2) return { x: 48, y: 135 };
  return { x: 52, y: 133 };
}

/** 인형 터치 범위 (도트): 인형 가운데 (원점 + (13, 18)) 기준 84×92, 장면 밖으로 나가지 않게 */
export function dollHitRect(level: number): { x: number; y: number; w: number; h: number } {
  const o = dollOrigin(level);
  const w = 84;
  const hgt = 92;
  const x = Math.max(0, Math.min(130 - w, o.x + 13 - w / 2));
  const y = o.y + 18 - hgt / 2;
  return { x, y, w, h: hgt };
}

export class WorkshopScreen implements Screen {
  readonly el: HTMLElement;
  private readonly ctx: UiContext;
  private readonly progress: HTMLElement;
  private readonly progressIn: HTMLElement;
  private readonly hit: HTMLButtonElement;
  private lastPayoutSeq = 0;

  constructor(ctx: UiContext) {
    this.ctx = ctx;
    this.progressIn = h('span', {});
    this.progress = pnl('toast-pnl', this.progressIn);
    this.progress.style.height = '36px';
    // 안내 문구는 위쪽 왼쪽 (NEWS! 아래). 인테리어 0~7단계 모두 전구·공구판·시계와 겹치지 않는 빈 벽
    const guide = pnl('work-guide', ctx.t('work.payoutNote'));
    this.hit = h('button', { class: 'hit doll-hit', 'aria-label': ctx.t('work.dollLabel') });
    this.hit.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.touch();
    });
    this.el = h('div', { class: 'view workshop' }, this.hit, this.progress, guide);
  }

  enter(): void {
    this.lastPayoutSeq = this.ctx.game.lastWorkPayout?.seq ?? 0;
    this.update();
  }

  frame(): number {
    return this.ctx.game.getWorkStatus().eyes;
  }

  update(): void {
    const { ctx } = this;
    const level = ctx.game.interiorLevel;
    const v = workshopView(ctx.game.getWorkStatus(), ctx.locale());
    this.progressIn.replaceChildren(
      v.eyesPrefix, h('b', {}, v.eyes), v.eyesSuffix, h('span', { class: 'sep' }, '|'), v.donePrefix, h('b', {}, v.done), v.doneSuffix,
    );
    this.progress.style.top = `${level === 0 ? 606 : 548}px`;
    // 터치 범위: 인형 그림(26×37) 가운데를 중심으로 84×92도트 (예전 42×46의 가로·세로 2배, 사용자 요청)
    const r = dollHitRect(level);
    Object.assign(this.hit.style, {
      left: `${r.x * SCALE}px`, top: `${r.y * SCALE}px`, width: `${r.w * SCALE}px`, height: `${r.h * SCALE}px`,
    });
  }

  private touch(): void {
    const { ctx } = this;
    const r = ctx.game.workTouch(ctx.now());
    if (!r.accepted) return;
    ctx.scene.setFrame(r.eyes);
    if (r.completed) {
      const o = dollOrigin(ctx.game.interiorLevel);
      ctx.flyTo(`+${ctx.game.getWorkStatus().coinsPerDoll}`, (o.x + 13) * SCALE, (o.y + 4) * SCALE, 'pending');
      const p = ctx.game.lastWorkPayout;
      if (p && p.seq !== this.lastPayoutSeq) {
        this.lastPayoutSeq = p.seq;
        ctx.toast(ctx.t('work.paid', { coins: p.coins }));
        ctx.onCoinsChanged();
        ctx.persist();
      }
    }
    this.update();
    ctx.refreshTop();
  }
}
