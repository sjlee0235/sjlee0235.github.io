// 인테리어 업그레이드: 0~7단계, 단계당 2,000코인(보유 현금에서), 출금 처리(손실 아님), 시대를 넘어 이월, 세이브·리플레이

import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../src/engine/config.ts';
import { Game } from '../src/engine/game.ts';
import { PublicGame } from '../src/engine/publicView.ts';
import { replay } from '../src/engine/replay.ts';
import { createSaveData, restoreGame, saveGame, stateHash } from '../src/engine/save.ts';
import { TelemetryBuffer } from '../src/engine/telemetry.ts';
import { makeSpecEra } from './fixtures/makeEra.ts';

const era = makeSpecEra({ id: 'in' });
/** 시대 끝까지 (함수로 감싸 phase 타입 좁히기를 피한다) */
const runEra = (g: Game) => {
  while (g.phase === 'running') g.advanceTick();
};
const threeEras = () => [
  makeSpecEra({ id: 'a', order: 1, seed: 1 }),
  makeSpecEra({ id: 'b', order: 2, seed: 2 }),
  makeSpecEra({ id: 'c', order: 3, seed: 3 }),
];

describe('인테리어 업그레이드 규칙', () => {
  it('기본값: 최고 7단계, 단계당 2,000코인', () => {
    expect(DEFAULT_CONFIG.interior).toEqual({ maxLevel: 7, costPerLevel: 2000 });
  });

  it('누르면 보유 현금에서 2,000코인을 내고 한 단계 오른다', () => {
    const g = new Game({ eras: [era], seed: 1 });
    expect(g.interiorLevel).toBe(0);
    expect(g.upgradeInterior()).toEqual({ ok: true, level: 1, cost: 2000 });
    expect(g.account.cash).toBe(8000);
    expect(g.interiorLevel).toBe(1);
    expect(g.pendingSaveReasons).toContain('interior');
  });

  it('현금이 모자라면 실패하고 아무것도 바뀌지 않는다 (평가금액이 아니라 현금 기준)', () => {
    const g = new Game({ eras: [era], seed: 2 });
    const id = g.activeStocks[0]!.id;
    g.buy(id, g.maxBuyQuantity(id) - 1); // 현금 2,000 미만, 총자산은 그대로
    expect(g.account.cash).toBeLessThan(2000);
    const cash = g.account.cash;
    expect(g.upgradeInterior()).toEqual({ ok: false, error: 'insufficient-cash' });
    expect(g.account.cash).toBe(cash);
    expect(g.interiorLevel).toBe(0);
  });

  it('7단계가 끝이고, 그 뒤로는 max-level', () => {
    const g = new Game({ eras: [era], seed: 3, startCash: 20_000 });
    for (let i = 1; i <= 7; i++) expect(g.upgradeInterior()).toMatchObject({ ok: true, level: i });
    expect(g.interiorNextCost).toBeNull();
    expect(g.upgradeInterior()).toEqual({ ok: false, error: 'max-level' });
    expect(g.account.cash).toBe(20_000 - 14_000);
  });

  it('앱이 백그라운드이거나 시대가 끝났으면 살 수 없다', () => {
    const g = new Game({ eras: [era], seed: 4 });
    g.suspend();
    expect(g.upgradeInterior()).toEqual({ ok: false, error: 'not-running' });
    g.resume();
    while (g.phase === 'running') g.advanceTick();
    expect(g.upgradeInterior()).toEqual({ ok: false, error: 'not-running' });
  });

  it('출금으로 처리: 산 돈은 손실이 아니다 (투자 수익률은 매매만으로)', () => {
    const buyer = new Game({ eras: [era], seed: 5 });
    const plain = new Game({ eras: [era], seed: 5 });
    const id = buyer.activeStocks[0]!.id;
    for (const g of [buyer, plain]) g.buy(id, 3);
    for (let i = 0; i < 300; i++) {
      buyer.advanceTick();
      plain.advanceTick();
    }
    buyer.upgradeInterior();
    expect(buyer.currentReturnPct).toBeCloseTo(plain.currentReturnPct, 9);
    while (buyer.phase === 'running') {
      buyer.advanceTick();
      plain.advanceTick();
    }
    // 산 뒤로는 자산 구성(현금 비중)이 달라져 수익률 %가 갈라질 수 있지만, 번 코인(순손익)은 같다
    const s = buyer.settlements[0]!;
    const p = plain.settlements[0]!;
    expect(s.endAssets).toBe(p.endAssets - 2000);
    expect(s.profitAmount).toBe(p.profitAmount);
    // 매매 없이 사기만 하면 수익률 0%
    const only = new Game({ eras: [era], seed: 5 });
    only.upgradeInterior();
    while (only.phase === 'running') only.advanceTick();
    expect(only.settlements[0]!.returnPct).toBeCloseTo(0, 9);
    expect(only.settlements[0]!.profitAmount).toBe(0);
  });
});

describe('시대를 넘어 이월', () => {
  it('다음 시대에도 단계가 그대로이고, 시작 자금은 쓴 만큼 줄어 있다', () => {
    const g = new Game({ eras: threeEras(), seed: 6 });
    g.upgradeInterior();
    g.upgradeInterior();
    runEra(g);
    g.startNextEra();
    expect(g.interiorLevel).toBe(2);
    expect(g.eraStartCash).toBe(6000);
    g.upgradeInterior();
    runEra(g);
    g.startNextEra();
    runEra(g);
    expect(g.getFinalSummary().interiorLevel).toBe(3);
  });

  it('공개용 뷰: 단계·다음 값·업그레이드', () => {
    const g = PublicGame.create({ eras: [era], seed: 7 });
    expect([g.interiorLevel, g.interiorMaxLevel, g.interiorNextCost]).toEqual([0, 7, 2000]);
    expect(g.upgradeInterior().ok).toBe(true);
    expect(g.cash).toBe(8000);
  });
});

describe('세이브와 기록', () => {
  it('시대 중간에 산 단계가 저장 → 불러오기로 그대로 (상태 지문)', () => {
    const a = new Game({ eras: threeEras(), seed: 8 });
    for (let i = 0; i < 100; i++) a.advanceTick();
    a.upgradeInterior();
    for (let i = 0; i < 100; i++) a.advanceTick();
    const r = restoreGame(JSON.parse(JSON.stringify(saveGame(createSaveData(), a))), threeEras())!;
    expect(r.status).toBe('resumed');
    expect(r.game!.interiorLevel).toBe(1);
    expect(stateHash(r.game!)).toBe(stateHash(a));
  });

  it('두 번째 시대에서 불러와도 앞 시대 단계 + 이번 시대 단계', () => {
    const a = new Game({ eras: threeEras(), seed: 9 });
    a.upgradeInterior();
    while (a.phase === 'running') a.advanceTick();
    a.startNextEra();
    for (let i = 0; i < 50; i++) a.advanceTick();
    a.upgradeInterior();
    const r = restoreGame(JSON.parse(JSON.stringify(saveGame(createSaveData(), a))), threeEras())!;
    expect(r.status).toBe('resumed');
    expect(r.game!.interiorLevel).toBe(2);
    expect(stateHash(r.game!)).toBe(stateHash(a));
  });

  it('버전이 달라 자동 정산되면 단계는 다음 시대로 이어진다', () => {
    const g = new Game({ eras: threeEras(), seed: 10 });
    for (let i = 0; i < 100; i++) g.advanceTick();
    g.upgradeInterior();
    const save = saveGame(createSaveData(), g);
    const r = restoreGame({ ...save, game: { ...save.game!, engineVersion: 'old' } }, threeEras())!;
    if (r.status !== 'settled_on_version_change') throw new Error(r.status);
    expect(r.game!.interiorLevel).toBe(1);
    expect(r.game!.eraStartCash).toBe(r.settlement!.finalTotal);
  });

  it('인테리어가 섞인 판도 플레이 기록으로 리플레이된다', () => {
    const buf = new TelemetryBuffer(100_000);
    const g = new Game({ eras: [era], seed: 11, telemetry: buf, telemetryConsent: true });
    while (g.phase === 'running') {
      const r = g.advanceTick();
      if (r.advanced && r.tick % 300 === 0) g.upgradeInterior();
    }
    expect(buf.peek().filter((e) => e.type === 'interior_upgrade').length).toBe(g.interiorLevel);
    const rp = replay(buf.peek(), [era]);
    expect(rp.failedActions).toBe(0);
    expect(rp.game.interiorLevel).toBe(g.interiorLevel);
    expect(rp.game.settlements[0]!.finalTotal).toBe(g.settlements[0]!.finalTotal);
  });
});
