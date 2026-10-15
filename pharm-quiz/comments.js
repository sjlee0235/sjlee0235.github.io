/* 예비약사 라운지 (댓글)
 * - 닉네임: 브라우저마다 하나씩 '~한 예비약사'를 부여하고 localStorage에 저장
 *   (Firestore 연결 시 nicknames 컬렉션에 먼저 등록해 다른 사람과 겹치지 않게 함)
 * - 저장소: Firebase Firestore (comments-config.js 가 비어 있으면 준비 중 상태)
 */
const FIREBASE_VER = '10.12.2';
const NICK_KEY = 'pharmquiz-nick';
const COOLDOWN_MS = 20 * 1000;
const PAGE = 30;

const ADJ = [
  '울고있는', '자다깬', '커피수혈중인', '밤새운', '카페인에절여진', '형광펜을든', '족보찾는', '기출에진심인',
  '단권화중인', '오답노트쓰는', '3회독한', '10회독한', '펜이닳은', '손목아픈', '다크서클내려온', '거북목된',
  '허리아픈', '꾸벅꾸벅조는', '배고픈', '야식먹는', '떡볶이먹는', '마라탕먹는', '탕후루먹는', '해탈한',
  '득도한', '멍때리는', '현실도피중인', '5분만자는', '알람끈', '지각한', '웃고있는', '설레는',
  '긴장한', '덜덜떠는', '심호흡하는', '자신감넘치는', '겸손한', '방금외운', '방금까먹은', '헷갈리는',
  '찍기신공의', '만점받을', '수석할', '합격할', '미래가밝은', '반짝이는', '갓생사는', '미라클모닝하는',
  '새벽5시에깬', '집가고싶은', '고양이키우는', '산책하는', '헬스하는', '러닝하는', '물마시는', '비타민챙기는',
  '유산균챙기는', '반감기가긴', '반감기가짧은', '흡입기흔드는', '생체이용률100%인', '흡수가빠른', '분포가넓은', '대사중인',
  '용량조절중인', '부작용없는', '내성없는', '상호작용없는', 'TDM받는', '서방형인', '속효성인', '장용코팅된',
  '설하정처럼빠른', '위약효과본', '이중맹검된', '무작위배정된', '치료역이넓은', '항상성유지중인', '혈중농도안정된', '활성대사체인',
  '전구약물인', '지용성인', '수용성인', 'BBB통과한', '단백결합된', '신장으로배설되는', '간에서대사되는', '효소유도된',
  '가운입은', '실습끝난', '졸업앞둔', '도서관지킴이인', '열람실1등인', '자리맡은', '벼락치기하는', '계획만세운',
  '플래너꾸미는', '스터디장인', '질문많은', '조용히강한', '꾸준한', '성실한', '느긋한', '열정넘치는',
  '포기안하는', '버티는', '살아남은', '다시일어난', '멘탈잡은', '멘탈나간', '눈물젖은', '노래듣는',
  '로파이듣는', '백색소음켠', '이어폰낀', '아이패드든', '굿노트쓰는', '손글씨예쁜', '필기왕인', '요약왕인',
  '암기왕인', '계산빠른', '단위환산하는', '약어외우는', '성분명외우는', '상품명헷갈리는', '처방전읽는', '복약지도하는',
  '친절한', '다정한', '든든한', '믿음직한', '빛나는', '씩씩한', '귀여운', '당당한',
  '행복한', '배부른', '산책간', '여행가고싶은', '방학기다리는', '주말기다리는', '월요일싫은', '금요일좋은',
  '첫차탄', '막차탄', '퇴근하고싶은', '알바끝난', '장학금받을', '면허받을', '하얀가운의', '꿈꾸는'
];

const $ = (id) => document.getElementById(id);
const els = {
  nick: $('my-nick'), form: $('comment-form'), input: $('comment-input'), char: $('comment-char'),
  submit: $('comment-submit'), list: $('comment-list'), more: $('comment-more'), count: $('comment-count')
};

function store(key, val) {
  try { if (val === undefined) return localStorage.getItem(key); localStorage.setItem(key, val); } catch (e) { return null; }
  return null;
}
function toast(msg) {
  const t = $('toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2000);
}
const randomNick = () => ADJ[Math.floor(Math.random() * ADJ.length)] + ' 예비약사';

// ───── 입력창: 비어 있으면 회색 안내문, 클릭하면 사라짐 ─────
let myNick = store(NICK_KEY) || '';
function welcome() { return myNick ? myNick + '님 환영합니다' : ''; }
function setNick(n) {
  myNick = n; store(NICK_KEY, n);
  els.nick.textContent = n;
  if (document.activeElement !== els.input) els.input.placeholder = welcome();
}
els.input.addEventListener('focus', () => { els.input.placeholder = ''; });
els.input.addEventListener('blur', () => { if (!els.input.value) els.input.placeholder = welcome(); });
els.input.addEventListener('input', () => { els.char.textContent = els.input.value.length + ' / 300'; });

// ───── 시간 표시 ─────
function ago(d) {
  if (!d) return '방금';
  const s = (Date.now() - d.getTime()) / 1000;
  if (s < 60) return '방금';
  if (s < 3600) return Math.floor(s / 60) + '분 전';
  if (s < 86400) return Math.floor(s / 3600) + '시간 전';
  if (s < 86400 * 7) return Math.floor(s / 86400) + '일 전';
  return d.getFullYear() + '.' + (d.getMonth() + 1) + '.' + d.getDate();
}
function renderList(items) {
  els.list.innerHTML = '';
  if (!items.length) {
    els.list.innerHTML = '<li class="comment-empty">첫 번째 응원 댓글을 남겨주세요 ✨</li>';
    return;
  }
  items.forEach((c) => {
    const li = document.createElement('li');
    li.className = 'comment' + (c.nick === myNick ? ' mine' : '');
    const head = document.createElement('div'); head.className = 'c-head';
    const name = document.createElement('strong'); name.textContent = c.nick;
    const time = document.createElement('span'); time.className = 'c-time'; time.textContent = ago(c.at);
    head.append(name, time);
    const body = document.createElement('p'); body.className = 'c-body'; body.textContent = c.text;
    li.append(head, body);
    els.list.appendChild(li);
  });
}

// ───── 입장 코드 확인 후 시작 ─────
const cfg = window.COMMENTS_CONFIG || {};
function boot() {
if (!cfg.apiKey || !cfg.projectId) {
  // 서버가 없으면 중복 확인을 못 하므로 화면에만 보여주고 저장하지 않음
  if (!myNick) myNick = randomNick();
  els.nick.textContent = myNick;
  els.input.placeholder = welcome();
  els.list.innerHTML = '<li class="comment-empty">댓글 기능을 준비하고 있어요. 곧 만나요! 🛠️</li>';
  els.form.addEventListener('submit', (e) => { e.preventDefault(); toast('댓글 기능은 곧 열릴 예정이에요'); });
} else {
  connect().catch(() => {
    if (!myNick) setNick(randomNick()); else setNick(myNick);
    els.list.innerHTML = '<li class="comment-empty">댓글을 불러오지 못했어요. 잠시 후 다시 시도해주세요.</li>';
  });
}
}
if (window.__quizUnlocked) boot();
else window.addEventListener('quiz:unlocked', boot, { once: true });

async function connect() {
  const base = 'https://www.gstatic.com/firebasejs/' + FIREBASE_VER + '/';
  const { initializeApp } = await import(base + 'firebase-app.js');
  const fs = await import(base + 'firebase-firestore.js');
  const db = fs.getFirestore(initializeApp(cfg));

  // 닉네임: 저장된 게 없으면 겹치지 않는 형용사를 골라 등록
  if (!myNick) {
    els.nick.textContent = '닉네임 정하는 중…';
    const pool = ADJ.slice().sort(() => Math.random() - 0.5);
    let chosen = '';
    for (let i = 0; i < pool.length && !chosen; i++) {
      const n = pool[i] + ' 예비약사';
      try { await fs.setDoc(fs.doc(db, 'nicknames', n), { createdAt: fs.serverTimestamp() }); chosen = n; }
      catch (e) { if (e.code !== 'permission-denied') throw e; /* 이미 사용 중 → 다음 */ }
      if (i >= 12 && !chosen) break; // 너무 오래 걸리면 숫자 붙여 해결
    }
    if (!chosen) {
      for (let k = 2; k < 1000 && !chosen; k++) {
        const n = pool[Math.floor(Math.random() * pool.length)] + ' 예비약사 ' + k;
        try { await fs.setDoc(fs.doc(db, 'nicknames', n), { createdAt: fs.serverTimestamp() }); chosen = n; }
        catch (e) { if (e.code !== 'permission-denied') throw e; }
      }
    }
    setNick(chosen || randomNick());
  } else {
    setNick(myNick);
  }

  // 실시간 목록
  let limitN = PAGE;
  let unsub = null;
  const listen = () => {
    if (unsub) unsub();
    const q = fs.query(fs.collection(db, 'comments'), fs.orderBy('createdAt', 'desc'), fs.limit(limitN));
    unsub = fs.onSnapshot(q, (snap) => {
      const items = snap.docs.map((d) => {
        const v = d.data({ serverTimestamps: 'estimate' });
        return { nick: v.nick, text: v.text, at: v.createdAt ? v.createdAt.toDate() : null };
      });
      renderList(items);
      els.more.hidden = snap.size < limitN;
      els.count.textContent = snap.size ? (snap.size >= limitN ? limitN + '+' : snap.size) + '개' : '';
    }, () => {
      els.list.innerHTML = '<li class="comment-empty">댓글을 불러오지 못했어요.</li>';
    });
  };
  listen();
  els.more.addEventListener('click', () => { limitN += PAGE; listen(); });

  // 등록
  els.form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = els.input.value.trim();
    if (!text) { toast('내용을 입력해주세요'); els.input.focus(); return; }
    const last = +store('pharmquiz-last-comment') || 0;
    if (Date.now() - last < COOLDOWN_MS) { toast('잠시 후에 다시 등록할 수 있어요'); return; }
    els.submit.disabled = true;
    try {
      await fs.addDoc(fs.collection(db, 'comments'), { nick: myNick, text: text.slice(0, 300), createdAt: fs.serverTimestamp() });
      store('pharmquiz-last-comment', String(Date.now()));
      els.input.value = ''; els.char.textContent = '0 / 300';
      els.input.blur(); els.input.placeholder = welcome();
      toast('댓글이 등록됐어요 🙌');
    } catch (err) {
      toast('등록에 실패했어요. 잠시 후 다시 시도해주세요');
    } finally {
      els.submit.disabled = false;
    }
  });
}
