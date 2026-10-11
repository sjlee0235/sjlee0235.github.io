# 작업실 배경 다시 만들기: 인형 가슴의 빨간 사각형+노란 점(국기처럼 보임)을 분홍 하트로 바꾸고,
# 눈 0·1·2개 세 장을 세로로 이어 붙인 시트로 굽는다 (화면은 눈 수에 맞는 칸을 보여 준다).
import sys, os, numpy as np
from PIL import Image
import gW, gL
from gP import dk

orig = gW.doll
EYES = [0]
HEART = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...']

def doll(S, ox, oy, k=1.0, eyes=1, base='#e8d0a8', hat='#58b0a0', detail=True):
    if k < 1 or not detail:
        return orig(S, ox, oy, k, eyes, base, hat, detail)
    orig(S, ox, oy, k, EYES[0], base, hat, False)
    p = S.p
    hx0, hy0 = ox + 9, oy + 24
    for y, row in enumerate(HEART):
        for x, c in enumerate(row):
            if c == 'X': p.px(hx0 + x, hy0 + y, '#e0507a')
    p.px(hx0 + 1, hy0 + 1, '#ffb8c8')

gW.doll = doll
out = sys.argv[1]; os.makedirs(out, exist_ok=True)
for era in ('2000s', '2010s', '2020s'):
    for tod in ('night', 'day'):
        for lv in range(8):
            frames = []
            for e in (0, 1, 2):
                EYES[0] = e
                frames.append(gL.workshop_lv(era, tod, lv).p.a)
            Image.fromarray(np.concatenate(frames, axis=0)).save(f'{out}/workshop_{era}_{tod}_lv{lv}.png', optimize=True)
print('ok')
