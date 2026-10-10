# TV 홈쇼핑 배경: 지지직 노이즈 4프레임을 세로로 이어 붙인 시트 (프레임 0 = 받은 그림과 같음)
import sys, os, numpy as np
from PIL import Image
import gL

_RS = np.random.RandomState
FRAME = [0]
class RS(_RS):
    def __init__(self, seed=None):
        super().__init__(seed + FRAME[0] * 101 if seed == 5 else seed)
gL.np.random.RandomState = RS

out = sys.argv[1]; os.makedirs(out, exist_ok=True)
for era in ('2000s', '2010s', '2020s'):
    for tod in ('night', 'day'):
        for lv in range(8):
            frames = []
            for f in range(4):
                FRAME[0] = f
                frames.append(gL.tv_lv(era, tod, lv).p.a)
            Image.fromarray(np.concatenate(frames, axis=0)).save(f'{out}/tv_{era}_{tod}_lv{lv}.png', optimize=True)
print('ok')
