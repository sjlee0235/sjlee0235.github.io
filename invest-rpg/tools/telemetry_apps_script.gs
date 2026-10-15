/**
 * 역전의 방 — 플레이 기록 받기 (구글 Apps Script 웹 앱, 18차)
 *
 * 처음 쓰는 법 (자세한 순서는 docs/telemetry.md 9장)
 * 1) 구글 스프레드시트에서 [확장 프로그램] → [Apps Script], 이 코드를 통째로 붙여 넣고 저장
 * 2) [배포] → [새 배포] → 유형 '웹 앱', 실행 '나', 액세스 '모든 사용자' → 배포 → 권한 허용
 * 3) 웹 앱 주소(…/exec)를 게임 src/ui/telemetryConfig.ts의 TELEMETRY_ENDPOINT에 넣는다
 *
 * 코드를 바꿨을 때: 붙여 넣고 저장 → [배포] → [배포 관리] → 연필 → 버전 '새 버전' → [배포] (주소 그대로)
 *   → 웹 앱 주소를 브라우저로 열어 '코드 4판'이 보이는지 확인 (안 보이면 아직 옛 코드가 돌고 있다)
 *   → 위쪽 함수 선택에서 'setupSheet' 고르고 [실행] 한 번 (칸이 밀린 줄 고치기, 데이터 정보 탭, 총 플레이 시간)
 *
 * 탭
 * - events     : 이벤트 한 줄씩. 칸은 이름으로 찾으므로 순서가 바뀌어도 된다.
 * - 데이터 정보 : 칸·기록 종류 설명 ('시트1'이 있으면 이름을 바꿔 쓴다)
 * - 시대별 결과 : 시대가 끝날 때마다 한 줄 (유저 번호, 주식 투자로만 얻은 수익률, 인생 업그레이드 마지막 단계 …)
 * 총 플레이 시간 = 같은 pid의 기록을 접속(sid)별로 시간순으로 놓고, 기록 사이 간격을 더한 값.
 *   간격이 GAP_MIN분보다 길면 그동안은 쉰 것으로 보고 뺀다. 같은 pid 줄에는 모두 같은 값.
 */

var SHEET_NAME = 'events';
var INFO_NAME = '데이터 정보';
var HEADER = ['유저 번호', '받은 시각', '플레이 시각', '총 플레이 시간', 'pid', 'sid', 'gid', 'build', 'seq', 'type', 'eraId', 'eraIndex', 'tick', 'clientMs', 'data'];
var MAX_ROWS_PER_POST = 1000;
var MAX_CELL = 45000; // 시트 칸 하나 한도(5만 자)보다 조금 작게
var GAP_MIN = 3;
var DURATION_FORMAT = '[h]"시간 "mm"분 "ss"초"';
/** 지금 붙여 넣은 코드 판. 웹 앱 주소를 브라우저로 열면 이 값이 보여서, 새 버전이 실제로 배포됐는지 확인할 수 있다 */
var SCRIPT_VERSION = '4판 (2026-10-16)';
var ERA_NAME = '시대별 결과';

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(HEADER);
    sh.setFrozenRows(1);
  }
  migrate_(sh);
  return sh;
}

/** 예전 칸 배치면 칸을 끼워 넣는다: '플레이 시각' 오른쪽에 '총 플레이 시간', 맨 왼쪽에 '유저 번호' */
function migrate_(sh) {
  var head = sh.getRange(1, 1, 1, Math.max(1, sh.getLastColumn())).getValues()[0];
  if (head.indexOf('총 플레이 시간') < 0) {
    var at = head.indexOf('플레이 시각');
    if (at >= 0) {
      sh.insertColumnAfter(at + 1);
      sh.getRange(1, at + 2).setValue('총 플레이 시간');
    }
  }
  head = sh.getRange(1, 1, 1, Math.max(1, sh.getLastColumn())).getValues()[0];
  if (head.indexOf('유저 번호') < 0) {
    sh.insertColumnBefore(1);
    sh.getRange(1, 1).setValue('유저 번호');
  }
}

/** 머리줄 이름 → 칸 번호(1부터) */
function cols_(sh) {
  var head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var m = {};
  for (var i = 0; i < head.length; i++) m[head[i]] = i + 1;
  return m;
}

function str_(v, n) {
  var s = v === undefined || v === null ? '' : String(v);
  return s.length > n ? s.slice(0, n) : s;
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    var body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var rows = (body.rows || []).slice(0, MAX_ROWS_PER_POST);
    if (rows.length === 0) return ContentService.createTextOutput('empty');
    var sh = sheet_();
    var c = cols_(sh);
    var width = sh.getLastColumn();
    var now = new Date();
    var values = rows.map(function (r) {
      var ms = Number(r.clientMs);
      var line = new Array(width);
      for (var i = 0; i < width; i++) line[i] = '';
      var put = function (name, v) { if (c[name]) line[c[name] - 1] = v; };
      put('받은 시각', now);
      put('플레이 시각', isFinite(ms) && ms > 0 ? new Date(ms) : '');
      put('pid', str_(r.pid, 40));
      put('sid', str_(r.sid, 40));
      put('gid', str_(r.gid, 40));
      put('build', str_(r.build, 20));
      put('seq', Number(r.seq) || 0);
      put('type', str_(r.type, 40));
      put('eraId', str_(r.eraId, 20));
      put('eraIndex', Number(r.eraIndex) || 0);
      put('tick', Number(r.tick) || 0);
      put('clientMs', isFinite(ms) ? ms : '');
      put('data', str_(JSON.stringify(r.data === undefined ? null : r.data), MAX_CELL));
      return line;
    });
    sh.getRange(sh.getLastRow() + 1, 1, values.length, width).setValues(values);
    repair_(sh);
    updateTotals_(sh);
    updateUserNumbers_(sh);
    if (rows.some(function (r) { return r.type === 'era_end'; }) || !SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ERA_NAME)) rebuildEraResults_(sh);
    if (!SpreadsheetApp.getActiveSpreadsheet().getSheetByName(INFO_NAME)) writeInfo_();
    return ContentService.createTextOutput('ok ' + values.length);
  } catch (err) {
    return ContentService.createTextOutput('error ' + err);
  } finally {
    lock.releaseLock();
  }
}

/**
 * pid별 총 플레이 시간을 다시 계산해 '총 플레이 시간' 칸에 쓴다.
 * clientMs가 숫자가 아닌 줄(칸이 밀린 줄)은 계산에서 빼고, 그 줄의 칸도 건드리지 않는다.
 */
function updateTotals_(sh) {
  var c = cols_(sh);
  var n = sh.getLastRow() - 1;
  if (n <= 0 || !c['총 플레이 시간'] || !c['pid'] || !c['sid'] || !c['clientMs']) return;
  var pid = sh.getRange(2, c['pid'], n, 1).getValues();
  var sid = sh.getRange(2, c['sid'], n, 1).getValues();
  var ms = sh.getRange(2, c['clientMs'], n, 1).getValues();
  var range = sh.getRange(2, c['총 플레이 시간'], n, 1);
  var cur = range.getValues();
  var ok = [];
  var bySession = {};
  for (var i = 0; i < n; i++) {
    var t = typeof ms[i][0] === 'number' ? ms[i][0] : NaN;
    ok.push(isFinite(t) && t > 1e12 && !!pid[i][0]);
    if (!ok[i]) continue;
    var key = pid[i][0] + '|' + sid[i][0];
    (bySession[key] = bySession[key] || []).push(t);
  }
  var total = {};
  var cap = GAP_MIN * 60000;
  for (var k in bySession) {
    var ts = bySession[k].sort(function (a, b) { return a - b; });
    var sum = 0;
    for (var j = 1; j < ts.length; j++) {
      var gap = ts[j] - ts[j - 1];
      if (gap <= cap) sum += gap;
    }
    var p = k.split('|')[0];
    total[p] = (total[p] || 0) + sum;
  }
  var out = [];
  for (var r = 0; r < n; r++) out.push([ok[r] ? total[pid[r][0]] / 86400000 : cur[r][0]]);
  range.setValues(out);
  range.setNumberFormat(DURATION_FORMAT);
}

/**
 * 칸이 밀린 줄 고치기.
 * 원인: 칸('총 플레이 시간', '유저 번호')을 끼워 넣은 뒤에도 웹 앱이 1판 코드(칸 13개를 맨 왼쪽부터 씀)로 쓴 줄.
 * 1판 줄의 칸 순서: 받은 시각, 플레이 시각, pid, sid, gid, build, seq, type, eraId, eraIndex, tick, clientMs, data.
 * 알아보는 법: 'clientMs' 칸에 시각 숫자가 없다 → 줄 안에서 "시각 숫자 바로 다음이 글자(data)"인 자리를 찾아 1판 줄의 시작을 거꾸로 구한다.
 * pid: 1판 줄의 pid 자리가 지워졌으면(이전 계산이 덮어씀) 같은 sid의 다른 줄에서 찾아 채운다. 못 찾으면 'sid:접속번호'.
 */
var V1 = ['받은 시각', '플레이 시각', 'pid', 'sid', 'gid', 'build', 'seq', 'type', 'eraId', 'eraIndex', 'tick', 'clientMs', 'data'];
var HEX_ID = /^[0-9a-f]{16,40}$/;

function v1Start_(row) {
  for (var st = 0; st + 12 < row.length; st++) {
    var ms = row[st + 11];
    var data = row[st + 12];
    var type = row[st + 7];
    if (typeof ms === 'number' && ms > 1e12 && typeof data === 'string' && data.length > 0 && typeof type === 'string' && /^[a-z_]+$/.test(type)) return st;
  }
  return -1;
}

function repair_(sh) {
  var c = cols_(sh);
  var n = sh.getLastRow() - 1;
  if (n <= 0 || !c['clientMs'] || !c['pid'] || !c['sid']) return 0;
  var width = sh.getLastColumn();
  var all = sh.getRange(2, 1, n, width).getValues();
  var good = function (row) { var m = row[c['clientMs'] - 1]; return typeof m === 'number' && m > 1e12; };
  var pidOfSid = {};
  var starts = [];
  for (var i = 0; i < n; i++) {
    var row = all[i];
    if (good(row)) {
      starts.push(-1);
      if (row[c['pid'] - 1] && row[c['sid'] - 1]) pidOfSid[row[c['sid'] - 1]] = row[c['pid'] - 1];
      continue;
    }
    var st = v1Start_(row);
    starts.push(st);
    if (st >= 0 && typeof row[st + 2] === 'string' && HEX_ID.test(row[st + 2])) pidOfSid[row[st + 3]] = row[st + 2];
  }
  var fixed = 0;
  for (var r = 0; r < n; r++) {
    var st2 = starts[r];
    if (st2 < 0) continue;
    var old = all[r];
    var line = [];
    for (var w = 0; w < width; w++) line.push('');
    for (var k = 0; k < V1.length; k++) if (c[V1[k]]) line[c[V1[k]] - 1] = old[st2 + k];
    var sidv = old[st2 + 3];
    var pidv = old[st2 + 2];
    if (!(typeof pidv === 'string' && HEX_ID.test(pidv))) pidv = pidOfSid[sidv] || ('sid:' + sidv);
    line[c['pid'] - 1] = pidv;
    all[r] = line;
    fixed++;
  }
  if (fixed > 0) sh.getRange(2, 1, n, width).setValues(all);
  return fixed;
}

/**
 * '유저 번호' 칸: pid마다 1, 2, 3 … 처음 플레이한 순서대로 번호를 주고, 한 번 준 번호는 바꾸지 않는다.
 * 번호표는 스크립트 속성(U:pid → 번호)에 저장한다 (시트를 정렬·필터해도 번호가 그대로).
 */
function updateUserNumbers_(sh) {
  var c = cols_(sh);
  var n = sh.getLastRow() - 1;
  if (n <= 0 || !c['유저 번호'] || !c['pid']) return;
  var props = PropertiesService.getScriptProperties();
  var saved = props.getProperties();
  var next = Number(saved['NEXT_USER']) || 1;
  var pid = sh.getRange(2, c['pid'], n, 1).getValues();
  var ms = c['clientMs'] ? sh.getRange(2, c['clientMs'], n, 1).getValues() : null;
  // 새 pid: 처음 기록 시각이 이른 순서로 번호
  var firstMs = {};
  for (var i = 0; i < n; i++) {
    var p = pid[i][0];
    if (!p || saved['U:' + p]) continue;
    var t = ms && typeof ms[i][0] === 'number' ? ms[i][0] : Infinity;
    if (!(p in firstMs) || t < firstMs[p]) firstMs[p] = t;
  }
  var fresh = Object.keys(firstMs).sort(function (a, b) { return firstMs[a] - firstMs[b]; });
  var add = {};
  for (var f = 0; f < fresh.length; f++) {
    add['U:' + fresh[f]] = String(next);
    saved['U:' + fresh[f]] = String(next);
    next++;
  }
  if (fresh.length > 0) {
    add['NEXT_USER'] = String(next);
    props.setProperties(add);
  }
  var out = [];
  for (var r = 0; r < n; r++) out.push([pid[r][0] ? Number(saved['U:' + pid[r][0]]) : '']);
  sh.getRange(2, c['유저 번호'], n, 1).setValues(out);
}

/**
 * '시대별 결과' 탭: events의 era_end(시대 끝 정산) 한 번 = 한 줄. 매번 통째로 다시 만든다.
 * 주식 수익률 = era_end.returnPct: 그 시대 주식 투자로만 늘거나 준 비율(%). 작업 수입·인생 업그레이드로 들어오고 나간 코인은 빼고 계산한 값.
 * 인생 업그레이드 단계 = era_end.interiorLevel (게임 18차 이후). 그 전 기록은 그 판의 업그레이드 기록으로 추정한다.
 */
function rebuildEraResults_(sh) {
  var c = cols_(sh);
  var n = sh.getLastRow() - 1;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var out = ss.getSheetByName(ERA_NAME) || ss.insertSheet(ERA_NAME);
  var head = ['유저 번호', '시대', '끝난 시각', '주식 수익률(%)', '인생 업그레이드 단계', '시대 시작 단계', '매매 수', '작업 수입(코인)', '시대 끝 코인', '단계 출처', 'pid', 'gid'];
  out.clear();
  out.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold').setBackground('#f3e6c4');
  out.setFrozenRows(1);
  if (n <= 0) return;
  var need = ['pid', 'gid', 'type', 'eraId', 'eraIndex', 'clientMs', 'data'];
  for (var q = 0; q < need.length; q++) if (!c[need[q]]) return;
  var all = sh.getRange(2, 1, n, sh.getLastColumn()).getValues();
  var get = function (row, name) { return row[c[name] - 1]; };
  var parse = function (t) { try { return JSON.parse(t); } catch (x) { return null; } };
  var props = PropertiesService.getScriptProperties().getProperties();
  // 판(pid|gid)별: 업그레이드 기록, 기록 시작 때 단계
  var ups = {};
  var starts = {};
  var ends = {};
  for (var i = 0; i < n; i++) {
    var row = all[i];
    var type = get(row, 'type');
    var ms = get(row, 'clientMs');
    if (typeof ms !== 'number') continue;
    var key = get(row, 'pid') + '|' + get(row, 'gid');
    if (type === 'interior_upgrade') {
      var d1 = parse(get(row, 'data'));
      if (d1 && typeof d1.level === 'number') (ups[key] = ups[key] || []).push({ era: get(row, 'eraIndex'), ms: ms, level: d1.level });
    } else if (type === 'game_start') {
      var d2 = parse(get(row, 'data'));
      if (d2 && typeof d2.interiorLevel === 'number') (starts[key] = starts[key] || []).push({ era: get(row, 'eraIndex'), level: d2.interiorLevel });
    } else if (type === 'era_end') {
      var id = key + '|' + get(row, 'eraId');
      if (!ends[id]) ends[id] = { row: row, ms: ms, key: key, data: parse(get(row, 'data')) || {} };
    }
  }
  var lines = [];
  for (var e in ends) {
    var it = ends[e];
    var d = it.data;
    var era = get(it.row, 'eraIndex');
    var level = typeof d.interiorLevel === 'number' ? d.interiorLevel : null;
    var from = '기록';
    if (level === null) {
      from = '추정';
      level = 0;
      (starts[it.key] || []).forEach(function (s0) { if (s0.era <= era) level = Math.max(level, s0.level); });
      (ups[it.key] || []).forEach(function (u) { if (u.era < era || (u.era === era && u.ms <= it.ms)) level = Math.max(level, u.level); });
    }
    var pid = get(it.row, 'pid');
    lines.push([
      Number(props['U:' + pid]) || '',
      get(it.row, 'eraId'),
      new Date(it.ms),
      typeof d.returnPct === 'number' ? d.returnPct : '',
      level,
      typeof d.interiorLevelStart === 'number' ? d.interiorLevelStart : '',
      typeof d.trades === 'number' ? d.trades : '',
      typeof d.workIncome === 'number' ? d.workIncome : '',
      typeof d.finalTotal === 'number' ? d.finalTotal : '',
      from,
      pid,
      get(it.row, 'gid'),
      era,
    ]);
  }
  lines.sort(function (a, b) { return (Number(a[0]) || 1e9) - (Number(b[0]) || 1e9) || a[12] - b[12] || a[2] - b[2]; });
  if (lines.length === 0) return;
  var values = lines.map(function (l) { return l.slice(0, head.length); });
  out.getRange(2, 1, values.length, head.length).setValues(values);
  out.getRange(2, 4, values.length, 1).setNumberFormat('0.0"%"');
  out.getRange(2, 3, values.length, 1).setNumberFormat('yyyy. m. d hh:mm');
}

/** '데이터 정보' 탭: 칸 설명 + 기록 종류(type) 설명. '시트1'·'Sheet1'이 있으면 그 탭 이름을 바꿔 쓴다 */
function writeInfo_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(INFO_NAME) || ss.getSheetByName('시트1') || ss.getSheetByName('Sheet1');
  if (sh) sh.setName(INFO_NAME);
  else sh = ss.insertSheet(INFO_NAME);
  sh.clear();
  var rows = [
    ['역전의 방 플레이 기록 — 칸 설명 (events 탭)', '', ''],
    ['칸', '뜻', '예시·메모'],
    ['유저 번호', '플레이어마다 붙인 번호 (1, 2, 3 … 처음 플레이한 순서)', 'pid가 같으면 같은 번호. 한 번 정한 번호는 바뀌지 않아요. 유저 번호로 필터하면 한 사람의 기록만 볼 수 있어요'],
    ['받은 시각', '이 시트가 기록을 받은 시각', '휴대폰이 모았다가 한꺼번에 보내므로 플레이 시각보다 조금 늦을 수 있어요'],
    ['플레이 시각', '그 일이 휴대폰에서 실제로 일어난 시각', ''],
    ['총 플레이 시간', '이 pid(플레이어)가 지금까지 플레이한 시간 합계. 같은 pid 줄에는 모두 같은 값', '접속마다 기록 사이 간격을 더하고, ' + GAP_MIN + '분 넘게 기록이 없던 구간은 쉰 것으로 보고 뺍니다. 새 기록이 올 때마다 다시 계산'],
    ['pid', '플레이어 번호 (무작위). 이름·연락처와 무관', '같은 휴대폰 + 같은 브라우저면 같은 번호. 인스타 앱 안에서 열 때와 크롬에서 열 때는 다른 번호로 잡힐 수 있어요'],
    ['sid', '접속 번호. 게임 페이지를 열 때마다 새로', ''],
    ['gid', '판 번호 (게임 시드). [새로하기]를 하면 바뀜', ''],
    ['build', '게임 배포 버전', '18차'],
    ['seq', '그 판 안에서 기록 순서 (1부터)', '빠진 기록이 있는지 확인용'],
    ['type', '무슨 일이 있었는지 (아래 표)', 'trade, era_end …'],
    ['eraId / eraIndex', '시대 / 시대 순서', '2000s=0, 2010s=1, 2020s=2'],
    ['tick', '그 시대 안 게임 시간. 1틱 = 3초', '1,800틱 = 90분(시대 끝). 20틱 = 1분'],
    ['clientMs', '플레이 시각을 숫자로 (계산용)', '1970년부터 지난 밀리초'],
    ['data', '자세한 내용 (JSON). type마다 다름', '아래 표의 "data 주요 항목"'],
    ['', '', ''],
    ['기록 종류 (type)', '언제 남나', 'data 주요 항목'],
    ['session_begin', '접속할 때 한 번 (동의한 경우)', 'entry: new 새로하기 / continue 이어하기 / consent 이번에 동의 · sessionIndex 몇 번째 접속 · daysSinceFirst 처음 연 지 며칠 · source 들어온 곳(story 등) · inApp 앱 안 브라우저(instagram·kakao·none) · os · browser · mobile · screenW/screenH 화면 크기 · lang · tzOffsetMin(540=한국)'],
    ['game_start', '기록 시작 (새 판 또는 이어하기)', 'seed 시드 · startCash 시작 코인 · restored 이어하기 여부 · resumeTick 이어 한 지점'],
    ['era_start', '시대 시작', 'startCash · activeThemeIds 이번 판에 나오는 테마'],
    ['news_published', '뉴스 발표', 'newsId · kind: breaking 속보 / tentative 잠정 / clue 단서 / outcome 결과 · effects 영향 테마와 크기'],
    ['news_reacted', '뉴스 발표 3·6초 뒤 나머지 주가 반영', 'newsId · applied 종목별 변동'],
    ['report_created', '뉴스 120초 뒤 주가 리포트가 생김', 'newsId · stockIds'],
    ['trade', '매매 체결', 'side buy 매수 / sell 매도 · stockId · quantity 수량 · price 가격 · fee 수수료 · realizedPnl 실현손익 · holdTicks 보유 기간 · auto 시대 끝 자동 매도 · context 매매 순간 상황(최근 뉴스, 뉴스 뒤 지난 틱, 자산)'],
    ['trade_rejected', '주문이 거절됨', 'error 이유 (코인 부족 등)'],
    ['favorite_toggled', '관심 종목 별 켜기/끄기', 'stockId · on'],
    ['paused / resumed', '일시정지 / 다시 시작', 'reason: background 앱을 나감 / tutorial 튜토리얼'],
    ['speed_changed', '배속 바꿈', 'speed 1 또는 2'],
    ['asset_snapshot', '게임 시간 1분마다 자산 상태', 'cash 현금 · holdingsValue 주식 평가액 · positions 보유 종목 수'],
    ['work_credit / work_payout', '작업(터치)으로 완성 / 100개마다 보상 지급', 'dolls 완성 수 · coins 코인'],
    ['interior_upgrade', '인생 업그레이드', 'level 새 단계 · cost 낸 코인'],
    ['interior_insufficient', '코인이 부족해서 업그레이드를 못 함', 'level · cash'],
    ['deposit', '코인 입금', 'amount · source'],
    ['era_end', '시대 끝 정산 (시대별 결과 탭에 한 줄씩 정리)', 'returnPct 주식 투자로만 얻은 수익률(%, 작업 수입·업그레이드로 오간 코인은 빼고 계산) · interiorLevelStart / interiorLevel 이 시대 시작 / 끝 인생 업그레이드 단계 · trades 매매 수 · maxDrawdownPct 최고점 대비 최대 하락 · investedShare 주식을 들고 있던 시간 비율 · workIncome 작업 수입 · brokeTimeSec 돈이 없어 아무것도 못 한 시간(초) · finalTotal 최종 코인'],
    ['ending_view', '엔딩 화면을 봄', 'ending 엔딩 · finalCoins · cumulativeReturnPct 누적 수익률 · interiorLevel 마지막 단계'],
    ['app_session', '앱을 나감 / 돌아옴', 'phase: background / foreground'],
    ['tab_switch', '아래 탭 이동', 'from → to · dwellMs 앞 탭에 머문 시간(밀리초, 1000 = 1초)'],
    ['screen_view', '창(정산 등)을 닫을 때', 'screen · dwellMs 본 시간'],
    ['news_badge_click / feed_expand', 'NEWS! 배지 누름 / 뉴스 펼쳐 봄', ''],
    ['max_button / order_abandoned', '주문 창 [최대] 누름 / 주문 창을 열었다 그냥 닫음', 'stockId · side · dwellMs'],
    ['lp_touch / dog_touch / dog_belly', 'LP 누름 / 강아지 누름 / 강아지 배 까기(5번 연속)', 'genre · count · reaction'],
    ['setting_changed', '설정 바꿈', 'key · value'],
    ['client_error', '게임 오류', 'code · message'],
    ['', '', ''],
    ['시대별 결과 탭', '시대가 끝날 때마다 한 줄: 유저 번호, 시대, 주식 수익률(%), 인생 업그레이드 단계(끝)·시작 단계, 매매 수, 작업 수입, 시대 끝 코인', "단계 출처 '기록' = 게임이 보낸 값, '추정' = 예전 기록이라 업그레이드 기록으로 계산한 값. 새 시대 끝 기록이 올 때마다 다시 만들어요"],
    ['참고', '동의한 사람만 기록돼요. 이름·연락처·IP·기기 고유 번호는 모으지 않아요.', '분석: 이 시트를 [파일] → [다운로드] → CSV (events 탭)'],
  ];
  sh.getRange(1, 1, rows.length, 3).setValues(rows);
  sh.getRange(1, 1).setFontWeight('bold').setFontSize(12);
  sh.getRange(2, 1, 1, 3).setFontWeight('bold').setBackground('#f3e6c4');
  var typeHead = 18;
  sh.getRange(typeHead, 1, 1, 3).setFontWeight('bold').setBackground('#f3e6c4');
  sh.setColumnWidth(1, 220);
  sh.setColumnWidth(2, 360);
  sh.setColumnWidth(3, 560);
  sh.getRange(1, 1, rows.length, 3).setWrap(true).setVerticalAlignment('top');
  sh.setFrozenRows(2);
  ss.setActiveSheet(sh);
  ss.moveActiveSheet(1);
}

/** 코드를 바꾼 뒤 한 번 실행: 데이터 정보 탭, 총 플레이 시간 칸 만들기·계산 */
function setupSheet() {
  var sh = sheet_();
  var fixed = repair_(sh);
  updateTotals_(sh);
  updateUserNumbers_(sh);
  rebuildEraResults_(sh);
  writeInfo_();
  Logger.log('코드 ' + SCRIPT_VERSION + ' · 칸이 밀린 줄 ' + fixed + '개 고침');
}

/** 브라우저로 주소를 열면 살아 있는지 보여 준다. ?key=EXPORT_KEY 면 모든 기록을 JSON으로 내려준다 */
function doGet(e) {
  var sh = sheet_();
  var key = PropertiesService.getScriptProperties().getProperty('EXPORT_KEY');
  if (!key || !e || !e.parameter || e.parameter.key !== key) {
    return ContentService.createTextOutput('역전의 방 플레이 기록을 받는 중이에요. 코드 ' + SCRIPT_VERSION + ' · 쌓인 줄 수: ' + Math.max(0, sh.getLastRow() - 1));
  }
  var c = cols_(sh);
  var values = sh.getDataRange().getValues();
  var get = function (v, name) { return c[name] ? v[c[name] - 1] : ''; };
  var out = [];
  for (var i = 1; i < values.length; i++) {
    var v = values[i];
    var data = null;
    try { data = JSON.parse(get(v, 'data')); } catch (x) { data = null; }
    out.push({ user: get(v, '유저 번호'), pid: get(v, 'pid'), sid: get(v, 'sid'), gid: get(v, 'gid'), build: get(v, 'build'), seq: get(v, 'seq'), type: get(v, 'type'), eraId: get(v, 'eraId'), eraIndex: get(v, 'eraIndex'), tick: get(v, 'tick'), clientMs: get(v, 'clientMs'), data: data });
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}
