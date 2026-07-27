-- =====================================================================
-- Operação Blindada · camada conectada (2407.16)
-- Cole isto no Supabase (SQL Editor) e rode uma vez.
-- Cria: mídia na caixinha, mapa de membros, encontros, presenças, galeria.
-- Tudo com RLS: cada pessoa só mexe no que é dela; a mentora administra.
-- =====================================================================

-- Quem é mentora: a coluna is_mentor já existe no seu perfil.
-- Helper para não repetir a verificação em cada política.
create or replace function public.eh_mentora()
returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select p.is_mentor from public.profiles p where p.id = auth.uid()), false);
$$;

-- ---------------------------------------------------------------------
-- 1) CAIXINHA: resposta por áudio ou vídeo
-- ---------------------------------------------------------------------
alter table public.caixinha add column if not exists midia_url  text;
alter table public.caixinha add column if not exists midia_tipo text;

-- ---------------------------------------------------------------------
-- 2) MAPA DE MEMBROS (só aparece quem marcou visivel = true)
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
create index if not exists membros_visivel_idx on public.membros (visivel);
create index if not exists membros_cidade_idx  on public.membros (lower(cidade));

alter table public.membros enable row level security;

drop policy if exists membros_leitura on public.membros;
create policy membros_leitura on public.membros
  for select to authenticated
  using (visivel = true or user_id = auth.uid());   -- só quem se expôs, mais o próprio

drop policy if exists membros_insere on public.membros;
create policy membros_insere on public.membros
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists membros_atualiza on public.membros;
create policy membros_atualiza on public.membros
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists membros_apaga on public.membros;
create policy membros_apaga on public.membros
  for delete to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- 3) ENCONTROS (só a mentora cria; todo mundo lê)
-- ---------------------------------------------------------------------
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
create index if not exists eventos_quando_idx on public.eventos (quando);

alter table public.eventos enable row level security;

drop policy if exists eventos_leitura on public.eventos;
create policy eventos_leitura on public.eventos for select to authenticated using (true);

drop policy if exists eventos_mentora on public.eventos;
create policy eventos_mentora on public.eventos
  for all to authenticated using (public.eh_mentora()) with check (public.eh_mentora());

-- ---------------------------------------------------------------------
-- 4) PRESENÇAS (cada pessoa marca a sua)
-- ---------------------------------------------------------------------
create table if not exists public.presencas (
  evento_id uuid not null references public.eventos(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  nome      text,
  status    text not null default 'vou',
  criado_em timestamptz not null default now(),
  primary key (evento_id, user_id)
);

alter table public.presencas enable row level security;

drop policy if exists presencas_leitura on public.presencas;
create policy presencas_leitura on public.presencas for select to authenticated using (true);

drop policy if exists presencas_minha on public.presencas;
create policy presencas_minha on public.presencas
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- 5) GALERIA (membro publica a sua; mentora modera)
-- ---------------------------------------------------------------------
create table if not exists public.galeria (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  url        text not null,
  legenda    text,
  autor      text,
  evento_id  uuid references public.eventos(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists galeria_data_idx on public.galeria (created_at desc);

alter table public.galeria enable row level security;

drop policy if exists galeria_leitura on public.galeria;
create policy galeria_leitura on public.galeria for select to authenticated using (true);

drop policy if exists galeria_insere on public.galeria;
create policy galeria_insere on public.galeria
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists galeria_apaga on public.galeria;
create policy galeria_apaga on public.galeria
  for delete to authenticated using (user_id = auth.uid() or public.eh_mentora());

-- ---------------------------------------------------------------------
-- 6) BUCKETS de arquivo
--    "midia"   = áudio e vídeo das respostas da caixinha
--    "galeria" = fotos da comunidade
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('midia','midia',true), ('galeria','galeria',true)
on conflict (id) do nothing;

drop policy if exists midia_le on storage.objects;
create policy midia_le on storage.objects
  for select to public using (bucket_id in ('midia','galeria','audios'));

drop policy if exists midia_envia on storage.objects;
create policy midia_envia on storage.objects
  for insert to authenticated
  with check (bucket_id in ('midia','galeria') and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists midia_apaga on storage.objects;
create policy midia_apaga on storage.objects
  for delete to authenticated
  using (bucket_id in ('midia','galeria') and ((storage.foldername(name))[1] = auth.uid()::text or public.eh_mentora()));

-- Pronto. O app detecta as tabelas sozinho: se algo faltar, ele cai no
-- modo local sem quebrar.

-- ---------------------------------------------------------------------
-- 7) AULAS DA SEMANA (2 vídeos por semana; só a mentora publica)
-- ---------------------------------------------------------------------
create table if not exists public.videos (
  id         uuid primary key default gen_random_uuid(),
  titulo     text not null,
  url        text not null,
  descricao  text,
  created_at timestamptz not null default now()
);
create index if not exists videos_data_idx on public.videos (created_at desc);

alter table public.videos enable row level security;

drop policy if exists videos_leitura on public.videos;
create policy videos_leitura on public.videos for select to authenticated using (true);

drop policy if exists videos_mentora on public.videos;
create policy videos_mentora on public.videos
  for all to authenticated using (public.eh_mentora()) with check (public.eh_mentora());

-- ---------------------------------------------------------------------
-- 8) PROVAS DO ALUNO (a evidência de que o método funcionou)
--    Uma prova por semana, doze marcos no ano. O aluno vê só as dele;
--    a mentora vê todas, porque é o painel de resultado da mentoria.
-- ---------------------------------------------------------------------
create table if not exists public.provas (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  semana     int,
  tipo       text,          -- numero | documento | foto | relato
  titulo     text,
  texto      text,
  numero     numeric,
  marco      boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists provas_user_idx on public.provas (user_id, created_at desc);
create index if not exists provas_semana_idx on public.provas (semana);

alter table public.provas enable row level security;

drop policy if exists provas_minhas on public.provas;
create policy provas_minhas on public.provas
  for all to authenticated
  using (user_id = auth.uid() or public.eh_mentora())
  with check (user_id = auth.uid());
