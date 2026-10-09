// 임시 그림(placeholder) 생성: src/ui/artManifest.json의 모든 에셋을 "색 블록 + 이름" PNG로 만든다.
//   npm run art:placeholder            → 없는 파일만 만든다 (진짜 그림은 건드리지 않음)
//   npm run art:placeholder -- --force → 전부 다시 만든다
//
// 진짜 그림이 준비되면 같은 파일명으로 덮어쓰기만 하면 된다 (docs/art_spec.md).
// 외부 라이브러리 없이 Node 기본 기능(zlib)으로 PNG를 만든다. 글자는 3×5 픽셀 글꼴(영문 대문자·숫자).

import manifest from '../src/ui/artManifest.json' with { type: 'json' };

declare const process: {
  argv: string[];
  getBuiltinModule(id: 'node:fs'): {
    mkdirSync(path: string, o: { recursive: boolean }): void;
    writeFileSync(path: string, data: Uint8Array): void;
    existsSync(path: string): boolean;
  };
  getBuiltinModule(id: 'node:zlib'): { deflateSync(data: Uint8Array): Uint8Array };
};

const fs = process.getBuiltinModule('node:fs');
const { deflateSync } = process.getBuiltinModule('node:zlib');
/** npm 스크립트는 invest-rpg 폴더에서 실행된다 */
const ROOT = 'assets';

interface AssetDef {
  file: string;
  width: number;
  height: number;
  frames: number;
  kind: string;
  color: string;
  label: string;
  frameNames?: string[];
  screen?: number[];
}

// ───────── PNG 인코더 ─────────

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

function u32(n: number): Uint8Array {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, n >>> 0);
  return b;
}

const ascii = (s: string) => Uint8Array.from([...s].map((c) => c.charCodeAt(0)));

function chunk(type: string, data: Uint8Array): Uint8Array {
  const td = concat([ascii(type), data]);
  return concat([u32(data.length), td, u32(crc32(td))]);
}

class Bitmap {
  readonly w: number;
  readonly h: number;
  readonly px: Uint8Array;
  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.px = new Uint8Array(w * h * 4);
  }
  set(x: number, y: number, [r, g, b, a = 255]: number[]): void {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    this.px.set([r!, g!, b!, a], i);
  }
  rect(x: number, y: number, w: number, h: number, c: number[]): void {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, c);
  }
  frameRect(x: number, y: number, w: number, h: number, c: number[]): void {
    for (let i = x; i < x + w; i++) {
      this.set(i, y, c);
      this.set(i, y + h - 1, c);
    }
    for (let j = y; j < y + h; j++) {
      this.set(x, j, c);
      this.set(x + w - 1, j, c);
    }
  }
  disc(cx: number, cy: number, r: number, c: number[]): void {
    for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (i * i + j * j <= r * r + r * 0.6) this.set(cx + i, cy + j, c);
  }
  png(): Uint8Array {
    const stride = this.w * 4 + 1;
    const raw = new Uint8Array(stride * this.h);
    for (let y = 0; y < this.h; y++) raw.set(this.px.subarray(y * this.w * 4, (y + 1) * this.w * 4), y * stride + 1); // 줄마다 필터 0
    const ihdr = concat([u32(this.w), u32(this.h), Uint8Array.from([8, 6, 0, 0, 0])]); // 8비트 RGBA
    return concat([
      Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk('IHDR', ihdr),
      chunk('IDAT', deflateSync(raw)),
      chunk('IEND', new Uint8Array()),
    ]);
  }
}

// ───────── 3×5 픽셀 글꼴 ─────────

const FONT: Record<string, string> = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111',
  F: '111100110100100', G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010',
  K: '101101110101101', L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010',
  P: '110101110100100', Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
  U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101', Y: '101101010010010',
  Z: '111001010100111', '0': '111101101101111', '1': '010110010010111', '2': '110001010100111', '3': '110001010001110',
  '4': '101101111001001', '5': '111100110001110', '6': '011100111101111', '7': '111001010010010', '8': '111101111101111',
  '9': '111101111001110', _: '000000000000111', '-': '000000111000000', '.': '000000000000010', ' ': '000000000000000',
};

function textWidth(s: string): number {
  return s.length * 4 - 1;
}

function drawText(bmp: Bitmap, s: string, x: number, y: number, c: number[]): void {
  [...s.toUpperCase()].forEach((ch, k) => {
    const g = FONT[ch] ?? FONT[' ']!;
    for (let j = 0; j < 5; j++) for (let i = 0; i < 3; i++) if (g[j * 3 + i] === '1') bmp.set(x + k * 4 + i, y + j, c);
  });
}

function centerText(bmp: Bitmap, s: string, x0: number, w: number, y: number, c: number[]): void {
  if (!s) return;
  drawText(bmp, s, x0 + Math.floor((w - textWidth(s)) / 2), y, c);
}

// ───────── 색 ─────────

function hex(h: string): number[] {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
}
const shade = (c: number[], f: number) => [...c.slice(0, 3).map((v) => Math.max(0, Math.min(255, Math.round(v! * f)))), 255];
const INK = [222, 216, 205, 255];
const DARK = [20, 20, 22, 255];

/** 결정적 난수 (노이즈 프레임용) */
function lcg(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32);
}

// ───────── 종류별 그리기 ─────────

function paintFrame(bmp: Bitmap, a: AssetDef, f: number): void {
  const x0 = f * a.width;
  const { width: w, height: h } = a;
  const base = hex(a.color);
  const name = a.frameNames?.[f] ?? (a.frames > 1 ? String(f) : '');
  switch (a.kind) {
    case 'background': {
      // 위쪽 벽, 아래쪽 바닥. 위 40·아래 40은 잘릴 수 있는 여백(기기 비율), 안전 영역 표시선
      bmp.rect(x0, 0, w, h, base);
      bmp.rect(x0, Math.floor(h * 0.62), w, h - Math.floor(h * 0.62), shade(base, 0.75));
      for (let y = 0; y < h; y += 8) bmp.set(x0 + 2, y, shade(base, 1.4));
      bmp.rect(x0, 40, w, 1, shade(base, 1.5));
      bmp.rect(x0, h - 40, w, 1, shade(base, 1.5));
      bmp.rect(x0, 60, w, 1, shade(base, 1.25)); // 상단 UI 안전 영역 끝 (40 + 20)
      bmp.rect(x0, h - 72, w, 1, shade(base, 1.25)); // 탭 바 안전 영역 시작 (40 + 32)
      // 이름은 위쪽 안전 영역 바로 아래 (가운데의 LP·강아지·인형 자리와 겹치지 않게)
      centerText(bmp, a.label, x0, w, 64, INK);
      centerText(bmp, 'PLACEHOLDER', x0, w, 72, shade(INK, 0.7));
      break;
    }
    case 'lp': {
      bmp.rect(x0 + 2, 10, w - 4, h - 12, base);
      bmp.frameRect(x0 + 2, 10, w - 4, h - 12, shade(base, 0.6));
      const cx = x0 + 22;
      const cy = 26;
      bmp.disc(cx, cy, 13, DARK);
      bmp.disc(cx, cy, 4, [150, 70, 60, 255]);
      // 회전 표시: 프레임마다 다른 각도의 홈
      const ang = (f / a.frames) * Math.PI * 2;
      for (let r = 5; r <= 12; r++) bmp.set(cx + Math.round(Math.cos(ang) * r), cy + Math.round(Math.sin(ang) * r), [110, 110, 110, 255]);
      bmp.rect(x0 + 40, 14, 3, 20, shade(base, 1.4)); // 톤암
      drawText(bmp, 'LP', x0 + 42, 36, INK);
      break;
    }
    case 'dog': {
      const bob = name === 'idle1' ? 1 : 0;
      bmp.rect(x0 + 10, 20 + bob, 34, 18, base); // 몸
      bmp.rect(x0 + 34, 10 + bob, 16, 14, base); // 머리
      bmp.rect(x0 + 36, (name === 'ear' ? 5 : 8) + bob, 4, name === 'ear' ? 6 : 4, shade(base, 0.7)); // 귀
      bmp.set(x0 + 45, 15 + bob, DARK);
      const tail = name === 'tail0' ? -3 : name === 'tail1' ? 3 : 0;
      bmp.rect(x0 + 5, 18 + tail + bob, 6, 3, shade(base, 0.85)); // 꼬리
      for (const lx of [12, 20, 32, 40]) bmp.rect(x0 + lx, 38 + bob, 4, 7, shade(base, 0.8));
      if (name === 'pet') bmp.rect(x0 + 36, 6, 10, 3, [200, 180, 140, 255]);
      centerText(bmp, a.label, x0, w, 1, INK);
      centerText(bmp, name.toUpperCase(), x0, w, 26 + bob, DARK);
      break;
    }
    case 'heart': {
      const c = base;
      bmp.disc(x0 + 3, 4, 3, c);
      bmp.disc(x0 + 8, 4, 3, c);
      for (let j = 0; j < 6; j++) bmp.rect(x0 + 1 + j, 6 + j, 10 - 2 * j, 1, c);
      break;
    }
    case 'doll': {
      const done = name === 'done';
      bmp.rect(x0 + 8, 4, 24, 20, base); // 머리
      bmp.rect(x0 + 12, 24, 16, 20, shade(base, 0.85)); // 몸
      bmp.frameRect(x0 + 8, 4, 24, 20, shade(base, 0.6));
      const eyes = f >= 3 ? 2 : f;
      if (eyes >= 1) bmp.rect(x0 + 13, 11, 4, 4, DARK);
      if (eyes >= 2) bmp.rect(x0 + 23, 11, 4, 4, DARK);
      if (done) bmp.rect(x0 + 16, 18, 8, 1, DARK);
      centerText(bmp, done ? 'DONE' : `EYE ${eyes}`, x0, w, 34, INK);
      break;
    }
    case 'eye': {
      bmp.disc(x0 + 2, 2, 2, [235, 235, 230, 255]);
      bmp.rect(x0 + 2, 2, 2, 2, DARK);
      break;
    }
    case 'tv': {
      bmp.rect(x0, 0, w, h, base);
      bmp.frameRect(x0, 0, w, h, shade(base, 0.6));
      const [sx, sy, sw, sh] = a.screen ?? [10, 10, w - 20, h - 20];
      bmp.rect(x0 + sx!, sy!, sw!, sh!, [16, 18, 20, 255]);
      centerText(bmp, a.label, x0, w, h - 9, INK);
      break;
    }
    case 'noise': {
      const r = lcg(1234 + f * 97);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const v = 40 + Math.floor(r() * 120);
          bmp.set(x0 + x, y, [v, v, v + 4, 255]);
        }
      }
      // 지지직 가로줄
      const band = Math.floor(r() * (h - 6));
      bmp.rect(x0, band, w, 3, [190, 190, 195, 255]);
      break;
    }
    case 'coin': {
      bmp.disc(x0 + 6, 6, 5, shade(base, 0.7));
      bmp.disc(x0 + 6, 6, 4, base);
      bmp.rect(x0 + 5, 3, 2, 6, shade(base, 1.3)); // 단순한 세로 줄 무늬 (₿ 기호 아님)
      break;
    }
    case 'star': {
      const c = base;
      bmp.rect(x0 + 4, 0, 1, 3, c);
      bmp.rect(x0 + 0, 3, 9, 2, c);
      bmp.rect(x0 + 2, 5, 5, 2, c);
      bmp.rect(x0 + 1, 7, 2, 2, c);
      bmp.rect(x0 + 6, 7, 2, 2, c);
      break;
    }
    case 'gear': {
      bmp.disc(x0 + 6, 6, 5, base);
      bmp.disc(x0 + 6, 6, 2, [0, 0, 0, 0]);
      for (const [dx, dy] of [[0, -6], [0, 5], [-6, 0], [5, 0]]) bmp.rect(x0 + 5 + dx!, 5 + dy!, 2, 2, base);
      break;
    }
    default: {
      // block: 색 블록 + 글자 (프레임 2개면 두 번째는 어둡게: 깜빡임용)
      const c = f % 2 === 1 && a.kind === 'block' && a.frames === 2 ? shade(base, 0.6) : base;
      bmp.rect(x0, 0, w, h, c);
      bmp.frameRect(x0, 0, w, h, shade(base, 0.55));
      const label = a.frames > 2 ? `${a.label}${f}` : a.label;
      centerText(bmp, label, x0, w, Math.floor((h - 5) / 2), INK);
    }
  }
}

function build(a: AssetDef): Uint8Array {
  const bmp = new Bitmap(a.width * a.frames, a.height);
  for (let f = 0; f < a.frames; f++) paintFrame(bmp, a, f);
  return bmp.png();
}

const force = process.argv.includes('--force');
let made = 0;
let kept = 0;
for (const [key, a] of Object.entries(manifest.assets as Record<string, AssetDef>)) {
  const out = `${ROOT}/${a.file}`;
  if (fs.existsSync(out) && !force) {
    kept++;
    continue;
  }
  fs.mkdirSync(out.slice(0, out.lastIndexOf('/')), { recursive: true });
  fs.writeFileSync(out, build(a));
  made++;
  if (process.argv.includes('--verbose')) console.log(`  ${key} → assets/${a.file}`);
}
console.log(`임시 그림: 새로 만듦 ${made}개, 이미 있어서 건너뜀 ${kept}개 (assets/art/)`);
