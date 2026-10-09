// 게임 규칙의 숫자들을 한곳에 모은 설정 파일.
// 밸런스를 바꾸고 싶으면 여기 값만 고치면 된다.
//
// 변동률은 소수점 실수 오차를 피하려고 "0.1% 단위 정수"로 다룬다.
//   예) 1 = 0.1%,  13 = 1.3%,  30 = 3.0%,  -300 = -30.0%

export interface GameConfig {
  /** 게임 내 1틱의 길이(초). 엔진은 시계를 쓰지 않으므로 화면 쪽 타이머가 참고하는 값 */
  tickSeconds: number;
  /** 시대 1개의 길이(틱). 720틱 = 2시간 */
  ticksPerEra: number;

  /** 평소 한 틱 변동률의 최대 크기 (0.1% 단위). 30 = ±3.0% */
  tickMaxRate: number;
  /** 누적 한도 윈도우 길이(틱). 6틱 = 1분 */
  windowTicks: number;
  /** 윈도우 안 누적 변동률(합)의 최대 크기 (0.1% 단위). 30 = ±3.0% */
  windowMaxRate: number;

  /** 뉴스 간격(틱). 30틱 = 5분 */
  newsIntervalTicks: number;
  /** 영향도 1당 변동률 (0.1% 단위). 30 = 3.0% */
  impactUnitRate: number;
  /** 영향도 최대 크기 */
  impactMax: number;

  /** 시대 시작 시 모든 종목 가격(비트) */
  startPrice: number;
  /** 가격 하한(비트) */
  minPrice: number;
  /** 게임 시작 자금(비트) */
  startCash: number;
  /** 매매 수수료율 (0 = 없음, 0.00015 = 0.015%) */
  feeRate: number;

  /** 차트용으로 보관하는 최근 가격 개수. 120 = 20분 */
  chartHistoryLength: number;
}

export const DEFAULT_CONFIG: Readonly<GameConfig> = Object.freeze({
  tickSeconds: 10,
  ticksPerEra: 720,
  tickMaxRate: 30,
  windowTicks: 6,
  windowMaxRate: 30,
  newsIntervalTicks: 30,
  impactUnitRate: 30,
  impactMax: 10,
  startPrice: 1000,
  minPrice: 1,
  startCash: 10_000,
  feeRate: 0,
  chartHistoryLength: 120,
});

export function makeConfig(overrides: Partial<GameConfig> = {}): GameConfig {
  return { ...DEFAULT_CONFIG, ...overrides };
}

/** 0.1% 단위 정수를 % 숫자로 바꾼다. 13 → 1.3 */
export function rateToPercent(rate: number): number {
  return rate / 10;
}
