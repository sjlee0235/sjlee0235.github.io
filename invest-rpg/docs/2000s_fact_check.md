# 2000년대 뉴스 팩트체크 표

- 대상: `src/data/eras/2000s.json`의 뉴스 46개 (단독 30, 스토리 낌새 4, 스토리 단서·결과 12)
- 이 문서는 **앱에 포함되지 않는다**. 그래서 검증 편의를 위해 실명(기업·인물·작품)을 그대로 적었다. 게임 데이터(JSON)에는 실명이 없다.
- 확신도
  - **높음**: 날짜와 핵심 수치를 웹 출처로 확인함
  - **중간**: 사건과 날짜는 확인했지만 영향도 근거 수치(주가 등락 등) 일부를 확인하지 못함
  - **확인 필요**: 출처를 찾지 못했거나 출처끼리 수치가 다름
- **"영향도 근거"는 게임 밸런스를 위해 실제 등락을 압축한 판단**이다. 실제 등락률을 그대로 옮긴 값이 아니다. 영향도 1 = 3%, 실제 반영은 배율(실전 0.6~1.4 / 간접 0.4~1.6) 때문에 매번 조금씩 다르다.
- 가상 시나리오(실제와 다른 결과)는 **사실이 아님**을 표시했다. 게임 화면에서는 "가상 시나리오" 태그가 붙는다.
- 검색일: 2026-10-09. 출처는 당시 보도·기관 자료이며, 같은 사건이라도 출처마다 수치가 조금씩 다를 수 있다.

## 단독 뉴스 — 연습·실전 공통 (직접 영향만)

| 뉴스 ID | 사실 주장(사건) | 실제 날짜 | 영향도 근거 (당시 지수·가격 등락) | 출처 URL | 확신도 |
|---|---|---|---|---|---|
| n01-dotcom-crash | 나스닥 고점 후 폭락, 닷컴 버블 붕괴 | 2000-03-10 고점 / 2002-10-09 저점 | 나스닥 종가 5,048.62 → 1,114.11 (약 -78%). 닷컴 -8, 반도체 -3, 휴대폰 -2. 국내 코스닥 하락률은 미확인 | [Wikipedia: Stock market downturn of 2002](https://en.wikipedia.org/wiki/Stock_market_downturn_of_2002), [NY Sun](https://www.nysun.com/article/business-five-years-after-peak-nasdaq-is-not-even-close) | 중간 |
| n03-us-rate-cut | 미 연준 정례회의 전 0.5%p 긴급 인하 (6.5% → 6.0%) | 2001-01-03 | 당일 나스닥 +14.17% (사상 최대), 다우 +2.8%. 증권·건설 +4, 인터넷·카드 +2 | [CNN Money](https://money.cnn.com/2001/01/03/markets/markets_newyork/), [CNN Money 속보](https://money.cnn.com/2001/01/03/markets/stock_breaker/) | 높음 |
| n06-sept-11 | 9·11 테러 | 2001-09-11 (재개장 09-17) | 재개장일 다우 -684.81p (-7.13%). AMR -39%, UAL -42~43%. 코스피 2001-09-12 -12.02%. 항공 -9(-27%)는 실제보다 작게 잡음 | [CNN Money](https://money.cnn.com/2001/09/17/markets/markets_newyork/), [Plansponsor](https://www.plansponsor.com/dow-closes-down-684-points/), [Motley Fool](https://www.fool.com/investing/general/2012/09/17/the-agony-of-the-airlines.aspx), [한국경제](https://www.hankyung.com/article/2026030492541) | 높음 |
| n08-sars | 사스 확산, WHO 여행 자제 권고 | 경보 2003-03-12 / 여행 연기 권고 2003-04-02 | 홍콩·광둥 비필수 여행 연기 권고. 누적 8,096명·774명은 7월 무렵 최종 집계로 알려짐(미확인). 백신 +4는 기대감 (실제 백신 상용화 안 됨) | [WHO DON 2003-04-02](https://www.who.int/emergencies/disease-outbreak-news/item/2003_04_02b-en), [UN News](https://news.un.org/en/story/2003/04/63672-sars-spurs-who-advisory-avoid-travel-hong-kong-and-guangdong), [WHO 타임라인](https://www.who.int/emergencies/disease-outbreak-news/item/2003_07_01-en) | 중간 |
| n10-bird-flu | 국내 첫 고병원성 조류독감 (충북 음성) | 2003-12 (의심 보고 12-12 전후) | 농장 닭 24,000마리 중 19,000마리 폐사, 나머지 살처분. 2003/04 시즌 총 19건. 축산 관련주 하락 폭은 미확인 | [PoultryMed](https://www.poultrymed.com/news_37255), [KoreaScience 논문](https://koreascience.kr/article/JAKO200772065754698.pdf) | 확인 필요 |
| n12-hallyu-japan | 겨울연가 일본 NHK 방영, 한류 붐 | NHK BS2 2003-04 / 지상파 2004-04 무렵 | 지상파 마지막 회 도쿄 20.6% 등. 남이섬 등 촬영지 관광. 관광객 증가 수치·엔터주 상승 폭은 미확인 | [한국민족문화대백과](https://encykorea.aks.ac.kr/Article/E0073572), [매일신문](https://www.imaeil.com/page/view/2004100817542725446) | 중간 |
| n13-online-game-china | 국산 온라인게임(미르의 전설2) 중국 흥행 | 2001-11 상용화 / 2002 | 2002년 중국 동시접속 약 35만 명, 이후 60~70만 명 보도. 수출액은 미확인 | [게임메카](https://www.gamemeca.com/view.php?gid=1283), [전자신문](https://m.etnews.com/200508200047) | 중간 |
| n15-china-boom | 중국 두 자릿수 성장, 조선·철강 호황 | 2007 | 중국 2007년 성장률 공식 수정치 **13.0%** (처음 11.4% → 11.9% → 13.0%). 데이터의 기존 "약 14%"는 확인되지 않아 수정함. 조선·철강주 상승 폭은 미확인 | [China Daily 2009-01-14](https://covid-19.chinadaily.com.cn/china/2009-01/14/content_7396604.htm), [중국 국가통계국](https://www.stats.gov.cn/english/NewsEvents/200804/t20080410_26010.html) | 중간 |
| n17-korea-us-fta | 한미 FTA 타결 | 2007-04-02 | 미국 승용차 관세 2.5% 철폐(1,500~3,000cc 즉시). 축산 피해 우려. 당일 주가 반응은 미확인 | [서울신문](https://m.seoul.co.kr/news/2010/12/05/20101205800042), [한국농촌경제연구원 보고서](https://repository.krei.re.kr/bitstream/2018.oak/19754/1/%ed%95%9c%c2%b7%eb%af%b8%20FTA%2c%20%eb%86%8d%ec%97%85%eb%b6%84%ec%95%bc%ec%9d%98%20%ec%98%81%ed%96%a5%ea%b3%bc%20%ea%b3%bc%ec%a0%9c.pdf) | 중간 |
| n18-kospi-2000 | 코스피 첫 2,000 돌파, 펀드 열풍 | 2007-07-25 | 2,004.2 (시총 996조 원). 펀드 열풍의 정점은 2007-10~11. 증권 +7 | [아주경제](https://www.ajunews.com/view/20101214000105), [전자신문 2007 결산](https://www.etnews.com/200712240055) | 높음 |
| n20-green-growth | 광복절 경축사 '저탄소 녹색성장' 비전 | 2008-08-15 | 신재생 비율 2% → 2030년 11% 목표. 태양광 테마주 상승 폭은 미확인 | [아이뉴스24](https://www.inews24.com/view/350989), [경향신문](https://www.khan.co.kr/article/200808182309455) | 중간 |
| n23-bok-rate-low | 한은 기준금리 2.0% (당시 사상 최저) | 2009-02-12 | 2.5% → 2.0% (0.5%p 인하), 17개월 유지 | [메트로서울](https://www.metroseoul.co.kr/article/2015021700053), [뉴스토마토](https://newstomato.com/ReadNews.aspx?no=42109) | 높음 |
| n25-stem-cell-scandal | 황우석 줄기세포 논문 조작 | 중간발표 2005-12-23 / 최종발표 2006-01-10 | 2005년 논문: 11개 세포주 데이터를 2개로 조작. 2004년 논문도 조작 판정. 테마주 하락 폭은 미확인 | [프레시안](https://pressian.com/pages/articles/31877), [메디컬타임즈](https://www.medicaltimes.com/Main/view.html?ID=23781), [데일리팜](https://dailypharm.com/user/news/255640) | 중간 |
| n26-stem-cell-paper | 줄기세포 논문 사이언스 게재 (이후 조작 판명) | 2004-02 (정확한 일자 미확인) | 테마주 상승 폭은 미확인. 줄기세포 +7, 백신 +1 | [주간경향](https://weekly.khan.co.kr/article/11225) | 확인 필요 |
| n28-nk-missile | 북한 대포동2호 등 미사일 연속 발사 | 2006-07-05 | 6~7발 발사, 장거리 1발은 약 40초 만에 실패. 국내 증시 반응은 미확인 | [Wikipedia](https://en.wikipedia.org/wiki/2006_North_Korean_missile_test), [Japan Times](https://info.japantimes.co.jp/weekly/news/nn2006/nn20060708a1.htm) | 중간 |

## 단독 뉴스 — 실전 전용 (간접 영향 포함)

| 뉴스 ID | 사실 주장(사건) | 실제 날짜 | 영향도 근거 (당시 지수·가격 등락) | 출처 URL | 확신도 |
|---|---|---|---|---|---|
| n02-inter-korean-summit | 첫 남북정상회담, 6·15 공동선언 | 2000-06-13 ~ 06-15 | 증시·방산·건설 반응은 미확인. 모두 2차 해석(방산 -4, 건설 +4) | [Wikipedia](https://en.wikipedia.org/wiki/2000_inter-Korean_summit) | 중간 |
| n04-dram-crash | D램 가격 폭락 | 2001 | 12개월간 약 -80%(Gartner Dataquest). 128Mb 현물 2월 약 4.5달러 → 6월 2달러 미만 | [ITWorld Canada](https://itworldcanada.com/?p=30495), [The Register](https://www.theregister.co.uk/2001/06/21/2001_worst_dram_year/) | 높음 |
| n05-imf-repaid | IMF 차입금 195억 달러 조기 상환 | 2001-08-23 | 원래 만기 2004-05. 당일 지수 반응은 미확인 | [서울신문](https://www.seoul.co.kr/news/2001/08/23/20010823005005), [국가기록원](https://theme.archives.go.kr/next/koreaOfRecord/imf.do) | 높음 |
| n07-world-cup | 2002 월드컵 한국 4강 진출 | 2002-06-22 (8강 스페인전 승리) | **"치킨 주문 폭주"는 출처를 찾지 못함.** 증시 영향은 미미했다는 평가가 많음 | [경향신문](https://www.khan.co.kr/article/200206221912161), [서울신문](https://www.seoul.co.kr/news/2002/06/23/20020623001001) | 확인 필요 |
| n09-card-crisis | 카드대란 (LG카드 유동성 위기) | 2003 (LG카드 위기 2003-11) | 2003년 말 신용불량자 372만 명(카드 관련 240만 명). 카드사 주가 하락 폭은 미확인 | [주간경향](https://weekly.khan.co.kr/article/201012301018501), [참여연대](https://peoplepower21.org/?p=627355) | 중간 |
| n11-high-speed-rail | KTX 개통 | 2004-04-01 | 김포~대구 항공 승객 약 80% 감소, 대구공항 국내선 2003년 210만 → 2004년 134만 명 | [매일신문](https://www.imaeil.com/page/view/2007103010415089872), [한국경제](https://www.hankyung.com/amp/2010102869091) | 높음 |
| n14-hurricane | 허리케인 카트리나 | 2005-08-29 (유가 최고 08-30) | WTI 장중 70.85달러(당시 최고), 정유시설 8~9곳 중단 | [EIA](https://www.eia.gov/oog/info/twip/twiparch/050831/twipprint.html), [Arab News](https://www.arabnews.com/node/272250) | 높음 |
| n16-smartphone-unveiled | 애플 아이폰 공개 | 2007-01-09 (판매 06-29) | 국내 휴대폰·반도체 반응은 미확인. 2차 해석용 | [Engadget](https://www.engadget.com/2012-01-09-january-9-2007-iphone-announced-at-macworld-expo.html), [History.com](https://history.com/this-day-in-history/january-9/steve-jobs-debuts-the-iphone) | 중간 |
| n19-oil-147 | 국제유가 사상 최고 147.27달러 | 2008-07-11 | WTI 장중 147.27달러. 10월 초까지 약 -40%. 업종별 등락 폭은 미확인 | [AAPG](https://www.aapg.org/publications/news/correlator/details/articleid/32462), [Telemetro(AFP)](https://www.telemetro.com/economia/2008/07/11/barril-crudo-supera-primera-dolares/2112756.html/amp) | 중간 |
| n21-won-plunge | 원·달러 1,500원대 | 2008-11 | 11-20 종가 1,497원(장중 1,500원), 11-24 1,515원 보도. 기존 메모의 1,513원은 확인되지 않음 | [전북일보](https://www.jjan.kr/articleAmp/20081120289937), [매일신문](https://www.imaeil.com/page/view/2020032022025247391) | 확인 필요 |
| n22-china-stimulus | 중국 4조 위안 경기부양책 | 2008-11-09 | 약 5,860억 달러, 인프라 비중이 가장 큼(호주 재무부 추정 72%) | [Australian Treasury](https://treasury.gov.au/publication/chinese-macroeconomic-management-through-the-crisis-and-beyond/2011-01-chinese-macroeconomic-management-through-the-crisis-and-beyond/4-chinas-stimulus-package), [RIETI](https://www.rieti.go.jp/en/china/09040602.html) | 중간 |
| n24-h1n1-pandemic | WHO 신종플루 대유행 6단계 | 2009-06-11 | 1968년 이후 첫 독감 대유행, 당일 74개국 28,774명. 국내 백신주 상승 폭은 미확인 | [CIDRAP](https://www.cidrap.umn.edu/h1n1-2009-pandemic-influenza/who-declares-pandemic-novel-h1n1-virus), [CDC](https://www.cdc.gov/h1n1flu/who/) | 중간 |
| n27-us-automaker-bankrupt | GM 파산보호 신청 | 2009-06-01 | 부채 1,728억 달러, 미국 산업기업 최대 파산. 국내 완성차 반사이익은 미확인 | [Wikipedia](https://en.wikipedia.org/wiki/General_Motors_Chapter_11_reorganization) | 중간 |
| n29-grain-prices | 세계 곡물가 급등(애그플레이션) | 2008 봄 (쌀·옥수수 최고 04-16 보도) | 쌀 수출가 약 3배, 대두는 연초 고점. 축산 -5는 사료값 경로의 2차 해석 | [CRS 보고서](https://www.everycrsreport.com/files/20080529_RL34474_7a0c5386086702043d0248ffd4e831012af32e63.html), [Hürriyet](https://www.hurriyet.com.tr/avrupa/us-rice-and-corn-prices-hit-record-on-supply-worries-1199026) | 중간 |
| n30-china-wto | 중국 WTO 가입 (143번째 회원국) | 2001-12-11 | 장기 효과를 2차 해석으로 압축. 당일 반응은 작았을 수 있음 | [USTR](https://www.ustr.gov/archive/Document_Library/Fact_Sheets/2001/Background_Information_on_China's_Accession_to_the_World_Trade_Organization.html), [Bloomberg](https://www.bloomberg.com/news/articles/2011-12-11/china-marks-10-years-as-wto-member-amid-eu-and-u-s-criticism) | 높음 |

## 스토리 (실전 전용)

| 뉴스 ID | 사실 주장(사건) | 실제 날짜 | 영향도 근거 | 출처 URL | 확신도 |
|---|---|---|---|---|---|
| s1-iraq-signal (낌새) | 부시 대통령 유엔 연설, 이라크 대량살상무기 비난 | 2002-09-12 | 사찰단은 1998년 이후 이라크에 못 들어감(본문 근거). 낌새라 ±2 이내 | [CNN](https://edition.cnn.com/2002/US/09/12/bush.speech.un/index.html), [PBS](https://www.pbs.org/newshour/world/international-july-dec02-bush-speech_09-12) | 높음 |
| s1-iraq-clue-buildup (단서→개전) | 걸프 지역 미군 증강 | 2003-01 ~ 02 | 병력 규모(수십만)는 미확인 | 출처 미확보 | 확인 필요 |
| s1-iraq-clue-inspection (단서→가상) | 이라크, 사찰단 수용 검토 | 2002-09-16 (사찰단 초청) | **발언 자체는 사실**이지만, 게임에서는 가상 결과(전쟁 회피)를 가리키는 단서로 쓰임 | [MERIP](https://www.merip.org/2002/12/using-and-abusing-the-un-redux/) | 중간 |
| s1-iraq-war-begins (결과, 실제) | 이라크전 개전, 유가 급락·증시 반등 | 2003-03-20 | 개전 주간 브렌트 30.13 → 24.80달러(약 -18%), 03-21 미국 증시 반등, 03-24 다시 하락. reactionNote 근거 | [Dawn](https://www.dawn.com/news/88337), [Business Times 2003-03-21](https://eresources.nlb.gov.sg/newspapers/digitised/issue/biztimes20030321-1) | 높음 |
| s1-iraq-crisis-averted (결과, **가상**) | 이라크 무기사찰 전면 수용으로 전쟁 회피 | — | **사실 아님 (가상 시나리오)** | — | 가상 |
| s2-nk-signal (낌새) | 북한 외무성 핵실험 예고 성명 | 2006-10-03 | 시기는 밝히지 않음, 6일 뒤 실행. 본문의 '7월 미사일 강행'은 n28로 사실 확인 | [뉴데일리](https://www.newdaily.co.kr/site/data/html/2006/10/04/2006100400002.amp.html), [통일연구원](https://repo.kinu.or.kr/bitstream/2015.oak/942/1/0000751463.pdf) | 높음 |
| s2-nk-test (결과, 실제) | 북한 1차 핵실험 | 2006-10-09 | 코스피 -2.41%(-32.60p), 코스닥 -8.21%, 5거래일 만에 회복 | [노컷뉴스](https://nocutnews.co.kr/news/4528557), [뉴스토마토](https://www.newstomato.com/ReadNews.aspx?no=1127999) | 높음 |
| s2-nk-talks (결과, **가상**) | 핵실험 대신 6자회담 복귀 | — | **사실 아님 (가상 시나리오).** 실제로는 핵실험 뒤 10-31에 복귀 합의 | — | 가상 |
| s3-subprime-signal (낌새) | 서브프라임 대출업체 연쇄 파산 | 2007-04 ~ 2007-08 | 낌새라 ±3 이내. 구체 업체명·일자는 미확인 | 출처 미확보 | 확인 필요 |
| s3-clue-fire-sale (단서→파산) | 베어스턴스, JP모건에 헐값 매각 | 2008-03-16 | 주당 약 2달러(이후 10달러로 상향), 연준 300억 달러 지원 | [SEC 공시](https://www.sec.gov/Archives/edgar/data/0000777001/000089882208000286/pressrelease.htm), [CNN Money](https://money.cnn.com/2008/03/16/news/companies/jpmorgan_bear_stearns/) | 높음 |
| s3-clue-treasury (단서→가상) | 미 재무부 "대형 금융회사 부실 막겠다" | 2008 (구체 일자 미확인) | 가상 결과를 가리키는 단서. 실제 발언 시점 미확인 | 출처 미확보 | 확인 필요 |
| s3-ib-bankruptcy (결과, 실제) | 리먼 브라더스 파산 | 2008-09-15 | 다우 -504.48p(-4.42%), 코스피 2008-09-16 -90.17p(-6.10%). 자산 약 6,900억 달러 | [MPR News](https://www.mprnews.org/story/2008/09/15/wallstreet), [CNN Money](https://money.cnn.com/2018/09/14/investing/lehman-brothers-2008-crisis/), [이투데이](https://www.etoday.co.kr/news/view/184331) | 높음 |
| s3-ib-rescue (결과, **가상**) | 미 정부가 대형 투자은행 긴급 구제 | — | **사실 아님 (가상 시나리오).** 실제로는 리먼은 구제 거부, 다음 날 AIG는 구제 | — | 가상 |
| s4-rate-signal (낌새) | 한은 총재 금리 인상 시사 | 2005-09 ~ 10 (구체 발언일 미확인) | 낌새라 ±2 이내 | 출처 미확보 | 확인 필요 |
| s4-rate-hike (결과, 실제) | 한은 콜금리 3.25% → 3.50% 인상 | 2005-10-11 | 2002-05 이후 3년 5개월 만, 12월 추가 인상 | [한경 생글생글](https://sgsg.hankyung.com/article/2005101304601), [경향신문](https://www.khan.co.kr/article/200512081751111/amp) | 높음 |
| s4-rate-hold (결과, **가상**) | 한은 금리 동결 | — | **사실 아님 (가상 시나리오)** | — | 가상 |

## 검증하면서 바뀐 점 (데이터에도 반영함)

1. **n15 중국 성장률**: "약 14%" → 공식 수정치 **13.0%**로 메모를 고쳤다.
2. **n21 환율**: "1,513원"은 확인되지 않았다. 11-20 종가 1,497원, 11-24 1,515원 보도로 고쳤다.
3. **n08 사스**: 홍콩·광둥 여행 연기 권고일 2003-04-02를 확인했다. 8,096명·774명은 4월이 아니라 7월 무렵 최종 집계로 보인다.
4. **s1 사찰 수용 단서**: 이라크가 2002-09-16에 사찰단을 초청한 것은 **사실**이다. 가상 결과로 이어지는 단서로만 쓰인다.
5. **n07 월드컵 "치킨 주문 폭주"**: 출처를 찾지 못했다. 문구를 유지할지, 바꿀지 결정이 필요하다.

## 미확인 항목 (직접 확인 권장)

- 대부분 뉴스의 "국내 관련 업종 주가 등락 폭"은 찾지 못했다. 현재 영향도는 사건 규모에 따른 판단값이다.
- 낌새·단서 일부(s1-clue-buildup, s3-subprime-signal, s3-clue-treasury, s4-rate-signal)의 구체 일자·수치는 미확인이다.
