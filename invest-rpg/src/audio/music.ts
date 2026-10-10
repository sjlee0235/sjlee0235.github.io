// 거실 LP 음악: 장르 순환과 재생기 로직 (실제 소리는 AudioBackend가 낸다. 실제 구현은 화면 단계)
//
// - LP를 누르면 재즈 → 클래식 → 힙합 → 락 → (다시 재즈). 순서는 데이터(src/data/audio/lpCycle.json). 끄기는 없다
// - 선택한 장르의 곡을 무작위 순서로 이어서 반복 (같은 곡 연속 금지)
// - 장르를 바꾸면 2초 동안 크로스페이드 (앞 곡은 작아지고 새 곡은 커진다)
// - 앱이 백그라운드로 가면 일시정지(game.pause('background')와 함께 부른다), 돌아오면 이어서 재생
// - 볼륨 채널: 마스터 / 음악 / 효과음. 음악 실제 크기 = 마스터 × 음악 (음소거면 0)
// - 휴대폰 브라우저는 첫 터치 전에는 소리를 낼 수 없다 → unlock()을 첫 터치에서 부른다
// - 곡 순서용 난수는 연출용 난수(createPresentationRng)를 쓴다. 시장 결과에 영향 없음

import lpCycleData from '../data/audio/lpCycle.json' with { type: 'json' };
import type { Rng } from '../engine/rng.ts';

export type MusicGenre = 'jazz' | 'classical' | 'hiphop' | 'rock';
export const LP_CYCLE = lpCycleData.cycle as MusicGenre[];
export const CROSSFADE_MS = 2000;

export type LicenseType =
  | 'CC0' | 'PublicDomain' | 'CC-BY' | 'Purchased' | 'Commissioned'
  | 'CC-BY-NC' | 'CC-BY-ND' | 'CC-BY-SA' | 'GPL' | 'Unknown' | string;

export interface TrackLicense {
  type: LicenseType;
  sourceUrl: string;
  requiresAttribution: boolean;
  attributionText: string;
  commercialUseAllowed: boolean;
  /** 증빙 파일 (assets/audio/licenses/ 아래: 라이선스 페이지 캡처, 영수증, 계약서 등) */
  proofFile: string | null;
  /** 받은 날짜 (YYYY-MM-DD) */
  retrievedAt: string;
}

export interface MusicTrack {
  id: string;
  genre: MusicGenre;
  title: string;
  artist: string;
  /** invest-rpg/ 기준 경로 */
  file: string;
  durationSec: number;
  /** 가사 없는 음악인가 (false면 사용 불가) */
  instrumental: boolean;
  license: TrackLicense;
  /** 녹음(연주)의 라이선스. 클래식은 작곡이 퍼블릭 도메인이어도 녹음을 따로 증빙해야 한다 (필수) */
  recordingLicense?: TrackLicense;
  /** AI로 만든 곡이면: 도구 이름, 요금제, 상업적 이용 근거 증빙 파일 */
  ai?: { generator: string; plan: string; commercialUseProof: string | null };
  status: 'placeholder' | 'final';
}

export interface MusicSettings {
  genre: MusicGenre;
  /** 음악 채널 볼륨 0~1 */
  volume: number;
  muted: boolean;
}

export const DEFAULT_MUSIC_SETTINGS: Readonly<MusicSettings> = Object.freeze({ genre: 'jazz', volume: 0.4, muted: false });

/** 실제 소리를 내는 쪽 (화면 단계에서 Web Audio 등으로 구현, 테스트는 MockAudioBackend) */
export interface AudioBackend {
  start(trackId: string, file: string, gain: number): void;
  setGain(trackId: string, gain: number): void;
  stop(trackId: string): void;
  /** 전체 일시정지 / 재개 (백그라운드) */
  pause(): void;
  resume(): void;
}

/** 테스트용 가짜 재생기: 무엇이 얼마나 크게 재생 중인지 기억한다 */
export class MockAudioBackend implements AudioBackend {
  readonly playing = new Map<string, number>();
  readonly log: string[] = [];
  paused = false;
  start(trackId: string, _file: string, gain: number) {
    this.playing.set(trackId, gain);
    this.log.push(`start ${trackId}`);
  }
  setGain(trackId: string, gain: number) {
    if (this.playing.has(trackId)) this.playing.set(trackId, gain);
  }
  stop(trackId: string) {
    this.playing.delete(trackId);
    this.log.push(`stop ${trackId}`);
  }
  pause() {
    this.paused = true;
  }
  resume() {
    this.paused = false;
  }
}

export interface NowPlaying {
  genre: MusicGenre;
  track: MusicTrack | null;
  /** 장르 전환 크로스페이드 중이면 0~1 진행률 */
  crossfade: { from: string; to: string; progress: number } | null;
  unlocked: boolean;
  background: boolean;
}

export class MusicPlayer {
  private settings: MusicSettings;
  private masterVolume: number;
  private current: MusicTrack | null = null;
  private fade: { from: MusicTrack; elapsedMs: number } | null = null;
  private unlocked = false;
  private background = false;
  private readonly tracks: readonly MusicTrack[];
  private readonly backend: AudioBackend;
  private readonly rng: Rng;

  constructor(
    tracks: readonly MusicTrack[],
    backend: AudioBackend,
    rng: Rng,
    settings: MusicSettings = DEFAULT_MUSIC_SETTINGS,
    masterVolume = 1,
  ) {
    this.tracks = tracks;
    this.backend = backend;
    this.rng = rng;
    this.settings = { ...settings };
    this.masterVolume = masterVolume;
  }

  /** LP 순환에 나오는 장르와 곡 수 */
  listMusicOptions(): { genre: MusicGenre; labelKey: string; trackCount: number }[] {
    return LP_CYCLE.map((genre) => ({ genre, labelKey: `music.genre.${genre}`, trackCount: this.tracks.filter((t) => t.genre === genre).length }));
  }

  getSettings(): MusicSettings {
    return { ...this.settings };
  }

  /** 첫 터치에서 부른다. 이전에는 소리를 내지 않는다 */
  unlock(): void {
    if (this.unlocked) return;
    this.unlocked = true;
    this.playNext(null);
  }

  /** LP 터치: 다음 장르로 (재즈 → 클래식 → 힙합 → 락 → 재즈) */
  cycleGenre(): MusicGenre {
    const i = LP_CYCLE.indexOf(this.settings.genre);
    const next = LP_CYCLE[(i + 1) % LP_CYCLE.length]!;
    this.setGenre(next);
    return next;
  }

  setGenre(genre: MusicGenre): void {
    if (!LP_CYCLE.includes(genre)) throw new Error(`없는 장르: ${genre}`);
    if (genre === this.settings.genre) return;
    this.settings = { ...this.settings, genre };
    if (!this.unlocked) return;
    const from = this.current;
    // 크로스페이드 중에 또 바꾸면, 사라지던 곡은 바로 끄고 지금 곡을 사라지게 한다
    if (this.fade) this.backend.stop(this.fade.from.id);
    this.fade = from ? { from, elapsedMs: 0 } : null;
    this.current = null;
    this.playNext(null);
    this.applyGains();
  }

  setVolume(volume: number): void {
    this.settings = { ...this.settings, volume: Math.max(0, Math.min(1, volume)) };
    this.applyGains();
  }

  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    this.applyGains();
  }

  toggleMute(): boolean {
    this.settings = { ...this.settings, muted: !this.settings.muted };
    this.applyGains();
    return this.settings.muted;
  }

  /** 지금 곡이 끝났을 때 (재생기가 알려준다): 같은 장르의 다른 곡을 무작위로 */
  onTrackEnded(): void {
    if (!this.unlocked || this.background) return;
    const prev = this.current;
    if (prev) this.backend.stop(prev.id);
    this.current = null;
    this.playNext(prev?.id ?? null);
  }

  /** 시간 경과 (화면 프레임마다). 크로스페이드를 진행한다 */
  update(dtMs: number): void {
    if (!this.fade || this.background) return;
    this.fade.elapsedMs = Math.min(CROSSFADE_MS, this.fade.elapsedMs + dtMs);
    if (this.fade.elapsedMs >= CROSSFADE_MS) {
      this.backend.stop(this.fade.from.id);
      this.fade = null;
    }
    this.applyGains();
  }

  /** 앱이 백그라운드로 가면 true, 돌아오면 false */
  setBackground(background: boolean): void {
    if (background === this.background) return;
    this.background = background;
    if (background) this.backend.pause();
    else this.backend.resume();
  }

  getNowPlaying(): NowPlaying {
    return {
      genre: this.settings.genre,
      track: this.current,
      crossfade: this.fade && this.current
        ? { from: this.fade.from.id, to: this.current.id, progress: this.fade.elapsedMs / CROSSFADE_MS }
        : null,
      unlocked: this.unlocked,
      background: this.background,
    };
  }

  /** 음악 저작권 표시 (출처 표기가 필요한 곡, 녹음 라이선스 포함) */
  getCredits(): { trackId: string; title: string; artist: string; text: string }[] {
    return this.tracks
      .filter((t) => t.status === 'final')
      .flatMap((t) => [t.license, ...(t.recordingLicense ? [t.recordingLicense] : [])]
        .filter((l) => l.requiresAttribution && l.attributionText.trim())
        .map((l) => ({ trackId: t.id, title: t.title, artist: t.artist, text: l.attributionText })));
  }

  /** 음악 실제 크기 */
  get effectiveGain(): number {
    return this.settings.muted ? 0 : this.masterVolume * this.settings.volume;
  }

  private playNext(excludeId: string | null): void {
    const pool = this.tracks.filter((t) => t.genre === this.settings.genre);
    if (pool.length === 0) return;
    const choices = pool.length > 1 ? pool.filter((t) => t.id !== excludeId) : pool;
    const track = choices[this.rng.int(0, choices.length - 1)]!;
    this.current = track;
    this.backend.start(track.id, track.file, this.fade ? 0 : this.effectiveGain);
  }

  private applyGains(): void {
    const g = this.effectiveGain;
    if (this.fade && this.current) {
      const p = this.fade.elapsedMs / CROSSFADE_MS;
      this.backend.setGain(this.fade.from.id, g * (1 - p));
      this.backend.setGain(this.current.id, g * p);
    } else if (this.current) {
      this.backend.setGain(this.current.id, g);
    }
  }
}
