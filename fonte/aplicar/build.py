# Monta public/aplicar/index.html a partir das partes desta pasta.
#
# Rode de dentro desta pasta:   cd fonte/aplicar && python3 build.py
#
# Mesma forma do build do sistema, e pelo mesmo motivo: o resultado e UM
# arquivo so, sem nenhuma requisicao a terceiros. As duas fontes entram em
# base64, a marca vem do mark_geo.svg e os 35 icones sao extraidos do
# page.tpl.html da landing. Os dois produtos usam o mesmo desenho para a
# mesma coisa, e nao existe um segundo conjunto para manter em dia.
#
# A ordem dos arquivos esta escrita abaixo, nao adivinhada por ordem
# alfabetica: mudar a ordem muda o que sobrescreve o que.
import base64, json, os, re, urllib.parse

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.join(AQUI, '..', '..')
SAIDA = os.path.join(RAIZ, 'public', 'aplicar', 'index.html')
os.chdir(AQUI)


def ler(caminho):
    with open(caminho, encoding='utf-8') as f:
        return f.read()


# ---------------------------------------------------------------- fontes
# As mesmas duas da landing e do sistema, embutidas. Buscar fonte de
# terceiro daqui contaria para fora quem esta preenchendo a aplicacao, e
# esta pagina nao faz nenhuma requisicao para fora.
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
# O simbolo id="mark" do page.tpl.html nasce vazio: os caminhos moram no
# mark_geo.svg e entram no build. Quem procurar o desenho dentro do
# page.tpl.html volta com um marcador de texto.
svg = ler('../mark_geo.svg')
mark_paths = ''.join(re.findall(r'<path[^>]*/>', svg))
if not mark_paths:
    raise SystemExit('nao achei os caminhos da marca no mark_geo.svg')

# ---------------------------------------------------------------- icones
landing = ler('../page.tpl.html')
simbolos = ''.join(re.findall(r'<symbol[^>]*\bid="i-[a-z-]+"[^>]*>.*?</symbol>', landing, re.S))
if not simbolos:
    raise SystemExit('nao achei os simbolos i-* no page.tpl.html')
quantos_icones = len(re.findall(r'\bid="i-[a-z-]+"', simbolos))

# ---------------------------------------------------------------- favicon
# Mesma construcao do build do sistema, para a aba ficar igual a das
# outras duas paginas.
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

# ------------------------------------------------------- definicao de reserva
# A pagina busca a definicao viva no servidor ao abrir. Se a leitura
# falhar, ela usa esta copia embutida e a pessoa responde igual, sem ver
# tela de erro nenhuma: erro que a pessoa nao precisa resolver nao vira
# aviso na cara dela.
#
# A copia entra JA PODADA, exatamente como a rota publica devolve: sem
# pergunta desligada, sem recado interno e sem a fiacao que liga pergunta
# a coluna do banco. Assim o desenho da tela e o mesmo, tenha a definicao
# vindo do servidor ou daqui.
def podar(d):
    cab = {
        'versao': d.get('versao', 1),
        'publicado_em': d.get('publicado_em'),
        'titulo': d.get('titulo', ''),
        'abertura': d.get('abertura', {}),
        'agradecimento': d.get('agradecimento', {}),
        'perguntas': [],
    }
    for p in d.get('perguntas', []):
        if not p.get('ativa', True):
            continue
        limpa = dict(p)
        limpa.pop('nota', None)
        limpa.pop('papel', None)
        cab['perguntas'].append(limpa)
    return cab


# De onde sai a definicao de fabrica.
#
# Ela existe em dois lugares por natureza: o servidor grava a primeira
# versao com ela, e a pagina a carrega embutida para abrir mesmo quando a
# leitura falha. Duas copias escritas a mao se desencontram, e ja se
# desencontraram uma vez: a copia desta pasta apareceu com nove perguntas
# e sem a sexta guardada enquanto a do servidor seguia com dez.
#
# Entao a fonte e o servidor, quando ele existe: o mesmo objeto, lido de
# la. O arquivo desta pasta fica como socorro para quem clonar o
# repositorio antes de as rotas existirem.
def literal_do_servidor(caminho):
    texto = ler(caminho)
    marca = 'FORMULARIO_FABRICA'
    onde = texto.find(marca)
    if onde < 0:
        return None
    inicio = texto.find('{', onde)
    if inicio < 0:
        return None
    # Percorre contando chaves, sem confundir com chave dentro de texto.
    nivel, i, dentro, escapado = 0, inicio, False, False
    while i < len(texto):
        c = texto[i]
        if dentro:
            if escapado:
                escapado = False
            elif c == '\\':
                escapado = True
            elif c == '"':
                dentro = False
        elif c == '"':
            dentro = True
        elif c in '{[':
            nivel += 1
        elif c in '}]':
            nivel -= 1
            if nivel == 0:
                break
        i += 1
    if nivel != 0:
        return None
    cru = texto[inicio:i + 1]

    # De literal de JavaScript para JSON: nome de campo ganha aspas e a
    # virgula sobrando antes do fecho sai. Tudo fora de texto.
    saida, i, dentro, escapado = [], 0, False, False
    while i < len(cru):
        c = cru[i]
        if dentro:
            saida.append(c)
            if escapado:
                escapado = False
            elif c == '\\':
                escapado = True
            elif c == '"':
                dentro = False
            i += 1
            continue
        if c == '"':
            dentro = True
            saida.append(c)
            i += 1
            continue
        m = re.match(r'([A-Za-z_][A-Za-z0-9_]*)\s*:', cru[i:])
        if m:
            saida.append('"%s":' % m.group(1))
            i += m.end()
            continue
        if c == ',':
            resto = cru[i + 1:]
            if re.match(r'\s*[}\]]', resto):
                i += 1
                continue
        saida.append(c)
        i += 1
    try:
        return json.loads(''.join(saida))
    except ValueError:
        return None


FONTE_DA_DEFINICAO = 'fonte/aplicar/formulario.json'
bruta = None
servidor = os.path.join(RAIZ, 'src', 'aplicar.js')
if os.path.exists(servidor):
    bruta = literal_do_servidor(servidor)
    if bruta and isinstance(bruta.get('perguntas'), list) and bruta['perguntas']:
        FONTE_DA_DEFINICAO = 'src/aplicar.js'
    else:
        bruta = None
        print('AVISO: nao consegui ler a definicao de fabrica do servidor.')
        print('       A pagina vai embutir a copia desta pasta, que pode')
        print('       estar atrasada em relacao ao que a rota responde.')
        print()
if bruta is None:
    bruta = json.loads(ler('formulario.json'))
    chaves = [p.get('chave') for p in bruta.get('perguntas', [])]
    if 'pergunta_6' not in chaves:
        print('AVISO: a copia desta pasta esta sem a sexta pergunta guardada,')
        print('       que o contrato manda existir desligada na posicao 6.')
        print('       Perguntas encontradas: %s' % ', '.join(str(c) for c in chaves))
        print()

reserva = podar(bruta)
definicao_js = json.dumps(reserva, ensure_ascii=False, separators=(',', ':'))
# Um "</script>" dentro do texto fecharia o bloco antes da hora, e os dois
# separadores de linha do Unicode nao sao literais validos em JavaScript.
definicao_js = (definicao_js.replace('</', '<\\/')
                            .replace(u' ', '\\u2028')
                            .replace(u' ', '\\u2029'))

# ---------------------------------------------------------------- montagem
saida = (ler('00-cabeca.html')
         .replace('/*__FONTES__*/', fontes_css)
         .replace('__FAVICON__', fav_uri)
         .replace('__MARK_PATHS__', mark_paths)
         .replace('<!--__ICONES__-->', simbolos)
         + ler('10-estilo.css')
         + '\n</style>\n</head>\n<body>\n'
         + ler('20-corpo.html')
         + '\n<script>\n'
         + ler('30-motor.js').replace('__DEFINICAO__', definicao_js)
         + '\n</script>\n</body>\n</html>\n')

# ---------------------------------------------------------------- conferencia
# Duas regras da casa que nao dependem de ninguem lembrar delas.
if '—' in saida:
    raise SystemExit('travessao no resultado: a casa nao usa esse caractere')
# Endereco de fora so pode aparecer em ligacao que a pessoa clica, nunca
# em coisa que a pagina busca sozinha ao abrir. As tres marcas abaixo sao
# as que costumam entrar sem ninguem perceber.
for fora in ('fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.', 'typeform.com',
             'src="http', "src='http", '@import url(http'):
    if fora in saida:
        raise SystemExit('a pagina ficou buscando coisa de terceiro: %s' % fora)

os.makedirs(os.path.dirname(SAIDA), exist_ok=True)
with open(SAIDA, 'w', encoding='utf-8') as f:
    f.write(saida)

tamanho = os.path.getsize(SAIDA)
ativas = len(reserva['perguntas'])
guardadas = len(bruta.get('perguntas', [])) - ativas
print('public/aplicar/index.html: %d bytes | %.1f kb' % (tamanho, tamanho / 1024))
print('reserva embutida: versao %s, %d perguntas no ar, %d guardada(s) fora do ar'
      % (reserva['versao'], ativas, guardadas))
print('a definicao de fabrica veio de: %s' % FONTE_DA_DEFINICAO)
print('icones aproveitados da landing: %d' % quantos_icones)
print()
print('LEMBRETE: a pagina so aparece no dominio depois que o caminho das')
print('rotas de aplicacao estiver ligado no Worker. Ate la ela abre com a')
print('reserva embutida e o envio nao encontra ninguem para receber.')
