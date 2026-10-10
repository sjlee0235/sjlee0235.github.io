// 디버그 패널 (?debug=1). 개발 서버와 시험판 빌드(npm run build:play)에서만 들어가고, 정식 빌드에서는 코드째 빠진다.
// 2시간을 기다리지 않고 확인하기 위한 것: 시드 고정, 시대 선택, 시간 10배, 다음 뉴스까지 건너뛰기, 코인 지급,
// 밤/낮 바꾸기, 인형 터치 몰아 하기.
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
  /** 밤/낮 고정 (null = 현지 시각) */
  tod(t: 'night' | 'day' | null): void;
  /** 인테리어를 n단계 올림 (모자라는 코인은 지급) */
  interior(n: number): void;
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
      const base = Date.now() + 1000;
      for (let i = 0; i < n; i++) app.game.workTouch(base + i * 200);
      app.persist(true);
      app.debugRefresh();
    },
    tod: (t) => app.forceTod(t),
    interior: (n) => {
      for (let i = 0; i < n; i++) {
        const cost = app.game.interiorNextCost;
        if (cost === null) break;
        if (app.game.cash < cost) app.game.deposit(cost - app.game.cash, 'other');
        app.game.upgradeInterior();
      }
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
    const b = h('button', {}, label);
    b.addEventListener('click', fn);
    return b;
  };
  let tod: 'night' | 'day' | null = null;
  const body = h(
    'div',
    { class: 'debug-body', hidden: true },
    h('div', {}, 'seed ', seedInput),
    h('div', {}, 'era ', eraSel),
    btn('새 게임 (저장 지우고)', () => go({ seed: seedInput.value, era: eraSel.value, fresh: '1' })),
    btn('시간 ×10 켜기/끄기', () => {
      fast = !fast;
      api.setTimeScale(fast ? 10 : 1);
    }),
    btn('다음 뉴스까지', () => api.nextNews()),
    btn('+5분', () => api.advanceSeconds(300)),
    btn('시대 끝내기', () => api.endEra()),
    btn('+1000코인', () => api.coins(1000)),
    btn('인형 터치 ×30', () => api.workTouches(30)),
    btn('인테리어 +1단계', () => api.interior(1)),
    btn('밤/낮 바꾸기', () => {
      tod = tod === 'night' ? 'day' : 'night';
      api.tod(tod);
    }),
  );
  const panel = h('div', { class: 'debug' }, h('button', { onclick: () => (body.hidden = !body.hidden) }, 'DEBUG'), body);
  document.body.append(panel);
  return api;
}
