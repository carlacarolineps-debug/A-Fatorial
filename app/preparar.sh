#!/usr/bin/env bash
# Monta a pasta www com tudo que o app precisa e chama o Capacitor.
# Rode este arquivo na SUA maquina, dentro da pasta app/.
set -e
cd "$(dirname "$0")"
RAIZ=".."

echo "1. montando o www"
rm -rf www && mkdir -p www/icones
cp "$RAIZ"/docs/index.html          www/index.html
cp "$RAIZ"/docs/manifest.json       www/
cp "$RAIZ"/docs/icones/*.png        www/icones/
cp "$RAIZ"/docs/privacidade.html    www/
cp "$RAIZ"/docs/termos.html         www/
cp "$RAIZ"/docs/suporte.html        www/
# o service worker fica de fora de proposito: dentro do app os arquivos ja
# moram no aparelho, e um cache a mais so atrapalha a atualizacao

echo "2. instalando o Capacitor"
npm install

echo "3. criando os projetos"
npx cap add android || echo "   (android ja existe)"
if [ "$(uname)" = "Darwin" ]; then
  npx cap add ios || echo "   (ios ja existe)"
else
  echo "   (ios so no Mac, pulando)"
fi

echo "4. gerando icones e splash a partir do isotipo"
mkdir -p resources
cp "$RAIZ"/loja/icones/icone-1024.png resources/icon.png
cp "$RAIZ"/loja/icones/splash-2732.png resources/splash.png
npx @capacitor/assets generate --iconBackgroundColor '#0b0a0c' --splashBackgroundColor '#0b0a0c' || \
  echo "   (se falhar, use o Image Asset do Android Studio com loja/icones/icone-1024.png)"

echo "5. sincronizando"
npx cap sync

echo
echo "Pronto. Agora:"
echo "  Android:  npx cap open android   (depois Build > Generate Signed Bundle > AAB)"
echo "  iPhone:   npx cap open ios       (depois Product > Archive)   [so no Mac]"
