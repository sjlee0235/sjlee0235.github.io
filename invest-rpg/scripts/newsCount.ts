// 시대당 뉴스 개수 점검: node scripts/newsCount.ts [시드 수]
// 뉴스 간격 규칙으로 생기는 빈자리 수 대비 실제로 나온 뉴스 수(풀이 모자라면 빈자리가 남는다)

import { ALL_ERAS } from '../src/data/eras/index.ts';
import { Game } from '../src/engine/game.ts';

declare const process: { argv: string[] };
const SEEDS = Number(process.argv[2] ?? 100);

for (const era of ALL_ERAS) {
  const counts: number[] = [];
  let breaking = 0;
  let total = 0;
  for (let seed = 1; seed <= SEEDS; seed++) {
    const g = new Game({ eras: [era], seed });
    while (g.phase === 'running') g.advanceTick();
    const shown = g.shownNews;
    counts.push(shown.length);
    total += shown.length;
    breaking += shown.filter((s) => s.kind === 'breaking').length;
  }
  counts.sort((a, b) => a - b);
  console.log(`${era.id}: 시대당 뉴스 중앙 ${counts[Math.floor(SEEDS / 2)]}개 (최소 ${counts[0]}, 최대 ${counts.at(-1)}), 속보 비율 ${((breaking / total) * 100).toFixed(1)}%`);
}
