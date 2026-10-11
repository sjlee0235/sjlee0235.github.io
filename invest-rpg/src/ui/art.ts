// 그림 파일 목록 (DESIGN_HANDOFF.md 14장 파일명 규칙).
// 모든 그림은 130×281 도트 원본이고 화면에서 3배로 키운다 (image-rendering: pixelated).
//
// - 장면: art/scene/{living|workshop|tv}_{era}_{night|day}_lv{0..7}.png
//   · 거실: 1장
//   · 작업실: 눈 0·1·2개 세 장을 세로로 이어 붙인 시트 (130×843)
//   · TV: 지지직 노이즈 4프레임을 세로로 이어 붙인 시트 (130×1124)
// - 강아지: art/dog/{pup|adult|old}_{lie|sit|walk0|walk1|happy0|happy1|belly0|belly1}.png (42×40, 오른쪽을 봄)
//   하트: art/dog/hearts_{0|1|2}.png (48×40, 강아지와 같은 기준점)
// 그림을 다시 만드는 코드는 art_source/ (파이썬).

export const SCENE_W = 130;
export const SCENE_H = 281;
/** 화면 배율 (도트 1개 = 3×3 화면 픽셀) */
export const SCALE = 3;

export type SceneKind = 'living' | 'workshop' | 'tv';
export type ArtEra = '2000s' | '2010s' | '2020s';
export type TimeOfDay = 'night' | 'day';
export type DogArtStage = 'pup' | 'adult' | 'old';
export type DogPose = 'lie' | 'sit' | 'walk0' | 'walk1' | 'happy0' | 'happy1' | 'belly0' | 'belly1';

export const ART_ERAS: readonly ArtEra[] = ['2000s', '2010s', '2020s'];
export const TIMES_OF_DAY: readonly TimeOfDay[] = ['night', 'day'];
export const SCENE_KINDS: readonly SceneKind[] = ['living', 'workshop', 'tv'];
export const DOG_STAGES: readonly DogArtStage[] = ['pup', 'adult', 'old'];
export const DOG_POSES: readonly DogPose[] = ['lie', 'sit', 'walk0', 'walk1', 'happy0', 'happy1', 'belly0', 'belly1'];
export const INTERIOR_LEVELS = [0, 1, 2, 3, 4, 5, 6, 7] as const;

/** 장면 시트의 세로 프레임 수 */
export const SCENE_FRAMES: Readonly<Record<SceneKind, number>> = { living: 1, workshop: 3, tv: 4 };

export const DOG_W = 42;
export const DOG_H = 40;
export const HEART_W = 48;
/** 스프라이트 위쪽 y = 발 y − 38.5 (8.1) → 정수 도트로는 발 y − 38 */
export const DOG_FOOT_OFFSET = 38;

export function sceneFile(kind: SceneKind, era: ArtEra, tod: TimeOfDay, level: number): string {
  return `art/scene/${kind}_${era}_${tod}_lv${level}.png`;
}

export function dogFile(stage: DogArtStage, pose: DogPose): string {
  return `art/dog/${stage}_${pose}.png`;
}

export function heartsFile(frame: number): string {
  return `art/dog/hearts_${frame}.png`;
}

/** 시대 id → 그림 시대. 그림이 없는 시대(가상 시대 등)는 2000년대 그림 */
export function artEraFor(eraId: string): ArtEra {
  return (ART_ERAS as readonly string[]).includes(eraId) ? (eraId as ArtEra) : '2000s';
}

/** 시대 id → 강아지 나이 (2000년대 아기 / 2010년대 어른 / 2020년대 노견) */
export function dogStageFor(eraId: string): DogArtStage {
  const i = ART_ERAS.indexOf(artEraFor(eraId));
  return DOG_STAGES[i]!;
}

/** 기기 현지 시각으로 밤/낮: 18:00~06:00 밤, 06:00~18:00 낮 (4장) */
export function timeOfDayAt(date: Date): TimeOfDay {
  const h = date.getHours();
  return h >= 18 || h < 6 ? 'night' : 'day';
}

/** 그림 파일 전체 목록 (미리 불러오기·테스트용) */
export function allArtFiles(): string[] {
  const out: string[] = [];
  for (const kind of SCENE_KINDS) {
    for (const era of ART_ERAS) {
      for (const tod of TIMES_OF_DAY) for (const lv of INTERIOR_LEVELS) out.push(sceneFile(kind, era, tod, lv));
    }
  }
  for (const s of DOG_STAGES) for (const p of DOG_POSES) out.push(dogFile(s, p));
  for (let f = 0; f < 3; f++) out.push(heartsFile(f));
  return out;
}
