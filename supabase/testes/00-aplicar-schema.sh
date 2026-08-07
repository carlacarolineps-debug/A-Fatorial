#!/usr/bin/env bash
# Aplica o schema nos DOIS jeitos que a publicação do Realtime pode estar
# num projeto Supabase. Foi justamente essa diferença que passou batida:
# o banco de teste criava a publicação VAZIA, e o projeto real usa
# FOR ALL TABLES. Com FOR ALL TABLES a tabela access publica desde o
# instante em que nasce, e o primeiro update do arquivo morria por falta
# de identidade de réplica.
set -e
export PATH=/usr/lib/postgresql/16/bin:$PATH
SQL="${1:-$(dirname "$0")/../01_schema.sql}"
TMP=/tmp/pgtest/schema-teste.sql
sed 's/^create extension if not exists pg_cron;/-- (sem pg_cron no teste)/' "$SQL" > "$TMP"
chmod 644 "$TMP"

for MODO in "for all tables" ""; do
  echo "== publicacao: ${MODO:-vazia}"
  su postgres -c "psql -h /tmp -p 5433 -U postgres -q -c \
    'drop schema public cascade; create schema public;
     grant usage on schema public to anon, authenticated, service_role;
     alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
     truncate auth.users cascade;
     drop publication if exists supabase_realtime;
     create publication supabase_realtime $MODO;'" >/dev/null 2>&1
  for n in 1 2 3; do
    E=$(su postgres -c "psql -h /tmp -p 5433 -U postgres -f $TMP" 2>&1 | grep -ciE '^psql:.*ERROR' || true)
    T=$(su postgres -c "psql -h /tmp -p 5433 -U postgres -tAc \"select count(*) from pg_tables where schemaname='public'\"" 2>/dev/null | tr -d ' ')
    echo "   rodada $n: $E erros, $T tabelas"
    [ "$E" = "0" ] || { echo "   FALHOU"; exit 1; }
  done
  R=$(su postgres -c "psql -h /tmp -p 5433 -U postgres -q -f $(dirname "$0")/01-ataque-ao-banco.sql" 2>&1)
  echo "   seguranca: $(echo "$R" | grep -c PASSOU) PASSOU, $(echo "$R" | grep -c FALHOU) FALHOU"
done
echo "OK nos dois modos."
