// =====================================================================
// Worker do Ideia Que Vende.
//
// Duas rotas, com nivel de acesso oposto:
//   POST /typeform  publica, mas so aceita quem assina com o segredo
//   GET  /leads     fechada, so passa quem entrou pelo Cloudflare Access
//
// Ordem no webhook, nesta ordem e sem atalho:
//   1. confere a assinatura do Typeform sobre o corpo CRU
//   2. grava o payload cru em webhook_log ANTES de qualquer escrita
//   3. so entao processa
//
// Responder 200 sempre que o payload foi entendido e proposital: o
// Typeform reenvia quando recebe erro, e reenvio sem necessidade e ruido.
// Erro real fica no log.
// =====================================================================

const json = (dados, status = 200) =>
  new Response(JSON.stringify(dados), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

/* --------------------------------------------------------------------
   Assinatura do Typeform.
   Ele manda "Typeform-Signature: sha256=<base64>", que e o HMAC SHA-256
   do corpo CRU. Por isso o corpo e lido como texto e so depois virado
   objeto: reserializar mudaria um byte e derrubaria a conferencia.
   -------------------------------------------------------------------- */
async function assinaturaConfere(segredo, cabecalho, corpoCru) {
  if (!segredo || !cabecalho?.startsWith("sha256=")) return false;

  const chave = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(segredo),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", chave, new TextEncoder().encode(corpoCru));
  const esperado = btoa(String.fromCharCode(...new Uint8Array(mac)));

  // comparacao de tempo constante: === vaza o tamanho por timing
  const a = new TextEncoder().encode(cabecalho.slice(7));
  const b = new TextEncoder().encode(esperado);
  let dif = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) dif |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return dif === 0;
}

/* --------------------------------------------------------------------
   Le a resposta do Typeform sem assumir formato.
   O formulario vai mudar com o tempo, entao nada aqui le por posicao:
   cada resposta e casada com a pergunta pelo id do campo, e o valor sai
   pelo tipo. Campo novo entra em "respostas" sem quebrar nada.
   -------------------------------------------------------------------- */
function valorDaResposta(r) {
  switch (r.type) {
    case "text": case "email": case "url": case "phone_number": case "date":
      return r[r.type] ?? "";
    case "number":  return r.number;
    case "boolean": return r.boolean ? "Sim" : "Nao";
    case "choice":  return r.choice?.label ?? r.choice?.other ?? "";
    case "choices": return (r.choices?.labels ?? []).join(", ");
    case "file_url": return r.file_url ?? "";
    default: return r[r.type] ?? "";
  }
}

function lerResposta(fr) {
  const titulos = new Map(
    (fr?.definition?.fields ?? []).map((c) => [c.id, c.title]),
  );

  const respostas = {};
  let nome = "", email = "", whatsapp = "";

  for (const r of fr?.answers ?? []) {
    const titulo = titulos.get(r.field?.id) ?? r.field?.ref ?? r.field?.id ?? "campo";
    const valor = valorDaResposta(r);
    respostas[titulo] = valor;

    // o tipo do campo e mais confiavel que o texto da pergunta
    if (r.type === "email" && !email) email = String(valor).trim().toLowerCase();
    if (r.type === "phone_number" && !whatsapp) whatsapp = String(valor).trim();
    if (!nome && /nome/i.test(titulo) && r.type === "text") nome = String(valor).trim();
  }

  return {
    typeform_response_id: fr?.token ?? null,
    typeform_form_id: fr?.form_id ?? null,
    nome: nome || null,
    email: email || null,
    whatsapp: whatsapp || null,
    respostas: JSON.stringify(respostas),
    // a landing manda ?plano=pro; se o campo oculto nao existir, vem vazio
    plano: fr?.hidden?.plano ?? null,
  };
}

/* --------------------------------------------------------------------
   Quem entrou pelo Access chega com um JWT posto pela borda da
   Cloudflare. Ele e conferido contra as chaves publicas do time: sem
   isso, qualquer um mandaria o cabecalho na mao e leria os leads.
   -------------------------------------------------------------------- */
let cacheChaves = null;
async function chavesDoAccess(teamDomain) {
  if (cacheChaves && Date.now() - cacheChaves.em < 3600e3) return cacheChaves.chaves;
  const r = await fetch(`https://${teamDomain}/cdn-cgi/access/certs`);
  const { keys } = await r.json();
  cacheChaves = { em: Date.now(), chaves: keys ?? [] };
  return cacheChaves.chaves;
}

async function accessLiberou(req, teamDomain) {
  if (!teamDomain) return false;
  const token = req.headers.get("cf-access-jwt-assertion");
  if (!token) return false;

  const [h, p, s] = token.split(".");
  if (!h || !p || !s) return false;

  const b64 = (v) => Uint8Array.from(atob(v.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
  const cabecalho = JSON.parse(new TextDecoder().decode(b64(h)));

  for (const jwk of await chavesDoAccess(teamDomain)) {
    if (jwk.kid !== cabecalho.kid) continue;
    const chave = await crypto.subtle.importKey(
      "jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"],
    );
    const ok = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5", chave, b64(s), new TextEncoder().encode(`${h}.${p}`),
    );
    if (!ok) return false;
    // assinatura boa nao basta: token vencido tambem tem assinatura boa
    const dados = JSON.parse(new TextDecoder().decode(b64(p)));
    return typeof dados.exp === "number" && dados.exp * 1000 > Date.now();
  }
  return false;
}

/* ------------------------------------------------------------------ */
export default {
  async fetch(req, env) {
    const url = new URL(req.url);

    // ---------------- webhook do Typeform ----------------
    if (url.pathname === "/typeform") {
      if (req.method !== "POST") return json({ erro: "metodo" }, 405);

      const corpoCru = await req.text();
      const assinado = await assinaturaConfere(
        env.TYPEFORM_WEBHOOK_SECRET,
        req.headers.get("typeform-signature"),
        corpoCru,
      );
      if (!assinado) return json({ erro: "nao autorizado" }, 401);

      // o log vem ANTES de qualquer escrita
      const log = await env.DB.prepare(
        "insert into webhook_log (origem, payload) values (?, ?) returning id",
      ).bind("typeform", corpoCru).first();

      try {
        const evento = JSON.parse(corpoCru);
        const lead = lerResposta(evento?.form_response);

        if (!lead.typeform_response_id) throw new Error("resposta sem token");

        // upsert pelo token: reenvio do Typeform atualiza, nao duplica
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

        await env.DB.prepare("update webhook_log set processado = 1 where id = ?")
          .bind(log.id).run();

        return json({ ok: true });
      } catch (e) {
        await env.DB.prepare("update webhook_log set erro = ? where id = ?")
          .bind(String(e?.message ?? e), log.id).run();
        // 200 de proposito: o payload chegou e esta no log. Erro nosso nao
        // e motivo para o Typeform ficar reenviando.
        return json({ ok: false });
      }
    }

    // ---------------- leitura pela mesa ----------------
    if (url.pathname === "/leads") {
      if (!(await accessLiberou(req, env.TEAM_DOMAIN))) return json({ erro: "nao autorizado" }, 401);

      const { results } = await env.DB.prepare(`
        select id, criado_em, nome, email, whatsapp, plano, origem, status, respostas
        from leads order by criado_em desc limit 500
      `).all();

      return json({
        ok: true,
        leads: results.map((l) => ({ ...l, respostas: JSON.parse(l.respostas || "{}") })),
      });
    }

    return json({ erro: "rota" }, 404);
  },
};
