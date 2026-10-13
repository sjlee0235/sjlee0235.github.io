# 역전의 방 — 작업 인수인계 (새 대화는 이 파일부터 읽는다)

모바일 2D 도트 투자 게임 **"역전의 방"**. 저장소 `sjlee0235/sjlee0235.github.io`의 `invest-rpg/` 폴더만 다룬다 (사이트 첫 페이지 등 바깥 파일은 건드리지 않는다).
사용자는 약대생이다. **설명은 쉬운 한국어로**, 전문용어는 풀어서 쓴다.

## 1. 지켜야 할 규칙 (사용자 지시)
- 결제·광고 SDK, 서버/DB, 걷는 맵·캐릭터는 만들지 않는다.
- 음악 파일을 **만들지(생성하지) 않는다.** 9차에서 "저작권 문제없는 곡을 찾아 넣어 달라"는 요청이 있었으므로 **찾아서 받는 것은 허용** (라이선스·출처 기록 필수, `docs/audio_sourcing.md`).
- 기획에 없는 규칙을 임의로 추가하거나 기본값을 바꾸지 않는다. 정하지 않은 세부는 합리적인 기본값으로 하고 **README "5. 가정한 규칙"에 번호를 이어 기록**한다 (지금 112번까지, 다음은 113번, 차수별 소제목 "### 11차 (날짜, …)").
- **테스트가 통과하지 않은 채로 "완료"라고 하지 않는다.**
- 게임 데이터에 실존 기업·상표·인물 이름 금지 (팩트체크 문서에만 실명). 대규모 인명 피해 참사, 국내 정치(탄핵·계엄 등)는 시장 뉴스로 쓰지 않는다.
- 플레이 기록(텔레메트리)은 기본 꺼짐, 개인 식별 정보 없음.
- 코드로 그린 임시 그림은 채택하지 않는다(그림은 기획자 디자인). UI(HTML/CSS) 요소는 괜찮다.
- 커밋·PR에 모델 이름을 넣지 않는다. 커밋 끝에는 세션이 알려주는 Co-Authored-By/세션 줄을 붙인다.
- **수정할 때마다 웹 버전(아티팩트)에 바로 반영**한다 (아래 4장).

## 2. 기술·명령 (작업 폴더: `invest-rpg/`)
- TypeScript 7, Vite 8(`base './'`, publicDir `assets`), Vitest 5, Node 22(.ts 직접 실행), Playwright(크로미움 `/opt/pw-browsers`), 화면은 바닐라 TS (프레임워크 없음).
- `npm run check` (타입 검사 + 테스트 340개) · `npm run e2e` (브라우저 흐름 점검 114개) · `npm run shots` (스크린샷 → `shots/`, git 제외)
- `npm run lint:content` (시대 데이터 점검) · `node scripts/checkEra.ts src/data/eras/2010s.json 200` (시대 파일 하나: 구조·가이드·전략별 밸런스) · `node scripts/newsCount.ts` (시대당 뉴스 수) · `npm run sim:carry` (3시대 이월)
- `node scripts/peek.ts "&era=1" "tod:day;tab:trading;shot:a"` (화면 몇 장 빨리 → `shots/peek_a.png`)
- `npm run build:play` → `play/` (GitHub Pages용 웹 시험판, 디버그 패널 포함: 주소에 `?debug=1` 또는 `#debug`, `&seed=7&fresh=1&nointro=1&era=1`)

## 3. 구조 (자주 고치는 곳)
- 엔진(결정적, 시드): `src/engine/` — `config.ts`(모든 수치 규칙), `game.ts`, `newsEngine.ts`, `publicView.ts`(화면용 공개 뷰), `save.ts`(리플레이+스냅샷)
- 데이터: `src/data/eras/{2000s,2010s,2020s}.json` (시대마다 테마·종목 36, 속보 46~50, 스토리 19~21), `eras/index.ts`(등록), `tutorial.json`, `audio/music.json`·`lpCycle.json`, 점검 `lint.ts`·`validate.ts`
- 화면: `src/ui/app.ts`(흐름·HUD·오버레이), `screens/{trading,livingRoom,workshop,tvShopping}.ts`, `overlays.ts`(튜토리얼·정산·최종/엔딩·설정·확인창·시대 카드), `viewModels.ts`(화면 계산, 테스트 대상), `style.css`(밤/낮 + 시대별 색 토큰), `title.ts`(도트 제목·숫자), `debug.ts`
- 문서: `README.md`(실행·가정한 규칙·밸런스 표), `docs/GAME_DESIGN.md`(전체 기획, 20장 결정 기록), `docs/20x0s_fact_check.md`, `docs/audio_sourcing.md`, `docs/DESIGN_HANDOFF.md`
- 그림: `assets/art/scene/{living|workshop|tv}_{era}_{night|day}_lv{0..7}.png` (130×281 도트, 3배 확대), `assets/art/dog/`

## 4. 웹 버전 반영 (매번)
1. `npm run check` · `npm run e2e` 통과 → `npm run build:play`
2. 아티팩트 **https://claude.ai/artifact/Xf4UPG8WthJAboRJehZNat** 갱신: 새 대화에서는 먼저 Artifact `read`(url)로 읽고, 그 페이지 내용(html/head 없이 title·meta·폰트 link·css link·`<div id="app">`·module script)을 `play/index.html`의 새 파일명으로 바꿔 publish. 그림 등 다른 파일은 이미 올라가 있으므로 `files`에는 **바뀐 `assets/index-*.js`, `assets/index-*.css`, `assets/debug-*.js`만 추가하고 옛 이름은 `null`**. (`root`는 작업 폴더 기준: 저장소 최상위면 `invest-rpg/play`, `invest-rpg/` 안이면 `play`. 페이지 파일은 scratchpad에 써도 된다.)
3. 커밋·푸시 (지정된 브랜치). GitHub Pages(https://sjlee0235.github.io/invest-rpg/play/)는 **main에 합쳐야** 반영된다 — 합치기는 사용자가 원할 때만.

## 5. 지금 상태 (2026-10-11, 10차까지)
- PR #2·#3(9차)·10차 모두 main에 합침 → GitHub Pages(https://sjlee0235.github.io/invest-rpg/play/)에 반영. 다음 작업도 지정 브랜치에 푸시하고, main 합치기는 사용자가 원할 때.
- 아티팩트 = 10차 최신 빌드.
- 게임 흐름: 첫 화면(이어하기/새로하기) → 튜토리얼 5장(김역전 이야기 → 게임 방법 → 방 꾸미기 → 목표와 엔딩 → 플레이 기록 동의) → 시대 시작 카드 → 3시대(2000→2010→2020년대, 시대당 게임 시간 2시간) → 정산 → 최종 요약 + 엔딩.
- 주요 규칙(값은 `config.ts`): 시작 10,000코인, 첫 3분 뉴스 없음 → 첫 뉴스는 opener 잠정 뉴스, **1틱 3초**(10차, 시대 2,400틱), **뉴스 간격 3~4분**(시대당 약 34개), 반영: 호재 즉시 75% → 3초 뒤 25% / **악재 즉시 25% → 3초 뒤 60% → 6초 뒤 15%**(10차, 손절용 절충안), 120초 뒤 주가 리포트(영향 종목 모두), 단서 쪽 결과 65%.
- 주식창: [매수]/[매도]를 먼저 고르고 수량·최대(방향 기준) → [매수하기/매도하기]. 내 계좌(현금·보유·평가금액·평단가·손익률, [일괄매도] 확인창). 계좌 바 "2000년대 남은 시간", 배속 버튼 옆 "진행 속도". 패널 사이 틈 없음. 보유 종목 차트에 평단가(가로 점선)·산 시점(세로 점선).
- 거실: **인생 업그레이드**(=인테리어) 0~7단계, 현금 2,000코인씩, 시대 이월. LP(재즈→클래식→힙합→락), 강아지 반응. (시대 달력은 10차에 삭제)
- 작업실: 인형 눈 붙이기, 3터치 = 인형 1개 = 3코인, 100개마다 바로 지급.
- **엔딩**: 마지막 단계 0~2 새드 / 3~6 중립 / 7 해피.
- 시대 디자인: 색 테마(2000s 금색 / 2010s 민트 / 2020s 네온 핑크), 시대 시작 카드.
- 설정: 언어, 색상, 볼륨, 음소거, 기록 동의, 튜토리얼 다시 보기, 음악 저작권 표시, **저장하고 나가기**.
- 밸런스(시드 200, 10차): 초고속 추종 +93~100%로 **상한(+80%) 넘음**, 2000년대 지연 추종 +17.5%(상한 +15%). 손절 이득 때문 — 사용자에게 알림, 맞출지 결정 대기(README 6장). 나머지 전략은 목표 안. 속보 비율 약 50%.

## 6. 남은 일·결정 대기
- **10차 밸런스**: 초고속 추종이 +80%를 넘음. 사용자가 원하면 악재 즉시 몫을 조금 올려(예: 35/50/15) 다시 측정.
- **배경음악 곡 파일**: 작업 환경 네트워크 정책이 음원 사이트를 막음(incompetech.com, upload.wikimedia.org, commons.wikimedia.org, musopen.org 등). 사용자가 허용 목록에 넣거나 mp3를 올려 주면 장르별 1곡씩 넣는다 (재즈·힙합·락은 Kevin MacLeod CC BY 4.0 후보, 클래식은 퍼블릭 도메인 녹음). `music.json`의 placeholder 항목 교체 + 증빙 + `npm run lint:audio -- --release`. 재생 흐름(LP 누르면 즉시 전환, 1곡이면 반복)은 완성.
- 작업실 작업 종류를 시대별로 바꾸기: 그림이 필요해 보류.
- `docs/GAME_DESIGN.md` 21장 "결정이 필요한 것" (예: D2 테마별 호재/악재 비율 기준).
- 팩트체크 문서의 "중간·확인 필요" 항목 (특히 2020년대 최근 사건).
