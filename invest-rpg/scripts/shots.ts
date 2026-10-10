// 화면 스크린샷: npm run shots
// 개발 서버를 띄우고(이미 떠 있으면 SHOTS_URL=http://localhost:5173/) 시안과 같은 390×844로
// 거실(밤 Lv0 / 낮 Lv3 / 밤 Lv7 + 강아지 배 까기), 주식창(밤·낮, 주문 패널, 뉴스 + 주가 리포트), 작업실(밤 Lv0 / 낮 Lv5),
// TV홈쇼핑, 처음 안내, 설정, 시대 정산 창을 찍고, 작은 화면(360×640)에서 주식창 하나를 더 찍는다.
// 결과: shots/<번호>_<이름>.png — 시안(final_jpg2.zip)과 나란히 놓고 비교하기 위한 것
//
// 디버그 기능(window.__debug)으로 시간을 건너뛰므로 2시간을 기다리지 않는다. 시드 고정(7)이라 매번 같은 화면.

import { chromium, type Page } from 'playwright';
import { createServer } from 'vite';

declare const process: {
  env: Record<string, string | undefined>;
  exitCode?: number;
  getBuiltinModule(id: 'node:fs'): { mkdirSync(path: string, o: { recursive: boolean }): void };
};

const fs = process.getBuiltinModule('node:fs');

async function dbg(page: Page, fn: string, ...args: unknown[]): Promise<void> {
  await page.evaluate(
    ([f, a]) => {
      const d = (window as unknown as { __debug: Record<string, (...x: unknown[]) => unknown> }).__debug;
      d[f]!(...(a as unknown[]));
    },
    [fn, args] as const,
  );
  await page.waitForTimeout(250);
}

/** 강아지를 n번 누른다 (연속 터치 1.5초 안) */
async function petDog(page: Page, n: number): Promise<void> {
  for (let i = 0; i < n; i++) {
    await page.locator('.dog-hit').dispatchEvent('pointerdown');
    await page.waitForTimeout(80);
  }
}

async function run(): Promise<void> {
  let url = process.env.SHOTS_URL;
  const server = url ? null : await createServer({ server: { port: 5199, strictPort: false }, logLevel: 'error' });
  if (server) {
    await server.listen();
    url = server.resolvedUrls?.local[0] ?? 'http://localhost:5199/';
  }
  const browser = await chromium.launch();
  const saved: string[] = [];
  const errors: string[] = [];
  fs.mkdirSync('shots', { recursive: true });
  let n = 0;
  const open = async (width: number, height: number, query: string) => {
    const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => {
      if (m.type() === 'error' && !m.text().includes('fonts.g')) errors.push(m.text());
    });
    await page.goto(`${url}?debug=1&seed=7&fresh=1${query}`);
    await page.waitForFunction(() => '__debug' in window);
    // 디버그 패널은 사진에서 숨긴다
    await page.addStyleTag({ content: '.debug{display:none!important}' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(400);
    return { ctx, page };
  };
  const shot = async (page: Page, name: string) => {
    const file = `shots/${String(++n).padStart(2, '0')}_${name}.png`;
    await page.waitForTimeout(300);
    await page.screenshot({ path: file });
    saved.push(file);
  };

  try {
    // 첫 화면(역전의 방) → 새로하기 → 튜토리얼 첫 장(김역전의 이야기)
    {
      const { ctx, page } = await open(390, 844, '');
      await dbg(page, 'tod', 'night');
      await shot(page, 'title_night');
      await page.locator('.title-buttons .pbtn').nth(1).click();
      await shot(page, 'tutorial_story');
      await ctx.close();
      const { ctx: c2, page: p2 } = await open(390, 844, '');
      await dbg(p2, 'tod', 'day');
      await p2.evaluate(() => localStorage.setItem('invest-rpg.save', JSON.stringify({ version: 2, tutorialCompleted: false, telemetryConsent: false, game: {} })));
      await p2.reload();
      await p2.waitForFunction(() => '__debug' in window);
      await p2.addStyleTag({ content: '.debug{display:none!important}' });
      await dbg(p2, 'tod', 'day');
      await p2.locator('.title-buttons .pbtn').nth(1).click();
      await shot(p2, 'title_day_confirm_new');
      await c2.close();
    }
    const { ctx, page } = await open(390, 844, '&nointro=1');

    // 거실 밤 Lv0 (NEWS!)
    await dbg(page, 'tod', 'night');
    await dbg(page, 'tab', 'living_room');
    await dbg(page, 'nextNews');
    await shot(page, 'living_night_lv0');

    // 거실 낮 Lv3
    await dbg(page, 'tod', 'day');
    await dbg(page, 'interior', 3);
    await page.waitForTimeout(600);
    await shot(page, 'living_day_lv3');

    // 현금이 모자랄 때 인테리어 안내
    await dbg(page, 'tab', 'trading');
    await dbg(page, 'openStock', 0);
    await page.locator('.qty-row .max').click();
    await page.locator('.trade-row .buy').click();
    await dbg(page, 'tab', 'living_room');
    await page.waitForTimeout(2500);
    await dbg(page, 'tod', 'day');
    await page.locator('.upgrade .pbtn').click();
    await shot(page, 'living_cash_short');
    await dbg(page, 'tod', 'night');


    // 거실 밤 Lv7 + 강아지 5번 연속 터치 → 배 까기 + 하트
    await dbg(page, 'tod', 'night');
    await dbg(page, 'interior', 4);
    await page.waitForTimeout(600);
    await petDog(page, 5);
    await shot(page, 'living_night_lv7_belly');

    // 작업실 밤 Lv7: 인형 2개 완성 + 눈 1개 → 지급 예정 +6
    await dbg(page, 'tab', 'workshop');
    await dbg(page, 'workTouches', 7);
    await shot(page, 'workshop_night_lv7');

    // TV홈쇼핑 (방송 준비 중, 눌린 회색 탭)
    await dbg(page, 'tab', 'tv_shopping');
    await shot(page, 'tv_night_lv7');

    // 주식창: 뉴스 2개 + 120초 뒤 리포트, 종목 하나 열고 '최대'
    await dbg(page, 'tab', 'trading');
    await dbg(page, 'advanceSeconds', 125);
    await dbg(page, 'nextNews');
    await dbg(page, 'advanceSeconds', 125);
    await shot(page, 'trading_night_list');
    await dbg(page, 'openStock', 2);
    await page.locator('.qty-row .max').click();
    await shot(page, 'trading_night_order');
    await dbg(page, 'tod', 'day');
    await page.waitForTimeout(400);
    await shot(page, 'trading_day_order');

    // 2배속 → 다른 탭 코인 칩에 ▶▶
    await page.locator('.speeds .pbtn').nth(1).click();
    await dbg(page, 'tab', 'living_room');
    await shot(page, 'living_day_lv7_x2');

    // 설정 창
    await page.locator('.gear-btn').click();
    await shot(page, 'settings');
    await page.locator('.overlay.settings .foot .pbtn').click();

    // 시대 정산 창
    await dbg(page, 'endEra');
    await page.waitForSelector('.overlay.settlement');
    await shot(page, 'settlement');
    await ctx.close();

    // 작업실 낮 Lv0 (시안과 같은 단계), 작은 화면 주식창
    {
      const { ctx: c2, page: p2 } = await open(390, 844, '&nointro=1');
      await dbg(p2, 'tod', 'day');
      await dbg(p2, 'tab', 'workshop');
      await dbg(p2, 'workTouches', 7);
      await dbg(p2, 'nextNews');
      await shot(p2, 'workshop_day_lv0');
      await dbg(p2, 'interior', 2);
      await p2.waitForTimeout(500);
      await shot(p2, 'workshop_day_lv2');
      await dbg(p2, 'tod', 'night');
      await dbg(p2, 'interior', 2);
      await shot(p2, 'workshop_night_lv4');
      await c2.close();
      const { ctx: c3, page: p3 } = await open(360, 640, '&nointro=1');
      await dbg(p3, 'tod', 'night');
      await dbg(p3, 'nextNews');
      await dbg(p3, 'openStock', 0);
      await shot(p3, 'small_360x640_trading');
      await c3.close();
    }
  } finally {
    await browser.close();
    await server?.close();
  }
  if (errors.length > 0) {
    console.error(`브라우저 오류:\n  ${errors.join('\n  ')}`);
    process.exitCode = 1;
  }
  console.log(`스크린샷 ${saved.length}장:\n  ${saved.join('\n  ')}`);
}

await run();
