"""pxl: classic hand-pixel toolkit (flat colours, 1px dark outline, 1px hi/lo bevel). No dithering, no gradients."""
import numpy as np
from px3 import hx, mix, sd_poly, sd_seg

OLC = '#1c1424'

def sh(m, dx, dy):
    """out[y,x] = m[y-dy, x-dx]"""
    o = np.zeros_like(m)
    H, W = m.shape
    ys0, ys1 = max(0, dy), min(H, H + dy); xs0, xs1 = max(0, dx), min(W, W + dx)
    o[ys0:ys1, xs0:xs1] = m[ys0 - dy:ys1 - dy, xs0 - dx:xs1 - dx]
    return o

class Px:
    def __init__(s, W, H, bg='#000000'):
        s.W, s.H = W, H
        s.a = np.zeros((H, W, 3), np.uint8); s.a[:] = hx(bg)
        yy, xx = np.mgrid[0:H, 0:W]
        s.X = xx + .5; s.Y = yy + .5
    # --- masks
    def R(s, x, y, w, h): return (s.X >= x) & (s.X < x + w) & (s.Y >= y) & (s.Y < y + h)
    def E(s, cx, cy, rx, ry): return ((s.X - cx) / rx) ** 2 + ((s.Y - cy) / ry) ** 2 <= 1
    def RR(s, x, y, w, h, r=1):
        m = s.R(x, y, w, h)
        if r:
            for cx, cy in ((x, y), (x + w - 1, y), (x, y + h - 1), (x + w - 1, y + h - 1)):
                m &= ~((s.X >= cx) & (s.X < cx + 1) & (s.Y >= cy) & (s.Y < cy + 1))
        return m
    def P(s, pts): return sd_poly(pts)(s.X.astype(np.float32), s.Y.astype(np.float32)) < 0
    def L(s, a, b, r=.6, r2=None): return sd_seg(a, b, r, r2)(s.X.astype(np.float32), s.Y.astype(np.float32)) < 0
    # --- painting
    def fill(s, m, col): s.a[m] = hx(col)
    def obj(s, m, col, ol=OLC, hi=True, lo=True, hicol=None, locol=None, lo2=False):
        if ol:
            d = sh(m, 1, 0) | sh(m, -1, 0) | sh(m, 0, 1) | sh(m, 0, -1)
            s.a[d & ~m] = hx(ol)
        s.a[m] = hx(col)
        if hi:
            e = (m & ~sh(m, 0, 1)) | (m & ~sh(m, 1, 0))
            s.a[e] = hx(hicol or mix(col, '#ffffff', .30))
        if lo:
            e = (m & ~sh(m, 0, -1)) | (m & ~sh(m, -1, 0))
            if lo2: e |= (m & ~sh(m, 0, -2))
            s.a[e] = hx(locol or mix(mix(col, '#000000', .22), '#3a2a6a', .12))
    def flat(s, m, col, ol=None): s.obj(m, col, ol=ol, hi=False, lo=False)
    def px(s, x, y, col, w=1, h=1): s.a[s.R(x, y, w, h)] = hx(col)
    def tint(s, m, col, a):
        c = np.array(hx(col), np.float32)
        s.a[m] = np.clip(s.a[m].astype(np.float32) * (1 - a) + c * a, 0, 255).astype(np.uint8)
    def bands(s, cx, cy, rx, ry, col, alphas=(.10, .10, .10), shrink=.68):
        """hard-edged concentric light pool"""
        for i, a in enumerate(alphas):
            f = shrink ** i
            s.tint(s.E(cx, cy, rx * f, ry * f), col, a)
    def save(s, path, scale=3, pad_to=None):
        from PIL import Image
        im = Image.fromarray(s.a)
        if scale > 1: im = im.resize((im.width * scale, im.height * scale), Image.NEAREST)
        if pad_to and im.height < pad_to:
            pad = Image.new('RGB', (im.width, pad_to)); pad.paste(im, (0, 0))
            last = im.crop((0, im.height - 1, im.width, im.height))
            for y in range(im.height, pad_to): pad.paste(last, (0, y))
            im = pad
        im.save(path)
