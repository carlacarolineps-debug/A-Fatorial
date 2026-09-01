/* =====================================================================
   A entrada.

   Tres caminhos, nesta ordem:

   1. SESSAO ABERTA. A pessoa ja entrou neste navegador. Entra direto.

   2. CLOUDFLARE ACCESS. A rota /eu diz qual e-mail o Access autenticou.
      Se esse e-mail estiver cadastrado, entra sem senha: quem ja provou
      quem e na porta da rua nao prova de novo na porta da sala.

   3. LOGIN DAQUI. Sem Access, ou com um e-mail que nao esta na lista, a
      pessoa escolhe quem e e digita a senha dela.

   E no primeiro dia, quando nao existe ninguem cadastrado, a porta pede
   para criar o primeiro gestor. Sistema que abre vazio e deixa entrar sem
   dizer quem voce e nao tem como separar papel nenhum depois.
   ===================================================================== */

let PORTA_ESCOLHIDA = null;   // id da pessoa selecionada na lista

async function lerEu() {
  try {
    const r = await fetch('/eu', { headers: cabecalhos(), cache: 'no-store' });
    let corpo = null;
    try { corpo = await r.json(); } catch (e) { corpo = null; }
    ACCESS_NO_AR = (r.status === 200 && !!corpo && !!corpo.email);
    return { status: r.status, corpo: corpo };
  } catch (e) {
    return { status: 0, corpo: null };
  }
}

function pintarPorta(titulo, texto_, corpo) {
  escrever('porta-titulo', titulo);
  texto('porta-texto', texto_);
  escrever('porta-corpo', corpo);
}

function entrar(pessoa, origem) {
  EU.id = pessoa.id;
  EU.papel = pessoa.papel;
  EU.email = pessoa.email || null;
  EU.nome = pessoa.nome || (pessoa.email ? String(pessoa.email).split('@')[0] : 'sem nome');
  EU.origem = origem;

  if (origem === 'senha') sessaoGuardar(pessoa.id);

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
}

/* ---------------------------------------------------------------- primeiro dia */

async function portaCriarPrimeiro() {
  const nome = String((porId('portaNome') || {}).value || '').trim();
  const email = String((porId('portaEmail') || {}).value || '').trim().toLowerCase();
  const senha = String((porId('portaSenha') || {}).value || '');
  const repete = String((porId('portaSenha2') || {}).value || '');

  const erro = !nome ? 'Escreva o seu nome.'
    : (!email || email.indexOf('@') < 0) ? 'Escreva um e-mail válido.'
    : senha.length < 6 ? 'A senha precisa de pelo menos 6 caracteres.'
    : senha !== repete ? 'As duas senhas não são iguais.'
    : null;
  if (erro) { escrever('portaErro', aviso('alerta', erro, 'Corrija e tente de novo.')); return; }

  const id = 'p' + String(email).replace(/[^a-z0-9]/g, '').slice(0, 12) + '-' + email.length;
  const pessoa = {
    id: id, nome: nome, email: email, papel: 'gestor', ativo: true,
    senha: await resumoSenha(senha, id),
  };
  if (!gravarPessoas([pessoa])) {
    escrever('portaErro', aviso('alerta', 'Não consegui gravar no navegador.',
      'O armazenamento pode estar cheio ou bloqueado. Sem gravar, o cadastro se perde ao fechar a aba.'));
    return;
  }
  entrar(pessoa, 'senha');
}

function portaTelaPrimeiro(avisoTopo) {
  pintarPorta(
    'Este sistema é <b>seu</b>',
    'Crie o seu acesso de gestor. Depois você cadastra o resto da equipe por dentro.',
    (avisoTopo || '') +
    '<div id="portaErro"></div>' +
    '<label class="rotulo">Seu nome</label>' +
    '<input class="campo" id="portaNome" autocomplete="name" placeholder="Como você aparece para a equipe">' +
    '<label class="rotulo" style="margin-top:14px">Seu e-mail</label>' +
    '<input class="campo" id="portaEmail" type="email" autocomplete="email" placeholder="o mesmo do login protegido, quando ele existir">' +
    '<label class="rotulo" style="margin-top:14px">Senha</label>' +
    '<input class="campo" id="portaSenha" type="password" autocomplete="new-password" placeholder="pelo menos 6 caracteres">' +
    '<label class="rotulo" style="margin-top:14px">Repita a senha</label>' +
    '<input class="campo" id="portaSenha2" type="password" autocomplete="new-password">' +
    '<button class="bt bt-marca" style="width:100%;justify-content:center;margin-top:18px" ' +
      'onclick="portaCriarPrimeiro()">Criar meu acesso</button>' +
    '<p class="dica" style="margin-top:16px">É pelo e-mail que o login protegido vai reconhecer você depois.</p>');

  const campo = porId('portaNome');
  if (campo) campo.focus();
}

/* ---------------------------------------------------------------- login */

function portaEscolher(id) {
  PORTA_ESCOLHIDA = id;
  portaTelaLogin();
  const campo = porId('portaSenhaLogin');
  if (campo) campo.focus();
}

function portaVoltar() { PORTA_ESCOLHIDA = null; portaTelaLogin(); }

async function portaConferir() {
  const pessoa = acharPessoaPorId(PORTA_ESCOLHIDA);
  if (!pessoa) { portaVoltar(); return; }
  const senha = String((porId('portaSenhaLogin') || {}).value || '');

  // Pessoa cadastrada por outra pessoa ainda nao tem senha: a primeira
  // entrada dela e onde ela escolhe. Melhor que senha provisoria mandada
  // por WhatsApp, que ninguem troca depois.
  if (!pessoa.senha) {
    if (senha.length < 6) {
      escrever('portaErro', aviso('info', 'Esta é a sua primeira entrada.',
        'Escolha uma senha de pelo menos 6 caracteres. Ela fica só neste navegador.'));
      return;
    }
    pessoa.senha = await resumoSenha(senha, pessoa.id);
    const lista = pessoas().map(function (x) { return x.id === pessoa.id ? pessoa : x; });
    if (!gravarPessoas(lista)) {
      escrever('portaErro', aviso('alerta', 'Não consegui gravar a senha.', 'Tente de novo.'));
      return;
    }
    entrar(pessoa, 'senha');
    return;
  }

  const resumo = await resumoSenha(senha, pessoa.id);
  if (!resumoIgual(resumo, pessoa.senha)) {
    escrever('portaErro', aviso('alerta', 'Senha errada.',
      'Se você esqueceu, quem tem acesso de gestor redefine a sua senha em "A casa".'));
    const campo = porId('portaSenhaLogin');
    if (campo) { campo.value = ''; campo.focus(); }
    return;
  }
  entrar(pessoa, 'senha');
}

function portaTelaLogin(avisoTopo) {
  const lista = pessoas().filter(function (p) { return p.ativo !== false; });

  if (!lista.length) { portaTelaPrimeiro(avisoTopo); return; }

  if (!PORTA_ESCOLHIDA) {
    pintarPorta('Quem está <b>entrando</b>?', 'Escolha o seu nome na lista.',
      (avisoTopo || '') +
      lista.map(function (p) {
        const papel = porChave(PAPEIS, p.papel) || { nome: p.papel, ic: '·' };
        return '<button class="papel" onclick="portaEscolher(\'' + esc(p.id) + '\')">' +
          ic(papel.ic, 'ic-20') +
          '<span><b>' + esc(p.nome || p.email) + '</b>' +
          '<span>' + esc(papel.nome) + (p.senha ? '' : ', primeira entrada') + '</span></span></button>';
      }).join('') +
      '<p class="dica" style="margin-top:16px">Não está na lista? Quem é gestor cadastra você em "A casa".</p>');
    return;
  }

  const pessoa = acharPessoaPorId(PORTA_ESCOLHIDA);
  if (!pessoa) { PORTA_ESCOLHIDA = null; portaTelaLogin(); return; }
  const papel = porChave(PAPEIS, pessoa.papel) || { nome: pessoa.papel };

  pintarPorta(
    esc(String(pessoa.nome || pessoa.email).split(' ')[0]) + ', sua <b>senha</b>',
    papel.nome + (pessoa.email ? ', ' + pessoa.email : ''),
    '<div id="portaErro"></div>' +
    '<input class="campo" id="portaSenhaLogin" type="password" autocomplete="current-password" ' +
      'placeholder="' + (pessoa.senha ? 'sua senha' : 'escolha uma senha, é a sua primeira entrada') + '" ' +
      'onkeydown="if(event.key===\'Enter\')portaConferir()">' +
    '<button class="bt bt-marca" style="width:100%;justify-content:center;margin-top:14px" ' +
      'onclick="portaConferir()">Entrar</button>' +
    '<button class="bt bt-linha" style="width:100%;justify-content:center;margin-top:8px" ' +
      'onclick="portaVoltar()">Não sou eu</button>');
}

/* ---------------------------------------------------------------- abertura */

async function abrirPorta() {
  pintarPorta('Entrando no <b>sistema</b>', 'Conferindo o seu acesso.', '');

  // 1. quem o login protegido autenticou, se ele estiver no ar
  //
  // Esta pergunta vem ANTES da sessao guardada, e a ordem importa. A
  // sessao diz quem entrou neste navegador da ultima vez; o Access diz
  // quem esta entrando agora. Num computador que duas pessoas usam, a
  // sessao da primeira abriria o sistema no nome dela para a segunda,
  // com o papel dela junto. Quem prova quem e na porta da rua e quem
  // manda aqui dentro.
  const r = await lerEu();

  if (r.status === 200 && r.corpo && r.corpo.email) {
    const alvo = String(r.corpo.email).toLowerCase();
    const pessoa = pessoas().find(function (p) {
      return String(p.email || '').toLowerCase() === alvo && p.ativo !== false;
    });

    // Sessao de outra pessoa neste navegador nao sobrevive: ela seria
    // usada na proxima abertura, e voltariamos ao problema de cima.
    const sessao = sessaoLer();
    if (sessao && (!pessoa || sessao.pessoaId !== pessoa.id)) sessaoApagar();

    if (pessoa) { entrar(pessoa, 'access'); return; }

    // E-mail que passou no Access mas nao esta na lista NAO vira gestor por
    // descuido, e nao cai numa tela qualquer.
    if (!pessoas().length) { portaTelaPrimeiro(); return; }
    pintarPorta(
      'Seu acesso ainda não foi <b>liberado</b>',
      'Você entrou pelo login protegido, mas ainda não tem cadastro aqui dentro.',
      aviso('info', esc(r.corpo.email),
        'Peça a quem é gestor para cadastrar esse e-mail em "A casa".'));
    return;
  }

  // 2. sem resposta do login protegido, vale a sessao ja aberta aqui
  const sessao = sessaoLer();
  if (sessao && sessao.pessoaId) {
    const pessoa = acharPessoaPorId(sessao.pessoaId);
    if (pessoa && pessoa.ativo !== false) { entrar(pessoa, 'senha'); return; }
    sessaoApagar();
  }

  // 3. login daqui
  if (r.status === 503) {
    portaTelaLogin(aviso('atencao', 'O login protegido da Cloudflare ainda não está ligado.',
      'A senha abaixo diz quem é você, não protege o endereço: quem souber a URL chega até esta tela. ' +
      'Até o Access existir, não guarde aqui o que não pode vazar.'));
    return;
  }

  if (r.status === 0) {
    portaTelaLogin(aviso('alerta', 'Não consegui falar com o servidor.',
      'Dá para entrar, mas as aplicações da landing não vão carregar.'));
    return;
  }

  portaTelaLogin(aviso('atencao', 'Seu login protegido venceu.',
    'Recarregue a página para entrar pela Cloudflare de novo, ou entre por aqui.'));
}

abrirPorta();
