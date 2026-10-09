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
/** 뉴스 간격(초): 4분 ~ 7분 */
export const NEWS_GAP_MIN_SECONDS = 240;
export const NEWS_GAP_MAX_SECONDS = 420;
/** 진행 중인 스토리가 없을 때 새 스토리(잠정 뉴스)를 시작할 확률 */
export const P_START_STORY = 0.85;
/**
 * 잠정 뉴스의 단서(leansTo)대로 결과가 나올 확률.
 * 60%(요청값) → 65%(단서 전략이 목표 하한에 걸려서) → 70%.
 * 발표 즉시 반영(INSTANT_REACTION_SHARE)이 들어가며 잠정 뉴스 자체의 상승분을 미리 사기 어려워져
 * 단서 전략이 +36%로 내려가서, 목표(+40~120%)에 맞게 70%로 올렸다 (README 6장).
 */
export const LEANS_TO_CHANCE = 0.7;
/**
 * 뉴스 영향 중 발표 순간 바로 반영되는 몫 (나머지는 5초 뒤).
 * 0이면 전부 5초 뒤 반영(이전 규칙). 시뮬레이션에서 0일 때 "발표 즉시 사는" 전략이 시대당 +500%를 넘어
 * 사실상 무조건 이기는 방법이 되어, 목표(+30~80%)에 맞게 75%로 정했다 (README 6장).
 * 사람처럼 가장 큰 호재 1종목에 몰빵해도 +80% 안팎이 되는 값이다.
 */
export const INSTANT_REACTION_SHARE = 0.75;
/** 뉴스 발표 몇 초 뒤에 해설 알림을 만드는가 */
export const RECAP_DELAY_SECONDS = 120;
/** (기본 OFF) 주문이 N틱 뒤 가격으로 체결 */
export const ORDER_DELAY_TICKS = 0;
/** (기본 OFF) 간접(강도 2·1) 영향을 직접 영향보다 N틱 늦게 반영 */
export const INDIRECT_EXTRA_DELAY_TICKS = 0;

/** 연결 강도별 영향도 계수: |영향도| = max(1, round(magnitude × 계수)) */
export const STRENGTH_COEF = { 3: 1.0, 2: 0.6, 1: 0.3 } as const;

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
  /** 추첨 통과 조건: 사용 가능한 속보 / 스토리 최소 개수 */
  minBreaking: number;
  minStories: number;
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

  /** 시대 시작 후 첫 뉴스가 뜨는 시점 범위(초) */
  firstNewsMinSeconds: number;
  firstNewsMaxSeconds: number;
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

  /** 해설 알림: 발표 후 몇 초 뒤, 최대 몇 종목 */
  recapDelaySeconds: number;
  recapMaxItems: number;

  /** 시대 시작 추첨 규칙 */
  draw: DrawRules;

  /** 시대 시작 시 모든 종목 가격(비트) */
  startPrice: number;
  /** 가격 하한(비트) */
  minPrice: number;
  /** 게임 시작 자금(비트) */
  startCash: number;
  /** 매매 수수료율 (매수·매도 각각). 0.002 = 0.2% */
  feeRate: number;
  /** 차트용으로 보관하는 가격 이력 길이(초). 1200 = 20분 */
  chartHistorySeconds: number;

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
  firstNewsMinSeconds: 60,
  firstNewsMaxSeconds: 180,
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
  leansToChance: LEANS_TO_CHANCE,
  impactUnitRate: 30,
  impactMax: 10,
  impactMultiplier: { strong: [0.6, 1.4] as const, weak: [0.4, 1.6] as const },
  recapDelaySeconds: RECAP_DELAY_SECONDS,
  recapMaxItems: 3,
  draw: {
    sentimentCounts: { positive: 7, negative: 7, neutral: 6 },
    minCore: 11,
    minEffectiveThemes: 3,
    minBreaking: 10,
    minStories: 8,
    maxAttempts: 50,
  },
  startPrice: 1000,
  minPrice: 1,
  startCash: 10_000,
  feeRate: 0.002,
  chartHistorySeconds: 1200,
  orderDelayTicks: ORDER_DELAY_TICKS,
  indirectExtraDelayTicks: INDIRECT_EXTRA_DELAY_TICKS,
});

export function makeConfig(overrides: Partial<GameConfig> = {}): GameConfig {
  return { ...DEFAULT_CONFIG, ...overrides };
}

/** 엔진이 실제로 쓰는 틱 단위 규칙 (config의 초 값을 틱 수로 바꾼 것) */
export interface TickRules {
  ticksPerEra: number;
  windowTicks: number;
  firstNewsMinTicks: number;
  firstNewsMaxTicks: number;
  newsGapMinTicks: number;
  newsGapMaxTicks: number;
  reactionTicks: number;
  inertiaTicks: number;
  storyOutcomeWithinTicks: number;
  noNewTentativeLastTicks: number;
  recapDelayTicks: number;
  chartHistoryLength: number;
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
    firstNewsMinTicks: toTicks(config, config.firstNewsMinSeconds, 'firstNewsMinSeconds'),
    firstNewsMaxTicks: toTicks(config, config.firstNewsMaxSeconds, 'firstNewsMaxSeconds'),
    newsGapMinTicks: toTicks(config, config.newsGapMinSeconds, 'newsGapMinSeconds'),
    newsGapMaxTicks: toTicks(config, config.newsGapMaxSeconds, 'newsGapMaxSeconds'),
    reactionTicks: config.newsReactionTicks,
    inertiaTicks: config.inertiaTicks,
    storyOutcomeWithinTicks: toTicks(config, config.storyOutcomeWithinSeconds, 'storyOutcomeWithinSeconds'),
    noNewTentativeLastTicks: toTicks(config, config.noNewTentativeLastSeconds, 'noNewTentativeLastSeconds'),
    recapDelayTicks: toTicks(config, config.recapDelaySeconds, 'recapDelaySeconds'),
    chartHistoryLength: toTicks(config, config.chartHistorySeconds, 'chartHistorySeconds'),
  };
  if (r.reactionTicks < 1) throw new Error('설정 오류: 뉴스 반영은 발표 후 1틱 이상이어야 함');
  if (r.firstNewsMinTicks > r.firstNewsMaxTicks || r.newsGapMinTicks > r.newsGapMaxTicks) {
    throw new Error('설정 오류: 뉴스 시점 범위의 최소가 최대보다 큼');
  }
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
