/* =====================================================================
   O formulario  ·  as perguntas da aplicacao, e como elas estao indo

   Duas visoes numa tela so: "As perguntas", que e o editor, e "Como esta
   indo", que sao os numeros. Uma tela so porque quem mexe numa pergunta
   quer ver no mesmo lugar o que aquela pergunta esta fazendo com a fila:
   a pergunta que faz metade das pessoas desistirem se conserta na aba do
   lado, sem procurar.

   Tres decisoes explicam quase todo o arquivo:

   1. O rascunho mora no SERVIDOR, nao neste navegador. E a unica forma de
      duas pessoas da mesa editarem o mesmo formulario. O que fica no
      navegador e so a rede de seguranca: o que foi digitado e ainda nao
      conseguiu chegar la.
   2. Versao nao se sobrescreve. Cada publicacao e uma linha nova, e a
      mais alta e a que esta no ar. Uma edicao errada as onze da noite
      precisa ter volta sem depender de ninguem.
   3. A chave curta de cada pergunta nunca muda. E por ela que o numero de
      antes e o de depois se somam quando o texto da pergunta melhora, e e
      por ela que "mudou o texto" pode existir no historico em vez de
      virar uma saida mais uma entrada.

   O que a pessoa escreve nos campos NAO redesenha a lista: perder o
   cursor no meio de uma frase e o jeito mais rapido de tornar um editor
   insuportavel. Digitar mexe no modelo e repinta so o cabecalho, a
   previa e os numeros.
   ===================================================================== */

/* ---------------------------------------------------------------------
   Vocabulario desta tela.
   --------------------------------------------------------------------- */

// Os oito tipos de resposta. `escolha` diz quem tem opcoes, e `familia`
// existe por causa de uma regra do servidor: uma pergunta que ja recebeu
// resposta pode trocar de texto curto para texto longo, mas nao pode
// virar escolha. As respostas de antes ficariam num formato e as de
// depois em outro, na mesma coluna da mesa.
const FORM_TIPOS = [
  { k: 'texto_curto',      nome: 'Texto curto',           familia: 'texto',  escolha: false },
  { k: 'texto_longo',      nome: 'Texto longo',           familia: 'texto',  escolha: false },
  { k: 'email',            nome: 'E-mail',                familia: 'texto',  escolha: false },
  { k: 'telefone',         nome: 'WhatsApp',              familia: 'texto',  escolha: false },
  { k: 'numero',           nome: 'Número',                familia: 'numero', escolha: false },
  { k: 'escolha_unica',    nome: 'Escolha única',         familia: 'escolha', escolha: true },
  { k: 'escolha_multipla', nome: 'Mais de uma resposta',  familia: 'escolha', escolha: true },
  { k: 'recado',           nome: 'Recado sem resposta',   familia: 'recado', escolha: false },
];

// O que a resposta vira na lista da mesa. Nome, e-mail e WhatsApp ganham
// coluna propria em "Ideias que chegaram"; o resto aparece dentro da
// aplicacao, na ordem daqui.
const FORM_PAPEIS = [
  { k: '',         nome: 'nada em coluna própria', eti: '' },
  { k: 'nome',     nome: 'o nome de quem aplicou', eti: 'vira o nome' },
  { k: 'email',    nome: 'o e-mail',               eti: 'vira o e-mail' },
  { k: 'whatsapp', nome: 'o WhatsApp',             eti: 'vira o WhatsApp' },
];

// Paises do seletor de WhatsApp. A lista e curta de proposito: e para
// escolher o que ja vem marcado, nao para catalogar o mundo.
const FORM_PAISES = [
  { k: 'BR', nome: 'Brasil' },
  { k: 'PT', nome: 'Portugal' },
  { k: 'US', nome: 'Estados Unidos' },
  { k: 'AR', nome: 'Argentina' },
  { k: 'CL', nome: 'Chile' },
  { k: 'CO', nome: 'Colômbia' },
  { k: 'MX', nome: 'México' },
  { k: 'ES', nome: 'Espanha' },
];

// Os quatro recortes de tempo da outra visao. Sem calendario de datas: a
// pergunta que a mesa faz e "como foi o mes", nunca "como foi de 12 a 19".
const FORM_PERIODOS = [
  { k: '7',    nome: 'Últimos 7 dias' },
  { k: '30',   nome: 'Últimos 30 dias' },
  { k: 'mes',  nome: 'Este mês' },
  { k: 'tudo', nome: 'Desde o começo' },
];

// Titulo de fabrica da sexta pergunta, que a Carla ainda nao mandou. O
// aviso do topo some no instante em que ela trocar este texto.
const FORM_TITULO_RESERVADO = 'Pergunta que ainda falta';

// Abaixo disso, conta de "cada 10" balanca demais para ser escrita.
const FORM_MINIMO_PARA_CONTA = 20;

// Passando disso, a pergunta merece etiqueta de alerta na escada.
const FORM_ABANDONO_ALTO = 15;

/* ---------------------------------------------------------------------
   O estado da tela.
   --------------------------------------------------------------------- */
const FORM = {
  aba: 'perguntas',        // perguntas | medidas

  estado: 'ocioso',        // ocioso | carregando | ok | erro
  falha: null,             // o estado de rede, quando a leitura nao completou
  recado: null,            // o que acabou de dar errado numa gravacao
  vivo: '',                // a linha falada: a ultima coisa que aconteceu

  def: null,               // a definicao que esta sendo editada
  servidor: null,          // a mesma como o servidor a devolveu
  noAr: null,              // a que esta publicada agora
  atual: 0,                // numero da versao no ar
  versoes: [],
  temRascunho: false,      // existe rascunho guardado no servidor
  publicadoEm: null,
  publicadoPor: null,
  lidoEm: null,

  aberta: null,            // chave da pergunta aberta, uma por vez
  previa: {},              // o que foi marcado na previa, so para ver
  salvando: false,
  confirmando: false,      // o bloco de confirmar a publicacao esta aberto
  soLeitura: false,        // colaborador, ou login protegido desligado
  diffAberto: null,        // versao com as diferencas abertas na tabela
  guardadas: {},           // definicoes de versoes ja buscadas, por numero
  verMais: false,          // a tabela de versoes esta inteira
  resgate: null,           // o que ficou guardado neste navegador
  conflito: null,          // alguem publicou enquanto esta tela editava

  periodo: '30',
  med: null,
  medEstado: 'ocioso',
  medFalha: null,
  medLidoEm: null,
};

/* ---------------------------------------------------------------------
   Pecas pequenas.
   --------------------------------------------------------------------- */

function formCopia(v) { try { return JSON.parse(JSON.stringify(v)); } catch (e) { return null; } }

function formTipo(k) {
  return FORM_TIPOS.find(function (t) { return t.k === k; }) || FORM_TIPOS[0];
}

function formNomeTipo(k) { return formTipo(k).nome; }

function formPerguntas() {
  return (FORM.def && Array.isArray(FORM.def.perguntas)) ? FORM.def.perguntas : [];
}

function formAchar(chave) {
  return formPerguntas().find(function (p) { return p.chave === chave; }) || null;
}

function formIndice(chave) {
  const lista = formPerguntas();
  for (let i = 0; i < lista.length; i++) if (lista[i].chave === chave) return i;
  return -1;
}

function formAtivas() {
  return formPerguntas().filter(function (p) { return p.ativa !== false; });
}

// A numeracao que a pessoa ve. Recado nao entra: ele nao e pergunta, e
// contar ele faria a pagina publica dizer "3 de 10" onde ha 9 perguntas.
function formNumeroDaPergunta(p) {
  const contam = formAtivas().filter(function (x) { return x.tipo !== 'recado'; });
  const i = contam.indexOf(p);
  return i < 0 ? null : i + 1;
}

// 1a, 2a, 3a. A casa escreve assim, e o leitor de tela le "primeira".
function formOrdem(n) { return String(n) + 'a'; }

function formChaveLimpa(v) {
  return String(v || '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 40).replace(/^[^a-z]+/, '');
}

// Texto normalizado para comparar titulos: espaco sobrando e maiuscula
// nao fazem dois titulos serem diferentes na lista da mesa.
function formNormal(v) { return String(v || '').trim().toLowerCase().replace(/\s+/g, ' '); }

// Sem acento e sem pontuacao: duas perguntas que so diferem nisso nao
// bloqueiam a publicacao, mas merecem um aviso.
function formQuaseIgual(v) {
  let t = formNormal(v);
  if (t.normalize) t = t.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return t.replace(/[^a-z0-9 ]/g, '');
}

// A pergunta ja foi publicada alguma vez? Enquanto nao foi, a chave curta
// ainda se escolhe, e o tipo troca de familia a vontade.
function formJaPublicada(chave) {
  if (!FORM.noAr || !Array.isArray(FORM.noAr.perguntas)) return false;
  return FORM.noAr.perguntas.some(function (p) { return p.chave === chave; });
}

function formPapelDe(papel) {
  return formAtivas().find(function (p) { return p.papel === papel; }) || null;
}

// A tela inteira em leitura: o colaborador ve, o gestor edita. O que se
// pergunta na porta e decisao de quem responde pela empresa.
function formPodeEditar() { return !FORM.soLeitura && EU.ehGestor(); }

function formTrava() { return formPodeEditar() ? '' : ' disabled'; }

function formDizer(frase) {
  FORM.vivo = frase || '';
  const alvo = porId('form-vivo');
  if (alvo) alvo.textContent = FORM.vivo;
}

function formHoraCurta(v) {
  const d = data(v) || (v instanceof Date ? v : null);
  if (!d) return '';
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }).replace(':', 'h');
}

// Uma data AAAA-MM-DD lida no fuso de quem esta olhando, e nao em UTC:
// "2026-08-31" tem que ser 31 de agosto para quem esta em Sao Paulo.
function formDataSimples(v) {
  const partes = String(v || '').split('-');
  if (partes.length !== 3) return null;
  const d = new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
  return isNaN(d.getTime()) ? null : d;
}

function formDiaRelativo(passos) {
  const d = new Date();
  d.setDate(d.getDate() + (passos || 0));
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' +
         String(d.getDate()).padStart(2, '0');
}

function formPeriodoFrase(de, ate) {
  const a = formDataSimples(de), b = formDataSimples(ate);
  if (!a || !b) return '';
  const mesA = a.toLocaleDateString('pt-BR', { month: 'long' });
  const mesB = b.toLocaleDateString('pt-BR', { month: 'long' });
  if (mesA === mesB && a.getFullYear() === b.getFullYear()) {
    return 'De ' + a.getDate() + ' a ' + b.getDate() + ' de ' + mesB + '.';
  }
  return 'De ' + a.getDate() + ' de ' + mesA + ' a ' + b.getDate() + ' de ' + mesB + '.';
}

// Minutos inteiros, que e como se fala de tempo de formulario. Abaixo de
// um minuto a conta em minutos mentiria, e a de segundos e a verdadeira.
function formTempo(ms) {
  const seg = Math.round(Number(ms || 0) / 1000);
  if (seg < 90) return seg + (seg === 1 ? ' segundo' : ' segundos');
  const min = Math.round(seg / 60);
  return min + (min === 1 ? ' minuto' : ' minutos');
}

// "3 de cada 10". Nunca porcentagem solta: 42,2% nao se compara de
// cabeca com nada, e 4 de cada 10 se compara com o mes passado.
function formCadaDez(parte, total) {
  if (!total) return null;
  return Math.round((Number(parte || 0) / Number(total)) * 10);
}

function formPorCento(parte, total) {
  if (!total) return 0;
  return Math.round((Number(parte || 0) / Number(total)) * 100);
}

function formNumeroBloco(valor, rotulo, puxa, zero) {
  return '<div class="numero' + (puxa ? ' puxa' : '') + '">' +
    '<div class="v' + (zero ? ' zero' : '') + '">' + valor + '</div>' +
    '<div class="l">' + rotulo + '</div></div>';
}

// A barra deitada da escada e das respostas. Largura em estilo na linha,
// como a tela vizinha ja faz: barra nao e classe nova na folha do sistema.
function formBarra(porcento, cor) {
  const p = Math.max(0, Math.min(100, Number(porcento) || 0));
  return '<div style="height:9px;border-radius:2px;background:var(--fio-2);overflow:hidden">' +
    '<div style="height:100%;width:' + p + '%;border-radius:2px;background:' + (cor || 'var(--o)') + '"></div></div>';
}

/* ---------------------------------------------------------------------
   A rede de seguranca deste navegador.

   O rascunho de verdade e o do servidor. Isto aqui e so o que foi
   digitado e ainda nao conseguiu chegar la: rede caiu, login venceu, aba
   fechada no meio. Volta como oferta, nunca aplicada sozinha, senao a
   tela de hoje seria substituida em silencio pelo que alguem digitou na
   terca e desistiu.
   --------------------------------------------------------------------- */
const FORM_CHAVE_RESGATE = (typeof CHAVES === 'object' && CHAVES.formularioRascunho) || 'iqv_formulario_rascunho';

// Gravar a cada letra digitada seria uma escrita no armazenamento por
// tecla. Um quarto de segundo depois da ultima e o suficiente para nada
// se perder e para o campo nao engasgar em maquina devagar.
let FORM_ESPERA_LOCAL = null;

function formGuardarLocal() {
  if (!FORM.def) return;
  if (FORM_ESPERA_LOCAL) clearTimeout(FORM_ESPERA_LOCAL);
  FORM_ESPERA_LOCAL = setTimeout(function () {
    FORM_ESPERA_LOCAL = null;
    if (!FORM.def) return;
    iqvGravar(FORM_CHAVE_RESGATE, {
      quando: new Date().toISOString(),
      base: FORM.atual,
      definicao: FORM.def,
    });
  }, 250);
}

function formApagarLocal() {
  // A gravacao que estava esperando morre junto: sem isso ela renasceria
  // um quarto de segundo depois de a publicacao ter dado certo.
  if (FORM_ESPERA_LOCAL) { clearTimeout(FORM_ESPERA_LOCAL); FORM_ESPERA_LOCAL = null; }
  iqvGravar(FORM_CHAVE_RESGATE, null);
}

function formLerLocal() {
  const g = iqvLer(FORM_CHAVE_RESGATE, null);
  return (g && g.definicao && Array.isArray(g.definicao.perguntas)) ? g : null;
}

/* ---------------------------------------------------------------------
   Conversa com o servidor.

   Um lugar so para os quatro estados de rede, porque a diferenca entre
   "a rede caiu" e "o seu login venceu" muda o que a pessoa faz em
   seguida, e as duas chegam aqui do mesmo jeito.
   --------------------------------------------------------------------- */
async function formPedir(caminho, opcoes) {
  let r;
  try {
    r = await fetch(caminho, opcoes || { headers: { accept: 'application/json' }, cache: 'no-store' });
  } catch (e) {
    return { erro: 'rede' };
  }
  // Quando o login protegido vence, o que volta e a pagina de login em
  // HTML. Ler aquilo como JSON estoura, e o estouro apareceria como erro
  // sem nome para quem so precisava recarregar a pagina.
  let corpo = null;
  try { corpo = await r.json(); } catch (e) { corpo = null; }
  if (corpo === null) return { erro: 'login' };
  if (r.status === 503) return { erro: 'semporta', corpo: corpo };
  if (r.status === 401) return { erro: 'sessao', corpo: corpo };
  if (r.status === 409) return { erro: 'conflito', corpo: corpo };
  if (!r.ok || !corpo.ok) return { erro: 'recusa', status: r.status, corpo: corpo };
  return { corpo: corpo };
}

// Os textos dos estados de rede, num lugar so. Nenhum deles mostra
// codigo, nome de endereco nem nome de configuracao: quem le e a Carla.
function formFalhaDe(erro, corpo, status) {
  if (erro === 'rede') {
    return { tom: 'alerta', titulo: 'Não consegui falar com o servidor.',
      texto: 'O formulário mora no servidor, não neste navegador. Se você abriu este arquivo direto do ' +
        'computador, entre pelo endereço publicado. Se já estava nele, foi a rede que caiu. O que você ' +
        'escreveu continua nesta tela e também ficou guardado neste navegador, então nada se perde: ' +
        'tente salvar de novo.' };
  }
  if (erro === 'login') {
    return { tom: 'atencao', titulo: 'Seu login venceu.',
      texto: 'O servidor devolveu a página de login no lugar do formulário. Recarregue esta página para ' +
        'entrar de novo. O que você escreveu ficou guardado neste navegador e volta quando você entrar.' };
  }
  if (erro === 'semporta') {
    return { tom: 'atencao', titulo: 'O login protegido ainda não foi ligado.',
      texto: 'Enquanto ele não existir, as perguntas não se editam por aqui: qualquer um que soubesse o ' +
        'endereço poderia trocar as perguntas do site. O formulário que está no ar continua funcionando ' +
        'e recebendo.' };
  }
  if (erro === 'sessao') {
    return { tom: 'atencao', titulo: 'O servidor não reconheceu a sua sessão.',
      texto: 'Você chegou até ele, mas o login protegido não validou o seu acesso. Recarregue a página ' +
        'para entrar de novo.' };
  }
  const dito = String((corpo && corpo.erro) || 'sem explicação').replace(/[.:;,\s]*$/, '');
  return { tom: 'alerta', titulo: 'O servidor recusou o pedido.',
    texto: 'Ele respondeu ' + (status || '') + ' e disse: "' + esc(dito) + '". Nada se perdeu: o ' +
      'formulário que está no ar continua como estava. Tente de novo e, se repetir, avise quem cuida ' +
      'da publicação.' };
}

function formParar(erro, corpo, status) {
  FORM.estado = 'erro';
  FORM.falha = formFalhaDe(erro, corpo, status);
  formDesenhar();
}

// A definicao que vem pela porta da rua nao carrega o que cada resposta
// vira na lista da mesa: isso e fiacao interna e nao viaja para a
// internet. Quando a tela cai nela por falta de versao gravada, o e-mail
// e o WhatsApp voltam pelo tipo da pergunta. Sem isto, a tela acusaria
// que falta uma pergunta de e-mail num formulario que tem uma, e a
// primeira publicacao seria recusada sem culpa de ninguem.
function formRemendarPapeis(def) {
  if (!def || !Array.isArray(def.perguntas)) return def;
  const jaTem = function (papel) { return def.perguntas.some(function (p) { return p.papel === papel; }); };
  const primeira = function (tipo) {
    return def.perguntas.find(function (p) { return p.tipo === tipo && p.ativa !== false && !p.papel; }) || null;
  };
  if (!jaTem('email')) { const p = primeira('email'); if (p) p.papel = 'email'; }
  if (!jaTem('whatsapp')) { const p = primeira('telefone'); if (p) p.papel = 'whatsapp'; }
  return def;
}

async function formCarregar() {
  FORM.estado = 'carregando';
  FORM.falha = null;
  FORM.recado = null;
  FORM.conflito = null;
  formDesenhar();

  const lista = await formPedir('/api/formulario/versoes');

  // Sem o login protegido ligado, ver e seguro e escrever e que nao: a
  // tela cai para a definicao publica e desabilita tudo.
  if (lista.erro === 'semporta') {
    const publica = await formPedir('/api/formulario');
    FORM.soLeitura = true;
    FORM.falha = formFalhaDe('semporta');
    if (publica.corpo && publica.corpo.formulario) {
      FORM.def = formRemendarPapeis(formCopia(publica.corpo.formulario));
      FORM.servidor = formCopia(FORM.def);
      FORM.noAr = formCopia(FORM.def);
      FORM.atual = Number(FORM.def.versao || 0);
      FORM.publicadoEm = FORM.def.publicado_em || null;
      FORM.estado = 'ok';
    } else {
      FORM.estado = 'erro';
    }
    FORM.lidoEm = new Date().toISOString();
    formDesenhar();
    return;
  }

  if (lista.erro) { formParar(lista.erro, lista.corpo, lista.status); return; }

  FORM.soLeitura = !EU.ehGestor();
  FORM.atual = Number(lista.corpo.atual || 0);
  FORM.versoes = Array.isArray(lista.corpo.versoes) ? lista.corpo.versoes : [];

  const rascunho = FORM.versoes
    .filter(function (v) { return !v.publicado_em; })
    .sort(function (a, b) { return Number(b.versao) - Number(a.versao); })[0] || null;
  const noArLinha = FORM.versoes.find(function (v) { return Number(v.versao) === FORM.atual; }) || null;

  FORM.temRascunho = !!rascunho;
  FORM.publicadoEm = noArLinha ? noArLinha.publicado_em : null;
  FORM.publicadoPor = noArLinha ? noArLinha.publicado_por : null;

  // A que esta no ar serve de referencia para contar o que mudou, e para
  // saber quais perguntas ja receberam resposta.
  let noAr = null;
  if (FORM.atual > 0) {
    const p = await formPedir('/api/formulario/versoes?versao=' + encodeURIComponent(FORM.atual));
    if (p.erro) { formParar(p.erro, p.corpo, p.status); return; }
    noAr = p.corpo.formulario || null;
  }

  let edicao = noAr;
  if (rascunho) {
    const p = await formPedir('/api/formulario/versoes?versao=' + encodeURIComponent(rascunho.versao));
    if (p.erro) { formParar(p.erro, p.corpo, p.status); return; }
    edicao = p.corpo.formulario || edicao;
  }

  // Nenhuma versao gravada por aqui ainda: o que esta no ar e o que
  // entrou junto com o site, e a rota publica e quem sabe dizer qual e.
  if (!edicao) {
    const publica = await formPedir('/api/formulario');
    if (publica.erro) { formParar(publica.erro, publica.corpo, publica.status); return; }
    edicao = formRemendarPapeis(publica.corpo.formulario || null);
    noAr = null;
  }

  if (!edicao) {
    formParar('recusa', { erro: 'o formulário voltou vazio' }, 200);
    return;
  }

  FORM.noAr = formCopia(noAr);
  FORM.def = formCopia(edicao);
  FORM.servidor = formCopia(edicao);
  FORM.estado = 'ok';
  FORM.lidoEm = new Date().toISOString();

  // O que ficou guardado neste navegador e mais novo que o rascunho do
  // servidor vira oferta, com o dia e a hora escritos.
  FORM.resgate = null;
  const local = formLerLocal();
  if (local && formPodeEditar()) {
    const maisNovo = !rascunho || !data(rascunho.criado_em) ||
      (data(local.quando) && data(local.quando).getTime() > data(rascunho.criado_em).getTime());
    const diferente = JSON.stringify(local.definicao.perguntas) !== JSON.stringify(FORM.def.perguntas);
    if (maisNovo && diferente) FORM.resgate = local;
  }

  formDesenhar();
}

/* ---------------------------------------------------------------------
   Gravar.

   Uma versao nova por publicacao, e nunca gravacao pela metade: ou a
   definicao inteira entra, ou nada entra.
   --------------------------------------------------------------------- */
function formCorpoDaVersao(fonte) {
  const d = formCopia(fonte || FORM.def) || {};
  return {
    titulo: d.titulo || '',
    abertura: d.abertura || {},
    agradecimento: d.agradecimento || {},
    perguntas: (d.perguntas || []).map(function (p) {
      return {
        chave: p.chave,
        titulo: String(p.titulo || '').trim(),
        descricao: String(p.descricao || ''),
        tipo: p.tipo,
        obrigatoria: !!p.obrigatoria,
        ativa: p.ativa !== false,
        papel: p.papel || null,
        opcoes: Array.isArray(p.opcoes) ? p.opcoes : [],
        mascara: p.mascara || null,
        erro: String(p.erro || ''),
        dica: String(p.dica || ''),
        mostrar_se: p.mostrar_se || null,
        nota: String(p.nota || ''),
      };
    }),
  };
}

// A nota da versao sai das proprias diferencas. Escrever de novo, a mao,
// o que a tela ja sabe dizer e trabalho repetido, e quem publica as onze
// da noite deixa em branco.
function formNotaAutomatica() {
  const mudou = formDiferencas(FORM.noAr, FORM.def).map(function (d) { return d.frase; });
  if (!mudou.length) return '';
  let nota = mudou.join(' ');
  if (nota.length > 240) nota = nota.slice(0, 237) + '...';
  return nota;
}

async function formGravar(publicar) {
  if (!formPodeEditar() || FORM.salvando) return;

  FORM.salvando = true;
  FORM.recado = null;
  FORM.conflito = null;
  formDesenhar();
  formDizer('Salvando no servidor.');

  const resposta = await formPedir('/api/formulario', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      base_versao: Number(FORM.atual || 0),
      publicar: !!publicar,
      nota: formNotaAutomatica(),
      definicao: formCorpoDaVersao(),
    }),
  });

  FORM.salvando = false;

  if (resposta.erro === 'conflito') {
    // A definicao da versao nova vem junto da recusa, de proposito: a tela
    // mostra o que mudou sem uma segunda ida ao servidor.
    const c = resposta.corpo || {};
    FORM.conflito = { versao: Number(c.atual || 0), definicao: c.formulario || c.definicao || null };
    if (FORM.conflito.definicao) FORM.guardadas[FORM.conflito.versao] = FORM.conflito.definicao;
    formGuardarLocal();
    formDesenhar();
    formDizer('Não salvei: alguém publicou uma versão nova enquanto você editava. O que você escreveu ' +
      'continua nesta tela.');
    return;
  }

  if (resposta.erro) {
    const f = formFalhaDe(resposta.erro, resposta.corpo, resposta.status);
    // Recusa de definicao vem com a frase do servidor dizendo qual
    // pergunta e por que. Ela e escrita para pessoa, entao vai inteira.
    if (resposta.erro === 'recusa') {
      FORM.recado = { tom: 'alerta', titulo: 'O rascunho não foi salvo.',
        texto: esc(String((resposta.corpo && resposta.corpo.erro) || 'o servidor não explicou o motivo')) +
          '. O que você escreveu continua nesta tela e ficou guardado neste navegador.' };
    } else {
      FORM.recado = f;
    }
    formGuardarLocal();
    formDesenhar();
    formDizer('Não consegui salvar agora. O aviso acima diz o que aconteceu.');
    return;
  }

  const corpo = resposta.corpo;
  const quando = formHoraCurta(corpo.publicado_em || new Date().toISOString()) || 'agora';
  formApagarLocal();
  FORM.resgate = null;
  FORM.confirmando = false;

  const quantas = formAtivas().length;
  const recado = publicar
    ? 'Publicado às ' + quando + '. Quem abrir o formulário agora vê estas ' + quantas + ' perguntas.'
    : 'Rascunho salvo às ' + formHoraCurta(new Date().toISOString()) +
      '. Quem abre o formulário ainda vê a versão anterior.';

  await formCarregar();
  formDizer(recado);
}

/* ---------------------------------------------------------------------
   O que mudou de uma definicao para a outra.

   Serve em dois lugares: conta as mudancas que estao paradas em rascunho
   e escreve, em frases, o que uma versao fez com a anterior. E por causa
   da chave curta que "mudou o texto" pode existir: sem ela, toda troca de
   palavra viraria uma saida mais uma entrada, e o historico ficaria
   ilegivel justamente na operacao mais comum.
   --------------------------------------------------------------------- */
function formDiferencas(antes, depois) {
  const saida = [];
  if (!depois) return saida;

  const listaA = (antes && Array.isArray(antes.perguntas)) ? antes.perguntas : [];
  const listaB = depois.perguntas || [];
  const porChaveA = {};
  listaA.forEach(function (p, i) { porChaveA[p.chave] = { p: p, i: i }; });
  const chavesB = {};
  listaB.forEach(function (p) { chavesB[p.chave] = true; });

  if (!antes) return saida;

  listaA.forEach(function (p) {
    if (!chavesB[p.chave]) {
      saida.push({ chave: p.chave, frase: 'Saiu a pergunta: ' + (p.titulo || 'sem texto') + '.' });
    }
  });

  listaB.forEach(function (p, i) {
    const velho = porChaveA[p.chave];
    if (!velho) {
      saida.push({ chave: p.chave, frase: 'Entrou a pergunta: ' + (p.titulo || 'sem texto') + '.' });
      return;
    }
    const a = velho.p;
    if (formNormal(a.titulo) !== formNormal(p.titulo)) {
      saida.push({ chave: p.chave, frase: 'Mudou o texto: de "' + (a.titulo || 'sem texto') +
        '" para "' + (p.titulo || 'sem texto') + '".' });
    }
    if (velho.i !== i) {
      saida.push({ chave: p.chave, frase: 'Mudou a ordem: ' + (p.titulo || 'a pergunta sem texto') +
        ' passou da ' + formOrdem(velho.i + 1) + ' para a ' + formOrdem(i + 1) + '.' });
    }
    if (String(a.descricao || '') !== String(p.descricao || '')) {
      saida.push({ chave: p.chave, frase: 'Mudou a explicação de ' + (p.titulo || 'uma pergunta') + '.' });
    }
    if (a.tipo !== p.tipo) {
      saida.push({ chave: p.chave, frase: 'Mudou o tipo de ' + (p.titulo || 'uma pergunta') +
        ': agora é ' + formNomeTipo(p.tipo).toLowerCase() + '.' });
    }
    if (!!a.obrigatoria !== !!p.obrigatoria) {
      saida.push({ chave: p.chave, frase: (p.obrigatoria ? 'Passou a ser obrigatória: ' :
        'Deixou de ser obrigatória: ') + (p.titulo || 'uma pergunta') + '.' });
    }
    if ((a.ativa !== false) !== (p.ativa !== false)) {
      saida.push({ chave: p.chave, frase: (p.ativa !== false ? 'Voltou para o ar: ' : 'Saiu do ar: ') +
        (p.titulo || 'uma pergunta') + '.' });
    }
    const opA = (a.opcoes || []), opB = (p.opcoes || []);
    opA.forEach(function (o) {
      if (!opB.some(function (x) { return x.chave === o.chave; })) {
        saida.push({ chave: p.chave, frase: 'Saiu a opção "' + o.texto + '" de ' + (p.titulo || 'uma pergunta') + '.' });
      }
    });
    opB.forEach(function (o) {
      const velha = opA.find(function (x) { return x.chave === o.chave; });
      if (!velha) {
        saida.push({ chave: p.chave, frase: 'Entrou a opção "' + o.texto + '" em ' + (p.titulo || 'uma pergunta') + '.' });
      } else if (formNormal(velha.texto) !== formNormal(o.texto)) {
        saida.push({ chave: p.chave, frase: 'Mudou a opção "' + velha.texto + '" para "' + o.texto +
          '" em ' + (p.titulo || 'uma pergunta') + '.' });
      }
    });
  });

  const capaA = JSON.stringify((antes && antes.abertura) || {});
  const capaB = JSON.stringify(depois.abertura || {});
  if (capaA !== capaB) saida.push({ chave: null, frase: 'Mudou a capa.' });

  const fimA = JSON.stringify((antes && antes.agradecimento) || {});
  const fimB = JSON.stringify(depois.agradecimento || {});
  if (fimA !== fimB) saida.push({ chave: null, frase: 'Mudou o obrigado.' });

  return saida;
}

// Quantas perguntas foram mexidas, que e como a frase de cima conta.
function formPerguntasMexidas(antes, depois) {
  const chaves = {};
  formDiferencas(antes, depois).forEach(function (d) { if (d.chave) chaves[d.chave] = true; });
  return Object.keys(chaves).length;
}

// O que esta na tela e diferente do que o servidor devolveu. Comparado
// pelo mesmo corpo que seria enviado, senao um campo aparado nas pontas
// contaria como mudanca a cada desenho.
function formTemMudancaNaTela() {
  if (!FORM.def || !FORM.servidor) return false;
  return JSON.stringify(formCorpoDaVersao(FORM.def)) !== JSON.stringify(formCorpoDaVersao(FORM.servidor));
}

/* ---------------------------------------------------------------------
   O que impede a publicacao.

   Cada impedimento aparece em dois lugares: embaixo do campo culpado e
   resumido no aviso de cima, que tambem desliga o botao de publicar.
   --------------------------------------------------------------------- */
function formImpedimentos() {
  const lista = formPerguntas();
  const impede = [];

  if (!lista.length) {
    impede.push({ chave: null, onde: 'geral', resumo: 'O formulário está sem pergunta nenhuma.',
      texto: 'Ninguém consegue aplicar assim. Acrescente a primeira pergunta abaixo.' });
  }

  const titulos = {};
  lista.forEach(function (p, i) {
    const t = String(p.titulo || '').trim();

    if (p.ativa !== false && !t) {
      impede.push({ chave: p.chave, onde: 'titulo', resumo: 'A pergunta ' + (i + 1) + ' está sem texto.',
        texto: 'Escreva o que a pessoa lê. Pergunta sem texto não vai para o ar.' });
    }
    if (t.length > 120) {
      impede.push({ chave: p.chave, onde: 'titulo', resumo: 'O texto da pergunta ' + (i + 1) + ' passou de 120 letras.',
        texto: 'O texto passou de 120 letras. Ele vira o nome da coluna na lista da mesa e não cabe. ' +
          'Encurte, e ponha o resto na explicação.' });
    }
    if (p.ativa !== false && t) {
      const n = formNormal(t);
      if (titulos[n] !== undefined) {
        impede.push({ chave: p.chave, onde: 'titulo',
          resumo: 'A pergunta ' + (i + 1) + ' tem o mesmo texto da ' + formOrdem(titulos[n] + 1) + '.',
          texto: 'Já existe uma pergunta com este texto, na ' + formOrdem(titulos[n] + 1) + ' posição. ' +
            'Duas perguntas com o mesmo texto viram uma coluna só na lista da mesa, e uma das duas ' +
            'respostas se perde.' });
      } else {
        titulos[n] = i;
      }
    }

    if (formTipo(p.tipo).escolha) {
      const op = p.opcoes || [];
      if (op.length < 2) {
        impede.push({ chave: p.chave, onde: 'opcoes', resumo: 'A pergunta ' + (i + 1) + ' tem menos de duas opções.',
          texto: formNomeTipo(p.tipo) + ' precisa de duas opções, no mínimo. Com uma só não há escolha.' });
      }
      if (op.some(function (o) { return !String(o.texto || '').trim(); })) {
        impede.push({ chave: p.chave, onde: 'opcoes', resumo: 'A pergunta ' + (i + 1) + ' tem uma opção em branco.',
          texto: 'Uma opção está em branco. Escreva o texto dela, ou tire ela.' });
      }
      const vistas = {};
      let repetida = null;
      op.forEach(function (o) {
        const n = formNormal(o.texto);
        if (!n) return;
        if (vistas[n]) repetida = o.texto; else vistas[n] = true;
      });
      if (repetida) {
        impede.push({ chave: p.chave, onde: 'opcoes', resumo: 'A pergunta ' + (i + 1) + ' tem duas opções iguais.',
          texto: 'Duas opções dizem a mesma coisa: "' + repetida + '". Quem responde não sabe qual marcar, ' +
            'e a mesa não sabe qual foi marcada.' });
      }
    }

    // Familia de tipo depois de publicada: quem ja respondeu respondeu em
    // outro formato, e as duas respostas cairiam na mesma coluna.
    if (formJaPublicada(p.chave)) {
      const antes = FORM.noAr.perguntas.find(function (x) { return x.chave === p.chave; });
      if (antes && formTipo(antes.tipo).familia !== formTipo(p.tipo).familia) {
        impede.push({ chave: p.chave, onde: 'tipo',
          resumo: 'A pergunta ' + (i + 1) + ' trocou de tipo depois de já ter recebido respostas.',
          texto: 'Esta pergunta já recebeu respostas em outro formato. Crie uma pergunta nova em vez de ' +
            'trocar o tipo desta.' });
      }
    }
  });

  const comEmail = formPapelDe('email');
  const comZap = formPapelDe('whatsapp');
  const emailDesligado = formPerguntas().find(function (p) { return p.papel === 'email' && p.ativa === false; });

  if (!comEmail) {
    impede.push({ chave: emailDesligado ? emailDesligado.chave : null, onde: 'papel',
      resumo: 'Nenhuma pergunta está marcada como o e-mail.',
      texto: emailDesligado
        ? 'Esta pergunta é o e-mail da mesa e está fora do ar. Ligue de volta, ou marque outra como o e-mail.'
        : 'Nenhuma pergunta está marcada como o e-mail. É por ele que a resposta sai da mesa, então o ' +
          'formulário precisa de uma.' });
  }
  if (!comZap) {
    impede.push({ chave: null, onde: 'papel', resumo: 'Nenhuma pergunta está marcada como o WhatsApp.',
      texto: 'Nenhuma pergunta está marcada como o WhatsApp. É por ele que você responde a maioria, ' +
        'então o formulário precisa de uma.' });
  }

  return impede;
}

function formImpedimentosDe(chave, onde) {
  return formImpedimentos().filter(function (i) {
    return i.chave === chave && (!onde || i.onde === onde);
  });
}

// Titulos quase iguais nao bloqueiam, avisam. Diferenca de acento vira
// duas colunas parecidas na mesa, e e facil confundir.
function formParecidos() {
  const lista = formAtivas();
  const saida = [];
  lista.forEach(function (p, i) {
    for (let j = 0; j < i; j++) {
      const outro = lista[j];
      if (!p.titulo || !outro.titulo) continue;
      if (formNormal(p.titulo) === formNormal(outro.titulo)) continue;
      if (formQuaseIgual(p.titulo) === formQuaseIgual(outro.titulo)) {
        saida.push({ chave: p.chave, texto: 'A ' + formOrdem(j + 1) + ' pergunta tem quase este mesmo texto. ' +
          'Na lista da mesa elas ficam em duas colunas parecidas, e é fácil confundir.' });
      }
    }
  });
  return saida;
}

/* =====================================================================
   Comandos: o que os botoes e os campos fazem.
   ===================================================================== */

function formIrAba(k) {
  FORM.aba = k;
  formDesenhar();
  if (k === 'medidas' && FORM.medEstado === 'ocioso') formMedidasCarregar();
}

function formAlternar(chave) {
  FORM.aberta = (FORM.aberta === chave) ? null : chave;
  formDesenhar();
  if (FORM.aberta === chave) {
    const campo = porId('form-titulo-' + chave);
    if (campo) campo.focus();
  }
}

// Mexer no modelo sem redesenhar a lista. So o cabecalho da pergunta, a
// previa e os numeros de cima se repintam: o cursor fica onde estava.
function formCampo(chave, campo, valor) {
  const p = formAchar(chave);
  if (!p || !formPodeEditar()) return;
  p[campo] = valor;
  formGuardarLocal();
  formPintarCabecalho(chave);
  formPintarPrevia(chave);
  formPintarTopo();
  formPintarErros(chave);
}

function formCapa(caminho, campo, valor) {
  if (!FORM.def || !formPodeEditar()) return;
  if (!FORM.def[caminho]) FORM.def[caminho] = {};
  if (campo === 'link_texto' || campo === 'link_url') {
    if (!FORM.def[caminho].link) FORM.def[caminho].link = { texto: '', url: '' };
    FORM.def[caminho].link[campo === 'link_texto' ? 'texto' : 'url'] = valor;
  } else {
    FORM.def[caminho][campo] = valor;
  }
  formGuardarLocal();
  formPintarTopo();
}

function formMarcar(chave, campo, ligado) {
  const p = formAchar(chave);
  if (!p || !formPodeEditar()) return;
  p[campo] = !!ligado;
  if (campo === 'ativa' && !ligado && p.papel === 'email') {
    formDizer('A pergunta do e-mail saiu do ar. Ligue de volta, ou marque outra como o e-mail.');
  } else if (campo === 'ativa') {
    formDizer((p.titulo || 'A pergunta') + (ligado ? ' voltou para o ar.' : ' saiu do ar.'));
  } else {
    formDizer((p.titulo || 'A pergunta') + (ligado ? ' passou a ser obrigatória.' : ' passou a poder ser pulada.'));
  }
  formGuardarLocal();
  formDesenhar();
}

function formMudarPapel(chave, valor) {
  const p = formAchar(chave);
  if (!p || !formPodeEditar()) return;
  // No maximo uma pergunta de cada papel: duas viram uma coluna disputada
  // na lista da mesa, e a segunda apaga a primeira.
  if (valor) {
    formPerguntas().forEach(function (outro) {
      if (outro !== p && outro.papel === valor) outro.papel = null;
    });
  }
  p.papel = valor || null;
  if (valor) { p.ativa = true; p.obrigatoria = true; }
  formGuardarLocal();
  formDesenhar();
  formDizer(valor
    ? (p.titulo || 'A pergunta') + ' agora vira ' + (FORM_PAPEIS.find(function (x) { return x.k === valor; }) || {}).nome +
      ' na lista da mesa, e por isso é obrigatória e fica no ar.'
    : (p.titulo || 'A pergunta') + ' deixou de ter coluna própria na lista da mesa.');
}

async function formMudarTipo(chave, valor) {
  const p = formAchar(chave);
  if (!p || !formPodeEditar()) return;
  const antes = formTipo(p.tipo), agora = formTipo(valor);

  // Sair de escolha para texto joga fora as opcoes escritas. Trocar entre
  // as duas escolhas mantem tudo de pe, e nao pergunta nada.
  if (antes.escolha && !agora.escolha && (p.opcoes || []).length) {
    const sim = await perguntar({
      titulo: 'Trocar o tipo de ' + (p.titulo || 'esta pergunta'),
      texto: agora.nome + ' não tem opções. As ' + p.opcoes.length +
        ' opções escritas saem, e não voltam se você trocar de volta.',
      confirmar: 'Trocar mesmo assim',
    });
    if (!sim) { formDesenhar(); return; }
  }

  p.tipo = valor;
  if (!agora.escolha) p.opcoes = [];
  if (agora.escolha && (p.opcoes || []).length < 2) {
    p.opcoes = [{ chave: 'opcao_1', texto: '' }, { chave: 'opcao_2', texto: '' }];
  }
  if (valor === 'recado') { p.obrigatoria = false; p.papel = null; p.mascara = null; }
  if (valor === 'telefone' && !p.mascara) p.mascara = { pais_padrao: 'BR' };
  if (valor === 'numero' && (!p.mascara || p.mascara.pais_padrao)) p.mascara = { minimo: null, maximo: null };
  formGuardarLocal();
  formDesenhar();
  formDizer((p.titulo || 'A pergunta') + ' agora é ' + agora.nome.toLowerCase() + '.');
}

function formMascara(chave, campo, valor) {
  const p = formAchar(chave);
  if (!p || !formPodeEditar()) return;
  if (!p.mascara) p.mascara = {};
  if (campo === 'minimo' || campo === 'maximo') {
    p.mascara[campo] = (valor === '' || valor === null) ? null : Number(valor);
  } else {
    p.mascara[campo] = valor;
  }
  formGuardarLocal();
  formPintarTopo();
}

function formMudarChave(chave, valor) {
  const p = formAchar(chave);
  if (!p || !formPodeEditar() || formJaPublicada(chave)) return;
  const nova = formChaveLimpa(valor);
  if (!nova || formPerguntas().some(function (x) { return x !== p && x.chave === nova; })) {
    formDesenhar();
    formDizer('Este apelido já está em uso, ou não pode ser escrito assim. Use letras minúsculas, ' +
      'números e o traço baixo, começando por letra.');
    return;
  }
  p.chave = nova;
  if (FORM.aberta === chave) FORM.aberta = nova;
  formGuardarLocal();
  formDesenhar();
}

/* ------------------------------------------------------------ posicao */

function formMover(chave, passo) {
  const lista = formPerguntas();
  const i = formIndice(chave);
  const j = i + passo;
  if (i < 0 || j < 0 || j >= lista.length || !formPodeEditar()) return;
  const p = lista[i];
  lista.splice(i, 1);
  lista.splice(j, 0, p);
  formGuardarLocal();
  formDesenhar();
  formDizer((p.titulo || 'A pergunta sem texto') + ' agora é a ' + formOrdem(j + 1) + ' pergunta.');
  // O foco fica no mesmo botao, que agora esta uma linha acima ou abaixo:
  // clicar tres vezes seguidas move tres posicoes sem cacar o botao.
  const botao = porId('form-' + (passo < 0 ? 'sobe' : 'desce') + '-' + chave);
  if (botao && !botao.disabled) botao.focus();
}

function formPosicao(chave, valor) {
  const lista = formPerguntas();
  const i = formIndice(chave);
  const j = Math.max(0, Math.min(lista.length - 1, Number(valor) - 1));
  if (i < 0 || i === j || !formPodeEditar()) return;
  const p = lista[i];
  lista.splice(i, 1);
  lista.splice(j, 0, p);
  formGuardarLocal();
  formDesenhar();
  formDizer((p.titulo || 'A pergunta sem texto') + ' passou da ' + formOrdem(i + 1) +
    ' para a ' + formOrdem(j + 1) + ' posição.');
}

/* ------------------------------------------------------------- opcoes */

// A letra da opcao e desenhada pela interface, na ordem da posicao, e
// nunca lida do texto. Colar "A) Empresario" e comum, e a letra colada
// briga com a letra desenhada na primeira vez que a ordem muda.
function formTirarLetra(v) {
  const limpo = String(v || '').replace(/^\s*[A-Za-z][)\].:-]\s+/, '');
  return { texto: limpo, cortou: limpo !== String(v || '') };
}

function formOpcaoTexto(chave, i, valor) {
  const p = formAchar(chave);
  if (!p || !formPodeEditar() || !p.opcoes || !p.opcoes[i]) return;
  p.opcoes[i].texto = valor;
  formGuardarLocal();
  formPintarPrevia(chave);
  formPintarErros(chave);
  formPintarTopo();
}

function formOpcaoAoSair(chave, i) {
  const p = formAchar(chave);
  const campo = porId('form-opcao-' + chave + '-' + i);
  if (!p || !campo || !formPodeEditar() || !p.opcoes || !p.opcoes[i]) return;
  const r = formTirarLetra(campo.value);
  if (!r.cortou) return;
  campo.value = r.texto;
  p.opcoes[i].texto = r.texto;
  formGuardarLocal();
  formPintarPrevia(chave);
  formDizer('Tirei a letra do começo da opção. O formulário desenha a letra sozinho, na ordem certa.');
}

function formOpcaoNova(chave) {
  const p = formAchar(chave);
  if (!p || !formPodeEditar()) return;
  if (!Array.isArray(p.opcoes)) p.opcoes = [];
  if (p.opcoes.length >= 20) {
    formDizer('Vinte opções é o limite. Acima disso ninguém lê a lista inteira antes de escolher.');
    return;
  }
  let n = p.opcoes.length + 1;
  while (p.opcoes.some(function (o) { return o.chave === 'opcao_' + n; })) n++;
  p.opcoes.push({ chave: 'opcao_' + n, texto: '' });
  formGuardarLocal();
  formDesenhar();
  const campo = porId('form-opcao-' + chave + '-' + (p.opcoes.length - 1));
  if (campo) campo.focus();
}

function formOpcaoTirar(chave, i) {
  const p = formAchar(chave);
  if (!p || !formPodeEditar() || !p.opcoes || !p.opcoes[i]) return;
  const texto_ = p.opcoes[i].texto;
  p.opcoes.splice(i, 1);
  formGuardarLocal();
  formDesenhar();
  formDizer('Tirei a opção "' + (texto_ || 'em branco') + '".');
}

function formOpcaoMover(chave, i, passo) {
  const p = formAchar(chave);
  if (!p || !formPodeEditar() || !p.opcoes) return;
  const j = i + passo;
  if (j < 0 || j >= p.opcoes.length) return;
  const o = p.opcoes[i];
  p.opcoes.splice(i, 1);
  p.opcoes.splice(j, 0, o);
  formGuardarLocal();
  formDesenhar();
  const botao = porId('form-op-' + (passo < 0 ? 'sobe' : 'desce') + '-' + chave + '-' + j);
  if (botao && !botao.disabled) botao.focus();
}

/* ------------------------------------------------- nascer e desaparecer */

function formNova(tipo) {
  if (!formPodeEditar() || !FORM.def) return;
  const t = formTipo(tipo);
  const nova = {
    chave: 'p' + Date.now().toString(36),
    titulo: '',
    descricao: '',
    tipo: t.k,
    obrigatoria: t.k !== 'recado',
    ativa: true,
    papel: null,
    opcoes: t.escolha ? [{ chave: 'opcao_1', texto: '' }, { chave: 'opcao_2', texto: '' }] : [],
    mascara: t.k === 'telefone' ? { pais_padrao: 'BR' } : null,
    erro: '',
    dica: '',
    mostrar_se: null,
    nota: '',
  };
  FORM.def.perguntas.push(nova);
  FORM.aberta = nova.chave;
  formGuardarLocal();
  formDesenhar();
  formDizer('Pergunta nova na ' + formOrdem(FORM.def.perguntas.length) + ' posição. Escreva o texto dela.');
  const campo = porId('form-titulo-' + nova.chave);
  if (campo) campo.focus();
}

async function formApagar(chave) {
  const p = formAchar(chave);
  if (!p || !formPodeEditar()) return;
  const recebidas = formRespostasDaVersao();
  const sim = await perguntar({
    titulo: 'Apagar a pergunta ' + (p.titulo || 'sem texto'),
    texto: 'Ela sai do formulário na próxima publicação.' + (recebidas
      ? ' As ' + recebidas + ' respostas que já chegaram continuam guardadas e continuam aparecendo em Ideias que chegaram.'
      : ' As respostas que já chegaram continuam guardadas e continuam aparecendo em Ideias que chegaram.'),
    detalhe: 'Se você só quer parar de perguntar por um tempo, feche esta caixa e tire a pergunta do ar.',
    confirmar: 'Apagar',
  });
  if (!sim) return;
  const i = formIndice(chave);
  FORM.def.perguntas.splice(i, 1);
  if (FORM.aberta === chave) FORM.aberta = null;
  formGuardarLocal();
  formDesenhar();
  formDizer('Apaguei a pergunta ' + (p.titulo || 'sem texto') + '.');
}

// Quantas aplicacoes chegaram pela versao que esta no ar. Serve para as
// frases dizerem um numero em vez de "as respostas".
function formRespostasDaVersao() {
  const linha = FORM.versoes.find(function (v) { return Number(v.versao) === FORM.atual; });
  return linha ? Number(linha.respostas_recebidas || 0) : 0;
}

/* -------------------------------------------------- publicar e resgatar */

function formPedirPublicacao() {
  FORM.confirmando = true;
  formDesenhar();
  const botao = porId('form-publicar-agora');
  if (botao) botao.focus();
}

function formCancelarPublicacao() {
  FORM.confirmando = false;
  formDesenhar();
}

function formPublicarAgora() { formGravar(true); }
function formSalvarRascunho() { formGravar(false); }

function formRecuperar() {
  if (!FORM.resgate) return;
  FORM.def = formCopia(FORM.resgate.definicao);
  FORM.resgate = null;
  formDesenhar();
  formDizer('Recuperei o que estava guardado neste navegador. Salve o rascunho para a mesa ver junto.');
}

function formDescartarResgate() {
  FORM.resgate = null;
  formApagarLocal();
  formDesenhar();
  formDizer('Descartei o que estava guardado neste navegador. A tela mostra o rascunho do servidor.');
}

// Abre a pagina publica em outra aba, em modo de conferencia, para ela
// responder o formulario inteiro como uma pessoa de fora. Quem nao e da
// casa continua vendo a versao que esta no ar.
function formVerInteiro() {
  window.open('/aplicar?conferir=1', '_blank', 'noopener');
}

// A versao publicada logo antes desta. E com ela que a comparacao faz
// sentido: rascunho nao entra, porque rascunho nunca esteve no ar.
function formVersaoAnterior(n) {
  const antes = FORM.versoes
    .filter(function (v) { return v.publicado_em && Number(v.versao) < Number(n); })
    .sort(function (a, b) { return Number(b.versao) - Number(a.versao); });
  return antes.length ? Number(antes[0].versao) : null;
}

// Busca a definicao de uma versao uma vez so e guarda: abrir e fechar a
// mesma linha tres vezes nao pede tres vezes ao servidor.
async function formBuscarVersao(n) {
  if (FORM.guardadas[n]) return FORM.guardadas[n];
  const r = await formPedir('/api/formulario/versoes?versao=' + encodeURIComponent(n));
  if (r.erro || !r.corpo.formulario) return null;
  FORM.guardadas[n] = r.corpo.formulario;
  return FORM.guardadas[n];
}

async function formVerDiferencas(versao) {
  const n = Number(versao);
  if (FORM.diffAberto === n) { FORM.diffAberto = null; formDesenhar(); return; }
  FORM.diffAberto = n;
  formDesenhar();
  await formBuscarVersao(n);
  const anterior = formVersaoAnterior(n);
  if (anterior) await formBuscarVersao(anterior);
  if (FORM.diffAberto === n) formDesenhar();
}

function formVerMaisVersoes() { FORM.verMais = true; formDesenhar(); }

async function formTrazerVersao(versao) {
  if (!formPodeEditar()) return;
  const linha = FORM.versoes.find(function (v) { return Number(v.versao) === Number(versao); });
  if (FORM.temRascunho || formTemMudancaNaTela()) {
    const sim = await perguntar({
      titulo: 'Trazer a versão ' + versao + ' para o rascunho',
      texto: 'O rascunho de agora será substituído pelo que estava no ar em ' +
        dataCurta(linha && linha.publicado_em) + '. O formulário publicado não muda até você publicar.',
      detalhe: 'Nenhuma versão se apaga. O seu rascunho de agora, não. Ele é o único que se perde aqui.',
      confirmar: 'Trazer para o rascunho',
    });
    if (!sim) return;
  }
  const p = await formPedir('/api/formulario/versoes?versao=' + encodeURIComponent(versao));
  if (p.erro) {
    FORM.recado = formFalhaDe(p.erro, p.corpo, p.status);
    formDesenhar();
    return;
  }
  FORM.def = formCopia(p.corpo.formulario);
  FORM.aberta = null;
  FORM.diffAberto = null;
  formGuardarLocal();
  formDesenhar();
  formDizer('Trouxe a versão ' + versao + ' para o rascunho. Confira e publique para ela valer.');
}

/* =====================================================================
   Desenho: as perguntas.
   ===================================================================== */

function formAbasHtml() {
  const abas = [
    { k: 'perguntas', nome: 'As perguntas' },
    { k: 'medidas', nome: 'Como está indo' },
  ];
  return abas.map(function (a) {
    return '<button class="bt bt-sm ' + (FORM.aba === a.k ? 'bt-marca' : 'bt-linha') +
      '" onclick="formIrAba(\'' + a.k + '\')">' + esc(a.nome) + '</button>';
  }).join('');
}

function formFrase() {
  if (FORM.estado === 'carregando') {
    return ['Buscando o formulário no <b>servidor</b>.',
      'Ele mora no servidor, e não neste navegador: a mesa inteira precisa ver o mesmo formulário.'];
  }
  if (FORM.estado === 'erro') {
    return ['Não consegui mostrar o formulário <b>agora</b>.',
      'O aviso abaixo diz o que aconteceu e o que fazer. O formulário publicado continua no ar, ' +
      'do jeito que estava.'];
  }
  const ativas = formAtivas().length;
  if (!formPerguntas().length) {
    return ['O formulário está sem <b>pergunta nenhuma</b>.',
      'Ninguém consegue aplicar assim. Acrescente a primeira pergunta abaixo e publique.'];
  }
  if (formTemMudancaNaTela()) {
    const n = formPerguntasMexidas(FORM.servidor, FORM.def);
    return ['Você mudou <b>' + (n || 1) + (n === 1 ? ' pergunta' : ' perguntas') + '</b> e ainda não salvou.',
      'O que está na tela só existe aqui. Salve o rascunho para a mesa ver junto.'];
  }
  if (FORM.temRascunho) {
    const n = formDiferencas(FORM.noAr, FORM.def).length;
    if (n) {
      return ['Você tem <b>' + n + (n === 1 ? ' mudança' : ' mudanças') + '</b> guardadas em rascunho.',
        'Quem abre o formulário agora ainda vê a versão anterior. Publique para elas valerem.'];
    }
    return ['Você tem um <b>rascunho</b> guardado no servidor.',
      'Ele está igual ao que já está no ar. Publique quando quiser, ou continue editando.'];
  }
  if (!FORM.atual) {
    return ['O formulário no ar tem <b>' + ativas + (ativas === 1 ? ' pergunta' : ' perguntas') + '</b>.',
      'Nada foi editado por aqui ainda. Ele é o que entrou junto com o site.'];
  }
  return ['<b>' + ativas + (ativas === 1 ? ' pergunta' : ' perguntas') + '</b> no ar, do jeito que você deixou.',
    'Publicado ' + esc(haQuanto(FORM.publicadoEm)) +
    (FORM.publicadoPor ? ' por ' + esc(FORM.publicadoPor) : '') + '.'];
}

function formEtiquetaEstado() {
  if (FORM.estado === 'carregando') return '<span class="eti eti-info">Buscando</span>';
  if (FORM.estado === 'erro') return '<span class="eti eti-alerta">Não salvou</span>';
  if (formTemMudancaNaTela()) return '<span class="eti eti-atencao">Não salvo</span>';
  if (FORM.temRascunho) return '<span class="eti eti-atencao">Rascunho salvo</span>';
  return '<span class="eti eti-ok">No ar</span>';
}

function formNumerosHtml() {
  const ativas = formAtivas();
  const obrig = ativas.filter(function (p) { return p.obrigatoria; }).length;
  const fora = formPerguntas().length - ativas.length;
  const publicado = FORM.publicadoEm ? haQuanto(FORM.publicadoEm) : 'nunca';
  return formNumeroBloco(ativas.length, 'Perguntas no ar', false, !ativas.length) +
    formNumeroBloco(obrig, 'Obrigatórias', false, !obrig) +
    formNumeroBloco(fora, 'Fora do ar', false, !fora) +
    formNumeroBloco(esc(publicado), 'Publicado', false, !FORM.publicadoEm);
}

function formAvisosHtml() {
  let html = '';

  if (FORM.falha) html += aviso(FORM.falha.tom, FORM.falha.titulo, FORM.falha.texto);
  if (FORM.recado) html += aviso(FORM.recado.tom, FORM.recado.titulo, FORM.recado.texto);

  if (FORM.soLeitura && FORM.estado === 'ok' && !FORM.falha) {
    html += aviso('info', 'Você está vendo em leitura.',
      'As perguntas da aplicação são decisão da gestão. Peça a mudança para quem tem esse acesso.');
  }

  if (FORM.conflito) {
    html += '<div class="aviso aviso-atencao">' +
      '<b>Alguém publicou enquanto você editava.</b>' +
      '<p>A versão no ar agora é a ' + FORM.conflito.versao + ', e você começou a partir da ' +
      FORM.atual + '. Nada se perdeu: veja o que mudou e junte com o que você escreveu antes de publicar.</p>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">' +
      '<button class="bt bt-linha bt-sm" onclick="formVerDiferencas(' + FORM.conflito.versao + ')">' +
      'Ver o que mudou na versão ' + FORM.conflito.versao + '</button></div>' +
      // O que a outra pessoa fez, e nao o que esta tela faria com o que ela
      // fez: a pergunta de quem le e "o que mudou por baixo de mim".
      (FORM.diffAberto === FORM.conflito.versao
        ? '<div style="margin-top:12px">' +
          '<div class="dica" style="margin-bottom:6px">O que a outra pessoa mudou:</div>' +
          formListaDiferencas(FORM.servidor, FORM.conflito.definicao) + '</div>'
        : '') +
      '</div>';
  }

  if (FORM.resgate) {
    html += '<div class="aviso aviso-atencao">' +
      '<b>Você tinha mudanças que não chegaram no servidor.</b>' +
      '<p>Elas ficaram guardadas neste navegador desde ' + esc(dataLonga(FORM.resgate.quando)) + '. ' +
      'Recupere para continuar de onde parou, ou descarte para ver o rascunho que está no servidor.</p>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">' +
      '<button class="bt bt-marca bt-sm" onclick="formRecuperar()">Recuperar</button>' +
      '<button class="bt bt-linha bt-sm" onclick="formDescartarResgate()">Descartar</button></div></div>';
  }

  // A sexta pergunta, que ainda espera o texto dela. Este aviso depende de
  // uma condicao e some sozinho quando a condicao passa, entao e aviso e
  // nao paragrafo com borda colorida.
  const reservada = formPerguntas().find(function (p) {
    return formNormal(p.titulo) === formNormal(FORM_TITULO_RESERVADO);
  });
  if (reservada && FORM.estado === 'ok') {
    const pos = formIndice(reservada.chave) + 1;
    html += aviso('info', 'A ' + formOrdem(pos) + ' pergunta está esperando o texto dela.',
      'Ela está guardada na posição certa e fora do ar, então ninguém vê. Escreva a pergunta, ' +
      'ligue no ar e publique.');
  }

  const impede = formImpedimentos();
  if (impede.length && FORM.estado === 'ok') {
    const resumos = [];
    impede.forEach(function (i) { if (resumos.indexOf(i.resumo) < 0) resumos.push(i.resumo); });
    html += aviso('atencao',
      resumos.length === 1 ? '1 coisa impede a publicação.' : resumos.length + ' coisas impedem a publicação.',
      esc(resumos.join(' ')));
  }

  return html;
}

function formListaDiferencas(antes, depois) {
  const lista = formDiferencas(antes, depois);
  if (!lista.length) return '<p class="dica">Nada mudou de uma para a outra.</p>';
  return lista.map(function (d) {
    return '<div class="dica" style="margin-bottom:4px">' + esc(d.frase) + '</div>';
  }).join('');
}

/* ------------------------------------------------------ barra de acoes */

function formBarraAcoesHtml() {
  const impede = formImpedimentos();
  const naTela = formTemMudancaNaTela();
  const mudouDoAr = formDiferencas(FORM.noAr, FORM.def).length > 0;
  const pode = formPodeEditar() && !FORM.salvando;

  if (FORM.confirmando) {
    const ativas = formAtivas().length;
    const mexidas = formDiferencas(FORM.noAr, FORM.def).filter(function (d) {
      return d.frase.indexOf('Mudou o texto') === 0;
    }).length;
    const saiu = formDiferencas(FORM.noAr, FORM.def).filter(function (d) {
      return d.frase.indexOf('Saiu a pergunta') === 0;
    });
    const recebidas = formRespostasDaVersao();

    let p = 'Quem abrir o formulário depois de agora responde estas perguntas. Quem já está respondendo ' +
      'neste momento termina com as perguntas de antes, e a resposta dessa pessoa chega inteira.';
    if (mexidas) {
      p += ' Você mudou o texto de ' + mexidas + (mexidas === 1 ? ' pergunta' : ' perguntas') +
        '. As respostas que já chegaram continuam guardadas com o texto antigo, e as novas chegam com o ' +
        'texto novo. As duas aparecem em Ideias que chegaram, uma embaixo da outra.';
    }
    if (saiu.length) {
      p += ' ' + saiu.length + (saiu.length === 1 ? ' pergunta sai' : ' perguntas saem') + ' do formulário. ' +
        (recebidas ? 'As ' + recebidas + ' respostas que já chegaram continuam guardadas e continuam aparecendo.'
                   : 'As respostas que já chegaram continuam guardadas e continuam aparecendo.');
    }

    return '<div class="aviso aviso-atencao" style="margin-bottom:14px">' +
      '<b>Publicar estas ' + ativas + (ativas === 1 ? ' pergunta' : ' perguntas') + '</b>' +
      '<p>' + esc(p) + '</p>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">' +
      '<button class="bt bt-marca bt-sm" id="form-publicar-agora" onclick="formPublicarAgora()">Publicar agora</button>' +
      '<button class="bt bt-linha bt-sm" onclick="formCancelarPublicacao()">Cancelar</button>' +
      '</div></div>';
  }

  const podePublicar = pode && !impede.length && (mudouDoAr || FORM.temRascunho);
  const podeSalvar = pode && naTela;

  return '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:4px">' +
    '<button class="bt bt-marca bt-sm" onclick="formPedirPublicacao()"' + (podePublicar ? '' : ' disabled') + '>' +
      'Publicar</button>' +
    '<button class="bt bt-linha bt-sm" onclick="formSalvarRascunho()"' + (podeSalvar ? '' : ' disabled') + '>' +
      'Salvar rascunho</button>' +
    '<button class="bt bt-linha bt-sm" onclick="formVerInteiro()"' + (naTela ? ' disabled' : '') + '>' +
      'Ver o formulário inteiro</button>' +
    (naTela ? '<span class="dica">Salve o rascunho para ver o formulário com as suas mudanças.</span>' : '') +
    '</div>';
}

/* --------------------------------------------------- pergunta fechada */

function formEtiquetasDaPergunta(p) {
  const eti = [];
  eti.push('<span class="eti eti-neutra">' + esc(formNomeTipo(p.tipo)) + '</span>');
  if (p.tipo !== 'recado') {
    eti.push(p.obrigatoria
      ? '<span class="eti eti-info">obrigatória</span>'
      : '<span class="eti eti-neutra">pode pular</span>');
  }
  const papel = FORM_PAPEIS.find(function (x) { return x.k === (p.papel || ''); });
  if (papel && papel.eti) eti.push('<span class="eti eti-marca">' + esc(papel.eti) + '</span>');
  if (p.ativa === false) eti.push('<span class="eti eti-atencao">fora do ar</span>');
  if (FORM.noAr) {
    const mudou = formDiferencas(FORM.noAr, FORM.def).some(function (d) { return d.chave === p.chave; });
    if (mudou) eti.push('<span class="eti eti-atencao">mudou no rascunho</span>');
  }
  if (formImpedimentosDe(p.chave).length) eti.push('<span class="eti eti-alerta">falta corrigir</span>');
  return eti.join(' ');
}

function formCabecalhoHtml(p) {
  const lista = formPerguntas();
  const i = formIndice(p.chave);
  const aberta = FORM.aberta === p.chave;
  const trava = formTrava();

  const posicoes = lista.map(function (x, n) {
    return '<option value="' + (n + 1) + '"' + (n === i ? ' selected' : '') + '>' + formOrdem(n + 1) + '</option>';
  }).join('');

  return '<div style="display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap">' +
    '<select class="campo campo-sm" style="width:68px;flex:none"' + trava +
      ' aria-label="Posição de ' + esc(p.titulo || 'pergunta sem texto') + '"' +
      ' onchange="formPosicao(\'' + esc(p.chave) + '\', this.value)">' + posicoes + '</select>' +

    '<div style="flex:1 1 240px;min-width:0">' +
      '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">' +
        (p.titulo
          ? '<b style="color:var(--claro);font-size:14px">' + esc(p.titulo) + '</b>'
          : '<b style="color:var(--tx-4);font-size:14px;font-weight:600">sem texto ainda</b>') +
        formEtiquetasDaPergunta(p) +
      '</div>' +
      (p.descricao
        ? '<div class="dica" style="margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' +
          esc(p.descricao) + '</div>'
        : '') +
    '</div>' +

    '<div style="display:flex;gap:6px;flex:none">' +
      '<button class="bt bt-linha bt-sm" id="form-sobe-' + esc(p.chave) + '"' +
        (i === 0 ? ' disabled' : trava) + ' onclick="formMover(\'' + esc(p.chave) + '\', -1)">Subir</button>' +
      '<button class="bt bt-linha bt-sm" id="form-desce-' + esc(p.chave) + '"' +
        (i === lista.length - 1 ? ' disabled' : trava) + ' onclick="formMover(\'' + esc(p.chave) + '\', 1)">Descer</button>' +
      '<button class="bt bt-linha bt-sm" onclick="formAlternar(\'' + esc(p.chave) + '\')">' +
        (aberta ? 'Fechar' : 'Abrir') + '</button>' +
    '</div>' +
  '</div>';
}

/* ----------------------------------------------------- pergunta aberta */

function formErrosHtml(chave, onde) {
  const lista = formImpedimentosDe(chave, onde);
  const parecidos = onde === 'titulo' ? formParecidos().filter(function (x) { return x.chave === chave; }) : [];
  let html = lista.map(function (i) {
    return '<div class="dica" style="margin-top:6px;color:var(--sinal-alerta)">' + esc(i.texto) + '</div>';
  }).join('');
  html += parecidos.map(function (i) {
    return '<div class="dica" style="margin-top:6px;color:var(--sinal-atencao)">' + esc(i.texto) + '</div>';
  }).join('');
  return html;
}

function formCamposDoTipo(p) {
  const t = formTipo(p.tipo);
  const trava = formTrava();
  const chave = esc(p.chave);
  let html = '';

  if (t.escolha) {
    const op = p.opcoes || [];
    html += '<div class="rotulo" style="margin-top:18px">As opções, na ordem em que ela lê</div>' +
      '<p class="dica" style="margin-bottom:10px">A letra de cada opção é desenhada pelo formulário, ' +
      'na ordem da posição. Não escreva a letra no texto.</p>';
    html += op.map(function (o, i) {
      return '<div style="display:flex;gap:6px;align-items:center;margin-bottom:6px">' +
        '<span style="font-family:var(--display);font-size:12px;color:var(--o);font-weight:700;width:16px;flex:none">' +
          String.fromCharCode(65 + i) + '</span>' +
        '<input class="campo campo-sm" id="form-opcao-' + chave + '-' + i + '" style="flex:1;min-width:0"' + trava +
          ' value="' + esc(o.texto) + '" placeholder="O que ela lê nesta opção"' +
          ' aria-label="Opção ' + (i + 1) + ' de ' + (p.titulo || 'pergunta sem texto') + '"' +
          ' oninput="formOpcaoTexto(\'' + chave + '\', ' + i + ', this.value)"' +
          ' onblur="formOpcaoAoSair(\'' + chave + '\', ' + i + ')">' +
        '<button class="bt bt-linha bt-sm" id="form-op-sobe-' + chave + '-' + i + '"' +
          (i === 0 ? ' disabled' : trava) + ' onclick="formOpcaoMover(\'' + chave + '\', ' + i + ', -1)">Subir</button>' +
        '<button class="bt bt-linha bt-sm" id="form-op-desce-' + chave + '-' + i + '"' +
          (i === op.length - 1 ? ' disabled' : trava) + ' onclick="formOpcaoMover(\'' + chave + '\', ' + i + ', 1)">Descer</button>' +
        '<button class="bt bt-linha bt-sm"' + trava + ' onclick="formOpcaoTirar(\'' + chave + '\', ' + i + ')">Tirar</button>' +
      '</div>';
    }).join('');
    html += '<div id="form-erro-opcoes-' + chave + '">' + formErrosHtml(p.chave, 'opcoes') + '</div>';
    html += '<button class="bt bt-linha bt-sm" style="margin-top:8px"' + trava +
      ' onclick="formOpcaoNova(\'' + chave + '\')">Acrescentar opção</button>';
  }

  if (p.tipo === 'telefone') {
    html += '<div class="rotulo" style="margin-top:18px">País que já vem escolhido</div>' +
      '<select class="campo campo-sm" style="max-width:260px"' + trava +
      ' onchange="formMascara(\'' + chave + '\', \'pais_padrao\', this.value)">' +
      FORM_PAISES.map(function (x) {
        const marcado = String((p.mascara && p.mascara.pais_padrao) || 'BR') === x.k;
        return '<option value="' + x.k + '"' + (marcado ? ' selected' : '') + '>' + esc(x.nome) + '</option>';
      }).join('') + '</select>';
  }

  if (p.tipo === 'numero') {
    html += '<div class="rotulo" style="margin-top:18px">Menor e maior valor aceitos</div>' +
      '<div style="display:flex;gap:10px;max-width:320px">' +
      '<input class="campo campo-sm" type="number" style="flex:1"' + trava +
        ' aria-label="Menor valor" placeholder="menor" value="' +
        ((p.mascara && p.mascara.minimo !== null && p.mascara.minimo !== undefined) ? Number(p.mascara.minimo) : '') + '"' +
        ' oninput="formMascara(\'' + chave + '\', \'minimo\', this.value)">' +
      '<input class="campo campo-sm" type="number" style="flex:1"' + trava +
        ' aria-label="Maior valor" placeholder="maior" value="' +
        ((p.mascara && p.mascara.maximo !== null && p.mascara.maximo !== undefined) ? Number(p.mascara.maximo) : '') + '"' +
        ' oninput="formMascara(\'' + chave + '\', \'maximo\', this.value)">' +
      '</div>';
  }

  if (p.tipo !== 'recado' && !t.escolha) {
    html += '<div class="rotulo" style="margin-top:18px">Texto de exemplo dentro do campo</div>' +
      '<input class="campo" maxlength="80"' + trava + ' value="' + esc(p.dica || '') + '"' +
      ' placeholder="Aparece em cinza e some quando ela começa a escrever"' +
      ' oninput="formCampo(\'' + chave + '\', \'dica\', this.value)">' +
      '<p class="dica" style="margin-top:6px">Nunca faz o papel da pergunta: a pergunta fica na tela ' +
      'o tempo todo.</p>';
  }

  if (p.tipo !== 'recado') {
    html += '<div class="rotulo" style="margin-top:18px">O que ela lê se errar</div>' +
      '<input class="campo" maxlength="160"' + trava + ' value="' + esc(p.erro || '') + '"' +
      ' placeholder="Deixe vazio para usar o texto padrão do tipo"' +
      ' oninput="formCampo(\'' + chave + '\', \'erro\', this.value)">';
  }

  html += '<div class="rotulo" style="margin-top:18px">Recado para a equipe</div>' +
    '<input class="campo" maxlength="300"' + trava + ' value="' + esc(p.nota || '') + '"' +
    ' placeholder="Por que esta pergunta existe, o que fazer com a resposta"' +
    ' oninput="formCampo(\'' + chave + '\', \'nota\', this.value)">' +
    '<p class="dica" style="margin-top:6px">Fica só aqui dentro. Quem responde o formulário não vê.</p>';

  return html;
}

function formPreviaHtml(p) {
  const n = formNumeroDaPergunta(p);
  const marcada = FORM.previa[p.chave];
  const t = formTipo(p.tipo);

  let corpo = '';
  if (t.escolha) {
    corpo = (p.opcoes || []).map(function (o, i) {
      const escolhida = t.k === 'escolha_multipla'
        ? (Array.isArray(marcada) && marcada.indexOf(o.chave) >= 0)
        : marcada === o.chave;
      return '<button onclick="formPreviaMarcar(\'' + esc(p.chave) + '\', \'' + esc(o.chave) + '\')"' +
        ' style="display:flex;align-items:center;gap:12px;width:100%;text-align:left;cursor:pointer;' +
        'border:1px solid ' + (escolhida ? 'var(--o)' : 'var(--fio)') + ';border-radius:var(--r);' +
        'background:' + (escolhida ? 'var(--o-10)' : 'none') + ';color:var(--tx);padding:11px 14px;margin-bottom:7px">' +
        '<span style="font-family:var(--display);font-size:11px;font-weight:700;width:20px;height:20px;' +
        'display:inline-grid;place-items:center;border:1px solid ' + (escolhida ? 'var(--o)' : 'var(--fio)') + ';' +
        'border-radius:var(--r-sm);color:' + (escolhida ? 'var(--o-tx)' : 'var(--tx-3)') + ';flex:none">' +
        String.fromCharCode(65 + i) + '</span>' +
        '<span style="font-size:13.5px">' + (o.texto ? esc(o.texto) : '<i style="color:var(--tx-4)">opção sem texto</i>') + '</span>' +
        '</button>';
    }).join('');
  } else if (p.tipo === 'recado') {
    corpo = '<div class="dica">Ela lê e segue. Não há campo para responder.</div>';
  } else if (p.tipo === 'texto_longo') {
    corpo = '<div style="border:1px solid var(--fio);border-radius:var(--r);padding:12px;min-height:74px;' +
      'color:var(--tx-4);font-size:13.5px">' + esc(p.dica || 'Ela escreve aqui') + '</div>';
  } else {
    corpo = '<div style="border-bottom:1px solid var(--fio);padding:10px 0;color:var(--tx-4);font-size:13.5px">' +
      esc(p.dica || 'Ela escreve aqui') + '</div>';
  }

  return '<div style="border:1px solid var(--fio-2);border-radius:var(--r);padding:20px;background:var(--fundo-2)">' +
    (p.ativa === false
      ? '<div style="margin-bottom:10px"><span class="eti eti-atencao">fora do ar</span>' +
        '<div class="dica" style="margin-top:6px">Ninguém vê esta pergunta enquanto ela está fora do ar.</div></div>'
      : '') +
    (n ? '<div style="font-family:var(--display);font-size:12px;color:var(--o);font-weight:700;margin-bottom:8px">' +
      String(n).padStart(2, '0') + '</div>' : '') +
    '<div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap">' +
      '<span style="font-family:var(--display);font-weight:800;letter-spacing:-.035em;font-size:21px;' +
      'line-height:1.15;color:' + (p.titulo ? 'var(--claro)' : 'var(--tx-4)') + '">' +
      esc(p.titulo || 'sem texto ainda') + '</span>' +
      (p.tipo !== 'recado' && !p.obrigatoria
        ? '<span class="dica" style="font-size:11.5px">opcional</span>' : '') +
    '</div>' +
    (p.descricao ? '<p class="dica" style="margin:8px 0 0">' + esc(p.descricao) + '</p>' : '') +
    '<div style="margin-top:16px">' + corpo + '</div>' +
  '</div>' +
  '<p class="dica" style="margin-top:8px">O desenho aqui é o do sistema. No formulário publicado, ' +
  'a letra e as cores são as da landing.</p>';
}

function formPreviaMarcar(chave, opcao) {
  const p = formAchar(chave);
  if (!p) return;
  if (p.tipo === 'escolha_multipla') {
    const atual = Array.isArray(FORM.previa[chave]) ? FORM.previa[chave].slice() : [];
    const i = atual.indexOf(opcao);
    if (i >= 0) atual.splice(i, 1); else atual.push(opcao);
    FORM.previa[chave] = atual;
  } else {
    FORM.previa[chave] = (FORM.previa[chave] === opcao) ? null : opcao;
  }
  formPintarPrevia(chave);
}

function formAbertaHtml(p) {
  const chave = esc(p.chave);
  const trava = formTrava();
  const ehEmail = p.papel === 'email';
  const unica = formPerguntas().length === 1;

  return '<div style="margin-top:18px;border-top:1px solid var(--fio-2);padding-top:18px">' +

    '<div class="rotulo">O que a pessoa lê</div>' +
    '<input class="campo" id="form-titulo-' + chave + '" maxlength="140"' + trava +
      ' value="' + esc(p.titulo || '') + '" placeholder="exemplo: Nome completo"' +
      ' oninput="formCampo(\'' + chave + '\', \'titulo\', this.value)">' +
    '<p class="dica" style="margin-top:6px">Este texto vira o nome da coluna na lista da mesa.</p>' +
    '<div id="form-erro-titulo-' + chave + '">' + formErrosHtml(p.chave, 'titulo') + '</div>' +

    (formJaPublicada(p.chave)
      ? ''
      : '<div class="rotulo" style="margin-top:18px">Apelido curto, que não muda</div>' +
        '<input class="campo campo-sm" style="max-width:260px"' + trava +
        ' value="' + esc(p.chave) + '" onchange="formMudarChave(\'' + chave + '\', this.value)">' +
        '<p class="dica" style="margin-top:6px">Serve para os números continuarem se somando quando você ' +
        'melhorar o texto da pergunta. Depois de publicar, ele não muda mais.</p>') +

    '<div class="rotulo" style="margin-top:18px">Explicação embaixo</div>' +
    '<textarea class="campo" style="min-height:64px"' + trava +
      ' oninput="formCampo(\'' + chave + '\', \'descricao\', this.value)">' + esc(p.descricao || '') + '</textarea>' +
    '<p class="dica" style="margin-top:6px">Some do formulário quando fica vazia.</p>' +

    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:18px;margin-top:18px">' +
      '<div>' +
        '<div class="rotulo">Tipo de resposta</div>' +
        '<select class="campo campo-sm"' + trava + ' onchange="formMudarTipo(\'' + chave + '\', this.value)">' +
          FORM_TIPOS.map(function (x) {
            return '<option value="' + x.k + '"' + (x.k === p.tipo ? ' selected' : '') + '>' + esc(x.nome) + '</option>';
          }).join('') + '</select>' +
        '<div id="form-erro-tipo-' + chave + '">' + formErrosHtml(p.chave, 'tipo') + '</div>' +
      '</div>' +
      '<div>' +
        '<div class="rotulo">Na lista da mesa, isto vira</div>' +
        '<select class="campo campo-sm"' + (p.tipo === 'recado' ? ' disabled' : trava) +
          ' onchange="formMudarPapel(\'' + chave + '\', this.value)">' +
          FORM_PAPEIS.map(function (x) {
            return '<option value="' + x.k + '"' + (x.k === (p.papel || '') ? ' selected' : '') + '>' +
              esc(x.nome) + '</option>';
          }).join('') + '</select>' +
      '</div>' +
    '</div>' +
    '<p class="dica" style="margin-top:6px">Nome, e-mail e WhatsApp ganham coluna própria em Ideias que ' +
    'chegaram. O resto aparece dentro da aplicação, na ordem daqui.</p>' +

    (p.tipo === 'recado' ? '' :
      '<label style="display:flex;align-items:center;gap:9px;font-size:13px;margin-top:18px;cursor:pointer">' +
        '<input type="checkbox"' + (p.obrigatoria ? ' checked' : '') + trava +
        ' onchange="formMarcar(\'' + chave + '\', \'obrigatoria\', this.checked)">' +
        'A pessoa não passa sem responder</label>') +

    '<label style="display:flex;align-items:center;gap:9px;font-size:13px;margin-top:10px;cursor:pointer">' +
      '<input type="checkbox"' + (p.ativa !== false ? ' checked' : '') + trava +
      ' onchange="formMarcar(\'' + chave + '\', \'ativa\', this.checked)">' +
      'Aparece no formulário</label>' +

    formCamposDoTipo(p) +

    '<div class="rotulo" style="margin-top:22px">Como a pessoa vê</div>' +
    '<div id="form-previa-' + chave + '">' + formPreviaHtml(p) + '</div>' +

    '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:20px;align-items:center">' +
      (ehEmail
        ? '<span class="dica" style="flex:1 1 260px">Esta pergunta não se apaga: é por este e-mail que vocês ' +
          'respondem. Para apagar, marque outra pergunta como o e-mail antes.</span>'
        : unica
          ? '<span class="dica" style="flex:1 1 260px">Esta é a única pergunta que restou. Formulário sem ' +
            'pergunta nenhuma não recebe ninguém.</span>'
          : '<button class="bt bt-linha bt-sm"' + trava + ' onclick="formApagar(\'' + chave + '\')">' +
            'Apagar esta pergunta</button>') +
      '<button class="bt bt-linha bt-sm"' + trava + ' onclick="formMarcar(\'' + chave + '\', \'ativa\', ' +
        (p.ativa === false ? 'true' : 'false') + ')">' +
        (p.ativa === false ? 'Ligar no ar' : 'Tirar do ar') + '</button>' +
      '<button class="bt bt-linha bt-sm" style="margin-left:auto" onclick="formAlternar(\'' + chave + '\')">Fechar</button>' +
    '</div>' +
  '</div>';
}

function formPerguntaHtml(p) {
  const aberta = FORM.aberta === p.chave;
  const fora = p.ativa === false;
  return '<div id="form-bloco-' + esc(p.chave) + '" style="border:1px solid ' +
    (aberta ? 'var(--o-35)' : 'var(--fio)') + ';border-radius:var(--r);padding:14px 16px;' +
    'background:var(--fundo-3);margin-bottom:10px' + (fora && !aberta ? ';opacity:.72' : '') + '">' +
    '<div id="form-cab-' + esc(p.chave) + '">' + formCabecalhoHtml(p) + '</div>' +
    (aberta ? formAbertaHtml(p) : '') +
  '</div>';
}

function formAcrescentarHtml() {
  const trava = formTrava();
  return '<div style="margin-top:22px;border-top:1px solid var(--fio-2);padding-top:18px">' +
    '<div class="rotulo">Acrescentar pergunta</div>' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
    FORM_TIPOS.map(function (t) {
      return '<button class="bt bt-linha bt-sm"' + trava + ' onclick="formNova(\'' + t.k + '\')">' +
        esc(t.nome) + '</button>';
    }).join('') +
    '</div>' +
    '<p class="dica" style="margin-top:10px">A pergunta nasce no fim da lista, aberta e sem texto. ' +
    'Para levar para outro lugar, use o seletor de posição dela.</p>' +
  '</div>';
}

/* ------------------------------------------------- a capa e o obrigado */

function formCapaHtml() {
  const trava = formTrava();
  const a = (FORM.def && FORM.def.abertura) || {};
  const f = (FORM.def && FORM.def.agradecimento) || {};
  const link = f.link || {};

  const campo = function (rotulo, caminho, chave, valor, extra, dica) {
    return '<div class="rotulo" style="margin-top:16px">' + rotulo + '</div>' +
      '<input class="campo"' + trava + (extra || '') + ' value="' + esc(valor || '') + '"' +
      ' oninput="formCapa(\'' + caminho + '\', \'' + chave + '\', this.value)">' +
      (dica ? '<p class="dica" style="margin-top:6px">' + dica + '</p>' : '');
  };

  return '<div class="cartao">' +
    '<div class="cartao-t">A capa e o obrigado</div>' +
    '<p class="dica" style="margin:-8px 0 8px">A pessoa lê a capa antes da primeira pergunta, ' +
    'e o obrigado depois de enviar.</p>' +

    campo('Título da capa', 'abertura', 'titulo', a.titulo) +

    '<div class="rotulo" style="margin-top:16px">Texto da capa</div>' +
    '<textarea class="campo" style="min-height:74px"' + trava +
      ' oninput="formCapa(\'abertura\', \'texto\', this.value)">' + esc(a.texto || '') + '</textarea>' +

    campo('Tempo e contagem', 'abertura', 'tempo', a.tempo, '',
      'Confira esta linha quando ligar ou desligar uma pergunta.') +
    campo('Botão que começa', 'abertura', 'botao', a.botao, ' maxlength="20"') +

    campo('Título do obrigado', 'agradecimento', 'titulo', f.titulo) +

    '<div class="rotulo" style="margin-top:16px">Texto do obrigado</div>' +
    '<textarea class="campo" style="min-height:74px"' + trava +
      ' oninput="formCapa(\'agradecimento\', \'texto\', this.value)">' + esc(f.texto || '') + '</textarea>' +

    '<div class="rotulo" style="margin-top:16px">Botão de volta</div>' +
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px">' +
      '<input class="campo"' + trava + ' value="' + esc(link.texto || '') + '" placeholder="o que o botão diz"' +
        ' aria-label="Texto do botão de volta"' +
        ' oninput="formCapa(\'agradecimento\', \'link_texto\', this.value)">' +
      '<input class="campo"' + trava + ' value="' + esc(link.url || '') + '" placeholder="para onde ele leva"' +
        ' aria-label="Endereço do botão de volta"' +
        ' oninput="formCapa(\'agradecimento\', \'link_url\', this.value)">' +
    '</div>' +
  '</div>';
}

/* -------------------------------------------------------- as versoes */

function formVersoesHtml() {
  const linhas = FORM.versoes
    .slice()
    .sort(function (a, b) { return Number(b.versao) - Number(a.versao); });
  const mostrar = FORM.verMais ? linhas : linhas.slice(0, 20);

  let corpo = '';
  if (!linhas.length) {
    corpo = vazio('Nenhuma versão foi publicada por aqui ainda. A que está no ar é a que entrou junto ' +
      'com o site.', 5);
  } else {
    corpo = mostrar.map(function (v) {
      const rascunho = !v.publicado_em;
      const noAr = Number(v.versao) === FORM.atual && !rascunho;
      const linha = '<tr>' +
        '<td><b>' + esc(v.versao) + '</b> ' +
          (rascunho ? '<span class="eti eti-atencao">rascunho</span>' : '') +
          (noAr ? '<span class="eti eti-ok">no ar</span>' : '') + '</td>' +
        '<td>' + (rascunho ? '<span class="dica">ainda não publicada</span>' : esc(dataLonga(v.publicado_em))) + '</td>' +
        '<td style="font-size:12.5px;color:var(--tx-2)">' + esc(v.publicado_por || 'sem registro') + '</td>' +
        '<td>' + esc(v.perguntas === undefined ? '' : v.perguntas) +
          (v.respostas_recebidas
            ? '<div class="dica" style="margin-top:4px">' + v.respostas_recebidas +
              (v.respostas_recebidas === 1 ? ' aplicação chegou por ela' : ' aplicações chegaram por ela') + '</div>'
            : '') + '</td>' +
        '<td style="text-align:right;white-space:nowrap">' + (rascunho ? '' :
          '<button class="bt bt-linha bt-sm" onclick="formVerDiferencas(' + Number(v.versao) + ')">' +
            (FORM.diffAberto === Number(v.versao) ? 'Fechar' : 'Ver o que mudou') + '</button>' +
          (noAr ? '' : ' <button class="bt bt-linha bt-sm"' + formTrava() +
            ' onclick="formTrazerVersao(' + Number(v.versao) + ')">Trazer para o rascunho</button>')) + '</td>' +
      '</tr>';

      if (FORM.diffAberto !== Number(v.versao) || rascunho) return linha;

      // O que esta versao fez com a anterior, em frases.
      const anterior = formVersaoAnterior(v.versao);
      const esta = FORM.guardadas[Number(v.versao)];
      const antes = anterior ? FORM.guardadas[anterior] : null;
      let miolo;
      if (!esta || (anterior && !antes)) {
        miolo = '<p class="dica">Buscando o que mudou.</p>';
      } else if (!anterior) {
        miolo = '<p class="dica">É a primeira versão publicada por aqui, então não há uma anterior ' +
          'para comparar com ela.</p>';
      } else {
        miolo = '<p class="dica" style="margin-bottom:8px">O que a versão ' + esc(v.versao) +
          ' fez com a ' + esc(anterior) + '.</p>' + formListaDiferencas(antes, esta);
      }
      return linha + '<tr><td colspan="5" style="background:var(--fundo-3);padding:16px 18px">' +
        (v.nota ? '<p class="dica" style="margin-bottom:8px">Quem publicou escreveu: ' + esc(v.nota) + '</p>' : '') +
        miolo + '</td></tr>';
    }).join('');
  }

  return '<div class="cartao">' +
    '<div class="cartao-t">Versões</div>' +
    '<p class="dica" style="margin:-8px 0 16px">Toda publicação vira uma versão, e nenhuma se apaga.</p>' +
    '<div class="rolo-h"><table class="lista">' +
      '<thead><tr><th>Versão</th><th>Publicada</th><th>Quem publicou</th><th>Perguntas</th><th></th></tr></thead>' +
      '<tbody>' + corpo + '</tbody></table></div>' +
    (linhas.length > 20 && !FORM.verMais
      ? '<button class="bt bt-linha bt-sm" style="margin-top:14px" onclick="formVerMaisVersoes()">Ver mais versões</button>'
      : '') +
  '</div>';
}

/* ------------------------------------------------- a visao das perguntas */

function formCorpoPerguntas() {
  if (FORM.estado === 'carregando') {
    return '<div class="cartao"><p class="dica">Buscando o formulário no servidor.</p></div>';
  }
  if (!FORM.def) {
    return '<div class="cartao"><p class="dica">O formulário vem do servidor, e ele não respondeu. ' +
      'O aviso acima diz o que fazer.</p></div>';
  }

  const carimbo = FORM.publicadoEm
    ? 'publicado em ' + dataLonga(FORM.publicadoEm)
    : 'nunca publicado por aqui';

  return '<div class="cartao">' +
    '<div class="cartao-t">' +
      '<span>As perguntas</span>' +
      formEtiquetaEstado() +
      '<span style="margin-left:auto;text-transform:none;letter-spacing:0;font-weight:400;font-size:11px;' +
        'color:var(--tx-4)">' + esc(carimbo) + '</span>' +
    '</div>' +

    '<div id="form-barra">' + formBarraAcoesHtml() + '</div>' +
    '<div class="dica" id="form-vivo" aria-live="polite" style="margin-bottom:16px;min-height:1.6em">' +
      esc(FORM.vivo) + '</div>' +

    (formPerguntas().length
      ? formPerguntas().map(formPerguntaHtml).join('')
      : '<p class="dica">Nenhuma pergunta no formulário. A primeira que você acrescentar abre logo abaixo, ' +
        'com o texto vazio.</p>') +

    formAcrescentarHtml() +
  '</div>' +

  formCapaHtml() +
  formVersoesHtml();
}

/* =====================================================================
   Desenho: como esta indo.
   ===================================================================== */

function formIntervalo() {
  if (FORM.periodo === '7') return { de: formDiaRelativo(-6), ate: formDiaRelativo(0) };
  if (FORM.periodo === 'mes') {
    const d = new Date();
    return { de: d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-01',
             ate: formDiaRelativo(0) };
  }
  // Desde o comeco: o servidor guarda doze meses de visita, entao um ano
  // e o comeco de tudo que existe para contar.
  if (FORM.periodo === 'tudo') return { de: formDiaRelativo(-365), ate: formDiaRelativo(0) };
  return { de: formDiaRelativo(-29), ate: formDiaRelativo(0) };
}

async function formMedidasCarregar() {
  FORM.medEstado = 'carregando';
  FORM.medFalha = null;
  formDesenhar();

  const i = formIntervalo();
  const r = await formPedir('/api/metricas?de=' + i.de + '&ate=' + i.ate);
  if (r.erro) {
    FORM.medEstado = 'erro';
    FORM.medFalha = formFalhaDe(r.erro, r.corpo, r.status);
    // A frase de rede desta visao fala dos numeros, nao das perguntas.
    if (r.erro === 'rede') {
      FORM.medFalha.texto = 'Os números são contados no servidor, não neste navegador. Se você abriu este ' +
        'arquivo direto do computador, entre pelo endereço publicado. Se já estava nele, foi a rede que caiu: ' +
        'peça para buscar de novo.';
    }
    if (r.erro === 'semporta') {
      FORM.medFalha.texto = 'Enquanto ele não existir, os números ficam fechados: abrir agora deixaria o ' +
        'movimento do site à vista de qualquer um que soubesse o endereço. O formulário continua no ar ' +
        'e continua recebendo.';
    }
    formDesenhar();
    return;
  }
  FORM.med = r.corpo;
  FORM.medEstado = 'ok';
  FORM.medLidoEm = new Date().toISOString();
  formDesenhar();
}

function formMedPeriodo(v) {
  FORM.periodo = v;
  formMedidasCarregar();
}

function formVerPergunta(chave) {
  FORM.aba = 'perguntas';
  FORM.aberta = chave;
  formDesenhar();
  const bloco = porId('form-bloco-' + chave);
  if (bloco && bloco.scrollIntoView) bloco.scrollIntoView({ block: 'center' });
  const campo = porId('form-titulo-' + chave);
  if (campo) campo.focus();
}

function formMedNumerosHtml() {
  const m = FORM.med, f = (m && m.funil) || {};
  const poucos = Number(f.abriu || 0) < FORM_MINIMO_PARA_CONTA;
  let html =
    formNumeroBloco(Number(f.abriu || 0), 'vezes que a página foi aberta', false, !f.abriu) +
    formNumeroBloco(Number(f.comecou || 0), 'passaram da primeira pergunta', false, !f.comecou) +
    formNumeroBloco(Number(f.enviou || 0), 'terminaram e enviaram', true, !f.enviou);
  const dez = formCadaDez(f.enviou, f.comecou);
  if (!poucos && dez !== null) {
    html += formNumeroBloco(dez + ' de cada 10', 'de quem começa, termina', false, !dez);
  }
  return html;
}

function formMedCorpo() {
  const m = FORM.med;
  const f = m.funil || {};
  const tempo = m.tempo || {};
  const perguntas = Array.isArray(m.perguntas) ? m.perguntas : [];
  const poucos = Number(f.abriu || 0) < FORM_MINIMO_PARA_CONTA;
  let html = '';

  // Vazio de verdade: ninguem abriu ainda.
  if (!f.abriu) {
    return '<div class="cartao"><p class="dica">' +
      (FORM.publicadoEm
        ? 'O formulário está no ar desde ' + esc(dataCurta(FORM.publicadoEm)) + '. Ninguém abriu ainda. '
        : 'O formulário está no ar. Ninguém abriu ainda. ') +
      'O link dele está na landing, no botão Quero aplicar.</p></div>';
  }

  // 1. O numero que paga a conta.
  const nome = FORM.periodo === '7' ? 'nos últimos 7 dias'
    : FORM.periodo === 'mes' ? 'neste mês'
    : FORM.periodo === 'tudo' ? 'desde o começo' : 'nos últimos 30 dias';
  html += '<div class="cartao">' +
    '<div style="font-family:var(--display);font-weight:800;letter-spacing:-.035em;line-height:1;' +
    'font-size:clamp(38px,6vw,58px);color:var(--o-tx)">' + Number(f.enviou || 0) + '</div>' +
    '<div style="font-size:15px;color:var(--tx);margin-top:10px">' +
      (Number(f.enviou) === 1 ? 'aplicação completa ' : 'aplicações completas ') + esc(nome) + '</div>' +
    '<p class="dica" style="margin-top:8px">Elas estão em Ideias que chegaram.</p>' +
    '<button class="bt bt-linha bt-sm" style="margin-top:12px" onclick="irPara(\'ideias\')">' +
      'Abrir Ideias que chegaram</button>' +
    '</div>';

  if (poucos) {
    html += '<div class="cartao"><p class="dica">Com menos de ' + FORM_MINIMO_PARA_CONTA +
      ' visitas, as contas de cada 10 ainda balançam muito. Elas aparecem quando passar disso.</p></div>';
  } else {
    html += '<p class="dica" style="margin:-6px 0 22px">A conta de cada 10 olha as ' +
      Number(f.comecou || 0) + ' pessoas que começaram.</p>';
  }

  // 3. Quanto tempo leva.
  if (tempo.amostra) {
    html += '<div class="cartao">' +
      '<div class="cartao-t">Quanto tempo leva</div>' +
      '<div style="font-family:var(--display);font-weight:800;letter-spacing:-.035em;font-size:30px;' +
      'color:var(--claro);line-height:1">' + esc(formTempo(tempo.mediana_ms)) + '</div>' +
      '<p style="font-size:14px;color:var(--tx-2);margin-top:10px">é o que a metade das pessoas leva ' +
      'para terminar.</p>' +
      (tempo.p90_ms ? '<p class="dica" style="margin-top:6px">Nove em cada dez terminam em menos de ' +
        esc(formTempo(tempo.p90_ms)) + '.</p>' : '') +
      '<p class="dica" style="margin-top:6px">Contado em ' + Number(tempo.amostra) +
      (Number(tempo.amostra) === 1 ? ' aplicação que chegou ao fim.' : ' aplicações que chegaram ao fim.') + '</p>' +
      '</div>';
  }

  // 4. Onde as pessoas param.
  if (perguntas.length) {
    const topo = Math.max.apply(null, perguntas.map(function (p) { return Number(p.viu || 0); }).concat([1]));
    html += '<div class="cartao">' +
      '<div class="cartao-t">Onde as pessoas param</div>' +
      '<p class="dica" style="margin:-8px 0 18px">As barras encurtam de cima para baixo. Quanto mais uma ' +
      'barra encurta em relação à de cima, mais gente desistiu naquela pergunta.</p>' +
      perguntas.map(function (p) {
        const pc = formPorCento(p.abandonou, p.viu);
        return '<div style="margin-bottom:14px">' +
          '<div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap;margin-bottom:6px">' +
            '<span style="font-size:13px;color:var(--tx)' + (p.ativa === false ? ';opacity:.7' : '') + '">' +
              esc(p.titulo || p.chave) + '</span>' +
            (p.ativa === false ? '<span class="eti eti-neutra">saiu do formulário</span>' : '') +
            '<span class="dica" style="margin-left:auto">' + Number(p.viu || 0) + ' chegaram, ' +
              Number(p.respondeu || 0) + ' responderam</span>' +
            (!poucos && pc > FORM_ABANDONO_ALTO
              ? '<span class="eti eti-alerta">' + pc + ' de cada 100 param aqui</span>' : '') +
          '</div>' +
          formBarra(formPorCento(p.viu, topo)) +
          '</div>';
      }).join('') +
      (m.pior_pergunta && !poucos
        ? '<p style="font-size:14px;color:var(--tx-2);margin-top:18px">A pergunta que mais faz gente ' +
          'desistir é "' + esc(formTituloDaChave(m.pior_pergunta.chave, perguntas)) + '". De cada 100 que ' +
          'chegam nela, ' + Math.round(Number(m.pior_pergunta.abandono_pct || 0)) + ' param ali.</p>' +
          '<button class="bt bt-linha bt-sm" style="margin-top:10px" onclick="formVerPergunta(\'' +
          esc(m.pior_pergunta.chave) + '\')">Ver essa pergunta</button>' +
          '<p class="dica" style="margin-top:10px">Uma pergunta que custa caro e vale pouco pode virar a ' +
          'última, ou pode sair.</p>'
        : '') +
      '</div>';

    // 5. Quanto cada pergunta custa.
    const comTempo = perguntas.filter(function (p) { return Number(p.mediana_ms || 0) > 0; });
    if (comTempo.length) {
      const maior = Math.max.apply(null, comTempo.map(function (p) { return Number(p.mediana_ms); }));
      const soma = comTempo.reduce(function (t, p) { return t + Number(p.mediana_ms); }, 0);
      const cara = comTempo.slice().sort(function (a, b) { return b.mediana_ms - a.mediana_ms; })[0];
      html += '<div class="cartao">' +
        '<div class="cartao-t">Quanto cada pergunta custa</div>' +
        comTempo.map(function (p) {
          return '<div style="margin-bottom:12px">' +
            '<div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap;margin-bottom:6px">' +
              '<span style="font-size:13px;color:var(--tx)">' + esc(p.titulo || p.chave) + '</span>' +
              '<span class="dica" style="margin-left:auto">' + esc(formTempo(p.mediana_ms)) + '</span>' +
            '</div>' + formBarra(formPorCento(p.mediana_ms, maior), 'var(--o-lt)') + '</div>';
        }).join('') +
        (comTempo.length > 1
          ? '<p class="dica" style="margin-top:6px">A pergunta "' + esc(cara.titulo || cara.chave) + '" leva ' +
            esc(formTempo(cara.mediana_ms)) + '. As outras ' + (comTempo.length - 1) + ' juntas levam ' +
            esc(formTempo(soma - Number(cara.mediana_ms))) + '.</p>'
          : '') +
        '</div>';
    }

    // 6. As respostas ate agora.
    const comOpcoes = perguntas.filter(function (p) { return Array.isArray(p.opcoes) && p.opcoes.length; });
    if (comOpcoes.length) {
      html += '<div class="cartao">' +
        '<div class="cartao-t">As respostas até agora</div>' +
        '<p class="dica" style="margin:-8px 0 18px">Conta quem enviou a aplicação, com a opção que ela ' +
        'marcou.</p>' +
        comOpcoes.map(function (p) {
          const total = p.opcoes.reduce(function (t, o) { return t + Number(o.quantas || 0); }, 0);
          return '<div style="margin-bottom:22px">' +
            '<div class="rotulo">' + esc(p.titulo || p.chave) + '</div>' +
            p.opcoes.map(function (o) {
              const quantas = Number(o.quantas || 0);
              return '<div style="margin-bottom:10px">' +
                '<div style="display:flex;gap:10px;align-items:baseline;flex-wrap:wrap;margin-bottom:5px">' +
                  '<span style="font-size:13px;color:var(--tx)">' + esc(o.texto) + '</span>' +
                  '<span class="dica" style="margin-left:auto">' + quantas +
                    (quantas === 1 ? ' pessoa' : ' pessoas') +
                    (total && !poucos ? ', ' + formPorCento(o.quantas, total) + ' de cada 100' : '') + '</span>' +
                '</div>' + formBarra(formPorCento(o.quantas, total)) + '</div>';
            }).join('') + '</div>';
        }).join('') +
        '</div>';
    }
  }

  // 7. De onde as pessoas vieram.
  html += formMedOrigemHtml(poucos);

  // 8. Celular ou computador.
  html += formMedAparelhoHtml(poucos);

  // 9. Dia a dia.
  html += formMedDiaHtml();

  // 10. Onde o formulario recusou o que a pessoa escreveu.
  html += formMedRecusasHtml(perguntas);

  // A palavra "funil" nao entra na tela: a escada de barras ja e o funil,
  // e nomear a ferramenta em vez da coisa e jargao.
  html += '<p class="dica" style="margin-top:-8px">Estes números são contados no servidor, e um ' +
    'preenchimento que não chega ao fim pode não ser contado.</p>';

  return html;
}

function formTituloDaChave(chave, perguntas) {
  const p = (perguntas || []).find(function (x) { return x.chave === chave; });
  return p ? (p.titulo || p.chave) : chave;
}

function formMedOrigemHtml(poucos) {
  const m = FORM.med;
  const origem = Array.isArray(m.por_origem) ? m.por_origem.slice() : [];
  const referencia = Array.isArray(m.por_referencia) ? m.por_referencia.slice() : [];
  const plano = Array.isArray(m.por_plano) ? m.por_plano.slice() : [];
  if (!origem.length && !referencia.length && !plano.length) return '';

  // Ordenado por quem TERMINA, nao por quem visita: a campanha que traz
  // mais gente raramente e a que traz gente melhor.
  const ordenar = function (a, b) { return Number(b.enviou || 0) - Number(a.enviou || 0); };
  origem.sort(ordenar); referencia.sort(ordenar); plano.sort(ordenar);

  const linha = function (nome, visitas, enviou) {
    const conta = (!poucos && Number(visitas) >= FORM_MINIMO_PARA_CONTA)
      ? formCadaDez(enviou, visitas) + ' de cada 10 terminam'
      : 'ainda são poucos para dizer';
    return '<tr><td><b>' + esc(nome) + '</b></td>' +
      '<td class="num">' + Number(visitas || 0) + '</td>' +
      '<td class="num">' + Number(enviou || 0) + '</td>' +
      '<td class="dica">' + esc(conta) + '</td></tr>';
  };

  let corpo = origem.map(function (o) {
    return linha(o.origem + (o.campanha ? ', ' + o.campanha : ''), o.visitas, o.enviou);
  }).join('');
  corpo += referencia.map(function (o) { return linha('veio de ' + o.veio_de, o.visitas, o.enviou); }).join('');
  corpo += plano.map(function (o) {
    return linha('clicou o nível ' + o.plano, o.visitas, o.enviou);
  }).join('');

  return '<div class="cartao">' +
    '<div class="cartao-t">De onde as pessoas vieram</div>' +
    '<p class="dica" style="margin:-8px 0 16px">A lista começa por quem mais termina, não por quem mais ' +
    'visita. Uma pessoa pode aparecer em mais de uma linha: uma diz por onde ela chegou, outra diz o ' +
    'site que a trouxe, e outra o nível que ela clicou na landing.</p>' +
    '<div class="rolo-h"><table class="lista">' +
      '<thead><tr><th>De onde</th><th class="num">Abriram</th><th class="num">Terminaram</th><th></th></tr></thead>' +
      '<tbody>' + (corpo || vazio('Ninguém chegou por um caminho conhecido ainda.', 4)) + '</tbody>' +
    '</table></div></div>';
}

function formMedAparelhoHtml(poucos) {
  const lista = Array.isArray(FORM.med.por_aparelho) ? FORM.med.por_aparelho : [];
  if (!lista.length) return '';
  const total = lista.reduce(function (t, a) { return t + Number(a.visitas || 0); }, 0);
  const celular = lista.find(function (a) { return a.aparelho === 'celular'; });
  const computador = lista.find(function (a) { return a.aparelho === 'computador'; });
  if (!total) return '';

  let frases = '';
  if (celular && !poucos) {
    frases += '<p style="font-size:15px;color:var(--tx);line-height:1.6">' +
      formCadaDez(celular.visitas, total) + ' de cada 10 abrem no celular.</p>';
  }
  if (celular && computador && !poucos) {
    frases += '<p style="font-size:15px;color:var(--tx);line-height:1.6;margin-top:6px">No celular, ' +
      formPorCento(celular.enviou, celular.visitas) + ' de cada 100 terminam. No computador, ' +
      formPorCento(computador.enviou, computador.visitas) + '.</p>';
  }
  if (!frases) {
    frases = lista.map(function (a) {
      return '<p style="font-size:14px;color:var(--tx);line-height:1.6">' + esc(a.aparelho) + ': ' +
        Number(a.visitas || 0) + ' abriram, ' + Number(a.enviou || 0) + ' terminaram.</p>';
    }).join('');
  }

  return '<div class="cartao">' +
    '<div class="cartao-t">Celular ou computador</div>' + frases +
    '<p class="dica" style="margin-top:12px">O formulário é lido no celular. Toda decisão de tamanho de ' +
    'letra e de botão vale primeiro lá.</p></div>';
}

function formMedDiaHtml() {
  const dias = Array.isArray(FORM.med.por_dia) ? FORM.med.por_dia : [];
  if (dias.length < 2) return '';
  const topo = Math.max.apply(null, dias.map(function (d) { return Number(d.abriu || 0); }).concat([1]));
  const maior = dias.reduce(function (a, b) {
    return Number(b.enviou || 0) > Number(a.enviou || 0) ? b : a;
  }, dias[0]);

  return '<div class="cartao">' +
    '<div class="cartao-t">Dia a dia</div>' +
    '<div class="rolo-h"><div style="display:flex;align-items:flex-end;gap:3px;height:130px;min-width:280px">' +
      dias.map(function (d) {
        const alturaAbriu = Math.round((Number(d.abriu || 0) / topo) * 100);
        const alturaEnviou = Math.round((Number(d.enviou || 0) / topo) * 100);
        return '<div style="flex:1 1 0;min-width:5px;height:100%;display:flex;align-items:flex-end;' +
          'position:relative" title="' + esc(dataCurta(d.dia)) + ': ' + Number(d.abriu || 0) +
          ' abriram, ' + Number(d.enviou || 0) + ' terminaram">' +
          '<div style="position:absolute;inset:auto 0 0 0;height:' + alturaAbriu + '%;background:var(--fio-2);' +
            'border-radius:2px 2px 0 0"></div>' +
          '<div style="position:relative;width:100%;height:' + alturaEnviou + '%;background:var(--o);' +
            'border-radius:2px 2px 0 0"></div>' +
        '</div>';
      }).join('') +
    '</div></div>' +
    '<div style="display:flex;justify-content:space-between;margin-top:8px">' +
      '<span class="dica">' + esc(dataCurta(dias[0].dia)) + '</span>' +
      '<span class="dica">o dia mais cheio foi ' + esc(dataCurta(maior.dia)) + ', com ' +
        Number(maior.enviou || 0) + '</span>' +
      '<span class="dica">' + esc(dataCurta(dias[dias.length - 1].dia)) + '</span>' +
    '</div>' +
    '<p class="dica" style="margin-top:12px">A barra cheia é quem terminou, e a sombra atrás é quem abriu. ' +
    'A conta de cada 10 só aparece no total do período: em um dia só, duas pessoas mudam tudo.</p>' +
  '</div>';
}

function formMedRecusasHtml(perguntas) {
  const recusadas = FORM.med.recusadas || {};
  const comErro = (perguntas || []).filter(function (p) { return Number(p.erro_campo || 0) > 0; })
    .sort(function (a, b) { return Number(b.erro_campo) - Number(a.erro_campo); });
  if (!comErro.length && !recusadas.armadilha && !recusadas.limite) return '';

  return '<div class="cartao">' +
    '<div class="cartao-t">Onde o formulário recusou o que a pessoa escreveu</div>' +
    comErro.map(function (p) {
      const pc = formPorCento(p.erro_campo, p.viu);
      return '<p style="font-size:14px;color:var(--tx-2);line-height:1.6;margin-bottom:8px">' +
        Number(p.erro_campo) + (Number(p.erro_campo) === 1 ? ' pessoa teve' : ' pessoas tiveram') +
        ' a resposta de "' + esc(p.titulo || p.chave) + '" recusada antes de conseguir passar' +
        (p.viu ? '. São ' + pc + ' de cada 100 que chegaram nessa pergunta.' : '.') + '</p>';
    }).join('') +
    (recusadas.armadilha
      ? '<p class="dica" style="margin-top:8px">' + Number(recusadas.armadilha) +
        (Number(recusadas.armadilha) === 1 ? ' envio foi descartado por parecer automático.'
                                           : ' envios foram descartados por parecerem automáticos.') + '</p>'
      : '') +
    (recusadas.limite
      ? '<p class="dica" style="margin-top:6px">' + Number(recusadas.limite) +
        (Number(recusadas.limite) === 1 ? ' envio foi barrado por vir muitas vezes seguidas do mesmo lugar.'
                                        : ' envios foram barrados por virem muitas vezes seguidas do mesmo lugar.') +
        '</p>'
      : '') +
  '</div>';
}

function formCorpoMedidas() {
  const botoes = '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px">' +
    FORM_PERIODOS.map(function (p) {
      return '<button class="bt bt-sm ' + (FORM.periodo === p.k ? 'bt-marca' : 'bt-linha') +
        '" onclick="formMedPeriodo(\'' + p.k + '\')">' + esc(p.nome) + '</button>';
    }).join('') +
    '<button class="bt bt-linha bt-sm" onclick="formMedidasCarregar()"' +
      (FORM.medEstado === 'carregando' ? ' disabled' : '') + '>Buscar de novo</button>' +
    '</div>';

  if (FORM.medEstado === 'carregando' && !FORM.med) {
    return botoes + '<div class="cartao"><p class="dica">Buscando os números no servidor.</p></div>';
  }
  if (FORM.medEstado === 'erro') {
    return botoes + aviso(FORM.medFalha.tom, FORM.medFalha.titulo, FORM.medFalha.texto);
  }
  if (!FORM.med) return botoes;

  return botoes + formMedCorpo();
}

/* =====================================================================
   Pintura.

   Tres funcoes de pintura parcial e uma inteira. Digitar chama as
   parciais; mover, abrir, apagar e gravar chamam a inteira.
   ===================================================================== */

function formPintarCabecalho(chave) {
  const p = formAchar(chave);
  if (p) escrever('form-cab-' + chave, formCabecalhoHtml(p));
}

function formPintarPrevia(chave) {
  const p = formAchar(chave);
  if (p) escrever('form-previa-' + chave, formPreviaHtml(p));
}

function formPintarErros(chave) {
  escrever('form-erro-titulo-' + chave, formErrosHtml(chave, 'titulo'));
  escrever('form-erro-opcoes-' + chave, formErrosHtml(chave, 'opcoes'));
  escrever('form-erro-tipo-' + chave, formErrosHtml(chave, 'tipo'));
}

// O topo inteiro menos a lista de perguntas: a frase, os quatro numeros,
// os avisos e a barra de acoes. E o que muda enquanto se digita.
function formPintarTopo() {
  if (FORM.aba !== 'perguntas') return;
  const frase = formFrase();
  escrever('form-frase', frase[0]);
  escrever('form-obs', frase[1]);

  const caixa = porId('form-numeros');
  if (caixa) {
    caixa.hidden = !(FORM.estado === 'ok');
    if (!caixa.hidden) caixa.innerHTML = formNumerosHtml();
  }
  escrever('form-avisos', formAvisosHtml());

  const barra = porId('form-barra');
  if (barra) barra.innerHTML = formBarraAcoesHtml();

  contador('formulario', FORM.def ? formDiferencas(FORM.noAr, FORM.def).length : 0);
}

function formDesenhar() {
  const abas = porId('form-abas');
  if (!abas) return;
  abas.innerHTML = formAbasHtml();

  if (FORM.aba === 'medidas') {
    const m = FORM.med || {};
    const carimbo = FORM.medLidoEm ? ' Lido do servidor às ' + formHoraCurta(FORM.medLidoEm) + '.' : '';
    escrever('form-frase', 'Como está indo o <b>formulário</b>.');
    escrever('form-obs', esc((m.de ? formPeriodoFrase(m.de, m.ate) : '') + carimbo));

    const caixa = porId('form-numeros');
    if (caixa) {
      caixa.hidden = !(FORM.medEstado === 'ok' && FORM.med && FORM.med.funil && FORM.med.funil.abriu);
      if (!caixa.hidden) caixa.innerHTML = formMedNumerosHtml();
    }
    escrever('form-avisos', '');
    escrever('form-corpo', formCorpoMedidas());
    contador('formulario', FORM.def ? formDiferencas(FORM.noAr, FORM.def).length : 0);
    return;
  }

  const frase = formFrase();
  escrever('form-frase', frase[0]);
  escrever('form-obs', frase[1]);

  const caixa = porId('form-numeros');
  if (caixa) {
    caixa.hidden = !(FORM.estado === 'ok');
    if (!caixa.hidden) caixa.innerHTML = formNumerosHtml();
  }

  escrever('form-avisos', formAvisosHtml());
  escrever('form-corpo', formCorpoPerguntas());
  contador('formulario', FORM.def ? formDiferencas(FORM.noAr, FORM.def).length : 0);
}

/* ---------------------------------------------------------------------
   Entrada da tela.

   Buscar de novo a cada visita seria pedir ao servidor o que ja esta na
   tela, e pior: jogaria fora o que a pessoa acabou de digitar e ainda
   nao salvou. A primeira visita carrega, e depois quem manda e o botao.
   --------------------------------------------------------------------- */
DESENHO.formulario = function () {
  formDesenhar();
  if (FORM.estado === 'ocioso') formCarregar();
};

/* =====================================================================
   PARA O ORQUESTRADOR REGISTRAR

   Nada disto e feito por este arquivo, de proposito: os quatro pontos
   abaixo moram em arquivos que esta frente nao encosta.

   1. fonte/sistema/build.py, na lista TELAS, logo depois de ideias:

        ('formulario', 'O formulario'),

   2. fonte/sistema/30-base.js, na constante TELAS, logo depois de ideias:

        { k: 'formulario', nome: 'O formulário', ic: 'i-flag', grupo: 'A mesa',
          titulo: ['O <b>formulário</b>',
                   'As perguntas que a pessoa responde antes de chegar na sua mesa'] },

   3. fonte/sistema/30-base.js, em PERMISSOES_DEFAULT: a chave 'formulario'
      entra em gestor e em colaborador, e NAO entra em cliente.

   4. fonte/sistema/30-base.js: 'formulario' em TELAS_NOVAS, senao a tela
      nasce invisivel para quem ja usou o sistema neste navegador. O
      contrato tambem pede PERM_TELAS, mas essa constante nao existe neste
      repositorio: quem apresenta tela nova aqui e TELAS_NOVAS junto de
      PERMISSOES_DEFAULT, dentro de carregarPermissoes(). Vale conferir na
      hora de registrar.

   5. fonte/sistema/30-base.js, em CHAVES:

        formularioRascunho: 'iqv_formulario_rascunho',

      Esta tela ja funciona sem isso: quando a chave nao existe em CHAVES,
      ela usa o mesmo nome direto. O registro serve para "A casa" enxergar
      a chave no inventario do navegador.

   Quatro combinados com as outras frentes, que valem a conferencia:

   a. Esta tela le a definicao completa em GET /api/formulario/versoes,
      com e sem ?versao=N, porque a rota publica vem podada e o editor
      precisa da pergunta desligada, do recado interno e do papel de cada
      pergunta. Com a tabela de versoes vazia, ela cai na rota publica e
      grava com base_versao 0.

   b. "Ver o formulario inteiro" abre /aplicar?conferir=1 em outra aba. O
      nome do parametro precisa bater com o que a pagina publica espera
      para buscar o rascunho em vez da versao no ar.

   c. A recusa por versao vencida (409) e lida como
      { atual: N, formulario: {...} }. Se a rota devolver a definicao com
      outro nome, esta tela tambem aceita "definicao".

   d. Enquanto a tabela de versoes estiver vazia, a unica definicao que a
      tela alcanca e a podada da rota publica, que nao carrega o papel de
      cada pergunta. A tela remenda isso pelo tipo: a primeira pergunta de
      e-mail vira o e-mail da mesa, e a primeira de WhatsApp vira o
      WhatsApp. Sem o remendo, a tela acusaria que falta uma pergunta de
      e-mail num formulario que tem uma. Se a rota das versoes puder
      devolver a definicao de fabrica inteira quando a tabela esta vazia,
      o remendo sai daqui e a sexta pergunta desligada aparece desde o
      primeiro dia.
   ===================================================================== */
