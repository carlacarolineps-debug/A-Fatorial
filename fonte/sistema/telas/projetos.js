/* =====================================================================
   Projetos em estruturação  ·  em que fase está cada projeto

   Três decisões explicam quase tudo neste arquivo:

   1. A fase é calculada, nunca arrastada. A Fase 02 vira quando as
      entregas da Fase 02 que entram no nível contratado estão aprovadas
      pelo cliente, e ponto. O campo fase gravado no projeto é tratado
      como "o que está no papel": quando ele discorda das aprovações, a
      tela mostra os dois lados e oferece acertar o papel. Sem isso,
      trocar de fase viraria opinião de quem mexeu por último, e o cliente
      ouviria "estamos na validação" enquanto o posicionamento dele ainda
      não voltou aprovado.

   2. A ordem padrão é por tempo de silêncio. Ordenar por valor colocaria
      o Premium assinado ontem na frente do Start parado há três semanas,
      e é o segundo que está queimando a confiança da casa.

   3. De quem é a bola vem antes de qualquer outra coisa no cartão. Parada
      nossa e parada do cliente pedem providências opostas: uma é sentar e
      escrever, a outra é cobrar. Quem abre a tela na segunda de manhã
      precisa separar as duas antes de ler qualquer número.
   ===================================================================== */

// Silêncio a partir daqui vira alarme. Dez dias é o ponto em que o
// cliente para de esperar e começa a perguntar no WhatsApp.
const PROJETOS_PARADO = 10;

// Retrato mais velho que isto quer dizer cliente lendo notícia vencida na
// tela Meu projeto, que é a única coisa que ele enxerga daqui de dentro.
const PROJETOS_RETRATO_VELHO = 7;

// Acima disto a mesa de uma pessoa está cheia. Não é regra de sistema, é
// o número que a casa usa para decidir se assina mais um veredito.
const PROJETOS_MESA_CHEIA = 8;

const PROJETOS_MOSTRAR = [
  { k: 'todos',   nome: 'Todos os projetos' },
  { k: 'parados', nome: 'Só os parados há mais de 10 dias' },
  { k: 'alarme',  nome: 'Só os que têm alarme' },
  { k: 'cliente', nome: 'Só os que esperam o cliente' },
  { k: 'casa',    nome: 'Só os que estão com a gente' },
];

const PROJETOS_ORDENS = [
  { k: 'silencio', nome: 'Tempo de silêncio, o padrão' },
  { k: 'prazo',    nome: 'Prazo do produto pronto' },
  { k: 'valor',    nome: 'Valor contratado' },
];

const PROJETOS = {
  fase: 0,            // 0 é as quatro
  pessoa: 'todos',
  mostrar: 'todos',
  ordem: 'silencio',
  recado: null,       // uma gravação que falhou, para não sumir calada
};

/* ---------------------------------------------------------------------
   Leitura dos dados. Nada aqui grava.
   --------------------------------------------------------------------- */

function projetosTodos() { return iqvLer(CHAVES.projetos, []) || []; }

// Os níveis podem ter sido editados em Roteiros e níveis. O que vale para
// a mesa é o valor de lá, não o que o código trouxe de fábrica.
function projetosNiveis() {
  const m = iqvLer(CHAVES.metodo, null);
  return (m && Array.isArray(m.niveis) && m.niveis.length) ? m.niveis : NIVEIS_DEFAULT;
}

function projetosNivel(k) { return porChave(projetosNiveis(), String(k || '')); }

function projetosNomeNivel(k) {
  const n = projetosNivel(k);
  return n ? n.nome : (k ? String(k) : 'sem nível');
}

function projetosDentroDoNivel(p, k) {
  const n = projetosNivel(p.nivelContratado);
  return !!(n && (n.escopo || []).indexOf(k) >= 0);
}

// As oito, sempre na ordem da landing, mesmo que o projeto tenha sido
// gravado com menos: entrega que falta aparece como não começou em vez de
// sumir da conta das oito.
//
// O noEscopo mora dentro da entrega porque é o escopo daquele contrato,
// congelado no dia do aceite. Projeto gravado antes disso cai no escopo do
// nível contratado, que é a melhor aproximação disponível.
function projetosOito(p) {
  const guardadas = Array.isArray(p.entregas) ? p.entregas : [];
  return ENTREGAS.map(function (def) {
    const g = guardadas.find(function (x) { return x && x.k === def.k; }) || null;
    return {
      k: def.k, n: def.n, nome: def.nome, fase: def.fase,
      dentro: (g && typeof g.noEscopo === 'boolean') ? g.noEscopo : projetosDentroDoNivel(p, def.k),
      estado: (g && g.estado) || 'nao_comecou',
      prazo: (g && g.prazo) || null,
      responsavelId: (g && g.responsavelId) || p.responsavelId || null,
      checklist: (g && Array.isArray(g.checklist)) ? g.checklist : [],
      enviadaEm: (g && g.enviadaEm) || null,
      aprovadaEm: (g && g.aprovadaEm) || null,
    };
  });
}

function projetosEmEscopo(oito) { return oito.filter(function (e) { return e.dentro; }); }
function projetosPendentes(oito) { return projetosEmEscopo(oito).filter(function (e) { return e.estado !== 'aprovada'; }); }
function projetosDaFase(oito, n) { return projetosEmEscopo(oito).filter(function (e) { return e.fase === n; }); }

// A fase de agora é a primeira que ainda tem entrega contratada sem
// aprovação do cliente. Nenhum outro caminho muda este número.
function projetosFase(oito) {
  for (let n = 1; n <= 4; n++) {
    const daFase = projetosDaFase(oito, n);
    if (daFase.some(function (e) { return e.estado !== 'aprovada'; })) return n;
  }
  return 4;
}

function projetosTudoAprovado(oito) {
  return projetosEmEscopo(oito).length > 0 && projetosPendentes(oito).length === 0;
}

// A data mais nova ou a mais velha de uma lista, ignorando o que veio em
// branco.
function projetosExtremo(datas, maior) {
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
// lembrou de virar. Entrega com o cliente é bola do cliente, sempre: é ele
// que precisa responder para a fase andar.
function projetosBola(p, oito) {
  const esperando = projetosEmEscopo(oito).filter(function (e) { return e.estado === 'com_cliente'; });
  const lado = esperando.length ? 'cliente' : 'casa';
  const guardado = p.bola || {};
  let desde = (guardado.lado === lado && guardado.desde) ? guardado.desde : null;
  if (!desde && lado === 'cliente') {
    desde = projetosExtremo(esperando.map(function (e) { return e.enviadaEm; }), false);
  }
  if (!desde && lado === 'casa') {
    desde = projetosExtremo(projetosEmEscopo(oito).map(function (e) { return e.aprovadaEm; }), true);
  }
  if (!desde) desde = guardado.desde || p.inicio || null;
  const dias = desde ? Math.max(0, diasDesde(desde) || 0) : 0;
  return {
    lado: lado, desde: desde, dias: dias, esperando: esperando,
    divergente: !!(guardado.lado && guardado.lado !== lado),
  };
}

// A entrega da vez é a pendente de prazo mais curto. Empate desempata pela
// ordem das oito, que é a ordem em que uma sustenta a seguinte.
function projetosDaVez(oito) {
  const pend = projetosPendentes(oito);
  if (!pend.length) return null;
  return pend.slice().sort(function (a, b) {
    const da = data(a.prazo), db = data(b.prazo);
    if (da && db && da.getTime() !== db.getTime()) return da.getTime() - db.getTime();
    if (da && !db) return -1;
    if (!da && db) return 1;
    return a.n - b.n;
  })[0];
}

function projetosDefinicao(e) {
  const lista = (e && e.checklist) || [];
  const feitos = lista.filter(function (i) { return i && i.feito; }).length;
  return { total: lista.length, feitos: feitos, parte: lista.length ? Math.round((feitos / lista.length) * 100) : 0 };
}

function projetosVenceu(v) { const n = diasDesde(v); return n !== null && n > 0; }

// Positivo quer dizer que ainda falta. Negativo, que passou.
function projetosFaltam(v) { const n = diasDesde(v); return n === null ? null : -n; }

function projetosRecebimento(id) {
  const lista = iqvLer(CHAVES.recebimentos, []) || [];
  return lista.find(function (r) { return r && String(r.projetoId) === String(id); }) || null;
}

// A entrada é a primeira parcela. Entre o aceite e a entrada paga é onde
// se trabalha de graça sem perceber, e por isso ela tem alarme próprio.
function projetosEntrada(p) {
  const r = projetosRecebimento(p.id);
  const parcelas = (r && Array.isArray(r.parcelas)) ? r.parcelas.slice().sort(function (a, b) { return (a.n || 0) - (b.n || 0); }) : [];
  if (!parcelas.length) return { estado: 'sem_plano', pagas: 0, total: 0 };
  return {
    estado: parcelas[0].pagoEm ? 'paga' : 'aberta',
    primeira: parcelas[0],
    pagas: parcelas.filter(function (x) { return x.pagoEm; }).length,
    total: parcelas.length,
  };
}

// O retrato é publicado pela Mesa da entrega, e o formato é de lá. Aqui só
// interessa a data, então a leitura aceita lista ou objeto e procura a
// data por mais de um nome. Retrato sem data conta como não publicado: é
// melhor dizer que o cliente não vê nada do que fingir que ele vê.
function projetosRetrato(id) {
  const bruto = iqvLer(CHAVES.retratos, null);
  if (!bruto) return null;
  let r = null;
  if (Array.isArray(bruto)) r = bruto.find(function (x) { return x && String(x.projetoId) === String(id); }) || null;
  else if (typeof bruto === 'object') r = bruto[id] || null;
  if (!r) return null;
  const quando = r.publicadoEm || r.enviadoEm || r.quando || r.data || null;
  return quando ? { quando: quando, dias: Math.max(0, diasDesde(quando) || 0) } : null;
}

function projetosPessoas() {
  return (usuarios() || []).filter(function (u) { return u && u.ativo !== false && u.papel !== 'cliente'; });
}

function projetosNomePessoa(id) {
  const u = (usuarios() || []).find(function (x) { return x && String(x.id) === String(id); });
  return u ? u.nome : null;
}

/* ---------------------------------------------------------------------
   A ficha de um projeto: tudo que a tela precisa saber, calculado uma vez
   só, para o desenho não recontar a mesma coisa em cinco lugares.
   --------------------------------------------------------------------- */
function projetosFicha(p) {
  const oito = projetosOito(p);
  const escopo = projetosEmEscopo(oito);
  const aprovadas = escopo.filter(function (e) { return e.estado === 'aprovada'; });
  const tudo = projetosTudoAprovado(oito);
  const fase = projetosFase(oito);
  const bola = projetosBola(p, oito);
  const f = {
    p: p, oito: oito, escopo: escopo, aprovadas: aprovadas,
    tudoAprovado: tudo, fase: tudo ? 4 : fase, bola: bola,
    daVez: projetosDaVez(oito),
    entregueEm: projetosExtremo(aprovadas.map(function (e) { return e.aprovadaEm; }), true),
    entrada: projetosEntrada(p),
    retrato: projetosRetrato(p.id),
    faltamDias: projetosFaltam(p.produtoProntoEm),
    valor: Number(p.valor) || 0,
  };
  f.semEscopo = escopo.length === 0;
  if (f.semEscopo) f.fase = 1;
  f.atrasado = !tudo && f.faltamDias !== null && f.faltamDias < 0;
  f.alarmes = projetosAlarmes(f);
  return f;
}

// Cada alarme diz o que aconteceu e o que fazer. Alarme sem providência
// escrita vira enfeite vermelho, e em duas semanas ninguém olha mais.
function projetosAlarmes(f) {
  const p = f.p, b = f.bola, fora = [];

  if (b.dias > PROJETOS_PARADO && !f.tudoAprovado) {
    if (b.lado === 'cliente') {
      const nomes = b.esperando.map(function (e) { return nomeEntrega(e.k); }).join(', ');
      fora.push({ tom: 'alerta', titulo: 'Parado há ' + b.dias + ' dias, esperando o cliente.',
        texto: 'Está na mão dele desde ' + esc(dataCurta(b.desde)) + ': ' + esc(nomes) + '. ' +
          'Enquanto não voltar aprovada, a ' + esc(projetosNomeFase(f.fase)) + ', não vira, e o prazo do produto pronto continua correndo do mesmo jeito. ' +
          'Uma cobrança curta hoje custa menos que mais uma semana de silêncio.' });
    } else {
      const vez = f.daVez;
      fora.push({ tom: 'alerta', titulo: 'Parado há ' + b.dias + ' dias, e a bola é nossa.',
        texto: 'Nada saiu daqui desde ' + esc(dataCurta(b.desde)) + '. ' +
          (vez ? 'A entrega da vez é ' + esc(nomeEntrega(vez.k)) + ', ' + esc(projetosEstadoTexto(vez.estado)) + '. ' : '') +
          'O cliente não tem o que responder até isto sair da nossa mesa, então o silêncio dele não é falta de interesse.' });
    }
  }

  if (f.entrada.estado === 'aberta') {
    const dias = Math.max(0, diasDesde(p.inicio) || 0);
    const parcela = f.entrada.primeira || {};
    fora.push({ tom: 'alerta', titulo: 'Contrato aceito e entrada não paga.',
      texto: 'O projeto começou em ' + esc(dataCurta(p.inicio)) + ', há ' + dias + ' dias, e a primeira parcela de ' +
        esc(moeda(parcela.valor)) + ', com vencimento em ' + esc(dataCurta(parcela.vencimento)) +
        ', continua sem baixa. A baixa é manual, em Contratado e recebido: nenhum valor entra sozinho vindo da TMB.' });
  } else if (f.entrada.estado === 'sem_plano') {
    fora.push({ tom: 'atencao', titulo: 'Nenhuma parcela lançada para este projeto.',
      texto: 'Ele aparece como contratado e nunca vai aparecer como recebido, porque não existe parcela para dar baixa. ' +
        'As parcelas nascem no aceite, em Contratado e recebido.' });
  }

  const jaSaiu = f.escopo.some(function (e) { return e.enviadaEm || e.aprovadaEm; });
  if (!f.retrato && jaSaiu) {
    fora.push({ tom: 'atencao', titulo: 'O cliente ainda não vê nada deste projeto.',
      texto: 'Nenhum retrato foi publicado, então a tela Meu projeto dele continua vazia mesmo com entrega já em andamento aqui dentro. ' +
        'O retrato sai junto com o envio para validação, na Mesa da entrega.' });
  } else if (f.retrato && f.retrato.dias > PROJETOS_RETRATO_VELHO && !f.tudoAprovado) {
    fora.push({ tom: 'atencao', titulo: 'O cliente está vendo um retrato de ' + dataCurta(f.retrato.quando) + '.',
      texto: 'São ' + f.retrato.dias + ' dias de notícia velha do lado dele: quem abre Meu projeto hoje vê este projeto como ele estava naquele dia, não como está agora. ' +
        'Publicar de novo é enviar a próxima entrega para validação.' });
  }

  if (f.atrasado) {
    fora.push({ tom: 'alerta', titulo: 'O produto pronto passou do combinado.',
      texto: 'Foi prometido para ' + esc(dataCurta(p.produtoProntoEm)) + ', há ' + Math.abs(f.faltamDias) + ' dias, e ainda faltam ' +
        (f.escopo.length - f.aprovadas.length) + ' aprovações do cliente. Essa data é promessa de prazo, e mudar promessa é conversa com o cliente, não campo de tela.' });
  }

  return fora;
}

function projetosEstadoTexto(k) {
  if (k === 'nao_comecou') return 'ainda não começou';
  const e = porChave(ESTADOS_ENTREGA, k);
  return e ? e.nome.toLowerCase() : 'sem estado';
}

// A fase se chama pelo número e pelo nome, do jeito que a landing escreve.
// "A Diagnóstico vira quando" não é frase que alguém fala.
function projetosNomeFase(n) { return 'Fase 0' + n + ', ' + nomeFase(n); }

/* ---------------------------------------------------------------------
   Quem vê o quê.

   O gestor vê todos e filtra por pessoa. O colaborador vê os projetos em
   que é responsável, ou todos, conforme o escopo configurado em A casa,
   que fica guardado junto das permissões. Ele não amplia o próprio escopo
   daqui: se pudesse, o escopo não seria escopo.
   --------------------------------------------------------------------- */
function projetosVeTudo() {
  if (EU.papel === 'gestor') return true;
  const cfg = iqvLer(CHAVES.permissoes, null);
  return !!(cfg && cfg.escopo && cfg.escopo.colaboradorVeTudo);
}

function projetosMeuId() {
  const u = acharUsuario(EU.email);
  return u ? u.id : null;
}

/* ---------------------------------------------------------------------
   O que a pessoa clica.
   --------------------------------------------------------------------- */

function projetosFiltrarFase(n) { PROJETOS.fase = Number(n) || 0; DESENHO.projetos(); }
function projetosFiltrarPessoa(v) { PROJETOS.pessoa = v; DESENHO.projetos(); }
function projetosFiltrarMostrar(v) { PROJETOS.mostrar = v; DESENHO.projetos(); }
function projetosOrdenarPor(v) { PROJETOS.ordem = v; DESENHO.projetos(); }

function projetosArg(v) { return "'" + String(v === null || v === undefined ? '' : v).replace(/[\\']/g, '') + "'"; }

// A Mesa da entrega é outro arquivo, e as duas telas viram um script só no
// final: declarar a mesma variável nos dois arquivos derrubaria a página
// inteira. Por isso o recado de qual entrega abrir vai no window, sem
// declaração, e não numa chave de armazenamento que ninguém limparia.
function projetosAbrirEntrega(id, k) {
  if (!projetosLiberado('entrega', 'a Mesa da entrega')) return;
  window.ENTREGA_ABERTA = { projetoId: id, entrega: k };
  window.PROJETO_ABERTO = id;
  irPara('entrega');
}

function projetosVerComoCliente(id) {
  if (!projetosLiberado('cliente', 'a tela Meu projeto')) return;
  window.PROJETO_ABERTO = id;
  irPara('cliente');
}

// O roteador desvia calado para a primeira tela permitida quando a pessoa
// nao pode ver a de destino, e sair da tela sem entender por que e pior do
// que nao sair. Entao a recusa vira recado, no lugar do salto.
function projetosLiberado(chave, comoSeChama) {
  if (EU.pode(chave)) return true;
  PROJETOS.recado = { titulo: 'Você não tem acesso a ' + comoSeChama + '.',
    texto: 'O seu papel neste sistema não enxerga essa tela, e por isso o botão não leva a lugar nenhum. Quem libera é a gestão, em A casa.' };
  DESENHO.projetos();
  window.scrollTo(0, 0);
  return false;
}

function projetosGravar(lista, oQue) {
  if (iqvGravar(CHAVES.projetos, lista)) { PROJETOS.recado = null; return true; }
  PROJETOS.recado = { titulo: 'Não consegui gravar ' + oQue + '.',
    texto: 'O armazenamento deste navegador recusou a escrita, normalmente porque encheu. ' +
      'A tela continua mostrando o que estava gravado antes, e não o que você acabou de mudar. ' +
      'Veja o espaço em A casa antes de mexer em mais alguma coisa.' };
  return false;
}

// A etapa do método é conversa: alguém marca em que ponto a conversa está.
// A fase não, e é essa diferença que este par de controles deixa visível.
function projetosMudarEtapa(id, n) {
  const lista = projetosTodos();
  const p = lista.find(function (x) { return String(x.id) === String(id); });
  if (!p) return;
  p.etapa = Number(n) || 1;
  projetosGravar(lista, 'a etapa do método');
  DESENHO.projetos();
}

// Acertar a fase é copiar para o cartão o que o cliente já aprovou. Não
// existe caminho para adiantar fase sem aprovação, e é de propósito.
function projetosAcertarFase(id) {
  const lista = projetosTodos();
  const p = lista.find(function (x) { return String(x.id) === String(id); });
  if (!p) return;
  const oito = projetosOito(p);
  p.fase = projetosTudoAprovado(oito) ? 4 : projetosFase(oito);
  projetosGravar(lista, 'a fase do projeto');
  DESENHO.projetos();
}

/* ---------------------------------------------------------------------
   Desenho.
   --------------------------------------------------------------------- */

function projetosHtmlBarra(parte, cheia) {
  return '<div style="height:6px;border-radius:4px;background:rgba(255,255,255,.07);overflow:hidden;margin-top:8px">' +
    '<div style="height:100%;width:' + parte + '%;background:' + (cheia ? 'var(--ok)' : 'var(--o)') + '"></div></div>';
}

function projetosHtmlTempo(dias) {
  if (dias === 0) return 'desde hoje';
  if (dias === 1) return 'há 1 dia';
  return 'há ' + dias + ' dias';
}

// A faixa das quatro fases. Cada uma é um filtro, porque a primeira
// pergunta da segunda de manhã costuma ser "quantos estão na validação".
function projetosHtmlFaixa(fichas) {
  let html = '<div class="numeros">';
  FASES.forEach(function (fase) {
    const daFase = fichas.filter(function (f) { return f.fase === fase.n && !(fase.n === 4 && f.tudoAprovado); });
    const prontos = fase.n === 4 ? fichas.filter(function (f) { return f.tudoAprovado; }).length : 0;
    const atrasados = daFase.filter(function (f) { return f.atrasado; }).length;
    const sel = PROJETOS.fase === fase.n;
    const obs = (atrasados ? atrasados + (atrasados === 1 ? ' passou' : ' passaram') + ' do combinado. ' : 'Nenhum passou do combinado. ') +
      (fase.n === 4 && prontos ? prontos + (prontos === 1 ? ' já entregue.' : ' já entregues.') : '');
    html += '<button class="numero' + (sel ? ' puxa' : '') + '" onclick="projetosFiltrarFase(' + (sel ? 0 : fase.n) + ')" ' +
      'style="width:100%;text-align:left;cursor:pointer;font-family:inherit" title="' + esc(fase.resumo) + '">' +
      '<div class="v">' + (daFase.length + prontos) + '</div>' +
      '<div class="l">Fase 0' + fase.n + ', ' + esc(fase.nome) + '</div>' +
      '<div class="obs" style="' + (atrasados ? 'color:var(--alerta)' : '') + '">' + esc(obs.trim()) + '</div>' +
      '</button>';
  });
  html += '</div>';
  html += '<p class="dica" style="margin:-8px 0 20px">Cada projeto está na fase que as aprovações do cliente sustentam, e não na que alguém marcou. ' +
    (PROJETOS.fase ? 'Você está vendo só a Fase 0' + PROJETOS.fase + '. <button class="bt bt-linha bt-sm" onclick="projetosFiltrarFase(0)">Ver as quatro</button>'
                   : 'Clique numa fase para ver só ela.') + '</p>';
  return html;
}

// A linha de carga existe para uma decisão só: cabe mais um projeto antes
// de assinar o próximo veredito em Leitura do caso.
function projetosHtmlCarga(fichas) {
  const pessoas = projetosPessoas();
  const linha = function (nome, id) {
    const meus = fichas.filter(function (f) { return String(f.p.responsavelId) === String(id); });
    let abertas = 0, atrasadas = 0, comCliente = 0;
    fichas.forEach(function (f) {
      f.escopo.forEach(function (e) {
        if (String(e.responsavelId) !== String(id)) return;
        if (e.estado === 'aprovada') return;
        abertas++;
        if (projetosVenceu(e.prazo)) atrasadas++;
        if (e.estado === 'com_cliente') comCliente++;
      });
    });
    let leitura;
    if (atrasadas) leitura = 'Não cabe outro antes de resolver ' + (atrasadas === 1 ? 'a entrega atrasada' : 'as ' + atrasadas + ' entregas atrasadas') + '.';
    else if (!meus.length && !abertas) leitura = 'Livre. Pode assinar o próximo veredito para esta pessoa.';
    else if (abertas > PROJETOS_MESA_CHEIA) leitura = 'A mesa está cheia, com ' + abertas + ' entregas abertas.';
    else leitura = 'Cabe mais um projeto.';
    return '<tr><td><b style="color:var(--claro)">' + esc(nome) + '</b></td>' +
      '<td>' + meus.length + '</td><td>' + abertas + '</td>' +
      '<td style="color:' + (atrasadas ? 'var(--alerta)' : 'var(--tx-3)') + '">' + atrasadas + '</td>' +
      '<td>' + comCliente + '</td><td class="dica">' + esc(leitura) + '</td></tr>';
  };

  const orfaos = fichas.filter(function (f) {
    return !f.p.responsavelId || !projetosNomePessoa(f.p.responsavelId);
  });

  let corpo = pessoas.map(function (u) { return linha(u.nome || u.email || 'sem nome', u.id); }).join('');
  if (orfaos.length) {
    corpo += '<tr><td><b style="color:var(--atencao)">Sem responsável</b></td>' +
      '<td>' + orfaos.length + '</td><td>' + orfaos.reduce(function (s, f) { return s + f.escopo.filter(function (e) { return e.estado !== 'aprovada'; }).length; }, 0) + '</td>' +
      '<td>0</td><td>0</td><td class="dica">Projeto sem responsável não aparece na semana de ninguém. O responsável se define em Leitura do caso, ao abrir o projeto.</td></tr>';
  }
  if (!corpo) {
    corpo = vazio('Ninguém está cadastrado em A casa ainda, então não há carga para somar. Cadastre a equipe em A casa para saber de quem é cada entrega.', 6);
  }

  return '<div class="cartao"><div class="cartao-t"><span>Carga de quem executa</span>' +
    '<span style="margin-left:auto;text-transform:none;letter-spacing:0;font-weight:400;font-size:11px;color:var(--tx-4)">Retrato de ' + esc(dataLonga(new Date().toISOString())) + '</span></div>' +
    '<div class="rolo-h"><table class="lista"><thead><tr>' +
    '<th>Pessoa</th><th>Projetos</th><th>Entregas abertas</th><th>Atrasadas</th><th>Com o cliente</th><th>A leitura disso</th>' +
    '</tr></thead><tbody>' + corpo + '</tbody></table></div>' +
    '<p class="dica" style="margin-top:12px">Olhe esta linha antes de assinar o próximo veredito em Leitura do caso. Assinar é fácil, e é aqui que aparece quem vai escrever.</p></div>';
}

function projetosHtmlFerramentas(quantos, total) {
  const opcoes = function (lista, atual) {
    return lista.map(function (o) {
      return '<option value="' + esc(o.k) + '"' + (o.k === atual ? ' selected' : '') + '>' + esc(o.nome) + '</option>';
    }).join('');
  };

  let pessoa = '';
  if (EU.papel === 'gestor') {
    const pessoas = projetosPessoas();
    pessoa = '<select class="campo campo-sm" style="flex:0 1 220px;width:auto" onchange="projetosFiltrarPessoa(this.value)">' +
      '<option value="todos"' + (PROJETOS.pessoa === 'todos' ? ' selected' : '') + '>Toda a equipe</option>' +
      pessoas.map(function (u) {
        return '<option value="' + esc(u.id) + '"' + (String(PROJETOS.pessoa) === String(u.id) ? ' selected' : '') + '>' + esc(u.nome || u.email) + '</option>';
      }).join('') +
      '<option value="sem"' + (PROJETOS.pessoa === 'sem' ? ' selected' : '') + '>Sem responsável</option>' +
      '</select>';
  }

  return '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:16px">' +
    pessoa +
    '<select class="campo campo-sm" style="flex:0 1 280px;width:auto" onchange="projetosFiltrarMostrar(this.value)">' + opcoes(PROJETOS_MOSTRAR, PROJETOS.mostrar) + '</select>' +
    '<select class="campo campo-sm" style="flex:0 1 240px;width:auto" onchange="projetosOrdenarPor(this.value)">' + opcoes(PROJETOS_ORDENS, PROJETOS.ordem) + '</select>' +
    '<span class="dica" style="margin-left:auto">' + quantos + ' de ' + total + (total === 1 ? ' projeto' : ' projetos') + '</span>' +
    '</div>';
}

// As quatro fases com as oito entregas dentro. É aqui que a regra da casa
// fica visível sem precisar de texto: a coluna acende quando as entregas
// dela estão aprovadas pelo cliente, e não tem para onde arrastar nada.
function projetosHtmlFases(f) {
  const nivel = projetosNomeNivel(f.p.nivelContratado);
  const fora = f.p.nivelContratado ? 'Fora do ' + nivel : 'Não foi contratada';
  const semFase = f.p.nivelContratado ? 'Não entra no ' + nivel : 'Nenhuma contratada';
  let html = '<div class="rolo-h" style="margin-top:16px"><div style="display:grid;grid-template-columns:repeat(4,minmax(198px,1fr));gap:10px;min-width:840px">';

  FASES.forEach(function (fase) {
    const daFase = f.oito.filter(function (e) { return e.fase === fase.n; });
    const dentro = daFase.filter(function (e) { return e.dentro; });
    const aprovadas = dentro.filter(function (e) { return e.estado === 'aprovada'; });
    const virada = dentro.length > 0 && aprovadas.length === dentro.length;
    const atual = fase.n === f.fase && !f.tudoAprovado;

    let selo;
    if (fase.n === 4 && f.tudoAprovado) selo = '<span class="eti eti-ok">Produto pronto em ' + esc(dataCurta(f.entregueEm)) + '</span>';
    else if (!dentro.length) selo = '<span class="eti eti-neutra">' + esc(semFase) + '</span>';
    else if (virada) selo = '<span class="eti eti-ok">Virada em ' + esc(dataCurta(projetosExtremo(aprovadas.map(function (e) { return e.aprovadaEm; }), true))) + '</span>';
    else if (atual) selo = '<span class="eti eti-marca">Fase de agora</span>';
    else selo = '<span class="eti eti-neutra">Ainda não</span>';

    html += '<div style="border:1px solid ' + (atual ? 'var(--o-35)' : 'var(--fio)') + ';border-radius:var(--r-sm);padding:13px;' +
      'background:' + (atual ? 'var(--o-05)' : 'transparent') + '">' +
      '<div style="font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--tx-4);font-weight:700">Fase 0' + fase.n + '</div>' +
      '<b style="display:block;color:var(--claro);font-size:13.5px;margin:3px 0 8px">' + esc(fase.nome) + '</b>' +
      selo;

    daFase.forEach(function (e) {
      if (!e.dentro) {
        html += '<div style="margin-top:7px;padding:7px 10px;border:1px dashed var(--fio-2);border-radius:var(--r-sm);opacity:.5;font-size:12px">' +
          esc(e.nome) + '<span class="dica" style="display:block">' + esc(fora) + '</span></div>';
        return;
      }
      const def = projetosDefinicao(e);
      let obs = '';
      if (e.estado === 'aprovada') obs = 'Aprovada pelo cliente em ' + dataCurta(e.aprovadaEm);
      else if (e.estado === 'com_cliente') obs = 'Com ele desde ' + dataCurta(e.enviadaEm);
      else if (projetosVenceu(e.prazo)) obs = 'Prazo venceu em ' + dataCurta(e.prazo);
      else if (e.prazo) obs = 'Prazo ' + dataCurta(e.prazo);
      else obs = 'Sem prazo';
      if (def.total && e.estado !== 'aprovada') obs += ', ' + def.feitos + ' de ' + def.total + ' itens';

      html += '<button class="bt bt-linha bt-sm" style="width:100%;margin-top:7px;text-align:left;display:block" ' +
        'onclick="projetosAbrirEntrega(' + projetosArg(f.p.id) + ',' + projetosArg(e.k) + ')">' +
        '<span style="display:flex;align-items:center;gap:6px;justify-content:space-between">' +
        '<span style="color:var(--claro)">' + esc(e.nome) + '</span>' + etiqueta(ESTADOS_ENTREGA, e.estado) + '</span>' +
        '<span class="dica" style="display:block;margin-top:4px;' + (projetosVenceu(e.prazo) && e.estado !== 'aprovada' ? 'color:var(--alerta)' : '') + '">' + esc(obs) + '</span>' +
        '</button>';
    });

    html += '</div>';
  });

  return html + '</div></div>';
}

function projetosHtmlTrava(f) {
  if (f.tudoAprovado) {
    return aviso('ok', 'As entregas contratadas estão todas aprovadas pelo cliente.',
      'O produto pronto ficou de pé em ' + esc(dataCurta(f.entregueEm)) + '. Daqui em diante o que existe é a colheita de 60 dias, que aparece sozinha em Minha semana: apresentou, vendeu, indicaria alguém.');
  }
  const pend = f.escopo.filter(function (e) { return e.fase === f.fase && e.estado !== 'aprovada'; });
  if (!pend.length) return '';
  const nomes = pend.map(function (e) {
    let quem = projetosEstadoTexto(e.estado);
    if (e.estado === 'com_cliente') quem = 'com o cliente desde ' + dataCurta(e.enviadaEm);
    return nomeEntrega(e.k) + ', ' + quem;
  }).join('; ');
  const comCliente = pend.filter(function (e) { return e.estado === 'com_cliente'; }).length;
  return '<p class="dica" style="margin-top:14px">A ' + esc(projetosNomeFase(f.fase)) + ', vira quando o cliente aprovar ' +
    (pend.length === 1 ? 'a entrega que falta' : 'as ' + pend.length + ' entregas que faltam') + ': ' + esc(nomes) + '. ' +
    (comCliente ? 'Aprovação é decisão dele, e não tem botão nosso que substitua.' : 'Enquanto não sair daqui, ele não tem o que aprovar.') + '</p>';
}

function projetosHtmlDaVez(f) {
  const e = f.daVez;
  if (!e) return '';
  const def = projetosDefinicao(e);
  const venceu = projetosVenceu(e.prazo);
  const prazo = e.prazo
    ? (venceu ? 'Prazo era ' + dataCurta(e.prazo) + ', venceu ' + haQuanto(e.prazo) : 'Prazo ' + dataCurta(e.prazo))
    : 'Sem prazo marcado';
  const quem = projetosNomePessoa(e.responsavelId);

  return '<div style="border:1px solid var(--fio);border-radius:var(--r-sm);padding:14px;margin-top:14px">' +
    '<span class="rotulo">A entrega da vez</span>' +
    '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">' +
    '<b style="color:var(--claro);font-size:14px">' + esc(e.nome) + '</b>' +
    etiqueta(ESTADOS_ENTREGA, e.estado) +
    '<span class="dica" style="' + (venceu ? 'color:var(--alerta)' : '') + '">' + esc(prazo) + '</span>' +
    (quem ? '<span class="dica">Com ' + esc(quem) + '</span>' : '<span class="dica" style="color:var(--atencao)">Sem responsável</span>') +
    '</div>' +
    (def.total
      ? '<div style="margin-top:10px"><span class="dica">Definição de pronto: ' + def.feitos + ' de ' + def.total + ' itens marcados</span>' +
        projetosHtmlBarra(def.parte, def.parte === 100) +
        (def.parte === 100 && e.estado !== 'com_cliente' ? '<span class="dica" style="color:var(--ok);display:block;margin-top:6px">Pronta para ir para validação.</span>' : '') + '</div>'
      : '<p class="dica" style="margin-top:10px">Esta entrega nasceu sem definição de pronto, então não dá para dizer o quanto falta. Escreva o checklist em Roteiros e níveis para os próximos projetos nascerem com ele.</p>') +
    '<button class="bt bt-marca bt-sm" style="margin-top:12px" onclick="projetosAbrirEntrega(' + projetosArg(f.p.id) + ',' + projetosArg(e.k) + ')">Abrir na Mesa da entrega</button>' +
    '</div>';
}

function projetosHtmlCartao(f) {
  const p = f.p;
  const b = f.bola;
  const eti = b.dias > PROJETOS_PARADO ? 'eti-alerta' : (b.lado === 'cliente' ? 'eti-atencao' : 'eti-info');
  const nivel = projetosNomeNivel(p.nivelContratado);
  const responsavel = projetosNomePessoa(p.responsavelId);

  let prazo;
  if (f.tudoAprovado) prazo = 'Entregue em ' + dataCurta(f.entregueEm);
  else if (f.faltamDias === null) prazo = 'Sem data de produto pronto';
  else if (f.faltamDias < 0) prazo = dataCurta(p.produtoProntoEm) + ', passou há ' + Math.abs(f.faltamDias) + ' dias';
  else if (f.faltamDias === 0) prazo = dataCurta(p.produtoProntoEm) + ', é hoje';
  else prazo = dataCurta(p.produtoProntoEm) + ', faltam ' + f.faltamDias + ' dias';

  let html = '<div class="cartao">';

  // A bola vem antes de tudo, inclusive antes do nome do cliente.
  html += '<div style="display:flex;gap:12px;align-items:flex-start;flex-wrap:wrap">' +
    '<div style="flex:1 1 320px">' +
    (f.tudoAprovado
      ? '<span class="eti eti-ok">Produto pronto, entregue em ' + esc(dataCurta(f.entregueEm)) + '</span>'
      : '<span class="eti ' + eti + '">' + (b.lado === 'cliente' ? 'Com o cliente ' : 'Com a gente ') + esc(projetosHtmlTempo(b.dias)) + '</span>') + ' ' +
    '<h3 style="font-family:var(--display);font-weight:300;font-size:19px;color:var(--claro);margin-top:11px">' + esc(p.cliente || p.rotulo || 'sem nome') + '</h3>' +
    '<div class="dica">' + esc(p.rotulo || '') + (p.rotulo ? '. ' : '') + 'Começou em ' + esc(dataCurta(p.inicio)) + '.' +
    (b.divergente && !f.tudoAprovado ? ' O cartão guardado dizia que a bola estava com ' + (b.lado === 'cliente' ? 'a gente' : 'o cliente') + ', mas quem manda é o estado das oito entregas.' : '') +
    '</div></div>' +
    '<div style="text-align:right">' +
    (f.semEscopo
      ? '<div style="font-family:var(--display);font-size:20px;font-weight:300;color:var(--atencao);line-height:1.2">Sem escopo</div>' +
        '<div class="dica">nenhuma das oito foi contratada</div>'
      : '<div style="font-family:var(--display);font-size:26px;font-weight:300;color:var(--claro);line-height:1">' + f.aprovadas.length + ' de ' + f.escopo.length + '</div>' +
        '<div class="dica">aprovadas pelo cliente' + (f.escopo.length < 8 ? ', das ' + f.escopo.length + ' contratadas no ' + esc(nivel) : '') + '</div>') +
    '</div></div>';

  // Os dados do contrato, curtos, depois da bola.
  html += '<div style="display:flex;flex-wrap:wrap;gap:20px;margin-top:16px">' +
    '<div><span class="rotulo">Nível contratado</span><b style="color:var(--claro)">' + esc(nivel) + ', ' + esc(moeda(f.valor)) + '</b></div>' +
    '<div><span class="rotulo">Produto pronto</span><b style="color:' + (f.atrasado ? 'var(--alerta)' : 'var(--claro)') + '">' + esc(prazo) + '</b></div>' +
    '<div><span class="rotulo">Responsável</span><b style="color:' + (responsavel ? 'var(--claro)' : 'var(--atencao)') + '">' + esc(responsavel || 'ninguém') + '</b></div>' +
    '<div><span class="rotulo">Parcelas</span><b style="color:var(--claro)">' + f.entrada.pagas + ' de ' + f.entrada.total + ' pagas</b></div>' +
    '<div style="flex:0 1 260px"><span class="rotulo">Etapa do método, marcada por nós</span>' +
    '<select class="campo campo-sm" onchange="projetosMudarEtapa(' + projetosArg(p.id) + ', this.value)">' +
    ETAPAS.map(function (et) {
      return '<option value="' + et.n + '"' + (Number(p.etapa) === et.n ? ' selected' : '') + '>' + et.n + '. ' + esc(et.nome) + '</option>';
    }).join('') + '</select></div>' +
    '</div>';

  html += projetosHtmlFases(f);
  html += projetosHtmlTrava(f);

  // A fase do cartão contra a fase das aprovações. Quando as duas
  // discordam, quem está errado é o cartão.
  if (Number(p.fase) && Number(p.fase) !== f.fase && !f.semEscopo) {
    html += '<div style="margin-top:14px">' + aviso('atencao',
      'O cartão guardado diz Fase 0' + Number(p.fase) + ', as aprovações do cliente dizem Fase 0' + f.fase + '.',
      'A tela mostra a Fase 0' + f.fase + ', que é a que o cliente sustenta. Acertar o cartão só copia isso para dentro do projeto: não existe caminho aqui para adiantar fase sem aprovação. ' +
      '<button class="bt bt-linha bt-sm" style="margin-top:10px" onclick="projetosAcertarFase(' + projetosArg(p.id) + ')">Acertar a fase pelo que foi aprovado</button>') + '</div>';
  }

  html += projetosHtmlDaVez(f);

  if (!f.escopo.length) {
    html += '<div style="margin-top:14px">' + aviso('alerta', 'Este projeto nasceu sem escopo.',
      'Nenhuma das oito está marcada como contratada, então não há o que escrever nem o que o cliente aprovar, e a fase nunca vai virar. ' +
      'Volte à Leitura do caso e diga qual nível foi de fato contratado.') + '</div>';
  }

  if (f.alarmes.length) {
    html += '<div style="margin-top:16px">' + f.alarmes.map(function (a) { return aviso(a.tom, esc(a.titulo), a.texto); }).join('') + '</div>';
  }

  html += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:6px">' +
    (EU.pode('cliente') ? '<button class="bt bt-linha bt-sm" onclick="projetosVerComoCliente(' + projetosArg(p.id) + ')">Ver como o cliente vê</button>' : '') +
    (EU.pode('dinheiro') ? '<button class="bt bt-linha bt-sm" onclick="irPara(\'dinheiro\')">Ver as parcelas</button>' : '') +
    '</div>';

  return html + '</div>';
}

function projetosHtmlNada(titulo, texto, botoes) {
  return '<div class="cartao" style="text-align:center;padding:36px 26px">' +
    '<b style="display:block;color:var(--claro);font-size:15px;margin-bottom:9px">' + esc(titulo) + '</b>' +
    '<p class="dica" style="max-width:64ch;margin:0 auto 16px">' + esc(texto) + '</p>' + (botoes || '') + '</div>';
}

function projetosOrdenar(fichas) {
  return fichas.slice().sort(function (a, b) {
    if (a.tudoAprovado !== b.tudoAprovado) return a.tudoAprovado ? 1 : -1;
    if (PROJETOS.ordem === 'valor') return b.valor - a.valor;
    if (PROJETOS.ordem === 'prazo') {
      const da = data(a.p.produtoProntoEm), db = data(b.p.produtoProntoEm);
      if (da && db) return da.getTime() - db.getTime();
      if (da) return -1;
      if (db) return 1;
      return 0;
    }
    // silêncio: o que está parado há mais tempo vem primeiro
    if (b.bola.dias !== a.bola.dias) return b.bola.dias - a.bola.dias;
    return b.alarmes.length - a.alarmes.length;
  });
}

DESENHO.projetos = function () {
  escrever('projetos-recado', PROJETOS.recado ? aviso('alerta', esc(PROJETOS.recado.titulo), esc(PROJETOS.recado.texto)) : '');

  const todos = projetosTodos();
  const meuId = projetosMeuId();
  const veTudo = projetosVeTudo();

  // O que este papel enxerga, antes de qualquer filtro escolhido na tela.
  const meus = veTudo ? todos : todos.filter(function (p) { return meuId && String(p.responsavelId) === String(meuId); });
  const fichas = meus.map(projetosFicha);

  // O número do menu é quantos projetos pedem providência hoje, e não
  // quantos existem: contador que só conta não faz ninguém abrir a tela.
  contador('projetos', fichas.filter(function (f) { return f.alarmes.length; }).length);

  if (!todos.length) {
    escrever('projetos-faixa', '');
    escrever('projetos-carga', '');
    escrever('projetos-ferramentas', '');
    escrever('projetos-corpo', projetosHtmlNada(
      'Nenhum projeto em estruturação.',
      'Projeto aqui nasce de um aceite, e de nenhum outro lugar: abra a leitura de uma aplicação, assine o veredito, envie a devolutiva e, quando a pessoa aceitar, clique em Abrir projeto. É uma porta só, de propósito, para não existir projeto sem avaliação.',
      (EU.pode('ideias') ? '<button class="bt bt-marca" onclick="irPara(\'ideias\')">Ver as ideias que chegaram</button> ' : '') +
      (EU.pode('leitura') ? '<button class="bt bt-linha" onclick="irPara(\'leitura\')">Ir para a leitura do caso</button>' : '')));
    return;
  }

  if (!fichas.length) {
    escrever('projetos-faixa', '');
    escrever('projetos-carga', '');
    escrever('projetos-ferramentas', '');
    escrever('projetos-corpo', meuId
      ? projetosHtmlNada('Nenhum projeto com você como responsável.',
          'Existem ' + todos.length + ' projetos em estruturação nesta casa, e nenhum deles está no seu nome. Quem define o responsável é quem abre o projeto, em Leitura do caso, e quem amplia o seu escopo de leitura é a gestão, em A casa.')
      : projetosHtmlNada('Não sei quais projetos são seus.',
          'Você entrou como ' + (EU.email || 'alguém sem e-mail identificado') + ', e não existe ninguém com esse e-mail cadastrado em A casa. Sem esse cadastro o sistema não tem como saber de quem é cada projeto. Peça para a gestão cadastrar o seu e-mail em A casa.'));
    return;
  }

  escrever('projetos-faixa', projetosHtmlFaixa(fichas));
  escrever('projetos-carga', EU.papel === 'gestor' ? projetosHtmlCarga(fichas) : '');

  let vistas = fichas;
  if (PROJETOS.fase) vistas = vistas.filter(function (f) { return f.fase === PROJETOS.fase; });
  if (EU.papel === 'gestor' && PROJETOS.pessoa === 'sem') {
    vistas = vistas.filter(function (f) { return !f.p.responsavelId || !projetosNomePessoa(f.p.responsavelId); });
  } else if (EU.papel === 'gestor' && PROJETOS.pessoa !== 'todos') {
    vistas = vistas.filter(function (f) { return String(f.p.responsavelId) === String(PROJETOS.pessoa); });
  }
  if (PROJETOS.mostrar === 'parados') vistas = vistas.filter(function (f) { return f.bola.dias > PROJETOS_PARADO; });
  if (PROJETOS.mostrar === 'alarme') vistas = vistas.filter(function (f) { return f.alarmes.length; });
  if (PROJETOS.mostrar === 'cliente') vistas = vistas.filter(function (f) { return f.bola.lado === 'cliente'; });
  if (PROJETOS.mostrar === 'casa') vistas = vistas.filter(function (f) { return f.bola.lado === 'casa'; });

  escrever('projetos-ferramentas', projetosHtmlFerramentas(vistas.length, fichas.length));

  if (!vistas.length) {
    escrever('projetos-corpo', projetosHtmlNada('Nenhum projeto neste recorte.',
      'Os ' + fichas.length + ' projetos que você acompanha continuam aqui, só não cabem no filtro escolhido agora. Volte para todas as fases e para todos os projetos para ver a mesa inteira.',
      '<button class="bt bt-linha" onclick="projetosFiltrarFase(0)">Ver as quatro fases</button> ' +
      '<button class="bt bt-linha" onclick="projetosFiltrarMostrar(\'todos\')">Ver todos os projetos</button>'));
    return;
  }

  escrever('projetos-corpo', projetosOrdenar(vistas).map(projetosHtmlCartao).join(''));
};
