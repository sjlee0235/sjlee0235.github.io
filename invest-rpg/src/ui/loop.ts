// 게임 루프: 실제 타이머로 틱을 돌린다.
//
// - 틱 간격은 tickIntervalMs(배속): 1배 5,000ms, 2배 2,500ms. 배속을 바꾸면 바로 새 간격으로 다시 잰다
// - 앱이 백그라운드로 가면 pause('background') + 타이머 정지. 돌아오면 resume('background') 후
//   "지금부터" 다시 잰다 (밀린 틱을 몰아서 따라잡지 않는다)
// - 시대가 끝나 advanceTick이 진행하지 않으면 타이머를 멈춘다 (정산 창에서 '확인' → start())
// - 시계는 바꿔 끼울 수 있다 (테스트는 가짜 시계)

import { tickIntervalMs } from '../engine/config.ts';
import type { GameSpeed, PauseReason } from '../engine/game.ts';
import type { PublicAdvanceResult } from '../engine/publicView.ts';

export interface Clock {
  setTimeout(fn: () => void, ms: number): number;
  clearTimeout(id: number): void;
}

/** 루프가 쓰는 게임 기능 (PublicGame이 모두 가짐) */
export interface LoopGame {
  advanceTick(): PublicAdvanceResult;
  getSpeed(): GameSpeed;
  pause(reason: PauseReason): void;
  resume(reason: PauseReason): void;
  readonly phase: string;
}

export const browserClock: Clock = {
  setTimeout: (fn, ms) => window.setTimeout(fn, ms),
  clearTimeout: (id) => window.clearTimeout(id),
};

export class GameLoop {
  private timer: number | null = null;
  private running = false;
  private hidden = false;
  /** (디버그) 시간 빨리감기 배율. 1 = 보통 */
  private timeScale = 1;
  private readonly game: LoopGame;
  private readonly clock: Clock;
  private readonly onTick: (r: PublicAdvanceResult) => void;

  constructor(game: LoopGame, clock: Clock, onTick: (r: PublicAdvanceResult) => void) {
    this.game = game;
    this.clock = clock;
    this.onTick = onTick;
  }

  get isRunning(): boolean {
    return this.running;
  }

  /** 지금 배속의 틱 간격 (ms) */
  get intervalMs(): number {
    return tickIntervalMs(this.game.getSpeed()) / this.timeScale;
  }

  start(): void {
    this.running = true;
    this.schedule();
  }

  stop(): void {
    this.running = false;
    this.cancel();
  }

  /** 배속이 바뀌었을 때: 새 간격으로 처음부터 다시 잰다 */
  reschedule(): void {
    if (this.running) this.schedule();
  }

  /** (디버그) 빨리감기 */
  setTimeScale(scale: number): void {
    this.timeScale = Math.max(1, scale);
    this.reschedule();
  }

  /** 앱이 화면에서 사라짐/돌아옴 (visibilitychange) */
  setHidden(hidden: boolean): void {
    if (hidden === this.hidden) return;
    this.hidden = hidden;
    if (hidden) {
      this.game.pause('background');
      this.cancel();
    } else {
      this.game.resume('background');
      if (this.running) this.schedule();
    }
  }

  /** 틱 하나를 바로 진행 (디버그·테스트) */
  step(): PublicAdvanceResult {
    const r = this.game.advanceTick();
    this.onTick(r);
    return r;
  }

  private schedule(): void {
    this.cancel();
    if (this.hidden) return;
    this.timer = this.clock.setTimeout(() => this.fire(), this.intervalMs);
  }

  private cancel(): void {
    if (this.timer !== null) this.clock.clearTimeout(this.timer);
    this.timer = null;
  }

  private fire(): void {
    this.timer = null;
    if (!this.running || this.hidden) return;
    const r = this.step();
    // 시대가 끝나면 멈춘다 (정산 창에서 다음 시대 시작 후 start)
    if (!r.advanced && this.game.phase !== 'running') {
      this.running = false;
      return;
    }
    if (r.advanced && r.settlement) {
      this.running = false;
      return;
    }
    this.schedule();
  }
}
