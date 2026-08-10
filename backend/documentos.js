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
   O cliente dela é visual, e proposta de consultoria costuma parecer
   documento de cartório. A escolha aqui: cabeçalho escuro com a marca em
   ouro, e corpo claro para ler e imprimir. Os dois mundos no mesmo papel,
   que é como material caro de verdade se apresenta.

   Feito para o celular primeiro, porque o endereço chega pelo WhatsApp e
   é ali que ele vai abrir. Sem JavaScript, para não depender de nada.  */

const SIMBOLO = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 112 140'%3E%3Cpath fill-rule='evenodd' d='M14 86 a26 40 0 1 0 52 0 a26 40 0 1 0 -52 0 Z M30 81 a14 27 0 1 0 28 0 a14 27 0 1 0 -28 0 Z' transform='rotate(-20 40 86)'/%3E%3Cpath d='M58 6 C52 40 30 88 20 126 l6 2 C36 90 61 42 67 6 Z'/%3E%3Cpath d='M84 50 l9 1 -4 46 -7-1 Z'/%3E%3Ccircle cx='86' cy='110' r='6'/%3E%3Cpath d='M73.8 31.2C82 23 88 18 93.6 14.1l1.6 2.3C89.8 20.2 84 25 75.6 33.2Z'/%3E%3Cpath d='M110 4 88 13l7.6 2.8z' opacity='.5'/%3E%3Cpath d='M110 4 95.6 15.8l3.2 8.4z'/%3E%3C/svg%3E";

const OURO = '#c8a24e', OURO_ALTO = '#f0dda6', BREU = '#0b0c11';

function trilhaVisual(doc) {
  const passos = [
    { l: 'Enviado', ok: !!doc.enviadoEm, q: doc.enviadoEm },
    { l: 'Aberto por você', ok: doc.aberturas.some(a => a.lado === 'cliente'),
      q: (doc.aberturas.filter(a => a.lado === 'cliente')[0] || {}).em },
    { l: 'Aprovado', ok: !!doc.aprovadoEm, q: doc.aprovadoEm }
  ];
  return '<ol class="trilha">' + passos.map(x =>
    '<li class="' + (x.ok ? 'ok' : '') + '"><i></i><span>' + x.l +
    (x.q ? '<small>' + new Date(x.q).toLocaleDateString('pt-BR') + '</small>' : '') +
    '</span></li>').join('') + '</ol>';
}

function estilo() {
  return '<style>' +
  '*{box-sizing:border-box}' +
  'body{margin:0;background:#ececed;color:#16161d;' +
  'font:16px/1.7 ui-serif,Georgia,"Times New Roman",serif;-webkit-text-size-adjust:100%}' +
  '.pg{max-width:860px;margin:0 auto;background:#fff;min-height:100vh;' +
  'box-shadow:0 0 60px rgba(0,0,0,.10)}' +

  /* o cabeçalho da marca */
  '.capa{background:' + BREU + ';color:#f2f2f6;padding:30px 40px 34px;position:relative;overflow:hidden}' +
  '.capa::after{content:"";position:absolute;inset:0;pointer-events:none;' +
  'background:radial-gradient(46rem 22rem at 14% -30%,rgba(240,221,166,.13),transparent 62%)}' +
  '.marca{display:flex;align-items:center;gap:12px;position:relative;z-index:1}' +
  '.sim{width:26px;height:33px;flex:none;background:linear-gradient(150deg,' + OURO_ALTO + ',' + OURO + ' 52%,#8a6a22);' +
  '-webkit-mask:url("' + SIMBOLO + '") no-repeat center/contain;' +
  'mask:url("' + SIMBOLO + '") no-repeat center/contain}' +
  '.marca b{font:650 17px/1 ui-sans-serif,system-ui;letter-spacing:-.02em;' +
  'background:linear-gradient(150deg,' + OURO_ALTO + ',' + OURO + ' 60%,#8a6a22);' +
  '-webkit-background-clip:text;background-clip:text;color:transparent}' +
  '.marca span{display:block;font:11px/1.4 ui-monospace,monospace;letter-spacing:.12em;' +
  'text-transform:uppercase;color:#8b8d9c;margin-top:3px}' +
  '.capa h1{font:650 clamp(26px,5.4vw,40px)/1.1 ui-sans-serif,system-ui;letter-spacing:-.03em;' +
  'margin:26px 0 0;position:relative;z-index:1;text-wrap:balance}' +
  '.capa .para{font:12px/1.5 ui-monospace,monospace;letter-spacing:.14em;text-transform:uppercase;' +
  'color:' + OURO + ';margin-top:12px;position:relative;z-index:1}' +
  '.capa .ident{display:flex;gap:22px;flex-wrap:wrap;margin-top:22px;position:relative;z-index:1;' +
  'padding-top:18px;border-top:1px solid rgba(240,221,166,.18)}' +
  '.capa .ident div{font:12px/1.5 ui-monospace,monospace;color:#8b8d9c}' +
  '.capa .ident b{display:block;color:#f2f2f6;font-weight:600;font-size:13px;margin-top:2px}' +

  /* a trilha de estado */
  '.trilha{display:flex;list-style:none;margin:0;padding:16px 40px;gap:8px;' +
  'background:#f7f6f3;border-bottom:1px solid #e7e5e0;flex-wrap:wrap}' +
  '.trilha li{display:flex;align-items:flex-start;gap:8px;flex:1 1 150px;' +
  'font:12px/1.4 ui-sans-serif,system-ui;color:#9a9aa4}' +
  '.trilha i{width:9px;height:9px;border-radius:50%;background:#d6d4ce;flex:none;margin-top:4px}' +
  '.trilha li.ok{color:#16161d;font-weight:600}' +
  '.trilha li.ok i{background:' + OURO + ';box-shadow:0 0 0 3px rgba(200,162,78,.2)}' +
  '.trilha small{display:block;font-weight:400;color:#9a9aa4;font-size:11px}' +

  /* o corpo */
  '.folha{position:relative;padding:40px;overflow:hidden}' +
  '.dagua{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:2}' +
  '.corpo{position:relative;z-index:1;max-width:62ch;margin:0 auto}' +
  '.corpo p{margin:0 0 18px}' +
  '.corpo h2,.corpo h3{font:650 20px/1.25 ui-sans-serif,system-ui;letter-spacing:-.02em;' +
  'margin:34px 0 12px;padding-top:16px;border-top:2px solid ' + OURO + ';display:inline-block}' +
  '.corpo b,.corpo strong{color:#000}' +
  '.corpo ul,.corpo ol{margin:0 0 18px;padding-left:20px}' +
  '.corpo li{margin-bottom:7px}' +
  '.corpo .destaque{background:#faf7f0;border-left:3px solid ' + OURO + ';' +
  'padding:18px 22px;margin:22px 0;border-radius:0 10px 10px 0}' +
  '.corpo table{border-collapse:collapse;width:100%;margin:0 0 20px;font-size:15px}' +
  '.corpo td,.corpo th{border-bottom:1px solid #e7e5e0;padding:10px 8px;text-align:left}' +
  '.corpo th{font:600 11px/1.4 ui-monospace,monospace;letter-spacing:.1em;' +
  'text-transform:uppercase;color:#8b8d9c}' +

  /* as ações
     No celular a barra não pode comer meia tela: a ação principal ocupa a
     linha, e as secundárias dividem a de baixo. */
  '.acoes{position:sticky;bottom:0;background:rgba(255,255,255,.96);' +
  '-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);' +
  'border-top:1px solid #e7e5e0;padding:14px 40px;display:flex;gap:9px;flex-wrap:wrap;' +
  'align-items:center;z-index:3}' +
  '.bt{font:600 15px ui-sans-serif,system-ui;padding:13px 20px;border-radius:11px;' +
  'border:1px solid #d5d3cd;background:#fff;color:#16161d;cursor:pointer;text-decoration:none;' +
  'display:inline-block;text-align:center;transition:.15s}' +
  '.bt:hover{border-color:' + OURO + '}' +
  '.bt.p{background:linear-gradient(150deg,' + OURO_ALTO + ',' + OURO + ');border-color:' + OURO + ';' +
  'color:#241c07;box-shadow:0 4px 14px rgba(200,162,78,.28)}' +
  '.bt.p:hover{filter:brightness(1.06)}' +
  '.bt.leve{border-color:transparent;color:#8b8d9c;font-weight:500;padding-left:8px;padding-right:8px}' +
  '.bt.leve:hover{color:#16161d;border-color:transparent}' +
  '.acoes form{margin:0;flex:1 1 200px}' +
  '.acoes form .bt{width:100%}' +

  '.rodape{padding:26px 40px 34px;background:#f7f6f3;border-top:1px solid #e7e5e0;' +
  'font:12px/1.65 ui-sans-serif,system-ui;color:#8b8d9c}' +
  '.rodape a{color:' + OURO + ';font-weight:600}' +

  '@media(max-width:620px){.capa{padding:22px 20px 26px}.folha{padding:26px 20px}' +
  '.trilha{padding:13px 20px;gap:4px}.trilha li{flex:1 1 46%}' +
  '.acoes{padding:11px 16px calc(11px + env(safe-area-inset-bottom));gap:8px}' +
  '.rodape{padding:22px 20px 28px}' +
  '.bt{flex:1 1 0;padding:12px 8px;font-size:14px}' +
  '.acoes form{flex:1 1 100%;order:-1}' +
  '.acoes form .bt{font-size:15px;padding:14px 10px}' +
  '.bt.leve{padding:12px 4px}}' +
  '@media print{body{background:#fff}.acoes,.trilha{display:none}' +
  '.pg{box-shadow:none;max-width:none}.corpo{max-width:none}' +
  '.dagua span{color:rgba(20,20,30,.22)!important}}' +
  '</style>';
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
      marcas += '<span style="position:absolute;left:' + x + '%;top:' + y + '%;white-space:nowrap;' +
        'transform:rotate(-26deg);transform-origin:left center;' +
        'font:600 11px ui-monospace,monospace;letter-spacing:.14em;' +
        'color:rgba(20,20,30,.075)">' + esc(carimbo) + '</span>';

  return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<meta name="theme-color" content="' + BREU + '">' +
    '<title>' + esc(doc.titulo) + ' · Grupo A! Fatorial</title>' +
    '<meta name="robots" content="noindex,nofollow,noarchive">' +
    estilo() + '</head><body><div class="pg">' +

    '<header class="capa">' +
      '<div class="marca"><i class="sim"></i><div>' +
        '<b>Grupo A! Fatorial</b>' +
        '<span>Soluções para empresas e franquias</span>' +
      '</div></div>' +
      '<h1>' + esc(doc.titulo) + '</h1>' +
      (doc.cliente ? '<div class="para">Preparado para ' + esc(doc.cliente) + '</div>' : '') +
      '<div class="ident">' +
        '<div>Documento<b>' + esc(doc.id) + '</b></div>' +
        '<div>Tipo<b>' + esc(doc.tipo) + '</b></div>' +
        '<div>Emitido em<b>' + new Date(doc.em).toLocaleDateString('pt-BR') + '</b></div>' +
      '</div>' +
    '</header>' +

    trilhaVisual(doc) +

    '<div class="folha"><div class="dagua">' + marcas + '</div>' +
    '<div class="corpo">' + doc.corpo + '</div></div>' +

    (o.acoes || '') +

    '<footer class="rodape">' +
      'Documento gerado pelo sistema do Grupo A! Fatorial. ' +
      'Aberto por <b>' + esc(quem) + '</b> em ' + esc(q.toLocaleString('pt-BR')) + '. ' +
      'Cada abertura fica registrada.' +
      (o.equipe ? '<br>Cópia não disponível: este documento é enviado ao cliente pelo sistema.' : '') +
      (o.portal ? '<br><a href="' + o.portal + '">Ver todos os seus documentos</a>' : '') +
    '</footer></div></body></html>';
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

function telaConfirmar() {
  return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<meta name="theme-color" content="' + BREU + '">' +
    '<title>Confirmação · Grupo A! Fatorial</title>' + estilo() +
    /* o anel de foco preto do navegador destoava do resto; aqui ele vira ouro */
    '<style>.dig{font:600 22px ui-monospace,monospace;letter-spacing:.34em;text-indent:.34em;' +
    'text-align:center;padding:14px 12px;width:8.5rem;border:1px solid #d5d3cd;border-radius:11px;' +
    'background:#fff;color:#16161d;outline:none}' +
    '.dig:focus{border-color:' + OURO + ';box-shadow:0 0 0 3px rgba(200,162,78,.22)}' +
    '@media(max-width:620px){.dig{flex:1 1 100%;width:auto}}</style>' +
    '</head><body><div class="pg">' +
    '<header class="capa"><div class="marca"><i class="sim"></i><div>' +
    '<b>Grupo A! Fatorial</b><span>Soluções para empresas e franquias</span>' +
    '</div></div><h1>Só para confirmar que é você</h1>' +
    '<div class="para">Segurança do seu documento</div></header>' +
    '<div class="folha"><div class="corpo">' +
    '<p>Digite os <b>4 últimos dígitos</b> do WhatsApp que recebeu este endereço.</p>' +
    '<form method="get" style="display:flex;gap:10px;flex-wrap:wrap;margin-top:22px">' +
    '<input class="dig" name="c" inputmode="numeric" pattern="[0-9]*" maxlength="4" autofocus ' +
    'autocomplete="off" placeholder="0000" aria-label="4 últimos dígitos do seu WhatsApp">' +
    '<button class="bt p">Abrir</button></form>' +
    '<p style="color:#8b8d9c;font-size:14px;margin-top:22px">Isso existe para que o endereço sozinho ' +
    'não abra o seu documento, caso ele seja encaminhado por engano.</p>' +
    '</div></div></div></body></html>';
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

function paginaPortal(nome, docs, t, fim) {
  const cartao = d => {
    const aberto = d.aberturas.some(a => a.lado === 'cliente');
    const estado = d.aprovadoEm ? 'Aprovado' : aberto ? 'Lido' : 'Novo';
    const cor = d.aprovadoEm ? '#2f8f5b' : aberto ? '#8b8d9c' : '#c8a24e';
    /* cada documento ganha um endereço próprio dentro do portal, então o
       cliente não precisa guardar link nenhum */
    const alvo = '/p/' + t + '/' + d.id + '?c=' + esc(fim);
    return '<a class="doc' + (d.aprovadoEm ? ' feito' : aberto ? '' : ' novo') + '" href="' + alvo + '">' +
      '<span class="sel">' + glifo(d.tipo) + '</span>' +
      '<span class="txt"><b>' + esc(d.titulo) + '</b>' +
      '<span class="mt">' + esc(d.tipo) + ' · enviado em ' +
      new Date(d.enviadoEm).toLocaleDateString('pt-BR') + '</span></span>' +
      '<span class="et" style="color:' + cor + ';border-color:' + cor + '">' + estado + '</span>' +
      '<svg class="seta" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>' +
      '</a>';
  };
  return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<meta name="theme-color" content="' + BREU + '">' +
    '<title>Seus documentos · Grupo A! Fatorial</title>' +
    '<meta name="robots" content="noindex,nofollow,noarchive">' +
    estilo() +
    '<style>.lista{padding:26px 40px 40px}' +
    '.doc{display:flex;align-items:center;gap:15px;text-decoration:none;color:inherit;' +
    'border:1px solid #e7e5e0;border-radius:14px;padding:15px 16px;margin-bottom:10px;' +
    'transition:.15s;background:#fff}' +
    '.doc:hover{border-color:' + OURO + ';box-shadow:0 8px 24px rgba(0,0,0,.07)}' +
    '.doc:hover .seta{transform:translateX(3px);color:' + OURO + '}' +
    /* o selo do tipo: breu com o desenho em ouro, o mesmo par do cabeçalho */
    '.sel{width:44px;height:44px;flex:none;border-radius:12px;display:grid;place-items:center;' +
    'background:' + BREU + ';color:' + OURO + '}' +
    '.doc.novo .sel{background:linear-gradient(150deg,' + OURO_ALTO + ',' + OURO + ');color:#241c07}' +
    '.doc.feito .sel{background:#1c3d2b;color:#7fd3a3}' +
    '.ico{width:22px;height:22px}' +
    /* base zero, não auto: com base automática o título comprido empurrava
       o cartão inteiro para a linha de baixo em vez de só quebrar */
    '.txt{flex:1 1 0;min-width:0}' +
    '.doc b{display:block;font:650 17px/1.3 ui-sans-serif,system-ui;letter-spacing:-.02em}' +
    '.doc .mt{display:block;font:12px ui-monospace,monospace;color:#8b8d9c;margin-top:3px}' +
    '.doc .et{flex:none;font:600 10.5px ui-monospace,monospace;letter-spacing:.1em;' +
    'text-transform:uppercase;border:1px solid;border-radius:20px;padding:3px 9px}' +
    '.seta{width:18px;height:18px;flex:none;color:#c9c7c1;transition:.15s}' +
    '.vazio{color:#8b8d9c;font:15px ui-sans-serif,system-ui;padding:8px 0}' +
    '@media(max-width:620px){.lista{padding:20px 16px 30px}' +
    '.doc{gap:12px;padding:13px 14px}' +
    '.doc b{font-size:16px}.sel{width:40px;height:40px}' +
    '.seta{display:none}}</style>' +
    '</head><body><div class="pg">' +
    '<header class="capa"><div class="marca"><i class="sim"></i><div>' +
    '<b>Grupo A! Fatorial</b><span>Soluções para empresas e franquias</span>' +
    '</div></div><h1>Seus documentos</h1>' +
    (nome ? '<div class="para">' + esc(nome) + '</div>' : '') +
    '<div class="ident"><div>Guardados aqui<b>' + docs.length + '</b></div>' +
    '<div>Este endereço<b>não expira</b></div></div></header>' +
    '<div class="lista">' +
    (docs.length ? docs.map(cartao).join('')
                 : '<p class="vazio">Nada enviado ainda. Assim que a equipe enviar o primeiro documento, ele aparece aqui.</p>') +
    '</div>' +
    '<footer class="rodape">Tudo o que a A! Fatorial envia para você fica guardado neste endereço, ' +
    'mesmo depois que o link do WhatsApp expirar. Cada abertura fica registrada.</footer>' +
    '</div></body></html>';
}

/* ═════════════════════════════════════════════════════════════ rotas */

function montar(app, dep) {
  const { exigeLogin, registrar, provar, enviarZap, baseUrl } = dep;

  /* ── a equipe VÊ, e não baixa ──
     Não existe rota de download para a equipe. Não é a interface que
     esconde o botão: a rota não existe, então não há endereço para
     descobrir. */
  app.get('/doc/:id', exigeLogin, (req, res) => {
    const doc = D.docs[req.params.id];
    if (!doc) return res.status(404).send('Documento não encontrado.');
    doc.aberturas.push({ em: new Date().toISOString(), quem: req.eu.nome, uid: req.eu.id, lado: 'equipe' });
    salvar();
    if (registrar) registrar(req, req.eu, { acao: 'documento.ver', col: 'documentos',
                                            alvo: doc.id, obs: doc.titulo });
    res.set('Cache-Control', 'no-store');
    res.send(pagina(doc, req.eu.nome, { equipe: true }));
  });

  /* ── criar ── */
  app.post('/doc', exigeLogin, (req, res) => {
    const doc = criar(req.body || {}, req.eu);
    if (registrar) registrar(req, req.eu, { acao: 'documento.criar', col: 'documentos',
                                            alvo: doc.id, depois: { tipo: doc.tipo, titulo: doc.titulo } });
    res.json({ ok: true, doc: { id: doc.id, titulo: doc.titulo, ver: '/doc/' + doc.id } });
  });

  /* ── enviar: só para o número do cliente ──
     O telefone vem do documento, nunca do pedido. Se viesse do pedido,
     bastaria digitar outro número e a regra não existiria. */
  app.post('/doc/:id/enviar', exigeLogin, async (req, res) => {
    const doc = D.docs[req.params.id];
    if (!doc) return res.status(404).json({ ok: false, erro: 'nao_encontrado' });
    if (!doc.telefone) return res.status(422).json({ ok: false, erro: 'cliente_sem_telefone',
      detalhe: 'O documento não tem telefone de cliente gravado, então não há para onde enviar com segurança.' });

    /* aceita os dois nomes: quem cria o documento manda "telefone", e seria
       armadilha o guarda não reconhecer justamente esse campo */
    const pedido = so((req.body || {}).para || (req.body || {}).telefone);
    if (pedido && pedido !== doc.telefone) {
      if (registrar) registrar(req, req.eu, { acao: 'documento.enviar', col: 'documentos',
        alvo: doc.id, bloqueado: true,
        motivo: 'tentou enviar para um número diferente do cliente', obs: 'pedido ' + pedido.slice(-4) });
      return res.status(403).json({ ok: false, erro: 'numero_diferente',
        detalhe: 'Este documento só pode ser enviado para o número cadastrado do cliente.' });
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
      return res.status(502).json({ ok: false, erro: 'envio_falhou', detalhe: String(e.message || e) });
    }
    doc.enviadoEm = new Date().toISOString();
    salvar();
    if (registrar) registrar(req, req.eu, { acao: 'documento.enviar', col: 'documentos',
      alvo: doc.id, obs: 'para o cliente, final ' + doc.telefone.slice(-4) });
    if (provar) provar('documento.enviado', { ref: doc.id, clienteId: doc.clienteId,
                                              por: req.eu.nome, evidencia: 'link enviado' });
    res.json({ ok: true, enviadoPara: '...' + doc.telefone.slice(-4) });
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
    if (fim !== r.doc.telefone.slice(-4)) return res.send(telaConfirmar());
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
        (r.doc.aprovadoEm ? '<span class="bt" style="flex:1 1 200px;opacity:.65">Aprovado em ' +
           new Date(r.doc.aprovadoEm).toLocaleDateString('pt-BR') + '</span>'
         : '<form method="post" action="/d/' + req.params.t + '/aprovar">' +
           '<input type="hidden" name="c" value="' + esc(fim) + '">' +
           '<button class="bt p">Aprovar este documento</button></form>') +
        '<a class="bt" href="/d/' + req.params.t + '/baixar?c=' + esc(fim) + '">Baixar uma cópia</a>' +
        (portalDe(r.doc.clienteId, '') ?
          '<a class="bt leve" href="' + portalDe(r.doc.clienteId, '') + '?c=' + esc(fim) +
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
    if (!tel || fim !== tel.slice(-4)) return res.send(telaConfirmar());
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
    if (fim !== doc.telefone.slice(-4)) return res.send(telaConfirmar());
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
        (doc.aprovadoEm ? '<span class="bt" style="flex:1 1 200px;opacity:.65">Aprovado em ' +
           new Date(doc.aprovadoEm).toLocaleDateString('pt-BR') + '</span>'
         : '<form method="post" action="/d/' + tokenDe(doc.id) + '/aprovar">' +
           '<input type="hidden" name="c" value="' + esc(fim) + '">' +
           '<button class="bt p">Aprovar este documento</button></form>') +
        '<a class="bt" href="/d/' + tokenDe(doc.id) + '/baixar?c=' + esc(fim) + '">Baixar uma cópia</a>' +
        '<a class="bt leve" href="/p/' + req.params.t + '?c=' + esc(fim) + '">Meus documentos</a></div>'
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
