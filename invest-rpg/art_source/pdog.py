"""hand-pixel dogs, side view, lying with head up, facing right (reference: classic outlined pixel dogs)"""
from pxl import *

DOG = {
 'pup':   dict(fur='#f4a23c', fur_d='#d9802a', cream='#fff0d8', ear='#c46a22'),
 'adult': dict(fur='#f08a2a', fur_d='#d06a1a', cream='#fff0d8', ear='#f08a2a'),
 'old':   dict(fur='#a8a6bc', fur_d='#8886a0', cream='#f2f0f8', ear='#8886a0'),
}
OL = '#1c1424'; DY = 4

def dog(p, stage, ox, oy, flip=False):
    D = DOG[stage]; fur, furd, cream, earc = D['fur'], D['fur_d'], D['cream'], D['ear']
    sw, sh_ = 42, 34
    t = Px(sw, sh_, '#ff00ff'); BG = np.array(hx('#ff00ff'), np.uint8)
    E = lambda cx, cy, rx, ry: t.E(cx, cy + DY, rx, ry)
    R = lambda x, y, w, h: t.R(x, y + DY, w, h)
    RR = lambda x, y, w, h, r=1: t.RR(x, y + DY, w, h, r)
    Pp = lambda pts: t.P([(a, b + DY) for a, b in pts])
    Ln = lambda a, b, r=.6: t.L((a[0], a[1] + DY), (b[0], b[1] + DY), r)
    px = lambda x, y, c, w=1, h=1: t.px(x, y + DY, c, w, h)
    inner = lambda m: m & sh(m, 1, 0) & sh(m, -1, 0) & sh(m, 0, 1) & sh(m, 0, -1)
    if stage == 'pup':
        body = E(15, 21, 10.5, 5.6) & R(0, 0, 42, 26); hcx, hcy, hrx, hry = 24, 13, 9.8, 8.8
    elif stage == 'adult':
        body = E(15, 21, 12.5, 6.2) & R(0, 0, 42, 27); hcx, hcy, hrx, hry = 25, 12.5, 8.8, 8.0
    else:
        body = E(15, 22, 12.5, 5.6) & R(0, 0, 42, 27); hcx, hcy, hrx, hry = 25, 14, 8.8, 7.8
    head = E(hcx, hcy, hrx, hry)
    # ---- tail
    if stage == 'adult':
        t.obj(E(6, 14, 5.4, 5.4), fur); t.flat(E(6, 14.5, 2.0, 2.0), cream, ol=OL)
        t.obj(RR(7, 17, 5, 6, 1), fur)
    elif stage == 'pup':
        t.obj(E(3.6, 18.4, 3.6, 2.8), fur); t.obj(RR(1, 14, 3, 4, 1), fur)
    else:
        t.obj(E(2.6, 25.5, 4.2, 2.2), fur)
    # ---- body
    t.obj(body, fur)
    t.obj(E(9, 22.5, 5.4, 4.4) & body, fur, ol=None, hi=False, lo=False)
    hs = E(9, 22.5, 5.4, 4.4) & body
    ring = hs & ~inner(hs); t.a[ring & inner(body)] = np.array(hx(furd), np.uint8)
    t.flat(E(21, 25, 5.2, 3) & inner(body) & R(0, 23, 42, 6), cream)
    # ---- front legs + paws
    t.obj(RR(20, 24, 10, 3, 1), fur)
    t.obj(E(31.2, 26, 3.8, 2.3), cream)
    px(30, 25, furd); px(32, 25, furd)
    # ---- collar (behind chin)
    t.flat(Ln((hcx - 5.5, hcy + hry - 3), (hcx - 4, hcy + hry + 3), 1.1), '#e23a46')
    px(int(hcx - 5), int(hcy + hry + 3), '#ffd84a', 2, 2)
    # ---- ears (back / pointed)
    if stage == 'adult':
        t.obj(Pp([(hcx - 7, hcy - 4.5), (hcx - 5.5, hcy - 13), (hcx + 0.5, hcy - 6.5)]), fur)
        t.flat(Pp([(hcx - 5, hcy - 6), (hcx - 4.6, hcy - 10), (hcx - 1.6, hcy - 6.4)]), '#ff9aa8')
    # ---- head
    t.obj(head, fur)
    ih = inner(head)
    t.flat(E(hcx + 3.0, hcy + 3.8, 6.4, 4.0) & ih, cream)
    t.flat(E(hcx + 6.4, hcy + 1.6, 3.8, 3.0) & ih, cream)
    if stage == 'old':
        t.flat(E(hcx + 3.8, hcy + 2.6, 7.2, 5.2) & ih, cream)
    if stage == 'adult':
        t.obj(Pp([(hcx - 0.5, hcy - 6.5), (hcx + 5.8, hcy - 12.5), (hcx + 8.3, hcy - 3.6)]), fur)
        t.flat(Pp([(hcx + 2.0, hcy - 6.4), (hcx + 5.6, hcy - 9.8), (hcx + 6.8, hcy - 5)]), '#ff9aa8')
        t.obj(head, fur, ol=OL, hi=False, lo=False)  # re-cover ear base with head
        t.flat(E(hcx + 3.0, hcy + 3.8, 6.4, 4.0) & ih, cream); t.flat(E(hcx + 6.4, hcy + 1.6, 3.8, 3.0) & ih, cream)
    # floppy ear in front of head
    if stage == 'pup':
        t.obj(E(hcx - 3.2, hcy - 0.5, 3.3, 6.2), earc)
    elif stage == 'old':
        t.obj(E(hcx - 3.0, hcy + 1.5, 3.2, 6.2), earc)
        t.flat(E(hcx + 2.0, hcy - 3.6, 4.2, 1.3) & ih, cream)
    # ---- face
    ex = int(round(hcx + 1.6)); ey = int(round(hcy - 2.4))
    if stage == 'pup':
        px(ex, ey, OL, 3, 3); px(ex, ey, '#ffffff'); px(ex + 2, ey + 2, '#6a5a9a')
    elif stage == 'adult':
        px(ex, ey, OL, 2, 3); px(ex, ey, '#ffffff'); px(ex, ey - 2, '#f2b860', 2, 1)
    else:
        px(ex, ey, OL, 2, 3); px(ex, ey, '#ffffff'); px(ex - 1, ey - 2, '#c8c6dc', 4, 1) if False else None
    nx = int(round(hcx + hrx - 2.4)); ny = int(round(hcy + 0.2))
    px(nx, ny, OL, 3, 2); px(nx, ny, '#7a6a8a')
    px(nx - 4, ny + 3, OL, 5, 1)
    if stage != 'old': px(nx - 2, ny + 4, '#ff6a84', 2, 2)
    px(int(hcx) - 1, int(hcy) + 2, '#ff9aa8', 3, 1)
    # ---- composite
    m = ~np.all(t.a == BG, axis=2); spr = t.a
    if flip: spr = spr[:, ::-1]; m = m[:, ::-1]
    ys, xs = np.nonzero(m)
    for y, x in zip(ys, xs):
        yy, xx = oy + y - DY, ox + x
        if 0 <= yy < p.H and 0 <= xx < p.W: p.a[yy, xx] = spr[y, x]

if __name__ == '__main__':
    p = Px(42 * 3 + 8, 36, '#fff6dc')
    for i, g in enumerate(('pup', 'adult', 'old')):
        dog(p, g, 2 + i * 43, 2)
    p.save('dogs/_px.png', 10)
