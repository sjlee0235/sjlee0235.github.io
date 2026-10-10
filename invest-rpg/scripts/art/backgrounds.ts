// 배경 (180×400). 가운데 180×320(y 40~360)이 기본으로 보이는 영역, 위 40~60·아래 328~360은 UI가 덮는다.
// 화면 무대 좌표(stage)는 배경 좌표에서 y를 40 뺀 값이다 (예: 강아지 stage y 222 = 배경 y 262).
//
// 놓이는 자리 (art_spec 4장, 화면 코드와 맞춰 둠)
// - 거실: LP 플레이어 x14~70·y190~234 (서랍장 위), 강아지 x106~162·y262~310 (러그 위)
// - 작업실: 인형 x70~110·y180~228 (작업대 위 커팅 매트)
// - TV방: TV 받침대 윗면 y252 (TV 바닥이 여기에 닿음)

import { Canvas, hex, PAL, rng, type RGBA, type Ramp } from './canvas.ts';

const W = 180;
const H = 400;

// ───────── 공통 부품 ─────────

function planks(c: Canvas, y0: number, y1: number, r: Ramp, rowH: number, seed: number): void {
  const R = rng(seed);
  for (let y = y0, row = 0; y < y1; y += rowH, row++) {
    c.rect(0, y, W, rowH, r[2]!);
    c.hline(0, W, y, r[3]!); // 위 모서리 빛
    c.hline(0, W, y + rowH - 1, r[1]!); // 이음매
    let x = (row * 37) % 60 - 60;
    while (x < W) {
      const len = 40 + Math.floor(R() * 40);
      x += len;
      c.vline(x, y + 1, y + rowH - 2, r[1]!);
      c.vline(x + 1, y + 1, y + rowH - 2, r[3]!);
      // 나뭇결 몇 점
      for (let k = 0; k < 3; k++) c.hline(x + 6 + Math.floor(R() * 20), x + 10 + Math.floor(R() * 24), y + 2 + Math.floor(R() * (rowH - 4)), r[1]!);
    }
  }
}

export function herringbone(c: Canvas, y0: number, y1: number, r: Ramp): void {
  for (let y = y0; y < y1; y++) for (let x = 0; x < W; x++) {
    const u = Math.floor((x + y) / 6);
    const v = Math.floor((x - y + 400) / 6);
    const k = (u + v) % 2 === 0 ? ((x + y) % 6 === 0 ? 1 : 2) : (x - y + 400) % 6 === 0 ? 1 : 3;
    c.set(x, y, r[k]!);
  }
}

function stripeWall(c: Canvas, y0: number, y1: number, base: RGBA, stripe: RGBA, dot: RGBA | null): void {
  c.rect(0, y0, W, y1 - y0, base);
  for (let x = 3; x < W; x += 12) {
    c.vline(x, y0, y1, stripe);
    c.vline(x + 1, y0, y1, stripe);
  }
  if (dot) for (let y = y0 + 6; y < y1; y += 14) for (let x = 9; x < W; x += 12) {
    c.set(x, y, dot); c.set(x - 1, y + 1, dot); c.set(x + 1, y + 1, dot); c.set(x, y + 2, dot);
  }
}

function plainWall(c: Canvas, y0: number, y1: number, r: Ramp, seed: number): void {
  c.rect(0, y0, W, y1 - y0, r[2]!);
  const R = rng(seed);
  for (let k = 0; k < 260; k++) c.set(Math.floor(R() * W), y0 + Math.floor(R() * (y1 - y0)), R() < 0.5 ? r[1]! : r[3]!);
}

function window_(c: Canvas, x: number, y: number, w: number, h: number, sky: Ramp, frame: Ramp, opts: { evening?: boolean; blinds?: boolean } = {}): void {
  const s = new Canvas(w, h);
  s.rect(0, 0, w, h, frame[3]!);
  s.shade(frame[3]!, frame[4]!, frame[1]!, 1);
  s.outline();
  c.blit(s, x, y);
  // 하늘
  const gx = x + 4, gy = y + 4, gw = w - 8, gh = h - 8;
  c.vgrad(gx, gy, gw, gh, opts.evening ? [hex('#7a6ab4'), hex('#c87a9a'), hex('#f0a87a'), hex('#f6d29a')] : [sky[1]!, sky[2]!, sky[3]!, sky[4]!]);
  // 구름 / 저녁 해
  if (opts.evening) {
    c.ellipse(gx + gw - 14, gy + gh - 12, 7, 7, hex('#ffe8a8'));
  } else {
    for (const [cx, cy] of [[gx + 10, gy + 12], [gx + gw - 16, gy + 24]]) {
      c.ellipse(cx!, cy!, 7, 3, PAL.white);
      c.ellipse(cx! + 5, cy! - 2, 5, 3, PAL.white);
      c.hline(cx! - 6, cx! + 8, cy! + 2, sky[3]!);
    }
  }
  // 먼 건물 실루엣
  const R = rng(x + y);
  for (let bx = gx; bx < gx + gw;) {
    const bw = 6 + Math.floor(R() * 8);
    const bh = 6 + Math.floor(R() * 14);
    c.rect(bx, gy + gh - bh, Math.min(bw, gx + gw - bx), bh, opts.evening ? hex('#6a5a8a') : sky[0]!);
    bx += bw + 1;
  }
  if (opts.blinds) for (let yy = gy; yy < gy + gh * 0.45; yy += 3) c.hline(gx, gx + gw - 1, yy, frame[4]!);
  // 창살
  c.rect(gx + Math.floor(gw / 2) - 1, gy, 3, gh, frame[3]!);
  c.rect(gx, gy + Math.floor(gh / 2) - 1, gw, 3, frame[3]!);
  c.hline(gx, gx + gw - 1, gy + Math.floor(gh / 2) - 1, frame[4]!);
  // 창턱
  c.rect(x - 3, y + h - 1, w + 6, 4, frame[3]!);
  c.hline(x - 3, x + w + 2, y + h - 1, frame[4]!);
  c.hline(x - 4, x + w + 3, y + h + 3, PAL.OUT);
}

function curtains(c: Canvas, x: number, y: number, w: number, h: number, r: Ramp, rod: RGBA): void {
  c.rect(x - 8, y - 6, w + 16, 3, rod);
  c.hline(x - 8, x + w + 7, y - 4, PAL.OUT);
  for (const side of [0, 1]) {
    const cx = side === 0 ? x - 8 : x + w - 10;
    const cw = 18;
    const s = new Canvas(cw, h + 10);
    for (let yy = 0; yy < h + 10; yy++) {
      const pinch = yy > h * 0.55 ? Math.round((yy - h * 0.55) * 0.18) : 0;
      const x0 = side === 0 ? 0 : pinch;
      const x1 = side === 0 ? cw - pinch : cw;
      for (let xx = x0; xx < x1; xx++) s.set(xx, yy, (xx + (side ? 1 : 0)) % 5 < 2 ? r[1]! : (xx % 5 === 2 ? r[3]! : r[2]!));
    }
    s.outline();
    c.blit(s, cx - 1, y - 4);
    // 커튼 끈
    c.rect(cx + 2, y + Math.round(h * 0.6), cw - 4, 2, PAL.gold[3]!);
  }
}

function frameArt(c: Canvas, x: number, y: number, w: number, h: number, frameCol: Ramp, kind: 'landscape' | 'abstract'): void {
  const s = new Canvas(w, h);
  s.rect(0, 0, w, h, frameCol[2]!);
  s.shade(frameCol[2]!, frameCol[4]!, frameCol[1]!, 1);
  s.outline();
  c.blit(s, x, y);
  const ix = x + 3, iy = y + 3, iw = w - 6, ih = h - 6;
  if (kind === 'landscape') {
    const pic = new Canvas(iw, ih);
    pic.vgrad(0, 0, iw, ih, [PAL.sky[2]!, PAL.sky[3]!]);
    pic.ellipse(iw * 0.3, ih, iw * 0.45, ih * 0.5, PAL.green[3]!);
    pic.ellipse(iw * 0.8, ih, iw * 0.4, ih * 0.38, PAL.green[2]!);
    pic.ellipse(iw - 6, 5, 2.5, 2.5, PAL.gold[4]!);
    c.blit(pic, ix, iy);
  } else {
    c.rect(ix, iy, iw, ih, PAL.cream[4]!);
    c.ellipse(ix + iw * 0.35, iy + ih * 0.45, iw * 0.22, iw * 0.22, PAL.mustard[3]!);
    c.rect(ix + Math.floor(iw * 0.5), iy + 4, Math.floor(iw * 0.32), ih - 8, PAL.teal[3]!);
    c.hline(ix + 2, ix + iw - 3, iy + ih - 5, PAL.red[2]!);
  }
}

function plant(c: Canvas, x: number, y: number, big: boolean, pot: Ramp): void {
  const s = new Canvas(big ? 34 : 22, big ? 60 : 34);
  const g = PAL.green;
  const R = rng(x * 7 + y);
  const cx = s.w / 2;
  const leaves = big ? 9 : 5;
  for (let k = 0; k < leaves; k++) {
    const a = -Math.PI / 2 + (k - (leaves - 1) / 2) * 0.42;
    const len = (big ? 22 : 12) + R() * 6;
    const lx = cx + Math.cos(a) * len * 0.7;
    const ly = (big ? 36 : 20) + Math.sin(a) * len;
    s.line(cx, big ? 40 : 22, lx, ly, g[1]!);
    s.ellipse(lx, ly, big ? 6 : 4, big ? 4 : 2.6, k % 2 ? g[3]! : g[2]!);
  }
  s.shade(g[2]!, g[4]!, g[1]!, 1);
  s.shade(g[3]!, g[4]!, g[1]!, 1);
  const py = big ? 40 : 22;
  s.poly([[cx - (big ? 10 : 7), py], [cx + (big ? 10 : 7), py], [cx + (big ? 8 : 5), s.h - 1], [cx - (big ? 8 : 5), s.h - 1]], pot[2]!);
  s.rect(Math.round(cx - (big ? 11 : 8)), py - 1, big ? 22 : 16, 3, pot[3]!);
  s.shade(pot[2]!, pot[3]!, pot[1]!, 1);
  s.outline();
  c.blit(s, x, y);
}

/** 소파 (뒤판 + 방석 + 팔걸이) */
function sofa(c: Canvas, x: number, y: number, w: number, h: number, r: Ramp, cushions: RGBA[]): void {
  const s = new Canvas(w, h);
  s.roundRect(4, 0, w - 8, h * 0.55, 4, r[2]!); // 등받이
  s.rect(4, h * 0.45, w - 8, h * 0.35, r[3]!); // 앉는 면
  s.roundRect(0, h * 0.3, 9, h * 0.55, 3, r[1]!); // 팔걸이
  s.roundRect(w - 9, h * 0.3, 9, h * 0.55, 3, r[1]!);
  s.rect(4, h * 0.78, w - 8, h * 0.1, r[1]!);
  s.shade(r[2]!, r[3]!, r[1]!, 1);
  s.shade(r[3]!, r[4]!, r[2]!, 1);
  s.shade(r[1]!, r[2]!, r[0]!, 1);
  // 방석 이음매
  for (let k = 1; k < 3; k++) s.vline(Math.round(4 + ((w - 8) * k) / 3), h * 0.47, h * 0.77, r[1]!);
  // 다리
  for (const lx of [6, w - 9]) s.rect(lx, h * 0.88, 3, h * 0.12, PAL.wood[1]!);
  s.outline();
  c.blit(s, x, y);
  // 쿠션
  cushions.forEach((col, k) => {
    const q = new Canvas(16, 14);
    q.roundRect(1, 1, 14, 12, 4, col);
    q.shade(col, lighten(col), darken(col), 1);
    q.outline();
    c.blit(q, x + 12 + k * 18, y + Math.round(h * 0.18));
  });
}

function lighten(c: RGBA): RGBA {
  return [Math.min(255, c[0] + 34), Math.min(255, c[1] + 30), Math.min(255, c[2] + 26), 255];
}
function darken(c: RGBA): RGBA {
  return [Math.max(0, c[0] - 40), Math.max(0, c[1] - 40), Math.max(0, c[2] - 34), 255];
}

/** 낮은 서랍장 (LP 받침) */
function cabinet(c: Canvas, x: number, y: number, w: number, h: number, r: Ramp, knob: RGBA): void {
  const s = new Canvas(w, h);
  s.rect(0, 0, w, 6, r[4]!); // 윗판
  s.rect(2, 6, w - 4, h - 12, r[2]!);
  s.shade(r[2]!, r[3]!, r[1]!, 1);
  // 서랍 2칸
  for (let k = 0; k < 2; k++) {
    const dy = 9 + k * Math.floor((h - 18) / 2);
    s.rect(5, dy, w - 10, Math.floor((h - 18) / 2) - 3, r[3]!);
    s.hline(5, w - 6, dy, r[4]!);
    s.hline(5, w - 6, dy + Math.floor((h - 18) / 2) - 4, r[1]!);
    s.rect(Math.floor(w / 2) - 3, dy + Math.floor((h - 18) / 4) - 1, 6, 2, knob);
  }
  for (const lx of [3, w - 6]) s.rect(lx, h - 6, 3, 6, r[1]!);
  s.outline();
  c.blit(s, x, y);
  c.hline(x + 2, x + w - 3, y + 1, lighten(r[4]!));
}

function rug(c: Canvas, cx: number, cy: number, rx: number, ry: number, a: Ramp, b: RGBA): void {
  const s = new Canvas(Math.ceil(rx * 2) + 4, Math.ceil(ry * 2) + 4);
  const ox = s.w / 2, oy = s.h / 2;
  s.ellipse(ox, oy, rx, ry, a[2]!);
  s.ellipse(ox, oy, rx - 4, ry - 2.5, b);
  s.ellipse(ox, oy, rx - 7, ry - 4.5, a[3]!);
  for (let k = 0; k < 12; k++) {
    const t = (k / 12) * Math.PI * 2;
    s.set(ox + Math.cos(t) * (rx - 2), oy + Math.sin(t) * (ry - 1.2), a[4]!);
  }
  s.outline(darken(a[1]!));
  c.blit(s, Math.round(cx - ox), Math.round(cy - oy));
}

function floorLamp(c: Canvas, x: number, y: number, h: number, shade: Ramp, pole: RGBA, glow: boolean): void {
  if (glow) c.poly([[x + 2, y + 14], [x + 12, y + 14], [x + 30, y + h], [x - 16, y + h]], [255, 236, 170, 34]);
  const s = new Canvas(14, h);
  s.poly([[3, 0], [11, 0], [14, 14], [0, 14]], shade[3]!);
  s.shade(shade[3]!, shade[4]!, shade[2]!, 1);
  s.rect(6, 14, 2, h - 18, pole);
  s.rect(2, h - 4, 10, 4, pole);
  s.outline();
  c.blit(s, x, y);
}

function baseboard(c: Canvas, y: number, r: Ramp): void {
  c.rect(0, y, W, 6, r[3]!);
  c.hline(0, W, y, r[4]!);
  c.hline(0, W, y + 5, r[1]!);
  c.hline(0, W, y + 6, PAL.OUT);
}

function ceiling(c: Canvas, r: Ramp): void {
  c.rect(0, 0, W, 64, r[3]!);
  // 천장 몰딩 (키 큰 화면에서만 보이는 위쪽 여백도 심심하지 않게)
  c.rect(0, 52, W, 6, r[2]!);
  for (let x = 0; x < W; x += 6) c.rect(x, 54, 3, 2, r[4]!);
  c.rect(0, 58, W, 4, r[4]!);
  c.hline(0, W, 62, r[1]!);
  // 천장 등
  const lamp = new Canvas(30, 24);
  lamp.vline(15, 0, 9, PAL.grey[1]!);
  lamp.poly([[6, 10], [24, 10], [28, 20], [2, 20]], PAL.cream[3]!);
  lamp.shade(PAL.cream[3]!, PAL.cream[4]!, PAL.cream[1]!, 1);
  lamp.outline();
  lamp.ellipse(15, 21, 4, 2, PAL.gold[4]!);
  c.ellipse(W / 2, 30, 30, 10, [255, 240, 190, 50]);
  c.blit(lamp, W / 2 - 15, 8);
}

function floorShadow(c: Canvas, x: number, y: number, w: number): void {
  c.ellipse(x + w / 2, y, w / 2, 3, [40, 24, 30, 70]);
}

// ───────── 거실 ─────────

export function livingRoom(era: '2000s' | '2010s' | '2020s'): Canvas {
  const c = new Canvas(W, H);
  const floorY = 272;
  if (era === '2000s') {
    ceiling(c, PAL.cream);
    stripeWall(c, 62, floorY, PAL.cream[3]!, PAL.cream[2]!, PAL.red[3]!);
    // 아래쪽 나무 벽판
    c.rect(0, 222, W, floorY - 222, PAL.wood[3]!);
    c.hline(0, W, 222, PAL.wood[4]!);
    c.hline(0, W, 224, PAL.wood[2]!);
    for (let x = 10; x < W; x += 24) c.rect(x, 230, 16, 32, PAL.wood[2]!), c.hline(x, x + 15, 230, PAL.wood[1]!), c.vline(x, 230, 261, PAL.wood[1]!);
    baseboard(c, floorY - 6, PAL.wood);
    planks(c, floorY, H, PAL.wood, 10, 3);
    window_(c, 100, 84, 64, 84, PAL.sky, PAL.cream);
    curtains(c, 100, 84, 64, 80, PAL.green, PAL.gold[2]!);
    frameArt(c, 14, 96, 44, 34, PAL.gold, 'landscape');
    // 벽시계
    c.ellipse(78, 92, 9, 9, PAL.wood[2]!); c.ellipse(78, 92, 7, 7, PAL.cream[4]!);
    c.line(78, 92, 78, 87, PAL.OUT); c.line(78, 92, 81, 93, PAL.OUT);
    floorLamp(c, 80, 168, 104, PAL.cream, PAL.wood[1]!, true);
    sofa(c, 92, 226, 86, 70, PAL.red, [PAL.mustard[3]!, PAL.cream[3]!, PAL.mustard[3]!]);
    floorShadow(c, 6, 294, 72);
    cabinet(c, 6, 232, 72, 62, PAL.wood, PAL.gold[3]!);
    rug(c, 132, 312, 50, 13, PAL.red, PAL.cream[3]!);
  } else if (era === '2010s') {
    ceiling(c, PAL.grey);
    plainWall(c, 62, floorY, [hex('#b8c4d0'), hex('#c8d2dc'), hex('#d8e0e8'), hex('#e6ecf2'), hex('#f2f6fa')], 11);
    baseboard(c, floorY - 6, PAL.cream);
    planks(c, floorY, H, PAL.oak, 9, 7);
    window_(c, 96, 78, 72, 92, PAL.sky, PAL.grey);
    curtains(c, 96, 78, 72, 88, [hex('#c8ccd8'), hex('#dfe2ea'), hex('#eef0f5'), hex('#ffffff'), hex('#ffffff')], PAL.grey[1]!);
    // 벽 선반 + 작은 화분·책
    c.rect(12, 128, 52, 4, PAL.oak[3]!); c.hline(12, 63, 128, PAL.oak[4]!); c.hline(12, 63, 132, PAL.OUT);
    plant(c, 14, 96, false, PAL.grey);
    for (const [bx, col] of [[40, PAL.teal[2]!], [45, PAL.mustard[3]!], [50, PAL.red[2]!], [55, PAL.blue[3]!]] as const) c.rect(bx, 112, 4, 16, col), c.vline(bx, 112, 127, PAL.OUT);
    frameArt(c, 20, 150, 34, 26, PAL.grey, 'abstract');
    floorLamp(c, 80, 176, 96, PAL.grey, PAL.grey[1]!, false);
    sofa(c, 92, 226, 86, 70, PAL.grey, [PAL.mustard[3]!, PAL.teal[3]!, PAL.cream[4]!]);
    floorShadow(c, 6, 294, 72);
    cabinet(c, 6, 232, 72, 62, PAL.oak, PAL.grey[1]!);
    rug(c, 132, 312, 50, 13, PAL.grey, PAL.cream[4]!);
  } else {
    ceiling(c, PAL.sage);
    plainWall(c, 62, floorY, PAL.sage, 23);
    // 따뜻한 간접 조명 띠
    c.rect(0, 62, W, 6, [255, 230, 170, 60]);
    baseboard(c, floorY - 6, PAL.walnut);
    planks(c, floorY, H, PAL.walnut, 7, 17);
    window_(c, 98, 80, 70, 88, PAL.sky, PAL.walnut, { evening: true, blinds: true });
    frameArt(c, 16, 92, 40, 46, PAL.walnut, 'abstract');
    plant(c, 146, 210, true, PAL.cream);
    floorLamp(c, 80, 168, 104, PAL.mustard, PAL.walnut[0]!, true);
    sofa(c, 86, 226, 80, 70, PAL.mustard, [PAL.sage[3]!, PAL.cream[4]!, PAL.teal[3]!].slice(0, 3));
    floorShadow(c, 6, 294, 72);
    cabinet(c, 6, 232, 72, 62, PAL.walnut, PAL.gold[3]!);
    rug(c, 130, 312, 50, 13, PAL.teal, PAL.cream[3]!);
  }
  return c;
}

// ───────── 작업실 ─────────

function spools(c: Canvas, x0: number, y: number, cols: RGBA[]): void {
  cols.forEach((col, k) => {
    const x = x0 + k * 10;
    c.rect(x, y, 7, 2, PAL.wood[3]!);
    c.rect(x + 1, y + 2, 5, 7, col);
    c.vline(x + 1, y + 2, y + 8, lighten(col));
    c.rect(x, y + 9, 7, 2, PAL.wood[3]!);
    c.rect(x - 1, y - 1, 9, 1, PAL.OUT); c.rect(x - 1, y + 11, 9, 1, PAL.OUT);
    c.vline(x - 1, y, y + 10, PAL.OUT); c.vline(x + 7, y, y + 10, PAL.OUT);
    c.set(x + 3, y - 3, PAL.grey[2]!); c.set(x + 3, y - 2, PAL.grey[2]!); // 못
  });
}

function sewingMachine(c: Canvas, x: number, y: number, body: Ramp): void {
  const s = new Canvas(40, 40);
  s.rect(2, 30, 36, 8, body[2]!); // 받침
  s.rect(4, 8, 8, 24, body[2]!); // 몸통
  s.rect(4, 6, 32, 9, body[2]!); // 팔
  s.rect(28, 14, 6, 8, body[2]!); // 머리
  s.shade(body[2]!, body[3]!, body[1]!, 1);
  s.ellipse(8, 20, 3, 3, PAL.grey[3]!); // 바퀴
  s.outline();
  s.vline(31, 22, 30, PAL.grey[1]!); // 바늘
  s.hline(14, 26, 10, PAL.gold[3]!); // 장식선
  s.rect(16, 32, 12, 3, PAL.grey[4]!);
  c.blit(s, x, y);
}

function eyeJar(c: Canvas, x: number, y: number): void {
  const s = new Canvas(22, 30);
  s.rect(3, 0, 16, 4, PAL.red[2]!); // 뚜껑
  s.roundRect(1, 4, 20, 25, 4, [196, 226, 240, 255]);
  s.outline();
  const R = rng(5);
  for (let k = 0; k < 14; k++) {
    const ex = 4 + Math.floor(R() * 13), ey = 12 + Math.floor(R() * 14);
    s.rect(ex, ey, 2, 2, hex('#2a2230'));
    s.set(ex, ey, PAL.white);
  }
  s.vline(4, 7, 24, PAL.white); // 유리 반사
  s.vline(5, 7, 12, PAL.white);
  c.blit(s, x, y);
}

function deskLamp(c: Canvas, x: number, y: number, col: Ramp, glow: boolean): void {
  if (glow) c.poly([[x - 18, y + 12], [x + 4, y + 12], [x - 20, y + 74], [x - 64, y + 74]], [255, 236, 170, 56]);
  const s = new Canvas(40, 70);
  s.rect(26, 64, 12, 5, col[2]!); // 받침
  s.line(31, 64, 34, 34, col[1]!); s.line(32, 64, 35, 34, col[1]!);
  s.line(34, 34, 20, 14, col[1]!); s.line(35, 34, 21, 14, col[1]!);
  s.poly([[12, 8], [24, 12], [20, 22], [6, 18]], col[3]!); // 갓
  s.shade(col[3]!, col[4]!, col[2]!, 1);
  s.outline();
  s.ellipse(12, 19, 2, 1.5, PAL.gold[5]!);
  c.blit(s, x - 22, y - 2);
}

function shelfDolls(c: Canvas, y: number, r: Ramp): void {
  c.rect(8, y, 164, 4, r[3]!);
  c.hline(8, 171, y, r[4]!);
  c.hline(7, 172, y + 4, PAL.OUT);
  c.rect(12, y + 4, 3, 6, r[1]!); c.rect(165, y + 4, 3, 6, r[1]!);
  // 완성된 작은 인형들
  const cols = [hex('#d99868'), hex('#f2c0c8'), hex('#c8d4e8'), hex('#e8d090'), hex('#d99868')];
  cols.forEach((col, k) => {
    const s = new Canvas(14, 16);
    s.ellipse(3, 3, 2, 2, col); s.ellipse(11, 3, 2, 2, col);
    s.ellipse(7, 7, 5, 4.5, col);
    s.roundRect(3, 10, 8, 6, 2, col);
    s.shade(col, lighten(col), darken(col), 1);
    s.outline();
    s.set(5, 6, PAL.OUT); s.set(9, 6, PAL.OUT);
    c.blit(s, 20 + k * 22, y - 16);
  });
  // 원단 두루마리
  for (const [x, col] of [[134, PAL.red[2]!], [146, PAL.teal[3]!], [158, PAL.mustard[3]!]] as const) {
    c.rect(x, y - 14, 10, 14, col);
    c.ellipse(x + 5, y - 14, 5, 2, lighten(col));
    c.vline(x - 1, y - 14, y - 1, PAL.OUT); c.vline(x + 10, y - 14, y - 1, PAL.OUT);
  }
}

export function workshop(era: '2000s' | '2010s' | '2020s'): Canvas {
  const c = new Canvas(W, H);
  const deskTop = 212;
  if (era === '2000s') {
    ceiling(c, PAL.oak);
    // 세로 나무 벽판
    c.rect(0, 62, W, 240, PAL.oak[3]!);
    for (let x = 0; x < W; x += 15) { c.vline(x, 62, 300, PAL.oak[1]!); c.vline(x + 1, 62, 300, PAL.oak[4]!); }
  } else if (era === '2010s') {
    ceiling(c, PAL.grey);
    // 하얀 벽돌
    c.rect(0, 62, W, 240, hex('#ece6dc'));
    for (let y = 62, row = 0; y < 302; y += 8, row++) {
      c.hline(0, W, y, hex('#d2cabc'));
      for (let x = row % 2 ? 0 : 12; x < W; x += 24) c.vline(x, y, y + 7, hex('#d2cabc'));
    }
  } else {
    ceiling(c, PAL.sage);
    plainWall(c, 62, 302, PAL.sage, 41);
    c.rect(0, 62, W, 6, [255, 230, 170, 60]);
  }
  // 타공판 + 실패·가위·자
  const pb = era === '2010s' ? PAL.cream : era === '2020s' ? PAL.oak : PAL.wood;
  const p = new Canvas(150, 64);
  p.rect(0, 0, 150, 64, pb[3]!);
  p.shade(pb[3]!, pb[4]!, pb[2]!, 1);
  p.outline();
  for (let y = 6; y < 60; y += 7) for (let x = 6; x < 146; x += 7) p.set(x, y, pb[1]!);
  c.blit(p, 15, 74);
  spools(c, 24, 86, [PAL.red[2]!, PAL.blue[3]!, PAL.gold[3]!, PAL.green[3]!, PAL.pink[2]!, PAL.purple[3]!]);
  // 가위
  c.ellipse(100, 92, 4, 4, PAL.red[2]!); c.ellipse(110, 92, 4, 4, PAL.red[2]!);
  c.ellipse(100, 92, 2, 2, pb[3]!); c.ellipse(110, 92, 2, 2, pb[3]!);
  c.line(102, 95, 108, 112, PAL.grey[4]!); c.line(108, 95, 102, 112, PAL.grey[3]!);
  // 자와 줄자
  c.rect(122, 82, 5, 40, PAL.mustard[3]!); for (let y = 84; y < 120; y += 3) c.hline(122, 123, y, PAL.mustard[1]!);
  c.ellipse(144, 98, 8, 8, PAL.teal[3]!); c.ellipse(144, 98, 3, 3, PAL.cream[4]!);
  c.line(146, 105, 156, 128, PAL.mustard[4]!);
  // 실타래 바구니 줄
  c.rect(24, 112, 60, 18, PAL.wood[2]!);
  for (let x = 26; x < 84; x += 4) c.vline(x, 113, 129, PAL.wood[3]!);
  for (const [bx, col] of [[30, PAL.pink[2]!], [44, PAL.sky[2]!], [58, PAL.green[3]!], [70, PAL.mustard[3]!]] as const) c.ellipse(bx, 112, 6, 5, col);
  shelfDolls(c, 160, PAL.wood);
  // 바닥 (작업대 아래로 보임)
  planks(c, 300, H, era === '2020s' ? PAL.walnut : PAL.oak, 10, 9);
  // 작업대
  const d = era === '2020s' ? PAL.walnut : PAL.oak;
  c.rect(0, deskTop, W, 50, d[3]!);
  c.hline(0, W, deskTop, d[4]!);
  for (let y = deskTop + 8; y < deskTop + 50; y += 10) c.hline(0, W, y, d[2]!);
  c.rect(0, deskTop + 50, W, 12, d[1]!);
  c.hline(0, W, deskTop + 50, d[2]!);
  c.hline(0, W, deskTop + 62, PAL.OUT);
  for (const lx of [10, 160]) c.rect(lx, deskTop + 63, 10, 60, d[1]!), c.vline(lx, deskTop + 63, deskTop + 122, PAL.OUT), c.vline(lx + 9, deskTop + 63, deskTop + 122, PAL.OUT);
  // 커팅 매트 (인형 자리)
  const m = new Canvas(92, 38);
  m.rect(0, 0, 92, 38, PAL.green[2]!);
  for (let x = 6; x < 92; x += 8) m.vline(x, 0, 37, PAL.green[3]!);
  for (let y = 5; y < 38; y += 8) m.hline(0, 91, y, PAL.green[3]!);
  m.outline();
  c.blit(m, 44, deskTop + 6);
  // 인형 그림자
  c.ellipse(90, deskTop + 16, 18, 3, [20, 50, 30, 90]);
  sewingMachine(c, 2, deskTop - 34, era === '2010s' ? PAL.cream : era === '2020s' ? PAL.teal : PAL.red);
  eyeJar(c, 140, deskTop - 22);
  // 바늘꽂이 (토마토)
  c.ellipse(125, deskTop + 4, 6, 5, PAL.red[2]!); c.set(123, deskTop + 1, PAL.red[4]!);
  c.rect(124, deskTop - 2, 3, 2, PAL.green[3]!);
  c.line(122, deskTop, 119, deskTop - 6, PAL.grey[4]!); c.line(128, deskTop, 131, deskTop - 5, PAL.grey[4]!);
  // 흩어진 단추
  for (const [bx, by, col] of [[30, deskTop + 30, PAL.blue[3]!], [146, deskTop + 34, PAL.pink[2]!], [20, deskTop + 40, PAL.gold[3]!]] as const) {
    c.ellipse(bx, by, 2.5, 2, col); c.set(bx, by, PAL.OUT);
  }
  deskLamp(c, 164, 152, era === '2010s' ? PAL.grey : era === '2020s' ? PAL.mustard : PAL.green, true);
  return c;
}

// ───────── TV방 ─────────

export function tvRoom(): Canvas {
  const c = new Canvas(W, H);
  const floorY = 290;
  ceiling(c, PAL.cream);
  stripeWall(c, 62, floorY, hex('#e2dccb'), hex('#d4cbb6'), null);
  baseboard(c, floorY - 6, PAL.wood);
  planks(c, floorY, H, PAL.wood, 10, 13);
  frameArt(c, 10, 84, 30, 24, PAL.gold, 'landscape');
  frameArt(c, 142, 80, 28, 34, PAL.gold, 'abstract');
  plant(c, 4, 196, true, PAL.red);
  plant(c, 150, 220, false, PAL.cream);
  // 긴 TV 받침대 (윗면 y252)
  const s = new Canvas(152, 50);
  s.rect(0, 0, 152, 6, PAL.wood[4]!);
  s.rect(2, 6, 148, 38, PAL.wood[2]!);
  s.shade(PAL.wood[2]!, PAL.wood[3]!, PAL.wood[1]!, 1);
  for (const dx of [8, 54, 100]) {
    s.rect(dx, 10, 42, 28, PAL.wood[3]!);
    s.hline(dx, dx + 41, 10, PAL.wood[4]!);
    s.rect(dx + 19, 22, 4, 2, PAL.gold[3]!);
  }
  for (const lx of [4, 144]) s.rect(lx, 44, 4, 6, PAL.wood[1]!);
  s.outline();
  c.ellipse(90, 300, 76, 4, [40, 24, 30, 70]);
  c.blit(s, 14, 252);
  // 비디오테이프 몇 개
  for (let k = 0; k < 3; k++) c.rect(30 + k * 8, 244, 6, 8, PAL.grey[1]!), c.hline(30 + k * 8, 35 + k * 8, 244, PAL.grey[3]!);
  return c;
}
