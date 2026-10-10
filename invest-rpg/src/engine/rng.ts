// 시드 기반 난수 생성기.
// 같은 시드(seed, 출발 숫자)를 넣으면 항상 같은 순서의 난수가 나온다.
// Math.random()은 매번 결과가 달라서 테스트·재현이 불가능하므로 쓰지 않는다.
//
// 알고리즘: mulberry32 (짧고 빠르며 게임용으로 충분한 품질)

export interface Rng {
  /** 0 이상 1 미만의 실수 */
  next(): number;
  /** min 이상 max 이하의 정수 (양 끝 포함) */
  int(min: number, max: number): number;
  /** 현재 내부 상태. 나중에 저장/불러오기에 사용 */
  getState(): number;
}

export function createRng(seed: number, initialState?: number): Rng {
  let state = initialState ?? (seed >>> 0);

  function next(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  return {
    next,
    int(min: number, max: number): number {
      return min + Math.floor(next() * (max - min + 1));
    },
    getState: () => state,
  };
}

/**
 * 시드 하나에서 용도별 하위 시드를 만든다.
 * 예) deriveSeed(42, 'price', 0) → 0번째 시대 주가용 시드
 * 주가용·뉴스용 난수를 분리해 두면, 한쪽 로직이 바뀌어도 다른 쪽 결과는 그대로 유지된다.
 */
export function deriveSeed(seed: number, ...parts: Array<string | number>): number {
  // FNV-1a 해시로 섞은 뒤 한 번 더 뒤섞는다
  let h = 0x811c9dc5 ^ (seed >>> 0);
  const text = parts.join('|');
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  return h >>> 0;
}

/** 배열을 섞은 새 배열을 돌려준다 (원본은 그대로). Fisher–Yates 방식 */
export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = rng.int(0, i);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/**
 * 연출용 난수 (강아지 움직임·음악 순서 등). 시장 난수와 다른 갈래의 시드라 서로 영향을 주지 않는다
 * → 강아지를 몇 번 만져도 시장 결과(시드 재현)는 그대로. 테스트에서는 seed를 고정해서 쓴다.
 */
export function createPresentationRng(seed: number, purpose: string): Rng {
  return createRng(deriveSeed(seed, 'presentation', purpose));
}
