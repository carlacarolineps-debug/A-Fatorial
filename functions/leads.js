// GET /leads  ·  leitura pela mesa
//
// Só passa quem entrou pelo Cloudflare Access. O cabeçalho sozinho não
// basta: o JWT é conferido contra as chaves públicas do time.
import { json, accessLiberou } from "./_lib.js";

export async function onRequestGet({ request, env }) {
  if (!(await accessLiberou(request, env.TEAM_DOMAIN))) {
    return json({ erro: "não autorizado" }, 401);
  }

  const { results } = await env.DB.prepare(`
    select id, criado_em, nome, email, whatsapp, plano, origem, status, respostas
    from leads order by criado_em desc limit 500
  `).all();

  return json({
    ok: true,
    leads: results.map((l) => ({ ...l, respostas: JSON.parse(l.respostas || "{}") })),
  });
}
