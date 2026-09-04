/* =====================================================================
   Sistema Ideia Que Vende  ·  base

   O que vive aqui: o vocabulario do negocio, o armazenamento, quem e a
   pessoa, o que ela pode ver, o roteador e as pecas que todas as telas
   usam. Cada tela mora no proprio arquivo e so registra o seu desenho.
   ===================================================================== */

/* ---------------------------------------------------------------------
   1. O vocabulario. Copiado da landing letra por letra, de proposito: o
   cliente leu aquilo antes de pagar, e chamar diferente aqui dentro cria
   duas linguagens para a mesma coisa.
   --------------------------------------------------------------------- */

// As quatro fases do processo.
const FASES = [
  { n: 1, k: 'diagnostico',  nome: 'Diagnóstico',    resumo: 'Entendemos a ideia, a experiência, os objetivos e o mercado.' },
  { n: 2, k: 'estruturacao', nome: 'Estruturação',   resumo: 'Criamos o método, a estrutura e os materiais da solução.' },
  { n: 3, k: 'validacao',    nome: 'Validação',      resumo: 'Ajustamos, validamos e alinhamos antes da apresentação.' },
  { n: 4, k: 'pronto',       nome: 'Produto pronto', resumo: 'A solução estruturada nas mãos do cliente.' },
];

// As seis etapas do método.
const ETAPAS = [
  { n: 1, k: 'ideia',         nome: 'Ideia',         resumo: 'Entendemos sua experiência, objetivos e contexto.' },
  { n: 2, k: 'posicionamento',nome: 'Posicionamento',resumo: 'Definimos lugar de mercado e diferenciação.' },
  { n: 3, k: 'metodo',        nome: 'Método',        resumo: 'Criamos a lógica de entrega da sua solução.' },
  { n: 4, k: 'estrutura',     nome: 'Estrutura',     resumo: 'Organizamos produto, materiais e experiência.' },
  { n: 5, k: 'produto',       nome: 'Produto',       resumo: 'Transformamos o conhecimento em uma oferta clara.' },
  { n: 6, k: 'venda',         nome: 'Venda',         resumo: 'Planejamos a direção comercial da sua oferta.' },
];

// As oito entregas. A ordem e fixa e e a mesma da landing.
const ENTREGAS = [
  { n: 1, k: 'diagnostico',   nome: 'Diagnóstico estratégico', resumo: 'A leitura completa do seu ponto de partida.',        fase: 1 },
  { n: 2, k: 'posicionamento',nome: 'Posicionamento',          resumo: 'Nicho, público, promessa e diferenciais definidos.', fase: 2 },
  { n: 3, k: 'metodo',        nome: 'Método próprio',          resumo: 'A lógica de transformação que sustenta a entrega.',  fase: 2 },
  { n: 4, k: 'jornada',       nome: 'Jornada do cliente',      resumo: 'A experiência antes, durante e depois.',             fase: 2 },
  { n: 5, k: 'preco',         nome: 'Precificação',            resumo: 'Preço coerente com valor e posicionamento.',         fase: 3 },
  { n: 6, k: 'materiais',     nome: 'Materiais',               resumo: 'Templates e roteiros para operar o produto.',        fase: 3 },
  { n: 7, k: 'comercial',     nome: 'Estratégia comercial',    resumo: 'Como a sua oferta chega ao mercado.',                fase: 3 },
  { n: 8, k: 'execucao',      nome: 'Plano de execução',       resumo: 'A sequência prática para colocar de pé.',            fase: 4 },
];

// Os tres niveis, com os valores da landing. Editaveis em Roteiros e niveis.
const NIVEIS_DEFAULT = [
  { k: 'start',   nome: 'Start',   valor: 8790,  resumo: 'Para tirar a ideia da cabeça e montar a primeira estrutura.',
    escopo: ['diagnostico', 'posicionamento', 'metodo'] },
  { k: 'pro',     nome: 'Pro',     valor: 19620, resumo: 'Para transformar expertise em uma oferta pronta para vender.',
    escopo: ['diagnostico', 'posicionamento', 'metodo', 'jornada', 'preco', 'materiais', 'comercial', 'execucao'] },
  { k: 'premium', nome: 'Premium', valor: 28490, resumo: 'Para projetos que pedem estrutura ampla de produto e estratégia.',
    escopo: ['diagnostico', 'posicionamento', 'metodo', 'jornada', 'preco', 'materiais', 'comercial', 'execucao'] },
];

// Os seis perfis da landing. Servem para classificar na leitura do caso.
const PERFIS = [
  { k: 'empresario',  nome: 'Empresário' },
  { k: 'mentor',      nome: 'Mentor' },
  { k: 'consultor',   nome: 'Consultor' },
  { k: 'especialista',nome: 'Especialista' },
  { k: 'lider',       nome: 'Líder ou gestor' },
  { k: 'liberal',     nome: 'Profissional liberal' },
];

// Estagio do projeto de quem aplicou.
const ESTAGIOS = [
  { k: 'ideia',      nome: 'Tem uma ideia' },
  { k: 'experiencia',nome: 'Tem experiência' },
  { k: 'resultado',  nome: 'Tem resultado' },
  { k: 'cobra',      nome: 'Já cobra por isso' },
];

// Andamento de uma aplicacao. As CHAVES sao as do servidor e a lista e
// fechada: inventar uma aqui faz o PATCH /leads devolver 400. Os rotulos
// sao os da casa.
const ANDAMENTOS = [
  { k: 'novo',        nome: 'Nova aplicação',    eti: 'eti-marca' },
  { k: 'contatado',   nome: 'Em leitura',        eti: 'eti-info' },
  { k: 'qualificado', nome: 'Cabe no método',    eti: 'eti-info' },
  { k: 'proposta',    nome: 'Proposta enviada',  eti: 'eti-atencao' },
  { k: 'ganho',       nome: 'Virou projeto',     eti: 'eti-ok' },
  { k: 'perdido',     nome: 'Não seguimos agora',eti: 'eti-neutra' },
];

// Estado de uma entrega dentro do projeto.
const ESTADOS_ENTREGA = [
  { k: 'nao_comecou', nome: 'Não começou',        eti: 'eti-neutra' },
  { k: 'escrevendo',  nome: 'Sendo escrita',      eti: 'eti-info' },
  { k: 'com_cliente', nome: 'Com o cliente',      eti: 'eti-atencao' },
  { k: 'aprovada',    nome: 'Aprovada',           eti: 'eti-ok' },
];

/* ---------------------------------------------------------------------
   2. Armazenamento.

   O prefixo iqv_ nao e enfeite. Ate 26/08 este mesmo endereco /sistema/
   serviu o sistema de gestao do A! Fatorial, outro negocio, e as chaves
   af_ dele podem estar vivas no navegador de quem abriu, na mesma origem.
   Este sistema escreve em iqv_ e NUNCA le nem apaga af_: aproveitar
   af_usuarios traria a equipe do outro negocio para dentro deste. Limpar
   o residuo e um botao em "A casa", com confirmacao escrita.

   Todo setItem vive dentro de try e catch porque a gravacao falha calada
   quando o armazenamento enche, e o trabalho da tarde sumiria sem aviso.
   --------------------------------------------------------------------- */
const CHAVES = {
  projetos:     'iqv_projetos',
  leituras:     'iqv_leituras',
  metodo:       'iqv_metodo',
  recebimentos: 'iqv_recebimentos',
  retratos:     'iqv_retratos',
  // iqv_usuarios saiu em 02/09: a equipe mora no servidor. A chave pode
  // continuar no navegador de quem usou o sistema antes disso, e "A casa"
  // nao a le nem a apaga: apagar dado de gente sem pedir e o tipo de
  // esperteza que some com trabalho alheio.
  permissoes:   'iqv_permissoes',
  marca:        'iqv_marca',
  registro:     'iqv_registro',
  formularioRascunho: 'iqv_formulario_rascunho',
  contratada:   'iqv_contratada',
};

// Ultimo erro de gravacao, para "A casa" poder mostrar em vez de calar.
let ULTIMA_FALHA_GRAVACAO = null;

function iqvLer(chave, padrao) {
  try {
    const bruto = localStorage.getItem(chave);
    if (bruto === null) return padrao;
    return JSON.parse(bruto);
  } catch (e) {
    return padrao;
  }
}

function iqvGravar(chave, valor) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
    return true;
  } catch (e) {
    ULTIMA_FALHA_GRAVACAO = { chave: chave, quando: new Date().toISOString(), motivo: String(e && e.name || e) };
    return false;
  }
}

// Quanto do armazenamento ja foi usado, so olhando as chaves iqv_.
function iqvOcupacao() {
  let bytes = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.indexOf('iqv_') === 0) bytes += (localStorage.getItem(k) || '').length;
    }
  } catch (e) { return { bytes: 0, porcento: 0 }; }
  // o limite pratico dos navegadores fica perto de 5 MB por origem
  return { bytes: bytes, porcento: Math.min(100, Math.round((bytes / (5 * 1024 * 1024)) * 100)) };
}

/* ---------------------------------------------------------------------
   3. Pecas que todas as telas usam.
   --------------------------------------------------------------------- */

// Tudo que veio de fora passa por aqui antes de virar HTML. O que uma
// pessoa escreveu no Typeform e a unica entrada de texto de desconhecido
// deste sistema, e e a que mais aparece na tela.
function esc(v) {
  return String(v === null || v === undefined ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// O banco grava "2026-08-26 01:12:33" em UTC, sem fuso escrito.
function data(v) {
  if (!v) return null;
  let t = String(v).trim().replace(' ', 'T');
  if (!/[zZ]|[+-]\d{2}:?\d{2}$/.test(t)) t += 'Z';
  const d = new Date(t);
  return isNaN(d.getTime()) ? null : d;
}

function dataCurta(v) {
  const d = data(v);
  return d ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : 'sem data';
}

function dataLonga(v) {
  const d = data(v);
  if (!d) return 'sem data';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
         ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// Dias inteiros desde a data. Negativo quer dizer que ainda vai acontecer.
function diasDesde(v) {
  const d = data(v);
  if (!d) return null;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

function haQuanto(v) {
  const n = diasDesde(v);
  if (n === null) return '';
  if (n <= 0) return 'hoje';
  if (n === 1) return 'ontem';
  return 'há ' + n + ' dias';
}

function moeda(n) {
  const v = Number(n) || 0;
  return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function hoje() { return new Date().toISOString().slice(0, 10); }

function porChave(lista, k) { return lista.find(function (x) { return x.k === k; }) || null; }

function nomeEntrega(k) { const e = porChave(ENTREGAS, k); return e ? e.nome : k; }
function nomeFase(n) { const f = FASES.find(function (x) { return x.n === Number(n); }); return f ? f.nome : '?'; }
function nomeEtapa(n) { const e = ETAPAS.find(function (x) { return x.n === Number(n); }); return e ? e.nome : '?'; }

// Etiqueta a partir de uma lista de vocabulario.
function etiqueta(lista, k, quandoFalta) {
  const item = porChave(lista, k);
  if (!item) return '<span class="eti eti-neutra">' + esc(quandoFalta || k || 'sem estado') + '</span>';
  return '<span class="eti ' + item.eti + '">' + esc(item.nome) + '</span>';
}

// Estado vazio. Nunca diz "sem dados": diz o que ainda nao aconteceu e
// qual e o proximo passo, com o nome da tela para onde ir.
function vazio(texto, colunas) {
  return '<tr><td class="vazio" colspan="' + (colunas || 6) + '">' + texto + '</td></tr>';
}

function aviso(tom, titulo, texto) {
  return '<div class="aviso aviso-' + tom + '"><b>' + titulo + '</b><p>' + texto + '</p></div>';
}

// Um icone do conjunto da marca. O mesmo desenho da landing, no mesmo
// traco: quem sai de uma pagina e entra na outra nao sente que trocou de
// empresa. `extra` aceita ic-14, ic-20 ou ic-34 para os tamanhos.
function ic(nome, extra) {
  return '<svg class="ic' + (extra ? ' ' + extra : '') + '" aria-hidden="true">' +
         '<use href="#' + esc(nome) + '"/></svg>';
}

/* -------------------------------------------------------------------
   Perguntar antes de uma coisa que nao tem volta.

   O window.prompt do navegador pedia para escrever TIRAR, ZERAR ou
   APAGAR num campo cinza que nao e do sistema, com quatro paragrafos de
   ensaio dentro. Ritual de terminal, nao confirmacao: quem esta com
   pressa digita a palavra sem ler, e quem le nao entende por que o
   sistema esta pedindo isso.

   Aqui e uma caixa da propria casa, com o foco no botao ao abrir,
   Escape para fechar e o foco de volta em quem chamou. Devolve uma
   promessa que vale true so se a pessoa clicar no botao vermelho.
   ------------------------------------------------------------------- */
function perguntar(p) {
  return new Promise(function (resolve) {
    const origem = document.activeElement;
    const veu = document.createElement('div');
    veu.className = 'veu';
    veu.id = 'veu-dialogo';
    veu.innerHTML =
      '<div class="dialogo" role="dialog" aria-modal="true" aria-labelledby="dlg-t">' +
        '<h2 id="dlg-t">' + esc(p.titulo) + '</h2>' +
        '<p>' + esc(p.texto) + '</p>' +
        (p.detalhe ? '<p class="dica" style="margin-top:10px">' + esc(p.detalhe) + '</p>' : '') +
        '<div class="fim">' +
          '<button class="bt bt-linha" id="dlg-nao">Cancelar</button>' +
          '<button class="bt bt-perigo" id="dlg-sim">' + esc(p.confirmar) + '</button>' +
        '</div>' +
      '</div>';

    function fechar(resposta) {
      document.removeEventListener('keydown', tecla, true);
      veu.remove();
      if (origem && origem.focus) origem.focus();
      resolve(resposta);
    }
    function tecla(e) {
      if (e.key === 'Escape') { e.preventDefault(); fechar(false); return; }
      // O foco nao escapa da caixa enquanto ela esta aberta.
      if (e.key === 'Tab') {
        const alvos = [porId('dlg-nao'), porId('dlg-sim')];
        const i = alvos.indexOf(document.activeElement);
        e.preventDefault();
        alvos[(i + (e.shiftKey ? -1 : 1) + alvos.length) % alvos.length].focus();
      }
    }

    document.body.appendChild(veu);
    veu.onclick = function (e) { if (e.target === veu) fechar(false); };
    porId('dlg-nao').onclick = function () { fechar(false); };
    porId('dlg-sim').onclick = function () { fechar(true); };
    document.addEventListener('keydown', tecla, true);
    porId('dlg-sim').focus();
  });
}

function porId(id) { return document.getElementById(id); }

/* Escrever num pedaço da tela.
   Depois de escrever, prende as máscaras do que acabou de nascer: campo
   com data-mascara passa a formatar sozinho sem cada tela precisar
   lembrar de ligar isso. O dataset dentro de mascarar() impede prender
   duas vezes no mesmo campo. */
function escrever(id, html) {
  const e = porId(id);
  if (!e) return;
  e.innerHTML = html;
  if (typeof mascararTudo === 'function') mascararTudo(e);
}

function texto(id, v) { const e = porId(id); if (e) e.textContent = v; }

/* ---------------------------------------------------------------------
   4. As telas do sistema.

   Cada arquivo de tela preenche DESENHO[chave] com a funcao que redesenha
   aquela tela. O roteador chama quando a tela entra.
   --------------------------------------------------------------------- */
const DESENHO = {};

const TELAS = [
  { k: 'semana',   nome: 'Minha semana',           ic: 'i-clock', grupo: 'Meu trabalho',
    titulo: ['Minha <b>semana</b>', 'O que vence, o que atrasou e quem está esperando'] },
  { k: 'ideias',   nome: 'Ideias que chegaram',    ic: 'i-spark', grupo: 'A mesa',
    titulo: ['Ideias que <b>chegaram</b>', 'Quem contou a ideia e ainda não teve resposta nossa'] },
  { k: 'formulario', nome: 'O formulário',         ic: 'i-flag', grupo: 'A mesa',
    titulo: ['O <b>formulário</b>', 'As perguntas que a pessoa responde antes de chegar na sua mesa'] },
  { k: 'leitura',  nome: 'Leitura do caso',        ic: 'i-search', grupo: 'A mesa',
    titulo: ['Leitura do <b>caso</b>', 'Cabe no método, em que nível, e o que a pessoa recebe de volta'], mesa: 'papel' },
  { k: 'projetos', nome: 'Projetos em estruturação',ic: 'i-layers', grupo: 'Meu trabalho',
    titulo: ['Projetos em <b>estruturação</b>', 'Em que fase está cada projeto e de quem é a bola'] },
  { k: 'entrega',  nome: 'Mesa da entrega',        ic: 'i-doc', grupo: 'Meu trabalho',
    titulo: ['Mesa da <b>entrega</b>', 'Onde a entrega é escrita'], mesa: 'papel' },
  { k: 'roteiros', nome: 'Roteiros e níveis',      ic: 'i-route', grupo: 'O método',
    titulo: ['Roteiros e <b>níveis</b>', 'Para a entrega não depender de improviso a cada cliente'] },
  { k: 'dinheiro', nome: 'Contratado e recebido',  ic: 'i-chart', grupo: 'A casa',
    titulo: ['Contratado e <b>recebido</b>', 'Quanto foi vendido e quanto entrou de fato'] },
  { k: 'cliente',  nome: 'Meu projeto',            ic: 'i-case', grupo: 'O cliente',
    titulo: ['Meu <b>projeto</b>', 'O que o cliente vê do próprio projeto'] },
  { k: 'propostas', nome: 'Propostas',           ic: 'i-doc', grupo: 'A mesa',
    titulo: ['<b>Propostas</b>', 'O que foi enviado, quem abriu e quem já assinou'] },
  // A chave continua 'casa'. Ela esta gravada nas permissoes do navegador
  // de quem ja usou o sistema, e trocar a chave apagaria a tela para essas
  // pessoas. O que muda e o nome na tela, que a Carla pediu.
  { k: 'casa',     nome: 'Configurações',          ic: 'i-shield', grupo: 'A casa',
    titulo: ['<b>Configurações</b>', 'Quem entra, o que cada um enxerga, e onde o dado pode se perder'] },
];

const GRUPOS = ['A mesa', 'Meu trabalho', 'O método', 'O cliente', 'A casa'];

/* ---------------------------------------------------------------------
   5. Quem pode ver o que.

   Tela nova nao pode nascer invisivel: as permissoes ficam salvas no
   navegador e foram escritas antes de ela existir. TELAS_VISTAS guarda o
   que este navegador ja conhece, e tela nunca apresentada entra com o
   acesso padrao uma vez so. Depois disso, desmarcar em "A casa" vale.
   --------------------------------------------------------------------- */
const PERMISSOES_DEFAULT = {
  gestor:      ['semana', 'ideias', 'formulario', 'propostas', 'leitura', 'projetos', 'entrega', 'roteiros', 'dinheiro', 'cliente', 'casa'],
  colaborador: ['semana', 'ideias', 'formulario', 'propostas', 'leitura', 'projetos', 'entrega', 'roteiros', 'cliente'],
  cliente:     ['cliente'],
};

const PAPEIS = [
  { k: 'gestor',      nome: 'Gestor',      ic: 'i-award', resumo: 'Vê tudo, assina veredito e lança recebimento.' },
  { k: 'colaborador', nome: 'Colaborador', ic: 'i-mic', resumo: 'Prepara leitura e escreve as entregas dos projetos dele.' },
  { k: 'cliente',     nome: 'Cliente',     ic: 'i-user', resumo: 'Acompanha o próprio projeto.' },
];

let PERMISSOES = JSON.parse(JSON.stringify(PERMISSOES_DEFAULT));
let TELAS_VISTAS = [];
// Telas que passaram a existir depois da versao anterior. So vale para o
// navegador que ainda nao tem TELAS_VISTAS guardada.
const TELAS_NOVAS = ['formulario', 'propostas'];

(function carregarPermissoes() {
  const salvo = iqvLer(CHAVES.permissoes, null);
  if (salvo && salvo.perm) PERMISSOES = salvo.perm;
  const todas = PERMISSOES_DEFAULT.gestor.slice();
  TELAS_VISTAS = (salvo && Array.isArray(salvo.vistas)) ? salvo.vistas
    : salvo ? todas.filter(function (t) { return TELAS_NOVAS.indexOf(t) < 0; })
    : todas.slice();

  let apresentou = false;
  todas.forEach(function (tela) {
    if (TELAS_VISTAS.indexOf(tela) >= 0) return;
    Object.keys(PERMISSOES_DEFAULT).forEach(function (papel) {
      if (PERMISSOES_DEFAULT[papel].indexOf(tela) < 0) return;
      if (!PERMISSOES[papel]) PERMISSOES[papel] = [];
      if (PERMISSOES[papel].indexOf(tela) < 0) PERMISSOES[papel].push(tela);
    });
    TELAS_VISTAS.push(tela);
    apresentou = true;
  });

  // o gestor nunca pode perder "A casa": e onde os acessos se configuram
  if (!PERMISSOES.gestor) PERMISSOES.gestor = PERMISSOES_DEFAULT.gestor.slice();
  if (PERMISSOES.gestor.indexOf('casa') < 0) PERMISSOES.gestor.push('casa');

  if (apresentou) salvarPermissoes();
})();

function salvarPermissoes() {
  return iqvGravar(CHAVES.permissoes, { perm: PERMISSOES, vistas: TELAS_VISTAS });
}

/* ---------------------------------------------------------------------
   6. Quem e a pessoa.

   Uma porta so, e ela e nossa. A pessoa entra com e-mail e senha, e quem
   confere e o servidor. Ate 01/09 eram duas portas somadas, o Cloudflare
   Access na frente e uma senha aqui dentro; a de fora saiu porque a tela
   de entrada era dela, e a Carla queria a da casa.

   O que EU guarda vem do servidor, e nao do navegador: id, nome, e-mail e
   papel chegam na resposta de quem entrou. O papel aqui serve para montar
   o menu e esconder tela. QUEM DE VERDADE DECIDE E O SERVIDOR, que confere
   o papel no banco a cada pedido: mexer no EU pelo console muda o menu e
   nao muda nada do que o servidor entrega.

   Tirar alguem de "A casa" agora TIRA o acesso dela de verdade, e as
   sessoes abertas dela caem na hora. Antes isso era so cosmetico, porque
   quem trancava o endereco era outro.
   --------------------------------------------------------------------- */
const EU = {
  id: null,
  email: null,
  nome: null,
  papel: null,
  pode: function (tela) {
    if (!this.papel) return false;
    return (PERMISSOES[this.papel] || []).indexOf(tela) >= 0;
  },
  ehGestor: function () { return this.papel === 'gestor'; },
};

/* ---------------------------------------------------------------------
   Quem confere a senha nao mora mais aqui.

   Ate 01/09 este arquivo calculava o resumo da senha e comparava com uma
   lista guardada no navegador. Isso dizia QUEM era a pessoa e nada mais:
   quem baixasse o arquivo enxergava a lista inteira e podia tentar senha
   a vontade, sem ninguem barrando. E cada navegador tinha a SUA lista,
   entao cadastrar alguem no computador da Carla nao cadastrava em lugar
   nenhum.

   Agora a senha e conferida no servidor e a lista e uma so para todo
   mundo. O que sobrou aqui e a moldura: quem esta na tela e o que essa
   pessoa pode ver.
   --------------------------------------------------------------------- */

// "e-mail ou senha nao conferem" vira "E-mail ou senha nao conferem". O
// servidor escreve em minuscula porque as mesmas frases aparecem no meio
// de outras; na tela elas comecam a frase.
/* ---------------------------------------------------------------------
   Máscaras dos campos que viram contrato.

   CNPJ, CPF e telefone entram em documento assinado, e um dígito a mais ou
   a menos ali não é erro de digitação: é contrato com a parte errada. Em
   vez de conferir depois, o campo não deixa escrever errado: aceita só
   dígito, para no comprimento certo e vai pondo ponto, barra e parêntese
   sozinho enquanto a pessoa digita.

   O que o servidor recebe não muda: ele já limpa tudo que não é dígito
   antes de guardar, então a máscara é só o que se vê.
   --------------------------------------------------------------------- */

function soDigitos(v) { return String(v === null || v === undefined ? '' : v).replace(/\D/g, ''); }

/* CNPJ: 00.000.000/0001-00 */
function mascaraCnpj(d) {
  const x = soDigitos(d).slice(0, 14);
  if (x.length <= 2) return x;
  if (x.length <= 5) return x.slice(0, 2) + '.' + x.slice(2);
  if (x.length <= 8) return x.slice(0, 2) + '.' + x.slice(2, 5) + '.' + x.slice(5);
  if (x.length <= 12) return x.slice(0, 2) + '.' + x.slice(2, 5) + '.' + x.slice(5, 8) + '/' + x.slice(8);
  return x.slice(0, 2) + '.' + x.slice(2, 5) + '.' + x.slice(5, 8) + '/' + x.slice(8, 12) + '-' + x.slice(12);
}

/* CPF: 000.000.000-00 */
function mascaraCpf(d) {
  const x = soDigitos(d).slice(0, 11);
  if (x.length <= 3) return x;
  if (x.length <= 6) return x.slice(0, 3) + '.' + x.slice(3);
  if (x.length <= 9) return x.slice(0, 3) + '.' + x.slice(3, 6) + '.' + x.slice(6);
  return x.slice(0, 3) + '.' + x.slice(3, 6) + '.' + x.slice(6, 9) + '-' + x.slice(9);
}

/* CPF ate 11 digitos, CNPJ do 12o em diante. A pessoa nao escolhe qual e:
   o proprio numero diz. */
function mascaraDocumento(d) {
  const x = soDigitos(d).slice(0, 14);
  return x.length <= 11 ? mascaraCpf(x) : mascaraCnpj(x);
}

/* Telefone do Brasil, sem o codigo do pais: (11) 99999-9999 */
function mascaraTelefone(d) {
  const x = soDigitos(d).slice(0, 11);
  if (!x.length) return '';
  if (x.length <= 2) return '(' + x;
  const meio = x.length <= 10 ? 6 : 7;
  if (x.length <= meio) return '(' + x.slice(0, 2) + ') ' + x.slice(2);
  return '(' + x.slice(0, 2) + ') ' + x.slice(2, meio) + '-' + x.slice(meio);
}

/* Com o codigo do pais na frente: +55 (11) 99999-9999. E este o formato
   que o WhatsApp precisa, e por isso o 55 aparece escrito em vez de ser
   uma regra que so quem programou conhece. */
function mascaraZapCompleto(d) {
  const x = soDigitos(d).slice(0, 13);
  if (x.length <= 2) return x ? '+' + x : '';
  return '+' + x.slice(0, 2) + ' ' + mascaraTelefone(x.slice(2));
}

/* Prende a mascara num campo, guardando o lugar do cursor.

   Sem a conta do cursor, corrigir um dígito no meio do CNPJ joga o cursor
   para o fim a cada tecla, e a pessoa digita o resto de tras para frente.
   A conta é: quantos dígitos havia antes do cursor continuam antes dele. */
function mascarar(el, formata) {
  if (!el || el.dataset.mascarado === '1') return;
  el.dataset.mascarado = '1';
  const aplicar = function () {
    const posicao = el.selectionStart;
    const digitosAntes = soDigitos(el.value.slice(0, posicao)).length;
    el.value = formata(el.value);
    let i = 0, vistos = 0;
    while (i < el.value.length && vistos < digitosAntes) {
      if (/\d/.test(el.value[i])) vistos++;
      i++;
    }
    try { el.setSelectionRange(i, i); } catch (e) { /* campo sem seleção */ }
  };
  el.addEventListener('input', aplicar);
  if (el.value) el.value = formata(el.value);
}

/* Prende todas as mascaras declaradas no proprio HTML, com data-mascara.
   Chamado depois de cada desenho: campo que acabou de nascer ja entra
   mascarado, e o dataset impede prender duas vezes no mesmo. */
const MASCARAS = {
  cnpj: mascaraCnpj,
  cpf: mascaraCpf,
  documento: mascaraDocumento,
  telefone: mascaraTelefone,
  zap: mascaraZapCompleto,
};

function mascararTudo(raiz) {
  const onde = raiz || document;
  onde.querySelectorAll('[data-mascara]').forEach(function (el) {
    const f = MASCARAS[el.dataset.mascara];
    if (f) mascarar(el, f);
  });
}

/* ---------------------------------------------------------------------
   Conferir CPF e CNPJ pelos digitos verificadores.

   A mascara impede escrever um numero com tamanho errado. Isto impede
   escrever um numero que nao existe: os dois ultimos digitos sao contas
   feitas com os anteriores, entao trocar dois digitos de lugar, que e o
   erro de digitacao mais comum, quase sempre cai aqui.
   --------------------------------------------------------------------- */

function cpfValido(v) {
  const d = soDigitos(v);
  if (d.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(d)) return false;   // 111.111.111-11 e parentes
  const conta = function (ate) {
    let soma = 0;
    for (let i = 0; i < ate; i++) soma += Number(d[i]) * (ate + 1 - i);
    const r = (soma * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return conta(9) === Number(d[9]) && conta(10) === Number(d[10]);
}

function cnpjValido(v) {
  const d = soDigitos(v);
  if (d.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(d)) return false;
  const conta = function (ate) {
    const pesos = ate === 12 ? [5,4,3,2,9,8,7,6,5,4,3,2] : [6,5,4,3,2,9,8,7,6,5,4,3,2];
    let soma = 0;
    for (let i = 0; i < ate; i++) soma += Number(d[i]) * pesos[i];
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return conta(12) === Number(d[12]) && conta(13) === Number(d[13]);
}

function documentoValido(v) {
  const d = soDigitos(v);
  return d.length === 11 ? cpfValido(d) : d.length === 14 ? cnpjValido(d) : false;
}

function primeiraMaiuscula(s) {
  const v = String(s || '');
  return v.charAt(0).toUpperCase() + v.slice(1);
}

/* ---------------------------------------------------------------------
   Embaralhar a senha ANTES de mandar.

   Senha crua nao sai deste navegador. O que viaja e a PROVA: o resultado
   de 210 mil voltas de PBKDF2 sobre a senha, com sal tirado do proprio
   e-mail.

   Por que aqui e nao no servidor. Embaralhar precisa ser caro, senao
   roubar o banco vira roubar as senhas. Mas o plano gratis do Worker da
   10 ms de processador por pedido, e 210 mil voltas gastam uns 120: no
   gratis, entrar falharia. Fazendo a conta aqui, ela custa uns 100 ms na
   maquina de quem entra, uma vez por mes, e o servidor gasta menos de 2.

   E o que importa continua de pe: quem roubar a tabela ainda precisa dar
   as 210 mil voltas para cada chute. O custo por chute nao mudou, so
   mudou de maquina.

   O sal sai do e-mail, e nao de uma pergunta ao servidor. Perguntar "qual
   e o sal desta pessoa" antes de ela provar quem e contaria a qualquer um
   quais e-mails existem. Sal nao precisa ser secreto: precisa ser
   diferente por pessoa, e o e-mail e.

   As regras vem do servidor, na resposta do /eu, para os dois lados nunca
   discordarem sobre quantas voltas dar.
   --------------------------------------------------------------------- */
let REGRAS_DA_PROVA = null;

const emHex = (bytes) => Array.from(new Uint8Array(bytes))
  .map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');

async function provaDaSenha(email, senha) {
  const regras = REGRAS_DA_PROVA;
  if (!regras) throw new Error('sem as regras do servidor');

  const alvo = String(email || '').trim().toLowerCase();
  const sal = await crypto.subtle.digest('SHA-256',
    new TextEncoder().encode(regras.tempero + alvo));

  const chave = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(String(senha)), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: sal, iterations: regras.voltas, hash: 'SHA-256' },
    chave, 256);
  return emHex(bits);
}

// Quanto a senha precisa ter. Fica deste lado porque e deste lado que a
// senha existe: no servidor chega a prova, que tem sempre o mesmo
// tamanho.
const SENHA_MINIMA = 8;

/* ---------------------------------------------------------------------
   As aplicacoes que chegam do servidor.

   As respostas de cada uma viajam como TEXTO, e sao abertas aqui. O
   servidor fazia isso: lia o texto e reescrevia no corpo da resposta, duas
   travessias por linha. Com duzentas aplicacoes de nove respostas
   compridas, so isso ja passava dos 10 ms de processador que o plano
   gratis da por pedido, e o pedido morria. Aqui e de graca, e a tela ja
   ia ter que ler o corpo inteiro de qualquer jeito.
   --------------------------------------------------------------------- */
function lerLeads(corpo) {
  const lista = (corpo && corpo.leads) || [];
  if (!corpo || !corpo.respostas_em_texto) return lista;
  return lista.map(function (l) {
    let r = {};
    try { r = JSON.parse(l.respostas || '{}'); } catch (e) { r = {}; }
    return Object.assign({}, l, { respostas: r });
  });
}

/* ---------------------------------------------------------------------
   Falar com o servidor.

   Um lugar so para os cabecalhos, para nenhuma tela sair sem eles. O
   cracha de quem entrou nao aparece aqui: ele viaja num cookie que o
   navegador manda sozinho e que JavaScript nenhum consegue ler.
   --------------------------------------------------------------------- */
function cabecalhos(extras) {
  return Object.assign(
    { accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    extras || {});
}

/* ---------------------------------------------------------------------
   A equipe.

   Quem tem acesso mora no servidor, e nao mais no navegador. A lista e
   lida uma vez na entrada e fica aqui para as telas que precisam dela
   (a semana, os projetos e as entregas, para dizer de quem e cada coisa).

   A sessao tambem saiu daqui: quem diz que a pessoa continua entrada e o
   cookie, que o servidor poe e o navegador guarda. Sessao decidida pelo
   proprio navegador nao decidia nada.
   --------------------------------------------------------------------- */
let EQUIPE = [];

async function carregarEquipe() {
  try {
    const r = await fetch('/pessoas', { headers: cabecalhos(), cache: 'no-store' });
    if (!r.ok) return;
    const d = await r.json();
    if (!d || !d.ok || !Array.isArray(d.pessoas)) return;
    EQUIPE = d.pessoas;

    // A lista chega DEPOIS da primeira tela ser desenhada, senao a
    // abertura esperaria por ela sem precisar. Mas quem ja esta na tela
    // veria "ninguem" no lugar dos nomes ate clicar em outra coisa: quem
    // pede a lista redesenha o que estiver aberto.
    if (TELA_ATUAL && DESENHO[TELA_ATUAL]) DESENHO[TELA_ATUAL]();
  } catch (e) {
    // Sem a lista as telas de trabalho abrem com "ninguem" no lugar dos
    // nomes, o que e ruim mas nao impede escrever. Derrubar a entrada
    // inteira por causa disso seria pior.
  }
}

function pessoas() { return EQUIPE; }

// mantido porque as telas ja chamam assim
function usuarios() { return pessoas(); }

function acharUsuario(email) {
  const alvo = String(email || '').trim().toLowerCase();
  if (!alvo) return null;
  return usuarios().find(function (u) { return String(u.email || '').toLowerCase() === alvo; }) || null;
}

/* ---------------------------------------------------------------------
   7. Roteador.
   --------------------------------------------------------------------- */
let TELA_ATUAL = null;

function irPara(chave) {
  if (!EU.pode(chave)) {
    const primeira = (PERMISSOES[EU.papel] || [])[0];
    if (!primeira || primeira === chave) return;
    chave = primeira;
  }
  TELA_ATUAL = chave;

  document.querySelectorAll('.tela').forEach(function (t) { t.classList.remove('on'); });
  const alvo = porId('tela-' + chave);
  if (alvo) alvo.classList.add('on');

  document.querySelectorAll('.menu-item').forEach(function (b) { b.classList.remove('on'); });
  const botao = porId('menu-' + chave);
  if (botao) botao.classList.add('on');

  const t = TELAS.find(function (x) { return x.k === chave; });
  if (t) { escrever('topo-titulo', t.titulo[0]); texto('topo-sub', t.titulo[1]); }
  // A superficie da tela. Escrever e ler texto longo acontece no papel.
  if (t && t.mesa) document.body.dataset.mesa = t.mesa;
  else delete document.body.dataset.mesa;

  const lateral = porId('lateral');
  if (lateral) lateral.classList.remove('aberta');
  const veu = porId('veu');
  if (veu) veu.remove();
  window.scrollTo(0, 0);

  if (typeof DESENHO[chave] === 'function') DESENHO[chave]();
}

function montarMenu() {
  const visiveis = TELAS.filter(function (t) { return EU.pode(t.k); });
  let html = '';
  GRUPOS.forEach(function (g) {
    const doGrupo = visiveis.filter(function (t) { return t.grupo === g; });
    if (!doGrupo.length) return;
    html += '<div class="menu-grupo">' + esc(g) + '</div>';
    doGrupo.forEach(function (t) {
      html += '<button class="menu-item" id="menu-' + t.k + '" onclick="irPara(\'' + t.k + '\')">' +
              ic(t.ic) + esc(t.nome) +
              '<span class="conta" id="conta-' + t.k + '" hidden></span></button>';
    });
  });
  escrever('menu', html);
}

// Numero ao lado do item do menu. Some quando e zero: contador em zero
// so ocupa espaco.
function contador(chave, n) {
  const e = porId('conta-' + chave);
  if (!e) return;
  if (!n) { e.hidden = true; return; }
  e.hidden = false;
  e.textContent = n > 99 ? '99+' : String(n);
}

function alternarMenu() {
  const lateral = porId('lateral');
  if (!lateral) return;
  const abrindo = !lateral.classList.contains('aberta');
  lateral.classList.toggle('aberta', abrindo);
  const antigo = porId('veu');
  if (antigo) antigo.remove();
  if (abrindo) {
    const veu = document.createElement('div');
    veu.className = 'veu'; veu.id = 'veu';
    veu.onclick = alternarMenu;
    document.body.appendChild(veu);
  }
}

async function sair() {
  // Sair de verdade apaga a sessao NO SERVIDOR, e nao so o cookie daqui.
  // Cookie apagado so no navegador continuaria valendo se alguem tivesse
  // copiado o valor dele, e "eu sai" viraria mentira por um mes.
  try {
    await fetch('/sair', { method: 'POST', headers: cabecalhos(), cache: 'no-store' });
  } catch (e) {
    // Sem rede nao da para encerrar do outro lado. Recarregar ainda tira
    // a pessoa da tela, e a porta vai dizer o que houve.
  }
  location.reload();
}
