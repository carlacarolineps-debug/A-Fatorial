-- =====================================================================
-- A porta: quem entra no sistema, com e-mail e senha.
--
-- Ate 01/09 quem trancava o endereco era o Cloudflare Access, e a lista
-- de pessoas vivia no localStorage de cada navegador. Duas consequencias
-- que doiam: a tela de entrada era a da Cloudflare, e nao a da casa; e
-- cada navegador tinha a SUA lista, entao cadastrar alguem no computador
-- da Carla nao cadastrava em lugar nenhum.
--
-- Com senha no servidor as duas somem: a tela e nossa, e a lista e uma so
-- para todo mundo.
--
-- O que este arquivo NAO faz: guardar senha. O que fica gravado e o
-- resumo PBKDF2 dela, com sal proprio por pessoa. Quem ler a tabela
-- inteira nao consegue entrar como ninguem.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Quem tem acesso.
-- ---------------------------------------------------------------------
create table if not exists pessoas (
  id integer primary key autoincrement,
  criado_em text not null default (datetime('now')),
  atualizado_em text not null default (datetime('now')),

  -- Sempre em minusculas, e e por ele que a pessoa entra. UNIQUE porque
  -- dois cadastros com o mesmo e-mail seriam duas contas para a mesma
  -- pessoa, e a segunda nunca receberia o que foi feito na primeira.
  email text not null unique,
  nome text not null,

  -- gestor | colaborador | cliente. A lista fechada mora no codigo; aqui
  -- e texto porque SQLite nao tem enum e uma tabela so para tres palavras
  -- custaria mais leitura do que entrega.
  papel text not null default 'colaborador',

  -- Desligar e melhor que apagar: o historico de quem mexeu no que
  -- continua fazendo sentido, e religar e um clique.
  ativo integer not null default 1,

  -- O resumo da senha, o sal dela e quantas voltas foram usadas. As
  -- voltas ficam GRAVADAS junto, e nao so no codigo: no dia em que o
  -- numero subir, quem entrar com a senha antiga ainda precisa conferir
  -- com o numero antigo, senao a senha certa passa a ser recusada.
  senha_hash text,
  senha_sal text,
  senha_voltas integer,

  -- Qual versao da regra do navegador gerou a prova desta pessoa. Sem
  -- esta coluna, mudar as voltas ou o tempero trancaria todo mundo para
  -- fora de uma vez: o navegador passaria a calcular uma prova diferente
  -- da que esta guardada, e nem a senha certa entraria. Com ela, o dia da
  -- mudanca tem saida.
  prova_versao integer not null default 1,

  -- Quando o gestor cadastra alguem, ele escolhe a primeira senha e passa
  -- adiante. Esta marca obriga a troca na primeira entrada, para a senha
  -- que andou por WhatsApp nao ficar valendo para sempre. Ela e obedecida
  -- pelo SERVIDOR, na exigirEntrada: sessao de quem ainda nao trocou so
  -- serve para trocar.
  precisa_trocar integer not null default 0,

  entrou_em text
);

create index if not exists pessoas_ativo on pessoas(ativo);

-- ---------------------------------------------------------------------
-- As sessoes abertas.
--
-- O que vai no cookie do navegador e um numero sorteado de 32 bytes. O
-- que fica aqui e o SHA-256 dele. Assim, quem conseguir ler esta tabela
-- ainda nao consegue se passar por ninguem: o cracha nao esta escrito
-- aqui, so a marca dele.
-- ---------------------------------------------------------------------
create table if not exists sessoes (
  id text primary key,
  pessoa_id integer not null references pessoas(id) on delete cascade,
  criado_em text not null default (datetime('now')),
  expira_em text not null,
  visto_em text
);

create index if not exists sessoes_pessoa on sessoes(pessoa_id);
create index if not exists sessoes_expira on sessoes(expira_em);

-- ---------------------------------------------------------------------
-- O freio de quem fica tentando.
--
-- Sem isto, senha de seis letras cai em algumas horas de tentativa
-- automatica, e ninguem fica sabendo. A chave e o e-mail tentado; a
-- linha se apaga sozinha quando a janela vence.
-- ---------------------------------------------------------------------
create table if not exists freio (
  chave text primary key,
  tentativas integer not null default 0,
  ate text not null
);

-- ---------------------------------------------------------------------
-- Colunas que chegaram depois.
--
-- "create table if not exists" NAO acrescenta coluna nenhuma numa tabela
-- que ja existe: num banco que ja rodou uma vez, o bloco la de cima passa
-- calado e a coluna nova nunca aparece. Depois o insert falha por coluna
-- que falta, com uma mensagem que nao diz isso.
--
-- Rodar de novo num banco que ja tem a coluna devolve erro de coluna
-- duplicada, e esse erro pode ser ignorado.
-- ---------------------------------------------------------------------
-- alter table pessoas add column prova_versao integer not null default 1;
