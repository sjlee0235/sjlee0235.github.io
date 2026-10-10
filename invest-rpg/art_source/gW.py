"""workshop scene in classic pixel style"""
import sys, os, random
from gP import *
import gP

def doll(S, ox, oy, k=1.0, eyes=1, base='#e8d0a8', hat='#58b0a0', detail=True):
    p = S.p
    s = lambda v: int(round(v * k))
    for lx in (7, 16):
        S.O(p.RR(ox + s(lx - 1), oy + s(31), max(3, s(5)), max(3, s(6)), 1), '#6a4a3a')
    S.O(p.RR(ox + s(5), oy + s(22), s(17), s(11), 2), base)
    for ax in (2, 21):
        S.O(p.RR(ox + s(ax), oy + s(24), max(3, s(3)), s(7), 1), base)
    S.O(p.E(ox + s(13), oy + s(13), 9.5 * k, 8.5 * k), base)
    S.O(p.P([(ox + s(2), oy + s(9)), (ox + s(5), oy + s(1)), (ox + s(21), oy + s(1)), (ox + s(24), oy + s(9)), (ox + s(13), oy + s(11))]), hat)
    S.O(p.R(ox + s(2), oy + s(8), s(22), max(2, s(2.4))), dk(hat, .15), hi=False)
    S.O(p.E(ox + s(13), oy + s(0.5), 2 * k + .5, 2 * k + .5), '#fff6dc')
    if detail:
        p.fill(p.R(ox + s(8), oy + s(24), s(9), s(6)), '#e0503a')
        p.px(ox + s(10), oy + s(26), '#ffd84a', 1, 1)
    ex1 = (ox + s(9), oy + s(15)); ex2 = (ox + s(17), oy + s(15))
    for e, has in ((ex1, eyes >= 1), (ex2, eyes >= 2)):
        if has:
            p.px(e[0] - 1, e[1] - 1, S.ol, 3, 3); p.px(e[0] - 1, e[1] - 1, '#ffffff', 1, 1)
        elif k >= 1:
            # missing eye: stitched X
            for dx, dy in ((-1, -1), (1, -1), (0, 0), (-1, 1), (1, 1)):
                p.px(e[0] + dx, e[1] + dy, '#7a5a4a')
    if k >= 1:
        p.px(ox + s(11), oy + s(19), '#7a4a3a', 3, 1)
        p.px(ox + s(6), oy + s(17), '#ff9aa8', 2, 1); p.px(ox + s(19), oy + s(17), '#ff9aa8', 2, 1)

def workshop(era, tod):
    S = Scene(era, tod); p, P = S.p, S.P
    wall(S, y_end=221, wainscot=False)
    p.fill(p.R(0, 100, W, 121), P['wall'])
    st = mix(P['wall'], '#000000' if S.night else '#ffffff', .07 if S.night else .22)
    for x in range(2, W, 12): p.px(x, 100, st, 2, 121)
    S.O(p.R(-2, 221, W + 4, 6), dk(P['wain'], .2))
    floor(S, 227)
    # pegboard
    peg = '#d8b078' if not S.night else '#7a5a4a'
    S.O(p.RR(8, 36, 114, 65, 2), peg)
    for yy in range(40, 99, 5):
        for xx in range(12, 120, 5): p.px(xx, yy, dk(peg, .3))
    spc = ['#e0507a', '#f2c44a', '#58b0a0', '#9a7ad8', '#f6f0dc', '#6aa850']
    for ry in (41, 60):
        S.O(p.R(12, ry, 37, 2), '#8a6a50')
        for i in range(8):
            S.O(p.R(14 + i * 4, ry - 6, 3, 6), spc[(i + (0 if ry == 41 else 2)) % 6], hi=False)
    # scissors
    for a, b in (((61, 46), (66, 69)), ((66, 46), (61, 69))):
        p.fill(p.L(a, b, .7), '#dce4f0')
    for rx_ in (61, 67):
        S.O(p.RR(rx_ - 2, 69, 5, 5, 2), '#e0507a'); p.fill(p.R(rx_ - 1, 70, 3, 3), peg)
    # ruler
    S.O(p.R(77, 42, 6, 54), '#f2d878')
    for yy in range(45, 94, 3): p.px(77, yy, S.ol, 2 if (yy - 45) % 6 == 0 else 1, 1)
    # tape
    S.O(p.E(100, 54, 8, 8), '#f2c44a'); S.O(p.E(100, 54, 3, 3), peg, hi=False)
    S.O(p.R(100, 61, 10, 3), '#f2c44a')
    for xx, c0 in ((92, '#e0507a'), (111, '#58b0a0')):
        p.px(xx, 76, '#c8c0d0', 1, 8); S.O(p.E(xx, 88, 3, 3), c0)
    # shelf + dolls
    S.O(p.R(8, 117, 114, 3), '#8a6a50')
    dc = ['#e8d0a8', '#b8d0a0', '#f0b09c', '#a8c0d8', '#f2e0b8']; hc = ['#e0507a', '#f2c44a', '#58b0a0', '#9a7ad8', '#6aa850']
    for i, bx in enumerate((15, 35, 55, 87, 105)):
        doll(S, bx, 117 - 17, k=.45, eyes=2, base=dc[i], hat=hc[(i + 2) % 5], detail=False)
    # desk
    p.tint(p.R(18, 197, 94, 24), '#000000', .3)
    d0 = P['dres']
    S.O(p.R(-2, 159, W + 4, 20), lt(d0, .12))
    S.O(p.R(-2, 178, W + 4, 4), d0)
    S.O(p.R(-2, 181, W + 4, 17), dk(d0, .06))
    for dx0, dw in ((24, 39), (69, 37)):
        S.O(p.RR(dx0, 183, dw, 11, 1), d0)
        S.O(p.R(dx0 + dw // 2 - 3, 187, 7, 3), '#f2c44a')
    for lx in (9, 111):
        S.O(p.R(lx, 197, 9, 76), d0, ol=S.ol)
    # basket
    for i, cx_ in enumerate((34, 42, 50)):
        S.O(p.RR(cx_, 209, 6, 10, 1), spc[i])
    S.O(p.RR(28, 217, 31, 24, 2), '#d8b078')
    for yy in range(221, 240, 4): p.px(29, yy, '#8a6a48', 29, 1)
    # cutting mat
    S.O(p.P([(45, 164), (87, 164), (93, 179), (39, 179)]), '#3a9a7a')
    for xx in range(48, 86, 7): p.px(xx, 166, '#6acaa8', 1, 12)
    p.px(44, 170, '#6acaa8', 46, 1); p.px(42, 175, '#6acaa8', 50, 1)
    # sewing machine
    S.O(p.R(7, 157, 29, 5), '#4a6a92')
    S.O(p.R(27, 141, 8, 17), '#4a6a92')
    S.O(p.RR(8, 136, 27, 11, 3), '#6a92c0')
    S.O(p.E(9, 148, 4, 4), '#dce4f0'); p.px(8, 147, '#4a5a6a', 2, 2)
    p.px(18, 131, '#dce4f0', 2, 5)
    S.O(p.E(19, 130, 3, 2), '#e0507a')
    # doll (one eye)
    p.tint(p.E(66, 176, 16, 2.4), '#000000', .3)
    doll(S, 52, 133, k=1.0, eyes=1)
    # jar
    S.O(p.RR(92, 149, 14, 16, 2), '#cfe8ec')
    rng = random.Random(3)
    for i in range(9): p.px(94 + rng.randint(0, 9), 157 + rng.randint(0, 5), spc[i % 6], 1, 1)
    S.O(p.RR(91, 146, 16, 4, 1), '#a89880')
    # lamp
    S.O(p.E(118, 168, 6, 2), '#4a6a92')
    p.fill(p.L((118, 166), (113, 151), .8), '#6a92c0'); p.fill(p.L((113, 151), (101, 137), .8), '#6a92c0')
    S.O(p.P([(92, 132), (107, 127), (110, 137), (96, 143)]), P['shade'], hicol='#ffffff', locol=dk(P['shade'], .2))
    # light
    if S.night:
        p.bands(100, 160, 40, 36, '#ffb04a', (.14, .14, .14), shrink=.66)
    else:
        p.tint(p.P([(60, 36), (100, 36), (90, 100), (50, 100)]), '#fff2a8', .0)
        p.tint(p.P([(40, 182), (100, 182), (88, 226), (30, 226)]) & p.R(0, 182, W, 60), '#fff2a8', .18)
    return S

if __name__ == '__main__':
    out = sys.argv[1]
    for tod in ('night', 'day'):
        gP.save3(workshop('2000s', tod), f'{out}/P_workshop_2000s_{tod}.png')
    print('ok')
