/* =====================================================================
   Propostas.

   Tres coisas numa tela: montar a proposta, mostrar o codigo que o
   cliente vai digitar, e acompanhar o que ja foi enviado.

   O que fica no navegador: SO os dados da contratada e o WhatsApp que
   recebe os aceites, porque sao os mesmos em toda proposta e ninguem
   merece digitar isso vinte vezes. A proposta em si mora no servidor,
   como tem que ser: e dela que nasce um contrato.
   ===================================================================== */

let PROP_LISTA = [];
let PROP_ESTADO = 'carregando';   // carregando | lendo | pronto | erro
let PROP_ERRO = '';
let PROP_LEAD = null;             // lead pre-selecionado por quem veio da mesa

/* Os tres planos de fabrica, com os valores da proposta que a Carla ja
   usa. Sao ponto de partida editavel: quem monta a proposta muda o que
   quiser antes de criar. */
const PROP_PLANOS = [
  { t: 'ID Sob Medida, entregamos pronto', selo: 'Mais completo', val: 39900,
    esc: 'Produto, oferta, processos e lançamento construídos pela nossa equipe\n'
       + 'Ciclo de 90 dias com encontros semanais\n'
       + 'Apenas 4 clientes simultâneos, agenda dedicada',
    cond: '50% na assinatura + 50% em 30 dias · à vista no PIX menos 5%' },
  { t: 'Projeto ID, construímos junto (90 dias)', selo: 'Recomendado', val: 19900,
    esc: 'As 6 etapas do Método ID aplicadas com você, lado a lado\n'
       + 'Encontros semanais + suporte no WhatsApp',
    cond: '12x no cartão · à vista no PIX menos 5%' },
  { t: 'Imersão ID, 2 dias intensivos', selo: 'Porta de entrada', val: 7900,
    esc: 'Diagnóstico profundo, posicionamento e oferta desenhada\n'
       + 'Presencial ou online\n'
       + 'Roteiro de 90 dias pronto para executar\n'
       + '100% do valor vira crédito no Projeto ID em até 14 dias',
    cond: 'Online: R$ 4.900 · 12x no cartão · à vista no PIX menos 5%' },
];

const propDinheiro = (v) => 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 });

async function propPedir(caminho, metodo, corpo) {
  try {
    const opcoes = { method: metodo || 'GET', headers: cabecalhos(), cache: 'no-store' };
    if (corpo) {
      opcoes.headers['content-type'] = 'application/json';
      opcoes.body = JSON.stringify(corpo);
    }
    const r = await fetch(caminho, opcoes);
    let d = null;
    try { d = await r.json(); } catch (e) { d = null; }
    return { status: r.status, corpo: d };
  } catch (e) {
    return { status: 0, corpo: null };
  }
}

/* ------------------------------------------------------- a contratada */

function propContratadaSalva() {
  return iqvLer(CHAVES.contratada, {
    rs: '', cnpj: '', end: '', foro: 'São Paulo/SP', zap: '',
  });
}

function propGuardarContratada() {
  const c = {
    rs: String((porId('propRs') || {}).value || '').trim(),
    cnpj: String((porId('propCnpj') || {}).value || '').trim(),
    end: String((porId('propEnd') || {}).value || '').trim(),
    foro: String((porId('propForo') || {}).value || '').trim() || 'São Paulo/SP',
    zap: String((porId('propZap') || {}).value || '').trim(),
  };
  iqvGravar(CHAVES.contratada, c);
  return c;
}

/* ------------------------------------------------------- carregar */

/* A mesa carrega a lista de aplicações uma vez e depois quem manda é o
   botão "Buscar de novo". Isso valia quando a própria mesa era o único
   lugar que mexia no andamento. Agora não é: criar uma proposta põe a
   aplicação em "Proposta enviada", e o cliente assinando põe em "Virou
   projeto" do computador dele, sem passar por aqui. Sem esta linha a mesa
   seguiria mostrando o andamento de antes até alguém pedir de novo.

   Não recarrega agora: só marca que a lista envelheceu, e a próxima visita
   à mesa busca sozinha. */
function propMesaEnvelheceu() {
  if (typeof IDEIAS === 'object' && IDEIAS && IDEIAS.estado === 'ok') IDEIAS.estado = 'ocioso';
}

async function propCarregar() {
  const r = await propPedir('/api/propostas');
  if (r.status === 0) {
    PROP_ESTADO = 'erro';
    PROP_ERRO = 'Não consegui falar com o servidor. As propostas moram lá, não neste navegador.';
  } else if (r.status === 401) {
    PROP_ESTADO = 'erro';
    PROP_ERRO = 'A sua entrada venceu. Recarregue a página para entrar de novo.';
  } else if (r.status === 403) {
    PROP_ESTADO = 'erro';
    PROP_ERRO = 'O seu acesso não alcança as propostas.';
  } else if (!r.corpo || !r.corpo.ok) {
    PROP_ESTADO = 'erro';
    PROP_ERRO = r.corpo && r.corpo.erro ? primeiraMaiuscula(r.corpo.erro) : 'Não consegui ler a lista.';
  } else {
    PROP_LISTA = r.corpo.propostas || [];
    PROP_ESTADO = 'pronto';
    PROP_ERRO = '';
    if (PROP_LISTA.some(function (p) { return p.status === 'aceita'; })) propMesaEnvelheceu();
  }
  DESENHO.propostas();
}

/* Abrir a tela já com um lead escolhido, vindo do botão da mesa. */
function propParaOLead(id) {
  PROP_LEAD = Number(id) || null;
  irPara('propostas');
}

/* ------------------------------------------------------- criar */

function propLerPlano(i) {
  const marcado = porId('propUsa' + i);
  if (i > 0 && marcado && !marcado.checked) return null;
  return {
    t: String((porId('propT' + i) || {}).value || '').trim(),
    selo: String((porId('propSelo' + i) || {}).value || '').trim(),
    esc: String((porId('propEsc' + i) || {}).value || '')
      .split('\n').map(function (s) { return s.trim(); }).filter(Boolean),
    val: parseFloat((porId('propVal' + i) || {}).value),
    cond: String((porId('propCond' + i) || {}).value || '').trim(),
  };
}

async function propCriar() {
  escrever('propErro', '');
  const cliente = String((porId('propCliente') || {}).value || '').trim();
  const c = propGuardarContratada();
  const zap = c.zap.replace(/\D/g, '');

  if (!cliente) {
    escrever('propErro', aviso('alerta', 'Falta o nome de quem decide.',
      'É o nome que aparece no contrato como contratante.'));
    return;
  }
  // Recusar apontando para um campo fechado numa dobra e mandar a pessoa
  // procurar. Abre a dobra, leva o olho ate ela e poe o cursor no primeiro
  // campo que falta.
  const irParaOsDados = function (campo) {
    const dobra = porId('propDobraCasa');
    if (dobra) dobra.open = true;
    const alvo = porId(campo);
    if (alvo) { alvo.scrollIntoView({ block: 'center', behavior: 'smooth' }); alvo.focus(); }
  };

  if (!c.rs || !c.cnpj || !c.end) {
    escrever('propErro', aviso('alerta', 'Faltam os dados da sua empresa.',
      'A razão social, o CNPJ e o endereço entram no contrato. Abri o bloco para você: ' +
      'preencha uma vez e eles ficam guardados.'));
    irParaOsDados(!c.rs ? 'propRs' : !c.cnpj ? 'propCnpj' : 'propEnd');
    return;
  }
  // Os dois últimos dígitos do CNPJ são conta feita com os anteriores.
  // Conferir aqui pega a troca de dois dígitos de lugar, que é o erro de
  // digitação mais comum, antes de ele virar contrato assinado.
  if (!cnpjValido(c.cnpj)) {
    escrever('propErro', aviso('alerta', 'Este CNPJ não confere.',
      'Os dois últimos dígitos não batem com o resto do número. Confira em uma nota ou no cartão CNPJ: ' +
      'ele entra no contrato como a parte contratada.'));
    irParaOsDados('propCnpj');
    return;
  }
  if (zap.length < 12) {
    escrever('propErro', aviso('alerta', 'Falta o WhatsApp que recebe os aceites.',
      'Com o código do país e o DDD, por exemplo 5511999998888.'));
    irParaOsDados('propZap');
    return;
  }

  const planos = [propLerPlano(0), propLerPlano(1), propLerPlano(2)].filter(Boolean);
  if (!planos.length || planos.some(function (p) { return !p.t || !(p.val > 0); })) {
    escrever('propErro', aviso('alerta', 'Todo plano marcado precisa de nome e valor.',
      'Desmarque o que não vai nesta proposta.'));
    return;
  }

  const botao = porId('propCriarBt');
  if (botao) { botao.disabled = true; botao.textContent = 'Criando...'; }

  const r = await propPedir('/api/propostas', 'POST', {
    cliente: cliente,
    empresa: String((porId('propEmpresa') || {}).value || '').trim(),
    diagnostico: String((porId('propDiag') || {}).value || '').trim(),
    valida_ate: String((porId('propValida') || {}).value || '') || null,
    fundacao: !!(porId('propFundacao') || {}).checked,
    lead_id: PROP_LEAD,
    whatsapp_destino: zap,
    contratada: { rs: c.rs, cnpj: c.cnpj, end: c.end, foro: c.foro },
    planos: planos,
  });

  if (botao) { botao.disabled = false; botao.textContent = 'Criar a proposta e gerar o código'; }

  if (!r.corpo || !r.corpo.ok) {
    escrever('propErro', aviso('alerta',
      r.status === 0 ? 'Não consegui falar com o servidor.'
        : r.corpo && r.corpo.erro ? primeiraMaiuscula(r.corpo.erro)
        : 'Não consegui criar a proposta.',
      'Nada foi criado. Tente de novo.'));
    return;
  }

  propMostrarCodigo(r.corpo.codigo, cliente);
  propMesaEnvelheceu();
  await propCarregar();
}

/* O que a pessoa faz DEPOIS de criar: mandar o link e o codigo. Sem isto
   a tela diria "criada" e deixaria a Carla montando a mensagem na mao. */
function propMostrarCodigo(codigo, cliente) {
  const link = location.origin + '/proposta/';
  const primeiro = String(cliente).trim().split(/\s+/)[0] || '';
  const msg = (primeiro ? primeiro + ', sua' : 'Sua')
    + ' proposta está pronta. Abra o link e digite o código ' + codigo
    + ' para ver os planos, o contrato e assinar:\n' + link;

  const lead = PROP_LEAD ? (usuariosDaMesa() || []).find(function (l) { return l.id === PROP_LEAD; }) : null;
  const zapDoCliente = lead && lead.whatsapp ? String(lead.whatsapp).replace(/\D/g, '') : '';
  const paraOZap = zapDoCliente
    ? (zapDoCliente.length <= 11 ? '55' + zapDoCliente : zapDoCliente)
    : '';

  escrever('propFeito',
    '<div class="cartao" style="margin-top:var(--e3)">' +
      '<div class="cartao-t">Proposta criada</div>' +
      aviso('ok', 'O código é ' + esc(codigo),
        'Mande o link e o código para o cliente. Ele digita o código, escolhe o plano, lê o contrato e assina.') +
      '<div class="rolo-h" style="margin-top:var(--e2)">' +
        '<table class="lista"><tbody>' +
          '<tr><td style="white-space:nowrap;color:var(--tx-4)">Link</td><td>' + esc(link) + '</td></tr>' +
          '<tr><td style="white-space:nowrap;color:var(--tx-4)">Código</td><td><b>' + esc(codigo) + '</b></td></tr>' +
        '</tbody></table>' +
      '</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:var(--e3)">' +
        (paraOZap
          ? '<a class="bt bt-marca bt-sm" target="_blank" rel="noopener" href="https://wa.me/'
            + esc(paraOZap) + '?text=' + encodeURIComponent(msg) + '">Mandar no WhatsApp do cliente</a>'
          : '') +
        '<button class="bt bt-linha bt-sm" onclick="propCopiar(this)" ' +
          'data-copia="' + esc(msg) + '">Copiar a mensagem</button>' +
        '<button class="bt bt-linha bt-sm" onclick="propCopiar(this)" ' +
          'data-copia="' + esc(codigo) + '">Copiar só o código</button>' +
      '</div>' +
    '</div>');

  const onde = porId('propFeito');
  if (onde && onde.scrollIntoView) onde.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// A mesa lida com leads, e esta tela precisa do WhatsApp de um deles para
// o botao do WhatsApp existir. A lista ja foi lida pela tela "Ideias que
// chegaram"; aqui e so um atalho para o que estiver em memoria.
function usuariosDaMesa() {
  return (typeof IDEIAS !== 'undefined' && IDEIAS && IDEIAS.itens) ? IDEIAS.itens : [];
}

function propCopiar(botao) {
  const texto = botao.getAttribute('data-copia') || '';
  const antes = botao.textContent;
  const feito = function () { botao.textContent = 'Copiado'; setTimeout(function () { botao.textContent = antes; }, 1800); };
  const falhou = function () { botao.textContent = 'Copie na mão'; setTimeout(function () { botao.textContent = antes; }, 2400); };
  try {
    if (navigator.clipboard) navigator.clipboard.writeText(texto).then(feito, falhou);
    else falhou();
  } catch (e) { falhou(); }
}

/* ------------------------------------------------------- desenho */

function propCampo(id, rotulo, extras) {
  const e = extras || {};
  const tag = e.linhas ? 'textarea' : 'input';
  // A mascara so precisa ser declarada; quem a prende e o escrever() da
  // casa, logo depois de o campo nascer.
  const mascara = e.mascara
    ? ' data-mascara="' + e.mascara + '" inputmode="numeric"' +
      (e.maximo ? ' maxlength="' + e.maximo + '"' : '')
    : '';
  return '<div' + (e.largo ? ' class="largo"' : '') + '>' +
    '<label class="rotulo" for="' + id + '">' + esc(rotulo) + '</label>' +
    '<' + tag + ' class="campo campo-sm" id="' + id + '"' + mascara +
      (e.tipo ? ' type="' + e.tipo + '"' : '') +
      (e.linhas ? ' rows="' + e.linhas + '"' : '') +
      (e.dica ? ' placeholder="' + esc(e.dica) + '"' : '') +
      (e.linhas ? '>' + esc(e.valor || '') + '</textarea>' : ' value="' + esc(e.valor || '') + '">') +
    '</div>';
}

function propBlocoPlano(i) {
  const p = PROP_PLANOS[i];
  const marcado = i === 0 ? '' :
    '<label class="li" style="margin:0 0 12px">' +
      '<input type="checkbox" id="propUsa' + i + '"' + (i === 1 ? ' checked' : '') +
      ' onchange="porId(\'propPlano' + i + '\').hidden = !this.checked">' +
      '<span>Incluir este plano na proposta</span>' +
    '</label>';
  return '<div style="border-top:1px solid var(--fio);padding-top:var(--e3);margin-top:var(--e3)">' +
    '<b style="font-family:var(--display);font-size:14px;display:block;margin-bottom:10px">' +
      'Plano ' + (i + 1) + (i === 0 ? '' : ' (opcional)') + '</b>' +
    marcado +
    '<div id="propPlano' + i + '"' + (i === 2 ? ' hidden' : '') + '>' +
      '<div class="grade-2" style="gap:12px">' +
        propCampo('propT' + i, 'Nome do plano', { valor: p.t }) +
        propCampo('propSelo' + i, 'Selo', { valor: p.selo, dica: 'Recomendado, Mais completo...' }) +
        propCampo('propVal' + i, 'Valor em reais', { valor: String(p.val), tipo: 'number' }) +
        propCampo('propCond' + i, 'Condições', { valor: p.cond }) +
      '</div>' +
      propCampo('propEsc' + i, 'O que está incluído, uma linha por item', { linhas: 4, valor: p.esc }) +
    '</div>' +
  '</div>';
}

DESENHO.propostas = function () {
  const c = propContratadaSalva();
  const daqui8 = new Date(Date.now() + 8 * 864e5).toISOString().slice(0, 10);

  // ---- nova proposta
  const deQuem = PROP_LEAD
    ? (usuariosDaMesa().find(function (l) { return l.id === PROP_LEAD; }) || null)
    : null;

  // A dobra abre sozinha quando se chegou aqui pelo botao da mesa, ou
  // quando ja estava aberta: fechar no meio de um preenchimento seria pior
  // que qualquer economia de altura.
  const dobra = porId('propDobraNova');
  if (dobra && PROP_LEAD) dobra.open = true;
  if (dobra) {
    const resumo = dobra.querySelector('summary b');
    if (resumo) {
      resumo.textContent = deQuem
        ? 'Criar a proposta de ' + (deQuem.nome || deQuem.email || ('aplicação ' + PROP_LEAD))
        : 'Criar uma proposta nova';
    }
  }

  escrever('propNova',
    (deQuem
      ? aviso('info', 'Proposta para ' + esc(deQuem.nome || deQuem.email || ('aplicação ' + PROP_LEAD)),
        'Ela nasce ligada a essa aplicação: quando o cliente assinar, ela vira "ganho" na mesa sozinha.')
      : '') +
    '<div class="grade-2" style="gap:12px">' +
      propCampo('propCliente', 'Quem decide', { valor: deQuem ? (deQuem.nome || '') : '', dica: 'nome de quem assina' }) +
      propCampo('propEmpresa', 'Empresa', { dica: 'opcional' }) +
    '</div>' +
    propCampo('propDiag', 'O que você viu', { linhas: 3, dica: 'duas ou três frases, na linguagem do cliente' }) +
    '<div class="grade-2" style="gap:12px;margin-top:12px">' +
      propCampo('propValida', 'Válida até', { tipo: 'date', valor: daqui8 }) +
      '<div><label class="li" style="margin-top:22px">' +
        '<input type="checkbox" id="propFundacao">' +
        '<span>Condição de fundação (autoriza usar o case)</span>' +
      '</label></div>' +
    '</div>' +
    propBlocoPlano(0) + propBlocoPlano(1) + propBlocoPlano(2) +
    '<button class="bt bt-marca" id="propCriarBt" style="margin-top:var(--e3)" ' +
      'onclick="propCriar()">Criar a proposta e gerar o código</button>');

  // ---- dados do contrato
  escrever('propContratada',
    '<div class="grade-2" style="gap:12px">' +
      propCampo('propRs', 'Razão social', { valor: c.rs, dica: 'como está no CNPJ' }) +
      propCampo('propCnpj', 'CNPJ', { valor: c.cnpj, dica: '00.000.000/0001-00',
        mascara: 'cnpj', maximo: 18 }) +
      propCampo('propEnd', 'Endereço', { valor: c.end, dica: 'rua, número, cidade e estado' }) +
      propCampo('propForo', 'Foro', { valor: c.foro, dica: 'a comarca do contrato' }) +
      propCampo('propZap', 'WhatsApp que recebe os aceites', { valor: c.zap,
        dica: '+55 (11) 99999-8888', mascara: 'zap', maximo: 19 }) +
    '</div>');

  // A dobra dos dados da casa abre sozinha enquanto faltar alguma coisa, e
  // o resumo dela diz o que falta. Sem isso a pessoa preenchia a proposta
  // inteira, clicava em criar e era recusada por um campo que ela nem
  // tinha visto, no pé da tela.
  const faltam = [];
  if (!String(c.rs || '').trim()) faltam.push('razão social');
  if (!String(c.cnpj || '').trim()) faltam.push('CNPJ');
  if (!String(c.end || '').trim()) faltam.push('endereço');
  if (!String(c.zap || '').trim()) faltam.push('WhatsApp');

  const dobraCasa = porId('propDobraCasa');
  if (dobraCasa && faltam.length) dobraCasa.open = true;
  escrever('propCasaSelo', faltam.length
    ? '<span class="eti eti-atencao">falta ' + esc(faltam.join(', ')) + '</span>'
    : '<span class="eti eti-ok">guardados</span>');
  texto('propCasaResumo', faltam.length
    ? 'Preencha os dados da sua empresa'
    : 'Os dados da sua empresa no contrato');

  // ---- a lista
  if (PROP_ESTADO === 'carregando') {
    escrever('propAviso', '<p class="dica" style="margin:-8px 0 16px">Lendo as propostas no servidor.</p>');
    escrever('propLista', vazio('Um instante.', 5));
    escrever('propConta', '');
    PROP_ESTADO = 'lendo';
    propCarregar();
    return;
  }
  if (PROP_ESTADO === 'erro') {
    escrever('propAviso', aviso('alerta', PROP_ERRO, 'As propostas moram no servidor, e não neste navegador.') +
      '<button class="bt bt-linha bt-sm" style="margin-bottom:14px" onclick="propCarregar()">Tentar de novo</button>');
    escrever('propLista', vazio('Não consegui ler a lista.', 5));
    escrever('propConta', '');
    return;
  }

  escrever('propAviso', '');
  escrever('propConta', PROP_LISTA.length
    ? PROP_LISTA.length + (PROP_LISTA.length === 1 ? ' enviada' : ' enviadas')
    : '');

  escrever('propLista', PROP_LISTA.length
    ? PROP_LISTA.map(function (p) {
        const situacao = p.status === 'aceita' ? ['ok', 'aceita']
          : p.expirada ? ['neutra', 'vencida']
          : p.status === 'vista' ? ['atencao', 'o cliente abriu']
          : ['neutra', 'enviada, ainda não abriu'];
        return '<tr>' +
          '<td><b>' + esc(p.codigo) + '</b></td>' +
          '<td>' + esc(p.cliente || '') +
            (p.empresa ? '<span style="display:block;font-size:12.5px;color:var(--tx-4)">' + esc(p.empresa) + '</span>' : '') +
          '</td>' +
          '<td><span class="eti eti-' + situacao[0] + '">' + situacao[1] + '</span></td>' +
          '<td>' + (p.status === 'aceita'
            ? esc(p.plano_titulo || '') +
              '<span style="display:block;font-size:12.5px;color:var(--tx-4)">' +
              propDinheiro(p.valor) + ' · ' + esc(p.aceite_nome || '') + '</span>'
            : '<span style="color:var(--tx-4)">,</span>') + '</td>' +
          '<td style="text-align:right;white-space:nowrap">' +
            '<button class="bt bt-linha bt-sm" onclick="propCopiar(this)" data-copia="' +
              esc(location.origin + '/proposta/') + '">Copiar link</button> ' +
            '<button class="bt bt-linha bt-sm" onclick="propCopiar(this)" data-copia="' +
              esc(p.codigo) + '">Copiar código</button>' +
          '</td>' +
        '</tr>';
      }).join('')
    : vazio('Nenhuma proposta ainda. A primeira nasce aqui em cima, ou pelo botão "Gerar proposta" na tela das ideias que chegaram.', 5));
};
