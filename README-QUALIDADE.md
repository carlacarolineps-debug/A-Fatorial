# Qualidade da Embalagem — Grupo Rebracil

Sistema do setor de **Qualidade** (arquivo único `qualidade.html`, sem build, JavaScript puro).
Abra o arquivo no navegador para usar. Segue o **padrão visual do NEXUS GRB** (sistema
financeiro do grupo): paleta **azul-marinho `#191040` + dourado `#c5a880` + branco**,
fontes Inter/Space Grotesk (com degradação para fontes do sistema se estiver offline).

## Acesso (Login → Hub → Painel)

O sistema abre numa **tela de login**. Depois entra no **Hub** (portal de seleção de
painel, no estilo do NEXUS): cada setor do grupo é um card. Hoje só o card **Qualidade**
está ativo (com KPIs ao vivo); Impressão, Corte e Solda, Expedição e Grupo/Consolidado
aparecem bloqueados ("em breve"), prontos para quando os demais setores forem englobados.

**Usuários** (login pelo primeiro nome ou nome completo; definidos em `usuariosSeed`):

| Usuário | Senha | Cargo |
|---------|-------|-------|
| `carla` (Carla Caroline) | `admin` | Desenvolvedora |
| `michel` (Michel Pereira) | `admin26` | Coordenador da Qualidade |
| `andreia` (Andreia Pereira) | `admin123` | Gerente |

Os logins são configuração fixa: ao atualizar o arquivo, eles são sempre re-sincronizados
(não ficam presos ao que estava salvo no navegador).

## Padronização visual (padrão NEXUS)

O sistema segue o mesmo padrão do **NEXUS GRB** (financeiro): sidebar escuro com gradiente
e brilho, seções em dourado, item ativo com realce sutil, **header com fio dourado no topo**,
cards com barra de acento e ícones de **linha**. Identidade única — azul-marinho `#191040`,
dourado `#c5a880`, branco e as cores semânticas (azul-royal, teal, âmbar, rose).

**Ícones:** são **SVG embutidos** (renderizados a partir de classes `fa-*` pelo `renderIcons`),
então funcionam **offline**, sem depender de CDN. Para trocar/adicionar um ícone, edite o mapa
`ICONS` no script.

**Gráficos:** módulo SVG próprio (sem bibliotecas), com eixos, gridlines, uma cor por série,
tooltips no hover e paleta categórica validada (CVD-safe). Formas: `svgLinhaArea` (tendência),
`svgPareto` (causas), `svgBarrasH` (RNC/entregas), `svgColunas`, `svgDonut`. Cores em `COR`/`CAT`.

**Exceção proposital:** as **fichas/documentos** (Corte e Solda, Impressão, NC, Devolução,
Clichê) mantêm suas **cores próprias de impressão** (azul, âmbar, vermelho, etc.), que
identificam cada tipo de documento no papel.

A sessão é lembrada (chave `rb_qualidade_sessao`), então recarregar a página não força
novo login. Use **Trocar Painel** (no topo) para voltar ao Hub e **Sair** (menu do perfil)
para encerrar a sessão.

## Objetivos do sistema

1. **Reduzir retrabalho** — registro de cada ocorrência com causa raiz, custo estimado e destino da correção.
2. **Otimizar entregas para outros setores** — fila de envios com prazo combinado, confirmação de recebimento e índice de entregas no prazo (OTIF).
3. **Análise estratégica para a diretoria** — indicadores visuais e relatório executivo em PDF para tomada de decisão.

## Telas

| Tela | O que faz |
|------|-----------|
| **Login / Hub** | Autenticação e portal de seleção de painel (departamentos do grupo, no padrão NEXUS). |
| **Central de Comando** | Tela inicial. O sistema lê tudo e entrega **decisões ranqueadas com ação de um clique** (ver abaixo). |
| **Dashboard** | KPIs, alertas, atividades, **donut Produção por Setor** e o **Histórico Geral** com o *cockpit da ficha*. |
| **Produção (Fila & Calendário)** | Fila e calendário juntos. Clicar num card abre ações: **Imprimir OP, Reagendar, Liberar Setup, Interromper Setup**. |

## Central de Comando (o cérebro operacional)

Tela inicial do sistema. Em vez de só *mostrar* dados, ela **decide e conduz**:

- **Frase de situação** — o sistema lê a operação e escreve, em português, o estado atual
  e por onde começar ("Comece por: …").
- **Fila de decisões** — tudo que exige o gestor, **ordenado por urgência/impacto**, cada
  item com **ação de um clique**: aprovar ficha, priorizar atrasada, tratar RNC, enviar ao
  setor, concluir/reagendar entrega vencida. Resolver uma decisão encadeia a próxima.
- **Modo Coordenação** — quando **não há pendências de correção**, a Central não fica só
  dizendo "tudo certo": ela vira uma **agenda proativa** que direciona o Coordenador a
  **coordenar a área e implantar melhorias** — revisar parâmetros/tolerâncias do POP,
  abrir plano de melhoria para a maior causa de retrabalho (ou treinar a equipe, quando não
  há retrabalho), coordenar a fila/entregas da semana, homologar fornecedores, enriquecer a
  base cadastral e auditar rastreabilidade/acessos. Cada frente tem atalho de um clique.
- **Riscos & leitura estratégica** — causa recorrente (Pareto), tendência, potencial de
  economia e OTIF, calculados automaticamente.
- **Últimas ações** — trilha do que foi feito.

Funções: `renderComando`, `computarDecisoes`, `comandoAprovar`, `comandoConcluirEntrega`,
`comandoReagendarEntrega`. Reaproveita o cockpit e o fluxo de envio.

> **Nota sobre "substituir o quadro":** esta versão é um **protótipo de navegador**
> (um arquivo, dados no `localStorage`). Ele demonstra a inteligência e o fluxo que
> automatizam o trabalho manual de monitorar, priorizar, analisar e rotear. Para de fato
> reduzir mão de obra em produção, o próximo passo é ligar a um **backend/ERP e às
> máquinas** (dados reais, multiusuário, tempo real) — a lógica de decisão criada aqui é a
> mesma que rodaria lá.

## Motor de Qualidade — Inspeção & Liberação de Setup (POP-QUA-001)

O sistema **decide sozinho** o que hoje ocupa o inspetor. Baseado no procedimento oficial
(POP-QUA-001), replica a tríade de cada etapa: *Ficha de Parâmetros → Liberação de Setup →
Registro de Inspeção*.

- **Parâmetros de Qualidade** — os critérios/tolerâncias por etapa (Recebimento MP, Impressão,
  Laminação, Rebobinadeira, Narita, Corte e Solda), com a **chave de aprovação automática** e a
  **margem de atenção** (borderline). Seeds vindos do POP e das fichas (`RB.criterios`, `RB.configQ`).
- **Inspeção & Setup** — escolhe a etapa e informa medidas/observações. O motor compara com o
  padrão e decide na hora:
  - **Tudo conforme** → *libera o setup / aprova a inspeção automaticamente* (sem humano).
  - **No limite** → escala para conferência na Central de Comando.
  - **Fora do padrão** → *abre RNC automaticamente* e escala.
  Cada registro fica em `RB.inspecoes`, com indicador de **% resolvido pelo sistema**.
- **Central de Comando** mostra quanto o sistema resolveu sozinho e traz as exceções (conferir)
  como decisões de 1 clique.

Funções: `renderInspecaoView`, `avaliarNum`, `vereditoGeral`, `registrarInspecao`,
`renderParametros`, `computarDecisoes` (exceções), `comandoConferirInspecao`.

## Cockpit da ficha (hover + drawer)

No **Histórico Geral de Fichas**, cada linha é interativa:

- **Passar o mouse** mostra um *card flutuante* com o resumo da ficha (produto, cliente,
  setor atual → próximo, responsável, atualização e retrabalhos vinculados).
- **Clicar** abre o **drawer lateral** (cockpit) que reúne, num só lugar:
  - **Próxima ação recomendada** — o sistema sugere o próximo passo conforme o status
    (aprovar, enviar ao setor, priorizar se atrasada, etc.).
  - **Resumo** e **retrabalhos vinculados** (com custo somado).
  - **Alterar status** por um clique (Rascunho → Aguardando → Aprovado → Concluído).
  - **Enviar ao setor**, **registrar retrabalho** direto na ficha, **editar** ou **imprimir**.
  - **Observação rápida** que entra no histórico.
  - **Timeline** cronológica de tudo o que aconteceu com a ficha (status, retrabalhos,
    entregas, notas).

  Fecha no X, clicando fora ou com **Esc**. Funções: `abrirDrawer`, `proximaAcaoReco`,
  `drawerMudarStatus`, `drawerSalvarRetrabalho`, `drawerAddNota`, `hoverFicha`.
| **Retrabalho & Entregas** | Registro rápido de retrabalho (causa raiz + custo) e de envios a outros setores; KPIs do mês e histórico. |
| **Indicadores** | 4 gráficos SVG (sem bibliotecas): tendência mensal de retrabalho, Pareto de causas, RNC por fornecedor e entregas por setor — com leitura estratégica automática. |
| **Relatórios** | Relatório executivo com período selecionável, KPIs, gráficos e recomendações; botão **Exportar PDF (Diretoria)**. |
| **Ficha de Parâmetro** | Acordeão na ordem **Ficha Única → Solicitação de Clichê → Impressão → Laminação → Corte & Solda → Rebobinadeira → Não Conformidade → Devolução**. **Cliente e Produto são campos de digitação com autocomplete** da base: se já existe, aparece para selecionar (e o código do produto preenche sozinho); se não existe, o sistema **cadastra na hora** (produto já vinculado ao cliente da ficha) e segue, sem prender o usuário em nenhuma etapa. O **Fluxo de Processos** é marcado por **etapas ticáveis** (chips), não mais texto livre. |
| **Ficha Única (teste)** | **Um documento com todas as etapas**: marque no Fluxo de Processos quais etapas o produto passa (Clichê, Impressão, Laminação, Rebobinadeira, Corte & Solda, Expedição) e **só as seções marcadas se abrem** para preencher. As seções **já vêm pré-carregadas com a receita modelo** (as informações aproximadas da realidade das fichas individuais) — você preenche uma vez só o que é do pedido (cliente, produto, código) e ajusta apenas o que muda. Cada seção mostra progresso (`preenchidos/total`), há um **resumo vivo** (etapas, % preenchido, fluxo na ordem do POP) e **nenhum campo se perde**: tudo é serializado na ficha (`dados`) e restaurado ao reabrir. Ao digitar um produto que já tem Ficha Única, o sistema **oferece carregar os parâmetros da última versão**. Ao salvar, a ficha entra no fluxo com setor = 1ª etapa e próximo setor = 2ª etapa. Funções: `salvarFichaUnica`, `fuCarregarFicha`, `fuChecarAnterior`, `fuToggleEtapa`, `fuAtualizarResumo`. |
| **Impressão por etapa** | O lançamento é um só (Ficha Única), mas a **impressão sai fragmentada**: o botão **Imprimir Instruções de Trabalho** (ou o PDF da barra de ações) abre um seletor com as etapas marcadas e gera **um documento por etapa** — instrução de trabalho para o operador daquele setor, com timbre Rebracil, dados do produto, o **fluxo completo com a etapa atual destacada**, os parâmetros da etapa, observações gerais e campos de assinatura (Operador / Liberação de Setup / Data). **Formato A4 sem cortes**: `@page` A4 com margens seguras, tabelas de layout fixo com quebra de palavra (nada estoura a folha) e linhas/blocos protegidos contra quebra no meio (`page-break-inside: avoid`). **Pré-visualização antes de imprimir**: o botão "Visualizar impressão" abre as folhas A4 na tela exatamente como sairão no papel (rótulo "Folha X de N · Etapa · Código · Operador" em cada uma) com "Voltar e ajustar" e "Imprimir" — nada vai à impressora sem conferência (Esc também fecha). Funções: `fuAbrirPrint`, `fuImprimir` (gera + pré-visualiza), `fuPreviewImprimir`, `fuCamposDaSecao`, `imprimirDocumento`. |
| **Cobertura completa de campos** | As seções da Ficha Única contêm **todos os campos das fichas individuais** (156 campos): Clichê (vínculo, materiais, dimensões, especificações técnicas, cores, observações), Impressão (MP e bobina base, configuração de clichê/máquina, receita de temperaturas e tensões, **tabela de tintas por 6 estações** com viscosidade/secagem/anilox/BCM/dupla face, auto-controle da bobina), Laminação (adesivo completo com vida útil, estufas 1/2, cilindro, pressões e tensões, cura, controles), Rebobinadeira (dimensional completo, tolerância, velocidade/tensão, controles de bobina), Corte & Solda (máquinas autorizadas, bobina de entrada, solda, **sensores, fotocélula e cames**, dispositivos e contra-pressões, características da embalagem) e Expedição (pacote/fardo/caixa/palete/peças/peso). Tudo serializado e restaurado. |
| **Regras de Código por Etapa** | Em **Configuração → Regras de Código (sufixos)**: a cada etapa o código do cliente ganha um sufixo — ex.: `VCM-7505L` (Laminação), `VCM-7505I` (Impressão), `VCM-7505MP` (Recebimento). CRUD completo (criar, editar, excluir a qualquer momento) com **vigência programável** ("vale a partir de"): regras com data futura ficam **Programadas** e entram em vigor sozinhas no dia marcado; a regra vigente é a de vigência mais recente que já começou (`Ativa`), e as anteriores ficam `Substituídas`. Os códigos por etapa aparecem **na tela** (selo no título de cada seção da Ficha Única) e **nas Instruções de Trabalho impressas**. Tudo auditável/desfazível. Funções: `sufixoEtapa`, `codigoEtapa`, `renderRegrasCodigo`, `salvarRegraCodigo`. |
| **Cadastros Base** | Clientes, Fornecedores, Produtos, Clichês e Setores. |

## Persistência

Tudo fica salvo no navegador em `localStorage`, chave **`rb_qualidade_v1`**
(`fichas`, `retrabalhos`, `entregas`, `atividades`). Nada se perde ao recarregar.
Na primeira abertura o sistema é semeado com dados históricos de demonstração
(marcados com `demo: true`) para os indicadores nascerem com leitura — os
registros reais entram por cima e podem substituí-los (exclua os demo pela tela
Retrabalho & Entregas).

## Próximos passos combinados

- Englobar os demais setores (Impressão, Corte e Solda, Expedição) — o seletor
  de departamento no topo já está preparado para isso.
- Dashboard consolidado separando os departamentos.

## Onde mexer no código (`qualidade.html`)

- **Login / sessão / hub**: `usuariosSeed`, `DEPARTAMENTOS`, `fazerLogin`, `logout`,
  `entrarDepto`, `irParaHub`, `renderHub`, `podePainel`, `iniciarSessao` (sessão em
  `rb_qualidade_sessao`). Para ativar um novo setor, marque `ativo: true` no `DEPARTAMENTOS`.
- **Persistência**: `RB_KEY`, `rbLoad`, `rbSave`, `rbSeedRetrabalhos`, `rbSeedEntregas`.
- **Retrabalho / entregas**: `registrarRetrabalho`, `registrarEntrega`, `entregaConcluir`, `renderRetrabalhoView`.
- **Gráficos SVG**: `svgBarrasV`, `svgBarrasH`, `svgPareto`, `CORES`.
- **Indicadores / insights**: `renderIndicadores`.
- **Relatório da diretoria**: `renderRelatorio`, `imprimirRelatorio` (classe `print-mode-relatorio`).
- **Paleta**: variáveis CSS `--primary` (azul), `--gold` / `--gold-deep` / `--gold-soft` (dourado).

## Cadastros, importação, rastreabilidade e usuários (v2 — base zerada)

O sistema inicia **zerado** (chave `rb_qualidade_v2`). Todas as coleções são geridas no
navegador e podem ser povoadas por cadastro ou importação.

- **Cadastro inline na ficha** — nos selects de Cliente/Produto da ficha há a opção
  **“➕ Cadastrar novo…”**: abre um modal, grava **na hora** no banco e já seleciona o item,
  sem sair da ficha. Funções: `abrirQuickCad`, `salvarQuickCad`, `fichaClienteChange`,
  `fichaProdutoChange`, `renderClienteSelects`.
- **Cadastros Base dinâmicos** (Clientes, Fornecedores, Produtos, Clichês, Setores) —
  CRUD completo com busca; cada ação gera auditoria. `cadSalvar`, `cadExcluir`, `cadEditar`.
- **Configuração → Importar** — sobe base de outro sistema. **CSV** funciona offline;
  **XLSX/XLS** via leitor carregado sob demanda (precisa de internet). Reconhece as colunas
  dos arquivos oficiais (Fornecedores: Razão social, CNPJ, IE, Cidade, UF; Produtos: Código,
  Descrição, Tipo, NCM, Unidade, Ativo) e mostra **prévia antes de gravar**. Botão **Zerar base**.
  Funções: `parseCSV`, `mapearLinhas`, `importPreview`, `importConfirmar`, `zerarBase`.
- **Auditoria / Rastreabilidade** (Gestão → Auditoria) — registra usuário, data/hora,
  dispositivo e fuso de cada cadastro/edição/exclusão/importação, com **Desfazer**.
  IP real e geolocalização virão do backend em produção. `registrarAuditoria`, `desfazerAcao`.
- **Usuários e Acessos** (Configuração) — CRUD de usuários com papel, senha, status e
  **painéis liberados**; preparado para o RH futuro alimentar as pessoas. `renderUsuarios`,
  `salvarUsuario`, `usrEditar`, `usrExcluir`.
- **Menu em cascata** — Cadastros Base, Gestão e Configuração são acordeões (como
  Ficha de Parâmetro).

## HUB multi-setor — Comercial e RH (encadeamento entre setores)

O portal (HUB) agora abre **3 painéis ativos**, cada um com sua navegação:

- **Comercial** — *Pedidos & Propostas*. Usa os cadastros compartilhados (clientes/produtos,
  com “➕ novo” inline). O botão **Enviar à Qualidade** cria a ficha na fila da Qualidade
  (o passo 6.1 do POP — Recebimento e Análise do Pedido) e ela aparece na Central de Comando
  da Qualidade como decisão. Funções: `renderComercialPedidos`, `salvarPedido`, `enviarPedidoQualidade`.
- **Qualidade** — o painel completo já existente.
- **RH** — *Colaboradores*. Cadastro de pessoas; o botão **Gerar acesso** cria o usuário e as
  permissões no sistema (login, senha, papel e painel conforme o setor) — fechando o ciclo
  RH → Usuários/Acessos. Funções: `renderRHColaboradores`, `salvarColaborador`, `gerarAcesso`.

Navegação por departamento: `mostrarNavDepto` troca o menu lateral (blocos `navd-*`) e o rótulo
do logo conforme o painel; `entrarDepto` aterrissa na tela-home de cada setor. Os dados fluem
entre setores pelo mesmo banco (`RB`), demonstrando a arquitetura integrada do grupo.
