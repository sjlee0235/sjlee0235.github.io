// 시대별 화면 디자인 데이터 (구조만. 실제 그림은 나중에): 강아지 단계, 거실·작업실·TV 그림 종류, 주식창(HTS) 색 세트

import eraThemeData from '../data/eraTheme.json' with { type: 'json' };
import type { DogStage } from './dogPetting.ts';

export interface HtsSkin {
  id: string;
  /** 화면 단계에서 CSS 변수로 쓴다 (--hts-frame 등) */
  colors: Record<'frame' | 'panel' | 'bevelLight' | 'bevelDark' | 'text' | 'titleBar' | 'titleText' | 'rowAlt', string>;
}

export interface EraTheme {
  dogStage: DogStage;
  livingRoomVariant: string;
  workshopVariant: string;
  tvVariant: string;
  htsSkin: HtsSkin;
}

export const ERA_THEMES = eraThemeData.eras as Record<string, EraTheme>;

/** 시대 id의 디자인. 없는 시대면 2000년대 디자인 */
export function eraThemeFor(eraId: string): EraTheme {
  return ERA_THEMES[eraId] ?? ERA_THEMES['2000s']!;
}
