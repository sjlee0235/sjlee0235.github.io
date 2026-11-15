/* 입장 코드 화면
 * - 문제·해설은 data/vault.json 에 암호화되어 있고, 입장 코드로만 풀 수 있다.
 *   (PBKDF2-SHA256 으로 코드에서 키를 만들고 AES-256-GCM 으로 복호화)
 * - 처음 화면·댓글은 누구나 볼 수 있고, '시작'을 누르면 이 화면이 나온다.
 * - 코드가 맞으면 이 기기에 기억해 두고 다음부터는 묻지 않는다. 코드가 바뀌면 다시 묻는다.
 * - 띄어쓰기·대소문자는 구분하지 않는다.
 */
(function () {
  'use strict';

  var VAULT_URL = 'data/vault.json?v=32';
  var SYN_URL = 'data/vault-syn.json?v=32'; // 합성학 (구조식 이미지 포함, gzip 압축 후 암호화)
  var HERB_URL = 'data/vault-herb.json?v=32'; // 생약학 (gzip 압축 후 암호화)
  var BIO_URL = 'data/vault-bio.json?v=32'; // 생화학 (gzip 압축 후 암호화)
  var currentCode = null;
  var CODE_KEY = 'pharmquiz-code';
  // 조회수: 페이지를 열 때마다 1씩 증가 (같은 사람이 3번 열면 +3)
  // 첫 번째 카운터가 응답하지 않으면 다음 카운터로 넘어감
  var COUNTER_URLS = [
    'https://abacus.jasoncameron.dev/hit/sjlee0235-pharmquiz/visits',
    'https://countapi.mileshilliard.com/api/v1/hit/sjlee0235-pharmquiz-visits'
  ];

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

  var vaults = {};
  function getVault(url) {
    if (!vaults[url]) {
      vaults[url] = fetch(url, { cache: 'no-cache' }).then(function (r) {
        if (!r.ok) throw new Error('vault ' + r.status);
        return r.json();
      });
      vaults[url].catch(function () { delete vaults[url]; }); // 실패하면 다음에 다시 받기
    }
    return vaults[url];
  }

  function gunzip(buf) {
    if (typeof DecompressionStream === 'undefined') return Promise.reject(new Error('vault gzip'));
    return new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
  }

  function decryptVault(url, code) {
    var enc = new TextEncoder();
    return getVault(url).then(function (v) {
      return crypto.subtle.importKey('raw', enc.encode(normalize(code)), 'PBKDF2', false, ['deriveKey'])
        .then(function (base) {
          return crypto.subtle.deriveKey(
            { name: 'PBKDF2', salt: fromB64(v.salt), iterations: v.iter, hash: 'SHA-256' },
            base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
        })
        .then(function (key) { return crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(v.iv) }, key, fromB64(v.ct)); })
        .then(function (buf) { return v.z === 'gzip' ? gunzip(buf) : buf; })
        .then(function (buf) { return JSON.parse(new TextDecoder().decode(buf)); });
    });
  }
  function unlock(code) {
    return decryptVault(VAULT_URL, code).then(function (data) { currentCode = normalize(code); return data; });
  }

  // 합성학·생약학 데이터: 입장 후에 필요할 때만 받아서 같은 코드로 푼다
  var extra = {};
  function loadExtra(url) {
    if (!currentCode) return Promise.reject(new Error('locked'));
    if (!extra[url]) {
      extra[url] = decryptVault(url, currentCode);
      extra[url].catch(function () { delete extra[url]; });
    }
    return extra[url];
  }
  window.loadSynth = function () { return loadExtra(SYN_URL); };
  window.loadHerb = function () { return loadExtra(HERB_URL); };
  window.loadBiochem = function () { return loadExtra(BIO_URL); };

  function enter(data) {
    window.QUIZ_DATA = data;
    window.__quizUnlocked = true;
    window.dispatchEvent(new CustomEvent('quiz:unlocked', { detail: data }));
  }

  function showMsg(text, isError) {
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
    if (!window.crypto || !crypto.subtle) { showMsg('이 브라우저에서는 열 수 없어요. 크롬이나 사파리로 열어주세요', true); return; }
    var code = normalize(input.value);
    if (!code) { showMsg('코드를 입력해주세요', true); shake(); input.focus(); return; }
    btn.disabled = true;
    showMsg('확인 중…');
    unlock(code).then(function (data) {
      setSaved(code);
      input.blur();
      input.value = '';
      showMsg('');
      enter(data);
    }).catch(function (err) {
      if (err && /vault/.test(err.message)) showMsg('문제를 불러오지 못했어요. 잠시 후 다시 시도해주세요', true);
      else { showMsg('코드가 맞지 않아요. 다시 확인해주세요', true); shake(); input.select(); }
    }).then(function () { btn.disabled = false; });
  });

  // 입장 코드 화면이 열릴 때
  window.addEventListener('quiz:gate', function () {
    showMsg('');
    getVault(VAULT_URL).catch(function () {});
    setTimeout(function () { input.focus(); }, 50);
  });

  // 전에 입장한 기기면 저장된 코드로 미리 풀어둔다 ('시작'을 누르면 바로 입장)
  var saved = getSaved();
  if (saved && window.crypto && crypto.subtle) {
    unlock(saved).then(enter).catch(function (err) {
      if (!(err && /vault/.test(err.message))) setSaved(null); // 코드가 바뀐 경우 다시 묻기
    });
  }

  // 조회수 (값이 숫자 또는 문자열로 와도 처리, 응답이 없으면 8초 후 다음 카운터 시도)
  function hitCounter(url) {
    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = ctrl && setTimeout(function () { ctrl.abort(); }, 8000);
    return fetch(url, { cache: 'no-store', signal: ctrl ? ctrl.signal : undefined })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (j) {
        if (timer) clearTimeout(timer);
        var n = parseInt(j && (j.value != null ? j.value : j.count), 10);
        if (isNaN(n)) throw new Error('bad count');
        return n;
      }, function (err) { if (timer) clearTimeout(timer); throw err; });
  }
  (function tryCounter(i) {
    if (i >= COUNTER_URLS.length) { $('view-count').textContent = '-'; return; }
    hitCounter(COUNTER_URLS[i])
      .then(function (n) { $('view-count').textContent = n.toLocaleString('ko-KR'); })
      .catch(function () { tryCounter(i + 1); });
  })(0);
})();
