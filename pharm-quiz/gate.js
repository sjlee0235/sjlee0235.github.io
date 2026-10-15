/* 입장 코드 화면
 * - 문제·해설은 data/vault.json 에 암호화되어 있고, 입장 코드로만 풀 수 있다.
 *   (PBKDF2-SHA256 으로 코드에서 키를 만들고 AES-256-GCM 으로 복호화)
 * - 코드가 맞으면 이 기기에 기억해 두고 다음부터는 묻지 않는다. 코드가 바뀌면 다시 묻는다.
 * - 띄어쓰기·대소문자는 구분하지 않는다.
 */
(function () {
  'use strict';

  var VAULT_URL = 'data/vault.json?v=6';
  var CODE_KEY = 'pharmquiz-code';
  // 조회수: 페이지를 열 때마다 1씩 증가 (같은 사람이 3번 열면 +3)
  var COUNTER_URL = 'https://abacus.jasoncameron.dev/hit/sjlee0235-pharmquiz/visits';

  var $ = function (id) { return document.getElementById(id); };
  var form = $('gate-form'), input = $('gate-input'), btn = $('gate-submit'), msg = $('gate-msg');

  function normalize(code) { return String(code || '').normalize('NFC').replace(/\s+/g, '').toLowerCase(); }
  function fromB64(s) {
    var bin = atob(s), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  function getSaved() { try { return localStorage.getItem(CODE_KEY); } catch (e) { return null; } }
  function setSaved(v) { try { if (v) localStorage.setItem(CODE_KEY, v); else localStorage.removeItem(CODE_KEY); } catch (e) { /* 무시 */ } }

  var vault = fetch(VAULT_URL, { cache: 'no-cache' }).then(function (r) {
    if (!r.ok) throw new Error('vault ' + r.status);
    return r.json();
  });

  function unlock(code) {
    var enc = new TextEncoder();
    return vault.then(function (v) {
      return crypto.subtle.importKey('raw', enc.encode(normalize(code)), 'PBKDF2', false, ['deriveKey'])
        .then(function (base) {
          return crypto.subtle.deriveKey(
            { name: 'PBKDF2', salt: fromB64(v.salt), iterations: v.iter, hash: 'SHA-256' },
            base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
        })
        .then(function (key) { return crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(v.iv) }, key, fromB64(v.ct)); })
        .then(function (buf) { return JSON.parse(new TextDecoder().decode(buf)); });
    });
  }

  function enter(data) {
    window.QUIZ_DATA = data;
    $('screen-gate').hidden = true;
    window.initQuiz();
    window.__quizUnlocked = true;
    window.dispatchEvent(new Event('quiz:unlocked'));
  }

  function showForm(text, isError) {
    form.hidden = false;
    msg.textContent = text || '';
    msg.classList.toggle('error', !!isError);
  }

  function shake() {
    form.classList.remove('shake');
    void form.offsetWidth; // 애니메이션 다시 시작
    form.classList.add('shake');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var code = normalize(input.value);
    if (!code) { showForm('코드를 입력해주세요', true); shake(); input.focus(); return; }
    btn.disabled = true;
    msg.classList.remove('error');
    msg.textContent = '확인 중…';
    unlock(code).then(function (data) {
      setSaved(code);
      input.blur();
      enter(data);
    }).catch(function (err) {
      if (err && /vault/.test(err.message)) showForm('문제를 불러오지 못했어요. 잠시 후 다시 시도해주세요', true);
      else { showForm('코드가 맞지 않아요. 다시 확인해주세요', true); shake(); input.select(); }
    }).then(function () { btn.disabled = false; });
  });

  // 저장된 코드가 있으면 자동 입장
  var saved = getSaved();
  if (!window.crypto || !crypto.subtle) {
    showForm('이 브라우저에서는 열 수 없어요. 크롬이나 사파리로 열어주세요', true);
  } else if (saved) {
    unlock(saved).then(enter).catch(function () { setSaved(null); showForm(''); input.focus(); });
  } else {
    showForm('');
  }

  // 조회수
  fetch(COUNTER_URL, { cache: 'no-store' })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (j) {
      var n = typeof j.value === 'number' ? j.value : j.count;
      $('view-count').textContent = typeof n === 'number' ? n.toLocaleString('ko-KR') : '-';
    })
    .catch(function () { $('view-count').textContent = '-'; });
})();
