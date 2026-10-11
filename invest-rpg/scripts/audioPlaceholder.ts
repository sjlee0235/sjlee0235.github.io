// 임시 음악 만들기: npm run audio:placeholder
// 장르당 2곡, 1초짜리 무음 WAV와 status: 'placeholder' 항목을 만든다 (재생 흐름 시험용).
// 실제 곡은 사람이 직접 구해서 넣는다 (docs/audio_sourcing.md). 이 스크립트는 곡을 내려받거나 만들지 않는다.

import { LP_CYCLE, type MusicTrack, type TrackLicense } from '../src/audio/music.ts';

declare const process: {
  getBuiltinModule(id: 'node:fs'): {
    mkdirSync(path: string, o: { recursive: boolean }): void;
    writeFileSync(path: string, data: Uint8Array | string): void;
    readFileSync(path: string, enc: 'utf8'): string;
    existsSync(path: string): boolean;
  };
};

const fs = process.getBuiltinModule('node:fs');
const DIR = 'assets/audio/music/placeholder';

/** 1초 무음 WAV (8kHz, 16비트, 모노) */
function silentWav(seconds = 1, rate = 8000): Uint8Array {
  const samples = seconds * rate;
  const buf = new ArrayBuffer(44 + samples * 2);
  const v = new DataView(buf);
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, 'RIFF'); v.setUint32(4, 36 + samples * 2, true); str(8, 'WAVE');
  str(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  str(36, 'data'); v.setUint32(40, samples * 2, true);
  return new Uint8Array(buf);
}

const today = new Date().toISOString().slice(0, 10);
const placeholderLicense = (): TrackLicense => ({
  type: 'CC0', sourceUrl: '', requiresAttribution: false, attributionText: '', commercialUseAllowed: true, proofFile: null, retrievedAt: today,
});

fs.mkdirSync(DIR, { recursive: true });
const path = 'src/data/audio/music.json';
const existing = fs.existsSync(path) ? (JSON.parse(fs.readFileSync(path, 'utf8')) as { tracks: MusicTrack[] }).tracks : [];
const finals = existing.filter((t) => t.status === 'final');
const placeholders: MusicTrack[] = [];
for (const genre of LP_CYCLE) {
  for (let i = 1; i <= 2; i++) {
    const file = `${DIR}/${genre}_${i}.wav`;
    fs.writeFileSync(file, silentWav());
    placeholders.push({
      id: `placeholder-${genre}-${i}`,
      genre,
      title: `Placeholder ${genre} ${i}`,
      artist: '(임시 무음)',
      file,
      durationSec: 1,
      instrumental: true,
      license: placeholderLicense(),
      ...(genre === 'classical' ? { recordingLicense: placeholderLicense() } : {}),
      status: 'placeholder',
    });
  }
}
fs.writeFileSync(path, `${JSON.stringify({ note: '곡 목록. 형식은 src/audio/music.ts의 MusicTrack, 점검은 npm run lint:audio', tracks: [...finals, ...placeholders] }, null, 2)}\n`);
console.log(`임시 곡 ${placeholders.length}개를 만들었습니다 (${DIR}). 실제 곡 ${finals.length}개는 그대로 둡니다.`);
