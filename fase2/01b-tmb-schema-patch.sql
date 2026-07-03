-- =====================================================================
-- OPERAÇÃO BLINDADA — FASE 2 — PATCH DE SCHEMA PARA A TMB
-- Rode no Supabase > SQL Editor DEPOIS do seu 01-supabase-schema.sql.
-- É idempotente: pode rodar de novo sem quebrar nada.
--
-- Não recria suas tabelas (profiles, progress, access, caixinha).
-- Só garante as colunas/estruturas que o webhook da TMB usa.
-- =====================================================================

-- 1) Colunas extras na tabela `access` usadas pelo tmb-webhook
alter table if exists public.access add column if not exists provider     text;
alter table if exists public.access add column if not exists plan         text;
alter table if exists public.access add column if not exists external_ref text;
alter table if exists public.access add column if not exists updated_at   timestamptz default now();

-- Se a sua tabela `access` ainda não existe, cria uma mínima compatível:
create table if not exists public.access (
  email        text primary key,
  status       text not null default 'blocked',   -- active | blocked | pending
  provider     text,                                -- 'tmb'
  plan         text,
  external_ref text,
  updated_at   timestamptz default now()
);

-- 2) Log de automações (observabilidade — alimenta o Console e a Fase 3)
create table if not exists public.automation_log (
  id         bigint generated always as identity primary key,
  source     text,          -- 'tmb'
  event      text,          -- nome técnico do evento recebido
  email      text,
  action     text,          -- LIBERA | BLOQUEIA | PENDENTE | IGNORADO
  raw        jsonb,
  created_at timestamptz default now()
);
create index if not exists automation_log_created_idx on public.automation_log (created_at desc);
create index if not exists automation_log_email_idx   on public.automation_log (email);

-- 3) RLS: essas duas tabelas são escritas SÓ pelo webhook (service_role,
--    que ignora RLS). O cliente (chave anon) não deve ler/escrever aqui.
alter table public.access         enable row level security;
alter table public.automation_log enable row level security;

-- Opcional: permitir que o próprio usuário logado CONSULTE o próprio acesso
-- (útil para a tela de bloqueio do app). Descomente se quiser.
-- create policy "usuario le o proprio acesso" on public.access
--   for select using (auth.jwt() ->> 'email' = email);

-- =====================================================================
-- Pronto. O tmb-webhook (service_role) faz upsert em `access` e insert
-- em `automation_log`. A verificação de acesso do app lê `access` pelo
-- e-mail logado (mesmo e-mail da compra na TMB).
-- =====================================================================
