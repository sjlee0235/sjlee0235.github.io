// 픽셀 그림 정수 배율 (docs/art_spec.md 1장)

export const BASE_WIDTH = 180;
export const BASE_HEIGHT = 320;

/** 배율 = 내림(min(너비 ÷ 180, 높이 ÷ 320)), 최소 1 */
export function pixelScale(viewportWidth: number, viewportHeight: number): number {
  return Math.max(1, Math.floor(Math.min(viewportWidth / BASE_WIDTH, viewportHeight / BASE_HEIGHT)));
}
