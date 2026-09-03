/* =====================================================================
   Roteiros e niveis

   A empresa cobra de 8 a 28 mil reais para acabar com o improviso a cada
   cliente. Ela nao pode montar a propria entrega do zero a cada projeto.
   Esta tela e onde o metodo da casa fica escrito.

   E o UNICO lugar do sistema onde preco se edita, e e daqui que a leitura
   do caso, a devolutiva e o projeto copiam.
   ===================================================================== */

// A pergunta que cada entrega responde. Sai da landing: "cada entrega
// responde uma pergunta: o que e, para quem, por que funciona, quanto
// custa e como apresentar".
const ROTEIROS_PERGUNTA = {
  diagnostico:    'De onde essa pessoa está partindo, de verdade.',
  posicionamento: 'Para quem é, e por que é para essa pessoa e não para todo mundo.',
  metodo:         'Por que funciona, e em que ordem.',
  jornada:        'O que o cliente dela vive antes, durante e depois.',
  preco:          'Quanto custa, e o que sustenta esse preço.',
  materiais:      'Com o que ela opera isso na prática.',
  comercial:      'Como essa oferta chega ao mercado.',
  execucao:       'O que ela faz na segunda-feira de manhã.',
};

// O roteiro nasce VAZIO. A frase de lembrete vive no placeholder do campo,
// e nao no dado: gravada, ela seria copiada para dentro de cada projeto e
// viraria um item de conferencia que ninguem consegue cumprir.
function roteirosPadrao() {
  const roteiros = {};
  ENTREGAS.forEach(function (e) {
    roteiros[e.k] = {
      definicaoPronto: [],
      perguntas: [],
      comoFazer: '',
      modelo: '',
    };
  });
  return { niveis: JSON.parse(JSON.stringify(NIVEIS_DEFAULT)), roteiros: roteiros };
}

function roteirosLer() {
  const salvo = iqvLer(CHAVES.metodo, null);
  if (!salvo) return roteirosPadrao();

  // Entrega ou nivel que passou a existir depois nao pode sumir da tela
  // so porque o que esta salvo e mais velho que o codigo.
  const base = roteirosPadrao();
  const metodo = { niveis: salvo.niveis || base.niveis, roteiros: {} };
  ENTREGAS.forEach(function (e) {
    metodo.roteiros[e.k] = (salvo.roteiros && salvo.roteiros[e.k]) || base.roteiros[e.k];
  });
  return metodo;
}

function roteirosGravar(metodo) {
  if (iqvGravar(CHAVES.metodo, metodo)) return true;
  DESENHO.roteiros();
  return false;
}

// Quem edita e a Equipe. O colaborador le, porque precisa saber o que
// entregar, mas preco e escopo nao sao decisao dele.
function roteirosPodeEditar() { return EU.papel === 'gestor'; }

/* ------------------------------------------------------------------ */

function roteirosCartaoNivel(nivel, editavel) {
  const noEscopo = ENTREGAS.filter(function (e) { return (nivel.escopo || []).indexOf(e.k) >= 0; });
  const fora = ENTREGAS.filter(function (e) { return (nivel.escopo || []).indexOf(e.k) < 0; });

  return '' +
    '<div style="border:1px solid var(--fio);border-radius:var(--r);padding:20px;background:var(--fundo-3)">' +
      '<div style="display:flex;align-items:baseline;gap:10px;flex-wrap:wrap">' +
        '<b style="font-family:var(--display);font-size:17px;color:var(--claro)">' + esc(nivel.nome) + '</b>' +
        '<span class="eti eti-marca">' + esc(moeda(nivel.valor)) + '</span>' +
      '</div>' +
      '<p class="dica" style="margin:8px 0 14px">' + esc(nivel.resumo) + '</p>' +

      (editavel
        ? '<label class="rotulo">Valor à vista</label>' +
          '<div style="display:flex;gap:8px;margin-bottom:14px">' +
            '<input class="campo campo-sm" type="number" min="0" step="10" id="roteirosValor-' + nivel.k + '" value="' + Number(nivel.valor || 0) + '">' +
            '<button class="bt bt-marca bt-sm" onclick="roteirosSalvarValor(\'' + nivel.k + '\')">Salvar</button>' +
          '</div>'
        : '') +

      '<div class="rotulo">Entra neste nível</div>' +
      '<div style="display:flex;flex-direction:column;gap:6px">' +
        ENTREGAS.map(function (e) {
          const dentro = (nivel.escopo || []).indexOf(e.k) >= 0;
          const marca = editavel
            ? '<input type="checkbox" ' + (dentro ? 'checked ' : '') +
              'onchange="roteirosAlternarEscopo(\'' + nivel.k + '\',\'' + e.k + '\')" ' +
              'style="accent-color:var(--o);margin-right:8px">'
            : '<span style="color:' + (dentro ? 'var(--o)' : 'var(--tx-4)') + ';margin-right:8px">' +
              (dentro ? '✓' : '·') + '</span>';
          return '<label style="display:flex;align-items:center;font-size:12.5px;color:' +
                 (dentro ? 'var(--tx)' : 'var(--tx-4)') + ';cursor:' + (editavel ? 'pointer' : 'default') + '">' +
                 marca + esc(e.nome) + '</label>';
        }).join('') +
      '</div>' +

      '<div class="dica" style="margin-top:12px">' +
        noEscopo.length + ' de ' + ENTREGAS.length + ' entregas' +
        (fora.length ? '. Fora: ' + esc(fora.map(function (e) { return e.nome; }).join(', ')) : '') +
      '</div>' +
    '</div>';
}

/* As oito entregas, uma de cada vez.

   Abertas todas ao mesmo tempo, com quatro campos cada, esta tela tinha
   treze mil pixels de altura: para conferir a oitava era preciso rolar por
   sete formularios que ninguem pediu para ver, e o que estava escrito em
   cada uma so aparecia depois de passar pelas outras. Fechadas, as oito
   cabem numa tela so, e o resumo de cada uma diz se ela ja tem definicao
   de pronto, que e a unica coisa que se quer saber de relance.

   O <details> e do proprio navegador: abre no clique e no teclado sem uma
   linha de JavaScript, e salvar uma entrega nao redesenha a tela, entao o
   que estiver aberto continua aberto. */
function roteirosCartaoEntrega(entrega, roteiro, editavel) {
  const pronto = (roteiro.definicaoPronto || []).filter(function (x) { return String(x).trim(); });
  const escrita = pronto.length > 0;

  return '' +
    '<details class="dobra">' +
      '<summary>' +
        '<span class="dobra-n">' + String(entrega.n).padStart(2, '0') + '</span>' +
        '<b>' + esc(entrega.nome) + '</b>' +
        '<span class="eti eti-neutra">' + esc(nomeFase(entrega.fase)) + '</span>' +
        (escrita
          ? '<span class="eti eti-ok">' + pronto.length + ' item(ns) de pronto</span>'
          : '<span class="eti eti-atencao">sem definição de pronto</span>') +
      '</summary>' +
      '<div class="dobra-corpo">' +
      '<p class="dica" style="margin-bottom:16px">' + esc(entrega.resumo) + '</p>' +

      '<div class="rotulo">A pergunta que ela responde</div>' +
      '<p style="font-size:13.5px;color:var(--tx-2);margin-bottom:16px">' +
        esc(ROTEIROS_PERGUNTA[entrega.k] || '') + '</p>' +

      '<div class="rotulo">Definição de pronto</div>' +
      (editavel
        ? '<textarea class="campo" id="roteirosPronto-' + entrega.k + '" ' +
          'placeholder="Uma linha por item. É isto que vira checklist na Mesa da entrega.">' +
          esc(pronto.join('\n')) + '</textarea>'
        : '<ul style="margin:0 0 4px 18px;font-size:13px;color:var(--tx-2);line-height:1.8">' +
          pronto.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>') +

      '<div class="rotulo" style="margin-top:16px">Perguntas a fazer ao cliente</div>' +
      (editavel
        ? '<textarea class="campo" id="roteirosPerguntas-' + entrega.k + '" ' +
          'placeholder="Uma por linha. Aparecem na Mesa da entrega, para não perguntar de novo o que já foi respondido.">' +
          esc((roteiro.perguntas || []).join('\n')) + '</textarea>'
        : '<ul style="margin:0 0 4px 18px;font-size:13px;color:var(--tx-2);line-height:1.8">' +
          (roteiro.perguntas || []).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') +
          (!(roteiro.perguntas || []).length ? '<li style="color:var(--tx-4)">nenhuma escrita ainda</li>' : '') +
          '</ul>') +

      '<div class="rotulo" style="margin-top:16px">Como fazer</div>' +
      (editavel
        ? '<textarea class="campo" id="roteirosComo-' + entrega.k + '" ' +
          'placeholder="O jeito da casa de conduzir esta entrega.">' + esc(roteiro.comoFazer || '') + '</textarea>'
        : '<p style="font-size:13px;color:var(--tx-2);white-space:pre-wrap">' +
          (roteiro.comoFazer ? esc(roteiro.comoFazer) : '<span style="color:var(--tx-4)">nada escrito ainda</span>') +
          '</p>') +

      '<div class="rotulo" style="margin-top:16px">Modelo de material</div>' +
      (editavel
        ? '<input class="campo" id="roteirosModelo-' + entrega.k + '" placeholder="Endereço do modelo no Drive ou no Notion" value="' +
          esc(roteiro.modelo || '') + '">'
        : (roteiro.modelo
            ? '<a href="' + esc(roteiro.modelo) + '" target="_blank" rel="noopener">abrir o modelo</a>'
            : '<span class="dica">nenhum endereço guardado</span>')) +

      (editavel
        ? '<div style="margin-top:16px"><button class="bt bt-marca bt-sm" onclick="roteirosSalvarEntrega(\'' + entrega.k + '\')">' +
          'Salvar esta entrega</button>' +
          '<span class="dica" style="margin-left:12px" id="roteirosOk-' + entrega.k + '"></span></div>'
        : '') +
      '</div>' +
    '</details>';
}

/* So os tres cartoes de nivel, sem tocar nas oito entregas.

   Existe por um motivo pratico: mudar um preco ou marcar uma entrega no
   escopo chamava DESENHO.roteiros(), que reescreve a tela inteira. Quem
   estivesse com a definicao de pronto de uma entrega digitada e ainda nao
   salva perdia o texto, sem nada dizer que perdeu. O proprio arquivo ja
   tinha essa regra escrita em roteirosSalvarEntrega, e estas duas funcoes
   eram as que a furavam. */
function roteirosPintarNiveis(metodo, editavel) {
  if (editavel === undefined) editavel = roteirosPodeEditar();
  escrever('roteirosNiveis',
    '<div class="grade-3">' +
    metodo.niveis.map(function (n) { return roteirosCartaoNivel(n, editavel); }).join('') +
    '</div>');
}

/* ------------------------------------------------------------------ */

function roteirosSalvarValor(k) {
  const campo = porId('roteirosValor-' + k);
  if (!campo) return;
  const metodo = roteirosLer();
  const nivel = metodo.niveis.find(function (n) { return n.k === k; });
  if (!nivel) return;
  nivel.valor = Math.max(0, Number(campo.value) || 0);
  if (roteirosGravar(metodo)) { roteirosPintarNiveis(metodo); roteirosPintarSelos(metodo); }
}

function roteirosAlternarEscopo(nivelK, entregaK) {
  const metodo = roteirosLer();
  const nivel = metodo.niveis.find(function (n) { return n.k === nivelK; });
  if (!nivel) return;
  nivel.escopo = nivel.escopo || [];
  const i = nivel.escopo.indexOf(entregaK);
  if (i >= 0) nivel.escopo.splice(i, 1); else nivel.escopo.push(entregaK);
  if (roteirosGravar(metodo)) { roteirosPintarNiveis(metodo); roteirosPintarSelos(metodo); }
}

function roteirosLinhas(id) {
  const campo = porId(id);
  if (!campo) return [];
  return String(campo.value || '').split('\n')
    .map(function (x) { return x.trim(); })
    .filter(function (x) { return x; });
}

function roteirosSalvarEntrega(k) {
  const metodo = roteirosLer();
  metodo.roteiros[k] = {
    definicaoPronto: roteirosLinhas('roteirosPronto-' + k),
    perguntas: roteirosLinhas('roteirosPerguntas-' + k),
    comoFazer: (porId('roteirosComo-' + k) || {}).value || '',
    modelo: (porId('roteirosModelo-' + k) || {}).value || '',
  };
  if (!roteirosGravar(metodo)) return;
  // Redesenhar inteiro apagaria o que a pessoa esta digitando nas outras
  // entregas, entao aqui so o aviso muda.
  const ok = porId('roteirosOk-' + k);
  if (ok) { ok.textContent = 'salvo às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); }
  roteirosPintarSelos(metodo);
}

function roteirosPintarSelos(metodo) {
  const escritas = ENTREGAS.filter(function (e) {
    const p = (metodo.roteiros[e.k] || {}).definicaoPronto || [];
    return p.length > 0;
  }).length;

  escrever('roteirosSeloProntas', escritas === ENTREGAS.length
    ? '<span class="eti eti-ok">as oito escritas</span>'
    : '<span class="eti eti-atencao">' + escritas + ' de ' + ENTREGAS.length + ' escritas</span>');
}

/* ------------------------------------------------------------------ */

DESENHO.roteiros = function () {
  const metodo = roteirosLer();
  const editavel = roteirosPodeEditar();

  // O mesmo preco vive em dois lugares: aqui e na landing publicada, cujos
  // valores estao em NIVEIS_DEFAULT. Enquanto os dois batem nao ha o que
  // avisar. Quando divergem, a devolutiva sai com um numero diferente do
  // que a pessoa leu antes de aplicar, e ai o aviso aparece. Republicar a
  // landing e editar fonte/page.tpl.html e rodar "cd fonte && python3
  // build.py", que e trabalho de quem mexe no repositorio, nao de quem
  // esta olhando esta tela.
  const fora = metodo.niveis.filter(function (n) {
    const p = porChave(NIVEIS_DEFAULT, n.k);
    return p && Number(p.valor) !== Number(n.valor);
  });
  escrever('roteirosAviso',
    (fora.length ? aviso('atencao',
      fora.length === 1 ? 'A landing ainda mostra outro preço.' : 'A landing ainda mostra outros preços.',
      fora.map(function (n) {
        return n.nome + ': aqui ' + moeda(n.valor) + ', na landing ' + moeda(porChave(NIVEIS_DEFAULT, n.k).valor);
      }).join('. ') + '.') : '') +
    '');

  // Nao e aviso: para quem e colaborador, isto vale em todo estado da tela,
  // toda vez que ela abre. Vira uma linha ao lado da etiqueta "somente
  // leitura", que ja diz a mesma coisa quatro linhas abaixo.
  texto('roteirosLeitura', editavel ? ''
    : 'Preço e escopo são decisão da gestão. Peça a mudança para quem tem esse acesso.');

  escrever('roteirosSeloNiveis', editavel
    ? '<span class="eti eti-marca">você pode editar</span>'
    : '<span class="eti eti-neutra">somente leitura</span>');

  roteirosPintarNiveis(metodo, editavel);

  escrever('roteirosEtapas',
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px">' +
    ETAPAS.map(function (e) {
      return '<div style="border:1px solid var(--fio);border-radius:var(--r-sm);padding:14px 16px">' +
        '<div style="font-family:var(--display);font-size:11px;color:var(--o);font-weight:700">' +
          String(e.n).padStart(2, '0') + '</div>' +
        '<b style="display:block;font-size:14px;color:var(--claro);margin-top:4px">' + esc(e.nome) + '</b>' +
        '<p class="dica" style="margin-top:5px">' + esc(e.resumo) + '</p></div>';
    }).join('') + '</div>');

  escrever('roteirosEntregas', ENTREGAS.map(function (e) {
    return roteirosCartaoEntrega(e, metodo.roteiros[e.k] || {}, editavel);
  }).join(''));

  roteirosPintarSelos(metodo);
};
