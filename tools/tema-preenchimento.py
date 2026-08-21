# -*- coding: utf-8 -*-
"""Gera as excecoes do tema claro para "texto escuro sobre marca cheia".

O ouro serve a dois trabalhos opostos. Como TEXTO ele precisa escurecer no
tema claro, para contrastar com o papel. Como PREENCHIMENTO ele precisa
continuar ouro, porque quem contrasta ali e o texto escuro em cima dele, e
um ouro escurecido viraria mostarda com letra preta ilegivel.

Este script acha as regras que tem as duas coisas juntas (texto escuro E
fundo da marca) e escreve, para cada uma, a versao clara com o
preenchimento de volta ao brilho. Feito por regra e nao na mao porque sao
dezenas, e uma esquecida e um botao ilegivel que so aparece no aparelho de
alguem.
"""
import io, re

TEXTO_ESCURO = ('#241b08', '#231603', '#241703', '#04231a', '#08160f')
TROCA = [
    ('var(--amber-bright)', '#e6cfa4'),
    ('var(--amber-deep)',   'var(--amber-cheio-2)'),
    ('var(--amber)',        'var(--amber-cheio)'),
    ('var(--sage-deep)',    'var(--sage-cheio-2)'),
    ('var(--sage)',         'var(--sage-cheio)'),
]
FUNDO = re.compile(r'(background|background-image|background-color)\s*:\s*([^;}]+)')

def blocos_print(t):
    fora = []
    for m in re.finditer(r'@media\s+print', t):
        i = t.find('{', m.end()); n = 0; j = i
        while j < len(t):
            if t[j] == '{': n += 1
            elif t[j] == '}':
                n -= 1
                if n == 0: break
            j += 1
        fora.append((m.start(), j+1))
    return fora

def regras_em_ordem(t):
    """cada (seletor simples, corpo), na ordem do arquivo, fora do @print"""
    fora = blocos_print(t)
    for m in re.finditer(r'([^{}]+)\{([^{}]*)\}', t):
        if any(a <= m.start() < b for a, b in fora): continue
        sel, corpo = m.group(1).strip(), m.group(2)
        if not sel or sel.startswith('@'): continue
        # o seletor pode vir grudado no fecho de um @media: fica so a ultima linha
        sel = sel.split('\n')[-1].strip()
        if not sel or sel.startswith('@'): continue
        for um in sel.split(','):
            um = um.strip()
            if um: yield um, corpo

# A ORDEM IMPORTA, e foi um defeito meu nao respeitar: o app injeta
# <style> do base, depois bussola.css, depois premium.css, e quem manda no
# fundo de um seletor e a ULTIMA regra que o pinta. Ler regra por regra
# fazia .gtab.on voltar a ser aba de ouro preenchida, quando uma regra
# posterior ja tinha decidido que ela e aba de texto com fio embaixo: o
# resultado era letra escura sobre ouro, 2,58:1.
html = io.open('operacao_base.html', encoding='utf-8').read()
partes = [m.group(1) for m in re.finditer(r'<style[^>]*>(.*?)</style>', html, re.S)]
partes.append(io.open('bussola.css', encoding='utf-8').read())
partes.append(io.open('premium.css', encoding='utf-8').read())

ultimo_fundo, tem_texto_escuro = {}, set()
for parte in partes:
    for sel, corpo in regras_em_ordem(parte):
        if any(c in corpo for c in TEXTO_ESCURO): tem_texto_escuro.add(sel)
        for f in FUNDO.finditer(corpo):
            ultimo_fundo[sel] = (f.group(1), f.group(2).strip())

unicas = []
for sel in sorted(tem_texto_escuro):
    achado = ultimo_fundo.get(sel)
    if not achado: continue                    # herda o fundo do pai: nada a fazer
    prop, valor = achado
    if not any(a in valor for a in ('--amber', '--sage')): continue   # ja nao e marca cheia
    novo = valor
    for a, b in TROCA: novo = novo.replace(a, b)
    if novo != valor: unicas.append((sel, [f'{prop}:{novo}']))

corpo = '\n'.join(
    f':root[data-tema="claro"] :is({sel}){{{";".join(novas)} !important}}'
    for sel, novas in unicas)

bloco = '''
/* --- o preenchimento da marca, no claro ------------------------------
   Gerado por tools/tema-preenchimento.py a partir das proprias regras do
   app: toda regra que ja pinta texto escuro sobre ouro ou verde ganha
   aqui a versao clara com o preenchimento de volta ao brilho.
   E gerado, e nao escrito a mao, porque sao %d regras espalhadas por tres
   arquivos: uma esquecida e um botao ilegivel que so aparece depois, no
   aparelho de alguem. Medido: texto #241b08 sobre #c6a867 da 7,45:1.
   ------------------------------------------------------------------- */
%s
''' % (len(unicas), corpo)

io.open('tema-preenchimento.css', 'w', encoding='utf-8').write(bloco)
print(len(unicas), 'regras de preenchimento geradas')
for sel, novas in unicas[:8]:
    print('   ', sel[:58], '->', novas[0][:52])
