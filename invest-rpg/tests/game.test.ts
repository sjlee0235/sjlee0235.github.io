import { describe, expect, it } from 'vitest';
import { Game } from '../src/engine/game.ts';
import { makeEra } from './fixtures/makeEra.ts';

const twoEras = () => [makeEra({ id: 'e2', order: 2 }), makeEra({ id: 'e1', order: 1 })];

/** 뉴스 팝업이 뜨면 바로 확인하면서 n틱 진행 */
function advance(game: Game, ticks: number) {
  const results = [];
  for (let i = 0; i < ticks; i++) {
    if (game.phase === 'news') game.confirmNews();
    results.push(game.advanceTick());
  }
  return results;
}

/** 시대 끝까지 진행 (뉴스는 즉시 확인) */
function runToEraEnd(game: Game) {
  while (game.phase !== 'era-ended') {
    if (game.phase === 'news') game.confirmNews();
    game.advanceTick();
  }
}

describe('게임 — 시대 시작', () => {
  it('order 순으로 시작하고, 모든 종목 1,000 비트, 현금 10,000 비트', () => {
    const game = new Game({ eras: twoEras(), seed: 1 });
    expect(game.era.id).toBe('e1');
    expect(game.account.cash).toBe(10_000);
    for (const item of game.getStockList()) expect(item.price).toBe(1000);
  });

  it('시대 시작(틱 0)에 첫 뉴스 팝업이 뜬다', () => {
    const game = new Game({ eras: twoEras(), seed: 1 });
    expect(game.phase).toBe('news');
    expect(game.pendingNews).not.toBeNull();
  });
});

describe('게임 — 뉴스 팝업과 시간 정지', () => {
  it('팝업 중에는 틱이 진행되지 않고 가격도 그대로다', () => {
    const game = new Game({ eras: twoEras(), seed: 1 });
    advance(game, 29);
    const r = advance(game, 1)[0]!; // 30틱 → 팝업
    expect(r.advanced && r.news).toBeTruthy();
    expect(game.phase).toBe('news');
    const before = game.getStockList().map((s) => s.price);
    for (let i = 0; i < 50; i++) {
      expect(game.advanceTick()).toEqual({ advanced: false, phase: 'news' });
    }
    expect(game.tick).toBe(30);
    expect(game.getStockList().map((s) => s.price)).toEqual(before);
  });

  it('팝업 중에는 매매할 수 없다', () => {
    const game = new Game({ eras: twoEras(), seed: 1 });
    expect(game.buy('e1-s0', 1)).toEqual({ ok: false, error: 'not-tradable' });
    game.confirmNews();
    expect(game.buy('e1-s0', 1).ok).toBe(true);
  });

  it("'확인' 직후가 아니라 그다음 틱에 정확히 영향도×3%가 반영되고, 영향 없는 테마는 일반 규칙", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const game = new Game({ eras: twoEras(), seed });
      for (let round = 0; round < 3; round++) {
        // 뉴스 팝업 상태까지 진행
        while (game.phase !== 'news') game.advanceTick();
        const news = game.pendingNews!;
        const before = new Map(game.getStockList().map((s) => [s.stock.id, s.price]));
        game.confirmNews();
        // 확인 직후: 가격 변화 없음
        for (const s of game.getStockList()) expect(s.price).toBe(before.get(s.stock.id));

        const r = game.advanceTick();
        if (!r.advanced) throw new Error('진행 안 됨');
        const impactByTheme = new Map(news.effects.map((e) => [e.themeId, e.impact]));
        for (const ch of r.changes) {
          const themeId = game.era.stocks.find((s) => s.id === ch.stockId)!.themeId;
          const impact = impactByTheme.get(themeId);
          if (impact !== undefined) {
            expect(ch.cause).toBe('news');
            expect(ch.rate).toBe(impact * 30);
            expect(ch.price).toBe(Math.max(1, Math.round((before.get(ch.stockId)! * (1000 + impact * 30)) / 1000)));
          } else {
            expect(ch.cause).toBe('random');
            expect(Math.abs(ch.rate)).toBeLessThanOrEqual(30);
          }
        }
        // 그다음 틱은 다시 전부 일반 규칙
        const r2 = game.advanceTick();
        if (!r2.advanced) throw new Error('진행 안 됨');
        expect(r2.changes.every((c) => c.cause === 'random')).toBe(true);
      }
    }
  });
});

describe('게임 — 뉴스 일정', () => {
  it('5분(30틱)마다 뉴스, 시대당 중복 없이 24개', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const game = new Game({ eras: twoEras(), seed });
      const newsTicks: number[] = [game.tick];
      while (game.phase !== 'era-ended') {
        if (game.phase === 'news') game.confirmNews();
        const r = game.advanceTick();
        if (r.advanced && r.news) newsTicks.push(r.tick);
      }
      expect(newsTicks).toEqual(Array.from({ length: 24 }, (_, i) => i * 30));
      const ids = game.shownNews.map((n) => n.id);
      expect(ids).toHaveLength(24);
      expect(new Set(ids).size).toBe(24);
    }
  });
});

describe('게임 — 재현성', () => {
  it('같은 시드면 같은 가격·뉴스 순서가 재현된다 (시대 2개 전체)', () => {
    const play = (seed: number) => {
      const game = new Game({ eras: twoEras(), seed });
      const log: string[] = [];
      for (let era = 0; era < 2; era++) {
        while (game.phase !== 'era-ended') {
          if (game.phase === 'news') log.push(`N:${game.confirmNews().id}`);
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

  it('[시드 100개, 뉴스 포함 전체 시대] 가격은 항상 1 이상의 정수', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const game = new Game({ eras: [makeEra({ effectsFor: (_i, ids) => [{ themeId: ids[0]!, impact: -10 }] })], seed });
      runToEraEnd(game);
      for (const s of game.getStockList()) {
        if (!Number.isInteger(s.price) || s.price < 1) throw new Error(`seed ${seed}: ${s.price}`);
      }
    }
  });
});

describe('게임 — 매수, 즐겨찾기, 손익', () => {
  it('매수하면 즐겨찾기에 자동 추가되고(그룹 맨 위), 구입 순서가 보존된다', () => {
    const game = new Game({ eras: twoEras(), seed: 3 });
    game.confirmNews();
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
    const game = new Game({ eras: twoEras(), seed: 4 });
    game.confirmNews();
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
    const game = new Game({ eras: twoEras(), seed: 1 });
    game.confirmNews();
    expect(game.buy('nope', 1)).toEqual({ ok: false, error: 'unknown-stock' });
  });

  it('별 토글은 목록 정렬에 반영된다', () => {
    const game = new Game({ eras: twoEras(), seed: 1 });
    game.toggleFavorite('e1-s9');
    game.toggleFavorite('e1-s4');
    expect(game.getStockList().slice(0, 2).map((s) => s.stock.id)).toEqual(['e1-s4', 'e1-s9']);
  });

  it('색상 설정을 바꾸면 목록 색도 바뀐다', () => {
    const game = new Game({ eras: twoEras(), seed: 1 });
    advance(game, 20);
    const up = game.getStockList().find((s) => s.change > 0)!;
    expect(up.color).toBe('red');
    game.colorScheme = 'western';
    expect(game.getStockList().find((s) => s.stock.id === up.stock.id)!.color).toBe('green');
  });
});

describe('게임 — 시대 종료', () => {
  it('720틱에 자동 청산, 수익률 계산, 자금 이월이 정확하다', () => {
    const game = new Game({ eras: twoEras(), seed: 5 });
    game.confirmNews();
    game.buy('e1-s0', 4); // 4,000
    game.buy('e1-s1', 3); // 3,000
    advance(game, 100);
    game.sell('e1-s1', 1);
    const cashAfterSell = game.account.cash;
    const s1SellPrice = game.account.getTrades().at(-1)!.price;

    let last;
    while (game.phase !== 'era-ended') {
      if (game.phase === 'news') game.confirmNews();
      last = game.advanceTick();
    }
    expect(game.tick).toBe(720);
    if (!last?.advanced || !last.settlement) throw new Error('정산 없음');
    const st = last.settlement;
    const p0 = game.getPrice('e1-s0');
    const p1 = game.getPrice('e1-s1');

    // 보유 종목 0, 현금 = 이전 현금 + 청산 대금
    expect(game.account.getHoldings()).toEqual([]);
    expect(game.account.cash).toBe(cashAfterSell + p0 * 4 + p1 * 2);
    expect(st.liquidations.map((t) => [t.stockId, t.quantity, t.price])).toEqual([
      ['e1-s0', 4, p0],
      ['e1-s1', 2, p1],
    ]);

    // 시작/종료 자산, 수익률
    expect(st.startAssets).toBe(10_000);
    expect(st.endAssets).toBe(game.account.cash);
    expect(st.returnPct).toBeCloseTo(((st.endAssets - 10_000) / 10_000) * 100, 10);

    // 종목별 손익
    expect(st.stocks).toEqual([
      { stockId: 'e1-s0', totalBought: 4000, pnl: (p0 - 1000) * 4, pnlPct: ((p0 - 1000) * 4 / 4000) * 100 },
      {
        stockId: 'e1-s1',
        totalBought: 3000,
        pnl: s1SellPrice - 1000 + (p1 - 1000) * 2,
        pnlPct: ((s1SellPrice - 1000 + (p1 - 1000) * 2) / 3000) * 100,
      },
    ]);

    // 시대 종료 후에는 진행·매매 불가
    expect(game.advanceTick()).toEqual({ advanced: false, phase: 'era-ended' });
    expect(game.buy('e1-s0', 1)).toEqual({ ok: false, error: 'not-tradable' });

    // 다음 시대: 자금 이월, 새 종목 1,000 비트, 즐겨찾기 초기화
    const carried = game.account.cash;
    expect(game.startNextEra()).toBe(true);
    expect(game.era.id).toBe('e2');
    expect(game.tick).toBe(0);
    expect(game.account.cash).toBe(carried);
    expect(game.favorites).toEqual([]);
    expect(game.getStockList().every((s) => s.price === 1000 && s.stock.id.startsWith('e2-'))).toBe(true);

    // 두 번째 시대 정산의 시작 자산 = 이월된 자금
    runToEraEnd(game);
    expect(game.settlements[1]!.startAssets).toBe(carried);
    expect(game.settlements[1]!.returnPct).toBe(0); // 아무것도 안 샀으면 0%

    // 마지막 시대 다음은 없음
    expect(game.startNextEra()).toBe(false);
    expect(game.phase).toBe('finished');
  });

  it('시대 마지막 틱 직후에는 뉴스가 뜨지 않는다', () => {
    const game = new Game({ eras: twoEras(), seed: 1 });
    runToEraEnd(game);
    expect(game.pendingNews).toBeNull();
  });
});

describe('게임 — 차트', () => {
  it('시대 초반엔 있는 만큼, 이후엔 최근 120개', () => {
    const game = new Game({ eras: twoEras(), seed: 1 });
    advance(game, 10);
    expect(game.getChart('e1-s0')).toHaveLength(11);
    advance(game, 200);
    const chart = game.getChart('e1-s0');
    expect(chart).toHaveLength(120);
    expect(chart.at(-1)!.price).toBe(game.getPrice('e1-s0'));
  });
});
