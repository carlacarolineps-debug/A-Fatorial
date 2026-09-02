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

function ocupada(idDoBotao, sim) {
  const b = porId(idDoBotao);
  if (b) { b.disabled = !!sim; b.style.opacity = sim ? '.6' : ''; }
}

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
}

/* ---------------------------------------------------------------- entrar */

async function portaEntrar() {
  const email = String((porId('portaEmail') || {}).value || '').trim();
  const senha = String((porId('portaSenha') || {}).value || '');

  if (!email || email.indexOf('@') < 0) { erroDaPorta('Escreva o seu e-mail.'); return; }
  if (!senha) { erroDaPorta('Escreva a sua senha.'); return; }

  ocupada('portaBotao', true);
  escrever('portaErro', '');
  const r = await pedirPorta('/entrar', { email: email, senha: senha });
  ocupada('portaBotao', false);

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
    '<label class="rotulo" for="portaEmail">E-mail</label>' +
    '<input class="campo" id="portaEmail" type="email" autocomplete="username" ' +
      'placeholder="o e-mail que você usa aqui" ' +
      'onkeydown="if(event.key===\'Enter\')porId(\'portaSenha\').focus()">' +
    '<label class="rotulo" for="portaSenha" style="margin-top:14px">Senha</label>' +
    '<input class="campo" id="portaSenha" type="password" autocomplete="current-password" ' +
      'onkeydown="if(event.key===\'Enter\')portaEntrar()">' +
    '<button class="bt bt-marca" id="portaBotao" style="width:100%;justify-content:center;margin-top:18px" ' +
      'onclick="portaEntrar()">Entrar</button>' +
    '<p class="dica" style="margin-top:16px">Esqueceu a senha? Quem é gestor define uma nova em "A casa".</p>');

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
    : senha.length < 8 ? 'A senha precisa de pelo menos 8 caracteres.'
    : senha !== repete ? 'As duas senhas não são iguais.'
    : null;
  if (erro) { erroDaPorta(erro); return; }

  ocupada('portaBotao', true);
  escrever('portaErro', '');
  const r = await pedirPorta('/primeiro-acesso', { nome: nome, email: email, senha: senha });
  ocupada('portaBotao', false);

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
    '<label class="rotulo" for="portaNome">Seu nome</label>' +
    '<input class="campo" id="portaNome" autocomplete="name" placeholder="Como você aparece para a equipe">' +
    '<label class="rotulo" for="portaEmail" style="margin-top:14px">Seu e-mail</label>' +
    '<input class="campo" id="portaEmail" type="email" autocomplete="username" placeholder="é por ele que você vai entrar">' +
    '<label class="rotulo" for="portaSenha" style="margin-top:14px">Senha</label>' +
    '<input class="campo" id="portaSenha" type="password" autocomplete="new-password" placeholder="pelo menos 8 caracteres">' +
    '<label class="rotulo" for="portaSenha2" style="margin-top:14px">Repita a senha</label>' +
    '<input class="campo" id="portaSenha2" type="password" autocomplete="new-password" ' +
      'onkeydown="if(event.key===\'Enter\')portaCriarPrimeiro()">' +
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
    : nova.length < 8 ? 'A senha nova precisa de pelo menos 8 caracteres.'
    : nova !== repete ? 'As duas senhas novas não são iguais.'
    : null;
  if (erro) { erroDaPorta(erro); return; }

  ocupada('portaBotao', true);
  escrever('portaErro', '');
  const r = await pedirPorta('/minha-senha', { atual: atual, nova: nova });
  ocupada('portaBotao', false);

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
  pintarPorta(
    'Escolha a sua <b>senha</b>',
    'A senha que você recebeu serve uma vez só. A partir de agora é a sua.',
    aviso('info', esc(pessoa.email), 'Ninguém mais vai saber a senha que você escolher agora.') +
    '<div id="portaErro"></div>' +
    '<label class="rotulo" for="portaAtual">A senha que você recebeu</label>' +
    '<input class="campo" id="portaAtual" type="password" autocomplete="current-password">' +
    '<label class="rotulo" for="portaNova" style="margin-top:14px">Sua senha nova</label>' +
    '<input class="campo" id="portaNova" type="password" autocomplete="new-password" placeholder="pelo menos 8 caracteres">' +
    '<label class="rotulo" for="portaNova2" style="margin-top:14px">Repita a senha nova</label>' +
    '<input class="campo" id="portaNova2" type="password" autocomplete="new-password" ' +
      'onkeydown="if(event.key===\'Enter\')portaTrocar()">' +
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

  if (r.corpo.casa_vazia) { portaTelaPrimeiro(); return; }
  if (!r.corpo.entrou) { portaTelaEntrar(); return; }
  if (r.corpo.eu.precisa_trocar) { portaTelaTrocar(r.corpo.eu); return; }
  entrar(r.corpo.eu);
}

abrirPorta();
