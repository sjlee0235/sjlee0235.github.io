// 첫 화면 제목 "역전의 방" 도트 글자와 튜토리얼 구성

import { describe, expect, it } from 'vitest';
import { t } from '../src/i18n/index.ts';
import { TUTORIAL_PAGES } from '../src/ui/overlays.ts';
import { titleBitmap, titleSvg } from '../src/ui/title.ts';

describe('제목 도트 글자', () => {
  it('"역전의 방" 네 글자가 모두 그려지고, 외곽선·그림자 여백이 있다', () => {
    const g = titleBitmap('역전의 방');
    expect(g.length).toBe(15 + 4);
    expect(g[0]!.every((c) => !c)).toBe(true); // 위쪽 외곽선 자리
    // 글자 14도트 × 4 + 글자 사이 2도트 × 2 + 띄어쓰기 7도트 + 양옆 외곽선 1도트씩 = 69
    expect(g[0]!.length).toBe(69);
    const filled = (x0: number) => g.some((row) => row.slice(x0, x0 + 14).some(Boolean));
    expect([1, 17, 33, 54].map(filled)).toEqual([true, true, true, true]);
    expect(g.some((row) => row.slice(47, 54).some(Boolean))).toBe(false); // 띄어쓰기
    expect(titleSvg('역전의 방', 5)).toContain('aria-label="역전의 방"');
  });

  it('없는 글자는 오류', () => {
    expect(() => titleBitmap('역전의 집')).toThrow();
  });
});

describe('튜토리얼', () => {
  it('첫 장은 김역전의 이야기 (20대 후반, 투자 실패, 인생역전)', () => {
    const first = TUTORIAL_PAGES[0]!;
    expect(t('ko', first.title)).toBe('김역전의 이야기');
    const story = first.lines.map((k) => t('ko', k)).join(' ');
    expect(story).toContain('스물여덟');
    expect(story).toContain('잃었다');
    expect(story).toContain('인생역전');
    for (const p of TUTORIAL_PAGES) for (const k of [p.title, ...p.lines]) expect(t('en', k)).not.toBe(k);
  });
});
