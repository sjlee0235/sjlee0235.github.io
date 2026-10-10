"""build6: screens for interior levels (living / workshop / TV tab). Reuses build5 UI helpers."""
import os, re, json, sys
import build5 as B
from build5 import TH, pnl, pbtn, icon, news_chip, chip, gear_btn, head, foot, root, toast, poly, FONT
from icons import play_svg

CWD = os.getcwd()
MODE = 'local'            # 'local' -> file:// paths into art6/, 'blob' -> /_blob ids from assets6.json
BLOB = json.load(open('assets6.json')) if os.path.exists('assets6.json') else {}
def A6(n):
    if MODE == 'blob': return BLOB.get(n, '/_blob/PLACEHOLDER_' + n)
    return f'file://{CWD}/art6/{n}'

COIN_W = 112
def coins6(T, speed2=False):
    w = COIN_W + (18 if speed2 else 0)
    sp = f'<span style="display:inline-flex;align-items:center;color:{T["accent"]}">{play_svg(2, 11)}</span>' if speed2 else ''
    inner = (f'<div style="display:flex;align-items:center;justify-content:center;gap:7px;height:100%;padding:0 8px;box-sizing:border-box">{sp}{icon(T, "coin", 20)}'
             f'<span style="font-size:16px;font-weight:700;line-height:1;color:{T["text"]};font-variant-numeric:tabular-nums">10,000</span></div>')
    return chip(T, inner, f'right:60px;top:9px;height:34px;width:{w}px')

def pend6(T):
    inner = (f'<div style="display:flex;align-items:center;justify-content:center;gap:6px;height:100%;padding:0 8px;box-sizing:border-box;font-size:12px;font-weight:500;color:{T["mute"]};white-space:nowrap">'
             f'지급 예정 <span style="font-size:15px;font-weight:700;color:{T["accent"]};font-variant-numeric:tabular-nums">+6</span>{icon(T, "coin_s", 16)}</div>')
    return chip(T, inner, f'right:60px;top:48px;height:34px;width:{COIN_W}px')

def upgrade_ui(T, lv):
    """interior-upgrade button (replaces the old LP hint toast) + 7 progress pips"""
    pips = ''.join(
        f'<span style="width:14px;height:7px;box-sizing:border-box;background:{T["accent"] if i < lv else T["lo"]};border:2px solid {T["bd"]};{"box-shadow:inset 0 2px 0 "+T["hi"] if i < lv else ""}"></span>'
        for i in range(7))
    if lv < 7:
        lab = (f'<span style="display:inline-flex;align-items:center;gap:6px;white-space:nowrap;font-size:13px;font-weight:700;line-height:1">'
               f'인테리어 업그레이드 - 1,000{icon(T, "coin_s", 16)}</span>')
        btn = pbtn(T, lab, T['sel'], T['text'], 236, 38, T['hi'], T['lo'], aria='aria-label="인테리어 업그레이드, 1,000 코인" ')
    else:
        lab = '<span style="font-size:13px;font-weight:700;white-space:nowrap">인테리어 완성</span>'
        btn = pbtn(T, lab, T['btn'], T['mute'], 236, 38, T['hi'], T['lo'], aria='aria-disabled="true" ')
    return (f'<div style="position:absolute;left:50%;top:104px;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:6px;z-index:4">'
            f'{btn}<div style="display:flex;gap:4px" aria-label="인테리어 단계 {lv}/7">{pips}</div></div>')

def tabbar6(T, active):
    tabs = [('거실', 'sofa'), ('주식창', 'monitor'), ('작업실', 'doll'), ('TV홈쇼핑', 'tv')]
    night = T['scene'] == 'night'
    bs = ''
    for i, (lab, ic_) in enumerate(tabs):
        on = i == active; tvon = on and i == 3
        if tvon:      # selected but not open yet: neutral grey pressed button
            bg = '#a8a4c0' if night else '#d2c49e'; col = '#241c4a' if night else '#4a3a50'; filt = 'grayscale(.7)'; bar = ''; op = 1
        else:
            col = T['accent'] if on else T['mute']; filt = '' if on else 'grayscale(.55) brightness(.9)'
            bg = T['sel'] if on else 'transparent'; op = .4 if i == 3 else 1
            bar = f'<span style="position:absolute;left:10px;right:10px;top:0;height:3px;background:{T["accent"]}"></span>' if on else ''
        bs += (f'<button {"aria-current=page " if on else ""}{"aria-disabled=true " if i == 3 else ""}style="position:relative;flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;border:0;background:{bg};'
               f'color:{col};font-family:{FONT};font-size:11px;font-weight:{600 if on else 500};padding:0;opacity:{op};clip-path:{poly(2)}">{bar}{icon(T, ic_, 28, 1.0, filt)}<span>{lab}</span></button>')
    return (f'<div style="position:absolute;left:0;right:0;bottom:0;height:66px;box-sizing:border-box;padding:4px 6px 6px;display:flex;gap:2px;background:{T["tabbg"]};'
            f'border-top:3px solid {T["bd"]};box-shadow:inset 0 2px 0 {T["hi"]}">{bs}</div>')

def bg_img(name, alt):
    return f'<img src="{A6(name)}" alt="{alt}" style="position:absolute;left:0;top:0;width:390px;height:844px;image-rendering:pixelated">'

ERA = {'2000s': '2000년대', '2010s': '2010년대', '2020s': '2020년대'}

def page_living6(tod, era, lv):
    T = TH[tod]
    body = (bg_img(f'living_{era}_{tod}_lv{lv}.png', f'{ERA[era]} {T["name"]} 거실 인테리어 {lv}단계')
            + news_chip() + coins6(T, speed2=(era == '2020s')) + gear_btn(T) + upgrade_ui(T, lv) + tabbar6(T, 0))
    return head(f'거실 {T["name"]} Lv{lv}') + root(T, 390, body) + foot(390)

def page_workshop6(tod, lv, era='2000s'):
    T = TH[tod]
    prog = toast(T, f'눈 <b style="font-size:15px;font-variant-numeric:tabular-nums">1</b>개 <span style="opacity:.4;margin:0 6px">|</span> 완성 <b style="font-size:15px;font-variant-numeric:tabular-nums">2</b>개', 606 if lv == 0 else 548)
    body = (bg_img(f'workshop_{era}_{tod}_lv{lv}.png', f'{T["name"]} 작업실 인테리어 {lv}단계')
            + news_chip() + coins6(T) + gear_btn(T) + pend6(T) + prog + toast(T, '작업 수입은 밤12시에 한꺼번에 지급돼요.', 716) + tabbar6(T, 2))
    return head(f'작업실 {T["name"]} Lv{lv}') + root(T, 390, body) + foot(390)

def page_tv6(tod, lv, era='2000s'):
    T = TH[tod]
    txt = (f'<div style="position:absolute;left:0;width:390px;top:392px;text-align:center;font-size:16px;font-weight:500;letter-spacing:.06em;color:#ffffff;line-height:20px;'
           f'text-shadow:0 0 3px #000,0 2px 0 #000;pointer-events:none">방송 준비 중</div>')
    body = (bg_img(f'tv_{tod}_lv{lv}.png', f'TV 홈쇼핑 인테리어 {lv}단계') + txt
            + news_chip() + coins6(T) + gear_btn(T) + tabbar6(T, 3))
    return head(f'TV홈쇼핑 {T["name"]} Lv{lv}') + root(T, 390, body) + foot(390)

# ------------------------------------------------------------------ rendering
def render(pages, outdir):
    """pages: {name: dc.html string}; renders PNG @2x with the local Plex font -> outdir/name.png"""
    from playwright.sync_api import sync_playwright
    os.makedirs(outdir, exist_ok=True)
    FD = CWD + '/fontdl/node_modules/@fontsource/ibm-plex-sans-kr/'
    fontcss = ''.join(f'<link rel="stylesheet" href="file://{FD}{w}.css">' for w in (400, 500, 600, 700))
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium') if os.path.exists('/opt/pw-browsers/chromium') else p.chromium.launch()
        for n, s in pages.items():
            m = re.search(r'<helmet>(.*?)</helmet>(.*?)</x-dc>', s, re.S)
            html = re.sub(r'<link[^>]*>', '', m.group(1)) + m.group(2)
            html = re.sub(r'on(Click|Input)="[^"]*"', '', html)
            hp = f'{outdir}/_{n}.html'
            open(hp, 'w').write('<meta charset=utf-8>' + fontcss + '<body style="margin:0">' + html)
            w, h = map(int, re.search(r'width:(\d+)px;height:(\d+)px;overflow:hidden', html).groups())
            pg = b.new_page(viewport={'width': w, 'height': h}, device_scale_factor=2)
            pg.goto(f'file://{CWD}/{hp}'); pg.wait_for_timeout(500)
            pg.evaluate('document.fonts.ready')
            pg.screenshot(path=f'{outdir}/{n}.png'); pg.close()
        b.close()


# ---------------------------------------------------------------- guide / sheets
from icons import trio
T_=None
def page_guide6():
    T=TH['night']; tn='font-variant-numeric:tabular-nums'
    th=''
    th=''
    for tod,tn in (('night','밤'),('day','낮')):
        for lv,nm in ((0,'처음 상태'),(3,'서랍장 들인 뒤'),(7,'완성')):
            th+=f'<div style="width:195px"><img src="{A6(f"living_2000s_{tod}_lv{lv}.png")}" alt="거실 {tn} 인테리어 {lv}단계" style="display:block;width:195px;height:422px;image-rendering:pixelated;box-shadow:0 0 0 2px #0c0818"><div style="margin-top:6px;font-size:12px;font-weight:600;color:#f4f0ff">{tn} · Lv{lv} {nm}</div></div>'
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
    dogs=(f'<img src="{A6("dog_poses.png")}" alt="강아지 동작: 엎드리기, 앉기, 걷기 1·2 (아기·어른·노견)" style="display:block;width:670px;height:auto;image-rendering:pixelated;box-shadow:0 0 0 2px #0c0818">')
    inner=f'''<div style="box-sizing:border-box;padding:28px 30px;color:#f4f0ff;height:100%">
 <div style="display:flex;align-items:baseline;gap:14px"><span style="font-size:24px;font-weight:700">A안 · 도트 스타일 + 인테리어 7단계</span><span style="font-size:13px;color:#b4acdc">처음엔 허름한 방, 1,000코인씩 쓸 때마다 가구가 들어와 완성된 방이 돼요. 거실·작업실·TV 홈쇼핑이 같은 단계를 써요.</span></div>
 <div style="display:flex;gap:12px;margin-top:20px">{th}</div>
 <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:36px;margin-top:30px">
  <div><div class="h">도트 그림 규칙</div>
   <div class="t"><b>외곽선</b> 모든 물체에 1픽셀 어두운 보라 검정 선. 윤곽이 또렷해서 작게 봐도 읽혀요.</div>
   <div class="t"><b>색</b> 그라데이션·점 찍기(디더링) 없이 단색 면만 써요. 입체감은 위·왼쪽 1픽셀 밝은 선, 아래·오른쪽 1픽셀 어두운 선으로.</div>
   <div class="t"><b>빛</b> 번지지 않는 단계 띠로 표현해요. 밤은 램프 불빛 웅덩이와 달빛 자국, 낮은 창틀 그림자가 든 햇빛 자국.</div>
   <div class="t"><b>해상도</b> 130×281 도트를 3배로 키운 화면(390×844). 도트 하나가 화면에서 3×3 픽셀이에요.</div>
   <div class="t"><b>강아지</b>는 정해진 자리 없이 돌아다녀요(걷기·앉기·엎드리기, 소파 위도). <b>터치하면</b> 서서 웃으며 꼬리를 흔들고, <b>5번 연속 터치</b>하면 배를 까고 눕고 하트가 올라와요 (강아지 터치 반응 보드).</div>
   <div class="t"><b>인테리어 7단계</b> 거실 상단 <b>인테리어 업그레이드 - 1,000 (코인)</b> 버튼을 누르면 1,000코인을 내고 한 단계씩 올라가요(Lv0→Lv7, 총 7,000코인). 단계 점 7개로 진행 정도를 보여줘요. 소파·커튼·서랍장·러그·스탠드·벽 장식·화분 순서로 가구가 들어오고, 색도 점점 선명해져요.</div>
   <div class="t"><b>LP판</b>을 누르면 배경음악이 바뀌는 기능은 그대로예요(안내 문구만 뺐어요).</div>
   <div class="t"><b>시간대</b> 오후 6시~오전 6시 밤, 오전 6시~오후 6시 낮. 시대는 가구·창밖 풍경·강아지 나이로 구분해요.</div></div>
  <div><div class="h">강아지 동작 (옆모습: 엎드리기 · 앉기 · 걷기)</div>{dogs}
   <div class="h" style="margin-top:22px">글꼴과 글자 크기</div>
   <div class="t" style="margin-bottom:6px">글자와 숫자 모두 <b>IBM Plex Sans KR</b> 한 가지. 숫자는 자릿수 폭을 맞춰서 가격이 바뀌어도 줄이 흔들리지 않아요.</div>{sizes}</div>
  <div><div class="h">화면 규칙</div>
   <div class="t">패널과 버튼은 모서리를 한 칸씩 깎은 도트 모양에 2픽셀 외곽선. 설정 버튼은 모든 탭에서 <b>상단 맨 오른쪽</b>, 왼쪽 위 NEWS!는 빨강.</div>
   <div class="t">배속은 <b>▶ / ▶▶</b>. 주문은 수량을 입력하거나 ± 로 맞춘 뒤 <b>매수·매도를 바로</b> 누르면 끝나요.</div>
   <div class="t">종목명은 <b>00테마</b>처럼 붙여 써요. 차트는 기존의 약 1.5배. 뉴스는 <b>제목 한 줄(줄이거나 요약) · 본문 세 줄 이내</b>, 창에는 가장 최근 하나만 보이고 아래로 스크롤하면 이전 뉴스.</div>
   <div class="t"><b>작업 수입</b>은 밤12시에 한꺼번에 지급돼요. 작업실의 <b>지급 예정</b> 칩은 코인 칩과 같은 크기예요.</div>
   <div class="t"><b>TV 홈쇼핑</b> 탭은 아직 열리지 않아서 지지직거리는 TV와 <b>방송 준비 중</b> 문구를 보여줘요.</div>
   {samples}</div>
 </div></div>'''
    return head('도트 스타일 개정판 가이드',css)+root(T,1290,inner,1580)+foot(1290)

def page_sheet6(name, w, h, alt):
    T = TH['night']
    inner = f'<img src="{A6(name)}" alt="{alt}" style="display:block;width:{w}px;height:{h}px;image-rendering:auto">'
    return head(alt) + root(T, w, inner, h) + foot(w)
