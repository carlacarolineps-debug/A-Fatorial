# Qualidade da Embalagem — Grupo Rebracil

Sistema do setor de **Qualidade** (arquivo único `qualidade.html`, sem build, JavaScript puro).
Abra o arquivo no navegador para usar. Paleta: **azul, dourado e branco**.

## Objetivos do sistema

1. **Reduzir retrabalho** — registro de cada ocorrência com causa raiz, custo estimado e destino da correção.
2. **Otimizar entregas para outros setores** — fila de envios com prazo combinado, confirmação de recebimento e índice de entregas no prazo (OTIF).
3. **Análise estratégica para a diretoria** — indicadores visuais e relatório executivo em PDF para tomada de decisão.

## Telas

| Tela | O que faz |
|------|-----------|
| **Dashboard** | KPIs de fichas, alertas, atividades e histórico geral (tabela de retrabalho lê os registros reais). |
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

- **Persistência**: `RB_KEY`, `rbLoad`, `rbSave`, `rbSeedRetrabalhos`, `rbSeedEntregas`.
- **Retrabalho / entregas**: `registrarRetrabalho`, `registrarEntrega`, `entregaConcluir`, `renderRetrabalhoView`.
- **Gráficos SVG**: `svgBarrasV`, `svgBarrasH`, `svgPareto`, `CORES`.
- **Indicadores / insights**: `renderIndicadores`.
- **Relatório da diretoria**: `renderRelatorio`, `imprimirRelatorio` (classe `print-mode-relatorio`).
- **Paleta**: variáveis CSS `--primary` (azul), `--gold` / `--gold-deep` / `--gold-soft` (dourado).
