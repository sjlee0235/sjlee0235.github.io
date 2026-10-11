"""gL: interior levels 0..7 for living room and workshop (130x281 native).
Lv0 = bare, dingy room; each 1000-coin upgrade brings a piece of furniture; Lv7 = the finished room (old 'rich' design)."""
import sys, os, random
import numpy as np
from pxl import *
import gP, gW, pdog2
from gP import (Scene, wall, floor, window, curtains, rug, deco, dresser, lp_player, lamp, plant, news_stack,
                dk, lt, W, H, PAL)

KEYS = ['wall', 'wain', 'floor', 'sofa', 'cush', 'rug', 'rug2', 'dres', 'cur', 'frame', 'trim']
AMT = [.60, .50, .40, .30, .20, .12, .05, 0.0]     # desaturation per level
LEVEL_NAMES = ['처음 상태', '중고 소파', '창문 정리·커튼', '서랍장', '도배·바닥·러그', '스탠드 조명', '벽 장식·장식 커튼', '화분·쿠션·큰 러그']


def gray(c, a):
    r, g, b = hx(c); l = int(.3 * r + .59 * g + .11 * b)
    return mix(c, '#%02x%02x%02x' % (l, l, l), a)


class SceneL(Scene):
    def __init__(s, era, tod, lv, ground_y=174):
        super().__init__(era, tod, ground_y)
        s.lv = lv
        P = dict(s.P)
        for k in KEYS:
            c = gray(P[k], AMT[lv])
            P[k] = mix(c, '#1a1410' if s.night else '#5a4630', .12 * (7 - lv) / 7)
        s.P = P

    def nt(s, c):
        """colour for a fixed-colour prop: darker / bluer at night"""
        return mix(c, '#20184a', .42) if s.night else c


# ------------------------------------------------------------ dingy shell (levels 0-3)
def baseboard(S, y_end):
    S.O(S.p.R(-2, y_end, W + 4, 6), dk(S.P['wain'], .2))


def dingy_wall(S, y_end=168, cracks=True):
    p, P = S.p, S.P
    p.fill(p.R(0, 0, W, y_end), P['wall'])
    seam = mix(P['wall'], '#000000', .07)
    for x in (31, 62, 93, 124): p.px(x, 0, seam, 1, y_end)
    dkc = mix(P['wall'], '#000000', .20)
    for cx, cy, rx, ry in ((116, 14, 15, 7), (106, 26, 8, 5), (14, 12, 10, 5)):
        m = p.E(cx, cy, rx, ry)
        p.tint(m, '#6a5028', .18); p.tint(m & ~p.E(cx, cy, rx - 2, ry - 1.5), '#3a2810', .12)
    for x, y0, y1 in ((112, 26, 62), (108, 30, 48), (16, 16, 40)):
        p.px(x, y0, dkc, 1, y1 - y0)
    # mould in the low corner
    for cx, cy, rx, ry in ((6, 158, 6, 4), (12, 162, 5, 3), (4, 148, 3, 4)):
        p.tint(p.E(cx, cy, rx, ry), '#2a3a2a', .35)
    if cracks:
        pts = [(46, 8), (49, 22), (45, 34), (49, 50), (47, 60)]
        for a, b in zip(pts, pts[1:]): p.fill(p.L(a, b, .5), mix(P['wall'], '#000000', .5))
    # torn wallpaper
    S.O(p.P([(54, 100), (68, 98), (70, 114), (56, 116)]), lt(P['wall'], .16), hi=False, lo=False, ol=dkc)
    p.px(55, 101, mix(P['wall'], '#000000', .3), 12, 1)
    baseboard(S, y_end)


def vinyl_floor(S, y0=174):
    p, P = S.p, S.P
    p.fill(p.R(0, y0, W, H - y0), P['floor'])
    a = mix(P['floor'], '#000000', .07); seam = mix(P['floor'], '#000000', .22)
    for i, y in enumerate(range(y0, H, 13)):
        for j, x in enumerate(range(-(13 if i % 2 else 0), W, 26)):
            m = p.R(x, y, 26, 13) & p.R(0, y0, W, H - y0)
            p.fill(m, a if (i + j) % 2 == 0 else P['floor'])
    for y in range(y0 + 13, H, 13): p.px(0, y, seam, W, 1)
    # stains and a scorch mark
    for cx, cy, rx, ry in ((30, 250, 9, 3.5), (108, 262, 12, 4), (60, 232, 5, 2)):
        p.tint(p.E(cx, cy, rx, ry), '#1a1008', .20)
    p.tint(p.E(24, 214, 3, 2), '#000000', .45)
    # torn corner showing the concrete
    p.fill(p.P([(112, 270), (130, 266), (130, 281), (116, 281)]), mix(P['floor'], '#8a8a8a', .5))
    p.px(113, 271, seam, 17, 1)


# ------------------------------------------------------------ props
def notice(S, x, y, w=14, h=18):
    p = S.p
    S.O(p.R(x, y, w, h), S.nt('#f2eee2'), hi=False, lo=False)
    p.px(x, y, '#c83a3a' if not S.night else '#8a2a40', w, 4)
    for i, yy in enumerate(range(y + 6, y + h - 4, 3)):
        p.px(x + 2, yy, S.nt('#9a9488'), w - 4 - (i % 2) * 3, 1)
    p.px(x + w - 6, y + h - 5, '#c83a3a' if not S.night else '#8a2a40', 4, 3)
    tape = S.nt('#e8d890')
    p.px(x - 1, y - 1, tape, 3, 2); p.px(x + w - 2, y - 1, tape, 3, 2)


def cup(S, x, y):
    p = S.p
    body = p.P([(x, y), (x + 10, y), (x + 8, y + 10), (x + 2, y + 10)])
    S.O(body, S.nt('#f4f0e4'))
    p.fill(body & p.R(x, y + 3, 11, 3), S.nt('#e04a3a'))
    S.O(p.R(x - 1, y - 2, 12, 2), S.nt('#e8e4d8'), hi=False)
    p.px(x + 8, y - 8, S.nt('#d8b070'), 1, 6); p.px(x + 5, y - 7, S.nt('#d8b070'), 1, 5)


def mattress(S):
    p = S.p
    S.O(p.RR(70, 201, 58, 12, 2), S.nt('#d8d0c0'))
    blanket = S.nt(gray('#6a86b0', .35))
    S.O(p.RR(76, 195, 44, 12, 3), blanket)
    for i in range(5): p.px(80 + i * 8, 197, dk(blanket, .22), 2, 9)
    p.px(77, 204, dk(blanket, .3), 42, 1)
    S.O(p.RR(112, 192, 14, 9, 3), S.nt('#f0ecf0'))
    p.px(114, 195, S.nt('#c8c4d0'), 8, 1)


def boxes(S):
    p = S.p
    k = S.nt('#c8a070'); tp = S.nt('#e8d8a8')
    S.O(p.R(6, 172, 40, 28), k)
    p.px(24, 172, tp, 6, 28); p.px(7, 180, dk(k, .25), 38, 1); p.px(10, 190, dk(k, .35), 11, 1); p.px(10, 193, dk(k, .35), 7, 1)
    S.O(p.R(7, 152, 39, 20), S.nt('#d2aa78'))
    p.px(24, 152, tp, 6, 20); p.px(8, 160, dk(k, .25), 37, 1); p.px(33, 164, dk(k, .35), 9, 1)
    S.O(p.R(44, 188, 18, 12), S.nt('#b89060'), hi=False)


def sofa_w(S, x=65, y=143, cushion=False, worn=True):
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
    if worn:
        patch = mix(c0, '#c8b080', .45)
        S.O(p.R(x + 11, y + 8, 7, 6), patch, hi=False, lo=False, ol=dk(c0, .4))
        p.px(x + 12, y + 9, dk(patch, .35), 5, 1); p.px(x + 12, y + 12, dk(patch, .35), 5, 1)
        S.O(p.R(x + 40, y + 27, 8, 5), mix(c0, '#a89888', .45), hi=False, lo=False, ol=dk(c0, .4))
        p.px(x + 1, y + 22, '#e0d8c8', 2, 3); p.px(x + 2, y + 21, dk(c0, .45), 1, 1)   # stuffing from a tear
        p.tint(p.E(x + 30, y + 31, 6, 2), '#000000', .16)
    if cushion:
        S.O(p.RR(x + 40, y + 22, 12, 12, 3), cu)
        p.px(x + 46, y + 24, dk(cu, .25), 1, 8); p.px(x + 43, y + 25, lt(cu, .4), 2, 1)


def newspaper_window(S, x=75, y=56, w=45, h=71):
    p = S.p
    paper = S.nt('#e4dcc4'); ink = S.nt('#7a7468'); tape = S.nt('#e8d890')
    pieces = [(x + 1, y + 34, 21, 33), (x + 23, y + 41, 20, 26), (x + 4, y + 4, 15, 17), (x + 26, y + 10, 14, 12)]
    for (px_, py_, pw, ph) in pieces:
        S.O(p.R(px_, py_, pw, ph), paper, hi=False, lo=False, ol=dk(paper, .45))
        p.px(px_ + 2, py_ + 2, ink, pw - 6, 2)
        for yy in range(py_ + 6, py_ + ph - 2, 3):
            p.px(px_ + 2, yy, ink, pw - 4 - ((yy // 3) % 3) * 2, 1)
        p.px(px_ - 1, py_ - 1, tape, 4, 2); p.px(px_ + pw - 3, py_ - 1, tape, 4, 2)
        p.px(px_ - 1, py_ + ph - 1, tape, 4, 2); p.px(px_ + pw - 3, py_ + ph - 1, tape, 4, 2)


def curtains_simple(S):
    p, P = S.p, S.P
    c0 = P['cur']
    for x0 in (66, 118):
        S.O(p.RR(x0, 52, 9, 62, 1), c0)
        for fx in (x0 + 3, x0 + 6): p.px(fx, 54, dk(c0, .22), 1, 58)
        p.px(x0 + 1, 53, lt(c0, .22), 1, 58); p.px(x0 + 1, 112, dk(c0, .3), 7, 1)
    S.O(p.R(62, 48, 70, 2), S.nt('#5a4a40'), hi=False)


def bulb(S, x=62):
    p = S.p
    p.px(x, 0, S.nt('#3a3028'), 1, 31)
    S.O(p.R(x - 2, 31, 5, 5), S.nt('#4a4038'), hi=False)
    on = S.night
    S.O(p.E(x + .5, 41, 4.4, 5.2), '#fff4b8' if on else S.nt('#d8d0b0'))
    if on:
        p.tint(p.E(x + .5, 41, 10, 10) & ~p.E(x + .5, 41, 5.5, 6.3), '#ffe890', .24)


def lighting_lv(S):
    p, P = S.p, S.P
    if S.lv >= 5 or not S.night:
        gP.lighting(S); return
    patch = p.P([(70, 176), (108, 176), (96, 212), (48, 212)])
    p.tint(patch & p.R(0, 174, W, 60), '#9ab4ff', .16)
    p.bands(62, 140, 52, 80, '#ffc860', (.10, .10, .10), shrink=.66)
    p.bands(62, 205, 40, 12, '#ffc860', (.10, .10), shrink=.62)


# ------------------------------------------------------------ living
def living_lv(era, tod, lv, dog=True, pose='lie', dog_xy=(68, 205)):
    S = SceneL(era, tod, lv); p = S.p
    if lv < 4: dingy_wall(S)
    elif lv < 5: wall(S, wainscot=False); baseboard(S, 168)
    else: wall(S)
    if lv < 4: vinyl_floor(S)
    else: floor(S)
    if lv >= 6: deco(S)
    if lv <= 3:
        notice(S, 22, 70);
        if lv <= 1: notice(S, 38, 86, 12, 16)
    window(S)
    if lv <= 1: newspaper_window(S)
    elif lv < 6: curtains_simple(S)
    else: curtains(S)
    if lv >= 4:
        rug(S, 94, 224, *((26, 7) if lv < 7 else (40, 10)))
    lighting_lv(S)
    if lv < 3:
        boxes(S); lp_player(S, 9, 127)
    else:
        dresser(S); lp_player(S)
    if lv < 5: bulb(S)
    else: lamp(S)
    if lv == 0: mattress(S)
    else: sofa_w(S, cushion=lv >= 7, worn=lv < 4)
    if lv >= 7: plant(S)
    news_stack(S)
    for i, (cx, cy) in enumerate(((50, 232), (62, 240), (46, 246))):
        if i < {0: 3, 1: 2, 2: 1}.get(lv, 0): cup(S, cx, cy)
    p.tint(p.E(94, 228, 26, 3), '#000000', .22)
    if dog:
        before = p.a.copy()
        pdog2.dog(p, S.P['stage'], dog_xy[0], dog_xy[1], pose=pose)
        d = np.any(p.a != before, axis=2)
        if S.night: p.tint(d, '#2a2a6a', .20)
    return S


# ------------------------------------------------------------ workshop
def lamp_at(S, dy=0):
    p, P = S.p, S.P
    S.O(p.E(118, 168 + dy, 6, 2), '#4a6a92')
    p.fill(p.L((118, 166 + dy), (113, 151 + dy), .8), '#6a92c0'); p.fill(p.L((113, 151 + dy), (101, 137 + dy), .8), '#6a92c0')
    S.O(p.P([(92, 132 + dy), (107, 127 + dy), (110, 137 + dy), (96, 143 + dy)]), P['shade'], hicol='#ffffff', locol=dk(P['shade'], .2))


def workshop_lv(era, tod, lv):
    S = SceneL(era, tod, lv); p, P = S.p, S.P
    spc = ['#e0507a', '#f2c44a', '#58b0a0', '#9a7ad8', '#f6f0dc', '#6aa850']
    # ---- shell
    if lv < 4:
        dingy_wall(S, y_end=221, cracks=False)
        vinyl_floor(S, 227)
    else:
        wall(S, y_end=221, wainscot=False)
        p.fill(p.R(0, 100, W, 121), P['wall'])
        st = mix(P['wall'], '#000000' if S.night else '#ffffff', .07 if S.night else .22)
        for x in range(2, W, 12): p.px(x, 100, st, 2, 121)
        S.O(p.R(-2, 221, W + 4, 6), dk(P['wain'], .2))
        floor(S, 227)
    if lv <= 1: notice(S, 100, 62)
    # ---- pegboard (lv4 half, lv5+ full)
    if lv >= 4:
        peg = '#d8b078' if not S.night else '#7a5a4a'
        pw = 64 if lv == 4 else 114
        S.O(p.RR(8, 36, pw, 65, 2), peg)
        for yy in range(40, 99, 5):
            for xx in range(12, 8 + pw - 4, 5): p.px(xx, yy, dk(peg, .3))
        for ry in (41, 60):
            S.O(p.R(12, ry, 37, 2), '#8a6a50')
            for i in range(8):
                S.O(p.R(14 + i * 4, ry - 6, 3, 6), spc[(i + (0 if ry == 41 else 2)) % 6], hi=False)
        for a, b in (((61, 46), (66, 69)), ((66, 46), (61, 69))):
            p.fill(p.L(a, b, .7), '#dce4f0')
        for rx_ in (61, 67):
            S.O(p.RR(rx_ - 2, 69, 5, 5, 2), '#e0507a'); p.fill(p.R(rx_ - 1, 70, 3, 3), peg)
        if lv >= 5:
            S.O(p.R(77, 42, 6, 54), '#f2d878')
            for yy in range(45, 94, 3): p.px(77, yy, S.ol, 2 if (yy - 45) % 6 == 0 else 1, 1)
            S.O(p.E(100, 54, 8, 8), '#f2c44a'); S.O(p.E(100, 54, 3, 3), peg, hi=False)
            S.O(p.R(100, 61, 10, 3), '#f2c44a')
            for xx, c0 in ((92, '#e0507a'), (111, '#58b0a0')):
                p.px(xx, 76, '#c8c0d0', 1, 8); S.O(p.E(xx, 88, 3, 3), c0)
    # ---- shelf + dolls (lv2: 2 dolls, lv3-4: 3, lv5+: 5)
    if lv >= 2:
        sw = {2: 52, 3: 70, 4: 70}.get(lv, 114)
        shelf_c = S.nt('#b8905a') if lv < 5 else '#8a6a50'
        S.O(p.R(8, 117, sw, 3), shelf_c)
        if lv < 5:
            for bx in (12, 8 + sw - 8): S.O(p.R(bx, 120, 3, 5), shelf_c, hi=False)
        dc = ['#e8d0a8', '#b8d0a0', '#f0b09c', '#a8c0d8', '#f2e0b8']; hc = ['#e0507a', '#f2c44a', '#58b0a0', '#9a7ad8', '#6aa850']
        xs = {2: (15, 35), 3: (15, 35, 55), 4: (15, 35, 55)}.get(lv, (15, 35, 55, 87, 105))
        for i, bx in enumerate(xs):
            gW.doll(S, bx, 117 - 17, k=.45, eyes=2, base=dc[i], hat=hc[(i + 2) % 5], detail=False)
    # ---- work surface
    table_top = None
    if lv == 0:
        k = S.nt('#c8a070')
        S.O(p.P([(26, 192), (98, 192), (104, 200), (22, 200)]), S.nt('#d8b484'))
        S.O(p.R(22, 200, 82, 36), k)
        p.px(60, 200, S.nt('#e8d8a8'), 8, 36); p.px(23, 212, dk(k, .25), 80, 1); p.px(28, 226, dk(k, .35), 14, 1)
        top = 192
    elif lv <= 2:
        wood = S.nt('#b8905a')
        S.O(p.R(18, 172, 92, 6), wood)
        for lx in (24, 98):
            p.fill(p.L((lx, 178), (lx + 5, 226), .7), S.nt('#4a4a58'))
            p.fill(p.L((lx + 6, 178), (lx - 1, 226), .7), S.nt('#4a4a58'))
        # stool
        S.O(p.E(14, 211, 8, 3), S.nt('#d8503a')); p.px(8, 214, S.nt('#4a4a58'), 1, 14); p.px(20, 214, S.nt('#4a4a58'), 1, 14)
        top = 172
    else:
        d0 = P['dres']
        p.tint(p.R(18, 197, 94, 24), '#000000', .3)
        S.O(p.R(-2, 159, W + 4, 20), lt(d0, .12))
        S.O(p.R(-2, 178, W + 4, 4), d0)
        S.O(p.R(-2, 181, W + 4, 17), dk(d0, .06))
        if lv >= 5:
            for dx0, dw in ((24, 39), (69, 37)):
                S.O(p.RR(dx0, 183, dw, 11, 1), d0)
                S.O(p.R(dx0 + dw // 2 - 3, 187, 7, 3), '#f2c44a')
        for lx in (9, 111):
            S.O(p.R(lx, 197, 9, 76), d0, ol=S.ol)
        top = 159
    # ---- floor box + unfinished dolls (lv0-2)
    if lv <= 2:
        if lv >= 1:
            S.O(p.R(98, 214, 26, 18), S.nt('#c8a070')); p.px(99, 221, dk(S.nt('#c8a070'), .25), 24, 1)
        for dx_, ang in ((100, 0), (112, 0)):
            gW.doll(S, dx_, 190 if lv >= 1 else 196, k=.55, eyes=0, base=S.nt('#e8d0a8'), hat=S.nt('#58b0a0'), detail=False) if lv >= 1 else None
    # ---- basket (lv3+)
    if lv >= 3:
        for i, cx_ in enumerate((34, 42, 50)):
            S.O(p.RR(cx_, 209, 6, 10, 1), spc[i])
        S.O(p.RR(28, 217, 31, 24, 2), '#d8b078')
        for yy in range(221, 240, 4): p.px(29, yy, '#8a6a48', 29, 1)
    # ---- cutting mat (lv4+)
    if lv >= 4:
        S.O(p.P([(45, 164), (87, 164), (93, 179), (39, 179)]), '#3a9a7a')
        for xx in range(48, 86, 7): p.px(xx, 166, '#6acaa8', 1, 12)
        p.px(44, 170, '#6acaa8', 46, 1); p.px(42, 175, '#6acaa8', 50, 1)
    # ---- sewing machine + jar + tape (lv6+)
    if lv >= 6:
        S.O(p.R(7, 157, 29, 5), '#4a6a92'); S.O(p.R(27, 141, 8, 17), '#4a6a92')
        S.O(p.RR(8, 136, 27, 11, 3), '#6a92c0'); S.O(p.E(9, 148, 4, 4), '#dce4f0'); p.px(8, 147, '#4a5a6a', 2, 2)
        p.px(18, 131, '#dce4f0', 2, 5); S.O(p.E(19, 130, 3, 2), '#e0507a')
        S.O(p.RR(92, 149, 14, 16, 2), '#cfe8ec')
        rng = random.Random(3)
        for i in range(9): p.px(94 + rng.randint(0, 9), 157 + rng.randint(0, 5), spc[i % 6], 1, 1)
        S.O(p.RR(91, 146, 16, 4, 1), '#a89880')
    # ---- the doll being worked on (one eye) + eye bag / glue (lv0-4)
    if lv == 0: gW.doll(S, 52, 155, k=1.0, eyes=1)
    elif lv <= 2:
        p.tint(p.E(62, 177, 14, 2), '#000000', .25); gW.doll(S, 48, 135, k=1.0, eyes=1)
    else:
        p.tint(p.E(66, 176, 16, 2.4), '#000000', .3); gW.doll(S, 52, 133, k=1.0, eyes=1)
    if lv <= 4:
        bx, by = (30, top - 9) if lv > 0 else (30, top - 9)
        S.O(p.RR(bx, by, 12, 9, 1), S.nt('#e8f0f4'), hi=False)
        for i in range(4): p.px(bx + 2 + (i * 3) % 8, by + 3 + i % 2 * 2, '#1c1424', 2, 2)
        S.O(p.R(bx + 15, by + 1, 4, 8), S.nt('#f0f0e8'), hi=False); p.px(bx + 15, by, S.nt('#e07a2a'), 4, 2)
    if lv >= 7:
        gP.clock(S, 64, 14, 5)
        gP.plant(S, 90, 246)
    # ---- lamp
    if lv >= 2: lamp_at(S, dy=(3 if lv <= 2 else 0))
    else: bulb(S, 60)
    # ---- light
    if S.night:
        if lv >= 2: p.bands(100, 160, 40, 36, '#ffb04a', (.14, .14, .14), shrink=.66)
        else: p.bands(60, 150, 52, 80, '#ffc860', (.10, .10, .10), shrink=.66)
    else:
        p.tint(p.P([(40, 182), (100, 182), (88, 226), (30, 226)]) & p.R(0, 182, W, 60), '#fff2a8', .18)
    return S


if __name__ == '__main__':
    out = sys.argv[1]; os.makedirs(out, exist_ok=True)
    for kind in ('living', 'workshop'):
        for tod in ('night', 'day'):
            for lv in range(8):
                S = (living_lv('2000s', tod, lv) if kind == 'living' else workshop_lv('2000s', tod, lv))
                gP.save3(S, f'{out}/{kind}_{tod}_lv{lv}.png')
    print('ok')


# ------------------------------------------------------------ TV home-shopping tab ("방송 준비 중")
TV_Y0 = 100      # top of the TV body (native px); screen centre ~ (64.5, 134)

def pendant(S, x=65):
    p = S.p
    p.px(x, 0, S.nt('#3a3028'), 1, 12)
    S.O(p.P([(x - 4, 12), (x + 5, 12), (x + 9, 22), (x - 8, 22)]), S.nt('#f4f0e2'), hi=True, lo=True, hicol='#ffffff', locol=dk(S.nt('#f4f0e2'), .22))
    S.O(p.R(x - 8, 22, 17, 2), S.nt('#e8c860'), hi=False)
    if S.night:
        p.tint(p.P([(x - 8, 24), (x + 9, 24), (x + 26, 90), (x - 25, 90)]), '#ffe0a0', .10)
    else:
        p.px(x - 6, 25, '#fff8c8', 13, 2)


def small_frames(S):
    p = S.p
    # landscape (left)
    x, y = 13, 63
    S.O(p.RR(x - 2, y - 2, 24, 19, 1), '#f2c44a')
    sky = '#2a3a8a' if S.night else S.P['sky']; hill = '#1c5a46' if S.night else '#4aa05a'
    p.fill(p.R(x, y, 20, 15), sky); p.fill(p.R(x, y + 8, 20, 7), S.P['sky2'] if not S.night else '#3a4a9a')
    p.fill(p.E(x + 6, y + 18, 12, 9) & p.R(x, y, 20, 15), hill); p.fill(p.E(x + 17, y + 19, 9, 8) & p.R(x, y, 20, 15), dk(hill, .2))
    p.px(x + 14, y + 3, '#fff0a0', 3, 3)
    # abstract (right)
    x, y = 101, 62
    S.O(p.R(x - 2, y - 2, 20, 26), '#f2c44a')
    p.fill(p.R(x, y, 16, 22), '#f6ecd8' if not S.night else '#c8c0d8')
    S.O(p.E(x + 5, y + 9, 3.6, 3.6), '#e8b040'); S.O(p.R(x + 9, y + 4, 5, 14), '#3a9a8a')
    p.px(x + 2, y + 19, '#e0503a', 12, 1)


def tv_set(S, x=19, y=TV_Y0, w=91, h=75):
    p = S.p
    body = S.nt('#e2deca')
    S.O(p.RR(x, y, w, h, 5), body, hicol='#ffffff')
    # antenna base
    S.O(p.R(x + 40, y - 3, 11, 3), S.nt('#bcb8a6'), hi=False)
    # bezel + screen
    S.O(p.RR(x + 8, y + 8, w - 16, 52, 6), S.nt('#2a2a32'), hi=False, lo=False)
    scr = p.RR(x + 11, y + 11, w - 22, 46, 5)
    rng = np.random.RandomState(5)
    pal = ['#e8e8ec', '#c0c0c8', '#8a8a96', '#5a5a64', '#2a2a32', '#f6f6fa']
    sc = scr & p.R(x + 11, y + 11, w - 22, 46)
    ys, xs = np.nonzero(sc)
    for yy, xx in zip(ys, xs):
        p.a[yy, xx] = hx(pal[rng.randint(0, 6)])
    for ry in (y + 22, y + 41):
        p.tint(sc & p.R(0, ry, W, 1), '#ffffff', .35)
    p.tint(sc, '#000000', .16)
    p.tint(sc & p.R(x + 14, y + 30, w - 28, 14), '#000000', .62)      # dark strip behind the '방송 준비 중' text
    # screen edge shading
    inn = sc & ~sh(sc, 1, 0) | sc & ~sh(sc, 0, 1)
    p.tint(inn, '#000000', .35)
    # speaker grille, LED, knobs
    for i in range(4): p.px(x + 9, y + 65 + i * 2, dk(body, .25), 22, 1)
    p.px(x + 56, y + 66, '#e8604a', 2, 2)
    for kx in (x + 64, x + 76):
        S.O(p.E(kx, y + 66, 3.2, 3.2), S.nt('#b4b0a0'))
        p.px(kx, y + 63, S.ol, 1, 3)
    # feet
    for fx in (x + 8, x + 74): S.O(p.R(fx, y + h, 9, 3), S.nt('#4a4640'), hi=False)


def rabbit_ears(S, x=64, y=TV_Y0 - 3, foil=False):
    p = S.p; c = S.nt('#aab0c0')
    p.fill(p.L((x, y), (x - 15, y - 26), .6), c); p.fill(p.L((x, y), (x + 16, y - 24), .6), c)
    S.O(p.E(x, y - 1, 3, 2), S.nt('#4a4a58'), hi=False)
    if foil:      # crumpled aluminium foil wrapped around the tips
        f = S.nt('#e8ecf4')
        for (a, b) in ((x - 15, y - 26), (x + 16, y - 24)):
            S.O(p.E(a, b, 3.6, 4.4), f, hicol='#ffffff'); p.px(a - 1, b - 1, S.nt('#9aa0b0'), 1, 2); p.px(a + 1, b + 1, S.nt('#9aa0b0'), 1, 2)
    else:
        p.px(x - 16, y - 27, c, 2, 2); p.px(x + 15, y - 25, c, 2, 2)


def tv_lv(era, tod, lv):
    """TV home-shopping tab, interior level lv (same 0..7 steps as the living room / workshop)
    0 boxes + foil antenna + bare bulb | 1 plastic crates | 2 plank on bricks | 3 low bench |
    4 new wallpaper+floor, small rug, no antenna | 5 3-drawer TV cabinet + pendant lamp | 6 wall frames | 7 plants + big rug"""
    S = SceneL(era, tod, lv, ground_y=198); p, P = S.p, S.P
    gy = 198
    if lv < 4:
        dingy_wall(S, y_end=192); vinyl_floor(S, gy)
    else:
        wall(S, y_end=192, wainscot=False); baseboard(S, 192); floor(S, gy)
    if lv >= 6: small_frames(S)
    elif lv <= 3: notice(S, 100, 66, 14, 18)
    if lv >= 4:
        rug(S, 65, 238, *((26, 6) if lv < 7 else (42, 9)))
    if S.night:
        p.bands(64, 136, 58, 52, '#bcd0ff', (.10, .10, .10), shrink=.7)
        p.bands(64, 214, 44, 10, '#bcd0ff', (.10, .10), shrink=.66)
    else:
        p.tint(p.P([(34, 198), (104, 198), (116, 250), (22, 250)]), '#fff2a8', .16)
    if lv >= 5: pendant(S)
    else: bulb(S, 65)
    k = S.nt('#c8a070'); tp = S.nt('#e8d8a8')
    if lv == 0:
        S.O(p.R(14, 176, 54, 32), k); p.px(36, 176, tp, 6, 32); p.px(15, 186, dk(k, .25), 52, 1); p.px(18, 198, dk(k, .35), 12, 1)
        S.O(p.R(66, 182, 50, 26), S.nt('#d2aa78')); p.px(88, 182, tp, 6, 26); p.px(67, 190, dk(k, .25), 48, 1)
        cup(S, 96, 222)
    elif lv == 1:
        cr = S.nt('#d8503a')
        for cx0 in (14, 66):
            S.O(p.R(cx0, 178, 50, 30), cr)
            for gx in range(cx0 + 4, cx0 + 47, 6):
                for gy_ in (182, 190, 198): p.fill(p.R(gx, gy_, 3, 4), dk(cr, .5))
            S.O(p.R(cx0 - 1, 175, 52, 4), lt(cr, .15), hi=False)
    elif lv == 2:
        wood = S.nt('#b8905a'); br = S.nt('#b86a4a')
        for bx in (16, 98):
            for r_ in range(5):
                S.O(p.R(bx + (r_ % 2) * 2, 181 + r_ * 5.4, 16, 5), br, hi=False, lo=False)
        S.O(p.R(12, 176, 106, 5), wood)
    elif lv <= 4:
        wood = P['dres']
        S.O(p.R(12, 176, 106, 5), lt(wood, .12))
        for lx in (16, 106): S.O(p.R(lx, 181, 5, 27), wood)
        S.O(p.R(22, 196, 86, 4), dk(wood, .05), hi=False)
    else:
        d0 = P['dres']
        p.tint(p.E(65, 209, 56, 3), '#000000', .22)
        for fx in (17, 107): S.O(p.R(fx, 203, 6, 6), dk(d0, .25))
        S.O(p.RR(14, 178, 102, 28, 1), d0)
        for i in range(3):
            S.O(p.RR(17 + i * 33, 181, 30, 20, 1), lt(d0, .06))
            S.O(p.R(28 + i * 33, 189, 8, 3), '#f2c44a')
        S.O(p.R(12, 175, 106, 4), lt(d0, .15))
    if lv <= 3: rabbit_ears(S, foil=(lv == 0))
    tv_set(S)
    if lv >= 7:
        plant(S, 14, 168)
        S.O(p.RR(107, 166, 8, 7), S.nt('#f4f0e2'))
        for dx, dy, r in ((111, 160, 3), (108, 162, 2.4), (114, 162, 2.4)):
            S.O(p.E(dx, dy, r, r * 1.3), '#4aa05a', lo=True)
    return S
