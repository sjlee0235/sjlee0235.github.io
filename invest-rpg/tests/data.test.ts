import { describe, expect, it } from 'vitest';
import { lintEra, lintWords } from '../src/data/lint.ts';
import { Game } from '../src/engine/game.ts';
import { ALL_ERAS, ERA_SEQUENCE, orderBySequence } from '../src/data/eras/index.ts';
import { validateEras } from '../src/data/validate.ts';
import { TUTORIAL_ERA } from '../src/engine/tutorial.ts';

// 실존 기업명·인물명·상표 금지어. 앱에 들어가는 JSON 전체(근거 메모 포함)를 검사한다.
// 실명은 docs/ 팩트체크 문서(앱에 포함되지 않음)에만 둔다.
export const BANNED = [
  '삼성', '현대', 'LG', '엘지', 'SK', '포스코', '대우', '기아', '한화', '롯데', '네이버', '엔씨', '넥슨',
  '셀트리온', '녹십자', '대한항공', '아시아나', '리먼', '베어스턴스', '애플', '아이폰', '구글', '노키아',
  '모토로라', '나스닥', '코스피', '코스닥', 'KTX', '겨울연가', 'NHK', '황우석', '부시', '후세인', '김정일',
  '김대중', '노무현', '이명박', '그린스펀', '버냉키', '미르의 전설',
  'Samsung', 'Hyundai', 'POSCO', 'Daewoo', 'Kia', 'Naver', 'Nexon', 'Lehman', 'Bear Stearns', 'Apple',
  'iPhone', 'Google', 'Nokia', 'Motorola', 'Intel', 'Boeing', 'Korean Air', 'Asiana', 'GM', 'Ford',
  'Chrysler', 'AIG', 'Nasdaq', 'NASDAQ', 'KOSPI', 'Bush', 'Hussein', 'Greenspan', 'Bernanke',
];

function findBanned(text: string): string[] {
  return BANNED.filter((w) => (/^[A-Za-z ]+$/.test(w) ? new RegExp(`\\b${w}\\b`).test(text) : text.includes(w)));
}

describe('게임에 들어가는 데이터', () => {
  it('등록된 시대 데이터에 구조 오류가 없다 (단계 B 전까지는 비어 있음)', () => {
    expect(validateEras([...ALL_ERAS]).errors).toEqual([]);
  });

  it('등록된 시대와 튜토리얼 데이터에 실존 기업명·인물명이 없다', () => {
    for (const era of [...ALL_ERAS, TUTORIAL_ERA]) expect(findBanned(JSON.stringify(era)), era.id).toEqual([]);
  });

  it('튜토리얼 데이터: 종목 5개, 뉴스 1개, 영향 3개 (모두 reason 있음)', () => {
    expect(TUTORIAL_ERA.stocks).toHaveLength(5);
    expect(TUTORIAL_ERA.breaking).toHaveLength(1);
    expect(TUTORIAL_ERA.breaking[0]!.effects.every((e) => e.reason?.ko && e.reason?.en)).toBe(true);
  });

  it('튜토리얼과 등록된 시대 데이터가 종목명·설명·뉴스 금지어 점검을 통과한다', () => {
    for (const era of [...ALL_ERAS, TUTORIAL_ERA]) expect(lintWords(era).filter((i) => i.severity !== 'warning'), era.id).toEqual([]);
  });

  it('시대 진행 순서 데이터: 2000s → 2010s → 2020s, 등록된 시대는 모두 순서에 있다', () => {
    expect(ERA_SEQUENCE).toEqual(['2000s', '2010s', '2020s']);
    for (const e of ALL_ERAS) expect(ERA_SEQUENCE).toContain(e.id);
    expect(orderBySequence([{ id: '2020s' }, { id: '2000s' }, { id: 'x' }]).map((e) => e.id)).toEqual(['2000s', '2020s']);
  });
});

describe('2000년대 데이터 (단계 B 초안)', () => {
  const era = ALL_ERAS.find((e) => e.id === '2000s')!;

  it('테마 36개(core 24·peripheral 12, 긍정 13·부정 13·중립 10), 속보 10개 이상, 스토리 8개 이상, opener 3개 이상', () => {
    expect(era.themes).toHaveLength(36);
    expect(era.stocks).toHaveLength(36);
    expect(era.breaking.length).toBeGreaterThanOrEqual(10);
    expect(era.stories.length).toBeGreaterThanOrEqual(8);
    expect(era.stories.filter((s) => s.opener).length).toBeGreaterThanOrEqual(3);
  });

  it('작성 가이드 점검: 테마별 호재/악재 비율(검토 중인 규칙)을 빼면 0건', () => {
    expect(lintEra(era).filter((i) => i.rule !== 'sentimentBias' && i.severity !== 'warning')).toEqual([]);
  });

  it('[시드 100개] 시대 시작 추첨이 늘 조건을 채우고, 첫 뉴스는 3분의 opener 잠정 뉴스', () => {
    const openers = new Set(era.stories.filter((s) => s.opener).map((s) => s.tentative.id));
    for (let seed = 1; seed <= 100; seed++) {
      const g = new Game({ eras: [era], seed });
      expect(g.draw.warning, `seed ${seed}`).toBeUndefined();
      const first = [...g.newsSchedule].sort((a, b) => a.tick - b.tick)[0]!;
      expect(first.tick * g.config.tickSeconds).toBe(180);
      expect(openers.has(first.news.id), `seed ${seed}`).toBe(true);
    }
  });
});
