// /api/*  ·  o formulário de aplicação
//
//   GET  /api/formulario           aberta     as perguntas que estão no ar
//   GET  /api/formulario/versoes   com login  a lista, e cada versão inteira
//   PUT  /api/formulario           com login  grava uma versão nova
//   POST /api/resposta             aberta     recebe a aplicação
//   POST /api/evento               aberta     recebe os passos do preenchimento
//   GET  /api/metricas             com login  os números que a tela desenha
//
// Duas ficam abertas para a internet inteira. Tudo que entra por elas é
// medido, contado e conferido antes de virar escrita, e toda escrita
// passa por prepare().bind(): nada aqui monta SQL com texto de fora.
//
// As três com login usam a mesma portaria do /leads. Com TEAM_DOMAIN ou
// ACCESS_AUD vazios elas respondem 503 dizendo qual falta, e nunca
// deixam passar: não conferir o token e liberar seria pior que fechar.
//
// A aplicação aceita vira UMA linha em leads, no formato que a tela
// "Ideias que chegaram" já lê. Nenhuma coluna nova, nenhuma alteração de
// tabela, nenhuma linha mudada naquela tela.
import { json, accessQuem } from "./lib.js";

/* ====================================================================
   Listas fechadas.
   O que vem do navegador não escolhe o que entra na coluna do banco.
   ==================================================================== */

// Os oito tipos de pergunta.
export const TIPOS = [
  "texto_curto", "texto_longo", "email", "telefone",
  "numero", "escolha_unica", "escolha_multipla", "recado",
];

const TIPOS_ESCOLHA = ["escolha_unica", "escolha_multipla"];

// Papel liga a pergunta a uma coluna de leads, e não tira a resposta de
// dentro de "respostas": a tela da mesa foi escrita contra essa
// duplicação, e o formulário próprio repete, não conserta.
const PAPEIS = ["nome", "email", "whatsapp"];

// Os dez passos que viram métrica.
export const TIPOS_EVENTO = [
  "abriu", "comecou", "viu", "respondeu", "voltou",
  "erro_campo", "revisou", "enviou", "falhou", "desistiu",
];

// Passo que carrega pergunta. Nos outros, a chave e a ordem vão nulas.
const EVENTO_COM_PERGUNTA = ["viu", "respondeu", "voltou", "erro_campo", "desistiu"];

// Só estes carregam detalhe, e ele sai desta lista.
const EVENTO_COM_DETALHE = ["erro_campo", "falhou", "enviou"];
const DETALHES = [
  "vazio", "formato", "curto", "longo", "opcao",
  "rede", "recusado", "limite", "servidor", "definicao",
];

// Os três níveis da landing, conferidos contra o data-plan de lá.
const PLANOS = ["start", "pro", "premium"];

const APARELHOS = ["celular", "tablet", "computador"];

/* Tamanhos. Conferidos antes de qualquer trabalho, sempre. */
const LIMITE = {
  // O teto da aplicação cobre o pior formulário que o editor deixa
  // publicar: quarenta perguntas de dois mil caracteres, e caractere
  // acentuado ocupa mais de um byte. Um teto menor deixaria existir
  // formulário aceito na gravação cuja resposta completa é sempre
  // recusada no envio, e a pessoa perderia tudo o que escreveu sem ter
  // o que consertar. Quem mantém os dois números de acordo é a conta de
  // peso da gravação da versão, logo abaixo.
  corpoResposta: 384 * 1024,
  corpoEvento: 4 * 1024,
  corpoDefinicao: 128 * 1024,

  textoCurto: 200,
  textoLongo: 2000,
  email: 254,
  telefone: 24,
  numeroMin: -1000000000000,
  numeroMax: 1000000000000,

  marcacoes: 20,
  perguntas: 40,
  opcoes: 20,
  eventos: 20,

  titulo: 120,
  descricao: 400,
  erro: 160,
  dica: 80,
  nota: 300,
};

/* Os baldes, todos por janela de tempo, todos se apagando sozinhos. */
const BALDE = {
  envioHora: { limite: 5, horas: 1 },
  envioDia: { limite: 30, horas: 24 },
  eventoEndereco: { limite: 300, horas: 1 },
  eventoVisita: { limite: 120, horas: 1 },
};

/* O que a pessoa lê quando erra e a pergunta não traz texto próprio. */
const ERRO_PADRAO = {
  texto_curto: "Escreva uma resposta com até 200 caracteres.",
  texto_longo: "Escreva uma resposta com até 2000 caracteres.",
  email: "Confira o e-mail: faltou o arroba ou o endereço depois dele.",
  telefone: "Confira o número: com DDD, ele tem 10 ou 11 dígitos.",
  numero: "Escreva um número.",
  escolha_unica: "Escolha uma das opções.",
  escolha_multipla: "Escolha pelo menos uma das opções.",
  recado: "",
  faltando: "Esta pergunta precisa de resposta.",
};

// Identificador sorteado no navegador, em minúsculas. O do envio e o da
// visita têm o mesmo formato e nunca viajam no mesmo pedido.
const SORTEADO = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const CHAVE = /^[a-z][a-z0-9_]{0,39}$/;

/* ====================================================================
   As nove perguntas de fábrica.

   Elas são a resposta da rota aberta enquanto ninguém tiver publicado
   nada: formulário no ar não depende de alguém ter publicado alguma
   coisa primeiro, nem de uma consulta ao banco ter dado certo.

   Este objeto é a única fonte da lista: o build da página lê daqui e
   embute a mesma coisa como socorro, e a cópia em fonte/aplicar tem que
   dizer o mesmo. Duas listas escritas à mão se desencontram, e já se
   desencontraram uma vez.

   São nove perguntas, e "Em que estágio sua ideia está?" é a sexta. A
   décima pergunta guardada que existiu aqui era leitura errada de um
   número num print: ela nunca fez parte do formulário, e por isso não
   está mais em lugar nenhum.

   A de fábrica é a versão ZERO. A primeira publicação é a versão 1, e
   assim nenhum número de versão significa dois formulários diferentes:
   quem abriu antes de alguém publicar tem a aplicação conferida contra
   as perguntas que ela realmente leu.
   ==================================================================== */
export const FORMULARIO_FABRICA = {
  versao: 0,
  publicado_em: "2026-08-31 00:00:00",
  publicado_por: null,
  nota: "As nove perguntas que vieram do Typeform.",
  titulo: "Conte a sua ideia",
  abertura: {
    titulo: "Conte a sua ideia",
    texto: "São perguntas sobre o que você sabe fazer e o que quer transformar em produto. Suas respostas vão direto para a nossa mesa, e nós lemos uma por uma antes de responder.",
    botao: "Começar",
    tempo: "9 perguntas, cerca de 4 minutos",
  },
  agradecimento: {
    titulo: "Recebemos a sua ideia",
    texto: "Ela entrou na fila de leitura. Nós lemos o que você escreveu e voltamos pelo WhatsApp ou pelo e-mail que você deixou. Se precisar acrescentar alguma coisa, responda o e-mail que chegar.",
    link: { texto: "Voltar para o site", url: "/" },
  },
  perguntas: [
    {
      chave: "nome",
      titulo: "Nome completo",
      descricao: "",
      tipo: "texto_curto",
      obrigatoria: true,
      ativa: true,
      papel: "nome",
      opcoes: [],
      mascara: { minimo: 2, maximo: 120 },
      erro: "Escreva o seu nome completo, com pelo menos duas letras.",
      dica: "Como você assina",
      mostrar_se: null,
      nota: "",
    },
    {
      chave: "email",
      titulo: "E-mail",
      descricao: "",
      tipo: "email",
      obrigatoria: true,
      ativa: true,
      papel: "email",
      opcoes: [],
      mascara: null,
      erro: "Confira o e-mail: faltou o arroba ou o endereço depois dele.",
      dica: "voce@empresa.com.br",
      mostrar_se: null,
      nota: "",
    },
    {
      chave: "whatsapp",
      titulo: "WhatsApp",
      descricao: "",
      tipo: "telefone",
      obrigatoria: true,
      ativa: true,
      papel: "whatsapp",
      opcoes: [],
      mascara: { pais_padrao: "BR" },
      erro: "Confira o número: com DDD, ele tem 10 ou 11 dígitos.",
      dica: "",
      mostrar_se: null,
      nota: "",
    },
    {
      chave: "atuacao",
      titulo: "Atuação profissional",
      descricao: "",
      tipo: "escolha_unica",
      obrigatoria: true,
      ativa: true,
      papel: null,
      opcoes: [
        { chave: "empresario", texto: "Empresário ou dono de negócios" },
        { chave: "liberal", texto: "Profissional liberal (médico, advogado, etc.)" },
        { chave: "autonomo", texto: "Autônomo ou prestador de serviço" },
        { chave: "criador", texto: "Freelancer ou criador de conteúdo" },
        { chave: "clt", texto: "Empregado CLT" },
        { chave: "outro", texto: "Outro" },
      ],
      mascara: null,
      erro: "Escolha a opção mais próxima do seu dia a dia.",
      dica: "",
      mostrar_se: null,
      nota: "",
    },
    {
      chave: "o_que_transformar",
      titulo: "O que você quer transformar em produto?",
      descricao: "Explique em poucas linhas o que você sabe fazer e o que imagina transformar em mentoria, consultoria ou treinamento.",
      tipo: "texto_longo",
      obrigatoria: true,
      ativa: true,
      papel: null,
      opcoes: [],
      mascara: { minimo: 20, maximo: 2000 },
      erro: "Escreva pelo menos uma frase inteira. É esta resposta que a mesa lê primeiro.",
      dica: "O que você faz hoje, e o que imagina vender",
      mostrar_se: null,
      nota: "",
    },
    {
      chave: "estagio",
      titulo: "Em que estágio sua ideia está?",
      descricao: "",
      tipo: "escolha_unica",
      obrigatoria: true,
      ativa: true,
      papel: null,
      opcoes: [
        { chave: "ideia", texto: "Só uma ideia na cabeça" },
        { chave: "experiencia", texto: "Tenho o conhecimento, mas não sei estruturar" },
        { chave: "resultado", texto: "Já testei de forma informal" },
        { chave: "cobra", texto: "Já vendo, mas quero profissionalizar" },
      ],
      mascara: null,
      erro: "Escolha o ponto em que você está hoje.",
      dica: "",
      mostrar_se: null,
      nota: "As quatro chaves são as mesmas de ESTAGIOS no sistema (ideia, experiencia, resultado, cobra). Mantenha assim: a leitura do caso pode aproveitar o que a pessoa já disse em vez de perguntar de novo.",
    },
    {
      chave: "atende_clientes",
      titulo: "Você já atende clientes nesse tema?",
      descricao: "",
      tipo: "escolha_unica",
      obrigatoria: true,
      ativa: true,
      papel: null,
      opcoes: [
        { chave: "ainda_nao", texto: "Ainda não" },
        { chave: "esporadica", texto: "Sim, de forma esporádica" },
        { chave: "recorrente", texto: "Sim, de forma recorrente" },
      ],
      mascara: null,
      erro: "Escolha uma das três.",
      dica: "",
      mostrar_se: null,
      nota: "",
    },
    {
      chave: "faturamento",
      titulo: "Faixa de faturamento mensal",
      descricao: "",
      tipo: "escolha_unica",
      obrigatoria: true,
      ativa: true,
      papel: null,
      opcoes: [
        { chave: "sem_faturamento", texto: "Ainda não faturo" },
        { chave: "ate_5k", texto: "Até R$ 5 mil" },
        { chave: "de_5k_a_15k", texto: "R$ 5 mil a R$ 15 mil" },
        { chave: "de_15k_a_50k", texto: "R$ 15 mil a R$ 50 mil" },
        { chave: "acima_de_50k", texto: "Acima de R$ 50 mil" },
      ],
      mascara: null,
      erro: "Escolha a faixa mais próxima. Ninguém confere número aqui.",
      dica: "",
      mostrar_se: null,
      nota: "",
    },
    {
      chave: "objetivo",
      titulo: "Seu principal objetivo",
      descricao: "",
      tipo: "escolha_unica",
      obrigatoria: true,
      ativa: true,
      papel: null,
      opcoes: [
        { chave: "primeiro_produto", texto: "Criar meu primeiro produto do zero" },
        { chave: "estruturar", texto: "Estruturar e organizar o que já faço" },
        { chave: "faturar_mais", texto: "Aumentar meu faturamento" },
        { chave: "escalar", texto: "Escalar e ter previsibilidade" },
      ],
      mascara: null,
      erro: "Escolha o que mais pesa hoje.",
      dica: "",
      mostrar_se: null,
      nota: "",
    },
  ],
};

/* ====================================================================
   Peças puras.

   Nada daqui para baixo até a portaria toca o banco. É de propósito:
   cada recusa dá para testar sem subir servidor e sem forjar login.
   ==================================================================== */

// Conta caractere de verdade. Um emoji ocupa dois na contagem interna, e
// cortar no meio quebra o caractere.
const tamanho = (t) => [...String(t ?? "")].length;

const inteiro = (v) => (Number.isInteger(v) ? v : null);

// O caractere nulo. Escrito assim, e não na mão, porque ele não sobrevive
// a uma cópia de arquivo: quem lê este código precisa enxergar qual é.
const NULO = String.fromCharCode(0);

/* Limpeza do texto que entra, antes da conferência de tamanho.
   O caractere nulo não passa por aqui: quem chama recusa o campo antes. */
export function limparTexto(bruto) {
  // quebra de linha do Windows vira quebra simples
  const texto = String(bruto ?? "").replace(/\r\n?/g, "\n");

  let limpo = "";
  for (const c of texto) {
    const n = c.codePointAt(0);
    // tabulação e quebra de linha ficam, porque são o texto da pessoa
    if (n === 9 || n === 10) { limpo += c; continue; }
    // o resto do bloco de controle sai
    if (n < 32 || n === 127) continue;
    limpo += c;
  }

  // mais de duas linhas em branco seguidas viram duas
  return limpo.replace(/\n{4,}/g, "\n\n\n").trim();
}

/* Data e hora no formato que o D1 grava: "AAAA-MM-DD HH:MM:SS" em UTC.
   É o que o sistema já lê. */
const carimbo = (ms = Date.now()) =>
  new Date(ms).toISOString().slice(0, 19).replace("T", " ");

/* O dia em São Paulo. O banco conta em UTC, e quem abre as 21h30 daqui
   teria carimbo do dia seguinte. O Brasil não tem horário de verão desde
   2019, então as três horas são fixas. */
const diaDaqui = (ms = Date.now()) =>
  new Date(ms - 3 * 3600e3).toISOString().slice(0, 10);

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/* "3 de setembro às 14h20", para a mesa ler. */
export function dataPorExtenso(ms = Date.now()) {
  const d = new Date(ms - 3 * 3600e3);
  const hora = String(d.getUTCHours()).padStart(2, "0");
  const minuto = String(d.getUTCMinutes()).padStart(2, "0");
  return `${d.getUTCDate()} de ${MESES[d.getUTCMonth()]} às ${hora}h${minuto}`;
}

// Número antes do adjetivo, e por extenso até dez, que é como se fala.
const PALAVRA = ["", "uma", "duas", "três", "quatro", "cinco",
  "seis", "sete", "oito", "nove", "dez"];

const fraseDeRecusa = (quantos) =>
  quantos === 1
    ? "uma resposta precisa de ajuste"
    : `${PALAVRA[quantos] ?? String(quantos)} respostas precisam de ajuste`;

/* --------------------------------------------------------------------
   A poda da rota aberta.

   Sai a pergunta desligada, saem a nota e o papel de cada pergunta, e
   saem quem publicou e a nota do cabeçalho. Recado interno e a fiação
   que liga pergunta a coluna do banco não precisam viajar para a
   internet inteira.
   -------------------------------------------------------------------- */
export function podar(definicao) {
  const perguntas = (definicao?.perguntas ?? [])
    .filter((p) => p?.ativa)
    .map(({ nota, papel, ...resto }) => resto);

  return {
    // sem número dentro da definição, vale a de fábrica, que é a zero
    versao: definicao?.versao ?? 0,
    publicado_em: definicao?.publicado_em ?? null,
    titulo: definicao?.titulo ?? "",
    abertura: definicao?.abertura ?? null,
    agradecimento: definicao?.agradecimento ?? null,
    perguntas,
  };
}

/* --------------------------------------------------------------------
   Família do tipo.

   Trocar texto curto por texto longo pode. Trocar escolha única por
   múltipla pode. Sair de texto para escolha, ou o contrário, não pode:
   as respostas que já chegaram estão no outro formato.
   -------------------------------------------------------------------- */
export function familiaDoTipo(tipo) {
  if (TIPOS_ESCOLHA.includes(tipo)) return "escolha";
  if (tipo === "recado") return "recado";
  return "texto";
}

/* --------------------------------------------------------------------
   Quanto pesa, no pior caso, uma aplicação completa deste formulário.

   Serve para uma coisa só: não deixar publicar um formulário cujas
   respostas completas o envio recusaria por tamanho. Conta cada
   caractere por quatro bytes, que é o pior caso da acentuação, e soma a
   moldura de cada campo. Errar para mais aqui é de propósito.
   -------------------------------------------------------------------- */
// a identificação da aplicação, a versão, o nível e a origem
const MOLDURA_DA_APLICACAO = 1024;

export function pesoDaResposta(perguntas) {
  let bytes = MOLDURA_DA_APLICACAO;

  for (const p of perguntas ?? []) {
    if (p.tipo === "recado") continue;
    // a identificação da pergunta, as aspas, os dois pontos, a vírgula
    bytes += tamanho(p.chave) + 16;

    if (TIPOS_ESCOLHA.includes(p.tipo)) {
      // no pior caso a pessoa marca todas as opções
      for (const o of p.opcoes ?? []) bytes += tamanho(o.chave) * 4 + 8;
      continue;
    }
    if (p.tipo === "email") { bytes += LIMITE.email * 4; continue; }
    if (p.tipo === "telefone") { bytes += LIMITE.telefone * 4; continue; }
    if (p.tipo === "numero") { bytes += 32; continue; }

    const teto = p.tipo === "texto_longo" ? LIMITE.textoLongo : LIMITE.textoCurto;
    const maximo = p.mascara?.maximo ?? teto;
    bytes += Math.min(Math.max(maximo, 0), teto) * 4;
  }

  return bytes;
}

/* --------------------------------------------------------------------
   Confere a definição inteira antes de gravar.

   Devolve { erro } com a frase que a Carla lê no editor, ou { limpa }
   com a definição pronta para virar linha. Vai na ordem do contrato, e a
   primeira que falhar já responde.

   `familias` é o mapa de identificação para família de tipo das versões
   já PUBLICADAS. Rascunho não entra: ele nunca recebeu resposta nenhuma,
   e travar quem edita dentro do próprio rascunho seria travar por nada.
   -------------------------------------------------------------------- */
export function validarDefinicao(bruta, familias = new Map()) {
  if (!bruta || typeof bruta !== "object" || Array.isArray(bruta)) {
    return { erro: "o formulário não veio junto." };
  }

  const perguntas = bruta.perguntas;
  if (!Array.isArray(perguntas) || perguntas.length < 1) {
    return { erro: "o formulário precisa de pelo menos uma pergunta. Formulário sem pergunta nenhuma não recebe ninguém." };
  }
  if (perguntas.length > LIMITE.perguntas) {
    return { erro: `o formulário passou de ${LIMITE.perguntas} perguntas. Tire as que não são mais usadas antes de acrescentar outras.` };
  }

  const identificacoes = new Set();
  const titulosAtivos = new Map();
  const papeisUsados = new Set();
  const escolhasAnteriores = new Map();
  const limpas = [];

  for (let i = 0; i < perguntas.length; i++) {
    const p = perguntas[i];
    const onde = `a pergunta na posição ${i + 1}`;
    if (!p || typeof p !== "object" || Array.isArray(p)) {
      return { erro: `${onde} não veio inteira.` };
    }

    // A identificação é estável e nunca muda: é por ela que a métrica de
    // antes e a de depois se somam. Trocar a identificação é apagar uma
    // pergunta e criar outra, e a tela diz isso por escrito antes.
    const chave = String(p.chave ?? "");
    if (!CHAVE.test(chave)) {
      return { erro: `${onde} está sem identificação, ou com uma fora do formato.` };
    }
    if (identificacoes.has(chave)) {
      return { erro: "duas perguntas têm a mesma identificação. Cada uma tem a sua, e ela nunca muda." };
    }
    identificacoes.add(chave);

    const tipo = String(p.tipo ?? "");
    if (!TIPOS.includes(tipo)) {
      return { erro: `${onde} está com um tipo que não existe.` };
    }

    const titulo = String(p.titulo ?? "").trim();
    if (!titulo) {
      return { erro: `${onde} está sem texto. Escreva o que a pessoa lê. Pergunta sem texto não vai para o ar.` };
    }
    if (tamanho(titulo) > LIMITE.titulo) {
      return { erro: `o texto de "${titulo.slice(0, 40)}" passou de ${LIMITE.titulo} letras. Ele vira o nome da coluna na lista da mesa e não cabe. Encurte, e ponha o resto na explicação.` };
    }
    if (/^\d+$/.test(titulo)) {
      return { erro: `${onde} tem só números no texto. Escreva o que a pessoa lê.` };
    }

    const ativa = p.ativa === true;
    if (ativa) {
      const comparavel = titulo.toLowerCase().replace(/\s+/g, " ");
      if (titulosAtivos.has(comparavel)) {
        return { erro: `já existe uma pergunta com este texto, na ${titulosAtivos.get(comparavel)}a posição: "${titulo}". Duas perguntas com o mesmo texto viram uma coluna só na lista da mesa, e uma das duas respostas se perde.` };
      }
      titulosAtivos.set(comparavel, i + 1);
    }

    const descricao = String(p.descricao ?? "");
    if (tamanho(descricao) > LIMITE.descricao) {
      return { erro: `a explicação de "${titulo}" passou de ${LIMITE.descricao} letras.` };
    }
    const erroEscrito = String(p.erro ?? "");
    if (tamanho(erroEscrito) > LIMITE.erro) {
      return { erro: `o recado de erro de "${titulo}" passou de ${LIMITE.erro} letras.` };
    }
    const dica = String(p.dica ?? "");
    if (tamanho(dica) > LIMITE.dica) {
      return { erro: `a dica de "${titulo}" passou de ${LIMITE.dica} letras.` };
    }
    const nota = String(p.nota ?? "");
    if (tamanho(nota) > LIMITE.nota) {
      return { erro: `o recado interno de "${titulo}" passou de ${LIMITE.nota} letras.` };
    }

    // opções: de 2 a 20 nos dois tipos de escolha, nenhuma nos demais
    let usadas = null;
    const opcoesBrutas = p.opcoes ?? [];
    if (!Array.isArray(opcoesBrutas)) {
      return { erro: `as opções de "${titulo}" não vieram em lista.` };
    }
    const opcoes = [];
    if (TIPOS_ESCOLHA.includes(tipo)) {
      if (opcoesBrutas.length < 2) {
        return { erro: `"${titulo}" precisa de duas opções, no mínimo. Com uma só não há escolha.` };
      }
      if (opcoesBrutas.length > LIMITE.opcoes) {
        return { erro: `"${titulo}" passou de ${LIMITE.opcoes} opções. Uma lista maior que isso ninguém lê até o fim.` };
      }
      usadas = new Set();
      const textos = new Set();
      for (const o of opcoesBrutas) {
        const oChave = String(o?.chave ?? "");
        const oTexto = String(o?.texto ?? "").trim();
        if (!CHAVE.test(oChave)) {
          return { erro: `uma opção de "${titulo}" está sem identificação, ou com uma fora do formato.` };
        }
        if (usadas.has(oChave)) {
          return { erro: `duas opções de "${titulo}" têm a mesma identificação.` };
        }
        if (!oTexto) {
          return { erro: `uma opção de "${titulo}" está em branco. Escreva o texto dela, ou tire ela.` };
        }
        if (tamanho(oTexto) > LIMITE.titulo) {
          return { erro: `uma opção de "${titulo}" passou de ${LIMITE.titulo} letras.` };
        }
        const comparavel = oTexto.toLowerCase().replace(/\s+/g, " ");
        if (textos.has(comparavel)) {
          return { erro: `duas opções de "${titulo}" dizem a mesma coisa: "${oTexto}". Quem responde não sabe qual marcar, e a mesa não sabe qual foi marcada.` };
        }
        usadas.add(oChave);
        textos.add(comparavel);
        opcoes.push({ chave: oChave, texto: oTexto });
      }
    } else if (opcoesBrutas.length) {
      return { erro: `"${titulo}" não é pergunta de escolha e não pode ter opções.` };
    }

    // o recado é uma tela que a pessoa lê e segue, não uma pergunta
    if (tipo === "recado" && (p.obrigatoria === true || (p.papel ?? null) !== null)) {
      return { erro: `"${titulo}" é um recado, e recado não se responde: ele não pode ser obrigatório nem virar campo da mesa.` };
    }
    const obrigatoria = tipo === "recado" ? false : p.obrigatoria === true;

    // o papel liga a pergunta a uma coluna da mesa
    const papel = p.papel ?? null;
    if (papel !== null) {
      if (!PAPEIS.includes(papel)) {
        return { erro: `"${titulo}" está marcada com um campo da mesa que não existe.` };
      }
      if (papeisUsados.has(papel)) {
        return { erro: "duas perguntas estão marcadas como o mesmo campo da mesa. Só uma pode ser." };
      }
      if (!ativa || !obrigatoria) {
        return { erro: `"${titulo}" é um campo da mesa, e por isso precisa estar no ar e ser obrigatória.` };
      }
      papeisUsados.add(papel);
    }

    // A condição só aponta para trás, e isso basta para não existir laço.
    let mostrar_se = null;
    if (p.mostrar_se != null) {
      const alvo = String(p.mostrar_se?.chave ?? "");
      const querem = p.mostrar_se?.igual_a;
      // A pergunta desta volta ainda não entrou em escolhasAnteriores, e
      // é por isso que ela não pode depender de si mesma: quem depende
      // de si mesma nunca aparece para ninguém, e some do formulário sem
      // dizer nada.
      const anterior = escolhasAnteriores.get(alvo);
      if (!anterior) {
        return { erro: `"${titulo}" só aparece dependendo de outra pergunta, e essa outra precisa ser uma pergunta de escolha que vem antes dela.` };
      }
      // Depender de pergunta que está fora do ar é o mesmo que nunca
      // aparecer: a outra não é feita, então a resposta que abriria esta
      // nunca chega.
      if (ativa && !anterior.ativa) {
        return { erro: `"${titulo}" está no ar dependendo de uma pergunta que está fora do ar, e por isso nunca apareceria para ninguém. Ponha a outra pergunta no ar, ou tire a condição.` };
      }
      if (!Array.isArray(querem) || querem.length < 1 || querem.length > LIMITE.opcoes) {
        return { erro: `"${titulo}" depende de outra pergunta, mas não diz de quais respostas.` };
      }
      for (const q of querem) {
        if (!anterior.opcoes.has(String(q))) {
          return { erro: `"${titulo}" depende de uma resposta que a outra pergunta não oferece.` };
        }
      }
      mostrar_se = { chave: alvo, igual_a: querem.map(String) };
    }

    // Só agora esta pergunta vira alvo possível para as de baixo.
    if (usadas) escolhasAnteriores.set(chave, { opcoes: usadas, ativa });

    // o que já recebeu resposta não muda de família de tipo
    const familiaAntiga = familias.get(chave);
    if (familiaAntiga && familiaAntiga !== familiaDoTipo(tipo)) {
      return { erro: `a pergunta "${titulo}" já recebeu respostas em outro formato. Crie uma pergunta nova em vez de trocar o tipo desta.` };
    }

    limpas.push({
      chave, titulo, descricao, tipo, obrigatoria, ativa, papel, opcoes,
      mascara: lerMascara(tipo, p.mascara),
      erro: erroEscrito, dica, mostrar_se, nota,
    });
  }

  // Sem os dois campos da mesa a aplicação chega e ninguém consegue
  // responder a pessoa. É a única recusa que não fala de uma pergunta.
  const noAr = limpas.filter((p) => p.ativa);
  if (!noAr.some((p) => p.papel === "email") || !noAr.some((p) => p.papel === "whatsapp")) {
    return { erro: "o formulário precisa de uma pergunta de e-mail e uma de WhatsApp para a mesa conseguir responder" };
  }

  return {
    limpa: {
      titulo: String(bruta.titulo ?? "").trim().slice(0, LIMITE.titulo) || "Conte a sua ideia",
      abertura: lerBloco(bruta.abertura, ["titulo", "texto", "botao", "tempo"]),
      agradecimento: lerBloco(bruta.agradecimento, ["titulo", "texto"], true),
      perguntas: limpas,
    },
  };
}

/* A máscara é a régua do tipo. Nos tipos que não têm régua, ela é nula. */
function lerMascara(tipo, bruta) {
  if (tipo === "telefone") {
    const pais = String(bruta?.pais_padrao ?? "BR").toUpperCase();
    return { pais_padrao: /^[A-Z]{2}$/.test(pais) ? pais : "BR" };
  }
  if (tipo === "numero" || tipo === "texto_curto" || tipo === "texto_longo") {
    const minimo = inteiro(bruta?.minimo);
    const maximo = inteiro(bruta?.maximo);
    if (minimo === null && maximo === null) return null;
    return { minimo, maximo };
  }
  return null;
}

/* A capa e o obrigado, que são texto que a pessoa lê. Nada obrigatório:
   sem capa, o formulário abre direto na primeira pergunta. */
function lerBloco(bruto, campos, comLink = false) {
  const saida = {};
  for (const campo of campos) saida[campo] = String(bruto?.[campo] ?? "").slice(0, 600);
  if (campos.includes("botao")) saida.botao = saida.botao.slice(0, 40);
  if (campos.includes("tempo")) saida.tempo = saida.tempo.slice(0, 80);

  if (comLink) {
    const url = String(bruto?.link?.url ?? "");
    // Só caminho de dentro do site. Endereço de fora aqui seria um jeito
    // de mandar quem acabou de aplicar para outro lugar.
    saida.link = /^\/[\w\-/]{0,80}$/.test(url)
      ? { texto: String(bruto?.link?.texto ?? "").slice(0, 60), url }
      : null;
  }
  return saida;
}

/* --------------------------------------------------------------------
   Quais perguntas foram realmente feitas a esta pessoa.

   Pergunta desligada não conta. Pergunta escondida por condição não foi
   perguntada: não conta como respondida, não entra em "respostas" e
   nunca é obrigatória.
   -------------------------------------------------------------------- */
export function perguntasVisiveis(definicao, respostas) {
  const marcado = new Map();
  const visiveis = [];

  for (const p of definicao?.perguntas ?? []) {
    if (!p?.ativa) continue;

    if (p.mostrar_se) {
      // a pergunta que abre a condição também precisa ter sido feita
      const marcadas = marcado.get(p.mostrar_se.chave);
      if (!marcadas) continue;
      const querem = p.mostrar_se.igual_a ?? [];
      if (!marcadas.some((m) => querem.includes(m))) continue;
    }

    visiveis.push(p);

    if (TIPOS_ESCOLHA.includes(p.tipo)) {
      const v = respostas?.[p.chave];
      marcado.set(
        p.chave,
        Array.isArray(v) ? v.map(String)
          : v === null || v === undefined || v === "" ? []
          : [String(v)],
      );
    }
  }

  return visiveis;
}

/* Confere uma resposta contra a régua do tipo dela.
   Devolve { valor } quando passa, ou { erro } com o texto que a pessoa
   lê. O texto escrito na pergunta manda; sem ele, vale o padrão do tipo. */
function validarUma(p, bruto) {
  const recado = (padrao) => p.erro || ERRO_PADRAO[padrao] || ERRO_PADRAO.faltando;

  const vazio = bruto === undefined || bruto === null || bruto === ""
    || (Array.isArray(bruto) && bruto.length === 0);
  if (vazio) {
    if (p.obrigatoria) return { erro: p.erro || ERRO_PADRAO.faltando, faltou: true };
    return { valor: p.tipo === "escolha_multipla" ? [] : "" };
  }

  if (TIPOS_ESCOLHA.includes(p.tipo)) {
    const possiveis = new Set((p.opcoes ?? []).map((o) => o.chave));

    if (p.tipo === "escolha_unica") {
      const marcada = String(bruto);
      if (!possiveis.has(marcada)) return { erro: recado("escolha_unica") };
      return { valor: marcada };
    }

    const lista = Array.isArray(bruto) ? bruto : [bruto];
    if (lista.length > LIMITE.marcacoes) return { erro: recado("escolha_multipla") };
    const marcadas = [];
    for (const item of lista) {
      const m = String(item);
      if (!possiveis.has(m)) return { erro: recado("escolha_multipla") };
      if (!marcadas.includes(m)) marcadas.push(m);
    }
    if (!marcadas.length && p.obrigatoria) {
      return { erro: p.erro || ERRO_PADRAO.faltando, faltou: true };
    }
    return { valor: marcadas };
  }

  if (p.tipo === "numero") {
    const n = typeof bruto === "number" ? bruto : Number(String(bruto).replace(",", "."));
    if (!Number.isFinite(n)) return { erro: recado("numero") };
    const minimo = p.mascara?.minimo ?? LIMITE.numeroMin;
    const maximo = p.mascara?.maximo ?? LIMITE.numeroMax;
    if (n < Math.max(minimo, LIMITE.numeroMin)) return { erro: recado("numero") };
    if (n > Math.min(maximo, LIMITE.numeroMax)) return { erro: recado("numero") };
    return { valor: n };
  }

  if (typeof bruto !== "string") return { erro: recado(p.tipo) };
  // caractere nulo presente recusa o campo inteiro
  if (bruto.includes(NULO)) return { erro: recado(p.tipo) };

  const texto = limparTexto(bruto);
  if (!texto) {
    if (p.obrigatoria) return { erro: p.erro || ERRO_PADRAO.faltando, faltou: true };
    return { valor: "" };
  }

  if (p.tipo === "email") {
    const email = texto.toLowerCase();
    if (tamanho(email) > LIMITE.email) return { erro: recado("email") };
    // Aceite permissivo de propósito: régua fechada demais recusa e-mail
    // que existe, e recusar quem quer aplicar custa mais que aceitar um
    // endereço errado, que a mesa descobre ao responder.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { erro: recado("email") };
    return { valor: email };
  }

  if (p.tipo === "telefone") {
    if (tamanho(texto) > LIMITE.telefone) return { erro: recado("telefone") };
    // O número chega no formato internacional que a pessoa vê. Com DDD
    // são 10 ou 11 dígitos, e o código do país cabe nos outros quatro.
    const digitos = texto.replace(/\D/g, "").length;
    if (digitos < 10 || digitos > 15) return { erro: recado("telefone") };
    return { valor: texto };
  }

  const teto = p.tipo === "texto_longo" ? LIMITE.textoLongo : LIMITE.textoCurto;
  const minimo = Math.max(p.mascara?.minimo ?? 0, 0);
  const maximo = Math.min(p.mascara?.maximo ?? teto, teto);
  const quantos = tamanho(texto);
  if (quantos < minimo || quantos > maximo) return { erro: recado(p.tipo) };
  return { valor: texto };
}

/* --------------------------------------------------------------------
   Confere a submissão inteira contra a versão que a pessoa leu.

   Junta TODOS os erros e responde de uma vez, para ela não corrigir um
   por vez. Chave que não existe naquela versão é jogada fora sem
   recusar, sem estourar e sem avisar: pode ser uma aba velha aberta.
   -------------------------------------------------------------------- */
export function validarRespostas(definicao, brutas, parcial = false) {
  const visiveis = perguntasVisiveis(definicao, brutas);
  const campos = [];
  const valores = new Map();

  for (const p of visiveis) {
    if (p.tipo === "recado") continue;

    const conferida = validarUma(p, brutas?.[p.chave]);

    // na captura parcial a pessoa ainda está respondendo, então falta de
    // resposta não é erro. Formato continua valendo.
    if (conferida.erro && !(parcial && conferida.faltou)) {
      campos.push({ chave: p.chave, erro: conferida.erro });
      continue;
    }

    valores.set(p.chave, conferida.valor ?? (p.tipo === "escolha_multipla" ? [] : ""));
  }

  if (campos.length) return { campos, frase: fraseDeRecusa(campos.length) };
  return { visiveis, valores };
}

/* --------------------------------------------------------------------
   O objeto "respostas", do jeito que a tela da mesa já lê.

   A chave é o TÍTULO da pergunta, exatamente como a pessoa leu, e não a
   identificação: "Ideias que chegaram" desenha as chaves como rótulo, e
   identificação técnica na frente da Carla é o que a casa não faz.

   Entra toda pergunta ativa e visível, mesmo em branco, porque o que a
   pessoa preferiu não dizer também é informação. Não entra pergunta
   desligada, escondida, nem recado.
   -------------------------------------------------------------------- */
export function montarRespostas(visiveis, valores) {
  const saida = {};

  for (const p of visiveis) {
    if (p.tipo === "recado") continue;

    let titulo = String(p.titulo ?? "").trim() || "Pergunta sem texto";
    // O título repetido já é recusado na gravação da versão. Ainda assim
    // o servidor se defende: melhor um rótulo esquisito que uma resposta
    // apagada por colisão de chave.
    if (Object.prototype.hasOwnProperty.call(saida, titulo)) {
      let n = 2;
      while (Object.prototype.hasOwnProperty.call(saida, `${titulo} (${n})`)) n++;
      titulo = `${titulo} (${n})`;
    }

    saida[titulo] = textoDoValor(p, valores.get(p.chave));
  }

  return saida;
}

/* Na escolha vale o TEXTO da opção, não a identificação dela: é o que a
   pessoa leu e é o que a mesa precisa enxergar. Escolha múltipla vira
   lista, e a tela da mesa já junta lista com vírgula. */
function textoDoValor(p, valor) {
  if (TIPOS_ESCOLHA.includes(p.tipo)) {
    const marcadas = Array.isArray(valor) ? valor : valor ? [String(valor)] : [];
    const textos = (p.opcoes ?? [])
      .filter((o) => marcadas.includes(o.chave))
      .map((o) => o.texto);
    return p.tipo === "escolha_unica" ? (textos[0] ?? "") : textos;
  }
  if (valor === null || valor === undefined) return "";
  return typeof valor === "number" ? String(valor) : String(valor);
}

/* A frase da aplicação incompleta, que é a única chave de "respostas"
   que não é pergunta. Ela existe porque a tela da mesa não tem outro
   lugar para dizer isso, e some sozinha quando a aplicação completa
   chega e sobrescreve as respostas inteiras. */
export function fraseIncompleta(visiveis, parouEm, agora = Date.now()) {
  const perguntas = visiveis.filter((p) => p.tipo !== "recado");
  const posicao = perguntas.findIndex((p) => p.chave === parouEm) + 1;
  const quando = dataPorExtenso(agora);
  return posicao > 0
    ? `Parou na pergunta ${posicao} de ${perguntas.length}, em ${quando}.`
    : `Parou antes de terminar, em ${quando}.`;
}

/* --------------------------------------------------------------------
   As colunas de leads.

   Nome, e-mail e WhatsApp vão para as colunas E continuam dentro de
   "respostas". A tela da mesa foi escrita contra essa duplicação, e o
   formulário próprio repete, não conserta.
   -------------------------------------------------------------------- */
export function montarLead({ envio, versao, visiveis, valores, respostas, plano, origem }) {
  const daPergunta = (papel) => {
    const p = visiveis.find((q) => q.papel === papel);
    const v = p ? valores.get(p.chave) : null;
    return typeof v === "string" ? v.trim() : null;
  };

  const email = daPergunta("email");

  return {
    // O prefixo garante que nunca colida com um token do Typeform, e a
    // coluna única continua fazendo o que já fazia: reenvio atualiza a
    // mesma linha em vez de virar uma segunda aplicação na mesa.
    typeform_response_id: `aplicar:${envio}`,
    // é assim que a mesa sabe qual formulário a pessoa respondeu
    typeform_form_id: `aplicar:v${versao}`,
    nome: daPergunta("nome") || null,
    email: email ? email.toLowerCase() : null,
    whatsapp: daPergunta("whatsapp") || null,
    respostas: JSON.stringify(respostas),
    plano: PLANOS.includes(plano) ? plano : null,
    origem: /^[a-z0-9_-]{1,24}$/.test(String(origem ?? "")) ? origem : "landing",
  };
}

/* Uma linha por opção marcada. Pergunta de texto não gera nenhuma. */
export function escolhasDaSubmissao(visiveis, valores) {
  const linhas = [];
  for (const p of visiveis) {
    if (!TIPOS_ESCOLHA.includes(p.tipo)) continue;
    const v = valores.get(p.chave);
    const marcadas = Array.isArray(v) ? v : v ? [String(v)] : [];
    for (const opcao of marcadas) linhas.push({ pergunta: p.chave, opcao });
  }
  return linhas;
}

/* --------------------------------------------------------------------
   Os passos que viram métrica.

   Esta rota NUNCA recebe o que a pessoa escreveu, e nem o que ela
   escolheu: só a identificação da pergunta, o tipo do passo e o tempo.
   Passo com tipo fora da lista, ou com pergunta que não existe naquela
   versão, é descartado sem recusar a chamada inteira.
   -------------------------------------------------------------------- */
export function normalizarEventos(lista, chavesValidas) {
  const limpos = [];
  const vistos = new Set();

  for (const e of lista) {
    const seq = inteiro(e?.seq);
    if (seq === null || seq < 1 || seq > 100000) continue;
    // o mesmo passo repetido dentro do lote não conta duas vezes
    if (vistos.has(seq)) continue;

    const tipo = String(e?.tipo ?? "");
    if (!TIPOS_EVENTO.includes(tipo)) continue;

    let pergunta = null;
    let ordem = null;
    if (EVENTO_COM_PERGUNTA.includes(tipo)) {
      const chave = String(e?.chave ?? "");
      if (!chavesValidas.has(chave)) continue;
      pergunta = chave;
      const posicao = inteiro(e?.ordem);
      ordem = posicao !== null && posicao > 0 && posicao <= LIMITE.perguntas ? posicao : null;
    }

    // tempo fora da régua vira zero, em vez de derrubar o passo: o tempo
    // é sinal, e um sinal torto não vale uma contagem perdida.
    const bruto = inteiro(e?.ms);
    const ms = bruto !== null && bruto >= 0 && bruto <= 3600000 ? bruto : 0;

    let detalhe = null;
    if (EVENTO_COM_DETALHE.includes(tipo)) {
      const d = String(e?.detalhe ?? "");
      detalhe = DETALHES.includes(d) ? d : null;
    }

    vistos.add(seq);
    limpos.push({ seq, tipo, pergunta, ordem, ms, detalhe });
  }

  return limpos;
}

/* O contexto só é lido no lote que traz a abertura, e é o que preenche a
   linha da visita. A referência é SÓ o domínio de quem indicou: caminho
   e busca carregam identificador de campanha e às vezes de pessoa. */
export function lerContexto(bruto) {
  const texto = (v, regua, tamanhoMax) => {
    const t = String(v ?? "").trim().toLowerCase();
    return t && t.length <= tamanhoMax && regua.test(t) ? t : null;
  };

  const aparelho = String(bruto?.aparelho ?? "");
  return {
    aparelho: APARELHOS.includes(aparelho) ? aparelho : "desconhecido",
    origem: texto(bruto?.origem, /^[a-z0-9_-]+$/, 24) ?? "direto",
    campanha: texto(bruto?.campanha, /^[a-z0-9_.-]+$/, 48),
    referencia: texto(bruto?.referencia, /^[a-z0-9.-]+$/, 64),
    plano: PLANOS.includes(bruto?.plano) ? bruto.plano : null,
  };
}

/* O que o lote diz sobre a visita. A linha da visita só anda para a
   frente: passo atrasado não apaga o que já aconteceu, e disso cuida o
   próprio SQL da gravação. */
export function resumoDoLote(eventos) {
  const tem = (tipo) => eventos.some((e) => e.tipo === tipo);
  const envio = eventos.find((e) => e.tipo === "enviou");

  let ultimaPergunta = null;
  let ultimaOrdem = 0;
  for (const e of eventos) {
    if (!e.pergunta || e.ordem === null) continue;
    if (e.ordem > ultimaOrdem) {
      ultimaOrdem = e.ordem;
      ultimaPergunta = e.pergunta;
    }
  }

  // Quantas perguntas a pessoa alcançou, medido pela posição mais alta
  // que ela viu. É a única conta que sobrevive ao "maior valor entre o
  // que já estava e o que chegou" da gravação. O funil da tela não sai
  // daqui: sai da tabela de passos.
  const alcancadas = eventos
    .filter((e) => e.tipo === "viu" && e.ordem !== null)
    .reduce((maior, e) => Math.max(maior, e.ordem), 0);

  return {
    comecou: tem("comecou"),
    revisou: tem("revisou"),
    enviou: Boolean(envio),
    msAteEnviar: envio && envio.ms > 0 ? envio.ms : null,
    alcancadas,
    ultimaPergunta,
    ultimaOrdem: ultimaOrdem || null,
  };
}

/* --------------------------------------------------------------------
   O período que a tela de números pede.
   Sem nada, os últimos 30 dias. No máximo 366 dias de uma vez.
   -------------------------------------------------------------------- */
const DATA = /^\d{4}-\d{2}-\d{2}$/;

const dataDeVerdade = (s) => {
  if (!DATA.test(s)) return null;
  const d = new Date(`${s}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  // pega 31 de fevereiro, que casa o formato e não existe
  return d.toISOString().slice(0, 10) === s ? d : null;
};

export function intervaloDeDatas(busca, hoje = diaDaqui()) {
  const pedidoDe = busca?.get("de");
  const pedidoAte = busca?.get("ate");

  const ate = pedidoAte ? dataDeVerdade(pedidoAte) : dataDeVerdade(hoje);
  if (!ate) return { erro: "a data final não é uma data." };

  const de = pedidoDe
    ? dataDeVerdade(pedidoDe)
    : new Date(ate.getTime() - 29 * 86400e3);
  if (!de) return { erro: "a data inicial não é uma data." };

  if (de > ate) return { erro: "a data inicial vem depois da final." };
  const dias = Math.round((ate.getTime() - de.getTime()) / 86400e3) + 1;
  if (dias > 366) return { erro: "o período pede mais de um ano de uma vez. Escolha um pedaço menor." };

  const versaoPedida = busca?.get("versao");
  let versao = null;
  if (versaoPedida !== null && versaoPedida !== undefined && versaoPedida !== "") {
    versao = Number(versaoPedida);
    if (!Number.isInteger(versao) || versao < 1) return { erro: "a versão pedida não é um número de versão." };
  }

  return { de: de.toISOString().slice(0, 10), ate: ate.toISOString().slice(0, 10), versao, dias };
}

/* ====================================================================
   Daqui para baixo, o que toca o banco.
   ==================================================================== */

/* --------------------------------------------------------------------
   A portaria das três rotas com login, igual à do /leads.

   Sem as duas configurações não dá para conferir token nenhum, e liberar
   seria pior que fechar. A mensagem é específica de propósito: quem a vê
   é quem publica o site, e um erro genérico custaria meia hora de caça
   ao nada.

   Devolve { barrado: Response } quando é para barrar, e { quem } com o
   que o Access autenticou quando pode seguir.
   -------------------------------------------------------------------- */
async function portaria(request, env) {
  const faltando = ["TEAM_DOMAIN", "ACCESS_AUD"].filter((v) => !env[v]);
  if (faltando.length) {
    return {
      barrado: json({ ok: false, erro: `falta configurar no Worker: ${faltando.join(", ")}` }, 503),
    };
  }

  const quem = await accessQuem(request, env.TEAM_DOMAIN, env.ACCESS_AUD);
  if (!quem) return { barrado: json({ ok: false, erro: "não autorizado" }, 401) };

  return { quem };
}

/* Lê o corpo com o tamanho conferido DUAS vezes: no que o pedido diz que
   traz, para recusar cedo, e no que ele trouxe de verdade, para recusar
   quem mentiu. Ler primeiro e medir depois é o que transforma um campo
   de dez megabytes em memória gasta. */
async function corpoJson(request, limiteBytes) {
  const anunciado = Number(request.headers.get("content-length"));
  if (Number.isFinite(anunciado) && anunciado > limiteBytes) return { grande: true };

  let cru;
  try {
    cru = await request.text();
  } catch {
    return { ilegivel: true };
  }
  if (new TextEncoder().encode(cru).length > limiteBytes) return { grande: true };

  try {
    const corpo = JSON.parse(cru);
    if (!corpo || typeof corpo !== "object" || Array.isArray(corpo)) return { ilegivel: true };
    return { cru, corpo };
  } catch {
    return { ilegivel: true };
  }
}

/* Versão publicada não muda mais depois de publicada, e por isso pode
   ficar guardada aqui entre um pedido e outro. Rascunho ainda muda, e
   por isso nunca entra. */
const versoesLidas = new Map();

async function definicaoDaVersao(env, numero) {
  if (versoesLidas.has(numero)) return versoesLidas.get(numero);

  const linha = await env.DB.prepare(
    "select versao, publicado_em, definicao from formulario_versoes where versao = ?1",
  ).bind(numero).first();
  if (!linha) return null;

  const definicao = JSON.parse(linha.definicao);
  definicao.versao = linha.versao;
  definicao.publicado_em = linha.publicado_em;

  if (linha.publicado_em) {
    if (versoesLidas.size > 20) versoesLidas.clear();
    versoesLidas.set(numero, definicao);
  }
  return definicao;
}

/* A que está no ar. Com a tabela vazia, a de fábrica: formulário no ar
   nunca depende de alguém ter publicado alguma coisa primeiro. */
async function versaoNoAr(env) {
  const linha = await env.DB.prepare(`
    select versao, publicado_em, definicao from formulario_versoes
    where publicado_em is not null order by versao desc limit 1
  `).first();

  if (!linha) return { versao: FORMULARIO_FABRICA.versao, definicao: FORMULARIO_FABRICA };

  const definicao = JSON.parse(linha.definicao);
  definicao.versao = linha.versao;
  definicao.publicado_em = linha.publicado_em;
  return { versao: linha.versao, definicao };
}

const chavesDaVersao = (definicao) =>
  new Set((definicao?.perguntas ?? []).map((p) => p.chave));

/* --------------------------------------------------------------------
   GET /api/formulario  ·  aberta

   É o que a página de aplicar lê para saber quais perguntas fazer. Uma
   leitura indexada, e nada além dela: esta rota abre o formulário para
   todo mundo que chega.
   -------------------------------------------------------------------- */
export async function formularioPublico(request, env) {
  try {
    const { definicao } = await versaoNoAr(env);
    return json({ ok: true, formulario: podar(definicao) });
  } catch {
    // A página cai na definição que o build embutiu nela e não mostra
    // tela de erro: erro que a pessoa não precisa resolver não vira
    // aviso na cara dela.
    return json({ ok: false, erro: "o formulário não pôde ser lido agora" }, 503);
  }
}

/* --------------------------------------------------------------------
   GET /api/formulario/versoes  ·  com login

   Existe porque um formulário que só se publica para a frente é um
   formulário que uma edição errada quebra sem volta.
   -------------------------------------------------------------------- */
export async function listarVersoes(request, env, url = new URL(request.url)) {
  const porta = await portaria(request, env);
  if (porta.barrado) return porta.barrado;

  const pedida = url.searchParams.get("versao");

  try {
    const atual = await env.DB.prepare(
      "select coalesce(max(versao), 0) as atual from formulario_versoes where publicado_em is not null",
    ).first();

    if (pedida !== null && pedida !== "") {
      const numero = Number(pedida);
      if (!Number.isInteger(numero) || numero < 1) {
        return json({ ok: false, erro: "essa não é uma versão." }, 400);
      }
      const definicao = await definicaoDaVersao(env, numero);
      if (!definicao) return json({ ok: false, erro: "essa versão não existe." }, 404);
      // sem poda: quem edita precisa ver o recado interno e os campos da
      // mesa, que é justamente o que a rota aberta não mostra
      return json({ ok: true, atual: atual.atual, formulario: definicao });
    }

    const { results } = await env.DB.prepare(`
      select v.versao, v.criado_em, v.publicado_em, v.publicado_por, v.nota, v.definicao,
             (select count(*) from leads l
               where l.typeform_form_id = 'aplicar:v' || v.versao) as respostas_recebidas
      from formulario_versoes v
      order by v.versao desc limit 100
    `).all();

    const versoes = (results ?? []).map((linha) => {
      let perguntas = 0;
      try {
        perguntas = (JSON.parse(linha.definicao)?.perguntas ?? []).length;
      } catch {
        perguntas = 0;
      }
      return {
        versao: linha.versao,
        criado_em: linha.criado_em,
        publicado_em: linha.publicado_em,
        publicado_por: linha.publicado_por,
        nota: linha.nota ?? "",
        perguntas,
        respostas_recebidas: linha.respostas_recebidas ?? 0,
      };
    });

    return json({ ok: true, atual: atual.atual, versoes });
  } catch {
    return json({ ok: false, erro: "não consegui ler as versões agora" }, 503);
  }
}

/* --------------------------------------------------------------------
   PUT /api/formulario  ·  com login

   Grava uma versão nova. Versão nunca se sobrescreve: cada publicação é
   uma linha nova, e a mais alta é a que está no ar. Quem edita as
   perguntas é quem toca o negócio, e uma edição errada as onze da noite
   precisa ter volta sem depender de ninguém.

   Ou a versão inteira entra, ou nada entra.
   -------------------------------------------------------------------- */
export async function gravarFormulario(request, env) {
  const porta = await portaria(request, env);
  if (porta.barrado) return porta.barrado;

  const lido = await corpoJson(request, LIMITE.corpoDefinicao);
  if (lido.grande) {
    return json({ ok: false, erro: "o formulário ficou grande demais para gravar de uma vez." }, 413);
  }
  if (lido.ilegivel) {
    return json({ ok: false, erro: "não consegui ler o formulário que veio." }, 400);
  }
  const corpo = lido.corpo;

  const base = inteiro(corpo.base_versao);
  if (base === null || base < 0) {
    return json({ ok: false, erro: "faltou dizer de qual versão esta edição partiu." }, 400);
  }

  try {
    const estado = await env.DB.prepare(`
      select
        (select coalesce(max(versao), 0) from formulario_versoes) as maior,
        (select coalesce(max(versao), 0) from formulario_versoes
          where publicado_em is not null) as atual,
        (select coalesce(max(versao), 0) from formulario_versoes
          where publicado_em is null) as rascunho
    `).first();

    // Alguém publicou enquanto esta pessoa editava. A versão que está no
    // ar vai junto, inteira, para a tela mostrar o que mudou sem uma
    // segunda ida ao servidor.
    if (base !== estado.atual) {
      const noAr = estado.atual
        ? await definicaoDaVersao(env, estado.atual)
        : FORMULARIO_FABRICA;
      return json({
        ok: false,
        erro: "alguém publicou uma versão nova enquanto você editava",
        atual: estado.atual,
        formulario: noAr,
      }, 409);
    }

    // As famílias de tipo saem só das versões publicadas: rascunho nunca
    // recebeu resposta, e travar por causa dele seria travar por nada. A
    // de fábrica também não entra, para a sexta pergunta poder virar uma
    // escolha no dia em que a Carla escrever o texto dela.
    const publicadas = await env.DB.prepare(`
      select versao, definicao from formulario_versoes
      where publicado_em is not null order by versao desc limit 100
    `).all();

    const familias = new Map();
    for (const linha of publicadas.results ?? []) {
      let anterior;
      try {
        anterior = JSON.parse(linha.definicao);
      } catch {
        continue;
      }
      for (const p of anterior?.perguntas ?? []) {
        if (!familias.has(p.chave)) familias.set(p.chave, familiaDoTipo(p.tipo));
      }
    }

    const conferida = validarDefinicao(corpo.definicao, familias);
    if (conferida.erro) return json({ ok: false, erro: conferida.erro }, 422);

    // O rascunho é a versão de maior número sem data de publicação, e
    // existe no máximo um: gravar rascunho sobrescreve o anterior em vez
    // de criar outro.
    const rascunho = estado.rascunho > estado.atual ? estado.rascunho : 0;
    const publicar = corpo.publicar === true;
    const numero = rascunho || estado.maior + 1;
    const agora = carimbo();
    const quemGravou = porta.quem?.email ?? null;
    const nota = String(corpo.nota ?? "").slice(0, LIMITE.nota);

    // versão, data e quem publicou são carimbados aqui: se vierem no
    // corpo, são ignorados
    const definicao = {
      versao: numero,
      publicado_em: publicar ? agora : null,
      publicado_por: quemGravou,
      nota,
      ...conferida.limpa,
    };

    await env.DB.prepare(`
      insert into formulario_versoes
        (versao, criado_em, publicado_em, publicado_por, nota, definicao)
      values (?1, datetime('now'), ?2, ?3, ?4, ?5)
      on conflict (versao) do update set
        publicado_em = excluded.publicado_em,
        publicado_por = excluded.publicado_por,
        nota = excluded.nota,
        definicao = excluded.definicao
    `).bind(
      numero, publicar ? agora : null, quemGravou, nota, JSON.stringify(definicao),
    ).run();

    versoesLidas.delete(numero);

    return json({
      ok: true,
      versao: numero,
      publicado_em: publicar ? agora : null,
      publicado_por: quemGravou,
    });
  } catch {
    return json({ ok: false, erro: "não consegui gravar o formulário agora. Tente de novo em um minuto." }, 503);
  }
}

/* --------------------------------------------------------------------
   Os baldes.

   Duas rotas ficam abertas para a internet inteira, e sem freio uma
   delas enche a mesa de lixo numa tarde. O freio mora no mesmo banco:
   contratar serviço de terceiro para contar até cinco seria caro e
   traria dependência nova para um site que hoje não faz nenhuma
   requisição para fora.

   O endereço de rede NUNCA é gravado, nem inteiro nem pela metade.
   Endereço cortado ainda identifica um prédio. O que entra na chave é um
   resumo dele com o dia junto, e o resumo troca de dia em dia.
   -------------------------------------------------------------------- */
async function resumoDoEndereco(request, dia) {
  const endereco = request.headers.get("cf-connecting-ip") ?? "";
  // Sem o cabeçalho, o que só acontece em desenvolvimento, o resumo vira
  // "local" e os limites valem igual.
  if (!endereco) return "local";

  const digerido = await crypto.subtle.digest(
    "SHA-256", new TextEncoder().encode(`${endereco}:${dia}`),
  );
  return [...new Uint8Array(digerido)]
    .map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
}

async function contarNoBalde(env, tipo, resumo, { limite, horas }) {
  const agora = Date.now();
  const janela = Math.floor(agora / (horas * 3600e3));

  const linha = await env.DB.prepare(`
    insert into formulario_baldes (chave, contagem, expira_em)
    values (?1, 1, ?2)
    on conflict (chave) do update set contagem = formulario_baldes.contagem + 1
    returning contagem
  `).bind(`${tipo}:${resumo}:${janela}`, carimbo(agora + horas * 3600e3)).first();

  const contagem = linha?.contagem ?? 1;
  // "acabou de estourar" é diferente de "está estourado": só o primeiro
  // vira linha de log, senão quem insiste escreve uma linha por tentativa
  return { estourou: contagem > limite, acabouDeEstourar: contagem === limite + 1 };
}

/* Limpeza sem tarefa agendada e sem peça nova: em uma chamada a cada
   cinquenta, sorteada, apaga o que venceu. */
async function varrerBaldes(env) {
  if (Math.random() >= 0.02) return;
  try {
    await env.DB.prepare("delete from formulario_baldes where expira_em < datetime('now')").run();
  } catch {
    // limpeza que falha não é problema de ninguém: a próxima faz
  }
}

const baldeCheio = () => json({
  ok: false,
  erro: "muitas tentativas seguidas deste mesmo lugar",
  tente_em: "1 hora",
}, 429);

/* O log cru é a única coisa que vai existir para explicar quando der
   problema em produção. Vale para o formulário próprio como já vale para
   o Typeform. */
async function anotarRecusa(env, motivo, payload = null) {
  try {
    await env.DB.prepare(
      "insert into webhook_log (origem, payload, erro) values ('formulario', ?1, ?2)",
    ).bind(payload, motivo).run();
  } catch {
    // o log é para explicar depois, e não pode derrubar a resposta agora
  }
}

/* --------------------------------------------------------------------
   POST /api/resposta  ·  aberta

   Recebe a aplicação e vira uma linha em leads, com o mesmo
   "insert ... on conflict" que o Typeform já usa: reenvio depois de
   queda de rede atualiza a mesma linha em vez de virar uma segunda
   aplicação na mesa.
   -------------------------------------------------------------------- */
export async function receberResposta(request, env) {
  const lido = await corpoJson(request, LIMITE.corpoResposta);
  if (lido.grande) {
    return json({ ok: false, erro: "as respostas vieram grandes demais para caber de uma vez." }, 413);
  }
  if (lido.ilegivel) {
    return json({ ok: false, erro: "não consegui ler o que veio." }, 400);
  }
  const corpo = lido.corpo;

  const envio = String(corpo.envio ?? "");
  if (!SORTEADO.test(envio)) {
    return json({ ok: false, erro: "esta aplicação veio sem identificação." }, 400);
  }

  const parcial = corpo.parcial === true;
  const agora = Date.now();
  const identificador = `aplicar:${envio}`;
  let log = null;

  try {
    // Reenvio e captura parcial não são aplicação nova, e por isso não
    // contam no balde: sem esta regra, quem responde nove perguntas com
    // a captura parcial ligada estouraria o próprio limite no meio.
    const jaExiste = await env.DB.prepare(
      "select id from leads where typeform_response_id = ?1",
    ).bind(identificador).first();

    if (!jaExiste) {
      const resumo = await resumoDoEndereco(request, diaDaqui(agora));
      const naHora = await contarNoBalde(env, "envio_hora", resumo, BALDE.envioHora);
      const noDia = naHora.estourou
        ? { estourou: false, acabouDeEstourar: false }
        : await contarNoBalde(env, "envio_dia", resumo, BALDE.envioDia);

      if (naHora.estourou || noDia.estourou) {
        if (naHora.acabouDeEstourar || noDia.acabouDeEstourar) {
          await anotarRecusa(env, "limite");
        }
        return baldeCheio();
      }
    }

    // A versão que a pessoa leu manda. Formulário publicado no meio do
    // preenchimento não pode fazer ninguém perder o que escreveu: a
    // aplicação é gravada com os títulos da versão que ela viu.
    const pedida = inteiro(corpo.versao);
    let definicao = pedida !== null && pedida > 0 ? await definicaoDaVersao(env, pedida) : null;
    if (definicao && !definicao.publicado_em) definicao = null;
    let versao;
    if (definicao) {
      versao = definicao.versao;
    } else {
      const noAr = await versaoNoAr(env);
      definicao = noAr.definicao;
      versao = noAr.versao;
    }

    // A armadilha. Veio com conteúdo, a aplicação não vira lead, e quem
    // mandou recebe a mesma resposta de quem foi aceito: assim o robô não
    // descobre que foi barrado e não aprende a desviar. O número de
    // descartados aparece na tela de números, e se ele subir junto com
    // reclamação, a trava sai.
    if (String(corpo.sobre_voce_extra ?? "").length > 0) {
      await anotarRecusa(env, "armadilha", lido.cru);
      return json({ ok: true, lead_id: null, recebido_em: carimbo(agora) });
    }

    const conferida = validarRespostas(definicao, corpo.respostas ?? {}, parcial);
    if (conferida.campos) {
      return json({ ok: false, erro: conferida.frase, campos: conferida.campos }, 422);
    }

    const respostas = montarRespostas(conferida.visiveis, conferida.valores);
    if (parcial) {
      // a única chave de "respostas" que não é pergunta, e ela some
      // sozinha quando a aplicação completa chega e sobrescreve tudo
      respostas["Aplicação incompleta"] =
        fraseIncompleta(conferida.visiveis, String(corpo.parou_em ?? ""), agora);
    }

    const lead = montarLead({
      envio, versao,
      visiveis: conferida.visiveis,
      valores: conferida.valores,
      respostas,
      plano: corpo.plano,
      origem: corpo.origem,
    });

    // O log cru vem ANTES de qualquer escrita. A captura parcial só gera
    // log na primeira daquele envio, senão o log vira ruído a cada vinte
    // segundos.
    if (!parcial || !jaExiste) {
      log = await env.DB.prepare(
        "insert into webhook_log (origem, payload) values ('formulario', ?1) returning id",
      ).bind(lido.cru).first();
    }

    // Uma aplicação é uma escrita só. Não existe meia aplicação.
    // O andamento e as observações ficam fora da atualização de
    // propósito: se a mesa já anotou alguma coisa e a pessoa reenvia, a
    // anotação da mesa não pode ser apagada por um repique de rede.
    const gravado = await env.DB.prepare(`
      insert into leads (typeform_response_id, typeform_form_id, nome, email,
                         whatsapp, respostas, plano, origem)
      values (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
      on conflict (typeform_response_id) do update set
        nome = excluded.nome, email = excluded.email, whatsapp = excluded.whatsapp,
        respostas = excluded.respostas, plano = excluded.plano,
        origem = excluded.origem, atualizado_em = datetime('now')
      returning id, atualizado_em
    `).bind(
      lead.typeform_response_id, lead.typeform_form_id, lead.nome, lead.email,
      lead.whatsapp, lead.respostas, lead.plano, lead.origem,
    ).first();

    // As escolhas entram depois. Se esta parte falhar, a aplicação fica e
    // o gráfico perde uma linha: aplicação na mesa vale mais que gráfico
    // completo. No reenvio, as antigas saem antes, senão a mesma pessoa
    // conta duas vezes.
    try {
      const instrucoes = [
        env.DB.prepare("delete from formulario_escolhas where lead_id = ?1").bind(gravado.id),
      ];
      for (const linha of escolhasDaSubmissao(conferida.visiveis, conferida.valores)) {
        instrucoes.push(env.DB.prepare(`
          insert into formulario_escolhas
            (criado_em, dia, lead_id, versao, pergunta_chave, opcao_chave)
          values (datetime('now'), date('now','-3 hours'), ?1, ?2, ?3, ?4)
        `).bind(gravado.id, versao, linha.pergunta, linha.opcao));
      }
      await env.DB.batch(instrucoes);
    } catch {
      // ver o parágrafo acima: a aplicação já está na mesa
    }

    if (log) {
      await env.DB.prepare("update webhook_log set processado = 1 where id = ?1")
        .bind(log.id).run();
    }

    await varrerBaldes(env);

    return json({ ok: true, lead_id: gravado.id, recebido_em: gravado.atualizado_em });
  } catch (e) {
    if (log) {
      try {
        await env.DB.prepare("update webhook_log set erro = ?1 where id = ?2")
          .bind(String(e?.message ?? e), log.id).run();
      } catch {
        // o log já não está ajudando; a resposta honesta abaixo, sim
      }
    }
    // A página guarda tudo e tenta de novo com o mesmo identificador, e o
    // reenvio atualiza a mesma linha.
    return json({ ok: false, erro: "não consegui gravar agora", pode_repetir: true }, 503);
  }
}

/* --------------------------------------------------------------------
   POST /api/evento  ·  aberta

   Recebe os passos que viram métrica, em lote. Esta rota nunca recebe o
   que a pessoa escreveu, e nem o que ela escolheu: só a identificação da
   pergunta e o tempo. O que ela respondeu só existe depois que ela
   apertou enviar, e mora em outra tabela.

   A identificação da visita e a do envio nunca viajam no mesmo pedido e
   nunca são gravadas na mesma linha. É o que impede a tabela de
   comportamento de virar dado pessoal por acidente.
   -------------------------------------------------------------------- */
export async function receberEvento(request, env) {
  const lido = await corpoJson(request, LIMITE.corpoEvento);
  if (lido.grande) return json({ ok: false, erro: "o lote veio grande demais." }, 413);
  if (lido.ilegivel) return json({ ok: false, erro: "não consegui ler o que veio." }, 400);
  const corpo = lido.corpo;

  const visita = String(corpo.visita ?? "");
  if (!SORTEADO.test(visita)) {
    return json({ ok: false, erro: "o lote veio sem identificação." }, 400);
  }

  const lista = corpo.eventos;
  if (!Array.isArray(lista) || lista.length < 1 || lista.length > LIMITE.eventos) {
    return json({ ok: false, erro: `o lote precisa trazer de 1 a ${LIMITE.eventos} passos.` }, 400);
  }

  try {
    const resumo = await resumoDoEndereco(request, diaDaqui());
    const porEndereco = await contarNoBalde(env, "evento_lugar", resumo, BALDE.eventoEndereco);
    if (porEndereco.estourou) return baldeCheio();
    const porVisita = await contarNoBalde(env, "evento_visita", visita, BALDE.eventoVisita);
    if (porVisita.estourou) return baldeCheio();

    const pedida = inteiro(corpo.versao);
    let definicao = pedida !== null && pedida > 0 ? await definicaoDaVersao(env, pedida) : null;
    let versao;
    if (definicao) {
      versao = definicao.versao;
    } else {
      const noAr = await versaoNoAr(env);
      definicao = noAr.definicao;
      versao = noAr.versao;
    }

    const eventos = normalizarEventos(lista, chavesDaVersao(definicao));
    if (!eventos.length) return json({ ok: true, gravados: 0 });

    const passo = resumoDoLote(eventos);
    const abriu = eventos.some((e) => e.tipo === "abriu");
    // O contexto só é lido no lote que traz a abertura, que é o que
    // preenche a linha da visita.
    const contexto = abriu
      ? lerContexto(corpo.contexto)
      : { aparelho: "desconhecido", origem: "direto", campanha: null, referencia: null, plano: null };

    const instrucoes = eventos.map((e) => env.DB.prepare(`
      insert into formulario_eventos
        (visita, seq, criado_em, dia, versao, tipo, pergunta, ordem, ms, detalhe)
      values (?1, ?2, datetime('now'), date('now','-3 hours'), ?3, ?4, ?5, ?6, ?7, ?8)
      on conflict (visita, seq) do nothing
    `).bind(visita, e.seq, versao, e.tipo, e.pergunta, e.ordem, e.ms, e.detalhe));

    // A linha da visita só anda para a frente: passo atrasado não apaga o
    // que já aconteceu, e depois do envio nada volta a dizer que ela não
    // enviou.
    instrucoes.push(env.DB.prepare(`
      insert into formulario_visitas (
        visita, aberta_em, dia, versao, aparelho, origem, campanha, referencia,
        plano, comecou_em, revisou_em, enviada_em, ultima_em, ms_ate_enviar,
        perguntas_vistas, ultima_pergunta, ultima_ordem)
      values (
        ?1, datetime('now'), date('now','-3 hours'), ?2, ?3, ?4, ?5, ?6, ?7,
        ?8, ?9, ?10, datetime('now'), ?11, ?12, ?13, ?14)
      on conflict (visita) do update set
        ultima_em        = datetime('now'),
        comecou_em       = coalesce(formulario_visitas.comecou_em, excluded.comecou_em),
        revisou_em       = coalesce(formulario_visitas.revisou_em, excluded.revisou_em),
        enviada_em       = coalesce(formulario_visitas.enviada_em, excluded.enviada_em),
        ms_ate_enviar    = coalesce(formulario_visitas.ms_ate_enviar, excluded.ms_ate_enviar),
        perguntas_vistas = max(formulario_visitas.perguntas_vistas,
                               coalesce(excluded.perguntas_vistas, 0)),
        ultima_ordem     = max(coalesce(formulario_visitas.ultima_ordem, 0),
                               coalesce(excluded.ultima_ordem, 0)),
        ultima_pergunta  = case
                             when coalesce(excluded.ultima_ordem, 0)
                                > coalesce(formulario_visitas.ultima_ordem, 0)
                             then excluded.ultima_pergunta
                             else formulario_visitas.ultima_pergunta
                           end
    `).bind(
      visita, versao, contexto.aparelho, contexto.origem, contexto.campanha,
      contexto.referencia, contexto.plano,
      passo.comecou ? carimbo() : null,
      passo.revisou ? carimbo() : null,
      passo.enviou ? carimbo() : null,
      passo.msAteEnviar,
      passo.alcancadas,
      passo.ultimaPergunta,
      passo.ultimaOrdem,
    ));

    const resultados = await env.DB.batch(instrucoes);
    // o passo repetido é recusado pela própria tabela, e por isso não
    // conta duas vezes aqui
    const gravados = resultados.slice(0, eventos.length)
      .reduce((soma, r) => soma + (r?.meta?.changes ?? 0), 0);

    await varrerBaldes(env);

    return json({ ok: true, gravados });
  } catch {
    return json({ ok: false, erro: "não consegui guardar os passos agora" }, 503);
  }
}

/* --------------------------------------------------------------------
   O resumo diário e o expurgo.

   Roda uma vez por dia, na primeira vez que alguém abre a tela de
   números. Sem serviço a mais, sem tarefa agendada, sem uma peça nova
   para dar manutenção. Pode rodar quantas vezes quiser: o resumo é
   idempotente e o expurgo apaga o que já venceu.
   -------------------------------------------------------------------- */
let ultimoResumo = "";

async function resumirDia(env) {
  const hoje = diaDaqui();
  if (ultimoResumo === hoje) return;
  ultimoResumo = hoje;

  // Os últimos quarenta dias, e não só ontem: passo atrasado ainda chega
  // depois da virada, e o resumo tem que alcançar o que chegou tarde.
  const desde = diaDaqui(Date.now() - 40 * 86400e3);

  try {
    await env.DB.batch([
      env.DB.prepare(`
        insert into formulario_dia
          (dia, aparelho, origem, visitas, iniciados, concluidos, ms_total_concluidos)
        select dia, aparelho, origem,
               count(*),
               sum(comecou_em is not null),
               sum(enviada_em is not null),
               coalesce(sum(case when enviada_em is not null
                                  and ms_ate_enviar between 5000 and 3600000
                            then ms_ate_enviar end), 0)
        from formulario_visitas
        where dia between ?1 and ?2
        group by dia, aparelho, origem
        on conflict (dia, aparelho, origem) do update set
          visitas             = excluded.visitas,
          iniciados           = excluded.iniciados,
          concluidos          = excluded.concluidos,
          ms_total_concluidos = excluded.ms_total_concluidos
      `).bind(desde, hoje),
      // o detalhe de comportamento serve para ajustar o formulário, e
      // ninguém muda a pergunta 5 por causa do que aconteceu em março
      env.DB.prepare("delete from formulario_eventos where dia < date('now', '-3 hours', '-90 days')"),
      env.DB.prepare("delete from formulario_visitas where dia < date('now', '-3 hours', '-12 months')"),
      env.DB.prepare("delete from formulario_baldes where expira_em < datetime('now')"),
    ]);
  } catch {
    // tenta de novo na próxima abertura da tela
    ultimoResumo = "";
  }
}

/* --------------------------------------------------------------------
   GET /api/metricas  ·  com login

   Os números que a tela desenha. Nenhuma consulta daqui cruza com a
   tabela das pessoas: a identificação da visita e a do envio nunca se
   encontram, e é por isso que não dá para saber quanto tempo uma pessoa
   com nome levou. A perda é de propósito.
   -------------------------------------------------------------------- */
export async function lerMetricas(request, env, url = new URL(request.url)) {
  const porta = await portaria(request, env);
  if (porta.barrado) return porta.barrado;

  const periodo = intervaloDeDatas(url.searchParams);
  if (periodo.erro) return json({ ok: false, erro: periodo.erro }, 400);
  const { de, ate, versao } = periodo;

  try {
    await resumirDia(env);

    // O pedaço abaixo é escolhido por um sim ou não, nunca montado com
    // texto de fora: o número da versão entra amarrado, como todo o resto.
    const filtro = versao ? " and versao = ?3" : "";
    const par = versao ? [de, ate, versao] : [de, ate];
    const com = (sql) => env.DB.prepare(sql).bind(...par);

    const resultados = await env.DB.batch([
      com(`
        select count(*) as abriu,
               sum(comecou_em is not null) as comecou,
               sum(revisou_em is not null) as revisou,
               sum(enviada_em is not null) as enviou
        from formulario_visitas where dia between ?1 and ?2${filtro}
      `),
      com(`
        with concluidas as (
          select ms_ate_enviar as ms from formulario_visitas
          where enviada_em is not null and dia between ?1 and ?2${filtro}
            and ms_ate_enviar between 5000 and 3600000
        ),
        ordenadas as (
          select ms, row_number() over (order by ms) as pos, count(*) over () as n
          from concluidas
        )
        select (select count(*) from concluidas) as amostra,
               round((select avg(ms) from concluidas)) as media_ms,
               round((select avg(ms) from ordenadas where pos in ((n+1)/2, (n+2)/2))) as mediana_ms,
               (select min(ms) from ordenadas where pos >= (n*9 + 9)/10) as p90_ms
      `),
      com(`
        select tipo, pergunta, count(distinct visita) as visitas
        from formulario_eventos
        where dia between ?1 and ?2${filtro} and pergunta is not null
          and tipo in ('viu', 'respondeu', 'voltou', 'erro_campo')
        group by tipo, pergunta
      `),
      com(`
        select ultima_pergunta as pergunta, count(*) as pararam
        from formulario_visitas
        where enviada_em is null and ultima_pergunta is not null
          and dia between ?1 and ?2${filtro}
        group by ultima_pergunta
      `),
      com(`
        with passos as (
          select pergunta, ms from formulario_eventos
          where tipo = 'respondeu' and dia between ?1 and ?2${filtro}
            and ms between 500 and 600000
        ),
        ordenadas as (
          select pergunta, ms,
                 row_number() over (partition by pergunta order by ms) as pos,
                 count(*)     over (partition by pergunta)             as n
          from passos
        ),
        medianas as (
          select pergunta, avg(ms) as mediana from ordenadas
          where pos in ((n+1)/2, (n+2)/2) group by pergunta
        )
        select p.pergunta,
               round(avg(p.ms))   as media_ms,
               round(m.mediana)   as mediana_ms
        from passos p join medianas m on m.pergunta = p.pergunta
        group by p.pergunta, m.mediana
      `),
      com(`
        select pergunta_chave, opcao_chave, count(*) as quantas
        from formulario_escolhas where dia between ?1 and ?2${filtro}
        group by pergunta_chave, opcao_chave
      `),
      com(`
        with recursive dias(dia) as (
          select ?1 union all select date(dia, '+1 day') from dias where dia < ?2
        )
        select d.dia,
               coalesce(s.abriu, 0)   as abriu,
               coalesce(s.comecou, 0) as comecou,
               coalesce(s.enviou, 0)  as enviou
        from dias d left join (
          select dia, count(*) as abriu,
                 sum(comecou_em is not null) as comecou,
                 sum(enviada_em is not null) as enviou
          from formulario_visitas where dia between ?1 and ?2${filtro}
          group by dia
        ) s on s.dia = d.dia
        order by d.dia
      `),
      com(`
        select aparelho, count(*) as visitas,
               sum(enviada_em is not null) as enviou,
               round(avg(case when enviada_em is not null
                               and ms_ate_enviar between 5000 and 3600000
                         then ms_ate_enviar end) / 1000.0) as media_seg
        from formulario_visitas where dia between ?1 and ?2${filtro}
        group by aparelho order by visitas desc
      `),
      com(`
        select origem, coalesce(campanha, 'sem campanha') as campanha,
               count(*) as visitas, sum(enviada_em is not null) as enviou
        from formulario_visitas where dia between ?1 and ?2${filtro}
        group by origem, coalesce(campanha, 'sem campanha')
        order by visitas desc limit 50
      `),
      com(`
        select coalesce(referencia, 'sem site de origem') as veio_de,
               count(*) as visitas, sum(enviada_em is not null) as enviou
        from formulario_visitas where dia between ?1 and ?2${filtro}
        group by coalesce(referencia, 'sem site de origem')
        order by visitas desc limit 50
      `),
      com(`
        select coalesce(plano, 'não clicou em nível') as plano,
               count(*) as visitas, sum(enviada_em is not null) as enviou
        from formulario_visitas where dia between ?1 and ?2${filtro}
        group by coalesce(plano, 'não clicou em nível')
        order by visitas desc
      `),
      // O que foi recusado na porta. O log não guarda versão, então este
      // recorte é sempre do período inteiro.
      env.DB.prepare(`
        select coalesce(sum(erro = 'armadilha'), 0) as armadilha,
               coalesce(sum(erro = 'limite'), 0)    as limite
        from webhook_log
        where origem = 'formulario'
          and date(recebido_em, '-3 hours') between ?1 and ?2
      `).bind(de, ate),
      // As respostas recusadas saem dos passos, e nao do log: o que foi
      // recusado por formato nunca chegou a virar aplicacao, e o log
      // guarda so o que chegou.
      com(`
        select count(*) as respostas from formulario_eventos
        where tipo = 'falhou' and detalhe = 'recusado'
          and dia between ?1 and ?2${filtro}
      `),
      versao
        ? env.DB.prepare("select versao, definicao from formulario_versoes where versao = ?1").bind(versao)
        : env.DB.prepare(`
            select versao, definicao from formulario_versoes
            where publicado_em is not null order by versao desc limit 100
          `),
    ]);

    const [rFunil, rTempo, rPassos, rParadas, rTempos, rEscolhas, rDia,
           rAparelho, rOrigem, rReferencia, rPlano, rPorta, rRecusadas,
           rVersoes] = resultados;

    const uma = (r) => r?.results?.[0] ?? {};
    const varias = (r) => r?.results ?? [];

    /* o funil, em visitas distintas e não em passos */
    const abriu = uma(rFunil).abriu ?? 0;
    const comecou = uma(rFunil).comecou ?? 0;
    const revisou = uma(rFunil).revisou ?? 0;
    const enviou = uma(rFunil).enviou ?? 0;
    // divisor zero devolve zero, nunca divisão por zero
    const parte = (a, b) => (b ? Math.round((a / b) * 1000) / 1000 : 0);

    /* as perguntas, pela versão mais nova em que cada uma aparece */
    const definicoes = [];
    for (const linha of varias(rVersoes)) {
      try {
        definicoes.push(JSON.parse(linha.definicao));
      } catch {
        // versão ilegível não derruba a tela inteira
      }
    }
    if (!definicoes.length) definicoes.push(FORMULARIO_FABRICA);

    // Quem existiu e sumiu continua na lista, com "no ar" falso: o número
    // dela é histórico, e sumir com ele esconderia o passado.
    const noAr = new Set(
      (definicoes[0].perguntas ?? []).filter((p) => p.ativa).map((p) => p.chave),
    );

    const conhecidas = new Map();
    for (const def of definicoes) {
      let posicao = 0;
      for (const p of def.perguntas ?? []) {
        if (p.tipo === "recado") continue;
        posicao++;
        if (conhecidas.has(p.chave)) continue;
        conhecidas.set(p.chave, {
          titulo: p.titulo,
          posicao,
          escolha: TIPOS_ESCOLHA.includes(p.tipo),
          opcoes: p.opcoes ?? [],
        });
      }
    }

    const porTipo = (tipo) => {
      const mapa = new Map();
      for (const r of varias(rPassos)) if (r.tipo === tipo) mapa.set(r.pergunta, r.visitas);
      return mapa;
    };
    const viram = porTipo("viu");
    const responderam = porTipo("respondeu");
    const voltaram = porTipo("voltou");
    const erraram = porTipo("erro_campo");
    const pararam = new Map(varias(rParadas).map((r) => [r.pergunta, r.pararam]));
    const tempos = new Map(varias(rTempos).map((r) => [r.pergunta, r]));

    const marcadas = new Map();
    for (const r of varias(rEscolhas)) {
      if (!marcadas.has(r.pergunta_chave)) marcadas.set(r.pergunta_chave, new Map());
      marcadas.get(r.pergunta_chave).set(r.opcao_chave, r.quantas);
    }

    const perguntas = [];
    for (const [chave, info] of conhecidas) {
      const viu = viram.get(chave) ?? 0;
      const abandonou = pararam.get(chave) ?? 0;
      const temNumero = viu || responderam.has(chave) || abandonou || marcadas.has(chave);
      // pergunta que nunca esteve no ar e nunca teve número não vira linha
      if (!noAr.has(chave) && !temNumero) continue;

      const contagens = marcadas.get(chave);
      perguntas.push({
        chave,
        titulo: info.titulo,
        posicao: info.posicao,
        ativa: noAr.has(chave),
        viu,
        respondeu: responderam.get(chave) ?? 0,
        voltou: voltaram.get(chave) ?? 0,
        erro_campo: erraram.get(chave) ?? 0,
        abandonou,
        mediana_ms: tempos.get(chave)?.mediana_ms ?? null,
        media_ms: tempos.get(chave)?.media_ms ?? null,
        // a distribuição vem do envio de verdade, nunca de passo, e por
        // isso não é forjável de fora
        opcoes: info.escolha
          ? info.opcoes.map((o) => ({
              chave: o.chave,
              texto: o.texto,
              quantas: contagens?.get(o.chave) ?? 0,
            }))
          : [],
      });
    }
    perguntas.sort((a, b) => a.posicao - b.posicao);

    let pior = null;
    for (const p of perguntas) {
      if (!p.viu || !p.abandonou) continue;
      const pct = Math.round((1000 * p.abandonou) / p.viu) / 10;
      if (!pior || pct > pior.abandono_pct) {
        pior = { chave: p.chave, abandonou: p.abandonou, abandono_pct: pct };
      }
    }

    return json({
      ok: true,
      de, ate,
      versao: versao ?? null,
      lido_em: carimbo(),
      funil: {
        abriu, comecou, revisou, enviou,
        conclusao_sobre_comecou: parte(enviou, comecou),
        conclusao_sobre_abriu: parte(enviou, abriu),
        abandono: abriu - enviou,
      },
      tempo: {
        mediana_ms: uma(rTempo).mediana_ms ?? null,
        media_ms: uma(rTempo).media_ms ?? null,
        p90_ms: uma(rTempo).p90_ms ?? null,
        amostra: uma(rTempo).amostra ?? 0,
      },
      perguntas,
      pior_pergunta: pior,
      por_dia: varias(rDia),
      por_aparelho: varias(rAparelho),
      por_origem: varias(rOrigem),
      por_referencia: varias(rReferencia),
      por_plano: varias(rPlano),
      recusadas: {
        armadilha: uma(rPorta).armadilha ?? 0,
        limite: uma(rPorta).limite ?? 0,
        respostas: uma(rRecusadas).respostas ?? 0,
      },
    });
  } catch {
    return json({ ok: false, erro: "não consegui ler os números agora" }, 503);
  }
}

/* --------------------------------------------------------------------
   O roteador das seis.
   Método errado no caminho certo responde 405, como o resto do Worker.
   -------------------------------------------------------------------- */
const metodoErrado = () => json({ ok: false, erro: "método" }, 405);

export async function rotasAplicar(request, env, url = new URL(request.url)) {
  switch (url.pathname) {
    case "/api/formulario":
      if (request.method === "GET") return formularioPublico(request, env);
      if (request.method === "PUT") return gravarFormulario(request, env);
      return metodoErrado();

    case "/api/formulario/versoes":
      return request.method === "GET"
        ? listarVersoes(request, env, url)
        : metodoErrado();

    case "/api/resposta":
      return request.method === "POST" ? receberResposta(request, env) : metodoErrado();

    case "/api/evento":
      return request.method === "POST" ? receberEvento(request, env) : metodoErrado();

    case "/api/metricas":
      return request.method === "GET" ? lerMetricas(request, env, url) : metodoErrado();
  }

  return json({ ok: false, erro: "este caminho não existe" }, 404);
}

/* --------------------------------------------------------------------
   Para ligar no roteador, duas linhas em src/index.js.

   Junto dos outros imports, no topo:

     import { rotasAplicar } from "./aplicar.js";

   E dentro do fetch, ANTES do switch, porque são cinco caminhos com um
   prefixo só:

     if (url.pathname.startsWith("/api/")) return rotasAplicar(request, env, url);

   No wrangler.toml, "/api/*" entra em run_worker_first, e o
   schema-formulario.sql é aplicado no D1 uma vez.
   -------------------------------------------------------------------- */
