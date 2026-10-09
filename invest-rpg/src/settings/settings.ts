// 앱 설정 (게임 세이브와 별개로 저장): 언어, 상승 색상 모드, 볼륨(마스터/음악/효과음), 음악 장르·음소거.
// 실제 저장소(기기 저장)는 화면 단계에서 SettingsStorage를 구현해 붙인다. 테스트는 MemorySettingsStorage.

import { DEFAULT_MUSIC_SETTINGS, LP_CYCLE, type MusicSettings } from '../audio/music.ts';
import type { Locale } from '../data/schema.ts';
import type { ColorScheme } from '../engine/colors.ts';

export const SETTINGS_VERSION = 1;
export const SETTINGS_KEY = 'invest-rpg.settings';

export interface AppSettings {
  version: number;
  locale: Locale;
  /** null이면 언어에 따른 기본값 (한국어·일본어·중국어 빨강 상승, 영어 초록 상승) */
  colorScheme: ColorScheme | null;
  masterVolume: number;
  sfxVolume: number;
  music: MusicSettings;
}

export const DEFAULT_SETTINGS: Readonly<AppSettings> = Object.freeze({
  version: SETTINGS_VERSION,
  locale: 'ko',
  colorScheme: null,
  masterVolume: 1,
  sfxVolume: 0.8,
  music: { ...DEFAULT_MUSIC_SETTINGS },
});

/** 언어별 기본 상승 색상: ko/ja/zh는 빨강 상승·파랑 하락, en은 초록 상승·빨강 하락 */
export function defaultColorScheme(locale: string): ColorScheme {
  return locale === 'en' ? 'western' : 'korean';
}

export function effectiveColorScheme(s: AppSettings): ColorScheme {
  return s.colorScheme ?? defaultColorScheme(s.locale);
}

const clamp01 = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : d);

/** 저장된 문자열을 읽는다. 깨졌거나 모르는 값은 기본값으로 */
export function parseSettings(text: string | null): AppSettings {
  let raw: Partial<AppSettings> = {};
  try {
    raw = text ? (JSON.parse(text) as Partial<AppSettings>) : {};
  } catch {
    raw = {};
  }
  const m: Partial<MusicSettings> = raw.music ?? {};
  return {
    version: SETTINGS_VERSION,
    locale: raw.locale === 'en' || raw.locale === 'ko' ? raw.locale : DEFAULT_SETTINGS.locale,
    colorScheme: raw.colorScheme === 'korean' || raw.colorScheme === 'western' ? raw.colorScheme : null,
    masterVolume: clamp01(raw.masterVolume, DEFAULT_SETTINGS.masterVolume),
    sfxVolume: clamp01(raw.sfxVolume, DEFAULT_SETTINGS.sfxVolume),
    music: {
      genre: m.genre && LP_CYCLE.includes(m.genre) ? m.genre : DEFAULT_MUSIC_SETTINGS.genre,
      volume: clamp01(m.volume, DEFAULT_MUSIC_SETTINGS.volume),
      muted: typeof m.muted === 'boolean' ? m.muted : DEFAULT_MUSIC_SETTINGS.muted,
    },
  };
}

export function serializeSettings(s: AppSettings): string {
  return JSON.stringify(s);
}

/** 기기 저장소 (화면 단계에서 localStorage 등으로 구현) */
export interface SettingsStorage {
  get(key: string): string | null;
  set(key: string, value: string): void;
}

export class MemorySettingsStorage implements SettingsStorage {
  private readonly data = new Map<string, string>();
  get(key: string) {
    return this.data.get(key) ?? null;
  }
  set(key: string, value: string) {
    this.data.set(key, value);
  }
}

export function loadSettings(storage: SettingsStorage): AppSettings {
  return parseSettings(storage.get(SETTINGS_KEY));
}

export function saveSettings(storage: SettingsStorage, s: AppSettings): void {
  storage.set(SETTINGS_KEY, serializeSettings(s));
}
