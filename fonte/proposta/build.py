# Monta public/proposta/index.html a partir das partes desta pasta.
#
# Rode de dentro desta pasta:   cd fonte/proposta && python3 build.py
#
# Mesma forma do build do /aplicar, e pelo mesmo motivo: o resultado e UM
# arquivo so, sem nenhuma requisicao a terceiros. As duas fontes entram em
# base64 e a marca vem do mark_geo.svg.
#
# Por que isso importa MAIS aqui do que nas outras paginas: esta e a
# pagina onde alguem assina um contrato. Buscar fonte de terceiro contaria
# para fora quem esta lendo a proposta e quando, e uma pagina que depende
# de servidor alheio para desenhar direito e uma pagina que pode aparecer
# torta no dia da assinatura.
#
# O pacote de origem vinha em Archivo, buscada no Google Fonts. Sora e
# Inter sao as fontes da casa, as mesmas da landing e do sistema.
import base64, os, re, urllib.parse

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.join(AQUI, '..', '..')
SAIDA = os.path.join(RAIZ, 'public', 'proposta', 'index.html')
os.chdir(AQUI)


def ler(caminho):
    with open(caminho, encoding='utf-8') as f:
        return f.read()


# ---------------------------------------------------------------- fontes
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
svg = ler('../mark_geo.svg')
mark_paths = ''.join(re.findall(r'<path[^>]*/>', svg))
if not mark_paths:
    raise SystemExit('nao achei os caminhos da marca no mark_geo.svg')

# ---------------------------------------------------------------- favicon
# A mesma construcao das outras duas paginas, para a aba ficar igual.
INK = (3.0, 2.0, 167.0, 137.0)
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
saida = (ler('00-cabeca.html')
         .replace('/*__FONTES__*/', fontes_css)
         .replace('__FAVICON__', fav_uri)
         .replace('__MARK_PATHS__', mark_paths)
         + ler('10-estilo.css')
         + '\n</style>\n</head>\n<body>\n'
         + ler('20-corpo.html')
         + '\n<script>\n'
         + ler('30-motor.js')
         + '\n</script>\n</body>\n</html>\n')

# ---------------------------------------------------------------- conferencia
# As mesmas duas regras da casa das outras paginas, mais uma daqui.
if '—' in saida:
    raise SystemExit('travessao no resultado: a casa nao usa esse caractere')

for fora in ('fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.',
             'src="http', "src='http", '@import url(http'):
    if fora in saida:
        raise SystemExit('a pagina ficou buscando coisa de terceiro: %s' % fora)

# O unico endereco de fora permitido e o wa.me, e so dentro de uma ligacao
# que a PESSOA clica depois de assinar. Se ele aparecer num fetch, o
# aceite estaria saindo desta pagina para fora antes de passar pelo nosso
# servidor, que e quem grava a prova.
for linha in saida.split('\n'):
    if 'wa.me' in linha and ('fetch(' in linha or 'XMLHttpRequest' in linha):
        raise SystemExit('o wa.me virou requisicao, e ele so pode ser link')

# O contrato tem que vir do servidor, e nao daqui: duas copias do texto
# de um contrato se desencontram, e a que vale e a que foi gravada.
if 'CONTRATO DE PRESTA' in saida:
    raise SystemExit('o texto do contrato entrou na pagina; ele mora no src/propostas.js')

os.makedirs(os.path.dirname(SAIDA), exist_ok=True)
with open(SAIDA, 'w', encoding='utf-8') as f:
    f.write(saida)

tamanho = os.path.getsize(SAIDA)
print('public/proposta/index.html: %d bytes | %.1f kb' % (tamanho, tamanho / 1024))
print()
print('LEMBRETE: esta pagina e publica de proposito, e o que a tranca e o')
print('codigo de cinco letras, sorteado num alfabeto de 31 simbolos. Ela')
print('leva noindex e o robots.txt a esconde, mas isso e higiene, nao')
print('seguranca: quem protege a proposta e o codigo.')
