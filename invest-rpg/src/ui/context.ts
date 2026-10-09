// 화면들이 함께 쓰는 것 (App이 만들어 넘긴다)

import type { Locale } from '../data/schema.ts';
import type { MusicPlayer } from '../audio/music.ts';
import type { ColorScheme } from '../engine/colors.ts';
import type { PublicAdvanceResult, PublicGame } from '../engine/publicView.ts';
import type { AppEventMap, AppEventType } from '../engine/telemetry.ts';
import type { EraTheme } from '../engine/eraTheme.ts';

export interface UiContext {
  readonly game: PublicGame;
  readonly music: MusicPlayer;
  locale(): Locale;
  scheme(): ColorScheme;
  /** 화면 문구 */
  t(key: string, params?: Record<string, string | number>): string;
  /** 지금 시대의 디자인 데이터 */
  theme(): EraTheme;
  /** 픽셀 그림 정수 배율 */
  scale(): number;
  /** 그림 파일 주소 앞부분 (Vite BASE_URL) */
  readonly assetBase: string;
  /** 실제 시각 ms (작업실 터치 상한용) */
  now(): number;
  /** 화면 아래 짧은 안내 */
  toast(text: string, kind?: 'info' | 'error'): void;
  /** 저장이 필요하면 저장 */
  persist(): void;
  /** 배속을 바꿨을 때 (루프 다시 재기) */
  onSpeedChanged(): void;
  /** 다른 탭으로 */
  goTab(tab: 'living_room' | 'trading' | 'workshop' | 'tv_shopping'): void;
  /** 상단 바 다시 그리기 */
  refreshTop(): void;
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
}
