// 음악 라이선스·파일 점검: npm run lint:audio  (출시 전: npm run lint:audio -- --release)
// 곡 목록: src/data/audio/music.json, 증빙: assets/audio/licenses/

import { checkMusicLibrary } from '../src/audio/licenseCheck.ts';
import type { MusicTrack } from '../src/audio/music.ts';

declare const process: {
  argv: string[];
  exitCode?: number;
  getBuiltinModule(id: 'node:fs'): {
    readFileSync(path: string, enc: 'utf8'): string;
    existsSync(path: string): boolean;
    statSync(path: string): { size: number };
  };
};

const fs = process.getBuiltinModule('node:fs');
const release = process.argv.includes('--release');
const tracks = (JSON.parse(fs.readFileSync('src/data/audio/music.json', 'utf8')) as { tracks: MusicTrack[] }).tracks;
const issues = checkMusicLibrary(tracks, {
  release,
  fileExists: (p) => fs.existsSync(p),
  fileSize: (p) => fs.statSync(p).size,
});
const errors = issues.filter((i) => i.level === 'error');
const warnings = issues.filter((i) => i.level === 'warning');
console.log(`\n음악 점검${release ? ' (출시용 --release)' : ''}: 곡 ${tracks.length}개, 오류 ${errors.length}건, 경고 ${warnings.length}건`);
for (const i of errors) console.log(`  ✗ [${i.trackId}] ${i.message}`);
for (const i of warnings) console.log(`  • [${i.trackId}] ${i.message}`);
if (errors.length > 0) process.exitCode = 1;
console.log('');
