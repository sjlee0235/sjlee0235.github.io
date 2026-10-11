# 2010년대 뉴스 팩트체크 표 (초안)

- 대상: `src/data/eras/2010s.json` — 속보 47개, 스토리 20개(잠정 1 + 결과 2씩 = 60개), 모두 107개 (1~4장: 8차 초안 속보 24·스토리 13, 5~7장: 9차 추가 속보 23·스토리 7)
- 이 문서는 **앱에 포함되지 않는다**. 검증 편의를 위해 실명(기업·인물·지수·기관)을 그대로 적었다. 게임 데이터(JSON)에는 실명이 없다.
- 확신도
  - **높음**: 날짜와 핵심 수치를 웹 출처로 확인함
  - **중간**: 사건과 시기는 확인했지만 세부 수치(국내 주가 등락 폭 등) 일부를 확인하지 못함
  - **확인 필요**: 출처를 찾지 못했거나 출처끼리 수치가 다름
- 영향도는 **사건 규모에 따른 판단값**이다 (공식: 직접 = 규모, 밀접 = 규모×0.6, 간접 = 규모×0.3 반올림). 실제 등락률을 옮긴 값이 아니다.
- 가상 결과(실제와 다른 결과)는 **사실이 아님**을 표시했다. 게임 화면에서는 "가상 시나리오" 태그가 붙는다.
- 본문에는 연도·월을 쓰지 않았다 (뉴스는 시대 안에서 무작위 순서로 나온다). 실제 날짜는 데이터의 `realDate`에만 있다.
- 피한 소재: 대규모 인명 피해가 난 국내 참사(세월호 등)와 국내 정당 정치(탄핵 등)는 시장 뉴스로 쓰지 않았다. 섬 포격 속보는 사상자를 언급하지 않았다.
- 검색일: 2026-10-11.

## 1. 속보 24개

| 뉴스 ID | 사실 주장(사건) | 실제 날짜 | 근거 수치 | 출처 | 확신도 |
|---|---|---|---|---|---|
| b01-euro-debt | 그리스 신용등급 투기 등급 강등, 유럽 구제금융, 세계 증시 급락 | 2010-04-27 (S&P BB+) ~ 05-02 (1,100억 유로 구제금융) | 강등 당일 유럽·미국 증시 급락, 유로화 1.32달러 아래. 국내 외국인 순매도 규모는 미확인 | [CFR](https://www.cfr.org/interview/new-urgency-prevent-greek-default), [CS Monitor](https://m.csmonitor.com/From-the-news-wires/2010/0614/Moody-s-rates-Greece-s-credit-status-as-junk) | 높음 |
| b02-island-shelling | 연평도 포격 도발, 군 대응 사격, 방산주 급등 | 2010-11-23 | 당일 코스피 -0.79%(1,928.94), 다음 날 방산주 상한가(스페코 등). 포탄 수는 약 170발 중 80여 발이 섬에 떨어진 것으로 알려짐(본문은 "수십 발") — 포탄 수는 이번 검색으로 직접 확인하지 못함 | [이투데이](https://www.etoday.co.kr/news/view/380163), [뉴스토마토](https://newstomato.com/ReadNews.aspx?no=123897) | 중간 |
| b03-japan-quake | 동일본 대지진·후쿠시마 원전 사고, 일본 공장 가동 중단, 국내 철강·화학·정유 반사이익 | 2011-03-11 | 03-14 철강금속 업종 +7.05%. 반도체는 단기 가격 상승·장기 소재 차질 우려가 엇갈림. 자동차·카메라 반사이익(간접)은 판단값 | [뉴스토마토](https://newstomato.com/ReadNews.aspx?no=145473), [머니투데이](https://www.mt.co.kr/industry/2011/04/10/2011040923381529637) | 중간 |
| b04-us-downgrade | S&P 미국 신용등급 AAA → AA+ 강등 | 2011-08-05 (금요일 장 마감 후) | 08-08 코스피 -3.8%, S&P500 -6.7%, 08-09 코스피 장중 약 -7%. 하락 원인에는 유럽 위기도 겹침 | [VOA](https://blogs.voanews.com/breaking-news/2011/08/08/global-markets-plunge), [미 의회 JEC](https://www.jec.senate.gov/public/index.cfm/republicans/2011/8/turmoil-in-financial-markets) | 높음 |
| b05-smartphone-20m | 국내 스마트폰 가입자 2천만 명 돌파 | 2011-10-28 (방통위 10-30 발표) | 국민 10명 중 4명, 1천만 돌파는 2011-03. 콤팩트 카메라 국내 판매 급감 수치는 미확인 | [서울신문](https://m.seoul.co.kr/news/2011/10/30/20111030800026), [전북일보](https://www.jjan.kr/articleAmp/20120112423750) | 높음 (카메라 부분 중간) |
| b06-fta-effect | 한미 FTA 발효 | 2012-03-15 | 미국산 수입품 9,061개(80.5%) 관세 즉시 철폐, 승용차 관세 8% → 4% 후 2016년 철폐, 섬유 일부 품목 즉시 철폐(4.3~19.7%). 화장품 관세 철폐(간접)는 판단값 | [산업일보](https://kidd.co.kr/news/146766), [KoreaScience](https://koreascience.or.kr/article/JAKO201918052922308.pdf) | 중간 |
| b07-mart-closure | 대형마트 월 2회 의무휴업·영업시간 제한 | 2012-04 (지자체별 조례로 시행) | 유통산업발전법 개정, 일요일·공휴일 중 월 2회, 자정 이후 영업 제한. 전국 첫 시행일(04-22 등)은 지자체마다 달라 미확인 | [서울시 미디어허브](https://mediahub.seoul.go.kr/archives/157938), [서울신문](https://m.go.seoul.co.kr/news/2012/03/21/20120321015005) | 중간 |
| b08-idol-chart | BTS 'Love Yourself: 轉 Tear' 빌보드 200 1위 (K-팝 최초) | 2018-05-27 발표 (06-02자 차트) | 13만 5천 앨범 환산 단위. 화장품·식품·여행(간접)은 판단값 | [Rolling Stone](https://www.rollingstone.com/music/news/on-the-charts-bts-become-first-k-pop-act-to-reach-number-one-w520821), [Bloomberg](https://www.bloomberg.com/news/articles/2018-05-28/bts-first-k-pop-band-to-top-billboard-album-charts) | 높음 |
| b09-messenger-game | 카카오톡 게임하기 출시, 애니팡 1천만 다운로드 | 2012-07-30 출시 ~ 09 | 입점 39일 만에 1천만 다운로드(카카오), "한 달 만" 보도도 있어 본문은 "40일도 안 돼"로 씀. 23일 만에 구글플레이 매출 1위 | [카카오 보도자료](https://www.kakaocorp.com/page/detail/7970), [머니투데이](https://www.mt.co.kr/stock/2012/09/20/2012092015102204340) | 높음 |
| b10-plant-loss | GS건설 1분기 어닝쇼크 (중동 플랜트 손실) | 2013-04-10 | 영업손실 5,354억~5,355억 원, UAE 루와이스 정유 등 원가 악화, 04-11 주가 하한가 | [뉴스핌](https://newspim.com/news/view/20130410000877), [세계일보](https://www.segye.com/newsView/20130429003623) | 높음 |
| b11-taper | 버냉키 의장 양적완화 축소 시사 (테이퍼 탠트럼) | 2013-06-19 발언 ~ 06-25 | 06-24 코스피 1,799.01(1,800 붕괴), 06-25 1,770선 연저점, 외국인 이틀 1.2조 원 순매도 | [뉴스토마토](https://newstomato.com/ReadNews.aspx?no=375683), [머니투데이](https://www.mt.co.kr/world/2013/06/21/2013062104064308313) | 높음 |
| b12-easy-pay | 카카오페이 출시 | 2014-09-05 | 카드 등록 후 비밀번호만으로 결제, 1개월 만에 가입자 120만 명 (본문은 "100만 명을 넘었다") | [카카오 보도자료](https://www.kakaocorp.com/page/detail/7577), [머니투데이](https://www.mt.co.kr/tech/2014/09/05/2014090513221429699) | 높음 |
| b13-shipyard-loss | 대우조선해양 2분기 3조 원대 영업손실 (해양플랜트) | 2015-07 (손실 보도) ~ 08 (실적 발표) | 2분기 3조 원대 손실 한꺼번에 반영, 채권단 지원 검토. 확정 금액(3조 399억 원으로 알려짐)은 공시로 확인 권장 | [이투데이](https://www.etoday.co.kr/news/view/1163328), [비즈워치](https://news.bizwatch.co.kr/article/industry/2015/08/12/0021) | 중간 |
| b14-china-shock | 위안화 기준환율 기습 절하, 중국 증시 '블랙 먼데이' | 2015-08-11 (절하) ~ 08-24 (폭락) | 기준환율 1.9% 절하(1994년 이후 최대), 3일간 약 4.7%. 상하이 지수 08-24 -8.49%(3,209.91), 06-12 고점 5,178 대비 약 -38%. 국내 증시 낙폭은 미확인 | [Business Standard](https://www.business-standard.com/amp/article/pti-stories/china-devalues-yuan-by-2-pc-biggest-one-day-fall-since-1994-115081101466_1.html), [Fortune](https://fortune.com/2015/08/24/chinas-black-monday-as-stock-market-slides-8-5) | 높음 |
| b15-chinese-tourists | 방한 중국인 관광객 사상 최대 | 2016 (연간) | 약 806만~807만 명 (방한 외국인 1,724만 명) | [경향신문](https://www.khan.co.kr/article/201703031456011) | 높음 |
| b16-nuclear-phaseout | 고리 1호기 영구정지 행사, 탈원전·신규 원전 백지화 선언 | 2017-06-19 | 수명 연장 불허, 신규 원전 계획 백지화, 전기요금 인상 우려 제기. 신재생 목표치(2030년 20%)는 이번 검색으로 미확인(본문에 수치 없음) | [머니투데이](https://www.mt.co.kr/politics/2017/06/19/2017061914237610284), [이투데이](https://www.etoday.co.kr/news/view/1503094) | 높음 |
| b17-chip-record | 반도체 수출 단일 품목 최초 연 900억 달러 돌파 | 2017 (연간) | 979억 4천만 달러(+57.4%). 다른 집계 996억 8천만 달러 | [산업일보](https://kidd.co.kr/news/199222) | 높음 |
| b18-ev-preorders | 테슬라 모델 3 사전 예약 1주일 32만 5천 대 | 2016-03-31 공개 ~ 04-07 | 24시간 11만 5천 대, 1주일 32만 5천 대(이후 37만 3천 대로 정정) | [CNN Money](https://money.cnn.com/2016/04/07/autos/tesla-model-3-orders/), [Bloomberg](https://www.bloomberg.com/news/articles/2016-04-07/tesla-says-model-3-pre-orders-surge-to-325-000-in-first-week) | 높음 |
| b19-steel-tariff | 미국 무역확장법 232조 철강 25% 관세, 한국은 쿼터로 면제 / 앞서 태양광 세이프가드 | 철강 2018-03-08 서명(03-23 시행), 한국 쿼터 합의 03~04월 / 태양광 2018-01-22 | 2015~2017년 평균 수출량의 70%(약 268만 톤) 무관세 쿼터. 태양광 셀·모듈 1년 차 30% 관세 | [International Trade Insights](https://www.internationaltradeinsights.com/2018/04/united-states-exempts-south-korea-from-section-232-steel-tariffs-in-exchange-for-a-quota/), [Asia Times](https://asiatimes.com/2018/05/south-korean-steel-exporters-win-us-relief/), [USTR](https://ustr.gov/about-us/policy-offices/press-office/press-releases/2018/january/president-trump-approves-relief-us) | 중간 (03-08 서명일은 원문 포고문으로 확인 권장) |
| b20-5g-launch | 세계 최초 5G 스마트폰 상용화 | 2019-04-03 밤 11시 | 미국 버라이즌보다 약 2시간 앞섬. 11월 말 가입자 약 433만 명, 품질 불만 | [산업일보](https://kidd.co.kr/news/212831), [이투데이](https://www.etoday.co.kr/news/view/1878860) | 높음 |
| b21-record-low-rate | 한국은행 기준금리 1.25%로 인하 (당시 사상 최저) | 2016-06-09 | 1.50% → 1.25%, 시장은 동결 예상(깜짝 인하), 2017-11까지 유지 | [머니투데이](https://www.mt.co.kr/finance/2016/06/09/2016060910570748487), [뉴스토마토](https://newstomato.com/ReadNews.aspx?no=926685) | 높음 |
| b22-polysilicon | 폴리실리콘 가격 폭락 (공급 과잉) | 2011-03 ~ 12 | 현물 kg당 약 80달러 → 30달러 미만(-60% 이상), 연말 약 25달러. 국내 업체 감산 여부 세부는 미확인 | [Greentech Media](https://greentechmedia.com/amp/article/polysilicon-prices-hit-record-lows-in-2011-will-head-even-lower-enabling-0), [Bernreuter Research](https://www.bernreuter.com/files/data/newsroom/pdf-articles/market-surveys/2012-05-Sun-Wind-Energy-10th-solar-silicon-conference.pdf) | 높음 |
| b23-mobile-shopping | 모바일 쇼핑 거래액이 온라인 쇼핑의 절반을 넘음 | 2015-11 (50.0%) ~ 2016-01 (51.2%) | 통계청 거래액 기준. 2015년 연간은 45.3%. "PC 추월"은 서울시 이용자 조사 기준이라 쓰지 않음 | [경북매일](https://kbmaeil.com/article/201603040155176), [서울시 경제](https://news.seoul.go.kr/economy/?p=63737) | 높음 |
| b24-crypto-boom | 비트코인 1년 새 약 20배, 김치 프리미엄 | 2017-01 ~ 12-17 고점 | 연초 약 1,000달러 → 12-17 약 1만 9,700~2만 달러. 김치 프리미엄 2017년 최대 30% 안팎(2018년 초 40% 이상) — 본문은 "20% 넘게" | [CoinDesk](https://www.coindesk.com/markets/2017/12/29/from-900-to-20000-bitcoins-historic-2017-price-run-revisited), [블록미디어](https://www.blockmedia.co.kr/archives/174195) | 중간 |

## 2. 스토리 13개

| 스토리 | 뉴스 | 사실 주장 | 실제 날짜 | 근거 | 출처 | 확신도 |
|---|---|---|---|---|---|---|
| s01 메르스 (opener) | 잠정 | 중동 다녀온 남성 첫 확진, 확진 전 여러 의료기관 방문 | 2015-05-20 (WHO 통보) | 1번 환자 05-12~14 의원 외래, 05-15~17 평택성모병원 입원 후 서울 대형병원에서 확진 | [WHO](https://www.who.int/westernpacific/emergencies/2015-mers-outbreak), [뉴시스](https://www.newsis.com/view/NISX20180908_0000413182) | 높음 |
| | 결과(실제) | 병원 통해 확산, 학교 휴업, 외국인 관광객 급감 | 2015-05 ~ 07 | 최종 확진 186명·사망 38명(본문은 "100명을 넘었다"), 6월 2주차 외국인 관광객 -41.1%, 7~8월 중국인 패키지 예약 -83.7%, 2015년 방한객 12년 만에 감소. 휴업 학교 수는 이번 검색으로 미확인(본문은 "잇따라 휴업") | [WHO](https://www.who.int/westernpacific/emergencies/2015-mers-outbreak), [이투데이](https://www.etoday.co.kr/news/view/1167684), [아시아경제](https://view.asiae.co.kr/article/2016011909045354223) | 높음 |
| | 결과(**가상**) | 접촉자 모두 음성, 확산 없이 진정 | — | **사실 아님** | — | 가상 |
| s02 브렉시트 (opener) | 잠정 | 투표 직전 여론조사 탈퇴 우세 | 2016-06-13 ~ 06-22 | ICM 전화 50:45·온라인 49:44(탈퇴 우세), YouGov 46:39. 막판엔 접전·잔류 우세 조사도 있었고 시장은 잔류를 더 점침 | [Bloomberg](https://www.bloomberg.com/news/articles/2016-06-13/brexit-polls-by-icm-show-leave-widening-lead-over-remain), [Left Foot Forward](https://leftfootforward.org/2016/06/brexit-takes-seven-point-lead-in-latest-yougov-poll/) | 높음 |
| | 결과(실제) | 탈퇴 52% 대 48%, 파운드화 급락, 세계 증시 급락, 엔·금 상승 | 2016-06-24 | 탈퇴 51.9%, 파운드화 장중 10% 넘게 하락해 31년 만의 최저(1.32달러대). 코스피 낙폭(-3% 안팎)은 미확인 | [Al Jazeera](https://www.aljazeera.com/news/2016/6/24/brexit-likely-leave-ahead-in-uk-referendum), [Fox 4](https://www.fox4news.com/news/uk-pound-plunges-as-referendum-results-point-to-eu-exit) | 높음 |
| | 결과(**가상**) | 잔류 결정, 증시 반등 | — | **사실 아님** | — | 가상 |
| s03 한진해운 법정관리 | 잠정 | 채권단(산업은행) 자구안 부족 판단, 지원 중단 | 2016-08-30 | 부채 5.6조 원(2015년 말), 추가 필요 자금 1조~1.3조 원 | [Bloomberg](https://www.bloomberg.com/news/articles/2016-08-30/hanjin-shipping-creditors-reject-revamp-plans-as-insufficient) | 높음 |
| | 결과(실제) | 법정관리 신청, 세계 항만 입항 거부, 화물 발 묶임 | 2016-08-31 (2017-02 파산 선고) | 세계 7위 컨테이너 선사, 컨테이너 해운 사상 최대 파산. "수십만 개 컨테이너" 수치(약 50만 TEU로 알려짐)와 항공 화물 운임 상승은 이번 검색으로 미확인 | [gCaptain](https://gcaptain.com/hanjin-shipping-files-for-receivership-as-ports-turn-away-its-vessels/), [Seatrade](https://www.seatrade-maritime.com/containers/the-end-of-hanjin-shipping-officially-declared-bankrupt) | 중간 |
| | 결과(**가상**) | 막판 지원 합의 | — | **사실 아님** | — | 가상 |
| s04 가상화폐 규제 | 잠정 | 법무부 장관 거래소 폐쇄 추진 발언, 청와대 "확정 아님" | 2018-01-11 | 관련주 하한가 속출, 당일 시세 급락 뒤 일부 회복. 은행 계좌 발급 지연은 실명제 준비 과정 보도 | [뉴시스](https://mobile.newsis.com/view/NISX20180111_0000200882), [매일신문](https://www.imaeil.com/page/view/2018011200535620568) | 높음 |
| | 결과(실제) | 거래 실명제 시행, 시세 고점의 절반 아래 | 2018-01-30 ~ 02 | 실명제 첫날 비트코인 1,239만 원(-4.02%). 2018-02 초 약 6천~7천 달러(고점 대비 약 -65~70%)는 널리 알려진 시세로, 이번 검색으로 직접 확인하지 못함 | [세계일보](https://www.segye.com/newsView/20180130004226), [매일신문](https://www.imaeil.com/page/view/2018013100303711860) | 중간 |
| | 결과(**가상**) | 거래 허용, 시세 반등 | — | **사실 아님** | — | 가상 |
| s05 남북 정상회담 (opener) | 잠정 | 특사단 발표: 판문점 정상회담, 대화 기간 핵·미사일 시험 중단 | 2018-03-06 | 정의용 실장 발표, 4월 말 판문점 평화의 집, 정상 간 핫라인 | [Korea Herald](https://heraldk.com/en/2018/03/06/breaking-moon-and-kim-to-hold-summit-at-border-village-in-late-april/), [Wikipedia](https://en.wikipedia.org/wiki/April_2018_inter-Korean_summit) | 높음 |
| | 결과(실제) | 판문점 선언, 철도·도로 연결 추진 | 2018-04-27 | 완전한 비핵화, 동해선·경의선 연결·현대화, 당일 남북경협주 강세. 방산주 하락·외국인 자금 유입 폭은 미확인 | [Wikipedia](https://en.wikipedia.org/wiki/Panmunjom_Declaration), [뉴시스](https://mobile.newsis.com/view/NISX20180427_0000294424) | 높음 |
| | 결과(**가상**) | 정상회담 무산 | — | **사실 아님** | — | 가상 |
| s06 미국 금리 인상 (opener) | 잠정 | 옐런 의장 "금리 인상 날을 기다린다" | 2015-12-02 | 이코노믹클럽 연설, 시장은 12월 인상 예상 | [Business Standard](https://www.business-standard.com/amp/article/international/yellen-looking-forward-to-day-of-rate-hike-115120300045_1.html), [Euronews](https://www.euronews.com/2015/12/02/federal-reserve-yellen-looking-forward-to-interest-rate-hike) | 높음 |
| | 결과(실제) | 0.25%p 인상, 제로 금리 종료, 점진적 인상 예고 | 2015-12-16 | 0~0.25% → 0.25~0.5%, 2006년 이후 첫 인상, 만장일치 | [WTVR](https://www.wtvr.com/2015/12/16/federal-reserve-raises-interest-rates), [KTVU](https://www.ktvu.com/news/fed-finally-lifts-key-interest-rate-from-near-zero) | 높음 |
| | 결과(**가상**) | 인상 연기 | — | **사실 아님** | — | 가상 |
| s07 일본 수출 규제 | 잠정 | 일본 언론(산케이) 규제 방침 보도, 다음 날 정부 발표 예정 | 2019-06-30 | 강제징용 배상 판결에 대한 대응으로 보도 | [Euronews](https://www.euronews.com/business/2019/06/30/japan-to-tighten-export-rules-for-high-tech-materials-to-south-korea-media) | 높음 |
| | 결과(실제) | 불화폴리이미드·포토레지스트·고순도 불화수소 개별 허가제, 불매 운동 | 2019-07-01 발표, 07-04 시행 | 허가에 약 90일, 일본산 점유율(폴리이미드·레지스트 약 90%, 에칭가스 약 70%). 일본 여행·제품 불매 확산은 널리 알려진 사실로 이번 검색에서 수치는 미확인 | [OLED-Info](https://oled-info.com/japan-restrict-exports-some-materials-korea-could-effect-oled-production), [Al Jazeera](https://www.aljazeera.com/amp/economy/2019/8/30/japans-curbs-on-hi-tech-exports-to-south-korea-could-backfire) | 높음 |
| | 결과(**가상**) | 규제 보류 | — | **사실 아님** | — | 가상 |
| s08 사드 갈등 | 잠정 | 한미 사드 배치 결정, 중국 반발 | 2016-07-08 | 당일 방산주 상승, 화장품주 하락(한국콜마홀딩스 -6.26%, 코스맥스 -5.54%) | [머니투데이](https://www.mt.co.kr/stock/2016/07/08/2016070816530768477) | 높음 |
| | 결과(실제) | 중국 단체 관광 금지, 롯데마트 중국 점포 영업 정지, 면세점·화장품 타격 | 2017-03 (03-03 무렵 구두 지시 보도) | 2017년 1~11월 중국인 방한객 전년보다 370만 명 감소, 롯데마트 중국 점포 약 90곳 영업 정지, 2분기 면세점 매출 약 -40%. 한류 콘텐츠 제한(한한령)은 널리 알려진 사실로 이번 검색에서 따로 확인하지 않음 | [RFA](https://engview.rfaweb.org/english/news/china/china-tourism-03032017162204.html), [KEI](https://keia.org/the-peninsula/south-korean-losses-from-chinas-thaad-retaliation-continue-to-grow/), [Business Standard(Reuters)](https://www.business-standard.com/article/reuters/ghost-stores-lost-billions-as-korea-inc-s-china-woes-grow-117091300086_1.html), [시대일보](https://www.sidae.com/article/2017080223138094968) | 높음 |
| | 결과(**가상**) | 보복 없이 대화 | — | **사실 아님** | — | 가상 |
| s09 바이오시밀러 미국 허가 | 잠정 | FDA 자문위 21대 3 승인 권고 | 2016-02-09 | 셀트리온 CT-P13(인플릭시맙), 첫 항체 바이오시밀러 심사 | [GaBI](https://gabionline.net/biosimilars/news/FDA-advisers-recommend-approval-of-Celltrion-s-infliximab-biosimilar) | 높음 |
| | 결과(실제) | FDA 판매 허가 (미국 두 번째 바이오시밀러, 첫 항체) | 2016-04-05 | 상품명 인플렉트라, 화이자 판매. 대체조제 지정은 아님 | [RAPS](https://www.raps.org/resource/fda-approves-second-biosimilar-first-mab-biosimil.html), [Pharmacy Times](https://www.pharmacytimes.com/view/second-biosimilar-approved) | 높음 |
| | 결과(**가상**) | 허가 보류 | — | **사실 아님** | — | 가상 |
| s10 OPEC 감산 불발 (opener) | 잠정 | 회의 전 사우디·쿠웨이트·카타르·UAE "감산 제안 안 한다" | 2014-11-26 ~ 27 | 6월 이후 유가 3분의 1 넘게 하락(본문 "30% 넘게") | [Business Standard(Reuters)](https://www.business-standard.com/amp/article/reuters/oil-prices-fall-to-four-year-lows-as-opec-production-cut-looks-unlikely-114112700096_1.html) | 중간 (발언 보도 일자 확인 권장) |
| | 결과(실제) | 감산 불발, 유가 4년 만의 최저 | 2014-11-27 | 브렌트유 -5.17달러(약 -6.6%) 72.58달러, 장중 71.25달러. 2016-01 약 27달러까지 하락 | [Hydrocarbon Processing](https://hydrocarbonprocessing.com/news/2014/11/opec-to-hold-crude-production-at-current-levels-despite-falling-oil-prices/), [CNBC](https://www.cnbc.com/2018/05/15/oil-prices-have-rebounded-since-opec-refused-to-cut-output-in-2014.html) | 높음 |
| | 결과(**가상**) | 대규모 감산 합의 (실제 감산은 2016-11 합의) | — | **사실 아님** (해당 시점 기준) | — | 가상 |
| s11 갤럭시 노트7 발화 | 잠정 | 충전 중 발화 신고, 국내 공급 연기 | 2016-08-31 | 연합뉴스 "5~6건 신고", 추가 품질 검사로 국내 공급 연기 | [Inquirer(AP)](https://technology.inquirer.net/51758/tests-after-explosion-claims-slow-galaxy-note-7-deliveries) | 높음 |
| | 결과(실제) | 리콜 후 교환품도 발화, 출시 두 달 만에 단종, 손실 수조 원 | 2016-09-02 리콜 ~ 10-11 단종 | 리콜 약 250만 대, 리콜·단종 비용 최소 53억 달러(6조 원대) | [Fortune 타임라인](https://fortune.com/2016/10/10/timeline-samsun-galaxy-note-recall-crisis/), [Engadget](https://www.engadget.com/2016/10/11/samsung-ends-production-of-the-galaxy-note-7-for-good/), [Jakarta Post(AP)](https://www.thejakartapost.com/life/2016/10/14/samsung-note-7-recall-to-cost-at-least-53-billion-) | 높음 |
| | 결과(**가상**) | 충전기 문제로 판명, 판매 재개 | — | **사실 아님** | — | 가상 |
| s12 평창 동계 올림픽 유치 (opener) | 잠정 | 세 번째 도전, 유력 후보 | 2011-07 (07-06 투표 직전) | 2010·2014 대회 유치 실패(2010년은 3표 차). "가장 앞서 있다는 관측" | [Infobae(Around the Rings)](https://www.infobae.com/aroundtherings/ioc/2021/07/12/pyeongchang-wins-2018-olympics-updated-with-voting-results/) | 중간 |
| | 결과(실제) | 1차 투표 과반으로 유치 | 2011-07-06 (더반 IOC 총회) | 95표 중 63표 (뮌헨 25, 안시 7) | [JoongAng Daily](https://www.koreajoongangdaily.com/korea/at-last-pyeongchang-gets-winter-games/11039624), [ABC13](https://abc13.com/archive/8234345/) | 높음 |
| | 결과(**가상**) | 세 번째 유치 실패 | — | **사실 아님** | — | 가상 |
| s13 미중 무역전쟁 | 잠정 | 미국 500억 달러 25% 관세 목록 발표, 중국 맞대응 예고 | 2018-06-15 | 1차 340억 달러(818개 품목) + 2차 160억 달러 | [NPR](https://www.npr.org/2018/06/15/620259820/trump-levies-50-billion-in-tariffs-as-china-says-it-will-retaliate) | 높음 |
| | 결과(실제) | 340억 달러 관세 발효, 중국 동일 규모 보복(대두·자동차 등) | 2018-07-06 | 중국 545개 품목. "국내 증시 연중 최저"는 당시 보도 기준으로 이번 검색에서 지수 수치는 미확인 | [Dechert](https://www.dechert.com/knowledge/onpoint/2018/7/trade-war-escalates-with-china-tariffs.html), [CSCB](https://cscb.ca/en/article/us-tariffs-take-effect-34b-chinese-imports-beijing-announces-retaliation) | 중간 |
| | 결과(**가상**) | 막판 합의, 관세 철회 | — | **사실 아님** | — | 가상 |

## 3. 검증하면서 바꾼 점 (데이터에 반영함)

1. **s01 메르스 결과**: 처음 쓴 "확진자 수십 명"을 최종 186명에 맞게 "100명을 넘었다"로 고쳤다. 휴업 학교 수는 확인하지 못해 "잇따라 휴업"으로 썼다.
2. **b09 메신저 게임**: "한 달 만에 1천만"은 출처마다 기준이 달라(39일) "40일도 안 돼"로 썼다.
3. **b23 모바일 쇼핑**: "PC 추월"은 서울시 이용자 조사 기준이라 쓰지 않고, 통계청 거래액 기준 "온라인 쇼핑의 절반을 넘었다"로 썼다.
4. **b22 폴리실리콘**: 하락 기간이 약 9개월이라 본문을 "1년도 안 돼 60% 넘게"로 썼다.
5. **s11 발화 잠정 뉴스**: 첫 신고일(08-24)을 확인하지 못해 `realDate`를 공급 연기일 2016-08-31로 두었다.
6. **s12 평창 잠정 뉴스**: "현지 실사 최고 평가"는 출처를 찾지 못해 "앞서 있다는 관측이 많다"로 낮췄다.
7. **b19 철강 관세**: 본문의 "앞서 태양광 모듈에도 제한"은 2018-01-22 세이프가드(30%)로 확인했다.
8. 게임 데이터의 근거 메모(`source.event`)에서 실명(기관·지수·조사기관·차트 이름)을 모두 일반 표현으로 바꿨다. 실명은 이 문서에만 있다.

## 4. 직접 확인 권장

- b02 포탄 수(본문 "수십 발"), b07 의무휴업 전국 첫 시행일, b13 대형 조선사 2분기 확정 손실액, b19 철강 관세 포고문 서명일(03-08)
- s03 묶인 컨테이너 수와 항공 화물 운임 상승, s04 2018년 2월 비트코인 저점, s10 산유국 "감산 제안 안 함" 보도 일자, s13 관세 발효일 국내 증시 지수
- 테마 근거 중 해외여행(2010년 출국자 약 1,250만 명 — 2019년 2,871만 명은 [국가지표체계](https://www.index.go.kr/unify/idx-info.do?idxCd=1655)로 확인)과 섬유·의류 생산 해외 이전은 통계로 다시 확인 권장
- 대부분 뉴스의 "국내 관련 업종 주가 등락 폭"은 찾지 못했다. 현재 영향도는 사건 규모에 따른 판단값이다. 간접(강도 1) 연결 상당수(예: 대지진 → 카메라·자동차, 반도체 수출 → 항공 화물, 바이오 허가 → 화장품)는 실제 주가 기록이 아니라 연결 설명에 따른 판단이다.

## 5. 9차 추가 속보 23개 (뉴스 간격 3~4분 대응)

뉴스 간격을 3~4분으로 줄여 시대당 뉴스가 약 34개가 되면서 풀을 늘렸다. 검색일: 2026-10-11.

| 뉴스 ID | 사실 주장(사건) | 실제 날짜 | 근거 수치 | 출처 | 확신도 |
|---|---|---|---|---|---|
| b25-arab-oil | 리비아 내전으로 원유 수출 중단, 브렌트유 2년 반 만의 최고, 국내 건설사 현장 철수 | 2011-02-21 ~ 02-24 | 브렌트 02-24 장중 113달러(2008-09 이후 최고), 02-18 ~ 03-02 배럴당 15달러 상승(하루 150만 배럴 수출 손실). 국내 24개 건설사·2만 2천여 명 진출, 현장 피습·철수 | [EIA](https://www.eia.gov/todayinenergy/detail.php?id=4550), [Ahram(Reuters)](https://english.ahram.org.eg/News/6324.aspx), [머니투데이](https://www.mt.co.kr/estate/2011/02/21/2011022114541953617), [서울신문](https://m.seoul.co.kr/news/2011/02/25/20110225800042) | 높음 |
| b26-savings-bank | 부산·대전저축은행 영업정지, 이틀 뒤 계열 등 4곳 추가, 예금 인출 행렬 | 2011-02-17 ~ 02-19 | 6개월 영업정지, 원인 부동산 PF 대출 부실. 부산2저축은행 앞 4천여 명 대기. "예금이 시중 은행으로 이동"은 판단 문장(수치 미확인) | [머니투데이](https://www.mt.co.kr/finance/2011/02/17/2011021709402565413), [뉴스토마토](https://newstomato.com/ReadNews.aspx?no=140430), [서울신문](https://m.seoul.co.kr/news/2011/02/18/20110218800046) | 높음 (예금 이동은 중간) |
| b27-lte-launch | SK텔레콤·LG유플러스 LTE 상용 서비스 시작 | 2011-07-01 | 서울 등 데이터 전용으로 출발, 스마트폰은 9월부터. "최대 다섯 배"는 3G(HSPA 14.4Mbps) 대비 LTE(75Mbps) 이론 속도 기준 판단값 | [ABI Research](https://www.abiresearch.com/blog/south-korea-wakes-up-to-lte), [Engadget](https://www.engadget.com/2011/07/05/sk-telecom-and-lg-u-launch-lte-in-seoul-fellow-south-koreans-s/) | 높음 (속도 배수 중간) |
| b28-viral-video | 싸이 '강남스타일' 유튜브 첫 10억 뷰 | 2012-12-21 | 1,000,382,639회, 업로드 159일 만 (기네스). "노래 속 동네를 찾는 외국인"은 당시 보도 기억으로 이번 검색에서 수치 미확인 | [Guinness World Records](https://www.guinnessworldrecords.com/news/2012/12/psys-gangnam-style-becomes-first-video-to-be-viewed-1-billion-times-on-youtube-46462/), [YouTube 블로그](https://blog.youtube/news-and-events/ytvev/) | 높음 |
| b29-yen-easing | 일본은행 양적·질적 완화(QQE), 엔화 급락 | 2013-04-04 | 본원통화·국채·ETF 보유 2년 내 2배, 연 60~70조 엔 증가, 엔화 급락·국채 금리 사상 최저. 국내 자동차·철강 가격 경쟁력 약화는 판단(엔저 우려 보도 다수) | [BIS](https://www.bis.org/publ/qtrpdf/r_qt1306x.htm), [Business Standard(Reuters)](https://www.business-standard.com/amp/article/reuters/boj-to-pump-1-4-trillion-into-economy-in-unprecedented-stimulus-113040400332_1.html) | 높음 |
| b30-parts-forgery | 원전 제어 케이블 시험 성적서 위조, 신고리 1·2·신월성 1 가동 중단, 전력난 우려 | 2013-05-28 | 시험검증기관이 해외 시험 결과를 위조. 여름 전력 수급 대책 요구. 본문 "제어용 전선"(케이블 TV 테마와 헷갈리지 않게 표현) | [참여연대](https://peoplepower21.org/peace/1034445), [데일리안](https://www.dailian.co.kr/news/view/341183/) | 높음 (절전 요청은 중간) |
| b31-crypto-exchange | 마운트곡스 파산 보호 신청, 85만 BTC 분실 | 2014-02-28 | 고객분 75만 + 자체 10만 BTC, 부채 약 6,360만 달러. 당시 가격 영향 수치는 미확인(본문에 없음) | [KTOO(NPR)](https://www.ktoo.org/2014/02/28/mtgox-files-for-bankruptcy-nearly-500m-of-bitcoins-lost/), [Cointelegraph](https://cointelegraph.com/news/details-of-mt-gox-s-bankruptcy-protection-filing) | 높음 |
| b32-cosmetics-surplus | 화장품 무역수지 1995년 집계 이후 첫 흑자 | 2014 (1~8월 누적 1억 4,766만 달러 흑자, 연간 흑자) | 연간 흑자 규모는 약 5억~7억 5천만 달러로 출처마다 다름(본문에 수치 없음). 2014년 수출 약 19억 달러 | [산업통상자원부 자료](https://www.motir.go.kr/attach/down/aa4abe331409819421ff269b271f06a6/3d95f3b11322cc8486050dbf5f0ce6ec), [세계일보](https://www.segye.com/newsView/20151231001910), [한경비즈니스](https://magazine.hankyung.com/business/article/201706274995b) | 높음 |
| b33-china-ecommerce-ipo | 알리바바 뉴욕 상장, 사상 최대 IPO | 2014-09-19 | 공모가 68달러, 첫날 종가 93.89달러(+38%), 그린슈 포함 약 250억 달러. 국내 업체 중국 온라인몰 입점 확대는 판단 문장 | [Renaissance Capital](https://www.renaissancecapital.com/IPO-Center/News/21211/US-IPO-Pricing-Recap-Alibaba-pops-38-percent-represents-one-third-of-2014-I), [Fortune](https://fortune.com/2014/09/22/alibaba-is-officially-the-biggest-ipo-ever-after-green-shoe-released) | 높음 |
| b34-handset-subsidy | 단말기유통구조개선법(단통법) 시행, 보조금 상한 | 2014-10-01 | 첫날 번호이동 4,524건(직전 일평균 1만 6,178건), 매장 한산. 이통 3사 2015년 영업이익 +87%. 연간 단말 판매량은 오히려 늘어(2014년 1,823만 → 2015년 1,908만 대) 본문은 "첫날"로 한정 | [메트로신문](https://www.metroseoul.co.kr/article/2014100500096), [시대일보](https://www.sidae.com/article/2016042822588012590) | 높음 |
| b35-climate-pact | 파리 기후변화협정 채택 | 2015-12-12 | "2도보다 훨씬 낮게", 개도국 포함. 채택국 수는 195개국으로 알려졌으나 이번 검색은 "약 200개 정부"만 확인 → 본문 "190여 나라". 다음 거래일 재생에너지주 상승·석탄주 하락 | [Fortune](https://fortune.com/2015/12/14/paris-climate-deal-sinks-coal-stocks-lifts-renewable-energy/amp), [Common Dreams](https://commondreams.org/news/2015/12/15/after-paris-fossil-fuels-flail-while-solar-stocks-soar) | 높음 |
| b36-streaming-launch | 넷플릭스 130여 개국 동시 진출(한국 포함) | 2016-01-06 (한국 시간 01-07) | 진출국 190여 개국으로 늘어남, 한국어 지원. "월 1만 원 안팎" 요금은 당시 국내 요금제(9,500~14,500원) 기억값으로 이번 검색에서 미확인 | [Android Central](https://www.androidcentral.com/netflix-expands-130-new-countries-including-india-russia-and-south-korea-and-more), [Tubefilter](https://tubefilter.com/2016/01/06/netflix-global-expansion-130-countries/) | 높음 (요금 중간) |
| b37-ar-game | 포켓몬 고 열풍, 국내 미출시 상태에서 속초 등에서 실행 | 2016-07 (07-12 무렵 ~) | 속초행 고속버스 예약 상승·매진, 숙박·관광 몰림. 보조 배터리 판매 증가는 판단(수치 미확인) | [스포츠경향](https://sports.khan.co.kr/article/201607130835013), [경향신문](https://www.khan.co.kr/article/201607132013001/amp), [쿠키뉴스](https://www.kukinews.com/article/view/kuk201607250231) | 높음 |
| b38-quake-reactor | 경주 규모 5.8 지진(관측 이래 최대), 월성 1~4호기 수동 정지 | 2016-09-12 | 일부 자동차·반도체 공장 일시 중단 후 재가동, 사망자 없음(본문 "큰 피해는 없었지만") | [기상청 연보](https://www.kma.go.kr/download_01/earthquake/earthquake_2016.pdf), [데일리안](https://www.dailian.co.kr/news/view/589775/), [참여연대](https://peoplepower21.org/peace/1448001) | 높음 |
| b39-internet-bank | 카카오뱅크 출범 약 102시간(닷새) 만에 100만 계좌 | 2017-07-27 ~ 07-31 | 1주일 151만 계좌. 기존 은행 수수료 인하 대응은 판단 문장 | [토요경제](https://www.sateconomy.co.kr/news/view/179588224623201), [데일리안](https://www.dailian.co.kr/news/view/650652/) | 높음 |
| b40-china-steel-cut | 중국 철강 설비 감축(2017년 목표 5천만 톤), 유도로 철강 퇴출, 철강값 상승 | 2017 (연간) | 2016~2017년 1억 2천만 톤 감축(2017년 5,500만 톤), 중대형 제철소 이익 7배. 국내 조선·자동차 원가 부담은 판단(수치 미확인) | [S&P Global](https://www.spglobal.com/energy/en/news-research/blog/metals/030717-timeline-chinas-crackdown-on-induction-furnace-steel), [Fastmarkets](https://www.fastmarkets.com/insights/cisa-conf-2018-seven-things-we-learned-about-china-steel-up-to-2020/), [CNBC](https://www.cnbc.com/2017/08/10/chinas-steel-prices-are-rising-and-thats-worrying-beijing.html) | 중간 |
| b41-uk-nuclear | 한전, 영국 무어사이드 원전(NuGen) 인수 우선협상대상자 선정 | 2017-12-07 | 최대 3.8GW(원전 3기), UAE 원전 공기·예산 준수가 평가. 2018년 지위 상실(본문은 "협상이 더 남았다"까지만). "20조 원대" 사업비는 당시 국내 보도(약 21조 원) 기억값으로 이번 검색에서 미확인 | [World Nuclear News](https://world-nuclear-news.org/articles/kepco-named-preferred-bidder-for-uk-s-nugen), [Korea Times](https://www.koreatimes.co.kr/amp/business/companies/20171207/kepco-chief-concludes-daunting-task-before-resignation), [Enerdata](https://www.enerdata.net/publications/daily-energy-news/kepco-no-longer-preferred-bidder-uk-nuclear-project-acquisition.html) | 중간 (사업비 확인 필요) |
| b42-lira-crash | 터키 리라화 폭락, 미국 철강·알루미늄 관세 2배 | 2018-08-10 | 장중 최대 -18%(일부 -22%), 2001년 이후 최악, 신흥국 통화·증시 동반 하락, 유럽 은행주 하락. 국내 건설사 대금 회수 우려는 판단 | [Business Standard(Reuters)](https://www.business-standard.com/amp/article/reuters/turkish-currency-s-freefall-rocks-world-equity-markets-euro-118081100074_1.html), [Bloomberg](https://www.bloomberg.com/news/articles/2018-08-10/turkey-s-meltdown-sends-shockwaves-through-emerging-markets) | 높음 |
| b43-chip-slump | 메모리 가격 하락, 반도체 수출 급감 | 2019 (연간) | 반도체 수출 939억 달러(-25.9%), 8Gb D램 1년 새 -36.5~-37.6%(2019년 초 기준, 연말까지 추가 하락). 본문 "절반 가까이"는 2018년 고점 대비 판단 | [뉴스토마토](https://newstomato.com/ReadNews.aspx?no=945567), [이투데이](https://www.etoday.co.kr/news/view/1728630), [머니투데이](https://www.mt.co.kr/economy/2019/02/07/2019020711224362459) | 높음 (가격 하락 폭 중간) |
| b44-digital-coin | 페이스북 리브라 백서 발표, 비트코인 1만 달러 회복 | 2019-06-18 ~ 06-24 | 비트코인 06-24 1만 1,251달러(2018-03 이후 첫 1만 달러 돌파, AFP). 리브라 영향 정도는 분석가마다 다름 | [Inquirer(AFP)](https://technology.inquirer.net/?p=88118), [Verdict](https://www.verdict.co.uk/facebook-cryptocurrency-bitcoin-price/) | 높음 |
| b45-swine-fever | 아프리카돼지열병 국내 첫 확진(파주) | 2019-09-17 | 돼지고기 경매가 ㎏당 6,062원(+32.9%) 또는 5,828원(+32.4%), 중점관리지역 지정. 소독제·백신 업체 주문 증가는 당시 관련주 급등 보도 기억으로 수치 미확인 | [데일리안](https://www.dailian.co.kr/news/view/826998/), [뉴시스](https://www.newsis.com/view/NISX20190918_0000773217) | 높음 |
| b46-delivery-app | 딜리버리히어로, 우아한형제들(배달의민족) 인수 합의 | 2019-12-13 | 기업가치 40억 달러(약 4조 7,500억 원), 지분 87~88% 인수 | [Delivery Hero IR 자료](https://irpages2.eqs.com/download/companies/delivery/Presentations/20191213_Delivery_Hero_Woowa_Partnership.pdf), [Korea Herald](https://www.koreaherald.com/article/10738059) | 높음 |
| b47-open-banking | 오픈뱅킹 전면 시행(핀테크 포함) | 2019-12-18 | 은행 16곳·핀테크 31곳 참여, 이체 수수료 약 10분의 1 | [데일리안](https://www.dailian.co.kr/news/view/838185/), [이투데이](https://www.etoday.co.kr/news/view/1835817) | 높음 |

## 6. 9차 추가 스토리 7개

| 스토리 | 뉴스 | 사실 주장 | 실제 날짜 | 근거 | 출처 | 확신도 |
|---|---|---|---|---|---|---|
| s14 유럽 중앙은행 (opener) | 잠정 | 드라기 총재 "유로를 지키기 위해 무엇이든 하겠다, 그것으로 충분할 것", 유럽 증시 반등 | 2012-07-26 (런던) | 남유럽 국채 금리 급등 국면, 유럽 증시·유로화 반등 | [BNP Paribas](https://cdn-group.bnpparibas.com/uploads/file/believe_me_it_will_be_enough.pdf), [European Sources](https://www.europeansources.info/record/ecb-ready-to-do-whatever-it-takes/?print) | 높음 |
| | 결과(실제) | 조건부 국채 무제한 매입(OMT) 발표, 금리 급락·증시 상승 | 2012-09-06 | 스페인 10년물 -38bp(6.03%). OMT는 실제로 한 번도 쓰이지 않음. 국내 외국인 순매수 규모는 미확인 | [Philstar](https://www.philstar.com/business/2012/09/10/847228/battle-will), [Institutional Investor](https://www.institutionalinvestor.com/article/2bsvidk7xytcc8jbig2rk/portfolio/markets-react-well-but-draghi-debt-plan-is-just-the-first-step) | 높음 |
| | 결과(**가상**) | 국채 매입 결정 연기 | — | **사실 아님** | — | 가상 |
| s15 개성공단 | 잠정 | 북한, 남측 인원 출입 차단(귀환만 허용), 앞서 폐쇄 경고 | 2013-04-03 | 약 480명 출입 거부, 861명 체류 | [Inquirer(AFP)](https://newsinfo.inquirer.net/384019/north-korea-blocks-access-to-key-industrial-zone/amp), [UPI](https://www.upi.com/Top_News/US/2013/04/03/UPI-NewsTrack-TopNews/UPI-96041364990400/) | 높음 |
| | 결과(실제) | 북측 근로자 전원 철수, 가동 잠정 중단 | 2013-04-08 (09-16 재가동) | 4월 8일 김양건 담화, 9월 재가동. 근로자 약 5만 3천 명·입주 기업 123곳(본문 "5만여 명", "120여 개")은 널리 알려진 수치로 이번 검색 결과에는 직접 나오지 않음 | [전북일보](https://www.jjan.kr/articleAmp/20130408466952), [서울신문](https://m.seoul.co.kr/news/2013/05/04/20130504002015), [경북매일](https://www.kbmaeil.com/article/201602160153635) | 높음 (인원·기업 수 중간) |
| | 결과(**가상**) | 출입 재개, 조업 정상화 (실제 재가동은 5개월 뒤) | — | **사실 아님** (해당 시점 기준) | — | 가상 |
| s16 폭스바겐 디젤 | 잠정 | 미 환경보호청, 배출가스 조작 장치 위반 통지 | 2015-09-18 | 2.0L 디젤, 검사 때만 저감 장치 작동(주행 시 NOx 최대 40배) | [EPA 보도자료](https://www.epa.gov/archive/epa/newsreleases/epa-california-notify-volkswagen-clean-air-act-violations-carmaker-allegedly-used.html), [IndustryWeek](https://www.industryweek.com/leadership/volkswagen-hit-recall-alleged-emissions-ploy) | 높음 |
| | 결과(실제) | 1,100만 대 시인, 주가 폭락, 빈터코른 대표 사퇴 | 2015-09-22 ~ 09-23 | 주가 09-21 약 -20%, 09-22 약 -20%(본문 "이틀 새 30% 넘게"), 09-23 사퇴. 국산차 유럽 판매 기회는 판단 | [CNBC](https://www.cnbc.com/2015/09/23/martin-winterkorn-resigns-as-volkswagen-ceo.html), [SBS](https://www.sbs.com.au/news/article/volkswagen-needs-a-fresh-start-ceo-quits-over-diesel-emissions-scandal/1dm1z3n3t) | 높음 |
| | 결과(**가상**) | 단순 오류 결론, 리콜로 마무리 | — | **사실 아님** | — | 가상 |
| s17 삼성바이오로직스 회계 | 잠정 | 증선위 고의 분식 여부 최종 심의, 금감원은 고의 분식 의견 | 2018-11 (11-14 결론 직전) | 결론 전 "고의 여부 최대 쟁점" 보도. 금감원 재감리 결론 일자는 이번 검색(사용량 한도로 중단)에서 따로 확인하지 못함 | [한국경제](https://www.hankyung.com/amp/201811112595Y) | 중간 |
| | 결과(실제) | 고의 분식 결론, 거래 정지, 상장 적격성 심사, 행정소송 예고 | 2018-11-14 (12-10 상장 유지 결정, 12-11 거래 재개) | 대표이사·CFO 해임 권고, 거래 정지 19일 | [한국경제](https://www.hankyung.com/amp/2018111428397), [데일리팜](https://www.dailypharm.com/user/news/79665), [이투데이](https://www.etoday.co.kr/news/view/1697915) | 높음 |
| | 결과(**가상**) | 고의 위반 없음 결론 | — | **사실 아님** | — | 가상 |
| s18 애플-삼성 특허 소송 | 잠정 | 배심원 평결 직전, 앞서 갤럭시 탭 10.1 판매 금지 가처분, 원고 25억 달러 청구 | 2012-08 (평결 08-24), 가처분 2012-06-26 | 원고 청구 25억 달러(본문 "3조 원에 가깝다") | [Macworld](https://www.macworld.com/article/1167532/samsung_refused_stay_on_injunction_against_us_sales_of_galaxy_tab_101.html), [Engadget](https://www.engadget.com/2012-07-03-us-court-upholds-ban-on-samsung-galaxy-tab-10-1-sales.html), [Bloomberg](https://www.bloomberg.com/news/articles/2012-08-24/apple-samsung-jury-reaches-verdict-in-patent-trial) | 높음 |
| | 결과(실제) | 특허 6건 침해, 10억 5천만 달러 배상 평결, 주가 하루 7% 넘게 하락 | 2012-08-24 (주가 08-27) | 08-27 -7.5%(장중 최대 -8%, 약 4년 만의 최대 낙폭), 시가총액 120억 달러 감소. 메모리 납품 지속(간접)은 판단 | [Jolt Digest](https://jolt.law.harvard.edu/digest/apple-inc-v-samsung-electronics-co-ltd), [Business Standard(Reuters)](https://www.business-standard.com/amp/article/international/samsung-shares-drop-12-bln-after-apple-s-court-victory-112082700121_1.html) | 높음 |
| | 결과(**가상**) | 침해 없음 평결 | — | **사실 아님** | — | 가상 |
| s19 사우디 석유 시설 피격 (opener) | 잠정 | 아브카이크·쿠라이스 드론 공격, 생산 절반(하루 570만 배럴) 중단, 유가 급등, 정부 "빠른 복구" | 2019-09-14 (유가 09-16) | 브렌트 09-16 종가 +13.3%(68.07달러), 장중 최대 +20%(본문 "15% 가까이") | [CNBC](https://www.cnbc.com/2019/09/15/us-crude-oil-jumps-15percent-after-drone-strikes-disrupt-saudi-crude-production.html), [Irish Times](https://www.irishtimes.com/business/markets/oil-prices-soar-to-three-decade-highs-after-attacks-halve-saudi-output-1.4019476) | 높음 |
| | 결과(실제) | 생산 절반 이상 회복, 월말 완전 복구 발표, 유가 반락 | 2019-09-17 | 다음 날 유가 약 -6.5%. 월말 완전 복구 여부는 계획 발표 기준(실제 달성은 미확인) | [World Oil](https://www.worldoil.com/news/2019/9/17/saudi-arabia-partially-restores-output-at-damaged-oil-plant), [Energy Voice](https://energyvoice.com/oilandgas/middle-east/207957/oil-price-stabilises-as-saudi-eyes-quick-restoration-of-output) | 높음 |
| | 결과(**가상**) | 복구 수개월, 유가 100달러 육박 | — | **사실 아님** | — | 가상 |
| s20 미국 금리 인하 (opener) | 잠정 | 파월 의장 "경기 확장을 지키기 위해 적절히 대응" | 2019-06-04 (시카고 연준 콘퍼런스) | 다우 약 +2.06%(약 500포인트) | [IG](https://www.ig.com/en/news-and-trade-ideas/indices-news/dow-jones-up-500-points-as-fed-says-it-will-act-to-help-us-econo-190604), [InvestorPlace](https://investorplace.com/2019/06/dow-jones-today-finally-the-markets-see-some-relief/) | 높음 (연설 원문은 연준 사이트 접속 실패로 미확인) |
| | 결과(실제) | 기준금리 0.25%p 인하(2.00~2.25%), 2008-12 이후 첫 인하 | 2019-07-31 | 8대 2 결정, 자산 축소 조기 종료 | [Axios](https://www.axios.com/2019/07/31/fed-cuts-interest-rates-for-first-time-since-2008?stream=top), [Global News](https://globalnews.ca/news/5708559/fed-rate-cut/) | 높음 |
| | 결과(**가상**) | 금리 동결 | — | **사실 아님** | — | 가상 |

## 7. 9차 작업에서 정한 점

1. **실명 처리**: 게임 데이터에는 기업·지명·기관 실명 대신 일반 표현(예: "북아프리카 산유국", "메신저 회사가 세운 인터넷 은행", "세계 최대 원유 수출국", "유럽 대형 자동차 회사", "남동부 지역")을 썼다. 근거 메모(`source.event`)의 원전 호기 이름·프로그램 이름(OMT)·회사 이름도 일반 표현으로 바꿨다. 실명은 이 문서에만 있다. 나라 이름(터키·독일·중국·일본·영국 등)과 화폐 이름은 썼다.
2. **b30 원전 부품**: 원문은 "제어 케이블"이지만 케이블 TV 테마와 헷갈리지 않게 "제어용 전선"으로 썼다.
3. **b34 단통법**: 연간 단말 판매량은 오히려 늘어 "판매 급감"으로 쓰지 않고 시행 첫날 번호이동 감소만 썼다.
4. **b35 파리 협정**: 채택국 수를 출처로 확정하지 못해 "190여 나라"로 썼다.
5. **b38 경주 지진**: 사망자는 없었고, 본문은 원전 정지와 "큰 피해는 없었지만"으로만 다뤘다.
6. **s15 개성공단 가상 결과**: 실제로도 9월에 재가동됐지만 잠정 뉴스 직후 정상화는 사실이 아니라 가상으로 표시했다.
7. **밸런스 조정**: 뉴스 간격이 3~4분으로 줄어 초고속 추종 수익이 커지는 것을 막으려고 9차 추가 속보의 규모를 4~6으로 낮게 잡았다(b25·b43 6, b29·b40·b42 5, 나머지 4). 영향도는 모두 공식 그대로다. 기존 뉴스는 바꾸지 않았다.

## 8. 9차 직접 확인 권장

- b41 영국 원전 사업비 "20조 원대", b36 국내 월 요금 "1만 원 안팎", b28 "노래 속 동네를 찾는 외국인", b45 소독제·백신 업체 주문 증가
- s15 북측 근로자 수(약 5만 3천 명)·입주 기업 수(123곳), s17 금감원 재감리 결론 일자, s20 연설 원문(연준 사이트 접속 실패)
- b43 D램 가격 "1년 새 절반 가까이"(2018년 고점 대비 연말 하락 폭), b40 국내 조선·자동차 업체의 강판 가격 부담 수치
- 간접(강도 1) 연결 상당수(예: 증강현실 게임 → 보조 배터리, 단통법 → 케이블 TV, 돼지열병 → 해운)는 실제 주가 기록이 아니라 연결 설명에 따른 판단이다.
