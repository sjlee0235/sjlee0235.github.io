# 2020년대 뉴스 팩트체크 표 (단계 B 초안)

- 대상: `src/data/eras/2020s.json`. 속보 24개, 스토리 13개(잠정 1개 + 결과 2개씩, 모두 39개), 합계 63개. opener 스토리는 6개(s01·s02·s05·s06·s08·s12)
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
- 종목명은 "지어낸 외래어풍 브랜드 + 쉬운 한국어 업종어" 형식 (예: 케일론반도체, 네레아조선, 티카코인거래소). 2000년대 브랜드 41개와 겹치지 않고, 같은 시기에 작성된 2010년대 파일(`2010s.json`)의 브랜드와도 겹치지 않게 확인했다 (미라벨여행 → 제피르여행으로 바꿈: 2010년대 '미라엔터'와 비슷해서).
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
