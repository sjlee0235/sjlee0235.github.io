// 개발 전용 디버그 패널 (?debug=1). 운영 빌드에서는 main.ts의 import.meta.env.DEV 검사로 코드째 빠진다.
// 2시간을 기다리지 않고 확인하기 위한 것: 시드 고정, 시대 선택, 시간 10배, 다음 뉴스까지 건너뛰기, 코인 지급.
// 스크린샷 스크립트(npm run shots)도 window.__debug로 이 기능을 쓴다.

import type { App } from './app.ts';
import { h } from './dom.ts';

export interface DebugApi {
  app: App;
  /** 다음 뉴스가 발표될 때까지 시간을 건너뛴다 */
  nextNews(): number;
  /** 게임 시간 n초 진행 */
  advanceSeconds(sec: number): number;
  /** 시대 끝까지 */
  endEra(): number;
  coins(amount: number): void;
  setTimeScale(n: number): void;
  openStock(index: number): void;
  tab(id: 'living_room' | 'trading' | 'workshop' | 'tv_shopping'): void;
  workTouches(n: number): void;
}

export function mountDebug(app: App, info: { seed: number; eraNames: string[] }): DebugApi {
  const api: DebugApi = {
    app,
    nextNews: () => app.debugAdvance(5000, (r) => r.advanced && r.news !== null),
    advanceSeconds: (sec) => app.debugAdvance(Math.ceil(sec / 5)),
    endEra: () => app.debugAdvance(100000),
    coins: (amount) => {
      app.game.deposit(amount, 'other');
      app.persist(true);
      app.debugRefresh();
    },
    setTimeScale: (n) => app.loop.setTimeScale(n),
    openStock: (index) => {
      const s = app.game.getStockList()[index];
      if (s) app.tradingScreen.openOrder(s.id);
    },
    tab: (id) => app.selectTab(id),
    workTouches: (n) => {
      // 초당 터치 상한을 넘지 않게 가상 시각을 200ms씩 띄운다
      const base = Date.now();
      for (let i = 0; i < n; i++) app.game.workTouch(base + i * 200);
      app.persist(true);
      app.debugRefresh();
    },
  };
  (window as unknown as { __debug: DebugApi }).__debug = api;

  const params = new URLSearchParams(window.location.search);
  const go = (changes: Record<string, string | null>) => {
    for (const [k, v] of Object.entries(changes)) {
      if (v === null) params.delete(k);
      else params.set(k, v);
    }
    window.location.search = params.toString();
  };
  const seedInput = h('input', { type: 'number', value: info.seed, class: 'dbg-seed' });
  const eraSel = h('select', {}, ...info.eraNames.map((e, i) => h('option', { value: i }, e)));
  eraSel.value = params.get('era') ?? '0';
  let fast = false;
  const btn = (label: string, fn: () => void) => {
    const b = h('button', { class: 'btn small' }, label);
    b.addEventListener('click', fn);
    return b;
  };
  const panel = h(
    'div',
    { class: 'debug-panel min' },
    h('button', { class: 'dbg-title', onclick: () => panel.classList.toggle('min') }, 'DEBUG'),
    h('div', { class: 'dbg-row' }, 'seed ', seedInput, ' era ', eraSel, btn('새 게임', () => go({ seed: seedInput.value, era: eraSel.value, fresh: '1' }))),
    h(
      'div',
      { class: 'dbg-row' },
      btn('×10', () => {
        fast = !fast;
        api.setTimeScale(fast ? 10 : 1);
      }),
      btn('다음 뉴스', () => api.nextNews()),
      btn('+5분', () => api.advanceSeconds(300)),
      btn('시대 끝', () => api.endEra()),
      btn('+1000코인', () => api.coins(1000)),
    ),
  );
  document.body.append(panel);
  return api;
}
