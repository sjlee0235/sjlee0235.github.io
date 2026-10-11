"""hand-pixel dogs, side view, lying with head up, facing right (reference: classic outlined pixel dogs)"""
from pxl import *

DOG = {
 'pup':   dict(fur='#f4a23c', fur_d='#d9802a', cream='#fff0d8', ear='#c46a22'),
 'adult': dict(fur='#f08a2a', fur_d='#d06a1a', cream='#fff0d8', ear='#f08a2a'),
 'old':   dict(fur='#a8a6bc', fur_d='#8886a0', cream='#f2f0f8', ear='#8886a0'),
}
OL = '#1c1424'; DY = 10

def dog(p, stage, ox, oy, flip=False, pose='lie'):
    if pose.startswith('belly'):
        return dog_belly(p, stage, ox, oy, flip, 1 if pose == 'belly1' else 0)
    D = DOG[stage]; fur, furd, cream, earc = D['fur'], D['fur_d'], D['cream'], D['ear']
    sw, sh_ = 42, 40
    t = Px(sw, sh_, '#ff00ff'); BG = np.array(hx('#ff00ff'), np.uint8)
    E = lambda cx, cy, rx, ry: t.E(cx, cy + DY, rx, ry)
    R = lambda x, y, w, h: t.R(x, y + DY, w, h)
    RR = lambda x, y, w, h, r=1: t.RR(x, y + DY, w, h, r)
    Pp = lambda pts: t.P([(a, b + DY) for a, b in pts])
    Ln = lambda a, b, r=.6: t.L((a[0], a[1] + DY), (b[0], b[1] + DY), r)
    px = lambda x, y, c, w=1, h=1: t.px(x, y + DY, c, w, h)
    inner = lambda m: m & sh(m, 1, 0) & sh(m, -1, 0) & sh(m, 0, 1) & sh(m, 0, -1)
    if pose == 'lie':
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
    elif pose == 'sit':
        # upright sitting, facing right; ground line y~28.5
        if stage == 'pup': hcx, hcy, hrx, hry = 25, 10, 9.8, 8.8
        elif stage == 'adult': hcx, hcy, hrx, hry = 25, 9.5, 8.8, 8.0
        else: hcx, hcy, hrx, hry = 25, 11, 8.8, 7.8
        head = E(hcx, hcy, hrx, hry)
        # tail (behind, low)
        if stage == 'adult':
            t.obj(E(4.5, 24, 4.6, 4.2), fur); t.flat(E(4.2, 24.4, 1.6, 1.6), cream, ol=OL)
        elif stage == 'pup':
            t.obj(E(4.5, 26.5, 3.6, 2.2), fur)
        else:
            t.obj(E(4.0, 27, 4.2, 1.8), fur)
        torso = E(18, 19.5, 7.6, 9.5) & R(0, 0, 42, 29)
        t.obj(torso, fur)
        haunch = E(12.5, 23.5, 7.8, 5.6) & R(0, 0, 42, 29)
        t.obj(haunch, fur)
        hs = haunch; ring = hs & ~inner(hs)
        t.flat(E(23.2, 20, 3.0, 6.4) & inner(torso), cream)           # chest
        t.obj(RR(20, 18, 4, 10, 1), fur)                                 # front leg
        t.obj(E(23.6, 27.7, 3.8, 1.9), cream)                            # front paw
        px(21, 27, furd); px(23, 27, furd)
        t.obj(E(15.5, 27.6, 5.4, 1.8), cream)                            # hind paw
        px(13, 27, furd); px(16, 27, furd)
    else:
        # standing / walking, two frames: walk0, walk1
        happy = pose.startswith('happy'); wag = 1 if pose == 'happy1' else 0
        f = 1 if pose == 'walk1' else 0
        up = 1 if (f == 1 or wag) else 0             # body bobs up a pixel on frame 1
        if stage == 'pup': hcx, hcy, hrx, hry = 31, 11 - up, 9.6, 8.6
        elif stage == 'adult': hcx, hcy, hrx, hry = 31, 10.5 - up, 8.8, 8.0
        else: hcx, hcy, hrx, hry = 31, 13 - up, 8.8, 7.8
        head = E(hcx, hcy, hrx, hry)
        by = 17.5 - up
        # tail
        if stage == 'adult':
            tx_ = 5.5 - (2 if wag else 0); ty_ = by - 7 + (1 if wag else 0)
            t.obj(E(tx_, ty_, 4.8, 4.8), fur); t.flat(E(tx_, ty_ + .4, 1.8, 1.8), cream, ol=OL)
            t.obj(RR(6, by - 4, 4, 5, 1), fur)
        elif stage == 'pup':
            if wag: t.obj(RR(0, by - 5, 3, 5, 1), fur); t.obj(RR(2, by - 3, 3, 4, 1), fur)
            else: t.obj(RR(2, by - 6, 3, 6, 1), fur)
        else:
            t.obj(E(3.6 - (1 if wag else 0), by + 1 - (3 if wag else 0), 4.2, 2.2), fur)
        if happy and wag:
            px(0, int(by) - 9, OL, 1, 2); px(0 if stage != 'old' else 0, int(by) - 3, OL, 1, 2)
        legs = {0: dict(hn=6, hf=12, fn=26, ff=19), 1: dict(hn=10, hf=6, fn=22, ff=26)}[f]
        lh = 29 - (by + 3)
        # far legs (darker), then body, then near legs
        for k in ('hf', 'ff'):
            lx = legs[k]; t.obj(RR(lx, by + 3, 3, lh, 1), furd, hi=False)
            t.obj(RR(lx - 1, 27, 5, 2, 1), cream, hi=False)
        body = E(17, by + 1, 11.5, 6.0)
        t.obj(body, fur)
        t.flat(E(18, by + 5.4, 8.5, 1.7) & inner(body), cream)
        t.obj(E(25, by - 1, 5.2, 5.2) & ~body, fur, ol=None, hi=False, lo=False)
        for k in ('hn', 'fn'):
            lx = legs[k]; t.obj(RR(lx, by + 3, 3, lh, 1), fur)
            t.obj(RR(lx - 1, 27, 5, 2, 1), cream)
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
    if pose.startswith('happy'):
        # closed happy eye ^ and open smile with tongue
        px(ex, ey + 2, OL); px(ex + 1, ey + 1, OL, 2, 1); px(ex + 3, ey + 2, OL)
        nx = int(round(hcx + hrx - 2.4)); ny = int(round(hcy + 0.2))
        px(nx, ny, OL, 3, 2); px(nx, ny, '#7a6a8a')
        px(nx - 5, ny + 2, OL); px(nx - 4, ny + 3, OL, 5, 1); px(nx + 1, ny + 2, OL)
        px(nx - 4, ny + 4, '#8a2a3a', 5, 1); px(nx - 3, ny + 5, OL, 3, 1)
        px(nx - 3, ny + 4, '#ff6a84', 3, 1)
        px(int(hcx) - 1, int(hcy) + 2, '#ff9aa8', 3, 1)
        _blit(p, t, BG, ox, oy, flip); return
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
    _blit(p, t, BG, ox, oy, flip)

def _blit(p, t, BG, ox, oy, flip):
    m = ~np.all(t.a == BG, axis=2); spr = t.a
    if flip: spr = spr[:, ::-1]; m = m[:, ::-1]
    ys, xs = np.nonzero(m)
    for y, x in zip(ys, xs):
        yy, xx = oy + y - DY, ox + x
        if 0 <= yy < p.H and 0 <= xx < p.W: p.a[yy, xx] = spr[y, x]

def dog_belly(p, stage, ox, oy, flip, wag):
    """lying on its back, belly up, four paws in the air, happy face, tail wagging. ground y=29"""
    D = DOG[stage]; fur, furd, cream, earc = D['fur'], D['fur_d'], D['cream'], D['ear']
    t = Px(42, 40, '#ff00ff'); BG = np.array(hx('#ff00ff'), np.uint8)
    E = lambda cx, cy, rx, ry: t.E(cx, cy + DY, rx, ry)
    R = lambda x, y, w, h: t.R(x, y + DY, w, h)
    RR = lambda x, y, w, h, r=1: t.RR(x, y + DY, w, h, r)
    Pp = lambda pts: t.P([(a, b + DY) for a, b in pts])
    px = lambda x, y, c, w=1, h=1: t.px(x, y + DY, c, w, h)
    inner = lambda m: m & sh(m, 1, 0) & sh(m, -1, 0) & sh(m, 0, 1) & sh(m, 0, -1)
    belly_c = '#fff6e6' if stage != 'old' else '#f6f4fc'
    # tail (wags up / down), behind body at left
    ty = 24 - (3 if wag else 0)
    if stage == 'adult':
        t.obj(E(4.5, ty - 1, 4.4, 4.4), fur); t.flat(E(4.5, ty - .6, 1.6, 1.6), cream, ol=OL)
    elif stage == 'pup':
        t.obj(RR(1, ty - 4 + (0 if wag else 3), 3, 6, 1), fur)
    else:
        t.obj(E(3.6, ty, 4.2, 2.2), fur)
    # far legs (dark) pointing up
    for lx, top in ((11, 14), (21, 15)):
        t.obj(RR(lx, top, 3, 9, 1), furd, hi=False)
        t.obj(E(lx + 1.5, top + 1, 2.4, 2.2), cream, hi=False)
    # body (flat, belly up)
    body = E(16, 25, 12.5, 5.0) & R(0, 0, 42, 30)
    t.obj(body, fur)
    t.flat(E(16, 25.2, 9.6, 3.0) & inner(body), belly_c)
    px(13, 25, '#f0b0b0'); px(17, 26, '#f0b0b0'); px(21, 25, '#f0b0b0')
    # near legs
    for lx, top in ((7, 12 + wag), (17, 13 - wag)):
        t.obj(RR(lx, top, 3, 11, 1), fur)
        t.obj(E(lx + 1.5, top + 1, 2.6, 2.4), cream)
        px(lx + 1, top + 1, '#f0b0b0')
    # head resting on the ground, face up/right
    hcx, hcy, hrx, hry = 31, 22, 8.6, 7.4
    head = E(hcx, hcy, hrx, hry)
    t.flat(Pp([(hcx - 8, hcy + 3), (hcx - 4, hcy + 3), (hcx - 4, hcy + 6)]), fur)  # tiny neck filler
    if stage == 'adult':
        # ears fallen back/down
        t.obj(Pp([(hcx - 6, hcy + 1), (hcx - 12, hcy + 6), (hcx - 5, hcy + 6.5)]), fur)
        t.flat(Pp([(hcx - 6, hcy + 2.4), (hcx - 9.4, hcy + 5.4), (hcx - 5.6, hcy + 5.6)]), '#ff9aa8')
    t.obj(head, fur)
    ih = inner(head)
    t.flat(E(hcx + 3.0, hcy - 1.0, 6.2, 4.6) & ih, cream)     # muzzle region faces upward-right
    t.flat(E(hcx + 6.4, hcy + 1.0, 3.4, 3.0) & ih, cream)
    if stage == 'old': t.flat(E(hcx + 3.4, hcy, 7.0, 5.4) & ih, cream)
    if stage in ('pup', 'old'):
        t.obj(E(hcx - 5.0, hcy + 4.2, 3.2, 3.2), earc)         # floppy ear flopped to the ground
    # happy face (upside, eyes closed ^)
    ex, ey = int(hcx) + 0, int(hcy) - 3
    px(ex, ey + 2, OL); px(ex + 1, ey + 1, OL, 2, 1); px(ex + 3, ey + 2, OL)
    px(int(hcx) + 7, int(hcy) - 1, OL, 3, 2); px(int(hcx) + 7, int(hcy) - 1, '#7a6a8a')
    px(int(hcx) + 2, int(hcy) + 2, OL, 5, 1); px(int(hcx) + 1, int(hcy) + 1, OL); px(int(hcx) + 7, int(hcy) + 1, OL)
    px(int(hcx) + 3, int(hcy) + 3, '#ff6a84', 3, 2); px(int(hcx) + 3, int(hcy) + 5, OL, 3, 1)
    px(int(hcx) - 3, int(hcy) + 1, '#ff9aa8', 3, 1)
    # collar glimpse
    px(int(hcx) - 6, int(hcy) + 6, '#e23a46', 3, 1); px(int(hcx) - 5, int(hcy) + 7, '#ffd84a', 2, 1)
    _blit(p, t, BG, ox, oy, flip)


HEART = ["..XX.XX..", ".XaaXaaX.", "XaHaaaaaX", "XaaaaaaaX", ".XaaaaaX.", "..XaaaX..", "...XaX...", "....X...."]
HEART_S = [".XX.XX.", "XaHaaaX", "XaaaaaX", ".XaaaX.", "..XaX..", "...X..."]

def heart(p, cx, cy, big=True, a='#ff4a78', hi='#ffc4d4', ol='#7a1030'):
    g = HEART if big else HEART_S
    for j, row in enumerate(g):
        for i, c in enumerate(row):
            col = {'X': ol, 'a': a, 'H': hi}.get(c)
            if col:
                x, y = cx - len(row) // 2 + i, cy - len(g) // 2 + j
                if 0 <= x < p.W and 0 <= y < p.H: p.a[y, x] = np.array(hx(col), np.uint8)

def hearts(p, ox, oy, frame):
    """hearts floating around the body; ox,oy = sprite origin (same as dog()). 3 frames rise & drift."""
    base = [(5, 16, True), (14, 10, False), (26, 12, True), (40, 15, False)]    # sprite coords, all above the paws
    for k, (dx, dy, big) in enumerate(base):
        yy = dy - ((frame + k) % 3) * 2
        heart(p, ox + dx, oy - 0 + yy, big)


if __name__ == '__main__':
    poses = ('lie', 'sit', 'walk0', 'walk1')
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == 'touch': poses = ('happy0', 'happy1', 'belly0', 'belly1')
    p = Px(42 * 4 + 12, 40 * 3 + 8, '#fff6dc')
    for r, g in enumerate(('pup', 'adult', 'old')):
        for c, ps in enumerate(poses):
            dog(p, g, 2 + c * 44, 2 + r * 42 + DY, pose=ps)
    if poses[0] == 'happy0':
        for r, g in enumerate(('pup', 'adult', 'old')):
            hearts(p, 2 + 3 * 44, 2 + r * 42, 1)
    p.save('dogs/_poses.png' if poses[0] == 'lie' else 'dogs/_touch.png', 8)
