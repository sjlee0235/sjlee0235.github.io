// 화면 스크린샷: npm run shots
// 개발 서버를 띄우고(이미 떠 있으면 SHOTS_URL=http://localhost:5173/), 휴대폰 크기 두 가지(360×640, 390×844)로
// 4개 탭, 주문 패널, 리포트 행이 붙은 뉴스 피드, 작업실 정산 예정 카운터, 설정, 시대 정산 창을 찍는다.
// 결과: shots/<크기>/<번호>_<이름>.png
//
// 디버그 패널 기능(window.__debug)으로 시간을 건너뛰므로 2시간을 기다리지 않는다. 시드 고정(7)이라 매번 같은 화면.

import { chromium, type Page } from 'playwright';
import { createServer } from 'vite';

declare const process: {
  env: Record<string, string | undefined>;
  exitCode?: number;
  getBuiltinModule(id: 'node:fs'): { mkdirSync(path: string, o: { recursive: boolean }): void };
};

const fs = process.getBuiltinModule('node:fs');
const VIEWPORTS = [
  { name: '360x640', width: 360, height: 640 },
  { name: '390x844', width: 390, height: 844 },
];

type Dbg = {
  nextNews(): number;
  advanceSeconds(s: number): number;
  endEra(): number;
  openStock(i: number): void;
  tab(id: string): void;
  workTouches(n: number): void;
  setTimeScale(n: number): void;
};

async function dbg(page: Page, fn: string, ...args: unknown[]): Promise<void> {
  await page.evaluate(
    ([f, a]) => {
      const d = (window as unknown as { __debug: Record<string, (...x: unknown[]) => unknown> }).__debug;
      d[f as keyof Dbg]!(...(a as unknown[]));
    },
    [fn, args] as const,
  );
  await page.waitForTimeout(150);
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
  try {
    for (const vp of VIEWPORTS) {
      const dir = `shots/${vp.name}`;
      fs.mkdirSync(dir, { recursive: true });
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
      const page = await ctx.newPage();
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      page.on('console', (m) => {
        if (m.type() === 'error') errors.push(m.text());
      });
      await page.goto(`${url}?debug=1&seed=7&fresh=1`);
      await page.waitForFunction(() => '__debug' in window);
      // 디버그 패널은 사진에서 숨긴다
      await page.addStyleTag({ content: '.debug-panel{display:none!important}' });
      let n = 0;
      const shot = async (name: string) => {
        const file = `${dir}/${String(++n).padStart(2, '0')}_${name}.png`;
        await page.screenshot({ path: file });
        saved.push(file);
      };

      // 1) 거실: 안 읽은 뉴스가 있으면 왼쪽 위 NEWS!
      await dbg(page, 'tab', 'living_room');
      await dbg(page, 'nextNews');
      await shot('living_room_news_badge');

      // 2) 작업실: 인형 2개 완성 + 눈 1개 → 정산 예정 +6
      await dbg(page, 'tab', 'workshop');
      await dbg(page, 'workTouches', 7);
      await shot('workshop_pending');

      // 3) TV홈쇼핑 (방송 준비 중)
      await dbg(page, 'tab', 'tv_shopping');
      await page.waitForTimeout(200);
      await shot('tv_shopping');

      // 4) 주식창: 뉴스 2개 + 120초 뒤 리포트 행
      await dbg(page, 'tab', 'trading');
      await dbg(page, 'advanceSeconds', 125);
      await dbg(page, 'nextNews');
      await dbg(page, 'advanceSeconds', 125);
      await shot('trading_feed_report');

      // 5) 이전 뉴스를 눌러 펼침 (리포트까지)
      const closed = page.locator('.news.closed .news-head').first();
      if (await closed.count()) await closed.click();
      await page.waitForTimeout(150);
      await shot('trading_feed_expanded');

      // 6) 주문 패널 (종목을 누름) + '최대'
      await dbg(page, 'openStock', 2);
      await page.locator('.op-max').click();
      await page.waitForTimeout(150);
      await shot('trading_order_panel');

      // 7) 2배속 + 다른 탭의 x2 표시
      await page.locator('.speed').nth(1).click();
      await dbg(page, 'tab', 'living_room');
      await shot('living_room_x2');

      // 8) 설정 창
      await page.locator('.gear').click();
      await page.waitForTimeout(150);
      await shot('settings');
      await page.locator('.overlay.settings .btn.primary').click();

      // 9) 시대 종료 정산 창 (투자 결과 + 작업 수입 = 합계)
      await dbg(page, 'endEra');
      await page.waitForSelector('.overlay.settlement');
      await shot('settlement');

      if (errors.length > 0) {
        console.error(`[${vp.name}] 브라우저 오류:\n  ${errors.join('\n  ')}`);
        process.exitCode = 1;
      }
      await ctx.close();
    }
  } finally {
    await browser.close();
    await server?.close();
  }
  console.log(`스크린샷 ${saved.length}장:\n  ${saved.join('\n  ')}`);
}

await run();
