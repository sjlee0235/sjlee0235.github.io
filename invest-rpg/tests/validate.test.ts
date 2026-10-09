import { describe, expect, it } from 'vitest';
import { validateEra, validateEras } from '../src/data/validate.ts';
import { makeEra } from './fixtures/makeEra.ts';

describe('데이터 검사기', () => {
  it('규칙에 맞는 가상 시대는 오류가 없다', () => {
    const r = validateEra(makeEra());
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
  });

  it('테마 개수·감성 비율이 틀리면 오류', () => {
    const era = makeEra();
    era.themes[0]!.sentiment = 'neutral';
    const r = validateEra(era);
    expect(r.errors.some((e) => e.includes('positive 테마 6개'))).toBe(true);
    expect(r.errors.some((e) => e.includes('neutral 테마 7개'))).toBe(true);
  });

  it('영향도가 -10~10 정수가 아니면 오류', () => {
    const era = makeEra({ effectsFor: (_i, ids) => [{ themeId: ids[0]!, impact: 11 }] });
    expect(validateEra(era).errors.some((e) => e.includes('영향도 11'))).toBe(true);
    const era2 = makeEra({ effectsFor: (_i, ids) => [{ themeId: ids[0]!, impact: 2.5 }] });
    expect(validateEra(era2).errors.some((e) => e.includes('영향도 2.5'))).toBe(true);
  });

  it('없는 테마를 가리키는 뉴스는 오류', () => {
    const era = makeEra({ effectsFor: () => [{ themeId: 'nope', impact: 3 }] });
    expect(validateEra(era).errors.some((e) => e.includes('없는 테마 nope'))).toBe(true);
  });

  it('영어 텍스트가 비면 오류', () => {
    const era = makeEra();
    era.stocks[3]!.description.en = '';
    expect(validateEra(era).errors.some((e) => e.includes('description: en'))).toBe(true);
  });

  it('뉴스 풀이 24개보다 적으면 경고(오류는 아님)', () => {
    const r = validateEra(makeEra({ newsCount: 10 }));
    expect(r.errors).toEqual([]);
    expect(r.warnings.some((w) => w.includes('뉴스 풀 10개'))).toBe(true);
  });

  it('여러 시대의 id·order 중복을 잡는다', () => {
    const r = validateEras([makeEra({ id: 'a', order: 1 }), makeEra({ id: 'a', order: 1 })]);
    expect(r.errors.some((e) => e.includes('시대 id 중복'))).toBe(true);
    expect(r.errors.some((e) => e.includes('시대 order 중복'))).toBe(true);
  });
});
