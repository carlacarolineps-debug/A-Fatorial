/* =========================================================================
   P de PATA — Selo de Confiança, Fundo de Impacto e Patrocínio.

   Três instrumentos DIFERENTES, de propósito separados. Misturar os três é o
   jeito mais rápido de destruir a credibilidade que eles existem para criar:

   1. DOAÇÃO PARA UMA ONG  — o doador escolhe. O dinheiro é dele para ela.
      A plataforma cobra taxa de serviço, declarada na tela.

   2. FUNDO DE IMPACTO     — o doador não sabe para quem doar e delega a
      escolha. O valor entra num bolo e é distribuído todo mês entre as ONGs
      certificadas, por uma regra pública. A plataforma retém uma taxa de
      gestão, declarada ANTES da doação, no mesmo tamanho de letra.

   3. PATROCÍNIO / APOIO   — dinheiro para o P de PATA, e só. Empresa que patrocina
      a plataforma ou pessoa que quer manter o sistema no ar. Isso NÃO é doação
      para animal, não é chamado de doação em lugar nenhum, e a tela diz com
      todas as letras para onde vai.

   O que amarra tudo é o SELO: só ONG certificada recebe do Fundo e ganha
   destaque na vitrine. O selo é calculado ao vivo sobre o trabalho de verdade
   (contas publicadas, vacina em dia, pós-adoção feito, devolução baixa) e não
   pode ser comprado. Nem plano pago pesa no selo — de propósito: no dia em que
   pagar mensalidade melhorar o selo, o selo não vale mais nada.
   ========================================================================= */
'use strict';

/* ================================================================ SELO */
var NIVEIS = [
  { chave:'nenhum',    nome:'Em avaliação', min:0,  cor:'var(--tinta-3)',  emoji:'○',
    o_que:'Ainda não atingiu os critérios mínimos. Não recebe do Fundo.' },
  { chave:'verificada',nome:'Verificada',   min:40, cor:'var(--info)',     emoji:'🔹',
    o_que:'Cadastro consistente e trabalho comprovável. Já recebe do Fundo.' },
  { chave:'confianca', nome:'Confiança',    min:60, cor:'var(--verde)',    emoji:'🛡️',
    o_que:'Presta contas, mantém saúde em dia e acompanha o pós-adoção.' },
  { chave:'referencia',nome:'Referência',   min:80, cor:'var(--caramelo)', emoji:'⭐',
    o_que:'Padrão de excelência. Destaque na vitrine e maior cota do Fundo.' }
];

/* Cada critério devolve 0..1. Todos saem de dado que já existe no sistema —
   nada é auto-declarado, nada depende de plano pago. */
var CRITERIOS = [
  { chave:'contas', nome:'Presta contas em público', peso:15,
    dica:'Ative a prestação de contas em Configurações. É o critério que mais pesa e o mais fácil de cumprir.',
    calc:function(o){ return o.transparencia ? 1 : 0; } },

  { chave:'vacinas', nome:'Saúde dos animais em dia', peso:15,
    dica:'Confirme as vacinas e vermífugos em atraso na tela de Saúde.',
    calc:function(o){
      var ativos = filtrar(petsDa(o.id), function(p){ return p.status !== 'adotado' && p.status !== 'obito'; });
      if(!ativos.length) return 1;
      return filtrar(ativos, function(p){ return saudePet(p.id).emDia; }).length / ativos.length;
    } },

  { chave:'posadocao', nome:'Acompanha depois da adoção', peso:15,
    dica:'Registre os contatos de 7, 30, 90 e 180 dias na aba Pós-adoção.',
    calc:function(o){
      var previstos = 0, feitos = 0;
      filtrar(DB.adocoes, function(a){ return a.ongId === o.id; }).forEach(function(a){
        (a.acompanhamentos || []).forEach(function(ac){
          if(difDias(ac.previsto, isoHoje()) >= 0){ previstos++; if(ac.feito) feitos++; }
        });
      });
      return previstos ? feitos / previstos : 1;
    } },

  { chave:'devolucao', nome:'Poucas devoluções', peso:12,
    dica:'Triagem com calma e match honesto derrubam a devolução. Use o teste de compatibilidade antes da entrevista.',
    calc:function(o){
      var ados = filtrar(DB.adocoes, function(a){ return a.ongId === o.id; });
      if(ados.length < 3) return 1;                       // amostra pequena demais para julgar
      var taxa = filtrar(ados, function(a){ return a.devolvido; }).length / ados.length;
      return limite(1 - taxa * 6, 0, 1);                  // 16,7% de devolução zera o critério
    } },

  { chave:'resposta', nome:'Responde quem demonstra interesse', peso:12,
    dica:'Interesse parado esfria. Mova os cartões do funil em até 2 dias.',
    calc:function(o){
      var abertos = filtrar(DB.interesses, function(i){
        return i.ongId === o.id && i.etapa !== 'entregue' && i.etapa !== 'recusado'; });
      if(!abertos.length) return 1;
      var parados = filtrar(abertos, function(i){ return difDias(i.atualizadoEm, isoHoje()) > 3; }).length;
      return 1 - (parados / abertos.length);
    } },

  { chave:'cadastro', nome:'Perfis completos e com história', peso:11,
    dica:'Foto boa, história de verdade e personalidade preenchida. É o que faz alguém parar no perfil.',
    calc:function(o){
      var ativos = filtrar(petsDa(o.id), function(p){ return p.status !== 'adotado' && p.status !== 'obito'; });
      if(!ativos.length) return 1;
      return filtrar(ativos, function(p){
        return (p.historia || '').length >= 80 && (p.fotos || []).length > 0 &&
               (p.personalidade || []).length >= 2;
      }).length / ativos.length;
    } },

  { chave:'castracao', nome:'Animais adultos castrados', peso:10,
    dica:'Castração é o único controle populacional que funciona. Use os mutirões gratuitos da agenda.',
    calc:function(o){
      var adultos = filtrar(petsDa(o.id), function(p){
        return p.status !== 'adotado' && p.status !== 'obito' && idadeAnos(p.nascimento) >= 0.7; });
      if(!adultos.length) return 1;
      return filtrar(adultos, function(p){ return p.castrado; }).length / adultos.length;
    } },

  { chave:'identificacao', nome:'Microchip e RGA', peso:5,
    dica:'Microchip é o que traz o animal de volta quando foge — e o que impede adoção para revenda.',
    calc:function(o){
      var ativos = filtrar(petsDa(o.id), function(p){ return p.status !== 'adotado' && p.status !== 'obito'; });
      if(!ativos.length) return 1;
      return filtrar(ativos, function(p){ return p.microchip; }).length / ativos.length;
    } },

  { chave:'tempo', nome:'Tempo de estrada na plataforma', peso:5,
    dica:'Este cresce sozinho. Doze meses de uso contínua valem o critério inteiro.',
    calc:function(o){ return limite(difDias(o.criadaEm, isoHoje()) / 365, 0, 1); } }
];

/** Nota viva de 0 a 100 e o nível do selo. Nunca é salvo: é sempre recalculado
    dos dados, então não dá para maquiar. */
function calcularSelo(ong){
  var detalhe = CRITERIOS.map(function(c){
    var v = limite(c.calc(ong), 0, 1);
    return { chave:c.chave, nome:c.nome, peso:c.peso, valor:v,
             pontos: Math.round(v * c.peso), dica:c.dica };
  });
  var score = Math.round(somar(detalhe, function(d){ return d.valor * d.peso; }));
  var nivel = NIVEIS[0];
  NIVEIS.forEach(function(n){ if(score >= n.min) nivel = n; });
  return { score:score, nivel:nivel, detalhe:ordenar(detalhe, function(d){ return d.peso - d.pontos; }, true) };
}
function certificada(ong){ return calcularSelo(ong).score >= 40; }
function seloEtiqueta(ong){
  var s = calcularSelo(ong);
  if(s.nivel.chave === 'nenhum') return '';
  return '<span class="et" style="background:' + s.nivel.cor + '1f;color:' + s.nivel.cor + '">' +
         s.nivel.emoji + ' ' + s.nivel.nome + '</span>';
}

/* ================================================================ FUNDO */
function fundo(){
  if(!DB.fundo){
    DB.fundo = { ativo:true, taxaGestao:12, saldo:0, diaDistribuicao:10, rodadas:[] };
  }
  return DB.fundo;
}
/** Saldo a distribuir: o que entrou DEPOIS da última rodada.
    Cada rodada zera o caixa do Fundo, então o saldo é sempre o acumulado desde
    o último fechamento — e não o total histórico menos o total repassado. */
function saldoFundo(){
  var rodadas = fundo().rodadas;
  var desde = rodadas.length ? ordenar(rodadas, function(r){ return r.data; }, true)[0].data : null;
  return somar(filtrar(DB.doacoes, function(d){
    return d.destino === 'fundo' && d.status === 'confirmada' && (!desde || d.data > desde);
  }), function(d){ return d.valor; });
}
/** Quem tem direito à cota deste mês, e quanto cada uma leva.
    60% pela necessidade (animais sob cuidado) e 40% pelo mérito (selo).
    A regra é esta, está escrita na tela pública e não muda por conveniência. */
function cotasFundo(valorBruto){
  var f = fundo();
  var taxa = Math.round(valorBruto * f.taxaGestao) / 100;
  var liquido = valorBruto - taxa;

  var elegiveis = filtrar(DB.ongs, function(o){
    return o.situacao !== 'removida' && o.situacao !== 'suspensa' && certificada(o);
  }).map(function(o){
    var s = calcularSelo(o);
    var animais = filtrar(petsDa(o.id), function(p){
      return p.status !== 'adotado' && p.status !== 'obito'; }).length;
    return { ong:o, score:s.score, nivel:s.nivel, animais:animais };
  });

  var totalAnimais = somar(elegiveis, function(e){ return e.animais; }) || 1;
  var totalScore = somar(elegiveis, function(e){ return e.score; }) || 1;

  elegiveis.forEach(function(e){
    e.porNecessidade = liquido * 0.60 * (e.animais / totalAnimais);
    e.porMerito      = liquido * 0.40 * (e.score / totalScore);
    e.valor = Math.round((e.porNecessidade + e.porMerito) * 100) / 100;
  });

  return { bruto:valorBruto, taxa:taxa, liquido:liquido,
           cotas:ordenar(elegiveis, function(e){ return e.valor; }, true) };
}
/** Fecha a rodada: credita cada ONG e guarda o extrato público. */
function distribuirFundo(){
  var bruto = saldoFundo();
  if(bruto <= 0){ aviso('Não há saldo no Fundo para distribuir.', 'err'); return; }
  var r = cotasFundo(bruto);
  if(!r.cotas.length){ aviso('Nenhuma ONG certificada no momento — nada a distribuir.', 'err'); return; }

  var rodada = {
    id:id('rod'), data:isoHoje(), bruto:r.bruto, taxa:r.taxa, liquido:r.liquido,
    cotas:r.cotas.map(function(c){
      return { ongId:c.ong.id, ongNome:c.ong.nome, valor:c.valor,
               score:c.score, nivel:c.nivel.nome, animais:c.animais };
    })
  };
  fundo().rodadas.unshift(rodada);

  // cada cota vira uma doação registrada na ONG, marcada como vinda do Fundo
  r.cotas.forEach(function(c){
    DB.doacoes.unshift({
      id:id('doa'), ongId:c.ong.id, pessoaId:null, pessoaNome:'Fundo de Impacto P de PATA',
      tipo:'fundo', meio:'repasse', valor:c.valor, data:isoHoje(), status:'confirmada',
      petId:null, taxa:0, coberta:true, destino:'ong'
    });
    registrar(c.ong.id, 'doacao', 'Repasse do Fundo de Impacto — ' + brl(c.valor) +
      ' (selo ' + c.nivel.nome + ')');
    notificar(c.ong.id, 'doacao', '🏅 Você recebeu ' + brl(c.valor) + ' do Fundo de Impacto P de PATA.');
  });
  salvar();
  aviso('Rodada fechada: ' + brl(r.liquido) + ' distribuídos entre ' + r.cotas.length + ' ONGs. 🏅', 'ok');
}

/* ================================================================ PATROCÍNIO DA PLATAFORMA */
var COTAS_PATROCINIO = [
  { chave:'apoiador', nome:'Apoiador', preco:490, cor:'var(--info)',
    entrega:['Selo "Apoiador P de PATA" no rodapé da vitrine',
             'Relatório de impacto trimestral com os números da rede',
             'Menção nas publicações de balanço'] },
  { chave:'parceiro', nome:'Parceiro', preco:1900, cor:'var(--verde)', destaque:true,
    entrega:['Tudo do Apoiador',
             'Logo na página do Fundo de Impacto e nos cartazes das feiras',
             'Relatório ESG pronto para o balanço da empresa',
             'Duas ações presenciais por ano (feira ou mutirão com a marca)'] },
  { chave:'mantenedor', nome:'Mantenedor', preco:6500, cor:'var(--caramelo)',
    entrega:['Tudo do Parceiro',
             'Marca no topo da vitrine e no e-mail de cada adoção concluída',
             'Uma praça inteira adotada pela empresa (ex.: "Fundo Mauá, patrocinado por…")',
             'Relatório mensal e reunião trimestral de resultados'] }
];
function patrocinios(){ if(!DB.patrociniosPlataforma) DB.patrociniosPlataforma = []; return DB.patrociniosPlataforma; }
function mrrPatrocinio(){
  return somar(filtrar(patrocinios(), function(p){ return p.ativo; }), function(p){ return p.valor; });
}
function apoioMensal(){
  var de = maisDias(isoHoje(), -30);
  return somar(filtrar(DB.doacoes, function(d){
    return d.destino === 'plataforma' && d.data >= de && d.status === 'confirmada'; }),
    function(d){ return d.valor; });
}
function receitaFundo(dias){
  var de = maisDias(isoHoje(), -(dias || 30));
  return somar(filtrar(fundo().rodadas, function(r){ return r.data >= de; }), function(r){ return r.taxa; });
}

/* ================================================================ TELA PÚBLICA DO FUNDO */
registrarTela('fundo', {
  titulo:'Fundo de Impacto',
  sub:'para quem quer ajudar mas não sabe escolher',
  render:function(){
    var f = fundo();
    var saldo = saldoFundo();
    var previa = saldo > 0 ? cotasFundo(saldo) : null;
    var ultima = f.rodadas[0];
    var certificadas = filtrar(DB.ongs, function(o){
      return o.situacao !== 'removida' && certificada(o); });

    return '' +
    '<div class="cx" style="background:linear-gradient(120deg,var(--caramelo-clr),var(--sup));' +
      'border-color:var(--caramelo)">' +
      '<div class="linha" style="flex-wrap:nowrap;align-items:flex-start">' +
      '<div style="font-size:36px">🏅</div><div>' +
      '<h3 style="font-size:19px">Você ajuda. A gente escolhe quem está fazendo direito.</h3>' +
      '<p class="s13 c2 mb0">Nem sempre dá para saber qual ONG é séria. O Fundo resolve isso: ' +
      'você doa uma vez e o valor é dividido todo mês entre as organizações que provaram trabalho — ' +
      'prestação de contas publicada, vacina em dia, pós-adoção acompanhado e devolução baixa. ' +
      'A conta de quem recebeu o quê fica aberta nesta página.</p></div></div>' +
    '</div>' +

    '<div class="g g4">' +
      kpiCard('No Fundo agora', brl(saldo), '💰', 'r') +
      kpiCard('ONGs certificadas', certificadas.length, '🛡️', 'v') +
      kpiCard('Já distribuído', brl(somar(f.rodadas, function(r){ return r.liquido; })), '🤝', '') +
      kpiCard('Taxa de gestão', pct(f.taxaGestao), '⚙️', 'a') +
    '</div>' +

    '<div class="cx"><div class="cx-h"><div><h3>Como o dinheiro é dividido</h3>' +
      '<div class="desc">a regra é esta, está no ar e não muda caso a caso</div></div></div>' +
      '<div class="g g3">' +
        regraFundo('60%', 'pela necessidade', 'Proporcional ao número de animais que a ONG tem sob cuidado hoje. ' +
          'Quem cuida de mais bicho recebe mais.') +
        regraFundo('40%', 'pelo mérito', 'Proporcional à nota do Selo de Confiança. Quem trabalha melhor recebe mais.') +
        regraFundo(pct(f.taxaGestao), 'de gestão', 'Fica com o P de PATA para operar o Fundo: auditar as ONGs, ' +
          'processar os repasses e manter a plataforma no ar. O P de PATA é uma empresa, e isso está dito aqui.') +
      '</div>' +
      '<div class="aviso aviso-i mt14 mb0"><span class="em">🔒</span><div>' +
        '<b>Quem não é certificada não recebe</b>Nota abaixo de 40 no Selo fica de fora da divisão até melhorar. ' +
        'E pagar mensalidade não conta ponto nenhum no Selo — de propósito: no dia em que dinheiro ' +
        'melhorar a nota, a nota deixa de valer.</div></div>' +
    '</div>' +

    (previa && previa.cotas.length ? '<div class="cx"><div class="cx-h"><div>' +
      '<h3>Se a rodada fechasse hoje</h3><div class="desc">prévia com o saldo atual de ' + brl(saldo) + '</div></div></div>' +
      tabelaCotas(previa.cotas) + '</div>' : '') +

    (ultima ? '<div class="cx"><div class="cx-h"><div><h3>Última distribuição</h3>' +
      '<div class="desc">' + brData(ultima.data) + ' · ' + brl(ultima.liquido) + ' repassados</div></div></div>' +
      tabelaCotas(ultima.cotas.map(function(c){
        return { ong:{ id:c.ongId, nome:c.ongNome }, valor:c.valor, score:c.score,
                 nivel:{ nome:c.nivel }, animais:c.animais }; })) + '</div>' : '') +

    '<div class="cx"><div class="cx-h"><div><h3>O Selo de Confiança</h3>' +
      '<div class="desc">calculado sozinho, sobre o trabalho — não se compra</div></div></div>' +
      '<div class="g g4">' + NIVEIS.map(function(nv){
        var q = filtrar(DB.ongs, function(o){
          return o.situacao !== 'removida' && calcularSelo(o).nivel.chave === nv.chave; }).length;
        return '<div class="cx plana" style="background:var(--sup-2);margin:0;border-top:3px solid ' + nv.cor + '">' +
          '<div style="font-size:22px">' + nv.emoji + '</div>' +
          '<div class="neg s13">' + nv.nome + '</div>' +
          '<div class="s11 c3">nota a partir de ' + nv.min + '</div>' +
          '<div class="s12 c2 mt8">' + nv.o_que + '</div>' +
          '<div class="et mt8">' + q + ' ONG' + (q === 1 ? '' : 's') + '</div></div>';
      }).join('') + '</div></div>' +

    '<div class="cx" style="text-align:center">' +
      '<h3 style="font-size:17px">Quer ajudar sem precisar escolher?</h3>' +
      '<p class="s13 c2" style="max-width:520px;margin:6px auto 14px">' +
        'Você também pode continuar doando direto para uma ONG específica — isso nunca sai do ar. ' +
        'O Fundo é para quando você quer ajudar e prefere que a escolha seja feita por critério.</p>' +
      '<div class="linha" style="justify-content:center">' +
        '<button class="b b-p b-g" onclick="abrirDoacao(null,null,\'fundo\')">🏅 Doar para o Fundo</button>' +
        '<button class="b b-f" onclick="ir(\'doar\')">Escolher uma ONG</button>' +
      '</div></div>';
  }
});
function regraFundo(n_, titulo, texto){
  return '<div class="cx plana" style="background:var(--sup-2);margin:0">' +
    '<div class="num-grande ca" style="font-size:28px">' + n_ + '</div>' +
    '<div class="neg s13">' + titulo + '</div>' +
    '<div class="s12 c2 mt8">' + texto + '</div></div>';
}
function tabelaCotas(cotas){
  return '<div class="rolar-x"><table class="tb"><thead><tr><th>ONG</th><th>Selo</th>' +
    '<th class="num">Nota</th><th class="num">Animais</th><th class="num">Cota</th></tr></thead><tbody>' +
    cotas.map(function(c){
      return '<tr><td><b class="s13">' + esc(c.ong.nome) + '</b></td>' +
        '<td class="s12 c2">' + esc(c.nivel.nome) + '</td>' +
        '<td class="num">' + c.score + '</td>' +
        '<td class="num s12 c2">' + c.animais + '</td>' +
        '<td class="num neg">' + brl(c.valor) + '</td></tr>';
    }).join('') + '</tbody></table></div>';
}

/* ================================================================ APOIAR A PLATAFORMA */
registrarTela('apoiar', {
  titulo:'Apoiar o P de PATA',
  sub:'quem mantém isso de pé também precisa se manter',
  render:function(){
    var p = patrocinios();
    return '' +
    '<div class="aviso aviso-a"><span class="em">📣</span><div>' +
      '<b>Leia antes: este dinheiro não vai para os animais</b>' +
      'O P de PATA é uma empresa, não uma ONG. O que entra por esta página mantém o sistema no ar, ' +
      'paga o desenvolvimento e a auditoria das organizações. Se a sua intenção é ajudar animal, ' +
      'use <a href="#" onclick="ir(\'doar\');return false">Doar</a> ou o ' +
      '<a href="#" onclick="ir(\'fundo\');return false">Fundo de Impacto</a> — ali o valor vai para as ONGs.' +
    '</div></div>' +

    '<div class="cx"><div class="linha" style="flex-wrap:nowrap;align-items:flex-start">' +
      '<div style="font-size:34px">🧰</div><div>' +
      '<h3 style="font-size:17px">Por que uma plataforma paga é melhor para os animais</h3>' +
      '<p class="s13 c2 mb0">Ferramenta gratuita que ninguém sustenta fecha, e quando fecha leva junto ' +
      'o cadastro de centenas de animais. O P de PATA cobra de quem pode pagar justamente para poder ' +
      'ser gratuita para o protetor que não pode. Cada real aqui é um mês a mais de plano grátis ' +
      'para uma ONG pequena.</p></div></div></div>' +

    '<div class="cx"><div class="cx-h"><div><h3>Sou empresa e quero patrocinar</h3>' +
      '<div class="desc">contrato de patrocínio, com nota fiscal e contrapartida de marca</div></div></div>' +
      '<div class="g g3">' + COTAS_PATROCINIO.map(function(c){
        return '<div class="plano ' + (c.destaque ? 'dest' : '') + '">' +
          (c.destaque ? '<div class="fita">mais contratado</div>' : '') +
          '<h4>' + c.nome + '</h4>' +
          '<div class="pr">' + brl(c.preco).replace(',00','') + '<small>/mês</small></div>' +
          '<ul>' + c.entrega.map(function(e){ return '<li>' + e + '</li>'; }).join('') + '</ul>' +
          '<button class="b b-p b-bloco" onclick="quenoPatrocinio(\'' + c.chave + '\')">Quero conversar</button>' +
        '</div>';
      }).join('') + '</div>' +
      '<div class="aviso aviso-i mt14 mb0"><span class="em">📄</span><div>' +
        '<b>Patrocínio é contrato, não doação</b>A empresa recebe nota fiscal de serviço de ' +
        'publicidade e um relatório de impacto pronto para o balanço de sustentabilidade. ' +
        'É despesa de marketing, não filantropia — e é por isso que fecha mais rápido.</div></div>' +
    '</div>' +

    '<div class="cx"><div class="cx-h"><div><h3>Sou pessoa física e quero ajudar a plataforma</h3>' +
      '<div class="desc">a partir de R$ 9,90 por mês</div></div></div>' +
      '<p class="s13 c2">Sem contrapartida de marca, sem promessa de nada: é apoio a quem construiu ' +
      'e mantém a ferramenta. Você aparece na página de apoiadores se quiser.</p>' +
      '<div class="linha">' + [10, 25, 50, 100].map(function(v){
        return '<button class="b b-f" onclick="abrirDoacao(null,null,\'plataforma\',' + v + ')">' +
          brl(v).replace(',00','') + '/mês</button>'; }).join('') +
        '<button class="b b-p" onclick="abrirDoacao(null,null,\'plataforma\')">Outro valor</button>' +
      '</div>' +
    '</div>' +

    (p.length ? '<div class="cx"><div class="cx-h"><div><h3>Quem já apoia</h3>' +
      '<div class="desc">obrigada — de verdade</div></div></div>' +
      '<div class="linha">' + filtrar(p, function(x){ return x.ativo; }).map(function(x){
        var c = null; COTAS_PATROCINIO.forEach(function(k){ if(k.chave === x.plano) c = k; });
        return '<div class="selo on" style="border-color:' + (c ? c.cor : 'var(--linha)') + '">' +
          '<span class="e">🏢</span><div><b>' + esc(x.empresa) + '</b>' +
          '<div class="s11 c3">' + (c ? c.nome : '') + ' desde ' + brData(x.desde).slice(3) + '</div></div></div>';
      }).join('') + '</div></div>' : '');
  }
});
function quenoPatrocinio(chave){
  var c = null; COTAS_PATROCINIO.forEach(function(k){ if(k.chave === chave) c = k; });
  var txt = 'Olá! Tenho interesse na cota ' + c.nome + ' de patrocínio do P de PATA (' +
    brl(c.preco) + '/mês).\n\nMinha empresa: \nContato: ';
  modal('Patrocínio ' + c.nome,
    '<div class="cx plana" style="background:var(--sup-2);margin:0 0 14px">' +
      '<div class="entre"><b>' + c.nome + '</b><span class="num-grande" style="font-size:22px">' +
      brl(c.preco) + '</span></div>' +
      '<ul class="s13 c2 mt8" style="padding-left:18px;margin:0">' +
      c.entrega.map(function(e){ return '<li>' + e + '</li>'; }).join('') + '</ul></div>' +
    '<div class="f"><label>Mensagem</label><textarea class="i" id="pt-msg" style="min-height:120px">' +
      esc(txt) + '</textarea></div>',
    '<button class="b b-f" onclick="fecharModal()">Fechar</button>' +
    '<button class="b b-p" onclick="abrirZap(\'' + (DB.ongs[0] ? DB.ongs[0].telefone : '11999999999') +
      '\',document.getElementById(\'pt-msg\').value);fecharModal()">💬 Enviar no WhatsApp</button>');
}

/* ================================================================ MEU SELO (ONG) */
registrarTela('ong-selo', {
  titulo:'Meu selo', sub:'o que a rede enxerga do seu trabalho',
  precisaAtiva:true,
  render:function(){
    var o = ongAtual();
    var s = calcularSelo(o);
    var proximo = null;
    NIVEIS.forEach(function(n){ if(n.min > s.score && !proximo) proximo = n; });
    var recebido = somar(filtrar(fundo().rodadas, function(r){ return true; }), function(r){
      return somar(filtrar(r.cotas, function(c){ return c.ongId === o.id; }), function(c){ return c.valor; });
    });
    var previa = saldoFundo() > 0 ? cotasFundo(saldoFundo()) : null;
    var minhaCota = previa ? filtrar(previa.cotas, function(c){ return c.ong.id === o.id; })[0] : null;

    return '' +
    '<div class="cx" style="border-color:' + s.nivel.cor + '">' +
      '<div class="linha" style="flex-wrap:nowrap;align-items:center">' +
        anel(s.score, 100, s.nivel.cor, 96) +
        '<div style="flex:1;min-width:0">' +
          '<div class="rot">Selo de Confiança</div>' +
          '<h2 style="font-size:24px">' + s.nivel.emoji + ' ' + s.nivel.nome + '</h2>' +
          '<div class="s13 c2">' + s.nivel.o_que + '</div>' +
          (proximo ? '<div class="s12 mt8">Faltam <b>' + (proximo.min - s.score) +
            ' pontos</b> para <b>' + proximo.nome + '</b>.</div>' : '') +
        '</div>' +
      '</div>' +
      (proximo ? '<div class="barra mt14"><i style="width:' + (s.score / proximo.min * 100) + '%"></i></div>' : '') +
    '</div>' +

    '<div class="g g3">' +
      kpiCard('Já recebido do Fundo', brl(recebido), '🏅', 'v') +
      kpiCard('Cota estimada da próxima rodada', minhaCota ? brl(minhaCota.valor) : brl(0), '📊', 'r') +
      kpiCard('Destaque na vitrine', s.score >= 80 ? 'sim' : 'a partir de 80', '⭐', s.score >= 80 ? 'v' : '') +
    '</div>' +

    (s.score < 40 ? '<div class="aviso aviso-a"><span class="em">🔒</span><div>' +
      '<b>Você ainda não recebe do Fundo de Impacto</b>É preciso chegar a 40 pontos. ' +
      'Os dois primeiros itens da lista abaixo costumam resolver isso sozinhos.</div></div>' : '') +

    '<div class="cx"><div class="cx-h"><div><h3>O que está pesando</h3>' +
      '<div class="desc">ordenado pelo que mais rende ponto se você resolver</div></div></div>' +
      s.detalhe.map(function(d){
        var falta = d.peso - d.pontos;
        return '<div class="mb14">' +
          '<div class="entre"><span class="s13 neg">' + d.nome + '</span>' +
          '<span class="mono s12 ' + (falta === 0 ? 'ok' : (falta > d.peso/2 ? 'pe' : 'al')) + '">' +
            d.pontos + ' / ' + d.peso + '</span></div>' +
          '<div class="barra mt8 ' + (falta === 0 ? 'v' : (falta > d.peso/2 ? 'p' : 'a')) + '" style="height:6px">' +
            '<i style="width:' + (d.valor * 100) + '%"></i></div>' +
          (falta > 0 ? '<div class="s11 c3 mt8">💡 ' + d.dica + '</div>' : '') +
        '</div>';
      }).join('') +
    '</div>' +

    '<div class="aviso aviso-i mb0"><span class="em">🧭</span><div>' +
      '<b>Nada aqui depende de quanto você paga</b>O plano contratado não vale um ponto sequer no Selo. ' +
      'Uma ONG do plano gratuito pode ter nota maior que uma do plano mais caro — e recebe mais do ' +
      'Fundo por causa disso.</div></div>';
  }
});

/* ================================================================ FUNDO (PLATAFORMA) */
registrarTela('pl-fundo', {
  titulo:'Fundo de Impacto', sub:'o instrumento que cria credibilidade',
  render:function(){
    var f = fundo();
    var saldo = saldoFundo();
    var previa = saldo > 0 ? cotasFundo(saldo) : null;
    var arrecadado = somar(filtrar(DB.doacoes, function(d){
      return d.destino === 'fundo' && d.status === 'confirmada'; }), function(d){ return d.valor; });
    var certificadas = filtrar(DB.ongs, function(o){ return o.situacao !== 'removida' && certificada(o); });

    return '' +
    '<div class="cx" style="background:linear-gradient(120deg,var(--caramelo-clr),var(--sup));border-color:var(--caramelo)">' +
      '<div class="linha" style="flex-wrap:nowrap;align-items:flex-start"><div style="font-size:30px">🏅</div><div>' +
      '<h3 style="font-size:15px;margin-bottom:6px">Por que o Fundo vale mais que a taxa que ele rende</h3>' +
      '<p class="s13 mb0" style="line-height:1.65">A taxa de gestão de <b>' + pct(f.taxaGestao) + '</b> é a menor ' +
      'parte. O que o Fundo realmente compra é <b>autoridade</b>: quem decide quais ONGs são sérias vira ' +
      'referência do setor — é com quem a prefeitura fala, é quem a marca procura para patrocinar e é o ' +
      'que faz uma ONG querer estar aqui mesmo sem precisar do software. O Selo é o ativo; a taxa é o troco.</p>' +
      '</div></div></div>' +

    '<div class="g g4">' +
      kpiCard('Saldo a distribuir', brl(saldo), '💰', 'r') +
      kpiCard('Arrecadado no total', brl(arrecadado), '📥', '') +
      kpiCard('Taxa de gestão (30d)', brl(receitaFundo(30)), '⚙️', 'v') +
      kpiCard('ONGs certificadas', certificadas.length + ' de ' + DB.ongs.length, '🛡️', 'u') +
    '</div>' +

    '<div class="cx"><div class="cx-h"><div><h3>Fechar rodada</h3>' +
      '<div class="desc">na prática vira um processo mensal automático no dia ' + f.diaDistribuicao + '</div></div>' +
      '<div class="dir"><button class="b b-p" onclick="confirmarDistribuicao()" ' +
        (saldo <= 0 ? 'disabled' : '') + '>🏅 Distribuir ' + brl(saldo) + '</button></div></div>' +
      (previa && previa.cotas.length
        ? '<div class="g g3 mb14">' +
            blocoInfo('Bruto', brl(previa.bruto)) +
            blocoInfo('Taxa de gestão (' + pct(f.taxaGestao) + ')', brl(previa.taxa)) +
            blocoInfo('Vai para as ONGs', brl(previa.liquido)) +
          '</div>' + tabelaCotas(previa.cotas)
        : '<div class="vazio s13">Sem saldo para distribuir agora. Doações para o Fundo aparecem aqui.</div>') +
    '</div>' +

    '<div class="cx"><div class="cx-h"><h3>Regras do Fundo</h3></div>' +
      '<div class="g g3">' +
        '<div class="f"><label>Taxa de gestão (%)</label>' +
          '<input class="i" type="number" step="0.5" id="fu-taxa" value="' + f.taxaGestao + '">' +
          '<div class="aj">Fundos filantrópicos praticam de 8% a 20%. Acima disso, a conta fica difícil de defender.</div></div>' +
        '<div class="f"><label>Dia da distribuição</label>' +
          '<input class="i" type="number" min="1" max="28" id="fu-dia" value="' + f.diaDistribuicao + '"></div>' +
        '<div class="f"><label>Nota mínima para receber</label>' +
          '<input class="i" value="40 (nível Verificada)" disabled>' +
          '<div class="aj">Fixa de propósito: mexer no piso caso a caso destrói a confiança na regra.</div></div>' +
      '</div>' +
      '<button class="b b-p mt14" onclick="salvarFundo()">Salvar</button></div>' +

    (f.rodadas.length ? '<div class="cx"><div class="cx-h"><div><h3>Rodadas anteriores</h3>' +
      '<div class="desc">' + f.rodadas.length + ' distribuições</div></div>' +
      '<div class="dir"><button class="b b-f b-s" onclick="exportarFundo()">⤓ CSV</button></div></div>' +
      '<div class="rolar-x"><table class="tb"><thead><tr><th>Data</th><th class="num">Bruto</th>' +
      '<th class="num">Taxa</th><th class="num">Repassado</th><th class="num">ONGs</th></tr></thead><tbody>' +
      f.rodadas.map(function(r){
        return '<tr><td class="s13">' + brData(r.data) + '</td>' +
          '<td class="num">' + brl(r.bruto) + '</td>' +
          '<td class="num ok">' + brl(r.taxa) + '</td>' +
          '<td class="num">' + brl(r.liquido) + '</td>' +
          '<td class="num s12">' + r.cotas.length + '</td></tr>';
      }).join('') + '</tbody></table></div></div>' : '') +

    '<div class="cx"><div class="cx-h"><div><h3>Selo por ONG</h3>' +
      '<div class="desc">nota viva, recalculada dos dados</div></div></div>' +
      '<div class="rolar-x"><table class="tb"><thead><tr><th>ONG</th><th>Selo</th><th class="num">Nota</th>' +
      '<th class="num">Animais</th><th>Recebe do Fundo</th></tr></thead><tbody>' +
      ordenar(DB.ongs, function(o){ return calcularSelo(o).score; }, true).map(function(o){
        var s = calcularSelo(o);
        var animais = filtrar(petsDa(o.id), function(p){
          return p.status !== 'adotado' && p.status !== 'obito'; }).length;
        return '<tr><td><b class="s13">' + esc(o.nome) + '</b>' +
          '<div class="s11 c3">' + esc(o.cidade) + ' · plano ' + planoDa(o).nome + '</div></td>' +
          '<td><span class="et" style="background:' + s.nivel.cor + '1f;color:' + s.nivel.cor + '">' +
            s.nivel.emoji + ' ' + s.nivel.nome + '</span></td>' +
          '<td class="num neg">' + s.score + '</td>' +
          '<td class="num s12 c2">' + animais + '</td>' +
          '<td>' + (s.score >= 40 && o.situacao !== 'suspensa' && o.situacao !== 'removida'
            ? '<span class="et et-ok">sim</span>' : '<span class="et">não</span>') + '</td></tr>';
      }).join('') + '</tbody></table></div></div>';
  }
});
function confirmarDistribuicao(){
  var r = cotasFundo(saldoFundo());
  confirmar('Fechar a rodada do Fundo?',
    'Serão repassados <b>' + brl(r.liquido) + '</b> para <b>' + r.cotas.length + ' ONGs</b> certificadas, ' +
    'e <b>' + brl(r.taxa) + '</b> ficam como taxa de gestão. O extrato vira público na página do Fundo.',
    function(){ distribuirFundo(); recarregar(); }, 'Distribuir');
}
function salvarFundo(){
  var f = fundo();
  f.taxaGestao = limite(+$('#fu-taxa').value || 0, 0, 30);
  f.diaDistribuicao = limite(+$('#fu-dia').value || 10, 1, 28);
  salvar(); recarregar(); aviso('Regras do Fundo salvas.', 'ok');
}
function exportarFundo(){
  var linhas = [];
  fundo().rodadas.forEach(function(r){
    r.cotas.forEach(function(c){
      linhas.push([brData(r.data), c.ongNome, c.nivel, c.score, c.animais,
                   String(c.valor).replace('.',','), String(r.taxa).replace('.',',')]);
    });
  });
  exportarCSV('fundo-impacto-pdepata.csv',
    ['Data','ONG','Selo','Nota','Animais','Cota','Taxa da rodada'], linhas);
  aviso('CSV baixado.', 'ok');
}

/* ================================================================ PATROCÍNIOS (PLATAFORMA) */
registrarTela('pl-patrocinios', {
  titulo:'Patrocínios', sub:'receita comercial, sem ambiguidade',
  render:function(){
    var p = patrocinios();
    var ativos = filtrar(p, function(x){ return x.ativo; });
    var apoio = apoioMensal();
    return '' +
    '<div class="aviso aviso-o"><span class="em">📄</span><div>' +
      '<b>Esta é a receita mais limpa do negócio</b>Patrocínio é contrato comercial: a empresa compra ' +
      'visibilidade e relatório de impacto, você emite nota fiscal de serviço e ninguém precisa discutir ' +
      'se aquilo era doação. Não passa pelo Fundo, não se mistura com o dinheiro das ONGs, e é 100% seu.' +
    '</div></div>' +

    '<div class="g g4">' +
      kpiCard('Patrocínio recorrente', brl(mrrPatrocinio()), '🏢', 'v') +
      kpiCard('Apoio de pessoas (30d)', brl(apoio), '💚', 'r') +
      kpiCard('Contratos ativos', ativos.length, '📄', '') +
      kpiCard('Ticket médio', brl(ativos.length ? mrrPatrocinio()/ativos.length : 0), '📊', 'u') +
    '</div>' +

    '<div class="cx"><div class="cx-h"><div><h3>Cotas</h3>' +
      '<div class="desc">o que a empresa recebe em troca</div></div></div>' +
      '<div class="g g3">' + COTAS_PATROCINIO.map(function(c){
        var q = filtrar(ativos, function(x){ return x.plano === c.chave; }).length;
        return '<div class="plano ' + (c.destaque ? 'dest' : '') + '">' +
          (c.destaque ? '<div class="fita">mais contratado</div>' : '') +
          '<h4>' + c.nome + '</h4>' +
          '<div class="pr">' + brl(c.preco).replace(',00','') + '<small>/mês</small></div>' +
          '<ul>' + c.entrega.map(function(e){ return '<li>' + e + '</li>'; }).join('') + '</ul>' +
          '<div class="et ' + (q ? 'et-ok' : '') + '">' + q + ' contrato' + (q === 1 ? '' : 's') + '</div>' +
        '</div>';
      }).join('') + '</div></div>' +

    '<div class="cx"><div class="cx-h"><div><h3>Carteira</h3></div>' +
      '<div class="dir"><button class="b b-p b-s" onclick="novoPatrocinio()">+ Novo patrocinador</button></div></div>' +
      (p.length ? '<div class="rolar-x"><table class="tb"><thead><tr><th>Empresa</th><th>Cota</th>' +
        '<th class="num">Mensal</th><th>Desde</th><th>Situação</th><th></th></tr></thead><tbody>' +
        p.map(function(x){
          var c = null; COTAS_PATROCINIO.forEach(function(k){ if(k.chave === x.plano) c = k; });
          return '<tr><td><b class="s13">' + esc(x.empresa) + '</b>' +
            '<div class="s11 c3">' + esc(x.contato || '') + '</div></td>' +
            '<td><span class="et" style="background:' + (c?c.cor:'')+'1f;color:' + (c?c.cor:'') + '">' +
              (c ? c.nome : '—') + '</span></td>' +
            '<td class="num">' + brl(x.valor) + '</td>' +
            '<td class="s12">' + brData(x.desde) + '</td>' +
            '<td>' + (x.ativo ? '<span class="et et-ok">ativo</span>' : '<span class="et">encerrado</span>') + '</td>' +
            '<td class="td"><button class="b b-f b-s" onclick="alternarPatrocinio(\'' + x.id + '\')">' +
              (x.ativo ? 'Encerrar' : 'Reativar') + '</button></td></tr>';
        }).join('') + '</tbody></table></div>'
       : vazio('🏢','Nenhum patrocinador ainda',
          'Comece pelo comércio que já vive de pet na sua região: clínica, pet shop, banho e tosa.',
          '<button class="b b-p" onclick="novoPatrocinio()">+ Novo patrocinador</button>')) +
    '</div>' +

    '<div class="cx"><div class="cx-h"><h3>Argumento de venda pronto</h3></div>' +
      '<p class="s13 c2">O que faz uma empresa fechar não é pena de cachorro — é o relatório que ela ' +
      'precisa entregar no fim do ano. Venda isso:</p>' +
      '<div class="g g3">' +
        traducao(n(filtrar(DB.adocoes, function(a){ return a.data >= maisMeses(isoHoje(),-12); }).length),
                 'adoções nos últimos 12 meses, com nome e data') +
        traducao(n(filtrar(DB.pets, function(p){ return p.status !== 'adotado'; }).length),
                 'animais sob cuidado agora, em ' + unicos(DB.ongs.map(function(o){ return o.cidade; })).length + ' cidades') +
        traducao(n(filtrar(DB.ongs, function(o){ return certificada(o); }).length),
                 'organizações auditadas pelo Selo de Confiança') +
      '</div>' +
      '<button class="b b-f mt14" onclick="window.print()">🖨 Gerar apresentação</button></div>';
  }
});
function novoPatrocinio(){
  modal('Novo patrocinador',
    '<div class="g g2">' +
      campo('Empresa','pa-emp','') +
      campo('Contato (WhatsApp ou e-mail)','pa-cont','') +
      '<div class="f"><label>Cota</label><select class="i" id="pa-cota">' +
        COTAS_PATROCINIO.map(function(c){ return '<option value="' + c.chave + '">' + c.nome + ' — ' +
          brl(c.preco) + '/mês</option>'; }).join('') + '</select></div>' +
      '<div class="f"><label>Início</label><input class="i" type="date" id="pa-desde" value="' +
        isoHoje() + '"></div>' +
    '</div>',
    '<button class="b b-f" onclick="fecharModal()">Cancelar</button>' +
    '<button class="b b-p" onclick="salvarPatrocinio()">Cadastrar</button>', 'estreita');
}
function salvarPatrocinio(){
  var emp = $('#pa-emp').value.trim();
  if(!emp){ aviso('Informe a empresa.', 'err'); return; }
  var chave = $('#pa-cota').value, c = null;
  COTAS_PATROCINIO.forEach(function(k){ if(k.chave === chave) c = k; });
  patrocinios().unshift({ id:id('pat'), empresa:emp, contato:$('#pa-cont').value.trim(),
    plano:chave, valor:c.preco, desde:$('#pa-desde').value, ativo:true });
  salvar(); fecharModal(); recarregar();
  aviso('🏢 ' + emp + ' entrou como patrocinador ' + c.nome + '.', 'ok');
}
function alternarPatrocinio(pid){
  var x = achar(patrocinios(), pid); if(!x) return;
  x.ativo = !x.ativo; salvar(); recarregar();
}
