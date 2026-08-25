// Peças usadas pelas duas rotas.

export const json = (dados, status = 200) =>
  new Response(JSON.stringify(dados), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

/* --------------------------------------------------------------------
   Assinatura do Typeform.
   Ele manda "Typeform-Signature: sha256=<base64>", que é o HMAC SHA-256
   do corpo CRU. Por isso o corpo é lido como texto e só depois virado
   objeto: reserializar mudaria um byte e derrubaria a conferência.
   -------------------------------------------------------------------- */
export async function assinaturaConfere(segredo, cabecalho, corpoCru) {
  if (!segredo || !cabecalho?.startsWith("sha256=")) return false;

  const chave = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(segredo),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", chave, new TextEncoder().encode(corpoCru));
  const esperado = btoa(String.fromCharCode(...new Uint8Array(mac)));

  // comparação de tempo constante: === vaza o tamanho por timing
  const a = new TextEncoder().encode(cabecalho.slice(7));
  const b = new TextEncoder().encode(esperado);
  let dif = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) dif |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return dif === 0;
}

/* --------------------------------------------------------------------
   Lê a resposta do Typeform sem assumir formato.
   O formulário vai mudar com o tempo, então nada aqui lê por posição:
   cada resposta é casada com a pergunta pelo id do campo, e o valor sai
   pelo tipo. Campo novo entra em "respostas" sem quebrar nada.
   -------------------------------------------------------------------- */
function valorDaResposta(r) {
  switch (r.type) {
    case "text": case "email": case "url": case "phone_number": case "date":
      return r[r.type] ?? "";
    case "number":  return r.number;
    case "boolean": return r.boolean ? "Sim" : "Não";
    case "choice":  return r.choice?.label ?? r.choice?.other ?? "";
    case "choices": return (r.choices?.labels ?? []).join(", ");
    case "file_url": return r.file_url ?? "";
    default: return r[r.type] ?? "";
  }
}

export function lerResposta(fr) {
  const titulos = new Map((fr?.definition?.fields ?? []).map((c) => [c.id, c.title]));

  const respostas = {};
  let nome = "", email = "", whatsapp = "";

  for (const r of fr?.answers ?? []) {
    const titulo = titulos.get(r.field?.id) ?? r.field?.ref ?? r.field?.id ?? "campo";
    const valor = valorDaResposta(r);
    respostas[titulo] = valor;

    // o tipo do campo é mais confiável que o texto da pergunta
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
    // a landing manda ?plano=pro; se o campo oculto não existir, vem vazio
    plano: fr?.hidden?.plano ?? null,
  };
}

/* --------------------------------------------------------------------
   Quem entrou pelo Access chega com um JWT posto pela borda da
   Cloudflare. Ele é conferido contra as chaves públicas do time: sem
   isso, qualquer um mandaria o cabeçalho na mão e leria os leads.
   -------------------------------------------------------------------- */
let cacheChaves = null;
async function chavesDoAccess(teamDomain) {
  if (cacheChaves && Date.now() - cacheChaves.em < 3600e3) return cacheChaves.chaves;
  const r = await fetch(`https://${teamDomain}/cdn-cgi/access/certs`);
  const { keys } = await r.json();
  cacheChaves = { em: Date.now(), chaves: keys ?? [] };
  return cacheChaves.chaves;
}

export async function accessLiberou(req, teamDomain) {
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
    // assinatura boa não basta: token vencido também tem assinatura boa
    const dados = JSON.parse(new TextDecoder().decode(b64(p)));
    return typeof dados.exp === "number" && dados.exp * 1000 > Date.now();
  }
  return false;
}
