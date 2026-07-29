# Grupo A! — contexto do projeto

Sistema interno que **substitui um Notion** (`Grupo A! | Organização |
Produtividade | Foco`). Não é um projeto novo: é a reimplementação de uma
estrutura que existia e está em uso.

Stack: Next.js 15 (App Router, Server Components) · Prisma · PostgreSQL ·
TypeScript · Tailwind v4.

## Comandos

```bash
npm run dev            # dev server
npm run db:migrate     # prisma migrate dev
npm run db:studio      # inspecionar dados
npm run migrar:dry     # migração Notion → Postgres, sem escrever
npm run migrar         # migração de verdade (idempotente)
```

## Arquivos que importam

| Arquivo | O que é |
|---|---|
| `prisma/schema.prisma` | 29 models, 31 enums. A fonte da verdade. |
| `src/lib/formulas.ts` | As fórmulas do Notion traduzidas (34 funções). Cada uma cita a propriedade de origem no comentário. |
| `src/lib/resumo.ts` | Substitui a database `Resumo` do Notion (ver abaixo). |
| `src/lib/datas.ts` | Fuso, intervalos e formatação pt-BR. |
| `src/lib/notion.ts` | Cliente do Notion + extratores de propriedade. |
| `src/app/page.tsx` | Dashboard — réplica da página raiz do Notion. |
| `scripts/migrar-do-notion.ts` | Importação via API. 3 fases, idempotente via `notion_id_map`. |
| `docs/MAPA-NOTION.md` | Mapeamento completo Notion → Prisma, com IDs de origem. |

## Decisões de design — não desfazer sem conversar

Estas escolhas foram feitas depois de mapear o Notion inteiro. Várias parecem
"faltando alguma coisa" à primeira vista, mas são intencionais:

**A database `Resumo` foi removida de propósito.** No Notion ela existia só
porque a ferramenta não faz agregação global: era uma linha única ligada a
*todas* as outras databases via relations, com ~60 rollups em cima. Toda
database carregava uma propriedade `Resumo` obrigatória para alimentá-la — a
descrição da property dizia literalmente *"This property must be filled out in
order to link to the Summary in the main page"*. Aqui isso é uma query —
`src/lib/resumo.ts`. **Não recrie uma tabela `Resumo`.**

**Não existem propriedades `Etiqueta *`.** No Notion havia ~35 (`Etiqueta
Espaço`, `Etiqueta Espaço 2/3/4`, `Etiqueta Linha`, `Etiqueta outros`,
`Etiqueta Clientes`, `Etiqueta Fatutras` [sic]…). Eram labels de UI, não dados.
Viraram strings nos componentes.

**Não existem relations `Relacionado a X (Y)`.** Eram ~40, órfãs de databases
duplicadas do template (`Relacionado a Configurações (Resumo)`, `Relacionado a
Dia (Resumo) 1`…). Nenhuma tinha dado real.

**Não existem colunas `Total Janeiro`…`Total Dezembro`.** Eram fórmulas
repetidas nas databases financeiras. Use `agruparPorMes()` / `serieAnual()` em
`formulas.ts` ou `GROUP BY`.

**Tabelas unificadas** (o Notion tinha duplicatas do template):
- `Tarefas` + `Tarefas (widget)` → `Tarefa` (campo `origem` guarda de qual veio)
- `Leads` (novo, 6 etapas) + `Leads` (legado, 5 status) → `Lead`
- Os 3 vocabulários de status do planner → um enum `StatusPlanner`
  (`Semana` usava "Em andamento", `Mês` usava "Em progresso" — mesmo estado)

**Hábitos são registros, não colunas.** O Notion tinha `Hábito 1`…`Hábito 5`
hardcoded como checkboxes. Agora: `Habito` + `RegistroHabito` +
`MarcacaoHabito`. Dá para ter quantos quiser e renomeá-los.

**Arquivos são polimórficos.** O Notion espalhava props `Capa` / `PDF da
Fatura` / `Arquivos e mídia` / `Imagem de Capa` por toda parte. Agora: tabela
`Arquivo` com `(tipoEntidade, entidadeId)`. Alguns models ainda têm `capaUrl`
como atalho — isso é proposital, para a capa principal.

## Convenções

- **Português nos nomes de domínio** (models, campos, enums, funções de
  negócio). O código de infra pode ser em inglês. Isso mantém o vínculo com o
  vocabulário que a equipe já usa no Notion.
- **`@map` nos enums** guarda o rótulo exato que aparecia no Notion. Útil na
  migração e para exibir na UI.
- **Server Components por padrão.** Só use `'use client'` quando precisar de
  interatividade real.
- **Decimal para dinheiro** (`@db.Decimal(12,2)`), nunca Float. Converta com
  `paraNumero()` só na borda de apresentação.
- **Datas sem hora** usam `@db.Date`. O fuso do negócio é `America/Sao_Paulo`.
- Ao adicionar uma fórmula nova em `formulas.ts`, cite a propriedade Notion
  correspondente no comentário se ela existir.

## Estado atual

Pronto: schema, fórmulas, agregação do dashboard, dashboard, migração.

Falta:
1. Rotas CRUD (`/clientes`, `/projetos`, `/tarefas`…). O dashboard já linka
   para elas — os links estão quebrados até serem criadas.
2. Autenticação. O model `Usuario` existe; falta o Auth.js.
3. Upload de arquivos. O model `Arquivo` existe; falta o storage (S3/R2).
4. Widgets do dashboard: relógio (componente local) e clima (API externa).
   No Notion eram embeds — `widgetbox.app` e `indify.co`.

## Pendências conhecidas

- **`Organização Pessoal`** (database do Notion, ID
  `29cfe715-bf5e-811c-96ac-000b17b6a181`) só tinha a coluna `Nome` — confirmado
  na API. Não foi modelada. Se aparecer conteúdo relevante no corpo das
  páginas, criar uma tabela `Nota` genérica.
- **Fusão dos dois CRMs de Leads**: `Convertido` → `FECHAMENTO_GANHO` e
  `Em conversação` → `NEGOCIACAO` são interpretações, não equivalências
  exatas. Ver `docs/MAPA-NOTION.md` §8.
- **`Dia` (planner diário, `29cfe715-bf5e-81bf-814c-000b20f911b1`)** devolveu
  404 na API durante o mapeamento — a integração não tinha acesso. O código da
  migração já cobre essa database; confirme o compartilhamento e rode
  `npm run migrar:dry` para ver se ela aparece.
- Os campos de databases que a API não expôs em detalhe (`Metas`, `Postagens`,
  `Setup`, `Proposta`, `Contrato`, `Feedback`, `Planilha de Horas`, `Receita`,
  `Despesa`, `Stats`) foram mapeados a partir das relations que apontam para
  elas. A migração usa `primeiroQueExistir()` para tolerar nomes de property
  divergentes, mas confira o `--dry-run` antes de rodar pra valer.
