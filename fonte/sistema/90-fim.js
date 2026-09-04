/* =====================================================================
   A entrada: e-mail e senha.

   Ate 01/09 quem trancava o endereco era o Cloudflare Access, e a tela de
   entrada era a dele. A Carla queria a porta da casa, com a marca da casa,
   entao a conferencia mudou de lugar: quem diz se a senha confere agora e
   o servidor, no src/porta.js, e nao este arquivo.

   Isso e mais que estetica. Antes, a senha daqui era conferida DENTRO do
   navegador, contra uma lista que morava no navegador: ela dizia quem era
   a pessoa e nada mais, e cada computador tinha a sua lista. Agora a lista
   e uma so, cadastrar alguem vale em todo lugar, e a senha protege de
   verdade, porque quem confere esta do outro lado.

   Tres telas, e o servidor decide qual:

   1. CASA VAZIA. Ninguem cadastrado ainda: a porta pede para criar a
      primeira gestora. Sistema que abre vazio e deixa entrar sem dizer
      quem voce e nao tem como separar papel nenhum depois.

   2. ENTRAR. E-mail e senha.

   3. TROCAR A SENHA. Quem foi cadastrada por outra pessoa recebeu a
      primeira senha de mao beijada, e troca antes de ver qualquer tela.
      Senha que andou por WhatsApp nao pode ficar valendo para sempre.
   ===================================================================== */

async function pedirPorta(caminho, corpo) {
  try {
    const opcoes = { method: corpo ? 'POST' : 'GET', headers: cabecalhos(), cache: 'no-store' };
    if (corpo) {
      opcoes.headers['content-type'] = 'application/json';
      opcoes.body = JSON.stringify(corpo);
    }
    const r = await fetch(caminho, opcoes);
    let dados = null;
    try { dados = await r.json(); } catch (e) { dados = null; }
    return { status: r.status, corpo: dados };
  } catch (e) {
    return { status: 0, corpo: null };
  }
}

function pintarPorta(titulo, texto_, corpo) {
  escrever('porta-titulo', titulo);
  texto('porta-texto', texto_);
  escrever('porta-corpo', corpo);
}

const erroDaPorta = (msg, dica) =>
  escrever('portaErro', aviso('alerta', msg, dica || 'Corrija e tente de novo.'));

/* ---------------------------------------------------------------------
   Os campos da porta.

   Icone dentro do campo e o olho na senha. O olho existe porque digitar
   senha as cegas erra, e quem errou tres vezes comeca a achar que a senha
   esta errada quando o que estava errado era o Caps Lock. Ele nasce
   fechado: mostrar por padrao seria mostrar a senha para quem passa atras.
   --------------------------------------------------------------------- */
const ICONES_DA_PORTA = {
  email: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
    'stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="4.5" width="19" height="15" rx="2"/>' +
    '<path d="m3 6.5 9 6.5 9-6.5"/></svg>',
  senha: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
    'stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="10.5" width="16" height="10" rx="2"/>' +
    '<path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/></svg>',
  nome: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
    'stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3.4"/>' +
    '<path d="M4.5 20a7.5 7.5 0 0 1 15 0"/></svg>',
};

const OLHO_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true">' +
    '<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z"/>' +
    '<circle cx="12" cy="12" r="2.6"/>' +
    '<path class="risco" d="M4 20 20 4"/>' +
  '</svg>';

/* Um campo. `tipo` e 'email', 'senha' ou 'nome', e so o de senha ganha
   olho. O rotulo vem sempre: campo sem rotulo obriga a pessoa a adivinhar
   pelo texto de dentro, que some quando ela comeca a escrever. */
function campoDaPorta(id, tipo, rotulo, extras) {
  const e = extras || {};
  const ehSenha = tipo === 'senha';
  const auto = e.auto || (tipo === 'email' ? 'username' : ehSenha ? 'current-password' : 'name');
  return '<label class="rotulo" for="' + id + '"' +
      (e.espaco ? ' style="margin-top:14px"' : '') + '>' + esc(rotulo) + '</label>' +
    '<span class="campo-com-icone' + (ehSenha ? ' tem-olho' : '') + '">' +
      '<input class="campo" id="' + id + '" type="' + (ehSenha ? 'password' : tipo === 'email' ? 'email' : 'text') + '"' +
        ' autocomplete="' + auto + '"' +
        (e.dica ? ' placeholder="' + esc(e.dica) + '"' : '') +
        (e.aoEnter ? ' onkeydown="if(event.key===\'Enter\'){' + e.aoEnter + '}"' : '') + '>' +
      '<span class="ic-campo">' + ICONES_DA_PORTA[tipo] + '</span>' +
      (ehSenha
        ? '<button type="button" class="olho" aria-pressed="false" aria-label="Mostrar a senha" ' +
          'title="Mostrar a senha" onclick="alternarOlho(this)">' + OLHO_SVG + '</button>'
        : '') +
    '</span>';
}

function alternarOlho(botao) {
  const campo = botao.parentNode.querySelector('.campo');
  if (!campo) return;
  const mostrando = campo.type === 'text';
  campo.type = mostrando ? 'password' : 'text';
  botao.setAttribute('aria-pressed', mostrando ? 'false' : 'true');
  const rotulo = mostrando ? 'Mostrar a senha' : 'Esconder a senha';
  botao.setAttribute('aria-label', rotulo);
  botao.title = rotulo;
  // O cursor volta para o campo, no fim do que ja foi digitado: quem
  // clicou no olho quer conferir e continuar escrevendo, nao recomecar.
  campo.focus();
  const fim = campo.value.length;
  try { campo.setSelectionRange(fim, fim); } catch (e) {}
}

// Embaralhar a senha leva uns 100 ms num computador e pode passar de meio
// segundo num telefone antigo. Sem trocar o texto do botao, esse tempo
// parece clique que nao pegou, e a pessoa clica de novo.
function ocupada(idDoBotao, sim, texto_) {
  const b = porId(idDoBotao);
  if (!b) return;
  b.disabled = !!sim;
  b.style.opacity = sim ? '.6' : '';
  if (texto_) b.textContent = sim ? texto_ + '...' : texto_;
}

// De quem e a senha que esta sendo trocada. O sal da prova sai do e-mail,
// entao a tela de trocar precisa saber qual e.
let PORTA_EMAIL = null;

function entrar(pessoa) {
  EU.id = pessoa.id;
  EU.papel = pessoa.papel;
  EU.email = pessoa.email || null;
  EU.nome = pessoa.nome || (pessoa.email ? String(pessoa.email).split('@')[0] : 'sem nome');

  porId('porta').hidden = true;
  porId('app').hidden = false;
  porId('app').classList.toggle('sozinho', pessoa.papel === 'cliente');

  const p = porChave(PAPEIS, pessoa.papel);
  texto('quem-nome', EU.nome);
  texto('quem-papel', p ? p.nome : pessoa.papel);
  texto('quem-iniciais', String(EU.nome).trim().split(/\s+/).slice(0, 2)
    .map(function (x) { return x[0]; }).join('').toUpperCase());

  montarMenu();
  irPara((PERMISSOES[pessoa.papel] || ['cliente'])[0]);

  // A lista da equipe vem depois de a tela ja estar de pe: ela so serve
  // para escrever nomes em telas de trabalho, e esperar por ela atrasaria
  // a abertura por nada.
  if (pessoa.papel !== 'cliente') carregarEquipe();

  // A batida do coracao. Ela so faz pedido com a aba na frente e com uma
  // tela ao vivo aberta, entao ligar aqui nao custa nada para quem entra
  // numa tela que mora no navegador.
  if (pessoa.papel !== 'cliente') aoVivoComecar();
}

/* ---------------------------------------------------------------- entrar */

async function portaEntrar() {
  const email = String((porId('portaEmail') || {}).value || '').trim();
  const senha = String((porId('portaSenha') || {}).value || '');

  if (!email || email.indexOf('@') < 0) { erroDaPorta('Escreva o seu e-mail.'); return; }
  if (!senha) { erroDaPorta('Escreva a sua senha.'); return; }

  ocupada('portaBotao', true, 'Conferindo');
  escrever('portaErro', '');
  const r = await pedirPorta('/entrar', {
    email: email,
    prova: await provaDaSenha(email, senha),
  });
  ocupada('portaBotao', false, 'Entrar');

  if (r.status === 0) {
    erroDaPorta('Não consegui falar com o servidor.',
      'A senha é conferida no servidor, então sem ele não dá para entrar. Tente de novo em instantes.');
    return;
  }
  if (!r.corpo || !r.corpo.ok) {
    const campo = porId('portaSenha');
    if (campo) { campo.value = ''; campo.focus(); }
    erroDaPorta(r.corpo && r.corpo.erro ? primeiraMaiuscula(r.corpo.erro) : 'Não consegui entrar.',
      r.corpo && r.corpo.freado
        ? 'Isso protege a sua conta de quem fica tentando senha.'
        : 'Se você esqueceu a senha, quem é gestor define uma nova em "A casa".');
    return;
  }

  if (r.corpo.eu.precisa_trocar) { portaTelaTrocar(r.corpo.eu); return; }
  entrar(r.corpo.eu);
}

function portaTelaEntrar(avisoTopo) {
  pintarPorta(
    'Bem-vinda de <b>volta</b>',
    'Entre com o seu e-mail e a sua senha.',
    (avisoTopo || '') +
    '<div id="portaErro"></div>' +
    campoDaPorta('portaEmail', 'email', 'E-mail',
      { dica: 'o e-mail que você usa aqui', aoEnter: "porId('portaSenha').focus()" }) +
    campoDaPorta('portaSenha', 'senha', 'Senha',
      { espaco: true, aoEnter: 'portaEntrar()' }) +
    '<button class="bt bt-marca" id="portaBotao" style="width:100%;justify-content:center;margin-top:18px" ' +
      'onclick="portaEntrar()">Entrar</button>' +
    '<p class="dica" style="margin-top:16px">Esqueceu a senha? Quem é gestor define uma nova para você.</p>');

  const campo = porId('portaEmail');
  if (campo) campo.focus();
}

/* ---------------------------------------------------------------- primeiro dia */

async function portaCriarPrimeiro() {
  const nome = String((porId('portaNome') || {}).value || '').trim();
  const email = String((porId('portaEmail') || {}).value || '').trim();
  const senha = String((porId('portaSenha') || {}).value || '');
  const repete = String((porId('portaSenha2') || {}).value || '');

  const erro = !nome ? 'Escreva o seu nome.'
    : (!email || email.indexOf('@') < 0) ? 'Escreva um e-mail válido.'
    : senha.length < SENHA_MINIMA ? 'A senha precisa de pelo menos ' + SENHA_MINIMA + ' caracteres.'
    : senha !== repete ? 'As duas senhas não são iguais.'
    : null;
  if (erro) { erroDaPorta(erro); return; }

  ocupada('portaBotao', true, 'Criando');
  escrever('portaErro', '');
  const r = await pedirPorta('/primeiro-acesso', {
    nome: nome, email: email,
    prova: await provaDaSenha(email, senha),
  });
  ocupada('portaBotao', false, 'Criar meu acesso');

  if (r.status === 0) {
    erroDaPorta('Não consegui falar com o servidor.', 'Tente de novo em instantes.');
    return;
  }
  if (!r.corpo || !r.corpo.ok) {
    erroDaPorta(r.corpo && r.corpo.erro ? primeiraMaiuscula(r.corpo.erro) : 'Não consegui criar o acesso.');
    return;
  }
  entrar(r.corpo.eu);
}

function portaTelaPrimeiro(avisoTopo) {
  pintarPorta(
    'Este sistema é <b>seu</b>',
    'Crie o seu acesso de gestor. Depois você cadastra o resto da equipe por dentro.',
    (avisoTopo || '') +
    '<div id="portaErro"></div>' +
    campoDaPorta('portaNome', 'nome', 'Seu nome', { dica: 'Como você aparece para a equipe' }) +
    campoDaPorta('portaEmail', 'email', 'Seu e-mail', { espaco: true, dica: 'é por ele que você vai entrar' }) +
    campoDaPorta('portaSenha', 'senha', 'Senha',
      { espaco: true, auto: 'new-password', dica: 'pelo menos ' + SENHA_MINIMA + ' caracteres' }) +
    campoDaPorta('portaSenha2', 'senha', 'Repita a senha',
      { espaco: true, auto: 'new-password', aoEnter: 'portaCriarPrimeiro()' }) +
    '<button class="bt bt-marca" id="portaBotao" style="width:100%;justify-content:center;margin-top:18px" ' +
      'onclick="portaCriarPrimeiro()">Criar meu acesso</button>' +
    '<p class="dica" style="margin-top:16px">A senha fica guardada no servidor, embaralhada. Nem eu consigo ler ela de volta.</p>');

  const campo = porId('portaNome');
  if (campo) campo.focus();
}

/* ---------------------------------------------------------------- trocar a senha */

async function portaTrocar() {
  const atual = String((porId('portaAtual') || {}).value || '');
  const nova = String((porId('portaNova') || {}).value || '');
  const repete = String((porId('portaNova2') || {}).value || '');

  const erro = !atual ? 'Escreva a senha que você recebeu.'
    : nova.length < SENHA_MINIMA ? 'A senha nova precisa de pelo menos ' + SENHA_MINIMA + ' caracteres.'
    : nova !== repete ? 'As duas senhas novas não são iguais.'
    : null;
  if (erro) { erroDaPorta(erro); return; }

  ocupada('portaBotao', true, 'Guardando');
  escrever('portaErro', '');
  const r = await pedirPorta('/minha-senha', {
    atual: await provaDaSenha(PORTA_EMAIL, atual),
    nova: await provaDaSenha(PORTA_EMAIL, nova),
  });
  ocupada('portaBotao', false, 'Guardar e entrar');

  if (r.status === 0) {
    erroDaPorta('Não consegui falar com o servidor.', 'Tente de novo em instantes.');
    return;
  }
  if (!r.corpo || !r.corpo.ok) {
    erroDaPorta(r.corpo && r.corpo.erro ? primeiraMaiuscula(r.corpo.erro) : 'Não consegui trocar a senha.');
    return;
  }
  abrirPorta();
}

function portaTelaTrocar(pessoa) {
  PORTA_EMAIL = pessoa.email;
  pintarPorta(
    'Escolha a sua <b>senha</b>',
    'A senha que você recebeu serve uma vez só. A partir de agora é a sua.',
    aviso('info', esc(pessoa.email), 'Ninguém mais vai saber a senha que você escolher agora.') +
    '<div id="portaErro"></div>' +
    campoDaPorta('portaAtual', 'senha', 'A senha que você recebeu') +
    campoDaPorta('portaNova', 'senha', 'Sua senha nova',
      { espaco: true, auto: 'new-password', dica: 'pelo menos ' + SENHA_MINIMA + ' caracteres' }) +
    campoDaPorta('portaNova2', 'senha', 'Repita a senha nova',
      { espaco: true, auto: 'new-password', aoEnter: 'portaTrocar()' }) +
    '<button class="bt bt-marca" id="portaBotao" style="width:100%;justify-content:center;margin-top:18px" ' +
      'onclick="portaTrocar()">Guardar e entrar</button>');

  const campo = porId('portaAtual');
  if (campo) campo.focus();
}

/* ---------------------------------------------------------------- abertura */

async function abrirPorta() {
  pintarPorta('Entrando no <b>sistema</b>', 'Conferindo o seu acesso.', '');

  const r = await pedirPorta('/eu');

  // Sem servidor nao ha porta. Antes dava para entrar assim mesmo, porque a
  // senha era conferida aqui dentro; agora quem confere esta do outro lado,
  // e fingir que entrou so adiaria a descoberta para a primeira tela.
  if (r.status === 0 || !r.corpo || !r.corpo.ok) {
    pintarPorta(
      'Não consegui falar com o <b>servidor</b>',
      'A sua senha é conferida no servidor, então sem ele não dá para entrar.',
      aviso('alerta', 'Pode ser a sua internet, ou o site ainda subindo.',
        'Se você abriu este arquivo direto do computador, entre pelo endereço publicado, em ideiaquevende.com.br/sistema/.') +
      '<button class="bt bt-linha" style="width:100%;justify-content:center;margin-top:14px" ' +
        'onclick="abrirPorta()">Tentar de novo</button>');
    return;
  }

  REGRAS_DA_PROVA = r.corpo.regras || null;
  if (!REGRAS_DA_PROVA) {
    pintarPorta(
      'O servidor respondeu <b>diferente</b> do esperado',
      'Não recebi a regra de embaralhar a senha, e sem ela não dá para entrar com segurança.',
      aviso('alerta', 'Isso costuma ser publicação pela metade.',
        'Recarregue em um minuto. Se continuar, o site precisa ser publicado de novo.'));
    return;
  }

  if (r.corpo.casa_vazia) { portaTelaPrimeiro(); return; }
  if (!r.corpo.entrou) { portaTelaEntrar(); return; }
  if (r.corpo.eu.precisa_trocar) { portaTelaTrocar(r.corpo.eu); return; }
  entrar(r.corpo.eu);
}

/* ---------------------------------------------------------------------
   O cartao acompanha o mouse.

   Inclinacao de poucos graus, calculada da posicao do ponteiro dentro do
   proprio cartao. E o unico movimento da tela que responde a pessoa, e e
   o que faz o vidro parecer vidro em vez de retangulo escuro.

   No toque nao existe: o CSS anula a transformacao abaixo de 900px, e
   quem pediu menos movimento no sistema operacional tambem nao ganha.
   --------------------------------------------------------------------- */
(function inclinarCartao() {
  const caixa = porId('porta-caixa');
  const porta = porId('porta');
  if (!caixa || !porta || !window.matchMedia) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.matchMedia('(hover: hover)').matches) return;

  porta.addEventListener('mousemove', function (e) {
    const r = caixa.getBoundingClientRect();
    const x = (e.clientX - r.left - r.width / 2) / r.width;
    const y = (e.clientY - r.top - r.height / 2) / r.height;
    caixa.style.transform =
      'perspective(1400px) rotateX(' + (-y * 7).toFixed(2) + 'deg) ' +
      'rotateY(' + (x * 7).toFixed(2) + 'deg)';
  });
  porta.addEventListener('mouseleave', function () { caixa.style.transform = ''; });
})();

abrirPorta();
