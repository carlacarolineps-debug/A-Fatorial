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
  avatar_url   text,
  is_mentor    boolean not null default false,
  criado_em    timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
-- para quem já rodou uma versão anterior deste arquivo: a coluna da foto
-- nasceu depois, e create table if not exists não acrescenta coluna nenhuma
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles enable row level security;

-- mentoras: a lista de quem manda. Fica em tabela, e não numa coluna que
-- o cliente possa escrever, porque coluna do cliente é coluna que um dia
-- alguém escreve. Sem policy nenhuma: com RLS ligado e zero policy, nem
-- ler nem gravar acontece pela chave anon. Só o SQL Editor e a
-- service_role enxergam.
create table if not exists public.mentoras (
  email      text primary key,
  criado_em  timestamptz not null default now()
);
alter table public.mentoras enable row level security;

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
-- A identidade de réplica precisa existir ANTES do primeiro update, e não
-- depois. No Supabase a publicação supabase_realtime nasce como FOR ALL
-- TABLES: a tabela passa a publicar atualizações no instante em que é
-- criada, muito antes de a gente chegar na linha que configura a
-- identidade. Sem esta linha aqui em cima, o primeiro update do arquivo
-- morre com "cannot update table because it does not have a replica
-- identity", e o schema inteiro para na linha 91.
-- "full" funciona sem depender de índice nenhum. Mais abaixo, quando o
-- único já existir, ela é trocada pela versão barata (por índice).
alter table public.access replica identity full;

-- O único tem que ser sobre a COLUNA, não sobre lower(email). Índice de
-- expressão não casa com "on conflict (email)", e o webhook grava assim:
-- todo upsert morreria com "no unique or exclusion constraint matching",
-- ou seja, quem paga nunca receberia acesso. Falha silenciosa e cara.
-- Para o único simples valer, o e-mail entra sempre normalizado.
create or replace function public.normaliza_email_access()
returns trigger language plpgsql set search_path = public as $$
begin
  new.email := lower(btrim(new.email));
  return new;
end $$;

drop trigger if exists access_normaliza on public.access;
create trigger access_normaliza before insert or update on public.access
  for each row execute function public.normaliza_email_access();

do $$
declare dup int;
begin
  update public.access set email = lower(btrim(email))
   where email is distinct from lower(btrim(email));
  select count(*) into dup
    from (select lower(email) e from public.access group by 1 having count(*) > 1) x;
  if dup > 0 then
    -- não apaga nada por conta própria: avisa e para
    raise exception 'access tem % e-mail(s) repetido(s) por diferenca de caixa. Rode: select lower(email), count(*) from public.access group by 1 having count(*) > 1;', dup;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'access_email_uk2') then
    alter table public.access add constraint access_email_uk2 unique (email);
  end if;
end $$;
drop index if exists public.access_email_uk;

-- Agora que o único existe, a identidade sai do "full" (que copia a linha
-- inteira em cada update) para o índice, que é o suficiente e mais barato.
-- Sem identidade nenhuma, TODO update em access falharia: o webhook não
-- liberaria acesso, a régua não cortaria e a suspensão de conta não
-- funcionaria. Tudo de uma vez, e calado.
alter table public.access replica identity using index access_email_uk2;

create index if not exists access_user_ix on public.access (user_id);
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
    where (a.user_id = auth.uid()
           or lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', '')))
      and (a.status = 'active'
           or (a.status = 'grace' and a.expires_at is not null and a.expires_at > now()))
  );
$$;

-- A autoridade é a lista, não a coluna. Antes isto lia profiles.is_mentor,
-- que o próprio cliente consegue gravar na hora em que a linha do perfil
-- nasce. A coluna continua existindo, mas só para a interface saber o que
-- desenhar: quem decide permissão é esta função, e ela olha a lista.
create or replace function public.eh_mentora()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.mentoras m
     where lower(m.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
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
grant  update (email, display_name, full_name, avatar_url, atualizado_em)
  on public.profiles to authenticated;

-- E o mesmo vale para o INSERT, que estava aberto. A policy de insert só
-- confere de quem é a linha (user_id = auth.uid()), não o que vai dentro
-- dela. Como a linha do perfil nasce no primeiro login, bastava criar a
-- própria linha já com is_mentor = true, fora do app, direto na API com a
-- chave anon, e a conta virava mentora: leria a caixinha inteira com o
-- e-mail de todas, veria todas as provas, apagaria fotos e suspenderia
-- contas. Escalada de privilégio, e em uma chamada só.
revoke insert on public.profiles from authenticated;
grant  insert (user_id, email, display_name, full_name, avatar_url)
  on public.profiles to authenticated;

-- ---------------------------------------------------------------------
-- access: a fonte da verdade sobre quem entra.
-- Escrita só por service_role (webhook e cron). Leitura só da própria
-- linha, por user_id. O e-mail fica para o webhook casar quem paga antes
-- de existir conta.
-- ---------------------------------------------------------------------
-- A leitura casa por user_id OU pelo e-mail do próprio token. Sem a segunda
-- metade, a linha que o webhook cria antes de a conta existir (só com
-- e-mail) fica invisível para a própria dona: ela paga, entra, e o app diz
-- que não há acesso. O e-mail vem do JWT assinado pelo Supabase, então não
-- é palpite do cliente.
drop policy if exists access_le_propria on public.access;
create policy access_le_propria on public.access
  for select to authenticated
  using (user_id = auth.uid()
         or lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));
-- sem policy de insert/update/delete: o cliente nunca escreve aqui direto.
-- As duas escritas legítimas passam por função com dono definido, abaixo.

-- ---------------------------------------------------------------------
-- casar_meu_acesso: gruda o user_id na linha que nasceu só com e-mail.
-- Roda no primeiro login. É a única escrita que o aluno provoca em access,
-- e ela não consegue mexer no status: a função só escreve user_id.
-- ---------------------------------------------------------------------
create or replace function public.casar_meu_acesso()
returns boolean
language plpgsql volatile security definer set search_path = public as $$
declare mail text;
begin
  mail := lower(coalesce(auth.jwt() ->> 'email', ''));
  if auth.uid() is null or mail = '' then return false; end if;
  update public.access
     set user_id = auth.uid(), atualizado_em = now()
   where lower(email) = mail and user_id is distinct from auth.uid();
  return found;
end $$;
grant execute on function public.casar_meu_acesso() to authenticated;

-- ---------------------------------------------------------------------
-- suspender_membro: o que o botão "Suspender a conta" do painel de
-- moderação precisa para existir de verdade. Sem isto ele não faz nada,
-- e é justamente o que a revisão das lojas vai testar.
-- A checagem de mentora acontece DENTRO da função, não na chamada.
-- ---------------------------------------------------------------------
create or replace function public.suspender_membro(p_alvo uuid)
returns boolean
language plpgsql volatile security definer set search_path = public as $$
begin
  if not public.eh_mentora() then
    raise exception 'apenas a mentoria pode suspender uma conta';
  end if;
  if p_alvo is null or p_alvo = auth.uid() then return false; end if;
  update public.access
     set status = 'inactive', atualizado_em = now()
   where user_id = p_alvo;
  update public.membros set visivel = false where user_id = p_alvo;
  return true;
end $$;
grant execute on function public.suspender_membro(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- user_id_por_email: o webhook precisa achar a conta de quem já existe.
-- A API de administração só lista por página, e a partir de algumas
-- centenas de alunas a busca passaria a errar em silêncio. Aqui é uma
-- consulta direta, e só o service_role pode chamar.
-- ---------------------------------------------------------------------
create or replace function public.user_id_por_email(p_email text)
returns uuid
language sql stable security definer set search_path = public, auth as $$
  select u.id from auth.users u
   where lower(u.email) = lower(p_email)
   order by u.created_at limit 1;
$$;
revoke execute on function public.user_id_por_email(text) from public, anon, authenticated;
grant  execute on function public.user_id_por_email(text) to service_role;

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
-- A posição precisa vir do banco: o app imprime r.posicao, e sem a coluna
-- todo mundo fora do pódio aparecia como "undefined º". O eu_sou também vem
-- daqui, porque marcar pelo XP destacava qualquer pessoa empatada como se
-- fosse a própria usuária.
-- create or replace não muda a assinatura de uma função: precisa dropar.
-- Isto não apaga dado nenhum, só a definição que este mesmo arquivo criou.
drop function if exists public.get_ranking(integer);
create function public.get_ranking(p_limit integer default 50)
returns table (posicao bigint, display_name text, xp integer, level integer, eu_sou boolean)
language sql stable security definer set search_path = public as $$
  select row_number() over (order by pg.xp desc, pr.display_name),
         coalesce(pr.display_name, 'Membro'),
         pg.xp, pg.level,
         (pg.user_id = auth.uid())
  from public.progress pg
  join public.profiles pr on pr.user_id = pg.user_id
  where public.tem_acesso()
  order by pg.xp desc
  limit greatest(1, least(coalesce(p_limit, 50), 200));
$$;
revoke execute on function public.get_ranking(integer) from public, anon;
grant  execute on function public.get_ranking(integer) to authenticated;

-- ---------------------------------------------------------------------
-- remover_conteudo: o que faz o botão "Removi o conteúdo" ser verdade.
-- Antes ele só marcava a denúncia como resolvida e a foto continuava lá
-- para todo mundo, que é exatamente o teste que as lojas fazem.
-- A mentora pode apagar foto pela policy, mas não pode esconder o cartão
-- de um membro (aquela tabela só aceita o dono), então as duas ações
-- passam por aqui, com a checagem dentro da função.
-- ---------------------------------------------------------------------
create or replace function public.remover_conteudo(p_tipo text, p_id text)
returns boolean
language plpgsql volatile security definer set search_path = public as $$
begin
  if not public.eh_mentora() then
    raise exception 'apenas a mentoria pode remover conteudo';
  end if;
  if p_id is null or p_id = '' then return false; end if;
  if p_tipo = 'galeria' then
    delete from public.galeria where id = p_id::uuid;
  elsif p_tipo = 'caixinha' then
    delete from public.caixinha where id = p_id::uuid;
  elsif p_tipo = 'membro' then
    update public.membros set visivel = false where user_id = p_id::uuid;
  else
    return false;
  end if;
  return true;
exception when invalid_text_representation then
  return false;   -- id que não é uuid: não derruba o painel
end $$;
grant execute on function public.remover_conteudo(text, text) to authenticated;

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
--   audios:   leitura pública, porque o player usa getPublicUrl
--   midia:    foto de galeria e resposta em áudio ou vídeo da caixinha
--   avatares: a foto do perfil, uma por pessoa
-- =====================================================================
insert into storage.buckets (id, name, public) values ('audios','audios', true)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('midia','midia', true)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('avatares','avatares', true)
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

-- avatares: mesma regra de pasta por dono. A foto de perfil aparece para
-- as outras pessoas (ranking, comunidade), então a leitura é pública; a
-- escrita é só na própria pasta. O update existe porque trocar a foto
-- reaproveita o mesmo caminho, e sem ele a segunda troca falharia.
drop policy if exists avatares_le on storage.objects;
create policy avatares_le on storage.objects
  for select to public using (bucket_id = 'avatares');

drop policy if exists avatares_envia on storage.objects;
create policy avatares_envia on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatares'
              and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists avatares_troca on storage.objects;
create policy avatares_troca on storage.objects
  for update to authenticated
  using (bucket_id = 'avatares'
         and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatares'
              and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists avatares_apaga on storage.objects;
create policy avatares_apaga on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatares'
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
    where bucket_id in ('midia','avatares')
      and (storage.foldername(name))[1] = uid::text;

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
                              full_name = null, avatar_url = null
    where user_id = uid;

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
/* Ela e security definer e ESCREVE em access: quem puder executar, corta
   ou devolve acesso. Por padrao o Postgres da EXECUTE para PUBLIC em toda
   funcao nova, entao sem estas duas linhas qualquer pessoa logada (e ate
   a chave anon) poderia disparar a regua. Quem chama e o cron, e o cron
   roda como dono do banco. */
revoke execute on function public.aplicar_regua_inadimplencia() from public, anon, authenticated;


-- ---------------------------------------------------------------------
-- A régua roda sozinha uma vez por dia, pelo pg_cron.
--
-- Este bloco é OPCIONAL de propósito. O pg_cron nem sempre está ligado no
-- projeto, e quando não está, um "create extension" solto derruba o
-- arquivo inteiro na primeira linha: as 18 tabelas não seriam criadas por
-- causa de um agendamento. Aqui, se ele não existir, o schema avisa e
-- segue. Para ligar depois: Database, Extensions, procure pg_cron e
-- ligue, e então rode este arquivo de novo.
-- ---------------------------------------------------------------------
do $$
begin
  begin
    create extension if not exists pg_cron;
  exception when others then
    raise notice 'pg_cron nao disponivel (%). O schema segue: a regua de inadimplencia fica sem agendamento automatico. Para ligar: Database > Extensions > pg_cron, e rode este arquivo de novo.', SQLERRM;
    return;
  end;

  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    begin
      perform cron.unschedule('regua-inadimplencia')
        where exists (select 1 from cron.job where jobname = 'regua-inadimplencia');
      perform cron.schedule('regua-inadimplencia', '17 6 * * *',
        $cron$select public.aplicar_regua_inadimplencia();$cron$);
      raise notice 'regua de inadimplencia agendada para 06:17 UTC (03:17 no Brasil).';
    exception when others then
      raise notice 'nao consegui agendar a regua (%). O schema segue normalmente.', SQLERRM;
    end;
  end if;
end $$;

-- =====================================================================
-- 11. REALTIME em access: é o que fecha o app ao vivo quando o status cai
-- =====================================================================
-- Três situações possíveis, e as três terminam bem:
--   1. a tabela ainda não está publicada: entra agora;
--   2. já está publicada: duplicate_object, e não há nada a fazer;
--   3. a publicação é FOR ALL TABLES (o padrão de muitos projetos
--      Supabase): não dá para acrescentar tabela numa publicação assim,
--      e nem precisa, porque ela já publica tudo.
-- O 3 devolve um erro diferente do 2, então o exception tem que ser
-- "others": com "duplicate_object" apenas, o arquivo morria aqui.
do $$
begin
  alter publication supabase_realtime add table public.access;
  raise notice 'access entrou na publicacao do Realtime.';
exception
  when duplicate_object then null;
  when others then
    raise notice 'nao precisei mexer na publicacao do Realtime (%). O schema segue.', SQLERRM;
end $$;

-- =====================================================================
-- 12. A CONTA DA MENTORA, SEM PASSO MANUAL
-- Antes isto era um lembrete no fim do arquivo, e lembrete no fim do
-- arquivo é o que se esquece. Agora o próprio schema resolve:
--   1. o acesso já entra ativo, mesmo antes de a conta existir;
--   2. quando a conta aparecer (primeiro login), o gatilho marca mentora.
-- Para acrescentar outra pessoa, é só incluir o e-mail na lista abaixo e
-- rodar o arquivo de novo.
-- =====================================================================
insert into public.mentoras (email) values ('gestaogrupoa@gmail.com')
on conflict (email) do nothing;

-- acesso da mentora, já ativo, mesmo antes de ela entrar pela primeira vez
insert into public.access (email, status)
select m.email, 'active' from public.mentoras m
on conflict (email) do update set status = 'active', atualizado_em = now();

-- o gatilho que marca a conta assim que ela nasce
create or replace function public.marca_mentora()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.mentoras m where lower(m.email) = lower(new.email)) then
    new.is_mentor := true;
  end if;
  return new;
end $$;

drop trigger if exists profiles_marca_mentora on public.profiles;
create trigger profiles_marca_mentora
  before insert or update of email on public.profiles
  for each row execute function public.marca_mentora();

-- e, se a conta já existir de um login anterior, marca agora
update public.profiles p set is_mentor = true
 from public.mentoras m
where lower(p.email) = lower(m.email) and p.is_mentor is distinct from true;

-- =====================================================================
-- 13. A ÁREA DE ADMIN
-- Tudo que a mentora precisa fazer sem abrir o Supabase: liberar aluna,
-- encerrar acesso, ver quem está dentro e acompanhar o movimento.
--
-- A regra continua a mesma: o cliente NUNCA escreve em access. Cada ação
-- passa por uma função com dono definido, que confere eh_mentora() dentro
-- dela. Assim o botão do painel não decide permissão, ele só pede.
-- =====================================================================

-- a mentora precisa LER a tabela de acesso para o painel existir
drop policy if exists access_le_mentora on public.access;
create policy access_le_mentora on public.access
  for select to authenticated using (public.eh_mentora());

-- e precisa ver o progresso para acompanhar, que é o que a política de
-- privacidade do app já diz, com todas as letras
drop policy if exists progress_mentora on public.progress;
create policy progress_mentora on public.progress
  for select to authenticated using (public.eh_mentora());

-- ---------------------------------------------------------------------
-- liberar_acesso: a aluna que pagou por fora, ou o caso que a mentora
-- resolve na mão. Cria a linha se não existir, reativa se existir.
-- ---------------------------------------------------------------------
create or replace function public.liberar_acesso(p_email text)
returns text
language plpgsql volatile security definer set search_path = public as $$
declare mail text;
begin
  if not public.eh_mentora() then
    raise exception 'apenas a mentoria pode liberar acesso';
  end if;
  mail := lower(btrim(coalesce(p_email, '')));
  if mail = '' or mail not like '%@%.%' then return 'e-mail invalido'; end if;
  insert into public.access (email, status) values (mail, 'active')
  on conflict (email) do update set status = 'active', atualizado_em = now();
  return 'liberado';
end $$;
grant execute on function public.liberar_acesso(text) to authenticated;

-- ---------------------------------------------------------------------
-- encerrar_acesso: o contrário, e sem apagar nada. O progresso da pessoa
-- continua guardado: se ela voltar, volta de onde parou.
-- ---------------------------------------------------------------------
create or replace function public.encerrar_acesso(p_email text)
returns text
language plpgsql volatile security definer set search_path = public as $$
declare mail text;
begin
  if not public.eh_mentora() then
    raise exception 'apenas a mentoria pode encerrar acesso';
  end if;
  mail := lower(btrim(coalesce(p_email, '')));
  if exists (select 1 from public.mentoras m where lower(m.email) = mail) then
    return 'nao dá para encerrar o acesso de quem conduz a mentoria';
  end if;
  update public.access set status = 'inactive', atualizado_em = now()
   where email = mail;
  if not found then return 'nao encontrei esse e-mail'; end if;
  update public.membros set visivel = false
   where user_id in (select a.user_id from public.access a where a.email = mail);
  return 'encerrado';
end $$;
grant execute on function public.encerrar_acesso(text) to authenticated;

-- ---------------------------------------------------------------------
-- alunas_admin: a lista do painel, numa consulta só. Sai daqui em vez de
-- o app juntar três tabelas no cliente, porque junção no cliente é junção
-- que um dia vaza uma coluna a mais.
-- ---------------------------------------------------------------------
create or replace function public.alunas_admin(p_busca text default null)
returns table (
  email text, nome text, status text, user_id uuid,
  xp integer, nivel integer, entrou timestamptz, mexeu timestamptz
)
language sql stable security definer set search_path = public as $$
  select a.email,
         coalesce(p.display_name, p.full_name, split_part(a.email, '@', 1)),
         a.status, a.user_id,
         coalesce(g.xp, 0), coalesce(g.level, 1),
         a.criado_em, g.atualizado_em
    from public.access a
    left join public.profiles p on p.user_id = a.user_id
    left join public.progress g on g.user_id = a.user_id
   where public.eh_mentora()
     and (p_busca is null or p_busca = ''
          or a.email ilike '%' || p_busca || '%'
          or coalesce(p.display_name, '') ilike '%' || p_busca || '%')
   order by (a.status = 'active') desc, g.atualizado_em desc nulls last, a.email
   limit 500;
$$;
grant execute on function public.alunas_admin(text) to authenticated;

-- ---------------------------------------------------------------------
-- resumo_admin: os números do topo do painel. Um round trip, não seis.
-- ---------------------------------------------------------------------
create or replace function public.resumo_admin()
returns jsonb
language sql stable security definer set search_path = public as $$
  select case when not public.eh_mentora() then '{}'::jsonb else jsonb_build_object(
    'ativas',      (select count(*) from public.access where status = 'active'),
    'pendentes',   (select count(*) from public.access where status not in ('active')),
    'com_conta',   (select count(*) from public.access where user_id is not null),
    'ativas_7d',   (select count(*) from public.progress where atualizado_em > now() - interval '7 days'),
    'provas',      (select count(*) from public.provas),
    'provas_7d',   (select count(*) from public.provas where created_at > now() - interval '7 days'),
    'perguntas',   (select count(*) from public.caixinha where not respondida),
    'denuncias',   (select count(*) from public.denuncias where status = 'pendente'),
    'audios',      (select count(*) from public.audios),
    'aulas',       (select count(*) from public.videos),
    'encontros',   (select count(*) from public.eventos where quando > now()),
    'xp_medio',    (select coalesce(round(avg(xp)), 0) from public.progress)
  ) end;
$$;
grant execute on function public.resumo_admin() to authenticated;

-- =====================================================================
-- 14. FECHAR O EXECUTE, POR ÚLTIMO
--   O Postgres dá EXECUTE para PUBLIC em toda função nova. Sem este
--   bloco, quem nem está logado pode chamar as funções da mesa pela API
--   com a chave anon. Elas conferem eh_mentora() por dentro, então não
--   havia furo, mas superfície que não serve para nada não deve existir,
--   e é isso que o linter do Supabase aponta.
--   Vem depois de TODAS as funções, de propósito: cada create or replace
--   devolve o EXECUTE para PUBLIC, então rodar isto no meio não adianta.
-- =====================================================================
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as assinatura, p.proname
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
  loop
    execute format('revoke execute on function %s from public, anon', f.assinatura);
    -- as internas não são chamadas pelo app: marca_mentora é gatilho de
    -- tabela, rls_auto_enable é gatilho de evento, e a régua roda pelo cron
    if f.proname in ('marca_mentora','rls_auto_enable','aplicar_regua_inadimplencia') then
      execute format('revoke execute on function %s from authenticated', f.assinatura);
    end if;
  end loop;
end $$;

-- e devolve só o que o app precisa
grant execute on function public.tem_acesso()                to authenticated;
grant execute on function public.eh_mentora()                to authenticated;
grant execute on function public.casar_meu_acesso()          to authenticated;
grant execute on function public.excluir_minha_conta()       to authenticated;
grant execute on function public.suspender_membro(uuid)      to authenticated;
grant execute on function public.remover_conteudo(text,text) to authenticated;
grant execute on function public.liberar_acesso(text)        to authenticated;
grant execute on function public.encerrar_acesso(text)       to authenticated;
grant execute on function public.alunas_admin(text)          to authenticated;
grant execute on function public.resumo_admin()              to authenticated;
grant execute on function public.get_ranking(integer)        to authenticated;
grant execute on function public.bloqueado(uuid)             to authenticated;

-- =====================================================================
-- 15. O QUE NÃO DÁ PARA FAZER POR SQL (fica no painel)
--   a) Authentication > Emails > Templates > Reset Password:
--      o corpo precisa ter {{ .ConfirmationURL }}, senão o link de
--      esqueci a minha senha chega vazio
--   b) Authentication > URL Configuration: a Site URL tem que ser o
--      endereço do app, senão o link do e-mail leva para lugar nenhum
--   c) Authentication > SMTP Settings: o Gmail com a senha de aplicativo
--   d) Edge Functions: publicar liberar-aluna e tmb-webhook, e cadastrar
--      os segredos GMAIL_USER, GMAIL_APP_PASSWORD, APP_URL e
--      TMB_WEBHOOK_SECRET
--   e) conferir o Realtime em Database > Publications
--   f) Authentication > Users > Add user: criar a conta da mentoria.
--      Este arquivo deixa o acesso ativo e a marca de mentora prontos,
--      mas NÃO cria a conta em si: senha vive no schema auth, com hash e
--      linha em auth.identities, e forjar isso por SQL quebra calado.
--      Sem a conta, "Esqueci a minha senha" não manda nada, e a tela diz
--      a mesma coisa de sempre (de propósito: dizer que um e-mail não tem
--      cadastro entrega a lista da turma). Marque Auto Confirm User.
--   Tudo isso está em EMAIL-DA-SENHA.md, tela por tela.
-- =====================================================================
