/* =====================================================================
   Financeiro

   Tres numeros que NUNCA se somam, porque sao tres relogios diferentes:
   o que esta esperando resposta, o que foi contratado, e o que entrou de
   fato. Somar os tres e o jeito mais rapido de achar que a casa tem
   dinheiro que ela nao tem.

   Nada aqui vem da TMB. Tudo que aparece foi alguem que lancou, e por isso
   a tela mostra sempre quando foi o ultimo lancamento.
   ===================================================================== */

function dinheiroProjetos() { return iqvLer(CHAVES.projetos, []); }
function dinheiroRecebimentos() { return iqvLer(CHAVES.recebimentos, []); }
function dinheiroLeituras() { return iqvLer(CHAVES.leituras, []); }

function dinheiroParcelas(projetoId) {
  const r = dinheiroRecebimentos().find(function (x) { return x.projetoId === projetoId; });
  return (r && r.parcelas) || [];
}

function dinheiroNivel(k) {
  const metodo = iqvLer(CHAVES.metodo, null);
  const niveis = (metodo && metodo.niveis) || NIVEIS_DEFAULT;
  return niveis.find(function (n) { return n.k === k; }) || null;
}

// Mes no formato AAAA-MM, que ordena sozinho como texto.
function dinheiroMes(iso) { return String(iso || '').slice(0, 7); }

/* Só o mês, para o rótulo embaixo da coluna. Doze vezes "set. de 26" numa
   linha de rótulos não cabe, e o ano é o mesmo em quase todos. */
function dinheiroMesCurto(am) {
  const p = String(am).split('-');
  if (p.length < 2) return am;
  const d = new Date(Number(p[0]), Number(p[1]) - 1, 1);
  return d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
}

function dinheiroRotuloMes(am) {
  const p = String(am).split('-');
  if (p.length < 2) return am;
  const d = new Date(Number(p[0]), Number(p[1]) - 1, 1);
  return d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
}

// Quando foi o ultimo lancamento de qualquer parcela. Se ficou velho, a
// tela pode estar mentindo para baixo, e precisa dizer isso.
function dinheiroUltimoLancamento() {
  let ultimo = null;
  dinheiroRecebimentos().forEach(function (r) {
    if (r.ultimoLancamentoEm && (!ultimo || r.ultimoLancamentoEm > ultimo)) ultimo = r.ultimoLancamentoEm;
    (r.parcelas || []).forEach(function (p) {
      if (p.pagoEm && (!ultimo || p.pagoEm > ultimo)) ultimo = p.pagoEm;
    });
  });
  return ultimo;
}

function dinheiroBaixar(projetoId, n) {
  const todos = dinheiroRecebimentos();
  let r = todos.find(function (x) { return x.projetoId === projetoId; });
  if (!r) { r = { projetoId: projetoId, parcelas: [] }; todos.push(r); }
  const parcela = (r.parcelas || []).find(function (p) { return p.n === n; });
  if (!parcela) return;
  // Dois cliques: marcar e desmarcar. Baixa errada acontece, e desfazer
  // precisa ser tao facil quanto fazer.
  parcela.pagoEm = parcela.pagoEm ? null : hoje();
  r.ultimoLancamentoEm = hoje();
  if (iqvGravar(CHAVES.recebimentos, todos)) DESENHO.dinheiro();
  else DESENHO.dinheiro();
}

/* =====================================================================
   O painel do dinheiro.

   Ate 04/09 esta tela era quatro numeros e tres tabelas. Tabela responde
   "quanto, em que mes" para quem le linha por linha; ela nao responde a
   pergunta que se faz de pe, olhando a tela por tres segundos: o caixa
   dos proximos meses esta subindo ou caindo, e onde estao os buracos.

   Tres coisas mudaram:

   a. A abertura diz o que entrou, do que foi contratado, com a barra que
      mostra a proporcao. Os quatro numeros continuam, porque sao relogios
      diferentes e nao se somam, mas agora vem depois da manchete.
   b. Os doze meses viraram colunas. Cada coluna e um mes, dividida em
      entrou, a vencer e vencido. Doze colunas lado a lado mostram a forma
      do ano; doze linhas de tabela nao mostram.
   c. O que falta receber ganhou idade: vencido, vence este mes, depois.
      Um numero unico de "falta receber" nao diz se e trabalho de hoje ou
      caixa de setembro.

   As colunas sao HTML, e nao SVG. Aqui nao ha curva para desenhar, so
   retangulos com altura em porcentagem, e HTML nao estica a letra quando
   a tela muda de largura.
   ===================================================================== */

// A altura de cada pedaco da coluna, em porcentagem do maior mes.
function dinheiroColuna(m, teto) {
  const alt = function (v) { return teto ? (v / teto) * 100 : 0; };
  const aVencer = Math.max(0, m.prometido - m.entrou - m.vencido);
  return '<div class="col-pilha" title="' + esc(dinheiroRotuloMes(m.am)) + ': ' +
      esc(moeda(m.prometido)) + ' prometido' +
      (m.entrou ? ', ' + esc(moeda(m.entrou)) + ' entrou' : '') +
      (m.vencido ? ', ' + esc(moeda(m.vencido)) + ' venceu e não entrou' : '') + '">' +
    (m.vencido ? '<i class="vencido" style="height:' + alt(m.vencido).toFixed(2) + '%"></i>' : '') +
    (aVencer ? '<i class="avencer" style="height:' + alt(aVencer).toFixed(2) + '%"></i>' : '') +
    (m.entrou ? '<i class="entrou" style="height:' + alt(m.entrou).toFixed(2) + '%"></i>' : '') +
  '</div>';
}

function dinheiroCalendarioHtml(meses, chavesMes) {
  const lista = chavesMes.map(function (am) {
    return Object.assign({ am: am }, meses[am]);
  });
  const teto = Math.max.apply(null, lista.map(function (m) { return m.prometido; }).concat([1]));
  const total = lista.reduce(function (t, m) { return t + m.prometido; }, 0);
  if (!total) {
    return '<p class="dica">O calendário está vazio. Quando um aceite virar projeto, as parcelas nascem ' +
      'aqui já com as datas, e a única coisa que continua sendo trabalho seu é dar baixa no que entrar.</p>';
  }

  // O eixo: quatro degraus inteiros ate o teto, arredondado para cima.
  // Um teto redondo, divisivel por quatro: eixo que termina em 37.412 nao
  // se le de relance.
  const passo = Math.pow(10, Math.max(0, String(Math.round(teto)).length - 2));
  const topo = Math.max(passo * 4, Math.ceil(teto / (passo * 4)) * passo * 4);
  let eixo = '';
  for (let i = 0; i <= 4; i++) {
    eixo += '<span style="bottom:' + ((i / 4) * 100).toFixed(1) + '%">' +
      moedaCurta((topo / 4) * i) + '</span>';
  }

  const mesCheio = lista.reduce(function (a, b) { return b.prometido > a.prometido ? b : a; }, lista[0]);
  const vencidoTotal = lista.reduce(function (t, m) { return t + m.vencido; }, 0);

  // "set. de 26" cabe no rotulo de uma coluna, mas nao no meio de uma
  // frase: ali o mes se escreve por extenso.
  const porExtenso = function (am) {
    const p = String(am).split('-');
    const d = new Date(Number(p[0]), Number(p[1]) - 1, 1);
    return d.toLocaleDateString('pt-BR', { month: 'long' }) +
      (Number(p[0]) !== new Date().getFullYear() ? ' de ' + p[0] : '');
  };

  return '<div class="colunas">' +
      '<div class="colunas-eixo">' + eixo + '</div>' +
      '<div class="colunas-campo">' +
        lista.map(function (m, i) {
          return '<div class="coluna' + (i === 0 ? ' agora' : '') + '">' +
            dinheiroColuna(m, topo) +
            '<span class="coluna-r">' + esc(dinheiroMesCurto(m.am)) + '</span>' +
          '</div>';
        }).join('') +
      '</div>' +
    '</div>' +
    '<p class="dica" style="margin-top:14px">O mês mais cheio é ' + esc(porExtenso(mesCheio.am)) +
      ', com ' + esc(moeda(mesCheio.prometido)) + ' prometido.' +
      (vencidoTotal ? ' <b style="color:var(--sinal-alerta)">' + esc(moeda(vencidoTotal)) +
        ' já venceu e não entrou.</b>' : ' Nada venceu sem entrar.') +
      ' Passe o mouse numa coluna para ver o mês.</p>';
}

/* A idade do que falta receber.

   "Falta receber R$ 40 mil" nao diz se e trabalho de hoje ou caixa de
   setembro. Vencido e cobranca; vence este mes e atencao; depois e
   previsao. Sao tres coisas diferentes e viravam uma so. */
function dinheiroIdadeHtml(vencido, esteMes, depois) {
  const total = vencido + esteMes + depois;
  if (!total) return '';
  const pc = function (v) { return (v / total) * 100; };
  const faixa = function (v, classe, nome) {
    if (!v) return '';
    return '<div class="idade-linha">' +
      '<div class="idade-t"><b>' + esc(moeda(v)) + '</b><span>' + nome + '</span></div>' +
      '<div class="barra"><i class="' + classe + '" style="width:' + pc(v).toFixed(1) + '%"></i></div>' +
    '</div>';
  };
  return '<div class="idades">' +
    faixa(vencido, 'idade-vencido', 'já venceu e não entrou') +
    faixa(esteMes, 'idade-agora', 'vence ainda este mês') +
    faixa(depois, 'idade-depois', 'vence depois deste mês') +
  '</div>';
}

/* ------------------------------------------------------------------ */

DESENHO.dinheiro = function () {
  const projetos = dinheiroProjetos();
  const leituras = dinheiroLeituras();
  const hojeIso = hoje();

  // 1. esperando resposta: devolutiva enviada, com nivel indicado, e a
  // pessoa ainda nao virou projeto.
  const jaViraramProjeto = {};
  projetos.forEach(function (p) { jaViraramProjeto[p.leadId] = true; });

  let esperando = 0;
  let esperandoN = 0;
  leituras.forEach(function (l) {
    if (jaViraramProjeto[l.leadId]) return;
    if (l.veredito !== 'seguir') return;
    if (!(l.devolutiva && l.devolutiva.enviadaEm)) return;
    const nivel = dinheiroNivel(l.nivelIndicado);
    if (!nivel) return;
    esperando += Number(nivel.valor) || 0;
    esperandoN++;
  });

  // 2. contratado e 3. recebido
  let contratado = 0;
  let recebido = 0;
  let aReceber = 0;
  let vencidoNaoPago = 0;

  projetos.forEach(function (p) {
    contratado += Number(p.valor) || 0;
    dinheiroParcelas(p.id).forEach(function (parc) {
      const v = Number(parc.valor) || 0;
      if (parc.pagoEm) recebido += v;
      else {
        aReceber += v;
        if (parc.vencimento && parc.vencimento < hojeIso) vencidoNaoPago += v;
      }
    });
  });

  // O ".zero" existe no estilo justamente para o numero que nao aconteceu
  // parar de gritar do mesmo tamanho do que aconteceu, e nunca era emitido:
  // numa casa que ainda nao lancou baixa, o maior numero da tela era R$ 0.
  const z = function (v) { return Number(v) ? '' : ' zero'; };

  /* A abertura.

     O numero que paga a conta desta tela e o que ENTROU, e ele estava no
     terceiro de quatro ladrilhos iguais, do mesmo tamanho do que ainda e
     promessa. Aqui ele vem grande, e ao lado dele a barra que diz quanto
     do contratado ja virou caixa, que e a unica comparacao dos quatro
     numeros que se pode fazer sem misturar relogios diferentes. */
  const pcRecebido = contratado ? Math.round((recebido / contratado) * 100) : 0;
  escrever('dinheiroHeroi',
    '<div class="cartao heroi">' +
      '<div class="heroi-luz" aria-hidden="true"></div>' +
      '<div class="heroi-linha">' +
        '<div class="heroi-conta">' +
          '<div class="heroi-n' + z(recebido) + '">' + esc(moeda(recebido)) + '</div>' +
          '<div class="heroi-r">entraram de fato, de ' + esc(moeda(contratado)) + ' contratados ' +
            'em ' + projetos.length + (projetos.length === 1 ? ' projeto' : ' projetos') + '</div>' +
        '</div>' +
      '</div>' +
      (contratado
        ? '<div class="fita"><div class="fita-passo" style="grid-column:1/-1">' +
            '<div class="fita-cima"><b>' + pcRecebido + ' de cada 100</b>' +
              '<span>do que foi contratado já entrou</span></div>' +
            '<div class="fita-trilho"><i class="fita-enviou" style="width:' + pcRecebido + '%"></i></div>' +
            '<div class="fita-baixo">falta ' + esc(moeda(aReceber)) + '</div>' +
          '</div></div>'
        : '') +
      '<div class="heroi-pe">' +
        '<p class="dica">Baixa é lançada à mão, nunca pela TMB. Enquanto ninguém lançar, esta ' +
        'tela conta menos do que entrou de verdade.</p>' +
      '</div>' +
    '</div>');

  escrever('dinheiroNumeros',
    '<div class="numero"><div class="v' + z(esperando) + '">' + moeda(esperando) + '</div>' +
      '<div class="l">Esperando resposta</div>' +
      '<div class="obs">' + esperandoN + ' devolutiva(s) enviada(s), sem aceite</div></div>' +
    '<div class="numero"><div class="v' + z(contratado) + '">' + moeda(contratado) + '</div>' +
      '<div class="l">Contratado</div>' +
      '<div class="obs">' + projetos.length + ' projeto(s)</div></div>' +
    '<div class="numero' + (vencidoNaoPago ? ' puxa' : '') + '"><div class="v' + z(aReceber) + '">' + moeda(aReceber) + '</div>' +
      '<div class="l">Falta receber do que já foi vendido</div>' +
      '<div class="obs">' + (vencidoNaoPago ? moeda(vencidoNaoPago) + ' já venceu' : 'nada vencido') + '</div></div>');

  /* A idade do que falta. Um numero unico nao diz se e cobranca de hoje
     ou caixa de setembro. */
  const fimDoMes = hojeIso.slice(0, 8) + '31';
  let venceEsteMes = 0, venceDepois = 0;
  projetos.forEach(function (p) {
    dinheiroParcelas(p.id).forEach(function (parc) {
      if (parc.pagoEm) return;
      const v = Number(parc.valor) || 0;
      if (!parc.vencimento || parc.vencimento < hojeIso) return;   // vencido ja foi contado
      if (parc.vencimento <= fimDoMes) venceEsteMes += v; else venceDepois += v;
    });
  });
  escrever('dinheiroIdade', dinheiroIdadeHtml(vencidoNaoPago, venceEsteMes, venceDepois));

  // O aviso de que a tela pode estar mentindo para baixo.
  const ultimo = dinheiroUltimoLancamento();
  const diasSemLancar = ultimo ? diasDesde(ultimo) : null;
  // Isto vale para todo estado desta tela, entao nao e aviso: e legenda da
  // tira de numeros, na linha logo abaixo dela. Caixa colorida que nunca
  // some deixa de ser lida na segunda semana, e ainda ensina a pular as
  // caixas coloridas que importam.
  texto('dinheiroLegenda',
    'Estes três nunca se somam com o número de cima: são relógios diferentes. ' +
    'Um é promessa, um é contrato, e o de cima é caixa.');

  // O "nenhuma baixa foi lancada" so e noticia quando ha o que baixar. Sem
  // projeto contratado ele cobria cem por cento dos estados da tela, e o
  // proprio estado vazio da tabela ja explica que nada foi contratado.
  escrever('dinheiroAviso',
    (!ultimo && projetos.length
      ? aviso('atencao', 'Nenhuma baixa foi lançada ainda.',
          'Não existe conciliação com a TMB: enquanto ninguém der baixa aqui, a coluna "entrou" fica em zero mesmo que o dinheiro tenha caído.')
      : diasSemLancar > 14
        ? aviso('atencao', 'A última baixa foi ' + esc(haQuanto(ultimo)) + ', em ' + esc(dataCurta(ultimo)) + '.',
            'Como a baixa é manual, esta tela pode estar mentindo para baixo: pode ter entrado dinheiro que ninguém lançou.')
        : ''));

  // Entre o aceite e o comeco do trabalho.
  const semEntrada = projetos.filter(function (p) {
    return p.contrato && p.contrato.aceiteEm && !(p.contrato.entradaPagaEm);
  });
  escrever('dinheiroEntradas', projetos.length
    ? projetos.filter(function (p) { return p.contrato && p.contrato.aceiteEm; }).map(function (p) {
        const c = p.contrato || {};
        const dias = diasDesde(c.aceiteEm);
        const falta = !c.entradaPagaEm;
        // data-r: no telefone cada linha vira bloco e as tres datas ficavam
        // uma embaixo da outra sem dizer qual era qual.
        return '<tr>' +
          '<td data-t><b>' + esc(p.rotulo || p.cliente || 'sem nome') + '</b></td>' +
          '<td data-r="nível"><span class="eti eti-neutra">' + esc((dinheiroNivel(p.nivelContratado) || {}).nome || p.nivelContratado || '') + '</span></td>' +
          '<td data-r="aceitou">' + esc(dataCurta(c.aceiteEm)) + '<div class="dica">' + esc(haQuanto(c.aceiteEm)) + '</div></td>' +
          '<td data-r="contrato">' + (c.assinadoEm ? esc(dataCurta(c.assinadoEm)) : '<span class="dica">não assinado</span>') + '</td>' +
          '<td data-r="entrada">' + (c.entradaPagaEm ? esc(dataCurta(c.entradaPagaEm)) : '<span class="dica">não paga</span>') + '</td>' +
          '<td data-r="situação">' + (falta
            ? '<span class="eti eti-alerta">sem entrada há ' + (dias === null ? '?' : dias) + ' dias</span>'
            : '<span class="eti eti-ok">em ordem</span>') + '</td>' +
        '</tr>';
      }).join('') || vazio('Nenhum aceite registrado ainda.', 6)
    : vazio('Nada contratado ainda. Quando um aceite virar projeto no Diagnóstico, ele aparece aqui com o contrato e a entrada.', 6));

  // Calendario dos proximos doze meses.
  const meses = {};
  const agora = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(agora.getFullYear(), agora.getMonth() + i, 1);
    const am = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    meses[am] = { prometido: 0, entrou: 0, vencido: 0, quem: {} };
  }
  projetos.forEach(function (p) {
    dinheiroParcelas(p.id).forEach(function (parc) {
      const am = dinheiroMes(parc.vencimento);
      if (!meses[am]) return;
      const v = Number(parc.valor) || 0;
      meses[am].prometido += v;
      if (parc.pagoEm) meses[am].entrou += v;
      else if (parc.vencimento < hojeIso) meses[am].vencido += v;
      meses[am].quem[p.rotulo || p.cliente || 'sem nome'] = true;
    });
  });

  const chavesMes = Object.keys(meses).sort();
  const temAlgo = chavesMes.some(function (am) { return meses[am].prometido > 0; });

  // O ano em colunas. Doze linhas de tabela dizem quanto em cada mes;
  // doze colunas lado a lado dizem a FORMA do ano, que e o que se quer
  // saber de pe, olhando a tela por tres segundos.
  escrever('dinheiroGrafico', dinheiroCalendarioHtml(meses, chavesMes));

  escrever('dinheiroCalendario', temAlgo
    ? chavesMes.map(function (am) {
        const m = meses[am];
        if (!m.prometido) return '';
        const nomes = Object.keys(m.quem);
        return '<tr>' +
          '<td><b>' + esc(dinheiroRotuloMes(am)) + '</b></td>' +
          '<td>' + esc(moeda(m.prometido)) + '</td>' +
          '<td style="color:var(--ok)">' + (m.entrou ? esc(moeda(m.entrou)) : '<span class="dica">nada</span>') + '</td>' +
          '<td>' + (m.vencido ? '<span class="eti eti-alerta">' + esc(moeda(m.vencido)) + '</span>' : '<span class="dica">nada</span>') + '</td>' +
          '<td style="font-size:12.5px;color:var(--tx-2)">' + esc(nomes.slice(0, 3).join(', ')) +
            (nomes.length > 3 ? ' e mais ' + (nomes.length - 3) : '') + '</td>' +
        '</tr>';
      }).join('')
    : vazio('O calendário está vazio. Quando um aceite virar projeto, as parcelas nascem aqui já com as datas, ' +
            'e a única coisa que continua sendo trabalho seu é dar baixa no que entrar.', 5));

  // Por nivel: um Premium fechado hoje e caixa espalhado por um ano, e
  // tres Start podem valer mais neste mes.
  const porNivel = {};
  projetos.forEach(function (p) {
    const k = p.nivelContratado || 'sem nível';
    if (!porNivel[k]) porNivel[k] = { n: 0, contratado: 0, recebido: 0 };
    porNivel[k].n++;
    porNivel[k].contratado += Number(p.valor) || 0;
    dinheiroParcelas(p.id).forEach(function (parc) {
      if (parc.pagoEm) porNivel[k].recebido += Number(parc.valor) || 0;
    });
  });

  const chavesNivel = Object.keys(porNivel);
  // Tres numeros escritos um embaixo do outro em cada cartao viravam nove
  // numeros para comparar de cabeca. Desenhado, o que se ve de relance e o
  // que interessa: quanto de cada nivel ja virou caixa.
  const maiorNivel = Math.max.apply(null, chavesNivel.map(function (k) {
    return porNivel[k].contratado;
  }).concat([1]));
  escrever('dinheiroPorNivel', chavesNivel.length
    ? '<div class="niveis-dinheiro">' +
      chavesNivel.sort(function (a, b) { return porNivel[b].contratado - porNivel[a].contratado; })
      .map(function (k) {
        const d = porNivel[k];
        const falta = d.contratado - d.recebido;
        const pcEntrou = d.contratado ? Math.round((d.recebido / d.contratado) * 100) : 0;
        return '<div class="nivel-d">' +
          '<div class="nivel-d-t"><b>' + esc((dinheiroNivel(k) || {}).nome || k) + '</b>' +
            '<span>' + d.n + (d.n === 1 ? ' projeto' : ' projetos') + '</span>' +
            '<em>' + esc(moeda(d.contratado)) + '</em></div>' +
          // A barra e o contratado; o pedaco aceso e o que ja entrou.
          '<div class="barra" title="' + esc(moeda(d.recebido)) + ' de ' + esc(moeda(d.contratado)) + '">' +
            '<i style="width:' + ((d.contratado / maiorNivel) * 100).toFixed(1) + '%;background:var(--o-35)">' +
              '<u style="width:' + pcEntrou + '%"></u></i></div>' +
          '<div class="nivel-d-pe"><span>' + pcEntrou + ' de cada 100 já entrou</span>' +
            '<span>falta ' + esc(moeda(falta)) + '</span></div>' +
        '</div>';
      }).join('') + '</div>'
    : '<p class="dica">Sem projeto contratado, não há o que separar por nível. ' +
      'Quando houver, é aqui que fica visível que um Premium fechado hoje é caixa espalhado por um ano.</p>');
};
