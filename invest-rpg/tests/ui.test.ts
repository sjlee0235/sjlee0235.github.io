// 화면 로직 테스트 (DOM 없이): 탭 전환·NEWS!·코인 표시·주문 '최대'·리포트 행과 읽음 처리·속도 선택과 유지·
// LP 순환·강아지 3터치·인형 3터치와 정산 예정·정산 창 합계·게임 루프(가짜 타이머)

import { describe, expect, it } from 'vitest';
import { MockAudioBackend, MusicPlayer, type MusicTrack } from '../src/audio/music.ts';
import musicData from '../src/data/audio/music.json' with { type: 'json' };
import { createPresentationRng, newDogState, petDog } from '../src/engine/dogPetting.ts';
import { DEFAULT_CONFIG } from '../src/engine/config.ts';
import { TabController } from '../src/engine/homeActivities.ts';
import { PublicGame, type PublicAdvanceResult } from '../src/engine/publicView.ts';
import { fmtNum, fmtPct, fmtTime } from '../src/ui/format.ts';
import { GameLoop, type Clock } from '../src/ui/loop.ts';
import { pixelScale } from '../src/ui/scale.ts';
import {
  feedRows, newOrderState, orderMessage, reportRow, setMax, setQuantity, setSide, settlementView, stepQuantity, stockRows, toggleExpanded,
} from '../src/ui/viewModels.ts';
import { makeSpecEra } from './fixtures/makeEra.ts';

const era = makeSpecEra({ id: 'ui' });
const newGame = (seed = 4) => PublicGame.create({ eras: [era], seed });

/** 뉴스가 하나 발표될 때까지 */
function untilNews(g: PublicGame): Extract<PublicAdvanceResult, { advanced: true }> {
  for (;;) {
    const r = g.advanceTick();
    if (!r.advanced) throw new Error('뉴스 전에 시대가 끝남');
    if (r.news) return r;
  }
}

class FakeClock implements Clock {
  now = 0;
  private seq = 0;
  private timers: { id: number; at: number; fn: () => void }[] = [];
  setTimeout(fn: () => void, ms: number): number {
    const id = ++this.seq;
    this.timers.push({ id, at: this.now + ms, fn });
    return id;
  }
  clearTimeout(id: number): void {
    this.timers = this.timers.filter((t) => t.id !== id);
  }
  get pending(): number {
    return this.timers.length;
  }
  advance(ms: number): void {
    const end = this.now + ms;
    for (;;) {
      this.timers.sort((a, b) => a.at - b.at);
      const next = this.timers[0];
      if (!next || next.at > end) break;
      this.timers.shift();
      this.now = next.at;
      next.fn();
    }
    this.now = end;
  }
}

describe('형식', () => {
  it('코인·%·시간', () => {
    expect(fmtNum(1234567)).toBe('1,234,567');
    expect(fmtPct(3.456)).toBe('+3.5%');
    expect(fmtPct(-0.04)).toBe('0.0%');
    expect(fmtPct(-2)).toBe('-2.0%');
    expect(fmtTime(7200)).toBe('2:00:00');
    expect(fmtTime(65)).toBe('1:05');
  });

  it('정수 배율: 360×640, 390×844는 2배', () => {
    expect(pixelScale(360, 640)).toBe(2);
    expect(pixelScale(390, 844)).toBe(2);
    expect(pixelScale(540, 960)).toBe(3);
    expect(pixelScale(200, 300)).toBe(1);
  });
});

describe('탭·NEWS!·코인 표시', () => {
  it('안 읽은 뉴스가 있으면 주식창 밖에서 NEWS!, 주식창에 들어가면 사라진다', () => {
    const g = newGame();
    const tabs = new TabController(g);
    tabs.select('living_room');
    untilNews(g);
    tabs.onTick();
    expect(tabs.topBar().newsBadge).toBe(true);
    tabs.select('workshop');
    expect(tabs.topBar().newsBadge).toBe(true);
    tabs.select('trading');
    expect(g.getUnreadCount()).toBe(0);
    tabs.select('living_room');
    expect(tabs.topBar().newsBadge).toBe(false);
  });

  it('주식창에 있는 동안 온 뉴스는 틱마다 바로 읽음 (NEWS! 안 뜸)', () => {
    const g = newGame();
    const tabs = new TabController(g);
    untilNews(g);
    tabs.onTick();
    expect(g.getUnreadCount()).toBe(0);
  });

  it('주식창 밖에서는 보유 현금, 주식창에서는 계좌 바 (현금 표시 없음)', () => {
    const g = newGame();
    const tabs = new TabController(g);
    expect(tabs.topBar().cash).toBeNull();
    expect(tabs.topBar().accountBar?.totalAssets).toBe(g.getPortfolio().totalAssets);
    tabs.select('tv_shopping');
    expect(tabs.topBar().cash).toBe(g.cash);
    expect(tabs.topBar().accountBar).toBeNull();
  });
});

describe('주문 패널', () => {
  it("'최대'는 매수면 수수료 포함 최대, 매도면 보유 전부. 수량은 1 이상 정수", () => {
    const g = newGame();
    const s = g.getStockList()[0]!;
    let o = newOrderState(s.id);
    o = setMax(o, g.maxQty('buy', s.id));
    expect(o.quantity).toBe(g.maxBuyQuantity(s.id));
    expect(g.previewOrder('buy', s.id, o.quantity).error).toBeNull();
    g.buy(s.id, 5);
    o = setSide(o, 'sell');
    o = setMax(o, g.maxQty('sell', s.id));
    expect(o.quantity).toBe(5);
    expect(setQuantity(o, 0).quantity).toBe(1);
    expect(setQuantity(o, 2.7).quantity).toBe(2);
    expect(stepQuantity(setQuantity(o, 1), -1).quantity).toBe(1);
    expect(stepQuantity(o, 1).quantity).toBe(6);
  });

  it('체결 안내와 오류 문구', () => {
    const g = newGame();
    const s = g.getStockList()[0]!;
    const ok = orderMessage(g.buy(s.id, 2), '하늘 배터리주', 'ko');
    expect(ok.ok).toBe(true);
    expect(ok.text).toContain('2주 체결');
    const bad = orderMessage(g.sell(s.id, 99), '하늘 배터리주', 'ko');
    expect(bad).toEqual({ ok: false, text: '보유 수량이 부족합니다.' });
  });

  it('종목 목록 색은 설정의 상승 색상 모드를 따른다', () => {
    const g = newGame();
    for (let i = 0; i < 30; i++) g.advanceTick();
    const list = g.getStockList();
    const up = list.find((s) => s.changePct >= 0.05);
    if (up) {
      expect(stockRows([up], 'korean', 'ko')[0]!.color).toBe('red');
      expect(stockRows([up], 'western', 'ko')[0]!.color).toBe('green');
    }
  });
});

describe('뉴스 피드·주가 리포트 행', () => {
  it('최신 뉴스는 펼침, 이전 뉴스는 접힘. 120초 뒤 그 뉴스 아래 리포트 행', () => {
    const g = newGame();
    untilNews(g);
    let rows = feedRows(g.getFeed(), new Set(), 'ko');
    expect(rows).toHaveLength(1);
    expect(rows[0]!.expanded).toBe(true);
    expect(rows[0]!.body).not.toBeNull();
    expect(rows[0]!.report).toBeNull();
    for (let i = 0; i < 24; i++) g.advanceTick(); // 120초
    rows = feedRows(g.getFeed(), new Set(), 'ko');
    expect(rows[0]!.report).not.toBeNull();
    expect(rows[0]!.report!.lines.length).toBeGreaterThan(0);
    expect(rows[0]!.report!.lines.length).toBeLessThanOrEqual(3);

    untilNews(g);
    rows = feedRows(g.getFeed(), new Set(), 'ko');
    expect(rows[0]!.expanded).toBe(true);
    expect(rows[1]!.expanded).toBe(false);
    expect(rows[1]!.body).toBeNull();
    expect(rows[1]!.report).toBeNull(); // 접혀 있으면 리포트도 안 보임
    const opened = feedRows(g.getFeed(), toggleExpanded(new Set(), rows[1]!.id), 'ko');
    expect(opened[1]!.report).not.toBeNull();
    expect(toggleExpanded(toggleExpanded(new Set(), 'x'), 'x').has('x')).toBe(false);
  });

  it('리포트는 안 읽음 강조만 하고 NEWS!에는 쓰지 않는다. 주식창에 들어가면 모두 읽음', () => {
    const g = newGame();
    const tabs = new TabController(g);
    untilNews(g);
    tabs.onTick();
    tabs.select('living_room');
    for (let i = 0; i < 24; i++) g.advanceTick();
    expect(g.getUnreadReportCount()).toBe(1);
    expect(g.getUnreadCount()).toBe(0);
    expect(tabs.topBar().newsBadge).toBe(false);
    expect(feedRows(g.getFeed(), new Set(), 'ko')[0]!.report!.unread).toBe(true);
    tabs.select('trading');
    expect(g.getUnreadReportCount()).toBe(0);
  });

  it('리포트 행에 호재/악재 같은 방향 단어가 아니라 실제 반영 %만 (잠정 뉴스는 안내 문구)', () => {
    const g = newGame();
    const first = untilNews(g);
    expect(first.news!.kind).toBe('tentative');
    for (let i = 0; i < 24; i++) g.advanceTick();
    const rep = g.getFeed()[0]!.report!;
    const row = reportRow(rep, 'ko');
    expect(row.notes.join(' ')).toContain('잠정 발표');
    for (const l of row.lines) expect(l.split).toMatch(/발표 즉시 .* · 5초 뒤 .* · 합계 /);
  });
});

describe('속도 선택과 유지', () => {
  it('2배를 고르면 탭을 옮겨도 유지되고, 밖에서는 x2 표시', () => {
    const g = newGame();
    const tabs = new TabController(g);
    g.setSpeed(2);
    tabs.select('living_room');
    expect(g.getSpeed()).toBe(2);
    expect(tabs.topBar().speedBadge).toBe('x2');
    tabs.select('trading');
    expect(tabs.topBar().accountBar?.speed).toBe(2);
  });
});

describe('게임 루프 (가짜 타이머)', () => {
  it('1배 5초, 2배 2.5초마다 틱. 배속을 바꾸면 바로 새 간격', () => {
    const g = newGame();
    const clock = new FakeClock();
    let ticks = 0;
    const loop = new GameLoop(g, clock, () => ticks++);
    loop.start();
    clock.advance(10_000);
    expect(ticks).toBe(2);
    g.setSpeed(2);
    loop.reschedule();
    clock.advance(10_000);
    expect(ticks).toBe(6);
  });

  it('백그라운드: 멈추고, 돌아와도 밀린 틱을 몰아서 따라잡지 않는다', () => {
    const g = newGame();
    const clock = new FakeClock();
    let ticks = 0;
    const loop = new GameLoop(g, clock, () => ticks++);
    loop.start();
    clock.advance(5_000);
    expect(ticks).toBe(1);
    loop.setHidden(true);
    expect(g.isPaused).toBe(true);
    clock.advance(600_000);
    expect(ticks).toBe(1);
    loop.setHidden(false);
    expect(g.isPaused).toBe(false);
    clock.advance(4_999);
    expect(ticks).toBe(1);
    clock.advance(1);
    expect(ticks).toBe(2);
  });

  it('시대가 끝나면 타이머를 멈춘다 (정산 창)', () => {
    const g = newGame();
    const clock = new FakeClock();
    let settlement = null as PublicAdvanceResult | null;
    const loop = new GameLoop(g, clock, (r) => {
      if (r.advanced && r.settlement) settlement = r;
    });
    loop.setTimeScale(10);
    loop.start();
    clock.advance(10_000_000);
    expect(settlement).not.toBeNull();
    expect(loop.isRunning).toBe(false);
    expect(clock.pending).toBe(0);
  });
});

describe('거실: LP 순환·강아지', () => {
  it('LP 터치: 재즈 → 클래식 → 힙합 → 락 → 재즈 (첫 터치 전에는 소리 없음)', () => {
    const backend = new MockAudioBackend();
    const p = new MusicPlayer(musicData.tracks as MusicTrack[], backend, createPresentationRng(1, 'music'));
    expect(p.getNowPlaying().genre).toBe('jazz');
    p.cycleGenre();
    expect(backend.playing.size).toBe(0);
    p.unlock();
    expect(backend.playing.size).toBe(1);
    expect([p.cycleGenre(), p.cycleGenre(), p.cycleGenre()]).toEqual(['hiphop', 'rock', 'jazz']);
  });

  it('강아지: 3번째 터치마다 반응, 시장 결과는 그대로', () => {
    const a = newGame(9);
    const b = newGame(9);
    let dog = newDogState();
    const rng = createPresentationRng(9, 'dog');
    const reactions: (string | null)[] = [];
    for (let i = 0; i < 9; i++) {
      const r = petDog(dog, 'puppy', rng);
      dog = r.state;
      reactions.push(r.reaction);
    }
    expect(reactions.map((r) => r !== null)).toEqual([false, false, true, false, false, true, false, false, true]);
    for (let i = 0; i < 200; i++) {
      a.advanceTick();
      b.advanceTick();
    }
    expect(a.getStockList().map((s) => s.price)).toEqual(b.getStockList().map((s) => s.price));
  });
});

describe('작업실·정산 창', () => {
  it('인형 3터치마다 정산 예정 +3, 보유 현금은 그대로. 상단 카운터에 반영', () => {
    const g = newGame();
    const tabs = new TabController(g);
    tabs.select('workshop');
    const cash = g.cash;
    const t0 = 1_000_000;
    expect(g.workTouch(t0).eyes).toBe(1);
    expect(g.workTouch(t0 + 200).eyes).toBe(2);
    expect(tabs.topBar().workPending).toBe(0);
    const third = g.workTouch(t0 + 400);
    expect(third.completed).toBe(true);
    expect(tabs.topBar().workPending).toBe(3);
    expect(tabs.topBar().cash).toBe(cash);
  });

  it('정산 창: 투자 결과 + 작업 수입 = 합계 (시대 종료 합산 모드)', () => {
    const g = PublicGame.create({ eras: [era], seed: 4, config: { work: { ...DEFAULT_CONFIG.work, payoutMode: 'era_end' } } });
    const t0 = 1_000_000;
    for (let i = 0; i < 9; i++) g.workTouch(t0 + i * 200);
    const s = g.getStockList()[0]!;
    g.buy(s.id, 3);
    let settlement = null;
    while (g.phase === 'running') {
      const r = g.advanceTick();
      if (r.advanced && r.settlement) settlement = r.settlement;
    }
    const v = settlementView(settlement!, 'ko');
    expect(v.sumOk).toBe(true);
    expect(v.workIncome).toBe('9');
    expect(settlement!.investmentResult.coins + 9).toBe(settlement!.finalTotal);
  });
});
