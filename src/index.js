// Ponto de entrada do Worker.
//
// O site inteiro (public/) é servido como arquivo estático, sem passar por
// aqui. Este código só roda nos caminhos listados em run_worker_first no
// wrangler.toml. Menos código no caminho da página = página mais rápida.
import { json } from "./lib.js";
import { receberTypeform } from "./typeform.js";
import { listarLeads } from "./leads.js";
import { robots, sitemap } from "./seo.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    switch (url.pathname) {
      case "/typeform":
        return request.method === "POST"
          ? receberTypeform(request, env)
          : json({ erro: "método" }, 405);

      case "/leads":
        return request.method === "GET"
          ? listarLeads(request, env)
          : json({ erro: "método" }, 405);

      case "/robots.txt":  return robots(url);
      case "/sitemap.xml": return sitemap(url);
    }

    // rede de segurança: se algum caminho cair aqui sem querer, ele volta
    // para os arquivos estáticos em vez de virar erro
    return env.ASSETS.fetch(request);
  },
};
