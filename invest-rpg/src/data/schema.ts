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

/** 뉴스 영향 대상으로 쓰면 "모든 종목"에 적용되는 특별한 테마 id (가급적 테마별로 나눠 쓰는 것을 권장) */
export const MARKET_THEME_ID = 'market';

/**
 * 영향의 연결 방식
 * - direct  : 1차 영향. 뉴스 내용만 읽어도 바로 알 수 있음 (예: 유가 급등 → 정유 호재)
 * - indirect: 2차 영향. 한 번 더 생각해야 함 (예: 유가 급등 → 항공권 인상 → 여행 수요 감소)
 */
export type EffectLink = 'direct' | 'indirect';

export interface NewsEffect {
  /** 테마 id, 또는 "market"(모든 종목에 같은 값) */
  themeId: string;
  /** 영향도: -10 ~ +10 정수. 실제 변동률 = 영향도 × 3% × 배율(무작위) */
  impact: number;
  link: EffectLink;
  /** 이 테마에 대한 한 줄 해설 (선택) */
  explanation?: LocalizedText;
}

/** 뉴스의 사실 근거 메모 (검증용, 게임 화면에는 안 나옴. 실명은 쓰지 않고 docs/ 팩트체크 문서에만 둔다) */
export interface NewsSource {
  /** 참고한 실제 사건 (서술형) */
  event: string;
  /** 실제 사건 날짜 (YYYY, YYYY-MM, YYYY-MM-DD 등) */
  date: string;
  /** 영향도를 이렇게 정한 근거 (관련 지수 등락폭 등) */
  impactRationale: string;
  /** 사실관계나 수치가 확실하지 않으면 true ("확인 필요") */
  needsVerification: boolean;
}

/**
 * 뉴스 종류
 * - theme : 특정 테마들에 대한 뉴스
 * - market: 시장 전체 뉴스 (금리·전쟁·유가·환율 등). 테마마다 방향이 다를 수 있다
 */
export type NewsCategory = 'theme' | 'market';

export interface News {
  id: string;
  /** 기본값 theme */
  category?: NewsCategory;
  title: LocalizedText;
  /** 2~3줄 본문 */
  body: LocalizedText;
  effects: NewsEffect[];
  /**
   * 해설 (연습 모드 '해설 보기'). 3~4문장, 중학생 눈높이, 투자 권유 금지.
   * 영향이 모두 직접(1차)인 뉴스(= 연습 모드에 나오는 뉴스)는 필수
   */
  explanation?: LocalizedText;
  /** 결과 뉴스가 낌새와 반대로 반응할 때 그 이유를 설명하는 한 줄 (예: 소문에 사고 사실에 판다) */
  reactionNote?: LocalizedText;
  source: NewsSource;
}

/** 스토리 결과 후보 */
export interface StoryOutcome {
  /** story.news 안의 뉴스 id */
  newsId: string;
  /** 상대 가중치. 생략하면 실제 역사 쪽이 70%, 나머지가 30%를 나눠 갖는다 */
  weight?: number;
  /** 실제로 일어난 결과면 true. false면 화면에 "가상 시나리오" 태그 */
  isHistorical: boolean;
}

/** 낌새와 결과 사이에 나오는 단서 뉴스. 실제로 뽑힌 결과를 가리킬 때만 나온다 */
export interface StoryClue {
  /** story.news 안의 뉴스 id */
  newsId: string;
  /** 이 단서가 암시하는 결과의 newsId */
  pointsTo: string;
}

/**
 * 낌새 → (단서) → 결과 스토리 (실전 모드 전용).
 * 낌새 뉴스가 나온 뒤 15분 안의 뉴스 자리 중 하나에서 결과 뉴스가 나온다.
 */
export interface Storyline {
  id: string;
  /** 낌새 뉴스. 영향도 1~3. 본문에서 판단 근거가 읽히도록 쓴다 */
  signal: News;
  /** 결과·단서 뉴스 본문들 */
  news: News[];
  outcomes: StoryOutcome[];
  clues?: StoryClue[];
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
  /** 낌새 → 결과 스토리 */
  storylines: Storyline[];
}

/** 영향이 모두 직접(1차)인 뉴스인가 (= 연습 모드에 나올 수 있는 뉴스) */
export function isAllDirect(news: News): boolean {
  return news.effects.length > 0 && news.effects.every((e) => e.link === 'direct');
}
