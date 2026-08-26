# Monta public/sistema/index.html a partir das partes desta pasta.
#
# Rode de dentro desta pasta:   cd fonte/sistema && python3 build.py
#
# Por que existe build para o sistema, se antes nao existia: sao nove telas,
# e um arquivo unico de milhares de linhas nao se navega nem se revisa. Aqui
# cada tela e um par de arquivos (marcacao e comportamento) e o resultado
# continua sendo UM arquivo so, sem requisicao a terceiros, do jeito que a
# Cloudflare serve melhor.
#
# A ordem dos arquivos importa e esta escrita abaixo, nao adivinhada por
# ordem alfabetica: mudar a ordem muda o que sobrescreve o que.
import base64, os, re, urllib.parse

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.join(AQUI, '..', '..')
SAIDA = os.path.join(RAIZ, 'public', 'sistema', 'index.html')
os.chdir(AQUI)

# ---------------------------------------------------------------- telas
# (chave, rotulo)  ·  cada uma precisa de telas/<chave>.html e telas/<chave>.js
TELAS = [
    ('semana',    'Minha semana'),
    ('ideias',    'Ideias que chegaram'),
    ('leitura',   'Leitura do caso'),
    ('projetos',  'Projetos em estruturacao'),
    ('entrega',   'Mesa da entrega'),
    ('roteiros',  'Roteiros e niveis'),
    ('dinheiro',  'Contratado e recebido'),
    ('cliente',   'Meu projeto'),
    ('casa',      'A casa'),
]

def ler(caminho):
    with open(caminho, encoding='utf-8') as f:
        return f.read()

# ---------------------------------------------------------------- fontes
# As mesmas duas da landing, embutidas: o sistema fica atras de login, e
# buscar fonte de terceiro dali vazaria para fora quem esta usando.
FONTES = [
    ('Sora',  '../fonts/Sora-800.woff2',  '100 800'),
    ('Inter', '../fonts/Inter-400.woff2', '100 900'),
]
faces = []
for familia, caminho, peso in FONTES:
    b64 = base64.b64encode(open(caminho, 'rb').read()).decode()
    faces.append(
        "@font-face{font-family:'%s';font-style:normal;font-weight:%s;font-display:swap;"
        "src:url(data:font/woff2;base64,%s) format('woff2');"
        "unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,"
        "U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD;}"
        % (familia, peso, b64))
fontes_css = "\n".join(faces)

# ---------------------------------------------------------------- marca
# Mesmo simbolo da landing, para quem vem do rodape reconhecer que chegou
# no lugar certo.
svg = ler('../mark_geo.svg')
mark_paths = ''.join(re.findall(r'<path[^>]*/>', svg))

INK  = (3.0, 2.0, 167.0, 137.0)
SIDE, FILL, OPT = 220.0, 0.64, 0.6
iw, ih = INK[2] - INK[0], INK[3] - INK[1]
sc = (SIDE * FILL) / iw
tx = (SIDE - iw * sc) / 2 - (INK[0] + OPT) * sc
ty = (SIDE - ih * sc) / 2 - INK[1] * sc
fav = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 220">'
       '<rect width="220" height="220" rx="48" fill="#08080a"/>'
       '<g transform="translate(%.2f %.2f) scale(%.4f)" fill="#ff8309">%s</g></svg>'
       % (tx, ty, sc, mark_paths))
fav_uri = 'data:image/svg+xml,' + urllib.parse.quote(fav, safe="")

# ---------------------------------------------------------------- montagem
marcacao = [ler('telas/%s.html' % chave) for chave, _ in TELAS]
comportamento = [ler('telas/%s.js' % chave) for chave, _ in TELAS]

saida = (ler('00-cabeca.html')
         .replace('/*__FONTES__*/', fontes_css)
         .replace('__FAVICON__', fav_uri)
         .replace('__MARK_PATHS__', mark_paths)
         + ler('10-estilo.css')
         + '\n</style>\n</head>\n<body>\n'
         + ler('20-moldura.html')
         + '\n'.join(marcacao)
         + '\n</main>\n</div>\n<script>\n'
         + ler('30-base.js')
         + '\n'.join(comportamento)
         + ler('90-fim.js')
         + '\n</script>\n</body>\n</html>\n')

os.makedirs(os.path.dirname(SAIDA), exist_ok=True)
with open(SAIDA, 'w', encoding='utf-8') as f:
    f.write(saida)

tamanho = os.path.getsize(SAIDA)
print('public/sistema/index.html: %d bytes | %.1f kb | %d telas'
      % (tamanho, tamanho / 1024, len(TELAS)))
