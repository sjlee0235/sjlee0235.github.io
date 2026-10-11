# 2000년대 뉴스 팩트체크 표 (단계 B 초안)

- 대상: `src/data/eras/2000s.json` — 처음 속보 23개, 스토리 12개(잠정 1 + 결과 2씩 = 36개), 모두 59개. 추가분(속보 27개, 스토리 7개)은 문서 끝에 있다.
- 이 문서는 **앱에 포함되지 않는다**. 검증 편의를 위해 실명(기업·인물·지수)을 그대로 적었다. 게임 데이터(JSON)에는 실명이 없다.
- 확신도
  - **높음**: 날짜와 핵심 수치를 웹 출처로 확인함
  - **중간**: 사건과 시기는 확인했지만 세부 수치(국내 주가 등락 폭 등) 일부를 확인하지 못함
  - **확인 필요**: 출처를 찾지 못했거나 출처끼리 수치가 다름
- 영향도는 **사건 규모에 따른 판단값**이다 (공식: 직접 = 규모, 밀접 = 규모×0.6, 간접 = 규모×0.3 반올림). 실제 등락률을 옮긴 값이 아니다.
- 가상 결과(실제와 다른 결과)는 **사실이 아님**을 표시했다. 게임 화면에서는 "가상 시나리오" 태그가 붙는다.
- 본문에는 연도·월을 쓰지 않았다 (뉴스는 시대 안에서 무작위 순서로 나온다). 실제 날짜는 데이터의 `realDate`에만 있다.
- 검색일: 2026-10-09.

## 1. 속보 23개

| 뉴스 ID | 사실 주장(사건) | 실제 날짜 | 근거 수치 | 출처 | 확신도 |
|---|---|---|---|---|---|
| b01-tech-bubble | 미국 기술주 폭락, 닷컴 버블 붕괴 | 2000-03-10 고점 ~ 2002-10 저점 | 나스닥 5,048.62 → 1,114.11 (약 -78%). 코스닥 하락률은 미확인 | [Wikipedia](https://en.wikipedia.org/wiki/Stock_market_downturn_of_2002), [NY Sun](https://www.nysun.com/article/business-five-years-after-peak-nasdaq-is-not-even-close) | 중간 |
| b02-us-terror | 9·11 테러, 미국 증시 휴장 후 급락 | 2001-09-11 (재개장 09-17) | 재개장일 다우 -7.13%, 항공주 -40% 안팎, 코스피 09-12 -12.02% | [CNN Money](https://money.cnn.com/2001/09/17/markets/markets_newyork/), [Motley Fool](https://www.fool.com/investing/general/2012/09/17/the-agony-of-the-airlines.aspx) | 높음 |
| b03-dram-crash | D램 가격 폭락 | 2001 | 12개월간 약 -80%. 128Mb 현물 2월 약 4.5달러 → 6월 2달러 미만 | [ITWorld Canada](https://itworldcanada.com/?p=30495), [The Register](https://www.theregister.co.uk/2001/06/21/2001_worst_dram_year/) | 높음 |
| b04-game-china | 국산 온라인 RPG(미르의 전설2) 중국 흥행 | 2001-11 ~ 2002 | 중국 동시접속 약 35만 명, 이후 60~70만 명 보도 | [게임메카](https://www.gamemeca.com/view.php?gid=1283), [전자신문](https://m.etnews.com/200508200047) | 중간 |
| b05-drama-japan | 겨울연가 일본 NHK 방영, 한류 붐 | NHK BS2 2003-04 / 지상파 2004-04 | 지상파 마지막 회 도쿄 20.6%. OST 판매량·관광객 수는 미확인 | [한국민족문화대백과](https://encykorea.aks.ac.kr/Article/E0073572), [매일신문](https://www.imaeil.com/page/view/2004100817542725446) | 중간 |
| b06-high-speed-rail | KTX 개통, 서울~부산 2시간 40분 | 2004-04-01 | 김포~대구 항공 승객 약 80% 감소 | [매일신문](https://www.imaeil.com/page/view/2007103010415089872), [한국경제](https://www.hankyung.com/amp/2010102869091) | 높음 (2시간 40분은 개통 당시 최단 기준, 확인 권장) |
| b07-textile-quota | 섬유 수입 쿼터(다자간섬유협정 후속) 전면 폐지 | 2005-01-01 | WTO 섬유·의류 협정 종료로 쿼터 폐지, 중국산 수출 급증 | 널리 알려진 사실 (출처 추가 필요) | 중간 |
| b08-hurricane-oil | 허리케인 카트리나, 미국 정유시설 중단 | 2005-08-29 (유가 최고 08-30) | WTI 장중 70.85달러(당시 최고), 정유시설 8~9곳 중단 | [EIA](https://www.eia.gov/oog/info/twip/twiparch/050831/twipprint.html) | 높음 |
| b09-mp3 | MP3·온라인 음원 확산, 음반 시장 급감 | 2000 ~ 2006 | 음반 매출 2000년 4,104억 원 → 2006년 848억 원. 2005년 온라인 2,621억 원이 오프라인 1,087억 원 추월. "반 토막"은 몇 년 사이 절반 아래로 줄었다는 뜻이라 사실과 맞음 | [전자신문](https://m.etnews.com/200401200010), [한국콘텐츠진흥원 자료](https://www.kocca.kr/knowledge/publication/indu/__icsFiles/afieldfile/2012/06/14/XxQdX2e3cJq4.pdf) | 높음 |
| b10-digital-camera | 디지털카메라 보급, 필름 수요 급감 | 2000년대 초중반 | 세계 디지털카메라 출하 2003년 4,793만 대 → 2004년 7,150만 대. 일본 필름카메라 출하 2005년 -46.5%. **국내 판매 역전 시점은 미확인**이라 제목을 "판매 추월"에서 "보급 확산"으로 고침 | [KoreaScience](https://koreascience.kr/article/JAKO200640960894988.pdf), [KoreaScience](https://koreascience.or.kr/article/JAKO200558448968886.pdf) | 중간 |
| b11-free-papers | 지하철 무료 신문 등장, 인터넷 뉴스 확산 | 2002 ~ 2000년대 중반 | 국내 첫 무료 일간지 2002년 창간, 가판 신문 판매 2004년경부터 10~20% 감소. 유료 신문 구독률 수치는 미확인 | [기자협회보](https://www.journalist.or.kr/m/m_article.html?no=37512), [메트로](https://www.metroseoul.co.kr/article/2016010300095) | 중간 |
| b12-index-2000 | 코스피 첫 2,000 돌파, 펀드 열풍 | 2007-07-25 | 2,004.2 (시총 996조 원) | [아주경제](https://www.ajunews.com/view/20101214000105), [전자신문 2007 결산](https://www.etnews.com/200712240055) | 높음 |
| b13-china-growth | 중국 두 자릿수 성장, 철강·선박 수요 | 2003 ~ 2007 | 2007년 성장률 공식 수정치 13.0% | [China Daily](https://covid-19.chinadaily.com.cn/china/2009-01/14/content_7396604.htm), [중국 국가통계국](https://www.stats.gov.cn/english/NewsEvents/200804/t20080410_26010.html) | 중간 |
| b14-plant-orders | 해외건설 수주 사상 최대 | 2008 | 476억 달러 (전년 398억 달러 대비 +19.7%), 중동 272억 달러(57%), 플랜트 286억 달러(70%) | [건설동향브리핑 188호](https://www.cerik.re.kr/report/briefing/1019), [머니투데이](https://www.mt.co.kr/estate/2009/03/19/2009031811244240616) | 높음 |
| b15-green-growth | 광복절 경축사 '저탄소 녹색성장' 비전 | 2008-08-15 | 신재생 비율 2% → 2030년 11% 목표 | [아이뉴스24](https://www.inews24.com/view/350989), [경향신문](https://www.khan.co.kr/article/200808182309455) | 중간 |
| b16-grain-prices | 국제 곡물가 급등(애그플레이션) | 2007 ~ 2008 봄 | 쌀 수출가 약 3배, 밀·옥수수 급등. 국내 밀가루·라면값 인상 | [CRS 보고서](https://www.everycrsreport.com/files/20080529_RL34474_7a0c5386086702043d0248ffd4e831012af32e63.html) | 중간 |
| b17-won-1500 | 원·달러 환율 1,500원대 | 2008-11 | 11-20 종가 1,497원(장중 1,500원), 11-24 1,515원 보도 | [전북일보](https://www.jjan.kr/articleAmp/20081120289937), [매일신문](https://www.imaeil.com/page/view/2020032022025247391) | 중간 |
| b18-savings-pf | 저축은행 부동산 PF 대출 부실, 금감원 실태조사 | 2008 | 89개 저축은행 899개 사업장 점검: 정상 55%, 주의 33%, 악화 우려 12%. 2011년 저축은행 연쇄 영업정지로 이어짐 | [새전북신문(경제)](https://sateconomy.co.kr/news/view/179587723950390), [주간경향](https://weekly.khan.co.kr/article/201105111553161) | 높음 |
| b19-video-call | 3세대(HSDPA) 영상통화 전국 서비스 경쟁 | 2007-03 | KTF 03-01 전국 서비스, SKT 03-29. 보조금 8~30만 원, 영상통화 요금 10초 120원 → 30원 | [이투데이](https://www.etoday.co.kr/news/view/121593), [주간경향](https://weekly.khan.co.kr/article/15438) | 높음 |
| b20-battery-recall | 노트북 배터리(소니 셀) 대량 리콜 | 2006-08-14 | 델 410만 개 리콜 (당시 미국 소비자제품안전위원회 최대 전자제품 리콜). 이후 다른 제조사도 리콜 | [Redmond](https://redmondmag.com/articles/2006/08/15/dell-recalls-firerisk-laptop-batteries.aspx), [eWeek](https://www.eweek.com/de/pc-hardware/dell-to-recall-millions-of-laptop-batteries/) | 높음 |
| b21-howitzer-export | K9 자주포 터키 첫 수출 계약 (기술이전·현지 생산) | 2001 | 이후 여러 나라로 수출 확대. 수량(280문 등)은 기사마다 다름 | [디지털타임스](https://www.dt.co.kr/article/12062579), [뉴시스](https://mobile.newsis.com/view/NISX20200903_0001153759) | 중간 |
| b22-internet-phone | 인터넷 전화(070) 등장, 집 전화 정체 | 2004-10 역무 고시 ~ 2007 상용화 확대 | 집 전화는 1997년 2천만 가입 뒤 정체. 연도별 가입자 감소 통계는 미확인 | [ETRI](https://ksp.etri.re.kr/ksp/article/file/37232.pdf), [머니투데이](https://www.mt.co.kr/stock/2008/10/03/2008100214535621296) | 확인 필요 |
| b23-camera-phone | 카메라폰이 휴대폰 판매의 절반 넘음 | 2003 | 2003년 국내 단말기 1,400만 대 중 절반이 카메라폰, 7월 월간 판매 비중 50% 돌파. **"1천만 대 돌파"는 출처가 없어 제목을 고침** | [서울신문 2004-01-01](https://www.seoul.co.kr/news/2004/01/01/20040101052001), [서울신문 2003-08-18](https://www.seoul.co.kr/news/2003/08/18/20030818020003) | 높음 |

## 2. 스토리 12개

| 스토리 | 뉴스 | 사실 주장 | 실제 날짜 | 근거 | 출처 | 확신도 |
|---|---|---|---|---|---|---|
| s01 이라크 전쟁 (opener) | 잠정 | 걸프 지역 병력 증강, 단기전 관측 | 2002-09 ~ 2003-03 | 병력 규모는 미확인. "전문가 다수 단기전 관측"은 당시 분위기 요약 | 출처 추가 필요 | 확인 필요 |
| | 결과(실제) | 개전 3주 만에 바그다드 함락, 유가 급락·증시 반등 | 개전 2003-03-20, 함락 04-09 | 개전 주간 브렌트 30.13 → 24.80달러(약 -18%), 03-21 미국 증시 반등 | [Dawn](https://www.dawn.com/news/88337), [Business Times](https://eresources.nlb.gov.sg/newspapers/digitised/issue/biztimes20030321-1) | 높음 |
| | 결과(**가상**) | 전쟁 장기화, 유가 급등 | — | **사실 아님** | — | 가상 |
| s02 북한 1차 핵실험 | 잠정 | 핵실험 예고 성명 | 2006-10-03 | 시기는 밝히지 않음. "실험장 주변 움직임 위성 포착" 보도는 출처 추가 필요 | [뉴데일리](https://www.newdaily.co.kr/site/data/html/2006/10/04/2006100400002.amp.html) | 중간 |
| | 결과(실제) | 핵실험 강행, 증시 하루 급락 뒤 회복 | 2006-10-09 | 코스피 -2.41%, 코스닥 -8.21%, 5거래일 만에 회복 | [노컷뉴스](https://nocutnews.co.kr/news/4528557), [뉴스토마토](https://www.newstomato.com/ReadNews.aspx?no=1127999) | 높음 |
| | 결과(**가상**) | 실험 보류, 회담 복귀 | — | **사실 아님** (실제로는 실험 뒤 10-31 복귀 합의) | — | 가상 |
| s03 세계 금융위기 | 잠정 | 리먼 브라더스 인수 협상 결렬 보도 | 2008-09-12 ~ 14 | 인수 후보(BoA·바클레이스) 협상 중단 | [CNN Money](https://money.cnn.com/2018/09/14/investing/lehman-brothers-2008-crisis/) | 높음 |
| | 결과(실제) | 리먼 브라더스 파산 | 2008-09-15 | 다우 -4.42%, 코스피 09-16 -6.10%, 자산 약 6,900억 달러 | [MPR News](https://www.mprnews.org/story/2008/09/15/wallstreet), [이투데이](https://www.etoday.co.kr/news/view/184331) | 높음 |
| | 결과(**가상**) | 막판 인수로 파산 회피 | — | **사실 아님** | — | 가상 |
| s04 기준금리 인상 (opener) | 잠정 | 소비자물가 5%대, 총재 물가 우선 발언 | 2008-07 ~ 08 | 2008년 7월 물가 5.9% (확인 권장) | 출처 추가 필요 | 중간 |
| | 결과(실제) | 기준금리 0.25%p 인상 (5.00% → 5.25%) | 2008-08 (8월 7일로 알려짐, 일자 확인 필요) | 리먼 사태 전 최고 5.25%, 이후 2009-02까지 2.0%로 인하 | [JoongAng Daily](https://www.koreajoongangdaily.com/business/money-tighter-as-bok-fights-prices/11071190), [Currency Thoughts](https://currencythoughts.com/2010/02/11/korean-base-rate-stays-at-2-0-as-expected/) | 중간 |
| | 결과(**가상**) | 기준금리 동결 | — | **사실 아님** | — | 가상 |
| s05 카드 대란 | 잠정 | 카드 연체율 10% 돌파, 현금서비스 한도 축소 | 2003 | 연체율 수치(10%)는 업계 평균 기준, 확인 권장 | 출처 추가 필요 | 확인 필요 |
| | 결과(실제) | LG카드 유동성 위기, 채권단 긴급 지원 | 2003-11 | 2003년 말 신용불량자 372만 명(카드 관련 240만 명) | [주간경향](https://weekly.khan.co.kr/article/201012301018501), [참여연대](https://peoplepower21.org/?p=627355) | 중간 |
| | 결과(**가상**) | 증자로 조기 수습 | — | **사실 아님** | — | 가상 |
| s06 사스 (opener) | 잠정 | 아시아 확산·여행 자제 권고, 국내 의심 환자 음성 | 2003-03 ~ 04 | WHO 홍콩·광둥 여행 연기 권고 04-02 | [WHO](https://www.who.int/emergencies/disease-outbreak-news/item/2003_04_02b-en) | 높음 |
| | 결과(실제) | 국내 확산 없이 진정, 여행 회복 | 2003-07 종식 선언 | 국내 추정 환자 소수, 사망자 없음 | [WHO 타임라인](https://www.who.int/emergencies/disease-outbreak-news/item/2003_07_01-en) | 중간 |
| | 결과(**가상**) | 국내 확산, 외출 자제 | — | **사실 아님** | — | 가상 |
| s07 한미 FTA | 잠정 | 협상 시한 연장, '큰 틀 접근' | 2007-03-31 ~ 04-02 | 시한 48시간 연장 | [서울신문](https://m.seoul.co.kr/news/2010/12/05/20101205800042) | 중간 |
| | 결과(실제) | 타결, 미국 승용차 관세 2.5% 철폐 | 2007-04-02 | 1,500~3,000cc 즉시 철폐, 축산 피해 우려 | [서울신문](https://m.seoul.co.kr/news/2010/12/05/20101205800042), [KREI 보고서](https://repository.krei.re.kr/bitstream/2018.oak/19754/1/%ed%95%9c%c2%b7%eb%af%b8%20FTA%2c%20%eb%86%8d%ec%97%85%eb%b6%84%ec%95%bc%ec%9d%98%20%ec%98%81%ed%96%a5%ea%b3%bc%20%ea%b3%bc%ec%a0%9c.pdf) | 중간 |
| | 결과(**가상**) | 결렬 | — | **사실 아님** | — | 가상 |
| s08 조류인플루엔자 (opener) | 잠정 | 닭 집단 폐사 신고, 인근 폐사 증가 | 2008-04-01 | 전북 산란계 농장 의심 신고 (김제/정읍 기록이 엇갈림) | [KoreaScience](https://koreascience.or.kr/article/JAKO200851062620235.pdf) | 중간 |
| | 결과(실제) | 고병원성 확진, 대규모 살처분 | 2008-04-03 판정 | 발생 농장과 반경 500m 내 닭 30만 8천 마리 폐기 (본문은 "발생 농장과 주변 농장"으로 씀) | [산업일보](https://kidd.co.kr/news/113083), [경향신문](https://www.khan.co.kr/article/200805181623311) | 중간 |
| | 결과(**가상**) | 저병원성 판정, 이동 제한 해제 | — | **사실 아님** | — | 가상 |
| s09 고유가 (opener) | 잠정 | 산유국 '공급 충분' 입장 | 2008-06 | 사우디 등 증산 소극적 (제다 회의 06-22) | 출처 추가 필요 | 중간 |
| | 결과(실제) | 소폭 증산에도 유가 사상 최고 | 2008-07-11 | WTI 장중 147.27달러, 이후 10월 초까지 약 -40% | [AAPG](https://www.aapg.org/publications/news/correlator/details/articleid/32462) | 높음 |
| | 결과(**가상**) | 대규모 증산 합의로 유가 급락 | — | **사실 아님** | — | 가상 |
| s10 베이징 올림픽 유치 (opener) | 잠정 | 표결 앞두고 베이징 지지 | 2001-07 | 모스크바 IOC 총회 | 출처 추가 필요 | 중간 |
| | 결과(실제) | 베이징 2008 올림픽 개최 확정 | 2001-07-13 | 2차 투표 과반 획득 | 널리 알려진 사실 (출처 추가 필요) | 높음 |
| | 결과(**가상**) | 다른 도시 선정 | — | **사실 아님** | — | 가상 |
| s11 신종플루 | 잠정 | 남반구 겨울 확산, 가을 재유행 경고 | 2009-06 ~ 08 | WHO 대유행 6단계 선언 2009-06-11 (당일 74개국 28,774명) | [CIDRAP](https://www.cidrap.umn.edu/h1n1-2009-pandemic-influenza/who-declares-pandemic-novel-h1n1-virus) | 높음 |
| | 결과(실제) | 가을 대유행, 학생 접종 앞당김, 휴교·행사 취소 | 2009-10 ~ 11 | 서울 10-22 기준 1,089개 학교 학생 확진 9,378명, 학생 접종 11-11·13부터로 1주 앞당김. 전국 정점 시기는 미확인 | [세계일보](https://www.segye.com/newsView/20091030003472), [한국교육신문](https://hangyo.com/mobile/article.html?no=60549) | 중간 |
| | 결과(**가상**) | 재유행 없이 지나감 | — | **사실 아님** | — | 가상 |
| s12 한미 통화스와프 | 잠정 | 미 연준 신흥국 통화스와프 검토 보도 | 2008-10 | 구체 보도 일자 미확인 | 출처 추가 필요 | 중간 |
| | 결과(실제) | 300억 달러 통화스와프 체결, 환율 급락·증시 급반등 | 2008-10-30 | 원·달러 종가 1,250원(하루 -177원, 1997-12 이후 최대 하락), 코스피 +115.75p(당시 사상 최대 폭), 코스닥 +11.47% | [전북일보](https://www.jjan.kr/articleAmp/20081030287521), [아주경제](https://www.ajunews.com/view/20081030000033) | 높음 |
| | 결과(**가상**) | 협상 지연, 외화 불안 확대 | — | **사실 아님** | — | 가상 |

## 3. 검증하면서 바꾼 점 (데이터에 반영함)

1. **b23 카메라폰**: "1천만 대 돌파"는 출처를 찾지 못해 "휴대폰 판매의 절반 넘어"(2003년, 서울신문)로 고쳤다.
2. **b10 디지털카메라**: 국내 "판매 추월" 시점을 확인하지 못해 "보급 확산, 필름 수요 급감"으로 고쳤다.
3. **s04 금리 인상**: 정확한 일자(8월 7일)는 확인하지 못해 `realDate`를 "2008-08"로 두었다.
4. **s08 살처분 범위**: "반경 3km"는 최초 조치(반경 500m)와 달라 "발생 농장과 주변 농장"으로 고쳤다.
5. 게임 데이터의 근거 메모(`source.event`)에서 실명(카드사·투자은행·지수 이름)을 모두 뺐다. 실명은 이 문서에만 있다.

## 4. 직접 확인 권장

- s01·s05·s09·s10 잠정 뉴스의 세부 정황(병력 규모, 연체율 10%, 산유국 회의, 지지 표명)은 출처 미확보
- b22 인터넷 전화의 집 전화 가입자 감소 통계
- 대부분 뉴스의 "국내 관련 업종 주가 등락 폭"은 찾지 못했다. 현재 영향도는 사건 규모에 따른 판단값이다.

---

# 추가분 (뉴스 간격 3~4분 대응, 속보 27개 + 스토리 7개)

- 뉴스 간격이 3~4분으로 줄어 시대당 뉴스가 약 34개가 되면서 풀을 늘렸다. 전체: 속보 50개, 스토리 19개(opener 8개).
- 기존 항목은 바꾸지 않았다. 아래 항목만 새로 넣었다.
- 실명(기업·제품·지수)은 이 문서에만 적었다. 게임 데이터(`source.event` 포함)에는 일반 명사로만 썼다.
- 검색일: 2026-10-11.

## 5. 추가 속보 27개

| 뉴스 ID | 사실 주장(사건) | 실제 날짜 | 근거 수치 | 출처 | 확신도 |
|---|---|---|---|---|---|
| b24-esports-final | 부산 광안리 프로리그 결승(한빛 스타즈 vs SKT T1)에 관중 약 10만 명, 같은 날 사직 프로야구 올스타전보다 많음 | 2004-07-17 | 관중 10만 명은 주최 측 공식 집계가 아닌 언론 추산. 올스타전 관중 약 1만 5천 명 | [엑스포츠뉴스](https://www.xportsnews.com/article/14219), [전자신문](https://www.etnews.com/200508060053), [광안리 대첩(위키)](https://wiki.onul.works/w/%EA%B4%91%EC%95%88%EB%A6%AC_%EB%8C%80%EC%B2%A9) | 중간 |
| b25-broadband-10m | 초고속 인터넷 가입자 1,000만 명 돌파, 보급률 세계 1위 | 2002-09 말(잠정 통계, 10월 보도) | 서비스 시작(1998-07) 4년 2개월 만. 2001년 말 100명당 17.16명 세계 1위 | [서울신문 2002-10-02](https://www.seoul.co.kr/news/2002/10/02/20021002011004), [서울신문 2002-11-07](https://m.seoul.co.kr/news/2002/11/07/20021107010005) | 높음 |
| b26-bulk-freight-record | 발틱 건화물선 운임지수(BDI) 사상 최고 | 2008-05-20 | 11,793포인트(1985년 집계 시작 이후 최고) | [Wikipedia](https://en.wikipedia.org/wiki/Baltic_Dry_Index) | 높음 |
| b27-ship-orders-record | 세계 신규 선박 수주 사상 최대, 국내 조선소 수년 치 일감 | 2007 | 세계 신규 수주 1억 7,300만 GT(사상 최대). 한국 조선 연간 CGT 수치와 "후판 부족" 정도는 미확인 | [POSRI 보고서](https://www.posri.re.kr/upload/file_pdf/63/15863/63_15863_file_pdf_1557454896.pdf), [주간경향](https://weekly.khan.co.kr/article/11557) | 중간 |
| b28-yen-tourists | 엔고로 일본인 방한 급증, 한국인 일본 여행 감소 | 2009 | 2009-01 방한 일본인 23만 7,816명(전년 동월 +55.6%), 원·엔 100엔당 1,600원 돌파. 일본 규슈 외국인 숙박 -42%(한국인 감소 영향), 일본 입국 외국인 2009년 -18.7% | [경향신문](https://www.khan.co.kr/article/200903081745295/amp), [데일리팜](https://www.dailypharm.com/user/news/211874), [Fukuoka Now](https://www.fukuoka-now.com/en/news/foreign-lodgers-in-kyushu-decline-42-in-2009/) | 중간 |
| b29-fuel-surcharge | 고유가로 유류할증료 급등, 해외여행 증가세 둔화 | 2008 상반기 ~ 2008-09 | 2008 상반기 내국인 출국 +1.5%(2007년 약 +15%), 문체부는 고유가·환율을 주된 원인으로 봄. 국내선 유류할증료 최고치 2008-09 1만 7,600원. 국제선 최고 단계 금액은 미확인 | [문화체육관광부 보도자료](https://www.mcst.go.kr/site/s_notice/press/pressView.jsp?pSeq=9363), [뉴데일리 2022](https://biz.newdaily.co.kr/site/data/html/2022/06/09/2022060900074.amp.html) | 중간 |
| b30-number-portability | 이동전화 번호이동성 시행, 보조금·광고 경쟁 | 2004-01-01 (SK텔레콤 가입자부터 단계 시행) | 시행 이틀 만에 1만 2천여 명 이동, 맞대응 광고 경쟁 | [한국경제 사설](https://www.hankyung.com/amp/2004010471941), [주간경향](https://weekly.khan.co.kr/article/6026) | 높음 |
| b31-credit-delinquents | 신용불량자 380만 명 넘음 | 2004-04 말 | 382만 4천 명(2000년 말 200만 명 미만). 집계 기준에 따라 362만~397만 명 | [주간경향](https://weekly.khan.co.kr/article/201012301018501), [현대경제연구원](https://test.hri.co.kr/upload/board/BSR20040607_2.PDF) | 중간 |
| b32-six-party | 제4차 6자회담 9·19 공동성명(북한 핵 포기 약속) | 2005-09-19 | 검증 가능한 비핵화, NPT 복귀 등 6개 항. 국내 증시 반응 수치는 미확인 | [peoplepower21](https://peoplepower21.org/peace/571422), [통일교육원 자료](https://lib.uniedu.go.kr/libeka/elec/0000666040.pdf) | 중간 |
| b33-rail-test | 경의선·동해선 남북 열차 시험운행, 사전 군사 보장 조치 | 2007-05-17 | 이후 2007-12-11 도라산~판문 화물열차 정기 운행 | [KoreaScience](https://koreascience.or.kr/article/JAKO201118565336858.pdf), [프레시안](https://www.pressian.com/pages/articles/52040) | 높음 |
| b34-melamine | 중국산 분유 원료 과자에서 멜라민 검출, 회수·수입 금지 | 2008-09-24 ~ 10-06 | 해태 '미사랑 카스타드'(137ppm) 등. 최종 428개 품목 중 10개 검출 | [이투데이](https://www.etoday.co.kr/news/view/187456), [JoongAng Daily](https://www.koreajoongangdaily.com/korea/tainted-chinese-products-recalled/11309005) | 높음 |
| b35-dubai-debt | 두바이월드 채무 상환 6개월 유예 요청 | 2009-11-25 | 코스피 11-27 -4.7%(1,524), 건설주 하락(현대건설 -4.41% 등), 11-30 반등 | [JoongAng Daily](https://www.koreajoongangdaily.com/korea/dubais-financial-woes-batter-local-stocks/11377420), [Al Jazeera](https://www.aljazeera.com/news/2009/11/30/asia-stocks-up-as-dubai-fears-ease) | 높음 |
| b36-stem-cell | 서울대 조사위, 황우석 연구팀 줄기세포 논문 조작 결론 | 2006-01-10 | 2004·2005 사이언스 논문 데이터 조작, 맞춤형 줄기세포 없음. 바이오주 등락 수치는 미확인 | [VOA](https://www.voakorea.com/a/a-35-2006-01-10-voa4-91233334/1301542.html), [데일리팜](https://dailypharm.com/user/news/255640) | 높음 (주가 반응은 확인 필요) |
| b37-car-tax-cut | 노후차 교체 세제 지원(개별소비세·취득세·등록세 70% 감면) | 2009-05-01 ~ 12-31 | 2000년 이전 등록 차량 548만 대 대상, 차량당 최대 250만 원 | [이투데이](https://www.etoday.co.kr/news/view/217029), [아주경제](https://www.ajunews.com/view/20090413000054) | 높음 |
| b38-dram-maker-bankrupt | 독일 D램 업체 키몬다 파산 신청 | 2009-01-23 | D램 가격 폭락과 자금난. 업계 구조조정 시작 평가. 국내 반도체주 반응 수치는 미확인 | [IEEE Spectrum](https://spectrum.ieee.org/semiconductors/memory/update-germanys-dram-bailout-hits-a-snag-as-qimonda-goes-bankrupt), [BetaNews](https://betanews.com/2009/01/23/us-brightest-hope-for-dram-competitiveness-files-for-insolvency) | 높음 |
| b39-flat-tv-boom | 평판 TV 값 하락과 독일 월드컵 앞 판매 급증 | 2006 상반기 | 2006 1분기 세계 LCD TV 출하 740만 대(+135%), 81cm LCD TV 값 몇 년 전의 절반. 월드컵 효과는 제조사 발언 위주 | [Mail & Guardian](https://mg.co.za/article/2006-06-19-world-cup-fever-kicks-off-tv-sales), [Digitimes](https://www.digitimes.com/news/a20060707VL200.html) | 중간 |
| b40-chile-fta | 한·칠레 FTA 발효, 자동차·휴대폰 관세 즉시 철폐 | 2004-04-01 | 대칠레 수출 증가율 2003년 9.6% → 발효 1년차 58.2% | [매일신문](https://www.imaeil.com/page/view/2006030209332077009), [KREI](https://repository.krei.re.kr/bitstream/2018.oak/18190/1/%ed%95%9c%c2%b7%ec%b9%a0%eb%a0%88%20FTA%ed%98%91%ec%a0%95%20%eb%b0%9c%ed%9a%a8%20%ec%9d%b4%ed%9b%84%20%ec%9a%b0%eb%a6%ac%eb%82%98%eb%9d%bc%ec%9d%98%20%eb%86%8d%ec%82%b0%eb%ac%bc%20%ea%b5%90%ec%97%ad%20%eb%8f%99%ed%96%a5%ea%b3%bc%20%ec%8b%9c%ec%82%ac%ec%a0%90.pdf) | 높음 |
| b41-oil-spill | 태안 앞바다 허베이 스피리트호 원유 유출 | 2007-12-07 | 해상크레인과 충돌, 원유 12,547㎘ 유출, 양식장 피해. 관광객 감소 수치는 미확인 | [KoreaScience](https://www.koreascience.or.kr/article/JAKO200859349573873.pdf), [경향신문](https://www.khan.co.kr/article/201308071023031) | 중간 |
| b42-online-mall | 사이버쇼핑 거래액 연 10조 원 돌파 | 2005 | 2005년 10조 6,756억 원(2006년 13조 4,596억 원). "처음 넘었다"는 발표 기사는 미확인 | [경기일보](https://kyeonggi.com/article/201202230442587), [디지털타임스](https://www.dt.co.kr/article/10524151) | 중간 |
| b43-pilot-strike | 아시아나항공 조종사 노조 25일 파업, 긴급조정권으로 중단 | 2005-07-17 ~ 08-11 | 운항 차질 2,328편, 피해 2,270억 원(회사 추산), 화물 피해 포함 | [경향신문](https://www.khan.co.kr/article/200508111812361), [경향신문](https://www.khan.co.kr/article/200507291834241) | 높음 |
| b44-airport-protest | 태국 시위대(PAD) 방콕 수완나품 공항 점거, 전 항공편 취소 | 2008-11-25 ~ 12-03 | 승객 수천 명 발 묶임, 방콕 공항 승객 11월 -26%, 12월 -37%. 국내 여행사 취소 규모는 미확인 | [ABC News](https://abcnews.go.com/International/story?id=6338276), [Moodie Davitt](https://moodiedavittreport.com/turbulent-year-at-bangkok-suvarnabhumi-airport-draws-to-a-close-with-passenger-traffic-down-6-3-220109/) | 높음 |
| b45-slammer-worm | 1·25 인터넷 대란(슬래머 웜, MS-SQL 취약점) | 2003-01-25 | 약 7시간 전국 인터넷 마비(KT 혜화 DNS 마비). 쇼핑·증권 피해 수치는 미확인 | [전자신문](https://www.etnews.com/201209110599), [보안뉴스](https://m.boannews.com/html/detail.html?idx=79427) | 높음 |
| b46-won-strength | 원·달러 환율 930원 아래, 외환위기 이후 최저 | 2006-05-08 | 927.9원(2005년 말 1,011.6원), 1997-10 이후 최저. 섬유 업종만 다룬 기사는 미확인(본문은 일반적 영향으로 씀) | [경향신문](https://www.khan.co.kr/article/200605081833031/amp) | 중간 |
| b47-busan-port | 부산항 컨테이너 물동량 첫 1,000만 TEU | 2003 | 2003년 1,041만 TEU(2002년 946만 TEU). 돌파 발표 월은 미확인 | [부산시](https://www.busan.go.kr/Upload/EBook/public/menu3/sub4.jsp), [Freight News](https://www.freightnews.co.za/article/typhoon-devastates-busan-0?page=8) | 중간 |
| b48-instant-camera | 드라마 간접 광고 뒤 즉석카메라(후지필름 인스탁스) 인기, 필름 판매 증가 | 2007 ~ 2009 | '커피프린스 1호점'·'미녀는 괴로워' 등장 뒤 판매 증가(업계 블로그). 2010년 국내 누적 카메라 100만 대·필름 9,000만 장 | [Fujirumors](https://www.fujirumors.com/the-death-of-polaroid-and-rise-of-fujifilm-instax-thanks-to-asian-tv-series-brief-overview-and-history-of-an-unexpected-success), [아주경제](https://www.ajunews.com/view/20211223141249690) | 확인 필요 (연도별 판매 수치 없음) |
| b49-game-west | 엔씨소프트·아레나넷 '길드워' 북미·유럽 100만 장 판매(월정액 없음) | 2005-09-22 발표 (출시 04-28) | 5개월 만에 100만 장 | [Techgage](https://techgage.com/?p=3786), [Gaming Nexus](https://www.gamingnexus.com/News/810/Guild-Wars-surpasses-1-Million-units-sold-) | 높음 |
| b50-panama-canal | 파나마 운하 확장 국민투표 가결 | 2006-10-22 | 대형 선박(포스트 파나막스) 통과 가능. 국내 해운·조선 주가 반응은 미확인 | 널리 알려진 사실 (출처 추가 필요) | 중간 |

## 6. 추가 스토리 7개

| 스토리 | 뉴스 | 사실 주장 | 실제 날짜 | 근거 | 출처 | 확신도 |
|---|---|---|---|---|---|---|
| s13 한일 월드컵 (opener) | 잠정 | 평가전 선전(잉글랜드 1-1 무 등), 16강 기대 | 2002-05 | 프랑스전 직전 7경기 무패(3승 4무). "평판 TV 미리 구매"는 TV 판매 증가 보도를 근거로 씀 | [서울신문 2002-05-24](https://www.seoul.co.kr/news/2002/05/24/20020524017002), [서울신문 2002-06-07](https://www.seoul.co.kr/news/2002/06/07/20020607020006) | 중간 |
| | 결과(실제) | 4강 진출, 거리 응원, 맥주·치킨·TV 판매 급증 | 2002-06-22 (8강 승부차기 승) | 이탈리아전 날 맥주 85만 상자(당시 기록), 프로젝션 TV 한 달 판매 약 2배. 치킨 판매 수치는 미확인 | [사트경제(2006 기사)](https://www.sateconomy.co.kr/news/view/179586664924869), [서울신문 2002-06-07](https://www.seoul.co.kr/news/2002/06/07/20020607020006) | 중간 |
| | 결과(**가상**) | 조별리그 탈락 | — | **사실 아님** | — | 가상 |
| s14 UAE 원전 (opener) | 잠정 | 입찰 막바지, 한국 컨소시엄 가격·공기 우위 | 2009-12 | 최종 단계 경쟁(프랑스·미일 컨소시엄). "현지 좋은 평가" 보도는 출처 추가 필요 | [머니투데이](https://www.mt.co.kr/economy/2009/12/27/2009122716340918523) | 확인 필요 |
| | 결과(실제) | 한전 컨소시엄 UAE 원전 4기(APR1400) 수주 | 2009-12-27 | 건설 200억 달러, 운영 포함 400억 달러 추산(정부 발표). 시공 현대건설·삼성물산, 주기기 두산중공업 | [머니투데이](https://www.mt.co.kr/economy/2009/12/27/2009122716340918523), [이투데이](https://www.etoday.co.kr/news/view/277739) | 높음 (금액 기준은 기사마다 다름) |
| | 결과(**가상**) | 수주 실패 | — | **사실 아님** | — | 가상 |
| s15 중국 WTO 가입 | 잠정 | 15년 협상 막바지, 양자 협상 마무리 | 2001-09 ~ 11 | 1986년 가입 신청 이후 15년 | [USTR](https://www.ustr.gov/archive/Document_Library/Fact_Sheets/2001/Background_Information_on_China's_Accession_to_the_World_Trade_Organization.html) | 중간 |
| | 결과(실제) | 도하 각료회의에서 가입 승인 | 2001-11-10 (정식 가입 12-11, 143번째) | 국내 해운·철강 영향 수치는 미확인(영향도는 판단값) | [Wikipedia](https://en.wikipedia.org/wiki/World_Trade_Organization_Ministerial_Conference_of_2001), [Dawn](https://www.dawn.com/news/5801) | 높음 |
| | 결과(**가상**) | 가입 지연 | — | **사실 아님** | — | 가상 |
| s16 여수 세계박람회 | 잠정 | 투표 앞두고 여수 지지 확산 | 2007-11 | 경쟁 도시 탕헤르(모로코)·브로츠와프(폴란드) | [머니투데이](https://www.mt.co.kr/economy/2007/09/14/2007091416151434482) | 중간 |
| | 결과(실제) | 2012 세계박람회 여수 유치 확정 | 2007-11-26 (파리 BIE 총회, 2차 투표) | 득표수는 미확인 | [사트경제](https://sateconomy.co.kr/news/view/179588000496628) | 높음 |
| | 결과(**가상**) | 유치 실패 | — | **사실 아님** | — | 가상 |
| s17 미국 깜짝 금리 인하 | 잠정 | 미국 경기 둔화, 연준 성명 '경기 둔화 위험' 쪽으로 | 2000-12-19 FOMC | 성명의 위험 판단 변화(완화 신호). 1월 정례 회의 인하 전망 보도 | [서울신문 2001-01-03](https://m.seoul.co.kr/news/2001/01/03/20010103011001) | 중간 |
| | 결과(실제) | 연준 0.5%p 깜짝 인하, 나스닥 +14.17%(사상 최대) | 2001-01-03 | 1998-11 이후 첫 인하, 정례 회의 4주 전. 다음 날 원화 강세(1,238원 개장). 아시아 증시 반등 폭은 미확인 | [CNN Money](https://money.cnn.com/2001/01/03/markets/markets_newyork/), [경향신문 2001-01-04](https://www.khan.co.kr/article/200101041932061) | 높음 (국내 반응은 중간) |
| | 결과(**가상**) | 금리 동결 | — | **사실 아님** | — | 가상 |
| s18 해외 스마트폰 상륙 | 잠정 | 아이폰 국내 출시 협상, 위치정보 규제 해소 | 2009-10 ~ 11 | 방통위가 통신사 대행 허용으로 결론 | [아이뉴스24](https://www.inews24.com/view/1518044), [아주경제](https://www.ajunews.com/view/20091117000160) | 높음 |
| | 결과(실제) | KT 통해 아이폰3GS 정식 출시 | 2009-11-28 | 이후 100만 대 가까이 판매. 무선 데이터 증가·국산폰 점유율 수치는 미확인 | [기자협회보](https://www.journalist.or.kr/ezview/article_main.html?no=21819), [전자신문](https://m.etnews.com/200912010006) | 높음 |
| | 결과(**가상**) | 출시 무산 | — | **사실 아님** | — | 가상 |
| s19 전기차 배터리 공급 | 잠정 | GM 전기차 배터리 공급사 발표 앞둠, 국내 업체 유력 | 2008 말 ~ 2009 초 | "시험 평가 최고 점수" 보도는 출처 미확보 | — | 확인 필요 |
| | 결과(실제) | LG화학, GM 쉐보레 볼트 배터리 셀 단독 공급사 선정 | 2009 초 (2009-01 디트로이트 모터쇼 발표로 알려짐, 일자 확인 필요) | 2009-11 기사 "올해 초 단독 선정" | [머니투데이 2009-11-20](https://www.mt.co.kr/stock/2009/11/20/2009111911293490872), [머니투데이 2010-07-14](https://www.mt.co.kr/industry/2010/07/14/2010071407543497751) | 중간 |
| | 결과(**가상**) | 다른 나라 업체가 공급 | — | **사실 아님** | — | 가상 |

## 7. 추가분 직접 확인 권장

- b48 즉석카메라: 판매 증가 근거가 업계 블로그뿐이다. 연도별 국내 판매 수치를 찾지 못했다.
- s14 잠정(현지 평가), s19 잠정(시험 평가 1위)의 세부 정황은 출처를 찾지 못했다. s19 결과의 정확한 발표일도 확인하지 못했다.
- b27 한국 조선 연간 수주량, b29 국제선 유류할증료 최고 금액, b42 "10조 원 돌파" 첫 발표 시점, b47 돌파 월은 미확인.
- 이번 추가분도 영향도는 사건 규모에 따른 판단값이다(국내 업종별 실제 등락 폭은 대부분 미확인).
