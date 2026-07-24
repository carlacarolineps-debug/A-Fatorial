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

- `Operação Blindada 2407.02.html` — **PRODUTO PRINCIPAL** (unificado). A mentoria
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

### Como regenerar o produto unificado
Motor da Bússola em `scratchpad/bussola_engine.js` + `bussola.css`; dados das 170
cartas em `scratchpad/data_D.txt`; injeção nos pontos exatos do arquivo-base via
`scratchpad/inject.cjs` (registra view, aba NAV, dispatch em `go()`, campo em
`defaultState()`/boot). Acesso: `PREVIEW=true` quando aberto via `file://`
(standalone, sem login); hospedado exige login Supabase (trava de acesso mantida).

## Contexto

Autora: Carla Caroline. Bússola/frase-guia dos métodos:
*"Seus padrões de comportamento definem seus acontecimentos." — Carla Caroline*.
