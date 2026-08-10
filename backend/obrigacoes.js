/**
 * OBRIGAÇÕES: o processo cobra sozinho
 * ─────────────────────────────────────────────────────────────────────
 * Nasce de uma frase dela: "eles esquecem de mandar uma confirmação de
 * agenda e controlar frequência de mentoria, imagina um monte de
 * documento baixado e perdido. Não quero ninguém de babá de funcionário."
 *
 * Lista de tarefas não resolve isso. Lista de tarefas é exatamente o que
 * já existe e é esquecida: alguém precisa lembrar de olhar, alguém
 * precisa marcar o quadradinho, e marcar o quadradinho não prova nada.
 *
 * Três diferenças, e são elas que fazem funcionar:
 *
 * 1. A OBRIGAÇÃO NASCE DO PROCESSO, não da memória de alguém. Proposta
 *    aprovada gera "mandar contrato". Mentoria marcada gera "confirmar
 *    24h antes" e "registrar presença depois". Ninguém cria à mão, então
 *    ninguém esquece de criar.
 *
 * 2. QUANDO O SISTEMA CONSEGUE FAZER, ELE FAZ. Confirmação de agenda o
 *    servidor manda sozinho pelo WhatsApp. A obrigação nasce e morre no
 *    mesmo segundo, sem passar por pessoa nenhuma. Só sobra para gente o
 *    que exige gente.
 *
 * 3. TEM VERIFICADOR, não quadradinho. "Feito" é uma coisa que o sistema
 *    consegue conferir: a mensagem saiu para o número do cliente, a
 *    presença foi registrada, o documento foi aberto pelo cliente.
 *    Quadradinho marcado é declaração; verificador é prova.
 *
 * E quando ninguém faz: cobra o dono, depois escala para a direção. A
 * babá é o sistema.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DIR = process.env.DADOS_DIR || path.join(__dirname, 'dados');
const ARQ = path.join(DIR, 'obrigacoes.json');

let O = { itens: [], seq: 1 };
try {
  fs.mkdirSync(DIR, { recursive: true });
  if (fs.existsSync(ARQ)) O = Object.assign(O, JSON.parse(fs.readFileSync(ARQ, 'utf8')));
} catch (e) {}

let adiado = null;
function agora() { if (adiado) { clearTimeout(adiado); adiado = null; }
  try { fs.writeFileSync(ARQ, JSON.stringify(O)); } catch (e) {} }
function salvar() { if (adiado) return; adiado = setTimeout(() => { adiado = null; agora(); }, 300); }
['SIGINT', 'SIGTERM', 'beforeExit'].forEach(ev => process.on(ev, () => {
  agora(); if (ev !== 'beforeExit') process.exit(0);
}));

const H = 3600e3;
function daqui(h) { return new Date(Date.now() + h * H).toISOString(); }
function id() { return 'OBR-' + (O.seq++).toString(36) + crypto.randomBytes(2).toString('hex'); }

/* ═════════════════════════════════════════════════ o catálogo de regras
   O que cada acontecimento da operação obriga. Está tudo num lugar só,
   de propósito: é aqui que a dona muda a política da casa sem mexer em
   código espalhado.

     prazo    em horas, a partir do acontecimento
     sozinho  o servidor cumpre sem pessoa (e a obrigação já nasce feita)
     cobra    quantas horas antes do prazo o dono é lembrado
     escala   horas depois do prazo até virar problema da direção
     prova    como o sistema sabe que foi feito                        */
const REGRAS = {
  'proposta.aprovada': [
    { o: 'Enviar contrato para assinatura', prazo: 24, cobra: 6, escala: 24,
      prova: 'documento.enviado', alvo: 'contrato' }
  ],
  'contrato.assinado': [
    { o: 'Enviar acesso ao portal do cliente', prazo: 4, sozinho: 'portal.acesso',
      prova: 'mensagem.enviada' },
    { o: 'Marcar a reunião de início', prazo: 48, cobra: 12, escala: 24,
      prova: 'agenda.marcada' }
  ],
  'agenda.marcada': [
    /* o caso que ela citou: confirmação que ninguém manda. Agora o
       servidor manda, 24 horas antes, sem pedir licença a ninguém. */
    { o: 'Confirmar a agenda com o cliente', antes: 24, sozinho: 'agenda.confirmar',
      prova: 'mensagem.enviada' },
    { o: 'Registrar a presença', depois: 2, cobra: 0, escala: 12,
      prova: 'presenca.registrada' }
  ],
  'mentoria.marcada': [
    { o: 'Confirmar a sessão', antes: 24, sozinho: 'agenda.confirmar',
      prova: 'mensagem.enviada' },
    /* o outro caso dela: frequência de mentoria que ninguém controla.
       Cada sessão vira uma obrigação de registro, e a falta aparece
       sozinha no painel em vez de depender de alguém somar. */
    { o: 'Registrar presença e o que ficou combinado', depois: 3, cobra: 0, escala: 12,
      prova: 'presenca.registrada' }
  ],
  'entrega.concluida': [
    { o: 'Enviar o laudo para o cliente aprovar', prazo: 12, cobra: 4, escala: 12,
      prova: 'documento.enviado', alvo: 'laudo' }
  ],
  'documento.enviado': [
    { o: 'Cliente abrir o documento', prazo: 72, cobra: 24, escala: 48,
      prova: 'documento.aberto', deQuem: 'cliente' }
  ],

  /* ── seleção ──
     Pedido dela: "receber a comunicação de agenda de entrevista, aprovado
     ou não aprovado". O que dói de verdade não é o aprovado: é o NÃO
     aprovado, que quase nunca é mandado. A pessoa gastou meia hora
     respondendo teste e fica esperando resposta que nunca vem, e isso é
     a empresa queimando a própria marca com quem um dia pode voltar.
     Aqui o retorno é obrigação do processo, e o servidor manda sozinho. */
  'candidato.entrevista': [
    { o: 'Avisar a pessoa da entrevista', prazo: 1, sozinho: 'selecao.entrevista',
      prova: 'mensagem.enviada' },
    { o: 'Lembrar a pessoa da entrevista', antes: 24, sozinho: 'selecao.lembrete',
      prova: 'mensagem.enviada' },
    { o: 'Dar o retorno depois da entrevista', depois: 48, cobra: 12, escala: 48,
      prova: 'selecao.decidida' }
  ],
  'candidato.aprovado': [
    { o: 'Avisar que foi aprovada', prazo: 1, sozinho: 'selecao.aprovado',
      prova: 'mensagem.enviada' },
    { o: 'Enviar o contrato de prestação', prazo: 48, cobra: 12, escala: 24,
      prova: 'documento.enviado', alvo: 'contrato' }
  ],
  'candidato.reprovado': [
    /* prazo de uma hora e feito pelo servidor: é o único jeito de isso
       não depender de alguém ter coragem de dar a notícia */
    { o: 'Avisar que não seguiu desta vez', prazo: 1, sozinho: 'selecao.reprovado',
      prova: 'mensagem.enviada' }
  ]
};

/* ═══════════════════════════════════════════════════════ nascer e morrer */

/**
 * Um acontecimento da operação. `ctx` traz cliente, dono, prazo do
 * evento e o que mais a regra precisar.
 */
function acontecer(evento, ctx, executor) {
  const regras = REGRAS[evento] || [];
  const nascidas = [];
  regras.forEach(r => {
    /* `antes` é relativo ao horário do evento agendado (confirmar 24h
       antes da reunião); `prazo` e `depois` são relativos a agora.

       `quando` pode chegar como texto de gente ("quinta, 14 de agosto,
       às 15h"), e new Date disso é Invalid Date, cujo toISOString
       DERRUBA a requisição inteira. Uma agenda escrita por humano não
       pode matar o motor: sem data legível, a obrigação nasce com prazo
       contado de agora e a pessoa resolve. */
    const marcado = ctx.quando ? new Date(ctx.quando).getTime() : NaN;
    const temData = !isNaN(marcado);
    let vence;
    if (r.antes && temData)       vence = new Date(marcado - r.antes * H).toISOString();
    else if (r.depois && temData) vence = new Date(marcado + r.depois * H).toISOString();
    else if (r.antes && !temData) vence = daqui(r.prazo || 24);
    else if (r.depois && !temData) vence = daqui((r.prazo || 0) + r.depois);
    else vence = daqui(r.prazo || 24);

    const ob = {
      id: id(), em: new Date().toISOString(), evento, o: r.o,
      cliente: ctx.cliente || '', clienteId: ctx.clienteId || '',
      dono: ctx.dono || '', donoId: ctx.donoId || '',
      alvo: r.alvo || ctx.alvo || '', ref: ctx.ref || '',
      vence, prova: r.prova, deQuem: r.deQuem || 'equipe',
      cobra: r.cobra, escala: r.escala,
      estado: 'aberta', feitoEm: null, feitoPor: '', evidencia: '',
      cobrado: false, escalado: false
    };

    /* O que o servidor faz sozinho não deveria aparecer para ninguém.
       Mas há dois tipos de "sozinho", e tratar os dois igual era um
       defeito silencioso:

         SEM HORA MARCADA (prazo)  faz agora. Avisar que foi aprovada,
           mandar o acesso do portal: quanto antes, melhor.

         COM HORA MARCADA (antes)  espera a hora. Confirmar a agenda 24h
           antes só é confirmação se sair 24h antes. Saindo no instante
           em que a reunião foi marcada, três semanas adiantada, não
           confirma nada e a de verdade nunca sai.

       A segunda fica agendada e quem dispara é a varredura. */
    const agendada = r.antes && temData && (new Date(vence).getTime() - Date.now()) > 2 * 60e3;
    /* `antes` sem data legível não tem âncora nenhuma. Disparar agora
       seria mandar o lembrete junto com o convite, que é mensagem
       repetida na cara da pessoa. Então a obrigação nasce aberta para
       gente, dizendo o que falta. */
    const semAncora = r.antes && !temData;
    if (r.sozinho && semAncora) {
      ob.obs = 'A data veio como texto, não como data. Faça na mão ou remarque com dia e hora.';
    } else if (r.sozinho && agendada) {
      ob.sozinho = r.sozinho;
      ob.deQuem = 'sistema';
      /* só o que o executor precisa, e nada além: guardar o ctx inteiro
         seria copiar dado de cliente para dentro da fila de tarefas */
      ob.ctx = { telefone: ctx.telefone || '', nome: ctx.nome || '', quando: ctx.quando || '',
                 porExtenso: ctx.porExtenso || '', titulo: ctx.titulo || '',
                 link: ctx.link || '', assina: ctx.assina || '' };
    } else if (r.sozinho && executor) {
      try {
        const ev = executor(r.sozinho, ob, ctx);
        if (ev) { ob.estado = 'feita'; ob.feitoEm = new Date().toISOString();
                  ob.feitoPor = 'sistema'; ob.evidencia = String(ev).slice(0, 200); }
      } catch (e) { ob.erro = String(e.message || e); }
    }
    O.itens.unshift(ob);
    nascidas.push(ob);
  });
  if (nascidas.length) salvar();
  return nascidas;
}

/**
 * A prova chegou. Fecha toda obrigação que esperava exatamente isto.
 * Repare que ninguém "marca como feito": o sistema reconhece.
 */
function provar(prova, ctx) {
  const fechadas = [];
  O.itens.forEach(ob => {
    /* 'vencida' entra junto com 'aberta', e o motivo é importante:
       atraso não impede cumprir. A primeira versão só fechava o que
       estava em dia, então provar uma presença de ontem não fechava
       nada e a pessoa ficava devendo para sempre uma coisa que fez.
       Cumprir atrasado é justamente o que mais precisa ficar
       registrado, e por isso fica marcado como atrasada. */
    if ((ob.estado !== 'aberta' && ob.estado !== 'vencida') || ob.prova !== prova) return;
    if (ctx.ref && ob.ref && ob.ref !== ctx.ref) return;
    if (ctx.clienteId && ob.clienteId && ob.clienteId !== ctx.clienteId) return;
    ob.atrasada = ob.estado === 'vencida';
    ob.estado = 'feita'; ob.feitoEm = new Date().toISOString();
    ob.feitoPor = ctx.por || 'sistema';
    ob.evidencia = String(ctx.evidencia || prova).slice(0, 200);
    fechadas.push(ob);
  });
  if (fechadas.length) salvar();
  return fechadas;
}

/**
 * A varredura. Roda de tempos em tempos e faz o papel que hoje é de
 * alguém lembrar: cobra quem tem a bola e escala o que passou do ponto.
 */
function varrer(avisar, executor) {
  const t = Date.now();
  const saida = { cobrados: [], escalados: [], vencidas: 0, disparados: [] };
  O.itens.forEach(ob => {
    if (ob.estado !== 'aberta') return;
    const venceEm = new Date(ob.vence).getTime();

    /* a hora chegou: o servidor faz o que ficou agendado. É aqui que a
       confirmação de 24 horas antes realmente sai. */
    if (ob.sozinho && executor && t >= venceEm) {
      try {
        const ev = executor(ob.sozinho, ob, ob.ctx || {});
        if (ev) {
          ob.estado = 'feita'; ob.feitoEm = new Date().toISOString();
          ob.feitoPor = 'sistema'; ob.evidencia = String(ev).slice(0, 200);
          saida.disparados.push(ob);
          return;
        }
      } catch (e) { ob.erro = String(e.message || e); }
    }

    if (t > venceEm) ob.estado = 'vencida';
    if (ob.estado === 'vencida') saida.vencidas++;

    if (!ob.cobrado && ob.cobra !== undefined && t > venceEm - ob.cobra * H) {
      ob.cobrado = true; saida.cobrados.push(ob);
      if (avisar) avisar('cobrar', ob);
    }
    if (!ob.escalado && ob.escala !== undefined && t > venceEm + ob.escala * H) {
      ob.escalado = true; saida.escalados.push(ob);
      if (avisar) avisar('escalar', ob);
    }
  });
  if (saida.cobrados.length || saida.escalados.length || saida.vencidas || saida.disparados.length) salvar();
  return saida;
}

/* O painel: o que está em aberto, atrasado e escalado, por pessoa. */
function painel(donoId) {
  const meus = donoId ? O.itens.filter(x => x.donoId === donoId) : O.itens;
  const abertas = meus.filter(x => x.estado === 'aberta');
  const vencidas = meus.filter(x => x.estado === 'vencida');
  return {
    abertas: abertas.length, vencidas: vencidas.length,
    escaladas: meus.filter(x => x.escalado && x.estado !== 'feita').length,
    feitasPeloSistema: meus.filter(x => x.feitoPor === 'sistema').length,
    feitasComAtraso: meus.filter(x => x.atrasada).length,
    lista: vencidas.concat(abertas).slice(0, 120)
  };
}

/* Frequência: o que ela pediu para "controlar frequência de mentoria".
   Sai de graça, porque cada sessão já virou uma obrigação de registro. */
function frequencia(clienteId) {
  const s = O.itens.filter(x => x.prova === 'presenca.registrada'
    && (!clienteId || x.clienteId === clienteId));
  const total = s.length, presentes = s.filter(x => x.estado === 'feita').length;
  return { sessoes: total, registradas: presentes, faltando: total - presentes,
           taxa: total ? Math.round(presentes / total * 100) : null };
}

function montar(app, dep) {
  const { exigeLogin, exigeAdmin } = dep;

  app.get('/obrigacoes', exigeLogin, (req, res) => {
    const quem = req.eu.papel === 'admin' ? (req.query.dono || '') : req.eu.id;
    res.json({ ok: true, painel: painel(quem) });
  });

  app.get('/obrigacoes/frequencia', exigeLogin, (req, res) => {
    res.json({ ok: true, frequencia: frequencia(req.query.cliente || '') });
  });

  /* A operação avisa que algo aconteceu. Quem chama é o sistema, não
     uma pessoa: por isso não há rota para "criar obrigação à mão". */
  app.post('/obrigacoes/evento', exigeLogin, (req, res) => {
    const { evento, ctx } = req.body || {};
    if (!REGRAS[evento]) return res.status(400).json({ ok: false, erro: 'evento_desconhecido',
                                                       conhecidos: Object.keys(REGRAS) });
    const n = acontecer(evento, Object.assign({ dono: req.eu.nome, donoId: req.eu.id }, ctx || {}),
                        dep.executor);
    res.json({ ok: true, nascidas: n });
  });

  app.post('/obrigacoes/prova', exigeLogin, (req, res) => {
    const { prova, ctx } = req.body || {};
    if (!prova) return res.status(400).json({ ok: false, erro: 'prova_obrigatoria' });
    const f = provar(prova, Object.assign({ por: req.eu.nome }, ctx || {}));
    res.json({ ok: true, fechadas: f.length, obrigacoes: f });
  });

  app.get('/obrigacoes/varrer', exigeLogin, exigeAdmin, (_req, res) => {
    res.json({ ok: true, resultado: varrer(dep.avisar) });
  });
}

module.exports = { montar, acontecer, provar, varrer, painel, frequencia, REGRAS };
