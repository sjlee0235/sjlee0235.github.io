// 픽셀 그림 그리기 도구: 팔레트, 도형, 자동 윤곽선, 빛(위·왼쪽에서) 음영, 디더링.
// 그림 규칙 (docs/art_spec.md 3장)
// - 윤곽선은 검정이 아니라 짙은 자주빛 갈색(OUT) → 부드럽고 따뜻한 픽셀 게임 느낌
// - 빛은 왼쪽 위에서: 윗면은 밝게, 아랫면은 어둡게 (색마다 밝은/기본/어두운 3단계)
// - 중간 채도, 너무 어둡지 않게 (배경 명도 40~75%)

export type RGBA = readonly [number, number, number, number];

export function hex(h: string, a = 255): RGBA {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, a];
}

/** 색 램프 [가장 어두움 … 가장 밝음] */
export type Ramp = readonly RGBA[];
const ramp = (...hs: string[]): Ramp => hs.map((h) => hex(h));

export const PAL = {
  OUT: hex('#2b1b2a'),
  CLEAR: [0, 0, 0, 0] as RGBA,
  white: hex('#fffaf0'),
  black: hex('#1c1420'),
  wood: ramp('#4a2c22', '#6b4029', '#8e5a36', '#b57a4b', '#d9a26c', '#f0c894'),
  oak: ramp('#7a5a3a', '#a07850', '#c49a68', '#dcb886', '#eed6a8'),
  walnut: ramp('#3a2620', '#54372a', '#704b36', '#8e6346', '#ad7f5a'),
  cream: ramp('#bfa47a', '#d8c098', '#ead8b4', '#f6ead0', '#fff8e8'),
  red: ramp('#6e2430', '#9c3440', '#c94f55', '#e57f72', '#f6b19c'),
  green: ramp('#24493a', '#36684a', '#4f8d55', '#79b562', '#b0dc84'),
  sage: ramp('#4f6450', '#6a8268', '#86a082', '#a7bf9e', '#cddcc2'),
  blue: ramp('#22305a', '#2f4a86', '#3f6fbe', '#6a9be0', '#a8cdf5', '#dceeff'),
  navy: ramp('#1b2140', '#26305a', '#334075', '#45569a', '#5f74bd'),
  gold: ramp('#7a3f12', '#b0661c', '#e0952a', '#f4c040', '#ffe58a', '#fff6cc'),
  grey: ramp('#353a48', '#50576a', '#6e7689', '#959cae', '#bcc2d0', '#e2e6ee'),
  pink: ramp('#8c3a52', '#c05a74', '#e58a9c', '#f6b6c0', '#ffdfe4'),
  purple: ramp('#3a2a5a', '#584080', '#7a5aa8', '#a284cc', '#cbb4ea'),
  mustard: ramp('#7a5a1a', '#a87e24', '#d0a234', '#e8c45a', '#f6e09a'),
  teal: ramp('#1d4a50', '#2a6a6e', '#3e8e8a', '#68b4a8', '#a4dccc'),
  sky: ramp('#5a8ccc', '#7aaee0', '#9ccaf0', '#c4e2fa', '#e8f4ff'),
};

const same = (a: RGBA, b: RGBA) => a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];

export class Canvas {
  readonly w: number;
  readonly h: number;
  readonly px: Uint8Array;

  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.px = new Uint8Array(w * h * 4);
  }

  get(x: number, y: number): RGBA {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return PAL.CLEAR;
    const i = (y * this.w + x) * 4;
    return [this.px[i]!, this.px[i + 1]!, this.px[i + 2]!, this.px[i + 3]!];
  }

  filled(x: number, y: number): boolean {
    return this.get(x, y)[3] > 0;
  }

  set(x: number, y: number, c: RGBA): void {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    if (c[3] === 255 || c[3] === 0) {
      this.px.set(c, i);
      return;
    }
    // 반투명: 섞기
    const a = c[3] / 255;
    for (let k = 0; k < 3; k++) this.px[i + k] = Math.round(this.px[i + k]! * (1 - a) + c[k]! * a);
    this.px[i + 3] = Math.max(this.px[i + 3]!, c[3]);
  }

  rect(x: number, y: number, w: number, h: number, c: RGBA): void {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, c);
  }

  hline(x0: number, x1: number, y: number, c: RGBA): void {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) this.set(x, y, c);
  }

  vline(x: number, y0: number, y1: number, c: RGBA): void {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) this.set(x, y, c);
  }

  line(x0: number, y0: number, x1: number, y1: number, c: RGBA): void {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
    const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  /** 채운 타원 (중심·반지름, 반 픽셀 단위 가능) */
  ellipse(cx: number, cy: number, rx: number, ry: number, c: RGBA): void {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.set(x, y, c);
      }
    }
  }

  /** 모서리를 깎은 사각형 (r = 깎을 픽셀 수) */
  roundRect(x: number, y: number, w: number, h: number, r: number, c: RGBA): void {
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        const cx = i < r ? r - i : i >= w - r ? i - (w - r - 1) : 0;
        const cy = j < r ? r - j : j >= h - r ? j - (h - r - 1) : 0;
        if (cx * cx + cy * cy <= r * r + 0.5 || cx === 0 || cy === 0) this.set(x + i, y + j, c);
      }
    }
  }

  /** 채운 다각형 (꼭짓점 목록, 픽셀 중심 기준 스캔라인) */
  poly(pts: readonly (readonly [number, number])[], c: RGBA): void {
    const ys = pts.map((p) => p[1]);
    for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) {
      const yc = y + 0.5;
      const xs: number[] = [];
      for (let i = 0; i < pts.length; i++) {
        const [x0, y0] = pts[i]!;
        const [x1, y1] = pts[(i + 1) % pts.length]!;
        if ((y0 <= yc && y1 > yc) || (y1 <= yc && y0 > yc)) xs.push(x0 + ((yc - y0) / (y1 - y0)) * (x1 - x0));
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        for (let x = Math.ceil(xs[k]! - 0.5); x <= Math.floor(xs[k + 1]! - 0.5); x++) this.set(x, y, c);
      }
    }
  }

  /** 체크무늬 디더링 (두 색 사이 부드러운 경계) */
  dither(x: number, y: number, w: number, h: number, c: RGBA, phase = 0): void {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if ((i + j + phase) % 2 === 0) this.set(i, j, c);
  }

  /** 다른 캔버스를 (x,y)에 겹쳐 그린다 (투명 무시) */
  blit(src: Canvas, x: number, y: number): void {
    for (let j = 0; j < src.h; j++) for (let i = 0; i < src.w; i++) {
      const c = src.get(i, j);
      if (c[3] > 0) this.set(x + i, y + j, c);
    }
  }

  /** 칠해진 영역 바깥 테두리에 윤곽선 (4방향 이웃) */
  outline(c: RGBA = PAL.OUT): void {
    const mark: number[] = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.filled(x, y)) continue;
      if (this.filled(x - 1, y) || this.filled(x + 1, y) || this.filled(x, y - 1) || this.filled(x, y + 1)) mark.push(x, y);
    }
    for (let k = 0; k < mark.length; k += 2) this.set(mark[k]!, mark[k + 1]!, c);
  }

  /**
   * 빛 음영: 색이 base인 픽셀 중 위쪽(빛 쪽)이 다른 것과 맞닿으면 밝게, 아래쪽이 맞닿으면 어둡게.
   * depth = 몇 픽셀 안쪽까지 칠할지
   */
  shade(base: RGBA, light: RGBA | null, dark: RGBA | null, depth = 1): void {
    const pts: [number, number, RGBA][] = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (!same(this.get(x, y), base)) continue;
      let up = false, down = false, left = false;
      for (let d = 1; d <= depth; d++) {
        if (!same(this.get(x, y - d), base)) up = true;
        if (!same(this.get(x, y + d), base)) down = true;
        if (d === 1 && !same(this.get(x - 1, y), base)) left = true;
      }
      if (dark && down) pts.push([x, y, dark]);
      else if (light && (up || left)) pts.push([x, y, light]);
    }
    for (const [x, y, c] of pts) this.set(x, y, c);
  }

  /** base 색 픽셀만 다른 색으로 바꾼다 */
  replace(base: RGBA, to: RGBA): void {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (same(this.get(x, y), base)) this.set(x, y, to);
  }

  /** 세로 그라데이션 (램프를 위→아래로 띠처럼, 경계는 디더링) */
  vgrad(x: number, y: number, w: number, h: number, colors: readonly RGBA[]): void {
    const band = h / colors.length;
    for (let j = 0; j < h; j++) {
      const t = j / band;
      const k = Math.min(colors.length - 1, Math.floor(t));
      const frac = t - k;
      for (let i = 0; i < w; i++) {
        const next = colors[Math.min(colors.length - 1, k + 1)]!;
        const useNext = frac > 0.75 && (i + j) % 2 === 0;
        this.set(x + i, y + j, useNext ? next : colors[k]!);
      }
    }
  }
}

/** 결정적 난수 (같은 그림이 매번 똑같이 나오게) */
export function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ───────── 작은 글꼴 (3×5, 영문 대문자·숫자) ─────────

const FONT: Record<string, string> = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111',
  F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', K: '101101110101101',
  L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100',
  R: '110101110101101', S: '011100010001110', T: '111010010010010', U: '101101101101111', V: '101101101101010',
  W: '101101111111101', X: '101101010101101', Y: '101101010010010', '!': '010010010000010', ' ': '000000000000000',
  '0': '111101101101111', '1': '010110010010111', '2': '110001010100111', '3': '110001010001110', '%': '101001010100101',
};

export function text(c: Canvas, s: string, x: number, y: number, col: RGBA): void {
  [...s.toUpperCase()].forEach((ch, k) => {
    const g = FONT[ch] ?? FONT[' ']!;
    for (let j = 0; j < 5; j++) for (let i = 0; i < 3; i++) if (g[j * 3 + i] === '1') c.set(x + k * 4 + i, y + j, col);
  });
}
