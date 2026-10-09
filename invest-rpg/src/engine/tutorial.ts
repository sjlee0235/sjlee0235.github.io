// 튜토리얼: 게임 첫 진입 때 한 번만. 시나리오 하나 — 뉴스 1개 → 매수 → 반영 확인 → 해설 알림.
// - 고정 시드, 고정 종목 5개, 스크립트로 정해진 뉴스 1개 (가상 시나리오)
// - 뉴스가 뜨면 시간이 멈춘다 (pauseOnNews). 본게임은 멈추지 않는다
// - 튜토리얼 전용 지갑 (본게임에 이월되지 않음)
// 안내 문구는 i18n의 tutorial.* 키에 있다.

import type { Era } from '../data/schema.ts';
import tutorialEra from '../data/tutorial.json' with { type: 'json' };
import type { GameConfig } from './config.ts';
import type { EraDraw } from './eraDraw.ts';
import { Game } from './game.ts';
import type { RecapNotice } from './recap.ts';

export const TUTORIAL_SEED = 20_000_101;
export const TUTORIAL_ERA = tutorialEra as Era;
/** 튜토리얼 뉴스가 뜨는 틱 (30초) */
export const TUTORIAL_NEWS_TICK = 6;

/**
 * 튜토리얼 단계
 * - waiting : 뉴스를 기다리는 중
 * - reading : 뉴스 팝업 (시간 정지). 이때 매수해 본다
 * - reaction: '확인' 후 반영·관성을 지켜보는 중
 * - recap   : 해설 알림이 나옴
 * - done    : 끝 (finish() 호출 후)
 */
export type TutorialStage = 'waiting' | 'reading' | 'reaction' | 'recap' | 'done';

export class TutorialSession {
  readonly game: Game;
  recap: RecapNotice | null = null;
  private finished = false;

  constructor(config: Partial<GameConfig> = {}) {
    const draw: EraDraw = {
      eraId: TUTORIAL_ERA.id,
      seed: TUTORIAL_SEED,
      attempt: 0,
      activeThemeIds: TUTORIAL_ERA.themes.map((t) => t.id),
      usableBreaking: 1,
      usableStories: 0,
      ok: true,
    };
    this.game = new Game({
      eras: [TUTORIAL_ERA],
      seed: TUTORIAL_SEED,
      // 짧은 판: 5분 (뉴스 30초 + 해설 120초가 들어가도록)
      config: { eraSeconds: 300, ...config },
      draws: { [TUTORIAL_ERA.id]: draw },
      pauseOnNews: true,
      fixedSchedule: (active) => [
        { tick: TUTORIAL_NEWS_TICK, news: active.breaking[0]!, kind: 'breaking', tag: 'breaking', isHistorical: false },
      ],
    });
  }

  get stage(): TutorialStage {
    if (this.finished) return 'done';
    if (this.recap) return 'recap';
    if (this.game.phase === 'news') return 'reading';
    if (this.game.shownNews.length > 0) return 'reaction';
    return 'waiting';
  }

  /** 한 틱 진행 (뉴스 팝업 중에는 멈춰 있음) */
  advanceTick() {
    const r = this.game.advanceTick();
    if (r.advanced && r.recaps.length > 0) this.recap = r.recaps[0]!;
    return r;
  }

  confirmNews() {
    return this.game.confirmNews();
  }

  /** 튜토리얼 끝. 세이브의 tutorialCompleted는 save.ts의 markTutorialCompleted로 따로 기록 */
  finish(): void {
    this.finished = true;
  }
}
