// 화면용 숫자·시간 형식 (순수 함수)

import type { Locale } from '../data/schema.ts';

/** 1234567 → "1,234,567" */
export function fmtNum(n: number, locale: Locale = 'ko'): string {
  return Math.round(n).toLocaleString(locale === 'ko' ? 'ko-KR' : 'en-US');
}

/** 3.456 → "+3.5%", -0.04 → "-0.0%"가 아니라 "0.0%" */
export function fmtPct(p: number, digits = 1): string {
  const v = Number(p.toFixed(digits));
  if (v === 0) return `${(0).toFixed(digits)}%`;
  return `${v > 0 ? '+' : ''}${v.toFixed(digits)}%`;
}

/** 초 → "1:05:09" / "4:07" */
export function fmtTime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  return `${h > 0 ? `${h}:` : ''}${mm}:${String(sec).padStart(2, '0')}`;
}
