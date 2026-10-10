import sys, numpy as np
from PIL import Image
import gL
ref = sys.argv[1]
bad = 0
for kind, fn in (('living', gL.living_lv), ('workshop', gL.workshop_lv), ('tv', gL.tv_lv)):
    for era in ('2000s', '2010s', '2020s'):
        for tod in ('night', 'day'):
            for lv in range(8):
                Sx = fn(era, tod, lv) if kind != 'living' else fn(era, tod, lv, dog=False)
                a = Sx.p.a
                b = np.array(Image.open(f'{ref}/{kind}_{era}_{tod}_lv{lv}.png').convert('RGB'))
                d = int((a != b).any(axis=2).sum()) if a.shape == b.shape else -1
                if d: bad += 1; print(kind, era, tod, lv, 'diff px', d, a.shape, b.shape)
print('bad', bad)
