# -*- coding: utf-8 -*-
"""Troca os literais de cor que significam "veu sobre a superficie" e
"a marca" por triplas em variavel, para o tema inteiro virar de uma vez.

O que NAO e tocado, de proposito:
  - os blocos @media print (ja sao claros: a folha e branca nos dois temas)
  - branco solido (#fff): sao selecao, estrela e a folha impressa
  - preto puro nas sombras: sombra e preta nos dois temas, muda o alfa
"""
import io, re, sys

TROCAS = [
    # (regex do literal, substituto, apelido)
    (r'rgba\(\s*255\s*,\s*255\s*,\s*255\s*,', 'rgba(var(--veu),', 'veu (branco)'),
    (r'rgba\(\s*236\s*,\s*227\s*,\s*210\s*,', 'rgba(var(--fio),', 'fio (pergaminho)'),
    (r'rgba\(\s*198\s*,\s*168\s*,\s*103\s*,', 'rgba(var(--ouro),', 'ouro'),
    (r'rgba\(\s*233\s*,\s*184\s*,\s*76\s*,',  'rgba(var(--halo),', 'halo 1'),
    (r'rgba\(\s*245\s*,\s*181\s*,\s*61\s*,',  'rgba(var(--halo),', 'halo 2'),
]

def fatias_print(txt):
    """devolve os intervalos (ini,fim) de cada @media print"""
    fora = []
    for m in re.finditer(r'@media\s+print', txt):
        i = txt.find('{', m.end())
        if i < 0: continue
        n = 0; j = i
        while j < len(txt):
            if txt[j] == '{': n += 1
            elif txt[j] == '}':
                n -= 1
                if n == 0: break
            j += 1
        fora.append((m.start(), j+1))
    return fora

def protegido(pos, fora):
    return any(a <= pos < b for a, b in fora)

def aplica(txt):
    fora = fatias_print(txt)
    contagem = {}
    for padrao, novo, apelido in TROCAS:
        saida = []; ult = 0; n = 0
        for m in re.finditer(padrao, txt):
            if protegido(m.start(), fora):
                continue
            saida.append(txt[ult:m.start()]); saida.append(novo)
            ult = m.end(); n += 1
        saida.append(txt[ult:])
        txt = ''.join(saida)
        fora = fatias_print(txt)          # as posicoes andaram
        contagem[apelido] = n
    return txt, contagem

def mexe_no_arquivo(caminho, so_estilo=False):
    s = io.open(caminho, encoding='utf-8').read()
    if not so_estilo:
        novo, c = aplica(s)
    else:
        # so dentro de <style>...</style>
        pedacos = []; ult = 0; c = {}
        for m in re.finditer(r'(<style[^>]*>)(.*?)(</style>)', s, re.S):
            corpo, cc = aplica(m.group(2))
            for k, v in cc.items(): c[k] = c.get(k, 0) + v
            pedacos.append(s[ult:m.start()]); pedacos.append(m.group(1) + corpo + m.group(3))
            ult = m.end()
        pedacos.append(s[ult:])
        novo = ''.join(pedacos)
    if novo != s:
        io.open(caminho, 'w', encoding='utf-8').write(novo)
    return c

if __name__ == '__main__':
    print('premium.css      ', mexe_no_arquivo('premium.css'))
    print('operacao_base    ', mexe_no_arquivo('operacao_base.html', so_estilo=True))
    print('bussola.css      ', mexe_no_arquivo('bussola.css'))
