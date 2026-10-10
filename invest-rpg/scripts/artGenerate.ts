// 게임 그림 만들기: src/ui/artManifest.json의 모든 그림을 코드로 그린 픽셀 아트 PNG로 만든다.
//   npm run art            → 없는 파일만 만든다 (직접 넣은 진짜 그림은 건드리지 않음)
//   npm run art -- --force → 전부 다시 만든다
//
// 그림 작가의 그림이나 직접 고른 그림이 생기면 같은 파일명으로 덮어쓰면 된다 (docs/art_spec.md).
// 그리는 코드: scripts/art/ (canvas.ts 도구, sprites.ts 움직이는 그림·아이콘, backgrounds.ts 배경)

import manifest from '../src/ui/artManifest.json' with { type: 'json' };
import { Canvas } from './art/canvas.ts';
import { livingRoom, tvRoom, workshop } from './art/backgrounds.ts';
import { encodePng } from './art/png.ts';
import * as S from './art/sprites.ts';

declare const process: {
  argv: string[];
  getBuiltinModule(id: 'node:fs'): {
    mkdirSync(path: string, o: { recursive: boolean }): void;
    writeFileSync(path: string, data: Uint8Array): void;
    existsSync(path: string): boolean;
  };
};

const fs = process.getBuiltinModule('node:fs');
/** npm 스크립트는 invest-rpg 폴더에서 실행된다 */
const ROOT = 'assets';

interface AssetDef {
  file: string;
  width: number;
  height: number;
  frames: number;
  frameNames?: string[];
  screen?: number[];
}

/** 배경: 180 너비로 그린 뒤 양옆 가장자리 픽셀을 늘려 manifest 너비(196)로 (넓은 휴대폰에서 옆이 비지 않게) */
function widen(src: Canvas, width: number): Canvas {
  const out = new Canvas(width, src.h);
  const pad = Math.floor((width - src.w) / 2);
  out.blit(src, pad, 0);
  for (let y = 0; y < src.h; y++) {
    for (let x = 0; x < pad; x++) out.set(x, y, src.get(0, y));
    for (let x = pad + src.w; x < width; x++) out.set(x, y, src.get(src.w - 1, y));
  }
  return out;
}

function frame(key: string, a: AssetDef, f: number): Canvas {
  const [group, name] = key.split('.') as [string, string];
  if (group === 'bg') {
    const era = name.slice(-5) as '2000s' | '2010s' | '2020s';
    const c = name.startsWith('living') ? livingRoom(era) : name.startsWith('workshop') ? workshop(era) : tvRoom();
    return widen(c, a.width);
  }
  if (group === 'dog') return S.dog(name as 'puppy' | 'adult' | 'senior', a.frameNames![f]!);
  if (key === 'lp.player') return S.lpPlayer(f);
  if (key === 'doll.body') return S.doll(f);
  if (key === 'doll.eye') return S.dollEye();
  if (key === 'fx.heart') return S.heart();
  if (key === 'fx.pet') return S.petSparkle(f);
  if (key === 'tv.noise') return S.tvNoise(f, a.width, a.height);
  if (group === 'tv') return S.tv(name as 'tv_crt' | 'tv_flat' | 'tv_large_flat', a.width, a.height, a.screen!);
  if (key === 'icon.coin') return S.coin();
  if (key === 'icon.star_on') return S.star(true);
  if (key === 'icon.star_off') return S.star(false);
  if (key === 'icon.settings') return S.gear();
  if (key.startsWith('icon.tab_')) return S.tabIcon(key.slice('icon.tab_'.length));
  if (key === 'badge.news') return S.newsBadge(f);
  throw new Error(`그리는 방법이 없는 그림: ${key}`);
}

function build(key: string, a: AssetDef): Uint8Array {
  const sheet = new Canvas(a.width * a.frames, a.height);
  for (let f = 0; f < a.frames; f++) {
    const c = frame(key, a, f);
    if (c.w !== a.width || c.h !== a.height) throw new Error(`${key} 크기 ${c.w}×${c.h} (manifest ${a.width}×${a.height})`);
    sheet.blit(c, f * a.width, 0);
  }
  return encodePng(sheet.w, sheet.h, sheet.px);
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
  fs.writeFileSync(out, build(key, a));
  made++;
}
console.log(`그림: 새로 만듦 ${made}개, 이미 있어서 건너뜀 ${kept}개 (assets/art/)`);
