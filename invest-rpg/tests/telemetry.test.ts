import { describe, expect, it } from 'vitest';
import { makeConfig } from '../src/engine/config.ts';
import { Game } from '../src/engine/game.ts';
import { actionsFromEvents, replay } from '../src/engine/replay.ts';
import { createSaveData, restoreGame, saveGame, setTelemetryConsent } from '../src/engine/save.ts';
import {
  balanceHash, ENGINE_VERSION, fromJsonLines, TelemetryBuffer, toJsonLines,
  type EngineEventMap, type TelemetryEvent,
} from '../src/engine/telemetry.ts';
import { TutorialSession } from '../src/engine/tutorial.ts';
import { makeSpecEra } from './fixtures/makeEra.ts';

const era = makeSpecEra({ id: 'tel' });
const ofType = <K extends keyof EngineEventMap>(events: TelemetryEvent[], type: K) =>
  events.filter((e) => e.type === type).map((e) => ({ ...e, data: e.data as EngineEventMap[K] }));

/** 뉴스가 뜨면 가장 큰 호재 종목을 사고, 다음 뉴스 때 판다. 가끔 일부러 실패하는 주문도 낸다 */
function playWithBot(seed: number, buffer: TelemetryBuffer | null) {
  const game = new Game({ eras: [era], seed, ...(buffer ? { telemetry: buffer, telemetryConsent: true } : {}) });
  while (game.phase !== 'era-ended') {
    const r = game.advanceTick();
    if (!r.advanced || r.settlement) continue;
    if (r.news) {
      for (const h of game.account.getHoldings()) game.sell(h.stockId, h.quantity);
      const best = [...r.news.news.effects].sort((a, b) => b.impact - a.impact)[0]!;
      const stock = game.activeStocks.find((s) => s.themeId === best.themeId)!;
      if (best.impact > 0) game.buy(stock.id, Math.max(1, game.maxBuyQuantity(stock.id)));
      game.buy(stock.id, 1_000_000); // 잔고 부족으로 거부되는 주문
    }
  }
  return game;
}

describe('플레이 기록 (텔레메트리)', () => {
  it('기록을 붙여도 게임 결과(가격·수익)는 똑같다', () => {
    const a = playWithBot(5, null);
    const b = playWithBot(5, new TelemetryBuffer());
    expect(b.settlements[0]!.endAssets).toBe(a.settlements[0]!.endAssets);
    expect(b.getStockList().map((s) => s.price)).toEqual(a.getStockList().map((s) => s.price));
  });

  it('시작 기록: game_start(시드·엔진 버전·밸런스 지문) → era_start(추첨 결과)', () => {
    const buf = new TelemetryBuffer();
    const game = playWithBot(7, buf);
    const events = buf.peek();
    expect(events[0]!.type).toBe('game_start');
    expect(events[0]!.data).toMatchObject({ mode: 'main', seed: 7, engineVersion: ENGINE_VERSION, balanceHash: balanceHash(game.config) });
    expect(events[1]!.type).toBe('era_start');
    expect((events[1]!.data as EngineEventMap['era_start']).activeThemeIds).toEqual(game.draw.activeThemeIds);
    expect(events.map((e) => e.seq)).toEqual(events.map((_, i) => i + 1));
  });

  it('뉴스: 뜬 뉴스마다 news_published(즉시 몫 포함), 다음 틱 news_reacted, 해설 생성 기록', () => {
    const buf = new TelemetryBuffer();
    const game = playWithBot(8, buf);
    const events = buf.peek();
    const published = ofType(events, 'news_published');
    expect(published.map((e) => e.data.newsId)).toEqual(game.shownNews.map((s) => s.news.id));
    for (const p of published) {
      expect(p.data.instant.length).toBeGreaterThan(0);
      const reacted = ofType(events, 'news_reacted').find((e) => e.data.newsId === p.data.newsId)!;
      expect(reacted.tick).toBe(p.tick + 1);
    }
    expect(ofType(events, 'report_created').length).toBe(game.getNewsArchive().filter((a) => a.report).length);
  });

  it('매매: 체결마다 trade(매매 순간 상황 포함), 거부된 주문은 trade_rejected', () => {
    const buf = new TelemetryBuffer();
    const game = playWithBot(9, buf);
    const events = buf.peek();
    const trades = ofType(events, 'trade');
    expect(trades.length).toBe(game.account.getTrades().length);
    expect(ofType(events, 'trade_rejected').length).toBeGreaterThan(0);
    for (const t of trades.filter((x) => !x.data.auto && x.data.side === 'buy')) {
      // 봇은 뉴스가 뜬 그 틱(즉시 몫 반영 직후)에 산다
      expect(t.data.context.ticksSinceNews).toBe(0);
      expect(t.data.context.newsLink?.impact).toBeGreaterThan(0);
    }
    for (const t of trades.filter((x) => x.data.side === 'sell')) {
      expect(t.data.holdTicks).toBeGreaterThan(0);
      expect(t.data.realizedPnl).not.toBeNull();
    }
    expect(trades.some((t) => t.data.auto)).toBe(true); // 시대 종료 자동 청산
  });

  it('정산: era_end 수익률 = 정산 결과, 1분마다 asset_snapshot (2시간 = 120개)', () => {
    const buf = new TelemetryBuffer();
    const game = playWithBot(10, buf);
    const events = buf.peek();
    const end = ofType(events, 'era_end')[0]!;
    expect(end.data.returnPct).toBe(game.settlements[0]!.returnPct);
    expect(end.data.peakAssets).toBeGreaterThanOrEqual(end.data.troughAssets);
    expect(end.data.investedShare).toBeGreaterThan(0);
    expect(ofType(events, 'asset_snapshot')).toHaveLength(120);
  });

  it('리플레이: 기록의 매매만으로 똑같은 결과를 다시 만든다', () => {
    for (const seed of [11, 12, 13]) {
      const buf = new TelemetryBuffer();
      const game = playWithBot(seed, buf);
      const r = replay(buf.peek(), [era]);
      expect(r.failedActions).toBe(0);
      expect(r.returns[0]).toBe(game.settlements[0]!.returnPct);
      // 가정 비교: 매매를 하나도 안 했다면 수익 0%
      expect(replay(buf.peek(), [era], {}, []).returns[0]).toBe(0);
    }
  });

  it('JSON Lines로 저장했다가 그대로 읽을 수 있다', () => {
    const buf = new TelemetryBuffer();
    playWithBot(14, buf);
    const events = buf.peek();
    expect(fromJsonLines(toJsonLines(events))).toEqual(events);
    expect(actionsFromEvents(fromJsonLines(toJsonLines(events))).length).toBeGreaterThan(0);
  });

  it('화면 이벤트 track(): 지금 시대·틱과 실제 시각(clientMs)을 붙여 기록', () => {
    const buf = new TelemetryBuffer();
    const game = new Game({ eras: [era], seed: 1, telemetry: buf, telemetryConsent: true });
    for (let i = 0; i < 5; i++) game.advanceTick();
    game.track('screen_view', { screen: 'chart', dwellMs: 3200, targetId: game.activeStocks[0]!.id }, 1_700_000_000_000);
    const last = buf.peek().at(-1)!;
    expect(last).toMatchObject({ type: 'screen_view', tick: 5, eraId: 'tel', clientMs: 1_700_000_000_000 });
    // 기록을 안 붙이면 아무 일도 없다
    new Game({ eras: [era], seed: 1 }).track('screen_view', { screen: 'market', dwellMs: 1 });
  });

  it('일시정지·재개, 관심 종목 토글도 기록', () => {
    const buf = new TelemetryBuffer();
    const game = new Game({ eras: [era], seed: 1, telemetry: buf, telemetryConsent: true });
    game.suspend();
    game.suspend();
    game.resume();
    game.toggleFavorite(game.activeStocks[0]!.id);
    expect(buf.peek().slice(2).map((e) => e.type)).toEqual(['paused', 'resumed', 'favorite_toggled']);
  });

  it('밸런스 지문: 설정이 바뀌면 달라지고, 같으면 같다', () => {
    expect(balanceHash(makeConfig())).toBe(balanceHash(makeConfig()));
    expect(balanceHash(makeConfig({ feeRate: 0.001 }))).not.toBe(balanceHash(makeConfig()));
  });

  it('기록 통이 넘치면 오래된 것부터 버리고 개수를 센다', () => {
    const buf = new TelemetryBuffer(10);
    playWithBot(3, buf);
    expect(buf.size).toBe(10);
    expect(buf.dropped).toBeGreaterThan(0);
    expect(buf.drain()).toHaveLength(10);
    expect(buf.size).toBe(0);
  });

  it('튜토리얼: mode=tutorial, 단계 진입이 순서대로 기록된다', () => {
    const buf = new TelemetryBuffer();
    const tut = new TutorialSession({}, { telemetry: buf, telemetryConsent: true });
    while (tut.stage === 'waiting') tut.advanceTick();
    tut.confirmNews();
    while (tut.stage === 'reaction') tut.advanceTick();
    tut.finish();
    const events = buf.peek();
    expect(events[0]!.data).toMatchObject({ mode: 'tutorial' });
    const steps = events.filter((e) => e.type === 'tutorial_step').map((e) => (e.data as { step: string }).step);
    expect(steps).toEqual(['waiting', 'reading', 'reaction', 'report', 'done']);
  });

  it('세이브에서 이어 하기: restored=true', () => {
    const game = new Game({ eras: [era], seed: 2 });
    const buf = new TelemetryBuffer();
    restoreGame(setTelemetryConsent(saveGame(createSaveData(), game), true), [era], undefined, { telemetry: buf });
    expect(buf.peek()[0]!.data).toMatchObject({ restored: true, seed: 2 });
  });

  it('동의 전에는 기록 통을 붙여도 아무것도 나가지 않는다 (기본 꺼짐)', () => {
    const buf = new TelemetryBuffer();
    const game = new Game({ eras: [era], seed: 1, telemetry: buf });
    for (let i = 0; i < 50; i++) game.advanceTick();
    game.buy(game.activeStocks[0]!.id, 1);
    game.track('screen_view', { screen: 'market', dwellMs: 10 });
    expect(game.isRecording).toBe(false);
    expect(buf.size).toBe(0);
  });

  it('판 도중 동의하면 그때부터 기록하고, 그 전 행동도 game_start에 담겨 리플레이된다', () => {
    const buf = new TelemetryBuffer();
    const game = new Game({ eras: [era], seed: 21, telemetry: buf });
    for (let i = 0; i < 100; i++) game.advanceTick();
    game.buy(game.activeStocks[2]!.id, 3);
    game.deposit(2_000, 'purchase');
    game.setConsent(true);
    expect(buf.peek()[0]!.type).toBe('game_start');
    expect((buf.peek()[0]!.data as EngineEventMap['game_start']).priorActions).toHaveLength(2);
    while (game.phase === 'running') game.advanceTick();
    const r = replay(buf.peek(), [era]);
    expect(r.failedActions).toBe(0);
    expect(r.returns[0]).toBe(game.settlements[0]!.returnPct);
    // 동의 철회 → 더 기록하지 않음
    const n = buf.size;
    game.setConsent(false);
    game.track('screen_view', { screen: 'market', dwellMs: 10 });
    expect(buf.size).toBe(n);
  });

  it('기록에는 개인·기기 식별 정보 필드가 없다', () => {
    const buf = new TelemetryBuffer();
    playWithBot(22, buf);
    const keys = new Set<string>();
    const walk = (v: unknown) => {
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) { keys.add(k.toLowerCase()); walk(x); }
    };
    walk(buf.peek());
    for (const banned of ['name', 'email', 'phone', 'deviceid', 'idfa', 'adid', 'imei', 'ip', 'location', 'userid']) {
      expect(keys.has(banned)).toBe(false);
    }
  });

  it('입금 기록도 리플레이된다', () => {
    const buf = new TelemetryBuffer();
    const game = new Game({ eras: [era], seed: 23, telemetry: buf, telemetryConsent: true });
    while (game.phase === 'running') {
      const r = game.advanceTick();
      if (r.advanced && r.tick === 200) game.buy(game.activeStocks[1]!.id, 5);
      if (r.advanced && r.tick === 300) game.deposit(5_000, 'ad');
    }
    game.deposit(700, 'work'); // 시대가 끝난 뒤 입금
    expect(buf.peek().filter((e) => e.type === 'deposit')).toHaveLength(2);
    const r = replay(buf.peek(), [era]);
    expect(r.failedActions).toBe(0);
    expect(r.game.account.cash).toBe(game.account.cash);
  });
});
