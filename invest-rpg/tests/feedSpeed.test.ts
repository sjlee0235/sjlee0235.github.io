import { describe, expect, it } from 'vitest';
import { tickIntervalMs } from '../src/engine/config.ts';
import { Game } from '../src/engine/game.ts';
import { PublicGame, restorePublicGame, savePublicGame } from '../src/engine/publicView.ts';
import { createSaveData } from '../src/engine/save.ts';
import { TutorialSession } from '../src/engine/tutorial.ts';
import { makeSpecEra } from './fixtures/makeEra.ts';

const era = makeSpecEra({ id: 'fs' });

describe('일시정지 사유 (tutorial / background)', () => {
  it('사유가 하나라도 있으면 시간이 멈추고, 모두 풀려야 다시 흐른다', () => {
    const g = new Game({ eras: [era], seed: 1 });
    g.advanceTick();
    g.pause('background');
    g.pause('tutorial');
    expect(g.advanceTick()).toMatchObject({ advanced: false, paused: true, pauseReasons: ['background', 'tutorial'] });
    g.resume('background');
    expect(g.advanceTick().advanced).toBe(false);
    g.resume('tutorial');
    expect(g.advanceTick().advanced).toBe(true);
  });

  it("'background'(앱이 백그라운드)에서는 매매도 막히고, 'tutorial'에서는 매매가 된다", () => {
    const g = new Game({ eras: [era], seed: 2 });
    const id = g.activeStocks[0]!.id;
    g.pause('tutorial');
    expect(g.buy(id, 1).ok).toBe(true);
    g.pause('background');
    expect(g.buy(id, 1)).toEqual({ ok: false, error: 'not-tradable' });
    expect(g.pendingSaveReasons).toContain('background');
  });

  it('주가 리포트는 시간을 멈추지 않는다 (시대 내내 일시정지 없이 리포트가 붙는다)', () => {
    const g = new Game({ eras: [era], seed: 3 });
    let reports = 0;
    while (g.phase === 'running') {
      const r = g.advanceTick();
      expect(r.advanced).toBe(true);
      if (r.advanced) reports += r.reports.length;
    }
    expect(reports).toBeGreaterThan(10);
  });
});

describe('뉴스 피드와 주가 리포트 행', () => {
  it('피드는 최신순, 리포트는 발표 120초(24틱) 뒤 그 뉴스 아래에 붙는다', () => {
    const g = PublicGame.create({ eras: [era], seed: 4 });
    let firstNewsTick = -1;
    while (g.phase === 'running' && g.tick < 400) {
      const r = g.advanceTick();
      if (!r.advanced) continue;
      if (r.news && firstNewsTick < 0) firstNewsTick = r.tick;
      if (firstNewsTick > 0 && r.tick === firstNewsTick + 23) expect(g.getFeed().at(-1)!.report).toBeUndefined();
      if (firstNewsTick > 0 && r.tick === firstNewsTick + 24) {
        const oldest = g.getFeed().at(-1)!;
        expect(oldest.report).toBeDefined();
        expect(oldest.report!.newsId).toBe(oldest.news.id);
        expect(oldest.report!.items.length).toBeLessThanOrEqual(3);
        expect(oldest.report!.tentativeNote).toBe(true); // 첫 뉴스는 잠정
      }
    }
    const feed = g.getFeed();
    for (let i = 1; i < feed.length; i++) expect(feed[i - 1]!.news.publishedTick).toBeGreaterThan(feed[i]!.news.publishedTick);
  });

  it('읽지 않은 뉴스 수 / 리포트 수 / 모두 읽음. NEWS! 알림은 뉴스만 센다', () => {
    const g = PublicGame.create({ eras: [era], seed: 5 });
    while (g.getFeed().length < 2) g.advanceTick();
    expect(g.getUnreadCount()).toBe(2);
    g.markAllRead();
    expect(g.getUnreadCount()).toBe(0);
    // 리포트가 새로 붙어도 뉴스 알림 수는 그대로
    while (g.getUnreadReportCount() === 0) g.advanceTick();
    expect(g.getUnreadCount()).toBe(0);
    expect(g.getFeed().some((e) => e.reportUnread)).toBe(true);
    g.markAllRead();
    expect(g.getUnreadReportCount()).toBe(0);
  });

  it('결과 뉴스와 그 리포트는 이어진 잠정 뉴스의 공개 id를 담는다', () => {
    const g = PublicGame.create({ eras: [era], seed: 6 });
    while (g.phase === 'running') g.advanceTick();
    const feed = g.getFeed();
    const ids = new Set(feed.map((e) => e.news.id));
    const outcomes = feed.filter((e) => e.news.kind === 'outcome');
    expect(outcomes.length).toBeGreaterThan(0);
    for (const o of outcomes) {
      expect(ids.has(o.news.relatedTentativeId!)).toBe(true);
      if (o.report) expect(o.report.relatedTentativeId).toBe(o.news.relatedTentativeId);
    }
  });

  it('읽음 상태는 세이브에 들어가고, 피드 내용은 리플레이로 복원된다', () => {
    const g = PublicGame.create({ eras: [era], seed: 7 });
    for (let i = 0; i < 300; i++) g.advanceTick();
    g.markAllRead();
    for (let i = 0; i < 200; i++) g.advanceTick();
    const r = restorePublicGame(JSON.parse(JSON.stringify(savePublicGame(createSaveData(), g))), [era])!;
    expect(r.status).toBe('resumed');
    expect(r.game!.getFeed()).toEqual(g.getFeed());
    expect(r.game!.getUnreadCount()).toBe(g.getUnreadCount());
  });
});

describe('배속 1배 / 2배', () => {
  it('틱 간격: 1배 5,000ms, 2배 2,500ms (게임 시간 1틱 = 5초는 그대로)', () => {
    expect(tickIntervalMs(1)).toBe(5000);
    expect(tickIntervalMs(2)).toBe(2500);
  });

  it('[시드 5개] 같은 시드에서 1배와 2배의 틱별 가격·뉴스가 완전히 같고, 리포트는 게임 시간 120초 뒤', () => {
    for (let seed = 1; seed <= 5; seed++) {
      const a = new Game({ eras: [era], seed });
      const b = new Game({ eras: [era], seed });
      b.setSpeed(2);
      while (a.phase === 'running') {
        const ra = a.advanceTick();
        const rb = b.advanceTick();
        if (!ra.advanced || !rb.advanced) throw new Error('멈춤');
        if (ra.changes.map((c) => c.price).join() !== rb.changes.map((c) => c.price).join()) throw new Error(`seed ${seed} tick ${ra.tick}`);
        expect(rb.news?.news.id).toBe(ra.news?.news.id);
        for (const rep of rb.reports) expect(rep.reportTick - rep.publishedTick).toBe(24);
      }
      expect(b.settlements[0]!.endAssets).toBe(a.settlements[0]!.endAssets);
    }
  });

  it('배속은 1 또는 2만, 세이브에 남는다', () => {
    const g = PublicGame.create({ eras: [era], seed: 8 });
    expect(g.getSpeed()).toBe(1);
    g.setSpeed(2);
    expect(() => g.setSpeed(3 as never)).toThrow();
    g.advanceTick();
    const r = restorePublicGame(savePublicGame(createSaveData(), g), [era])!;
    expect(r.game!.getSpeed()).toBe(2);
  });
});

describe('튜토리얼: 뉴스 → (시간 정지) 매수 → 반영 확인 → 피드에 붙은 주가 리포트', () => {
  it('뉴스에서 pause(tutorial), 확인하면 다시 흐르고, 리포트는 피드의 그 뉴스 아래에 붙는다', () => {
    const tut = new TutorialSession();
    while (tut.stage === 'waiting') tut.advanceTick();
    expect(tut.game.currentPauseReasons).toEqual(['tutorial']);
    expect(tut.view.getFeed()).toHaveLength(1);
    const id = tut.view.getStockList()[0]!.id;
    expect(tut.view.buy(id, 1).ok).toBe(true);
    tut.confirmNews();
    expect(tut.game.isPaused).toBe(false);
    while (tut.stage === 'reaction') tut.advanceTick();
    expect(tut.stage).toBe('report');
    expect(tut.view.getFeed()[0]!.report).toBeDefined();
  });
});
