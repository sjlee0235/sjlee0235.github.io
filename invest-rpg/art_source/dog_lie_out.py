# 15차: 엎드린 강아지(pup/adult/old _lie)에 꼬리·앞발·뒷발 보이게 고치기 (중간 수정 — 디자이너가 다시 그리면 교체)
# 꼬리 = 같은 나이 stand(서기) 그림의 말린 꼬리를 몸 뒤에 옮김, 발 = 그 나이 발 색(바탕·그늘)과 윤곽색으로 앞으로 뻗은 발
# 사용: python3 dog_lie_out.py <디자이너 dog 폴더(…/dog/)> <저장 폴더>
import sys, json
from collections import Counter
from PIL import Image
D=sys.argv[1].rstrip('/')+'/'
O=(28,20,36,255)
def paste(dst, src, box, d):
    sp=src.load(); dp=dst.load(); x0,y0,x1,y1=box
    for y in range(y0,y1):
        for x in range(x0,x1):
            c=sp[x,y]
            if c[3]: dp[x+d[0],y+d[1]]=c
def colors(stand, box):
    sp=stand.load(); x0,y0,x1,y1=box
    cnt=Counter(sp[x,y] for y in range(y0,y1) for x in range(x0,x1) if sp[x,y][3] and sp[x,y]!=O)
    (a,_),(b,_)=cnt.most_common(2)
    return (a,b) if sum(a[:3])>sum(b[:3]) else (b,a)
def paw(img, x, y, n, cream, shade, far=False, full=False):
    """앞으로 뻗은 발: 윗줄 윤곽(빈칸 위에만) / 발 2줄 / 아랫줄 윤곽. 오른쪽 끝 둥글게, 발가락 금 1칸"""
    p=img.load()
    for i in range(x+1,x+n-1):
        if full or p[i,y][3]==0: p[i,y]=O
    for r in (1,2):
        p[x,y+r]=O; p[x+n-1,y+r]=O
        for i in range(x+1,x+n-1): p[i,y+r]=shade if far else cream
    p[x+1,y+2]=shade
    p[x+n-3,y+2]=O
    for i in range(x+1,x+n-1): p[i,y+3]=O
def build(st, tail_box, tail_d, hind, fronts, feet_box):
    lie=Image.open(D+f'{st}_lie.png').convert('RGBA')
    stand=Image.open(D+f'{st}_stand.png').convert('RGBA')
    cream,shade=colors(stand, feet_box)
    out=Image.new('RGBA',lie.size,(0,0,0,0))
    paste(out, stand, tail_box, tail_d)
    paste(out, lie, (0,0,lie.width,lie.height), (0,0))
    if hind: paw(out, *hind, cream, shade)
    for i,f in enumerate(fronts): paw(out, *f, cream, shade, far=(i==0 and len(fronts)>1), full=True)
    return out
CFG={
 'pup':   dict(tail_box=(4,17,13,24), tail_d=(2,3), hind=(6,35,8),  fronts=[(28,34,7),(24,35,8)],  feet_box=(6,35,22,38)),
 'adult': dict(tail_box=(4,11,16,21), tail_d=(5,7), hind=(9,35,9),  fronts=[(38,34,8),(33,35,10)], feet_box=(7,34,28,38)),
 'old':   dict(tail_box=(4,12,15,22), tail_d=(5,6), hind=(10,35,9), fronts=[(36,34,8),(32,35,10)], feet_box=(7,34,26,38)),
}
if __name__=='__main__':
    for st,c in CFG.items(): build(st,**c).save(f'{sys.argv[2]}/{st}_lie.png')
