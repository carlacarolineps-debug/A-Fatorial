/* =========================================================================
   AuLar — telas de quem adota, doa ou vira lar temporário.
   ========================================================================= */
'use strict';

var VITRINE = { fila:[], ix:0, filtros:{cidade:'', especie:'', porte:'', so:''} };

/* ================================================================ DESCOBRIR */
registrarTela('descobrir', {
  titulo:'Descobrir',
  sub:function(){
    var p = pessoaAtual();
    return p && p.perfil ? 'ordenado pela sua compatibilidade' : 'faça o teste para ver quem combina com você';
  },
  render:function(){
    var pes = pessoaAtual();
    montarFila();
    return '' +
      (!pes || !pes.perfil ? chamadaQuiz() : '') +
      '<div class="g" style="grid-template-columns:minmax(0,1fr) 320px;align-items:start">' +
        '<div><div id="pilha-cx"></div></div>' +
        '<div id="lado-descobrir"></div>' +
      '</div>';
  },
  depois:function(){ pintarPilha(); pintarLadoDescobrir(); }
});

function chamadaQuiz(){
  return '<div class="cx" style="background:linear-gradient(120deg,var(--uva-clr),var(--sup));' +
    'border-color:var(--uva)"><div class="linha" style="flex-wrap:nowrap">' +
    '<div style="font-size:34px">🧭</div>' +
    '<div style="flex:1;min-width:0"><h3 style="font-size:16px">Antes de deslizar, 13 perguntas rápidas</h3>' +
    '<p class="s12 c2 mb0">Elas ajustam a fila para o seu dia a dia de verdade — espaço, horas fora, ' +
    'orçamento. Adoção que combina é adoção que dura: quase todo animal devolvido volta porque ' +
    'ninguém fez essas perguntas antes.</p></div>' +
    '<button class="b b-u" onclick="abrirQuiz()">Fazer o teste (2 min)</button>' +
    '</div></div>';
}

function montarFila(){
  var pes = pessoaAtual();
  var f = VITRINE.filtros;
  var pets = filtrar(petsVisiveis(), function(p){
    var o = ongDoPet(p);
    if(f.cidade && o.cidade !== f.cidade) return false;
    if(f.especie && p.especie !== f.especie) return false;
    if(f.porte && p.porte !== f.porte) return false;
    if(f.so === 'urgente' && !p.urgente) return false;
    if(f.so === 'especial' && !p.especial) return false;
    if(f.so === 'espera' && difDias(p.resgatadoEm, isoHoje()) < 180) return false;
    // já respondeu a este animal?
    if(pes && filtrar(DB.swipes, function(s){ return s.pessoaId === pes.id && s.petId === p.id; }).length) return false;
    return true;
  });
  VITRINE.fila = ordenarVitrine(pets, pes && pes.perfil);
  VITRINE.ix = 0;
}

function pintarPilha(){
  var cx = $('#pilha-cx'); if(!cx) return;
  var restam = VITRINE.fila.slice(VITRINE.ix, VITRINE.ix + 3);
  if(!restam.length){
    cx.innerHTML = '<div class="cx" style="text-align:center;padding:44px 24px">' +
      '<div style="font-size:44px">🎉</div><h3 style="margin:10px 0 6px">Você viu todos por aqui</h3>' +
      '<p class="s13 c2">Mude os filtros, amplie a cidade ou volte amanhã — entra bicho novo toda semana.</p>' +
      '<div class="linha" style="justify-content:center;margin-top:14px">' +
      '<button class="b b-f" onclick="VITRINE.filtros={cidade:\'\',especie:\'\',porte:\'\',so:\'\'};recarregar()">Limpar filtros</button>' +
      '<button class="b b-p" onclick="ir(\'meus-interesses\')">Ver meus interesses</button></div></div>';
    return;
  }
  cx.innerHTML = '<div class="pilha" id="pilha">' +
    restam.map(function(item, i){
      var p = item.pet, o = ongDoPet(p), c = item.comp;
      var z = 3 - i, escala = 1 - i*0.035, desl = i*10;
      return '<div class="pcard" data-ix="' + (VITRINE.ix + i) + '" style="z-index:' + z +
        ';transform:translateY(' + desl + 'px) scale(' + escala + ');' +
        (i > 0 ? 'pointer-events:none;' : '') + '">' +
        '<div class="carimbo sim">Quero!</div><div class="carimbo nao">Agora não</div>' +
        (p.urgente ? '<div class="urg">⚡ Urgente</div>' : '') +
        (c.score !== null ? '<div class="compat"><b>' + c.score + '%</b><small>combina</small></div>' : '') +
        '<div class="foto" style="' + estiloFoto(p) + '">' +
          '<div class="info">' +
            '<h2>' + esc(p.nome) + '</h2>' +
            '<div class="meta">' + idadeTexto(p.nascimento) + ' · ' + rotuloPorte(p.porte) + ' · ' +
              (p.sexo === 'M' ? 'macho' : 'fêmea') + ' · ' + esc(o.cidade) + '</div>' +
            '<div class="tags">' +
              (p.personalidade || []).slice(0,3).map(function(t){ return '<span>' + esc(t) + '</span>'; }).join('') +
              (p.castrado ? '<span>✓ castrad' + (p.sexo==='F'?'a':'o') + '</span>' : '') +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div style="padding:12px 16px;display:flex;gap:10px;align-items:center;border-top:1px solid var(--linha)">' +
          '<div style="flex:1;min-width:0">' +
            (c.pontos.length ? '<div class="s12 ok neg corte">✓ ' + esc(c.pontos[0]) + '</div>' : '') +
            (c.alertas.length ? '<div class="s11 al corte">⚠ ' + esc(c.alertas[0]) + '</div>' :
              '<div class="s11 c3 corte">' + esc(truncar(p.historia, 60)) + '</div>') +
          '</div>' +
          '<button class="b b-f b-s" onclick="event.stopPropagation();verPet(\'' + p.id + '\')">Ver perfil</button>' +
        '</div>' +
      '</div>';
    }).join('') + '</div>' +
    '<div class="pilha-acoes">' +
      '<button class="circ nao" onclick="responder(false)" title="Agora não">✕</button>' +
      '<button class="circ" onclick="verPet(\'' + restam[0].pet.id + '\')" title="Ver perfil completo">👁</button>' +
      '<button class="circ g sim" onclick="responder(true)" title="Tenho interesse">💚</button>' +
    '</div>' +
    '<p class="tc s11 c3 mt8">arraste o cartão para os lados, ou use os botões</p>';
  ligarArrasto();
}

function rotuloPorte(p){ return p === 'pequeno' ? 'pequeno' : (p === 'medio' ? 'médio' : 'grande'); }

/* ---- arrastar o cartão ---- */
function ligarArrasto(){
  var card = $('.pcard[style*="z-index: 3"]') || $('.pcard');
  if(!card) return;
  var x0 = 0, y0 = 0, dx = 0, arrastando = false;
  function inicio(e){
    arrastando = true; card.classList.add('arrasta');
    var t = e.touches ? e.touches[0] : e;
    x0 = t.clientX; y0 = t.clientY;
  }
  function move(e){
    if(!arrastando) return;
    var t = e.touches ? e.touches[0] : e;
    dx = t.clientX - x0;
    var dy = t.clientY - y0;
    card.style.transform = 'translate(' + dx + 'px,' + dy*0.25 + 'px) rotate(' + dx*0.055 + 'deg)';
    var sim = $('.carimbo.sim', card), nao = $('.carimbo.nao', card);
    if(sim) sim.style.opacity = dx > 30 ? Math.min(1, (dx-30)/70) : 0;
    if(nao) nao.style.opacity = dx < -30 ? Math.min(1, (-dx-30)/70) : 0;
    if(e.cancelable) e.preventDefault();
  }
  function fim(){
    if(!arrastando) return;
    arrastando = false; card.classList.remove('arrasta');
    if(Math.abs(dx) > 95) responder(dx > 0);
    else { card.style.transform = ''; $$('.carimbo', card).forEach(function(c){ c.style.opacity = 0; }); }
    dx = 0;
  }
  card.addEventListener('mousedown', inicio);
  document.addEventListener('mousemove', move);
  document.addEventListener('mouseup', fim);
  card.addEventListener('touchstart', inicio, {passive:true});
  card.addEventListener('touchmove', move, {passive:false});
  card.addEventListener('touchend', fim);
}

function responder(sim){
  var item = VITRINE.fila[VITRINE.ix];
  if(!item) return;
  var pes = pessoaAtual();
  if(!pes){ pedirCadastro(); return; }
  var card = $('.pcard[data-ix="' + VITRINE.ix + '"]');
  if(card){
    card.style.transition = 'transform .38s ease-out, opacity .38s';
    card.style.transform = 'translate(' + (sim ? 700 : -700) + 'px,' + (sim ? -60 : 60) + 'px) rotate(' + (sim?28:-28) + 'deg)';
    card.style.opacity = '0';
  }
  DB.swipes.push({ id:id('sw'), pessoaId:pes.id, petId:item.pet.id, gostou:sim, quando:isoHoje() });
  item.pet.visualizacoes = (item.pet.visualizacoes || 0) + 1;
  if(sim){
    item.pet.curtidas = (item.pet.curtidas || 0) + 1;
    criarInteresse(item.pet, pes, item.comp);
  }
  salvar();
  VITRINE.ix++;
  setTimeout(function(){ pintarPilha(); pintarLadoDescobrir(); }, sim ? 260 : 200);
}

function criarInteresse(pet, pes, comp){
  var jaTem = filtrar(DB.interesses, function(i){ return i.petId === pet.id && i.pessoaId === pes.id; });
  if(jaTem.length){ aviso('Você já demonstrou interesse por ' + pet.nome + '.'); return; }
  DB.interesses.push({
    id:id('int'), petId:pet.id, pessoaId:pes.id, ongId:pet.ongId,
    etapa:'interesse', criadoEm:isoHoje(), atualizadoEm:isoHoje(),
    score: comp ? comp.score : null, visita:null, notas:[], origem:'vitrine'
  });
  registrar(pet.ongId, 'adocao', 'Novo interesse em ' + pet.nome + ' — ' + pes.nome, pet.id);
  notificar(pet.ongId, 'novo', '💚 ' + pes.nome + ' demonstrou interesse em ' + pet.nome);
  aviso('💚 Interesse enviado! A ' + esc(ongDoPet(pet).nome) + ' vai te chamar.', 'ok');
}

function pintarLadoDescobrir(){
  var el = $('#lado-descobrir'); if(!el) return;
  var pes = pessoaAtual();
  var item = VITRINE.fila[VITRINE.ix];
  var cidades = unicos(petsVisiveis().map(function(p){ return ongDoPet(p).cidade; })).sort();
  var meus = pes ? filtrar(DB.interesses, function(i){ return i.pessoaId === pes.id; }) : [];

  el.innerHTML =
    (item ? cartaoPorQue(item) : '') +
    '<div class="cx"><div class="cx-h"><h3>Filtrar</h3></div>' +
      '<div class="f mb8"><label>Cidade</label>' +
        '<select class="i i-s" onchange="VITRINE.filtros.cidade=this.value;recarregar()">' +
        '<option value="">Todas as cidades</option>' +
        cidades.map(function(c){ return '<option ' + (VITRINE.filtros.cidade===c?'selected':'') + '>' + esc(c) + '</option>'; }).join('') +
        '</select></div>' +
      '<div class="f mb8"><label>Espécie</label><div class="opcoes">' +
        [['','Todos'],['cao','🐶 Cães'],['gato','🐱 Gatos']].map(function(o){
          return '<button class="op ' + (VITRINE.filtros.especie===o[0]?'on car':'') + '" ' +
            'onclick="VITRINE.filtros.especie=\'' + o[0] + '\';recarregar()">' + o[1] + '</button>'; }).join('') +
      '</div></div>' +
      '<div class="f mb8"><label>Porte</label><div class="opcoes">' +
        [['','Todos'],['pequeno','P'],['medio','M'],['grande','G']].map(function(o){
          return '<button class="op ' + (VITRINE.filtros.porte===o[0]?'on car':'') + '" ' +
            'onclick="VITRINE.filtros.porte=\'' + o[0] + '\';recarregar()">' + o[1] + '</button>'; }).join('') +
      '</div></div>' +
      '<div class="f"><label>Quem mais precisa</label><div class="opcoes">' +
        [['','Todos'],['urgente','⚡ Urgentes'],['especial','💗 Especiais'],['espera','⏳ Esperando +6 meses']].map(function(o){
          return '<button class="op ' + (VITRINE.filtros.so===o[0]?'on car':'') + '" ' +
            'onclick="VITRINE.filtros.so=\'' + o[0] + '\';recarregar()">' + o[1] + '</button>'; }).join('') +
      '</div></div>' +
    '</div>' +
    '<div class="cx"><div class="cx-h"><h3>Por aqui agora</h3></div>' +
      '<div class="entre s13"><span class="c2">Na fila</span><b>' + (VITRINE.fila.length - VITRINE.ix) + '</b></div>' +
      '<div class="entre s13 mt8"><span class="c2">Seus interesses</span><b>' + meus.length + '</b></div>' +
      '<div class="entre s13 mt8"><span class="c2">ONGs no ar</span><b>' +
        filtrar(DB.ongs, function(o){ return vitrineVisivel(o); }).length + '</b></div>' +
      (pes && pes.perfil ? '<button class="b b-f b-s b-bloco mt14" onclick="abrirQuiz()">↺ Refazer meu teste</button>' : '') +
    '</div>';
}

function cartaoPorQue(item){
  var c = item.comp;
  if(c.score === null) return '';
  return '<div class="cx" style="border-color:' + corDoScore(c.score) + '">' +
    '<div class="linha" style="flex-wrap:nowrap;align-items:flex-start">' +
      anel(c.score, 100, corDoScore(c.score), 66) +
      '<div style="flex:1;min-width:0"><div class="rot">Compatibilidade</div>' +
      '<div class="neg s13">' + textoDoScore(c.score) + '</div></div>' +
    '</div>' +
    (c.pontos.length ? '<div class="mt14">' + c.pontos.map(function(p){
      return '<div class="s12 mb8" style="display:flex;gap:7px"><span class="ok">✓</span><span class="c2">' +
        esc(p) + '</span></div>'; }).join('') + '</div>' : '') +
    (c.alertas.length ? '<div class="sep"></div>' + c.alertas.map(function(a){
      return '<div class="s12 mb8" style="display:flex;gap:7px"><span class="al">⚠</span><span class="c2">' +
        esc(a) + '</span></div>'; }).join('') : '') +
    '<p class="s11 c3 mb0 mt8">A nota nunca esconde ninguém — ela só organiza a fila e mostra o que ' +
    'vai dar trabalho, para você decidir sabendo.</p>' +
  '</div>';
}

/* ================================================================ QUIZ */
var QUIZ_EST = { passo:0, resp:{} };
function abrirQuiz(){
  var pes = pessoaAtual();
  QUIZ_EST = { passo:0, resp: pes && pes.perfil ? JSON.parse(JSON.stringify(pes.perfil)) : {} };
  pintarQuiz();
}
function pintarQuiz(){
  var q = QUIZ[QUIZ_EST.passo];
  var total = QUIZ.length;
  if(!q){ salvarQuiz(); return; }
  var atual = QUIZ_EST.resp[q.chave];
  modal('🧭 Encontrar quem combina',
    '<div class="entre mb14"><span class="s11 c3">Pergunta ' + (QUIZ_EST.passo+1) + ' de ' + total + '</span>' +
      '<span class="s11 c3">' + Math.round((QUIZ_EST.passo)/total*100) + '%</span></div>' +
    '<div class="barra mb14"><i style="width:' + ((QUIZ_EST.passo)/total*100) + '%"></i></div>' +
    '<div style="font-size:32px;text-align:center">' + q.icone + '</div>' +
    '<h3 style="text-align:center;margin:8px 0 4px;font-size:18px">' + q.titulo + '</h3>' +
    (q.aviso ? '<p class="s12 c3 tc" style="max-width:400px;margin:0 auto 6px">' + q.aviso + '</p>' : '') +
    '<div style="display:flex;flex-direction:column;gap:8px;margin-top:16px">' +
      q.opcoes.map(function(o, i){
        var sel = String(atual) === String(o.v);
        return '<button class="check ' + (sel?'on':'') + '" style="justify-content:center;font-weight:600" ' +
          'onclick="respQuiz(' + i + ')">' + o.r + '</button>';
      }).join('') +
    '</div>',
    (QUIZ_EST.passo > 0 ? '<button class="b b-f" onclick="QUIZ_EST.passo--;pintarQuiz()">← Voltar</button>' : '') +
    '<button class="b b-t" onclick="fecharModal()">Depois eu faço</button>',
    'estreita');
}
function respQuiz(ix){
  var q = QUIZ[QUIZ_EST.passo];
  QUIZ_EST.resp[q.chave] = q.opcoes[ix].v;
  QUIZ_EST.passo++;
  if(QUIZ_EST.passo >= QUIZ.length) salvarQuiz();
  else pintarQuiz();
}
function salvarQuiz(){
  var pes = pessoaAtual();
  if(!pes){
    fecharModal();
    pedirCadastro(function(nova){ nova.perfil = QUIZ_EST.resp; salvar(); recarregar(); });
    return;
  }
  pes.perfil = QUIZ_EST.resp;
  if(pes.papeis.indexOf('adotante') < 0) pes.papeis.push('adotante');
  salvar(); fecharModal();
  aviso('Pronto! Reorganizei a fila para o seu perfil. 🧭', 'ok');
  recarregar();
}

/* ================================================================ PERFIL DO PET */
function verPet(petId){
  var p = achar(DB.pets, petId); if(!p) return;
  var o = ongDoPet(p), pes = pessoaAtual();
  var c = compatibilidade(pes && pes.perfil, p);
  var s = saudePet(p.id);
  var espera = difDias(p.resgatadoEm, isoHoje());
  var jaInteressado = pes && filtrar(DB.interesses, function(i){
    return i.petId === p.id && i.pessoaId === pes.id; }).length > 0;

  modal(esc(p.nome),
    '<div style="height:230px;border-radius:var(--r);background-size:cover;background-position:center;' +
      'position:relative;margin-bottom:16px;' + estiloFoto(p) + '">' +
      (c.score !== null ? '<div class="compat" style="position:absolute;top:12px;right:12px"><b>' + c.score +
        '%</b><small>combina</small></div>' : '') +
    '</div>' +
    '<div class="linha mb14">' +
      etiqueta(idadeTexto(p.nascimento), 'et-ca') + etiqueta(rotuloPorte(p.porte)) +
      etiqueta(p.sexo === 'M' ? 'macho' : 'fêmea') +
      etiqueta((p.castrado ? '✓ castrad' : 'não castrad') + (p.sexo==='F'?'a':'o'), p.castrado ? 'et-ok' : 'et-al') +
      (s.emDia ? etiqueta('✓ vacinas em dia', 'et-ok') : etiqueta(s.atrasadas + ' vacina(s) pendente(s)', 'et-al')) +
      (p.urgente ? etiqueta('⚡ urgente', 'et-pe') : '') +
      (p.microchip ? etiqueta('microchipado', 'et-in') : '') +
    '</div>' +
    '<p class="s13" style="line-height:1.6">' + esc(p.historia) + '</p>' +
    '<div class="g g2 mt14">' +
      blocoInfo('Jeito dele', (p.personalidade||[]).join(', ') || '—') +
      blocoInfo('Energia', '★'.repeat(p.energia) + '☆'.repeat(5-p.energia)) +
      blocoInfo('Aguenta sozinho', 'até ' + p.tempoSozinho + 'h por dia') +
      blocoInfo('Custo estimado', brl(p.custoMensal) + '/mês') +
      blocoInfo('Convive com', [p.sociavelCaes?'cães':'', p.sociavelGatos?'gatos':'',
        p.sociavelCriancas?'crianças':''].filter(Boolean).join(', ') || 'prefere ser filho único') +
      blocoInfo('Esperando há', espera > 365 ? Math.floor(espera/365) + ' ano(s)' : espera + ' dias') +
    '</div>' +
    ((p.necessidades||[]).length ? '<div class="aviso aviso-i mt14"><span class="em">💗</span><div>' +
      '<b>Precisa de cuidado especial</b>' + esc(p.necessidades.join(', ')) +
      '. Animais assim esperam bem mais — e quem adota costuma dizer que ganhou mais do que deu.</div></div>' : '') +
    (p.devolucoes ? '<div class="aviso aviso-a mt14"><span class="em">↩️</span><div>' +
      '<b>Já foi devolvido ' + p.devolucoes + 'x</b>Contamos isso de propósito. ' +
      'Saber o histórico antes evita a terceira vez.</div></div>' : '') +
    (c.score !== null ? blocoCompat(c) : '<div class="aviso aviso-i mt14"><span class="em">🧭</span><div>' +
      '<b>Quer saber se combina com você?</b>' +
      '<button class="b b-u b-s mt8" onclick="fecharModal();abrirQuiz()">Fazer o teste</button></div></div>') +
    '<div class="sep"></div>' +
    '<div class="linha" style="flex-wrap:nowrap">' +
      '<div class="pav" style="background:' + o.cor + ';color:#fff">' + iniciais(o.nome) + '</div>' +
      '<div style="flex:1;min-width:0"><div class="neg s13">' + esc(o.nome) + '</div>' +
      '<div class="s11 c3">' + esc(o.cidade) + '/' + o.uf + ' · ' + esc(o.instagram || '') + '</div></div>' +
      '<button class="b b-f b-s" onclick="verOng(\'' + o.id + '\')">Sobre a ONG</button>' +
    '</div>',
    '<button class="b b-f" onclick="cartazPet(\'' + p.id + '\')">🖨 Cartaz</button>' +
    '<button class="b b-r" onclick="abrirDoacao(\'' + o.id + '\',\'' + p.id + '\')">🎗️ Apadrinhar</button>' +
    (jaInteressado
      ? '<button class="b b-f" disabled>✓ Interesse enviado</button>'
      : '<button class="b b-p" onclick="interessarPor(\'' + p.id + '\')">💚 Tenho interesse</button>'),
    'larga');
}
function etiqueta(txt, cls){ return '<span class="et ' + (cls||'') + '">' + esc(txt) + '</span>'; }
function blocoInfo(rot, val){
  return '<div class="cx plana" style="background:var(--sup-2);margin:0;padding:12px">' +
    '<div class="rot">' + rot + '</div><div class="s13 neg">' + esc(val) + '</div></div>';
}
function blocoCompat(c){
  return '<div class="cx plana mt14" style="border:1px solid ' + corDoScore(c.score) + ';margin:0">' +
    '<div class="linha" style="flex-wrap:nowrap">' + anel(c.score,100,corDoScore(c.score),58) +
    '<div><div class="neg s13">' + textoDoScore(c.score) + '</div>' +
    '<div class="s11 c3">com base no que você respondeu</div></div></div>' +
    '<div class="mt14">' +
      c.pontos.map(function(p){ return '<div class="s12 mb8"><span class="ok neg">✓</span> ' + esc(p) + '</div>'; }).join('') +
      c.alertas.map(function(a){ return '<div class="s12 mb8"><span class="al neg">⚠</span> ' + esc(a) + '</div>'; }).join('') +
    '</div></div>';
}
function interessarPor(petId){
  var pes = pessoaAtual();
  var pet = achar(DB.pets, petId);
  if(!pes){ fecharModal(); pedirCadastro(function(){ interessarPor(petId); }); return; }
  criarInteresse(pet, pes, compatibilidade(pes.perfil, pet));
  salvar(); fecharModal();
  ir('meus-interesses');
}

/* ---- cartaz para imprimir (feira de adoção) ---- */
function cartazPet(petId){
  var p = achar(DB.pets, petId), o = ongDoPet(p);
  var link = 'https://aular.app/p/' + slug(p.nome) + '-' + p.id.slice(-4);
  modal('Cartaz de ' + esc(p.nome),
    '<div class="imprimir-area" style="text-align:center;padding:18px;border:2px solid var(--linha);border-radius:16px">' +
      '<div style="font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:var(--tinta-3);font-weight:700">' +
        'Me leva pra casa?</div>' +
      '<h1 style="font-size:44px;margin:6px 0 2px">' + esc(p.nome) + '</h1>' +
      '<div class="s13 c2">' + idadeTexto(p.nascimento) + ' · ' + rotuloPorte(p.porte) + ' · ' +
        (p.sexo === 'M' ? 'macho' : 'fêmea') + (p.castrado ? ' · castrado' : '') + '</div>' +
      '<div style="height:250px;border-radius:14px;margin:14px 0;background-size:cover;background-position:center;' +
        estiloFoto(p) + '"></div>' +
      '<p class="s13" style="max-width:420px;margin:0 auto 12px;line-height:1.55">' +
        esc(truncar(p.historia, 240)) + '</p>' +
      '<div class="linha" style="justify-content:center;align-items:center;gap:18px;margin-top:14px">' +
        '<div>' + QR.svg(link, 128) + '</div>' +
        '<div style="text-align:left">' +
          '<div class="s11 c3">Aponte a câmera</div>' +
          '<div class="neg s16">Perfil completo,<br>vacinas e contato</div>' +
          '<div class="s12 c2 mt8">' + esc(o.nome) + '</div>' +
          '<div class="s12 c2">' + brTelefone(o.telefone) + '</div>' +
          '<div class="s12 c2">' + esc(o.instagram || '') + '</div>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<p class="s11 c3 tc mt8 no-print">Imprima em A4 e leve para a feira. O QR abre o perfil ' +
      'com fotos, vacinas e o botão de interesse.</p>',
    '<button class="b b-f" onclick="copiar(\'' + link + '\',\'Link copiado!\')">🔗 Copiar link</button>' +
    '<button class="b b-p" onclick="window.print()">🖨 Imprimir</button>',
    'larga');
}

/* ---- página pública da ONG ---- */
function verOng(ongId){
  var o = achar(DB.ongs, ongId);
  var pets = filtrar(petsDa(ongId), function(p){ return p.status === 'disponivel'; });
  var ado = filtrar(DB.adocoes, function(a){ return a.ongId === ongId; });
  var doa = filtrar(DB.doacoes, function(d){ return d.ongId === ongId && d.data >= maisDias(isoHoje(),-30); });
  modal(esc(o.nome),
    '<div class="linha mb14"><div class="pav g" style="background:' + o.cor + ';color:#fff">' +
      iniciais(o.nome) + '</div><div><div class="s13 c2">' + esc(o.cidade) + '/' + o.uf +
      ' · desde ' + brData(o.criadaEm).slice(3) + '</div>' +
      '<div class="linha mt8">' + (o.transparencia ? etiqueta('🔍 Prestação de contas aberta','et-ok') : '') +
      etiqueta(esc(o.instagram||'')) + '</div></div></div>' +
    '<p class="s13" style="line-height:1.6">' + esc(o.sobre) + '</p>' +
    '<div class="g g4 mt14">' +
      kpiMini('Para adoção', pets.length, '🐾') +
      kpiMini('Já adotados', ado.length, '🏡') +
      kpiMini('Doações (30d)', brlCurto(somar(doa, function(d){ return d.valor; })), '💛') +
      kpiMini('Padrinhos', filtrar(doa, function(d){ return d.tipo==='apadrinhamento'; }).length, '🎗️') +
    '</div>' +
    (pets.length ? '<div class="rot mt20 mb8">Quem está esperando</div>' +
      '<div class="g g-a">' + pets.slice(0,6).map(cardPet).join('') + '</div>' : ''),
    '<button class="b b-f" onclick="abrirZap(\'' + o.telefone + '\',\'Olá! Vi o perfil de vocês no AuLar.\')">💬 WhatsApp</button>' +
    '<button class="b b-r" onclick="abrirDoacao(\'' + o.id + '\')">💛 Doar</button>',
    'larga');
}
function kpiMini(rot, val, em){
  return '<div class="cx plana" style="background:var(--sup-2);margin:0;padding:12px;text-align:center">' +
    '<div style="font-size:19px">' + em + '</div>' +
    '<div class="neg s16 mono">' + val + '</div><div class="s11 c3">' + rot + '</div></div>';
}
function cardPet(p){
  var pes = pessoaAtual();
  var c = compatibilidade(pes && pes.perfil, p);
  return '<div class="petc" onclick="verPet(\'' + p.id + '\')">' +
    '<div class="cap" style="' + estiloFoto(p) + '">' +
      (p.urgente ? '<span class="et et-pe flag">⚡ urgente</span>' : '') +
      (c.score !== null ? '<span class="pc">' + c.score + '%</span>' : '') +
    '</div>' +
    '<div class="cor"><h4>' + esc(p.nome) + '</h4>' +
    '<div class="sub">' + idadeTexto(p.nascimento) + ' · ' + rotuloPorte(p.porte) + ' · ' +
      esc(ongDoPet(p).cidade) + '</div>' +
    '<div class="tg">' + (p.personalidade||[]).slice(0,2).map(function(t){
      return '<span class="et">' + esc(t) + '</span>'; }).join('') + '</div></div></div>';
}

/* ================================================================ MEUS INTERESSES */
registrarTela('meus-interesses', {
  titulo:'Meus interesses',
  sub:'onde cada conversa parou',
  render:function(){
    var pes = pessoaAtual();
    if(!pes) return vazio('👤','Entre para acompanhar','Crie um cadastro rápido para guardar seus interesses.',
      '<button class="b b-p" onclick="pedirCadastro()">Criar meu cadastro</button>');
    var meus = ordenar(filtrar(DB.interesses, function(i){ return i.pessoaId === pes.id; }),
                       function(i){ return i.atualizadoEm; }, true);
    if(!meus.length) return vazio('💚','Você ainda não curtiu ninguém',
      'Vá em Descobrir e deslize para a direita em quem chamar sua atenção.',
      '<button class="b b-p" onclick="ir(\'descobrir\')">Descobrir animais</button>');
    var ETAPAS = {interesse:'Interesse enviado', triagem:'Em triagem', entrevista:'Entrevista marcada',
      visita:'Visita agendada', termo:'Assinando o termo', entregue:'Adotado! 🎉', recusado:'Não seguiu'};
    return '<div class="g g-b">' + meus.map(function(i){
      var p = achar(DB.pets, i.petId), o = achar(DB.ongs, i.ongId);
      if(!p) return '';
      var passos = ['interesse','triagem','entrevista','visita','termo','entregue'];
      var ix = passos.indexOf(i.etapa);
      return '<div class="cx" style="margin:0">' +
        '<div class="linha" style="flex-wrap:nowrap"><div class="pav" style="' + estiloFoto(p) + '"></div>' +
        '<div style="flex:1;min-width:0"><div class="neg">' + esc(p.nome) + '</div>' +
        '<div class="s11 c3 corte">' + esc(o.nome) + '</div></div>' +
        (i.score !== null ? '<span class="et et-uv">' + i.score + '%</span>' : '') + '</div>' +
        '<div class="barra mt14"><i style="width:' + ((ix+1)/6*100) + '%"></i></div>' +
        '<div class="entre mt8"><span class="s12 neg">' + (ETAPAS[i.etapa]||i.etapa) + '</span>' +
        '<span class="s11 c3">' + quandoTexto(i.atualizadoEm) + '</span></div>' +
        (i.visita ? '<div class="aviso aviso-i mt14 mb0"><span class="em">📅</span><div><b>Visita marcada</b>' +
          brData(i.visita.data) + ' às ' + esc(i.visita.hora) + ' — ' + esc(i.visita.local) + '</div></div>' : '') +
        '<div class="linha mt14"><button class="b b-f b-s" onclick="verPet(\'' + p.id + '\')">Ver perfil</button>' +
        '<button class="b b-f b-s" onclick="abrirZap(\'' + o.telefone + '\',\'Olá! Tenho interesse no ' +
          esc(p.nome) + ' (AuLar).\')">💬 Falar com a ONG</button></div>' +
      '</div>';
    }).join('') + '</div>';
  }
});

function vazio(em, titulo, texto, botao){
  return '<div class="vazio cx"><span class="em">' + em + '</span><b>' + titulo + '</b>' +
    '<p class="s13" style="max-width:400px;margin:0 auto 14px">' + texto + '</p>' + (botao||'') + '</div>';
}

/* ================================================================ DOAR */
registrarTela('doar', {
  titulo:'Doar',
  sub:'dinheiro, ração ou apadrinhar um bicho',
  render:function(){
    var ongs = filtrar(DB.ongs, function(o){ return vitrineVisivel(o); });
    return '' +
    '<div class="cx" style="background:linear-gradient(120deg,var(--rosa-clr),var(--sup));border-color:var(--rosa)">' +
      '<div class="linha" style="flex-wrap:nowrap"><div style="font-size:34px">💛</div>' +
      '<div><h3 style="font-size:17px">Toda doação vira dia de comida, vacina e castração</h3>' +
      '<p class="s12 c2 mb0">Cada ONG aqui publica onde o dinheiro foi parar. Você recebe o recibo ' +
      'e, um mês depois, a notícia do bicho que sua doação ajudou.</p></div></div>' +
    '</div>' +
    '<div class="abas">' +
      '<button class="aba on" onclick="abaDoar(this,\'dinheiro\')">💸 Dinheiro</button>' +
      '<button class="aba" onclick="abaDoar(this,\'racao\')">🎁 Ração e insumos</button>' +
      '<button class="aba" onclick="abaDoar(this,\'padrinho\')">🎗️ Apadrinhar</button>' +
    '</div><div id="doar-corpo"></div>';
  },
  depois:function(){ pintarDoar('dinheiro'); }
});
function abaDoar(btn, qual){
  $$('.aba', btn.parentNode).forEach(function(b){ b.classList.remove('on'); });
  btn.classList.add('on');
  pintarDoar(qual);
}
function pintarDoar(qual){
  var el = $('#doar-corpo'); if(!el) return;
  var ongs = filtrar(DB.ongs, function(o){ return vitrineVisivel(o); });

  if(qual === 'dinheiro'){
    el.innerHTML = '<div class="g g-b">' + ongs.map(function(o){
      var pets = filtrar(petsDa(o.id), function(p){ return p.status !== 'adotado'; }).length;
      var custoMes = somar(filtrar(petsDa(o.id), function(p){ return p.status !== 'adotado'; }),
                           function(p){ return p.custoMensal; });
      var arrec = somar(filtrar(DB.doacoes, function(d){
        return d.ongId === o.id && d.data >= isoHoje().slice(0,8) + '01'; }), function(d){ return d.valor; });
      return '<div class="cx" style="margin:0">' +
        '<div class="linha" style="flex-wrap:nowrap"><div class="pav" style="background:' + o.cor +
          ';color:#fff">' + iniciais(o.nome) + '</div>' +
        '<div style="flex:1;min-width:0"><div class="neg corte">' + esc(o.nome) + '</div>' +
        '<div class="s11 c3">' + esc(o.cidade) + ' · ' + pets + ' animais sob cuidado</div></div></div>' +
        '<div class="rot mt14">Precisa de ' + brl(custoMes) + ' por mês</div>' +
        '<div class="barra mt8"><i style="width:' + limite(arrec/(custoMes||1)*100,0,100) + '%"></i></div>' +
        '<div class="entre mt8"><span class="s11 c3">arrecadado este mês</span>' +
        '<span class="s12 neg">' + brl(arrec) + '</span></div>' +
        '<button class="b b-r b-bloco mt14" onclick="abrirDoacao(\'' + o.id + '\')">Doar para esta ONG</button>' +
      '</div>';
    }).join('') + '</div>';
  }

  if(qual === 'racao'){
    el.innerHTML =
      '<div class="aviso aviso-c"><span class="em">💡</span><div><b>Por que lista de presentes e não saco de ração na porta</b>' +
      'Ração doada solta chega em marca trocada, perto do vencimento e sem ninguém para carregar. ' +
      'Aqui a ONG publica o que precisa, você compra no pet shop parceiro e a entrega vai direto para ela.</div></div>' +
      '<div class="g g-b">' + ongs.map(function(o){
        var lista = filtrar(DB.presentes, function(g){ return g.ongId === o.id; });
        if(!lista.length) return '';
        return '<div class="cx" style="margin:0"><div class="cx-h"><div>' +
          '<h3 style="font-size:14px">' + esc(o.nome) + '</h3>' +
          '<div class="desc">' + esc(o.cidade) + '</div></div></div>' +
          lista.map(function(g){
            var falta = Math.max(0, g.meta - g.recebidos);
            return '<div class="mb14"><div class="entre"><span class="s13 neg">' + esc(g.item) + '</span>' +
              '<span class="s12 mono">' + brl(g.precoUnit) + '</span></div>' +
              '<div class="barra mt8 ' + (falta ? '' : 'v') + '"><i style="width:' +
                (g.recebidos/g.meta*100) + '%"></i></div>' +
              '<div class="entre mt8"><span class="s11 c3">' + g.recebidos + ' de ' + g.meta +
                ' · ' + esc(g.parceiro) + '</span>' +
              (falta ? '<button class="b b-p b-s" onclick="darPresente(\'' + g.id + '\')">Presentear</button>'
                     : '<span class="et et-ok">✓ completo</span>') + '</div></div>';
          }).join('') +
        '</div>';
      }).join('') + '</div>';
  }

  if(qual === 'padrinho'){
    var candidatos = ordenar(filtrar(petsVisiveis(), function(p){
      return p.especial || difDias(p.resgatadoEm, isoHoje()) > 300;
    }), function(p){ return p.resgatadoEm; });
    el.innerHTML =
      '<div class="aviso aviso-i"><span class="em">🎗️</span><div><b>Nem todo mundo pode adotar — mas todo mundo pode apadrinhar</b>' +
      'Você banca a ração e o remédio de UM animal específico, com valor mensal a partir de R$ 20. ' +
      'Todo mês chega notícia dele. É o que sustenta os idosos, os FIV+ e os que ninguém leva.</div></div>' +
      '<div class="g g-a">' + candidatos.map(function(p){
        var padr = filtrar(DB.doacoes, function(d){ return d.petId === p.id && d.tipo === 'apadrinhamento'; }).length;
        return '<div class="petc"><div class="cap" style="' + estiloFoto(p) + '">' +
          (p.especial ? '<span class="et et-ro flag">💗 especial</span>' : '') + '</div>' +
          '<div class="cor"><h4>' + esc(p.nome) + '</h4>' +
          '<div class="sub">' + idadeTexto(p.nascimento) + ' · esperando há ' +
            Math.floor(difDias(p.resgatadoEm, isoHoje())/30) + ' meses</div>' +
          '<div class="s11 c2">' + esc(truncar(p.historia, 80)) + '</div>' +
          '<div class="entre mt8"><span class="s11 c3">' + padr + ' padrinho(s)</span>' +
          '<button class="b b-r b-s" onclick="abrirDoacao(\'' + p.ongId + '\',\'' + p.id + '\')">Apadrinhar</button>' +
          '</div></div></div>';
      }).join('') + '</div>';
  }
}

/* ---- fluxo de doação ---- */
var DOA = { ongId:null, petId:null, valor:50, tipo:'unica', meio:'pix', cobre:true };
function abrirDoacao(ongId, petId){
  DOA = { ongId:ongId, petId:petId||null, valor: petId ? 30 : 50,
          tipo: petId ? 'apadrinhamento' : 'unica', meio:'pix', cobre:true };
  pintarDoacao();
}
function pintarDoacao(){
  var o = achar(DB.ongs, DOA.ongId);
  var pet = DOA.petId ? achar(DB.pets, DOA.petId) : null;
  var taxa = Math.round(DOA.valor * DB.plataforma.taxaDoacao) / 100;
  var totalPago = DOA.cobre ? DOA.valor + taxa : DOA.valor;
  var recebeOng = DOA.cobre ? DOA.valor : DOA.valor - taxa;
  var valores = DOA.tipo === 'apadrinhamento' ? [20,30,50,80] : [25,50,100,200];

  modal((pet ? '🎗️ Apadrinhar ' + esc(pet.nome) : '💛 Doar para ' + esc(o.nome)),
    (pet ? '<div class="linha mb14"><div class="pav g" style="' + estiloFoto(pet) + '"></div>' +
      '<div><div class="neg">' + esc(pet.nome) + '</div><div class="s12 c2">' +
      esc(truncar(pet.historia, 90)) + '</div></div></div>' : '') +
    (DOA.tipo !== 'apadrinhamento' ?
      '<div class="f mb14"><label>Tipo</label><div class="opcoes">' +
      [['unica','Doação única'],['recorrente','Todo mês']].map(function(t){
        return '<button class="op ' + (DOA.tipo===t[0]?'on car':'') + '" onclick="DOA.tipo=\'' + t[0] +
          '\';pintarDoacao()">' + t[1] + '</button>'; }).join('') + '</div></div>' : '') +
    '<div class="f mb14"><label>Valor' + (DOA.tipo !== 'unica' ? ' por mês' : '') + '</label>' +
      '<div class="opcoes">' + valores.map(function(v){
        return '<button class="op ' + (DOA.valor===v?'on car':'') + '" onclick="DOA.valor=' + v +
          ';pintarDoacao()">' + brl(v).replace(',00','') + '</button>'; }).join('') +
      '<input class="i i-s" style="width:110px" type="number" min="5" placeholder="outro" ' +
        'onchange="DOA.valor=+this.value||5;pintarDoacao()"></div></div>' +
    '<div class="f mb14"><label>Como pagar</label><div class="opcoes">' +
      (DOA.tipo === 'unica'
        ? [['pix','⚡ Pix'],['credito','💳 Crédito'],['debito','🏦 Débito']]
        : [['pix_automatico','⚡ Pix Automático'],['credito','💳 Crédito recorrente']]
      ).map(function(m){
        return '<button class="op ' + (DOA.meio===m[0]?'on car':'') + '" onclick="DOA.meio=\'' + m[0] +
          '\';pintarDoacao()">' + m[1] + '</button>'; }).join('') + '</div>' +
      (DOA.meio === 'pix_automatico' ? '<div class="aj">Você autoriza uma vez e o débito acontece ' +
        'sozinho todo mês, direto na conta — sem depender de cartão que vence.</div>' : '') +
    '</div>' +
    '<label class="check ' + (DOA.cobre?'on':'') + '"><input type="checkbox" ' + (DOA.cobre?'checked':'') +
      ' onchange="DOA.cobre=this.checked;pintarDoacao()"><span>' +
      '<b>Quero cobrir a taxa de ' + brl(taxa) + '</b><br>' +
      '<span class="s12 c2">Assim a ONG recebe os ' + brl(DOA.valor) + ' inteiros. ' +
      'A taxa mantém a plataforma no ar e gratuita para as ONGs pequenas.</span></span></label>' +
    '<div class="cx plana mt14" style="background:var(--sup-2);margin:0">' +
      '<div class="entre s13"><span class="c2">Você paga</span><b class="mono">' + brl(totalPago) + '</b></div>' +
      '<div class="entre s13 mt8"><span class="c2">A ONG recebe</span><b class="mono ok">' + brl(recebeOng) + '</b></div>' +
      '<div class="entre s12 mt8"><span class="c3">Plataforma</span><span class="mono c3">' + brl(taxa) + '</span></div>' +
    '</div>' +
    (DOA.meio === 'pix' || DOA.meio === 'pix_automatico' ? blocoPix(o, totalPago) : ''),
    '<button class="b b-f" onclick="fecharModal()">Cancelar</button>' +
    '<button class="b b-r" onclick="confirmarDoacao()">Confirmar ' + brl(totalPago) + '</button>');
}
function blocoPix(o, valor){
  var codigo = pixBRCode(o.pixChave, o.nome, o.cidade, valor, 'AULAR' + Date.now().toString(36).slice(-8));
  return '<div class="cx plana mt14" style="text-align:center;background:var(--sup-2);margin:0">' +
    '<div class="rot mb8">Pix copia e cola</div>' +
    '<div style="display:inline-block;background:#fff;padding:8px;border-radius:12px">' + QR.svg(codigo, 132) + '</div>' +
    '<button class="b b-f b-s b-bloco mt8" onclick="copiar(' + JSON.stringify(codigo).replace(/"/g,'&quot;') +
      ',\'Código Pix copiado!\')">📋 Copiar código</button>' +
    '<div class="s11 c3 mt8">Chave: ' + esc(o.pixChave) + '</div></div>';
}
function confirmarDoacao(){
  var pes = pessoaAtual();
  if(!pes){ fecharModal(); pedirCadastro(function(){ pintarDoacao(); }); return; }
  var taxa = Math.round(DOA.valor * DB.plataforma.taxaDoacao) / 100;
  DB.doacoes.unshift({
    id:id('doa'), ongId:DOA.ongId, pessoaId:pes.id, pessoaNome:pes.nome,
    tipo:DOA.tipo, meio:DOA.meio, valor:DOA.valor, data:isoHoje(),
    status:'confirmada', petId:DOA.petId, taxa:taxa, coberta:DOA.cobre
  });
  if(pes.papeis.indexOf('doador') < 0) pes.papeis.push('doador');
  var o = achar(DB.ongs, DOA.ongId);
  registrar(DOA.ongId, 'doacao', 'Doação de ' + brl(DOA.valor) + ' — ' + pes.nome);
  notificar(DOA.ongId, 'doacao', '💛 ' + pes.nome + ' doou ' + brl(DOA.valor) +
    (DOA.tipo !== 'unica' ? ' (recorrente)' : ''));
  salvar(); fecharModal();
  modal('💛 Obrigada!',
    '<div style="text-align:center;padding:14px">' +
    '<div style="font-size:48px">🐾</div>' +
    '<h3 style="margin:10px 0 6px">' + brl(DOA.valor) + ' para ' + esc(o.nome) + '</h3>' +
    '<p class="s13 c2">' + traduzirDoacao(DOA.valor, DOA.ongId) + '</p>' +
    '<p class="s12 c3 mt14">Você vai receber o recibo por e-mail e, daqui a um mês, ' +
      'a prestação de contas de onde esse valor foi parar.</p></div>',
    '<button class="b b-p" onclick="fecharModal()">Fechar</button>', 'estreita');
}
/** Transforma dinheiro em coisa concreta — é o que faz doador voltar. */
function traduzirDoacao(valor, ongId){
  var pets = filtrar(petsDa(ongId), function(p){ return p.status !== 'adotado'; });
  var custoDia = pets.length ? somar(pets, function(p){ return p.custoMensal; }) / 30 / pets.length : 7;
  var dias = Math.round(valor / custoDia);
  var vacinas = Math.floor(valor / 45);
  if(dias >= 30) return 'Isso paga cerca de ' + Math.floor(dias/30) + ' mês(es) de cuidado de um animal — ' +
    'ração, vermífugo e a reserva do veterinário.';
  if(vacinas >= 1) return 'Isso é ' + dias + ' dias de comida para um animal, ou ' + vacinas +
    ' dose(s) de vacina múltipla.';
  return 'Isso é ' + Math.max(1,dias) + ' dia(s) de comida para um animal que está esperando um lar.';
}
function darPresente(presId){
  var g = achar(DB.presentes, presId); if(!g) return;
  var o = achar(DB.ongs, g.ongId);
  var taxa = Math.round(g.precoUnit * DB.plataforma.taxaPresente) / 100;
  confirmar('Presentear: ' + esc(g.item),
    'Você compra em <b>' + esc(g.parceiro) + '</b> por <b>' + brl(g.precoUnit) + '</b> e a entrega vai ' +
    'direto para a <b>' + esc(o.nome) + '</b>. Você não carrega nada.',
    function(){
      g.recebidos++;
      DB.doacoes.unshift({ id:id('doa'), ongId:g.ongId, pessoaId:SESSAO.pessoaId,
        pessoaNome: pessoaAtual() ? pessoaAtual().nome : 'Anônimo', tipo:'presente',
        meio:'credito', valor:g.precoUnit, data:isoHoje(), status:'confirmada',
        petId:null, taxa:taxa, coberta:true, item:g.item });
      // entra no estoque da ONG
      var est = filtrar(DB.estoque, function(e){ return e.ongId === g.ongId && e.item.indexOf('Ração adulto') === 0; })[0];
      if(est && g.item.indexOf('ração') >= 0){ est.quantidade += 15; }
      notificar(g.ongId, 'doacao', '🎁 Você recebeu: ' + g.item);
      registrar(g.ongId, 'doacao', 'Presente recebido: ' + g.item);
      salvar(); recarregar();
      aviso('🎁 Presente confirmado! A ' + o.nome + ' já foi avisada.', 'ok');
    }, 'Comprar e doar');
}

/* ================================================================ LAR TEMPORÁRIO */
registrarTela('lar-temporario', {
  titulo:'Ser lar temporário',
  sub:'a peça que falta em quase toda ONG',
  render:function(){
    var pes = pessoaAtual();
    var jaEh = pes && pes.lar && pes.lar.ativo;
    var lares = filtrar(DB.pessoas, function(p){ return p.lar && p.lar.ativo; });
    var vagas = somar(lares, function(p){ return Math.max(0, p.lar.capacidade - p.lar.ocupadas); });
    var precisam = filtrar(DB.pets, function(p){
      return p.status === 'disponivel' && !p.larTemporarioId && (p.urgente || p.especial); });
    return '' +
    '<div class="cx" style="background:linear-gradient(120deg,var(--verde-clr),var(--sup));border-color:var(--verde)">' +
      '<div class="linha" style="flex-wrap:nowrap"><div style="font-size:36px">🏠</div>' +
      '<div><h3 style="font-size:18px">Lar temporário é o gargalo real do resgate</h3>' +
      '<p class="s13 c2 mb0">A maior parte das ONGs do país não tem abrigo: os animais vivem em casas ' +
      'de voluntários. Quando não há lar disponível, o resgate simplesmente não acontece — o animal ' +
      'fica na rua. Você não adota: você hospeda por algumas semanas, e a ONG banca ração e veterinário.</p>' +
      '</div></div></div>' +
    '<div class="g g4">' +
      kpiCard('Lares ativos', lares.length, '🏠', '') +
      kpiCard('Vagas livres agora', vagas, '🛏️', 'v') +
      kpiCard('Esperando um lar', precisam.length, '⏳', 'a') +
      kpiCard('Custo para você', 'R$ 0', '💚', 'v') +
    '</div>' +
    (jaEh ? painelMeuLar(pes) :
      '<div class="cx"><div class="cx-h"><h3>Como funciona</h3></div>' +
      '<div class="g g4">' +
        passo(1,'Você se cadastra','Diz quanto espaço tem, quantos animais cabem e o que aceita receber.') +
        passo(2,'A ONG te chama','Quando aparece um resgate que combina com o seu espaço, você recebe o convite.') +
        passo(3,'O animal chega','Com ração, remédio e veterinário pagos pela ONG. Você entra com a casa e o carinho.') +
        passo(4,'Ele vai para a família','Você acompanha a adoção e libera a vaga para o próximo. E chora um pouco.') +
      '</div>' +
      '<button class="b b-v b-g b-bloco mt20" onclick="cadastrarLar()">Quero ser lar temporário</button>' +
      '</div>') +
    (precisam.length ? '<div class="cx"><div class="cx-h"><h3>Precisando de lar agora</h3>' +
      '<div class="desc">estes não têm para onde ir</div></div>' +
      '<div class="g g-a">' + precisam.slice(0,8).map(cardPet).join('') + '</div></div>' : '');
  }
});
function passo(n_, tit, txt){
  return '<div class="cx plana" style="background:var(--sup-2);margin:0">' +
    '<div style="width:26px;height:26px;border-radius:9px;background:var(--verde);color:#fff;' +
    'display:grid;place-items:center;font-weight:800;font-size:13px">' + n_ + '</div>' +
    '<div class="neg s13 mt8">' + tit + '</div><div class="s12 c2">' + txt + '</div></div>';
}
function kpiCard(rot, val, em, cls){
  return '<div class="kpi ' + (cls||'') + '"><div class="fx"></div>' +
    '<div class="rot">' + em + ' ' + rot + '</div><div class="val">' + val + '</div></div>';
}
function painelMeuLar(pes){
  var hospedados = filtrar(DB.pets, function(p){ return p.larTemporarioId === pes.id; });
  return '<div class="cx"><div class="cx-h"><h3>Meu lar temporário</h3>' +
    '<div class="dir"><span class="et et-ok">✓ ativo</span></div></div>' +
    '<div class="g g3 mb14">' +
      blocoInfo('Capacidade', pes.lar.capacidade + ' animal(is)') +
      blocoInfo('Ocupadas', hospedados.length + ' de ' + pes.lar.capacidade) +
      blocoInfo('Aceita', (pes.lar.aceita||[]).join(', ') + ' até porte ' + pes.lar.porteMax) +
    '</div>' +
    (hospedados.length
      ? '<div class="rot mb8">Quem está com você</div><div class="g g-a">' +
        hospedados.map(cardPet).join('') + '</div>'
      : '<div class="aviso aviso-i mb0"><span class="em">🛏️</span><div><b>Sua vaga está livre</b>' +
        'As ONGs da sua região vão te chamar quando aparecer um resgate que combine.</div></div>') +
    '<button class="b b-f b-s mt14" onclick="cadastrarLar()">Editar meu cadastro</button></div>';
}
function cadastrarLar(){
  var pes = pessoaAtual();
  if(!pes){ pedirCadastro(function(){ cadastrarLar(); }); return; }
  var l = pes.lar || {ativo:true, capacidade:1, aceita:['cao','gato'], porteMax:'medio'};
  modal('🏠 Cadastro de lar temporário',
    '<div class="g g2">' +
      '<div class="f"><label>Quantos animais cabem de uma vez?</label>' +
        '<select class="i" id="lar-cap">' + [1,2,3,4,5].map(function(v){
          return '<option value="' + v + '" ' + (l.capacidade===v?'selected':'') + '>' + v + '</option>'; }).join('') +
        '</select></div>' +
      '<div class="f"><label>Porte máximo</label><select class="i" id="lar-porte">' +
        [['pequeno','Pequeno'],['medio','Médio'],['grande','Grande']].map(function(o){
          return '<option value="' + o[0] + '" ' + (l.porteMax===o[0]?'selected':'') + '>' + o[1] + '</option>'; }).join('') +
        '</select></div>' +
    '</div>' +
    '<div class="f mt14"><label>Aceita receber</label><div class="opcoes" id="lar-aceita">' +
      [['cao','🐶 Cães'],['gato','🐱 Gatos']].map(function(o){
        return '<button class="op ' + ((l.aceita||[]).indexOf(o[0])>=0?'on car':'') +
          '" data-v="' + o[0] + '" onclick="this.classList.toggle(\'on\');this.classList.toggle(\'car\')">' +
          o[1] + '</button>'; }).join('') + '</div></div>' +
    '<div class="aviso aviso-o mt14"><span class="em">💚</span><div><b>O que a ONG cobre</b>' +
      'Ração, vermífugo, antipulgas, vacinas, castração e qualquer despesa veterinária. ' +
      'Você entra com espaço, comida na hora certa e companhia.</div></div>',
    '<button class="b b-f" onclick="fecharModal()">Cancelar</button>' +
    '<button class="b b-v" onclick="salvarLar()">Salvar cadastro</button>');
}
function salvarLar(){
  var pes = pessoaAtual();
  var aceita = $$('#lar-aceita .op.on').map(function(b){ return b.getAttribute('data-v'); });
  if(!aceita.length){ aviso('Escolha ao menos uma espécie.', 'err'); return; }
  pes.lar = {
    ativo:true, capacidade:+$('#lar-cap').value, porteMax:$('#lar-porte').value,
    aceita:aceita, desde: pes.lar ? pes.lar.desde : isoHoje(),
    ocupadas: pes.lar ? pes.lar.ocupadas : 0
  };
  if(pes.papeis.indexOf('lar') < 0) pes.papeis.push('lar');
  salvar(); fecharModal(); recarregar();
  aviso('🏠 Cadastro salvo! As ONGs da sua região já podem te chamar.', 'ok');
}

/* ================================================================ ACHADOS E PERDIDOS */
registrarTela('achados', {
  titulo:'Achados e perdidos',
  sub:'Focinho ID — quem sumiu e quem foi encontrado',
  render:function(){
    var abertos = filtrar(DB.achados, function(a){ return !a.resolvido; });
    var perdidos = filtrar(abertos, function(a){ return a.tipo === 'perdido'; });
    var achados = filtrar(abertos, function(a){ return a.tipo === 'encontrado'; });
    return '' +
    '<div class="aviso aviso-c"><span class="em">🔎</span><div>' +
      '<b>Cada dia conta</b>Animal perdido tem muito mais chance de voltar para casa nas primeiras ' +
      '48 horas. Publique aqui e o aviso vai para quem está na mesma região — ONGs, lares temporários ' +
      'e vizinhos cadastrados.</div></div>' +
    '<div class="linha mb14"><button class="b b-p" onclick="novoAchado(\'perdido\')">😿 Perdi meu animal</button>' +
      '<button class="b b-v" onclick="novoAchado(\'encontrado\')">🐾 Encontrei um animal</button>' +
      '<div class="espaco"></div>' +
      '<span class="et">' + filtrar(DB.achados, function(a){ return a.resolvido; }).length + ' reencontros</span></div>' +
    (perdidos.length ? '<div class="rot mb8">Procurando (' + perdidos.length + ')</div>' +
      '<div class="g g-a mb14">' + perdidos.map(cardAchado).join('') + '</div>' : '') +
    (achados.length ? '<div class="rot mb8">Encontrados — alguém está procurando (' + achados.length + ')</div>' +
      '<div class="g g-a">' + achados.map(cardAchado).join('') + '</div>' : '') +
    (!abertos.length ? vazio('🎉','Nenhum animal perdido agora','Que bom. Se acontecer, publique aqui na hora.') : '');
  }
});
function cardAchado(a){
  return '<div class="petc"><div class="cap" style="background-image:url(\'' + a.foto + '\')">' +
    '<span class="et ' + (a.tipo==='perdido'?'et-pe':'et-ok') + ' flag">' +
    (a.tipo==='perdido'?'😿 perdido':'🐾 encontrado') + '</span></div>' +
    '<div class="cor"><h4>' + esc(a.nome || (a.especie==='gato'?'Gato sem nome':'Cão sem nome')) + '</h4>' +
    '<div class="sub">' + esc(a.bairro) + ', ' + esc(a.cidade) + ' · ' + quandoTexto(a.data) + '</div>' +
    '<div class="s12 c2">' + esc(truncar(a.descricao, 90)) + '</div>' +
    (a.recompensa ? '<div class="et et-al mt8">recompensa ' + brl(a.recompensa) + '</div>' : '') +
    '<div class="linha mt8"><button class="b b-p b-s" onclick="abrirZap(\'' + a.contato + '\',\'' +
      'Vi o anúncio no AuLar sobre o animal ' + (a.tipo==='perdido'?'perdido':'encontrado') + '.\')">💬 Falar</button>' +
    '<button class="b b-f b-s" onclick="resolverAchado(\'' + a.id + '\')">✓ Reencontrado</button></div>' +
    '</div></div>';
}
function novoAchado(tipo){
  modal(tipo === 'perdido' ? '😿 Publicar animal perdido' : '🐾 Publicar animal encontrado',
    '<div class="g g2">' +
      '<div class="f"><label>Espécie</label><select class="i" id="ac-esp">' +
        '<option value="cao">Cachorro</option><option value="gato">Gato</option></select></div>' +
      '<div class="f"><label>Nome ' + (tipo==='perdido'?'':'(se souber)') + '</label>' +
        '<input class="i" id="ac-nome" placeholder="' + (tipo==='perdido'?'Nome do animal':'deixe em branco') + '"></div>' +
      '<div class="f"><label>Cidade</label><select class="i" id="ac-cid">' +
        todasCidades().map(function(c){ return '<option>' + esc(c) + '</option>'; }).join('') + '</select></div>' +
      '<div class="f"><label>Bairro / referência</label><input class="i" id="ac-bairro" placeholder="onde foi visto"></div>' +
      '<div class="f"><label>Quando</label><input class="i" type="date" id="ac-data" value="' + isoHoje() + '"></div>' +
      '<div class="f"><label>WhatsApp para contato</label><input class="i" id="ac-tel" placeholder="(11) 99999-9999"></div>' +
    '</div>' +
    '<div class="f mt14"><label>Descrição — quanto mais detalhe, melhor</label>' +
      '<textarea class="i" id="ac-desc" placeholder="Cor, porte, coleira, se é medroso, marcas..."></textarea></div>' +
    (tipo === 'perdido' ? '<div class="f mt14"><label>Recompensa (opcional)</label>' +
      '<input class="i" type="number" id="ac-rec" placeholder="0"></div>' : ''),
    '<button class="b b-f" onclick="fecharModal()">Cancelar</button>' +
    '<button class="b b-p" onclick="salvarAchado(\'' + tipo + '\')">Publicar agora</button>');
}
function salvarAchado(tipo){
  var desc = $('#ac-desc').value.trim(), tel = $('#ac-tel').value.trim();
  if(!desc || !tel){ aviso('Descrição e WhatsApp são obrigatórios.', 'err'); return; }
  var esp = $('#ac-esp').value;
  DB.achados.unshift({
    id:id('ac'), tipo:tipo, especie:esp, nome:$('#ac-nome').value.trim() || null,
    descricao:desc, cidade:$('#ac-cid').value, uf:'SP', bairro:$('#ac-bairro').value.trim(),
    data:$('#ac-data').value, contato:tel, foto:fotoGerada(desc, esp), resolvido:false,
    recompensa: $('#ac-rec') ? (+$('#ac-rec').value || 0) : 0
  });
  salvar(); fecharModal(); recarregar();
  aviso('Publicado! O aviso foi para quem está na mesma região. 🔎', 'ok');
}
function resolverAchado(acId){
  var a = achar(DB.achados, acId); if(!a) return;
  confirmar('Reencontrado?', 'Vamos marcar como resolvido e tirar da lista ativa.', function(){
    a.resolvido = true; salvar(); recarregar();
    aviso('🎉 Que notícia boa!', 'ok');
  }, 'Sim, voltou para casa');
}

/* ================================================================ AGENDA PÚBLICA */
registrarTela('agenda', {
  titulo:'Agenda',
  sub:'feiras de adoção, castração e mutirões',
  render:function(){
    var futuros = ordenar(filtrar(DB.eventos, function(e){
      return e.publico && e.data >= isoHoje(); }), function(e){ return e.data; });
    return '' +
    '<div class="aviso aviso-i"><span class="em">📅</span><div><b>Onde encontrar os animais ao vivo</b>' +
      'Feira de adoção é onde a maioria das adoções acontece de verdade — a pessoa vê, pega no colo e ' +
      'decide. Aqui juntamos as feiras das ONGs e os mutirões de castração das prefeituras do ABC.</div></div>' +
    (futuros.length ? '<div class="g g-b">' + futuros.map(function(e){
      var o = achar(DB.ongs, e.ongId);
      var cores = {feira:'var(--caramelo)', castracao:'var(--verde)', mutirao:'var(--uva)'};
      var emo = {feira:'🐾', castracao:'✂️', mutirao:'🧼'};
      return '<div class="cx" style="margin:0;border-left:4px solid ' + cores[e.tipo] + '">' +
        '<div class="linha" style="flex-wrap:nowrap"><div style="font-size:26px">' + emo[e.tipo] + '</div>' +
        '<div style="flex:1;min-width:0"><div class="neg">' + esc(e.titulo) + '</div>' +
        '<div class="s11 c3">' + esc(o ? o.nome : '') + '</div></div>' +
        '<span class="et et-ca">' + quandoTexto(e.data) + '</span></div>' +
        '<div class="g g2 mt14">' +
          blocoInfo('Quando', DIAS_C[data(e.data).getDay()] + ', ' + brData(e.data) + ' às ' + e.hora) +
          blocoInfo('Onde', e.local) +
        '</div>' +
        '<div class="s12 c2 mt8">📍 ' + esc(e.cidade) + '/' + e.uf + '</div>' +
        (e.obs ? '<div class="s12 c3 mt8">' + esc(e.obs) + '</div>' : '') +
        '<button class="b b-f b-s b-bloco mt14" onclick="lembrarEvento(\'' + e.id + '\')">🔔 Quero ser lembrado</button>' +
      '</div>';
    }).join('') + '</div>' : vazio('📅','Nada marcado por enquanto','Volte em breve.'));
  }
});
function lembrarEvento(evId){
  var e = achar(DB.eventos, evId);
  e.inscritos = (e.inscritos||0) + 1;
  salvar();
  aviso('🔔 Combinado! Vamos te lembrar em ' + brData(e.data) + '.', 'ok');
}

/* ================================================================ CADASTRO RÁPIDO */
function pedirCadastro(depois){
  window.__depoisCadastro = depois || null;
  modal('Criar meu cadastro',
    '<p class="s13 c2">Só o essencial para a ONG conseguir falar com você.</p>' +
    '<div class="f mb14"><label>Nome completo</label><input class="i" id="cad-nome" placeholder="Como quer ser chamado"></div>' +
    '<div class="g g2">' +
      '<div class="f"><label>WhatsApp</label><input class="i" id="cad-tel" placeholder="(11) 99999-9999"></div>' +
      '<div class="f"><label>E-mail</label><input class="i" id="cad-email" placeholder="voce@email.com"></div>' +
      '<div class="f"><label>Cidade</label><select class="i" id="cad-cidade">' +
        todasCidades().map(function(c){ return '<option>' + esc(c) + '</option>'; }).join('') + '</select></div>' +
    '</div>' +
    '<label class="check mt14"><input type="checkbox" id="cad-lgpd"><span class="s12">' +
      'Autorizo o AuLar e a ONG escolhida a usarem meus dados para o processo de adoção. ' +
      'Posso pedir exclusão a qualquer momento.</span></label>',
    '<button class="b b-f" onclick="fecharModal()">Agora não</button>' +
    '<button class="b b-p" onclick="salvarCadastro()">Criar cadastro</button>', 'estreita');
}
function salvarCadastro(){
  var nome = $('#cad-nome').value.trim(), tel = $('#cad-tel').value.trim();
  if(!nome || !tel){ aviso('Nome e WhatsApp são obrigatórios.', 'err'); return; }
  if(!$('#cad-lgpd').checked){ aviso('Precisamos da sua autorização para seguir.', 'err'); return; }
  var p = {
    id:id('p'), nome:nome, telefone:tel, email:$('#cad-email').value.trim(),
    cidade:$('#cad-cidade').value, uf:'SP', papeis:['adotante'], perfil:null, foto:null,
    cpf:null, criadoEm:isoHoje(), consentimentoLGPD:true, lar:null
  };
  DB.pessoas.push(p);
  SESSAO.pessoaId = p.id; salvarSessao(); salvar();
  fecharModal();
  aviso('Bem-vindo(a), ' + nome.split(' ')[0] + '! 🐾', 'ok');
  var d = window.__depoisCadastro; window.__depoisCadastro = null;
  if(d) d(p); else recarregar();
  pintarTopo();
}
