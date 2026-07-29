# Grupo A! — Sistema

Substitui o Notion `Grupo A! | Organização | Produtividade | Foco`.

Next.js 15 (App Router) · Prisma · PostgreSQL · TypeScript · Tailwind v4.

## Como subir

```bash
npm install

# Postgres local (pule se já tiver um)
docker run -d --name grupoa-db -e POSTGRES_PASSWORD=dev -p 5432:5432 postgres:16

cp .env.example .env      # edite o NOTION_TOKEN
npm run db:migrate        # cria as tabelas
npm run dev               # http://localhost:3000
```

O dashboard abre mesmo com o banco vazio (mostra um aviso e zeros), então dá
para conferir que a aplicação está de pé antes de migrar os dados.

## Migrar os dados do Notion

O `NOTION_TOKEN` você cria em [notion.so/my-integrations](https://www.notion.so/my-integrations).
Depois **compartilhe a página raiz com a integração** (no Notion: `⋯` →
Conexões → sua integração). Sem isso a API devolve 404 e parece que o token
está errado quando não está.

```bash
npm run migrar:dry   # conta quantos registros viriam de cada database, sem escrever
npm run migrar       # importa de verdade
```

Rode o `:dry` primeiro e confira se os números batem com o que você vê no
Notion. A migração é idempotente (`notion_id_map`), então rodar duas vezes
atualiza em vez de duplicar.

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | `prisma generate` + build de produção |
| `npm run start` | Servidor de produção |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:push` | Sincroniza o schema sem criar migration |
| `npm run db:studio` | Inspeciona os dados no navegador |
| `npm run migrar:dry` | Simula a migração do Notion |
| `npm run migrar` | Executa a migração |

## Estrutura

```
prisma/schema.prisma         29 models, 31 enums — a fonte da verdade
src/app/page.tsx             dashboard (réplica da página raiz do Notion)
src/lib/resumo.ts            substitui a database `Resumo` do Notion
src/lib/formulas.ts          as fórmulas do Notion traduzidas
src/lib/datas.ts             fuso America/Sao_Paulo, intervalos, formatação
src/lib/notion.ts            cliente + extratores de propriedade
scripts/migrar-do-notion.ts  importação em 3 fases, idempotente
docs/MAPA-NOTION.md          mapeamento completo, com os IDs de origem
```

## Antes de mexer no schema

Leia o [`CLAUDE.md`](./CLAUDE.md). Várias ausências parecem esquecimento e são
intencionais — não existe tabela `Resumo`, não existem as ~35 propriedades
`Etiqueta *`, `Tarefas` e `Leads` foram unificadas a partir de duplicatas do
template. Recriar essas coisas é ressuscitar o peso morto que a migração tirou.

## O que falta

1. Rotas CRUD (`/clientes`, `/projetos`, `/tarefas`…) — o dashboard já linka
   para elas, os links quebram até serem criadas.
2. Autenticação (o model `Usuario` existe; falta o Auth.js).
3. Upload de arquivos (o model `Arquivo` existe; falta o storage).
4. Widgets de relógio e clima do dashboard.
