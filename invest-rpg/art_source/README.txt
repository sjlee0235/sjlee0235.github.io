그림 원본 생성 코드 (Python 3 + numpy + pillow). 참고용 — 게임 안에서는 PNG를 쓰면 됩니다.
  gL.py   인테리어 0~7단계: living_lv(era,tod,lv) / workshop_lv(era,tod,lv) / tv_lv(era,tod,lv)  (130x281, 저장 때 3배)
          python3 gL.py out_dir   -> 2000s 거실·작업실 8단계 PNG (기본 해상도 x3)
  gP.py   팔레트 PAL(시대x시간대), 거실 부품 함수, save3()
  gW.py   작업실 부품(doll)
  pdog2.py 강아지 스프라이트: dog(p, stage, ox, oy, flip, pose)  pose = lie sit walk0 walk1 happy0 happy1 belly0 belly1
          hearts(p, ox, oy, frame) 하트 오버레이.  python3 pdog2.py [touch]  -> 시트 PNG
  icons.py UI 픽셀 아이콘 ASCII 격자 (ICONS)
  build5.py / build6.py  화면 HTML 생성기 (CSS 값·색 토큰·좌표 참고용. IBM Plex Sans KR 필요)
기본 해상도는 130x281 도트이고 저장 때 3배 확대(최근접). gL.py의 AMT = 단계별 채도 빼기 비율.

---- 게임 프로젝트에 넣으면서 추가한 것 ----
workshop_out.py  작업실 배경: 인형 가슴 무늬(빨간 사각형+노란 점)를 분홍 하트로 바꾸고, 눈 0·1·2개 세 장을 세로로 이어 붙인 시트로 굽는다
                 python3 workshop_out.py out_dir  -> workshop_{era}_{tod}_lv{n}.png (130x843, 원본 해상도)
tv_out.py        TV 홈쇼핑 배경: 지지직 노이즈 4프레임을 세로로 이어 붙인 시트 (프레임 0 = 받은 그림과 같음, 130x1124)
verify.py        다시 그린 장면이 받은 PNG와 같은지 확인 (작업실·TV는 픽셀까지 같음. 거실은 그대로 받은 PNG를 씀)
게임은 assets/art/scene/, assets/art/dog/ 의 PNG만 읽는다. 이 폴더의 코드는 그림을 다시 만들 때만 쓴다.
