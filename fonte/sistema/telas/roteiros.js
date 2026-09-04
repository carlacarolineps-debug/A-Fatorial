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

/* A matriz dos niveis: uma entrega por linha, um nivel por coluna.

   Eram tres cartoes com as mesmas oito entregas dentro: vinte e quatro
   rotulos onde ha oito coisas, e "Precificacao" escrito tres vezes. A
   pergunta que se faz de verdade e "o Pro inclui Precificacao?", e ela
   obrigava a achar a terceira linha do cartao do meio e comparar de
   cabeca com a do cartao da esquerda.

   Numa matriz, a diferenca entre dois niveis, que e o que decide preco, e
   uma coluna que se le de cima a baixo. E quando dois niveis entregam
   exatamente a mesma coisa, isso aparece; nos tres cartoes, nao aparecia.

   Os campos de valor sairam da leitura e foram para uma dobra: preco se
   muda de vez em quando, e escopo se olha toda semana. E a regra da casa,
   a mesma que tirou os treze mil pixels das oito entregas. */
function roteirosMatrizHtml(metodo, editavel) {
  const niveis = metodo.niveis;
  const dentro = function (nivel, entregaK) {
    return (nivel.escopo || []).indexOf(entregaK) >= 0;
  };
  const quantas = function (nivel) {
    return ENTREGAS.filter(function (e) { return dentro(nivel, e.k); }).length;
  };

  // As oito vem agrupadas pelas quatro fases, que e a ordem do metodo. O
  // nome da fase virava etiqueta repetida em cada linha; aqui e uma faixa.
  let corpo = '';
  FASES.forEach(function (f) {
    const daFase = ENTREGAS.filter(function (e) { return e.fase === f.n; });
    if (!daFase.length) return;
    corpo += '<tr class="grupo"><td colspan="' + (niveis.length + 1) + '">' + esc(f.nome) + '</td></tr>';
    daFase.forEach(function (e) {
      corpo += '<tr><td data-t><b>' + esc(e.nome) + '</b>' +
        '<div class="sob">' + esc(e.resumo) + '</div></td>' +
        niveis.map(function (n) {
          const marcada = dentro(n, e.k);
          return '<td class="marca" data-r="' + esc(n.nome.toLowerCase()) + '">' +
            '<label title="' + esc(e.nome + (marcada ? ' entra no ' : ' não entra no ') + n.nome) + '">' +
            '<input type="checkbox"' + (marcada ? ' checked' : '') + (editavel ? '' : ' disabled') +
              ' onchange="roteirosAlternarEscopo(\'' + n.k + '\',\'' + e.k + '\')">' +
            '</label></td>';
        }).join('') +
      '</tr>';
    });
  });

  // O '' na mesma linha do return nao e enfeite: return sozinho no fim da
  // linha ganha ponto e virgula do proprio JavaScript, e a funcao passaria
  // a devolver nada com a tabela inteira escrita logo abaixo.
  return '' +
    // No telefone o cabecalho da tabela some, e com ele o preco de cada
    // nivel. A legenda repoe isso uma vez, e nao em cada uma das oito
    // linhas.
    '<div class="matriz-legenda">' +
      niveis.map(function (n) {
        return '<div><b>' + esc(n.nome) + '</b>' +
          '<span class="eti eti-marca">' + esc(moeda(n.valor)) + '</span>' +
          '<span>' + quantas(n) + ' de ' + ENTREGAS.length + ' entregas</span></div>';
      }).join('') +
    '</div>' +
    '<div class="rolo-h"><table class="lista matriz">' +
    '<thead><tr><th>Entrega</th>' +
      niveis.map(function (n) {
        return '<th class="col"><span class="col-t">' + esc(n.nome) + '</span>' +
          '<span class="col-preco"><span class="eti eti-marca">' + esc(moeda(n.valor)) + '</span></span>' +
          '<span class="col-sub">' + quantas(n) + ' de ' + ENTREGAS.length + ' entregas</span></th>';
      }).join('') +
    '</tr></thead><tbody>' + corpo + '</tbody></table></div>';
}

/* O que a matriz deixou aparecer.

   Dois niveis com o mesmo escopo e uma pergunta de negocio, nao um
   defeito de tela: se o Pro entrega o que o Premium entrega, o que separa
   os dois precos nao esta escrito em lugar nenhum do sistema. Nos tres
   cartoes isso ficava escondido, porque comparar oito marcas de olho e
   trabalho que ninguem faz. Aqui e uma linha. */
function roteirosAchadoDoEscopo(metodo) {
  const niveis = metodo.niveis;
  const chave = function (n) { return (n.escopo || []).slice().sort().join(','); };

  for (let a = 0; a < niveis.length; a++) {
    for (let b = a + 1; b < niveis.length; b++) {
      if (!(niveis[a].escopo || []).length) continue;
      if (chave(niveis[a]) === chave(niveis[b])) {
        return '<p class="dica" style="margin-top:14px"><b style="color:var(--tx)">' +
          esc(niveis[a].nome) + ' e ' + esc(niveis[b].nome) + ' entregam exatamente a mesma coisa.</b> ' +
          'A diferença entre ' + esc(moeda(niveis[a].valor)) + ' e ' + esc(moeda(niveis[b].valor)) +
          ' não está escrita aqui: ou ela mora fora da lista de entregas, e vale dizer onde, ' +
          'ou um dos dois níveis está sobrando.</p>';
      }
    }
  }

  const vazios = niveis.filter(function (n) { return !(n.escopo || []).length; });
  if (vazios.length) {
    return '<p class="dica" style="margin-top:14px">' +
      esc(vazios.map(function (n) { return n.nome; }).join(', ')) +
      (vazios.length === 1 ? ' não entrega nada ainda.' : ' não entregam nada ainda.') +
      ' Marque na coluna o que entra.</p>';
  }
  return '';
}

/* Os campos de valor, dentro de uma dobra.

   O <details> guarda o proprio estado no HTML, e trocar uma marca de
   escopo redesenha esta parte inteira: sem guardar aqui se ela estava
   aberta, a dobra fechava sozinha na cara de quem tinha acabado de
   abri-la para mexer nos precos. */
let ROTEIROS_VALORES_ABERTA = false;

function roteirosValoresHtml(metodo) {
  return '<details class="dobra"' + (ROTEIROS_VALORES_ABERTA ? ' open' : '') +
      ' ontoggle="ROTEIROS_VALORES_ABERTA = this.open">' +
    '<summary><b>Mudar os valores</b>' +
      '<span class="eti eti-neutra">' +
        metodo.niveis.map(function (n) { return moeda(n.valor); }).join(' · ') + '</span>' +
    '</summary>' +
    '<div class="dobra-corpo"><div class="grade-3">' +
      metodo.niveis.map(function (n) {
        return '<div>' +
          '<label class="rotulo" for="roteirosValor-' + n.k + '">' + esc(n.nome) + ', à vista</label>' +
          '<div style="display:flex;gap:8px">' +
            '<input class="campo campo-sm" type="number" min="0" step="10" ' +
              'id="roteirosValor-' + n.k + '" value="' + Number(n.valor || 0) + '">' +
            '<button class="bt bt-marca bt-sm" onclick="roteirosSalvarValor(\'' + n.k + '\')">Salvar</button>' +
          '</div>' +
          '<p class="dica" style="margin-top:6px">' + esc(n.resumo) + '</p>' +
        '</div>';
      }).join('') +
    '</div></div></details>';
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
/* Uma entrega.

   Duas etiquetas sairam do resumo, e as duas pelo mesmo motivo: elas
   apareciam em toda linha, e etiqueta que aparece em toda linha nao
   informa, so pinta.

   a. A fase. "Estruturacao" estava escrito em tres das oito linhas e
      "Validacao" em outras tres. Virou a faixa que agrupa as oito, e ai
      diz a mesma coisa uma vez em vez de oito, e de quebra mostra o
      formato do metodo: uma entrega de diagnostico, tres de estruturacao,
      tres de validacao, uma de produto pronto.

   b. "Sem definicao de pronto", em ambar em todas as oito. Cor que aparece
      em toda linha nao diz "olhe esta", diz "esta linha existe".

      A regra agora e uma so: COR SO NA MINORIA. Se poucas estao escritas,
      as escritas ganham o verde, porque sao elas a novidade. Se poucas
      faltam, as que faltam ganham o ambar, porque sao elas o trabalho. Se
      todas estao de um lado, ninguem ganha etiqueta nenhuma, e quem conta
      e o selo do titulo, que ja diz "2 de 8 escritas".

      Assim a cor volta a apontar alguma coisa em qualquer estado da tela,
      e nunca pinta oito linhas iguais.

   `marca` vem de fora porque e uma conta sobre as oito, e nao sobre esta:
   'escritas', 'faltantes' ou '' quando nao ha minoria a marcar. */
function roteirosCartaoEntrega(entrega, roteiro, editavel, marca) {
  const pronto = (roteiro.definicaoPronto || []).filter(function (x) { return String(x).trim(); });
  const escrita = pronto.length > 0;

  return '' +
    '<details class="dobra">' +
      '<summary>' +
        '<span class="dobra-n">' + String(entrega.n).padStart(2, '0') + '</span>' +
        '<b>' + esc(entrega.nome) + '</b>' +
        (escrita && marca === 'escritas'
          ? '<span class="eti eti-ok">' + pronto.length +
            (pronto.length === 1 ? ' critério de pronto' : ' critérios de pronto') + '</span>'
          : '') +
        (!escrita && marca === 'faltantes'
          ? '<span class="eti eti-atencao">falta a definição de pronto</span>'
          : '') +
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
    roteirosMatrizHtml(metodo, editavel) +
    roteirosAchadoDoEscopo(metodo) +
    (editavel ? roteirosValoresHtml(metodo) : ''));
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

  // Com nenhuma escrita, as oito linhas nao trazem etiqueta nenhuma, e sem
  // esta frase a tela nao diz o que esta faltando nem por que importa. Ela
  // some assim que a primeira for escrita, entao nao e um aviso que
  // aparece sempre: e o estado de quem ainda nao comecou.
  escrever('roteirosSemPronto', escritas ? '' :
    '<p class="dica" style="margin:-8px 0 16px">Nenhuma entrega tem definição de pronto ainda. ' +
    'Ela é a lista do que precisa estar feito para a entrega poder ir ao cliente, e é ela que ' +
    'vira o checklist na Mesa da entrega. Abra a primeira e escreva uma linha por item.</p>');
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

  // As oito agrupadas pelas quatro fases do metodo: o nome da fase deixa
  // de ser uma etiqueta repetida em cada linha e vira a faixa que separa
  // os grupos. Junto com isso, o formato do metodo aparece.
  const escritas = ENTREGAS.filter(function (e) {
    return ((metodo.roteiros[e.k] || {}).definicaoPronto || [])
      .filter(function (x) { return String(x).trim(); }).length > 0;
  }).length;
  const faltam = ENTREGAS.length - escritas;

  // Cor so na minoria: quem e excecao ganha etiqueta, quem e o estado
  // geral fica quieto, e o selo do titulo conta os dois lados.
  const marca = (!escritas || !faltam) ? ''
    : (escritas <= faltam ? 'escritas' : 'faltantes');

  escrever('roteirosEntregas', FASES.map(function (f) {
    const daFase = ENTREGAS.filter(function (e) { return e.fase === f.n; });
    if (!daFase.length) return '';
    return '<div class="fase-t">' + esc(f.nome) +
      '<span>' + daFase.length + (daFase.length === 1 ? ' entrega' : ' entregas') + '</span></div>' +
      daFase.map(function (e) {
        return roteirosCartaoEntrega(e, metodo.roteiros[e.k] || {}, editavel, marca);
      }).join('');
  }).join(''));

  roteirosPintarSelos(metodo);
};
