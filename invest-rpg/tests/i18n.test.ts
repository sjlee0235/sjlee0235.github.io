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

  it('연습 모드·광고 관련 키가 남아 있지 않다', () => {
    const keys = flatKeys(MESSAGES.ko).join(' ');
    expect(keys).not.toMatch(/\bmode\.|\bad\.|newsGuide|hint|deposits/);
  });

  it('엔진의 오류 코드마다 문구가 있다', () => {
    for (const code of ['invalid-quantity', 'invalid-price', 'insufficient-cash', 'insufficient-shares', 'unknown-stock', 'not-tradable']) {
      expect(t('ko', `error.${code}`)).not.toBe(`error.${code}`);
      expect(t('en', `error.${code}`)).not.toBe(`error.${code}`);
    }
  });

  it('해설 알림 템플릿', () => {
    expect(t('ko', 'recap.line', { stock: '든든 배터리', pct: '+21.3%', reason: '주문 증가 기대' })).toBe('든든 배터리 +21.3% — 주문 증가 기대');
    expect(t('ko', 'recap.auto', { newsTerm: '경유', theme: '정유', effect: t('ko', 'recap.burden') })).toBe('경유의 영향으로 정유 부담');
    expect(t('en', 'recap.line', { stock: 'A', pct: '-3.0%', reason: 'r' })).toBe('A -3.0% — r');
  });

  it('튜토리얼 안내 4가지와 가상 시나리오 안내가 두 언어에 있다', () => {
    for (const locale of ['ko', 'en'] as const) {
      for (const k of ['notice1', 'notice2', 'notice3', 'notice4']) expect(t(locale, `tutorial.${k}`)).not.toBe(`tutorial.${k}`);
      expect(t(locale, 'disclaimer.fictional')).not.toBe('disclaimer.fictional');
    }
    expect(t('ko', 'tutorial.notice1')).toContain('나오지 않을 수 있어요');
    expect(t('ko', 'tutorial.notice2')).toContain('잠정 뉴스');
    expect(t('ko', 'tutorial.notice3')).toContain('미리 공부');
    expect(t('ko', 'tutorial.notice4')).toContain('투자 권유가 아닙니다');
  });

  it('데이터 텍스트: 해당 언어가 없으면 영어로 대체', () => {
    expect(localize({ ko: '반도체', en: 'Semiconductors' }, 'ja')).toBe('Semiconductors');
  });
});
