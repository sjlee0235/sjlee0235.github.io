// 거실 강아지 반응 로직 (순수 함수).
//
// - 터치할 때마다 가벼운 쓰다듬기 효과('pet')
// - 3번째 터치마다 반응 하나를 무작위로: 꼬리 흔들기 / 잔상처럼 좌우로 왔다갔다 / 하트 / 귀 쫑긋
//   직전 반응과 같은 것은 연속으로 나오지 않는다
// - 연출용 난수는 시장 난수(가격·뉴스)와 완전히 분리한다: createPresentationRng()로 따로 만든다
//   → 강아지를 몇 번 만져도 시장 결과(시드 재현)는 그대로
// - 시대별 성격(puppy/adult/senior)의 반응 후보와 속도 배율은 데이터(src/data/dogStages.json)

import dogStagesData from '../data/dogStages.json' with { type: 'json' };
import { createRng, deriveSeed, type Rng } from './rng.ts';

export type DogStage = 'puppy' | 'adult' | 'senior';
export type DogReaction = 'tail_wag' | 'afterimage_sway' | 'heart_pop' | 'ear_perk';

export interface DogStageData {
  description: string;
  reactions: DogReaction[];
  /** 애니메이션 속도 배율 (화면에서 사용) */
  speedMultiplier: number;
}

export const DOG_STAGES = dogStagesData.stages as Record<DogStage, DogStageData>;
/** 몇 번째 터치마다 반응하는가 */
export const DOG_REACTION_EVERY = 3;

export interface DogState {
  touches: number;
  lastReaction: DogReaction | null;
}

export const newDogState = (): DogState => ({ touches: 0, lastReaction: null });

export interface PetResult {
  state: DogState;
  /** 매 터치 쓰다듬기 효과 */
  effect: 'pet';
  /** 3번째 터치마다 고른 반응 (아니면 null) */
  reaction: DogReaction | null;
  speedMultiplier: number;
}

/** 강아지를 한 번 쓰다듬는다 */
export function petDog(state: DogState, stage: DogStage, rng: Rng): PetResult {
  const data = DOG_STAGES[stage];
  const touches = state.touches + 1;
  let reaction: DogReaction | null = null;
  if (touches % DOG_REACTION_EVERY === 0) {
    const pool = data.reactions.filter((r) => r !== state.lastReaction);
    const candidates = pool.length > 0 ? pool : data.reactions;
    reaction = candidates[rng.int(0, candidates.length - 1)]!;
  }
  return {
    state: { touches, lastReaction: reaction ?? state.lastReaction },
    effect: 'pet',
    reaction,
    speedMultiplier: data.speedMultiplier,
  };
}

/**
 * 연출용 난수 (강아지·음악 순서 등). 시장 난수와 다른 갈래의 시드라 서로 영향을 주지 않는다.
 * 테스트에서는 seed를 고정해서 쓴다.
 */
export function createPresentationRng(seed: number, purpose: string): Rng {
  return createRng(deriveSeed(seed, 'presentation', purpose));
}
