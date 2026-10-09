// 세이브 데이터 형태 (저장 파일에 담을 내용).
// 실제 저장(기기 저장소 쓰기)은 화면/앱 쪽 일이고, 엔진은 데이터 모양과 만들기·되살리기 함수만 제공한다.
//
// 담는 것
// - 튜토리얼 완료 여부, 플레이 기록 동의 여부
// - 게임 진행: 시드, 시대 순번·id, 그 시대 시작 자금, 시대별 추첨 결과, 지난 시대 수익률
// - 버전: 엔진 버전, 콘텐츠 버전(시대 데이터 지문), 밸런스 지문(설정값 지문)
// - 이번 시대에 한 행동(매매·입금) + 저장 순간의 상태 스냅샷(틱, 종목 현재가, 계좌·보유 종목, 즐겨찾기, 수익률 진행)
//
// 불러오기 정책
// 1) 버전이 모두 같으면: 같은 시드로 처음부터 행동을 다시 넣으며 저장한 틱까지 빨리 돌린다(리플레이).
//    결과가 스냅샷과 똑같은지 상태 지문으로 확인하고 그대로 이어 한다 → status 'resumed'
// 2) 버전이 다르면(앱 업데이트로 규칙·콘텐츠·밸런스가 바뀜): 같은 시드라도 가격이 달라지므로 리플레이하지 않는다.
//    스냅샷의 가격으로 그 시대를 자동 정산(전량 청산)하고, 다음 시대부터 새 버전을 적용한다 → 'settled_on_version_change'
//    (같은 버전인데 리플레이 결과가 스냅샷과 다를 때도 같은 방식으로 정산한다. reason = 'replay-mismatch')
// 3) 옛 형식 세이브(상태 스냅샷 없음): 그 시대를 새 시드로 처음부터 → 'restarted_legacy'
//
// 저장 빈도는 화면이 정한다: game.pendingSaveReasons가 비어 있지 않으면 saveGame()을 부른다.
// 엔진은 매매·입금·뉴스 발표·백그라운드 전환·30초 경과·시대 종료 때 저장이 필요하다고 알린다.
// → 강제 종료 후 불러와서 "방금 본 뉴스"를 되돌리는 구멍이 30초 이내로 줄어든다.

import type { Era } from '../data/schema.ts';
import { Account } from './account.ts';
import { makeConfig, type GameConfig } from './config.ts';
import type { EraDraw } from './eraDraw.ts';
import { settleAccount, sortEras, type EraSettlement } from './eraManager.ts';
import { Game, type GameStateSnapshot, type SavedAction } from './game.ts';
import { applyAction } from './replay.ts';
import { deriveSeed } from './rng.ts';
import { balanceHash, ENGINE_VERSION, fingerprint, type TelemetrySink } from './telemetry.ts';

export const SAVE_VERSION = 2;

export interface GameSnapshot {
  seed: number;
  /** 진행 중인 시대 순번·id·순서값 */
  eraIndex: number;
  eraId: string;
  eraOrder: number;
  /** 그 시대를 시작할 때의 자금 */
  eraStartCash: number;
  /** 시대 id → 추첨 결과 */
  draws: Record<string, EraDraw>;
  /** 저장할 때의 버전들 */
  engineVersion: string;
  contentVersion: string;
  balanceHash: string;
  /** 지금 시대 이전에 끝난 시대들의 수익률 % */
  pastEraReturns: number[];
  /** 지금 시대가 이미 끝났다면 그 수익률 % (진행 중이면 null) */
  currentEraReturnPct: number | null;
  /** 이번 시대에 한 행동 (리플레이용) */
  actions: SavedAction[];
  /** 저장 순간 상태 (버전이 바뀌었을 때 정산용) */
  state: GameStateSnapshot;
  /** 저장 순간 상태 지문 (리플레이 결과 확인용) */
  stateHash: string;
}

export interface SaveData {
  version: number;
  /** 튜토리얼을 끝냈는가 (게임 첫 진입 때 한 번만 보여주기 위함) */
  tutorialCompleted: boolean;
  /** 플레이 기록 동의 (기본 false) */
  telemetryConsent: boolean;
  game: GameSnapshot | null;
}

export function createSaveData(): SaveData {
  return { version: SAVE_VERSION, tutorialCompleted: false, telemetryConsent: false, game: null };
}

export function markTutorialCompleted(save: SaveData): SaveData {
  return { ...save, tutorialCompleted: true };
}

/** 설정 화면의 "튜토리얼 다시 보기" */
export function resetTutorial(save: SaveData): SaveData {
  return { ...save, tutorialCompleted: false };
}

export function setTelemetryConsent(save: SaveData, on: boolean): SaveData {
  return { ...save, telemetryConsent: on };
}

const contentCache = new WeakMap<readonly Era[], string>();
/** 콘텐츠 버전 = 시대 데이터 전체의 지문. 데이터가 한 글자라도 바뀌면 달라진다 */
export function contentVersion(eras: readonly Era[]): string {
  let v = contentCache.get(eras);
  if (!v) {
    v = fingerprint(sortEras(eras));
    contentCache.set(eras, v);
  }
  return v;
}

/** 게임 상태 지문: 틱, 가격, 계좌, 보유 종목, 즐겨찾기, 수익률 진행, 뜬 뉴스, 끝난 시대 수익률 */
export function stateHash(game: Game): string {
  return fingerprint({
    eraIndex: game.eraIndex,
    state: game.captureState(),
    shown: game.shownNews.map((s) => s.news.id),
    returns: game.eraReturns,
  });
}

export function snapshotGame(game: Game): GameSnapshot {
  const ended = game.phase === 'era-ended' || game.phase === 'finished';
  const returns = game.eraReturns;
  return {
    seed: game.seed,
    eraIndex: game.eraIndex,
    eraId: game.era.id,
    eraOrder: game.era.order,
    eraStartCash: game.eraStartCash,
    draws: { ...game.draws },
    engineVersion: ENGINE_VERSION,
    contentVersion: contentVersion(game.eras),
    balanceHash: balanceHash(game.config),
    pastEraReturns: ended ? returns.slice(0, -1) : returns,
    currentEraReturnPct: ended ? (returns.at(-1) ?? null) : null,
    actions: game.eraActions.map((a) => ({ ...a })),
    state: game.captureState(),
    stateHash: stateHash(game),
  };
}

/** 지금 상태를 세이브에 담고, 게임에 "저장했음"을 알린다 */
export function saveGame(save: SaveData, game: Game): SaveData {
  const snapshot = snapshotGame(game);
  game.markSaved();
  return { ...save, version: SAVE_VERSION, game: snapshot };
}

export type RestoreResult =
  | { status: 'resumed'; game: Game }
  | {
      status: 'settled_on_version_change';
      /** 다음 시대 게임 (마지막 시대였으면 null) */
      game: Game | null;
      /** 스냅샷 가격으로 정산한 결과 (이미 끝난 시대였으면 null) */
      settlement: EraSettlement | null;
      reason: 'version' | 'replay-mismatch';
    }
  | { status: 'restarted_legacy'; game: Game };

export interface RestoreOptions {
  telemetry?: TelemetrySink;
}

/** 저장된 진행을 되살린다 (위 "불러오기 정책" 참고). 저장된 게임이 없으면 null */
export function restoreGame(
  save: SaveData, eras: readonly Era[], config?: Partial<GameConfig>, options: RestoreOptions = {},
): RestoreResult | null {
  const g = save.game;
  if (!g) return null;
  const consent = save.telemetryConsent ?? false;
  const finish = <T extends RestoreResult>(r: T): T => {
    if (options.telemetry && r.game) r.game.attachTelemetry(options.telemetry, true);
    return r;
  };

  // 3) 옛 형식
  if (save.version < 2 || !g.state) {
    const game = new Game({
      eras, seed: deriveSeed(g.seed, 'restart', g.eraIndex), startEraIndex: g.eraIndex,
      startCash: g.eraStartCash, draws: g.draws, telemetryConsent: consent, ...(config ? { config } : {}),
    });
    return finish({ status: 'restarted_legacy', game });
  }

  const cfg = makeConfig(config);
  const sameVersion = g.engineVersion === ENGINE_VERSION
    && g.contentVersion === contentVersion(eras)
    && g.balanceHash === balanceHash(cfg);

  // 1) 같은 버전: 리플레이로 이어 하기
  if (sameVersion) {
    const game = new Game({
      eras, seed: g.seed, startEraIndex: g.eraIndex, startCash: g.eraStartCash, draws: g.draws,
      pastEraReturns: g.pastEraReturns, telemetryConsent: consent, ...(config ? { config } : {}),
    });
    if (fastForward(game, g.state.tick, g.actions)) {
      game.restoreFavorites(g.state.favorites);
      if (stateHash(game) === g.stateHash) {
        game.markSaved();
        return finish({ status: 'resumed', game });
      }
    }
    return finish(settleFromSnapshot(g, eras, cfg, config, consent, 'replay-mismatch'));
  }

  // 2) 버전이 다름: 스냅샷 가격으로 정산하고 다음 시대부터
  return finish(settleFromSnapshot(g, eras, cfg, config, consent, 'version'));
}

function settleFromSnapshot(
  g: GameSnapshot,
  eras: readonly Era[],
  cfg: GameConfig,
  config: Partial<GameConfig> | undefined,
  consent: boolean,
  reason: 'version' | 'replay-mismatch',
): Extract<RestoreResult, { status: 'settled_on_version_change' }> {
  let settlement: EraSettlement | null = null;
  let cash: number;
  let returns: number[];
  if (g.currentEraReturnPct !== null) {
    // 이미 정산이 끝난 시대 (다음 시대로 넘어가기 전에 저장됨)
    cash = g.state.cash;
    returns = [...g.pastEraReturns, g.currentEraReturnPct];
  } else {
    const account = new Account(0, cfg.feeRate);
    account.restoreState(g.state);
    settlement = {
      ...settleAccount(g.eraId, g.eraStartCash, account, new Map(Object.entries(g.state.prices)), g.state.tick, g.state.twr),
      settledOnVersionChange: true,
    };
    cash = settlement.endAssets;
    returns = [...g.pastEraReturns, settlement.returnPct];
  }

  // 다음 시대: 같은 id의 시대 다음 순서. id가 사라졌으면 순서값(order)으로 찾는다
  const sorted = sortEras(eras);
  const idx = sorted.findIndex((e) => e.id === g.eraId);
  const nextIndex = idx >= 0 ? idx + 1 : sorted.findIndex((e) => e.order > g.eraOrder);
  const game = nextIndex >= 0 && nextIndex < sorted.length
    ? new Game({
        eras, seed: g.seed, startEraIndex: nextIndex, startCash: cash, pastEraReturns: returns,
        telemetryConsent: consent, ...(config ? { config } : {}),
      })
    : null;
  return { status: 'settled_on_version_change', game, settlement, reason };
}

/** 행동을 다시 넣으며 tick까지 빨리 돌린다. 행동이 하나라도 어긋나면 false */
function fastForward(game: Game, tick: number, actions: readonly SavedAction[]): boolean {
  if (game.config.orderDelayTicks > 0) return false;
  const queue = [...actions].sort((a, b) => a.tick - b.tick);
  for (;;) {
    while (queue.length > 0 && queue[0]!.tick === game.tick) {
      if (!applyAction(game, queue.shift()!)) return false;
    }
    if (game.tick >= tick || game.phase !== 'running') break;
    game.advanceTick();
  }
  return queue.length === 0 && game.tick === tick;
}
