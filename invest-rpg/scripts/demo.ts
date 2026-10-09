// 터미널 데모: 화면 없이 엔진만으로 2000년대 한 시대를 끝까지 돌려 본다.
// 실행: npm run demo            (시드 42)
//       npm run demo -- 7       (시드 7)
//
// 가상의 플레이어 전략: 뉴스가 뜨면 갖고 있던 주식을 다 팔고,
// 호재가 가장 큰 테마의 종목을 살 수 있는 만큼 산다.

import { ALL_ERAS } from '../src/data/eras/index.ts';
import { Game } from '../src/engine/game.ts';
import { localize } from '../src/i18n/index.ts';

declare const process: { argv: string[] };

const seed = Number(process.argv[2] ?? 42);
const game = new Game({ eras: ALL_ERAS, seed });
const era = game.era;
const stockName = (id: string) => localize(era.stocks.find((s) => s.id === id)!.name, 'ko');
const themeName = (id: string) => localize(era.themes.find((t) => t.id === id)!.name, 'ko');
const stockOfTheme = (themeId: string) => era.stocks.find((s) => s.themeId === themeId)!.id;
const n = (v: number) => Math.round(v).toLocaleString('ko-KR');
const signed = (v: number, digits = 1) => `${v > 0 ? '+' : ''}${v.toFixed(digits)}`;
const clock = (tick: number) => {
  const s = tick * game.config.tickSeconds;
  return `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

console.log(`\n=== ${localize(era.displayName, 'ko')} | 시드 ${seed} | 시작 자금 ${n(game.account.cash)} 비트 ===`);
console.log(`종목 ${era.stocks.length}개, 뉴스 풀 ${era.newsPool.length}개, 시대 길이 ${game.config.ticksPerEra}틱\n`);

let watching: string[] = [];

while (game.phase !== 'era-ended') {
  if (game.phase === 'news') {
    const news = game.pendingNews!;
    console.log(`[${clock(game.tick)}] 속보: ${news.title.ko}`);
    console.log(
      `           영향: ${news.effects.map((e) => `${themeName(e.themeId)} ${signed(e.impact, 0)}`).join(', ')}`,
    );
    game.confirmNews();

    // 전략: 전량 매도 → 가장 큰 호재 종목 매수
    for (const h of game.account.getHoldings()) game.sell(h.stockId, h.quantity);
    const best = [...news.effects].sort((a, b) => b.impact - a.impact)[0];
    if (best && best.impact > 0) {
      const id = stockOfTheme(best.themeId);
      const qty = game.maxBuyQuantity(id);
      if (qty > 0) {
        game.buy(id, qty);
        console.log(`           → ${stockName(id)} ${qty}주 매수 (주당 ${n(game.getPrice(id))} 비트)`);
      }
    } else {
      console.log('           → 호재가 없어 현금 보유');
    }
    watching = news.effects.map((e) => stockOfTheme(e.themeId));
  }

  const r = game.advanceTick();
  if (!r.advanced) continue;

  // 뉴스가 반영된 틱이면 변동을 보여준다
  const newsChanges = r.changes.filter((c) => c.cause === 'news');
  if (newsChanges.length > 0) {
    const text = newsChanges
      .filter((c) => watching.includes(c.stockId))
      .map((c) => `${stockName(c.stockId)} ${n(c.prevPrice)}→${n(c.price)} (${signed(c.rate / 10)}%)`)
      .join(', ');
    console.log(`[${clock(r.tick)}] 반영: ${text}`);
  }

  if (r.tick % 60 === 0 && !r.settlement) {
    const p = game.getPortfolio();
    console.log(
      `           ── ${clock(r.tick)} 총자산 ${n(p.totalAssets)} 비트 (현금 ${n(p.cash)}, 평가손익 ${signed(p.totalUnrealizedPnl, 0)})\n`,
    );
  }

  if (r.settlement) {
    const st = r.settlement;
    console.log(`\n=== 시대 마감 (${clock(r.tick)}) — 보유 종목 자동 청산 ===`);
    console.log(`시작 자산 ${n(st.startAssets)} → 종료 자산 ${n(st.endAssets)} 비트  (수익률 ${signed(st.returnPct, 2)}%)`);
    console.log('\n종목별 손익');
    for (const s of st.stocks) {
      console.log(`  ${stockName(s.stockId).padEnd(10, '　')} ${signed(s.pnl, 0).padStart(8)} 비트  (${signed(s.pnlPct, 2)}%)`);
    }
    console.log('\n시대 종료 시 종목 가격 (시작가 1,000)');
    const list = game.getStockList().sort((a, b) => b.price - a.price);
    for (const item of list) {
      console.log(`  ${localize(item.stock.name, 'ko').padEnd(10, '　')} ${n(item.price).padStart(6)}  (${signed(item.changePct)}%)`);
    }
  }
}
console.log(`\n다음 시대로 이월되는 자금: ${n(game.account.cash)} 비트\n`);
