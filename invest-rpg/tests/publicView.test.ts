import { describe, expect, it } from 'vitest';
import { Game } from '../src/engine/game.ts';
import { PublicGame, restorePublicGame, savePublicGame } from '../src/engine/publicView.ts';
import { createSaveData } from '../src/engine/save.ts';
import { TutorialSession } from '../src/engine/tutorial.ts';
import { makeSpecEra } from './fixtures/makeEra.ts';

/** 플레이 중 화면에 절대 나가면 안 되는 필드 이름 */
const FORBIDDEN = ['effects', 'impact', 'magnitude', 'link', 'sentiment', 'relevance', 'leansTo', 'outcomes', 'weight', 'isHistorical', 'themeId'];

function keysOf(value: unknown, out = new Set<string>()): Set<string> {
  if (Array.isArray(value)) for (const v of value) keysOf(v, out);
  else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      out.add(k);
      keysOf(v, out);
    }
  }
  return out;
}

/** 직렬화해서 금지 필드 이름과 내부 id(테마 id, 종목 내부 id, 뉴스 내부 id)가 없는지 */
function expectClean(value: unknown, internalIds: string[]) {
  const json = JSON.stringify(value);
  const keys = keysOf(JSON.parse(json));
  for (const f of FORBIDDEN) expect(keys.has(f), `금지 필드 ${f}`).toBe(false);
  for (const id of internalIds) expect(json.includes(`"${id}"`), `내부 id ${id}`).toBe(false);
}

const era = makeSpecEra({ id: 'pv' });
const internalIds = [
  ...era.themes.map((t) => t.id),
  ...era.stocks.map((s) => s.id),
  ...era.breaking.map((n) => n.id),
  ...era.stories.flatMap((s) => [s.id, s.tentative.id, ...s.news.map((n) => n.id)]),
];

/** 뉴스마다 아무 종목이나 사고파는 플레이 (화면 흉내) */
function playPublic(seed: number, onEach?: (value: unknown) => void) {
  const g = PublicGame.create({ eras: [era], seed });
  const seen: unknown[] = [g.getStockList(), g.getPortfolio()];
  while (g.phase === 'running') {
    const r = g.advanceTick();
    seen.push(r);
    if (!r.advanced) continue;
    if (r.news) {
      const list = g.getStockList();
      seen.push(g.buy(list[r.tick % list.length]!.id, 1));
      seen.push(g.getPortfolio(), g.getNewsArchive(), list, g.getChart(list[0]!.id));
    }
    if (r.tick % 400 === 0) seen.push(g.deposit(100, 'work'));
  }
  for (const v of seen) onEach?.(v);
  return g;
}

describe('공개용 뷰: 플레이 중 숨김', () => {
  it('[시드 5개] 진행 내내 화면에 나가는 데이터를 직렬화해도 금지 필드·내부 id가 하나도 없다', () => {
    for (let seed = 1; seed <= 5; seed++) {
      const all: unknown[] = [];
      playPublic(seed, (v) => all.push(v));
      expectClean(all, internalIds);
    }
  }, 60_000);

  it('뉴스 뷰는 id·종류·제목·본문·발표 시각만, 결과 뉴스만 가상 시나리오 태그와 관련 잠정 뉴스 id', () => {
    const g = playPublic(2);
    let sawOutcome = false;
    for (const { news } of g.getNewsArchive()) {
      const allowed = ['id', 'kind', 'title', 'body', 'publishedTick', 'elapsedSeconds', ...(news.kind === 'outcome' ? ['fictional', 'relatedTentativeId'] : [])];
      expect(Object.keys(news).sort()).toEqual(allowed.sort());
      expect(news.id).toMatch(/^n[0-9a-z]+$/);
      if (news.kind === 'outcome') sawOutcome = true;
    }
    expect(sawOutcome).toBe(true);
  });

  it('종목 뷰에는 테마 id·분위기·비중이 없다', () => {
    const g = PublicGame.create({ eras: [era], seed: 3 });
    for (const s of g.getStockList()) {
      expect(Object.keys(s).sort()).toEqual(
        ['id', 'name', 'description', 'price', 'openPrice', 'changePct', 'lastTickPct', 'color', 'isFavorite', 'quantity'].sort(),
      );
    }
  });

  it('주가 리포트는 방향과 % (발표 즉시 / 5초 뒤 / 합계)를 담는다', () => {
    const g = playPublic(4);
    const reports = g.getNewsArchive().flatMap((a) => (a.report ? [a.report] : []));
    expect(reports.length).toBeGreaterThan(0);
    for (const r of reports) {
      for (const it of r.items) expect(it.appliedPct).toBeCloseTo(it.instantPct + it.delayedPct, 9);
      expectClean(r, internalIds);
    }
  });

  it('튜토리얼 화면도 공개용 뷰로 본다', () => {
    const tut = new TutorialSession();
    while (tut.stage === 'waiting') tut.advanceTick();
    expectClean(tut.view.pendingNews, ['battery', 'bus', 'oil', 'tut-battery', 'tut-news-ebus']);
    expectClean(tut.view.getStockList(), ['battery', 'bus', 'oil', 'tut-battery']);
  });
});

describe('공개용 뷰: 순서·id로 정답을 짐작할 수 없다', () => {
  const code = { positive: 1, neutral: 0, negative: -1 } as const;
  /** 순위 상관계수 (스피어만 근사: 순위끼리 피어슨) */
  function corr(xs: number[], ys: number[]) {
    const n = xs.length;
    const mx = xs.reduce((a, b) => a + b, 0) / n;
    const my = ys.reduce((a, b) => a + b, 0) / n;
    let sxy = 0, sxx = 0, syy = 0;
    for (let i = 0; i < n; i++) {
      sxy += (xs[i]! - mx) * (ys[i]! - my);
      sxx += (xs[i]! - mx) ** 2;
      syy += (ys[i]! - my) ** 2;
    }
    return sxx === 0 || syy === 0 ? 0 : sxy / Math.sqrt(sxx * syy);
  }

  it('[시드 1,000개] 종목 목록 순서(가나다)와 분위기·비중 사이에 상관이 없다', () => {
    const sentiment: number[] = [];
    const relevance: number[] = [];
    let sumSent = 0;
    let sumRel = 0;
    for (let seed = 1; seed <= 1000; seed++) {
      const e = makeSpecEra({ id: 'ord', seed });
      const g = PublicGame.create({ eras: [e], seed });
      const list = g.getStockList();
      // 가나다순인지
      const names = list.map((s) => s.name.ko);
      expect([...names].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))).toEqual(names);
      // 공개 id → 내부 테마 (테스트만 아는 정답)
      const engine = new Game({ eras: [e], seed });
      const byName = new Map(engine.activeStocks.map((s) => [s.name.ko, e.themes.find((t) => t.id === s.themeId)!]));
      const pos = list.map((_, i) => i);
      const sent = list.map((s) => code[byName.get(s.name.ko)!.sentiment]);
      const rel = list.map((s) => (byName.get(s.name.ko)!.relevance === 'core' ? 1 : 0));
      sumSent += corr(pos, sent);
      sumRel += corr(pos, rel);
      sentiment.push(...sent);
      relevance.push(...rel);
    }
    expect(Math.abs(sumSent / 1000)).toBeLessThan(0.03);
    expect(Math.abs(sumRel / 1000)).toBeLessThan(0.03);
  });

  it('[시드 1,000개] 종목 id로 분위기를 짐작할 수 없다 (id 순서·글자와 분위기 무상관, 판마다 id가 바뀜)', () => {
    let sum = 0;
    const firstCharHits = new Map<string, number[]>();
    for (let seed = 1; seed <= 1000; seed++) {
      const g = PublicGame.create({ eras: [era], seed });
      const engine = new Game({ eras: [era], seed });
      const themeByName = new Map(engine.activeStocks.map((s) => [s.name.ko, era.themes.find((t) => t.id === s.themeId)!]));
      const list = g.getStockList();
      const byId = [...list].sort((a, b) => (a.id < b.id ? -1 : 1));
      sum += corr(byId.map((_, i) => i), byId.map((s) => code[themeByName.get(s.name.ko)!.sentiment]));
      for (const s of list) {
        expect(s.id).toMatch(/^s[0-9a-z]{7,}$/);
        const c = s.id[1]!;
        firstCharHits.set(c, [...(firstCharHits.get(c) ?? []), code[themeByName.get(s.name.ko)!.sentiment]]);
      }
    }
    expect(Math.abs(sum / 1000)).toBeLessThan(0.03);
    // id 첫 글자별 평균 분위기가 전체 평균과 비슷하다 (표본이 충분한 글자만)
    const all = [...firstCharHits.values()].flat();
    const mean = all.reduce((a, b) => a + b, 0) / all.length;
    for (const v of firstCharHits.values()) {
      if (v.length < 500) continue;
      expect(Math.abs(v.reduce((a, b) => a + b, 0) / v.length - mean)).toBeLessThan(0.12);
    }
    // 같은 종목이라도 판(시드)이 다르면 id가 다르다
    const a = PublicGame.create({ eras: [era], seed: 1 }).getStockList();
    const b = PublicGame.create({ eras: [era], seed: 2 }).getStockList();
    const sameName = a.find((x) => b.some((y) => y.name.ko === x.name.ko))!;
    expect(b.find((y) => y.name.ko === sameName.name.ko)!.id).not.toBe(sameName.id);
  });
});

describe('시대 종료 후 공개 (getEraDebrief)', () => {
  it('진행 중에는 오류로 막는다', () => {
    const g = PublicGame.create({ eras: [era], seed: 6 });
    expect(() => g.getEraDebrief()).toThrow();
    for (let i = 0; i < 700; i++) g.advanceTick();
    expect(() => g.getEraDebrief()).toThrow();
    g.suspend();
    expect(() => g.getEraDebrief()).toThrow();
  });

  it('끝나면 분위기·비중, 스토리 단서 방향과 실제 결과, 실제 역사 여부, 해설 전체를 준다', () => {
    const g = playPublic(7);
    const d = g.getEraDebrief();
    expect(d.themes).toHaveLength(20);
    for (const t of d.themes) {
      expect(['positive', 'negative', 'neutral']).toContain(t.sentiment);
      expect(['core', 'peripheral']).toContain(t.relevance);
    }
    expect(d.stories.length).toBeGreaterThan(0);
    for (const s of d.stories) expect(typeof s.followedLean).toBe('boolean');
    expect(d.news).toHaveLength(g.getNewsArchive().length);
    // 해설 전체: 상위 3개 제한 없이 영향받은 활성 종목 모두
    expect(d.news.some((n) => n.report.items.length > 3)).toBe(true);
    for (const n of d.news) expect(n.report.moreCount).toBe(0);
    // 사후 공개라 분위기·방향은 보여주지만, 내부 id는 쓰지 않는다
    const json = JSON.stringify(d);
    for (const id of internalIds) expect(json.includes(`"${id}"`), `내부 id ${id}`).toBe(false);
  });
});

describe('공개용 뷰 세이브', () => {
  it('저장 → 불러오기 하면 같은 공개 id·같은 목록으로 이어진다', () => {
    const g = PublicGame.create({ eras: [era], seed: 9 });
    for (let i = 0; i < 300; i++) g.advanceTick();
    const first = g.getStockList()[0]!;
    g.buy(first.id, 2);
    const r = restorePublicGame(JSON.parse(JSON.stringify(savePublicGame(createSaveData(), g))), [era])!;
    expect(r.status).toBe('resumed');
    expect(r.game!.getStockList()).toEqual(g.getStockList());
    expect(r.game!.getPortfolio()).toEqual(g.getPortfolio());
  });
});
