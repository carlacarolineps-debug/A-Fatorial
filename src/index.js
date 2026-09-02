// Ponto de entrada do Worker.
//
// O site inteiro (public/) é servido como arquivo estático, sem passar por
// aqui. Este código só roda nos caminhos listados em run_worker_first no
// wrangler.toml. Menos código no caminho da página = página mais rápida.
import { json } from "./lib.js";
import { rotasAplicar } from "./aplicar.js";
import { rotasPorta } from "./porta.js";
import { listarLeads, atualizarLead } from "./leads.js";
import {
  criarProposta, listarPropostas, abrirProposta, registrarAceite,
} from "./propostas.js";
import { robots, sitemap } from "./seo.js";

// Os caminhos da porta: entrar, sair, trocar senha e cuidar de quem tem
// acesso. Ficam numa lista para o switch abaixo nao ter que repetir seis
// linhas iguais, e para quem le saber de relance o que e da porta.
const DA_PORTA = ["/eu", "/entrar", "/sair", "/primeiro-acesso", "/minha-senha", "/pessoas"];

// As propostas. Elas moram sob /api/ e por isso PRECISAM ser resolvidas
// antes do rotasAplicar la embaixo: aquele if pega /api/ inteiro e devolve
// 404 para o que nao e do formulario. Sem esta lista, as tres rotas
// existiriam no arquivo e nunca seriam alcancadas, e o erro seria um
// "este caminho nao existe" sem nada para procurar.
const DAS_PROPOSTAS = ["/api/propostas", "/api/proposta", "/api/aceite"];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // As propostas, antes do formulário: as duas famílias moram sob /api/,
    // e quem chega primeiro decide. As duas de cima são da equipe e passam
    // pela mesma portaria do /leads; as duas de baixo são do cliente, que
    // não tem login nenhum, e sim um código de cinco letras.
    if (DAS_PROPOSTAS.includes(url.pathname)) {
      const m = request.method;
      if (url.pathname === "/api/propostas") {
        if (m === "GET") return listarPropostas(request, env);
        if (m === "POST") return criarProposta(request, env);
      }
      if (url.pathname === "/api/proposta" && m === "GET") return abrirProposta(request, env);
      if (url.pathname === "/api/aceite" && m === "POST") return registrarAceite(request, env);
      return json({ erro: "método" }, 405);
    }

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
