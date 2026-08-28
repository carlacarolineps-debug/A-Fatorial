/* =====================================================================
   Leitura do caso.

   A landing diz, com todas as letras, que cada projeto passa por uma
   avaliacao antes de qualquer proposta. Esta tela e essa avaliacao. Ela
   existe para que ninguem contrate direto e para que ninguem receba um
   "nao" sem motivo escrito.

   Duas decisoes mandam no desenho:

   1) O que a pessoa escreveu fica a esquerda, do jeito que veio, e a
      nossa leitura fica a direita. As duas colunas nao se misturam:
      nome, contato e respostas nao se editam aqui.

   2) Quase tudo desta tela mora no navegador de quem esta lendo, e
      navegador nao e lugar de promessa. O que atravessa a troca de
      maquina e o carimbo curto que o PATCH /leads grava em observacoes.
      Por isso o carimbo novo entra no TOPO do campo: o servidor corta o
      fim em 2000 caracteres, e carimbo cortado ao meio nao se le nem se
      conta. Quem abrir esta tela em outro computador ainda enxerga o
      parecer, e pode trazer de volta o que da para reconstruir dele.
   ===================================================================== */

/* ---------------------------------------------------------------------
   1. As listas fechadas desta tela.
   --------------------------------------------------------------------- */

// As tres portas do veredito. O status e o do servidor: a lista de la e
// fechada e nao tem porta chamada "esperar", entao esperar fica em
// contatado e o que precisa acontecer antes vai escrito no carimbo.
const LEITURA_VEREDITOS = [
  { k: 'seguir',  nome: 'Cabe no método',      eti: 'eti-ok',      status: 'qualificado',
    resumo: 'Seguimos, no nível indicado pela leitura.' },
  { k: 'esperar', nome: 'Ainda não é a hora',  eti: 'eti-atencao', status: 'contatado',
    resumo: 'O caso cabe, depois que alguma coisa acontecer. Escreva o que é.' },
  { k: 'fora',    nome: 'Não é para o método', eti: 'eti-neutra',  status: 'perdido',
    resumo: 'Não seguimos agora, e o motivo sai de uma lista fechada.' },
];

// Motivo de recusa e lista fechada porque a aba Motivos soma isso. Campo
// livre nao soma: viram seis jeitos de escrever a mesma coisa e a conta
// que ensinaria o que corrigir na landing nunca fecha.
const LEITURA_MOTIVOS = [
  { k: 'sem_experiencia', nome: 'Ainda não tem experiência para estruturar',
    frase: 'O método parte de experiência já aplicada, e o seu projeto ainda está antes disso. Hoje não daria para estruturar um produto a partir do que existe.' },
  { k: 'quer_venda', nome: 'Quer que a venda seja feita por nós',
    frase: 'O que você procura é quem venda por você, e isso nós não fazemos. Estruturamos a oferta, e a comercialização continua com você.' },
  { k: 'quer_execucao', nome: 'Procura execução, não estruturação',
    frase: 'O que você precisa agora é de execução, e o que o método entrega é estrutura: posicionamento, método próprio, preço e direção comercial.' },
  { k: 'fora_do_metodo', nome: 'O que pede está fora do que o método faz',
    frase: 'O que o seu projeto pede está fora do que o método faz. Forçar isso não te entregaria o resultado que você espera.' },
  { k: 'sem_condicao', nome: 'Não há condição de investimento agora',
    frase: 'Pelo que conversamos, o investimento não cabe no seu momento. Começar assim colocaria pressão no lugar errado.' },
  { k: 'sem_resposta', nome: 'Não respondeu depois de duas tentativas',
    frase: 'Procurei você duas vezes e não consegui retorno. Vou encerrar a sua aplicação por aqui, e se quiser retomar é só responder esta mensagem.' },
];

const LEITURA_CANAIS = [
  { k: 'whatsapp', nome: 'WhatsApp' },
  { k: 'email',    nome: 'E-mail' },
];

// Ate 12x no PIX ou boleto, pela TMB, igual ao que a landing escreve.
const LEITURA_FORMAS = [
  { k: 'pix',    nome: 'PIX' },
  { k: 'boleto', nome: 'Boleto' },
];
const LEITURA_PARCELAS = [1, 2, 3, 6, 10, 12];

// O mesmo corte que src/leads.js aplica em observacoes.
const LEITURA_LIMITE_OBS = 2000;

// A fila mostra as primeiras; a lista inteira e da tela Ideias que
// chegaram, e tabela de 500 linhas ninguem le na segunda de manha.
const LEITURA_MAX_FILA = 40;

const LEITURA_MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/* ---------------------------------------------------------------------
   2. O estado da tela. Some quando a pagina recarrega, e e para sumir:
   o que precisa durar esta em iqv_leituras e no carimbo do servidor.
   --------------------------------------------------------------------- */
let LEITURA_ESTADO = 'carregando';   // carregando | ok | sem_servidor | login | sem_configuracao | erro
let LEITURA_ERRO = null;
let LEITURA_LEADS = [];
let LEITURA_QUANDO = null;           // quando esta lista foi buscada
let LEITURA_ALVO = null;             // qual aplicacao esta aberta
let LEITURA_ABA = 'ficha';
let LEITURA_BUSCANDO = false;
let LEITURA_JA_BUSCOU = false;
let LEITURA_GRAVANDO = false;
let LEITURA_RECADO = null;           // { tom, titulo, texto }
let LEITURA_ABRIR_PROJETO = false;
let LEITURA_REVENDO = null;          // leadId cujo parecer assinado esta sendo revisto

/* ---------------------------------------------------------------------
   3. Pecas de leitura e de gravacao local.
   --------------------------------------------------------------------- */

function leituraQuemSou() { return String(EU.nome || EU.email || 'sem nome'); }

function leituraTodas() {
  const lista = iqvLer(CHAVES.leituras, []);
  return Array.isArray(lista) ? lista : [];
}

function leituraDa(leadId) {
  const id = Number(leadId);
  return leituraTodas().find(function (l) { return Number(l.leadId) === id; }) || null;
}

function leituraLead(leadId) {
  const id = Number(leadId);
  return LEITURA_LEADS.find(function (l) { return Number(l.id) === id; }) || null;
}

// Nasce em memoria e so vai para o armazenamento quando alguem escrever o
// primeiro campo: abrir uma ficha para olhar nao pode contar como leitura
// comecada, senao a fila enche de trabalho que ninguem fez.
function leituraGarantir(leadId) {
  const existente = leituraDa(leadId);
  if (existente) {
    if (!existente.devolutiva) existente.devolutiva = { texto: '', canal: 'whatsapp', enviadaPor: '', enviadaEm: null };
    if (!Array.isArray(existente.precisa)) existente.precisa = [];
    return existente;
  }
  const lead = leituraLead(leadId);
  return {
    leadId: Number(leadId), perfil: '', estagio: '', precisa: [],
    nivelIndicado: '', justificativa: '', veredito: '', motivo: '',
    preparadaPor: leituraQuemSou(), assinadaPor: '', assinadaEm: null,
    // o canal ja nasce no que a pessoa deixou de contato, e nao num padrao
    devolutiva: { texto: '', canal: (lead && lead.whatsapp) ? 'whatsapp' : 'email', enviadaPor: '', enviadaEm: null },
  };
}

function leituraSalvar(l) {
  const lista = leituraTodas().filter(function (x) { return Number(x.leadId) !== Number(l.leadId); });
  lista.push(l);
  if (!iqvGravar(CHAVES.leituras, lista)) {
    LEITURA_RECADO = { tom: 'alerta', titulo: 'Não consegui guardar a leitura neste navegador',
      texto: 'O armazenamento do navegador recusou a gravação, e o que você acabou de escrever não está seguro. Abra a tela A casa para ver quanto espaço está ocupado antes de continuar.' };
    return false;
  }
  return true;
}

// Os niveis com o valor que a gestao editou em Roteiros e niveis. Nivel
// salvo por la pode ter vindo sem escopo, e sem escopo a conta de
// cobertura mentiria dizendo que o nivel nao cobre nada.
function leituraNiveis() {
  const m = iqvLer(CHAVES.metodo, null);
  const lista = (m && Array.isArray(m.niveis) && m.niveis.length) ? m.niveis : NIVEIS_DEFAULT;
  return lista.map(function (n) {
    const padrao = porChave(NIVEIS_DEFAULT, n.k) || {};
    return {
      k: n.k,
      nome: n.nome || padrao.nome || n.k,
      valor: Number(n.valor !== undefined && n.valor !== null ? n.valor : padrao.valor) || 0,
      resumo: n.resumo || padrao.resumo || '',
      escopo: Array.isArray(n.escopo) ? n.escopo : (padrao.escopo || []),
    };
  });
}

function leituraNivel(k) { return porChave(leituraNiveis(), k); }

function leituraNomeNivel(k) { const n = leituraNivel(k); return n ? n.nome : ''; }

// O que a pessoa clicou na landing chega no campo oculto plano. Quem nao
// clicou nivel nenhum chega sem, e ai nao existe divergencia para explicar.
function leituraClicado(lead) {
  const k = String(lead && lead.plano || '').trim().toLowerCase();
  return leituraNivel(k) ? k : '';
}

function leituraDivergente(l, lead) {
  const clicado = leituraClicado(lead);
  // nivel indicado que a tela Roteiros apagou nao conta como divergencia:
  // pediria justificativa para uma diferenca que ninguem consegue ler
  return !!(clicado && l.nivelIndicado && l.nivelIndicado !== clicado && leituraNivel(l.nivelIndicado));
}

// A sugestao olha so cobertura: o menor nivel cujo escopo cobre tudo que o
// caso pede. Premium nunca e sugerido sozinho, porque o que o separa do Pro
// e amplitude de projeto, e isso e leitura de gente, nao conta de lista.
function leituraSugerido(precisa) {
  const pede = precisa || [];
  const ordem = ['start', 'pro'];
  for (let i = 0; i < ordem.length; i++) {
    const n = leituraNivel(ordem[i]);
    if (!n) continue;
    const cobre = pede.every(function (k) { return n.escopo.indexOf(k) >= 0; });
    if (cobre) return ordem[i];
  }
  return 'pro';
}

// O que o caso pede e o nivel indicado nao cobre. E a pergunta que evita
// vender Start para um caso que precisa de precificacao.
function leituraForaDoNivel(l) {
  const n = leituraNivel(l.nivelIndicado);
  if (!n) return [];
  return (l.precisa || []).filter(function (k) { return n.escopo.indexOf(k) < 0; });
}

function leituraTemProjeto(leadId) {
  const id = Number(leadId);
  return (iqvLer(CHAVES.projetos, []) || []).find(function (p) { return Number(p.leadId) === id; }) || null;
}

// "ha 0 dias" ninguem fala. A tela conta o tempo do jeito que a mesa conta.
function leituraDias(n) {
  if (n === null || n === undefined) return 'sem data';
  if (n <= 0) return 'hoje';
  if (n === 1) return 'ontem';
  return 'há ' + n + ' dias';
}

function leituraPrimeiroNome(nome) {
  const n = String(nome || '').trim();
  if (!n) return 'você';
  return n.split(/\s+/)[0];
}

// Em que ponto da leitura esta cada aplicacao, e quanto isso doi. O peso
// ordena a fila: o que doi mais fica em cima.
function leituraFase(lead) {
  if (leituraTemProjeto(lead.id)) return { k: 'projeto', nome: 'Virou projeto', eti: 'eti-ok', peso: 5 };
  const l = leituraDa(lead.id);
  if (!l || !l.veredito && !l.perfil && !(l.precisa || []).length) {
    const encerrado = lead.status === 'perdido' || lead.status === 'ganho';
    return { k: 'nao', nome: 'Não começou', eti: 'eti-neutra', peso: encerrado ? 6 : 3 };
  }
  if (!l.assinadaEm) return { k: 'preparando', nome: 'Sendo preparada', eti: 'eti-info', peso: 2 };
  if (!l.devolutiva || !l.devolutiva.enviadaEm) return { k: 'assinada', nome: 'Assinada, sem devolutiva', eti: 'eti-alerta', peso: 1 };
  return { k: 'respondida', nome: 'Devolutiva enviada', eti: 'eti-atencao', peso: 4 };
}

function leituraResumo() {
  const r = { esperando: 0, preparando: 0, semDevolutiva: 0, aguardando: 0, esperaMaisAntiga: null, envioMaisAntigo: null };
  LEITURA_LEADS.forEach(function (lead) {
    const f = leituraFase(lead);
    const l = leituraDa(lead.id);
    if (f.k === 'nao' && f.peso === 3) {
      r.esperando++;
      const d = diasDesde(lead.criado_em);
      if (d !== null && (r.esperaMaisAntiga === null || d > r.esperaMaisAntiga)) r.esperaMaisAntiga = d;
    }
    if (f.k === 'preparando') r.preparando++;
    if (f.k === 'assinada') r.semDevolutiva++;
    if (f.k === 'respondida' && l && l.veredito === 'seguir') {
      r.aguardando++;
      const d = diasDesde(l.devolutiva.enviadaEm);
      if (d !== null && (r.envioMaisAntigo === null || d > r.envioMaisAntigo)) r.envioMaisAntigo = d;
    }
  });
  return r;
}

/* ---------------------------------------------------------------------
   4. O carimbo, que e a unica parte desta tela que sobrevive a troca de
   navegador.

   Formato de uma linha so, legivel por gente e separavel por maquina:

     PARECER 2026-08-26 | perfil: consultor | veredito: seguir | nivel: pro | por: Carla
     RETORNO 2026-08-26 | canal: whatsapp | por: Carla
     PROJETO 2026-08-26 | nivel: pro | pronto: 2026-11-20 | por: Carla

   O RETORNO existe pelo mesmo motivo do PARECER. A regra da casa e que
   veredito assinado sem devolutiva enviada nao sai da fila de Minha
   semana; se a data do envio morasse so no navegador de quem enviou, a
   fila de todo mundo continuaria acusando uma promessa ja cumprida.
   --------------------------------------------------------------------- */

// Barra vertical e quebra de linha separam campos do carimbo, entao nao
// podem entrar pelo texto que alguem digitou.
function leituraLimpo(v, max) {
  return String(v === null || v === undefined ? '' : v)
    .replace(/[|\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max || 80);
}

function leituraMontarCarimbo(l) {
  const partes = ['PARECER ' + hoje(), 'perfil: ' + (l.perfil || 'sem perfil'), 'veredito: ' + l.veredito];
  if (l.veredito === 'seguir') partes.push('nivel: ' + (l.nivelIndicado || 'sem nivel'));
  if (l.veredito === 'esperar') partes.push('falta: ' + leituraLimpo(l.motivo, 90));
  if (l.veredito === 'fora') partes.push('motivo: ' + (l.motivo || 'sem motivo'));
  partes.push('por: ' + leituraLimpo(leituraQuemSou(), 40));
  return partes.join(' | ');
}

// Carimbo novo em cima, e quem sai para caber e o mais antigo, inteiro.
// O servidor corta o FIM do campo em 2000 caracteres: se o novo entrasse
// embaixo, o parecer de hoje seria o primeiro a ser cortado ao meio.
function leituraObsNova(atual, linha) {
  const antigo = String(atual || '').trim();
  const texto = antigo ? linha + '\n' + antigo : linha;
  if (texto.length <= LEITURA_LIMITE_OBS) return { texto: texto, cortou: 0 };
  const linhas = texto.split('\n');
  let cortou = 0;
  while (linhas.length > 1 && linhas.join('\n').length > LEITURA_LIMITE_OBS) { linhas.pop(); cortou++; }
  return { texto: linhas.join('\n').slice(0, LEITURA_LIMITE_OBS), cortou: cortou };
}

function leituraCarimbos(obs) {
  return String(obs || '').split('\n').map(function (bruta) {
    const linha = bruta.trim();
    const m = /^(PARECER|RETORNO|PROJETO)\s+(\d{4}-\d{2}-\d{2})\s*\|?\s*(.*)$/.exec(linha);
    if (!m) return null;
    const campos = {};
    m[3].split('|').forEach(function (p) {
      const i = p.indexOf(':');
      if (i > 0) campos[p.slice(0, i).trim()] = p.slice(i + 1).trim();
    });
    return { tipo: m[1], data: m[2], campos: campos, linha: linha };
  }).filter(function (x) { return !!x; });
}

/* ---------------------------------------------------------------------
   5. A rede. Quatro respostas possiveis e cada uma tem texto proprio:
   tabela vazia sem dizer qual delas foi e a pior coisa que esta tela
   poderia fazer, porque parece "ninguem aplicou".
   --------------------------------------------------------------------- */
async function leituraPedir(metodo, corpo) {
  try {
    const opcoes = { method: metodo, headers: { accept: 'application/json' }, cache: 'no-store' };
    if (corpo) {
      opcoes.headers['content-type'] = 'application/json';
      opcoes.body = JSON.stringify(corpo);
    }
    const r = await fetch('/leads', opcoes);
    let dados = null;
    try { dados = await r.json(); } catch (e) { dados = null; }
    // login vencido nao volta em JSON: o Access devolve a pagina de
    // entrada dele, em HTML, e o fetch ja seguiu o desvio
    if (dados === null) return { estado: 'login' };
    if (r.status === 503) return { estado: 'sem_configuracao', mensagem: dados.erro };
    if (r.status === 401) return { estado: 'login' };
    if (!r.ok) return { estado: 'erro', mensagem: dados.erro || ('o servidor respondeu ' + r.status) };
    return { estado: 'ok', dados: dados };
  } catch (e) {
    return { estado: 'sem_servidor' };
  }
}

async function leituraBuscar() {
  LEITURA_BUSCANDO = true;
  LEITURA_ESTADO = 'carregando';
  leituraPintar();
  const r = await leituraPedir('GET', null);
  LEITURA_BUSCANDO = false;
  LEITURA_JA_BUSCOU = true;
  if (r.estado === 'ok') {
    LEITURA_ESTADO = 'ok';
    LEITURA_ERRO = null;
    LEITURA_LEADS = Array.isArray(r.dados.leads) ? r.dados.leads : [];
    LEITURA_QUANDO = new Date().toISOString();
  } else {
    LEITURA_ESTADO = r.estado;
    LEITURA_ERRO = r.mensagem || null;
  }
  leituraPintar();
}

function leituraAtualizar() { LEITURA_JA_BUSCOU = false; return leituraBuscar(); }

// O mesmo estrago explicado do mesmo jeito nos tres lugares que gravam.
function leituraRecadoDeRede(r) {
  if (r.estado === 'sem_servidor') {
    return { tom: 'alerta', titulo: 'A gravação não saiu daqui',
      texto: 'O servidor não respondeu. O que você escreveu continua guardado neste navegador, mas o andamento no servidor não mudou, e quem abrir de outra máquina não vai ver nada. Tente de novo quando a rede voltar.' };
  }
  if (r.estado === 'login') {
    return { tom: 'atencao', titulo: 'Seu login venceu antes de gravar',
      texto: 'Nada foi gravado. Recarregue a página para entrar de novo e repita a ação.' };
  }
  if (r.estado === 'sem_configuracao') {
    return { tom: 'alerta', titulo: 'O login protegido ainda não foi ligado',
      texto: 'Sem ele o servidor não lê nem grava aplicação, e esta tela não registra andamento.' };
  }
  return { tom: 'alerta', titulo: 'O servidor recusou a gravação',
    texto: 'O que ele respondeu foi: ' + esc(r.mensagem || 'sem explicação') + '. O andamento continua como estava.' };
}

/* ---------------------------------------------------------------------
   6. O desenho.
   --------------------------------------------------------------------- */

function leituraHtmlRede() {
  if (LEITURA_ESTADO === 'ok') return '';
  const guardadas = leituraTodas().length;
  // Sem a lista do servidor, as leituras deste navegador continuam
  // inteiras, mas orfas: nome, contato e respostas moram la.
  const orfas = guardadas
    ? '<p style="margin-top:8px">Existem ' + guardadas + ' leituras guardadas neste navegador e nenhuma se perdeu. Sem a lista de aplicações não dá para saber de quem é cada uma: o nome, o contato e as respostas moram no servidor.</p>'
    : '';

  if (LEITURA_ESTADO === 'carregando') {
    return aviso('info', 'Buscando as aplicações no servidor.',
      'São até 500, das mais recentes para as mais antigas. Leva alguns segundos na primeira vez.');
  }
  if (LEITURA_ESTADO === 'sem_servidor') {
    return aviso('alerta', 'Não consegui falar com o servidor.',
      'Se você abriu este arquivo direto do computador, ele não funciona assim: abra pelo endereço publicado, em ideiaquevende.com.br/sistema/. Se já estava nele, foi a rede que falhou.' + orfas) +
      '<button class="bt bt-linha bt-sm" onclick="leituraAtualizar()" style="margin-bottom:18px">Tentar de novo</button>';
  }
  if (LEITURA_ESTADO === 'login') {
    return aviso('atencao', 'Seu login venceu.',
      'O servidor não reconheceu a sua sessão e respondeu com a página de entrada em vez das aplicações. Recarregue a página para entrar de novo.' + orfas);
  }
  if (LEITURA_ESTADO === 'sem_configuracao') {
    return aviso('alerta', 'O Worker ainda não tem o login protegido configurado.',
      'TEAM_DOMAIN e ACCESS_AUD estão vazios, e o servidor recusa entregar aplicação sem eles, de propósito: sem essas duas não há como conferir quem está pedindo. O caminho está no DEPLOY.md.' + orfas);
  }
  return aviso('alerta', 'O servidor recusou o pedido.',
    'O que ele respondeu foi: ' + esc(LEITURA_ERRO || 'sem explicação') + '.' + orfas);
}

function leituraHtmlRecado() {
  if (!LEITURA_RECADO) return '';
  // o recado ja chega pronto de quem o escreveu, e o pedaco que veio de
  // fora ja passou por esc() la: escapar de novo aqui mostraria &amp; na
  // tela no lugar do nome do cliente
  return aviso(LEITURA_RECADO.tom, LEITURA_RECADO.titulo, LEITURA_RECADO.texto);
}

function leituraHtmlAbas() {
  const abas = [
    { k: 'ficha',   nome: 'Ficha da aplicação' },
    { k: 'motivos', nome: 'Motivos das recusas' },
  ];
  return abas.map(function (a) {
    return '<button class="bt bt-sm ' + (LEITURA_ABA === a.k ? 'bt-marca' : 'bt-linha') +
      '" onclick="leituraIrAba(\'' + a.k + '\')">' + esc(a.nome) + '</button>';
  }).join('');
}

function leituraHtmlNumeros() {
  const r = leituraResumo();
  const n = [];
  n.push({ v: r.esperando, l: 'Aplicações sem leitura',
    obs: r.esperaMaisAntiga === null ? 'Nenhuma esperando agora.' : 'A mais antiga chegou ' + leituraDias(r.esperaMaisAntiga) + '.' });
  n.push({ v: r.preparando, l: 'Preparadas, sem assinatura',
    obs: EU.papel === 'gestor' ? 'Esperando a sua assinatura.' : 'Só a gestão assina.' });
  n.push({ v: r.semDevolutiva, l: 'Assinadas, sem devolutiva', puxa: r.semDevolutiva > 0,
    obs: 'Continuam na fila de Minha semana.' });
  n.push({ v: r.aguardando, l: 'Esperando a resposta da pessoa',
    obs: r.envioMaisAntigo === null ? 'Nenhuma devolutiva enviada ainda.' : 'A mais antiga saiu ' + leituraDias(r.envioMaisAntigo) + '.' });

  return '<div class="numeros">' + n.map(function (x) {
    return '<div class="numero' + (x.puxa ? ' puxa' : '') + '">' +
      '<div class="v">' + x.v + '</div><div class="l">' + esc(x.l) + '</div>' +
      '<div class="obs">' + esc(x.obs) + '</div></div>';
  }).join('') + '</div>';
}

function leituraHtmlFila() {
  const ordenadas = LEITURA_LEADS.slice().sort(function (a, b) {
    const pa = leituraFase(a).peso, pb = leituraFase(b).peso;
    if (pa !== pb) return pa - pb;
    const da = data(a.criado_em), db = data(b.criado_em);
    return (da ? da.getTime() : 0) - (db ? db.getTime() : 0);   // mais antiga primeiro
  });
  const mostradas = ordenadas.slice(0, LEITURA_MAX_FILA);

  let linhas = '';
  if (!mostradas.length) {
    linhas = vazio('Nenhuma leitura começou. Escolha uma aplicação em Ideias que chegaram e abra aqui: perfil, estágio, o que falta das oito entregas e o nível indicado. ' +
      'Enquanto ninguém assinar um veredito, nada nesta tela conta como resposta dada à pessoa, e ela continua esperando do outro lado.', 6);
  } else {
    linhas = mostradas.map(function (lead) {
      const f = leituraFase(lead);
      const dias = diasDesde(lead.criado_em);
      const clicado = leituraClicado(lead);
      const aberta = Number(lead.id) === Number(LEITURA_ALVO);
      return '<tr onclick="leituraAbrir(' + Number(lead.id) + ')" style="cursor:pointer' + (aberta ? ';background:var(--o-05)' : '') + '">' +
        '<td style="font-family:var(--display);font-size:19px;font-weight:300;color:' + (dias !== null && dias >= 3 && f.peso <= 3 ? 'var(--alerta)' : 'var(--claro)') + '">' +
          (dias === null ? '?' : dias) + '<span style="font-size:10px;color:var(--tx-4)"> dias</span></td>' +
        '<td><b style="color:var(--claro)">' + esc(lead.nome || 'sem nome') + '</b>' +
          '<div class="dica">' + esc(lead.email || lead.whatsapp || 'sem contato') + '</div></td>' +
        '<td>' + (clicado ? esc(leituraNomeNivel(clicado)) : '<span class="dica">não clicou nível</span>') + '</td>' +
        '<td>' + esc(lead.origem || 'landing') + '</td>' +
        '<td>' + etiqueta(ANDAMENTOS, lead.status) + '</td>' +
        '<td><span class="eti ' + f.eti + '">' + esc(f.nome) + '</span></td>' +
      '</tr>';
    }).join('');
  }

  const sobra = ordenadas.length - mostradas.length;
  const rodape = sobra > 0
    ? '<p class="dica" style="margin-top:12px">Mostrando ' + mostradas.length + ' das ' + ordenadas.length +
      ' aplicações, as que pedem leitura primeiro. A lista inteira está em Ideias que chegaram.</p>'
    : '';

  return '<div class="cartao">' +
    '<div class="cartao-t">A fila da leitura' +
      '<span style="margin-left:auto;font-weight:400;text-transform:none;letter-spacing:0;font-size:11px;color:var(--tx-4)">' +
      (LEITURA_QUANDO ? 'Retrato de ' + esc(dataLonga(LEITURA_QUANDO)) : '') + '</span>' +
      '<button class="bt bt-linha bt-sm" onclick="leituraAtualizar()">Atualizar</button>' +
    '</div>' +
    '<div class="rolo-h"><table class="lista"><thead><tr>' +
      '<th>Espera</th><th>Quem contou a ideia</th><th>Clicou na landing</th><th>Origem</th><th>Andamento</th><th>Leitura</th>' +
    '</tr></thead><tbody>' + linhas + '</tbody></table></div>' +
    '<p class="dica" style="margin-top:12px">A ordem é por quanto dói, não por data de chegada: primeiro o que foi assinado e ainda não teve devolutiva, depois o que está sendo preparado, depois quem nunca foi lido.</p>' +
    '</div>';
}

/* ------------------------------------------------ a coluna da esquerda */

// As respostas saem na ordem em que vieram, e nenhuma pergunta esta
// escrita no codigo. O Typeform vai mudar, e aplicacao velha e aplicacao
// nova precisam conviver na mesma tela sem que ninguem venha aqui mexer.
function leituraHtmlRespostas(lead) {
  const r = lead.respostas || {};
  const chaves = Object.keys(r);
  if (!chaves.length) {
    return '<p class="dica">Esta aplicação chegou sem nenhuma resposta gravada. Isso acontece quando o formulário foi trocado e o envio veio pela metade. A conversa começa pelo contato acima, e vale conferir o webhook do Typeform.</p>';
  }
  return chaves.map(function (pergunta) {
    let v = r[pergunta];
    if (Array.isArray(v)) v = v.join(', ');
    else if (typeof v === 'boolean') v = v ? 'sim' : 'não';
    else if (v && typeof v === 'object') v = JSON.stringify(v);
    const vazia = String(v === null || v === undefined ? '' : v).trim() === '';
    return '<div style="margin-bottom:15px">' +
      '<span class="rotulo">' + esc(pergunta) + '</span>' +
      (vazia
        ? '<span class="dica">não respondeu</span>'
        : '<div style="font-size:13.5px;white-space:pre-wrap;line-height:1.6">' + esc(v) + '</div>') +
      '</div>';
  }).join('');
}

function leituraHtmlAplicacao(lead) {
  const dias = diasDesde(lead.criado_em);
  const clicado = leituraClicado(lead);
  const nivelClicado = clicado ? leituraNivel(clicado) : null;

  const identificacao = '<div style="display:flex;flex-wrap:wrap;gap:10px 22px;margin-bottom:18px">' +
    '<div><span class="rotulo">Nome</span><b style="color:var(--claro);font-size:15px">' + esc(lead.nome || 'sem nome') + '</b></div>' +
    '<div><span class="rotulo">E-mail</span>' + esc(lead.email || 'não deixou') + '</div>' +
    '<div><span class="rotulo">WhatsApp</span>' + esc(lead.whatsapp || 'não deixou') + '</div>' +
    '<div><span class="rotulo">Origem</span>' + esc(lead.origem || 'landing') + '</div>' +
    '<div><span class="rotulo">Clicou na landing</span>' +
      (nivelClicado ? esc(nivelClicado.nome) + ', ' + esc(moeda(nivelClicado.valor)) : 'nenhum nível') + '</div>' +
    '<div><span class="rotulo">Chegou</span>' + esc(dataLonga(lead.criado_em)) +
      (dias === null ? '' : ' <span style="color:' + (dias >= 3 ? 'var(--alerta)' : 'var(--tx-3)') + '">(' + esc(haQuanto(lead.criado_em)) + ')</span>') +
    '</div></div>';

  const esquerda = '<div class="cartao" style="margin:0">' +
    '<div class="cartao-t">O que a pessoa escreveu' +
      '<span style="margin-left:auto">' + etiqueta(ANDAMENTOS, lead.status) + '</span></div>' +
    identificacao +
    '<div style="border-top:1px solid var(--fio);padding-top:16px">' + leituraHtmlRespostas(lead) + '</div>' +
    '<p class="dica" style="margin-top:14px">Nada desta coluna se edita aqui. É o que a pessoa escreveu, e é contra isso que a leitura ao lado vai ser conferida depois.</p>' +
    '</div>';

  return '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(330px,1fr));gap:18px;margin-bottom:18px">' +
    esquerda + leituraHtmlLeitura(lead) + '</div>';
}

/* -------------------------------------------------- a coluna da direita */

function leituraHtmlLeitura(lead) {
  const l = leituraGarantir(lead.id);
  const travada = !!l.assinadaEm && Number(LEITURA_REVENDO) !== Number(lead.id);
  const trava = travada ? ' disabled' : '';

  const opcoes = function (lista, atual, primeira) {
    return '<option value="">' + esc(primeira) + '</option>' + lista.map(function (x) {
      return '<option value="' + esc(x.k) + '"' + (x.k === atual ? ' selected' : '') + '>' + esc(x.nome) + '</option>';
    }).join('');
  };

  const perfilEstagio = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px">' +
    '<div><span class="rotulo">Perfil, entre os seis da landing</span>' +
      '<select class="campo campo-sm"' + trava + ' onchange="leituraCampo(\'perfil\', this.value)">' +
      opcoes(PERFIS, l.perfil, 'ainda não classifiquei') + '</select></div>' +
    '<div><span class="rotulo">Estágio do projeto</span>' +
      '<select class="campo campo-sm"' + trava + ' onchange="leituraCampo(\'estagio\', this.value)">' +
      opcoes(ESTAGIOS, l.estagio, 'ainda não classifiquei') + '</select></div>' +
    '</div>';

  const nivelIndicado = leituraNivel(l.nivelIndicado);
  const fora = leituraForaDoNivel(l);

  const entregas = '<span class="rotulo">O que este caso pede das oito entregas</span>' +
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(215px,1fr));gap:8px;margin-bottom:10px">' +
    ENTREGAS.map(function (e) {
      const marcada = (l.precisa || []).indexOf(e.k) >= 0;
      const descoberta = marcada && fora.indexOf(e.k) >= 0;
      const borda = descoberta ? 'var(--alerta)' : (marcada ? 'var(--o-35)' : 'var(--fio)');
      return '<label style="display:flex;gap:9px;align-items:flex-start;padding:9px 11px;border:1px solid ' + borda +
          ';border-radius:10px;cursor:' + (travada ? 'default' : 'pointer') + '">' +
        '<input type="checkbox"' + (marcada ? ' checked' : '') + trava +
          ' onchange="leituraMarcarEntrega(\'' + e.k + '\', this.checked)" style="margin-top:3px;accent-color:var(--o)">' +
        '<span><b style="color:' + (marcada ? 'var(--claro)' : 'var(--tx-2)') + ';font-size:12.5px;display:block">' +
          esc(e.nome) + '</b>' +
        '<span class="dica">' + esc(nomeFase(e.fase)) + (descoberta ? ', fora do nível indicado' : '') + '</span></span></label>';
    }).join('') + '</div>';

  const sugerido = leituraSugerido(l.precisa);
  const dicaSugestao = (l.precisa || []).length
    ? '<p class="dica" style="margin-bottom:16px">A cobertura sugere ' + esc(leituraNomeNivel(sugerido)) +
      '. A sugestão só olha o escopo: Premium não se sugere sozinho, porque o que o separa do Pro é amplitude de projeto, e isso é leitura de gente.</p>'
    : '<p class="dica" style="margin-bottom:16px">Marque o que o caso pede. É essa marcação que sustenta o nível indicado, e é dela que sai o texto da devolutiva.</p>';

  const clicado = leituraClicado(lead);
  const nivelDoClique = clicado ? leituraNivel(clicado) : null;

  const ladoALado = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">' +
    '<div style="border:1px solid var(--fio);border-radius:10px;padding:12px 14px">' +
      '<span class="rotulo">A pessoa clicou</span>' +
      (nivelDoClique
        ? '<b style="color:var(--claro);font-size:15px">' + esc(nivelDoClique.nome) + '</b><div class="dica">' + esc(moeda(nivelDoClique.valor)) + '</div>'
        : '<b style="color:var(--tx-3);font-size:15px">Nenhum</b><div class="dica">Chegou sem escolher nível.</div>') +
    '</div>' +
    '<div style="border:1px solid var(--o-35);border-radius:10px;padding:12px 14px;background:var(--o-05)">' +
      '<span class="rotulo">A leitura indica</span>' +
      '<select class="campo campo-sm"' + trava + ' onchange="leituraCampo(\'nivelIndicado\', this.value)">' +
        opcoes(leituraNiveis(), l.nivelIndicado, 'ainda não indiquei') + '</select>' +
      (nivelIndicado ? '<div class="dica" style="margin-top:6px">' + esc(moeda(nivelIndicado.valor)) + ', valor de Roteiros e níveis.</div>' : '') +
    '</div></div>';

  let divergencia = '';
  if (leituraDivergente(l, lead)) {
    const dif = nivelIndicado.valor - nivelDoClique.valor;
    const frase = dif > 0
      ? 'A pessoa clicou ' + nivelDoClique.nome + ', ' + moeda(nivelDoClique.valor) + ', e a leitura indica ' + nivelIndicado.nome + ', ' + moeda(nivelIndicado.valor) + '. A diferença de ' + moeda(dif) + ' é a conversa comercial inteira, e é ela que a justificativa precisa sustentar.'
      : dif < 0
        ? 'A leitura indica um nível menor do que o que a pessoa clicou, ' + moeda(-dif) + ' abaixo. Escreva por quê: cobrar menos sem explicar tira do cliente a chance de entender o que ele não está levando.'
        : 'Os dois níveis custam o mesmo, e mesmo assim são escopos diferentes. Escreva o que muda.';
    divergencia = aviso('atencao', 'O nível indicado é diferente do que a pessoa clicou.', esc(frase)) +
      '<span class="rotulo">Justificativa, obrigatória</span>' +
      '<textarea class="campo" style="min-height:80px"' + trava +
        ' onchange="leituraTexto(\'justificativa\', this.value)"' +
        ' placeholder="Por que este caso pede outro nível. Esta frase vai inteira para a devolutiva.">' +
        esc(l.justificativa || '') + '</textarea>';
  }

  let alertaEscopo = '';
  if (fora.length) {
    alertaEscopo = aviso('alerta', 'O nível indicado não cobre tudo que o caso pede.',
      'Ficam de fora: ' + esc(fora.map(nomeEntrega).join(', ')) + '. Ou o nível sobe, ou essas entregas saem da leitura, ou a devolutiva diz por escrito que elas não entram. Vender assim é combinar uma coisa e entregar outra.');
  }

  const dono = '<p class="dica" style="margin-top:16px;border-top:1px solid var(--fio);padding-top:12px">' +
    (l.assinadaEm
      ? 'Preparada por ' + esc(l.preparadaPor || 'sem nome') + ' e assinada por ' + esc(l.assinadaPor || 'sem nome') + ', ' + esc(dataLonga(l.assinadaEm)) + '.'
      : 'Sendo preparada por ' + esc(l.preparadaPor || leituraQuemSou()) + '. Só a gestão assina.') + '</p>';

  return '<div class="cartao" style="margin:0">' +
    '<div class="cartao-t">A leitura' + (travada ? '<span style="margin-left:auto"><span class="eti eti-ok">Assinada</span></span>' : '') + '</div>' +
    perfilEstagio + entregas + dicaSugestao + ladoALado + divergencia + alertaEscopo + dono +
    '</div>';
}

/* ------------------------------------------------------- o veredito */

function leituraHtmlCarimbo(lead) {
  const l = leituraGarantir(lead.id);
  if (!l.veredito) {
    return '<p class="dica">Escolha uma das três portas acima para ver o carimbo que vai para o servidor.</p>';
  }
  const linha = leituraMontarCarimbo(l);
  const nova = leituraObsNova(lead.observacoes, linha);
  const sobra = LEITURA_LIMITE_OBS - nova.texto.length;
  const corte = nova.cortou
    ? aviso('atencao', nova.cortou === 1 ? 'Um carimbo antigo sai para este caber.' : nova.cortou + ' carimbos antigos saem para este caber.',
        'O campo de observações do servidor guarda 2000 caracteres, e o mais antigo sai inteiro em vez de sair pela metade. O que sair não volta.')
    : '';
  return '<div style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;line-height:1.7;' +
      'background:var(--fundo-3);border:1px solid var(--fio);border-radius:10px;padding:12px 14px;overflow-x:auto;white-space:pre">' +
      esc(linha) + '</div>' +
    '<p class="dica" style="margin-top:8px">Esta linha vai para o topo do campo de observações, no servidor. São ' + linha.length +
      ' caracteres dos 2000 do campo, e sobram ' + Math.max(0, sobra) + ' para os próximos. É a única parte desta tela que sobrevive à troca de navegador.</p>' + corte;
}

function leituraHtmlServidor(lead) {
  const carimbos = leituraCarimbos(lead.observacoes);
  const bruto = String(lead.observacoes || '').trim();
  if (!bruto) {
    return '<p class="dica">O campo de observações desta aplicação está vazio no servidor. Nada foi assinado ainda, nem aqui nem em outra máquina.</p>';
  }
  return '<div style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;line-height:1.7;' +
      'background:var(--fundo-3);border:1px solid var(--fio);border-radius:10px;padding:12px 14px;overflow-x:auto;white-space:pre-wrap">' +
      esc(bruto) + '</div>' +
    '<p class="dica" style="margin-top:8px">' + carimbos.length + (carimbos.length === 1 ? ' carimbo, ' : ' carimbos, ') + bruto.length +
      ' dos 2000 caracteres. Atualizado ' + esc(dataLonga(lead.atualizado_em)) + '.</p>';
}

function leituraHtmlVeredito(lead) {
  const l = leituraGarantir(lead.id);
  const assinada = !!l.assinadaEm;
  const revendo = Number(LEITURA_REVENDO) === Number(lead.id);
  const travada = assinada && !revendo;
  const equipe = EU.papel === 'gestor';

  let portas = '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">' +
    LEITURA_VEREDITOS.map(function (v) {
      const escolhida = l.veredito === v.k;
      return '<button class="bt ' + (escolhida ? 'bt-marca' : 'bt-linha') + '"' + (travada ? ' disabled' : '') +
        ' onclick="leituraCampo(\'veredito\', \'' + v.k + '\')">' + esc(v.nome) + '</button>';
    }).join('') + '</div>';

  const escolhido = porChave(LEITURA_VEREDITOS, l.veredito);
  let detalhe = '';
  if (escolhido) {
    detalhe = '<p class="dica" style="margin-bottom:14px">' + esc(escolhido.resumo) +
      ' O andamento no servidor passa a ser ' + esc((porChave(ANDAMENTOS, escolhido.status) || {}).nome || escolhido.status) + '.' +
      (escolhido.k === 'esperar'
        ? ' A lista de andamento do servidor tem seis portas e nenhuma se chama esperar: fica em leitura, e o que precisa acontecer antes vai escrito no carimbo.'
        : '') + '</p>';
  }

  if (l.veredito === 'esperar') {
    detalhe += '<span class="rotulo">O que precisa acontecer antes</span>' +
      '<textarea class="campo" style="min-height:70px"' + (travada ? ' disabled' : '') +
        ' onchange="leituraTexto(\'motivo\', this.value)"' +
        ' placeholder="Uma frase. Exemplo: precisa atender mais três clientes antes de ter método para documentar.">' +
        esc(l.motivo || '') + '</textarea>' +
      '<p class="dica" style="margin:6px 0 14px">Os primeiros 90 caracteres entram no carimbo. Escreva a condição, não o histórico.</p>';
  }
  if (l.veredito === 'fora') {
    detalhe += '<span class="rotulo">Motivo, de lista fechada</span>' +
      '<select class="campo campo-sm"' + (travada ? ' disabled' : '') + ' onchange="leituraCampo(\'motivo\', this.value)" style="margin-bottom:6px">' +
        '<option value="">escolha o motivo</option>' +
        LEITURA_MOTIVOS.map(function (m) {
          return '<option value="' + esc(m.k) + '"' + (l.motivo === m.k ? ' selected' : '') + '>' + esc(m.nome) + '</option>';
        }).join('') + '</select>' +
      '<p class="dica" style="margin-bottom:14px">A lista é fechada porque a aba Motivos soma isto. Campo livre não soma, e a conta que ensina o que corrigir na landing nunca fecharia.</p>';
  }

  let acao = '';
  if (travada) {
    acao = aviso('ok', 'Parecer assinado por ' + esc(l.assinadaPor || 'sem nome') + ', ' + esc(dataLonga(l.assinadaEm)) + '.',
        'O carimbo já está no servidor e não se apaga. Se a leitura mudou, assine de novo: entra um carimbo novo por cima e o anterior continua lá, na ordem.') +
      (equipe
        ? '<button class="bt bt-linha" onclick="leituraRever(' + Number(lead.id) + ')">Rever e assinar de novo</button>'
        : '<p class="dica">Quem assina é a equipe.</p>');
  } else if (!equipe) {
    acao = aviso('info', 'Você prepara, quem assina é a equipe.',
      'Tudo que você escreveu já está guardado neste navegador e aparece para a equipe como preparada. A assinatura é o que muda o andamento no servidor e libera a devolutiva.');
  } else {
    acao = '<button class="bt bt-marca" onclick="leituraAssinar()"' + (LEITURA_GRAVANDO ? ' disabled' : '') + '>' +
      (LEITURA_GRAVANDO ? 'Gravando no servidor' : 'Assinar o parecer') + '</button>' +
      '<p class="dica" style="margin-top:8px">Assinar muda o andamento no servidor e carimba a linha acima em observações. Depois disso, a leitura só sai da fila de Minha semana quando a devolutiva for enviada, recusa incluída.</p>';
  }

  return '<div class="cartao">' +
    '<div class="cartao-t">O veredito, em três portas</div>' +
    portas + detalhe +
    '<div style="margin:16px 0"><span class="rotulo">O carimbo que vai para o servidor</span>' +
      '<div id="leitura-carimbo">' + leituraHtmlCarimbo(lead) + '</div></div>' +
    acao +
    '<div style="margin-top:18px;border-top:1px solid var(--fio);padding-top:16px">' +
      '<span class="rotulo">O que já está gravado no servidor</span>' + leituraHtmlServidor(lead) + '</div>' +
    '</div>';
}

/* ------------------------------------------------------ a devolutiva */

// Os tres modelos saem da propria leitura: nivel, valor, entregas
// marcadas e justificativa. Modelo que nao usa o que foi lido obriga a
// pessoa a reescrever tudo, e ai ninguem usa modelo nenhum.
function leituraModelo(qual) {
  const lead = leituraLead(LEITURA_ALVO);
  if (!lead) return;
  const l = leituraGarantir(lead.id);
  const nome = leituraPrimeiroNome(lead.nome);
  const nivel = leituraNivel(l.nivelIndicado);
  const pede = (l.precisa || []).map(nomeEntrega);
  const clicado = leituraClicado(lead);
  let t = '';

  if (qual === 'seguir') {
    t = 'Oi ' + nome + ', lemos o seu caso com calma.\n\n' +
      (nivel
        ? 'Pelo que você contou, o caminho é o nível ' + nivel.nome + ', ' + moeda(nivel.valor) + '.'
        : 'Pelo que você contou, o seu projeto cabe no método.') +
      (pede.length ? ' O que ele estrutura primeiro no seu projeto é: ' + pede.join(', ') + '.' : '') + '\n\n' +
      (leituraDivergente(l, lead)
        ? 'Você indicou o nível ' + leituraNomeNivel(clicado) + ' e a nossa leitura indica ' + (nivel ? nivel.nome : 'outro') + '. ' +
          (l.justificativa ? l.justificativa : 'O motivo é o escopo que o seu caso pede.') + '\n\n'
        : '') +
      'A avaliação existe para isso: em vez de vender o pacote que você clicou, olhamos o seu momento antes. Se fizer sentido, eu te mando o próximo passo e a condição de pagamento, em até 12x no PIX ou boleto.';
  } else if (qual === 'esperar') {
    t = 'Oi ' + nome + ', lemos o seu caso com calma.\n\n' +
      'Você tem o que é preciso para estruturar, e ainda não é a hora. ' +
      (l.motivo ? l.motivo : 'Falta uma coisa acontecer antes.') + '\n\n' +
      'Preferimos falar isso agora a começar um projeto que ia travar no meio. Quando isso estiver de pé, me chama que a gente retoma daqui, sem começar do zero.';
  } else {
    const m = porChave(LEITURA_MOTIVOS, l.motivo);
    t = 'Oi ' + nome + ', lemos o seu caso com calma e vou ser direta com você.\n\n' +
      (m ? m.frase : 'O seu projeto está fora do que o método faz hoje.') + '\n\n' +
      'Preferimos dizer isso agora a vender uma estruturação que não ia resolver o seu problema. Se o seu momento mudar, a porta continua aberta.';
  }

  l.devolutiva.texto = t;
  leituraSalvar(l);
  leituraPintar();
}

function leituraHtmlDevolutiva(lead) {
  const l = leituraGarantir(lead.id);
  const assinada = !!l.assinadaEm;
  const enviada = !!(l.devolutiva && l.devolutiva.enviadaEm);

  const modelos = '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">' +
    [['seguir', 'Modelo: cabe no método'], ['esperar', 'Modelo: ainda não é a hora'], ['fora', 'Modelo: não é para o método']]
      .map(function (m) {
        return '<button class="bt bt-sm ' + (l.veredito === m[0] ? 'bt-marca' : 'bt-linha') + '"' + (enviada ? ' disabled' : '') +
          ' onclick="leituraModelo(\'' + m[0] + '\')">' + esc(m[1]) + '</button>';
      }).join('') + '</div>';

  const canal = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:12px 0">' +
    '<div><span class="rotulo">Canal</span><select class="campo campo-sm"' + (enviada ? ' disabled' : '') +
      ' onchange="leituraCampo(\'canal\', this.value)">' +
      LEITURA_CANAIS.map(function (c) {
        return '<option value="' + esc(c.k) + '"' + (l.devolutiva.canal === c.k ? ' selected' : '') + '>' + esc(c.nome) + '</option>';
      }).join('') + '</select>' +
      '<p class="dica" style="margin-top:6px">' +
      (l.devolutiva.canal === 'whatsapp'
        ? (lead.whatsapp ? esc(lead.whatsapp) : 'Esta pessoa não deixou WhatsApp.')
        : (lead.email ? esc(lead.email) : 'Esta pessoa não deixou e-mail.')) + '</p></div>' +
    '<div><span class="rotulo">Quem envia</span>' +
      '<div style="padding:7px 0;font-size:13px;color:var(--claro)">' + esc(enviada ? (l.devolutiva.enviadaPor || 'sem nome') : leituraQuemSou()) + '</div>' +
      '<p class="dica">O envio é feito por fora, no canal escolhido. Aqui se registra que saiu.</p></div>' +
    '</div>';

  let acao;
  if (enviada) {
    acao = aviso('ok', 'Devolutiva enviada por ' + esc(l.devolutiva.enviadaPor || 'sem nome') + ', ' + esc(dataLonga(l.devolutiva.enviadaEm)) + '.',
      'Esta leitura saiu da fila de Minha semana. O carimbo do retorno está no servidor, então quem abrir de outra máquina também vê que a pessoa já teve resposta.');
  } else if (!assinada) {
    acao = aviso('info', 'A devolutiva sai depois do veredito assinado.',
      'Você pode escrever e guardar o texto agora. O registro do envio só abre depois da assinatura, para nenhuma resposta sair sem parecer por trás.');
  } else {
    acao = '<button class="bt bt-marca" onclick="leituraRegistrarEnvio()"' + (LEITURA_GRAVANDO ? ' disabled' : '') + '>' +
      (LEITURA_GRAVANDO ? 'Gravando no servidor' : 'Registrar que a devolutiva saiu') + '</button>' +
      '<p class="dica" style="margin-top:8px">Assinado ' + esc(haQuanto(l.assinadaEm)) +
      ' e a pessoa ainda não teve resposta. Enquanto este botão não for usado, esta leitura continua na fila de Minha semana.</p>';
  }

  return '<div class="cartao">' +
    '<div class="cartao-t">A devolutiva' + (enviada ? '<span style="margin-left:auto"><span class="eti eti-ok">Enviada</span></span>' : '') + '</div>' +
    modelos +
    '<textarea class="campo" style="min-height:200px"' + (enviada ? ' disabled' : '') +
      ' onchange="leituraTexto(\'devolutiva\', this.value)"' +
      ' placeholder="O texto que a pessoa vai ler. Comece por um dos modelos e ajuste para o caso dela.">' +
      esc(l.devolutiva.texto || '') + '</textarea>' +
    canal + acao +
    '</div>';
}

/* --------------------------------------------------- abrir o projeto */

function leituraHtmlProjeto(lead) {
  const l = leituraGarantir(lead.id);
  const projeto = leituraTemProjeto(lead.id);

  if (projeto) {
    return '<div class="cartao">' +
      '<div class="cartao-t">O projeto</div>' +
      aviso('ok', 'Projeto aberto, com o rótulo ' + esc(projeto.rotulo || 'sem rótulo') + '.',
        'Nível contratado ' + esc(leituraNomeNivel(projeto.nivelContratado) || projeto.nivelContratado) + ', ' + esc(moeda(projeto.valor)) +
        ', produto pronto prometido para ' + esc(dataCurta(projeto.produtoProntoEm)) + '. As oito entregas nasceram com o escopo congelado e o checklist copiado do roteiro daquele dia.') +
      '<button class="bt bt-linha" onclick="irPara(\'projetos\')">Ver em Projetos em estruturação</button>' +
      '</div>';
  }

  if (l.veredito !== 'seguir' || !l.assinadaEm) {
    return '';
  }

  if (!l.devolutiva.enviadaEm) {
    return '<div class="cartao">' +
      '<div class="cartao-t">O projeto</div>' +
      '<p class="dica">Projeto nasce de um aceite, e aceite vem depois da devolutiva. Registre o envio acima, e quando a pessoa responder que sim, o botão de abrir projeto aparece aqui.</p>' +
      '</div>';
  }

  if (EU.papel !== 'gestor') {
    return '<div class="cartao">' +
      '<div class="cartao-t">O projeto</div>' +
      aviso('info', 'Quem abre o projeto é a equipe.',
        'Aqui entram valor contratado e data prometida, pelo mesmo motivo de quem assina o parecer. Avise a equipe que a pessoa aceitou.') +
      '</div>';
  }

  if (!LEITURA_ABRIR_PROJETO) {
    return '<div class="cartao">' +
      '<div class="cartao-t">O projeto</div>' +
      '<p class="dica" style="margin-bottom:14px">Devolutiva enviada ' + esc(haQuanto(l.devolutiva.enviadaEm)) +
        '. Quando a pessoa responder que aceita, o projeto nasce daqui, e de nenhum outro lugar.</p>' +
      '<button class="bt bt-marca" onclick="leituraFormProjeto(true)">A pessoa aceitou, abrir projeto</button>' +
      '</div>';
  }

  const niveis = leituraNiveis();
  const pessoas = (iqvLer(CHAVES.usuarios, []) || []).filter(function (u) { return u.ativo !== false && u.papel !== 'cliente'; });
  const prazo = new Date();
  prazo.setDate(prazo.getDate() + 90);

  const semPessoa = pessoas.length ? '' :
    '<p class="dica" style="margin-top:6px">Ninguém está cadastrado em A casa ainda. Sem responsável, este projeto não aparece na semana de ninguém.</p>';

  return '<div class="cartao">' +
    '<div class="cartao-t">Abrir o projeto</div>' +
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px;margin-bottom:16px">' +
      '<div><span class="rotulo">Nível de fato contratado</span>' +
        '<select class="campo campo-sm" id="leitura-contratado">' +
        niveis.map(function (n) {
          return '<option value="' + esc(n.k) + '"' + (n.k === l.nivelIndicado ? ' selected' : '') + '>' +
            esc(n.nome) + ', ' + esc(moeda(n.valor)) + '</option>';
        }).join('') + '</select>' +
        '<p class="dica" style="margin-top:6px">Pode ser diferente do indicado. O que vale para o escopo e para o dinheiro é este.</p></div>' +
      '<div><span class="rotulo">Responsável</span>' +
        '<select class="campo campo-sm" id="leitura-responsavel">' +
        '<option value="">ainda não defini</option>' +
        pessoas.map(function (u) {
          return '<option value="' + esc(u.id) + '">' + esc(u.nome || u.email) + '</option>';
        }).join('') + '</select>' + semPessoa + '</div>' +
      '<div><span class="rotulo">Produto pronto em, obrigatório</span>' +
        '<input type="date" class="campo campo-sm" id="leitura-pronto" value="' + esc(prazo.toISOString().slice(0, 10)) + '">' +
        '<p class="dica" style="margin-top:6px">É a promessa de prazo, e é ela que o cliente vê na tela dele.</p></div>' +
      '<div><span class="rotulo">Condição de pagamento</span>' +
        '<div style="display:flex;gap:8px">' +
          '<select class="campo campo-sm" id="leitura-parcelas">' +
          LEITURA_PARCELAS.map(function (n) {
            return '<option value="' + n + '"' + (n === 1 ? ' selected' : '') + '>' + (n === 1 ? 'à vista' : n + 'x') + '</option>';
          }).join('') + '</select>' +
          '<select class="campo campo-sm" id="leitura-forma">' +
          LEITURA_FORMAS.map(function (f) { return '<option value="' + esc(f.k) + '">' + esc(f.nome) + '</option>'; }).join('') +
          '</select>' +
        '</div>' +
        '<p class="dica" style="margin-top:6px">As parcelas nascem com data e valor, e a baixa de cada uma é manual em Contratado e recebido.</p></div>' +
    '</div>' +
    '<button class="bt bt-marca" onclick="leituraCriarProjeto()"' + (LEITURA_GRAVANDO ? ' disabled' : '') + '>' +
      (LEITURA_GRAVANDO ? 'Gravando no servidor' : 'Abrir projeto') + '</button> ' +
    '<button class="bt bt-linha" onclick="leituraFormProjeto(false)">Cancelar</button>' +
    '<p class="dica" style="margin-top:10px">Abrir o projeto congela o escopo do nível contratado nas oito entregas e copia o checklist dos roteiros de hoje. Editar o roteiro depois não mexe mais neste projeto, que é o que faz o combinado de um contrato não mudar no meio.</p>' +
    '</div>';
}

/* ---------------------------------------------------- a aba Motivos */

function leituraHtmlMotivos() {
  const todas = leituraTodas().filter(function (l) { return !!l.assinadaEm; });
  const recusas = todas.filter(function (l) { return l.veredito === 'fora'; });

  if (!recusas.length) {
    return '<div class="cartao"><div class="cartao-t">Motivos das recusas</div>' +
      '<p class="dica">Nenhuma recusa assinada ainda. Esta aba soma as leituras que terminaram em não é para o método, por perfil e por estágio, e é o que mostra quem a landing está atraindo sem que o método atenda. Ela se enche sozinha conforme os vereditos forem assinados na aba Ficha da aplicação.</p></div>';
  }

  const conta = function (lista, campo) {
    return lista.map(function (item) {
      const doGrupo = todas.filter(function (l) { return l[campo] === item.k; });
      const fora = doGrupo.filter(function (l) { return l.veredito === 'fora'; });
      return { nome: item.nome, total: doGrupo.length, fora: fora.length };
    }).filter(function (x) { return x.total > 0; })
      .sort(function (a, b) { return b.fora - a.fora; });
  };

  const tabela = function (titulo, cabeca, linhas) {
    return '<div class="cartao"><div class="cartao-t">' + esc(titulo) + '</div>' +
      '<div class="rolo-h"><table class="lista"><thead><tr><th>' + esc(cabeca) +
      '</th><th>Leituras assinadas</th><th>Não seguimos</th><th>A leitura disso</th></tr></thead><tbody>' +
      linhas.map(function (x) {
        const parte = x.total ? Math.round((x.fora / x.total) * 100) : 0;
        const frase = x.fora === 0 ? 'Nenhuma recusa.'
          : x.fora === x.total ? 'Todas as ' + x.total + ' foram recusadas.'
          : x.fora + ' de cada ' + x.total + ' não seguiram.';
        return '<tr><td><b style="color:var(--claro)">' + esc(x.nome) + '</b></td>' +
          '<td>' + x.total + '</td>' +
          '<td style="color:' + (parte >= 50 ? 'var(--alerta)' : 'var(--tx-2)') + '">' + x.fora + '</td>' +
          '<td class="dica">' + esc(frase) + '</td></tr>';
      }).join('') + '</tbody></table></div></div>';
  };

  const porMotivo = LEITURA_MOTIVOS.map(function (m) {
    return { nome: m.nome, quantas: recusas.filter(function (l) { return l.motivo === m.k; }).length };
  }).filter(function (x) { return x.quantas > 0; }).sort(function (a, b) { return b.quantas - a.quantas; });

  const cabecalho = '<div class="numeros">' +
    '<div class="numero"><div class="v">' + todas.length + '</div><div class="l">Leituras assinadas</div>' +
      '<div class="obs">Desde o primeiro parecer deste navegador.</div></div>' +
    '<div class="numero puxa"><div class="v">' + recusas.length + '</div><div class="l">Não seguimos</div>' +
      '<div class="obs">' + Math.round((recusas.length / todas.length) * 100) + ' de cada 100 aplicações lidas.</div></div>' +
    '</div>';

  const motivos = '<div class="cartao"><div class="cartao-t">Por motivo</div>' +
    '<div class="rolo-h"><table class="lista"><thead><tr><th>Motivo</th><th>Quantas</th></tr></thead><tbody>' +
    porMotivo.map(function (x) {
      return '<tr><td>' + esc(x.nome) + '</td><td><b style="color:var(--claro)">' + x.quantas + '</b></td></tr>';
    }).join('') + '</tbody></table></div></div>';

  return cabecalho +
    tabela('Por perfil', 'Perfil', conta(PERFIS, 'perfil')) +
    tabela('Por estágio', 'Estágio', conta(ESTAGIOS, 'estagio')) +
    motivos +
    '<div class="cartao">' + aviso('info', 'Perfil que recusa muito não é perfil ruim.',
      'É perfil que a landing atrai e o método não atende, e isso se corrige na landing. ' +
      'Esta conta olha só as leituras assinadas neste navegador.') + '</div>';
}

/* --------------------------------------------- a ficha, montada inteira */

// Parecer assinado em outra maquina chega so como carimbo. Nao da para
// fingir que a leitura inteira voltou, e nao da para ignorar: o certo e
// dizer o que sobrou e trazer isso de volta a pedido.
function leituraHtmlImportar(lead) {
  const parecer = leituraCarimbos(lead.observacoes).filter(function (c) { return c.tipo === 'PARECER'; })[0];
  if (!parecer) return '';
  const local = leituraDa(lead.id);
  if (local && local.assinadaEm) return '';
  return aviso('info', 'Esta aplicação já tem parecer assinado, e não foi neste navegador.',
      'Assinado em ' + esc(dataCurta(parecer.data)) + ' por ' + esc(parecer.campos.por || 'sem nome') +
      ', com veredito ' + esc(parecer.campos.veredito || 'sem veredito') + '. O resto da leitura ficou no navegador de quem escreveu.') +
    '<button class="bt bt-linha bt-sm" onclick="leituraTrazerCarimbo()" style="margin-bottom:18px">Trazer o parecer para este navegador</button>';
}

function leituraHtmlNenhuma() {
  if (!LEITURA_LEADS.length) return '';
  if (leituraTodas().length) {
    return '<div class="cartao"><p class="dica">Escolha uma linha da fila para abrir a ficha.</p></div>';
  }
  return '<div class="cartao"><p class="dica">Nenhuma leitura começou. Escolha uma aplicação em Ideias que chegaram.</p></div>';
}

function leituraHtmlFicha() {
  if (LEITURA_ESTADO !== 'ok') return '';
  const cabeca = leituraHtmlNumeros() + leituraHtmlFila();
  const lead = leituraLead(LEITURA_ALVO);
  if (!lead) return cabeca + leituraHtmlNenhuma();

  const topo = '<div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;flex-wrap:wrap">' +
    '<b style="font-family:var(--display);font-weight:300;font-size:19px;color:var(--claro)">Ficha de ' + esc(lead.nome || 'sem nome') + '</b>' +
    '<button class="bt bt-linha bt-sm" style="margin-left:auto" onclick="leituraFechar()">Fechar a ficha</button></div>';

  return cabeca + topo + leituraHtmlImportar(lead) + leituraHtmlAplicacao(lead) +
    leituraHtmlVeredito(lead) + leituraHtmlDevolutiva(lead) + leituraHtmlProjeto(lead);
}

/* ---------------------------------------------------------------------
   7. O que os botoes fazem.
   --------------------------------------------------------------------- */

function leituraIrAba(k) { LEITURA_ABA = k; LEITURA_RECADO = null; leituraPintar(); }

// Porta de entrada desta tela, e tambem o que a tela Ideias que chegaram
// chama no botao "Abrir leitura do caso".
function leituraAbrir(id) {
  LEITURA_ALVO = Number(id);
  LEITURA_ABA = 'ficha';
  LEITURA_ABRIR_PROJETO = false;
  LEITURA_REVENDO = null;
  LEITURA_RECADO = null;
  if (TELA_ATUAL !== 'leitura') { irPara('leitura'); return; }
  leituraPintar();
}

function leituraFechar() {
  LEITURA_ALVO = null;
  LEITURA_ABRIR_PROJETO = false;
  LEITURA_REVENDO = null;
  leituraPintar();
}

function leituraRever(id) { LEITURA_REVENDO = Number(id); LEITURA_RECADO = null; leituraPintar(); }

function leituraCampo(campo, valor) {
  const lead = leituraLead(LEITURA_ALVO);
  if (!lead) return;
  const l = leituraGarantir(lead.id);
  if (campo === 'canal') l.devolutiva.canal = valor;
  else if (campo === 'veredito') {
    // motivo quer dizer coisas diferentes em cada porta: chave de lista
    // fechada na recusa, condicao escrita em esperar. Carregar um para o
    // outro carimbaria bobagem no servidor.
    if (l.veredito !== valor) l.motivo = '';
    l.veredito = valor;
  } else l[campo] = valor;
  leituraSalvar(l);
  leituraPintar();
}

// Campo de texto grava sem redesenhar a tela: quem ainda esta escrevendo
// ao lado perderia o cursor no meio da frase.
function leituraTexto(campo, valor) {
  const lead = leituraLead(LEITURA_ALVO);
  if (!lead) return;
  const l = leituraGarantir(lead.id);
  if (campo === 'devolutiva') l.devolutiva.texto = valor;
  else l[campo] = valor;
  leituraSalvar(l);
  escrever('leitura-carimbo', leituraHtmlCarimbo(lead));
}

function leituraMarcarEntrega(k, marcado) {
  const lead = leituraLead(LEITURA_ALVO);
  if (!lead) return;
  const l = leituraGarantir(lead.id);
  const tem = l.precisa.indexOf(k);
  if (marcado && tem < 0) l.precisa.push(k);
  if (!marcado && tem >= 0) l.precisa.splice(tem, 1);
  // o nivel indicado sobe sozinho quando o caso passa a pedir entrega que
  // ele nao cobre, e nunca desce: tirar escopo do que ja foi indicado e
  // decisao comercial, e essa ninguem toma por clique em caixinha.
  if (l.precisa.length && (!l.nivelIndicado || leituraForaDoNivel(l).length)) {
    l.nivelIndicado = leituraSugerido(l.precisa);
  }
  leituraSalvar(l);
  leituraPintar();
}

function leituraAplicarResposta(dado) {
  const lead = leituraLead(dado && dado.id);
  if (!lead) return;
  lead.status = dado.status;
  lead.observacoes = dado.observacoes;
  lead.atualizado_em = dado.atualizado_em;
}

// O que impede uma assinatura, em ordem de quem pergunta primeiro.
function leituraFalta(l, lead) {
  if (!l.perfil) return 'Escolha o perfil entre os seis da landing. Ele vai no carimbo e é o que a aba Motivos soma depois.';
  if (!l.estagio) return 'Escolha o estágio do projeto. Sem ele, a conta de quem a landing atrai e o método não atende fica pela metade.';
  if (!l.veredito) return 'Escolha uma das três portas do veredito.';
  if (l.veredito === 'seguir' && !(l.precisa || []).length) return 'Marque o que este caso pede das oito entregas. Cabe no método sem nenhuma entrega marcada não é uma leitura, é um sim solto.';
  if (l.veredito === 'seguir' && !l.nivelIndicado) return 'Indique o nível. É o valor dele que vai para a devolutiva e para o contrato.';
  if (leituraDivergente(l, lead) && !String(l.justificativa || '').trim()) return 'Escreva a justificativa. O nível indicado é diferente do que a pessoa clicou, e essa diferença é a conversa comercial inteira.';
  if (l.veredito === 'esperar' && !String(l.motivo || '').trim()) return 'Escreva o que precisa acontecer antes. Sem isso, a pessoa recebe um talvez e não sabe o que fazer com ele.';
  if (l.veredito === 'fora' && !l.motivo) return 'Escolha o motivo da recusa na lista.';
  return null;
}

async function leituraAssinar() {
  const lead = leituraLead(LEITURA_ALVO);
  if (!lead) return;
  const l = leituraGarantir(lead.id);

  if (EU.papel !== 'gestor') {
    LEITURA_RECADO = { tom: 'info', titulo: 'Quem assina é a equipe.',
      texto: 'A leitura que você preparou já está guardada e aparece para a equipe como preparada.' };
    leituraPintar(); return;
  }
  const falta = leituraFalta(l, lead);
  if (falta) {
    LEITURA_RECADO = { tom: 'atencao', titulo: 'Falta uma coisa antes de assinar', texto: esc(falta) };
    leituraPintar(); return;
  }

  const porta = porChave(LEITURA_VEREDITOS, l.veredito);
  const nova = leituraObsNova(lead.observacoes, leituraMontarCarimbo(l));

  LEITURA_GRAVANDO = true; LEITURA_RECADO = null; leituraPintar();
  const r = await leituraPedir('PATCH', { id: Number(lead.id), status: porta.status, observacoes: nova.texto });
  LEITURA_GRAVANDO = false;

  if (r.estado !== 'ok') { LEITURA_RECADO = leituraRecadoDeRede(r); leituraPintar(); return; }

  leituraAplicarResposta(r.dados.lead);
  if (!l.preparadaPor) l.preparadaPor = leituraQuemSou();
  l.assinadaPor = leituraQuemSou();
  l.assinadaEm = new Date().toISOString();
  leituraSalvar(l);
  LEITURA_REVENDO = null;
  LEITURA_RECADO = { tom: 'ok', titulo: 'Parecer assinado e carimbado no servidor.',
    texto: 'O andamento agora é ' + esc((porChave(ANDAMENTOS, porta.status) || {}).nome || porta.status) +
      '. A pessoa ainda não sabe de nada: quem conta é a devolutiva, e até ela sair esta leitura continua na fila de Minha semana.' };
  leituraPintar();
}

async function leituraRegistrarEnvio() {
  const lead = leituraLead(LEITURA_ALVO);
  if (!lead) return;
  const l = leituraGarantir(lead.id);

  if (!l.assinadaEm) {
    LEITURA_RECADO = { tom: 'atencao', titulo: 'O parecer ainda não foi assinado.',
      texto: 'Nenhuma resposta sai daqui sem veredito assinado por trás. Peça a assinatura da equipe primeiro.' };
    leituraPintar(); return;
  }
  if (!String(l.devolutiva.texto || '').trim()) {
    LEITURA_RECADO = { tom: 'atencao', titulo: 'Escreva o texto da devolutiva.',
      texto: 'Comece por um dos três modelos, que já saem preenchidos com o nível, o valor e as entregas desta leitura, e ajuste para o caso da pessoa.' };
    leituraPintar(); return;
  }

  const linha = 'RETORNO ' + hoje() + ' | canal: ' + leituraLimpo(l.devolutiva.canal, 20) + ' | por: ' + leituraLimpo(leituraQuemSou(), 40);
  const nova = leituraObsNova(lead.observacoes, linha);
  const corpo = { id: Number(lead.id), observacoes: nova.texto };
  // recusa continua em Nao seguimos agora. O retorno saiu, e dizer que uma
  // recusa virou "retorno enviado" apagaria o desfecho no servidor.
  if (l.veredito !== 'fora') corpo.status = 'proposta';

  LEITURA_GRAVANDO = true; LEITURA_RECADO = null; leituraPintar();
  const r = await leituraPedir('PATCH', corpo);
  LEITURA_GRAVANDO = false;

  if (r.estado !== 'ok') { LEITURA_RECADO = leituraRecadoDeRede(r); leituraPintar(); return; }

  leituraAplicarResposta(r.dados.lead);
  l.devolutiva.enviadaPor = leituraQuemSou();
  l.devolutiva.enviadaEm = new Date().toISOString();
  leituraSalvar(l);
  LEITURA_RECADO = { tom: 'ok', titulo: 'Devolutiva registrada.',
    texto: l.veredito === 'seguir'
      ? 'Esta leitura saiu da fila de Minha semana e passou a esperar a resposta da pessoa. Quando ela aceitar, o projeto nasce aqui embaixo.'
      : 'Esta leitura saiu da fila de Minha semana. A pessoa teve resposta, que é o que a landing promete.' };
  leituraPintar();
}

function leituraFormProjeto(abrir) { LEITURA_ABRIR_PROJETO = !!abrir; LEITURA_RECADO = null; leituraPintar(); }

function leituraTrazerCarimbo() {
  const lead = leituraLead(LEITURA_ALVO);
  if (!lead) return;
  const carimbos = leituraCarimbos(lead.observacoes);
  const parecer = carimbos.filter(function (c) { return c.tipo === 'PARECER'; })[0];
  if (!parecer) return;
  const retorno = carimbos.filter(function (c) { return c.tipo === 'RETORNO'; })[0];
  const l = leituraGarantir(lead.id);
  const c = parecer.campos;

  if (porChave(PERFIS, c.perfil)) l.perfil = c.perfil;
  if (porChave(LEITURA_VEREDITOS, c.veredito)) l.veredito = c.veredito;
  if (c.nivel && leituraNivel(c.nivel)) l.nivelIndicado = c.nivel;
  if (c.motivo && porChave(LEITURA_MOTIVOS, c.motivo)) l.motivo = c.motivo;
  else if (c.falta) l.motivo = c.falta;
  l.preparadaPor = l.preparadaPor || c.por || '';
  l.assinadaPor = c.por || 'outro navegador';
  // o carimbo guarda o dia, nao a hora: meio-dia e o que da para dizer sem inventar
  l.assinadaEm = parecer.data + 'T12:00:00Z';
  if (retorno) {
    if (porChave(LEITURA_CANAIS, retorno.campos.canal)) l.devolutiva.canal = retorno.campos.canal;
    l.devolutiva.enviadaPor = retorno.campos.por || '';
    l.devolutiva.enviadaEm = retorno.data + 'T12:00:00Z';
  }
  leituraSalvar(l);
  LEITURA_RECADO = { tom: 'ok', titulo: 'Parecer trazido do servidor.',
    texto: 'Voltou o que cabe em uma linha: perfil, veredito, nível e quem assinou. O estágio, as entregas que o caso pede e o texto da devolutiva ficaram no navegador de quem escreveu, e não têm como voltar.' };
  leituraPintar();
}

/* ------------------------------------------- o projeto nasce daqui */

function leituraDia(d) {
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return d.getFullYear() + '-' + mes + '-' + dia;
}

// O checklist e copiado no dia em que o projeto nasce. Editar o roteiro
// depois nao mexe em projeto aberto, e e isso que faz o combinado de um
// contrato nao mudar no meio do caminho.
function leituraChecklist(k) {
  const m = iqvLer(CHAVES.metodo, null);
  const r = m && m.roteiros && m.roteiros[k];
  // O roteiro guarda em definicaoPronto. O checklist e a queda para dado
  // gravado antes desta correcao, para nao esvaziar projeto que ja existe.
  const itens = (r && Array.isArray(r.definicaoPronto)) ? r.definicaoPronto
              : (r && Array.isArray(r.checklist)) ? r.checklist : [];
  return itens
    .map(function (t) { return String(t).trim(); })
    .filter(function (t) { return t; })
    .map(function (t) { return { texto: t, feito: false }; });
}

function leituraParcelasNovas(valor, n, forma) {
  const base = Math.floor(valor / n);
  const primeira = new Date();
  primeira.setDate(primeira.getDate() + 5);
  // dia 29, 30 e 31 nao existem em todo mes, e vencimento que pula de mes
  // sozinho vira cobranca no dia errado. O mais tarde que serve para todos
  // os meses e o 28.
  const dia = Math.min(primeira.getDate(), 28);
  const lista = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(primeira.getFullYear(), primeira.getMonth() + i, dia);
    lista.push({
      n: i + 1, vencimento: leituraDia(d),
      valor: (i === n - 1) ? valor - base * (n - 1) : base,
      forma: forma, pagoEm: null,
    });
  }
  return lista;
}

async function leituraCriarProjeto() {
  const lead = leituraLead(LEITURA_ALVO);
  if (!lead) return;
  const l = leituraGarantir(lead.id);

  if (EU.papel !== 'gestor') {
    LEITURA_RECADO = { tom: 'info', titulo: 'Quem abre o projeto é a equipe.', texto: 'Aqui entram valor contratado e data prometida.' };
    leituraPintar(); return;
  }
  if (leituraTemProjeto(lead.id)) {
    LEITURA_RECADO = { tom: 'atencao', titulo: 'Esta aplicação já virou projeto.', texto: 'Ele está em Projetos em estruturação, e abrir de novo criaria dois projetos para o mesmo cliente.' };
    leituraPintar(); return;
  }

  const campo = function (id) { const e = porId(id); return e ? e.value : ''; };
  const nivel = leituraNivel(campo('leitura-contratado') || l.nivelIndicado);
  const responsavelId = campo('leitura-responsavel');
  const pronto = campo('leitura-pronto');
  const quantas = Number(campo('leitura-parcelas')) || 1;
  const forma = campo('leitura-forma') || 'pix';

  if (!nivel) {
    LEITURA_RECADO = { tom: 'atencao', titulo: 'Escolha o nível contratado.', texto: 'É dele que saem o valor e o escopo das oito entregas.' };
    leituraPintar(); return;
  }
  if (!pronto) {
    LEITURA_RECADO = { tom: 'atencao', titulo: 'A data do produto pronto é obrigatória.',
      texto: 'Ela é a promessa de prazo, é o que o cliente vê na tela dele e é dela que sai o atraso em Minha semana. Projeto sem essa data nasce sem combinado.' };
    leituraPintar(); return;
  }

  const linha = 'PROJETO ' + hoje() + ' | nivel: ' + nivel.k + ' | pronto: ' + pronto + ' | por: ' + leituraLimpo(leituraQuemSou(), 40);
  const nova = leituraObsNova(lead.observacoes, linha);

  LEITURA_GRAVANDO = true; LEITURA_RECADO = null; leituraPintar();
  const r = await leituraPedir('PATCH', { id: Number(lead.id), status: 'ganho', observacoes: nova.texto });
  LEITURA_GRAVANDO = false;

  if (r.estado !== 'ok') { LEITURA_RECADO = leituraRecadoDeRede(r); leituraPintar(); return; }
  leituraAplicarResposta(r.dados.lead);

  const agora = new Date();
  const id = 'p' + Date.now().toString(36);
  const projeto = {
    id: id, leadId: Number(lead.id),
    // primeiro nome e mes, o unico dado repetido de proposito: e assim que
    // a equipe chama o projeto em voz alta
    rotulo: leituraPrimeiroNome(lead.nome) + ', ' + LEITURA_MESES[agora.getMonth()] + '/' + String(agora.getFullYear()).slice(2),
    cliente: lead.nome || '', email: lead.email || '', whatsapp: lead.whatsapp || '',
    perfil: l.perfil, nivelClicado: leituraClicado(lead), nivelContratado: nivel.k, valor: nivel.valor,
    responsavelId: responsavelId, inicio: hoje(), produtoProntoEm: pronto,
    fase: 1, etapa: 1,
    bola: { lado: 'casa', desde: hoje() },
    entregas: ENTREGAS.map(function (e) {
      return {
        k: e.k,
        // congelado aqui dentro: e o escopo daquele contrato, e nao uma
        // consulta ao nivel feita na hora de desenhar a tela
        noEscopo: nivel.escopo.indexOf(e.k) >= 0,
        estado: 'nao_comecou', responsavelId: responsavelId, prazo: null,
        checklist: leituraChecklist(e.k), campos: {}, links: [],
        enviadaEm: null, aprovadaEm: null,
      };
    }),
  };

  const projetos = iqvLer(CHAVES.projetos, []) || [];
  projetos.push(projeto);
  if (!iqvGravar(CHAVES.projetos, projetos)) {
    LEITURA_RECADO = { tom: 'alerta', titulo: 'O andamento foi para ganho, mas o projeto não coube neste navegador.',
      texto: 'O servidor já registrou o aceite e o armazenamento local recusou a gravação. Abra a tela A casa para ver o espaço ocupado e tente de novo, antes de escrever qualquer entrega.' };
    leituraPintar(); return;
  }

  const recebimentos = iqvLer(CHAVES.recebimentos, []) || [];
  recebimentos.push({ projetoId: id, parcelas: leituraParcelasNovas(nivel.valor, quantas, forma) });
  const gravouDinheiro = iqvGravar(CHAVES.recebimentos, recebimentos);

  LEITURA_ABRIR_PROJETO = false;
  LEITURA_RECADO = { tom: 'ok', titulo: 'Projeto aberto, com o rótulo ' + esc(projeto.rotulo) + '.',
    texto: 'As oito entregas nasceram com o escopo do ' + esc(nivel.nome) + ' congelado e o checklist copiado dos roteiros de hoje. ' +
      (gravouDinheiro ? quantas + ' parcelas já esperam baixa em Contratado e recebido.' : 'As parcelas não couberam no armazenamento e precisam ser lançadas à mão.') };
  leituraPintar();
}

/* ---------------------------------------------------------------------
   8. O desenho, que reescreve a tela inteira a partir do que esta
   guardado. Nada aqui depende do que ja estava na tela.
   --------------------------------------------------------------------- */
function leituraPintar() {
  // aplicacao que sumiu da lista depois de um Atualizar nao pode deixar
  // meia ficha aberta na tela
  if (LEITURA_ALVO !== null && LEITURA_ESTADO === 'ok' && !leituraLead(LEITURA_ALVO)) LEITURA_ALVO = null;

  escrever('leitura-rede', leituraHtmlRede());
  escrever('leitura-recado', leituraHtmlRecado());
  escrever('leitura-abas', leituraHtmlAbas());
  escrever('leitura-corpo', LEITURA_ABA === 'motivos' ? leituraHtmlMotivos() : leituraHtmlFicha());

  // o numero no menu e o trabalho parado nesta tela: preparada esperando
  // assinatura, e assinada esperando devolutiva
  const r = leituraResumo();
  contador('leitura', r.preparando + r.semDevolutiva);
}

DESENHO.leitura = function () {
  leituraPintar();
  // busca uma vez ao entrar. Depois so no botao Atualizar: lista que se
  // renova sozinha no meio de uma leitura troca a ficha embaixo de quem
  // esta escrevendo.
  if (!LEITURA_JA_BUSCOU && !LEITURA_BUSCANDO) leituraBuscar();
};
