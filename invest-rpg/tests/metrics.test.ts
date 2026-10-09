import { describe, expect, it } from 'vitest';
import { classify, eraMetrics, groupByGame, newsMetrics, type TelemetryRecord } from '../src/analytics/metrics.ts';
import { TelemetryBuffer, toJsonLines } from '../src/engine/telemetry.ts';
import { play, type Strategy } from '../scripts/simLib.ts';
import { makeSpecEra } from './fixtures/makeEra.ts';

const era = makeSpecEra({ id: 'm' });

function logOf(strategy: Strategy, seed: number): TelemetryRecord[] {
  const buf = new TelemetryBuffer(100_000);
  play(era, strategy, seed, {}, buf);
  return buf.drain().map((e) => ({ ...e, gid: `${strategy}-${seed}`, pid: 'p1' }));
}

describe('플레이 기록 분석 (지표·유형 분류)', () => {
  it('봇의 행동 유형을 기록만 보고 맞힌다', () => {
    const expected: Array<[Strategy, string]> = [
      ['hold', 'holder'],
      ['fastFollow', 'newsSniper'],
      ['delayedFollow', 'newsFollower'],
      ['leanForward', 'storyReader'],
      ['leanReverse', 'storyContrarian'],
    ];
    for (const [strategy, archetype] of expected) {
      for (const seed of [1, 2, 3]) expect(eraMetrics(logOf(strategy, seed))[0]!.archetype).toBe(archetype);
    }
  });

  it('지표 값: 초고속 추종은 반응 0틱·즉시 매수 100%, 보유 전략은 반응률 0%', () => {
    const fast = eraMetrics(logOf('fastFollow', 4))[0]!;
    expect(fast.medianReactionTicks).toBe(0);
    expect(fast.instantBuyShare).toBe(1);
    expect(fast.completed).toBe(true);
    const hold = eraMetrics(logOf('hold', 4))[0]!;
    expect(hold.followRate).toBe(0);
    expect(hold.investedShare).toBe(1);
  });

  it('중간에 그만둔 판: completed=false, 마지막 틱이 이탈 지점', () => {
    const cut = logOf('random', 5).filter((e) => e.tick <= 300);
    const m = eraMetrics(cut)[0]!;
    expect(m.completed).toBe(false);
    expect(m.lastTick).toBeLessThanOrEqual(300);
    expect(m.returnPct).toBeNull();
  });

  it('여러 게임이 섞인 기록을 gid로 나누고, 뉴스별 지표를 만든다', () => {
    const mixed = [...logOf('fastFollow', 6), ...logOf('hold', 6)].sort(() => 0);
    const games = groupByGame(JSON.parse(`[${toJsonLines(mixed).split('\n').join(',')}]`));
    expect(games.size).toBe(2);
    const nm = newsMetrics(games.values());
    expect(nm.length).toBeGreaterThan(0);
    for (const n of nm) expect(n.reactRate).toBeLessThanOrEqual(1);
  });

  it('매매가 거의 없으면 idle', () => {
    expect(classify({ ...eraMetrics(logOf('hold', 7))[0]!, trades: 1 })).toBe('idle');
  });
});
