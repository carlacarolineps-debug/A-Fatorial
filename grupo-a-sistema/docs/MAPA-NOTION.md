# Mapa Notion → Prisma

Mapeamento das databases do workspace `Grupo A! | Organização | Produtividade |
Foco` (página raiz `29cfe715-bf5e-8136-ae80-f983eff48d6b`) para o schema em
`prisma/schema.prisma`.

Os IDs abaixo são **data source IDs** (`collection://…`), que é o que a API v2
aceita em `databases.query`. Eles estão replicados na constante `DS` de
`scripts/migrar-do-notion.ts` — se um ID mudar, mude nos dois lugares.

**Procedência.** As databases marcadas com ✅ foram lidas diretamente da API e
o mapeamento de propriedades/enums abaixo é literal. As marcadas com ⚠️ foram
identificadas pelas relations que apontam para elas, mas o schema completo não
foi lido; os nomes de property no script são um palpite informado, protegido
por `primeiroQueExistir()`. Rode `npm run migrar:dry` antes de confiar.

---

## 1. Inventário

| # | Database (Notion) | Data source ID | Model | Lida |
|---|---|---|---|---|
| 1 | Cliente | `29cfe715-bf5e-81fb-9c70-000bb32c0bc8` | `Cliente` | ✅ |
| 2 | Projetos | `29cfe715-bf5e-812b-9666-000bfbc74846` | `Projeto` | ✅ |
| 3 | Tarefas (principal) | `29cfe715-bf5e-81b1-afe5-000bbf35bfa4` | `Tarefa` | ✅ |
| 4 | Tarefas (widget 🎒) | `29cfe715-bf5e-8181-a205-000b3973945b` | `Tarefa` | ✅ |
| 5 | Leads (novo) | `2e2fe715-bf5e-8111-ab86-000b3a760366` | `Lead` | ✅ |
| 6 | Leads (legado) | `29cfe715-bf5e-8150-a2ff-000b538719d2` | `Lead` | ✅ |
| 7 | Stats | `2e2fe715-bf5e-81dc-b7a3-000b4bb0ddfc` | `LeadStat` | ⚠️ |
| 8 | Proposta | `29cfe715-bf5e-8156-9dab-000b910f3d5b` | `Proposta` | ⚠️ |
| 9 | Contrato | `29cfe715-bf5e-816a-9c62-000b2b004fa6` | `Contrato` | ⚠️ |
| 10 | Feedback | `29cfe715-bf5e-813e-8fc9-000b59c953c4` | `Feedback` | ⚠️ |
| 11 | Faturas | `29cfe715-bf5e-81ad-ba67-000bbd6af450` | `Fatura` | ✅ |
| 12 | Planilha de Horas | `29cfe715-bf5e-81b3-ac8c-000bc91c3c1e` | `PlanilhaHoras` | ⚠️ |
| 13 | Receita | `29cfe715-bf5e-810a-b97e-000b80f5deec` | `Receita` | ⚠️ |
| 14 | Despesa | `29cfe715-bf5e-811f-b63d-000bd7b86ff7` | `Despesa` | ⚠️ |
| 15 | Lista de categorias de receitas | `29cfe715-bf5e-8119-b6be-000b0362a14b` | `CategoriaReceita` | ⚠️ |
| 16 | Lista de categorias de despesas | `29cfe715-bf5e-8137-a570-000bb916769e` | `CategoriaDespesa` | ⚠️ |
| 17 | Overview Financeiro | `29cfe715-bf5e-8148-bd3a-000b5aef62ec` | `MesFinanceiro` | ✅ |
| 18 | Meta anual | `29cfe715-bf5e-8120-a3b1-000b376aaead` | `MetaAnual` | ✅ |
| 19 | Metas | `29cfe715-bf5e-818d-80e9-000b2e9600d6` | `Meta` | ⚠️ |
| 20 | Reuniões | `29cfe715-bf5e-8170-8e0d-000b9a2b2f96` | `Reuniao` | ⚠️ |
| 21 | Postagens | `29cfe715-bf5e-811a-a8b5-000bcdc0a087` | `Postagem` | ⚠️ |
| 22 | Portfolio Project | `29cfe715-bf5e-8158-bb3e-000b99fdd25e` | `ProjetoPortfolio` | ⚠️ |
| 23 | Setup | `29cfe715-bf5e-8192-8490-000b2902bfc5` | `EtapaSetup` | ⚠️ |
| 24 | Rastreador de hábitos | `29cfe715-bf5e-8165-9fc1-000b619ef970` | `Habito` + `RegistroHabito` + `MarcacaoHabito` | ✅ |
| 25 | Dia | `29cfe715-bf5e-81bf-814c-000b20f911b1` | `PlannerEntrada` (`DIA`) | ❌ 404 |
| 26 | Semana | `29cfe715-bf5e-81e1-adf4-000be1ebc01e` | `PlannerEntrada` (`SEMANA`) | ✅ |
| 27 | Mês | `29cfe715-bf5e-8135-a8ef-000ba5e1b6b0` | `PlannerEntrada` (`MES`) | ✅ |

### Não migradas, de propósito

| Database | ID | Motivo |
|---|---|---|
| Resumo | `29cfe715-bf5e-81ea-8846-000be6f91da5` | Virou `src/lib/resumo.ts` — §2 |
| Resumo (1) | `29cfe715-bf5e-819d-91c3-000bd5a92ef9` | Duplicata da anterior |
| Organização Pessoal | `29cfe715-bf5e-811c-96ac-000b17b6a181` | Só tinha a coluna `Nome` (confirmado) |

---

## 2. Por que a `Resumo` sumiu

`Resumo` era uma database de **uma linha só**, ligada por relation a todas as
outras, com ~60 rollups em cima:

```
Total de clientes          rollup count   → Cliente.título
Clientes ativos            rollup checked → Cliente."Cliente Ativo?"
Tarefas não finalizadas    rollup unchecked → Tarefas."Concluído"
Tarefas vencidas           rollup checked → Tarefas."Atrasado?"
Projetos finalizados       rollup checked → Projetos."Não está em andamento?"
Faturas pagas / Vence este mês / Metas alcançadas / Setup feito / …
```

Para alimentar isso, **toda** database carregava uma property `Resumo` do tipo
relation, com esta descrição:

> *This property must be filled out in order to link to the "Summary" in the
> main page*

Ou seja: um campo obrigatório em todo registro cuja única função era existir
para o rollup funcionar. É uma limitação do Notion (não faz agregação global),
não um dado do negócio.

Em SQL isso é uma query. Está em `src/lib/resumo.ts`, na função
`carregarResumo()`. **Não recrie a tabela.**

---

## 3. `Etiqueta *` — as ~35 props que viraram string

Amostra real do schema de `Resumo`:

```
Etiqueta Espaço, Etiqueta Espaço 2, Etiqueta Espaço 3, Etiqueta Espaço 4,
Etiqueta Linha, Etiqueta outros, Etiqueta Clientes, Etiqueta Planner,
Etiqueta Fatutras [sic], Etiqueta Social, Etiqueta tarefas,
Etiqueta de Reuniões, Etiqueta Setup do negócio, Label Metas,
Etiquetas Projetos, Etiqueta Clientes ativos, Etiqueta tarefas vencidas,
Etiqueta metas vencidas, Etiqueta faturas pagas, Etiqueta faturas vencidas,
Etiqueta publicados, Etiqueta publicados esta semana, Etiqueta agendados,
Etiquetas em andamento, Etiquetas Lucro Atual, Etiquetas Meta de Lucro, …
```

Metade eram `text` vazios usados como espaçador visual no layout do Notion; a
outra metade eram `formula` que só concatenavam um número com um substantivo
(`"3 tarefas vencidas"`). Nenhuma é dado. Viraram texto nos componentes React.

---

## 4. `Relacionado a X (Y)` — as relations órfãs

~40 relations apontando para collections com UUID fora da família
`29cfe715-bf5e-*` do workspace — restos de databases duplicadas quando o
template foi copiado. Exemplos:

```
Relacionado a Configurações (Resumo)      → 4bc100e5-15b4-4a84-8f46-ed3d3c0beb5b
Relacionado a Dia (Resumo) 1              → 4fc01c2e-2876-4a10-8a59-01051ad82b26
Relacionado a Projetos (Cliente) 1        → 2a4bde0a-cfbc-4418-8227-a0e9fd3341d5
Relacionado a Leads (Tarefas) 2           → 68c8534e-9d82-4a60-a506-eb16983b14d8
```

Note o padrão `X` e `X 1` (e até `X 2`): a mesma relation duplicada. Nenhuma
tinha dado. Ignoradas.

---

## 5. Tarefas — a fusão das duas databases

Duas databases distintas, com vocabulários diferentes:

| | Principal (`…81b1-afe5`) | Widget 🎒 (`…8181-a205`) |
|---|---|---|
| Título | `Título` | `Nome` |
| Estado | `Concluído` (checkbox) | `Status` (`A fazer` / `Em andamento` / `Completa`) |
| Prioridade | `Baixa` / `Média` / `Alta` | `Alta 🔥` / `Média` / `Baixa` |
| Prazo | `Data de vencimento` | `Prazo` |
| Extras | `Tag`, `Notas`, `Arquivos e mídia`, relations p/ Projeto/Leads/Social Media | — |

No model `Tarefa`:
- `status` usa `StatusTarefa`; o checkbox `Concluído` da principal vira
  `COMPLETA` + `concluida = true`.
- `Alta 🔥` e `Alta` colapsam em `ALTA` (o emoji era decoração).
- `origem` (`PRINCIPAL` / `WIDGET`) guarda a procedência — só para
  rastreabilidade, não use em lógica de negócio.

---

## 6. Planner — 3 databases, 1 tabela

`Dia`, `Semana` e `Mês` tinham a mesma forma (título, `Data`, `Status`, `Capa`,
relation para o pai). Viraram `PlannerEntrada` com discriminador `periodo`.

Os vocabulários de status divergiam num único valor:

| Database | Valores |
|---|---|
| `Semana` | `Não planejado`, `Planejado`, **`Em andamento`**, `Concluído` |
| `Mês` | `Não planejado`, `Planejado`, **`Em progresso`**, `Concluído` |
| `Dia` | não lido (404) — presumido igual |

`Em andamento` e `Em progresso` são o mesmo estado. Ambos mapeiam para
`StatusPlanner.EM_ANDAMENTO`.

---

## 7. Hábitos — de 5 colunas para 3 tabelas

O schema real de `Rastreador de hábitos`:

```
Nome (title), Data (date), Semana (relation),
Hábito 1 (checkbox), Hábito 2 (checkbox), Hábito 3 (checkbox),
Hábito 4 (checkbox), Hábito 5 (checkbox),
Taxa de conclusão (formula), Progresso, Hoje, Ontem, Amanhã
```

Cinco hábitos, hardcoded. Renomear um significava renomear a coluna; um sexto
exigia alterar o schema e todas as fórmulas.

Agora:
- `Habito` — o hábito em si (nome, frequência, ordem, ativo)
- `RegistroHabito` — um dia do rastreador
- `MarcacaoHabito` — o cruzamento, com `feito`

A migração cria os 5 hábitos com os nomes originais (`Hábito 1`…`Hábito 5`) e
uma marcação por checkbox. Renomeie-os pela UI depois — os dados seguem.

`Taxa de conclusão` tinha denominador fixo 5; em `formulas.ts` a
`taxaDeConclusao()` usa a contagem de hábitos ativos.

---

## 8. Fusão dos dois CRMs de Leads ⚠️

Este é o ponto do mapeamento onde houve **interpretação**, não tradução.

**CRM novo** (`2e2fe715-bf5e-8111-ab86-000b3a760366`) — `Etapa` (6 opções) e
`Status` (6 opções, tipo `status`):

```
Etapa:  Descoberta · Diagnóstico · Apresentação · Proposta · Follow-up · Fechamento
Status: Lead · Qualificação · Negociação · Proposta · Fechamento Ganho · Fechamento Perdido
```

**CRM legado** (`29cfe715-bf5e-8150-a2ff-000b538719d2`) — `Status` (5 opções,
tipo `select`):

```
Descoberto · Em conversação · Qualificado · Convertido · Perdido
```

O enum `StatusLead` adota o vocabulário do CRM novo. O de-para do legado:

| Legado | → `StatusLead` | Confiança |
|---|---|---|
| `Descoberto` | `LEAD` | alta |
| `Qualificado` | `QUALIFICACAO` | alta |
| `Perdido` | `FECHAMENTO_PERDIDO` | alta |
| `Em conversação` | `NEGOCIACAO` | **interpretação** |
| `Convertido` | `FECHAMENTO_GANHO` | **interpretação** |

Por que os dois últimos são discutíveis:

- **`Em conversação`** é mais amplo que `Negociação`. No funil novo, "conversando"
  pode ser `Qualificação` (ainda entendendo o problema) ou `Negociação`
  (discutindo preço). Escolhi `NEGOCIACAO` porque no legado `Qualificado` já
  existia como estado separado e posterior — então `Em conversação` era o que
  vinha *depois* de qualificar. Se a equipe usava ao contrário, corrija aqui.
- **`Convertido`** provavelmente significa "virou cliente", que é
  `Fechamento Ganho`. Mas pode ter sido usado como "virou oportunidade real"
  em algum momento. Vale conferir contra a tabela `Cliente`: se todo lead
  `Convertido` tem um `Cliente` correspondente, o mapeamento está certo.

O campo `Lead.fonteLegado` fica preenchido só nos registros vindos do legado —
use-o para achar e revisar esses casos:

```sql
SELECT nome, status, "fonteLegado"
FROM leads
WHERE "fonteLegado" IS NOT NULL AND status IN ('Fechamento Ganho', 'Negociação');
```

As `Fonte` também diferem: o legado tinha `Website · Instagram · Indicação ·
LinkedIn`; o novo tem `Canal` com `Instagram · WhatsApp · Indicação · Linkedln
· Site · Outros · Parceiros`. Note que **no CRM novo o rótulo está grafado
`Linkedln`** (com L minúsculo no lugar do I) — o `@map` preserva o erro para a
migração casar; o valor do enum é `LINKEDIN`.

---

## 9. Financeiro

`Overview Financeiro` (uma linha por mês) → `MesFinanceiro`:

| Notion | Prisma |
|---|---|
| `Month` (title) | `nome` |
| `Date` | `ano` + `mes` (decompostos) |
| `Meta de Lucro` (number, real) | `metaLucro` `Decimal(12,2)` |
| `Moeda` | `moeda` |
| `Ano` (relation) | `metaAnualId` |
| `Receita` / `Despesa` (relations) | `receitas[]` / `despesas[]` |
| `Receitas realizadas`, `Despesas realizadas`, `Lucro líquido`, `Progresso`, `This month` (formulas/rollups) | `formulas.ts` |
| `Etiqueta*` (9 formulas) | descartadas |

`Meta anual` → `MetaAnual`. Os rollups `Receitas`, `Despesas`, `Lucro`,
`Média de Lucro Mensal`, `Progresso` viraram funções.

`Faturas` → `Fatura`. `Valor total` era uma fórmula que escolhia entre
`Preço fixo` e o rollup `Custo da hora` conforme o `Tipo` — agora é
`valorTotalDaFatura()`. `PDF da Fatura` e `Capa` viram registros em `Arquivo`
(além do atalho `pdfUrl` / `capaUrl`).

---

## 10. Idempotência

Cada página importada gera uma linha em `notion_id_map`:

```
notionId      ID da página no Notion (único)
entidade      nome do model
registroId    ID local
dataSourceId  de qual database veio
fase          1, 2 ou 3
```

Rodar `npm run migrar` de novo faz `update`, não `insert`. É seguro rodar
depois de mexer no Notion.

As três fases existem porque as relations têm ordem de dependência:

1. **Independentes** — categorias, hábitos, planner, metas anuais/mensais,
   clientes, postagens, portfólio, setup, metas.
2. **Dependentes** — leads, propostas, contratos, projetos, receitas, despesas.
3. **Relações** — tarefas, faturas, planilha de horas, reuniões, feedbacks,
   stats, arquivos.
