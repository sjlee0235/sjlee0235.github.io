import { describe, expect, it } from 'vitest';
import { isAllDirect } from '../src/data/schema.ts';
import { ALL_ERAS } from '../src/data/eras/index.ts';
import { allNewsOf, validateEras } from '../src/data/validate.ts';
import { Game } from '../src/engine/game.ts';

// 실존 기업명·인물명·상표 금지어. 앱에 들어가는 JSON 전체(근거 메모 포함)를 검사한다.
// 실명은 docs/2000s_fact_check.md (앱에 포함되지 않음)에만 둔다.
// '다음'처럼 일반 단어와 겹치는 이름은 오탐이 많아 뺐다. 필요하면 목록을 늘린다.
const BANNED = [
  '삼성', '현대', 'LG', '엘지', 'SK', '포스코', '대우', '기아', '한화', '롯데', '네이버', '엔씨', '넥슨',
  '셀트리온', '녹십자', '대한항공', '아시아나', '리먼', '베어스턴스', '애플', '아이폰', '구글', '노키아',
  '모토로라', '나스닥', '코스피', '코스닥', 'KTX', '겨울연가', 'NHK', '황우석', '부시', '후세인', '김정일',
  '김대중', '노무현', '이명박', '그린스펀', '버냉키', '미르의 전설',
  'Samsung', 'Hyundai', 'POSCO', 'Daewoo', 'Kia', 'Naver', 'Nexon', 'Lehman', 'Bear Stearns', 'Apple',
  'iPhone', 'Google', 'Nokia', 'Motorola', 'Intel', 'Boeing', 'Korean Air', 'Asiana', 'GM', 'Ford',
  'Chrysler', 'AIG', 'Nasdaq', 'NASDAQ', 'KOSPI', 'Bush', 'Hussein', 'Greenspan', 'Bernanke',
];

const era2000s = ALL_ERAS.find((e) => e.id === '2000s')!;

describe('실제 시대 데이터 (2000년대)', () => {
  it('오류가 없고 경고도 없다 (분포·공급량 목표 충족)', () => {
    const r = validateEras([...ALL_ERAS]);
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
  });

  it('테마 20개(7/7/6), 종목 20개', () => {
    expect(era2000s.themes).toHaveLength(20);
    expect(era2000s.stocks).toHaveLength(20);
  });

  it('공급량: 실전 36자리 이상, 연습 직접 뉴스 14개 이상', () => {
    expect(era2000s.newsPool.length + era2000s.storylines.length * 2).toBeGreaterThanOrEqual(36);
    expect(era2000s.newsPool.filter(isAllDirect).length).toBeGreaterThanOrEqual(14);
  });

  it('구성: 직접·간접·시장 전체 뉴스, 스토리(가상 갈래 포함), 반대 반응 해설', () => {
    const all = allNewsOf(era2000s);
    expect(all.some((n) => n.effects.some((e) => e.link === 'indirect'))).toBe(true);
    expect(all.some((n) => n.category === 'market')).toBe(true);
    // 시장 전체 뉴스는 테마마다 다르게 (모든 종목 같은 방향인 market 영향은 쓰지 않음)
    expect(all.every((n) => n.effects.every((e) => e.themeId !== 'market'))).toBe(true);
    for (const s of era2000s.storylines) {
      expect(s.outcomes.some((o) => o.isHistorical), s.id).toBe(true);
      expect(s.outcomes.some((o) => !o.isHistorical), s.id).toBe(true);
    }
    expect(all.some((n) => n.reactionNote)).toBe(true);
    for (const t of era2000s.themes) {
      expect(all.some((n) => n.effects.some((e) => e.themeId === t.id)), t.id).toBe(true);
    }
  });

  it('앱에 들어가는 모든 텍스트(근거 메모 포함)에 실존 기업명·인물명이 없다', () => {
    const text = JSON.stringify(era2000s);
    for (const word of BANNED) {
      const hit = /^[A-Za-z ]+$/.test(word) ? new RegExp(`\\b${word}\\b`).test(text) : text.includes(word);
      if (hit) throw new Error(`금지어 "${word}" 발견`);
    }
  });

  it('두 모드 모두 시대를 끝까지 돌릴 수 있다', () => {
    for (const mode of ['practice', 'real'] as const) {
      const game = new Game({ eras: ALL_ERAS, seed: 2000, mode });
      while (game.phase !== 'era-ended') {
        if (game.phase === 'news') game.confirmNews();
        game.advanceTick();
      }
      expect(game.shownNews.length).toBeGreaterThanOrEqual(mode === 'real' ? 20 : 4);
    }
  });
});
