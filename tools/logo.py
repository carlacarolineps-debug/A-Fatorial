# -*- coding: utf-8 -*-
"""Prepara a logo da Carla para entrar no app inteiro.

POR QUE ISTO EXISTE
O app desenhava a marca com um escudo em vetor, redesenhado a mao a partir de
uma imagem antiga. A Carla mandou o arquivo original e pediu, com todas as
letras, para nao inventar outro: usar aquele. Esta ferramenta pega o arquivo
dela e produz tudo que o app precisa, sem ninguem redesenhar nada.

O QUE ELA RESOLVE, E QUE NAO E OBVIO
1. O arquivo vem com FUNDO BRANCO. O app e carbono quase preto: colar a imagem
   como veio poria um quadrado branco em cima de cada tela. A ferramenta
   descobre a cor do fundo pelos quatro cantos e a torna transparente, com
   tolerancia, para nao comer o dourado claro do brilho.
2. Vem com MARGEM SOBRANDO em volta. Numa marca de 26px no topo, margem vazia
   e a diferenca entre a marca ocupar o espaco e sumir. A ferramenta recorta
   ate o pixel que tem conteudo.
3. O app tem que ABRIR SEM INTERNET, num arquivo so. Por isso a imagem entra
   embutida em base64, do mesmo jeito que as fontes. Um PNG de 1920px viraria
   megabytes de base64: a ferramenta reduz para o maior tamanho que o app usa
   de verdade (76px em tela, 3x para tela retina) antes de embutir.
4. As lojas pedem tamanhos exatos, e o ícone maskable do Android e recortado em
   circulo: ele leva 20% de folga em volta, senao o Android corta a ponta do
   escudo.

USO
    python3 tools/logo.py caminho/da/logo.png

O que ela escreve:
    scratchpad/logo-embutida.txt   base64 para o inject.cjs embutir
    loja/icones/icone-192.png      PWA
    loja/icones/icone-512.png      PWA
    loja/icones/icone-1024.png     App Store
    loja/icones/icone-maskable-512.png  Android, com folga
    loja/icones/favicon-64.png     aba do navegador
"""
import base64
import io
import os
import sys

from PIL import Image

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ICONES = os.path.join(RAIZ, 'loja', 'icones')
SCRATCH = '/tmp/claude-0/-home-user-A-Fatorial/d65f0fa4-061f-5d1f-835f-c169fbe1d2ee/scratchpad'

# o maior desenho da marca no app e 76px; 3x cobre tela retina com folga
LADO_EMBUTIDO = 228


def cor_de_fundo(im):
    """A cor dos quatro cantos. Se os quatro concordam, e o fundo."""
    l, a = im.size
    cantos = [im.getpixel((0, 0)), im.getpixel((l - 1, 0)),
              im.getpixel((0, a - 1)), im.getpixel((l - 1, a - 1))]
    r = sum(c[0] for c in cantos) // 4
    g = sum(c[1] for c in cantos) // 4
    b = sum(c[2] for c in cantos) // 4
    # se algum canto discorda muito dos outros, nao ha fundo chapado
    for c in cantos:
        if abs(c[0] - r) > 24 or abs(c[1] - g) > 24 or abs(c[2] - b) > 24:
            return None
    return (r, g, b)


def tirar_fundo(im, tolerancia=26):
    """Deixa transparente o que for igual ao fundo, dentro da tolerancia.

    A tolerancia existe porque JPEG e redimensionamento sujam o branco puro:
    sem ela sobra uma auréola de pixels quase brancos em volta do escudo, que
    aparece como halo claro no fundo escuro do app.
    """
    im = im.convert('RGBA')
    fundo = cor_de_fundo(im)
    if fundo is None:
        return im, False
    fr, fg, fb = fundo
    dados = im.getdata()
    novo = []
    for px in dados:
        r, g, b, a = px
        dist = max(abs(r - fr), abs(g - fg), abs(b - fb))
        if dist <= tolerancia:
            novo.append((r, g, b, 0))
        elif dist <= tolerancia * 2:
            # borda: alfa proporcional, para o recorte nao ficar serrilhado
            k = (dist - tolerancia) / float(tolerancia)
            novo.append((r, g, b, int(a * k)))
        else:
            novo.append(px)
    im.putdata(novo)
    return im, True


def recortar(im):
    caixa = im.getbbox()
    return im.crop(caixa) if caixa else im


def quadrado(im, folga=0.0):
    """Centra num quadrado transparente, com folga opcional em volta."""
    l, a = im.size
    lado = int(max(l, a) * (1 + folga * 2))
    fundo = Image.new('RGBA', (lado, lado), (0, 0, 0, 0))
    fundo.paste(im, ((lado - l) // 2, (lado - a) // 2), im)
    return fundo


def salvar(im, caminho, lado):
    os.makedirs(os.path.dirname(caminho), exist_ok=True)
    im.resize((lado, lado), Image.LANCZOS).save(caminho, 'PNG', optimize=True)
    return os.path.getsize(caminho)


def principal(origem):
    if not os.path.exists(origem):
        print('nao achei o arquivo: ' + origem)
        return 1
    bruta = Image.open(origem)
    print('recebida: %dx%d, modo %s' % (bruta.size[0], bruta.size[1], bruta.mode))

    limpa, tirou = tirar_fundo(bruta)
    print('fundo chapado removido: ' + ('sim' if tirou else 'nao havia'))
    limpa = recortar(limpa)
    print('recortada para: %dx%d' % limpa.size)

    marca = quadrado(limpa)
    maskable = quadrado(limpa, folga=0.20)

    for lado, nome in [(192, 'icone-192.png'), (512, 'icone-512.png'),
                       (1024, 'icone-1024.png'), (64, 'favicon-64.png')]:
        n = salvar(marca, os.path.join(ICONES, nome), lado)
        print('  %-24s %6d bytes' % (nome, n))
    n = salvar(maskable, os.path.join(ICONES, 'icone-maskable-512.png'), 512)
    print('  %-24s %6d bytes  (com 20%% de folga para o Android)' % ('icone-maskable-512.png', n))

    # a versao que vai embutida no arquivo unico
    buf = io.BytesIO()
    marca.resize((LADO_EMBUTIDO, LADO_EMBUTIDO), Image.LANCZOS).save(buf, 'PNG', optimize=True)
    b64 = base64.b64encode(buf.getvalue()).decode('ascii')
    destino = os.path.join(SCRATCH, 'logo-embutida.txt')
    with open(destino, 'w') as f:
        f.write('data:image/png;base64,' + b64)
    print('embutida: %d px, %d KB de base64 -> %s' % (LADO_EMBUTIDO, len(b64) // 1024, destino))
    print('\nagora rode:  node inject.cjs')
    return 0


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(2)
    sys.exit(principal(sys.argv[1]))
