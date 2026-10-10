// 화면 흐름 점검 (브라우저): npm run e2e
// 1) 첫 화면(역전의 방): 새로하기 → 튜토리얼(김역전 이야기) → 기록 동의(기본 꺼짐) → 게임, 이어하기, 저장이 있을 때 새로하기 확인 창
// 2) 앱 업데이트로 시대 중간에 정산된 뒤 '확인' → 다음 시대가 실제로 흘러간다 (가상 3시대)
// 3) 마지막 시대까지 끝낸 판을 다시 열면 최종 요약이 보이고, 새 판이 저장되지 않는다
// 4) 숨긴 탭에서 열면 처음부터 일시정지
// 5) 매매: 종목 누르기 → 최대 → [매수] 바로 체결 → 즐겨찾기 맨 위 → [매도]로 전량 매도, NEWS! → 주식창
// 6) 인테리어: 현금 2,000코인 내고 한 단계, 배경 그림이 바뀌고 다시 열어도 그대로, 현금이 모자라면 매도 안내
// 7) 작업실: 인형 100개째에 바로 지급 → 지급 예정 +0, 완성 0개
// 8) 강아지 5번 연속 터치 → 배 까기 + 하트, 밤/낮 바꾸기
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
    await page.locator('.overlay.tutorial .foot .pbtn').nth(1).click();
    await page.locator('.overlay.tutorial .foot .pbtn').nth(1).click();
    await page.locator('.overlay.tutorial .foot .pbtn').nth(1).click(); // 시작하기
    check(await page.locator('.overlay.consent').isVisible(), '튜토리얼 다음에 플레이 기록 동의 창 (처음 한 번)');
    await page.locator('.overlay.consent .foot .pbtn').first().click(); // 동의하지 않음
    check(!(await game<boolean>(page, 'g.telemetryConsent')), '동의하지 않으면 기록 꺼짐 (기본)');
    await dbg(page, 'setTimeScale', 10);
    await page.waitForTimeout(1500);
    const left = await game<number>(page, 'g.remainingSeconds');
    check(left < 7200, '시작하면 시간이 흐른다');
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
    check(!(await page.locator('.overlay.consent').isVisible()), '동의는 처음 한 번만 묻는다');
    check((await game<number>(page, 'g.remainingSeconds')) === 7200 && (await game<number>(page, 'g.cash')) === 10_000, '새로하기: 처음부터 (2:00:00, 10,000코인)');
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

  // ── 3) 끝난 판 다시 열기 → 최종 요약 (2000년대 한 시대) ──
  {
    const ctx = await newCtx(360, 640);
    const page = await ctx.newPage();
    const errors = watchErrors(page);
    await open(page, '?debug=1&seed=6&fresh=1&nointro=1');
    await dbg(page, 'endEra');
    await page.waitForSelector('.overlay.settlement');
    await page.locator('.overlay.settlement .foot .pbtn').click();
    check(await page.locator('.overlay.final').isVisible(), '2000년대 정산 뒤 최종 요약');
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
    await page.locator('.qty-row .max').click();
    const qty = Number(await page.locator('.qty-box input').inputValue());
    await page.locator('.trade-row .buy').click();
    await page.waitForTimeout(150);
    const toast = (await page.locator('.toast').last().textContent()) ?? '';
    check(toast.includes(`${qty}주 매수`), `최대(${qty}주) [매수] 바로 체결 안내: "${toast}"`);
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
    await page.locator('.stock-scroll.mine .row.hold[data-id]').click(); // 같은 종목이 열려 있으면 닫힘
    await page.locator('.stock-scroll.mine .row.hold[data-id]').click();
    check(await page.locator('.order-pnl').isVisible() && ((await page.locator('.order-head .nm').textContent()) ?? '') === name, '내 계좌에서 종목을 누르면 주문 패널');
    await page.locator('.qty-row .max').click(); // 더 살 수 없으면 '최대' = 보유 수량
    check(Number(await page.locator('.qty-box input').inputValue()) === qty, '살 수 없을 때 최대 = 보유 수량 전부');
    await page.locator('.trade-row .sell').click();
    await page.waitForTimeout(150);
    check((await game<number>(page, 'g.getPortfolio().holdings.length')) === 0, '[매도]로 전량 매도 뒤 보유 종목 없음');
    check(await page.locator('.mine-empty').isVisible(), '다 팔면 내 계좌에 "아직 보유한 종목이 없어요"');
    await page.locator('.list-tab').first().click();
    await dbg(page, 'tab', 'living_room');
    await dbg(page, 'nextNews');
    await page.waitForTimeout(100);
    check(await page.locator('.news-chip').isVisible(), '거실에서 안 읽은 뉴스가 있으면 NEWS!');
    await page.locator('.news-chip').click();
    check((await page.getAttribute('.stage', 'data-tab')) === 'trading', 'NEWS!를 누르면 주식창으로');
    check((await page.locator('.news-win .ni').count()) >= 1, '주식창 뉴스 창에 뉴스가 있다');
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
    check((await game<number>(page, 'g.interiorLevel')) === 1 && (await game<number>(page, 'g.cash')) === 8000, '업그레이드: 2,000코인 내고 Lv1');
    check((await sceneFile(page))!.endsWith('_lv1.png'), '배경 그림이 Lv1로 바뀐다');
    check((await page.locator('.pip.on').count()) === 1, '단계 점 1개 채움');
    await page.locator('.upgrade .pbtn').click();
    await page.locator('.upgrade .pbtn').click();
    await page.locator('.upgrade .pbtn').click();
    await page.locator('.upgrade .pbtn').click(); // 10,000코인 = 5단계, 현금 0
    await page.waitForTimeout(150);
    check((await game<number>(page, 'g.interiorLevel')) === 5 && (await game<number>(page, 'g.cash')) === 0, `현금만큼만 올라간다 (Lv${await game<number>(page, 'g.interiorLevel')})`);
    await page.locator('.upgrade .pbtn').click();
    await page.waitForTimeout(150);
    check(((await page.locator('.toast').last().textContent()) ?? '') === '현금이 부족합니다. 주식을 매도해 현금을 확보하세요.', '현금이 모자라면 매도 안내');
    check(await page.locator('.upgrade .pbtn.poor').isVisible(), '코인이 모자라면 버튼이 흐려진다');
    await open(page, '?debug=1&seed=10&nointro=1');
    check((await game<number>(page, 'g.interiorLevel')) === 5, '다시 열어도 인테리어 단계 그대로');
    await dbg(page, 'tab', 'workshop');
    await page.waitForTimeout(300);
    check((await sceneFile(page))!.includes('workshop_2000s_') && (await sceneFile(page))!.endsWith('_lv5.png'), '작업실 그림도 같은 단계');
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
    check((await game<number>(page, '7200 - g.remainingSeconds')) === 180, '첫 뉴스는 3분(180초)');
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
} finally {
  await browser.close();
  await server.close();
}
if (failures.length > 0) process.exitCode = 1;
