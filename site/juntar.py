#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Junta o SITE e o SISTEMA num arquivo único.

Por que existe: são duas aplicações completas, cada uma com CSS e JS
próprios, e agora precisam viver no mesmo arquivo. O sistema tem 833
classes e o site 209; 37 nomes se repetem. Se fossem simplesmente
coladas, uma pintaria a outra.

A solução: o SITE é embrulhado em #porta e todo o CSS dele é prefixado
com esse seletor — inclusive os tokens, que saem do :root e passam a
morar em #porta. O SISTEMA fica intocado, no escopo global, exatamente
como já funciona. Quem manda na visibilidade é uma classe no <body>.

Rodar depois de mexer em qualquer um dos dois:
    python3 juntar.py          → gera ../Grupo A! Fatorial.html
"""
import re, pathlib, sys

base   = pathlib.Path(__file__).parent
f_site = base/'index.html'
f_sis  = base.parent/'index.html'
saida  = base.parent/'Grupo A! Fatorial.html'

# ───────────────────────────────────────────────────────────── utilidades

def blocos(txt, tag):
    """Devolve (conteúdos, texto sem eles) para <tag>…</tag>."""
    achados, resto, pos = [], [], 0
    for m in re.finditer(rf'<{tag}(?:\s[^>]*)?>(.*?)</{tag}>', txt, re.S):
        achados.append(m.group(1))
        resto.append(txt[pos:m.start()]); pos = m.end()
    resto.append(txt[pos:])
    return achados, ''.join(resto)

def corpo(txt):
    m = re.search(r'<body[^>]*>(.*)</body>', txt, re.S)
    return m.group(1) if m else txt

def cabeca(txt):
    m = re.search(r'<head[^>]*>(.*)</head>', txt, re.S)
    return m.group(1) if m else ''

# ─────────────────────────────────────────────── o prefixador de seletor

RAIZ = '#porta'

def prefixa_seletor(sel):
    """Um seletor por vez. Os casos especiais são os que tocam a raiz do
    documento: html, body, :root e o * do reset — todos passam a
    significar 'a porta', não 'a página'."""
    sel = sel.strip()
    if not sel:
        return sel
    if sel == '*' or sel.startswith('*::'):
        return f'{RAIZ} {sel}'
    if sel == ':root':
        return RAIZ
    if sel in ('html', 'body'):
        return RAIZ
    if sel.startswith('body::') or sel.startswith('html::'):
        return RAIZ + sel[4:]
    if sel.startswith('body ') or sel.startswith('body.') or sel.startswith('body['):
        return RAIZ + sel[4:]
    if sel.startswith('html '):
        return RAIZ + sel[4:]
    # .js fica no <html>, então continua na frente e a porta entra depois
    if sel.startswith('.js '):
        return '.js ' + RAIZ + ' ' + sel[4:]
    if sel.startswith(RAIZ):
        return sel
    return f'{RAIZ} {sel}'

def prefixa_css(css):
    """Percorre a folha equilibrando chaves. Não toca em @font-face nem em
    @keyframes (que não têm seletor de documento) e entra dentro de
    @media/@supports para prefixar o que houver lá."""
    saida, i, n = [], 0, len(css)
    while i < n:
        # Espaço em branco e comentários saem na frente, copiados inteiros.
        # Isto aqui é o coração do bug que quebrou a primeira versão: eu
        # só checava comentário no índice exato, e entre uma regra e outra
        # sempre há um \n antes do /*. O comentário virava parte da lista
        # de seletores e as vírgulas de dentro dele partiam a regra ao meio.
        j0 = i
        while j0 < n:
            if css[j0] in ' \t\r\n':
                j0 += 1
            elif css.startswith('/*', j0):
                k = css.find('*/', j0+2)
                j0 = n if k < 0 else k+2
            else:
                break
        if j0 > i:
            saida.append(css[i:j0]); i = j0
            if i >= n: break
            continue
        chave = css.find('{', i)
        if chave < 0:
            saida.append(css[i:]); break
        cabec = css[i:chave]
        nome  = cabec.strip()
        # acha o fim do bloco equilibrando chaves
        prof, j = 1, chave+1
        while j < n and prof:
            if css[j] == '{': prof += 1
            elif css[j] == '}': prof -= 1
            j += 1
        interior = css[chave+1:j-1]

        if nome.startswith('@font-face') or nome.startswith('@keyframes') \
           or nome.startswith('@-webkit-keyframes') or nome.startswith('@page'):
            saida.append(cabec + '{' + interior + '}')
        elif nome.startswith('@media') or nome.startswith('@supports'):
            saida.append(cabec + '{' + prefixa_css(interior) + '}')
        elif nome.startswith('@'):
            saida.append(cabec + '{' + interior + '}')
        else:
            # separa a lista de seletores respeitando parênteses
            sels, atual, par = [], '', 0
            for ch in cabec:
                if ch == '(': par += 1
                elif ch == ')': par -= 1
                if ch == ',' and par == 0:
                    sels.append(atual); atual = ''
                else:
                    atual += ch
            sels.append(atual)
            novos = [prefixa_seletor(x) for x in sels if x.strip()]
            saida.append(',\n'.join(novos) + '{' + interior + '}')
        i = j
    return ''.join(saida)

# ─────────────────────────────────────────────────────────────── montagem

site = f_site.read_text(encoding='utf-8')
sis  = f_sis.read_text(encoding='utf-8')

# ATENÇÃO: o corpo precisa sair SEM os scripts. Da primeira vez eu tirei
# só os <style> e deixei os <script> no corpo — aí o JS entrava duas
# vezes e o sistema quebrava com "RH_ABAS has already been declared".
css_site, site_s1  = blocos(site, 'style')
js_site,  site_sem = blocos(site_s1, 'script')
css_sis,  sis_s1   = blocos(sis, 'style')
js_sis,   sis_sem  = blocos(sis_s1, 'script')

# o JS de uma linha que marca "o JS está vivo" volta primeiro, global
js_site = [x for x in js_site if 'className+=" js"' not in x]

css_site_p = '\n'.join(prefixa_css(c) for c in css_site)
corpo_site = corpo(site_sem)
corpo_sis  = corpo(sis_sem)

# O <head> do site manda: é ele que o cliente encontra. Mas tem de vir do
# texto JÁ sem <style> e sem <script> — senão a folha do site entra duas
# vezes, uma delas sem o prefixo, e volta a pintar o sistema inteiro.
head_site = cabeca(site_sem)
head_site = re.sub(r'<script>.*?</script>', '', head_site, flags=re.S)
head_site = re.sub(r'<!--.*?-->', '', head_site, flags=re.S)

doc = f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
<script>document.documentElement.className+=" js";</script>
{head_site.strip()}

<!-- ══ CSS DO SISTEMA (escopo global, intocado) ══ -->
<style>
{chr(10).join(css_sis)}
</style>

<!-- ══ CSS DO SITE (prefixado com #porta) ══ -->
<style>
{css_site_p}
</style>

<!-- ══ O INTERRUPTOR ══ vem por último, porque precisa vencer os dois ══ -->
<style>
/* ══════════════════════════════════════════════════════════════════════
   ARQUIVO ÚNICO — o site e o sistema no mesmo documento
   ──────────────────────────────────────────────────────────────────────
   Duas aplicações completas convivem aqui. O SISTEMA ficou intocado, no
   escopo global, exatamente como já funcionava. O SITE foi embrulhado em
   #porta e todo o CSS dele levou esse prefixo — inclusive os tokens, que
   saíram do :root. Sem isso, 37 nomes de classe repetidos fariam uma
   pintar a outra.

   O detalhe que quase passou: o sistema declara
   body{{display:flex;height:100vh;overflow:hidden}} porque é um painel de
   tela cheia. Com isso o site não rolava — a página inteira ficava presa
   na primeira dobra e nada revelava. Por isso o corpo troca de regime
   junto com o lado, e este bloco vem por último, para vencer os dois.

     .na-porta   → o site: corpo que rola, fundo breu
     .no-sistema → o sistema: painel de tela cheia

   Gerado por site/juntar.py — não edite este arquivo à mão.
   ══════════════════════════════════════════════════════════════════════ */
html{{scroll-behavior:smooth}}
@media(prefers-reduced-motion:reduce){{html{{scroll-behavior:auto}}}}

#porta{{display:block;min-height:100vh;position:relative;letter-spacing:normal}}

body.na-porta{{display:block;height:auto;min-height:100vh;overflow-x:hidden;overflow-y:visible;
  background:var(--breu,#0a0a09)}}
body.na-porta>*:not(#porta){{display:none!important}}

body.no-sistema #porta{{display:none}}
</style>
</head>
<body class="na-porta">

<!-- ══════════════ A PORTA · o site ══════════════ -->
<div id="porta">
{corpo_site.strip()}
</div>

<!-- ══════════════ A ÁREA INTERNA · o sistema ══════════════ -->
{corpo_sis.strip()}

<script>
/* ══ ponte entre os dois ══
   O login do site chama entrarNoSistema(); a saída do sistema volta
   para a porta. Nada recarrega: é a mesma página trocando de lado. */
window.entrarNoSistema=function(){{
  document.body.classList.remove('na-porta');
  document.body.classList.add('no-sistema');
  window.scrollTo(0,0);
  try{{ document.title='A! Fatorial · área interna'; }}catch(e){{}}
}};
window.voltarParaPorta=function(){{
  document.body.classList.remove('no-sistema');
  document.body.classList.add('na-porta');
  window.scrollTo(0,0);
  try{{ document.title='Grupo A! Fatorial · Soluções para Empresas e Franquias'; }}catch(e){{}}
}};
</script>

<!-- ══ JS DO SITE ══ -->
<script>
{chr(10).join(js_site)}
</script>

<!-- ══ JS DO SISTEMA ══ -->
<script>
{chr(10).join(js_sis)}
</script>
</body>
</html>
"""

saida.write_text(doc, encoding='utf-8')
print(f'{saida.name}: {len(doc)//1024} KB')
print(f'  site  → CSS {sum(len(c) for c in css_site)//1024} KB prefixado · JS {sum(len(j) for j in js_site)//1024} KB')
print(f'  sistema → CSS {sum(len(c) for c in css_sis)//1024} KB · JS {sum(len(j) for j in js_sis)//1024} KB')
