// =====================================================================
// OPERAÇÃO BLINDADA · tmb-importar
//
// POR QUE ISTO EXISTE, E O QUE O WEBHOOK NÃO RESOLVE
//
// O webhook é PUSH: a TMB avisa quando uma venda acontece. Ele funciona
// para o futuro e não faz nada pelo passado. Quem comprou ANTES de os
// webhooks serem cadastrados está, neste momento, sem acesso e sem
// e-mail, e a única saída era liberar uma por uma na mesa.
//
// Esta função é PULL: ela pergunta à TMB quem comprou, pela API oficial,
// e libera quem ainda não tem acesso. Serve para três coisas:
//
//   1. IMPORTAR A TURMA que já existe, de uma vez;
//   2. CONFERIR de tempos em tempos se algum webhook se perdeu (a TMB
//      pode falhar em entregar, e um evento perdido é uma aluna que
//      pagou e não entrou);
//   3. RESPONDER "essa pessoa comprou mesmo?" sem sair do app.
//
// A TRAVA MAIS IMPORTANTE: ELA NASCE EM MODO DE CONFERÊNCIA.
// Sem `aplicar: true`, ela NÃO escreve nada e NÃO manda e-mail nenhum:
// só devolve o que faria. Numa operação em lote que dispara e-mail para
// gente de verdade, a ordem certa é ver primeiro e decidir depois. Um
// engano aqui manda senha errada para a turma inteira, e não tem como
// desfazer um e-mail.
//
// Deploy:
//   supabase functions deploy tmb-importar
// Segredos (os dois primeiros você pega no Portal do Produtor da TMB):
//   supabase secrets set TMB_API_TOKEN=...
//   supabase secrets set TMB_API_BASE=https://...        (o endereço da API)
//   supabase secrets set TMB_PRODUTO_ID=...              (opcional, filtra
//                                                         só o seu produto)
// =====================================================================
import { createClient } from "jsr:@supabase/supabase-js@2";

const URL_SB   = Deno.env.get("SUPABASE_URL")!;
const SERVICE  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TOKEN    = Deno.env.get("TMB_API_TOKEN") ?? "";
const BASE     = (Deno.env.get("TMB_API_BASE") ?? "").replace(/\/+$/, "");
const PRODUTO  = Deno.env.get("TMB_PRODUTO_ID") ?? "";

const db = createClient(URL_SB, SERVICE, { auth: { persistSession: false } });

const texto = (v: unknown): string => (v == null ? "" : String(v)).trim();
const mail  = (v: unknown): string => texto(v).toLowerCase();

/* As MESMAS listas do tmb-webhook, e isto é de propósito: as duas funções
   têm que concordar sobre o que é "pagou". Se um dia uma palavra nova
   aparecer, ela entra nos dois arquivos, senão o webhook libera e a
   conferência acusa a mesma pessoa como não paga, ou o contrário. */
function normaliza(v: unknown): string {
  return texto(v).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
const PAGOU = new Set([
  "efetivado", "efetivada", "aprovado", "aprovada", "pago", "paga",
  "confirmado", "confirmada", "concluido", "concluida", "recebido", "recebida",
]);
const CAIU = new Set([
  "cancelado", "cancelada", "estornado", "estornada", "reembolsado", "reembolsada",
  "recusado", "recusada", "chargeback", "expirado", "expirada",
]);

/* A TMB pode mudar o nome dos campos sem avisar, e a API de listagem não
   devolve necessariamente o mesmo formato do webhook. Nada aqui lê por
   posição: procura o e-mail e o status em todos os nomes plausíveis, e
   desce um nível quando os dados vêm dentro de "dados" ou "cliente". */
function achaCampo(o: Record<string, unknown>, nomes: string[]): string {
  for (const n of nomes) {
    if (o[n] != null && texto(o[n])) return texto(o[n]);
  }
  for (const filho of ["dados", "cliente", "comprador", "pedido"]) {
    const d = o[filho];
    if (d && typeof d === "object") {
      const v = achaCampo(d as Record<string, unknown>, nomes);
      if (v) return v;
    }
  }
  return "";
}

const CAMPOS_EMAIL  = ["email", "cliente_email", "email_cliente", "e_mail", "emailCliente"];
const CAMPOS_STATUS = ["status_pedido", "status", "situacao", "status_pagamento", "statusPedido"];
const CAMPOS_REF    = ["external_ref", "pedido_id", "id", "codigo", "numero_pedido"];
const CAMPOS_NOME   = ["nome", "cliente_nome", "nome_cliente", "nomeCliente"];

/* ------------------------------------------------------------------ */
/* Busca as páginas da TMB. Para de si mesma em três situações: a página */
/* voltou vazia, a API respondeu erro, ou o teto de páginas foi batido.  */
/* O teto existe para um defeito de paginação da outra ponta não virar   */
/* um laço infinito consumindo o tempo da função.                       */
/* ------------------------------------------------------------------ */
async function buscarPedidos(limitePaginas = 40): Promise<{ pedidos: unknown[]; aviso: string }> {
  if (!TOKEN) throw new Error("falta o segredo TMB_API_TOKEN");
  if (!BASE)  throw new Error("falta o segredo TMB_API_BASE (o endereco da API da TMB)");

  const pedidos: unknown[] = [];
  let aviso = "";
  for (let pagina = 1; pagina <= limitePaginas; pagina++) {
    const u = new URL(BASE + "/api/pedidos");
    u.searchParams.set("pageNumber", String(pagina));
    u.searchParams.set("pageSize", "100");
    if (PRODUTO) u.searchParams.set("produto_id", PRODUTO);

    const r = await fetch(u.toString(), {
      headers: { authorization: `Bearer ${TOKEN}`, accept: "application/json" },
    });
    if (!r.ok) {
      const corpo = await r.text().catch(() => "");
      throw new Error(`a TMB respondeu ${r.status} na pagina ${pagina}: ${corpo.slice(0, 200)}`);
    }
    const j = await r.json().catch(() => null);
    /* a lista pode vir na raiz, ou dentro de data/items/results/pedidos */
    const lista: unknown[] = Array.isArray(j) ? j
      : (j && (j.data ?? j.items ?? j.results ?? j.pedidos ?? j.content)) as unknown[] ?? [];
    if (!Array.isArray(lista) || lista.length === 0) break;
    pedidos.push(...lista);
    if (lista.length < 100) break;
    if (pagina === limitePaginas) aviso = `parei em ${limitePaginas} paginas: pode haver mais`;
  }
  return { pedidos, aviso };
}

async function acessoAtual(email: string): Promise<string | null> {
  const { data } = await db.from("access").select("status").eq("email", email).maybeSingle();
  return data ? String(data.status) : null;
}

async function liberar(email: string, ref: string) {
  const { error } = await db.from("access").upsert({
    email, status: "active", external_ref: ref || null,
    atualizado_em: new Date().toISOString(), evento_em: new Date().toISOString(),
  }, { onConflict: "email" });
  if (error) throw new Error("nao consegui gravar o acesso: " + error.message);

  /* so_se_nova: quem já entrou alguma vez mantém a senha dela, e quem
     recebeu a temporária há pouco não recebe outra. Sem isto, uma
     importação da turma inteira derrubaria a senha de todo mundo que já
     estava usando o app. */
  const r = await fetch(`${URL_SB}/functions/v1/liberar-aluna`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${SERVICE}` },
    body: JSON.stringify({ email, motivo: "importacao", so_se_nova: true }),
  });
  const j = await r.json().catch(() => null);
  if (!r.ok || !j || j.ok !== true) {
    throw new Error("acesso gravado, mas a senha nao saiu: " + JSON.stringify(j ?? r.status));
  }
}

function cors() {
  return {
    "content-type": "application/json",
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "authorization, content-type",
    "access-control-allow-methods": "POST, OPTIONS",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors() });
  if (req.method !== "POST") return new Response("metodo", { status: 405, headers: cors() });

  /* quem pode chamar: a mentora pelo app, ou o próprio servidor */
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "");
  let autorizado = false;
  if (token && token === SERVICE) {
    autorizado = true;
  } else if (token) {
    const comToken = createClient(URL_SB, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: { headers: { authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });
    const { data } = await comToken.rpc("eh_mentora");
    autorizado = data === true;
  }
  if (!autorizado) {
    return new Response(JSON.stringify({ erro: "nao autorizado" }), { status: 401, headers: cors() });
  }

  let corpo: { aplicar?: boolean } = {};
  try { corpo = await req.json(); } catch { /* sem corpo: fica na conferência */ }
  /* o padrão é NÃO aplicar. Quem quer escrever pede explicitamente. */
  const aplicar = corpo.aplicar === true;

  try {
    const { pedidos, aviso } = await buscarPedidos();

    /* o mesmo e-mail pode ter vários pedidos (parcelamento, recompra).
       O que vale é: se QUALQUER pedido dele está pago, ele tem acesso. */
    const porEmail = new Map<string, { pago: boolean; caiu: boolean; ref: string; nome: string; status: string[] }>();
    const desconhecidos = new Set<string>();
    let semEmail = 0;

    for (const bruto of pedidos) {
      const o = (bruto ?? {}) as Record<string, unknown>;
      const email = mail(achaCampo(o, CAMPOS_EMAIL));
      if (!email) { semEmail++; continue; }
      const bStatus = achaCampo(o, CAMPOS_STATUS);
      const s = normaliza(bStatus);
      const at = porEmail.get(email) ?? { pago: false, caiu: false, ref: "", nome: "", status: [] };
      if (PAGOU.has(s)) { at.pago = true; at.ref = at.ref || achaCampo(o, CAMPOS_REF); }
      else if (CAIU.has(s)) at.caiu = true;
      else if (s) desconhecidos.add(bStatus);
      at.nome = at.nome || achaCampo(o, CAMPOS_NOME);
      if (bStatus && at.status.indexOf(bStatus) < 0) at.status.push(bStatus);
      porEmail.set(email, at);
    }

    const liberar_agora: string[] = [];
    const ja_tem: string[] = [];
    const nao_pagaram: string[] = [];
    for (const [email, v] of porEmail) {
      if (!v.pago) { nao_pagaram.push(email); continue; }
      const atual = await acessoAtual(email);
      if (atual === "active") ja_tem.push(email);
      else liberar_agora.push(email);
    }

    const erros: string[] = [];
    let liberados = 0;
    if (aplicar) {
      for (const email of liberar_agora) {
        const v = porEmail.get(email)!;
        try { await liberar(email, v.ref); liberados++; }
        catch (e) { erros.push(email + ": " + String((e as Error)?.message ?? e)); }
      }
    }

    const resumo = aplicar
      ? `importacao aplicada: ${liberados} liberada(s), ${ja_tem.length} ja tinham acesso, ${erros.length} com erro`
      : `conferencia: ${liberar_agora.length} seriam liberada(s), ${ja_tem.length} ja tem acesso, ${nao_pagaram.length} sem pagamento`;

    await db.from("webhook_log").insert({
      origem: "importacao", processado: erros.length === 0, acao: resumo,
      erro: erros.length ? erros.join(" | ").slice(0, 900) : null,
      payload: { aplicar, pedidos: pedidos.length } as never,
    });

    return new Response(JSON.stringify({
      ok: erros.length === 0,
      modo: aplicar ? "aplicado" : "conferencia (nada foi escrito, nenhum e-mail saiu)",
      pedidos_lidos: pedidos.length,
      pessoas: porEmail.size,
      liberar_agora, ja_tem, nao_pagaram,
      liberados: aplicar ? liberados : 0,
      sem_email: semEmail,
      status_desconhecidos: [...desconhecidos],
      erros, aviso,
    }, null, 1), { headers: cors() });
  } catch (e) {
    const msg = String((e as Error)?.message ?? e);
    await db.from("webhook_log").insert({
      origem: "importacao", processado: false,
      acao: "a importacao nao rodou", erro: msg.slice(0, 900),
      payload: {} as never,
    });
    return new Response(JSON.stringify({ ok: false, erro: msg }), { status: 200, headers: cors() });
  }
});
