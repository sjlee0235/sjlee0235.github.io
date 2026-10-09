import { describe, expect, it } from 'vitest';
import { countSentences, maxNewsSlots, validateEra, validateEras } from '../src/data/validate.ts';
import { effect, makeEra, makeNews } from './fixtures/makeEra.ts';

describe('데이터 검사기', () => {
  it('규칙에 맞는 가상 시대는 오류가 없다', () => {
    expect(validateEra(makeEra({ newsCount: 50, storylineCount: 3, withClues: true })).errors).toEqual([]);
  });

  it('최대 뉴스 자리: 실전 40, 연습 10', () => {
    expect(maxNewsSlots('real')).toBe(40);
    expect(maxNewsSlots('practice')).toBe(10);
  });

  it('테마 개수·감성 비율이 틀리면 오류', () => {
    const era = makeEra();
    era.themes[0]!.sentiment = 'neutral';
    expect(validateEra(era).errors.some((e) => e.includes('positive 테마 6개'))).toBe(true);
  });

  it('영향도가 -10~10 정수가 아니거나 0이면 오류', () => {
    for (const bad of [11, 2.5, 0]) {
      const era = makeEra({ effectsFor: (_i, ids) => [effect(ids[0]!, bad)] });
      expect(validateEra(era).errors.length).toBeGreaterThan(0);
    }
  });

  it('직접 영향 테마가 8개를 넘으면 오류', () => {
    const era = makeEra({ effectsFor: (_i, ids) => ids.slice(0, 9).map((id) => effect(id, 2)) });
    expect(validateEra(era).errors.some((e) => e.includes('직접 영향 테마 9개'))).toBe(true);
  });

  it('연습용(직접) 뉴스는 해설 필수, 3~4문장', () => {
    const era = makeEra();
    delete era.newsPool[0]!.explanation;
    era.newsPool[2]!.explanation = { ko: '한 문장뿐이에요.', en: 'Only one.' };
    era.newsPool[4]!.explanation = { ko: '하나. 둘. 셋. 넷. 다섯.', en: 'A. B. C.' };
    const errors = validateEra(era).errors;
    expect(errors.some((e) => e.includes('test-n0') && e.includes('해설(explanation)이 필수'))).toBe(true);
    expect(errors.some((e) => e.includes('test-n2') && e.includes('1문장'))).toBe(true);
    expect(errors.some((e) => e.includes('test-n4') && e.includes('5문장'))).toBe(true);
  });

  it('문장 수 세기 (소수점은 문장 끝이 아님)', () => {
    expect(countSentences('금리가 0.5%포인트 내렸어요. 그래서 올랐어요.')).toBe(2);
    expect(countSentences('One. Two! Three?')).toBe(3);
  });

  it('낌새 영향도는 1~3, 결과는 낌새보다 커야 함', () => {
    const era = makeEra({ storylineCount: 1 });
    era.storylines[0]!.signal = makeNews('big', [effect('t0', 4)]);
    expect(validateEra(era).errors.some((e) => e.includes('낌새: 영향도는 1~3'))).toBe(true);

    const era2 = makeEra({ storylineCount: 1 });
    era2.storylines[0]!.signal = makeNews('s', [effect('t0', 3)]);
    era2.storylines[0]!.news[0] = makeNews('test-story0-hist', [effect('t0', 2)]);
    expect(validateEra(era2).errors.some((e) => e.includes('결과 영향도가 낌새보다 커야'))).toBe(true);
  });

  it('결과 연결: 2개 이상, 실제 역사 쪽 필수, newsId가 목록에 있어야 함', () => {
    const era = makeEra({ storylineCount: 1 });
    era.storylines[0]!.outcomes = [{ newsId: 'nope', isHistorical: false }];
    const errors = validateEra(era).errors;
    expect(errors.some((e) => e.includes('2개 이상'))).toBe(true);
    expect(errors.some((e) => e.includes('실제 역사 쪽'))).toBe(true);
    expect(errors.some((e) => e.includes('nope가 news 목록에 없음'))).toBe(true);
  });

  it('단서는 존재하는 결과를 가리켜야 함', () => {
    const era = makeEra({ storylineCount: 1, withClues: true });
    era.storylines[0]!.clues![0]!.pointsTo = 'nowhere';
    expect(validateEra(era).errors.some((e) => e.includes('nowhere'))).toBe(true);
  });

  it('공급량 부족은 경고: 실전 36자리, 연습 14개', () => {
    const r = validateEra(makeEra({ newsCount: 10, storylineCount: 2 }));
    expect(r.errors).toEqual([]);
    expect(r.warnings.some((w) => w.includes('실전 모드 뉴스 공급 14자리'))).toBe(true);
    expect(r.warnings.some((w) => w.includes('연습 모드 뉴스 공급 5개'))).toBe(true);
  });

  it('영향도 분포가 40/40/20에서 크게 벗어나면 경고', () => {
    const r = validateEra(makeEra({ effectsFor: (_i, ids) => [effect(ids[0]!, 9)] }));
    expect(r.warnings.some((w) => w.includes('영향도 분포 high'))).toBe(true);
  });

  it('여러 시대의 id·order 중복을 잡는다', () => {
    const r = validateEras([makeEra({ id: 'a', order: 1 }), makeEra({ id: 'a', order: 1 })]);
    expect(r.errors.some((e) => e.includes('시대 id 중복'))).toBe(true);
  });
});
