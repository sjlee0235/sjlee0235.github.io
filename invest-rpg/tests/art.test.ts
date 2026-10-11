// 그림 파일: 목록의 모든 파일이 있고 크기가 맞는가, 시대·밤낮 규칙

import { describe, expect, it } from 'vitest';
import {
  allArtFiles, artEraFor, DOG_H, DOG_W, dogStageFor, HEART_W, SCENE_FRAMES, SCENE_H, SCENE_W, timeOfDayAt,
} from '../src/ui/art.ts';

declare const process: {
  getBuiltinModule(id: 'node:fs'): { readFileSync(path: string): Uint8Array; readdirSync(path: string): string[] };
};
const fs = process.getBuiltinModule('node:fs');

/** PNG 머리(IHDR)에서 가로·세로 */
function pngSize(path: string): { w: number; h: number } {
  const b = fs.readFileSync(path);
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  return { w: v.getUint32(16), h: v.getUint32(20) };
}

describe('그림 파일', () => {
  const files = allArtFiles();

  it('목록의 파일이 모두 있고, 폴더에 목록 밖 파일이 없다', () => {
    expect(files.length).toBe(144 + 24 + 3);
    const onDisk = [
      ...fs.readdirSync('assets/art/scene').map((f) => `art/scene/${f}`),
      ...fs.readdirSync('assets/art/dog').map((f) => `art/dog/${f}`),
    ].sort();
    expect(onDisk).toEqual([...files].sort());
  });

  it('장면은 130 폭, 높이 = 281 × 시트 프레임 수', () => {
    for (const f of files.filter((x) => x.startsWith('art/scene/'))) {
      const kind = f.slice('art/scene/'.length).split('_')[0] as keyof typeof SCENE_FRAMES;
      expect(pngSize(`assets/${f}`), f).toEqual({ w: SCENE_W, h: SCENE_H * SCENE_FRAMES[kind] });
    }
  });

  it('강아지 42×40, 하트 48×40', () => {
    for (const f of files.filter((x) => x.startsWith('art/dog/'))) {
      const want = f.includes('hearts_') ? { w: HEART_W, h: DOG_H } : { w: DOG_W, h: DOG_H };
      expect(pngSize(`assets/${f}`), f).toEqual(want);
    }
  });
});

describe('시대·밤낮 규칙', () => {
  it('그림이 없는 시대는 2000년대 그림, 강아지 나이는 시대 순서', () => {
    expect(artEraFor('2010s')).toBe('2010s');
    expect(artEraFor('virtual-x')).toBe('2000s');
    expect([dogStageFor('2000s'), dogStageFor('2010s'), dogStageFor('2020s')]).toEqual(['pup', 'adult', 'old']);
  });

  it('18:00~06:00 밤, 06:00~18:00 낮 (현지 시각)', () => {
    const at = (h: number, m = 0) => timeOfDayAt(new Date(2026, 0, 1, h, m));
    expect([at(5, 59), at(6), at(17, 59), at(18), at(0)]).toEqual(['night', 'day', 'day', 'night', 'night']);
  });
});
