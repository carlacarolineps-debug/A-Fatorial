# A! Fatorial — orientações para o Claude

## Regra de entrega de arquivos HTML (SEMPRE)

Ao final de qualquer trabalho que gere ou atualize um produto em HTML, **enviar
sempre o arquivo `.html` para download** (via SendUserFile), nomeado com
**Nome + Data + Versão**, no formato:

    <Nome do Método> <DDMM>.<VV>

Exemplos: `O Método Bússola 2407.01`, `Operação Blindada 2407.01`.

- `DDMM` = dia e mês da entrega (ex.: 24/07 → `2407`).
- `VV` = versão sequencial daquele dia/produto, com dois dígitos (`.01`, `.02`, …).
- Incrementar a versão a cada nova entrega do mesmo produto.

## Produtos neste repositório

- `Operação Blindada 2407.08.html` — **PRODUTO PRINCIPAL** (unificado). A mentoria
  Operação Blindada (jornada externa: módulos de estratégia, governança, blindagem
  financeira, liderança; diagnóstico, testes profundos, PDCA, plano 30d, gamificação,
  login/sync Supabase) **+** o motor comportamental **A Bússola** integrado como aba
  nativa (170 cartas, diagnóstico comportamental com radar, sorteio inteligente e
  adaptativo, trilhas de padrão, relatório de ciclo, Pacto de Blindagem, intenções de
  implementação, protocolo de recaída, ritual de ciclo). Tese: *blinde o negócio por
  fora e o gestor por dentro*. Identidade "Cofre e Estrategista" (carbono/ouro/aço).
  Compromissos das cartas caem no Plano 30d; XP alimenta a gamificação existente.
  Base preservada do arquivo enviado pela Carla (`PORTAL_2007.02`).
- `baralho.html` — versão standalone do Método Bússola (identidade obsidiana/ouro),
  agora absorvida no produto unificado acima. Mantida como referência.
- `index.html` — Sistema de Gestão A! Fatorial (plataforma, tema gamer/neon).

### Carta aberta = carta de verdade + plano de ação (a partir de 2407.08)
A pedido da Carla ("mude o visual de como aparece a carta quando você dá um clique,
mas não altere nada de como ficaram as cartas... use a mesma identidade que está fora
e ela precisa ter aparência visual de carta"; e sobre o antigo formulário: "não tem
utilidade nenhuma nessa ferramenta, transforme a carta na maior sacada para aplicação
prática, para o aluno sair dali com um plano de ação, que ele possa imprimir e baixar,
rodar um PDCA, ou incluir no planner").

**Visual — a carta aberta virou uma carta.** `.bo-face` no `premium.css` (seção "CARTA
ABERTA"): moldura dupla (`::before`), **índices nos cantos** com naipe + número
(`.bo-corner.tl` / `.br` rotacionado 180°, como baralho impresso), **marca d'água** do
naipe (`.bo-wm`), fio de ouro ornamental (`.bo-rule`), pergunta-guia em serifa itálica
(`.bo-q`), os 4 atributos como **pips** (`.bo-stats`/`.bo-pips`), dimensão no pé
(`.bo-dim`) e brilho de gema na cor do naipe (`--sc`, mesma variável do baralho).
**O baralho (`.bcard`) não foi tocado** — só a carta aberta.

**Sacada prática — a carta produz um plano.** Fluxo em 3 telas (`bussola_engine.js`):
1. `openCard(idx)` — a face da carta + "O padrão em jogo" (leitura comportamental do
   naipe) + painéis + a ferramenta + CTA único **"Transformar em plano de ação"**.
2. `bPlanStart(idx)` — construtor em 3 passos onde **nada começa em branco**:
   (a) "onde você está nessa carta?" (`BNIVEL`: novo / oscilo / forte) **calibra o
   plano**; (b) 3 ações sugeridas e editáveis (`bPlanSugs`, derivadas do `BPLAY` do
   naipe + a ferramenta `c.x` da carta); (c) gatilho com chips prontos (`BGATILHOS`)
   + prazo. Métrica, risco e protocolo de recaída vêm pré-preenchidos em `<details>`.
3. `bPlanGo(idx)` — gera o **Plano de Ação**: compromisso (intenção de implementação),
   sequência de 4 passos sem repetição (`pega()` dedupe — a ação escolhida pode
   coincidir com o passo de 10 min ou com a cadência, conforme o nível), métrica,
   risco, protocolo e 7 caixinhas de marcação. Sai por `withResultActions` →
   **Salvar · Imprimir A4 · Plano 30d · PDCA · Agenda · Diário**, mais
   `bPlanDownload()` que **baixa um .html autônomo** (branded, imprime em A4, funciona
   sem internet). Já grava no `S.plan` com `bnaipe` (preserva o passo 4 da jornada),
   no `interrupts`, marca `worked`, dá XP e o troféu.

`BPLAY` = playbook por naipe (padrão, micro-ação de 10 min, cadência, como elevar,
métrica, risco, protocolo de interrupção) — é o que dá substância de mentoria às
sugestões das 170 cartas. CSS das telas 2 e 3: `.bp-*` e `.pl-*`. Com modal aberto os
toasts sobem para o topo (`body:has(.modal-bg.show) .toast-zone`) para não cobrir a
barra de ações.

### Navegação de app nativo — pronto para as lojas (a partir de 2407.07)
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

### Orientação guiada — "pensa pela pessoa" (a partir de 2407.05)
A pedido da Carla (usuário novo não sabia por onde começar; "não remova nada").
Camada de wayfinding por cima de tudo, sem remover recursos: (1) **boas-vindas**
que explicam as duas frentes (negócio por fora + você por dentro); (2) roteiro
**"Comece por aqui · Sua jornada, passo a passo"** na Home — 8 passos numerados
com status/progresso e CTA que leva ao lugar certo; (3) faixa **"Próximo passo · N/8"**
sempre no topo (abaixo da nav), em toda tela. Estado em `S.af`; passos em
`AF_JORNADA` (detecta conclusão pelo estado real); `renderJornada()` (prepend na
Home via `bHomeHook`), `afGuiaUpdate()` (faixa, ligada em `go()`), `afMetodo()`
(boas-vindas). CSS na seção "ORIENTAÇÃO GUIADA" do `premium.css`.

### Evolução "Vivo — joia sobre carbono" (a partir de 2407.04)
A pedido da Carla ("cores mais vivas, algo mais interessante de ver"), a cor
voltou como **pedras preciosas profundas** (naipes: topázio, turquesa, âmbar,
ametista, safira, esmeralda, rubi, aço, rosa, citrino) — cor vibrante no
**conteúdo**, chrome permanece ouro. Fundo com auroras de joia, cartas do baralho
como **gemas retroiluminadas** (glow na cor do naipe), radar com gradiente/brilho,
eixos coloridos. Hues em `BNAIPES`/`BEIXOS` (motor); brilhos/fundos na seção "VIVO"
do `premium.css`; radar enriquecido em `radarSVG` (base).

### Direção visual: "Cofre Privado" (a partir de 2407.03)
Linguagem premium — carbono quente + ouro-champanhe + pergaminho, tipografia
editorial (Fraunces + versaletes), fios de ouro, cantos secos, **sem emoji** no
chrome e **sem arco-íris** de naipes (monocromático ouro). Tokens retunados no
`:root` da base; camada de refinamento em `scratchpad/premium.css` (injetada por
último, vence a cascata); emojis de conteúdo removidos da base **fora** do bloco
de dados (módulos/troféus preservados). Ver conceito em
`Operação Blindada — Cofre Privado (direção visual) 2407.01.html`.

### Como regenerar o produto unificado
Motor da Bússola em `scratchpad/bussola_engine.js` + `bussola.css` + `premium.css`;
dados das 170 cartas em `scratchpad/data_D.txt`; injeção nos pontos exatos do
arquivo-base via `scratchpad/inject.cjs` (registra view, aba NAV, dispatch em
`go()`, campo em `defaultState()`/boot; injeta bússola.css + premium.css). Acesso:
`PREVIEW=true` quando aberto via `file://` (standalone, sem login); hospedado exige
login Supabase (trava de acesso mantida).

## Contexto

Autora: Carla Caroline. Bússola/frase-guia dos métodos:
*"Seus padrões de comportamento definem seus acontecimentos." — Carla Caroline*.
