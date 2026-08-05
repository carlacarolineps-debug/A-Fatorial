#!/bin/sh
# Monta o pacote pronto para enviar ao KingHost.
#   uso: sh montar-pacote.sh /caminho/do/sistema.html
# Gera nexus-kinghost.zip com index.html, api.php, .htaccess e as instrucoes.
set -e
DIR=$(dirname "$0")
SISTEMA=${1:-}
[ -f "$SISTEMA" ] || { echo "Informe o arquivo .html do sistema. Ex.: sh montar-pacote.sh 'NEXUS GRB - CLIENTE (em branco).html'"; exit 1; }
SAIDA=$(mktemp -d)
mkdir -p "$SAIDA/nexus"
cp "$SISTEMA"           "$SAIDA/nexus/index.html"
cp "$DIR/api.php"       "$SAIDA/nexus/"
cp "$DIR/.htaccess"     "$SAIDA/nexus/"
cp "$DIR/LEIA-ME.txt"   "$SAIDA/nexus/"
cp "$DIR/.htpasswd-exemplo" "$SAIDA/nexus/"
(cd "$SAIDA" && zip -r -q nexus-kinghost.zip nexus)
mv "$SAIDA/nexus-kinghost.zip" ./nexus-kinghost.zip
rm -rf "$SAIDA"
echo "pronto: nexus-kinghost.zip"
