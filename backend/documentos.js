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

let D = { docs: {}, links: {}, seq: 1 };
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

/* ═══════════════════════════════════════════════ a página, montada na hora */

function pagina(doc, quem, opcoes) {
  const o = opcoes || {};
  /* O carimbo é longo e a folha é estreita: com passo curto as linhas se
     atropelavam e viravam borrão em vez de marca legível. Passo largo o
     bastante para caber o texto inteiro, e a data sem os segundos, que
     não acrescentam nada e só somam largura. */
  const q = new Date();
  const carimbo = quem + ' · ' + q.toLocaleDateString('pt-BR') + ' ' +
                  q.toLocaleTimeString('pt-BR').slice(0, 5) + ' · CONFIDENCIAL';
  let marcas = '';
  for (let y = -6; y < 130; y += 15)
    for (let x = -14; x < 130; x += 58)
      marcas += '<span style="position:absolute;left:' + x + '%;top:' + y + '%;white-space:nowrap;' +
        'transform:rotate(-26deg);transform-origin:left center;font:600 12px system-ui;' +
        'letter-spacing:.14em;color:rgba(20,20,30,.085)">' + esc(carimbo) + '</span>';

  return '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>' + esc(doc.titulo) + '</title>' +
    /* o robô não indexa e o navegador não guarda: documento de cliente
       não pode ficar no cache de uma máquina compartilhada */
    '<meta name="robots" content="noindex,nofollow,noarchive">' +
    '<style>' +
    'body{margin:0;font:15px/1.65 Georgia,serif;color:#14141c;background:#f4f4f6}' +
    '.folha{position:relative;max-width:820px;margin:26px auto;background:#fff;padding:46px 52px;' +
    'box-shadow:0 2px 24px rgba(0,0,0,.10);overflow:hidden}' +
    '.dagua{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:2}' +
    '.corpo{position:relative;z-index:1}' +
    'h1{font:650 26px/1.2 system-ui;letter-spacing:-.02em;margin:0 0 6px}' +
    '.sub{font:12px system-ui;letter-spacing:.1em;text-transform:uppercase;color:#8a8a96;margin-bottom:28px}' +
    '.rodape{margin-top:38px;padding-top:16px;border-top:1px solid #e3e3e9;' +
    'font:11.5px/1.6 system-ui;color:#8a8a96}' +
    '.acoes{max-width:820px;margin:0 auto 26px;display:flex;gap:10px;flex-wrap:wrap}' +
    '.bt{font:600 14px system-ui;padding:11px 18px;border-radius:9px;border:1px solid #c9c9d2;' +
    'background:#fff;color:#14141c;cursor:pointer;text-decoration:none;display:inline-block}' +
    '.bt.p{background:#14141c;color:#fff;border-color:#14141c}' +
    '@media print{.acoes{display:none}.folha{box-shadow:none;margin:0}' +
    '.dagua span{color:rgba(20,20,30,.2)!important}}' +
    '</style></head><body>' +
    '<div class="folha"><div class="dagua">' + marcas + '</div><div class="corpo">' +
    '<h1>' + esc(doc.titulo) + '</h1>' +
    '<div class="sub">' + esc(doc.tipo) + (doc.cliente ? ' · ' + esc(doc.cliente) : '') + '</div>' +
    doc.corpo +
    '<div class="rodape">Documento gerado pelo sistema do Grupo A! Fatorial em ' +
    esc(new Date().toLocaleString('pt-BR')) + '.<br>' +
    'Aberto por <b>' + esc(quem) + '</b>. Cada abertura fica registrada.' +
    (o.equipe ? '<br>Cópia não disponível: este documento é enviado ao cliente pelo sistema.' : '') +
    '</div></div></div>' +
    (o.acoes || '') +
    '</body></html>';
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

function porToken(t) {
  const l = D.links[t];
  if (!l) return { erro: 'inexistente' };
  if (Date.now() > l.expira) return { erro: 'expirado' };
  const doc = D.docs[l.doc];
  if (!doc) return { erro: 'inexistente' };
  return { link: l, doc };
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

    const pedido = so((req.body || {}).para);
    if (pedido && pedido !== doc.telefone) {
      if (registrar) registrar(req, req.eu, { acao: 'documento.enviar', col: 'documentos',
        alvo: doc.id, bloqueado: true,
        motivo: 'tentou enviar para um número diferente do cliente', obs: 'pedido ' + pedido.slice(-4) });
      return res.status(403).json({ ok: false, erro: 'numero_diferente',
        detalhe: 'Este documento só pode ser enviado para o número cadastrado do cliente.' });
    }

    const url = link(doc.id, baseUrl());
    try {
      await enviarZap(doc.telefone,
        'Olá! O seu ' + doc.tipo + ' está pronto: ' + url +
        '\nO endereço vale 14 dias e é só seu. Por ele você lê, aprova e baixa se quiser.');
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
    if (fim !== r.doc.telefone.slice(-4)) {
      return res.send('<!doctype html><meta charset="utf-8"><title>Confirmação</title>' +
        '<div style="font:16px/1.6 system-ui;max-width:26rem;margin:16vh auto;padding:0 6vw">' +
        '<h2 style="font:650 22px system-ui">Só para confirmar que é você</h2>' +
        '<p>Digite os <b>4 últimos dígitos</b> do WhatsApp que recebeu este endereço.</p>' +
        '<form method="get"><input name="c" inputmode="numeric" maxlength="4" ' +
        'style="font:18px system-ui;padding:11px;width:8rem;border:1px solid #bbb;border-radius:8px" autofocus> ' +
        '<button style="font:600 15px system-ui;padding:12px 18px;border:0;border-radius:8px;' +
        'background:#14141c;color:#fff">Abrir</button></form></div>');
    }
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
      acoes: '<div class="acoes">' +
        '<a class="bt p" href="/d/' + req.params.t + '/baixar?c=' + esc(fim) + '">Baixar uma cópia</a>' +
        '<form method="post" action="/d/' + req.params.t + '/aprovar" style="margin:0">' +
        '<input type="hidden" name="c" value="' + esc(fim) + '">' +
        '<button class="bt">Aprovar este documento</button></form></div>'
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

  /* quem abriu, quando, de que lado */
  app.get('/doc/:id/aberturas', exigeLogin, (req, res) => {
    const doc = D.docs[req.params.id];
    if (!doc) return res.status(404).json({ ok: false });
    res.json({ ok: true, enviadoEm: doc.enviadoEm, aprovadoEm: doc.aprovadoEm, aberturas: doc.aberturas });
  });
}

module.exports = { montar, criar, link, pagina };
