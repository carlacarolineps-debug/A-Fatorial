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

function casaPodeEditar() { return EU.papel === 'equipe'; }

function casaLinhaPessoa(u, editavel) {
  const souEu = EU.email && String(u.email || '').toLowerCase() === String(EU.email).toLowerCase();
  return '<tr>' +
    '<td><b>' + esc(u.nome || 'sem nome') + '</b>' +
      (souEu ? ' <span class="eti eti-marca">você</span>' : '') + '</td>' +
    '<td style="font-size:12.5px;color:var(--tinta-2)">' + esc(u.email || '') + '</td>' +
    '<td>' + (editavel
      ? '<select class="campo campo-sm" onchange="casaMudarPapel(\'' + esc(u.id) + '\', this.value)">' +
        PAPEIS.map(function (p) {
          return '<option value="' + p.k + '"' + (p.k === u.papel ? ' selected' : '') + '>' + esc(p.nome) + '</option>';
        }).join('') + '</select>'
      : '<span class="eti eti-neutra">' + esc((porChave(PAPEIS, u.papel) || {}).nome || u.papel) + '</span>') + '</td>' +
    '<td style="text-align:right">' + (editavel && !souEu
      ? '<button class="bt bt-linha bt-sm" onclick="casaRemover(\'' + esc(u.id) + '\')">Tirar da lista</button>'
      : '') + '</td>' +
  '</tr>';
}

function casaMudarPapel(id, papel) {
  const lista = casaUsuarios();
  const u = lista.find(function (x) { return x.id === id; });
  if (!u) return;
  u.papel = papel;
  casaGravarUsuarios(lista);
}

function casaRemover(id) {
  const lista = casaUsuarios();
  const u = lista.find(function (x) { return x.id === id; });
  if (!u) return;
  // A confirmacao diz o que o botao NAO faz, que e a parte que engana.
  const certeza = window.prompt(
    'Tirar ' + (u.nome || u.email) + ' desta lista NÃO tira o acesso dela ao endereço. ' +
    'Ela vai continuar entrando pelo Cloudflare Access, só que sem tela nenhuma.\n\n' +
    'Para desligar de verdade, remova a pessoa da aplicação "sistema" no painel da Cloudflare.\n\n' +
    'Escreva TIRAR para continuar:');
  if (String(certeza || '').trim().toUpperCase() !== 'TIRAR') return;
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
  // A Equipe nao pode se trancar para fora do configurador.
  if (i >= 0 && papel === 'equipe' && tela === 'casa') return;
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

function casaLimparResiduo() {
  const achadas = casaContarResiduo();
  if (!achadas.length) return;
  const certeza = window.prompt(
    'Isto apaga ' + achadas.length + ' chave(s) do sistema do A! Fatorial guardadas neste navegador.\n\n' +
    achadas.join('\n') + '\n\n' +
    'Se aquele sistema ainda for usado por alguém neste mesmo computador, o trabalho dele se perde. ' +
    'Não há como desfazer.\n\nEscreva APAGAR para continuar:');
  if (String(certeza || '').trim().toUpperCase() !== 'APAGAR') return;
  try { achadas.forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
  DESENHO.casa();
}

/* ------------------------------------------------------------------ */

DESENHO.casa = function () {
  const editavel = casaPodeEditar();
  const lista = casaUsuarios();

  // 1. pessoas
  escrever('casaAvisoAccess', aviso('info',
    'Quem abre e fecha a porta é o Cloudflare Access, não esta lista.',
    'Tirar alguém daqui não tira o acesso dela ao endereço: ela continua entrando e passa a ver um aviso, sem tela nenhuma. ' +
    'O desligamento de verdade é remover a pessoa da aplicação "sistema" no painel da Cloudflare. ' +
    'E o Access não sabe o que é Equipe, Colaborador ou Cliente: essa parte é do sistema, e é decidida aqui.'));

  escrever('casaPessoas', lista.length
    ? lista.map(function (u) { return casaLinhaPessoa(u, editavel); }).join('')
    : vazio('Só existe você aqui. Cadastre quem vai usar antes de distribuir o endereço: ' +
            'quem passa pelo Access e não está nesta lista entra sem tela nenhuma e vê um aviso pedindo para falar com você.', 4));

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
      return '<div style="border:1px solid var(--linha);border-radius:var(--r-sm);padding:16px">' +
        '<b style="color:var(--branco);font-size:14px">' + esc(p.nome) + '</b>' +
        '<p class="dica" style="margin:4px 0 12px">' + esc(p.resumo) + '</p>' +
        TELAS.map(function (t) {
          const marcada = (PERMISSOES[p.k] || []).indexOf(t.k) >= 0;
          const travada = (p.k === 'equipe' && t.k === 'casa');
          return '<label style="display:flex;align-items:center;gap:8px;font-size:12.5px;padding:3px 0;color:' +
            (marcada ? 'var(--tinta)' : 'var(--tinta-4)') + '">' +
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
          esc(ULTIMA_FALHA_GRAVACAO.chave) + '. Gravação que falha é silenciosa por padrão, e é por isso que esta tela avisa.')
      : '') +
    (cheio
      ? aviso('atencao', 'O navegador está em ' + uso.porcento + '% da capacidade.',
          'Passando disso, gravar começa a falhar. Texto longo deve ir por link, não por campo dentro do sistema. ' +
          'Guarde uma cópia antes de continuar escrevendo.')
      : '') +
    '<div class="numeros" style="margin-bottom:0">' +
      '<div class="numero' + (cheio ? ' puxa' : '') + '"><div class="v">' + uso.porcento + '%</div>' +
        '<div class="l">Do navegador ocupado</div>' +
        '<div class="obs">' + Math.round(uso.bytes / 1024) + ' KB nas chaves iqv_</div></div>' +
      '<div class="numero"><div class="v">' + iqvLer(CHAVES.projetos, []).length + '</div>' +
        '<div class="l">Projetos guardados aqui</div>' +
        '<div class="obs">só neste navegador</div></div>' +
      '<div class="numero"><div class="v">' + lista.length + '</div>' +
        '<div class="l">Pessoas cadastradas</div>' +
        '<div class="obs">o acesso é do Access</div></div>' +
    '</div>' +
    '<p class="dica" style="margin-top:14px">As aplicações são a exceção: elas vivem no servidor e são as mesmas para todo mundo. ' +
    'Tudo o mais nesta lista existe só neste navegador, e some se alguém limpar os dados do site.</p>');

  // 4. residuo do sistema anterior
  const residuo = casaContarResiduo();
  escrever('casaResiduo', residuo.length
    ? aviso('atencao', 'Este navegador ainda guarda ' + residuo.length + ' chave(s) do sistema do A! Fatorial.',
        'Aquele sistema morou neste mesmo endereço até 26 de agosto. Este aqui nunca lê nem escreve nessas chaves, ' +
        'então elas não atrapalham nada: só ocupam espaço. Apagar é decisão sua e não tem volta.') +
      (editavel ? '<button class="bt bt-linha bt-sm" onclick="casaLimparResiduo()">Apagar o resíduo</button>' : '')
    : '<p class="dica">Nada do sistema anterior neste navegador. Se um dia aparecer, o aviso surge aqui, ' +
      'e apagar continua sendo escolha escrita, nunca automática.</p>');

  // 5. marca
  escrever('casaMarca',
    '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">' +
      ['#08080a', '#ff8309', '#f6f4ef'].map(function (c) {
        return '<span style="display:inline-flex;align-items:center;gap:8px;border:1px solid var(--linha);' +
          'border-radius:var(--r-sm);padding:8px 12px;font-size:12px">' +
          '<span style="width:16px;height:16px;border-radius:4px;background:' + c + ';border:1px solid var(--linha)"></span>' +
          c + '</span>';
      }).join('') +
      '<span class="dica" style="margin-left:6px">Sora nos títulos, Inter no texto. Os mesmos da landing.</span>' +
    '</div>');
};
