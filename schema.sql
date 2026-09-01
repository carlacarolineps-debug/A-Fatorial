-- =====================================================================
-- leads: as aplicacoes que chegam da landing, no D1.
--
-- O que entra aqui e dado pessoal (nome, e-mail, telefone). Quem le e a
-- rota /leads do Worker, que fica atras do Cloudflare Access. O banco em
-- si nao e exposto na internet.
-- =====================================================================
create table if not exists leads (
  id integer primary key autoincrement,
  criado_em text not null default (datetime('now')),
  atualizado_em text not null default (datetime('now')),

  -- id da resposta na origem, e a versao do formulario que a gerou. O
  -- nome das duas colunas e heranca do Typeform, que serviu este site ate
  -- 31/08; o formulario da casa grava "aplicar:<envio>" e "aplicar:v<n>".
  -- Renomear custaria uma migracao e nao mudaria nada do que elas fazem.
  --
  -- UNIQUE porque reenvio depois de queda de rede nao pode virar uma
  -- segunda aplicacao na mesa.
  typeform_response_id text unique,
  typeform_form_id text,

  -- campos que a mesa usa direto, extraidos das respostas
  nome text,
  email text,
  whatsapp text,

  -- as respostas completas, com o titulo de cada pergunta como chave. Se
  -- o formulario mudar amanha, nada se perde: o que nao virou coluna
  -- continua aqui, e aplicacao velha e nova convivem na mesma tela.
  respostas text not null default '{}',

  -- plano que a pessoa clicou na landing, quando veio de la
  plano text,
  origem text not null default 'landing',

  -- andamento na mesa
  status text not null default 'novo',
  observacoes text
);

create index if not exists leads_criado_em_idx on leads (criado_em desc);
create index if not exists leads_status_idx on leads (status);
create index if not exists leads_email_idx on leads (lower(email));

-- payload cru de tudo que chega, gravado ANTES de processar. Quando der
-- problema em producao, esse log e a unica coisa que vai existir para
-- explicar o que aconteceu.
create table if not exists webhook_log (
  id integer primary key autoincrement,
  recebido_em text not null default (datetime('now')),
  origem text not null,
  payload text,
  processado integer not null default 0,
  erro text
);
