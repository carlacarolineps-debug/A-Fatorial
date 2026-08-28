/* =====================================================================
   Ideias que chegaram  ·  a fila de quem ainda nao teve resposta

   Esta e a unica tela que conversa com a rede: GET /leads para ler as
   aplicacoes e PATCH /leads para gravar o andamento. Nome, contato e
   respostas nao se editam aqui, sao o que a pessoa escreveu.

   Duas decisoes que explicam quase todo o arquivo:

   1. A ordem e por tempo de espera, nao por data de chegada. A aplicacao
      de seis dias atras e a que doi, e ela some do topo se a lista for
      ordenada pelo que chegou por ultimo.
   2. As respostas do formulario sao desenhadas na ordem em que vieram,
      sem nenhuma pergunta escrita no codigo. O Typeform vai mudar, e
      aplicacao velha e aplicacao nova precisam conviver na mesma tela.
   ===================================================================== */

// Depois destes tres andamentos a pessoa ja recebeu retorno, entao o
// relogio da espera para. Antes deles, ela continua esperando do outro
// lado, mesmo que a mesa ja tenha mexido no caso.
const IDEIAS_RESPONDIDOS = ['proposta', 'ganho', 'perdido'];

// Origens conhecidas. Origem que a casa nao conhece aparece do jeito que
// veio, escapada: inventar rotulo esconderia campanha nova.
const IDEIAS_ORIGENS = [
  { k: 'landing',   nome: 'Landing' },
  { k: 'indicacao', nome: 'Indicação' },
];

const IDEIAS_COLUNAS = 7;

const IDEIAS = {
  estado: 'ocioso',   // ocioso | carregando | ok | erro
  itens: [],
  lidoEm: null,
  falha: null,        // o estado de rede, quando a leitura nao completou
  aviso: null,        // uma gravacao que o servidor recusou
  abertos: {},
  salvando: {},
  rascunho: {},       // anotacao digitada e ainda nao gravada
  busca: '',
  filtro: '',
};

/* ---------------------------------------------------------------------
   Contas da fila.
   --------------------------------------------------------------------- */

function ideiasEsperando(l) {
  return IDEIAS_RESPONDIDOS.indexOf(l.status || 'novo') < 0;
}

function ideiasDiasEspera(l) {
  const n = diasDesde(l.criado_em);
  return n === null ? 0 : Math.max(0, n);
}

// Quem espera vem primeiro, do mais antigo para o mais novo. Depois vem
// quem ja teve resposta, do retorno mais recente para o mais velho.
function ideiasOrdenar(lista) {
  return lista.slice().sort(function (a, b) {
    const ea = ideiasEsperando(a), eb = ideiasEsperando(b);
    if (ea !== eb) return ea ? -1 : 1;
    if (ea) return ideiasDiasEspera(b) - ideiasDiasEspera(a);
    const da = data(b.atualizado_em || b.criado_em), db = data(a.atualizado_em || a.criado_em);
    return (da ? da.getTime() : 0) - (db ? db.getTime() : 0);
  });
}

// Os niveis podem ter sido editados em Roteiros e niveis. O que vale para
// a mesa e o valor de la, nao o valor que o codigo trouxe de fabrica.
function ideiasNiveis() {
  const m = iqvLer(CHAVES.metodo, null);
  return (m && Array.isArray(m.niveis) && m.niveis.length) ? m.niveis : NIVEIS_DEFAULT;
}

function ideiasNivel(plano) {
  const k = String(plano || '').trim().toLowerCase();
  if (!k) return null;
  return ideiasNiveis().find(function (n) {
    return n.k === k || String(n.nome || '').toLowerCase() === k;
  }) || null;
}

function ideiasSoDigitos(v) { return String(v || '').replace(/\D/g, ''); }

// Valor de resposta do formulario. Pergunta de multipla escolha volta em
// lista, e escolha unica volta em texto: as duas precisam virar uma linha.
function ideiasValor(v) {
  if (v === null || v === undefined) return '';
  if (Array.isArray(v)) return v.join(', ');
  if (typeof v === 'object') { try { return JSON.stringify(v); } catch (e) { return ''; } }
  return String(v);
}

// Tudo que a busca varre, inclusive o que a pessoa escreveu. Procurar pelo
// assunto da ideia e mais util que procurar pelo nome de quem escreveu.
function ideiasPalheiro(l) {
  const partes = [l.nome, l.email, l.whatsapp, l.plano, l.origem];
  const respostas = l.respostas || {};
  Object.keys(respostas).forEach(function (p) {
    partes.push(p);
    partes.push(ideiasValor(respostas[p]));
  });
  return partes.join(' ').toLowerCase();
}

/* ---------------------------------------------------------------------
   O que este navegador sabe sobre o caso.

   O andamento fica no servidor e o projeto fica no localStorage de quem
   abriu. Os dois discordarem e normal e nao e defeito, mas precisa estar
   escrito na tela: senao alguem passa a manha procurando um projeto que
   existe no computador do colega.
   --------------------------------------------------------------------- */
function ideiasApoio() {
  return {
    projetos: iqvLer(CHAVES.projetos, []) || [],
    leituras: iqvLer(CHAVES.leituras, []) || [],
  };
}

function ideiasAchar(lista, id) {
  return (lista || []).find(function (x) { return Number(x.leadId) === Number(id); }) || null;
}

/* ---------------------------------------------------------------------
   Conversa com o servidor.
   --------------------------------------------------------------------- */

function ideiasParar(tom, titulo, texto_) {
  IDEIAS.estado = 'erro';
  IDEIAS.falha = { tom: tom, titulo: titulo, texto: texto_ };
  ideiasDesenhar();
}

async function ideiasCarregar() {
  IDEIAS.estado = 'carregando';
  IDEIAS.falha = null;
  IDEIAS.aviso = null;
  ideiasDesenhar();

  let r;
  try {
    r = await fetch('/leads', { headers: { accept: 'application/json' }, cache: 'no-store' });
  } catch (e) {
    // Sem servidor: arquivo aberto direto do computador, ou rede fora.
    ideiasParar('alerta', 'Não consegui falar com o servidor.',
      'As aplicações moram no servidor, não neste navegador. ' +
      'Se você abriu este arquivo direto do computador, entre pelo endereço publicado, em ideiaquevende.com.br/sistema/. ' +
      'Se já estava nele, foi a rede que caiu: peça para buscar de novo.');
    return;
  }

  // A resposta nem sempre e JSON. Quando o login do Access vence, o que
  // volta e a pagina de login em HTML, e ler aquilo como JSON estoura. O
  // estouro apareceria como erro sem nome para quem so precisava
  // recarregar a pagina.
  let corpo = null;
  try { corpo = await r.json(); } catch (e) { corpo = null; }

  if (corpo === null) {
    ideiasParar('atencao', 'Seu login venceu.',
      'O servidor devolveu a página de login no lugar das aplicações. Recarregue esta página para entrar de novo. ' +
      'Se continuar aparecendo, <a href="/cdn-cgi/access/logout">saia do login protegido</a> e entre outra vez.');
    return;
  }

  if (r.status === 503) {
    // De proposito: sem TEAM_DOMAIN e ACCESS_AUD nao ha como conferir
    // login nenhum, e deixar passar seria pior que fechar.
    ideiasParar('atencao', 'O login protegido ainda não foi ligado.',
      'Enquanto ele não existir, a lista fica fechada: abrir agora deixaria as aplicações à vista de ' +
      'qualquer um que soubesse o endereço.');
    return;
  }

  if (r.status === 401) {
    ideiasParar('atencao', 'O servidor não reconheceu a sua sessão.',
      'Você chegou até ele, mas o login protegido não validou o seu acesso. Recarregue a página para entrar de novo. ' +
      'Se você entrou por outro endereço da empresa, é preciso entrar de novo por este.');
    return;
  }

  if (!r.ok || !corpo.ok) {
    ideiasParar('alerta', 'O servidor recusou o pedido.',
      'Ele respondeu ' + r.status + ' e disse: "' + esc(corpo.erro || 'sem explicação') + '". ' +
      'Nada foi perdido: as aplicações continuam no banco. Peça para buscar de novo e, se repetir, avise quem cuida da publicação.');
    return;
  }

  IDEIAS.itens = Array.isArray(corpo.leads) ? corpo.leads : [];
  IDEIAS.lidoEm = new Date().toISOString();
  IDEIAS.estado = 'ok';
  ideiasDesenhar();
}

// Grava no servidor e mostra na hora. Esperar a resposta para so entao
// mexer na tela deixa a lista com cara de travada, e quem esta na mesa
// clica de novo achando que nao pegou. Se o servidor recusar, a tela volta
// para o que ele tem, com o motivo escrito.
async function ideiasGravar(id, mudanca) {
  const lead = IDEIAS.itens.find(function (l) { return l.id === id; });
  if (!lead) return false;

  const antes = { status: lead.status, observacoes: lead.observacoes };
  Object.assign(lead, mudanca);
  IDEIAS.salvando[id] = true;
  IDEIAS.aviso = null;

  // Anotacao grava ao sair do campo, e sair do campo costuma ser um clique
  // no botao ao lado. Refazer a tabela agora trocaria o botao debaixo do
  // dedo e o clique se perderia no caminho: aqui so a linha de estado muda,
  // e a tabela inteira espera a resposta do servidor.
  const soAnotacao = mudanca.observacoes !== undefined && mudanca.status === undefined;
  if (soAnotacao) texto('ideias-nota-estado-' + id, 'Gravando no servidor.');
  else ideiasDesenhar();

  let deuCerto = false;
  let motivo = '';
  try {
    const r = await fetch('/leads', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(Object.assign({ id: id }, mudanca)),
    });
    let corpo = null;
    try { corpo = await r.json(); } catch (e) { corpo = null; }

    if (corpo === null) motivo = 'Seu login venceu no meio do caminho. Recarregue a página e faça de novo.';
    else if (r.ok && corpo.ok) { deuCerto = true; Object.assign(lead, corpo.lead || {}); }
    else motivo = String(corpo.erro || ('o servidor respondeu ' + r.status));
  } catch (e) {
    motivo = 'Não consegui falar com o servidor. Confira a rede e faça de novo.';
  }

  if (deuCerto) {
    if (mudanca.observacoes !== undefined) delete IDEIAS.rascunho[id];
  } else {
    Object.assign(lead, antes);
    // O motivo vem do servidor e nem sempre termina em ponto. Costurar as
    // duas frases sem isso deixa o aviso com cara de frase quebrada.
    const dito = esc(motivo).replace(/[.:;,\s]*$/, '') + '.';
    IDEIAS.aviso = {
      tom: 'alerta', titulo: 'A mudança não foi gravada.',
      texto: dito + ' ' + (soAnotacao
        ? 'A anotação continua escrita no campo e ainda não está no servidor. Saia do campo de novo para tentar mais uma vez.'
        : 'O andamento voltou para o que o servidor tem, para ninguém contar com uma resposta que só existe nesta tela.'),
    };
  }

  delete IDEIAS.salvando[id];
  ideiasDesenhar();
  return deuCerto;
}

function ideiasMudarAndamento(id, valor) { ideiasGravar(id, { status: valor }); }

// A anotacao grava quando a pessoa sai do campo. Um botao a mais aqui
// competiria com o unico botao que importa nesta tela, que e abrir a
// leitura do caso.
function ideiasAnotar(id) {
  const campo = porId('ideias-nota-' + id);
  const lead = IDEIAS.itens.find(function (l) { return l.id === id; });
  if (!campo || !lead) return;
  if (campo.value === String(lead.observacoes || '')) { delete IDEIAS.rascunho[id]; return; }
  IDEIAS.rascunho[id] = campo.value;
  ideiasGravar(id, { observacoes: campo.value });
}

/* ---------------------------------------------------------------------
   Comandos da tela.
   --------------------------------------------------------------------- */

function ideiasBuscar(v) { IDEIAS.busca = String(v || ''); ideiasDesenhar(); }
function ideiasFiltrar(v) { IDEIAS.filtro = String(v || ''); ideiasDesenhar(); }

function ideiasAlternar(id) {
  if (IDEIAS.abertos[id]) delete IDEIAS.abertos[id];
  else IDEIAS.abertos[id] = true;
  ideiasDesenhar();
}

// A leitura do caso e outra tela, escrita em outro arquivo. O combinado
// entre as duas e uma variavel so, gravada por atribuicao e nunca
// declarada aqui: no build as telas viram um script unico, e o mesmo nome
// declarado duas vezes derrubaria o sistema inteiro na abertura. Se a
// leitura ignorar o combinado, ela abre vazia e ninguem quebra.
function ideiasAbrirLeitura(id) {
  const lead = IDEIAS.itens.find(function (l) { return l.id === id; });
  if (!lead) return;
  window.LEAD_EM_LEITURA = lead;
  irPara('leitura');
}

/* ---------------------------------------------------------------------
   Desenho.
   --------------------------------------------------------------------- */

function ideiasEsperaCelula(l) {
  if (!ideiasEsperando(l)) {
    return '<span class="eti eti-neutra">Respondida</span>' +
           '<div class="dica" style="margin-top:6px">' + esc(haQuanto(l.atualizado_em || l.criado_em)) + '</div>';
  }
  const d = ideiasDiasEspera(l);
  // A landing nao promete prazo por escrito, entao o corte e o combinado
  // da mesa: dois dias ainda e dentro, do terceiro em diante aperta, e do
  // sexto em diante a pessoa ja desistiu de esperar.
  const cor = d >= 6 ? 'var(--alerta)' : d >= 3 ? 'var(--atencao)' : 'var(--o)';
  const valor = d === 0 ? 'hoje' : String(d);
  const rotulo = d === 0 ? 'sem resposta ainda' : d === 1 ? 'dia esperando' : 'dias esperando';
  return '<div style="font-family:var(--display);font-size:23px;font-weight:300;line-height:1;color:' + cor + '">' +
         valor + '</div><div class="dica" style="margin-top:6px">' + rotulo + '</div>';
}

function ideiasContatoCelula(l) {
  const linhas = [];
  if (l.email) linhas.push('<a href="mailto:' + esc(l.email) + '">' + esc(l.email) + '</a>');
  if (l.whatsapp) {
    linhas.push('<a href="https://wa.me/' + esc(ideiasSoDigitos(l.whatsapp)) + '" target="_blank" rel="noopener">' +
                esc(l.whatsapp) + '</a>');
  }
  if (!linhas.length) return '<span class="dica">não deixou contato</span>';
  return '<div style="font-size:12.5px;line-height:1.8">' + linhas.join('<br>') + '</div>';
}

function ideiasNivelCelula(l) {
  if (!l.plano) return '<span class="dica">não clicou nível</span>';
  const n = ideiasNivel(l.plano);
  if (!n) return '<span class="eti eti-neutra">' + esc(l.plano) + '</span>';
  return '<span class="eti eti-marca">' + esc(n.nome) + '</span>' +
         '<div class="dica" style="margin-top:6px">' + esc(moeda(n.valor)) + '</div>';
}

function ideiasOrigemCelula(l) {
  // Aplicacao sem origem escrita veio pelo formulario da landing, que e o
  // unico caminho publicado ate hoje.
  const k = String(l.origem || 'landing').trim().toLowerCase();
  const o = porChave(IDEIAS_ORIGENS, k);
  return '<span style="font-size:12.5px;color:var(--tx-2)">' + esc(o ? o.nome : l.origem) + '</span>';
}

// A linha embaixo do nome: o que este navegador tem sobre o caso.
function ideiasSituacaoLocal(l, apoio) {
  const projeto = ideiasAchar(apoio.projetos, l.id);
  if (projeto) {
    return '<div class="dica" style="margin-top:4px">projeto aberto: ' + esc(projeto.rotulo || projeto.cliente || '') + '</div>';
  }
  if ((l.status || 'novo') === 'ganho') {
    return '<div class="dica" style="margin-top:4px;color:var(--alerta)">virou projeto, e o projeto não está neste navegador</div>';
  }
  const leitura = ideiasAchar(apoio.leituras, l.id);
  if (leitura && leitura.assinadaEm) {
    return '<div class="dica" style="margin-top:4px">leitura assinada por ' + esc(leitura.assinadaPor || 'alguém da equipe') + '</div>';
  }
  if (leitura) return '<div class="dica" style="margin-top:4px">leitura começou, sem veredito</div>';
  return '';
}

function ideiasRespostasHtml(l) {
  const pares = Object.keys(l.respostas || {});
  if (!pares.length) {
    return '<p class="dica">Esta aplicação chegou sem nenhum campo preenchido. ' +
           'O contato acima é tudo o que temos dela.</p>';
  }
  // Na ordem em que vieram, e sem nenhuma pergunta escrita no codigo: o
  // formulario muda, e a aplicacao de marco precisa continuar legivel ao
  // lado da aplicacao de hoje.
  return pares.map(function (p) {
    const v = ideiasValor(l.respostas[p]);
    return '<div style="margin-bottom:13px">' +
           '<span class="rotulo">' + esc(p) + '</span>' +
           (v ? '<div style="font-size:13px;color:var(--tx);white-space:pre-wrap">' + esc(v) + '</div>'
              : '<div class="dica">não respondeu</div>') +
           '</div>';
  }).join('');
}

function ideiasDetalhe(l, apoio) {
  const salvando = !!IDEIAS.salvando[l.id];
  const rascunho = IDEIAS.rascunho[l.id];
  const nota = rascunho === undefined ? String(l.observacoes || '') : rascunho;
  const pendente = rascunho !== undefined && rascunho !== String(l.observacoes || '');
  const quantas = Object.keys(l.respostas || {}).length;
  const projeto = ideiasAchar(apoio.projetos, l.id);
  const leitura = ideiasAchar(apoio.leituras, l.id);

  let sob = '';
  if (projeto) sob = 'Este caso já virou projeto. Abrir a leitura mostra o que foi decidido.';
  else if (leitura) sob = 'A leitura deste caso já começou.';
  else sob = 'Perfil, estágio, o que o caso pede das oito entregas e o nível indicado ficam lá.';

  return '<tr><td colspan="' + IDEIAS_COLUNAS + '" style="background:var(--fundo-3);padding:22px 18px">' +
    '<div style="display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);gap:26px">' +

      '<div>' +
        '<div class="cartao-t">O que a pessoa escreveu' +
          (quantas ? '<span class="eti eti-neutra">' + quantas + (quantas === 1 ? ' resposta' : ' respostas') + '</span>' : '') +
        '</div>' +
        ideiasRespostasHtml(l) +
      '</div>' +

      '<div>' +
        '<div class="cartao-t">Anotação da mesa</div>' +
        '<textarea class="campo" id="ideias-nota-' + l.id + '" onblur="ideiasAnotar(' + l.id + ')"' +
          ' placeholder="O que ficou combinado, o que você descobriu, quando retomar."' +
          ' style="min-height:104px">' + esc(nota) + '</textarea>' +
        '<p class="dica" id="ideias-nota-estado-' + l.id + '" style="margin-top:8px">' +
          (salvando ? 'Gravando no servidor.'
           : pendente ? 'Esta anotação ainda não foi gravada. Ela grava quando você sai do campo.'
           : 'Grava quando você sai do campo. É o único campo desta tela que fica no servidor, ' +
             'então a mesa inteira lê o mesmo texto, e é aqui que a leitura do caso carimba o parecer.') +
        '</p>' +

        '<div style="margin-top:16px">' +
          '<button class="bt bt-marca bt-sm" onclick="ideiasAbrirLeitura(' + l.id + ')">Abrir leitura do caso</button>' +
          '<p class="dica" style="margin-top:8px">' + esc(sob) + '</p>' +
        '</div>' +

        '<p class="dica" style="margin-top:16px">Contou a ideia em ' + esc(dataLonga(l.criado_em)) +
          '. Última mudança de andamento em ' + esc(dataLonga(l.atualizado_em || l.criado_em)) + '.</p>' +
      '</div>' +

    '</div></td></tr>';
}

function ideiasLinha(l, apoio) {
  const salvando = !!IDEIAS.salvando[l.id];
  const aberto = !!IDEIAS.abertos[l.id];
  const andamento = l.status || 'novo';

  const opcoes = ANDAMENTOS.map(function (a) {
    return '<option value="' + a.k + '"' + (a.k === andamento ? ' selected' : '') + '>' + esc(a.nome) + '</option>';
  }).join('');

  return '<tr>' +
    '<td>' + ideiasEsperaCelula(l) + '</td>' +
    '<td><div style="font-weight:600;color:var(--claro)">' + esc(l.nome || 'não disse o nome') + '</div>' +
      ideiasSituacaoLocal(l, apoio) + '</td>' +
    '<td>' + ideiasContatoCelula(l) + '</td>' +
    '<td>' + ideiasNivelCelula(l) + '</td>' +
    '<td>' + ideiasOrigemCelula(l) + '</td>' +
    '<td><select class="campo campo-sm" style="min-width:158px" onchange="ideiasMudarAndamento(' + l.id + ', this.value)"' +
      (salvando ? ' disabled' : '') + '>' + opcoes + '</select></td>' +
    '<td style="text-align:right"><button class="bt bt-linha bt-sm" onclick="ideiasAlternar(' + l.id + ')">' +
      (aberto ? 'Fechar' : 'Ver o que escreveu') + '</button></td>' +
  '</tr>' + (aberto ? ideiasDetalhe(l, apoio) : '');
}

// O que estiver digitado e ainda nao gravado nao pode sumir porque alguem
// mexeu na busca: a tabela e refeita inteira a cada desenho.
function ideiasGuardarRascunhos() {
  Object.keys(IDEIAS.abertos).forEach(function (id) {
    const campo = porId('ideias-nota-' + id);
    if (!campo) return;
    const lead = IDEIAS.itens.find(function (l) { return String(l.id) === String(id); });
    // Texto igual ao que o servidor ja tem nao e rascunho, e guardar isso
    // faria a tela avisar de uma gravacao pendente que nao existe.
    if (lead && campo.value === String(lead.observacoes || '')) delete IDEIAS.rascunho[id];
    else IDEIAS.rascunho[id] = campo.value;
  });
}

function ideiasFrase(esperando, respondidas) {
  if (IDEIAS.estado === 'erro') {
    return ['Não consegui mostrar as aplicações <b>agora</b>.',
            'O aviso abaixo diz o que aconteceu e o que fazer. Nada se perdeu: as aplicações continuam no banco.'];
  }
  if (IDEIAS.estado !== 'ok') {
    return ['Buscando as aplicações no <b>servidor</b>.',
            'Elas moram no banco, atrás do login protegido, e não neste navegador.'];
  }
  if (!IDEIAS.itens.length) {
    return ['Nenhuma ideia chegou <b>ainda</b>.',
            'O formulário da landing grava direto aqui, e a primeira resposta aparece nesta tela.'];
  }
  if (!esperando.length) {
    return ['Ninguém está esperando <b>resposta</b>.',
            respondidas.length + (respondidas.length === 1 ? ' aplicação chegou e já teve retorno.'
                                                           : ' aplicações chegaram e todas já tiveram retorno.')];
  }
  const dias = ideiasDiasEspera(esperando[0]);
  const quem = String(esperando[0].nome || 'a primeira da fila').split(' ')[0];
  return [
    '<b>' + esperando.length + '</b>' + (esperando.length === 1 ? ' pessoa contou a ideia e ainda espera resposta.'
                                                                : ' pessoas contaram a ideia e ainda esperam resposta.'),
    (dias === 0 ? 'A mais antiga chegou hoje' : 'A mais antiga espera há ' + dias + (dias === 1 ? ' dia' : ' dias')) +
    ', é ' + esc(quem) + ', e ela abre a lista.',
  ];
}

function ideiasNumerosHtml(esperando, respondidas) {
  const sete = Date.now() - 7 * 86400000;
  const recentes = IDEIAS.itens.filter(function (l) {
    const d = data(l.criado_em);
    return d && d.getTime() >= sete;
  }).length;
  const comNivel = IDEIAS.itens.filter(function (l) { return !!l.plano; }).length;
  const ganhos = IDEIAS.itens.filter(function (l) { return l.status === 'ganho'; }).length;
  const dias = esperando.length ? ideiasDiasEspera(esperando[0]) : 0;

  const bloco = function (classe, valor, rotulo, obs) {
    return '<div class="numero' + classe + '"><div class="v">' + valor + '</div>' +
           '<div class="l">' + rotulo + '</div>' +
           (obs ? '<div class="obs">' + obs + '</div>' : '') + '</div>';
  };

  return bloco(esperando.length ? ' puxa' : '', esperando.length, 'Esperando resposta',
               'de ' + IDEIAS.itens.length + ' que chegaram') +
    bloco('', esperando.length ? (dias === 0 ? 'hoje' : dias + (dias === 1 ? ' dia' : ' dias')) : 'ninguém',
          'A mais antiga espera',
          esperando.length ? esc(esperando[0].nome || 'sem nome') : 'a fila está limpa') +
    bloco('', recentes, 'Chegaram em 7 dias', comNivel + ' clicaram um nível na landing') +
    bloco('', respondidas.length, 'Já tiveram resposta',
          ganhos + (ganhos === 1 ? ' virou projeto' : ' viraram projeto'));
}

function ideiasDesenhar() {
  const corpo = porId('ideias-corpo');
  if (!corpo) return;

  ideiasGuardarRascunhos();

  const esperando = ideiasOrdenar(IDEIAS.itens.filter(ideiasEsperando));
  const respondidas = IDEIAS.itens.filter(function (l) { return !ideiasEsperando(l); });

  // A frase de cima
  const frase = ideiasFrase(esperando, respondidas);
  escrever('ideias-frase', frase[0]);
  escrever('ideias-frase-obs', frase[1]);

  // Os numeros olham a mesa inteira, nunca o filtro
  const caixaNumeros = porId('ideias-numeros');
  if (caixaNumeros) {
    caixaNumeros.hidden = !(IDEIAS.estado === 'ok' && IDEIAS.itens.length);
    if (!caixaNumeros.hidden) caixaNumeros.innerHTML = ideiasNumerosHtml(esperando, respondidas);
  }

  // Estado da conversa com o servidor, e a data do retrato
  escrever('ideias-estado',
    IDEIAS.estado === 'carregando' ? '<span class="eti eti-info">Buscando</span>' :
    IDEIAS.estado === 'ok'         ? '<span class="eti eti-ok">No ar</span>' :
    IDEIAS.estado === 'erro'       ? '<span class="eti eti-alerta">Sem dados</span>' : '');
  texto('ideias-carimbo', IDEIAS.lidoEm ? 'lido do servidor em ' + dataLonga(IDEIAS.lidoEm) : '');
  const botao = porId('ideias-bt-buscar');
  if (botao) botao.disabled = (IDEIAS.estado === 'carregando');

  // Avisos: primeiro o que impede de ver, depois o que impediu de gravar,
  // depois a diferenca entre o servidor e este navegador.
  const apoio = ideiasApoio();
  const orfaos = IDEIAS.itens.filter(function (l) {
    return l.status === 'ganho' && !ideiasAchar(apoio.projetos, l.id);
  }).length;

  let avisos = '';
  if (IDEIAS.falha) avisos += aviso(IDEIAS.falha.tom, IDEIAS.falha.titulo, IDEIAS.falha.texto);
  if (IDEIAS.aviso) avisos += aviso(IDEIAS.aviso.tom, IDEIAS.aviso.titulo, IDEIAS.aviso.texto);
  if (orfaos) {
    avisos += aviso('info',
      orfaos + (orfaos === 1 ? ' aplicação virou projeto e o projeto não está neste navegador.'
                             : ' aplicações viraram projeto e os projetos não estão neste navegador.'),
      'O andamento fica no servidor e o projeto fica no navegador de quem o abriu. ' +
      'Quem abriu o projeto é quem enxerga a estruturação dele, e isso não é defeito da lista.');
  }
  escrever('ideias-aviso', avisos);

  // Ferramentas so aparecem quando ha o que filtrar
  const ferramentas = porId('ideias-ferramentas');
  if (ferramentas) ferramentas.hidden = !IDEIAS.itens.length;

  const busca = porId('ideias-busca');
  if (busca && busca.value !== IDEIAS.busca) busca.value = IDEIAS.busca;

  const filtro = porId('ideias-filtro');
  if (filtro) {
    const conta = function (k) {
      return IDEIAS.itens.filter(function (l) { return (l.status || 'novo') === k; }).length;
    };
    filtro.innerHTML =
      '<option value="">Todos os andamentos (' + IDEIAS.itens.length + ')</option>' +
      '<option value="esperando">Só quem espera resposta (' + esperando.length + ')</option>' +
      ANDAMENTOS.map(function (a) {
        return '<option value="' + a.k + '">' + esc(a.nome) + ' (' + conta(a.k) + ')</option>';
      }).join('');
    filtro.value = IDEIAS.filtro;
  }

  // A fila: quem espera primeiro, do mais antigo para o mais novo.
  const procurado = IDEIAS.busca.trim().toLowerCase();
  const lista = ideiasOrdenar(IDEIAS.itens).filter(function (l) {
    const st = l.status || 'novo';
    if (IDEIAS.filtro === 'esperando' && !ideiasEsperando(l)) return false;
    if (IDEIAS.filtro && IDEIAS.filtro !== 'esperando' && st !== IDEIAS.filtro) return false;
    if (!procurado) return true;
    return ideiasPalheiro(l).indexOf(procurado) >= 0;
  });

  contador('ideias', esperando.length);

  if (!IDEIAS.itens.length) {
    if (IDEIAS.estado === 'carregando') {
      corpo.innerHTML = vazio('Buscando as aplicações no servidor.', IDEIAS_COLUNAS);
      return;
    }
    if (IDEIAS.estado === 'erro') {
      corpo.innerHTML = vazio('A lista vem do servidor, e ele não respondeu.', IDEIAS_COLUNAS);
      return;
    }
    corpo.innerHTML = vazio('Nenhuma aplicação ainda. O formulário da landing grava direto aqui.', IDEIAS_COLUNAS);
    return;
  }

  if (!lista.length) {
    corpo.innerHTML = vazio('Nenhuma aplicação com esse filtro. Limpe a busca ou volte para ' +
      'todos os andamentos.', IDEIAS_COLUNAS);
    return;
  }

  corpo.innerHTML = lista.map(function (l) { return ideiasLinha(l, apoio); }).join('');
}

/* ---------------------------------------------------------------------
   Entrada da tela.

   Buscar de novo a cada visita seria pedir ao servidor o que ja esta na
   tela. A primeira visita carrega, e depois quem manda e o botao.
   --------------------------------------------------------------------- */
DESENHO.ideias = function () {
  ideiasDesenhar();
  if (IDEIAS.estado === 'ocioso') ideiasCarregar();
};
