// src/propostas.js — propostas com aceite eletrônico e assinatura por confirmação de WhatsApp.
//
// A portaria e a MESMA do /leads: gestor ou colaborador, conferidos no
// banco a cada pedido. Cliente nao cria nem lista proposta.
//
// O pacote dizia "via Access". O Access saiu em 02/09 e a porta passou a
// ser deste repositorio, com e-mail e senha; a portaria continua no mesmo
// lugar e com o mesmo nome, entao so o comentario mudou.
import { json } from "./lib.js";
import { portaria } from "./leads.js";

const LIMITE_TEXTO = 4000;
const LIMITE_PLANOS = 3;

/* ---------------- código da proposta (ID-XXXXX, nunca sequencial) ---------------- */

// alfabeto sem caracteres ambíguos (sem 0/O, 1/I/L)
const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function gerarCodigo() {
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  let sufixo = "";
  for (const b of bytes) sufixo += ALFABETO[b % ALFABETO.length];
  return `ID-${sufixo}`;
}

async function hashHex(texto) {
  const mac = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/* ---------------- contrato (fonte única: o worker) ---------------- */
// Tokens que a página substitui na exibição: {PLANO} {VALOR} {CONDICOES} {CONTRATANTE}
// No aceite, o worker substitui tudo e grava o texto final.

function clausulas(p) {
  const ctd = JSON.parse(p.contratada);
  const caseImagem = p.fundacao
    ? "Tendo sido concedida a condição especial de fundação indicada na proposta, o CONTRATANTE autoriza a documentação do projeto e o uso do case em materiais da CONTRATADA, sem exposição de dados sensíveis ou sigilosos."
    : "Sem autorização prévia e por escrito do CONTRATANTE, a CONTRATADA não o divulgará como case.";
  return [
    ["CONTRATO DE PRESTAÇÃO DE SERVIÇOS",
      `CONTRATADA: ${ctd.rs}, CNPJ ${ctd.cnpj}, com endereço em ${ctd.end}.\n{CONTRATANTE}`],
    ["1. Objeto",
      `Prestação, pela CONTRATADA, dos serviços descritos no plano "{PLANO}" da proposta ${p.codigo}, conforme escopo detalhado na própria proposta, que integra este contrato para todos os fins.`],
    ["2. Execução e prazo",
      "Os serviços seguem o ciclo e o formato descritos no plano aceito (encontros online ou presenciais). Remarcações devem ser solicitadas com ao menos 48 horas de antecedência; o não comparecimento sem aviso consome o encontro. A pedido do CONTRATANTE, o cronograma pode ser suspenso uma única vez, por até 30 dias."],
    ["3. Investimento",
      "O investimento é de {VALOR}.{CONDICOES} Em caso de inadimplência, a execução fica suspensa até a regularização, incidindo multa de 2%, juros de 1% ao mês e correção monetária."],
    ["4. Entregas por marcos",
      "As entregas seguem as etapas do Método ID (estratégia, posicionamento, oferta, processo, escala, resultado), conforme o escopo do plano aceito. Cada marco comunicado por e-mail ou WhatsApp considera-se aceito se não houver manifestação em 5 dias úteis."],
    ["5. Natureza do serviço",
      "Trata-se de obrigação de meio: a CONTRATADA emprega seu método e a melhor técnica, mas não garante faturamento, número de vendas ou resultado financeiro específico, que dependem da execução do CONTRATANTE e de fatores de mercado."],
    ["6. Obrigações do contratante",
      "Fornecer informações verdadeiras e os materiais necessários, comparecer aos encontros e executar as atividades combinadas. Atrasos causados pelo CONTRATANTE não suspendem os pagamentos."],
    ["7. Propriedade intelectual",
      "O Método ID, materiais, modelos e ferramentas da CONTRATADA permanecem de titularidade dela, com licença de uso pessoal e intransferível ao CONTRATANTE. O produto, a marca e os conteúdos desenvolvidos para o CONTRATANTE pertencem ao CONTRATANTE."],
    ["8. Confidencialidade e dados",
      "As partes manterão sigilo sobre informações não públicas uma da outra. Os dados pessoais tratados destinam-se exclusivamente à execução deste contrato, nos termos da Lei nº 13.709/2018 (LGPD)."],
    ["9. Case e imagem", caseImagem],
    ["10. Rescisão",
      "Qualquer parte pode rescindir mediante aviso de 15 dias. São devidos os valores proporcionais aos marcos e serviços já executados. Em desistência imotivada pelo CONTRATANTE, incide multa compensatória de 20% sobre o saldo remanescente."],
    ["11. Disposições gerais",
      `Comunicações por e-mail ou WhatsApp são válidas entre as partes. O aceite eletrônico registrado na página da proposta, confirmado por mensagem de WhatsApp do CONTRATANTE, expressa a concordância das partes (art. 107 do Código Civil). Fica eleito o foro da comarca de ${ctd.foro || "São Paulo/SP"}.`],
  ];
}

const brl = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);
const docFormatado = (d) =>
  d.length === 11 ? d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
  : d.length === 14 ? d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5")
  : d;

function contratoFinal(p, plano, c) {
  const contratante =
    `CONTRATANTE: ${c.nome}, CPF/CNPJ ${docFormatado(c.documento)}, e-mail ${c.email}, WhatsApp ${c.whatsapp}` +
    (c.endereco ? `, com endereço em ${c.endereco}.` : ".");
  return clausulas(p)
    .map(([t, x]) => `${t}\n${x}`)
    .join("\n\n")
    .replaceAll("{PLANO}", plano.t)
    .replaceAll("{VALOR}", brl(plano.val))
    .replaceAll("{CONDICOES}", plano.cond ? ` Condições: ${plano.cond}.` : "")
    .replaceAll("{CONTRATANTE}", contratante);
}

/* ---------------- validações ---------------- */

function lerPlanos(planos) {
  if (!Array.isArray(planos) || planos.length < 1 || planos.length > LIMITE_PLANOS) return null;
  const limpos = [];
  for (const pl of planos) {
    const t = String(pl?.t ?? "").trim();
    const val = Number(pl?.val);
    if (!t || !Number.isFinite(val) || val <= 0) return null;
    limpos.push({
      t: t.slice(0, 200),
      selo: String(pl?.selo ?? "").trim().slice(0, 40),
      esc: (Array.isArray(pl?.esc) ? pl.esc : []).map((e) => String(e).trim()).filter(Boolean).slice(0, 12),
      val,
      cond: String(pl?.cond ?? "").trim().slice(0, 300),
    });
  }
  return limpos;
}

function vencida(p) {
  if (!p.valida_ate) return false;
  return new Date(`${p.valida_ate}T23:59:59-03:00`).getTime() < Date.now();
}

const publica = (p) => ({
  codigo: p.codigo,
  cliente: p.cliente,
  empresa: p.empresa,
  diagnostico: p.diagnostico,
  fundacao: !!p.fundacao,
  planos: JSON.parse(p.planos),
  contratada: JSON.parse(p.contratada),
  valida_ate: p.valida_ate,
  status: p.status,
  clausulas: clausulas(p),
});

/* ---------------- rotas protegidas (equipe, com login) ---------------- */

export async function criarProposta(request, env) {
  const barrado = await portaria(request, env);
  if (barrado) return barrado;
  let corpo;
  try { corpo = await request.json(); } catch { return json({ erro: "corpo não é JSON" }, 400); }

  const cliente = String(corpo?.cliente ?? "").trim();
  const planos = lerPlanos(corpo?.planos);
  const ctd = corpo?.contratada ?? {};
  const zap = String(corpo?.whatsapp_destino ?? "").replace(/\D/g, "");
  if (!cliente) return json({ erro: "falta o nome do cliente" }, 400);
  if (!planos) return json({ erro: `planos inválidos: informe de 1 a ${LIMITE_PLANOS}, com nome e valor` }, 400);
  if (!ctd.rs || !ctd.cnpj || !ctd.end) return json({ erro: "falta contratada (rs, cnpj, end, foro)" }, 400);
  if (zap.length < 12) return json({ erro: "whatsapp_destino inválido (DDI+DDD+número)" }, 400);

  const leadId = corpo?.lead_id != null ? Number(corpo.lead_id) : null;
  if (leadId != null && (!Number.isInteger(leadId) || leadId <= 0)) return json({ erro: "lead_id inválido" }, 400);

  // código aleatório; em colisão (raríssima), tenta de novo
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    const codigo = gerarCodigo();
    try {
      const nova = await env.DB.prepare(`
        insert into propostas (codigo, lead_id, cliente, empresa, diagnostico, fundacao,
                               planos, contratada, whatsapp_destino, valida_ate)
        values (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
        returning id, codigo
      `).bind(
        codigo, leadId, cliente,
        String(corpo?.empresa ?? "").trim().slice(0, 200) || null,
        String(corpo?.diagnostico ?? "").trim().slice(0, LIMITE_TEXTO) || null,
        corpo?.fundacao ? 1 : 0,
        JSON.stringify(planos),
        JSON.stringify({
          rs: String(ctd.rs).trim(), cnpj: String(ctd.cnpj).trim(),
          end: String(ctd.end).trim(), foro: String(ctd.foro ?? "São Paulo/SP").trim(),
        }),
        zap,
        corpo?.valida_ate ?? null
      ).first();
      if (leadId != null) {
        await env.DB.prepare("update leads set status = 'proposta', atualizado_em = datetime('now') where id = ? and status not in ('ganho')")
          .bind(leadId).run();
      }
      return json({ ok: true, id: nova.id, codigo: nova.codigo });
    } catch (e) {
      if (!/unique/i.test(String(e?.message ?? e))) throw e;
    }
  }
  return json({ erro: "não consegui gerar um código único, tente de novo" }, 500);
}

export async function listarPropostas(request, env) {
  const barrado = await portaria(request, env);
  if (barrado) return barrado;
  const { results } = await env.DB.prepare(`
    select p.id, p.codigo, p.lead_id, p.cliente, p.empresa, p.planos, p.valida_ate,
           p.status, p.criado_em, p.visto_em, p.aceito_em,
           a.plano_titulo, a.valor, a.nome as aceite_nome, a.hash as aceite_hash
    from propostas p left join aceites a on a.proposta_id = p.id
    order by p.criado_em desc limit 500
  `).all();
  return json({
    ok: true,
    propostas: results.map((p) => ({
      ...p,
      planos: JSON.parse(p.planos),
      expirada: p.status !== "aceita" && vencida(p),
    })),
  });
}

/* ---------------- rotas públicas (cliente) ---------------- */

// GET /api/proposta?codigo=ID-XXXXX — abre pela tela de código
export async function abrirProposta(request, env) {
  const url = new URL(request.url);
  const codigo = String(url.searchParams.get("codigo") ?? "").toUpperCase().trim();
  if (!/^ID-[A-Z2-9]{5}$/.test(codigo)) return json({ erro: "código não encontrado" }, 404);
  const p = await env.DB.prepare("select * from propostas where codigo = ?").bind(codigo).first();
  if (!p) return json({ erro: "código não encontrado" }, 404);
  if (p.status === "enviada") {
    await env.DB.prepare("update propostas set status = 'vista', visto_em = datetime('now') where id = ?").bind(p.id).run();
    p.status = "vista";
  }
  return json({ ok: true, proposta: publica(p), expirada: vencida(p) });
}

// POST /api/aceite — registra o aceite e devolve o comprovante
export async function registrarAceite(request, env) {
  let corpo;
  try { corpo = await request.json(); } catch { return json({ erro: "corpo não é JSON" }, 400); }

  const codigo = String(corpo?.codigo ?? "").toUpperCase().trim();
  const p = await env.DB.prepare("select * from propostas where codigo = ?").bind(codigo).first();
  if (!p) return json({ erro: "código não encontrado" }, 404);
  if (p.status === "aceita") return json({ erro: "esta proposta já foi aceita" }, 409);
  if (vencida(p)) return json({ erro: "proposta expirada — fale com a gente no WhatsApp" }, 410);

  const planos = JSON.parse(p.planos);
  const indice = Number(corpo?.plano_indice);
  if (!Number.isInteger(indice) || indice < 0 || indice >= planos.length) return json({ erro: "escolha um dos planos" }, 400);

  const c = {
    nome: String(corpo?.nome ?? "").trim().slice(0, 200),
    documento: String(corpo?.documento ?? "").replace(/\D/g, ""),
    email: String(corpo?.email ?? "").trim().slice(0, 200),
    whatsapp: String(corpo?.whatsapp ?? "").replace(/\D/g, ""),
    endereco: String(corpo?.endereco ?? "").trim().slice(0, 300),
  };
  if (c.nome.length < 5 || !c.nome.includes(" ")) return json({ erro: "escreva o nome completo" }, 400);
  if (c.documento.length !== 11 && c.documento.length !== 14) return json({ erro: "CPF (11 dígitos) ou CNPJ (14 dígitos)" }, 400);
  if (c.whatsapp.length < 10 || c.whatsapp.length > 13) return json({ erro: "confira o WhatsApp (DDD + número)" }, 400);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.email)) return json({ erro: "confira o e-mail" }, 400);
  if (!corpo?.li_e_aceito) return json({ erro: "confirme que leu e aceita o contrato" }, 400);

  const plano = planos[indice];
  const contrato = contratoFinal(p, plano, c);
  const hash = await hashHex(`${contrato}|${p.codigo}|${indice}|${JSON.stringify(c)}`);

  const aceite = await env.DB.prepare(`
    insert into aceites (proposta_id, plano_indice, plano_titulo, valor, nome, documento,
                         email, whatsapp, endereco, contrato, hash, ip, user_agent)
    values (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)
    returning id, criado_em
  `).bind(
    p.id, indice, plano.t, plano.val, c.nome, c.documento, c.email, c.whatsapp,
    c.endereco || null, contrato, hash,
    request.headers.get("cf-connecting-ip"), request.headers.get("user-agent")
  ).first();

  await env.DB.prepare("update propostas set status = 'aceita', aceito_em = datetime('now') where id = ?").bind(p.id).run();
  if (p.lead_id != null) {
    await env.DB.prepare("update leads set status = 'ganho', atualizado_em = datetime('now') where id = ?").bind(p.lead_id).run();
  }

  return json({
    ok: true,
    codigo: p.codigo,
    plano: { t: plano.t, val: plano.val },
    hash,
    hash_curto: hash.slice(0, 16).toUpperCase(),
    aceito_em: aceite.criado_em,
    contrato,
    whatsapp_destino: p.whatsapp_destino,
  });
}
