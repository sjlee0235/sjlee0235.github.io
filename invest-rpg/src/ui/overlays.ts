// 탭 위에 뜨는 창: 시대 종료 정산, 최종 요약, 설정, 플레이 기록 동의.
// 시안이 없는 창이라 시안의 도트 패널·버튼·글꼴·색 토큰으로 만든다 (DESIGN_HANDOFF 11.5).
// 정산 창은 시대가 끝났을 때만 (시간이 이미 멈춘 상태). 플레이 중에 시간을 멈추는 창은 없다.

import type { Locale } from '../data/schema.ts';
import type { FinalSummary, WorkStatus } from '../engine/game.ts';
import type { PublicEraDebrief, PublicSettlement } from '../engine/publicView.ts';
import { localize, t as tr } from '../i18n/index.ts';
import type { AppSettings } from '../settings/settings.ts';
import { h } from './dom.ts';
import { pbtn, pnl } from './kit.ts';
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

export function finalOverlay(f: FinalSummary, eraNames: Record<string, string>, locale: Locale, onRestart: () => void): HTMLElement {
  const t = (k: string, p?: Record<string, string | number>) => tr(locale, k, p);
  const v = finalView(f, eraNames, locale);
  const restart = pbtn('accent', t('final.restart'));
  restart.addEventListener('click', onRestart);
  return dialog(
    'final',
    v.title,
    [
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

// ───────── 처음 안내 (튜토리얼 대신 짧은 안내 창) ─────────

export function introOverlay(locale: Locale, onDone: () => void): HTMLElement {
  const t = (k: string) => tr(locale, k);
  const ok = pbtn('accent', t('intro.start'));
  ok.addEventListener('click', onDone);
  return dialog(
    'intro',
    t('intro.title'),
    [1, 2, 3, 4, 5].map((i) => h('p', { class: 'note', style: 'color:var(--text)' }, t(`intro.p${i}`))),
    [ok],
  );
}

// ───────── 설정 ─────────

export interface SettingsHandlers {
  change(next: AppSettings, key: string, value: string): void;
  close(): void;
  credits: { title: string; artist: string; text: string }[];
  telemetryConsent: boolean;
  setConsent(on: boolean): void;
  replayIntro(): void;
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

  const intro = pbtn('', t('intro.replay'));
  intro.style.height = '34px';
  intro.addEventListener('click', handlers.replayIntro);

  const close = pbtn('accent', t('common.close'));
  close.addEventListener('click', handlers.close);

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
    [close],
  );
}
