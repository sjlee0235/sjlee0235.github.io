// 밸런스 시뮬레이터 함수 모음 (실행은 scripts/sim.ts).
// 여러 전략을 시드 200개로 돌려 시대당 수익률 분포를 본다.
// 실행: npm run sim              (기본: 시드 200개, 결과표 + 조정 수단별 효과표)
//       npm run sim -- 50        (시드 50개로 빠르게)
//
// 전략 (모두 뉴스의 "방향"만 쓴다. 영향 크기나 배율은 모른다고 가정)
//   random : 1분마다 무작위로 사거나 판다
//   follow : 즉시 추종. 뉴스가 뜨면(연습은 '확인' 직후) 1틱 안에 갖고 있던 걸 팔고, 호재 테마 종목을 똑같이 나눠 산다
//   hold   : 시작할 때 20종목을 똑같이 나눠 사서 끝까지 보유
//   learned: (실전만) follow + 낌새 뉴스에서 실제 역사 쪽 결과에 미리 걸고 결과 반영까지 보유,
//            시장 전체 악재 뉴스에서는 절반만 투자

import type { Era, News } from '../src/data/schema.ts';
import type { GameConfig, GameMode } from '../src/engine/config.ts';
import { Game } from '../src/engine/game.ts';
import type { ScheduledNews } from '../src/engine/newsEngine.ts';
import { createRng, deriveSeed, type Rng } from '../src/engine/rng.ts';

export type Strategy = 'random' | 'follow' | 'hold' | 'learned';

interface Trader {
  onStart(game: Game): void;
  onTick(game: Game, tick: number): void;
  /** 뉴스를 본 직후 (실전: 뉴스가 뜬 틱, 연습: '확인' 직후) */
  onNews(game: Game, s: ScheduledNews): void;
}

function sellAll(game: Game, except: ReadonlySet<string> = new Set()) {
  for (const h of game.account.getHoldings()) if (!except.has(h.stockId)) game.sell(h.stockId, h.quantity);
}

/**
 * 테마별 점수 비율대로 cash × fraction 을 나눠 산다.
 * 주식은 정수 단위라 금액을 그냥 나누면 한 주도 못 사는 경우가 많아서,
 * "지금까지 쓴 돈 ÷ 점수"가 가장 작은 종목부터 한 주씩 돌아가며 산다.
 */
function buyByScore(game: Game, scores: Map<string, number>, fraction: number) {
  const targets = [...scores]
    .filter(([, v]) => v > 0)
    .map(([themeId, weight]) => ({ stock: game.era.stocks.find((s) => s.themeId === themeId), weight, spent: 0 }))
    .filter((t): t is { stock: NonNullable<typeof t.stock>; weight: number; spent: number } => t.stock !== undefined);
  if (targets.length === 0) return;
  const qty = new Map<string, number>();
  let budget = game.account.cash * fraction;
  for (;;) {
    targets.sort((a, b) => a.spent / a.weight - b.spent / b.weight);
    const t = targets.find((x) => game.getPrice(x.stock.id) * (1 + game.config.feeRate) <= budget);
    if (!t) break;
    const cost = game.getPrice(t.stock.id) * (1 + game.config.feeRate);
    t.spent += cost;
    budget -= cost;
    qty.set(t.stock.id, (qty.get(t.stock.id) ?? 0) + 1);
  }
  for (const [id, q] of qty) game.buy(id, q);
}

/** 뉴스 하나에서 테마별 방향 점수 (호재 +1, 악재 -1) */
export function directions(news: News): Map<string, number> {
  const m = new Map<string, number>();
  for (const e of news.effects) m.set(e.themeId, (m.get(e.themeId) ?? 0) + Math.sign(e.impact));
  return m;
}

export function makeTrader(strategy: Strategy, seed: number, era: Era): Trader {
  switch (strategy) {
    case 'random': {
      const rng: Rng = createRng(deriveSeed(seed, 'random-trader'));
      return {
        onStart() {},
        onNews() {},
        onTick(game, tick) {
          if (tick % 12 !== 0) return;
          const holdings = game.account.getHoldings();
          if (holdings.length > 0 && rng.next() < 0.5) {
            const h = holdings[rng.int(0, holdings.length - 1)]!;
            game.sell(h.stockId, h.quantity);
          } else {
            const stock = era.stocks[rng.int(0, era.stocks.length - 1)]!;
            const budget = game.account.cash * (0.2 + rng.next() * 0.3);
            const qty = Math.floor(budget / (game.getPrice(stock.id) * 1.01));
            if (qty > 0) game.buy(stock.id, qty);
          }
        },
      };
    }
    case 'follow':
      return {
        onStart() {},
        onTick() {},
        onNews(game, s) {
          sellAll(game);
          buyByScore(game, directions(s.news), 1);
        },
      };
    case 'hold':
      return {
        onStart(game) {
          buyByScore(game, new Map(era.themes.map((t) => [t.id, 1])), 1);
        },
        onTick() {},
        onNews() {},
      };
    case 'learned':
      // follow와 같지만, 낌새 뉴스에서는 실제 역사 쪽 결과의 방향까지 더해서 미리 걸고,
      // 시장 전체 악재 뉴스에서는 절반만 투자한다
      return {
        onStart() {},
        onTick() {},
        onNews(game, s) {
          sellAll(game);
          const scores = directions(s.news);
          if (s.kind === 'signal') {
            const story = era.storylines.find((x) => x.id === s.storylineId)!;
            const hist = story.outcomes.find((o) => o.isHistorical)!;
            const outcome = story.news.find((n) => n.id === hist.newsId)!;
            for (const [k, v] of directions(outcome)) scores.set(k, (scores.get(k) ?? 0) + v);
          }
          const net = [...scores.values()].reduce((a, b) => a + b, 0);
          const fraction = s.news.category === 'market' && net < 0 ? 0.5 : 1;
          buyByScore(game, scores, fraction);
        },
      };
  }
}

export function play(era: Era, mode: GameMode, strategy: Strategy, seed: number, config: Partial<GameConfig>): number {
  const game = new Game({ eras: [era], seed, mode, config });
  const trader = makeTrader(strategy, seed, era);
  trader.onStart(game);
  while (game.phase !== 'era-ended') {
    if (game.phase === 'news') {
      const s = game.confirmNews();
      trader.onNews(game, s);
    }
    const r = game.advanceTick();
    if (!r.advanced) continue;
    if (r.news && mode === 'real') trader.onNews(game, r.news);
    if (!r.settlement) trader.onTick(game, r.tick);
  }
  return game.settlements[0]!.returnPct;
}

export function quantile(sorted: number[], q: number): number {
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))]!;
}

export function summarize(values: number[]) {
  const s = [...values].sort((a, b) => a - b);
  return { median: quantile(s, 0.5), p10: quantile(s, 0.1), p90: quantile(s, 0.9) };
}

export const fmt = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`.padStart(9);

export function run(era: Era, mode: GameMode, strategy: Strategy, seeds: number, config: Partial<GameConfig> = {}) {
  const values = Array.from({ length: seeds }, (_, i) => play(era, mode, strategy, i + 1, config));
  return summarize(values);
}

/** 뉴스 없는 구간의 0.0% 틱 비율 */
export function stallShare(era: Era, seeds: number): number {
  let zero = 0;
  let total = 0;
  for (let seed = 1; seed <= seeds; seed++) {
    const game = new Game({ eras: [era], seed, mode: 'real' });
    while (game.phase !== 'era-ended') {
      const r = game.advanceTick();
      if (!r.advanced) continue;
      for (const c of r.changes) {
        if (c.cause !== 'random') continue;
        total++;
        if (c.rate === 0) zero++;
      }
    }
  }
  return zero / total;
}

