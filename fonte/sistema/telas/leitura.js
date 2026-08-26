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

// Os niveis com o valor que a Equipe editou em Roteiros e niveis. Nivel
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
  return !!(clicado && l.nivelIndicado && l.nivelIndicado !== clicado);
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

function leituraAtualizar() { LEITURA_JA_BUSCOU = false; leituraBuscar(); }

// O mesmo estrago explicado do mesmo jeito nos tres lugares que gravam.
function leituraRecadoDeRede(r) {
  if (r.estado === 'sem_servidor') {
    return { tom: 'alerta', titulo: 'A gravação não saiu daqui',
      texto: 'O servidor não respondeu. O que você escreveu continua guardado neste navegador, mas o andamento no servidor não mudou, e quem abrir de outra máquina não vai ver nada. Tente de novo quando a rede voltar.' };
  }
  if (r.estado === 'login') {
    return { tom: 'atencao', titulo: 'Seu login venceu antes de gravar',
      texto: 'Nada foi gravado no servidor. Recarregue a página para entrar de novo e repita a ação. Se continuar aparecendo, saia do login protegido em /cdn-cgi/access/logout e entre outra vez.' };
  }
  if (r.estado === 'sem_configuracao') {
    return { tom: 'alerta', titulo: 'O Worker ainda não tem o login protegido configurado',
      texto: 'TEAM_DOMAIN e ACCESS_AUD estão vazios, e por isso o servidor recusa ler e gravar aplicação, de propósito. Enquanto isso não for resolvido, esta tela não tem como registrar andamento nenhum. O passo a passo está no DEPLOY.md.' };
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
  return aviso(LEITURA_RECADO.tom, esc(LEITURA_RECADO.titulo), LEITURA_RECADO.texto);
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
    obs: r.esperaMaisAntiga === null ? 'Nenhuma esperando agora.' : 'A mais antiga espera há ' + r.esperaMaisAntiga + ' dias.' });
  n.push({ v: r.preparando, l: 'Preparadas, sem assinatura',
    obs: EU.papel === 'equipe' ? 'Esperando a sua assinatura.' : 'Só a equipe assina.' });
  n.push({ v: r.semDevolutiva, l: 'Assinadas, sem devolutiva', puxa: r.semDevolutiva > 0,
    obs: 'Continuam na fila de Minha semana.' });
  n.push({ v: r.aguardando, l: 'Esperando a resposta da pessoa',
    obs: r.envioMaisAntigo === null ? 'Nenhuma devolutiva enviada ainda.' : 'A mais antiga saiu há ' + r.envioMaisAntigo + ' dias.' });

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
        '<td style="font-family:var(--display);font-size:19px;font-weight:300;color:' + (dias !== null && dias >= 3 && f.peso <= 3 ? 'var(--alerta)' : 'var(--branco)') + '">' +
          (dias === null ? '?' : dias) + '<span style="font-size:10px;color:var(--tinta-4)"> dias</span></td>' +
        '<td><b style="color:var(--branco)">' + esc(lead.nome || 'sem nome') + '</b>' +
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
      '<span style="margin-left:auto;font-weight:400;text-transform:none;letter-spacing:0;font-size:11px;color:var(--tinta-4)">' +
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
    '<div><span class="rotulo">Nome</span><b style="color:var(--branco);font-size:15px">' + esc(lead.nome || 'sem nome') + '</b></div>' +
    '<div><span class="rotulo">E-mail</span>' + esc(lead.email || 'não deixou') + '</div>' +
    '<div><span class="rotulo">WhatsApp</span>' + esc(lead.whatsapp || 'não deixou') + '</div>' +
    '<div><span class="rotulo">Origem</span>' + esc(lead.origem || 'landing') + '</div>' +
    '<div><span class="rotulo">Clicou na landing</span>' +
      (nivelClicado ? esc(nivelClicado.nome) + ', ' + esc(moeda(nivelClicado.valor)) : 'nenhum nível') + '</div>' +
    '<div><span class="rotulo">Chegou</span>' + esc(dataLonga(lead.criado_em)) +
      (dias === null ? '' : ' <span style="color:' + (dias >= 3 ? 'var(--alerta)' : 'var(--tinta-3)') + '">(' + esc(haQuanto(lead.criado_em)) + ')</span>') +
    '</div></div>';

  const esquerda = '<div class="cartao" style="margin:0">' +
    '<div class="cartao-t">O que a pessoa escreveu' +
      '<span style="margin-left:auto">' + etiqueta(ANDAMENTOS, lead.status) + '</span></div>' +
    identificacao +
    '<div style="border-top:1px solid var(--linha);padding-top:16px">' + leituraHtmlRespostas(lead) + '</div>' +
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
      const borda = descoberta ? 'var(--alerta)' : (marcada ? 'var(--o-35)' : 'var(--linha)');
      return '<label style="display:flex;gap:9px;align-items:flex-start;padding:9px 11px;border:1px solid ' + borda +
          ';border-radius:10px;cursor:' + (travada ? 'default' : 'pointer') + '">' +
        '<input type="checkbox"' + (marcada ? ' checked' : '') + trava +
          ' onchange="leituraMarcarEntrega(\'' + e.k + '\', this.checked)" style="margin-top:3px;accent-color:var(--o)">' +
        '<span><b style="color:' + (marcada ? 'var(--branco)' : 'var(--tinta-2)') + ';font-size:12.5px;display:block">' +
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
    '<div style="border:1px solid var(--linha);border-radius:10px;padding:12px 14px">' +
      '<span class="rotulo">A pessoa clicou</span>' +
      (nivelDoClique
        ? '<b style="color:var(--branco);font-size:15px">' + esc(nivelDoClique.nome) + '</b><div class="dica">' + esc(moeda(nivelDoClique.valor)) + '</div>'
        : '<b style="color:var(--tinta-3);font-size:15px">Nenhum</b><div class="dica">Chegou sem escolher nível.</div>') +
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

  const dono = '<p class="dica" style="margin-top:16px;border-top:1px solid var(--linha);padding-top:12px">' +
    (l.assinadaEm
      ? 'Preparada por ' + esc(l.preparadaPor || 'sem nome') + ' e assinada por ' + esc(l.assinadaPor || 'sem nome') + ', ' + esc(dataLonga(l.assinadaEm)) + '.'
      : 'Sendo preparada por ' + esc(l.preparadaPor || leituraQuemSou()) + '. Só a equipe assina.') + '</p>';

  return '<div class="cartao" style="margin:0">' +
    '<div class="cartao-t">A leitura' + (travada ? '<span style="margin-left:auto"><span class="eti eti-ok">Assinada</span></span>' : '') + '</div>' +
    perfilEstagio + entregas + dicaSugestao + ladoALado + divergencia + alertaEscopo + dono +
    '</div>';
}
