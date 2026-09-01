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
