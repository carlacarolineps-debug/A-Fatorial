# -*- coding: utf-8 -*-
"""Troca travessões (— e –) por pontuação natural em português.
Não apaga: reescreve a pontuação para a frase continuar correta.
Cuidado explícito para não atravessar fronteiras de string/código."""
import re, sys

EM = '—'
EN = '–'

# depois do travessão, indica continuação da frase -> vírgula
CONT = (r"e|ou|mas|nem|n[aã]o|s[oó]|sem|e sim|por isso|porque|pois|inclusive|"
        r"ainda|j[aá]|at[eé]|ent[aã]o|logo|sempre|nunca|quase|isso|aquilo|"
        r"m[aá]x\.?|m[ií]n\.?")

def strip_tags(s):
    return re.sub(r'<[^>]*>', ' ', s)

def convert(text):
    # 1) en-dash: intervalos numéricos e resto viram hífen
    text = re.sub(r'(?<=\d)'+EN+r'(?=\d)', '-', text).replace(EN, '-')

    # 2) assinatura da autora fica em linha própria
    text = re.sub(r'(<[^/!][^>]*>)[ \t]*'+EM+r'[ \t]*(Carla Caroline)', r'\1\2', text)
    text = re.sub(r'(^|\n)([ \t]*)'+EM+r'[ \t]*(Carla Caroline)', r'\1\2\3', text)
    text = re.sub(r'\s*'+EM+r'\s*(Carla Caroline)', r'<br>\1', text)

    # 3) parentéticos "texto — miolo — resto".
    #    O miolo não pode conter aspas, chaves, ponto-e-vírgula, tags nem fim de
    #    frase: isso impede emparelhar travessões de duas strings diferentes.
    def par(m):
        inner = m.group(1).strip()
        if len(inner) < 3 or re.search(r'[.!?]\s', inner):
            return m.group(0)
        return (' (' + inner + ') ') if ',' in inner else (', ' + inner + ', ')
    text = re.sub(r'[ \t]*' + EM + r"\s*([^" + EM + r"<>\n'\"`{};]{3,70}?)\s*" + EM + r'\s*',
                  par, text)

    # 3b) enumeração no fim da frase quando JÁ existe dois-pontos antes:
    #     vira parênteses, para não empilhar vírgulas nem repetir dois-pontos.
    def enum(m):
        lista = m.group(2).strip()
        if ',' not in lista:
            return m.group(0)
        return m.group(1) + ' (' + lista + ')' + m.group(3)
    text = re.sub(r'(:[^.!?\n<>]{10,120}?)[ \t]*' + EM +
                  r"\s*([^" + EM + r".!?\n<>'\"`{};]{4,90}?)\s*([.!?])",
                  enum, text)

    # 4) travessões restantes, decididos pelo contexto
    out, i, tail = [], 0, ''
    for m in re.finditer(r'[ \t]*'+EM+r'[ \t\n]*', text):
        seg = text[i:m.start()]
        out.append(seg)
        i = m.end()
        tail = (tail + seg)[-220:]
        after = text[m.end():m.end()+26]
        # frase corrente já emitida (sem tags), para saber se JÁ tem dois-pontos
        cur = re.split(r'[.!?\n]', strip_tags(tail))[-1]
        # resto da frase adiante, para não criar dois dois-pontos na mesma frase
        ahead = re.split(r'[.!?\n]', strip_tags(text[m.end():m.end()+170]))[0]
        if re.match(r'(?:'+CONT+r')\b', after, re.I):
            sep = ', '            # continuação de frase
        elif ': ' in cur or ': ' in ahead:
            sep = ', '            # não repetir dois-pontos na mesma frase
        else:
            sep = ': '            # o que vem depois explica/define/enumera
        if tail[-1:] in ',:;':
            sep = ' '
        if after[:1] in ',:;.':
            sep = ''
        out.append(sep)
        tail = (tail + sep)[-220:]
    out.append(text[i:])
    text = ''.join(out)

    # 5) sem faxina global: o espaçamento já sai correto na emissão acima,
    #    e mexer em espaços no arquivo inteiro destruiria a indentação do código.
    return text

if __name__ == '__main__':
    for path in sys.argv[1:]:
        src = open(path, encoding='utf-8').read()
        new = convert(src)
        open(path, 'w', encoding='utf-8').write(new)
        print(f'{path}: {src.count(EM)+src.count(EN)} -> {new.count(EM)+new.count(EN)} restantes')
