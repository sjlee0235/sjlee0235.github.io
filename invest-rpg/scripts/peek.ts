// 화면 몇 장 빨리 찍기 (개발용): node scripts/peek.ts "<주소 옵션>" "tab:trading;nextNews;shot:a;click:.list-tab"
import { chromium } from 'playwright';
import { createServer } from 'vite';
declare const process: { argv: string[] };
const server = await createServer({ server: { port: 5197 }, logLevel: 'error' });
await server.listen();
const url = server.resolvedUrls!.local[0]!;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errs: string[] = [];
p.on('pageerror', (e) => errs.push(String(e)));
const q = process.argv[2] ?? '';
await p.goto(`${url}?debug=1&seed=7&fresh=1&nointro=1${q}`);
await p.waitForFunction(() => '__debug' in window);
await p.addStyleTag({ content: '.debug{display:none!important}' });
const d = (f: string, ...a: unknown[]) => p.evaluate(([f, a]) => (window as any).__debug[f as string](...(a as unknown[])), [f, a] as const);
const steps = (process.argv[3] ?? '').split(';').filter(Boolean);
let i = 0;
for (const st of steps) {
  const [cmd, ...args] = st.split(':');
  if (cmd === 'shot') await p.screenshot({ path: `shots/peek_${args[0] ?? i++}.png` });
  else if (cmd === 'click') await p.locator(args.join(':')).first().click();
  else if (cmd === 'wait') await p.waitForTimeout(Number(args[0]));
  else await d(cmd!, ...args.map((x) => (/^-?\d+$/.test(x) ? Number(x) : x)));
  await p.waitForTimeout(200);
}
console.log(errs.join('\n') || 'no errors');
await b.close();
await server.close();
