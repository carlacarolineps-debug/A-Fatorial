-- =====================================================================
-- OPERAÇÃO BLINDADA · schema completo (Fase 1)
-- Projeto de destino: APP OPERAÇÃO BLINDADA (ref okoylfnniukzwoxevyow)
-- Projeto novo, vazio. Este arquivo cria tudo do zero e pode ser rodado
-- inteiro de uma vez no SQL Editor.
--
-- Princípio que governa o arquivo: o RLS é a autoridade sobre acesso.
-- O JavaScript pode esconder botão, nunca decidir permissão. Toda tabela
-- de conteúdo passa por tem_acesso(), então perder o acesso derruba o
-- dado na hora, não só a interface.
--
-- Nada aqui é destrutivo: só create/alter aditivo. Rode de novo sem medo.
-- =====================================================================

create extension if not exists pgcrypto;

-- =====================================================================
-- 1. PERFIL E ACESSO
-- =====================================================================

-- ---------------------------------------------------------------------
-- profiles: o cliente grava e lê por user_id (não por id). O helper
-- eh_mentora() precisa usar a MESMA coluna, senão ele devolve false para
-- sempre e as políticas da mentora ficam inertes.
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  email        text,
  display_name text,
  full_name    text,
  is_mentor    boolean not null default false,
  criado_em    timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- A tabela access nasce aqui porque tem_acesso() precisa dela, e os dois
-- helpers precisam existir antes de QUALQUER policy que os chame: policy
-- que referencia função inexistente falha na criação.
create table if not exists public.access (
  user_id      uuid references auth.users(id) on delete cascade,
  email        text not null,
  status       text not null default 'inactive'
               check (status in ('active','grace','inactive')),
  expires_at   timestamptz,
  external_ref text,
  atualizado_em timestamptz not null default now(),
  criado_em    timestamptz not null default now()
);
create unique index if not exists access_email_uk on public.access (lower(email));
create index        if not exists access_user_ix  on public.access (user_id);
alter table public.access enable row level security;

-- ---------------------------------------------------------------------
-- Os dois helpers que todas as políticas usam.
-- security definer para poderem ler access e profiles por dentro sem
-- esbarrar no RLS delas.
-- ---------------------------------------------------------------------
create or replace function public.tem_acesso()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.access a
    where a.user_id = auth.uid()
      and (a.status = 'active'
           or (a.status = 'grace' and a.expires_at is not null and a.expires_at > now()))
  );
$$;

create or replace function public.eh_mentora()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select p.is_mentor from public.profiles p
                   where p.user_id = auth.uid()), false);
$$;

grant execute on function public.tem_acesso()  to authenticated;
grant execute on function public.eh_mentora()  to authenticated;

drop policy if exists profiles_le_propria on public.profiles;
create policy profiles_le_propria on public.profiles
  for select to authenticated
  using (user_id = auth.uid() or public.eh_mentora());

drop policy if exists profiles_insere_propria on public.profiles;
create policy profiles_insere_propria on public.profiles
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists profiles_atualiza_propria on public.profiles;
create policy profiles_atualiza_propria on public.profiles
  for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- A trava que impede um aluno de virar mentora: o RLS libera a linha, mas
-- a permissão de coluna decide o que ele pode escrever nela. Sem isto,
-- qualquer aluno faria update em is_mentor e passaria a ler a caixinha
-- inteira, com o e-mail de todo mundo.
revoke update on public.profiles from authenticated;
grant  update (email, display_name, full_name, atualizado_em)
  on public.profiles to authenticated;

-- ---------------------------------------------------------------------
-- access: a fonte da verdade sobre quem entra.
-- Escrita só por service_role (webhook e cron). Leitura só da própria
-- linha, por user_id. O e-mail fica para o webhook casar quem paga antes
-- de existir conta.
-- ---------------------------------------------------------------------
drop policy if exists access_le_propria on public.access;
create policy access_le_propria on public.access
  for select to authenticated using (user_id = auth.uid());
-- sem policy de insert/update/delete: só service_role escreve

-- ---------------------------------------------------------------------
-- bloqueios: precisa existir antes das políticas de conteúdo, porque
-- elas filtram por ele. Quem foi bloqueado some do feed na consulta, não
-- só no cliente.
-- ---------------------------------------------------------------------
create table if not exists public.bloqueios (
  user_id      uuid not null references auth.users(id) on delete cascade,
  bloqueado_id uuid not null references auth.users(id) on delete cascade,
  criado_em    timestamptz not null default now(),
  primary key (user_id, bloqueado_id)
);
alter table public.bloqueios enable row level security;

drop policy if exists bloqueios_meus on public.bloqueios;
create policy bloqueios_meus on public.bloqueios
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.bloqueado(alvo uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.bloqueios b
                 where b.user_id = auth.uid() and b.bloqueado_id = alvo);
$$;
grant execute on function public.bloqueado(uuid) to authenticated;

-- =====================================================================
-- 2. PROGRESSO DO ALUNO
-- =====================================================================
create table if not exists public.progress (
  user_id   uuid primary key references auth.users(id) on delete cascade,
  state     jsonb not null default '{}'::jsonb,
  xp        integer not null default 0,
  level     integer not null default 1,
  atualizado_em timestamptz not null default now()
);
alter table public.progress enable row level security;

drop policy if exists progress_meu on public.progress;
create policy progress_meu on public.progress
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- O ranking não pode vazar e-mail. Devolve só nome de exibição e XP, e
-- só para quem tem acesso ativo.
create or replace function public.get_ranking(p_limit integer default 50)
returns table (display_name text, xp integer, level integer)
language sql stable security definer set search_path = public as $$
  select coalesce(pr.display_name, 'Membro') as display_name, pg.xp, pg.level
  from public.progress pg
  join public.profiles pr on pr.user_id = pg.user_id
  where public.tem_acesso()
  order by pg.xp desc
  limit greatest(1, least(coalesce(p_limit, 50), 200));
$$;
grant execute on function public.get_ranking(integer) to authenticated;

-- =====================================================================
-- 3. CONTEÚDO PUBLICADO PELA MENTORA
--    Leitura: quem tem acesso. Escrita: só mentora.
-- =====================================================================
create table if not exists public.audios (
  id          uuid primary key default gen_random_uuid(),
  data        date not null default current_date,
  titulo      text,
  url         text not null,
  transcricao text,
  created_at  timestamptz not null default now()
);
create table if not exists public.videos (
  id         uuid primary key default gen_random_uuid(),
  titulo     text not null,
  url        text not null,
  descricao  text,
  created_at timestamptz not null default now()
);
create table if not exists public.eventos (
  id         uuid primary key default gen_random_uuid(),
  titulo     text not null,
  descricao  text,
  quando     timestamptz,
  local      text,
  cidade     text,
  uf         text,
  online     boolean not null default false,
  link       text,
  capa_url   text,
  created_at timestamptz not null default now()
);
alter table public.audios  enable row level security;
alter table public.videos  enable row level security;
alter table public.eventos enable row level security;

do $$
declare t text;
begin
  foreach t in array array['audios','videos','eventos'] loop
    execute format('drop policy if exists %I_le on public.%I', t, t);
    execute format($f$create policy %I_le on public.%I
      for select to authenticated using (public.tem_acesso())$f$, t, t);
    execute format('drop policy if exists %I_mentora on public.%I', t, t);
    execute format($f$create policy %I_mentora on public.%I
      for all to authenticated
      using (public.eh_mentora()) with check (public.eh_mentora())$f$, t, t);
  end loop;
end $$;

-- =====================================================================
-- 4. CONTEÚDO ENVIADO PELO ALUNO
-- =====================================================================

-- ---------------------------------------------------------------------
-- caixinha: a pessoa vê a própria pergunta; a mentora vê todas e é a
-- única que responde. O asker_email só chega para a mentora, porque o
-- aluno só enxerga a própria linha.
-- ---------------------------------------------------------------------
create table if not exists public.caixinha (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  asker_email text,
  pergunta    text not null,
  resposta    text,
  respondida  boolean not null default false,
  midia_url   text,
  midia_tipo  text,
  answered_at timestamptz,
  created_at  timestamptz not null default now()
);
alter table public.caixinha enable row level security;

drop policy if exists caixinha_le on public.caixinha;
create policy caixinha_le on public.caixinha
  for select to authenticated
  using ((user_id = auth.uid() and public.tem_acesso()) or public.eh_mentora());

drop policy if exists caixinha_insere on public.caixinha;
create policy caixinha_insere on public.caixinha
  for insert to authenticated
  with check (user_id = auth.uid() and public.tem_acesso());

drop policy if exists caixinha_responde on public.caixinha;
create policy caixinha_responde on public.caixinha
  for update to authenticated
  using (public.eh_mentora()) with check (public.eh_mentora());

-- ---------------------------------------------------------------------
-- provas: o cofre de evidências. Própria, ou tudo para a mentora.
-- ---------------------------------------------------------------------
create table if not exists public.provas (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  semana     integer,
  tipo       text,
  titulo     text,
  texto      text,
  numero     numeric,
  marco      boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.provas enable row level security;

drop policy if exists provas_le on public.provas;
create policy provas_le on public.provas
  for select to authenticated
  using ((user_id = auth.uid() and public.tem_acesso())
         or (public.eh_mentora() and not public.bloqueado(user_id)));

drop policy if exists provas_minhas on public.provas;
create policy provas_minhas on public.provas
  for insert to authenticated
  with check (user_id = auth.uid() and public.tem_acesso());

drop policy if exists provas_apaga on public.provas;
create policy provas_apaga on public.provas
  for delete to authenticated
  using (user_id = auth.uid() or public.eh_mentora());

-- ---------------------------------------------------------------------
-- membros: o mapa. Só aparece quem marcou visivel, e some quem foi
-- bloqueado. O opt-in é explícito no app.
-- ---------------------------------------------------------------------
create table if not exists public.membros (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  nome          text,
  cidade        text,
  uf            text,
  negocio       text,
  area          text,
  contato       text,
  lat           double precision,
  lng           double precision,
  visivel       boolean not null default false,
  atualizado_em timestamptz not null default now()
);
alter table public.membros enable row level security;

drop policy if exists membros_le on public.membros;
create policy membros_le on public.membros
  for select to authenticated
  using (user_id = auth.uid()
         or (visivel = true and public.tem_acesso() and not public.bloqueado(user_id)));

drop policy if exists membros_meu on public.membros;
create policy membros_meu on public.membros
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- presencas e galeria
-- ---------------------------------------------------------------------
create table if not exists public.presencas (
  evento_id  uuid not null references public.eventos(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  nome       text,
  status     text not null default 'vou' check (status in ('vou','talvez','nao')),
  criado_em  timestamptz not null default now(),
  primary key (evento_id, user_id)
);
alter table public.presencas enable row level security;

drop policy if exists presencas_le on public.presencas;
create policy presencas_le on public.presencas
  for select to authenticated
  using (public.tem_acesso() and not public.bloqueado(user_id));

drop policy if exists presencas_minha on public.presencas;
create policy presencas_minha on public.presencas
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and public.tem_acesso());

create table if not exists public.galeria (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  url        text not null,
  legenda    text,
  autor      text,
  evento_id  uuid references public.eventos(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.galeria enable row level security;

drop policy if exists galeria_le on public.galeria;
create policy galeria_le on public.galeria
  for select to authenticated
  using (public.tem_acesso() and not public.bloqueado(user_id));

drop policy if exists galeria_insere on public.galeria;
create policy galeria_insere on public.galeria
  for insert to authenticated
  with check (user_id = auth.uid() and public.tem_acesso());

drop policy if exists galeria_apaga on public.galeria;
create policy galeria_apaga on public.galeria
  for delete to authenticated
  using (user_id = auth.uid() or public.eh_mentora());

-- =====================================================================
-- 5. MODERAÇÃO (exigida pelas duas lojas)
-- =====================================================================
create table if not exists public.termos (
  user_id   uuid not null references auth.users(id) on delete cascade,
  versao    text not null,
  aceito_em timestamptz not null default now(),
  primary key (user_id, versao)
);
alter table public.termos enable row level security;

drop policy if exists termos_meu on public.termos;
create policy termos_meu on public.termos
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.denuncias (
  id             uuid primary key default gen_random_uuid(),
  denunciante_id uuid default auth.uid() references auth.users(id) on delete set null,
  alvo_tipo      text not null check (alvo_tipo in ('galeria','prova','membro','caixinha','outro')),
  alvo_id        text,
  alvo_user_id   uuid references auth.users(id) on delete set null,
  motivo         text,
  -- o relato de quem denunciou: é o que permite decidir em minutos
  detalhe        text,
  status         text not null default 'pendente'
                 check (status in ('pendente','analisada','removida','arquivada','conta_suspensa','sem_violacao')),
  -- o que a mentora decidiu e por quê: a trilha da moderação
  nota           text,
  created_at     timestamptz not null default now(),
  tratada_em     timestamptz
);
alter table public.denuncias enable row level security;

drop policy if exists denuncias_le on public.denuncias;
create policy denuncias_le on public.denuncias
  for select to authenticated
  using (denunciante_id = auth.uid() or public.eh_mentora());

drop policy if exists denuncias_insere on public.denuncias;
create policy denuncias_insere on public.denuncias
  for insert to authenticated
  with check (denunciante_id = auth.uid());

drop policy if exists denuncias_mentora on public.denuncias;
create policy denuncias_mentora on public.denuncias
  for update to authenticated
  using (public.eh_mentora()) with check (public.eh_mentora());

-- =====================================================================
-- 6. COBRANÇA (o app nunca lê: sem policy de select para authenticated)
-- =====================================================================
create table if not exists public.parcelas (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete set null,
  email         text not null,
  external_ref  text not null,
  numero        integer not null default 1,
  vencimento    date,
  valor         numeric(12,2),
  status        text not null default 'aberta',
  atualizado_em timestamptz not null default now(),
  criado_em     timestamptz not null default now()
);
-- a chave da idempotência do webhook: mesmo evento duas vezes não duplica
create unique index if not exists parcelas_ref_uk
  on public.parcelas (external_ref, numero);
create index if not exists parcelas_email_ix on public.parcelas (lower(email));
alter table public.parcelas enable row level security;
-- nenhuma policy: só service_role enxerga

create table if not exists public.webhook_log (
  id          uuid primary key default gen_random_uuid(),
  origem      text not null,
  payload     jsonb,
  recebido_em timestamptz not null default now(),
  processado  boolean not null default false,
  erro        text
);
alter table public.webhook_log enable row level security;
-- nenhuma policy: só service_role

-- =====================================================================
-- 7. PUSH
-- =====================================================================
create table if not exists public.push_tokens (
  user_id       uuid not null references auth.users(id) on delete cascade,
  token         text not null,
  plataforma    text,
  atualizado_em timestamptz not null default now(),
  primary key (user_id, token)
);
alter table public.push_tokens enable row level security;

drop policy if exists push_meu on public.push_tokens;
create policy push_meu on public.push_tokens
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- =====================================================================
-- 8. STORAGE
--   audios: leitura pública, porque o player usa getPublicUrl
--   midia:  foto de galeria e resposta em áudio ou vídeo da caixinha
-- =====================================================================
insert into storage.buckets (id, name, public) values ('audios','audios', true)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('midia','midia', true)
  on conflict (id) do nothing;

drop policy if exists audios_le on storage.objects;
create policy audios_le on storage.objects
  for select to public using (bucket_id = 'audios');

drop policy if exists audios_envia on storage.objects;
create policy audios_envia on storage.objects
  for insert to authenticated
  with check (bucket_id = 'audios' and public.eh_mentora());

drop policy if exists audios_apaga on storage.objects;
create policy audios_apaga on storage.objects
  for delete to authenticated
  using (bucket_id = 'audios' and public.eh_mentora());

-- no bucket midia o caminho começa com o uuid do dono: user_id/arquivo
drop policy if exists midia_le on storage.objects;
create policy midia_le on storage.objects
  for select to public using (bucket_id = 'midia');

drop policy if exists midia_envia on storage.objects;
create policy midia_envia on storage.objects
  for insert to authenticated
  with check (bucket_id = 'midia'
              and (storage.foldername(name))[1] = auth.uid()::text
              and public.tem_acesso());

drop policy if exists midia_apaga on storage.objects;
create policy midia_apaga on storage.objects
  for delete to authenticated
  using (bucket_id = 'midia'
         and ((storage.foldername(name))[1] = auth.uid()::text or public.eh_mentora()));

-- =====================================================================
-- 9. EXCLUSÃO DE CONTA (exigida pelas duas lojas)
--   Apaga o que é pessoal e anonimiza o que precisa sobreviver por
--   obrigação fiscal. Roda como o próprio usuário, nunca com id de fora.
-- =====================================================================
create or replace function public.excluir_minha_conta()
returns void
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  anon text;
begin
  if uid is null then raise exception 'sem sessão'; end if;
  anon := 'removido+' || replace(uid::text,'-','') || '@invalido.local';

  delete from storage.objects
    where bucket_id = 'midia' and (storage.foldername(name))[1] = uid::text;

  delete from public.push_tokens where user_id = uid;
  delete from public.bloqueios   where user_id = uid or bloqueado_id = uid;
  delete from public.termos      where user_id = uid;
  delete from public.presencas   where user_id = uid;
  delete from public.galeria     where user_id = uid;
  delete from public.membros     where user_id = uid;
  delete from public.provas      where user_id = uid;
  delete from public.caixinha    where user_id = uid;
  delete from public.progress    where user_id = uid;

  update public.denuncias set denunciante_id = null where denunciante_id = uid;
  update public.profiles  set email = anon, display_name = 'Conta removida',
                              full_name = null where user_id = uid;

  -- histórico fiscal fica, sem dado pessoal e sem vínculo com a conta
  update public.access   set email = anon, user_id = null, status = 'inactive'
    where user_id = uid;
  update public.parcelas set email = anon, user_id = null where user_id = uid;

  delete from auth.users where id = uid;
end $$;
grant execute on function public.excluir_minha_conta() to authenticated;

-- =====================================================================
-- 10. CORTE ESCALONADO POR INADIMPLÊNCIA
--   1 a 5 dias  : active  (boleto compensa em até 3 dias úteis)
--   6 a 10 dias : grace   (app funciona, com faixa de aviso)
--   11 em diante: inactive
--   O cron nunca reativa: reativação só por webhook de pagamento.
-- =====================================================================
create or replace function public.aplicar_regua_inadimplencia()
returns void
language plpgsql security definer set search_path = public as $$
begin
  with atraso as (
    select p.email, max(current_date - p.vencimento) as dias
    from public.parcelas p
    where p.status in ('aberta','vencida')
      and p.vencimento is not null
      and p.vencimento < current_date
    group by p.email
  )
  update public.access a
     set status = case
           when t.dias between 1 and 5   then 'active'
           when t.dias between 6 and 10  then 'grace'
           else 'inactive' end,
         expires_at = case
           when t.dias between 6 and 10
             then (current_date + (11 - t.dias))::timestamptz
           else a.expires_at end,
         atualizado_em = now()
    from atraso t
   where lower(a.email) = lower(t.email)
     and a.status <> 'inactive';
end $$;

create extension if not exists pg_cron;
select cron.unschedule('regua-inadimplencia')
  where exists (select 1 from cron.job where jobname = 'regua-inadimplencia');
select cron.schedule('regua-inadimplencia', '17 6 * * *',
  $$select public.aplicar_regua_inadimplencia();$$);

-- =====================================================================
-- 11. REALTIME em access: é o que fecha o app ao vivo quando o status cai
-- =====================================================================
do $$
begin
  alter publication supabase_realtime add table public.access;
exception when duplicate_object then null;
end $$;

-- =====================================================================
-- 12. DEPOIS DE RODAR, FAZER À MÃO
--   a) marcar a conta da mentora:
--      update public.profiles set is_mentor = true where email = 'SEU@EMAIL';
--   b) conferir se o Realtime aparece ligado no painel, em Database > Publications
-- =====================================================================
