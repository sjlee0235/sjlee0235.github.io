// 해설 알림(recap): 뉴스 발표 120초(게임 시간) 뒤에 "이 뉴스로 무엇이 얼마나 움직였는지" 알려준다.
// - 시간을 멈추지 않는다. 뉴스 간격 규칙에도 포함되지 않는다.
// - 활성 테마 중 반영률 절댓값 상위 최대 3개, 나머지는 moreCount
// - appliedPct는 반영 틱에 실제로 적용된 값 (배율, ±30% 자르기, 뉴스 사이 한도 적용 후). 관성·일반 변동은 포함하지 않음
// - 잠정 뉴스는 tentativeNote: true (결과 방향을 암시하는 내용은 넣지 않는다)

import type { LocalizedText, NewsEffect, Theme } from '../data/schema.ts';
import type { NewsTag, ScheduledNews } from './newsEngine.ts';

export interface RecapItem {
  stockId: string;
  themeId: string;
  /** 실제 적용된 변동률 % (소수점 1자리, 부호 포함) */
  appliedPct: number;
  /** 작성자가 쓴 이유 (없으면 null → auto로 문구를 만든다) */
  reason: Partial<LocalizedText> | null;
  /** 자동 문구 재료: "{newsTerm}의 영향으로 {테마} {수혜/부담}" */
  auto: { newsTerm: string; themeName: LocalizedText; positive: boolean };
}

export interface RecapNotice {
  newsId: string;
  tag: NewsTag;
  /** 뉴스가 발표된 틱 / 알림이 만들어진 틱 */
  publishedTick: number;
  recapTick: number;
  items: RecapItem[];
  /** 상위 3개 밖의 영향 종목 수 */
  moreCount: number;
  /** 잠정 뉴스: "잠정 발표라 영향이 작았고 결과에 따라 달라질 수 있다" 문구를 붙인다 */
  tentativeNote: boolean;
  /** 결과·단서 뉴스: 연결된 잠정 뉴스 */
  relatedTentativeId?: string;
  isHistorical: boolean;
}

export function buildRecap(
  scheduled: ScheduledNews,
  /** 종목 id → 실제 적용된 변동률 (0.1% 단위) */
  applied: ReadonlyMap<string, number>,
  stocks: ReadonlyArray<{ id: string; themeId: string }>,
  themes: ReadonlyMap<string, Theme>,
  recapTick: number,
  maxItems: number,
): RecapNotice {
  const effectByTheme = new Map<string, NewsEffect>(scheduled.news.effects.map((e) => [e.themeId, e]));
  const rows = stocks
    .filter((s) => applied.has(s.id) && effectByTheme.has(s.themeId))
    .map((s): RecapItem => {
      const e = effectByTheme.get(s.themeId)!;
      return {
        stockId: s.id,
        themeId: s.themeId,
        appliedPct: applied.get(s.id)! / 10,
        reason: e.reason?.ko ? e.reason : null,
        auto: {
          newsTerm: e.link.keywords[0]?.newsTerm ?? scheduled.news.title.ko,
          themeName: themes.get(s.themeId)!.name,
          positive: e.impact > 0,
        },
      };
    })
    .sort((a, b) => Math.abs(b.appliedPct) - Math.abs(a.appliedPct));

  const notice: RecapNotice = {
    newsId: scheduled.news.id,
    tag: scheduled.tag,
    publishedTick: scheduled.tick,
    recapTick,
    items: rows.slice(0, maxItems),
    moreCount: Math.max(0, rows.length - maxItems),
    tentativeNote: scheduled.kind === 'tentative',
    isHistorical: scheduled.isHistorical,
  };
  if (scheduled.relatedTentativeId) notice.relatedTentativeId = scheduled.relatedTentativeId;
  return notice;
}
