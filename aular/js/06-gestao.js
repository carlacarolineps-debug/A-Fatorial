/* =========================================================================
   AuLar — telas de gestão da ONG (o tenant).
   Tudo aqui respeita o plano contratado e a régua de inadimplência.
   ========================================================================= */
'use strict';

/* ================================================================ PAINEL */
registrarTela('ong-painel', {
  titulo:'Painel', sub:function(){ var o = ongAtual(); return o ? o.nome : ''; },
  precisaAtiva:true,
  render:function(){
    var o = ongAtual();
    var pets = petsDa(o.id);
    var disp = filtrar(pets, function(p){ return p.status === 'disponivel'; });
    var proc = filtrar(pets, function(p){ return p.status === 'em_processo'; });
    var lim = limitePets(o);
    var ag = agendaVacinas(o.id, -30, 14);
    var atrasadas = filtrar(ag, function(v){ return difDias(v.previstaPara, isoHoje()) > 0; });
    var novos = filtrar(DB.interesses, function(i){ return i.ongId === o.id && i.etapa === 'interesse'; });
    var mesAtual = isoHoje().slice(0,8) + '01';
    var doaMes = filtrar(DB.doacoes, function(d){ return d.ongId === o.id && d.data >= mesAtual; });
    var custoMes = somar(filtrar(pets, function(p){ return p.status !== 'adotado'; }),
                         function(p){ return p.custoMensal; });
    var adoMes = filtrar(DB.adocoes, function(a){ return a.ongId === o.id && a.data >= mesAtual; });
    var tarefas = filtrar(DB.tarefas, function(t){ return t.ongId === o.id && !t.feito; });
    var estCritico = estoqueCritico(o.id);

    return '' +
    conselhoDoDia(o, {atrasadas:atrasadas, novos:novos, estCritico:estCritico, tarefas:tarefas,
                      doaMes:doaMes, custoMes:custoMes, lim:lim}) +
    '<div class="g g4">' +
      kpiCard('Prontos para adoção', disp.length, '🐾', '') +
      kpiCard('Em processo', proc.length, '🤝', 'u') +
      kpiCard('Adoções no mês', adoMes.length, '🏡', 'v') +
      kpiCard('Doações no mês', brlCurto(somar(doaMes, function(d){ return d.valor; })), '💛', 'r') +
    '</div>' +
    '<div class="g" style="grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);align-items:start">' +
      '<div>' +
        cardSaudeFinanceira(o, doaMes, custoMes, pets) +
        cardFunilResumo(o) +
        cardAgendaSaude(ag) +
      '</div>' +
      '<div>' +
        cardTarefas(tarefas) +
        cardEstoque(o, estCritico) +
        cardAtividade(o) +
      '</div>' +
    '</div>';
  }
});

/** O painel abre com uma frase que diz o que fazer hoje, não com um gráfico. */
function conselhoDoDia(o, d){
  var itens = [];
  if(d.estCritico.length)
    itens.push({p:1, e:'🍽️', t:'O estoque de ' + d.estCritico[0].item.toLowerCase() + ' acaba em ' +
      d.estCritico[0].dias + ' ' + plural(d.estCritico[0].dias,'dia','dias'), a:'Ver estoque', f:"ir('ong-estoque')"});
  if(d.atrasadas.length)
    itens.push({p:2, e:'💉', t:d.atrasadas.length + ' vacina(s) e vermífugo(s) em atraso',
      a:'Abrir calendário', f:"ir('ong-saude')"});
  if(d.novos.length)
    itens.push({p:3, e:'💚', t:d.novos.length + ' interesse(s) esperando resposta — responder rápido ' +
      'é o que mais aumenta adoção', a:'Ver funil', f:"ir('ong-adocoes')"});
  var vencidas = filtrar(d.tarefas, function(t){ return difDias(t.prazo, isoHoje()) > 0; });
  if(vencidas.length)
    itens.push({p:4, e:'⏰', t:vencidas.length + ' tarefa(s) com prazo vencido', a:'Ver tarefas', f:"ir('ong-painel')"});
  var arrec = somar(d.doaMes, function(x){ return x.valor; });
  if(arrec < d.custoMes * 0.6)
    itens.push({p:5, e:'💛', t:'As doações do mês cobrem ' + Math.round(arrec/(d.custoMes||1)*100) +
      '% do custo dos animais', a:'Publicar prestação de contas', f:"ir('ong-transparencia')"});
  if(d.lim.cheio)
    itens.push({p:0, e:'🚧', t:'Você atingiu o limite de ' + d.lim.limite + ' animais do seu plano',
      a:'Ver planos', f:"ir('ong-assinatura')"});

  if(!itens.length) itens.push({p:9, e:'✅', t:'Está tudo em dia por aqui. Aproveite para publicar ' +
    'uma foto nova de quem está esperando há mais tempo.', a:'Ver animais', f:"ir('ong-pets')"});
  itens = ordenar(itens, function(i){ return i.p; }).slice(0,3);

  return '<div class="cx" style="background:linear-gradient(120deg,var(--caramelo-clr),var(--sup));' +
    'border-color:var(--caramelo)"><div class="cx-h" style="border:0;padding:0;margin-bottom:12px">' +
    '<h3>☀️ O que precisa de você hoje</h3></div>' +
    itens.map(function(i){
      return '<div class="linha mb8" style="flex-wrap:nowrap"><span style="font-size:19px">' + i.e + '</span>' +
        '<span class="s13" style="flex:1;min-width:0">' + esc(i.t) + '</span>' +
        '<button class="b b-f b-s" onclick="' + i.f + '">' + i.a + '</button></div>';
    }).join('') + '</div>';
}

function cardSaudeFinanceira(o, doaMes, custoMes, pets){
  var arrec = somar(doaMes, function(d){ return d.valor; });
  var ativos = filtrar(pets, function(p){ return p.status !== 'adotado' && p.status !== 'obito'; });
  var meses = [];
  for(var m = 5; m >= 0; m--){
    var ini = maisMeses(isoHoje().slice(0,8) + '01', -m);
    var fim = maisMeses(ini, 1);
    meses.push({ r: MESES_C[+ini.slice(5,7)-1],
      v: somar(filtrar(DB.doacoes, function(d){ return d.ongId === o.id && d.data >= ini && d.data < fim; }),
               function(d){ return d.valor; }) });
  }
  return '<div class="cx"><div class="cx-h"><div><h3>Dinheiro</h3>' +
    '<div class="desc">quanto entra x quanto os animais custam</div></div></div>' +
    '<div class="g g3 mb14">' +
      blocoInfo('Entrou este mês', brl(arrec)) +
      blocoInfo('Custo dos animais', brl(custoMes)) +
      blocoInfo('Custo por animal', brl(ativos.length ? custoMes/ativos.length : 0) + '/mês') +
    '</div>' +
    '<div class="barra ' + (arrec >= custoMes ? 'v' : (arrec > custoMes*0.6 ? 'a' : 'p')) + '">' +
      '<i style="width:' + limite(arrec/(custoMes||1)*100, 0, 100) + '%"></i></div>' +
    '<div class="entre mt8"><span class="s11 c3">cobertura do mês</span>' +
      '<span class="s12 neg">' + pct(arrec/(custoMes||1)*100) + '</span></div>' +
    '<div class="rot mt20 mb8">Doações nos últimos 6 meses</div>' +
    barras(meses, brlCurto) + '</div>';
}

function cardFunilResumo(o){
  var etapas = [['interesse','Interesse','💚'],['triagem','Triagem','📋'],['entrevista','Entrevista','🎙️'],
                ['visita','Visita','🚗'],['termo','Termo','✍️']];
  var ints = filtrar(DB.interesses, function(i){ return i.ongId === o.id; });
  return '<div class="cx"><div class="cx-h"><div><h3>Funil de adoção</h3>' +
    '<div class="desc">onde cada conversa está parada</div></div>' +
    '<div class="dir"><button class="b b-f b-s" onclick="ir(\'ong-adocoes\')">Abrir funil</button></div></div>' +
    '<div class="g g5">' + etapas.map(function(e){
      var q = filtrar(ints, function(i){ return i.etapa === e[0]; }).length;
      return '<div class="cx plana" style="background:var(--sup-2);margin:0;padding:12px;text-align:center">' +
        '<div style="font-size:18px">' + e[2] + '</div><div class="num-grande" style="font-size:24px">' + q + '</div>' +
        '<div class="s11 c3">' + e[1] + '</div></div>';
    }).join('') + '</div></div>';
}

function cardAgendaSaude(ag){
  var proximos = ag.slice(0, 6);
  return '<div class="cx"><div class="cx-h"><div><h3>Saúde — próximos 14 dias</h3>' +
    '<div class="desc">montado automaticamente pelo protocolo</div></div>' +
    '<div class="dir"><button class="b b-f b-s" onclick="ir(\'ong-saude\')">Calendário</button></div></div>' +
    (proximos.length ? '<div class="tl">' + proximos.map(function(v){
      var pet = achar(DB.pets, v.petId);
      var s = situacaoVacina(v);
      return '<div class="tl-i ' + (s === 'atrasada' ? 'at' : (s === 'proxima' ? 'ag' : '')) + '">' +
        '<div class="qd">' + brData(v.previstaPara) + ' · ' + quandoTexto(v.previstaPara) + '</div>' +
        '<div class="tt">' + esc(pet ? pet.nome : '—') + ' — ' + esc(v.vacina) + '</div>' +
        '<div class="ds">' + esc(v.dose) + (s === 'atrasada' ? ' · <b class="pe">em atraso</b>' : '') + '</div>' +
      '</div>';
    }).join('') + '</div>' : '<div class="vazio s13">Nada previsto para as próximas semanas. ✅</div>') + '</div>';
}

function cardTarefas(tarefas){
  return '<div class="cx"><div class="cx-h"><h3>Tarefas</h3>' +
    '<div class="dir"><button class="b b-f b-s" onclick="novaTarefa()">+ Nova</button></div></div>' +
    (tarefas.length ? tarefas.slice(0,7).map(function(t){
      var atrasada = difDias(t.prazo, isoHoje()) > 0;
      return '<label class="check mb8"><input type="checkbox" onchange="concluirTarefa(\'' + t.id + '\')">' +
        '<span style="flex:1;min-width:0"><b class="s13">' + esc(t.titulo) + '</b><br>' +
        '<span class="s11 ' + (atrasada?'pe neg':'c3') + '">' + quandoTexto(t.prazo) +
        ' · ' + esc(t.responsavel) + '</span></span></label>';
    }).join('') : '<div class="vazio s12">Nada pendente 🎉</div>') + '</div>';
}
function novaTarefa(){
  modal('Nova tarefa',
    '<div class="f mb14"><label>O que precisa ser feito</label><input class="i" id="tf-tit"></div>' +
    '<div class="g g2"><div class="f"><label>Prazo</label>' +
      '<input class="i" type="date" id="tf-prazo" value="' + maisDias(isoHoje(),3) + '"></div>' +
      '<div class="f"><label>Responsável</label><input class="i" id="tf-resp" value="' +
        esc(ongAtual().responsavel) + '"></div></div>',
    '<button class="b b-f" onclick="fecharModal()">Cancelar</button>' +
    '<button class="b b-p" onclick="salvarTarefa()">Criar</button>', 'estreita');
}
function salvarTarefa(){
  var t = $('#tf-tit').value.trim();
  if(!t){ aviso('Escreva a tarefa.', 'err'); return; }
  DB.tarefas.unshift({ id:id('t'), ongId:SESSAO.ongId, titulo:t, prazo:$('#tf-prazo').value,
    responsavel:$('#tf-resp').value, feito:false, tipo:'geral' });
  salvar(); fecharModal(); recarregar();
}
function concluirTarefa(tid){
  var t = achar(DB.tarefas, tid); if(!t) return;
  t.feito = true; salvar();
  setTimeout(recarregar, 320);
}

function cardEstoque(o, criticos){
  var itens = filtrar(DB.estoque, function(e){ return e.ongId === o.id; });
  return '<div class="cx"><div class="cx-h"><h3>Estoque</h3>' +
    '<div class="dir"><button class="b b-f b-s" onclick="ir(\'ong-estoque\')">Ver tudo</button></div></div>' +
    itens.slice(0,5).map(function(e){
      var dias = e.consumoDia > 0 ? Math.floor(e.quantidade / e.consumoDia) : 999;
      var cls = dias <= 7 ? 'p' : (dias <= 20 ? 'a' : 'v');
      return '<div class="mb8"><div class="entre"><span class="s12">' + esc(e.item) + '</span>' +
        '<span class="s11 ' + (dias<=7?'pe neg':'c3') + '">' + (dias > 200 ? '—' : dias + ' dias') + '</span></div>' +
        '<div class="barra ' + cls + '" style="height:5px"><i style="width:' +
          limite(dias/45*100, 3, 100) + '%"></i></div></div>';
    }).join('') + '</div>';
}
function estoqueCritico(ongId){
  return filtrar(DB.estoque, function(e){ return e.ongId === ongId; }).map(function(e){
    return { item:e.item, dias: e.consumoDia > 0 ? Math.floor(e.quantidade/e.consumoDia) : 999, ref:e };
  }).filter(function(e){ return e.dias <= 10; }).sort(function(a,b){ return a.dias - b.dias; });
}

function cardAtividade(o){
  var ats = filtrar(DB.atividades, function(a){ return a.ongId === o.id; }).slice(0,8);
  return '<div class="cx"><div class="cx-h"><h3>Últimos acontecimentos</h3></div>' +
    (ats.length ? '<div class="tl">' + ats.map(function(a){
      return '<div class="tl-i ok"><div class="qd">' + quandoTexto(a.quando) + '</div>' +
        '<div class="ds">' + esc(a.texto) + '</div></div>';
    }).join('') + '</div>' : '<div class="vazio s12">Sem movimento ainda</div>') + '</div>';
}

/* ================================================================ ANIMAIS */
var FILTRO_PETS = { busca:'', status:'', especie:'' };
registrarTela('ong-pets', {
  titulo:'Animais', sub:'cadastro, fotos e situação',
  precisaAtiva:true,
  render:function(){
    var o = ongAtual();
    var lim = limitePets(o);
    var lista = filtrar(petsDa(o.id), function(p){
      if(FILTRO_PETS.status && p.status !== FILTRO_PETS.status) return false;
      if(FILTRO_PETS.especie && p.especie !== FILTRO_PETS.especie) return false;
      if(FILTRO_PETS.busca && semAcento(p.nome).indexOf(semAcento(FILTRO_PETS.busca)) < 0) return false;
      return true;
    });
    var STATUS = [['','Todos'],['disponivel','Disponíveis'],['em_processo','Em processo'],
                  ['tratamento','Em tratamento'],['adotado','Adotados']];
    return '' +
    '<div class="cx"><div class="linha">' +
      '<input class="i" style="max-width:250px" placeholder="🔎 Buscar pelo nome" value="' + esc(FILTRO_PETS.busca) + '" ' +
        'oninput="FILTRO_PETS.busca=this.value;pintarListaPets()">' +
      '<div class="opcoes">' + STATUS.map(function(s){
        return '<button class="op ' + (FILTRO_PETS.status===s[0]?'on car':'') + '" ' +
          'onclick="FILTRO_PETS.status=\'' + s[0] + '\';recarregar()">' + s[1] + '</button>'; }).join('') + '</div>' +
      '<div class="espaco"></div>' +
      '<span class="et ' + (lim.cheio?'et-pe':'') + '">' + lim.usados + '/' +
        (lim.limite > 9000 ? '∞' : lim.limite) + ' do plano</span>' +
      '<button class="b b-p" onclick="editarPet()" ' + (lim.cheio?'disabled title="Limite do plano atingido"':'') +
        '>+ Cadastrar animal</button>' +
    '</div>' +
    (lim.cheio ? '<div class="aviso aviso-a mt14 mb0"><span class="em">🚧</span><div>' +
      '<b>Você chegou ao limite do plano ' + esc(planoDa(o).nome) + '</b>' +
      'Para cadastrar mais animais, mude de plano — ou marque como adotados os que já saíram.' +
      ' <button class="b b-p b-s mt8" onclick="ir(\'ong-assinatura\')">Ver planos</button></div></div>' : '') +
    '</div>' +
    '<div id="lista-pets"></div>';
  },
  depois:pintarListaPets
});
function pintarListaPets(){
  var el = $('#lista-pets'); if(!el) return;
  var o = ongAtual();
  var lista = filtrar(petsDa(o.id), function(p){
    if(FILTRO_PETS.status && p.status !== FILTRO_PETS.status) return false;
    if(FILTRO_PETS.especie && p.especie !== FILTRO_PETS.especie) return false;
    if(FILTRO_PETS.busca && semAcento(p.nome).indexOf(semAcento(FILTRO_PETS.busca)) < 0) return false;
    return true;
  });
  if(!lista.length){ el.innerHTML = vazio('🐾','Nenhum animal aqui','Cadastre o primeiro para ele aparecer na vitrine.',
    '<button class="b b-p" onclick="editarPet()">+ Cadastrar animal</button>'); return; }
  el.innerHTML = '<div class="g g-b">' + ordenar(lista, function(p){ return p.resgatadoEm; }).map(function(p){
    var s = saudePet(p.id);
    var ints = filtrar(DB.interesses, function(i){ return i.petId === p.id && i.etapa !== 'recusado'; }).length;
    var lar = p.larTemporarioId ? achar(DB.pessoas, p.larTemporarioId) : null;
    var ST = {disponivel:['Disponível','et-ok'], em_processo:['Em processo','et-uv'],
              adotado:['Adotado','et-in'], tratamento:['Tratamento','et-al'],
              lar_temporario:['Em lar temp.','et-ca'], obito:['Óbito','et-pe']};
    var st = ST[p.status] || ['—',''];
    return '<div class="cx" style="margin:0">' +
      '<div class="linha" style="flex-wrap:nowrap"><div class="pav g" style="' + estiloFoto(p) + '"></div>' +
      '<div style="flex:1;min-width:0"><div class="entre"><b class="s16">' + esc(p.nome) + '</b>' +
        '<span class="et ' + st[1] + '">' + st[0] + '</span></div>' +
      '<div class="s12 c2">' + idadeTexto(p.nascimento) + ' · ' + rotuloPorte(p.porte) + ' · ' +
        (p.sexo==='M'?'macho':'fêmea') + '</div>' +
      '<div class="linha mt8">' +
        (p.castrado ? '<span class="et et-ok">castrad' + (p.sexo==='F'?'a':'o') + '</span>'
               : '<span class="et et-al">não castrad' + (p.sexo==='F'?'a':'o') + '</span>') +
        (s.emDia ? '<span class="et et-ok">vacinas ok</span>' :
          '<span class="et et-pe">' + s.atrasadas + ' atrasada(s)</span>') +
        (ints ? '<span class="et et-uv">' + ints + ' interessado(s)</span>' : '') +
      '</div></div></div>' +
      (lar ? '<div class="s11 c3 mt8">🏠 Em lar temporário: ' + esc(lar.nome) + '</div>' : '') +
      '<div class="entre mt14"><span class="s11 c3">esperando há ' +
        Math.floor(difDias(p.resgatadoEm, isoHoje())/30) + ' meses · ' +
        (p.visualizacoes||0) + ' visualizações</span></div>' +
      '<div class="linha mt8">' +
        '<button class="b b-f b-s" onclick="editarPet(\'' + p.id + '\')">Editar</button>' +
        '<button class="b b-f b-s" onclick="verPet(\'' + p.id + '\')">Ver como o público vê</button>' +
        '<button class="b b-f b-s" onclick="cartazPet(\'' + p.id + '\')">🖨</button>' +
      '</div></div>';
  }).join('') + '</div>';
}

var PET_ED = null;
function editarPet(petId){
  var o = ongAtual();
  PET_ED = petId ? JSON.parse(JSON.stringify(achar(DB.pets, petId))) : {
    id:null, ongId:o.id, nome:'', especie:'cao', sexo:'M', porte:'medio',
    nascimento: maisDias(isoHoje(), -365), castrado:false, cor:'', pelagem:'curta',
    microchip:'', rga:'', status:'disponivel', fotos:[], historia:'',
    personalidade:[], necessidades:[], energia:3, sociavelCaes:true, sociavelGatos:true,
    sociavelCriancas:true, precisaQuintal:false, tempoSozinho:6, custoMensal:200,
    resgatadoEm:isoHoje(), resgatadoOnde:'', urgente:false, especial:false, devolucoes:0,
    peso:10, larTemporarioId:null, visualizacoes:0, curtidas:0
  };
  pintarEdPet();
}
function pintarEdPet(){
  var p = PET_ED, novo = !p.id;
  modal((novo ? '🐾 Cadastrar animal' : '✏️ Editar ' + esc(p.nome)),
    '<div class="abas">' +
      '<button class="aba on" onclick="abaPet(this,\'basico\')">Básico</button>' +
      '<button class="aba" onclick="abaPet(this,\'jeito\')">Jeito e convivência</button>' +
      '<button class="aba" onclick="abaPet(this,\'doc\')">Documentos</button>' +
    '</div><div id="ed-pet-corpo"></div>',
    '<button class="b b-f" onclick="fecharModal()">Cancelar</button>' +
    (novo ? '' : '<button class="b b-d" onclick="excluirPet()">Excluir</button>') +
    '<button class="b b-p" onclick="salvarPet()">' + (novo ? 'Cadastrar' : 'Salvar') + '</button>',
    'larga');
  pintarAbaPet('basico');
}
function abaPet(btn, qual){
  $$('.aba', btn.parentNode).forEach(function(b){ b.classList.remove('on'); });
  btn.classList.add('on'); coletarPet(); pintarAbaPet(qual);
}
function pintarAbaPet(qual){
  var p = PET_ED, el = $('#ed-pet-corpo'); if(!el) return;
  if(qual === 'basico'){
    el.innerHTML =
      '<div class="linha mb14" style="align-items:flex-start">' +
        '<div class="pav g" id="pet-foto-prev" style="' + estiloFoto(p) + '">' + (p.fotos.length?'':'📷') + '</div>' +
        '<div><label class="b b-f b-s" style="cursor:pointer">📷 Enviar foto' +
        '<input type="file" accept="image/*" style="display:none" onchange="subirFotoPet(this)"></label>' +
        '<div class="s11 c3 mt8">Foto boa é o que mais aumenta adoção. Luz natural, na altura dos olhos.</div>' +
        (p.fotos.length > 1 ? '<div class="s11 c3">' + p.fotos.length + ' fotos</div>' : '') + '</div>' +
      '</div>' +
      '<div class="g g2">' +
        campo('Nome','pet-nome', p.nome) +
        '<div class="f"><label>Espécie</label><select class="i" id="pet-esp">' +
          op(['cao','Cachorro'],p.especie) + op(['gato','Gato'],p.especie) + '</select></div>' +
        '<div class="f"><label>Sexo</label><select class="i" id="pet-sexo">' +
          op(['M','Macho'],p.sexo) + op(['F','Fêmea'],p.sexo) + '</select></div>' +
        '<div class="f"><label>Porte</label><select class="i" id="pet-porte">' +
          op(['pequeno','Pequeno'],p.porte) + op(['medio','Médio'],p.porte) + op(['grande','Grande'],p.porte) + '</select></div>' +
        '<div class="f"><label>Nascimento (estimado)</label>' +
          '<input class="i" type="date" id="pet-nasc" value="' + p.nascimento + '"></div>' +
        '<div class="f"><label>Situação</label><select class="i" id="pet-status">' +
          op(['disponivel','Disponível'],p.status) + op(['em_processo','Em processo'],p.status) +
          op(['tratamento','Em tratamento'],p.status) + op(['lar_temporario','Em lar temporário'],p.status) +
          op(['adotado','Adotado'],p.status) + '</select></div>' +
        campo('Cor / pelagem','pet-cor', p.cor) +
        campo('Custo mensal estimado (R$)','pet-custo', p.custoMensal, 'number') +
        '<div class="f"><label>Resgatado em</label><input class="i" type="date" id="pet-resg" value="' +
          p.resgatadoEm + '"></div>' +
        campo('Onde foi resgatado','pet-onde', p.resgatadoOnde) +
      '</div>' +
      '<div class="f mt14"><label>História — é isto que faz alguém se apaixonar</label>' +
        '<textarea class="i" id="pet-hist" style="min-height:100px" placeholder="Conte de onde ele veio, ' +
        'como é o jeito dele, o que faz de engraçado. Fuja de &quot;dócil e カrinhoso&quot;: conte uma cena.">' +
        esc(p.historia) + '</textarea></div>' +
      '<div class="linha mt14">' +
        chk('pet-castrado','Castrado', p.castrado) +
        chk('pet-urgente','Caso urgente', p.urgente) +
        chk('pet-especial','Necessidade especial', p.especial) +
      '</div>';
  }
  if(qual === 'jeito'){
    el.innerHTML =
      '<div class="f mb14"><label>Nível de energia: ' +
        '<b id="en-val">' + p.energia + '</b> de 5</label>' +
        '<input type="range" min="1" max="5" value="' + p.energia + '" id="pet-energia" ' +
        'oninput="document.getElementById(\'en-val\').textContent=this.value" style="width:100%">' +
        '<div class="aj">1 = dorme o dia todo · 5 = precisa correr todo dia</div></div>' +
      '<div class="g g2">' +
        campo('Aguenta quantas horas sozinho?','pet-soz', p.tempoSozinho, 'number') +
        campo('Peso aproximado (kg)','pet-peso', p.peso, 'number') +
      '</div>' +
      '<div class="rot mt20 mb8">Convive bem com</div>' +
      '<div class="linha">' +
        chk('pet-scaes','🐶 Outros cães', p.sociavelCaes) +
        chk('pet-sgatos','🐱 Gatos', p.sociavelGatos) +
        chk('pet-scriancas','🧒 Crianças', p.sociavelCriancas) +
        chk('pet-quintal','🌳 Precisa de quintal', p.precisaQuintal) +
      '</div>' +
      '<div class="rot mt20 mb8">Personalidade (marque o que combina)</div>' +
      '<div class="opcoes" id="pet-pers">' + PERSONALIDADES.map(function(t){
        return '<button class="op ' + (p.personalidade.indexOf(t)>=0?'on car':'') + '" data-v="' + t + '" ' +
          'onclick="this.classList.toggle(\'on\');this.classList.toggle(\'car\')">' + t + '</button>'; }).join('') + '</div>' +
      '<div class="rot mt20 mb8">Cuidados especiais</div>' +
      '<div class="opcoes" id="pet-nec">' + NECESSIDADES.map(function(t){
        return '<button class="op ' + (p.necessidades.indexOf(t)>=0?'on car':'') + '" data-v="' + t + '" ' +
          'onclick="this.classList.toggle(\'on\');this.classList.toggle(\'car\')">' + t + '</button>'; }).join('') + '</div>' +
      '<div class="aviso aviso-i mt20 mb0"><span class="em">🧭</span><div>' +
        '<b>Isto alimenta o match</b>Energia, tempo sozinho e convivência são exatamente o que o ' +
        'sistema cruza com o perfil de quem procura. Preencher com honestidade é o que evita devolução.</div></div>';
  }
  if(qual === 'doc'){
    var lares = filtrar(DB.pessoas, function(x){ return x.lar && x.lar.ativo; });
    el.innerHTML =
      '<div class="g g2">' +
        campo('Microchip','pet-chip', p.microchip || '') +
        campo('RGA (Registro Geral do Animal)','pet-rga', p.rga || '') +
      '</div>' +
      '<div class="aviso aviso-i mt14"><span class="em">📎</span><div>' +
        '<b>Microchip e RGA valem mais do que parecem</b>Em São Paulo o RGA é obrigatório e o ' +
        'microchip é exigido para animal doado. Além da lei, é o que traz o bicho de volta quando ele foge — ' +
        'e o que impede alguém de adotar para revender.</div></div>' +
      '<div class="f mt14"><label>Lar temporário responsável</label>' +
        '<select class="i" id="pet-lar"><option value="">— sem lar temporário —</option>' +
        lares.map(function(l){
          return '<option value="' + l.id + '" ' + (p.larTemporarioId===l.id?'selected':'') + '>' +
            esc(l.nome) + ' (' + l.lar.ocupadas + '/' + l.lar.capacidade + ')</option>'; }).join('') +
        '</select></div>' +
      (p.id ? '<div class="rot mt20 mb8">Carteira de vacinação</div>' + tabelaVacinasPet(p.id) : '');
  }
}
function campo(rot, idc, val, tipo){
  return '<div class="f"><label>' + rot + '</label><input class="i" type="' + (tipo||'text') +
    '" id="' + idc + '" value="' + esc(val) + '"></div>';
}
function op(par, atual){
  return '<option value="' + par[0] + '" ' + (atual===par[0]?'selected':'') + '>' + par[1] + '</option>';
}
function chk(idc, rot, val){
  return '<label class="check ' + (val?'on':'') + '" style="flex:1;min-width:150px">' +
    '<input type="checkbox" id="' + idc + '" ' + (val?'checked':'') +
    ' onchange="this.parentNode.classList.toggle(\'on\',this.checked)"><span class="s13">' + rot + '</span></label>';
}
function subirFotoPet(inp){
  var f = inp.files[0]; if(!f) return;
  lerImagem(f, function(dados){
    PET_ED.fotos.unshift(dados);
    var prev = $('#pet-foto-prev');
    if(prev){ prev.style.backgroundImage = 'url(' + dados + ')'; prev.textContent = ''; }
    aviso('Foto adicionada.', 'ok');
  }, 900);
  inp.value = '';
}
function coletarPet(){
  var p = PET_ED, g = function(i){ var e = $('#' + i); return e ? e.value : null; };
  var c = function(i){ var e = $('#' + i); return e ? e.checked : null; };
  if(g('pet-nome') !== null){
    p.nome = g('pet-nome').trim(); p.especie = g('pet-esp'); p.sexo = g('pet-sexo');
    p.porte = g('pet-porte'); p.nascimento = g('pet-nasc'); p.status = g('pet-status');
    p.cor = g('pet-cor'); p.custoMensal = +g('pet-custo') || 200;
    p.resgatadoEm = g('pet-resg'); p.resgatadoOnde = g('pet-onde'); p.historia = g('pet-hist');
    p.castrado = c('pet-castrado'); p.urgente = c('pet-urgente'); p.especial = c('pet-especial');
  }
  if(g('pet-soz') !== null){
    p.energia = +g('pet-energia') || 3; p.tempoSozinho = +g('pet-soz') || 6; p.peso = +g('pet-peso') || 10;
    p.sociavelCaes = c('pet-scaes'); p.sociavelGatos = c('pet-sgatos');
    p.sociavelCriancas = c('pet-scriancas'); p.precisaQuintal = c('pet-quintal');
    p.personalidade = $$('#pet-pers .op.on').map(function(b){ return b.getAttribute('data-v'); });
    p.necessidades = $$('#pet-nec .op.on').map(function(b){ return b.getAttribute('data-v'); });
  }
  if(g('pet-chip') !== null){
    p.microchip = g('pet-chip'); p.rga = g('pet-rga'); p.larTemporarioId = g('pet-lar') || null;
  }
}
function salvarPet(){
  coletarPet();
  var p = PET_ED;
  if(!p.nome){ aviso('O animal precisa de um nome.', 'err'); return; }
  if(!p.historia || p.historia.length < 20){
    aviso('Escreva ao menos duas frases de história — é o que faz alguém parar no perfil.', 'err'); return;
  }
  if(!p.fotos.length) p.fotos = [fotoGerada(p.nome, p.especie)];
  var o = ongAtual();
  if(!p.id){
    var lim = limitePets(o);
    if(lim.cheio){ aviso('Limite de animais do plano atingido.', 'err'); return; }
    p.id = id('pet');
    DB.pets.push(p);
    gerarVacinas(DB, p.id, o.id, p.especie, p.nascimento);
    registrar(o.id, 'pet', p.nome + ' foi cadastrado');
    aviso('🐾 ' + p.nome + ' está na vitrine! O calendário de vacinas foi montado automaticamente.', 'ok');
  } else {
    var orig = achar(DB.pets, p.id);
    var mudouNasc = orig.nascimento !== p.nascimento || orig.especie !== p.especie;
    for(var k in p) orig[k] = p[k];
    if(mudouNasc){
      DB.vacinas = filtrar(DB.vacinas, function(v){ return v.petId !== p.id || v.aplicadaEm; });
      gerarVacinas(DB, p.id, o.id, p.especie, p.nascimento);
      aviso('Calendário de vacinas refeito para a nova data.', 'ok');
    } else aviso('Salvo.', 'ok');
    registrar(o.id, 'pet', p.nome + ' foi atualizado');
  }
  // sincroniza a ocupação dos lares
  DB.pessoas.forEach(function(x){
    if(x.lar) x.lar.ocupadas = filtrar(DB.pets, function(q){ return q.larTemporarioId === x.id; }).length;
  });
  salvar(); fecharModal(); recarregar();
}
function excluirPet(){
  var p = PET_ED;
  confirmar('Excluir ' + esc(p.nome) + '?',
    'Isso apaga o cadastro, o histórico de vacinas e os interesses ligados a ele. Não dá para desfazer.',
    function(){
      DB.pets = filtrar(DB.pets, function(x){ return x.id !== p.id; });
      DB.vacinas = filtrar(DB.vacinas, function(v){ return v.petId !== p.id; });
      DB.interesses = filtrar(DB.interesses, function(i){ return i.petId !== p.id; });
      salvar(); fecharModal(); recarregar();
      aviso('Cadastro excluído.', 'ok');
    }, 'Excluir', true);
}

/* ================================================================ SAÚDE / VACINAS */
var MES_CAL = null;
registrarTela('ong-saude', {
  titulo:'Saúde e vacinas', sub:'calendário montado pelo protocolo brasileiro',
  precisaAtiva:true,
  render:function(){
    var o = ongAtual();
    if(!MES_CAL) MES_CAL = isoHoje().slice(0,7);
    var ag = agendaVacinas(o.id, -60, 90);
    var atrasadas = filtrar(ag, function(v){ return difDias(v.previstaPara, isoHoje()) > 0; });
    var semana = filtrar(ag, function(v){ var d = difDias(isoHoje(), v.previstaPara); return d >= 0 && d <= 7; });
    return '' +
    '<div class="aviso aviso-i"><span class="em">💉</span><div><b>Você não digita calendário aqui</b>' +
      'Ao cadastrar o animal, o sistema já sabe o protocolo (V10/V4, antirrábica, gripe, giárdia, ' +
      'vermífugo e antipulgas), calcula as datas pela idade e refaz tudo se a data de nascimento mudar. ' +
      'Confirme a aplicação e o reforço seguinte entra sozinho. A prescrição continua sendo do veterinário.</div></div>' +
    '<div class="g g4">' +
      kpiCard('Em atraso', atrasadas.length, '⚠️', atrasadas.length?'p':'v') +
      kpiCard('Nos próximos 7 dias', semana.length, '📅', 'a') +
      kpiCard('Aplicadas no total', filtrar(DB.vacinas, function(v){
        return v.ongId === o.id && v.aplicadaEm; }).length, '✅', 'v') +
      kpiCard('Aptos para adoção', filtrar(petsDa(o.id), function(p){
        return p.status !== 'adotado' && saudePet(p.id).aptoAdocao; }).length, '🏡', '') +
    '</div>' +
    '<div class="g" style="grid-template-columns:minmax(0,1fr) 380px;align-items:start">' +
      '<div class="cx"><div class="cx-h"><div><h3>' + MESES[+MES_CAL.slice(5,7)-1] + ' de ' + MES_CAL.slice(0,4) + '</h3></div>' +
        '<div class="dir"><button class="b b-f b-s" onclick="mudarMes(-1)">←</button>' +
        '<button class="b b-f b-s" onclick="MES_CAL=null;recarregar()">Hoje</button>' +
        '<button class="b b-f b-s" onclick="mudarMes(1)">→</button></div></div>' +
        calendarioMes(o.id, MES_CAL) + '</div>' +
      '<div class="cx"><div class="cx-h"><h3>Pendências</h3>' +
        '<div class="dir"><button class="b b-f b-s" onclick="exportarSaude()">⤓ CSV</button></div></div>' +
        (ag.length ? ag.slice(0,20).map(function(v){
          var pet = achar(DB.pets, v.petId);
          var s = situacaoVacina(v);
          return '<div class="cx plana mb8" style="background:var(--sup-2);margin:0;padding:11px">' +
            '<div class="entre"><b class="s13">' + esc(pet?pet.nome:'—') + '</b>' +
            '<span class="et ' + (s==='atrasada'?'et-pe':(s==='proxima'?'et-al':'')) + '">' +
              quandoTexto(v.previstaPara) + '</span></div>' +
            '<div class="s12 c2">' + esc(v.vacina) + ' · ' + esc(v.dose) + '</div>' +
            '<button class="b b-v b-s b-bloco mt8" onclick="confirmarAplicacao(\'' + v.id + '\')">' +
              '✓ Confirmar aplicação</button></div>';
        }).join('') : '<div class="vazio s12">Tudo em dia 🎉</div>') +
      '</div>' +
    '</div>';
  }
});
function mudarMes(n_){
  MES_CAL = maisMeses(MES_CAL + '-01', n_).slice(0,7);
  recarregar();
}
function calendarioMes(ongId, ym){
  var ano = +ym.slice(0,4), mes = +ym.slice(5,7) - 1;
  var primeiro = new Date(ano, mes, 1), ultimo = new Date(ano, mes+1, 0);
  var inicio = new Date(primeiro); inicio.setDate(1 - primeiro.getDay());
  var vac = filtrar(DB.vacinas, function(v){ return v.ongId === ongId; });
  var evs = filtrar(DB.eventos, function(e){ return e.ongId === ongId; });
  var html = '<div class="cal">' + DIAS_C.map(function(d){ return '<div class="dh">' + d + '</div>'; }).join('');
  for(var i=0;i<42;i++){
    var d = new Date(inicio); d.setDate(inicio.getDate() + i);
    var s = iso(d), fora = d.getMonth() !== mes, hoje2 = s === isoHoje();
    var doDia = filtrar(vac, function(v){ return !v.aplicadaEm && v.previstaPara === s; });
    var evDia = filtrar(evs, function(e){ return e.data === s; });
    html += '<div class="d ' + (fora?'fora':'') + ' ' + (hoje2?'hoje':'') + '" ' +
      (doDia.length||evDia.length ? 'onclick="verDia(\'' + s + '\')"' : '') + '>' +
      '<span class="n">' + d.getDate() + '</span>' +
      (evDia.length ? '<span class="mini">🐾 ' + esc(truncar(evDia[0].titulo, 12)) + '</span>' : '') +
      (doDia.length ? '<span class="mini">💉 ' + doDia.length + '</span>' : '') +
      '<span class="pt">' + doDia.slice(0,4).map(function(v){
        return '<i style="background:' + (difDias(v.previstaPara,isoHoje())>0 ? 'var(--perigo)' : 'var(--caramelo)') +
          '"></i>'; }).join('') + '</span></div>';
    if(i >= 34 && d > ultimo) break;
  }
  return html + '</div>';
}
function verDia(s){
  var o = ongAtual();
  var vac = filtrar(DB.vacinas, function(v){ return v.ongId === o.id && !v.aplicadaEm && v.previstaPara === s; });
  var evs = filtrar(DB.eventos, function(e){ return e.ongId === o.id && e.data === s; });
  modal(brData(s),
    (evs.length ? '<div class="rot mb8">Agenda</div>' + evs.map(function(e){
      return '<div class="cx plana mb8" style="background:var(--sup-2);margin:0"><b>' + esc(e.titulo) +
        '</b><div class="s12 c2">' + e.hora + ' · ' + esc(e.local) + '</div></div>'; }).join('') : '') +
    (vac.length ? '<div class="rot mt14 mb8">Saúde</div>' + vac.map(function(v){
      var pet = achar(DB.pets, v.petId);
      return '<div class="cx plana mb8" style="background:var(--sup-2);margin:0">' +
        '<div class="entre"><b>' + esc(pet?pet.nome:'—') + '</b>' +
        '<button class="b b-v b-s" onclick="fecharModal();confirmarAplicacao(\'' + v.id + '\')">✓ Aplicar</button></div>' +
        '<div class="s12 c2">' + esc(v.vacina) + ' — ' + esc(v.dose) + '</div>' +
        '<div class="s11 c3">' + esc(v.protege) + '</div></div>'; }).join('') : '') +
    (!vac.length && !evs.length ? '<div class="vazio s13">Nada marcado.</div>' : ''),
    '<button class="b b-f" onclick="fecharModal()">Fechar</button>', 'estreita');
}
function confirmarAplicacao(vacId){
  var v = achar(DB.vacinas, vacId), pet = achar(DB.pets, v.petId);
  modal('Confirmar aplicação',
    '<div class="cx plana" style="background:var(--sup-2);margin:0 0 14px"><b>' + esc(pet?pet.nome:'—') + '</b>' +
    '<div class="s13 c2">' + esc(v.vacina) + ' — ' + esc(v.dose) + '</div>' +
    '<div class="s11 c3 mt8">' + esc(v.protege) + '</div></div>' +
    '<div class="g g2">' +
      '<div class="f"><label>Data da aplicação</label><input class="i" type="date" id="va-data" value="' +
        isoHoje() + '"></div>' +
      campo('Lote','va-lote','') +
      campo('Veterinário (CRMV)','va-vet','') +
    '</div>',
    '<button class="b b-f" onclick="fecharModal()">Cancelar</button>' +
    '<button class="b b-v" onclick="aplicarVacina(\'' + vacId + '\',document.getElementById(\'va-data\').value,' +
      'document.getElementById(\'va-lote\').value,document.getElementById(\'va-vet\').value);' +
      'fecharModal();recarregar();aviso(\'💉 Registrado. O próximo reforço já está na agenda.\',\'ok\')">' +
      '✓ Confirmar</button>', 'estreita');
}
function tabelaVacinasPet(petId){
  var vs = vacinasDoPet(petId);
  if(!vs.length) return '<div class="vazio s12">Sem registros</div>';
  return '<div class="rolar-x"><table class="tb"><thead><tr><th>Item</th><th>Dose</th><th>Prevista</th>' +
    '<th>Situação</th><th></th></tr></thead><tbody>' + vs.map(function(v){
    var s = situacaoVacina(v);
    var ET = {aplicada:['✓ aplicada','et-ok'], atrasada:['em atraso','et-pe'],
              proxima:['chegando','et-al'], agendada:['agendada','']};
    return '<tr><td>' + esc(v.vacina) + '</td><td class="s12 c2">' + esc(v.dose) + '</td>' +
      '<td class="s12">' + brData(v.aplicadaEm || v.previstaPara) + '</td>' +
      '<td><span class="et ' + ET[s][1] + '">' + ET[s][0] + '</span></td>' +
      '<td class="td">' + (v.aplicadaEm
        ? '<button class="b b-t b-s" onclick="desfazerVacina(\'' + v.id + '\');pintarAbaPet(\'doc\')">desfazer</button>'
        : '<button class="b b-v b-s" onclick="aplicarVacina(\'' + v.id + '\');pintarAbaPet(\'doc\')">aplicar</button>') +
      '</td></tr>';
  }).join('') + '</tbody></table></div>';
}
function exportarSaude(){
  var o = ongAtual();
  var vs = filtrar(DB.vacinas, function(v){ return v.ongId === o.id; });
  exportarCSV('vacinas-' + slug(o.nome) + '.csv',
    ['Animal','Item','Dose','Prevista','Aplicada','Lote','Veterinário'],
    vs.map(function(v){
      var p = achar(DB.pets, v.petId);
      return [p?p.nome:'', v.vacina, v.dose, brData(v.previstaPara),
              v.aplicadaEm?brData(v.aplicadaEm):'', v.lote||'', v.veterinario||''];
    }));
  aviso('CSV baixado.', 'ok');
}

/* ================================================================ FUNIL DE ADOÇÃO */
registrarTela('ong-adocoes', {
  titulo:'Adoções', sub:'do primeiro interesse ao acompanhamento pós-adoção',
  precisaAtiva:true,
  render:function(){
    var o = ongAtual();
    return '<div class="abas">' +
      '<button class="aba on" onclick="abaAdocao(this,\'funil\')">Funil</button>' +
      '<button class="aba" onclick="abaAdocao(this,\'concluidas\')">Concluídas</button>' +
      '<button class="aba" onclick="abaAdocao(this,\'pos\')">Pós-adoção</button>' +
      '</div><div id="ado-corpo"></div>';
  },
  depois:function(){ pintarAdocao('funil'); }
});
function abaAdocao(btn, qual){
  $$('.aba', btn.parentNode).forEach(function(b){ b.classList.remove('on'); });
  btn.classList.add('on'); pintarAdocao(qual);
}
var ETAPAS_FUNIL = [
  ['interesse','Interesse','💚'], ['triagem','Triagem','📋'], ['entrevista','Entrevista','🎙️'],
  ['visita','Visita','🚗'], ['termo','Termo','✍️'], ['entregue','Entregue','🎉']
];
function pintarAdocao(qual){
  var el = $('#ado-corpo'); if(!el) return;
  var o = ongAtual();

  if(qual === 'funil'){
    var ints = filtrar(DB.interesses, function(i){ return i.ongId === o.id && i.etapa !== 'recusado'; });
    el.innerHTML =
      '<div class="aviso aviso-c"><span class="em">⏱️</span><div><b>Responder rápido é metade do trabalho</b>' +
      'Interesse que fica dois dias sem resposta esfria. O cartão fica vermelho quando passa disso.</div></div>' +
      '<div class="kb">' + ETAPAS_FUNIL.map(function(e){
        var lista = filtrar(ints, function(i){ return i.etapa === e[0]; });
        return '<div class="kb-col"><h5>' + e[2] + ' ' + e[1] + '<span class="n">' + lista.length + '</span></h5>' +
          lista.map(function(i){
            var pet = achar(DB.pets, i.petId), pes = achar(DB.pessoas, i.pessoaId);
            var parado = difDias(i.atualizadoEm, isoHoje());
            return '<div class="kb-c" onclick="abrirInteresse(\'' + i.id + '\')" ' +
              (parado > 2 && e[0] !== 'entregue' ? 'style="border-color:var(--perigo)"' : '') + '>' +
              '<b>' + esc(pet?pet.nome:'—') + '</b>' +
              '<div class="sm">' + esc(pes?pes.nome:'—') + '</div>' +
              '<div class="linha mt8" style="gap:5px">' +
                (i.score !== null ? '<span class="et et-uv">' + i.score + '%</span>' : '') +
                '<span class="et ' + (parado>2?'et-pe':'') + '">' + (parado===0?'hoje':parado+'d') + '</span>' +
              '</div></div>';
          }).join('') + '</div>';
      }).join('') + '</div>';
  }

  if(qual === 'concluidas'){
    var ados = ordenar(filtrar(DB.adocoes, function(a){ return a.ongId === o.id; }),
                       function(a){ return a.data; }, true);
    el.innerHTML = '<div class="cx"><div class="cx-h"><div><h3>' + ados.length + ' adoções</h3>' +
      '<div class="desc">taxa de devolução: ' +
      pct(ados.length ? filtrar(ados, function(a){ return a.devolvido; }).length/ados.length*100 : 0) +
      ' — a média do setor fica entre 5% e 10%</div></div>' +
      '<div class="dir"><button class="b b-f b-s" onclick="exportarAdocoes()">⤓ CSV</button></div></div>' +
      '<div class="rolar-x"><table class="tb"><thead><tr><th>Animal</th><th>Adotante</th><th>Data</th>' +
      '<th>Acompanhamento</th><th></th></tr></thead><tbody>' +
      ados.map(function(a){
        var feitos = filtrar(a.acompanhamentos||[], function(x){ return x.feito; }).length;
        return '<tr><td><b>' + esc(a.petNome) + '</b> ' + (a.petEspecie==='gato'?'🐱':'🐶') + '</td>' +
          '<td class="s12">' + esc(a.pessoaNome) + '</td>' +
          '<td class="s12">' + brData(a.data) + '</td>' +
          '<td><div class="barra" style="height:6px;width:80px"><i style="width:' +
            (feitos/4*100) + '%"></i></div><span class="s11 c3">' + feitos + '/4</span></td>' +
          '<td class="td">' + (a.devolvido ? '<span class="et et-pe">devolvido</span>' :
            '<span class="et et-ok">ok</span>') + '</td></tr>';
      }).join('') + '</tbody></table></div></div>';
  }

  if(qual === 'pos'){
    var pend = [];
    filtrar(DB.adocoes, function(a){ return a.ongId === o.id; }).forEach(function(a){
      (a.acompanhamentos||[]).forEach(function(ac){
        if(!ac.feito && difDias(ac.previsto, isoHoje()) >= -7) pend.push({a:a, ac:ac});
      });
    });
    pend = ordenar(pend, function(x){ return x.ac.previsto; });
    el.innerHTML =
      '<div class="aviso aviso-i"><span class="em">📞</span><div><b>Por que ligar depois</b>' +
      'Quase toda devolução acontece nos primeiros 90 dias, e quase sempre por algo que teria sido ' +
      'resolvido com uma conversa: xixi fora do lugar, latido, ciúme do gato. O sistema marca ' +
      'contatos em 7, 30, 90 e 180 dias.</div></div>' +
      (pend.length ? '<div class="g g-b">' + pend.slice(0,12).map(function(x){
        var atrasado = difDias(x.ac.previsto, isoHoje()) > 0;
        return '<div class="cx" style="margin:0' + (atrasado?';border-color:var(--alerta)':'') + '">' +
          '<div class="entre"><b>' + esc(x.a.petNome) + '</b>' +
          '<span class="et ' + (atrasado?'et-al':'') + '">' + x.ac.dias + ' dias</span></div>' +
          '<div class="s12 c2">' + esc(x.a.pessoaNome) + '</div>' +
          '<div class="s11 c3 mt8">Previsto para ' + brData(x.ac.previsto) + ' · ' +
            quandoTexto(x.ac.previsto) + '</div>' +
          '<button class="b b-p b-s b-bloco mt14" onclick="registrarAcompanhamento(\'' + x.a.id + '\',' +
            x.ac.dias + ')">Registrar contato</button></div>';
      }).join('') + '</div>' : vazio('✅','Nenhum contato pendente','Todo mundo foi acompanhado.'));
  }
}
function registrarAcompanhamento(adoId, dias){
  var a = achar(DB.adocoes, adoId);
  modal('Acompanhamento de ' + dias + ' dias — ' + esc(a.petNome),
    '<div class="f mb14"><label>Como está indo?</label>' +
      '<textarea class="i" id="ac-nota" placeholder="Peso, comportamento, adaptação, dúvidas do tutor..."></textarea></div>' +
    '<div class="f"><label>Situação</label><div class="opcoes" id="ac-sit">' +
      [['bem','😊 Tudo bem'],['atencao','⚠️ Precisa de apoio'],['risco','🚨 Risco de devolução']].map(function(s,i){
        return '<button class="op ' + (i===0?'on car':'') + '" data-v="' + s[0] + '" ' +
          'onclick="$$(\'#ac-sit .op\').forEach(function(b){b.classList.remove(\'on\',\'car\')});' +
          'this.classList.add(\'on\',\'car\')">' + s[1] + '</button>'; }).join('') + '</div></div>',
    '<button class="b b-f" onclick="fecharModal()">Cancelar</button>' +
    '<button class="b b-p" onclick="salvarAcompanhamento(\'' + adoId + '\',' + dias + ')">Salvar</button>',
    'estreita');
}
function salvarAcompanhamento(adoId, dias){
  var a = achar(DB.adocoes, adoId);
  var ac = filtrar(a.acompanhamentos, function(x){ return x.dias === dias; })[0];
  if(ac){
    ac.feito = true;
    ac.nota = $('#ac-nota').value.trim() || 'Contato realizado.';
    ac.situacao = ($('#ac-sit .op.on')[0] || {getAttribute:function(){return 'bem';}}).getAttribute('data-v');
  }
  registrar(a.ongId, 'adocao', 'Acompanhamento de ' + dias + ' dias — ' + a.petNome);
  salvar(); fecharModal(); pintarAdocao('pos');
  aviso('Registrado. 📞', 'ok');
}
function exportarAdocoes(){
  var o = ongAtual();
  var ados = filtrar(DB.adocoes, function(a){ return a.ongId === o.id; });
  exportarCSV('adocoes-' + slug(o.nome) + '.csv',
    ['Animal','Espécie','Adotante','Data','Devolvido','Acompanhamentos feitos'],
    ados.map(function(a){
      return [a.petNome, a.petEspecie, a.pessoaNome, brData(a.data), a.devolvido?'sim':'não',
              filtrar(a.acompanhamentos||[], function(x){ return x.feito; }).length];
    }));
  aviso('CSV baixado.', 'ok');
}

/* ---- detalhe do interesse (triagem) ---- */
function abrirInteresse(intId){
  var i = achar(DB.interesses, intId);
  var pet = achar(DB.pets, i.petId), pes = achar(DB.pessoas, i.pessoaId);
  var c = compatibilidade(pes.perfil, pet);
  var risco = checarRisco(pes);
  var ix = ETAPAS_FUNIL.map(function(e){ return e[0]; }).indexOf(i.etapa);

  modal('Interesse — ' + esc(pet.nome),
    '<div class="linha mb14"><div class="pav g" style="' + estiloFoto(pet) + '"></div>' +
      '<div style="flex:1"><b class="s16">' + esc(pet.nome) + '</b>' +
      '<div class="s12 c2">' + idadeTexto(pet.nascimento) + ' · ' + rotuloPorte(pet.porte) + '</div></div>' +
      (c.score !== null ? anel(c.score, 100, corDoScore(c.score), 62) : '') + '</div>' +
    (risco ? '<div class="aviso aviso-p"><span class="em">🚨</span><div><b>Alerta da rede de proteção</b>' +
      esc(risco.motivo) + '<br><span class="s11">Registrado por outra ONG em ' + brData(risco.data) +
      ' · confirmado por ' + risco.confirmadaPor + ' organização(ões)</span></div></div>' : '') +
    '<div class="cx plana" style="background:var(--sup-2);margin:0 0 14px">' +
      '<div class="entre"><b>' + esc(pes.nome) + '</b>' +
      '<button class="b b-f b-s" onclick="abrirZap(\'' + pes.telefone + '\',\'Olá ' +
        esc(pes.nome.split(' ')[0]) + '! Sou da ' + esc(ongAtual().nome) + ', sobre o ' + esc(pet.nome) + '.\')">' +
        '💬 WhatsApp</button></div>' +
      '<div class="s12 c2">' + esc(pes.cidade) + ' · ' + brTelefone(pes.telefone) + '</div>' +
    '</div>' +
    (pes.perfil ? '<div class="rot mb8">O que ele(a) respondeu</div><div class="g g2">' +
      blocoInfo('Moradia', pes.perfil.moradia + (pes.perfil.quintal?' com quintal':' sem quintal')) +
      blocoInfo('Horas sozinho', pes.perfil.horasFora + 'h por dia') +
      blocoInfo('Crianças em casa', pes.perfil.criancas ? 'sim' : 'não') +
      blocoInfo('Outros animais', pes.perfil.outrosPets) +
      blocoInfo('Experiência', pes.perfil.experiencia) +
      blocoInfo('Orçamento', brl(pes.perfil.orcamento) + '/mês') +
      '</div>' + blocoCompat(c)
     : '<div class="aviso aviso-a"><span class="em">📋</span><div><b>Não fez o teste de compatibilidade</b>' +
       'Peça para responder antes da entrevista — são 2 minutos e evitam surpresa depois.</div></div>') +
    '<div class="sep"></div>' +
    '<div class="rot mb8">Andamento</div>' +
    '<div class="linha">' + ETAPAS_FUNIL.map(function(e, j){
      return '<button class="op ' + (j===ix?'on car':'') + '" onclick="moverEtapa(\'' + intId + '\',\'' +
        e[0] + '\')">' + e[2] + ' ' + e[1] + '</button>'; }).join('') + '</div>' +
    (i.etapa === 'visita' || i.etapa === 'entrevista'
      ? '<div class="g g2 mt14"><div class="f"><label>Data</label>' +
        '<input class="i" type="date" id="vis-data" value="' + (i.visita?i.visita.data:maisDias(isoHoje(),3)) + '"></div>' +
        '<div class="f"><label>Hora</label><input class="i" type="time" id="vis-hora" value="' +
        (i.visita?i.visita.hora:'10:00') + '"></div>' +
        '<div class="f" style="grid-column:span 2"><label>Onde</label><input class="i" id="vis-local" value="' +
        esc(i.visita?i.visita.local:'') + '" placeholder="Endereço ou ponto de encontro"></div></div>' +
        '<button class="b b-f b-s mt8" onclick="marcarVisita(\'' + intId + '\')">📅 Salvar agendamento</button>' : ''),
    '<button class="b b-f" onclick="recusarInteresse(\'' + intId + '\')">Não seguir</button>' +
    (i.etapa === 'termo' ? '<button class="b b-p" onclick="gerarTermo(\'' + intId + '\')">✍️ Gerar termo de adoção</button>'
                         : '<button class="b b-f" onclick="fecharModal()">Fechar</button>'),
    'larga');
}
function checarRisco(pes){
  var achados = filtrar(DB.listaRisco, function(r){
    return semAcento(r.nomeRef).replace(/[^a-z]/g,'') === iniciais(pes.nome).toLowerCase();
  });
  return achados.length ? achados[0] : null;
}
function moverEtapa(intId, etapa){
  var i = achar(DB.interesses, intId);
  i.etapa = etapa; i.atualizadoEm = isoHoje();
  var pet = achar(DB.pets, i.petId);
  if(etapa !== 'interesse' && pet.status === 'disponivel') pet.status = 'em_processo';
  if(etapa === 'entregue'){ concluirAdocao(i); return; }
  salvar(); abrirInteresse(intId);
}
function marcarVisita(intId){
  var i = achar(DB.interesses, intId);
  i.visita = { data:$('#vis-data').value, hora:$('#vis-hora').value, local:$('#vis-local').value };
  i.atualizadoEm = isoHoje();
  salvar();
  aviso('📅 Visita marcada. O adotante vê isso no app dele.', 'ok');
  abrirInteresse(intId);
}
function recusarInteresse(intId){
  var i = achar(DB.interesses, intId);
  confirmar('Não seguir com este interesse?',
    'O adotante vai ver que o processo foi encerrado. Você pode registrar o motivo para a rede.',
    function(){
      i.etapa = 'recusado'; i.atualizadoEm = isoHoje();
      var pet = achar(DB.pets, i.petId);
      var outros = filtrar(DB.interesses, function(x){
        return x.petId === pet.id && x.etapa !== 'recusado' && x.etapa !== 'interesse'; });
      if(!outros.length && pet.status === 'em_processo') pet.status = 'disponivel';
      salvar(); fecharModal(); recarregar();
    }, 'Encerrar', true);
}
function gerarTermo(intId){
  var i = achar(DB.interesses, intId);
  var pet = achar(DB.pets, i.petId), pes = achar(DB.pessoas, i.pessoaId), o = ongAtual();
  modal('Termo de adoção responsável',
    '<div class="imprimir-area" style="padding:20px;border:1px solid var(--linha);border-radius:14px;line-height:1.7">' +
      '<h3 style="text-align:center;margin-bottom:4px">TERMO DE ADOÇÃO RESPONSÁVEL</h3>' +
      '<p class="s12 c3 tc">' + esc(o.nome) + ' — CNPJ ' + esc(o.cnpj) + '</p>' +
      '<p class="s13">Pelo presente instrumento, <b>' + esc(pes.nome) + '</b>, portador(a) do CPF ' +
        (pes.cpf ? mascaraCPF(pes.cpf) : '__________________') + ', residente em ' + esc(pes.cidade) + '/' + pes.uf +
        ', telefone ' + brTelefone(pes.telefone) + ', doravante ADOTANTE, recebe em adoção o animal ' +
        '<b>' + esc(pet.nome) + '</b>, ' + (pet.especie === 'gato' ? 'felino' : 'canino') + ', ' +
        (pet.sexo === 'M' ? 'macho' : 'fêmea') + ', ' + esc(pet.cor) + ', nascido(a) em ' +
        brData(pet.nascimento) + (pet.microchip ? ', microchip nº ' + esc(pet.microchip) : '') +
        (pet.rga ? ', RGA ' + esc(pet.rga) : '') + ', e assume os compromissos abaixo.</p>' +
      '<p class="s13"><b>1.</b> Manter o animal em ambiente seguro, alimentado, com água limpa, ' +
        'abrigo e convívio, jamais mantido em corrente ou isolado.</p>' +
      '<p class="s13"><b>2.</b> Providenciar assistência veterinária, vacinação anual e vermifugação ' +
        'periódica, arcando com os custos.</p>' +
      '<p class="s13"><b>3.</b> Manter o animal castrado' + (pet.castrado ? ' (já castrado na entrega)' :
        ', comprometendo-se a castrá-lo assim que houver liberação veterinária') + '.</p>' +
      '<p class="s13"><b>4.</b> Não abandonar, vender, doar ou repassar o animal a terceiros. ' +
        'Havendo impossibilidade de permanecer com ele, devolvê-lo à ' + esc(o.nome) + '.</p>' +
      '<p class="s13"><b>5.</b> Permitir o acompanhamento pós-adoção nos 7, 30, 90 e 180 dias, ' +
        'por mensagem, foto ou visita combinada.</p>' +
      '<p class="s13"><b>6.</b> Estar ciente de que maus-tratos configuram crime previsto no art. 32 ' +
        'da Lei Federal nº 9.605/1998, com pena agravada quando praticado contra cães e gatos.</p>' +
      '<p class="s13"><b>7.</b> Autorizar o tratamento dos dados pessoais aqui informados para a ' +
        'finalidade da adoção e do acompanhamento, nos termos da Lei nº 13.709/2018 (LGPD), ' +
        'podendo solicitar correção ou exclusão a qualquer tempo.</p>' +
      '<p class="s13 mt20">' + esc(o.cidade) + ', ' + data(isoHoje()).getDate() + ' de ' +
        MESES[data(isoHoje()).getMonth()] + ' de ' + isoHoje().slice(0,4) + '.</p>' +
      '<div class="g g2 mt20" style="gap:30px">' +
        '<div style="border-top:1px solid var(--tinta);padding-top:6px" class="s12 tc">' +
          esc(pes.nome) + '<br>ADOTANTE</div>' +
        '<div style="border-top:1px solid var(--tinta);padding-top:6px" class="s12 tc">' +
          esc(o.responsavel) + '<br>' + esc(o.nome) + '</div>' +
      '</div>' +
    '</div>',
    '<button class="b b-f no-print" onclick="window.print()">🖨 Imprimir</button>' +
    '<button class="b b-p" onclick="concluirAdocaoPorInteresse(\'' + intId + '\')">✓ Termo assinado — concluir adoção</button>',
    'larga');
}
function concluirAdocaoPorInteresse(intId){
  var i = achar(DB.interesses, intId);
  i.etapa = 'entregue'; i.atualizadoEm = isoHoje();
  concluirAdocao(i);
}
function concluirAdocao(i){
  var pet = achar(DB.pets, i.petId), pes = achar(DB.pessoas, i.pessoaId), o = achar(DB.ongs, i.ongId);
  pet.status = 'adotado';
  if(pet.larTemporarioId){
    var lar = achar(DB.pessoas, pet.larTemporarioId);
    if(lar && lar.lar) lar.lar.ocupadas = Math.max(0, lar.lar.ocupadas - 1);
    pet.larTemporarioId = null;
  }
  DB.adocoes.unshift({
    id:id('ado'), ongId:o.id, petId:pet.id, petNome:pet.nome, petEspecie:pet.especie,
    pessoaId:pes.id, pessoaNome:pes.nome, data:isoHoje(), termoAssinado:true, devolvido:false,
    acompanhamentos: montarAcompanhamentos(isoHoje(), isoHoje())
  });
  // encerra os outros interesses no mesmo animal
  filtrar(DB.interesses, function(x){ return x.petId === pet.id && x.id !== i.id; })
    .forEach(function(x){ x.etapa = 'recusado'; x.atualizadoEm = isoHoje(); });
  registrar(o.id, 'adocao', '🎉 ' + pet.nome + ' foi adotado por ' + pes.nome);
  notificar(o.id, 'ok', '🎉 ' + pet.nome + ' encontrou um lar!');
  salvar(); fecharModal(); recarregar();
  modal('🎉 Mais um lar!',
    '<div style="text-align:center;padding:20px"><div style="font-size:52px">🏡</div>' +
    '<h3 style="margin:10px 0 6px">' + esc(pet.nome) + ' foi para casa</h3>' +
    '<p class="s13 c2">Já agendei os contatos de acompanhamento em 7, 30, 90 e 180 dias. ' +
    'É isso que evita a devolução.</p>' +
    '<p class="s12 c3 mt14">Uma vaga a mais para o próximo resgate.</p></div>',
    '<button class="b b-p" onclick="fecharModal()">Fechar</button>', 'estreita');
}

/* ================================================================ LARES TEMPORÁRIOS */
registrarTela('ong-lares', {
  titulo:'Lares temporários', sub:'quem hospeda e quantas vagas existem',
  precisaAtiva:true, recurso:'lares',
  render:function(){
    var o = ongAtual();
    if(!temRecurso(o, 'lares')) return semRecurso('Lares temporários',
      'Controle quem hospeda cada animal, quantas vagas existem e dispare um SOS quando faltar lar.');
    var lares = filtrar(DB.pessoas, function(p){ return p.lar && p.lar.ativo; });
    var semLar = filtrar(petsDa(o.id), function(p){
      return p.status !== 'adotado' && !p.larTemporarioId; });
    var vagas = somar(lares, function(p){ return Math.max(0, p.lar.capacidade - p.lar.ocupadas); });
    return '' +
    '<div class="g g4">' +
      kpiCard('Lares cadastrados', lares.length, '🏠', '') +
      kpiCard('Vagas livres', vagas, '🛏️', vagas?'v':'p') +
      kpiCard('Animais hospedados', somar(lares, function(p){ return p.lar.ocupadas; }), '🐾', 'u') +
      kpiCard('Sem lar definido', semLar.length, '⏳', semLar.length?'a':'v') +
    '</div>' +
    (vagas === 0 ? '<div class="aviso aviso-p"><span class="em">🚨</span><div><b>Nenhuma vaga livre</b>' +
      'Sem lar disponível, o próximo resgate não acontece. Dispare o SOS para a sua rede.' +
      '<button class="b b-d b-s mt8" onclick="sosLar()">📣 Disparar SOS lar temporário</button></div></div>' : '') +
    '<div class="cx"><div class="cx-h"><h3>Rede de lares</h3>' +
      '<div class="dir"><button class="b b-f b-s" onclick="sosLar()">📣 SOS</button></div></div>' +
      '<div class="g g-b">' + lares.map(function(l){
        var hosp = filtrar(DB.pets, function(p){ return p.larTemporarioId === l.id; });
        var livre = l.lar.capacidade - hosp.length;
        return '<div class="cx plana" style="background:var(--sup-2);margin:0">' +
          '<div class="linha" style="flex-wrap:nowrap"><div class="pav" style="background:var(--verde);' +
            'color:#fff">' + iniciais(l.nome) + '</div>' +
          '<div style="flex:1;min-width:0"><b class="s13">' + esc(l.nome) + '</b>' +
          '<div class="s11 c3">' + esc(l.cidade) + ' · desde ' + brData(l.lar.desde).slice(3) + '</div></div>' +
          '<span class="et ' + (livre>0?'et-ok':'et-al') + '">' + (livre>0 ? livre + ' vaga(s)' : 'cheio') + '</span></div>' +
          '<div class="s12 c2 mt8">Aceita ' + (l.lar.aceita||[]).join(' e ') + ' até porte ' + l.lar.porteMax + '</div>' +
          (hosp.length ? '<div class="linha mt8">' + hosp.map(function(p){
            return '<span class="et et-ca">' + esc(p.nome) + '</span>'; }).join('') + '</div>' : '') +
          '<button class="b b-f b-s b-bloco mt8" onclick="abrirZap(\'' + l.telefone + '\',\'Oi ' +
            esc(l.nome.split(' ')[0]) + '! Aqui é da ' + esc(o.nome) + '.\')">💬 Chamar</button>' +
        '</div>';
      }).join('') + '</div></div>' +
    (semLar.length ? '<div class="cx"><div class="cx-h"><h3>Animais sem lar definido</h3></div>' +
      '<div class="g g-a">' + semLar.map(cardPet).join('') + '</div></div>' : '');
  }
});
function sosLar(){
  var o = ongAtual();
  var lares = filtrar(DB.pessoas, function(p){ return p.lar && p.lar.ativo; });
  var texto = '🚨 SOS LAR TEMPORÁRIO — ' + o.nome + '\n\n' +
    'Precisamos de um lar temporário urgente. A ONG cobre ração, veterinário e remédio; ' +
    'você entra com o espaço e o carinho.\n\nPode ajudar ou indicar alguém?';
  modal('📣 SOS lar temporário',
    '<p class="s13 c2">Vamos avisar os ' + lares.length + ' lares da sua rede e publicar na vitrine.</p>' +
    '<div class="f mb14"><label>Mensagem</label><textarea class="i" id="sos-txt" style="min-height:120px">' +
      esc(texto) + '</textarea></div>' +
    '<div class="aviso aviso-i mb0"><span class="em">💡</span><div>Mensagem que funciona diz ' +
      '<b>o que a pessoa NÃO precisa fazer</b>: não precisa adotar, não precisa pagar nada, ' +
      'não é para sempre.</div></div>',
    '<button class="b b-f" onclick="fecharModal()">Cancelar</button>' +
    '<button class="b b-p" onclick="copiar(document.getElementById(\'sos-txt\').value,' +
      '\'Mensagem copiada — cole no grupo do WhatsApp!\');fecharModal()">📋 Copiar e disparar</button>');
}
function semRecurso(nome, texto){
  var o = ongAtual();
  return '<div class="cx" style="text-align:center;padding:40px 24px;max-width:560px;margin:24px auto">' +
    '<div style="font-size:42px">🔐</div><h3 style="margin:10px 0 6px">' + nome + '</h3>' +
    '<p class="s13 c2">' + texto + '</p>' +
    '<p class="s12 c3">Não está no plano <b>' + esc(planoDa(o).nome) + '</b>.</p>' +
    '<button class="b b-p mt14" onclick="ir(\'ong-assinatura\')">Ver planos</button></div>';
}

/* ================================================================ DOAÇÕES */
registrarTela('ong-doacoes', {
  titulo:'Doações', sub:'quem apoia e quanto entra',
  precisaAtiva:true,
  render:function(){
    var o = ongAtual();
    var todas = ordenar(filtrar(DB.doacoes, function(d){ return d.ongId === o.id; }),
                        function(d){ return d.data; }, true);
    var mes = filtrar(todas, function(d){ return d.data >= isoHoje().slice(0,8) + '01'; });
    var rec = filtrar(todas, function(d){ return d.tipo === 'recorrente' || d.tipo === 'apadrinhamento'; });
    var doadores = unicos(todas.map(function(d){ return d.pessoaId; }));
    var mrrOng = somar(rec, function(d){ return d.valor; }) / Math.max(1, unicos(rec.map(function(d){
      return d.pessoaId + d.tipo; })).length) * unicos(rec.map(function(d){ return d.pessoaId; })).length;
    return '' +
    '<div class="g g4">' +
      kpiCard('Entrou este mês', brl(somar(mes, function(d){ return d.valor; })), '💛', 'r') +
      kpiCard('Doadores no total', doadores.length, '🤝', '') +
      kpiCard('Recorrentes', unicos(rec.map(function(d){ return d.pessoaId; })).length, '🔁', 'v') +
      kpiCard('Padrinhos', unicos(filtrar(todas, function(d){
        return d.tipo === 'apadrinhamento'; }).map(function(d){ return d.pessoaId; })).length, '🎗️', 'u') +
    '</div>' +
    '<div class="aviso aviso-c"><span class="em">🔁</span><div>' +
      '<b>Doação recorrente vale muito mais do que doação grande</b>' +
      'Uma única doação de R$ 500 resolve um mês. Dez pessoas doando R$ 30 por mês, no débito ' +
      'automático do Pix, sustentam a ONG o ano inteiro — e você para de começar o mês do zero. ' +
      'Convide seus doadores avulsos a virarem recorrentes.' +
      '<button class="b b-p b-s mt8" onclick="convidarRecorrente()">📣 Convidar doadores avulsos</button></div></div>' +
    '<div class="cx"><div class="cx-h"><div><h3>Histórico</h3><div class="desc">' + todas.length + ' doações</div></div>' +
      '<div class="dir"><button class="b b-f b-s" onclick="exportarDoacoes()">⤓ CSV</button></div></div>' +
      '<div class="rolar-x"><table class="tb"><thead><tr><th>Data</th><th>Quem</th><th>Tipo</th>' +
      '<th>Meio</th><th class="num">Valor</th></tr></thead><tbody>' +
      todas.slice(0,40).map(function(d){
        var TP = {unica:['única',''], recorrente:['mensal','et-ok'], apadrinhamento:['padrinho','et-uv'],
                  presente:['presente','et-ca']};
        var t = TP[d.tipo] || ['—',''];
        var pet = d.petId ? achar(DB.pets, d.petId) : null;
        return '<tr><td class="s12">' + brData(d.data) + '</td>' +
          '<td><b class="s13">' + esc(d.pessoaNome || '—') + '</b>' +
          (pet ? '<div class="s11 c3">apadrinha ' + esc(pet.nome) + '</div>' : '') +
          (d.item ? '<div class="s11 c3">' + esc(d.item) + '</div>' : '') + '</td>' +
          '<td><span class="et ' + t[1] + '">' + t[0] + '</span></td>' +
          '<td class="s12 c2">' + esc(String(d.meio).replace('_',' ')) + '</td>' +
          '<td class="num">' + brl(d.valor) + '</td></tr>';
      }).join('') + '</tbody></table></div></div>';
  }
});
function convidarRecorrente(){
  var o = ongAtual();
  var avulsos = unicos(filtrar(DB.doacoes, function(d){
    return d.ongId === o.id && d.tipo === 'unica'; }).map(function(d){ return d.pessoaNome; }));
  var txt = 'Oi! Aqui é da ' + o.nome + '. 🐾\n\n' +
    'Você já nos ajudou uma vez e isso fez diferença de verdade. ' +
    'Queria te convidar para algo que muda o jogo pra gente: uma doação mensal a partir de R$ 20, ' +
    'no Pix Automático — você autoriza uma vez e não precisa lembrar de nada.\n\n' +
    'Com doação mensal a gente consegue planejar castração, comprar ração em quantidade e não ' +
    'começar todo mês no zero.\n\nQuer topar?';
  modal('📣 Convidar para doação mensal',
    '<p class="s13 c2">' + avulsos.length + ' pessoas já doaram uma vez para vocês. ' +
      'São elas que mais convertem em doador mensal.</p>' +
    '<div class="f mb14"><label>Mensagem pronta</label><textarea class="i" style="min-height:180px" ' +
      'id="conv-txt">' + esc(txt) + '</textarea></div>' +
    '<div class="linha">' + avulsos.slice(0,8).map(function(nm){
      return '<span class="et">' + esc(nm) + '</span>'; }).join('') + '</div>',
    '<button class="b b-f" onclick="fecharModal()">Fechar</button>' +
    '<button class="b b-p" onclick="copiar(document.getElementById(\'conv-txt\').value,\'Copiado!\')">' +
      '📋 Copiar mensagem</button>');
}
function exportarDoacoes(){
  var o = ongAtual();
  var ds = filtrar(DB.doacoes, function(d){ return d.ongId === o.id; });
  exportarCSV('doacoes-' + slug(o.nome) + '.csv',
    ['Data','Doador','Tipo','Meio','Valor','Taxa','Item'],
    ds.map(function(d){ return [brData(d.data), d.pessoaNome||'', d.tipo, d.meio,
      String(d.valor).replace('.',','), String(d.taxa||0).replace('.',','), d.item||'']; }));
  aviso('CSV baixado.', 'ok');
}

/* ================================================================ ESTOQUE */
registrarTela('ong-estoque', {
  titulo:'Estoque e ração', sub:'quantos dias de comida ainda tem',
  precisaAtiva:true,
  render:function(){
    var o = ongAtual();
    if(!temRecurso(o, 'estoque')) return semRecurso('Estoque e ração',
      'Saiba quantos dias de comida ainda restam e receba aviso antes de acabar.');
    var itens = filtrar(DB.estoque, function(e){ return e.ongId === o.id; });
    var criticos = estoqueCritico(o.id);
    var lista = filtrar(DB.presentes, function(g){ return g.ongId === o.id; });
    return '' +
    (criticos.length ? '<div class="aviso aviso-p"><span class="em">🍽️</span><div>' +
      '<b>' + criticos.length + ' item(ns) acabando</b>' +
      criticos.map(function(c){ return c.item + ' em ' + c.dias + ' dias'; }).join(' · ') +
      '<button class="b b-d b-s mt8" onclick="pedirDoacaoRacao()">📣 Pedir doação agora</button></div></div>' : '') +
    '<div class="cx"><div class="cx-h"><div><h3>O que tem no armário</h3>' +
      '<div class="desc">o consumo diário é estimado pelo número de animais</div></div>' +
      '<div class="dir"><button class="b b-p b-s" onclick="entradaEstoque()">+ Registrar entrada</button></div></div>' +
      '<div class="rolar-x"><table class="tb"><thead><tr><th>Item</th><th class="num">Quantidade</th>' +
      '<th class="num">Consumo/dia</th><th>Autonomia</th><th></th></tr></thead><tbody>' +
      itens.map(function(e){
        var dias = e.consumoDia > 0 ? Math.floor(e.quantidade/e.consumoDia) : 999;
        var cls = dias <= 7 ? 'p' : (dias <= 20 ? 'a' : 'v');
        return '<tr><td><b class="s13">' + esc(e.item) + '</b><div class="s11 c3">' + e.tipo + '</div></td>' +
          '<td class="num">' + n(e.quantidade,1) + ' ' + e.unidade + '</td>' +
          '<td class="num s12 c2">' + n(e.consumoDia,2) + '</td>' +
          '<td style="min-width:150px"><div class="barra ' + cls + '" style="height:6px">' +
            '<i style="width:' + limite(dias/45*100,3,100) + '%"></i></div>' +
            '<span class="s11 ' + (dias<=7?'pe neg':'c3') + '">' + (dias>200?'—':dias + ' dias') + '</span></td>' +
          '<td class="td"><button class="b b-f b-s" onclick="entradaEstoque(\'' + e.id + '\')">+ Entrada</button></td>' +
          '</tr>';
      }).join('') + '</tbody></table></div></div>' +
    '<div class="cx"><div class="cx-h"><div><h3>Lista de presentes</h3>' +
      '<div class="desc">o que o público pode comprar e mandar direto para você</div></div></div>' +
      '<div class="aviso aviso-c"><span class="em">🎁</span><div>' +
      '<b>Isto substitui o "aceitamos doação de ração"</b>Em vez de receber marca trocada e ' +
      'saco vencendo, você diz exatamente o que precisa. O doador compra no parceiro e a entrega ' +
      'chega até você.</div></div>' +
      '<div class="g g2">' + lista.map(function(g){
        return '<div class="cx plana" style="background:var(--sup-2);margin:0">' +
          '<div class="entre"><b class="s13">' + esc(g.item) + '</b><span class="mono s12">' +
            brl(g.precoUnit) + '</span></div>' +
          '<div class="barra mt8"><i style="width:' + (g.recebidos/g.meta*100) + '%"></i></div>' +
          '<div class="entre mt8"><span class="s11 c3">' + g.recebidos + ' de ' + g.meta +
            ' · ' + esc(g.parceiro) + '</span></div></div>';
      }).join('') + '</div>' +
      '<button class="b b-f b-s mt14" onclick="copiar(location.href,\'Link da vitrine copiado!\')">' +
        '🔗 Copiar link para divulgar</button></div>';
  }
});
function entradaEstoque(estId){
  var o = ongAtual();
  var itens = filtrar(DB.estoque, function(e){ return e.ongId === o.id; });
  modal('Registrar entrada',
    '<div class="f mb14"><label>Item</label><select class="i" id="es-item">' +
      itens.map(function(e){ return '<option value="' + e.id + '" ' + (estId===e.id?'selected':'') + '>' +
        esc(e.item) + '</option>'; }).join('') + '</select></div>' +
    '<div class="g g2"><div class="f"><label>Quantidade</label>' +
      '<input class="i" type="number" id="es-qtd" value="15"></div>' +
      '<div class="f"><label>Origem</label><select class="i" id="es-orig">' +
      '<option>Doação</option><option>Compra</option><option>Parceria</option><option>Campanha</option>' +
      '</select></div></div>',
    '<button class="b b-f" onclick="fecharModal()">Cancelar</button>' +
    '<button class="b b-p" onclick="salvarEntrada()">Registrar</button>', 'estreita');
}
function salvarEntrada(){
  var e = achar(DB.estoque, $('#es-item').value);
  var q = +$('#es-qtd').value || 0;
  if(q <= 0){ aviso('Informe a quantidade.', 'err'); return; }
  e.quantidade += q;
  DB.movEstoque.unshift({ id:id('mv'), ongId:e.ongId, itemId:e.id, tipo:'entrada',
    qtd:q, data:isoHoje(), origem:$('#es-orig').value });
  registrar(e.ongId, 'estoque', 'Entrada de ' + q + ' ' + e.unidade + ' — ' + e.item);
  salvar(); fecharModal(); recarregar();
  aviso('Entrada registrada. Agora dá para ' +
    Math.floor(e.quantidade/(e.consumoDia||1)) + ' dias.', 'ok');
}
function pedirDoacaoRacao(){
  var o = ongAtual();
  var c = estoqueCritico(o.id);
  var txt = '🚨 ' + o.nome + ' precisa de ajuda\n\n' +
    'Nosso estoque está acabando:\n' +
    c.map(function(x){ return '• ' + x.item + ' — dura mais ' + x.dias + ' dias'; }).join('\n') +
    '\n\nVocê pode ajudar de dois jeitos:\n' +
    '1) Escolher um item na nossa lista de presentes — a entrega vem direto pra gente\n' +
    '2) Doar qualquer valor no Pix: ' + o.pixChave + '\n\n' +
    'Somos ' + filtrar(petsDa(o.id), function(p){ return p.status !== 'adotado'; }).length +
    ' animais contando com isso. 🐾';
  modal('📣 Pedir doação',
    '<div class="f"><label>Mensagem pronta para o grupo</label>' +
    '<textarea class="i" style="min-height:200px" id="ped-txt">' + esc(txt) + '</textarea></div>',
    '<button class="b b-f" onclick="fecharModal()">Fechar</button>' +
    '<button class="b b-p" onclick="copiar(document.getElementById(\'ped-txt\').value,\'Copiado!\')">' +
      '📋 Copiar</button>');
}

/* ================================================================ TRANSPARÊNCIA */
registrarTela('ong-transparencia', {
  titulo:'Prestação de contas', sub:'a página que faz o doador voltar',
  precisaAtiva:true,
  render:function(){
    var o = ongAtual();
    if(!temRecurso(o, 'relatorios')) return semRecurso('Prestação de contas',
      'Gere sozinho o relatório público de entradas, saídas e impacto.');
    var pets = filtrar(petsDa(o.id), function(p){ return p.status !== 'adotado'; });
    var custoMes = somar(pets, function(p){ return p.custoMensal; });
    var doa12 = filtrar(DB.doacoes, function(d){ return d.ongId === o.id && d.data >= maisMeses(isoHoje(),-12); });
    var ado12 = filtrar(DB.adocoes, function(a){ return a.ongId === o.id && a.data >= maisMeses(isoHoje(),-12); });
    var vac12 = filtrar(DB.vacinas, function(v){ return v.ongId === o.id && v.aplicadaEm &&
                                                        v.aplicadaEm >= maisMeses(isoHoje(),-12); });
    var castrados = filtrar(petsDa(o.id), function(p){ return p.castrado; }).length;
    var total = somar(doa12, function(d){ return d.valor; });
    var meses = [];
    for(var m=11;m>=0;m--){
      var ini = maisMeses(isoHoje().slice(0,8)+'01', -m), fim = maisMeses(ini,1);
      meses.push({r:MESES_C[+ini.slice(5,7)-1],
        v:somar(filtrar(doa12, function(d){ return d.data>=ini && d.data<fim; }), function(d){ return d.valor; })});
    }
    return '' +
    '<div class="aviso aviso-o"><span class="em">🔍</span><div>' +
      '<b>Transparência é captação, não burocracia</b>Quem doa uma vez e nunca mais sabe onde o ' +
      'dinheiro foi parar não doa de novo. Esta página se monta sozinha com o que já está no sistema — ' +
      'você só publica o link.</div></div>' +
    '<div class="g g4">' +
      kpiCard('Arrecadado (12 meses)', brlCurto(total), '💛', 'r') +
      kpiCard('Adoções (12 meses)', ado12.length, '🏡', 'v') +
      kpiCard('Vacinas aplicadas', vac12.length, '💉', 'u') +
      kpiCard('Animais castrados', castrados, '✂️', '') +
    '</div>' +
    '<div class="cx"><div class="cx-h"><div><h3>Para onde vai cada real</h3>' +
      '<div class="desc">estimado a partir do custo cadastrado de cada animal</div></div></div>' +
      '<div class="g g2">' +
        (function(){
          var linhas = [['Alimentação', 0.42, '🍽️'], ['Veterinário e remédios', 0.31, '💊'],
                        ['Castração', 0.14, '✂️'], ['Transporte e resgate', 0.08, '🚗'],
                        ['Manutenção e outros', 0.05, '🏠']];
          return linhas.map(function(l){
            return '<div class="mb14"><div class="entre"><span class="s13">' + l[2] + ' ' + l[0] + '</span>' +
              '<b class="mono s13">' + brl(total*l[1]) + '</b></div>' +
              '<div class="barra mt8"><i style="width:' + (l[1]*100) + '%"></i></div>' +
              '<div class="s11 c3 mt8">' + pct(l[1]*100) + ' do arrecadado</div></div>';
          }).join('');
        })() +
      '</div></div>' +
    '<div class="cx"><div class="cx-h"><h3>Arrecadação mês a mês</h3></div>' + barras(meses, brlCurto) + '</div>' +
    '<div class="cx"><div class="cx-h"><div><h3>Tradução do impacto</h3>' +
      '<div class="desc">use isso nos posts — número solto não emociona ninguém</div></div></div>' +
      '<div class="g g3">' +
        traducao('R$ 30', 'alimentam um cão de porte médio por 10 dias') +
        traducao('R$ 45', 'pagam uma dose de vacina múltipla') +
        traducao('R$ 250', 'cobrem uma castração completa') +
        traducao(brl(custoMes), 'é o que a ONG gasta por mês com os ' + pets.length + ' animais de agora') +
        traducao(brl(pets.length ? custoMes/pets.length : 0), 'é o custo médio de um animal por mês') +
        traducao(ado12.length + ' famílias', 'ganharam um companheiro nos últimos 12 meses') +
      '</div>' +
      '<div class="linha mt14"><button class="b b-p" onclick="window.print()">🖨 Gerar relatório em PDF</button>' +
      '<button class="b b-f" onclick="copiar(location.href,\'Link copiado!\')">🔗 Copiar link público</button></div>' +
    '</div>';
  }
});
function traducao(valor, texto){
  return '<div class="cx plana" style="background:var(--sup-2);margin:0;text-align:center">' +
    '<div class="num-grande" style="font-size:22px">' + valor + '</div>' +
    '<div class="s12 c2 mt8">' + texto + '</div></div>';
}

/* ================================================================ REDE DE PROTEÇÃO */
registrarTela('ong-rede', {
  titulo:'Rede de proteção', sub:'o alerta que uma ONG sozinha não consegue ter',
  precisaAtiva:true,
  render:function(){
    var o = ongAtual();
    if(!temRecurso(o, 'rede')) return semRecurso('Rede de proteção',
      'Consulte e alimente a lista compartilhada de ocorrências entre as ONGs da plataforma. ' +
      'É o que impede que quem maltratou num lugar adote em outro.');
    return '' +
    '<div class="aviso aviso-c"><span class="em">🛡️</span><div>' +
      '<b>Por que isso é o coração da plataforma</b>' +
      'Quem revende filhote ou maltrata não volta na mesma ONG — vai na próxima, na cidade vizinha, ' +
      'que não tem como saber. Aqui a ocorrência registrada por uma organização aparece como alerta ' +
      'para todas as outras no momento da triagem. Quanto mais ONGs entram, mais forte fica — ' +
      'e é por isso que ninguém sai depois de entrar.</div></div>' +
    '<div class="aviso aviso-a"><span class="em">⚖️</span><div>' +
      '<b>Uso responsável</b>O registro guarda apenas iniciais e CPF parcial, exige descrição do ' +
      'fato e fica visível ao titular mediante pedido (LGPD, art. 18). Alerta não é veto automático: ' +
      'a decisão continua sendo de cada ONG, e uma ocorrência confirmada por duas organizações pesa ' +
      'diferente de uma isolada.</div></div>' +
    '<div class="cx"><div class="cx-h"><div><h3>Ocorrências da rede</h3>' +
      '<div class="desc">' + DB.listaRisco.length + ' registros · ' + DB.ongs.length + ' ONGs conectadas</div></div>' +
      '<div class="dir"><button class="b b-d b-s" onclick="registrarOcorrencia()">+ Registrar ocorrência</button></div></div>' +
      (DB.listaRisco.length ? DB.listaRisco.map(function(r){
        var origem = achar(DB.ongs, r.ongId);
        var GR = {alta:['grave','et-pe'], media:['atenção','et-al'], baixa:['registro','']};
        return '<div class="cx plana mb8" style="background:var(--sup-2);margin:0;' +
          'border-left:3px solid var(--' + (r.gravidade==='alta'?'perigo':'alerta') + ')">' +
          '<div class="entre"><b>' + esc(r.nomeRef) + ' · ' + esc(r.cpfParcial) + '</b>' +
          '<span class="et ' + GR[r.gravidade][1] + '">' + GR[r.gravidade][0] + '</span></div>' +
          '<div class="s13 c2 mt8">' + esc(r.motivo) + '</div>' +
          '<div class="s11 c3 mt8">Registrado por ' + esc(origem?origem.nome:'—') + ' em ' + brData(r.data) +
          ' · confirmado por ' + r.confirmadaPor + ' organização(ões)</div>' +
          (r.ongId !== o.id ? '<button class="b b-f b-s mt8" onclick="confirmarOcorrencia(\'' + r.id + '\')">' +
            '✓ Também tive problema com esta pessoa</button>' : '') +
        '</div>';
      }).join('') : '<div class="vazio s13">Nenhuma ocorrência — que bom.</div>') + '</div>';
  }
});
function registrarOcorrencia(){
  modal('Registrar ocorrência na rede',
    '<div class="aviso aviso-a"><span class="em">⚠️</span><div>Registre apenas fatos que você ' +
      'presenciou ou pode comprovar. Isso vai ser visto por todas as ONGs da plataforma.</div></div>' +
    '<div class="g g2">' +
      campo('Iniciais da pessoa','oc-nome','') +
      campo('CPF parcial (***.123.***-45)','oc-cpf','') +
    '</div>' +
    '<div class="f mt14"><label>O que aconteceu</label>' +
      '<textarea class="i" id="oc-motivo" placeholder="Descreva o fato de forma objetiva, com datas."></textarea></div>' +
    '<div class="f mt14"><label>Gravidade</label><div class="opcoes" id="oc-grav">' +
      [['baixa','Registro'],['media','Atenção'],['alta','Grave']].map(function(g,i){
        return '<button class="op ' + (i===1?'on car':'') + '" data-v="' + g[0] + '" ' +
          'onclick="$$(\'#oc-grav .op\').forEach(function(b){b.classList.remove(\'on\',\'car\')});' +
          'this.classList.add(\'on\',\'car\')">' + g[1] + '</button>'; }).join('') + '</div></div>',
    '<button class="b b-f" onclick="fecharModal()">Cancelar</button>' +
    '<button class="b b-d" onclick="salvarOcorrencia()">Registrar</button>');
}
function salvarOcorrencia(){
  var m = $('#oc-motivo').value.trim();
  if(!m || m.length < 25){ aviso('Descreva o que aconteceu com mais detalhe.', 'err'); return; }
  DB.listaRisco.unshift({
    id:id('lr'), ongId:SESSAO.ongId, nomeRef:$('#oc-nome').value.trim() || '—',
    cpfParcial:$('#oc-cpf').value.trim() || '—', motivo:m,
    gravidade: ($('#oc-grav .op.on')[0]||{getAttribute:function(){return 'media';}}).getAttribute('data-v'),
    data:isoHoje(), confirmadaPor:1
  });
  salvar(); fecharModal(); recarregar();
  aviso('Registrado. Todas as ONGs da rede já enxergam este alerta.', 'ok');
}
function confirmarOcorrencia(rid){
  var r = achar(DB.listaRisco, rid);
  r.confirmadaPor++;
  salvar(); recarregar();
  aviso('Obrigada. Ocorrência confirmada por mais uma organização.', 'ok');
}

/* ================================================================ EVENTOS */
registrarTela('ong-eventos', {
  titulo:'Feiras e eventos', sub:'onde a adoção realmente acontece',
  precisaAtiva:true,
  render:function(){
    var o = ongAtual();
    if(!temRecurso(o, 'eventos')) return semRecurso('Feiras e eventos',
      'Organize feiras de adoção e mutirões, controle inscritos e imprima os cartazes de uma vez.');
    var meus = ordenar(filtrar(DB.eventos, function(e){ return e.ongId === o.id; }), function(e){ return e.data; });
    var proximos = filtrar(meus, function(e){ return e.data >= isoHoje(); });
    return '' +
    '<div class="aviso aviso-i"><span class="em">🎪</span><div><b>Prepare a feira em um clique</b>' +
      'Escolha o evento e o sistema gera os cartazes com QR de todos os animais que você vai levar. ' +
      'Quem passar na barraca aponta a câmera e já vê a história completa, mesmo depois de ir embora.</div></div>' +
    '<div class="cx"><div class="cx-h"><h3>Meus eventos</h3>' +
      '<div class="dir"><button class="b b-p b-s" onclick="novoEvento()">+ Novo evento</button></div></div>' +
      (proximos.length ? '<div class="g g-b">' + proximos.map(function(e){
        var emo = {feira:'🐾', castracao:'✂️', mutirao:'🧼'};
        return '<div class="cx plana" style="background:var(--sup-2);margin:0">' +
          '<div class="linha" style="flex-wrap:nowrap"><span style="font-size:24px">' + emo[e.tipo] + '</span>' +
          '<div style="flex:1;min-width:0"><b class="s13">' + esc(e.titulo) + '</b>' +
          '<div class="s11 c3">' + brData(e.data) + ' às ' + e.hora + '</div></div>' +
          '<span class="et et-ca">' + quandoTexto(e.data) + '</span></div>' +
          '<div class="s12 c2 mt8">📍 ' + esc(e.local) + ', ' + esc(e.cidade) + '</div>' +
          '<div class="s11 c3 mt8">' + (e.inscritos||0) + ' pessoas querem ser lembradas</div>' +
          '<button class="b b-p b-s b-bloco mt8" onclick="prepararFeira(\'' + e.id + '\')">' +
            '🖨 Preparar cartazes</button></div>';
      }).join('') + '</div>' : vazio('📅','Nenhum evento marcado','Crie o primeiro.',
        '<button class="b b-p" onclick="novoEvento()">+ Novo evento</button>')) + '</div>';
  }
});
function novoEvento(){
  modal('Novo evento',
    '<div class="f mb14"><label>Título</label><input class="i" id="ev-tit" placeholder="Feira de adoção no parque"></div>' +
    '<div class="g g2">' +
      '<div class="f"><label>Tipo</label><select class="i" id="ev-tipo">' +
        '<option value="feira">Feira de adoção</option><option value="castracao">Mutirão de castração</option>' +
        '<option value="mutirao">Mutirão interno</option></select></div>' +
      '<div class="f"><label>Data</label><input class="i" type="date" id="ev-data" value="' +
        maisDias(isoHoje(),14) + '"></div>' +
      '<div class="f"><label>Hora</label><input class="i" type="time" id="ev-hora" value="10:00"></div>' +
      '<div class="f"><label>Cidade</label><select class="i" id="ev-cid">' +
        todasCidades().map(function(c){ return '<option>' + esc(c) + '</option>'; }).join('') + '</select></div>' +
    '</div>' +
    '<div class="f mt14"><label>Local</label><input class="i" id="ev-local" placeholder="Praça, shopping, sede..."></div>' +
    '<div class="f mt14"><label>Observações</label><textarea class="i" id="ev-obs"></textarea></div>' +
    '<label class="check on mt14"><input type="checkbox" id="ev-pub" checked>' +
      '<span class="s13">Aparecer na agenda pública</span></label>',
    '<button class="b b-f" onclick="fecharModal()">Cancelar</button>' +
    '<button class="b b-p" onclick="salvarEvento()">Criar evento</button>');
}
function salvarEvento(){
  var t = $('#ev-tit').value.trim();
  if(!t){ aviso('Dê um título ao evento.', 'err'); return; }
  DB.eventos.push({
    id:id('ev'), ongId:SESSAO.ongId, tipo:$('#ev-tipo').value, titulo:t,
    data:$('#ev-data').value, hora:$('#ev-hora').value, local:$('#ev-local').value,
    cidade:$('#ev-cid').value, uf:'SP', publico:$('#ev-pub').checked, vagas:30, inscritos:0,
    obs:$('#ev-obs').value
  });
  registrar(SESSAO.ongId, 'evento', 'Evento criado: ' + t);
  salvar(); fecharModal(); recarregar();
  aviso('Evento criado e publicado na agenda. 🎪', 'ok');
}
function prepararFeira(evId){
  var e = achar(DB.eventos, evId), o = ongAtual();
  var pets = filtrar(petsDa(o.id), function(p){ return p.status === 'disponivel'; });
  modal('🖨 Cartazes — ' + esc(e.titulo),
    '<p class="s13 c2 no-print">' + pets.length + ' animais disponíveis. Cada folha sai com o QR ' +
      'que abre o perfil completo.</p>' +
    '<div class="imprimir-area">' + pets.map(function(p){
      var link = 'https://aular.app/p/' + slug(p.nome) + '-' + p.id.slice(-4);
      return '<div style="page-break-inside:avoid;border:1px solid var(--linha);border-radius:12px;' +
        'padding:12px;margin-bottom:10px;display:flex;gap:12px;align-items:center">' +
        '<div class="pav g" style="' + estiloFoto(p) + '"></div>' +
        '<div style="flex:1;min-width:0"><b class="s16">' + esc(p.nome) + '</b>' +
        '<div class="s12 c2">' + idadeTexto(p.nascimento) + ' · ' + rotuloPorte(p.porte) + ' · ' +
          (p.sexo==='M'?'macho':'fêmea') + (p.castrado?' · castrado':'') + '</div>' +
        '<div class="s11 c3">' + esc(truncar(p.historia, 110)) + '</div></div>' +
        '<div>' + QR.svg(link, 76) + '</div></div>';
    }).join('') + '</div>',
    '<button class="b b-p no-print" onclick="window.print()">🖨 Imprimir todos</button>', 'larga');
}

/* ================================================================ ASSINATURA */
registrarTela('ong-assinatura', {
  titulo:'Meu plano', sub:'assinatura, faturas e dados',
  render:function(){
    var o = ongAtual();
    var plano = planoDa(o);
    var fats = faturasDa(o.id);
    var aberta = faturaAberta(o.id);
    var lim = limitePets(o);
    return '' +
    '<div class="cx"><div class="cx-h"><div><h3>Plano atual</h3></div>' +
      '<div class="dir"><span class="et ' + (o.situacao==='ativa'?'et-ok':'et-pe') + '">' +
        o.situacao + '</span></div></div>' +
      '<div class="g g4">' +
        blocoInfo('Plano', plano.nome) +
        blocoInfo('Mensalidade', plano.preco ? brl(plano.preco) : 'gratuito') +
        blocoInfo('Animais', lim.usados + ' de ' + (lim.limite>9000?'∞':lim.limite)) +
        blocoInfo('Próximo vencimento', plano.preco ? brData(o.proximoVencimento) : '—') +
      '</div>' +
      (aberta ? '<div class="aviso aviso-a mt14 mb0"><span class="em">💳</span><div>' +
        '<b>Fatura de ' + aberta.competencia + ' em aberto — ' + brl(aberta.valor) + '</b>' +
        'Vence em ' + brData(aberta.vence) + ' (' + quandoTexto(aberta.vence) + ')' +
        '<button class="b b-p b-s mt8" onclick="pagarFatura(\'' + aberta.id + '\',\'pix\');recarregar()">' +
        '⚡ Pagar com Pix</button></div></div>' : '') +
    '</div>' +
    '<div class="cx"><div class="cx-h"><h3>Mudar de plano</h3></div>' +
      '<div class="g g4">' + DB.planos.map(function(pl){
        return cardPlano(pl, pl.id === o.planoId);
      }).join('') + '</div></div>' +
    '<div class="cx"><div class="cx-h"><h3>Faturas</h3></div>' +
      '<div class="rolar-x"><table class="tb"><thead><tr><th>Competência</th><th>Vencimento</th>' +
      '<th class="num">Valor</th><th>Situação</th><th></th></tr></thead><tbody>' +
      (fats.length ? fats.slice(0,12).map(function(f){
        var ST = {paga:['paga','et-ok'], aberta:['em aberto','et-al'],
                  atrasada:['atrasada','et-pe'], cancelada:['cancelada','']};
        return '<tr><td class="s13">' + f.competencia + '</td><td class="s12">' + brData(f.vence) + '</td>' +
          '<td class="num">' + brl(f.valor) + '</td>' +
          '<td><span class="et ' + ST[f.status][1] + '">' + ST[f.status][0] + '</span></td>' +
          '<td class="td">' + (!f.pagoEm && f.status !== 'cancelada'
            ? '<button class="b b-p b-s" onclick="pagarFatura(\'' + f.id + '\',\'pix\');recarregar()">Pagar</button>'
            : '<span class="s11 c3">' + (f.pagoEm ? brData(f.pagoEm) : '') + '</span>') + '</td></tr>';
      }).join('') : '<tr><td colspan="5" class="tc c3 s12">Plano gratuito — sem faturas</td></tr>') +
      '</tbody></table></div></div>' +
    '<div class="cx"><div class="cx-h"><div><h3>Meus dados</h3>' +
      '<div class="desc">seus dados são seus, sempre — mesmo se você sair</div></div></div>' +
      '<p class="s13 c2">Baixe tudo o que está aqui num arquivo só: animais, vacinas, adoções, ' +
      'doadores, estoque e faturas. Serve para backup, para prestação de contas e para levar embora ' +
      'se um dia você quiser trocar de sistema.</p>' +
      '<button class="b b-f" onclick="exportarDadosOng(\'' + o.id + '\')">⤓ Baixar tudo (JSON)</button></div>';
  }
});
function cardPlano(pl, atual){
  return '<div class="plano ' + (pl.destaque?'dest':'') + '">' +
    (pl.destaque ? '<div class="fita">mais escolhido</div>' : '') +
    '<h4>' + pl.nome + '</h4>' +
    '<div class="pr">' + (pl.preco ? brl(pl.preco).replace(',00','') : 'Grátis') +
      (pl.preco ? '<small>/mês</small>' : '') + '</div>' +
    '<ul>' + pl.lista.map(function(l){ return '<li>' + l + '</li>'; }).join('') +
      pl.naoTem.map(function(l){ return '<li class="nao">' + l + '</li>'; }).join('') + '</ul>' +
    (atual ? '<button class="b b-f b-bloco" disabled>✓ Seu plano</button>'
           : '<button class="b b-p b-bloco" onclick="mudarPlanoConfirma(\'' + pl.id + '\')">Escolher</button>') +
  '</div>';
}
function mudarPlanoConfirma(planoId){
  var pl = achar(DB.planos, planoId), o = ongAtual();
  confirmar('Mudar para o plano ' + pl.nome + '?',
    (pl.preco ? 'A cobrança de ' + brl(pl.preco) + '/mês passa a valer já na próxima fatura.'
              : 'Você volta para o plano gratuito, limitado a ' + pl.limitePets + ' animais.'),
    function(){ trocarPlano(o.id, planoId); recarregar(); aviso('Plano alterado.', 'ok'); });
}

/* ================================================================ CONFIGURAÇÕES */
registrarTela('ong-config', {
  titulo:'Configurações', sub:'marca, contato e equipe',
  precisaAtiva:true,
  render:function(){
    var o = ongAtual();
    return '' +
    '<div class="cx"><div class="cx-h"><h3>Identidade</h3></div>' +
      '<div class="g g2">' +
        campo('Nome da organização','cf-nome', o.nome) +
        campo('CNPJ','cf-cnpj', o.cnpj) +
        campo('Responsável','cf-resp', o.responsavel) +
        campo('WhatsApp','cf-tel', o.telefone) +
        campo('E-mail','cf-email', o.email) +
        campo('Instagram','cf-insta', o.instagram || '') +
        campo('Chave Pix','cf-pix', o.pixChave) +
        '<div class="f"><label>Cidade</label><select class="i" id="cf-cidade">' +
          todasCidades().map(function(c){ return '<option ' + (o.cidade===c?'selected':'') + '>' +
            esc(c) + '</option>'; }).join('') + '</select></div>' +
      '</div>' +
      '<div class="f mt14"><label>Sobre a ONG — aparece na vitrine</label>' +
        '<textarea class="i" id="cf-sobre" style="min-height:90px">' + esc(o.sobre) + '</textarea></div>' +
      (temRecurso(o,'marca')
        ? '<div class="f mt14"><label>Cor da marca</label>' +
          '<input type="color" class="i" id="cf-cor" value="' + o.cor + '" style="height:44px"></div>'
        : '<div class="aviso aviso-i mt14 mb0"><span class="em">🎨</span><div>' +
          '<b>Marca própria</b>Cor e logo na vitrine estão no plano ONG.</div></div>') +
      '<button class="b b-p mt14" onclick="salvarConfigOng()">Salvar</button></div>' +
    '<div class="cx"><div class="cx-h"><h3>Privacidade e LGPD</h3></div>' +
      '<label class="check ' + (o.transparencia?'on':'') + '"><input type="checkbox" ' +
        (o.transparencia?'checked':'') + ' onchange="ongAtual().transparencia=this.checked;salvar()">' +
        '<span><b>Publicar prestação de contas</b><br><span class="s12 c2">' +
        'A página pública com entradas, saídas e impacto fica visível para qualquer pessoa.</span></span></label>' +
      '<div class="aviso aviso-i mt14 mb0"><span class="em">🔐</span><div>' +
        '<b>O que guardamos dos adotantes</b>Nome, contato, cidade e as respostas do teste de ' +
        'compatibilidade — só o necessário para a adoção. CPF aparece mascarado nas telas e completo ' +
        'apenas no termo. Qualquer pessoa pode pedir cópia ou exclusão dos dados dela.</div></div></div>';
  }
});
function salvarConfigOng(){
  var o = ongAtual();
  o.nome = $('#cf-nome').value.trim() || o.nome;
  o.cnpj = $('#cf-cnpj').value; o.responsavel = $('#cf-resp').value;
  o.telefone = $('#cf-tel').value; o.email = $('#cf-email').value;
  o.instagram = $('#cf-insta').value; o.pixChave = $('#cf-pix').value;
  o.cidade = $('#cf-cidade').value; o.sobre = $('#cf-sobre').value;
  if($('#cf-cor')) o.cor = $('#cf-cor').value;
  salvar(); pintarTopo(); montarMenu();
  aviso('Salvo.', 'ok');
}
