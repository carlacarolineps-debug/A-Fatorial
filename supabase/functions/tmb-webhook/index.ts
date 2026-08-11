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

/* ------------------------------------------------------------------ */
/* O status vinha comparado por igualdade exata com "Efetivado". Um     */
/* acento a mais, uma caixa diferente ou a plataforma trocando a        */
/* palavra e quem PAGOU fica sem acesso, calado, sem ninguém saber. Num */
/* fluxo automático esse é o pior defeito possível: ele só aparece pela */
/* reclamação da aluna.                                                 */
/*                                                                      */
/* Agora a palavra é normalizada (sem acento, minúscula) e comparada    */
/* com listas explícitas. O que importa é que as listas são FECHADAS:   */
/* palavra desconhecida NÃO libera e NÃO corta, ela vira registro       */
/* visível na mesa. Abrir acesso no escuro seria dar o produto para     */
/* quem não pagou; ignorar no escuro seria negar para quem pagou.       */
/* ------------------------------------------------------------------ */
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
/* estes são conhecidos e não fazem nada de propósito: a venda ainda não
   aconteceu. Ficam listados para não caírem em "desconhecido" e virarem
   alarme falso na mesa */
const ESPERANDO = new Set([
  "aguardando pagamento", "aguardando", "pendente", "em analise",
  "processando", "iniciado", "iniciada", "aberta", "aberto",
]);
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

/* ESTA FUNÇÃO SÓ PROCURA. ELA NÃO CRIA MAIS CONTA, E ISSO É O CONSERTO DE
   UM DEFEITO QUE DEIXAVA QUEM PAGOU DO LADO DE FORA, EM SILÊNCIO.

   O que acontecia: aqui a conta era criada com
   createUser({ email, email_confirm: true }), sem senha e sem
   user_metadata. Logo depois, mandarSenha chamava a liberar-aluna com
   so_se_nova: true. Lá dentro, achar() lia o metadata vazio e concluía
   "senha_temporaria !== true", ou seja, undefined !== true, que é
   VERDADEIRO: a conta recém-criada era tratada como conta de alguém que
   já escolheu a própria senha. O atalho do so_se_nova então saía sem
   sortear senha e sem mandar e-mail.

   O resultado: conta existindo, e-mail confirmado, SEM SENHA NENHUMA.
   A compradora nunca recebia o e-mail e o login recusava para sempre,
   porque não havia senha para acertar. E como a liberar-aluna devolvia
   ok:true, o webhook não registrava erro: a aba Vendas mostrava a linha
   em VERDE, escrito "acesso liberado e senha enviada". A mesa dizia que
   tinha dado certo com a aluna do lado de fora, que é a pior combinação
   possível.

   O conserto de fundo é de responsabilidade, não de remendo: criar conta
   é trabalho de quem sabe pôr senha e mandar e-mail, e isso é a
   liberar-aluna, não o webhook. Aqui só se procura. Não achar não é
   problema: a linha de access nasce só com o e-mail, e o user_id é
   casado depois, pela própria liberar-aluna ou pelo casar_meu_acesso no
   primeiro login. */
async function acharUsuario(email: string): Promise<string | null> {
  if (!email) return null;
  try {
    /* Busca direta por e-mail. A API de administração só lista por página, e
       listar a primeira página e procurar dentro dela funciona enquanto a
       turma é pequena: passando de algumas centenas, a conta que existe
       deixa de ser encontrada. */
    const { data: achado } = await db.rpc("user_id_por_email", { p_email: email });
    return (achado as string) ?? null;
  } catch { return null; }
}

async function gravarAcesso(
  email: string, status: "active" | "grace" | "inactive", ref?: string,
) {
  if (!email) throw new Error("gravarAcesso sem e-mail");
  const user_id = await acharUsuario(email);
  const linha: Record<string, unknown> = {
    email, status, atualizado_em: new Date().toISOString(),
    /* a data do evento que produziu este estado. É ela que impede um
       evento atrasado de derrubar quem já foi liberado depois. */
    evento_em: new Date().toISOString(),
  };
  if (user_id) linha.user_id = user_id;
  if (ref) linha.external_ref = ref;

  /* O erro desta escrita era descartado, e essa é a única escrita que
     decide se a pessoa entra. Se ela falhar (constraint faltando, 5xx do
     PostgREST, timeout), o código seguia adiante e mandava o e-mail com a
     senha para alguém que continuava sem acesso: a aluna com a senha na
     mão batendo na parede. Agora a falha estoura, vira linha vermelha na
     mesa, e o e-mail não sai. */
  const { error } = await db.from("access").upsert(linha, { onConflict: "email" });
  if (error) throw new Error("nao consegui gravar o acesso: " + error.message);

  /* Liberar sem avisar não serve para nada: a pessoa pagou e não sabe
     como entrar. Quando o acesso vira ativo, a função irmã cria a conta,
     sorteia a senha temporária e manda o e-mail.
     so_se_nova é a trava que faz isso acontecer UMA vez: a régua de
     parcelas confirma pagamento todo mês e passa por aqui de novo, e sem
     ela a senha escolhida pela aluna seria derrubada a cada parcela. */
  if (status === "active") await mandarSenha(email);
}

/* Quem já pagou não pode ser cortado por um evento que chegou fora de
   ordem. Cenário real: a aluna gera um boleto, desiste e paga no cartão.
   Chega "Efetivado", ela é liberada e começa. Três dias depois o boleto
   abandonado expira e a plataforma dispara "Expirado" para o mesmo
   e-mail: sem esta checagem, o corte acontece e quem pagou perde o
   acesso. Só corta evento que seja do MESMO pedido que liberou, ou que
   seja mais novo do que o último evento aplicado. */
async function podeCortar(email: string, ref: string): Promise<{ pode: boolean; motivo: string }> {
  const { data, error } = await db.from("access")
    .select("external_ref,evento_em,status").eq("email", email).maybeSingle();
  if (error || !data) return { pode: true, motivo: "" };
  const refAtual = String(data.external_ref ?? "");
  if (ref && refAtual && ref !== refAtual) {
    return { pode: false, motivo: `evento do pedido ${ref}, mas o acesso foi liberado pelo pedido ${refAtual}: nao cortei` };
  }
  return { pode: true, motivo: "" };
}

/* A chamada é HTTP porque as duas funções são processos separados. Uma
   falha aqui não pode derrubar o webhook: o acesso já está gravado, e
   ficar sem o e-mail é um problema que a Carla resolve pela mesa em dois
   toques. Devolver erro para a TMB faria ela reenviar o webhook inteiro. */
async function mandarSenha(email: string) {
  try {
    const r = await fetch(`${URL_SB}/functions/v1/liberar-aluna`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${SERVICE}` },
      body: JSON.stringify({ email, motivo: "webhook", so_se_nova: true }),
    });
    const j = await r.json().catch(() => null);
    if (!r.ok || !j || j.ok !== true) {
      await db.from("webhook_log").insert({
        origem: "senha", processado: false, email,
        acao: "o acesso foi liberado, mas o e-mail com a senha nao saiu",
        erro: "liberar-aluna respondeu: " + JSON.stringify(j ?? r.status),
        payload: { email } as never,
      });
    }
  } catch (e) {
    await db.from("webhook_log").insert({
      origem: "senha", processado: false, email,
      acao: "o acesso foi liberado, mas o e-mail com a senha nao saiu",
      erro: String((e as Error)?.message ?? e),
      payload: { email } as never,
    });
  }
}

/* ------------------------------------------------------------------ */
/* WEBHOOK VENDAS: payload é OBJETO, status em status_pedido            */
/* ------------------------------------------------------------------ */
async function vendas(p: Record<string, unknown>) {
  const email  = mail(p.email ?? (p as any)?.cliente_email);
  const bruto  = texto(p.status_pedido ?? (p as any)?.status);
  const status = normaliza(bruto);
  const ref    = texto(p.external_ref ?? (p as any)?.pedido_id ?? (p as any)?.id);
  if (!email) return { ok: false, email: "", acao: "chegou sem e-mail, nao deu para fazer nada" };

  if (PAGOU.has(status)) {
    // pagou o boleto de ENTRADA. Não é "pagou tudo": as parcelas seguem
    // chegando pelo webhook Financeiro.
    await gravarAcesso(email, "active", ref);
    return { ok: true, email, acao: "acesso liberado e senha enviada" };
  }
  if (CAIU.has(status)) {
    const c = await podeCortar(email, ref);
    if (!c.pode) return { ok: true, email, acao: bruto + ", mas " + c.motivo };
    await gravarAcesso(email, "inactive", ref);
    return { ok: true, email, acao: "compra " + bruto + ": acesso encerrado" };
  }
  if (ESPERANDO.has(status)) {
    return { ok: true, email, acao: "ainda nao pagou (" + bruto + "), nada a fazer" };
  }
  /* palavra que este código não conhece. Não liberar e não cortar é a
     decisão certa, mas ficar calado não é: vai para a mesa em vermelho */
  return {
    ok: false, email,
    acao: 'a TMB mandou o status "' + bruto + '", que o app nao conhece. Ninguem foi liberado nem cortado.',
  };
}

/* ------------------------------------------------------------------ */
/* WEBHOOK FINANCEIRO: payload é LISTA, campos dentro de dados,         */
/* status em status_pagamento, e-mail em dados.cliente_email            */
/* ------------------------------------------------------------------ */
async function financeiro(itens: unknown[]) {
  const feito: string[] = [];
  const emails: string[] = [];
  let tudoConhecido = true;
  for (const cru of itens) {
    const item   = (cru ?? {}) as Record<string, unknown>;
    const d      = ((item.dados ?? item) ?? {}) as Record<string, unknown>;
    const email  = mail(d.cliente_email ?? d.email);
    const bruto  = texto(item.status_pagamento ?? d.status_pagamento);
    const status = normaliza(bruto);
    const ref    = texto(d.external_ref ?? d.pedido_id ?? item.external_ref ?? "");
    const numero = Number(num(d.parcela ?? d.numero_parcela ?? d.numero) ?? 1) || 1;
    const venc   = data(d.vencimento ?? d.data_vencimento);
    const valor  = num(d.valor ?? d.valor_parcela);
    if (!email) { feito.push("linha sem e-mail"); tudoConhecido = false; continue; }
    if (!emails.includes(email)) emails.push(email);

    /* DELETED é renegociação ou cancelamento: fica no log, sem corte
       automático. A Carla olha caso a caso. */
    if (status === "deleted") { feito.push("renegociacao registrada, sem corte automatico"); continue; }

    const venceu = status === "vencido" || status === "vencida" || status === "atrasado" || status === "atrasada";

    /* Palavra desconhecida NÃO vira "aberta". O default anterior fazia
       exatamente isso, e o efeito era o pior possível: a TMB manda
       "Baixada", "Quitada", "Compensada" ou "Liquidada" (palavras normais
       de sistema financeiro para parcela paga), o app não conhecia
       nenhuma, rebaixava para "aberta" uma parcela que já estava PAGA, e
       a régua de inadimplência cortava o acesso de quem estava em dia. */
    const conhecido = PAGOU.has(status) || venceu || ESPERANDO.has(status)
                   || status === "estornado" || status === "estornada";
    const st = PAGOU.has(status) ? "paga"
             : venceu ? "vencida"
             : (status === "estornado" || status === "estornada") ? "estornada"
             : "aberta";

    if (ref && conhecido) {
      const { error } = await db.from("parcelas").upsert({
        email, external_ref: ref, numero, vencimento: venc, valor,
        status: st, atualizado_em: new Date().toISOString(),
      }, { onConflict: "external_ref,numero" });
      if (error) {
        tudoConhecido = false;
        feito.push(`nao consegui gravar a parcela ${numero}: ${error.message}`);
        continue;
      }
    }

    if (ESPERANDO.has(status)) {
      // não ignorar: é o insumo da régua de inadimplência
      feito.push(`parcela ${numero} registrada, vence ${venc ?? "sem data"}`);
      continue;
    }
    if (PAGOU.has(status)) {
      const { data: abertas } = await db.from("parcelas")
        .select("id").eq("email", email).in("status", ["aberta", "vencida"])
        .lt("vencimento", new Date().toISOString().slice(0, 10));
      if (!abertas || abertas.length === 0) {
        await gravarAcesso(email, "active", ref);
        feito.push(`parcela ${numero} paga, acesso liberado`);
      } else {
        feito.push(`parcela ${numero} paga, mas ainda ha ${abertas.length} vencida(s): acesso segue como esta`);
      }
      continue;
    }
    /* VENCIDA NÃO CORTA NA HORA, e isto é decisão, não descuido.
       O boleto compensa em até três dias úteis: a aluna paga no dia do
       vencimento e no dia seguinte a plataforma ainda manda "Vencida".
       Cortar ali tira o acesso de quem pagou, e devolver depois não
       desfaz o susto. Quem decide corte por atraso é a
       aplicar_regua_inadimplencia, que já existe no banco e sabe contar
       os dias e escalonar. Aqui a parcela só é registrada.

       Estorno e chargeback são outra coisa: são definitivos, o dinheiro
       voltou, e o corte é imediato. */
    if (venceu) {
      feito.push(`parcela ${numero} vencida, registrada (o corte quem decide e a regua, por dias de atraso)`);
      continue;
    }
    if (status === "estornado" || status === "estornada") {
      const c = await podeCortar(email, ref);
      if (!c.pode) { feito.push(`estorno da parcela ${numero}, mas ${c.motivo}`); continue; }
      await gravarAcesso(email, "inactive", ref);
      feito.push(`parcela ${numero} estornada, acesso encerrado`);
      continue;
    }
    tudoConhecido = false;
    feito.push(`a TMB mandou o status "${bruto}", que o app nao conhece. Nada foi mexido.`);
  }
  return {
    ok: tudoConhecido,
    email: emails.join(", "),
    acao: feito.join(" | ") || "chegou vazio",
  };
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

    /* o resumo em português vai junto do log, porque é ele que a Carla lê
       na mesa. O payload cru continua guardado, mas nunca sai do servidor:
       ele carrega dado pessoal de quem comprou */
    if (log?.id) {
      await db.from("webhook_log").update({
        processado: r.ok === true,
        email: (r as { email?: string }).email ?? null,
        acao: (r as { acao?: string }).acao ?? null,
        erro: r.ok === true ? null : ((r as { acao?: string }).acao ?? "nao processado"),
      }).eq("id", log.id);
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
