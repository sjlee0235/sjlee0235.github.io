# 2027 국가고시 대비 퀴-즈

약사 국가고시 약물치료학(O,X · 5지선다), 합성학(이름 맞추기 · 구조 맞추기), 생약학(O,X 퀴즈 · 빈칸 넣기) 퀴즈입니다. 빌드 과정 없는 정적 페이지라 GitHub Pages에서 바로 열립니다.

- 주소: https://sjlee0235.github.io/pharm-quiz/
- 비영리 학습용 서비스이며, 문항은 실제 시험과 다를 수 있습니다.

## 입장 코드와 문제 암호화

- 처음 화면(조회수, 예비약사 라운지 댓글, 안내문)은 누구나 볼 수 있습니다. '시작'을 누르면 입장 코드를 입력해야 문제로 들어갈 수 있습니다.
- 코드는 띄어쓰기·대소문자를 구분하지 않고, 한 번 맞히면 그 기기에서는 다시 묻지 않습니다.
- 문제·해설은 `data/vault.json`에 **암호화**되어 있어 저장소에서 파일을 열어도 내용을 볼 수 없습니다. (PBKDF2-SHA256 25만 회 → AES-256-GCM)
- 입장 코드는 저장소 어디에도 적지 않습니다. 코드를 아는 사람만 문제를 풀어볼 수 있습니다.

## 구성

| 파일 | 역할 |
| --- | --- |
| `index.html` | 화면 구조 (처음 화면 → 시작 → 입장 코드 → 파트 선택 → 유형 선택 → 퀴즈 → 결과) |
| `style.css` | 디자인 (라이트/다크 모드 자동) |
| `gate.js` | 입장 코드 확인, 문제 복호화, 조회수 |
| `app.js` | 문제 추출·채점·저장 로직 |
| `comments.js`, `comments-config.js`, `firestore.rules` | 예비약사 라운지(댓글) |
| `data/parts.js` | 파트 목록과 랜덤 모의고사 파트별 문항 수 (2026 국시 77문항 분포) |
| `data/vault.json` | 암호화된 약물치료학 문제 (파트별 O,X 60 / 5지선다 30) |
| `data/vault-syn.json` | 암호화된 합성학 데이터 (약물 127개, 구조식 SVG + 이야기 제목, gzip) |
| `data/vault-herb.json` | 암호화된 생약학 데이터 (5개 파트, 파트별 O,X 100 / 빈칸 넣기 100 + 생약명 고르기, gzip) |
| `tools/vault.mjs` | 문제 암호화·복호화 도구 |

## 출제 규칙

- 합성학: 127개 약물 중 30문제 랜덤, 보기는 구조(구조 맞추기) 또는 이름·구조(이름 맞추기)가 비슷한 약물에서 선택. 해설에 장·약효군과 이야기 제목 표시
- 생약학: 근류 / 근경류·종자류 / 과실류·전초류 / 엽류·피류·화류 / 목류·수지류·엑스류·유액류·은화식물류·동물류(유지류 포함) 5개 파트. 선택한 파트마다 30문제 랜덤
  - 빈칸 넣기: 빈칸 3개(㉠㉡㉢)에 순서대로 들어갈 말 고르기 + 설명을 보고 생약명(빈칸 1개) 고르기(생약당 1문제)
- **다시 풀기 규칙(모든 과목)**: 문제 묶음(과목·파트·유형)마다 최근에 푼 문제와 틀린 문제를 기억해, 다음에는 ① 방금 틀린 문제 → ② 아직 안 푼 문제 → ③ 푼 지 오래된 문제 순으로 뽑습니다. 기록은 브라우저(localStorage `pharmquiz-hist`)에 저장되고, 끝까지 푼 회차만 반영됩니다.

- O,X: 선택한 파트마다 20문제 랜덤 / 5지선다: 파트마다 10문제 랜덤 → 전체 순서 섞기
- 랜덤 모의고사: 파트 목록 순서대로, `parts.js`의 `mock` 수만큼 5지선다에서 랜덤 선정 (약 77문제). 14개 파트 문제가 모두 들어가면 자동으로 열림
- 설정(파트·유형)과 최근 점수는 브라우저(localStorage)에 저장되어 처음 화면으로 돌아가도 유지

## 문제 수정 · 새 파트 추가하기 (Node 18 이상)

```bash
VAULT_CODE='입장코드' node tools/vault.mjs decrypt   # data/vault.json → src-data/<파트>.js (평문, 커밋 안 됨)
# src-data/ 파일을 고치거나 src-data/<id>.js 새로 추가 (id는 parts.js 값과 동일)
VAULT_CODE='입장코드' node tools/vault.mjs encrypt   # src-data/*.js → data/vault.json
```

- O,X: `{ q, a: true/false, exp, tag }` / 5지선다: `{ q, box(선택), c: [보기 5개], a: 정답 index(0~4), exp, tag }`
- `tag`: `'red'` = 2026 개정 내용, `'hl'` = 중요 표시
- 생약학: `src-data/herb.json` = `{ parts: [{id,name,emoji,herbs}], data: { <id>: { ox: [{q,a,exp,detail}], blank: [{q,box,c,a,exp,detail}] } } }` (빈칸 보기는 `"값1 / 값2 / 값3"`)
- 새 파트가 들어가면 해당 파트 버튼이 자동으로 활성화됩니다.
- **코드 변경**: 기존 코드로 `decrypt` → 새 코드로 `encrypt` → 커밋. 모든 사용자에게 새 코드를 다시 묻습니다.

## 댓글(예비약사 라운지) 켜기 — Firebase 무료 플랜

GitHub Pages는 정적 호스팅이라 댓글은 Firebase Firestore에 저장합니다. `comments-config.js`가 비어 있으면 댓글창은 "준비 중"으로 표시됩니다.

1. https://console.firebase.google.com → 프로젝트 추가 (애널리틱스는 꺼도 됨)
2. 빌드 → Firestore Database → 데이터베이스 만들기 → **프로덕션 모드**, 위치 `asia-northeast3 (서울)`
3. Firestore → 규칙 탭에 `firestore.rules` 내용을 그대로 붙여넣고 게시
4. 프로젝트 설정(⚙️) → 내 앱 → 웹(</>) 앱 추가 → 표시되는 `firebaseConfig`의 `apiKey`, `authDomain`, `projectId`, `appId`를 `comments-config.js`에 붙여넣기
5. 커밋하면 끝. 부적절한 댓글은 Firestore 콘솔의 `comments` 컬렉션에서 직접 삭제

- 닉네임: 브라우저마다 '~한 예비약사' 하나를 부여해 저장하고, `nicknames` 컬렉션으로 다른 사람과 겹치지 않게 합니다. 형용사 목록은 `comments.js`의 `ADJ`에서 고칠 수 있습니다.
- 도배 방지: 같은 브라우저에서 20초에 1개, 댓글은 300자까지.

## 배포 후 반영이 안 될 때 (캐시)

수정 후 휴대폰에서 예전 화면이 보이면 `index.html`과 `gate.js`(VAULT_URL·SYN_URL·HERB_URL)의 `?v=숫자`를 모두 1씩 올려서 커밋하세요. 브라우저가 새 파일을 받아옵니다.
