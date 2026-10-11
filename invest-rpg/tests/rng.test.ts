import { describe, expect, it } from 'vitest';
import { createRng, deriveSeed, shuffle } from '../src/engine/rng.ts';

describe('시드 난수', () => {
  it('같은 시드면 같은 수열', () => {
    const a = createRng(123);
    const b = createRng(123);
    for (let i = 0; i < 1000; i++) expect(a.next()).toBe(b.next());
  });

  it('다른 시드면 다른 수열', () => {
    const a = createRng(1);
    const b = createRng(2);
    const sa = Array.from({ length: 10 }, () => a.next());
    const sb = Array.from({ length: 10 }, () => b.next());
    expect(sa).not.toEqual(sb);
  });

  it('int(min,max)는 양 끝을 포함한 범위 안에서 모든 값이 나온다', () => {
    const rng = createRng(7);
    const seen = new Set<number>();
    for (let i = 0; i < 20000; i++) {
      const v = rng.int(-30, 30);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(-30);
      expect(v).toBeLessThanOrEqual(30);
      seen.add(v);
    }
    expect(seen.size).toBe(61);
  });

  it('상태를 이어받으면 그 지점부터 같은 수열이 이어진다', () => {
    const a = createRng(99);
    a.next();
    a.next();
    const b = createRng(0, a.getState());
    expect(b.next()).toBe(a.next());
  });

  it('deriveSeed는 결정적이고 용도별로 다르다', () => {
    expect(deriveSeed(42, 'price', 0)).toBe(deriveSeed(42, 'price', 0));
    expect(deriveSeed(42, 'price', 0)).not.toBe(deriveSeed(42, 'news', 0));
    expect(deriveSeed(42, 'price', 0)).not.toBe(deriveSeed(42, 'price', 1));
  });

  it('shuffle은 원소를 잃지 않고 원본을 바꾸지 않는다', () => {
    const src = Array.from({ length: 40 }, (_, i) => i);
    const out = shuffle(src, createRng(5));
    expect([...out].sort((x, y) => x - y)).toEqual(src);
    expect(src).toEqual(Array.from({ length: 40 }, (_, i) => i));
    expect(out).not.toEqual(src);
  });
});
