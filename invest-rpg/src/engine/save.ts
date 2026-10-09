// 세이브 데이터 형태 (저장 파일에 담을 내용).
// 실제 저장(기기 저장소 쓰기)은 화면/앱 쪽 일이고, 엔진은 데이터 모양과 만들기·되살리기 함수만 제공한다.
//
// 담는 것: 튜토리얼 완료 여부 + 게임 진행(시드, 시대 순번, 그 시대 시작 자금, 시대별 추첨 결과)
//          + 시대 중간 상태(지금 틱, 이번 시대에 한 매매, 관심 종목, 엔진 버전).
//
// 시대 중간 상태는 가격을 저장하지 않고 "매매 기록"으로 되살린다.
// 가격·뉴스는 시드로 정해지고 매매에 영향받지 않으므로, 같은 시드로 처음부터 매매를 다시 넣으며
// 저장한 틱까지 빨리 돌리면 똑같은 상태가 된다 (리플레이).
// → 불러오기로 이미 본 뉴스를 미리 알고 다시 하거나, 손해 본 시대를 처음부터 다시 하는 것이 불가능하다.
//
// 엔진 버전이 바뀌어(앱 업데이트) 같은 시드라도 가격이 달라지면 되살릴 수 없으므로,
// 그때는 그 시대를 "새 시드로" 처음부터 다시 시작한다 (시작 자금은 그대로).

import type { Era } from '../data/schema.ts';
import type { GameConfig } from './config.ts';
import type { EraDraw } from './eraDraw.ts';
import { Game, type SavedTrade } from './game.ts';
import { deriveSeed } from './rng.ts';
import { ENGINE_VERSION, type TelemetrySink } from './telemetry.ts';

export const SAVE_VERSION = 1;

export interface GameSnapshot {
  seed: number;
  /** 진행 중인 시대 순번 */
  eraIndex: number;
  /** 그 시대를 시작할 때의 자금 */
  eraStartCash: number;
  /** 시대 id → 추첨 결과 */
  draws: Record<string, EraDraw>;
  /** 저장할 때의 엔진 버전 (다르면 시대 중간 상태를 되살리지 않음). 옛 세이브에는 없음 */
  engineVersion?: string;
  /** 저장할 때의 틱 (0 = 시대 시작) */
  tick?: number;
  /** 이번 시대에 한 매매 (되살리기용) */
  trades?: SavedTrade[];
  favorites?: string[];
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
  return {
    seed: game.seed,
    eraIndex: game.eraIndex,
    eraStartCash: game.eraStartCash,
    draws: { ...game.draws },
    engineVersion: ENGINE_VERSION,
    tick: game.tick,
    trades: game.eraTrades.map((t) => ({ ...t })),
    favorites: [...game.favorites],
  };
}

export function saveGame(save: SaveData, game: Game): SaveData {
  return { ...save, game: snapshotGame(game) };
}

/**
 * 저장된 진행을 되살린다.
 * - 같은 엔진 버전: 저장한 틱까지 매매를 다시 넣으며 빨리 돌려 그대로 이어 한다.
 * - 엔진 버전이 다르거나 되살리기에 실패: 그 시대를 새 시드로 처음부터 (같은 추첨, 같은 시작 자금).
 */
export function restoreGame(
  save: SaveData, eras: readonly Era[], config?: Partial<GameConfig>, options: { telemetry?: TelemetrySink } = {},
): Game | null {
  if (!save.game) return null;
  const g = save.game;
  const make = (seed: number) => new Game({
    eras,
    seed,
    startEraIndex: g.eraIndex,
    startCash: g.eraStartCash,
    draws: g.draws,
    ...(config ? { config } : {}),
  });
  const tick = g.tick ?? 0;
  let game: Game | null = null;
  if (tick === 0) {
    game = make(g.seed);
  } else if (g.engineVersion === ENGINE_VERSION) {
    game = fastForward(make(g.seed), tick, g.trades ?? []);
  }
  // 되살릴 수 없으면 이미 본 뉴스를 다시 보지 않도록 새 시드로 그 시대를 처음부터
  game ??= make(deriveSeed(g.seed, 'restart', g.eraIndex));
  if (g.favorites && game.tick > 0) game.restoreFavorites(g.favorites);
  if (options.telemetry) game.attachTelemetry(options.telemetry);
  return game;
}

/** 매매를 다시 넣으며 tick까지 빨리 돌린다. 매매가 하나라도 어긋나면 null */
function fastForward(game: Game, tick: number, trades: readonly SavedTrade[]): Game | null {
  if (game.config.orderDelayTicks > 0) return null;
  const queue = [...trades].sort((a, b) => a.tick - b.tick);
  for (;;) {
    while (queue.length > 0 && queue[0]!.tick === game.tick) {
      const t = queue.shift()!;
      const r = t.side === 'buy' ? game.buy(t.stockId, t.quantity) : game.sell(t.stockId, t.quantity);
      if (!r.ok) return null;
    }
    if (game.tick >= tick || game.phase !== 'running') break;
    game.advanceTick();
  }
  return queue.length === 0 && game.tick === tick ? game : null;
}
