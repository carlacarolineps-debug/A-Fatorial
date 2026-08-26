/* =====================================================================
   A entrada.

   A pagina nao enxerga os proprios cabecalhos, entao quem diz o e-mail
   autenticado pelo Cloudflare Access e a rota /eu do servidor. Tres
   respostas possiveis, e cada uma leva a uma porta diferente:

     200  o Access identificou. O papel vem de iqv_usuarios, por e-mail.
     503  o Access ainda nao foi ligado no Worker. Nao ha o que conferir,
          e fingir um login aqui nao protegeria nada: a porta diz isso e
          deixa escolher o papel para navegar, avisando que e provisorio.
     401  passou pelo Access mas o token nao vale, ou nao ha token.
   ===================================================================== */

async function lerEu() {
  try {
    const r = await fetch('/eu', { headers: { accept: 'application/json' }, cache: 'no-store' });
    let corpo = null;
    try { corpo = await r.json(); } catch (e) { corpo = null; }
    return { status: r.status, corpo: corpo };
  } catch (e) {
    return { status: 0, corpo: null };
  }
}

function entrar(papel, email, nome, origem) {
  EU.papel = papel;
  EU.email = email || null;
  EU.nome = nome || (email ? String(email).split('@')[0] : 'Visitante');
  EU.origem = origem;

  porId('porta').hidden = true;
  porId('app').hidden = false;
  document.getElementById('app').classList.toggle('sozinho', papel === 'cliente');

  const p = porChave(PAPEIS, papel);
  texto('quem-nome', EU.nome);
  texto('quem-papel', p ? p.nome : papel);

  montarMenu();
  irPara((PERMISSOES[papel] || ['cliente'])[0]);
}

function escolherPapelProvisorio(papel) { entrar(papel, null, null, 'provisorio'); }

function pintarPorta(titulo, texto_, corpo) {
  escrever('porta-titulo', titulo);
  texto('porta-texto', texto_);
  escrever('porta-corpo', corpo);
}

function botoesDePapel() {
  return PAPEIS.map(function (p) {
    return '<button class="papel" onclick="escolherPapelProvisorio(\'' + p.k + '\')">' +
           '<span class="ic">' + p.ic + '</span>' +
           '<span><b>' + esc(p.nome) + '</b><span>' + esc(p.resumo) + '</span></span></button>';
  }).join('');
}

async function abrirPorta() {
  pintarPorta('Entrando no <b>sistema</b>', 'Conferindo o seu acesso.', '');

  const r = await lerEu();

  // Servidor identificou a pessoa.
  if (r.status === 200 && r.corpo && r.corpo.email) {
    const u = acharUsuario(r.corpo.email);
    if (u && u.papel) { entrar(u.papel, r.corpo.email, u.nome, 'access'); return; }

    // E-mail que passa no Access mas nao esta na lista NAO vira equipe por
    // descuido, e nao cai numa tela qualquer.
    pintarPorta(
      'Seu acesso ainda não foi <b>liberado</b>',
      'Você entrou pelo login protegido, mas ainda não tem papel definido aqui dentro.',
      aviso('info', esc(r.corpo.email),
        'Peça para quem cuida do sistema abrir a tela "A casa" e definir o seu papel. ' +
        'Passar pelo login não define sozinho o que você pode ver: essa parte é do sistema, não do Access.'));
    return;
  }

  // O Access ainda nao esta ligado no Worker.
  if (r.status === 503) {
    pintarPorta(
      'O login protegido ainda não está <b>ligado</b>',
      'Escolha o perfil para navegar. Isso é provisório e não protege nada.',
      aviso('atencao', 'Enquanto o Cloudflare Access não estiver configurado, esta área fica aberta.',
        'Qualquer pessoa com o endereço entra e escolhe um perfil, inclusive Equipe. ' +
        'Não guarde informação de cliente aqui até o passo do Access estar feito: o caminho está no DEPLOY.md.') +
      botoesDePapel());
    return;
  }

  // Sem servidor: arquivo aberto direto do computador, ou rede fora.
  if (r.status === 0) {
    pintarPorta(
      'Não consegui falar com o <b>servidor</b>',
      'O sistema precisa do endereço publicado para saber quem é você.',
      aviso('alerta', 'Se você abriu este arquivo direto do computador, ele não funciona assim.',
        'Abra pelo endereço do site, em ideiaquevende.com.br/sistema/. ' +
        'Se já estava nele, foi a rede que falhou: atualize a página.') +
      botoesDePapel());
    return;
  }

  // 401 e o resto.
  pintarPorta(
    'Seu login <b>venceu</b>',
    'O servidor não reconheceu a sua sessão.',
    aviso('atencao', 'Recarregue a página para entrar de novo.',
      'Se continuar aparecendo, saia do login protegido em /cdn-cgi/access/logout e entre outra vez.'));
}

abrirPorta();
