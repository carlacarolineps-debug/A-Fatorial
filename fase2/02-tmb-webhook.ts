// =====================================================================
// OPERAÇÃO BLINDADA — FASE 2 — WEBHOOK DE PAGAMENTO (TMB)
// Supabase Edge Function (Deno / TypeScript)
//
// Substitui o antigo "cakto-webhook". A TMB avisa esta função a cada
// evento de pagamento (aprovado, boleto pendente, cancelado, reembolso...);
// a função LIBERA ou BLOQUEIA o acesso na tabela `access`.
//
// Nome da função no Supabase: tmb-webhook
// URL final: https://SEU-PROJETO.supabase.co/functions/v1/tmb-webhook
//
// Pontos que dependem do gateway estão marcados com // === TMB ===
// Confirme os nomes EXATOS dos eventos e o header de assinatura no
// painel/documentação da TMB antes de abrir as vendas.
// =====================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// --- segredos (Supabase > Edge Functions > Secrets) ---
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!; // só no servidor, NUNCA no HTML
const TMB_WEBHOOK_SECRET = Deno.env.get("TMB_WEBHOOK_SECRET") ?? "";

const db = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

// === TMB === Mapa de eventos da TMB → ação no acesso.
// Ajuste os nomes à esquerda para os nomes técnicos EXATOS que a TMB envia.
// LIBERA = compra confirmada / assinatura ativa. BLOQUEIA = perdeu o acesso.
// PENDENTE = boleto/PIX gerado e ainda não pago (não libera nada).
const EVENT_ACTION: Record<string, "LIBERA" | "BLOQUEIA" | "PENDENTE"> = {
  // libera
  "order.paid":              "LIBERA",
  "payment.approved":        "LIBERA",
  "purchase_approved":       "LIBERA",
  "subscription.created":    "LIBERA",
  "subscription.renewed":    "LIBERA",
  // pendente (boleto/PIX aguardando compensação) — registra, mas não libera
  "boleto.pending":          "PENDENTE",
  "pix.pending":             "PENDENTE",
  "order.waiting_payment":   "PENDENTE",
  // bloqueia
  "subscription.canceled":   "BLOQUEIA",
  "subscription.expired":    "BLOQUEIA",
  "payment.refunded":        "BLOQUEIA",
  "order.refunded":          "BLOQUEIA",
  "chargeback":              "BLOQUEIA",
};

// Cabeçalhos CORS (a TMB chama servidor-a-servidor; CORS ajuda em testes manuais)
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-tmb-signature, x-webhook-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "content-type": "application/json" },
  });
}

// === TMB === Verificação de autenticidade do aviso.
// A TMB envia o segredo de uma destas formas (confirme no painel):
//  (A) header simples com o mesmo valor do secret; ou
//  (B) assinatura HMAC-SHA256 do corpo cru (raw body).
// Deixe ligada a forma que a TMB usar; as duas estão implementadas.
async function verify(req: Request, rawBody: string): Promise<boolean> {
  if (!TMB_WEBHOOK_SECRET) return true; // sem secret configurado = não bloqueia (apenas para 1º teste)

  // (A) segredo simples no header ou no corpo
  const headerSecret =
    req.headers.get("x-webhook-secret") ??
    req.headers.get("x-tmb-secret") ??
    "";
  if (headerSecret && timingSafeEqual(headerSecret, TMB_WEBHOOK_SECRET)) return true;

  // (B) assinatura HMAC-SHA256 do corpo cru
  const sig = req.headers.get("x-tmb-signature") ?? req.headers.get("x-signature") ?? "";
  if (sig) {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(TMB_WEBHOOK_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
    const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
    if (timingSafeEqual(sig.replace(/^sha256=/, ""), hex)) return true;
  }

  return false;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

// Extrai e-mail do comprador do payload da TMB (tolerante a formatos).
function extractEmail(p: any): string | null {
  const cand =
    p?.customer?.email ?? p?.buyer?.email ?? p?.client?.email ??
    p?.email ?? p?.data?.customer?.email ?? p?.data?.email ?? null;
  return cand ? String(cand).trim().toLowerCase() : null;
}
function extractEventName(p: any): string {
  return String(p?.event ?? p?.type ?? p?.status ?? p?.data?.event ?? "").trim();
}
function extractRef(p: any): string | null {
  return p?.order_id ?? p?.transaction_id ?? p?.id ?? p?.data?.id ?? null;
}
function extractPlan(p: any): string | null {
  return p?.plan ?? p?.offer ?? p?.product?.name ?? p?.data?.plan ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const rawBody = await req.text();

  if (!(await verify(req, rawBody))) {
    return json({ error: "invalid signature" }, 401);
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json({ error: "invalid json" }, 400);
  }

  const eventName = extractEventName(payload);
  const email = extractEmail(payload);
  const action = EVENT_ACTION[eventName];

  // log de automação (observabilidade — aparece no Console › Fase 3)
  await db.from("automation_log").insert({
    source: "tmb",
    event: eventName,
    email,
    action: action ?? "IGNORADO",
    raw: payload,
  }).catch(() => {});

  if (!email) return json({ ok: true, note: "sem e-mail no payload; ignorado" });
  if (!action) return json({ ok: true, note: `evento '${eventName}' não mapeado; ignorado` });
  if (action === "PENDENTE") {
    // boleto/PIX gerado: registra pedido pendente, mas NÃO libera acesso
    await db.from("access").upsert(
      { email, status: "pending", provider: "tmb", external_ref: extractRef(payload), plan: extractPlan(payload), updated_at: new Date().toISOString() },
      { onConflict: "email" },
    );
    return json({ ok: true, email, status: "pending" });
  }

  const status = action === "LIBERA" ? "active" : "blocked";
  const { error } = await db.from("access").upsert(
    {
      email,
      status,
      provider: "tmb",
      plan: extractPlan(payload),
      external_ref: extractRef(payload),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "email" },
  );
  if (error) return json({ error: error.message }, 500);

  return json({ ok: true, email, status });
});
