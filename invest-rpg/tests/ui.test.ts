// 화면 로직 테스트 (DOM 없이): 탭 전환·NEWS!·코인 표시·주문 '최대'·리포트 행과 읽음 처리·속도 선택과 유지·
// LP 순환·강아지 3터치·인형 3터치와 정산 예정·정산 창 합계·게임 루프(가짜 타이머)

import { describe, expect, it } from 'vitest';
import { MockAudioBackend, MusicPlayer, type MusicTrack } from '../src/audio/music.ts';
import musicData from '../src/data/audio/music.json' with { type: 'json' };
import { createPresentationRng } from '../src/engine/rng.ts';
import { DEFAULT_CONFIG } from '../src/engine/config.ts';
import { TabController } from '../src/engine/homeActivities.ts';
import { PublicGame, type PublicAdvanceResult } from '../src/engine/publicView.ts';
import { fmtNum, fmtPct, fmtTime } from '../src/ui/format.ts';
import { GameLoop, type Clock } from '../src/ui/loop.ts';
import {
  dirClass, finalView, linePoints, needView, newOrderState, newsItems, orderMessage, parseQuantity, reportView, setMax, setQuantity,
  settlementView, sparkPoints, stepQuantity, stockRows, upgradeView, workshopView,
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

  it('상승·하락 클래스: 소수 첫째 자리에서 0이면 색 없음', () => {
    expect([dirClass(1.2), dirClass(-0.4), dirClass(0.04), dirClass(-0.04)]).toEqual(['up', 'dn', '', '']);
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

describe('주문 패널 (수량 맞추고 매수/매도 버튼이 바로 체결)', () => {
  it('수량은 숫자만 0~999, −/+는 1씩, 최대는 현금으로 살 수 있는 최대 (못 사면 보유 수량)', () => {
    const g = newGame();
    const s = g.getStockList()[0]!;
    let o = newOrderState(s.id);
    expect(o.quantity).toBe(1);
    o = setMax(o, g.maxQty('buy', s.id), 0);
    expect(o.quantity).toBe(g.maxBuyQuantity(s.id));
    expect(g.previewOrder('buy', s.id, o.quantity).error).toBeNull();
    expect(setMax(o, 0, 5).quantity).toBe(5);
    expect(setMax(o, 5000, 0).quantity).toBe(999);
    expect(setQuantity(o, -3).quantity).toBe(0);
    expect(setQuantity(o, 2.7).quantity).toBe(2);
    expect(setQuantity(o, 1234).quantity).toBe(999);
    expect(stepQuantity(setQuantity(o, 0), -1).quantity).toBe(0);
    expect(stepQuantity(setQuantity(o, 5), 1).quantity).toBe(6);
    expect([parseQuantity('12a'), parseQuantity(''), parseQuantity('-7'), parseQuantity('0012')]).toEqual([12, 0, 7, 12]);
  });

  it('필요 코인 = 수량 × 현재가 + 수수료, 현금이 모자라면 오류 문구', () => {
    const g = newGame();
    const s = g.getStockList()[0]!;
    const p = g.previewOrder('buy', s.id, 3);
    const v = needView(p, 'ko');
    expect(v).toEqual({ label: `필요 코인 (수수료 ${p.fee})`, value: fmtNum(p.total), error: false });
    expect(p.total).toBe(3 * s.price + p.fee);
    expect(needView(g.previewOrder('buy', s.id, 999), 'ko')).toMatchObject({ value: '현금이 부족합니다.', error: true });
  });

  it('체결 안내와 오류 문구', () => {
    const g = newGame();
    const s = g.getStockList()[0]!;
    const ok = orderMessage(g.buy(s.id, 2), '하늘배터리', 'ko');
    expect(ok.ok).toBe(true);
    expect(ok.text).toContain('하늘배터리 2주 매수');
    const sold = orderMessage(g.sell(s.id, 1), '하늘배터리', 'ko');
    expect(sold.text).toContain('1주 매도');
    const bad = orderMessage(g.sell(s.id, 99), '하늘배터리', 'ko');
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

describe('20분 추이선·차트 좌표', () => {
  it('추이선은 최근 20분에서 고르게 10점, 점이 모자라면 있는 만큼', () => {
    const pts = Array.from({ length: 240 }, (_, i) => ({ tick: i, price: 1000 + i }));
    const sp = sparkPoints(pts);
    expect(sp).toHaveLength(10);
    expect(sp[0]).toBe(1000);
    expect(sp[9]).toBe(1239);
    expect(sparkPoints(pts.slice(0, 4))).toEqual([1000, 1001, 1002, 1003]);
  });

  it('꺾은선: 위아래 여백 안에 들어가고, 가격이 같으면 가운데. 칸 수를 주면 오른쪽에 붙인다', () => {
    const l = linePoints([10, 20, 15], 100, 20, 2);
    expect(l.map((p) => p.x)).toEqual([0, 50, 100]);
    expect(l.map((p) => p.y)).toEqual([18, 2, 10]);
    expect(linePoints([5, 5], 10, 20).map((p) => p.y)).toEqual([10, 10]);
    expect(linePoints([1, 2], 100, 20, 2, 5).map((p) => p.x)).toEqual([75, 100]);
  });
});

describe('뉴스 창 (한 건씩, 스크롤하면 이전 뉴스)', () => {
  it('최신이 맨 위(강조), 모든 뉴스가 같은 구조. 120초 뒤 그 뉴스 아래 주가 리포트', () => {
    const g = newGame();
    untilNews(g);
    let items = newsItems(g.getFeed(), 'ko');
    expect(items).toHaveLength(1);
    expect(items[0]!).toMatchObject({ latest: true, report: null });
    expect(items[0]!.body.length).toBeGreaterThan(0);
    for (let i = 0; i < 24; i++) g.advanceTick(); // 120초
    items = newsItems(g.getFeed(), 'ko');
    expect(items[0]!.report!.lines.length).toBeGreaterThan(0);
    expect(items[0]!.report!.lines.length).toBeLessThanOrEqual(3);
    untilNews(g);
    items = newsItems(g.getFeed(), 'ko');
    expect(items.map((i) => i.latest)).toEqual([true, false]);
    expect(items[1]!.report).not.toBeNull(); // 이전 뉴스도 리포트까지 그대로
    expect(items[0]!.time).toMatch(/^\d:\d\d:\d\d$/);
  });

  it('리포트는 NEWS!에 쓰지 않는다. 주식창에 들어가면 모두 읽음', () => {
    const g = newGame();
    const tabs = new TabController(g);
    untilNews(g);
    tabs.onTick();
    tabs.select('living_room');
    for (let i = 0; i < 24; i++) g.advanceTick();
    expect(g.getUnreadReportCount()).toBe(1);
    expect(g.getUnreadCount()).toBe(0);
    expect(tabs.topBar().newsBadge).toBe(false);
    tabs.select('trading');
    expect(g.getUnreadReportCount()).toBe(0);
  });

  it('리포트 줄: "종목 합계%" + 이유 + "발표 즉시 ○% · 5초 뒤 ○%" (방향 단어 없음, 잠정 뉴스는 안내 문구)', () => {
    const g = newGame();
    const first = untilNews(g);
    expect(first.news!.kind).toBe('tentative');
    for (let i = 0; i < 24; i++) g.advanceTick();
    const rep = g.getFeed()[0]!.report!;
    const v = reportView(rep, 'ko');
    expect(v.notes.join(' ')).toContain('잠정 발표');
    for (const l of v.lines) {
      expect(l.split).toMatch(/^발표 즉시 .+ · 5초 뒤 .+$/);
      expect(l.head).toMatch(/ [+-]?\d+\.\d%$/);
      expect(l.reason).not.toMatch(/호재|악재/);
    }
  });
});

describe('거실: 인테리어 업그레이드 버튼', () => {
  it('"인테리어 업그레이드 - 2,000", 코인이 모자라면 흐리게(누를 수는 있음), Lv7이면 "인테리어 완성"', () => {
    expect(upgradeView(0, 7, 2000, 10_000, 'ko')).toMatchObject({ label: '인테리어 업그레이드 - 2,000', state: 'ok', filled: 0 });
    expect(upgradeView(3, 7, 2000, 1999, 'ko')).toMatchObject({ state: 'poor', filled: 3 });
    expect(upgradeView(7, 7, null, 50_000, 'ko')).toMatchObject({ label: '인테리어 완성', state: 'done', filled: 7 });
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

describe('거실: LP 순환', () => {
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
});

describe('작업실: 인형 100개 묶음 지급', () => {
  it('인형 3터치마다 지급 예정 +3, 보유 현금은 그대로. 상단 지급 예정 칩과 "눈 N개 | 완성 M개"', () => {
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
    const v = workshopView(g.getWorkStatus(), 'ko');
    expect(`${v.eyesPrefix}${v.eyes}${v.eyesSuffix} | ${v.donePrefix}${v.done}${v.doneSuffix}`).toBe('눈 0개 | 완성 1개');
  });

  it('100개를 채우면 바로 지급되고 지급 예정 +0, 완성 0개로', () => {
    const g = newGame();
    const tabs = new TabController(g);
    tabs.select('workshop');
    const cash = g.cash;
    for (let i = 0; i < 300; i++) g.workTouch(2_000_000 + i * 200);
    expect(g.cash).toBe(cash + 300);
    expect(tabs.topBar().workPending).toBe(0);
    expect(workshopView(g.getWorkStatus(), 'ko').done).toBe('0');
    expect(g.lastWorkPayout).toEqual({ coins: 300, seq: 1 });
  });
});

describe('정산 창·최종 요약', () => {
  it('정산 창: 투자 결과 = 다음 시대 시작 자금, 작업 수입(지급됨)·인테리어 지출 표시, 지급 예정 안내', () => {
    const g = newGame();
    for (let i = 0; i < 9; i++) g.workTouch(1_000_000 + i * 200); // 3개, 9코인 지급 예정
    g.upgradeInterior();
    const s = g.getStockList()[0]!;
    g.buy(s.id, 3);
    let settlement = null;
    while (g.phase === 'running') {
      const r = g.advanceTick();
      if (r.advanced && r.settlement) settlement = r.settlement;
    }
    const v = settlementView(settlement!, g.getWorkStatus(), 'ko');
    expect(v.sumOk).toBe(true);
    expect(v.workIncome).toBe('0');
    expect(v.interior).toBe('2,000');
    expect(v.total).toBe(fmtNum(settlement!.investmentResult.coins));
    expect(v.pendingNote).toBe('지급 예정 작업 수입 9코인은 인형 97개를 더 완성하면 지급돼요. 다음 시대로 이어져요.');
  });

  it('정산 창 (시대 종료 합산 모드): 투자 결과 + 작업 수입 = 합계', () => {
    const g = PublicGame.create({ eras: [era], seed: 4, config: { work: { ...DEFAULT_CONFIG.work, payoutMode: 'era_end' } } });
    for (let i = 0; i < 9; i++) g.workTouch(1_000_000 + i * 200);
    let settlement = null;
    while (g.phase === 'running') {
      const r = g.advanceTick();
      if (r.advanced && r.settlement) settlement = r.settlement;
    }
    const v = settlementView(settlement!, null, 'ko');
    expect(v.sumOk).toBe(true);
    expect(v.workIncome).toBe('9');
    expect(v.pendingNote).toBeNull();
  });

  it('최종 요약: 시대별 줄, 최종 코인, 남은 지급 예정과 인테리어 단계', () => {
    const v = finalView(
      { eras: [{ eraId: '2000s', returnPct: 12.34, workIncome: 300, finalTotal: 11_500 }], totalWorkIncome: 300, finalCoins: 11_500, cumulativeReturnPct: 12.34, unpaidWork: 30, interiorLevel: 3 },
      { '2000s': '2000년대' },
      'ko',
    );
    expect(v.lines).toEqual(['2000년대: 투자 수익률 +12.3%, 작업 수입 300 코인']);
    expect(v.total).toBe('11,500');
    expect(v.unpaid).toContain('30코인');
    expect(v.interior).toContain('3단계');
  });
});
