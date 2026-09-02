// Ponto de entrada do Worker.
//
// O site inteiro (public/) é servido como arquivo estático, sem passar por
// aqui. Este código só roda nos caminhos listados em run_worker_first no
// wrangler.toml. Menos código no caminho da página = página mais rápida.
import { json } from "./lib.js";
import { rotasAplicar } from "./aplicar.js";
import { rotasPorta } from "./porta.js";
import { listarLeads, atualizarLead } from "./leads.js";
import { robots, sitemap } from "./seo.js";

// Os caminhos da porta: entrar, sair, trocar senha e cuidar de quem tem
// acesso. Ficam numa lista para o switch abaixo nao ter que repetir seis
// linhas iguais, e para quem le saber de relance o que e da porta.
const DA_PORTA = ["/eu", "/entrar", "/sair", "/primeiro-acesso", "/minha-senha", "/pessoas"];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // O formulário próprio da casa mora sob um prefixo só, e resolve os
    // próprios caminhos. Vem antes do switch porque são seis, e listar um
    // por um aqui só faria esta função crescer sem dizer nada.
    if (url.pathname.startsWith("/api/")) return rotasAplicar(request, env, url);

    // A porta resolve os proprios caminhos, pelo mesmo motivo.
    if (DA_PORTA.includes(url.pathname)) return rotasPorta(request, env, url);

    switch (url.pathname) {
      case "/leads":
        if (request.method === "GET") return listarLeads(request, env);
        // a mesa anota o andamento pelo próprio sistema
        if (request.method === "PATCH") return atualizarLead(request, env);
        return json({ erro: "método" }, 405);

      case "/robots.txt":  return robots(url);
      case "/sitemap.xml": return sitemap(url);
    }

    // rede de segurança: se algum caminho cair aqui sem querer, ele volta
    // para os arquivos estáticos em vez de virar erro
    return env.ASSETS.fetch(request);
  },
};
