// 그림 파일 목록 (DESIGN_HANDOFF.md 14장 파일명 규칙).
// 모든 그림은 130×281 도트 원본이고 화면에서 3배로 키운다 (image-rendering: pixelated).
//
// - 장면: art/scene/{living|workshop|tv}_{era}_{night|day}_lv{0..7}.png
//   · 거실: 1장
//   · 작업실: 2000년대는 인형 눈 0·1·2개 세 장을 세로로 이어 붙인 시트 (130×843, 인형이 배경에 그려져 있음)
//            2010·2020년대는 작업물 자리를 비운 배경 1장 (130×281) + 작업물 그림 (13차, 디자이너 전달)
// - 작업물: art/work/{phone_case|blog_post}_{0|1|2}[_night].png (26×41). 왼쪽 위를 (자리 x, 자리 y − 3)에 놓는다
//   · TV: 지지직 노이즈 4프레임을 세로로 이어 붙인 시트 (130×1124)
// - 강아지: art/dog/{pup|adult|old}_{lie|sit|walk0|walk1|happy0|happy1|belly0|belly1}.png (48×40, 오른쪽을 봄, 15차 새 그림)
//   하트: art/dog/hearts_{0|1|2}.png (48×40, 강아지와 같은 기준점)
// - LP: art/lp/{worn|clean|walnut}_{era}_{night|day}_{idle|play0..3}.png (44×64, 15차). 거실 배경에서는 옛 LP를 지웠다
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

/** 장면 시트의 세로 프레임 수 (작업실은 시대마다 다르다 → sceneFrames) */
export const SCENE_FRAMES: Readonly<Record<SceneKind, number>> = { living: 1, workshop: 3, tv: 4 };

/**
 * 시대별 작업 (13차): 2000년대 인형 눈 붙이기 / 2010년대 스마트폰 케이스 큐빅 붙이기 / 2020년대 블로그 글쓰기.
 * 3번 터치 = 1개 완성은 모두 같다. 인형은 배경 시트에 그려져 있고, 케이스·블로그는 작업물 그림을 배경 위에 얹는다
 */
export type WorkKind = 'doll_eyes' | 'phone_case' | 'blog_post';
export const WORK_KIND_BY_ERA: Readonly<Record<ArtEra, WorkKind>> = { '2000s': 'doll_eyes', '2010s': 'phone_case', '2020s': 'blog_post' };
/** 작업물 그림 크기 (도트). 그림 위쪽 3줄은 여유분이라 자리보다 3줄 위에 놓는다 */
export const WORK_SPRITE_W = 26;
export const WORK_SPRITE_H = 41;
export const WORK_SPRITE_TOP_PAD = 3;

/** 작업물을 따로 얹는 작업인가 (인형은 배경 시트에 그려져 있어 따로 얹지 않는다) */
export function hasWorkSprite(kind: WorkKind): boolean {
  return kind !== 'doll_eyes';
}

/** 장면의 세로 프레임 수: 작업실은 인형 시트(2000년대)만 3칸, 나머지 시대는 1칸 */
export function sceneFrames(kind: SceneKind, era: ArtEra): number {
  if (kind === 'workshop') return hasWorkSprite(WORK_KIND_BY_ERA[era]) ? 1 : SCENE_FRAMES.workshop;
  return SCENE_FRAMES[kind];
}

/** 작업물 그림: step = 지금까지 한 터치 수 (0·1·2), 밤에는 _night */
export function workSpriteFile(kind: WorkKind, step: number, tod: TimeOfDay): string {
  return `art/work/${kind}_${step}${tod === 'night' ? '_night' : ''}.png`;
}

export const DOG_W = 48;
export const DOG_H = 40;
export const HEART_W = 48;
/**
 * 스프라이트 위쪽 y = 발 y − 37 (15차 새 그림: 발 끝이 위에서 39번째 줄. 옛 42×40 그림은 40번째 줄이라 − 38이었다)
 */
export const DOG_FOOT_OFFSET = 37;
/** 새 그림(48폭)을 옛 기준(42폭, 왼쪽 x)과 가운데를 맞추려고 왼쪽으로 3도트 */
export const DOG_DRAW_DX = -3;

/** LP 플레이어 (15차): 방 단계에 따라 낡은 가방형(0~2) / 깨끗한 가방형(3~5) / 월넛 턴테이블(6~7) */
export type LpTier = 'worn' | 'clean' | 'walnut';
export type LpFrame = 'idle' | 'play0' | 'play1' | 'play2' | 'play3';
export const LP_TIERS: readonly LpTier[] = ['worn', 'clean', 'walnut'];
export const LP_FRAMES: readonly LpFrame[] = ['idle', 'play0', 'play1', 'play2', 'play3'];
export const LP_W = 44;
export const LP_H = 64;

export function lpTier(level: number): LpTier {
  return level < 3 ? 'worn' : level < 6 ? 'clean' : 'walnut';
}

/** LP 그림 왼쪽 위 (장면 도트): 박스 위(0~2단계) / 서랍장 위(3단계부터) */
export function lpPos(level: number): { x: number; y: number } {
  return level < 3 ? { x: 5, y: 91 } : { x: 9, y: 94 };
}

export function lpFile(tier: LpTier, era: ArtEra, tod: TimeOfDay, frame: LpFrame): string {
  return `art/lp/${tier}_${era}_${tod}_${frame}.png`;
}

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
  for (const era of ART_ERAS) {
    const kind = WORK_KIND_BY_ERA[era];
    if (!hasWorkSprite(kind)) continue;
    for (const tod of TIMES_OF_DAY) for (let step = 0; step < 3; step++) out.push(workSpriteFile(kind, step, tod));
  }
  for (const tier of LP_TIERS) {
    for (const era of ART_ERAS) for (const tod of TIMES_OF_DAY) for (const f of LP_FRAMES) out.push(lpFile(tier, era, tod, f));
  }
  for (const s of DOG_STAGES) for (const p of DOG_POSES) out.push(dogFile(s, p));
  for (let f = 0; f < 3; f++) out.push(heartsFile(f));
  return out;
}
