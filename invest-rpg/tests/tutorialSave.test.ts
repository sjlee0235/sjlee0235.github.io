import { describe, expect, it } from 'vitest';
import { Game } from '../src/engine/game.ts';
import {
  createSaveData, markTutorialCompleted, resetTutorial, restoreGame, saveGame, snapshotGame,
} from '../src/engine/save.ts';
import { TUTORIAL_NEWS_TICK, TutorialSession } from '../src/engine/tutorial.ts';
import { replay } from '../src/engine/replay.ts';
import { TelemetryBuffer } from '../src/engine/telemetry.ts';
import { makeSpecEra } from './fixtures/makeEra.ts';

describe('튜토리얼', () => {
  it('뉴스 1개 → (시간 정지 중) 매수 → 반영 확인 → 해설 알림', () => {
    const t = new TutorialSession();
    expect(t.stage).toBe('waiting');
    expect(t.game.activeStocks).toHaveLength(5);
    while (t.stage === 'waiting') t.advanceTick();
    expect(t.game.tick).toBe(TUTORIAL_NEWS_TICK);
    expect(t.stage).toBe('reading');

    // 시간 정지
    const tick = t.game.tick;
    for (let i = 0; i < 20; i++) expect(t.advanceTick().advanced).toBe(false);
    expect(t.game.tick).toBe(tick);

    // 정지 중 매수 가능
    expect(t.game.buy('tut-battery', 3).ok).toBe(true);
    t.confirmNews();
    expect(t.stage).toBe('reaction');
    const r = t.advanceTick();
    if (!r.advanced) throw new Error();
    expect(r.changes.find((c) => c.stockId === 'tut-battery')!.cause).toBe('news');
    expect(r.changes.find((c) => c.stockId === 'tut-game')!.cause).toBe('random');

    while (t.stage === 'reaction') t.advanceTick();
    expect(t.stage).toBe('recap');
    expect(t.recap!.items.length).toBe(3);
    expect(t.recap!.items[0]!.reason?.ko).toBeTruthy();
    t.finish();
    expect(t.stage).toBe('done');
  });

  it('튜토리얼은 항상 같다 (고정 시드)', () => {
    const run = () => {
      const t = new TutorialSession();
      while (t.stage === 'waiting') t.advanceTick();
      t.confirmNews();
      while (t.stage === 'reaction') t.advanceTick();
      return t.recap;
    };
    expect(run()).toEqual(run());
  });

  it('튜토리얼 지갑은 본게임과 별개', () => {
    const t = new TutorialSession();
    t.game.buy('tut-food', 5);
    const game = new Game({ eras: [makeSpecEra()], seed: 1 });
    expect(game.account.cash).toBe(10_000);
    expect(t.game.account).not.toBe(game.account);
  });
});

describe('세이브 스키마', () => {
  it('튜토리얼 완료 플래그와 다시 보기(reset)', () => {
    const save = createSaveData();
    expect(save.tutorialCompleted).toBe(false);
    const done = markTutorialCompleted(save);
    expect(done.tutorialCompleted).toBe(true);
    expect(resetTutorial(done).tutorialCompleted).toBe(false);
  });

  it('저장한 추첨으로 되살리면 같은 판(같은 활성 테마·같은 가격 흐름)', () => {
    const eras = [makeSpecEra({ id: 'e1', order: 1 }), makeSpecEra({ id: 'e2', order: 2, seed: 2 })];
    const game = new Game({ eras, seed: 99 });
    const save = JSON.parse(JSON.stringify(saveGame(createSaveData(), game)));
    const restored = restoreGame(save, eras)!;
    expect(restored.draw).toEqual(game.draw);
    for (let i = 0; i < 100; i++) {
      game.advanceTick();
      restored.advanceTick();
    }
    expect(restored.getStockList().map((s) => s.price)).toEqual(game.getStockList().map((s) => s.price));
  });

  /** 뉴스마다 가장 큰 호재 종목을 사고파는 간단한 플레이를 n틱까지 */
  const playUntil = (game: Game, ticks: number) => {
    while (game.tick < ticks) {
      const r = game.advanceTick();
      if (!r.advanced || !r.news) continue;
      for (const h of game.account.getHoldings()) game.sell(h.stockId, h.quantity);
      const best = [...r.news.news.effects].sort((a, b) => b.impact - a.impact)[0]!;
      const stock = game.activeStocks.find((s) => s.themeId === best.themeId)!;
      if (best.impact > 0) game.buy(stock.id, game.maxBuyQuantity(stock.id));
    }
  };

  it('시대 중간 저장 → 불러오기: 같은 틱·같은 가격·같은 계좌로 이어 한다 (처음부터 다시 하기 불가)', () => {
    const eras = [makeSpecEra({ id: 'mid' })];
    const game = new Game({ eras, seed: 31 });
    playUntil(game, 700);
    game.toggleFavorite(game.activeStocks[3]!.id);
    const save = JSON.parse(JSON.stringify(saveGame(createSaveData(), game)));
    const restored = restoreGame(save, eras)!;
    expect(restored.tick).toBe(700);
    expect(restored.account.cash).toBe(game.account.cash);
    expect(restored.account.getHoldings()).toEqual(game.account.getHoldings());
    expect(restored.favorites).toEqual(game.favorites);
    expect(restored.shownNews.map((s) => s.news.id)).toEqual(game.shownNews.map((s) => s.news.id));
    // 이어서 끝까지 같은 플레이를 하면 결과도 같다
    playUntil(game, 1440);
    playUntil(restored, 1440);
    expect(restored.settlements[0]!.endAssets).toBe(game.settlements[0]!.endAssets);
  });

  it('엔진 버전이 다른 세이브: 그 시대를 새 시드로 처음부터 (같은 추첨, 같은 시작 자금)', () => {
    const eras = [makeSpecEra({ id: 'old' })];
    const game = new Game({ eras, seed: 32 });
    playUntil(game, 500);
    const save = saveGame(createSaveData(), game);
    const restored = restoreGame({ ...save, game: { ...save.game!, engineVersion: '0.0.1' } }, eras)!;
    expect(restored.tick).toBe(0);
    expect(restored.seed).not.toBe(32);
    expect(restored.draw.activeThemeIds).toEqual(game.draw.activeThemeIds);
    expect(restored.account.cash).toBe(10_000);
    expect(restored.newsSchedule.map((s) => s.tick)).not.toEqual(game.newsSchedule.map((s) => s.tick));
  });

  it('옛 형식 세이브(틱 정보 없음)도 그 시대 처음부터 불러온다', () => {
    const eras = [makeSpecEra({ id: 'v0' })];
    const game = new Game({ eras, seed: 33 });
    const { seed, eraIndex, eraStartCash, draws } = snapshotGame(game);
    const restored = restoreGame({ ...createSaveData(), game: { seed, eraIndex, eraStartCash, draws } }, eras)!;
    expect(restored.tick).toBe(0);
    expect(restored.seed).toBe(33);
  });

  it('이어 한 판의 플레이 기록만으로도 리플레이하면 같은 결과', () => {
    const eras = [makeSpecEra({ id: 'rp' })];
    const game = new Game({ eras, seed: 34 });
    playUntil(game, 600);
    const buf = new TelemetryBuffer();
    const restored = restoreGame(saveGame(createSaveData(), game), eras, undefined, { telemetry: buf })!;
    playUntil(restored, 1440);
    const r = replay(buf.peek(), eras);
    expect(r.failedTrades).toBe(0);
    expect(r.returns[0]).toBe(restored.settlements[0]!.returnPct);
  });
});
