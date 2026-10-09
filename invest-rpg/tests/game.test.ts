import { describe, expect, it } from 'vitest';
import type { GameMode } from '../src/engine/config.ts';
import { Game } from '../src/engine/game.ts';
import { newsToImpacts } from '../src/engine/newsEngine.ts';
import { applyRate } from '../src/engine/priceEngine.ts';
import { effect, makeEra } from './fixtures/makeEra.ts';

const twoEras = () => [
  makeEra({ id: 'e2', order: 2, storylineCount: 4 }),
  makeEra({ id: 'e1', order: 1, storylineCount: 4 }),
];
const newGame = (mode: GameMode, seed = 1, config = {}) => new Game({ eras: twoEras(), seed, mode, config });

/** 연습 모드 팝업이 뜨면 바로 확인하면서 n틱 진행 */
function advance(game: Game, ticks: number) {
  const results = [];
  for (let i = 0; i < ticks; i++) {
    if (game.phase === 'news') game.confirmNews();
    results.push(game.advanceTick());
  }
  return results;
}

/** 시대 끝까지 진행 (팝업은 즉시 확인) */
function runToEraEnd(game: Game) {
  while (game.phase !== 'era-ended') {
    if (game.phase === 'news') game.confirmNews();
    game.advanceTick();
  }
}

const THEMES = Array.from({ length: 20 }, (_, i) => `t${i}`);
const themeOf = (game: Game, stockId: string) => game.era.stocks.find((s) => s.id === stockId)!.themeId;

describe('게임 — 시대 시작', () => {
  it('order 순으로 시작하고, 모든 종목 1,000 비트, 현금 10,000 비트, 시간이 흐르는 상태', () => {
    for (const mode of ['practice', 'real'] as const) {
      const game = newGame(mode);
      expect(game.era.id).toBe('e1');
      expect(game.account.cash).toBe(10_000);
      expect(game.phase).toBe('running');
      for (const item of game.getStockList()) expect(item.price).toBe(1000);
    }
  });
});

describe('연습 모드', () => {
  it('뉴스가 뜨면 시간이 멈추고(틱·가격 그대로), 매매할 수 없다', () => {
    const game = newGame('practice');
    let r;
    do r = game.advanceTick();
    while (!(r.advanced && r.news));
    expect(game.phase).toBe('news');
    const tick = game.tick;
    const before = game.getStockList().map((s) => s.price);
    for (let i = 0; i < 50; i++) expect(game.advanceTick()).toEqual({ advanced: false, phase: 'news' });
    expect(game.tick).toBe(tick);
    expect(game.getStockList().map((s) => s.price)).toEqual(before);
    expect(game.buy('e1-s0', 1)).toEqual({ ok: false, error: 'not-tradable' });
  });

  it("[시드 30개] '확인' 후 1틱(5초) 뒤가 아니라 2틱(10초) 뒤에 정확히 영향도×3% 반영, 1차 영향만", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const game = newGame('practice', seed);
      for (let round = 0; round < 3; round++) {
        while (game.phase !== 'news') game.advanceTick();
        const news = game.pendingNews!.news;
        expect(news.effects.every((e) => e.link === 'direct')).toBe(true);
        game.confirmNews();
        const confirmTick = game.tick;

        const r1 = game.advanceTick();
        if (!r1.advanced) throw new Error();
        expect(r1.tick).toBe(confirmTick + 1);
        expect(r1.changes.some((c) => c.cause === 'news')).toBe(false);

        const before = new Map(game.getStockList().map((s) => [s.stock.id, s.price]));
        const r2 = game.advanceTick();
        if (!r2.advanced) throw new Error();
        const impacts = newsToImpacts(news, THEMES, 10);
        for (const ch of r2.changes) {
          const impact = impacts.get(themeOf(game, ch.stockId));
          if (impact !== undefined) {
            expect(ch.cause).toBe('news');
            expect(ch.rate).toBe(impact * 30);
            expect(ch.price).toBe(applyRate(before.get(ch.stockId)!, impact * 30, 1));
          } else {
            expect(ch.cause).not.toBe('news');
          }
        }
      }
    }
  });

  it('관련 테마와 해설(getNewsGuide)을 제공한다', () => {
    const game = newGame('practice');
    while (game.phase !== 'news') game.advanceTick();
    const news = game.pendingNews!.news;
    const guide = game.getNewsGuide(news);
    expect(guide.length).toBe(news.effects.length);
    for (const [i, g] of guide.entries()) {
      const e = news.effects[i]!;
      expect(g.themeId).toBe(e.themeId);
      expect(g.direction).toBe(e.impact > 0 ? 'positive' : 'negative');
      expect(g.explanation.ko.length).toBeGreaterThan(0);
      expect(g.name.ko).toBe(game.era.themes.find((t) => t.id === e.themeId)!.name.ko);
    }
  });

  it('시장 전체 영향은 "시장 전체"로 안내된다', () => {
    const era = makeEra({ id: 'm', effectsFor: () => [effect('market', -3), effect('t0', 4)] });
    const game = new Game({ eras: [era], seed: 1, mode: 'practice' });
    while (game.phase !== 'news') game.advanceTick();
    const guide = game.getNewsGuide(game.pendingNews!.news);
    expect(guide[0]).toMatchObject({ themeId: 'market', name: { ko: '시장 전체' }, direction: 'negative' });
  });

  it('광고 보상: 1회 3,000 비트, 정산 수익률에서는 투자 수익과 구분된다', () => {
    const game = newGame('practice');
    expect(game.grantAdReward()).toEqual({ ok: true, amount: 3000, cash: 13_000 });
    runToEraEnd(game);
    const st = game.settlements[0]!;
    expect(st.deposits).toBe(3000);
    expect(st.endAssets).toBe(13_000);
    expect(st.profit).toBe(0);
    expect(st.returnPct).toBe(0); // 아무것도 안 샀으면 광고 보상이 있어도 수익률 0%
  });

  it('광고 보상 횟수 제한을 설정할 수 있다 (시대마다 초기화)', () => {
    const game = newGame('practice', 1, { adRewardMaxPerEra: 2 });
    expect(game.grantAdReward().ok).toBe(true);
    expect(game.grantAdReward().ok).toBe(true);
    expect(game.grantAdReward()).toEqual({ ok: false, error: 'ad-limit-reached' });
    runToEraEnd(game);
    game.startNextEra();
    expect(game.grantAdReward().ok).toBe(true);
  });
});

describe('실전 모드', () => {
  it('뉴스가 떠도 시간이 멈추지 않고 매매할 수 있으며, 뜬 뒤 2틱(10초)에 반영된다', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const game = newGame('real', seed);
      let r;
      do r = game.advanceTick();
      while (!(r.advanced && r.news));
      const news = r.news!.news;
      const newsTick = r.tick;
      expect(game.phase).toBe('running');
      expect(game.pendingNews).toBeNull();
      expect(game.buy('e1-s0', 1).ok).toBe(true); // 뉴스 직후 매매 가능

      const r1 = game.advanceTick();
      if (!r1.advanced) throw new Error();
      expect(r1.tick).toBe(newsTick + 1);
      expect(r1.changes.some((c) => c.cause === 'news')).toBe(false);

      const r2 = game.advanceTick();
      if (!r2.advanced) throw new Error();
      const impacts = newsToImpacts(news, THEMES, 10);
      const newsStocks = r2.changes.filter((c) => c.cause === 'news').map((c) => themeOf(game, c.stockId));
      expect(new Set(newsStocks)).toEqual(new Set(impacts.keys()));
    }
  });

  it('2차(indirect) 영향도 반영된다', () => {
    const game = newGame('real');
    const all = game.shownNews; // 아직 없음
    expect(all).toHaveLength(0);
    runToEraEnd(game);
    expect(game.shownNews.some((s) => s.news.effects.some((e) => e.link === 'indirect'))).toBe(true);
  });

  it('광고 보상은 실전 모드에서 쓸 수 없다', () => {
    expect(newGame('real').grantAdReward()).toEqual({ ok: false, error: 'not-available-in-real' });
  });
});

describe('게임 — 뉴스 일정 (시대 전체)', () => {
  for (const mode of ['practice', 'real'] as const) {
    it(`[${mode}, 시드 20개] 뉴스 간격은 게임 시간 3~6분, 중복 없음, 낌새 뒤 15분 안에 결과`, () => {
      for (let seed = 1; seed <= 20; seed++) {
        const game = newGame(mode, seed);
        runToEraEnd(game);
        const shown = game.shownNews;
        expect(shown.length).toBeGreaterThanOrEqual(20);
        for (let i = 1; i < shown.length; i++) {
          const gapSec = (shown[i]!.tick - shown[i - 1]!.tick) * game.config.tickSeconds;
          if (gapSec < 180 || gapSec > 360) throw new Error(`seed ${seed}: 간격 ${gapSec}초`);
        }
        expect(new Set(shown.map((s) => s.news.id)).size).toBe(shown.length);
        for (const s of shown.filter((x) => x.kind === 'outcome')) {
          const signal = shown.find((x) => x.kind === 'signal' && x.storylineId === s.storylineId)!;
          expect((s.tick - signal.tick) * game.config.tickSeconds).toBeLessThanOrEqual(900);
        }
      }
    });
  }
});

describe('게임 — 재현성', () => {
  it('같은 시드면 같은 가격·뉴스 순서가 재현된다 (시대 2개 전체)', () => {
    const play = (seed: number) => {
      const game = newGame('practice', seed);
      const log: string[] = [];
      for (let era = 0; era < 2; era++) {
        while (game.phase !== 'era-ended') {
          if (game.phase === 'news') log.push(`N:${game.confirmNews().news.id}`);
          const r = game.advanceTick();
          if (r.advanced) log.push(r.changes.map((c) => c.price).join(','));
        }
        game.startNextEra();
      }
      return log;
    };
    const a = play(2024);
    expect(play(2024)).toEqual(a);
    expect(play(2025)).not.toEqual(a);
  });

  it('[시드 50개, 악재 뉴스만] 가격은 항상 1 이상의 정수', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const era = makeEra({ effectsFor: (_i, ids) => [effect(ids[0]!, -10), effect('market', -5)] });
      const game = new Game({ eras: [era], seed, mode: 'real' });
      runToEraEnd(game);
      for (const s of game.getStockList()) {
        if (!Number.isInteger(s.price) || s.price < 1) throw new Error(`seed ${seed}: ${s.price}`);
      }
    }
  });
});

describe('게임 — 매수, 즐겨찾기, 손익', () => {
  it('매수하면 즐겨찾기에 자동 추가되고(그룹 맨 위), 구입 순서가 보존된다', () => {
    const game = newGame('practice', 3);
    game.buy('e1-s5', 1);
    game.buy('e1-s2', 2);
    game.buy('e1-s5', 1); // 이미 즐겨찾기 → 위치 유지
    expect(game.favorites).toEqual(['e1-s2', 'e1-s5']);
    const list = game.getStockList();
    expect(list.slice(0, 3).map((s) => s.stock.id)).toEqual(['e1-s2', 'e1-s5', 'e1-s0']);
    expect(list[0]!.isFavorite).toBe(true);
    expect(game.getPortfolio().holdings.map((h) => h.stockId)).toEqual(['e1-s5', 'e1-s2']);
  });

  it('미실현손익(금액/%)이 현재가 기준으로 정확하다', () => {
    const game = newGame('practice', 4);
    game.buy('e1-s7', 3); // 1000 × 3
    advance(game, 10);
    const price = game.getPrice('e1-s7');
    const h = game.getPortfolio().holdings[0]!;
    expect(h.avgPrice).toBe(1000);
    expect(h.currentPrice).toBe(price);
    expect(h.unrealizedPnl).toBe((price - 1000) * 3);
    expect(h.unrealizedPnlPct).toBeCloseTo(((price - 1000) / 1000) * 100, 10);
    expect(game.getPortfolio().totalAssets).toBe(7000 + price * 3);
  });

  it('없는 종목은 거절', () => {
    expect(newGame('real').buy('nope', 1)).toEqual({ ok: false, error: 'unknown-stock' });
  });

  it('별 토글은 목록 정렬에 반영된다', () => {
    const game = newGame('real');
    game.toggleFavorite('e1-s9');
    game.toggleFavorite('e1-s4');
    expect(game.getStockList().slice(0, 2).map((s) => s.stock.id)).toEqual(['e1-s4', 'e1-s9']);
  });

  it('색상 설정을 바꾸면 목록 색도 바뀐다', () => {
    const game = newGame('real');
    advance(game, 20);
    const up = game.getStockList().find((s) => s.change > 0)!;
    expect(up.color).toBe('red');
    game.colorScheme = 'western';
    expect(game.getStockList().find((s) => s.stock.id === up.stock.id)!.color).toBe('green');
  });
});

describe('게임 — 시대 종료', () => {
  it('1440틱(2시간)에 자동 청산, 수익률 계산, 자금 이월이 정확하다', () => {
    const game = newGame('practice', 5);
    game.buy('e1-s0', 4); // 4,000
    game.buy('e1-s1', 3); // 3,000
    advance(game, 100);
    if (game.phase === 'news') game.confirmNews();
    game.sell('e1-s1', 1);
    const cashAfterSell = game.account.cash;
    const s1SellPrice = game.account.getTrades().at(-1)!.price;

    let last;
    while (game.phase !== 'era-ended') {
      if (game.phase === 'news') game.confirmNews();
      last = game.advanceTick();
    }
    expect(game.tick).toBe(1440);
    expect(game.elapsedSeconds).toBe(7200);
    if (!last?.advanced || !last.settlement) throw new Error('정산 없음');
    const st = last.settlement;
    const p0 = game.getPrice('e1-s0');
    const p1 = game.getPrice('e1-s1');

    expect(game.account.getHoldings()).toEqual([]);
    expect(game.account.cash).toBe(cashAfterSell + p0 * 4 + p1 * 2);
    expect(st.liquidations.map((t) => [t.stockId, t.quantity, t.price])).toEqual([
      ['e1-s0', 4, p0],
      ['e1-s1', 2, p1],
    ]);

    expect(st.startAssets).toBe(10_000);
    expect(st.deposits).toBe(0);
    expect(st.endAssets).toBe(game.account.cash);
    expect(st.profit).toBe(st.endAssets - 10_000);
    expect(st.returnPct).toBeCloseTo(((st.endAssets - 10_000) / 10_000) * 100, 10);
    expect(st.stocks).toEqual([
      { stockId: 'e1-s0', totalBought: 4000, pnl: (p0 - 1000) * 4, pnlPct: (((p0 - 1000) * 4) / 4000) * 100 },
      {
        stockId: 'e1-s1',
        totalBought: 3000,
        pnl: s1SellPrice - 1000 + (p1 - 1000) * 2,
        pnlPct: ((s1SellPrice - 1000 + (p1 - 1000) * 2) / 3000) * 100,
      },
    ]);

    expect(game.advanceTick()).toEqual({ advanced: false, phase: 'era-ended' });
    expect(game.buy('e1-s0', 1)).toEqual({ ok: false, error: 'not-tradable' });

    const carried = game.account.cash;
    expect(game.startNextEra()).toBe(true);
    expect(game.era.id).toBe('e2');
    expect(game.tick).toBe(0);
    expect(game.account.cash).toBe(carried);
    expect(game.favorites).toEqual([]);
    expect(game.getStockList().every((s) => s.price === 1000 && s.stock.id.startsWith('e2-'))).toBe(true);

    runToEraEnd(game);
    expect(game.settlements[1]!.startAssets).toBe(carried);
    expect(game.settlements[1]!.returnPct).toBe(0);

    expect(game.startNextEra()).toBe(false);
    expect(game.phase).toBe('finished');
  });

  it('시대 마지막에는 뉴스 팝업이 남아 있지 않다', () => {
    const game = newGame('practice');
    runToEraEnd(game);
    expect(game.pendingNews).toBeNull();
  });
});

describe('게임 — 차트', () => {
  it('시대 초반엔 있는 만큼, 이후엔 최근 240개(20분)', () => {
    const game = newGame('real');
    advance(game, 10);
    expect(game.getChart('e1-s0')).toHaveLength(11);
    advance(game, 300);
    const chart = game.getChart('e1-s0');
    expect(chart).toHaveLength(240);
    expect(chart.at(-1)!.price).toBe(game.getPrice('e1-s0'));
  });
});
