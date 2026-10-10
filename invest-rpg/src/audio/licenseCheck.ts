// 음악 라이선스 점검 (npm run lint:audio). 순수 함수: 파일 확인은 넘겨받은 함수로 한다.
//
// 허용: CC0, PublicDomain, CC-BY(출처 표기 문구 필수), Purchased(영수증·라이선스 증빙 필수), Commissioned(계약서 증빙)
// 차단: CC-BY-NC, CC-BY-ND, CC-BY-SA, GPL 계열, 라이선스 불명, 증빙 없음, 상업적 이용 불가,
//       AI로 만든 곡인데 도구·요금제·상업적 이용 근거 증빙이 없음, 클래식인데 녹음 라이선스 증빙 없음,
//       가사 있는 곡(instrumental: false)
// --release: placeholder가 남아 있으면 실패
// 형식 mp3/m4a, 장르당 2~3곡, 곡당 2~4분, 전체 20MB 이하 권장(넘으면 경고)

import { LP_CYCLE, type MusicTrack, type TrackLicense } from './music.ts';

export const ALLOWED_LICENSES = ['CC0', 'PublicDomain', 'CC-BY', 'Purchased', 'Commissioned'] as const;
export const AUDIO_FORMATS = ['.mp3', '.m4a'];
export const TRACKS_PER_GENRE: readonly [number, number] = [2, 3];
export const DURATION_SEC: readonly [number, number] = [120, 240];
export const TOTAL_SIZE_WARN_BYTES = 20 * 1024 * 1024;

export interface AudioIssue {
  level: 'error' | 'warning';
  trackId: string;
  message: string;
}

export interface AudioCheckOptions {
  release: boolean;
  fileExists(path: string): boolean;
  fileSize(path: string): number;
}

function checkLicense(l: TrackLicense | undefined, label: string, add: (level: 'error' | 'warning', m: string) => void, opts: AudioCheckOptions) {
  if (!l) {
    add('error', `${label} 정보 없음`);
    return;
  }
  if (!(ALLOWED_LICENSES as readonly string[]).includes(l.type)) {
    add('error', `${label} "${l.type}"은 사용 불가 (허용: ${ALLOWED_LICENSES.join(', ')})`);
    return;
  }
  if (!l.commercialUseAllowed) add('error', `${label}: 상업적 이용 허용(commercialUseAllowed)이 아님`);
  if (l.type !== 'Commissioned' && !l.sourceUrl.trim()) add('error', `${label}: 출처 주소(sourceUrl) 없음`);
  if (l.type === 'CC-BY' && (!l.requiresAttribution || !l.attributionText.trim())) add('error', `${label}: CC-BY는 출처 표기 문구(attributionText) 필수`);
  if (!l.proofFile) add('error', `${label}: 증빙 파일(proofFile) 없음 (assets/audio/licenses/)`);
  else if (!opts.fileExists(l.proofFile)) add('error', `${label}: 증빙 파일이 없음 → ${l.proofFile}`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(l.retrievedAt)) add('error', `${label}: 받은 날짜(retrievedAt) 형식 YYYY-MM-DD 아님`);
}

export function checkMusicLibrary(tracks: readonly MusicTrack[], opts: AudioCheckOptions): AudioIssue[] {
  const issues: AudioIssue[] = [];
  const ids = new Set<string>();
  let totalBytes = 0;
  for (const t of tracks) {
    const add = (level: 'error' | 'warning', message: string) => issues.push({ level, trackId: t.id, message });
    if (ids.has(t.id)) add('error', '곡 id 중복');
    ids.add(t.id);
    if (!LP_CYCLE.includes(t.genre)) add('error', `모르는 장르 "${t.genre}"`);
    if (!t.instrumental) add('error', '가사 있는 곡(instrumental: false)은 사용 불가');
    if (!opts.fileExists(t.file)) add('error', `음악 파일이 없음 → ${t.file}`);
    else totalBytes += opts.fileSize(t.file);

    if (t.status === 'placeholder') {
      add(opts.release ? 'error' : 'warning', '임시 곡(placeholder) — 출시 전에 실제 곡으로 바꿔야 함');
      continue; // 임시 곡은 형식·길이·라이선스 검사를 건너뛴다
    }
    const ext = t.file.slice(t.file.lastIndexOf('.')).toLowerCase();
    if (!AUDIO_FORMATS.includes(ext)) add('error', `형식 ${ext} (mp3 또는 m4a만)`);
    if (t.durationSec < DURATION_SEC[0] || t.durationSec > DURATION_SEC[1]) add('error', `길이 ${t.durationSec}초 (2~4분)`);
    checkLicense(t.license, '라이선스', add, opts);
    if (t.genre === 'classical') checkLicense(t.recordingLicense, '녹음 라이선스(클래식 필수)', add, opts);
    else if (t.recordingLicense) checkLicense(t.recordingLicense, '녹음 라이선스', add, opts);
    if (t.ai) {
      if (!t.ai.generator.trim() || !t.ai.plan.trim()) add('error', 'AI로 만든 곡: 도구(generator)와 요금제(plan) 필요');
      if (!t.ai.commercialUseProof) add('error', 'AI로 만든 곡: 상업적 이용 근거 증빙 없음');
      else if (!opts.fileExists(t.ai.commercialUseProof)) add('error', `AI 상업적 이용 증빙 파일이 없음 → ${t.ai.commercialUseProof}`);
    }
  }
  for (const g of LP_CYCLE) {
    const n = tracks.filter((t) => t.genre === g).length;
    if (n < TRACKS_PER_GENRE[0] || n > TRACKS_PER_GENRE[1]) {
      issues.push({ level: opts.release ? 'error' : 'warning', trackId: `(장르 ${g})`, message: `${n}곡 (장르당 2~3곡)` });
    }
  }
  if (totalBytes > TOTAL_SIZE_WARN_BYTES) {
    issues.push({ level: 'warning', trackId: '(전체)', message: `음악 파일 합계 ${(totalBytes / 1024 / 1024).toFixed(1)}MB (20MB 이하 권장)` });
  }
  return issues;
}
