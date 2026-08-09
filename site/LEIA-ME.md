# Site — a porta de entrada do cliente

Três arquivos, sem build. É só abrir `index.html` no navegador.

| Arquivo | O que é |
|---|---|
| `a-fatorial.css` | **O padrão visual.** Tokens, tipografia, botões, trilha, selos e movimento. Fonte única de verdade. |
| `index.html` | **O site.** Porta de entrada do cliente, com a área de login. |
| `marca.html` | **O guia do padrão.** Vivo: mede o próprio contraste na tela. |

## Publicar

O site fica na raiz do domínio; o sistema (`../index.html`) fica na área interna:

```
afatorialsolucoes.com.br/           → site/index.html
afatorialsolucoes.com.br/sistema/   → o sistema
afatorialsolucoes.com.br/marca      → site/marca.html (uso interno)
```

## As duas marcas

O site é do **Grupo A! Fatorial** (a empresa, `@afatorialsolucoes`). A
**Carla Caroline** (`@pscarlacaroline`) aparece como marca separada, com
cartão, público e chamada próprios, na seção "Duas marcas, um mesmo
problema" (`#sobre`). São dois negócios: a consultoria atende a empresa; a
mentoria comportamental atende a pessoa que dirige.

Onde a separação está escrita no código:

- `#sobre` — os dois cartões, cada um com seu Instagram e seu botão
- rodapé — contato da empresa e, abaixo, o bloco "Mentoria"
- `data-zap` fala com a empresa; `data-zap-cc` fala com a Carla

## Quatro linhas para ajustar

Estão no topo do `<script>` em `site/index.html`:

```js
var WHATSAPP    = '551141443467';   // DDI+DDD+número da EMPRESA, só dígitos
var WHATSAPP_CC = WHATSAPP;         // da MENTORIA; troque quando tiver linha própria
var URL_SISTEMA = '../index.html';  // onde fica a área interna
var URL_SERVIDOR = '';              // backend/ — vazio = login leva ao sistema
```

Com `URL_SERVIDOR` preenchido, o login autentica já no site e a pessoa entra
no sistema com a sessão pronta — sem digitar duas vezes. Funciona quando site
e sistema estão no mesmo domínio.

## Antes de publicar

- [ ] Trocar o WhatsApp pelo celular que atende de fato
- [ ] Substituir a citação do bloco "Quem fundou o método" por uma foto real da Carla
- [ ] Dar um número de WhatsApp próprio à mentoria (`WHATSAPP_CC`)
- [ ] Revisar os números do hero (83 serviços, 5 com laudo, 21 etapas)
