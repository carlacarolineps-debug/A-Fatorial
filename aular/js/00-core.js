/* =========================================================================
   AuLar — núcleo: estado, persistência, utilidades, roteador, UI base.
   Sem dependências. Funciona abrindo o index.html direto no navegador.
   ========================================================================= */
'use strict';

/* ------------------------------------------------------------------ estado */
var DB = null;              // banco inteiro (multi-tenant) — ver 01-seed.js
var SESSAO = {              // quem está usando agora
  papel: null,              // 'adotante' | 'ong' | 'plataforma'
  ongId: null,              // tenant ativo quando papel === 'ong'
  pessoaId: null,           // adotante logado
  usuarioId: null           // conta de quem entrou (ver 11-contas.js)
};
var HOJE = null;            // data "de hoje" do sistema (permite viajar no tempo na demo)

var CHAVE = 'aular_db_v1';
var CHAVE_SESSAO = 'aular_sessao_v1';
var CHAVE_TEMA = 'aular_tema';
var CHAVE_HOJE = 'aular_hoje';

function salvar(){
  /* Cada gravação incrementa a revisão. É por ela que as outras abas
     percebem que os dados mudaram e se atualizam sozinhas. */
  DB.rev = (DB.rev || 0) + 1;
  try{ localStorage.setItem(CHAVE, JSON.stringify(DB)); }
  catch(e){ console.warn('Não consegui salvar (armazenamento cheio?)', e); }
  if(typeof propagarGravacao === 'function') propagarGravacao();
}
function salvarSessao(){
  try{ localStorage.setItem(CHAVE_SESSAO, JSON.stringify(SESSAO)); }catch(e){}
}
function carregar(){
  try{
    var bruto = localStorage.getItem(CHAVE);
    if(bruto){ DB = JSON.parse(bruto); return true; }
  }catch(e){ console.warn('Base corrompida, recriando.', e); }
  return false;
}
function zerarTudo(){
  if(!confirm('Isso apaga TODOS os dados deste navegador e recria a demonstração. Continuar?')) return;
  try{ localStorage.removeItem(CHAVE); localStorage.removeItem(CHAVE_SESSAO); localStorage.removeItem(CHAVE_HOJE); }catch(e){}
  location.reload();
}

/* ------------------------------------------------------------------ ids */
var _seq = Date.now() % 100000;
function id(pref){ _seq++; return (pref||'x') + '_' + _seq.toString(36) + Math.floor(Math.random()*1296).toString(36); }

/* ------------------------------------------------------------------ datas */
function hoje(){ return HOJE ? new Date(HOJE.getTime()) : new Date(); }
function isoHoje(){ return iso(hoje()); }
function iso(d){
  if(typeof d === 'string') return d.slice(0,10);
  var m = d.getMonth()+1, dia = d.getDate();
  return d.getFullYear() + '-' + (m<10?'0':'') + m + '-' + (dia<10?'0':'') + dia;
}
function data(s){ if(!s) return null; var p = String(s).slice(0,10).split('-'); return new Date(+p[0], +p[1]-1, +p[2]); }
function maisDias(s, n){ var d = typeof s==='string' ? data(s) : new Date(s.getTime()); d.setDate(d.getDate()+n); return iso(d); }
function maisMeses(s, n){ var d = typeof s==='string' ? data(s) : new Date(s.getTime()); d.setMonth(d.getMonth()+n); return iso(d); }
function difDias(a, b){          // b - a, em dias
  var d1 = typeof a==='string'?data(a):a, d2 = typeof b==='string'?data(b):b;
  return Math.round((d2 - d1) / 86400000);
}
function brData(s){ if(!s) return '—'; var p = String(s).slice(0,10).split('-'); return p[2]+'/'+p[1]+'/'+p[0]; }
function brDataCurta(s){ if(!s) return '—'; var p = String(s).slice(0,10).split('-'); return p[2]+'/'+p[1]; }
var MESES = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
var MESES_C = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
var DIAS_C = ['dom','seg','ter','qua','qui','sex','sáb'];
function mesAno(s){ var p = String(s).slice(0,10).split('-'); return MESES_C[+p[1]-1] + '/' + p[0].slice(2); }
function quandoTexto(s){
  var d = difDias(isoHoje(), s);
  if(d === 0) return 'hoje';
  if(d === 1) return 'amanhã';
  if(d === -1) return 'ontem';
  if(d > 0 && d < 30) return 'em ' + d + ' dias';
  if(d < 0 && d > -30) return 'há ' + (-d) + ' dias';
  if(d < 0) return 'há ' + Math.round(-d/30) + ' meses';
  return brData(s);
}
function idadeTexto(nasc){
  if(!nasc) return 'idade não informada';
  var d = difDias(nasc, isoHoje());
  if(d < 0) return '—';
  if(d < 60) return d + ' dias';
  var m = Math.floor(d/30.4);
  if(m < 24) return m + (m===1?' mês':' meses');
  var a = Math.floor(d/365.25);
  return a + (a===1?' ano':' anos');
}
function idadeAnos(nasc){ return nasc ? difDias(nasc, isoHoje())/365.25 : 2; }

/* ------------------------------------------------------------------ números */
function brl(v){
  v = +v || 0;
  return 'R$ ' + v.toLocaleString('pt-BR',{minimumFractionDigits:2, maximumFractionDigits:2});
}
function brlCurto(v){
  v = +v || 0;
  if(Math.abs(v) >= 1000000) return 'R$ ' + (v/1000000).toLocaleString('pt-BR',{maximumFractionDigits:1}) + 'M';
  if(Math.abs(v) >= 1000) return 'R$ ' + (v/1000).toLocaleString('pt-BR',{maximumFractionDigits:1}) + 'k';
  return 'R$ ' + v.toLocaleString('pt-BR',{maximumFractionDigits:0});
}
function n(v, casas){ return (+v||0).toLocaleString('pt-BR',{maximumFractionDigits:casas===undefined?0:casas}); }
function pct(v){ return (Math.round((+v||0)*10)/10).toLocaleString('pt-BR') + '%'; }
function limite(v, min, max){ return Math.max(min, Math.min(max, v)); }

/* ------------------------------------------------------------------ texto */
function esc(s){
  return String(s === undefined || s === null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function iniciais(nome){
  var p = String(nome||'?').trim().split(/\s+/);
  return ((p[0]||'?')[0] + (p.length>1 ? p[p.length-1][0] : '')).toUpperCase();
}
function slug(s){
  return semAcento(s).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
}
function semAcento(s){ return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''); }
function plural(n_, um, muitos){ return n_ === 1 ? um : muitos; }
function truncar(s, n_){ s = String(s||''); return s.length > n_ ? s.slice(0, n_-1) + '…' : s; }
function soDigitos(s){ return String(s||'').replace(/\D/g,''); }
function brTelefone(s){
  var d = soDigitos(s);
  if(d.length === 11) return '(' + d.slice(0,2) + ') ' + d.slice(2,7) + '-' + d.slice(7);
  if(d.length === 10) return '(' + d.slice(0,2) + ') ' + d.slice(2,6) + '-' + d.slice(6);
  return s || '—';
}
function validaCPF(cpf){
  var c = soDigitos(cpf);
  if(c.length !== 11 || /^(\d)\1{10}$/.test(c)) return false;
  var s = 0, i, r;
  for(i=0;i<9;i++) s += +c[i] * (10-i);
  r = (s*10) % 11; if(r === 10) r = 0;
  if(r !== +c[9]) return false;
  s = 0;
  for(i=0;i<10;i++) s += +c[i] * (11-i);
  r = (s*10) % 11; if(r === 10) r = 0;
  return r === +c[10];
}
function mascaraCPF(cpf){
  var c = soDigitos(cpf);
  if(c.length !== 11) return cpf || '—';
  return c.slice(0,3) + '.' + c.slice(3,6) + '.' + c.slice(6,9) + '-' + c.slice(9);
}
/** Mostra só o começo/fim do CPF — evita expor dado pessoal em tela (LGPD). */
function cpfMascarado(cpf){
  var c = soDigitos(cpf);
  if(c.length !== 11) return '—';
  return '***.' + c.slice(3,6) + '.***-' + c.slice(9);
}

/* ------------------------------------------------------------------ coleções */
function achar(lista, idv){ for(var i=0;i<lista.length;i++) if(lista[i].id === idv) return lista[i]; return null; }
function filtrar(lista, fn){ var r=[]; for(var i=0;i<lista.length;i++) if(fn(lista[i], i)) r.push(lista[i]); return r; }
function somar(lista, fn){ var s=0; for(var i=0;i<lista.length;i++) s += (+fn(lista[i]) || 0); return s; }
function agrupar(lista, fn){
  var m = {};
  for(var i=0;i<lista.length;i++){ var k = fn(lista[i]); (m[k] = m[k] || []).push(lista[i]); }
  return m;
}
function ordenar(lista, fn, desc){
  return lista.slice().sort(function(a,b){
    var x = fn(a), y = fn(b);
    if(x === y) return 0;
    return (x > y ? 1 : -1) * (desc ? -1 : 1);
  });
}
function unicos(lista){ var v={}, r=[]; for(var i=0;i<lista.length;i++){ if(!v[lista[i]]){ v[lista[i]]=1; r.push(lista[i]); } } return r; }
function sorteio(lista){ return lista[Math.floor(Math.random()*lista.length)]; }

/* ------------------------------------------------------------------ DOM */
function $(s, ctx){ return (ctx||document).querySelector(s); }
function $$(s, ctx){ return Array.prototype.slice.call((ctx||document).querySelectorAll(s)); }
function html(el, conteudo){ var e = typeof el === 'string' ? $(el) : el; if(e) e.innerHTML = conteudo; return e; }
function mostrar(sel, sim){ var e = $(sel); if(e) e.style.display = sim ? '' : 'none'; }

/* ------------------------------------------------------------------ toast */
function aviso(msg, tipo){
  var cx = $('#toasts'); if(!cx) return;
  var t = document.createElement('div');
  t.className = 'toast ' + (tipo || '');
  t.innerHTML = msg;
  cx.appendChild(t);
  setTimeout(function(){
    t.style.transition = 'opacity .3s, transform .3s';
    t.style.opacity = '0'; t.style.transform = 'translateX(28px)';
    setTimeout(function(){ if(t.parentNode) t.parentNode.removeChild(t); }, 320);
  }, 3400);
}

/* ------------------------------------------------------------------ modal */
var _modalAoFechar = null;
function modal(titulo, corpo, rodape, classe){
  var c = $('#cortina');
  c.innerHTML =
    '<div class="modal ' + (classe||'') + '" onclick="event.stopPropagation()">' +
      '<div class="modal-h"><h3>' + titulo + '</h3>' +
        '<button class="fechar no-print" onclick="fecharModal()" aria-label="Fechar">✕</button></div>' +
      '<div class="modal-c">' + corpo + '</div>' +
      (rodape ? '<div class="modal-p">' + rodape + '</div>' : '') +
    '</div>';
  c.classList.add('on');
  c.onclick = fecharModal;
}
function fecharModal(){
  var c = $('#cortina');
  c.classList.remove('on'); c.innerHTML = '';
  if(_modalAoFechar){ var f = _modalAoFechar; _modalAoFechar = null; f(); }
}
function confirmar(titulo, texto, aoConfirmar, rotulo, perigo){
  window.__confirmarFn = aoConfirmar;
  modal(titulo,
    '<p class="s13 c2" style="margin:0">' + texto + '</p>',
    '<button class="b b-f" onclick="fecharModal()">Cancelar</button>' +
    '<button class="b ' + (perigo ? 'b-d' : 'b-p') + '" onclick="var f=window.__confirmarFn;fecharModal();f&&f()">' +
      (rotulo || 'Confirmar') + '</button>',
    'estreita');
}

/* ------------------------------------------------------------------ tema */
function alternarTema(){
  var atual = document.documentElement.getAttribute('data-tema');
  var novo = atual === 'escuro' ? 'claro' : 'escuro';
  document.documentElement.setAttribute('data-tema', novo);
  try{ localStorage.setItem(CHAVE_TEMA, novo); }catch(e){}
  var b = $('#btn-tema'); if(b) b.textContent = novo === 'escuro' ? '☀️' : '🌙';
}
function aplicarTemaSalvo(){
  var t = null;
  try{ t = localStorage.getItem(CHAVE_TEMA); }catch(e){}
  if(!t){
    // sem escolha salva: segue o tema do sistema de quem está abrindo
    t = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
        ? 'escuro' : 'claro';
  }
  document.documentElement.setAttribute('data-tema', t);
  var b = $('#btn-tema'); if(b) b.textContent = t === 'escuro' ? '☀️' : '🌙';
}

/* ------------------------------------------------------------------ roteador */
var TELA_ATUAL = null;
var REGISTRO_TELAS = {};   // chave -> { titulo, sub, render, papel, precisaAtiva }

function registrarTela(chave, cfg){ REGISTRO_TELAS[chave] = cfg; }

function ir(chave, param){
  var cfg = REGISTRO_TELAS[chave];
  if(!cfg){ console.warn('Tela desconhecida:', chave); return; }

  // trava de permissão: o papel de quem entrou define o que ele alcança
  if(typeof podeVerTela === 'function' && !podeVerTela(chave)){
    TELA_ATUAL = chave; pintarNav(chave);
    $('#tela-titulo').textContent = cfg.titulo;
    $('#tela-sub').textContent = 'sem permissão';
    $$('.tela').forEach(function(t){ t.classList.remove('on'); });
    var semP = garantirTela(chave);
    semP.classList.add('on');
    semP.innerHTML = telaSemPermissao(chave);
    $('.rolagem').scrollTop = 0;
    return;
  }
  // trava de assinatura: telas de gestão ficam bloqueadas se a ONG estiver inadimplente
  if(cfg.precisaAtiva && SESSAO.papel === 'ong'){
    var ong = ongAtual();
    if(ong && !podeUsarGestao(ong)){
      TELA_ATUAL = chave;
      pintarNav(chave);
      $('#tela-titulo').textContent = cfg.titulo;
      $('#tela-sub').textContent = 'acesso suspenso';
      $$('.tela').forEach(function(t){ t.classList.remove('on'); });
      var alvo = garantirTela(chave);
      alvo.classList.add('on');
      alvo.innerHTML = telaBloqueada(ong);
      $('.rolagem').scrollTop = 0;
      return;
    }
  }

  TELA_ATUAL = chave;
  pintarNav(chave);
  $('#tela-titulo').textContent = cfg.titulo;
  $('#tela-sub').textContent = typeof cfg.sub === 'function' ? cfg.sub() : (cfg.sub || '');
  $$('.tela').forEach(function(t){ t.classList.remove('on'); });
  var el = garantirTela(chave);
  el.classList.add('on');
  el.innerHTML = cfg.render(param) || '';
  $('.rolagem').scrollTop = 0;
  document.body.classList.remove('menu-aberto');
  if(cfg.depois) cfg.depois(param);
  if(typeof registrarPresenca === 'function') registrarPresenca();
}
function garantirTela(chave){
  var el = document.getElementById('tela-' + chave);
  if(!el){
    el = document.createElement('div');
    el.id = 'tela-' + chave;
    el.className = 'tela';
    $('#telas').appendChild(el);
  }
  return el;
}
function recarregar(){ if(TELA_ATUAL) ir(TELA_ATUAL); }
function pintarNav(chave){
  $$('.nav-i').forEach(function(b){ b.classList.toggle('on', b.getAttribute('data-tela') === chave); });
}
function alternarMenu(){ document.body.classList.toggle('menu-aberto'); }

/* ------------------------------------------------------------------ atalhos de dados */
function ongAtual(){ return SESSAO.ongId ? achar(DB.ongs, SESSAO.ongId) : null; }
function pessoaAtual(){ return SESSAO.pessoaId ? achar(DB.pessoas, SESSAO.pessoaId) : null; }
function petsDa(ongId){ return filtrar(DB.pets, function(p){ return p.ongId === ongId; }); }
function petsVisiveis(){
  // vitrine pública: pets disponíveis de ONGs que não foram removidas
  return filtrar(DB.pets, function(p){
    if(p.status !== 'disponivel') return false;
    var o = achar(DB.ongs, p.ongId);
    return o && o.situacao !== 'removida' && vitrineVisivel(o);
  });
}
function ongDoPet(p){ return achar(DB.ongs, p.ongId); }

/* Emoji padrão quando o pet não tem foto. */
function fotoPet(p){
  if(p.fotos && p.fotos.length) return p.fotos[0];
  return null;
}
function estiloFoto(p){
  var f = fotoPet(p);
  return f ? "background-image:url('" + f + "')" : '';
}
function emojiPet(p){
  if(p.especie === 'gato') return '🐱';
  if(p.porte === 'pequeno') return '🐕';
  if(p.porte === 'grande') return '🐕‍🦺';
  return '🐶';
}

/* ------------------------------------------------------------------ SVG placeholder de foto */
/* Enquanto a ONG não sobe uma foto de verdade, desenhamos uma silhueta em SVG
   a partir do nome do animal — determinística, então o mesmo bicho tem sempre
   a mesma cor. Tudo em path, sem emoji: assim aparece igual em qualquer
   máquina, inclusive nas que não têm fonte de emoji instalada. */
function fotoGerada(semente, especie){
  var h = 0, s = String(semente || 'pet');
  for(var i=0;i<s.length;i++) h = (h*31 + s.charCodeAt(i) * 7) % 360;
  var c1 = 'hsl(' + h + ',58%,68%)', c2 = 'hsl(' + ((h+34)%360) + ',52%,42%)';
  var silhueta = especie === 'gato'
    // gato: orelhas pontudas
    ? '<path d="M133 150 L120 88 L172 122 A90 90 0 0 1 228 122 L280 88 L267 150 ' +
      'A96 96 0 1 1 133 150 Z"/>' +
      '<circle cx="171" cy="196" r="11" fill="#fff" opacity=".85"/>' +
      '<circle cx="229" cy="196" r="11" fill="#fff" opacity=".85"/>' +
      '<path d="M200 224 l-13 10 h26 z" fill="#fff" opacity=".85"/>'
    // cão: orelhas caídas
    : '<path d="M200 106 a92 92 0 0 1 92 92 v22 a92 92 0 0 1 -184 0 v-22 a92 92 0 0 1 92 -92 Z"/>' +
      '<ellipse cx="108" cy="196" rx="26" ry="52" transform="rotate(-14 108 196)"/>' +
      '<ellipse cx="292" cy="196" rx="26" ry="52" transform="rotate(14 292 196)"/>' +
      '<circle cx="172" cy="192" r="11" fill="#fff" opacity=".85"/>' +
      '<circle cx="228" cy="192" r="11" fill="#fff" opacity=".85"/>' +
      '<ellipse cx="200" cy="232" rx="18" ry="13" fill="#fff" opacity=".85"/>';
  /* Proporção 4:5, igual à do cartão da vitrine — assim o recorte do
     background-size:cover não corta a cabeça do bicho. */
  var svg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500" viewBox="0 0 400 500">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="' + c1 + '"/><stop offset="1" stop-color="' + c2 + '"/>' +
      '</linearGradient></defs>' +
      '<rect width="400" height="500" fill="url(#g)"/>' +
      '<circle cx="342" cy="70" r="120" fill="#ffffff" opacity=".10"/>' +
      '<circle cx="52" cy="446" r="104" fill="#000000" opacity=".08"/>' +
      '<g fill="#ffffff" opacity=".30" transform="translate(200 232) scale(.78) translate(-200 -190)">' +
        silhueta + '</g>' +
    '</svg>';
  return svgParaCSS(svg);
}
/* encodeURIComponent deixa passar ( e ), e parêntese solto quebra o url() do
   CSS. Por isso escapamos os dois na mão. */
function svgParaCSS(svg){
  return 'data:image/svg+xml;charset=utf-8,' +
    encodeURIComponent(svg).replace(/\(/g, '%28').replace(/\)/g, '%29');
}

/* ------------------------------------------------------------------ upload de imagem */
function lerImagem(arquivo, cb, maxLado){
  if(!arquivo || !/^image\//.test(arquivo.type)){ aviso('Escolha um arquivo de imagem.', 'err'); return; }
  var fr = new FileReader();
  fr.onload = function(ev){
    var img = new Image();
    img.onload = function(){
      var lado = maxLado || 900;
      var w = img.width, h = img.height;
      if(w > lado || h > lado){ var r = Math.min(lado/w, lado/h); w = Math.round(w*r); h = Math.round(h*r); }
      var cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      cv.getContext('2d').drawImage(img, 0, 0, w, h);
      cb(cv.toDataURL('image/jpeg', 0.78));
    };
    img.onerror = function(){ cb(ev.target.result); };
    img.src = ev.target.result;
  };
  fr.readAsDataURL(arquivo);
}

/* ------------------------------------------------------------------ QR Code */
/* Codificador próprio (modo byte, correção L, versões 1–6) usado no cartaz do
   pet e no Pix copia-e-cola. Sem biblioteca externa.
   Implementa as 8 máscaras com escolha pela menor penalidade (ISO/IEC 18004
   §8.8) — máscara fixa gera códigos que muitos leitores recusam.

   Validação: 304 conteúdos (URLs de pet, BR Code do Pix e cadeias aleatórias
   de 1 a 134 bytes) × 8 máscaras = 2432 símbolos, todos lidos corretamente
   pelo decodificador ZXing. As síndromes Reed-Solomon dão zero em todos, e a
   matriz de padrões fixos é idêntica à de uma implementação de referência. */
var QR = (function(){
  /* --- GF(256) para Reed-Solomon --- */
  var EXP = new Array(512), LOG = new Array(256);
  (function(){
    var x = 1;
    for(var i=0;i<255;i++){ EXP[i] = x; LOG[x] = i; x <<= 1; if(x & 256) x ^= 285; }
    for(i=255;i<512;i++) EXP[i] = EXP[i-255];
  })();
  function mul(a,b){ return (a===0 || b===0) ? 0 : EXP[(LOG[a]+LOG[b]) % 255]; }
  function geradorRS(grau){
    var p = [1];
    for(var i=0;i<grau;i++){
      var np = new Array(p.length+1);
      for(var j=0;j<np.length;j++) np[j] = 0;
      for(j=0;j<p.length;j++){ np[j] ^= p[j]; np[j+1] ^= mul(p[j], EXP[i]); }
      p = np;
    }
    return p;
  }
  function correcao(dados, qtd){
    var g = geradorRS(qtd), res = dados.slice(), i, j;
    for(i=0;i<qtd;i++) res.push(0);
    for(i=0;i<dados.length;i++){
      var f = res[i]; if(f === 0) continue;
      for(j=0;j<g.length;j++) res[i+j] ^= mul(g[j], f);
    }
    return res.slice(dados.length);
  }

  /* --- tabelas do nível L, versões 1..9 ---
     Vai até a 9 porque o BR Code do Pix costuma passar de 130 bytes.
     Todas essas versões têm blocos de tamanho igual no nível L, o que mantém
     a intercalação simples. Da 10 em diante haveria grupos desiguais e a
     contagem de caracteres passaria a 16 bits. */
  var CAP    = [0, 17, 32, 53, 78, 106, 134, 154, 192, 230];  // bytes no modo byte
  var TOTAL  = [0, 26, 44, 70, 100, 134, 172, 196, 242, 292]; // codewords totais
  var EC_CW  = [0,  7, 10, 15,  20,  26,  18,  20,  24,  30]; // correção por bloco
  var BLOCOS = [0,  1,  1,  1,   1,   1,   2,   2,   2,   2];
  var ALIN   = [[],[],[6,18],[6,22],[6,26],[6,30],[6,34],[6,22,38],[6,24,42],[6,26,46]];

  /* --- informação de formato: BCH(15,5) + XOR de máscara (§8.9) --- */
  function formato(mascara){
    var dados = (0x01 << 3) | mascara;          // 0b01 = nível L
    var v = dados << 10;
    for(var i=14;i>=10;i--) if((v >> i) & 1) v ^= 0x537 << (i-10);
    return ((dados << 10) | v) ^ 0x5412;
  }

  /* --- as 8 máscaras (§8.8.1) --- */
  var MASCARAS = [
    function(i,j){ return (i+j) % 2 === 0; },
    function(i,j){ return i % 2 === 0; },
    function(i,j){ return j % 3 === 0; },
    function(i,j){ return (i+j) % 3 === 0; },
    function(i,j){ return (Math.floor(i/2) + Math.floor(j/3)) % 2 === 0; },
    function(i,j){ return ((i*j) % 2) + ((i*j) % 3) === 0; },
    function(i,j){ return (((i*j) % 2) + ((i*j) % 3)) % 2 === 0; },
    function(i,j){ return (((i+j) % 2) + ((i*j) % 3)) % 2 === 0; }
  ];

  /* --- penalidades (§8.8.2) para escolher a melhor máscara --- */
  function penalidade(m){
    var t = m.length, p = 0, i, j, k;
    // N1: sequências de 5+ módulos iguais
    for(i=0;i<t;i++){
      for(var eixo=0; eixo<2; eixo++){
        var run = 1, ant = eixo ? m[0][i] : m[i][0];
        for(j=1;j<t;j++){
          var v = eixo ? m[j][i] : m[i][j];
          if(v === ant) run++;
          else { if(run >= 5) p += 3 + (run-5); run = 1; ant = v; }
        }
        if(run >= 5) p += 3 + (run-5);
      }
    }
    // N2: blocos 2x2 da mesma cor
    for(i=0;i<t-1;i++) for(j=0;j<t-1;j++)
      if(m[i][j] === m[i][j+1] && m[i][j] === m[i+1][j] && m[i][j] === m[i+1][j+1]) p += 3;
    // N3: padrão 1011101 com 4 claros de um dos lados.
    // Fora do símbolo conta como claro — ali fica a zona de silêncio.
    var alvo = [1,0,1,1,1,0,1];
    function claro(get, x, t2){ return (x < 0 || x >= t2) ? true : get(x) === 0; }
    function bate(get, base, t2){
      for(k=0;k<7;k++) if(get(base+k) !== alvo[k]) return false;
      var antes = true, depois = true;
      for(k=1;k<=4;k++) if(!claro(get, base-k, t2)) { antes = false; break; }
      for(k=0;k<4;k++) if(!claro(get, base+7+k, t2)) { depois = false; break; }
      return antes || depois;
    }
    for(i=0;i<t;i++) for(j=0;j+7<=t;j++){
      (function(linha, col){
        if(bate(function(x){ return m[linha][x]; }, col, t)) p += 40;
        if(bate(function(x){ return m[x][linha]; }, col, t)) p += 40;
      })(i, j);
    }
    // N4: desequilíbrio entre claros e escuros
    var escuros = 0;
    for(i=0;i<t;i++) for(j=0;j<t;j++) escuros += m[i][j];
    var prop = escuros * 100 / (t*t);
    p += Math.floor(Math.abs(prop - 50) / 5) * 10;
    return p;
  }

  function utf8(texto){
    var b = [];
    for(var i=0;i<texto.length;i++){
      var c = texto.charCodeAt(i);
      if(c < 0x80) b.push(c);
      else if(c < 0x800) b.push(0xC0|(c>>6), 0x80|(c&63));
      else b.push(0xE0|(c>>12), 0x80|((c>>6)&63), 0x80|(c&63));
    }
    return b;
  }

  function montar(texto){
    var bytes = utf8(String(texto)), i, j;
    var v = 0;
    for(i=1;i<=9;i++) if(bytes.length <= CAP[i]){ v = i; break; }
    if(!v) return null;                                     // não cabe nem na v9

    var tam = 17 + v*4;
    var dadosCw = TOTAL[v] - EC_CW[v]*BLOCOS[v];

    /* 1. fluxo de bits */
    var bs = [];
    function empurrar(valor, qtd){ for(var k=qtd-1;k>=0;k--) bs.push((valor>>k)&1); }
    empurrar(4, 4);                                          // modo byte
    empurrar(bytes.length, 8);                               // contagem (v1–9: 8 bits)
    for(i=0;i<bytes.length;i++) empurrar(bytes[i], 8);
    var falta = dadosCw*8 - bs.length;
    for(i=0;i<Math.min(4, falta);i++) bs.push(0);            // terminador
    while(bs.length % 8 !== 0) bs.push(0);

    var dados = [];
    for(i=0;i<bs.length;i+=8){
      var b = 0; for(j=0;j<8;j++) b = (b<<1) | bs[i+j];
      dados.push(b);
    }
    var enche = [0xEC, 0x11], k2 = 0;
    while(dados.length < dadosCw) dados.push(enche[k2++ % 2]);

    /* 2. blocos + intercalação */
    var porBloco = dadosCw / BLOCOS[v], dBl = [], eBl = [];
    for(i=0;i<BLOCOS[v];i++){
      var d = dados.slice(i*porBloco, (i+1)*porBloco);
      dBl.push(d); eBl.push(correcao(d, EC_CW[v]));
    }
    var fluxo = [];
    for(i=0;i<porBloco;i++) for(j=0;j<BLOCOS[v];j++) fluxo.push(dBl[j][i]);
    for(i=0;i<EC_CW[v];i++) for(j=0;j<BLOCOS[v];j++) fluxo.push(eBl[j][i]);

    /* 3. padrões fixos e áreas reservadas */
    var base = [], res = [];
    for(i=0;i<tam;i++){
      base.push(new Array(tam).fill(0));
      res.push(new Array(tam).fill(false));
    }
    function localizador(r, c){
      for(var a=-1;a<=7;a++) for(var b2=-1;b2<=7;b2++){
        var rr = r+a, cc = c+b2;
        if(rr < 0 || cc < 0 || rr >= tam || cc >= tam) continue;
        var borda = (a >= 0 && a <= 6 && (b2 === 0 || b2 === 6)) ||
                    (b2 >= 0 && b2 <= 6 && (a === 0 || a === 6));
        var miolo = a >= 2 && a <= 4 && b2 >= 2 && b2 <= 4;
        base[rr][cc] = (borda || miolo) ? 1 : 0;
        res[rr][cc] = true;
      }
    }
    localizador(0, 0); localizador(0, tam-7); localizador(tam-7, 0);
    for(i=8;i<tam-8;i++){                                    // padrões de tempo
      var tm = (i % 2 === 0) ? 1 : 0;
      base[6][i] = tm; res[6][i] = true;
      base[i][6] = tm; res[i][6] = true;
    }
    var al = ALIN[v];                                        // alinhamento
    for(i=0;i<al.length;i++) for(j=0;j<al.length;j++){
      var r3 = al[i], c3 = al[j];
      if((r3 < 9 && c3 < 9) || (r3 < 9 && c3 > tam-10) || (r3 > tam-10 && c3 < 9)) continue;
      for(var a2=-2;a2<=2;a2++) for(var b3=-2;b3<=2;b3++){
        base[r3+a2][c3+b3] = (Math.max(Math.abs(a2), Math.abs(b3)) !== 1) ? 1 : 0;
        res[r3+a2][c3+b3] = true;
      }
    }
    base[tam-8][8] = 1; res[tam-8][8] = true;                // módulo escuro fixo
    for(i=0;i<9;i++){ res[8][i] = true; res[i][8] = true; }  // reserva do formato
    for(i=0;i<8;i++){ res[tam-1-i][8] = true; res[8][tam-1-i] = true; }
    if(v >= 7){                                              // reserva da versão
      for(i=0;i<6;i++) for(j=0;j<3;j++){
        res[tam-11+j][i] = true; res[i][tam-11+j] = true;
      }
    }

    /* 4. dados em zigue-zague, ainda SEM máscara */
    var celulas = [];                                        // [linha, coluna] de cada bit
    var bi = 0, sobe = true;
    for(var col=tam-1; col>0; col-=2){
      if(col === 6) col--;                                   // pula a coluna de tempo
      for(var passo=0; passo<tam; passo++){
        var row = sobe ? (tam-1-passo) : passo;
        for(var lado=0; lado<2; lado++){
          var cc2 = col - lado;
          if(res[row][cc2]) continue;
          var bit = (bi < fluxo.length*8) ? (fluxo[bi >> 3] >> (7 - (bi & 7))) & 1 : 0;
          bi++;
          base[row][cc2] = bit;
          celulas.push([row, cc2]);
        }
      }
      sobe = !sobe;
    }

    /* 5. testa as 8 máscaras e fica com a de menor penalidade */
    var melhor = null, melhorP = Infinity, melhorM = 0;
    for(var mk=0; mk<8; mk++){
      var m = base.map(function(l){ return l.slice(); });
      for(i=0;i<celulas.length;i++){
        var rc = celulas[i];
        if(MASCARAS[mk](rc[0], rc[1])) m[rc[0]][rc[1]] ^= 1;
      }
      escreverFormato(m, tam, formato(mk));
      if(v >= 7) escreverVersao(m, tam, v);
      var p = penalidade(m);
      if(p < melhorP){ melhorP = p; melhor = m; melhorM = mk; }
    }
    melhor.mascara = melhorM;
    melhor.versao = v;
    return melhor;
  }

  /* informação de versão: 18 bits (6 de dados + BCH(18,6)), só para v>=7 (§8.10) */
  function versaoBits(v){
    var d = v << 12;
    for(var i=17;i>=12;i--) if((d >> i) & 1) d ^= 0x1F25 << (i-12);
    return (v << 12) | d;
  }
  function escreverVersao(m, tam, v){
    var bits = versaoBits(v);
    for(var i=0;i<6;i++) for(var j=0;j<3;j++){
      var b = (bits >> (i*3 + j)) & 1;
      m[tam-11+j][i] = b;      // bloco inferior esquerdo
      m[i][tam-11+j] = b;      // bloco superior direito
    }
  }

  /* informação de formato: 15 bits (f14…f0) em duas cópias (§8.9, fig. 25) */
  function escreverFormato(m, tam, fmt){
    function f(k){ return (fmt >> k) & 1; }
    for(var i=0;i<=5;i++) m[8][i] = f(14-i);                 // cópia 1 — horizontal
    m[8][7] = f(8);  m[8][8] = f(7);  m[7][8] = f(6);
    for(i=0;i<=5;i++) m[i][8] = f(i);                        // cópia 1 — vertical
    for(i=0;i<=6;i++) m[tam-1-i][8] = f(14-i);               // cópia 2 — vertical
    for(i=0;i<=7;i++) m[8][tam-8+i] = f(7-i);                // cópia 2 — horizontal
    m[tam-8][8] = 1;                                         // módulo escuro
  }

  return {
    matriz: montar,
    formato: formato,
    versaoBits: versaoBits,
    /** SVG pronto para embutir. Devolve aviso legível se o texto não couber. */
    svg: function(texto, px){
      var m = null;
      try{ m = montar(texto); }catch(e){ console.warn('QR falhou', e); }
      if(!m) return '<div class="tc c3 s12" style="padding:16px">QR indisponível (texto longo demais)</div>';
      var t = m.length, q = 4, total = t + q*2, r = '';
      for(var i=0;i<t;i++) for(var j=0;j<t;j++) if(m[i][j])
        r += '<rect x="' + (j+q) + '" y="' + (i+q) + '" width="1" height="1"/>';
      return '<svg xmlns="http://www.w3.org/2000/svg" width="' + (px||150) + '" height="' + (px||150) +
             '" viewBox="0 0 ' + total + ' ' + total + '" shape-rendering="crispEdges" role="img" aria-label="QR Code">' +
             '<rect width="' + total + '" height="' + total + '" fill="#fff"/>' +
             '<g fill="#000">' + r + '</g></svg>';
    }
  };
})();

/* ------------------------------------------------------------------ Pix copia-e-cola */
/* Monta um BR Code (EMV) válido em estrutura — na produção a chave e o txid
   vêm do PSP (Asaas/Pagar.me/Mercado Pago). Ver PROJETO.md. */
function pixBRCode(chave, nome, cidade, valor, txid){
  function c(idv, val){ var s = String(val); var t = s.length < 10 ? '0'+s.length : String(s.length); return idv + t + s; }
  /* O BR Code aceita só ASCII nos campos de nome e cidade: "Santo André" vira
     "SANTO ANDRE". Sem isso o acento vira 2 bytes e alguns bancos recusam. */
  function ascii(s, max){
    return semAcento(s).toUpperCase().replace(/[^A-Z0-9 .-]/g,'').trim().slice(0, max);
  }
  var gui = c('00','br.gov.bcb.pix') + c('01', chave);
  var payload =
    c('00','01') +
    c('26', gui) +
    c('52','0000') + c('53','986') +
    (valor ? c('54', (+valor).toFixed(2)) : '') +
    c('58','BR') +
    c('59', ascii(nome || 'AULAR', 25) || 'AULAR') +
    c('60', ascii(cidade || 'SANTO ANDRE', 15) || 'SAO PAULO') +
    c('62', c('05', String(txid || '***').slice(0,25)));
  payload += '6304';
  // CRC16-CCITT
  var crc = 0xFFFF;
  for(var i=0;i<payload.length;i++){
    crc ^= payload.charCodeAt(i) << 8;
    for(var j=0;j<8;j++) crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xFFFF : (crc << 1) & 0xFFFF;
  }
  return payload + ('000' + crc.toString(16).toUpperCase()).slice(-4);
}
function copiar(texto, msg){
  var ta = document.createElement('textarea');
  ta.value = texto; ta.style.position='fixed'; ta.style.opacity='0';
  document.body.appendChild(ta); ta.select();
  try{ document.execCommand('copy'); aviso(msg || 'Copiado!', 'ok'); }
  catch(e){ aviso('Não consegui copiar — selecione manualmente.', 'err'); }
  document.body.removeChild(ta);
}

/* ------------------------------------------------------------------ mini gráfico */
function barras(itens, formatar, cor){
  if(!itens.length) return '<div class="vazio s12">sem dados</div>';
  var max = Math.max.apply(null, itens.map(function(i){ return Math.abs(i.v); })) || 1;
  return '<div class="bars">' + itens.map(function(i){
    var h = Math.max(3, Math.round(Math.abs(i.v)/max*92));
    return '<div class="col ' + (cor||'') + '">' +
      '<span class="vl">' + (formatar ? formatar(i.v) : n(i.v)) + '</span>' +
      '<div class="bh" style="height:' + h + 'px"></div>' +
      '<span class="lg">' + esc(i.r) + '</span></div>';
  }).join('') + '</div>';
}
function anel(valor, max, cor, tamanho){
  var t = tamanho || 74, raio = (t/2) - 6, circ = 2*Math.PI*raio;
  var p = limite((valor/(max||1)), 0, 1);
  return '<svg width="'+t+'" height="'+t+'" viewBox="0 0 '+t+' '+t+'">' +
    '<circle cx="'+(t/2)+'" cy="'+(t/2)+'" r="'+raio+'" fill="none" stroke="var(--sup-3)" stroke-width="7"/>' +
    '<circle cx="'+(t/2)+'" cy="'+(t/2)+'" r="'+raio+'" fill="none" stroke="'+(cor||'var(--caramelo)')+'" stroke-width="7" ' +
      'stroke-linecap="round" stroke-dasharray="'+circ+'" stroke-dashoffset="'+(circ*(1-p))+'" ' +
      'transform="rotate(-90 '+(t/2)+' '+(t/2)+')"/>' +
    '<text x="50%" y="50%" text-anchor="middle" dy="5" font-size="'+(t/4.2)+'" font-weight="800" ' +
      'fill="var(--tinta)" font-family="var(--fonte-num)">'+Math.round(p*100)+'%</text></svg>';
}

/* ------------------------------------------------------------------ registro de atividade */
function registrar(ongId, tipo, texto, ref){
  var u = typeof usuarioAtual === 'function' ? usuarioAtual() : null;
  DB.atividades.unshift({
    id: id('at'), ongId: ongId, tipo: tipo, texto: texto, ref: ref || null,
    autor: u ? u.nome : null,          // quem fez — importa quando são várias pessoas
    quando: isoHoje(), carimbo: Date.now()
  });
  if(DB.atividades.length > 600) DB.atividades.length = 600;
}

/* ------------------------------------------------------------------ WhatsApp */
function zap(telefone, texto){
  var d = soDigitos(telefone);
  if(d.length <= 11) d = '55' + d;
  return 'https://wa.me/' + d + '?text=' + encodeURIComponent(texto || '');
}
function abrirZap(telefone, texto){ window.open(zap(telefone, texto), '_blank'); }
