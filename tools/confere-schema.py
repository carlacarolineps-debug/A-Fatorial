# -*- coding: utf-8 -*-
"""Confere se cada tabela, coluna, funcao e bucket que o app usa existe mesmo
no schema. E o tipo de erro que so aparece quando a aluna clica, entao vale
achar antes."""
import io, re, sys, collections

SQL = io.open('/home/user/A-Fatorial/supabase/01_schema.sql', encoding='utf-8').read()
FONTES = ['operacao_base.html','bussola_engine.js','comunidade.js','ano.js',
          'programa.js','apostila.js','alvo.js','moderacao.js','conduz.js',
          'mentor.js','quiz.js','tour.js']

# ---------- o que o banco tem ----------
tabelas = {}
for m in re.finditer(r'create table if not exists public\.(\w+)\s*\((.*?)\n\);', SQL, re.S):
    nome, corpo = m.group(1), m.group(2)
    cols = set()
    for linha in corpo.split('\n'):
        linha = linha.strip()
        if not linha or linha.startswith('--'): continue
        c = re.match(r'([a-z_][a-z0-9_]*)\s', linha)
        if c and c.group(1) not in ('primary','unique','constraint','check','foreign','references'):
            cols.add(c.group(1))
    tabelas[nome] = cols

funcoes = set(re.findall(r'create (?:or replace )?function public\.(\w+)', SQL))
buckets = set(re.findall(r"insert into storage\.buckets[^;]*?values\s*\(\s*'([^']+)'", SQL, re.S))
buckets |= set(re.findall(r"\('([a-z]+)',\s*'[a-z]+',\s*(?:true|false)", SQL))

# quais tabelas tem policy de cada tipo
pol = collections.defaultdict(set)
for m in re.finditer(r'create policy \w+ on public\.(\w+)\s*\n?\s*for (\w+)', SQL):
    pol[m.group(1)].add(m.group(2).lower())
# policies criadas dentro de laco: execute format('create policy %I_le on public.%I for select ...')
for laco in re.finditer(r"foreach t in array array\[([^\]]+)\](.*?)end loop", SQL, re.S):
    alvos = re.findall(r"'(\w+)'", laco.group(1))
    cmds  = set(c.lower() for c in re.findall(r'create policy[^$]*?for (\w+)', laco.group(2)))
    for t in alvos: pol[t] |= cmds

print('BANCO: %d tabelas, %d funcoes, buckets %s' % (len(tabelas), len(funcoes), sorted(buckets)))
print()

# ---------- o que o app usa ----------
falhas, avisos = [], []
usos = collections.defaultdict(set)

for f in FONTES:
    try: src = io.open(f, encoding='utf-8').read()
    except IOError: continue

    # .from("tabela")  seguido do que for
    for m in re.finditer(r'\.from\(\s*["\'](\w+)["\']\s*\)((?:\s*\.\w+\([^;]{0,400}?\))*)', src):
        tab, resto = m.group(1), m.group(2)
        if tab in ('audios','midia','galeria') and '.storage.from' in src[max(0,m.start()-14):m.start()+14]:
            continue
        usos[tab].add(f)
        if tab not in tabelas:
            falhas.append('%s: tabela "%s" nao existe no schema' % (f, tab))
            continue
        cols = tabelas[tab]

        # select("a,b,c")
        for s in re.findall(r'\.select\(\s*["\']([^"\']+)["\']', resto):
            for c in re.split(r'\s*,\s*', s):
                c = c.strip()
                if not c or c == '*' or '(' in c: continue
                if c not in cols:
                    falhas.append('%s: %s.select -> coluna "%s" nao existe' % (f, tab, c))

        # eq / neq / gt / lt / in / order / filter por coluna
        for fn, c in re.findall(r'\.(eq|neq|gt|gte|lt|lte|in|is|like|ilike|order)\(\s*["\']([\w.]+)["\']', resto):
            c = c.split('.')[0]
            if c and c not in cols:
                falhas.append('%s: %s.%s("%s") -> coluna nao existe' % (f, tab, fn, c))

        # insert/upsert/update({ chave: ... })
        for verbo, obj in re.findall(r'\.(insert|upsert|update)\(\s*\{(.*?)\}\s*[,)]', resto, re.S):
            for c in re.findall(r'(?:^|[\{,\s])([a-z_][a-z0-9_]*)\s*:', obj):
                if c in ('null','true','false','undefined'): continue
                if c not in cols:
                    falhas.append('%s: %s.%s -> escreve em "%s", que nao existe' % (f, tab, verbo, c))
            if verbo in ('insert','upsert') and 'insert' not in pol.get(tab,set()) and 'all' not in pol.get(tab,set()):
                avisos.append('%s: %s.%s sem policy de insert' % (f, tab, verbo))
            if verbo == 'update' and 'update' not in pol.get(tab,set()) and 'all' not in pol.get(tab,set()):
                avisos.append('%s: %s.update sem policy de update' % (f, tab))

        # onConflict tem que casar com uma unique/pk
        for oc in re.findall(r'onConflict:\s*["\']([^"\']+)["\']', resto):
            for c in re.split(r'\s*,\s*', oc):
                if c and c not in cols:
                    falhas.append('%s: %s onConflict "%s" -> coluna nao existe' % (f, tab, c))

        if '.select(' in resto and 'select' not in pol.get(tab,set()) and 'all' not in pol.get(tab,set()):
            avisos.append('%s: %s.select sem policy de select' % (f, tab))
        if '.delete(' in resto and 'delete' not in pol.get(tab,set()) and 'all' not in pol.get(tab,set()):
            avisos.append('%s: %s.delete sem policy de delete' % (f, tab))

    for fn in re.findall(r'\.rpc\(\s*["\'](\w+)["\']', src):
        if fn not in funcoes:
            falhas.append('%s: rpc("%s") nao existe no schema' % (f, fn))
    for b in re.findall(r'\.storage\.from\(\s*["\']?(\w+)["\']?\s*\)', src):
        if b not in buckets and b not in ('b','bucket'):
            falhas.append('%s: bucket "%s" nao existe' % (f, b))

print('TABELAS USADAS PELO APP: %d de %d' % (len(usos), len(tabelas)))
naoUsadas = sorted(set(tabelas) - set(usos))
print('  so no servidor (webhook/cron):', ', '.join(naoUsadas) or 'nenhuma')
print()
if falhas:
    print('ERROS (%d):' % len(falhas))
    for x in sorted(set(falhas)): print('  X', x)
else:
    print('ERROS: nenhum. Toda tabela, coluna, funcao e bucket que o app usa existe.')
print()
av = sorted(set(avisos))
if av:
    print('AVISOS de RLS (%d):' % len(av))
    for x in av: print('  !', x)
else:
    print('AVISOS de RLS: nenhum.')
sys.exit(1 if falhas else 0)
