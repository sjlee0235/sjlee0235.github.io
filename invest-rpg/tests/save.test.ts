import { describe, expect, it } from 'vitest';
import { Game } from '../src/engine/game.ts';
import { replay } from '../src/engine/replay.ts';
import {
  contentVersion, createSaveData, markTutorialCompleted, resetTutorial, restoreGame, saveGame, setTelemetryConsent,
  stateHash, type SaveData,
} from '../src/engine/save.ts';
import { TelemetryBuffer } from '../src/engine/telemetry.ts';
import { makeSpecEra } from './fixtures/makeEra.ts';

const twoEras = () => [makeSpecEra({ id: 'e1', order: 1, seed: 1 }), makeSpecEra({ id: 'e2', order: 2, seed: 2 })];

/**
 * 정해진 방식으로 노는 봇: 뉴스마다 가진 것을 팔고 가장 큰 호재 종목을 산다.
 * 300틱마다 입금, 몇몇 종목은 즐겨찾기 토글. 시대가 끝나면 다음 시대로.
 */
function step(game: Game): void {
  if (game.phase === 'era-ended') {
    if (game.hasNextEra) game.startNextEra();
    return;
  }
  const r = game.advanceTick();
  if (!r.advanced || r.settlement) return;
  if (r.tick % 300 === 0) game.deposit(1_000, r.tick % 600 === 0 ? 'ad' : 'work');
  if (r.tick % 450 === 0) game.toggleFavorite(game.activeStocks[r.tick % game.activeStocks.length]!.id);
  if (!r.news) return;
  for (const h of game.account.getHoldings()) game.sell(h.stockId, h.quantity);
  const best = [...r.news.news.effects].sort((a, b) => b.impact - a.impact)[0]!;
  const stock = game.activeStocks.find((s) => s.themeId === best.themeId)!;
  if (best.impact > 0) game.buy(stock.id, Math.max(1, game.maxBuyQuantity(stock.id)));
}

/** 시대 순번·틱이 (era, tick)이 될 때까지 진행 */
function runTo(game: Game, era: number, tick: number) {
  let guard = 0;
  while ((game.eraIndex < era || game.tick < tick) && game.phase !== 'finished' && guard++ < 10_000) {
    if (game.eraIndex === era && game.phase === 'era-ended') break;
    step(game);
  }
}

const roundTrip = (save: SaveData): SaveData => JSON.parse(JSON.stringify(save));

describe('세이브 데이터', () => {
  it('튜토리얼 완료 플래그와 다시 보기, 기록 동의 기본값은 꺼짐', () => {
    const save = createSaveData();
    expect(save.tutorialCompleted).toBe(false);
    expect(save.telemetryConsent).toBe(false);
    expect(resetTutorial(markTutorialCompleted(save)).tutorialCompleted).toBe(false);
    expect(setTelemetryConsent(save, true).telemetryConsent).toBe(true);
  });

  it('저장에는 엔진·콘텐츠·밸런스 버전과 상태 스냅샷(틱·현재가·계좌·즐겨찾기)이 들어간다', () => {
    const eras = twoEras();
    const game = new Game({ eras, seed: 5 });
    runTo(game, 0, 400);
    const g = saveGame(createSaveData(), game).game!;
    expect(g.engineVersion).toBeTruthy();
    expect(g.contentVersion).toBe(contentVersion(eras));
    expect(g.state.tick).toBe(400);
    expect(Object.keys(g.state.prices)).toHaveLength(20);
    expect(g.state.cash).toBe(game.account.cash);
    expect(g.state.holdings).toEqual(game.account.getHoldings());
    expect(g.state.favorites).toEqual([...game.favorites]);
  });
});

describe('저장 → 불러오기 = 끊김 없이 진행한 결과', () => {
  const points: Array<[number, number]> = [[0, 0], [0, 1], [0, 37], [0, 700], [0, 1439], [0, 1440], [1, 0], [1, 333], [1, 1200]];
  for (const seed of [3, 17, 42]) {
    it(`[시드 ${seed}] 저장 시점 ${points.length}곳 모두: 상태 지문이 같고, 끝까지 이어 해도 같다`, () => {
      const eras = twoEras();
      const straight = new Game({ eras, seed });
      // 끊김 없는 기준 진행의 상태 지문
      const reference = new Map<string, string>();
      const at = (g: Game) => `${g.eraIndex}:${g.tick}:${g.phase}`;
      while (straight.phase !== 'finished') {
        reference.set(at(straight), stateHash(straight));
        if (straight.phase === 'era-ended' && !straight.hasNextEra) break;
        step(straight);
      }
      const finalHash = stateHash(straight);

      for (const [era, tick] of points) {
        const game = new Game({ eras, seed });
        runTo(game, era, tick);
        const r = restoreGame(roundTrip(saveGame(createSaveData(), game)), eras)!;
        expect(r.status).toBe('resumed');
        const restored = r.game!;
        expect(stateHash(restored)).toBe(stateHash(game));
        expect(stateHash(restored)).toBe(reference.get(at(game)));
        // 이어서 끝까지
        while (!(restored.phase === 'era-ended' && !restored.hasNextEra)) step(restored);
        expect(stateHash(restored)).toBe(finalHash);
      }
    });
  }
});

describe('버전이 다르면 스냅샷 가격으로 자동 정산하고 다음 시대부터', () => {
  const setup = () => {
    const eras = twoEras();
    const game = new Game({ eras, seed: 8 });
    runTo(game, 0, 900);
    // 정산 검증을 위해 일부러 종목을 들고 있게 한다
    if (game.account.getHoldings().length === 0) game.buy(game.activeStocks[0]!.id, 2);
    return { eras, game, save: roundTrip(saveGame(createSaveData(), game)) };
  };

  it('엔진 버전이 다름: 스냅샷 가격으로 전량 청산, 다음 시대가 정산 자산으로 시작', () => {
    const { eras, game, save } = setup();
    const expectedCash = game.account.getHoldings().reduce((cash, h) => {
      const amount = game.getPrice(h.stockId) * h.quantity;
      return cash + amount - Math.floor(amount * game.config.feeRate);
    }, game.account.cash);
    const r = restoreGame({ ...save, game: { ...save.game!, engineVersion: '0.0.1' } }, eras)!;
    expect(r.status).toBe('settled_on_version_change');
    if (r.status !== 'settled_on_version_change') return;
    expect(r.reason).toBe('version');
    expect(r.settlement!.endAssets).toBe(expectedCash);
    expect(r.settlement!.settledOnVersionChange).toBe(true);
    expect(r.settlement!.liquidations.length).toBeGreaterThan(0);
    expect(r.game!.eraIndex).toBe(1);
    expect(r.game!.tick).toBe(0);
    expect(r.game!.account.cash).toBe(expectedCash);
    expect(r.game!.eraReturns).toEqual([r.settlement!.returnPct]);
  });

  it('콘텐츠(시대 데이터)나 밸런스 설정이 바뀌어도 같은 방식으로 정산', () => {
    const { eras, save } = setup();
    const changed = eras.map((e) => ({ ...e, displayName: { ...e.displayName, ko: `${e.displayName.ko} (수정)` } }));
    expect(restoreGame(save, changed)!.status).toBe('settled_on_version_change');
    expect(restoreGame(save, eras, { feeRate: 0.001 })!.status).toBe('settled_on_version_change');
    expect(restoreGame(save, eras)!.status).toBe('resumed');
  });

  it('마지막 시대였으면 다음 게임 없이 정산만', () => {
    const eras = [makeSpecEra({ id: 'only' })];
    const game = new Game({ eras, seed: 9 });
    runTo(game, 0, 500);
    const save = saveGame(createSaveData(), game);
    const r = restoreGame({ ...save, game: { ...save.game!, engineVersion: 'x' } }, eras)!;
    expect(r.status).toBe('settled_on_version_change');
    expect(r.game).toBeNull();
  });

  it('이미 끝난 시대에서 저장했으면 다시 정산하지 않고 다음 시대로', () => {
    const eras = twoEras();
    const game = new Game({ eras, seed: 10 });
    runTo(game, 0, 1440);
    expect(game.phase).toBe('era-ended');
    const save = saveGame(createSaveData(), game);
    const r = restoreGame({ ...save, game: { ...save.game!, engineVersion: 'x' } }, eras)!;
    if (r.status !== 'settled_on_version_change') throw new Error(r.status);
    expect(r.settlement).toBeNull();
    expect(r.game!.eraIndex).toBe(1);
    expect(r.game!.account.cash).toBe(game.account.cash);
    expect(r.game!.eraReturns).toEqual(game.eraReturns);
  });

  it('같은 버전인데 리플레이 결과가 스냅샷과 다르면 replay-mismatch로 정산', () => {
    const { eras, save } = setup();
    const r = restoreGame({ ...save, game: { ...save.game!, stateHash: 'tampered' } }, eras)!;
    expect(r.status).toBe('settled_on_version_change');
    if (r.status === 'settled_on_version_change') expect(r.reason).toBe('replay-mismatch');
  });

  it('옛 형식(버전 1) 세이브: 그 시대를 새 시드로 처음부터', () => {
    const eras = twoEras();
    const legacy = { version: 1, tutorialCompleted: true, game: { seed: 33, eraIndex: 0, eraStartCash: 10_000, draws: {} } };
    const r = restoreGame(legacy as unknown as SaveData, eras)!;
    expect(r.status).toBe('restarted_legacy');
    expect(r.game!.tick).toBe(0);
    expect(r.game!.seed).not.toBe(33);
  });
});

describe('저장 빈도 신호', () => {
  it('매매·뉴스·백그라운드·30초 경과·입금 때 저장이 필요하다고 알리고, 저장하면 비워진다', () => {
    const game = new Game({ eras: twoEras(), seed: 11 });
    expect(game.pendingSaveReasons).toEqual([]);
    for (let i = 0; i < 5; i++) game.advanceTick();
    expect(game.pendingSaveReasons).toEqual([]);
    game.advanceTick(); // 6틱 = 30초
    expect(game.pendingSaveReasons).toContain('interval');
    saveGame(createSaveData(), game);
    expect(game.pendingSaveReasons).toEqual([]);

    game.buy(game.activeStocks[0]!.id, 1);
    expect(game.pendingSaveReasons).toContain('trade');
    game.deposit(500, 'work');
    expect(game.pendingSaveReasons).toContain('deposit');
    game.suspend();
    expect(game.pendingSaveReasons).toContain('background');
    game.resume();
    saveGame(createSaveData(), game);

    let r;
    do r = game.advanceTick();
    while (!(r.advanced && r.news));
    expect(game.pendingSaveReasons).toContain('news');
  });

  it('30초마다 저장하면, 강제 종료 뒤 되돌아가는 시간은 최대 30초(6틱)', () => {
    const eras = twoEras();
    const game = new Game({ eras, seed: 12 });
    let save = createSaveData();
    let maxGap = 0;
    let lastSavedTick = 0;
    while (game.phase === 'running') {
      game.advanceTick();
      if (game.pendingSaveReasons.length > 0) {
        save = saveGame(save, game);
        lastSavedTick = game.tick;
      }
      maxGap = Math.max(maxGap, game.tick - lastSavedTick);
    }
    expect(maxGap).toBeLessThanOrEqual(6);
    expect(save.game).not.toBeNull();
  });
});

describe('이어 한 판의 플레이 기록', () => {
  it('세이브에서 이어 한 판도 기록만으로 리플레이하면 같은 결과 (이어 하기 전 행동 포함)', () => {
    const eras = [makeSpecEra({ id: 'rp' })];
    const game = new Game({ eras, seed: 34 });
    runTo(game, 0, 600);
    const buf = new TelemetryBuffer();
    const save = setTelemetryConsent(saveGame(createSaveData(), game), true);
    const r = restoreGame(save, eras, undefined, { telemetry: buf })!;
    const restored = r.game!;
    while (restored.phase === 'running') step(restored);
    const rp = replay(buf.peek(), eras);
    expect(rp.failedActions).toBe(0);
    expect(rp.returns[0]).toBe(restored.settlements[0]!.returnPct);
  });
});
