/* =========================================================================
   AuLar — contas de usuário, papéis, presença e sincronização ao vivo.

   O que "várias pessoas ao mesmo tempo" exige, e o que está resolvido aqui:

   1. CADA PESSOA TEM A PRÓPRIA CONTA        ✔ resolvido nesta camada
      E-mail e senha, papel dentro da organização e permissão por tela.
      Antes o sistema só perguntava "você é ONG ou adotante?" — agora ele
      sabe QUEM está mexendo, e cada ação fica assinada.

   2. VER QUEM ESTÁ ONLINE AGORA             ✔ resolvido nesta camada
      Cada aba anuncia presença e em que tela está. Some sozinho ao fechar.

   3. UM VÊ O QUE O OUTRO FAZ, NA HORA       ✔ resolvido entre abas/janelas
      BroadcastChannel + evento de storage. Abra o sistema em duas janelas,
      cadastre um animal numa: a outra atualiza sozinha.

   4. ENTRE COMPUTADORES DIFERENTES          ✖ exige servidor — sem exceção
      Dois navegadores em máquinas distintas não compartilham memória. Isso
      não é limitação de esforço, é como a web funciona: precisa de um banco
      no meio. O schema Postgres completo, com isolamento por organização
      (RLS), está em servidor/schema.sql, e o contrato que esta camada já
      usa foi desenhado para apontar para lá trocando a configuração.
   ========================================================================= */
'use strict';

/* ------------------------------------------------------------------ papéis */
var PAPEIS = {
  dono: { nome:'Dono(a) da conta', cor:'var(--caramelo)',
    o_que:'Acesso total, incluindo plano, cobrança e equipe.', telas:'*' },
  gestor: { nome:'Gestor(a)', cor:'var(--verde)',
    o_que:'Opera tudo no dia a dia, menos plano, cobrança e equipe.',
    telas:['ong-painel','ong-pets','ong-saude','ong-adocoes','ong-lares','ong-doacoes',
           'ong-estoque','ong-transparencia','ong-selo','ong-eventos','ong-rede'] },
  voluntario: { nome:'Voluntário(a)', cor:'var(--uva)',
    o_que:'Cadastra animais, toca o funil de adoção e ajuda nas feiras.',
    telas:['ong-painel','ong-pets','ong-adocoes','ong-lares','ong-eventos'] },
  veterinario: { nome:'Veterinário(a)', cor:'var(--info)',
    o_que:'Vê os animais e cuida da carteira de vacinas. Não acessa dinheiro.',
    telas:['ong-painel','ong-pets','ong-saude'] }
};
function papelDe(u){ return PAPEIS[u && u.papel] || PAPEIS.voluntario; }

/** A tela está liberada para quem está logado? */
function podeVerTela(chave){
  if(SESSAO.papel !== 'ong') return true;          // adotante e plataforma têm menu próprio
  var u = usuarioAtual();
  if(!u) return true;                              // sessão antiga, sem conta: não trava
  var p = papelDe(u);
  if(p.telas === '*') return true;
  if(chave.indexOf('ong-') !== 0) return true;     // telas públicas (vitrine, agenda)
  return p.telas.indexOf(chave) >= 0;
}
function usuarioAtual(){
  return SESSAO.usuarioId ? achar(DB.usuarios || [], SESSAO.usuarioId) : null;
}
function usuariosDa(ongId){
  return filtrar(DB.usuarios || [], function(u){ return u.ongId === ongId; });
}

/* ------------------------------------------------------------------ senha */
/* SHA-256 em JavaScript puro. crypto.subtle não existe em file://, que é
   justamente como este arquivo costuma ser aberto.
   Isto NÃO é segurança de verdade: senha em navegador é sempre teatro. Na
   produção quem guarda e confere a senha é o servidor (Supabase Auth), com
   hash lento e salt por usuário. Aqui serve para o formato ficar certo. */
var SHA256 = (function(){
  var K = [];
  (function(){
    function raiz(n_, p){ return Math.pow(n_, 1/p) % 1; }
    var primos = [2,3,5,7,11,13,17,19,23,29,31,37,41,43,47,53,59,61,67,71,73,79,83,89,97,
                  101,103,107,109,113,127,131,137,139,149,151,157,163,167,173,179,181,191,
                  193,197,199,211,223,227,229,233,239,241,251,257,263,269,271,277,281,283,
                  293,307,311];
    for(var i=0;i<64;i++) K[i] = Math.floor(raiz(primos[i], 3) * 4294967296) | 0;
  })();
  function rotr(x, n_){ return (x >>> n_) | (x << (32 - n_)); }
  return function(msg){
    var H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
    var bytes = [], i, j;
    for(i=0;i<msg.length;i++){
      var c = msg.charCodeAt(i);
      if(c < 128) bytes.push(c);
      else if(c < 2048) bytes.push(192|(c>>6), 128|(c&63));
      else bytes.push(224|(c>>12), 128|((c>>6)&63), 128|(c&63));
    }
    var bits = bytes.length * 8;
    bytes.push(0x80);
    while(bytes.length % 64 !== 56) bytes.push(0);
    for(i=7;i>=0;i--) bytes.push((bits / Math.pow(2, i*8)) & 0xFF);

    var w = new Array(64);
    for(i=0;i<bytes.length;i+=64){
      for(j=0;j<16;j++) w[j] = (bytes[i+j*4]<<24)|(bytes[i+j*4+1]<<16)|(bytes[i+j*4+2]<<8)|bytes[i+j*4+3];
      for(j=16;j<64;j++){
        var s0 = rotr(w[j-15],7) ^ rotr(w[j-15],18) ^ (w[j-15]>>>3);
        var s1 = rotr(w[j-2],17) ^ rotr(w[j-2],19) ^ (w[j-2]>>>10);
        w[j] = (w[j-16] + s0 + w[j-7] + s1) | 0;
      }
      var a=H[0],b=H[1],c2=H[2],d=H[3],e=H[4],f=H[5],g=H[6],h=H[7];
      for(j=0;j<64;j++){
        var S1 = rotr(e,6) ^ rotr(e,11) ^ rotr(e,25);
        var ch = (e & f) ^ (~e & g);
        var t1 = (h + S1 + ch + K[j] + w[j]) | 0;
        var S0 = rotr(a,2) ^ rotr(a,13) ^ rotr(a,22);
        var maj = (a & b) ^ (a & c2) ^ (b & c2);
        var t2 = (S0 + maj) | 0;
        h=g; g=f; f=e; e=(d+t1)|0; d=c2; c2=b; b=a; a=(t1+t2)|0;
      }
      H[0]=(H[0]+a)|0; H[1]=(H[1]+b)|0; H[2]=(H[2]+c2)|0; H[3]=(H[3]+d)|0;
      H[4]=(H[4]+e)|0; H[5]=(H[5]+f)|0; H[6]=(H[6]+g)|0; H[7]=(H[7]+h)|0;
    }
    return H.map(function(x){ return ('00000000' + (x>>>0).toString(16)).slice(-8); }).join('');
  };
})();
function hashSenha(senha, salt){ return SHA256('aular$' + (salt||'') + '$' + senha); }

/* ------------------------------------------------------------------ login */
function autenticar(email, senha){
  var e = String(email||'').trim().toLowerCase();
  var u = filtrar(DB.usuarios || [], function(x){ return x.email.toLowerCase() === e; })[0];
  if(!u) return { erro:'Não encontrei ninguém com esse e-mail.' };
  if(!u.ativo) return { erro:'Este acesso foi desativado. Fale com quem administra a conta.' };
  if(u.senhaHash !== hashSenha(senha, u.id)) return { erro:'Senha incorreta.' };
  return { usuario:u };
}
function entrarComoUsuario(u){
  SESSAO.usuarioId = u.id;
  u.ultimoAcesso = new Date().toISOString();
  salvar();
  if(u.ongId){ entrar('ong', u.ongId); }
  else if(u.plataforma){ entrar('plataforma'); }
  else { SESSAO.pessoaId = u.pessoaId || null; entrar('adotante'); }
  registrarPresenca();
  aviso('Bem-vinda de volta, ' + u.nome.split(' ')[0] + '! 🐾', 'ok');
}
function sairDaConta(){
  removerPresenca();
  SESSAO = { papel:null, ongId:null, pessoaId:null, usuarioId:null };
  salvarSessao();
  $('#login').style.display = '';
  pintarLogin();
}

/* ------------------------------------------------------------------ presença */
/* Cada aba anuncia que está viva. A lista fica no localStorage para as outras
   abas lerem, e some sozinha depois de 40s sem sinal. */
var ABA_ID = 'aba_' + Math.random().toString(36).slice(2, 9);
var CHAVE_PRESENCA = 'aular_presenca';
var PULSO = null;

function lerPresenca(){
  try{
    var p = JSON.parse(localStorage.getItem(CHAVE_PRESENCA) || '{}');
    var agora = Date.now(), limpo = {};
    for(var k in p) if(agora - p[k].quando < 40000) limpo[k] = p[k];
    return limpo;
  }catch(e){ return {}; }
}
function registrarPresenca(){
  var u = usuarioAtual();
  var p = lerPresenca();
  p[ABA_ID] = {
    quando: Date.now(),
    nome: u ? u.nome : (pessoaAtual() ? pessoaAtual().nome : 'Visitante'),
    papel: u ? papelDe(u).nome : (SESSAO.papel || 'visitante'),
    ongId: SESSAO.ongId || null,
    tela: TELA_ATUAL || '—'
  };
  try{ localStorage.setItem(CHAVE_PRESENCA, JSON.stringify(p)); }catch(e){}
  avisarOutrasAbas('presenca');
}
function removerPresenca(){
  var p = lerPresenca(); delete p[ABA_ID];
  try{ localStorage.setItem(CHAVE_PRESENCA, JSON.stringify(p)); }catch(e){}
  avisarOutrasAbas('presenca');
}
/** Quem está online agora na mesma organização (fora esta aba). */
function quemEstaOnline(){
  var p = lerPresenca(), r = [];
  for(var k in p){
    if(k === ABA_ID) continue;
    if(SESSAO.ongId && p[k].ongId !== SESSAO.ongId) continue;
    r.push(p[k]);
  }
  return r;
}

/* ------------------------------------------------------------------ sincronização */
/* Duas vias, porque nenhuma sozinha cobre tudo:
   - BroadcastChannel avisa as outras abas na hora (mesma origem).
   - o evento 'storage' cobre navegadores sem BroadcastChannel e janelas
     abertas antes deste código existir. */
var CANAL = null;
try{ CANAL = new BroadcastChannel('aular'); }catch(e){ CANAL = null; }

function avisarOutrasAbas(tipo){
  var msg = { tipo:tipo, origem:ABA_ID, rev: DB && DB.rev ? DB.rev : 0, quando:Date.now() };
  if(CANAL) try{ CANAL.postMessage(msg); }catch(e){}
  try{ localStorage.setItem('aular_ping', JSON.stringify(msg)); }catch(e){}
}
function receberDeOutraAba(msg){
  if(!msg || msg.origem === ABA_ID) return;
  if(msg.tipo === 'presenca'){ pintarPresenca(); return; }
  if(msg.tipo === 'dados'){
    // outra pessoa gravou: recarrega a base e redesenha a tela atual
    var revAntes = DB.rev || 0;
    if(carregar() && (DB.rev || 0) !== revAntes){
      if(TELA_ATUAL) recarregar();
      montarMenu(); pintarTopo(); pintarPresenca();
      aviso('🔄 ' + (msg.autor || 'Outra pessoa') + ' atualizou os dados.', 'car');
    }
  }
}
function ligarSincronizacao(){
  if(CANAL) CANAL.onmessage = function(ev){ receberDeOutraAba(ev.data); };
  window.addEventListener('storage', function(ev){
    if(ev.key === 'aular_ping' && ev.newValue){
      try{ receberDeOutraAba(JSON.parse(ev.newValue)); }catch(e){}
    }
  });
  window.addEventListener('beforeunload', removerPresenca);
  registrarPresenca();
  PULSO = setInterval(function(){ registrarPresenca(); pintarPresenca(); }, 12000);
}

/** Chamado depois de cada gravação, por salvar(). */
function propagarGravacao(){
  var u = usuarioAtual();
  var msg = { tipo:'dados', origem:ABA_ID, rev: DB.rev || 0,
              autor: u ? u.nome.split(' ')[0] : null, quando:Date.now() };
  if(CANAL) try{ CANAL.postMessage(msg); }catch(e){}
  try{ localStorage.setItem('aular_ping', JSON.stringify(msg)); }catch(e){}
}

/* ------------------------------------------------------------------ topo: quem está online */
function pintarPresenca(){
  var el = $('#presenca'); if(!el) return;
  var gente = quemEstaOnline();
  if(!gente.length){ el.innerHTML = ''; el.title = ''; return; }
  el.title = gente.map(function(g){ return g.nome + ' — ' + g.papel; }).join('\n');
  el.innerHTML = gente.slice(0,4).map(function(g){
    return '<span class="pres" title="' + esc(g.nome) + '">' + iniciais(g.nome) + '</span>';
  }).join('') + (gente.length > 4 ? '<span class="pres mais">+' + (gente.length-4) + '</span>' : '');
  el.onclick = verQuemEstaOnline;
}
function verQuemEstaOnline(){
  var gente = quemEstaOnline();
  var u = usuarioAtual();
  modal('👥 Quem está usando agora',
    '<div class="linha mb14" style="flex-wrap:nowrap"><span class="pres" style="width:34px;height:34px">' +
      (u ? iniciais(u.nome) : '👤') + '</span>' +
      '<div><b>' + esc(u ? u.nome : 'Você') + '</b><div class="s11 c3">você, nesta janela · ' +
      esc(TELA_ATUAL || '') + '</div></div></div>' +
    (gente.length ? gente.map(function(g){
      return '<div class="linha mb14" style="flex-wrap:nowrap">' +
        '<span class="pres" style="width:34px;height:34px">' + iniciais(g.nome) + '</span>' +
        '<div><b>' + esc(g.nome) + '</b><div class="s11 c3">' + esc(g.papel) + ' · em ' +
        esc(g.tela) + '</div></div></div>';
    }).join('') : '<div class="vazio s13">Só você por aqui neste momento.</div>') +
    '<div class="aviso aviso-i mb0 mt14"><span class="em">🔄</span><div>' +
      '<b>Teste você mesma</b>Abra o sistema numa segunda janela do navegador e cadastre um animal. ' +
      'Esta janela atualiza sozinha, sem apertar nada.' +
      '<br><span class="s11">Entre computadores diferentes isso exige um servidor — ' +
      'veja <b>servidor/schema.sql</b> no projeto.</span></div></div>',
    '<button class="b b-f" onclick="fecharModal()">Fechar</button>', 'estreita');
}

/* ------------------------------------------------------------------ equipe */
registrarTela('ong-equipe', {
  titulo:'Equipe e acessos', sub:'quem entra, com qual permissão',
  precisaAtiva:true,
  render:function(){
    var o = ongAtual();
    var eu = usuarioAtual();
    var time = usuariosDa(o.id);
    var souDono = !eu || eu.papel === 'dono';
    var online = quemEstaOnline();

    return '' +
    '<div class="aviso aviso-i"><span class="em">👥</span><div>' +
      '<b>Cada pessoa com a própria conta</b>Ninguém precisa dividir senha. Cada uma entra com o ' +
      'próprio e-mail, vê só o que o papel dela permite, e cada ação fica assinada no histórico — ' +
      'o que importa quando alguém pergunta "quem foi que marcou este animal como adotado?".</div></div>' +

    '<div class="g g4">' +
      kpiCard('Pessoas na equipe', time.length, '👥', '') +
      kpiCard('Ativas', filtrar(time, function(u){ return u.ativo; }).length, '✅', 'v') +
      kpiCard('Online agora', online.length + 1, '🟢', 'v') +
      kpiCard('Limite do plano', planoDa(o).limiteUsuarios, '🎫', '') +
    '</div>' +

    '<div class="cx"><div class="cx-h"><div><h3>Equipe</h3></div>' +
      '<div class="dir">' + (souDono
        ? '<button class="b b-p b-s" onclick="convidarPessoa()">+ Convidar pessoa</button>'
        : '<span class="et">só o dono da conta convida</span>') + '</div></div>' +
      '<div class="rolar-x"><table class="tb"><thead><tr><th>Pessoa</th><th>Papel</th>' +
      '<th>Último acesso</th><th>Situação</th><th></th></tr></thead><tbody>' +
      time.map(function(u){
        var p = papelDe(u);
        var estaOnline = filtrar(online, function(g){ return g.nome === u.nome; }).length > 0;
        return '<tr><td><div class="linha" style="flex-wrap:nowrap">' +
          '<span class="pres' + (estaOnline ? ' on' : '') + '">' + iniciais(u.nome) + '</span>' +
          '<div><b class="s13">' + esc(u.nome) + (u.id === (eu && eu.id) ? ' <span class="et">você</span>' : '') +
          '</b><div class="s11 c3">' + esc(u.email) + '</div></div></div></td>' +
          '<td><span class="et" style="background:' + p.cor + '1f;color:' + p.cor + '">' + p.nome + '</span></td>' +
          '<td class="s12 c2">' + (estaOnline ? '<b class="ok">online agora</b>' :
            (u.ultimoAcesso ? quandoTexto(u.ultimoAcesso.slice(0,10)) : 'nunca entrou')) + '</td>' +
          '<td>' + (u.ativo ? '<span class="et et-ok">ativa</span>' : '<span class="et">desativada</span>') + '</td>' +
          '<td class="td">' + (souDono && u.papel !== 'dono'
            ? '<button class="b b-f b-s" onclick="editarPessoa(\'' + u.id + '\')">Editar</button>'
            : '') + '</td></tr>';
      }).join('') + '</tbody></table></div></div>' +

    '<div class="cx"><div class="cx-h"><div><h3>O que cada papel enxerga</h3>' +
      '<div class="desc">a permissão é aplicada na entrada da tela, não só escondendo o menu</div></div></div>' +
      '<div class="g g4">' + Object.keys(PAPEIS).map(function(k){
        var p = PAPEIS[k];
        return '<div class="cx plana" style="background:var(--sup-2);margin:0;border-top:3px solid ' + p.cor + '">' +
          '<div class="neg s13">' + p.nome + '</div>' +
          '<div class="s12 c2 mt8">' + p.o_que + '</div>' +
          '<div class="s11 c3 mt8">' + (p.telas === '*' ? 'todas as telas' :
            p.telas.length + ' telas') + '</div></div>';
      }).join('') + '</div></div>' +

    '<div class="cx"><div class="cx-h"><div><h3>Histórico assinado</h3>' +
      '<div class="desc">quem fez o quê, e quando</div></div></div>' +
      (function(){
        var ats = filtrar(DB.atividades, function(a){ return a.ongId === o.id; }).slice(0,15);
        if(!ats.length) return '<div class="vazio s12">Sem movimento ainda</div>';
        return '<div class="tl">' + ats.map(function(a){
          return '<div class="tl-i ok"><div class="qd">' + quandoTexto(a.quando) +
            (a.autor ? ' · <b>' + esc(a.autor) + '</b>' : '') + '</div>' +
            '<div class="ds">' + esc(a.texto) + '</div></div>';
        }).join('') + '</div>';
      })() + '</div>';
  }
});
function convidarPessoa(){
  var o = ongAtual();
  var lim = planoDa(o).limiteUsuarios;
  if(usuariosDa(o.id).length >= lim){
    aviso('Seu plano permite ' + lim + ' pessoas. Mude de plano para convidar mais.', 'err'); return;
  }
  modal('Convidar pessoa para a equipe',
    '<div class="g g2">' +
      campo('Nome','cv-nome','') +
      campo('E-mail','cv-email','') +
    '</div>' +
    '<div class="f mt14"><label>Papel</label><div class="opcoes" id="cv-papel">' +
      Object.keys(PAPEIS).filter(function(k){ return k !== 'dono'; }).map(function(k, i){
        return '<button class="op ' + (i===0?'on car':'') + '" data-v="' + k + '" ' +
          'onclick="$$(\'#cv-papel .op\').forEach(function(b){b.classList.remove(\'on\',\'car\')});' +
          'this.classList.add(\'on\',\'car\')">' + PAPEIS[k].nome + '</button>'; }).join('') + '</div>' +
      '<div class="aj" id="cv-desc">' + PAPEIS.gestor.o_que + '</div></div>' +
    '<div class="f mt14"><label>Senha provisória</label><input class="i" id="cv-senha" value="aular123">' +
      '<div class="aj">Em produção isso vira um convite por e-mail, e a pessoa cria a própria senha. ' +
      'Aqui a senha é definida direto para você poder testar agora.</div></div>',
    '<button class="b b-f" onclick="fecharModal()">Cancelar</button>' +
    '<button class="b b-p" onclick="salvarPessoa()">Convidar</button>', 'estreita');
}
function salvarPessoa(){
  var nome = $('#cv-nome').value.trim(), email = $('#cv-email').value.trim().toLowerCase();
  if(!nome || !email){ aviso('Nome e e-mail são obrigatórios.', 'err'); return; }
  if(filtrar(DB.usuarios, function(u){ return u.email.toLowerCase() === email; }).length){
    aviso('Já existe alguém com esse e-mail.', 'err'); return;
  }
  var papel = ($('#cv-papel .op.on')[0] || {getAttribute:function(){ return 'gestor'; }}).getAttribute('data-v');
  var uid = id('u');
  DB.usuarios.push({
    id:uid, ongId:SESSAO.ongId, plataforma:false, pessoaId:null,
    nome:nome, email:email, senhaHash:hashSenha($('#cv-senha').value || 'aular123', uid),
    papel:papel, ativo:true, criadoEm:isoHoje(), ultimoAcesso:null
  });
  registrar(SESSAO.ongId, 'equipe', nome + ' entrou na equipe como ' + PAPEIS[papel].nome);
  salvar(); fecharModal(); recarregar();
  aviso('👥 ' + nome + ' já pode entrar com o e-mail dela.', 'ok');
}
function editarPessoa(uid){
  var u = achar(DB.usuarios, uid);
  modal('Editar acesso — ' + esc(u.nome),
    '<div class="f mb14"><label>Papel</label><div class="opcoes" id="ed-papel">' +
      Object.keys(PAPEIS).filter(function(k){ return k !== 'dono'; }).map(function(k){
        return '<button class="op ' + (u.papel===k?'on car':'') + '" data-v="' + k + '" ' +
          'onclick="$$(\'#ed-papel .op\').forEach(function(b){b.classList.remove(\'on\',\'car\')});' +
          'this.classList.add(\'on\',\'car\')">' + PAPEIS[k].nome + '</button>'; }).join('') + '</div></div>' +
    '<label class="check ' + (u.ativo?'on':'') + '"><input type="checkbox" id="ed-ativo" ' +
      (u.ativo?'checked':'') + '><span>Acesso ativo</span></label>' +
    '<div class="f mt14"><label>Redefinir senha (deixe em branco para manter)</label>' +
      '<input class="i" id="ed-senha" placeholder="nova senha"></div>',
    '<button class="b b-f" onclick="fecharModal()">Cancelar</button>' +
    '<button class="b b-p" onclick="salvarEdicaoPessoa(\'' + uid + '\')">Salvar</button>', 'estreita');
}
function salvarEdicaoPessoa(uid){
  var u = achar(DB.usuarios, uid);
  u.papel = ($('#ed-papel .op.on')[0] || {getAttribute:function(){ return u.papel; }}).getAttribute('data-v');
  u.ativo = $('#ed-ativo').checked;
  var nova = $('#ed-senha').value.trim();
  if(nova) u.senhaHash = hashSenha(nova, u.id);
  registrar(SESSAO.ongId, 'equipe', 'Acesso de ' + u.nome + ' atualizado');
  salvar(); fecharModal(); recarregar();
  aviso('Salvo.', 'ok');
}

/* ------------------------------------------------------------------ tela sem permissão */
function telaSemPermissao(chave){
  var u = usuarioAtual(), p = papelDe(u);
  return '<div class="cx" style="max-width:560px;margin:34px auto;text-align:center;padding:36px">' +
    '<div style="font-size:42px">🚫</div>' +
    '<h2 style="margin:10px 0 6px;font-size:21px">Esta tela não faz parte do seu papel</h2>' +
    '<p class="s13 c2">Você entrou como <b>' + p.nome + '</b>: ' + p.o_que + '</p>' +
    '<p class="s12 c3">Se você precisa desta tela, peça a quem administra a conta para mudar o seu papel ' +
    'em Equipe e acessos.</p>' +
    '<button class="b b-p mt14" onclick="ir(\'ong-painel\')">Voltar ao painel</button></div>';
}
