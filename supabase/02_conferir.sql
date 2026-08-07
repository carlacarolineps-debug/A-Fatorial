-- =====================================================================
-- CONFERIR SE O SCHEMA FOI APLICADO
-- Cole no SQL Editor e clique em Run. Ele NAO muda nada, so olha.
-- Cinco respostas em portugues: se as cinco disserem TUDO CERTO,
-- o banco esta pronto e voce pode entrar no app.
-- =====================================================================
select
  case when count(*) filter (where tabela_ok) = 18
       then 'TUDO CERTO: as 18 tabelas existem'
       else 'FALTAM TABELAS: achei ' || count(*) filter (where tabela_ok) || ' de 18'
  end as "1. tabelas",
  case when bool_and(rls_ok) then 'TUDO CERTO: todas protegidas'
       else 'ATENCAO: alguma tabela sem protecao' end as "2. seguranca",
  (select case when count(*) = 9 then 'TUDO CERTO: as 9 funcoes existem'
               else 'FALTAM FUNCOES: achei ' || count(*) || ' de 9' end
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('tem_acesso','eh_mentora','casar_meu_acesso','suspender_membro',
                        'user_id_por_email','liberar_acesso','encerrar_acesso',
                        'alunas_admin','resumo_admin')) as "3. funcoes",
  (select case when count(*) >= 1 then 'TUDO CERTO: o seu acesso esta ativo'
               else 'ATENCAO: o seu acesso nao foi criado' end
     from public.access where email = 'gestaogrupoa@gmail.com' and status = 'active') as "4. seu acesso",
  (select case when count(*) >= 1 then 'TUDO CERTO: voce esta na lista de mentoras'
               else 'ATENCAO: voce nao esta na lista' end
     from public.mentoras where email = 'gestaogrupoa@gmail.com') as "5. mentora"
from (
  select t.tablename,
         true as tabela_ok,
         c.relrowsecurity as rls_ok
    from pg_tables t
    join pg_class c on c.relname = t.tablename
    join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
   where t.schemaname = 'public'
     and t.tablename in ('profiles','mentoras','access','bloqueios','progress','audios',
                         'videos','eventos','caixinha','provas','membros','presencas',
                         'galeria','termos','denuncias','parcelas','webhook_log','push_tokens')
) x;
