// 터미널 데모: 화면 없이 엔진만으로 2000년대 한 시대를 끝까지 돌려 본다.
// 실행: npm run demo                 (실전 모드, 시드 42)
//       npm run demo -- practice     (연습 모드)
//       npm run demo -- real 7       (실전 모드, 시드 7)
//
// 가상의 플레이어 전략: 뉴스가 뜨면 갖고 있던 주식을 다 팔고,
// 호재가 가장 큰 테마의 종목을 살 수 있는 만큼 산다.

import { ALL_ERAS } from '../src/data/eras/index.ts';
import type { GameMode } from '../src/engine/config.ts';
import { Game } from '../src/engine/game.ts';
import type { ScheduledNews } from '../src/engine/newsEngine.ts';
import { localize } from '../src/i18n/index.ts';

declare const process: { argv: string[] };

const mode: GameMode = process.argv[2] === 'practice' ? 'practice' : 'real';
const seed = Number(process.argv[3] ?? 42);
const game = new Game({ eras: ALL_ERAS, seed, mode });
const era = game.era;
const stockName = (id: string) => localize(era.stocks.find((s) => s.id === id)!.name, 'ko');
const stockOfTheme = (themeId: string) => era.stocks.find((s) => s.themeId === themeId)?.id;
const n = (v: number) => Math.round(v).toLocaleString('ko-KR');
const signed = (v: number, digits = 1) => `${v > 0 ? '+' : ''}${v.toFixed(digits)}`;
const clock = (tick: number) => {
  const s = tick * game.config.tickSeconds;
  return `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};
const KIND = { standalone: '속보', signal: '낌새', clue: '단서', outcome: '결과' } as const;

function onNews(s: ScheduledNews) {
  const popup = game.getNewsPopup(s);
  const fiction = popup.isHistorical ? '' : ' [가상 시나리오]';
  console.log(`[${clock(s.tick)}] (${KIND[s.kind]}) ${s.news.title.ko}${fiction}`);
  const themes = popup.relatedThemes.map((t) => `${t.direction === 'positive' ? '▲' : '▼'}${t.name.ko}${t.link === 'direct' ? '' : '(2차)'}`);
  console.log(`           관련 테마: ${themes.join(' ')}`);
  if (popup.explanation) console.log(`           해설: ${popup.explanation.ko}`);
  if (popup.reactionNote) console.log(`           반응: ${popup.reactionNote.ko}`);
}

function trade(s: ScheduledNews) {
  for (const h of game.account.getHoldings()) game.sell(h.stockId, h.quantity);
  const best = [...s.news.effects].sort((a, b) => b.impact - a.impact)[0];
  const id = best && best.impact > 0 ? stockOfTheme(best.themeId) : undefined;
  if (!id) {
    console.log('           → 호재 종목이 없어 현금 보유');
    return;
  }
  const qty = game.maxBuyQuantity(id);
  if (qty > 0) {
    game.buy(id, qty);
    console.log(`           → ${stockName(id)} ${qty}주 매수 (주당 ${n(game.getPrice(id))} 비트)`);
  }
}

console.log(`\n=== ${localize(era.displayName, 'ko')} | ${mode === 'practice' ? '연습' : '실전'} 모드 | 시드 ${seed} ===`);
console.log(
  `1틱 ${game.config.tickSeconds}초, ${game.rules.ticksPerEra}틱(${(game.rules.ticksPerEra * game.config.tickSeconds) / 60}분), 시작 자금 ${n(game.account.cash)} 비트, 수수료 ${game.config.feeRate * 100}%\n`,
);

while (game.phase !== 'era-ended') {
  if (game.phase === 'news') {
    const s = game.pendingNews!;
    onNews(s);
    console.log('           ⏸ 연습 모드: 시간 정지 중 → 확인');
    game.confirmNews();
    trade(s);
  }
  const r = game.advanceTick();
  if (!r.advanced) continue;

  if (r.news && mode === 'real') {
    onNews(r.news);
    trade(r.news);
  }

  const newsChanges = r.changes.filter((c) => c.cause === 'news');
  if (newsChanges.length > 0) {
    const text = newsChanges
      .slice(0, 6)
      .map((c) => `${stockName(c.stockId)} ${n(c.prevPrice)}→${n(c.price)} (${signed(c.rate / 10)}%)`)
      .join(', ');
    const more = newsChanges.length > 6 ? ` 외 ${newsChanges.length - 6}종목` : '';
    console.log(`[${clock(r.tick)}] 반영(10초 후): ${text}${more}\n`);
  }

  if (r.tick % 360 === 0 && !r.settlement) {
    const p = game.getPortfolio();
    console.log(`           ── ${clock(r.tick)} 총자산 ${n(p.totalAssets)} 비트\n`);
  }

  if (r.settlement) {
    const st = r.settlement;
    console.log(`\n=== 시대 마감 (${clock(r.tick)}) — 보유 종목 자동 청산 ===`);
    console.log(`시작 자산 ${n(st.startCash)} → 종료 자산 ${n(st.endAssets)} 비트  (수익률 ${signed(st.returnPct, 2)}%)`);
    console.log(`이번 시대 뉴스 ${game.shownNews.length}개 (낌새 ${game.shownNews.filter((x) => x.kind === 'signal').length}개)`);
    console.log('\n시대 종료 시 종목 가격 (시작가 1,000)');
    for (const item of game.getStockList().sort((a, b) => b.price - a.price)) {
      console.log(`  ${localize(item.stock.name, 'ko').padEnd(10, '　')} ${n(item.price).padStart(6)}  (${signed(item.changePct)}%)`);
    }
  }
}
console.log(`\n다음 시대로 이월되는 자금: ${n(game.account.cash)} 비트\n`);
