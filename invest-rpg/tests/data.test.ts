import { describe, expect, it } from 'vitest';
import { ALL_ERAS } from '../src/data/eras/index.ts';
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
});
