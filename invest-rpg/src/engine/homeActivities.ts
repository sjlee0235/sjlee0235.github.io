// 탭 레지스트리: 하단 탭 4개(1인칭 화면)와 상단 표시 규칙.
// 걷는 맵·캐릭터·이동 조작은 없다. 화면 단계(W2)는 이 데이터대로 탭 바와 상단 요소를 그린다.
//
// | 탭        | id           | 1차 출시 |
// | 거실      | living_room  | 활성     |
// | 주식창    | trading      | 활성     |
// | 작업실    | workshop     | 활성     |
// | TV홈쇼핑  | tv_shopping  | 비활성 ("방송 준비 중") |
//
// 공통 규칙
// - 주식창을 제외한 탭: 오른쪽 위에 보유 현금 코인 실시간 표시 (작업 수입은 시대 종료 때 합산되므로 작업 중엔 안 늘어남)
// - 안 읽은 뉴스가 있으면 왼쪽 위에 NEWS! 깜빡임 (주가 리포트는 해당 없음). 주식창에 들어가면 모두 읽음 → 사라짐
// - 작업실: 정산 예정 작업 수입(workPending) 추가 표시
// - 주식창: 상단에 총 자산과 손익률(이번 시대 시간가중수익률). 뉴스·리포트는 화면 안 뉴스 영역에서 직접 보인다
// - 2배속이면 주식창 밖 탭에서도 작은 "x2" 표시
// - 시대 시작 때 기본 탭은 주식창 (새 종목 확인 유도), 그 외에는 마지막으로 보던 탭

import type { GameSpeed } from './game.ts';

export type TabId = 'living_room' | 'trading' | 'workshop' | 'tv_shopping';

/** 빌드 설정: 탭 켜기/끄기. TV홈쇼핑은 1차 출시에서 꺼 둔다 (켤 때는 여기 한 곳만 바꾼다) */
export const TAB_ENABLED: Readonly<Record<TabId, boolean>> = {
  living_room: true,
  trading: true,
  workshop: true,
  tv_shopping: false,
};

/**
 * 탭을 옮길 때 배속을 1배로 되돌릴까? 기본 false = 유지.
 * 이유: 투자금이 바닥난 플레이어가 남은 시대를 빨리 보내야 하고, 작업 수입이 시대 종료 때 지급되므로
 * 배속 선택이 곧 작업 시간 선택이기 때문. true로 바꾸면 주식창을 벗어날 때 1배로 돌아간다.
 */
export const SPEED_RESETS_ON_TAB_LEAVE = false;

/** 시대 시작 때 기본 탭 */
export const DEFAULT_TAB_ON_ERA_START: TabId = 'trading';

export interface TopBarRules {
  /** 오른쪽 위 보유 현금 코인 */
  showCash: boolean;
  /** 왼쪽 위 NEWS! (안 읽은 뉴스가 있을 때만) */
  showNewsBadge: boolean;
  /** 정산 예정 작업 수입 */
  showWorkPending: boolean;
  /** 계좌 바: 총 자산, 손익률, 남은 시간, 배속 선택 */
  showAccountBar: boolean;
  /** 2배속일 때 작은 "x2" */
  showSpeedBadge: boolean;
}

export interface TabDef {
  id: TabId;
  /** i18n 키 (tabs.living_room 등) */
  labelKey: `tabs.${TabId}`;
  order: number;
  enabled: boolean;
  /** 비활성일 때 화면에 띄울 문구 키 */
  disabledLabelKey: 'tabs.comingSoon' | null;
  topBar: TopBarRules;
}

const outside: TopBarRules = { showCash: true, showNewsBadge: true, showWorkPending: false, showAccountBar: false, showSpeedBadge: true };

export const TABS: readonly TabDef[] = [
  { id: 'living_room', labelKey: 'tabs.living_room', order: 1, enabled: TAB_ENABLED.living_room, disabledLabelKey: null, topBar: outside },
  {
    id: 'trading', labelKey: 'tabs.trading', order: 2, enabled: TAB_ENABLED.trading, disabledLabelKey: null,
    topBar: { showCash: false, showNewsBadge: false, showWorkPending: false, showAccountBar: true, showSpeedBadge: false },
  },
  {
    id: 'workshop', labelKey: 'tabs.workshop', order: 3, enabled: TAB_ENABLED.workshop, disabledLabelKey: null,
    topBar: { ...outside, showWorkPending: true },
  },
  {
    id: 'tv_shopping', labelKey: 'tabs.tv_shopping', order: 4, enabled: TAB_ENABLED.tv_shopping,
    disabledLabelKey: TAB_ENABLED.tv_shopping ? null : 'tabs.comingSoon', topBar: outside,
  },
];

export function tabDef(id: TabId): TabDef {
  const t = TABS.find((x) => x.id === id);
  if (!t) throw new Error(`없는 탭: ${id}`);
  return t;
}

/** 탭 바에서 고를 수 있는 탭인가 (비활성 탭은 눌러도 "방송 준비 중" 화면만) */
export const isSelectable = (id: TabId) => tabDef(id).enabled;

/** 상단 요소를 그리는 데 필요한 게임 상태 (PublicGame이 모두 제공) */
export interface TopBarSource {
  readonly cash: number;
  getUnreadCount(): number;
  getSpeed(): GameSpeed;
  getWorkStatus(): { pending: number };
  getPortfolio(): { totalAssets: number; currentReturnPct: number };
  readonly remainingSeconds: number;
}

export interface TopBarView {
  cash: number | null;
  newsBadge: boolean;
  workPending: number | null;
  speedBadge: 'x2' | null;
  accountBar: { totalAssets: number; returnPct: number; remainingSeconds: number; speed: GameSpeed } | null;
}

/** 지금 탭의 상단 표시 내용 */
export function topBarFor(tab: TabId, game: TopBarSource): TopBarView {
  const r = tabDef(tab).topBar;
  const p = r.showAccountBar ? game.getPortfolio() : null;
  return {
    cash: r.showCash ? game.cash : null,
    newsBadge: r.showNewsBadge && game.getUnreadCount() > 0,
    workPending: r.showWorkPending ? game.getWorkStatus().pending : null,
    speedBadge: r.showSpeedBadge && game.getSpeed() === 2 ? 'x2' : null,
    accountBar: p
      ? { totalAssets: p.totalAssets, returnPct: p.currentReturnPct, remainingSeconds: game.remainingSeconds, speed: game.getSpeed() }
      : null,
  };
}

/** 탭 전환 규칙 (주식창에 들어가면 모두 읽음, 배속 유지/복귀, 시대 시작 때 주식창) */
export class TabController {
  private _current: TabId;
  private readonly game: TopBarSource & { markAllRead(): void; setSpeed(s: GameSpeed): void };
  private readonly speedResets: boolean;

  constructor(
    game: TopBarSource & { markAllRead(): void; setSpeed(s: GameSpeed): void },
    options: { speedResetsOnTabLeave?: boolean } = {},
  ) {
    this.game = game;
    this.speedResets = options.speedResetsOnTabLeave ?? SPEED_RESETS_ON_TAB_LEAVE;
    this._current = DEFAULT_TAB_ON_ERA_START;
    this.game.markAllRead();
  }

  get current(): TabId {
    return this._current;
  }

  /** 탭을 고른다. 비활성 탭도 들어갈 수는 있다 ("방송 준비 중" 화면). 바뀌었으면 true */
  select(tab: TabId): boolean {
    tabDef(tab);
    if (tab === this._current) {
      if (tab === 'trading') this.game.markAllRead();
      return false;
    }
    if (this._current === 'trading' && this.speedResets) this.game.setSpeed(1);
    this._current = tab;
    if (tab === 'trading') this.game.markAllRead();
    return true;
  }

  /** 주식창에 있는 동안 새 뉴스가 오면 바로 읽음 처리 (화면 틱마다 부른다) */
  onTick(): void {
    if (this._current === 'trading') this.game.markAllRead();
  }

  /** 새 시대 시작: 기본 탭은 주식창 */
  onEraStart(): void {
    this._current = DEFAULT_TAB_ON_ERA_START;
    this.game.markAllRead();
  }

  topBar(): TopBarView {
    return topBarFor(this._current, this.game);
  }
}
