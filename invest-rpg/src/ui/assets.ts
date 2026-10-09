// 그림 매니페스트 읽기: 에셋 키 → 파일 경로·크기·프레임.
// 그림 파일은 assets/ 폴더 (Vite의 publicDir) → 주소는 BASE_URL + file

import manifest from './artManifest.json' with { type: 'json' };

export interface ArtAsset {
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

export const ART = manifest.assets as Record<string, ArtAsset>;
export type ArtKey = keyof typeof manifest.assets;

export function art(key: string): ArtAsset {
  const a = ART[key];
  if (!a) throw new Error(`없는 그림: ${key}`);
  return a;
}

export function artUrl(key: string, base = '/'): string {
  return `${base}${art(key).file}`;
}

/** 프레임 이름 → 번호 (없으면 0) */
export function frameIndex(key: string, name: string): number {
  const i = art(key).frameNames?.indexOf(name) ?? -1;
  return Math.max(0, i);
}
