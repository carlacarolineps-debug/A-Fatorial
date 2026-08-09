# Site — a porta de entrada do cliente

**Tudo num arquivo só.** O entregável é `Grupo A! Fatorial.html`, na raiz do
projeto: o site e o sistema no mesmo documento. Entrar não recarrega nada —
troca de lado. Sair volta para a porta. Sem internet, sem arquivo vizinho.

> Isso não era assim, e quebrou: o site foi aberto uma vez com o CSS faltando
> na pasta e apareceu cru — links azuis, Times, sem layout nenhum. Página que
> depende de arquivo vizinho quebra na primeira vez que alguém move só um
> deles.

| Arquivo | O que é |
|---|---|
| `../Grupo A! Fatorial.html` | **O entregável.** Site + sistema, um arquivo. Gerado por `juntar.py`. |
| `juntar.py` | Junta site e sistema. Rode por último: `python3 juntar.py` |
| `index.html` | **O site sozinho**, para publicar separado do sistema. |
| `marca.html` | **O guia do padrão.** Arquivo único. Vivo: mede o próprio contraste e reprova o que passar do limite. |
| `a-fatorial.css` | **A fonte de verdade do padrão.** Não é carregado pelas páginas: é embutido nelas. |
| `montar.py` | Embute o CSS nas páginas do site. Rode antes do `juntar.py`. |

**A ordem é essa:** mexeu no CSS → `python3 montar.py` → `python3 juntar.py`.

### Como os dois convivem no mesmo arquivo

O sistema tem 833 classes e o site 209; **37 nomes se repetem**. Coladas sem
cuidado, uma pintaria a outra. Então o site foi embrulhado em `#porta` e todo
o CSS dele levou esse prefixo — inclusive os tokens, que saíram do `:root`. O
sistema ficou intocado, no escopo global.

Um detalhe que quase passou: o sistema declara
`body{display:flex;height:100vh;overflow:hidden}` porque é painel de tela
cheia. Com isso o site não rolava. O corpo troca de regime junto com o lado:
`.na-porta` rola, `.no-sistema` é painel.

## O padrão visual — "a retícula"

A marca existe fisicamente: letras douradas em relevo sobre parede preta, com
holofote em cima. O site parte daí e vai adiante: o fundo não é textura, é o
**nome da empresa desenhado no espaço**.

### A retícula fatorial

Cada casca tem exatamente *k* nós — 1, 2, 3, 4, 5, 6, 7 — e cada nó de uma
casca se liga a **todos** os nós da casca seguinte. O número de caminhos de
ponta a ponta é 1×2×3×4×5×6×7 = **5.040**. É o operador fatorial existindo em
profundidade, não explicado em legenda. A câmera avança com a rolagem, então
descer a página é atravessar a retícula; o ponteiro desloca o ponto de fuga; a
cor vai do ouro (perto) ao violeta (fundo), passando pelo ciano.

### O laudo desta leitura

No canto, um painel audita a leitura em curso: a etapa e o **fatorial
multiplicando** a cada seção atravessada — 1!, 2!, 6!, 11!… A empresa vende
execução auditável e diz que é o primeiro cliente do próprio método; aqui a
página roda o método nela mesma, à vista. O nome da marca deixa de ser
metáfora explicada e vira experiência: quem rola vê o produto multiplicar.

### O regulador de qualidade

A página mede a própria fluidez e se ajusta sozinha. Máquina boa recebe tudo;
máquina apertada perde primeiro o desfoque do vidro (o item mais caro), depois
a resolução da retícula, e por último a retícula. Efeito bonito que engasga é
pior que efeito nenhum — e medir antes de opinar é o que a empresa vende.

### As três luzes

O ouro continua sendo o **metal** — matéria, peso, marca. O ciano, o violeta e
o âmbar são **luz**: não preenchem nada, só marcam borda, halo e aresta de
vidro. Frias contra o ouro quente: é o contraste de temperatura que faz o
conjunto parecer futuro em vez de barroco.

### O vidro

Toda superfície levantada deixa a retícula passar por trás. Três ingredientes,
os três obrigatórios: o **desfoque** (sem ele vira plástico), a **alta luz na
borda de cima** (dá espessura à chapa) e a **aresta cromática** — um fio de
ciano de um lado e violeta do outro. É o desvio de cor na quina que o olho lê
como refração; sem isso não é vidro, é retângulo translúcido.

### A profundidade

Não é "sombra maior": é perspectiva. O contêiner tem ponto de fuga e as peças
ficam em planos diferentes de Z. Quando o ponteiro anda, a cena inclina — como
olhar dentro de um diorama. Só com ponteiro fino; no toque fica parado.

E a razão de tudo isso ainda ser escuro:

o ouro
da marca (`#d4af5e`) sobre papel claro rende **2:1**. Ilegível. Para usá-lo
como texto era preciso rebaixá-lo a um marrom fechado, e o ouro de verdade
sumia. Sobre o breu, o mesmo ouro rende **9,4:1** — legível em qualquer
tamanho. **O ouro da marca só existe no preto**, e é por isso que o site é
escuro.

Cinco regras:

1. **O breu tem matéria.** Não é um retângulo preto: tem grão, vinheta e a luz
   do holofote caindo de cima. Preto chapado é o que faz uma página parecer
   feita às pressas.
2. **O ouro tem relevo.** Não é uma cor, é metal: alta luz em cima, corpo no
   meio, sombra embaixo. Nos elementos grandes ele brilha; nos pequenos, só
   reluz — em corpo pequeno o gradiente vira sujeira.
3. **A escala é dramática.** Manchete enorme contra rótulo minúsculo: do maior
   ao menor corpo da página vai de 1 para 9. Página onde tudo tem o mesmo peso
   não é lida, é rolada.
4. **A estrutura é desenhada, não decorada.** Fio, coluna, margem anotada e
   rótulo de seção são o próprio layout.
5. **Todo número é leitura de instrumento.** Monoespaçada, tabular, com a
   unidade e a premissa impressas embaixo.

**O avião de papel é a assinatura.** No material ele está no símbolo, na ponta
do fio do cabeçalho e no lockup de cada submarca. Aqui aparece em dois lugares
só — o lockup e o fio da capa. Avião em todo canto vira enfeite.

**O sistema continua claro.** Site e sistema fazem trabalhos diferentes: o site
é a vitrine e precisa impressionar em dez segundos; o sistema é onde se passa o
dia, e lá o claro cansa menos. Para voltar o site ao claro, os tokens de cor
estão todos no topo do `a-fatorial.css`.

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
