# 그림 사양 (지금 쓰는 그림)

> 그림은 사용자가 준 **도트 시안**(`handoff_assets.zip`)을 그대로 쓴다. 기준 문서: `docs/DESIGN_HANDOFF.md` (3·5·6·8·14·16장).
> 예전에 코드로 그리던 임시 그림(`scripts/art/`, `npm run art`, `artManifest.json`)은 지웠다.

## 파일

| 종류 | 경로 | 크기 (도트) | 설명 |
|---|---|---|---|
| 거실 | `assets/art/scene/living_{era}_{night\|day}_lv{0..7}.png` | 130×281 | 받은 PNG 그대로 (강아지 없음) |
| 작업실 | `assets/art/scene/workshop_{era}_{night\|day}_lv{0..7}.png` | 130×843 | 눈 0·1·2개 세 칸을 세로로 이은 시트. 인형 가슴 무늬는 분홍 하트로 바꿈 |
| TV 홈쇼핑 | `assets/art/scene/tv_{era}_{night\|day}_lv{0..7}.png` | 130×1124 | 지지직 노이즈 4프레임 시트 (프레임 0 = 받은 그림) |
| 강아지 | `assets/art/dog/{pup\|adult\|old}_{lie\|sit\|walk0\|walk1\|happy0\|happy1\|belly0\|belly1}.png` | 42×40 | 오른쪽을 봄. 왼쪽은 좌우 반전. 발 y = 위쪽 y + 38 |
| 하트 | `assets/art/dog/hearts_{0\|1\|2}.png` | 48×40 | 강아지와 같은 기준점 |

- `{era}` = `2000s` / `2010s` / `2020s`. 그림이 없는 시대는 2000년대 그림을 쓴다 (`src/ui/art.ts`).
- 화면에서는 3배(도트 1개 = 3×3 픽셀)로, `image-rendering: pixelated`.
- 아이콘(코인·톱니·별·탭 4개·▶/▶▶·✕)은 시안의 격자(`icons.py`)에서 뽑은 SVG: `src/ui/icons.ts` (밤/낮 두 벌).

## 다시 만들기

`art_source/` (받은 파이썬 코드 + 추가한 `workshop_out.py`, `tv_out.py`, `icons_out.py`, `verify.py`). 자세한 것은 `art_source/README.txt`.
`tests/art.test.ts`가 파일 목록·크기를 확인한다.
