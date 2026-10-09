import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '../src/engine/config.ts';
import { Game } from '../src/engine/game.ts';
import { PublicGame, restorePublicGame, savePublicGame } from '../src/engine/publicView.ts';
import { replay } from '../src/engine/replay.ts';
import { createSaveData, restoreGame, saveGame, setTelemetryConsent, stateHash } from '../src/engine/save.ts';
import { TelemetryBuffer } from '../src/engine/telemetry.ts';
import { applyTouch, newWorkState, TouchLimiter } from '../src/engine/work.ts';
import { makeSpecEra } from './fixtures/makeEra.ts';

const era = makeSpecEra({ id: 'wk' });
const threeEras = () => [
  makeSpecEra({ id: 'a', order: 1, seed: 1 }),
  makeSpecEra({ id: 'b', order: 2, seed: 2 }),
  makeSpecEra({ id: 'c', order: 3, seed: 3 }),
];

/** 사람 손 속도로 n번 터치 (초당 3회, 겹치지 않는 시각) */
function touch(g: Game | PublicGame, n: number, startMs = 0) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(g.workTouch(startMs + i * 334));
  return out;
}

describe('작업 터치 규칙', () => {
  it('기본값: 3터치에 인형 완성, 3코인, 초당 6터치, 시대 종료 지급, 상한 없음, 작업 종류 doll_eyes', () => {
    expect(DEFAULT_CONFIG.work).toMatchObject({
      type: 'doll_eyes', touchesPerDoll: 3, coinsPerDoll: 3, maxTouchesPerSec: 6, payoutMode: 'era_end', incomeCapPerEra: null,
    });
  });

  it('눈 하나 → 눈 둘 → 완성(다음 인형은 눈 없음)', () => {
    const g = new Game({ eras: [era], seed: 1 });
    const r = touch(g, 3);
    expect(r.map((x) => x.eyes)).toEqual([1, 2, 0]);
    expect(r.map((x) => x.completed)).toEqual([false, false, true]);
    expect(g.getWorkStatus()).toMatchObject({ pending: 3, dollsCompleted: 1, eyes: 0 });
  });

  it('2터치까지만 하면 0코인 (부분 적립 없음), 진행 상태는 남는다', () => {
    const g = new Game({ eras: [era], seed: 1 });
    touch(g, 2);
    expect(g.getWorkStatus()).toMatchObject({ pending: 0, eyes: 2, dollsCompleted: 0 });
    touch(g, 1, 5_000);
    expect(g.getWorkStatus()).toMatchObject({ pending: 3, eyes: 0 });
  });

  it('초당 터치 상한: 1초 안에 6번을 넘는 터치는 무시', () => {
    const lim = new TouchLimiter(6);
    const allowed = Array.from({ length: 10 }, (_, i) => lim.allow(1000 + i * 50)).filter(Boolean).length;
    expect(allowed).toBe(6);
    expect(lim.allow(2001)).toBe(true); // 1초가 지나면 다시
    const g = new Game({ eras: [era], seed: 2 });
    const r = Array.from({ length: 12 }, (_, i) => g.workTouch(i * 10)); // 0.12초 동안 12번
    expect(r.filter((x) => x.accepted)).toHaveLength(6);
    expect(g.getWorkStatus().pending).toBe(6); // 6터치 = 인형 2개
  });

  it('순수 함수 applyTouch: 진행만 바꾸고 완성 여부를 알려준다', () => {
    const rules = DEFAULT_CONFIG.work;
    let s = newWorkState();
    const done: boolean[] = [];
    for (let i = 0; i < 6; i++) {
      const r = applyTouch(s, rules);
      s = r.state;
      done.push(r.completed);
    }
    expect(done).toEqual([false, false, true, false, false, true]);
    expect(s.touches).toBe(6);
  });

  it('시대가 끝났거나 앱이 백그라운드면 터치를 받지 않는다', () => {
    const g = new Game({ eras: [era], seed: 3 });
    g.suspend();
    expect(g.workTouch(0).accepted).toBe(false);
    g.resume();
    while (g.phase === 'running') g.advanceTick();
    expect(g.workTouch(10_000).accepted).toBe(false);
  });
});

describe('시대 종료 지급 (기본 era_end)', () => {
  it('작업 중에는 현금이 변하지 않는다 (주문 가능 금액 그대로)', () => {
    const g = new Game({ eras: [era], seed: 4 });
    for (let i = 0; i < 100; i++) g.advanceTick();
    const cash = g.account.cash;
    const max = g.maxBuyQuantity(g.activeStocks[0]!.id);
    touch(g, 30);
    expect(g.account.cash).toBe(cash);
    expect(g.maxBuyQuantity(g.activeStocks[0]!.id)).toBe(max);
    expect(g.getWorkStatus().pending).toBe(30);
  });

  it('시대 종료: 청산 → 투자 수익률(작업 제외) → 작업 수입 합산 → 다음 시대 시작 자금으로 이월', () => {
    const eras = threeEras();
    const withWork = new Game({ eras, seed: 5 });
    const noWork = new Game({ eras, seed: 5 });
    const act = (g: Game, work: boolean) => {
      while (g.phase === 'running') {
        const r = g.advanceTick();
        if (r.advanced && r.tick === 100) g.buy(g.activeStocks[0]!.id, 5);
        if (work && r.advanced && r.tick === 200) touch(g, 300, 1_000_000);
      }
    };
    act(withWork, true);
    act(noWork, false);
    const s = withWork.settlements[0]!;
    const n = noWork.settlements[0]!;
    expect(s.workIncome).toBe(300);
    expect(s.returnPct).toBe(n.returnPct); // 작업 수입은 투자 수익률에 영향 없음
    expect(s.investmentResult).toEqual({ coins: n.endAssets, returnPct: n.returnPct });
    expect(s.finalTotal).toBe(s.investmentResult.coins + s.workIncome);
    expect(withWork.account.cash).toBe(s.finalTotal);
    withWork.startNextEra();
    expect(withWork.eraStartCash).toBe(s.finalTotal); // 다음 시대 수익률은 이월 금액(작업 포함)을 시작 자본으로
    expect(withWork.getWorkStatus().pending).toBe(0);
  });

  it('마지막 시대가 끝나면 최종 요약 (시대별 투자 수익률, 작업 수입, 최종 총 코인)', () => {
    const g = new Game({ eras: threeEras(), seed: 6 });
    expect(() => g.getFinalSummary()).toThrow();
    for (let e = 0; e < 3; e++) {
      while (g.phase === 'running') {
        const r = g.advanceTick();
        if (r.advanced && r.tick === 300) touch(g, 30 * (e + 1), r.tick * 10_000);
      }
      if (e < 2) {
        expect(() => g.getFinalSummary()).toThrow();
        g.startNextEra();
      }
    }
    const f = g.getFinalSummary();
    expect(f.eras.map((x) => x.workIncome)).toEqual([30, 60, 90]);
    expect(f.totalWorkIncome).toBe(180);
    expect(f.finalCoins).toBe(g.account.cash);
    expect(f.eras.at(-1)!.finalTotal).toBe(g.account.cash);
    expect(g.startNextEra()).toBe(false);
    expect(g.getFinalSummary()).toEqual(f);
  });

  it('시대당 작업 수입 상한(기본 꺼짐)을 켜면 그 이상 쌓이지 않는다', () => {
    const g = new Game({ eras: [era], seed: 7, config: { work: { ...DEFAULT_CONFIG.work, incomeCapPerEra: 10 } } });
    touch(g, 30);
    expect(g.getWorkStatus()).toMatchObject({ pending: 10, earned: 10, dollsCompleted: 10 });
  });

  it('파산 대기 시간: 현금이 가장 싼 종목 1주 값보다 적고 보유 종목도 없으면 그 시간을 잰다', () => {
    const g = new Game({ eras: [era], seed: 8, startCash: 500 });
    while (g.phase === 'running') g.advanceTick();
    expect(g.settlements[0]!.brokeTimeSec).toBeGreaterThan(0);
    const rich = new Game({ eras: [era], seed: 8 });
    while (rich.phase === 'running') rich.advanceTick();
    expect(rich.settlements[0]!.brokeTimeSec).toBe(0);
  });
});

describe('즉시 지급 모드 (immediate)', () => {
  it('완성할 때마다 바로 현금에 입금되고, 시간가중수익률은 입금으로 구간을 나눈다', () => {
    const cfg = { work: { ...DEFAULT_CONFIG.work, payoutMode: 'immediate' as const } };
    const g = new Game({ eras: [era], seed: 9, config: cfg });
    const cash = g.account.cash;
    touch(g, 9);
    expect(g.account.cash).toBe(cash + 9);
    expect(g.getWorkStatus().pending).toBe(0);
    while (g.phase === 'running') g.advanceTick();
    const s = g.settlements[0]!;
    expect(s.workIncome).toBe(0);
    expect(s.deposits.work).toBe(9);
    expect(s.returnPct).toBeCloseTo(0, 9); // 매매가 없으니 수익률 0 (입금은 수익이 아님)
    expect(s.finalTotal).toBe(cash + 9);
  });
});

describe('세이브와 기록', () => {
  it('저장 → 불러오기: 정산 예정 수입과 지금 인형 진행(눈 개수)이 그대로', () => {
    const g = PublicGame.create({ eras: [era], seed: 10 });
    for (let i = 0; i < 200; i++) g.advanceTick();
    touch(g, 8); // 인형 2개 + 눈 둘
    const r = restorePublicGame(JSON.parse(JSON.stringify(savePublicGame(createSaveData(), g))), [era])!;
    expect(r.status).toBe('resumed');
    expect(r.game!.getWorkStatus()).toEqual(g.getWorkStatus());
    expect(r.game!.getWorkStatus()).toMatchObject({ pending: 6, eyes: 2 });
  });

  it('[시드 3개] 작업이 섞인 판도 저장 → 불러오기 = 끊김 없이 진행 (상태 지문)', () => {
    for (const seed of [11, 12, 13]) {
      const a = new Game({ eras: threeEras(), seed });
      const run = (g: Game, until: number) => {
        while (g.phase === 'running' && g.tick < until) {
          const r = g.advanceTick();
          if (r.advanced && r.tick % 50 === 0) touch(g, 7, r.tick * 10_000);
        }
      };
      run(a, 700);
      const r = restoreGame(saveGame(createSaveData(), a), threeEras())!;
      expect(r.status).toBe('resumed');
      const b = r.game!;
      expect(stateHash(b)).toBe(stateHash(a));
      run(a, 1440);
      run(b, 1440);
      expect(stateHash(b)).toBe(stateHash(a));
      expect(b.settlements[0]!.finalTotal).toBe(a.settlements[0]!.finalTotal);
    }
  });

  it('버전이 달라 자동 정산될 때도 정산 예정 작업 수입을 합산한다', () => {
    const g = new Game({ eras: threeEras(), seed: 14 });
    for (let i = 0; i < 500; i++) g.advanceTick();
    touch(g, 30);
    const cash = g.account.cash;
    const save = saveGame(createSaveData(), g);
    const r = restoreGame({ ...save, game: { ...save.game!, engineVersion: 'old' } }, threeEras())!;
    if (r.status !== 'settled_on_version_change') throw new Error(r.status);
    expect(r.settlement!.workIncome).toBe(30);
    expect(r.settlement!.finalTotal).toBe(cash + 30);
    expect(r.game!.eraStartCash).toBe(cash + 30);
  });

  it('마지막 시대에서 버전이 달라 정산되면 최종 요약을 돌려준다', () => {
    const g = new Game({ eras: [era], seed: 15 });
    for (let i = 0; i < 500; i++) g.advanceTick();
    touch(g, 15);
    const save = saveGame(createSaveData(), g);
    const r = restoreGame({ ...save, game: { ...save.game!, engineVersion: 'old' } }, [era])!;
    if (r.status !== 'settled_on_version_change') throw new Error(r.status);
    expect(r.game).toBeNull();
    expect(r.finalSummary!.totalWorkIncome).toBe(15);
    expect(r.finalSummary!.finalCoins).toBe(10_000 + 15);
  });

  it('작업 적립도 플레이 기록으로 리플레이된다', () => {
    const buf = new TelemetryBuffer(100_000);
    const g = new Game({ eras: [era], seed: 16, telemetry: buf, telemetryConsent: true });
    while (g.phase === 'running') {
      const r = g.advanceTick();
      if (r.advanced && r.tick % 100 === 0) touch(g, 10, r.tick * 10_000);
    }
    const end = buf.peek().find((e) => e.type === 'era_end')!.data as { workIncome: number; workTouches: number; brokeTimeSec: number };
    expect(end.workIncome).toBe(g.settlements[0]!.workIncome);
    expect(end.workTouches).toBe(140);
    const rp = replay(buf.peek(), [era]);
    expect(rp.failedActions).toBe(0);
    expect(rp.game.settlements[0]!.finalTotal).toBe(g.settlements[0]!.finalTotal);
  });

  it('판 도중 기록 동의를 켜도 그 전 작업 적립이 리플레이된다', () => {
    const buf = new TelemetryBuffer(100_000);
    const g = new Game({ eras: [era], seed: 17, telemetry: buf });
    for (let i = 0; i < 300; i++) g.advanceTick();
    touch(g, 12);
    setTelemetryConsent(createSaveData(), true);
    g.setConsent(true);
    while (g.phase === 'running') g.advanceTick();
    expect(replay(buf.peek(), [era]).game.settlements[0]!.finalTotal).toBe(g.settlements[0]!.finalTotal);
  });
});
