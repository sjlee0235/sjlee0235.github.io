import { describe, expect, it } from 'vitest';
import { checkMusicLibrary, type AudioCheckOptions } from '../src/audio/licenseCheck.ts';
import { CROSSFADE_MS, LP_CYCLE, MockAudioBackend, MusicPlayer, type MusicGenre, type MusicTrack, type TrackLicense } from '../src/audio/music.ts';
import { createPresentationRng, DOG_STAGES, newDogState, petDog, type DogReaction } from '../src/engine/dogPetting.ts';
import { ERA_THEMES, eraThemeFor } from '../src/engine/eraTheme.ts';
import { Game } from '../src/engine/game.ts';
import { createRng } from '../src/engine/rng.ts';
import { loadSettings, MemorySettingsStorage, parseSettings, saveSettings, defaultColorScheme } from '../src/settings/settings.ts';
import { makeSpecEra } from './fixtures/makeEra.ts';

const lic = (over: Partial<TrackLicense> = {}): TrackLicense => ({
  type: 'CC0', sourceUrl: 'https://example.org/track', requiresAttribution: false, attributionText: '',
  commercialUseAllowed: true, proofFile: 'proof.png', retrievedAt: '2026-01-01', ...over,
});
const track = (id: string, genre: MusicGenre, over: Partial<MusicTrack> = {}): MusicTrack => ({
  id, genre, title: id, artist: 'a', file: `${id}.mp3`, durationSec: 180, instrumental: true, license: lic(),
  ...(genre === 'classical' ? { recordingLicense: lic() } : {}), status: 'final', ...over,
});
const library = () => LP_CYCLE.flatMap((g) => [track(`${g}1`, g), track(`${g}2`, g), track(`${g}3`, g)]);

describe('LP 음악', () => {
  it('LP 순환: 재즈 → 클래식 → 힙합 → 락 → 재즈 (끄기 없음)', () => {
    const p = new MusicPlayer(library(), new MockAudioBackend(), createRng(1));
    expect(LP_CYCLE).toEqual(['jazz', 'classical', 'hiphop', 'rock']);
    expect([p.cycleGenre(), p.cycleGenre(), p.cycleGenre(), p.cycleGenre()]).toEqual(['classical', 'hiphop', 'rock', 'jazz']);
  });

  it('기본값: 재즈, 볼륨 0.4, 음소거 아님. 첫 터치(unlock) 전에는 소리를 내지 않는다', () => {
    const be = new MockAudioBackend();
    const p = new MusicPlayer(library(), be, createRng(1));
    expect(p.getSettings()).toEqual({ genre: 'jazz', volume: 0.4, muted: false });
    p.cycleGenre();
    expect(be.playing.size).toBe(0);
    p.unlock();
    expect(be.playing.size).toBe(1);
    expect(p.getNowPlaying().track!.genre).toBe('classical');
  });

  it('장르를 바꾸면 2초 크로스페이드: 앞 곡은 작아지고 새 곡은 커진 뒤, 앞 곡은 멈춘다', () => {
    const be = new MockAudioBackend();
    const p = new MusicPlayer(library(), be, createRng(2));
    p.unlock();
    const first = p.getNowPlaying().track!.id;
    p.cycleGenre();
    const next = p.getNowPlaying().track!.id;
    expect(p.getNowPlaying().crossfade).toMatchObject({ from: first, to: next, progress: 0 });
    p.update(CROSSFADE_MS / 2);
    expect(be.playing.get(first)).toBeCloseTo(0.2, 9);
    expect(be.playing.get(next)).toBeCloseTo(0.2, 9);
    p.update(CROSSFADE_MS);
    expect(p.getNowPlaying().crossfade).toBeNull();
    expect(be.playing.has(first)).toBe(false);
    expect(be.playing.get(next)).toBeCloseTo(0.4, 9);
  });

  it('[200곡 넘김] 같은 장르 안에서 무작위로 이어 가되 같은 곡이 연속으로 나오지 않는다', () => {
    const p = new MusicPlayer(library(), new MockAudioBackend(), createRng(3));
    p.unlock();
    const seen = new Set<string>();
    let prev = p.getNowPlaying().track!.id;
    for (let i = 0; i < 200; i++) {
      p.onTrackEnded();
      const cur = p.getNowPlaying().track!;
      expect(cur.id).not.toBe(prev);
      expect(cur.genre).toBe('jazz');
      seen.add(cur.id);
      prev = cur.id;
    }
    expect(seen.size).toBe(3);
  });

  it('백그라운드면 일시정지, 돌아오면 같은 곡을 이어서 재생', () => {
    const be = new MockAudioBackend();
    const p = new MusicPlayer(library(), be, createRng(4));
    p.unlock();
    const id = p.getNowPlaying().track!.id;
    p.setBackground(true);
    expect(be.paused).toBe(true);
    p.onTrackEnded(); // 백그라운드 중에는 넘기지 않는다
    p.setBackground(false);
    expect(be.paused).toBe(false);
    expect(p.getNowPlaying().track!.id).toBe(id);
  });

  it('볼륨 채널: 음악 크기 = 마스터 × 음악, 음소거면 0', () => {
    const be = new MockAudioBackend();
    const p = new MusicPlayer(library(), be, createRng(5));
    p.unlock();
    const id = p.getNowPlaying().track!.id;
    p.setMasterVolume(0.5);
    p.setVolume(0.8);
    expect(be.playing.get(id)).toBeCloseTo(0.4, 9);
    p.toggleMute();
    expect(be.playing.get(id)).toBe(0);
  });

  it('출처 표기 목록: CC-BY 곡의 표기 문구를 모은다', () => {
    const tracks = [track('j1', 'jazz', { license: lic({ type: 'CC-BY', requiresAttribution: true, attributionText: '"Song" by A (CC BY 4.0)' }) }), track('j2', 'jazz')];
    const p = new MusicPlayer(tracks, new MockAudioBackend(), createRng(6));
    expect(p.getCredits()).toEqual([{ trackId: 'j1', title: 'j1', artist: 'a', text: '"Song" by A (CC BY 4.0)' }]);
    expect(p.listMusicOptions()[0]).toEqual({ genre: 'jazz', labelKey: 'music.genre.jazz', trackCount: 2 });
  });
});

describe('설정 저장 (게임 세이브와 별개)', () => {
  it('저장 → 불러오기, 깨진 값은 기본값으로', () => {
    const st = new MemorySettingsStorage();
    expect(loadSettings(st).music).toEqual({ genre: 'jazz', volume: 0.4, muted: false });
    saveSettings(st, { ...loadSettings(st), music: { genre: 'rock', volume: 0.7, muted: true }, masterVolume: 0.3 });
    expect(loadSettings(st)).toMatchObject({ music: { genre: 'rock', volume: 0.7, muted: true }, masterVolume: 0.3 });
    expect(parseSettings('{oops').music.genre).toBe('jazz');
    expect(parseSettings('{"music":{"genre":"polka","volume":9}}').music).toEqual({ genre: 'jazz', volume: 1, muted: false });
  });

  it('상승 색상 기본값: 한국어 빨강 상승, 영어 초록 상승', () => {
    expect(defaultColorScheme('ko')).toBe('korean');
    expect(defaultColorScheme('en')).toBe('western');
  });
});

describe('음악 라이선스 점검 (lint:audio)', () => {
  const ok: AudioCheckOptions = { release: true, fileExists: () => true, fileSize: () => 3_000_000 };
  const errorsOf = (tracks: MusicTrack[], opts = ok) => checkMusicLibrary(tracks, opts).filter((i) => i.level === 'error').map((i) => i.message);

  it('허용 라이선스만 있는 정상 목록은 통과', () => {
    expect(errorsOf(library().filter((t) => !t.id.endsWith('3')))).toEqual([]);
  });

  it('차단: NC·ND·SA·GPL·불명, 상업적 이용 불가, 증빙 없음, CC-BY 표기 문구 없음', () => {
    const base = library();
    for (const type of ['CC-BY-NC', 'CC-BY-ND', 'CC-BY-SA', 'GPL', 'Unknown']) {
      expect(errorsOf([...base.slice(1), track('x', 'jazz', { license: lic({ type }) })]).join()).toMatch(/사용 불가/);
    }
    expect(errorsOf([track('x', 'jazz', { license: lic({ commercialUseAllowed: false }) })]).join()).toMatch(/상업적/);
    expect(errorsOf([track('x', 'jazz', { license: lic({ proofFile: null }) })]).join()).toMatch(/증빙/);
    expect(errorsOf([track('x', 'jazz', { license: lic({ type: 'CC-BY' }) })]).join()).toMatch(/표기 문구/);
    expect(errorsOf([track('x', 'jazz', { license: lic({ type: 'Purchased', proofFile: 'gone.pdf' }) })], { ...ok, fileExists: (p) => p !== 'gone.pdf' }).join()).toMatch(/증빙 파일이 없음/);
  });

  it('차단: 가사 있는 곡, AI 곡 증빙 없음, 클래식 녹음 라이선스 없음, 형식·길이', () => {
    expect(errorsOf([track('x', 'jazz', { instrumental: false })]).join()).toMatch(/가사/);
    expect(errorsOf([track('x', 'jazz', { ai: { generator: 'tool', plan: '', commercialUseProof: null } })]).join()).toMatch(/AI/);
    const noRec = track('c', 'classical');
    delete noRec.recordingLicense;
    expect(errorsOf([noRec]).join()).toMatch(/녹음 라이선스/);
    expect(errorsOf([track('x', 'jazz', { file: 'x.wav' })]).join()).toMatch(/형식/);
    expect(errorsOf([track('x', 'jazz', { durationSec: 600 })]).join()).toMatch(/길이/);
  });

  it('--release에서는 placeholder가 남아 있으면 실패, 평소에는 경고', () => {
    const ph = library().map((t) => ({ ...t, status: 'placeholder' as const }));
    expect(errorsOf(ph).length).toBeGreaterThan(0);
    expect(errorsOf(ph, { ...ok, release: false })).toEqual([]);
  });

  it('전체 20MB를 넘으면 경고', () => {
    const big = checkMusicLibrary(library(), { ...ok, fileSize: () => 5_000_000 });
    expect(big.some((i) => i.level === 'warning' && /20MB/.test(i.message))).toBe(true);
  });
});

describe('강아지 반응', () => {
  it('3번째 터치마다 반응, 그 외에는 쓰다듬기 효과만', () => {
    const rng = createPresentationRng(1, 'dog');
    let s = newDogState();
    const out: (DogReaction | null)[] = [];
    for (let i = 0; i < 9; i++) {
      const r = petDog(s, 'puppy', rng);
      expect(r.effect).toBe('pet');
      out.push(r.reaction);
      s = r.state;
    }
    expect(out.map((x) => x !== null)).toEqual([false, false, true, false, false, true, false, false, true]);
  });

  it('[300번 반응] 직전 반응과 같은 반응이 연속으로 나오지 않고, 4가지가 모두 나온다', () => {
    const rng = createPresentationRng(7, 'dog');
    let s = newDogState();
    const seen = new Set<DogReaction>();
    let prev: DogReaction | null = null;
    for (let i = 0; i < 900; i++) {
      const r = petDog(s, 'adult', rng);
      s = r.state;
      if (!r.reaction) continue;
      expect(r.reaction).not.toBe(prev);
      prev = r.reaction;
      seen.add(r.reaction);
    }
    expect(seen.size).toBe(4);
  });

  it('시대별 성격: 강아지(활발) 1.3배, 성견 1배, 노견 0.6배 속도', () => {
    expect(DOG_STAGES.puppy.speedMultiplier).toBeGreaterThan(DOG_STAGES.adult.speedMultiplier);
    expect(DOG_STAGES.senior.speedMultiplier).toBeLessThan(DOG_STAGES.adult.speedMultiplier);
    expect(petDog(newDogState(), 'senior', createRng(1)).speedMultiplier).toBe(0.6);
  });

  it('강아지를 아무리 만져도 시장 결과(가격)는 같다 (연출 난수 분리)', () => {
    const era = makeSpecEra({ id: 'dog' });
    const a = new Game({ eras: [era], seed: 9 });
    const b = new Game({ eras: [era], seed: 9 });
    const rng = createPresentationRng(9, 'dog');
    let s = newDogState();
    while (a.phase === 'running') {
      a.advanceTick();
      b.advanceTick();
      for (let i = 0; i < 5; i++) s = petDog(s, 'puppy', rng).state;
    }
    expect(b.getStockList().map((x) => x.price)).toEqual(a.getStockList().map((x) => x.price));
  });
});

describe('시대별 디자인 데이터', () => {
  it('2000년대 강아지·CRT, 2010년대 성견·평면, 2020년대 노견·대형 평면, 시대별 주식창 색 세트', () => {
    expect(eraThemeFor('2000s')).toMatchObject({ dogStage: 'puppy', tvVariant: 'tv_crt', htsSkin: { id: 'hts_classic_gray' } });
    expect(eraThemeFor('2010s')).toMatchObject({ dogStage: 'adult', tvVariant: 'tv_flat', htsSkin: { id: 'hts_flat_gray' } });
    expect(eraThemeFor('2020s')).toMatchObject({ dogStage: 'senior', tvVariant: 'tv_large_flat', htsSkin: { id: 'hts_dark_gray' } });
    for (const t of Object.values(ERA_THEMES)) expect(Object.keys(t.htsSkin.colors)).toHaveLength(8);
    expect(eraThemeFor('없는 시대').dogStage).toBe('puppy');
  });
});
