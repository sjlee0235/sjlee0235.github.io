# 2010년대 뉴스 팩트체크 표 (초안)

- 대상: `src/data/eras/2010s.json` — 속보 24개, 스토리 13개(잠정 1 + 결과 2씩 = 39개), 모두 63개
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
