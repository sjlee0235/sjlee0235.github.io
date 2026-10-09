// 뉴스 엔진: 언제 어떤 뉴스가 뜨는지, 팝업 상태, 영향 반영 시점과 크기를 관리한다.
//
// 일정 만들기 (판 시작 때 시드로 한 번에 정함)
//   1) 뉴스 자리: 첫 뉴스는 1~3분 사이, 그 뒤로는 3~6분 간격 (무작위)
//   2) 자리마다 단독 뉴스 또는 스토리를 무작위 순서로 배치 (같은 뉴스 반복 없음, 풀이 바닥나면 더 안 나옴)
//   3) 스토리(실전 전용): 낌새 → (단서) → 결과. 결과는 낌새 후 15분 안에 오는 자리 중 하나에 들어간다.
//      - 동시에 진행되는 스토리는 1개까지 (결과가 나오기 전에는 새 낌새 없음)
//      - 시대 종료 15분 전부터는 새 낌새를 시작하지 않는다
//      - 결과는 가중치로 뽑는다 (기본: 실제 역사 쪽 70%)
//      - 단서는 실제로 뽑힌 결과를 가리킬 때만, 낌새와 결과 사이 빈자리에 나온다
//   연습 모드: 영향이 모두 직접(1차)인 단독 뉴스만. 스토리 없음.
//
// 반영
//   연습: 뉴스 팝업(시간 정지) → '확인' → 10초(2틱) 뒤 반영
//   실전: 뉴스 표시(시간 계속) → 10초(2틱) 뒤 반영
//   실제 변동률 = 영향도 × 3% × 배율. 배율은 영향마다 무작위 (실전 직접 0.6~1.4, 간접 0.4~1.6, 연습 0.85~1.15)

import { isAllDirect, MARKET_THEME_ID, type Era, type News, type Storyline } from '../data/schema.ts';
import { getTickRules, type GameConfig, type GameMode, type Range, type TickRules } from './config.ts';
import { shuffle, type Rng } from './rng.ts';

export type NewsKind = 'standalone' | 'signal' | 'clue' | 'outcome';

/** 보관함 태그: 직접 / 간접 / 낌새·단서(hint) / 결과 / 시장 전체 */
export type NewsTag = 'direct' | 'indirect' | 'hint' | 'outcome' | 'market';

export interface ScheduledNews {
  /** 이 틱이 끝난 직후에 뉴스가 뜬다 */
  tick: number;
  news: News;
  kind: NewsKind;
  tag: NewsTag;
  /** false면 실제와 다른 가상 시나리오 (화면에 "가상 시나리오" 태그) */
  isHistorical: boolean;
  storylineId?: string;
}

export function tagOf(news: News, kind: NewsKind): NewsTag {
  if (kind === 'signal' || kind === 'clue') return 'hint';
  if (kind === 'outcome') return 'outcome';
  if (news.category === 'market') return 'market';
  return isAllDirect(news) ? 'direct' : 'indirect';
}

/** 시대 안에서 뉴스가 뜰 수 있는 자리(틱)들을 만든다 */
export function makeNewsSlots(rules: TickRules, rng: Rng): number[] {
  // 마지막 뉴스도 반영과 관성이 시대 안에서 끝나도록 한다
  const last = rules.ticksPerEra - rules.newsDelayTicks - rules.momentumTicks;
  const slots: number[] = [];
  let t = rng.int(rules.firstNewsMinTicks, rules.firstNewsMaxTicks);
  while (t <= last) {
    slots.push(t);
    t += rng.int(rules.newsGapMinTicks, rules.newsGapMaxTicks);
  }
  return slots;
}

/** 결과 가중치. weight가 없으면 실제 역사 쪽이 historicalChance, 나머지가 남은 확률을 나눠 갖는다 */
export function outcomeWeights(story: Storyline, historicalChance: number): number[] {
  const hist = story.outcomes.filter((o) => o.isHistorical).length;
  const fict = story.outcomes.length - hist;
  return story.outcomes.map((o) => {
    if (o.weight !== undefined) return o.weight;
    if (fict === 0 || hist === 0) return 1;
    return o.isHistorical ? historicalChance / hist : (1 - historicalChance) / fict;
  });
}

function pickWeighted(weights: readonly number[], rng: Rng): number {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng.next() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i]!;
    if (r < 0) return i;
  }
  return weights.length - 1;
}

type PoolItem = { type: 'news'; news: News } | { type: 'story'; story: Storyline };

/** 시대 전체 뉴스 일정표를 만든다 (같은 시드 → 같은 일정) */
export function buildNewsSchedule(era: Era, rng: Rng, config: GameConfig, mode: GameMode): ScheduledNews[] {
  const rules = getTickRules(config, mode);
  const slots = makeNewsSlots(rules, rng);
  const pool: PoolItem[] =
    mode === 'practice'
      ? era.newsPool.filter(isAllDirect).map((news) => ({ type: 'news', news }))
      : [
          ...era.newsPool.map((news): PoolItem => ({ type: 'news', news })),
          ...era.storylines.map((story): PoolItem => ({ type: 'story', story })),
        ];
  const queue = shuffle(pool, rng);
  const assigned: (ScheduledNews | undefined)[] = slots.map(() => undefined);
  const lastSignalTick = rules.ticksPerEra - rules.noNewSignalLastTicks;
  /** 진행 중인 스토리의 결과 자리 번호 (이 자리 전까지는 새 낌새 금지) */
  let storyBusyUntil = -1;

  for (let i = 0; i < slots.length; i++) {
    if (assigned[i]) continue; // 스토리 단서·결과로 이미 예약된 자리
    const tick = slots[i]!;

    for (let q = 0; q < queue.length; q++) {
      const item = queue[q]!;
      if (item.type === 'news') {
        assigned[i] = { tick, news: item.news, kind: 'standalone', tag: tagOf(item.news, 'standalone'), isHistorical: true };
        queue.splice(q, 1);
        break;
      }
      // 스토리를 지금 시작할 수 있는가
      if (i < storyBusyUntil || tick > lastSignalTick) continue;
      const free: number[] = [];
      for (let j = i + 1; j < slots.length && slots[j]! - tick <= rules.signalOutcomeWithinTicks; j++) {
        if (!assigned[j]) free.push(j);
      }
      if (free.length === 0) continue;

      const story = item.story;
      const outcome = story.outcomes[pickWeighted(outcomeWeights(story, config.historicalOutcomeChance), rng)]!;
      const outcomeSlot = free[rng.int(0, free.length - 1)]!;
      const byId = new Map(story.news.map((n) => [n.id, n]));

      assigned[i] = { tick, news: story.signal, kind: 'signal', tag: 'hint', isHistorical: true, storylineId: story.id };
      // 뽑힌 결과를 가리키는 단서가 있고, 낌새와 결과 사이에 빈자리가 있으면 단서를 넣는다
      const clue = (story.clues ?? []).find((c) => c.pointsTo === outcome.newsId);
      const between = free.filter((j) => j < outcomeSlot);
      if (clue && between.length > 0) {
        const j = between[rng.int(0, between.length - 1)]!;
        assigned[j] = {
          tick: slots[j]!,
          news: byId.get(clue.newsId)!,
          kind: 'clue',
          tag: 'hint',
          isHistorical: outcome.isHistorical,
          storylineId: story.id,
        };
      }
      assigned[outcomeSlot] = {
        tick: slots[outcomeSlot]!,
        news: byId.get(outcome.newsId)!,
        kind: 'outcome',
        tag: 'outcome',
        isHistorical: outcome.isHistorical,
        storylineId: story.id,
      };
      storyBusyUntil = outcomeSlot;
      queue.splice(q, 1);
      break;
    }
  }
  return assigned.filter((a): a is ScheduledNews => a !== undefined);
}

/** 영향 하나에 쓰는 배율 범위 */
export function multiplierRange(config: GameConfig, mode: GameMode, link: 'direct' | 'indirect'): Range {
  const m = config.impactMultiplier;
  if (mode === 'practice') return m.practice;
  return link === 'direct' ? m.realDirect : m.realIndirect;
}

/**
 * 뉴스 하나를 "테마 id → 실제 변동률(0.1% 단위)" 표로 바꾼다.
 * - 영향마다 배율을 무작위로 뽑아 곱한다 (시장 전체 영향은 테마마다 따로 뽑는다)
 * - 같은 테마에 여러 영향이 있으면 합산
 * - 결과는 ±(영향도 최대 × 3%) = ±30%로 자른다
 */
export function newsToRates(
  news: News,
  themeIds: readonly string[],
  config: GameConfig,
  mode: GameMode,
  rng: Rng,
): Map<string, number> {
  const raw = new Map<string, number>();
  const add = (themeId: string, impact: number, link: 'direct' | 'indirect') => {
    const [lo, hi] = multiplierRange(config, mode, link);
    const mult = lo + rng.next() * (hi - lo);
    raw.set(themeId, (raw.get(themeId) ?? 0) + impact * config.impactUnitRate * mult);
  };
  for (const e of news.effects) {
    if (e.themeId === MARKET_THEME_ID) for (const id of themeIds) add(id, e.impact, e.link);
    else add(e.themeId, e.impact, e.link);
  }
  const cap = config.impactMax * config.impactUnitRate;
  const out = new Map<string, number>();
  for (const [k, v] of raw) {
    const rate = Math.max(-cap, Math.min(cap, Math.round(v)));
    if (rate !== 0) out.set(k, rate);
  }
  return out;
}

interface QueuedRates {
  applyTick: number;
  rates: Map<string, number>;
}

export class NewsEngine {
  /** 이번 판 뉴스 일정 (미리 정해짐. 화면에 미리 보여주면 안 됨) */
  readonly schedule: readonly ScheduledNews[];
  readonly mode: GameMode;
  private nextIndex = 0;
  private pending: ScheduledNews | null = null;
  private readonly queued: QueuedRates[] = [];
  private readonly rules: TickRules;
  private readonly config: GameConfig;
  private readonly themeIds: string[];
  private readonly impactRng: Rng;

  /**
   * @param scheduleRng 일정용 난수
   * @param impactRng  배율용 난수 (일정과 분리해서, 배율 규칙을 바꿔도 뉴스 순서는 그대로)
   */
  constructor(era: Era, scheduleRng: Rng, impactRng: Rng, config: GameConfig, mode: GameMode) {
    this.config = config;
    this.mode = mode;
    this.rules = getTickRules(config, mode);
    this.themeIds = era.themes.map((t) => t.id);
    this.impactRng = impactRng;
    this.schedule = buildNewsSchedule(era, scheduleRng, config, mode);
  }

  /**
   * 틱이 끝날 때마다 호출한다. 이 틱이 뉴스 자리면 그 뉴스를 돌려준다.
   * - 연습: 팝업이 열리고(isPopupOpen) '확인'을 기다린다
   * - 실전: 바로 반영 예약 (tick + 10초)
   */
  checkTrigger(tick: number): ScheduledNews | null {
    if (this.pending) return null;
    const next = this.schedule[this.nextIndex];
    if (!next || next.tick !== tick) return null;
    this.nextIndex++;
    if (this.mode === 'practice') this.pending = next;
    else this.enqueue(next, tick);
    return next;
  }

  /** 연습 모드 팝업이 열려 있는가 (열려 있으면 시간이 멈춤) */
  get isPopupOpen(): boolean {
    return this.pending !== null;
  }

  get pendingNews(): ScheduledNews | null {
    return this.pending;
  }

  /** 연습 모드 '확인'. currentTick + 10초 뒤에 반영되도록 예약한다 */
  confirm(currentTick: number): ScheduledNews {
    const s = this.pending;
    if (!s) throw new Error('확인할 뉴스 팝업이 없음');
    this.pending = null;
    this.enqueue(s, currentTick);
    return s;
  }

  /** 이 틱에 반영할 변동률을 꺼낸다 (꺼내면 비워짐). 없으면 undefined */
  consumeRatesFor(tick: number): Map<string, number> | undefined {
    let merged: Map<string, number> | undefined;
    for (let i = this.queued.length - 1; i >= 0; i--) {
      const q = this.queued[i]!;
      if (q.applyTick !== tick) continue;
      this.queued.splice(i, 1);
      merged ??= new Map();
      for (const [k, v] of q.rates) merged.set(k, (merged.get(k) ?? 0) + v);
    }
    return merged;
  }

  /** 지금까지 뜬 뉴스들 (순서대로) */
  get shown(): ScheduledNews[] {
    return this.schedule.slice(0, this.nextIndex);
  }

  private enqueue(s: ScheduledNews, fromTick: number): void {
    this.queued.push({
      applyTick: fromTick + this.rules.newsDelayTicks,
      rates: newsToRates(s.news, this.themeIds, this.config, this.mode, this.impactRng),
    });
  }
}
