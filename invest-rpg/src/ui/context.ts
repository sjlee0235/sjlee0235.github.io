// 화면들이 함께 쓰는 것 (App이 만들어 넘긴다)

import type { Locale } from '../data/schema.ts';
import type { MusicPlayer } from '../audio/music.ts';
import type { ColorScheme } from '../engine/colors.ts';
import type { TabId } from '../engine/homeActivities.ts';
import type { PublicAdvanceResult, PublicGame } from '../engine/publicView.ts';
import type { AppEventMap, AppEventType } from '../engine/telemetry.ts';
import type { ArtEra, TimeOfDay } from './art.ts';
import type { SceneLayer } from './scene.ts';

export interface UiContext {
  readonly game: PublicGame;
  readonly music: MusicPlayer;
  /** 배경 그림 층 (App이 탭·시대·밤낮·인테리어에 맞춰 바꾼다. 화면은 칸만 바꾼다) */
  readonly scene: SceneLayer;
  locale(): Locale;
  scheme(): ColorScheme;
  /** 화면 문구 */
  t(key: string, params?: Record<string, string | number>): string;
  /** 지금 시대의 그림 시대 (2000s / 2010s / 2020s) */
  artEra(): ArtEra;
  /** 지금 밤/낮 */
  tod(): TimeOfDay;
  /** 그림 파일 주소 앞부분 (Vite BASE_URL) */
  readonly assetBase: string;
  /** 실제 시각 ms (작업실 터치 상한·강아지 연속 터치용) */
  now(): number;
  /** 화면 아래 짧은 안내 */
  toast(text: string, kind?: 'info' | 'error'): void;
  /** 저장이 필요하면 저장 */
  persist(): void;
  /** 배속을 바꿨을 때 (루프 다시 재기) */
  onSpeedChanged(): void;
  /** 인테리어 단계가 바뀌었을 때 (배경 0.4초 크로스페이드 + 번쩍임 + 코인 줄어드는 효과) */
  onInteriorChanged(): void;
  /** 작업 수입이 지급됐을 때 (코인 칩 효과) */
  onCoinsChanged(): void;
  /** 다른 탭으로 */
  goTab(tab: TabId): void;
  /** 상단 다시 그리기 */
  refreshTop(): void;
  /** 화면 좌표(무대 px)에서 상단 칩으로 글자가 날아간다 ("+3") */
  flyTo(text: string, fromX: number, fromY: number, target: 'pending' | 'coins'): void;
  track<K extends AppEventType>(type: K, data: AppEventMap[K]): void;
}

/** 탭 화면 하나 */
export interface Screen {
  readonly el: HTMLElement;
  /** 탭에 들어올 때 */
  enter(): void;
  /** 틱마다·상태가 바뀔 때 */
  update(r?: PublicAdvanceResult): void;
  /** 탭을 떠날 때 */
  leave?(): void;
  /** 배경 시트의 칸 (작업실 = 눈 수, TV = 노이즈 프레임). 없으면 0 */
  frame?(): number;
}
