/* =====================================================================
   Minha semana  ·  o que vence, o que atrasou e quem está esperando

   Três decisões explicam quase tudo neste arquivo:

   1. Os blocos estão na ordem em que doem, não na ordem em que o
      trabalho acontece. Prazo vencido vem antes da devolutiva, a
      devolutiva vem antes do que ainda dá tempo, e o que já está pronto
      vem depois de tudo. Quem abre esta tela na segunda de manhã tem uma
      hora, não o dia inteiro, e a primeira coisa que ela lê precisa ser a
      que custa mais caro se ficar mais uma semana parada.

   2. Uma entrega aparece em um bloco só, no primeiro que a reivindica. A
      mesma linha em dois lugares faz a pessoa trabalhar duas vezes no que
      já resolveu. Por isso "esperando o cliente" reivindica antes de
      "vence esta semana", mesmo aparecendo depois na tela: entrega que
      está com o cliente não se escreve, se cobra, e são providências
      opostas.

   3. Aqui não entra gráfico. Gráfico responde "como estamos"; esta tela
      responde "o que eu faço agora", e isso é linha com nome de cliente,
      quanto falta de checklist e um clique que abre a Mesa da entrega.
   ===================================================================== */

// Três dias é onde "estou esperando o cliente" deixa de ser espera e vira
// silêncio nosso: passou disso, quem tem que agir de novo é a casa.
const SEMANA_ESPERA = 3;

// Sessenta dias depois do produto pronto a pessoa já apresentou, ou já
// desistiu de apresentar. Antes disso a pergunta é cedo, depois disso a
// resposta esfriou.
const SEMANA_COLHEITA = 60;

// Estado da tela. Some quando a página recarrega, e é para sumir: o que
// precisa durar está em iqv_projetos e em iqv_leituras.
const SEMANA = {
  pessoa: 'eu',     // 'eu' | 'todas' | id de uma pessoa
  recado: null,     // { tom, titulo, texto }
};

const SEMANA_VEREDITOS = [
  { k: 'seguir',  nome: 'Seguir',              eti: 'eti-ok' },
  { k: 'esperar', nome: 'Esperar',             eti: 'eti-atencao' },
  { k: 'fora',    nome: 'Não é para o método',  eti: 'eti-neutra' },
];

// A quarta resposta existe para a linha poder sair da lista sem mentir:
// "não respondeu" é uma resposta, "sem resposta" ainda não é.
const SEMANA_RESPOSTAS = [
  { k: '',         nome: 'sem resposta' },
  { k: 'sim',      nome: 'sim' },
  { k: 'nao',      nome: 'não' },
  { k: 'silencio', nome: 'não respondeu' },
];

const SEMANA_DIAS_NOME = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira',
                          'quinta-feira', 'sexta-feira', 'sábado'];

/* ---------------------------------------------------------------------
   1. Datas.

   Prazo e produto pronto são datas sem hora, e o hoje() da base é UTC.
   No fuso daqui isso vira dia novo às 21h: uma entrega que vence amanhã
   apareceria como atrasada no fim da tarde de hoje. Por isso data sem
   hora se compara como texto, com um hoje calculado no relógio de quem
   está olhando. Carimbo com hora (envio, aprovação, assinatura) continua
   nas peças da base, que já sabem ler o formato do banco.
   --------------------------------------------------------------------- */

function semanaIso(d) {
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

function semanaHojeLocal() { return semanaIso(new Date()); }

// O domingo que fecha esta semana. Domingo abre e fecha no mesmo dia.
function semanaDomingo() {
  const d = new Date();
  const dia = d.getDay();
  d.setDate(d.getDate() + (dia === 0 ? 0 : 7 - dia));
  return semanaIso(d);
}

function semanaMeiaNoite(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  if (!m) return null;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

// Dias inteiros de uma data sem hora até outra. Positivo quer dizer que a
// segunda vem depois.
function semanaDiasEntre(a, b) {
  const pa = semanaMeiaNoite(a), pb = semanaMeiaNoite(b);
  if (pa === null || pb === null) return null;
  return Math.round((pb - pa) / 86400000);
}

function semanaDia(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  return m ? m[3] + '/' + m[2] : 'sem data';
}

function semanaDiaRotulo(iso) {
  const hojeL = semanaHojeLocal();
  const falta = semanaDiasEntre(hojeL, iso);
  if (falta === 0) return 'Hoje, ' + semanaDia(iso);
  if (falta === 1) return 'Amanhã, ' + semanaDia(iso);
  const p = semanaMeiaNoite(iso);
  if (p === null) return 'Sem prazo escrito';
  const nome = SEMANA_DIAS_NOME[new Date(p).getUTCDay()];
  return nome.charAt(0).toUpperCase() + nome.slice(1) + ', ' + semanaDia(iso);
}

// A devolutiva se mede em horas porque é isso que a pessoa do outro lado
// está contando. Depois de dois dias a hora perde a graça e vira dia.
function semanaRelogio(v) {
  const d = data(v);
  if (!d) return 'sem data de assinatura';
  const h = Math.max(0, Math.floor((Date.now() - d.getTime()) / 3600000));
  if (h < 1) return 'assinada há menos de uma hora';
  if (h < 48) return 'assinada há ' + h + (h === 1 ? ' hora' : ' horas');
  return 'assinada há ' + Math.floor(h / 24) + ' dias';
}

function semanaHoras(v) {
  const d = data(v);
  if (!d) return null;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / 3600000));
}

/* ---------------------------------------------------------------------
   2. Leitura dos dados. Nada nesta parte grava.
   --------------------------------------------------------------------- */

function semanaProjetos() { const l = iqvLer(CHAVES.projetos, []); return Array.isArray(l) ? l : []; }
function semanaLeituras() { const l = iqvLer(CHAVES.leituras, []); return Array.isArray(l) ? l : []; }

// O preço e o escopo dos níveis podem ter sido editados em Roteiros e
// níveis. O que vale é o de lá, não o que o código trouxe de fábrica.
function semanaNiveis() {
  const m = iqvLer(CHAVES.metodo, null);
  return (m && Array.isArray(m.niveis) && m.niveis.length) ? m.niveis : NIVEIS_DEFAULT;
}

function semanaNomeNivel(k) {
  const n = porChave(semanaNiveis(), String(k || ''));
  return n ? n.nome : 'sem nível contratado';
}

function semanaDentroDoNivel(p, k) {
  const n = porChave(semanaNiveis(), String(p.nivelContratado || ''));
  return !!(n && (n.escopo || []).indexOf(k) >= 0);
}

// As oito, sempre na ordem da landing. O noEscopo mora dentro da entrega
// porque é o escopo daquele contrato, congelado no dia do aceite; projeto
// gravado antes disso cai no escopo do nível, que é a melhor aproximação
// que existe.
function semanaOito(p) {
  const guardadas = Array.isArray(p.entregas) ? p.entregas : [];
  return ENTREGAS.map(function (def) {
    const g = guardadas.find(function (x) { return x && x.k === def.k; }) || null;
    return {
      k: def.k, n: def.n, nome: def.nome, fase: def.fase,
      dentro: (g && typeof g.noEscopo === 'boolean') ? g.noEscopo : semanaDentroDoNivel(p, def.k),
      estado: (g && g.estado) || 'nao_comecou',
      prazo: (g && g.prazo) || null,
      responsavelId: (g && g.responsavelId) || p.responsavelId || null,
      checklist: (g && Array.isArray(g.checklist)) ? g.checklist : [],
      enviadaEm: (g && g.enviadaEm) || null,
      aprovadaEm: (g && g.aprovadaEm) || null,
    };
  });
}

function semanaEmEscopo(oito) { return oito.filter(function (e) { return e.dentro; }); }

// A fase é a primeira que ainda tem entrega contratada sem aprovação do
// cliente. Nenhum outro caminho muda este número, aqui ou em qualquer
// outra tela.
function semanaFase(oito) {
  for (let n = 1; n <= 4; n++) {
    const daFase = semanaEmEscopo(oito).filter(function (e) { return e.fase === n; });
    if (daFase.some(function (e) { return e.estado !== 'aprovada'; })) return n;
  }
  return 4;
}

function semanaTudoAprovado(oito) {
  const dentro = semanaEmEscopo(oito);
  return dentro.length > 0 && dentro.every(function (e) { return e.estado === 'aprovada'; });
}

function semanaExtremo(datas, maior) {
  let escolhida = null, melhor = null;
  (datas || []).forEach(function (v) {
    const d = data(v);
    if (!d) return;
    const t = d.getTime();
    if (melhor === null || (maior ? t > melhor : t < melhor)) { melhor = t; escolhida = v; }
  });
  return escolhida;
}

// De quem é a bola sai do estado das entregas, não de um campo que alguém
// lembrou de virar: entrega com o cliente é bola do cliente, sempre.
function semanaBola(p, oito) {
  const dentro = semanaEmEscopo(oito);
  const esperando = dentro.filter(function (e) { return e.estado === 'com_cliente'; });
  const lado = esperando.length ? 'cliente' : 'casa';
  const guardado = p.bola || {};
  let desde = (guardado.lado === lado && guardado.desde) ? guardado.desde : null;
  if (!desde && lado === 'cliente') desde = semanaExtremo(esperando.map(function (e) { return e.enviadaEm; }), false);
  if (!desde && lado === 'casa') desde = semanaExtremo(dentro.map(function (e) { return e.aprovadaEm; }), true);
  if (!desde) desde = guardado.desde || p.inicio || null;
  const dias = desde ? Math.max(0, diasDesde(desde) || 0) : null;
  return { lado: lado, desde: desde, dias: dias };
}

function semanaPronto(e) {
  const lista = (e && e.checklist) || [];
  const feitos = lista.filter(function (i) { return i && i.feito; }).length;
  return { total: lista.length, feitos: feitos, faltam: lista.length - feitos };
}

function semanaFicha(p) {
  const oito = semanaOito(p);
  return {
    p: p, oito: oito,
    fase: semanaFase(oito),
    bola: semanaBola(p, oito),
    tudoAprovado: semanaTudoAprovado(oito),
    entregueEm: semanaExtremo(semanaEmEscopo(oito).map(function (e) { return e.aprovadaEm; }), true) || p.produtoProntoEm || null,
  };
}

function semanaCliente(p) { return p.cliente || p.rotulo || 'sem nome escrito'; }
function semanaPrimeiro(nome) { return String(nome || '').trim().split(/\s+/)[0] || 'você'; }

function semanaPessoas() {
  return usuarios().filter(function (u) { return u && u.ativo !== false && u.papel !== 'cliente'; });
}

function semanaNomePessoa(id) {
  if (!id) return 'sem responsável';
  const u = usuarios().find(function (x) { return String(x.id) === String(id); });
  return u ? (u.nome || u.email || 'sem nome') : 'pessoa que saiu da casa';
}

function semanaMeuId() {
  const u = acharUsuario(EU.email);
  return u ? u.id : null;
}

// Quem é o alvo da semana. Sem uma pessoa com o meu e-mail em iqv_usuarios
// não dá para saber o que é meu, e o menor dos males é mostrar a casa
// inteira com o aviso do lado, em vez de uma tela vazia sem motivo.
function semanaAlvo() {
  if (SEMANA.pessoa === 'todas') return { modo: 'todas', id: null, nome: 'a casa' };
  if (SEMANA.pessoa === 'eu') {
    const meu = semanaMeuId();
    if (!meu) return { modo: 'todas', id: null, nome: 'a casa', semFicha: true };
    return { modo: 'eu', id: meu, nome: EU.nome || EU.email || 'você' };
  }
  const u = usuarios().find(function (x) { return String(x.id) === String(SEMANA.pessoa); });
  if (!u) return { modo: 'todas', id: null, nome: 'a casa' };
  return { modo: 'pessoa', id: u.id, nome: u.nome || u.email || 'sem nome' };
}

/* ---------------------------------------------------------------------
   3. A conta da semana.

   Uma passada só por todos os projetos, e cada entrega cai no primeiro
   bloco que a reivindica.
   --------------------------------------------------------------------- */
function semanaJuntar() {
  const alvo = semanaAlvo();
  const hojeL = semanaHojeLocal();
  const fim = semanaDomingo();
  const fichas = semanaProjetos().map(semanaFicha);

  const d = {
    alvo: alvo, hoje: hojeL, fim: fim, temProjeto: fichas.length > 0,
    atrasadas: [], devolutivas: [], vence: [], esperando: [], prontas: [], colher: [],
    orfas: 0, indicaram: 0, proxima: null,
  };

  const usadas = {};
  function livre(f, e) { return !usadas[f.p.id + '|' + e.k]; }
  function marcar(f, e) { usadas[f.p.id + '|' + e.k] = true; }

  const abertas = [];
  fichas.forEach(function (f) {
    semanaEmEscopo(f.oito).forEach(function (e) {
      if (e.estado === 'aprovada') return;
      const dono = e.responsavelId || null;
      // Entrega sem responsável não é de ninguém, e some da semana de
      // todo mundo. Isso vira aviso em vez de sumiço calado.
      if (!dono && alvo.modo !== 'todas') { d.orfas++; return; }
      if (alvo.modo !== 'todas' && String(dono) !== String(alvo.id)) return;
      abertas.push({ f: f, e: e });
    });
  });

  // 1. Atrasadas. Prazo vencido e ainda não aprovada, esteja com quem
  // estiver: atraso é atraso, e a coluna da bola diz se é escrever ou
  // cobrar.
  abertas.forEach(function (it) {
    if (!it.e.prazo || it.e.prazo >= hojeL) return;
    marcar(it.f, it.e);
    d.atrasadas.push({ f: it.f, e: it.e, dias: semanaDiasEntre(it.e.prazo, hojeL) });
  });
  d.atrasadas.sort(function (a, b) { return (b.dias || 0) - (a.dias || 0); });

  // 2. Esperando o cliente. Reivindica antes de "vence esta semana" de
  // propósito: não dá para escrever o que está na mão do outro.
  abertas.forEach(function (it) {
    if (!livre(it.f, it.e) || it.e.estado !== 'com_cliente') return;
    const desde = it.e.enviadaEm || it.f.bola.desde;
    const dias = desde ? diasDesde(desde) : null;
    if (dias === null || dias <= SEMANA_ESPERA) return;
    marcar(it.f, it.e);
    d.esperando.push({ f: it.f, e: it.e, desde: desde, dias: dias });
  });
  d.esperando.sort(function (a, b) { return b.dias - a.dias; });

  // 3. Pronto para enviar. Definição de pronto fechada e a entrega ainda
  // não saiu daqui.
  abertas.forEach(function (it) {
    if (!livre(it.f, it.e)) return;
    if (it.e.estado !== 'nao_comecou' && it.e.estado !== 'escrevendo') return;
    const pr = semanaPronto(it.e);
    if (!pr.total || pr.feitos !== pr.total) return;
    marcar(it.f, it.e);
    d.prontas.push({ f: it.f, e: it.e });
  });
  d.prontas.sort(function (a, b) { return String(a.e.prazo || '9999').localeCompare(String(b.e.prazo || '9999')); });

  // 4. Vence esta semana, de hoje até domingo.
  abertas.forEach(function (it) {
    if (!livre(it.f, it.e) || !it.e.prazo) return;
    if (it.e.prazo < hojeL || it.e.prazo > fim) return;
    marcar(it.f, it.e);
    d.vence.push({ f: it.f, e: it.e });
  });
  d.vence.sort(function (a, b) {
    if (a.e.prazo !== b.e.prazo) return a.e.prazo < b.e.prazo ? -1 : 1;
    return a.e.n - b.e.n;
  });

  // 5. Devolutiva pendente. Não entra no filtro de pessoa: enquanto ela
  // não sai, é promessa da casa, e a landing promete retornar com a
  // leitura do caso para quem contou a ideia.
  semanaLeituras().forEach(function (l) {
    if (!l || !l.assinadaEm) return;
    if (l.devolutiva && l.devolutiva.enviadaEm) return;
    d.devolutivas.push(l);
  });
  d.devolutivas.sort(function (a, b) { return String(a.assinadaEm).localeCompare(String(b.assinadaEm)); });

  // 6. Colher em 60 dias.
  fichas.forEach(function (f) {
    if (!f.tudoAprovado || !f.entregueEm) return;
    if (alvo.modo !== 'todas' && String(f.p.responsavelId || '') !== String(alvo.id)) return;
    const c = f.p.colheita || {};
    if (c.indicou === 'sim') d.indicaram++;
    const dias = diasDesde(f.entregueEm);
    if (dias === null) return;
    if (c.apresentou && c.vendeu && c.indicou) return;
    if (dias < SEMANA_COLHEITA) {
      const faltam = SEMANA_COLHEITA - dias;
      if (!d.proxima || faltam < d.proxima.faltam) d.proxima = { f: f, faltam: faltam };
      return;
    }
    d.colher.push({ f: f, dias: dias, c: c });
  });
  d.colher.sort(function (a, b) { return b.dias - a.dias; });

  return d;
}

/* ---------------------------------------------------------------------
   4. Pedaços de tela.
   --------------------------------------------------------------------- */

function semanaArg(v) {
  return "'" + String(v === null || v === undefined ? '' : v).replace(/[\\']/g, '') + "'";
}

function semanaIdCampo(prefixo, a, b) {
  return 'semana-' + prefixo + '-' + String(a).replace(/[^a-zA-Z0-9]/g, '') + '-' + String(b || '').replace(/[^a-zA-Z0-9]/g, '');
}

function semanaCartaoBloco(titulo, n, tom, dor, corpo) {
  return '<div class="cartao">' +
    '<div class="cartao-t">' + esc(titulo) +
      '<span class="eti ' + tom + '" style="margin-left:auto">' + n + '</span></div>' +
    (dor ? '<p class="dica" style="margin:-8px 0 15px;max-width:88ch">' + dor + '</p>' : '') +
    corpo + '</div>';
}

function semanaTabela(colunas, linhas) {
  return '<div class="rolo-h"><table class="lista"><thead><tr>' +
    colunas.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') +
    '</tr></thead><tbody>' + linhas + '</tbody></table></div>';
}

function semanaCelulaPronto(pr) {
  if (!pr.total) {
    return '<span class="eti eti-neutra">sem checklist</span>' +
      '<div class="dica">nasceu sem definição de pronto</div>';
  }
  if (pr.faltam === 0) {
    return '<span class="eti eti-ok">fechada</span>' +
      '<div class="dica">' + pr.total + ' de ' + pr.total + ' marcados</div>';
  }
  return '<span class="eti eti-info">faltam ' + pr.faltam + '</span>' +
    '<div class="dica">' + pr.feitos + ' de ' + pr.total + ' marcados</div>';
}

function semanaCelulaBola(b) {
  const quanto = b.dias === null ? 'sem data de parada' : (b.dias === 0 ? 'desde hoje' : 'há ' + b.dias + (b.dias === 1 ? ' dia' : ' dias'));
  if (b.lado === 'cliente') {
    return '<span class="eti eti-atencao">Com o cliente</span><div class="dica">' + esc(quanto) + '</div>';
  }
  return '<span class="eti eti-info">Com a gente</span><div class="dica">' + esc(quanto) + '</div>';
}

function semanaColunasEntrega(extras) {
  const base = ['Entrega', 'Cliente', 'Fase do projeto', 'Definição de pronto', 'Bola'];
  const fim = SEMANA.pessoa === 'todas' ? ['Responsável'] : [];
  return base.concat(extras || []).concat(fim);
}

function semanaLinhaEntrega(f, e, extras) {
  const p = f.p;
  return '<tr style="cursor:pointer" title="Abrir na Mesa da entrega" ' +
    'onclick="semanaAbrir(' + semanaArg(p.id) + ',' + semanaArg(e.k) + ')">' +
    '<td><b style="color:var(--o-lt)">' + esc(e.nome) + '</b>' +
      '<div class="dica">entrega ' + e.n + ' de 8, ' + esc(etiquetaEstadoTexto(e.estado)) + '</div></td>' +
    '<td>' + esc(semanaCliente(p)) + '<div class="dica">' + esc(semanaNomeNivel(p.nivelContratado)) + '</div></td>' +
    '<td>' + esc('Fase ' + f.fase + ', ' + nomeFase(f.fase)) +
      '<div class="dica">' + esc('etapa ' + (p.etapa || 1) + ', ' + nomeEtapa(p.etapa || 1)) + '</div></td>' +
    '<td>' + semanaCelulaPronto(semanaPronto(e)) + '</td>' +
    '<td>' + semanaCelulaBola(f.bola) + '</td>' +
    (extras || '') +
    (SEMANA.pessoa === 'todas' ? '<td>' + esc(semanaNomePessoa(e.responsavelId)) + '</td>' : '') +
    '</tr>';
}

// O nome do estado da entrega em texto corrido, para caber na linha de
// baixo do nome sem virar uma segunda etiqueta na mesma célula.
function etiquetaEstadoTexto(k) {
  const e = porChave(ESTADOS_ENTREGA, k);
  return e ? e.nome.toLowerCase() : 'sem estado';
}

function semanaCabecalhoDia(iso, colunas) {
  return '<tr><td colspan="' + colunas + '" style="padding:18px 13px 6px;font-size:10px;' +
    'letter-spacing:.12em;text-transform:uppercase;color:var(--tx-4);font-weight:700">' +
    esc(semanaDiaRotulo(iso)) + '</td></tr>';
}

// Texto pronto para cobrar. Existe escrito aqui porque cobrar bem exige
// dizer três coisas na mesma frase, e às oito da manhã de segunda ninguém
// escreve as três: o que está parado, desde quando, e que a data do
// produto pronto continua de pé.
function semanaTextoCobranca(f, e, dias) {
  const p = f.p;
  const partes = [];
  partes.push('Oi ' + semanaPrimeiro(semanaCliente(p)) + ', tudo bem?');
  partes.push('A entrega ' + e.nome + ' está com você para validação desde ' + dataCurta(e.enviadaEm) +
    ', são ' + dias + ' dias, e é ela que destrava a ' + nomeFase(e.fase) + ' do seu projeto.');
  partes.push('Consegue olhar nos próximos dois dias e me dizer o que quer ajustar?');
  if (p.produtoProntoEm) {
    partes.push('Combinamos o produto pronto em ' + semanaDia(p.produtoProntoEm) +
      ' e essa data continua de pé, desde que a validação volte esta semana.');
  }
  partes.push('Se preferir, marco 20 minutos e passamos juntos, ponto a ponto.');
  return partes.join(' ');
}

// As três perguntas da colheita. A terceira não é gentileza: é de onde
// vem a próxima aplicação com origem indicação.
function semanaTextoColheita(f, dias) {
  const p = f.p;
  return 'Oi ' + semanaPrimeiro(semanaCliente(p)) + ', tudo bem? ' +
    'Faz ' + dias + ' dias que o seu produto ficou pronto e queria saber três coisas, rápido. ' +
    'Você já apresentou a oferta para alguém? ' +
    'Já vendeu? ' +
    'E conhece alguém com uma experiência parada que valeria a pena conversar? ' +
    'Se lembrar de um nome, me diga que eu falo com a pessoa.';
}

function semanaCaixaTexto(id, texto, rotulo) {
  return '<details onclick="event.stopPropagation()">' +
    '<summary style="cursor:pointer;color:var(--o);font-size:12px;font-weight:600">' + esc(rotulo) + '</summary>' +
    '<div style="margin-top:9px">' +
      '<textarea class="campo campo-sm" id="' + id + '" rows="6" style="width:340px">' + esc(texto) + '</textarea>' +
      '<button class="bt bt-linha bt-sm" style="margin-top:7px" onclick="semanaCopiar(' + semanaArg(id) + ', this)">Copiar</button>' +
    '</div></details>';
}

function semanaSelectResposta(p, campo, valor) {
  return '<select class="campo campo-sm" style="min-width:132px" ' +
    'onchange="semanaColher(' + semanaArg(p.id) + ',' + semanaArg(campo) + ', this.value)">' +
    SEMANA_RESPOSTAS.map(function (r) {
      return '<option value="' + esc(r.k) + '"' + (String(valor || '') === r.k ? ' selected' : '') + '>' + esc(r.nome) + '</option>';
    }).join('') + '</select>';
}

/* ---------------------------------------------------------------------
   5. Os seis blocos.
   --------------------------------------------------------------------- */

function semanaBlocoAtrasadas(d) {
  const cols = semanaColunasEntrega(['Prazo']);
  const linhas = d.atrasadas.map(function (it) {
    const dias = it.dias === null ? 'sem prazo escrito' : 'há ' + it.dias + (it.dias === 1 ? ' dia' : ' dias');
    return semanaLinhaEntrega(it.f, it.e,
      '<td><span class="eti eti-alerta">venceu ' + esc(semanaDia(it.e.prazo)) + '</span>' +
      '<div class="dica">' + esc(dias) + '</div></td>');
  }).join('');
  return semanaCartaoBloco('Atrasadas', d.atrasadas.length, 'eti-alerta',
    'Prazo vencido e a entrega ainda não voltou aprovada pelo cliente.',
    semanaTabela(cols, linhas));
}

function semanaBlocoDevolutivas(d) {
  const cols = ['Aplicação', 'Veredito', 'Nível indicado', 'Relógio', 'Canal', ''];
  const linhas = d.devolutivas.map(function (l) {
    const perfil = porChave(PERFIS, l.perfil);
    const estagio = porChave(ESTAGIOS, l.estagio);
    const ver = porChave(SEMANA_VEREDITOS, l.veredito);
    const h = semanaHoras(l.assinadaEm);
    const tom = h === null ? 'eti-neutra' : h >= 48 ? 'eti-alerta' : h >= 24 ? 'eti-atencao' : 'eti-info';
    const canal = (l.devolutiva && l.devolutiva.canal === 'email') ? 'E-mail' : 'WhatsApp';
    return '<tr style="cursor:pointer" title="Abrir a leitura do caso" ' +
      'onclick="semanaAbrirLeitura(' + semanaArg(l.leadId) + ')">' +
      '<td><b style="color:var(--o-lt)">Aplicação ' + esc(l.leadId) + '</b>' +
        '<div class="dica">' + esc((perfil ? perfil.nome : 'perfil não definido') + ', ' +
          (estagio ? estagio.nome.toLowerCase() : 'estágio não definido')) + '</div></td>' +
      '<td>' + (ver ? '<span class="eti ' + ver.eti + '">' + esc(ver.nome) + '</span>' : '<span class="eti eti-neutra">sem veredito</span>') + '</td>' +
      '<td>' + esc(semanaNomeNivel(l.nivelIndicado)) + '</td>' +
      '<td><span class="eti ' + tom + '">' + esc(semanaRelogio(l.assinadaEm)) + '</span>' +
        '<div class="dica">' + esc('por ' + (l.assinadaPor || 'sem assinatura escrita')) + '</div></td>' +
      '<td>' + esc(canal) + '</td>' +
      '<td><button class="bt bt-linha bt-sm" onclick="event.stopPropagation();semanaAbrirLeitura(' + semanaArg(l.leadId) + ')">Escrever a devolutiva</button></td>' +
      '</tr>';
  }).join('');
  return semanaCartaoBloco('Devolutiva pendente', d.devolutivas.length, 'eti-alerta',
    'Veredito assinado e retorno ainda não enviado, recusa incluída. O relógio anda desde a assinatura, e este bloco aparece para todo mundo.',
    semanaTabela(cols, linhas));
}

function semanaBlocoVence(d) {
  const cols = semanaColunasEntrega(['Vence']);
  let ultimo = null, linhas = '';
  d.vence.forEach(function (it) {
    if (it.e.prazo !== ultimo) { ultimo = it.e.prazo; linhas += semanaCabecalhoDia(it.e.prazo, cols.length); }
    const faltam = semanaDiasEntre(d.hoje, it.e.prazo);
    const quanto = faltam === 0 ? 'vence hoje' : faltam === 1 ? 'vence amanhã' : 'faltam ' + faltam + ' dias';
    linhas += semanaLinhaEntrega(it.f, it.e,
      '<td><span class="eti eti-info">' + esc(semanaDia(it.e.prazo)) + '</span>' +
      '<div class="dica">' + esc(quanto) + '</div></td>');
  });
  return semanaCartaoBloco('Vence esta semana', d.vence.length, 'eti-info',
    'De hoje até domingo, agrupado pelo dia em que vence.',
    semanaTabela(cols, linhas));
}

function semanaBlocoEsperando(d) {
  const cols = semanaColunasEntrega(['Foi para o cliente', 'Cobrança']);
  const linhas = d.esperando.map(function (it) {
    const id = semanaIdCampo('cobranca', it.f.p.id, it.e.k);
    return semanaLinhaEntrega(it.f, it.e,
      '<td>' + esc(dataCurta(it.desde)) + '<div class="dica">' + esc('há ' + it.dias + ' dias') + '</div></td>' +
      '<td onclick="event.stopPropagation()">' + semanaCaixaTexto(id, semanaTextoCobranca(it.f, it.e, it.dias), 'Texto pronto') + '</td>');
  }).join('');
  return semanaCartaoBloco('Esperando o cliente há mais de ' + SEMANA_ESPERA + ' dias', d.esperando.length, 'eti-atencao',
    'O texto já vem montado. Ajuste o que quiser antes de copiar.',
    semanaTabela(cols, linhas));
}

function semanaBlocoProntas(d) {
  const cols = semanaColunasEntrega(['Prazo', '']);
  const linhas = d.prontas.map(function (it) {
    const faltam = it.e.prazo ? semanaDiasEntre(d.hoje, it.e.prazo) : null;
    const quanto = it.e.prazo === null || faltam === null ? 'sem prazo escrito'
      : faltam < 0 ? 'passou há ' + (-faltam) + ' dias'
      : faltam === 0 ? 'vence hoje' : 'faltam ' + faltam + ' dias';
    return semanaLinhaEntrega(it.f, it.e,
      '<td>' + esc(it.e.prazo ? semanaDia(it.e.prazo) : 'sem prazo') + '<div class="dica">' + esc(quanto) + '</div></td>' +
      '<td><button class="bt bt-marca bt-sm" onclick="event.stopPropagation();semanaAbrir(' +
        semanaArg(it.f.p.id) + ',' + semanaArg(it.e.k) + ')">Abrir para enviar</button></td>');
  }).join('');
  return semanaCartaoBloco('Pronto para enviar', d.prontas.length, 'eti-ok',
    'Definição de pronto inteira marcada e a entrega ainda não foi para validação. O envio é na Mesa da entrega.',
    semanaTabela(cols, linhas));
}

function semanaBlocoColher(d) {
  const cols = ['Projeto', 'Produto pronto', 'Apresentou', 'Vendeu', 'Indicaria alguém', 'As três perguntas', ''];
  const linhas = d.colher.map(function (it) {
    const p = it.f.p;
    const id = semanaIdCampo('colheita', p.id, 'texto');
    return '<tr>' +
      '<td><b>' + esc(semanaCliente(p)) + '</b><div class="dica">' + esc(semanaNomeNivel(p.nivelContratado)) + '</div></td>' +
      '<td>' + esc(dataCurta(it.f.entregueEm)) + '<div class="dica">' + esc('há ' + it.dias + ' dias') + '</div></td>' +
      '<td>' + semanaSelectResposta(p, 'apresentou', it.c.apresentou) + '</td>' +
      '<td>' + semanaSelectResposta(p, 'vendeu', it.c.vendeu) + '</td>' +
      '<td>' + semanaSelectResposta(p, 'indicou', it.c.indicou) + '</td>' +
      '<td>' + semanaCaixaTexto(id, semanaTextoColheita(it.f, it.dias), 'Texto pronto') + '</td>' +
      '<td><button class="bt bt-linha bt-sm" onclick="semanaVerCliente(' + semanaArg(p.id) + ')">Ver o que ele vê</button></td>' +
      '</tr>';
  }).join('');
  const rodape = '<p class="dica" style="margin-top:14px">As três respostas preenchidas tiram o projeto desta lista.' +
    (d.indicaram ? ' ' + d.indicaram + (d.indicaram === 1 ? ' pessoa já disse' : ' pessoas já disseram') +
      ' que indicaria alguém: a aplicação que chegar com origem indicação aparece em Ideias que chegaram.' : '') + '</p>';
  return semanaCartaoBloco('Colher em ' + SEMANA_COLHEITA + ' dias', d.colher.length, 'eti-marca',
    'Produto pronto há mais de ' + SEMANA_COLHEITA + ' dias, com as oito entregas do escopo aprovadas.',
    semanaTabela(cols, linhas) + rodape);
}

/* ---------------------------------------------------------------------
   6. A frase de abertura. Número antes da palavra, sempre.
   --------------------------------------------------------------------- */

function semanaNumero(n) { return '<b>' + n + '</b>'; }

function semanaSujeito(n, alvo) {
  if (alvo.modo === 'eu') return n === 1 ? 'entrega sua' : 'entregas suas';
  if (alvo.modo === 'pessoa') return (n === 1 ? 'entrega' : 'entregas') + ' de ' + esc(semanaPrimeiro(alvo.nome));
  return n === 1 ? 'entrega da casa' : 'entregas da casa';
}

function semanaFrase(d) {
  const partes = [];
  let primeira = true;

  if (d.vence.length) {
    const n = d.vence.length;
    partes.push(semanaNumero(n) + ' ' + semanaSujeito(n, d.alvo) + (n === 1 ? ' vence' : ' vencem') + ' esta semana');
    primeira = false;
  }
  if (d.atrasadas.length) {
    const n = d.atrasadas.length;
    partes.push(semanaNumero(n) + (primeira ? ' ' + semanaSujeito(n, d.alvo) : '') + (n === 1 ? ' está atrasada' : ' estão atrasadas'));
    primeira = false;
  }
  if (d.esperando.length) {
    const n = d.esperando.length;
    partes.push(semanaNumero(n) + (primeira ? ' ' + semanaSujeito(n, d.alvo) : '') +
      (n === 1 ? ' espera' : ' esperam') + ' o cliente há mais de ' + SEMANA_ESPERA + ' dias');
    primeira = false;
  }
  if (d.devolutivas.length) {
    const n = d.devolutivas.length;
    partes.push(semanaNumero(n) + (n === 1 ? ' devolutiva assinada ainda não saiu daqui' : ' devolutivas assinadas ainda não saíram daqui'));
    primeira = false;
  }
  if (d.prontas.length && partes.length < 3) {
    const n = d.prontas.length;
    partes.push(semanaNumero(n) + (n === 1 ? ' está pronta para enviar' : ' estão prontas para enviar'));
  }

  if (partes.length) return partes.join(', ') + '.';
  if (!d.temProjeto) return 'Nenhum projeto em estruturação ainda, então a sua semana começa vazia.';
  return 'Nada atrasou, nada vence até domingo, e ninguém está esperando você há mais de ' + SEMANA_ESPERA + ' dias.';
}

/* ---------------------------------------------------------------------
   7. O que a pessoa clica.
   --------------------------------------------------------------------- */

function semanaTrocarPessoa(v) { SEMANA.pessoa = String(v || 'eu'); SEMANA.recado = null; DESENHO.semana(); }

// O roteador desvia calado para a primeira tela permitida quando a pessoa
// não pode ver a de destino, e sair da tela sem entender por quê é pior do
// que não sair. Então a recusa vira recado, no lugar do salto.
function semanaLiberado(chave, comoSeChama) {
  if (EU.pode(chave)) return true;
  SEMANA.recado = { tom: 'atencao', titulo: 'Você não tem acesso a ' + comoSeChama + '.',
    texto: 'O seu papel neste sistema não enxerga essa tela, e por isso o clique não leva a lugar nenhum. Quem libera é a gestão, em A casa.' };
  DESENHO.semana();
  window.scrollTo(0, 0);
  return false;
}

// A Mesa da entrega é outro arquivo, e as duas telas viram um script só no
// final: o recado de qual entrega abrir vai no window, sem declaração,
// que é a mesma combinação usada por Projetos em estruturação.
function semanaAbrir(projetoId, entregaK) {
  if (!semanaLiberado('entrega', 'a Mesa da entrega')) return;
  window.ENTREGA_ABERTA = { projetoId: projetoId, entrega: entregaK };
  window.PROJETO_ABERTO = projetoId;
  irPara('entrega');
}

function semanaAbrirLeitura(leadId) {
  if (!semanaLiberado('leitura', 'a Leitura do caso')) return;
  if (typeof leituraAbrir === 'function') { leituraAbrir(Number(leadId)); return; }
  irPara('leitura');
}

function semanaVerCliente(projetoId) {
  if (!semanaLiberado('cliente', 'a tela Meu projeto')) return;
  window.PROJETO_ABERTO = projetoId;
  irPara('cliente');
}

function semanaIr(chave, comoSeChama) {
  if (!semanaLiberado(chave, comoSeChama)) return;
  irPara(chave);
}

function semanaCopiar(id, botao) {
  const campo = porId(id);
  if (!campo || !botao) return;
  const antes = botao.textContent;
  function avisar(t) {
    botao.textContent = t;
    setTimeout(function () { if (botao) botao.textContent = antes; }, 2200);
  }
  try {
    campo.focus();
    campo.select();
    if (document.execCommand && document.execCommand('copy')) { avisar('Copiado'); return; }
  } catch (e) { /* navegador que recusa a cópia por comando cai no plano de baixo */ }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(campo.value).then(function () { avisar('Copiado'); })
      .catch(function () { avisar('Selecione e copie'); });
    return;
  }
  avisar('Selecione e copie');
}

// A colheita mora dentro do projeto, e não numa lista separada, porque ela
// é atributo daquele projeto: lista à parte seria mais uma coisa para
// manter em pé quando um projeto for apagado.
function semanaColher(projetoId, campo, valor) {
  const lista = semanaProjetos();
  const p = lista.find(function (x) { return String(x.id) === String(projetoId); });
  if (!p) return;
  if (!p.colheita) p.colheita = { apresentou: '', vendeu: '', indicou: '', anotadoEm: null, por: '' };
  p.colheita[campo] = String(valor || '');
  p.colheita.anotadoEm = new Date().toISOString();
  p.colheita.por = String(EU.nome || EU.email || 'sem nome');
  if (!iqvGravar(CHAVES.projetos, lista)) {
    SEMANA.recado = { tom: 'alerta', titulo: 'Não consegui gravar a resposta da colheita.',
      texto: 'O armazenamento deste navegador recusou a escrita, normalmente porque encheu. A tela continua mostrando o que estava gravado antes, e não o que você acabou de marcar. Veja o espaço em A casa antes de mexer em mais alguma coisa.' };
  } else {
    SEMANA.recado = null;
  }
  DESENHO.semana();
}

/* ---------------------------------------------------------------------
   8. O desenho.
   --------------------------------------------------------------------- */

function semanaSeletor(d) {
  // O seletor de pessoa é da Equipe. Colaborador vê a própria semana, e
  // trocar de pessoa ali seria enxergar a mesa de quem não é dele.
  if (EU.papel !== 'gestor') return '';
  const pessoas = semanaPessoas();
  const opcoes = [{ k: 'eu', nome: 'Você' }]
    .concat(pessoas.filter(function (u) { return String(u.id) !== String(semanaMeuId()); })
      .map(function (u) { return { k: u.id, nome: u.nome || u.email }; }))
    .concat([{ k: 'todas', nome: 'A casa inteira' }]);
  return '<div style="min-width:236px;margin-bottom:20px">' +
      '<label class="rotulo" for="semana-quem">Semana de quem</label>' +
      '<select class="campo campo-sm" id="semana-quem" onchange="semanaTrocarPessoa(this.value)">' +
      opcoes.map(function (o) {
        return '<option value="' + esc(o.k) + '"' + (String(SEMANA.pessoa) === String(o.k) ? ' selected' : '') + '>' + esc(o.nome) + '</option>';
      }).join('') + '</select>' +
    '</div>';
}

function semanaRecados(d) {
  let html = '';
  if (SEMANA.recado) html += aviso(SEMANA.recado.tom, esc(SEMANA.recado.titulo), esc(SEMANA.recado.texto));
  if (d.alvo.semFicha) {
    html += aviso('info', 'Nenhuma pessoa deste sistema está com o e-mail ' + esc(EU.email || 'que você usou para entrar') + '.',
      'Sem isso não dá para separar o que é seu, então você está vendo a casa inteira. Quem é gestor acerta isso em "A casa".');
  }
  if (d.orfas) {
    html += aviso('atencao', d.orfas === 1 ? '1 entrega em aberto está sem responsável.' : d.orfas + ' entregas em aberto estão sem responsável.',
      'Sem responsável ela não entra na semana de ninguém. Diga de quem é cada uma em Projetos em estruturação.');
  }
  return html;
}

function semanaEmDia(faltando, d) {
  if (!faltando.length) return '';
  return '<div class="cartao">' +
    '<div class="cartao-t">O que está em dia</div>' +
    faltando.map(function (t) {
      return '<div style="display:flex;align-items:center;gap:11px;padding:8px 0;border-bottom:1px solid var(--fio-2)">' +
        '<span class="eti eti-ok">em dia</span><span class="dica">' + esc(t) + '</span></div>';
    }).join('') + '</div>';
}

function semanaSemProjeto() {
  return '<div class="cartao">' +
    '<div class="cartao-t">Nenhum projeto ainda</div>' +
    '<p class="dica">Ideias que chegaram enche sozinha quando alguém responde o formulário da landing.</p>' +
    '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px">' +
      '<button class="bt bt-marca bt-sm" onclick="semanaIr(' + semanaArg('ideias') + ', ' + semanaArg('Ideias que chegaram') + ')">Ideias que chegaram</button>' +
      '<button class="bt bt-linha bt-sm" onclick="semanaIr(' + semanaArg('roteiros') + ', ' + semanaArg('Roteiros e níveis') + ')">Roteiros e níveis</button>' +
    '</div></div>';
}

DESENHO.semana = function () {
  const d = semanaJuntar();

  texto('semana-periodo', d.hoje === d.fim
    ? 'Hoje, domingo ' + semanaDia(d.hoje)
    : 'Hoje ' + semanaDia(d.hoje) + ', até domingo ' + semanaDia(d.fim));
  escrever('semana-frase', semanaFrase(d));
  escrever('semana-quem-caixa', semanaSeletor(d));
  escrever('semana-recado', semanaRecados(d));

  let corpo = '';
  const faltando = [];

  if (d.atrasadas.length) corpo += semanaBlocoAtrasadas(d);
  else faltando.push('Nenhuma entrega passou do prazo.');

  if (d.devolutivas.length) corpo += semanaBlocoDevolutivas(d);
  else faltando.push('Nenhum veredito assinado está esperando devolutiva.');

  if (d.vence.length) corpo += semanaBlocoVence(d);
  else faltando.push('Nada vence de hoje até domingo.');

  if (d.esperando.length) corpo += semanaBlocoEsperando(d);
  else faltando.push('Ninguém está esperando o cliente há mais de ' + SEMANA_ESPERA + ' dias.');

  if (d.prontas.length) corpo += semanaBlocoProntas(d);
  else faltando.push('Nenhuma entrega está com a definição de pronto fechada esperando envio.');

  if (d.colher.length) corpo += semanaBlocoColher(d);
  else faltando.push('Nenhum projeto completa ' + SEMANA_COLHEITA + ' dias de produto pronto agora.' +
    (d.proxima ? ' O próximo é o de ' + semanaCliente(d.proxima.f.p) + ', em ' + d.proxima.faltam + ' dias.' : ''));

  if (!d.temProjeto) {
    // Sem projeto, dizer "nenhuma entrega passou do prazo" seria verdade
    // inútil: não existe entrega para passar do prazo.
    corpo += semanaSemProjeto();
  } else {
    corpo += semanaEmDia(faltando, d);
  }

  escrever('semana-corpo', corpo);

  // O número no menu conta só o que já está em falta com alguém: prazo
  // vencido e devolutiva prometida. Contar o que ainda vence deixaria o
  // contador aceso a semana toda e ele pararia de querer dizer algo.
  contador('semana', d.atrasadas.length + d.devolutivas.length);
};
