# Site — a porta de entrada do cliente

**Cada página é um arquivo único.** Baixe o `index.html`, salve onde quiser,
dê dois cliques. Não precisa de internet, não precisa de mais nenhum arquivo
ao lado, não tem como quebrar.

> Isso não era assim, e quebrou: o site foi aberto uma vez com o CSS faltando
> na pasta e apareceu cru — links azuis, Times, sem layout nenhum. Página que
> depende de arquivo vizinho quebra na primeira vez que alguém move só um
> deles.

| Arquivo | O que é |
|---|---|
| `index.html` | **O site.** Arquivo único, pronto para abrir ou publicar. |
| `marca.html` | **O guia do padrão.** Arquivo único. Vivo: mede o próprio contraste e reprova o que passar do limite. |
| `a-fatorial.css` | **A fonte de verdade do padrão.** Não é carregado pelas páginas: é embutido nelas. |
| `montar.py` | Embute o CSS nas duas páginas. Rode depois de mexer no CSS: `python3 montar.py` |

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

**Conversa com o material impresso,** que é preto e ouro metálico. O papel
(`#f1f0ec`) é neutro levemente quente — não é creme, que junto com serifada e
dourado virou o visual padrão de toda página gerada por máquina — e a tinta
tem o mesmo viés. O `--ferro` é o preto da marca (`#111110`) e o ouro é rampa
metálica de três paradas.

**O avião de papel é a assinatura.** No material ele está no símbolo, na ponta
do fio do cabeçalho e no lockup de cada submarca. Aqui aparece em dois lugares
só — o lockup e o fio da capa. Avião em todo canto vira enfeite.

**O lockup reproduz a estrutura do material:** "Grupo" na voz manuscrita, A!
FATORIAL pesado, a assinatura embaixo, o avião ao lado. Sobre papel claro o
"A!" usa o ouro que se lê e "FATORIAL" usa tinta — o ouro da marca sobre papel
rende 2:1 e some. Sobre preto entra a rampa metálica inteira, como no impresso.

**O símbolo é uma INTERPRETAÇÃO, não o original.** O logo é lettering feito à
mão; aqui ele só existe como foto, e foto colada na conversa não vira arquivo
que o código possa recortar. O que está no ar é uma reconstrução da
construção da letra: o laço alongado e inclinado desenhado como fita
caligráfica (grossa embaixo-esquerda, fina em cima-direita), o traço longo que
desce do alto e **cruza** o laço — é esse cruzamento que faz a letra ler A e
não O —, a exclamação e o avião com o rastro. Proporção e contraste não são os
do original.

Chegou aí depois de descartar: duas construções erradas (uma vira sigma grego)
e dezesseis fontes script testadas contra a foto, nenhuma batendo.

**Para pôr o símbolo de verdade:** troque o token `--simbolo` no
`a-fatorial.css` pelo arquivo (`--simbolo:url(marca.svg)`), rode
`python3 montar.py`, e ele entra no cabeçalho, no rodapé, no login e nas duas
marcas de uma vez. No sistema o token é `--afx-simbolo`.

**As seis submarcas** aparecem na seção `#sobre`, com avião, nome e assinatura
própria, divididas por fio — como na barra inferior do material impresso.

**Quatro letras, quatro papéis.** *Archivo* carrega os títulos e a informação;
*Newsreader itálico* é só a voz enfática, na oração destacada de um título e
na citação; *Plex Mono* é o instrumento — todo número, rótulo e referência
legal; e *Yellowtail* tem um trabalho só, a palavra "Grupo" do lockup, que no
material é manuscrita. Não é a letra do logo — o logo é lettering feito à mão,
não fonte de catálogo —, mas é escrita de pincel do mesmo gênero.

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
var WHATSAPP    = '5511911012147'; // DDI+DDD+número da EMPRESA, só dígitos
var WHATSAPP_CC = WHATSAPP;         // da MENTORIA; troque quando tiver linha própria
var URL_SISTEMA = '../index.html';  // onde fica a área interna
var URL_SERVIDOR = '';              // backend/ — vazio = login leva ao sistema
```

Com `URL_SERVIDOR` preenchido, o login autentica já no site e a pessoa entra
no sistema com a sessão pronta — sem digitar duas vezes. Funciona quando site
e sistema estão no mesmo domínio.

## Antes de publicar

- [ ] Conferir se 11 9.1101-2147 é mesmo o celular que atende no WhatsApp
- [ ] Pedir ao designer o **vetor do símbolo** (SVG, AI ou EPS) e trocar o selo
- [ ] Substituir a citação do bloco "Quem fundou o método" por uma foto real da Carla
- [ ] Dar um número de WhatsApp próprio à mentoria (`WHATSAPP_CC`)
- [ ] Revisar os números da capa (12 anos, +500 empresárias, 83 serviços)
- [ ] Abrir `marca.html` e conferir que o laudo de contraste segue aprovado
