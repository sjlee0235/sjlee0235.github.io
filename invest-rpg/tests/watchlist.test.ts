import { describe, expect, it } from 'vitest';
import { changeColor, directionOf } from '../src/engine/colors.ts';
import { addFavorite, sortByFavorites, toggleFavorite } from '../src/engine/watchlist.ts';

const DEFAULT = ['s0', 's1', 's2', 's3', 's4', 's5'];
const sort = (favs: string[]) => sortByFavorites(DEFAULT, favs, (id) => id);

describe('즐겨찾기 정렬', () => {
  it('즐겨찾기가 없으면 기본 순서', () => {
    expect(sort([])).toEqual(DEFAULT);
  });

  it('즐겨찾기 종목이 항상 위, 나머지는 기본 순서 유지', () => {
    let favs: string[] = [];
    favs = toggleFavorite(favs, 's3');
    expect(sort(favs)).toEqual(['s3', 's0', 's1', 's2', 's4', 's5']);
  });

  it('별을 누르면 즐겨찾기 그룹의 맨 위로 간다', () => {
    let favs: string[] = [];
    favs = toggleFavorite(favs, 's3');
    favs = toggleFavorite(favs, 's1');
    favs = toggleFavorite(favs, 's5');
    expect(sort(favs)).toEqual(['s5', 's1', 's3', 's0', 's2', 's4']);
  });

  it('별을 다시 누르면 해제되고 기본 순서 자리로 돌아간다', () => {
    let favs = ['s5', 's1', 's3'];
    favs = toggleFavorite(favs, 's1');
    expect(sort(favs)).toEqual(['s5', 's3', 's0', 's1', 's2', 's4']);
  });

  it('해제 후 다시 별을 누르면 맨 위로', () => {
    let favs = ['s5', 's1', 's3'];
    favs = toggleFavorite(favs, 's3');
    favs = toggleFavorite(favs, 's3');
    expect(favs).toEqual(['s3', 's5', 's1']);
  });

  it('addFavorite: 이미 있으면 위치를 바꾸지 않는다 (매수 자동 추가용)', () => {
    expect(addFavorite(['s2', 's4'], 's4')).toEqual(['s2', 's4']);
    expect(addFavorite(['s2', 's4'], 's0')).toEqual(['s0', 's2', 's4']);
  });

  it('원본 배열을 바꾸지 않는다', () => {
    const favs = ['s1'];
    toggleFavorite(favs, 's2');
    sort(favs);
    expect(favs).toEqual(['s1']);
  });
});

describe('상승/하락 색상', () => {
  it('한국식(기본): 상승 빨강, 하락 파랑', () => {
    expect(changeColor(5)).toBe('red');
    expect(changeColor(-0.1)).toBe('blue');
    expect(changeColor(0)).toBe('neutral');
  });

  it('반전(서양식): 상승 초록, 하락 빨강', () => {
    expect(changeColor(5, 'western')).toBe('green');
    expect(changeColor(-5, 'western')).toBe('red');
    expect(changeColor(0, 'western')).toBe('neutral');
  });

  it('방향 판정', () => {
    expect(directionOf(1)).toBe('up');
    expect(directionOf(-1)).toBe('down');
    expect(directionOf(0)).toBe('flat');
  });
});
