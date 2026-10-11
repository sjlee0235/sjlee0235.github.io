# 화면 아이콘 SVG를 밤/낮 두 벌로 뽑아 TS 모듈로 쓴다 (build5.icon 그대로, 크기 속성은 빼고 viewBox만)
import re, json, sys
import build5 as B
from icons import play_svg

def clean(svg):
    svg = re.sub(r'fill="\((\d+), (\d+), (\d+)\)"', r'fill="rgb(\1,\2,\3)"', svg)   # 시안 HTML의 색 표기 오류 고침
    svg = re.sub(r' width="[\d.]+" height="[\d.]+"', '', svg, count=1)
    svg = re.sub(r' style="[^"]*"', '', svg, count=1)
    return svg

names = ['gear', 'star_on', 'star_off', 'coin', 'coin_s', 'sofa', 'monitor', 'doll', 'tv', 'x']
out = {}
for n in names:
    out[n] = {tod: clean(B.icon(B.TH[tod], n, 24)) for tod in ('night', 'day')}
out['play1'] = {tod: clean(play_svg(1, 14)) for tod in ('night', 'day')}
out['play2'] = {tod: clean(play_svg(2, 14)) for tod in ('night', 'day')}
bad = [n for n, v in out.items() for s in v.values() if '(' in s and 'rgb(' not in s]
assert not bad, bad
lines = ['// 자동 생성: art_source/icons_out.py (DESIGN_HANDOFF 10.5 도트 아이콘, build5.icon 그대로). 손으로 고치지 말 것.',
         '// 밤/낮 색이 다르다. 크기는 CSS로 정한다 (viewBox 격자의 정수 배).', '',
         'export type IconName = ' + ' | '.join(f"'{n}'" for n in out) + ';', '',
         'export const ICONS: Readonly<Record<IconName, { night: string; day: string }>> = ' + json.dumps(out, ensure_ascii=False, indent=2) + ';', '']
open(sys.argv[1], 'w').write('\n'.join(lines))
print('ok', len(out))
