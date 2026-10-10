// 움직이는 그림(스프라이트)과 아이콘. 프레임마다 Canvas 하나를 돌려준다.
// 공통: 부품을 기본색으로 칠함 → 빛 음영(shade) → 윤곽선(outline) → 눈·코 같은 세부

import { Canvas, hex, PAL, rng, text, type RGBA } from './canvas.ts';

// ───────── 강아지 (56×48, 오른쪽을 봄) ─────────

type DogStage = 'puppy' | 'adult' | 'senior';
const DOG_COLORS: Record<DogStage, { dark: RGBA; base: RGBA; light: RGBA; cream: RGBA; creamDark: RGBA }> = {
  puppy: { dark: hex('#a8642f'), base: hex('#dc9550'), light: hex('#f2b874'), cream: hex('#fbe8cc'), creamDark: hex('#e8c8a0') },
  adult: { dark: hex('#7d4a24'), base: hex('#bd7a40'), light: hex('#dca068'), cream: hex('#f6e0bc'), creamDark: hex('#dcc098') },
  senior: { dark: hex('#6a5a4e'), base: hex('#a08d7a'), light: hex('#c4b3a0'), cream: hex('#f2ece2'), creamDark: hex('#d8cfc2') },
};

export function dog(stage: DogStage, frame: string): Canvas {
  const c = new Canvas(56, 48);
  const col = DOG_COLORS[stage];
  const pup = stage === 'puppy';
  const old = stage === 'senior';
  const lift = frame === 'idle1' ? -1 : 0; // 숨쉬기
  const hy = (pup ? 4 : 0) + (old ? 2 : 0) + lift; // 머리 높이 보정
  const by = (pup ? 2 : 0) + lift;
  const legTop = pup ? 36 : 33;

  // 꼬리 (말린 꼬리)
  // 엉덩이에서 위로 말려 올라간 꼬리. 흔들 때는 끝이 좌우로 움직인다
  const tip = frame === 'tail0' ? [10, 18] : frame === 'tail1' ? [16, 17] : [13, 19];
  const root = [pup ? 16 : 14, (pup ? 29 : 27) + by];
  const tr = pup ? 3 : 3.8;
  for (let k = 0; k <= 6; k++) {
    const t = k / 6;
    c.ellipse(root[0]! + (tip[0]! - root[0]!) * t, root[1]! + (tip[1]! + by - root[1]!) * t, tr, tr, col.base);
  }
  c.ellipse(tip[0]! + 0.5, tip[1]! + by, tr - 1.2, tr - 1.2, col.cream);

  // 다리 (먼 쪽은 어둡게)
  const legH = pup ? 9 : 11;
  c.rect(19, legTop + 1, 4, legH - 1, col.dark);
  c.rect(34, legTop + 1, 4, legH - 1, col.dark);
  c.rect(13, legTop + lift, 5, legH - lift, col.base);
  c.rect(39, legTop + lift, 5, legH - lift, col.base);
  // 몸
  c.ellipse(26, (pup ? 33 : 31) + by, pup ? 12 : 14.5, pup ? 7.5 : 8.5, col.base);
  // 목·머리
  c.ellipse(37, 26 + hy * 0.6, 6, 7, col.base);
  const hx = pup ? 41 : 42;
  const hr = pup ? 9.5 : 8.5;
  c.ellipse(hx, 18 + hy, hr, pup ? 8.5 : 7.5, col.base);
  // 주둥이
  c.ellipse(pup ? 49 : 50, 21.5 + hy, pup ? 4 : 5, pup ? 3 : 3.5, col.base);
  // 귀 (뒤쪽 귀 + 앞쪽 귀)
  const perk = frame === 'ear' ? -3 : 0;
  const droop = old ? 2 : 0;
  c.poly([[hx - 7, 14 + hy], [hx - 4, 6 + hy + perk + droop], [hx - 1, 12 + hy]], col.dark);
  c.poly([[hx - 3, 13 + hy], [hx + 1, 4 + hy + perk + droop], [hx + 4, 12 + hy]], col.base);

  c.shade(col.base, col.light, col.dark, 1);
  // 배·가슴·주둥이 아래·발 (크림색)
  c.ellipse(26, (pup ? 36 : 35) + by, pup ? 8 : 10, 3.5, col.cream);
  c.ellipse(39, 28 + hy * 0.6, 3.5, 4.5, col.cream);
  c.ellipse(pup ? 49 : 50, 23 + hy, pup ? 3.5 : 4.5, 1.8, col.cream);
  c.ellipse(hx + 3, 21 + hy, 3, 2, col.cream);
  for (const x of [13, 39]) c.rect(x, legTop + legH - 2, 5, 2, col.cream);
  for (const x of [19, 34]) c.rect(x, legTop + legH - 2, 4, 2, col.creamDark);
  c.outline();

  // 세부: 귀 안쪽, 눈, 코, 입, 목걸이
  c.set(hx, 9 + hy + perk + droop, PAL.pink[2]!);
  c.set(hx, 10 + hy + perk + droop, PAL.pink[2]!);
  const ex = hx + 3, ey = 16 + hy;
  if (frame === 'pet') {
    c.set(ex - 1, ey + 1, PAL.OUT); c.set(ex, ey, PAL.OUT); c.set(ex + 1, ey + 1, PAL.OUT);
    c.set(ex, ey + 4, PAL.pink[2]!); c.set(ex + 1, ey + 4, PAL.pink[2]!);
  } else if (old) {
    c.hline(ex - 1, ex + 1, ey + 1, PAL.OUT);
    c.hline(ex - 2, ex + 1, ey - 1, col.cream); // 흰 눈썹
  } else {
    c.rect(ex, ey, 2, pup ? 3 : 2, PAL.OUT);
    c.set(ex, ey, PAL.white);
  }
  const nx = pup ? 52 : 54;
  c.rect(nx - 1, 19 + hy, 2, 2, PAL.OUT);
  c.set(nx - 1, 19 + hy, PAL.grey[3]!);
  c.hline(nx - 4, nx - 2, 24 + hy, col.dark);
  // 빨간 목걸이와 금색 이름표
  for (let y = 0; y < 3; y++) c.hline(33, 38, 27 + hy * 0.6 + y - (y === 0 ? 1 : 0), y === 2 ? PAL.red[1]! : PAL.red[2]!);
  c.set(37, 30 + hy * 0.6, PAL.gold[3]!);
  c.set(37, 31 + hy * 0.6, PAL.gold[2]!);
  if (frame === 'pet') {
    // 쓰다듬는 손길: 머리 위 작은 반짝임
    c.set(hx - 1, 2 + hy, PAL.gold[4]!);
  }
  return c;
}

// ───────── LP 플레이어 (56×44, 프레임 4: 판이 돈다) ─────────

export function lpPlayer(frame: number): Canvas {
  const c = new Canvas(56, 44);
  const w = PAL.wood;
  // 윗판 (밝은 나무) + 앞판 (어두운 나무)
  c.rect(2, 8, 52, 24, w[3]!);
  c.rect(2, 32, 52, 10, w[2]!);
  c.shade(w[3]!, w[4]!, null, 1);
  c.shade(w[2]!, null, w[1]!, 1);
  // 나뭇결
  for (const y of [14, 22, 28]) for (let x = 4; x < 52; x += 7) c.hline(x, x + 3, y, w[2]!);
  c.outline();
  // 앞판 손잡이·버튼
  c.rect(6, 35, 18, 4, w[1]!);
  for (let x = 7; x < 23; x += 2) c.vline(x, 36, 37, w[0]!);
  c.ellipse(40, 37, 2, 2, PAL.grey[4]!);
  c.ellipse(47, 37, 2, 2, PAL.grey[4]!);
  c.set(40, 36, PAL.white); c.set(47, 36, PAL.white);
  c.set(33, 37, frame % 2 === 0 ? PAL.green[4]! : PAL.green[3]!); // 전원 불빛
  // 턴테이블
  c.ellipse(22, 19, 15, 9.5, PAL.grey[2]!);
  c.ellipse(22, 19, 13.5, 8.5, hex('#1c1820'));
  // 홈 (동심 타원)
  for (const r of [11, 8.5]) {
    for (let a = 0; a < 64; a++) {
      const t = (a / 64) * Math.PI * 2;
      if (a % 3 === 0) continue;
      c.set(22 + Math.cos(t) * r, 19 + Math.sin(t) * r * 0.63, hex('#3a3440'));
    }
  }
  // 빛 반사: 프레임마다 각도가 바뀌어 도는 것처럼 보인다
  const ang = (frame / 4) * Math.PI * 2;
  for (let r = 5; r <= 12; r++) c.set(22 + Math.cos(ang) * r, 19 + Math.sin(ang) * r * 0.63, hex('#8a8098'));
  for (let r = 6; r <= 11; r++) c.set(22 + Math.cos(ang + Math.PI) * r, 19 + Math.sin(ang + Math.PI) * r * 0.63, hex('#5a5068'));
  // 가운데 라벨
  c.ellipse(22, 19, 4, 2.6, PAL.red[2]!);
  c.set(22 + Math.round(Math.cos(ang) * 2), 19 + Math.round(Math.sin(ang)), PAL.gold[4]!);
  c.set(22, 19, PAL.OUT);
  // 톤암 (은색)
  c.ellipse(46, 12, 3, 3, PAL.grey[3]!);
  c.set(45, 11, PAL.grey[5]!);
  c.line(46, 13, 40, 22, PAL.grey[4]!);
  c.line(47, 13, 41, 22, PAL.grey[2]!);
  c.rect(37, 21, 4, 3, PAL.grey[1]!);
  // 볼륨 다이얼
  c.ellipse(48, 25, 2.5, 2.5, PAL.gold[3]!);
  c.set(48, 24, PAL.gold[5]!);
  return c;
}

// ───────── 인형 (40×48, 프레임: 눈 없음/하나/둘/완성) ─────────

export function doll(frame: number): Canvas {
  const c = new Canvas(40, 48);
  const base = hex('#d99868'), light = hex('#f2be8a'), dark = hex('#a86a40');
  const cream = hex('#f8e6c8');
  c.ellipse(10, 7, 4.5, 4.5, base);
  c.ellipse(30, 7, 4.5, 4.5, base);
  c.ellipse(9, 31, 3.5, 5.5, base);
  c.ellipse(31, 31, 3.5, 5.5, base);
  c.ellipse(14, 43, 5, 3.5, base);
  c.ellipse(26, 43, 5, 3.5, base);
  c.roundRect(11, 25, 18, 17, 6, base);
  c.ellipse(20, 15, 11.5, 10.5, base);
  c.shade(base, light, dark, 1);
  c.ellipse(10, 7, 2, 2, PAL.pink[3]!);
  c.ellipse(30, 7, 2, 2, PAL.pink[3]!);
  c.ellipse(20, 20, 5.5, 3.8, cream);
  c.ellipse(20, 33, 5.5, 6, cream);
  c.ellipse(14, 44, 3, 1.6, cream);
  c.ellipse(26, 44, 3, 1.6, cream);
  c.outline();
  // 바느질 자국 (점선)
  for (let y = 27; y < 40; y += 2) c.set(20, y, hex('#c8a880'));
  for (let x = 12; x < 29; x += 3) c.set(x, 25, dark);
  // 코·입
  c.rect(19, 18, 3, 2, hex('#5a3424'));
  c.set(19, 18, hex('#8a5a44'));
  c.set(20, 21, hex('#5a3424'));
  const eyes = frame >= 3 ? 2 : frame;
  const eye = (x: number) => {
    c.rect(x, 12, 3, 3, PAL.OUT);
    c.set(x, 12, PAL.white);
  };
  if (eyes === 0) {
    // 눈 자리 표시 (연필 점)
    c.set(15, 13, hex('#b88a64')); c.set(25, 13, hex('#b88a64'));
  }
  if (eyes >= 1) eye(14);
  else c.set(15, 13, hex('#b88a64'));
  if (eyes >= 2) eye(24);
  else c.set(25, 13, hex('#b88a64'));
  if (frame === 3) {
    // 완성: 웃는 입, 볼 터치, 리본, 반짝임
    c.set(18, 22, hex('#5a3424')); c.set(22, 22, hex('#5a3424')); c.hline(19, 21, 23, hex('#5a3424'));
    c.rect(11, 17, 2, 1, PAL.pink[2]!); c.rect(27, 17, 2, 1, PAL.pink[2]!);
    c.poly([[25, 3], [30, 0], [30, 6]], PAL.red[2]!);
    c.poly([[25, 3], [20, 0], [20, 6]], PAL.red[2]!);
    c.rect(24, 2, 2, 3, PAL.red[1]!);
    for (const [x, y] of [[4, 18], [35, 20], [6, 38]]) {
      c.set(x!, y!, PAL.gold[5]!); c.set(x! - 1, y!, PAL.gold[4]!); c.set(x! + 1, y!, PAL.gold[4]!); c.set(x!, y! - 1, PAL.gold[4]!); c.set(x!, y! + 1, PAL.gold[4]!);
    }
  }
  return c;
}

/** 붙이는 눈알 (단추) 6×6 */
export function dollEye(): Canvas {
  const c = new Canvas(6, 6);
  c.ellipse(3, 3, 3, 3, hex('#2a2230'));
  c.set(2, 2, PAL.white);
  c.set(3, 4, hex('#4a4250'));
  return c;
}

// ───────── TV (프레임 1) ─────────

export function tv(kind: 'tv_crt' | 'tv_flat' | 'tv_large_flat', w: number, h: number, screen: number[]): Canvas {
  const c = new Canvas(w, h);
  const [sx, sy, sw, sh] = screen as [number, number, number, number];
  if (kind === 'tv_crt') {
    const base = hex('#d8cfbc'), light = hex('#f0e8d6'), dark = hex('#a99c84');
    c.roundRect(3, 4, w - 6, h - 10, 8, base);
    c.shade(base, light, dark, 2);
    c.rect(20, h - 6, 14, 5, hex('#5a5048'));
    c.rect(w - 34, h - 6, 14, 5, hex('#5a5048'));
    c.outline();
    // 화면 테두리 (안으로 들어간 느낌)
    c.roundRect(sx - 7, sy - 6, sw + 14, sh + 12, 6, hex('#6e665e'));
    c.roundRect(sx - 4, sy - 3, sw + 8, sh + 6, 5, hex('#3a3632'));
    c.rect(sx, sy, sw, sh, hex('#203030'));
    c.hline(sx - 6, sx + sw + 5, sy - 6, hex('#8e867c'));
    // 스피커 망·다이얼
    for (let y = sy + sh + 10; y < h - 12; y += 2) c.hline(14, 60, y, dark);
    for (const x of [w - 40, w - 24]) {
      c.ellipse(x, sy + sh + 13, 4.5, 4.5, hex('#6e665e'));
      c.ellipse(x, sy + sh + 13, 3, 3, hex('#9a9288'));
      c.vline(x, sy + sh + 10, sy + sh + 12, PAL.OUT);
    }
    c.rect(w - 56, sy + sh + 12, 3, 2, PAL.red[3]!);
    // 위쪽 안테나 받침
    c.rect(w / 2 - 8, 1, 16, 4, hex('#6e665e'));
  } else {
    const bezel = kind === 'tv_flat' ? hex('#2a2c34') : hex('#1f2026');
    const top = kind === 'tv_flat' ? 0 : 0;
    const bh = kind === 'tv_flat' ? h - 8 : h - 8;
    c.roundRect(sx - (kind === 'tv_flat' ? 6 : 4), top, sw + (kind === 'tv_flat' ? 12 : 8), bh, 2, bezel);
    c.shade(bezel, hex('#4a4c58'), null, 1);
    c.outline();
    c.rect(sx, sy, sw, sh, hex('#182028'));
    // 받침
    if (kind === 'tv_flat') {
      c.poly([[w / 2 - 6, bh], [w / 2 + 6, bh], [w / 2 + 16, h - 1], [w / 2 - 16, h - 1]], hex('#9aa0ae'));
      c.hline(w / 2 - 16, w / 2 + 16, h - 1, hex('#6e7484'));
    } else {
      for (const x of [16, w - 22]) c.poly([[x + 2, bh], [x + 5, bh], [x + 8, h - 1], [x - 1, h - 1]], hex('#9aa0ae'));
    }
    c.set(w / 2, bh - 3, PAL.blue[4]!);
  }
  return c;
}

/** "방송 준비 중" 노이즈 (100×70, 프레임 4) */
export function tvNoise(frame: number, w: number, h: number): Canvas {
  const c = new Canvas(w, h);
  const r = rng(77 + frame * 131);
  for (let y = 0; y < h; y++) {
    const scan = y % 2 === 0 ? 0 : -14;
    for (let x = 0; x < w; x++) {
      const v = Math.floor(70 + r() * 150 + scan);
      const tint = r();
      const col: RGBA = tint < 0.04 ? [v, v * 0.7, v * 0.9, 255] : tint < 0.08 ? [v * 0.7, v * 0.85, v, 255] : [v, v, v, 255];
      c.set(x, y, col.map((k, i) => (i === 3 ? 255 : Math.max(0, Math.min(255, Math.round(k))))) as unknown as RGBA);
    }
  }
  const band = Math.floor((frame / 4) * h);
  for (let y = band; y < band + 6; y++) for (let x = 0; x < w; x++) c.set(x, y % h, [235, 235, 240, 140]);
  return c;
}

// ───────── 아이콘 ─────────

/** 주황 코인 12×12 (₿ 기호 아님: 가운데 마름모 무늬) */
export function coin(): Canvas {
  const c = new Canvas(12, 12);
  const g = PAL.gold;
  c.ellipse(6, 6, 5.5, 5.5, g[2]!);
  c.shade(g[2]!, g[4]!, g[1]!, 1);
  c.outline(hex('#5a2a0c'));
  c.ellipse(6, 6, 3.2, 3.2, g[3]!);
  c.poly([[6, 3.5], [8.5, 6], [6, 8.5], [3.5, 6]], g[4]!);
  c.set(6, 6, g[5]!);
  c.set(3, 2, g[5]!); c.set(2, 3, g[5]!);
  return c;
}

const STAR: [number, number][] = [[4.5, 0], [5.8, 3.2], [9, 3.4], [6.5, 5.5], [7.4, 8.8], [4.5, 7], [1.6, 8.8], [2.5, 5.5], [0, 3.4], [3.2, 3.2]];

export function star(on: boolean): Canvas {
  const c = new Canvas(9, 9);
  c.poly(STAR, on ? PAL.gold[3]! : PAL.grey[3]!);
  c.shade(on ? PAL.gold[3]! : PAL.grey[3]!, on ? PAL.gold[5]! : PAL.grey[5]!, on ? PAL.gold[2]! : PAL.grey[2]!, 1);
  return c;
}

export function gear(): Canvas {
  const c = new Canvas(12, 12);
  const g = PAL.grey;
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    c.rect(Math.round(6 + Math.cos(a) * 4.5) - 1, Math.round(6 + Math.sin(a) * 4.5) - 1, 2, 2, g[4]!);
  }
  c.ellipse(6, 6, 4, 4, g[4]!);
  c.shade(g[4]!, g[5]!, g[2]!, 1);
  c.ellipse(6, 6, 1.6, 1.6, PAL.CLEAR);
  c.outline(PAL.navy[0]!);
  return c;
}

/** 하단 탭 아이콘 16×16 */
export function tabIcon(id: string): Canvas {
  const c = new Canvas(16, 16);
  if (id === 'living_room') {
    // 소파
    const r = PAL.red;
    c.rect(2, 5, 12, 5, r[2]!);
    c.rect(1, 8, 14, 4, r[2]!);
    c.rect(0, 7, 3, 6, r[1]!);
    c.rect(13, 7, 3, 6, r[1]!);
    c.shade(r[2]!, r[3]!, r[1]!, 1);
    c.rect(2, 13, 2, 2, PAL.wood[1]!);
    c.rect(12, 13, 2, 2, PAL.wood[1]!);
    c.outline();
  } else if (id === 'trading') {
    // 모니터 + 오르는 그래프
    c.rect(1, 2, 14, 10, PAL.grey[4]!);
    c.rect(2, 3, 12, 8, PAL.navy[1]!);
    c.rect(6, 12, 4, 2, PAL.grey[3]!);
    c.rect(4, 14, 8, 1, PAL.grey[3]!);
    c.outline();
    c.line(3, 9, 6, 6, PAL.green[4]!);
    c.line(6, 6, 8, 8, PAL.green[4]!);
    c.line(8, 8, 12, 4, PAL.green[4]!);
    c.set(12, 4, PAL.gold[4]!);
  } else if (id === 'workshop') {
    // 곰 인형 얼굴
    const b = hex('#d99868');
    c.ellipse(3.5, 4, 3, 3, b);
    c.ellipse(12.5, 4, 3, 3, b);
    c.ellipse(8, 9, 6.5, 5.8, b);
    c.shade(b, hex('#f2be8a'), hex('#a86a40'), 1);
    c.ellipse(8, 11, 3, 2, hex('#f8e6c8'));
    c.outline();
    c.rect(5, 7, 2, 2, PAL.OUT); c.rect(10, 7, 2, 2, PAL.OUT);
    c.set(8, 10, hex('#5a3424'));
  } else {
    // TV
    c.roundRect(1, 3, 14, 11, 2, hex('#d8cfbc'));
    c.rect(3, 5, 8, 7, PAL.teal[1]!);
    c.outline();
    c.line(5, 0, 8, 3, PAL.OUT); c.line(11, 0, 8, 3, PAL.OUT);
    c.set(13, 6, PAL.grey[1]!); c.set(13, 9, PAL.grey[1]!);
    c.set(4, 6, PAL.teal[3]!);
  }
  return c;
}

export function heart(): Canvas {
  const c = new Canvas(12, 12);
  const p = PAL.pink;
  c.ellipse(3.5, 4, 3, 3, p[2]!);
  c.ellipse(8.5, 4, 3, 3, p[2]!);
  c.poly([[0.6, 5], [11.4, 5], [6, 11]], p[2]!);
  c.shade(p[2]!, p[3]!, p[1]!, 1);
  c.outline(hex('#5a1a2e'));
  c.set(3, 3, PAL.white);
  return c;
}

/** 쓰다듬기 반짝임 16×12 (프레임 3) */
export function petSparkle(frame: number): Canvas {
  const c = new Canvas(16, 12);
  const pts = [[[4, 6], [11, 4]], [[3, 4], [9, 7], [13, 3]], [[6, 3], [12, 8]]][frame]!;
  for (const [x, y] of pts) {
    c.set(x!, y!, PAL.white);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) c.set(x! + dx!, y! + dy!, PAL.gold[4]!);
  }
  return c;
}

/** NEWS! 배지 30×12 (프레임 2: 밝음/어두움) */
export function newsBadge(frame: number): Canvas {
  const c = new Canvas(30, 12);
  const r = frame === 0 ? PAL.red[2]! : PAL.red[1]!;
  c.roundRect(1, 1, 28, 10, 2, r);
  c.shade(r, frame === 0 ? PAL.red[3]! : PAL.red[2]!, PAL.red[0]!, 1);
  c.outline();
  text(c, 'NEWS!', 5, 3, PAL.white);
  return c;
}
