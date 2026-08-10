/**
 * EQUIPE — várias pessoas no mesmo sistema, ao mesmo tempo, sem derrubar
 * o trabalho uma da outra.
 *
 * O problema que este arquivo resolve
 * ───────────────────────────────────
 * Sozinho, o index.html guarda tudo no navegador (localStorage). Isso
 * significa que duas pessoas em máquinas diferentes não brigam — mas
 * também não veem o trabalho uma da outra. E na mesma máquina, uma
 * apaga o que a outra fez.
 *
 * Aqui cada informação passa a ter dono, hora e versão. Quando duas
 * pessoas mexem no MESMO registro, o servidor não escolhe um vencedor
 * e joga o resto fora: ele compara campo a campo. Se a Beatriz mudou o
 * telefone do lead enquanto a Carla mudou o status, as duas mudanças
 * ficam. Só há conflito de verdade quando as duas mexem no mesmo campo
 * — e aí vence a mais recente, mas o que foi sobrescrito fica no log.
 *
 * Como o navegador conversa com este servidor
 * ───────────────────────────────────────────
 *   POST /equipe/entrar     e-mail e senha  ->  token da sessão
 *   GET  /equipe/dados      o que mudou desde a versão que eu tenho
 *   POST /equipe/dados      o que eu mudei (em forma de remendo por campo)
 *   GET  /equipe/quem       quem está online e em que tela
 *
 * Guarda tudo em arquivos JSON dentro de backend/dados/ — escrita
 * atômica (grava em .tmp e renomeia), então nunca fica pela metade.
 * Para uma equipe de dezenas de pessoas é mais que suficiente e não
 * exige instalar banco nenhum.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/* DADOS_DIR existe para o servidor apontar a pasta de dados para um disco
   montado, que é onde ela precisa ficar num servidor de verdade: sem isso
   o backup pega a pasta errada e uma reinstalação apaga tudo. O
   atendente.js já respeitava esta variável e este arquivo não, o que
   deixaria os dados da equipe num lugar e as conversas em outro. */
const auditoria = require('./auditoria');
const obrigacoes = require('./obrigacoes');
const DIR = process.env.DADOS_DIR || path.join(__dirname, 'dados');
const F_ESTADO = path.join(DIR, 'estado.json');
const F_CONTAS = path.join(DIR, 'contas.json');

/* ── arquivos: leitura tolerante, escrita atômica ── */
function ler(arq, padrao) {
  try { return JSON.parse(fs.readFileSync(arq, 'utf8')); }
  catch (e) { return JSON.parse(JSON.stringify(padrao)); }
}
function gravar(arq, valor) {
  fs.mkdirSync(DIR, { recursive: true });
  const tmp = arq + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(valor, null, 1));
  fs.renameSync(tmp, arq);                     // renomear é atômico no mesmo disco
}

let ESTADO = ler(F_ESTADO, { rev: 0, registros: {}, docs: {}, log: [] });
let CONTAS = ler(F_CONTAS, { usuarios: [], sessoes: {}, seq: 1 });
/* uid -> {nome, tela, foco, em}
   `foco` é o registro que a pessoa está com aberto AGORA, no formato
   "leads:L1". Sem ele a presença só sabia dizer em que tela cada um
   está, o que não evita a colisão que importa: duas pessoas dentro do
   MESMO lead, cada uma achando que é a única. */
const PRESENCA = new Map();

let gravarPendente = null;
/** Junta várias gravações próximas em uma só, sem perder nada. */
function salvar() {
  if (gravarPendente) return;
  gravarPendente = setTimeout(() => {
    gravarPendente = null;
    gravar(F_ESTADO, ESTADO);
    gravar(F_CONTAS, CONTAS);
  }, 120);
}
function salvarAgora() {
  if (gravarPendente) { clearTimeout(gravarPendente); gravarPendente = null; }
  gravar(F_ESTADO, ESTADO); gravar(F_CONTAS, CONTAS);
}

/* ── senha: scrypt do próprio Node, sem dependência externa ── */
function hashSenha(senha, sal) {
  sal = sal || crypto.randomBytes(16).toString('hex');
  const h = crypto.scryptSync(String(senha), sal, 64).toString('hex');
  return { sal, hash: h };
}
function senhaConfere(senha, sal, hash) {
  try {
    const h = crypto.scryptSync(String(senha), sal, 64);
    const alvo = Buffer.from(hash, 'hex');
    return h.length === alvo.length && crypto.timingSafeEqual(h, alvo);
  } catch (e) { return false; }
}
function novoToken() { return crypto.randomBytes(32).toString('hex'); }

/* ═══ REMENDO POR CAMPO ═══
   O navegador manda só o que mudou, em forma de remendo aninhado. O
   servidor aplica esse remendo sobre a versão que ele já tem — por isso
   duas pessoas podem mexer no mesmo registro sem uma apagar a outra.
   Listas são tratadas como valor único (trocam inteiras): duas pessoas
   reordenando a mesma lista ao mesmo tempo é conflito de verdade. */
/* marca de "apague este campo". É um objeto, e não um texto especial,
   porque texto especial um dia colide com um dado de verdade. */
const APAGAR = { __apagar: true };
function ehApagar(v) { return v && typeof v === 'object' && v.__apagar === true; }

function ehObjeto(v) { return v && typeof v === 'object' && !Array.isArray(v); }

/** Aplica o remendo sobre o alvo e devolve a lista de campos tocados. */
function aplicarRemendo(alvo, remendo, prefixo, tocados) {
  tocados = tocados || [];
  prefixo = prefixo || '';
  if (!ehObjeto(alvo)) alvo = {};
  Object.keys(remendo || {}).forEach(k => {
    const v = remendo[k];
    const cam = prefixo ? prefixo + '.' + k : k;
    if (ehApagar(v)) { delete alvo[k]; tocados.push(cam); return; }
    if (ehObjeto(v)) {
      if (!ehObjeto(alvo[k])) alvo[k] = {};
      aplicarRemendo(alvo[k], v, cam, tocados);
    } else {
      alvo[k] = v; tocados.push(cam);
    }
  });
  return { valor: alvo, tocados };
}

/* ── sessão ── */
function usuarioDoToken(req) {
  const h = String(req.headers.authorization || '');
  const t = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!t) return null;
  const s = CONTAS.sessoes[t];
  if (!s) return null;
  const u = CONTAS.usuarios.find(x => x.id === s.uid && x.ativo !== false);
  if (!u) return null;
  s.ultimoEm = new Date().toISOString();
  return { u, token: t };
}
function limpo(u) {
  return { id: u.id, nome: u.nome, email: u.email, papel: u.papel, cargo: u.cargo || '', ativo: u.ativo !== false };
}
function online() {
  const corte = Date.now() - 45000;
  const fora = [];
  PRESENCA.forEach((v, k) => { if (new Date(v.em).getTime() < corte) fora.push(k); });
  fora.forEach(k => PRESENCA.delete(k));
  return [...PRESENCA.entries()].map(([uid, v]) => ({ uid, nome: v.nome, tela: v.tela, foco: v.foco || '', em: v.em }));
}

/* Marca onde a pessoa está. Chamada pelo GET e pelo POST de dados, que
   já acontecem de qualquer jeito: a presença pega carona e não gera
   nenhuma requisição a mais. */
function marcarPresenca(eu, tela, foco) {
  const antes = PRESENCA.get(eu.id) || {};
  PRESENCA.set(eu.id, {
    nome: eu.nome,
    tela: tela !== undefined && tela !== null ? String(tela).slice(0, 40) : (antes.tela || ''),
    /* string vazia é "fechei o registro" e precisa apagar o foco; só
       undefined quer dizer "não estou dizendo nada sobre isso agora" */
    foco: foco !== undefined && foco !== null ? String(foco).slice(0, 60) : (antes.foco || ''),
    em: new Date().toISOString()
  });
}

/* ═══ ROTAS ═══ */
function montar(app, cfg) {
  cfg = cfg || {};
  const dirDados = () => { fs.mkdirSync(DIR, { recursive: true }); };
  dirDados();

  /* Primeira vez: cria a conta de dona a partir do .env, para não existir
     servidor aberto sem senha em momento nenhum. */
  if (!CONTAS.usuarios.length && cfg.donoEmail && cfg.donoSenha) {
    const { sal, hash } = hashSenha(cfg.donoSenha);
    CONTAS.usuarios.push({
      id: 'u' + (CONTAS.seq++), nome: cfg.donoNome || 'Administração',
      email: String(cfg.donoEmail).toLowerCase(), papel: 'admin', cargo: 'CEO',
      sal, hash, ativo: true, criadoEm: new Date().toISOString()
    });
    salvarAgora();
    console.log('[equipe] conta de administração criada para ' + cfg.donoEmail);
  }

  const exigeLogin = (req, res, next) => {
    const s = usuarioDoToken(req);
    if (!s) return res.status(401).json({ ok: false, erro: 'sessao_invalida' });
    req.eu = s.u; req.token = s.token; next();
  };
  const exigeAdmin = (req, res, next) => {
    if (req.eu.papel !== 'admin') return res.status(403).json({ ok: false, erro: 'so_admin' });
    next();
  };

  /* — está de pé? (não exige login: o navegador testa antes de entrar) — */
  app.get('/equipe/saude', (_req, res) => {
    res.json({
      ok: true, servico: 'equipe', versao: 1,
      contas: CONTAS.usuarios.length,
      precisaInstalar: CONTAS.usuarios.length === 0,
      rev: ESTADO.rev, online: online().length
    });
  });

  /* — instalação: só funciona enquanto não existir nenhuma conta — */
  app.post('/equipe/instalar', (req, res) => {
    if (CONTAS.usuarios.length) return res.status(409).json({ ok: false, erro: 'ja_instalado' });
    const { nome, email, senha } = req.body || {};
    if (!email || !senha || String(senha).length < 8)
      return res.status(400).json({ ok: false, erro: 'senha_curta', detalhe: 'A senha precisa de pelo menos 8 caracteres.' });
    const { sal, hash } = hashSenha(senha);
    const u = { id: 'u' + (CONTAS.seq++), nome: nome || 'Administração', email: String(email).toLowerCase(),
      papel: 'admin', cargo: 'CEO', sal, hash, ativo: true, criadoEm: new Date().toISOString() };
    CONTAS.usuarios.push(u); salvarAgora();
    res.json({ ok: true, usuario: limpo(u) });
  });

  /* — entrar — */
  app.post('/equipe/entrar', (req, res) => {
    const { email, senha } = req.body || {};
    const u = CONTAS.usuarios.find(x => x.email === String(email || '').toLowerCase());
    // resposta igual para e-mail inexistente e senha errada: não entrega quem existe
    if (!u || u.ativo === false || !senhaConfere(senha, u.sal, u.hash))
      return res.status(401).json({ ok: false, erro: 'credenciais' });
    const token = novoToken();
    CONTAS.sessoes[token] = { uid: u.id, criadoEm: new Date().toISOString(), ultimoEm: new Date().toISOString() };
    /* A chave de reentrada é o que evita a equipe inteira parar junto.
       A sessão desaparece quando o servidor é reinstalado ou quando
       alguém limpa as sessões, e nesse instante todo mundo levaria 401 ao
       mesmo tempo e cairia na tela de login, no meio do expediente.
       Com ela o navegador troca por uma sessão nova sozinho e a pessoa
       não percebe. É separada do token de sessão de propósito: ela só
       serve para pedir sessão, e é trocada a cada uso, então uma cópia
       velha não vale duas vezes. */
    const reentrada = crypto.randomBytes(32).toString('hex');
    CONTAS.reentradas = CONTAS.reentradas || {};
    CONTAS.reentradas[reentrada] = { uid: u.id, em: new Date().toISOString() };
    // limpa sessões paradas há mais de 30 dias
    const corte = Date.now() - 30 * 24 * 3600e3;
    Object.keys(CONTAS.sessoes).forEach(t => {
      if (new Date(CONTAS.sessoes[t].ultimoEm).getTime() < corte) delete CONTAS.sessoes[t];
    });
    salvar();
    res.json({ ok: true, token, reentrada, usuario: limpo(u), rev: ESTADO.rev });
  });

  /* — troca a chave de reentrada por uma sessão nova, sem pedir senha — */
  app.post('/equipe/reentrar', (req, res) => {
    const ch = String((req.body || {}).reentrada || '');
    const r = (CONTAS.reentradas || {})[ch];
    if (!r) return res.status(401).json({ ok: false, erro: 'reentrada_invalida' });
    const u = CONTAS.usuarios.find(x => x.id === r.uid && x.ativo !== false);
    if (!u) { delete CONTAS.reentradas[ch]; salvar(); return res.status(401).json({ ok: false, erro: 'conta_inativa' }); }
    /* rotaciona: a chave usada morre aqui e uma nova vai junto com a
       sessão. Chave roubada de um backup antigo não abre nada. */
    delete CONTAS.reentradas[ch];
    const token = crypto.randomBytes(24).toString('hex');
    const nova = crypto.randomBytes(32).toString('hex');
    CONTAS.sessoes[token] = { uid: u.id, criadoEm: new Date().toISOString(), ultimoEm: new Date().toISOString() };
    CONTAS.reentradas[nova] = { uid: u.id, em: new Date().toISOString() };
    salvar();
    res.json({ ok: true, token, reentrada: nova, usuario: limpo(u), rev: ESTADO.rev });
  });

  app.post('/equipe/sair', exigeLogin, (req, res) => {
    delete CONTAS.sessoes[req.token];
    /* sair de verdade também mata a reentrada: senão o navegador
       voltaria sozinho no minuto seguinte */
    const ch = String((req.body || {}).reentrada || '');
    if (ch && CONTAS.reentradas) delete CONTAS.reentradas[ch];
    PRESENCA.delete(req.eu.id);
    salvar();
    res.json({ ok: true });
  });

  app.get('/equipe/eu', exigeLogin, (req, res) => {
    res.json({ ok: true, usuario: limpo(req.eu), rev: ESTADO.rev, online: online() });
  });

  /* — o que mudou desde a versão que eu tenho — */
  app.get('/equipe/dados', exigeLogin, (req, res) => {
    const desde = Number(req.query.desde || 0) || 0;
    if (req.query.tela !== undefined || req.query.foco !== undefined)
      marcarPresenca(req.eu, req.query.tela, req.query.foco);
    res.json({ ok: true, rev: ESTADO.rev, mudancas: desdeRev(desde), online: online() });
  });

  /* — o que eu mudei — */
  app.post('/equipe/dados', exigeLogin, (req, res) => {
    const { desde, mudancas, tela } = req.body || {};
    if (tela !== undefined || (req.body || {}).foco !== undefined)
      marcarPresenca(req.eu, tela, (req.body || {}).foco);
    if (!Array.isArray(mudancas)) return res.status(400).json({ ok: false, erro: 'formato' });
    if (mudancas.length > 500) return res.status(413).json({ ok: false, erro: 'lote_grande' });

    const agora = new Date().toISOString();
    const aceitos = [], conflitos = [], barrados = [];

    /* TODA gravação do sistema passa por esta função. É o único lugar
       onde precisa existir porteiro e trilha, e é por isso que a
       auditoria fica completa sem espalhar chamada por dezenas de
       telas: quem não passa por aqui não grava nada. */
    mudancas.forEach(m => {
      if (!m || !m.col) return;

      const porta = auditoria.permitir(req, req.eu,
        m.apagado ? 'apagar' : 'gravar', m.col,
        (m.col + (m.id ? ':' + m.id : '')), (req.body || {}).liberacao);
      if (!porta.ok) {
        barrados.push({ col: m.col, id: m.id, pedido: porta.pedido.id,
                        motivo: porta.regra.motivo || 'ação sob autorização' });
        return;
      }
      const ehDoc = !m.id;
      const chave = ehDoc ? m.col : (m.col + ':' + m.id);
      const bolsa = ehDoc ? ESTADO.docs : ESTADO.registros;
      const atual = bolsa[chave];

      if (m.apagado) {
        if (!atual) { aceitos.push({ col: m.col, id: m.id, rev: ESTADO.rev }); return; }
        ESTADO.rev++;
        const eraApagado = atual.dado;
        bolsa[chave] = { col: m.col, id: m.id, dado: null, apagado: true, rev: ESTADO.rev, por: req.eu.id, porNome: req.eu.nome, em: agora };
        aceitos.push({ col: m.col, id: m.id, rev: ESTADO.rev });
        /* apagar é a ação que mais precisa de "antes": é a única em que
           o dado deixa de existir e só a trilha pode trazer de volta */
        auditoria.registrar(req, req.eu, { acao: 'apagar', col: m.col, alvo: chave,
                                           antes: eraApagado, depois: null });
        return;
      }

      // registro novo
      if (!atual || atual.apagado) {
        ESTADO.rev++;
        const base = m.valor !== undefined ? m.valor : aplicarRemendo({}, m.remendo || {}).valor;
        bolsa[chave] = { col: m.col, id: m.id, dado: base, rev: ESTADO.rev, por: req.eu.id, porNome: req.eu.nome, em: agora };
        aceitos.push({ col: m.col, id: m.id, rev: ESTADO.rev });
        auditoria.registrar(req, req.eu, { acao: 'criar', col: m.col, alvo: chave,
                                           antes: null, depois: base });
        return;
      }

      // alguém mexeu depois da versão em que este remendo foi feito?
      const desatualizado = Number(m.rev || 0) < Number(atual.rev || 0);

      if (m.valor !== undefined) {
        // substituição inteira: só aceita se estiver em dia
        if (desatualizado) {
          conflitos.push({ col: m.col, id: m.id, motivo: 'substituicao_desatualizada', servidor: atual });
          return;
        }
        ESTADO.rev++;
        const eraSub = atual.dado;
        bolsa[chave] = { col: m.col, id: m.id, dado: m.valor, rev: ESTADO.rev, por: req.eu.id, porNome: req.eu.nome, em: agora };
        aceitos.push({ col: m.col, id: m.id, rev: ESTADO.rev });
        auditoria.registrar(req, req.eu, { acao: 'substituir', col: m.col, alvo: chave,
                                           antes: eraSub, depois: m.valor });
        return;
      }

      // remendo por campo: junta com o que já existe
      const antes = desatualizado ? JSON.parse(JSON.stringify(atual.dado || {})) : null;
      const eraRemendo = JSON.parse(JSON.stringify(atual.dado || {}));
      const { valor, tocados } = aplicarRemendo(atual.dado || {}, m.remendo || {});
      ESTADO.rev++;
      auditoria.registrar(req, req.eu, { acao: 'alterar', col: m.col, alvo: chave,
                                         campos: tocados.slice(0, 20),
                                         antes: eraRemendo, depois: valor });
      bolsa[chave] = { col: m.col, id: m.id, dado: valor, rev: ESTADO.rev, por: req.eu.id, porNome: req.eu.nome, em: agora };
      aceitos.push({ col: m.col, id: m.id, rev: ESTADO.rev, juntado: desatualizado });

      // se estava desatualizado, registra o que foi por cima — nada some sem deixar rastro
      if (desatualizado && antes) {
        const sobrescritos = tocados.filter(c => {
          const a = pega(antes, c), b = pega(valor, c);
          return JSON.stringify(a) !== JSON.stringify(b) && a !== undefined;
        });
        if (sobrescritos.length) {
          ESTADO.log.unshift({ em: agora, por: req.eu.nome, col: m.col, id: m.id,
            campos: sobrescritos.slice(0, 12), deQuem: atual.porNome || '', valorAntigo: recorta(antes, sobrescritos) });
          ESTADO.log = ESTADO.log.slice(0, 300);
        }
      }
    });

    salvar();
    // devolve TUDO o que mudou, inclusive o que esta pessoa acabou de mandar:
    // depois da junção o registro carrega também a contribuição dos outros, e
    // filtrar "o que é meu" faria justamente quem gravou por último nunca
    // receber o que o colega tinha escrito
    /* `barrados` volta junto: sem isso a pessoa continuaria digitando
       achando que gravou, e só descobriria amanhã que nada foi salvo. */
    res.json({ ok: true, rev: ESTADO.rev, aceitos, conflitos, barrados,
               mudancas: desdeRev(Number(desde || 0) || 0) });
  });

  app.get('/equipe/quem', exigeLogin, (_req, res) => res.json({ ok: true, online: online() }));

  app.get('/equipe/log', exigeLogin, (_req, res) => res.json({ ok: true, log: ESTADO.log.slice(0, 80) }));

  /* ── governança ──
     O desfazer precisa saber escrever no estado, e só este arquivo sabe.
     Por isso a auditoria recebe a função em vez de importar o estado:
     ela cuida da política, este arquivo cuida do dado. */
  /* As obrigações precisam saber MANDAR (confirmação de agenda, acesso
     ao portal) e AVISAR (cobrar o dono, escalar para a direção). Quem
     sabe falar com o WhatsApp é o server.js, então ele passa as duas
     funções para cá. Este arquivo não conhece a Meta, e o módulo de
     obrigações não conhece nem a Meta nem o estado: cada um faz uma
     coisa e o encanamento fica visível num lugar só. */
  obrigacoes.montar(app, {
    exigeLogin, exigeAdmin,
    executor: cfg.executor, avisar: cfg.avisar
  });

  auditoria.montar(app, {
    exigeLogin, exigeAdmin,
    aplicarDesfazer: (r, eu) => {
      if (!r.col || !r.alvo) return false;
      const id = String(r.alvo).split(':').slice(1).join(':');
      const ehDoc = !id;
      const bolsa = ehDoc ? ESTADO.docs : ESTADO.registros;
      ESTADO.rev++;
      if (r.antes === null || r.antes === undefined) {
        bolsa[r.alvo] = { col: r.col, id, dado: null, apagado: true, rev: ESTADO.rev,
                          por: eu.id, porNome: eu.nome, em: new Date().toISOString() };
      } else {
        bolsa[r.alvo] = { col: r.col, id, dado: r.antes, rev: ESTADO.rev,
                          por: eu.id, porNome: eu.nome, em: new Date().toISOString() };
      }
      salvar();
      return true;
    }
  });

  /* — contas (só quem é admin) — */
  app.get('/equipe/contas', exigeLogin, exigeAdmin, (_req, res) => {
    res.json({ ok: true, contas: CONTAS.usuarios.map(limpo) });
  });
  app.post('/equipe/contas', exigeLogin, exigeAdmin, (req, res) => {
    const { id, nome, email, papel, cargo, senha, ativo } = req.body || {};
    let u = id ? CONTAS.usuarios.find(x => x.id === id) : null;
    if (!u) {
      if (!email || !senha) return res.status(400).json({ ok: false, erro: 'faltam_dados' });
      if (CONTAS.usuarios.some(x => x.email === String(email).toLowerCase()))
        return res.status(409).json({ ok: false, erro: 'email_repetido' });
      if (String(senha).length < 8) return res.status(400).json({ ok: false, erro: 'senha_curta' });
      const { sal, hash } = hashSenha(senha);
      u = { id: 'u' + (CONTAS.seq++), nome: nome || email, email: String(email).toLowerCase(),
        papel: papel || 'colaborador', cargo: cargo || '', sal, hash, ativo: true, criadoEm: new Date().toISOString() };
      CONTAS.usuarios.push(u);
    } else {
      if (nome !== undefined) u.nome = nome;
      if (papel !== undefined) u.papel = papel;
      if (cargo !== undefined) u.cargo = cargo;
      if (ativo !== undefined) {
        u.ativo = !!ativo;
        // desligou: derruba as sessões abertas dessa pessoa na hora
        if (!u.ativo) Object.keys(CONTAS.sessoes).forEach(t => { if (CONTAS.sessoes[t].uid === u.id) delete CONTAS.sessoes[t]; });
      }
      if (senha) {
        if (String(senha).length < 8) return res.status(400).json({ ok: false, erro: 'senha_curta' });
        const { sal, hash } = hashSenha(senha); u.sal = sal; u.hash = hash;
      }
    }
    salvarAgora();
    res.json({ ok: true, conta: limpo(u) });
  });

  console.log('[equipe] pronto, ' + CONTAS.usuarios.length + ' conta(s), versão ' + ESTADO.rev);
}

/** Tudo o que mudou depois de `desde`. */
function desdeRev(desde) {
  const out = [];
  const junta = (bolsa, ehDoc) => {
    Object.keys(bolsa).forEach(k => {
      const r = bolsa[k];
      if (Number(r.rev) <= desde) return;
      out.push({ col: r.col, id: ehDoc ? null : r.id, dado: r.dado, apagado: !!r.apagado,
        rev: r.rev, por: r.por, porNome: r.porNome || '', em: r.em });
    });
  };
  junta(ESTADO.registros, false);
  junta(ESTADO.docs, true);
  return out.sort((a, b) => a.rev - b.rev);
}
function pega(obj, caminho) {
  return String(caminho).split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}
function recorta(obj, caminhos) {
  const out = {};
  caminhos.slice(0, 12).forEach(c => { out[c] = pega(obj, c); });
  return out;
}

/* Outros módulos precisam saber quem é a pessoa por trás do token sem
   reimplementar o login. Uma função, um lugar: se a regra de sessão
   mudar, muda aqui e vale para todos. */
function sessao(token) {
  const s = CONTAS.sessoes[token];
  if (!s) return null;
  const u = CONTAS.usuarios.find(x => x.id === s.uid && x.ativo !== false);
  if (!u) return null;
  s.ultimoEm = new Date().toISOString();
  return u;
}

module.exports = { montar, sessao, _interno: { aplicarRemendo, hashSenha, senhaConfere, APAGAR, ehApagar } };
