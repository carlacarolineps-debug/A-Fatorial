# A! Fatorial — Sistema de Gestão (Arquitetura de Lucro)

Aplicação de página única (um arquivo `index.html`, sem build, JavaScript puro).
Abra o arquivo no navegador para usar.

## Acessos (tela de login)

| Perfil | Entra vendo | Pode acessar (padrão) |
|--------|-------------|------------------------|
| **Admin / Gestão** | Gestão à vista | Todas as telas |
| **Colaborador** | Portal do colaborador | Portal do colaborador, **Esteira comercial**, **Propostas e rastreio** e **Kanban operacional** (já filtrado nas demandas dele) |
| **Cliente** | Portal do cliente | Portal do cliente |

Todos os perfis usam **o mesmo visual** (tema claro, um só — ver "Um tema só")
e a **mesma moldura** (menu lateral + topo) — cada um enxerga apenas os itens
que tem permissão.

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
- **Motor de processo**: `PROCESSOS` (os quatro processos, com etapa, dono,
  critério, prazo, motivo e ação), `procEtapaAtual`, `procChecar` (o critério
  objetivo), `procDono` (de quem é a bola), `procTempo` (prazo e atraso),
  `procFila` (o que é meu agora), `procGargalos` (onde trava), `procAderencia`,
  `procExecutar` (a porta única das ações, com a trava), `procForcar` (pular
  com justificativa) e `procDesvio`. Visual: `procTrilhaHTML` e
  `procCartaoHTML`, usados na tela **Execução** (`v-processo`) e dentro dos
  cards de lead e demanda. **Para acrescentar um processo**: uma entrada em
  `PROCESSOS` com `itens`, `nome`, `etapaDe`, `desde` e as etapas — o resto
  (fila, gargalo, aderência, trava, desvio) passa a valer sozinho.
- **Cor e legibilidade**: `--gold` (dourado de superfície: fundos, bordas,
  gradientes) e `--gold-txt` (dourado de texto, fechado o bastante para ler
  no claro). A regra das **ilhas escuras** — `.ptg, .pt-hero, .in-hero,
  .cad-box, .rel-ov, .cli-ov, #login-screen` — devolve o dourado claro só
  dentro delas. `--kb-ouro` aponta para o de texto, o que mantém legível
  tanto o ícone sobre o próprio tom quanto o branco sobre a tarja. O sistema
  tem **um tema só, claro**; a cor de destaque fica em `AP_CORES`/`apAplicarCor`.
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

## Um tema só: claro — versão 0808.04

O sistema tinha dois temas e o escuro era o padrão. Agora tem um só, e o
botão de alternar saiu. Não é só apagar a classe: o tema claro nunca tinha
sido usado de verdade, então carregava defeitos que ninguém via.

117. **O tema escuro saiu inteiro** — 51 regras de CSS, o botão da barra de
     cima, a linha "Tema" no painel de aparência e as funções que ligavam
     tudo. A chave `af_tema` de versões antigas é descartada na abertura,
     para ninguém reabrir no escuro sem querer. A **cor do sistema**
     continua (dourado, vinho, magenta, violeta, oceano, esmeralda).

118. **`--gold-txt`: o dourado quando é texto.** O dourado da marca (#d4af5e)
     rende 2:1 sobre branco — ilegível. Existia um segundo dourado, mais
     claro ainda, feito para brilhar no escuro, e ele aparecia como texto em
     103 lugares: valores do fluxo de caixa, colunas do simulador, chips de
     permissão. Agora todo dourado **de texto** usa um tom fechado (4,9:1);
     o dourado **de superfície** — fundos, bordas, gradientes — continua o
     mesmo.

119. **Ilhas escuras** — capa do portal do cliente, cadastro público,
     relatório em tela cheia e a tela de entrada seguem escuros de
     propósito. Dentro delas o dourado de texto volta a ser o claro, por uma
     linha de CSS só. O portal do colaborador ficou de fora dessa lista de
     propósito: ele mistura fundo escuro com cartões claros e tem tokens
     próprios.

120. **Iniciais dentro do avatar** — eram brancas sobre o dourado claro
     (2:1). O avatar passou a usar o dourado fechado; o branco em cima dele
     rende 6:1, e a paleta inteira do kanban ficou entre 4,8 e 6,9.

121. **Varredura de contraste em todas as 28 telas**, em cada texto e em cada
     campo de formulário, medindo a cor real sobre o fundo real (compondo
     transparência camada a camada). Resultado: **nenhum texto e nenhum campo
     abaixo do mínimo**. O único apontamento que sobra é do medidor, não da
     tela — o número do funil fica sobre a barra colorida, e a ferramenta lê
     o trilho que está atrás.

## O processo virou motor — versão 0808.02

A crítica foi direta: só a esteira tinha lógica de fluxo; no resto cada um
fazia o que queria e o processo se perdia. Inadmissível para uma empresa que
vende padronização. Então a esteira deixou de ser uma tela e virou **motor**.

A esteira funciona porque obedece a cinco regras. Elas agora valem para tudo:

1. Todo item está em **uma** etapa — nunca em duas, nunca em nenhuma.
2. Cada etapa tem **uma** ação, escrita, com o motivo de existir. Não é um
   menu de botões: é o próximo passo.
3. Para sair da etapa existe **critério objetivo** — uma lista que o sistema
   confere sozinho. Não é opinião de ninguém.
4. Toda etapa tem **dono e prazo**. Se a bola é de outra pessoa, o sistema diz
   de quem é e não deixa você fazer no lugar dela sem avisar.
5. Pular etapa é possível para a gestão, mas exige **justificativa** e vira
   **desvio registrado** — que é o que alimenta a melhoria contínua.

122. **Quatro processos declarados, 21 etapas.** Captação comercial (do lead
     ao negócio aberto), Execução de demanda (do mural ao pagamento), Serviço
     executável (do contrato ao laudo) e Entrada na rede (do cadastro à
     primeira demanda). Cada etapa traz **por que existe** — o texto aparece
     na tela, não fica num manual que ninguém lê.

123. **Tela "Execução" — o primeiro passo do dia.** Passou a ser o passo 1 de
     *Meu painel*, antes dos números: *o que é meu agora*, em ordem de
     urgência, com a ação de cada item. Ninguém precisa adivinhar por onde
     começar.

124. **O próximo passo mora dentro do card.** Lead e demanda passaram a
     mostrar a trilha numerada, a etapa atual, de quem é a bola, quanto tempo
     está parada, o que falta pelo critério e o único botão. Sem sair da tela.

125. **A trava.** Tentar agir numa etapa de outra pessoa é recusado com o nome
     de quem tem a bola. A gestão pode fazer no lugar — mas o botão diz "fazer
     no lugar de X" e o sistema avisa que o tempo daquela pessoa deixa de ser
     medido.

126. **Onde o processo trava** — soma quantos itens estão parados em cada
     etapa e o tempo médio de cada uma. Etapa com muita gente parada não é
     problema de pessoa: é critério confuso, prazo irreal ou dono errado. É a
     tela da melhoria contínua.

127. **Aderência ao prazo** — percentual do trabalho que está dentro do prazo
     da própria etapa, no topo da tela, ao vivo.

128. **A ponte que faltava: lead que fechou entra na esteira.** Antes, "Fechou"
     era fim de linha e alguém redigitava tudo no Funil. Agora o lead leva os
     próprios dados para o cadastro, a esteira começa, e o lead passa a
     apontar para o negócio — o elo se fecha.

## Duas marcas, um sistema — versão 0908.03

A estratégia mudou e o software tinha de acompanhar: **Grupo A! Fatorial** (o
ecossistema empresarial) e **Carla Caroline** (mentoria comportamental e
estratégia de negócios) são marcas separadas, com público, entregável e
Instagram próprios — `@afatorialsolucoes` e `@pscarlacaroline`. Misturar as
duas é o defeito que a consultoria corrige nos clientes: empresa cujo valor
depende do nome da fundadora não se vende, não se delega e não se multiplica.

129. **As duas casas viraram modelo, não texto.** `MARCAS` ganhou o campo
     `casa` (`grupo` | `pessoal`) e nasceu a tabela `CASAS`, com nome,
     público e Instagram de cada uma. `marcasDaCasa()`, `casaDe()` e
     `casaDaMarca()` são o acesso — nenhum lugar do sistema precisa saber a
     regra de cor.

130. **Desempenho por casa, não só por marca.** A tela "A rede" separa as sete
     marcas do grupo da marca pessoal, cada bloco com receita e margem
     próprias. Dá para responder "quanto a mentoria faturou" sem planilha.

131. **Liberação de contrato agrupada.** No cadastro do prestador, os
     contratos aparecem sob a casa a que pertencem. Quem libera vê que está
     autorizando alguém a representar a marca pessoal, não a empresa.

132. **Dois papéis timbrados.** `BRAND` continua sendo a empresa; nasceu
     `BRAND_CC`, a identidade da marca pessoal. Em **Ajustes → Identidade** as
     duas aparecem lado a lado, com logo, cor, contato e Instagram próprios.
     Os campos de pessoa jurídica da mentoria vêm em branco de propósito:
     quem emite a nota da mentoria pode não ser a empresa.

133. **A proposta sai pela marca que a emite.** O cadastro do negócio ganhou
     "Marca que emite"; a proposta grava `casa` e o documento inteiro troca de
     timbre — logo, cor, razão social, contato, Instagram e até a assinatura da
     carta ("CEO do Grupo A! Fatorial" ou "mentora comportamental e
     estrategista de negócios"). Proposta antiga, sem `casa`, continua saindo
     pela empresa: nada se perde.

134. **A origem do lead virou medida de posicionamento.** "Instagram" era uma
     opção só, apontando para o perfil pessoal. Agora são duas — o da empresa
     e o da Carla — mais "Site da empresa". É o que permite responder qual das
     duas marcas traz cliente.

135. **A wiki explica a separação e o que fazer com ela.** Artigo novo em
     "A empresa", com a regra prática: proposta, contrato e nota saem pela
     marca certa; lead entra com a origem certa; a comissão da mentoria é a da
     marca pessoal.

136. **`af_brand_cc` entrou na sincronização e no backup**, como qualquer
     outra chave — a identidade da mentoria acompanha a equipe inteira.

## O site refeito: "o laudo" — versão 0908.04

A crítica foi que o site estava feio e amador. Tinha três causas, e as três
eram de raiz.

137. **As fontes nunca carregavam.** O `<link>` para o Google Fonts falha e a
     página cai em Georgia + Arial — e um H1 gigante em Georgia é exatamente
     o que faz um site parecer documento do Word. Pior: eu vinha revisando
     capturas de tela renderizadas na fonte errada, ou seja, desenhando às
     cegas. Agora as três famílias estão **embutidas no CSS em base64**,
     subset latino (o português inteiro cabe em U+0000–00FF). ~120 KB, e a
     página abre igual em qualquer máquina, offline, sem piscar.

138. **Era o visual genérico de máquina.** Creme quente + serifada de display
     + dourado, tudo em cartão branco arredondado com barrinha de destaque no
     topo — a combinação que a própria referência de design lista como o
     clichê a evitar. Quinze seções com o mesmo padding e o mesmo grid de
     cartões.

139. **Não havia grade nem ritmo.** Tudo centralizado na mesma medida, sem
     hierarquia de layout entre uma seção e outra.

O novo padrão parte do que a empresa de fato vende — **laudo**: documento
assinado, com método declarado, norma e lei citadas, número que se confere.
Então a página é composta como documento técnico medido:

140. **A estrutura é desenhada.** Grade de 12 colunas com fios visíveis
     correndo atrás do conteúdo, rótulo de seção rotacionado na margem, e
     ritmo deliberadamente irregular — faixa medida de ponta a ponta, coluna
     estreita de leitura, tabela de dados. Cartão flutuante virou exceção.

141. **Papel frio no lugar do creme.** `#f0f1ed` com viés verde-cinza, como
     vegetal de prancheta, e a tinta com o mesmo viés: cinza neutro sobre
     papel enviesado sempre parece sujo. O dourado da marca ficou, rebaixado
     à sua única função — marcar resultado.

142. **Três letras, três papéis.** Archivo (grotesca de sinalização) carrega
     títulos e informação, apertada e pesada; Newsreader itálico virou só a
     voz enfática — inverte o arranjo de sempre, em que a serifada é o
     padrão; Plex Mono é o instrumento: todo número, rótulo, unidade e
     referência legal, tabular.

143. **Os seis serviços viraram especificação.** Em vez de seis cartões
     iguais, uma tabela onde cada serviço mostra os mesmos campos — número,
     nome, classe, descrição e base legal — e dá para comparar.

144. **A calculadora virou painel de instrumento**, com entradas em cima e
     quatro leituras embaixo, cada uma com a premissa impressa.

145. **Um defeito sistêmico de contraste**, achado pelo medidor corrigido:
     `--tinta-3` rendia 4,13:1 sobre a faixa medida e 3,78:1 sobre o trilho,
     em 46 lugares. Fechado para 5,0:1 no pior fundo em que assenta.

146. **O medidor de contraste estava mentindo.** Ele lia `background-color`
     como texto e não entendia `color(srgb …)` — o formato que o Chrome
     devolve para `color-mix` —, então lia quase-preto onde havia papel e
     acusava 74 defeitos. Corrigido, sobram três apontamentos, todos de fundo
     em gradiente; conferidos no pixel renderizado, dão 12,7 a 15:1.

147. **Vazamento horizontal no celular:** item de grid nasce com
     `min-width:auto`, então a esteira (largura mínima de 56rem) empurrava a
     página inteira em vez de rolar dentro do próprio quadro. Some em todas
     as oito larguras testadas.

148. **`marca.html` reescrito** para o novo padrão, e continua vivo: mede o
     contraste de cada texto da própria página ao abrir e emite um laudo no
     fim. Hoje: 160 trechos medidos, nenhum abaixo do mínimo.

## A marca de verdade — versão 0908.05

Ela mandou o material impresso da marca, e ele corrigiu coisas que o código
vinha propagando erradas.

149. **A assinatura oficial é "Soluções para Empresas e Franquias".**
     "Arquitetura de Lucro" saiu do site e do sistema — lockup, título da
     página, meta, rodapé e tela de entrada. O cargo "Arquiteta de Lucro ·
     CEO" era derivado da assinatura removida e ficaria pendurado sozinho:
     virou "CEO · Grupo A! Fatorial", e o título de mentora fica na marca
     pessoal, onde ele de fato é.

150. **Contato corrigido nos dois lugares:** `contato@grupoafatorial.com.br`
     e `11 9.1101-2147`. Estava indo para um e-mail e um telefone diferentes
     dos do material — proposta, contrato, rodapé e o botão de WhatsApp
     mandavam o cliente para o lugar errado.

151. **O avião de papel virou o elemento estrutural.** No material ele
     aparece três vezes: dentro do símbolo, na ponta do fio que divide o
     cabeçalho e no lockup de cada submarca. É a assinatura gráfica do
     grupo, então é ele que marca direção na folha — desenhado como máscara,
     em duas faces com alfas diferentes para dar a dobra do origami, tomando
     a cor do contexto. Usado em dois lugares só: o lockup e o fio da capa.
     Avião em todo canto vira enfeite, e enfeite é o contrário de assinatura.

152. **A paleta passou a conversar com o material,** que é preto e ouro
     metálico. O papel saiu do viés verde-cinza para um neutro levemente
     quente (`#f1f0ec`), a tinta acompanhou, e o `--ferro` deixou de ser
     verde-escuro para ser o preto da marca (`#111110`). O ouro virou rampa
     metálica de três paradas — alta luz, corpo e sombra —, como no impresso.

153. **As submarcas com o nome e a assinatura do material:** PGE **Lab**
     ("Inteligência que gera resultado."), A! Multiplicadora ("Processos
     autogerenciáveis."), A! Start Talk, A! Saúde, A! Treinamentos e A!
     Fatorial Representações ("Conexões que geram oportunidades."). O campo
     `assina` entrou em `MARCAS` e aparece onde a marca é apresentada.

154. **Contraste medido de novo depois da troca de paleta:** 165 trechos no
     guia, nenhum reprovado; no site sobram os três apontamentos de fundo em
     gradiente, que no pixel renderizado dão 14,0 a 16,2:1.

**Ainda pendente:** o símbolo real é um A! manuscrito com o avião saindo
dele, e só existe como imagem achatada. Enquanto o vetor não chega, o selo
usa o A! tipográfico no ouro metálico. O ponto de troca está pronto: basta
pôr um `<img>` dentro de `.af-selo` — o CSS já o acomoda.

## Arquivo único e o lockup da marca — versão 0908.06

155. **O site não estava sendo visto.** Ela abriu o `index.html` numa pasta do
     Desktop sem o `a-fatorial.css` ao lado e a página apareceu crua — links
     azuis sublinhados, Times, sem cor nem layout. Todo o redesenho estava
     invisível. Culpa da entrega em arquivos separados, não do design.

156. **Cada página do site virou arquivo único.** O `a-fatorial.css` continua
     sendo a fonte de verdade, e o `montar.py` o embute no `index.html` e no
     `marca.html`. Provado numa pasta com um arquivo só: zero requisições,
     quatro fontes carregadas, layout inteiro de pé.

157. **O lockup da marca substituiu o nome escrito** em todo lugar do site e
     do sistema — cabeçalho, rodapé, login, folha da empresa, barra lateral,
     tela de entrada e cadastro público. Reproduz a estrutura do material
     impresso: "Grupo" na voz manuscrita, A! FATORIAL pesado, assinatura
     embaixo, avião ao lado.

158. **O ouro do lockup obedece à regra dos dois papéis.** Sobre papel claro o
     "A!" usa o ouro que se lê e "FATORIAL" usa tinta, porque o ouro da marca
     sobre papel rende 2:1 e some; sobre preto entra a rampa metálica inteira,
     como no impresso. Medido no pixel: 16,3:1 no cabeçalho, 13,0:1 no rodapé.

159. **As seis submarcas entraram na seção das marcas** — PGE Lab, A!
     Multiplicadora, A! Start Talk, A! Saúde, A! Treinamentos e A! Fatorial
     Representações —, cada uma com avião, nome e assinatura própria,
     divididas por fio, como na barra inferior do material impresso.

160. **O símbolo manuscrito não foi para o ar.** Tentei redesenhá-lo a partir
     da imagem em duas construções (elipse dupla e traço único) e as duas
     saíram erradas — a segunda vira um sigma grego. Logo aproximado é pior
     que logo ausente, então fica o avião, que é elemento real da marca e que
     dá para desenhar com fidelidade. O ponto de troca está pronto em
     `.af-marca-s`.

161. **Duas colisões de cascata corrigidas:** `.side-brand span` vinha depois
     do lockup e transformava "Grupo" em caixa alta; e a assinatura da marca,
     em `white-space:nowrap`, empurrava a folha estreita 9px além da tela no
     celular.
