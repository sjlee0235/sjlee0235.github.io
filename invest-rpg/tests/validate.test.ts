import { describe, expect, it } from 'vitest';
import { lintEra, lintWords } from '../src/data/lint.ts';
import { validateEra, validateEras } from '../src/data/validate.ts';
import { effect, makeNews, makeSpecEra } from './fixtures/makeEra.ts';

describe('데이터 구조 검사 (validate)', () => {
  it('기획 조건대로 만든 가상 시대는 오류가 없다', () => {
    expect(validateEra(makeSpecEra()).errors).toEqual([]);
  });

  it('magnitude 범위: 속보 3~10, 잠정 1~3, 결과 7~10', () => {
    const era = makeSpecEra();
    era.breaking[0]!.magnitude = 2;
    era.stories[0]!.tentative.magnitude = 4;
    era.stories[1]!.news[0]!.magnitude = 6;
    const errors = validateEra(era).errors;
    expect(errors.some((e) => e.includes('magnitude 2'))).toBe(true);
    expect(errors.some((e) => e.includes('magnitude 4'))).toBe(true);
    expect(errors.some((e) => e.includes('magnitude 6'))).toBe(true);
  });

  it('스토리: 결과 정확히 2개, leansTo가 결과 중 하나, 두 결과는 서로 반대 방향', () => {
    const era = makeSpecEra();
    era.stories[0]!.leansTo = 'nope';
    const same = era.stories[1]!;
    same.news[1]!.effects = same.news[0]!.effects.map((e) => ({ ...e }));
    era.stories[2]!.outcomes.pop();
    const errors = validateEra(era).errors;
    expect(errors.some((e) => e.includes('leansTo nope'))).toBe(true);
    expect(errors.some((e) => e.includes('방향이 같음'))).toBe(true);
    expect(errors.some((e) => e.includes('정확히 2개'))).toBe(true);
  });

  it('영향도 0·범위 밖, 없는 테마, 잘못된 강도는 오류', () => {
    const era = makeSpecEra();
    era.breaking[0]!.effects[0]!.impact = 0;
    era.breaking[1]!.effects[0]!.themeId = 'nope';
    (era.breaking[2]!.effects[0]!.link as { strength: number }).strength = 4;
    const errors = validateEra(era).errors;
    expect(errors.some((e) => e.includes('영향도 0'))).toBe(true);
    expect(errors.some((e) => e.includes('없는 테마 nope'))).toBe(true);
    expect(errors.some((e) => e.includes('연결 강도'))).toBe(true);
  });

  it('추첨이 불가능한 풀(분위기별 개수 부족)은 오류', () => {
    const era = makeSpecEra();
    era.themes.filter((t) => t.sentiment === 'neutral').slice(0, 5).forEach((t) => (t.sentiment = 'positive'));
    expect(validateEra(era).errors.some((e) => e.includes('neutral 테마 5개'))).toBe(true);
  });

  it('여러 시대 id·order 중복', () => {
    const r = validateEras([makeSpecEra({ id: 'a', order: 1 }), makeSpecEra({ id: 'a', order: 1 })]);
    expect(r.errors.some((e) => e.includes('시대 id 중복'))).toBe(true);
  });
});

describe('콘텐츠 점검 (lint:content)', () => {
  const rules = (era = makeSpecEra()) => new Set(lintEra(era).map((i) => i.rule));

  it('가상 시대는 분위기 편향·비주류 외에는 깨끗하다', () => {
    const r = rules();
    for (const rule of ['pool', 'effectCount', 'formula', 'newsTerm', 'themeTerm', 'chain', 'reasonKo', 'date', 'existsEvidence']) {
      expect(r.has(rule), rule).toBe(false);
    }
  });

  it('영향 테마 수, 영향도 공식, chain 누락, newsTerm 불일치, 본문 날짜를 잡는다', () => {
    const era = makeSpecEra();
    era.breaking[0]!.effects = era.breaking[0]!.effects.slice(0, 3);
    era.breaking[1]!.effects[0]!.impact = era.breaking[1]!.effects[0]!.impact + 3;
    era.breaking[2]!.effects.find((e) => e.link.strength !== 3)!.link.chain = '';
    era.breaking[3]!.body.ko = '전혀 다른 본문 2008년 3월';
    const r = lintEra(era);
    expect(r.some((i) => i.rule === 'effectCount' && i.where === era.breaking[0]!.id)).toBe(true);
    expect(r.some((i) => i.rule === 'formula')).toBe(true);
    expect(r.some((i) => i.rule === 'chain')).toBe(true);
    expect(r.some((i) => i.rule === 'newsTerm' && i.where.startsWith(era.breaking[3]!.id))).toBe(true);
    expect(r.some((i) => i.rule === 'date' && i.message.includes('2008년'))).toBe(true);
  });

  it('±1 조정은 adjustNote가 있으면 허용', () => {
    const era = makeSpecEra();
    const n = makeNews('adj', 'breaking', 5, [effect('t0', 6, 3), effect('t1', 5), effect('t2', 5), effect('t3', 5), effect('t4', 5), effect('t5', 5)]);
    era.breaking.push(n);
    expect(lintEra(era).some((i) => i.rule === 'formula' && i.where.startsWith('adj'))).toBe(true);
    n.effects[0]!.adjustNote = '실제 등락이 더 컸음';
    expect(lintEra(era).some((i) => i.rule === 'formula' && i.where.startsWith('adj'))).toBe(false);
  });

  it('상위 4개 reason 누락, 비주류 테마 영향 2회 미만, 풀 구성을 잡는다', () => {
    const era = makeSpecEra();
    for (const e of era.breaking[0]!.effects) delete e.reason;
    era.themes[30]!.relevance = 'core';
    const r = lintEra(era);
    expect(r.filter((i) => i.rule === 'reasonKo' && i.where.startsWith(era.breaking[0]!.id))).toHaveLength(4);
    expect(r.some((i) => i.rule === 'pool' && i.message.includes('core 테마 25개'))).toBe(true);
  });

  it('가상 시대는 금지어 점검에서 고칠 것(오류)이 없다 (경고는 있을 수 있음)', () => {
    expect(lintWords(makeSpecEra({ id: 'w' })).filter((i) => i.severity !== 'warning')).toEqual([]);
  });

  it('종목명: 한국어 "브랜드 + 업종" 3~6자 붙여쓰기(띄어쓰기·\'주\' 없음), 영어 \'Stock\' 없음, 평가·전망 어감 단어 금지, 방향 암시 단어는 경고', () => {
    const era = makeSpecEra({ id: 'w' });
    const check = (ko: string, en = 'Sea Shipyard', desc = '선박을 만든다.') => lintWords({
      ...era, stocks: [{ ...era.stocks[0]!, name: { ko, en }, description: { ko: desc, en: 'x' } }], breaking: [], stories: [],
    });
    const errors = (...a: Parameters<typeof check>) => check(...a).filter((i) => i.severity !== 'warning').map((i) => i.rule);
    const warnings = (...a: Parameters<typeof check>) => check(...a).filter((i) => i.severity === 'warning').map((i) => i.rule);
    expect(errors('온유제약')).toEqual([]);
    expect(errors('바다조선')).toEqual([]);
    expect(errors('단풍중장비')).toEqual([]);
    expect(errors('밀레아제분')).toEqual([]);
    expect(errors('오닉스컴퓨터')).toEqual([]);
    expect(errors('카이로모터스주')).toContain('stockName'); // 7자 + '주'
    expect(errors('솔레아에너지기술')).toContain('stockName'); // 6자 넘음
    expect(errors('PC')).toContain('stockName'); // 3자 미만
    expect(errors('평화방산')).toEqual([]);
    expect(warnings('평화방산')).toContain('stockNameHint'); // "평화"는 막지 않고 경고만
    expect(errors('평화 방산')).toContain('stockName'); // 띄어쓰기 없음
    expect(errors('평화방산주')).toContain('stockName'); // '주'를 붙이지 않음
    expect(errors('최강방산')).toContain('stockName'); // 평가 어감
    expect(errors('바다조선', 'Sea Shipyard Stock')).toContain('stockName'); // 영어도 Stock 없음
    expect(errors('바다조선', 'Sea Shipyard', '앞으로 성장이 유망한 회사다.')).toContain('stockDescription');
    expect(errors('바다조선', 'Sea Shipyard', '가'.repeat(91))).toContain('stockDescription');
    expect(warnings('바다조선', 'Sea Shipyard', '가'.repeat(85))).toContain('stockDescription');
    expect(errors('바다조선', 'Sea Shipyard', '가'.repeat(85))).toEqual([]);
  });

  it('뉴스 제목은 한 줄: 26자를 넘으면 오류, 24자를 넘으면 경고', () => {
    const era = makeSpecEra({ id: 't' });
    const news = era.breaking[0]!;
    const withTitle = (ko: string) => lintWords({ ...era, breaking: [{ ...news, title: { ko, en: 'x' } }], stories: [] }).filter((i) => i.rule === 'newsTitle');
    expect(withTitle('가'.repeat(24))).toEqual([]);
    expect(withTitle('가'.repeat(25)).map((i) => i.severity)).toEqual(['warning']);
    expect(withTitle('가'.repeat(27)).map((i) => i.severity ?? 'error')).toEqual(['error']);
  });

  it('opener 스토리는 시대당 3개 이상, 단서 쪽 결과는 실제 역사', () => {
    const era = makeSpecEra({ id: 'w' });
    expect(lintEra(era).map((i) => i.rule)).not.toContain('opener');
    const few = { ...era, stories: era.stories.map((s, i) => ({ ...s, opener: i < 2 })) };
    expect(lintEra(few).map((i) => i.rule)).toContain('opener');
    expect(lintEra(era).map((i) => i.rule)).not.toContain('leanHistorical');
    const flipped = { ...era, stories: era.stories.map((s) => ({ ...s, outcomes: s.outcomes.map((o) => ({ ...o, isHistorical: !o.isHistorical })) })) };
    expect(lintEra(flipped).map((i) => i.rule)).toContain('leanHistorical');
  });

  it('뉴스 제목·본문의 주가 방향 표현(호재·악재·수혜·수혜주·타격주·상승 예상·하락 예상)을 잡고, 사건 표현("유가 급등")은 허용', () => {
    const era = makeSpecEra({ id: 'w' });
    const withBody = (ko: string) => lintWords({
      ...era, stocks: [], stories: [],
      breaking: [{ ...era.breaking[0]!, title: { ko: '제목', en: 'Title' }, body: { ko, en: 'Body' } }],
    }).map((i) => i.rule);
    expect(withBody('중동 정세 불안으로 유가 급등')).toEqual([]);
    for (const w of ['정유사에 호재', '항공사 악재', '수혜가 예상된다', '대표 수혜주', '타격주로 꼽힌다', '주가 상승 예상', '하락 예상']) {
      expect(withBody(w), w).toContain('newsDirection');
    }
  });
});
