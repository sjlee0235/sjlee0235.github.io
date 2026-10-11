// 거실 강아지: 돌아다니기(상태 머신)와 터치 반응. 순수 로직 (DOM 없음) — 테스트: tests/dog.test.ts
// 근거: DESIGN_HANDOFF.md 8.2(움직임), 17장(터치 반응), 16.2(Lv0에는 소파 없음)
//
// 상태 머신이란? "지금 무엇을 하는 중인지(상태)"에 따라 다음에 할 일이 정해지는 규칙표다.
//   LIE(러그에 엎드림) / SIT_FLOOR(바닥에 앉아 두리번) / SIT_SOFA(소파 위) / WALK(걷기) / JUMP_UP·JUMP_DOWN(점프)
//   + 터치 반응 HAPPY(서서 웃기) / BELLY(배 까고 눕기 + 하트)
//
// 좌표는 장면 도트(130×281) 기준. 위치는 "스프라이트 왼쪽 x"와 "발 닿는 y"로 관리한다 (8.1).
// 연출 난수는 시장 난수와 분리 (createPresentationRng) → 강아지는 게임 결과에 영향이 없다.

import type { Rng } from '../engine/rng.ts';
import type { DogArtStage, DogPose } from './art.ts';

export type DogMode = 'LIE' | 'SIT_FLOOR' | 'SIT_SOFA' | 'WALK' | 'JUMP_UP' | 'JUMP_DOWN' | 'HAPPY' | 'BELLY';

/** 시대별 움직임 배수 (아기 1.3 / 어른 1.0 / 노견 0.6) */
export const DOG_SPEED: Readonly<Record<DogArtStage, number>> = { pup: 1.3, adult: 1.0, old: 0.6 };

export const DOG_RULES = {
  /** 걷기 속도 (도트/초, 배수 곱하기 전) */
  walkSpeed: 12,
  /** 걷기 프레임 교체 (초, 배수로 나눔) */
  walkFrameSec: 0.2,
  /** 쉬는 시간 (초, 배수로 나눔) */
  restMin: 3,
  restMax: 9,
  /** 걸을 수 있는 범위: 스프라이트 왼쪽 x, 발 y */
  floorX: [0, 88] as const,
  floorY: [200, 262] as const,
  /** 소파 앞 점프 출발 구간 (시안은 x 60~90이지만 걸을 수 있는 범위 0~88 안으로 맞춤) */
  jumpZoneX: [60, 88] as const,
  jumpZoneY: [200, 214] as const,
  /** 소파 좌석: 발 y, 왼쪽 x 범위 */
  sofaY: 172,
  sofaX: [74, 86] as const,
  /** 러그 위 엎드리는 자리 (러그 중심 (94,224)) */
  rugX: [68, 76] as const,
  rugY: [228, 231] as const,
  /** 점프: 0.6초, 꼭짓점 14도트 위 */
  jumpSec: 0.6,
  jumpApex: 14,
  /** 숨쉬기: 앉기·엎드리기 중 0.8초마다 위아래 1도트 */
  breathSec: 0.8,
  /** 터치 반응 */
  happySec: 2.5,
  happyFrameSec: 0.25,
  bellySec: 4,
  bellyFrameSec: 0.3,
  heartsFrameSec: 0.4,
  /** 연속 터치 판정 간격(ms)과 배 까기에 필요한 횟수 */
  comboMs: 1500,
  bellyTouches: 5,
  /** 하트 오버레이: 왼쪽을 볼 때 x를 6도트 왼쪽으로 */
  heartsFlipShift: 6,
} as const;

interface Point {
  x: number;
  footY: number;
}

export interface DogState {
  mode: DogMode;
  x: number;
  footY: number;
  /** true = 왼쪽을 봄 (그림을 좌우 반전) */
  flip: boolean;
  /** 지금 상태에서 지난 시간(초) — 프레임·숨쉬기용 */
  t: number;
  /** 쉬기·반응 남은 시간(초) */
  left: number;
  /** WALK 목적지와 도착 뒤 할 일 */
  target: Point | null;
  next: 'LIE' | 'SIT_FLOOR' | 'SOFA' | null;
  /** 점프 출발·도착 */
  jump: { from: Point; to: Point } | null;
  /** 반응이 끝나면 돌아갈 자세 */
  resume: 'LIE' | 'SIT_FLOOR' | null;
  /** 소파에서 내려온 뒤 할 반응 */
  queued: 'HAPPY' | 'BELLY' | null;
  /** 연속 터치 */
  combo: number;
  lastTouchMs: number;
}

export interface DogEnv {
  stage: DogArtStage;
  /** 소파가 있는가 (인테리어 Lv1 이상) */
  hasSofa: boolean;
  rng: Rng;
}

export interface DogSprite {
  pose: DogPose;
  /** 스프라이트 왼쪽 x, 위쪽 y (도트) */
  x: number;
  top: number;
  flip: boolean;
  /** 하트 오버레이 프레임 (배 까기 때만) */
  hearts: { frame: number; x: number } | null;
}

const between = (rng: Rng, [a, b]: readonly [number, number]) => a + rng.next() * (b - a);
const restTime = (env: DogEnv) => between(env.rng, [DOG_RULES.restMin, DOG_RULES.restMax]) / DOG_SPEED[env.stage];

/** 처음 상태: 러그 위에 엎드려 쉰다 */
export function newDog(env: DogEnv): DogState {
  return {
    mode: 'LIE', x: 72, footY: 230, flip: false, t: 0, left: restTime(env),
    target: null, next: null, jump: null, resume: null, queued: null, combo: 0, lastTouchMs: -Infinity,
  };
}

/** 쉬기가 끝나면: 다음 할 일을 고르고 그 자리로 걸어간다 */
function startWalk(d: DogState, env: DogEnv): DogState {
  const r = env.rng.next();
  const options: DogState['next'][] = env.hasSofa ? ['LIE', 'SIT_FLOOR', 'SOFA'] : ['LIE', 'SIT_FLOOR'];
  const next = options[Math.floor(r * options.length)]!;
  const R = DOG_RULES;
  const target: Point = next === 'LIE'
    ? { x: between(env.rng, R.rugX), footY: between(env.rng, R.rugY) }
    : next === 'SOFA'
      ? { x: between(env.rng, R.jumpZoneX), footY: between(env.rng, R.jumpZoneY) }
      : { x: between(env.rng, R.floorX), footY: between(env.rng, R.floorY) };
  target.x = Math.min(R.floorX[1], Math.max(R.floorX[0], target.x));
  return { ...d, mode: 'WALK', t: 0, target, next, flip: target.x < d.x };
}

function rest(d: DogState, mode: 'LIE' | 'SIT_FLOOR' | 'SIT_SOFA', env: DogEnv): DogState {
  return { ...d, mode, t: 0, left: restTime(env), target: null, next: null, jump: null };
}

function startJump(d: DogState, mode: 'JUMP_UP' | 'JUMP_DOWN', to: Point): DogState {
  return { ...d, mode, t: 0, jump: { from: { x: d.x, footY: d.footY }, to }, flip: to.x < d.x };
}

function startReaction(d: DogState, kind: 'HAPPY' | 'BELLY', resume: 'LIE' | 'SIT_FLOOR'): DogState {
  return {
    ...d, mode: kind, t: 0, left: kind === 'HAPPY' ? DOG_RULES.happySec : DOG_RULES.bellySec,
    target: null, next: null, jump: null, resume, queued: null,
  };
}

/** dt초만큼 진행 */
export function stepDog(d: DogState, dt: number, env: DogEnv): DogState {
  const R = DOG_RULES;
  const mul = DOG_SPEED[env.stage];
  let s: DogState = { ...d, t: d.t + dt };
  switch (s.mode) {
    case 'LIE':
    case 'SIT_FLOOR':
    case 'SIT_SOFA': {
      s.left -= dt;
      if (s.left > 0) return s;
      if (s.mode === 'SIT_SOFA') {
        return startJump(s, 'JUMP_DOWN', { x: between(env.rng, R.jumpZoneX), footY: between(env.rng, R.jumpZoneY) });
      }
      return startWalk(s, env);
    }
    case 'WALK': {
      const tgt = s.target!;
      const dx = tgt.x - s.x;
      const dy = tgt.footY - s.footY;
      const dist = Math.hypot(dx, dy);
      const step = R.walkSpeed * mul * dt;
      if (dist <= step) {
        s = { ...s, x: tgt.x, footY: tgt.footY };
        if (s.next === 'SOFA' && env.hasSofa) {
          return startJump(s, 'JUMP_UP', { x: between(env.rng, R.sofaX), footY: R.sofaY });
        }
        // 소파로 가려다 소파가 없으면(그럴 일은 없지만) 바닥에 앉는다
        return rest(s, s.next === 'LIE' ? 'LIE' : 'SIT_FLOOR', env);
      }
      return { ...s, x: s.x + (dx / dist) * step, footY: s.footY + (dy / dist) * step, flip: dx < 0 };
    }
    case 'JUMP_UP':
    case 'JUMP_DOWN': {
      const j = s.jump!;
      if (s.t < R.jumpSec) return s;
      s = { ...s, x: j.to.x, footY: j.to.footY, jump: null };
      if (s.mode === 'JUMP_UP') return { ...rest(s, 'SIT_SOFA', env), flip: true };
      if (s.queued) return startReaction(s, s.queued, 'SIT_FLOOR');
      return startWalk(s, env);
    }
    case 'HAPPY':
    case 'BELLY': {
      s.left -= dt;
      if (s.left > 0) return s;
      // 반응이 끝나면 이전 자세로 돌아가 쉬는 시간(3~9초)부터 다시
      return rest({ ...s, resume: null }, s.resume ?? 'SIT_FLOOR', env);
    }
  }
}

export interface TouchOutcome {
  state: DogState;
  /** 이 터치로 시작한 반응 (배 까기 중이면 null) */
  reaction: 'happy' | 'belly' | null;
  /** 연속 터치 횟수 (이 터치 포함) */
  count: number;
}

/**
 * 강아지를 눌렀다. 1번 = 서서 웃기(2.5초), 1.5초 안에 이어서 5번 = 배 까고 눕기 + 하트(4초).
 * 배 까기 중에는 세지 않는다. 소파 위면 먼저 바닥으로 내려온 뒤 반응한다. 걷던 중이면 그 자리에 멈춘다.
 */
export function touchDog(d: DogState, nowMs: number, env: DogEnv): TouchOutcome {
  const R = DOG_RULES;
  if (d.mode === 'BELLY') return { state: d, reaction: null, count: 0 };
  const combo = nowMs - d.lastTouchMs <= R.comboMs ? d.combo + 1 : 1;
  const belly = combo >= R.bellyTouches;
  const kind = belly ? 'BELLY' : 'HAPPY';
  const base: DogState = { ...d, combo: belly ? 0 : combo, lastTouchMs: nowMs };
  const reaction = belly ? 'belly' : 'happy';
  if (d.mode === 'SIT_SOFA' || d.mode === 'JUMP_UP') {
    const from = d.mode === 'JUMP_UP' && d.jump ? d.jump.to : { x: d.x, footY: d.footY };
    const down = startJump({ ...base, x: from.x, footY: from.footY }, 'JUMP_DOWN', {
      x: between(env.rng, R.jumpZoneX), footY: between(env.rng, R.jumpZoneY),
    });
    return { state: { ...down, queued: kind }, reaction, count: combo };
  }
  if (d.mode === 'JUMP_DOWN') return { state: { ...base, queued: kind }, reaction, count: combo };
  const resume: 'LIE' | 'SIT_FLOOR' = d.mode === 'LIE' ? 'LIE' : d.mode === 'HAPPY' ? (d.resume ?? 'SIT_FLOOR') : 'SIT_FLOOR';
  return { state: startReaction(base, kind, resume), reaction, count: combo };
}

/** 지금 그릴 그림과 위치 */
export function dogSprite(d: DogState, stage: DogArtStage): DogSprite {
  const R = DOG_RULES;
  const mul = DOG_SPEED[stage];
  const alt = (sec: number) => Math.floor(d.t / sec) % 2;
  let pose: DogPose;
  let x = d.x;
  let footY = d.footY;
  let hearts: DogSprite['hearts'] = null;
  switch (d.mode) {
    case 'LIE':
      pose = 'lie';
      footY -= alt(R.breathSec);
      break;
    case 'SIT_FLOOR':
    case 'SIT_SOFA':
      pose = 'sit';
      footY -= alt(R.breathSec);
      break;
    case 'WALK':
      pose = alt(R.walkFrameSec / mul) ? 'walk1' : 'walk0';
      break;
    case 'JUMP_UP':
    case 'JUMP_DOWN': {
      pose = 'walk0';
      const j = d.jump!;
      const k = Math.min(1, d.t / R.jumpSec);
      x = j.from.x + (j.to.x - j.from.x) * k;
      footY = j.from.footY + (j.to.footY - j.from.footY) * k - 4 * R.jumpApex * k * (1 - k);
      break;
    }
    case 'HAPPY':
      pose = alt(R.happyFrameSec) ? 'happy1' : 'happy0';
      break;
    case 'BELLY': {
      pose = alt(R.bellyFrameSec) ? 'belly1' : 'belly0';
      const frame = Math.floor(d.t / R.heartsFrameSec) % 3;
      hearts = { frame, x: Math.round(x) - (d.flip ? R.heartsFlipShift : 0) };
      break;
    }
  }
  return { pose, x: Math.round(x), top: Math.round(footY) - 38, flip: d.flip, hearts };
}
