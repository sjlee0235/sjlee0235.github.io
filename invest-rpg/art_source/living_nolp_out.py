# 15차: 거실 배경에서 옛 LP 플레이어만 지운다 (LP는 이제 따로 얹는 그림, assets/art/lp/).
# 받은 거실 PNG를 코드가 100% 다시 그리지는 못하므로(시대 소품 등 수백 점 차이), 디자이너 코드(gL.living_lv)로
# "LP를 그린 판"과 "LP를 빼고 그린 판"을 만들어 둘이 다른 점(= 옛 LP 자리)만 "LP 없는 판"의 색으로 바꾼다.
# 그 자리가 받은 PNG와 코드 그림이 다른 곳과 겹치면 멈춘다 (겹치지 않아야 정확히 지울 수 있다).
#   python3 living_nolp_out.py ../assets/art/scene
import sys
import numpy as np
from PIL import Image
import gL

out = sys.argv[1]
orig = gL.lp_player
for era in ('2000s', '2010s', '2020s'):
    for tod in ('night', 'day'):
        for lv in range(8):
            gL.lp_player = orig
            with_lp = gL.living_lv(era, tod, lv, dog=False).p.a.copy()
            gL.lp_player = lambda *a, **k: None
            no_lp = gL.living_lv(era, tod, lv, dog=False).p.a.copy()
            path = f'{out}/living_{era}_{tod}_lv{lv}.png'
            got = np.array(Image.open(path).convert('RGB'))
            lp = (with_lp != no_lp).any(axis=2)
            if not lp.any():
                print('LP 없음(이미 지움?)', path); continue
            clash = lp & (with_lp != got).any(axis=2)
            if clash.any():
                raise SystemExit(f'{path}: LP 자리 {int(clash.sum())}점이 코드 그림과 달라 정확히 지울 수 없음')
            got[lp] = no_lp[lp]
            Image.fromarray(got).save(path, optimize=True)
            print('지움', path, int(lp.sum()), '점')
gL.lp_player = orig
