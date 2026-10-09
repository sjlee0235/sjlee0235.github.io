// 터미널 데모: 화면 없이 엔진만으로 한 시대를 끝까지 돌려 본다.
// 실행: npm run demo              (시드 42)
//       npm run demo -- 7         (시드 7)
//       npm run demo -- tutorial  (튜토리얼)
// 등록된 시대 데이터가 없으면(단계 B 전) 가상 시대로 돈다.

import { ALL_ERAS } from '../src/data/eras/index.ts';
import type { Game } from '../src/engine/game.ts';
import { PublicGame } from '../src/engine/publicView.ts';
import type { RecapNotice } from '../src/engine/recap.ts';
import { TutorialSession } from '../src/engine/tutorial.ts';
import { localize, t } from '../src/i18n/index.ts';
import { makeSpecEra } from '../tests/fixtures/makeEra.ts';

declare const process: { argv: string[] };

const n = (v: number) => Math.round(v).toLocaleString('ko-KR');
const signed = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`;
const clock = (tick: number) => {
  const s = tick * 5;
  return `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};
const TYPE = { breaking: '속보', tentative: '잠정', clue: '후속', outcome: '결과' } as const;

function printRecap(game: Game, r: RecapNotice) {
  const name = (id: string) => localize(game.activeStocks.find((s) => s.id === id)!.name, 'ko');
  console.log(`[${clock(r.recapTick)}] 해설 알림 (${TYPE[r.tag]})`);
  for (const it of r.items) {
    const reason = it.reason?.ko ?? t('ko', 'recap.auto', { newsTerm: it.auto.newsTerm, theme: it.auto.themeName.ko, effect: t('ko', it.auto.positive ? 'recap.benefit' : 'recap.burden') });
    console.log(`           ${t('ko', 'recap.line', { stock: name(it.stockId), pct: signed(it.appliedPct), reason })}`);
  }
  if (r.moreCount > 0) console.log(`           ${t('ko', 'recap.more', { count: r.moreCount })}`);
  if (r.tentativeNote) console.log(`           (${t('ko', 'recap.tentativeNote')})`);
}

if (process.argv[2] === 'tutorial') {
  const tut = new TutorialSession();
  for (const k of ['notice1', 'notice2', 'notice3', 'notice4']) console.log(`· ${t('ko', `tutorial.${k}`)}`);
  let w = tut.advanceTick();
  while (tut.stage === 'waiting') w = tut.advanceTick();
  console.log(`\n[${clock(tut.game.tick)}] (시간 정지) ${tut.game.pendingNews!.news.title.ko}`);
  if (w.advanced) for (const c of w.instantChanges) console.log(`  발표 즉시: ${c.stockId} ${n(c.prevPrice)}→${n(c.price)} (${signed(c.rate / 10)})`);
  console.log(`  ${t('ko', 'tutorial.stepReading')}`);
  tut.game.buy('tut-battery', 5);
  console.log('  → 든든 배터리 5주 매수');
  tut.confirmNews();
  const r = tut.advanceTick();
  if (r.advanced) for (const c of r.changes.filter((x) => x.cause === 'news')) console.log(`  5초 뒤 나머지: ${c.stockId} ${n(c.prevPrice)}→${n(c.price)} (${signed(c.rate / 10)})`);
  while (tut.stage === 'reaction') tut.advanceTick();
  printRecap(tut.game, tut.recap!);
  console.log(`\n${t('ko', 'tutorial.done')}`);
} else {
  // 화면과 똑같이 공개용 뷰(PublicGame)만 써서 진행한다
  const seed = Number(process.argv[2] ?? 42);
  const eras = ALL_ERAS.length > 0 ? ALL_ERAS : [makeSpecEra({ id: 'spec' })];
  const game = PublicGame.create({ eras, seed });
  if (ALL_ERAS.length === 0) console.log('※ 등록된 시대 데이터가 없어 가상 시대로 돌립니다 (단계 B 전).');
  console.log(`\n=== ${localize(game.eraName, 'ko')} | 시드 ${seed} | 종목 20개 (가나다순 앞 3개: ${game.getStockList().slice(0, 3).map((s) => s.name.ko).join(', ')}) ===`);
  let shown = 0;
  while (game.phase !== 'era-ended') {
    const r = game.advanceTick();
    if (!r.advanced) continue;
    if (r.news) {
      shown++;
      const tag = r.news.fictional ? ` [${t('ko', 'news.fictionalTag')}]` : '';
      console.log(`[${clock(r.tick)}] (${TYPE[r.news.kind]}) ${r.news.title.ko}${tag}`);
    }
    for (const rc of r.recaps) {
      console.log(`[${clock(rc.recapTick)}] 해설 알림`);
      for (const it of rc.items) {
        const reason = it.reason?.ko ?? t('ko', 'recap.auto', { newsTerm: it.auto.newsTerm, theme: it.auto.industry.ko, effect: t('ko', it.auto.positive ? 'recap.benefit' : 'recap.burden') });
        console.log(`           ${it.stockName.ko} ${t('ko', 'recap.split', { instant: signed(it.instantPct), delayed: signed(it.delayedPct), total: signed(it.appliedPct) })} — ${reason}`);
      }
      if (rc.moreCount > 0) console.log(`           ${t('ko', 'recap.more', { count: rc.moreCount })}`);
      if (rc.tentativeNote) console.log(`           (${t('ko', 'recap.tentativeNote')})`);
    }
    if (r.settlement) console.log(`\n=== 시대 마감 — 시작 ${n(r.settlement.startCash)} → 종료 ${n(r.settlement.endAssets)} 비트 (${signed(r.settlement.returnPct)}) ===`);
  }
  const d = game.getEraDebrief();
  console.log(`뉴스 ${shown}개. 시대 종료 후 공개: 스토리 ${d.stories.length}개 중 단서대로 ${d.stories.filter((s) => s.followedLean).length}개`);
  for (const s of d.stories.slice(0, 3)) console.log(`  · ${s.tentative.title.ko} → ${s.followedLean ? '단서대로' : '단서와 반대로'}${s.isHistorical ? '' : ' (가상 시나리오)'}`);
}
