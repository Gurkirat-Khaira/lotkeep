import os
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
import os
OUT=os.path.join(os.path.dirname(os.path.abspath(__file__)), 'assets')
PRIMARY='#0E7C66'; INK='#0F172A'; LIGHT='#F8FAFC'
def text_path(txt, fontfile, size, x0, baseline):
    f=TTFont(fontfile); gs=f.getGlyphSet(); cmap=f.getBestCmap(); upm=f['head'].unitsPerEm
    sc=size/upm; x=x0; d=[]
    hm=f['hmtx']
    for ch in txt:
        g=cmap[ord(ch)]
        pen=SVGPathPen(gs)
        tp=TransformPen(pen,(sc,0,0,-sc,x,baseline))
        gs[g].draw(tp); d.append(pen.getCommands())
        x+=hm[g][0]*sc - 0.4  # slight tightening
    return ' '.join(d), x
# mark: 64x64
def mark(fg, bg, ring_hole=None):
    hole = bg if ring_hole is None else ring_hole
    return f'''<rect width="64" height="64" rx="15" fill="{bg}"/>
  <circle cx="22" cy="32" r="11" fill="{fg}"/>
  <circle cx="22" cy="32" r="4.6" fill="{hole}"/>
  <path d="M31 28.5h22a2.5 2.5 0 0 1 2.5 2.5v2a2.5 2.5 0 0 1-2.5 2.5h-1.5v6a1.5 1.5 0 0 1-1.5 1.5h-2.5a1.5 1.5 0 0 1-1.5-1.5v-6h-3v4a1.5 1.5 0 0 1-1.5 1.5h-2.5a1.5 1.5 0 0 1-1.5-1.5v-4H31z" fill="{fg}"/>'''
hdr='<?xml version="1.0" encoding="UTF-8"?>\n'
open(f'{OUT}/logo-mark.svg','w').write(hdr+f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="Lotkeep">\n  {mark("#FFFFFF",PRIMARY)}\n</svg>\n')
open(f'{OUT}/favicon.svg','w').write(hdr+f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">\n  {mark("#FFFFFF",PRIMARY)}\n</svg>\n')
# mono: transparent tile, currentColor key with hole cut via mask
open(f'{OUT}/logo-mark-mono.svg','w').write(hdr+'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="Lotkeep">
  <mask id="m"><rect width="64" height="64" fill="#fff"/><circle cx="22" cy="32" r="4.6" fill="#000"/></mask>
  <g fill="currentColor" mask="url(#m)">
    <circle cx="22" cy="32" r="11"/>
    <path d="M31 28.5h22a2.5 2.5 0 0 1 2.5 2.5v2a2.5 2.5 0 0 1-2.5 2.5h-1.5v6a1.5 1.5 0 0 1-1.5 1.5h-2.5a1.5 1.5 0 0 1-1.5-1.5v-6h-3v4a1.5 1.5 0 0 1-1.5 1.5h-2.5a1.5 1.5 0 0 1-1.5-1.5v-4H31z"/>
  </g>
</svg>
''')
font='/usr/share/fonts/opentype/inter/InterDisplay-SemiBold.otf'
if not os.path.exists(font): font='/usr/share/fonts/opentype/inter/Inter-SemiBold.otf'
d,xend=text_path('Lotkeep',font,40,78,46)
W=int(xend+6)
for name,txt in (('logo-wordmark.svg',INK),('logo-wordmark-dark.svg',LIGHT)):
    open(f'{OUT}/{name}','w').write(hdr+f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} 64" role="img" aria-label="Lotkeep">\n  {mark("#FFFFFF",PRIMARY)}\n  <path fill="{txt}" d="{d}"/>\n</svg>\n')
print(W)
