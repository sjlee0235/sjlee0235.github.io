// 게임 제목 "역전의 방" 도트 글자. 글자마다 14×15 격자를 손으로 그렸다 (획 2도트).
// 그리기: 면은 위쪽 절반 밝은 금색 / 아래쪽 절반 주황 금색, 위가 비면 밝은 점, 아래가 비면 어두운 점,
// 바깥에 1도트 외곽선(8방향), 그 아래로 2도트 그림자. 외곽선·그림자까지 넣어 SVG 하나로 만든다.

const GLYPHS: Record<string, string[]> = {
  역: [
    '..####......##',
    '.##..##..#####',
    '##....##.#####',
    '##....##....##',
    '##....##.#####',
    '.##..##..#####',
    '..####......##',
    '............##',
    '............##',
    '..............',
    '.#############',
    '.#############',
    '............##',
    '............##',
    '............##',
  ],
  전: [
    '########....##',
    '########....##',
    '...##.......##',
    '..####...#####',
    '.##..##..#####',
    '##....##....##',
    '#......#....##',
    '............##',
    '............##',
    '..............',
    '.##...........',
    '.##...........',
    '.##...........',
    '.#############',
    '.#############',
  ],
  의: [
    '..####......##',
    '.##..##.....##',
    '##....##....##',
    '##....##....##',
    '##....##....##',
    '.##..##.....##',
    '..####......##',
    '............##',
    '............##',
    '##########..##',
    '##########..##',
    '............##',
    '............##',
    '............##',
    '............##',
  ],
  방: [
    '##....##..##..',
    '##....##..##..',
    '##....##..##..',
    '########..####',
    '##....##..####',
    '##....##..##..',
    '########..##..',
    '########..##..',
    '..........##..',
    '..............',
    '...########...',
    '..##......##..',
    '..##......##..',
    '..##......##..',
    '...########...',
  ],
};

const GLYPH_W = 14;
const GLYPH_H = 15;

export const TITLE_COLORS = {
  top: '#ffd25a',
  bottom: '#f59a23',
  light: '#fff3c4',
  dark: '#c0601a',
  outline: '#2a1030',
  shadow: '#120820',
};

/** 글자 배치: 글자 사이 2도트, 띄어쓰기 7도트. 바깥 여백 1도트(외곽선) + 아래 2도트(그림자) */
export function titleBitmap(text: string): boolean[][] {
  const cols: number[] = [];
  let x = 1;
  const cells: { ch: string; x: number }[] = [];
  for (const ch of text) {
    if (ch === ' ') {
      x += 5;
      continue;
    }
    if (!GLYPHS[ch]) throw new Error(`제목 글자 없음: ${ch}`);
    cells.push({ ch, x });
    cols.push(x);
    x += GLYPH_W + 2;
  }
  const width = x - 2 + 1;
  const height = GLYPH_H + 2 + 2;
  const grid = Array.from({ length: height }, () => Array<boolean>(width).fill(false));
  for (const c of cells) {
    GLYPHS[c.ch]!.forEach((row, ry) => {
      for (let rx = 0; rx < row.length; rx++) if (row[rx] === '#') grid[ry + 1]![c.x + rx] = true;
    });
  }
  return grid;
}

/** 도트 제목 SVG (scale = 도트 1개의 화면 px) */
export function titleSvg(text: string, scale: number): string {
  const g = titleBitmap(text);
  const h = g.length;
  const w = g[0]!.length;
  const at = (x: number, y: number) => y >= 0 && y < h && x >= 0 && x < w && g[y]![x]!;
  const color: (string | null)[][] = Array.from({ length: h }, () => Array<string | null>(w).fill(null));
  // 외곽선 (8방향으로 글자에 닿는 빈칸)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (at(x, y)) continue;
      let near = false;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (at(x + dx, y + dy)) near = true;
      if (near) color[y]![x] = TITLE_COLORS.outline;
    }
  }
  // 면
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!at(x, y)) continue;
      const base = y - 1 < GLYPH_H / 2 ? TITLE_COLORS.top : TITLE_COLORS.bottom;
      color[y]![x] = !at(x, y - 1) ? TITLE_COLORS.light : !at(x, y + 1) ? TITLE_COLORS.dark : base;
    }
  }
  // 그림자: 외곽선까지 포함한 모양을 아래로 2도트
  const rects: string[] = [];
  const run = (y: number, pick: (x: number) => string | null, dy = 0) => {
    let x = 0;
    while (x < w) {
      const c = pick(x);
      if (!c) {
        x++;
        continue;
      }
      let x2 = x;
      while (x2 + 1 < w && pick(x2 + 1) === c) x2++;
      rects.push(`<rect x="${x}" y="${y + dy}" width="${x2 - x + 1}" height="1" fill="${c}"/>`);
      x = x2 + 1;
    }
  };
  for (let y = 0; y < h; y++) run(y, (x) => (color[y]![x] ? TITLE_COLORS.shadow : null), 2);
  for (let y = 0; y < h; y++) run(y, (x) => color[y]![x] ?? null);
  return `<svg viewBox="0 0 ${w} ${h + 2}" width="${w * scale}" height="${(h + 2) * scale}" shape-rendering="crispEdges" role="img" aria-label="${text}">${rects.join('')}</svg>`;
}
