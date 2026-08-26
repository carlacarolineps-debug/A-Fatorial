// GET /eu  ·  quem entrou
//
// O sistema e um arquivo estatico, e pagina estatica nao enxerga os
// proprios cabecalhos: ela nao tem como ler o `cf-access-jwt-assertion`
// que a borda da Cloudflare carimba. Sem esta rota, o sistema so saberia
// quem e a pessoa se ela digitasse, e login digitado dentro de um arquivo
// que qualquer um baixa nao e login, e enfeite.
//
// Entao a pergunta vai para o servidor, que ja confere o token de verdade
// para o /leads, e volta so o necessario: o e-mail. Nada de papel, nada de
// permissao. O Access diz QUEM entrou; o que essa pessoa pode ver e do
// sistema, e vive em iqv_usuarios.
import { json, accessQuem } from "./lib.js";

export async function quemSouEu(request, env) {
  const faltando = ["TEAM_DOMAIN", "ACCESS_AUD"].filter((v) => !env[v]);
  if (faltando.length) {
    // Mesma resposta do /leads, de proposito: e a mesma causa, e a tela
    // trata os dois casos com o mesmo texto.
    return json({ erro: `falta configurar no Worker: ${faltando.join(", ")}` }, 503);
  }

  const quem = await accessQuem(request, env.TEAM_DOMAIN, env.ACCESS_AUD);
  if (!quem) return json({ erro: "não autorizado" }, 401);

  return json({
    ok: true,
    email: quem.email ?? null,
    // o Access poe isto quando o login veio de um provedor de identidade
    nome: quem.name ?? null,
    // ate quando este token vale, para a tela saber avisar antes de vencer
    expira_em: typeof quem.exp === "number" ? quem.exp : null,
  });
}
