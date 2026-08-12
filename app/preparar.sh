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
cp "$RAIZ"/docs/excluir-conta.html  www/
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

# =====================================================================
# 5. OS TEXTOS DE PERMISSAO DO IPHONE
#
# Isto NAO e detalhe de acabamento: sem estas tres linhas o aplicativo
# FECHA SOZINHO no momento em que a pessoa toca no botao, e a Apple
# reprova na hora, pela regra 2.1 (App Completeness), porque o revisor
# vai bater exatamente nesse toque.
#
# Onde cada uma e usada no app:
#   NSPhotoLibraryUsageDescription  em "Colocar uma foto", no perfil, e ao
#                                   publicar foto na galeria da comunidade
#   NSCameraUsageDescription        o mesmo seletor oferece "Tirar foto"
#   NSFaceIDUsageDescription        a trava de Face ID que reabre o app
#
# O texto importa: a Apple reprova frase generica do tipo "para usar a
# camera". Tem que dizer PARA QUE, na lingua do app.
# =====================================================================
PLIST="ios/App/App/Info.plist"
if [ -f "$PLIST" ]; then
  echo "5. escrevendo os textos de permissao no Info.plist"
  escreve() {
    /usr/libexec/PlistBuddy -c "Delete :$1" "$PLIST" 2>/dev/null || true
    /usr/libexec/PlistBuddy -c "Add :$1 string $2" "$PLIST"
    echo "   $1"
  }
  escreve NSPhotoLibraryUsageDescription \
    "Para você escolher a sua foto de perfil e publicar fotos na comunidade da mentoria."
  escreve NSCameraUsageDescription \
    "Para você tirar uma foto na hora e usar como foto de perfil ou publicar na comunidade."
  escreve NSFaceIDUsageDescription \
    "Para reabrir o aplicativo com Face ID em vez de digitar a sua senha toda vez."
  escreve NSPhotoLibraryAddUsageDescription \
    "Para salvar no seu aparelho os documentos e planos que você gera dentro do aplicativo."
else
  echo "5. (Info.plist ainda nao existe: rode de novo depois do 'cap add ios', no Mac)"
fi

echo "6. sincronizando"
npx cap sync

echo
echo "Pronto. Agora:"
echo "  Android:  npx cap open android   (depois Build > Generate Signed Bundle > AAB)"
echo "  iPhone:   npx cap open ios       (depois Product > Archive)   [so no Mac]"
echo
echo "CONFIRA ANTES DE ENVIAR:"
echo "  - abra o app no aparelho e toque em Mais > O meu perfil > Colocar uma foto."
echo "    Se o app fechar, o passo 5 nao rodou: rode este arquivo de novo."
echo "  - ligue o Face ID em Mais e feche o app por 5 minutos, para ver se ele pede."
