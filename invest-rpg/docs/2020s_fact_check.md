# 2020년대 뉴스 팩트체크 표 (단계 B 초안)

- 대상: `src/data/eras/2020s.json`. 속보 46개, 스토리 21개(잠정 1개 + 결과 2개씩, 모두 63개), 합계 109개. opener 스토리는 8개(s01·s02·s05·s06·s08·s12·s14·s15)
- 1~5장은 처음 작성분(속보 24개·스토리 13개), 6~9장은 뉴스 간격 3~4분 변경에 맞춘 추가분(속보 22개·스토리 8개, 2026-10-11)이다.
- 이 문서는 **앱에 포함되지 않는다**. 검증 편의를 위해 실명(기업·인물·지수·기관)을 그대로 적었다. 게임 데이터(JSON)의 제목·본문·근거 메모(`source.event`)에는 실명을 쓰지 않았다.
- 확신도
  - **높음**: 날짜와 핵심 수치를 웹 출처로 확인함
  - **중간**: 사건과 시기는 확인했지만 세부 수치 일부를 확인하지 못했거나 출처끼리 기준이 다름
  - **확인 필요**: 출처를 찾지 못했거나 출처끼리 수치가 다름
- 영향도는 **사건 규모에 따른 판단값**이다 (공식: 직접 = 규모, 밀접 = 규모×0.6, 간접 = 규모×0.3 반올림, ±1 조정 없음). 실제 등락률을 옮긴 값이 아니다.
- 가상 결과(실제와 다른 결과)는 **사실이 아님**을 표시했다. 게임 화면에서는 "가상 시나리오" 태그가 붙는다.
- 본문에는 연도·월을 쓰지 않았다 (뉴스는 시대 안에서 무작위 순서로 나온다). 실제 날짜는 데이터의 `realDate`에만 있다.
- 기간: 2020년 1월 ~ 검색일 현재(2026년 10월)까지 실제로 일어난 일만 다뤘다.
- 검색일: 2026-10-11.

## 1. 속보 24개

| 뉴스 ID | 사실 주장(사건) | 실제 날짜 | 근거 수치 | 출처 | 확신도 |
|---|---|---|---|---|---|
| b01-pandemic-crash | WHO 코로나19 세계적 대유행(팬데믹) 선언, 국경 봉쇄와 세계 증시 폭락 | 선언 2020-03-11, 국내 저점 03-19 | 코스피 03-19 종가 1,457.64 (03-20 종가 1,566.15 = 전일 대비 +108.51p에서 역산), 03-13 거래 일시 정지. 진단키트 주문 급증은 2020년 연간 수출액(b02 근거 참고)으로 확인 | [아시아경제(영문)](https://www.asiae.co.kr/en/article/2020032015331905393), [JoongAng Daily](https://www.koreajoongangdaily.com/korea/stocks-collapse-as-a-global-selloff-continues/11113093) | 높음 (WHO 선언일은 널리 알려진 사실) |
| b02-retail-wave | "동학개미" 개인 투자자 사상 최대 순매수, 신규 계좌 급증 | 2020 | 12-11까지 개인 순매수 코스피 45.5조 + 코스닥 16.9조 = 62.4조 원. 2020~2021년 누적 약 135조 원. "하루 수만 개 신규 계좌"는 개별 수치 미확인 | [이투데이](https://www.etoday.co.kr/news/view/1974916), [뉴시스](https://www.newsis.com/view/NISX20201230_0001289150) | 중간 |
| b03-kpop-chart | BTS 'Dynamite' 빌보드 핫100 1위, 한국 가수 최초 | 2020-08-31 (미국), 국내 09-01 | 첫 주 미국 스트리밍 3,390만 회, 판매 30만 건. 소속사(빅히트) 상장은 2020-10 | [Korea Times](https://www.koreatimes.co.kr/amp/entertainment/k-pop/20200901/with-dynamite-bts-becomes-first-korean-group-to-top-billboard-hot-100), [SCMP](https://amp.scmp.com/lifestyle/entertainment/article/3099681/bts-are-first-korean-band-debut-no-1-us-billboard-charts) | 높음 |
| b04-lng-slots | 카타르페트롤리엄, 국내 조선 3사와 LNG 운반선 100척 이상 슬롯 계약 | 2020-06-01 | 700억 리얄(약 192억 달러, 약 23.6조 원). 슬롯 계약은 정식 발주 전 건조 공간 예약 (본문도 "예약"으로 씀) | [Al Jazeera](https://www.aljazeera.com/amp/economy/2020/6/1/qatar-petroleum-signs-19bn-shipbuilding-deal-with-korean-firms), [Seatrade Maritime](https://www.seatrade-maritime.com/shipyards/qatar-petroleum-inks-19-23bn-lng-carrier-mega-deals-with-korean-yards), [Hellenic Shipping News](https://www.hellenicshippingnews.com/?p=922030) | 높음 |
| b05-car-chip-shortage | 차량용 반도체 부족으로 국내외 완성차 공장 가동 중단 | 2021-04 (현대차 울산1공장 04-07~14 휴업) | 울산1공장(코나·아이오닉5) 휴업, 아산공장 휴업 검토, 기아 조지아 공장 중단. "중고차 값 상승"은 당시 국내외 보도 흐름이나 수치 미확인 | [머니투데이](https://www.mt.co.kr/industry/2021/04/07/2021040715230723348), [뉴시스](https://mobile.newsis.com/view/NISX20210406_0001397331) | 중간 |
| b06-canal-blocked | 에버기븐호 수에즈 운하 좌초, 약 1주 마비 | 2021-03-23 ~ 03-29 | 대기 선박 367~422척(출처별 차이, 본문 "수백 척"), 석유제품 유조선 운임 그 주 약 2배, 컨테이너 운임은 이후 신고점 | [S&P Global](https://www.spglobal.com/commodity-insights/en/news-research/latest-news/shipping/032421-suez-canal-blocked-ever-given-container-ship-maritime-trade), [Seatrade Maritime](https://www.seatrade-maritime.com/containers/ever-given-blocking-suez-canal-re-floated), [Business Standard](https://www.business-standard.com/amp/article/international/suez-blockage-sets-shipping-rates-racing-oil-and-gas-tankers-diverted-away-121032600655_1.html) | 중간 ("운임 사상 최고"는 봉쇄 직후~5월 흐름) |
| b07-crypto-volume | 국내 가상화폐 거래소 하루 거래대금이 주식시장 추월 | 2021-04 | 3월 말~4월 초 하루 약 21조 원, 4-07 업비트 25조 원(코스피 14조 + 코스닥 11조보다 많음). 비트코인 4월 중순 사상 최고가. 집계 기준(거래소 단독/전체, 코스피 단독/합산)이 기사마다 다름 | [딜사이트](https://dealsite.co.kr/articles/72964), [파이낸셜뉴스](https://www.fnnews.com/news/202104051121096509), [메디게이트](https://medigatenews.com/stand/21946) | 중간 |
| b08-game-limit | 중국 미성년자 온라인 게임 주 3시간 제한 + 연예인 팬덤 규제 | 2021-08-30 (팬덤 규제 08-27) | 금·토·일·공휴일 20~21시 1시간만 허용. 국내 게임주는 당일 엇갈렸고 이후 몇 주간 하락(엔씨 09-17까지 -9.6%) | [Korea Times](https://www.koreatimes.co.kr/amp/business/companies/20210831/chinas-tougher-regulations-set-to-impact-korean-game-companies), [JoongAng Daily](https://www.koreajoongangdaily.com/business/aftereffects-of-chinas-crackdown-on-kids-gaming-trickle-into-korean-market/11157247), [NBC News(팬덤 규제)](https://www.nbcnews.com/news/world/china-cracks-down-fan-groups-bans-celebrity-rankings-beijing-targets-n1277793) | 높음 |
| b09-drama-global | '오징어 게임' 넷플릭스 94개국 1위 | 공개 2021-09-17, 실적 발표 10-19 | 첫 4주 1억 4,200만 가구 시청 (본문 "1억 가구 넘게") | [TechCrunch](https://techcrunch.com/2021/10/20/netflix-says-142-million-households-watched-korean-series-squid-game), [JoongAng Daily](https://www.koreajoongangdaily.com/business/squid-game-is-most-watched-netflix-original-series/11569317) | 높음 |
| b10-invasion | 러시아 우크라이나 전면 침공, 유가·곡물 급등, 유럽 국방비 증액 | 2022-02-24 | 브렌트유 장중 103.78달러(2014년 이후 처음 100달러 돌파). 독일 1,000억 유로 국방 특별기금(02-27) 등 국방비 증액은 널리 알려진 사실 | [OE Digital](https://www.oedigital.com/amp/news/494552-oil-price-tops-100-for-first-time-since-2014-as-russia-attacks-ukraine), [NPR(MPR)](https://www.mprnews.org/story/2022/02/24/npr-oil-surges-past-100-a-barrel-after-russia-invades-ukraine) | 높음 |
| b11-inflation | 소비자물가 2개월 연속 6%대, 외환위기 이후 최고 | 2022-06 6.0%, 07 6.3% | 1998-11(6.8%) 이후 최고. 석유류 +35.1% | [뉴스토마토](https://newstomato.com/ReadNews.aspx?no=1138516), [뉴시스](https://www.newsis.com/view/NISX20220802_0001965003) | 높음 |
| b12-ev-subsidy | 미국 인플레이션 감축법(IRA) 서명, 북미 조립 전기차만 세액공제 | 2022-08-16 | 다음 날부터 아이오닉5·EV6 공제 제외. 배터리 부품·광물 요건 각 3,750달러. 태양광 등 미국 생산 세액공제 | [Korea Times](https://www.koreatimes.co.kr/www/tech/2022/08/419_334645.html), [NBC](https://www.nbcwashington.com/news/national-international/most-electric-vehicles-wont-qualify-for-the-tax-credit-thats-in-the-new-climate-bill/) | 높음 |
| b13-bond-freeze | 강원도 레고랜드 ABCP 보증 채무 불이행 선언, 자금시장 경색 | 2022-09-28 선언, 10-05 최종 부도, 10-23 대책 | ABCP 2,050억 원. 정부 50조 원+ 유동성 프로그램(채안펀드 20조 등) | [다음(뉴스)](https://v.daum.net/v/20221023223607040), [파이낸셜뉴스](https://www.fnnews.com/listicle/legoland?page=2) | 높음 |
| b14-lcd-exit | TV용 LCD 가격 급락, LG디스플레이 국내 TV용 LCD 생산 중단 | 2022-10 실적 발표, 2022-12 파주 P7 중단 공시 | 2022년 3분기 영업손실 7,593억 원 | [데일리안](https://m.dailian.co.kr/news/view/1166562), [뉴데일리](https://biz.newdaily.co.kr/site/data/html/2022/10/27/2022102700207.html), [이투데이](https://www.etoday.co.kr/news/view/2185918) | 높음 |
| b15-bank-run | 실리콘밸리은행(SVB) 뱅크런과 폐쇄 | 인출 2023-03-09, 폐쇄 03-10 | 하루 420억 달러 인출(예금의 약 4분의 1). 금리 상승으로 채권 평가손 | [NPR](https://www.npr.org/2023/03/13/1163155347/svb-silicon-valley-bank-collapse-bailout-failure), [ICAEW](https://www.icaew.com/insights/viewpoints-on-the-news/2023/mar-2023/chart-of-the-week-silicon-valley-bank) | 높음 |
| b16-ai-chatbot | ChatGPT 공개 2개월 만에 월 이용자 1억 명 | 2023-02-01 보도 (공개 2022-11-30) | UBS 추정(시밀러웹 기반). "고대역폭 메모리 주문이 늘고 있다"는 2023년 상반기 업황 요약 | [Taipei Times(Reuters)](https://www.taipeitimes.com/News/biz/archives/2023/02/03/2003793608), [Cyprus Mail](https://cyprus-mail.com/2023/02/05/chatgpt-sets-record-for-fastest-growing-user-base) | 높음 (HBM 문장은 중간) |
| b17-solar-glut | 중국 공급 과잉, 태양광 모듈·폴리실리콘 가격 반 토막 | 2023 | 2023년 중국 폴리실리콘 -56.07%, 모노 PERC 모듈 -47.83% (OPIS). "국내 업체 가동 축소"는 구체 기업 수치 미확인 | [OPIS](https://www.opis.com/?p=25006), [pv magazine](https://www.pv-magazine-australia.com/2023/06/27/china-solar-module-prices-keep-diving) | 중간 |
| b18-short-ban | 공매도 전면 금지, 2차전지주 상한가 | 2023-11-05 의결, 11-06 시행 | 에코프로·에코프로비엠 상한가, 코스피 +5.66%, 코스닥 +7.34%. 금지 기간 2024-06 말까지 (본문 "내년 상반기까지") | [스마트투데이](https://www.smarttoday.co.kr/ko-kr/articles/37437), [주간경향](https://weekly.khan.co.kr/article/202311101702001) | 높음 |
| b19-value-up | 기업 밸류업 지원방안 발표 | 2024-02-26 | 자율 공시, 우수기업 세정지원 등 인센티브, 코스피 PBR 약 0.96~1.05배. 은행주가 대표 저PBR주로 발표 전부터 상승 | [비즈워치](https://news.bizwatch.co.kr/article/market/2024/02/26/0002), [딜사이트](https://dealsite.co.kr/articles/118725) | 높음 |
| b20-ramen-export | 라면 수출 연간 첫 10억 달러 돌파 | 2024-11-01 발표 (10월 누적) | 10월 누적 10억 2천만 달러, 2023년 연간 9억 5,200만 달러를 10개월 만에 넘음. 2025년 약 15.2~15.4억 달러 | [메트로서울](https://www.metroseoul.co.kr/article/20241105500585), [뉴시스](https://www.newsis.com/view/NISX20241101_0002943885), [아주경제](https://www.ajunews.com/view/20251218235714288) | 높음 (김·냉동 김밥 수출 증가는 중간) |
| b21-transformer | AI 데이터센터·전력망 교체로 변압기 주문 폭주 | 2024 ~ 2025 (흐름) | 미국 변압기 납기 1년 안팎 → 3~4년, HD현대일렉트릭 수주 잔고 약 9.7조 원(2025-3Q), LS일렉트릭·HD현대일렉 "5년치 일감" | [다음(한경)](https://v.daum.net/v/20250116175702610), [다음](https://v.daum.net/v/20251112065113845), [머니투데이방송](https://news.mtn.co.kr/news-detail/2026070311081899237) | 중간 (특정 일자 사건이 아니라 흐름) |
| b22-tariff-shock | 미국 상호관세 발표(기본 10%, 한국 25%), 수입차 25% | 2025-04-02 발표, 자동차 04-03 시행 | 한국 25% (일부 자료는 부속서 기준 26%로 표기). 이후 04-07 세계 증시 급락 | [KEIA](https://keia.org/the-peninsula/the-order-and-chaos-surrounding-u-s-south-korea-tariff-negotiations/), [KPMG](https://kpmg.com/av/fr/avocats/eclairages/2025/04/liberation-day-or-escalation-day.html) | 높음 (25%/26% 표기 차이 있음) |
| b23-index-4000 | 코스피 사상 첫 4,000 돌파 | 2025-10-27 | 종가 4,042.83 (+2.57%), 연간 상승률 약 64%로 주요국 1위, 삼성전자 첫 10만 원대(종가 10만 2천 원). 이후 2026-02-25 6,000 돌파 | [뉴시스](https://mobile.newsis.com/view/NISX20251027_0003378556), [뉴시스(수익률)](https://mobile.newsis.com/view/NISX20251027_0003377713), [헤럴드경제](https://www.heraldk.com/article/2025102618174532201) | 높음 |
| b24-strait-closed | 미국·이스라엘-이란 전쟁으로 호르무즈 해협 통행 사실상 중단 | 2026-02 말 ~ 03 초 (개전일 출처별 차이) | 03-09 브렌트 아시아 거래 약 +24%(약 114.74달러), 코스피 03-09 -8% 이상(매매 일시 정지), 같은 주 서킷브레이커 | [Capital FM](https://capitalfm.africa/stock-markets-slump-as-oil-prices-surge-over-strait-of-hormuz-fears/), [Gulf News](https://gulfnews.com/business/energy/amid-tanker-squeeze-in-hormuz-oil-prices-spike-as-iranus-war-chokes-global-supply-markets-on-edge-1.500463748), [아시아경제(영문)](https://view.asiae.co.kr/en/article/2026030309573480224) | 중간 (개전일·수치가 출처마다 조금씩 다름) |

## 2. 스토리 13개

| 스토리 | 뉴스 | 사실 주장 | 실제 날짜 | 근거 | 출처 | 확신도 |
|---|---|---|---|---|---|---|
| s01 백신 (opener) | 잠정 | 백신 3상 중간 결과 임박, 개발사 "초기 지표 양호" | 2020-11 초 | 발표 직전 분위기 요약. 개발사의 정확한 발언은 미확인 | 출처 추가 필요 | 중간 |
| | 결과(실제) | 화이자·바이오엔테크 백신 예방 효과 90% 이상 | 2020-11-09 | 미국 항공주 10~15%↑, IAG +39%, 대한항공 장중 +23.6%(종가 +11.2%) | [AirlineRatings](https://www.airlineratings.com/articles/covid-vaccine-news-sends-airlines-soaring), [Business Standard](https://www.business-standard.com/amp/article/markets/pfizer-s-covid-vaccine-effectiveness-claims-inject-hope-lift-global-stocks-120111000045_1.html) | 높음 |
| | 결과(**가상**) | 효과 미달, 승인 지연 | — | **사실 아님** | — | 가상 |
| s02 미국 금리 (opener) | 잠정 | 미국 CPI 8.6%, 큰 폭 인상 관측 | 2022-06-10 ~ 06-14 | 5월 CPI 8.6%(1981년 이후 최고). 발표 뒤 75bp 확률 90% 넘게 반영 | [Central Banking](https://www.centralbanking.com/central-banks/monetary-policy/monetary-policy-decisions/7949506/fed-meets-inflation-surge-with-75bp-hike), [Bondblox](https://bondblox.com/news/fed-hikes-by-75bp-indicates-50-75bp-hike-in-july) | 높음 |
| | 결과(실제) | 연준 75bp 인상(1.50~1.75%) | 2022-06-15 | 1994년 이후 최대 폭(28년 만) | 같은 출처 | 높음 |
| | 결과(**가상**) | 금리 동결 | — | **사실 아님** | — | 가상 |
| s03 스테이블코인 | 잠정 | 테라USD 1달러 이탈, 재단 "준비금 충분", 앵커 대규모 인출 | 2022-05-07 ~ 05-09 | LFG 비트코인 준비금 최대 80,394 BTC. "하루 수조 원 인출"은 앵커 예치금 감소 규모를 원화로 요약한 표현(정확한 일별 수치 미확인) | [Galaxy](https://galaxy.com/insights/research/examining-ust-collapse), [ForkLog](https://forklog.com/en/luna-foundation-guard-drains-3bn-from-reserve-to-rescue-ust/) | 중간 |
| | 결과(실제) | UST·루나 붕괴 | 2022-05-09 ~ 05-13 | UST 최저 약 0.045달러, 루나 사상 최고 119.51달러 → 사실상 0. "투자자 손실 수십조 원"은 두 코인 시가총액(약 400억 달러+) 기준 추정 | [CoinGecko](https://www.coingecko.com/learn/ust-depegged-terra-s-biggest-test), [Galaxy](https://galaxy.com/insights/research/examining-ust-collapse) | 높음 (손실 규모는 중간) |
| | 결과(**가상**) | 1달러 회복 | — | **사실 아님** | — | 가상 |
| s04 유럽 대형은행 | 잠정 | 크레디트스위스(1856년 설립) 주가 사상 최저, 주말 인수 중재 | 2023-03-15 ~ 03-18 | 03-17 시가총액 약 75억 프랑 | [CNBC](https://www.cnbc.com/amp/2023/03/19/ubs-agrees-to-buy-credit-suisse-as-regulators-look-to-shore-up-global-banking-system.html), [OCCRP](https://www.occrp.org/en/news/ubs-to-purchase-credit-suisse-for-32-billion) | 높음 |
| | 결과(실제) | UBS가 30억 프랑에 인수, SNB 최대 1,000억 프랑 유동성 | 2023-03-19 | 본문 "약 4조 원", "100조 원이 넘는"은 당시 환율(1프랑 ≈ 1,400원) 환산 | [WealthManagement(Bloomberg)](https://www.wealthmanagement.com/equities/ubs-to-buy-credit-suisse-in-3-3-billion-deal-to-end-crisis), [CNBC](https://www.cnbc.com/amp/2023/03/19/ubs-agrees-to-buy-credit-suisse-as-regulators-look-to-shore-up-global-banking-system.html) | 높음 |
| | 결과(**가상**) | 인수 무산, 파산 | — | **사실 아님** | — | 가상 |
| s05 체코 원전 (opener) | 잠정 | 서명 하루 전 브르노 지방법원 가처분(EDF 소송), 체코 정부·전력공사 항고 | 2025-05-06 ~ 06-03 | 서명식 무산 | [파이낸셜뉴스](https://www.fnnews.com/news/202505062115411611), [이투데이](https://www.etoday.co.kr/news/view/2472513) | 높음 |
| | 결과(실제) | 최고행정법원 가처분 취소, 두코바니 원전 2기 최종 계약 | 2025-06-04 | 사업비 약 4,000억 코루나(약 26.2조 원). UAE(2009) 이후 16년 만의 원전 수출 | [뉴시스](https://www.newsis.com/view/NISX20250604_0003202068), [이투데이](https://www.etoday.co.kr/news/view/2476423), [SBS Biz](https://biz.sbs.co.kr/amp/article/20000238624) | 높음 |
| | 결과(**가상**) | 계약 무산, 재입찰 | — | **사실 아님** | — | 가상 |
| s06 한미 관세 협상 (opener) | 잠정 | 부과 직전 협상 막판, 조선 협력(마스가) 제안, 미국 측 긍정 반응 | 2025-07-25 ~ 07-30 | "매우 흥미로운 제안"은 당시 보도된 미국 측 반응 요약(정확한 인용 미확인) | [다음(뉴스)](https://v.daum.net/v/20250731085103375) | 중간 |
| | 결과(실제) | 상호관세·자동차 25% → 15%, 대미 투자 3,500억 달러(조선 1,500억), 철강·알루미늄 50% 유지 | 2025-07-30 (국내 07-31) | 08-01 부과 하루 전 타결. 이후 10월 APEC에서 세부 이행 합의 | [전북일보](https://www.jjan.kr/articleAmp/20250731580099), [SBS Biz](https://biz.sbs.co.kr/amp/article/20000250561), [뉴시스](https://www.newsis.com/view/NISX20250731_0003273280) | 높음 |
| | 결과(**가상**) | 협상 결렬, 25% 발효 | — | **사실 아님** | — | 가상 |
| s07 중국 단체관광 | 잠정 | 단체관광 허용국 확대 검토, 한국 포함 관측 | 2023-08 초 | 검토 단계 보도의 정확한 일자는 미확인 | 출처 추가 필요 | 중간 |
| | 결과(실제) | 한국 포함 78개국 단체관광 허용 | 2023-08-10 | 2017-03 이후 6년 5개월 만. 면세·카지노·항공 주가 강세 (이후 실제 단체 관광객 회복은 더딤) | [아주경제](https://www.ajunews.com/view/20230827103703303), [시대일보](https://www.sidae.com/article/2023081015222252013) | 높음 |
| | 결과(**가상**) | 한국 제외 | — | **사실 아님** | — | 가상 |
| s08 AI 칩 실적 (opener) | 잠정 | 엔비디아 실적 발표 전 데이터센터 주문 폭주, HBM 증설 | 2023-05 | 실적 전 분위기 요약 | 출처 추가 필요 | 중간 |
| | 결과(실제) | 엔비디아 2분기 매출 전망 약 110억 달러(예상 약 71.5~72억 달러, 50% 이상 상회) | 2023-05-24 (주가 05-25) | 시간외 +28%, 05-25 장중 약 +26%. **종가 등락률(본문 "25% 가까이")은 출처로 확인 못 함** (약 +24%로 알려짐) | [Shacknews](https://shacknews.com/article/135644/nvidia-nvda-stock-rise-q2-2024-forecast), [WION](https://embed.wionews.com/business-economy/us-chipmaker-nvidia-on-the-brink-of-crossing-1-trillion-market-value-596624), [Nasdaq](https://www.nasdaq.com/articles/why-nvidia-surged-36.3-in-may) | 중간 |
| | 결과(**가상**) | 실적 실망, AI 거품 논란 | — | **사실 아님** | — | 가상 |
| s09 한국 기준금리 인하 | 잠정 | 9월 소비자물가 1.6%(3년 7개월 만 최저, 1%대는 3년 반 만), 총재 인하 여건 언급 | 2024-10-02 ~ 10-10 | 총재 발언은 결정 당일 발언과 섞여 있음. 집값·가계부채 우려는 사실 | [아주경제](https://www.ajunews.com/view/20241002081407786), [서울신문](https://m.seoul.co.kr/news/2024/10/03/20241003014008) | 중간 |
| | 결과(실제) | 기준금리 3.50% → 3.25% | 2024-10-11 | 2021-08 이후 3년 2개월 만의 통화정책 전환. 11-28 3.00%로 추가 인하 | [토스뱅크](https://www.tossbank.com/articles/interestratecut), [전북일보](https://www.jjan.kr/article/20241011580049) | 높음 |
| | 결과(**가상**) | 금리 동결 | — | **사실 아님** | — | 가상 |
| s10 OPEC+ 감산 | 잠정 | 회의 앞두고 100만 배럴 이상 감산 보도, 미국 증산 요구 | 2022-10-03 ~ 10-04 | 이틀간 WTI +8.8%, 브렌트 +7.8% | [Iowa Farm Bureau](https://www.iowafarmbureau.com/Article/OPEC-Announces-Oil-Production-Cut-of-Two-Million-Barrels-per-Day), [Arab News](https://arab.news/m78nb) | 높음 |
| | 결과(실제) | 하루 200만 배럴 감산 합의 | 2022-10-05 | 2020년 이후 최대 감산(실제 감소분 추정 80만~110만 배럴), 브렌트 약 92달러 | [Arab News](https://arab.news/m78nb), [CME](https://www.cmegroup.com/newsletters/dme-report/2022-october-dme-insights-report.html) | 높음 |
| | 결과(**가상**) | 감산 보류, 80달러 아래 | — | **사실 아님** | — | 가상 |
| s11 폴란드 방산 수출 | 잠정 | 폴란드 국방장관, 한국산 전차·자주포 신속 도입 발언 | 2022-07 | 정확한 발언 일자·인용 미확인 | 출처 추가 필요 | 중간 |
| | 결과(실제) | K2 전차 980대·K9 자주포 648문·FA-50 48대 기본계약 | 2022-07-27 (1차 실행계약 08-26) | 1차 실행계약 57.6억 달러(약 7.7조 원, K2 180대·K9 48문). 업계 추산 총 148억 달러. 일부 현지 생산 | [세계일보](https://www.segye.com/newsView/20220727525241), [뉴데일리](https://biz.newdaily.co.kr/site/data/html/2022/07/28/2022072800013.html), [파이낸셜뉴스](https://www.fnnews.com/news/202208270134028763) | 높음 |
| | 결과(**가상**) | 다른 나라 전차 선택 | — | **사실 아님** | — | 가상 |
| s12 감염병 비상사태 해제 (opener) | 잠정 | WHO 긴급위원회 회의, 사망자 급감 | 2023-05-04 | 주간 사망자 2021-01 10만 명대 → 2023-04 말 약 3,500명(약 3%) | [OPB(NPR)](https://opb.org/article/2023/05/05/who-ends-global-health-emergency-declaration-for-covid-19), [Down To Earth](https://www.downtoearth.org.in/news/health/who-ends-covid-19-global-health-emergency-bringing-one-of-human-history-s-most-painful-periods-to-a-close-89158) | 높음 |
| | 결과(실제) | WHO 코로나19 국제 공중보건 비상사태 해제 | 2023-05-05 | 2020-01-30 선언 이후 3년 3개월. 국내는 2023-06-01 위기단계 하향, 확진자 격리 7일 의무 → 5일 권고 (국내 조치는 별도 출처 미첨부) | 같은 출처 | 높음 (국내 조치는 중간) |
| | 결과(**가상**) | 비상사태 유지 | — | **사실 아님** | — | 가상 |
| s13 중국 부동산 개발사 | 잠정 | 헝다 달러채 이자 미지급, 유예 기간, 공사 중단 | 2021-09 ~ 12-06 | 부채 약 3,000억 달러(본문 "300조 원 넘는"). 11-06 쿠폰 미지급, 유예 12-06 종료 | [Business Standard](https://www.business-standard.com/amp/article/international/evergrande-kaisa-cut-by-fitch-to-default-after-missed-pay-deadlines-121120900707_1.html) | 높음 |
| | 결과(실제) | 피치, 헝다·카이사 '제한적 디폴트(RD)' | 2021-12-09 | 미지급 쿠폰 약 8,250만 달러 | [Business Today](https://www.businesstoday.in/latest/corporate/story/fitch-downgrades-evergrande-kaisa-to-restricted-default-after-missed-pay-deadlines-314981-2021-12-09), [The Real Deal](https://therealdeal.com/la/2021/12/09/evergrande-defaults-for-first-time/) | 높음 |
| | 결과(**가상**) | 당국 개입 채무 재조정 | — | **사실 아님** | — | 가상 |

## 3. 테마·종목 메모

- 테마 36개: 주요 24 / 배경 12, 분위기 긍정 13 / 부정 13 / 중립 10. 각 테마의 존재 근거는 JSON `existsEvidence`에 한 줄씩 적었다 (위 표의 출처로 대부분 뒷받침됨).
- 분위기 판단: 여행은 2020~2022년 붕괴 뒤 2023년 이후 회복해 **중립**, 자동차(전기차)는 반도체 대란·미국 보조금 제외·관세·유가로 나쁜 소식이 많아 **부정**으로 두었다 (작성 중 뉴스 구성에 맞춰 바꿈).
- (16차에 모든 종목명의 브랜드를 순우리말로 바꿈: README 129번. 아래 두 줄은 그 전 기록.) 종목명은 "지어낸 외래어풍 브랜드 + 쉬운 한국어 업종어" 형식 (예: 케일론반도체, 네레아조선, 티카코인거래소). 2000년대 브랜드 41개와 겹치지 않고, 같은 시기에 작성된 2010년대 파일(`2010s.json`)의 브랜드와도 겹치지 않게 확인했다 (미라벨여행 → 제피르여행으로 바꿈: 2010년대 '미라엔터'와 비슷해서).
- 실존 기업과 겹칠 수 있어 바꾼 이름: 이리스철강 → 세르카철강 (가전 기업 '아이리스'와 비슷해서). 그 밖의 브랜드는 국내에서 잘 알려진 실존 기업명과 일치하지 않는 것으로 판단했다 (상표 검색까지는 하지 않음).

## 4. 검증하면서 바꾼 점 (데이터에 반영함)

1. **b20 라면 수출**: 처음 구상한 "12억 달러, 10년 연속 최대"는 출처가 맞지 않아 "처음으로 10억 달러 돌파, 열 달 만에 지난해 실적 추월"로 고쳤다.
2. **b04 LNG선**: 정식 발주가 아니라 슬롯(건조 공간) 계약이라 제목·본문을 "건조 예약"으로 썼다.
3. **s11 폴란드**: "124억 달러" 대신 확인된 1차 실행계약 57.6억 달러(약 7.7조 원)를 "7조 원이 넘는다"로 썼다.
4. **s12 비상사태 해제**: 국내 입국 후 검사는 이미 2022-10에 폐지돼 "입국 검사도 없어진다"는 문장을 빼고 "격리 의무가 권고로 바뀐다"만 남겼다.
5. **b06 운하**: 대기 선박은 출처별로 367~422척이라 "수백 척"으로 썼다.
6. 근거 메모(`source.event`)와 테마 근거(`existsEvidence`)에서 실명(기업·지수·인물·기관·무기 제품명)을 모두 뺐다. 실명은 이 문서에만 있다.

## 5. 직접 확인 권장

- s01·s07·s08·s11 잠정 뉴스의 세부 정황(개발사 발언, 중국 검토 보도 일자, 실적 전 주문 보도, 국방장관 발언)은 출처 미확보. s06의 "매우 흥미로운 제안" 인용도 원문 미확인.
- s08 결과의 엔비디아 2023-05-25 **종가 등락률**(본문 "25% 가까이"): 장중 약 26%·시간외 28%까지만 확인.
- b24 중동 전쟁: 개전일(2월 말/3월 초)과 3월 초 유가·지수 수치가 출처마다 조금씩 다르다. 최근 사건이라 후속 보도로 다시 확인 권장.
- b05 "중고차 값 상승", b17 "국내 업체 가동 축소", b20 "김·냉동 김밥 수출 증가", b16 "고대역폭 메모리 주문 증가"는 당시 흐름 요약이며 구체 수치 출처를 붙이지 않았다.
- s03 "하루 수조 원 인출", "투자자 손실 수십조 원"은 규모 요약이다 (정확한 수치 미확인).
- 대부분 뉴스의 "국내 관련 업종 주가 등락 폭"은 찾지 못했다. 현재 영향도는 사건 규모에 따른 판단값이다.

---

## 6. 추가 속보 22개 (b25~b46, 2026-10-11)

뉴스 간격이 3~4분으로 줄어 시대당 뉴스가 약 34개로 늘었기 때문에 풀을 넓혔다. 영향도는 공식 그대로(±1 조정 없음), 규모는 밸런스 점검 뒤 정한 값이다.

| 뉴스 ID | 사실 주장(사건) | 실제 날짜 | 근거 수치 | 출처 | 확신도 |
|---|---|---|---|---|---|
| b25-oil-below-zero | WTI 5월물 선물 사상 첫 마이너스 | 2020-04-20 | 종가 -37.62달러(본문 "마이너스 37달러"), 장중 -40.32달러, 저장 공간(쿠싱) 부족 | [CRS(의회조사국)](https://www.everycrsreport.com/reports/IN11354.html), [OGJ](https://www.ogj.com/general-interest/economics-markets/article/14174443/wti-plunges-into-negative-territory) | 높음 |
| b26-online-shopping | 2020년 온라인쇼핑 거래액 사상 최대, 음식 배달 급증 | 2020 연간 (2021-02 통계청 발표) | 161조 1,234억 원(+19.1%), 음식서비스 17.4조(+78.6%), 여행·교통 -53.3%, 문화·레저 -69.3% (2023년 표본 개편 전 수치) | [뉴시스](https://mobile.newsis.com/view/NISX20210804_0001536798), [뉴데일리](https://biz.newdaily.co.kr/site/data/html/2021/02/03/2021020300128.amp.html) | 높음 |
| b27-cinema-empty | 2020년 극장 관객 70% 넘게 감소 | 2020 연간 (2021-02 영진위 결산) | 5,952만 명(-73.7%), 2004년 통합전산망 이후 최저, 매출 5,104억 원(-73.3%). "대작 개봉 연기·스트리밍 직행"은 당시 흐름 요약 | [데일리안](https://www.dailian.co.kr/news/view/965692/), [더팩트](https://news.tf.co.kr/read/ogmeta/1834461.htm) | 높음 (스트리밍 직행 문장은 중간) |
| b28-zero-rate | 미 연준 제로 금리 긴급 인하, 한은 임시 금통위 0.5%p 인하로 첫 0%대 | 2020-03-15 (미국), 03-16 (한국) | 연준 0~0.25%, 한은 1.25% → 0.75%(사상 첫 0%대, 2008-10 이후 첫 임시 금통위 인하) | [뉴시스](https://www.newsis.com/view/NISX20200316_0000957725), [서울신문](https://m.seoul.co.kr/news/2020/03/17/20200317001026), [아주경제](https://www.ajunews.com/view/20200316161324639) | 높음 |
| b29-container-rates | 컨테이너 운임(SCFI) 연속 사상 최고, 컨테이너·선복 부족 | 2021-05 ~ 12 | 05-14부터 20주 연속 최고, 12월 초 4,727, 2021 평균 3,792, 2022-01 정점 5,110. "물류비 몇 배"는 흐름 요약 | [트레드링스](https://www.tradlinx.com/blog/?p=5037), [뉴시스](https://mobile.newsis.com/view/NISX20210623_0001487192), [뉴스토마토](https://newstomato.com/ReadNews.aspx?no=1161759) | 높음 |
| b30-urea-shortage | 중국 요소 수출 검사 의무화로 국내 요소수 품귀 | 2021-10-15 (중국 조치) ~ 11 (국내 품귀) | 산업용 요소 중국 의존 97%(1~9월), 군 수송기로 호주산 요소수 2만 L 긴급 수입. 국내 화학 업체 요소수 관련주 상승은 당시 보도 흐름 | [뉴데일리](https://biz.newdaily.co.kr/site/data/html/2021/11/10/2021111000040.html), [아시아경제](https://view.asiae.co.kr/article/2021110418341620231), [트레드링스](https://www.tradlinx.com/blog/?p=4579) | 중간 (원인 설명은 출처마다 다름) |
| b31-city-lockdown | 상하이 전면 봉쇄 약 2개월 | 2022-03-28 ~ 06-01 | 푸둥 03-28, 푸시 04-01, 06-01부터 단계적 해제. 상하이항은 축소 운영, 트럭 운송 급감. 국내 화장품·면세 매출 감소는 당시 흐름 요약 | [gCaptain](https://gcaptain.com/shanghai-faces-long-road-to-recovery-as-lockdown-lifts/), [Hellenic Shipping News](https://www.hellenicshippingnews.com/?p=927947), [Port Technology](https://porttechnology.org/news/supply-chain-pressure-amounts-as-shanghai-extends-lockdown) | 높음 (국내 업종 영향은 중간) |
| b32-won-1400 | 원·달러 환율 13년 6개월 만에 1,400원 돌파 | 2022-09-22 | 종가 1,409.7원(+15.5원), 연준 세 번째 0.75%p 인상 직후, 외환위기·금융위기 이후 세 번째 | [뉴시스](https://mobile.newsis.com/view/NISX20220922_0002022958), [뉴시스(전망)](https://www.newsis.com/view/NISX20220922_0002023489) | 높음 |
| b33-mutual-run | 새마을금고 연체율 급등·예금 인출, 정부 합동 브리핑 "전액 보장" | 2023-07 (07-06 합동 브리핑) | 7월 중도해지 정기예적금 41.7만 건(전년 2배), 합병 시 5,000만 원 넘는 예금도 보장 | [서울신문](https://m.seoul.co.kr/news/2023/07/06/20230706500043), [KB Think](https://kbthink.com/main/economy/market-analysis/Issue-analysis/series1-230710.html), [파이낸셜뉴스](https://www.fnnews.com/news/202511050552489017) | 높음 |
| b34-ramen-price-cut | 정부 압박에 신라면 출고가 13년 만에 인하, 업계 동참 | 2023-06-27 발표 (07-01 시행) | 농심 신라면 4.5%·새우깡 6.9%, 삼양 12개 제품 평균 4.7%, 오뚜기 15개 제품 평균 5% | [뉴시스](https://www.newsis.com/view/NISX20230628_0002356173), [한국경제](https://www.hankyung.com/amp/2023062781791) | 높음 |
| b35-water-release | 후쿠시마 처리수 해양 방류 시작, 중국 일본산 수산물 전면 수입 금지 | 2023-08-24 | 중국 즉시 전면 금지(WTO 통보). 국내 소금 사재기는 방류 전(2023-06) — 본문도 "방류를 앞두고"로 씀. 방사능 검사 확대는 당시 정부 발표 흐름 | [파이낸셜뉴스](https://www.fnnews.com/news/202308261027427567), [경향신문](https://www.khan.co.kr/article/202309021733001) | 높음 (국내 소비 위축 정도는 중간) |
| b36-rare-metal-curb | 중국 갈륨·게르마늄 수출 허가제 | 2023-07-03 발표, 08-01 시행 | 갈륨·게르마늄 금속과 화합물 12종, 2022년 세계 갈륨 생산의 약 98%가 중국(USGS) | [Mondaq](https://mondaq.com/china/export-controls-trade-investment-sanctions/1340828/china-places-export-controls-on-raw-materials-used-in-semiconductor-manufacturing), [Internet Governance Project](https://www.internetgovernance.org/2023/07/17/what-will-chinas-new-export-controls-achieve/) | 높음 |
| b37-laver-export | 김 수출 연간 첫 1조 원 돌파 | 2023 연간 (12-20 1조 원 돌파) | 7억 9천만 달러(약 1조 332억 원, +22.2%), 120여 개국. 2024년 9.97억 달러, 2025년 첫 10억 달러. 수출 증가에 따른 국내 김값 상승은 2024년에 두드러짐 | [SBS Biz](https://biz.sbs.co.kr/amp/article/20000155590), [메트로서울](https://www.metroseoul.co.kr/article/20240107500205), [한국경제](https://www.hankyung.com/amp/2025110309541) | 높음 (김값 문장은 중간) |
| b38-builder-workout | 시공능력 16위 태영건설 워크아웃 신청 | 2023-12-28 | 보증 PF 대출 잔액 약 4.4조 원(3분기 말, 한투 보고서), 정부 공식 우발채무 3.7조 원 — 본문은 "수조 원" | [한국경제](https://www.hankyung.com/amp/2023122867595), [뉴시스](https://www.newsis.com/view/NISX20231228_0002573621), [딜사이트](https://dealsite.co.kr/articles/115459) | 높음 |
| b39-obesity-drug | 노보노디스크 시가총액이 LVMH 추월(유럽 1위), 월마트 "GLP-1 고객 구매 감소" | 2023-09-01 (시총), 2023-10-04 (월마트) | 시총 약 4,250억 달러 vs 약 4,200억 달러(일시적 역전, 날짜는 출처별 하루 차이). 월마트 "slight pullback in overall basket" | [Fortune](https://fortune.com/2023/09/01/ozempic-novo-nordisks-lvmh-most-valuable-european-company), [Bloomberg](https://www.bloomberg.com/news/articles/2023-09-01/novo-nordisk-briefly-overtakes-lvmh-as-biggest-european-company), [NBC News](https://www.nbcnews.com/business/consumer/ozempic-drug-users-are-buying-less-food-walmart-says-rcna119000) | 높음 ("국내 바이오 신약 개발 속도"는 흐름 요약) |
| b40-ev-chasm | 전기차 캐즘으로 배터리 3사 실적 부진 | 2024 | LG에너지솔루션 1분기 영업이익 약 -75%, SK온 2분기 11분기 연속 적자(손실 4,601억 원), 삼성SDI 2분기 -37.8%. "하이브리드 확대"는 업계 흐름 | [다음(이데일리)](https://v.daum.net/v/20240430131458976), [다음](https://v.daum.net/v/20240801163021987), [더팩트](https://news.tf.co.kr/read/economy/2289066.htm) | 높음 |
| b41-carry-crash | 엔캐리 청산·미국 고용 부진에 아시아 증시 폭락 | 2024-08-05 | 코스피 -8.77%(2,441.55, 역대 최대 하락 폭), 코스닥 -11.30%, 양 시장 서킷브레이커, 닛케이 -12.4% | [아이뉴스24](https://www.inews24.com/view/1749768), [CS Monitor](https://csmonitor.com/World/2024/0806/stock-market-recession-carry-trade), [MUFG Research](https://mufgresearch.com/fx/asia-fx-talk-will-the-great-unwind-continue-6-aug-2024/) | 높음 |
| b42-navy-repair | 한화오션, 국내 최초 미 해군 함정 MRO 수주 | 2024-08 | 군수지원함 월리 쉬라함. 2023-07 MSRA 체결, 2024-11 두 번째(급유함) 수주. "한 해 20조 원 규모"는 함정 정비 시장 145억 달러 추정 환산 | [다음](https://v.daum.net/v/20240816003116392), [뉴시스](https://mobile.newsis.com/view/NISX20241112_0002956435), [JoongAng Daily](https://www.koreajoongangdaily.com/business/145/11792757) | 높음 (시장 규모는 중간) |
| b43-mill-closure | 포스코 포항 1선재공장 폐쇄 | 2024-11-19 (07월 1제강공장 폐쇄 뒤 넉 달여) | 45년 가동, 중국 선재 생산능력 약 1.4억 톤 vs 세계 수요 약 0.9억 톤. "반덤핑 관세 요청"은 업계 흐름(2024~2025 중국산 후판 반덤핑 제소) | [비즈워치](https://news.bizwatch.co.kr/article/industry/2024/11/20/0009), [주간경향](https://weekly.khan.co.kr/article/202412020600051), [뉴스핌](https://newspim.com/news/view/20241120000774) | 높음 |
| b44-steel-tariff | 미국 철강·알루미늄 관세 25% → 50% | 2025-06-04 (06-03 포고문) | 파생 상품은 철강·알루미늄 함량에 부과, 영국만 25% 유지 | [Steptoe](https://www.steptoe.com/en/news-publications/global-trade-and-investment-law-blog/president-trump-increases-steel-and-aluminum-tariffs-to-50.html), [MFAT(뉴질랜드)](https://www.mfat.govt.nz/en/trade/mfat-market-reports/us-trade-update-increase-to-steel-and-aluminium-tariffs-june-2025), [Barnes & Thornburg](https://laborandemployment.btlaw.com/post/102kdl2/u-s-doubles-tariffs-on-steel-and-aluminum) | 높음 |
| b45-missile-export | 천궁-II 10개 포대 사우디 수출 계약 공개 | 2024-02-06 공개 (계약 2023-11) | 32억 달러(LIG넥스원 공시 약 4조 3,398억 원), 2022-01 UAE(35억 달러)에 이어 두 번째 중동 수출 | [세계일보](https://www.segye.com/newsView/20240206517943), [뉴데일리](https://www.newdaily.co.kr/site/data/html/2024/02/07/2024020700083.amp.html) | 높음 |
| b46-visa-free-tour | 중국 단체관광객 15일 무비자 입국 시행 | 2025-09-29 (2026-06-30까지) | 전담 여행사 모객 3인 이상, 첫날 명동 면세점 붐빔. 면세점 주가 수치는 찾지 못함 | [뉴시스](https://www.newsis.com/view/NISX20250929_0003349027), [SBS Biz](https://biz.sbs.co.kr/amp/article/20000251719), [다음](https://v.daum.net/v/20250908134913391) | 높음 (주가 반응은 미확인) |

## 7. 추가 스토리 8개 (s14~s21, 2026-10-11)

| 스토리 | 뉴스 | 사실 주장 | 실제 날짜 | 근거 | 출처 | 확신도 |
|---|---|---|---|---|---|---|
| s14 한미 통화스와프 (opener) | 잠정 | 환율 하루 40원 상승, 코스피 -8%대, 정부 "통화스와프 긴밀히 논의" | 2020-03-19 (장중) | 1,285.7원(+40원), 코스피 -8.39%. 정부 발언 문구는 당시 보도 흐름 요약(정확한 인용 미확인) | [머니투데이](https://www.mt.co.kr/economy/2020/03/19/2020031922462010005), [데일리안](https://m.dailian.co.kr/news/view/877759) | 중간 |
| | 결과(실제) | 한은-연준 600억 달러 통화스와프 체결 | 2020-03-19 체결, 시장 반영 03-20 | 최소 6개월(이후 3차례 연장, 2021-12 종료), 03-20 코스피 +7.4%, 환율 1,246.5원(-39.2원) | [머니투데이](https://www.mt.co.kr/economy/2020/03/19/2020031922462010005), [매일신문](https://www.imaeil.com/page/view/2020032022025247391) | 높음 |
| | 결과(**가상**) | 통화 협정 불발, 1,300원 돌파 | — | **사실 아님** | — | 가상 |
| s15 코인 거래소 파산 (opener) | 잠정 | FTX 대규모 인출, 바이낸스 인수 의향서 "실사 후 철회 가능", 고객 자금 유용 보도 | 2022-11-06 ~ 11-08 | 72시간 인출 약 60억 달러(본문 "수조 원") | [Axios](https://www.axios.com/2022/11/09/binance-walks-away-ftx), [Fortune](https://fortune.com/2022/11/09/binance-ftx-deal-called-off-crypto-mergers) | 높음 |
| | 결과(실제) | 바이낸스 인수 철회, FTX 파산 신청 | 2022-11-09 (철회), 11-11 (파산) | 130여 개 계열 법인 파산 신청, 고객 자금 수십억 달러 부족(추정치 출처별 차이), 비트코인 2년 만의 최저 | [TechCrunch](https://techcrunch.com/2022/11/11/ftx-files-for-bankruptcy-ceo-sam-bankman-fried-steps-down/), [Axios](https://www.axios.com/2022/11/09/binance-walks-away-ftx) | 높음 ("게임 코인 폭락"은 당시 흐름, 중간) |
| | 결과(**가상**) | 인수 성사, 시장 진정 | — | **사실 아님** | — | 가상 |
| s16 한국 빅스텝 | 잠정 | 6월 물가 6%대(외환위기 이후 처음), 사상 첫 0.5%p 인상 관측 | 2022-07-05 ~ 07-12 | 6월 소비자물가 6.0%. 총재 "물가 우선" 발언은 당시 흐름 요약 | [이코노미스트](https://economist.co.kr/article/view/ecn202207130029), [더팩트](https://news.tf.co.kr/read/ogmeta/1951388.htm) | 중간 |
| | 결과(실제) | 기준금리 1.75% → 2.25%, 사상 첫 빅스텝 | 2022-07-13 | 0.25%p 오를 때마다 가계 이자 부담 연 약 3.3조 원 증가 추산, 은행 예금 금리 즉시 인상 | [이코노미스트](https://economist.co.kr/article/view/ecn202207130029), [딜사이트](https://dealsite.co.kr/articles/89282), [노컷뉴스](https://nocutnews.co.kr/news/5761336) | 높음 |
| | 결과(**가상**) | 0.25%p 인상에 그침 | — | **사실 아님** | — | 가상 |
| s17 미국 빅컷 | 잠정 | 고용 둔화, 첫 인하 기정사실, 회의 직전 0.5%p 쪽 우세 | 2024-09-16 ~ 09-17 | FedWatch 09-16 기준 50bp 약 52% vs 25bp 약 48% (2차 출처 집계) | [LongPort(FedWatch 인용)](https://longportapp.cn/news/214386602), [Columbia Business School](https://business.columbia.edu/insights/finance-economics/analyzing-feds-rationale-behind-half-point-rate-cut) | 중간 (확률 수치는 2차 출처) |
| | 결과(실제) | 연준 0.5%p 인하(4.75~5.00%), 2020-03 이후 첫 인하 | 2024-09-18 | 11대 1 표결, 점도표 연내 0.5%p 추가 인하 시사. "바이오 등 성장주 강세"는 국내 흐름 요약(구체 수치 미확인) | [Times of Israel](https://www.timesofisrael.com/liveblog_entry/us-fed-makes-larger-half-point-cut-in-first-rate-reduction-since-2020/), [Bankrate](https://www.bankrate.com/banking/federal-reserve/fed-meeting-news-today-september-2024) | 높음 (성장주 문장은 중간) |
| | 결과(**가상**) | 0.25%p 인하에 그침 | — | **사실 아님** | — | 가상 |
| s18 MSCI 관찰대상국 | 잠정 | 공매도 재개(2025-03-31) 뒤 관찰대상국 기대, MSCI는 외환시장·규제 변화 지적 | 2025-06 (발표 직전) | MSCI가 이전 리뷰부터 지적해 온 항목 요약 | [뉴시스](https://www.newsis.com/view/NISX20250625_0003227157), [YTN](https://www.ytn.co.kr/_ln/0104_202506250620595267) | 중간 |
| | 결과(실제) | 관찰대상국 등재 불발 | 2025-06-24 (한국 시간 06-25) | 공매도 접근성은 개선 평가, 외환시장·규제 불확실성 등 남음. 편입 시 약 292억 달러(약 44조 원) 유입 추정은 2026년 기사 수치. 2026-06에도 불발 | [SBS Biz](https://biz.sbs.co.kr/amp/article/20000242549), [한국경제](https://www.hankyung.com/article/2025062577387), [헤럴드경제(2026)](https://www.heraldk.com/article/2026062316343179318) | 높음 |
| | 결과(**가상**) | 관찰대상국 첫 등재 | — | **사실 아님** | — | 가상 |
| s19 애플카 협상설 | 잠정 | 애플-현대차·기아 전기차 협력설로 주가 급등, 애플 비밀주의·하청 우려 | 2021-01-08 ~ 02-06 | 01-08~02-05 개인 기아 862만 주 순매수 | [뉴시스](https://mobile.newsis.com/view/NISX20210208_0001333880), [경향신문](https://www.khan.co.kr/article/202102071705001/amp) | 높음 |
| | 결과(실제) | 현대차·기아 "애플과 자율주행차 협의 안 함" 공시 | 2021-02-08 | 기아 -14.98%, 현대차 -6.21%, 그룹 5개사 시총 약 13.5조 원 감소 | [경향신문](https://www.khan.co.kr/article/202102081653001), [뉴시스](https://www.newsis.com/view/NISX20210208_0001333880) | 높음 |
| | 결과(**가상**) | 위탁 생산 계약 체결 | — | **사실 아님** | — | 가상 |
| s20 미중 제네바 회담 | 잠정 | 미중 첫 고위급 무역 회담, "상당한 진전", "건설적" | 2025-05-10 ~ 05-11 | 회담 직후 양측 발언 | [ETV Bharat](https://www.etvbharat.com/en/!international/us-china-trade-talks-in-geneva-switzerland-enn25051200617), [Geneva Solutions](https://genevasolutions.news/sustainable-business-finance/united-states-and-china-reach-trade-truce-in-geneva) | 높음 |
| | 결과(실제) | 상호 관세 115%p 인하, 90일 유예 | 2025-05-12 (05-14 발효) | 미국 145% → 30%, 중국 125% → 10%, 세계 증시 상승. "물동량 다시 증가"는 이후 컨테이너 예약 증가 보도 흐름 요약 | [Boston.com(AP)](https://www.boston.com/news/politics/2025/05/12/us-china-tariffs/), [Khaosod(AP)](https://www.khaosodenglish.com/news/international/2025/05/12/us-and-china-agree-to-pause-sky-high-tariffs-for-90-days/) | 높음 (물동량 문장은 중간) |
| | 결과(**가상**) | 회담 결렬 | — | **사실 아님** | — | 가상 |
| s21 중국 리오프닝 | 잠정 | 봉쇄 항의 시위 확산, 대도시 PCR 완화, 쑨춘란 "병원성 약화" | 2022-11-26 ~ 12-06 | 우루무치 화재 뒤 여러 도시 항의, 11-30 쑨춘란 부총리 발언 | [Deccan Herald(Reuters)](https://www.deccanherald.com/amp/story/world%2Fchinese-make-travel-plans-as-covid-rules-ease-further-1175459.html), [뉴스토마토](https://newstomato.com/ReadNews.aspx?no=1165159) | 중간 (부총리 발언 출처 미첨부) |
| | 결과(실제) | 방역 추가 최적화 10개 조치, 제로 코로나 사실상 폐기 | 2022-12-07 (2023-01-08 입국 격리 폐지) | 상시 PCR·건강코드 폐지, 지역 이동 음성 증명 폐지. 아모레퍼시픽 11-04~12-07 +23.29%, 연말 항공·화장품 강세 | [더팩트](https://news.tf.co.kr/read/ogmeta/1984832.htm), [다음](https://v.daum.net/v/20221225175202475?f=p), [Caixin](https://www.caixinglobal.com/2022-12-28/china-to-drop-outbound-travel-restrictions-with-end-of-zero-covid-101982849.html) | 높음 |
| | 결과(**가상**) | 봉쇄 재강화 | — | **사실 아님** | — | 가상 |

## 8. 밸런스 조정으로 바꾼 기존 항목 (2026-10-11)

뉴스 간격 3~4분에서 균등 보유(+25%)와 초고속 추종(+104%)이 목표를 넘어 내용만으로 맞췄다 (엔진·설정은 그대로). 사실 관계는 바뀌지 않았고 규모만 낮췄다 (영향도는 공식으로 다시 계산).

| 뉴스 ID | 규모 | 이유 |
|---|---|---|
| b02-retail-wave | 6 → 5 | 호재만 큰 속보가 초고속 추종 수익을 키움 |
| b04-lng-slots | 7 → 6 | 같음 |
| b05-car-chip-shortage | 6 → 5 | 호재 1개(반도체)에 몰리는 구조 |
| b06-canal-blocked | 6 → 5 | 호재 쪽 영향 축소 |
| b09-drama-global | 6 → 5 | 호재만 큰 속보 |
| b10-invasion | 9 → 8 | 직접 호재 2개(±9)가 커서 |
| b12-ev-subsidy | 7 → 6 | 호재 쪽 영향 축소 |
| b16-ai-chatbot | 7 → 6 | 호재만 있는 속보 |
| b18-short-ban | 6 → 5 | 호재만 큰 속보 |
| b19-value-up | 6 → 5 | 같음 |
| b21-transformer | 6 → 5 | 호재만 있는 속보 |
| b23-index-4000 | 7 → 5 | 같음 |
| b24-strait-closed | 8 → 7 | 직접 호재(정유) 축소 |

- 밸런스 결과 (`node scripts/checkEra.ts src/data/eras/2020s.json 150`): 무작위 -5.6%, 균등 보유 +11.6%, 지연 추종 +1.7%, 초고속 추종 +74.3%, 분위기 +21.1%, 역분위기 -25.1%, 잠정 정방향 +33.2%, 잠정 역방향 -33.6% — 모두 목표 안. 구조 오류·가이드 점검 0건.

## 9. 직접 확인 권장 (추가분)

- b30 요소수: 품귀 원인(중국 전력난·석탄 수급·호주 무역 분쟁) 설명이 출처마다 다르다. 본문은 "중국이 요소 수출에 검사를 의무화"만 썼다.
- b31·b35·b36·b40: 국내 업종(화장품·면세, 수산물 소비, 반도체 소재, 하이브리드 전환) 영향 문장은 당시 흐름 요약이며 구체 수치 출처는 붙이지 않았다.
- b37 "국내 김값이 크게 올라"는 주로 2024년 흐름이다 (수출 1조 원 돌파는 2023년).
- b42 "한 해 20조 원 규모"는 함정 정비 시장 추정치(145억 달러) 환산이라 기관마다 다를 수 있다.
- b46 면세점 주가 반응 수치는 찾지 못했다. 무비자 시행 기간(2026-06-30까지 한시 → 연장 여부)은 보도가 엇갈린다.
- s14 잠정의 정부 발언, s16 잠정의 총재 발언, s18 잠정의 MSCI 지적 문구, s21 잠정의 부총리 발언은 당시 보도 흐름을 요약한 것으로 정확한 인용은 확인하지 못했다.
- s17 잠정의 FedWatch 확률(약 52%)은 CME 원자료가 아닌 2차 출처 수치다.
- 실제 결과 쪽 영향도는 사건 규모에 따른 판단값이며, 국내 관련 업종 주가 등락 폭(예: s20 해운, s17 바이오)은 대부분 찾지 못했다.
- 이번에 넣지 않은 후보: 비트코인 현물 ETF 승인(승인 뒤 오히려 가격이 내려 결과 방향이 모호), 메모리 감산 선언(실적 최악인데 주가는 올라 방향이 모호), 체코 원전 우선협상자 선정(기존 s05와 겹침). 밈 주식 열풍·계란값·로보택시는 검증하지 않아 넣지 않았다.
