/**
 * 역전의 방 — 플레이 기록 받기 (구글 Apps Script 웹 앱, 18차)
 *
 * 처음 쓰는 법 (자세한 순서는 docs/telemetry.md 9장)
 * 1) 구글 스프레드시트에서 [확장 프로그램] → [Apps Script], 이 코드를 통째로 붙여 넣고 저장
 * 2) [배포] → [새 배포] → 유형 '웹 앱', 실행 '나', 액세스 '모든 사용자' → 배포 → 권한 허용
 * 3) 웹 앱 주소(…/exec)를 게임 src/ui/telemetryConfig.ts의 TELEMETRY_ENDPOINT에 넣는다
 *
 * 코드를 바꿨을 때: 붙여 넣고 저장 → [배포] → [배포 관리] → 연필 → 버전 '새 버전' → [배포] (주소 그대로)
 *   → 위쪽 함수 선택에서 'setupSheet' 고르고 [실행] 한 번 (데이터 정보 탭·총 플레이 시간 칸을 바로 만든다)
 *
 * 탭
 * - events     : 이벤트 한 줄씩. 칸은 이름으로 찾으므로 순서가 바뀌어도 된다.
 * - 데이터 정보 : 칸·기록 종류 설명 ('시트1'이 있으면 이름을 바꿔 쓴다)
 * 총 플레이 시간 = 같은 pid의 기록을 접속(sid)별로 시간순으로 놓고, 기록 사이 간격을 더한 값.
 *   간격이 GAP_MIN분보다 길면 그동안은 쉰 것으로 보고 뺀다. 같은 pid 줄에는 모두 같은 값.
 */

var SHEET_NAME = 'events';
var INFO_NAME = '데이터 정보';
var HEADER = ['받은 시각', '플레이 시각', '총 플레이 시간', 'pid', 'sid', 'gid', 'build', 'seq', 'type', 'eraId', 'eraIndex', 'tick', 'clientMs', 'data'];
var MAX_ROWS_PER_POST = 1000;
var MAX_CELL = 45000; // 시트 칸 하나 한도(5만 자)보다 조금 작게
var GAP_MIN = 3;
var DURATION_FORMAT = '[h]"시간 "mm"분 "ss"초"';

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

/** 예전 칸 배치(총 플레이 시간 없음)면 '플레이 시각' 오른쪽에 칸을 끼워 넣는다 */
function migrate_(sh) {
  var head = sh.getRange(1, 1, 1, Math.max(1, sh.getLastColumn())).getValues()[0];
  if (head.indexOf('총 플레이 시간') >= 0) return;
  var at = head.indexOf('플레이 시각');
  if (at < 0) return;
  sh.insertColumnAfter(at + 1);
  sh.getRange(1, at + 2).setValue('총 플레이 시간');
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
    updateTotals_(sh);
    if (!SpreadsheetApp.getActiveSpreadsheet().getSheetByName(INFO_NAME)) writeInfo_();
    return ContentService.createTextOutput('ok ' + values.length);
  } catch (err) {
    return ContentService.createTextOutput('error ' + err);
  } finally {
    lock.releaseLock();
  }
}

/** pid별 총 플레이 시간을 다시 계산해 '총 플레이 시간' 칸 전체에 쓴다 */
function updateTotals_(sh) {
  var c = cols_(sh);
  var n = sh.getLastRow() - 1;
  if (n <= 0 || !c['총 플레이 시간'] || !c['pid'] || !c['sid'] || !c['clientMs']) return;
  var pid = sh.getRange(2, c['pid'], n, 1).getValues();
  var sid = sh.getRange(2, c['sid'], n, 1).getValues();
  var ms = sh.getRange(2, c['clientMs'], n, 1).getValues();
  var bySession = {};
  for (var i = 0; i < n; i++) {
    var t = Number(ms[i][0]);
    if (!pid[i][0] || !isFinite(t) || t <= 0) continue;
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
  for (var r = 0; r < n; r++) out.push([pid[r][0] && total[pid[r][0]] !== undefined ? total[pid[r][0]] / 86400000 : '']);
  var range = sh.getRange(2, c['총 플레이 시간'], n, 1);
  range.setValues(out);
  range.setNumberFormat(DURATION_FORMAT);
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
    ['era_end', '시대 끝 정산', 'returnPct 수익률(%) · trades 매매 수 · maxDrawdownPct 최고점 대비 최대 하락 · investedShare 주식을 들고 있던 시간 비율 · workIncome 작업 수입 · brokeTimeSec 돈이 없어 아무것도 못 한 시간(초) · finalTotal 최종 코인'],
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
    ['참고', '동의한 사람만 기록돼요. 이름·연락처·IP·기기 고유 번호는 모으지 않아요.', '분석: 이 시트를 [파일] → [다운로드] → CSV (events 탭)'],
  ];
  sh.getRange(1, 1, rows.length, 3).setValues(rows);
  sh.getRange(1, 1).setFontWeight('bold').setFontSize(12);
  sh.getRange(2, 1, 1, 3).setFontWeight('bold').setBackground('#f3e6c4');
  var typeHead = 17;
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
  updateTotals_(sh);
  writeInfo_();
}

/** 브라우저로 주소를 열면 살아 있는지 보여 준다. ?key=EXPORT_KEY 면 모든 기록을 JSON으로 내려준다 */
function doGet(e) {
  var sh = sheet_();
  var key = PropertiesService.getScriptProperties().getProperty('EXPORT_KEY');
  if (!key || !e || !e.parameter || e.parameter.key !== key) {
    return ContentService.createTextOutput('역전의 방 플레이 기록을 받는 중이에요. 쌓인 줄 수: ' + Math.max(0, sh.getLastRow() - 1));
  }
  var c = cols_(sh);
  var values = sh.getDataRange().getValues();
  var get = function (v, name) { return c[name] ? v[c[name] - 1] : ''; };
  var out = [];
  for (var i = 1; i < values.length; i++) {
    var v = values[i];
    var data = null;
    try { data = JSON.parse(get(v, 'data')); } catch (x) { data = null; }
    out.push({ pid: get(v, 'pid'), sid: get(v, 'sid'), gid: get(v, 'gid'), build: get(v, 'build'), seq: get(v, 'seq'), type: get(v, 'type'), eraId: get(v, 'eraId'), eraIndex: get(v, 'eraIndex'), tick: get(v, 'tick'), clientMs: get(v, 'clientMs'), data: data });
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}
