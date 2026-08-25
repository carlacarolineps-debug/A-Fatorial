// POST /typeform  ·  recebe as respostas do Typeform
//
// Rota pública, mas só aceita quem assina com o segredo. Ordem, nesta
// ordem e sem atalho:
//   1. confere a assinatura sobre o corpo CRU
//   2. grava o payload cru em webhook_log ANTES de qualquer escrita
//   3. só então processa
//
// Responder 200 sempre que o payload foi entendido é proposital: o
// Typeform reenvia quando recebe erro, e reenvio sem necessidade é ruído.
// Erro real fica no log.
import { json, assinaturaConfere, lerResposta } from "./lib.js";

export async function receberTypeform(request, env) {
  const corpoCru = await request.text();

  const assinado = await assinaturaConfere(
    env.TYPEFORM_WEBHOOK_SECRET,
    request.headers.get("typeform-signature"),
    corpoCru,
  );
  if (!assinado) return json({ erro: "não autorizado" }, 401);

  // o log vem ANTES de qualquer escrita
  const log = await env.DB.prepare(
    "insert into webhook_log (origem, payload) values (?, ?) returning id",
  ).bind("typeform", corpoCru).first();

  try {
    const evento = JSON.parse(corpoCru);
    const lead = lerResposta(evento?.form_response);
    if (!lead.typeform_response_id) throw new Error("resposta sem token");

    // upsert pelo token: reenvio do Typeform atualiza, não duplica
    await env.DB.prepare(`
      insert into leads (typeform_response_id, typeform_form_id, nome, email, whatsapp, respostas, plano)
      values (?1, ?2, ?3, ?4, ?5, ?6, ?7)
      on conflict (typeform_response_id) do update set
        nome = excluded.nome, email = excluded.email, whatsapp = excluded.whatsapp,
        respostas = excluded.respostas, plano = excluded.plano,
        atualizado_em = datetime('now')
    `).bind(
      lead.typeform_response_id, lead.typeform_form_id, lead.nome,
      lead.email, lead.whatsapp, lead.respostas, lead.plano,
    ).run();

    await env.DB.prepare("update webhook_log set processado = 1 where id = ?").bind(log.id).run();
    return json({ ok: true });
  } catch (e) {
    await env.DB.prepare("update webhook_log set erro = ? where id = ?")
      .bind(String(e?.message ?? e), log.id).run();
    // 200 de propósito: o payload chegou e está no log. Erro nosso não é
    // motivo para o Typeform ficar reenviando.
    return json({ ok: false });
  }
}
