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

| Usuário | Senha | Papel |
|---------|-------|-------|
| `carla` (Carla Caroline) | `admin` | Admin |
| `michel` (Michel Pereira) | `admin26` | Admin |
| `andreia` (Andreia Pereira) | `admin123` | Admin |

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
| **Dashboard** | KPIs, alertas, atividades e o **Histórico Geral** com o *cockpit da ficha* (ver abaixo). |

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
| **Fichas de Produção** | Corte e Solda, Impressão, Solicitação de Clichê, NC Fornecedor e Devolução (com etiqueta e impressão). |
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
