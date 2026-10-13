// 탭 위에 뜨는 창: 시대 종료 정산, 최종 요약, 설정, 플레이 기록 동의.
// 시안이 없는 창이라 시안의 도트 패널·버튼·글꼴·색 토큰으로 만든다 (DESIGN_HANDOFF 11.5).
// 정산 창은 시대가 끝났을 때만 (시간이 이미 멈춘 상태). 플레이 중에 시간을 멈추는 창은 없다.

import type { Locale } from '../data/schema.ts';
import type { FinalSummary, WorkStatus } from '../engine/game.ts';
import type { PublicEraDebrief, PublicSettlement } from '../engine/publicView.ts';
import { localize, t as tr } from '../i18n/index.ts';
import type { AppSettings } from '../settings/settings.ts';
import { h } from './dom.ts';
import { face, pbtn, pnl } from './kit.ts';
import { titleSvg } from './title.ts';
import { finalView, settlementView } from './viewModels.ts';

type Child = Node | string | null | undefined | false;

/** 가운데 창: 머리줄 + 내용(스크롤) + 아래 버튼들 */
export function dialog(cls: string, title: string, body: Child[], buttons: HTMLButtonElement[]): HTMLElement {
  return h(
    'div',
    { class: `overlay ${cls}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
    pnl('dialog', h('div', { class: 'hd' }, title), h('div', { class: 'body' }, ...body), buttons.length ? h('div', { class: 'foot' }, ...buttons) : null),
  );
}

const kv = (k: string, v: Child, cls = '') => h('div', { class: `kv ${cls}` }, h('span', { class: 'k' }, k), h('span', { class: 'v' }, v));

// ───────── 시대 종료 정산 ─────────

export function settlementOverlay(
  s: PublicSettlement,
  debrief: PublicEraDebrief | null,
  work: Pick<WorkStatus, 'pending' | 'batchDolls' | 'batchSize'> | null,
  locale: Locale,
  onConfirm: () => void,
): HTMLElement {
  const t = (k: string, p?: Record<string, string | number>) => tr(locale, k, p);
  const v = settlementView(s, work, locale);
  const ok = pbtn('accent', t('common.confirm'));
  ok.addEventListener('click', onConfirm);
  return dialog(
    'settlement',
    v.title,
    [
      v.versionChange ? h('p', { class: 'note' }, v.versionChange) : null,
      kv(t('settlement.investment'), h('span', {}, `${t('common.coin', { amount: v.investment.coins })} `, h('span', { class: v.investment.dir }, `(${v.investment.pct})`))),
      kv(t('settlement.workPaid'), t('common.coin', { amount: v.workIncome })),
      v.interior ? kv(t('settlement.interiorSpent'), t('common.coin', { amount: v.interior })) : null,
      kv(t('settlement.nextStart'), t('common.coin', { amount: v.total }), 'big'),
      h('p', { class: 'note' }, t('settlement.liquidated')),
      v.pendingNote ? h('p', { class: 'note' }, v.pendingNote) : null,
      debrief ? debriefSection(debrief, locale) : null,
    ],
    [ok],
  );
}

/** 접힌 "돌아보기": 시대가 끝난 뒤에만 공개되는 정보 (단서와 실제 결과) */
function debriefSection(d: PublicEraDebrief, locale: Locale): HTMLElement {
  const t = (k: string, p?: Record<string, string | number>) => tr(locale, k, p);
  const L = (x: { ko: string; en: string }) => localize(x, locale);
  return h(
    'details',
    { class: 'box' },
    h('summary', {}, t('debrief.title', { era: L(d.eraName) })),
    ...d.stories.map((s) =>
      h(
        'div',
        { class: 'note', style: 'margin-top:6px' },
        h('div', {}, `${t('news.type.tentative')}: ${L(s.tentative.title)}`),
        h('div', {}, `${t('debrief.clue')}: ${L(s.leansTo.title)}`),
        h('div', {}, `${t('debrief.actual')}: ${L(s.outcome.title)} — ${t(s.followedLean ? 'debrief.followed' : 'debrief.notFollowed')}`),
      ),
    ),
  );
}

// ───────── 최종 요약 ─────────

/** 최종 요약 + 엔딩. roomImage = 마지막 단계 거실 그림 주소 (엔딩 칸 배경) */
export function finalOverlay(f: FinalSummary, eraNames: Record<string, string>, locale: Locale, onRestart: () => void, roomImage?: string): HTMLElement {
  const t = (k: string, p?: Record<string, string | number>) => tr(locale, k, p);
  const v = finalView(f, eraNames, locale);
  const restart = pbtn('accent', t('final.restart'));
  restart.addEventListener('click', onRestart);
  const room = h('div', { class: 'ending-room' });
  if (roomImage) room.style.backgroundImage = `url("${roomImage}")`;
  return dialog(
    `final ending-${v.ending}`,
    v.title,
    [
      h('div', { class: 'ending' }, room, h('div', { class: 'ending-t' }, v.endingTitle), h('p', { class: 'ending-b' }, v.endingBody)),
      ...v.lines.map((l) => h('div', { class: 'note' }, l)),
      kv(t('final.totalWorkLabel'), t('common.coin', { amount: v.totalWork })),
      kv(t('final.cumulativeLabel'), v.cumulative),
      kv(t('final.totalLabel'), t('common.coin', { amount: v.total }), 'big'),
      h('div', { class: 'note' }, v.interior),
      v.unpaid ? h('div', { class: 'note' }, v.unpaid) : null,
    ],
    [restart],
  );
}

// ───────── 플레이 기록 동의 (첫 실행 때 한 번) ─────────

export function consentOverlay(locale: Locale, onAnswer: (agree: boolean) => void): HTMLElement {
  const t = (k: string) => tr(locale, k);
  const yes = pbtn('accent', t('telemetry.agree'));
  const no = pbtn('', t('telemetry.decline'));
  yes.addEventListener('click', () => onAnswer(true));
  no.addEventListener('click', () => onAnswer(false));
  return dialog('consent', t('telemetry.consentTitle'), [h('p', { class: 'note', style: 'color:var(--text)' }, t('telemetry.consentBody')), h('p', { class: 'note' }, t('telemetry.later'))], [no, yes]);
}

// ───────── 첫 화면: 제목 "역전의 방" + 이어하기 / 새로하기 ─────────

export function titleScreen(locale: Locale, hasSave: boolean, handlers: { continue(): void; newGame(): void }): HTMLElement {
  const t = (k: string) => tr(locale, k);
  const logo = h('h1', { class: 'title-logo' });
  logo.innerHTML = titleSvg(t('title.name'), 5);
  const cont = pbtn(hasSave ? 'accent' : 'off', t('title.continue'));
  cont.disabled = !hasSave;
  if (!hasSave) cont.setAttribute('aria-disabled', 'true');
  cont.addEventListener('click', () => {
    if (hasSave) handlers.continue();
  });
  const fresh = pbtn('', t('title.newGame'));
  fresh.addEventListener('click', handlers.newGame);
  return h('div', { class: 'title-screen' }, logo, h('div', { class: 'title-buttons' }, cont, fresh));
}

/**
 * 삼성 인터넷으로 열었을 때 첫 화면에서 한 번 보여 주는 안내 (11차).
 * 삼성 인터넷의 다크 모드는 페이지 쪽에서 막거나 켜졌는지 알아낼 방법이 없어서, 삼성 인터넷 사용자 모두에게 한 번 알린다.
 */
export function samsungDarkNoticeOverlay(locale: Locale, onClose: () => void): HTMLElement {
  const t = (k: string) => tr(locale, k);
  const ok = pbtn('accent', t('common.confirm'));
  ok.addEventListener('click', onClose);
  const lines = ['samsungDark.body1', 'samsungDark.body2', 'samsungDark.body3'].map((k) => h('p', { class: 'note', style: 'color:var(--text)' }, t(k)));
  return dialog('samsung-dark', t('samsungDark.title'), lines, [ok]);
}

/** 저장된 진행이 있는데 '새로하기'를 누르면 */
export function confirmNewOverlay(locale: Locale, onAnswer: (ok: boolean) => void): HTMLElement {
  const t = (k: string) => tr(locale, k);
  const no = pbtn('', t('common.cancel'));
  const yes = pbtn('accent', t('title.confirmYes'));
  no.addEventListener('click', () => onAnswer(false));
  yes.addEventListener('click', () => onAnswer(true));
  return dialog('confirm-new', t('title.confirmTitle'), [h('p', { class: 'note', style: 'color:var(--text)' }, t('title.confirmBody'))], [no, yes]);
}

/** 일반 확인 창: [취소] [확인] */
export function confirmOverlay(title: string, body: string[], noLabel: string, yesLabel: string, onAnswer: (ok: boolean) => void): HTMLElement {
  const no = pbtn('', noLabel);
  const yes = pbtn('accent', yesLabel);
  no.addEventListener('click', () => onAnswer(false));
  yes.addEventListener('click', () => onAnswer(true));
  return dialog('confirm', title, body.map((line) => h('p', { class: 'note', style: 'color:var(--text)' }, line)), [no, yes]);
}

// ───────── 시대 시작 카드 (9차: 시대가 바뀐 것이 확 느껴지게) ─────────

/** "2010년대" 큰 도트 숫자 + 한 줄 소개 + 키워드 + 배경 지식 힌트 + [시작하기]. artEra = '2000s' 등 */
export function eraIntroOverlay(locale: Locale, artEra: string, eraName: string, index: number, total: number, onStart: () => void): HTMLElement {
  const t = (k: string, p?: Record<string, string | number>) => tr(locale, k, p);
  const year = artEra.replace(/s$/, '');
  const num = h('div', { class: 'era-num' });
  num.innerHTML = /^\d{4}$/.test(year) ? titleSvg(year, 5) : '';
  const start = pbtn('accent', t('eraIntro.start'));
  start.addEventListener('click', onStart);
  return h(
    'div',
    { class: `overlay era-intro`, role: 'dialog', 'aria-modal': 'true', 'aria-label': eraName },
    h(
      'div',
      { class: 'era-card' },
      h('div', { class: 'era-step' }, t('eraIntro.step', { n: index + 1, total })),
      h('div', { class: 'era-title' }, num, h('span', { class: 'era-sfx' }, t('eraIntro.suffix'))),
      h('div', { class: 'era-tag' }, t(`eraIntro.${artEra}.tagline`)),
      h('div', { class: 'era-keys' }, ...t(`eraIntro.${artEra}.keywords`).split('·').map((k) => h('span', { class: 'era-key' }, k.trim()))),
      h('p', { class: 'era-hint' }, t(`eraIntro.${artEra}.recall`)),
      start,
    ),
  );
}

// ───────── 튜토리얼: 이야기(김역전) → 게임 방법 → 방 꾸미기와 작업 ─────────

export const TUTORIAL_PAGES = [
  { title: 'tutorial.storyTitle', lines: ['tutorial.story1', 'tutorial.story2', 'tutorial.story3', 'tutorial.story4'] },
  { title: 'tutorial.howTitle', lines: ['tutorial.how1', 'tutorial.how2', 'tutorial.how3', 'tutorial.how4', 'tutorial.how5'] },
  { title: 'tutorial.roomTitle', lines: ['tutorial.room1', 'tutorial.room2', 'tutorial.room3'] },
  { title: 'tutorial.goalTitle', lines: ['tutorial.goal1', 'tutorial.goal2', 'tutorial.goal3'] },
] as const;

/**
 * 튜토리얼. consent를 주면 마지막에 '플레이 기록 보내기' 동의 장을 붙인다 (9차: 튜토리얼 안에서 동의를 받는다).
 * [건너뛰기]를 눌러도 동의 장은 건너뛰지 않는다. 동의 장의 버튼: [동의하지 않음] / [동의하고 시작]
 */
export function tutorialOverlay(locale: Locale, onDone: () => void, consent?: (agree: boolean) => void): HTMLElement {
  const t = (k: string) => tr(locale, k);
  const pages = TUTORIAL_PAGES.length + (consent ? 1 : 0);
  let page = 0;
  const hd = h('div', { class: 'hd' });
  const body = h('div', { class: 'body' });
  const dots = h('div', { class: 'page-dots' });
  const skip = pbtn('', t('tutorial.skip'));
  const next = pbtn('accent', '');
  const answer = (agree: boolean) => {
    consent?.(agree);
    onDone();
  };
  const onConsentPage = () => consent !== undefined && page === TUTORIAL_PAGES.length;
  const render = () => {
    if (onConsentPage()) {
      hd.textContent = t('tutorial.consentTitle');
      body.replaceChildren(
        h('p', { class: 'note', style: 'color:var(--text)' }, t('telemetry.consentBody')),
        h('p', { class: 'note' }, t('telemetry.later')),
      );
    } else {
      const p = TUTORIAL_PAGES[page]!;
      hd.textContent = t(p.title);
      body.replaceChildren(...p.lines.map((k) => h('p', { class: page === 0 ? 'story' : 'note', style: page === 0 ? '' : 'color:var(--text)' }, t(k))));
    }
    dots.replaceChildren(...Array.from({ length: pages }, (_, i) => h('span', { class: `pip ${i <= page ? 'on' : ''}` })));
    const last = page === pages - 1;
    face(skip).textContent = t(onConsentPage() ? 'telemetry.decline' : 'tutorial.skip');
    face(next).textContent = t(onConsentPage() ? 'tutorial.agreeStart' : last ? 'tutorial.start' : 'tutorial.next');
    skip.hidden = last && !onConsentPage();
    root.classList.toggle('consent-page', onConsentPage());
  };
  skip.addEventListener('click', () => {
    if (onConsentPage()) answer(false);
    else if (consent) {
      page = TUTORIAL_PAGES.length; // 건너뛰어도 기록 동의는 묻는다
      render();
    } else onDone();
  });
  next.addEventListener('click', () => {
    if (onConsentPage()) answer(true);
    else if (page === pages - 1) onDone();
    else {
      page++;
      render();
    }
  });
  const root = h(
    'div',
    { class: 'overlay tutorial', role: 'dialog', 'aria-modal': 'true' },
    pnl('dialog', hd, body, h('div', { class: 'foot' }, skip, next), dots),
  );
  render();
  return root;
}

// ───────── 설정 ─────────

export interface SettingsHandlers {
  change(next: AppSettings, key: string, value: string): void;
  close(): void;
  credits: { title: string; artist: string; text: string }[];
  telemetryConsent: boolean;
  setConsent(on: boolean): void;
  replayTutorial(): void;
  /** 저장하고 첫 화면으로 */
  saveAndExit(): void;
}

export function settingsOverlay(s: AppSettings, handlers: SettingsHandlers): HTMLElement {
  const locale = s.locale;
  const t = (k: string, p?: Record<string, string | number>) => tr(locale, k, p);
  const row = (label: string, control: HTMLElement) => h('label', { class: 'set-row' }, h('span', {}, label), control);

  const lang = h('select', { class: 'set-lang' }, h('option', { value: 'ko' }, '한국어'), h('option', { value: 'en' }, 'English'));
  lang.value = s.locale;
  lang.addEventListener('change', () => handlers.change({ ...s, locale: lang.value === 'en' ? 'en' : 'ko' }, 'locale', lang.value));

  const color = h(
    'select',
    { class: 'set-color' },
    h('option', { value: 'auto' }, t('settings.colorAuto')),
    h('option', { value: 'korean' }, t('settings.colorKorean')),
    h('option', { value: 'western' }, t('settings.colorWestern')),
  );
  color.value = s.colorScheme ?? 'auto';
  color.addEventListener('change', () =>
    handlers.change({ ...s, colorScheme: color.value === 'auto' ? null : (color.value as 'korean' | 'western') }, 'colorScheme', color.value),
  );

  const slider = (value: number, apply: (v: number) => AppSettings, key: string) => {
    const el = h('input', { type: 'range', min: 0, max: 100, step: 5, value: Math.round(value * 100) });
    el.addEventListener('change', () => handlers.change(apply(Number(el.value) / 100), key, el.value));
    return el;
  };

  const mute = h('input', { type: 'checkbox', class: 'set-mute' });
  mute.checked = s.music.muted;
  mute.addEventListener('change', () => handlers.change({ ...s, music: { ...s.music, muted: mute.checked } }, 'muted', String(mute.checked)));

  const consent = h('input', { type: 'checkbox', class: 'set-consent' });
  consent.checked = handlers.telemetryConsent;
  consent.addEventListener('change', () => handlers.setConsent(consent.checked));

  const intro = pbtn('', t('tutorial.replay'));
  intro.style.height = '34px';
  intro.addEventListener('click', handlers.replayTutorial);

  const close = pbtn('accent', t('common.close'));
  close.addEventListener('click', handlers.close);
  const exit = pbtn('save-exit', t('settings.saveExit'));
  exit.addEventListener('click', handlers.saveAndExit);

  return dialog(
    'settings',
    t('settings.title'),
    [
      row(t('settings.language'), lang),
      row(t('settings.colorMode'), color),
      row(t('music.master'), slider(s.masterVolume, (v) => ({ ...s, masterVolume: v }), 'masterVolume')),
      row(t('music.volume'), slider(s.music.volume, (v) => ({ ...s, music: { ...s.music, volume: v } }), 'musicVolume')),
      row(t('music.sfx'), slider(s.sfxVolume, (v) => ({ ...s, sfxVolume: v }), 'sfxVolume')),
      row(t('music.mute'), mute),
      row(t('settings.telemetry'), consent),
      intro,
      h(
        'details',
        { class: 'box note' },
        h('summary', {}, t('music.credits')),
        ...(handlers.credits.length > 0
          ? handlers.credits.map((c) => h('div', {}, `${c.title} — ${c.artist}: ${c.text}`))
          : [h('div', {}, t('settings.noCredits'))]),
      ),
    ],
    [exit, close],
  );
}
