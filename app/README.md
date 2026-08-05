# Virar aplicativo de verdade

O app já roda como aplicativo hoje, pelo endereço do site (veja o README da
raiz). Esta pasta é o passo seguinte: o pacote que sobe para a Google Play e
para a App Store.

## Antes de começar, o que você precisa

| | Para o Android | Para o iPhone |
|---|---|---|
| Computador | qualquer um | **Mac**, sem alternativa |
| Programa | Android Studio | Xcode |
| Conta | Google Play Console, 25 dólares uma vez | Apple Developer, 99 dólares por ano |

Nos dois casos, o Node precisa estar instalado (<https://nodejs.org>).

## O comando

```bash
cd app
./preparar.sh
```

Ele monta a pasta `www` com o app, instala o Capacitor, cria os projetos
Android e iOS, gera os ícones a partir do próprio isotipo e sincroniza tudo.

Depois:

```bash
npx cap open android    # abre o Android Studio
npx cap open ios        # abre o Xcode (só no Mac)
```

No Android Studio: **Build**, **Generate Signed Bundle / APK**, formato
**Android App Bundle (AAB)**. É o arquivo que sobe para a Play Console.

No Xcode: **Product**, **Archive**, e depois **Distribute App**.

## O que já está configurado

- **`capacitor.config.json`**: o identificador `com.operacaoblindada.app`, a
  splash em carbono, a barra de status escura e o teclado empurrando a tela
  em vez de cobrir o campo.
- **Os plugins** em `package.json`: App (o botão de voltar do Android),
  Browser (link externo abre no navegador do sistema), Keyboard, StatusBar,
  SplashScreen, Network, Share e Preferences.
- **O app já sabe que está dentro de um aplicativo**: `window.EM_APP` liga
  o comportamento nativo (voltar, link externo, teclado, impressão como
  arquivo) e desliga a pré-visualização sem login.

## Se algo der errado

- **`npx cap add android` reclama de SDK**: abra o Android Studio uma vez,
  ele instala o SDK sozinho, e rode de novo.
- **O ícone sai com borda branca**: use o **Image Asset** do Android Studio
  com `loja/icones/icone-1024.png` e escolha o formato adaptativo.
- **A Apple reprova por não conseguir entrar**: você precisa informar uma
  conta de teste no formulário de revisão, com o acesso já liberado no
  banco, explicando que a entrada é por código de 6 dígitos enviado por
  e-mail. Está detalhado em `loja/README.md`.
