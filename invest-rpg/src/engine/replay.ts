// 리플레이: 플레이 기록(텔레메트리)의 매매만으로 판 전체를 똑같이 다시 돌린다.
//
// 가격·뉴스는 시드로 정해지고 플레이어의 매매에 영향받지 않으므로,
// game_start(시드·시작 자금) + trade(언제 무엇을 몇 주) 만 있으면 같은 결과가 다시 나온다.
// 쓰임새
// - 기록이 맞는지 검증 (리플레이 결과 = 기록된 era_end)
// - "이 플레이어가 그냥 들고만 있었다면?" 같은 가정 비교 (매매 목록만 바꿔서 다시 돌림)
// - 엔진 규칙을 바꾼 뒤 "옛 플레이어 행동을 새 규칙에 넣으면 수익이 어떻게 변하나" 추정
//   (단, 사람은 바뀐 가격에 다르게 반응했을 것이므로 참고용)
//
// 제한: 주문 지연 옵션(orderDelayTicks)이 꺼진 기본 설정, 본게임(main) 기록만 지원한다.

import type { Era } from '../data/schema.ts';
import type { GameConfig } from './config.ts';
import { Game } from './game.ts';
import type { EngineEventMap, TelemetryEvent } from './telemetry.ts';

export interface ReplayTrade {
  eraIndex: number;
  tick: number;
  side: 'buy' | 'sell';
  stockId: string;
  quantity: number;
}

/** 기록에서 플레이어가 직접 한 매매만 뽑는다 (시대 종료 자동 청산 제외) */
export function tradesFromEvents(events: readonly TelemetryEvent[]): ReplayTrade[] {
  const out: ReplayTrade[] = [];
  for (const e of events) {
    if (e.type !== 'trade') continue;
    const d = e.data as EngineEventMap['trade'];
    if (d.auto) continue;
    out.push({ eraIndex: e.eraIndex, tick: e.tick, side: d.side, stockId: d.stockId, quantity: d.quantity });
  }
  return out;
}

export interface ReplayResult {
  game: Game;
  /** 시대별 수익률 */
  returns: number[];
  /** 체결에 실패한 매매 수 (기록과 규칙이 어긋났다는 신호) */
  failedTrades: number;
}

/**
 * game_start 이벤트의 시드·시작 자금과 매매 목록으로 판을 다시 돌린다.
 * @param untilEraIndex 이 시대까지 (기본: 매매 기록이 있는 마지막 시대)
 */
export function replay(
  events: readonly TelemetryEvent[],
  eras: readonly Era[],
  config: Partial<GameConfig> = {},
  trades: readonly ReplayTrade[] = tradesFromEvents(events),
  untilEraIndex?: number,
): ReplayResult {
  const start = events.find((e) => e.type === 'game_start');
  if (!start) throw new Error('game_start 기록이 없음');
  const s = start.data as EngineEventMap['game_start'];
  if (s.mode !== 'main') throw new Error('본게임 기록만 리플레이할 수 있음');
  const game = new Game({ eras, seed: s.seed, config, startEraIndex: s.startEraIndex, startCash: s.startCash });
  if (game.config.orderDelayTicks > 0) throw new Error('주문 지연 옵션이 켜진 기록은 리플레이하지 않음');
  const lastEra = untilEraIndex ?? Math.max(s.startEraIndex, ...trades.map((t) => t.eraIndex));
  const queue = [...trades].sort((a, b) => a.eraIndex - b.eraIndex || a.tick - b.tick);
  let failedTrades = 0;
  const returns: number[] = [];

  for (;;) {
    while (queue.length > 0 && queue[0]!.eraIndex === game.eraIndex && queue[0]!.tick === game.tick) {
      const t = queue.shift()!;
      const r = t.side === 'buy' ? game.buy(t.stockId, t.quantity) : game.sell(t.stockId, t.quantity);
      if (!r.ok) failedTrades++;
    }
    const r = game.advanceTick();
    if (r.advanced && r.settlement) {
      returns.push(r.settlement.returnPct);
      if (game.eraIndex >= lastEra || !game.hasNextEra) break;
      game.startNextEra();
    }
  }
  return { game, returns, failedTrades };
}
