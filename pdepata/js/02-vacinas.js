/* =========================================================================
   P de PATA — protocolo vacinal e vermifugação.
   O calendário não é digitado à mão: o sistema conhece o protocolo brasileiro
   e monta a agenda sozinho a partir da espécie e da data de nascimento.
   Sempre revisado pelo veterinário responsável — o app organiza, não prescreve.
   ========================================================================= */
'use strict';

/* Protocolo de referência (Brasil).
   inicio  = idade em dias para a 1ª dose
   doses   = quantas doses na série inicial
   entre   = intervalo em dias entre as doses
   reforco = intervalo do reforço em dias (0 = sem reforço periódico) */
var PROTOCOLO = {
  cao: [
    { nome:'V10 (múltipla)', curto:'V10', inicio:45, doses:3, entre:24, reforco:365,
      protege:'cinomose, parvovirose, hepatite, adenovirose, parainfluenza e leptospirose',
      essencial:true },
    { nome:'Antirrábica', curto:'Raiva', inicio:90, doses:1, entre:0, reforco:365,
      protege:'raiva — obrigatória por lei e exigida em feiras e viagens', essencial:true },
    { nome:'Gripe canina (tosse dos canis)', curto:'Gripe', inicio:60, doses:2, entre:21, reforco:365,
      protege:'traqueobronquite infecciosa — importante em abrigo e lar coletivo', essencial:false },
    { nome:'Giárdia', curto:'Giárdia', inicio:60, doses:2, entre:21, reforco:365,
      protege:'giardíase — recomendada onde há muitos animais juntos', essencial:false },
    { nome:'Vermífugo', curto:'Vermífugo', inicio:15, doses:3, entre:15, reforco:120,
      protege:'verminoses intestinais', essencial:true, tipo:'medicacao' },
    { nome:'Antipulgas e carrapatos', curto:'Antipulgas', inicio:56, doses:1, entre:0, reforco:30,
      protege:'ectoparasitas', essencial:true, tipo:'medicacao' }
  ],
  gato: [
    { nome:'V4 (quádrupla felina)', curto:'V4', inicio:60, doses:3, entre:24, reforco:365,
      protege:'panleucopenia, rinotraqueíte, calicivirose e clamidiose', essencial:true },
    { nome:'Antirrábica', curto:'Raiva', inicio:90, doses:1, entre:0, reforco:365,
      protege:'raiva', essencial:true },
    { nome:'FeLV (leucemia felina)', curto:'FeLV', inicio:60, doses:2, entre:21, reforco:365,
      protege:'leucemia felina — exige teste negativo antes da 1ª dose', essencial:false },
    { nome:'Vermífugo', curto:'Vermífugo', inicio:21, doses:3, entre:15, reforco:120,
      protege:'verminoses intestinais', essencial:true, tipo:'medicacao' },
    { nome:'Antipulgas', curto:'Antipulgas', inicio:56, doses:1, entre:0, reforco:30,
      protege:'ectoparasitas', essencial:true, tipo:'medicacao' }
  ]
};

/** Monta a agenda completa de um pet. Chamado no cadastro e quando muda a data
    de nascimento. Doses cujo prazo já passou há muito entram como "aplicadas"
    apenas no seed — na vida real ficam pendentes até alguém confirmar. */
function gerarVacinas(D, petId, ongId, especie, nascimento){
  var lista = PROTOCOLO[especie] || PROTOCOLO.cao;
  var hj = isoHoje();
  lista.forEach(function(v){
    var quando = maisDias(nascimento, v.inicio);
    var i;
    for(i=0; i<v.doses; i++){
      if(i > 0) quando = maisDias(quando, v.entre);
      empurrarDose(D, petId, ongId, v, (v.doses > 1 ? (i+1) + 'ª dose' : 'dose única'), quando, hj);
    }
    if(v.reforco){
      // reforços até hoje + 1 ano à frente (mostra o próximo)
      var limite = maisDias(hj, 366), proximo = maisDias(quando, v.reforco), guarda = 0;
      while(proximo <= limite && guarda++ < 60){
        empurrarDose(D, petId, ongId, v, 'reforço', proximo, hj);
        proximo = maisDias(proximo, v.reforco);
      }
    }
  });
}
function empurrarDose(D, petId, ongId, v, dose, quando, hj){
  if(quando < maisDias(hj, -900)) return;            // não polui com histórico antigo demais
  var vencida = difDias(quando, hj) > 0;
  // No seed: o que venceu há mais de 20 dias já foi aplicado (a ONG cuidava disso
  // no caderno). O que venceu há pouco fica em atraso de propósito, para o painel
  // ter o que mostrar.
  var aplicada = vencida && difDias(quando, hj) > 20;
  D.vacinas.push({
    id: id('vac'), petId:petId, ongId:ongId,
    vacina:v.nome, curto:v.curto, tipo:v.tipo || 'vacina', dose:dose,
    protege:v.protege, essencial:v.essencial,
    previstaPara:quando,
    aplicadaEm: aplicada ? quando : null,
    lote: aplicada ? 'L' + Math.floor(Math.random()*9000+1000) : null,
    veterinario: aplicada ? 'CRMV-SP 34.221' : null
  });
}

/* ------------------------------------------------------------------ consultas */
function vacinasDoPet(petId){
  return ordenar(filtrar(DB.vacinas, function(v){ return v.petId === petId; }),
                 function(v){ return v.previstaPara; });
}
function situacaoVacina(v){
  if(v.aplicadaEm) return 'aplicada';
  var d = difDias(v.previstaPara, isoHoje());
  if(d > 0) return 'atrasada';
  if(d >= -14) return 'proxima';
  return 'agendada';
}
/** Resumo do pet: em dia? quantas pendências? */
function saudePet(petId){
  var vs = vacinasDoPet(petId);
  var atrasadas = 0, proximas = 0, aplicadas = 0;
  vs.forEach(function(v){
    var s = situacaoVacina(v);
    if(s === 'atrasada') atrasadas++;
    else if(s === 'proxima') proximas++;
    else if(s === 'aplicada') aplicadas++;
  });
  return {
    atrasadas:atrasadas, proximas:proximas, aplicadas:aplicadas, total:vs.length,
    emDia: atrasadas === 0,
    // essenciais em dia = pode ir para adoção com segurança
    aptoAdocao: !filtrar(vs, function(v){
      return v.essencial && !v.aplicadaEm && difDias(v.previstaPara, isoHoje()) > 0;
    }).length
  };
}
/** Agenda da ONG numa janela de dias (para o calendário e os alertas). */
function agendaVacinas(ongId, deDias, ateDias){
  var hj = isoHoje();
  var de = maisDias(hj, deDias === undefined ? -30 : deDias);
  var ate = maisDias(hj, ateDias === undefined ? 60 : ateDias);
  return ordenar(filtrar(DB.vacinas, function(v){
    return v.ongId === ongId && !v.aplicadaEm && v.previstaPara >= de && v.previstaPara <= ate;
  }), function(v){ return v.previstaPara; });
}
function aplicarVacina(vacId, quando, lote, vet){
  var v = achar(DB.vacinas, vacId); if(!v) return;
  v.aplicadaEm = quando || isoHoje();
  v.lote = lote || null;
  v.veterinario = vet || null;
  var pet = achar(DB.pets, v.petId);
  registrar(v.ongId, 'saude', (pet ? pet.nome : 'Pet') + ' — ' + v.vacina + ' (' + v.dose + ') aplicada', v.petId);
  salvar();
}
function desfazerVacina(vacId){
  var v = achar(DB.vacinas, vacId); if(!v) return;
  v.aplicadaEm = null; v.lote = null; v.veterinario = null;
  salvar();
}
