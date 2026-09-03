/* =====================================================================
   Contratado e recebido

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
  escrever('dinheiroNumeros',
    '<div class="numero"><div class="v' + z(esperando) + '">' + moeda(esperando) + '</div>' +
      '<div class="l">Esperando resposta</div>' +
      '<div class="obs">' + esperandoN + ' devolutiva(s) enviada(s), sem aceite</div></div>' +
    '<div class="numero"><div class="v' + z(contratado) + '">' + moeda(contratado) + '</div>' +
      '<div class="l">Contratado</div>' +
      '<div class="obs">' + projetos.length + ' projeto(s)</div></div>' +
    '<div class="numero"><div class="v' + z(recebido) + '">' + moeda(recebido) + '</div>' +
      '<div class="l">Recebido de fato</div>' +
      '<div class="obs">lançado à mão, nunca pela TMB</div></div>' +
    '<div class="numero' + (vencidoNaoPago ? ' puxa' : '') + '"><div class="v' + z(aReceber) + '">' + moeda(aReceber) + '</div>' +
      '<div class="l">Falta receber do que já foi vendido</div>' +
      '<div class="obs">' + (vencidoNaoPago ? moeda(vencidoNaoPago) + ' já venceu' : 'nada vencido') + '</div></div>');

  // O aviso de que a tela pode estar mentindo para baixo.
  const ultimo = dinheiroUltimoLancamento();
  const diasSemLancar = ultimo ? diasDesde(ultimo) : null;
  // Isto vale para todo estado desta tela, entao nao e aviso: e legenda da
  // tira de numeros, na linha logo abaixo dela. Caixa colorida que nunca
  // some deixa de ser lida na segunda semana, e ainda ensina a pular as
  // caixas coloridas que importam.
  texto('dinheiroLegenda',
    'Os três primeiros nunca se somam: são relógios diferentes, um é promessa, ' +
    'um é contrato e um é caixa. O quarto, quanto falta receber, é o que costuma ' +
    'pegar as pessoas de surpresa.');

  escrever('dinheiroAviso',
    (!ultimo
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
        return '<tr>' +
          '<td><b>' + esc(p.rotulo || p.cliente || 'sem nome') + '</b></td>' +
          '<td><span class="eti eti-neutra">' + esc((dinheiroNivel(p.nivelContratado) || {}).nome || p.nivelContratado || '') + '</span></td>' +
          '<td>' + esc(dataCurta(c.aceiteEm)) + '<div class="dica">' + esc(haQuanto(c.aceiteEm)) + '</div></td>' +
          '<td>' + (c.assinadoEm ? esc(dataCurta(c.assinadoEm)) : '<span class="dica">não assinado</span>') + '</td>' +
          '<td>' + (c.entradaPagaEm ? esc(dataCurta(c.entradaPagaEm)) : '<span class="dica">não paga</span>') + '</td>' +
          '<td>' + (falta
            ? '<span class="eti eti-alerta">sem entrada há ' + (dias === null ? '?' : dias) + ' dias</span>'
            : '<span class="eti eti-ok">em ordem</span>') + '</td>' +
        '</tr>';
      }).join('') || vazio('Nenhum aceite registrado ainda.', 6)
    : vazio('Nada contratado ainda. Quando um aceite virar projeto na Leitura do caso, ele aparece aqui com o contrato e a entrada.', 6));

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
  escrever('dinheiroPorNivel', chavesNivel.length
    ? '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px">' +
      chavesNivel.map(function (k) {
        const d = porNivel[k];
        const falta = d.contratado - d.recebido;
        return '<div style="border:1px solid var(--fio);border-radius:var(--r-sm);padding:16px">' +
          '<b style="color:var(--claro);font-size:14px">' + esc((dinheiroNivel(k) || {}).nome || k) + '</b>' +
          '<div class="dica" style="margin-top:2px">' + d.n + ' projeto(s)</div>' +
          '<div style="margin-top:12px;font-size:13px">Contratado: <b>' + esc(moeda(d.contratado)) + '</b></div>' +
          '<div style="font-size:13px;color:var(--ok)">Recebido: ' + esc(moeda(d.recebido)) + '</div>' +
          '<div style="font-size:13px;color:var(--tx-3)">Falta: ' + esc(moeda(falta)) + '</div>' +
        '</div>';
      }).join('') + '</div>'
    : '<p class="dica">Sem projeto contratado, não há o que separar por nível. ' +
      'Quando houver, é aqui que fica visível que um Premium fechado hoje é caixa espalhado por um ano.</p>');
};
