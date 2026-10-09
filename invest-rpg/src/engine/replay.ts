// 리플레이: 플레이 기록(텔레메트리)의 매매만으로 판 전체를 똑같이 다시 돌린다.
//
// 가격·뉴스는 시드로 정해지고 플레이어의 매매에 영향받지 않으므로,
// game_start(시드·시작 자금) + trade(언제 무엇을 몇 주) + deposit(언제 얼마) 만 있으면 같은 결과가 다시 나온다.
// 쓰임새
// - 기록이 맞는지 검증 (리플레이 결과 = 기록된 era_end)
// - "이 플레이어가 그냥 들고만 있었다면?" 같은 가정 비교 (매매 목록만 바꿔서 다시 돌림)
// - 엔진 규칙을 바꾼 뒤 "옛 플레이어 행동을 새 규칙에 넣으면 수익이 어떻게 변하나" 추정
//   (단, 사람은 바뀐 가격에 다르게 반응했을 것이므로 참고용)
//
// 제한: 주문 지연 옵션(orderDelayTicks)이 꺼진 기본 설정, 본게임(main) 기록만 지원한다.

import type { Era } from '../data/schema.ts';
import type { GameConfig } from './config.ts';
import type { EraDraw } from './eraDraw.ts';
import { Game } from './game.ts';
import type { EngineEventMap, SavedActionData, TelemetryEvent } from './telemetry.ts';

/** 리플레이할 행동: 어느 시대, 몇 틱에 무엇을 했나 */
export type ReplayAction = SavedActionData & { eraIndex: number };

/** 기록에서 플레이어가 직접 한 행동(매매·입금)만 뽑는다 (시대 종료 자동 청산 제외) */
export function actionsFromEvents(events: readonly TelemetryEvent[]): ReplayAction[] {
  const out: ReplayAction[] = [];
  for (const e of events) {
    if (e.type === 'trade') {
      const d = e.data as EngineEventMap['trade'];
      if (d.auto) continue;
      out.push({ kind: 'trade', eraIndex: e.eraIndex, tick: e.tick, side: d.side, stockId: d.stockId, quantity: d.quantity });
    } else if (e.type === 'deposit') {
      const d = e.data as EngineEventMap['deposit'];
      out.push({ kind: 'deposit', eraIndex: e.eraIndex, tick: e.tick, amount: d.amount, source: d.source });
    }
  }
  return out;
}

export interface ReplayResult {
  game: Game;
  /** 시대별 수익률 */
  returns: number[];
  /** 실행에 실패한 행동 수 (기록과 규칙이 어긋났다는 신호) */
  failedActions: number;
}

/** 행동 하나를 게임에 적용한다. 성공하면 true */
export function applyAction(game: Game, a: SavedActionData): boolean {
  if (a.kind === 'deposit') return game.deposit(a.amount, a.source).ok;
  return (a.side === 'buy' ? game.buy(a.stockId, a.quantity) : game.sell(a.stockId, a.quantity)).ok;
}

/**
 * game_start 이벤트의 시드·시작 자금과 행동 목록으로 판을 다시 돌린다.
 * @param untilEraIndex 이 시대까지 (기본: 행동 기록이 있는 마지막 시대)
 */
export function replay(
  events: readonly TelemetryEvent[],
  eras: readonly Era[],
  config: Partial<GameConfig> = {},
  actions: readonly ReplayAction[] = actionsFromEvents(events),
  untilEraIndex?: number,
): ReplayResult {
  const start = events.find((e) => e.type === 'game_start');
  if (!start) throw new Error('game_start 기록이 없음');
  const s = start.data as EngineEventMap['game_start'];
  if (s.mode !== 'main') throw new Error('본게임 기록만 리플레이할 수 있음');
  // 추첨 결과는 기록(era_start)에 있는 그대로 쓴다
  const draws: Record<string, EraDraw> = {};
  for (const e of events) {
    if (e.type !== 'era_start') continue;
    const d = e.data as EngineEventMap['era_start'];
    draws[e.eraId] = {
      eraId: e.eraId, seed: s.seed, attempt: d.drawAttempt, activeThemeIds: d.activeThemeIds,
      usableBreaking: d.usableBreaking, usableStories: d.usableStories, ok: d.drawOk,
    };
  }
  const game = new Game({
    eras, seed: s.seed, config, startEraIndex: s.startEraIndex, startCash: s.startCash, draws,
    pastEraReturns: s.pastEraReturns ?? [],
  });
  if (game.config.orderDelayTicks > 0) throw new Error('주문 지연 옵션이 켜진 기록은 리플레이하지 않음');
  // 기록 시작 전(이어 하기·판 도중 동의) 행동도 함께 넣는다
  const prior: ReplayAction[] = (s.priorActions ?? []).map((a) => ({ ...a, eraIndex: s.startEraIndex }));
  const queue = [...prior, ...actions].sort((a, b) => a.eraIndex - b.eraIndex || a.tick - b.tick);
  const lastEra = untilEraIndex ?? Math.max(s.startEraIndex, ...queue.map((a) => a.eraIndex));
  let failedActions = 0;
  const returns: number[] = [];
  const applyDue = () => {
    while (queue.length > 0 && queue[0]!.eraIndex === game.eraIndex && queue[0]!.tick === game.tick) {
      if (!applyAction(game, queue.shift()!)) failedActions++;
    }
  };

  for (;;) {
    applyDue();
    const r = game.advanceTick();
    if (r.advanced && r.settlement) {
      returns.push(r.settlement.returnPct);
      applyDue(); // 정산 뒤 (시대 사이) 입금
      if (game.eraIndex >= lastEra || !game.hasNextEra) break;
      game.startNextEra();
    }
  }
  return { game, returns, failedActions };
}
