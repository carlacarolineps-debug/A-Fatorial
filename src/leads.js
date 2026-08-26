// /leads  ·  a mesa lê e anota
//
//   GET   /leads   devolve as aplicações recebidas
//   PATCH /leads   muda o andamento de uma delas (status e observações)
//
// Só passa quem entrou pelo Cloudflare Access, e só quem entrou por ESTA
// aplicação do Access. O cabeçalho sozinho não basta: o JWT é conferido
// contra as chaves públicas do time.
import { json, accessLiberou } from "./lib.js";

// Andamento possível de um lead na mesa. Lista fechada de propósito: o
// que vem do navegador não escolhe o que entra na coluna do banco.
export const STATUS_LEAD = [
  "novo",
  "contatado",
  "qualificado",
  "proposta",
  "ganho",
  "perdido",
];

// Observação é campo livre digitado por gente. O corte existe para o
// tamanho da linha não depender de quem digita.
const LIMITE_OBSERVACOES = 2000;

/* --------------------------------------------------------------------
   Portaria comum às duas rotas.
   Devolve uma Response quando é para barrar, e null quando pode seguir.
   -------------------------------------------------------------------- */
async function portaria(request, env) {
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

  return null;
}

export async function listarLeads(request, env) {
  const barrado = await portaria(request, env);
  if (barrado) return barrado;

  const { results } = await env.DB.prepare(`
    select id, criado_em, atualizado_em, nome, email, whatsapp,
           plano, origem, status, observacoes, respostas
    from leads order by criado_em desc limit 500
  `).all();

  return json({
    ok: true,
    status_possiveis: STATUS_LEAD,
    leads: results.map((l) => ({ ...l, respostas: JSON.parse(l.respostas || "{}") })),
  });
}

/* --------------------------------------------------------------------
   Traduz o corpo do PATCH em pedaços de SQL, ou devolve o motivo da
   recusa. Fica fora da rota, e exportado, porque é a parte que decide o
   que pode mudar: assim dá para testar cada recusa sem subir servidor
   nem forjar login do Access.
   -------------------------------------------------------------------- */
export function lerPedido(corpo) {
  const id = Number(corpo?.id);
  if (!Number.isInteger(id) || id <= 0) return { erro: "id inválido" };

  const campos = [];
  const valores = [];

  if (corpo.status !== undefined) {
    if (!STATUS_LEAD.includes(corpo.status)) {
      return { erro: `status inválido: use ${STATUS_LEAD.join(", ")}` };
    }
    campos.push("status = ?");
    valores.push(corpo.status);
  }

  if (corpo.observacoes !== undefined) {
    campos.push("observacoes = ?");
    valores.push(String(corpo.observacoes ?? "").slice(0, LIMITE_OBSERVACOES));
  }

  if (!campos.length) return { erro: "nada para atualizar" };

  campos.push("atualizado_em = datetime('now')");
  return { id, campos, valores };
}

/* --------------------------------------------------------------------
   PATCH /leads  ·  { id, status?, observacoes? }
   Só mexe no andamento. Nome, e-mail e as respostas do formulário são o
   que a pessoa escreveu, e isso não se edita pela mesa.
   -------------------------------------------------------------------- */
export async function atualizarLead(request, env) {
  const barrado = await portaria(request, env);
  if (barrado) return barrado;

  let corpo;
  try {
    corpo = await request.json();
  } catch {
    return json({ erro: "corpo não é JSON" }, 400);
  }

  const pedido = lerPedido(corpo);
  if (pedido.erro) return json({ erro: pedido.erro }, 400);

  const lead = await env.DB.prepare(`
    update leads set ${pedido.campos.join(", ")} where id = ?
    returning id, status, observacoes, atualizado_em
  `).bind(...pedido.valores, pedido.id).first();

  if (!lead) return json({ erro: "lead não encontrado" }, 404);

  return json({ ok: true, lead });
}
