// 뉴스 엔진: 언제 어떤 뉴스가 뜨는지, 팝업 상태, 영향 반영 시점을 관리한다.
//
// 흐름
//   (틱 0, 30, 60, ..., 690 시점) 뉴스 팝업 열림 → 시간 정지
//   → 유저 '확인' → 시간 재개
//   → 그다음 첫 틱에 영향도가 주가에 한 번에 반영
//
// 뉴스 순서는 시대 시작 때 시드로 섞어서 미리 정해 둔다(중복 없음).

import type { News } from '../data/schema.ts';
import type { GameConfig } from './config.ts';
import { shuffle, type Rng } from './rng.ts';

/** 이 틱(이 틱까지 끝난 직후)에 뉴스가 뜨는가. 틱 0 = 시대 시작 직후 */
export function isNewsTick(tick: number, config: GameConfig): boolean {
  return tick >= 0 && tick < config.ticksPerEra && tick % config.newsIntervalTicks === 0;
}

/** 시대 하나에 뉴스가 뜰 수 있는 자리 수. 720틱 / 30틱 = 24 */
export function newsSlotsPerEra(config: GameConfig): number {
  return Math.ceil(config.ticksPerEra / config.newsIntervalTicks);
}

/**
 * 뉴스 하나를 "테마 id → 영향도" 표로 바꾼다.
 * 같은 테마가 두 번 나오면 합산하고, ±impactMax로 자른다.
 */
export function newsToImpacts(news: News, impactMax: number): Map<string, number> {
  const map = new Map<string, number>();
  for (const e of news.effects) map.set(e.themeId, (map.get(e.themeId) ?? 0) + e.impact);
  for (const [k, v] of map) map.set(k, Math.max(-impactMax, Math.min(impactMax, v)));
  return map;
}

export class NewsEngine {
  /** 이번 시대에 뜰 뉴스 순서 (미리 정해짐) */
  readonly schedule: readonly News[];
  private shownCount = 0;
  private pending: News | null = null;
  private queued: News | null = null;
  private readonly config: GameConfig;

  constructor(pool: readonly News[], rng: Rng, config: GameConfig) {
    this.config = config;
    this.schedule = shuffle(pool, rng).slice(0, newsSlotsPerEra(config));
  }

  /**
   * 틱이 끝날 때마다(그리고 시대 시작 때 tick=0으로) 호출한다.
   * 뉴스 시점이고 남은 뉴스가 있으면 팝업을 열고 그 뉴스를 돌려준다.
   */
  checkTrigger(tick: number): News | null {
    if (this.pending) return null;
    if (!isNewsTick(tick, this.config)) return null;
    const next = this.schedule[this.shownCount];
    if (!next) return null; // 뉴스 풀이 바닥남
    this.shownCount++;
    this.pending = next;
    return next;
  }

  /** 팝업이 열려 있는가 (열려 있으면 시간이 멈춤) */
  get isPopupOpen(): boolean {
    return this.pending !== null;
  }

  get pendingNews(): News | null {
    return this.pending;
  }

  /** 유저가 '확인'을 누름. 영향은 다음 틱에 반영되도록 대기열에 넣는다 */
  confirm(): News {
    const news = this.pending;
    if (!news) throw new Error('확인할 뉴스 팝업이 없음');
    this.pending = null;
    this.queued = news;
    return news;
  }

  /** 다음 틱에 반영할 영향을 꺼낸다 (꺼내면 비워짐). 없으면 undefined */
  consumeQueuedImpacts(): Map<string, number> | undefined {
    const news = this.queued;
    if (!news) return undefined;
    this.queued = null;
    return newsToImpacts(news, this.config.impactMax);
  }

  /** 지금까지 뜬 뉴스들 (순서대로) */
  get shown(): News[] {
    return this.schedule.slice(0, this.shownCount);
  }
}
