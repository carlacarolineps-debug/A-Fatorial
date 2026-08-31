-- =====================================================================
-- O formulario proprio, que substitui o Typeform.
--
-- Seis tabelas, e nenhuma mudanca na tabela leads: a mesa continua lendo
-- as aplicacoes pela rota /leads exatamente como antes.
--
-- Aplicado no D1 do mesmo jeito que o schema.sql ja e. So
-- "create ... if not exists": rodar duas vezes nao faz mal.
-- =====================================================================

-- ---------------------------------------------------------------------
-- As versoes do formulario.
--
-- Cada publicacao e uma linha nova, e a de maior numero e a que esta no
-- ar. Versao nao se sobrescreve por um motivo pratico: quem edita as
-- perguntas e quem toca o negocio, e uma edicao errada as onze da noite
-- precisa ter volta sem depender de ninguem.
--
-- A de fabrica, que mora no codigo do servidor e nao nesta tabela, e a
-- versao ZERO. A primeira publicacao e a 1. Assim nenhum numero de
-- versao significa dois formularios diferentes, e a aplicacao de quem
-- respondeu antes de alguem publicar e conferida contra as perguntas que
-- essa pessoa realmente leu.
-- ---------------------------------------------------------------------
create table if not exists formulario_versoes (
  versao integer primary key,

  -- quando a linha foi gravada, publicada ou nao
  criado_em text not null default (datetime('now')),

  -- quando foi para o ar. NULO significa rascunho: a versao existe, a
  -- mesa inteira a enxerga, e quem abre o formulario ainda ve a anterior.
  -- Rascunho e a versao de maior numero com esta coluna nula.
  publicado_em text,

  -- e-mail que o Cloudflare Access autenticou na hora de gravar
  publicado_por text,

  -- o que mudou nesta versao, escrito por quem publicou
  nota text,

  -- o objeto inteiro do formulario, em JSON
  definicao text not null
);

create index if not exists formulario_versoes_data_idx
  on formulario_versoes (publicado_em desc);

-- ---------------------------------------------------------------------
-- Uma linha por preenchimento.
--
-- A visita e sorteada no navegador e guardada so enquanto a aba existe.
-- Nao e cookie, nao vem do endereco de rede e nao sobrevive a visita. Ela
-- NUNCA e gravada junto do identificador do envio: ver a secao 9.
--
-- O dia e gravado, nao calculado. O banco conta em UTC, e quem abre as
-- 21h30 em Sao Paulo teria carimbo do dia seguinte e cairia no dia errado
-- na serie diaria. A coluna recebe date('now','-3 hours') na gravacao. O
-- Brasil nao tem horario de verao desde 2019, entao as tres horas sao
-- fixas. Nenhuma consulta agrupa por date(criado_em).
-- ---------------------------------------------------------------------
create table if not exists formulario_visitas (
  visita text primary key,
  aberta_em text not null default (datetime('now')),
  dia text not null,
  versao integer,

  aparelho text not null default 'desconhecido',  -- celular|tablet|computador
  origem text not null default 'direto',
  campanha text,
  referencia text,                                -- so o dominio de quem indicou
  plano text,

  comecou_em text,      -- passou da capa
  revisou_em text,      -- chegou na tela de conferir
  enviada_em text,      -- chegou ao fim
  ultima_em text,       -- ultimo sinal de vida

  ms_ate_enviar integer,                    -- medido no navegador
  perguntas_vistas integer not null default 0,
  ultima_pergunta text,                     -- onde parou, se parou
  ultima_ordem integer
);

-- A tela sempre pergunta por periodo, entao o dia vem primeiro.
create index if not exists formulario_visitas_dia_idx
  on formulario_visitas (dia);

-- Indices parciais: so as visitas concluidas entram no primeiro, so as
-- abandonadas no segundo, e cada conta le so o que precisa.
create index if not exists formulario_visitas_enviadas_idx
  on formulario_visitas (dia, ms_ate_enviar) where enviada_em is not null;
create index if not exists formulario_visitas_abandono_idx
  on formulario_visitas (dia, ultima_pergunta) where enviada_em is null;

create index if not exists formulario_visitas_origem_idx
  on formulario_visitas (dia, origem);
create index if not exists formulario_visitas_aparelho_idx
  on formulario_visitas (dia, aparelho);

-- ---------------------------------------------------------------------
-- Os passos do preenchimento.
--
-- E daqui que sai o funil, e sem isso a unica coisa que se sabe de um
-- formulario e quantas pessoas terminaram, nunca onde as outras pararam.
--
-- Nao guarda NADA do que a pessoa escreveu, e nem o que ela escolheu: so
-- a chave da pergunta e o tempo. O que ela respondeu so existe depois que
-- ela apertou enviar, e mora em leads e em formulario_escolhas.
-- ---------------------------------------------------------------------
create table if not exists formulario_eventos (
  id integer primary key autoincrement,
  criado_em text not null default (datetime('now')),
  dia text not null,

  visita text not null,
  versao integer not null,

  -- O navegador numera os passos dele: 1, 2, 3. O envio de eventos e
  -- disparado sem esperar resposta, entao o mesmo passo pode chegar duas
  -- vezes e dois passos podem chegar trocados. Com este numero, chegar
  -- duas vezes nao conta duas vezes.
  seq integer not null,

  -- abriu, comecou, viu, respondeu, voltou, erro_campo, revisou,
  -- enviou, falhou, desistiu
  tipo text not null,

  pergunta text,   -- a chave curta, que nao muda quando o titulo muda
  ordem integer,   -- posicao da pergunta naquela versao
  ms integer not null default 0,

  -- codigo curto de lista fechada, so em erro_campo, falhou e enviou:
  -- vazio|formato|curto|longo|opcao|rede|recusado|limite|servidor|definicao
  detalhe text
);

-- Um indice so, e ele cobre TODA conta pergunta a pergunta: abandono,
-- escada, tempo por pergunta e recusas de formato. Como as colunas lidas
-- estao todas dentro dele, a consulta nem chega a abrir a tabela.
create index if not exists formulario_eventos_leitura_idx
  on formulario_eventos (tipo, dia, pergunta, ordem, visita, ms);

-- Este e para escrever, nao para ler. E ele quem faz o passo repetido ser
-- recusado em vez de virar contagem dobrada.
create unique index if not exists formulario_eventos_unico_idx
  on formulario_eventos (visita, seq);

-- ---------------------------------------------------------------------
-- O que foi escolhido em cada pergunta de escolha, por envio de verdade.
--
-- Existe porque a resposta gravada em leads guarda o TEXTO da opcao, e
-- texto muda quando a Carla melhora a frase. A chave nao muda. Sem esta
-- tabela, "quantos disseram que ja faturam" seria uma conta feita por
-- comparacao de frase, e quebraria na primeira correcao de virgula.
--
-- So entra aqui o que veio de um envio aceito, nunca de evento: e por
-- isso que a distribuicao das opcoes nao e forjavel de fora.
-- ---------------------------------------------------------------------
create table if not exists formulario_escolhas (
  id integer primary key autoincrement,
  criado_em text not null default (datetime('now')),
  dia text not null,
  lead_id integer not null,
  versao integer not null,
  pergunta_chave text not null,
  opcao_chave text not null
);

create index if not exists formulario_escolhas_lead_idx
  on formulario_escolhas (lead_id);
create index if not exists formulario_escolhas_conta_idx
  on formulario_escolhas (pergunta_chave, opcao_chave, dia);

-- ---------------------------------------------------------------------
-- Os baldes do limite de chamadas.
--
-- Duas rotas ficam abertas para a internet inteira, e sem freio uma delas
-- enche a mesa de lixo numa tarde. O freio mora aqui, no mesmo banco,
-- porque contratar servico de terceiro para contar ate cinco seria caro e
-- traria dependencia nova para um site que hoje nao faz nenhuma
-- requisicao para fora.
--
-- A chave guarda um resumo do endereco, nunca o endereco. O resumo troca
-- todo dia, e a linha se apaga sozinha quando a janela fecha.
-- ---------------------------------------------------------------------
create table if not exists formulario_baldes (
  chave text primary key,
  contagem integer not null default 0,
  expira_em text not null
);

create index if not exists formulario_baldes_expira_idx
  on formulario_baldes (expira_em);

-- ---------------------------------------------------------------------
-- O resumo que sobrevive ao expurgo: dia, aparelho, origem e contagem,
-- sem nada de ninguem. Fica para sempre, e e dele que sai a comparacao
-- com o ano passado. Existe por causa do expurgo, nao por velocidade.
--
-- Quem escreve e o resumo diario, uma vez por dia. Quem le e a tela de
-- numeros quando o periodo pedido inteiro e mais velho que o corte de
-- doze meses: dali para tras a linha por visita ja foi apagada, e o que
-- responde e esta tabela. O que nao esta aqui nao volta, e a resposta
-- daquele periodo diz isso: nao ha caminho pergunta a pergunta, nao ha
-- mediana de tempo e nao ha recorte por versao.
-- ---------------------------------------------------------------------
create table if not exists formulario_dia (
  dia text not null,
  aparelho text not null,
  origem text not null,
  visitas integer not null default 0,
  iniciados integer not null default 0,
  concluidos integer not null default 0,
  ms_total_concluidos integer not null default 0,
  primary key (dia, aparelho, origem)
);
