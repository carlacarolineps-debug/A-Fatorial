# A! Fatorial — Sistema de Gestão (Arquitetura de Lucro)

Aplicação de página única (um arquivo `index.html`, sem build, JavaScript puro).
Abra o arquivo no navegador para usar.

## Acessos (tela de login)

| Perfil | Entra vendo | Pode acessar (padrão) |
|--------|-------------|------------------------|
| **Admin / Gestão** | Gestão à vista | Todas as telas |
| **Colaborador** | Portal do colaborador | Portal do colaborador, **Esteira comercial** e **Propostas e rastreio** |
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
25. **Fluxos que funcionam de verdade e direcionam (esteira, colaborador, cliente)**
    Resposta ao feedback "não quero ficar perdida": cada ação agora leva a pessoa
    para o lugar certo, com aviso visual (toast) do que aconteceu e do próximo passo.
    - **Missão leva à ação**: ao aceitar (ou clicar "▶ Fazer agora" numa missão
      ativa), o sistema navega direto para a tela onde a missão é feita — DISC,
      traços, dossiê, objetivos, PDI, competências, trilha. `MISSOES_LIB.ir`,
      `colAceitarMissao`, `colMissaoIr`, `COL_IR_LABEL`.
    - **Próximos passos clicáveis**: no painel do colaborador, cada etapa da jornada
      e cada "próximo passo sugerido" é um botão que abre a tela certa. Inclui
      atalho **"Editar meu perfil"** (foto/apelido) → `meuPerfilAbrir`.
    - **Documentos do cliente que abrem de verdade + campo de link/anexo**: novo
      visualizador de documento (`m-doc`) com **campo para incluir o link** do
      arquivo (Drive/PDF) e **anexar arquivo**. Os documentos padrão (Contrato
      social, Cartão CNPJ, RG/CPF, Comprovante, proposta, contrato, entregáveis)
      abrem para visualizar/aprovar; as pendências do portal abrem o documento
      antes de aprovar/assinar. `docAbrir`, `docAbrirPadrao`, `docConfirmarPadrao`,
      `docViewerHTML`, `ptVerDoc`, `DOC_PADRAO`.
    - **Feedback guiado**: `toast()` mostra "o que aconteceu / para onde você foi".
    - **Layout que respeita o card**: `.grid>*{min-width:0}` + quebra de palavra
      evitam sobreposição; breakpoints (1024px/680px) empilham os cards no tablet e
      no celular em vez de espremer.
26. **Esteira completa, entregáveis selecionáveis e caminho guiado do cliente**
    - **Campo "Plano de pagamento" legível**: o preview ficava branco-no-branco no
      tema escuro porque o seletor de atributo deixava de casar quando o JS mexia no
      `display`; agora há override por id (`#f-plano-preview`, `.sens`, `#f-online-box`).
    - **Caixa "tarefa concluída → próxima"**: ao concluir uma missão ou avançar uma
      etapa da esteira, abre um modal dizendo qual é o próximo passo, com **botão de
      ação** que leva direto até ele. `caixaProxima`, `estProxCaixa`, modal `m-prox`.
    - **Entregáveis padrão selecionáveis na esteira**: catálogo `ENTREGAVEIS_PADRAO`
      com checklist no cadastro; o consultor marca o que **aquele cliente** recebe
      (com "✨ Sugerir pelos serviços" e entregáveis personalizados). A escolha vira
      as tarefas em `criarEntregaveis` e aparece na conferência. `renderEntregaveisCatalogo`,
      `entregaveisSelecionados`, `entregaveisSugerir`, `deal.entregaveisSel`.
    - **Caminho guiado do cliente, na ordem certa**: card "Seu caminho — siga na
      ordem" no portal: 1) acessar e aprovar a proposta → 2) anexar documentos →
      3) assinar contrato → 4) pagar → 5) confirmar onboarding → 6) avaliar
      entregáveis → 7) avaliar satisfação. Cada passo mostra concluído/atual/🔒 e só
      o atual é acionável. `renderPortalRoteiro`, `ptPagar`, `ptAnexarDocumentos`.
    - **Ordem realmente respeitada (não só visual)**: não dá para assinar o contrato
      sem anexar os documentos, nem pagar sem o contrato assinado — se tentar fora de
      ordem, o sistema avisa e leva ao passo certo. Quando todos os documentos chegam,
      a equipe é avisada de que o contrato pode ser validado. `portalDocsCompletos`,
      `portalContratoAssinado`, guards em `ptAssinarContrato`/`ptEnviarComprovante`.
    - **Aprovar a proposta já libera pagamento e contrato** (sem duplicar receita):
      `garantirRecebiveis` / `garantirContratoDoc`; `estPagamento` lança a DRE uma
      única vez (`deal.financeiroLancado`). `gerarParcelas` agora usa o snapshot do
      deal (`entrada`, `planoParc`, `entradaDt`, `pgStatus`) e não depende do formulário.
    - **Robustez**: ações do cliente guardadas contra `deal` ausente/divergente.

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
- **Usuários / acessos**: `ADMIN_USER`, `normalizaUsuarios`, `salvarUsuarios`,
  `renderUsuarios`, `usuarioSalvar`, `colaboradorNovo` (persistência em
  `localStorage` chave `af_usuarios`; em produção, isso vai para o backend).
- **Documentos do cliente (visualizar + link/anexo)**: modal `m-doc`, `docAbrir`,
  `docAbrirPadrao`, `docRender`, `docViewerHTML`, `docSalvarLink`, `docAnexar`,
  `docConfirmarPadrao`, `ptVerDoc`, `DOC_PADRAO`. Em produção, o upload de arquivo
  (`docAnexar` lê como dataURL) deve ir para storage do backend.
- **Missões que direcionam**: `MISSOES_LIB` (campo `ir`), `COL_IR_LABEL`,
  `colAceitarMissao`, `colMissaoIr`.
- **Feedback guiado / toasts**: `toast()` + bloco CSS `TOAST / FEEDBACK GUIADO`.
