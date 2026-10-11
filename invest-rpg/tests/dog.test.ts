// 거실 강아지: 돌아다니기 상태 머신과 터치 반응 (DESIGN_HANDOFF 8.2, 17장)

import { describe, expect, it } from 'vitest';
import { createPresentationRng } from '../src/engine/rng.ts';
import { DOG_RULES, dogSprite, newDog, stepDog, touchDog, type DogEnv, type DogState } from '../src/ui/dogBrain.ts';

const env = (over: Partial<DogEnv> = {}): DogEnv => ({ stage: 'pup', hasSofa: true, rng: createPresentationRng(1, 'dog'), ...over });

/** dt=0.05초씩 sec초 돌리며 거쳐 간 상태를 모은다 */
function run(d: DogState, sec: number, e: DogEnv): { d: DogState; modes: Set<string>; states: DogState[] } {
  const modes = new Set<string>();
  const states: DogState[] = [];
  for (let t = 0; t < sec; t += 0.05) {
    d = stepDog(d, 0.05, e);
    modes.add(d.mode);
    states.push(d);
  }
  return { d, modes, states };
}

describe('돌아다니기', () => {
  it('처음에는 러그 위에 엎드려 쉬고, 쉬는 시간은 3~9초 ÷ 시대 배수', () => {
    for (const stage of ['pup', 'adult', 'old'] as const) {
      const mul = { pup: 1.3, adult: 1, old: 0.6 }[stage];
      for (let seed = 0; seed < 30; seed++) {
        const d = newDog({ ...env({ stage }), rng: createPresentationRng(seed, 'dog') });
        expect(d.mode).toBe('LIE');
        expect(d.left).toBeGreaterThanOrEqual(3 / mul - 1e-9);
        expect(d.left).toBeLessThanOrEqual(9 / mul + 1e-9);
      }
    }
  });

  it('걷기 → 엎드리기·앉기·소파를 오가며, 바닥에서는 걸을 수 있는 범위 안에 있다', () => {
    const e = env();
    const { modes, states } = run(newDog(e), 600, e);
    for (const m of ['LIE', 'SIT_FLOOR', 'WALK', 'JUMP_UP', 'SIT_SOFA', 'JUMP_DOWN']) expect(modes, m).toContain(m);
    for (const s of states.filter((x) => x.mode === 'WALK' || x.mode === 'SIT_FLOOR' || x.mode === 'LIE')) {
      expect(s.x).toBeGreaterThanOrEqual(DOG_RULES.floorX[0] - 1e-9);
      expect(s.x).toBeLessThanOrEqual(DOG_RULES.floorX[1] + 1e-9);
      expect(s.footY).toBeGreaterThanOrEqual(DOG_RULES.floorY[0] - 1e-9);
      expect(s.footY).toBeLessThanOrEqual(DOG_RULES.floorY[1] + 1e-9);
    }
    for (const s of states.filter((x) => x.mode === 'SIT_SOFA')) {
      expect(s.footY).toBe(DOG_RULES.sofaY);
      expect(s.flip).toBe(true); // 방 쪽을 본다
    }
  });

  it('소파가 없으면(Lv0) 소파 위·점프를 쓰지 않는다', () => {
    const e = env({ hasSofa: false });
    const { modes } = run(newDog(e), 600, e);
    for (const m of ['SIT_SOFA', 'JUMP_UP', 'JUMP_DOWN']) expect(modes).not.toContain(m);
  });

  it('걷는 속도: 초당 약 12도트 × 배수, 가는 방향을 본다', () => {
    const e = env({ stage: 'old' });
    let d: DogState = { ...newDog(e), mode: 'WALK', x: 10, footY: 230, target: { x: 80, footY: 230 }, next: 'SIT_FLOOR' };
    d = stepDog(d, 1, e);
    expect(d.x).toBeCloseTo(10 + 12 * 0.6, 6);
    expect(d.flip).toBe(false);
  });

  it('점프는 0.6초 포물선 (가운데에서 14도트 위로 솟음)', () => {
    const e = env();
    const d: DogState = { ...newDog(e), mode: 'JUMP_UP', t: 0.3, jump: { from: { x: 70, footY: 210 }, to: { x: 78, footY: 172 } } };
    const sp = dogSprite(d, 'pup');
    expect(sp.top + 38).toBe(Math.round((210 + 172) / 2 - 14));
    expect(stepDog(d, 0.31, e).mode).toBe('SIT_SOFA');
  });

  it('숨쉬기: 엎드리기·앉기 중 0.8초마다 1도트 오르내림', () => {
    const d = newDog(env());
    const a = dogSprite({ ...d, t: 0.1 }, 'pup');
    const b = dogSprite({ ...d, t: 0.9 }, 'pup');
    expect(a.top - b.top).toBe(1);
  });
});

describe('터치 반응', () => {
  it('1번 터치 = 서서 웃기 2.5초 (0.25초마다 꼬리 좌/우), 끝나면 이전 자세로 쉬기부터', () => {
    const e = env();
    const d0 = newDog(e);
    const r = touchDog(d0, 1000, e);
    expect(r.reaction).toBe('happy');
    expect(r.state.mode).toBe('HAPPY');
    expect(dogSprite({ ...r.state, t: 0.1 }, 'pup').pose).toBe('happy0');
    expect(dogSprite({ ...r.state, t: 0.3 }, 'pup').pose).toBe('happy1');
    const after = stepDog(stepDog(r.state, 2.4, e), 0.2, e);
    expect(after.mode).toBe('LIE');
    expect(after.left).toBeGreaterThanOrEqual(3 / 1.3 - 1e-9);
  });

  it('1.5초 안에 이어서 5번 = 배 까고 눕기 4초 + 하트 (0.4초마다 0→1→2), 배 까기 중 터치는 세지 않음', () => {
    const e = env();
    let d = newDog(e);
    const out: (string | null)[] = [];
    for (let i = 0; i < 5; i++) {
      const r = touchDog(d, 1000 + i * 1400, e);
      d = r.state;
      out.push(r.reaction);
    }
    expect(out).toEqual(['happy', 'happy', 'happy', 'happy', 'belly']);
    expect(d.mode).toBe('BELLY');
    expect(touchDog(d, 8000, e).reaction).toBeNull();
    const frames = [0.1, 0.5, 0.9, 1.3].map((t) => dogSprite({ ...d, t }, 'pup').hearts!.frame);
    expect(frames).toEqual([0, 1, 2, 0]);
    expect(stepDog(d, 4.01, e).mode).toBe('LIE');
  });

  it('간격이 1.5초를 넘으면 1부터 다시 센다', () => {
    const e = env();
    let d = newDog(e);
    for (let i = 0; i < 4; i++) d = touchDog(d, i * 1000, e).state;
    const r = touchDog(d, 3000 + 1600, e);
    expect(r.count).toBe(1);
    expect(r.reaction).toBe('happy');
  });

  it('소파 위에서 누르면 먼저 바닥으로 내려온 뒤 반응한다', () => {
    const e = env();
    const onSofa: DogState = { ...newDog(e), mode: 'SIT_SOFA', x: 80, footY: DOG_RULES.sofaY, flip: true };
    const r = touchDog(onSofa, 0, e);
    expect(r.state.mode).toBe('JUMP_DOWN');
    const landed = stepDog(r.state, 0.61, e);
    expect(landed.mode).toBe('HAPPY');
    expect(landed.footY).toBeGreaterThanOrEqual(DOG_RULES.jumpZoneY[0]);
  });

  it('걷던 중에 누르면 그 자리에 멈춰 반응하고, 끝나면 바닥에 앉아 쉰다', () => {
    const e = env();
    const walking: DogState = { ...newDog(e), mode: 'WALK', x: 30, footY: 240, target: { x: 80, footY: 240 }, next: 'LIE' };
    const r = touchDog(walking, 0, e);
    expect(r.state).toMatchObject({ mode: 'HAPPY', x: 30, footY: 240 });
    expect(stepDog(r.state, 2.6, e).mode).toBe('SIT_FLOOR');
  });

  it('왼쪽을 보면 하트 오버레이를 6도트 왼쪽으로', () => {
    const e = env();
    let d: DogState = { ...newDog(e), flip: true, x: 50 };
    for (let i = 0; i < 5; i++) d = touchDog(d, i * 100, e).state;
    expect(dogSprite(d, 'pup').hearts!.x).toBe(44);
  });
});
