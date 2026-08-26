// Peças usadas pelas duas rotas.

// Resposta do Worker nao passa pelo _headers (que so vale para arquivo
// estatico), entao os cabecalhos de seguranca vao na mao aqui.
export const json = (dados, status = 200) =>
  new Response(JSON.stringify(dados), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "x-content-type-options": "nosniff",
      "cache-control": "no-store",
    },
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

   Conferir a assinatura sozinho NÃO basta. O mesmo Zero Trust assina o
   token de todas as aplicações da conta, e existe outro projeto nesta
   mesma conta. Sem checar o "aud", quem tem acesso a qualquer outra
   aplicação do time leria os leads daqui. Por isso são quatro
   conferências, e todas precisam passar:

     1. assinatura bate com a chave pública do kid anunciado
     2. iss  é o nosso time
     3. aud  contém a etiqueta DESTA aplicação
     4. exp  ainda não passou
   -------------------------------------------------------------------- */
let cacheChaves = null;

async function chavesDoAccess(teamDomain) {
  if (cacheChaves && Date.now() - cacheChaves.em < 3600e3) return cacheChaves.chaves;
  try {
    const r = await fetch(`https://${teamDomain}/cdn-cgi/access/certs`);
    if (!r.ok) return [];
    const { keys } = await r.json();
    // só guarda no cache o que deu certo: cachear lista vazia por uma hora
    // trancaria a mesa inteira por causa de um soluço de rede
    cacheChaves = { em: Date.now(), chaves: keys ?? [] };
    return cacheChaves.chaves;
  } catch {
    // sem as chaves não dá para conferir nada, e o certo é negar. Deixar o
    // erro subir viraria 500 no lugar de um 401 honesto.
    return [];
  }
}

const daBase64Url = (v) =>
  Uint8Array.from(atob(v.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

/* Devolve as informacoes do token quando ele passa nas QUATRO conferencias,
   e null quando nao passa. O `accessLiberou` abaixo e so o sim ou nao disto:
   quem precisa saber QUEM entrou (a rota /eu) usa esta, e quem so precisa
   saber SE pode entrar usa a outra. Uma conferencia so, em um lugar so. */
export async function accessQuem(req, teamDomain, aud) {
  if (!teamDomain || !aud) return null;

  const token = req.headers.get("cf-access-jwt-assertion");
  if (!token) return null;

  const [cab, corpo, assin] = token.split(".");
  if (!cab || !corpo || !assin) return null;

  try {
    const { kid } = JSON.parse(new TextDecoder().decode(daBase64Url(cab)));
    const jwk = (await chavesDoAccess(teamDomain)).find((k) => k.kid === kid);
    if (!jwk) return null;

    const chave = await crypto.subtle.importKey(
      "jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"],
    );
    const assinaturaOk = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5", chave, daBase64Url(assin),
      new TextEncoder().encode(`${cab}.${corpo}`),
    );
    if (!assinaturaOk) return null;

    const dados = JSON.parse(new TextDecoder().decode(daBase64Url(corpo)));

    if (dados.iss !== `https://${teamDomain}`) return null;
    // o aud vem como lista quando a aplicação tem mais de uma etiqueta
    const plateia = Array.isArray(dados.aud) ? dados.aud : [dados.aud];
    if (!plateia.includes(aud)) return null;

    // assinatura boa não basta: token vencido também tem assinatura boa
    if (!(typeof dados.exp === "number" && dados.exp * 1000 > Date.now())) return null;

    return dados;
  } catch {
    // token torto (base64 quebrado, JSON inválido) é tentativa, não erro
    // do servidor: nega e pronto.
    return null;
  }
}

export async function accessLiberou(req, teamDomain, aud) {
  return (await accessQuem(req, teamDomain, aud)) !== null;
}
