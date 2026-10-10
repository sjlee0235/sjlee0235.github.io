# 화면 단계(W2) 인계 문서

> 화면(UI)을 만들 때 반드시 지켜야 할 것. 엔진은 이미 이 규칙대로 데이터를 내보내므로,
> 화면은 **받은 것만 그대로 보여주고, 숨긴 것을 다시 계산하거나 추측해서 보여주지 않으면** 된다.
> 화면 구성 전체는 `docs/screens.md`, 그림 사양은 `docs/art_spec.md`. 구현은 `src/ui/` (단계 U).

---

## 1. 공개용 뷰만 쓴다 ★

- 화면 코드는 `src/engine/publicView.ts`의 **`PublicGame`만** 쓴다.
  - 새 게임: `PublicGame.create({ eras, seed, locale })` / 튜토리얼: `new TutorialSession().view`
  - 세이브: `savePublicGame(save, game)` / `restorePublicGame(save, eras)`
  - 탭 규칙: `src/engine/homeActivities.ts`(`TabController`, `topBarFor`) — `PublicGame`을 그대로 넘긴다
- **엔진 본체 `Game`, `ScheduledNews`, 시대 데이터(`Era`, `News`, `Theme`)를 화면에서 직접 import하지 않는다.** 뉴스의 영향 테마·방향·규모, 테마 분위기·비중, 스토리 결과 확률이 들어 있다.
- 플레이 기록(텔레메트리) 이벤트에는 분석용 내부 정보가 들어 있다. **기록 내용을 화면에 표시하지 않는다.**

## 2. 4탭 구조와 상단 요소

| 탭 | 상단 왼쪽 | 상단 오른쪽 | 비고 |
|---|---|---|---|
| 거실 | `NEWS!` (안 읽은 뉴스가 있을 때만 깜빡임) | 보유 현금 코인 (주황 코인 아이콘), 2배속이면 "x2" | |
| 주식창 | — | — | 상단은 계좌 바(총 자산·손익률·남은 시간·1배/2배 버튼) |
| 작업실 | `NEWS!` | 보유 현금 코인 + **정산 예정 작업 수입**, "x2" | |
| TV홈쇼핑 | `NEWS!` | 보유 현금 코인, "x2" | **1차 비활성**: "방송 준비 중"(`tabs.comingSoon`) |

- 값은 `TabController.topBar()`가 준다 (`cash`, `newsBadge`, `workPending`, `speedBadge`, `accountBar`). 화면이 직접 판단하지 않는다.
- 보유 현금은 **작업 중에 늘지 않는다** (작업 수입은 시대 종료 때 합산). 작업실만 정산 예정 수입을 따로 보여준다.
- `NEWS!`는 **뉴스에만**. 주가 리포트는 피드 안의 강조 표시만 쓴다.
- 주식창에 들어가면 `markAllRead()` → `NEWS!` 사라짐. 주식창에 있는 동안 화면 틱마다 `TabController.onTick()`.
- `NEWS!`를 누르면 주식창으로 이동 (`news_badge_click` 기록).
- 시대 시작 때 기본 탭은 주식창 (`onEraStart()`), 그 외에는 마지막으로 보던 탭.
- 화폐 이름은 **코인**. 아이콘은 주황색 코인 (비트코인 ₿ 기호·로고를 쓰지 않는다).

## 3. 뉴스 피드와 주가 리포트 행 (팝업 없음)

- 뉴스는 **팝업이 아니다.** 주식창의 뉴스 영역(피드)에 쌓인다: `getFeed()` = 최신순 `[{ news, report?, unread, reportUnread }]`.
- 최신 뉴스는 제목+본문을 펼쳐 보여주고, 이전 뉴스는 제목 한 줄로 접는다(누르면 리포트까지 펼침, `feed_expand` 기록).
- 발표 120초(게임 시간) 뒤 **그 뉴스 바로 아래에 '주가 리포트' 행**이 붙는다 (`report`). **시간을 멈추지 않는다.**
  - 종목당 1~2줄: `{종목} {합계 %} — {이유}` (`report.line`). 세부로 **발표 즉시 {instantPct} · 5초 뒤 {delayedPct} · 합계 {appliedPct}** (`report.split`)
  - 최대 3종목 + "외 N종목" (`report.more`). 잠정 뉴스는 `report.tentativeNote` 문구 (결과 방향을 암시하는 말 금지)
  - 결과 뉴스와 그 리포트는 `relatedTentativeId`(이어진 잠정 뉴스)를 담는다 → "관련 잠정 뉴스" 링크로 보여줘도 된다
  - 처음 한 번 `report.firstNotice`(게임 안 가상 수치, 투자 권유 아님)
- 새 뉴스와 새 리포트는 잠깐 강조 표시. **호재/악재 방향 표시는 하지 않는다.**
- 결과 뉴스만 "가상 시나리오" 태그(`news.fictional`).

## 4. 플레이 중 숨김

- **호재/악재 방향 표시 금지** (모든 뉴스). "관련 테마", 화살표, 초록/빨강, "수혜" 같은 말을 뉴스에 붙이지 않는다.
- **테마 분위기(긍정/부정/중립)와 비중(주요/배경) 표시 금지.**
- 시대가 끝나면 정산 창의 접힌 "돌아보기"에서 `getEraDebrief()`를 보여준다 (분위기·비중, 스토리 단서 방향과 실제 결과, 역사 여부, 뉴스별 영향 종목과 리포트 전체). i18n `debrief.*`는 이때만 쓴다.

## 5. 종목 목록·주문

- 기본 정렬: **즐겨찾기 먼저, 그 안팎은 이름 가나다순** (`getStockList()`가 이미 이 순서). id순·추가 순서 정렬은 만들지 않는다. 종목 id는 판마다 바뀌므로 저장해 두지 않는다.
- 등락률은 시대 시작가 대비 누적(`changePct`), 색은 `color`(설정의 상승 색상 모드 반영). 구입한 종목은 자동 즐겨찾기.
- 종목명은 "수식어 업종주"(예: 평화 방산주), 기업 설명은 1~2줄.
- 주문은 현재가로만, 확인 창 없이 한 번에 체결하고 짧은 안내(`order.filled`). '최대'는 `maxQty(side, id)`: 매수일 때 수수료 포함 최대 수량, 매도일 때 보유 수량 전부 (`max_button` 기록). 주문 전 금액·수수료·오류는 `previewOrder(side, id, qty)` (상태를 바꾸지 않음).

## 6. 시간·배속·저장

- 화면 타이머가 `tickIntervalMs(getSpeed())`마다 `advanceTick()`을 부른다 (1배 5,000ms, 2배 2,500ms). 게임 시간 단위는 그대로.
- **배속 선택**: 주식창 계좌 바에 '1배'와 '2배' 두 버튼을 나란히 (하나를 켜면 다른 하나가 꺼짐). **탭을 옮겨도 유지**(`SPEED_RESETS_ON_TAB_LEAVE=false`). 2배일 때 다른 탭 상단에 작은 "x2".
- 일시정지 사유는 `tutorial`과 `background`뿐. 앱이 백그라운드로 가면 `pause('background')` + 음악 `setBackground(true)`, 돌아오면 `resume('background')` + `setBackground(false)` (몰아서 따라잡지 않는다).
- 입력이 없을 때 자동 일시정지는 두지 않는다 (게임 시간은 흐르는 것이 기획. README 가정한 규칙 50).
- 시대 시작 안내: "처음 7분은 뉴스가 없어요" (`era.graceNotice`, 제안 문구).
- **저장 빈도**: `advanceTick()` 결과의 `saveNeeded`가 true이거나 `pendingSaveReasons`가 비어 있지 않으면 바로 `savePublicGame()`. 엔진이 알리는 때: 매매, 입금, 뉴스 발표, 백그라운드 전환, 30초 경과, 시대 종료.
- 불러오기 `status`: `resumed`(이어 하기) / `settled_on_version_change`(앱 업데이트로 저장 시점 가격에 정산 + 작업 수입 합산 → 정산 화면 → 다음 시대, 마지막이면 `finalSummary`) / `restarted_legacy`(아주 옛 세이브).

## 7. 작업실

- 터치마다 `workTouch(Date.now())` → `{ accepted, eyes, completed }`. 눈 하나 → 눈 둘 → 완성(+3, "정산 예정 작업 수입" 카운터로 날아감). 2터치까지는 보상 없음.
- 초당 6터치를 넘는 터치는 엔진이 무시한다(`accepted: false`). 화면 어디를 눌러도 인식.
- "작업 수입은 시대가 끝날 때 한꺼번에 지급돼요" (`work.payoutNote`). 진행 중인 인형 상태는 탭을 옮겨도·저장해도 유지된다.

## 8. 거실

- **첫 터치 전에는 소리를 낼 수 없다** (휴대폰 브라우저 규칙). 첫 터치에서 `MusicPlayer.unlock()`. 그 전에는 `music.tapToStart` 안내.
- LP 터치: `cycleGenre()` + LP 회전 + 장르 이름 토스트(`music.genre.*`). 끄기 없음 (음소거·볼륨은 설정).
- 강아지 터치: `petDog(state, stage, rng)` — rng는 `createPresentationRng(seed, 'dog')`(시장 난수와 분리). 3번째 터치마다 `reaction`.
- 음악 실제 재생은 `AudioBackend`를 구현해 붙인다 (곡이 끝나면 `onTrackEnded()`, 프레임마다 `update(dt)`).

## 9. 정산 창

- **투자 결과(코인·수익률) + 작업 수입 = 합계**를 각각 보여준다 (`investmentResult`, `workIncome`, `finalTotal`, 문구 `settlement.*`).
- '확인' → 다음 시대 (`startNextEra()`), 마지막 시대면 최종 요약(`getFinalSummary()`, 문구 `final.*`).

## 10. 플레이 기록 동의 화면

- 플레이 기록은 **기본 꺼짐**. 첫 실행 때 동의 화면(`telemetry.consentTitle/Body/agree/decline`) → 동의하면 `setConsent(true)` + 세이브 `setTelemetryConsent(save, true)`. 설정에서 언제든 끌 수 있게.
- 만 14세 이상 대상이어도 **개인정보처리방침과 동의 화면이 필요**하다 (`docs/telemetry.md` 6장).
- 개인 식별 정보·기기 고유 ID(광고 ID, IMEI 등)를 기록에 넣지 않는다.

## 11. 설정

- 언어(한/영), 상승 색상 모드(기본: 한국어 빨강 상승·파랑 하락, 영어 초록 상승·빨강 하락), 마스터·음악·효과음 볼륨, 음소거, 음악 저작권 표시(`getCredits()`), 기록 동의.
- 설정은 게임 세이브와 별개로 저장한다 (`src/settings/settings.ts`).
