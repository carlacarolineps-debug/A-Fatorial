#!/usr/bin/env python3
"""Le uma pagina da Apple Human Interface Guidelines em texto.

A HIG e um site que monta por JavaScript: baixar o HTML devolve so o
titulo. O conteudo mora no JSON que a propria pagina busca, em
  https://developer.apple.com/tutorials/data/design/human-interface-guidelines/<pagina>.json
Este arquivo baixa esse JSON e imprime o texto, para a leitura ser da
fonte oficial e nao de memoria.

  python3 tools/hig.py layout
  python3 tools/hig.py accessibility typography color
"""
import json, sys, urllib.request

BASE = "https://developer.apple.com/tutorials/data/design/human-interface-guidelines/%s.json"

def txt(nodes):
    """junta os pedacos de texto de um bloco de inline content"""
    out = []
    for n in nodes or []:
        t = n.get("type")
        if t == "text":
            out.append(n.get("text", ""))
        elif t in ("emphasis", "strong", "link", "reference", "inlineHead"):
            out.append(txt(n.get("inlineContent")) or n.get("title", ""))
        elif t == "codeVoice":
            out.append(n.get("code", ""))
    return "".join(out)

def anda(bloco, saida, nivel=0):
    if isinstance(bloco, list):
        for b in bloco:
            anda(b, saida, nivel)
        return
    if not isinstance(bloco, dict):
        return
    t = bloco.get("type")
    if t == "heading":
        saida.append("\n" + "#" * max(1, bloco.get("level", 2)) + " " + bloco.get("text", ""))
    elif t == "paragraph":
        s = txt(bloco.get("inlineContent"))
        if s.strip():
            saida.append(s)
    elif t in ("unorderedList", "orderedList"):
        for item in bloco.get("items", []):
            sub = []
            anda(item.get("content"), sub, nivel + 1)
            for linha in sub:
                saida.append("  - " + linha.strip())
    elif t == "aside":
        sub = []
        anda(bloco.get("content"), sub, nivel + 1)
        saida.append("[" + (bloco.get("style") or "nota").upper() + "] " + " ".join(x.strip() for x in sub))
    elif t == "table":
        for linha in bloco.get("rows", []):
            celulas = []
            for c in linha:
                sub = []
                anda(c, sub, nivel + 1)
                celulas.append(" ".join(x.strip() for x in sub))
            saida.append(" | ".join(celulas))
    elif "content" in bloco:
        anda(bloco.get("content"), saida, nivel)

def pagina(slug):
    req = urllib.request.Request(BASE % slug, headers={"User-Agent": "Mozilla/5.0"})
    d = json.load(urllib.request.urlopen(req, timeout=45))
    saida = ["===== HIG: %s =====" % slug]
    t = (d.get("metadata") or {}).get("title")
    if t:
        saida.append("TITULO: " + t)
    ab = txt(d.get("abstract"))
    if ab:
        saida.append(ab)
    for sec in d.get("primaryContentSections", []) or []:
        anda(sec.get("content"), saida)
    for sec in d.get("sections", []) or []:
        anda(sec.get("content"), saida)
    return "\n".join(x for x in saida if x is not None)

if __name__ == "__main__":
    alvos = sys.argv[1:] or ["layout"]
    for a in alvos:
        try:
            print(pagina(a))
        except Exception as e:
            print("===== HIG: %s ===== FALHOU: %s" % (a, e))
        print()
