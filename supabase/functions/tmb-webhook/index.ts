// =====================================================================
// OPERAÇÃO BLINDADA · webhook da TMB (Fase 1.10)
// Endpoint único para os dois webhooks: Vendas e Financeiro.
//
// Ordem sagrada de execução, nesta ordem e sem atalho:
//   1. autentica pelo header x-webhook-secret, com comparação de tempo
//      constante (=== vaza o tamanho do segredo por timing)
//   2. grava o payload cru em webhook_log ANTES de qualquer escrita,
//      porque quando der problema em produção esse log é a única coisa
//      que vai existir para explicar o que aconteceu
//   3. só então processa
//
// A TMB avisa que pode incluir campos novos sem aviso. Nada aqui lê por
// posição nem assume formato: campo ausente, lista vazia e caixa alta no
// e-mail passam sem quebrar.
//
// Deploy:
//   supabase functions deploy tmb-webhook --no-verify-jwt
// Segredos:
//   supabase secrets set TMB_WEBHOOK_SECRET=...
// =====================================================================
import { createClient } from "jsr:@supabase/supabase-js@2";

const URL_SB   = Deno.env.get("SUPABASE_URL")!;
const SERVICE  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SEGREDO  = Deno.env.get("TMB_WEBHOOK_SECRET") ?? "";

const db = createClient(URL_SB, SERVICE, { auth: { persistSession: false } });

/* comparação resistente a timing attack: sempre percorre tudo */
function segredoConfere(recebido: string): boolean {
  if (!SEGREDO) return false;
  const a = new TextEncoder().encode(recebido);
  const b = new TextEncoder().encode(SEGREDO);
  let dif = a.length ^ b.length;
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) dif |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return dif === 0;
}

const texto = (v: unknown): string => (v == null ? "" : String(v)).trim();
const mail  = (v: unknown): string => texto(v).toLowerCase();
const num   = (v: unknown): number | null => {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(/[^\d,.-]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
};
/* aceita 2026-07-30, 30/07/2026 e ISO com hora */
function data(v: unknown): string | null {
  const s = texto(v);
  if (!s) return null;
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  const iso = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return iso ? iso[1] : null;
}

/* ------------------------------------------------------------------ */
/* acha ou cria a conta. O aluno compra antes de existir no Auth, então  */
/* a conta nasce aqui, sem senha: ele entra depois pelo código de 6      */
/* dígitos. Nunca devolve erro fatal: sem user_id o access ainda casa    */
/* por e-mail quando ele fizer o primeiro login.                        */
/* ------------------------------------------------------------------ */
async function acharOuCriarUsuario(email: string): Promise<string | null> {
  if (!email) return null;
  try {
    const { data: achado } = await db.auth.admin.listUsers({ page: 1, perPage: 200 });
    const existe = achado?.users?.find((u) => (u.email ?? "").toLowerCase() === email);
    if (existe) return existe.id;
    const { data: novo, error } = await db.auth.admin.createUser({
      email, email_confirm: true,
    });
    if (error) return null;
    return novo?.user?.id ?? null;
  } catch { return null; }
}

async function gravarAcesso(
  email: string, status: "active" | "grace" | "inactive", ref?: string,
) {
  if (!email) return;
  const user_id = await acharOuCriarUsuario(email);
  const linha: Record<string, unknown> = {
    email, status, atualizado_em: new Date().toISOString(),
  };
  if (user_id) linha.user_id = user_id;
  if (ref) linha.external_ref = ref;
  await db.from("access").upsert(linha, { onConflict: "email" });
}

/* ------------------------------------------------------------------ */
/* WEBHOOK VENDAS: payload é OBJETO, status em status_pedido            */
/* ------------------------------------------------------------------ */
async function vendas(p: Record<string, unknown>) {
  const email  = mail(p.email ?? (p as any)?.cliente_email);
  const status = texto(p.status_pedido);
  const ref    = texto(p.external_ref ?? (p as any)?.pedido_id ?? (p as any)?.id);
  if (!email) return { ok: false, motivo: "sem e-mail" };

  if (status === "Efetivado") {
    // pagou o boleto de ENTRADA. Não é "pagou tudo": as parcelas seguem
    // chegando pelo webhook Financeiro.
    await gravarAcesso(email, "active", ref);
    return { ok: true, acao: "acesso ativado" };
  }
  if (status === "Cancelado") {
    await gravarAcesso(email, "inactive", ref);
    return { ok: true, acao: "acesso cancelado" };
  }
  return { ok: true, acao: "status ignorado: " + status };
}

/* ------------------------------------------------------------------ */
/* WEBHOOK FINANCEIRO: payload é LISTA, campos dentro de dados,         */
/* status em status_pagamento, e-mail em dados.cliente_email            */
/* ------------------------------------------------------------------ */
async function financeiro(itens: unknown[]) {
  const feito: string[] = [];
  for (const bruto of itens) {
    const item   = (bruto ?? {}) as Record<string, unknown>;
    const d      = ((item.dados ?? item) ?? {}) as Record<string, unknown>;
    const email  = mail(d.cliente_email ?? d.email);
    const status = texto(item.status_pagamento ?? d.status_pagamento);
    const ref    = texto(d.external_ref ?? d.pedido_id ?? item.external_ref ?? "");
    const numero = Number(num(d.parcela ?? d.numero_parcela ?? d.numero) ?? 1) || 1;
    const venc   = data(d.vencimento ?? d.data_vencimento);
    const valor  = num(d.valor ?? d.valor_parcela);
    if (!email) { feito.push("linha sem e-mail"); continue; }

    /* DELETED é renegociação ou cancelamento: fica no log, sem corte
       automático. A Carla olha caso a caso. */
    if (status === "DELETED") { feito.push("DELETED registrado, sem ação"); continue; }

    const mapa: Record<string, string> = {
      "Aguardando pagamento": "aberta",
      "Recebido": "paga",
      "Vencido": "vencida",
      "Estornado": "estornada",
    };
    const st = mapa[status] ?? "aberta";

    if (ref) {
      await db.from("parcelas").upsert({
        email, external_ref: ref, numero, vencimento: venc, valor,
        status: st, atualizado_em: new Date().toISOString(),
      }, { onConflict: "external_ref,numero" });
    }

    if (status === "Aguardando pagamento") {
      // não ignorar: é o insumo da régua de inadimplência
      feito.push(`parcela ${numero} registrada, vence ${venc ?? "sem data"}`);
      continue;
    }
    if (status === "Recebido") {
      const { data: abertas } = await db.from("parcelas")
        .select("id").eq("email", email).in("status", ["aberta", "vencida"])
        .lt("vencimento", new Date().toISOString().slice(0, 10));
      if (!abertas || abertas.length === 0) {
        await gravarAcesso(email, "active", ref);
        feito.push("pago e acesso reativado");
      } else {
        feito.push(`pago, mas ainda há ${abertas.length} parcela(s) vencida(s)`);
      }
      continue;
    }
    if (status === "Vencido" || status === "Estornado") {
      await gravarAcesso(email, "inactive", ref);
      feito.push(status === "Vencido" ? "vencido, acesso cortado" : "estornado, acesso cortado");
      continue;
    }
    feito.push("status ignorado: " + status);
  }
  return { ok: true, itens: feito };
}

/* ------------------------------------------------------------------ */
Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("método", { status: 405 });

  if (!segredoConfere(req.headers.get("x-webhook-secret") ?? "")) {
    return new Response(JSON.stringify({ erro: "nao autorizado" }), {
      status: 401, headers: { "content-type": "application/json" },
    });
  }

  let cru: unknown = null;
  try { cru = await req.json(); } catch { cru = null; }

  /* o log vem ANTES de qualquer escrita */
  const origem = Array.isArray(cru) ? "financeiro" : "vendas";
  const { data: log } = await db.from("webhook_log")
    .insert({ origem, payload: cru as never }).select("id").single();

  try {
    const r = Array.isArray(cru)
      ? await financeiro(cru)
      : await vendas((cru ?? {}) as Record<string, unknown>);

    if (log?.id) {
      await db.from("webhook_log").update({ processado: true }).eq("id", log.id);
    }
    // 200 sempre que o payload foi entendido: a TMB reenviaria em erro,
    // e reenvio sem necessidade é ruído. Erro real vai no log.
    return new Response(JSON.stringify(r), {
      status: 200, headers: { "content-type": "application/json" },
    });
  } catch (e) {
    if (log?.id) {
      await db.from("webhook_log")
        .update({ erro: String((e as Error)?.message ?? e) }).eq("id", log.id);
    }
    return new Response(JSON.stringify({ ok: false }), {
      status: 200, headers: { "content-type": "application/json" },
    });
  }
});
