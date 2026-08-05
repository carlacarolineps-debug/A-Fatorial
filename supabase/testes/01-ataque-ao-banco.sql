\set ON_ERROR_STOP off
\pset pager off
-- ============================================================
-- Ataque ao banco, do lugar de quem so tem a chave anon.
-- Cada bloco tem que TERMINAR do jeito descrito no titulo.
-- ============================================================
insert into auth.users (id,email) values
  ('11111111-1111-1111-1111-111111111111','ana@x.com'),
  ('22222222-2222-2222-2222-222222222222','bia@x.com'),
  ('33333333-3333-3333-3333-333333333333','gestaogrupoa@gmail.com') on conflict do nothing;

-- o webhook (service_role) libera as duas alunas
set role service_role;
insert into public.access (email,status) values ('ana@x.com','active'),('bia@x.com','active')
  on conflict (email) do update set status='active';
update public.access set user_id='11111111-1111-1111-1111-111111111111' where email='ana@x.com';
update public.access set user_id='22222222-2222-2222-2222-222222222222' where email='bia@x.com';
reset role;

\echo '--- 1. o webhook consegue gravar (era o que a identidade de replica quebrava)'
select case when count(*)=2 then 'PASSOU: as duas liberadas' else 'FALHOU' end from public.access where status='active' and email<>'gestaogrupoa@gmail.com';

-- perfis
set role service_role;
insert into public.profiles (user_id,email,display_name) values
 ('11111111-1111-1111-1111-111111111111','ana@x.com','Ana'),
 ('22222222-2222-2222-2222-222222222222','bia@x.com','Bia'),
 ('33333333-3333-3333-3333-333333333333','gestaogrupoa@gmail.com','Carla') on conflict do nothing;
insert into public.progress (user_id,state,xp) values
 ('11111111-1111-1111-1111-111111111111','{"segredo":"faturamento da Ana"}',900),
 ('22222222-2222-2222-2222-222222222222','{"segredo":"faturamento da Bia"}',300) on conflict do nothing;
insert into public.caixinha (user_id,pergunta,asker_email) values
 ('11111111-1111-1111-1111-111111111111','pergunta intima da Ana','ana@x.com') on conflict do nothing;
insert into public.provas (user_id,titulo,texto) values
 ('11111111-1111-1111-1111-111111111111','Prova da Ana','numero privado') on conflict do nothing;
reset role;

-- ================== AGORA EU SOU A BIA, ALUNA COMUM ==================
set role authenticated;
set teste.uid = '22222222-2222-2222-2222-222222222222';
set teste.jwt = '{"email":"bia@x.com"}';

\echo '--- 2. a Bia tenta LER o progresso da Ana: tem que voltar vazio'
select case when count(*)=0 then 'PASSOU: nao le o dado da outra' else 'FALHOU: LEU '||count(*) end
  from public.progress where user_id='11111111-1111-1111-1111-111111111111';

\echo '--- 3. a Bia tenta LER a caixinha da Ana (com o e-mail dela): vazio'
select case when count(*)=0 then 'PASSOU' else 'FALHOU: LEU '||count(*) end
  from public.caixinha where user_id='11111111-1111-1111-1111-111111111111';

\echo '--- 4. a Bia tenta LER a prova da Ana: vazio'
select case when count(*)=0 then 'PASSOU' else 'FALHOU: LEU '||count(*) end
  from public.provas where user_id='11111111-1111-1111-1111-111111111111';

\echo '--- 5. a Bia tenta LER a linha de acesso da Ana: vazio'
select case when count(*)=0 then 'PASSOU' else 'FALHOU: LEU '||count(*) end
  from public.access where email='ana@x.com';

\echo '--- 6. a Bia tenta SE DAR acesso para sempre: tem que ser recusado'
do $$ begin
  update public.access set status='active', expires_at=now()+interval '99 years' where email='bia@x.com';
  raise notice 'update passou (a policy nao existe, entao 0 linhas): confira abaixo';
exception when others then raise notice 'PASSOU: recusado (%)', SQLERRM; end $$;
select case when count(*)=0 then 'PASSOU: nada mudou' else 'FALHOU: mudou' end
  from public.access where email='bia@x.com' and expires_at is not null;

\echo '--- 7. a Bia tenta VIRAR MENTORA pelo update: recusado'
do $$ begin
  update public.profiles set is_mentor=true where user_id='22222222-2222-2222-2222-222222222222';
  raise notice 'FALHOU: o update passou';
exception when others then raise notice 'PASSOU: recusado (%)', SQLERRM; end $$;

\echo '--- 8. a Bia apaga o proprio perfil e recria com is_mentor: recusado'
do $$ begin
  delete from public.profiles where user_id='22222222-2222-2222-2222-222222222222';
  raise notice 'delete: % linha(s)', 0;
exception when others then raise notice 'delete recusado (%)', SQLERRM; end $$;
do $$ begin
  insert into public.profiles (user_id,email,display_name,is_mentor)
  values ('22222222-2222-2222-2222-222222222222','bia@x.com','Bia',true);
  raise notice 'FALHOU: o insert com is_mentor passou';
exception when others then raise notice 'PASSOU: recusado (%)', SQLERRM; end $$;

\echo '--- 9. a Bia se declara mentora na lista: recusado'
do $$ begin
  insert into public.mentoras (email) values ('bia@x.com');
  raise notice 'FALHOU: entrou na lista de mentoras';
exception when others then raise notice 'PASSOU: recusado (%)', SQLERRM; end $$;

\echo '--- 10. a Bia continua sem ser mentora'
select case when public.eh_mentora() then 'FALHOU: virou mentora' else 'PASSOU: continua aluna' end;

\echo '--- 11. a Bia le o proprio progresso: tem que conseguir'
select case when count(*)=1 then 'PASSOU' else 'FALHOU' end
  from public.progress where user_id='22222222-2222-2222-2222-222222222222';

\echo '--- 12. a Bia suspende a conta da Ana: recusado'
do $$ begin
  perform public.suspender_membro('11111111-1111-1111-1111-111111111111');
  raise notice 'FALHOU: aluna suspendeu conta';
exception when others then raise notice 'PASSOU: recusado (%)', SQLERRM; end $$;

\echo '--- 13. a Bia apaga conteudo denunciado: recusado'
do $$ begin
  perform public.remover_conteudo('galeria','00000000-0000-0000-0000-000000000000');
  raise notice 'FALHOU: aluna apagou conteudo';
exception when others then raise notice 'PASSOU: recusado (%)', SQLERRM; end $$;

\echo '--- 14. a Bia le a lista de e-mails de quem manda: vazio'
select case when count(*)=0 then 'PASSOU' else 'FALHOU: leu '||count(*) end from public.mentoras;

-- ================== AGORA EU SOU A CARLA, A MENTORA ==================
set teste.uid = '33333333-3333-3333-3333-333333333333';
set teste.jwt = '{"email":"gestaogrupoa@gmail.com"}';

\echo '--- 15. a Carla e reconhecida como mentora pela LISTA, nao pela coluna'
select case when public.eh_mentora() then 'PASSOU' else 'FALHOU' end;

\echo '--- 16. a Carla le a caixinha de todas'
select case when count(*)>=1 then 'PASSOU: le '||count(*) else 'FALHOU: nao le' end from public.caixinha;

\echo '--- 17. a Carla le as provas das alunas'
select case when count(*)>=1 then 'PASSOU' else 'FALHOU' end from public.provas;

\echo '--- 18. a Carla suspende a conta da Ana: funciona'
select case when public.suspender_membro('11111111-1111-1111-1111-111111111111') then 'PASSOU' else 'FALHOU' end;
reset role;
select case when status='inactive' then 'PASSOU: acesso da Ana caiu' else 'FALHOU: '||status end
  from public.access where email='ana@x.com';

\echo '--- 19. a Ana perde o conteudo na hora (tem_acesso vira falso)'
set role authenticated;
set teste.uid = '11111111-1111-1111-1111-111111111111';
set teste.jwt = '{"email":"ana@x.com"}';
select case when public.tem_acesso() then 'FALHOU: ainda tem acesso' else 'PASSOU: sem acesso' end;

\echo '--- 20. quem paga antes de ter conta entra pelo e-mail (o caso do webhook)'
reset role;
set role service_role;
insert into public.access (email,status) values ('nova@x.com','active') on conflict (email) do update set status='active';
reset role;
set role authenticated;
set teste.uid = '44444444-4444-4444-4444-444444444444';
set teste.jwt = '{"email":"NOVA@x.com"}';
select case when public.tem_acesso() then 'PASSOU: acesso vale antes do user_id colar' else 'FALHOU: ficaria de fora' end;
select case when count(*)=1 then 'PASSOU: enxerga a propria linha' else 'FALHOU: linha invisivel' end
  from public.access where lower(email)='nova@x.com';

\echo '--- 21. casar_meu_acesso cola o user_id e NAO mexe no status'
reset role;
insert into auth.users (id,email) values ('44444444-4444-4444-4444-444444444444','nova@x.com') on conflict do nothing;
set role authenticated;
set teste.uid = '44444444-4444-4444-4444-444444444444';
set teste.jwt = '{"email":"nova@x.com"}';
select case when public.casar_meu_acesso() then 'PASSOU: colou' else 'FALHOU' end;
reset role;
select case when user_id='44444444-4444-4444-4444-444444444444' and status='active'
            then 'PASSOU: user_id colado, status intacto' else 'FALHOU' end
  from public.access where email='nova@x.com';

\echo '--- 22. bloqueio some da consulta, nao so da tela'
set role service_role;
insert into public.galeria (user_id,url,legenda) values ('22222222-2222-2222-2222-222222222222','http://x/foto.jpg','foto da Bia');
reset role;
set role authenticated;
set teste.uid = '44444444-4444-4444-4444-444444444444';
set teste.jwt = '{"email":"nova@x.com"}';
select case when count(*)=1 then 'antes do bloqueio: ve a foto' else 'FALHOU' end from public.galeria;
insert into public.bloqueios (user_id,bloqueado_id) values ('44444444-4444-4444-4444-444444444444','22222222-2222-2222-2222-222222222222') on conflict do nothing;
select case when count(*)=0 then 'PASSOU: depois do bloqueio a foto some da consulta' else 'FALHOU: ainda ve' end from public.galeria;
reset role;
