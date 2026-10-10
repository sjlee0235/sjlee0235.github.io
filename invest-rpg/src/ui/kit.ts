// 도트 UI 부품: 패널(pnl), 버튼(pbtn), 아이콘(ico). 모양은 style.css (DESIGN_HANDOFF 10장)

import { h } from './dom.ts';
import { ICONS, type IconName } from './icons.ts';

type Child = Node | string | null | undefined | false;

/** 도트 패널: 2도트 외곽선 + 모서리 깎기 + 안쪽 밝은/어두운 테두리. 내용은 .in 안에 */
export function pnl(cls: string, ...children: Child[]): HTMLElement {
  return h('div', { class: `pnl ${cls}` }, h('div', { class: 'in' }, ...children));
}

/** 패널의 안쪽(.in) */
export const inner = (p: HTMLElement) => p.firstElementChild as HTMLElement;

/** 도트 버튼 (variant: accent / buy / sell / panel / sel / off). 누르면 아래 선이 얇아지며 1도트 내려간다 */
export function pbtn(variant: string, label: Child | Child[], attrs: Record<string, string> = {}): HTMLButtonElement {
  const kids = Array.isArray(label) ? label : [label];
  return h('button', { class: `pbtn ${variant}`, type: 'button', ...attrs }, h('span', { class: 'face' }, ...kids));
}

/** 버튼 얼굴(.face) */
export const face = (b: HTMLElement) => b.firstElementChild as HTMLElement;

/** 도트 아이콘 (밤/낮 두 벌을 넣고 CSS가 하나만 보여 준다). size = 화면 px */
export function ico(name: IconName, size: number, height = size): HTMLElement {
  const el = h('span', { class: 'ico', 'data-icon': name, style: `width:${size}px;height:${height}px` });
  const n = h('span', { class: 'n' });
  const d = h('span', { class: 'd' });
  n.innerHTML = ICONS[name].night;
  d.innerHTML = ICONS[name].day;
  el.append(n, d);
  return el;
}

/** 모래시계 (남은 시간 칩). 7×10 격자, 글자색을 따른다 */
const HOURGLASS = ['#######', '.#...#.', '.#...#.', '..#.#..', '...#...', '...#...', '..#.#..', '.#.#.#.', '.#####.', '#######'];
export function hourglassIcon(): HTMLElement {
  const el = h('span', { class: 'hourglass', 'aria-hidden': 'true' });
  const rects: string[] = [];
  HOURGLASS.forEach((row, y) => [...row].forEach((c, x) => {
    if (c === '#') rects.push(`<rect x="${x}" y="${y}" width="1" height="1"/>`);
  }));
  el.innerHTML = `<svg viewBox="0 0 7 10" shape-rendering="crispEdges" fill="currentColor">${rects.join('')}</svg>`;
  return el;
}

/** ▶ / ▶▶ (글자색을 따른다) */
export function playIcon(n: 1 | 2): HTMLElement {
  const el = h('span', { class: 'play' });
  el.innerHTML = ICONS[n === 1 ? 'play1' : 'play2'].night;
  return el;
}
