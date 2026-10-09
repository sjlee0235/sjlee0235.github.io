// 탭 위에 뜨는 창: 시대 종료 정산, 최종 요약, 설정.
// 정산 창은 시대가 끝났을 때만 (시간이 이미 멈춘 상태). 플레이 중에 시간을 멈추는 창은 없다.

import type { Locale } from '../data/schema.ts';
import type { FinalSummary } from '../engine/game.ts';
import type { PublicEraDebrief, PublicSettlement } from '../engine/publicView.ts';
import { localize, t as tr } from '../i18n/index.ts';
import type { AppSettings } from '../settings/settings.ts';
import { h } from './dom.ts';
import { fmtNum, fmtPct } from './format.ts';
import { settlementView } from './viewModels.ts';

function modal(cls: string, ...children: (Node | null)[]): HTMLElement {
  return h('div', { class: `overlay ${cls}`, role: 'dialog', 'aria-modal': 'true' }, h('div', { class: 'hts-win modal' }, ...children));
}

// ───────── 시대 종료 정산 ─────────

export function settlementOverlay(
  s: PublicSettlement,
  debrief: PublicEraDebrief | null,
  locale: Locale,
  onConfirm: () => void,
): HTMLElement {
  const t = (k: string, p?: Record<string, string | number>) => tr(locale, k, p);
  const v = settlementView(s, locale);
  const line = (label: string, value: string, cls = '') =>
    h('div', { class: `st-line ${cls}` }, h('span', { class: 'st-label' }, label), h('span', { class: 'st-value' }, value));
  const confirm = h('button', { class: 'btn primary st-confirm' }, t('common.confirm'));
  confirm.addEventListener('click', onConfirm);
  return modal(
    'settlement',
    h('div', { class: 'hts-title' }, v.title),
    v.versionChange ? h('p', { class: 'st-note' }, v.versionChange) : null,
    h(
      'div',
      { class: 'st-sum' },
      line(t('settlement.investment'), `${t('common.coin', { amount: v.investment.coins })} (${v.investment.pct})`, 'st-inv'),
      line(`+ ${t('settlement.workIncome')}`, t('common.coin', { amount: v.workIncome }), 'st-work'),
      line(`= ${t('settlement.total')}`, t('common.coin', { amount: v.total }), 'st-total'),
    ),
    h('p', { class: 'st-note' }, t('settlement.liquidated')),
    debrief ? debriefSection(debrief, locale) : null,
    h('div', { class: 'st-actions' }, confirm),
  );
}

/** 접힌 "돌아보기": 시대가 끝난 뒤에만 공개되는 정보 */
function debriefSection(d: PublicEraDebrief, locale: Locale): HTMLElement {
  const t = (k: string, p?: Record<string, string | number>) => tr(locale, k, p);
  const L = (x: { ko: string; en: string }) => localize(x, locale);
  return h(
    'details',
    { class: 'debrief' },
    h('summary', {}, t('debrief.title', { era: L(d.eraName) })),
    h('h4', {}, t('debrief.stories')),
    ...d.stories.map((s) =>
      h(
        'div',
        { class: 'db-story' },
        h('div', {}, `${t('news.type.tentative')}: ${L(s.tentative.title)}`),
        h('div', {}, `${t('debrief.clue')}: ${L(s.leansTo.title)}`),
        h('div', {}, `${t('debrief.actual')}: ${L(s.outcome.title)} — ${t(s.followedLean ? 'debrief.followed' : 'debrief.notFollowed')}`),
      ),
    ),
    h('h4', {}, t('debrief.themes')),
    h(
      'table',
      { class: 'db-themes' },
      ...d.themes.map((th) =>
        h('tr', {}, h('td', {}, L(th.stockName)), h('td', {}, L(th.themeName)), h('td', {}, t(`sentiment.${th.sentiment}`)), h('td', {}, t(`relevance.${th.relevance}`))),
      ),
    ),
    h('h4', {}, t('debrief.allReports')),
    ...d.news.map((n) =>
      h(
        'div',
        { class: 'db-news' },
        h('div', { class: 'db-news-title' }, `[${t(`news.type.${n.news.kind}`)}] ${L(n.news.title)}`),
        h(
          'div',
          { class: 'db-news-effects' },
          n.effects
            .map((e) => `${L(e.stockName)} ${e.impact > 0 ? '+' : ''}${e.impact} (${t(`debrief.strength.${e.strength}`)})`)
            .join(' · '),
        ),
      ),
    ),
  );
}

// ───────── 최종 요약 ─────────

export function finalOverlay(f: FinalSummary, eraNames: Record<string, string>, locale: Locale, onRestart: () => void): HTMLElement {
  const t = (k: string, p?: Record<string, string | number>) => tr(locale, k, p);
  const restart = h('button', { class: 'btn primary' }, t('final.restart'));
  restart.addEventListener('click', onRestart);
  return modal(
    'final',
    h('div', { class: 'hts-title' }, t('final.title')),
    ...f.eras.map((e) =>
      h('div', { class: 'st-line' }, t('final.eraLine', { era: eraNames[e.eraId] ?? e.eraId, pct: fmtPct(e.returnPct), work: fmtNum(e.workIncome, locale) })),
    ),
    h('div', { class: 'st-line' }, t('final.totalWork', { coins: fmtNum(f.totalWorkIncome, locale) })),
    h('div', { class: 'st-line' }, t('final.cumulative', { pct: fmtPct(f.cumulativeReturnPct) })),
    h('div', { class: 'st-line st-total' }, t('final.total', { coins: fmtNum(f.finalCoins, locale) })),
    h('div', { class: 'st-actions' }, restart),
  );
}

// ───────── 설정 ─────────

export interface SettingsHandlers {
  change(next: AppSettings, key: string, value: string): void;
  close(): void;
  credits: { title: string; artist: string; text: string }[];
  telemetryConsent: boolean;
  setConsent(on: boolean): void;
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

  const close = h('button', { class: 'btn primary' }, t('common.close'));
  close.addEventListener('click', handlers.close);

  return modal(
    'settings',
    h('div', { class: 'hts-title' }, t('settings.title')),
    row(t('settings.language'), lang),
    row(t('settings.colorMode'), color),
    row(t('music.master'), slider(s.masterVolume, (v) => ({ ...s, masterVolume: v }), 'masterVolume')),
    row(t('music.volume'), slider(s.music.volume, (v) => ({ ...s, music: { ...s.music, volume: v } }), 'musicVolume')),
    row(t('music.sfx'), slider(s.sfxVolume, (v) => ({ ...s, sfxVolume: v }), 'sfxVolume')),
    row(t('music.mute'), mute),
    row(t('settings.telemetry'), consent),
    h(
      'details',
      { class: 'credits' },
      h('summary', {}, t('music.credits')),
      ...(handlers.credits.length > 0
        ? handlers.credits.map((c) => h('div', {}, `${c.title} — ${c.artist}: ${c.text}`))
        : [h('div', {}, t('settings.noCredits'))]),
    ),
    h('div', { class: 'st-actions' }, close),
  );
}
