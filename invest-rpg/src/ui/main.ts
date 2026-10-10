// 화면 시작점 (npm run dev → http://localhost:5173/)
//
// 시대 데이터: 진행 순서(eraSequence.json) 중 콘텐츠가 있는 시대만 쓴다 (지금은 2000년대 하나).
// 주소 옵션 (개발 서버·시험판 빌드에서만): ?debug=1 디버그 패널, &seed=7 시드 고정, &era=1 시대 선택, &fresh=1 저장 무시,
//   &virtual=1 아직 콘텐츠가 없는 시대(2010s·2020s)를 개발용 가상 데이터로 채워 3시대로 (화면에 "VIRTUAL DATA")

import { ALL_ERAS, ERA_SEQUENCE, orderBySequence } from '../data/eras/index.ts';
import type { Era } from '../data/schema.ts';
import { makeSpecEra } from '../dev/specEra.ts';
import { localize } from '../i18n/index.ts';
import { App } from './app.ts';
import { browserClock } from './loop.ts';
import { BrowserStorage } from './storage.ts';
import './style.css';

function virtualEra(id: string, i: number): Era {
  // 진행 순서는 엔진이 order 값으로 정렬한다 → 실제 시대(2000s = 2000)와 같은 규칙으로 연도를 쓴다
  const order = Number.parseInt(id, 10) || 9000 + i;
  const era = makeSpecEra({ id, order, seed: 11 + i });
  const year = id.replace('s', '');
  return { ...era, displayName: { ko: `${year}년대 (가상 데이터)`, en: `${id} (virtual data)` } };
}

function randomSeed(): number {
  const a = new Uint32Array(1);
  crypto.getRandomValues(a);
  return a[0]! >>> 1;
}

const params = new URLSearchParams(window.location.search);
const debug = (import.meta.env.DEV || import.meta.env.VITE_PLAYTEST === '1') && params.has('debug');
const real = orderBySequence(ALL_ERAS);
const withVirtual = debug && params.has('virtual');
const eras = withVirtual ? ERA_SEQUENCE.map((id, i) => real.find((e) => e.id === id) ?? virtualEra(id, i)) : real;
const virtualIds = new Set(eras.filter((e) => !real.includes(e)).map((e) => e.id));
const seedParam = debug ? Number(params.get('seed')) : NaN;
const eraParam = debug ? Number(params.get('era')) : NaN;

const app = new App({
  root: document.getElementById('app')!,
  eras,
  seed: Number.isFinite(seedParam) && seedParam > 0 ? seedParam : randomSeed(),
  storage: new BrowserStorage(),
  clock: browserClock,
  now: () => Date.now(),
  assetBase: import.meta.env.BASE_URL,
  isVirtual: (eraId: string) => virtualIds.has(eraId),
  ...(Number.isFinite(eraParam) && eraParam > 0 ? { startEraIndex: eraParam } : {}),
  fresh: debug && params.has('fresh'),
  skipIntro: debug && params.has('nointro'),
});
app.start();

if (debug) {
  void import('./debug.ts').then(({ mountDebug }) =>
    mountDebug(app, { seed: app.seed, eraNames: eras.map((e) => localize(e.displayName, 'ko')) }),
  );
}
