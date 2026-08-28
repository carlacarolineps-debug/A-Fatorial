/* =====================================================================
   Meu projeto

   O cliente pagou de 8 a 28 mil reais e quer ver o dinheiro virando
   alguma coisa. Esta tela existe para ele nao precisar pedir noticia no
   WhatsApp, e para quem executa ver exatamente o que ele esta vendo.

   Regras que nao se quebram aqui:
   - todo numero com carimbo de data, porque isto e um retrato e nao o agora
   - nunca dado de terceiro, nunca valor de outro cliente
   - nunca a leitura interna do caso: aquilo e conversa da casa
   ===================================================================== */

// O estado da entrega em linguagem de fora. Dentro da casa chama outra
// coisa, e tudo bem: quem le aqui nao trabalha aqui.
const CLIENTE_ESTADO = {
  nao_comecou: { nome: 'ainda não começou', eti: 'eti-neutra' },
  escrevendo:  { nome: 'em construção',     eti: 'eti-info' },
  com_cliente: { nome: 'esperando você',    eti: 'eti-atencao' },
  aprovada:    { nome: 'aprovada por você', eti: 'eti-ok' },
};

// Os blocos do produto pronto, e qual entrega preenche cada um.
const CLIENTE_PRODUTO = [
  { k: 'posicionamento', bloco: 'Para quem é e o que promete' },
  { k: 'metodo',         bloco: 'O seu método, com as etapas' },
  { k: 'jornada',        bloco: 'A experiência do seu cliente' },
  { k: 'preco',          bloco: 'Quanto custa e o que sustenta' },
  { k: 'materiais',      bloco: 'Os materiais para operar' },
  { k: 'comercial',      bloco: 'Como a oferta chega ao mercado' },
  { k: 'execucao',       bloco: 'O que fazer na segunda de manhã' },
];

function clienteProjetos() { return iqvLer(CHAVES.projetos, []); }

function clienteNiveis() {
  const metodo = iqvLer(CHAVES.metodo, null);
  return (metodo && metodo.niveis) || NIVEIS_DEFAULT;
}

function clienteNivel(k) {
  return clienteNiveis().find(function (n) { return n.k === k; }) || null;
}

// Quem e o cliente: se o papel e cliente, e o projeto dele. Se e alguem da
// casa, e uma escolha, porque a razao desta tela existir para a casa e
// justamente ver o que o cliente ve.
let CLIENTE_ESCOLHIDO = null;

function clienteProjetoAtual() {
  const todos = clienteProjetos();
  if (!todos.length) return null;
  if (EU.papel === 'cliente') {
    const meu = todos.find(function (p) {
      return EU.email && String(p.email || '').toLowerCase() === String(EU.email).toLowerCase();
    });
    return meu || null;
  }
  if (CLIENTE_ESCOLHIDO) {
    const achado = todos.find(function (p) { return p.id === CLIENTE_ESCOLHIDO; });
    if (achado) return achado;
  }
  return todos[0];
}

function clienteEscolher(id) { CLIENTE_ESCOLHIDO = id; DESENHO.cliente(); }

function clienteEntrega(projeto, k) {
  return (projeto.entregas || []).find(function (e) { return e.k === k; }) || null;
}

/* ------------------------------------------------------------------ */

DESENHO.cliente = function () {
  const daCasa = EU.papel !== 'cliente';
  const projeto = clienteProjetoAtual();

  // A casa escolhe qual cliente esta olhando.
  escrever('clienteEscolha', daCasa && clienteProjetos().length
    ? '<div class="cartao" style="padding:16px 20px">' +
        '<span class="rotulo" style="display:inline;margin-right:10px">Você está vendo como</span>' +
        '<select class="campo campo-sm" style="max-width:320px" onchange="clienteEscolher(this.value)">' +
          clienteProjetos().map(function (p) {
            return '<option value="' + esc(p.id) + '"' + (projeto && p.id === projeto.id ? ' selected' : '') + '>' +
              esc(p.cliente || p.rotulo || 'sem nome') + '</option>';
          }).join('') +
        '</select>' +
        '<span class="dica" style="margin-left:12px">Esta é a tela exata que o cliente enxerga.</span>' +
      '</div>'
    : '');

  if (!projeto) {
    escrever('clienteSelo', 'Em avaliação');
    escrever('clienteBola', 'Sua aplicação está em <b>avaliação</b>.');
    texto('clienteBolaDetalhe',
      'Quando a leitura do seu caso ficar pronta, você recebe o retorno no WhatsApp ou no e-mail que deixou. ' +
      'A partir daí esta tela passa a mostrar as oito entregas do seu projeto, com o que já está pronto e o que espera você.');
    escrever('clienteEspera', '');
    escrever('clienteFases', '<p class="dica">Nada foi publicado aqui ainda.</p>');
    escrever('clienteEntregas', '');
    escrever('clienteProduto', '');
    escrever('clienteContrato', '');
    texto('clienteRetrato', '');
    return;
  }

  const nivel = clienteNivel(projeto.nivelContratado);
  const escopo = (nivel && nivel.escopo) || [];

  // 1. De quem e a bola, antes de tudo.
  const esperandoEle = (projeto.entregas || []).filter(function (e) {
    return e.noEscopo && e.estado === 'com_cliente';
  });

  escrever('clienteSelo', 'Seu projeto');
  if (esperandoEle.length) {
    escrever('clienteBola', esperandoEle.length + (esperandoEle.length === 1
      ? ' coisa esperando <b>você</b>.' : ' coisas esperando <b>você</b>.'));
    texto('clienteBolaDetalhe', 'Enquanto isso não voltar, a fase ' + nomeFase(projeto.fase) + ' não avança.');
    escrever('clienteEspera',
      '<div class="cartao" style="border-color:var(--atencao)">' +
        '<div class="cartao-t" style="color:var(--atencao)">O que depende de você</div>' +
        esperandoEle.map(function (e) {
          const dias = diasDesde(e.enviadaEm);
          return '<div style="display:flex;justify-content:space-between;gap:14px;padding:10px 0;border-bottom:1px solid var(--fio-2)">' +
            '<div><b>' + esc(nomeEntrega(e.k)) + '</b>' +
              '<div class="dica">enviada em ' + esc(dataCurta(e.enviadaEm)) +
              (dias !== null && dias > 0 ? ', esperando há ' + dias + ' dias' : '') + '</div></div>' +
            '<span class="eti eti-atencao">esperando você</span>' +
          '</div>';
        }).join('') +
      '</div>');
  } else {
    escrever('clienteBola', 'Está com a <b>gente</b>.');
    texto('clienteBolaDetalhe', projeto.produtoProntoEm
      ? 'Produto pronto previsto para ' + dataCurta(projeto.produtoProntoEm) + '. Nada depende de você agora.'
      : 'Nada depende de você agora.');
    escrever('clienteEspera', '');
  }

  // 2. A regua das quatro fases.
  escrever('clienteFases',
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px">' +
    FASES.map(function (f) {
      const passou = f.n < Number(projeto.fase);
      const agora = f.n === Number(projeto.fase);
      const cor = agora ? 'var(--o)' : passou ? 'var(--ok)' : 'var(--fio)';
      return '<div style="border:1px solid ' + cor + ';border-top:3px solid ' + cor +
        ';border-radius:var(--r-sm);padding:14px 16px;opacity:' + (agora || passou ? '1' : '.55') + '">' +
        '<div style="font-family:var(--display);font-size:11px;color:' + cor + ';font-weight:700">Fase ' +
          String(f.n).padStart(2, '0') + '</div>' +
        '<b style="display:block;font-size:14px;color:var(--claro);margin-top:4px">' + esc(f.nome) + '</b>' +
        '<p class="dica" style="margin-top:5px">' + esc(f.resumo) + '</p>' +
        (agora && nomeEtapa(projeto.etapa) !== '?'
          ? '<div class="eti eti-marca" style="margin-top:10px">etapa: ' + esc(nomeEtapa(projeto.etapa)) + '</div>' : '') +
      '</div>';
    }).join('') + '</div>');

  // 3. As oito entregas, sempre visiveis. As que estao fora do nivel
  // aparecem apagadas e nomeadas: isso transforma boleto em extrato.
  const premium = clienteNivel('premium');
  escrever('clienteEntregas',
    ENTREGAS.map(function (def) {
      const e = clienteEntrega(projeto, def.k);
      const dentro = e ? !!e.noEscopo : escopo.indexOf(def.k) >= 0;
      const estado = CLIENTE_ESTADO[(e && e.estado) || 'nao_comecou'];

      if (!dentro) {
        // Onde ela entra, e quanto custa a diferenca.
        const ondeEntra = clienteNiveis().find(function (n) { return (n.escopo || []).indexOf(def.k) >= 0; });
        const diferenca = ondeEntra && nivel ? (Number(ondeEntra.valor) || 0) - (Number(nivel.valor) || 0) : 0;
        return '<div style="display:flex;justify-content:space-between;gap:14px;align-items:center;' +
          'padding:14px 0;border-bottom:1px solid var(--fio-2);opacity:.55">' +
          '<div><b style="color:var(--tx-3)">' + esc(def.nome) + '</b>' +
            '<div class="dica">' + esc(def.resumo) + '</div></div>' +
          '<div style="text-align:right;white-space:nowrap">' +
            (ondeEntra ? '<span class="eti eti-neutra">faz parte do ' + esc(ondeEntra.nome) + '</span>' : '') +
            (diferenca > 0 ? '<div class="dica" style="margin-top:5px">diferença de ' + esc(moeda(diferenca)) + '</div>' : '') +
          '</div>' +
        '</div>';
      }

      return '<div style="display:flex;justify-content:space-between;gap:14px;align-items:center;' +
        'padding:14px 0;border-bottom:1px solid var(--fio-2)">' +
        '<div><b>' + esc(def.nome) + '</b>' +
          '<div class="dica">' + esc(def.resumo) + '</div></div>' +
        '<div style="text-align:right;white-space:nowrap">' +
          '<span class="eti ' + estado.eti + '">' + esc(estado.nome) + '</span>' +
          (e && e.aprovadaEm ? '<div class="dica" style="margin-top:5px">em ' + esc(dataCurta(e.aprovadaEm)) + '</div>' : '') +
        '</div>' +
      '</div>';
    }).join(''));

  // 4. O produto montando ao vivo.
  escrever('clienteProduto',
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px">' +
    CLIENTE_PRODUTO.map(function (b) {
      const e = clienteEntrega(projeto, b.k);
      const aceso = e && e.noEscopo && e.estado === 'aprovada';
      const fora = e ? !e.noEscopo : escopo.indexOf(b.k) < 0;
      return '<div style="border:1px solid ' + (aceso ? 'var(--o-35)' : 'var(--fio)') +
        ';border-radius:var(--r-sm);padding:16px;background:' + (aceso ? 'var(--o-05)' : 'transparent') +
        ';opacity:' + (fora ? '.4' : '1') + '">' +
        '<b style="display:block;font-size:13.5px;color:' + (aceso ? 'var(--claro)' : 'var(--tx-3)') + '">' +
          esc(b.bloco) + '</b>' +
        '<div class="dica" style="margin-top:6px">' +
          (aceso ? 'pronto, aprovado por você'
                 : fora ? 'não faz parte do seu nível'
                        : 'vai ser preenchido por ' + esc(nomeEntrega(b.k))) +
        '</div></div>';
    }).join('') + '</div>');

  // 5. O que ele contratou, e a linha que evita a briga do quarto mes.
  const recebimento = iqvLer(CHAVES.recebimentos, []).find(function (r) { return r.projetoId === projeto.id; });
  const parcelas = (recebimento && recebimento.parcelas) || [];
  const pagas = parcelas.filter(function (p) { return p.pagoEm; });

  escrever('clienteContrato',
    '<div class="numeros" style="margin-bottom:16px">' +
      '<div class="numero"><div class="v">' + esc((nivel && nivel.nome) || projeto.nivelContratado || '') + '</div>' +
        '<div class="l">Seu nível</div></div>' +
      '<div class="numero"><div class="v">' + esc(moeda(projeto.valor)) + '</div>' +
        '<div class="l">Investimento</div></div>' +
      '<div class="numero"><div class="v">' + pagas.length + ' de ' + parcelas.length + '</div>' +
        '<div class="l">Parcelas pagas</div>' +
        '<div class="obs">' + (parcelas.length ? 'até 12x no PIX ou boleto, via TMB' : 'nenhuma lançada ainda') + '</div></div>' +
      '<div class="numero"><div class="v">' + esc(projeto.produtoProntoEm ? dataCurta(projeto.produtoProntoEm) : 'a definir') + '</div>' +
        '<div class="l">Produto pronto previsto</div></div>' +
    '</div>' +
    aviso('info', 'Nós estruturamos a oferta.',
      'A venda e a operação comercial continuam com você. Isso estava na proposta e vale a pena estar escrito aqui também, ' +
      'para não virar conversa no quarto mês.'));

  // O carimbo. Sem ele, alguem confunde o retrato com o agora.
  const retrato = iqvLer(CHAVES.retratos, []).find(function (r) { return r.projetoId === projeto.id; });
  texto('clienteRetrato', retrato && retrato.publicadoEm
    ? 'Retrato de ' + dataLonga(retrato.publicadoEm) + '. O que você está vendo é desta data, não de agora.'
    : 'Ainda não houve publicação: esta tela está mostrando o andamento como ele está guardado neste navegador.');
};
