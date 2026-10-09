import { describe, expect, it } from 'vitest';
import { maxNewsSlots, validateEra, validateEras } from '../src/data/validate.ts';
import { effect, makeEra, makeNews } from './fixtures/makeEra.ts';

describe('데이터 검사기', () => {
  it('규칙에 맞는 가상 시대는 오류가 없다', () => {
    const r = validateEra(makeEra({ newsCount: 50, storylineCount: 3 }));
    expect(r.errors).toEqual([]);
  });

  it('시대 하나의 최대 뉴스 자리는 40개 (1분 + 3분 간격 반복)', () => {
    expect(maxNewsSlots()).toBe(40);
  });

  it('테마 개수·감성 비율이 틀리면 오류', () => {
    const era = makeEra();
    era.themes[0]!.sentiment = 'neutral';
    const r = validateEra(era);
    expect(r.errors.some((e) => e.includes('positive 테마 6개'))).toBe(true);
    expect(r.errors.some((e) => e.includes('neutral 테마 7개'))).toBe(true);
  });

  it('영향도가 -10~10 정수가 아니면 오류', () => {
    const era = makeEra({ effectsFor: (_i, ids) => [effect(ids[0]!, 11)] });
    expect(validateEra(era).errors.some((e) => e.includes('영향도 11'))).toBe(true);
    const era2 = makeEra({ effectsFor: (_i, ids) => [effect(ids[0]!, 2.5)] });
    expect(validateEra(era2).errors.some((e) => e.includes('영향도 2.5'))).toBe(true);
  });

  it('없는 테마를 가리키면 오류, "market"(시장 전체)은 허용', () => {
    expect(validateEra(makeEra({ effectsFor: () => [effect('nope', 3)] })).errors.some((e) => e.includes('없는 테마 nope'))).toBe(true);
    expect(validateEra(makeEra({ effectsFor: () => [effect('market', 3)] })).errors).toEqual([]);
  });

  it('테마 id로 "market"을 쓰면 오류', () => {
    const era = makeEra();
    era.themes[0]!.id = 'market';
    expect(validateEra(era).errors.some((e) => e.includes('예약어'))).toBe(true);
  });

  it('해설이 비었거나 link 값이 이상하면 오류', () => {
    const era = makeEra();
    era.newsPool[0]!.effects[0]!.explanation = { ko: '', en: 'x' };
    (era.newsPool[1]!.effects[0] as { link: string }).link = 'maybe';
    const errors = validateEra(era).errors;
    expect(errors.some((e) => e.includes('explanation: ko'))).toBe(true);
    expect(errors.some((e) => e.includes('link는 direct 또는 indirect'))).toBe(true);
  });

  it('낌새 뉴스 영향도가 ±4를 넘거나 결과 뉴스보다 크면 오류', () => {
    const era = makeEra({ storylineCount: 1 });
    era.storylines[0]!.signals[0] = makeNews('big-signal', [effect('t0', 5)]);
    expect(validateEra(era).errors.some((e) => e.includes('±4 이하'))).toBe(true);

    const era2 = makeEra({ storylineCount: 1 });
    era2.storylines[0]!.signals[0] = makeNews('s', [effect('t0', 4)]);
    era2.storylines[0]!.branches[0]!.news = makeNews('weak-outcome', [effect('t0', 3)]);
    expect(validateEra(era2).errors.some((e) => e.includes('낌새 뉴스보다 커야'))).toBe(true);
  });

  it('결과 갈래가 1개뿐이면 오류', () => {
    const era = makeEra({ storylineCount: 1 });
    era.storylines[0]!.branches.pop();
    expect(validateEra(era).errors.some((e) => e.includes('2개 이상'))).toBe(true);
  });

  it('뉴스 공급이 최대 자리 수보다 적으면 모드별로 경고(오류는 아님)', () => {
    const r = validateEra(makeEra({ newsCount: 10, storylineCount: 2 }));
    expect(r.errors).toEqual([]);
    expect(r.warnings.some((w) => w.includes('실전 모드 뉴스 공급 14자리'))).toBe(true);
    expect(r.warnings.some((w) => w.includes('연습 모드 뉴스 공급 14자리'))).toBe(true);
  });

  it('영어 텍스트가 비면 오류', () => {
    const era = makeEra();
    era.stocks[3]!.description.en = '';
    expect(validateEra(era).errors.some((e) => e.includes('description: en'))).toBe(true);
  });

  it('여러 시대의 id·order 중복을 잡는다', () => {
    const r = validateEras([makeEra({ id: 'a', order: 1 }), makeEra({ id: 'a', order: 1 })]);
    expect(r.errors.some((e) => e.includes('시대 id 중복'))).toBe(true);
    expect(r.errors.some((e) => e.includes('시대 order 중복'))).toBe(true);
  });
});
