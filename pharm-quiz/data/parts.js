/* 파트 목록 (표시 순서 = 랜덤 모의고사 출제 순서)
 * id      : data/<id>.js 의 window.QUIZ_DATA[id] 와 연결
 * mock    : 랜덤 모의고사에서 이 파트가 차지하는 5지선다 문항 수
 *           (2026년도 제77회 약사국가시험 3교시 임상·실무약학1 77문항 분포 기준)
 * 새 파트를 추가할 때는 data/<id>.js 파일을 만들고 index.html 에 <script> 한 줄만 추가하면 된다.
 */
window.PARTS = [
  { id: 'cardio',      name: '심혈관',       emoji: '❤️', mock: 15 },
  { id: 'respiratory', name: '호흡기',       emoji: '🫁', mock: 5 },
  { id: 'gastro',      name: '소화기',       emoji: '🍽️', mock: 7 },
  { id: 'renal',       name: '신장',         emoji: '🫘', mock: 6 },
  { id: 'endocrine',   name: '내분비',       emoji: '🧪', mock: 7 },
  { id: 'infection',   name: '감염',         emoji: '🦠', mock: 11 },
  { id: 'neuro',       name: '신경',         emoji: '🧠', mock: 5 },
  { id: 'psych',       name: '정신',         emoji: '💭', mock: 4 },
  { id: 'musculo',     name: '근골격',       emoji: '🦴', mock: 3 },
  { id: 'obgyn',       name: '산부인과',     emoji: '🤰', mock: 2 },
  { id: 'urology',     name: '비뇨생식기',   emoji: '💧', mock: 1 },
  { id: 'onco',        name: '혈액 및 종양', emoji: '🩸', mock: 8 },
  { id: 'derm_eye',    name: '피부/안과',    emoji: '👁️', mock: 2 },
  { id: 'nutrition',   name: '임상영양',     emoji: '🥗', mock: 1 }
];
