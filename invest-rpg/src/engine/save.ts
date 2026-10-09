// 세이브 데이터 형태 (저장 파일에 담을 내용).
// 실제 저장(기기 저장소 쓰기)은 화면/앱 쪽 일이고, 엔진은 데이터 모양과 만들기·되살리기 함수만 제공한다.
//
// 현재 범위: 튜토리얼 완료 여부 + 게임 진행(시대 순번, 그 시대 시작 자금, 시대별 추첨 결과).
// 시대 중간 상태(가격·보유 종목·난수 상태)는 아직 저장하지 않는다 → 불러오면 그 시대의 처음부터 같은 추첨으로 다시 시작.

import type { Era } from '../data/schema.ts';
import type { GameConfig } from './config.ts';
import type { EraDraw } from './eraDraw.ts';
import { Game } from './game.ts';
import type { TelemetrySink } from './telemetry.ts';

export const SAVE_VERSION = 1;

export interface GameSnapshot {
  seed: number;
  /** 진행 중인 시대 순번 */
  eraIndex: number;
  /** 그 시대를 시작할 때의 자금 */
  eraStartCash: number;
  /** 시대 id → 추첨 결과 */
  draws: Record<string, EraDraw>;
}

export interface SaveData {
  version: number;
  /** 튜토리얼을 끝냈는가 (게임 첫 진입 때 한 번만 보여주기 위함) */
  tutorialCompleted: boolean;
  game: GameSnapshot | null;
}

export function createSaveData(): SaveData {
  return { version: SAVE_VERSION, tutorialCompleted: false, game: null };
}

export function markTutorialCompleted(save: SaveData): SaveData {
  return { ...save, tutorialCompleted: true };
}

/** 설정 화면의 "튜토리얼 다시 보기" */
export function resetTutorial(save: SaveData): SaveData {
  return { ...save, tutorialCompleted: false };
}

export function snapshotGame(game: Game): GameSnapshot {
  return { seed: game.seed, eraIndex: game.eraIndex, eraStartCash: game.eraStartCash, draws: { ...game.draws } };
}

export function saveGame(save: SaveData, game: Game): SaveData {
  return { ...save, game: snapshotGame(game) };
}

/** 저장된 진행을 되살린다: 같은 시대를 같은 추첨·같은 시드로 처음부터 */
export function restoreGame(
  save: SaveData, eras: readonly Era[], config?: Partial<GameConfig>, options: { telemetry?: TelemetrySink } = {},
): Game | null {
  if (!save.game) return null;
  const g = save.game;
  return new Game({
    eras,
    seed: g.seed,
    startEraIndex: g.eraIndex,
    startCash: g.eraStartCash,
    draws: g.draws,
    ...(config ? { config } : {}),
    ...(options.telemetry ? { telemetry: options.telemetry, restored: true } : {}),
  });
}
