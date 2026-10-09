// 게임 데이터(시대·테마·종목·뉴스)의 형태를 정의하는 파일.
// JSON 데이터 파일은 모두 이 형태를 따라야 하며, validate.ts가 검사한다.

/** 지금 지원하는 언어. 일본어(ja)·중국어(zh)는 나중에 여기에 추가한다. */
export type Locale = 'ko' | 'en';

/** 여러 언어로 된 텍스트. ko/en은 필수, 나머지 언어는 선택. */
export type LocalizedText = Record<Locale, string> & Partial<Record<'ja' | 'zh', string>>;

/** 테마의 시대 분위기: 긍정 / 부정 / 중립 */
export type Sentiment = 'positive' | 'negative' | 'neutral';

export interface Theme {
  /** 시대 안에서 고유한 id (예: "semiconductor") */
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

export interface NewsEffect {
  themeId: string;
  /** 영향도: -10 ~ +10 정수. 변동률 = impact × 3% */
  impact: number;
}

/** 뉴스의 사실 근거 메모 (검증용, 게임 화면에는 안 나옴) */
export interface NewsSource {
  /** 참고한 실제 사건 */
  event: string;
  /** 실제 사건 날짜 (YYYY, YYYY-MM, YYYY-MM-DD 중 하나) */
  date: string;
  /** 영향도를 이렇게 정한 근거 (관련 지수 등락폭 등) */
  impactRationale: string;
  /** 사실관계나 수치가 확실하지 않으면 true ("확인 필요") */
  needsVerification: boolean;
}

export interface News {
  id: string;
  title: LocalizedText;
  /** 2~3줄 본문 */
  body: LocalizedText;
  effects: NewsEffect[];
  source: NewsSource;
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
  newsPool: News[];
}
