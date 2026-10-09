// 밸런스 시뮬레이터 함수 모음 (실행은 scripts/sim.ts).
//
// 전략 (모두 뉴스의 "방향"만 쓴다. 영향 크기·배율은 모른다고 가정)
//   random       : 1분마다 무작위로 사거나 판다
//   hold         : 시작할 때 활성 종목을 고르게 사서 끝까지 보유
//   delayedFollow: 지연 추종. 뉴스가 반영된 뒤(틱 k+1) 호재 종목을 사고, 다음 뉴스 발표 때 판다 (사람이 할 수 있는 추종)
//   fastFollow   : 초고속 추종. 발표 틱(k) 가격에 바로 산다 (사람이 따라 할 수 없는 이론상 상한)
//   sentiment    : 긍정 분위기 테마만 사서 보유
//   antiSentiment: 부정 분위기 테마만 사서 보유
//   leanForward  : 잠정 뉴스가 뜨면 단서(leansTo) 쪽 결과의 호재 종목을 미리 사고, 결과 반영 직후 판다
//   leanReverse  : 잠정 뉴스의 반대쪽 결과에 건다
// (참고용, 목표 없음) 사람이 실제로 할 법한 "몰빵" 변형
//   fastTop      : 발표 즉시 가장 큰 호재 테마 1개에 전액
//   delayedTop   : 반영 뒤(5초 뒤) 가장 큰 호재 테마 1개에 전액

import type { Era, News } from '../src/data/schema.ts';
import type { GameConfig } from '../src/engine/config.ts';
import { Game } from '../src/engine/game.ts';
import type { ScheduledNews } from '../src/engine/newsEngine.ts';
import { createRng, deriveSeed, type Rng } from '../src/engine/rng.ts';
import type { TelemetrySink } from '../src/engine/telemetry.ts';

export type Strategy =
  | 'random' | 'hold' | 'delayedFollow' | 'fastFollow' | 'sentiment' | 'antiSentiment' | 'leanForward' | 'leanReverse'
  | 'fastTop' | 'delayedTop';

export const STRATEGIES: Strategy[] = [
  'random', 'hold', 'delayedFollow', 'fastFollow', 'sentiment', 'antiSentiment', 'leanForward', 'leanReverse',
];

/** 목표 없이 참고로만 보는 전략 */
export const REFERENCE_STRATEGIES: Strategy[] = ['fastTop', 'delayedTop'];

export const STRATEGY_LABEL: Record<Strategy, string> = {
  random: '무작위 매매',
  hold: '균등 매수 후 보유',
  delayedFollow: '지연 추종',
  fastFollow: '초고속 추종',
  sentiment: '분위기 전략',
  antiSentiment: '역분위기',
  leanForward: '잠정 정방향',
  leanReverse: '잠정 역방향',
  fastTop: '초고속 몰빵',
  delayedTop: '지연 몰빵',
};

interface Trader {
  onStart(game: Game): void;
  /** 매 틱 진행 직후 */
  onTick(game: Game, tick: number): void;
  /** 뉴스가 발표된 틱 직후 (발표 틱 가격) */
  onNews(game: Game, s: ScheduledNews): void;
}

function sellAll(game: Game) {
  for (const h of game.account.getHoldings()) game.sell(h.stockId, h.quantity);
}

/** 테마 id들을 고르게, 한 주씩 돌아가며 산다 (정수 주 단위라 금액을 그냥 나누면 0주가 되기 쉬움) */
function buyEvenly(game: Game, themeIds: string[]) {
  const stocks = game.activeStocks.filter((s) => themeIds.includes(s.themeId));
  if (stocks.length === 0) return;
  const qty = new Map<string, number>();
  const spent = new Map<string, number>();
  let budget = game.account.cash;
  for (;;) {
    stocks.sort((a, b) => (spent.get(a.id) ?? 0) - (spent.get(b.id) ?? 0));
    const s = stocks.find((x) => game.getPrice(x.id) * (1 + game.config.feeRate) <= budget);
    if (!s) break;
    const cost = game.getPrice(s.id) * (1 + game.config.feeRate);
    budget -= cost;
    spent.set(s.id, (spent.get(s.id) ?? 0) + cost);
    qty.set(s.id, (qty.get(s.id) ?? 0) + 1);
  }
  for (const [id, q] of qty) game.buy(id, q);
}

const positives = (news: News) => news.effects.filter((e) => e.impact > 0).map((e) => e.themeId);
/** 가장 큰 호재 테마 1개 (없으면 빈 배열) */
const topPositive = (news: News) => {
  const best = [...news.effects].filter((e) => e.impact > 0).sort((a, b) => b.impact - a.impact)[0];
  return best ? [best.themeId] : [];
};

function leanNews(era: Era, game: Game, storyId: string, forward: boolean): News | undefined {
  const story = era.stories.find((s) => s.id === storyId);
  if (!story) return undefined;
  const id = forward ? story.leansTo : story.outcomes.find((o) => o.newsId !== story.leansTo)!.newsId;
  const n = story.news.find((x) => x.id === id);
  if (!n) return undefined;
  const active = new Set(game.activeThemes.map((t) => t.id));
  return { ...n, effects: n.effects.filter((e) => active.has(e.themeId)) };
}

export function makeTrader(strategy: Strategy, seed: number, era: Era): Trader {
  const noop = () => {};
  switch (strategy) {
    case 'random': {
      const rng: Rng = createRng(deriveSeed(seed, 'random-trader'));
      return {
        onStart: noop,
        onNews: noop,
        onTick(game, tick) {
          if (tick % 12 !== 0) return;
          const holdings = game.account.getHoldings();
          if (holdings.length > 0 && rng.next() < 0.5) {
            const h = holdings[rng.int(0, holdings.length - 1)]!;
            game.sell(h.stockId, h.quantity);
          } else {
            const stock = game.activeStocks[rng.int(0, game.activeStocks.length - 1)]!;
            const qty = Math.floor((game.account.cash * (0.2 + rng.next() * 0.3)) / (game.getPrice(stock.id) * 1.01));
            if (qty > 0) game.buy(stock.id, qty);
          }
        },
      };
    }
    case 'hold':
    case 'sentiment':
    case 'antiSentiment':
      return {
        onStart(game) {
          const want = strategy === 'hold' ? null : strategy === 'sentiment' ? 'positive' : 'negative';
          buyEvenly(game, game.activeThemes.filter((t) => !want || t.sentiment === want).map((t) => t.id));
        },
        onTick: noop,
        onNews: noop,
      };
    case 'fastFollow':
    case 'fastTop':
      return {
        onStart: noop,
        onTick: noop,
        onNews(game, s) {
          sellAll(game);
          buyEvenly(game, strategy === 'fastTop' ? topPositive(s.news) : positives(s.news));
        },
      };
    case 'delayedFollow':
    case 'delayedTop': {
      let pending: ScheduledNews | null = null;
      return {
        onStart: noop,
        onNews(game, s) {
          sellAll(game);
          pending = s;
        },
        onTick(game, tick) {
          if (pending && tick === pending.tick + game.config.newsReactionTicks) {
            buyEvenly(game, strategy === 'delayedTop' ? topPositive(pending.news) : positives(pending.news));
            pending = null;
          }
        },
      };
    }
    case 'leanForward':
    case 'leanReverse': {
      let releaseAt = -1;
      return {
        onStart: noop,
        onNews(game, s) {
          if (s.kind === 'tentative') {
            const target = leanNews(era, game, s.storyId!, strategy === 'leanForward');
            if (target) buyEvenly(game, positives(target));
          } else if (s.kind === 'outcome') {
            releaseAt = s.tick + game.config.newsReactionTicks;
          }
        },
        onTick(game, tick) {
          if (tick === releaseAt) {
            sellAll(game);
            releaseAt = -1;
          }
        },
      };
    }
  }
}

export interface PlayResult {
  returnPct: number;
  coreCount: number;
  usableStories: number;
}

export function play(
  era: Era, strategy: Strategy, seed: number, config: Partial<GameConfig> = {}, telemetry?: TelemetrySink,
): PlayResult {
  const game = new Game({ eras: [era], seed, config, ...(telemetry ? { telemetry, telemetryConsent: true } : {}) });
  const trader = makeTrader(strategy, seed, era);
  trader.onStart(game);
  while (game.phase !== 'era-ended') {
    const r = game.advanceTick();
    if (!r.advanced) continue;
    if (r.settlement) break;
    if (r.news) trader.onNews(game, r.news);
    trader.onTick(game, r.tick);
  }
  const core = new Set(era.themes.filter((t) => t.relevance === 'core').map((t) => t.id));
  return {
    returnPct: game.settlements[0]!.returnPct,
    coreCount: game.draw.activeThemeIds.filter((id) => core.has(id)).length,
    usableStories: game.draw.usableStories,
  };
}

export function quantile(sorted: number[], q: number): number {
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))]!;
}

export function summarize(values: number[]) {
  const s = [...values].sort((a, b) => a - b);
  return { median: quantile(s, 0.5), p10: quantile(s, 0.1), p90: quantile(s, 0.9) };
}

/** 게임 시드 seedOffset+1 ~ seedOffset+seeds 로 여러 판을 돌린다 (offset을 바꾸면 독립된 반복 실험) */
export function runMany(
  era: Era, strategy: Strategy, seeds: number, config: Partial<GameConfig> = {}, seedOffset = 0,
): PlayResult[] {
  return Array.from({ length: seeds }, (_, i) => play(era, strategy, seedOffset + i + 1, config));
}

/** 전략별 목표 중앙값 범위 [하한, 상한] (기획서 표) */
export const TARGET_RANGE: Partial<Record<Strategy, readonly [number, number]>> = {
  random: [-10, 5],
  hold: [-10, 20],
  delayedFollow: [-5, 15],
  fastFollow: [30, 80],
  sentiment: [5, 40],
  antiSentiment: [-40, -5],
  leanForward: [40, 120],
  leanReverse: [-Infinity, 0],
};

export const targetLabel = (range: readonly [number, number] | undefined) => {
  if (!range) return '(참고)';
  const [lo, hi] = range;
  return lo === -Infinity ? `${hi}% 미만` : `${lo > 0 ? '+' : ''}${lo}% ~ ${hi > 0 ? '+' : ''}${hi}%`;
};

export const inTarget = (s: Strategy, v: number) => {
  const t = TARGET_RANGE[s];
  return t ? v >= t[0] && v <= t[1] : true;
};

export const fmt = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`.padStart(9);
