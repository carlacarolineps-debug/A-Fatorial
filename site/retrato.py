#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Prepara a foto da Carla para o site.

Por que existe: a foto veio de um evento — luz de janela estourada, mesa
com garrafa e lata na frente, alguém filmando em pé no canto. O site é
breu com ouro. Colar o arquivo cru ali dentro abriria um buraco branco no
meio da página.

O que este arquivo faz, e por quê:

  1. RECORTA em 4:5 exatos, o mesmo formato do cartão .retrato. Sem
     recorte, o object-fit decidiria sozinho o que cortar — e cortaria a
     mão com a pulseira, que é metade da postura.
  2. AFIA de leve. A foto é de teleobjetiva com pouca luz; o rosto está
     macio demais para um retrato de 560px.
  3. GRADUA por curva de canal. Não é duotone: a pele continua pele. O
     que muda é o pé da curva (sombra desce quase até o breu) e o topo
     (o azul cede, então o estouro da janela vira âmbar em vez de branco).
     É o que faz a foto pertencer à paleta sem virar filtro.
  4. VINHETA discreta, para o olho ir ao rosto e não à janela.
  5. DESVANECE o rodapé no alfa. É aqui que a mesa, a garrafa e a lata
     somem — não por corte, que deixaria borda dura, mas por
     transparência: a foto termina em nada e o cartão continua.

Roda de novo quando ela mandar uma foto melhor:
    python3 retrato.py        → imprime os dois base64 para colar
"""
import base64, io, pathlib
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance

base = pathlib.Path(__file__).parent
orig = Image.open(base / 'carla.jpg').convert('RGB')

# ────────────────────────────────────────────────────────── a curva de tom


def _limita(v, a=0.0, b=1.0):
    return a if v < a else (b if v > b else v)


def _curva(preto, branco, gama, pe, topo):
    """Um canal. `preto`/`branco` reenquadram; `gama` puxa os médios;
    `pe` e `topo` deslocam sombra e alta separadamente — é o split-tone
    inteiro resolvido dentro da tabela, sem custo por pixel."""
    t = []
    for x in range(256):
        v = _limita((x - preto) / float(branco - preto)) ** gama
        v = v + pe * (1 - v) ** 2 + topo * (v ** 2)
        t.append(int(round(_limita(v) * 255)))
    return t


#      preto branco gama     pé     topo
TOM = (_curva(8,  248, 1.08, -0.022, +0.030) +   # R  — alta puxa para o âmbar
       _curva(10, 250, 1.20, -0.026, -0.012) +   # G  — segura o meio
       _curva(14, 254, 1.42, +0.014, -0.086))    # B  — o azul cede no topo


def gradua(im):
    g = im.filter(ImageFilter.UnsharpMask(radius=1.2, percent=58, threshold=3))
    g = g.point(TOM)
    g = ImageEnhance.Color(g).enhance(0.93)
    return ImageEnhance.Contrast(g).enhance(1.06)


def vinheta(im, forca=0.34):
    W, H = im.size
    m = Image.new('L', (W, H), 0)
    ImageDraw.Draw(m).ellipse(
        [-W * 0.22, -H * 0.20, W * 1.22, H * 1.20], fill=255)
    m = m.filter(ImageFilter.GaussianBlur(min(W, H) * 0.16))
    escuro = ImageEnhance.Brightness(im).enhance(1 - forca)
    return Image.composite(im, escuro, m)


def em_webp(im, q):
    buf = io.BytesIO()
    im.save(buf, 'WEBP', quality=q, method=6)
    return buf.getvalue()


# ───────────────────────────────────────────────────── 1 · o retrato 4:5
# x 330→870, y 182→857. Três recortes foram testados lado a lado; este
# é o do meio. O mais aberto deixava parede demais à direita, o mais
# fechado tirava o ar à frente do olhar — e ela está de perfil, olhando
# para fora do quadro: o espaço à frente é o que faz o retrato respirar.
# À esquerda fica o encosto da cadeira, que ancora; à direita a mão com
# a pulseira entra inteira, que é metade da postura.
retrato = vinheta(gradua(orig.crop((330, 182, 870, 857))))
W, H = retrato.size

alfa = Image.new('L', (W, H), 255)
px = alfa.load()
inicio, fim = int(H * 0.80), int(H * 0.985)
for y in range(inicio, H):
    t = _limita((y - inicio) / float(fim - inicio))
    v = int(round(255 * (1 - t * t * (3 - 2 * t))))   # suavização
    for x in range(W):
        px[x, y] = v
retrato.putalpha(alfa)

# ───────────────────────────────────────────────────── 2 · o selo redondo
# O rosto, para o cartão da mentoria — onde hoje estão as iniciais CC.
# Os enquadramentos foram vistos no tamanho real (50px, não ampliados),
# que é o único jeito de julgar um selo. Duas coisas decidiram este:
# fechar demais no rosto vira mancha quando encolhe — o ombro dentro do
# quadro é o que faz o olho reconhecer uma pessoa; e ela está de perfil
# olhando para a direita, então o rosto fica à esquerda do centro, com o
# espaço à frente do olhar. Centralizado, o perfil parece encostado na
# borda.
selo = gradua(orig.crop((400, 205, 680, 485))).resize((176, 176), Image.LANCZOS)

b_ret, b_selo = em_webp(retrato, 84), em_webp(selo, 88)
(base / 'retrato.webp').write_bytes(b_ret)
(base / 'selo.webp').write_bytes(b_selo)

print(f'retrato  {retrato.size[0]}×{retrato.size[1]}  {len(b_ret)/1024:.1f} KB'
      f'  →  base64 {len(base64.b64encode(b_ret))/1024:.1f} KB')
print(f'selo     {selo.size[0]}×{selo.size[1]}  {len(b_selo)/1024:.1f} KB'
      f'  →  base64 {len(base64.b64encode(b_selo))/1024:.1f} KB')
(base / 'retrato.b64').write_text(base64.b64encode(b_ret).decode())
(base / 'selo.b64').write_text(base64.b64encode(b_selo).decode())
