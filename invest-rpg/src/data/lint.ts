// 콘텐츠 작성 가이드 점검 (npm run lint:content).
// 게임은 돌아가지만 기획 가이드에서 벗어난 부분을 목록으로 알려준다.

import { allNewsOf, expectedImpact, type Era, type News, type Theme } from './schema.ts';

export interface LintIssue {
  rule: string;
  where: string;
  message: string;
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

  return issues;
}
