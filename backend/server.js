/**
 * Ponte entre o Kanban e o WhatsApp (API oficial da Meta — Cloud API).
 *
 * Por que este servidor existe: o token do WhatsApp NUNCA pode ficar no
 * navegador (quem abrir o código da página consegue ler e usar). Então o
 * kanban chama este servidor, e é ele quem fala com a Meta.
 *
 *   navegador (index.html)  ->  POST /api/whatsapp  ->  Graph API da Meta
 *
 * Como rodar:
 *   1. cp .env.example .env    e preencha os valores
 *   2. npm install
 *   3. npm start
 *   4. no sistema: Kanban -> Integração com WhatsApp -> "Automático (API oficial)"
 *      e cole o endereço:  https://seu-servidor.com/api/whatsapp
 */
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json({ limit: '256kb' }));

// Só o endereço do seu sistema pode chamar esta ponte.
// ORIGENS=https://seusistema.com.br,http://localhost:3000  (vazio = libera tudo, use só em teste)
const ORIGENS = (process.env.ORIGENS || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({ origin: ORIGENS.length ? ORIGENS : true }));

const {
  WHATSAPP_TOKEN,                          // token permanente da Meta (Business)
  PHONE_ID,                                // ID do número remetente (Cloud API)
  APP_TOKEN,                               // senha simples que o kanban envia no Authorization
  TEMPLATE_NAME = 'nova_demanda',          // nome do template aprovado na Meta
  TEMPLATE_LANG = 'pt_BR',
  MENSAGEM_MODO = 'template',              // 'template' (padrão) | 'texto'
  GRAPH_URL,                               // opcional: só para testar sem gastar envio
  PORT = 3000
} = process.env;

const GRAPH = GRAPH_URL || 'https://graph.facebook.com/v21.0';

/** Confere a senha combinada entre o kanban e esta ponte. */
function autorizado(req) {
  if (!APP_TOKEN) return true;                       // sem senha configurada, não bloqueia
  const h = req.headers.authorization || '';
  return h === `Bearer ${APP_TOKEN}`;
}

/** Número no formato que a Meta aceita: só dígitos, com código do país. */
function numeroValido(n) {
  return /^\d{12,15}$/.test(String(n || '').replace(/\D/g, ''));
}

/** 2026-08-05 -> 05/08/2026 (o kanban manda a data no formato do banco). */
function dataBR(v) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v || ''));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : v;
}

/**
 * Monta o corpo do envio.
 *
 * modo 'template': é o caminho oficial para VOCÊ iniciar a conversa. Exige um
 *   template aprovado na Meta. Sugestão de texto ao cadastrar o template
 *   "nova_demanda" (categoria Utility, idioma pt_BR):
 *
 *     Olá {{1}}! Você recebeu uma nova demanda: {{2}}.
 *     Prioridade: {{3}}. Prazo: {{4}}. Etapa: {{5}}.
 *
 *   Atenção: parâmetro de template não aceita quebra de linha nem tabulação.
 *
 * modo 'texto': envia a mensagem completa (com emojis e quebras de linha), mas
 *   só é entregue se a pessoa falou com o seu número nas últimas 24h — é a
 *   regra da janela de atendimento da Meta. Bom para equipe que responde
 *   sempre; para o primeiro contato, use template.
 */
function montarEnvio(dados) {
  const { to, nome, mensagem, template, tarefa = {} } = dados;
  const numero = String(to).replace(/\D/g, '');

  if (MENSAGEM_MODO === 'texto') {
    return {
      messaging_product: 'whatsapp',
      to: numero,
      type: 'text',
      text: { preview_url: false, body: mensagem || 'Você recebeu uma nova demanda no kanban.' }
    };
  }

  const limpo = v => String(v == null || v === '' ? '—' : v).replace(/[\n\t]+/g, ' ').slice(0, 900);
  return {
    messaging_product: 'whatsapp',
    to: numero,
    type: 'template',
    template: {
      name: template || TEMPLATE_NAME,
      language: { code: TEMPLATE_LANG },
      components: [{
        type: 'body',
        parameters: [
          { type: 'text', text: limpo(nome) },                  // {{1}} quem recebe
          { type: 'text', text: limpo(tarefa.titulo) },         // {{2}} a demanda
          { type: 'text', text: limpo(tarefa.prioridade) },     // {{3}} prioridade
          { type: 'text', text: limpo(dataBR(tarefa.termino) || 'sem prazo') }, // {{4}} prazo
          { type: 'text', text: limpo(tarefa.etapa) }           // {{5}} etapa atual
        ]
      }]
    }
  };
}

app.post('/api/whatsapp', async (req, res) => {
  if (!autorizado(req)) return res.status(401).json({ erro: 'Chave de acesso inválida.' });
  if (!WHATSAPP_TOKEN || !PHONE_ID) return res.status(500).json({ erro: 'Configure WHATSAPP_TOKEN e PHONE_ID no .env.' });

  const { to } = req.body || {};
  if (!numeroValido(to)) return res.status(400).json({ erro: 'Número inválido. Use o formato 5511999999999.' });

  try {
    const resposta = await fetch(`${GRAPH}/${PHONE_ID}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(montarEnvio(req.body))
    });
    const dados = await resposta.json();

    if (!resposta.ok) {
      const msg = (dados.error && dados.error.message) || 'Falha no envio.';
      console.error('[whatsapp] erro da Meta:', msg);
      return res.status(resposta.status).json({ erro: msg, detalhe: dados.error || null });
    }

    const id = dados.messages && dados.messages[0] && dados.messages[0].id;
    console.log(`[whatsapp] enviado para ${String(to).slice(0, -4)}**** (${req.body.evento || 'demanda'}) id=${id}`);
    res.json({ ok: true, id, para: to });
  } catch (e) {
    console.error('[whatsapp] erro inesperado:', e.message);
    res.status(502).json({ erro: 'Não consegui falar com a API do WhatsApp: ' + e.message });
  }
});

/* ═══════════════════════════════════════════════════════════════════════
   D4SIGN — assinatura eletrônica do contrato de prestação de serviços
   O sistema manda o HTML do contrato + quem assina; a ponte cria o
   documento no cofre, cadastra o signatário e envia para assinatura.
   A chave da D4Sign fica AQUI, nunca no navegador.
   Docs: https://docapi.d4sign.com.br/
   ═══════════════════════════════════════════════════════════════════════ */
const D4_TOKEN  = process.env.D4SIGN_TOKEN  || '';   // tokenAPI
const D4_CRIPTO = process.env.D4SIGN_CRIPTO || '';   // cryptKey
const D4_COFRE  = process.env.D4SIGN_COFRE  || '';   // uuid_safe padrão
const D4_URL    = process.env.D4SIGN_URL    || 'https://secure.d4sign.com.br/api/v1';

function d4qs() {
  return `?tokenAPI=${encodeURIComponent(D4_TOKEN)}&cryptKey=${encodeURIComponent(D4_CRIPTO)}`;
}
async function d4(caminho, corpo) {
  const r = await fetch(D4_URL + caminho + d4qs(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo || {})
  });
  const txt = await r.text();
  let j; try { j = JSON.parse(txt); } catch { j = { bruto: txt }; }
  if (!r.ok) throw new Error((j && (j.message || j.error)) || `D4Sign respondeu ${r.status}`);
  return j;
}

app.post('/d4sign/enviar', async (req, res) => {
  if (!autorizado(req)) return res.status(401).json({ erro: 'Chave de acesso inválida.' });
  if (!D4_TOKEN || !D4_CRIPTO) return res.status(500).json({ erro: 'Configure D4SIGN_TOKEN e D4SIGN_CRIPTO no .env.' });

  const { nome, email, html, titulo, cofre } = req.body || {};
  if (!nome || !email || !html) return res.status(400).json({ erro: 'Faltam nome, email ou o conteúdo do contrato.' });

  const uuidSafe = cofre || D4_COFRE;
  if (!uuidSafe) return res.status(400).json({ erro: 'Informe o UUID do cofre (D4SIGN_COFRE no .env ou no painel do sistema).' });

  try {
    // 1) cria o documento a partir do HTML
    const doc = await d4(`/documents/${uuidSafe}/uploadbinary`, {
      base64_binary_file: Buffer.from(
        `<html><head><meta charset="utf-8"></head><body>${html}</body></html>`, 'utf8'
      ).toString('base64'),
      mime_type: 'text/html',
      name: (titulo || `Contrato - ${nome}`).replace(/[\\/:*?"<>|]/g, '-') + '.html'
    });
    const uuid = doc.uuid || doc.uuid_document;
    if (!uuid) throw new Error('A D4Sign não devolveu o identificador do documento.');

    // 2) cadastra quem assina
    await d4(`/documents/${uuid}/createlist`, {
      signers: [{ email, act: '1', foreign: '0', certificadoicpbr: '0', assinatura_presencial: '0' }]
    });

    // 3) manda para assinatura
    await d4(`/documents/${uuid}/sendtosigner`, {
      message: `Olá ${nome}, segue o contrato de prestação de serviços para assinatura.`,
      skip_email: '0', workflow: '0'
    });

    console.log(`[d4sign] contrato enviado para ${email} uuid=${uuid}`);
    res.json({ ok: true, uuid });
  } catch (e) {
    console.error('[d4sign] erro:', e.message);
    res.status(502).json({ erro: 'Não consegui falar com a D4Sign: ' + e.message });
  }
});

// consulta o estado da assinatura (o sistema chama para atualizar o cartão)
app.get('/d4sign/status/:uuid', async (req, res) => {
  if (!autorizado(req)) return res.status(401).json({ erro: 'Chave de acesso inválida.' });
  try {
    const r = await fetch(`${D4_URL}/documents/${req.params.uuid}${d4qs()}`);
    const j = await r.json();
    const d = Array.isArray(j) ? j[0] : j;
    // statusId 4 = finalizado/assinado na D4Sign
    res.json({ ok: true, status: d && d.statusName, assinado: String(d && d.statusId) === '4', bruto: d });
  } catch (e) {
    res.status(502).json({ erro: 'Não consegui consultar a D4Sign: ' + e.message });
  }
});

// webhook: a D4Sign avisa quando o contrato é assinado
// Cadastre esta URL em Configurações > Webhook no painel da D4Sign.
app.post('/d4sign/webhook', (req, res) => {
  const { uuid, type_post, message } = req.body || {};
  console.log(`[d4sign] webhook uuid=${uuid} evento=${type_post || message || '?'}`);
  // === BACKEND === aqui você grava no banco: contrato assinado -> libera o prestador
  res.json({ ok: true });
});

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    modo: MENSAGEM_MODO,
    template: TEMPLATE_NAME,
    configurado: Boolean(WHATSAPP_TOKEN && PHONE_ID),
    d4sign: Boolean(D4_TOKEN && D4_CRIPTO)
  });
});

app.listen(PORT, () => {
  console.log(`Ponte do WhatsApp no ar na porta ${PORT} (modo: ${MENSAGEM_MODO})`);
  if (!WHATSAPP_TOKEN || !PHONE_ID) console.warn('⚠  Faltam WHATSAPP_TOKEN e/ou PHONE_ID — copie o .env.example para .env.');
});
