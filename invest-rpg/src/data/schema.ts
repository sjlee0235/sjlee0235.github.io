// 게임 데이터(시대·테마·종목·뉴스)의 형태를 정의하는 파일.
// JSON 데이터 파일은 모두 이 형태를 따라야 하며, validate.ts가 검사한다.

/** 지금 지원하는 언어. 일본어(ja)·중국어(zh)는 나중에 여기에 추가한다. */
export type Locale = 'ko' | 'en';

/** 여러 언어로 된 텍스트. ko/en은 필수, 나머지 언어는 선택. */
export type LocalizedText = Record<Locale, string> & Partial<Record<'ja' | 'zh', string>>;

/** 테마의 시대 분위기: 긍정 / 부정 / 중립 */
export type Sentiment = 'positive' | 'negative' | 'neutral';

export interface Theme {
  /** 시대 안에서 고유한 id (예: "semiconductor"). "market"은 예약어라 쓸 수 없다 */
  id: string;
  name: LocalizedText;
  sentiment: Sentiment;
  /** 이 테마를 고른 이유 등 검증용 메모 (게임 화면에는 안 나옴) */
  memo?: string;
}

export interface Stock {
  /** 전체 데이터에서 고유한 id (예: "2000s-semiconductor") */
  id: string;
  /** 소속 테마 id. 시대마다 테마 1개당 종목 1개. */
  themeId: string;
  /** 가상 종목명. 실존 기업명·상표 금지. */
  name: LocalizedText;
  /** 3줄 내외의 기업 설명 */
  description: LocalizedText;
}

/** 뉴스 영향 대상으로 쓰면 "모든 종목"에 적용되는 특별한 테마 id */
export const MARKET_THEME_ID = 'market';

/**
 * 영향의 연결 방식
 * - direct  : 1차 영향. 뉴스 내용만 읽어도 바로 알 수 있음 (예: 유가 급등 → 정유 호재)
 * - indirect: 2차 영향. 한 번 더 생각해야 함 (예: 유가 급등 → 항공권 인상 → 여행 수요 감소)
 */
export type EffectLink = 'direct' | 'indirect';

export interface NewsEffect {
  /** 테마 id, 또는 "market"(시장 전체: 모든 종목에 적용) */
  themeId: string;
  /** 영향도: -10 ~ +10 정수. 변동률 = impact × 3%. 시장 영향과 테마 영향은 합산된다 */
  impact: number;
  link: EffectLink;
  /** 해설: 왜 이 테마에 호재/악재인지 (연습 모드 '해설 보기'에 쓰임) */
  explanation: LocalizedText;
}

/** 뉴스의 사실 근거 메모 (검증용, 게임 화면에는 안 나옴) */
export interface NewsSource {
  /** 참고한 실제 사건 */
  event: string;
  /** 실제 사건 날짜 (YYYY, YYYY-MM, YYYY-MM-DD 등) */
  date: string;
  /** 영향도를 이렇게 정한 근거 (관련 지수 등락폭 등) */
  impactRationale: string;
  /** 사실관계나 수치가 확실하지 않으면 true ("확인 필요") */
  needsVerification: boolean;
  /** 실제로는 일어나지 않은 가상의 결과면 true (스토리라인의 다른 갈래 등) */
  fictional?: boolean;
}

export interface News {
  id: string;
  title: LocalizedText;
  /** 2~3줄 본문 */
  body: LocalizedText;
  effects: NewsEffect[];
  source: NewsSource;
}

/** 스토리라인 결과의 방향 (상황이 나빠지는 쪽 / 좋아지는 쪽) */
export type StorylineTone = 'positive' | 'negative';

export interface StorylineBranch {
  tone: StorylineTone;
  /** 이 결과가 뽑힐 상대적 가중치 (기본 1). 두 갈래가 1:1이면 50% */
  weight?: number;
  news: News;
}

/**
 * 낌새 → 결과 스토리라인.
 * 낌새 뉴스(signals)가 순서대로 나온 뒤, 첫 낌새로부터 15분 안에
 * 결과 뉴스(branches 중 하나, 무작위)가 나온다.
 */
export interface Storyline {
  id: string;
  /** 낌새 뉴스. 아직 확실하지 않으므로 영향도가 결과 뉴스보다 작아야 한다 */
  signals: News[];
  /** 가능한 결과들 (2개 이상) */
  branches: StorylineBranch[];
  memo?: string;
}

export interface Era {
  /** 예: "2000s" */
  id: string;
  /** 시대 진행 순서. 작은 값이 먼저. (1980s=1980처럼 연도를 쓰면 중간 삽입이 쉽다) */
  order: number;
  displayName: LocalizedText;
  period: { startYear: number; endYear: number };
  themes: Theme[];
  stocks: Stock[];
  /** 단독 뉴스 */
  newsPool: News[];
  /** 낌새 → 결과 스토리라인 */
  storylines: Storyline[];
}
