import crypto from "node:crypto";
import http from "node:http";
// Testes das rotas do Worker.  Rode com:  npm test
//
// Sobe o wrangler local, bate nas rotas de verdade por HTTP e derruba o
// servidor no fim. Não toca no banco de produção: tudo roda no D1 local.
//
// O que estes testes guardam, e por que valem o trabalho:
//   - o /leads fecha sozinho enquanto TEAM_DOMAIN e ACCESS_AUD faltarem
//   - o /sistema/ sai com noindex e no-store
//   - o endereço de teste (.workers.dev) não é indexável
import { spawn, spawnSync } from "node:child_process";
import { setTimeout as espera } from "node:timers/promises";
import { lerPedido } from "./src/leads.js";


// O banco local nasce vazio num clone novo. Sem as tabelas, a rota
// estoura antes de chegar no que o teste quer medir, então o schema é
// aplicado aqui e não na mão de quem clonou.
const criarTabelas = spawnSync(
  "npx",
  ["wrangler", "d1", "execute", "ideia-que-vende", "--local", "--file=schema.sql"],
  { stdio: "ignore" },
);
if (criarTabelas.status !== 0) {
  console.error("não consegui criar as tabelas no banco local");
  process.exit(1);
}

// Este Worker não tem mais segredo nenhum: o único era o do webhook do
// Typeform, que saiu em 31/08 com a rota dele.
//
// As duas variáveis do Access entram VAZIAS de propósito, e por escrito.
// Antes elas vinham vazias do próprio wrangler.toml, e no dia em que a
// Carla configurou o Access de verdade três testes passaram a falhar sem
// que nada tivesse quebrado: eles provam o estado "ainda não configurado",
// e esse estado deixou de existir no arquivo. Forçar aqui prende o teste ao
// que ele quer provar, e não ao que está publicado hoje.
const servidor = spawn(
  "npx",
  ["wrangler", "dev", "--port", "8787", "--local", "--inspector-port", "9229",
   "--var", "TEAM_DOMAIN:", "--var", "ACCESS_AUD:"],
  { stdio: ["ignore", "pipe", "pipe"], detached: true },
);

// "npx" cria um neto, e matar só o filho deixava o wrangler vivo segurando
// a porta 8787: a rodada seguinte não subia. detached faz do filho o líder
// do grupo, e o sinal negativo derruba o grupo inteiro.
const derrubar = () => { try { process.kill(-servidor.pid, "SIGKILL"); } catch {} };
process.on("exit", derrubar);
process.on("SIGINT", () => { derrubar(); process.exit(1); });

// Um segundo Worker, igual ao primeiro mas COM o Access configurado. Ele
// existe para provar a outra metade da porta: sem as variáveis o /leads
// responde 503, e com elas preenchidas ele passa a exigir login de
// verdade em vez de abrir. Sem este servidor, o 401 nunca é exercitado.
const servidorAccess = spawn(
  "npx",
  ["wrangler", "dev", "--port", "8788", "--local", "--inspector-port", "9230",
   // banco próprio: os dois wrangler rodando juntos não podem disputar o
   // mesmo diretório de estado local
   "--persist-to", ".wrangler/estado-access",
   "--var", "TEAM_DOMAIN:teste.invalid", "--var", "ACCESS_AUD:aud-de-teste"],
  { stdio: ["ignore", "pipe", "pipe"], detached: true },
);
const derrubarAccess = () => { try { process.kill(-servidorAccess.pid, "SIGKILL"); } catch {} };
process.on("exit", derrubarAccess);

const pronto = (proc, nome) => new Promise((res, rej) => {
  const prazo = setTimeout(() => rej(new Error(`${nome} não subiu em 90s`)), 90_000);
  proc.stdout.on("data", (c) => {
    if (String(c).includes("Ready on")) { clearTimeout(prazo); res(); }
  });
});
await Promise.all([pronto(servidor, "wrangler dev"), pronto(servidorAccess, "wrangler dev (access)")]);
await espera(500);

const B = "http://localhost:8787";
const BA = "http://localhost:8788";   // mesmo Worker, com TEAM_DOMAIN e ACCESS_AUD preenchidos
let ok = 0, bad = 0;
const t = (nome, cond, extra = "") => {
  (cond ? ok++ : bad++);
  console.log(`${cond ? "PASS" : "FALHOU"}  ${nome}${extra ? "   " + extra : ""}`);
};

// ---------- site estático ----------
let r = await fetch(`${B}/`);
let html = await r.text();
t("GET /  200", r.status === 200, `status=${r.status}`);
t("GET /  é a landing", html.includes("IDEIA QUE VENDE") || html.includes("ideia que vende"), `${html.length} bytes`);
t("GET /  _headers aplicado (nosniff)", r.headers.get("x-content-type-options") === "nosniff");
t("GET /  _headers aplicado (frame)", r.headers.get("x-frame-options") === "SAMEORIGIN");

r = await fetch(`${B}/sistema/`);
html = await r.text();
t("GET /sistema/  200", r.status === 200, `status=${r.status}`);
t("GET /sistema/  é a área do Ideia Que Vende", /Ideia Que\s*<?\/?\w*>?\s*Vende/.test(html) || html.includes("Ideia Que"), `${html.length} bytes`);
// A area restrita nao pode SERVIR o sistema de outro negocio: ele ja esteve
// aqui e foi publicado por engano no dominio. Citar o nome dele e legitimo:
// a tela "A casa" precisa explicar o que sao as chaves af_ antes de oferecer
// apagar. Por isso o teste procura as TELAS dele, e nao a palavra.
const doOutro = ["Esteira comercial", "Gestão à vista", "Portal do colaborador",
                 "Arquitetura de Lucro", "Catálogo de serviços"].filter((m) => html.includes(m));
t("GET /sistema/  não serve o sistema de outro negócio", doOutro.length === 0, doOutro.join(", "));
t("GET /sistema/  noindex", (r.headers.get("x-robots-tag") || "").includes("noindex"), r.headers.get("x-robots-tag") || "(ausente)");
t("GET /sistema/  no-store", (r.headers.get("cache-control") || "").includes("no-store"), r.headers.get("cache-control") || "(ausente)");

r = await fetch(`${B}/og-image.png`);
t("GET /og-image.png", r.status === 200 && r.headers.get("content-type") === "image/png", `${r.status} ${r.headers.get("content-type")}`);

r = await fetch(`${B}/nao-existe-mesmo`);
t("GET caminho inexistente  404", r.status === 404, `status=${r.status}`);

// ---------- seo dinâmico ----------
r = await fetch(`${B}/robots.txt`);
let txt = await r.text();
t("GET /robots.txt  200", r.status === 200);
t("robots: bloqueia /sistema/", txt.includes("Disallow: /sistema/"));
t("robots: sitemap com o host pedido", txt.includes("Sitemap: http://localhost:8787/sitemap.xml"), txt.trim().split("\n").pop());

// node fetch nao deixa mandar Host na mao; vai de http cru
txt = await new Promise((res, rej) => {
  const req = http.request({ host: "localhost", port: 8787, path: "/robots.txt",
    headers: { Host: "ideia-que-vende.gestaogrupoa.workers.dev" } }, (rr) => {
      let b = ""; rr.on("data", (c) => (b += c)); rr.on("end", () => res(b));
    });
  req.on("error", rej); req.end();
});
t("robots em workers.dev: bloqueia tudo", txt.includes("Disallow: /") && !txt.includes("Allow: /"), JSON.stringify(txt.trim()));

r = await fetch(`${B}/sitemap.xml`);
txt = await r.text();
t("GET /sitemap.xml  200", r.status === 200);
t("sitemap: namespace certo", txt.includes("http://www.sitemaps.org/schemas/sitemap/0.9"));
t("sitemap: loc com o host pedido", txt.includes("<loc>http://localhost:8787/</loc>"));
t("sitemap: content-type xml", (r.headers.get("content-type") || "").includes("xml"), r.headers.get("content-type"));

// ---------- /leads ----------
r = await fetch(`${B}/leads`);
let j = await r.json();
t("leads: sem TEAM_DOMAIN/AUD  503 explicando", r.status === 503 && /TEAM_DOMAIN/.test(j.erro), JSON.stringify(j));

r = await fetch(`${B}/leads`, { method: "PATCH", body: JSON.stringify({ id: 1, status: "contatado" }) });
j = await r.json();
t("leads: PATCH sem TEAM_DOMAIN/AUD  503 explicando", r.status === 503 && /TEAM_DOMAIN/.test(j.erro), JSON.stringify(j));

r = await fetch(`${B}/leads`, { method: "POST" });
t("leads: POST  405", r.status === 405, `status=${r.status}`);

r = await fetch(`${B}/leads`, { method: "DELETE" });
t("leads: DELETE  405", r.status === 405, `status=${r.status}`);

// ---------- /leads com o Access configurado: exige login, não abre ----------
r = await fetch(`${BA}/leads`);
j = await r.json();
t("leads configurado: GET sem login  401", r.status === 401 && j.erro === "não autorizado", JSON.stringify(j));

r = await fetch(`${BA}/leads`, { method: "PATCH", body: JSON.stringify({ id: 1, status: "ganho" }) });
j = await r.json();
t("leads configurado: PATCH sem login  401", r.status === 401, JSON.stringify(j));

r = await fetch(`${BA}/leads`, { method: "GET", headers: { "cf-access-jwt-assertion": "token.forjado.aqui" } });
t("leads configurado: JWT forjado  401", r.status === 401, `status=${r.status}`);

// ---------- /eu: quem entrou ----------
r = await fetch(`${B}/eu`);
j = await r.json();
t("eu: sem TEAM_DOMAIN/AUD  503 explicando", r.status === 503 && /TEAM_DOMAIN/.test(j.erro), JSON.stringify(j));

r = await fetch(`${B}/eu`, { method: "POST" });
t("eu: POST  405", r.status === 405, `status=${r.status}`);

r = await fetch(`${BA}/eu`);
j = await r.json();
t("eu configurado: sem login  401", r.status === 401 && j.erro === "não autorizado", JSON.stringify(j));

r = await fetch(`${BA}/eu`, { headers: { "cf-access-jwt-assertion": "token.forjado.aqui" } });
t("eu configurado: JWT forjado  401", r.status === 401, `status=${r.status}`);

// o /eu nao pode virar um jeito de descobrir a lista de quem tem acesso
r = await fetch(`${BA}/eu`);
const corpoEu = await r.text();
t("eu: não vaza nada além do erro quando barra", corpoEu.length < 120, `${corpoEu.length} bytes`);

// ---------- o que o PATCH aceita mudar (função pura, sem servidor) ----------
const p1 = lerPedido({ id: 7, status: "contatado" });
t("patch: status válido vira SQL", !p1.erro && p1.id === 7 && p1.valores[0] === "contatado", JSON.stringify(p1.valores));
t("patch: sempre carimba atualizado_em", p1.campos.some((c) => c.startsWith("atualizado_em")));

t("patch: status inventado é recusado", !!lerPedido({ id: 7, status: "vendido" }).erro);
t("patch: id zero é recusado", !!lerPedido({ id: 0, status: "novo" }).erro);
t("patch: id de texto é recusado", !!lerPedido({ id: "1; drop table leads", status: "novo" }).erro);
t("patch: corpo sem nada para mudar é recusado", !!lerPedido({ id: 7 }).erro);
t("patch: nome e e-mail não se editam pela mesa",
  !!lerPedido({ id: 7, nome: "Outra Pessoa", email: "outro@x.com" }).erro);

const p2 = lerPedido({ id: 7, observacoes: "x".repeat(5000) });
t("patch: observação muito longa é cortada", p2.valores[0].length === 2000, `${p2.valores[0].length} caracteres`);

console.log(`\n${ok} passaram, ${bad} falharam`);
derrubar();
derrubarAccess();
process.exit(bad ? 1 : 0);
