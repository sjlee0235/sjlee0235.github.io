// 게임 규칙의 숫자들을 한곳에 모은 설정 파일.
// 밸런스를 바꾸고 싶으면 여기 값만 고치면 된다.
//
// - 핵심 가격 규칙은 아래 4개 상수로 고정하고, 나머지 값은 여기서 계산한다.
// - 시간은 사람이 읽기 쉬운 "초" 단위로 적고, 엔진은 getTickRules()로 틱 수로 바꿔 쓴다.
// - 변동률은 소수점 실수 오차를 피하려고 "0.1% 단위 정수"로 다룬다.
//   예) 1 = 0.1%,  13 = 1.3%,  15 = 1.5%,  -300 = -30.0%

/** 1틱 길이(초) */
export const TICK_SECONDS = 5;
/** 평소 한 틱 최대 변동폭(%) */
export const MAX_TICK_MOVE = 1.5;
/** 누적 한도 윈도우 길이(틱). 12틱 × 5초 = 1분 */
export const WINDOW_TICKS = 12;
/** 윈도우 안 누적 변동률 합의 한도(%) */
export const WINDOW_CAP = 3.0;

/** % 값을 0.1% 단위 정수로. 1.5 → 15 */
const toRate = (percent: number) => Math.round(percent * 10);

/**
 * 게임 모드
 * - practice(연습): 한 판 30분, 뉴스 팝업이 뜨면 시간 정지, 직접(1차) 뉴스만, 해설 제공, 광고 보상 가능
 * - real(실전): 시대당 2시간, 뉴스가 떠도 시간이 계속 흐름, 1·2차 뉴스와 낌새→결과 스토리
 */
export type GameMode = 'practice' | 'real';

/** [최소, 최대] 범위 */
export type Range = readonly [number, number];

export interface GameConfig {
  /** 1틱의 길이(초). 엔진은 시계를 쓰지 않으므로 화면 쪽 타이머가 참고하는 값 */
  tickSeconds: number;
  /** 실전 시대 1개의 길이(초). 7200 = 2시간 */
  eraSeconds: number;
  /** 연습 한 판의 길이(초). 1800 = 30분 */
  practiceEraSeconds: number;

  /** 평소 한 틱 변동률의 최대 크기 (0.1% 단위). 15 = ±1.5% */
  tickMaxRate: number;
  /** 누적 한도 윈도우 길이(초). 60 = 1분 */
  windowSeconds: number;
  /** 윈도우 안 누적 변동률(합)의 최대 크기 (0.1% 단위). 30 = ±3.0% */
  windowMaxRate: number;

  /** 시대 시작 후 첫 뉴스가 뜨는 시점 범위(초) */
  firstNewsMinSeconds: number;
  firstNewsMaxSeconds: number;
  /** 뉴스와 뉴스 사이 간격 범위(초). 이 안에서 무작위 */
  newsGapMinSeconds: number;
  newsGapMaxSeconds: number;
  /** 뉴스가 주가에 반영되기까지 걸리는 시간(초). 연습: '확인' 후 / 실전: 뉴스가 뜬 뒤 */
  newsDelaySeconds: number;
  /** 낌새 뉴스 후 결과 뉴스가 반드시 나오는 시간 한도(초) */
  signalOutcomeWithinSeconds: number;
  /** 시대 종료 몇 초 전부터 새 낌새 뉴스를 시작하지 않을지 */
  noNewSignalLastSeconds: number;
  /** 결과에 기본 가중치가 없을 때 실제 역사 쪽 결과의 확률 */
  historicalOutcomeChance: number;

  /** 뉴스 반영 후 관성(기조 유지)이 이어지는 시간(초) */
  momentumSeconds: number;
  /** 관성 구간에서 각 틱이 같은 방향으로 움직일 확률 */
  momentumKeepChance: number;
  /** 관성 구간에서 각 틱이 반대 방향으로 움직일 확률 (나머지는 변동 없음) */
  momentumReverseChance: number;
  /** 관성 틱 크기 범위 (0.1% 단위). 일반 틱 범위(1~15) 안에서 정한다 */
  momentumRate: Range;

  /** 영향도 1당 변동률 (0.1% 단위). 30 = 3.0% */
  impactUnitRate: number;
  /** 영향도 최대 크기. 배율을 곱한 뒤에도 이 크기(±30%)를 넘지 않게 자른다 */
  impactMax: number;
  /** 실제 반영 배율 범위 (균등분포) */
  impactMultiplier: {
    realDirect: Range;
    realIndirect: Range;
    practice: Range;
  };

  /** 시대 시작 시 모든 종목 가격(비트) */
  startPrice: number;
  /** 가격 하한(비트) */
  minPrice: number;
  /** 시작 자금(비트). 실전은 첫 시대, 연습은 매 판 */
  startCash: number;
  /** 매매 수수료율 (매수·매도 각각). 0.002 = 0.2% */
  feeRate: number;

  /** 차트용으로 보관하는 가격 이력 길이(초). 1200 = 20분 */
  chartHistorySeconds: number;

  /** 연습 모드 광고 1회 시청 보상(비트) */
  adRewardBits: number;
  /** 연습 모드 한 판당 광고 보상 최대 횟수 */
  adRewardMaxPerRound: number;
}

export const DEFAULT_CONFIG: Readonly<GameConfig> = Object.freeze({
  tickSeconds: TICK_SECONDS,
  eraSeconds: 7200,
  practiceEraSeconds: 1800,
  tickMaxRate: toRate(MAX_TICK_MOVE),
  windowSeconds: WINDOW_TICKS * TICK_SECONDS,
  windowMaxRate: toRate(WINDOW_CAP),
  firstNewsMinSeconds: 60,
  firstNewsMaxSeconds: 180,
  newsGapMinSeconds: 180,
  newsGapMaxSeconds: 360,
  newsDelaySeconds: 10,
  signalOutcomeWithinSeconds: 900,
  noNewSignalLastSeconds: 900,
  historicalOutcomeChance: 0.7,
  momentumSeconds: 20,
  momentumKeepChance: 0.6,
  momentumReverseChance: 0.2,
  momentumRate: [1, toRate(MAX_TICK_MOVE)] as const,
  impactUnitRate: 30,
  impactMax: 10,
  impactMultiplier: {
    realDirect: [0.6, 1.4] as const,
    realIndirect: [0.4, 1.6] as const,
    practice: [0.85, 1.15] as const,
  },
  startPrice: 1000,
  minPrice: 1,
  startCash: 10_000,
  feeRate: 0.002,
  chartHistorySeconds: 1200,
  adRewardBits: 3000,
  adRewardMaxPerRound: 3,
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
  newsDelayTicks: number;
  signalOutcomeWithinTicks: number;
  noNewSignalLastTicks: number;
  momentumTicks: number;
  chartHistoryLength: number;
}

function toTicks(config: GameConfig, seconds: number, name: string): number {
  const ticks = seconds / config.tickSeconds;
  if (!Number.isInteger(ticks)) {
    throw new Error(`설정 오류: ${name}(${seconds}초)이 틱 길이(${config.tickSeconds}초)로 나누어떨어지지 않음`);
  }
  return ticks;
}

/** 모드에 맞는 틱 규칙. 연습 모드는 한 판 길이(30분)가 시대 길이가 된다 */
export function getTickRules(config: GameConfig, mode: GameMode = 'real'): TickRules {
  const eraSeconds = mode === 'practice' ? config.practiceEraSeconds : config.eraSeconds;
  const r: TickRules = {
    ticksPerEra: toTicks(config, eraSeconds, mode === 'practice' ? 'practiceEraSeconds' : 'eraSeconds'),
    windowTicks: toTicks(config, config.windowSeconds, 'windowSeconds'),
    firstNewsMinTicks: toTicks(config, config.firstNewsMinSeconds, 'firstNewsMinSeconds'),
    firstNewsMaxTicks: toTicks(config, config.firstNewsMaxSeconds, 'firstNewsMaxSeconds'),
    newsGapMinTicks: toTicks(config, config.newsGapMinSeconds, 'newsGapMinSeconds'),
    newsGapMaxTicks: toTicks(config, config.newsGapMaxSeconds, 'newsGapMaxSeconds'),
    newsDelayTicks: toTicks(config, config.newsDelaySeconds, 'newsDelaySeconds'),
    signalOutcomeWithinTicks: toTicks(config, config.signalOutcomeWithinSeconds, 'signalOutcomeWithinSeconds'),
    noNewSignalLastTicks: toTicks(config, config.noNewSignalLastSeconds, 'noNewSignalLastSeconds'),
    momentumTicks: toTicks(config, config.momentumSeconds, 'momentumSeconds'),
    chartHistoryLength: toTicks(config, config.chartHistorySeconds, 'chartHistorySeconds'),
  };
  if (r.newsDelayTicks < 1) throw new Error('설정 오류: 뉴스 반영 지연은 1틱 이상이어야 함');
  if (r.firstNewsMinTicks > r.firstNewsMaxTicks || r.newsGapMinTicks > r.newsGapMaxTicks) {
    throw new Error('설정 오류: 뉴스 시점 범위의 최소가 최대보다 큼');
  }
  if (r.newsGapMinTicks <= r.newsDelayTicks + r.momentumTicks) {
    throw new Error('설정 오류: 뉴스 간격이 반영 지연+관성 시간보다 짧으면 뉴스 효과가 겹침');
  }
  const [mMin, mMax] = config.momentumRate;
  if (mMin < 1 || mMax > config.tickMaxRate || mMin > mMax) {
    throw new Error('설정 오류: 관성 크기는 일반 틱 범위(0.1%~최대) 안이어야 함');
  }
  return r;
}

/** 0.1% 단위 정수를 % 숫자로 바꾼다. 13 → 1.3 */
export function rateToPercent(rate: number): number {
  return rate / 10;
}
