/* =========================================================================
   AuLar — assinatura, cobrança e régua de inadimplência.

   Regra do negócio (configurável em Plataforma → Cobrança):
     vencimento + carência  →  BLOQUEIO   (gestão trava)
     vencimento + 30 dias   →  SUSPENSÃO  (some da vitrine pública)
     vencimento + 90 dias   →  REMOÇÃO    (perfil sai da plataforma)

   Uma decisão de produto importante, e é bom saber que ela é sua para mudar:
   por padrão o bloqueio é "preserva vitrine". A ONG perde o sistema inteiro na
   hora — cadastrar, editar, relatório, exportação, tudo trava — mas as páginas
   dos animais que já estão publicados continuam no ar por 30 dias. O motivo é
   prático, não sentimental: derrubar a vitrine tira do ar animais que estão a
   um clique de sair para adoção, e a conta disso chega em forma de "a
   plataforma sumiu com meus cães" nas redes. A pressão para pagar continua
   inteira, porque sem o sistema a ONG não consegue operar.
   Quem preferir o corte total muda em Plataforma → Cobrança → Modo de bloqueio.
   ========================================================================= */
'use strict';

/* ------------------------------------------------------------------ estado */
function planoDa(ong){ return achar(DB.planos, ong.planoId) || DB.planos[0]; }

/** Dias de atraso da fatura mais antiga em aberto. 0 = em dia. */
function diasAtraso(ong){
  var abertas = filtrar(DB.faturas, function(f){
    return f.ongId === ong.id && !f.pagoEm && f.status !== 'cancelada';
  });
  if(!abertas.length) return 0;
  var maisVelha = ordenar(abertas, function(f){ return f.vence; })[0];
  var d = difDias(maisVelha.vence, isoHoje());
  return d > 0 ? d : 0;
}

/** Recalcula a situação de todas as ONGs. Roda no boot e sempre que a data muda. */
function aplicarRegua(){
  var cfg = DB.plataforma, mudou = false;
  DB.ongs.forEach(function(o){
    if(o.situacao === 'removida') return;
    var plano = planoDa(o);
    var nova;
    if(plano.preco === 0){ nova = 'ativa'; }
    else {
      var d = diasAtraso(o);
      if(d === 0) nova = 'ativa';
      else if(d > cfg.diasRemocao) nova = 'removida';
      else if(d > cfg.diasSuspensao) nova = 'suspensa';
      else if(d > cfg.carenciaBloqueio) nova = 'bloqueada';
      else nova = 'ativa';
    }
    if(nova !== o.situacao){
      o.situacao = nova; mudou = true;
      var texto = {
        ativa:'Assinatura regularizada — acesso liberado',
        bloqueada:'Conta bloqueada por falta de pagamento',
        suspensa:'Conta suspensa — perfil e animais saíram da vitrine',
        removida:'Conta removida após ' + cfg.diasRemocao + ' dias de inadimplência'
      }[nova];
      registrar(o.id, 'cobranca', texto);
      notificar(o.id, nova === 'ativa' ? 'ok' : 'alerta', texto);
    }
    // aviso antes da remoção
    var da = diasAtraso(o);
    if(o.situacao === 'suspensa' && da > (cfg.diasRemocao - cfg.avisoAntesRemocao) && o.avisado !== 'remocao'){
      o.avisado = 'remocao'; mudou = true;
      notificar(o.id, 'alerta', 'Faltam ' + (cfg.diasRemocao - da) + ' dias para o perfil ser removido. ' +
        'Baixe seus dados em Configurações → Meus dados.');
    }
    if(da === 0) o.avisado = null;
  });
  if(mudou) salvar();
}

/* ------------------------------------------------------------------ permissões */
/** A gestão está liberada? */
function podeUsarGestao(ong){
  if(!ong) return false;
  return ong.situacao === 'ativa';
}
/** A vitrine pública desta ONG aparece? */
function vitrineVisivel(ong){
  if(!ong) return false;
  if(ong.situacao === 'ativa') return true;
  if(ong.situacao === 'bloqueada') return DB.plataforma.modoBloqueio === 'preserva';
  return false;               // suspensa ou removida: fora do ar
}
/** Recurso liberado pelo plano? */
function temRecurso(ong, chave){
  if(!ong) return false;
  return planoDa(ong).recursos.indexOf(chave) >= 0;
}
/** Já bateu o limite de pets do plano? */
function limitePets(ong){
  var plano = planoDa(ong);
  var ativos = filtrar(DB.pets, function(p){
    return p.ongId === ong.id && p.status !== 'adotado' && p.status !== 'obito';
  }).length;
  return { usados:ativos, limite:plano.limitePets, cheio: ativos >= plano.limitePets };
}

/* ------------------------------------------------------------------ faturas */
function faturasDa(ongId){
  return ordenar(filtrar(DB.faturas, function(f){ return f.ongId === ongId; }),
                 function(f){ return f.vence; }, true);
}
function faturaAberta(ongId){
  var a = filtrar(DB.faturas, function(f){ return f.ongId === ongId && !f.pagoEm && f.status !== 'cancelada'; });
  return a.length ? ordenar(a, function(f){ return f.vence; })[0] : null;
}
function pagarFatura(fatId, meio){
  var f = achar(DB.faturas, fatId); if(!f || f.pagoEm) return;
  f.pagoEm = isoHoje(); f.status = 'paga'; f.meio = meio || 'pix';
  var ong = achar(DB.ongs, f.ongId);
  if(ong){
    registrar(ong.id, 'cobranca', 'Fatura ' + f.competencia + ' paga — ' + brl(f.valor));
    ong.proximoVencimento = proximoVencimento(ong.diaVenc, maisDias(isoHoje(), 1));
  }
  aplicarRegua();
  salvar();
  aviso('Pagamento confirmado. Acesso liberado na hora. 🎉', 'ok');
}
/** Gera as faturas do mês corrente que ainda não existem. */
function emitirFaturasDoMes(){
  var hj = isoHoje(), comp = hj.slice(0,7), criadas = 0;
  DB.ongs.forEach(function(o){
    if(o.situacao === 'removida') return;
    var plano = planoDa(o);
    if(plano.preco === 0) return;
    var existe = filtrar(DB.faturas, function(f){ return f.ongId === o.id && f.competencia === comp; });
    if(existe.length) return;
    DB.faturas.push({
      id:id('fat'), ongId:o.id, competencia:comp, valor:plano.preco,
      vence: comp + '-' + ('0' + o.diaVenc).slice(-2),
      pagoEm:null, meio:null, status:'aberta'
    });
    criadas++;
  });
  if(criadas){ salvar(); }
  return criadas;
}
function trocarPlano(ongId, planoId){
  var o = achar(DB.ongs, ongId), p = achar(DB.planos, planoId);
  if(!o || !p) return;
  var antigo = planoDa(o);
  o.planoId = planoId;
  registrar(o.id, 'cobranca', 'Plano alterado: ' + antigo.nome + ' → ' + p.nome);
  // cancela fatura aberta do plano antigo e emite a do novo
  filtrar(DB.faturas, function(f){ return f.ongId === o.id && !f.pagoEm; })
    .forEach(function(f){ f.status = 'cancelada'; });
  if(p.preco > 0){
    DB.faturas.push({
      id:id('fat'), ongId:o.id, competencia:isoHoje().slice(0,7), valor:p.preco,
      vence: proximoVencimento(o.diaVenc, isoHoje()), pagoEm:null, meio:null, status:'aberta'
    });
  }
  aplicarRegua(); salvar();
}

/* ------------------------------------------------------------------ métricas */
function mrr(){
  return somar(filtrar(DB.ongs, function(o){ return o.situacao === 'ativa' || o.situacao === 'bloqueada'; }),
    function(o){ return planoDa(o).preco; });
}
function mrrPotencial(){
  return somar(filtrar(DB.ongs, function(o){ return o.situacao !== 'removida'; }),
    function(o){ return planoDa(o).preco; });
}
function inadimplencia(){
  var abertas = filtrar(DB.faturas, function(f){
    return !f.pagoEm && f.status !== 'cancelada' && difDias(f.vence, isoHoje()) > 0;
  });
  return { qtd:abertas.length, valor:somar(abertas, function(f){ return f.valor; }),
           ongs:unicos(abertas.map(function(f){ return f.ongId; })).length };
}
/** Receita da plataforma vinda das taxas sobre doações. */
function receitaTaxas(dias){
  var de = maisDias(isoHoje(), -(dias || 30));
  return somar(filtrar(DB.doacoes, function(d){ return d.data >= de && d.status === 'confirmada'; }),
    function(d){ return d.taxa || 0; });
}
function receitaTotalPlataforma(){
  return mrr() + receitaTaxas(30);
}

/* ------------------------------------------------------------------ notificações */
function notificar(ongId, tipo, texto){
  DB.notificacoes.unshift({
    id:id('nt'), ongId:ongId, tipo:tipo, texto:texto, quando:isoHoje(),
    carimbo:Date.now(), lida:false
  });
  if(DB.notificacoes.length > 200) DB.notificacoes.length = 200;
}
function notificacoesDa(ongId){
  return filtrar(DB.notificacoes, function(n){ return n.ongId === ongId || n.ongId === null; });
}
function naoLidas(ongId){
  return filtrar(notificacoesDa(ongId), function(n){ return !n.lida; }).length;
}

/* ------------------------------------------------------------------ tela de bloqueio */
function telaBloqueada(ong){
  var fat = faturaAberta(ong.id);
  var d = diasAtraso(ong);
  var cfg = DB.plataforma;
  var faltaRemocao = cfg.diasRemocao - d;
  var vitrine = vitrineVisivel(ong);
  return '' +
  '<div class="cx" style="max-width:660px;margin:30px auto;text-align:center;padding:34px">' +
    '<div style="font-size:46px">🔒</div>' +
    '<h2 style="margin:10px 0 6px;font-size:23px">Sua conta está ' +
      (ong.situacao === 'suspensa' ? 'suspensa' : 'bloqueada') + '</h2>' +
    '<p class="c2 s13" style="max-width:440px;margin:0 auto 18px">' +
      'A mensalidade do plano <b>' + esc(planoDa(ong).nome) + '</b> venceu em <b>' +
      (fat ? brData(fat.vence) : '—') + '</b> — ' + d + ' ' + plural(d,'dia','dias') + ' de atraso. ' +
      'Assim que o pagamento for confirmado, tudo volta na hora, com os dados intactos.' +
    '</p>' +
    (vitrine
      ? '<div class="aviso aviso-o" style="text-align:left"><span class="em">🐾</span><div>' +
        '<b>Seus animais continuam na vitrine</b>A página pública de cada animal segue no ar por mais ' +
        (cfg.diasSuspensao - d) + ' dias, para que ninguém perca uma adoção por causa da cobrança. ' +
        'O que travou foi a gestão: cadastrar, editar, relatórios e exportação.</div></div>'
      : '<div class="aviso aviso-p" style="text-align:left"><span class="em">⚠️</span><div>' +
        '<b>Os animais saíram da vitrine</b>Enquanto a conta estiver assim, ninguém encontra ' +
        'seus animais na busca pública.</div></div>') +
    (faltaRemocao <= cfg.avisoAntesRemocao
      ? '<div class="aviso aviso-p" style="text-align:left"><span class="em">⏳</span><div>' +
        '<b>Faltam ' + faltaRemocao + ' dias para a remoção</b>Depois de ' + cfg.diasRemocao +
        ' dias de atraso o perfil sai da plataforma. Baixe seus dados antes.</div></div>' : '') +
    (fat ? '<div class="cx plana" style="background:var(--sup-2);margin:18px 0 6px;text-align:left">' +
      '<div class="entre"><div><div class="rot">Fatura em aberto</div>' +
      '<div class="s13 c2">' + esc(fat.competencia) + ' · venceu ' + brData(fat.vence) + '</div></div>' +
      '<div class="num-grande">' + brl(fat.valor) + '</div></div></div>' : '') +
    '<div class="linha" style="justify-content:center;margin-top:16px">' +
      (fat ? '<button class="b b-p b-g" onclick="pagarFatura(\'' + fat.id + '\',\'pix\');ir(\'ong-painel\')">' +
             '⚡ Pagar com Pix agora</button>' : '') +
      '<button class="b b-f" onclick="exportarDadosOng(\'' + ong.id + '\')">⤓ Baixar meus dados</button>' +
    '</div>' +
    '<p class="s11 c3 mt14">Precisa de prazo? Fale com a gente — a régua é configurável e ' +
      'ninguém quer que animal nenhum pague essa conta.</p>' +
  '</div>';
}

/* ------------------------------------------------------------------ LGPD: portabilidade */
function exportarDadosOng(ongId){
  var o = achar(DB.ongs, ongId); if(!o) return;
  var pacote = {
    exportadoEm: new Date().toISOString(),
    ong:o,
    pets: petsDa(ongId),
    vacinas: filtrar(DB.vacinas, function(v){ return v.ongId === ongId; }),
    adocoes: filtrar(DB.adocoes, function(a){ return a.ongId === ongId; }),
    interesses: filtrar(DB.interesses, function(i){ return i.ongId === ongId; }),
    doacoes: filtrar(DB.doacoes, function(d){ return d.ongId === ongId; }),
    estoque: filtrar(DB.estoque, function(e){ return e.ongId === ongId; }),
    eventos: filtrar(DB.eventos, function(e){ return e.ongId === ongId; }),
    faturas: faturasDa(ongId)
  };
  baixarArquivo('aular-' + slug(o.nome) + '-' + isoHoje() + '.json',
                JSON.stringify(pacote, null, 2), 'application/json');
  aviso('Seus dados foram baixados. São seus — sempre.', 'ok');
}
function baixarArquivo(nome, conteudo, tipo){
  var blob = new Blob(['﻿' + conteudo], {type:(tipo||'text/plain') + ';charset=utf-8'});
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = nome;
  document.body.appendChild(a); a.click();
  setTimeout(function(){ URL.revokeObjectURL(a.href); document.body.removeChild(a); }, 400);
}
function exportarCSV(nome, cabecalho, linhas){
  var txt = cabecalho.join(';') + '\n' +
    linhas.map(function(l){
      return l.map(function(c){
        var s = String(c === null || c === undefined ? '' : c).replace(/"/g,'""');
        return /[;\n"]/.test(s) ? '"' + s + '"' : s;
      }).join(';');
    }).join('\n');
  baixarArquivo(nome, txt, 'text/csv');
}

/* =========================================================================
   Catálogo de fontes de receita.

   base()      = quanto ESTA fonte rendeu de fato, lido dos registros do banco.
   estimativa  = base() existe, mas é uma projeção (ex.: comissão de seguro
                 calculada sobre as adoções do mês), não dinheiro já entrado.
   potencial   = ainda não existe receita nenhuma; é só o tamanho da aposta.
   Os painéis nunca somam estimativa nem potencial na receita realizada.
   As 3 primeiras são as que você já tinha em mente. As outras 12 saíram da
   pesquisa e da conta de quem paga o quê nesse mercado — a explicação de cada
   uma está em PROJETO.md.
   ========================================================================= */
var FONTES_RECEITA = [
  { id:'saas', nome:'Mensalidade das ONGs (SaaS)', emoji:'🏢', grupo:'Assinatura',
    quem:'ONGs e protetores', pedida:true,
    como:'Planos de R$ 0 a R$ 399/mês. O grátis existe de propósito: é ele que enche a vitrine.',
    base:function(){ return mrr(); }, unidade:'mês',
    esforco:'médio', prazo:'já' },

  { id:'taxa_doacao', nome:'Taxa sobre doações processadas', emoji:'💸', grupo:'Transação',
    quem:'Doadores (opcional) ou a ONG', pedida:true,
    como:'De 3% a 5% sobre cada doação. Com a caixinha "quero cobrir a taxa" marcada por padrão, ' +
         'a maioria dos doadores assume o custo e a ONG recebe 100%.',
    base:function(){ return receitaTaxas(30); }, unidade:'mês',
    esforco:'baixo', prazo:'já' },

  { id:'apadrinhamento', nome:'Apadrinhamento recorrente', emoji:'🎗️', grupo:'Recorrência',
    quem:'Pessoas que não podem adotar',
    como:'R$ 20 a R$ 80/mês para bancar UM animal específico, com foto e notícia dele todo mês. ' +
         'Resolve o problema dos animais que nunca serão adotados: idosos, FIV+, com deficiência.',
    base:function(){ return somar(filtrar(DB.doacoes, function(d){
      return d.tipo === 'apadrinhamento' && d.data >= maisDias(isoHoje(),-30); }),
      function(d){ return d.taxa; }); }, unidade:'mês',
    esforco:'baixo', prazo:'já' },

  { id:'presentes', nome:'Lista de presentes (ração e insumos)', emoji:'🎁', grupo:'Marketplace',
    quem:'Doadores + pet shops parceiros',
    como:'Em vez de receber sacos de ração na porta, a ONG publica uma lista tipo chá de bebê. ' +
         'O doador compra no parceiro, a entrega vai direto para a ONG e a plataforma fica com 8%.',
    base:function(){ return somar(DB.presentes, function(p){
      return p.recebidos * p.precoUnit * (DB.plataforma.taxaPresente/100); }); }, unidade:'mês',
    esforco:'médio', prazo:'90 dias' },

  { id:'seguro', nome:'Comissão de plano de saúde pet', emoji:'🩺', grupo:'Parceria',
    quem:'Seguradoras e planos de saúde animal',
    como:'A adoção é o momento de maior intenção de compra da vida de um tutor. Oferecer plano de ' +
         'saúde na assinatura do termo converte muito — comissão de 15% a 30% da primeira anuidade.',
    base:function(){ return adocoesUltimos(30) * 0.22 * 480 * 0.25; }, unidade:'mês',
    estimativa:true, esforco:'médio', prazo:'6 meses' },

  { id:'kit', nome:'Kit adoção', emoji:'📦', grupo:'Marketplace',
    quem:'Adotantes',
    como:'Coleira com plaquinha, primeira ração, vermífugo, guia de adaptação e a carteirinha ' +
         'digital do pet. R$ 90 a R$ 180 — margem dividida com a ONG.',
    base:function(){ return adocoesUltimos(30) * 0.45 * 120 * 0.30; }, unidade:'mês',
    estimativa:true, esforco:'médio', prazo:'90 dias' },

  { id:'vitrine', nome:'Vitrine patrocinada (comércio local)', emoji:'📣', grupo:'Publicidade',
    quem:'Clínicas, pet shops, banho e tosa',
    como:'Selo "Parceiro AuLar" e destaque para quem está no bairro do adotante. ' +
         'R$ 149 a R$ 490/mês por estabelecimento — venda local, ciclo curto.',
    base:function(){ return 0; }, unidade:'mês', potencial:1494,
    esforco:'baixo', prazo:'90 dias' },

  { id:'esg', nome:'Patrocínio corporativo e relatório ESG', emoji:'🏛️', grupo:'B2B',
    quem:'Empresas da região',
    como:'A empresa patrocina X animais/mês e recebe painel de impacto, logo na vitrine e um ' +
         'relatório pronto para o relatório de sustentabilidade. Contratos anuais de R$ 6k a R$ 60k.',
    base:function(){ return somar(DB.patrocinadores, function(p){ return p.valor * 0.15; }); }, unidade:'mês',
    esforco:'alto', prazo:'6 meses' },

  { id:'prefeitura', nome:'Contrato com prefeituras e CCZ', emoji:'🏙️', grupo:'B2G',
    quem:'Poder público',
    como:'O município já faz feira de adoção e castramóvel — e controla isso em planilha. ' +
         'Portal público com a marca da prefeitura, fila de castração e RGA. ' +
         'Um contrato municipal vale de 20 a 100 assinaturas de ONG.',
    base:function(){ return 0; }, unidade:'mês', potencial:8000,
    esforco:'alto', prazo:'12 meses' },

  { id:'clube', nome:'Clube AuLar (assinatura do tutor)', emoji:'⭐', grupo:'Recorrência',
    quem:'Adotantes e tutores em geral',
    como:'R$ 19,90/mês: carteirinha digital do pet, lembrete de vacina, teleorientação veterinária ' +
         'e desconto na rede parceira. Os tutores são 100x mais numerosos que as ONGs — ' +
         'é aqui que o negócio ganha escala de verdade.',
    base:function(){ return 0; }, unidade:'mês', potencial:1990,
    esforco:'alto', prazo:'12 meses' },

  { id:'rifa', nome:'Rifas, vaquinhas e eventos', emoji:'🎟️', grupo:'Transação',
    quem:'Comunidade da ONG',
    como:'Toda ONG faz rifa no WhatsApp e controla em caderno. Ferramenta de rifa e vaquinha ' +
         'com sorteio auditável e prestação de contas: 6% sobre o arrecadado.',
    base:function(){ return 0; }, unidade:'mês', potencial:900,
    esforco:'baixo', prazo:'90 dias' },

  { id:'achados', nome:'Focinho ID — achados e perdidos', emoji:'🔎', grupo:'Parceria',
    quem:'Tutores + marcas patrocinadoras',
    como:'Cadastro do focinho e da foto do animal; quando some, dispara alerta para a região. ' +
         'Gratuito para o tutor, patrocinado por uma marca. Traz para dentro da base ' +
         'gente que ainda não adotou — e um dia adota.',
    base:function(){ return 0; }, unidade:'mês', potencial:1200,
    esforco:'médio', prazo:'12 meses' },

  { id:'academia', nome:'Academia AuLar (cursos e certificação)', emoji:'🎓', grupo:'Conteúdo',
    quem:'Protetores e voluntários',
    como:'Curso de gestão de ONG, captação, triagem de adotante e primeiros socorros. ' +
         'R$ 197 por curso; certificado de "Lar Temporário Certificado" vira selo na plataforma.',
    base:function(){ return 0; }, unidade:'mês', potencial:1500,
    esforco:'médio', prazo:'12 meses' },

  { id:'troco', nome:'Troco solidário no comércio', emoji:'🪙', grupo:'Parceria',
    quem:'Clientes do comércio parceiro',
    como:'Pet shop, padaria, farmácia: "quer arredondar e doar a diferença para a ONG do bairro?". ' +
         'Centavos que viram milhares, e a marca do parceiro no recibo.',
    base:function(){ return 0; }, unidade:'mês', potencial:700,
    esforco:'alto', prazo:'12 meses' },

  { id:'dados', nome:'Inteligência de mercado (dados agregados)', emoji:'📊', grupo:'B2B',
    quem:'Indústria pet',
    como:'Relatório trimestral com números agregados e anonimizados: perfil de adoção por região, ' +
         'sazonalidade de abandono, custo médio por animal. Nunca dado pessoal — só o retrato do setor.',
    base:function(){ return 0; }, unidade:'trimestre', potencial:2500,
    esforco:'alto', prazo:'18 meses' }
];

function adocoesUltimos(dias){
  var de = maisDias(isoHoje(), -dias);
  return filtrar(DB.adocoes, function(a){ return a.data >= de; }).length;
}
