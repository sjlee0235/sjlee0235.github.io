// 게임 규칙의 숫자들을 한곳에 모은 설정 파일.
// 밸런스를 바꾸고 싶으면 여기 값만 고치면 된다.
//
// - 핵심 규칙은 아래 상수로 고정하고, GameConfig 기본값은 이 상수에서 계산한다.
// - 시간은 사람이 읽기 쉬운 "초" 단위로 적고, 엔진은 getTickRules()로 틱 수로 바꿔 쓴다.
// - 변동률은 소수점 실수 오차를 피하려고 "0.1% 단위 정수"로 다룬다.
//   예) 1 = 0.1%,  15 = 1.5%,  -300 = -30.0%

/** 1틱 길이(초) */
export const TICK_SECONDS = 5;
/** 평소 한 틱 최대 변동폭(%) */
export const MAX_TICK_MOVE = 1.5;
/** 누적 한도 윈도우 길이(틱). 12틱 × 5초 = 1분 */
export const WINDOW_TICKS = 12;
/** 윈도우 안 누적 변동률 합의 한도(%) */
export const WINDOW_CAP = 3.0;
/** 뉴스 발표 후 몇 틱 뒤에 반영하는가. 1틱 = 5초 */
export const NEWS_REACTION_TICKS = 1;
/** 반영 뒤 관성 틱 수. 2틱 = 10초 */
export const INERTIA_TICKS = 2;
/** 관성 틱의 방향 확률(%): 반영과 같은 방향 / 반대 방향 / 변동 없음 */
export const INERTIA_PROBS = { same: 50, opposite: 25, flat: 25 } as const;
/** 뉴스와 다음 뉴스 사이 가격 한도(%). 발표 시점 가격 기준 ±30% */
export const NEWS_BAND_PCT = 30;
/** 시대 시작 후 뉴스가 나오지 않는 유예 시간(초). 7분 = 84틱. 가격은 평소처럼 움직인다 */
export const GRACE_PERIOD_SEC = 420;
/** 첫 뉴스 발표 시각(초). 유예가 끝나는 정확히 7분 */
export const FIRST_NEWS_AT_SEC = 420;
/** 첫 뉴스 종류: 항상 잠정 뉴스(스토리의 시작). opener 스토리 중에서 고른다 */
export const FIRST_NEWS_TYPE = 'tentative' as const;
/** 뉴스 간격(초): 4분 ~ 7분 */
export const NEWS_GAP_MIN_SECONDS = 240;
export const NEWS_GAP_MAX_SECONDS = 420;
/** 진행 중인 스토리가 없을 때 새 스토리(잠정 뉴스)를 시작할 확률 */
export const P_START_STORY = 0.85;
/**
 * 잠정 뉴스의 단서(leansTo)대로 결과가 나올 확률.
 * 60%(첫 요청) → 65% → 70%(시뮬레이션 보정) → 65%(기획 결정).
 * 한 판에 같은 스토리는 한 번뿐이라 "큰 수의 법칙"이 약하게 작용한다. 확신보다 분산 투자를 고르게 하려는 의도로
 * 65%로 정했다. 잠정 정방향 전략의 목표도 +25~100%로 낮췄다 (README 6장).
 */
export const LEAN_PROB = 0.65;
/**
 * 뉴스 영향 중 발표 순간 바로 반영되는 몫 (나머지는 5초 뒤).
 * 0이면 전부 5초 뒤 반영(이전 규칙). 시뮬레이션에서 0일 때 "발표 즉시 사는" 전략이 시대당 +500%를 넘어
 * 사실상 무조건 이기는 방법이 되어, 목표(+30~80%)에 맞게 75%로 정했다 (README 6장).
 * 사람처럼 가장 큰 호재 1종목에 몰빵해도 +80% 안팎이 되는 값이다.
 */
export const INSTANT_REACTION_SHARE = 0.75;
/** 자동 저장 간격(초). 이 시간이 지나면 저장이 필요하다고 알린다 (game.pendingSaveReasons) */
export const AUTOSAVE_SECONDS = 30;
/** 뉴스 발표 몇 초 뒤에 주가 리포트를 만드는가 */
export const REPORT_DELAY_SECONDS = 120;
/** (기본 OFF) 주문이 N틱 뒤 가격으로 체결 */
export const ORDER_DELAY_TICKS = 0;
/** (기본 OFF) 간접(강도 2·1) 영향을 직접 영향보다 N틱 늦게 반영 */
export const INDIRECT_EXTRA_DELAY_TICKS = 0;

/** 연결 강도별 영향도 계수: |영향도| = max(1, round(magnitude × 계수)) */
export const STRENGTH_COEF = { 3: 1.0, 2: 0.6, 1: 0.3 } as const;

/** 배속별 실제 틱 간격(ms). 게임 시간 1틱(5초)은 그대로이고 실제 시간만 줄어든다. 1배 5000ms, 2배 2500ms */
export function tickIntervalMs(speed: 1 | 2, tickSeconds: number = TICK_SECONDS): number {
  return (tickSeconds * 1000) / speed;
}

// ───────── 작업(인형 눈 붙이기) — 지급량을 바꾸면 docs/economy.md "변경 이력"에 남긴다 ─────────
/** 작업 종류 (모든 시대 같은 값. 시대별 작업 종류는 업데이트 예정) */
export const WORK_TYPE = 'doll_eyes' as const;
/** 인형 하나를 완성하는 터치 수 (눈 하나, 눈 둘, 완성) */
export const TOUCHES_PER_DOLL = 3;
/** 인형 하나 완성 보상(코인). TV홈쇼핑을 도입하면 줄일 예정 */
export const COINS_PER_DOLL = 3;
/** 초당 터치 상한: 자동 클릭·과도한 연타 방지. 넘는 터치는 무시 (가정값) */
export const MAX_TOUCHES_PER_SEC = 6;
/**
 * 작업 수입 지급 방식
 * - 'batch' (기본): 인형을 WORK_BATCH_DOLLS개 완성하는 순간 모아 둔 코인을 한꺼번에 입금하고, 지급 예정·완성 수를 0으로 되돌린다.
 *   다 못 채운 묶음(지급 예정 코인·완성 수)은 시대가 바뀌어도 이어진다 (2026-10-10 결정: 밤 12시 지급 대신)
 * - 'era_end': 시대 종료 때 합산 / 'immediate': 완성할 때마다 즉시 입금
 */
export type WorkPayoutMode = 'batch' | 'era_end' | 'immediate';
export const WORK_PAYOUT_MODE: WorkPayoutMode = 'batch';
/** 'batch' 지급: 인형 몇 개를 완성하면 지급하는가. 100개 = 300터치 */
export const WORK_BATCH_DOLLS = 100;

// ───────── 인테리어 업그레이드 (거실·작업실·TV 공통 단계) ─────────
/** 최고 단계. Lv0(처음 상태) → Lv7(완성), 7번 구입 */
export const INTERIOR_MAX_LEVEL = 7;
/** 한 단계 올리는 값(코인). 2026-10-10 결정: 1,000 → 2,000 (7단계 합계 14,000) */
export const INTERIOR_COST = 2000;
/** 시대당 작업 수입 상한(코인). null = 상한 없음 (기본, 켜지 않는다) */
export const WORK_INCOME_CAP_PER_ERA: number | null = null;

export interface WorkRules {
  type: typeof WORK_TYPE;
  touchesPerDoll: number;
  coinsPerDoll: number;
  maxTouchesPerSec: number;
  payoutMode: WorkPayoutMode;
  /** 'batch' 지급의 묶음 크기 (인형 수) */
  batchDolls: number;
  incomeCapPerEra: number | null;
}

export interface InteriorRules {
  maxLevel: number;
  /** 한 단계 값(코인). 보유 현금에서 낸다 */
  costPerLevel: number;
}

/** % 값을 0.1% 단위 정수로. 1.5 → 15 */
const toRate = (percent: number) => Math.round(percent * 10);

/** [최소, 최대] 범위 */
export type Range = readonly [number, number];

export interface DrawRules {
  /** 활성 테마 분위기별 개수 */
  sentimentCounts: { positive: number; negative: number; neutral: number };
  /** 활성 테마 중 주요(core) 테마 최소 개수 */
  minCore: number;
  /** 뉴스가 이번 판에 쓰이려면 필요한 유효 영향 테마 최소 개수 */
  minEffectiveThemes: number;
  /** 추첨 통과 조건: 사용 가능한 속보 / 스토리 / opener 스토리 최소 개수 */
  minBreaking: number;
  minStories: number;
  minOpenerStories: number;
  /** 최대 재추첨 횟수 */
  maxAttempts: number;
}

export interface GameConfig {
  /** 1틱의 길이(초). 엔진은 시계를 쓰지 않으므로 화면 쪽 타이머가 참고하는 값 */
  tickSeconds: number;
  /** 시대 1개의 길이(초). 7200 = 2시간 */
  eraSeconds: number;

  /** 평소 한 틱 변동률의 최대 크기 (0.1% 단위). 15 = ±1.5% */
  tickMaxRate: number;
  /** 누적 한도 윈도우 길이(초). 60 = 1분 */
  windowSeconds: number;
  /** 윈도우 안 누적 변동률(합)의 최대 크기 (0.1% 단위). 30 = ±3.0% */
  windowMaxRate: number;

  /** 시대 시작 후 뉴스가 없는 유예 시간(초) */
  gracePeriodSeconds: number;
  /** 첫 뉴스 발표 시각(초). 유예 시간 이상이어야 한다 */
  firstNewsAtSeconds: number;
  /** 첫 뉴스 종류 ('tentative' = opener 스토리의 잠정 뉴스로 강제) */
  firstNewsType: 'tentative' | 'any';
  /** 뉴스와 뉴스 사이 간격 범위(초) */
  newsGapMinSeconds: number;
  newsGapMaxSeconds: number;
  /** 발표 후 반영까지 틱 수 */
  newsReactionTicks: number;
  /** 뉴스 영향 중 발표 순간 바로 반영되는 몫 (0 이상 1 미만). 나머지는 newsReactionTicks 뒤 */
  instantReactionShare: number;
  /** 반영 후 관성 틱 수 */
  inertiaTicks: number;
  /** 관성 틱 확률 (0~1): 같은 방향 / 반대 방향. 나머지는 변동 없음 */
  inertiaSameChance: number;
  inertiaOppositeChance: number;
  /** 관성 틱 크기 범위 (0.1% 단위). 일반 틱 범위(1~15) 안 */
  inertiaRate: Range;
  /** 뉴스 사이 가격 한도 (%) */
  newsBandPct: number;

  /** 잠정 뉴스 후 결과 뉴스가 반드시 나오는 시간 한도(초) */
  storyOutcomeWithinSeconds: number;
  /** 시대 종료 몇 초 전부터 새 잠정 뉴스를 시작하지 않을지 */
  noNewTentativeLastSeconds: number;
  /** 진행 중 스토리가 없을 때 새 스토리를 시작할 확률 */
  pStartStory: number;
  /** 결과에 weight가 없을 때 leansTo 쪽 결과의 확률 */
  leansToChance: number;

  /** 영향도 1당 변동률 (0.1% 단위). 30 = 3.0% */
  impactUnitRate: number;
  /** 영향도 최대 크기. 배율을 곱한 뒤에도 ±(이 값 × 3%) = ±30%를 넘지 않게 자른다 */
  impactMax: number;
  /** 실제 반영 배율 범위 (균등분포): 강도 3 / 강도 2·1 */
  impactMultiplier: { strong: Range; weak: Range };

  /** 자동 저장 간격(초) */
  autosaveSeconds: number;
  /** 주가 리포트: 발표 후 몇 초 뒤, 최대 몇 종목 */
  reportDelaySeconds: number;
  reportMaxItems: number;

  /** 시대 시작 추첨 규칙 */
  draw: DrawRules;

  /** 시대 시작 시 모든 종목 가격(코인) */
  startPrice: number;
  /** 가격 하한(코인) */
  minPrice: number;
  /** 게임 시작 자금(코인) */
  startCash: number;
  /** 매매 수수료율 (매수·매도 각각). 0.002 = 0.2% */
  feeRate: number;
  /** 차트용으로 보관하는 가격 이력 길이(초). 1200 = 20분 */
  chartHistorySeconds: number;

  /** 작업(인형 눈 붙이기) 규칙 */
  work: WorkRules;
  /** 인테리어 업그레이드 규칙 */
  interior: InteriorRules;

  /** (기본 OFF) 주문 체결 지연 틱 */
  orderDelayTicks: number;
  /** (기본 OFF) 간접 영향 추가 지연 틱 */
  indirectExtraDelayTicks: number;
}

export const DEFAULT_CONFIG: Readonly<GameConfig> = Object.freeze({
  tickSeconds: TICK_SECONDS,
  eraSeconds: 7200,
  tickMaxRate: toRate(MAX_TICK_MOVE),
  windowSeconds: WINDOW_TICKS * TICK_SECONDS,
  windowMaxRate: toRate(WINDOW_CAP),
  gracePeriodSeconds: GRACE_PERIOD_SEC,
  firstNewsAtSeconds: FIRST_NEWS_AT_SEC,
  firstNewsType: FIRST_NEWS_TYPE,
  newsGapMinSeconds: NEWS_GAP_MIN_SECONDS,
  newsGapMaxSeconds: NEWS_GAP_MAX_SECONDS,
  newsReactionTicks: NEWS_REACTION_TICKS,
  instantReactionShare: INSTANT_REACTION_SHARE,
  inertiaTicks: INERTIA_TICKS,
  inertiaSameChance: INERTIA_PROBS.same / 100,
  inertiaOppositeChance: INERTIA_PROBS.opposite / 100,
  inertiaRate: [1, toRate(MAX_TICK_MOVE)] as const,
  newsBandPct: NEWS_BAND_PCT,
  storyOutcomeWithinSeconds: 900,
  noNewTentativeLastSeconds: 900,
  pStartStory: P_START_STORY,
  leansToChance: LEAN_PROB,
  impactUnitRate: 30,
  impactMax: 10,
  impactMultiplier: { strong: [0.6, 1.4] as const, weak: [0.4, 1.6] as const },
  autosaveSeconds: AUTOSAVE_SECONDS,
  reportDelaySeconds: REPORT_DELAY_SECONDS,
  reportMaxItems: 3,
  draw: {
    sentimentCounts: { positive: 7, negative: 7, neutral: 6 },
    minCore: 11,
    minEffectiveThemes: 3,
    minBreaking: 10,
    minStories: 8,
    minOpenerStories: 1,
    maxAttempts: 50,
  },
  startPrice: 1000,
  minPrice: 1,
  startCash: 10_000,
  feeRate: 0.002,
  chartHistorySeconds: 1200,
  work: Object.freeze({
    type: WORK_TYPE,
    touchesPerDoll: TOUCHES_PER_DOLL,
    coinsPerDoll: COINS_PER_DOLL,
    maxTouchesPerSec: MAX_TOUCHES_PER_SEC,
    payoutMode: WORK_PAYOUT_MODE,
    batchDolls: WORK_BATCH_DOLLS,
    incomeCapPerEra: WORK_INCOME_CAP_PER_ERA,
  }),
  interior: Object.freeze({ maxLevel: INTERIOR_MAX_LEVEL, costPerLevel: INTERIOR_COST }),
  orderDelayTicks: ORDER_DELAY_TICKS,
  indirectExtraDelayTicks: INDIRECT_EXTRA_DELAY_TICKS,
});

export function makeConfig(overrides: Partial<GameConfig> = {}): GameConfig {
  return {
    ...DEFAULT_CONFIG, ...overrides,
    work: { ...DEFAULT_CONFIG.work, ...overrides.work },
    interior: { ...DEFAULT_CONFIG.interior, ...overrides.interior },
  };
}

/** 엔진이 실제로 쓰는 틱 단위 규칙 (config의 초 값을 틱 수로 바꾼 것) */
export interface TickRules {
  ticksPerEra: number;
  windowTicks: number;
  gracePeriodTicks: number;
  firstNewsTick: number;
  newsGapMinTicks: number;
  newsGapMaxTicks: number;
  reactionTicks: number;
  inertiaTicks: number;
  storyOutcomeWithinTicks: number;
  noNewTentativeLastTicks: number;
  reportDelayTicks: number;
  chartHistoryLength: number;
  autosaveTicks: number;
}

function toTicks(config: GameConfig, seconds: number, name: string): number {
  const ticks = seconds / config.tickSeconds;
  if (!Number.isInteger(ticks)) {
    throw new Error(`설정 오류: ${name}(${seconds}초)이 틱 길이(${config.tickSeconds}초)로 나누어떨어지지 않음`);
  }
  return ticks;
}

export function getTickRules(config: GameConfig): TickRules {
  const r: TickRules = {
    ticksPerEra: toTicks(config, config.eraSeconds, 'eraSeconds'),
    windowTicks: toTicks(config, config.windowSeconds, 'windowSeconds'),
    gracePeriodTicks: toTicks(config, config.gracePeriodSeconds, 'gracePeriodSeconds'),
    firstNewsTick: toTicks(config, config.firstNewsAtSeconds, 'firstNewsAtSeconds'),
    newsGapMinTicks: toTicks(config, config.newsGapMinSeconds, 'newsGapMinSeconds'),
    newsGapMaxTicks: toTicks(config, config.newsGapMaxSeconds, 'newsGapMaxSeconds'),
    reactionTicks: config.newsReactionTicks,
    inertiaTicks: config.inertiaTicks,
    storyOutcomeWithinTicks: toTicks(config, config.storyOutcomeWithinSeconds, 'storyOutcomeWithinSeconds'),
    noNewTentativeLastTicks: toTicks(config, config.noNewTentativeLastSeconds, 'noNewTentativeLastSeconds'),
    reportDelayTicks: toTicks(config, config.reportDelaySeconds, 'reportDelaySeconds'),
    chartHistoryLength: toTicks(config, config.chartHistorySeconds, 'chartHistorySeconds'),
    autosaveTicks: toTicks(config, config.autosaveSeconds, 'autosaveSeconds'),
  };
  if (r.reactionTicks < 1) throw new Error('설정 오류: 뉴스 반영은 발표 후 1틱 이상이어야 함');
  if (r.newsGapMinTicks > r.newsGapMaxTicks) throw new Error('설정 오류: 뉴스 간격의 최소가 최대보다 큼');
  if (r.firstNewsTick < r.gracePeriodTicks) throw new Error('설정 오류: 첫 뉴스가 유예 시간 안에 있음');
  if (r.firstNewsTick < 1) throw new Error('설정 오류: 첫 뉴스는 1틱 이후여야 함');
  const lastEffectTick = r.reactionTicks + config.indirectExtraDelayTicks + r.inertiaTicks;
  if (r.newsGapMinTicks <= lastEffectTick) {
    throw new Error('설정 오류: 뉴스 간격이 반영+관성 시간보다 짧으면 뉴스 효과가 겹침');
  }
  if (!(config.instantReactionShare >= 0 && config.instantReactionShare < 1)) {
    throw new Error('설정 오류: 즉시 반영 몫은 0 이상 1 미만이어야 함');
  }
  const [mMin, mMax] = config.inertiaRate;
  if (mMin < 1 || mMax > config.tickMaxRate || mMin > mMax) {
    throw new Error('설정 오류: 관성 크기는 일반 틱 범위(0.1%~최대) 안이어야 함');
  }
  return r;
}

/** 0.1% 단위 정수를 % 숫자로 바꾼다. 13 → 1.3 */
export function rateToPercent(rate: number): number {
  return rate / 10;
}
