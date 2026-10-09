// 플레이 기록(텔레메트리): 밸런스를 실제 플레이어 데이터로 맞추기 위한 이벤트 형식과 기록 통.
//
// 원칙
// 1) 엔진은 "무슨 일이 있었는지"만 이벤트로 내보낸다. 저장·전송(서버)은 화면/앱 쪽 일이다.
//    엔진은 TelemetrySink(받는 곳) 인터페이스에 record()만 호출한다. 붙이지 않으면 아무것도 기록하지 않는다.
// 2) 가격은 기록하지 않는다. 같은 시드 + 같은 엔진 버전 + 같은 밸런스 설정이면 가격·뉴스가 똑같이 재현되므로,
//    "플레이어의 선택"(매매·화면 행동)과 판의 조건만 남기면 나머지는 다시 계산(리플레이)할 수 있다.
//    → 데이터가 작고, 나중에 새 지표를 만들어도 옛 기록으로 다시 계산할 수 있다.
// 3) 개인 정보는 담지 않는다. 플레이어 구분은 앱이 만든 무작위 설치 id로만 한다 (엔진은 모름).
// 4) 시각: 엔진 이벤트는 "틱"만 안다. 실제 시각(ms)은 앱이 sink에서 clientMs로 덧붙인다.
//
// 이벤트는 크게 두 종류
// - 엔진 이벤트: Game이 자동으로 기록 (판 시작, 뉴스 발표·반영, 매매, 정산 등)
// - 앱 이벤트  : 화면 코드가 game.track()으로 기록 (뉴스 팝업을 몇 초 봤는지, 어떤 화면을 열었는지 등)

import type { GameConfig } from './config.ts';

/** 이벤트 형식 버전. 필드 의미가 바뀌면 올린다 */
export const TELEMETRY_SCHEMA_VERSION = 1;
/**
 * 엔진 규칙 버전. 같은 시드에서 가격·뉴스가 달라지는 변경(규칙·난수 순서)이 생기면 올린다.
 * 분석할 때 이 값이 다른 기록끼리는 리플레이 결과를 섞지 않는다.
 */
export const ENGINE_VERSION = '0.3.0';

/** 설정값 전체의 짧은 지문(해시). 밸런스 패치 전후 기록을 나누는 데 쓴다 */
export function balanceHash(config: GameConfig): string {
  const text = stableStringify(config);
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

function stableStringify(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(',')}]`;
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o).sort().map((k) => `${JSON.stringify(k)}:${stableStringify(o[k])}`).join(',')}}`;
  }
  return JSON.stringify(v);
}

// ───────── 엔진 이벤트 ─────────

/** 종목 하나에 실제 적용된 변동률 (0.1% 단위) */
export interface StockRate {
  stockId: string;
  rate: number;
  /** 한도로 깎이기 전 값 (깎였을 때만) */
  requested?: number;
}

/**
 * 매매 순간의 상황. "왜 이 타이밍에 이 종목을 샀나"를 나중에 분석하기 위한 핵심 정보.
 * 모두 매매 시점에 엔진이 이미 아는 값이다.
 */
export interface DecisionContext {
  /** 가장 최근에 뜬 뉴스 (없으면 null) */
  lastNewsId: string | null;
  /** 그 뉴스가 뜬 뒤 지난 틱 수. 0 = 발표 직후(즉시 몫만 반영된 상태), 1 = 나머지까지 반영 */
  ticksSinceNews: number | null;
  /** 이 종목의 테마가 최근 뉴스에 어떻게 엮였나 (엮이지 않았으면 null) */
  newsLink: { impact: number; strength: 1 | 2 | 3 } | null;
  /** 결과가 아직 안 나온 잠정 뉴스 (스토리 진행 중이면) */
  openStoryId: string | null;
  /** 진행 중 스토리의 잠정 뉴스에서 이 테마의 영향도 (엮이지 않았으면 null) */
  storyLink: number | null;
  /** 시대 시작가 대비 현재가 % */
  eraChangePct: number;
  /** 최근 1분(12틱) 가격 변화 % */
  recentChangePct: number;
  /** 매매 직전 총자산 (비트) */
  assetsBefore: number;
}

export interface EngineEventMap {
  /** 게임(또는 튜토리얼) 객체가 만들어짐 */
  game_start: {
    mode: 'main' | 'tutorial';
    seed: number;
    engineVersion: string;
    balanceHash: string;
    startCash: number;
    startEraIndex: number;
    /** 세이브에서 이어 하기인가 */
    restored: boolean;
    /** 이어 하기: 이어 한 틱 (처음부터면 null) */
    resumeTick: number | null;
    /** 이어 하기: 그 시대에서 이어 하기 전에 한 매매 (리플레이용) */
    priorTrades: { tick: number; side: 'buy' | 'sell'; stockId: string; quantity: number }[];
  };
  /** 시대 시작과 그 판의 추첨 결과 */
  era_start: {
    startCash: number;
    drawAttempt: number;
    drawOk: boolean;
    activeThemeIds: string[];
    coreCount: number;
    usableBreaking: number;
    usableStories: number;
  };
  /** 뉴스 발표 (이 틱 직후). instant = 발표 순간 반영된 몫 */
  news_published: {
    newsId: string;
    kind: 'breaking' | 'tentative' | 'clue' | 'outcome';
    storyId: string | null;
    /** 결과 뉴스: 단서대로 나왔나 */
    followedLean: boolean | null;
    isHistorical: boolean;
    magnitude: number;
    effects: { themeId: string; impact: number; strength: 1 | 2 | 3 }[];
    instant: StockRate[];
  };
  /** 5초 뒤 나머지 몫 반영 */
  news_reacted: { newsId: string; applied: StockRate[] };
  /** 해설 알림 생성 (화면에 띄울 수 있게 됨) */
  recap_created: { newsId: string; stockIds: string[] };
  /** 체결된 매매 */
  trade: {
    side: 'buy' | 'sell';
    stockId: string;
    themeId: string;
    quantity: number;
    price: number;
    fee: number;
    cashAfter: number;
    quantityAfter: number;
    /** 매도: 실현손익 */
    realizedPnl: number | null;
    /** 매도: 이 포지션을 처음 산 뒤 지난 틱 수 */
    holdTicks: number | null;
    /** 시대 종료 자동 청산이면 true */
    auto: boolean;
    context: DecisionContext;
  };
  /** 거부된 주문 (잔고 부족 등). 화면이 헷갈리게 만드는 곳을 찾는 데 쓴다 */
  trade_rejected: { side: 'buy' | 'sell'; stockId: string; quantity: number; error: string };
  favorite_toggled: { stockId: string; on: boolean };
  /** 앱이 백그라운드로 감 / 돌아옴 */
  suspended: Record<string, never>;
  resumed: Record<string, never>;
  /** 1분마다 자산 상태 (그래프·이탈 분석용) */
  asset_snapshot: { cash: number; holdingsValue: number; positions: number };
  /** 시대 종료 정산 */
  era_end: {
    endAssets: number;
    returnPct: number;
    trades: number;
    buys: number;
    sells: number;
    feesPaid: number;
    peakAssets: number;
    troughAssets: number;
    /** 최고점 대비 최대 하락 % */
    maxDrawdownPct: number;
    /** 종목을 하나라도 들고 있던 틱의 비율 (0~1) */
    investedShare: number;
  };
}

// ───────── 앱(화면) 이벤트 ─────────

export type ScreenId =
  | 'market' | 'stock-detail' | 'chart' | 'portfolio' | 'news-archive' | 'recap' | 'settlement' | 'settings' | 'tutorial';

export interface AppEventMap {
  /** 앱 세션: 켜기/끄기/백그라운드/복귀 */
  app_session: { phase: 'start' | 'end' | 'background' | 'foreground'; reason?: string };
  /** 뉴스 팝업을 닫을 때: 몇 ms 봤는지, 무엇을 눌러 닫았는지 */
  news_popup: { newsId: string; dwellMs: number; closedBy: 'confirm' | 'dismiss' | 'trade' | 'timeout' };
  /** 관련 테마를 눌러 봄 */
  related_theme_tap: { newsId: string; themeId: string };
  /** 화면을 떠날 때: 어떤 화면을 몇 ms 봤는지 */
  screen_view: { screen: ScreenId; dwellMs: number; targetId?: string };
  /** 해설 알림을 열어 봄 / 그냥 지나감 */
  recap_view: { newsId: string; opened: boolean; dwellMs: number };
  /** 주문 창을 열었다가 주문 없이 닫음 (망설임) */
  order_abandoned: { stockId: string; side: 'buy' | 'sell'; dwellMs: number };
  /** 설정 변경 (색상 등) */
  setting_changed: { key: string; value: string };
  /** 튜토리얼 단계 진입·건너뛰기·다시 보기 */
  tutorial_step: { step: string; action: 'enter' | 'skip' | 'replay' | 'complete' };
  /** 클라이언트 오류 */
  client_error: { code: string; message?: string };
}

export type EventMap = EngineEventMap & AppEventMap;
export type EventType = keyof EventMap;
export type AppEventType = keyof AppEventMap;

/** 기록 한 줄 */
export type TelemetryEvent = {
  [K in EventType]: {
    v: typeof TELEMETRY_SCHEMA_VERSION;
    /** 게임 객체 안에서 1부터 증가하는 번호 (빠진 기록·순서 확인용) */
    seq: number;
    type: K;
    eraId: string;
    eraIndex: number;
    tick: number;
    /** 앱이 덧붙이는 실제 시각 (ms) */
    clientMs?: number;
    data: EventMap[K];
  };
}[EventType];

/** 기록을 받는 곳. 앱은 여기에 저장소·전송 큐를 연결한다 */
export interface TelemetrySink {
  record(event: TelemetryEvent): void;
}

/**
 * 메모리 기록 통 (기본 구현). 앱은 주기적으로 drain()해서 기기에 저장하고, 나중에 서버로 묶어 보낸다.
 * 넘치면 오래된 것부터 버리고 버린 개수를 센다 (기록 때문에 게임이 느려지면 안 되므로).
 */
export class TelemetryBuffer implements TelemetrySink {
  private events: TelemetryEvent[] = [];
  dropped = 0;
  readonly maxEvents: number;
  constructor(maxEvents = 20_000) {
    this.maxEvents = maxEvents;
  }

  record(event: TelemetryEvent): void {
    this.events.push(event);
    if (this.events.length > this.maxEvents) {
      this.events.shift();
      this.dropped++;
    }
  }

  get size(): number {
    return this.events.length;
  }

  /** 지금까지 쌓인 기록 (복사본) */
  peek(): TelemetryEvent[] {
    return [...this.events];
  }

  /** 꺼내고 비운다 */
  drain(): TelemetryEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }
}

/** JSON Lines 형식 (한 줄에 이벤트 하나). 파일 저장·전송용 */
export function toJsonLines(events: readonly TelemetryEvent[]): string {
  return events.map((e) => JSON.stringify(e)).join('\n');
}

export function fromJsonLines(text: string): TelemetryEvent[] {
  return text.split('\n').filter((l) => l.trim().length > 0).map((l) => JSON.parse(l) as TelemetryEvent);
}
