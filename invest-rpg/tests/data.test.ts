import { describe, expect, it } from 'vitest';
import { ALL_ERAS } from '../src/data/eras/index.ts';
import { validateEra, validateEras } from '../src/data/validate.ts';
import { Game } from '../src/engine/game.ts';

// 실존 기업명·상표가 종목명·뉴스 본문에 들어가지 않았는지 확인하는 간단한 금지어 목록.
// (근거 메모 source 필드는 검증용이라 실제 이름을 허용한다.)
// '다음'처럼 일반 단어와 겹치는 이름은 오탐이 많아 뺐다. 필요하면 목록을 늘린다.
const BANNED = [
  '삼성', '현대', 'LG', '엘지', 'SK', '포스코', '대우', '기아', '한화', '롯데', '네이버', '엔씨',
  '넥슨', '셀트리온', '녹십자', '대한항공', '아시아나', '리먼', '애플', '구글', '노키아', '모토로라',
  'Samsung', 'Hyundai', 'POSCO', 'Daewoo', 'Kia', 'Naver', 'Nexon', 'Lehman', 'Apple', 'Google',
  'Nokia', 'Motorola', 'Intel', 'Boeing', 'Korean Air', 'Asiana', 'GM', 'Ford', 'Chrysler',
];

describe('실제 시대 데이터', () => {
  it('2000년대가 들어 있다', () => {
    expect(ALL_ERAS.map((e) => e.id)).toContain('2000s');
  });

  it('모든 시대 데이터에 오류가 없다 (경고는 뉴스 풀 부족만 허용)', () => {
    const r = validateEras([...ALL_ERAS]);
    expect(r.errors).toEqual([]);
    for (const w of r.warnings) expect(w).toMatch(/뉴스 공급/);
  });

  it('2000년대: 테마 20개 (긍정 7 / 부정 7 / 중립 6), 종목 20개, 뉴스 10개 이상', () => {
    const era = ALL_ERAS.find((e) => e.id === '2000s')!;
    expect(validateEra(era).errors).toEqual([]);
    expect(era.themes).toHaveLength(20);
    expect(era.stocks).toHaveLength(20);
    expect(era.newsPool.length).toBeGreaterThanOrEqual(10);
  });

  it('종목명·뉴스 제목·본문에 실존 기업명/상표가 없다', () => {
    for (const era of ALL_ERAS) {
      const texts = [
        ...era.stocks.flatMap((s) => [s.name.ko, s.name.en, s.description.ko, s.description.en]),
        ...era.newsPool.flatMap((n) => [n.title.ko, n.title.en, n.body.ko, n.body.en]),
      ];
      for (const text of texts) {
        for (const word of BANNED) {
          const hit = /^[A-Za-z ]+$/.test(word)
            ? new RegExp(`\\b${word}\\b`).test(text)
            : text.includes(word);
          if (hit) throw new Error(`금지어 "${word}" 발견: ${text}`);
        }
      }
    }
  });

  it('실제 데이터로 시대 하나를 끝까지 돌릴 수 있다 (뉴스 풀이 부족하면 있는 만큼만)', () => {
    const game = new Game({ eras: ALL_ERAS, seed: 2000, mode: 'real' });
    const era = game.era;
    while (game.phase !== 'era-ended') {
      if (game.phase === 'news') game.confirmNews();
      game.advanceTick();
    }
    expect(game.tick).toBe(1440);
    expect(game.shownNews.length).toBeGreaterThan(0);
  });
});
