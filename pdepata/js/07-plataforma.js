/* =========================================================================
   P de PATA — telas de quem é dono da plataforma.
   Aqui mora o negócio: assinaturas, inadimplência, receita e expansão.
   ========================================================================= */
'use strict';

/* ================================================================ VISÃO DO DONO */
registrarTela('pl-painel', {
  titulo:'Visão do dono', sub:'como o negócio está indo',
  render:function(){
    var ativas = filtrar(DB.ongs, function(o){ return o.situacao === 'ativa'; });
    var pagantes = filtrar(DB.ongs, function(o){ return planoDa(o).preco > 0 && o.situacao !== 'removida'; });
    var gratis = filtrar(DB.ongs, function(o){ return planoDa(o).preco === 0 && o.situacao !== 'removida'; });
    var inad = inadimplencia();
    var taxas = receitaTaxas(30);
    var receita = receitaTotalPlataforma();
    var petsTotal = filtrar(DB.pets, function(p){ return p.status !== 'adotado'; }).length;
    var adoMes = filtrar(DB.adocoes, function(a){ return a.data >= isoHoje().slice(0,8)+'01'; }).length;
    var conv = pagantes.length / Math.max(1, DB.ongs.length) * 100;

    var meses = [];
    for(var m=5;m>=0;m--){
      var ini = maisMeses(isoHoje().slice(0,8)+'01', -m), fim = maisMeses(ini,1);
      meses.push({ r:MESES_C[+ini.slice(5,7)-1],
        v: somar(filtrar(DB.faturas, function(f){ return f.pagoEm && f.pagoEm>=ini && f.pagoEm<fim; }),
                 function(f){ return f.valor; }) });
    }

    return '' +
    leituraDoNegocio(receita, inad, conv, gratis.length, pagantes.length) +
    '<div class="g g4">' +
      kpiCard('Receita total do mês', brl(receita), '💰', '') +
      kpiCard('Mensalidade das ONGs', brl(mrr()), '📈', 'v') +
      kpiCard('Patrocínio de empresas', brl(mrrPatrocinio()), '🏢', 'u') +
      kpiCard('Em atraso', brl(inad.valor), '⚠️', inad.valor?'p':'v') +
    '</div>' +
    '<div class="g g4">' +
      kpiCard('ONGs na plataforma', DB.ongs.length, '🏢', '') +
      kpiCard('Pagantes', pagantes.length + ' (' + pct(conv) + ')', '💳', 'v') +
      kpiCard('Animais cuidados', petsTotal, '🐾', 'u') +
      kpiCard('Adoções no mês', adoMes, '🏡', 'v') +
    '</div>' +
    '<div class="g" style="grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);align-items:start">' +
      '<div class="cx"><div class="cx-h"><div><h3>Recebido por mês</h3>' +
        '<div class="desc">faturas efetivamente pagas</div></div></div>' +
        barras(meses, brlCurto, 'v') +
        '<div class="sep"></div>' +
        '<div class="g g3">' +
          blocoInfo('Ticket médio', brl(pagantes.length ? mrr()/pagantes.length : 0)) +
          blocoInfo('Receita por animal', brl(petsTotal ? receita/petsTotal : 0)) +
          blocoInfo('Projeção 12 meses', brl(receita*12)) +
        '</div></div>' +
      '<div class="cx"><div class="cx-h"><div><h3>Onde a receita nasce</h3>' +
        '<div class="desc">dinheiro que já entrou</div></div></div>' +
        (function(){
          var reais = [], estim = [];
          FONTES_RECEITA.forEach(function(f){
            var v = f.base ? f.base() : 0;
            if(v <= 0) return;
            (f.estimativa ? estim : reais).push({ nome:f.nome, emoji:f.emoji, v:v });
          });
          var tot = somar(reais, function(f){ return f.v; }) || 1;
          var html2 = ordenar(reais, function(f){ return f.v; }, true).map(function(f){
            return '<div class="mb14"><div class="entre"><span class="s12">' + f.emoji + ' ' +
              esc(truncar(f.nome, 30)) + '</span><b class="mono s12">' + brl(f.v) + '</b></div>' +
              '<div class="barra mt8" style="height:6px"><i style="width:' + (f.v/tot*100) + '%"></i></div></div>';
          }).join('');
          if(estim.length){
            html2 += '<div class="sep"></div><div class="rot mb8">Ainda não entrou — estimativa</div>' +
              ordenar(estim, function(f){ return f.v; }, true).map(function(f){
                return '<div class="entre mb8"><span class="s12 c3">' + f.emoji + ' ' +
                  esc(truncar(f.nome, 28)) + '</span><span class="mono s12 c3">~' + brl(f.v) + '</span></div>';
              }).join('') +
              '<div class="s11 c3">Projeção sobre as adoções do mês, para dimensionar a oportunidade. ' +
              'Não entra em nenhum total acima.</div>';
          }
          return html2;
        })() +
        '<button class="b b-f b-s b-bloco mt8" onclick="ir(\'pl-monetizacao\')">Ver as 15 fontes</button>' +
      '</div>' +
    '</div>' +
    '<div class="cx"><div class="cx-h"><div><h3>Carteira de ONGs</h3>' +
      '<div class="desc">clique para entrar na conta e ver o que ela vê</div></div>' +
      '<div class="dir"><button class="b b-f b-s" onclick="ir(\'pl-ongs\')">Gerenciar</button></div></div>' +
      '<div class="rolar-x"><table class="tb"><thead><tr><th>ONG</th><th>Cidade</th><th>Plano</th>' +
      '<th class="num">Mensalidade</th><th>Situação</th><th class="num">Animais</th><th></th></tr></thead><tbody>' +
      ordenar(DB.ongs, function(o){ return planoDa(o).preco; }, true).map(linhaOng).join('') +
      '</tbody></table></div></div>';
  }
});

/** Um parágrafo em português que lê os números e diz o que fazer. */
function leituraDoNegocio(receita, inad, conv, gratis, pagantes){
  var partes = [];
  partes.push('Você fatura <b>' + brl(receita) + '</b> por mês: ' + brl(mrr()) +
    ' de mensalidade das ONGs, ' + brl(mrrPatrocinio()) + ' de patrocínio de empresas, ' +
    brl(receitaTaxas(30)) + ' de taxa sobre doações, ' + brl(receitaFundo(30)) +
    ' de gestão do Fundo e ' + brl(apoioMensal()) + ' de apoio de pessoas.');
  if(inad.ongs) partes.push('<b class="pe">' + inad.ongs + ' ONG(s) em atraso</b>, somando ' +
    brl(inad.valor) + ' — a régua já bloqueou quem passou do prazo.');
  if(gratis) partes.push('Você tem <b>' + gratis + '</b> no plano grátis. ' +
    'Elas não pagam, mas enchem a vitrine e trazem doador — e é de lá que sai a próxima conversão.');
  partes.push('A conversão para plano pago está em <b>' + pct(conv) + '</b>.');
  var proximo;
  if(conv < 50) proximo = 'O caminho mais curto agora é fazer as ONGs do plano grátis baterem no limite ' +
    'de 15 animais — é ali que a mudança de plano acontece sozinha.';
  else if(inad.ongs > 1) proximo = 'Antes de buscar ONG nova, recupere quem está em atraso: ' +
    'custa muito menos e o dinheiro entra esta semana.';
  else proximo = 'A base está saudável. É hora de atacar a receita que não depende de ONG pagar: ' +
    'crescer o Fundo de Impacto, fechar mais cotas de patrocínio e ir atrás do primeiro contrato de prefeitura.';
  var semOng = receita - mrr();
  partes.push('Hoje <b>' + pct(semOng / (receita || 1) * 100) + '</b> da sua receita não depende de ' +
    'nenhuma ONG pagar mensalidade — é esse número que precisa subir.');

  return '<div class="cx" style="background:linear-gradient(120deg,var(--caramelo-clr),var(--sup));' +
    'border-color:var(--caramelo)"><div class="linha" style="flex-wrap:nowrap;align-items:flex-start">' +
    '<div style="font-size:30px">🧠</div><div>' +
    '<h3 style="font-size:15px;margin-bottom:6px">Leitura do mês</h3>' +
    '<p class="s13 mb0" style="line-height:1.65">' + partes.join(' ') + ' <b>' + proximo + '</b></p>' +
    '</div></div></div>';
}

function linhaOng(o){
  var pl = planoDa(o), lim = limitePets(o), d = diasAtraso(o);
  var ST = {ativa:['ativa','et-ok'], bloqueada:['bloqueada','et-pe'],
            suspensa:['suspensa','et-pe'], removida:['removida','']};
  return '<tr><td><b class="s13">' + esc(o.nome) + '</b>' +
    '<div class="s11 c3">' + esc(o.responsavel) + '</div></td>' +
    '<td class="s12">' + esc(o.cidade) + '</td>' +
    '<td><span class="et" style="background:' + o.cor + '22;color:' + o.cor + '">' + pl.nome + '</span></td>' +
    '<td class="num">' + (pl.preco ? brl(pl.preco) : '—') + '</td>' +
    '<td><span class="et ' + ST[o.situacao][1] + '">' + ST[o.situacao][0] + '</span>' +
      (d ? '<div class="s11 pe">' + d + 'd de atraso</div>' : '') + '</td>' +
    '<td class="num s12">' + lim.usados + '</td>' +
    '<td class="td"><button class="b b-f b-s" onclick="entrarComoOng(\'' + o.id + '\')">Entrar</button></td></tr>';
}
function entrarComoOng(ongId){
  SESSAO.papel = 'ong'; SESSAO.ongId = ongId; salvarSessao();
  montarMenu(); pintarTopo(); ir('ong-painel');
  aviso('Você está vendo a plataforma como ' + achar(DB.ongs, ongId).nome + '.', 'car');
}

/* ================================================================ ONGs */
registrarTela('pl-ongs', {
  titulo:'ONGs e assinaturas', sub:'a carteira inteira',
  render:function(){
    return '<div class="cx"><div class="cx-h"><div><h3>' + DB.ongs.length + ' organizações</h3>' +
      '<div class="desc">MRR de ' + brl(mrr()) + ' · potencial de ' + brl(mrrPotencial()) + '</div></div>' +
      '<div class="dir"><button class="b b-f b-s" onclick="exportarOngs()">⤓ CSV</button>' +
      '<button class="b b-p b-s" onclick="novaOng()">+ Cadastrar ONG</button></div></div>' +
      '<div class="rolar-x"><table class="tb"><thead><tr><th>ONG</th><th>Cidade</th><th>Plano</th>' +
      '<th class="num">Mensalidade</th><th>Situação</th><th class="num">Animais</th><th></th></tr></thead><tbody>' +
      ordenar(DB.ongs, function(o){ return o.nome; }).map(linhaOng).join('') + '</tbody></table></div></div>' +
    '<div class="g g-b">' + DB.ongs.map(function(o){
      var fats = faturasDa(o.id);
      var pagas = filtrar(fats, function(f){ return f.pagoEm; });
      var ltv = somar(pagas, function(f){ return f.valor; });
      var meses = Math.max(1, Math.round(difDias(o.criadaEm, isoHoje())/30));
      return '<div class="cx" style="margin:0;border-left:4px solid ' + o.cor + '">' +
        '<div class="linha" style="flex-wrap:nowrap"><div class="pav" style="background:' + o.cor +
          ';color:#fff">' + iniciais(o.nome) + '</div>' +
        '<div style="flex:1;min-width:0"><b class="s13 corte">' + esc(o.nome) + '</b>' +
        '<div class="s11 c3">' + esc(o.cidade) + ' · cliente há ' + meses + ' meses</div></div></div>' +
        '<div class="g g2 mt14">' +
          blocoInfo('Já pagou (LTV)', brl(ltv)) +
          blocoInfo('Faturas pagas', pagas.length + ' de ' + fats.length) +
        '</div>' +
        '<div class="linha mt14">' +
          '<button class="b b-f b-s" onclick="entrarComoOng(\'' + o.id + '\')">Entrar na conta</button>' +
          '<button class="b b-f b-s" onclick="mudarPlanoOng(\'' + o.id + '\')">Trocar plano</button>' +
          '<button class="b b-f b-s" onclick="abrirZap(\'' + o.telefone + '\',\'Oi! Aqui é do P de PATA.\')">💬</button>' +
        '</div></div>';
    }).join('') + '</div>';
  }
});
function mudarPlanoOng(ongId){
  var o = achar(DB.ongs, ongId);
  modal('Trocar plano — ' + esc(o.nome),
    '<div class="g g2">' + DB.planos.map(function(pl){ return cardPlanoSimples(pl, pl.id === o.planoId, ongId); }).join('') + '</div>',
    '<button class="b b-f" onclick="fecharModal()">Fechar</button>', 'larga');
}
function cardPlanoSimples(pl, atual, ongId){
  return '<div class="plano ' + (atual?'dest':'') + '"><h4>' + pl.nome + '</h4>' +
    '<div class="pr">' + (pl.preco?brl(pl.preco).replace(',00',''):'Grátis') + '</div>' +
    '<div class="s12 c2">Até ' + (pl.limitePets>9000?'∞':pl.limitePets) + ' animais</div>' +
    (atual ? '<button class="b b-f b-bloco" disabled>✓ Atual</button>'
           : '<button class="b b-p b-bloco" onclick="trocarPlano(\'' + ongId + '\',\'' + pl.id +
             '\');fecharModal();recarregar();aviso(\'Plano alterado.\',\'ok\')">Aplicar</button>') + '</div>';
}
function novaOng(){
  modal('Cadastrar nova ONG',
    '<div class="g g2">' +
      campo('Nome da organização','no-nome','') +
      campo('CNPJ','no-cnpj','') +
      campo('Responsável','no-resp','') +
      campo('WhatsApp','no-tel','') +
      campo('E-mail / chave Pix','no-email','') +
      '<div class="f"><label>Cidade</label><select class="i" id="no-cidade">' +
        todasCidades().map(function(c){ return '<option>' + esc(c) + '</option>'; }).join('') + '</select></div>' +
      '<div class="f"><label>Plano</label><select class="i" id="no-plano">' +
        DB.planos.map(function(p){ return '<option value="' + p.id + '">' + p.nome + ' — ' +
          (p.preco?brl(p.preco):'grátis') + '</option>'; }).join('') + '</select></div>' +
      '<div class="f"><label>Dia do vencimento</label><select class="i" id="no-venc">' +
        [1,5,10,15,20,25].map(function(d){ return '<option>' + d + '</option>'; }).join('') + '</select></div>' +
    '</div>' +
    '<div class="f mt14"><label>Sobre a ONG</label><textarea class="i" id="no-sobre"></textarea></div>',
    '<button class="b b-f" onclick="fecharModal()">Cancelar</button>' +
    '<button class="b b-p" onclick="salvarNovaOng()">Cadastrar e liberar acesso</button>');
}
function salvarNovaOng(){
  var nome = $('#no-nome').value.trim();
  if(!nome){ aviso('A ONG precisa de um nome.', 'err'); return; }
  var dia = +$('#no-venc').value;
  var o = {
    id:id('ong'), nome:nome, cnpj:$('#no-cnpj').value, responsavel:$('#no-resp').value,
    telefone:$('#no-tel').value, email:$('#no-email').value, pixChave:$('#no-email').value,
    cidade:$('#no-cidade').value, uf:'SP', bairro:'', sobre:$('#no-sobre').value,
    instagram:'', cor:'#E9762B', logo:null, planoId:$('#no-plano').value, diaVenc:dia,
    proximoVencimento:proximoVencimento(dia, isoHoje()), criadaEm:isoHoje(),
    assinaturaDesde:isoHoje(), situacao:'ativa', dono:false, selos:[], transparencia:true, avisado:null
  };
  DB.ongs.push(o);
  ['Ração adulto premium|racao|kg|30|2','Ração filhote|racao|kg|10|1','Areia sanitária|higiene|kg|10|0.5']
    .forEach(function(s, j){
      var p = s.split('|');
      DB.estoque.push({ id:id('est'), ongId:o.id, item:p[0], tipo:p[1], unidade:p[2],
        quantidade:+p[3], minimo:10, consumoDia:+p[4] });
    });
  emitirFaturasDoMes();
  registrar(o.id, 'sistema', 'Conta criada no P de PATA');
  salvar(); fecharModal(); recarregar();
  aviso('🎉 ' + nome + ' está na plataforma!', 'ok');
}
function exportarOngs(){
  exportarCSV('ongs-pdepata.csv',
    ['ONG','Cidade','Responsável','Plano','Mensalidade','Situação','Dias de atraso','Animais','Cliente desde'],
    DB.ongs.map(function(o){
      return [o.nome, o.cidade, o.responsavel, planoDa(o).nome,
              String(planoDa(o).preco).replace('.',','), o.situacao, diasAtraso(o),
              limitePets(o).usados, brData(o.criadaEm)];
    }));
  aviso('CSV baixado.', 'ok');
}

/* ================================================================ COBRANÇA */
registrarTela('pl-cobranca', {
  titulo:'Cobrança', sub:'a régua que bloqueia e remove',
  render:function(){
    var cfg = DB.plataforma;
    var inad = inadimplencia();
    var atrasadas = ordenar(filtrar(DB.faturas, function(f){
      return !f.pagoEm && f.status !== 'cancelada' && difDias(f.vence, isoHoje()) > 0;
    }), function(f){ return f.vence; });
    var porSituacao = agrupar(DB.ongs, function(o){ return o.situacao; });

    return '' +
    '<div class="g g4">' +
      kpiCard('Valor em atraso', brl(inad.valor), '⚠️', 'p') +
      kpiCard('ONGs bloqueadas', (porSituacao.bloqueada||[]).length, '🔒', 'a') +
      kpiCard('ONGs suspensas', (porSituacao.suspensa||[]).length, '⏸️', 'p') +
      kpiCard('Removidas', (porSituacao.removida||[]).length, '🗑️', '') +
    '</div>' +
    '<div class="cx"><div class="cx-h"><div><h3>Régua de inadimplência</h3>' +
      '<div class="desc">roda sozinha todo dia — você não precisa cobrar ninguém na mão</div></div></div>' +
      '<div class="g g4 mb14">' +
        '<div class="f"><label>Carência após o vencimento (dias)</label>' +
          '<input class="i" type="number" id="rg-carencia" value="' + cfg.carenciaBloqueio + '" min="0"></div>' +
        '<div class="f"><label>Suspender a vitrine após (dias)</label>' +
          '<input class="i" type="number" id="rg-susp" value="' + cfg.diasSuspensao + '" min="1"></div>' +
        '<div class="f"><label>Remover o perfil após (dias)</label>' +
          '<input class="i" type="number" id="rg-rem" value="' + cfg.diasRemocao + '" min="30"></div>' +
        '<div class="f"><label>Avisar antes da remoção (dias)</label>' +
          '<input class="i" type="number" id="rg-aviso" value="' + cfg.avisoAntesRemocao + '" min="0"></div>' +
      '</div>' +
      '<div class="f mb14"><label>Modo de bloqueio</label><div class="opcoes">' +
        [['preserva','🐾 Preservar a vitrine dos animais'],['total','🔒 Bloqueio total']].map(function(m){
          return '<button class="op ' + (cfg.modoBloqueio===m[0]?'on car':'') + '" onclick="' +
            'DB.plataforma.modoBloqueio=\'' + m[0] + '\';salvar();aplicarRegua();recarregar()">' + m[1] + '</button>';
        }).join('') + '</div></div>' +
      (cfg.modoBloqueio === 'preserva'
        ? '<div class="aviso aviso-o"><span class="em">🐾</span><div><b>Modo recomendado</b>' +
          'A gestão trava na hora — a ONG não cadastra, não edita, não exporta. Mas as páginas dos ' +
          'animais já publicados continuam no ar até a suspensão. A pressão para pagar continua ' +
          'inteira, e nenhum animal perde uma adoção por causa de uma fatura.</div></div>'
        : '<div class="aviso aviso-a"><span class="em">⚠️</span><div><b>Bloqueio total</b>' +
          'Os animais somem da vitrine já no primeiro dia de atraso. Cobra mais forte, mas tire a ' +
          'prova real: se um cão deixar de ser adotado por isso, a história vai parar nas redes ' +
          'como "a plataforma sumiu com meus animais". Vale a pena?</div></div>') +
      '<div class="aviso aviso-i"><span class="em">💡</span><div><b>Sobre a carência zero</b>' +
        'Bloquear no dia seguinte ao vencimento é o que você pediu e está funcionando assim. ' +
        'Vale saber: boleto e Pix agendado às vezes compensam com um ou dois dias de folga, e ' +
        'bloquear quem já pagou gera atrito e pedido de reembolso. Três dias de carência costumam ' +
        'eliminar esse ruído sem afrouxar a cobrança — mas a decisão é sua.</div></div>' +
      '<button class="b b-p" onclick="salvarRegua()">Salvar régua</button>' +
      '<button class="b b-f" onclick="aplicarRegua();recarregar();aviso(\'Régua reprocessada.\',\'ok\')">' +
        '↻ Reprocessar agora</button></div>' +
    '<div class="cx"><div class="cx-h"><div><h3>Linha do tempo da cobrança</h3></div></div>' +
      '<div class="g g4">' +
        etapaRegua('Dia 0', 'Vence a fatura', 'Aviso automático no painel e por e-mail.', 'var(--info)') +
        etapaRegua('Dia ' + (cfg.carenciaBloqueio+1), 'Bloqueio', 'A gestão trava. ' +
          (cfg.modoBloqueio==='preserva'?'A vitrine dos animais continua.':'Tudo sai do ar.'), 'var(--alerta)') +
        etapaRegua('Dia ' + (cfg.diasSuspensao+1), 'Suspensão', 'A ONG e os animais saem da vitrine pública.', 'var(--perigo)') +
        etapaRegua('Dia ' + (cfg.diasRemocao+1), 'Remoção', 'Perfil removido. Os dados podem ser baixados até aqui.', 'var(--tinta)') +
      '</div></div>' +
    '<div class="cx"><div class="cx-h"><div><h3>Faturas em atraso</h3>' +
      '<div class="desc">' + atrasadas.length + ' em aberto</div></div>' +
      '<div class="dir"><button class="b b-f b-s" onclick="emitirFaturasDoMes();recarregar();' +
        'aviso(\'Faturas do mês emitidas.\',\'ok\')">Emitir faturas do mês</button></div></div>' +
      (atrasadas.length ? '<div class="rolar-x"><table class="tb"><thead><tr><th>ONG</th><th>Competência</th>' +
        '<th>Venceu</th><th class="num">Atraso</th><th class="num">Valor</th><th></th></tr></thead><tbody>' +
        atrasadas.map(function(f){
          var o = achar(DB.ongs, f.ongId), d = difDias(f.vence, isoHoje());
          return '<tr><td><b class="s13">' + esc(o.nome) + '</b><div class="s11 c3">' +
            esc(o.responsavel) + '</div></td>' +
            '<td class="s12">' + f.competencia + '</td><td class="s12">' + brData(f.vence) + '</td>' +
            '<td class="num pe neg">' + d + 'd</td><td class="num">' + brl(f.valor) + '</td>' +
            '<td class="td"><button class="b b-f b-s" onclick="cobrar(\'' + o.id + '\')">💬 Cobrar</button> ' +
            '<button class="b b-v b-s" onclick="pagarFatura(\'' + f.id + '\',\'pix\');recarregar()">✓ Baixa</button></td></tr>';
        }).join('') + '</tbody></table></div>'
       : '<div class="vazio s13">Ninguém em atraso. 🎉</div>') + '</div>';
  }
});
function etapaRegua(dia, titulo, texto, cor){
  return '<div class="cx plana" style="background:var(--sup-2);margin:0;border-top:3px solid ' + cor + '">' +
    '<div class="rot">' + dia + '</div><div class="neg s13">' + titulo + '</div>' +
    '<div class="s12 c2 mt8">' + texto + '</div></div>';
}
function salvarRegua(){
  var c = DB.plataforma;
  c.carenciaBloqueio = Math.max(0, +$('#rg-carencia').value || 0);
  c.diasSuspensao = Math.max(1, +$('#rg-susp').value || 30);
  c.diasRemocao = Math.max(c.diasSuspensao+1, +$('#rg-rem').value || 90);
  c.avisoAntesRemocao = Math.max(0, +$('#rg-aviso').value || 15);
  salvar(); aplicarRegua(); recarregar();
  aviso('Régua salva e reprocessada.', 'ok');
}
function cobrar(ongId){
  var o = achar(DB.ongs, ongId), f = faturaAberta(ongId);
  var d = diasAtraso(o);
  var txt = 'Oi ' + (o.responsavel||'').split(' ')[0] + ', tudo bem?\n\n' +
    'A mensalidade do P de PATA (' + planoDa(o).nome + ' — ' + brl(f?f.valor:0) + ') venceu em ' +
    (f?brData(f.vence):'') + ' e está com ' + d + ' dias de atraso.\n\n' +
    (o.situacao === 'bloqueada' ? 'O acesso à gestão está bloqueado, mas os perfis dos animais de vocês ' +
      'continuam no ar. Assim que o pagamento entrar, tudo volta na hora.\n\n' : '') +
    'Precisa de outro prazo? Me fala que a gente ajeita — não quero que isso atrapalhe o trabalho de vocês.\n\n' +
    'Pix: ' + DB.plataforma.pixChave;
  modal('Cobrar ' + esc(o.nome),
    '<div class="f"><label>Mensagem</label><textarea class="i" style="min-height:200px" id="cb-txt">' +
      esc(txt) + '</textarea></div>' +
    '<div class="aviso aviso-i mt14 mb0"><span class="em">💡</span><div>' +
      'Cobrança que oferece saída (prazo, plano menor) recupera muito mais do que cobrança que só ameaça. ' +
      'Uma ONG que cai para o plano grátis continua na sua base — e volta a pagar depois.</div></div>',
    '<button class="b b-f" onclick="fecharModal()">Fechar</button>' +
    '<button class="b b-p" onclick="abrirZap(\'' + o.telefone + '\',document.getElementById(\'cb-txt\').value);' +
      'fecharModal()">💬 Enviar no WhatsApp</button>');
}

/* ================================================================ MONETIZAÇÃO */
var SIM = { ongs:6, ticket:70, doacoes:12000, adocoes:14, patroc:2, prefeituras:0, clube:0 };
registrarTela('pl-monetizacao', {
  titulo:'Monetização', sub:'15 formas de ganhar dinheiro com isso',
  render:function(){
    var grupos = agrupar(FONTES_RECEITA, function(f){ return f.grupo; });
    return '' +
    '<div class="aviso aviso-c"><span class="em">💰</span><div>' +
      '<b>A conta que muda tudo</b>Existem cerca de 400 ONGs formais no Brasil, e a maioria não tem ' +
      'caixa para pagar software — dois concorrentes brasileiros são gratuitos justamente por isso. ' +
      'Se a mensalidade for a única receita, o teto é baixo. As outras 14 fontes abaixo vivem do ' +
      'movimento da plataforma (doação, adoção, tutor, empresa, prefeitura), e é ali que está a escala.</div></div>' +
    simuladorReceita() +
    Object.keys(grupos).map(function(g){
      return '<div class="cx"><div class="cx-h"><h3>' + g + '</h3>' +
        '<div class="dir"><span class="et">' + grupos[g].length + ' fonte(s)</span></div></div>' +
        '<div class="g g2">' + grupos[g].map(function(f){
          var hoje2 = f.base ? f.base() : 0;
          return '<div class="cx plana" style="background:var(--sup-2);margin:0">' +
            '<div class="linha" style="flex-wrap:nowrap"><span style="font-size:24px">' + f.emoji + '</span>' +
            '<div style="flex:1;min-width:0"><b class="s13">' + esc(f.nome) + '</b>' +
            '<div class="s11 c3">quem paga: ' + esc(f.quem) + '</div></div>' +
            (f.pedida ? '<span class="et et-ca">seu pedido</span>' : '') + '</div>' +
            '<p class="s12 c2 mt8" style="line-height:1.55">' + esc(f.como) + '</p>' +
            '<div class="entre mt8">' +
              '<span class="s11 c3">esforço ' + f.esforco + ' · ' + f.prazo + '</span>' +
              '<b class="mono s13 ' + (hoje2 && !f.estimativa ? 'ok' : 'c3') + '">' +
                (hoje2 ? (f.estimativa ? '~' + brl(hoje2) + '/mês (estimado)' : brl(hoje2) + '/mês')
                       : (f.potencial ? 'potencial ' + brlCurto(f.potencial) + '/mês' : '—')) +
              '</b></div></div>';
        }).join('') + '</div></div>';
    }).join('');
  }
});
function simuladorReceita(){
  var s = SIM;
  var mensal = s.ongs * s.ticket;
  var taxa = s.doacoes * (DB.plataforma.taxaDoacao/100);
  var kit = s.adocoes * 0.45 * 120 * 0.30;
  var seguro = s.adocoes * 0.22 * 480 * 0.25;
  var patro = s.patroc * 1200 * 0.15;
  var pref = s.prefeituras * 4000;
  var clube = s.clube * 19.9 * 0.7;
  var total = mensal + taxa + kit + seguro + patro + pref + clube;
  var linhas = [
    ['Mensalidade das ONGs', mensal], ['Taxa sobre doações', taxa],
    ['Kit adoção', kit], ['Comissão de plano de saúde', seguro],
    ['Patrocínio corporativo', patro], ['Contratos públicos', pref],
    ['Clube P de PATA (tutores)', clube]
  ].filter(function(l){ return l[1] > 0; });
  return '<div class="cx"><div class="cx-h"><div><h3>Simulador</h3>' +
    '<div class="desc">mexa nos números e veja o negócio inteiro mudar</div></div></div>' +
    '<div class="g g4 mb14">' +
      slider('ongs','ONGs pagantes', s.ongs, 0, 300) +
      slider('ticket','Ticket médio (R$)', s.ticket, 0, 400) +
      slider('doacoes','Doações processadas/mês (R$)', s.doacoes, 0, 500000, 1000) +
      slider('adocoes','Adoções por mês', s.adocoes, 0, 500) +
      slider('patroc','Patrocinadores', s.patroc, 0, 100) +
      slider('prefeituras','Contratos com prefeituras', s.prefeituras, 0, 30) +
      slider('clube','Assinantes do Clube', s.clube, 0, 20000, 50) +
    '</div>' +
    '<div class="g" style="grid-template-columns:minmax(0,1fr) 300px;align-items:start">' +
      '<div>' + linhas.map(function(l){
        return '<div class="mb8"><div class="entre"><span class="s13">' + l[0] + '</span>' +
          '<b class="mono s13">' + brl(l[1]) + '</b></div>' +
          '<div class="barra mt8" style="height:6px"><i style="width:' + (l[1]/total*100) + '%"></i></div></div>';
      }).join('') + '</div>' +
      '<div class="cx plana" style="background:var(--sup-2);margin:0;text-align:center">' +
        '<div class="rot">Receita mensal</div>' +
        '<div class="num-grande ca" style="font-size:30px">' + brl(total) + '</div>' +
        '<div class="sep"></div>' +
        '<div class="rot">Por ano</div><div class="num-grande" style="font-size:22px">' + brl(total*12) + '</div>' +
        '<div class="s11 c3 mt14">Quanto da receita NÃO depende de ONG pagar: <b>' +
          pct((total-mensal)/(total||1)*100) + '</b></div>' +
      '</div>' +
    '</div></div>';
}
function slider(chave, rot, val, min, max, passo){
  return '<div class="f"><label>' + rot + ': <b class="mono">' + n(val) + '</b></label>' +
    '<input type="range" min="' + min + '" max="' + max + '" step="' + (passo||1) + '" value="' + val + '" ' +
    'oninput="SIM.' + chave + '=+this.value;recarregar()" style="width:100%"></div>';
}

/* ================================================================ EXPANSÃO */
registrarTela('pl-expansao', {
  titulo:'Expansão', sub:'do ABC para o Brasil',
  render:function(){
    var porCidade = agrupar(DB.ongs, function(o){ return o.cidade; });
    var regioes = agrupar(UFS, function(u){ return u.reg; });
    return '' +
    '<div class="aviso aviso-i"><span class="em">🗺️</span><div>' +
      '<b>Por que começar pelo ABC e não pelo Brasil</b>' +
      'Adoção é um mercado local: ninguém atravessa o estado para conhecer um cão. O valor da ' +
      'plataforma é ter, na mesma cidade, várias ONGs, muitos lares temporários e um público que ' +
      'vê a vitrine cheia. Uma praça densa vale mais que vinte praças vazias — por isso o mapa ' +
      'abaixo abre praça por praça, e não estado por estado.</div></div>' +
    '<div class="g g4">' +
      kpiCard('Praças ativas', filtrar(PRACAS, function(p){ return p.ativa; }).length, '📍', 'v') +
      kpiCard('Cidades com ONG', Object.keys(porCidade).length, '🏙️', '') +
      kpiCard('Cobertura do ABC', pct(Object.keys(porCidade).length / PRACAS[0].cidades.length * 100), '🎯', 'u') +
      kpiCard('Estados prontos', UFS.length, '🇧🇷', '') +
    '</div>' +
    '<div class="cx"><div class="cx-h"><div><h3>Praças</h3>' +
      '<div class="desc">a densidade é o que faz a praça funcionar</div></div></div>' +
      '<div class="g g2">' + PRACAS.map(function(p){
        var ongsP = filtrar(DB.ongs, function(o){ return p.cidades.indexOf(o.cidade) >= 0; });
        var cidadesCobertas = unicos(ongsP.map(function(o){ return o.cidade; }));
        var densidade = cidadesCobertas.length / p.cidades.length;
        return '<div class="cx plana" style="background:var(--sup-2);margin:0;' +
          (p.ativa?'border:1px solid var(--caramelo)':'') + '">' +
          '<div class="entre"><b class="s16">' + esc(p.nome) + '</b>' +
          '<span class="et ' + (p.ativa?'et-ok':'') + '">' + (p.ativa?'ativa':'planejada') + '</span></div>' +
          '<div class="s12 c2 mt8">' + p.cidades.length + ' cidades · ' + ongsP.length + ' ONGs</div>' +
          '<div class="barra mt8"><i style="width:' + (densidade*100) + '%"></i></div>' +
          '<div class="s11 c3 mt8">' + cidadesCobertas.length + ' de ' + p.cidades.length +
            ' cidades com pelo menos uma ONG</div>' +
          '<div class="linha mt8">' + p.cidades.map(function(c){
            return '<span class="et ' + (porCidade[c]?'et-ok':'') + '">' + esc(c) + '</span>'; }).join('') + '</div>' +
          (p.ativa ? '' : '<button class="b b-f b-s b-bloco mt8" onclick="abrirPraca(\'' + p.id + '\')">' +
            'Abrir esta praça</button>') +
        '</div>';
      }).join('') + '</div></div>' +
    '<div class="cx"><div class="cx-h"><div><h3>Brasil</h3>' +
      '<div class="desc">o cadastro já aceita as 27 unidades da federação</div></div></div>' +
      Object.keys(regioes).map(function(r){
        return '<div class="mb14"><div class="rot mb8">' + r + '</div><div class="uf-g">' +
          regioes[r].map(function(u){
            var q = filtrar(DB.ongs, function(o){ return o.uf === u.uf; }).length;
            return '<div class="uf ' + (q?'ativo':'') + '" title="' + esc(u.nome) + '">' +
              '<b>' + u.uf + '</b><small>' + (q ? q + ' ONG' + (q>1?'s':'') : '—') + '</small></div>';
          }).join('') + '</div></div>';
      }).join('') + '</div>' +
    '<div class="cx"><div class="cx-h"><h3>Roteiro de abertura de praça</h3></div>' +
      '<div class="g g4">' +
        passo(1,'Uma ONG âncora','A mais organizada da cidade entra de graça e vira referência. ' +
          'Ela traz as outras — protetor confia em protetor, não em vendedor.') +
        passo(2,'Feira e castramóvel no ar','Publicar a agenda pública da prefeitura atrai o público ' +
          'antes mesmo de existir vitrine cheia.') +
        passo(3,'Lares temporários','Sem lar não há resgate. Campanha de lar temporário é o que ' +
          'destrava o crescimento da praça.') +
        passo(4,'Comércio e prefeitura','Com movimento comprovado, vende-se vitrine patrocinada ' +
          'para o comércio local e o contrato para o CCZ.') +
      '</div></div>';
  }
});
function abrirPraca(pid){
  var p = null;
  PRACAS.forEach(function(x){ if(x.id === pid) p = x; });
  confirmar('Abrir a praça ' + p.nome + '?',
    'As cidades passam a aparecer nos cadastros e na vitrine pública. ' +
    'Recomendo abrir só quando tiver ao menos uma ONG âncora combinada.',
    function(){ p.ativa = true; salvar(); recarregar(); aviso('Praça aberta! 📍', 'ok'); });
}

/* ================================================================ CONFIG PLATAFORMA */
registrarTela('pl-config', {
  titulo:'Configurações', sub:'taxas, dados e demonstração',
  render:function(){
    var c = DB.plataforma;
    return '' +
    '<div class="cx"><div class="cx-h"><h3>Taxas</h3></div>' +
      '<div class="g g2">' +
        '<div class="f"><label>Taxa sobre doações (%)</label>' +
          '<input class="i" type="number" step="0.1" id="pf-taxa" value="' + c.taxaDoacao + '"></div>' +
        '<div class="f"><label>Taxa sobre lista de presentes (%)</label>' +
          '<input class="i" type="number" step="0.1" id="pf-taxap" value="' + c.taxaPresente + '"></div>' +
        campo('Chave Pix da plataforma','pf-pix', c.pixChave) +
        campo('Nome da plataforma','pf-nome', c.nome) +
      '</div>' +
      '<div class="aviso aviso-i mt14"><span class="em">💡</span><div>' +
        '<b>Sobre o tamanho da taxa</b>Plataformas de doação no Brasil ficam entre 3% e 8%. ' +
        'Acima disso a ONG passa a pedir Pix direto e você perde a transação inteira. ' +
        'O truque não é cobrar mais: é deixar a caixinha "quero cobrir a taxa" marcada por padrão — ' +
        'a maior parte dos doadores aceita, e a ONG recebe 100%.</div></div>' +
      '<button class="b b-p" onclick="salvarConfigPlataforma()">Salvar</button></div>' +
    '<div class="cx"><div class="cx-h"><div><h3>Demonstração</h3>' +
      '<div class="desc">para apresentar o sistema sem esperar o calendário</div></div></div>' +
      '<p class="s13 c2">Adiante a data do sistema e veja a régua de cobrança agir de verdade: ' +
      'a fatura vence, a ONG bloqueia, depois suspende e por fim é removida. As vacinas também ' +
      'entram em atraso conforme o tempo passa.</p>' +
      '<div class="linha">' +
        '<button class="b b-f" onclick="viajar(7)">+7 dias</button>' +
        '<button class="b b-f" onclick="viajar(30)">+30 dias</button>' +
        '<button class="b b-f" onclick="viajar(60)">+60 dias</button>' +
        '<button class="b b-f" onclick="viajar(-30)">−30 dias</button>' +
        '<button class="b b-f" onclick="viajar(0)">Voltar para hoje</button>' +
      '</div>' +
      '<div class="s12 c3 mt14">Data do sistema agora: <b>' + brData(isoHoje()) + '</b>' +
        (HOJE ? ' <span class="et et-al">simulada</span>' : '') + '</div></div>' +
    '<div class="cx"><div class="cx-h"><h3>Dados</h3></div>' +
      '<div class="linha">' +
        '<button class="b b-f" onclick="baixarArquivo(\'pdepata-backup-\'+isoHoje()+\'.json\',' +
          'JSON.stringify(DB,null,2),\'application/json\')">⤓ Backup completo</button>' +
        '<button class="b b-d" onclick="zerarTudo()">🗑 Apagar tudo e recomeçar</button>' +
      '</div></div>';
  }
});
function salvarConfigPlataforma(){
  var c = DB.plataforma;
  c.taxaDoacao = +$('#pf-taxa').value || 0;
  c.taxaPresente = +$('#pf-taxap').value || 0;
  c.pixChave = $('#pf-pix').value;
  c.nome = $('#pf-nome').value || c.nome;
  salvar(); recarregar(); aviso('Salvo.', 'ok');
}
function viajar(dias){
  if(dias === 0){ HOJE = null; try{ localStorage.removeItem(CHAVE_HOJE); }catch(e){} }
  else {
    var base = hoje(); base.setDate(base.getDate() + dias);
    HOJE = base;
    try{ localStorage.setItem(CHAVE_HOJE, iso(base)); }catch(e){}
  }
  emitirFaturasDoMes();
  aplicarRegua();
  recarregar(); pintarTopo(); montarMenu();
  aviso('Data do sistema: ' + brData(isoHoje()), 'car');
}
