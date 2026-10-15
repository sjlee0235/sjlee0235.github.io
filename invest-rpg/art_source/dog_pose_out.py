# 15차: 엎드린(_lie)·앉은(_sit) 강아지에 꼬리·앞발·뒷발이 잘 보이게 고치기 (중간 수정 — 디자이너가 다시 그리면 교체)
# 꼬리 = 같은 나이 stand(서기) 그림의 말린 꼬리를 몸 뒤에 옮김
# 엎드리기 발 = 그 나이 발 색(바탕·그늘)과 윤곽색으로 앞으로 뻗은 앞발 2개(가까운 발 + 그늘진 먼 발) + 뒷발 1개
# 걷기·웃기·배 까기 그림은 꼬리·네 발이 원래 보여서 그대로 쓴다
# 사용: python3 dog_pose_out.py <디자이너 dog 폴더(…/dog/)> <저장 폴더>
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
def paw(img, x, y, n, cream, shade, far=False):
    """far=True: 먼 쪽 발 (그늘색, 윗줄 윤곽은 빈칸에만 — 턱 아래가 두꺼운 검은 띠가 되지 않게)"""
    """앞으로 뻗은 발 (윤곽 포함 높이 5): 윗줄 윤곽 / 발 3줄 / 아랫줄 윤곽. 끝은 둥글게, 아래쪽 발가락 금 2개"""
    p=img.load(); fill=shade if far else cream
    for i in range(x+1,x+n-2):
        if not far or p[i,y][3]==0: p[i,y]=O
    p[x+n-2,y+1]=O
    for r in (1,2,3):
        p[x,y+r]=O
        end=x+n-2 if r==1 else x+n-1
        for i in range(x+1,end): p[i,y+r]=fill
        p[end,y+r]=O
    for i in range(x+1,x+n-2): p[i,y+4]=O
    p[x+1,y+3]=shade; p[x+2,y+3]=shade        # 발목 그늘
    p[x+n-3,y+3]=O; p[x+n-5,y+3]=O              # 발가락 금
def lie(st, tail_box, tail_d, hind, fronts, feet_box):
    src=Image.open(D+f'{st}_lie.png').convert('RGBA')
    stand=Image.open(D+f'{st}_stand.png').convert('RGBA')
    cream,shade=colors(stand, feet_box)
    out=Image.new('RGBA',src.size,(0,0,0,0))
    paste(out, stand, tail_box, tail_d)           # 꼬리(몸 뒤)
    paste(out, src, (0,0,src.width,src.height), (0,0))
    paw(out, *hind, cream, shade)                  # 뒷발
    paw(out, *fronts[0], cream, shade, far=True)   # 먼 앞발
    paw(out, *fronts[1], cream, shade)             # 가까운 앞발
    return out
def sit(st, tail_box, tail_d):
    src=Image.open(D+f'{st}_sit.png').convert('RGBA')
    stand=Image.open(D+f'{st}_stand.png').convert('RGBA')
    out=Image.new('RGBA',src.size,(0,0,0,0))
    paste(out, stand, tail_box, tail_d)
    paste(out, src, (0,0,src.width,src.height), (0,0))
    return out
LIE={
 'pup':   dict(tail_box=(4,17,13,24), tail_d=(2,3), hind=(5,34,9),  fronts=[(26,34,10),(22,34,10)], feet_box=(6,35,22,38)),
 'adult': dict(tail_box=(4,11,16,21), tail_d=(5,7), hind=(8,34,10), fronts=[(34,34,12),(30,34,12)], feet_box=(7,34,28,38)),
 'old':   dict(tail_box=(4,12,15,22), tail_d=(5,6), hind=(9,34,10), fronts=[(33,34,12),(29,34,12)], feet_box=(7,34,26,38)),
}
SIT={
 'pup':   dict(tail_box=(4,17,13,24), tail_d=(0,0)),
 'adult': dict(tail_box=(4,11,16,21), tail_d=(1,2)),
 'old':   dict(tail_box=(4,12,15,22), tail_d=(0,1)),
}
if __name__=='__main__':
    for st,c in LIE.items(): lie(st,**c).save(f'{sys.argv[2]}/{st}_lie.png')
    for st,c in SIT.items(): sit(st,**c).save(f'{sys.argv[2]}/{st}_sit.png')
