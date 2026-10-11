# 음악 라이선스 증빙 보관함

곡마다 아래 증빙을 이 폴더에 저장하고, `src/data/audio/music.json`의 `license.proofFile`(클래식은 `recordingLicense.proofFile`도)에 경로를 적는다.

- 파일 이름: `<곡 id>_license.<png|pdf|txt>` (예: `jazz-lounge-01_license.png`)
- 무료 라이선스(CC0·퍼블릭 도메인·CC-BY): 받은 날의 곡 페이지와 라이선스 표시 화면 캡처(주소창 포함)
- 구매(Purchased): 영수증과 라이선스 증서(PDF)
- 의뢰(Commissioned): 계약서 (상업적 이용·게임 포함 범위가 적힌 부분)
- AI로 만든 곡: 사용한 도구, 요금제, 상업적 이용을 허용하는 약관 화면 캡처 (`ai.commercialUseProof`)

점검: `npm run lint:audio` (출시 전에는 `npm run lint:audio -- --release`)
