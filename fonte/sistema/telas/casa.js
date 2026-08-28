/* =====================================================================
   A casa

   Duas coisas quebram de verdade num sistema que vive no navegador:
   alguem enxergando o que nao devia, e trabalho sumindo sem aviso. Esta
   tela e sobre as duas, e ela escreve por extenso o que costuma ficar
   subentendido e depois vira problema.
   ===================================================================== */

function casaUsuarios() { return iqvLer(CHAVES.usuarios, []); }

function casaGravarUsuarios(lista) {
  if (iqvGravar(CHAVES.usuarios, lista)) { DESENHO.casa(); return true; }
  DESENHO.casa();
  return false;
}

function casaPodeEditar() { return EU.papel === 'gestor'; }

function casaLinhaPessoa(u, editavel) {
  const souEu = EU.id === u.id;
  return '<tr>' +
    '<td><b>' + esc(u.nome || 'sem nome') + '</b>' +
      (souEu ? ' <span class="eti eti-marca">você</span>' : '') + '</td>' +
    '<td style="font-size:12.5px;color:var(--tx-2)">' + esc(u.email || '') + '</td>' +
    '<td>' + (u.senha
      ? '<span class="eti eti-ok">senha criada</span>'
      : '<span class="eti eti-atencao">escolhe na 1a entrada</span>') + '</td>' +
    '<td>' + (editavel && !souEu
      ? '<select class="campo campo-sm" onchange="casaMudarPapel(\'' + esc(u.id) + '\', this.value)">' +
        PAPEIS.map(function (p) {
          return '<option value="' + p.k + '"' + (p.k === u.papel ? ' selected' : '') + '>' + esc(p.nome) + '</option>';
        }).join('') + '</select>'
      : '<span class="eti eti-neutra">' + esc((porChave(PAPEIS, u.papel) || {}).nome || u.papel) + '</span>') + '</td>' +
    '<td style="text-align:right;white-space:nowrap">' + (editavel
      ? (u.senha ? '<button class="bt bt-linha bt-sm" onclick="casaZerarSenha(\'' + esc(u.id) + '\')">Zerar senha</button> ' : '') +
        (souEu ? '' : '<button class="bt bt-linha bt-sm" onclick="casaRemover(\'' + esc(u.id) + '\')">Tirar</button>')
      : '') + '</td>' +
  '</tr>';
}

// Esquecer senha acontece. Sem isto, a pessoa fica de fora e a unica saida
// seria apagar o cadastro dela, o que levaria junto o vinculo com os
// projetos onde ela e responsavel.
async function casaZerarSenha(id) {
  const lista = casaUsuarios();
  const u = lista.find(function (x) { return x.id === id; });
  if (!u) return;
  const sim = await perguntar({
    titulo: 'Zerar a senha de ' + (u.nome || u.email),
    texto: 'Na próxima entrada ela escolhe uma senha nova. Você não fica sabendo qual é.',
    confirmar: 'Zerar a senha',
  });
  if (!sim) return;
  delete u.senha;
  casaGravarUsuarios(lista);
}

function casaMudarPapel(id, papel) {
  const lista = casaUsuarios();
  const u = lista.find(function (x) { return x.id === id; });
  if (!u) return;
  u.papel = papel;
  casaGravarUsuarios(lista);
}

async function casaRemover(id) {
  const lista = casaUsuarios();
  const u = lista.find(function (x) { return x.id === id; });
  if (!u) return;
  // A confirmacao diz o que o botao NAO faz, que e a parte que engana.
  const sim = await perguntar({
    titulo: 'Tirar ' + (u.nome || u.email) + ' da lista',
    texto: 'Ela some das telas, mas continua entrando pelo endereço.',
    detalhe: 'Para cortar o acesso, tire o e-mail dela da aplicação no painel da Cloudflare.',
    confirmar: 'Tirar da lista',
  });
  if (!sim) return;
  casaGravarUsuarios(lista.filter(function (x) { return x.id !== id; }));
}

function casaAdicionar() {
  const nome = (porId('casaNome') || {}).value || '';
  const email = String((porId('casaEmail') || {}).value || '').trim().toLowerCase();
  const papel = (porId('casaPapel') || {}).value || 'colaborador';
  if (!email || email.indexOf('@') < 0) {
    escrever('casaAvisoAccess', aviso('alerta', 'Falta o e-mail.',
      'É pelo e-mail que o sistema reconhece quem o Cloudflare Access deixou entrar. Sem ele a pessoa não tem como ser encontrada.'));
    return;
  }
  const lista = casaUsuarios();
  if (lista.some(function (x) { return String(x.email || '').toLowerCase() === email; })) {
    escrever('casaAvisoAccess', aviso('atencao', 'Esse e-mail já está na lista.',
      'Mude o papel dela na própria linha, em vez de cadastrar de novo.'));
    return;
  }
  lista.push({ id: 'u' + Date.now(), nome: nome.trim() || email.split('@')[0], email: email, papel: papel, ativo: true });
  casaGravarUsuarios(lista);
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
  const lista = casaUsuarios();

  // 1. pessoas
  escrever('casaAvisoAccess',
    '<p class="dica" style="margin:-8px 0 16px">O Access decide quem chega ao endereço. ' +
    'Esta lista decide o que cada um vê depois.</p>');

  escrever('casaPessoas', lista.length
    ? lista.map(function (u) { return casaLinhaPessoa(u, editavel); }).join('')
    : vazio('Só você por aqui.', 5));

  escrever('casaNova', editavel
    ? '<input class="campo campo-sm" id="casaNome" placeholder="Nome" style="flex:1;min-width:150px">' +
      '<input class="campo campo-sm" id="casaEmail" placeholder="e-mail do login" style="flex:1.4;min-width:200px">' +
      '<select class="campo campo-sm" id="casaPapel" style="min-width:150px">' +
        PAPEIS.map(function (p) { return '<option value="' + p.k + '">' + esc(p.nome) + '</option>'; }).join('') +
      '</select>' +
      '<button class="bt bt-marca bt-sm" onclick="casaAdicionar()">Acrescentar</button>'
    : '');

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
      '<div class="numero"><div class="v">' + lista.length + '</div>' +
        '<div class="l">Pessoas cadastradas</div>' +
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

  // 5. marca
  escrever('casaMarca',
    '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">' +
      ['#08080a', '#ff8309', '#f6f4ef'].map(function (c) {
        return '<span style="display:inline-flex;align-items:center;gap:8px;border:1px solid var(--fio);' +
          'border-radius:var(--r-sm);padding:8px 12px;font-size:12px">' +
          '<span style="width:16px;height:16px;border-radius:4px;background:' + c + ';border:1px solid var(--fio)"></span>' +
          c + '</span>';
      }).join('') +
      '<span class="dica" style="margin-left:6px">Sora nos títulos, Inter no texto. Os mesmos da landing.</span>' +
    '</div>');
};
