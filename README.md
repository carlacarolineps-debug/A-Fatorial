# A! Fatorial — Sistema de Gestão (Arquitetura de Lucro)

Aplicação de página única (um arquivo `index.html`, sem build, JavaScript puro).
Abra o arquivo no navegador para usar.

> **Sistemas neste repositório**
> - `index.html` — **A! Fatorial** (gestão comercial/financeira, tema neon).
> - `rebracil.html` — **NEXUS GRB** (motor de decisão financeira do Grupo Rebracil).
>   Documentado na seção [NEXUS GRB — Hub de Empresas](#nexus-grb--hub-de-empresas-rebracilhtml) abaixo.
> - `rebracil-offline.html` — **mesma coisa que `rebracil.html`, porém 100% offline**:
>   Tailwind, Alpine, Chart.js, xlsx, Font Awesome e as fontes ficam **embutidos no
>   próprio arquivo** (não depende de internet/CDN). Ideal para pen drive, rede
>   isolada ou uso sem conexão. Gerado a partir do `rebracil.html` — mantenha o
>   `rebracil.html` como fonte e regere o offline quando mudar algo.

---

## NEXUS GRB — Hub de Empresas (`rebracil.html`)

Motor de decisão financeira do Grupo Rebracil, agora em formato **hub multiempresa**:
cada empresa é uma **conta independente dentro do mesmo "banco" de dados**, com o
**mesmo visual** e a mesma moldura. Nada da Requalificadora foi perdido — ela continua
100% igual; a Embalagem entrou como uma segunda conta.

### Contas cadastradas
| Conta | Setor | Fonte dos dados |
|-------|-------|-----------------|
| **Rebracil Requalificadora** | Requalificação de recipientes de GLP (P13/P20/P45) | dados originais do NEXUS |
| **Rebracil Embalagens** | Impressão e conversão de embalagens flexíveis | `Resultado_Embalagem_2026.xlsx` |

### Login + painéis por departamento (informações separadas)
- **Tela de login** (como no acesso da Rebracil): usuário + senha. Usuários semente:
  `Carla Caroline / admin` e `Andreia Pereira / admin123`. Ao entrar, a primeira tela é o **Hub**.
  Funções `fazerLogin`, `logout`; estado `logado`, `usuarioLogadoId`.
- **Portal de seleção (tela cheia, sem menu)**: depois do login a primeira tela é um
  **portal** que serve só para escolher o painel — **não tem sidebar/menu**, apenas 3
  cartões (**Requalificadora**, **Embalagem**, **Grupo — Consolidado**). O menu lateral
  só aparece **depois** que você entra num painel (o app-shell tem `x-show="logado && depto"`).
  Cada painel é um departamento independente que **vê somente as suas informações**;
  o menu muda conforme o painel ativo (`depto`). Método `entrarDepto`, botão “Trocar
  painel (Hub)” volta ao portal.
  - **Requalificadora** (individual): Dashboard, DRE, C.C., Despesa Mensal, Provisões,
    **Comparativo Histórico (2017–2025)**, **Carteiras de Capital** — conceitos que são
    só dela; **sem** kg/fator/peso.
  - **Embalagem** (individual), menu próprio focado em kg: Dashboard,
    **Faturamento & Fator (R$/kg)**, **Sub-empresas & Tributação**, **Inventário & ITP**,
    DRE, C.C., Despesa Mensal, Provisões — **sem** Carteiras/Histórico da Requalificadora.
    Só a Embalagem tem peso, fator, kg, custo/kg e margem/kg.
  - **Grupo — Consolidado** (o único que junta tudo): Central do Grupo, Comparador
    (mensal + anual), Tendência & Projeção (com seletor de empresa), Simulador (What-if,
    DRE com régua por centro de custo).
- Nenhuma informação se mistura entre Requalificadora e Embalagem; o consolidado é o
  único ponto que combina as empresas.

### Visual premium + estrutura de 3 painéis
- **Tema premium** (azul-marinho, dourado e branco + brilho roxo, conforme a marca):
  sidebar escura com item ativo em destaque, cards em vidro, tipografia/sombras/raios
  modernos e réguas douradas. Aplicado via camada CSS (`#nx-modern`) que cascateia
  para todas as telas — o **raciocínio da Requalificadora não muda**, só o visual.
- **Hub = 3 painéis**: **Grupo (Visão Geral)**, **Requalificadora** e **Embalagem**,
  com um seletor **Visão Geral (Grupo) | Individual (Empresa)** para escolher como
  enxergar os números. O hub é a tela-antes-de-entrar: veja o resumo e decida abrir o
  painel completo ou o detalhe (drawer).
- **Menu dividido** em **Visão Geral — Grupo** (Hub, Central, Comparador, Tendência,
  Simulador) e **Empresa — Individual** (Dashboard, Faturamento & Fator, DRE, C.C.,
  Despesa Mensal, Provisões, Histórico, Carteiras).
- As **sub-empresas da Embalagem** — Linear, Teste, Teste X e Inter Company — são
  estratégia tributária (uma vende para a outra conforme o regime: Simples/Lucro
  Presumido) e aparecem **dentro da Embalagem** (não são painéis próprios). Teste
  Sucata = aparas (Hanami); ITP = itens de terceiros (decisão de produzir vs. comprar).

### Central de Inteligência — o sistema pensa pelo analista
No topo (ícone de cérebro, com contador) abre um painel deslizante que **lê os números
sozinho** e entrega alertas acionáveis, sem depender da memória de quem analisa:
- **Prejuízo no mês**, **salto de despesa** mês contra mês (com o % e o porquê provável),
  **margem apertada**, **concentração de despesa** num único grupo, e **projeção do ano
  pelo ritmo atual** (run-rate) — cada um com severidade, explicação e **botão que leva
  direto à tela** para agir.
- **Embalagem**: alerta de **fator abaixo do custo por kg** (prejuízo por quilo) e de
  margem/kg estreita.
- **Grupo (Consolidado)**: empresas **no vermelho após o rateio da matriz**
  (rentabilidade real), **risco de concentração** de faturamento, maior bloco de custo
  do grupo e a empresa mais rentável (oportunidade a replicar).
- No **Dashboard**, cada KPI de Faturamento e Despesa mostra a **variação vs. o mês
  anterior** (▲/▼ %, com cor invertida para custo) — momentum na hora.

### Menu enxuto e navegação sem redundância
- **Uma única forma** de trocar de painel: o cartão **“Painel ativo”** na sidebar é o
  próprio botão de troca (some o botão duplicado e o item “Hub” repetido no menu e no topo).
- **Logo do cliente** de volta no topo da sidebar (placa clara, com brasão de reserva).
- **Menu de perfil** (Meus Dados, Editar Perfil & Foto, Configurações, Sair) refeito em
  tema escuro premium e **sem corte** — abre inteiro abaixo do avatar.
- Rodapé “**Powered by Grupo A! Fatorial**” discreto no lugar do texto antigo.

### Tela cheia + resumo que abre ao clicar (análise mais confortável)
- **Tela cheia** em todo card com tabela: um botão de expandir (canto superior direito)
  abre a planilha ocupando **a tela inteira** (API nativa de fullscreen; `Esc` sai). Injeção
  automática via `montarTelaCheia()` — vale para DRE, Centro de Custo, Despesa Mensal,
  Faturamento, Sub-empresas, Inventário, Histórico e Consolidado. **Em tela cheia há uma barra
  superior** (`nxMontarBarraFS`) com o botão *Sair da tela cheia* e uma **régua de meses de
  janeiro a dezembro** (pílulas 01.2026…12.2026) para trocar o recorte — inclusive em
  *Detalhamento C.C. - Mês*. A barra fica fixa no topo e empurra o conteúdo, sem sobrepor os
  botões do card; no modo normal o cabeçalho reserva espaço para o botão de expandir.
- **Resumo analítico** (estilo Horus): um painel **desliza da direita ao clicar em “Resumo”**
  (não é fixo, não ocupa espaço). Na tela **Sub-empresas** destaca faturamento/resultado/margem,
  fator médio, **quem realiza a margem**, a indústria que opera no zero, o Inter Company a
  eliminar e as aparas (getter `embResumo`, estado `showResumo`).
- **Sub-empresas** perdeu a coluna **Regime** (a informação de regime continua nos dados e no resumo).

### Conferência linha a linha com as planilhas do cliente (2026)
Auditoria completa contra `Resultado_Requalificadora_2026.xlsx` e `Resultado_Embalagem_2026.xlsx`:
- **Requalificadora:** DRE mensal (12 linhas) ✓ · Centro de Custo (**157 linhas**) ✓ · Provisões (8) ✓ ·
  Histórico 2017–2025 ✓ **após corrigir** *Total Despesas* e *Despesa Requalificadora* de 2024/2025
  para os valores da planilha atual (e o mesmo em `TENDENCIA_YOY`).
- **Embalagem:** DRE ✓ · Centro de Custo (**117 linhas**) ✓ · Faturamento por linha (6) ✓ · Inventário (4) ✓ ·
  Provisões ✓ (o *Realizado* vem dos lançamentos reais de centro de custo — confere com a planilha).
- **Total de Faturamento (Embalagem)** — em vez de nota de rodapé, o total é **auto-explicativo**:
  *Faturamento bruto (soma das linhas)* → *(−) Aparas (Teste Sucata)* → *Faturamento principal*
  (= valor da planilha), mais *Peso total (inclui aparas)* e *Fator médio (principal ÷ peso)*.
  Teste Sucata aparece normalmente como linha.
- **Inventário** virou **árvore mensal** (igual a Faturamento): *Valor* é a linha principal, *Peso (kg)* e
  *Fator (R$/kg)* são subcategorias; colunas seguem os meses. O total também é auto-explicativo —
  *Estoque bruto* → *(−) Tintas (fora do estoque avaliado)* → *Estoque total* (= planilha, R$ 2.517.068,58),
  espelhando exatamente a planilha do cliente.
- **Modelo mensal (jan..dez) em Faturamento e Inventário**: as colunas crescem conforme os meses são
  lançados; testado injetando um mês novo (março) — a coluna aparece sozinha, com bruto/principal/aparas
  corretos. Nenhuma tela fica presa a Jan/Fev.

### Painel da Embalagem — tudo por R$ / kg / fator / peso
A indústria de embalagem é medida por quilo, então o painel mostra as duas dimensões:
- KPIs de **Fator (Receita/kg)**, **Custo/kg** (despesa ÷ kg), **Margem/kg**, peso e resultado.
- **Faturamento & Fator por Linha de Produto — em árvore** (igual a Despesas por C.C.):
  o **Faturamento é a linha principal** de cada produto e **Peso (kg)** e **Fator (R$/kg)**
  são subcategorias que abrem/fecham, com **Expandir Todos / Recolher Todos**. As **colunas
  são os meses** e crescem de janeiro a dezembro conforme os dados são lançados — o modelo é
  mensal (`fat/kg/fator` por mês em `EMB_FATURAMENTO`), então **cada mês importado alimenta a
  coluna certa**. Fator recalculado de `fat ÷ kg` (fonte da verdade), com o valor da planilha
  como reserva. Getters: `fatMesesAtivos`, `fatRows`, `fatColTotal`, `fatTotalAcum`, `fatorLinha`.
- **Sub-empresas (estratégia tributária)**: Embalagem (Lucro Presumido), **Linear (Simples
  Nacional)**, Teste, Teste X e Inter Company — cada uma com faturamento, kg, fator, despesa,
  custo/kg, resultado, margem e **regime**. A leitura-chave: a *indústria* (Embalagem) opera
  perto do zero por kg e a **margem é realizada nas empresas de menor carga tributária** —
  planejamento tributário esperado. Dados em `EMB_SUBEMPRESAS`; getters `embSub`/`embSubTotais`.
- **Inter Company** marcada para eliminação na consolidação; **Teste Sucata = aparas (Hanami)**
  = receita de subproduto; **ITP** (itens de terceiros) sinalizado no inventário como base da
  decisão *make-or-buy*.

### Comparador — mensal e anual
O Comparador mostra os dois gráficos: **anual** (faturamento × despesa × resultado YTD) e
**mensal** (evolução mês a mês, com seletor Resultado/Faturamento/Despesa). Getter `serieMensal`.

### Simulador = DRE interativo com régua por centro de custo
O Simulador virou um **DRE ao vivo** com uma **régua (slider) por bloco de despesa**:
escolha a entidade (**Grupo**, **Requalificadora** ou **Embalagem**), ajuste a régua da
receita e o corte de cada centro de custo e veja o **resultado do período** e a
**projeção do ano (run-rate)** recalcularem na hora, com veredito. Getters `dadosEntidade`,
`simGruposDRE`, `simDRE`; ações `setCorte`, `resetSim`.

### Foco: análise financeira para decisão estratégica
O sistema é uma **visão financeira consolidada do grupo para decisões estratégicas**
(não operação — sem PDV/CRM/estoque). O grupo é tratado como um conjunto de empresas
no mesmo banco de dados, com uma **matriz** que concentra custos compartilhados.
- **Hub** *Grupo Empresarial Rebracil*: **medalha de ranking** (1º, 2º…) por
  faturamento, barra de **participação no grupo**, **Inteligência da Rede** (insights
  automáticos) e **Maiores Despesas do Grupo**.
- **Central do Grupo — Consolidado**: KPIs do grupo, **Rentabilidade Real por empresa**
  (lucro depois de ratear os custos da matriz), **Rateio de Custos da Matriz** (taxa
  configurável, padrão 5% s/ faturamento, salva em `nexus_taxa_rateio`), ranking e a
  consolidação por empresa.

### Análises de decisão estratégica
Seção **Decisão Estratégica** no menu:
- **Tendência & Projeção** (`projecao`): fecha o ano a partir dos meses já lançados,
  com três métodos (média dos meses, repetir último mês, crescimento composto %/mês);
  gráfico realizado × projetado (linha sólida vira tracejada) e tabela mês a mês.
  Getter `projecao`.
- **Comparador** (`comparador`): duas empresas lado a lado — faturamento, margem,
  **resultado real**, **fator R$/kg** e maiores blocos de despesa — com gráfico
  comparativo. Getters `ladoComparador`, `comparacao`.
- **Simulador (What-if)** (`simulador`): testa decisões sem alterar os dados —
  variação de faturamento (preço/fator/volume) e corte de um bloco de despesa — e
  mostra o impacto no resultado/margem, com **veredito automático**. Alvo: grupo
  consolidado ou uma empresa. Getters `simGrupos`, `simulacao`.
- **Drawer de detalhe** (drill-down estilo Horus) ao clicar numa empresa: KPIs,
  resultado real, insight, maiores despesas e **exportação CSV** do recorte.

### Drill-down (drawer) + inteligência da rede
Inspirado no padrão de *cards detalhados* do Horus:
- **Drawer de detalhe** (painel que desliza da direita) ao clicar em qualquer
  unidade (cartão do hub ou linha do ranking): mostra KPIs (faturamento, despesa,
  resultado, margem, participação, rateio), **insight automático**, tabela dos maiores
  grupos de despesa com % e **exportação CSV do recorte**, além de “Abrir painel
  completo”. Funções: `abrirDrawerEmpresa`, `fecharDrawer`, `drawerCSV`.
- **Inteligência da Rede** (hub): leitura automática do grupo — maior unidade, melhor
  rentabilidade, unidade com margem em risco, maior despesa e arrecadação de rateio.
  Getter `insightsRede`.
- **Maiores Despesas do Grupo** (hub): ranking dos maiores blocos de custo entre todas
  as unidades, clicáveis (abrem o drawer da unidade). Getter `topDespesasGrupo`.

### Como funciona o hub
- **Hub de Empresas** (tela inicial) — cartões-conta estilo "banco", cada um com
  faturamento, despesa, resultado e margem YTD; um clique abre o painel da empresa.
- **Seletor de empresa** na barra lateral e **botão "Hub"** no topo — troca de conta
  a qualquer momento sem sair de contexto. A conta ativa fica salva no navegador
  (`localStorage` → `nexus_empresa`).
- **Consolidado (Holding)** — soma todas as contas (faturamento, despesa, resultado,
  margem), com gráfico comparativo, participação no faturamento e tabela por empresa.
  Inclui alerta de **eliminação de operações Inter Company** na consolidação formal.
- Todas as telas originais (Dashboard, DRE, Despesas por C.C., Despesa Mensal,
  Provisões, Carteiras de Capital) passam a ler os dados da **conta ativa**.

### Novidade da Embalagem: **Faturamento & Fator (R$/kg)**
A indústria de embalagem é medida por quilo. A conta Embalagem ganha uma tela extra
(oculta para a Requalificadora) com:
- faturamento e **fator R$/kg por linha** (Embalagem, Linear, Inter Company, Testes);
- peso faturado e fator médio do mês;
- **inventário por categoria** (Produto Acabado, Em Processo, Tintas, Matéria-Prima)
  com valor, kg e fator de cada um.

### Fidelidade dos números (conferido)
Os totais batem com a planilha de origem, inclusive as definições próprias da
Embalagem (diferentes da Requalificadora):
- **Total de Despesas** = detalhe por centro de custo **+ linha `Ajustes`** (Linear e
  Testes não detalhados no pivô) → reconcilia exatamente ao valor da planilha.
- **Resultado com Inventário** da Embalagem = Resultado Operacional **+ Estoque total**
  do mês (modo `full`), enquanto a Requalificadora mantém o modo `diff` (diferença de
  estoque). Controlado por empresa via `invMode`/`estoqueBase` — sem afetar a Requalificadora.

### Onde mexer no código (`rebracil.html`)
- **Registro de contas**: `const EMPRESAS = {…}` e `ORDEM_EMPRESAS` — cada empresa aponta
  para seus datasets (`dre`, `historico`, `tendencia`, `previsoes`, `cc`, `extras`).
- **Dados da Embalagem**: constantes `EMB_*` (geradas de `Resultado_Embalagem_2026.xlsx`).
- **Troca de conta**: `carregarEmpresa(id)`, `trocarEmpresa(id)`, `empresaMeta`, `consolidado`.
- **Adicionar uma nova empresa**: crie as constantes de dados, adicione uma entrada em
  `EMPRESAS` e o `id` em `ORDEM_EMPRESAS` — ela aparece no hub, no seletor e no consolidado
  automaticamente.

---

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
