/* =====================================================================
   Formulario de aplicacao  ·  Ideia Que Vende  ·  o motor

   Uma pergunta por tela. A tela se desenha sempre a partir de um objeto
   de respostas guardado com a CHAVE ESTAVEL da pergunta, nunca com o
   titulo: o titulo muda quando a Carla edita o formulario, e a chave
   nao. Nenhuma resposta mora no desenho, e por isso voltar nunca perde
   nada, e por isso a mesma resposta atravessa uma troca de versao.

   Duas identidades nascem aqui e nunca viajam juntas:

     envio    vai em toda submissao, e e ele que faz reenvio depois de
              queda de rede atualizar a aplicacao em vez de duplicar.
     visita   vai em todo passo de metrica, e vive so enquanto a aba
              existe.

   Os dois nunca sao gravados na mesma linha, e e essa separacao que
   impede a tabela de comportamento de virar dado pessoal por acidente.
   Custa duas coisas, de proposito: nao da para saber quanto tempo uma
   pessoa com nome levou, e nao da para exigir que um envio tenha uma
   abertura antes dele.
   ===================================================================== */
(function () {
'use strict';

/* ---------------------------------------------------------------------
   1. A definicao de reserva.

   O build embute aqui a definicao ja podada, do mesmo jeito que a rota
   publica devolve. Se a leitura do servidor falhar, a pagina abre com
   ela e a pessoa responde igual, sem ver tela de erro: erro que a pessoa
   nao precisa resolver nao vira aviso na cara dela.
   --------------------------------------------------------------------- */
var RESERVA = __DEFINICAO__;

/* O que a casa configura. O numero do WhatsApp e o mesmo lugar da
   landing: vazio, o botao de conversa nao aparece, porque botao que nao
   leva a lugar nenhum e pior que botao nenhum. */
var CONFIG = {
  whatsapp: '',
  site: '/'
};

/* ---------------------------------------------------------------------
   2. Ferramentas.
   --------------------------------------------------------------------- */

// Texto de fora nunca vira marcacao sem passar por aqui. Vale para o que
// veio do servidor e vale para o que a propria pessoa escreveu.
function esc(v) {
  return String(v === null || v === undefined ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function porId(id) { return document.getElementById(id); }

function tenta(fn) { try { return fn(); } catch (e) { return null; } }

// Identificador sorteado no formato que as rotas conferem.
function sorteio() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  var b = new Uint8Array(16);
  if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(b);
  else for (var i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  var h = [];
  for (var j = 0; j < 16; j++) h.push((b[j] + 0x100).toString(16).slice(1));
  return h.slice(0, 4).join('') + '-' + h.slice(4, 6).join('') + '-' +
         h.slice(6, 8).join('') + '-' + h.slice(8, 10).join('') + '-' +
         h.slice(10, 16).join('');
}

var MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
             'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

function dataPorExtenso(quando) {
  var d = new Date(quando);
  if (!d || isNaN(d.getTime())) return '';
  return d.getDate() + ' de ' + MESES[d.getMonth()];
}

function contar(txt) { return Array.from(String(txt || '')).length; }

var MOVIMENTO_REDUZIDO = tenta(function () {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}) || false;

var PONTEIRO_GROSSO = tenta(function () {
  return window.matchMedia('(pointer: coarse)').matches;
}) || false;

/* ---------------------------------------------------------------------
   3. As chaves guardadas no navegador.

   O prefixo desta casa e iqv_. O prefixo af_ e de outro negocio, na
   mesma origem, e nao se le nem se escreve.
   --------------------------------------------------------------------- */
var CHAVE_RASCUNHO = 'iqv_aplicar_rascunho';
var CHAVE_ENVIADO  = 'iqv_aplicar_enviado';
var DIAS_RASCUNHO  = 14;
var DIAS_ENVIADO   = 7;

function guardar(chave, valor) {
  // Janela anonima com armazenamento cheio estoura ao gravar, e um
  // formulario nao pode morrer por nao conseguir guardar rascunho.
  tenta(function () { localStorage.setItem(chave, JSON.stringify(valor)); });
}

function recuperar(chave) {
  return tenta(function () {
    var cru = localStorage.getItem(chave);
    return cru ? JSON.parse(cru) : null;
  });
}

function apagar(chave) {
  tenta(function () { localStorage.removeItem(chave); });
}

/* ---------------------------------------------------------------------
   4. O estado.
   --------------------------------------------------------------------- */
var E = {
  def: null,            // a definicao em uso
  reserva: false,       // veio da copia embutida
  resolvida: false,     // o servidor ja respondeu, de um jeito ou de outro
  mexeu: false,         // a pessoa ja respondeu alguma coisa nesta visita
  respostas: {},        // chave estavel -> valor
  lista: [],            // perguntas visiveis agora
  numero: {},           // chave -> numero mostrado
  total: 0,             // quantas contam na barra
  pos: -1,              // -1 capa, 0..n-1 perguntas, n revisao, n+1 fim
  envio: null,
  visita: null,
  plano: null,
  origem: 'landing',
  origemVisita: 'direto',
  campanha: null,
  referencia: null,
  enviando: false,
  concluido: false,
  falha: null,          // qual dos estados de falha esta na tela
  errosServidor: {},    // chave -> frase vinda do servidor
  voltarParaRevisao: false,
  retomada: null,       // data do rascunho retomado, para a linha de dica
  abertoEm: Date.now(),
  telaEm: Date.now(),
  travado: false,
  telaAtual: null,
  avancoAgendado: null,
  seq: 0,
  fila: [],
  desistiuMandado: false,
  ultimaParcial: 0,
  parcialPendente: false,  // ha resposta nova esperando a vez dela
  parcialParouEm: null,    // e em que pergunta ela parou
  relogioParcial: null
};

/* ---------------------------------------------------------------------
   5. O que veio no endereco.

   O plano e a origem entram nas colunas proprias da aplicacao. Qualquer
   outro parametro de campanha fica no lado da metrica e NUNCA entra nas
   respostas: viraria uma linha com nome de programador na tela da mesa.
   --------------------------------------------------------------------- */
function lerEndereco() {
  var p = tenta(function () { return new URLSearchParams(location.search); });
  if (!p) return;
  var plano = (p.get('plano') || '').toLowerCase();
  if (plano === 'start' || plano === 'pro' || plano === 'premium') E.plano = plano;

  var origem = (p.get('origem') || '').toLowerCase();
  if (/^[a-z0-9_-]{1,24}$/.test(origem)) E.origem = origem;

  var fonte = (p.get('origem') || p.get('utm_source') || '').toLowerCase();
  if (/^[a-z0-9_-]{1,24}$/.test(fonte)) E.origemVisita = fonte;

  var camp = (p.get('campanha') || p.get('utm_campaign') || '').toLowerCase();
  if (/^[a-z0-9_-]{1,40}$/.test(camp)) E.campanha = camp;
}

// So o dominio de quem indicou, nunca o endereco inteiro: caminho e busca
// carregam identificador de campanha e as vezes de pessoa.
function dominioDeOrigem() {
  return tenta(function () {
    if (!document.referrer) return null;
    var u = new URL(document.referrer);
    if (u.hostname === location.hostname) return null;
    return u.hostname.replace(/^www\./, '').slice(0, 80);
  });
}

// Tres palavras nao sao assinatura; a linha inteira do navegador e.
function aparelho() {
  var ua = navigator.userAgent || '';
  if (/iPad|Tablet|PlayBook|Silk/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) return 'tablet';
  if (/Mobi|Android|iPhone|iPod/i.test(ua)) return 'celular';
  return 'computador';
}

/* ---------------------------------------------------------------------
   6. Os passos que viram metrica.

   O corpo do passo nao carrega o que a pessoa escreveu e nem o que ela
   escolheu: so a chave da pergunta, o tipo e o tempo. O que ela
   respondeu so existe depois que ela apertou enviar.
   --------------------------------------------------------------------- */
var TEMPO_LOTE = 10000;
var relogioLote = null;

function contexto() {
  return {
    aparelho: aparelho(),
    origem: E.origemVisita,
    campanha: E.campanha,
    referencia: E.referencia,
    plano: E.plano
  };
}

function passo(tipo, chave, ordem, ms, detalhe) {
  if (!E.visita) return;
  E.seq += 1;
  E.fila.push({
    seq: E.seq,
    tipo: tipo,
    chave: chave || null,
    ordem: ordem === undefined ? null : ordem,
    ms: Math.max(0, Math.min(3600000, Math.round(ms || 0))),
    detalhe: detalhe || null
  });
  if (E.fila.length >= 5) despachar(false);
  else agendarLote();
}

function agendarLote() {
  if (relogioLote) return;
  relogioLote = setTimeout(function () {
    relogioLote = null;
    despachar(false);
  }, TEMPO_LOTE);
}

function despachar(porBeacon) {
  if (!E.fila.length || !E.visita) return;
  if (relogioLote) { clearTimeout(relogioLote); relogioLote = null; }
  var lote = E.fila.splice(0, 20);
  var corpo = JSON.stringify({
    visita: E.visita,
    versao: versaoEmUso(),
    contexto: contexto(),
    eventos: lote
  });
  if (porBeacon && navigator.sendBeacon) {
    var foi = tenta(function () {
      return navigator.sendBeacon('/api/evento', new Blob([corpo], { type: 'application/json' }));
    });
    if (foi) return;
  }
  tenta(function () {
    fetch('/api/evento', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: corpo,
      keepalive: true
    }).catch(function () {});
  });
}

/* ---------------------------------------------------------------------
   7. A definicao e as perguntas visiveis.
   --------------------------------------------------------------------- */
// A versao de fabrica e a zero, e zero e um numero de versao de verdade.
// Trocar zero por um so porque zero e falso fazia a resposta chegar
// dizendo que a pessoa leu a versao 1, que pode ter outras perguntas.
function versaoEmUso() {
  var v = E.def ? E.def.versao : null;
  return typeof v === 'number' && isFinite(v) ? v : 0;
}

function acharPergunta(chave) {
  var lista = (E.def && E.def.perguntas) || [];
  for (var i = 0; i < lista.length; i++) if (lista[i].chave === chave) return lista[i];
  return null;
}

function ordemNaVersao(chave) {
  var lista = (E.def && E.def.perguntas) || [];
  for (var i = 0; i < lista.length; i++) if (lista[i].chave === chave) return i + 1;
  return null;
}

// A condicao so aponta para tras, e pergunta escondida nao e perguntada,
// nao conta como respondida e nunca e obrigatoria.
function condicaoAberta(cond) {
  if (!cond || !cond.chave) return true;
  var valor = E.respostas[cond.chave];
  var alvos = cond.igual_a || [];
  if (valor === undefined || valor === null || valor === '') return false;
  if (Array.isArray(valor)) {
    for (var i = 0; i < valor.length; i++) if (alvos.indexOf(valor[i]) >= 0) return true;
    return false;
  }
  return alvos.indexOf(valor) >= 0;
}

function recalcular() {
  var lista = [];
  var todas = (E.def && E.def.perguntas) || [];
  for (var i = 0; i < todas.length; i++) {
    var p = todas[i];
    if (p.ativa === false) continue;
    if (p.mostrar_se && !condicaoAberta(p.mostrar_se)) continue;
    lista.push(p);
  }
  E.lista = lista;
  E.numero = {};
  var n = 0;
  for (var j = 0; j < lista.length; j++) {
    if (lista[j].tipo === 'recado') continue;
    n += 1;
    E.numero[lista[j].chave] = n;
  }
  E.total = n;

  // Se a pessoa voltou e trocou a resposta que abria uma condicao, a
  // resposta da pergunta escondida vai embora na hora, para nao seguir
  // junto uma coisa que ela nao confirmou.
  var visivel = {};
  for (var k = 0; k < lista.length; k++) visivel[lista[k].chave] = true;
  Object.keys(E.respostas).forEach(function (chave) {
    var p2 = acharPergunta(chave);
    if (p2 && p2.mostrar_se && !visivel[chave]) delete E.respostas[chave];
  });
}

/* O primeiro nome entra no texto da pergunta onde a Carla escrever a
   marca da resposta. Sem resposta, a marca some e a frase continua de pe. */
function interpolar(txt) {
  var cru = String(txt || '');
  var trocou = false;
  var saida = cru.replace(/\{\{\s*([a-z][a-z0-9_]{0,39})\s*\}\}(\s*,\s*)?/g, function (todo, chave, virgula) {
    var v = E.respostas[chave];
    if (Array.isArray(v)) v = v[0];
    v = String(v === undefined || v === null ? '' : v).trim().split(/\s+/)[0] || '';
    if (v) return v + (virgula || '');
    trocou = true;
    return '';
  });
  saida = saida.replace(/\s+/g, ' ').trim();
  if (trocou && saida) saida = saida.charAt(0).toUpperCase() + saida.slice(1);
  return saida;
}

/* ---------------------------------------------------------------------
   8. Os paises do telefone.

   Lista curta com busca, sem bandeira: bandeira de emoji nem desenha
   igual em todo sistema, e emoji e coisa que a casa nao escreve. O
   Brasil vem escolhido por padrao fixo, nunca por endereco de rede.
   --------------------------------------------------------------------- */
var PAISES = [
  { s: 'BR', c: '55',  n: 'Brasil' },
  { s: 'PT', c: '351', n: 'Portugal' },
  { s: 'US', c: '1',   n: 'Estados Unidos' },
  { s: 'AR', c: '54',  n: 'Argentina' },
  { s: 'AO', c: '244', n: 'Angola' },
  { s: 'AU', c: '61',  n: 'Austrália' },
  { s: 'BE', c: '32',  n: 'Bélgica' },
  { s: 'BO', c: '591', n: 'Bolívia' },
  { s: 'CA', c: '1',   n: 'Canadá' },
  { s: 'CL', c: '56',  n: 'Chile' },
  { s: 'CN', c: '86',  n: 'China' },
  { s: 'CO', c: '57',  n: 'Colômbia' },
  { s: 'CR', c: '506', n: 'Costa Rica' },
  { s: 'ES', c: '34',  n: 'Espanha' },
  { s: 'FR', c: '33',  n: 'França' },
  { s: 'DE', c: '49',  n: 'Alemanha' },
  { s: 'IE', c: '353', n: 'Irlanda' },
  { s: 'IT', c: '39',  n: 'Itália' },
  { s: 'JP', c: '81',  n: 'Japão' },
  { s: 'MX', c: '52',  n: 'México' },
  { s: 'MZ', c: '258', n: 'Moçambique' },
  { s: 'NL', c: '31',  n: 'Países Baixos' },
  { s: 'PY', c: '595', n: 'Paraguai' },
  { s: 'PE', c: '51',  n: 'Peru' },
  { s: 'GB', c: '44',  n: 'Reino Unido' },
  { s: 'CH', c: '41',  n: 'Suíça' },
  { s: 'UY', c: '598', n: 'Uruguai' },
  { s: 'VE', c: '58',  n: 'Venezuela' }
];

function paisPorSigla(sigla) {
  for (var i = 0; i < PAISES.length; i++) if (PAISES[i].s === sigla) return PAISES[i];
  return PAISES[0];
}

// O codigo mais longo primeiro, senao 1 casa antes de 351.
var CODIGOS = PAISES.slice().sort(function (a, b) { return b.c.length - a.c.length; });

function paisPorCodigo(codigo) {
  for (var i = 0; i < PAISES.length; i++) if (PAISES[i].c === codigo) return PAISES[i];
  return null;
}

function soDigitos(t) { return String(t || '').replace(/\D+/g, ''); }

// A mascara do Brasil, e so a do Brasil: mascara errada em pais
// estrangeiro e pior que mascara nenhuma.
function mascaraBR(d) {
  d = d.slice(0, 11);
  if (!d) return '';
  if (d.length <= 2) return '(' + d;
  if (d.length <= 6) return '(' + d.slice(0, 2) + ') ' + d.slice(2);
  if (d.length <= 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
  return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
}

// O formato internacional que a mesa espera na coluna do WhatsApp, e que
// e o mesmo que a pessoa ve na tela de conferir.
function telefoneBonito(pais, d) {
  if (!d) return '';
  if (pais.c === '55') {
    if (d.length >= 11) return '+55 ' + d.slice(0, 2) + ' ' + d.slice(2, 7) + '-' + d.slice(7, 11);
    if (d.length >= 10) return '+55 ' + d.slice(0, 2) + ' ' + d.slice(2, 6) + '-' + d.slice(6, 10);
    return '+55 ' + d;
  }
  return '+' + pais.c + ' ' + d;
}

function lerTelefone(valor) {
  var bruto = String(valor || '').trim();
  if (!bruto) return { pais: paisPorSigla('BR'), digitos: '' };
  var m = bruto.match(/^\+(\d{1,4})[\s.-]?([\d\s().-]*)$/);
  if (m) {
    var achado = paisPorCodigo(m[1]);
    if (achado) return { pais: achado, digitos: soDigitos(m[2]) };
    for (var i = 0; i < CODIGOS.length; i++) {
      var c = CODIGOS[i];
      var junto = soDigitos(bruto);
      if (junto.indexOf(c.c) === 0) return { pais: c, digitos: junto.slice(c.c.length) };
    }
  }
  return { pais: paisPorSigla('BR'), digitos: soDigitos(bruto).slice(0, 11) };
}

/* ---------------------------------------------------------------------
   9. E-mail.

   Aceite permissivo de proposito: regex fechada demais recusa e-mail
   valido, e recusar aplicacao valida custa mais que aceitar uma errada.
   --------------------------------------------------------------------- */
function emailValido(t) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(t || '').trim());
}

var DOMINIOS = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com.br',
                'icloud.com', 'live.com', 'terra.com.br', 'uol.com.br'];

function distancia(a, b) {
  if (Math.abs(a.length - b.length) > 1) return 9;
  var linha = [], i, j;
  for (j = 0; j <= b.length; j++) linha[j] = j;
  for (i = 1; i <= a.length; i++) {
    var ante = linha[0];
    linha[0] = i;
    for (j = 1; j <= b.length; j++) {
      var tmp = linha[j];
      linha[j] = Math.min(linha[j] + 1, linha[j - 1] + 1, ante + (a[i - 1] === b[j - 1] ? 0 : 1));
      ante = tmp;
    }
  }
  return linha[b.length];
}

// Nao bloqueia, pergunta. Cada e-mail errado e uma aplicacao que a Carla
// nunca responde.
function dominioParecido(email) {
  var partes = String(email || '').trim().toLowerCase().split('@');
  if (partes.length !== 2 || !partes[1]) return null;
  var dom = partes[1];
  if (DOMINIOS.indexOf(dom) >= 0) return null;
  for (var i = 0; i < DOMINIOS.length; i++) {
    if (distancia(dom, DOMINIOS[i]) === 1) return partes[0] + '@' + DOMINIOS[i];
  }
  return null;
}

/* ---------------------------------------------------------------------
   10. A conferencia de cada resposta.

   Confere na tentativa de avancar, nunca a cada tecla. Depois que a
   mensagem apareceu uma vez naquele campo, ai sim confere a cada tecla,
   para a mensagem sumir no instante em que a resposta ficar boa.
   --------------------------------------------------------------------- */
var PADRAO = {
  texto_curto: 'Escreva uma resposta com até 200 caracteres.',
  texto_longo: 'Escreva uma resposta com até 2000 caracteres.',
  email: 'Confira o e-mail: faltou o arroba ou o endereço depois dele.',
  telefone: 'Confira o número: com DDD, ele tem 10 ou 11 dígitos.',
  numero: 'Escreva um número.',
  escolha_unica: 'Escolha uma das opções.',
  escolha_multipla: 'Escolha pelo menos uma das opções.'
};
var VAZIO_TEXTO  = 'Escreva a sua resposta para seguir.';
var VAZIO_ESCOLHA = 'Escolha uma opção para seguir.';
var CURTO_LONGO  = 'Conte um pouco mais. Duas ou três linhas já bastam.';

function estaVazio(v) {
  if (v === undefined || v === null) return true;
  if (Array.isArray(v)) return v.length === 0;
  return String(v).trim() === '';
}

function chaveDeOpcao(p, chave) {
  var op = p.opcoes || [];
  for (var i = 0; i < op.length; i++) if (op[i].chave === chave) return op[i];
  return null;
}

// Devolve nulo quando esta boa, ou { texto, detalhe } quando nao esta.
function conferir(p) {
  var v = E.respostas[p.chave];
  var escolha = p.tipo === 'escolha_unica' || p.tipo === 'escolha_multipla';
  if (p.tipo === 'recado') return null;

  if (estaVazio(v)) {
    if (!p.obrigatoria) return null;
    return { texto: p.erro || (escolha ? VAZIO_ESCOLHA : VAZIO_TEXTO), detalhe: 'vazio' };
  }

  var mas = p.mascara || {};
  var txt = Array.isArray(v) ? '' : String(v).trim();

  if (p.tipo === 'texto_curto' || p.tipo === 'texto_longo') {
    var teto = mas.maximo || (p.tipo === 'texto_longo' ? 2000 : 200);
    var piso = mas.minimo || 0;
    if (contar(txt) > teto) return { texto: p.erro || PADRAO[p.tipo], detalhe: 'longo' };
    if (piso && contar(txt) < piso) {
      return { texto: p.erro || (p.tipo === 'texto_longo' ? CURTO_LONGO : VAZIO_TEXTO), detalhe: 'curto' };
    }
    return null;
  }
  if (p.tipo === 'email') {
    if (contar(txt) > 254) return { texto: p.erro || PADRAO.email, detalhe: 'longo' };
    return emailValido(txt) ? null : { texto: p.erro || PADRAO.email, detalhe: 'formato' };
  }
  if (p.tipo === 'telefone') {
    var lido = lerTelefone(txt);
    var n = lido.digitos.length;
    // A regua e a mesma do envio, e conta o codigo do pais junto: de 10 a
    // 15 digitos ao todo. Contar so os digitos nacionais aqui deixava
    // passar numero curto de fora, que era recusado nove perguntas
    // depois, quando ja nao da para consertar sem voltar tudo.
    var total = lido.pais.c.length + n;
    var ok = lido.pais.c === '55'
      ? (n === 10 || n === 11)
      : (total >= 10 && total <= 15);
    return ok ? null : { texto: p.erro || PADRAO.telefone, detalhe: 'formato' };
  }
  if (p.tipo === 'numero') {
    var num = Number(String(txt).replace(',', '.'));
    if (!isFinite(num)) return { texto: p.erro || PADRAO.numero, detalhe: 'formato' };
    if (mas.minimo !== undefined && mas.minimo !== null && num < mas.minimo) {
      return { texto: p.erro || PADRAO.numero, detalhe: 'curto' };
    }
    if (mas.maximo !== undefined && mas.maximo !== null && num > mas.maximo) {
      return { texto: p.erro || PADRAO.numero, detalhe: 'longo' };
    }
    return null;
  }
  if (p.tipo === 'escolha_unica') {
    return chaveDeOpcao(p, v) ? null : { texto: p.erro || PADRAO.escolha_unica, detalhe: 'opcao' };
  }
  if (p.tipo === 'escolha_multipla') {
    if (v.length > 20) return { texto: p.erro || PADRAO.escolha_multipla, detalhe: 'opcao' };
    for (var i = 0; i < v.length; i++) {
      if (!chaveDeOpcao(p, v[i])) return { texto: p.erro || PADRAO.escolha_multipla, detalhe: 'opcao' };
    }
    return null;
  }
  return null;
}

/* O que a pessoa ve escrito na tela de conferir. */
function valorLegivel(p) {
  var v = E.respostas[p.chave];
  if (estaVazio(v)) return '';
  if (p.tipo === 'escolha_unica') {
    var op = chaveDeOpcao(p, v);
    return op ? op.texto : '';
  }
  if (p.tipo === 'escolha_multipla') {
    var nomes = [];
    (p.opcoes || []).forEach(function (o) {
      if (v.indexOf(o.chave) >= 0) nomes.push(o.texto);
    });
    return nomes.join(', ');
  }
  return String(v);
}

/* ---------------------------------------------------------------------
   11. O rascunho.

   E a rede embaixo de tudo: e ele que faz falha de envio nao virar
   resposta perdida.
   --------------------------------------------------------------------- */
function salvarRascunho() {
  if (E.concluido) return;
  guardar(CHAVE_RASCUNHO, {
    v: 1,
    envio: E.envio,
    versao: versaoEmUso(),
    plano: E.plano,
    origem: E.origem,
    pergunta_atual: E.pos,
    respostas: E.respostas,
    salvo_em: new Date().toISOString()
  });
}

var relogioRascunho = null;
function salvarRascunhoDepois() {
  if (relogioRascunho) clearTimeout(relogioRascunho);
  relogioRascunho = setTimeout(function () {
    relogioRascunho = null;
    salvarRascunho();
  }, 400);
}

/* ---------------------------------------------------------------------
   12. O desenho de cada tela.
   --------------------------------------------------------------------- */
var palco = porId('palco');

function icone(nome, classe) {
  return '<svg class="' + esc(classe || '') + '" aria-hidden="true"><use href="#i-' + esc(nome) + '"/></svg>';
}

function novaTela(classe, dentro) {
  var s = document.createElement('section');
  s.className = 'tela ' + (classe || '');
  s.setAttribute('tabindex', '-1');
  s.innerHTML = dentro;
  return s;
}

function dicaDoTeclado(p) {
  if (p.tipo === 'texto_longo') return '<kbd>Ctrl</kbd> e <kbd>Enter</kbd> para avançar. Enter quebra a linha.';
  if (p.tipo === 'escolha_unica' || p.tipo === 'escolha_multipla') return 'aperte a letra';
  if (p.tipo === 'recado') return 'ou aperte <kbd>Enter</kbd>';
  return 'ou aperte <kbd>Enter</kbd>';
}

function blocoAcoes(rotulo, p) {
  var pular = (p && !p.obrigatoria && p.tipo !== 'recado')
    ? '<button type="button" class="btn-texto js-pular">pular</button>' : '';
  return '<div class="acoes">' +
           '<button type="button" class="btn btn-o avancar js-avancar">' +
             '<span>' + esc(rotulo) + '</span>' + icone('arrow') +
           '</button>' +
           (p ? '<span class="dica dica-teclado">' + dicaDoTeclado(p) + '</span>' : '') +
           pular +
         '</div>';
}

/* A capa. O unico lugar centrado: da pergunta 1 em diante tudo encosta a
   esquerda, e essa troca de eixo ja diz "comecou" sem animacao nenhuma. */
function telaCapa() {
  var ab = (E.def && E.def.abertura) || {};
  var titulo = interpolar(ab.titulo || E.def.titulo || 'Conte a sua ideia');
  var texto = interpolar(ab.texto || '');
  var botao = ab.botao || 'Começar';
  var tempo = ab.tempo || '';

  // O tempo da definicao ja traz as duas informacoes numa frase so
  // ("9 perguntas, cerca de 4 minutos"). Quando ela vem assim, cada
  // metade vai no seu selo, para a contagem nao aparecer duas vezes.
  var quantas = E.total + (E.total === 1 ? ' pergunta' : ' perguntas');
  var relogio = tempo;
  var partes = tempo.split(/\s*,\s*/);
  if (partes.length === 2) {
    if (/pergunta/i.test(partes[0])) { quantas = partes[0]; relogio = partes[1]; }
    else if (/pergunta/i.test(partes[1])) { quantas = partes[1]; relogio = partes[0]; }
  }

  var selos = '';
  if (relogio) selos += '<span class="selo">' + icone('clock') + esc(relogio) + '</span>';
  selos += '<span class="selo">' + icone('doc') + esc(quantas) + '</span>';
  // Sem nome proprio: quem chega aqui ainda nao conhece ninguem da casa,
  // e o primeiro nome de uma desconhecida nao tranquiliza, estranha.
  selos += '<span class="selo">' + icone('lock') + 'as suas respostas ficam entre nós</span>';

  var rodape = '<p class="dica">A casa conta quantas pessoas abrem este formulário e em que ' +
               'pergunta param, para melhorá-lo. Não guardamos quem é você nessa contagem.</p>';
  // A linha da versao so aparece depois que o servidor respondeu, e so
  // quando quem respondeu foi a copia embutida. Antes disso ela piscaria
  // na tela de todo mundo por um instante, sem ser verdade.
  if (E.reserva && E.resolvida) {
    var quando = dataPorExtenso((E.def.publicado_em || '').replace(' ', 'T'));
    if (quando) rodape += '<p class="dica">Esta é a versão de ' + esc(quando) + ' do formulário.</p>';
  }

  return novaTela('capa',
    '<svg class="marca marca-capa" viewBox="0 0 171 139" aria-hidden="true"><use href="#marca"/></svg>' +
    '<p class="kicker">Aplicação</p>' +
    '<h1 class="pergunta capa-titulo">' + esc(titulo) + '</h1>' +
    (texto ? '<p class="capa-texto">' + esc(texto) + '</p>' : '') +
    '<div class="selos">' + selos + '</div>' +
    '<div class="acoes">' +
      '<button type="button" class="btn btn-o btn-grande comecar js-avancar">' +
        '<span>' + esc(botao) + '</span>' + icone('arrow') +
      '</button>' +
      '<span class="dica dica-teclado">ou aperte <kbd>Enter</kbd></span>' +
    '</div>' +
    '<div class="rodape">' + rodape + '</div>');
}

/* Uma pergunta. */
function telaPergunta(p) {
  var n = E.numero[p.chave];
  var titulo = interpolar(p.titulo);
  var descricao = interpolar(p.descricao);
  // A chave vem da definicao, e a definicao vem do servidor: ela passa
  // por esc() aqui pelo mesmo motivo que passa no resto da funcao, sem
  // abrir excecao por confiar em quem mandou.
  var idDesc = 'desc-' + esc(p.chave);
  var idRec = 'rec-' + esc(p.chave);

  var cabeca = n ? '<p class="ordinal"><span>' + n + '</span>' + icone('arrow') + '</p>' : '';

  var marcaOpcional = p.obrigatoria || p.tipo === 'recado'
    ? '' : '<span class="opcional">opcional</span>';

  var corpo;
  if (p.tipo === 'escolha_unica' || p.tipo === 'escolha_multipla') {
    corpo =
      '<fieldset class="grupo" aria-describedby="' + (descricao ? idDesc : '') + ' ' + idRec + '">' +
        '<legend class="pergunta">' + esc(titulo) + marcaOpcional + '</legend>' +
        (descricao ? '<p class="descricao" id="' + idDesc + '">' + esc(descricao) + '</p>' : '') +
        '<div class="opcoes">' + cartoes(p) + '</div>' +
      '</fieldset>' +
      (p.tipo === 'escolha_multipla' ? '<p class="dica dica-linha">Marque quantas quiser.</p>' : '');
  } else if (p.tipo === 'recado') {
    corpo =
      '<h2 class="pergunta">' + esc(titulo) + '</h2>' +
      (descricao ? '<p class="descricao">' + esc(descricao) + '</p>' : '');
  } else {
    corpo =
      '<h2 class="pergunta" id="rot-' + esc(p.chave) + '">' + esc(titulo) + marcaOpcional + '</h2>' +
      (descricao ? '<p class="descricao" id="' + idDesc + '">' + esc(descricao) + '</p>' : '') +
      '<div class="campo-area">' + campo(p, idDesc, idRec, descricao) + '</div>';
  }

  var consentimento = p.tipo === 'email'
    ? '<p class="dica dica-linha">Guardamos o seu contato assim que você escreve, para ' +
      'conseguir responder mesmo se a conexão cair.</p>' : '';

  var retomada = '';
  if (E.retomada) {
    retomada = '<p class="dica dica-linha">Você começou a responder em ' + esc(E.retomada) +
               ', e continuamos de onde parou. ' +
               '<button type="button" class="btn-texto js-recomecar">começar de novo</button></p>';
  }

  var rotulo = ehUltima(p) ? 'Conferir' : 'Seguir';
  var tela = novaTela('pergunta-tela',
    cabeca + corpo +
    '<p class="recado" id="' + idRec + '" data-recado="1"></p>' +
    consentimento + retomada +
    blocoAcoes(p.tipo === 'recado' ? 'Seguir' : rotulo, p));
  tela.dataset.chave = p.chave;
  return tela;
}

function ehUltima(p) {
  return E.lista.length && E.lista[E.lista.length - 1].chave === p.chave;
}

function cartoes(p) {
  var v = E.respostas[p.chave];
  var multi = p.tipo === 'escolha_multipla';
  var marcadas = multi ? (Array.isArray(v) ? v : []) : [v];
  var html = '';
  (p.opcoes || []).forEach(function (o, i) {
    var letra = i < 26 ? String.fromCharCode(65 + i) : String(i + 1);
    var marcada = marcadas.indexOf(o.chave) >= 0 ? ' checked' : '';
    var sinal = multi
      ? '<span class="caixa" aria-hidden="true">' + icone('check') + '</span>'
      : '<svg class="visto" aria-hidden="true"><use href="#i-check"/></svg>';
    html +=
      '<label class="opcao">' +
        '<input type="' + (multi ? 'checkbox' : 'radio') + '" name="' + esc(p.chave) + '" ' +
               'value="' + esc(o.chave) + '"' + marcada + '>' +
        '<span class="letra" aria-hidden="true">' + esc(letra) + '</span>' +
        '<span class="rotulo">' + esc(o.texto) + '</span>' +
        sinal +
      '</label>';
  });
  return html;
}

function campo(p, idDesc, idRec, temDescricao) {
  var v = E.respostas[p.chave];
  var valor = estaVazio(v) ? '' : String(v);
  var dica = p.dica ? ' placeholder="' + esc(p.dica) + '"' : '';
  var descrito = ' aria-describedby="' + (temDescricao ? idDesc + ' ' : '') + idRec + '"';
  var ultima = ehUltima(p) ? 'done' : 'next';
  var comum = ' id="campo-' + esc(p.chave) + '" enterkeyhint="' + ultima + '"' + descrito + dica;

  if (p.tipo === 'texto_longo') {
    var mas = p.mascara || {};
    var teto = mas.maximo || 2000;
    return '<textarea class="campo-longo"' + comum + ' rows="4" data-teto="' + teto + '">' +
             esc(valor) + '</textarea>' +
           '<p class="contador" id="cont-' + esc(p.chave) + '" aria-hidden="true"></p>';
  }
  if (p.tipo === 'email') {
    return '<input class="campo" type="email"' + comum +
           ' inputmode="email" autocomplete="email" autocapitalize="off" ' +
           'autocorrect="off" spellcheck="false" value="' + esc(valor) + '">' +
           '<div class="sugestao" id="sug-' + esc(p.chave) + '" hidden></div>';
  }
  if (p.tipo === 'telefone') {
    var lido = lerTelefone(valor);
    var visivel = lido.pais.c === '55' ? mascaraBR(lido.digitos) : lido.digitos;
    return '<div class="linha-telefone">' +
             '<button type="button" class="pais-botao js-pais" aria-label="Escolher o país">' +
               '<span class="sigla">' + esc(lido.pais.s) + '</span>' +
               '<span>+' + esc(lido.pais.c) + '</span>' + icone('arrow') +
             '</button>' +
             '<input class="campo" type="tel"' + comum +
             ' inputmode="tel" autocomplete="tel-national" value="' + esc(visivel) + '">' +
           '</div>';
  }
  if (p.tipo === 'numero') {
    return '<input class="campo" type="text"' + comum +
           ' inputmode="decimal" value="' + esc(valor) + '">';
  }
  var maiuscula = p.chave === 'nome' ? 'words' : 'sentences';
  var completa = p.chave === 'nome' ? ' autocomplete="name"' : '';
  return '<input class="campo" type="text"' + comum + completa +
         ' autocapitalize="' + maiuscula + '" value="' + esc(valor) + '">';
}

/* A tela de conferir. O Typeform nao oferece, e e a ultima chance de
   pegar um e-mail errado, que e uma aplicacao que a Carla nunca responde. */
function telaRevisao() {
  var linhas = '';
  E.lista.forEach(function (p) {
    if (p.tipo === 'recado') return;
    var valor = valorLegivel(p);
    var erro = E.errosServidor[p.chave];
    linhas +=
      '<div class="revisao-item"' + (erro ? ' data-erro="sim"' : '') + '>' +
        '<div>' +
          '<p class="revisao-rotulo">' + esc(interpolar(p.titulo)) + '</p>' +
          '<p class="revisao-valor"' + (valor ? '' : ' data-vazio="sim"') + '>' +
            esc(valor || 'não respondeu') + '</p>' +
          (erro ? '<p class="revisao-erro">' + esc(erro) + '</p>' : '') +
        '</div>' +
        '<button type="button" class="btn-texto js-mudar" data-chave="' + esc(p.chave) + '">mudar</button>' +
      '</div>';
  });

  var falha = E.falha ? blocoFalha(E.falha) : '';
  var rotulo = E.falha ? 'Tentar enviar de novo' : 'Enviar a minha aplicação';

  // A cabeca fica no mesmo eixo das perguntas, centrada; a lista embaixo
  // continua alinhada a esquerda, que e por onde se le uma lista.
  return novaTela('revisao-tela',
    '<div class="cabeca-centro">' +
      '<p class="ordinal"><span>Conferir</span>' + icone('arrow') + '</p>' +
      '<h2 class="pergunta">Confira antes de enviar</h2>' +
    '</div>' +
    '<div class="revisao-lista">' + linhas + '</div>' +
    falha +
    '<p class="recado" data-recado="1"></p>' +
    '<div class="acoes">' +
      '<button type="button" class="btn btn-o avancar js-avancar">' +
        '<span>' + esc(rotulo) + '</span>' + icone('arrow') +
      '</button>' +
      '<span class="dica">Depois de enviar, quem lê é a nossa equipe.</span>' +
    '</div>');
}

var FALHAS = {
  rede: {
    t: 'Não consegui enviar agora.',
    p: 'Suas respostas continuam aqui, nada se perdeu. Confira a sua conexão e tente de novo. ' +
       'Se você fechar esta página, ao voltar pelo mesmo navegador você retoma de onde parou.'
  },
  servidor: {
    t: 'Recebi as suas respostas, mas não consegui guardar agora.',
    p: 'É um problema do nosso lado, e não do que você escreveu. Tente de novo em um minuto. ' +
       'Se continuar, volte mais tarde: o que você escreveu fica guardado neste navegador por duas semanas.'
  },
  limite: {
    t: 'Recebi vários envios deste mesmo lugar nos últimos minutos.',
    p: 'Se foi você tentando de novo, espere um pouco e tente mais uma vez. Se você já enviou, ' +
       'a sua ideia chegou e não precisa reenviar.'
  }
};

function blocoFalha(qual) {
  var f = FALHAS[qual] || FALHAS.rede;
  return '<div class="falha" role="group">' +
           '<h3>' + esc(f.t) + '</h3>' +
           '<p>' + esc(f.p) + '</p>' +
           '<p class="dica" style="margin-top:10px">O que você escreveu continua guardado neste navegador.</p>' +
         '</div>';
}

/* A tela de fim: que chegou, quando a Carla responde e por onde, e um
   caminho de volta. O texto vem da definicao, entao ela edita sozinha. */
function telaFim() {
  var ag = (E.def && E.def.agradecimento) || {};
  var titulo = ag.titulo || 'Recebemos a sua ideia';
  var texto = ag.texto || '';
  var link = ag.link || { texto: 'Voltar para o site', url: CONFIG.site };

  var nome = String(E.respostas.nome || '').trim().split(/\s+/)[0];
  var linhaNome = nome ? '<p class="fim-nome">' + esc(nome) + ', chegou.</p>' : '';

  var botoes = '';
  if (CONFIG.whatsapp) {
    botoes += '<a class="btn btn-o" href="https://wa.me/' + esc(CONFIG.whatsapp) + '">' +
              '<span>Falar no WhatsApp</span>' + icone('whatsapp') + '</a>';
  }
  if (link && link.url) {
    botoes += '<a class="btn btn-linha" href="' + esc(link.url) + '">' +
              '<span>' + esc(link.texto || 'Voltar para o site') + '</span>' + icone('arrow') + '</a>';
  }

  return novaTela('fim',
    '<svg class="marca" viewBox="0 0 171 139" aria-hidden="true"><use href="#marca"/></svg>' +
    linhaNome +
    '<h2 class="pergunta fim-titulo">' + esc(interpolar(titulo)) + '</h2>' +
    (texto ? '<p class="fim-texto">' + esc(interpolar(texto)) + '</p>' : '') +
    '<div class="acoes acoes-fim">' + botoes + '</div>');
}

/* ---------------------------------------------------------------------
   13. A troca de tela.
   --------------------------------------------------------------------- */
function construir(pos) {
  if (pos === -1) return telaCapa();
  if (pos === E.lista.length) return telaRevisao();
  if (pos > E.lista.length) return telaFim();
  return telaPergunta(E.lista[pos]);
}

function ir(pos, sentido, semHistorico) {
  if (E.travado) return;
  cancelarAvanco();
  recalcular();
  if (pos > E.lista.length + 1) pos = E.lista.length + 1;
  if (pos < -1) pos = -1;

  var velha = E.telaAtual;
  var nova = construir(pos);
  E.pos = pos;
  E.telaAtual = nova;
  E.telaEm = Date.now();
  palco.appendChild(nova);
  ligarTela(nova);

  // A trava existe para uma coisa so: impedir que um segundo toque troque
  // de tela enquanto duas telas estao no palco ao mesmo tempo. Na primeira
  // pintura nao ha tela saindo, e travar ali fazia a capa engolir o
  // primeiro toque de quem chega e aperta na hora, ate 900 milissegundos.
  // No celular era toque perdido toda vez.
  E.travado = !!velha;
  if (velha) {
    velha.dataset.estado = 'saindo';
    velha.dataset.sentido = sentido || 'frente';
    aoTerminar(velha, function () {
      velha.hidden = true;
      if (velha.parentNode) velha.parentNode.removeChild(velha);
    });
  }
  nova.dataset.estado = 'entrando';
  nova.dataset.sentido = sentido || 'frente';
  aoTerminar(nova, function () {
    delete nova.dataset.estado;
    delete nova.dataset.sentido;
    E.travado = false;
  });

  moldura();
  if (!semHistorico) empilhar(pos);
  focar(nova);
  anunciarTela(pos);
}

// Tira o estado no fim da animacao, nunca em tempo contado a parte. O
// relogio de socorro existe so para a animacao que nao dispara o fim.
function aoTerminar(el, fn) {
  var feito = false;
  function uma() {
    if (feito) return;
    feito = true;
    el.removeEventListener('animationend', uma);
    fn();
  }
  el.addEventListener('animationend', uma);
  setTimeout(uma, 900);
}

function focar(tela) {
  // No celular, focar o campo abre o teclado e come metade da tela antes
  // de a pessoa ler a pergunta. Onde o ponteiro e grosso o foco vai no
  // bloco da pergunta, que le a pergunta e nao abre o teclado.
  if (PONTEIRO_GROSSO) { tenta(function () { tela.focus({ preventScroll: true }); }); return; }
  var campo = tela.querySelector('.campo, .campo-longo');
  if (campo) { tenta(function () { campo.focus({ preventScroll: true }); }); return; }
  var marcado = tela.querySelector('.opcao input:checked') || tela.querySelector('.opcao input');
  if (marcado) { tenta(function () { marcado.focus({ preventScroll: true }); }); return; }
  // Tela sem campo e sem opcao: o foco vai no bloco, que le o texto. No
  // botao ele acenderia o anel de foco sem ninguem ter usado o teclado.
  tenta(function () { tela.focus({ preventScroll: true }); });
}

// Refaz a tela de agora sem animacao. Serve para quando o conteudo mudou
// debaixo dela: a definicao que chegou do servidor, ou a recusa que o
// servidor mandou de volta.
function redesenhar() {
  var velha = E.telaAtual;
  var nova = construir(E.pos);
  E.telaAtual = nova;
  palco.appendChild(nova);
  // A velha sai antes de a nova ser ligada. Ligar com as duas no palco
  // deixa dois elementos com o mesmo id por um instante, e quem procura
  // pelo documento acha o da tela que esta indo embora.
  if (velha && velha.parentNode) velha.parentNode.removeChild(velha);
  ligarTela(nova);
  moldura();
  focar(nova);
}

/* ---------------------------------------------------------------------
   14. A moldura: barra, contagem, setas e titulo da aba.
   --------------------------------------------------------------------- */
function moldura() {
  var naCapa = E.pos === -1;
  var noFim = E.pos > E.lista.length;
  var naRevisao = E.pos === E.lista.length;
  var p = (!naCapa && !noFim && !naRevisao) ? E.lista[E.pos] : null;
  var n = p ? E.numero[p.chave] : null;

  // A conta e posicao sobre total, nao respondidas sobre total: assim a
  // barra so cresce ao avancar e so encolhe ao voltar. Tela de recado nao
  // tem numero, e por isso a barra fica onde estava em vez de zerar.
  var fracao = E.fracao || 0;
  if (naCapa) fracao = 0;
  else if (naRevisao || noFim) fracao = 1;
  else if (n && E.total) fracao = n / E.total;
  E.fracao = fracao;
  porId('progresso').style.setProperty('--p', String(fracao));

  var cont = porId('contagem');
  if (n && E.total) {
    cont.hidden = false;
    porId('contagemNumero').textContent = doisDigitos(n) + ' / ' + doisDigitos(E.total);
    porId('contagemFrase').textContent = 'Pergunta ' + n + ' de ' + E.total;
  } else {
    cont.hidden = true;
  }

  var setas = porId('setas');
  setas.hidden = naCapa || noFim;
  porId('setaVoltar').disabled = naCapa;
  porId('setaAvancar').disabled = noFim;

  var barra = porId('barra');
  barra.hidden = naCapa || noFim;
  porId('barraRotulo').textContent = rotuloDaAcao();

  document.title = tituloDaAba();
}

function doisDigitos(n) { return (n < 10 ? '0' : '') + n; }

function rotuloDaAcao() {
  if (E.pos === -1) {
    var ab = (E.def && E.def.abertura) || {};
    return ab.botao || 'Começar';
  }
  if (E.pos === E.lista.length) return E.falha ? 'Tentar enviar de novo' : 'Enviar';
  var p = E.lista[E.pos];
  if (p && ehUltima(p)) return 'Conferir';
  return 'Seguir';
}

function tituloDaAba() {
  if (E.pos === -1) return 'Aplicação | Ideia Que Vende';
  if (E.pos > E.lista.length) {
    var ag = (E.def && E.def.agradecimento) || {};
    return (ag.titulo || 'Recebemos a sua ideia') + ', Ideia Que Vende';
  }
  if (E.pos === E.lista.length) return 'Conferir antes de enviar, Ideia Que Vende';
  var p = E.lista[E.pos];
  var n = E.numero[p.chave];
  if (!n) return 'Ideia Que Vende';
  return 'Pergunta ' + n + ' de ' + E.total + ', Ideia Que Vende';
}

function anunciarTela(pos) {
  if (pos === -1 || pos > E.lista.length) return;
  if (pos === E.lista.length) { passo('revisou', null, null, 0); return; }
  var p = E.lista[pos];
  passo('viu', p.chave, ordemNaVersao(p.chave), 0);
}

function viva(texto) {
  var el = porId('viva');
  if (el) el.textContent = texto || '';
}

/* ---------------------------------------------------------------------
   15. O botao de voltar do navegador volta uma pergunta.

   Sem isto, no celular, o gesto de voltar joga a pessoa para fora e a
   aplicacao morre ali. E a maior perda silenciosa de formulario de uma
   pergunta por tela.
   --------------------------------------------------------------------- */
function empilhar(pos) {
  var marca = pos === -1 ? '' : (pos >= E.lista.length ? '#fim' : '#p' + (E.numero[E.lista[pos].chave] || (pos + 1)));
  tenta(function () { history.pushState({ pos: pos }, '', marca || location.pathname + location.search); });
}

window.addEventListener('popstate', function (ev) {
  var alvo = ev.state && typeof ev.state.pos === 'number' ? ev.state.pos : -1;
  if (E.concluido) return;
  if (alvo === E.pos) return;
  ir(alvo, alvo < E.pos ? 'tras' : 'frente', true);
});

/* ---------------------------------------------------------------------
   16. Ligar o que a tela recem-desenhada precisa.
   --------------------------------------------------------------------- */
function ligarTela(tela) {
  var p = (E.pos >= 0 && E.pos < E.lista.length) ? E.lista[E.pos] : null;

  tela.querySelectorAll('.js-avancar').forEach(function (b) {
    b.addEventListener('click', acaoPrincipal);
  });
  tela.querySelectorAll('.js-pular').forEach(function (b) {
    b.addEventListener('click', function () { avancarDaqui(true); });
  });
  tela.querySelectorAll('.js-mudar').forEach(function (b) {
    b.addEventListener('click', function () {
      var chave = b.getAttribute('data-chave');
      for (var i = 0; i < E.lista.length; i++) {
        if (E.lista[i].chave === chave) { E.voltarParaRevisao = true; ir(i, 'tras'); return; }
      }
    });
  });
  tela.querySelectorAll('.js-recomecar').forEach(function (b) {
    b.addEventListener('click', recomecar);
  });
  tela.querySelectorAll('.js-pais').forEach(function (b) {
    b.addEventListener('click', function () { abrirPaises(p, b); });
  });

  if (!p) return;

  var campo = tela.querySelector('.campo, .campo-longo');
  if (campo) {
    marcarCheio(campo);
    if (p.tipo === 'telefone') ligarTelefone(p, campo);
    else if (p.tipo === 'texto_longo') ligarTextoLongo(p, campo);
    else ligarTexto(p, campo);
    if (PONTEIRO_GROSSO) {
      campo.addEventListener('focus', function () {
        setTimeout(function () {
          tenta(function () { campo.scrollIntoView({ block: 'center', behavior: 'smooth' }); });
        }, 260);
      });
    }
  }

  var entradas = tela.querySelectorAll('.opcao input');
  if (entradas.length) {
    // Voltando a uma escolha, a opcao anterior aparece marcada e o avanco
    // automatico fica desligado nesta visita, senao a tela volta e salta
    // na hora. Liga de novo assim que a pessoa mudar a escolha.
    var jaTinha = !estaVazio(E.respostas[p.chave]);
    tela.dataset.avanco = jaTinha ? 'desligado' : 'ligado';
    entradas.forEach(function (i) {
      i.addEventListener('change', function () { escolheu(p, tela); });
    });
  }
}

function marcarCheio(campo) {
  campo.dataset.cheio = String(campo.value || '').trim() ? 'sim' : 'nao';
}

function ligarTexto(p, campo) {
  campo.addEventListener('input', function () {
    E.mexeu = true;
    E.respostas[p.chave] = campo.value;
    marcarCheio(campo);
    if (p.tipo === 'email') sugerirDominio(p, campo);
    reconferirSePreciso(p, campo);
    salvarRascunhoDepois();
  });
  if (p.tipo === 'email') {
    campo.addEventListener('blur', function () { sugerirDominio(p, campo); });
  }
}

function ligarTextoLongo(p, campo) {
  var teto = Number(campo.getAttribute('data-teto')) || 2000;
  // O contador se procura ao lado do campo, e nunca pelo documento
  // inteiro: nas trocas de tela existem dois por um instante, e procurar
  // pelo documento achava o da tela que estava saindo.
  var contador = campo.parentNode ? campo.parentNode.querySelector('.contador') : null;
  function pintar() {
    var quantos = contar(campo.value);
    if (contador) {
      contador.textContent = quantos + ' de ' + teto;
      contador.dataset.visivel = quantos >= teto * 0.8 ? 'sim' : 'nao';
      contador.dataset.passou = quantos > teto ? 'sim' : 'nao';
    }
  }
  function crescer() {
    campo.style.height = 'auto';
    var estilo = getComputedStyle(campo);
    var linha = parseFloat(estilo.lineHeight) || 26;
    var folga = parseFloat(estilo.paddingTop) + parseFloat(estilo.paddingBottom) +
                parseFloat(estilo.borderTopWidth) + parseFloat(estilo.borderBottomWidth);
    var teto8 = linha * 8 + folga;
    var alvo = Math.min(campo.scrollHeight, teto8);
    campo.style.height = Math.max(alvo, 132) + 'px';
    campo.style.overflowY = campo.scrollHeight > teto8 + 1 ? 'auto' : 'hidden';
  }
  campo.addEventListener('input', function () {
    // Nada de corte automatico: cortar em silencio no meio de uma frase
    // e pior que deixar passar longo. O limite e conferido no envio.
    E.mexeu = true;
    E.respostas[p.chave] = campo.value;
    marcarCheio(campo);
    pintar();
    crescer();
    reconferirSePreciso(p, campo);
    salvarRascunhoDepois();
  });
  pintar();
  setTimeout(crescer, 0);
}

function ligarTelefone(p, campo) {
  var estado = lerTelefone(E.respostas[p.chave]);
  campo.dataset.pais = estado.pais.s;

  function gravar() {
    var pais = paisPorSigla(campo.dataset.pais || 'BR');
    var d = soDigitos(campo.value).slice(0, pais.c === '55' ? 11 : 15);
    E.respostas[p.chave] = telefoneBonito(pais, d);
    marcarCheio(campo);
  }

  campo.addEventListener('input', function () {
    E.mexeu = true;
    var pais = paisPorSigla(campo.dataset.pais || 'BR');
    var cru = campo.value;

    // Colagem com o codigo do pais na frente troca o pais sozinho.
    if (cru.indexOf('+') === 0) {
      var junto = soDigitos(cru);
      for (var i = 0; i < CODIGOS.length; i++) {
        if (junto.indexOf(CODIGOS[i].c) === 0) {
          pais = CODIGOS[i];
          campo.dataset.pais = pais.s;
          cru = junto.slice(pais.c.length);
          trocarBotaoPais(campo, pais);
          break;
        }
      }
    }

    if (pais.c === '55') {
      // A mascara preserva o cursor: conta os digitos antes dele,
      // reformata, e devolve o cursor depois do mesmo digito. Sem isso,
      // editar o meio do numero joga o cursor para o fim.
      var antes = campo.selectionStart === null ? cru.length : campo.selectionStart;
      var quantosAntes = (String(cru).slice(0, antes).match(/\d/g) || []).length;
      var d = soDigitos(cru).slice(0, 11);
      var novo = mascaraBR(d);
      campo.value = novo;
      var pos = 0, vistos = 0;
      if (quantosAntes > 0) {
        pos = novo.length;
        for (var k = 0; k < novo.length; k++) {
          if (/\d/.test(novo[k])) {
            vistos += 1;
            if (vistos === quantosAntes) { pos = k + 1; break; }
          }
        }
      }
      tenta(function () { campo.setSelectionRange(pos, pos); });
    } else {
      campo.value = soDigitos(cru).slice(0, 15);
    }
    gravar();
    reconferirSePreciso(p, campo);
    salvarRascunhoDepois();
  });
}

function trocarBotaoPais(campo, pais) {
  var linha = campo.closest('.linha-telefone');
  if (!linha) return;
  var bt = linha.querySelector('.js-pais');
  if (!bt) return;
  bt.querySelector('.sigla').textContent = pais.s;
  bt.querySelectorAll('span')[1].textContent = '+' + pais.c;
}

function sugerirDominio(p, campo) {
  // Ao lado do campo, pelo mesmo motivo do contador do texto longo.
  var caixa = campo.parentNode ? campo.parentNode.querySelector('.sugestao') : null;
  if (!caixa) return;
  var sugestao = dominioParecido(campo.value);
  if (!sugestao) {
    caixa.hidden = true;
    caixa.innerHTML = '';
    caixa.dataset.sugestao = '';
    return;
  }
  // Redesenhar a mesma sugestao trocaria o botao no instante entre o
  // apertar e o soltar do clique, e o clique cairia no vazio.
  if (caixa.dataset.sugestao === sugestao) return;
  caixa.dataset.sugestao = sugestao;
  caixa.hidden = false;
  caixa.innerHTML = '<span>Você quis dizer <strong>' + esc(sugestao) + '</strong>?</span>' +
                    '<button type="button" class="btn-texto js-corrigir">sim, corrigir</button>';
  caixa.querySelector('.js-corrigir').addEventListener('click', function () {
    campo.value = sugestao;
    E.respostas[p.chave] = sugestao;
    marcarCheio(campo);
    caixa.hidden = true;
    caixa.innerHTML = '';
    reconferirSePreciso(p, campo);
    salvarRascunho();
    tenta(function () { campo.focus(); });
  });
}

function escolheu(p, tela) {
  var marcadas = [];
  tela.querySelectorAll('.opcao input').forEach(function (i) {
    if (i.checked) marcadas.push(i.value);
  });
  E.mexeu = true;
  if (p.tipo === 'escolha_multipla') E.respostas[p.chave] = marcadas;
  else E.respostas[p.chave] = marcadas[0] || '';
  limparRecado(tela);
  salvarRascunho();

  // Escolha multipla nao avanca sozinha: a pessoa ainda pode marcar
  // outra.
  if (p.tipo !== 'escolha_unica') return;
  if (tela.dataset.avanco === 'desligado') tela.dataset.avanco = 'ligado';
  agendarAvanco();
}

/* Clicou, a opcao acende, e uma batida depois a tela passa. A pausa
   existe para a pessoa ver que a escolha registrou. */
function agendarAvanco() {
  cancelarAvanco();
  var espera = MOVIMENTO_REDUZIDO ? 160 : 320;
  E.avancoAgendado = setTimeout(function () {
    E.avancoAgendado = null;
    avancarDaqui(false);
  }, espera);
}

function cancelarAvanco() {
  if (E.avancoAgendado) { clearTimeout(E.avancoAgendado); E.avancoAgendado = null; }
}

/* ---------------------------------------------------------------------
   17. O recado embaixo do campo.
   --------------------------------------------------------------------- */
function mostrarRecado(tela, texto) {
  var rec = tela.querySelector('[data-recado]');
  if (!rec) return;
  rec.innerHTML = '';
  var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  var uso = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  uso.setAttribute('href', '#i-info');
  svg.setAttribute('aria-hidden', 'true');
  svg.appendChild(uso);
  var span = document.createElement('span');
  // A mensagem entra por texto, nunca por marcacao.
  span.textContent = texto;
  rec.appendChild(svg);
  rec.appendChild(span);
  viva(texto);
  var campo = tela.querySelector('.campo, .campo-longo');
  if (campo) {
    campo.setAttribute('aria-invalid', 'true');
    campo.dataset.erro = 'sim';
  }
  tela.dataset.conferido = 'sim';
  if (!MOVIMENTO_REDUZIDO) {
    var alvo = tela.querySelector('.campo-area, .opcoes, .revisao-lista') || tela;
    alvo.classList.remove('tremeu');
    void alvo.offsetWidth;
    alvo.classList.add('tremeu');
    setTimeout(function () { alvo.classList.remove('tremeu'); }, 400);
  }
}

function limparRecado(tela) {
  var rec = tela.querySelector('[data-recado]');
  if (rec) rec.textContent = '';
  var campo = tela.querySelector('.campo, .campo-longo');
  if (campo) {
    campo.removeAttribute('aria-invalid');
    campo.dataset.erro = 'nao';
  }
  viva('');
}

// Depois que a mensagem apareceu uma vez naquele campo, ai sim confere a
// cada tecla, para ela sumir no instante em que a resposta ficar boa.
function reconferirSePreciso(p, campo) {
  var tela = E.telaAtual;
  if (!tela || tela.dataset.conferido !== 'sim') return;
  var erro = conferir(p);
  if (!erro) limparRecado(tela);
}

/* ---------------------------------------------------------------------
   18. Andar para a frente e para tras.
   --------------------------------------------------------------------- */
function acaoPrincipal() {
  if (E.travado) return;
  if (E.pos === -1) { comecar(); return; }
  if (E.pos === E.lista.length) { enviar(); return; }
  if (E.pos > E.lista.length) return;
  avancarDaqui(false);
}

function comecar() {
  passo('comecou', null, null, 0);
  ir(0, 'frente');
}

function avancarDaqui(pulando) {
  var p = E.lista[E.pos];
  if (!p) return;
  cancelarAvanco();

  if (p.tipo !== 'recado' && !pulando) {
    var erro = conferir(p);
    if (erro) {
      mostrarRecado(E.telaAtual, erro.texto);
      passo('erro_campo', p.chave, ordemNaVersao(p.chave), 0, erro.detalhe);
      // O foco volta para onde se conserta, nao para a mensagem.
      var campo = E.telaAtual.querySelector('.campo, .campo-longo');
      var opcao = E.telaAtual.querySelector('.opcao input:checked') || E.telaAtual.querySelector('.opcao input');
      tenta(function () { (campo || opcao || E.telaAtual).focus({ preventScroll: true }); });
      return;
    }
  }

  E.mexeu = true;
  delete E.errosServidor[p.chave];
  passo('respondeu', p.chave, ordemNaVersao(p.chave), Date.now() - E.telaEm);
  salvarRascunho();
  talvezParcial(p.chave);

  // A linha da retomada vale para a tela em que a pessoa voltou, e so
  // para ela. Deixada de pe, ela repetia "continuamos de onde parou" em
  // toda pergunta seguinte, onde ja nao era verdade, e levava junto o
  // botao que apaga tudo.
  E.retomada = null;

  if (E.voltarParaRevisao) {
    E.voltarParaRevisao = false;
    recalcular();
    ir(E.lista.length, 'frente');
    return;
  }
  ir(E.pos + 1, 'frente');
}

function voltar() {
  // A mesma trava do avancar: dois cliques dentro da troca andavam duas
  // vezes no historico do navegador e uma so na tela, e as duas pilhas
  // ficavam desencontradas dali para a frente.
  if (E.travado) return;
  if (E.pos <= -1 || E.concluido) return;
  // A linha da retomada vale para a tela onde a pessoa parou. Saindo dela
  // para tras, ela deixa de valer. Fica depois das travas: clique recusado
  // nao mexe em estado nenhum.
  E.retomada = null;
  cancelarAvanco();
  if (E.pos < E.lista.length) {
    var p = E.lista[E.pos];
    passo('voltou', p.chave, ordemNaVersao(p.chave), Date.now() - E.telaEm);
  }
  // O historico e a fonte: voltar aqui e voltar no navegador tem que dar
  // no mesmo, senao as duas pilhas se desencontram.
  tenta(function () { history.back(); });
}

function recomecar() {
  E.respostas = {};
  E.retomada = null;
  // Sem isto, quem chegou aqui vindo do "mudar" da tela de conferir
  // recomecava do zero e o primeiro Seguir pulava direto para a
  // conferencia, com oito perguntas dizendo que nao foram respondidas.
  E.voltarParaRevisao = false;
  E.errosServidor = {};
  apagar(CHAVE_RASCUNHO);
  salvarRascunho();
  recalcular();
  ir(0, 'tras');
}

/* ---------------------------------------------------------------------
   19. O envio.
   --------------------------------------------------------------------- */
function respostasParaEnvio() {
  var fora = {};
  E.lista.forEach(function (p) {
    if (p.tipo === 'recado') return;
    var v = E.respostas[p.chave];
    if (v === undefined || v === null) return;
    fora[p.chave] = v;
  });
  return fora;
}

function corpoDoEnvio(parcial, parouEm) {
  var isca = porId('sobre_voce_extra');
  return {
    envio: E.envio,
    versao: versaoEmUso(),
    plano: E.plano,
    origem: E.origem,
    parcial: !!parcial,
    parou_em: parcial ? (parouEm || null) : null,
    respostas: respostasParaEnvio(),
    sobre_voce_extra: isca ? isca.value : ''
  };
}

function chamar(caminho, corpo, limite) {
  return new Promise(function (resolve) {
    var abortou = false;
    var ctrl = tenta(function () { return new AbortController(); });
    var relogio = setTimeout(function () {
      abortou = true;
      if (ctrl) tenta(function () { ctrl.abort(); });
      resolve({ rede: true });
    }, limite || 15000);

    fetch(caminho, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(corpo),
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (r) {
      clearTimeout(relogio);
      if (abortou) return;
      r.json().then(function (j) {
        resolve({ status: r.status, corpo: j });
      }).catch(function () {
        resolve({ status: r.status, corpo: null });
      });
    }).catch(function () {
      clearTimeout(relogio);
      if (!abortou) resolve({ rede: true });
    });
  });
}

/* A captura parcial: quem preencheu contato e sumiu no meio hoje se
   perde inteiro, e e por isso que se paga o plano do outro.

   Uma parcial vale por vinte segundos: mais que isso e a mesma resposta
   gravada muitas vezes seguidas, sem nada de novo dentro. A espera vale
   para os dois caminhos, o de responder uma pergunta e o de a aba sumir,
   senao quem troca de aba trinta vezes grava trinta. */
var ESPERA_PARCIAL = 20000;

function quantasRespondidas() {
  var quantas = 0;
  Object.keys(E.respostas).forEach(function (k) { if (!estaVazio(E.respostas[k])) quantas += 1; });
  return quantas;
}

// Quanto falta para a proxima parcial poder sair. Zero quer dizer agora.
function faltaParaParcial() {
  if (!E.ultimaParcial) return 0;
  var falta = ESPERA_PARCIAL - (Date.now() - E.ultimaParcial);
  return falta > 0 ? falta : 0;
}

function talvezParcial(parouEm) {
  if (quantasRespondidas() < 3 || E.concluido || E.enviando) return;
  var falta = faltaParaParcial();
  if (falta > 0) {
    // A parcial engolida pela espera nao se perde: ela volta sozinha
    // quando os vinte segundos fecham, com o que estiver respondido ali.
    E.parcialPendente = true;
    E.parcialParouEm = parouEm || null;
    if (!E.relogioParcial) {
      E.relogioParcial = setTimeout(function () {
        E.relogioParcial = null;
        var onde = E.parcialParouEm;
        E.parcialPendente = false;
        E.parcialParouEm = null;
        talvezParcial(onde);
      }, falta);
    }
    return;
  }
  E.ultimaParcial = Date.now();
  E.parcialPendente = false;
  E.parcialParouEm = null;
  chamar('/api/resposta', corpoDoEnvio(true, parouEm), 12000);
}

function enviarParcialAgora() {
  if (E.concluido || E.enviando) return;
  if (quantasRespondidas() < 3) return;
  // A aba sumindo e a ultima chance de gravar. A espera vale aqui
  // tambem, senao quem troca de aba trinta vezes grava trinta a mesma
  // coisa; mas ela nao vale quando ha resposta nova esperando a vez,
  // porque ai o que a espera economiza e justamente o que importa.
  if (faltaParaParcial() > 0 && !E.parcialPendente) return;
  E.ultimaParcial = Date.now();
  E.parcialPendente = false;
  E.parcialParouEm = null;
  // O relogio que guardava essa mesma parcial vai junto. Sem isto ele
  // ainda dispara depois e manda a mesma coisa uma segunda vez, que e
  // exatamente o que a espera de vinte segundos existe para evitar.
  if (E.relogioParcial) { clearTimeout(E.relogioParcial); E.relogioParcial = null; }
  var p = (E.pos >= 0 && E.pos < E.lista.length) ? E.lista[E.pos] : null;
  var corpo = corpoDoEnvio(true, p ? p.chave : null);
  var texto = JSON.stringify(corpo);
  if (navigator.sendBeacon) {
    var foi = tenta(function () {
      return navigator.sendBeacon('/api/resposta', new Blob([texto], { type: 'application/json' }));
    });
    if (foi) return;
  }
  tenta(function () {
    fetch('/api/resposta', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: texto,
      keepalive: true
    }).catch(function () {});
  });
}

var ESPERAS = [0, 3000, 9000];

// A primeira tentativa espera os quinze segundos inteiros. As de repique
// esperam menos: a rede que nao respondeu na primeira raramente responde
// na terceira, e quem esta olhando o botao nao pode ficar um minuto sem
// nada mudar na tela. Junto com isso, o rotulo troca a cada tentativa,
// para a espera ter um sinal alem do anel girando.
var LIMITES = [15000, 8000, 8000];

function enviar() {
  if (E.enviando || E.concluido) return;
  E.enviando = true;
  E.falha = null;
  pintarEnviando(true);
  viva('Enviando a sua aplicação.');
  tentarEnvio(0);
}

function tentarEnvio(vez) {
  if (vez > 0) {
    pintarEnviando(true, 'Tentando de novo');
    viva('A conexão está lenta. Tentando enviar de novo.');
  }
  chamar('/api/resposta', corpoDoEnvio(false, null), LIMITES[vez] || 8000).then(function (r) {
    // So repica em falha de rede e quando o servidor diz que nao
    // conseguiu gravar. Recusa de resposta, limite estourado e corpo
    // ilegivel nao repicam: repetir o que foi recusado e insistir no erro.
    var podeRepicar = r.rede || r.status === 503;
    if (podeRepicar && vez + 1 < ESPERAS.length) {
      setTimeout(function () { tentarEnvio(vez + 1); }, ESPERAS[vez + 1]);
      return;
    }
    concluirEnvio(r);
  });
}

function concluirEnvio(r) {
  E.enviando = false;
  pintarEnviando(false);

  if (r.rede) { falharEnvio('rede'); return; }

  if (r.status === 200 && r.corpo && r.corpo.ok) {
    E.concluido = true;
    E.errosServidor = {};
    passo('enviou', null, null, Date.now() - E.abertoEm);
    despachar(false);
    // So agora, e so depois de o servidor confirmar.
    apagar(CHAVE_RASCUNHO);
    guardar(CHAVE_ENVIADO, { envio: E.envio, em: new Date().toISOString() });
    viva('');
    ir(E.lista.length + 1, 'frente');
    return;
  }

  if (r.status === 422 && r.corpo && r.corpo.campos) {
    E.errosServidor = {};
    (r.corpo.campos || []).forEach(function (c) {
      if (c && c.chave) E.errosServidor[c.chave] = c.erro || VAZIO_TEXTO;
    });
    passo('falhou', null, null, 0, 'recusado');
    var quantas = Object.keys(E.errosServidor).length;
    viva('Faltou ajustar ' + quantas + (quantas === 1 ? ' resposta.' : ' respostas.'));
    // Volta para a primeira pergunta com erro, com o texto do campo
    // vindo da resposta do servidor.
    for (var i = 0; i < E.lista.length; i++) {
      if (E.errosServidor[E.lista[i].chave]) {
        E.voltarParaRevisao = true;
        var chave = E.lista[i].chave;
        ir(i, 'tras');
        setTimeout(function () {
          if (E.telaAtual) mostrarRecado(E.telaAtual, E.errosServidor[chave]);
        }, 60);
        return;
      }
    }
    redesenharRevisao();
    return;
  }

  if (r.status === 429) { falharEnvio('limite'); return; }
  falharEnvio('servidor');
}

function falharEnvio(qual) {
  E.falha = qual;
  passo('falhou', null, null, 0, qual === 'limite' ? 'limite' : (qual === 'rede' ? 'rede' : 'servidor'));
  despachar(false);
  var f = FALHAS[qual] || FALHAS.rede;
  viva(f.t);
  redesenharRevisao();
}

function redesenharRevisao() {
  if (E.pos !== E.lista.length) { ir(E.lista.length, 'frente'); return; }
  redesenhar();
}

function pintarEnviando(ligado, rotulo) {
  var alvos = [];
  if (E.telaAtual) E.telaAtual.querySelectorAll('.js-avancar').forEach(function (b) { alvos.push(b); });
  var barra = porId('barraAcao');
  if (barra) alvos.push(barra);
  alvos.forEach(function (b) {
    b.disabled = !!ligado;
    var rot = b.querySelector('span');
    var seta = b.querySelector('svg');
    var anel = b.querySelector('.anel');
    if (ligado) {
      if (rot) rot.textContent = rotulo || 'Enviando';
      if (seta) seta.style.display = 'none';
      if (!anel) {
        var d = document.createElement('span');
        d.className = 'anel';
        b.appendChild(d);
      }
    } else {
      if (rot) rot.textContent = b.id === 'barraAcao' ? rotuloDaAcao() : (E.falha ? 'Tentar enviar de novo' : 'Enviar a minha aplicação');
      if (seta) seta.style.display = '';
      if (anel && anel.parentNode) anel.parentNode.removeChild(anel);
    }
  });
  if (E.telaAtual) {
    E.telaAtual.querySelectorAll('input, textarea, button').forEach(function (c) {
      if (c.classList.contains('js-avancar')) return;
      c.disabled = !!ligado;
    });
  }
}

/* ---------------------------------------------------------------------
   20. O teclado.
   --------------------------------------------------------------------- */
// Onde digitar escreve. O radio e a caixa de marcar sao entrada tambem,
// mas digitar dentro deles nao escreve nada, e e neles que a letra
// precisa continuar escolhendo.
var ESCREVEM = ['text', 'email', 'tel', 'number', 'search', 'url', 'password'];

function ehCampoDeTexto(el) {
  if (!el) return false;
  if (el.isContentEditable) return true;
  if (el.tagName === 'TEXTAREA') return true;
  if (el.tagName !== 'INPUT') return false;
  return ESCREVEM.indexOf((el.type || 'text').toLowerCase()) >= 0;
}

document.addEventListener('keydown', function (ev) {
  if (paisesAbertos()) return;   // o painel trata as proprias teclas

  // Ignora enquanto a tecla esta compondo caractere, senao quem digita
  // com teclado de composicao avanca tela no meio da palavra.
  if (ev.isComposing || ev.keyCode === 229) return;

  if (ev.key === 'Escape') {
    cancelarAvanco();
    if (document.activeElement && document.activeElement.blur) {
      tenta(function () { document.activeElement.blur(); });
    }
    return;
  }

  if (ev.key === 'Tab' && ev.shiftKey) { cancelarAvanco(); return; }

  if (ev.key === 'Enter') {
    var alvo = ev.target;
    if (alvo && alvo.tagName === 'TEXTAREA') {
      // Enter quebra a linha, Ctrl com Enter avanca: perder um paragrafo
      // custa mais que perder um atalho.
      if (ev.ctrlKey || ev.metaKey) { ev.preventDefault(); acaoPrincipal(); }
      return;
    }
    if (ev.altKey || ev.shiftKey || ev.ctrlKey || ev.metaKey) return;
    if (alvo && (alvo.tagName === 'BUTTON' || alvo.tagName === 'A')) return;
    ev.preventDefault();
    acaoPrincipal();
    return;
  }

  if (E.pos < 0 || E.pos >= E.lista.length) return;
  var p = E.lista[E.pos];
  if (!p) return;

  // Em tela sem opcoes, as setas fazem o que as setas do canto fazem com
  // o mouse.
  if (!p.opcoes || !p.opcoes.length) {
    if (ev.key === 'ArrowUp' && !ehCampoDeTexto(ev.target)) { ev.preventDefault(); voltar(); }
    if (ev.key === 'ArrowDown' && !ehCampoDeTexto(ev.target)) { ev.preventDefault(); acaoPrincipal(); }
    return;
  }

  // A letra escolhe. Digitar dentro de um campo de texto nao escolhe, e
  // tecla com Ctrl, Alt ou Meta passa direto.
  if (ev.ctrlKey || ev.altKey || ev.metaKey) return;
  if (ehCampoDeTexto(ev.target)) return;
  if (!/^[a-zA-Z]$/.test(ev.key)) return;
  var i = ev.key.toUpperCase().charCodeAt(0) - 65;
  var entradas = E.telaAtual ? E.telaAtual.querySelectorAll('.opcao input') : [];
  if (i < 0 || i >= entradas.length) return;
  ev.preventDefault();
  var alvo2 = entradas[i];
  if (p.tipo === 'escolha_multipla') alvo2.checked = !alvo2.checked;
  else alvo2.checked = true;
  tenta(function () { alvo2.focus({ preventScroll: true }); });
  escolheu(p, E.telaAtual);
});

/* ---------------------------------------------------------------------
   21. A lista de paises.
   --------------------------------------------------------------------- */
var paisAlvo = null;
var paisPergunta = null;

function paisesAbertos() { return !porId('paises').hidden; }

function abrirPaises(p, botao) {
  paisAlvo = botao;
  paisPergunta = p;
  var caixa = porId('paises');
  caixa.hidden = false;
  porId('paisesBusca').value = '';
  desenharPaises('');
  setTimeout(function () { tenta(function () { porId('paisesBusca').focus(); }); }, 30);
}

function fecharPaises() {
  porId('paises').hidden = true;
  if (paisAlvo) tenta(function () { paisAlvo.focus(); });
  paisAlvo = null;
  paisPergunta = null;
}

function desenharPaises(busca) {
  var t = String(busca || '').trim().toLowerCase();
  var lista = PAISES.filter(function (c) {
    if (!t) return true;
    return c.n.toLowerCase().indexOf(t) >= 0 || c.s.toLowerCase().indexOf(t) >= 0 || c.c.indexOf(t) >= 0;
  });
  var alvo = porId('paisesLista');
  if (!lista.length) {
    alvo.innerHTML = '<p class="paises-vazio">Nenhum país com esse nome. Apague uma letra e procure de novo.</p>';
    return;
  }
  alvo.innerHTML = lista.map(function (c) {
    return '<button type="button" class="pais-item" data-sigla="' + esc(c.s) + '">' +
             '<span class="sigla">' + esc(c.s) + '</span>' +
             '<span>' + esc(c.n) + '</span>' +
             '<span class="cod">+' + esc(c.c) + '</span>' +
           '</button>';
  }).join('');
  alvo.querySelectorAll('.pais-item').forEach(function (b) {
    b.addEventListener('click', function () { escolherPais(b.getAttribute('data-sigla')); });
  });
}

function escolherPais(sigla) {
  var pais = paisPorSigla(sigla);
  var p = paisPergunta;
  fecharPaises();
  if (!p || !E.telaAtual) return;
  var campo = E.telaAtual.querySelector('.campo');
  if (!campo) return;
  var d = soDigitos(campo.value);
  campo.dataset.pais = pais.s;
  trocarBotaoPais(campo, pais);
  campo.value = pais.c === '55' ? mascaraBR(d.slice(0, 11)) : d.slice(0, 15);
  E.respostas[p.chave] = telefoneBonito(pais, soDigitos(campo.value));
  marcarCheio(campo);
  reconferirSePreciso(p, campo);
  salvarRascunho();
  tenta(function () { campo.focus(); });
}

porId('paisesBusca').addEventListener('input', function (ev) { desenharPaises(ev.target.value); });
porId('paises').addEventListener('click', function (ev) {
  if (ev.target === porId('paises')) fecharPaises();
});
porId('paises').addEventListener('keydown', function (ev) {
  if (ev.key === 'Escape') { ev.stopPropagation(); fecharPaises(); return; }
  if (ev.key === 'Enter') {
    ev.preventDefault();
    ev.stopPropagation();
    var primeiro = porId('paisesLista').querySelector('.pais-item');
    if (primeiro) primeiro.click();
  }
});

/* ---------------------------------------------------------------------
   22. O teclado virtual do celular.

   A unidade de altura dinamica sozinha nao resolve: o Safari do iPhone
   nao encolhe a altura quando o teclado sobe. A altura e medida e vira
   folga de baixo, e e ela que impede a barra de cobrir o campo.
   --------------------------------------------------------------------- */
if (window.visualViewport) {
  var medir = function () {
    var vv = window.visualViewport;
    var altura = Math.round(window.innerHeight - vv.height - vv.offsetTop);
    document.documentElement.style.setProperty('--teclado', (altura > 90 ? altura : 0) + 'px');
  };
  window.visualViewport.addEventListener('resize', medir);
  window.visualViewport.addEventListener('scroll', medir);
}

/* ---------------------------------------------------------------------
   23. Os botoes que moram na moldura.
   --------------------------------------------------------------------- */
document.querySelectorAll('.js-voltar').forEach(function (b) {
  b.addEventListener('click', voltar);
});
document.querySelectorAll('#setas .js-avancar, #barra .js-avancar').forEach(function (b) {
  b.addEventListener('click', acaoPrincipal);
});

/* ---------------------------------------------------------------------
   24. Sair da pagina.
   --------------------------------------------------------------------- */
document.addEventListener('visibilitychange', function () {
  if (document.visibilityState !== 'hidden') return;
  if (!E.concluido) {
    if (!E.desistiuMandado && E.pos >= 0 && E.pos < E.lista.length) {
      E.desistiuMandado = true;
      var p = E.lista[E.pos];
      passo('desistiu', p.chave, ordemNaVersao(p.chave), Date.now() - E.telaEm);
    }
    salvarRascunho();
    enviarParcialAgora();
  }
  // Beacon na mudanca de visibilidade, nunca no evento de descarregar: o
  // Safari do iPhone nao dispara aquele ao trocar de aba.
  despachar(true);
});

/* ---------------------------------------------------------------------
   25. A abertura.
   --------------------------------------------------------------------- */
function aplicarRascunho() {
  var r = recuperar(CHAVE_RASCUNHO);
  if (!r || r.v !== 1 || !r.respostas) return -1;
  var idade = Date.now() - new Date(r.salvo_em || 0).getTime();
  if (!isFinite(idade) || idade > DIAS_RASCUNHO * 86400000) { apagar(CHAVE_RASCUNHO); return -1; }

  if (r.envio) E.envio = r.envio;
  if (r.plano && !E.plano) E.plano = r.plano;
  if (r.origem && E.origem === 'landing') E.origem = r.origem;

  // Se a versao mudou, aproveita so as respostas cujas chaves ainda
  // existem. Chave estavel e o que torna isso possivel.
  var trocouVersao = r.versao !== versaoEmUso();
  Object.keys(r.respostas).forEach(function (chave) {
    if (acharPergunta(chave)) E.respostas[chave] = r.respostas[chave];
  });
  recalcular();

  var quantas = 0;
  Object.keys(E.respostas).forEach(function (k) { if (!estaVazio(E.respostas[k])) quantas += 1; });
  if (!quantas) return -1;

  E.retomada = dataPorExtenso(r.salvo_em);
  if (trocouVersao) E.retomada = E.retomada + ' (o formulário mudou desde então)';

  // Recomeca na primeira pergunta sem resposta.
  for (var i = 0; i < E.lista.length; i++) {
    var p = E.lista[i];
    if (p.tipo === 'recado') continue;
    if (estaVazio(E.respostas[p.chave])) return i;
  }
  return E.lista.length;
}

function jaEnviou() {
  var r = recuperar(CHAVE_ENVIADO);
  if (!r || !r.em) return false;
  var idade = Date.now() - new Date(r.em).getTime();
  if (!isFinite(idade) || idade > DIAS_ENVIADO * 86400000) { apagar(CHAVE_ENVIADO); return false; }
  return true;
}

function buscarDefinicao() {
  return new Promise(function (resolve) {
    var pronto = false;
    var relogio = setTimeout(function () {
      if (!pronto) { pronto = true; resolve(null); }
    }, 6000);
    fetch('/api/formulario', { headers: { accept: 'application/json' }, cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        clearTimeout(relogio);
        if (pronto) return;
        pronto = true;
        resolve(j && j.ok && j.formulario ? j.formulario : null);
      })
      .catch(function () {
        clearTimeout(relogio);
        if (!pronto) { pronto = true; resolve(null); }
      });
  });
}

function abrir() {
  lerEndereco();
  E.referencia = dominioDeOrigem();
  E.envio = sorteio();
  E.visita = sorteio();

  // A pagina desenha na hora, com a copia embutida, e so depois pergunta
  // ao servidor. Esperar a resposta para desenhar seria deixar a pessoa
  // olhando para uma tela preta em rede ruim, e formulario no ar nao
  // depende de uma consulta ao banco ter dado certo.
  E.def = RESERVA;
  E.reserva = true;
  recalcular();
  passo('abriu', null, null, 0);

  if (jaEnviou()) {
    // Reabrir depois de enviar mostra o agradecimento, nao um formulario
    // em branco.
    E.concluido = true;
    ir(E.lista.length + 1, 'frente', true);
  } else {
    var onde = aplicarRascunho();
    tenta(function () { history.replaceState({ pos: -1 }, '', location.pathname + location.search); });
    if (onde >= 0) {
      // Retoma sozinha e diz o que fez, com um caminho de volta ao lado.
      // Perguntar custa uma tela a todo mundo para resolver um caso raro.
      passo('comecou', null, null, 0);
      ir(onde, 'frente');
    } else {
      ir(-1, 'frente', true);
    }
  }

  buscarDefinicao().then(function (doServidor) {
    E.resolvida = true;
    if (doServidor && doServidor.perguntas && doServidor.perguntas.length) {
      E.def = doServidor;
      E.reserva = false;
      recalcular();
    } else {
      passo('falhou', null, null, 0, 'definicao');
    }
    // Trocar a definicao com a pessoa no meio do caminho mudaria a
    // pergunta debaixo da mao dela. Enquanto ela nao mexeu, refaz a tela;
    // depois disso, a versao que ela comecou a ler e a que vale, e o
    // servidor aceita versao antiga de proposito.
    if (!E.mexeu && !E.enviando) redesenhar();
    else moldura();
  });
}

abrir();

})();
