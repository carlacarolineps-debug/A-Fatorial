#!/usr/bin/env python3
"""Monta as páginas do site em ARQUIVO ÚNICO.

Motivo: o site foi aberto uma vez com o CSS faltando na pasta e a página
apareceu crua: links azuis, Times, sem layout nenhum. Página que depende
de arquivo vizinho quebra na primeira vez que alguém move só um deles.
Aqui o a-fatorial.css é a fonte de verdade, e cada HTML sai com ele
embutido: um arquivo, dois cliques, nunca quebra.

Rodar depois de qualquer mudança no CSS:  python3 montar.py
"""
import re, pathlib
base = pathlib.Path(__file__).parent
css  = (base/'a-fatorial.css').read_text(encoding='utf-8')
marca = '<!-- ↓↓↓ a-fatorial.css embutido por montar.py, edite o .css, não aqui ↓↓↓ -->'
fim   = '<!-- ↑↑↑ fim do a-fatorial.css embutido ↑↑↑ -->'
bloco = f'{marca}\n<style>\n{css}\n</style>\n{fim}'

for nome in ['index.html','marca.html']:
    p = base/nome
    s = p.read_text(encoding='utf-8')
    if marca in s:                     # já embutido: troca o bloco
        s = re.sub(re.escape(marca)+r'.*?'+re.escape(fim), bloco, s, flags=re.S)
    else:                              # primeira vez: troca o <link>
        s = s.replace('<link rel="stylesheet" href="a-fatorial.css">', bloco)
    p.write_text(s, encoding='utf-8')
    print(f'{nome}: {len(s)//1024} KB')
