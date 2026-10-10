// 작업(인형 눈 붙이기): 터치 규칙과 초당 터치 상한. 순수 함수.
//
// - 1번째 터치: 눈 하나 / 2번째 터치: 눈 두 개 / 3번째 터치: 완성 → 코인 적립, 다음 인형(눈 없음)으로
// - 2터치까지만 하면 0코인 (부분 적립 없음). 진행 중인 인형 상태(0~2터치)는 탭을 옮겨도, 저장해도 유지
// - 초당 터치 상한(MAX_TOUCHES_PER_SEC): 자동 클릭 프로그램·과도한 연타를 막는다. 넘는 터치는 무시
// - 실제 시각(ms)은 화면이 넘긴다 (엔진은 시계를 쓰지 않는다)
// - 지급 방식(묶음 / 시대 종료 합산 / 즉시)과 시대당 상한은 game.ts가 처리한다
// - 묶음(batch) 지급: 인형 batchDolls(100)개를 채우는 순간 지급 예정 코인을 입금하고 지급 예정·묶음 완성 수를 0으로.
//   다 못 채운 묶음은 시대가 바뀌어도 이어진다

import type { WorkRules } from './config.ts';

export interface WorkState {
  /** 지금 인형에 붙인 눈 수 = 진행 터치 수 (0 ~ touchesPerDoll-1) */
  progress: number;
  /** 이번 시대에 완성한 인형 수 */
  dollsCompleted: number;
  /** 이번 시대에 받아들인 터치 수 / 상한 때문에 무시한 터치 수 */
  touches: number;
  rejectedTouches: number;
  /** 지급 예정 작업 수입 (batch: 묶음을 채우면 입금 / era_end: 시대 종료 때 합산) */
  pending: number;
  /** batch: 지금 묶음에서 완성한 인형 수 (0 ~ batchDolls-1). 시대가 바뀌어도 이어진다 */
  batchDolls: number;
  /** 이번 시대에 적립된 작업 수입 합계 (지급 방식과 무관, 상한 적용 후) */
  earned: number;
}

/** 시대를 넘어 이어지는 작업 상태 (batch 지급의 지급 예정 코인과 묶음 완성 수) */
export interface WorkCarry {
  pending: number;
  batchDolls: number;
}

export function newWorkState(progress = 0, carry: WorkCarry = { pending: 0, batchDolls: 0 }): WorkState {
  return { progress, dollsCompleted: 0, touches: 0, rejectedTouches: 0, pending: carry.pending, batchDolls: carry.batchDolls, earned: 0 };
}

export interface TouchResult {
  /** 상한 때문에 무시되면 false */
  accepted: boolean;
  /** 터치 뒤 지금 인형의 눈 수 (완성되면 다음 인형이라 0) */
  eyes: number;
  /** 이 터치로 인형이 완성되었나 */
  completed: boolean;
}

/** 초당 터치 상한 검사기 (최근 1초 안의 받아들인 터치 시각을 기억) */
export class TouchLimiter {
  private recent: number[] = [];
  private readonly maxPerSec: number;
  constructor(maxPerSec: number) {
    this.maxPerSec = maxPerSec;
  }

  /** 이 시각의 터치를 받아들이면 true */
  allow(nowMs: number): boolean {
    this.recent = this.recent.filter((t) => nowMs - t < 1000 && t <= nowMs);
    if (this.recent.length >= this.maxPerSec) return false;
    this.recent.push(nowMs);
    return true;
  }
}

/** 받아들인 터치 하나를 인형 진행에 반영한다 (상한 검사는 TouchLimiter가 먼저, 완성 수·적립은 game.ts) */
export function applyTouch(state: WorkState, rules: WorkRules): { state: WorkState; completed: boolean } {
  const progress = state.progress + 1;
  const completed = progress >= rules.touchesPerDoll;
  return {
    state: {
      ...state,
      touches: state.touches + 1,
      progress: completed ? 0 : progress,
    },
    completed,
  };
}

/** 완성한 인형 n개의 코인 (시대당 상한이 있으면 남은 만큼만) */
export function creditFor(state: WorkState, dolls: number, rules: WorkRules): number {
  const coins = dolls * rules.coinsPerDoll;
  if (rules.incomeCapPerEra === null) return coins;
  return Math.max(0, Math.min(coins, rules.incomeCapPerEra - state.earned));
}
