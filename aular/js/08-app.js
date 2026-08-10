/* =========================================================================
   AuLar — inicialização, menu lateral e troca de papel.
   ========================================================================= */
'use strict';

/* ------------------------------------------------------------------ menus */
var MENUS = {
  adotante: [
    { grupo:'Adotar' },
    { tela:'descobrir', ic:'🧭', txt:'Descobrir' },
    { tela:'meus-interesses', ic:'💚', txt:'Meus interesses' },
    { grupo:'Ajudar' },
    { tela:'doar', ic:'💛', txt:'Doar' },
    { tela:'lar-temporario', ic:'🏠', txt:'Ser lar temporário' },
    { grupo:'Comunidade' },
    { tela:'achados', ic:'🔎', txt:'Achados e perdidos' },
    { tela:'agenda', ic:'📅', txt:'Agenda' }
  ],
  ong: [
    { grupo:'Dia a dia' },
    { tela:'ong-painel', ic:'☀️', txt:'Painel' },
    { tela:'ong-pets', ic:'🐾', txt:'Animais' },
    { tela:'ong-saude', ic:'💉', txt:'Saúde e vacinas' },
    { tela:'ong-adocoes', ic:'🤝', txt:'Adoções' },
    { tela:'ong-lares', ic:'🏠', txt:'Lares temporários' },
    { grupo:'Recursos' },
    { tela:'ong-doacoes', ic:'💛', txt:'Doações' },
    { tela:'ong-estoque', ic:'🍽️', txt:'Estoque e ração' },
    { tela:'ong-transparencia', ic:'🔍', txt:'Prestação de contas' },
    { grupo:'Rede' },
    { tela:'ong-eventos', ic:'🎪', txt:'Feiras e eventos' },
    { tela:'ong-rede', ic:'🛡️', txt:'Rede de proteção' },
    { grupo:'Conta' },
    { tela:'ong-assinatura', ic:'💳', txt:'Meu plano' },
    { tela:'ong-config', ic:'⚙️', txt:'Configurações' },
    { grupo:'Vitrine pública' },
    { tela:'descobrir', ic:'🧭', txt:'Ver a vitrine' },
    { tela:'agenda', ic:'📅', txt:'Agenda' }
  ],
  plataforma: [
    { grupo:'Negócio' },
    { tela:'pl-painel', ic:'📊', txt:'Visão do dono' },
    { tela:'pl-ongs', ic:'🏢', txt:'ONGs e assinaturas' },
    { tela:'pl-cobranca', ic:'💳', txt:'Cobrança' },
    { grupo:'Crescimento' },
    { tela:'pl-monetizacao', ic:'💰', txt:'Monetização' },
    { tela:'pl-expansao', ic:'🗺️', txt:'Expansão' },
    { grupo:'Sistema' },
    { tela:'pl-config', ic:'⚙️', txt:'Configurações' },
    { grupo:'Ver como público' },
    { tela:'descobrir', ic:'🧭', txt:'Vitrine' },
    { tela:'doar', ic:'💛', txt:'Doar' },
    { tela:'achados', ic:'🔎', txt:'Achados e perdidos' }
  ]
};

function montarMenu(){
  var itens = MENUS[SESSAO.papel] || MENUS.adotante;
  var o = ongAtual();
  html('#side-nav', itens.map(function(i){
    if(i.grupo) return '<div class="nav-g">' + i.grupo + '</div>';
    var etiq = '';
    if(i.tela === 'ong-adocoes' && o){
      var q = filtrar(DB.interesses, function(x){ return x.ongId === o.id && x.etapa === 'interesse'; }).length;
      if(q) etiq = '<span class="tag">' + q + '</span>';
    }
    if(i.tela === 'ong-saude' && o){
      var a = filtrar(agendaVacinas(o.id, -60, 0), function(v){
        return difDias(v.previstaPara, isoHoje()) > 0; }).length;
      if(a) etiq = '<span class="tag">' + a + '</span>';
    }
    if(i.tela === 'pl-cobranca'){
      var inad = inadimplencia();
      if(inad.qtd) etiq = '<span class="tag">' + inad.qtd + '</span>';
    }
    if(i.tela === 'meus-interesses' && SESSAO.pessoaId){
      var m = filtrar(DB.interesses, function(x){ return x.pessoaId === SESSAO.pessoaId; }).length;
      if(m) etiq = '<span class="tag cinza">' + m + '</span>';
    }
    return '<button class="nav-i" data-tela="' + i.tela + '" onclick="ir(\'' + i.tela + '\')">' +
      '<span class="ic">' + i.ic + '</span><span>' + i.txt + '</span>' + etiq + '</button>';
  }).join(''));
  pintarNav(TELA_ATUAL);
}

function pintarTopo(){
  var nome, papel, av, cor = 'var(--grad-caramelo)';
  if(SESSAO.papel === 'ong'){
    var o = ongAtual();
    nome = o ? o.nome : '—'; papel = 'organização'; av = iniciais(nome);
    if(o) cor = o.cor;
  } else if(SESSAO.papel === 'plataforma'){
    nome = DB.plataforma.dono; papel = 'dono da plataforma'; av = iniciais(nome);
  } else {
    var p = pessoaAtual();
    nome = p ? p.nome : 'Visitante'; papel = 'adotante'; av = p ? iniciais(p.nome) : '👤';
  }
  html('#topo-eu',
    '<div class="nm">' + esc(truncar(nome, 24)) + '</div><div class="pp">' + papel + '</div>');
  var el = $('#topo-av');
  if(el){ el.textContent = av; el.style.background = cor; }
  // faixa de bloqueio
  var faixa = $('#faixa');
  if(SESSAO.papel === 'ong'){
    var og = ongAtual();
    if(og && og.situacao !== 'ativa'){
      var f = faturaAberta(og.id);
      faixa.className = 'faixa-bloq' + (og.situacao === 'bloqueada' ? ' faixa-al' : '');
      faixa.style.display = '';
      faixa.innerHTML = '<span>🔒</span><span>Conta <b>' + og.situacao + '</b> — ' + diasAtraso(og) +
        ' dias de atraso' + (f ? ' · ' + brl(f.valor) : '') + '</span>' +
        (f ? '<button class="b b-s" onclick="pagarFatura(\'' + f.id + '\',\'pix\');recarregar();pintarTopo()">' +
             'Pagar agora</button>' : '') +
        '<div class="espaco"></div>' +
        '<button class="b b-s" onclick="ir(\'ong-assinatura\')">Ver plano</button>';
      return;
    }
  }
  faixa.style.display = 'none';
  // notificações
  var pontoEl = $('#ponto-notif');
  if(pontoEl){
    var q = SESSAO.papel === 'ong' && SESSAO.ongId ? naoLidas(SESSAO.ongId) : 0;
    pontoEl.style.display = q ? '' : 'none';
  }
}

function abrirNotificacoes(){
  var lista = SESSAO.ongId ? notificacoesDa(SESSAO.ongId) : [];
  modal('🔔 Notificações',
    lista.length ? lista.slice(0,25).map(function(x){
      var IC = {ok:'✅', alerta:'⚠️', novo:'💚', doacao:'💛'};
      return '<div class="linha mb14" style="flex-wrap:nowrap;align-items:flex-start' +
        (x.lida?';opacity:.55':'') + '">' +
        '<span style="font-size:17px">' + (IC[x.tipo]||'🔔') + '</span>' +
        '<div><div class="s13">' + esc(x.texto) + '</div>' +
        '<div class="s11 c3">' + quandoTexto(x.quando) + '</div></div></div>';
    }).join('') : '<div class="vazio s13">Nada por aqui.</div>',
    '<button class="b b-f" onclick="marcarLidas();fecharModal()">Marcar todas como lidas</button>',
    'estreita');
}
function marcarLidas(){
  notificacoesDa(SESSAO.ongId).forEach(function(n){ n.lida = true; });
  salvar(); pintarTopo();
}

/* ------------------------------------------------------------------ login */
function pintarLogin(){
  var ongDona = filtrar(DB.ongs, function(o){ return o.dono; })[0] || DB.ongs[0];
  var petsN = filtrar(DB.pets, function(p){ return p.status !== 'adotado'; }).length;
  html('#login',
    '<div class="login-cx">' +
      '<div class="login-e">' +
        '<div class="linha mb14"><div class="logo">🐾</div>' +
        '<div><b style="font-size:22px;letter-spacing:-.03em">AuLar</b>' +
        '<div class="s11 c3" style="letter-spacing:.12em;text-transform:uppercase">' +
        'rede de adoção e gestão animal</div></div></div>' +
        '<h1>Todo focinho<br>merece um lar.</h1>' +
        '<p class="sub">Entre pelo perfil que quiser — dá para trocar a qualquer momento.</p>' +
        '<button class="perfil-b" onclick="entrar(\'adotante\')">' +
          '<span class="e">🧭</span><span><b>Quero adotar, doar ou ajudar</b>' +
          '<small>vitrine com match, doação, lar temporário e achados e perdidos</small></span></button>' +
        '<button class="perfil-b" onclick="entrar(\'ong\',\'' + ongDona.id + '\')">' +
          '<span class="e">🏢</span><span><b>Sou ONG ou protetor</b>' +
          '<small>' + esc(ongDona.nome) + ' — gestão completa dos animais</small></span></button>' +
        '<button class="perfil-b" onclick="entrar(\'plataforma\')">' +
          '<span class="e">📊</span><span><b>Sou dono da plataforma</b>' +
          '<small>assinaturas, cobrança, receita e expansão</small></span></button>' +
        '<p class="s11 c3 mt14">Demonstração com dados fictícios do Grande ABC. ' +
        'Tudo fica salvo só neste navegador.</p>' +
      '</div>' +
      '<div class="login-d">' +
        '<div class="rot mb14">A demonstração já vem com</div>' +
        '<div class="g g2">' +
          numLogin(DB.ongs.length, 'ONGs no ABC') +
          numLogin(petsN, 'animais cadastrados') +
          numLogin(DB.adocoes.length, 'adoções feitas') +
          numLogin(DB.doacoes.length, 'doações registradas') +
        '</div>' +
        '<div class="sep"></div>' +
        '<div class="rot mb8">O que dá para fazer</div>' +
        ['🧭 Deslizar como no Tinder — com nota de compatibilidade de verdade',
         '💉 Calendário de vacinas que se monta sozinho pelo protocolo',
         '🤝 Funil de adoção do interesse ao termo assinado',
         '💛 Doação por Pix, cartão, recorrente e apadrinhamento',
         '🎁 Lista de presentes de ração em vez de saco na porta',
         '🛡️ Rede de proteção compartilhada entre as ONGs',
         '💳 Bloqueio automático por falta de pagamento',
         '💰 15 formas de monetizar, com simulador'
        ].map(function(t){ return '<div class="s12 c2 mb8">' + t + '</div>'; }).join('') +
      '</div>' +
    '</div>');
}
function numLogin(v, r){
  return '<div><div class="num-grande ca">' + n(v) + '</div><div class="s11 c3">' + r + '</div></div>';
}
function entrar(papel, ongId){
  SESSAO.papel = papel;
  SESSAO.ongId = papel === 'ong' ? ongId : null;
  if(papel === 'adotante' && !SESSAO.pessoaId){
    // entra como uma pessoa da demonstração que já tem perfil preenchido
    var demo = filtrar(DB.pessoas, function(p){ return p.perfil; })[0];
    SESSAO.pessoaId = demo ? demo.id : null;
  }
  salvarSessao();
  $('#login').style.display = 'none';
  montarMenu(); pintarTopo();
  ir(papel === 'ong' ? 'ong-painel' : (papel === 'plataforma' ? 'pl-painel' : 'descobrir'));
}
function trocarPapel(){
  var ongs = DB.ongs;
  modal('Trocar de perfil',
    '<p class="s13 c2">Veja a mesma plataforma pelos olhos de cada um.</p>' +
    '<button class="perfil-b" onclick="fecharModal();entrar(\'adotante\')">' +
      '<span class="e">🧭</span><span><b>Adotante</b><small>vitrine, doações e lar temporário</small></span></button>' +
    '<button class="perfil-b" onclick="fecharModal();entrar(\'plataforma\')">' +
      '<span class="e">📊</span><span><b>Dono da plataforma</b><small>o negócio inteiro</small></span></button>' +
    '<div class="rot mt20 mb8">Entrar como ONG</div>' +
    ongs.map(function(o){
      return '<button class="perfil-b" onclick="fecharModal();entrar(\'ong\',\'' + o.id + '\')">' +
        '<span class="e" style="background:' + o.cor + ';color:#fff">' + iniciais(o.nome) + '</span>' +
        '<span><b>' + esc(o.nome) + '</b><small>' + esc(o.cidade) + ' · plano ' + planoDa(o).nome +
        ' · ' + o.situacao + '</small></span></button>';
    }).join(''),
    '<button class="b b-f" onclick="fecharModal()">Fechar</button>', 'estreita');
}

/* ------------------------------------------------------------------ boot */
function iniciar(){
  aplicarTemaSalvo();

  if(!carregar()){
    DB = semear();
    salvar();
  }
  // data simulada
  try{
    var h = localStorage.getItem(CHAVE_HOJE);
    if(h) HOJE = data(h);
  }catch(e){}

  // migrações leves: garante que campos novos existam em bases antigas
  ['swipes','notificacoes','presentes','listaRisco','patrocinadores','tarefas','movEstoque']
    .forEach(function(k){ if(!DB[k]) DB[k] = []; });

  emitirFaturasDoMes();
  aplicarRegua();

  try{
    var s = localStorage.getItem(CHAVE_SESSAO);
    if(s) SESSAO = JSON.parse(s);
  }catch(e){}

  pintarLogin();
  if(SESSAO.papel){
    $('#login').style.display = 'none';
    montarMenu(); pintarTopo();
    var inicial = SESSAO.papel === 'ong' ? 'ong-painel' :
                  (SESSAO.papel === 'plataforma' ? 'pl-painel' : 'descobrir');
    ir(inicial);
  }

  // atalho: Esc fecha o modal
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape') fecharModal();
  });
}
/* Se os scripts entrarem depois que o documento já carregou (o que acontece
   quando a página é montada num único arquivo), o DOMContentLoaded já passou. */
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
else iniciar();
