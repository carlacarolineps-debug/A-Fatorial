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
  soLeitura: false,        // quem nao e gestor ve, mas nao publica
  podada: false,           // veio pela porta da rua, sem o campo da mesa
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

/* O ladrilho de número, com ícone.

   O ícone num quadrado com o tom da própria medida é o que faz a fileira
   se ler de relance em vez de palavra por palavra: quem abre a tela toda
   semana reconhece a forma antes de ler o rótulo. */
function formNumeroBloco(valor, rotulo, puxa, zero, antes, icone, tom) {
  return '<div class="numero' + (puxa ? ' puxa' : '') + '">' +
    (icone ? '<div class="numero-ic' + (tom ? ' ' + tom : '') + '">' + ic(icone) + '</div>' : '') +
    '<div class="v' + (zero ? ' zero' : '') + '">' + valor + '</div>' +
    '<div class="l">' + rotulo + '</div>' +
    (antes || '') + '</div>';
}

/* A comparacao com o periodo anterior.

   Numero sozinho nao diz se esta bom: 110 aplicacoes num mes so viram
   noticia ao lado das 84 do mes passado, e essa e a conta que faltava
   aqui. Devolve vazio quando nao ha com o que comparar, e quando o
   periodo anterior teve zero: dividir por zero nao vira "cresceu
   infinito", vira frase sem sentido. */
function formComparado(agora, antes) {
  if (antes === null || antes === undefined) return '';
  const a = Number(agora) || 0;
  const b = Number(antes) || 0;
  if (!b) {
    return a
      ? '<div class="comparado sobe">' + a + ' a mais que no período anterior</div>'
      : '';
  }
  const dif = a - b;
  if (!dif) return '<div class="comparado igual">igual ao período anterior</div>';
  const pct = Math.round(Math.abs(dif) / b * 100);
  return '<div class="comparado ' + (dif > 0 ? 'sobe' : 'desce') + '">' +
    (dif > 0 ? '+' : '−') + pct + '% sobre os ' + b + ' anteriores</div>';
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
    // Os cabecalhos entram sempre, tenha ou nao vindo opcoes: o pedido que
    // publica uma versao nova traz as dele, e sem juntar os dois ele seria
    // o unico a sair sem o aviso de que o login venceu.
    const o = Object.assign({ cache: 'no-store' }, opcoes || {});
    o.headers = cabecalhos(o.headers);
    r = await fetch(caminho, o);
  } catch (e) {
    return { erro: 'rede' };
  }
  // Quando a entrada vence, o que pode voltar e uma pagina de erro em
  // HTML. Ler aquilo como JSON estoura, e o estouro apareceria como erro
  // sem nome para quem so precisava recarregar a pagina.
  let corpo = null;
  try { corpo = await r.json(); } catch (e) { corpo = null; }
  if (corpo === null) return { erro: 'login' };
  if (r.status === 401) return { erro: 'sessao', corpo: corpo };
  if (r.status === 409) return { erro: 'conflito', corpo: corpo };
  // O servidor diz o motivo de proposito. Sem ele, "o seu papel nao
  // alcanca isto" e "o lugar onde as coisas ficam guardadas nao respondeu"
  // chegariam aqui iguais, e a segunda mandaria a Carla atras de uma
  // permissao por um problema que passa sozinho.
  const motivo = String((corpo && corpo.motivo) || '');
  if (motivo === 'banco') return { erro: 'banco', corpo: corpo };
  // 403 e papel: quem nao e gestor le mas nao publica, e quem e cliente
  // nem chega aqui. A tela cai para so-leitura em vez de mostrar erro.
  if (r.status === 403) return { erro: 'sempapel', corpo: corpo };
  if (!r.ok || !corpo.ok) return { erro: 'recusa', corpo: corpo };
  return { corpo: corpo };
}

// Os textos dos estados de rede, num lugar so. Nenhum deles mostra
// codigo, nome de endereco nem nome de configuracao: quem le e a Carla.
//
// `momento` diz o que estava acontecendo: 'leitura' quando a tela estava
// buscando, 'gravacao' quando estava salvando. A mesma queda de rede pede
// coisas diferentes nos dois casos, e mandar tentar salvar de novo o que
// nunca chegou a ser escrito e mandar a pessoa procurar um botao que nao
// existe.
function formFalhaDe(erro, corpo, momento) {
  const gravando = momento === 'gravacao';

  if (erro === 'rede') {
    return { tom: 'alerta', titulo: 'Não consegui falar com o servidor.',
      texto: 'O formulário mora no servidor, não neste navegador. Se você abriu este arquivo direto do ' +
        'computador, entre pelo endereço publicado. Se já estava nele, foi a rede que caiu' + (gravando
          ? '. O que você escreveu continua nesta tela e também ficou guardado neste navegador, então ' +
            'nada se perde: tente salvar de novo.'
          : ': volte a rede e peça para buscar de novo.') };
  }
  if (erro === 'banco') {
    return { tom: 'alerta',
      titulo: gravando ? 'Não consegui salvar agora.' : 'Não consegui trazer o formulário agora.',
      texto: 'O servidor respondeu, mas não alcançou o lugar onde o formulário fica guardado. Isso ' +
        'costuma passar sozinho em um minuto. O formulário que está no ar continua funcionando e ' +
        'recebendo' + (gravando
          ? '. O que você escreveu continua nesta tela e ficou guardado neste navegador: espere um ' +
            'pouco e tente de novo.'
          : ': espere um pouco e peça para buscar de novo.') };
  }
  if (erro === 'login') {
    return { tom: 'atencao', titulo: 'A sua entrada venceu.',
      texto: 'Recarregue esta página para entrar de novo. O que você escreveu ficou guardado neste ' +
        'navegador e volta quando você entrar.' };
  }
  if (erro === 'sempapel') {
    return { tom: 'info', titulo: 'Aqui você vê, mas não edita.',
      texto: 'Publicar uma versão nova das perguntas é de quem tem acesso de gestor. O formulário que ' +
        'está no ar continua funcionando e recebendo, e os números continuam à sua vista.' };
  }
  if (erro === 'sessao') {
    return { tom: 'atencao', titulo: 'A sua entrada venceu.',
      texto: 'Recarregue a página para entrar de novo com o seu e-mail e a sua senha.' };
  }
  // A frase do servidor e escrita para pessoa, e e ela que diz o que
  // fazer. O numero da resposta nao entra: numero nao explica nada para
  // quem le, e a explicacao ja veio junto.
  const dito = String((corpo && corpo.erro) || 'sem explicação').replace(/[.:;,\s]*$/, '');
  return { tom: 'alerta', titulo: 'O servidor recusou o pedido.',
    texto: 'Ele disse: "' + esc(dito) + '". Nada se perdeu: o formulário que está no ar continua como ' +
      'estava. Tente de novo e, se repetir, avise quem cuida da publicação.' };
}

function formParar(erro, corpo) {
  FORM.estado = 'erro';
  FORM.falha = formFalhaDe(erro, corpo, 'leitura');
  formDesenhar();
}

async function formCarregar() {
  FORM.estado = 'carregando';
  FORM.falha = null;
  FORM.recado = null;
  FORM.conflito = null;
  formDesenhar();

  const lista = await formPedir('/api/mesa/formulario');

  // Para quem nao publica, ver e seguro e escrever e que nao: a
  // tela cai para a definicao que a pagina publica le e desabilita tudo.
  // Essa definicao vem sem as perguntas fora do ar, sem o recado interno
  // e sem o campo da mesa de cada pergunta, e por isso ela so serve para
  // ler: `podada` e o que impede a tela de mostrar como verdade o que
  // ela nao recebeu.
  if (lista.erro === 'sempapel') {
    const publica = await formPedir('/api/formulario');
    FORM.soLeitura = true;
    FORM.falha = formFalhaDe('sempapel');
    if (publica.corpo && publica.corpo.formulario) {
      FORM.podada = true;
      FORM.def = formCopia(publica.corpo.formulario);
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

  if (lista.erro) { formParar(lista.erro, lista.corpo); return; }

  FORM.podada = false;
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
    const p = await formPedir('/api/mesa/formulario?versao=' + encodeURIComponent(FORM.atual));
    if (p.erro) { formParar(p.erro, p.corpo); return; }
    noAr = p.corpo.formulario || null;
  }

  let edicao = noAr;
  if (rascunho) {
    const p = await formPedir('/api/mesa/formulario?versao=' + encodeURIComponent(rascunho.versao));
    if (p.erro) { formParar(p.erro, p.corpo); return; }
    edicao = p.corpo.formulario || edicao;
  }

  // Nenhuma versao gravada por aqui ainda. O que esta no ar e o formulario
  // que entrou junto com o site, e ele e a versao zero: a lista de versoes
  // devolve essa definicao inteira quando nao ha nenhuma gravada, e a
  // versao zero tambem pode ser pedida pelo numero.
  //
  // Ela vem inteira de proposito, e nao pela porta da rua: pela porta da
  // rua a definicao chega sem o campo da mesa de cada pergunta, e a
  // primeira publicacao gravaria o formulario sem ninguem guardando o
  // nome, o e-mail e o WhatsApp de quem aplica.
  if (!edicao) {
    edicao = lista.corpo.formulario || null;
    if (!edicao) {
      const zero = await formPedir('/api/mesa/formulario?versao=0');
      if (zero.erro) { formParar(zero.erro, zero.corpo); return; }
      edicao = zero.corpo.formulario || null;
    }
    noAr = null;
  }

  if (!edicao) {
    formParar('recusa', { erro: 'o formulário voltou vazio' });
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

  const resposta = await formPedir('/api/mesa/formulario', {
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
    //
    // E ela vira a nova base na hora. Sem isso a proxima tentativa sairia
    // com o mesmo numero vencido e voltaria recusada do mesmo jeito, para
    // sempre: a pessoa juntaria as mudancas a mao e nunca conseguiria
    // publicar, sem nada na tela dizendo por que.
    const c = resposta.corpo || {};
    const nova = Number(c.atual || 0);
    const definicao = c.formulario || c.definicao || null;
    FORM.conflito = { versao: nova, definicao: definicao, partiuDe: Number(FORM.atual || 0) };
    if (definicao) {
      FORM.guardadas[nova] = definicao;
      FORM.noAr = formCopia(definicao);
      FORM.publicadoEm = definicao.publicado_em || FORM.publicadoEm;
      FORM.publicadoPor = definicao.publicado_por || null;
      // A versao nova ainda nao esta na lista que esta tela leu. Sem esta
      // linha, a tabela de versoes mostraria a antiga como a que esta no
      // ar enquanto o aviso diz o contrario.
      if (nova && !FORM.versoes.some(function (v) { return Number(v.versao) === nova; })) {
        FORM.versoes.push({
          versao: nova,
          criado_em: definicao.publicado_em || null,
          publicado_em: definicao.publicado_em || null,
          publicado_por: definicao.publicado_por || null,
          nota: definicao.nota || '',
          perguntas: (definicao.perguntas || []).length,
          respostas_recebidas: 0,
        });
      }
    }
    if (nova) FORM.atual = nova;
    // O bloco de confirmar sai da tela junto. Ele foi aberto para uma
    // publicacao que nao aconteceu, e a base mudou embaixo dele: deixar
    // aberto convida a apertar de novo sem reler o que o outro publicou.
    FORM.confirmando = false;
    formGuardarLocal();
    formDesenhar();
    formDizer('Não salvei: alguém publicou uma versão nova enquanto você editava. O que você escreveu ' +
      'continua nesta tela, e a próxima tentativa já parte da versão nova.');
    return;
  }

  if (resposta.erro) {
    // Recusa da conferencia do servidor vem com a frase dizendo qual
    // pergunta e por que. Ela e escrita para pessoa, entao vai inteira. O
    // titulo diz qual dos dois botoes foi apertado: quem clicou em
    // publicar e le que o rascunho falhou fica sem saber se publicou.
    if (resposta.erro === 'recusa') {
      FORM.recado = { tom: 'alerta',
        titulo: publicar ? 'Não publiquei.' : 'O rascunho não foi salvo.',
        texto: esc(String((resposta.corpo && resposta.corpo.erro) || 'o servidor não explicou o motivo')) +
          '. O que você escreveu continua nesta tela e ficou guardado neste navegador.' };
    } else {
      FORM.recado = formFalhaDe(resposta.erro, resposta.corpo, 'gravacao');
    }
    // O bloco de confirmar fecha: ele cobre a barra de acoes, e quem
    // precisa consertar alguma coisa antes de tentar de novo nao consegue
    // com ele aberto por cima.
    FORM.confirmando = false;
    formGuardarLocal();
    formDesenhar();
    formDizer(publicar
      ? 'Não consegui publicar agora. O aviso acima diz o que aconteceu.'
      : 'Não consegui salvar agora. O aviso acima diz o que aconteceu.');
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

    // O texto e cobrado de toda pergunta, esteja ela no ar ou nao: a
    // conferencia do servidor cobra do mesmo jeito, e antes de olhar se a
    // pergunta aparece. Cobrando so das que estao no ar, bastava tirar a
    // pergunta do ar para o impedimento sumir, o botao acender e a
    // gravacao voltar recusada.
    if (!t) {
      impede.push({ chave: p.chave, onde: 'titulo', resumo: 'A pergunta ' + (i + 1) + ' está sem texto.',
        texto: 'Escreva o que a pessoa lê. Pergunta sem texto não vai para o ar, e nem fica guardada ' +
          'em rascunho: tirar ela do ar não resolve.' });
    } else if (/^\d+$/.test(t)) {
      impede.push({ chave: p.chave, onde: 'titulo',
        resumo: 'A pergunta ' + (i + 1) + ' tem só números no texto.',
        texto: 'Escreva o que a pessoa lê. Um número sozinho não é pergunta para quem está do outro lado.' });
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

  const comNome = formPapelDe('nome');
  const comEmail = formPapelDe('email');
  const comZap = formPapelDe('whatsapp');
  const emailDesligado = formPerguntas().find(function (p) { return p.papel === 'email' && p.ativa === false; });

  // Os tres campos da mesa. Sem o nome, a lista de Ideias que chegaram
  // vira uma fila de gente sem nome e a busca por nome nao acha ninguem,
  // mesmo com a pessoa tendo escrito o nome dela. O servidor cobra os
  // tres, e a tela cobrava so dois: o formulario passava daqui e voltava
  // recusado de la.
  if (!comNome) {
    impede.push({ chave: null, onde: 'papel', resumo: 'Nenhuma pergunta está marcada como o nome.',
      texto: 'Nenhuma pergunta está marcada como o nome de quem aplica. Sem ela a aplicação chega à mesa ' +
        'sem nome, e a busca por nome não acha ninguém. Marque em alguma pergunta que ela vira o nome.' });
  }
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

  // O botao de volta do obrigado so leva para dentro do site. O servidor
  // recusa endereco de fora sem dizer nada: ele guardava o resto e jogava
  // o botao fora, a tela dizia que salvou, e o botao tinha sumido.
  const volta = String((((FORM.def || {}).agradecimento || {}).link || {}).url || '').trim();
  if (volta && !/^\/[\w\-/]{0,80}$/.test(volta)) {
    impede.push({ chave: null, onde: 'link',
      resumo: 'O botão de volta do obrigado aponta para fora do site.',
      texto: 'O botão de volta só leva para dentro do site, e o endereço começa com barra: escreva / ' +
        'para levar de volta à página inicial. Endereço de outro site não é aceito, e deixar vazio ' +
        'tira o botão.' });
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

// Aqui existia um botao que abria a pagina publica em outra aba para
// conferir o formulario inteiro. Ele saiu por dois motivos, e volta quando
// os dois estiverem resolvidos do outro lado:
//
// 1. a pagina publica nao le nenhum pedido de conferencia no endereco.
//    Ela busca sempre a versao publicada, entao o botao mostrava o
//    formulario velho justamente para quem tinha acabado de mudar ele;
// 2. cada abertura conta como visita de gente de fora. A equipe conferindo
//    tres vezes por dia entrava na conta de "vezes que a pagina foi
//    aberta" e derrubava a conta de quantos terminam, na aba do lado.
//
// Enquanto isso, a previa de cada pergunta, dentro dela, e o que mostra
// como a pessoa ve.

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
  const r = await formPedir('/api/mesa/formulario?versao=' + encodeURIComponent(n));
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
  const p = await formPedir('/api/mesa/formulario?versao=' + encodeURIComponent(versao));
  if (p.erro) {
    FORM.recado = formFalhaDe(p.erro, p.corpo, 'leitura');
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
  return '<div class="abas" role="tablist">' + abas.map(function (a) {
    const aberta = FORM.aba === a.k;
    return '<button class="aba" role="tab" aria-selected="' + (aberta ? 'true' : 'false') + '"' +
      ' onclick="formIrAba(\'' + a.k + '\')">' + esc(a.nome) + '</button>';
  }).join('') + '</div>';
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
  if (FORM.estado === 'erro') return '<span class="eti eti-alerta">Sem resposta</span>';
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

  // Antes havia aqui uma caixa azul dizendo "Você está vendo em leitura".
  // Para quem e colaborador ela aparecia sempre, em todo estado da tela, e
  // aviso que nunca some deixa de ser lido junto com os que importam. A
  // frase virou uma linha ao lado dos botoes apagados, em formBarraAcoesHtml,
  // que e onde a pessoa descobre que nao pode publicar.

  if (FORM.conflito) {
    html += '<div class="aviso aviso-atencao">' +
      '<b>Alguém publicou enquanto você editava.</b>' +
      '<p>A versão no ar agora é a ' + FORM.conflito.versao + ', e você começou a partir da ' +
      FORM.conflito.partiuDe + '. Nada se perdeu: veja o que mudou, junte com o que você escreveu e ' +
      'publique de novo. A próxima tentativa já parte da versão ' + FORM.conflito.versao + '.</p>' +
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

  // Quem nao publica nao precisa da lista do que impede publicar: para
  // quem le, ela apareceria em toda visita sem nada a fazer com ela.
  const impede = formPodeEditar() ? formImpedimentos() : [];
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
  // Depois de uma leitura que nao completou, a tela nao sabe mais qual e a
  // versao no ar: gravar a partir dai e publicar em cima de um numero que
  // pode nao existir mais. Primeiro buscar de novo, e o botao esta ao lado.
  const pode = formPodeEditar() && !FORM.salvando && FORM.estado !== 'erro';

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

  // Enquanto nada foi publicado por aqui, nao existe "mudou do que esta no
  // ar": a comparacao e com o nada e devolve zero sempre. Sem esta linha,
  // o primeiro dia terminava com o botao de publicar apagado e a edicao
  // pronta na tela, sem nenhuma frase dizendo por que.
  const primeiraVez = !FORM.atual;
  const podePublicar = pode && !impede.length && (mudouDoAr || FORM.temRascunho || primeiraVez);
  // O rascunho passa pela mesma conferencia do servidor que a publicacao:
  // deixar o botao aceso com a lista de impedimentos cheia era prometer
  // uma gravacao que volta recusada.
  const podeSalvar = pode && naTela && !impede.length;

  return '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:4px">' +
    '<button class="bt bt-marca bt-sm" onclick="formPedirPublicacao()"' + (podePublicar ? '' : ' disabled') + '>' +
      'Publicar</button>' +
    '<button class="bt bt-linha bt-sm" onclick="formSalvarRascunho()"' + (podeSalvar ? '' : ' disabled') + '>' +
      'Salvar rascunho</button>' +
    (FORM.estado === 'erro' ? formBuscarDeNovoHtml() : '') +
    (pode && naTela && impede.length
      ? '<span class="dica">O rascunho passa pela mesma conferência da publicação. Resolva o que está ' +
        'no aviso acima para guardar ele no servidor: o que você escreveu já está guardado neste ' +
        'navegador enquanto isso.</span>'
      : '') +
    // Ao lado dos dois botoes apagados, que e onde a pessoa descobre que
    // nao pode publicar. Antes isto era uma caixa azul no alto, que para
    // quem e colaborador aparecia em toda visita.
    (FORM.soLeitura && FORM.estado === 'ok' && !FORM.falha
      ? '<span class="dica">As perguntas da aplicação são decisão da gestão. ' +
        'Peça a mudança para quem tem esse acesso.</span>'
      : '') +
    '</div>';
}

// A saida de qualquer leitura que nao completou. Sem ele, a tela ficava
// parada ate a pessoa recarregar o navegador inteiro, e nenhuma frase
// dizia que era isso o que faltava fazer.
function formBuscarDeNovoHtml() {
  return '<button class="bt bt-linha bt-sm" onclick="formCarregar()"' +
    (FORM.estado === 'carregando' ? ' disabled' : '') + '>Buscar de novo</button>';
}

/* --------------------------------------------------- pergunta fechada */

function formEtiquetasDaPergunta(p) {
  const eti = [];
  eti.push('<span class="eti eti-neutra">' + esc(formNomeTipo(p.tipo)) + '</span>');
  // So a excecao ganha etiqueta.
  //
  // Como quase toda pergunta e obrigatoria, a etiqueta "obrigatoria"
  // aparecia em nove das nove linhas: nessa altura ela deixa de informar e
  // vira parte da moldura, e ainda gasta a cor azul que devia servir para
  // outra coisa. O que muda a leitura da lista e descobrir qual pergunta
  // da para pular, e essa e a que fica marcada.
  if (p.tipo !== 'recado' && !p.obrigatoria) {
    eti.push('<span class="eti eti-neutra">pode pular</span>');
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

    // Só "Abrir" fica na linha fechada.
    //
    // Antes havia Subir, Descer e Abrir em cada uma das nove, o que dava
    // vinte e sete botões do mesmo peso numa coluna. E Subir e Descer
    // faziam o que o seletor de posição, quatro centímetros à esquerda, já
    // fazia melhor: com ele dá para ir da nona para a segunda de uma vez,
    // e com os botões são sete cliques. A ordem se muda num lugar só.
    '<div style="display:flex;gap:6px;flex:none">' +
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
          ' aria-label="Opção ' + (i + 1) + ' de ' + esc(p.titulo || 'pergunta sem texto') + '"' +
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
        // Lido pela porta da rua, o formulario chega sem esta informacao.
        // Desenhar o seletor assim mostraria "nada em coluna propria" em
        // todas as perguntas, e isso e mentira, nao falta de dado.
        (FORM.podada
          ? '<p class="dica">Sem acesso de gestor, esta tela lê o formulário ' +
            'pela mesma porta de quem aplica, e por ela não vem o que cada resposta vira na lista da mesa.</p>'
          : '<select class="campo campo-sm"' + (p.tipo === 'recado' ? ' disabled' : trava) +
            ' onchange="formMudarPapel(\'' + chave + '\', this.value)">' +
            FORM_PAPEIS.map(function (x) {
              return '<option value="' + x.k + '"' + (x.k === (p.papel || '') ? ' selected' : '') + '>' +
                esc(x.nome) + '</option>';
            }).join('') + '</select>') +
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
    '<p class="dica" style="margin-top:6px">Em branco, a capa fica com a marca, o título e o botão.</p>' +

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
    '<p class="dica" style="margin-top:6px">O botão só leva para dentro do site, e o endereço começa ' +
    'com barra: escreva / para voltar à página inicial. Deixe os dois vazios para o obrigado não ter ' +
    'botão.</p>' +
    '<div id="form-erro-link">' + formErrosHtml(null, 'link') + '</div>' +
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
    return '<div class="cartao">' +
      '<p class="dica" style="margin-bottom:12px">O formulário vem do servidor, e a busca não ' +
      'completou. O aviso acima diz o que aconteceu. Nada foi perdido, porque nada chegou a ser ' +
      'editado: quando a rede voltar, peça para buscar de novo.</p>' +
      formBuscarDeNovoHtml() + '</div>';
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

/* O periodo imediatamente anterior, do mesmo tamanho. Trinta dias sao
   comparados com os trinta de antes; "este mes" com o mes passado inteiro
   ate o mesmo dia, que e a comparacao justa no meio do mes. */
function formIntervaloAnterior(i) {
  const dia = 864e5;
  const de = new Date(i.de + 'T00:00:00');
  const ate = new Date(i.ate + 'T00:00:00');
  const quantos = Math.round((ate - de) / dia) + 1;
  const anteriorAte = new Date(de.getTime() - dia);
  const anteriorDe = new Date(anteriorAte.getTime() - (quantos - 1) * dia);
  const iso = function (d) { return d.toISOString().slice(0, 10); };
  return { de: iso(anteriorDe), ate: iso(anteriorAte), dias: quantos };
}

async function formMedidasCarregar() {
  FORM.medEstado = 'carregando';
  FORM.medFalha = null;
  formDesenhar();

  const i = formIntervalo();
  const r = await formPedir('/api/mesa/metricas?de=' + i.de + '&ate=' + i.ate);

  // O periodo anterior, do mesmo tamanho e colado neste.
  //
  // Numero sozinho nao diz se esta bom: 110 aplicacoes num mes so vira
  // noticia ao lado das 84 do mes passado. E a conta que o painel do
  // Typeform faz e que faltava aqui. Vai num segundo pedido, e nao numa
  // consulta nova no servidor, porque a rota ja aceita as duas datas: se
  // este falhar, a tela desenha igual, so sem a comparacao.
  FORM.medAntes = null;
  if (!r.erro) {
    const antes = formIntervaloAnterior(i);
    const ra = await formPedir('/api/mesa/metricas?de=' + antes.de + '&ate=' + antes.ate);
    if (!ra.erro && ra.corpo && ra.corpo.ok) FORM.medAntes = ra.corpo;
  }

  if (r.erro) {
    FORM.medEstado = 'erro';
    FORM.medFalha = formFalhaDe(r.erro, r.corpo, 'leitura');
    // A frase de rede desta visao fala dos numeros, nao das perguntas.
    if (r.erro === 'rede') {
      FORM.medFalha.texto = 'Os números são contados no servidor, não neste navegador. Se você abriu este ' +
        'arquivo direto do computador, entre pelo endereço publicado. Se já estava nele, foi a rede que caiu: ' +
        'peça para buscar de novo.';
    }
    if (r.erro === 'banco') {
      FORM.medFalha.titulo = 'Não consegui trazer os números agora.';
      FORM.medFalha.texto = 'O servidor respondeu, mas não alcançou o lugar onde as contas ficam ' +
        'guardadas. Isso costuma passar sozinho em um minuto: espere um pouco e peça para buscar de ' +
        'novo. O formulário continua no ar e continua recebendo, e nenhuma conta se perde.';
    }
    // Esta frase e so para quem o papel nao alcanca. O lugar guardado fora
    // do ar tem a dele logo acima, e mandar procurar quem publica por um
    // problema que passa sozinho custa a tarde de alguem.
    if (r.erro === 'sempapel') {
      FORM.medFalha.texto = 'Os números são de quem tem acesso de gestor. O formulário continua no ar ' +
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
  const fa = (FORM.medAntes && FORM.medAntes.funil) || null;
  // Os três passos do funil, na ordem em que acontecem, cada um com o seu
  // ícone: quem chegou, quem começou, quem terminou.
  let html =
    formNumeroBloco(Number(f.abriu || 0), 'vezes que a página foi aberta', false, !f.abriu,
      fa ? formComparado(f.abriu, fa.abriu) : '', 'i-search', 'tom-info') +
    formNumeroBloco(Number(f.comecou || 0), 'passaram da primeira pergunta', false, !f.comecou,
      fa ? formComparado(f.comecou, fa.comecou) : '', 'i-spark', 'tom-atencao') +
    formNumeroBloco(Number(f.enviou || 0), 'terminaram e enviaram', true, !f.enviou,
      fa ? formComparado(f.enviou, fa.enviou) : '', 'i-check-c', 'tom-ok');
  const dez = formCadaDez(f.enviou, f.comecou);
  if (!poucos && dez !== null) {
    html += formNumeroBloco(dez + ' de cada 10', 'de quem começa, termina', false, !dez,
      '', 'i-trend', 'tom-marca');
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

/* ---------------------------------------------------------------------
   Dia a dia, em linha.

   Era um espeto de barras de cinco pixels: com trinta dias na tela ficava
   um pente, e a unica forma de ler um dia era parar o mouse em cima e
   esperar o balao do navegador. Linha com area embaixo mostra a FORMA do
   periodo, que e o que se quer saber de um grafico de dias: se esta
   subindo, se caiu numa semana, onde foi o pico.

   Duas linhas: quem abriu, mais apagada, e quem terminou, no laranja da
   casa. A distancia entre as duas E a taxa de conclusao, desenhada.

   SVG escrito a mao, e nao biblioteca de grafico: o sistema e um arquivo
   so, sem requisicao a terceiros, e uma biblioteca de grafico pesa mais
   que a tela inteira. Sao trinta linhas.
   --------------------------------------------------------------------- */

/* O desenho ocupa a caixa inteira: os números do eixo e as datas moram
   FORA do SVG, em HTML.

   Dentro dele, não: o SVG estica na horizontal para caber na largura da
   tela (preserveAspectRatio="none"), e o texto estica junto, uns 40% numa
   tela de 1440. As linhas escapam disso com vector-effect; letra, não. */
const FORM_GRAF = { l: 0, r: 0, t: 8, b: 8, alt: 200, larg: 900 };

function formCaminho(dias, campo, topo, fechar) {
  const g = FORM_GRAF;
  const larguraUtil = g.larg - g.l - g.r;
  const alturaUtil = g.alt - g.t - g.b;
  const passo = dias.length > 1 ? larguraUtil / (dias.length - 1) : 0;
  const pontos = dias.map(function (d, i) {
    const v = Number(d[campo] || 0);
    return [g.l + i * passo, g.t + alturaUtil - (v / topo) * alturaUtil];
  });
  let caminho = pontos.map(function (pt, i) {
    return (i ? 'L' : 'M') + pt[0].toFixed(1) + ' ' + pt[1].toFixed(1);
  }).join(' ');
  if (fechar) {
    caminho += ' L' + (g.l + larguraUtil).toFixed(1) + ' ' + (g.t + alturaUtil) +
               ' L' + g.l + ' ' + (g.t + alturaUtil) + ' Z';
  }
  return { d: caminho, pontos: pontos };
}

function formMedDiaHtml() {
  const dias = Array.isArray(FORM.med.por_dia) ? FORM.med.por_dia : [];
  if (dias.length < 2) return '';

  const g = FORM_GRAF;
  const alturaUtil = g.alt - g.t - g.b;
  const topoBruto = Math.max.apply(null, dias.map(function (d) { return Number(d.abriu || 0); }).concat([1]));
  // Um teto redondo: eixo que termina em 37 não se lê de relance.
  const passoDaEscala = Math.max(1, Math.pow(10, Math.floor(Math.log10(topoBruto))) / 2);
  const topo = Math.ceil(topoBruto / passoDaEscala) * passoDaEscala;

  const abriu = formCaminho(dias, 'abriu', topo, false);
  const enviouArea = formCaminho(dias, 'enviou', topo, true);
  const enviou = formCaminho(dias, 'enviou', topo, false);

  const maior = dias.reduce(function (a, b) {
    return Number(b.enviou || 0) > Number(a.enviou || 0) ? b : a;
  }, dias[0]);
  const iMaior = dias.indexOf(maior);

  // Quatro linhas de grade. O número de cada uma fica em HTML, na coluna
  // à esquerda do desenho.
  let grade = '';
  let escada = '';
  for (let i = 0; i <= 3; i++) {
    const y = g.t + (alturaUtil / 3) * i;
    const valor = Math.round(topo - (topo / 3) * i);
    grade += '<line x1="0" y1="' + y.toFixed(1) + '" x2="' + g.larg +
      '" y2="' + y.toFixed(1) + '" stroke="var(--fio-2)" stroke-dasharray="3 6"/>';
    escada += '<span style="top:' + ((y / g.alt) * 100).toFixed(2) + '%">' + valor + '</span>';
  }

  const meio = Math.floor(dias.length / 2);

  const svg =
    '<svg viewBox="0 0 ' + g.larg + ' ' + g.alt + '" preserveAspectRatio="none" ' +
      'class="graf" id="form-graf" role="img" ' +
      'aria-label="Quantas pessoas abriram e quantas terminaram, dia a dia">' +
      '<defs><linearGradient id="grafArea" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0%" stop-color="var(--o)" stop-opacity=".28"/>' +
        '<stop offset="100%" stop-color="var(--o)" stop-opacity="0"/>' +
      '</linearGradient></defs>' +
      grade +
      '<path d="' + enviouArea.d + '" fill="url(#grafArea)"/>' +
      '<path d="' + abriu.d + '" fill="none" stroke="var(--tx-4)" stroke-width="1.5" ' +
        'stroke-dasharray="4 4" vector-effect="non-scaling-stroke"/>' +
      '<path d="' + enviou.d + '" fill="none" stroke="var(--o)" stroke-width="2.5" ' +
        'stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>' +
      // O pico ganha ponto e fio, que e o unico dia que se aponta sozinho.
      '<line x1="' + enviou.pontos[iMaior][0].toFixed(1) + '" y1="' + g.t +
        '" x2="' + enviou.pontos[iMaior][0].toFixed(1) + '" y2="' + (g.t + alturaUtil) +
        '" stroke="var(--o-35)" stroke-dasharray="3 3"/>' +
      '<circle cx="' + enviou.pontos[iMaior][0].toFixed(1) + '" cy="' + enviou.pontos[iMaior][1].toFixed(1) +
        '" r="4.5" fill="var(--o)" stroke="var(--fundo-2)" stroke-width="2"/>' +
      // A linha que segue o mouse, e o ponto que ela acende.
      '<line id="form-graf-fio" x1="0" y1="' + g.t + '" x2="0" y2="' + (g.t + alturaUtil) +
        '" stroke="var(--tx-3)" stroke-dasharray="3 3" opacity="0"/>' +
      '<circle id="form-graf-ponto" r="4.5" fill="var(--o)" stroke="var(--fundo-2)" ' +
        'stroke-width="2" opacity="0"/>' +
    '</svg>';

  return '<div class="cartao">' +
    '<div class="cartao-t">Dia a dia' +
      '<span class="graf-legenda">' +
        '<span class="graf-chave"><i class="cheia"></i>terminaram</span>' +
        '<span class="graf-chave"><i class="tracejada"></i>abriram</span>' +
      '</span>' +
    '</div>' +
    '<div class="graf-linha">' +
      '<div class="graf-eixo">' + escada + '</div>' +
      '<div class="graf-caixa" id="form-graf-caixa">' + svg +
        '<div class="graf-balao" id="form-graf-balao" hidden></div>' +
      '</div>' +
    '</div>' +
    '<div class="graf-datas">' +
      '<span>' + esc(dataCurta(dias[0].dia)) + '</span>' +
      '<span>' + esc(dataCurta(dias[meio].dia)) + '</span>' +
      '<span>' + esc(dataCurta(dias[dias.length - 1].dia)) + '</span>' +
    '</div>' +
    '<p class="dica" style="margin-top:10px">O dia mais cheio foi ' +
      esc(dataCurta(maior.dia)) + ', com ' + Number(maior.enviou || 0) + '. ' +
      'Passe o mouse na linha para ver um dia. ' +
      'A conta de cada 10 só aparece no total do período: em um dia só, duas pessoas mudam tudo.</p>' +
  '</div>';
}

/* O balão que segue o mouse.

   Ligado depois de o SVG estar na tela. O x do mouse vira índice pela
   regra de três do próprio desenho, e não por procurar o ponto mais
   perto: com trinta dias os dois dão o mesmo resultado e a conta direta
   é uma linha. */
function formGrafLigar() {
  const caixa = porId('form-graf-caixa');
  const svg = porId('form-graf');
  const balao = porId('form-graf-balao');
  const fio = porId('form-graf-fio');
  const ponto = porId('form-graf-ponto');
  if (!caixa || !svg || !balao || caixa.dataset.ligado === '1') return;
  caixa.dataset.ligado = '1';

  const dias = Array.isArray(FORM.med.por_dia) ? FORM.med.por_dia : [];
  if (dias.length < 2) return;
  const g = FORM_GRAF;
  const topoBruto = Math.max.apply(null, dias.map(function (d) { return Number(d.abriu || 0); }).concat([1]));
  const passoDaEscala = Math.max(1, Math.pow(10, Math.floor(Math.log10(topoBruto))) / 2);
  const topo = Math.ceil(topoBruto / passoDaEscala) * passoDaEscala;
  const alturaUtil = g.alt - g.t - g.b;

  const mover = function (ev) {
    const r = caixa.getBoundingClientRect();
    const dentro = (ev.clientX - r.left) / r.width;          // 0 a 1 na caixa
    const util = (dentro * g.larg - g.l) / (g.larg - g.l - g.r);
    const i = Math.max(0, Math.min(dias.length - 1, Math.round(util * (dias.length - 1))));
    const d = dias[i];

    const xSvg = g.l + (i / (dias.length - 1)) * (g.larg - g.l - g.r);
    const ySvg = g.t + alturaUtil - (Number(d.enviou || 0) / topo) * alturaUtil;
    if (fio) { fio.setAttribute('x1', xSvg); fio.setAttribute('x2', xSvg); fio.setAttribute('opacity', '1'); }
    if (ponto) { ponto.setAttribute('cx', xSvg); ponto.setAttribute('cy', ySvg); ponto.setAttribute('opacity', '1'); }

    balao.hidden = false;
    balao.innerHTML = '<b>' + esc(dataCurta(d.dia)) + '</b>' +
      '<span><i class="cheia"></i>' + Number(d.enviou || 0) + ' terminaram</span>' +
      '<span><i class="tracejada"></i>' + Number(d.abriu || 0) + ' abriram</span>';
    // O balão não sai da caixa: perto da borda direita ele vira para a esquerda.
    const xTela = (xSvg / g.larg) * r.width;
    balao.style.left = Math.max(4, Math.min(r.width - balao.offsetWidth - 4, xTela - balao.offsetWidth / 2)) + 'px';
  };

  const sair = function () {
    balao.hidden = true;
    if (fio) fio.setAttribute('opacity', '0');
    if (ponto) ponto.setAttribute('opacity', '0');
  };

  caixa.addEventListener('mousemove', mover);
  caixa.addEventListener('mouseleave', sair);
  // No telefone não há mouse: o toque acende o dia e o próximo apaga.
  caixa.addEventListener('touchstart', function (ev) {
    if (ev.touches && ev.touches[0]) mover(ev.touches[0]);
  }, { passive: true });
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

/* Baixar os numeros em planilha.

   E a unica coisa que o painel pago do Typeform faz e que aqui nao dava
   para fazer: levar o periodo inteiro para uma planilha e cruzar com o que
   a casa quiser. Sai um arquivo de texto separado por ponto e virgula, que
   o Excel e o Google Planilhas abrem em portugues sem perguntar nada.

   Ponto e virgula, e nao virgula: o Excel em portugues le a virgula como
   separador decimal, e um arquivo com virgula chega com tudo numa coluna
   so. O BOM no comeco e o que faz acento aparecer certo no Excel. */
function formCsvCampo(v) {
  const t = String(v === null || v === undefined ? '' : v);
  return /[";\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
}

function formCsvLinhas(linhas) {
  return linhas.map(function (l) { return l.map(formCsvCampo).join(';'); }).join('\r\n');
}

function formBaixarNumeros() {
  const m = FORM.med;
  if (!m) return;
  const f = m.funil || {};
  const l = [];

  l.push(['O formulário, de ' + m.de + ' a ' + m.ate]);
  l.push([]);
  l.push(['O funil']);
  l.push(['medida', 'quantas']);
  l.push(['abriram a página', f.abriu || 0]);
  l.push(['passaram da primeira pergunta', f.comecou || 0]);
  l.push(['chegaram a conferir', f.revisou === null ? 'não medido neste período' : f.revisou]);
  l.push(['terminaram e enviaram', f.enviou || 0]);
  l.push([]);

  if ((m.perguntas || []).length) {
    l.push(['Pergunta a pergunta']);
    l.push(['pergunta', 'chegaram', 'responderam', 'pararam aqui', 'segundos, mediana']);
    m.perguntas.forEach(function (p) {
      l.push([p.titulo || p.chave, p.viu || 0, p.respondeu || 0,
        Number(p.viu || 0) - Number(p.respondeu || 0),
        p.mediana_ms ? Math.round(p.mediana_ms / 1000) : '']);
    });
    l.push([]);
  }

  if ((m.por_dia || []).length) {
    l.push(['Dia a dia']);
    l.push(['dia', 'abriram', 'começaram', 'terminaram']);
    m.por_dia.forEach(function (d) { l.push([d.dia, d.abriu || 0, d.comecou || 0, d.enviou || 0]); });
    l.push([]);
  }

  if ((m.por_origem || []).length) {
    l.push(['De onde vieram']);
    l.push(['origem', 'abriram', 'terminaram']);
    m.por_origem.forEach(function (o) { l.push([o.origem || 'sem origem', o.visitas || 0, o.enviou || 0]); });
    l.push([]);
  }

  if ((m.por_aparelho || []).length) {
    l.push(['Aparelho']);
    l.push(['aparelho', 'abriram', 'terminaram']);
    m.por_aparelho.forEach(function (a) { l.push([a.aparelho || 'desconhecido', a.visitas || 0, a.enviou || 0]); });
  }

  formBaixarArquivo('formulario-' + m.de + '-a-' + m.ate + '.csv', formCsvLinhas(l));
}

/* O download em si. O \ufeff da frente e o BOM: sem ele o Excel abre o
   arquivo em latin-1 e "aplicações" vira "aplicaÃ§Ãµes". */
function formBaixarArquivo(nome, texto) {
  const blob = new Blob(['\ufeff' + texto], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nome;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
}

function formCorpoMedidas() {
  const botoes = '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px">' +
    FORM_PERIODOS.map(function (p) {
      return '<button class="bt bt-sm ' + (FORM.periodo === p.k ? 'bt-marca' : 'bt-linha') +
        '" onclick="formMedPeriodo(\'' + p.k + '\')">' + esc(p.nome) + '</button>';
    }).join('') +
    '<button class="bt bt-linha bt-sm" onclick="formMedidasCarregar()"' +
      (FORM.medEstado === 'carregando' ? ' disabled' : '') + '>Buscar de novo</button>' +
    (FORM.med && FORM.medEstado === 'ok'
      ? '<button class="bt bt-linha bt-sm" id="form-bt-baixar" onclick="formBaixarNumeros()">Baixar em planilha</button>'
      : '') +
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
  escrever('form-erro-link', formErrosHtml(null, 'link'));

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
    // O gráfico só existe depois de o corpo estar na tela.
    formGrafLigar();
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

   a. Esta tela le a definicao completa em GET /api/mesa/formulario,
      com e sem ?versao=N, porque a rota publica vem podada e o editor
      precisa da pergunta desligada, do recado interno e do papel de cada
      pergunta.

   b. Com a tabela de versoes vazia, a tela edita a definicao de fabrica
      inteira: ou a que a lista de versoes devolve junto da lista vazia,
      ou a que ?versao=0 entrega. Ela NUNCA edita o que vem pela porta da
      rua, porque de la a definicao chega sem o papel de cada pergunta, e
      a primeira publicacao gravaria o formulario sem ninguem guardando o
      nome, o e-mail e o WhatsApp de quem aplica. A gravacao continua
      partindo de base_versao 0.

   c. A recusa por versao vencida (409) e lida como
      { atual: N, formulario: {...} }. Se a rota devolver a definicao com
      outro nome, esta tela tambem aceita "definicao". A definicao vem
      junto de proposito: alem de mostrar o que mudou, ela vira a nova
      base da tela, senao a tentativa seguinte sai com o mesmo numero
      vencido e volta recusada para sempre.

   d. O 503 do banco vem com motivo "banco", e o 403 do papel vem sozinho.
      Sem essa separacao os dois voltam a ser lidos como a mesma coisa, e
      quem esta com o lugar guardado fora do ar sai atras de uma permissao
      que ja tem, por um problema que passa sozinho.

   e. Nao existe botao de abrir a pagina publica para conferir. Ele volta
      quando a pagina souber duas coisas: abrir o rascunho no lugar da
      versao publicada, e nao contar a visita da equipe como visita de
      gente de fora. Hoje ela nao le nada disso do endereco.
   ===================================================================== */
