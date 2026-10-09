import { describe, expect, it } from 'vitest';
import { DEFAULT_TAB_ON_ERA_START, SPEED_RESETS_ON_TAB_LEAVE, TabController, TABS, isSelectable, topBarFor } from '../src/engine/homeActivities.ts';
import { PublicGame } from '../src/engine/publicView.ts';
import { t } from '../src/i18n/index.ts';
import { makeSpecEra } from './fixtures/makeEra.ts';

const era = makeSpecEra({ id: 'tab' });
const newGame = (seed = 1) => PublicGame.create({ eras: [era], seed });

describe('탭 레지스트리', () => {
  it('하단 탭 4개: 거실 / 주식창 / 작업실 / TV홈쇼핑(1차 비활성)', () => {
    expect(TABS.map((x) => x.id)).toEqual(['living_room', 'trading', 'workshop', 'tv_shopping']);
    expect(TABS.map((x) => x.enabled)).toEqual([true, true, true, false]);
    expect(isSelectable('tv_shopping')).toBe(false);
    expect(TABS.map((x) => t('ko', x.labelKey))).toEqual(['거실', '주식창', '작업실', 'TV홈쇼핑']);
    expect(TABS.map((x) => t('en', x.labelKey))).toEqual(['Living Room', 'Trading', 'Workshop', 'Shopping TV']);
    expect(t('ko', TABS[3]!.disabledLabelKey!)).toBe('방송 준비 중');
  });

  it('상단 규칙: 주식창 밖은 보유 현금, 작업실은 정산 예정 작업 수입, 주식창은 계좌 바', () => {
    const g = newGame();
    expect(topBarFor('living_room', g)).toMatchObject({ cash: 10_000, workPending: null, accountBar: null });
    expect(topBarFor('workshop', g)).toMatchObject({ cash: 10_000, workPending: 0 });
    const trading = topBarFor('trading', g);
    expect(trading.cash).toBeNull();
    expect(trading.accountBar).toMatchObject({ totalAssets: 10_000, returnPct: 0, speed: 1 });
  });

  it('작업 중에도 오른쪽 위 현금은 늘지 않고, 작업실의 정산 예정 수입만 는다', () => {
    const g = newGame();
    for (let i = 0; i < 9; i++) g.workTouch(i * 400);
    expect(topBarFor('workshop', g)).toMatchObject({ cash: 10_000, workPending: 9 });
  });

  it('NEWS!: 안 읽은 뉴스가 있을 때만 (주식창 밖), 주식창에 들어가면 사라진다. 리포트는 해당 없음', () => {
    const g = newGame(2);
    const tabs = new TabController(g);
    expect(tabs.current).toBe(DEFAULT_TAB_ON_ERA_START);
    tabs.select('living_room');
    expect(tabs.topBar().newsBadge).toBe(false);
    while (g.getUnreadCount() === 0) g.advanceTick();
    expect(tabs.topBar().newsBadge).toBe(true);
    tabs.select('trading');
    tabs.select('workshop');
    expect(tabs.topBar().newsBadge).toBe(false);
    // 리포트가 새로 붙어도 NEWS!는 켜지지 않는다
    while (g.getUnreadReportCount() === 0) g.advanceTick();
    if (g.getUnreadCount() === 0) expect(tabs.topBar().newsBadge).toBe(false);
  });

  it('배속은 탭을 옮겨도 유지 (기본 SPEED_RESETS_ON_TAB_LEAVE=false), 2배면 다른 탭에 x2 표시', () => {
    expect(SPEED_RESETS_ON_TAB_LEAVE).toBe(false);
    const g = newGame(3);
    const tabs = new TabController(g);
    g.setSpeed(2);
    tabs.select('workshop');
    expect(g.getSpeed()).toBe(2);
    expect(tabs.topBar().speedBadge).toBe('x2');
    tabs.select('trading');
    expect(tabs.topBar().speedBadge).toBeNull(); // 주식창에는 배속 선택 버튼이 있다
  });

  it('설정을 true로 바꾸면 주식창을 벗어날 때 1배로 돌아간다', () => {
    const g = newGame(4);
    const tabs = new TabController(g, { speedResetsOnTabLeave: true });
    g.setSpeed(2);
    tabs.select('living_room');
    expect(g.getSpeed()).toBe(1);
  });

  it('시대 시작 때 기본 탭은 주식창, 그 외에는 마지막으로 보던 탭', () => {
    const g = newGame(5);
    const tabs = new TabController(g);
    tabs.select('workshop');
    for (let i = 0; i < 10; i++) g.advanceTick();
    expect(tabs.current).toBe('workshop');
    tabs.onEraStart();
    expect(tabs.current).toBe('trading');
  });

  it('TV홈쇼핑은 비활성이지만 들어가 볼 수는 있다 ("방송 준비 중" 화면)', () => {
    const tabs = new TabController(newGame(6));
    expect(tabs.select('tv_shopping')).toBe(true);
    expect(tabs.topBar().cash).toBe(10_000);
  });
});
