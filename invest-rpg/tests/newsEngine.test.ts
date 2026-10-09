import { describe, expect, it } from 'vitest';
import { makeConfig } from '../src/engine/config.ts';
import { NewsEngine, isNewsTick, newsSlotsPerEra, newsToImpacts } from '../src/engine/newsEngine.ts';
import { createRng } from '../src/engine/rng.ts';
import { makeEra } from './fixtures/makeEra.ts';

const config = makeConfig();

/** 시대 전체를 돌리며 뉴스가 뜬 틱과 뉴스 id를 기록 (팝업은 즉시 확인) */
function runEra(seed: number, newsCount = 40) {
  const era = makeEra({ newsCount });
  const engine = new NewsEngine(era.newsPool, createRng(seed), config);
  const triggered: { tick: number; id: string }[] = [];
  for (let tick = 0; tick <= config.ticksPerEra; tick++) {
    const news = engine.checkTrigger(tick);
    if (news) {
      triggered.push({ tick, id: news.id });
      engine.confirm();
      engine.consumeQueuedImpacts();
    }
  }
  return { engine, triggered };
}

describe('뉴스 엔진', () => {
  it('뉴스 시점은 0, 30, ..., 690틱 (시대당 24자리)', () => {
    expect(newsSlotsPerEra(config)).toBe(24);
    const ticks = Array.from({ length: 721 }, (_, t) => t).filter((t) => isNewsTick(t, config));
    expect(ticks).toEqual(Array.from({ length: 24 }, (_, i) => i * 30));
  });

  it('5분(30틱)마다 뉴스가 나오고, 시대당 중복 없이 24개', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const { triggered } = runEra(seed);
      expect(triggered).toHaveLength(24);
      expect(triggered.map((t) => t.tick)).toEqual(Array.from({ length: 24 }, (_, i) => i * 30));
      expect(new Set(triggered.map((t) => t.id)).size).toBe(24);
    }
  });

  it('같은 시드면 같은 뉴스 순서, 다른 시드면 다른 순서', () => {
    expect(runEra(10).triggered).toEqual(runEra(10).triggered);
    expect(runEra(10).triggered).not.toEqual(runEra(11).triggered);
  });

  it('풀이 24개보다 적으면 풀을 다 쓴 뒤로는 뉴스가 안 뜬다', () => {
    const { triggered } = runEra(1, 10);
    expect(triggered).toHaveLength(10);
    expect(triggered.at(-1)!.tick).toBe(270);
  });

  it('팝업이 열려 있으면 다음 뉴스가 겹쳐 뜨지 않는다', () => {
    const era = makeEra();
    const engine = new NewsEngine(era.newsPool, createRng(1), config);
    expect(engine.checkTrigger(0)).not.toBeNull();
    expect(engine.isPopupOpen).toBe(true);
    expect(engine.checkTrigger(30)).toBeNull();
  });

  it('확인 전에는 영향이 대기열에 없고, 확인 후 한 번만 꺼낼 수 있다', () => {
    const era = makeEra();
    const engine = new NewsEngine(era.newsPool, createRng(1), config);
    const news = engine.checkTrigger(0)!;
    expect(engine.consumeQueuedImpacts()).toBeUndefined();
    expect(engine.confirm()).toBe(news);
    expect(engine.isPopupOpen).toBe(false);
    const impacts = engine.consumeQueuedImpacts();
    expect(impacts).toEqual(newsToImpacts(news, 10));
    expect(engine.consumeQueuedImpacts()).toBeUndefined();
  });

  it('팝업이 없는데 확인하면 오류', () => {
    const engine = new NewsEngine(makeEra().newsPool, createRng(1), config);
    expect(() => engine.confirm()).toThrow();
  });

  it('같은 테마 영향은 합산 후 ±10으로 자른다', () => {
    const news = makeEra({
      effectsFor: () => [
        { themeId: 't0', impact: 7 },
        { themeId: 't0', impact: 6 },
        { themeId: 't1', impact: -3 },
      ],
    }).newsPool[0]!;
    expect(newsToImpacts(news, 10)).toEqual(new Map([['t0', 10], ['t1', -3]]));
  });
});
