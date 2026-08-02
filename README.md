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
