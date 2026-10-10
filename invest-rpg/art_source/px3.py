"""px3 core: resolution-independent SDF pixel-art toolkit.
All shape coordinates are in *design units* (195x422 grid). Canvas scale S decides native pixels.
"""
import numpy as np, math, os
from PIL import Image

BAY4 = (np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]], np.float32) + .5) / 16


def hx(s):
    if isinstance(s, (tuple, list, np.ndarray)):
        return tuple(int(v) for v in s)
    s = s.lstrip('#')
    return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16))


def mix(a, b, t):
    a = np.array(hx(a), np.float32); b = np.array(hx(b), np.float32)
    return tuple(int(round(v)) for v in a + (b - a) * t)


def ramp(c, n=5, sh='#2a1f4a', li='#ffe6a8', sd=0.38, lt=0.5, dk=0.5):
    """hue-shifted ramp dark->light"""
    lo = mix(mix(c, '#000000', dk), sh, sd)
    hi = mix(c, li, lt)
    out = []
    for i in range(n):
        t = i / (n - 1)
        out.append(mix(lo, c, t * 2) if t <= 0.5 else mix(c, hi, (t - .5) * 2))
    return np.array(out, np.uint8)


# ---------------------------------------------------------------- noise
def _hash(ix, iy, seed):
    n = ix.astype(np.float64) * 127.1 + iy.astype(np.float64) * 311.7 + seed * 74.7
    s = np.sin(n) * 43758.5453
    return (s - np.floor(s)).astype(np.float32)


def vnoise(X, Y, seed=0):
    ix = np.floor(X); iy = np.floor(Y)
    fx = (X - ix).astype(np.float32); fy = (Y - iy).astype(np.float32)
    u = fx * fx * (3 - 2 * fx); v = fy * fy * (3 - 2 * fy)
    a = _hash(ix, iy, seed); b = _hash(ix + 1, iy, seed)
    c = _hash(ix, iy + 1, seed); d = _hash(ix + 1, iy + 1, seed)
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v


def fbm(X, Y, seed=0, octv=3):
    t = np.zeros_like(X, np.float32); amp = 0.5; f = 1.0; tot = 0
    for i in range(octv):
        t += amp * vnoise(X * f, Y * f, seed + i * 17); tot += amp
        amp *= 0.5; f *= 2.03
    return t / tot


def smooth(a, b, x):
    t = np.clip((x - a) / (b - a + 1e-9), 0, 1)
    return t * t * (3 - 2 * t)


# ---------------------------------------------------------------- canvas
class Cv:
    def __init__(s, W, H, S=1.0, bg=(0, 0, 0)):
        s.W, s.H, s.S = W, H, S
        s.w = int(round(W * S)); s.h = int(round(H * S))
        s.a = np.zeros((s.h, s.w, 3), np.uint8); s.a[:] = bg
        yy, xx = np.mgrid[0:s.h, 0:s.w]
        s.X = ((xx + .5) / S).astype(np.float32)
        s.Y = ((yy + .5) / S).astype(np.float32)
        s.B = BAY4[yy % 4, xx % 4]

    def sl(s, x0, y0, x1, y1):
        S = s.S
        xs = slice(max(0, int(math.floor(x0 * S))), min(s.w, int(math.ceil(x1 * S))))
        ys = slice(max(0, int(math.floor(y0 * S))), min(s.h, int(math.ceil(y1 * S))))
        return ys, xs

    def save(s, path, scale=1):
        im = Image.fromarray(s.a)
        if scale > 1:
            im = im.resize((im.width * scale, im.height * scale), Image.NEAREST)
        im.save(path)


class Ctx:
    pass


def quant(v, n, B, dith=0.5):
    idx = np.floor(v * (n - 1) + 0.5 + (B - 0.5) * dith)
    return np.clip(idx, 0, n - 1).astype(np.int32)


# ---------------------------------------------------------------- sdf
def sd_rrect(x, y, w, h, r=0):
    cx = x + w / 2; cy = y + h / 2; r = min(r, w / 2, h / 2)

    def f(X, Y):
        qx = np.abs(X - cx) - (w / 2 - r); qy = np.abs(Y - cy) - (h / 2 - r)
        return np.hypot(np.maximum(qx, 0), np.maximum(qy, 0)) + np.minimum(np.maximum(qx, qy), 0) - r
    return f


def sd_ell(cx, cy, rx, ry):
    m = min(rx, ry)

    def f(X, Y):
        return (np.sqrt(((X - cx) / rx) ** 2 + ((Y - cy) / ry) ** 2) - 1) * m
    return f


def sd_seg(a, b, r, r2=None):
    ax, ay = a; bx, by = b; r2 = r if r2 is None else r2
    ex, ey = bx - ax, by - ay; ee = ex * ex + ey * ey + 1e-9

    def f(X, Y):
        t = np.clip(((X - ax) * ex + (Y - ay) * ey) / ee, 0, 1)
        px = X - (ax + ex * t); py = Y - (ay + ey * t)
        return np.hypot(px, py) - (r + (r2 - r) * t)
    return f


def sd_poly(pts):
    P = np.array(pts, np.float32); n = len(P)

    def f(X, Y):
        d = np.full(X.shape, 1e9, np.float32); s = np.ones(X.shape, np.float32)
        for i in range(n):
            a = P[i]; b = P[(i + 1) % n]; e = b - a
            wx = X - a[0]; wy = Y - a[1]
            t = np.clip((wx * e[0] + wy * e[1]) / (e @ e + 1e-9), 0, 1)
            px = wx - e[0] * t; py = wy - e[1] * t
            d = np.minimum(d, px * px + py * py)
            c1 = Y >= a[1]; c2 = Y < b[1]; c3 = e[0] * wy > e[1] * wx
            flip = (c1 & c2 & c3) | (~c1 & ~c2 & ~c3)
            s = np.where(flip, -s, s)
        return s * np.sqrt(d)
    return f


def sd_union(*fs):
    def f(X, Y):
        d = fs[0](X, Y)
        for g in fs[1:]:
            d = np.minimum(d, g(X, Y))
        return d
    return f


def sd_sub(a, b):
    return lambda X, Y: np.maximum(a(X, Y), -b(X, Y))


def sd_inter(a, b):
    return lambda X, Y: np.maximum(a(X, Y), b(X, Y))


# ---------------------------------------------------------------- fills
def _grad(sdf, X, Y, d, eps):
    gx = (sdf(X + eps, Y) - d) / eps
    gy = (sdf(X, Y + eps) - d) / eps
    n = np.hypot(gx, gy) + 1e-6
    return gx / n, gy / n


def flat(col):
    col = np.array(hx(col), np.uint8)
    return lambda c: np.broadcast_to(col, c.X.shape + (3,))


def shaded(rp, L=(-0.55, -0.8), k=3.0, base=0.55, amp=0.55, vadd=None, dith=0.5, tex=None, texamp=0.0, rimdark=0.0):
    """volumetric fill: bevel lighting from sdf gradient + optional field"""
    rp = np.asarray(rp); n = len(rp)
    lx, ly = L

    def f(c):
        e = 1 - smooth(0, k, -c.d)
        v = base + amp * e * (-(c.gx * lx + c.gy * ly))
        v = v - rimdark * e * (1 - smooth(0, 1.0 / c.S + 0.01, -c.d))
        if vadd is not None:
            v = v + vadd(c)
        if tex is not None:
            v = v + texamp * (tex(c) - 0.5)
        idx = quant(v, n, c.B, dith)
        return rp[idx]
    return f


def field(rp, vfun, dith=0.55):
    rp = np.asarray(rp); n = len(rp)

    def f(c):
        return rp[quant(vfun(c), n, c.B, dith)]
    return f


def draw(cv, bbox, sdf, fill, ol=None, ow=1.0, selective=None, L=(-0.55, -0.8)):
    """paint a shape. ol: colour or None. ow: outline width in native px.
    selective=(light_colour) -> outline uses light colour on the light-facing side"""
    ys, xs = cv.sl(*bbox)
    if ys.stop <= ys.start or xs.stop <= xs.start:
        return
    X = cv.X[ys, xs]; Y = cv.Y[ys, xs]; reg = cv.a[ys, xs]
    d = sdf(X, Y)
    c = Ctx(); c.X = X; c.Y = Y; c.d = d; c.B = cv.B[ys, xs]; c.S = cv.S
    eps = 0.5 / cv.S
    c.gx, c.gy = _grad(sdf, X, Y, d, eps)
    if ol is not None:
        m = (d >= 0) & (d < ow / cv.S)
        reg[m] = np.array(hx(ol), np.uint8)
        if selective is not None:
            lit = m & (-(c.gx * L[0] + c.gy * L[1]) > 0.35)
            reg[lit] = np.array(hx(selective), np.uint8)
    m = d < 0
    col = fill(c)
    reg[m] = col[m]


def over(cv, bbox, mask_fn, col_fn):
    """generic per-pixel painter: mask_fn(c)->bool, col_fn(c)->rgb array"""
    ys, xs = cv.sl(*bbox)
    if ys.stop <= ys.start or xs.stop <= xs.start:
        return
    c = Ctx(); c.X = cv.X[ys, xs]; c.Y = cv.Y[ys, xs]; c.B = cv.B[ys, xs]; c.S = cv.S
    reg = cv.a[ys, xs]
    m = mask_fn(c)
    col = col_fn(c)
    reg[m] = col[m]


def blend(cv, bbox, alpha_fn, color):
    """tint region toward colour with per-pixel alpha (quantised by dither later if desired)"""
    ys, xs = cv.sl(*bbox)
    if ys.stop <= ys.start or xs.stop <= xs.start:
        return
    c = Ctx(); c.X = cv.X[ys, xs]; c.Y = cv.Y[ys, xs]; c.B = cv.B[ys, xs]; c.S = cv.S
    a = np.clip(alpha_fn(c), 0, 1)[..., None]
    reg = cv.a[ys, xs].astype(np.float32)
    col = np.array(hx(color), np.float32)
    cv.a[ys, xs] = np.clip(reg + (col - reg) * a, 0, 255).astype(np.uint8)


def qblend(cv, bbox, alpha_fn, color, steps=4):
    """banded (posterised, dithered) tint -> pixel-art light pools"""
    def af(c):
        a = np.clip(alpha_fn(c), 0, 1)
        q = np.floor(a * steps + c.B)
        return np.clip(q, 0, steps) / steps * (a > 0.002)
    blend(cv, bbox, af, color)


def posterize_to(cv, colors):
    """map every pixel to nearest colour in palette (limits colour count)"""
    pal = np.array([hx(c) for c in colors], np.int32)
    flat_ = cv.a.reshape(-1, 3).astype(np.int32)
    out = np.empty(flat_.shape[0], np.int32)
    for i in range(0, flat_.shape[0], 200000):
        ch = flat_[i:i + 200000]
        d = ((ch[:, None, :] - pal[None, :, :]) ** 2).sum(-1)
        out[i:i + 200000] = d.argmin(1)
    cv.a = pal[out].reshape(cv.a.shape).astype(np.uint8)
