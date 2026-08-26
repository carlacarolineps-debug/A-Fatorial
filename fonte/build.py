# Monta public/index.html a partir do modelo mais as fontes e a marca.
#
# Rode de dentro desta pasta:   cd fonte && python3 build.py
#
# O site e um arquivo so, sem requisicao a terceiros: as duas fontes, o
# logotipo e o favicon entram embutidos em base64. Por isso o arquivo
# final tem 300 KB e por isso ele nao se edita na mao: edite o
# page.tpl.html e rode isto de novo.
import base64, re, urllib.parse, os

AQUI = os.path.dirname(os.path.abspath(__file__))
SAIDA = os.path.join(AQUI, '..', 'public', 'index.html')
os.chdir(AQUI)

tpl = open('page.tpl.html', encoding='utf-8').read()

logo_h_b64 = base64.b64encode(open('logo_h_660.png','rb').read()).decode()
logo_h_uri = 'data:image/png;base64,' + logo_h_b64
logo_v_uri = 'data:image/png;base64,' + base64.b64encode(open('logo_v_470.png','rb').read()).decode()

svg = open('mark_geo.svg', encoding='utf-8').read()
paths = re.findall(r'<path[^>]*/>', svg)
mark_paths = ''.join(paths)

# favicon: centraliza pela caixa REAL do desenho (nao pelo viewBox) e deixa respiro
INK  = (3.0, 2.0, 167.0, 137.0)   # x0,y0,x1,y1 do desenho dentro do viewBox 171x139
SIDE = 220.0                      # lado do quadrado
FILL = 0.64                       # fracao da largura ocupada pelo desenho
OPT  = 0.6                        # empurrao otico para a esquerda (o "D" pesa mais)
iw, ih = INK[2] - INK[0], INK[3] - INK[1]
sc = (SIDE * FILL) / iw
tx = (SIDE - iw * sc) / 2 - (INK[0] + OPT) * sc
ty = (SIDE - ih * sc) / 2 - INK[1] * sc
fav = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 220">'
       '<rect width="220" height="220" rx="48" fill="#08080a"/>'
       '<g transform="translate(%.2f %.2f) scale(%.4f)" fill="#ff8309">%s</g></svg>'
       % (tx, ty, sc, mark_paths))
fav_uri = 'data:image/svg+xml,' + urllib.parse.quote(fav, safe="")

FONT_SPECS = [
    ('Sora', 'fonts/Sora-800.woff2', '100 800'),
    ('Inter', 'fonts/Inter-400.woff2', '100 900'),
]
faces = []
for fam, path, rng in FONT_SPECS:
    b = base64.b64encode(open(path, 'rb').read()).decode()
    faces.append(
        "@font-face{font-family:'%s';font-style:normal;font-weight:%s;font-display:swap;"
        "src:url(data:font/woff2;base64,%s) format('woff2');"
        "unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,"
        "U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;}"
        % (fam, rng, b))
fonts_css = "\n".join(faces)

out = (tpl.replace('__FONTS__', fonts_css)
          .replace('__LOGOH__', logo_h_uri)
          .replace('__LOGOV__', logo_v_uri)
          .replace('__MARK_PATHS__', mark_paths)
          .replace('__FAVICON__', fav_uri))
open(SAIDA, 'w', encoding='utf-8').write(out)
print('public/index.html:', os.path.getsize(SAIDA), 'bytes |',
      round(os.path.getsize(SAIDA) / 1024, 1), 'kb')
