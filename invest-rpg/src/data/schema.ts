// 게임 데이터(시대·테마·종목·뉴스)의 형태를 정의하는 파일.
// JSON 데이터 파일은 모두 이 형태를 따라야 하며, validate.ts(구조)와 lint.ts(작성 가이드)가 검사한다.

/** 지금 지원하는 언어. 일본어(ja)·중국어(zh)는 나중에 여기에 추가한다. */
export type Locale = 'ko' | 'en';

/** 여러 언어로 된 텍스트. ko/en은 필수, 나머지 언어는 선택. */
export type LocalizedText = Record<Locale, string> & Partial<Record<'ja' | 'zh', string>>;

/** 테마의 시대 분위기: 긍정 / 부정 / 중립 */
export type Sentiment = 'positive' | 'negative' | 'neutral';

/** 시대 안에서의 비중: core(그 시대의 주요 테마) / peripheral(실재했지만 주요 테마는 아닌 배경 테마) */
export type Relevance = 'core' | 'peripheral';

export interface Theme {
  /** 시대 안에서 고유한 id (예: "semiconductor") */
  id: string;
  name: LocalizedText;
  sentiment: Sentiment;
  relevance: Relevance;
  /** 그 테마를 대표하는 핵심 단어 5~8개 (연결 강도 3의 themeTerm은 여기서 고른다) */
  keywords: { ko: string[]; en: string[] };
  /** 그 시대에 존재했다는 근거 한 줄 (확실하지 않으면 "확인 필요") */
  existsEvidence: string;
  /** 기타 메모 (core/peripheral로 분류한 이유 등) */
  memo?: string;
}

export interface Stock {
  /** 전체 데이터에서 고유한 id (예: "2000s-semiconductor") */
  id: string;
  /** 소속 테마 id. 테마 1개당 종목 1개 */
  themeId: string;
  /** 가상 종목명. 실존 기업명·상표 금지 */
  name: LocalizedText;
  /** 3줄 내외의 기업 설명 */
  description: LocalizedText;
}

/**
 * 연결 강도
 * 3 = 직접: 뉴스 핵심 단어가 테마 키워드와 일치
 * 2 = 밀접: 뉴스 핵심 단어가 테마의 주요 비용·수요·공급 요소
 * 1 = 간접: 두 단계 이상 거쳐 연결
 */
export type LinkStrength = 3 | 2 | 1;

export interface EffectLink {
  strength: LinkStrength;
  /** 뉴스의 핵심 단어 ↔ 테마 키워드 */
  keywords: { newsTerm: string; themeTerm: string }[];
  /** 연결 설명 한 줄 (강도 2, 1에서 필수) */
  chain?: string;
}

export interface NewsEffect {
  themeId: string;
  /** 부호 있는 정수 -10~10. 공식: |impact| = max(1, round(magnitude × 계수)), 계수 3→1.0 / 2→0.6 / 1→0.3 */
  impact: number;
  link: EffectLink;
  /** 해설 알림에 쓰는 한 줄 이유. 영향도 절댓값 상위 4개 항목은 한국어 필수 */
  reason?: Partial<LocalizedText>;
  /** 공식에서 ±1 조정했다면 그 이유 */
  adjustNote?: string;
}

/**
 * 뉴스 종류
 * - breaking : 속보. 예고 없이 갑자기 나오는 단독 뉴스
 * - tentative: 잠정 뉴스. 아직 확정되지 않은 소식 (스토리의 시작)
 * - outcome  : 결과 뉴스. 잠정 뉴스의 결말 (스토리마다 서로 반대인 2개)
 */
export type NewsType = 'breaking' | 'tentative' | 'outcome';

/** 근거 메모 (검증용, 화면에 안 나옴. 실명은 docs/ 팩트체크 문서에만) */
export interface NewsSource {
  event: string;
  impactRationale: string;
  needsVerification: boolean;
}

export interface News {
  id: string;
  type: NewsType;
  /** 뉴스 전체 규모 1~10. 속보 3~9, 잠정 1~3, 결과 7~9 위주 */
  magnitude: number;
  title: LocalizedText;
  /** 신문 기사처럼 2~3줄. 연도·월 표기 금지 (뉴스는 시대 안에서 무작위 순서로 나온다) */
  body: LocalizedText;
  effects: NewsEffect[];
  /** 실제 사건 날짜 (메타데이터, 화면에 안 씀) */
  realDate: string;
  /** 결과 뉴스가 예상과 반대로 반응할 때의 해설 한 줄 (실제 기록 근거가 있을 때만) */
  reactionNote?: LocalizedText;
  source?: NewsSource;
}

/** 스토리 결과 후보 (항상 2개, 서로 반대 방향) */
export interface StoryOutcome {
  /** story.news 안의 뉴스 id */
  newsId: string;
  /** 상대 가중치. 생략하면 leansTo 쪽이 config.leansToChance(기본 70%), 다른 쪽이 나머지 */
  weight?: number;
  /** 실제로 일어난 결과면 true. false면 화면에 "가상 시나리오" 태그 */
  isHistorical: boolean;
}

/** 잠정 뉴스와 결과 사이에 나오는 단서 뉴스 (선택). 실제로 뽑힌 결과를 가리킬 때만 나온다 */
export interface StoryClue {
  newsId: string;
  pointsTo: string;
}

/** 잠정 → (단서) → 결과 스토리 */
export interface Story {
  id: string;
  tentative: News;
  /** 결과·단서 뉴스 본문 */
  news: News[];
  /** 서로 반대인 결과 2개 */
  outcomes: StoryOutcome[];
  /** 잠정 뉴스 본문의 단서가 가리키는 결과 newsId (가중치가 큰 쪽) */
  leansTo: string;
  clues?: StoryClue[];
  /**
   * 시대 첫 뉴스로 쓸 수 있는 스토리 (초기 투자 방향을 잡기 좋게, 단서가 읽기 쉽고 사건이 직관적인 것).
   * 시대 첫 뉴스(7분)는 사용 가능한 opener 스토리 중에서 시드 기반 무작위로 고른다. 시대당 3개 이상 권장
   */
  opener?: boolean;
  memo?: string;
}

export interface Era {
  /** 예: "2000s" */
  id: string;
  /** 시대 진행 순서. 작은 값이 먼저 (1980s=1980처럼 연도를 쓰면 중간 삽입이 쉽다) */
  order: number;
  displayName: LocalizedText;
  period: { startYear: number; endYear: number };
  /** 테마 풀 (예: 36개). 시대 시작 때 이 중 20개를 추첨한다 */
  themes: Theme[];
  /** 테마당 종목 1개 */
  stocks: Stock[];
  /** 속보 풀 */
  breaking: News[];
  /** 스토리 풀 */
  stories: Story[];
}

/** 영향의 종류는 강도에서 계산: 3 → direct, 2·1 → indirect */
export function effectKind(effect: NewsEffect): 'direct' | 'indirect' {
  return effect.link.strength === 3 ? 'direct' : 'indirect';
}

export const STRENGTH_COEFFICIENT: Readonly<Record<LinkStrength, number>> = { 3: 1.0, 2: 0.6, 1: 0.3 };

/** 공식에 따른 영향도 크기: max(1, round(magnitude × 계수)) */
export function expectedImpact(magnitude: number, strength: LinkStrength): number {
  return Math.max(1, Math.round(magnitude * STRENGTH_COEFFICIENT[strength]));
}

/** 시대의 모든 뉴스 (속보 + 스토리의 잠정·결과·단서) */
export function allNewsOf(era: Era): News[] {
  return [...era.breaking, ...era.stories.flatMap((s) => [s.tentative, ...s.news])];
}
