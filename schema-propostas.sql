-- =====================================================================
-- Propostas com aceite eletronico.
--
-- Este repositorio nao usa a pasta migrations do wrangler: os schemas sao
-- arquivos soltos, aplicados a mao e com "if not exists", para poderem
-- rodar de novo sem erro. O arquivo do pacote se chamava 000X_propostas;
-- aqui ele entra como schema-propostas.sql, ao lado do schema.sql, do
-- schema-formulario.sql e do schema-porta.sql.
--
-- A equipe cria a proposta na tela "Propostas", o worker sorteia um codigo
-- ID-XXXXX, e o cliente abre /proposta/, digita o codigo, escolhe o plano,
-- le o contrato e assina. O aceite grava o contrato integral, o resumo
-- SHA-256 dele, o endereco de onde veio e a hora: e isso que faz o aceite
-- valer como prova depois.
-- =====================================================================

create table if not exists propostas (
  id integer primary key autoincrement,
  codigo text not null unique,                     -- ID-XXXXX, gerado pelo worker, nunca sequencial
  lead_id integer references leads(id),            -- opcional: proposta nascida de um lead do funil
  cliente text not null,
  empresa text,
  diagnostico text,
  fundacao integer not null default 0,             -- 1 = condição de fundação (autoriza case no contrato)
  planos text not null,                            -- JSON: [{t, selo, esc[], val, cond}] (1 a 3 planos)
  contratada text not null,                        -- JSON: {rs, cnpj, end, foro}
  whatsapp_destino text not null,                  -- para onde vai a confirmação do aceite
  valida_ate text,                                 -- YYYY-MM-DD; vencida bloqueia o aceite
  status text not null default 'enviada',          -- enviada | vista | aceita
  criado_em text not null default (datetime('now')),
  visto_em text,
  aceito_em text
);

create table if not exists aceites (
  id integer primary key autoincrement,
  proposta_id integer not null references propostas(id),
  plano_indice integer not null,
  plano_titulo text not null,
  valor real not null,
  nome text not null,
  documento text not null,                         -- CPF/CNPJ só dígitos
  email text not null,
  whatsapp text not null,
  endereco text,
  contrato text not null,                          -- texto integral do contrato aceito (fonte: worker)
  hash text not null,                              -- SHA-256 do conteúdo aceito
  ip text,                                         -- CF-Connecting-IP no momento do aceite
  user_agent text,
  criado_em text not null default (datetime('now'))
);

create index if not exists idx_aceites_proposta on aceites(proposta_id);
