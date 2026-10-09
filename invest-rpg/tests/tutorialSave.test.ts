import { describe, expect, it } from 'vitest';
import { Game } from '../src/engine/game.ts';
import {
  createSaveData, markTutorialCompleted, resetTutorial, restoreGame, saveGame,
} from '../src/engine/save.ts';
import { TUTORIAL_NEWS_TICK, TutorialSession } from '../src/engine/tutorial.ts';
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
});
