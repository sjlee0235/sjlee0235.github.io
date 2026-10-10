import numpy as np
from px3 import hx, mix
N=18  # grid with 1px pad

def R(grid,x,y,w,h,k):
    grid[y+1:y+1+h, x+1:x+1+w]=k

def base_icons():
    ic={}
    g=np.full((N,N),'.',dtype='<U1')
    # coin: disc
    c=g.copy()
    for yy in range(16):
        for xx in range(16):
            if (xx-7.5)**2+(yy-7.5)**2<=6.6**2: c[yy+1,xx+1]='a'
    R(c,7,4,2,8,'d'); ic['coin']=c
    # gear
    c=g.copy()
    for yy in range(16):
        for xx in range(16):
            d=((xx-7.5)**2+(yy-7.5)**2)**.5
            if 2.6<=d<=5.2: c[yy+1,xx+1]='a'
    for (x,y,w,h) in [(7,1,2,3),(7,12,2,3),(1,7,3,2),(12,7,3,2),(3,3,2,2),(11,3,2,2),(3,11,2,2),(11,11,2,2)]: R(c,x,y,w,h,'a')
    ic['gear']=c
    # sofa
    c=g.copy()
    R(c,3,2,10,6,'a'); R(c,1,5,3,7,'a'); R(c,12,5,3,7,'a'); R(c,4,8,8,4,'b'); R(c,2,12,2,2,'d'); R(c,12,12,2,2,'d'); ic['sofa']=c
    # monitor chart
    c=g.copy()
    R(c,1,2,14,10,'a'); R(c,2,3,12,8,'s')
    for x,y in [(3,9),(4,8),(5,8),(6,9),(7,7),(8,6),(9,6),(10,5),(11,4),(12,4)]: R(c,x,y,1,1,'l')
    R(c,7,12,2,2,'a'); R(c,4,14,8,1,'a'); ic['monitor']=c
    # doll
    c=g.copy()
    R(c,5,1,6,3,'h'); R(c,7,0,2,1,'h'); R(c,4,4,8,5,'k'); R(c,6,6,1,1,'e'); R(c,9,6,1,1,'e')
    R(c,5,9,6,4,'a'); R(c,3,9,2,3,'a'); R(c,11,9,2,3,'a'); R(c,5,13,2,2,'d'); R(c,9,13,2,2,'d'); ic['doll']=c
    # tv
    c=g.copy()
    R(c,1,5,14,9,'a'); R(c,3,7,8,5,'s'); R(c,12,8,2,1,'d'); R(c,12,10,2,1,'d')
    for x,y in [(4,2),(5,3),(6,4),(11,2),(10,3),(9,4)]: R(c,x,y,1,1,'d')
    ic['tv']=c
    # star 7x7 in centre
    st=["...#...","...#...",".#####.","#######",".#####.","..#.#..",".#...#."]
    c=g.copy()
    for j,row in enumerate(st):
        for i,ch in enumerate(row):
            if ch=='#': c[j+5,i+5]='a'
    ic['star']=c
    # close x
    c=g.copy()
    for i in range(10): R(c,3+i,3+i,2,1,'a'); R(c,11-i,3+i,2,1,'a')
    ic['x']=c
    return ic
ICONS=base_icons()

def render(name, pal, ol, ol8=False, size=24, hi=True, olw=1, opacity=1.0):
    """pal: key->(base,hi,lo) or colour. ol: outline colour. returns inline svg string"""
    g=ICONS[name]; N_=g.shape[0]
    fill=(g!='.')
    out=np.full((N_,N_),'',dtype=object)
    def nb(y,x):
        r=[(y-1,x),(y+1,x),(y,x-1),(y,x+1)]
        if ol8: r+= [(y-1,x-1),(y-1,x+1),(y+1,x-1),(y+1,x+1)]
        return r
    for y in range(N_):
        for x in range(N_):
            if fill[y,x]:
                k=g[y,x]; v=pal.get(k,pal['a'])
                if isinstance(v,str): out[y,x]=v
                else:
                    col=v[0]
                    if hi and k in 'ab':
                        up= y==0 or g[y-1,x]!=k
                        dn= y==N_-1 or g[y+1,x]!=k
                        rt= x==N_-1 or g[y,x+1]!=k
                        if up: col=v[1]
                        elif dn or rt: col=v[2]
                    out[y,x]=col
            else:
                if any(0<=yy<N_ and 0<=xx<N_ and fill[yy,xx] for yy,xx in nb(y,x)): out[y,x]=ol
    rects=[]
    for y in range(N_):
        x=0
        while x<N_:
            if out[y,x]!='':
                c=out[y,x]; x2=x
                while x2+1<N_ and out[y,x2+1]==c: x2+=1
                rects.append(f'<rect x="{x}" y="{y}" width="{x2-x+1}" height="1" fill="{c}"/>'); x=x2+1
            else: x+=1
    return f'<svg width="{size}" height="{size}" viewBox="0 0 {N_} {N_}" shape-rendering="crispEdges" aria-hidden="true" style="opacity:{opacity};flex:none;image-rendering:pixelated">'+''.join(rects)+'</svg>'

def trio(c,sh='#2a1f4a',li='#ffffff',a=.28,b=.3):
    return (c, mix(c,li,a), mix(mix(c,'#000000',b),sh,.25))

def play_svg(n=1, size=14, color='currentColor'):
    """crisp pixel play triangles; n=1 or 2"""
    cols=[]
    def tri(x0):
        r=[]
        for i,h in enumerate([14,12,10,8,6,4,2]):
            y=(14-h)//2
            r.append(f'<rect x="{x0+i}" y="{y}" width="1" height="{h}"/>')
        return ''.join(r)
    body=tri(0) if n==1 else tri(0)+tri(8)
    w=7 if n==1 else 15
    return f'<svg width="{size*w/14:.0f}" height="{size}" viewBox="0 0 {w} 14" shape-rendering="crispEdges" fill="{color}" aria-hidden="true" style="flex:none">{body}</svg>'

# ---- extra crisp icons on integer-friendly grids (render at 2x)
def _grid(n): return np.full((n,n),'.',dtype='<U1')
def _from_ascii(rows, n):
    g=_grid(n); h=len(rows); w=len(rows[0]); oy=(n-h)//2; ox=(n-w)//2
    for j,r in enumerate(rows):
        for i,ch in enumerate(r):
            if ch!='.': g[oy+j,ox+i]=ch
    return g
GEAR13=[
".....aaa.....",
"..aa.aaa.aa..",
"..aaaaaaaaa..",
"...aaaaaaa...",
"..aaaaaaaaa..",
"aaaaahhhaaaaa",
"aaaaahhhaaaaa",
"aaaaahhhaaaaa",
"..aaaaaaaaa..",
"...aaaaaaa...",
"..aaaaaaaaa..",
"..aa.aaa.aa..",
".....aaa.....",
]
ICONS['gear2']=_from_ascii(GEAR13,15)
STAR9=[
"....a....",
"....a....",
"...aaa...",
"aaaaaaaaa",
".aaaaaaa.",
"..aaaaa..",
"..aaaaa..",
".aaa.aaa.",
".aa...aa.",
]
ICONS['star2']=_from_ascii(STAR9,11)
COIN6=[
".aaaa.",
"aeeaaa",
"aeaaad",
"aaaadd",
"aaaadd",
".addd.",
]
ICONS['coin_s']=_from_ascii(COIN6,8)
COIN12=[
"...aaaa...",
"..aaaaaa..",
".aaaaaaaa.",
"aaaaddaaaa",
"aaaaddaaaa",
"aaaaddaaaa",
"aaaaddaaaa",
".aaaaaaaa.",
"..aaaaaa..",
"...aaaa...",
]
ICONS['coin2']=_from_ascii(COIN12,12)
