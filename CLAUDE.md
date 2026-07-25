# A! Fatorial: orientações para o Claude

## Regra de entrega de arquivos HTML (SEMPRE)

Ao final de qualquer trabalho que gere ou atualize um produto em HTML, **enviar
sempre o arquivo `.html` para download** (via SendUserFile), nomeado com
**Nome + Data + Versão**, no formato:

    <Nome do Método> <DDMM>.<VV>

Exemplos: `O Método Bússola 2407.01`, `Operação Blindada 2407.01`.

- `DDMM` = dia e mês da entrega (ex.: 24/07 → `2407`).
- `VV` = versão sequencial daquele dia/produto, com dois dígitos (`.01`, `.02`, …).
- Incrementar a versão a cada nova entrega do mesmo produto.

## Regra de escrita: nunca usar travessão (SEMPRE)

A Carla não quer travessão em nenhum texto do produto: para ela, travessão
"mostra que é de IA". Isso vale para os dois caracteres longos (em-dash, U+2014,
e en-dash, U+2013), que não devem aparecer em lugar algum.
Em qualquer texto novo (interface, cartas,
relatórios, arquivos gerados, e-mails), use pontuação natural:

- dois-pontos quando o que vem depois explica, define ou enumera;
- vírgula quando é continuação da frase (antes de "e", "ou", "mas", "só", "não");
- parênteses para aparte ou lista dentro de uma frase que já tem dois-pontos;
- intervalos numéricos com hífen (`1-4`, `90-99,9%`);
- assinatura da autora em linha própria (`<br>Carla Caroline`), sem travessão.

O conversor usado na limpeza geral está em `tools/dedash.py` (aplica essas
regras sem mexer na indentação do código). Rode-o se algum travessão voltar.

## Produtos neste repositório

- `Operação Blindada 2407.14.html`: **PRODUTO PRINCIPAL** (unificado). A mentoria
  Operação Blindada (jornada externa: módulos de estratégia, governança, blindagem
  financeira, liderança; diagnóstico, testes profundos, PDCA, plano 30d, gamificação,
  login/sync Supabase) **+** o motor comportamental **A Bússola** integrado como aba
  nativa (170 cartas, diagnóstico comportamental com radar, sorteio inteligente e
  adaptativo, trilhas de padrão, relatório de ciclo, Pacto de Blindagem, intenções de
  implementação, protocolo de recaída, ritual de ciclo). Tese: *blinde o negócio por
  fora e o gestor por dentro*. Identidade "Cofre e Estrategista" (carbono/ouro/aço).
  Compromissos das cartas caem no Plano 30d; XP alimenta a gamificação existente.
  Base preservada do arquivo enviado pela Carla (`PORTAL_2007.02`).
- `baralho.html`: versão standalone do Método Bússola (identidade obsidiana/ouro),
  agora absorvida no produto unificado acima. Mantida como referência.
- `index.html`: Sistema de Gestão A! Fatorial (plataforma, tema gamer/neon).

### Liberação realmente sequencial + Cruzeiro do Sul (2407.14)
A Carla: "todas as páginas, acessos e botões estão liberados, quero que libere
após a conclusão do passo anterior"; "o comece por aqui precisa ser a primeira
página e só liberar as boas-vindas depois de finalizar todas as etapas"; e sobre
a constelação: "precisa parecer uma constelação, não um rabisco".

**1. Sequência de verdade.** O bug: os passos futuros tinham botão "Abrir", dava
para pular. Agora `afSeq()` conta só os passos concluídos **em sequência desde o
início**, e é ele que libera tudo. `afDo(id)` recusa passo à frente (avisa "um
passo de cada vez"). No card, só o passo da vez tem botão: os seguintes mostram
cadeado e "abre depois". `AREA_PASSO` liga cada área ao número de passos exigidos
(bussola 1, plano/diário 4, trilhas 5, ferramentas/gestão/pesquisas 6) e
`gateDe()` usa `afSeq()`.

**2. Comece por aqui é a primeira página.** Enquanto `afCompleta()` é falso,
`renderHome` devolve só `<div id="afHost">` e a jornada ocupa a tela inteira, com
isotipo, anel de progresso, grau (`AF_GRAU`: Iniciante → Blindado) e o selo "abre:
X" no passo atual. `bHomeHook` não injeta o card da Bússola nesse modo. As
boas-vindas (herói, faixa de instrumentos, mantra) só aparecem em 8/8.

**3. Cruzeiro do Sul.** A constelação genérica virou a cruz do sul: 5 estrelas com
magnitudes reais (Acrux a mais brilhante), as duas linhas da cruz, 78 estrelas de
fundo com cintilância, nebulosa em gradiente radial e glint de 4 pontas nas
acesas. Acende conforme as trilhas concluídas. Referência de mercado pesquisada:
Marca Passos (Aliança Divergente/Elton Euler), de onde vieram as ideias de grau de
progressão visível e de mostrar o que cada etapa libera.

### Isotipo próprio + jornada primeiro de tudo (2407.13)
A Carla: "a pessoa primeiro tem que fazer toda essa parte do comece por aqui e
depois ela vai ter acesso ao restante, apos isso o app libera para uso, e essa
parte precisa estar primeiro de tudo"; e mandou o isotipo (escudo dourado com
cadeado) para substituir o escudo anterior.

**1. Isotipo.** `shieldSvg(px)` (no IIFE `OB`) foi reescrito como o isotipo dela:
escudo com rima dourada (gradientes `obG/obGl/obGd`), interior escuro, duas faixas
por lado e um cadeado central com fechadura, tudo em vetor (nítido em qualquer
tamanho, offline). A marca do topo (`#brandMark`) é preenchida no boot com
`OB.shield(24)`; o onboarding usa um tile escuro com o isotipo (igual ao ícone de
app que ela enviou); o card de Padrão de Gestão e as telas de aula seguem usando
`OB.shield`.

**2. Jornada primeiro.** `renderJornada` agora insere o "Comece por aqui" como
**primeiro filho** de `#view-home` (antes do herói) enquanto não estiver completa,
com o selo "O app abre por etapas conforme você avança" e a fala "Antes de tudo,
faça esta sequência". Quando os 8 passos terminam, o card vira o estado
**"Operação liberada · Jornada concluída"** (verde) e desce para depois do herói.
A liberação real continua nos `GATES` (2407.12): cada passo abre a próxima área, e
a sequência dos passos é auto-consistente (todo passo que navega para uma área já
foi destravado por um passo anterior).

### Home com vida, liberação por etapas e ferramentas (2407.12)
A Carla: "arrume essa parte que ficou totalmente sem graça, sem vida, preciso que
fique bonito e diferenciado"; "a pessoa não pode ter o acesso inicial a tudo pois
ela precisa fazer o passo a passo primeiro"; "melhore muito as ferramentas".

**1. Home.** O herói virou um bloco só: `constelacaoSVG(done,total)` desenha 12
estrelas e **acende de verdade** as que correspondem às trilhas concluídas (linhas
`.viva`, brilho e pulsar suave que respeita `prefers-reduced-motion`). As 4 caixinhas
soltas viraram a `.hero-strip` dentro do próprio herói, separada por fios. O mantra
virou citação editorial (`.mantra`). O roteiro da jornada agora entra **depois** da
saudação, não antes. Emoji fora do chrome: `ICO` traz ícones em traço e o
`nextActionCard` usa `.nx-ico`.

**2. Liberação por etapas.** `GATES` define o que cada área exige, na ordem do
`AF_JORNADA`: Bússola pede o método entendido; Trilhas pedem o autodiagnóstico;
Plano e Diário pedem a 1ª carta; Ferramentas, Padrão de Gestão e Pesquisas pedem a
1ª trilha. Conquistas e Mentora ficam sempre abertas. `go()` chama `gateDe(view)` e,
se travado, renderiza `renderLocked` (cadeado, o porquê, progresso da jornada e o
botão que leva ao passo que falta) em vez da tela. A barra inferior e a tela "Mais"
mostram cadeado; `gateCheckNovos()` avisa quando algo abre (um aviso só, mesmo que
várias áreas abram juntas). Nada foi removido: só sequenciado.

**3. Ferramentas.** Deixou de ser uma grade solta: agora é **agrupada por módulo**
(`.fx-sec` com número e fio), cartões `.fx-card` com ícone em traço, descrição em
2 linhas, estado **preenchida** em verde e um anel de progresso no topo
(`.fx-ring`, "N/9").

Emoji: saíram das trilhas (medalhão numerado `.num-glyph`), do plano, das pesquisas,
do diário e da Mentora. **Só as medalhas de Conquistas mantêm ícone**, de propósito.
Corrigido de passagem: `radarSVG` não quebra mais com diagnóstico salvo pela metade.

### Painel de Indicadores: de planilha a painel de decisão (2407.11)
A Carla: "gostei da ideia mas não gostei de como ficou, não parece útil". Era uma
tabela de 8 colunas (820px mínimo), inútil no celular e sem dizer nada.
- **Cartões, não linhas** (`.kpi-card`): número grande, meta, % de atingimento,
  barra, **veredito em português** (`gVeredito`: "Faltam 27.000 para a meta") e
  tendência contra o anterior (`gTend`, já respeitando "menor é melhor").
- **Bloco de decisão no topo** (`.kpi-foco`): o pior indicador em vermelho, com
  botão que cria a ação no Plano 30d (`gKpiAcao`). Resumo por farol (`.kpi-sums`)
  e alerta quando passa de 8 indicadores (o método manda de 4 a 6 por área).
- **Duas zonas**: quem tem número vira cartão; quem não tem cai numa lista
  enxuta ("Ainda sem meta", `.kpi-pend`), para o sinal dominar a tela.
- **Estado inicial ensina**: escolher uma área pronta, não encarar linhas vazias.
- **Editor em modal** (`gKpiEdit`): o checkbox críptico "↓ melhor" virou a
  pergunta "qual direção é boa?" com exemplos. Era a origem do bug abaixo.
- **Travas de sanidade no `gFarol`**: acima de 300% o farol vira "checar" em vez
  de mentir. O print da Carla mostrava R$ 3.000 de R$ 30.000 como **1000% verde**
  (a direção estava invertida e a conta virava meta ÷ realizado); agora dá 10%
  vermelho, ou "checar" se a direção estiver trocada.
- `gNum` formata em pt-BR. RSG, PTM e a impressão A4 seguem lendo `g.kpis`.

### Limpeza geral dos travessões (2407.10)
Todos os travessões saíram do sistema (produto principal, `index.html`,
`baralho.html` e o arquivo de direção visual): 544 no base, 84 no motor, 59 nas
cartas, 291 no index e 104 no baralho. A troca é por pontuação, não apagamento
(ver a regra de escrita no topo). Conversor: `tools/dedash.py`.

### A moldura da carta envolve tudo + rolagem invisível (a partir de 2407.09)
A pedido da Carla ("ainda dá para melhorar o aspecto visual, e deixe o visual da carta
ao redor dela"; "remova barra de rolagem ou integrada na carta"):
- **O modal deixou de ser caixa: a carta é a caixa.** `.modal:has(.bo-card)` fica
  transparente, sem borda, sem padding; quem emoldura todo o conteúdo é `.bo-card`
  (moldura dupla via `::before`, fio de luz no topo via `::after`, brilho do naipe).
- **Índices dos cantos e marca d'água presos à moldura** (`.bo-corner.tl`/`.br`,
  `.bo-wm`), não rolam com o texto. O × mora no canto superior direito, que num
  baralho é justamente o canto livre.
- **Rolagem por dentro da carta, sem barra visível**: `.bo-scroll` é o único
  scroller (`scrollbar-width:none` + `::-webkit-scrollbar{display:none}`); a barra
  também foi escondida em todos os modais. Duas faixas `.bo-fade` (topo e base)
  fazem o texto **dissolver nas bordas** em vez de bater nos índices dos cantos: daí o padding maior no `.bo-scroll` (54px topo / 48px base).
- Refino editorial: rótulos das seções em versalete com fio (`.bo-sec h4::after`),
  faixa de atributos entre fios (`.bo-stats`), influências ± viraram **duas colunas
  com fio colorido** (saiu o bloco verde/vermelho que pesava), ferramenta como placa
  inscrita, título em `clamp()` e assinatura da Carla na cor do naipe.

### Carta aberta = carta de verdade + plano de ação (a partir de 2407.08)
A pedido da Carla ("mude o visual de como aparece a carta quando você dá um clique,
mas não altere nada de como ficaram as cartas... use a mesma identidade que está fora
e ela precisa ter aparência visual de carta"; e sobre o antigo formulário: "não tem
utilidade nenhuma nessa ferramenta, transforme a carta na maior sacada para aplicação
prática, para o aluno sair dali com um plano de ação, que ele possa imprimir e baixar,
rodar um PDCA, ou incluir no planner").

**Visual: a carta aberta virou uma carta.** (Nesta versão a moldura era o bloco
`.bo-face` no topo; a partir de 2407.09 ela virou `.bo-card` e envolve tudo: ver acima.)
Seção "CARTA ABERTA" do `premium.css`: moldura dupla (`::before`), **índices nos cantos** com naipe + número
(`.bo-corner.tl` / `.br` rotacionado 180°, como baralho impresso), **marca d'água** do
naipe (`.bo-wm`), fio de ouro ornamental (`.bo-rule`), pergunta-guia em serifa itálica
(`.bo-q`), os 4 atributos como **pips** (`.bo-stats`/`.bo-pips`), dimensão no pé
(`.bo-dim`) e brilho de gema na cor do naipe (`--sc`, mesma variável do baralho).
**O baralho (`.bcard`) não foi tocado**, só a carta aberta.

**Sacada prática: a carta produz um plano.** Fluxo em 3 telas (`bussola_engine.js`):
1. `openCard(idx)`: a face da carta + "O padrão em jogo" (leitura comportamental do
   naipe) + painéis + a ferramenta + CTA único **"Transformar em plano de ação"**.
2. `bPlanStart(idx)`: construtor em 3 passos onde **nada começa em branco**:
   (a) "onde você está nessa carta?" (`BNIVEL`: novo / oscilo / forte) **calibra o
   plano**; (b) 3 ações sugeridas e editáveis (`bPlanSugs`, derivadas do `BPLAY` do
   naipe + a ferramenta `c.x` da carta); (c) gatilho com chips prontos (`BGATILHOS`)
   + prazo. Métrica, risco e protocolo de recaída vêm pré-preenchidos em `<details>`.
3. `bPlanGo(idx)`: gera o **Plano de Ação**: compromisso (intenção de implementação),
   sequência de 4 passos sem repetição (`pega()` dedupe: a ação escolhida pode
   coincidir com o passo de 10 min ou com a cadência, conforme o nível), métrica,
   risco, protocolo e 7 caixinhas de marcação. Sai por `withResultActions` →
   **Salvar · Imprimir A4 · Plano 30d · PDCA · Agenda · Diário**, mais
   `bPlanDownload()` que **baixa um .html autônomo** (branded, imprime em A4, funciona
   sem internet). Já grava no `S.plan` com `bnaipe` (preserva o passo 4 da jornada),
   no `interrupts`, marca `worked`, dá XP e o troféu.

`BPLAY` = playbook por naipe (padrão, micro-ação de 10 min, cadência, como elevar,
métrica, risco, protocolo de interrupção): é o que dá substância de mentoria às
sugestões das 170 cartas. CSS das telas 2 e 3: `.bp-*` e `.pl-*`. Com modal aberto os
toasts sobem para o topo (`body:has(.modal-bg.show) .toast-zone`) para não cobrir a
barra de ações.

### Navegação de app nativo: pronto para as lojas (a partir de 2407.07)
A pedido da Carla ("repense a forma de entrar nas seções, pense como app pois iremos
subir na Play Store e na App Store; haja como designer de apps"). Trocamos a barra de
abas horizontal com rolagem (10 itens, padrão de site) por navegação **nativa**, sem
remover nenhuma seção:
- **Bottom tab bar** fixa (`.appnav`/`#appnav`), 5 destinos principais em `PRIMARY`
  = `home · bussola · trilhas · plano · menu`, com ícones em traço (SVG, sem emoji no
  chrome), alvo ≥52px, zona do polegar, indicador de aba ativa em ouro,
  `env(safe-area-inset-bottom)` para o notch/home-indicator, blur + fio de ouro no topo.
- **Tela "Mais"** (`view-menu`/`renderMenu()`) = hub das seções que não cabem na barra
  (`OVERFLOW` = ferramentas, gestão, pesquisas, diário, conquistas, mentora) em linhas
  grandes com ícone + título + subtítulo (`MENU_SUB`) + chevron; rodapé com "Limpar
  meus dados".
- **Topo contextual**: raiz mostra a marca; telas raiz não-home mostram o **título da
  tela**; telas secundárias mostram **‹ voltar** (`#topBack`/`navBack()`) + título.
  `syncChrome(view)` cuida disso e do estado ativo da barra; `lastPrimary` guarda a
  raiz para o voltar. `NAV_TITLE`/`NAV_SHORT`/`NAV_ICON` no motor da navegação.
- **Transição "entrar na tela"** (`.view-in`, keyframe `viewIn`, respeita
  `prefers-reduced-motion`). Barra inferior escondida no onboarding via `appnavShow()`
  (substituiu os antigos `$('#tabs').style.display`). CSS na seção "APP SHELL" do
  `premium.css`. A antiga `.tabs` foi aposentada (`display:none`).

### Orientação guiada: "pensa pela pessoa" (a partir de 2407.05)
A pedido da Carla (usuário novo não sabia por onde começar; "não remova nada").
Camada de wayfinding por cima de tudo, sem remover recursos: (1) **boas-vindas**
que explicam as duas frentes (negócio por fora + você por dentro); (2) roteiro
**"Comece por aqui · Sua jornada, passo a passo"** na Home: 8 passos numerados
com status/progresso e CTA que leva ao lugar certo; (3) faixa **"Próximo passo · N/8"**
sempre no topo (abaixo da nav), em toda tela. Estado em `S.af`; passos em
`AF_JORNADA` (detecta conclusão pelo estado real); `renderJornada()` (prepend na
Home via `bHomeHook`), `afGuiaUpdate()` (faixa, ligada em `go()`), `afMetodo()`
(boas-vindas). CSS na seção "ORIENTAÇÃO GUIADA" do `premium.css`.

### Evolução "Vivo: joia sobre carbono" (a partir de 2407.04)
A pedido da Carla ("cores mais vivas, algo mais interessante de ver"), a cor
voltou como **pedras preciosas profundas** (naipes: topázio, turquesa, âmbar,
ametista, safira, esmeralda, rubi, aço, rosa, citrino): cor vibrante no
**conteúdo**, chrome permanece ouro. Fundo com auroras de joia, cartas do baralho
como **gemas retroiluminadas** (glow na cor do naipe), radar com gradiente/brilho,
eixos coloridos. Hues em `BNAIPES`/`BEIXOS` (motor); brilhos/fundos na seção "VIVO"
do `premium.css`; radar enriquecido em `radarSVG` (base).

### Direção visual: "Cofre Privado" (a partir de 2407.03)
Linguagem premium: carbono quente + ouro-champanhe + pergaminho, tipografia
editorial (Fraunces + versaletes), fios de ouro, cantos secos, **sem emoji** no
chrome e **sem arco-íris** de naipes (monocromático ouro). Tokens retunados no
`:root` da base; camada de refinamento em `scratchpad/premium.css` (injetada por
último, vence a cascata); emojis de conteúdo removidos da base **fora** do bloco
de dados (módulos/troféus preservados). Ver conceito em
`Operação Blindada: Cofre Privado (direção visual) 2407.01.html`.

### Como regenerar o produto unificado
Motor da Bússola em `scratchpad/bussola_engine.js` + `bussola.css` + `premium.css`;
dados das 170 cartas em `scratchpad/data_D.txt`; injeção nos pontos exatos do
arquivo-base via `scratchpad/inject.cjs` (registra view, aba NAV, dispatch em
`go()`, campo em `defaultState()`/boot; injeta bússola.css + premium.css). Acesso:
`PREVIEW=true` quando aberto via `file://` (standalone, sem login); hospedado exige
login Supabase (trava de acesso mantida).

## Contexto

Autora: Carla Caroline. Bússola/frase-guia dos métodos:
*"Seus padrões de comportamento definem seus acontecimentos."<br>Carla Caroline*.
