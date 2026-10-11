// 다국어 텍스트 도우미.
// - t(locale, 'trade.bought', { name, count, price }) : 화면 문구
// - localize(text, locale) : 데이터(종목명·뉴스 등)의 LocalizedText 꺼내기
// 새 언어 추가: ja.json을 만들고 아래 MESSAGES와 schema.ts의 Locale에 추가.

import type { Locale, LocalizedText } from '../data/schema.ts';
import en from './en.json' with { type: 'json' };
import ko from './ko.json' with { type: 'json' };

export type Messages = typeof ko;

export const MESSAGES: Record<Locale, Messages> = { ko, en };
export const SUPPORTED_LOCALES = Object.keys(MESSAGES) as Locale[];
export const DEFAULT_LOCALE: Locale = 'ko';
/** 해당 언어에 문구가 없을 때 대신 쓸 언어 */
export const FALLBACK_LOCALE: Locale = 'en';

function lookup(messages: unknown, key: string): string | undefined {
  let cur: unknown = messages;
  for (const part of key.split('.')) {
    if (cur === null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return typeof cur === 'string' ? cur : undefined;
}

/** 화면 문구 번역. {name} 같은 자리에 params 값을 넣는다. 키가 없으면 키를 그대로 돌려준다 */
export function t(locale: Locale, key: string, params: Record<string, string | number> = {}): string {
  const template = lookup(MESSAGES[locale], key) ?? lookup(MESSAGES[FALLBACK_LOCALE], key) ?? key;
  return template.replace(/\{(\w+)\}/g, (m, name: string) => (name in params ? String(params[name]) : m));
}

/** 데이터 텍스트에서 해당 언어 꺼내기 (없으면 영어 → 한국어 순으로 대체) */
export function localize(text: LocalizedText, locale: Locale | 'ja' | 'zh'): string {
  return text[locale] || text[FALLBACK_LOCALE] || text.ko;
}
