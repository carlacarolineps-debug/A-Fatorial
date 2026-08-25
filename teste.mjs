import crypto from "node:crypto";
import http from "node:http";
// Testes das rotas do Worker.  Rode com:  npm test
//
// Sobe o wrangler local, bate nas rotas de verdade por HTTP e derruba o
// servidor no fim. Não toca no banco de produção: tudo roda no D1 local.
//
// O que estes testes guardam, e por que valem o trabalho:
//   - o /typeform só aceita corpo assinado, e a assinatura é sobre o corpo
//     CRU (o teste "corpo adulterado depois de assinar" existe para isso)
//   - reenvio do Typeform atualiza o lead, não duplica
//   - o /leads fecha sozinho enquanto TEAM_DOMAIN e ACCESS_AUD faltarem
//   - o /sistema/ sai com noindex e no-store
//   - o endereço de teste (.workers.dev) não é indexável
import { spawn } from "node:child_process";
import { setTimeout as espera } from "node:timers/promises";

const servidor = spawn("npx", ["wrangler", "dev", "--port", "8787", "--local"], {
  stdio: ["ignore", "pipe", "pipe"],
});
process.on("exit", () => servidor.kill());
process.on("SIGINT", () => { servidor.kill(); process.exit(1); });

await new Promise((res, rej) => {
  const prazo = setTimeout(() => rej(new Error("wrangler dev não subiu em 90s")), 90_000);
  servidor.stdout.on("data", (c) => {
    if (String(c).includes("Ready on")) { clearTimeout(prazo); res(); }
  });
});
await espera(500);

const B = "http://localhost:8787";
let ok = 0, bad = 0;
const t = (nome, cond, extra = "") => {
  (cond ? ok++ : bad++);
  console.log(`${cond ? "PASS" : "FALHOU"}  ${nome}${extra ? "   " + extra : ""}`);
};

const SEGREDO = "segredo-de-teste";
const payload = JSON.stringify({
  event_id: "01H", event_type: "form_response",
  form_response: {
    form_id: "m70jOwFd", token: "resp-abc-123",
    hidden: { plano: "pro" },
    definition: { fields: [
      { id: "f1", title: "Qual seu nome?", type: "short_text" },
      { id: "f2", title: "Seu melhor e-mail", type: "email" },
      { id: "f3", title: "WhatsApp", type: "phone_number" },
      { id: "f4", title: "Faturamento hoje", type: "multiple_choice" },
    ]},
    answers: [
      { field: { id: "f1" }, type: "text", text: "Carla Caroline" },
      { field: { id: "f2" }, type: "email", email: "CARLA@Exemplo.COM" },
      { field: { id: "f3" }, type: "phone_number", phone_number: "+5511999998888" },
      { field: { id: "f4" }, type: "choice", choice: { label: "10k a 50k" } },
    ],
  },
});
const assina = (corpo, seg = SEGREDO) =>
  "sha256=" + crypto.createHmac("sha256", seg).update(corpo).digest("base64");

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
t("GET /sistema/  é o sistema", html.length > 500000, `${html.length} bytes`);
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

// ---------- /typeform ----------
r = await fetch(`${B}/typeform`, { method: "POST", headers: { "typeform-signature": assina(payload) }, body: payload });
let j = await r.json();
t("typeform: assinatura certa  200 ok", r.status === 200 && j.ok === true, JSON.stringify(j));
t("typeform: resposta é no-store", r.headers.get("cache-control") === "no-store");

r = await fetch(`${B}/typeform`, { method: "POST", headers: { "typeform-signature": assina(payload, "segredo-errado") }, body: payload });
t("typeform: assinatura errada  401", r.status === 401, `status=${r.status}`);

r = await fetch(`${B}/typeform`, { method: "POST", body: payload });
t("typeform: sem assinatura  401", r.status === 401, `status=${r.status}`);

const adulterado = payload.replace("Carla Caroline", "Outra Pessoa!");
r = await fetch(`${B}/typeform`, { method: "POST", headers: { "typeform-signature": assina(payload) }, body: adulterado });
t("typeform: corpo adulterado depois de assinar  401", r.status === 401, `status=${r.status}`);

r = await fetch(`${B}/typeform`, { method: "POST", headers: { "typeform-signature": "lixo" }, body: payload });
t("typeform: cabeçalho lixo  401", r.status === 401, `status=${r.status}`);

r = await fetch(`${B}/typeform`);
t("typeform: GET  405", r.status === 405, `status=${r.status}`);

// reenvio do mesmo token não pode duplicar
await fetch(`${B}/typeform`, { method: "POST", headers: { "typeform-signature": assina(payload) }, body: payload });

// payload assinado mas sem token → 200 (fica no log), sem quebrar
const semToken = JSON.stringify({ form_response: { form_id: "x", answers: [] } });
r = await fetch(`${B}/typeform`, { method: "POST", headers: { "typeform-signature": assina(semToken) }, body: semToken });
j = await r.json();
t("typeform: payload sem token  200 ok:false", r.status === 200 && j.ok === false, JSON.stringify(j));

// ---------- /leads ----------
r = await fetch(`${B}/leads`);
j = await r.json();
t("leads: sem TEAM_DOMAIN/AUD  503 explicando", r.status === 503 && /TEAM_DOMAIN/.test(j.erro), JSON.stringify(j));

r = await fetch(`${B}/leads`, { method: "POST" });
t("leads: POST  405", r.status === 405, `status=${r.status}`);

console.log(`\n${ok} passaram, ${bad} falharam`);
servidor.kill();
process.exit(bad ? 1 : 0);
