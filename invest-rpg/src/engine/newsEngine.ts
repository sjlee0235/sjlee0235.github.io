// 뉴스 엔진: 언제 어떤 뉴스가 뜨는지, 팝업 상태, 영향 반영 시점을 관리한다.
//
// 일정 만들기 (시대 시작 때 시드로 한 번에 정함)
//   1) 뉴스 자리: 첫 뉴스는 1~3분 사이, 그 뒤로는 3~6분 간격 (무작위)
//   2) 자리마다 단독 뉴스 또는 스토리라인을 무작위 순서로 배치 (중복 없음)
//   3) 스토리라인: 낌새 뉴스 → (첫 낌새로부터 15분 안의 빈자리 중 무작위) → 결과 뉴스
//      결과는 갈래(branches) 중 가중치에 따라 무작위로 하나
//
// 반영 흐름
//   연습: 뉴스 팝업(시간 정지) → '확인' → 10초(2틱) 뒤 반영
//   실전: 뉴스 표시(시간 계속) → 10초(2틱) 뒤 반영
//   연습 모드에서는 1차(direct) 영향만 반영한다. 1차 영향이 하나도 없는 뉴스는 나오지 않는다.

import { MARKET_THEME_ID, type Era, type News, type StorylineTone } from '../data/schema.ts';
import { getTickRules, type GameConfig, type GameMode, type TickRules } from './config.ts';
import { shuffle, type Rng } from './rng.ts';

export type NewsKind = 'standalone' | 'signal' | 'outcome';

export interface ScheduledNews {
  /** 이 틱이 끝난 직후에 뉴스가 뜬다 */
  tick: number;
  /** 모드에 맞게 걸러진 뉴스 (연습 모드면 1차 영향만 남음) */
  news: News;
  kind: NewsKind;
  storylineId?: string;
  /** 결과 뉴스일 때 어느 쪽 결과인지 */
  tone?: StorylineTone;
}

/** 모드에 맞게 뉴스를 거른다. 연습 모드는 1차 영향만 남기고, 하나도 없으면 null */
export function newsForMode(news: News, mode: GameMode): News | null {
  if (mode === 'real') return news;
  const effects = news.effects.filter((e) => e.link === 'direct');
  return effects.length > 0 ? { ...news, effects } : null;
}

/**
 * 뉴스 하나를 "테마 id → 영향도" 표로 바꾼다.
 * - 같은 테마가 두 번 나오면 합산
 * - "market"(시장 전체) 영향은 모든 테마에 더한다
 * - 결과는 ±impactMax로 자른다
 */
export function newsToImpacts(news: News, themeIds: readonly string[], impactMax: number): Map<string, number> {
  const market = news.effects.filter((e) => e.themeId === MARKET_THEME_ID).reduce((a, e) => a + e.impact, 0);
  const map = new Map<string, number>();
  if (market !== 0) for (const id of themeIds) map.set(id, market);
  for (const e of news.effects) {
    if (e.themeId === MARKET_THEME_ID) continue;
    map.set(e.themeId, (map.get(e.themeId) ?? 0) + e.impact);
  }
  for (const [k, v] of map) {
    const clamped = Math.max(-impactMax, Math.min(impactMax, v));
    if (clamped === 0) map.delete(k);
    else map.set(k, clamped);
  }
  return map;
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

type PoolItem =
  | { type: 'news'; news: News }
  | { type: 'storyline'; id: string; signals: News[]; branches: { tone: StorylineTone; weight: number; news: News }[] };

function poolForMode(era: Era, mode: GameMode): PoolItem[] {
  const items: PoolItem[] = [];
  for (const n of era.newsPool) {
    const filtered = newsForMode(n, mode);
    if (filtered) items.push({ type: 'news', news: filtered });
  }
  for (const s of era.storylines) {
    const signals = s.signals.map((n) => newsForMode(n, mode));
    const branches = s.branches.map((b) => ({ tone: b.tone, weight: b.weight ?? 1, news: newsForMode(b.news, mode) }));
    // 연습 모드에서 1차 영향이 없는 뉴스가 하나라도 있으면 그 스토리라인은 뺀다
    if (signals.some((n) => !n) || branches.some((b) => !b.news)) continue;
    items.push({
      type: 'storyline',
      id: s.id,
      signals: signals as News[],
      branches: branches as { tone: StorylineTone; weight: number; news: News }[],
    });
  }
  return items;
}

function pickWeighted<T extends { weight: number }>(items: readonly T[], rng: Rng): T {
  const total = items.reduce((a, b) => a + b.weight, 0);
  let r = rng.next() * total;
  for (const it of items) {
    r -= it.weight;
    if (r < 0) return it;
  }
  return items[items.length - 1]!;
}

/** 시대 전체 뉴스 일정표를 만든다 (같은 시드 → 같은 일정) */
export function buildNewsSchedule(era: Era, rng: Rng, config: GameConfig, mode: GameMode): ScheduledNews[] {
  const rules = getTickRules(config);
  const slots = makeNewsSlots(rules, rng);
  const queue = shuffle(poolForMode(era, mode), rng);
  const assigned: (ScheduledNews | undefined)[] = slots.map(() => undefined);

  for (let i = 0; i < slots.length; i++) {
    if (assigned[i]) continue; // 스토리라인 후속 뉴스로 이미 예약된 자리

    // 이 자리에 들어갈 수 있는 첫 항목을 찾는다
    for (let q = 0; q < queue.length; q++) {
      const item = queue[q]!;
      if (item.type === 'news') {
        assigned[i] = { tick: slots[i]!, news: item.news, kind: 'standalone' };
        queue.splice(q, 1);
        break;
      }
      // 스토리라인: 첫 낌새로부터 15분 안의 빈자리가 (남은 낌새 수 + 결과 1개)만큼 필요
      const free: number[] = [];
      for (let j = i + 1; j < slots.length && slots[j]! - slots[i]! <= rules.signalOutcomeWithinTicks; j++) {
        if (!assigned[j]) free.push(j);
      }
      const extraSignals = item.signals.length - 1;
      if (free.length < extraSignals + 1) continue; // 자리가 부족하면 다음 항목 시도

      const outcomeIdx = free[rng.int(extraSignals, free.length - 1)]!;
      const branch = pickWeighted(item.branches, rng);
      assigned[i] = { tick: slots[i]!, news: item.signals[0]!, kind: 'signal', storylineId: item.id };
      for (let k = 1; k <= extraSignals; k++) {
        const j = free[k - 1]!;
        assigned[j] = { tick: slots[j]!, news: item.signals[k]!, kind: 'signal', storylineId: item.id };
      }
      assigned[outcomeIdx] = {
        tick: slots[outcomeIdx]!,
        news: branch.news,
        kind: 'outcome',
        storylineId: item.id,
        tone: branch.tone,
      };
      queue.splice(q, 1);
      break;
    }
  }
  return assigned.filter((a): a is ScheduledNews => a !== undefined);
}

interface QueuedImpact {
  applyTick: number;
  impacts: Map<string, number>;
}

export class NewsEngine {
  /** 이번 시대 뉴스 일정 (미리 정해짐. 화면에 미리 보여주면 안 됨) */
  readonly schedule: readonly ScheduledNews[];
  readonly mode: GameMode;
  private nextIndex = 0;
  private pending: ScheduledNews | null = null;
  private readonly queued: QueuedImpact[] = [];
  private readonly rules: TickRules;
  private readonly config: GameConfig;
  private readonly themeIds: string[];

  constructor(era: Era, rng: Rng, config: GameConfig, mode: GameMode) {
    this.config = config;
    this.mode = mode;
    this.rules = getTickRules(config);
    this.themeIds = era.themes.map((t) => t.id);
    this.schedule = buildNewsSchedule(era, rng, config, mode);
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

  /** 이 틱에 반영할 영향을 꺼낸다 (꺼내면 비워짐). 없으면 undefined */
  consumeImpactsFor(tick: number): Map<string, number> | undefined {
    let merged: Map<string, number> | undefined;
    for (let i = this.queued.length - 1; i >= 0; i--) {
      const q = this.queued[i]!;
      if (q.applyTick !== tick) continue;
      this.queued.splice(i, 1);
      merged ??= new Map();
      for (const [k, v] of q.impacts) merged.set(k, (merged.get(k) ?? 0) + v);
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
      impacts: newsToImpacts(s.news, this.themeIds, this.config.impactMax),
    });
  }
}
