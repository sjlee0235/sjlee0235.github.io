import json, os
from icons import render, trio, play_svg

OUT='cv5/project'; os.makedirs(OUT,exist_ok=True)
ASSETS=json.load(open('assets5.json')) if os.path.exists('assets5.json') else {}
def A(n): return ASSETS.get(n,'/_blob/PLACEHOLDER_'+n)

FONT="'IBM Plex Sans KR',sans-serif"
FONTLINK='https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@400;500;600;700&display=swap'

TH={
 'night':dict(name='밤', bg='#0c0818', panel='#241c4a', panel_flat='#241c4a', bd='#0c0818', hd='#342a6a', text='#f4f0ff', mute='#b4acdc',
   line='#3a3070', sel='#4a3a7a', selring='#ffc24a', accent='#ffc24a', accent_t='#2a1a05', up='#ff7a7a', dn='#7ab0ff', coin='#ffc24a',
   chip='#241c4a', chipbd='#0c0818', hi='#4a3e86', lo='#150f30', inp='#150f30', btn='#3a3070', btn_t='#f4f0ff',
   tabbg='#1a1440', news_in='#150f30', scene='night',
   icons=dict(
    coin={'a':trio('#ffc24a',sh='#8a4a10',li='#fff2c0'),'d':'#8a4a12'}, gear={'a':trio('#eef0ff',sh='#7a80c0',li='#ffffff')},
    sofa={'a':trio('#2f9a94',sh='#0c3a48',li='#9ff0e0'),'b':trio('#46bab2',sh='#0c3a48',li='#c0fff0'),'d':'#2a1c30'},
    monitor={'a':trio('#9aa0cc',sh='#2a2a58',li='#ffffff'),'s':'#150f30','l':'#ffc24a'},
    doll={'a':trio('#e8d0a8',sh='#5a4a6a',li='#fff4e0'),'h':trio('#58b0a0',sh='#1a4a48',li='#c8fff0'),'k':trio('#f0d6b0',sh='#6a4a5a',li='#fff8ea'),'e':'#1a1220','d':'#6a4a3a'},
    tv={'a':trio('#9a88c0',sh='#3a2a60',li='#e0d4ff'),'s':'#1a1a3a','d':'#ffc24a'},
    star_on={'a':trio('#ffc45a',sh='#8a4a10',li='#fff2c0')}, star_off={'a':'#4a4488'}, x={'a':trio('#c0c8ec',sh='#3a4070',li='#ffffff')}),
   iol='#0c0818', buy='#ee4646', buy_hi='#ff9a98', buy_lo='#9a1c24', sell='#3a74e8', sell_hi='#9ab8ff', sell_lo='#1c3c9a'),
 'day':dict(name='낮', bg='#2a1a30', panel='#fff2cc', panel_flat='#fff2cc', bd='#2a1a30', hd='#f2d890', text='#2a1c30', mute='#7a6450',
   line='#e6cf94', sel='#ffe08a', selring='#d8502a', accent='#d8502a', accent_t='#fff6e4', up='#d4302a', dn='#2a68d0', coin='#e8a62e',
   chip='#fff2cc', chipbd='#2a1a30', hi='#ffffff', lo='#dcc080', inp='#fffaf0', btn='#f2d890', btn_t='#2a1c30',
   tabbg='#ffe9b0', news_in='#fff9e6', scene='day',
   icons=dict(
    coin={'a':trio('#f2b02e',sh='#8a5010',li='#fff3c0'),'d':'#8a5a18'}, gear={'a':trio('#8a8478',sh='#4a3a5a',li='#ffffff')},
    sofa={'a':trio('#2f8f8c',sh='#2a3a48',li='#a0f0e0'),'b':trio('#46aaa4',sh='#2a3a48',li='#c0fff0'),'d':'#4a3224'},
    monitor={'a':trio('#7a768c',sh='#3a3050',li='#ffffff'),'s':'#1f2a40','l':'#ffc45a'},
    doll={'a':trio('#e8d0a8',sh='#5a3a4a',li='#fff4e0'),'h':trio('#3a9a8a',sh='#1a3a40',li='#c8fff0'),'k':trio('#f0d6b0',sh='#5a3a4a',li='#fff8ea'),'e':'#2a1c20','d':'#6a4a3a'},
    tv={'a':trio('#b0905a',sh='#5a3a4a',li='#f0d8b0'),'s':'#2a3446','d':'#e8a62e'},
    star_on={'a':trio('#f0a820',sh='#8a4a10',li='#fff2c0')}, star_off={'a':'#d8c890'}, x={'a':trio('#7a6450',sh='#3a2a4a',li='#ffffff')}),
   iol='#2a1a30', buy='#e04040', buy_hi='#ff9a98', buy_lo='#9a1c24', sell='#3a74e8', sell_hi='#9ab8ff', sell_lo='#1c3c9a'),
}

TH['night'].update(gearc='#eef0ff',staron='#ffc45a',staroff='#5a5498')
TH['day'].update(gearc='#7a7488',staron='#f0a820',staroff='#e0d2a0')

def poly(n):
    return (f'polygon({n}px 0,calc(100% - {n}px) 0,calc(100% - {n}px) {n}px,100% {n}px,100% calc(100% - {n}px),calc(100% - {n}px) calc(100% - {n}px),'
            f'calc(100% - {n}px) 100%,{n}px 100%,{n}px calc(100% - {n}px),0 calc(100% - {n}px),0 {n}px,{n}px {n}px)')

def pnl(T,inner,style='',bg=None,hi=True,cls='',n=2):
    """pixel panel: dark outline + notched corners + flat fill + 2px bevel"""
    bg=bg or T['panel']
    bev=f'box-shadow:inset 0 2px 0 {T["hi"]},inset 2px 0 0 {T["hi"]},inset 0 -2px 0 {T["lo"]},inset -2px 0 0 {T["lo"]};' if hi else ''
    return (f'<div class="{cls}" style="box-sizing:border-box;padding:2px;background:{T["bd"]};clip-path:{poly(n)};{style}">'
            f'<div style="box-sizing:border-box;width:100%;height:100%;background:{bg};clip-path:{poly(n)};{bev}">{inner}</div></div>')

def pbtn(T,label,bg,fg,w,h,hi,lo,onclick='',style='',aria=''):
    w=f'{w}px' if isinstance(w,int) else w
    oc=f' onClick="{onclick}"' if onclick else ''
    return (f'<button {aria}{oc} style="position:relative;width:{w};height:{h}px;padding:2px;border:0;box-sizing:border-box;background:{T["bd"]};clip-path:{poly(2)};flex:none;{style}">'
            f'<span style="display:flex;align-items:center;justify-content:center;box-sizing:border-box;margin:0;width:100%;height:100%;background:{bg};color:{fg};clip-path:{poly(2)};'
            f'box-shadow:inset 0 2px 0 {hi},inset 2px 0 0 {hi},inset 0 -3px 0 {lo},inset -2px 0 0 {lo};font-size:inherit;font-weight:inherit">{label}</span></button>')

def icon(T,name,size=24,op=1.0,filt=''):
    if name=='gear':
        c=T['gearc']; s=render('gear2',{'a':(c,c,c),'h':T['iol']},T['iol'],False,size,False,opacity=op)
    elif name in ('star_on','star_off'):
        c=T['staron'] if name=='star_on' else T['staroff']; s=render('star2',{'a':(c,c,c)},T['iol'],False,size,False,opacity=op)
    elif name=='coin':
        s=render('coin2',T['icons']['coin'],T['iol'],False,size,True,opacity=op)
    elif name=='coin_s':
        c=T['icons']['coin']['a'][0]; s=render('coin_s',{'a':(c,c,c),'e':'#fff2c0','d':'#d08a1c'},T['iol'],False,size,False,opacity=op)
    else:
        s=render(name,T['icons'][name],T['iol'],False,size,True,opacity=op)
    return s if not filt else f'<span style="display:inline-flex;filter:{filt}">{s}</span>'

NEWS_RED='#ff2d3d'
def news_chip(extra=''):
    inner=(f'<span style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;box-sizing:border-box;background:{NEWS_RED};clip-path:{poly(2)};'
           f'box-shadow:inset 0 2px 0 #ff9aa2,inset 2px 0 0 #ff9aa2,inset 0 -3px 0 #a00c1c,inset -2px 0 0 #a00c1c;color:#fff;font-weight:700;font-size:14px;letter-spacing:.1em;line-height:1;text-shadow:0 2px 0 #7a0c16">NEWS!{extra}</span>')
    return (f'<div style="position:absolute;left:12px;top:10px;height:32px;width:78px;filter:drop-shadow(0 0 5px rgba(255,45,61,.85))">'
            f'<div style="box-sizing:border-box;width:100%;height:100%;padding:2px;background:#0c0818;clip-path:{poly(2)}">{inner}</div></div>')

def chip(T,inner,style):
    return f'<div style="position:absolute;{style}">{pnl(T,inner,"width:100%;height:100%")}</div>'

def gear_btn(T):
    return (f'<div style="position:absolute;right:12px;top:8px;width:38px;height:38px;z-index:5">'
            + pbtn(T,icon(T,"gear",30),T['panel'],T['text'],38,38,T['hi'],T['lo'],aria='aria-label="설정" ')+'</div>')

def coins(T,speed2=False,extra_right=60):
    sp=f'<span style="display:inline-flex;align-items:center;color:{T["accent"]}">{play_svg(2,11)}</span>' if speed2 else ''
    return chip(T,f'<div style="display:flex;align-items:center;gap:7px;height:100%;padding:0 11px;box-sizing:border-box">{sp}{icon(T,"coin",20)}<span style="font-size:16px;font-weight:700;line-height:1;color:{T["text"]};font-variant-numeric:tabular-nums">10,000</span></div>',
                f'right:{extra_right}px;top:9px;height:34px')

def tabbar(T,active):
    tabs=[('거실','sofa'),('주식창','monitor'),('작업실','doll'),('TV홈쇼핑','tv')]
    bs=''
    for i,(lab,ic_) in enumerate(tabs):
        on=i==active; off=i==3
        col=T['accent'] if on else T['mute']
        filt='' if on else 'grayscale(.55) brightness(.9)'
        bg=T['sel'] if on else 'transparent'
        bar=f'<span style="position:absolute;left:10px;right:10px;top:0;height:3px;background:{T["accent"]}"></span>' if on else ''
        bs+=(f'<button {"aria-current=page " if on else ""}{"aria-disabled=true " if off else ""}style="position:relative;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;border:0;background:{bg};'
             f'color:{col};font-family:{FONT};font-size:11px;font-weight:{600 if on else 500};padding:0;opacity:{.4 if off else 1};clip-path:{poly(2)}">{bar}{icon(T,ic_,28,1.0,filt)}<span>{lab}</span></button>')
    return (f'<div style="position:absolute;left:0;right:0;bottom:0;height:66px;box-sizing:border-box;padding:4px 6px 6px;display:flex;gap:2px;background:{T["tabbg"]};'
            f'border-top:3px solid {T["bd"]};box-shadow:inset 0 2px 0 {T["hi"]}">{bs}</div>')

def toast(T,text,top):
    return chip(T,f'<div style="padding:8px 14px;font-size:13px;font-weight:500;color:{T["text"]};white-space:nowrap">{text}</div>',f'left:50%;top:{top}px;transform:translateX(-50%)')

def head(title,css='',w=390):
    return f'''<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<title>{title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link rel="stylesheet" href="{FONTLINK}">
<style>
body{{margin:0}}
button{{font-family:inherit;cursor:pointer}}
input{{font-family:inherit}}
{css}
</style>
</helmet>
'''
def foot(w,logic='return {};'):
    return f'''</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":{w},"height":844}}}}'>
class Component extends DCLogic {{
{logic}
}}
</script>
</body>
</html>
'''
def root(T,w,inner,h=844):
    return f'<div style="position:relative;width:{w}px;height:{h}px;overflow:hidden;background:{T["bg"]};font-family:{FONT};color:{T["text"]}">{inner}</div>\n'

# ------------------------------------------------------------------ scenes
def page_living(tod,era):
    T=TH[tod]
    img=A(f'P_living_{era}_{tod}.png')
    alt={'2000s':'2000년대','2010s':'2010년대','2020s':'2020년대'}[era]+(' 밤' if tod=='night' else ' 낮')+' 거실'
    body=(f'<img src="{img}" alt="{alt}" style="position:absolute;left:0;top:0;width:390px;height:844px;image-rendering:pixelated">'
          +news_chip()+coins(T,speed2=(era=='2020s'))+gear_btn(T)+toast(T,'LP판을 누르면 음악이 바뀌어요.',104)+tabbar(T,0))
    return head(alt)+root(T,390,body)+foot(390)

def page_workshop(tod):
    T=TH[tod]
    img=A(f'P_workshop_2000s_{tod}.png')
    pend=chip(T,f'<div style="display:flex;align-items:center;justify-content:center;gap:6px;height:100%;padding:0 12px;box-sizing:border-box;font-size:12px;font-weight:500;color:{T["mute"]};white-space:nowrap">지급 예정 <span style="font-size:15px;font-weight:700;color:{T["accent"]};font-variant-numeric:tabular-nums">+6</span>{icon(T,"coin_s",16)}</div>','right:60px;top:48px;height:30px;width:136px')
    prog=toast(T,f'눈 <b style="font-size:15px;font-variant-numeric:tabular-nums">1</b>개 <span style="opacity:.4;margin:0 6px">|</span> 완성 <b style="font-size:15px;font-variant-numeric:tabular-nums">2</b>개',548)
    body=(f'<img src="{img}" alt="{T["name"]} 작업실" style="position:absolute;left:0;top:0;width:390px;height:844px;image-rendering:pixelated">'
          +news_chip()+coins(T)+gear_btn(T)+pend+prog+toast(T,'작업 수입은 밤12시에 한꺼번에 지급돼요.',716)+tabbar(T,2))
    return head(f'{T["name"]} 작업실')+root(T,390,body)+foot(390)

CHART="0.0,4.3 7.2,4.8 14.5,4.0 21.7,4.7 28.9,5.3 36.2,5.6 43.4,7.2 50.6,7.7 57.9,7.9 65.1,7.6 72.3,9.5 79.6,10.6 86.8,12.5 94.0,12.1 101.3,20.9 108.5,22.7 115.7,21.9 123.0,21.1 130.2,21.2 137.4,21.4 144.7,22.9 151.9,24.7 159.1,25.2 166.4,26.9 173.6,28.2 180.9,29.4 188.1,31.1 195.3,31.6 202.6,32.3 209.8,31.9 217.0,42.9 224.3,43.0 231.5,43.4 238.7,43.4 246.0,44.0 253.2,44.9 260.4,44.2 267.7,43.5 274.9,43.2 282.1,43.1 289.4,44.0 296.6,45.0 303.8,45.9 311.1,47.2 318.3,47.1 325.5,47.7 332.8,47.3 340.0,48.0"

AR_DEC='aria-label="수량 줄이기" '
AR_INC='aria-label="수량 늘리기" '
def page_trading(tod):
    T=TH[tod]
    tn='font-variant-numeric:tabular-nums'
    css=f"""
.row{{display:grid;grid-template-columns:22px 88px 1fr 62px 72px;column-gap:6px;align-items:center;height:27px;padding:0 12px;border-bottom:2px solid {T['line']};font-size:14px}}
.row .n{{text-align:right;font-weight:600;{tn}}}
.row.sel{{background:{T['sel']};box-shadow:inset 3px 0 0 {T['selring']}}}
.up{{color:{T['up']}}} .dn{{color:{T['dn']}}}
.news{{height:204px;overflow-y:auto;scroll-snap-type:y mandatory;scrollbar-width:thin}}
.ni{{height:204px;box-sizing:border-box;scroll-snap-align:start;padding:0 12px 0}}
.bd{{margin-top:2px;font-size:12px;line-height:1.45;color:{T['mute']};display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}}
.hl{{font-size:14px;font-weight:600;line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}
"""
    star=lambda on:icon(T,'star_on' if on else 'star_off',22)
    stocks=[('강물신문','1,081','+8.1%','up',0,[6,7,6,8,7,9,8,10,11,12]),('구슬제약','1,263','+26.3%','up',0,[4,4,5,5,6,9,10,11,13,14]),('노랑제분','808','-19.2%','dn',1,[13,12,12,10,9,9,6,5,4,3]),('노을엔터','1,008','+0.8%','up',0,[8,9,8,9,8,9,10,9,10,10]),('단풍중장비','849','-15.1%','dn',0,[12,11,11,10,8,9,7,6,6,5])]
    def spark(v,c):
        pts=' '.join(f'{i*6.5:.1f},{15-y:.1f}' for i,y in enumerate(v))
        return f'<svg width="58" height="16" viewBox="0 0 58 16" shape-rendering="crispEdges" aria-hidden="true" style="justify-self:center;display:block"><polyline fill="none" stroke="{T[c]}" stroke-width="2" stroke-linejoin="miter" points="{pts}"/></svg>'
    rows=''.join(f'<div class="row{" sel" if s else ""}" style="{"border-bottom:0" if i==4 else ""}">{star(s)}<span style="font-weight:{600 if s else 500}">{n}</span>{spark(sp,c)}<span class="n {c}">{p}</span><span class="n {c}">{pc}</span></div>' for i,(n,p,pc,c,s,sp) in enumerate(stocks))
    spd=lambda n,on: pbtn(T,play_svg(n,13),T['accent'] if on else T['btn'],T['accent_t'] if on else T['btn_t'],44,28,'#ffffff55' if on else T['hi'],'#00000040' if on else T['lo'],aria=f'aria-label="{n}배속" aria-pressed="{"true" if on else "false"}" ')
    lab=lambda t:f'<span style="font-size:11px;font-weight:500;line-height:13px;color:{T["mute"]}">{t}</span>'
    acct=pnl(T,(f'<div style="height:56px;box-sizing:border-box;display:flex;align-items:center;justify-content:space-between;padding:2px 62px 0 12px">'
          f'<div style="display:flex;flex-direction:column;gap:3px">{lab("총 자산")}<div style="display:flex;align-items:center;gap:8px">{icon(T,"coin",24)}<span style="font-size:28px;font-weight:700;line-height:30px;{tn}">10,000</span></div></div>'
          f'<div style="display:flex;flex-direction:column;align-items:flex-end;gap:3px">{lab("남은 시간")}<span style="font-size:18px;font-weight:600;line-height:24px;{tn}">1:44:40</span></div></div>'
          f'<div style="height:2px;background:{T["line"]}"></div>'
          f'<div style="height:34px;box-sizing:border-box;display:flex;align-items:center;justify-content:space-between;padding:0 12px"><div style="display:flex;align-items:baseline;gap:8px">{lab("손익률")}<b style="font-size:15px;font-weight:600;line-height:20px;{tn}">+0.0%</b></div>'
          f'<div style="display:flex;gap:4px">{spd(1,True)}{spd(2,False)}</div></div>'),'flex:none;margin:-2px -2px 0')
    lst=pnl(T,(f'<div style="height:20px;display:flex;align-items:center;padding:0 12px;background:{T["hd"]};border-bottom:2px solid {T["bd"]};font-size:12px;font-weight:600;color:{T["mute"]};letter-spacing:.06em">종목</div>'
         f'<div class="row" style="height:18px;font-size:11px;font-weight:500;color:{T["mute"]};border-bottom:2px solid {T["bd"]}"><span></span><span>종목명</span><span style="text-align:center">20분 추이</span><span style="text-align:right">현재가</span><span style="text-align:right">등락률</span></div>{rows}'),'flex:none;margin:0 -2px')
    inp=pnl(T,'<input aria-label="주문 수량" inputmode="numeric" value="{{ qty }}" onInput="{{ setQty }}" style="width:100%;height:100%;box-sizing:border-box;text-align:center;font-size:18px;font-weight:600;'+tn+f';background:transparent;color:{T["text"]};border:0;padding:0;outline:none">','width:64px;height:40px;flex:none',bg=T['inp'],hi=False)
    xbtn=pbtn(T,icon(T,'x',14),T['btn'],T['btn_t'],28,28,T['hi'],T['lo'],aria='aria-label="닫기" ',style='align-self:center')
    stp=lambda lab,w,fn,fs=18,al='': pbtn(T,lab,T['btn'],T['btn_t'],w,40,T['hi'],T['lo'],onclick='{{ '+fn+' }}',style=f'font-size:{fs}px;font-weight:600',aria=al)
    chart=(f'<div style="position:relative;height:62px;background:{T["news_in"]};box-shadow:inset 0 0 0 2px {T["line"]};overflow:hidden"><svg width="100%" height="62" viewBox="0 0 340 52" preserveAspectRatio="none" role="img" aria-label="최근 20분 가격 차트: 하락" style="display:block" shape-rendering="crispEdges">'
           f'<path d="M0 13H340M0 26H340M0 39H340" stroke="{T["line"]}" stroke-width="1" stroke-dasharray="3 3" vector-effect="non-scaling-stroke" fill="none"/>'
           f'<polygon fill="{T["dn"]}" fill-opacity=".22" points="{CHART} 340,52 0,52"/><polyline fill="none" stroke="{T["dn"]}" stroke-width="2" stroke-linejoin="miter" vector-effect="non-scaling-stroke" points="{CHART}"/></svg>'
           f'<span style="position:absolute;right:4px;bottom:3px;width:6px;height:6px;background:{T["accent"]}"></span></div>')
    order=pnl(T,(f'<div style="box-sizing:border-box;padding:6px 12px 8px;display:flex;flex-direction:column;gap:7px">'
           f'<div style="display:flex;align-items:baseline;gap:9px;height:28px"><span style="font-size:16px;font-weight:700">노랑제분</span><span class="dn" style="font-size:20px;font-weight:700;{tn}">808</span><span class="dn" style="font-size:14px;font-weight:600;{tn}">-19.2%</span><span style="flex:1"></span>{xbtn}</div>'
           +chart+
           f'<div style="font-size:12px;color:{T["mute"]};line-height:1.4">수입한 밀과 원당으로 밀가루와 설탕을 만든다. · 보유 없음</div>'
           f'<div style="display:flex;align-items:center;gap:6px;height:40px">{stp("−",40,"dec",18,AR_DEC)}{inp}{stp("+",40,"inc",18,AR_INC)}{stp("최대",48,"max",13)}'
           f'<span style="flex:1"></span><div style="text-align:right;line-height:1.25"><div style="font-size:11px;color:{T["mute"]}">필요 코인 <span style="font-size:11px">(수수료 {{{{ fee }}}})</span></div><div style="font-size:18px;font-weight:700;{tn}">{{{{ total }}}}</div></div></div>'
           f'<div style="display:flex;gap:8px;height:46px">'
           +pbtn(T,'매수',T['buy'],'#fff','100%',46,T['buy_hi'],T['buy_lo'],onclick='{{ buy }}',style='flex:1;font-size:16px;font-weight:700')
           +pbtn(T,'매도',T['sell'],'#fff','100%',46,T['sell_hi'],T['sell_lo'],onclick='{{ sell }}',style='flex:1;font-size:16px;font-weight:700')+'</div></div>'),'flex:none;margin:0 -2px')
    rep=lambda cl,nm,pc,why,det:(f'<div style="padding:1px 0;border-top:2px solid {T["line"]}"><div style="display:flex;gap:8px;align-items:baseline;font-size:12px"><b class="{cl}" style="font-size:13px;font-weight:700;{tn}">{nm} {pc}</b><span style="color:{T["text"]}">{why}</span></div><div style="font-size:11px;color:{T["mute"]};{tn}">{det}</div></div>')
    item1=(f'<div class="ni"><div style="display:flex;align-items:center;gap:8px;height:20px"><span style="height:18px;padding:0 7px;background:{T["accent"]};color:{T["accent_t"]};font-size:11px;font-weight:700;line-height:18px">결과</span><span style="flex:1"></span><span style="font-size:12px;color:{T["mute"]};{tn}">0:13:15</span></div>'
           f'<div class="hl">조류인플루엔자 확진… 대규모 살처분 단행</div>'
           f'<div class="bd">닭 집단 폐사의 원인이 고병원성 조류인플루엔자로 확진됐다. 방역 당국은 발생 농장과 주변 농장의 닭을 모두 살처분하기로 했다. 치킨집과 닭고기 매장에는 손님이 뚝 끊겼다.</div>'
           f'<div style="margin-top:4px;padding:2px 10px 1px;background:{T["news_in"]};box-shadow:inset 0 0 0 2px {T["line"]}"><div style="font-size:11px;font-weight:600;color:{T["mute"]};letter-spacing:.06em;padding-bottom:1px">주가 리포트</div>'
           +rep('dn','들꽃양계','-17.4%','대규모 살처분과 소비 급감','발표 즉시 -13.0% · 5초 뒤 -4.4%')+rep('up','구슬제약','+16.6%','방역 약품과 소독제 수요 증가','발표 즉시 +12.4% · 5초 뒤 +4.2%')+'</div></div>')
    old=lambda tag,tm,hl:(f'<div class="ni"><div style="display:flex;align-items:center;gap:8px;height:22px"><span style="height:18px;padding:0 7px;background:{T["hd"]};color:{T["text"]};font-size:11px;font-weight:700;line-height:18px">{tag}</span><span style="flex:1"></span><span style="font-size:12px;color:{T["mute"]};{tn}">{tm}</span></div><div class="hl">{hl}</div></div>')
    news=pnl(T,(f'<div style="height:22px;display:flex;align-items:center;justify-content:space-between;padding:0 12px;background:{T["hd"]};border-bottom:2px solid {T["bd"]}"><span style="font-size:12px;font-weight:600;color:{T["mute"]};letter-spacing:.06em">뉴스</span><span style="font-size:11px;color:{T["mute"]}">아래로 스크롤하면 이전 뉴스 ▾</span></div>'
          f'<div class="news">{item1}{old("예고","0:09:40","닭 집단 폐사 잇따라… 방역 당국 조사 착수")}{old("결과","0:04:12","신약 임상 3상 성공… 제약업계 기대 확산")}</div>'),'flex:none;margin:0 -2px')
    bgimg=A(f'P_living_2000s_{tod}.png')
    body=(f'<img src="{bgimg}" alt="" style="position:absolute;left:0;top:0;width:390px;height:844px;image-rendering:pixelated;filter:brightness({.4 if tod=="night" else .5}) saturate(.85)">'
          f'<div style="position:absolute;left:0;top:0;width:390px;height:778px;box-sizing:border-box;padding:0;display:flex;flex-direction:column;gap:5px">{acct}{lst}{order}{news}</div>'
          +gear_btn(T)+tabbar(T,1))
    logic='''state = { qty: 12 };
renderVals() {
  const price = 808, cash = 10000;
  const q = Math.max(0, Math.min(999, this.state.qty | 0));
  const cost = q * price;
  const fee = Math.round(cost * 0.002);
  const fmt = (n) => n.toLocaleString('en-US');
  return {
    qty: String(q), fee: fmt(fee), total: fmt(cost + fee),
    inc: () => this.setState({ qty: q + 1 }),
    dec: () => this.setState({ qty: Math.max(0, q - 1) }),
    max: () => this.setState({ qty: Math.floor(cash / (price * 1.002)) }),
    setQty: (e) => this.setState({ qty: parseInt(String(e.target.value).replace(/[^0-9]/g, ''), 10) || 0 }),
    buy: () => {}, sell: () => {}
  };
}'''
    return head(f'주식창 ({T["name"]})',css)+root(T,390,body)+foot(390,logic)

def build_all():
    files={}
    for tod in ('night','day'):
        for era in ('2000s','2010s','2020s'):
            files[f'{tod}_living_{era}.dc.html']=page_living(tod,era)
        files[f'{tod}_workshop.dc.html']=page_workshop(tod)
        files[f'{tod}_trading.dc.html']=page_trading(tod)
    return files


def page_guide():
    T=TH['night']; tn='font-variant-numeric:tabular-nums'
    th=''
    caps={'night':{'2000s':'2000년대 · 밤','2010s':'2010년대 · 밤','2020s':'2020년대 · 밤'},'day':{'2000s':'2000년대 · 낮','2010s':'2010년대 · 낮','2020s':'2020년대 · 낮'}}
    for tod in ('night','day'):
        for era in ('2000s','2010s','2020s'):
            th+=f'<div style="width:195px"><img src="{A(f"P_living_{era}_{tod}.png")}" alt="{caps[tod][era]} 거실" style="display:block;width:195px;height:422px;image-rendering:pixelated;box-shadow:0 0 0 2px #0c0818"><div style="margin-top:6px;font-size:12px;font-weight:600;color:#f4f0ff">{caps[tod][era]}</div></div>'
    css=f""".h{{font-size:11px;font-weight:600;letter-spacing:.1em;color:#b4acdc;margin-bottom:10px}}
.t{{font-size:13px;line-height:1.6;color:#dcd6f5;margin-bottom:8px}} .t b{{color:#fff;font-weight:600}}
.sz{{display:grid;grid-template-columns:84px 1fr;align-items:baseline;gap:12px;padding:7px 0;border-top:2px solid #3a3070}}
.sz span:first-child{{font-size:11px;color:#b4acdc;{tn}}}"""
    def sz(lbl,txt,fs,fw):
        return f'<div class="sz"><span>{lbl}</span><span style="font-size:{fs}px;font-weight:{fw};color:#f4f0ff;{tn}">{txt}</span></div>'
    sizes=(sz('30 / 700','10,000',30,700)+sz('20 / 700','808 −19.2%',20,700)+sz('18 / 700','9,715 코인',18,700)+sz('16 / 700','노랑제분 · 매수',16,700)
           +sz('14 / 500–600','강물신문 1,081 +8.1%',14,500)+sz('14 / 600','고병원성 조류인플루엔자 확진…',14,600)+sz('12 / 400','수입한 밀과 원당으로 밀가루를 만든다',12,400)+sz('11 / 500','총 자산 · 남은 시간 · 탭 이름',11,500))
    sp=lambda n,on: pbtn(T,play_svg(n,13),T['accent'] if on else T['btn'],T['accent_t'] if on else T['btn_t'],44,28,'#ffffff55' if on else T['hi'],'#00000040' if on else T['lo'])
    samples=(f'<div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">'
             f'<div style="position:relative;width:90px;height:36px">{news_chip().replace("left:12px;top:10px","left:0;top:2px")}</div>'
             f'<div style="display:flex;gap:4px">{sp(1,True)}{sp(2,False)}</div>'
             f'<span style="display:inline-flex;gap:8px">{pbtn(T,"매수",T["buy"],"#fff",78,36,T["buy_hi"],T["buy_lo"],style="font-size:15px;font-weight:700")}{pbtn(T,"매도",T["sell"],"#fff",78,36,T["sell_hi"],T["sell_lo"],style="font-size:15px;font-weight:700")}</span></div>'
             f'<div style="display:flex;gap:14px;margin-top:16px;align-items:center">'+''.join(icon(T,n,30) for n in ['coin','gear','sofa','monitor','doll','tv','star_on','star_off'])+'</div>')
    dogs=(f'<img src="{A("dog_poses.png")}" alt="강아지 동작: 엎드리기, 앉기, 걷기 1·2 (아기·어른·노견)" style="display:block;width:670px;height:auto;image-rendering:pixelated;box-shadow:0 0 0 2px #0c0818">')
    inner=f'''<div style="box-sizing:border-box;padding:28px 30px;color:#f4f0ff;height:100%">
 <div style="display:flex;align-items:baseline;gap:14px"><span style="font-size:24px;font-weight:700">A안 · 도트 스타일 개정판</span><span style="font-size:13px;color:#b4acdc">검은 외곽선 + 단색 면 + 1픽셀 하이라이트 — 참고 이미지의 고전 도트 그림체로 전부 다시 그렸어요.</span></div>
 <div style="display:flex;gap:12px;margin-top:20px">{th}</div>
 <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:36px;margin-top:30px">
  <div><div class="h">도트 그림 규칙</div>
   <div class="t"><b>외곽선</b> 모든 물체에 1픽셀 어두운 보라 검정 선. 윤곽이 또렷해서 작게 봐도 읽혀요.</div>
   <div class="t"><b>색</b> 그라데이션·점 찍기(디더링) 없이 단색 면만 써요. 입체감은 위·왼쪽 1픽셀 밝은 선, 아래·오른쪽 1픽셀 어두운 선으로.</div>
   <div class="t"><b>빛</b> 번지지 않는 단계 띠로 표현해요. 밤은 램프 불빛 웅덩이와 달빛 자국, 낮은 창틀 그림자가 든 햇빛 자국.</div>
   <div class="t"><b>해상도</b> 130×281 도트를 3배로 키운 화면(390×844). 도트 하나가 화면에서 3×3 픽셀이에요.</div>
   <div class="t"><b>강아지</b>는 정해진 자리 없이 돌아다녀요: 걷기 → 멈춤 → 앉기·엎드리기 → 쉼 → 다시 걷기. 바닥에서도, 소파 위에서도 앉아요 (움직임 지도 보드 참고).</div>
   <div class="t"><b>시간대</b> 오후 6시~오전 6시 밤, 오전 6시~오후 6시 낮. 시대는 가구·창밖 풍경·강아지 나이로 구분해요.</div></div>
  <div><div class="h">강아지 동작 (옆모습: 엎드리기 · 앉기 · 걷기)</div>{dogs}
   <div class="h" style="margin-top:22px">글꼴과 글자 크기</div>
   <div class="t" style="margin-bottom:6px">글자와 숫자 모두 <b>IBM Plex Sans KR</b> 한 가지. 숫자는 자릿수 폭을 맞춰서 가격이 바뀌어도 줄이 흔들리지 않아요.</div>{sizes}</div>
  <div><div class="h">화면 규칙</div>
   <div class="t">패널과 버튼은 모서리를 한 칸씩 깎은 도트 모양에 2픽셀 외곽선. 설정 버튼은 모든 탭에서 <b>상단 맨 오른쪽</b>, 왼쪽 위 NEWS!는 빨강.</div>
   <div class="t">배속은 <b>▶ / ▶▶</b>. 주문은 수량을 입력하거나 ± 로 맞춘 뒤 <b>매수·매도를 바로</b> 누르면 끝나요.</div>
   <div class="t">종목명은 <b>00테마</b>처럼 붙여 써요. 차트는 기존의 약 1.5배. 뉴스는 <b>제목 한 줄(줄이거나 요약) · 본문 세 줄 이내</b>, 창에는 가장 최근 하나만 보이고 아래로 스크롤하면 이전 뉴스.</div>
   <div class="t"><b>작업 수입</b>은 밤12시에 한꺼번에 지급돼요.</div>
   {samples}</div>
 </div></div>'''
    return head('도트 스타일 개정판 가이드',css)+root(T,1290,inner,1580)+foot(1290)

def page_dogmotion():
    T=TH['night']
    inner=f'<img src="{A("dog_motion_map.png")}" alt="거실 강아지 움직임 지도" style="display:block;width:880px;height:900px;image-rendering:auto">'
    return head('강아지 움직임')+root(T,880,inner,900)+foot(880)

def build_extra(files):
    files['Guide.dc.html']=page_guide()
    files['DogMotion.dc.html']=page_dogmotion()
    return files

if __name__=='__main__':
    f=build_extra(build_all()); f['Main.dc.html']=f.pop('night_living_2000s.dc.html')
    for n,s in f.items(): open(f'{OUT}/{n}','w').write(s)
    print('ok',list(f))
