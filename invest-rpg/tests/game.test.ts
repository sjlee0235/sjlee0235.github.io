import { describe, expect, it } from 'vitest';
import { Game } from '../src/engine/game.ts';
import { applyRate } from '../src/engine/priceEngine.ts';
import { effect, makeEra } from './fixtures/makeEra.ts';

const twoEras = () => [
  makeEra({ id: 'e2', order: 2, storylineCount: 4, withClues: true }),
  makeEra({ id: 'e1', order: 1, storylineCount: 4, withClues: true }),
];
const realGame = (seed = 1, config = {}) => new Game({ eras: twoEras(), seed, mode: 'real', config });
const practiceGame = (seed = 1, config = {}, eraId?: string) =>
  new Game({ eras: twoEras(), seed, mode: 'practice', config, eraId });

function advance(game: Game, ticks: number) {
  for (let i = 0; i < ticks; i++) {
    if (game.phase === 'news') game.confirmNews();
    game.advanceTick();
  }
}

function runToEraEnd(game: Game) {
  while (game.phase !== 'era-ended') {
    if (game.phase === 'news') game.confirmNews();
    game.advanceTick();
  }
}

const themeOf = (game: Game, stockId: string) => game.era.stocks.find((s) => s.id === stockId)!.themeId;

describe('연습 모드', () => {
  it('한 판 30분(360틱), 10,000 비트로 시작, 고른 시대로 플레이', () => {
    const game = practiceGame(1, {}, 'e2');
    expect(game.era.id).toBe('e2');
    expect(game.account.cash).toBe(10_000);
    runToEraEnd(game);
    expect(game.tick).toBe(360);
    expect(game.elapsedSeconds).toBe(1800);
  });

  it('뉴스가 뜨면 시간이 멈추고 매매할 수 없다', () => {
    const game = practiceGame();
    while (game.phase !== 'news') game.advanceTick();
    const tick = game.tick;
    for (let i = 0; i < 20; i++) expect(game.advanceTick()).toMatchObject({ advanced: false, phase: 'news' });
    expect(game.tick).toBe(tick);
    expect(game.buy('e1-s0', 1)).toEqual({ ok: false, error: 'not-tradable' });
  });

  it("[시드 30개] '확인' 2틱(10초) 뒤 반영, 배율 0.85~1.15 안, 1차 뉴스만", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const game = practiceGame(seed);
      while (game.phase !== 'news') game.advanceTick();
      const s = game.pendingNews!;
      expect(s.news.effects.every((e) => e.link === 'direct')).toBe(true);
      game.confirmNews();
      const r1 = game.advanceTick();
      if (!r1.advanced) throw new Error();
      expect(r1.changes.some((c) => c.cause === 'news')).toBe(false);
      const r2 = game.advanceTick();
      if (!r2.advanced) throw new Error();
      const impact = new Map(s.news.effects.map((e) => [e.themeId, e.impact]));
      for (const ch of r2.changes) {
        const imp = impact.get(themeOf(game, ch.stockId));
        if (imp === undefined) continue;
        expect(ch.cause).toBe('news');
        const mult = ch.rate / (imp * 30);
        expect(mult).toBeGreaterThanOrEqual(0.85 - 0.01);
        expect(mult).toBeLessThanOrEqual(1.15 + 0.01);
        expect(ch.price).toBe(applyRate(ch.prevPrice, ch.rate, 1));
      }
    }
  });

  it('[시드 50개] 스토리와 2차 뉴스는 나오지 않는다', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const game = practiceGame(seed);
      runToEraEnd(game);
      for (const a of game.getNewsArchive()) {
        expect(a.kind).toBe('standalone');
        expect(a.tag === 'direct' || a.tag === 'market').toBe(true);
      }
    }
  });

  it('팝업 데이터: 본문, 관련 테마(긍정/부정), 해설', () => {
    const game = practiceGame();
    while (game.phase !== 'news') game.advanceTick();
    const popup = game.getNewsPopup(game.pendingNews!);
    expect(popup.news.body.ko.length).toBeGreaterThan(0);
    expect(popup.relatedThemes.length).toBe(popup.news.effects.length);
    for (const t of popup.relatedThemes) expect(['positive', 'negative']).toContain(t.direction);
    expect(popup.explanation?.ko.length).toBeGreaterThan(0);
    expect(popup.isHistorical).toBe(true);
    expect(popup.appliesInSeconds).toBe(10);
  });

  it('새 판: 지갑이 10,000 비트로 리셋되고 이월 없음', () => {
    const game = practiceGame();
    game.grantAdReward();
    game.buy('e1-s0', 3);
    runToEraEnd(game);
    game.startPracticeRound('e2');
    expect(game.era.id).toBe('e2');
    expect(game.account.cash).toBe(10_000);
    expect(game.account.getHoldings()).toEqual([]);
    expect(game.remainingAdRewards()).toBe(3);
    expect(game.tick).toBe(0);
  });

  it('연습은 startNextEra로 넘어가지 않는다', () => {
    const game = practiceGame();
    runToEraEnd(game);
    expect(() => (game as Game).startNextEra()).toThrow();
  });
});

describe('실전 모드', () => {
  it('시대당 2시간(1440틱), 뉴스가 떠도 시간이 흐르고 2틱 뒤 반영, 스토리·2차 뉴스 등장', () => {
    let sawStory = false;
    let sawIndirect = false;
    for (let seed = 1; seed <= 20; seed++) {
      const game = realGame(seed);
      let firstChecked = false;
      while (game.phase !== 'era-ended') {
        const r = game.advanceTick();
        expect(['running', 'era-ended']).toContain(game.phase);
        if (r.advanced && r.news && !firstChecked) {
          firstChecked = true;
          const t = r.tick;
          const r1 = game.advanceTick();
          const r2 = game.advanceTick();
          if (!r1.advanced || !r2.advanced) throw new Error();
          expect(r1.changes.some((c) => c.cause === 'news')).toBe(false);
          expect(r2.tick).toBe(t + 2);
          expect(r2.changes.some((c) => c.cause === 'news')).toBe(true);
        }
      }
      expect(game.tick).toBe(1440);
      const archive = game.getNewsArchive();
      sawStory ||= archive.some((a) => a.kind === 'outcome');
      sawIndirect ||= archive.some((a) => a.tag === 'indirect');
    }
    expect(sawStory).toBe(true);
    expect(sawIndirect).toBe(true);
  });

  it('보관함: 종류 태그와 가상 시나리오 여부가 들어 있다', () => {
    let sawFictional = false;
    for (let seed = 1; seed <= 30; seed++) {
      const game = realGame(seed);
      runToEraEnd(game);
      for (const a of game.getNewsArchive()) {
        expect(['direct', 'indirect', 'hint', 'outcome', 'market']).toContain(a.tag);
        expect(a.elapsedSeconds).toBe(a.tick * 5);
        if (a.kind === 'signal' || a.kind === 'clue') expect(a.tag).toBe('hint');
        if (!a.isHistorical) {
          sawFictional = true;
          expect(['outcome', 'hint']).toContain(a.tag);
          expect(game.getNewsPopup({ ...a }).isHistorical).toBe(false);
        }
      }
    }
    expect(sawFictional).toBe(true);
  });

  it('suspend 중에는 틱·뉴스·매매가 모두 멈추고 resume하면 이어진다', () => {
    const game = realGame();
    advance(game, 10);
    const before = game.getStockList().map((s) => s.price);
    const shown = game.shownNews.length;
    game.suspend();
    for (let i = 0; i < 300; i++) expect(game.advanceTick()).toMatchObject({ advanced: false, suspended: true });
    expect(game.tick).toBe(10);
    expect(game.shownNews.length).toBe(shown);
    expect(game.getStockList().map((s) => s.price)).toEqual(before);
    expect(game.buy('e1-s0', 1)).toEqual({ ok: false, error: 'not-tradable' });
    game.resume();
    expect(game.advanceTick().advanced).toBe(true);
    expect(game.tick).toBe(11);
  });

  it('suspend 전후로 같은 시드면 결과가 같다 (멈춘 시간은 게임에 영향 없음)', () => {
    const a = realGame(7);
    const b = realGame(7);
    advance(a, 100);
    advance(b, 50);
    b.suspend();
    b.advanceTick();
    b.resume();
    advance(b, 50);
    expect(b.getStockList().map((s) => s.price)).toEqual(a.getStockList().map((s) => s.price));
  });

  it('1440틱에 자동 청산, 수익률, 자금 이월, 다음 시대', () => {
    const game = realGame(5);
    advance(game, 3);
    game.buy('e1-s0', 4);
    game.buy('e1-s1', 3);
    runToEraEnd(game);
    const st = game.settlements[0]!;
    expect(game.account.getHoldings()).toEqual([]);
    expect(st.startCash).toBe(10_000);
    expect(st.adRewardTotal).toBe(0);
    expect(st.endAssets).toBe(game.account.cash);
    expect(st.returnPct).toBeCloseTo(((st.endAssets - 10_000) / 10_000) * 100, 10);
    const carried = game.account.cash;
    expect(game.startNextEra()).toBe(true);
    expect(game.era.id).toBe('e2');
    expect(game.account.cash).toBe(carried);
    runToEraEnd(game);
    expect(game.settlements[1]!.startCash).toBe(carried);
    expect(game.startNextEra()).toBe(false);
    expect(game.phase).toBe('finished');
  });
});

describe('공통', () => {
  it('같은 시드면 같은 가격·뉴스 순서가 재현된다 (두 모드)', () => {
    for (const mode of ['practice', 'real'] as const) {
      const play = (seed: number) => {
        const game = new Game({ eras: twoEras(), seed, mode });
        const log: string[] = [];
        while (game.phase !== 'era-ended') {
          if (game.phase === 'news') log.push(`N:${game.confirmNews().news.id}`);
          const r = game.advanceTick();
          if (r.advanced) {
            if (r.news) log.push(`N:${r.news.news.id}`);
            log.push(r.changes.map((c) => c.price).join(','));
          }
        }
        return log;
      };
      expect(play(2024)).toEqual(play(2024));
      expect(play(2025)).not.toEqual(play(2024));
    }
  });

  it('수수료 0.2%가 매수·매도 모두에 적용된다', () => {
    const game = realGame();
    game.buy('e1-s0', 5); // 5,000 + 10
    expect(game.account.cash).toBe(10_000 - 5000 - 10);
    game.sell('e1-s0', 5); // 5,000 - 10
    expect(game.account.cash).toBe(10_000 - 20);
  });

  it('[시드 30개, 강한 악재만] 가격은 항상 1 이상의 정수', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const era = makeEra({ effectsFor: (_i, ids) => [effect(ids[0]!, -10), effect('market', -5)] });
      const game = new Game({ eras: [era], seed, mode: 'real' });
      runToEraEnd(game);
      for (const s of game.getStockList()) expect(Number.isInteger(s.price) && s.price >= 1).toBe(true);
    }
  });

  it('매수 시 즐겨찾기 자동 추가(맨 위), 구입 순서 보존, 미실현손익', () => {
    const game = realGame(3);
    game.buy('e1-s5', 1);
    game.buy('e1-s2', 2);
    game.buy('e1-s5', 1);
    expect(game.favorites).toEqual(['e1-s2', 'e1-s5']);
    expect(game.getStockList().slice(0, 2).map((s) => s.stock.id)).toEqual(['e1-s2', 'e1-s5']);
    expect(game.getPortfolio().holdings.map((h) => h.stockId)).toEqual(['e1-s5', 'e1-s2']);
    advance(game, 10);
    const h = game.getPortfolio().holdings[1]!;
    const price = game.getPrice('e1-s2');
    expect(h.unrealizedPnl).toBeCloseTo(price * 2 - h.costBasis, 10);
    expect(h.unrealizedPnlPct).toBeCloseTo(((price * 2 - h.costBasis) / h.costBasis) * 100, 10);
  });

  it('차트: 초반엔 있는 만큼, 이후 최근 240개', () => {
    const game = realGame();
    advance(game, 10);
    expect(game.getChart('e1-s0')).toHaveLength(11);
    advance(game, 300);
    expect(game.getChart('e1-s0')).toHaveLength(240);
  });

  it('색상 설정을 바꾸면 목록 색도 바뀐다', () => {
    const game = realGame();
    advance(game, 30);
    const up = game.getStockList().find((s) => s.change > 0)!;
    expect(up.color).toBe('red');
    game.colorScheme = 'western';
    expect(game.getStockList().find((s) => s.stock.id === up.stock.id)!.color).toBe('green');
  });
});
