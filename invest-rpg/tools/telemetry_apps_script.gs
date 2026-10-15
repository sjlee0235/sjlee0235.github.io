/**
 * 역전의 방 — 플레이 기록 받기 (구글 Apps Script 웹 앱, 18차)
 *
 * 쓰는 법 (자세한 순서는 docs/telemetry.md 9장)
 * 1) 구글 스프레드시트를 새로 만들고 [확장 프로그램] → [Apps Script]
 * 2) 이 코드를 통째로 붙여 넣고 저장
 * 3) [배포] → [새 배포] → 유형 '웹 앱', 실행 '나', 액세스 '모든 사용자' → 배포 → 권한 허용
 * 4) 나온 웹 앱 주소(…/exec)를 게임 src/ui/telemetryConfig.ts의 TELEMETRY_ENDPOINT에 넣는다
 *
 * 게임은 동의한 사람의 기록만 묶어서 보낸다 (이름·연락처·기기 고유 번호·IP 없음).
 * 시트 'events'에 이벤트 한 줄씩 쌓인다. data 칸은 JSON 문자열.
 * (선택) 내려받기: [프로젝트 설정] → 스크립트 속성에 EXPORT_KEY = 아무 비밀 문자열 → 웹 앱 주소?key=그문자열 로 JSON을 받는다.
 */

var SHEET_NAME = 'events';
var HEADER = ['받은 시각', '플레이 시각', 'pid', 'sid', 'gid', 'build', 'seq', 'type', 'eraId', 'eraIndex', 'tick', 'clientMs', 'data'];
var MAX_ROWS_PER_POST = 1000;
var MAX_CELL = 45000; // 시트 칸 하나 한도(5만 자)보다 조금 작게

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(HEADER);
    sh.setFrozenRows(1);
  }
  return sh;
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
    var now = new Date();
    var values = rows.map(function (r) {
      var ms = Number(r.clientMs);
      return [
        now,
        isFinite(ms) && ms > 0 ? new Date(ms) : '',
        str_(r.pid, 40), str_(r.sid, 40), str_(r.gid, 40), str_(r.build, 20),
        Number(r.seq) || 0, str_(r.type, 40), str_(r.eraId, 20), Number(r.eraIndex) || 0, Number(r.tick) || 0,
        isFinite(ms) ? ms : '',
        str_(JSON.stringify(r.data === undefined ? null : r.data), MAX_CELL),
      ];
    });
    var sh = sheet_();
    sh.getRange(sh.getLastRow() + 1, 1, values.length, HEADER.length).setValues(values);
    return ContentService.createTextOutput('ok ' + values.length);
  } catch (err) {
    return ContentService.createTextOutput('error ' + err);
  } finally {
    lock.releaseLock();
  }
}

/** 브라우저로 주소를 열면 살아 있는지 보여 준다. ?key=EXPORT_KEY 면 모든 기록을 JSON으로 내려준다 */
function doGet(e) {
  var key = PropertiesService.getScriptProperties().getProperty('EXPORT_KEY');
  if (!key || !e || !e.parameter || e.parameter.key !== key) {
    return ContentService.createTextOutput('역전의 방 플레이 기록을 받는 중이에요. 쌓인 줄 수: ' + Math.max(0, sheet_().getLastRow() - 1));
  }
  var values = sheet_().getDataRange().getValues();
  var out = [];
  for (var i = 1; i < values.length; i++) {
    var v = values[i];
    var data = null;
    try { data = JSON.parse(v[12]); } catch (x) { data = null; }
    out.push({ pid: v[2], sid: v[3], gid: v[4], build: v[5], seq: v[6], type: v[7], eraId: v[8], eraIndex: v[9], tick: v[10], clientMs: v[11], data: data });
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}
