// GET /leads  ·  leitura pela mesa
//
// Só passa quem entrou pelo Cloudflare Access, e só quem entrou por ESTA
// aplicação do Access. O cabeçalho sozinho não basta: o JWT é conferido
// contra as chaves públicas do time.
import { json, accessLiberou } from "./lib.js";

export async function listarLeads(request, env) {
  // Sem essas duas não dá para conferir JWT nenhum, e liberar seria pior
  // que fechar. A mensagem é específica de propósito: quem vê isso é quem
  // configura, e um erro genérico custaria meia hora de caça ao nada.
  const faltando = ["TEAM_DOMAIN", "ACCESS_AUD"].filter((v) => !env[v]);
  if (faltando.length) {
    return json({ erro: `falta configurar no Worker: ${faltando.join(", ")}` }, 503);
  }

  if (!(await accessLiberou(request, env.TEAM_DOMAIN, env.ACCESS_AUD))) {
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
