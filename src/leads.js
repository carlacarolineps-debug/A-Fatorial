// /leads  ·  a mesa lê e anota
//
//   GET   /leads   devolve as aplicações recebidas
//   PATCH /leads   muda o andamento de uma delas (status e observações)
//
// Só passa quem entrou pela porta, com e-mail e senha, e só quem tem papel
// de gestor ou colaborador. Cliente não lê a mesa: até 01/09 o papel só
// escondia tela, e quem passasse pela portaria lia tudo. Agora o papel é
// conferido no banco, aqui, a cada pedido.
import { json } from "./lib.js";
import { exigirEntrada } from "./porta.js";

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
  const { barrado } = await exigirEntrada(request, env, ["gestor", "colaborador"]);
  return barrado || null;
}

export async function listarLeads(request, env) {
  const barrado = await portaria(request, env);
  if (barrado) return barrado;

  // Duzentas, e nao quinhentas. O plano gratis do Worker da 10 ms de
  // processador por pedido, e quinhentas aplicacoes de nove respostas
  // compridas passavam disso so no ler e reescrever o JSON de cada uma.
  // A tela mostra as mais novas primeiro e ninguem rola ate a quingentesima.
  const { results } = await env.DB.prepare(`
    select id, criado_em, atualizado_em, nome, email, whatsapp,
           plano, origem, status, observacoes, respostas
    from leads order by criado_em desc limit 200
  `).all();

  // As respostas seguem como TEXTO, do jeito que saem do banco. Antes elas
  // eram lidas aqui e reescritas na resposta, duas travessias por linha por
  // nada: quem precisa do objeto e a tela, e ela ja tem que ler o corpo
  // inteiro de qualquer jeito.
  return json({
    ok: true,
    status_possiveis: STATUS_LEAD,
    respostas_em_texto: true,
    leads: results,
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
