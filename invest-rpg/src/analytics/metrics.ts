// 플레이 기록 분석: 이벤트 기록에서 밸런스 지표를 계산한다.
// 엔진 밖(분석용) 코드다. 나중에 서버·대시보드에서도 그대로 쓸 수 있게 순수 함수로만 만든다.
//
// 지표는 docs/telemetry.md의 "지표 → 조정할 손잡이" 표와 짝을 이룬다.

import type { EngineEventMap, TelemetryEvent } from '../engine/telemetry.ts';

/** 뉴스 뒤 몇 틱 안의 매매를 "그 뉴스에 반응한 매매"로 보나 (12틱 = 1분) */
export const REACTION_WINDOW_TICKS = 12;

/** 업로드 기록 한 줄: 엔진 이벤트 + 앱이 붙이는 구분자 */
export type TelemetryRecord = TelemetryEvent & {
  /** 무작위 설치 id (개인 정보 아님) */
  pid?: string;
  /** 게임(판) id: 앱이 Game을 만들 때마다 새로 */
  gid?: string;
};

export type Archetype =
  | 'idle' // 거의 매매 안 함
  | 'holder' // 사서 오래 들고 있음
  | 'newsSniper' // 뉴스 직후(5초 안) 바로 따라 삼
  | 'newsFollower' // 뉴스를 따라 사지만 반영 뒤에
  | 'storyReader' // 잠정 뉴스의 단서를 보고 미리 삼
  | 'storyContrarian' // 잠정 뉴스의 단서와 반대로 삼
  | 'scalper' // 아주 잦은 매매
  | 'mixed';

export interface PlayerEraMetrics {
  gid: string;
  pid: string | null;
  eraId: string;
  eraIndex: number;
  /** 시대를 끝까지 했나 (false면 중간 이탈) */
  completed: boolean;
  /** 마지막 기록 틱 (이탈 지점) */
  lastTick: number;
  returnPct: number | null;
  trades: number;
  rejected: number;
  feesPaid: number;
  investedShare: number | null;
  maxDrawdownPct: number | null;
  newsShown: number;
  /** 반응한 뉴스 비율: 뉴스 뒤 1분 안에 그 뉴스와 엮인 종목을 매매 */
  followRate: number;
  /** 뉴스와 엮인 종목을 사기까지 걸린 틱의 중앙값 (0 = 발표 즉시, 1 = 나머지 반영 뒤) */
  medianReactionTicks: number | null;
  /** 반응 매매가 뉴스 방향과 맞은 비율 (호재 매수 / 악재 매도) */
  agreeRate: number | null;
  /** 매수 중 발표 즉시(0틱) 매수 비율 */
  instantBuyShare: number | null;
  /** 매수 중 가장 최근 뉴스가 잠정 뉴스였던 비율 (잠정 뉴스를 보고 사는 경향) */
  tentativeBuyShare: number | null;
  /** 스토리 진행 중 매수 가운데 잠정 뉴스 방향(호재 테마)을 산 비율 */
  leanBuyShare: number | null;
  storyBuys: number;
  archetype: Archetype;
}

const median = (xs: number[]): number | null => {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)]!;
};
const ratio = (a: number, b: number): number | null => (b === 0 ? null : a / b);

type Ev<K extends keyof EngineEventMap> = TelemetryRecord & { type: K; data: EngineEventMap[K] };
const isType = <K extends keyof EngineEventMap>(e: TelemetryRecord, type: K): e is Ev<K> => e.type === type;

/** 기록을 게임(gid)별로 묶는다 */
export function groupByGame(records: readonly TelemetryRecord[]): Map<string, TelemetryRecord[]> {
  const out = new Map<string, TelemetryRecord[]>();
  for (const r of records) {
    const key = r.gid ?? 'unknown';
    const list = out.get(key) ?? [];
    list.push(r);
    out.set(key, list);
  }
  for (const list of out.values()) list.sort((a, b) => a.seq - b.seq);
  return out;
}

/** 한 게임의 기록 → 시대별 지표 */
export function eraMetrics(events: readonly TelemetryRecord[], gid = events[0]?.gid ?? 'unknown'): PlayerEraMetrics[] {
  const byEra = new Map<number, TelemetryRecord[]>();
  for (const e of events) {
    if (e.type === 'game_start') continue;
    const list = byEra.get(e.eraIndex) ?? [];
    list.push(e);
    byEra.set(e.eraIndex, list);
  }
  const out: PlayerEraMetrics[] = [];
  for (const [eraIndex, list] of byEra) {
    const end = list.find((e) => isType(e, 'era_end')) as Ev<'era_end'> | undefined;
    const news = list.filter((e): e is Ev<'news_published'> => isType(e, 'news_published'));
    const trades = list.filter((e): e is Ev<'trade'> => isType(e, 'trade') && !e.data.auto);
    const buys = trades.filter((t) => t.data.side === 'buy');

    // 뉴스별 첫 반응 매매 (뉴스와 엮인 종목). 걸린 시간은 "사기까지"로 잰다
    // (가진 종목을 뉴스와 상관없이 정리하는 매도가 반응 시간을 왜곡하지 않도록)
    const latencies: number[] = [];
    let agree = 0;
    let reacted = 0;
    const linked = (t: Ev<'trade'>, n: Ev<'news_published'>) =>
      t.data.context.lastNewsId === n.data.newsId && t.data.context.newsLink !== null && t.tick - n.tick <= REACTION_WINDOW_TICKS;
    for (const n of news) {
      const first = trades.find((t) => linked(t, n));
      if (!first) continue;
      reacted++;
      const up = first.data.context.newsLink!.impact > 0;
      if ((first.data.side === 'buy') === up) agree++;
      const firstBuy = buys.find((t) => linked(t, n));
      if (firstBuy) latencies.push(firstBuy.tick - n.tick);
    }
    const kindOf = new Map(news.map((n) => [n.data.newsId, n.data.kind]));
    const storyBuys = buys.filter((b) => b.data.context.openStoryId !== null && b.data.context.storyLink !== null);
    const m: Omit<PlayerEraMetrics, 'archetype'> = {
      gid,
      pid: events[0]?.pid ?? null,
      eraId: list[0]!.eraId,
      eraIndex,
      completed: end !== undefined,
      lastTick: Math.max(...list.map((e) => e.tick)),
      returnPct: end?.data.returnPct ?? null,
      trades: trades.length,
      rejected: list.filter((e) => e.type === 'trade_rejected').length,
      feesPaid: end?.data.feesPaid ?? trades.reduce((a, t) => a + t.data.fee, 0),
      investedShare: end?.data.investedShare ?? null,
      maxDrawdownPct: end?.data.maxDrawdownPct ?? null,
      newsShown: news.length,
      followRate: news.length === 0 ? 0 : reacted / news.length,
      medianReactionTicks: median(latencies),
      agreeRate: ratio(agree, reacted),
      instantBuyShare: ratio(buys.filter((b) => b.data.context.ticksSinceNews === 0).length, buys.length),
      tentativeBuyShare: ratio(buys.filter((b) => kindOf.get(b.data.context.lastNewsId ?? '') === 'tentative').length, buys.length),
      leanBuyShare: ratio(storyBuys.filter((b) => b.data.context.storyLink! > 0).length, storyBuys.length),
      storyBuys: storyBuys.length,
    };
    out.push({ ...m, archetype: classify(m) });
  }
  return out.sort((a, b) => a.eraIndex - b.eraIndex);
}

/**
 * 간단한 규칙 기반 유형 분류. 실제 데이터가 쌓이면 군집 분석(비슷한 사람끼리 묶기)으로 바꾼다.
 * 순서가 중요하다: 위에서부터 먼저 맞는 유형.
 */
export function classify(m: Omit<PlayerEraMetrics, 'archetype'>): Archetype {
  if (m.trades <= 1) return 'idle';
  if (m.storyBuys >= 3 && (m.tentativeBuyShare ?? 0) >= 0.6) {
    if ((m.leanBuyShare ?? 0) >= 0.6) return 'storyReader';
    if ((m.leanBuyShare ?? 1) <= 0.4) return 'storyContrarian';
  }
  if (m.followRate >= 0.5 && (m.medianReactionTicks ?? 99) === 0) return 'newsSniper';
  if (m.followRate >= 0.5) return 'newsFollower';
  if (m.trades >= 100) return 'scalper';
  if ((m.investedShare ?? 0) >= 0.7 && m.trades <= 40) return 'holder';
  return 'mixed';
}

export interface NewsMetrics {
  newsId: string;
  kind: string;
  /** 이 뉴스를 본 판 수 */
  shown: number;
  /** 1분 안에 엮인 종목을 매매한 판 비율 */
  reactRate: number;
  /** 반응한 판 중 방향이 맞은 비율 (낮으면 뉴스가 헷갈린다는 신호) */
  agreeRate: number | null;
  /** 결과 뉴스: 단서대로 나온 비율 */
  followedLeanRate: number | null;
}

/** 여러 게임 기록 → 뉴스별 지표 (콘텐츠 품질 점검용) */
export function newsMetrics(games: Iterable<readonly TelemetryRecord[]>): NewsMetrics[] {
  const acc = new Map<string, { kind: string; shown: number; reacted: number; agree: number; lean: number; outcomes: number }>();
  for (const events of games) {
    const trades = events.filter((e): e is Ev<'trade'> => isType(e, 'trade') && !e.data.auto);
    for (const n of events.filter((e): e is Ev<'news_published'> => isType(e, 'news_published'))) {
      const a = acc.get(n.data.newsId) ?? { kind: n.data.kind, shown: 0, reacted: 0, agree: 0, lean: 0, outcomes: 0 };
      a.shown++;
      if (n.data.kind === 'outcome') {
        a.outcomes++;
        if (n.data.followedLean) a.lean++;
      }
      const first = trades.find(
        (t) => t.eraIndex === n.eraIndex && t.data.context.lastNewsId === n.data.newsId
          && t.data.context.newsLink !== null && t.tick - n.tick <= REACTION_WINDOW_TICKS,
      );
      if (first) {
        a.reacted++;
        if ((first.data.side === 'buy') === first.data.context.newsLink!.impact > 0) a.agree++;
      }
      acc.set(n.data.newsId, a);
    }
  }
  return [...acc.entries()].map(([newsId, a]) => ({
    newsId,
    kind: a.kind,
    shown: a.shown,
    reactRate: a.reacted / a.shown,
    agreeRate: ratio(a.agree, a.reacted),
    followedLeanRate: ratio(a.lean, a.outcomes),
  }));
}

/** 시대 기록에서 이탈 지점 분포: 끝까지 안 한 판의 마지막 틱 */
export function dropoutTicks(metrics: readonly PlayerEraMetrics[]): number[] {
  return metrics.filter((m) => !m.completed).map((m) => m.lastTick);
}
