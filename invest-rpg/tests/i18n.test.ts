import { describe, expect, it } from 'vitest';
import { localize, MESSAGES, t } from '../src/i18n/index.ts';

function flatKeys(obj: object, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    typeof v === 'object' && v !== null ? flatKeys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

describe('다국어', () => {
  it('한국어·영어 문구의 키가 정확히 같다', () => {
    expect(flatKeys(MESSAGES.en).sort()).toEqual(flatKeys(MESSAGES.ko).sort());
  });

  it('자리 표시자({name})를 채운다', () => {
    expect(t('ko', 'trade.bought', { name: '정밀 반도체', count: 3, price: 1013 })).toBe(
      '정밀 반도체 3주를 1013 비트에 샀습니다.',
    );
    expect(t('en', 'common.bit', { amount: 500 })).toBe('500 bits');
  });

  it('엔진의 오류 코드마다 문구가 있다', () => {
    for (const code of ['invalid-quantity', 'invalid-price', 'insufficient-cash', 'insufficient-shares', 'unknown-stock', 'not-tradable', 'not-available-in-real', 'ad-limit-reached', 'game-finished']) {
      expect(t('ko', `error.${code}`)).not.toBe(`error.${code}`);
      expect(t('en', `error.${code}`)).not.toBe(`error.${code}`);
    }
  });

  it('없는 키는 키 그대로', () => {
    expect(t('ko', 'nope.missing')).toBe('nope.missing');
  });

  it('데이터 텍스트: 해당 언어가 없으면 영어로 대체', () => {
    const text = { ko: '반도체', en: 'Semiconductors' };
    expect(localize(text, 'ko')).toBe('반도체');
    expect(localize(text, 'ja')).toBe('Semiconductors');
    expect(localize({ ...text, ja: '半導体' }, 'ja')).toBe('半導体');
  });
});
