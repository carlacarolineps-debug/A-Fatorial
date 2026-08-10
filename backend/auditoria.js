/**
 * AUDITORIA E GOVERNANÇA
 * ─────────────────────────────────────────────────────────────────────
 * Isto existe porque a empresa lida com balanço, contrato e dado de
 * cliente grande. Não é recurso: é a condição para poder vender para
 * quem exige. E tem uma regra que decide se funciona ou é teatro:
 *
 *   TUDO É DECIDIDO NO SERVIDOR.
 *
 * Permissão conferida no navegador é enfeite. Quem abre o console muda
 * uma variável e passa por cima. Por isso nada aqui confia no que o
 * navegador diz sobre quem a pessoa é ou o que ela pode: o servidor
 * confere pelo token, pelo papel gravado e pelas regras.
 *
 * Quatro peças, nesta ordem de importância:
 *
 *   TRILHA      quem, de onde, quando, o quê, antes e depois. Sem o
 *               "antes", desfazer é impossível e a auditoria é achismo.
 *   REGRA       a dona proíbe uma ação para alguém, ou para todos, e
 *               ela passa a exigir autorização.
 *   PEDIDO      o que foi barrado vira pedido, que ela libera ou nega.
 *               Liberar vale UMA vez, não para sempre.
 *   DESFAZER    o "antes" volta, e o desfazer também é registrado. Nada
 *               some do histórico, nem a correção.
 *
 * O QUE ESTE ARQUIVO NÃO FAZ, e é importante dizer:
 *   · não impede print, porque nenhum sistema web impede. O que existe
 *     é a marca d'água com o nome de quem está vendo, no navegador, e a
 *     trilha que mostra quem abriu o quê e quando.
 *   · não descobre a cidade pelo IP sozinho. Guarda o IP; a conversão
 *     em localização depende de um serviço externo e está marcada
 *     abaixo como === GEO === para quando você quiser contratar um.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DIR = process.env.DADOS_DIR || path.join(__dirname, 'dados');
const ARQ = path.join(DIR, 'auditoria.json');

const VAZIO = { trilha: [], regras: [], pedidos: [], seq: 1 };
let A = VAZIO;
try {
  fs.mkdirSync(DIR, { recursive: true });
  if (fs.existsSync(ARQ)) A = Object.assign({}, VAZIO, JSON.parse(fs.readFileSync(ARQ, 'utf8')));
} catch (e) { A = JSON.parse(JSON.stringify(VAZIO)); }

/* A trilha não pode crescer sem limite num disco pequeno, e também não
   pode ser apagada por quem quiser. Corta pelo mais antigo, guardando o
   suficiente para uma auditoria de meses. */
const TETO = 20000;

let adiado = null;
function agora() {
  if (adiado) { clearTimeout(adiado); adiado = null; }
  try { fs.writeFileSync(ARQ, JSON.stringify(A)); } catch (e) {}
}
function salvar() {
  if (adiado) return;
  adiado = setTimeout(() => { adiado = null; agora(); }, 300);
}
['SIGINT', 'SIGTERM', 'beforeExit'].forEach(ev => process.on(ev, () => {
  agora(); if (ev !== 'beforeExit') process.exit(0);
}));

/* ── de onde veio ──
   Atrás de proxy (e vai estar, com HTTPS na frente), req.ip é o do
   proxy. O que vale é o primeiro endereço do X-Forwarded-For. */
function origem(req) {
  const enc = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return {
    ip: enc || req.ip || (req.connection && req.connection.remoteAddress) || '',
    agente: String(req.headers['user-agent'] || '').slice(0, 180),
    /* === GEO === com um serviço de geolocalização por IP, a cidade
       entra aqui. Sem ele, fica vazio de propósito: melhor um campo
       vazio do que um palpite registrado como fato numa auditoria. */
    lugar: ''
  };
}

function idNovo(p) { return p + '-' + (A.seq++).toString(36) + crypto.randomBytes(3).toString('hex'); }

/* ─────────────────────────────────────────────────────────── a trilha */

/**
 * Registra o que aconteceu. `antes` é o que permite desfazer, então
 * quem chama precisa passá-lo mesmo quando parece desnecessário.
 */
function registrar(req, eu, dados) {
  const o = origem(req);
  const r = Object.assign({
    id: idNovo('AUD'),
    em: new Date().toISOString(),
    uid: eu && eu.id, nome: (eu && eu.nome) || '?',
    ip: o.ip, agente: o.agente, lugar: o.lugar,
    bloqueado: false, desfeito: false
  }, dados);
  A.trilha.unshift(r);
  if (A.trilha.length > TETO) A.trilha.length = TETO;
  salvar();
  return r;
}

/* ─────────────────────────────────────────────────────────── as regras */

/**
 * Uma regra casa quando a ação bate e a pessoa bate. `uid:'*'` vale
 * para todo mundo menos a dona: proibir a dona de agir no próprio
 * sistema seria uma armadilha sem saída.
 */
function regraQueBarra(eu, acao, col) {
  if (!eu || eu.papel === 'admin') return null;
  return A.regras.find(r => r.ativa !== false
    && (r.acao === acao || r.acao === '*')
    && (!r.col || r.col === col)
    && (r.uid === '*' || r.uid === eu.id)) || null;
}

/**
 * O porteiro. Devolve {ok} ou {ok:false, pedido} quando barra.
 * `liberacao` é o bilhete de uso único que a dona emitiu.
 */
function permitir(req, eu, acao, col, detalhe, liberacao) {
  if (liberacao) {
    const p = A.pedidos.find(x => x.id === liberacao && x.estado === 'liberado' && !x.usado);
    if (p && p.uid === (eu && eu.id)) {
      p.usado = true; p.usadoEm = new Date().toISOString(); salvar();
      registrar(req, eu, { acao, col, alvo: detalhe, obs: 'liberado por autorização ' + p.id });
      return { ok: true };
    }
  }
  const regra = regraQueBarra(eu, acao, col);
  if (!regra) return { ok: true };

  /* já pediu isso e ainda não respondeu: não enche a dona de pedidos
     iguais a cada clique */
  let pedido = A.pedidos.find(x => x.estado === 'pendente' && x.uid === eu.id
                                && x.acao === acao && x.col === col);
  if (!pedido) {
    pedido = {
      id: idNovo('PED'), em: new Date().toISOString(),
      uid: eu.id, nome: eu.nome, acao, col, detalhe: detalhe || '',
      regra: regra.id, estado: 'pendente'
    };
    A.pedidos.unshift(pedido);
  }
  registrar(req, eu, { acao, col, alvo: detalhe, bloqueado: true,
                       motivo: regra.motivo || 'ação sob autorização', pedido: pedido.id });
  salvar();
  return { ok: false, pedido, regra };
}

/* ═══════════════════════════════════════════════════════════════ rotas */

function montar(app, dep) {
  const { exigeLogin, exigeAdmin, aplicarDesfazer } = dep;

  /* ── a trilha, com filtro ── */
  app.get('/gov/trilha', exigeLogin, exigeAdmin, (req, res) => {
    const { quem, acao, de, ate, so } = req.query;
    let l = A.trilha;
    if (quem) l = l.filter(x => x.uid === quem || (x.nome || '').toLowerCase().includes(String(quem).toLowerCase()));
    if (acao) l = l.filter(x => x.acao === acao);
    if (so === 'bloqueados') l = l.filter(x => x.bloqueado);
    if (de) l = l.filter(x => x.em >= de);
    if (ate) l = l.filter(x => x.em <= ate);
    res.json({ ok: true, total: l.length, trilha: l.slice(0, 300) });
  });

  /* ── o que uma pessoa fez, para a conversa difícil ── */
  app.get('/gov/pessoa/:uid', exigeLogin, exigeAdmin, (req, res) => {
    const l = A.trilha.filter(x => x.uid === req.params.uid);
    const porAcao = {};
    l.forEach(x => { porAcao[x.acao] = (porAcao[x.acao] || 0) + 1; });
    res.json({ ok: true, total: l.length, porAcao, ips: [...new Set(l.map(x => x.ip))].slice(0, 20),
               ultimas: l.slice(0, 60) });
  });

  /* ── regras ── */
  app.get('/gov/regras', exigeLogin, exigeAdmin, (_req, res) => res.json({ ok: true, regras: A.regras }));

  app.post('/gov/regras', exigeLogin, exigeAdmin, (req, res) => {
    const { acao, col, uid, motivo } = req.body || {};
    if (!acao) return res.status(400).json({ ok: false, erro: 'acao_obrigatoria' });
    const r = { id: idNovo('REG'), em: new Date().toISOString(), criadaPor: req.eu.nome,
                acao, col: col || '', uid: uid || '*', motivo: motivo || '', ativa: true };
    A.regras.unshift(r);
    registrar(req, req.eu, { acao: 'gov.regra.criar', alvo: acao + (col ? ':' + col : ''), depois: r });
    salvar();
    res.json({ ok: true, regra: r });
  });

  app.post('/gov/regras/:id/desligar', exigeLogin, exigeAdmin, (req, res) => {
    const r = A.regras.find(x => x.id === req.params.id);
    if (!r) return res.status(404).json({ ok: false });
    const antes = Object.assign({}, r);
    r.ativa = false;
    registrar(req, req.eu, { acao: 'gov.regra.desligar', alvo: r.id, antes, depois: Object.assign({}, r) });
    salvar();
    res.json({ ok: true, regra: r });
  });

  /* ── pedidos de autorização ── */
  app.get('/gov/pedidos', exigeLogin, (req, res) => {
    /* a pessoa vê os próprios; a dona vê todos */
    const meus = req.eu.papel === 'admin' ? A.pedidos : A.pedidos.filter(p => p.uid === req.eu.id);
    res.json({ ok: true, pedidos: meus.slice(0, 200) });
  });

  app.post('/gov/pedidos/:id/responder', exigeLogin, exigeAdmin, (req, res) => {
    const p = A.pedidos.find(x => x.id === req.params.id);
    if (!p) return res.status(404).json({ ok: false });
    const liberar = (req.body || {}).liberar === true;
    p.estado = liberar ? 'liberado' : 'negado';
    p.respondidoEm = new Date().toISOString();
    p.respondidoPor = req.eu.nome;
    p.nota = String((req.body || {}).nota || '').slice(0, 300);
    registrar(req, req.eu, { acao: 'gov.pedido.' + p.estado, alvo: p.id, depois: p });
    salvar();
    res.json({ ok: true, pedido: p });
  });

  /*: desfazer · Só o que tem "antes" pode voltar. O desfazer entra na trilha como
     evento próprio: corrigir também é uma ação que alguém tomou. */
  app.post('/gov/desfazer/:id', exigeLogin, exigeAdmin, (req, res) => {
    const r = A.trilha.find(x => x.id === req.params.id);
    if (!r) return res.status(404).json({ ok: false, erro: 'nao_encontrado' });
    if (r.desfeito) return res.status(409).json({ ok: false, erro: 'ja_desfeito' });
    if (r.antes === undefined) return res.status(422).json({ ok: false, erro: 'sem_estado_anterior' });
    let feito = false;
    try { feito = aplicarDesfazer ? aplicarDesfazer(r, req.eu) : false; }
    catch (e) { return res.status(500).json({ ok: false, erro: String(e.message || e) }); }
    if (!feito) return res.status(422).json({ ok: false, erro: 'nao_reversivel' });
    r.desfeito = true; r.desfeitoEm = new Date().toISOString(); r.desfeitoPor = req.eu.nome;
    registrar(req, req.eu, { acao: 'gov.desfazer', col: r.col, alvo: r.alvo || r.id,
                             antes: r.depois, depois: r.antes, obs: 'reverteu ' + r.id });
    salvar();
    res.json({ ok: true, revertido: r.id });
  });

  /* ── o que está barrado para mim agora, para o aviso no navegador ── */
  app.get('/gov/meus-bloqueios', exigeLogin, (req, res) => {
    const regras = A.regras.filter(r => r.ativa !== false && (r.uid === '*' || r.uid === req.eu.id));
    res.json({ ok: true, admin: req.eu.papel === 'admin',
               regras: req.eu.papel === 'admin' ? [] : regras.map(r => ({ acao: r.acao, col: r.col, motivo: r.motivo })),
               pedidos: A.pedidos.filter(p => p.uid === req.eu.id && p.estado !== 'usado').slice(0, 20) });
  });
}

module.exports = { montar, registrar, permitir, origem,
                   trilha: () => A.trilha, pedidos: () => A.pedidos, regras: () => A.regras };
