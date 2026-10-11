// 상승/하락 색상 규칙 (데이터 레벨 옵션).
// 엔진은 실제 색상 코드(#FF0000 등)를 모르고 "의미 이름"만 돌려준다.
// 화면 쪽에서 이 이름을 실제 색으로 바꿔 칠한다.

/** korean: 상승 빨강·하락 파랑 (기본) / western: 상승 초록·하락 빨강 */
export type ColorScheme = 'korean' | 'western';
export type PriceDirection = 'up' | 'down' | 'flat';
export type ChangeColor = 'red' | 'blue' | 'green' | 'neutral';

export const DEFAULT_COLOR_SCHEME: ColorScheme = 'korean';

export const COLOR_SCHEMES: Readonly<Record<ColorScheme, Record<PriceDirection, ChangeColor>>> = {
  korean: { up: 'red', down: 'blue', flat: 'neutral' },
  western: { up: 'green', down: 'red', flat: 'neutral' },
};

export function directionOf(change: number): PriceDirection {
  if (change > 0) return 'up';
  if (change < 0) return 'down';
  return 'flat';
}

/** 변동값(가격 차이든 %든 부호만 본다)에 맞는 색 이름 */
export function changeColor(change: number, scheme: ColorScheme = DEFAULT_COLOR_SCHEME): ChangeColor {
  return COLOR_SCHEMES[scheme][directionOf(change)];
}
