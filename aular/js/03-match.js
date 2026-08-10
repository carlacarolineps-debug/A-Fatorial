/* =========================================================================
   AuLar — compatibilidade entre pessoa e animal.

   Por que isso existe: aplicativo de adoção que só mostra foto e deixa deslizar
   gera muito interesse e muita devolução. O animal volta, ocupa vaga de novo e
   a pessoa vai embora frustrada. Aqui o deslizar continua — mas cada animal
   chega com uma nota de compatibilidade e com o motivo dela, calculada sobre
   o que realmente faz uma adoção dar certo: espaço, tempo sozinho, energia,
   convivência, experiência do tutor e orçamento.

   A nota nunca esconde um animal. Ela ordena a fila e avisa o que vai exigir
   atenção — inclusive quando a compatibilidade é baixa.
   ========================================================================= */
'use strict';

var QUIZ = [
  { chave:'especiePref', titulo:'O que você está procurando?', icone:'🐾',
    opcoes:[ {v:'cao',r:'Cachorro'}, {v:'gato',r:'Gato'}, {v:'qualquer',r:'Tanto faz — quero conhecer'} ] },

  { chave:'moradia', titulo:'Onde você mora?', icone:'🏠',
    opcoes:[ {v:'apartamento',r:'Apartamento'}, {v:'casa',r:'Casa'},
             {v:'casa_condominio',r:'Casa em condomínio'} ] },

  { chave:'metros', titulo:'Qual o tamanho do espaço?', icone:'📐',
    opcoes:[ {v:'pequeno',r:'Pequeno (até 50 m²)'}, {v:'medio',r:'Médio (50 a 100 m²)'},
             {v:'grande',r:'Grande (mais de 100 m²)'} ] },

  { chave:'quintal', titulo:'Tem quintal ou área externa segura?', icone:'🌳',
    opcoes:[ {v:true,r:'Sim, cercada'}, {v:false,r:'Não'} ] },

  { chave:'horasFora', titulo:'Quantas horas o animal ficaria sozinho num dia comum?', icone:'⏰',
    opcoes:[ {v:2,r:'Quase nunca fica só'}, {v:5,r:'Umas 4 a 6 horas'},
             {v:9,r:'8 a 10 horas'}, {v:12,r:'Mais de 10 horas'} ] },

  { chave:'exercicio', titulo:'Quanto tempo por dia você tem para passear e brincar?', icone:'🎾',
    opcoes:[ {v:'baixo',r:'Pouco — até 20 minutos'}, {v:'medio',r:'Meia hora a uma hora'},
             {v:'alto',r:'Mais de uma hora, todo dia'} ] },

  { chave:'criancas', titulo:'Moram crianças com você?', icone:'🧒',
    opcoes:[ {v:false,r:'Não'}, {v:true,r:'Sim'} ] },

  { chave:'outrosPets', titulo:'Já tem outros animais em casa?', icone:'🐕',
    opcoes:[ {v:'nenhum',r:'Nenhum'}, {v:'cao',r:'Cachorro'}, {v:'gato',r:'Gato'},
             {v:'ambos',r:'Cachorro e gato'} ] },

  { chave:'experiencia', titulo:'Qual sua experiência com animais?', icone:'📚',
    opcoes:[ {v:'primeira',r:'É meu primeiro'}, {v:'alguma',r:'Já tive antes'},
             {v:'muita',r:'Tenho bastante experiência'} ] },

  { chave:'orcamento', titulo:'Quanto cabe no seu orçamento por mês?', icone:'💰',
    aviso:'Ração, vermífugo, antipulgas e uma reserva para o veterinário. Ser honesto aqui protege o animal.',
    opcoes:[ {v:150,r:'Até R$ 150'}, {v:250,r:'R$ 150 a R$ 300'},
             {v:400,r:'R$ 300 a R$ 500'}, {v:700,r:'Mais de R$ 500'} ] },

  { chave:'portePref', titulo:'Tem preferência de porte?', icone:'📏',
    opcoes:[ {v:'pequeno',r:'Pequeno'}, {v:'medio',r:'Médio'}, {v:'grande',r:'Grande'},
             {v:'qualquer',r:'Sem preferência'} ] },

  { chave:'idadePref', titulo:'E de idade?', icone:'🎂',
    aviso:'Filhote dá muito mais trabalho no primeiro ano. Adulto já vem com a personalidade pronta — você sabe o que está levando.',
    opcoes:[ {v:'filhote',r:'Filhote'}, {v:'adulto',r:'Adulto'},
             {v:'idoso',r:'Idoso — quero dar um fim de vida bom'}, {v:'qualquer',r:'Sem preferência'} ] },

  { chave:'especiais', titulo:'Você consideraria um animal com necessidade especial?', icone:'💗',
    aviso:'Cego, surdo, FIV+, idoso ou com medicação contínua. São os que mais esperam — e costumam ser os mais gratos.',
    opcoes:[ {v:true,r:'Sim, considero'}, {v:'talvez',r:'Depende do caso'}, {v:false,r:'Agora não'} ] }
];

/* Pesos: quanto cada dimensão vale na nota final. Somam 100. */
var PESOS = {
  espaco:16, tempoSozinho:18, energia:16, convivencia:16,
  experiencia:10, orcamento:12, preferencias:12
};

/**
 * Compara um perfil de pessoa com um animal.
 * Devolve { score 0-100, pontos[], alertas[], impeditivo }
 */
function compatibilidade(perfil, pet){
  if(!perfil) return { score:null, pontos:[], alertas:[], impeditivo:false };
  var p = {}, pontos = [], alertas = [];
  var idade = idadeAnos(pet.nascimento);

  /* --- espaço x porte --- */
  var espacoNota = 1;
  var areaGrande = perfil.metros === 'grande' || perfil.quintal;
  if(pet.porte === 'grande'){
    if(perfil.quintal) espacoNota = 1;
    else if(perfil.metros === 'grande') espacoNota = 0.8;
    else if(perfil.metros === 'medio') espacoNota = 0.5;
    else espacoNota = 0.25;
  } else if(pet.porte === 'medio'){
    espacoNota = perfil.metros === 'pequeno' && !perfil.quintal ? 0.65 : 1;
  }
  if(pet.precisaQuintal && !perfil.quintal) espacoNota = Math.min(espacoNota, 0.45);
  p.espaco = espacoNota;
  if(espacoNota >= 0.9) pontos.push(pet.porte === 'grande' ? 'Seu espaço comporta um cão grande' : 'O porte cabe bem no seu espaço');
  else if(espacoNota < 0.5) alertas.push(pet.precisaQuintal
      ? 'Este animal se dá muito melhor com área externa cercada'
      : 'Porte grande em espaço pequeno exige passeio longo todo dia');

  /* --- tempo sozinho --- */
  var horas = +perfil.horasFora || 6;
  var aguenta = pet.tempoSozinho || 6;
  var tsNota = horas <= aguenta ? 1 : Math.max(0.1, 1 - (horas - aguenta) / 8);
  p.tempoSozinho = tsNota;
  if(tsNota >= 0.95) pontos.push('A rotina bate: ele lida bem com ' + horas + 'h sozinho');
  else if(tsNota < 0.6) alertas.push('Ele sofre depois de ~' + aguenta + 'h sozinho, e você fica fora ' + horas + 'h');

  /* --- energia x disposição --- */
  var disp = perfil.exercicio === 'alto' ? 5 : (perfil.exercicio === 'medio' ? 3 : 1.5);
  var dif = pet.energia - disp;
  var enNota = dif <= 0 ? 1 : Math.max(0.15, 1 - dif/3.2);
  p.energia = enNota;
  if(enNota >= 0.95 && pet.energia >= 4) pontos.push('Vocês têm o mesmo pique');
  else if(enNota >= 0.95) pontos.push('O ritmo dele combina com o seu');
  else if(enNota < 0.55) alertas.push('Energia alta: sem gasto diário, vira destruição e latido');

  /* --- convivência: crianças e outros animais --- */
  var conv = 1, temCao = perfil.outrosPets === 'cao' || perfil.outrosPets === 'ambos';
  var temGato = perfil.outrosPets === 'gato' || perfil.outrosPets === 'ambos';
  if(perfil.criancas && !pet.sociavelCriancas){ conv -= 0.6; alertas.push('Não é indicado para casa com crianças'); }
  if(temCao && !pet.sociavelCaes){ conv -= 0.45; alertas.push('Não se dá bem com outros cães'); }
  if(temGato && !pet.sociavelGatos){ conv -= 0.45; alertas.push('Não se dá bem com gatos'); }
  conv = Math.max(0.05, conv);
  p.convivencia = conv;
  if(conv === 1 && (perfil.criancas || temCao || temGato)) pontos.push('Convive bem com quem já mora aí');

  /* --- experiência x exigência --- */
  var exige = 1;
  if((pet.necessidades || []).length) exige += 1;
  if(pet.energia >= 5) exige += 0.5;
  if(idade < 0.8) exige += 1;                       // filhote dá trabalho
  if(pet.devolucoes) exige += 0.5;
  var nivel = perfil.experiencia === 'muita' ? 3 : (perfil.experiencia === 'alguma' ? 2 : 1);
  var expNota = nivel >= exige ? 1 : Math.max(0.2, 1 - (exige - nivel)/2.5);
  p.experiencia = expNota;
  if(expNota < 0.6) alertas.push('Exige mais manejo do que a experiência que você marcou');
  else if(expNota === 1 && exige > 1.5) pontos.push('Sua experiência dá conta do que ele precisa');

  /* --- orçamento --- */
  var orc = +perfil.orcamento || 200;
  var custo = pet.custoMensal || 200;
  var orcNota = orc >= custo ? 1 : Math.max(0.1, orc/custo);
  p.orcamento = orcNota;
  if(orcNota === 1) pontos.push('Custo de ' + brl(custo) + '/mês cabe no seu orçamento');
  else alertas.push('Custa cerca de ' + brl(custo) + '/mês — acima do que você informou');

  /* --- preferências declaradas --- */
  var pref = 1;
  if(perfil.especiePref && perfil.especiePref !== 'qualquer' && perfil.especiePref !== pet.especie) pref -= 0.55;
  if(perfil.portePref && perfil.portePref !== 'qualquer' && perfil.portePref !== pet.porte) pref -= 0.2;
  var faixa = idade < 1 ? 'filhote' : (idade >= 7 ? 'idoso' : 'adulto');
  if(perfil.idadePref && perfil.idadePref !== 'qualquer' && perfil.idadePref !== faixa) pref -= 0.2;
  if((pet.necessidades || []).length && perfil.especiais === false) pref -= 0.35;
  pref = Math.max(0.05, pref);
  p.preferencias = pref;

  /* --- nota final --- */
  var total = 0, soma = 0;
  for(var k in PESOS){ total += (p[k] === undefined ? 1 : p[k]) * PESOS[k]; soma += PESOS[k]; }
  var score = Math.round(total / soma * 100);

  /* Impeditivos são coisas que a ONG precisa ver antes de aprovar, não motivo
     para esconder o animal. */
  var impeditivo = (perfil.criancas && !pet.sociavelCriancas) ||
                   (temCao && !pet.sociavelCaes) || (temGato && !pet.sociavelGatos);

  return { score:score, pontos:pontos.slice(0,3), alertas:alertas.slice(0,3),
           impeditivo:impeditivo, detalhe:p };
}

function corDoScore(s){
  if(s === null || s === undefined) return 'var(--tinta-3)';
  if(s >= 85) return 'var(--ok)';
  if(s >= 70) return 'var(--verde)';
  if(s >= 55) return 'var(--alerta)';
  return 'var(--perigo)';
}
function textoDoScore(s){
  if(s === null || s === undefined) return 'faça o teste para ver';
  if(s >= 90) return 'combinação excelente';
  if(s >= 80) return 'combina muito bem';
  if(s >= 70) return 'boa combinação';
  if(s >= 55) return 'dá certo com ajustes';
  return 'exige bastante adaptação';
}

/** Ordena a vitrine para uma pessoa: compatibilidade primeiro, com um empurrão
    para quem espera há mais tempo e para os casos urgentes. Quem ninguém vê
    nunca é adotado — então o tempo de espera precisa valer ponto. */
function ordenarVitrine(pets, perfil){
  var hj = isoHoje();
  return ordenar(pets.map(function(p){
    var c = compatibilidade(perfil, p);
    var espera = Math.min(365, difDias(p.resgatadoEm, hj)) / 365;
    var bonus = espera * 8 + (p.urgente ? 6 : 0) + (p.especial ? 4 : 0);
    return { pet:p, comp:c, ordem:(c.score === null ? 50 : c.score) + bonus };
  }), function(x){ return x.ordem; }, true);
}
