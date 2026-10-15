// 화면 흐름 점검 (브라우저): npm run e2e
// 1) 첫 화면(역전의 방): 새로하기 → 튜토리얼(김역전 이야기) → 기록 동의(기본 꺼짐) → 게임, 이어하기, 저장이 있을 때 새로하기 확인 창
// 2) 앱 업데이트로 시대 중간에 정산된 뒤 '확인' → 다음 시대가 실제로 흘러간다 (가상 3시대)
// 3) 마지막 시대까지 끝낸 판을 다시 열면 최종 요약이 보이고, 새 판이 저장되지 않는다
// 4) 숨긴 탭에서 열면 처음부터 일시정지
// 5) 매매: 종목 누르기 → 최대 → [매수] 바로 체결 → 즐겨찾기 맨 위 → [매도]로 전량 매도, NEWS! → 주식창
// 6) 인테리어: 현금 2,500코인 내고 한 단계(다음은 3,750, 작업 보상 상승 안내), 배경 그림이 바뀌고 다시 열어도 그대로, 현금이 모자라면 매도 안내
// 7) 작업실: 인형 100개째에 바로 지급 → 지급 예정 +0, 완성 0개
// 8) 강아지 5번 연속 터치 → 배 까기 + 하트, 밤/낮 바꾸기
// 9) 삼성 인터넷이면 첫 화면에 다크 모드 안내 한 번 (다른 브라우저에서는 없음)
// 10) 시대별 작업: 2010년대 폰 케이스 큐빅, 2020년대 블로그 글쓰기 (배경 1칸 + 작업물 그림, 밤 그림), 2000년대 인형 그대로
// 시간을 기다리지 않도록 디버그 기능(window.__debug)을 쓴다.

import { chromium, type Page } from 'playwright';
import { createServer } from 'vite';

declare const process: { exitCode?: number };

const server = await createServer({ server: { port: 5198, strictPort: false }, logLevel: 'error' });
await server.listen();
const url = server.resolvedUrls?.local[0] ?? 'http://localhost:5198/';
const browser = await chromium.launch();
const failures: string[] = [];
const check = (ok: boolean, msg: string) => {
  console.log(`${ok ? '✓' : '✗'} ${msg}`);
  if (!ok) failures.push(msg);
};

type Win = { __debug: Record<string, (...x: unknown[]) => unknown> & { app: Record<string, unknown> & { game: Record<string, unknown> } } };

async function open(page: Page, query: string) {
  await page.goto(`${url}${query}`);
  await page.waitForFunction(() => '__debug' in window);
  // 디버그 패널이 버튼을 가리지 않게 숨긴다 (기능은 window.__debug로 씀)
  await page.addStyleTag({ content: '.debug{display:none!important}' });
}
const dbg = (page: Page, fn: string, ...args: unknown[]) =>
  page.evaluate(([f, a]) => (window as unknown as Win).__debug[f as string]!(...(a as unknown[])), [fn, args] as const);
const game = <T>(page: Page, expr: string) => page.evaluate((e) => new Function('g', `return ${e}`)((window as unknown as Win).__debug.app.game) as T, expr);
const newCtx = (w = 390, hgt = 844) => browser.newContext({ viewport: { width: w, height: hgt } });
const sceneFile = (page: Page) => page.evaluate(() => (window as unknown as { __debug: { app: { scene: { file: string | null } } } }).__debug.app.scene.file);
const watchErrors = (page: Page) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  return errors;
};

try {
  // ── 1) 첫 화면 → 새로하기 → 튜토리얼(이야기) → 동의 → 게임 / 이어하기 / 저장이 있을 때 새로하기 ──
  {
    const ctx = await newCtx();
    const page = await ctx.newPage();
    const errors = watchErrors(page);
    await page.goto(`${url}?debug=1&seed=3`);
    await page.waitForFunction(() => '__debug' in window);
    await page.addStyleTag({ content: '.debug{display:none!important}' });
    check(await page.locator('.title-screen').isVisible(), '첫 화면');
    check((await page.locator('.title-logo svg').getAttribute('aria-label')) === '역전의 방', '제목 "역전의 방" 도트 글자');
    check(await page.locator('.title-buttons .pbtn').first().isDisabled(), '저장이 없으면 이어하기를 누를 수 없다');
    await page.locator('.title-buttons .pbtn').nth(1).click(); // 새로하기
    check(!(await page.locator('.overlay.confirm-new').isVisible()), '저장이 없으면 확인 창 없이 바로');
    check(((await page.locator('.overlay.tutorial .hd').textContent()) ?? '') === '김역전의 이야기', '튜토리얼 첫 장은 김역전의 이야기');
    check(((await page.locator('.overlay.tutorial .body').textContent()) ?? '').includes('인생역전'), '이야기: 인생역전');
    for (let i = 0; i < 3; i++) await page.locator('.overlay.tutorial .foot .pbtn').nth(1).click();
    check(((await page.locator('.overlay.tutorial .hd').textContent()) ?? '') === '목표와 엔딩', '튜토리얼 마지막 장: 목표와 엔딩');
    check(((await page.locator('.overlay.tutorial .body').textContent()) ?? '').includes('해피 엔딩'), '엔딩 세 가지 안내');
    await page.locator('.overlay.tutorial .foot .pbtn').nth(1).click(); // 다음
    check(((await page.locator('.overlay.tutorial .hd').textContent()) ?? '') === '플레이 기록 보내기', '튜토리얼 마지막 장에서 플레이 기록 동의 (처음 한 번)');
    check(((await page.locator('.overlay.tutorial .foot .pbtn').first().textContent()) ?? '') === '동의하지 않음' && ((await page.locator('.overlay.tutorial .foot .pbtn').nth(1).textContent()) ?? '') === '동의하고 시작', '[동의하지 않음] / [동의하고 시작]');
    check(!(await page.locator('.overlay.consent').isVisible()), '따로 뜨는 동의 창은 없다');
    await page.locator('.overlay.tutorial .foot .pbtn').first().click(); // 동의하지 않음
    check(!(await game<boolean>(page, 'g.telemetryConsent')), '동의하지 않으면 기록 꺼짐 (기본)');
    check(await page.locator('.overlay.era-intro').isVisible(), '시대 시작 카드가 뜬다');
    check(((await page.locator('.era-intro .era-num svg').getAttribute('aria-label')) ?? '') === '2000' && ((await page.locator('.era-intro .era-step').textContent()) ?? '').includes('1 / 3'), '카드: 큰 도트 숫자 2000, "시대 1 / 3"');
    check((await game<number>(page, 'g.tick')) === 0, '카드가 떠 있는 동안 시간이 흐르지 않는다');
    await page.locator('.era-intro .pbtn').click();
    check((await page.getAttribute('.stage', 'data-era')) === '2000s', '시대 색 테마 data-era=2000s');
    await dbg(page, 'setTimeScale', 10);
    await page.waitForTimeout(1500);
    const left = await game<number>(page, 'g.remainingSeconds');
    check(left < 5400, '시작하면 시간이 흐른다');
    await page.evaluate(() => (window as unknown as { __debug: { app: { persist(f: boolean): void } } }).__debug.app.persist(true));

    await page.goto(`${url}?debug=1&seed=3`);
    await page.waitForFunction(() => '__debug' in window);
    check(await page.locator('.title-buttons .pbtn').first().isEnabled(), '저장이 있으면 이어하기');
    await page.locator('.title-buttons .pbtn').first().click();
    check(!(await page.locator('.overlay.tutorial').isVisible()) && !(await page.locator('.overlay.consent').isVisible()), '이어하기는 튜토리얼·동의 없이');
    check((await game<number>(page, 'g.remainingSeconds')) <= left, '이어하기: 저장된 시점부터');

    await page.goto(`${url}?debug=1&seed=4`);
    await page.waitForFunction(() => '__debug' in window);
    await page.locator('.title-buttons .pbtn').nth(1).click();
    check(await page.locator('.overlay.confirm-new').isVisible(), '저장이 있는데 새로하기 → 안내 창');
    await page.locator('.overlay.confirm-new .foot .pbtn').first().click(); // 취소
    check(await page.locator('.title-screen').isVisible() && (await page.evaluate(() => localStorage.getItem('invest-rpg.save'))) !== null, '취소하면 첫 화면 그대로, 저장 그대로');
    await page.locator('.title-buttons .pbtn').nth(1).click();
    await page.locator('.overlay.confirm-new .foot .pbtn').nth(1).click(); // 새로 시작
    await page.locator('.overlay.tutorial .foot .pbtn').first().click(); // 건너뛰기
    await page.locator('.era-intro .pbtn').click();
    check(!(await page.locator('.overlay.tutorial').isVisible()) && !(await page.locator('.overlay.consent').isVisible()), '동의는 처음 한 번만 묻는다 (두 번째 튜토리얼은 동의 장 없이 끝남)');
    check((await game<number>(page, 'g.remainingSeconds')) === 5400 && (await game<number>(page, 'g.cash')) === 10_000, '새로하기: 처음부터 (1:30:00, 10,000코인)');
    // 설정 → 저장하고 나가기 → 첫 화면, 이어하기로 그 시점부터
    await dbg(page, 'advanceSeconds', 600);
    const atExit = await game<number>(page, 'g.remainingSeconds');
    await page.locator('.gear-btn').click();
    await page.locator('.overlay.settings .pbtn.save-exit').click();
    await page.waitForFunction(() => '__debug' in window);
    check(await page.locator('.title-screen').isVisible(), '저장하고 나가기 → 첫 화면');
    await page.locator('.title-buttons .pbtn').first().click();
    check((await game<number>(page, 'g.remainingSeconds')) === atExit, `이어하기: 나간 시점부터 (${atExit}초 남음)`);
    await page.locator('.gear-btn').click();
    await page.locator('.overlay.settings .foot .pbtn').last().click();

    check(errors.length === 0, `브라우저 오류 없음 ${errors.join(' / ')}`);
    await ctx.close();
  }

  // ── 2) 앱 업데이트 정산 → 다음 시대 진행 (가상 3시대) ──
  {
    const ctx = await newCtx(360, 640);
    const page = await ctx.newPage();
    const errors = watchErrors(page);
    await open(page, '?debug=1&seed=5&fresh=1&nointro=1&virtual=1');
    await dbg(page, 'advanceSeconds', 900);
    await dbg(page, 'interior', 1);
    // 저장된 세이브의 엔진 버전을 옛 값으로 바꿔 "앱 업데이트"를 흉내 낸다
    await page.evaluate(() => {
      // 페이지를 떠날 때(visibilitychange) 저장이 다시 일어나지 않게 막고 나서 고친다
      (window as unknown as { __debug: { app: { saveLocked: boolean } } }).__debug.app.saveLocked = true;
      const s = JSON.parse(localStorage.getItem('invest-rpg.save')!);
      s.game.engineVersion = '0.0.0-old';
      localStorage.setItem('invest-rpg.save', JSON.stringify(s));
    });
    await open(page, '?debug=1&seed=5&nointro=1&virtual=1');
    check(await page.locator('.overlay.settlement').isVisible(), '업데이트 후 열면 정산 창이 뜬다');
    await page.locator('.overlay.settlement .foot .pbtn').click();
    check(!(await page.locator('.overlay.final').isVisible()), '정산 확인 뒤 최종 요약이 아니라 다음 시대');
    check((await game<string>(page, 'g.eraId')) === '2010s' && (await game<string>(page, 'g.phase')) === 'running', '다음 시대(2010s) 진행 중');
    check((await game<number>(page, 'g.interiorLevel')) === 1, '인테리어 단계는 다음 시대로 이어진다');
    await dbg(page, 'setTimeScale', 10);
    const before = await game<number>(page, 'g.remainingSeconds');
    await page.waitForTimeout(1200);
    check((await game<number>(page, 'g.remainingSeconds')) < before, '정산 뒤 시간이 실제로 흐른다 (루프 시작됨)');
    check(errors.length === 0, `브라우저 오류 없음 ${errors.join(' / ')}`);
    await ctx.close();
  }

  // ── 3) 3시대(2000→2010→2020년대) 끝까지 → 최종 요약 + 엔딩, 끝난 판 다시 열기 ──
  {
    const ctx = await newCtx(360, 640);
    const page = await ctx.newPage();
    const errors = watchErrors(page);
    await open(page, '?debug=1&seed=6&fresh=1&nointro=1');
    await dbg(page, 'interior', 3);
    for (const [i, era] of ['2000s', '2010s', '2020s'].entries()) {
      check((await game<string>(page, 'g.eraId')) === era, `${i + 1}번째 시대는 ${era}`);
      check((await page.getAttribute('.stage', 'data-era')) === era, `화면 색 테마도 ${era}`);
      if (i === 1) check(((await page.locator('.acct-col.r .lbl').textContent()) ?? '') === '2010년대 남은 시간' || (await page.getAttribute('.stage', 'data-tab')) !== 'trading', '계좌 바: "2010년대 남은 시간"');
      await dbg(page, 'endEra');
      await page.waitForSelector('.overlay.settlement');
      await page.locator('.overlay.settlement .foot .pbtn').click();
      await page.waitForTimeout(200);
      if (i < 2) check(!(await page.locator('.overlay.final').isVisible()), `${era} 정산 뒤에는 다음 시대`);
    }
    check(await page.locator('.overlay.final').isVisible(), '2020년대 정산 뒤 최종 요약');
    check(((await page.locator('.overlay.final .ending-t').textContent()) ?? '').includes('중립 엔딩'), `인생 업그레이드 3단계 → 중립 엔딩 ("${await page.locator('.overlay.final .ending-t').textContent()}")`);
    check((await page.locator('.overlay.final .body .note').count()) >= 3, '최종 요약에 시대별 줄 3개');
    const saved = await page.evaluate(() => localStorage.getItem('invest-rpg.save'));
    await open(page, '?debug=1&seed=6&nointro=1');
    check(await page.locator('.overlay.final').isVisible(), '끝난 판을 다시 열면 최종 요약이 보인다');
    await page.waitForTimeout(300);
    const after = await page.evaluate(() => localStorage.getItem('invest-rpg.save'));
    check(after === saved, '다시 열어도 세이브를 새 판으로 덮어쓰지 않는다');
    check(errors.length === 0, `브라우저 오류 없음 ${errors.join(' / ')}`);
    await ctx.close();
  }

  // ── 4) 숨긴 탭에서 열기 ──
  {
    const ctx = await newCtx(360, 640);
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    });
    await open(page, '?debug=1&seed=8&fresh=1&nointro=1');
    check(await game<boolean>(page, 'g.isPaused'), '숨긴 탭에서 열면 처음부터 일시정지');
    await ctx.close();
  }

  // ── 5) 매매 / NEWS! ──
  {
    const ctx = await newCtx();
    const page = await ctx.newPage();
    const errors = watchErrors(page);
    await open(page, '?debug=1&seed=9&fresh=1&nointro=1');
    const name = (await page.locator('.stock-scroll .row .nm').nth(3).textContent())!;
    check(!name.includes(' ') && !name.endsWith('주'), `종목명 붙여쓰기·'주' 없음 ("${name}")`);
    await page.locator('.stock-scroll .row').nth(3).click();
    check(await page.locator('.order-pnl').isVisible(), '종목을 누르면 주문 패널이 열린다');
    check(await page.locator('.pick-hint').isVisible() && !(await page.locator('.qty-box').isVisible()), '처음엔 수량 칸 대신 "먼저 매수·매도를 고르세요"');
    await page.locator('.trade-row .sell').click();
    await page.waitForTimeout(100);
    check(((await page.locator('.toast').last().textContent()) ?? '') === '보유한 주식이 없어요.' && !(await page.locator('.qty-box').isVisible()), '보유 없이 [매도]를 고르면 안내만');
    await page.locator('.trade-row .buy').click();
    check(await page.locator('.qty-box').isVisible() && ((await page.locator('.pbtn.go').textContent()) ?? '') === '매수하기', '[매수]를 고르면 수량 칸과 [매수하기]');
    const rowId = (await page.locator('.stock-scroll .row').nth(3).getAttribute('data-id'))!;
    const expectMax = await game<number>(page, `g.maxQty('buy', '${rowId}')`);
    await page.locator('.qty-row .max').click();
    const qty = Number(await page.locator('.qty-box input').inputValue());
    check(qty > 0 && qty === expectMax, `매수 최대 = 현금 기준 (${qty}주)`);
    await page.locator('.pbtn.go').click();
    await page.waitForTimeout(150);
    const toast = (await page.locator('.toast').last().textContent()) ?? '';
    check(toast.includes(`${qty}주 매수`), `최대(${qty}주) [매수하기] 체결 안내: "${toast}"`);
    check(await page.locator('.pick-hint').isVisible(), '체결 뒤에는 다시 매수·매도 고르기부터');
    const firstRow = (await page.locator('.stock-scroll .row .nm').first().textContent())!;
    check(firstRow === name, '산 종목은 즐겨찾기로 맨 위에');
    const cash = await game<number>(page, 'g.cash');
    check(cash < 1100, `최대 매수 뒤 남은 현금이 1주 값 안팎보다 적다 (${cash})`);
    // 총자산은 많아도 현금이 2,000 미만이면 인테리어를 살 수 없다
    await dbg(page, 'tab', 'living_room');
    await page.locator('.upgrade .pbtn').click();
    await page.waitForTimeout(150);
    check((await game<number>(page, 'g.interiorLevel')) === 0 && (await game<number>(page, 'g.cash')) === cash, '주식만 있고 현금이 2,000 미만이면 인테리어 안 됨');
    check(((await page.locator('.toast').last().textContent()) ?? '') === '현금이 부족합니다. 주식을 매도해 현금을 확보하세요.', '"현금이 부족합니다. 주식을 매도해 현금을 확보하세요."');
    await dbg(page, 'tab', 'trading');
    await page.waitForTimeout(100);
    // 내 계좌: 현금·보유 종목·손익률, 눌러서 주문 패널
    await page.locator('.list-tab').nth(1).click();
    check(((await page.locator('.list-tab').nth(1).textContent()) ?? '') === '내 계좌 (1)', '내 계좌 탭에 보유 종목 수');
    check(((await page.locator('.acct-cash b').textContent()) ?? '') === cash.toLocaleString('ko-KR'), `계좌 바에 현금 (${await page.locator('.acct-cash b').textContent()})`);
    check((await page.locator('.stock-scroll.mine .row.hold[data-id]').count()) === 1, '내 계좌에 산 종목 한 줄');
    check(((await page.locator('.stock-scroll.mine .row.hold[data-id] .q').textContent()) ?? '') === `${qty}주`, '보유 수량');
    check(/^[+-]?\d+\.\d%$/.test((await page.locator('.stock-scroll.mine .row.hold[data-id] .p').textContent()) ?? ''), '산 뒤 손익률');
    check(/^\d{1,3}(,\d{3})*$/.test((await page.locator('.stock-scroll.mine .row.hold[data-id] .a').textContent()) ?? ''), `평단가 (${await page.locator('.stock-scroll.mine .row.hold[data-id] .a').textContent()})`);
    check(((await page.locator('.list-pnl .row.hold.head span').nth(3).textContent()) ?? '') === '평단가', '손익률 왼쪽 열이 평단가');
    check(((await page.locator('.acct-col.r .lbl').textContent()) ?? '') === '2000년대 남은 시간', '계좌 바: "2000년대 남은 시간"');
    await page.locator('.stock-scroll.mine .row.hold[data-id]').click(); // 같은 종목이 열려 있으면 닫힘
    await page.locator('.stock-scroll.mine .row.hold[data-id]').click();
    check(await page.locator('.order-pnl').isVisible() && ((await page.locator('.order-head .nm').textContent()) ?? '') === name, '내 계좌에서 종목을 누르면 주문 패널');
    const buyMax = await game<number>(page, `g.maxQty('buy', g.getPortfolio().holdings[0].id)`);
    await page.locator('.trade-row .buy').click();
    await page.locator('.qty-row .max').click();
    check(Number(await page.locator('.qty-box input').inputValue()) === buyMax, `[매수] 최대 = 현금으로 살 수 있는 수 (${buyMax}주)`);
    await page.locator('.trade-row .pbtn.back').click();
    await page.locator('.trade-row .sell').click();
    await page.locator('.qty-row .max').click();
    check(Number(await page.locator('.qty-box input').inputValue()) === qty && ((await page.locator('.pbtn.go').textContent()) ?? '') === '매도하기', `[매도] 최대 = 보유 수량 전부 (${qty}주)`);
    await page.locator('.qty-box input').fill('1');
    await page.locator('.pbtn.go').click();
    await page.waitForTimeout(150);
    check((await game<number>(page, 'g.getPortfolio().holdings[0].quantity')) === qty - 1, '[매도하기] 1주 매도');
    // 일괄매도: 확인 창에서 [취소]면 그대로, [확인]이면 전부 매도
    await page.locator('.pbtn.sell-all').click();
    check(await page.locator('.overlay.confirm').isVisible(), '[일괄매도]를 누르면 확인 창');
    check(((await page.locator('.overlay.confirm .body').textContent()) ?? '').includes('전부 매도할까요?'), '"보유한 주식 … 전부 매도할까요?"');
    await page.locator('.overlay.confirm .foot .pbtn').first().click();
    check(!(await page.locator('.overlay.confirm').isVisible()) && (await game<number>(page, 'g.getPortfolio().holdings.length')) === 1, '[취소]면 매도하지 않는다');
    await page.locator('.pbtn.sell-all').click();
    await page.locator('.overlay.confirm .foot .pbtn').last().click();
    await page.waitForTimeout(150);
    check((await game<number>(page, 'g.getPortfolio().holdings.length')) === 0, '[확인]을 누르면 보유 주식 전부 매도');
    check(((await page.locator('.toast').last().textContent()) ?? '').includes('모두 매도했어요'), '일괄매도 안내');
    check(await page.locator('.mine-empty').isVisible(), '다 팔면 내 계좌에 "아직 보유한 종목이 없어요"');
    await page.locator('.list-tab').first().click();
    await dbg(page, 'tab', 'living_room');
    await dbg(page, 'nextNews');
    await page.waitForTimeout(100);
    check(await page.locator('.news-chip').isVisible(), '거실에서 안 읽은 뉴스가 있으면 NEWS!');
    await page.locator('.news-chip').click();
    check((await page.getAttribute('.stage', 'data-tab')) === 'trading', 'NEWS!를 누르면 주식창으로');
    check((await page.locator('.news-win .ni').count()) >= 1, '주식창 뉴스 창에 뉴스가 있다');
    await dbg(page, 'advanceSeconds', 125);
    await page.waitForTimeout(200);
    const repItems = await game<number>(page, 'g.getFeed().at(-1).report.items.length');
    const repLines = await page.locator('.news-win .ni').last().locator('.rep-i').count();
    check(repItems >= 3 && repLines === repItems, `주가 리포트에 영향받은 종목 모두 (${repLines}/${repItems}줄)`);
    const lastLine = page.locator('.news-win .ni').last().locator('.rep-i').last();
    await lastLine.scrollIntoViewIfNeeded();
    check(await lastLine.isVisible(), '리포트 마지막 줄까지 스크롤해서 볼 수 있다');
    check(errors.length === 0, `브라우저 오류 없음 ${errors.join(' / ')}`);
    await ctx.close();
  }

  // ── 6) 인테리어 ──
  {
    const ctx = await newCtx();
    const page = await ctx.newPage();
    const errors = watchErrors(page);
    await open(page, '?debug=1&seed=10&fresh=1&nointro=1');
    await dbg(page, 'tab', 'living_room');
    await page.waitForTimeout(300);
    check(((await sceneFile(page)) ?? '').includes('living_2000s_') && (await sceneFile(page))!.endsWith('_lv0.png'), `거실 그림 Lv0 (${await sceneFile(page)})`);
    await page.locator('.upgrade .pbtn').click();
    await page.waitForTimeout(600);
    check((await game<number>(page, 'g.interiorLevel')) === 1 && (await game<number>(page, 'g.cash')) === 7500, '업그레이드: 2,500코인 내고 Lv1');
    check((await sceneFile(page))!.endsWith('_lv1.png'), '배경 그림이 Lv1로 바뀐다');
    const lpBg = () => page.evaluate(() => (document.querySelector('.scene-ovl') as HTMLElement | null)?.style.backgroundImage ?? '');
    check(await page.locator('.scene-ovl').isVisible() && (await lpBg()).includes('art/lp/worn_2000s_'), '거실 LP(15차 그림): 0~2단계는 낡은 가방형');
    check((await page.locator('.pip.on').count()) === 1, '단계 점 1개 채움');
    check(((await page.locator('.toast').last().textContent()) ?? '').includes('인형 하나에 6코인'), '업그레이드하면 작업 보상이 오른다는 안내 (인형 하나 6코인)');
    check(((await page.locator('.upgrade .pbtn').textContent()) ?? '').includes('3,750'), '다음 단계 값은 3,750코인');
    await page.locator('.upgrade .pbtn').click(); // 3,750코인 → 2단계, 현금 3,750 (다음 5,000은 모자람)
    await page.waitForTimeout(150);
    check((await game<number>(page, 'g.interiorLevel')) === 2 && (await game<number>(page, 'g.cash')) === 3750, `현금만큼만 올라간다 (Lv${await game<number>(page, 'g.interiorLevel')})`);
    await page.locator('.upgrade .pbtn').click();
    await page.waitForTimeout(150);
    check(((await page.locator('.toast').last().textContent()) ?? '') === '현금이 부족합니다. 주식을 매도해 현금을 확보하세요.', '현금이 모자라면 매도 안내');
    check(await page.locator('.upgrade .pbtn.poor').isVisible(), '코인이 모자라면 버튼이 흐려진다');
    await open(page, '?debug=1&seed=10&nointro=1');
    check((await game<number>(page, 'g.interiorLevel')) === 2, '다시 열어도 인테리어 단계 그대로');
    await dbg(page, 'tab', 'workshop');
    await page.waitForTimeout(300);
    check((await sceneFile(page))!.includes('workshop_2000s_') && (await sceneFile(page))!.endsWith('_lv2.png'), '작업실 그림도 같은 단계');
    check(!(await page.locator('.scene-ovl').isVisible()), '작업실에는 LP 그림이 없다');
    await dbg(page, 'tab', 'living_room');
    await dbg(page, 'interior', 4);
    await page.waitForTimeout(200);
    check((await page.evaluate(() => (document.querySelector('.scene-ovl') as HTMLElement).style.backgroundImage)).includes('art/lp/walnut_2000s_'), 'LP: 6단계부터 월넛 턴테이블');
    check(errors.length === 0, `브라우저 오류 없음 ${errors.join(' / ')}`);
    await ctx.close();
  }

  // ── 7) 작업실 100개 지급 ──
  {
    const ctx = await newCtx();
    const page = await ctx.newPage();
    const errors = watchErrors(page);
    await open(page, '?debug=1&seed=11&fresh=1&nointro=1');
    await dbg(page, 'tab', 'workshop');
    await dbg(page, 'workTouches', 297); // 99개
    await page.waitForTimeout(1200); // 초당 터치 상한이 풀리게
    check(((await page.locator('.pend-chip').textContent()) ?? '').includes('+297'), '99개: 지급 예정 +297');
    const cash = await game<number>(page, 'g.cash');
    for (let i = 0; i < 3; i++) {
      await page.locator('.doll-hit').dispatchEvent('pointerdown');
      await page.waitForTimeout(250);
    }
    check((await game<number>(page, 'g.cash')) === cash + 300, '100개째에 300코인 바로 지급');
    await page.waitForTimeout(700);
    check(((await page.locator('.pend-chip').textContent()) ?? '').includes('+0'), '지급 뒤 지급 예정 +0');
    check(((await page.locator('.workshop .toast-pnl').first().textContent()) ?? '').includes('완성 0개'), '지급 뒤 완성 0개');
    check(((await page.locator('.work-guide').textContent()) ?? '') === '인형 100개를 완성하면 보상이 지급돼요.', '안내 문구');
    const hit = await page.locator('.doll-hit').boundingBox();
    check(hit !== null && Math.round(hit.width) === 252 && Math.round(hit.height) === 276, `인형 터치 범위 84×92도트 = 252×276px (${hit?.width}×${hit?.height})`);
    await page.waitForTimeout(1200);
    await dbg(page, 'workTouches', 102); // 34개 → +102
    await page.waitForTimeout(300);
    const pend = await page.locator('.pend-chip').boundingBox();
    const inner = await page.locator('.pend-chip .in').evaluate((el) => el.scrollWidth <= el.clientWidth);
    check(pend !== null && Math.round(pend.width) === 130 && inner, `지급 예정 세 자리: 칩 폭 130(2배속 코인 칩과 같음), 글자가 넘치지 않음 (${pend?.width})`);
    const box = await page.locator('.work-guide').boundingBox();
    check(box !== null && box.y < 120 && box.x + box.width < 180, `안내 문구는 왼쪽 위 (${JSON.stringify(box)})`);
    check(errors.length === 0, `브라우저 오류 없음 ${errors.join(' / ')}`);
    await ctx.close();
  }

  // ── 7-2) 남은 시간: 다른 탭에서도 왼쪽 위, 1초씩 줄어듦. 첫 뉴스는 3분 ──
  {
    const ctx = await newCtx();
    const page = await ctx.newPage();
    const errors = watchErrors(page);
    await open(page, '?debug=1&seed=13&fresh=1&nointro=1');
    await dbg(page, 'tab', 'living_room');
    check(await page.locator('.time-chip').isVisible(), '거실에서도 왼쪽 위에 남은 시간');
    const t0 = (await page.locator('.time-chip .v').textContent()) ?? '';
    await page.waitForTimeout(1300);
    const t1 = (await page.locator('.time-chip .v').textContent()) ?? '';
    const sec = (s: string) => s.split(':').reduce((a, x) => a * 60 + Number(x), 0);
    check(sec(t0) - sec(t1) >= 1 && sec(t0) - sec(t1) <= 2, `남은 시간이 1초씩 줄어든다 (${t0} → ${t1})`);
    await dbg(page, 'tab', 'trading');
    check(!(await page.locator('.time-chip').isVisible()) && ((await page.locator('.acct-time').textContent()) ?? '') !== '', '주식창에서는 계좌 바에 남은 시간');
    await dbg(page, 'nextNews');
    check((await game<number>(page, '5400 - g.remainingSeconds')) === 180, '첫 뉴스는 3분(180초)');
    check(errors.length === 0, `브라우저 오류 없음 ${errors.join(' / ')}`);
    await ctx.close();
  }

  // ── 8) 강아지·밤낮 ──
  {
    const ctx = await newCtx();
    const page = await ctx.newPage();
    const errors = watchErrors(page);
    await open(page, '?debug=1&seed=12&fresh=1&nointro=1');
    await dbg(page, 'tab', 'living_room');
    for (let i = 0; i < 5; i++) {
      await page.locator('.dog-hit').dispatchEvent('pointerdown');
      await page.waitForTimeout(100);
    }
    const mode = await page.evaluate(() => (window as unknown as { __debug: { app: { livingScreen: { dogState: { mode: string } } } } }).__debug.app.livingScreen.dogState.mode);
    check(mode === 'BELLY', `5번 연속 터치 → 배 까기 (${mode})`);
    check(await page.locator('.dog-hearts').isVisible(), '하트가 보인다');
    await dbg(page, 'tod', 'day');
    await page.waitForTimeout(300);
    check((await page.getAttribute('.stage', 'data-tod')) === 'day' && (await sceneFile(page))!.includes('_day_'), '낮으로 바꾸면 색과 그림이 낮');
    await dbg(page, 'tod', 'night');
    await page.waitForTimeout(300);
    check((await sceneFile(page))!.includes('_night_'), '밤 그림');
    check(errors.length === 0, `브라우저 오류 없음 ${errors.join(' / ')}`);
    await ctx.close();
  }

  // ── 9) 삼성 인터넷: 첫 화면에 다크 모드 안내 한 번 (11차) ──
  {
    const samsungUa = 'Mozilla/5.0 (Linux; Android 14; SM-S921N) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/27.0 Chrome/125.0.0.0 Mobile Safari/537.36';
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, userAgent: samsungUa });
    const page = await ctx.newPage();
    const errors = watchErrors(page);
    await page.goto(`${url}?debug=1&seed=3`);
    await page.waitForFunction(() => '__debug' in window);
    await page.addStyleTag({ content: '.debug{display:none!important}' });
    check(await page.locator('.overlay.samsung-dark').isVisible(), '삼성 인터넷이면 첫 화면에 다크 모드 안내');
    check(((await page.locator('.overlay.samsung-dark .body').textContent()) ?? '').includes('다크 모드'), '안내: 다크 모드를 끄거나 다른 브라우저로');
    await page.locator('.overlay.samsung-dark .foot .pbtn').click();
    check(!(await page.locator('.overlay.samsung-dark').isVisible()) && (await page.locator('.title-screen').isVisible()), '[확인]을 누르면 닫히고 첫 화면');
    await page.reload();
    await page.waitForFunction(() => '__debug' in window);
    check(!(await page.locator('.overlay.samsung-dark').isVisible()), '안내는 한 번만');
    // 16차: 설정에서 다시 보기
    await page.goto(`${url}?debug=1&seed=3&fresh=1&nointro=1`);
    await page.waitForFunction(() => '__debug' in window);
    await page.addStyleTag({ content: '.debug{display:none!important}' });
    check(!(await page.locator('.overlay.samsung-dark').isVisible()), '게임 중에도 저절로 다시 뜨지 않음');
    await page.locator('.gear-btn').click();
    check(await page.locator('.overlay.settings .samsung-replay').isVisible(), '설정에 [화면 색이 이상할 때] 버튼 (삼성 인터넷)');
    await page.locator('.overlay.settings .samsung-replay').click();
    check(await page.locator('.overlay.samsung-dark').isVisible(), '누르면 다크 모드 안내가 다시 뜸');
    await page.locator('.overlay.samsung-dark .foot .pbtn').click();
    check(!(await page.locator('.overlay.samsung-dark').isVisible()) && (await page.locator('.overlay.settings').isVisible()), '[확인]을 누르면 설정 화면으로 돌아감');
    check(errors.length === 0, `브라우저 오류 없음 ${errors.join(' / ')}`);
    await ctx.close();
    const chrome = await newCtx();
    const p2 = await chrome.newPage();
    await p2.goto(`${url}?debug=1&seed=3`);
    await p2.waitForFunction(() => '__debug' in window);
    check(!(await p2.locator('.overlay.samsung-dark').isVisible()), '다른 브라우저에서는 안내 없음');
    await p2.goto(`${url}?debug=1&seed=3&fresh=1&nointro=1`);
    await p2.waitForFunction(() => '__debug' in window);
    await p2.addStyleTag({ content: '.debug{display:none!important}' });
    await p2.locator('.gear-btn').click();
    check((await p2.locator('.overlay.settings').isVisible()) && (await p2.locator('.overlay.settings .samsung-replay').count()) === 0, '다른 브라우저 설정에는 다크 모드 안내 버튼 없음');
    await chrome.close();
  }

  // ── 9-2) 무대 밖 빈 곳 채우기 (17차): 화면이 무대보다 넓으면 양옆에 지금 장면을 흐리게 깐다 ──
  {
    const ctx = await browser.newContext({ viewport: { width: 412, height: 700 } });
    const page = await ctx.newPage();
    const errors = watchErrors(page);
    await page.goto(`${url}?debug=1&seed=3&fresh=1&nointro=1`);
    await page.waitForFunction(() => '__debug' in window);
    const bg = () => page.locator('.backdrop').evaluate((el) => (el as HTMLElement).style.backgroundImage);
    const stageBox = await page.locator('.stage').boundingBox();
    check(stageBox !== null && stageBox.x > 10, `세로가 짧은 화면이면 무대 양옆에 빈 곳 (${Math.round(stageBox?.x ?? 0)}px)`);
    check(await page.locator('.backdrop').isVisible(), '빈 곳에는 흐린 배경');
    check((await bg()).includes('art/scene/'), '흐린 배경 = 장면 그림');
    await page.evaluate(() => (window as any).__debug.tab('workshop'));
    await page.waitForTimeout(300);
    check((await bg()).includes('workshop_'), '탭을 바꾸면 흐린 배경도 그 장면으로');
    check(errors.length === 0, `브라우저 오류 없음 ${errors.join(' / ')}`);
    await ctx.close();
  }

  // ── 9-3) 플레이 기록 (18차): 동의 전엔 없음 → 설정에서 동의하면 판 시작·접속 정보가 쌓임. 디버그에서는 보내지 않음 ──
  {
    const ctx = await newCtx();
    const page = await ctx.newPage();
    const errors = watchErrors(page);
    await page.goto(`${url}?debug=1&seed=3&fresh=1&nointro=1`);
    await page.waitForFunction(() => '__debug' in window);
    await page.addStyleTag({ content: '.debug{display:none!important}' });
    const rows = () => page.evaluate(() => (window as any).__debug.app.telemetry.peek() as { type: string; pid: string; gid: string; data: any }[]);
    check((await rows()).length === 0, '동의 전에는 기록이 하나도 없음');
    await page.locator('.gear-btn').click();
    await page.locator('.overlay.settings .set-consent').check();
    await page.locator('.overlay.settings .foot .pbtn.accent').click();
    const r = await rows();
    const types = r.map((x) => x.type);
    check(types[0] === 'game_start' && types.includes('session_begin'), `동의하면 판 시작·접속 정보 (${types.slice(0, 4).join(',')})`);
    const sb = r.find((x) => x.type === 'session_begin')!;
    check(sb.data.entry === 'consent' && sb.data.sessionIndex >= 1 && typeof sb.data.os === 'string' && sb.pid.length >= 16 && sb.gid === '3', '접속 정보: 동의 시점·접속 횟수·기기 분류, 무작위 pid, 판 id = 시드');
    check(!JSON.stringify(r).includes('Mozilla'), '브라우저 전체 문자열(UA) 같은 기기 정보는 담지 않음');
    check(!(await page.evaluate(() => (window as any).__debug.app.telemetry.canSend)), '디버그·개발 서버에서는 보내지 않음');
    check(errors.length === 0, `브라우저 오류 없음 ${errors.join(' / ')}`);
    await ctx.close();
  }

  // ── 10) 시대별 작업 (13차): 2010년대 폰 케이스, 2020년대 블로그 — 배경 1칸 + 작업물 그림 ──
  {
    const ctx = await newCtx();
    const page = await ctx.newPage();
    const errors = watchErrors(page);
    const spriteBg = () => page.evaluate(() => (document.querySelector('.work-sprite') as HTMLElement | null)?.style.backgroundImage ?? '');
    await open(page, '?debug=1&seed=5&fresh=1&nointro=1&era=1');
    await dbg(page, 'tod', 'day');
    await dbg(page, 'tab', 'workshop');
    await page.waitForTimeout(300);
    check(await page.locator('.work-sprite').isVisible() && (await spriteBg()).includes('phone_case_0.png'), '2010년대: 폰 케이스 작업물 (큐빅 0줄)');
    check(((await page.locator('.work-guide').textContent()) ?? '').includes('케이스 100개'), '2010년대 안내: 케이스 100개');
    await page.locator('.doll-hit').dispatchEvent('pointerdown');
    await page.waitForTimeout(200);
    check((await spriteBg()).includes('phone_case_1.png') && ((await page.locator('.workshop .toast-pnl').textContent()) ?? '').includes('큐빅 1줄'), '누르면 큐빅 1줄');
    check(!(await sceneFile(page))!.includes('2000s') && (await sceneFile(page))!.includes('workshop_2010s_day_lv0'), '배경은 작업물 자리를 비운 2010년대 그림');
    await dbg(page, 'tod', 'night');
    await page.waitForTimeout(200);
    check((await spriteBg()).includes('phone_case_1_night.png'), '밤에는 밤 작업물 그림');
    await dbg(page, 'interior', 3);
    await page.waitForTimeout(200);
    const top = await page.evaluate(() => (document.querySelector('.work-sprite') as HTMLElement).style.top);
    check(top === `${(133 - 3) * 3}px`, `3단계부터 책상 자리 (${top})`);
    await open(page, '?debug=1&seed=5&fresh=1&nointro=1&era=2');
    await dbg(page, 'tod', 'day');
    await dbg(page, 'tab', 'workshop');
    await page.waitForTimeout(300);
    check((await spriteBg()).includes('blog_post_0.png') && ((await page.locator('.work-guide').textContent()) ?? '').includes('글 100편'), '2020년대: 블로그 글쓰기, 글 100편');
    let flyColor = '';
    for (let i = 0; i < 3; i++) {
      await page.locator('.doll-hit').dispatchEvent('pointerdown');
      if (i === 2) flyColor = await page.locator('.fly').first().evaluate((el) => getComputedStyle(el).color);
      await page.waitForTimeout(400);
    }
    check(flyColor === 'rgb(242, 176, 46)', `3번 누르면 뜨는 '+코인' 글자는 코인 금색 (낮, ${flyColor})`);
    check(((await page.locator('.workshop .toast-pnl').textContent()) ?? '').includes('발행 1편') && (await spriteBg()).includes('blog_post_0.png'), '3번 누르면 발행 1편, 다음 글은 빈 화면');
    await open(page, '?debug=1&seed=5&fresh=1&nointro=1');
    await dbg(page, 'tab', 'workshop');
    await page.waitForTimeout(300);
    check(!(await page.locator('.work-sprite').isVisible()) && ((await page.locator('.work-guide').textContent()) ?? '').includes('인형 100개'), '2000년대는 그대로 인형 눈 붙이기 (배경 시트)');
    check(errors.length === 0, `브라우저 오류 없음 ${errors.join(' / ')}`);
    await ctx.close();
  }
} finally {
  await browser.close();
  await server.close();
}
if (failures.length > 0) process.exitCode = 1;
