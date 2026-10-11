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

/**
 * 화면에 보일 남은 시간(초): 게임은 5초 틱으로 움직이지만, 틱 사이에도 1초씩 줄어들게 보여 준다.
 * remaining = 지금 틱의 남은 시간, progress = 다음 틱까지 지난 정도(0~1), tickSeconds = 틱 길이(5초).
 * 다음 틱이 오기 전에는 한 틱 아래로 내려가지 않는다 (틱이 늦어져도 숫자가 앞서 가지 않음)
 */
export function displayRemaining(remaining: number, progress: number, tickSeconds: number): number {
  const passed = Math.min(tickSeconds - 1, Math.floor(progress * tickSeconds));
  return Math.max(0, remaining - Math.max(0, passed));
}
