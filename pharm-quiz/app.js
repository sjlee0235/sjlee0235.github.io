/* 입장 코드로 문제 데이터를 복호화한 뒤 gate.js 가 호출한다 */
window.initQuiz = function () {
  'use strict';

  var PARTS = window.PARTS || [];
  var DATA = window.QUIZ_DATA || {};
  var PER_PART = { ox: 20, mcq: 10 };
  var TYPE_LABEL = { ox: 'O,X', mcq: '5지선다', mock: '랜덤 모의고사' };
  var STORE_KEY = 'pharmquiz-v1';

  var $ = function (id) { return document.getElementById(id); };

  // ───── 상태 (설정·최근 결과는 브라우저에 저장되어 처음 화면으로 돌아와도 유지) ─────
  var state = load() || { parts: [], type: null, last: null };
  var session = null;

  function load() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)); } catch (e) { return null; }
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* 저장 불가 환경 무시 */ }
  }

  function partById(id) { for (var i = 0; i < PARTS.length; i++) if (PARTS[i].id === id) return PARTS[i]; return null; }
  function isReady(id) { var d = DATA[id]; return !!(d && d.ox && d.ox.length && d.mcq && d.mcq.length); }
  function mockReady() { return PARTS.every(function (p) { return isReady(p.id); }); }
  function mockTotal() { return PARTS.reduce(function (s, p) { return s + p.mock; }, 0); }

  // 사용할 수 없는 파트/유형이 저장돼 있으면 정리
  state.parts = (state.parts || []).filter(isReady);
  if (state.type === 'mock' && !mockReady()) state.type = null;

  // ───── 화면 전환 ─────
  var screens = ['home', 'parts', 'type', 'quiz', 'result'];
  function show(name) {
    screens.forEach(function (s) { $('screen-' + s).hidden = s !== name; });
    if (name === 'home') renderHome();
    if (name === 'parts') renderParts();
    if (name === 'type') renderType();
    window.scrollTo(0, 0);
  }
  document.querySelectorAll('[data-go]').forEach(function (b) {
    b.addEventListener('click', function () { show(b.getAttribute('data-go')); });
  });

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function toast(msg) {
    var t = $('toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('show'); }, 1800);
  }
  function partNames(ids) { return ids.map(function (id) { return partById(id).name; }).join(', '); }

  // ───── 1. 처음 화면 ─────
  function renderHome() {
    var hasSetting = state.parts.length && state.type;
    $('recent-card').hidden = !(hasSetting || state.last);
    $('recent-setting').textContent = state.type === 'mock'
      ? '랜덤 모의고사'
      : (state.parts.length ? partNames(state.parts) : '-') + (state.type ? ' · ' + TYPE_LABEL[state.type] : '');
    $('recent-result-row').hidden = !state.last;
    if (state.last) {
      $('recent-result').textContent = state.last.label + ' · ' + state.last.score + '/' + state.last.total +
        ' (' + Math.round(state.last.score / state.last.total * 100) + '%)';
    }
  }
  $('btn-start').addEventListener('click', function () { show('parts'); });

  // ───── 2. 파트 선택 ─────
  function renderParts() {
    var grid = $('part-grid');
    grid.innerHTML = '';
    PARTS.forEach(function (p) {
      var ready = isReady(p.id);
      var b = document.createElement('button');
      b.className = 'part' + (state.parts.indexOf(p.id) > -1 ? ' selected' : '');
      b.disabled = !ready;
      b.innerHTML = '<span class="emoji">' + p.emoji + '</span><span class="name">' + esc(p.name) + '</span>' +
        (ready ? '' : '<span class="soon">준비중</span>');
      b.addEventListener('click', function () {
        var i = state.parts.indexOf(p.id);
        if (i > -1) state.parts.splice(i, 1); else state.parts.push(p.id);
        // 파트 순서는 항상 목록 순서로 유지
        state.parts = PARTS.map(function (x) { return x.id; }).filter(function (id) { return state.parts.indexOf(id) > -1; });
        save(); renderParts();
      });
      grid.appendChild(b);
    });
    $('btn-parts-next').disabled = state.parts.length === 0;
  }
  $('btn-parts-next').addEventListener('click', function () { if (state.parts.length) show('type'); });

  // ───── 3. 유형 선택 ─────
  function renderType() {
    $('type-parts-label').textContent = '선택한 파트: ' + partNames(state.parts);
    var mockOk = mockReady();
    $('mock-desc').textContent = mockOk
      ? '전 파트 · 국시 비율대로 ' + mockTotal() + '문제 (선택한 파트와 무관)'
      : '국시 비율대로 약 ' + mockTotal() + '문제 · 전 파트 오픈 후 이용 가능';
    document.querySelectorAll('.type-card').forEach(function (c) {
      var t = c.getAttribute('data-type');
      c.disabled = t === 'mock' && !mockOk;
      c.classList.toggle('selected', state.type === t);
      var chk = c.querySelector('.check, .lock');
      chk.className = c.disabled ? 'lock' : 'check';
      chk.textContent = c.disabled ? '🔒' : '';
    });
    var sum = '';
    if (state.type === 'mock') sum = '총 ' + mockTotal() + '문제 · 국시와 같은 파트 순서';
    else if (state.type) sum = '총 ' + countFor(state.type) + '문제 · 순서 랜덤';
    $('type-summary').textContent = sum;
    $('btn-type-next').disabled = !state.type;
  }
  function countFor(type) {
    return state.parts.reduce(function (s, id) { return s + Math.min(PER_PART[type], DATA[id][type].length); }, 0);
  }
  document.querySelectorAll('.type-card').forEach(function (c) {
    c.addEventListener('click', function () {
      if (c.disabled) return;
      state.type = c.getAttribute('data-type');
      save(); renderType();
    });
  });
  $('btn-type-next').addEventListener('click', function () { if (state.type) startQuiz(); });

  // ───── 4. 퀴즈 ─────
  function buildQuestions() {
    var list = [];
    if (state.type === 'mock') {
      // 파트 순서대로, 각 파트에서 국시 비율만큼 5지선다 랜덤 선정
      PARTS.forEach(function (p) {
        shuffle(DATA[p.id].mcq).slice(0, p.mock).forEach(function (q) { list.push({ part: p.id, kind: 'mcq', q: q }); });
      });
      return list;
    }
    state.parts.forEach(function (id) {
      shuffle(DATA[id][state.type]).slice(0, PER_PART[state.type]).forEach(function (q) {
        list.push({ part: id, kind: state.type, q: q });
      });
    });
    return shuffle(list);
  }

  function startQuiz() {
    session = { items: buildQuestions(), idx: 0, results: [] };
    show('quiz');
    renderQuestion();
  }

  var CIRCLED = ['①', '②', '③', '④', '⑤'];
  function renderQuestion() {
    var it = session.items[session.idx];
    var q = it.q;
    var total = session.items.length;
    $('q-counter').textContent = (session.idx + 1) + ' / ' + total;
    $('progress-bar').style.width = (session.idx / total * 100) + '%';

    var p = partById(it.part);
    var meta = '<span class="tag">' + p.emoji + ' ' + esc(p.name) + '</span>';
    if (q.tag === 'red') meta += '<span class="tag red">🆕 2026 개정</span>';
    if (q.tag === 'hl') meta += '<span class="tag hl">⭐ 중요</span>';
    $('q-meta').innerHTML = meta;

    $('q-text').textContent = q.q;
    $('q-box').hidden = !q.box;
    $('q-box').textContent = q.box || '';

    var box = $('answers');
    box.innerHTML = '';
    box.className = 'answers' + (it.kind === 'ox' ? ' ox' : '');
    if (it.kind === 'ox') {
      [['O', true, 'o-btn'], ['X', false, 'x-btn']].forEach(function (o) {
        var b = document.createElement('button');
        b.className = 'ans ' + o[2];
        b.textContent = o[0];
        b.setAttribute('aria-label', o[0]);
        b.addEventListener('click', function () { answer(o[1], b); });
        box.appendChild(b);
      });
    } else {
      q.c.forEach(function (text, i) {
        var b = document.createElement('button');
        b.className = 'ans';
        b.innerHTML = '<span class="num">' + (i + 1) + '</span><span>' + esc(text) + '</span>';
        b.addEventListener('click', function () { answer(i, b); });
        box.appendChild(b);
      });
    }
    $('feedback').hidden = true;
    session.locked = false;
  }

  function answer(choice, btn) {
    if (session.locked) return;
    session.locked = true;
    var it = session.items[session.idx];
    var q = it.q;
    var correct = choice === q.a;
    var btns = Array.prototype.slice.call($('answers').children);
    btns.forEach(function (b) { b.disabled = true; });

    var correctIdx = it.kind === 'ox' ? (q.a ? 0 : 1) : q.a;
    btns[correctIdx].classList.add('correct');
    if (!correct) btn.classList.add('wrong');
    btns.forEach(function (b, i) { if (i !== correctIdx && b !== btn) b.classList.add('dim'); });

    var ansLabel = it.kind === 'ox' ? (q.a ? 'O' : 'X') : CIRCLED[q.a];
    var v = $('verdict');
    v.className = 'verdict ' + (correct ? 'ok' : 'bad');
    v.innerHTML = correct ? '⭕ 정답이에요!' : '❌ 오답이에요 <small>정답 ' + ansLabel + '</small>';
    $('exp-text').textContent = q.exp;
    $('btn-next').textContent = session.idx === session.items.length - 1 ? '결과 보기' : '다음 문제';
    $('feedback').hidden = false;

    session.results.push({ item: it, choice: choice, correct: correct });
    $('progress-bar').style.width = ((session.idx + 1) / session.items.length * 100) + '%';
    $('feedback').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  $('btn-next').addEventListener('click', function () {
    if (session.idx < session.items.length - 1) {
      session.idx++;
      renderQuestion();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      finish();
    }
  });

  $('btn-quit').addEventListener('click', function () {
    if (confirm('퀴즈를 그만두고 처음 화면으로 돌아갈까요?\n(현재 풀이 기록은 저장되지 않아요)')) show('home');
  });

  // 키보드: O/X, 1~5, Enter
  document.addEventListener('keydown', function (e) {
    if ($('screen-quiz').hidden || e.metaKey || e.ctrlKey || e.altKey) return;
    var btns = $('answers').children;
    var k = e.key.toLowerCase();
    if (!session.locked) {
      var it = session.items[session.idx];
      if (it.kind === 'ox' && (k === 'o' || k === 'x')) btns[k === 'o' ? 0 : 1].click();
      else if (it.kind !== 'ox' && k >= '1' && k <= '5') btns[+k - 1].click();
    } else if (k === 'enter') {
      e.preventDefault(); $('btn-next').click();
    }
  });

  // ───── 5. 결과 ─────
  function finish() {
    var res = session.results;
    var score = res.filter(function (r) { return r.correct; }).length;
    var total = res.length;
    var pct = Math.round(score / total * 100);

    $('score-num').textContent = score;
    $('score-total').textContent = '/ ' + total;
    $('score-ring').style.setProperty('--p', pct);
    $('result-msg').textContent = pct >= 90 ? '완벽해요! 합격 각 🎉' : pct >= 70 ? '잘하고 있어요! 💪' : pct >= 50 ? '조금만 더! 🔥' : '틀린 문제 복습하면 오를 거예요 📚';
    var label = state.type === 'mock' ? '랜덤 모의고사' : partNames(state.parts) + ' · ' + TYPE_LABEL[state.type];
    $('result-sub').textContent = label + ' · 정답률 ' + pct + '%';

    // 파트별 정답률
    var by = {};
    res.forEach(function (r) {
      var b = by[r.item.part] || (by[r.item.part] = { s: 0, t: 0 });
      b.t++; if (r.correct) b.s++;
    });
    $('breakdown').innerHTML = PARTS.filter(function (p) { return by[p.id]; }).map(function (p) {
      var b = by[p.id];
      return '<div class="bd-row"><span>' + p.emoji + ' ' + esc(p.name) + '</span><span class="bd-bar"><i style="width:' +
        Math.round(b.s / b.t * 100) + '%"></i></span><b>' + b.s + ' / ' + b.t + '</b></div>';
    }).join('');

    // 틀린 문제
    var wrong = res.filter(function (r) { return !r.correct; });
    $('wrong-count').textContent = '(' + wrong.length + ')';
    $('review-wrap').hidden = wrong.length === 0;
    $('review-wrap').open = false;
    $('review-list').innerHTML = wrong.map(function (r) {
      var q = r.item.q, isOx = r.item.kind === 'ox';
      var mine = isOx ? (r.choice ? 'O' : 'X') : CIRCLED[r.choice] + ' ' + q.c[r.choice];
      var right = isOx ? (q.a ? 'O' : 'X') : CIRCLED[q.a] + ' ' + q.c[q.a];
      return '<div class="rv-item"><p class="rv-q">' + esc(q.q) + (q.box ? '\n' + esc(q.box) : '') + '</p>' +
        '<p class="rv-a">내 답 <span class="bad">' + esc(mine) + '</span> · 정답 <span class="ok">' + esc(right) + '</span></p>' +
        '<p class="rv-exp">' + esc(q.exp) + '</p></div>';
    }).join('');

    state.last = { label: label, score: score, total: total };
    save();
    show('result');
  }

  $('btn-home').addEventListener('click', function () { show('home'); });
  $('btn-retry').addEventListener('click', startQuiz);

  // 시작
  show('home');
};
