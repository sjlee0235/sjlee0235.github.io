import { describe, expect, it } from 'vitest';
import { Game, type AdvanceResult } from '../src/engine/game.ts';
import type { RecapNotice } from '../src/engine/recap.ts';
import { makeSpecEra } from './fixtures/makeEra.ts';

const twoEras = () => [makeSpecEra({ id: 'e2', order: 2, seed: 2 }), makeSpecEra({ id: 'e1', order: 1, seed: 1 })];
const newGame = (seed = 1, config = {}) => new Game({ eras: twoEras(), seed, config });

function runToEnd(game: Game) {
  const results: AdvanceResult[] = [];
  while (game.phase !== 'era-ended') results.push(game.advanceTick());
  return results;
}

describe('시대 시작', () => {
  it('활성 종목 20개, 모두 1,000 코인, 시작 자금 10,000', () => {
    const game = newGame();
    expect(game.era.id).toBe('e1');
    expect(game.activeStocks).toHaveLength(20);
    expect(game.getStockList().every((s) => s.price === 1000)).toBe(true);
    expect(game.account.cash).toBe(10_000);
    expect(game.draw.activeThemeIds).toHaveLength(20);
  });
});

describe('뉴스 반영 타이밍 (시간은 멈추지 않음)', () => {
  it('[시드 30개] 발표 틱 k에는 평소 변동 + 발표 순간 즉시 몫, k+1에 나머지 반영, k+2·k+3 관성, 이후 일반', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const game = newGame(seed);
      let r: AdvanceResult;
      do r = game.advanceTick();
      while (!(r.advanced && r.news));
      expect(game.phase).toBe('running');
      expect(r.changes.some((c) => c.cause === 'news')).toBe(false);
      const affected = new Set(r.news!.news.effects.map((e) => e.themeId));
      // 즉시 몫: 영향받는 종목만, 발표 직후 가격이 이미 움직여 있다
      expect(r.instantChanges.length).toBeGreaterThan(0);
      for (const c of r.instantChanges) {
        expect(c.cause).toBe('instant');
        expect(affected.has(game.activeStocks.find((s) => s.id === c.stockId)!.themeId)).toBe(true);
        expect(game.getPrice(c.stockId)).toBe(c.price);
      }
      const causesFor = (res: AdvanceResult) => {
        if (!res.advanced) throw new Error();
        return res.changes.filter((c) => affected.has(game.activeStocks.find((s) => s.id === c.stockId)!.themeId)).map((c) => c.cause);
      };
      expect(new Set(causesFor(game.advanceTick()))).toEqual(new Set(['news']));
      expect(new Set(causesFor(game.advanceTick()))).toEqual(new Set(['inertia']));
      expect(new Set(causesFor(game.advanceTick()))).toEqual(new Set(['inertia']));
      expect(new Set(causesFor(game.advanceTick()))).toEqual(new Set(['random']));
    }
  });

  it('[시드 30개] 시대 전체에서 뉴스 사이 가격이 발표 시점 가격의 ±30%를 벗어나지 않는다', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const game = newGame(seed);
      let base = new Map(game.activeStocks.map((s) => [s.id, 1000]));
      while (game.phase !== 'era-ended') {
        const r = game.advanceTick();
        if (!r.advanced) continue;
        const check = (ch: { stockId: string; price: number }) => {
          const p0 = base.get(ch.stockId)!;
          if (ch.price < Math.ceil(p0 * 0.7) || ch.price > Math.floor(p0 * 1.3)) throw new Error(`seed ${seed}: ${ch.price} / ${p0}`);
        };
        r.changes.forEach(check);
        // 한도 기준가는 즉시 몫 반영 "전" 가격 (발표 틱의 일반 변동 뒤)
        if (r.news) base = new Map(r.changes.map((c) => [c.stockId, c.price]));
        r.instantChanges.forEach(check);
      }
    }
  });

  it('즉시 몫 0이면 이전 규칙처럼 전부 5초 뒤 반영', () => {
    const game = new Game({ eras: [makeSpecEra({ id: 'g' })], seed: 4, config: { instantReactionShare: 0 } });
    let r: AdvanceResult;
    do r = game.advanceTick();
    while (!(r.advanced && r.news));
    expect(r.instantChanges).toEqual([]);
  });

  it('[시드 20개] 즉시 몫 : 5초 뒤 몫 ≈ 75 : 25', () => {
    let instant = 0;
    let total = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const game = newGame(seed);
      let pendingIds = new Set<string>();
      while (game.phase !== 'era-ended') {
        const r = game.advanceTick();
        if (!r.advanced) continue;
        for (const c of r.changes) if (c.cause === 'news' && pendingIds.has(c.stockId)) total += Math.abs(c.requestedRate!);
        pendingIds = new Set();
        for (const c of r.instantChanges) {
          instant += Math.abs(c.requestedRate!);
          total += Math.abs(c.requestedRate!);
          pendingIds.add(c.stockId);
        }
      }
    }
    expect(instant / total).toBeGreaterThan(0.68);
    expect(instant / total).toBeLessThan(0.77);
  });
});

describe('해설 알림', () => {
  const collect = (seed: number) => {
    const game = newGame(seed);
    const recaps: RecapNotice[] = [];
    const applied = new Map<string, Map<string, number>>();
    let lastNews: string | null = null;
    while (game.phase !== 'era-ended') {
      const r = game.advanceTick();
      if (!r.advanced) continue;
      const newsChanges = r.changes.filter((c) => c.cause === 'news');
      if (newsChanges.length > 0 && lastNews) {
        const m = applied.get(lastNews) ?? new Map<string, number>();
        for (const c of newsChanges) m.set(c.stockId, (m.get(c.stockId) ?? 0) + c.rate);
        applied.set(lastNews, m);
      }
      if (r.news) {
        lastNews = r.news.news.id;
        applied.set(lastNews, new Map(r.instantChanges.map((c) => [c.stockId, c.rate])));
      }
      recaps.push(...r.recaps);
    }
    return { game, recaps, applied };
  };

  it('[시드 20개] 발표 120초(24틱) 뒤, 최대 3개, 반영률 절댓값 순, appliedPct = 실제 적용값', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const { game, recaps, applied } = collect(seed);
      expect(recaps.length).toBeGreaterThan(0);
      for (const n of recaps) {
        expect(n.recapTick - n.publishedTick).toBe(24);
        expect(n.items.length).toBeLessThanOrEqual(3);
        const abs = n.items.map((i) => Math.abs(i.appliedPct));
        expect([...abs].sort((a, b) => b - a)).toEqual(abs);
        const actual = applied.get(n.newsId)!;
        for (const it of n.items) {
          expect(it.appliedPct).toBeCloseTo(actual.get(it.stockId)! / 10, 9);
          expect(it.appliedPct).toBeCloseTo(it.instantPct + it.delayedPct, 9);
        }
        expect(n.items.length + n.moreCount).toBe(actual.size);
        const shown = game.shownNews.find((s) => s.news.id === n.newsId)!;
        expect(n.tentativeNote).toBe(shown.kind === 'tentative');
        if (shown.kind === 'outcome') expect(n.relatedTentativeId).toBe(shown.relatedTentativeId);
        for (const it of n.items) {
          expect(it.reason?.ko ?? it.auto.newsTerm).toBeTruthy();
        }
      }
    }
  });

  it('시대가 끝나 120초가 남지 않으면 해설 알림을 만들지 않는다', () => {
    const { game, recaps } = collect(3);
    const last = game.shownNews.at(-1)!;
    const made = recaps.some((r) => r.newsId === last.news.id);
    expect(made).toBe(last.tick + 24 <= 1440);
  });

  it('보관함: 뉴스·태그·강도·해설 알림을 함께 담는다', () => {
    const { game } = collect(1);
    const archive = game.getNewsArchive();
    expect(archive.length).toBe(game.shownNews.length);
    for (const a of archive) {
      expect(['breaking', 'tentative', 'outcome']).toContain(a.tag);
      for (const e of a.effects) expect([1, 2, 3]).toContain(e.strength);
      if (a.tick + 24 <= 1440) expect(a.recap?.newsId).toBe(a.news.id);
    }
    expect(archive.some((a) => a.tag === 'tentative')).toBe(true);
    expect(archive.some((a) => a.tag === 'outcome' && a.relatedTentativeId)).toBe(true);
  });
});

describe('가상 시나리오 결과', () => {
  it('[시드 20개] 결과 뉴스 중 일부는 가상 시나리오(isHistorical=false)로 나오고, 잠정 뉴스와 연결된다', () => {
    let sawFictional = false;
    for (let seed = 1; seed <= 20; seed++) {
      const game = newGame(seed);
      runToEnd(game);
      for (const s of game.shownNews.filter((x) => x.kind === 'outcome')) {
        expect(s.relatedTentativeId).toBeDefined();
        if (!s.isHistorical) sawFictional = true;
      }
    }
    expect(sawFictional).toBe(true);
  });
});

describe('일시정지·매매·정산', () => {
  it('suspend 중에는 틱·뉴스·해설·매매가 멈춘다', () => {
    const game = newGame();
    for (let i = 0; i < 10; i++) game.advanceTick();
    game.suspend();
    for (let i = 0; i < 300; i++) expect(game.advanceTick()).toMatchObject({ advanced: false, suspended: true });
    expect(game.tick).toBe(10);
    expect(game.buy(game.activeStocks[0]!.id, 1)).toEqual({ ok: false, error: 'not-tradable' });
    game.resume();
    expect(game.advanceTick().advanced).toBe(true);
  });

  it('수수료 0.2%, 1440틱에 자동 청산, 수익률 = (최종 − 시작) ÷ 시작, 자금 이월', () => {
    const game = newGame(5);
    const id = game.activeStocks[0]!.id;
    game.buy(id, 5);
    expect(game.account.cash).toBe(10_000 - 5000 - 10);
    runToEnd(game);
    const st = game.settlements[0]!;
    expect(game.tick).toBe(1440);
    expect(game.account.getHoldings()).toEqual([]);
    expect(st.startCash).toBe(10_000);
    expect(st.returnPct).toBeCloseTo(((st.endAssets - 10_000) / 10_000) * 100, 10);
    const carried = game.account.cash;
    game.startNextEra();
    expect(game.era.id).toBe('e2');
    expect(game.eraStartCash).toBe(carried);
    runToEnd(game);
    expect(game.startNextEra()).toBe(false);
    expect(game.phase).toBe('finished');
  });

  it('(옵션) 주문 지연: N틱 뒤 가격으로 체결', () => {
    const game = newGame(1, { orderDelayTicks: 1 });
    const id = game.activeStocks[0]!.id;
    const r = game.buy(id, 1);
    expect(r).toEqual({ ok: true, queued: true, executeTick: 1 });
    expect(game.account.getQuantity(id)).toBe(0);
    const t = game.advanceTick();
    if (!t.advanced) throw new Error();
    expect(t.fills).toHaveLength(1);
    expect(game.account.getQuantity(id)).toBe(1);
    expect(game.account.getTrades()[0]!.price).toBe(game.getPrice(id));
  });

  it('같은 시드면 같은 추첨·가격·뉴스', () => {
    const play = (seed: number) => {
      const g = newGame(seed);
      const log: string[] = [];
      while (g.phase !== 'era-ended') {
        const r = g.advanceTick();
        if (r.advanced) log.push(`${r.news?.news.id ?? ''}|${r.changes.map((c) => c.price).join(',')}`);
      }
      return log;
    };
    expect(play(11)).toEqual(play(11));
    expect(play(12)).not.toEqual(play(11));
  });

  it('매수 시 즐겨찾기 자동 추가, 구입 순서 보존', () => {
    const game = newGame(3);
    const [a, b] = game.activeStocks.map((s) => s.id);
    game.buy(a!, 1);
    game.buy(b!, 1);
    expect(game.favorites).toEqual([b, a]);
    expect(game.getPortfolio().holdings.map((h) => h.stockId)).toEqual([a, b]);
  });
});
