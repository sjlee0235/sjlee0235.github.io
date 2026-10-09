// 화면 흐름 점검 (브라우저): npm run e2e
// 1) 앱 업데이트로 시대 중간에 정산된 뒤 '확인' → 다음 시대가 실제로 흘러간다
// 2) 마지막 시대까지 끝낸 판을 다시 열면 최종 요약이 보이고, 새 판이 저장되지 않는다
// 3) 숨긴 탭에서 열면 처음부터 일시정지
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

async function open(page: Page, query: string) {
  await page.goto(`${url}${query}`);
  await page.waitForFunction(() => '__debug' in window);
  // 디버그 패널이 정산 창 버튼을 가리지 않게 숨긴다 (기능은 window.__debug로 씀)
  await page.addStyleTag({ content: '.debug-panel{display:none!important}' });
}
const dbg = (page: Page, fn: string, ...args: unknown[]) =>
  page.evaluate(([f, a]) => (window as unknown as { __debug: Record<string, (...x: unknown[]) => unknown> }).__debug[f as string]!(...(a as unknown[])), [fn, args] as const);
const remaining = (page: Page) => page.evaluate(() => (window as unknown as { __debug: { app: { game: { remainingSeconds: number } } } }).__debug.app.game.remainingSeconds);
const phase = (page: Page) => page.evaluate(() => (window as unknown as { __debug: { app: { game: { phase: string; eraId: string } } } }).__debug.app.game.phase);
const eraId = (page: Page) => page.evaluate(() => (window as unknown as { __debug: { app: { game: { eraId: string } } } }).__debug.app.game.eraId);

try {
  // ── 1) 앱 업데이트 정산 → 다음 시대 진행 ──
  {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 640 } });
    const page = await ctx.newPage();
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await open(page, '?debug=1&seed=5&fresh=1');
    await dbg(page, 'advanceSeconds', 900);
    await dbg(page, 'coins', 1); // 저장 신호
    // 저장된 세이브의 엔진 버전을 옛 값으로 바꿔 "앱 업데이트"를 흉내 낸다
    await page.evaluate(() => {
      // 페이지를 떠날 때(visibilitychange) 저장이 다시 일어나지 않게 막고 나서 고친다
      (window as unknown as { __debug: { app: { saveLocked: boolean } } }).__debug.app.saveLocked = true;
      const s = JSON.parse(localStorage.getItem('invest-rpg.save')!);
      s.game.engineVersion = '0.0.0-old';
      localStorage.setItem('invest-rpg.save', JSON.stringify(s));
    });
    await open(page, '?debug=1&seed=5');
    check(await page.locator('.overlay.settlement').isVisible(), '업데이트 후 열면 정산 창이 뜬다');
    await page.locator('.st-confirm').click();
    check(!(await page.locator('.overlay.final').isVisible()), '정산 확인 뒤 최종 요약이 아니라 다음 시대');
    check((await eraId(page)) === '2010s' && (await phase(page)) === 'running', `다음 시대 진행 중 (${await eraId(page)}, ${await phase(page)})`);
    await dbg(page, 'setTimeScale', 10);
    const before = await remaining(page);
    await page.waitForTimeout(1200);
    check((await remaining(page)) < before, '정산 뒤 시간이 실제로 흐른다 (루프 시작됨)');
    check(errors.length === 0, `브라우저 오류 없음 ${errors.join(' / ')}`);
    await ctx.close();
  }

  // ── 2) 끝난 판 다시 열기 → 최종 요약 ──
  {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 640 } });
    const page = await ctx.newPage();
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await open(page, '?debug=1&seed=6&fresh=1');
    for (let i = 0; i < 3; i++) {
      await dbg(page, 'endEra');
      await page.waitForSelector('.overlay.settlement');
      await page.locator('.st-confirm').click();
    }
    check(await page.locator('.overlay.final').isVisible(), '마지막 정산 뒤 최종 요약');
    const saved = await page.evaluate(() => localStorage.getItem('invest-rpg.save'));
    await open(page, '?debug=1&seed=6');
    check(await page.locator('.overlay.final').isVisible(), '끝난 판을 다시 열면 최종 요약이 보인다');
    await page.waitForTimeout(300);
    const after = await page.evaluate(() => localStorage.getItem('invest-rpg.save'));
    check(after === saved, '다시 열어도 세이브를 새 판으로 덮어쓰지 않는다');
    check(errors.length === 0, `브라우저 오류 없음 ${errors.join(' / ')}`);
    await ctx.close();
  }

  // ── 3) 숨긴 탭에서 열기 ──
  {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 640 } });
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    });
    await open(page, '?debug=1&seed=8&fresh=1');
    const paused = await page.evaluate(() => (window as unknown as { __debug: { app: { game: { isPaused: boolean } } } }).__debug.app.game.isPaused);
    check(paused, '숨긴 탭에서 열면 처음부터 일시정지');
    await ctx.close();
  }
} finally {
  await browser.close();
  await server.close();
}
if (failures.length > 0) process.exitCode = 1;
