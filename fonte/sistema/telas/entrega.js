/* =====================================================================
   Mesa da entrega

   E aqui que a entrega e escrita. A tela existe por uma pergunta so:
   o que falta para esta entrega poder ir para o cliente.

   Tres partes, na ordem em que se trabalha. O roteiro, que diz o que
   conta como pronto. Os campos proprios daquela entrega, que sao o
   produto em si. E os insumos, que sao o que o cliente ja respondeu e o
   que ja foi escrito nas entregas anteriores, para ninguem perguntar
   duas vezes a mesma coisa a uma pessoa que ja respondeu.

   O rodape tem o unico caminho para a entrega existir do lado do
   cliente: enviar para validacao. Esse gesto congela a versao enviada e
   publica o retrato no mesmo movimento, de proposito. Publicar como
   segundo botao seria esquecido em algum mes cheio, e o cliente ficaria
   olhando noticia velha sem ninguem perceber.
   ===================================================================== */

/* ---------------------------------------------------------------------
   1. Os campos proprios de cada entrega.

   Esta e a parte que faz a tela ser o produto e nao um formulario
   generico. Um campo unico para as oito transformaria a mesa num
   cadastro qualquer: o que se escreve em Precificacao nao tem nada a ver
   com o que se escreve em Jornada do cliente, e o documento que sai
   daqui e o que o cliente comprou.

   tipo:       linha, texto, moeda, escolha, lista
   essencial:  sem isto a entrega nao tem como ir para validacao
   pergunta:   fica embaixo do campo e diz por que ele existe
   --------------------------------------------------------------------- */
const ENTREGA_CAMPOS = {

  diagnostico: [
    { k: 'partida', rot: 'Onde a pessoa está hoje', tipo: 'texto', essencial: true,
      pergunta: 'O que ela já faz, para quem, e há quanto tempo. Três linhas bastam, e são a primeira coisa que o cliente lê no documento.' },
    { k: 'trava', rot: 'O que trava hoje', tipo: 'texto', essencial: true,
      pergunta: 'A frase que ele vai reconhecer como dele. Sai do que a pessoa escreveu na aplicação, não da nossa cabeça.' },
    { k: 'ativos', tipo: 'lista', rot: 'O que já existe e pode ser aproveitado', item: 'ativo',
      subs: [ { k: 'item', rot: 'O que é', tipo: 'linha' },
              { k: 'serve', rot: 'Como está', tipo: 'escolha',
                opcoes: [ { v: 'pronto', nome: 'serve como está' }, { v: 'ajuste', nome: 'precisa de ajuste' }, { v: 'zero', nome: 'começa do zero' } ] } ],
      pergunta: 'Material, base de clientes, método na cabeça, resultado de cliente antigo. É o que evita começar do zero, e é o que sustenta o prazo prometido.' },
    { k: 'objetivo', rot: 'Onde ele quer chegar em 12 meses', tipo: 'linha', essencial: true,
      pergunta: 'Com número. Sem número não dá para dizer depois se o produto funcionou.' },
    { k: 'risco', rot: 'O que pode fazer isto não sair do papel', tipo: 'texto',
      pergunta: 'Escrito agora, no frio, vale mais do que descoberto na fase 3.' },
  ],

  posicionamento: [
    { k: 'nicho', rot: 'Nicho', tipo: 'linha', essencial: true,
      pergunta: 'Para quem, exatamente. Nicho largo demais faz o preço cair na comparação com quem cobra menos.' },
    { k: 'publico', rot: 'Quem compra', tipo: 'texto', essencial: true,
      pergunta: 'Cargo, momento de vida ou de empresa, e o que a pessoa já tentou antes de procurar isto.' },
    { k: 'promessa', rot: 'A promessa, em uma frase', tipo: 'linha', essencial: true,
      pergunta: 'O que muda para quem compra. Sem adjetivo e sem a palavra solução.' },
    { k: 'diferenciais', tipo: 'lista', rot: 'Diferenciais', item: 'diferencial', essencial: true,
      subs: [ { k: 'texto', rot: 'Diferencial', tipo: 'linha' },
              { k: 'sustenta', rot: 'O que sustenta', tipo: 'linha' } ],
      pergunta: 'Diferencial sem o que o sustenta é adjetivo, e adjetivo o concorrente copia no mesmo dia.' },
    { k: 'naoE', rot: 'O que esta oferta não é', tipo: 'texto',
      pergunta: 'Corta a conversa errada antes de ela começar, e protege o prazo de quem entrega.' },
  ],

  metodo: [
    { k: 'nome', rot: 'Nome do método', tipo: 'linha', essencial: true,
      pergunta: 'O nome que o cliente vai dizer em voz alta quando explicar o que faz.' },
    { k: 'transformacao', rot: 'De onde para onde o método leva', tipo: 'linha', essencial: true,
      pergunta: 'O antes e o depois em uma frase. É a lógica de transformação que sustenta a entrega.' },
    { k: 'etapas', tipo: 'lista', rot: 'Etapas do método', item: 'etapa', essencial: true,
      subs: [ { k: 'nome', rot: 'Etapa', tipo: 'linha' },
              { k: 'acontece', rot: 'O que acontece', tipo: 'texto' },
              { k: 'saida', rot: 'Com o que a pessoa sai', tipo: 'linha' } ],
      pergunta: 'Etapa que não termina com algo na mão da pessoa é assunto, não etapa. O método da casa tem seis, o do cliente tem as que precisar.' },
    { k: 'porque', rot: 'Por que funciona', tipo: 'texto',
      pergunta: 'De onde veio essa lógica e em que casos ela já funcionou. É o que responde a pergunta por que funciona, que a landing promete responder.' },
  ],

  jornada: [
    { k: 'antes', rot: 'Antes', tipo: 'texto', essencial: true,
      pergunta: 'O que acontece entre o sim e o primeiro encontro. É aí que o cliente decide se comprou bem.' },
    { k: 'durante', rot: 'Durante', tipo: 'texto', essencial: true,
      pergunta: 'Ritmo, encontros, o que ele faz entre um e outro, e o que recebe em cada ponto.' },
    { k: 'depois', rot: 'Depois', tipo: 'texto', essencial: true,
      pergunta: 'O que fica com a pessoa quando acaba, e o que a casa dele faz para não perder o cliente de vista.' },
    { k: 'atrito', rot: 'Onde o cliente costuma sumir', tipo: 'texto',
      pergunta: 'O ponto de desistência conhecido, e o que a jornada faz nesse ponto para segurar.' },
  ],

  preco: [
    { k: 'preco', rot: 'Preço à vista', tipo: 'moeda', essencial: true,
      pergunta: 'O preço do produto do cliente. Não é o valor do contrato dele conosco, que já está no cabeçalho.' },
    { k: 'sustenta', rot: 'O que sustenta esse preço', tipo: 'texto', essencial: true,
      pergunta: 'O que ele resolve, quanto custa hoje não resolver, e o que entra no pacote. Sem isto escrito, o desconto sai na primeira objeção.' },
    { k: 'parcelas', rot: 'Parcelamento', tipo: 'escolha', essencial: true, opcoes: [],
      pergunta: 'Até 12 vezes, do mesmo jeito que a casa faz: PIX ou boleto pela TMB.' },
    { k: 'forma', rot: 'Forma', tipo: 'escolha',
      opcoes: [ { v: 'pix_boleto', nome: 'PIX ou boleto' }, { v: 'pix', nome: 'PIX' }, { v: 'boleto', nome: 'boleto' } ],
      pergunta: 'A condição que vai escrita no material, do jeito que o comprador lê.' },
    { k: 'ancora', rot: 'Com o que ele compara isto hoje', tipo: 'linha',
      pergunta: 'Preço só existe ao lado de outro preço. Escreva com o que o comprador compara antes de decidir.' },
    { k: 'piso', rot: 'Piso, abaixo disto não fecha', tipo: 'moeda',
      pergunta: 'Escrito antes da conversa, o piso evita o desconto dado no susto.' },
  ],

  materiais: [
    { k: 'pecas', tipo: 'lista', rot: 'Materiais do produto', item: 'material', essencial: true,
      subs: [ { k: 'nome', rot: 'Material', tipo: 'linha' },
              { k: 'paraQue', rot: 'Para que serve', tipo: 'linha' },
              { k: 'quando', rot: 'Em que momento entra', tipo: 'linha' } ],
      pergunta: 'Template e roteiro existem para o produto rodar sem improviso a cada cliente, que é exatamente o que trava quem chega até nós.' },
    { k: 'quemOpera', rot: 'Quem opera esses materiais', tipo: 'linha',
      pergunta: 'O cliente, alguém da equipe dele, ou os dois. Muda o nível de detalhe de cada peça.' },
    { k: 'onde', rot: 'Onde os arquivos ficam', tipo: 'linha',
      pergunta: 'O endereço da pasta. O sistema guarda endereço, nunca arquivo, e o link também entra no rodapé desta tela.' },
  ],

  comercial: [
    { k: 'oferta', rot: 'A oferta em uma frase', tipo: 'linha', essencial: true,
      pergunta: 'O que se vende, para quem, por quanto. É a frase que vai na conversa e na proposta dele.' },
    { k: 'canais', tipo: 'lista', rot: 'Por onde a oferta chega', item: 'canal',
      subs: [ { k: 'canal', rot: 'Canal', tipo: 'linha' },
              { k: 'passo', rot: 'Primeiro passo, nos primeiros 30 dias', tipo: 'linha' } ],
      pergunta: 'Canal sem primeiro passo escrito não sai do papel.' },
    { k: 'objecoes', tipo: 'lista', rot: 'Objeções e respostas', item: 'objeção', essencial: true,
      subs: [ { k: 'objecao', rot: 'Objeção', tipo: 'linha' },
              { k: 'resposta', rot: 'Resposta', tipo: 'texto' } ],
      pergunta: 'As três que aparecem sempre, com a resposta pronta. Quem vende é o cliente, e é ele que vai precisar delas na frente da pessoa.' },
  ],

  execucao: [
    { k: 'passos', tipo: 'lista', rot: 'A sequência, com prazo', item: 'passo', essencial: true,
      subs: [ { k: 'passo', rot: 'Passo', tipo: 'linha' },
              { k: 'prazo', rot: 'Até quando', tipo: 'data' },
              { k: 'quem', rot: 'Quem faz', tipo: 'linha' },
              { k: 'pronto', rot: 'Pronto quando', tipo: 'linha' } ],
      pergunta: 'Passo sem data e sem dono é intenção. A sequência prática é o que esta entrega promete na landing.' },
    { k: 'primeiros7', rot: 'O que acontece nos primeiros 7 dias', tipo: 'texto', essencial: true,
      pergunta: 'Plano que começa no mês que vem não começa. O primeiro passo tem que caber na semana em que a entrega chega.' },
    { k: 'atraso', rot: 'O que pode atrasar', tipo: 'texto',
      pergunta: 'O que depende de terceiro, de contratação ou de dinheiro que ainda não existe.' },
  ],
};

// O parcelamento vai de 1 a 12 porque e ate 12 que a casa parcela, e o
// cliente aprendeu esse numero lendo a landing antes de aplicar.
(function entregaMontarParcelas() {
  const campo = ENTREGA_CAMPOS.preco.find(function (c) { return c.k === 'parcelas'; });
  for (let i = 1; i <= 12; i++) campo.opcoes.push({ v: String(i), nome: i === 1 ? 'à vista' : i + 'x' });
})();

// De onde cada entrega puxa o que ja foi escrito. A ordem das oito nao e
// enfeite: uma sustenta a seguinte, e por isso a mesa mostra os trechos
// prontos das anteriores em vez de pedir a mesma informacao de novo.
const ENTREGA_ALIMENTA = {
  diagnostico:    [],
  posicionamento: ['diagnostico'],
  metodo:         ['diagnostico', 'posicionamento'],
  jornada:        ['posicionamento', 'metodo'],
  preco:          ['posicionamento', 'metodo'],
  materiais:      ['metodo', 'jornada'],
  comercial:      ['posicionamento', 'preco'],
  execucao:       ['comercial', 'materiais'],
};

// O que a casa promete na landing e que a entrega precisa respeitar. Fica
// na tela na hora de escrever, e nao num documento que ninguem abre.
const ENTREGA_LINHA_DA_CASA = {
  preco: 'A casa parcela em até 12x no PIX ou boleto, via TMB. O que se escreve aqui é a condição do produto do cliente, e não a do contrato dele conosco.',
  comercial: 'Não vendemos pelo cliente. Estruturamos a oferta, e a comercialização continua com ele. O que sai daqui é direção comercial, não operação de venda.',
  metodo: 'O método próprio é dele, não o nosso. As seis etapas da casa são o caminho para chegar até aqui, e não o índice do que o cliente vai vender.',
};

// Em que etapa do metodo cada entrega acontece. Serve para o cabecalho
// dizer em que ponto da conversa este projeto esta.
const ENTREGA_ETAPA = {
  diagnostico: 1, posicionamento: 2, metodo: 3, jornada: 4,
  preco: 5, materiais: 4, comercial: 6, execucao: 6,
};

/* ---------------------------------------------------------------------
   2. O estado da tela.

   Qual entrega esta aberta chega em window.ENTREGA_ABERTA, escrito por
   Projetos em estruturacao. Nao se declara aqui: os arquivos das telas
   viram um script so, e a segunda declaracao derruba a pagina inteira.
   --------------------------------------------------------------------- */
let ENTREGA_RECADO = null;      // o que a tela tem a dizer sobre o ultimo gesto
let ENTREGA_CONFIRMA = false;   // envio pedindo confirmacao, com o que falta na frente
let ENTREGA_RETORNO = null;     // 'ajuste' ou 'aprovada', quando o retorno esta sendo registrado
let ENTREGA_VERSAO_ABERTA = null;

// A aplicacao vem do servidor, e por isso tem os quatro estados que o
// armazenamento local nao tem. Fica guardada por lead para nao buscar de
// novo a cada troca de entrega do mesmo projeto.
let ENTREGA_APLIC = { leadId: null, estado: 'nunca', lead: null, erro: null, quando: null };

/* ---------------------------------------------------------------------
   3. Os dados. Nada aqui guarda estado: toda leitura sai do
   armazenamento na hora, porque a entrega tambem muda em outras telas.
   --------------------------------------------------------------------- */

function entregaProjetos() { return iqvLer(CHAVES.projetos, []) || []; }

function entregaProjeto(id) {
  return entregaProjetos().find(function (p) { return p && String(p.id) === String(id); }) || null;
}

// As oito, sempre as oito, na ordem da landing. Projeto salvo por uma
// versao antiga pode ter menos, e entrega que falta nao pode sumir da
// tela: ela some do documento do cliente junto.
function entregaOito(p) {
  const guardadas = Array.isArray(p && p.entregas) ? p.entregas : [];
  return ENTREGAS.map(function (def) {
    const g = guardadas.find(function (x) { return x && x.k === def.k; }) || null;
    return {
      k: def.k, n: def.n, nome: def.nome, resumo: def.resumo, fase: def.fase,
      dentro: g ? g.noEscopo !== false : false,
      estado: (g && g.estado) || 'nao_comecou',
      prazo: (g && g.prazo) || null,
      responsavelId: (g && g.responsavelId) || (p && p.responsavelId) || null,
      checklist: (g && Array.isArray(g.checklist)) ? g.checklist : [],
      campos: (g && g.campos && typeof g.campos === 'object') ? g.campos : {},
      links: (g && Array.isArray(g.links)) ? g.links : [],
      versoes: (g && Array.isArray(g.versoes)) ? g.versoes : [],
      enviadaEm: (g && g.enviadaEm) || null,
      aprovadaEm: (g && g.aprovadaEm) || null,
      guardada: !!g,
    };
  });
}

// A entrega aberta, com o projeto em volta. Devolve null quando nao ha
// nada aberto, quando o projeto sumiu do armazenamento ou quando a chave
// que veio nao e uma das oito.
function entregaAlvo() {
  const aberta = window.ENTREGA_ABERTA;
  if (!aberta || !aberta.projetoId || !aberta.entrega) return null;
  const p = entregaProjeto(aberta.projetoId);
  if (!p) return null;
  const oito = entregaOito(p);
  const e = oito.find(function (x) { return x.k === aberta.entrega; });
  if (!e) return null;
  return { p: p, e: e, oito: oito };
}

// A fase de agora e a primeira que ainda tem entrega contratada sem
// aprovacao do cliente. A regra e a mesma de Projetos em estruturacao, de
// proposito: duas telas mostrando fases diferentes do mesmo projeto e
// pior do que nao mostrar fase nenhuma.
function entregaFaseDe(oito) {
  const escopo = oito.filter(function (e) { return e.dentro; });
  for (let n = 1; n <= 4; n++) {
    if (escopo.some(function (e) { return e.fase === n && e.estado !== 'aprovada'; })) return n;
  }
  return 4;
}

// A etapa da conversa e a da primeira entrega contratada que ainda nao
// voltou aprovada.
function entregaEtapaDe(oito) {
  const pendente = oito.find(function (e) { return e.dentro && e.estado !== 'aprovada'; });
  return pendente ? (ENTREGA_ETAPA[pendente.k] || 1) : 6;
}

// Fase, etapa e bola nao sao campos que alguem lembra de virar: saem do
// estado das oito. Gravar os tres junto com a entrega mantem o projeto
// coerente para quem ler de outra tela.
function entregaSincronizar(p) {
  const oito = entregaOito(p);
  p.fase = entregaFaseDe(oito);
  p.etapa = entregaEtapaDe(oito);
  const esperando = oito.filter(function (e) { return e.dentro && e.estado === 'com_cliente'; });
  const lado = esperando.length ? 'cliente' : 'casa';
  if (!p.bola || p.bola.lado !== lado) p.bola = { lado: lado, desde: hoje() };
}

/* Toda gravacao desta tela passa por aqui. Le a lista inteira, acha o
   projeto pelo id e a entrega pela chave, nunca por posicao, deixa quem
   chamou mexer e grava. Gravacao que falha vira recado e nunca silencio:
   o armazenamento recusa calado quando enche, e a tarde inteira de
   trabalho sumiria sem ninguem ver. */
function entregaSalvar(mudar) {
  const aberta = window.ENTREGA_ABERTA || {};
  const lista = entregaProjetos();
  const p = lista.find(function (x) { return x && String(x.id) === String(aberta.projetoId); });
  if (!p) {
    ENTREGA_RECADO = { tom: 'alerta', titulo: 'Este projeto não está mais neste navegador.',
      texto: 'Ele foi apagado ou o armazenamento foi limpo enquanto a entrega estava aberta. O que estava na tela não foi gravado. Abra Projetos em estruturação para ver o que restou.' };
    return false;
  }
  if (!Array.isArray(p.entregas)) p.entregas = [];
  let e = p.entregas.find(function (x) { return x && x.k === aberta.entrega; });
  if (!e) {
    e = { k: aberta.entrega, noEscopo: true, estado: 'nao_comecou', responsavelId: p.responsavelId || null,
          prazo: null, checklist: [], campos: {}, links: [], versoes: [], enviadaEm: null, aprovadaEm: null };
    p.entregas.push(e);
  }
  if (!e.campos || typeof e.campos !== 'object') e.campos = {};
  if (!Array.isArray(e.links)) e.links = [];
  if (!Array.isArray(e.checklist)) e.checklist = [];
  if (!Array.isArray(e.versoes)) e.versoes = [];

  mudar(e, p);
  entregaSincronizar(p);

  if (!iqvGravar(CHAVES.projetos, lista)) {
    ENTREGA_RECADO = { tom: 'alerta', titulo: 'O que você acabou de escrever não coube neste navegador.',
      texto: 'O armazenamento recusou a gravação, então o texto está na tela mas não está guardado. Não feche esta aba: abra A casa em outra, veja o espaço ocupado e tente de novo.' };
    return false;
  }
  return true;
}

// Escrever qualquer coisa dentro de uma entrega parada e comecar a
// entrega. Ninguem precisa lembrar de virar um estado para dizer o obvio.
function entregaComecou(e) {
  if (e.estado === 'nao_comecou') e.estado = 'escrevendo';
}

function entregaQuemSou() { return EU.nome || EU.email || 'sem nome'; }

function entregaNomePessoa(id) {
  const u = (usuarios() || []).find(function (x) { return x && String(x.id) === String(id); });
  return u ? u.nome : null;
}

function entregaPessoas() {
  return (usuarios() || []).filter(function (u) { return u && u.ativo !== false && u.papel !== 'cliente'; });
}

// Os niveis saem de Roteiros e niveis quando ja foram editados, porque
// preco se edita num lugar so. NIVEIS_DEFAULT e o que a landing publica.
function entregaNiveis() {
  const m = iqvLer(CHAVES.metodo, null);
  const salvos = m && Array.isArray(m.niveis) ? m.niveis : null;
  return salvos && salvos.length ? salvos : NIVEIS_DEFAULT;
}

function entregaNivel(k) {
  return entregaNiveis().find(function (n) { return n.k === k; }) || null;
}

// O roteiro de hoje, que nao e o que este contrato copiou. A diferenca
// entre os dois e informacao, e nao erro: e o que o metodo aprendeu
// depois que este projeto comecou.
function entregaRoteiroDeHoje(k) {
  const m = iqvLer(CHAVES.metodo, null);
  const r = m && m.roteiros ? m.roteiros[k] : null;
  return {
    // definicaoPronto e o nome que Roteiros e niveis grava; checklist e a
    // queda para o que foi gravado antes desta correcao
    checklist: (r && Array.isArray(r.definicaoPronto)) ? r.definicaoPronto
             : (r && Array.isArray(r.checklist)) ? r.checklist : [],
    comoFazer: (r && r.comoFazer) ? String(r.comoFazer) : '',
  };
}

function entregaLeitura(leadId) {
  if (leadId === null || leadId === undefined) return null;
  const lista = iqvLer(CHAVES.leituras, []) || [];
  return lista.find(function (l) { return l && Number(l.leadId) === Number(leadId); }) || null;
}

/* ---------------------------------------------------------------------
   4. O que falta para esta entrega ficar pronta.

   A pergunta que a tela responde. Sao duas listas somadas: o que a
   definicao de pronto ainda pede, e os campos sem os quais o documento
   nao se sustenta do lado do cliente.
   --------------------------------------------------------------------- */

function entregaPreenchido(c, campos) {
  const v = campos ? campos[c.k] : null;
  if (c.tipo === 'lista') {
    if (!Array.isArray(v) || !v.length) return false;
    const primeiro = c.subs[0].k;
    return v.some(function (item) { return item && String(item[primeiro] || '').trim(); });
  }
  if (c.tipo === 'moeda') return Number(v) > 0;
  return String(v === null || v === undefined ? '' : v).trim() !== '';
}

function entregaFalta(e) {
  const itens = (e.checklist || []).filter(function (i) { return i && !i.feito; });
  const campos = (ENTREGA_CAMPOS[e.k] || []).filter(function (c) {
    return c.essencial && !entregaPreenchido(c, e.campos);
  });
  return { itens: itens, campos: campos, total: itens.length + campos.length };
}

function entregaPronto(e) {
  const lista = e.checklist || [];
  const feitos = lista.filter(function (i) { return i && i.feito; }).length;
  return { total: lista.length, feitos: feitos, parte: lista.length ? Math.round((feitos / lista.length) * 100) : 0 };
}

// Quantas entregas estao sendo escritas agora, em todos os projetos. E o
// numero que aparece do lado do menu: o tamanho da mesa de hoje.
function entregaNaMesa() {
  let n = 0;
  entregaProjetos().forEach(function (p) {
    entregaOito(p).forEach(function (e) { if (e.dentro && e.estado === 'escrevendo') n++; });
  });
  return n;
}

function entregaVenceu(v) { const n = diasDesde(v); return n !== null && n > 0; }

// Aspas e barra invertida dentro de argumento de onclick quebram a
// chamada inteira. Id de projeto e chave de entrega sao escritos por nos,
// mas passar por aqui custa nada e evita a tela em branco.
function entregaArg(v) {
  return "'" + String(v === null || v === undefined ? '' : v).replace(/[\\']/g, '') + "'";
}

/* ---------------------------------------------------------------------
   5. A aplicacao, que vem do servidor.

   O que a pessoa escreveu no Typeform mora no banco, e nao no navegador,
   porque a fila precisa ser a mesma para quem esta sentado ao lado.
   Aqui essa resposta e insumo: e o que evita perguntar de novo o que o
   cliente ja respondeu antes de pagar.

   Quatro respostas possiveis e cada uma tem texto proprio. Nenhuma delas
   impede escrever a entrega: o que se perde sem servidor e a memoria da
   aplicacao, e nao o trabalho de agora.
   --------------------------------------------------------------------- */
async function entregaPedirLeads() {
  try {
    const r = await fetch('/leads', { headers: { 'Accept': 'application/json' } });
    let dados = null;
    try { dados = await r.json(); } catch (e) { dados = null; }
    // login vencido nao volta em JSON: o Access devolve a pagina de
    // entrada dele, em HTML, e o fetch ja seguiu o desvio
    if (dados === null) return { estado: 'login' };
    if (r.status === 503) return { estado: 'sem_configuracao' };
    if (r.status === 401) return { estado: 'login' };
    if (!r.ok) return { estado: 'erro', mensagem: dados.erro || ('o servidor respondeu ' + r.status) };
    return { estado: 'ok', leads: Array.isArray(dados.leads) ? dados.leads : [] };
  } catch (e) {
    return { estado: 'sem_servidor' };
  }
}

async function entregaCarregarAplicacao(p) {
  if (!p || p.leadId === null || p.leadId === undefined) return;
  if (ENTREGA_APLIC.estado === 'carregando') return;
  if (ENTREGA_APLIC.leadId === Number(p.leadId) && ENTREGA_APLIC.estado !== 'nunca') return;

  ENTREGA_APLIC = { leadId: Number(p.leadId), estado: 'carregando', lead: null, erro: null, quando: null };
  entregaPintarInsumos();

  const r = await entregaPedirLeads();
  // a pessoa pode ter trocado de projeto enquanto o servidor respondia
  if (ENTREGA_APLIC.leadId !== Number(p.leadId)) return;

  if (r.estado === 'ok') {
    const lead = r.leads.find(function (l) { return Number(l.id) === Number(p.leadId); }) || null;
    ENTREGA_APLIC.estado = lead ? 'ok' : 'sumiu';
    ENTREGA_APLIC.lead = lead;
    ENTREGA_APLIC.quando = new Date().toISOString();
  } else {
    ENTREGA_APLIC.estado = r.estado;
    ENTREGA_APLIC.erro = r.mensagem || null;
  }
  entregaPintarInsumos();
}

function entregaBuscarAplicacao() {
  const alvo = entregaAlvo();
  if (!alvo) return;
  ENTREGA_APLIC = { leadId: null, estado: 'nunca', lead: null, erro: null, quando: null };
  entregaCarregarAplicacao(alvo.p);
}

/* ---------------------------------------------------------------------
   6. Pecas de desenho.
   --------------------------------------------------------------------- */

function entregaFato(rot, valor, obs) {
  return '<div>' +
    '<span class="rotulo">' + rot + '</span>' +
    '<div style="font-size:13.5px;color:var(--tx);line-height:1.4">' + valor + '</div>' +
    (obs ? '<div style="font-size:11px;color:var(--tx-4);margin-top:4px">' + obs + '</div>' : '') +
    '</div>';
}

function entregaBarra(parte, cor) {
  return '<div style="height:6px;border-radius:4px;background:rgba(255,255,255,.07);overflow:hidden">' +
    '<div style="height:100%;width:' + Math.max(0, Math.min(100, parte)) + '%;background:' + (cor || 'var(--o)') + '"></div></div>';
}

// Texto de fora vira HTML aqui: passa por esc() e so depois ganha as
// quebras de linha que a pessoa escreveu.
function entregaLinhas(v) {
  return esc(v).replace(/\n/g, '<br>');
}

function entregaEstadoTexto(k) {
  const e = porChave(ESTADOS_ENTREGA, k);
  return e ? e.nome : 'sem estado';
}

// Um valor guardado, escrito para leitura. Serve nos insumos e no
// historico de versoes, onde nada se edita.
function entregaValorLido(c, campos) {
  const v = campos ? campos[c.k] : null;
  if (c.tipo === 'lista') {
    if (!Array.isArray(v) || !v.length) return '';
    return '<ul style="margin:0;padding-left:18px">' + v.map(function (item) {
      const partes = c.subs.map(function (s) {
        const t = String((item && item[s.k]) || '').trim();
        if (!t) return '';
        if (s.tipo === 'escolha') {
          const o = (s.opcoes || []).find(function (x) { return x.v === t; });
          return esc(o ? o.nome : t);
        }
        if (s.tipo === 'data') return esc(dataCurta(t));
        return esc(t);
      }).filter(function (x) { return x; });
      return partes.length ? '<li style="margin-bottom:4px">' + partes.join(', ') + '</li>' : '';
    }).join('') + '</ul>';
  }
  if (c.tipo === 'moeda') return Number(v) > 0 ? esc(moeda(v)) : '';
  if (c.tipo === 'escolha') {
    const o = (c.opcoes || []).find(function (x) { return x.v === String(v); });
    return o ? esc(o.nome) : (v ? esc(v) : '');
  }
  return String(v || '').trim() ? entregaLinhas(v) : '';
}

// Os trechos ja escritos de uma entrega, do jeito que se le, sem campo
// vazio ocupando espaco.
function entregaHtmlLido(k, campos) {
  const defs = ENTREGA_CAMPOS[k] || [];
  const linhas = defs.map(function (c) {
    const v = entregaValorLido(c, campos);
    if (!v) return '';
    return '<div style="margin-bottom:12px">' +
      '<span class="rotulo">' + esc(c.rot) + '</span>' +
      '<div style="font-size:13px;color:var(--tx-2)">' + v + '</div></div>';
  }).filter(function (x) { return x; });
  return linhas.join('');
}

/* ---------------------------------------------------------------------
   7. Os campos proprios, para escrever.

   Cada campo grava sozinho ao sair dele. Nao existe botao de salvar
   porque nao existe momento em que o texto fica so na tela: quem escreve
   isto costuma escrever com o cliente do outro lado da chamada.
   --------------------------------------------------------------------- */

function entregaHtmlEscolha(id, valor, opcoes, aoMudar, classe) {
  return '<select class="campo ' + (classe || '') + '" ' + (id ? 'id="' + id + '" ' : '') +
    'onchange="' + aoMudar + '">' +
    opcoes.map(function (o) {
      return '<option value="' + esc(o.v) + '"' + (String(valor) === String(o.v) ? ' selected' : '') + '>' + esc(o.nome) + '</option>';
    }).join('') + '</select>';
}

function entregaHtmlSub(c, i, s, item) {
  const v = (item && item[s.k]) || '';
  const alvo = 'entregaListaCampo(' + entregaArg(c.k) + ',' + i + ',' + entregaArg(s.k) + ', this.value)';
  if (s.tipo === 'texto') {
    return '<textarea class="campo campo-sm" style="min-height:60px" placeholder="' + esc(s.rot) + '" onchange="' + alvo + '">' + esc(v) + '</textarea>';
  }
  if (s.tipo === 'escolha') {
    return entregaHtmlEscolha('', v, s.opcoes, alvo, 'campo-sm');
  }
  const tipo = s.tipo === 'data' ? 'date' : 'text';
  return '<input class="campo campo-sm" type="' + tipo + '" value="' + esc(v) + '" placeholder="' + esc(s.rot) + '" onchange="' + alvo + '">';
}

function entregaHtmlLista(c, campos) {
  const itens = Array.isArray(campos[c.k]) ? campos[c.k] : [];
  const linhas = itens.map(function (item, i) {
    return '<div style="border:1px solid var(--fio);border-radius:var(--r-sm);padding:12px;margin-bottom:10px">' +
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">' +
        '<span class="rotulo" style="margin:0">' + esc(c.item) + ' ' + (i + 1) + '</span>' +
        '<button class="bt bt-linha bt-sm" style="margin-left:auto;padding:4px 9px" ' +
          'onclick="entregaListaRemover(' + entregaArg(c.k) + ',' + i + ')">Tirar</button>' +
      '</div>' +
      c.subs.map(function (s) {
        return '<div style="margin-bottom:8px"><span class="rotulo">' + esc(s.rot) + '</span>' + entregaHtmlSub(c, i, s, item) + '</div>';
      }).join('') +
      '</div>';
  }).join('');

  const nada = itens.length ? '' :
    '<p class="dica" style="margin-bottom:10px">Nada escrito ainda.</p>';

  return linhas + nada +
    '<button class="bt bt-linha bt-sm" onclick="entregaListaAcrescentar(' + entregaArg(c.k) + ')">Acrescentar ' + esc(c.item) + '</button>';
}

function entregaHtmlEditor(c, campos) {
  const v = campos[c.k];
  const falta = c.essencial && !entregaPreenchido(c, campos);
  let controle = '';

  if (c.tipo === 'lista') {
    controle = entregaHtmlLista(c, campos);
  } else if (c.tipo === 'texto') {
    controle = '<textarea class="campo" onchange="entregaCampo(' + entregaArg(c.k) + ', this.value)">' + esc(v || '') + '</textarea>';
  } else if (c.tipo === 'moeda') {
    controle = '<input class="campo" type="number" min="0" step="10" value="' + esc(v === 0 || v ? v : '') + '" ' +
      'onchange="entregaCampo(' + entregaArg(c.k) + ', this.value)">' +
      (Number(v) > 0 ? '<div class="dica" style="margin-top:5px">' + esc(moeda(v)) + '</div>' : '');
  } else if (c.tipo === 'escolha') {
    controle = entregaHtmlEscolha('', v, c.opcoes, 'entregaCampo(' + entregaArg(c.k) + ', this.value)');
  } else {
    controle = '<input class="campo" type="text" value="' + esc(v || '') + '" onchange="entregaCampo(' + entregaArg(c.k) + ', this.value)">';
  }

  return '<div style="margin-bottom:20px">' +
    '<span class="rotulo">' + esc(c.rot) +
      (c.essencial ? ' <span style="color:var(--o)">essencial</span>' : '') +
      (falta ? ' <span style="color:var(--atencao);letter-spacing:0;text-transform:none;font-weight:600">em branco</span>' : '') +
    '</span>' +
    controle +
    '<p class="dica" style="margin-top:6px">' + esc(c.pergunta) + '</p>' +
    '</div>';
}

// A frase de preco montada com o que ja foi escrito. E ela que vai para o
// material do cliente, e ver a frase pronta enquanto se escreve evita o
// numero que nao fecha com a condicao.
function entregaHtmlFrasePreco(campos) {
  const preco = Number(campos.preco) || 0;
  if (!preco) return '<p class="dica">Escreva o preço à vista para ver como a condição fica escrita para o comprador.</p>';
  const n = Number(campos.parcelas) || 1;
  const forma = String(campos.forma || 'pix_boleto');
  const nomeForma = forma === 'pix' ? 'no PIX' : forma === 'boleto' ? 'no boleto' : 'no PIX ou boleto';
  const parte = n > 1 ? ', ou ' + n + 'x de ' + moeda(Math.round(preco / n)) + ' ' + nomeForma : ' ' + nomeForma;
  return '<div style="font-size:14px;color:var(--tx)">' + esc(moeda(preco)) + ' à vista' + esc(parte) + '.</div>' +
    '<p class="dica" style="margin-top:5px">É assim que a condição vai escrita no material do cliente. A casa cobra pela TMB, o cliente cobra pelo meio dele.</p>';
}

/* ---------------------------------------------------------------------
   8. O que a pessoa clica.
   --------------------------------------------------------------------- */

// Chamada por Projetos em estruturacao e pelas oito abas daqui. O recado
// de qual entrega abrir vai no window porque as telas viram um script so.
function entregaAbrir(projetoId, k) {
  window.ENTREGA_ABERTA = { projetoId: projetoId, entrega: k };
  window.PROJETO_ABERTO = projetoId;
  ENTREGA_RECADO = null;
  ENTREGA_CONFIRMA = false;
  ENTREGA_RETORNO = null;
  ENTREGA_VERSAO_ABERTA = null;
  if (TELA_ATUAL !== 'entrega') { irPara('entrega'); return; }
  DESENHO.entrega();
}

function entregaTrocarProjeto(id) {
  const p = entregaProjeto(id);
  if (!p) return;
  const oito = entregaOito(p);
  const primeira = oito.find(function (e) { return e.dentro && e.estado !== 'aprovada'; }) ||
                   oito.find(function (e) { return e.dentro; });
  if (!primeira) {
    window.ENTREGA_ABERTA = null;
    window.PROJETO_ABERTO = id;
    ENTREGA_RECADO = { tom: 'atencao', titulo: 'Este projeto nasceu sem escopo.',
      texto: 'Nenhuma das oito entrou no contrato, então não há o que escrever. Volte à leitura do caso e diga qual nível foi contratado: é o nível que define o que entra neste projeto.' };
    DESENHO.entrega();
    return;
  }
  entregaAbrir(id, primeira.k);
}

function entregaFechar() {
  window.ENTREGA_ABERTA = null;
  ENTREGA_RECADO = null;
  ENTREGA_CONFIRMA = false;
  ENTREGA_RETORNO = null;
  DESENHO.entrega();
}

function entregaCampo(k, valor) {
  entregaSalvar(function (e) {
    e.campos[k] = valor;
    entregaComecou(e);
  });
  entregaAtualizarFalta();
}

function entregaListaAcrescentar(k) {
  entregaSalvar(function (e) {
    if (!Array.isArray(e.campos[k])) e.campos[k] = [];
    e.campos[k].push({});
    entregaComecou(e);
  });
  DESENHO.entrega();
}

function entregaListaRemover(k, i) {
  entregaSalvar(function (e) {
    if (Array.isArray(e.campos[k])) e.campos[k].splice(i, 1);
  });
  DESENHO.entrega();
}

function entregaListaCampo(k, i, sub, valor) {
  entregaSalvar(function (e) {
    if (!Array.isArray(e.campos[k])) e.campos[k] = [];
    if (!e.campos[k][i]) e.campos[k][i] = {};
    e.campos[k][i][sub] = valor;
    entregaComecou(e);
  });
  entregaAtualizarFalta();
}

function entregaMarcar(i, feito) {
  entregaSalvar(function (e) {
    if (e.checklist[i]) e.checklist[i].feito = !!feito;
    entregaComecou(e);
  });
  entregaAtualizarFalta();
}

function entregaPrazo(v) {
  entregaSalvar(function (e) { e.prazo = v || null; });
  DESENHO.entrega();
}

function entregaResponsavel(v) {
  entregaSalvar(function (e) { e.responsavelId = v || null; });
  DESENHO.entrega();
}

function entregaLinkAcrescentar() {
  entregaSalvar(function (e) { e.links.push({ nome: '', url: '' }); });
  DESENHO.entrega();
}

function entregaLinkRemover(i) {
  entregaSalvar(function (e) { e.links.splice(i, 1); });
  DESENHO.entrega();
}

function entregaLinkCampo(i, sub, valor) {
  entregaSalvar(function (e) {
    if (!e.links[i]) e.links[i] = { nome: '', url: '' };
    e.links[i][sub] = valor;
  });
}

function entregaVerVersao(n) {
  ENTREGA_VERSAO_ABERTA = (ENTREGA_VERSAO_ABERTA === n) ? null : n;
  DESENHO.entrega();
}

/* ---------------------------------------------------------------------
   9. Enviar para validacao.

   Unico caminho para a entrega existir do lado do cliente. O gesto faz
   tres coisas de uma vez: congela a versao que saiu, vira o estado para
   com o cliente e publica o retrato que a tela Meu projeto le. Separar
   isso em botoes diferentes seria criar um passo que um dia alguem
   esquece, e cliente olhando noticia velha nao reclama, some.
   --------------------------------------------------------------------- */

// O retrato e o que o cliente ve, e por isso ele nao carrega o que e
// nosso: prazo interno, responsavel, definicao de pronto e rascunho ficam
// deste lado. De cada entrega vai o conteudo da ultima versao enviada, e
// nunca o que esta sendo escrito agora.
function entregaRetratoDoProjeto(p) {
  const copia = JSON.parse(JSON.stringify(p));
  delete copia.responsavelId;
  copia.entregas = (Array.isArray(p.entregas) ? p.entregas : []).map(function (e) {
    const versoes = Array.isArray(e.versoes) ? e.versoes : [];
    const ultima = versoes.length ? versoes[versoes.length - 1] : null;
    return {
      k: e.k,
      noEscopo: e.noEscopo !== false,
      estado: e.estado || 'nao_comecou',
      versao: ultima ? ultima.n : 0,
      campos: ultima ? ultima.campos : {},
      links: Array.isArray(e.links) ? e.links : [],
      enviadaEm: e.enviadaEm || null,
      aprovadaEm: e.aprovadaEm || null,
    };
  });
  return copia;
}

function entregaPublicarRetrato(p, k, quem, quando) {
  const bruto = iqvLer(CHAVES.retratos, null);
  let lista = [];
  if (Array.isArray(bruto)) lista = bruto;
  else if (bruto && typeof bruto === 'object') {
    // formato guardado por chave de projeto, de uma versao anterior
    lista = Object.keys(bruto).map(function (id) {
      const r = bruto[id] || {};
      if (!r.projetoId) r.projetoId = id;
      return r;
    });
  }
  const retrato = {
    projetoId: p.id, publicadoEm: quando, publicadoPor: quem, entrega: k,
    projeto: entregaRetratoDoProjeto(p),
  };
  const i = lista.findIndex(function (r) { return r && String(r.projetoId) === String(p.id); });
  if (i >= 0) lista[i] = retrato; else lista.push(retrato);
  return iqvGravar(CHAVES.retratos, lista);
}

function entregaPedirEnvio() {
  const alvo = entregaAlvo();
  if (!alvo) return;
  const falta = entregaFalta(alvo.e);
  if (falta.total) { ENTREGA_CONFIRMA = true; ENTREGA_RECADO = null; DESENHO.entrega(); return; }
  entregaEnviar();
}

function entregaCancelarEnvio() { ENTREGA_CONFIRMA = false; DESENHO.entrega(); }

function entregaEnviar() {
  const alvo = entregaAlvo();
  if (!alvo) return;
  if (!alvo.e.dentro) {
    ENTREGA_RECADO = { tom: 'atencao', titulo: 'Esta entrega não entra no contrato deste projeto.',
      texto: 'Mandar para validação faria o cliente ver como pronta uma parte que ele não contratou. Se ela precisa entrar, a mudança de nível se resolve antes, na leitura do caso.' };
    DESENHO.entrega(); return;
  }

  const quem = entregaQuemSou();
  const agora = new Date().toISOString();
  let numero = 0;

  const gravou = entregaSalvar(function (e) {
    numero = e.versoes.length + 1;
    // a copia congelada e o que o cliente recebeu. Sem ela, quando ele
    // pedir ajuste ninguem sabe mais o que estava escrito no dia
    e.versoes.push({
      n: numero, em: agora, por: quem,
      campos: JSON.parse(JSON.stringify(e.campos || {})),
      checklist: JSON.parse(JSON.stringify(e.checklist || [])),
      pedido: null,
    });
    e.estado = 'com_cliente';
    e.enviadaEm = agora;
  });
  if (!gravou) { ENTREGA_CONFIRMA = false; DESENHO.entrega(); return; }

  const p = entregaProjeto(alvo.p.id);
  const publicou = entregaPublicarRetrato(p, alvo.e.k, quem, agora);

  ENTREGA_CONFIRMA = false;
  ENTREGA_RECADO = publicou
    ? { tom: 'ok', titulo: esc(alvo.e.nome) + ' foi para validação, na versão ' + numero + '.',
        texto: 'A bola passou para o cliente hoje. O retrato dele foi publicado no mesmo gesto, e a tela Meu projeto já mostra esta entrega com a data de agora. Quando ele responder, registre aqui embaixo o que ele pediu ou a aprovação.' }
    : { tom: 'atencao', titulo: esc(alvo.e.nome) + ' foi enviada, e o retrato do cliente não coube.',
        texto: 'A versão ' + numero + ' ficou guardada e a entrega está com o cliente, mas a tela Meu projeto continua mostrando o retrato anterior. Abra A casa para ver o espaço ocupado e envie de novo depois.' };
  DESENHO.entrega();
}

/* ------------------------------------------ o que voltou do cliente */

function entregaAbrirRetorno(tipo) {
  ENTREGA_RETORNO = tipo;
  ENTREGA_RECADO = null;
  DESENHO.entrega();
}

function entregaCancelarRetorno() { ENTREGA_RETORNO = null; DESENHO.entrega(); }

// O que se registra aqui e o que o cliente respondeu, e nao o que nos
// achamos. Por isso o pedido de ajuste fica preso a versao que ele viu:
// e a unica forma de saber depois o que mudou por causa dele.
function entregaRegistrarAjuste() {
  const alvo = entregaAlvo();
  if (!alvo) return;
  const caixa = porId('entrega-pedido');
  const texto = caixa ? String(caixa.value || '').trim() : '';
  if (!texto) {
    ENTREGA_RECADO = { tom: 'atencao', titulo: 'Escreva o que ele pediu.',
      texto: 'Pedido de ajuste sem o texto do cliente vira lembrança de reunião, e em duas semanas ninguém sabe mais o que era. O que estiver escrito aqui aparece junto da versão que ele viu.' };
    DESENHO.entrega(); return;
  }
  const quem = entregaQuemSou();
  const agora = new Date().toISOString();
  const gravou = entregaSalvar(function (e) {
    const ultima = e.versoes.length ? e.versoes[e.versoes.length - 1] : null;
    if (ultima) ultima.pedido = { texto: texto, em: agora, por: quem };
    e.estado = 'escrevendo';
  });
  if (!gravou) { DESENHO.entrega(); return; }

  const p = entregaProjeto(alvo.p.id);
  entregaPublicarRetrato(p, alvo.e.k, quem, agora);
  ENTREGA_RETORNO = null;
  ENTREGA_RECADO = { tom: 'info', titulo: 'Pedido de ajuste registrado, e a bola voltou para a nossa mesa.',
    texto: 'A entrega está sendo escrita de novo. O que ele pediu ficou preso à versão que ele viu, e o próximo envio nasce como versão ' + (alvo.e.versoes.length + 1) + '.' };
  DESENHO.entrega();
}

function entregaRegistrarAprovacao() {
  const alvo = entregaAlvo();
  if (!alvo) return;
  const faseAntes = entregaFaseDe(alvo.oito);
  const quem = entregaQuemSou();
  const agora = new Date().toISOString();

  const gravou = entregaSalvar(function (e) {
    e.estado = 'aprovada';
    e.aprovadaEm = agora;
  });
  if (!gravou) { DESENHO.entrega(); return; }

  const p = entregaProjeto(alvo.p.id);
  entregaPublicarRetrato(p, alvo.e.k, quem, agora);
  const faseDepois = entregaFaseDe(entregaOito(p));

  ENTREGA_RETORNO = null;
  ENTREGA_RECADO = (faseDepois !== faseAntes)
    ? { tom: 'ok', titulo: 'A fase ' + esc(nomeFase(faseAntes)) + ' terminou.',
        texto: 'O cliente aprovou a última entrega contratada dessa fase, e o projeto está agora em ' + esc(nomeFase(faseDepois)) +
               '. A fase virou por causa disto, e não porque alguém mexeu num cartão.' }
    : { tom: 'ok', titulo: esc(alvo.e.nome) + ' foi aprovada pelo cliente.',
        texto: 'Carimbada hoje. A fase ' + esc(nomeFase(faseAntes)) + ' continua aberta enquanto as outras entregas contratadas dela não voltarem aprovadas.' };
  DESENHO.entrega();
}

/* ---------------------------------------------------------------------
   10. O desenho. Tudo sai do que esta guardado, e nada depende do que ja
   estava na tela.
   --------------------------------------------------------------------- */

// De quem e a bola sai do estado das oito, e nao de um campo que alguem
// lembrou de virar.
function entregaBola(p, oito) {
  const esperando = oito.filter(function (e) { return e.dentro && e.estado === 'com_cliente'; });
  const lado = esperando.length ? 'cliente' : 'casa';
  const guardado = p.bola || {};
  let desde = (guardado.lado === lado && guardado.desde) ? guardado.desde : null;
  if (!desde && lado === 'cliente') {
    esperando.forEach(function (e) {
      const d = data(e.enviadaEm);
      if (!d) return;
      if (!desde || d.getTime() < data(desde).getTime()) desde = e.enviadaEm;
    });
  }
  if (!desde) desde = guardado.desde || p.inicio || null;
  return { lado: lado, desde: desde, dias: desde ? Math.max(0, diasDesde(desde) || 0) : 0, esperando: esperando };
}

function entregaHtmlCabecalho(alvo) {
  const p = alvo.p, e = alvo.e, oito = alvo.oito;
  const nivel = entregaNivel(p.nivelContratado);
  const fase = entregaFaseDe(oito);
  const bola = entregaBola(p, oito);
  const faltamDias = diasDesde(p.produtoProntoEm);
  const pessoas = entregaPessoas();
  const responsavel = entregaNomePessoa(e.responsavelId);
  const venceu = entregaVenceu(e.prazo) && e.estado !== 'aprovada';
  const aprovadas = oito.filter(function (x) { return x.dentro && x.estado === 'aprovada'; }).length;
  const noEscopo = oito.filter(function (x) { return x.dentro; }).length;

  const projetos = entregaProjetos();
  const troca = projetos.length > 1
    ? entregaHtmlEscolha('', p.id, projetos.map(function (x) { return { v: x.id, nome: x.rotulo || x.cliente || x.id }; }),
        'entregaTrocarProjeto(this.value)', 'campo-sm')
    : '<div style="font-size:13px;color:var(--tx-2)">' + esc(p.rotulo || p.cliente || '') + '</div>';

  return '<div class="cartao">' +
    '<div style="display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:18px">' +
      '<div style="flex:1 1 320px">' +
        '<div style="font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--tx-4);font-weight:700">' +
          'Entrega ' + String(e.n).padStart(2, '0') + ' de 08' +
        '</div>' +
        '<h2 style="font-family:var(--display);font-weight:300;font-size:24px;color:var(--claro);margin:6px 0 4px">' +
          esc(e.nome) + '</h2>' +
        '<p style="font-size:13px;color:var(--tx-3)">' + esc(e.resumo) + '</p>' +
      '</div>' +
      '<div style="flex:0 0 auto;display:flex;flex-direction:column;gap:8px;align-items:flex-end">' +
        '<span id="entrega-selo-estado">' + etiqueta(ESTADOS_ENTREGA, e.estado, 'Não começou') + '</span>' +
        '<div style="min-width:190px">' +
          '<span class="rotulo" style="text-align:right">Projeto</span>' + troca +
        '</div>' +
      '</div>' +
    '</div>' +

    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(158px,1fr));gap:16px;padding-top:16px;border-top:1px solid var(--fio-2)">' +
      entregaFato('Cliente', esc(p.cliente || 'sem nome'),
        nivel ? esc(nivel.nome) + ', ' + esc(moeda(p.valor)) : 'sem nível contratado') +
      entregaFato('Fase agora', esc(nomeFase(fase)),
        aprovadas + ' de ' + noEscopo + ' entregas aprovadas pelo cliente') +
      entregaFato('Etapa do método', esc(nomeEtapa(ENTREGA_ETAPA[e.k] || 1)),
        'etapa ' + (ENTREGA_ETAPA[e.k] || 1) + ' de 6') +
      entregaFato('De quem é a bola',
        bola.lado === 'cliente'
          ? '<span class="eti eti-atencao">com o cliente</span>'
          : '<span class="eti eti-marca">com a gente</span>',
        bola.desde ? 'desde ' + esc(dataCurta(bola.desde)) + ', ' + bola.dias + ' dias' : 'sem data de início') +
      entregaFato('Prazo desta entrega',
        '<input class="campo campo-sm" type="date" value="' + esc(e.prazo || '') + '" onchange="entregaPrazo(this.value)">',
        venceu ? '<span style="color:var(--alerta)">venceu ' + esc(haQuanto(e.prazo)) + '</span>'
          : (e.prazo ? 'combinado internamente, o cliente não vê' : 'sem prazo interno')) +
      entregaFato('Quem escreve',
        entregaHtmlEscolha('', e.responsavelId || '',
          [{ v: '', nome: 'ninguém ainda' }].concat(pessoas.map(function (u) { return { v: u.id, nome: u.nome }; })),
          'entregaResponsavel(this.value)', 'campo-sm'),
        responsavel ? '' : 'entrega sem dono some da semana de todo mundo') +
      entregaFato('Produto pronto', esc(dataCurta(p.produtoProntoEm)),
        faltamDias === null ? 'sem data prometida'
          : faltamDias > 0 ? '<span style="color:var(--alerta)">passou há ' + faltamDias + ' dias</span>'
          : 'faltam ' + Math.abs(faltamDias) + ' dias') +
    '</div>' +
    '</div>';
}

// As oito sempre visiveis, na ordem e com o nome da landing. As que nao
// entraram no contrato ficam apagadas e continuam clicaveis: e la que o
// que falta para subir de nivel esta escrito.
function entregaHtmlOito(alvo) {
  const p = alvo.p;
  const botoes = alvo.oito.map(function (e) {
    const aberta = !!alvo.e && e.k === alvo.e.k;
    const cor = e.estado === 'aprovada' ? 'var(--ok)'
      : e.estado === 'com_cliente' ? 'var(--atencao)'
      : e.estado === 'escrevendo' ? 'var(--info)' : 'var(--tx-4)';
    const fundo = aberta ? 'var(--o-10)' : 'var(--fundo-2)';
    const borda = aberta ? 'var(--o-35)' : 'var(--fio)';
    return '<button class="bt" style="flex:0 0 auto;flex-direction:column;align-items:flex-start;gap:4px;' +
        'background:' + fundo + ';border-color:' + borda + ';padding:11px 14px;min-width:158px;' +
        (e.dentro ? '' : 'opacity:.45;') + '" ' +
        'onclick="entregaAbrir(' + entregaArg(p.id) + ',' + entregaArg(e.k) + ')">' +
      '<span style="font-size:10px;letter-spacing:.12em;color:var(--tx-4);font-weight:700">' +
        String(e.n).padStart(2, '0') + '</span>' +
      '<span style="font-size:12.5px;color:' + (aberta ? 'var(--o-lt)' : 'var(--tx-2)') + ';font-weight:600">' +
        esc(e.nome) + '</span>' +
      '<span style="display:flex;align-items:center;gap:6px;font-size:10.5px;color:var(--tx-4);font-weight:400">' +
        '<span style="width:7px;height:7px;border-radius:50%;background:' + cor + ';display:inline-block"></span>' +
        esc(e.dentro ? entregaEstadoTexto(e.estado) : 'fora do contrato') +
      '</span>' +
    '</button>';
  }).join('');

  return '<div class="cartao">' +
    '<div class="cartao-t"><span>As oito deste projeto</span>' +
      '<span style="margin-left:auto;text-transform:none;letter-spacing:0;font-weight:400;font-size:11px;color:var(--tx-4)">' +
      'A ordem é a da landing: uma sustenta a seguinte.</span></div>' +
    '<div class="rolo-h"><div style="display:flex;gap:10px;padding-bottom:4px">' + botoes + '</div></div>' +
    '</div>';
}

function entregaHtmlFalta(alvo) {
  if (!alvo) return '';
  const e = alvo.e;
  const falta = entregaFalta(e);
  const pronto = entregaPronto(e);

  if (!falta.total) {
    return aviso('ok', 'Nada falta para esta entrega sair.',
      (pronto.total ? 'Os ' + pronto.total + ' itens da definição de pronto estão marcados e os' : 'Os') +
      ' campos essenciais estão escritos. O botão de enviar para validação está no rodapé desta tela.');
  }

  const itens = falta.itens.length
    ? '<div style="margin-bottom:14px"><span class="rotulo">Definição de pronto, em aberto</span><ul style="margin:0;padding-left:18px;font-size:13px;color:var(--tx-2)">' +
        falta.itens.map(function (i) { return '<li style="margin-bottom:4px">' + esc(i.texto) + '</li>'; }).join('') + '</ul></div>'
    : '';
  const campos = falta.campos.length
    ? '<div><span class="rotulo">Campos essenciais em branco</span><ul style="margin:0;padding-left:18px;font-size:13px;color:var(--tx-2)">' +
        falta.campos.map(function (c) { return '<li style="margin-bottom:4px">' + esc(c.rot) + '</li>'; }).join('') + '</ul></div>'
    : '';

  return '<p style="font-size:13px;color:var(--tx-3);margin-bottom:14px">' +
      falta.total + (falta.total === 1 ? ' coisa separa' : ' coisas separam') + ' esta entrega do cliente.</p>' +
    itens + campos;
}

// Depois de escrever um campo, so estes dois pedacos mudam. Redesenhar a
// tela inteira aqui tiraria o foco de quem esta passando de um campo para
// o outro, e o texto seguinte iria para o lugar errado.
function entregaAtualizarFalta() {
  const alvo = entregaAlvo();
  if (!alvo) return;
  escrever('entrega-falta', entregaHtmlFalta(alvo));
  escrever('entrega-selo-estado', etiqueta(ESTADOS_ENTREGA, alvo.e.estado, 'Não começou'));
  if (alvo.e.k === 'preco' && porId('entrega-frase-preco')) {
    escrever('entrega-frase-preco', entregaHtmlFrasePreco(alvo.e.campos));
  }
  contador('entrega', entregaNaMesa());
}

/* --------------------------------------------------- 1. o roteiro */

function entregaHtmlRoteiro(alvo) {
  const e = alvo.e;
  const pronto = entregaPronto(e);
  const hojeRoteiro = entregaRoteiroDeHoje(e.k);

  const corpo = e.checklist.length
    ? e.checklist.map(function (item, i) {
        return '<label style="display:flex;gap:11px;align-items:flex-start;padding:9px 0;border-bottom:1px solid var(--fio-2);cursor:pointer">' +
          '<input type="checkbox" style="margin-top:3px;accent-color:var(--o)" ' + (item.feito ? 'checked ' : '') +
            'onchange="entregaMarcar(' + i + ', this.checked)">' +
          '<span style="font-size:13px;color:' + (item.feito ? 'var(--tx-4)' : 'var(--tx-2)') + '">' + esc(item.texto) + '</span>' +
        '</label>';
      }).join('')
    : aviso('atencao', 'Este contrato nasceu sem definição de pronto.',
        'A entrega foi copiada de Roteiros e níveis no dia em que o projeto começou, e naquele dia ' + esc(nomeEntrega(e.k)) +
        ' ainda não tinha itens escritos. Sem eles a mesa não tem o que cobrar, e ninguém consegue dizer se a entrega está pronta ou só parece pronta.') +
      (EU.pode('roteiros') ? '<button class="bt bt-linha bt-sm" onclick="irPara(\'roteiros\')">Escrever a definição de pronto</button>' : '');

  // A diferenca entre o roteiro de hoje e o que este contrato copiou nao e
  // erro: e o que o metodo aprendeu depois que este projeto comecou. Fica
  // escrito para ninguem cobrar deste cliente um item que ele nao comprou.
  let diferenca = '';
  if (e.checklist.length && hojeRoteiro.checklist.length !== e.checklist.length) {
    diferenca = '<p class="dica" style="margin-top:14px">O roteiro mudou depois que este projeto nasceu: hoje ele tem ' +
      hojeRoteiro.checklist.length + ' itens e este contrato tem ' + e.checklist.length +
      '. O que vale aqui é o deste contrato, porque foi o que o cliente comprou.</p>';
  }

  const comoFazer = hojeRoteiro.comoFazer
    ? '<div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--fio-2)">' +
        '<span class="rotulo">Como fazer, do roteiro de hoje</span>' +
        '<p style="font-size:13px;color:var(--tx-2)">' + entregaLinhas(hojeRoteiro.comoFazer) + '</p>' +
      '</div>'
    : '';

  return '<div class="cartao">' +
    '<div class="cartao-t"><span>1. O roteiro deste contrato</span>' +
      '<span style="margin-left:auto;text-transform:none;letter-spacing:0;font-weight:400;font-size:11px;color:var(--tx-4)">' +
      (e.checklist.length ? pronto.feitos + ' de ' + pronto.total + ' marcados' : 'sem itens') + '</span></div>' +
    (e.checklist.length ? entregaBarra(pronto.parte) + '<div style="height:10px"></div>' : '') +
    corpo + diferenca + comoFazer +
    '</div>';
}

/* ------------------------------------- 2. os campos daquela entrega */

function entregaHtmlCampos(alvo) {
  const e = alvo.e;
  const defs = ENTREGA_CAMPOS[e.k] || [];
  const daCasa = ENTREGA_LINHA_DA_CASA[e.k]
    ? aviso('info', 'O que a casa promete nesta entrega', esc(ENTREGA_LINHA_DA_CASA[e.k]))
    : '';
  const frase = e.k === 'preco'
    ? '<div id="entrega-frase-preco" style="margin-top:4px;padding:14px 16px;border:1px solid var(--o-35);background:var(--o-05);border-radius:var(--r-sm)">' +
        entregaHtmlFrasePreco(e.campos) + '</div>'
    : '';

  return '<div class="cartao">' +
    '<div class="cartao-t"><span>2. ' + esc(e.nome) + ', escrito</span>' +
      '<span style="margin-left:auto;text-transform:none;letter-spacing:0;font-weight:400;font-size:11px;color:var(--tx-4)">' +
      'grava sozinho ao sair do campo</span></div>' +
    daCasa +
    defs.map(function (c) { return entregaHtmlEditor(c, e.campos); }).join('') +
    frase +
    '</div>';
}

/* -------------------------------------------------- 3. os insumos */

// As respostas saem na ordem em que vieram e nenhuma pergunta esta
// escrita no codigo: o Typeform muda, e aplicacao velha e nova precisam
// caber na mesma tela.
function entregaHtmlRespostas(lead) {
  const r = (lead && lead.respostas && typeof lead.respostas === 'object') ? lead.respostas : {};
  const chaves = Object.keys(r);
  if (!chaves.length) {
    return '<p class="dica">Esta aplicação chegou sem respostas guardadas. O que se sabe do caso é o que está na leitura, aqui em cima.</p>';
  }
  return chaves.map(function (pergunta) {
    let v = r[pergunta];
    if (Array.isArray(v)) v = v.join('; ');
    else if (v && typeof v === 'object') v = JSON.stringify(v);
    return '<div style="margin-bottom:12px">' +
      '<span class="rotulo">' + esc(pergunta) + '</span>' +
      '<div style="font-size:13px;color:var(--tx-2)">' + entregaLinhas(v) + '</div></div>';
  }).join('');
}

function entregaHtmlAplicacao(p) {
  if (p.leadId === null || p.leadId === undefined) {
    return aviso('info', 'Este projeto não está ligado a nenhuma aplicação.',
      'Ele foi aberto sem passar por uma ideia que chegou pelo Typeform, então não existe o que a pessoa escreveu antes de contratar. O que se sabe do caso é o que estiver na leitura e no Diagnóstico estratégico.');
  }
  const a = ENTREGA_APLIC;
  if (a.estado === 'nunca' || a.estado === 'carregando') {
    return aviso('info', 'Buscando no servidor o que a pessoa escreveu.',
      'As aplicações não moram neste navegador, e sim no banco, para a fila ser a mesma para quem está sentado ao lado. Leva alguns segundos.');
  }
  const botao = '<button class="bt bt-linha bt-sm" onclick="entregaBuscarAplicacao()">Buscar de novo</button>';
  if (a.estado === 'sem_servidor') {
    return aviso('alerta', 'Não consegui falar com o servidor.',
      'O que você escreve nesta entrega continua sendo gravado normalmente, porque isso é deste navegador. O que falta é só a memória da aplicação: nome das perguntas e respostas moram no banco.') + botao;
  }
  if (a.estado === 'login') {
    return aviso('atencao', 'Seu login venceu.',
      'O servidor respondeu com a página de entrada em vez das aplicações. Recarregue a página para entrar de novo. A entrega que está sendo escrita não se perde: ela é deste navegador.') + botao;
  }
  if (a.estado === 'sem_configuracao') {
    return aviso('alerta', 'O login protegido ainda não foi ligado.',
      'Sem ele o servidor não entrega as aplicações. Escreva a entrega com a leitura do caso, que é deste navegador.') + botao;
  }
  if (a.estado === 'sumiu') {
    return aviso('atencao', 'A aplicação deste projeto não está mais na lista do servidor.',
      'O projeto continua inteiro. O que sumiu foi a aplicação de número ' + esc(String(p.leadId)) +
      ', que pode ter saído das 500 mais recentes. O Diagnóstico estratégico deste projeto passa a ser a única memória do que a pessoa contou.') + botao;
  }
  if (a.estado === 'erro') {
    return aviso('alerta', 'O servidor recusou o pedido.',
      'O que ele respondeu foi: ' + esc(a.erro || 'sem explicação') + '.') + botao;
  }
  return '<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">' +
      '<span class="rotulo" style="margin:0">O que a pessoa escreveu na aplicação</span>' +
      '<span style="margin-left:auto;font-size:11px;color:var(--tx-4)">buscado em ' + esc(dataLonga(a.quando)) + '</span>' +
    '</div>' + entregaHtmlRespostas(a.lead);
}

function entregaHtmlInsumos(alvo) {
  const p = alvo.p, e = alvo.e;
  const l = entregaLeitura(p.leadId);

  const perfil = l && porChave(PERFIS, l.perfil) ? porChave(PERFIS, l.perfil).nome : null;
  const estagio = l && porChave(ESTAGIOS, l.estagio) ? porChave(ESTAGIOS, l.estagio).nome : null;
  const leitura = l
    ? '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:14px;margin-bottom:16px">' +
        entregaFato('Perfil', esc(perfil || 'sem perfil'), '') +
        entregaFato('Estágio', esc(estagio || 'sem estágio'), '') +
        entregaFato('O caso pede', (l.precisa || []).length + ' das oito',
          (l.precisa || []).map(function (k) { return esc(nomeEntrega(k)); }).join(', ')) +
      '</div>' +
      (l.justificativa ? '<div style="margin-bottom:16px"><span class="rotulo">Por que o nível indicado divergiu do clicado</span>' +
        '<div style="font-size:13px;color:var(--tx-2)">' + entregaLinhas(l.justificativa) + '</div></div>' : '')
    : '<p class="dica" style="margin-bottom:16px">Este projeto não tem leitura do caso guardada neste navegador. A leitura fica no navegador de quem preparou, e só o parecer assinado viaja com a aplicação.</p>';

  const fontes = (ENTREGA_ALIMENTA[e.k] || []).map(function (k) {
    const anterior = alvo.oito.find(function (x) { return x.k === k; });
    if (!anterior || !anterior.dentro) return '';
    const escrito = entregaHtmlLido(k, anterior.campos);
    const estado = anterior.estado === 'aprovada'
      ? 'aprovada pelo cliente em ' + esc(dataCurta(anterior.aprovadaEm))
      : entregaEstadoTexto(anterior.estado).toLowerCase() + ', ainda pode mudar';
    return '<div style="margin-bottom:18px;padding-top:14px;border-top:1px solid var(--fio-2)">' +
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">' +
        '<span class="rotulo" style="margin:0">' + esc(nomeEntrega(k)) + '</span>' +
        '<span style="font-size:11px;color:var(--tx-4)">' + estado + '</span>' +
      '</div>' +
      (escrito || '<p class="dica">Nada escrito nela ainda. Enquanto isto estiver vazio, esta entrega vai depender do que estiver na aplicação e na leitura.</p>') +
      '</div>';
  }).join('');

  return '<div class="cartao-t"><span>3. Insumos</span>' +
      '<span style="margin-left:auto;text-transform:none;letter-spacing:0;font-weight:400;font-size:11px;color:var(--tx-4)">' +
      'o que já foi respondido não se pergunta de novo</span></div>' +
    leitura +
    entregaHtmlAplicacao(p) +
    fontes;
}

function entregaPintarInsumos() {
  const alvo = entregaAlvo();
  if (!alvo || !alvo.e || !porId('entrega-insumos')) return;
  escrever('entrega-insumos', entregaHtmlInsumos(alvo));
}

/* ------------------------------------------------------- o rodape */

// Endereco de terceiro entra escrito por gente, e href aceita coisa que
// nao e endereco. So http e https saem daqui como link clicavel.
function entregaUrlSegura(u) {
  const t = String(u || '').trim();
  return /^https?:\/\//i.test(t) ? t : '';
}

function entregaHtmlLinks(alvo) {
  const e = alvo.e;
  const linhas = e.links.map(function (link, i) {
    const url = entregaUrlSegura(link.url);
    return '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:10px">' +
      '<input class="campo campo-sm" style="flex:1 1 180px;width:auto" placeholder="Nome, como Documento no Drive" ' +
        'value="' + esc(link.nome || '') + '" onchange="entregaLinkCampo(' + i + ', \'nome\', this.value)">' +
      '<input class="campo campo-sm" style="flex:2 1 260px;width:auto" placeholder="https://" ' +
        'value="' + esc(link.url || '') + '" onchange="entregaLinkCampo(' + i + ', \'url\', this.value)">' +
      (url ? '<a class="bt bt-linha bt-sm" href="' + esc(url) + '" target="_blank" rel="noreferrer noopener">Abrir</a>' : '') +
      '<button class="bt bt-linha bt-sm" onclick="entregaLinkRemover(' + i + ')">Tirar</button>' +
      '</div>';
  }).join('');

  return '<div class="cartao">' +
    '<div class="cartao-t"><span>Links desta entrega</span></div>' +
    (linhas || '<p class="dica" style="margin-bottom:12px">Nenhum link ainda. É por aqui que o cliente chega ao documento.</p>') +
    '<button class="bt bt-linha bt-sm" onclick="entregaLinkAcrescentar()">Acrescentar link</button>' +
    '<p class="dica" style="margin-top:12px">O sistema guarda endereço, nunca arquivo: nada aqui dentro serve de cofre, e arquivo grande derruba o armazenamento do navegador. O mesmo link aparece na tela do cliente depois do envio, então nome de pasta interna aparece do lado dele também.</p>' +
    '</div>';
}

function entregaHtmlVersoes(alvo) {
  const e = alvo.e;
  if (!e.versoes.length) {
    return '<div class="cartao">' +
      '<div class="cartao-t"><span>Histórico de versões</span></div>' +
      '<p class="dica">Nada foi enviado ainda. Do lado do cliente esta entrega não existe: a tela Meu projeto só passa a mostrar o conteúdo dela depois do primeiro envio para validação.</p>' +
      '</div>';
  }

  const linhas = e.versoes.slice().reverse().map(function (v) {
    const aberta = ENTREGA_VERSAO_ABERTA === v.n;
    const pedido = v.pedido
      ? '<div style="margin-top:10px;padding:12px 14px;border-left:3px solid var(--atencao);background:var(--atencao-bg);border-radius:var(--r-sm)">' +
          '<span class="rotulo" style="color:var(--atencao)">O que o cliente pediu, em ' + esc(dataCurta(v.pedido.em)) + '</span>' +
          '<div style="font-size:13px;color:var(--tx-2)">' + entregaLinhas(v.pedido.texto) + '</div></div>'
      : '';
    const conteudo = aberta
      ? '<div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--fio-2)">' +
          (entregaHtmlLido(e.k, v.campos) || '<p class="dica">Esta versão saiu com os campos em branco.</p>') + '</div>'
      : '';
    return '<div style="padding:14px 0;border-bottom:1px solid var(--fio-2)">' +
      '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">' +
        '<span class="eti eti-neutra">versão ' + v.n + '</span>' +
        '<span style="font-size:13px;color:var(--tx-2)">enviada em ' + esc(dataLonga(v.em)) + ' por ' + esc(v.por || 'sem nome') + '</span>' +
        '<button class="bt bt-linha bt-sm" style="margin-left:auto" onclick="entregaVerVersao(' + v.n + ')">' +
          (aberta ? 'Fechar' : 'Ver o que foi enviado') + '</button>' +
      '</div>' + pedido + conteudo +
      '</div>';
  }).join('');

  return '<div class="cartao">' +
    '<div class="cartao-t"><span>Histórico de versões</span>' +
      '<span style="margin-left:auto;text-transform:none;letter-spacing:0;font-weight:400;font-size:11px;color:var(--tx-4)">' +
      e.versoes.length + (e.versoes.length === 1 ? ' envio' : ' envios') + '</span></div>' +
    linhas +
    '</div>';
}

function entregaHtmlEnvio(alvo) {
  const e = alvo.e;
  const falta = entregaFalta(e);

  if (ENTREGA_RETORNO === 'ajuste') {
    return '<div class="cartao">' +
      '<div class="cartao-t"><span>O que o cliente pediu</span></div>' +
      '<textarea class="campo" id="entrega-pedido" placeholder="Do jeito que ele falou, no WhatsApp ou na chamada"></textarea>' +
      '<p class="dica" style="margin:8px 0 14px">Fica preso à versão ' + e.versoes.length + ', que foi a que ele viu. É assim que se sabe depois o que mudou por causa dele e o que mudou por nossa conta.</p>' +
      '<button class="bt bt-marca" onclick="entregaRegistrarAjuste()">Registrar o pedido</button> ' +
      '<button class="bt bt-linha" onclick="entregaCancelarRetorno()">Voltar</button>' +
      '</div>';
  }

  if (ENTREGA_RETORNO === 'aprovada') {
    return '<div class="cartao">' +
      '<div class="cartao-t"><span>Confirmar a aprovação do cliente</span></div>' +
      '<p style="font-size:13px;color:var(--tx-2);margin-bottom:14px">Isto carimba que o cliente aprovou ' + esc(e.nome) +
        ', e é isso que faz a fase andar. Registre só o que ele disse de verdade: aprovação carimbada sem resposta dele vira fase errada na tela dele e cobrança errada na nossa.</p>' +
      '<button class="bt bt-marca" onclick="entregaRegistrarAprovacao()">O cliente aprovou</button> ' +
      '<button class="bt bt-linha" onclick="entregaCancelarRetorno()">Voltar</button>' +
      '</div>';
  }

  if (e.estado === 'com_cliente') {
    return '<div class="cartao">' +
      '<div class="cartao-t"><span>Está com o cliente</span></div>' +
      '<p style="font-size:13px;color:var(--tx-2);margin-bottom:14px">Enviada em ' + esc(dataLonga(e.enviadaEm)) + ', ' + esc(haQuanto(e.enviadaEm)) +
        ', na versão ' + e.versoes.length + '. Enquanto ela não voltar, a fase ' + esc(nomeFase(alvo.p.fase || entregaFaseDe(alvo.oito))) +
        ' não termina e o prazo do produto pronto continua correndo do mesmo jeito.</p>' +
      '<button class="bt bt-marca" onclick="entregaAbrirRetorno(\'aprovada\')">Registrar aprovação</button> ' +
      '<button class="bt bt-linha" onclick="entregaAbrirRetorno(\'ajuste\')">Registrar pedido de ajuste</button>' +
      '</div>';
  }

  if (ENTREGA_CONFIRMA) {
    const itens = falta.itens.map(function (i) { return '<li style="margin-bottom:4px">' + esc(i.texto) + '</li>'; }).join('');
    const campos = falta.campos.map(function (c) { return '<li style="margin-bottom:4px">' + esc(c.rot) + ', em branco</li>'; }).join('');
    return '<div class="cartao">' +
      aviso('atencao', 'Falta ' + falta.total + (falta.total === 1 ? ' coisa' : ' coisas') + ' para esta entrega estar pronta.',
        '<ul style="margin:8px 0 0;padding-left:18px">' + itens + campos + '</ul>') +
      '<p style="font-size:13px;color:var(--tx-2);margin-bottom:14px">Enviar assim manda o cliente olhar uma entrega incompleta, e a próxima resposta dele vai ser sobre o que falta, não sobre o que foi feito. Se for de propósito, siga.</p>' +
      '<button class="bt bt-marca" onclick="entregaEnviar()">Enviar assim mesmo</button> ' +
      '<button class="bt bt-linha" onclick="entregaCancelarEnvio()">Voltar e terminar</button>' +
      '</div>';
  }

  const aprovada = e.estado === 'aprovada'
    ? aviso('ok', 'Aprovada pelo cliente em ' + esc(dataCurta(e.aprovadaEm)) + '.',
        'O que você mudar aqui a partir de agora não está aprovado e não chega até ele: o que ele vê continua sendo a versão ' +
        e.versoes.length + '. Mudança que precise valer para o cliente pede um novo envio.')
    : '';

  return '<div class="cartao">' +
    '<div class="cartao-t"><span>Enviar para validação</span></div>' +
    aprovada +
    '<p style="font-size:13px;color:var(--tx-2);margin-bottom:14px">Este é o único caminho para a entrega aparecer do lado do cliente. O envio faz três coisas de uma vez: congela a versão ' +
      (e.versoes.length + 1) + ', passa a bola para ele e publica o retrato que a tela Meu projeto mostra. Ninguém precisa lembrar de publicar nada.</p>' +
    '<button class="bt bt-marca" onclick="entregaPedirEnvio()">' +
      (e.versoes.length ? 'Enviar a versão ' + (e.versoes.length + 1) : 'Enviar para validação') + '</button>' +
    (falta.total ? '<p class="dica" style="margin-top:10px">' + falta.total +
      (falta.total === 1 ? ' item ainda separa' : ' itens ainda separam') + ' esta entrega do cliente. O botão pergunta antes de mandar assim.</p>' : '') +
    '</div>';
}

/* --------------------------------------- entrega fora do contrato */

function entregaHtmlForaDoContrato(alvo) {
  const p = alvo.p, e = alvo.e;
  const contratado = entregaNivel(p.nivelContratado);
  const donos = entregaNiveis().filter(function (n) { return (n.escopo || []).indexOf(e.k) >= 0; });
  const menor = donos.slice().sort(function (a, b) { return (a.valor || 0) - (b.valor || 0); })[0] || null;
  const diferenca = (menor && contratado) ? (Number(menor.valor) || 0) - (Number(contratado.valor) || 0) : null;

  return '<div class="cartao">' +
    aviso('atencao', esc(e.nome) + ' não entra no contrato deste projeto.',
      'O nível contratado foi ' + esc(contratado ? contratado.nome : 'nenhum') +
      ', e o escopo foi congelado no dia em que o projeto nasceu, de propósito: é o combinado daquele contrato, e não uma consulta feita na hora de desenhar a tela. ' +
      (menor ? 'Esta entrega faz parte do ' + esc(menor.nome) + '.' : 'Nenhum nível de hoje inclui esta entrega.')) +
    (diferenca !== null && diferenca > 0
      ? '<p style="font-size:13px;color:var(--tx-2);margin-bottom:14px">A diferença entre ' + esc(contratado.nome) + ' e ' + esc(menor.nome) + ' é ' + esc(moeda(diferenca)) +
        '. O cliente vê esta entrega apagada na tela dele, com o nome e a etiqueta do nível que a inclui, e é assim que a subida de nível no meio do caminho aparece sem ninguém precisar vender nada.</p>'
      : '') +
    '<p class="dica" style="margin-bottom:14px">Escrever aqui faria o cliente receber como pronta uma parte que ele não comprou. Se o caso mudou e ele precisa disto, a troca de nível se resolve na leitura do caso, antes.</p>' +
    (EU.pode('leitura') ? '<button class="bt bt-linha" onclick="irPara(\'leitura\')">Abrir a leitura do caso</button> ' : '') +
    (EU.pode('cliente') ? '<button class="bt bt-linha" onclick="irPara(\'cliente\')">Ver como o cliente vê</button>' : '') +
    '</div>';
}

/* ----------------------------------------------- nenhuma entrega aberta */

function entregaHtmlVazio() {
  const projetos = entregaProjetos();
  const p = window.PROJETO_ABERTO ? entregaProjeto(window.PROJETO_ABERTO) : null;

  const dito = '<div class="cartao">' +
    '<div class="cartao-t"><span>A mesa está livre</span></div>' +
    '<p style="font-size:13.5px;color:var(--tx-2);max-width:74ch;line-height:1.7">' +
      'Nenhuma entrega aberta. Escolha um projeto em Projetos em estruturação e clique em uma das oito. ' +
      'Se as oito estiverem apagadas, o projeto nasceu sem escopo: volte à leitura do caso e diga qual nível foi contratado, ' +
      'porque é o nível que define o que entra neste projeto.' +
    '</p>' +
    (projetos.length
      ? '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:16px">' +
          '<span class="rotulo" style="margin:0">Abrir daqui mesmo</span>' +
          entregaHtmlEscolha('', p ? p.id : '',
            [{ v: '', nome: 'escolha um projeto' }].concat(projetos.map(function (x) { return { v: x.id, nome: x.rotulo || x.cliente || x.id }; })),
            'entregaTrocarProjeto(this.value)', 'campo-sm') +
          (EU.pode('projetos') ? '<button class="bt bt-linha bt-sm" onclick="irPara(\'projetos\')">Ver os projetos</button>' : '') +
        '</div>'
      : '<div style="margin-top:16px">' +
          (EU.pode('leitura')
            ? '<button class="bt bt-marca" onclick="irPara(\'leitura\')">Ir para a leitura do caso</button>'
            : '') +
          '<p class="dica" style="margin-top:10px">Nenhum projeto foi aberto ainda neste navegador. Projeto nasce de um aceite na leitura do caso, e de nenhum outro lugar.</p>' +
        '</div>') +
    '</div>';

  if (!p) return dito;
  return dito + entregaHtmlOito({ p: p, e: null, oito: entregaOito(p) });
}

/* --------------------------------------------------- a tela inteira */

DESENHO.entrega = function () {
  contador('entrega', entregaNaMesa());
  escrever('entrega-recado', ENTREGA_RECADO ? aviso(ENTREGA_RECADO.tom, ENTREGA_RECADO.titulo, ENTREGA_RECADO.texto) : '');

  const alvo = entregaAlvo();
  if (!alvo) { escrever('entrega-corpo', entregaHtmlVazio()); return; }

  let html = entregaHtmlCabecalho(alvo) + entregaHtmlOito(alvo);

  if (!alvo.e.dentro) {
    html += entregaHtmlForaDoContrato(alvo);
  } else {
    html += '<div class="cartao">' +
        '<div class="cartao-t"><span>O que falta para ficar pronta</span></div>' +
        '<div id="entrega-falta">' + entregaHtmlFalta(alvo) + '</div>' +
      '</div>' +
      entregaHtmlRoteiro(alvo) +
      entregaHtmlCampos(alvo) +
      '<div class="cartao" id="entrega-insumos">' + entregaHtmlInsumos(alvo) + '</div>' +
      entregaHtmlLinks(alvo) +
      entregaHtmlVersoes(alvo) +
      entregaHtmlEnvio(alvo);
  }

  escrever('entrega-corpo', html);

  // a aplicacao vem do servidor e demora: pedir depois de a tela estar
  // desenhada deixa a entrega pronta para escrever enquanto ela nao chega
  if (alvo.e.dentro) entregaCarregarAplicacao(alvo.p);
};
