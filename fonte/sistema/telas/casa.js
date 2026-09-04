/* =====================================================================
   A casa

   Duas coisas quebram de verdade num sistema que vive no navegador:
   alguem enxergando o que nao devia, e trabalho sumindo sem aviso. Esta
   tela e sobre as duas, e ela escreve por extenso o que costuma ficar
   subentendido e depois vira problema.
   ===================================================================== */

/* ---------------------------------------------------------------------
   As pessoas moram no servidor.

   Ate 01/09 esta lista vivia no localStorage, e isso tinha uma
   consequencia que ninguem lembra na hora: cadastrar alguem no
   computador da Carla nao cadastrava em lugar nenhum. A pessoa chegava,
   abria o sistema no computador dela e nao existia.

   Agora e uma lista so. Cada mudanca vai ao servidor e volta, e por isso
   cada botao aqui espera resposta antes de redesenhar.
   --------------------------------------------------------------------- */

let CASA_PESSOAS = [];
let CASA_ESTADO = 'carregando';   // carregando | lendo | pronto | erro
let CASA_ERRO = '';

async function casaPedir(metodo, corpo) {
  try {
    const opcoes = { method: metodo, headers: cabecalhos(), cache: 'no-store' };
    if (corpo) {
      opcoes.headers['content-type'] = 'application/json';
      opcoes.body = JSON.stringify(corpo);
    }
    const r = await fetch('/pessoas', opcoes);
    let d = null;
    try { d = await r.json(); } catch (e) { d = null; }
    return { status: r.status, corpo: d };
  } catch (e) {
    return { status: 0, corpo: null };
  }
}

async function casaCarregar() {
  const r = await casaPedir('GET');
  if (r.status === 0) {
    CASA_ESTADO = 'erro';
    CASA_ERRO = 'Não consegui falar com o servidor. As pessoas moram lá, não neste navegador.';
  } else if (!r.corpo || !r.corpo.ok) {
    CASA_ESTADO = 'erro';
    CASA_ERRO = r.corpo && r.corpo.erro ? primeiraMaiuscula(r.corpo.erro) : 'Não consegui ler a lista.';
  } else {
    CASA_PESSOAS = r.corpo.pessoas || [];
    EQUIPE = CASA_PESSOAS;
    CASA_ESTADO = 'pronto';
    CASA_ERRO = '';
  }
  DESENHO.casa();
}

// Uma frase so para o que der errado em qualquer botao desta tela.
function casaFalhou(r, quando) {
  escrever('casaAvisoAccess', aviso('alerta',
    r.status === 0 ? 'Não consegui falar com o servidor.'
      : r.corpo && r.corpo.erro ? primeiraMaiuscula(r.corpo.erro)
      : 'Não consegui ' + quando + '.',
    'Nada foi mudado. Tente de novo.'));
}

function casaPodeEditar() { return EU.papel === 'gestor'; }

function casaLinhaPessoa(u, editavel) {
  const souEu = EU.id === u.id;
  const desligada = u.ativo === false;
  return '<tr' + (desligada ? ' style="opacity:.55"' : '') + '>' +
    '<td><b>' + esc(u.nome || 'sem nome') + '</b>' +
      (souEu ? ' <span class="eti eti-marca">você</span>' : '') +
      (desligada ? ' <span class="eti eti-neutra">desligada</span>' : '') + '</td>' +
    '<td style="font-size:12.5px;color:var(--tx-2)">' + esc(u.email || '') + '</td>' +
    '<td>' + (u.precisa_trocar
      ? '<span class="eti eti-atencao">troca na 1a entrada</span>'
      : '<span class="eti eti-ok">senha própria</span>') + '</td>' +
    '<td>' + (editavel && !souEu
      ? '<select class="campo campo-sm" onchange="casaMudarPapel(' + Number(u.id) + ', this.value)">' +
        PAPEIS.map(function (p) {
          return '<option value="' + p.k + '"' + (p.k === u.papel ? ' selected' : '') + '>' + esc(p.nome) + '</option>';
        }).join('') + '</select>'
      : '<span class="eti eti-neutra">' + esc((porChave(PAPEIS, u.papel) || {}).nome || u.papel) + '</span>') + '</td>' +
    '<td style="text-align:right;white-space:nowrap">' + (editavel
      // Na propria linha o botao e outro. "Nova senha" sorteia uma e
      // derruba as sessoes da pessoa: usado em si mesma, ele expulsava
      // quem clicou e mostrava a propria senha nova na tela que ja tinha
      // ido embora. Trocar a de gente e sortear; trocar a sua e digitar.
      ? (souEu
          ? '<button class="bt bt-linha bt-sm" onclick="casaMinhaSenha()">Trocar a minha senha</button>'
          : '<button class="bt bt-linha bt-sm" onclick="casaNovaSenha(' + Number(u.id) + ')">Nova senha</button> ' +
            '<button class="bt bt-linha bt-sm" onclick="casaLigar(' + Number(u.id) + ',' + (desligada ? 'true' : 'false') + ')">' +
            (desligada ? 'Religar' : 'Desligar') + '</button> ' +
            '<button class="bt bt-linha bt-sm" onclick="casaRemover(' + Number(u.id) + ')">Tirar</button>')
      : '') + '</td>' +
  '</tr>';
}

const casaAchar = (id) => CASA_PESSOAS.find(function (x) { return x.id === id; }) || null;

/* Escrever, embaixo da lista de papel, o que aquele papel enxerga. A
   pessoa que cadastra nao deveria ter que rolar ate "Telas por papel"
   para descobrir o que acabou de dar de acesso a alguem. A frase e
   montada da MESMA lista que manda de verdade, entao ela nao mente
   quando alguem mexe nas caixas la embaixo. */
function casaExplicarPapel() {
  const escolhido = (porId('casaPapel') || {}).value || 'colaborador';
  const p = porChave(PAPEIS, escolhido);
  const telas = (PERMISSOES[escolhido] || []).map(function (k) {
    const tela = porChave(TELAS, k);
    return tela ? tela.nome : k;
  });
  const total = PERMISSOES_DEFAULT.gestor.length;

  escrever('casaPapelDica',
    '<b style="color:var(--tx-2)">' + esc((p || {}).nome || escolhido) + ':</b> ' +
    esc((p || {}).resumo || '') + ' ' +
    (telas.length >= total
      ? 'Enxerga <b style="color:var(--o-tx)">todas as ' + total + ' telas</b>, e é quem cadastra gente.'
      : 'Enxerga ' + telas.length + ' das ' + total + ' telas: ' + esc(telas.join(', ')) + '.'));
}

/* Esquecer senha acontece. O gestor escolhe uma nova, passa adiante, e a
   pessoa troca na primeira entrada: a senha que andou pelo WhatsApp nao
   fica valendo. Nao existe "sem senha" aqui, porque conta sem senha nao
   entra e ficaria travada esperando um e-mail que este sistema nao manda. */
async function casaNovaSenha(id) {
  const u = casaAchar(id);
  if (!u) return;
  const sim = await perguntar({
    titulo: 'Nova senha para ' + (u.nome || u.email),
    texto: 'Vou sortear uma senha, você passa para ela, e ela troca na primeira entrada.',
    detalhe: 'As sessões abertas dela caem na hora.',
    confirmar: 'Sortear a senha',
  });
  if (!sim) return;

  const senha = casaSortearSenha();
  // A prova e calculada com o e-mail DELA, porque e com o e-mail dela que
  // ela vai entrar: o sal da prova sai do e-mail de quem entra.
  const r = await casaPedir('PATCH', { id: id, prova: await provaDaSenha(u.email, senha) });
  if (!r.corpo || !r.corpo.ok) { casaFalhou(r, 'trocar a senha'); return; }

  // A lista e relida ANTES de escrever o aviso: recarregar redesenha a
  // tela inteira, e escrever antes apagaria a unica vez que a senha
  // aparece. Mesma ordem do casaAdicionar, pelo mesmo motivo.
  await casaCarregar();
  escrever('casaAvisoAccess', aviso('info',
    'A senha de ' + esc(u.nome || u.email) + ' agora é ' + esc(senha),
    'Passe para ela agora: esta é a única vez que ela aparece. Na primeira entrada ela escolhe a dela.'));
}

/* Senha sorteada aqui, e nao inventada por gente. Senha escolhida na
   pressa vira "mudar123" e depois nao muda. Sem letras que se confundem
   com numero, porque esta senha vai ser lida em voz alta ou digitada de
   um print. */
function casaSortearSenha() {
  const letras = 'abcdefghjkmnpqrstuvwxyz';
  const numeros = '23456789';
  const sorteia = (fonte, quantas) => Array.from(
    crypto.getRandomValues(new Uint8Array(quantas)),
    function (b) { return fonte[b % fonte.length]; }).join('');
  return sorteia(letras, 4) + '-' + sorteia(numeros, 3) + '-' + sorteia(letras, 4);
}

/* Trocar a PROPRIA senha. Passa pelo /minha-senha, que pede a atual e
   mantem esta sessao de pe: e a unica troca em que a pessoa escolhe, e
   nao recebe. Sem isto, quem e gestor nao tinha por onde trocar a senha
   dela por dentro do sistema. */
async function casaMinhaSenha() {
  const sim = await perguntar({
    titulo: 'Trocar a sua senha',
    texto: 'Você digita a atual e a nova. As suas outras sessões, em outros computadores, caem.',
    confirmar: 'Trocar agora',
  });
  if (!sim) return;
  escrever('casaAvisoAccess',
    '<div class="cartao" style="margin-bottom:14px">' +
    '<div class="cartao-t">Trocar a minha senha</div>' +
    '<div id="casaSenhaErro"></div>' +
    '<label class="rotulo" for="casaSenhaAtual">Senha atual</label>' +
    '<input class="campo campo-sm" id="casaSenhaAtual" type="password" autocomplete="current-password">' +
    '<label class="rotulo" for="casaSenhaNova" style="margin-top:10px">Senha nova</label>' +
    '<input class="campo campo-sm" id="casaSenhaNova" type="password" autocomplete="new-password" placeholder="pelo menos ' + SENHA_MINIMA + ' caracteres">' +
    '<label class="rotulo" for="casaSenhaNova2" style="margin-top:10px">Repita a senha nova</label>' +
    '<input class="campo campo-sm" id="casaSenhaNova2" type="password" autocomplete="new-password">' +
    '<button class="bt bt-marca bt-sm" style="margin-top:12px" onclick="casaGravarMinhaSenha()">Guardar</button>' +
    '</div>');
  const campo = porId('casaSenhaAtual');
  if (campo) campo.focus();
}

async function casaGravarMinhaSenha() {
  const atual = String((porId('casaSenhaAtual') || {}).value || '');
  const nova = String((porId('casaSenhaNova') || {}).value || '');
  const repete = String((porId('casaSenhaNova2') || {}).value || '');

  const erro = !atual ? 'Escreva a sua senha atual.'
    : nova.length < SENHA_MINIMA ? 'A senha nova precisa de pelo menos ' + SENHA_MINIMA + ' caracteres.'
    : nova !== repete ? 'As duas senhas novas não são iguais.'
    : null;
  if (erro) { escrever('casaSenhaErro', aviso('alerta', erro, 'Corrija e tente de novo.')); return; }

  let r;
  try {
    const resposta = await fetch('/minha-senha', {
      method: 'POST',
      headers: cabecalhos({ 'content-type': 'application/json' }),
      cache: 'no-store',
      body: JSON.stringify({
        atual: await provaDaSenha(EU.email, atual),
        nova: await provaDaSenha(EU.email, nova),
      }),
    });
    r = { status: resposta.status, corpo: await resposta.json().catch(function () { return null; }) };
  } catch (e) {
    r = { status: 0, corpo: null };
  }

  if (!r.corpo || !r.corpo.ok) {
    escrever('casaSenhaErro', aviso('alerta',
      r.corpo && r.corpo.erro ? primeiraMaiuscula(r.corpo.erro) : 'Não consegui trocar a senha.',
      'Nada foi mudado.'));
    return;
  }
  await casaCarregar();
  escrever('casaAvisoAccess', aviso('info', 'Senha trocada.',
    'Você continua aqui. Se estava entrada em outro computador, aquela sessão caiu.'));
}

async function casaMudarPapel(id, papel) {
  const r = await casaPedir('PATCH', { id: id, papel: papel });
  if (!r.corpo || !r.corpo.ok) { casaFalhou(r, 'mudar o papel'); }
  await casaCarregar();
}

async function casaLigar(id, religar) {
  const u = casaAchar(id);
  if (!u) return;
  if (!religar) {
    const sim = await perguntar({
      titulo: 'Desligar o acesso de ' + (u.nome || u.email),
      texto: 'Ela para de entrar agora, e as sessões abertas dela caem.',
      detalhe: 'O nome dela continua nos projetos e nas entregas. Religar é um clique.',
      confirmar: 'Desligar',
    });
    if (!sim) return;
  }
  const r = await casaPedir('PATCH', { id: id, ativo: !!religar });
  if (!r.corpo || !r.corpo.ok) { casaFalhou(r, religar ? 'religar' : 'desligar'); }
  await casaCarregar();
}

async function casaRemover(id) {
  const u = casaAchar(id);
  if (!u) return;
  const sim = await perguntar({
    titulo: 'Tirar ' + (u.nome || u.email) + ' de vez',
    texto: 'O cadastro some, e com ele o histórico de quem fez o quê fica sem nome.',
    detalhe: 'Se você só quer cortar o acesso, "Desligar" faz isso e guarda o nome.',
    confirmar: 'Tirar de vez',
  });
  if (!sim) return;
  const r = await casaPedir('DELETE', { id: id });
  if (!r.corpo || !r.corpo.ok) { casaFalhou(r, 'tirar da lista'); }
  await casaCarregar();
}

async function casaAdicionar() {
  const nome = String((porId('casaNome') || {}).value || '').trim();
  const email = String((porId('casaEmail') || {}).value || '').trim().toLowerCase();
  const papel = (porId('casaPapel') || {}).value || 'colaborador';

  if (!nome) {
    escrever('casaAvisoAccess', aviso('alerta', 'Falta o nome.',
      'É como a pessoa aparece nas telas de trabalho.'));
    return;
  }
  if (!email || email.indexOf('@') < 0) {
    escrever('casaAvisoAccess', aviso('alerta', 'Falta o e-mail.',
      'É por ele que a pessoa entra no sistema.'));
    return;
  }

  const senha = casaSortearSenha();
  const r = await casaPedir('POST', {
    nome: nome, email: email, papel: papel,
    prova: await provaDaSenha(email, senha),
  });
  if (!r.corpo || !r.corpo.ok) { casaFalhou(r, 'cadastrar'); return; }

  const campoNome = porId('casaNome'); if (campoNome) campoNome.value = '';
  const campoEmail = porId('casaEmail'); if (campoEmail) campoEmail.value = '';

  await casaCarregar();
  escrever('casaAvisoAccess', aviso('info',
    esc(nome) + ' entra com ' + esc(email) + ' e a senha ' + esc(senha),
    'Passe as duas coisas para ela agora: esta é a única vez que a senha aparece. Na primeira entrada ela escolhe a dela.'));
}

/* ------------------------------------------------------------------ */

function casaAlternarTela(papel, tela) {
  if (!PERMISSOES[papel]) PERMISSOES[papel] = [];
  const i = PERMISSOES[papel].indexOf(tela);
  // O gestor nao pode se trancar para fora do configurador.
  if (i >= 0 && papel === 'gestor' && tela === 'casa') return;
  if (i >= 0) PERMISSOES[papel].splice(i, 1); else PERMISSOES[papel].push(tela);
  salvarPermissoes();
  DESENHO.casa();
  montarMenu();
  const item = porId('menu-' + TELA_ATUAL);
  if (item) item.classList.add('on');
}

/* ------------------------------------------------------------------ */

// O sistema do A! Fatorial morou neste mesmo endereco ate 26/08, e as
// chaves dele continuam no navegador de quem abriu. Este sistema nunca as
// le. Apagar e escolha da pessoa, escrita, nunca automatica.
function casaContarResiduo() {
  const achadas = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.indexOf('af_') === 0) achadas.push(k);
    }
  } catch (e) { return []; }
  return achadas;
}

async function casaLimparResiduo() {
  const achadas = casaContarResiduo();
  if (!achadas.length) return;
  const sim = await perguntar({
    titulo: 'Apagar ' + achadas.length + ' chave(s) do sistema anterior',
    texto: 'Se alguém ainda usa aquele sistema neste computador, o trabalho dele se perde.',
    detalhe: achadas.join(', '),
    confirmar: 'Apagar',
  });
  if (!sim) return;
  try { achadas.forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
  DESENHO.casa();
}

/* ------------------------------------------------------------------ */

DESENHO.casa = function () {
  const editavel = casaPodeEditar();

  // 1. pessoas
  //
  // A lista vem do servidor, entao esta tela tem estado de carregando e de
  // erro, que nenhuma outra tela de trabalho tem. Desenhar uma tabela
  // vazia enquanto a resposta nao chegou faria a Carla achar que a equipe
  // sumiu.
  if (CASA_ESTADO === 'carregando') {
    escrever('casaAvisoAccess', '<p class="dica" style="margin:-8px 0 16px">Lendo a lista no servidor.</p>');
    escrever('casaPessoas', vazio('Um instante.', 5));
    escrever('casaNova', '');
    casaCarregar();
    CASA_ESTADO = 'lendo';
  } else if (CASA_ESTADO === 'erro') {
    escrever('casaAvisoAccess', aviso('alerta', CASA_ERRO,
      'As pessoas moram no servidor desde 01/09, e não neste navegador.') +
      '<button class="bt bt-linha bt-sm" style="margin-bottom:14px" onclick="casaCarregar()">Tentar de novo</button>');
    escrever('casaPessoas', vazio('Não consegui ler a lista.', 5));
    escrever('casaNova', '');
  } else {
    // Esta frase mora no HTML da tela, porque vale sempre. O
    // casaAvisoAccess fica reservado para o que acontece AGORA: a senha
    // sorteada, que aparece uma vez so, e os recados de erro. Limpar aqui
    // e o que apaga o recado velho quando a lista e lida de novo.
    escrever('casaAvisoAccess', '');

    escrever('casaPessoas', CASA_PESSOAS.length
      ? CASA_PESSOAS.map(function (u) { return casaLinhaPessoa(u, editavel); }).join('')
      : vazio('Só você por aqui.', 5));

    // A linha de cadastro em grade, e nao em flex solto: com flex-wrap os
    // tres campos e o botao caiam cada um numa largura, e a lista de papel
    // esticava sozinha ate a margem. Aqui cada coisa tem o tamanho do que
    // ela pede: nome curto, e-mail longo, papel do tamanho do nome maior.
    escrever('casaNova', editavel
      ? '<div class="linha-nova">' +
          '<label class="rotulo" for="casaNome">Nome</label>' +
          '<label class="rotulo" for="casaEmail">E-mail de entrada</label>' +
          '<label class="rotulo" for="casaPapel">O que ela vai poder fazer</label>' +
          '<span></span>' +
          '<input class="campo campo-sm" id="casaNome" placeholder="Como ela aparece nas telas">' +
          '<input class="campo campo-sm" id="casaEmail" type="email" placeholder="é por ele que ela entra">' +
          '<select class="campo campo-sm" id="casaPapel" onchange="casaExplicarPapel()">' +
            PAPEIS.map(function (p) {
              return '<option value="' + p.k + '"' + (p.k === 'colaborador' ? ' selected' : '') + '>' +
                esc(p.nome) + '</option>';
            }).join('') +
          '</select>' +
          '<button class="bt bt-marca bt-sm" onclick="casaAdicionar()">Acrescentar</button>' +
          '<p class="dica" id="casaPapelDica" style="grid-column:1/-1;margin-top:2px"></p>' +
        '</div>'
      : '');
    if (editavel) casaExplicarPapel();
  }

  // 2. telas por papel
  escrever('casaPermissoes',
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px">' +
    PAPEIS.map(function (p) {
      return '<div style="border:1px solid var(--fio);border-radius:var(--r-sm);padding:16px">' +
        '<b style="color:var(--claro);font-size:14px">' + esc(p.nome) + '</b>' +
        '<p class="dica" style="margin:4px 0 12px">' + esc(p.resumo) + '</p>' +
        TELAS.map(function (t) {
          const marcada = (PERMISSOES[p.k] || []).indexOf(t.k) >= 0;
          const travada = (p.k === 'gestor' && t.k === 'casa');
          return '<label style="display:flex;align-items:center;gap:8px;font-size:12.5px;padding:3px 0;color:' +
            (marcada ? 'var(--tx)' : 'var(--tx-4)') + '">' +
            '<input type="checkbox"' + (marcada ? ' checked' : '') +
              (editavel && !travada ? '' : ' disabled') +
              ' onchange="casaAlternarTela(\'' + p.k + '\',\'' + t.k + '\')" style="accent-color:var(--o)">' +
            esc(t.nome) + (travada ? ' <span class="dica">(não se remove)</span>' : '') + '</label>';
        }).join('') +
      '</div>';
    }).join('') + '</div>');

  // 3. armazenamento
  const uso = iqvOcupacao();
  const cheio = uso.porcento >= 80;
  escrever('casaArmazenamento',
    (ULTIMA_FALHA_GRAVACAO
      ? aviso('alerta', 'Uma gravação falhou e o que você escreveu não foi salvo.',
          'Aconteceu em ' + esc(dataLonga(ULTIMA_FALHA_GRAVACAO.quando)) + ', na chave ' +
          esc(ULTIMA_FALHA_GRAVACAO.chave) + '.')
      : '') +
    (cheio
      ? aviso('atencao', 'O navegador está em ' + uso.porcento + '% da capacidade.',
          'Passando disso, gravar começa a falhar. Texto longo deve ir por link, não por campo dentro do sistema. ' +
          'Guarde uma cópia antes de continuar escrevendo.')
      : '') +
    '<div class="numeros" style="margin-bottom:0">' +
      '<div class="numero' + (cheio ? ' puxa' : '') + '"><div class="v">' + uso.porcento + '%</div>' +
        '<div class="l">Do navegador ocupado</div>' +
        '</div>' +
      '<div class="numero"><div class="v">' + iqvLer(CHAVES.projetos, []).length + '</div>' +
        '<div class="l">Projetos guardados aqui</div>' +
        '</div>' +
      '<div class="numero"><div class="v">' + CASA_PESSOAS.length + '</div>' +
        '<div class="l">Pessoas com acesso</div>' +
        '</div>' +
    '</div>');

  // 4. residuo do sistema anterior
  const residuo = casaContarResiduo();
  escrever('casaResiduo', residuo.length
    ? '<div class="cartao"><div class="cartao-t">Resíduo do sistema anterior</div>' +
      aviso('atencao', 'Este navegador guarda ' + residuo.length + ' chave(s) do sistema do A! Fatorial.',
        'Este sistema nunca lê nem escreve nelas. Só ocupam espaço. Apagar não tem volta.') +
      (editavel ? '<button class="bt bt-linha bt-sm" onclick="casaLimparResiduo()">Apagar o resíduo</button>' : '') +
      '</div>'
    : '');

  // A secao "A marca" saiu em 04/09, a pedido da Carla. Ela mostrava as
  // tres cores e as duas fontes, e nao decidia nada: Configuracoes e para
  // o que se muda, e a marca nao se muda por aqui. Os valores continuam
  // onde sempre estiveram, no 10-estilo.css, que os copia da landing.
};
