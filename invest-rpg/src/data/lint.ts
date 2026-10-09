// 콘텐츠 작성 가이드 점검 (npm run lint:content).
// 게임은 돌아가지만 기획 가이드에서 벗어난 부분을 목록으로 알려준다.

import { allNewsOf, expectedImpact, type Era, type News, type Theme } from './schema.ts';

export interface LintIssue {
  rule: string;
  where: string;
  message: string;
  /** 'warning'이면 고치지 않아도 되지만 확인이 필요한 항목 (기본: 고쳐야 함) */
  severity?: 'warning';
}

export interface LintOptions {
  /** 영향 테마 수 범위 (시장 전체 뉴스는 상한 없음) */
  effectCount: readonly [number, number];
  /** 분위기 편향 목표: 긍정 테마 호재 비율, 부정 테마 악재 비율 / 중립은 50% */
  sentimentBias: number;
  /** 허용 오차 (비율) */
  sentimentTolerance: number;
  /** 비주류 테마 최소 영향 횟수 */
  peripheralMinHits: number;
  /** 풀 구성 목표 */
  pool: { core: number; peripheral: number; positive: number; negative: number; neutral: number };
  /** 해설(reason) 필수인 상위 항목 수 */
  reasonTopN: number;
}

export const DEFAULT_LINT_OPTIONS: LintOptions = {
  effectCount: [6, 9],
  sentimentBias: 0.75,
  sentimentTolerance: 0.1,
  peripheralMinHits: 2,
  pool: { core: 24, peripheral: 12, positive: 13, negative: 13, neutral: 10 },
  reasonTopN: 4,
};

// ───────── 금지어 (정보 숨김) ─────────
// 플레이 중 종목명·설명·뉴스 문장이 "오를 종목"을 대놓고 알려주면 공부할 이유가 사라진다.

/** 종목명에 쓰면 안 되는 평가·전망 어감 단어 (색·사물·자연물 같은 중립 단어를 권장) */
export const STOCK_NAME_BANNED = [
  '최강', '최고', '폭등', '폭락', '급등', '급락', '유망', '위기', '호황', '불황', '대박', '성장', '번영', '승리',
  '황금', '행운', '부도', '몰락', '위험', '든든', '튼튼', '으뜸', '일등', '쑥쑥', '씽씽', '미래', '희망', '대세',
];

/** 종목 설명에 쓰면 안 되는 전망·평가 표현 (제품·서비스 중심으로 중립 서술) */
export const STOCK_DESCRIPTION_BANNED = [
  '유망', '전망', '기대', '최고', '최강', '선도', '1위', '성장성', '호황', '불황', '위기', '폭등', '폭락', '급등',
  '대박', '수혜', '저평가', '고평가', '우량', '주목', '각광',
];

/** 뉴스 제목·본문에 쓰면 안 되는, 주가 방향을 직접 알려주는 표현 ("유가 급등"처럼 사건 자체 표현은 괜찮다) */
export const NEWS_DIRECTION_BANNED_KO = ['호재', '악재', '수혜', '수혜주', '타격주', '상승 예상', '하락 예상'];
export const NEWS_DIRECTION_BANNED_EN = ['good news for', 'bad news for', 'beneficiar', 'bullish', 'bearish', 'expected to rise', 'expected to fall'];

/**
 * 뉴스 방향을 간접적으로 암시할 수 있는 수식어. 막지는 않고 경고만 한다 (예: "평화" → 전쟁 뉴스에 약할 것 같은 느낌).
 * 목록은 콘텐츠를 쓰면서 계속 관리한다.
 */
export const STOCK_NAME_HINT_WORDS = [
  '평화', '전쟁', '안전', '안정', '햇살', '먹구름', '폭풍', '태풍', '가뭄', '단비', '새싹', '봄날', '상승', '하락', '불꽃', '질주',
];

/** 종목명 형식(한국어): "2글자 수식어 + 띄어쓰기 + 업종주". 반드시 '주'로 끝난다 (예: 평화 방산주) */
export const STOCK_NAME_PATTERN = /^[가-힣]{2} [가-힣A-Za-z0-9]+주$/;
/** 종목명 형식(영어): "... Stock"으로 끝난다 (예: Peace Defense Stock) */
export const STOCK_NAME_EN_PATTERN = /^\S.* Stock$/;
/** 기업 설명 길이(한국어 글자 수): 1~2줄, 80자 안팎. 이 값을 넘으면 경고, 90자를 넘으면 고쳐야 함 */
export const STOCK_DESCRIPTION_SOFT_MAX = 80;
export const STOCK_DESCRIPTION_HARD_MAX = 90;
/** 시대당 opener 스토리(시대 첫 뉴스 후보) 최소 개수 */
export const MIN_OPENER_STORIES = 3;

/** 종목·뉴스 문장 금지어 점검 (테마 풀 크기와 무관하게 튜토리얼에도 쓴다) */
export function lintWords(era: Era): LintIssue[] {
  const issues: LintIssue[] = [];
  const add = (rule: string, where: string, message: string) => issues.push({ rule, where, message });
  for (const s of era.stocks) {
    const name = s.name.ko;
    if (!STOCK_NAME_PATTERN.test(name)) add('stockName', s.id, `종목명 "${name}"이 "2글자 수식어 + 업종주" 형식이 아님 ('주'로 끝나야 함)`);
    if (!STOCK_NAME_EN_PATTERN.test(s.name.en)) add('stockName', s.id, `영어 종목명 "${s.name.en}"이 "Stock"으로 끝나지 않음`);
    for (const w of STOCK_NAME_BANNED) if (name.includes(w)) add('stockName', s.id, `종목명 "${name}"에 평가·전망 어감 단어 "${w}"`);
    for (const w of STOCK_NAME_HINT_WORDS) {
      if (name.split(' ')[0] === w) issues.push({ rule: 'stockNameHint', where: s.id, message: `종목명 "${name}"의 수식어 "${w}"가 뉴스 방향을 암시할 수 있음 (확인)`, severity: 'warning' });
    }
    const desc = s.description.ko.trim();
    if (desc.length === 0) add('stockDescription', s.id, '기업 설명이 비어 있음');
    else if (desc.length > STOCK_DESCRIPTION_HARD_MAX) add('stockDescription', s.id, `기업 설명 ${desc.length}자 (1~2줄, ${STOCK_DESCRIPTION_SOFT_MAX}자 안팎)`);
    else if (desc.length > STOCK_DESCRIPTION_SOFT_MAX) issues.push({ rule: 'stockDescription', where: s.id, message: `기업 설명 ${desc.length}자 (${STOCK_DESCRIPTION_SOFT_MAX}자 안팎 권장)`, severity: 'warning' });
    for (const w of STOCK_DESCRIPTION_BANNED) if (s.description.ko.includes(w)) add('stockDescription', s.id, `종목 설명에 전망·평가 표현 "${w}"`);
  }
  for (const n of allNewsOf(era)) {
    const ko = `${n.title.ko} ${n.body.ko}`;
    for (const w of NEWS_DIRECTION_BANNED_KO) if (ko.includes(w)) add('newsDirection', n.id, `주가 방향을 알려주는 표현 "${w}"`);
    const en = `${n.title.en} ${n.body.en}`.toLowerCase();
    for (const w of NEWS_DIRECTION_BANNED_EN) if (en.includes(w)) add('newsDirection', `${n.id} (en)`, `주가 방향을 알려주는 표현 "${w}"`);
  }
  return issues;
}

/** 본문에 연도·월 표기가 있는가 (예: 2008년, 3월, 1997, March 2003) */
export function findDateMentions(text: string): string[] {
  const patterns = [
    /(19|20)\d{2}\s*년/g,
    /\b(19|20)\d{2}\b/g,
    /(?<![0-9])(1[0-2]|[1-9])\s*월/g,
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/g,
  ];
  return patterns.flatMap((p) => text.match(p) ?? []);
}

/** 영향도 절댓값 상위 N개 (같으면 앞쪽 우선) */
export function topEffects(news: News, n: number) {
  return [...news.effects].sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact)).slice(0, n);
}

function wordIn(text: string, term: string): boolean {
  return text.toLowerCase().includes(term.toLowerCase());
}

export function lintEra(era: Era, opts: LintOptions = DEFAULT_LINT_OPTIONS): LintIssue[] {
  const issues: LintIssue[] = [];
  const add = (rule: string, where: string, message: string) => issues.push({ rule, where, message });
  const themes = new Map(era.themes.map((t) => [t.id, t]));
  const all = allNewsOf(era);

  // 풀 구성
  const count = (f: (t: Theme) => boolean) => era.themes.filter(f).length;
  const p = opts.pool;
  const actual = {
    core: count((t) => t.relevance === 'core'),
    peripheral: count((t) => t.relevance === 'peripheral'),
    positive: count((t) => t.sentiment === 'positive'),
    negative: count((t) => t.sentiment === 'negative'),
    neutral: count((t) => t.sentiment === 'neutral'),
  };
  for (const k of Object.keys(p) as (keyof typeof p)[]) {
    if (actual[k] !== p[k]) add('pool', era.id, `${k} 테마 ${actual[k]}개 (목표 ${p[k]}개)`);
  }
  for (const t of era.themes) {
    if (!t.existsEvidence?.trim()) add('existsEvidence', t.id, '시대 존재 근거(existsEvidence)가 비어 있음');
    const kw = t.keywords?.ko?.length ?? 0;
    if (kw < 5 || kw > 8) add('keywords', t.id, `한국어 키워드 ${kw}개 (5~8개)`);
  }

  for (const n of all) {
    const where = n.id;
    // 영향 테마 수 (잠정·단서는 규모가 작아 예외 없이 같은 기준으로 본다)
    const [lo, hi] = opts.effectCount;
    if (n.effects.length < lo || n.effects.length > hi) add('effectCount', where, `영향 테마 ${n.effects.length}개 (${lo}~${hi}개)`);

    for (const e of n.effects) {
      const ew = `${where} [${e.themeId}]`;
      const theme = themes.get(e.themeId);
      // 영향도 공식
      const exp = expectedImpact(n.magnitude, e.link.strength);
      const diff = Math.abs(Math.abs(e.impact) - exp);
      if (diff > 1 || (diff === 1 && !e.adjustNote)) {
        add('formula', ew, `영향도 ${e.impact} (공식 ±${exp}${diff === 1 ? ', ±1 조정은 adjustNote 필요' : ''})`);
      }
      // 강도 3: 뉴스 단어가 본문(제목 포함)에 있고, 테마 단어가 테마 키워드에 있어야 함
      if (e.link.strength === 3) {
        if (e.link.keywords.length === 0) add('keywords', ew, '강도 3인데 keywords가 비어 있음');
        for (const k of e.link.keywords) {
          if (!wordIn(`${n.title.ko} ${n.body.ko}`, k.newsTerm)) add('newsTerm', ew, `newsTerm "${k.newsTerm}"이 본문에 없음`);
          if (theme && !theme.keywords.ko.includes(k.themeTerm)) add('themeTerm', ew, `themeTerm "${k.themeTerm}"이 테마 키워드에 없음`);
        }
      } else if (!e.link.chain?.trim()) {
        add('chain', ew, `강도 ${e.link.strength}인데 chain(연결 설명)이 없음`);
      }
    }

    // 상위 4개 reason (한국어 필수, 영어는 목록만)
    for (const e of topEffects(n, opts.reasonTopN)) {
      if (!e.reason?.ko?.trim()) add('reasonKo', `${where} [${e.themeId}]`, '상위 영향 항목인데 한국어 reason이 없음');
      else if (!e.reason?.en?.trim()) add('reasonEn', `${where} [${e.themeId}]`, '영어 reason 없음 (나중에 추가 가능)');
    }

    // 본문 날짜 표기
    for (const loc of ['ko', 'en'] as const) {
      const found = findDateMentions(`${n.title[loc]} ${n.body[loc]}`);
      if (found.length > 0) add('date', `${where} (${loc})`, `본문에 연도·월 표기: ${found.join(', ')}`);
    }
  }

  // 테마별 호재/악재 비율 (분위기 편향)
  const hits = new Map<string, { pos: number; neg: number }>();
  for (const n of all) {
    for (const e of n.effects) {
      const h = hits.get(e.themeId) ?? { pos: 0, neg: 0 };
      if (e.impact > 0) h.pos++;
      else h.neg++;
      hits.set(e.themeId, h);
    }
  }
  for (const t of era.themes) {
    const h = hits.get(t.id) ?? { pos: 0, neg: 0 };
    const total = h.pos + h.neg;
    if (t.relevance === 'peripheral' && total < opts.peripheralMinHits) {
      add('peripheralHits', t.id, `비주류 테마 영향 ${total}회 (최소 ${opts.peripheralMinHits}회)`);
    }
    if (total === 0) continue;
    const posShare = h.pos / total;
    const target = t.sentiment === 'positive' ? opts.sentimentBias : t.sentiment === 'negative' ? 1 - opts.sentimentBias : 0.5;
    if (Math.abs(posShare - target) > opts.sentimentTolerance) {
      add('sentimentBias', t.id, `${t.sentiment} 테마 호재 비율 ${(posShare * 100).toFixed(0)}% (목표 ${(target * 100).toFixed(0)}%±${opts.sentimentTolerance * 100}p, ${total}회)`);
    }
  }

  // 시대 첫 뉴스 후보 (opener 스토리)
  const openers = era.stories.filter((s) => s.opener).length;
  if (openers < MIN_OPENER_STORIES) add('opener', era.id, `opener 스토리 ${openers}개 (시대당 ${MIN_OPENER_STORIES}개 이상)`);
  // 단서 쪽 결과는 실제 역사 (기획 결정 B5)
  for (const s of era.stories) {
    const lean = s.outcomes.find((o) => o.newsId === s.leansTo);
    if (lean && !lean.isHistorical) add('leanHistorical', s.id, '단서가 가리키는 결과(leansTo)가 실제 역사(isHistorical: true)가 아님');
  }

  issues.push(...lintWords(era));
  return issues;
}
