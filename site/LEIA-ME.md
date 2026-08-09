# Site — a porta de entrada do cliente

Três arquivos, sem build, sem internet. É só abrir `index.html` no navegador.

| Arquivo | O que é |
|---|---|
| `a-fatorial.css` | **O padrão visual.** Tokens, letras (embutidas), peças e movimento. Fonte única de verdade. |
| `index.html` | **O site.** Porta de entrada do cliente, com a área de login. |
| `marca.html` | **O guia do padrão.** Vivo: mede o próprio contraste na tela e reprova o que passar do limite. |

## O padrão visual — "o laudo"

O que a empresa entrega não é apresentação: é laudo. Documento assinado, com
método declarado, norma e lei citadas, número que se confere. Por isso o site
é composto como **documento técnico medido**, e não como landing page de
consultoria. Três regras:

1. **A estrutura é desenhada, não decorada.** Fio, coluna, margem anotada e
   rótulo de seção são o próprio layout. Cartão flutuante arredondado é
   exceção aqui, não o padrão.
2. **Todo número é leitura de instrumento.** Monoespaçada, tabular, com a
   unidade e a premissa impressas embaixo.
3. **O dourado só marca resultado.** Etapa atual, número que decide, ação.
   Se tudo é dourado, nada é.

**Papel frio, não creme quente.** O fundo (`#f0f1ed`) tem viés verde-cinza,
como vegetal de prancheta, e a tinta (`#11150f`) tem o mesmo viés — cinza
neutro sobre papel enviesado sempre parece sujo.

**Três letras, três papéis.** *Archivo* carrega os títulos e a informação;
*Newsreader itálico* é só a voz enfática, na oração destacada de um título e
na citação; *Plex Mono* é o instrumento — todo número, rótulo e referência
legal.

### As letras vêm dentro do CSS

Não há `<link>` para CDN de fonte. As três famílias estão embutidas em
base64 no `a-fatorial.css`, subset latino (o português inteiro cabe em
U+0000–00FF). Custo: ~120 KB. Motivo: o site já rodou com o Google Fonts
falhando e caindo em Georgia — e um H1 gigante em Georgia é o que faz uma
página parecer documento do Word. Assim ela abre igual em qualquer máquina,
offline, sem piscar texto trocando de fonte.

Para trocar uma família, substitua o bloco `@font-face` correspondente no
topo do `a-fatorial.css` e o token (`--grot`, `--voz` ou `--mono`).

## As duas marcas

O site é do **Grupo A! Fatorial** (a empresa, `@afatorialsolucoes`). A
**Carla Caroline** (`@pscarlacaroline`) aparece como marca separada, com
folha, público e chamada próprios, na seção "Duas marcas, um mesmo
problema" (`#sobre`). São dois negócios: a consultoria atende a empresa; a
mentoria comportamental atende a pessoa que dirige.

Onde a separação está escrita no código:

- `#sobre` — as duas folhas, cada uma com seu Instagram e seu botão
- rodapé — contato da empresa e, abaixo, o bloco "Mentoria"
- `data-zap` fala com a empresa; `data-zap-cc` fala com a Carla

## Publicar

O site fica na raiz do domínio; o sistema (`../index.html`) fica na área interna:

```
afatorialsolucoes.com.br/           → site/index.html
afatorialsolucoes.com.br/sistema/   → o sistema
afatorialsolucoes.com.br/marca      → site/marca.html (uso interno)
```

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
- [ ] Revisar os números da capa (12 anos, +500 empresárias, 83 serviços)
- [ ] Abrir `marca.html` e conferir que o laudo de contraste segue aprovado
