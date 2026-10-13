// 뉴스 엔진: 언제 어떤 뉴스가 뜨는지, 반영 시점과 크기를 관리한다.
//
// 일정 만들기 (판 시작 때 시드로 한 번에 정함)
//   1) 뉴스 자리(슬롯): 시대 시작 3분은 뉴스 없음(유예). 첫 뉴스는 정확히 3분, 그 뒤로는 3~4분 간격 (무작위)
//   1-1) 첫 슬롯은 항상 잠정 뉴스: 사용 가능한 opener 스토리 중 시드 기반 무작위로 고른다 (P_START_STORY 무시)
//   2) 그 밖의 빈 슬롯마다: 진행 중인 스토리가 없으면 P_START_STORY(85%) 확률로 새 스토리(잠정 뉴스)를 시작,
//      아니면 속보를 넣는다. → 슬롯 기준 속보 약 1/3, 잠정 약 1/3, 결과 약 1/3
//   3) 스토리: 잠정 뉴스 이후 15분 안에 오는 빈 슬롯 중 하나에 결과 뉴스를 넣는다 (간격 규칙 그대로).
//      결과는 서로 반대인 2개 중 추첨: leansTo(잠정 뉴스의 단서가 가리키는 쪽) 70%, 다른 쪽 30%.
//      동시에 진행되는 스토리는 1개, 시대 종료 15분 전부터는 새 잠정 뉴스를 시작하지 않는다.
//   4) 같은 뉴스는 다시 나오지 않고, 풀이 바닥나면 더 내보내지 않는다.
//
// 반영
//   실제 변동률 = 영향도 × 3% × 배율. 이를 몫대로 나눠 반영한다 (테마마다 오르는지 내리는지로 고름)
//   - 오르는 영향(reactionShares): 발표 순간 바로(갭) 75%, 1틱(3초) 뒤 틱 k+1에 25%
//   - 내리는 영향(reactionSharesDown): 발표 순간 25%, 틱 k+1에 60%, 틱 k+2에 15%
//   → 악재가 뜨자마자 팔면 손실의 75%를 피할 수 있다 (10차 결정. 이전에는 둘 다 즉시 75% + 5초 뒤 25%)
//   배율: 강도 3은 0.6~1.4, 강도 2·1은 0.4~1.6 (영향마다 따로 뽑음), 결과는 ±30%로 자름
//   (기본 OFF) 간접 영향(강도 2·1)을 N틱 더 늦게 반영하는 옵션

import type { News, Story } from '../data/schema.ts';
import { getTickRules, type GameConfig, type Range, type TickRules } from './config.ts';
import type { ActiveEra } from './eraDraw.ts';
import { shuffle, type Rng } from './rng.ts';

export type ScheduledKind = 'breaking' | 'tentative' | 'clue' | 'outcome';
/** 보관함 태그 */
export type NewsTag = 'breaking' | 'tentative' | 'outcome';

export interface ScheduledNews {
  /** 이 틱이 끝난 직후에 뉴스가 뜬다 */
  tick: number;
  /** 이번 판 활성 테마 영향만 남은 뉴스 */
  news: News;
  kind: ScheduledKind;
  tag: NewsTag;
  /** false면 실제와 다른 가상 시나리오 */
  isHistorical: boolean;
  storyId?: string;
  /** 결과·단서 뉴스: 연결된 잠정 뉴스 id */
  relatedTentativeId?: string;
  /** 결과 뉴스: 잠정 뉴스의 단서(leansTo)대로 나왔는가 */
  followedLean?: boolean;
}

export function tagOf(kind: ScheduledKind): NewsTag {
  return kind === 'breaking' ? 'breaking' : kind === 'outcome' ? 'outcome' : 'tentative';
}

/** 시대 안에서 뉴스가 뜰 수 있는 슬롯(틱)들 */
export function makeNewsSlots(rules: TickRules, rng: Rng, extraDelay = 0): number[] {
  // 마지막 뉴스도 반영과 관성이 시대 안에서 끝나도록 한다
  const last = rules.ticksPerEra - rules.reactionTicks - (rules.reactionStages - 1) - extraDelay - rules.inertiaTicks;
  const slots: number[] = [];
  let t = rules.firstNewsTick;
  while (t <= last) {
    slots.push(t);
    t += rng.int(rules.newsGapMinTicks, rules.newsGapMaxTicks);
  }
  return slots;
}

/** 결과 2개의 확률. weight가 없으면 leansTo 쪽이 leansToChance, 다른 쪽이 나머지 */
export function outcomeWeights(story: Story, leansToChance: number): number[] {
  return story.outcomes.map((o) => {
    if (o.weight !== undefined) return o.weight;
    return o.newsId === story.leansTo ? leansToChance : 1 - leansToChance;
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

/** 이번 판 뉴스 일정표 (같은 시드 → 같은 일정) */
export function buildNewsSchedule(active: ActiveEra, rng: Rng, config: GameConfig): ScheduledNews[] {
  const rules = getTickRules(config);
  const slots = makeNewsSlots(rules, rng, config.indirectExtraDelayTicks);
  const breakingQ = shuffle(active.breaking, rng);
  const storyQ = shuffle(active.stories, rng);
  const assigned: (ScheduledNews | undefined)[] = slots.map(() => undefined);
  const lastTentativeTick = rules.ticksPerEra - rules.noNewTentativeLastTicks;
  /** 진행 중 스토리의 결과 슬롯 번호 (여기까지는 새 잠정 뉴스 금지) */
  let busyUntil = -1;

  const freeAfter = (i: number) => {
    const out: number[] = [];
    for (let j = i + 1; j < slots.length && slots[j]! - slots[i]! <= rules.storyOutcomeWithinTicks; j++) {
      if (!assigned[j]) out.push(j);
    }
    return out;
  };

  const placeStory = (i: number, free: number[], story: Story) => {
    const outcome = story.outcomes[pickWeighted(outcomeWeights(story, config.leansToChance), rng)]!;
    const outcomeSlot = free[rng.int(0, free.length - 1)]!;
    const byId = new Map(story.news.map((n) => [n.id, n]));
    const tentativeId = story.tentative.id;
    assigned[i] = {
      tick: slots[i]!, news: story.tentative, kind: 'tentative', tag: 'tentative',
      isHistorical: true, storyId: story.id,
    };
    const clue = (story.clues ?? []).find((c) => c.pointsTo === outcome.newsId);
    const between = free.filter((j) => j < outcomeSlot);
    if (clue && between.length > 0) {
      const j = between[rng.int(0, between.length - 1)]!;
      assigned[j] = {
        tick: slots[j]!, news: byId.get(clue.newsId)!, kind: 'clue', tag: 'tentative',
        isHistorical: outcome.isHistorical, storyId: story.id, relatedTentativeId: tentativeId,
      };
    }
    assigned[outcomeSlot] = {
      tick: slots[outcomeSlot]!, news: byId.get(outcome.newsId)!, kind: 'outcome', tag: 'outcome',
      isHistorical: outcome.isHistorical, storyId: story.id, relatedTentativeId: tentativeId,
      followedLean: outcome.newsId === story.leansTo,
    };
    busyUntil = outcomeSlot;
  };

  // 첫 슬롯: opener 스토리의 잠정 뉴스로 강제 (opener가 없으면 아무 스토리, 그것도 없으면 아래 일반 규칙)
  if (config.firstNewsType === 'tentative' && slots.length > 0) {
    const free = freeAfter(0);
    const openers = storyQ.filter((s) => s.opener);
    const pool = openers.length > 0 ? openers : storyQ;
    if (pool.length > 0 && free.length > 0) {
      const story = pool[rng.int(0, pool.length - 1)]!;
      storyQ.splice(storyQ.indexOf(story), 1);
      placeStory(0, free, story);
    }
  }

  for (let i = 0; i < slots.length; i++) {
    if (assigned[i]) continue;
    const roll = rng.next(); // 슬롯마다 항상 1개 뽑아 순서를 안정적으로
    const canStory = i > busyUntil && slots[i]! <= lastTentativeTick && storyQ.length > 0;
    const free = canStory ? freeAfter(i) : [];
    const wantStory = canStory && free.length > 0 && (roll < config.pStartStory || breakingQ.length === 0);
    if (wantStory) {
      placeStory(i, free, storyQ.shift()!);
    } else if (breakingQ.length > 0) {
      assigned[i] = { tick: slots[i]!, news: breakingQ.shift()!, kind: 'breaking', tag: 'breaking', isHistorical: true };
    }
  }
  return assigned.filter((a): a is ScheduledNews => a !== undefined);
}

function multiplierRange(config: GameConfig, strength: number): Range {
  return strength === 3 ? config.impactMultiplier.strong : config.impactMultiplier.weak;
}

export interface NewsRates {
  /** 강도 3 (직접) 영향: 테마 id → 0.1% 단위 변동률 */
  strong: Map<string, number>;
  /** 강도 2·1 (간접) 영향 */
  weak: Map<string, number>;
}

/** 뉴스 하나의 실제 변동률: 영향도 × 3% × 배율(영향마다 무작위), ±30%로 자름 */
export function newsToRates(news: News, config: GameConfig, rng: Rng): NewsRates {
  const cap = config.impactMax * config.impactUnitRate;
  const out: NewsRates = { strong: new Map(), weak: new Map() };
  for (const e of news.effects) {
    const [lo, hi] = multiplierRange(config, e.link.strength);
    const mult = lo + rng.next() * (hi - lo);
    const rate = Math.max(-cap, Math.min(cap, Math.round(e.impact * config.impactUnitRate * mult)));
    if (rate !== 0) (e.link.strength === 3 ? out.strong : out.weak).set(e.themeId, rate);
  }
  return out;
}

export interface DueRates {
  newsId: string;
  rates: Map<string, number>;
  /** 몇 번째 몫인가 (0 = 발표 즉시, 1 = 1틱 뒤, 2 = 2틱 뒤 …) */
  stage: number;
}

/**
 * 변동률을 몫(shares)대로 나눈다 (0.1% 단위 정수). [0] = 발표 즉시, [1..] = 그 뒤 틱마다.
 * 누적 몫을 정수로 잘라 차이를 각 단계에 주므로 단계 합은 원래 변동률과 같다.
 * 발표 뒤 몫이 모두 0이 되면 관성이 생기지 않으므로 첫 뒤 단계에 최소 ±0.1%는 남긴다.
 */
export function splitRates(
  rates: ReadonlyMap<string, number>, sharesUp: readonly number[], sharesDown: readonly number[] = sharesUp,
): Map<string, number>[] {
  const out = Array.from({ length: Math.max(sharesUp.length, sharesDown.length) }, () => new Map<string, number>());
  for (const [themeId, rate] of rates) {
    const shares = rate < 0 ? sharesDown : sharesUp;
    const parts: number[] = [];
    let cum = 0;
    let prev = 0;
    for (let i = 0; i < shares.length; i++) {
      cum += shares[i]!;
      const upTo = i === shares.length - 1 ? rate : Math.trunc(rate * cum + 1e-9 * Math.sign(rate));
      parts.push(upTo - prev);
      prev = upTo;
    }
    if (parts.slice(1).every((x) => x === 0)) {
      parts[0]! -= Math.sign(rate);
      parts[1]! += Math.sign(rate);
    }
    parts.forEach((x, i) => {
      if (x !== 0) out[i]!.set(themeId, x);
    });
  }
  return out;
}

export class NewsEngine {
  /** 이번 판 뉴스 일정 (미리 정해짐. 화면에 미리 보여주면 안 됨) */
  readonly schedule: readonly ScheduledNews[];
  private nextIndex = 0;
  private pending: ScheduledNews | null = null;
  /** (튜토리얼) 팝업 확인 뒤 예약할 발표 뒤 몫들 */
  private pendingLater: NewsRates[] | null = null;
  /** 방금 발표된 뉴스의 즉시 반영 몫 (Game이 바로 꺼내 간다) */
  private instant: DueRates | null = null;
  private readonly queued: Array<{ applyTick: number; stage: number } & DueRates> = [];
  private readonly rules: TickRules;
  private readonly config: GameConfig;
  private readonly impactRng: Rng;
  private readonly pauseOnNews: boolean;

  constructor(
    active: ActiveEra,
    scheduleRng: Rng,
    impactRng: Rng,
    config: GameConfig,
    options: { pauseOnNews?: boolean; fixedSchedule?: ScheduledNews[] } = {},
  ) {
    this.config = config;
    this.rules = getTickRules(config);
    this.impactRng = impactRng;
    this.pauseOnNews = options.pauseOnNews ?? false;
    this.schedule = options.fixedSchedule ?? buildNewsSchedule(active, scheduleRng, config);
  }

  /** 틱이 끝날 때마다 호출. 이 틱이 뉴스 슬롯이면 그 뉴스를 돌려준다 */
  checkTrigger(tick: number): ScheduledNews | null {
    if (this.pending) return null;
    const next = this.schedule[this.nextIndex];
    if (!next || next.tick !== tick) return null;
    this.nextIndex++;
    const { strong, weak } = newsToRates(next.news, this.config, this.impactRng);
    const up = this.config.reactionShares;
    const down = this.config.reactionSharesDown ?? up;
    const s = splitRates(strong, up, down);
    const w = splitRates(weak, up, down);
    const instant = new Map([...s[0]!, ...w[0]!]);
    this.instant = instant.size > 0 ? { newsId: next.news.id, rates: instant, stage: 0 } : null;
    const later: NewsRates[] = s.slice(1).map((m, i) => ({ strong: m, weak: w[i + 1]! }));
    if (this.pauseOnNews) {
      this.pending = next;
      this.pendingLater = later;
    } else {
      this.enqueue(next, later, tick);
    }
    return next;
  }

  /** 방금 발표된 뉴스의 즉시 반영 몫 (꺼내면 비워짐) */
  consumeInstant(): DueRates | null {
    const d = this.instant;
    this.instant = null;
    return d;
  }

  /** (튜토리얼) 뉴스 팝업이 열려 시간이 멈춘 상태인가 */
  get isPopupOpen(): boolean {
    return this.pending !== null;
  }

  get pendingNews(): ScheduledNews | null {
    return this.pending;
  }

  /** (튜토리얼) 팝업 '확인'. 그 틱 기준으로 반영을 예약한다 */
  confirm(currentTick: number): ScheduledNews {
    const s = this.pending;
    if (!s) throw new Error('확인할 뉴스 팝업이 없음');
    this.pending = null;
    this.enqueue(s, this.pendingLater!, currentTick);
    this.pendingLater = null;
    return s;
  }

  /** 이 틱에 반영할 변동률들 (꺼내면 비워짐) */
  consumeRatesFor(tick: number): DueRates[] {
    const due = this.queued.filter((q) => q.applyTick === tick);
    for (const d of due) this.queued.splice(this.queued.indexOf(d), 1);
    return due.map(({ newsId, rates, stage }) => ({ newsId, rates, stage }));
  }

  /** 지금까지 뜬 뉴스들 (순서대로) */
  get shown(): ScheduledNews[] {
    return this.schedule.slice(0, this.nextIndex);
  }

  private enqueue(s: ScheduledNews, stages: readonly NewsRates[], fromTick: number): void {
    const extra = this.config.indirectExtraDelayTicks;
    stages.forEach(({ strong, weak }, i) => {
      const base = fromTick + this.rules.reactionTicks + i;
      const stage = i + 1;
      const push = (applyTick: number, rates: Map<string, number>) => {
        if (rates.size > 0) this.queued.push({ applyTick, stage, newsId: s.news.id, rates });
      };
      if (extra > 0) {
        push(base, strong);
        push(base + extra, weak);
      } else {
        push(base, new Map([...strong, ...weak]));
      }
    });
  }
}
