/**
 * O ATENDENTE — a IA que atende antes do humano
 * ─────────────────────────────────────────────────────────────────────
 * O problema que este arquivo resolve não é de tecnologia, é de custo:
 * hoje alguém precisa ficar de plantão esperando mensagem para qualificar
 * do zero, perguntando o que a pessoa já respondeu no site. Quem manda
 * mensagem às 22h espera até amanhã. Quem não manda, some.
 *
 * O atendente conversa, qualifica e só passa para gente quando há motivo.
 * Ele NÃO fecha negócio, NÃO dá preço e NÃO promete prazo: essas três
 * coisas são da Carla e da equipe, e um modelo de linguagem inventaria
 * qualquer uma delas com a maior convicção.
 *
 *   WhatsApp da pessoa
 *        │
 *        ▼
 *   Meta Cloud API ──webhook──▶ este arquivo ──▶ modelo de linguagem
 *                                    │
 *                                    ├─ responde (janela de 24h, grátis
 *                                    │  até 1/10/2026)
 *                                    ├─ grava o lead qualificado
 *                                    └─ chama gente quando precisa
 *
 * TROCA DE MODELO: tudo passa por `chamarModelo()`. Trocar de Gemini para
 * Anthropic, ou de grátis para pago, é mexer numa função só.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const {
  IA_PROVEDOR = 'gemini',        // 'gemini' | 'anthropic' | 'openai-compat'
  IA_CHAVE = '',
  IA_MODELO = '',
  IA_URL = '',                   // só para 'openai-compat' (Groq, OpenRouter, local)
  IA_LIGADA = 'nao',             // trava de segurança: 'sim' liga o atendimento
  IA_MAX_TURNOS = '24',          // conversa longa demais é sinal de que precisa de gente
  DADOS_DIR = path.join(__dirname, 'dados')
} = process.env;

const MODELO_PADRAO = {
  gemini: 'gemini-2.5-flash',
  anthropic: 'claude-sonnet-5',
  'openai-compat': 'llama-3.3-70b-versatile'
};

// ─────────────────────────────────────────────────── o que ele pode dizer

/**
 * O QUE ELE SABE.
 *
 * Tudo aqui é verificável no site ou no sistema. Nada de número redondo
 * inventado para impressionar: se a fonte não existe, a linha não entra.
 * Quando este texto e o site discordarem, o site é que está certo — é o
 * que o cliente leu antes de mandar mensagem.
 */
const FATOS = `
GRUPO A! FATORIAL — consultoria de gestão para empresas e franquias.
CNPJ 30.361.388/0001-17. Santo André, São Paulo. @afatorialsolucoes.
Atua na EMPRESA: processo, preço, caixa, pessoas, expansão e valuation.
Tem equipe própria, rede de parceiras, catálogo de 83 serviços e um
sistema próprio onde a execução roda com etapa, dono e prazo registrados.

CARLA CAROLINE — mentoria comportamental e estratégia. @pscarlacaroline.
Atua na PESSOA QUE DIRIGE: comportamento, forma de decidir, delegação.
O método EMC (Estratégia, Mentalidade, Comportamento) é dela, não do
grupo: é a ordem em que ela lê um negócio. Programas: Operação Blindada,
DNA da Liderança e Comunicação Pão com Manteiga.

AS DUAS SE COMPLETAM, uma não substitui a outra. Estrutura sem mudança
de comportamento vira manual na gaveta; comportamento sem estrutura vira
motivação que passa na segunda-feira. Dá para começar por uma só.

OS CINCO SERVIÇOS QUE APARECEM NO SITE:
1. Raio-X do negócio — diagnóstico em 9 dimensões, 48 perguntas, 8
   indicadores tirados do balanço. É o serviço mais barato do catálogo e
   o ponto de entrada natural. Entrega plano de 90 dias em três ondas.
2. Arquitetura de preço — carga tributária pelos três regimes, custo por
   item, markup divisor, margem por hora do gargalo, limite de desconto.
3. Reestruturação e caixa — fluxo de 13 semanas, mapa de dívida, ponte de
   EBITDA, rota de renegociação.
4. Valuation — quanto a empresa vale, com faixa de negociação defensável.
5. Franqueabilidade — se dá ou não para franquear, e por quê.

COMO TRABALHAM: tudo termina em documento assinado, com norma e lei
citadas no laudo. O cliente acompanha pelo portal, etapa por etapa, e
aprova cada entrega. Uma etapa só avança quando o critério é atendido; se
não é, ela reabre sem custo, porque é etapa prevista.

PARA QUEM É: empresa que já saiu do começo, com equipe, faturamento e
cliente, e que cresceu sem estrutura para sustentar.
PARA QUEM NÃO É: empresa que ainda não vende (antes de estrutura é
preciso ter operação) e quem não aceita reunião semanal com execução
medida.

O QUE VOCÊ NÃO SABE E NÃO DEVE INVENTAR: preço de qualquer serviço,
prazo de qualquer entrega, disponibilidade de agenda, condição de
pagamento, desconto. Depende do escopo, e quem diz é a equipe, antes de
começar, nunca depois.
`.trim();

/**
 * COMO ELE SE COMPORTA.
 *
 * As regras estão em ordem de importância porque modelo de linguagem
 * obedece melhor o que vem primeiro. As três primeiras são as que
 * protegem a empresa: não inventar, não prometer, não empurrar.
 */
const INSTRUCAO = `
Você atende o WhatsApp do Grupo A! Fatorial. Fala como uma pessoa da
equipe: direta, calma, sem eufemismo e sem animação de vendedor.

REGRAS QUE NÃO SE QUEBRAM
1. Não invente. Preço, prazo, agenda, desconto e condição de pagamento
   você NÃO sabe. Se perguntarem, diga que depende do escopo, que a
   equipe informa antes de começar e nunca depois, e ofereça passar para
   uma pessoa.
2. Não prometa resultado, retorno, porcentagem nem tempo de retorno.
3. Não empurre. Se o caso não for para a A! Fatorial, diga isso. Empresa
   que ainda não vende precisa de operação antes de estrutura, e falar
   isso na hora vale mais do que uma reunião perdida.
4. Nunca diga que é uma inteligência artificial fingindo ser humana. Se
   perguntarem diretamente se é um robô, responda que é um atendimento
   automático da A! Fatorial e que pode chamar uma pessoa agora mesmo.
5. Não peça CPF, cartão, senha, dado bancário nem documento.

O QUE VOCÊ FAZ
Entende o problema e qualifica, nesta ordem, uma pergunta por vez:
  a) o que está acontecendo na empresa (deixe a pessoa contar)
  b) setor e faturamento aproximado por mês
  c) há quanto tempo está assim e o que já tentou
  d) urgência
Nunca faça duas perguntas na mesma mensagem. Nunca faça uma pergunta que
a pessoa já respondeu.

COMO ESCREVE
Mensagem curta, de WhatsApp: uma a três frases. Sem lista com marcador,
sem negrito, sem emoji. Português do Brasil. Trate por você.
Não use travessão (—) em nenhuma hipótese: use vírgula, dois-pontos ou
ponto final.
Nunca repita o que a pessoa acabou de dizer antes de responder.

QUANDO CHAMAR GENTE
Escreva a marca [HUMANO] no fim da sua mensagem quando:
  - a pessoa pedir para falar com alguém, com a Carla, ou reclamar
  - já for cliente e o assunto for entrega, prazo ou contrato
  - perguntar preço ou proposta pela segunda vez
  - a qualificação estiver completa e a pessoa quiser seguir
  - o assunto for jurídico, cobrança ou algo que você não sabe responder
A marca não aparece para a pessoa: o sistema a remove antes de enviar.

QUANDO A QUALIFICAÇÃO ESTIVER COMPLETA
Escreva, na última linha, exatamente:
[LEAD] setor=... | faturamento=... | tempo=... | tentou=... | urgencia=... | frente=...
onde frente é uma de: preco, processo, caixa, pessoas.
Essa linha também é removida antes de enviar.
`.trim();

// ────────────────────────────────────────────────────────── a conversa

const ARQ = path.join(DADOS_DIR, 'atendimentos.json');
let conversas = {};
try {
  fs.mkdirSync(DADOS_DIR, { recursive: true });
  if (fs.existsSync(ARQ)) conversas = JSON.parse(fs.readFileSync(ARQ, 'utf8'));
} catch (e) { conversas = {}; }

let gravando = null;
function agora() {
  if (gravando) { clearTimeout(gravando); gravando = null; }
  try { fs.writeFileSync(ARQ, JSON.stringify(conversas, null, 1)); } catch (e) {}
}
function gravar() {
  // agrupa gravações: cem mensagens seguidas não podem virar cem escritas
  if (gravando) return;
  gravando = setTimeout(() => { gravando = null; agora(); }, 200);
}
/* Se o servidor cair ou for reiniciado dentro da janela de agrupamento, o
   último turno se perderia, e o último turno é justamente aquele em que
   a qualificação fecha. Descarrega antes de morrer. */
['SIGINT', 'SIGTERM', 'beforeExit'].forEach(ev => process.on(ev, () => {
  agora(); if (ev !== 'beforeExit') process.exit(0);
}));

function conversa(de) {
  if (!conversas[de]) {
    conversas[de] = { de, inicio: new Date().toISOString(), turnos: [], lead: null, humano: false };
  }
  return conversas[de];
}

// ──────────────────────────────────────────────────────────── o modelo

/**
 * Uma função, três provedores. O corpo muda; o contrato não: recebe a
 * conversa, devolve texto. Trocar de modelo não mexe em mais nada.
 */
async function chamarModelo(historico) {
  const modelo = IA_MODELO || MODELO_PADRAO[IA_PROVEDOR] || MODELO_PADRAO.gemini;
  const sistema = INSTRUCAO + '\n\nO QUE VOCÊ SABE SOBRE A EMPRESA:\n' + FATOS;

  if (IA_PROVEDOR === 'gemini') {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${IA_CHAVE}`;
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: sistema }] },
        contents: historico.map(m => ({
          role: m.quem === 'pessoa' ? 'user' : 'model',
          parts: [{ text: m.texto }]
        })),
        generationConfig: { temperature: 0.4, maxOutputTokens: 400 }
      })
    });
    if (!r.ok) throw new Error('modelo respondeu ' + r.status + ': ' + (await r.text()).slice(0, 200));
    const d = await r.json();
    return (d.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('').trim();
  }

  if (IA_PROVEDOR === 'anthropic') {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': IA_CHAVE,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: modelo, max_tokens: 400, temperature: 0.4, system: sistema,
        messages: historico.map(m => ({
          role: m.quem === 'pessoa' ? 'user' : 'assistant', content: m.texto
        }))
      })
    });
    if (!r.ok) throw new Error('modelo respondeu ' + r.status + ': ' + (await r.text()).slice(0, 200));
    const d = await r.json();
    return (d.content || []).map(b => b.text || '').join('').trim();
  }

  // openai-compat: Groq, OpenRouter, Together, ou um modelo local
  const r = await fetch((IA_URL || 'https://api.groq.com/openai/v1') + '/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + IA_CHAVE },
    body: JSON.stringify({
      model: modelo, temperature: 0.4, max_tokens: 400,
      messages: [{ role: 'system', content: sistema }].concat(
        historico.map(m => ({ role: m.quem === 'pessoa' ? 'user' : 'assistant', content: m.texto }))
      )
    })
  });
  if (!r.ok) throw new Error('modelo respondeu ' + r.status + ': ' + (await r.text()).slice(0, 200));
  const d = await r.json();
  return (d.choices?.[0]?.message?.content || '').trim();
}

// ─────────────────────────────────────────────────────────── as marcas

/** Separa o que é para a pessoa do que é para o sistema. */
function separar(bruto) {
  let texto = bruto || '';
  const humano = /\[HUMANO\]/i.test(texto);
  let lead = null;
  const m = /\[LEAD\]([^\n]*)/i.exec(texto);
  if (m) {
    lead = {};
    m[1].split('|').forEach(par => {
      const i = par.indexOf('=');
      if (i > 0) lead[par.slice(0, i).trim().toLowerCase()] = par.slice(i + 1).trim();
    });
  }
  texto = texto.replace(/\[HUMANO\]/gi, '').replace(/\[LEAD\][^\n]*/gi, '').trim();
  // o modelo escapa e usa travessão de vez em quando, mesmo instruído
  texto = texto.replace(/\s+—\s+/g, ', ').replace(/—/g, ',');
  return { texto, humano, lead };
}

// ───────────────────────────────────────────────────────── o atendimento

/**
 * Uma mensagem entra, uma resposta sai.
 * Devolve { responder, humano, lead } — quem envia é o server.js, que já
 * sabe falar com a Meta.
 */
async function atender(de, textoRecebido, nomeWhats) {
  const c = conversa(de);
  if (nomeWhats && !c.nome) c.nome = nomeWhats;
  c.turnos.push({ quem: 'pessoa', texto: textoRecebido, em: new Date().toISOString() });

  // já está com gente: o atendente cala a boca e não atrapalha
  if (c.humano) { gravar(); return { responder: null, humano: true, lead: c.lead }; }

  // conversa comprida demais é sinal de que a máquina não está dando conta
  if (c.turnos.length > Number(IA_MAX_TURNOS)) {
    c.humano = true; gravar();
    return {
      responder: 'Vou chamar alguém da equipe para continuar com você por aqui.',
      humano: true, lead: c.lead
    };
  }

  let bruto;
  try {
    bruto = await chamarModelo(c.turnos.slice(-20));
  } catch (e) {
    // cota estourada, chave errada, provedor fora do ar: o cliente não
    // pode ficar sem resposta por causa disso
    c.humano = true; gravar();
    console.error('[atendente] modelo falhou:', e.message);
    return {
      responder: 'Recebi sua mensagem. Vou chamar alguém da equipe para te responder por aqui.',
      humano: true, lead: c.lead, erro: e.message
    };
  }

  const { texto, humano, lead } = separar(bruto);
  if (lead) c.lead = Object.assign({}, c.lead, lead);
  if (humano) c.humano = true;
  c.turnos.push({ quem: 'atendente', texto, em: new Date().toISOString() });
  gravar();

  return { responder: texto || 'Pode me contar um pouco do que está acontecendo na empresa?',
           humano, lead: c.lead };
}

function ligada() { return IA_LIGADA === 'sim' && !!IA_CHAVE; }
function listar() { return Object.values(conversas); }
function assumir(de) { const c = conversa(de); c.humano = true; gravar(); return c; }
function devolver(de) { const c = conversa(de); c.humano = false; gravar(); return c; }

module.exports = { atender, ligada, listar, assumir, devolver, FATOS, INSTRUCAO };
