# A! Fatorial — Sistema de Gestão (Arquitetura de Lucro)

Aplicação de página única (um arquivo `index.html`, sem build, JavaScript puro).
Abra o arquivo no navegador para usar.

## Acessos (tela de login)

| Perfil | Entra vendo | Pode acessar (padrão) |
|--------|-------------|------------------------|
| **Admin / Gestão** | Gestão à vista | Todas as telas |
| **Colaborador** | Portal do colaborador | Portal do colaborador, **Esteira comercial**, **Propostas e rastreio** e **Kanban operacional** (já filtrado nas demandas dele) |
| **Cliente** | Portal do cliente | Portal do cliente |

Todos os perfis usam **o mesmo visual** (tema escuro "gamer" neon) e a **mesma
moldura** (menu lateral + topo) — cada um enxerga apenas os itens que tem permissão.

## Novidades desta versão

1. **Mesmo visual para todos os acessos** — o tema escuro/neon do portal do
   colaborador passou a valer para o ecossistema inteiro (admin, colaborador e
   cliente), com a barra lateral sempre visível.
2. **Esteira comercial e Propostas no portal do colaborador** — cada colaborador
   acessa essas telas dentro da própria plataforma.
3. **Permissões configuráveis** — em **Equipe e acessos**, o admin marca quais
   telas cada perfil enxerga e define se o colaborador vê *todos* os negócios da
   empresa ou *apenas os seus*. As escolhas valem na hora e ficam salvas no
   navegador (chave `af_permissoes`). O acesso do admin à própria tela de
   permissões fica protegido.
4. **Gamificação reforçada**
   - **Cliente**: painel de nível, barra de XP e 7 conquistas que destravam
     conforme o projeto avança (proposta, contrato, kickoff, entrega, pagamento,
     avaliação e conclusão).
   - **Colaborador**: indicador da "próxima conquista a desbloquear" no cartão do
     jogador, somado à gamificação já existente (XP, níveis, badges, missões, saga).

5. **CNAE / base da Nota Fiscal no catálogo** — cada serviço recebe uma sugestão
   automática de CNAE, escolhida apenas entre os 6 CNAEs registrados no CNPJ da
   empresa (30.361.388/0001-17). O campo "Tipo de serviço (base da NF)" do funil
   também passou a exibir o CNAE de cada opção.
6. **Gestão de usuários (Equipe e acessos → Equipe e responsáveis)** — login,
   senha, foto de perfil, apelido e status por usuário; ativar/desativar; alterar
   senha; criar novo usuário. Usuários inativos não conseguem entrar. Cada
   colaborador também personaliza foto e apelido no próprio portal ("Meu perfil").
   Login agora valida senha e status (com senha padrão de demonstração).
7. **Catálogo → aba "Oportunidades por CNAE"** — biblioteca curada de 49 serviços
   que a empresa PODE oferecer dentro dos CNAEs que já tem registrados (sem risco
   fiscal). Cada serviço traz descrição e preço sugerido; um clique ativa na
   carteira (entra no catálogo com o CNAE certo). Inclui um insight estratégico
   apontando o CNAE mais subutilizado. Dados em `OPORTUNIDADES_CNAE`.
8. **Sugestões inteligentes (cross-sell) + pacotes prontos**
   - **Esteira de vendas (Funil)**: conforme você seleciona serviços, o sistema
     sugere complementos ("você selecionou X, Y; que tal acrescentar W, Q?") e
     oferece **pacotes prontos** (Abertura de Filial, Virada de Chave, Máquina de
     Vendas, Operação Terceirizada, Franquia Pronta) que montam vários serviços
     de uma vez. Funções: `COMBOS`, `REGRAS_CROSSSELL`, `sugerirComplementares`,
     `renderSugestoesFunil`, `funilAplicarCombo`.
   - **Portal do cliente**: seção "Leve seu resultado além" com serviços
     complementares ao que ele já tem; o cliente **solicita** com um clique e a
     gestão recebe a notificação. Funções: `renderPortalCrossSell`,
     `portalSolicitarServico`.
   - **Fila de pedidos (tela de Propostas)**: todo pedido feito pelo cliente
     aparece numa fila "📥 Pedidos de clientes", com cliente, serviço, valor de
     referência, data e status (novo/atendido). Botões para **atender**, reabrir
     e **abrir o portal** do cliente. O botão **"➡ Atender no Funil"** abre a
     esteira já preenchida com o cliente e o serviço solicitado, convertendo o
     pedido em proposta. Funções: `renderSolicitacoes`, `solicitacaoConverter`,
     `solicitacaoAtender`, `solicitacaoVerCliente`, `listaSolicitacoes`.
9. **Notificações sonoras** — sons curtos gerados via Web Audio (sem arquivos),
   com timbres distintos por evento: XP/pontuação, notificação, conquista, subida
   de nível, **pagamento recebido (caixa registradora)**, **proposta/entrega
   aprovada e proposta gerada (sucesso)**, **novo pedido de cliente** e **perda**.
   Botão 🔊/🔇 na barra de topo liga/desliga (preferência em `localStorage`
   `af_som`) e há um **controle de volume** (slider, `af_vol`). Toca também um
   **som de boas-vindas no login**. Objeto `SOUND` (tipos: xp, notify, badge,
   levelup, cash, success, request, lost, welcome; `volume` 0–1); ganchos em
   `notify`, `colAddXP`, `colGanhaBadge`, `darBaixa`, `cliAprovar`/
   `ptAprovarProposta`, `confConfirmar`, `entAprovar`, `satSave`, `avalSalvar`,
   `depSave`, `perdaSave`, `portalSolicitarServico` e `loginEnter`.
10. **Modo apresentação** — botão 🎤 na barra de topo borra os valores sensíveis
    (KPIs do dashboard e do financeiro, tabela de recebíveis, custo/margem e nota
    interna do funil); passe o mouse para revelar. Marque mais elementos com a
    classe `sens`. Funções: `toggleApresentacao`.
11. **Exportar proposta em PDF** — botão "⤓ Baixar PDF" no topo do portal/overlay
    da proposta usa o diálogo de impressão (`@media print` isola só a proposta).
    Função: `cliExportarPDF`.
12. **Tema claro/escuro** — botão 🌙/☀️ alterna entre o escuro "gamer" (padrão) e
    um tema claro; a preferência fica em `localStorage` (`af_tema`). O portal do
    colaborador mantém a identidade gamer nos dois temas. Funções: `alternarTema`,
    `aplicarTema`.
13. **Centro Financeiro 360** (nav "Centro Financeiro 360", admin) — gestão
    financeira pessoal + empresa num só lugar:
    - **Visão geral**: KPIs (entradas, saídas, resultado, mistura PF↔Empresa),
      gráfico de categorias, evolução mensal e o **Conselheiro** (analisa e diz o
      que fazer). Card de **valuation** (faixa por múltiplo de faturamento).
    - **Lançamentos**: manuais, filtro por contexto/mês, reclassificar PF/Empresa.
    - **Importar extrato**: cole o texto do extrato (parser do Nubank validado
      contra os totais oficiais) → prévia → importa categorizando.
    - **Metas & objetivos**: alvo, aporte mensal e **tempo para alcançar**.
    - Vem **semeado com extratos reais (jan–abr/2026)**. Persistência em
      `localStorage` (`af_fin`). Funções: `FIN360`, `finParseExtrato`,
      `finConselho`, `finVisaoGeral`, `finResumo`, `finCatFinal`.
14. **Planejamento estratégico** (nav "Planejamento estratégico", admin) — metas
    de venda ligadas ao pipeline e ao financeiro:
    - Cada meta: serviço, quantidade × valor (ou **recorrente** por unidade, ex.:
      Medical R$ 25/agendamento), prazo e **projeção de receita**.
    - **Pipeline** por cliente: status (em vista → ofereci → negociando → fechou),
      valor, **anexo de arquivo** e **avaliação no Google** (gera mensagem de
      pedido pronta). Botão **"Enviar projeção ao Centro Financeiro"** alimenta o
      valuation/faturamento.
    - **Conselheiro comercial** (propostas em aberto, avaliações pendentes, gap da
      meta). Semeado com as metas do seu plano 2026. Persistência em `af_plano`.
      Funções: `PLANO`, `planoConselho`, `planoRenderMetas`, `planoPedirReview`,
      `planoUsarNoFinanceiro`.
15. **Identidade da empresa + PDF profissional + atalho**
    - Em "Equipe e acessos", configure **logo, cor da marca e contato** (já
      pré-preenchido com o CNPJ 30.361.388/0001-17). Persistido em `af_brand`.
    - A proposta do cliente ganha **capa** (logo + nome do cliente + data) e
      **rodapé** (razão social, CNPJ, contato), com a cor da marca; o PDF sai com
      a capa em página própria. Funções: `BRAND`, `renderBrand`, `brandLogoHTML`.
    - **Atalho de teclado Alt+P** alterna o modo apresentação.
16. **Importação CSV / qualquer banco (Cora PJ)** — além do parser Nubank, o
    Centro Financeiro importa **CSV/planilha** de qualquer banco (Cora, Inter…),
    por colagem ou **upload de arquivo**. Detecta delimitador, datas e sinais
    (crédito/débito). Escolha o contexto **Empresa** para separar o PJ do pessoal.
    Função: `finParseCSV`.
17. **Visão do dono** (nav "Visão do dono", admin — tela inicial do admin) —
    cockpit executivo que une, numa tela: receita projetada × realizada, resultado
    financeiro, **valuation**, saúde financeira (saldo PF/PJ e mistura), funil
    comercial, **conselho do dia** (financeiro + comercial) e o progresso das
    metas. Função: `renderDono`.
18. **Pró-labore assistido + projeção de caixa + relatório PDF**
    - **Pró-labore** (card no Centro Financeiro → Visão geral): sugere um salário
      fixo do dono (% da receita média da empresa), compara com as transferências
      soltas atuais e orienta a parar a mistura. `finProLaboreCard`.
    - **Projeção de caixa** (sub-aba 📈): próximos 6 meses cruzando receita
      estimada + recebíveis a receber − custos fixos − pró-labore, com gráfico e
      alerta de quando o caixa fica negativo. `finProjMeses`, `finProjecaoUI`.
    - **Relatório executivo (PDF)** (botão na Visão do dono): documento único com
      financeiro + comercial + valuation + projeção + recomendações, com a marca,
      pronto para imprimir/salvar. `relatorioDono`, `relatorioPDF`.
19. **Categorias/regras, comparativo e mais gráficos**
    - **Categorias editáveis + regras** no Centro Financeiro: crie categorias e
      regras "se contém X → categoria Y"; aplicam-se às importações e
      **reclassificam os lançamentos existentes na hora**. Seletor de categoria por
      linha. `finCategorias`, `finAddRegra`, `finAplicarRegras`, `finSetCat`.
    - **Comparativo mês a mês** (Visão geral): entradas, saídas e resultado do mês
      atual vs. anterior, com variação %. `finComparativoCard`.
    - **Metas do plano na projeção**: recorrência (alvo/12) + clientes fechados
      entram como receita futura no fluxo de caixa (toggle). `finProjMeses`.
    - **Mais gráficos na Gestão à vista**: resultado mensal, caixa projetado (6m)
      e metas de venda — para decisão rápida. `renderDashCharts`, `miniBars`.
20. **Alertas inteligentes, exportar CSV e metas trimestrais**
    - **Alertas no sino**: caixa projetado negativo, meta de venda sem fechamentos
      perto do prazo, propostas não abertas, pedidos de cliente novos e avaliações
      pendentes. Geração no INIT + botão "Recalcular alertas" na Visão do dono.
      `gerarAlertasInteligentes`.
    - **Exportar lançamentos em CSV** (Excel/contador): respeita o filtro atual,
      com BOM e formato pt-BR. `finExportarCSV`.
    - **Metas por trimestre** (Planejamento): meta de faturamento por Q1–Q4 com
      **realizado calculado automaticamente** dos lançamentos (entradas de receita,
      excluindo transferências/aportes). `planoTrimestreCard`,
      `finReceitaRealTrimestre`.
21. **Simulador de futuro + backup + conciliação + meta do colaborador**
    - **Simulador de futuro** (nav própria): calculadora de premissas (receita,
      crescimento %/ano, custos fixos, custo variável %, pró-labore, rendimento
      %/mês) projetando **6m, 1, 2, 5 e 10 anos** — quanto sobra/falta, caixa
      acumulado, patrimônio investindo a sobra (juros compostos), **contas a
      reduzir** e **movimentos estratégicos**. `renderFuturo`, `futuroSerie`.
    - **Backup/Restauração** (Equipe e acessos): exporta/importa todo o sistema
      (financeiro, plano, permissões, usuários, marca) num `.json`.
      `backupExportar`, `backupImportar`.
    - **Conciliação**: vincula um lançamento a um cliente (proposta/plano).
      `finConciliar`.
    - **Meta de vendas do colaborador**: cada colaborador define e acompanha a
      própria meta na tela de Propostas. `renderColMeta`.
22. **Cenários, marcos SMART e assistente de decisão**
    - **Cenários comparados** (Simulador): pessimista / realista / otimista lado a
      lado, com caixa acumulado por horizonte. `futuroCenariosCard`.
    - **Marcos SMART** (metas financeiras): cada meta vira um roteiro de marcos
      mensais que se marcam sozinhos conforme o valor guardado. `finMetasUI`.
    - **Assistente de decisão** (Simulador): descreva uma decisão (custo/receita
      recorrente ou única) e veja o impacto no caixa de 6 meses a 5 anos, com
      veredito. `assistenteDecidir`.
23. **Budget, histórico de decisões, cenários personalizáveis e resumo em texto**
    - **Plano de budget** (Centro Financeiro → sub-aba 💰 Budget): orçamento anual
      por frente (investimentos, eventos, treinamentos, projetos, inovações,
      custos); o **realizado é puxado automaticamente** dos lançamentos pelas
      categorias, com %, projeção do ano e status (dentro/estourou). Diz se você
      está seguindo o plano. `finBudgetUI`, `finBudgetRealizado`.
    - **Histórico de decisões** salvas no assistente, com impacto em 5 anos lado a
      lado. `decisaoSalvar`.
    - **Cenários personalizáveis**: você define os % de receita/crescimento/custo
      de cada cenário. `finSetCenario`.
    - **Resumo em linguagem natural** (Visão do dono): um parágrafo que lê seus
      números e explica a situação e a prioridade. `resumoNatural`.
24. **Budget mensal, sugestão automática e comparar decisões**
    - **Budget mensal/anual** (toggle): no modo mensal acompanha o mês atual e
      **alerta no sino** quando uma frente estoura o orçamento do mês.
      `finSetBudgetPeriodo`, alerta em `gerarAlertasInteligentes`.
    - **Sugerir orçamentos pelo histórico**: preenche cada frente pela média
      mensal realizada (anualizada). `finBudgetSugerir`/`finBudgetMediaMensal`.
    - **Comparar decisões**: o histórico recalcula o impacto em 1/5/10 anos e
      mostra um gráfico de qual decisão rende mais. `decImpacto`.

25. **Kanban operacional com aviso no WhatsApp** (nav "Kanban operacional" —
    admin e colaborador) — o quadro de demandas da equipe. Cada tarefa tem
    **dono, prazo e etapa**, e quem é responsável é avisado no WhatsApp.
    - **Formulário de tarefa**: título, etapa, onda, prioridade (sem prioridade
      / urgente / médio / pouco urgente), responsável, área, início, término e
      notas. `kbNova`, `kbEditar`, `kbSalvar`.
    - **Quadro**: 5 etapas (Backlog → A fazer → Fazendo → Revisão e aguardando →
      Concluído) com **arrastar e soltar** entre colunas, ou as setas ‹ › do
      card no celular. `KB_ETAPAS`, `kbDrop`, `kbMover`.
    - **Duas visões**: por etapa (kanban clássico) e **por responsável** — um
      bloco "Tarefas de fulano" para cada pessoa. `kbToggleVisao`.
    - **Painel e filtros**: total, em andamento, concluídas, em atraso e % de
      conclusão; busca livre + filtros por pessoa (chips coloridos), área, onda
      e prioridade. `kbRenderKpis`, `kbFiltradas`.
    - **WhatsApp em 3 modos** (`KANBAN.wa.modo`):
      **🔗 link direto** (padrão, sem configurar nada — abre a conversa com o
      texto pronto), **⚡ automático** (envia sozinho pela WhatsApp Cloud API
      oficial através do servidor em `backend/`) e **🔕 desligado**.
      `kbNotificar`, `kbMontarMsg`.
    - **Quando avisa** (configurável): tarefa criada, mudança de etapa, troca de
      responsável e cobrança de prazo — com três textos editáveis e variáveis
      `{{nome}} {{tarefa}} {{prioridade}} {{etapa}} {{area}} {{onda}} {{prazo}}
      {{inicio}} {{situacao}} {{notas}}`. `KB_MSG_PADRAO`, `kbWaSet`.
    - **Números da equipe**: WhatsApp de cada pessoa (formato `5511999999999`),
      puxado do telefone do RH quando já existe. `kbContatoSet`, `KANBAN.contatos`.
    - **Histórico de avisos**: tudo que foi disparado, com status (enviado /
      pendente / erro) e o motivo quando falha. `kbRenderLog`, `KANBAN.envios`.
    - **Cobranças**: 📲 no card avisa uma demanda; "Avisar no WhatsApp" no bloco
      da pessoa cobra tudo que ela tem em aberto; "Cobrar todas as atrasadas"
      varre o quadro inteiro. `kbCobrar`, `kbCobrarPessoa`, `kbCobrarAtrasadas`.
    - **Visual do quadro**: cartão de boas-vindas com saudação pela hora, resumo
      do dia e **barra segmentada** do quadro por etapa (`kbRenderSaudacao`,
      `kbBarraProgresso`); **trilha de ondas** com anel de progresso que filtra
      ao clicar (`kbRenderOndas`); **carga da equipe** em barras proporcionais
      divididas por etapa (`kbRenderCarga`); **avatares com a foto de perfil**
      de cada pessoa (`kbAv`); **régua de prazo** no card mostrando quanto do
      tempo combinado já passou (`kbPrazoBar`); e pulso no card ao soltar numa
      nova coluna.
    - **Padrão visual do quadro**: hero com gradiente da marca, saudação e
      **anel de conclusão**; **stat cards** com número grande, ícone e nota de
      contexto; **trilha de ondas** em passos conectados; colunas tingidas com
      a cor da própria etapa e botão "+ demanda aqui"; cards com avatar,
      prioridade em pílula, chips de área/onda e rodapé de prazo ("faltam 4d",
      "1d de atraso"). Funções `kbRenderHero`, `kbRenderStats`,
      `kbRenderTrilha`, `kbColuna`, `kbCard`, `kbCardFoot`.
    - **Tema claro e escuro**: as cores do quadro saem dos tokens `--kb-c1..c8`,
      `--kb-ouro`, `--kb-neutro` e `--kb-sobre`, definidos duas vezes no CSS —
      fechadas no tema claro, neon no escuro. Nenhuma cor fixa no JavaScript,
      então o quadro nasce legível nos dois (contraste medido ≥ 4,9:1).
    - **No sino**: alerta de demandas atrasadas e das que vencem hoje.
    - O colaborador entra vendo **as demandas dele** e não enxerga o painel de
      configuração do WhatsApp. Dados em `localStorage` chave `af_kanban`
      (incluída no backup).

26. **Aparência do sistema (botão 🎨 na barra de topo)** — abre um painel com
    **tema** (escuro/claro) e **cor do sistema**: Dourado A!, Vinho, Magenta,
    Violeta, Oceano e Esmeralda. A cor reescreve os tokens `--gold*` no `<body>`,
    e como o app inteiro usa `var(--gold)`, **todas as telas** trocam de
    personalidade de uma vez — menu, botões, gráficos, portal do cliente e
    propostas. Fica salvo em `localStorage` (`af_accent`) e entra no backup.
    `AP_CORES`, `apAplicarCor`, `apRender`, `apInit`.
    - Detalhe técnico: `--gold-grad` é declarado no `body`, não no `:root` —
      um custom property declarado no `:root` já resolve os `var()` dele ali,
      e o gradiente continuaria dourado depois da troca de cor.

27. **Mesmo padrão visual na Gestão à vista e na Visão do dono** — o hero, os
    stat cards e a trilha que nasceram no Kanban viraram **componentes
    compartilhados** (`uiHero`, `uiStat`/`uiStats`, `uiTrilha`, `uiSpark`, classes
    com prefixo `ui-`). Mexer neles muda as três telas de uma vez.
    - **Gestão à vista**: hero com saudação e **anel de progresso da esteira**;
      6 stat cards (contratos, faturamento, a receber, aguardando você,
      satisfação, demandas em aberto); e a **esteira virou trilha** — cada etapa
      é um passo com quantos clientes estão nela, e clicar abre o funil.
      `renderDashHero`, `renderDashTrilha`.
    - **Visão do dono**: hero com o número que precisa virar hoje (resultado
      negativo, meta batida ou quanto falta) e anel da meta de vendas; stat cards
      de receita projetada, vendas realizadas, resultado, valuation e mistura
      PF/PJ. As ações (relatório PDF, recalcular alertas) subiram para o hero.
      `renderDonoHero`.
    - Corrigido: a **Visão do dono não tinha título na barra de topo** (faltava a
      entrada em `TITLES`), e valores em reais quebravam em duas linhas no card —
      agora usam a variante `.ui-stat-v.grana`.

28. **Portal do colaborador no mesmo padrão** — a tela era a mais destoante
    (moldura "gamer" com cantos, ciano fixo e uma barra lateral com 20 links
    empilhados). Agora usa os mesmos componentes das outras telas:
    - **Hero** com foto, saudação, nível/XP em texto e **anel do nível**;
      **stat cards** de Power, XP, troféus, jornada, missões e dias de saga.
      `renderPlayerCard` (reescrita sobre `uiHero`/`uiStats`).
    - **Navegação em três partes**, no lugar da lista gigante: controle
      segmentado (Central · Missões · Evolução · Saga), a **jornada de
      integração como trilha** de 10 passos (concluída ✓, liberada, bloqueada 🔒)
      e chips para o desenvolvimento contínuo. `renderColaborador`.
    - A Central deixou de repetir nível e jornada (já estão no hero e na
      trilha) e passou a mostrar 4 stat cards próprios.
    - **Tema claro**: o portal usa a paleta clara (o fundo imersivo escuro e o
      ciano só valem no tema escuro) e o ciano acompanha a cor do sistema.
    - Corrigidos três defeitos: o hero mostrava XP/nível **antes** de creditar
      as etapas concluídas (340 XP contra 580); etapas **já concluídas ficavam
      com cadeado** se uma etapa anterior estivesse em aberto (`colAbaLiberada`);
      e o fundo fixo do portal **cobria a barra lateral** — invisível no tema
      escuro, gritante no claro (`.side` ganhou `z-index`).

29. **Dimensionamento em telas de notebook (1280–1440px)** — o visual foi
    desenhado em tela larga e quebrava em 1366px:
    - **Barra de topo**: o subtítulo e o cargo do usuário quebravam em duas
      linhas e a barra crescia de 64 para 84px. Agora os textos ficam em uma
      linha com reticências; abaixo de 1150px o nome/cargo somem e fica o
      avatar, e o controle de volume some.
    - **Stat cards**: com 6 cards a grade fazia 5 + 1, deixando um card órfão.
      O contêiner agora recebe a classe da quantidade (`.n4`…`.n6` via
      `uiStatsRender`) e a grade escolhe colunas que fecham as linhas — em
      1366px: 3 + 3 para seis cards e 5 em linha para cinco.
    - **Trilha**: os 10 passos da jornada somavam 1180px em um espaço de
      976px e sumiam na rolagem. Abaixo de 1500px os passos encolhem
      (anel menor, fontes menores) e cabem sem rolar.
    - Corrigida a pontuação dupla "Chegou!." no texto do hero.

30. **"Próximo passo" — o sistema diz o que fazer** (faixa fixa abaixo da barra
    de topo, em todas as telas). Varre os dados reais e mostra a ação mais
    urgente com um botão que leva direto ao lugar; o "+N depois" abre a fila.
    Cada perfil vê o que é dele: a gestão vê demandas atrasadas, entregas a
    aprovar, pedidos de cliente, caixa projetado negativo e metas sem
    fechamento; o colaborador vê a próxima etapa da jornada e as demandas
    dele; o cliente vê a proposta esperando aprovação. Quando não há nada
    pendente, sugere o próximo movimento em vez de ficar mudo.
    `proxPassos`, `renderProx`, `proxFazer`.

31. **Formulário que ninguém precisa adivinhar** — cada campo da nova tarefa
    ganhou uma dica curta embaixo, incluindo o que é **Onda** (lote de
    trabalho: "Onda 1 é o que entra primeiro, Onda 2 o bloco seguinte").
    Prioridade e Temperatura do lead deixaram de ser `<select>` com emoji
    (ficava amador) e viraram **pílulas com bolinha colorida e descrição**:
    Urgente *é para hoje*, Médio *esta semana*. Componente `uiOpts`/`uiOptSet`.

32. **Configuração do WhatsApp só nas configurações** — o painel de
    integração, mensagens, números da equipe e histórico saiu do Kanban e
    passou para **Equipe e acessos**, tela que só o admin/gestor acessa. No
    Kanban ficou o selo de status, que leva à configuração em um clique.

33. **Ajustes de acabamento**
    - Stat cards ganharam tinta suave no canto, ícone com relevo e topo em
      degradê; cards zerados ficam com opacidade menor para o olho ir ao que
      importa. Valor em texto ("ainda sem nota") não herda mais o espaçamento
      negativo dos números — antes saía "aindasemnota".
    - Rótulos dos gráficos vazavam do card (`263.305,20`): agora saem curtos
      ("263 mil") com o valor cheio no tooltip. `brlCurto`.
    - Modal alto rola por dentro e o rodapé com **Salvar** fica fixo: numa tela
      de 640px o botão ficava fora da área visível.
    - Escala compacta para notebook (≤1500px ou ≤820px de altura): hero, anel,
      cards, espaçamento e barra de topo encolhem juntos. No portal do
      colaborador a navegação subiu para antes dos números — a trilha da
      jornada agora aparece sem rolar.

34. **Catálogo explicado** — os 77 serviços e os 8 grupos ganharam uma
    explicação curta ("o que é / o que o cliente recebe"), visível na tabela do
    catálogo e na hora de montar a proposta. Passando o mouse, um **resumo
    completo** aparece: preço, carga, valor da hora, CNAE da NF, quanto já foi
    vendido e com o que costuma ir junto. Serviço novo tem campo próprio de
    descrição. `CAT_DESC`, `CAT_GRUPOS_DESC`, `catDesc`, `hcServico`.

35. **Assistente de decisão que começa pronto** — em vez de campo em branco, o
    "e se eu...?" abre com **decisões montadas a partir dos seus números**
    (contratar pelo salário médio da equipe, fechar mais 1 do serviço com maior
    meta, cortar 10% do custo fixo, reajustar a tabela em 5%, comprar
    equipamento, subir o pró-labore) — cada uma já simulada, com o impacto em 5
    anos no próprio cartão. E abre com uma **leitura**: qual delas mais melhora
    o caixa e qual mais pesa. `decSugestoes`, `decRanking`, `decSimularSugestao`.

36. **Os painéis se conversam** — toda notificação recalcula a faixa "Próximo
    passo". Ações do cliente que antes morriam na tela dele agora avisam a
    gestão: documento anexado, entrega aprovada e avaliação recebida (com
    alerta quando a nota vem baixa). Documento sem conferência e entrega
    aprovada sem avaliação entram na fila de próximos passos.

37. **Prestadores por resultado + distribuição de leads** (nav "Prestadores e
    leads", admin; aba "🎯 Meus leads" no portal de quem é autônomo)
    - **Vínculo e autorização**: em Equipe e acessos você marca quem trabalha
      por resultado e **quais contratos cada um pode representar** (Medical ·
      A! Saúde, Consultoria, Franquias, Treinamentos), além da comissão e da
      meta de contatos por dia. O painel de cada pessoa mostra **só o que você
      liberou** — quem representa consultoria PJ não enxerga lead PF da Medical.
      `CONTRATOS`, `podeRepresentar`, `prestConfigHTML`.
    - **Painel de distribuição com trava**: quem pega o lead o tira do painel
      dos outros; um segundo prestador que tente pegar recebe o aviso de que já
      saiu. Lead pego e **sem contato em 24h volta sozinho** para a fila, então
      nenhum contato fica parado. `leadPegar`, `leadRecolherAtrasados`.
    - **Contador visual do dia**: bolinhas que acendem a cada contato
      registrado, com a meta da pessoa; na gestão, a mesma fila por prestador.
      `leadContatosDoDia`.
    - **Carteira e follow-up**: WhatsApp em um clique, registro do que
      aconteceu, data do próximo passo e aviso de retorno atrasado.
    - **Base de contatos**: nome, WhatsApp, e-mail, telefone, cidade e endereço,
      **separada automaticamente** — primeiro por natureza (PF / PJ) e dentro
      dela por segmento, com exportação CSV por bloco. `leadBaseHTML`,
      `LEAD_SEGMENTOS`, `leadExportar`.
    - **Ganhos**: comissão calculada sobre o que a pessoa fechou.
    - **Treinamentos**: material para estudar quando quiser e agenda dos
      próximos ao vivo, com aviso de quantos dias faltam. `treinoProximos`.
    - Tudo alimenta a faixa "Próximo passo" dos dois lados: o prestador vê o
      lead que precisa contatar antes de perder; você vê lead parado no painel
      e lead pego sem contato.

38. **Briefing de entrada — "por onde eu começo hoje?"** (abre ao entrar; o
    botão 🧭 no topo reabre quando você quiser)
    - **O que mudou desde a sua última entrada**: leads novos, demandas
      criadas, demandas concluídas e negócios fechados enquanto você esteve
      fora. `briefNovidades`, guardado em `af_ultimo_acesso`.
    - **O número que importa hoje**: para a gestão, quanto falta para a meta do
      plano; para o prestador, contatos feitos contra a meta do dia; para o
      colaborador, quantas demandas estão com o nome dele. `briefNumero`.
    - **Três primeiros passos, na ordem** (nunca mais que três — lista grande
      paralisa), cada um com estimativa de tempo e clique que já leva à tela.
    - **Primeira entrada** explica onde ficam as coisas (menu, faixa "Agora",
      🎨 e 🔔) em vez de despejar tarefa em quem ainda não conhece o sistema.
    - "Não mostrar de novo hoje" e fechar clicando fora — o aviso não prende
      ninguém. `briefingAbrir`, `briefingIr`, `af_brief_dia`.

39. **Correção na barra de topo** — o cargo do colaborador ("Analista de
    Marketing · Marketing / Conteúdo") era cortado **pelo começo**, aparecendo
    "ARKETING …": o texto é alinhado à direita e o `text-overflow` do CSS corta
    do lado errado. Agora o corte é feito no próprio texto (fim + reticências),
    com o valor completo no tooltip.

40. **"Meus leads" virou página no menu** — quem trabalha por resultado abre
    direto no que importa, sem passar pelo portal de desenvolvimento. A página
    tem hero com o foco do dia (o que está sem contato, o retorno atrasado ou
    quanto falta para a meta), stat cards, régua de contatos, painel de
    distribuição e a carteira. O item só aparece para quem tem vínculo "por
    resultado". `leadRenderPagina`, `v-meusleads`.

41. **Bug crítico de CSS corrigido** — faltava o `}` de fechamento do bloco
    `@media(max-height:720px)`, e **todas as 128 regras seguintes** (leads,
    prestadores, base de contatos, treinamentos e o briefing) eram descartadas
    pelo navegador: os cartões apareciam como texto solto. Fechado o bloco, o
    módulo inteiro voltou a renderizar.

42. **Gráfico "XP por semana"** — o SVG usava `preserveAspectRatio="none"`, que
    estica junto os rótulos e os números (ficavam borrados), e sem XP no período
    sobrava uma caixa vazia de 200px. Os rótulos saíram para HTML e, sem dados,
    entra um aviso explicando como o gráfico começa a subir.

43. **Separação entre gestão e vendedor** — "Meus leads" é a tela de quem
    vende; sumiu do menu do admin. Você acompanha por **Prestadores e leads**,
    onde cada linha tem **"👁 Ver o painel dele"**: abre a tela do vendedor em
    modo prévia, com aviso no topo e botão de voltar. `leadPreview`.

44. **Revisão e reorganização do sistema** — auditoria automática de menu,
    telas, títulos e permissões, papel por papel:
    - **Menu reagrupado por assunto** (antes eram 11 itens soltos em "Operação
      interna"): Meu dia · Comercial · Meu trabalho · Entrega e operação ·
      Financeiro · Pessoas · Cliente · Configuração. Grupos vazios somem
      sozinhos conforme a permissão de cada perfil.
    - **Duas telas estavam órfãs** — *Auditoria de entregáveis* e *Satisfação e
      depoimentos* existiam mas não tinham item de menu nem entrada no
      configurador de permissões; só dava para chegar nelas por botão.
    - **Três telas sem título na barra de topo** (Centro Financeiro 360,
      Simulador de futuro e Planejamento estratégico) mostravam só a data.
    - Auditoria final: 17 telas no admin, 5 no vendedor, 4 no colaborador
      contratado e 1 no cliente — nenhuma tela sem menu, nenhum menu sem tela,
      nenhum título faltando e nenhum erro de console em 27 aberturas.

## Integração com o WhatsApp (pasta `backend/`)

O modo **link direto** funciona sozinho, sem servidor. Para o envio
**automático** existe uma ponte pronta em [`backend/`](backend/README.md): um
servidor Node/Express que recebe o aviso do kanban e entrega pela **API oficial
da Meta (WhatsApp Cloud API)**.

```
index.html (kanban)  ──POST──▶  backend/  ──▶  Graph API da Meta  ──▶  WhatsApp
```

O token do WhatsApp fica **no servidor**, nunca no navegador. Passo a passo
completo (conta na Meta, template `nova_demanda`, deploy e configuração da tela)
no [README do backend](backend/README.md).

## CNAEs registrados (base para Nota Fiscal)

| CNAE | Atividade |
|------|-----------|
| 74.90-1-04 | Intermediação e agenciamento de serviços e negócios (principal) |
| 70.20-4-00 | Consultoria em gestão empresarial |
| 82.11-3-00 | Serviços combinados de escritório e apoio administrativo |
| 78.10-8-00 | Seleção e agenciamento de mão de obra |
| 43.99-1-01 | Administração de obras |
| 43.30-4-99 | Outras obras de acabamento da construção |

## Onde mexer no código

- **Permissões / papéis**: `PERMISSOES_DEFAULT`, `PERMISSOES`, `salvarPermissoes`,
  `renderPermissoes`, `permToggle`, `permEscopo` (marcadores `=== BACKEND ===`
  indicam o que deve ser revalidado no servidor em produção).
- **Tema escuro global**: bloco CSS `TEMA GAMER GLOBAL` + classe `body.theme-gamer`.
- **Gamificação do cliente**: `renderPortalGame` e `PT_BADGES_DEF`.
- **Filtro de dados do colaborador**: `comercialVisivel` + `COL_ESCOPO_COMERCIAL`.
- **CNAE / base da NF**: `CNAES_EMPRESA`, `sugerirCnae`, `cnaeOptions`.
- **Serviços executáveis**: `SERV_EXEC` (o registro — cada serviço declara
  `fnDados`, `fnRender`, `fnAba` e `fnEtapa`, e o resto do sistema funciona
  igual para todos), `servFn` (chama a função declarada), `DB.projetos` (chave
  `af_projetos`), `prjNovo`/`prjAbrir`/`prjEtapaAtual`, `servRender`
  (catálogo). **Para acrescentar um serviço novo**: entrada em `SERV_EXEC`,
  `<section class="view" id="v-xxx">` com hero/rail/stats/body, título em
  `TITLES`, passo oculto na área *Entregar*, permissão na migração
  `af_perm_migr`, linha no despacho de `go()`, e as funções declaradas.
- **Motor de franqueabilidade**: `FR_PILARES` (os 10 pilares e pesos),
  `frCalcDiag`, `frVeredito`, `frCalcViab` (viabilidade da unidade),
  `frCalcRede` (receita da franqueadora), `frFunil`, `FR_DOCS`, `FR_COF`
  (Lei 13.966/2019), `FR_KPIS`, `frLaudoHTML`, `frContratoTexto`.
- **Motor de diagnóstico (Raio-X)**: `RX_DIM` (as 9 dimensões, pesos e as 48
  perguntas com âncora), `RX_NIVEIS` (a escala de maturidade), `rxCalcular`
  (índice, indicadores e Fleuriet), `RX_FLEURIET` (as seis estruturas),
  `rxPrescricao` + `RX_RECEITAS` (que serviço resolve o quê), `rxRadarHTML`,
  `rxPlanoSugerir`, `rxLaudoHTML`, `rxContratoTexto`.
- **Motor de preço**: `PC_SIMPLES` (os cinco anexos da LC 123/2006),
  `pcAliqSimples` (alíquota efetiva), `pcFatorR`, `PC_PRESUNCAO` (art. 15 da
  Lei 9.249/1995), `pcCalcular` (regimes, markup divisor, margem por hora,
  equilíbrio, elasticidade), `pcTabelaHTML`, `pcDescontoHTML`, `pcLaudoHTML`.
- **Motor de reestruturação**: `CX_ENTRADAS`/`CX_SAIDAS` (as linhas do fluxo),
  `cxCalcular` (13 semanas, dívida, iniciativas, ponte, Altman Z'' e Kanitz),
  `CX_ALAVANCAS` (as 8 alavancas de mercado), `CX_ROTAS` (Lei 11.101/2005),
  `cxFluxoHTML`, `cxPonteHTML`, `cxTermoHTML`, `cxLaudoHTML`.
- **Equipe (várias pessoas ao mesmo tempo)**: `SYNC` (estado), `SYNC_MAPA`
  (que chave vira que coleção, quais listas têm id, como recarregar e como
  gravar), `afGravar` (o ponto único por onde toda gravação da empresa passa),
  `syncEmpacotar`/`syncDesempacotar` (lista ↔ objeto por id), `syncDif` (o
  remendo), `syncEmpurrar`/`syncPuxar`/`syncAplicar`, `syncReconciliar`
  (conflito nunca é descartado), `syncBarra` (selo de presença) e
  `syncTelaRender` (Ajustes → Equipe). No servidor: `backend/equipe.js` —
  `aplicarRemendo`, `desdeRev`, contas e presença.
- **Digitação e números**: `numBR`/`numDe`/`maskNum`/`inpMoeda` (máscara
  brasileira com cursor preservado), `uiFocoGuardar`/`uiFocoRestaurar`,
  `uiRedesenhar` (adia o redesenho) e `uiRedesenharSeParou` (nunca redesenha
  com o foco dentro do painel). Cada serviço tem seu `xxVivo()`, que reescreve
  só os blocos de número enquanto a pessoa digita.
- **Motor de avaliação**: `vlCalcular` (o cálculo mestre), `vlDCF`,
  `vlSensibilidade`, `vlAlavancas`, `vlLaudoHTML` (o laudo),
  `vlContratoTexto` (o contrato), `VL_DOCS` (a ficha de documentos),
  `docPortalAbrir` (o portal do cliente, link + PIN).
- **Áreas do menu**: `AREAS` (a lista de atividades e suas etapas), `areaIr`
  (abre a área no primeiro passo permitido), `renderRail` (a trilha),
  `areaNome`/`areaFrase` (o nome muda conforme quem olha),
  `atualizarAreasVisibilidade`.
- **Rede / contratos**: `MARCAS`, `CONTRATOS`, `ESCOPOS`, `PREST_NIVEIS`,
  `contratoTexto` (o contrato padrão), `D4`/`d4Enviar`/`d4Assinar` (assinatura),
  `prestLiberado` (a trava geral), `prestAbrir` (configuração da pessoa),
  `prestRender` (tela da rede), `redeMigrar` (migração para autônomo).
- **Demandas**: `DB.demandas` (chave `af_demandas`), `demVisivelPara` (quem vê
  o quê), `demPegar`/`demPausar`/`demEntregarSalvar`/`demAprovar`,
  `demSegundos`/`demPctTempo` (o relógio), `demRenderGestao`/`demRenderPortal`.
- **Parceiras e cadastro público**: `DB.parceiras`, `DB.candidatos` (chave
  `af_rede`), `parceiraRender`, `candAprovar`, `cadAbrir`/`cadEnviarPrestador`.
- **Vendas / metas**: `VENDAS` (estado, chave `af_vendas`), `vendasInit`,
  `vendasRender`, `vendasMetaSugerida`, `vdFunil` (etapas do funil),
  `vdVazamento` (onde vaza), `vdMotivos`, `vdComp` (comparação entre meses).
- **Leads**: `DB.leads` (chave `af_leads`), `leadEuId` (quem está agindo),
  `leadPegar` (trava de exclusividade), `leadEntregar` (distribuição),
  `leadStatus` + `leadPerdaSalvar` (motivo da perda), `leadCard` (modos
  `painel`, `meus` e `gestao`), `leadSemearHistorico`.
- **Kanban / WhatsApp**: `KANBAN` (estado), `KB_ETAPAS` (colunas),
  `KB_PRIORIDADES`, `KB_MSG_PADRAO` (textos das mensagens), `kbInit`,
  `kbRender`, `kbSalvar`, `kbMover`, `kbNotificar` (envio) e `kbWaCfgRender`
  (painel de configuração). Servidor da API oficial em `backend/server.js`.
- **Usuários / acessos**: `ADMIN_USER`, `normalizaUsuarios`, `salvarUsuarios`,
  `renderUsuarios`, `usuarioSalvar`, `colaboradorNovo` (persistência em
  `localStorage` chave `af_usuarios`; em produção, isso vai para o backend).

45. **Vendas e metas — a área comercial** (`v-vendas`, `vendasRender`). É a
    tela que responde, nesta ordem: **quanto falta**, **por que falta** e **o
    que fazer agora**. Primeiro item do grupo Comercial, só para a gestão.
    - **Placar da meta** — meta do mês, fechado, o que falta em reais **e em
      número de contratos** ("faltam R$ 3.200 = 1 fechamento do seu tamanho
      médio"), e o que já está em negociação. A barra tem uma **marca cinza**
      no ponto do mês em que você está: se a barra dourada está atrás da marca,
      você está atrasada — dá para ver sem ler número nenhum.
    - **Funil em barras** — Leads recebidos → Assumidos → Contatados →
      Reunião/proposta → Fecharam. Cada degrau mostra a **taxa de passagem** e
      quantos pararam ali, e o pior degrau ganha o selo **"o funil vaza aqui"**.
      É o que explica o resultado: não adianta buscar mais lead se a perda está
      na proposta.
    - **"Por que o mês está assim"** — leitura em texto, calculada: ritmo
      contra o calendário, onde o funil vaza, maior motivo de perda, leads
      parados no painel e a comparação com o mês anterior.
    - **Motivo de perda** — ao marcar "não fechou", abre um modal com os
      motivos (preço, momento, concorrente, sumiu, perfil, outro) e um campo de
      detalhe. Vira o gráfico "Por que perdemos". `LEAD_MOTIVOS`,
      `leadPerdaAbrir`, `leadPerdaSalvar`.
    - **Comparação entre períodos** — fechado, nº de vendas, taxa e ticket
      médio contra o mês anterior. Indicador que já é percentual compara em
      **pontos**, não em porcentagem de porcentagem.
    - **Meta sugerida, não campo em branco** — nasce da meta do trimestre do
      Planejamento; sem ela, da média do que você vem fechando **mais 20%**;
      depois do faturamento médio da empresa. `vendasMetaSugerida`.
    - **O que voltou para a sua mão**: a meta de contatos do dia com a régua de
      bolinhas, o **painel de leads livres com "Pegar para mim"** e a **sua
      carteira** com WhatsApp, registrar contato, mudar status e devolver.

46. **A gestão também pega e distribui lead** — os cartões do painel eram só
    leitura para quem é admin (apareciam sem botão nenhum). Agora têm **"Pegar
    para mim"**, **"Entregar"** e edição, tanto em *Vendas e metas* quanto em
    *Prestadores e leads*. O modal de entrega mostra quem está **liberado em
    cada contrato** — quem não está aparece marcado, com o motivo, em vez de
    sumir da lista. `leadEntregar`, `leadEntregarOpcoes`.

47. **Quem é "você" ao pegar um lead** — o admin herdava a identidade do
    colaborador selecionado no portal, então o lead que ela pegava ia para
    outra pessoa. `leadEuId()` resolve a identidade pelo contexto: dentro do
    portal vale a pessoa mostrada; fora dele, quem está logado.

48. **Histórico de vendas na base** — sem fechamentos e perdas anteriores, o
    funil, a taxa de conversão, os motivos de perda e a comparação entre meses
    nasciam zerados e a tela não ensinava nada. O sistema semeia um histórico
    do mês atual e do anterior (e migra quem já usava, uma única vez).
    `leadSemearHistorico`, chave `af_leads_hist`.

49. **A meta do mês entra no "Agora" e no briefing** — quando você está atrás
    do ritmo, o primeiro passo do dia passa a ser quanto falta e quantos
    fechamentos isso representa; e o ritmo de contatos entra logo abaixo.

## A rede de prestadores — versão 0208

O sistema deixou de ser só a gestão da Carla e virou a plataforma do grupo:
**8 marcas**, **8 contratos**, uma rede de prestadores autônomos e um mercado
de trabalho interno. Nada roda antes do contrato assinado.

50. **As marcas do grupo** (`MARCAS`) — Grupo A! Fatorial, A! Saúde, A! Fatorial
    Representações, A! Treinamentos, A! Multiplicadora, PGE, A! Start Talk e
    Carla Caroline. Cada **contrato** (`CONTRATOS`) pertence a uma marca e tem
    tipo (PF/PJ) e comissão base própria. Toda demanda, todo lead e todo
    relatório sabem de qual negócio são.

51. **Todo mundo é autônomo** — não existe mais CLT no sistema. A migração
    (`redeMigrar`) converte quem já estava cadastrado, deduz um **escopo** da
    área da pessoa, libera contratos coerentes e gera o contrato para
    assinatura. Ninguém é assinado no lugar da pessoa.

52. **Contrato de prestação de serviços padrão** (`contratoTexto`) — um modelo
    só, 11 cláusulas: objeto (montado a partir do **escopo** escolhido),
    autonomia e ausência de vínculo (art. 593 do CC), remuneração (hora e/ou
    comissão), representação autorizada (só os contratos liberados),
    obrigações, confidencialidade e LGPD, propriedade intelectual, não
    concorrência, vigência e rescisão, assinatura eletrônica (MP 2.200-2 e Lei
    14.063/2020) e foro. Dá para ler na íntegra e imprimir em PDF.

53. **D4Sign** (`D4`, `d4Enviar`, `d4Assinar`) — dois modos, como no WhatsApp:
    **simulado** roda o fluxo inteiro sem credencial nenhuma; **oficial** manda
    o contrato pela ponte do backend (`/d4sign/enviar`, `/d4sign/status/:uuid`,
    `/d4sign/webhook`), com a chave guardada no servidor, nunca no navegador.
    `prestLiberado()` é a trava: **sem assinatura, a pessoa não vê lead nem
    demanda** — e o portal dela explica exatamente isso.

54. **Central de demandas** (`v-demandas`) — o mercado de trabalho interno.
    A demanda nasce sua ou de uma empresa parceira, mostra **escopo, prazo,
    entregáveis, requisitos e quanto vale** antes de alguém decidir, e some do
    mural de todos quando é pega. Dois tipos: **por tempo** (o relógio conta e
    você paga as horas reais) e **por resultado** (valor fechado na entrega).
    Fluxo completo: mural → pegar → cronômetro (pausa e retoma) → entregar com
    checklist → conferência → aprovar com nota → pagar.

55. **O relógio** (`demSegundos`, `demPctTempo`) — cada demanda soma sessões de
    trabalho. Se o navegador fecha com o relógio rodando, a sessão encerra no
    último ponto conhecido (`demFechaSessoesOrfas`) — o tempo não infla
    sozinho. Na entrega, a gestão vê **tempo real contra o estimado**.

56. **Níveis da rede** (`PREST_NIVEIS`) — Bronze, Prata, Ouro e Diamante, por
    quanto a pessoa **já ganhou**. Não é enfeite: cada faixa vale **pontos a
    mais de comissão em tudo** (`comissaoDe` soma o bônus) e **abre as demandas
    antes** (`DEM_JANELA_H`: Bronze espera 12h, Diamante vê na hora). O portal
    mostra quanto falta para a próxima faixa e o que ela destrava.

57. **Empresas parceiras** (`v-parceiras`) — a empresa se cadastra, você
    aprova, e as demandas dela caem em **triagem**. Você libera para o mural, a
    sua rede executa e você fica com a margem — terceirização para dentro, sem
    contratar ninguém.

58. **Cadastro público** (`#cadastro`) — duas portas na tela de entrada:
    *quero prestar serviço* e *minha empresa quer enviar demandas*. Prestador
    cai em Rede de prestadores para aprovação (`candAprovar` cria o acesso);
    empresa cai em Empresas parceiras. O link é copiável em um clique
    (`cadLinkCopiar`) para mandar no WhatsApp ou no rodapé do site.

59. **Desempenho por contrato, por pessoa e por negócio** (`v-rede`) —
    contrato: leads, fechamentos, conversão, receita e **quantos da rede estão
    liberados** (contrato sem ninguém assinado aparece marcado, porque é
    receita que não tem quem vá buscar); pessoa: ganho total e do mês,
    negócios, demandas, nota média e pontualidade; negócio: receita, custo da
    rede e **margem por marca**.

60. **Portal do prestador reconstruído** — quatro abas de trabalho antes de
    tudo: **⚔ Demandas** (mural + execução + histórico), **🎯 Meus leads**,
    **💰 Meus ganhos** e **📄 Meu contrato**.
    - *Meus ganhos* mostra o que a pessoa normalmente não olha: comissão parada
      na carteira, contatos pegos e não feitos, retornos atrasados, valor
      disponível no mural, **valor por hora real**, nota média, pontualidade,
      projeção do mês no ritmo atual, quanto falta para a próxima faixa e o que
      ela vale — e o extrato linha a linha do que compôs o ganho.
    - *Meu contrato* traduz o contrato em seis blocos em português claro e
      mostra as faixas da rede com o que cada uma destrava.

61. **Tudo conectado ao "Agora"** — entrega esperando conferência, cadastro
    novo, empresa querendo entrar, demanda em triagem, prestador sem contrato,
    demanda atrasada: cada um vira um passo na faixa do topo e no briefing de
    entrada, com o botão que leva direto ao lugar certo.

## Uma atividade, um lugar — versão 0208.02

O menu tinha 22 telas espalhadas em 8 grupos. Agora tem **6 áreas**, e cada
área é uma atividade inteira, com o mesmo raciocínio da esteira comercial:
uma trilha numerada mostra em que passo você está, o que veio antes e o que
vem depois — e leva ao próximo com um clique.

62. **As áreas** (`AREAS`, `areaIr`, `renderRail`):

    | Área | Etapas |
    |------|--------|
    | ◳ **Meu painel** | Gestão à vista · Visão do dono |
    | ◎ **Vender** | Meta do mês · Leads · Esteira 1-14 · Propostas · Plano do ano |
    | ⚔ **Entregar** | Demandas · Quadro da equipe · Conferência · Portal do cliente · Satisfação |
    | ◱ **A rede** | Prestadores · Empresas parceiras · Portal da pessoa · Pessoas |
    | ❖ **O dinheiro** | Caixa e DRE · Financeiro 360 · Futuro |
    | ⚙ **Ajustes** | Catálogo · Equipe e acessos |

    Fora delas, só **🎯 Meus leads**, que é a página de quem trabalha por
    resultado e só aparece para essa pessoa.

63. **A trilha** fica logo abaixo da faixa "Agora", em **toda** tela da área:
    nome da área, as etapas numeradas com a atual destacada, e um botão que
    leva para a próxima. Ocupa 45px — as telas não perderam altura útil.

64. **Nada foi perdido nem duplicado** — a auditoria confirma: toda tela
    pertence a exatamente uma área, nenhuma órfã, nenhuma repetida, todas com
    título e entrada no configurador de permissões.

65. **A área tem o nome de quem olha** — a mesma área "A rede" chama-se **Meu
    portal** para quem presta serviço; "Entregar" chama-se **Meu projeto** para
    o cliente. Etapas sem permissão somem da trilha, e a área inteira some do
    menu quando a pessoa não tem acesso a nenhuma delas.

66. **Todo mundo trabalha por resultado — a distinção acabou.** Não existe
    mais "contratado" contra "por resultado" no sistema: `prestadores()`
    devolve todo mundo que está ativo, `ehPrestador()` é sempre verdadeiro e o
    seletor de vínculo saiu (virou só ativar/desativar a pessoa). O que
    diferencia uma pessoa da outra é o **escopo**, os **contratos liberados** e
    o **nível** — nunca o tipo de vínculo.

67. **"Meus leads" saiu do menu e virou aba do portal.** Era o último item solto
    fora das áreas e duplicava a aba que já existia em *Meu portal*. A tela
    continua existindo como **etapa oculta** da área "A rede" — é a superfície
    que a gestão abre em "👁 Painel dele". O que trava o painel agora é o
    **contrato não assinado**, não o tipo de vínculo, e a tela diz isso.

68. **A trilha sumia no tema claro.** `.area-rail` usava `var(--bg)`, que é o
    fundo do documento e é quase preto **nos dois temas** — no claro dava texto
    escuro sobre fundo escuro. Passou a usar `var(--panel)`, a superfície de
    verdade. Junto: a etapa não visitada levava duas atenuações somadas
    (opacidade 0,55 **mais** cor apagada) e quase desaparecia; agora a
    diferença é só de cor e peso. Contraste medido: mínimo **6,02:1** no claro
    e **6,88:1** no escuro, etapa atual em 18,49 e 14,92 — bem acima dos 4,5:1
    exigidos.

69. **Etapa não é a mesma coisa que prévia.** O *Portal do cliente* estava
    listado como etapa 4 de "Entregar" — mas ele não é um passo do seu
    trabalho, é a tela de outra pessoa. Agora a trilha separa as duas coisas:
    as **etapas numeradas** são o que você executa, e depois de um divisor vêm
    os **botões de prévia** (👁), com borda tracejada, para espiar a tela do
    outro lado. Estando na prévia, o botão da direita vira "← Voltar para
    <primeira etapa>".
    - *Entregar*: Demandas → Quadro da equipe → Conferência → Satisfação,
      e a prévia "Ver como o cliente vê".
    - *A rede*: Prestadores → Empresas parceiras → Pessoas, e as prévias
      "Ver como a pessoa vê" e "Ver o painel de leads".
    - **A prévia é relativa a quem olha** (`passoEhPrevia`): para a gestão o
      portal do colaborador é prévia; para o próprio colaborador é a tela dele
      e volta a ser etapa numerada. O cliente, que só tem o portal, entra
      direto nele sem trilha nenhuma.

## Serviços executáveis — versão 0708.01

O que era vendido de boca virou processo. Cada serviço que a empresa domina
ganha, dentro do sistema: **contrato próprio**, **lista de documentos**,
**telas de execução** e um **entregável assinado**. O cliente vê método, não
promessa. O primeiro é o Valuation; os próximos entram na mesma estrutura.

70. **`SERV_EXEC` — o registro dos serviços com processo.** Cada serviço
    declara marca, contrato do grupo, escopo, prazo, valor de partida, o
    método, o que o cliente recebe e as etapas. A tela **Serviços** (primeira
    etapa da área *Entregar*) mostra o catálogo executável e todos os projetos
    em execução, com a etapa de cada um. *Formatação de franquias* já aparece
    ali marcada como em construção — é o slot do próximo.

71. **Um projeto por cliente, não um por navegador** (`DB.projetos`, chave
    `af_projetos`). O sistema original guardava uma empresa por vez; aqui cada
    cliente tem o seu projeto, com dados, documentos, contrato e laudo
    próprios, e a lista mostra todos lado a lado.

72. **A esteira do valuation** — oito etapas numeradas dentro do projeto:
    Cliente → Contrato → Documentos → Números → Premissas → Cálculo →
    Sensibilidade → Laudo. **O sistema deduz em que etapa o projeto está**
    (`prjEtapaAtual`) — ela não precisa marcar nada — e trava o que não pode
    andar: sem contrato assinado não abre nada, sem os documentos obrigatórios
    não emite laudo.

73. **Contrato de valuation** — 12 cláusulas geradas com os dados do projeto:
    objeto com a **finalidade** informada (venda, entrada de sócio, partilha,
    garantia, sucessão), metodologia, o que **não** está incluído, prazo
    contado do recebimento integral dos documentos, preço, sigilo por 5 anos,
    propriedade do laudo, limitação de responsabilidade, LGPD e foro.
    Imprimível e integrado ao fluxo de assinatura.

74. **Ficha de documentos com portal do cliente.** As 8 categorias e 39 itens
    (15 obrigatórios) viraram checklist com progresso. **O cliente recebe um
    link com PIN** (`index.html#doc=<projeto>`), abre, marca o que já enviou e
    escreve observações — e você vê tudo em tempo real do seu lado. A lista
    também imprime, para quem prefere papel.

75. **O motor de avaliação, conferido número a número.** DCF com projeção
    ano a ano, valor terminal e fator de desconto; múltiplos EV/EBITDA,
    EV/Receita, P/L e P/VP; abordagem patrimonial; capitalização de lucros;
    normalização por add-backs; WACC montado a partir de CAPM; 14 indicadores
    e índice de prontidão para venda. **Comparado contra o Valoris original com
    os mesmos dados: os 12 resultados batem exatamente** (EBITDA normalizado,
    WACC, Ke, EV, equity, valor concluído, faixa, score, PL, peso do valor
    terminal e CAGR).

76. **Football field** — a faixa de cada método em barras, com o valor
    concluído destacado. Onde as barras se cruzam está o número defensável;
    onde uma foge das outras, há premissa para revisar.

77. **Sensibilidade e alavancas.** Matriz WACC × crescimento na perpetuidade
    em mapa de calor, com o cenário-base contornado. E, abaixo, **o que
    aumentaria o valor**: o sistema recalcula a avaliação inteira com cada
    mudança isolada (crescer 5 p.p., ganhar 3 p.p. de margem, quitar metade da
    dívida, reduzir 1 p.p. do custo de capital, cortar capex) e ordena por
    impacto em reais. É a lista do que fazer **antes** de negociar.

78. **Laudo em 9 seções**, gerado do projeto: identificação e finalidade,
    metodologia com os pesos, desempenho histórico com a normalização
    explicada, premissas, custo de capital detalhado, tabela por método,
    conciliação, situação econômico-financeira com o score, e as ressalvas
    editáveis. Sai em PDF com a assinatura das duas partes.

79. **Ligado ao resto do sistema** — contrato sem assinar, documento faltando
    e laudo pronto para entregar viram passos na faixa "Agora" e no briefing,
    com o botão que abre o projeto na etapa certa.

## O segundo serviço executável — franquias · versão 0708.02

O slot que ficou aberto foi preenchido. **Formatação de franquias** entrou na
mesma estrutura do valuation, sem inventar arquitetura nova: mesmo `DB.projetos`,
mesma trilha numerada, mesmo fluxo de contrato, mesmo laudo imprimível.

80. **Nove etapas** dentro do projeto: Cliente → Contrato → Diagnóstico →
    Viabilidade → Documentação → POPs → COF → Rede → Laudo. O sistema deduz
    onde o projeto está (`frEtapaAtual`) e trava o que não pode andar.

81. **Índice de franqueabilidade** — 10 pilares com pesos diferentes
    (`FR_PILARES`), cada um com 3 ou 4 afirmações avaliadas de 0 a 10 em
    botões. Resultado de 0 a 100 com veredito em cinco faixas, de *altamente
    franqueável* a *não franqueável agora*. Abaixo, **por onde a formatação
    começa**: os pilares ordenados por *peso × o quanto falta*, mostrando
    quantos pontos cada correção acrescenta ao índice — resolver o primeiro
    vale mais que resolver os três últimos.

82. **Viabilidade da unidade franqueada** — investimento, faturamento, custo
    variável e fixo, royalties e fundo de marketing. Sai margem de
    contribuição, lucro, ponto de equilíbrio, payback, ROI, VPL e TIR, com
    projeção ano a ano. E os avisos que evitam vender uma rede que não fecha:
    payback acima de 36 meses, margem abaixo de 30%, royalties mais fundo
    acima de 12%. **Também mostra o outro lado**: quanto cada unidade gera de
    receita para a franqueadora, por mês e por ano.

83. **Acervo de 31 documentos** em 7 categorias, cada um com estado (não
    começou / em produção / pronto), responsável e prazo — vira o cronograma
    da formatação.

84. **Construtor de POPs** — código, área, responsável, frequência, objetivo,
    passo a passo e indicador. Cada POP imprime como documento próprio, pronto
    para o manual.

85. **COF nos 16 itens da Lei 13.966/2019** — cada item com a descrição legal
    e um campo de conteúdo; a Circular sai em documento imprimível, com a
    advertência do prazo de **10 dias de antecedência** (descumprir torna o
    contrato anulável, art. 2º §2º).

86. **Rede e expansão** — 16 indicadores em 4 grupos com meta e referência de
    mercado, funil de captação de franqueados (com o degrau que vaza marcado,
    igual ao funil comercial) e plano de expansão que calcula **quanto a
    franqueadora fatura** por ano: royalties e fundo das unidades ativas mais
    a taxa de franquia das novas.

87. **Contrato de formatação** com 12 cláusulas, incluindo duas que protegem
    de verdade: a **base legal** (a CONTRATADA não presta advocacia; a
    validação jurídica final é do advogado do cliente) e a **condição de
    franqueabilidade** — se o diagnóstico concluir que o negócio ainda não
    pode franquear, o contrato pode ser reconvertido em consultoria de
    estruturação por aditivo, aproveitando o que já foi pago.

88. **Laudo de franqueabilidade em 9 seções**, com o índice em destaque,
    pontos fortes, os três pilares a atacar primeiro, viabilidade da unidade,
    retorno da franqueadora, estado da documentação e da COF, a observação
    legal e as ressalvas.

89. **Motor conferido contra o FRANQIA original** — índice, veredito, margem
    de contribuição, lucro, ponto de equilíbrio, payback, ROI, lucratividade,
    VPL, TIR e a projeção ano a ano: **todos batem**.

## Três serviços novos e o teclado consertado — versão 0808.02

A pergunta era "quais outros serviços dá para transformar em entregável".
A resposta veio em três, escolhidos porque cobrem exatamente o que a empresa
já vende — consultoria, melhoria de processos e reestruturação — e porque um
puxa o outro: o **Raio-X** é barato, rápido e prescreve os demais; a
**Arquitetura de preço** é a de maior retorno imediato; a **Reestruturação**
é a de maior valor por projeto.

O registro de serviços deixou de ter ramificação fixa: cada serviço declara
suas próprias funções e o resto do sistema funciona igual para todos —
acrescentar o quarto, o quinto e o sexto agora é encaixar peça, não reescrever.

90. **Raio-X do negócio — o diagnóstico que já vende o próximo serviço**
    (`v-raiox`, `rxRender`). É a porta de entrada da consultoria: barato de
    contratar, rápido de entregar, e cada resultado dele aponta um serviço
    maior. **48 perguntas em 9 dimensões ponderadas**, numa escala de
    maturidade de cinco níveis com âncora objetiva — a pergunta nunca é "você
    é bom nisso", é "isso existe, está escrito, é seguido, é medido, melhora
    sozinho". É isso que faz duas pessoas diferentes chegarem à mesma nota, e
    é o que separa diagnóstico de opinião.

91. **Oito indicadores tirados do balanço, sem entrevista** — liquidez
    corrente e seca, endividamento, margem EBITDA e líquida, dívida
    líquida/EBITDA, retorno sobre o patrimônio e ciclo financeiro. Metade do
    diagnóstico sai da contabilidade.

92. **Análise dinâmica do capital de giro** — separa capital de giro (CDG),
    necessidade de capital de giro (NCG) e saldo em tesouraria, e classifica a
    empresa em **uma das seis estruturas financeiras**. É o que distingue
    problema de *ciclo* (vende bem, recebe tarde) de problema de *estrutura*
    (imobilizado comprado com dinheiro de curto prazo) — diagnósticos
    diferentes, tratamentos diferentes, e confundir os dois é o erro mais caro
    que se comete em reestruturação.

93. **Radar das nove dimensões e ranking do que quebra primeiro** — a ordem
    não é pela nota mais baixa, e sim pela nota mais baixa **na dimensão que
    mais pesa**: fraqueza em tecnologia atrasa a empresa, a mesma fraqueza em
    caixa fecha a empresa.

94. **Prescrição automática** — cada fraqueza encontrada aponta o serviço do
    grupo que a resolve, com valor e prazo, e o botão abre o projeto já com os
    dados do cliente copiados. A **cláusula 8ª do contrato** abate o valor
    pago pelo diagnóstico do primeiro serviço contratado em 90 dias: o cliente
    entende que não comprou um relatório, comprou o começo do trabalho.

95. **Plano de 90 dias em três ondas** — o que para a sangria (dias 1–30), o
    que organiza (31–60), o que faz crescer (61–90). A ordem é parte da
    recomendação. O botão "sugerir plano" lê as notas mais baixas das
    dimensões de maior peso e monta as três ondas com dono e efeito esperado.

96. **Arquitetura de preço e margem** (`v-preco`, `pcRender`) — o trabalho de
    maior retorno imediato da consultoria: preço corrigido aparece no caixa no
    mês seguinte, sem investimento nenhum.

97. **Carga tributária de verdade, pelos três regimes** — alíquota **efetiva**
    do Simples pela fórmula da LC 123/2006, `(RBT12 × nominal − parcela a
    deduzir) ÷ RBT12`, com os cinco anexos e o **Fator R** decidindo
    automaticamente entre o Anexo III e o V; presunção do **art. 15 da Lei
    9.249/1995** no Lucro Presumido, com adicional de 10% acima de R$ 20
    mil/mês; PIS/COFINS não cumulativo com crédito no Lucro Real. O sistema
    diz qual é o mais barato e **quanto a troca devolve por ano**.

98. **Markup divisor, não multiplicador** — `preço = custo ÷ (1 − impostos −
    variáveis − margem)`. O erro mais comum e mais caro do varejo e do serviço
    brasileiro é somar 40% ao custo achando que vai sobrar 40%: não sobra,
    porque imposto e comissão incidem sobre o preço, não sobre o custo.

99. **Margem de contribuição por hora do recurso gargalo** — ordenar produto
    por margem percentual é o que faz empresa priorizar o item errado. Quando
    a capacidade é o que limita, quem manda é a margem por hora. A tela mostra
    a diferença em reais por hora entre o melhor e o pior item.

100. **Ponto de equilíbrio contábil, financeiro e econômico**, margem de
     segurança, grau de alavancagem operacional e **curva ABC** de onde vem a
     margem.

101. **Limite de desconto com número** — com margem de contribuição *m*, um
     desconto *d* exige `d ÷ (m − d)` a mais de volume só para empatar. A tela
     traz a tabela de 1% a 20%, o desconto que zera a margem de cada item, o
     limite recomendado e o piso absoluto — abaixo do qual vender é pior que
     não vender.

102. **Reestruturação e fôlego de caixa** (`v-caixa`, `cxRender`) — para quem
     está sem ar. O instrumento é o mesmo que as firmas de turnaround usam no
     mundo inteiro: o **fluxo de caixa de 13 semanas pelo método direto**, que
     responde à única pergunta que importa — **em que semana o caixa vira**.
     Treze semanas são um trimestre: longe o bastante para dar tempo de agir,
     perto o bastante para ninguém inventar premissa.

103. **Mapa de dívida** com custo médio ponderado, desembolso mensal, garantia
     e situação por credor — porque às vezes a menor dívida é a que mais
     machuca.

104. **Portfólio de iniciativas** com dono, impacto em reais, **maturação** (em
     quantos meses o efeito chega ao caixa) e estágio. O total **ponderado
     pelo estágio** — ideia vale 25%, aprovada 50%, em andamento 80%,
     concluída 100% — é o número que se leva ao credor. Prometer o bruto é o
     que faz a segunda rodada de negociação ser muito pior que a primeira.
     Vêm **8 alavancas prontas** do mercado, cada uma com prazo típico,
     esforço e o risco de puxá-la.

105. **Ponte de EBITDA** — do resultado de hoje ao alvo, barra por barra, com
     nome e dono em cada uma. Barra sem nome não entra na ponte.

106. **Termômetro de insolvência** — **Altman Z''** para mercados emergentes e
     o **índice de Kanitz**, construído com dados de empresas brasileiras. Não
     é profecia: é comparação estatística, e serve para tirar a decisão do
     campo da emoção.

107. **Rota de equacionamento** — renegociação privada, recuperação
     extrajudicial ou recuperação judicial, cada uma com *quando se aplica*,
     *como funciona* e a **base legal** pela Lei 11.101/2005 na redação da Lei
     14.112/2020 (quóruns da extrajudicial, inclusão de crédito trabalhista
     por negociação coletiva, exclusão do crédito tributário, prazo de
     suspensão na judicial). O sistema indica a rota pelos números; a decisão
     é da administração, com advogado — e o contrato diz isso na cláusula 4ª.

108. **Digitar sem perder o cursor** — enquanto se digita, o painel não é mais
     reconstruído: só os blocos de número são reescritos, e o redesenho
     completo fica adiado até a pessoa sair do campo. O campo em foco nunca é
     destruído.

109. **Números que se separam sozinhos** — todo campo de dinheiro se formata
     no padrão brasileiro (`1.850.000,50`) enquanto se digita, com o cursor
     preservado depois da mesma quantidade de dígitos, inclusive ao editar no
     meio do número. A leitura entende as duas notações: campo com máscara e
     campo numérico do navegador, que sempre devolve ponto decimal.

## Várias pessoas ao mesmo tempo — versão 0808.03

Era a última ponta solta: o sistema guardava tudo no navegador, então duas
pessoas em máquinas diferentes não brigavam, mas também não viam o trabalho
uma da outra. Agora existe um servidor de equipe — **opcional**. Sem ele
configurado, absolutamente nada muda: o `index.html` continua abrindo sozinho,
offline, do jeito que é entregue.

110. **Servidor de equipe** (`backend/equipe.js`, montado em `server.js`).
     Contas com senha (scrypt do próprio Node, sem dependência nova), sessões
     por token, presença, e os dados em `backend/dados/` com escrita atômica —
     grava em `.tmp` e renomeia, então nunca fica pela metade. **Faça backup
     dessa pasta: é o banco de dados.**

111. **Ninguém derruba o trabalho de ninguém.** O navegador não manda o
     registro inteiro: manda um **remendo** com só o que mudou, campo a campo.
     Se a Beatriz mexe no telefone do lead enquanto a Carla mexe no status, o
     servidor junta as duas. Só existe conflito de verdade quando as duas
     mexem no **mesmo campo** — e aí vale a última, mas o valor anterior fica
     registrado com nome e hora, em *Ajustes → Equipe → O que foi sobrescrito*.

112. **Listas com id viram registros.** Antes de comparar, `leads`, `projetos`,
     `demandas`, tarefas do kanban e lançamentos financeiros são convertidos
     em objetos com o id na chave (e a ordem guardada à parte). É esse truque
     que dá junção por registro sem precisar reescrever o sistema inteiro.

113. **Servidor fora do ar não trava ninguém.** O que você escreve fica numa
     fila local, o selo da topbar avisa quantas mudanças estão esperando, e
     tudo sobe sozinho quando a conexão volta. Nada se perde no caminho.

114. **Presença ao vivo** — o selo na topbar mostra as iniciais de quem mais
     está online e em que tela cada pessoa está. Clicando, abre a configuração.

115. **Contas da equipe** (só quem é admin) — criar, trocar senha, desligar e
     religar. Desligar uma conta **derruba a sessão dela na hora**, em todas as
     máquinas.

116. **Quem conecta primeiro semeia.** A primeira máquina sobe a base que tem;
     as seguintes recebem essa base pronta. Por isso: conecte primeiro a
     máquina com os dados bons. Se duas conectarem juntas, o servidor recusa a
     segunda substituição inteira e o navegador reenvia a parte dela como
     remendo — nada é descartado em silêncio.
