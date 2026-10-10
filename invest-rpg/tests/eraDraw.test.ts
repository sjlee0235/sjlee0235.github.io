import { describe, expect, it } from 'vitest';
import { makeConfig } from '../src/engine/config.ts';
import { applyDraw, drawEra, effectiveNews, effectiveStory } from '../src/engine/eraDraw.ts';
import { effect, makeNews, makeSpecEra } from './fixtures/makeEra.ts';

const config = makeConfig();
const era = makeSpecEra();
const SEEDS = Array.from({ length: 1000 }, (_, i) => i + 1);

describe('시대 시작 추첨', () => {
  it('[시드 1,000개] (a) 항상 7/7/6, (b) core 11개 이상, (c) 3번 안에 성공 99% 이상', () => {
    const sentiment = new Map(era.themes.map((t) => [t.id, t.sentiment]));
    const relevance = new Map(era.themes.map((t) => [t.id, t.relevance]));
    let within3 = 0;
    for (const seed of SEEDS) {
      const d = drawEra(era, seed, config);
      const s = d.activeThemeIds.map((id) => sentiment.get(id));
      expect(d.activeThemeIds).toHaveLength(20);
      expect(s.filter((x) => x === 'positive')).toHaveLength(7);
      expect(s.filter((x) => x === 'negative')).toHaveLength(7);
      expect(s.filter((x) => x === 'neutral')).toHaveLength(6);
      expect(d.activeThemeIds.filter((id) => relevance.get(id) === 'core').length).toBeGreaterThanOrEqual(11);
      if (d.ok && d.attempt <= 2) within3++;
    }
    expect(within3 / SEEDS.length).toBeGreaterThanOrEqual(0.99);
  });

  it('(d) 같은 시드면 같은 결과, 다른 시드면 대체로 다른 결과', () => {
    expect(drawEra(era, 42, config)).toEqual(drawEra(era, 42, config));
    expect(drawEra(era, 43, config).activeThemeIds).not.toEqual(drawEra(era, 42, config).activeThemeIds);
  });

  it('통과 조건: 사용 가능한 속보 10개 이상, 스토리 8개 이상', () => {
    for (const seed of SEEDS.slice(0, 200)) {
      const d = drawEra(era, seed, config);
      if (!d.ok) continue;
      expect(d.usableBreaking).toBeGreaterThanOrEqual(10);
      expect(d.usableStories).toBeGreaterThanOrEqual(8);
      const active = applyDraw(era, d, config);
      expect(active.breaking).toHaveLength(d.usableBreaking);
      expect(active.stories).toHaveLength(d.usableStories);
      expect(active.stocks).toHaveLength(20);
    }
  });

  it('조건을 못 맞추면 가장 나은 추첨을 쓰고 경고를 남긴다', () => {
    const d = drawEra(era, 1, makeConfig({ draw: { ...config.draw, minBreaking: 99, maxAttempts: 5 } }));
    expect(d.ok).toBe(false);
    expect(d.warning).toContain('5회');
    expect(d.activeThemeIds).toHaveLength(20);
  });
});

describe('유효 영향 테마', () => {
  it('활성 아닌 테마 영향은 제거, 3개 미만이면 제외', () => {
    const news = makeNews('n', 'breaking', 5, [effect('a', 5), effect('b', 3), effect('c', 2), effect('d', 1)]);
    expect(effectiveNews(news, new Set(['a', 'b', 'c']), 3)!.effects.map((e) => e.themeId)).toEqual(['a', 'b', 'c']);
    expect(effectiveNews(news, new Set(['a', 'b']), 3)).toBeNull();
  });

  it('스토리는 잠정과 결과 2개가 모두 유효해야 사용 가능', () => {
    const story = era.stories[0]!;
    const all = new Set(era.themes.map((t) => t.id));
    expect(effectiveStory(story, all, 3)).not.toBeNull();
    const withoutLean = new Set(story.news[0]!.effects.slice(0, 2).map((e) => e.themeId));
    expect(effectiveStory(story, withoutLean, 3)).toBeNull();
  });

  it('추첨 결과를 그대로 넣으면 같은 판이 만들어진다 (세이브/로드)', () => {
    const d = drawEra(era, 7, config);
    const saved = JSON.parse(JSON.stringify(d));
    expect(applyDraw(era, saved, config)).toEqual(applyDraw(era, d, config));
  });
});
