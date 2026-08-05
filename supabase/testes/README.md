# Testar o banco antes de confiar nele

Estes dois arquivos rodam o schema inteiro num PostgreSQL comum, sem
depender do Supabase, e depois atacam o banco do lugar de quem só tem a
chave anon. É assim que se descobre uma falha de permissão antes de uma
aluna descobrir.

## Como rodar (num computador com PostgreSQL 16)

```bash
initdb -D /tmp/pg -U postgres --auth=trust
pg_ctl -D /tmp/pg -o "-p 5433 -k /tmp" start

psql -h /tmp -p 5433 -U postgres -f 00-supabase-simulado.sql
psql -h /tmp -p 5433 -U postgres -c "alter role service_role bypassrls;"
psql -h /tmp -p 5433 -U postgres -f ../01_schema.sql
psql -h /tmp -p 5433 -U postgres -f 01-ataque-ao-banco.sql
```

O `00-supabase-simulado.sql` cria os pedaços que o Supabase já traz
prontos: os papéis `anon`, `authenticated` e `service_role`, o schema
`auth` com `uid()` e `jwt()`, o schema `storage`, a publicação do Realtime
e um dublê do pg_cron. Para o teste, `auth.uid()` e `auth.jwt()` leem uma
variável de sessão, então dá para "virar" cada pessoa com um `set`.

Duas observações que importam:

- rode `../01_schema.sql` **três vezes seguidas**. Ele tem que aplicar
  limpo todas as vezes: arquivo de schema que só roda uma vez é arquivo
  que ninguém consegue corrigir depois;
- o `create extension pg_cron` falha fora do Supabase. É esperado:
  comente a linha só para o teste.

## O que o 01-ataque-ao-banco.sql prova

Vinte e dois cenários, cada um com o resultado esperado no título. Os que
importam mais:

| # | O ataque | O que tem que acontecer |
|---|---|---|
| 2 a 5 | uma aluna tenta ler o progresso, a caixinha, a prova e o acesso de outra | volta vazio |
| 6 | uma aluna tenta se dar acesso eterno | nada muda |
| 7 e 8 | uma aluna tenta virar mentora, pelo update e pelo insert | recusado pela permissão de coluna |
| 9 | uma aluna tenta entrar na lista de mentoras | recusado pelo RLS |
| 12 e 13 | uma aluna tenta suspender conta e apagar conteúdo | recusado dentro da função |
| 14 | uma aluna tenta ler a lista de quem manda | volta vazio |
| 15 a 18 | a mentora faz o trabalho dela | funciona |
| 19 | conta suspensa perde o conteúdo na hora | `tem_acesso()` vira falso |
| 20 e 21 | quem paga antes de ter conta | entra pelo e-mail, e o `user_id` cola depois sem mexer no status |
| 22 | bloqueio | a foto some da **consulta**, não só da tela |

O teste 1 existe por um motivo específico: a tabela `access` entra na
publicação do Realtime, e tabela publicada que sofre update precisa de
identidade de réplica. Sem ela, todo update em `access` falha, e isso
significa webhook que não libera, régua que não corta e suspensão que não
suspende. Tudo calado, tudo de uma vez.
