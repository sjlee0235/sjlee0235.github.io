// 실제 소리 재생 (HTML <audio>). MusicPlayer가 무엇을 얼마나 크게 틀지 정하고, 여기는 그대로 따른다.
// - 휴대폰 브라우저는 사용자가 화면을 한 번 누르기 전에는 소리를 못 낸다 → MusicPlayer.unlock()은 첫 터치에서
// - 곡이 끝나면 onEnded → MusicPlayer.onTrackEnded() (같은 장르의 다른 곡)
// - 음악 파일 경로는 music.json의 file ("assets/..."). 화면 주소는 assets/ 를 뺀 나머지

import type { AudioBackend } from '../audio/music.ts';

export class HtmlAudioBackend implements AudioBackend {
  private readonly players = new Map<string, HTMLAudioElement>();
  private paused = false;
  private readonly base: string;
  private readonly onEnded: (trackId: string) => void;

  constructor(base: string, onEnded: (trackId: string) => void) {
    this.base = base;
    this.onEnded = onEnded;
  }

  start(trackId: string, file: string, gain: number): void {
    this.stop(trackId);
    const el = new Audio(`${this.base}${file.replace(/^assets\//, '')}`);
    el.volume = clamp(gain);
    el.addEventListener('ended', () => this.onEnded(trackId));
    el.addEventListener('error', () => {
      // 파일이 없거나 못 읽음: 조용히 넘어간다 (임시 곡 단계)
    });
    this.players.set(trackId, el);
    if (!this.paused) void el.play().catch(() => undefined);
  }

  setGain(trackId: string, gain: number): void {
    const el = this.players.get(trackId);
    if (el) el.volume = clamp(gain);
  }

  stop(trackId: string): void {
    const el = this.players.get(trackId);
    if (!el) return;
    el.pause();
    el.src = '';
    this.players.delete(trackId);
  }

  pause(): void {
    this.paused = true;
    for (const el of this.players.values()) el.pause();
  }

  resume(): void {
    this.paused = false;
    for (const el of this.players.values()) void el.play().catch(() => undefined);
  }
}

const clamp = (v: number) => Math.max(0, Math.min(1, v));
