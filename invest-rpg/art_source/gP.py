"""gP: classic hand-pixel scenes (130x281 native, x3). Flat colours, 1px dark outline, hi/lo bevel, hard-edged light bands."""
import sys, os, random
import numpy as np
from pxl import *
import pdog

W, H = 130, 281

PAL = {
 ('2000s', 'day'): dict(wall='#f0d8a0', wain='#a8683c', floor='#d9a060', sofa='#3aa8a0', cush='#f0b050', rug='#9a5aa8', rug2='#f6a0c0', dres='#b07840',
                        cur='#e0604a', shade='#fff0c0', sky='#6ab4f0', sky2='#c8e6fa', bld='#8aa0c0', frame='#b07840', trim='#8a5a34', stage='pup', deco='2000s'),
 ('2000s', 'night'): dict(wall='#34428a', wain='#4a2c5a', floor='#5a4258', sofa='#2f9a94', cush='#e0a850', rug='#8a4a9a', rug2='#f08ab4', dres='#6a4a5a',
                          cur='#a8384a', shade='#ffd890', sky='#0e1238', sky2='#1c2860', bld='#1c1c48', frame='#6a4a5a', trim='#2a2050', stage='pup', deco='2000s'),
 ('2010s', 'day'): dict(wall='#cfe2ee', wain='#8a6a50', floor='#e0c8a0', sofa='#3a78b8', cush='#f0a060', rug='#7ad0c8', rug2='#f6f0e0', dres='#c09060',
                        cur='#f6f2e8', shade='#fffbe0', sky='#7cc0f4', sky2='#d4eefc', bld='#a0b8d0', frame='#c09060', trim='#6a5a50', stage='adult', deco='2010s'),
 ('2010s', 'night'): dict(wall='#2a4a6a', wain='#2a3a52', floor='#3e4a5e', sofa='#3a6aa8', cush='#e89858', rug='#2a8a8a', rug2='#d8e4ec', dres='#5a4a5a',
                          cur='#b8c8d8', shade='#ffe8b0', sky='#0a1430', sky2='#183058', bld='#18284c', frame='#5a4a5a', trim='#1c2a40', stage='adult', deco='2010s'),
 ('2020s', 'day'): dict(wall='#b8d0a8', wain='#8a5a3c', floor='#c89868', sofa='#e0a040', cush='#4a9a88', rug='#4a8a78', rug2='#f4e4b8', dres='#8a5a3c',
                        cur='#d86a4a', shade='#fff0c8', sky='#f4a878', sky2='#fcd8a8', bld='#b0687c', frame='#8a5a3c', trim='#6a4430', stage='old', deco='2020s'),
 ('2020s', 'night'): dict(wall='#3a2a6a', wain='#2a1c48', floor='#4a3258', sofa='#d8903a', cush='#3aa090', rug='#6a3a8a', rug2='#f08ac0', dres='#5a3a4a',
                          cur='#d8506a', shade='#ffc890', sky='#140a38', sky2='#3a1a60', bld='#2a1a50', frame='#5a3a4a', trim='#1c1238', stage='old', deco='2020s'),
}


def dk(c, a=.25): return mix(c, '#14102a', a)
def lt(c, a=.25): return mix(c, '#ffffff', a)


class Scene:
    def __init__(s, era, tod, ground_y=174):
        s.era, s.tod = era, tod
        s.P = PAL[(era, tod)]
        s.night = tod == 'night'
        s.ol = '#0c0818' if s.night else '#2a1a30'
        s.p = Px(W, H, s.P['wall'])
        s.gy = ground_y

    def O(s, m, col, **k):
        k.setdefault('ol', s.ol)
        s.p.obj(m, col, **k)


# ---------------------------------------------------------------- structure
def wall(S, y_end=168, wainscot=True):
    p, P = S.p, S.P
    # wallpaper: vertical 2px stripes
    p.fill(p.R(0, 0, W, y_end), P['wall'])
    st = mix(P['wall'], '#000000' if S.night else '#ffffff', .07 if S.night else .22)
    for x in range(2, W, 12):
        p.px(x, 0, st, 2, y_end)
    # small motif dots between stripes
    mc = mix(P['wall'], '#000000', .10)
    for y in range(14, 112, 14):
        for x in range(8 + (y // 14 % 2) * 6, W, 12):
            p.px(x, y, mc, 1, 1)
    # crown moulding
    S.O(p.R(-2, -2, W + 4, 9), P['trim'])
    p.px(0, 7, mix(P['trim'], '#000000', .3), W, 1)
    if wainscot:
        S.O(p.R(-2, 117, W + 4, 3), lt(P['wain'], .12))
        S.O(p.R(-2, 119, W + 4, y_end - 119), P['wain'], hi=False)
        for i in range(4):
            x0 = 4 + i * 31
            S.O(p.RR(x0, 124, 26, 36, 1), mix(P['wain'], '#000000', .12), hi=False)
            p.px(x0 + 1, 125, mix(P['wain'], '#000000', .35), 24, 1)
            p.px(x0 + 1, 125, lt(P['wain'], .15), 1, 33)
        S.O(p.R(-2, y_end, W + 4, 6), dk(P['wain'], .2))


def floor(S, y0=174):
    p, P = S.p, S.P
    p.fill(p.R(0, y0, W, H - y0), P['floor'])
    seam = mix(P['floor'], '#2a1030', .45)
    a = P['floor']; b = mix(P['floor'], '#000000', .09)
    rows = []; y = y0; h = 5
    while y < H:
        rows.append((y, h)); y += h; h = min(h + 1, 9)
    for i, (ry, rh) in enumerate(rows):
        for k_, xx in enumerate(range(-((i * 7) % 18), W, 18)):
            col = a if (k_ + i) % 2 == 0 else b
            p.px(max(xx, 0), ry, col, min(18, W - max(xx, 0)) if xx >= 0 else xx + 18, rh)
            p.px(max(xx, 0), ry, seam, 1, rh)
        p.px(0, ry, seam, W, 1)
        p.px(0, ry + 1, lt(a, .10), W, 1) if False else None


def window(S, x=75, y=56, w=45, h=71):
    p, P = S.p, S.P
    S.O(p.RR(x - 3, y - 3, w + 6, h + 6, 1), P['frame'])
    win = p.R(x, y, w, h)
    p.fill(win, P['sky'])
    p.fill(win & p.R(x, y + int(h * .48), w, h), P['sky2'])
    p.fill(win & ~p.R(x, y, w, int(h * .48)) & ~p.R(0, 0, 0, 0), P['sky2'])
    p.fill(p.R(x, y, w, int(h * .48)), P['sky'])
    rng = random.Random(7 + hash(S.era) % 5)
    if S.night:
        for _ in range(16):
            sx, sy = x + rng.randint(1, w - 2), y + rng.randint(1, int(h * .5))
            p.px(sx, sy, '#ffffff' if rng.random() < .5 else '#9ab4ff')
        for sx, sy in ((x + 32, y + 8), (x + 9, y + 20)):
            p.px(sx - 1, sy, '#ffffff'); p.px(sx + 1, sy, '#ffffff'); p.px(sx, sy - 1, '#ffffff'); p.px(sx, sy + 1, '#ffffff')
        moon = p.E(x + 14, y + 14, 6.2, 6.2)
        p.fill(moon, '#fff3c0'); p.fill(moon & ~p.E(x + 17, y + 12, 5.4, 5.4), '#fff3c0')
        p.fill(moon & p.E(x + 17, y + 12, 5.4, 5.4), '#fff3c0') if False else None
        crescent = moon & ~p.E(x + 17.5, y + 12.5, 5.2, 5.2)
        p.fill(moon, mix(P['sky'], '#fff3c0', 0)); p.fill(crescent, '#fff3c0')
    else:
        sun = p.E(x + 33, y + 14, 6, 6)
        p.fill(p.E(x + 33, y + 14, 8, 8), lt(P['sky'], .35))
        p.fill(sun, '#ffe468'); p.fill(sun & ~sun.__class__(sh(sun, 1, 1)), '#ffe468') if False else None
        p.px(x + 31, y + 11, '#fffbd0', 2, 2)
        for cx, cy, sc in ((x + 12, y + 18, 1.0), (x + 30, y + 38, .8)):
            c = p.E(cx, cy, 8 * sc, 3.2 * sc) | p.E(cx - 4 * sc, cy - 2, 4 * sc, 3 * sc) | p.E(cx + 3 * sc, cy - 3, 4.4 * sc, 3.4 * sc)
            c &= win
            p.fill(c, '#ffffff'); p.fill(c & ~sh(c, 0, 1) & False, '#ffffff')
            low = c & ~sh(c, 0, -1)
            p.fill(low, '#cfe4f8')
    # skyline
    bx = x
    bc = P['bld']
    while bx < x + w:
        bw = rng.randint(8, 12); bh = rng.randint(12, 32)
        yy = y + h - bh
        m = p.R(bx, yy, bw, bh) & win
        p.fill(m, bc if rng.random() < .5 else dk(bc, .18))
        p.px(bx + bw - 1, yy, dk(bc, .3), 1, bh) if bx + bw - 1 < x + w else None
        for wy in range(yy + 3, y + h - 2, 4):
            for wx in range(bx + 2, bx + bw - 2, 3):
                if wx < x + w - 1:
                    on = rng.random() < (.45 if S.night else .25)
                    p.px(wx, wy, '#ffd870' if S.night and on else (mix(bc, '#ffffff', .35) if on else mix(bc, '#000000', .12)), 1, 2)
        bx += bw
    # mullions
    S.O(p.R(x + w // 2 - 1, y, 3, h), P['frame'], ol=S.ol)
    S.O(p.R(x, y + int(h * .56), w, 3), P['frame'], ol=S.ol)
    # sill
    S.O(p.R(x - 6, y + h + 2, w + 12, 4), lt(P['frame'], .15))
    # glass sheen
    p.px(x + 3, y + 3, lt(P['sky'], .5), 1, 8)
    p.px(x + 5, y + 3, lt(P['sky'], .5), 1, 4)


def curtains(S):
    p, P = S.p, S.P
    c0 = P['cur']
    for x0 in (65, 119):
        m = p.RR(x0, 51, 11, 80, 1)
        S.O(m, c0)
        for fx in (x0 + 3, x0 + 7):
            p.px(fx, 54, dk(c0, .22), 1, 75)
        p.px(x0 + 1, 52, lt(c0, .25), 1, 76)
        # tie
        S.O(p.R(x0, 100, 11, 3), '#f2c44a')
        # hem
        p.px(x0 + 1, 128, dk(c0, .3), 9, 1)
    S.O(p.RR(60, 47, 76, 3, 1), '#f2c44a')
    for fx in (59, 134):
        S.O(p.RR(fx - 1, 45, 4, 7, 1), '#f2c44a')


def painting(S, x=11, y=67, w=31, h=24):
    p, P = S.p, S.P
    S.O(p.RR(x - 2, y - 2, w + 4, h + 4, 1), '#f2c44a')
    sky = P['sky'] if not S.night else '#2a3a8a'
    p.fill(p.R(x, y, w, h), sky)
    p.fill(p.R(x, y + 11, w, h - 11), P['sky2'] if not S.night else '#3a4a9a')
    hill = p.E(x + 10, y + h + 5, 17, 11) & p.R(x, y, w, h)
    p.fill(hill, '#4aa05a' if not S.night else '#1c5a46')
    p.fill(p.E(x + 26, y + h + 6, 14, 9) & p.R(x, y, w, h), '#3a8a4c' if not S.night else '#144a3a')
    p.fill(p.E(x + 23, y + 6, 2.8, 2.8), '#fff0a0')
    p.px(x + 8, y + 12, '#f06a8a', 1, 1); p.px(x + 13, y + 14, '#ffd84a', 1, 1)


def clock(S, cx=56, cy=70, r=5):
    p = S.p
    S.O(p.E(cx, cy, r, r), '#fff6dc')
    p.px(cx, cy - 3, S.ol, 1, 4); p.px(cx, cy, S.ol, 2, 1)
    p.px(cx, cy - r + 1, '#e04a3a')
    S.O(p.R(cx - 1, cy + r + 1, 3, 7), '#f2c44a')
    S.O(p.E(cx, cy + r + 9, 2, 2), '#f2c44a')


def shelf_books(S, x=8, y=84, w=47):
    p, P = S.p, S.P
    cols = ['#e0604a', '#4f9ac0', '#f2c44a', '#58b070', '#9a6ad0', '#f2e0b8', '#6a7ad0']
    bx = x + 2
    for i, c0 in enumerate(cols):
        bh = 9 + (i * 3) % 5; bw = 3 + (i % 2)
        S.O(p.R(bx, y - bh, bw, bh), c0)
        bx += bw + 1
    S.O(p.RR(bx + 2, y - 7, 7, 7, 1), '#e0604a')
    S.O(p.E(bx + 5.5, y - 11, 3.4, 3.4), '#58b070')
    S.O(p.R(x - 2, y, w + 4, 3), P['dres'])
    # second shelf
    S.O(p.R(x - 2, y + 22, w + 4, 3), P['dres'])
    for i, c0 in enumerate(['#f2c44a', '#e0604a', '#4f9ac0']):
        S.O(p.RR(x + 4 + i * 11, y + 11, 9, 11, 1), c0)
    S.O(p.RR(x + 38, y + 14, 6, 8, 1), '#f2e0b8')


def abstract_art(S, x=11, y=65, w=29, h=35):
    p = S.p
    S.O(p.R(x - 1, y - 1, w + 2, h + 2), '#2a2438')
    p.fill(p.R(x, y, w, h), '#f6ecd8' if not S.night else '#c8c0d8')
    S.O(p.E(x + 11, y + 12, 6, 6), '#e0503a')
    S.O(p.R(x + 16, y + 10, 8, 17), '#4f9ac0')
    p.px(x + 3, y + h - 5, S.ol, w - 6, 1)
    p.px(x + 5, y + 4, '#f2c44a', 8, 2)


def dresser(S, x=8, y=155):
    p, P = S.p, S.P
    c0 = P['dres']
    for fx in (x + 3, x + 40):
        S.O(p.R(fx, y + 35, 4, 5), dk(c0, .25))
    S.O(p.RR(x, y + 3, 47, 34, 1), c0)
    for yy in (y + 7, y + 21):
        S.O(p.RR(x + 3, yy, 41, 12, 1), lt(c0, .06))
        S.O(p.R(x + 20, yy + 4, 7, 3), '#f2c44a')
    S.O(p.R(x - 2, y, 51, 4), lt(c0, .15))


def lp_player(S, x=13, y=129):
    p, P = S.p, S.P
    S.O(p.RR(x, y, 39, 25, 2), '#5a4458' if not S.night else '#3a2a48')
    cx_, cy_ = x + 17, y + 12
    S.O(p.E(cx_, cy_, 14, 7.5), '#1c1830')
    rg = lambda a, b: p.E(cx_, cy_, a, b) & ~p.E(cx_, cy_, a - 1, b - 1)
    p.fill(rg(11, 6), '#3a3458'); p.fill(rg(8.5, 4.6), '#3a3458')
    p.fill(p.E(cx_, cy_, 4, 2.4), P['sofa'])
    p.px(cx_, cy_, '#fff6dc')
    # tonearm
    p.fill(p.L((x + 34, y + 5), (x + 24, y + 11), .7), '#e8e4f0')
    S.O(p.E(x + 34, y + 5, 2.2, 2.2), '#e8e4f0')
    for i in range(3):
        S.O(p.E(x + 5 + i * 5, y + 21, 1.8, 1.8), '#e8e4f0', hi=False, lo=False)
    p.px(x + 31, y + 20, '#ff5a40', 2, 2)


def lamp(S, x=60):
    p, P = S.p, S.P
    S.O(p.R(x, 121, 2, 77), '#d8a850')
    S.O(p.E(x + 1, 197, 6, 2), '#d8a850')
    sh_ = p.P([(x - 6, 107), (x + 8, 107), (x + 11, 121), (x - 9, 121)])
    S.O(sh_, P['shade'], hi=True, lo=True, hicol='#ffffff', locol=dk(P['shade'], .22))
    S.O(p.E(x + 1, 106, 1.5, 1.5), '#d8a850', hi=False, lo=False)


def sofa(S, x=65, y=143):
    p, P = S.p, S.P
    c0, cu = P['sofa'], P['cush']
    p.tint(p.E(x + 31, y + 48, 33, 3), '#000000', .22)
    for lx in (x + 3, x + 53):
        S.O(p.R(lx, y + 43, 4, 5), '#5a3a2a')
    S.O(p.RR(x + 3, y, 55, 30, 4), c0)
    for i in range(3):
        S.O(p.RR(x + 8 + i * 15, y + 4, 14, 20, 3), c0)
        p.px(x + 10 + i * 15, y + 8, lt(c0, .3), 1, 8)
    for ax in (x, x + 52):
        S.O(p.RR(ax, y + 13, 9, 31, 4), c0)
    S.O(p.RR(x + 8, y + 24, 45, 16, 3), c0)
    p.px(x + 22, y + 26, dk(c0, .28), 1, 13); p.px(x + 37, y + 26, dk(c0, .28), 1, 13)
    # throw cushion
    S.O(p.RR(x + 40, y + 22, 12, 12, 3), cu)
    p.px(x + 46, y + 24, dk(cu, .25), 1, 8)
    p.px(x + 43, y + 25, lt(cu, .4), 2, 1)


def rug(S, cx=94, cy=224, rx=40, ry=10):
    p, P = S.p, S.P
    m = p.E(cx, cy, rx, ry)
    S.O(m, P['rug'], lo=False)
    rho = np.sqrt(((p.X - cx) / rx) ** 2 + ((p.Y - cy) / ry) ** 2)
    p.fill((rho > .78) & (rho < .9) & m, P['rug2'])
    p.fill((rho > .50) & (rho < .58) & m, dk(P['rug'], .15))
    for k in range(-5, 6):
        ax = int(cx + k * 6.4)
        p.px(ax, int(cy - 0.5), P['rug2'], 2, 2)
    # fringe
    for fx in range(int(cx - rx) - 2, int(cx - rx) + 2, 2):
        p.px(fx, int(cy), P['rug2'], 1, 1)


def news_stack(S, x=12, y=224):
    p = S.p
    for i in range(4):
        yy = y + 8 - i * 3; off = (i * 2) % 3 - 1
        S.O(p.R(x + off, yy, 27, 3), '#f2ecd8' if i % 2 == 0 else '#e0d4b0', hi=False)
    p.px(x + 4, y - 3, S.ol, 19, 1); p.px(x + 4, y - 1, '#8f8472', 12, 1)
    # small mug (steam)
    mx, my = x + 19, y - 8
    S.O(p.R(mx, my, 8, 7), '#e06a4a')
    S.O(p.E(mx + 9, my + 3.5, 2, 2.2), '#e06a4a', hi=False, lo=False)
    p.px(mx + 2, my - 4, '#ffffff', 1, 2); p.px(mx + 4, my - 6, '#ffffff', 1, 2)


def plant(S, x=122, y=187):
    p = S.p
    for dx, dy, r in ((0, -22, 4), (-6, -16, 4), (6, -15, 4), (-2, -9, 4.4)):
        S.O(p.E(x + dx, y + dy, r, r * 1.35), '#4aa05a', lo=True)
    p.px(x - 1, y - 8, '#2a6a3a', 2, 8)
    S.O(p.RR(x - 6, y, 12, 9, 2), '#d8603a')
    p.px(x - 5, y + 2, lt('#d8603a', .3), 10, 1)


def tv_stand_none(S): pass


def deco(S):
    d = S.P['deco']
    if d == '2000s': painting(S); clock(S)
    elif d == '2010s': shelf_books(S)
    else: abstract_art(S)


# ---------------------------------------------------------------- lighting
def lighting(S):
    p, P = S.p, S.P
    if S.night:
        # moon patch on floor (window projection)
        patch = p.P([(70, 176), (108, 176), (96, 212), (48, 212)])
        p.tint(patch & p.R(0, 174, W, 60), '#9ab4ff', .16)
        # lamp pool
        p.bands(61, 150, 46, 58, '#ffb04a', (.14, .14, .14), shrink=.66)
        p.bands(61, 204, 40, 12, '#ffb04a', (.12, .12), shrink=.62)
    else:
        patch = p.P([(76, 176), (118, 176), (104, 214), (56, 214)])
        m = patch & p.R(0, 174, W, 60)
        p.tint(m, '#fff2a8', .30)
        # window mullion shadow cross
        p.tint(m & p.R(0, 0, W, 300) & (p.R(86, 170, 4, 60) | p.R(0, 190, W, 3)), '#c07830', .14)
        # soft ambient on wall near window
        p.tint(p.R(66, 51, 62, 80) & ~p.R(0, 0, 0, 0) & p.P([(66, 131), (130, 131), (130, 51), (110, 51)]), '#ffffff', 0)


def place_dog(S, ox=70, oy=196):
    p = S.p
    before = p.a.copy()
    pdog.dog(p, S.P['stage'], ox, oy)
    d = np.any(p.a != before, axis=2)
    # shadow under dog
    if S.night:
        p.tint(d, '#2a2a6a', .20)
    return d


def living(era, tod, dog=True):
    S = Scene(era, tod)
    wall(S); floor(S); deco(S)
    window(S); curtains(S)
    rug(S)
    lighting(S)
    dresser(S); lp_player(S); lamp(S)
    sofa(S)
    if S.P['deco'] == '2020s': plant(S)
    news_stack(S)
    p = S.p
    p.tint(p.E(94, 228, 26, 3), '#000000', .22)
    if dog: place_dog(S, 68, 205 if S.P['stage'] != 'pup' else 205)
    return S


def save3(S, path):
    S.p.save(path, scale=3, pad_to=844)


if __name__ == '__main__':
    out = sys.argv[1]; os.makedirs(out, exist_ok=True)
    for a in sys.argv[2:]:
        kind, era, tod = a.split(':')
        if kind == 'living':
            save3(living(era, tod), f'{out}/P_living_{era}_{tod}.png')
    print('ok')
