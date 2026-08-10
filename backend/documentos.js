/**
 * DOCUMENTOS QUE NÃO VIRAM ARQUIVO
 * ─────────────────────────────────────────────────────────────────────
 * Pedido dela: "quero uma estrutura que não seja necessário o funcionário
 * baixar nada, quero amenizar o risco de uso indevido de material e de se
 * perder o processo".
 *
 * A ideia é uma inversão simples e ela muda tudo:
 *
 *   HOJE   o documento é um arquivo. Alguém gera, baixa, guarda numa
 *          pasta, anexa num e-mail e manda. A partir do "baixa", a
 *          empresa perdeu o controle e nem sabe.
 *
 *   AQUI   o documento é um ENDEREÇO. Ele é montado no servidor toda vez
 *          que alguém olha, e some da tela quando a aba fecha. Não existe
 *          cópia para se perder porque nunca houve cópia.
 *
 * Quem pode o quê, e por quê:
 *
 *   EQUIPE     vê, com o próprio nome carimbado por cima. Não baixa.
 *              Não é desconfiança: é que material baixado vira material
 *              esquecido, e material esquecido vira vazamento sem
 *              culpado.
 *   CLIENTE    recebe um endereço com prazo, abre, aprova e BAIXA se
 *              quiser, com o nome dele no carimbo. O documento é dele.
 *   NINGUÉM    manda para um número que não seja o do cliente. O servidor
 *              compara antes de enviar e recusa, mesmo que a pessoa
 *              digite outro. É a única forma de a regra valer.
 *
 * E o abrir vale como prova: fecha sozinha a obrigação "cliente abrir o
 * documento", então ninguém precisa perguntar se chegou.
 *
 * O CONTRATO continua no D4Sign, que já está integrado. O que muda é que
 * ninguém baixa PDF para mandar: o servidor conversa direto.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/* O cliente aprova por formulário, não por JSON: a página dele é HTML
   puro, sem JavaScript, para funcionar em qualquer celular e em qualquer
   navegador antigo. Documento de cliente não é lugar de exigir script. */
const comoFormulario = require('express').urlencoded({ extended: false });

const DIR = process.env.DADOS_DIR || path.join(__dirname, 'dados');
const ARQ = path.join(DIR, 'documentos.json');

let D = { docs: {}, links: {}, portais: {}, seq: 1 };
try {
  fs.mkdirSync(DIR, { recursive: true });
  if (fs.existsSync(ARQ)) D = Object.assign(D, JSON.parse(fs.readFileSync(ARQ, 'utf8')));
} catch (e) {}

let adiado = null;
function agora() { if (adiado) { clearTimeout(adiado); adiado = null; }
  try { fs.writeFileSync(ARQ, JSON.stringify(D)); } catch (e) {} }
function salvar() { if (adiado) return; adiado = setTimeout(() => { adiado = null; agora(); }, 300); }
['SIGINT', 'SIGTERM', 'beforeExit'].forEach(ev => process.on(ev, () => {
  agora(); if (ev !== 'beforeExit') process.exit(0);
}));

const DIA = 24 * 3600e3;
const VALIDADE = 14 * DIA;          // prazo do endereço do cliente

function so(n) { return String(n || '').replace(/\D/g, ''); }
function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* ══════════════════════════════════════════════════════ o documento */

/**
 * O documento guarda CONTEÚDO, não arquivo. Corpo em HTML simples,
 * montado pelo sistema a partir dos dados que já existem.
 */
function criar(dados, eu) {
  const id = 'DOC-' + (D.seq++).toString(36) + crypto.randomBytes(3).toString('hex');
  D.docs[id] = {
    id, em: new Date().toISOString(),
    tipo: dados.tipo || 'documento',            // proposta | laudo | contrato
    titulo: dados.titulo || 'Documento',
    corpo: String(dados.corpo || ''),
    /* Cada laudo do sistema traz o desenho das próprias tabelas e caixas.
       Guardar junto é o que permite tirá-los da janela de impressão sem
       reescrever oito laudos. Vai escapado e escopado na hora de montar. */
    estilo: String(dados.estilo || '').slice(0, 20000),
    cliente: dados.cliente || '',
    clienteId: dados.clienteId || '',
    /* o telefone fica GRAVADO NO DOCUMENTO, não é passado no envio.
       Se fosse passado, bastaria digitar outro para burlar a regra. */
    telefone: so(dados.telefone),
    criadoPor: (eu && eu.nome) || 'sistema',
    aberturas: [], enviadoEm: null, aprovadoEm: null
  };
  salvar();
  return D.docs[id];
}

/* ═══════════════════════════════════════════════ a página, montada na hora
   Pedido dela: o documento tem que seguir o padrão do sistema. Então
   nada de desenho próprio aqui: folha clara com cartão branco, ilha
   escura de cabeçalho, a esteira com os pontos, os botões e as
   etiquetas, todos vindos de estilo.js, que é cópia do index.html.

   O cliente abre isso pelo WhatsApp, no celular, então é celular
   primeiro. E sem JavaScript nenhum, para não depender de nada.  */

const estilo = require('./estilo');

/* A mesma esteira do sistema: ponto cheio no que já aconteceu, linha de
   ouro entre os pontos vencidos. Três passos, porque é a vida inteira de
   um documento. */
function trilhaVisual(doc) {
  const abertaCliente = doc.aberturas.filter(a => a.lado === 'cliente')[0];
  const passos = [
    { l: 'Enviado',         ok: !!doc.enviadoEm,  q: doc.enviadoEm },
    { l: 'Aberto por você', ok: !!abertaCliente,  q: abertaCliente && abertaCliente.em },
    { l: 'Aprovado',        ok: !!doc.aprovadoEm, q: doc.aprovadoEm }
  ];
  const dia = q => q ? '<small>' + new Date(q).toLocaleDateString('pt-BR') + '</small>' : '';
  let h = '<div class="esteira"><div class="esteira-h">' +
          '<span class="tag">ESTEIRA</span> onde este documento está</div><div class="track">';
  passos.forEach((x, n) => {
    if (n) h += '<div class="tline' + (passos[n - 1].ok && x.ok ? ' done' : '') + '"></div>';
    h += '<div class="tstep' + (x.ok ? ' done' : '') + '">' +
         '<div class="tdot">' + (x.ok ? '&#10003;' : (n + 1)) + '</div>' +
         '<div class="tlabel">' + x.l + dia(x.q) + '</div></div>';
  });
  return h + '</div></div>';
}

/* O corpo do documento vem do sistema em HTML simples. Estas regras dão
   a ele a mesma tipografia das telas: título de seção com o traço de
   ouro, caixa de destaque e a tabela .tbl. */
const CSS_CORPO =
  '.papel{padding:34px 38px}' +
  '.corpo{max-width:64ch;margin:0 auto;font-size:15px;line-height:1.75;color:var(--ink)}' +
  '.corpo p{margin:0 0 16px}' +
  '.corpo h2,.corpo h3{font:600 20px/1.25 var(--font-display);letter-spacing:-.02em;' +
  'margin:32px 0 12px;padding-top:14px;border-top:2px solid var(--gold);display:inline-block}' +
  '.corpo b,.corpo strong{font-weight:600;color:#000}' +
  '.corpo ul,.corpo ol{margin:0 0 16px;padding-left:20px}' +
  '.corpo li{margin-bottom:7px}' +
  '.corpo .destaque{background:#fbf8f1;border:1px solid var(--line);border-left:3px solid var(--gold);' +
  'border-radius:0 var(--r-sm) var(--r-sm) 0;padding:16px 20px;margin:20px 0}' +
  '.corpo table{width:100%;border-collapse:separate;border-spacing:0;margin:0 0 18px;font-size:13px}' +
  '.corpo th{padding:12px 13px;text-align:left;font:600 10px var(--font-body);text-transform:uppercase;' +
  'letter-spacing:1px;color:var(--ink-soft);border-bottom:1px solid var(--ink)}' +
  '.corpo td{padding:12px 13px;border-bottom:1px solid var(--line);vertical-align:middle}' +

  /* a marca de quem está lendo, por cima da folha inteira */
  '.dagua{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:2}' +
  '.dagua span{position:absolute;white-space:nowrap;transform:rotate(-26deg);' +
  'transform-origin:left center;font:600 11px var(--font-mono);letter-spacing:.14em;' +
  'color:rgba(19,19,26,.075)}' +
  '.miolo{position:relative;overflow:hidden;margin-top:18px}' +

  /* as ações grudam no pé, como a barra de ações do sistema */
  '.acoes{position:sticky;bottom:0;z-index:3;display:flex;gap:10px;flex-wrap:wrap;' +
  'align-items:center;background:rgba(255,255,255,.94);border-top:1px solid var(--line);' +
  'border-radius:0 0 var(--r) var(--r);padding:14px 20px;' +
  '-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}' +
  '.acoes form{margin:0;flex:1 1 210px}.acoes form .btn{width:100%}' +
  '.acoes .btn{padding:13px 20px;font-size:14px}' +

  '@media(max-width:620px){.papel{padding:22px 18px}.corpo{font-size:15px}' +
  '.acoes{padding:11px 14px calc(11px + env(safe-area-inset-bottom));gap:8px}' +
  '.acoes .btn{flex:1 1 0;padding:12px 8px;font-size:13px}' +
  '.acoes form{flex:1 1 100%;order:-1}.acoes form .btn{font-size:14px;padding:14px 10px}' +
  '.track{overflow-x:auto;padding-bottom:4px}}' +

  /* impresso é do cliente, e nele a esteira e os botões não fazem sentido */
  '@media print{body{background:#fff}.esteira,.acoes,.rodape{display:none}' +
  '.card{border:0;box-shadow:none}.folha{max-width:none;padding:0}' +
  '.ilha{border-radius:0;box-shadow:none}.corpo{max-width:none}' +
  '.dagua span{color:rgba(19,19,26,.2)!important}}';

/**
 * Prende o CSS de um laudo dentro do corpo do documento.
 *
 * Isto já mordeu uma vez: um `p{text-align:justify}` de janela de
 * impressão vazou e justificou o site inteiro. Aqui cada seletor ganha
 * o prefixo `.corpo`, então uma regra de laudo não alcança o cabeçalho,
 * a esteira nem os botões. Regras `@` (media, print, keyframes) passam
 * inteiras, com o conteúdo prefixado por dentro.
 */
function escopar(css, prefixo) {
  if (!css) return '';
  /* comentário pode conter chave e desalinhar a contagem */
  css = String(css).replace(/\/\*[\s\S]*?\*\//g, '');
  let fora = '', i = 0;
  while (i < css.length) {
    const abre = css.indexOf('{', i);
    if (abre < 0) break;
    let seletor = css.slice(i, abre).trim();
    /* acha a chave que fecha ESTE bloco, contando as de dentro */
    let n = 1, j = abre + 1;
    while (j < css.length && n) { if (css[j] === '{') n++; else if (css[j] === '}') n--; j++; }
    const corpo = css.slice(abre + 1, j - 1);
    if (seletor.startsWith('@')) {
      fora += /keyframes|font-face/i.test(seletor)
        ? seletor + '{' + corpo + '}'                    // dentro não é seletor
        : seletor + '{' + escopar(corpo, prefixo) + '}';
    } else if (seletor) {
      fora += seletor.split(',').map(x => {
        x = x.trim();
        if (!x) return '';
        /* body e html do laudo viram o próprio corpo, não um filho dele */
        if (/^(body|html)$/i.test(x)) return prefixo;
        return prefixo + ' ' + x;
      }).filter(Boolean).join(',') + '{' + corpo + '}';
    }
    i = j;
  }
  return fora;
}

/** A ilha escura do topo: a mesma do portal do cliente no sistema. */
function ilhaDoc(doc) {
  return '<header class="ilha">' + estilo.selo('Grupo A! Fatorial') +
    '<h1>' + esc(doc.titulo) + '</h1>' +
    (doc.cliente ? '<div class="para">Preparado para ' + esc(doc.cliente) + '</div>' : '') +
    '<div class="regua">' +
      '<div><b>' + esc(doc.tipo) + '</b><span>Tipo</span></div>' +
      '<div><b>' + new Date(doc.em).toLocaleDateString('pt-BR') + '</b><span>Emitido em</span></div>' +
      '<div><b>' + esc(doc.id) + '</b><span>Documento</span></div>' +
    '</div></header>';
}

function pagina(doc, quem, opcoes) {
  const o = opcoes || {};
  /* O carimbo é longo e a folha é estreita: com passo curto as linhas se
     atropelavam e viravam borrão em vez de marca legível. */
  const q = new Date();
  const carimbo = quem + ' · ' + q.toLocaleDateString('pt-BR') + ' ' +
                  q.toLocaleTimeString('pt-BR').slice(0, 5) + ' · CONFIDENCIAL';
  let marcas = '';
  for (let y = -6; y < 130; y += 15)
    for (let x = -14; x < 130; x += 58)
      marcas += '<span style="left:' + x + '%;top:' + y + '%">' + esc(carimbo) + '</span>';

  return '<!doctype html><html lang="pt-BR"><head>' +
    estilo.cabeca(esc(doc.titulo) + ' · Grupo A! Fatorial',
                  CSS_CORPO + escopar(doc.estilo, '.corpo')) +
    '</head><body><div class="folha">' +
      ilhaDoc(doc) +
      '<div style="margin-top:18px">' + trilhaVisual(doc) + '</div>' +
      '<div class="card miolo">' +
        '<div class="dagua">' + marcas + '</div>' +
        '<div class="papel"><div class="corpo">' + doc.corpo + '</div></div>' +
        (o.acoes || '') +
      '</div>' +
      '<footer class="rodape">' +
        'Documento do Grupo A! Fatorial. Aberto por <b>' + esc(quem) + '</b> em ' +
        esc(q.toLocaleString('pt-BR')) + '. Cada abertura fica registrada.' +
        (o.equipe ? '<br>Cópia não disponível: este documento é enviado ao cliente pelo sistema.' : '') +
        (o.portal ? '<br><a href="' + o.portal + '">Ver todos os seus documentos</a>' : '') +
      '</footer>' +
    '</div></body></html>';
}

/* ═══════════════════════════════════════════════════════ o endereço do cliente */

function link(docId, base) {
  const doc = D.docs[docId];
  if (!doc) return null;
  const t = crypto.randomBytes(24).toString('hex');
  D.links[t] = { doc: docId, criado: Date.now(), expira: Date.now() + VALIDADE, usos: 0 };
  salvar();
  return String(base || '').replace(/\/+$/, '') + '/d/' + t;
}

/* Um documento pode ter vários endereços emitidos ao longo do tempo. O
   portal usa o mais recente que ainda vale, e emite um novo se todos
   expiraram: assim o cliente nunca esbarra em link vencido dentro da
   própria casa. */
function tokenDe(docId) {
  const vivos = Object.keys(D.links)
    .filter(t => D.links[t].doc === docId && Date.now() < D.links[t].expira)
    .sort((a, b) => D.links[b].criado - D.links[a].criado);
  if (vivos.length) return vivos[0];
  const t = crypto.randomBytes(24).toString('hex');
  D.links[t] = { doc: docId, criado: Date.now(), expira: Date.now() + VALIDADE, usos: 0 };
  salvar();
  return t;
}

function telaConfirmar(erro) {
  return '<!doctype html><html lang="pt-BR"><head>' +
    estilo.cabeca('Confirmação · Grupo A! Fatorial',
      '.porta{padding:30px 34px}' +
      '.dig{font:600 22px var(--font-mono);letter-spacing:.34em;text-indent:.34em;text-align:center;' +
      'width:9rem;padding:13px 10px}' +
      '@media(max-width:620px){.porta{padding:22px 18px}.dig{flex:1 1 100%;width:auto}}') +
    '</head><body><div class="folha">' +
    '<header class="ilha">' + estilo.selo('Segurança do seu documento') +
    '<h1>Só para <b>confirmar</b> que é você</h1></header>' +
    '<div class="card porta" style="margin-top:18px">' +
    (erro ? '<p style="margin-bottom:14px"><span class="pill pill-warn">Não confere</span> ' +
            'Confira os quatro últimos dígitos e tente de novo.</p>' : '') +
    '<p style="font-size:15px">Digite os <b>4 últimos dígitos</b> do WhatsApp que recebeu este endereço.</p>' +
    '<form method="get" style="display:flex;gap:10px;flex-wrap:wrap;margin-top:18px">' +
    '<input class="inp dig" name="c" inputmode="numeric" pattern="[0-9]*" maxlength="4" autofocus ' +
    'autocomplete="off" placeholder="0000" aria-label="4 últimos dígitos do seu WhatsApp">' +
    '<button class="btn btn-gold">Abrir</button></form>' +
    '<p style="color:var(--ink-faint);font-size:13px;margin-top:18px">Isso existe para que o endereço ' +
    'sozinho não abra o seu documento, caso ele seja encaminhado por engano.</p>' +
    '</div></div></body></html>';
}

function porToken(t) {
  const l = D.links[t];
  if (!l) return { erro: 'inexistente' };
  if (Date.now() > l.expira) return { erro: 'expirado' };
  const doc = D.docs[l.doc];
  if (!doc) return { erro: 'inexistente' };
  return { link: l, doc };
}

/* ══════════════════════════════════════════════════ o portal do cliente
   Pedido dela: "isso tudo deve ficar salvo no painel do cliente mesmo ele
   recebendo no WhatsApp".

   O endereço de um documento tem prazo de 14 dias, e é isso mesmo: link
   solto que vive para sempre é vazamento esperando acontecer. Mas o
   cliente não pode perder o material por isso.

   Então são dois endereços com papéis diferentes. O do documento é o
   convite, tem prazo e serve para o WhatsApp. O do portal é a casa: não
   expira, guarda tudo o que já foi enviado para aquele cliente, e de lá
   ele reabre qualquer documento quando quiser, mesmo anos depois.

   O mesmo portal serve de destino para a mensagem: em vez de acumular
   links soltos no WhatsApp, o cliente guarda um só. */

function portalDe(clienteId, base) {
  if (!clienteId) return null;
  if (!D.portais[clienteId]) {
    D.portais[clienteId] = crypto.randomBytes(20).toString('hex');
    salvar();
  }
  return String(base || '').replace(/\/+$/, '') + '/p/' + D.portais[clienteId];
}

function clienteDoPortal(t) {
  const id = Object.keys(D.portais).find(k => D.portais[k] === t);
  if (!id) return null;
  const docs = Object.values(D.docs)
    .filter(d => d.clienteId === id && d.enviadoEm)
    .sort((a, b) => String(b.enviadoEm).localeCompare(String(a.enviadoEm)));
  return { clienteId: id, docs };
}

/* Cliente visual reconhece a forma antes de ler o nome, então cada tipo
   ganha um desenho próprio. Desenhados à mão em SVG para não depender de
   fonte de ícone nem de arquivo externo. */
const GLIFOS = {
  proposta: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/><path d="M9 12h6M9 16h4"/>',
  contrato: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/><path d="M9 16c2-3 4 2 6-1"/>',
  laudo:    '<path d="M4 20h16"/><path d="M7 20v-6M12 20V6M17 20v-9"/>',
  agenda:   '<rect x="4" y="6" width="16" height="15" rx="2"/><path d="M4 11h16M9 3v5M15 3v5"/>',
  recibo:   '<path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2z"/><path d="M9 9h6M9 13h6"/>'
};

function glifo(tipo) {
  const d = GLIFOS[String(tipo).toLowerCase()] ||
            '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>';
  return '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
         'stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" ' +
         'aria-hidden="true">' + d + '</svg>';
}

const CSS_PORTAL =
  '.lista{padding:8px 0 0}' +
  '.doc{display:flex;align-items:center;gap:14px;text-decoration:none;color:inherit;' +
  'background:var(--panel);border:1px solid var(--line);border-radius:var(--r);' +
  'box-shadow:var(--shadow);padding:15px 17px;margin-bottom:10px;transition:.18s}' +
  '.doc:hover{border-color:var(--gold);transform:translateY(-1px);box-shadow:var(--shadow-lg)}' +
  '.doc:hover .seta{transform:translateX(3px);color:var(--gold-txt)}' +
  /* o selo do tipo usa a ilha escura do sistema, em miniatura */
  '.sel{width:44px;height:44px;flex:none;border-radius:12px;display:grid;place-items:center;' +
  'background:var(--dark-grad);color:var(--gold);border:1px solid rgba(255,255,255,.07)}' +
  '.doc.novo .sel{background:var(--gold-grad);color:#1a1408;border-color:transparent}' +
  '.doc.feito .sel{background:var(--ok-bg);color:var(--ok);border-color:transparent}' +
  '.ico{width:22px;height:22px}' +
  /* base zero, não automática: com base automática o título comprido
     empurrava o cartão inteiro para a linha de baixo em vez de só quebrar */
  '.txt{flex:1 1 0;min-width:0}' +
  '.doc b{display:block;font:600 16px/1.3 var(--font-display);letter-spacing:-.02em}' +
  '.doc .mt{display:block;font:12px var(--font-mono);color:var(--ink-faint);margin-top:4px}' +
  '.seta{width:18px;height:18px;flex:none;color:#c9c9d1;transition:.18s}' +
  '.vazio{padding:26px 22px;text-align:center;color:var(--ink-soft);font-size:14px}' +
  '@media(max-width:620px){.doc{gap:12px;padding:13px 14px}.doc b{font-size:15px}' +
  '.sel{width:40px;height:40px}.seta{display:none}}';

function paginaPortal(nome, docs, t, fim) {
  const cartao = d => {
    const aberto = d.aberturas.some(a => a.lado === 'cliente');
    const estado = d.aprovadoEm ? 'Aprovado' : aberto ? 'Lido' : 'Novo';
    const classe = d.aprovadoEm ? 'pill-ok' : aberto ? 'pill-mute' : 'pill-warn';
    /* cada documento ganha um endereço próprio dentro do portal, então o
       cliente não precisa guardar link nenhum */
    const alvo = '/p/' + t + '/' + d.id + '?c=' + esc(fim);
    return '<a class="doc' + (d.aprovadoEm ? ' feito' : aberto ? '' : ' novo') + '" href="' + alvo + '">' +
      '<span class="sel">' + glifo(d.tipo) + '</span>' +
      '<span class="txt"><b>' + esc(d.titulo) + '</b>' +
      '<span class="mt">' + esc(d.tipo) + ' · enviado em ' +
      new Date(d.enviadoEm).toLocaleDateString('pt-BR') + '</span></span>' +
      '<span class="pill ' + classe + '">' + estado + '</span>' +
      '<svg class="seta" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>' +
      '</a>';
  };
  const porLer = docs.filter(d => !d.aberturas.some(a => a.lado === 'cliente')).length;
  const aprovados = docs.filter(d => d.aprovadoEm).length;

  return '<!doctype html><html lang="pt-BR"><head>' +
    estilo.cabeca('Seus documentos · Grupo A! Fatorial', CSS_PORTAL) +
    '</head><body><div class="folha">' +
    '<header class="ilha">' + estilo.selo('Área do cliente · A! Fatorial') +
    '<h1>Seus <b>documentos</b></h1>' +
    (nome ? '<div class="para">' + esc(nome) + '</div>' : '') +
    '<div class="regua">' +
      '<div><b>' + docs.length + '</b><span>Guardados aqui</span></div>' +
      '<div><b>' + porLer + '</b><span>Ainda não lidos</span></div>' +
      '<div><b>' + aprovados + '</b><span>Aprovados</span></div>' +
      '<div><b>não expira</b><span>Este endereço</span></div>' +
    '</div></header>' +
    '<div class="lista" style="margin-top:18px">' +
    (docs.length ? docs.map(cartao).join('')
                 : '<div class="card vazio">Nada enviado ainda. Assim que a equipe enviar o ' +
                   'primeiro documento, ele aparece aqui.</div>') +
    '</div>' +
    '<footer class="rodape">Tudo o que a A! Fatorial envia para você fica guardado neste endereço, ' +
    'mesmo depois que o link do WhatsApp expirar. Cada abertura fica registrada.</footer>' +
    '</div></body></html>';
}

/** Um aviso inteiro na página, no padrão do sistema, para quando algo
    dá errado num caminho de formulário e não há JSON para mostrar. */
function paginaAviso(titulo, texto, voltar) {
  return '<!doctype html><html lang="pt-BR"><head>' +
    estilo.cabeca(esc(titulo) + ' · Grupo A! Fatorial', '.aviso{padding:28px 30px}') +
    '</head><body><div class="folha">' +
    '<header class="ilha">' + estilo.selo('Grupo A! Fatorial') +
    '<h1>' + esc(titulo) + '</h1></header>' +
    '<div class="card aviso" style="margin-top:18px">' +
    '<p style="font-size:15px">' + esc(texto) + '</p>' +
    (voltar ? '<p style="margin-top:18px"><a class="btn btn-ghost" href="' + voltar +
              '">Voltar</a></p>' : '') +
    '</div></div></body></html>';
}

/* ══════════════════════════════════════════════ a vista da equipe

   O sistema abre o documento numa aba nova, e aba nova não leva o
   cabeçalho de autorização junto. Sem isto a equipe tomaria 401 no
   próprio documento que acabou de gerar.

   Então quem cria recebe um endereço de VISTA: vale duas horas, é de
   uma pessoa só, e serve para ela ver e para ela enviar. Não é atalho
   de segurança, é a mesma identidade em outro formato, e continua indo
   inteira para a trilha.  */

function vistaDe(docId, eu) {
  D.vistas = D.vistas || {};
  const agoraMs = Date.now();
  Object.keys(D.vistas).forEach(k => { if (D.vistas[k].expira < agoraMs) delete D.vistas[k]; });
  const t = crypto.randomBytes(18).toString('hex');
  D.vistas[t] = { doc: docId, uid: eu.id, nome: eu.nome, expira: agoraMs + 2 * 3600e3 };
  salvar();
  return t;
}

/** Quem está olhando: o token da sessão, ou a vista no endereço. */
function quemVe(req, docId) {
  if (req.eu) return req.eu;
  const t = String((req.query && req.query.v) || (req.body && req.body.v) || '');
  const v = (D.vistas || {})[t];
  if (!v || v.expira < Date.now() || v.doc !== docId) return null;
  return { id: v.uid, nome: v.nome, vista: t };
}

/* ═════════════════════════════════════════════════════════════ rotas */

function montar(app, dep) {
  const { exigeLogin, talvezLogin, registrar, provar, enviarZap, baseUrl } = dep;

  /* ── a equipe VÊ, e não baixa ──
     Não existe rota de download para a equipe. Não é a interface que
     esconde o botão: a rota não existe, então não há endereço para
     descobrir. */
  app.get('/doc/:id', talvezLogin, (req, res) => {
    const doc = D.docs[req.params.id];
    if (!doc) return res.status(404).send('Documento não encontrado.');
    const eu = quemVe(req, doc.id);
    if (!eu) return res.status(401).send('Esta vista expirou. Gere o documento de novo pelo sistema.');
    doc.aberturas.push({ em: new Date().toISOString(), quem: eu.nome, uid: eu.id, lado: 'equipe' });
    salvar();
    if (registrar) registrar(req, eu, { acao: 'documento.ver', col: 'documentos',
                                        alvo: doc.id, obs: doc.titulo });
    res.set('Cache-Control', 'no-store');

    /* Enviar fica AQUI, e não numa tela do sistema, porque é aqui que o
       servidor sabe o número do cliente e é aqui que o porteiro está.
       Assim ninguém digita destino nenhum: só existe um botão, e ele
       manda para o número gravado no documento. */
    const fim = doc.telefone ? doc.telefone.slice(-4) : '';
    let acoes = '';
    /* lista interna não tem cliente e não se envia para ninguém: sem
       clienteId a barra de envio nem aparece, em vez de aparecer avisando
       que falta um telefone que nunca existiu */
    if (eu.vista && doc.clienteId) {
      acoes = '<div class="acoes">';
      if (!doc.telefone) {
        acoes += '<span class="pill pill-warn" style="padding:12px">Sem telefone de cliente: ' +
                 'preencha no cadastro para poder enviar</span>';
      } else if (doc.enviadoEm) {
        acoes += '<span class="pill pill-ok" style="padding:12px">Enviado em ' +
                 new Date(doc.enviadoEm).toLocaleDateString('pt-BR') + ' para o final ' + fim + '</span>' +
                 '<form method="post" action="/doc/' + doc.id + '/enviar-form">' +
                 '<input type="hidden" name="v" value="' + esc(eu.vista) + '">' +
                 '<button class="btn btn-ghost">Enviar de novo</button></form>';
      } else {
        acoes += '<form method="post" action="/doc/' + doc.id + '/enviar-form">' +
                 '<input type="hidden" name="v" value="' + esc(eu.vista) + '">' +
                 '<button class="btn btn-gold">Enviar ao cliente pelo WhatsApp</button></form>' +
                 '<span class="pill pill-mute" style="padding:12px">Vai para o final ' + fim +
                 ', o número do cadastro</span>';
      }
      acoes += '</div>';
    }
    res.send(pagina(doc, eu.nome, { equipe: true, acoes }));
  });

  /* O envio pela própria página: formulário, e não JSON, porque quem
     aperta é uma pessoa numa aba, não o sistema. */
  app.post('/doc/:id/enviar-form', comoFormulario, async (req, res) => {
    const doc = D.docs[req.params.id];
    if (!doc) return res.status(404).send('Documento não encontrado.');
    const eu = quemVe(req, doc.id);
    if (!eu) return res.status(401).send('Esta vista expirou. Gere o documento de novo pelo sistema.');
    const r = await mandarAoCliente(doc, eu, req);
    if (!r.ok) return res.status(r.status).send(paginaAviso('Não deu para enviar', r.detalhe,
      '/doc/' + doc.id + '?v=' + encodeURIComponent(eu.vista)));
    res.redirect('/doc/' + doc.id + '?v=' + encodeURIComponent(eu.vista));
  });

  /* ── criar ── */
  app.post('/doc', exigeLogin, (req, res) => {
    const doc = criar(req.body || {}, req.eu);
    if (registrar) registrar(req, req.eu, { acao: 'documento.criar', col: 'documentos',
                                            alvo: doc.id, depois: { tipo: doc.tipo, titulo: doc.titulo } });
    /* devolve o endereço COM a vista: é ele que o sistema abre na aba */
    const v = vistaDe(doc.id, req.eu);
    res.json({ ok: true, doc: { id: doc.id, titulo: doc.titulo,
      ver: '/doc/' + doc.id + '?v=' + v,
      verAbsoluto: baseUrl() + '/doc/' + doc.id + '?v=' + v } });
  });

  /* ── enviar: só para o número do cliente ──
     O telefone vem do documento, nunca do pedido. Se viesse do pedido,
     bastaria digitar outro número e a regra não existiria. */
  /**
   * Manda o documento ao cliente. Uma função só, chamada pelo sistema
   * (JSON) e pela página da equipe (formulário), porque a regra do
   * número tem que valer igual nos dois caminhos.
   */
  async function mandarAoCliente(doc, eu, req) {
    if (!doc.telefone) return { ok: false, status: 422, erro: 'cliente_sem_telefone',
      detalhe: 'O documento não tem telefone de cliente gravado, então não há para onde enviar com segurança.' };

    /* aceita os dois nomes: quem cria o documento manda "telefone", e seria
       armadilha o guarda não reconhecer justamente esse campo */
    const pedido = so((req.body || {}).para || (req.body || {}).telefone);
    if (pedido && pedido !== doc.telefone) {
      if (registrar) registrar(req, eu, { acao: 'documento.enviar', col: 'documentos',
        alvo: doc.id, bloqueado: true,
        motivo: 'tentou enviar para um número diferente do cliente', obs: 'pedido ' + pedido.slice(-4) });
      return { ok: false, status: 403, erro: 'numero_diferente',
        detalhe: 'Este documento só pode ser enviado para o número cadastrado do cliente.' };
    }

    const url = link(doc.id, baseUrl());
    try {
      /* o portal vai junto de propósito: o link do documento vence em
         14 dias, o do portal não. Se ela perder a mensagem, ainda tem
         a casa. */
      const casa = portalDe(doc.clienteId, baseUrl());
      await enviarZap(doc.telefone,
        'Olá! O seu ' + doc.tipo + ' está pronto: ' + url +
        '\n\nPara abrir, confirme os 4 últimos dígitos deste WhatsApp.' +
        (casa ? '\n\nTodos os seus documentos ficam guardados aqui: ' + casa : ''));
    } catch (e) {
      return { ok: false, status: 502, erro: 'envio_falhou', detalhe: String(e.message || e) };
    }
    doc.enviadoEm = new Date().toISOString();
    salvar();
    if (registrar) registrar(req, eu, { acao: 'documento.enviar', col: 'documentos',
      alvo: doc.id, obs: 'para o cliente, final ' + doc.telefone.slice(-4) });
    if (provar) provar('documento.enviado', { ref: doc.id, clienteId: doc.clienteId,
                                              por: eu.nome, evidencia: 'link enviado' });
    return { ok: true, enviadoPara: '...' + doc.telefone.slice(-4) };
  }

  app.post('/doc/:id/enviar', exigeLogin, async (req, res) => {
    const doc = D.docs[req.params.id];
    if (!doc) return res.status(404).json({ ok: false, erro: 'nao_encontrado' });
    const r = await mandarAoCliente(doc, req.eu, req);
    res.status(r.ok ? 200 : r.status).json(r);
  });

  /* ── o cliente abre ──
     Sem login, porque o cliente não tem conta. O que protege é o
     endereço ser impossível de adivinhar, ter prazo, e a conferência dos
     quatro últimos dígitos do telefone dele: link vazado sem o telefone
     não abre. */
  app.get('/d/:t', (req, res) => {
    const r = porToken(req.params.t);
    if (r.erro) return res.status(410).send('Este endereço não está mais válido. Peça um novo.');
    const fim = String(req.query.c || '');
    if (fim !== r.doc.telefone.slice(-4)) return res.send(telaConfirmar(!!fim));
    r.link.usos++;
    r.doc.aberturas.push({ em: new Date().toISOString(), quem: r.doc.cliente || 'cliente', lado: 'cliente' });
    salvar();
    if (registrar) registrar(req, { id: 'cliente', nome: r.doc.cliente || 'cliente' },
                             { acao: 'documento.aberto', col: 'documentos', alvo: r.doc.id });
    /* abrir É a prova: ninguém precisa perguntar se chegou */
    if (provar) provar('documento.aberto', { ref: r.doc.id, clienteId: r.doc.clienteId,
                                             por: r.doc.cliente || 'cliente', evidencia: 'abriu o endereço' });
    res.set('Cache-Control', 'no-store');
    res.send(pagina(r.doc, r.doc.cliente || 'cliente', {
      portal: (portalDe(r.doc.clienteId, '') || '') + '?c=' + esc(fim),
      acoes: '<div class="acoes">' +
        (r.doc.aprovadoEm
         ? '<span class="pill pill-ok" style="flex:1 1 200px;justify-content:center;padding:12px">' +
           'Aprovado em ' + new Date(r.doc.aprovadoEm).toLocaleDateString('pt-BR') + '</span>'
         : '<form method="post" action="/d/' + req.params.t + '/aprovar">' +
           '<input type="hidden" name="c" value="' + esc(fim) + '">' +
           '<button class="btn btn-gold">Aprovar este documento</button></form>') +
        '<a class="btn btn-ghost" href="/d/' + req.params.t + '/baixar?c=' + esc(fim) +
        '">Baixar uma cópia</a>' +
        (portalDe(r.doc.clienteId, '') ?
          '<a class="btn btn-lim" href="' + portalDe(r.doc.clienteId, '') + '?c=' + esc(fim) +
          '">Meus documentos</a>' : '') + '</div>'
    }));
  });

  /* ── baixar é direito do cliente, não da equipe ── */
  app.get('/d/:t/baixar', (req, res) => {
    const r = porToken(req.params.t);
    if (r.erro) return res.status(410).send('Endereço expirado.');
    if (String(req.query.c || '') !== r.doc.telefone.slice(-4)) return res.status(403).send('Confirmação inválida.');
    if (registrar) registrar(req, { id: 'cliente', nome: r.doc.cliente || 'cliente' },
                             { acao: 'documento.baixado', col: 'documentos', alvo: r.doc.id });
    res.set('Content-Type', 'text/html; charset=utf-8');
    /* "Ótica UltraVisão" virava "proposta--tica-UltraVis-o": trocar
       caractere não-ASCII por traço come as letras acentuadas. Separar o
       acento da letra antes (NFD) e jogar fora só o acento preserva a
       palavra. */
    const limpo = (r.doc.tipo + '-' + (r.doc.cliente || 'cliente'))
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w.-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    res.set('Content-Disposition', 'attachment; filename="' + limpo + '.html"');
    res.send(pagina(r.doc, r.doc.cliente || 'cliente', {}));
  });

  app.post('/d/:t/aprovar', comoFormulario, (req, res) => {
    const r = porToken(req.params.t);
    if (r.erro) return res.status(410).send('Endereço expirado.');
    if (String((req.body || {}).c || '') !== r.doc.telefone.slice(-4)) return res.status(403).send('Confirmação inválida.');
    r.doc.aprovadoEm = new Date().toISOString();
    salvar();
    if (registrar) registrar(req, { id: 'cliente', nome: r.doc.cliente || 'cliente' },
                             { acao: 'documento.aprovado', col: 'documentos', alvo: r.doc.id });
    if (provar) provar('documento.aprovado', { ref: r.doc.id, clienteId: r.doc.clienteId,
                                               por: r.doc.cliente || 'cliente', evidencia: 'aprovou na tela' });
    res.send('<!doctype html><meta charset="utf-8"><div style="font:16px/1.6 system-ui;max-width:28rem;' +
      'margin:18vh auto;padding:0 6vw"><h2 style="font:650 22px system-ui">Aprovado, obrigada.</h2>' +
      '<p>A equipe já foi avisada e segue com o próximo passo.</p></div>');
  });

  /* ── o portal: a casa do cliente ──
     Sem prazo, porque é onde o material mora. A confirmação dos 4
     dígitos continua, então o endereço sozinho não abre. */
  app.get('/p/:t', (req, res) => {
    const c = clienteDoPortal(req.params.t);
    if (!c) return res.status(404).send('Portal não encontrado.');
    const nome = (c.docs[0] || {}).cliente || '';
    const tel = (c.docs[0] || {}).telefone || '';
    const fim = String(req.query.c || '');
    if (!tel || fim !== tel.slice(-4)) return res.send(telaConfirmar(!!fim));
    if (registrar) registrar(req, { id: 'cliente', nome: nome || 'cliente' },
                             { acao: 'portal.aberto', col: 'documentos', alvo: c.clienteId });
    res.set('Cache-Control', 'no-store');
    res.send(paginaPortal(nome, c.docs, req.params.t, fim));
  });

  /* um documento visto de dentro do portal */
  app.get('/p/:t/:doc', (req, res) => {
    const c = clienteDoPortal(req.params.t);
    if (!c) return res.status(404).send('Portal não encontrado.');
    const doc = c.docs.filter(d => d.id === req.params.doc)[0];
    if (!doc) return res.status(404).send('Documento não encontrado neste portal.');
    const fim = String(req.query.c || '');
    if (fim !== doc.telefone.slice(-4)) return res.send(telaConfirmar(!!fim));
    doc.aberturas.push({ em: new Date().toISOString(), quem: doc.cliente || 'cliente', lado: 'cliente' });
    salvar();
    if (registrar) registrar(req, { id: 'cliente', nome: doc.cliente || 'cliente' },
                             { acao: 'documento.aberto', col: 'documentos', alvo: doc.id, obs: 'pelo portal' });
    if (provar) provar('documento.aberto', { ref: doc.id, clienteId: doc.clienteId,
                                             por: doc.cliente || 'cliente', evidencia: 'abriu pelo portal' });
    res.set('Cache-Control', 'no-store');
    res.send(pagina(doc, doc.cliente || 'cliente', {
      portal: '/p/' + req.params.t + '?c=' + esc(fim),
      /* aprovar é o passo que ela espera do cliente, então é ele que fica
         em ouro; baixar e voltar ficam ao lado, sem competir */
      acoes: '<div class="acoes">' +
        (doc.aprovadoEm
         ? '<span class="pill pill-ok" style="flex:1 1 200px;justify-content:center;padding:12px">' +
           'Aprovado em ' + new Date(doc.aprovadoEm).toLocaleDateString('pt-BR') + '</span>'
         : '<form method="post" action="/d/' + tokenDe(doc.id) + '/aprovar">' +
           '<input type="hidden" name="c" value="' + esc(fim) + '">' +
           '<button class="btn btn-gold">Aprovar este documento</button></form>') +
        '<a class="btn btn-ghost" href="/d/' + tokenDe(doc.id) + '/baixar?c=' + esc(fim) +
        '">Baixar uma cópia</a>' +
        '<a class="btn btn-lim" href="/p/' + req.params.t + '?c=' + esc(fim) +
        '">Meus documentos</a></div>'
    }));
  });

  /* quem abriu, quando, de que lado */
  app.get('/doc/:id/aberturas', exigeLogin, (req, res) => {
    const doc = D.docs[req.params.id];
    if (!doc) return res.status(404).json({ ok: false });
    res.json({ ok: true, enviadoEm: doc.enviadoEm, aprovadoEm: doc.aprovadoEm, aberturas: doc.aberturas });
  });
}

module.exports = { montar, criar, link, pagina };
