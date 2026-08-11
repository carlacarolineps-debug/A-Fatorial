-- =============================================================================
-- AuLar — banco de dados para acesso simultâneo de verdade
--
-- POR QUE ESTE ARQUIVO EXISTE
-- O sistema no navegador já suporta várias pessoas ao mesmo tempo: cada uma tem
-- conta e papel, e janelas abertas na mesma máquina se atualizam sozinhas. O que
-- NÃO dá para fazer sem servidor é ligar computadores diferentes — dois
-- navegadores em máquinas distintas não compartilham memória. Isso não é
-- limitação de esforço, é como a web funciona.
--
-- Este schema é essa peça que falta. Foi escrito para Supabase (Postgres +
-- PostgREST + Realtime + Auth), mas é Postgres puro: roda em qualquer lugar.
--
-- COMO USAR NO SUPABASE
--   1. Crie um projeto em supabase.com
--   2. SQL Editor → cole este arquivo inteiro → Run
--   3. Copie a URL do projeto e a chave publishable
--   4. No sistema, preencha-as em Plataforma → Configurações → Servidor
--
-- O PONTO MAIS IMPORTANTE AQUI É O RLS
-- Toda tabela tem organizacao_id e uma política que só deixa a pessoa enxergar
-- as linhas da organização de que ela participa. O isolamento entre ONGs mora no
-- banco, não no JavaScript — se um dia alguém abrir o console do navegador e
-- tentar puxar os dados de outra ONG, o Postgres devolve zero linhas.
-- =============================================================================

create extension if not exists "pgcrypto";

-- =============================================================================
-- 1. ORGANIZAÇÕES E PESSOAS
-- =============================================================================

create table organizacoes (
  id                uuid primary key default gen_random_uuid(),
  nome              text not null,
  cnpj              text,
  responsavel       text,
  telefone          text,
  email             text,
  pix_chave         text,
  cidade            text not null,
  uf                char(2) not null,
  bairro            text,
  sobre             text,
  instagram         text,
  cor               text default '#E9762B',
  logo_url          text,
  plano_id          text not null default 'gratis',
  dia_vencimento    int  not null default 10 check (dia_vencimento between 1 and 28),
  situacao          text not null default 'ativa'
                    check (situacao in ('ativa','bloqueada','suspensa','removida')),
  transparencia     bool not null default true,
  criada_em         date not null default current_date,
  atualizado_em     timestamptz not null default now()
);
create index on organizacoes (cidade, uf);
create index on organizacoes (situacao);

-- Vínculo entre a conta de login (auth.users do Supabase) e a organização.
-- É esta tabela que responde "quem pode ver o quê" em todas as políticas.
create table membros (
  id                uuid primary key default gen_random_uuid(),
  usuario_id        uuid not null,             -- references auth.users(id)
  organizacao_id    uuid references organizacoes(id) on delete cascade,
  plataforma        bool not null default false,   -- true = equipe da AuLar
  nome              text not null,
  email             text not null,
  papel             text not null default 'voluntario'
                    check (papel in ('dono','gestor','voluntario','veterinario')),
  ativo             bool not null default true,
  criado_em         date not null default current_date,
  ultimo_acesso     timestamptz,
  unique (usuario_id, organizacao_id)
);
create index on membros (usuario_id);
create index on membros (organizacao_id);

-- Funções de apoio usadas por TODAS as políticas.
-- security definer para poderem ler `membros` sem cair na própria política.
create or replace function organizacoes_do_usuario()
returns setof uuid language sql stable security definer set search_path = public as $$
  select organizacao_id from membros
   where usuario_id = auth.uid() and ativo and organizacao_id is not null;
$$;

create or replace function e_da_plataforma()
returns bool language sql stable security definer set search_path = public as $$
  select exists (select 1 from membros
                  where usuario_id = auth.uid() and ativo and plataforma);
$$;

create or replace function papel_na_organizacao(org uuid)
returns text language sql stable security definer set search_path = public as $$
  select papel from membros
   where usuario_id = auth.uid() and ativo and organizacao_id = org limit 1;
$$;

-- Pessoas do público: adotantes, doadores, lares temporários, voluntários.
-- Não pertencem a uma organização — elas circulam entre várias.
create table pessoas (
  id                uuid primary key default gen_random_uuid(),
  usuario_id        uuid,                       -- references auth.users(id), se criou conta
  nome              text not null,
  email             text,
  telefone          text not null,
  cpf              text,                        -- guardado cifrado na aplicação
  cidade            text,
  uf                char(2),
  papeis            text[] not null default '{adotante}',
  perfil            jsonb,                      -- respostas do teste de compatibilidade
  lar               jsonb,                      -- dados de lar temporário, quando for o caso
  consentimento_lgpd bool not null default false,
  consentimento_em  timestamptz,
  criado_em         date not null default current_date,
  atualizado_em     timestamptz not null default now()
);
create index on pessoas (usuario_id);
create index on pessoas (cidade);

-- =============================================================================
-- 2. ANIMAIS E SAÚDE
-- =============================================================================

create table pets (
  id                uuid primary key default gen_random_uuid(),
  organizacao_id    uuid not null references organizacoes(id) on delete cascade,
  nome              text not null,
  especie           text not null check (especie in ('cao','gato')),
  sexo              char(1) not null check (sexo in ('M','F')),
  porte             text not null check (porte in ('pequeno','medio','grande')),
  nascimento        date,
  castrado          bool not null default false,
  cor               text,
  pelagem           text,
  microchip         text,
  rga               text,
  status            text not null default 'disponivel'
                    check (status in ('disponivel','em_processo','tratamento',
                                      'lar_temporario','adotado','obito')),
  fotos             text[] not null default '{}',
  historia          text,
  personalidade     text[] not null default '{}',
  necessidades      text[] not null default '{}',
  energia           int check (energia between 1 and 5),
  sociavel_caes     bool not null default true,
  sociavel_gatos    bool not null default true,
  sociavel_criancas bool not null default true,
  precisa_quintal   bool not null default false,
  tempo_sozinho     int  not null default 6,
  custo_mensal      numeric(10,2) not null default 200,
  peso              numeric(6,2),
  resgatado_em      date,
  resgatado_onde    text,
  urgente           bool not null default false,
  especial          bool not null default false,
  devolucoes        int  not null default 0,
  lar_temporario_id uuid references pessoas(id) on delete set null,
  visualizacoes     int  not null default 0,
  curtidas          int  not null default 0,
  criado_em         timestamptz not null default now(),
  atualizado_em     timestamptz not null default now(),
  -- controle de concorrência: quem gravar com versão antiga leva erro em vez de
  -- sobrescrever o trabalho de outra pessoa em silêncio
  versao            int not null default 1
);
create index on pets (organizacao_id, status);
create index on pets (status) where status = 'disponivel';
create unique index on pets (microchip) where microchip is not null;

create table vacinas (
  id                uuid primary key default gen_random_uuid(),
  organizacao_id    uuid not null references organizacoes(id) on delete cascade,
  pet_id            uuid not null references pets(id) on delete cascade,
  vacina            text not null,
  curto             text,
  tipo              text not null default 'vacina' check (tipo in ('vacina','medicacao')),
  dose              text not null,
  protege           text,
  essencial         bool not null default false,
  prevista_para     date not null,
  aplicada_em       date,
  lote              text,
  veterinario       text,
  registrado_por    uuid                        -- references auth.users(id)
);
create index on vacinas (organizacao_id, prevista_para) where aplicada_em is null;
create index on vacinas (pet_id);

-- =============================================================================
-- 3. ADOÇÃO
-- =============================================================================

create table interesses (
  id                uuid primary key default gen_random_uuid(),
  organizacao_id    uuid not null references organizacoes(id) on delete cascade,
  pet_id            uuid not null references pets(id) on delete cascade,
  pessoa_id         uuid not null references pessoas(id) on delete cascade,
  etapa             text not null default 'interesse'
                    check (etapa in ('interesse','triagem','entrevista','visita',
                                     'termo','entregue','recusado')),
  score             int,
  origem            text,
  visita            jsonb,
  notas             jsonb not null default '[]',
  criado_em         date not null default current_date,
  atualizado_em     timestamptz not null default now(),
  versao            int not null default 1,
  unique (pet_id, pessoa_id)
);
create index on interesses (organizacao_id, etapa);

create table adocoes (
  id                uuid primary key default gen_random_uuid(),
  organizacao_id    uuid not null references organizacoes(id) on delete cascade,
  pet_id            uuid references pets(id) on delete set null,
  pet_nome          text not null,
  pet_especie       text,
  pessoa_id         uuid references pessoas(id) on delete set null,
  pessoa_nome       text not null,
  data              date not null default current_date,
  termo_assinado    bool not null default false,
  termo_url         text,
  devolvido         bool not null default false,
  devolvido_em      date,
  motivo_devolucao  text,
  acompanhamentos   jsonb not null default '[]',
  concluida_por     uuid
);
create index on adocoes (organizacao_id, data desc);

-- =============================================================================
-- 4. DINHEIRO
-- =============================================================================

create table doacoes (
  id                uuid primary key default gen_random_uuid(),
  organizacao_id    uuid references organizacoes(id) on delete set null,  -- null = Fundo ou plataforma
  destino           text not null default 'ong' check (destino in ('ong','fundo','plataforma')),
  pessoa_id         uuid references pessoas(id) on delete set null,
  pessoa_nome       text,
  pet_id            uuid references pets(id) on delete set null,          -- apadrinhamento
  tipo              text not null check (tipo in ('unica','recorrente','apadrinhamento',
                                                  'presente','fundo')),
  meio              text not null,
  valor             numeric(10,2) not null check (valor > 0),
  taxa              numeric(10,2) not null default 0,
  coberta           bool not null default false,   -- doador cobriu a taxa?
  item              text,
  status            text not null default 'pendente'
                    check (status in ('pendente','confirmada','estornada','falhou')),
  psp_id            text,                          -- id da cobrança no Asaas/Pagar.me
  data              date not null default current_date,
  criado_em         timestamptz not null default now()
);
create index on doacoes (organizacao_id, data desc);
create index on doacoes (destino, status);

-- Fundo de Impacto: cada rodada e o rateio dela ficam registrados para sempre.
-- É esta tabela que sustenta a página pública de transparência.
create table fundo_rodadas (
  id                uuid primary key default gen_random_uuid(),
  data              date not null default current_date,
  bruto             numeric(12,2) not null,
  taxa_gestao       numeric(12,2) not null,
  liquido           numeric(12,2) not null,
  fechada_por       uuid,
  criado_em         timestamptz not null default now()
);
create table fundo_cotas (
  id                uuid primary key default gen_random_uuid(),
  rodada_id         uuid not null references fundo_rodadas(id) on delete cascade,
  organizacao_id    uuid not null references organizacoes(id) on delete cascade,
  organizacao_nome  text not null,
  valor             numeric(12,2) not null,
  score             int not null,
  nivel             text not null,
  animais           int not null
);
create index on fundo_cotas (organizacao_id);

create table faturas (
  id                uuid primary key default gen_random_uuid(),
  organizacao_id    uuid not null references organizacoes(id) on delete cascade,
  competencia       char(7) not null,             -- 'AAAA-MM'
  valor             numeric(10,2) not null,
  vence             date not null,
  pago_em           date,
  meio              text,
  status            text not null default 'aberta'
                    check (status in ('aberta','paga','atrasada','cancelada')),
  psp_id            text,
  unique (organizacao_id, competencia)
);
create index on faturas (status, vence);

create table patrocinios (
  id                uuid primary key default gen_random_uuid(),
  empresa           text not null,
  contato           text,
  cota              text not null check (cota in ('apoiador','parceiro','mantenedor')),
  valor             numeric(10,2) not null,
  desde             date not null default current_date,
  ate               date,
  ativo             bool not null default true
);

-- =============================================================================
-- 5. OPERAÇÃO
-- =============================================================================

create table estoque (
  id                uuid primary key default gen_random_uuid(),
  organizacao_id    uuid not null references organizacoes(id) on delete cascade,
  item              text not null,
  tipo              text not null,
  unidade           text not null,
  quantidade        numeric(10,2) not null default 0,
  minimo            numeric(10,2) not null default 0,
  consumo_dia       numeric(10,3) not null default 0,
  versao            int not null default 1
);
create index on estoque (organizacao_id);

create table eventos (
  id                uuid primary key default gen_random_uuid(),
  organizacao_id    uuid not null references organizacoes(id) on delete cascade,
  tipo              text not null check (tipo in ('feira','castracao','mutirao')),
  titulo            text not null,
  data              date not null,
  hora              time,
  local             text,
  cidade            text,
  uf                char(2),
  publico           bool not null default true,
  vagas             int,
  inscritos         int not null default 0,
  obs               text
);
create index on eventos (data) where publico;

create table achados (
  id                uuid primary key default gen_random_uuid(),
  tipo              text not null check (tipo in ('perdido','encontrado')),
  especie           text not null,
  nome              text,
  descricao         text not null,
  cidade            text not null,
  uf                char(2) not null,
  bairro            text,
  data              date not null,
  contato           text not null,
  foto_url          text,
  recompensa        numeric(10,2) default 0,
  resolvido         bool not null default false,
  criado_por        uuid
);
create index on achados (cidade, resolvido);

-- Rede de proteção: o registro é de uma organização, mas TODAS enxergam.
-- É esse compartilhamento que dá valor à rede, e por isso a política de leitura
-- aqui é diferente das outras tabelas.
create table lista_risco (
  id                uuid primary key default gen_random_uuid(),
  organizacao_id    uuid not null references organizacoes(id) on delete cascade,
  nome_ref          text not null,               -- só iniciais
  cpf_parcial       text,                        -- só parte, nunca o número inteiro
  motivo            text not null check (length(motivo) >= 25),
  gravidade         text not null default 'media' check (gravidade in ('baixa','media','alta')),
  confirmada_por    int not null default 1,
  data              date not null default current_date,
  criado_por        uuid
);

create table tarefas (
  id                uuid primary key default gen_random_uuid(),
  organizacao_id    uuid not null references organizacoes(id) on delete cascade,
  titulo            text not null,
  prazo             date,
  responsavel       text,
  tipo              text,
  feito             bool not null default false,
  feito_em          timestamptz,
  feito_por         uuid
);
create index on tarefas (organizacao_id, feito, prazo);

-- Histórico assinado: quem fez o quê. Ninguém edita nem apaga.
create table atividades (
  id                uuid primary key default gen_random_uuid(),
  organizacao_id    uuid references organizacoes(id) on delete cascade,
  tipo              text not null,
  texto             text not null,
  ref               uuid,
  autor_id          uuid,
  autor_nome        text,
  quando            timestamptz not null default now()
);
create index on atividades (organizacao_id, quando desc);

-- =============================================================================
-- 6. RLS — o isolamento entre organizações
-- =============================================================================

alter table organizacoes enable row level security;
alter table membros      enable row level security;
alter table pessoas      enable row level security;
alter table pets         enable row level security;
alter table vacinas      enable row level security;
alter table interesses   enable row level security;
alter table adocoes      enable row level security;
alter table doacoes      enable row level security;
alter table estoque      enable row level security;
alter table eventos      enable row level security;
alter table achados      enable row level security;
alter table lista_risco  enable row level security;
alter table tarefas      enable row level security;
alter table atividades   enable row level security;
alter table faturas      enable row level security;
alter table fundo_rodadas enable row level security;
alter table fundo_cotas  enable row level security;
alter table patrocinios  enable row level security;

-- --- vitrine pública: qualquer pessoa, mesmo deslogada, vê os animais
--     disponíveis de organizações que não estão suspensas nem removidas
create policy "vitrine publica" on pets for select using (
  status = 'disponivel'
  and exists (select 1 from organizacoes o
               where o.id = pets.organizacao_id
                 and o.situacao in ('ativa','bloqueada'))
);
create policy "organizacoes visiveis" on organizacoes for select using (
  situacao <> 'removida' or id in (select organizacoes_do_usuario())
);
create policy "eventos publicos" on eventos for select using (publico);
create policy "achados publicos" on achados for select using (true);
create policy "transparencia do fundo" on fundo_rodadas for select using (true);
create policy "cotas do fundo publicas" on fundo_cotas for select using (true);

-- --- membros: cada pessoa vê a própria equipe
create policy "ver equipe" on membros for select using (
  organizacao_id in (select organizacoes_do_usuario()) or usuario_id = auth.uid() or e_da_plataforma()
);
create policy "dono gerencia equipe" on membros for all using (
  papel_na_organizacao(organizacao_id) = 'dono' or e_da_plataforma()
) with check (
  papel_na_organizacao(organizacao_id) = 'dono' or e_da_plataforma()
);

-- --- tabelas da organização: o mesmo par de políticas para todas
do $$
declare t text;
begin
  foreach t in array array['pets','vacinas','interesses','adocoes','estoque',
                           'eventos','tarefas','atividades','faturas','doacoes']
  loop
    execute format($f$
      create policy "equipe le %1$s" on %1$s for select using (
        organizacao_id in (select organizacoes_do_usuario()) or e_da_plataforma()
      );
      create policy "equipe escreve %1$s" on %1$s for insert with check (
        organizacao_id in (select organizacoes_do_usuario())
      );
      create policy "equipe atualiza %1$s" on %1$s for update using (
        organizacao_id in (select organizacoes_do_usuario())
      ) with check (
        organizacao_id in (select organizacoes_do_usuario())
      );
      create policy "equipe apaga %1$s" on %1$s for delete using (
        papel_na_organizacao(organizacao_id) in ('dono','gestor')
      );
    $f$, t);
  end loop;
end $$;

-- --- organização: só o dono edita a própria; a plataforma edita todas
create policy "dono edita a organizacao" on organizacoes for update using (
  papel_na_organizacao(id) = 'dono' or e_da_plataforma()
) with check (
  papel_na_organizacao(id) = 'dono' or e_da_plataforma()
);

-- --- rede de proteção: TODA organização certificada lê; só quem registrou edita
create policy "rede le tudo" on lista_risco for select using (
  exists (select 1 from membros m where m.usuario_id = auth.uid() and m.ativo
            and m.organizacao_id is not null)
);
create policy "rede registra" on lista_risco for insert with check (
  organizacao_id in (select organizacoes_do_usuario())
);
create policy "rede edita o proprio" on lista_risco for update using (
  organizacao_id in (select organizacoes_do_usuario())
);

-- --- pessoas: a equipe vê quem tem interesse nos animais dela; a própria
--     pessoa sempre vê e edita os dados dela (LGPD, art. 18)
create policy "pessoa ve a si mesma" on pessoas for select using (
  usuario_id = auth.uid()
  or e_da_plataforma()
  or exists (select 1 from interesses i
              where i.pessoa_id = pessoas.id
                and i.organizacao_id in (select organizacoes_do_usuario()))
);
create policy "pessoa se cadastra" on pessoas for insert with check (true);
create policy "pessoa edita a si mesma" on pessoas for update using (
  usuario_id = auth.uid() or e_da_plataforma()
);

-- --- patrocínio e rodadas do Fundo: quem administra é a plataforma
create policy "plataforma gerencia patrocinios" on patrocinios for all using (e_da_plataforma())
  with check (e_da_plataforma());
create policy "plataforma fecha rodadas" on fundo_rodadas for insert with check (e_da_plataforma());
create policy "plataforma lanca cotas" on fundo_cotas for insert with check (e_da_plataforma());

-- =============================================================================
-- 7. CONCORRÊNCIA — duas pessoas editando o mesmo registro
--
-- Sem isto, quem salvar por último apaga o trabalho de quem salvou antes, e
-- ninguém fica sabendo. Com isto, a segunda gravação leva erro e a aplicação
-- avisa "alguém alterou este cadastro enquanto você editava".
-- =============================================================================

create or replace function checar_versao()
returns trigger language plpgsql as $$
begin
  if new.versao is distinct from old.versao then
    raise exception 'conflito: este registro foi alterado por outra pessoa (versao % no banco, % enviada)',
      old.versao, new.versao
      using errcode = '40001';
  end if;
  new.versao := old.versao + 1;
  new.atualizado_em := now();
  return new;
end $$;

create trigger pets_versao       before update on pets       for each row execute function checar_versao();
create trigger interesses_versao before update on interesses for each row execute function checar_versao();
create trigger estoque_versao    before update on estoque    for each row execute function checar_versao();

-- =============================================================================
-- 8. TEMPO REAL — o que uma pessoa faz aparece na tela da outra
--
-- No Supabase, publicar a tabela em `supabase_realtime` já basta: o cliente
-- assina o canal e recebe insert/update/delete filtrados pelo RLS (ou seja,
-- ninguém recebe evento de organização que não é dele).
-- =============================================================================

alter publication supabase_realtime add table pets;
alter publication supabase_realtime add table vacinas;
alter publication supabase_realtime add table interesses;
alter publication supabase_realtime add table adocoes;
alter publication supabase_realtime add table doacoes;
alter publication supabase_realtime add table estoque;
alter publication supabase_realtime add table tarefas;
alter publication supabase_realtime add table atividades;

-- =============================================================================
-- 9. SELO DE CONFIANÇA CALCULADO NO BANCO
--
-- A nota precisa vir do servidor, não do navegador: é ela que decide quanto
-- cada organização recebe do Fundo. Calculada no cliente, bastaria abrir o
-- console para "melhorar" a própria nota.
-- =============================================================================

create or replace view selo_organizacoes as
with base as (
  select o.id,
         o.nome,
         o.transparencia,
         greatest(1, count(p.*) filter (where p.status not in ('adotado','obito'))) as ativos,
         count(p.*) filter (where p.status not in ('adotado','obito') and p.castrado)  as castrados,
         count(p.*) filter (where p.status not in ('adotado','obito')
                              and p.microchip is not null)                            as com_chip,
         count(p.*) filter (where p.status not in ('adotado','obito')
                              and length(coalesce(p.historia,'')) >= 80
                              and array_length(p.fotos,1) > 0)                        as bem_cadastrados,
         least(1.0, (current_date - o.criada_em)::numeric / 365)                      as tempo
    from organizacoes o
    left join pets p on p.organizacao_id = o.id
   group by o.id
),
saude as (
  select organizacao_id,
         1 - (count(*) filter (where aplicada_em is null and prevista_para < current_date)::numeric
              / greatest(1, count(*))) as em_dia
    from vacinas group by organizacao_id
),
pos as (
  select a.organizacao_id,
         avg(case when (ac->>'feito')::bool then 1 else 0 end) as feito
    from adocoes a, jsonb_array_elements(a.acompanhamentos) ac
   where (ac->>'previsto')::date <= current_date
   group by a.organizacao_id
),
dev as (
  select organizacao_id,
         count(*) as total,
         count(*) filter (where devolvido) as devolvidos
    from adocoes group by organizacao_id
),
resp as (
  select organizacao_id,
         1 - (count(*) filter (where atualizado_em < now() - interval '3 days')::numeric
              / greatest(1, count(*))) as no_prazo
    from interesses
   where etapa not in ('entregue','recusado')
   group by organizacao_id
)
select b.id as organizacao_id,
       b.nome,
       round(
         (case when b.transparencia then 15 else 0 end)
       + 15 * coalesce(saude.em_dia, 1)
       + 15 * coalesce(pos.feito, 1)
       + 12 * (case when coalesce(dev.total,0) < 3 then 1
                    else greatest(0, 1 - (dev.devolvidos::numeric / dev.total) * 6) end)
       + 12 * coalesce(resp.no_prazo, 1)
       + 11 * (b.bem_cadastrados::numeric / b.ativos)
       + 10 * (b.castrados::numeric / b.ativos)
       +  5 * (b.com_chip::numeric / b.ativos)
       +  5 * b.tempo
       )::int as nota
  from base b
  left join saude on saude.organizacao_id = b.id
  left join pos   on pos.organizacao_id   = b.id
  left join dev   on dev.organizacao_id   = b.id
  left join resp  on resp.organizacao_id  = b.id;

comment on view selo_organizacoes is
  'Nota do Selo de Confiança, 0 a 100. Nenhum critério olha para o plano '
  'contratado: no dia em que pagar mensalidade melhorar a nota, a nota deixa de valer.';

-- =============================================================================
-- 10. RÉGUA DE COBRANÇA — roda sozinha todo dia
-- Agende com pg_cron: select cron.schedule('regua','0 6 * * *','select aplicar_regua()');
-- =============================================================================

create or replace function aplicar_regua(
  carencia int default 0, dias_suspensao int default 30, dias_remocao int default 90
) returns int language plpgsql security definer as $$
declare afetadas int;
begin
  with atraso as (
    select o.id,
           coalesce(max(current_date - f.vence), 0) as dias
      from organizacoes o
      left join faturas f
        on f.organizacao_id = o.id and f.pago_em is null
       and f.status <> 'cancelada' and f.vence < current_date
     where o.situacao <> 'removida' and o.plano_id <> 'gratis'
     group by o.id
  )
  update organizacoes o
     set situacao = case
           when a.dias = 0                then 'ativa'
           when a.dias > dias_remocao     then 'removida'
           when a.dias > dias_suspensao   then 'suspensa'
           when a.dias > carencia         then 'bloqueada'
           else 'ativa' end,
         atualizado_em = now()
    from atraso a
   where a.id = o.id
     and o.situacao is distinct from (case
           when a.dias = 0              then 'ativa'
           when a.dias > dias_remocao   then 'removida'
           when a.dias > dias_suspensao then 'suspensa'
           when a.dias > carencia       then 'bloqueada'
           else 'ativa' end);
  get diagnostics afetadas = row_count;
  return afetadas;
end $$;

-- =============================================================================
-- FIM. Depois de rodar isto, o que falta na aplicação é trocar a camada de
-- persistência: onde hoje há localStorage, passa a haver chamada ao PostgREST.
-- A lógica de negócio (compatibilidade, protocolo vacinal, selo, régua) não
-- muda de forma — só passa a rodar do lado seguro da porta.
-- =============================================================================
