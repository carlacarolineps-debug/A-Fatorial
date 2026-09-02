import crypto from "node:crypto";
import http from "node:http";
// Testes das rotas do Worker.  Rode com:  npm test
//
// Sobe o wrangler local, bate nas rotas de verdade por HTTP e derruba o
// servidor no fim. Não toca no banco de produção: tudo roda no D1 local.
//
// O que estes testes guardam, e por que valem o trabalho:
//   - a porta so deixa entrar quem tem e-mail e senha que conferem
//   - o papel e conferido no BANCO: cliente nao le a mesa
//   - o /sistema/ sai com noindex e no-store
//   - o endereço de teste (.workers.dev) não é indexável
import { spawn, spawnSync } from "node:child_process";
import { setTimeout as espera } from "node:timers/promises";
import { lerPedido } from "./src/leads.js";


// O banco local nasce vazio num clone novo. Sem as tabelas, a rota
// estoura antes de chegar no que o teste quer medir, então o schema é
// aplicado aqui e não na mão de quem clonou.
// A casa e esvaziada aqui, e nao no meio do teste: o wrangler dev segura o
// arquivo do banco local, e um segundo wrangler mexendo nele derruba o dev
// no meio da rodada. Sem isto, "casa vazia" so passaria na primeira vez.
spawnSync("npx", ["wrangler", "d1", "execute", "ideia-que-vende", "--local",
  "--command", "delete from sessoes; delete from pessoas; delete from freio;"],
  { stdio: "ignore" });

for (const arquivo of ["schema.sql", "schema-porta.sql"]) {
  const criar = spawnSync(
    "npx",
    ["wrangler", "d1", "execute", "ideia-que-vende", "--local", `--file=${arquivo}`],
    { stdio: "ignore" },
  );
  if (criar.status !== 0) {
    console.error(`não consegui aplicar o ${arquivo} no banco local`);
    process.exit(1);
  }
}

// Este Worker não tem mais segredo nenhum: o único era o do webhook do
// Typeform, que saiu em 31/08 com a rota dele.
const servidor = spawn(
  "npx",
  ["wrangler", "dev", "--port", "8787", "--local", "--inspector-port", "9229"],
  { stdio: ["ignore", "pipe", "pipe"], detached: true },
);

// "npx" cria um neto, e matar só o filho deixava o wrangler vivo segurando
// a porta 8787: a rodada seguinte não subia. detached faz do filho o líder
// do grupo, e o sinal negativo derruba o grupo inteiro.
const derrubar = () => { try { process.kill(-servidor.pid, "SIGKILL"); } catch {} };
process.on("exit", derrubar);
process.on("SIGINT", () => { derrubar(); process.exit(1); });

const pronto = (proc, nome) => new Promise((res, rej) => {
  const prazo = setTimeout(() => rej(new Error(`${nome} não subiu em 90s`)), 90_000);
  proc.stdout.on("data", (c) => {
    if (String(c).includes("Ready on")) { clearTimeout(prazo); res(); }
  });
});
await pronto(servidor, "wrangler dev");
await espera(500);

const B = "http://localhost:8787";
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

// ---------- a porta: e-mail e senha ----------
//
// Guardar o cookie na mao: fetch do node nao tem pote de biscoitos.
const craxas = {};
const guardar = (quem, resposta) => {
  const posto = resposta.headers.getSetCookie?.() || [];
  const linha = posto.find((c) => c.startsWith("iqv_cracha="));
  if (linha) craxas[quem] = linha.split(";")[0];
};
const com = (quem, extra = {}) => ({
  ...extra,
  headers: { "content-type": "application/json", ...(extra.headers || {}),
             ...(craxas[quem] ? { cookie: craxas[quem] } : {}) },
});
const postar = (caminho, corpo, quem) =>
  fetch(`${B}${caminho}`, com(quem, { method: "POST", body: JSON.stringify(corpo) }));

let j;

r = await fetch(`${B}/eu`);
j = await r.json();
t("porta: com a casa vazia, o /eu avisa", r.status === 200 && j.casa_vazia === true && j.entrou === false, JSON.stringify(j));

r = await postar("/primeiro-acesso", { nome: "Carla", email: "carla@iqv.com.br", senha: "curta" });
j = await r.json();
t("porta: primeira senha curta é recusada", r.status === 400 && /8 caracteres/.test(j.erro), JSON.stringify(j));

r = await postar("/primeiro-acesso", { nome: "Carla", email: "nao-e-email", senha: "umasenhaboa" });
t("porta: primeiro acesso com e-mail torto é recusado", r.status === 400, `status=${r.status}`);

r = await postar("/primeiro-acesso", { nome: "Carla Caroline", email: "Carla@IQV.com.BR", senha: "umasenhaboa" });
j = await r.json();
guardar("carla", r);
t("porta: a primeira pessoa nasce gestora", r.status === 200 && j.eu.papel === "gestor", JSON.stringify(j.eu || {}));
t("porta: o e-mail é guardado em minúsculas", j.eu && j.eu.email === "carla@iqv.com.br", j.eu && j.eu.email);
t("porta: entrar devolve um crachá no cookie", !!craxas.carla);

r = await postar("/primeiro-acesso", { nome: "Intruso", email: "x@y.com", senha: "umasenhaboa" });
t("porta: primeiro acesso não funciona duas vezes", r.status === 409, `status=${r.status}`);

r = await fetch(`${B}/eu`, com("carla"));
j = await r.json();
t("porta: o /eu reconhece quem entrou", j.entrou === true && j.eu.nome === "Carla Caroline", JSON.stringify(j.eu || {}));

r = await fetch(`${B}/eu`, { headers: { cookie: "iqv_cracha=" + "f".repeat(64) } });
j = await r.json();
t("porta: crachá inventado não entra", j.entrou === false, JSON.stringify(j));

// ---------- errar e-mail e errar senha respondem igual ----------
r = await postar("/entrar", { email: "carla@iqv.com.br", senha: "erradaerrada" });
const erroSenha = await r.json();
t("porta: senha errada  401", r.status === 401, `status=${r.status}`);

r = await postar("/entrar", { email: "ninguem@lugar.com", senha: "erradaerrada" });
const erroEmail = await r.json();
t("porta: e-mail que não existe responde a MESMA coisa que senha errada",
  erroEmail.erro === erroSenha.erro, `${erroEmail.erro} / ${erroSenha.erro}`);

// ---------- o freio ----------
//
// Num e-mail so dele: o freio dura quinze minutos e nao ha como soltar sem
// mexer no banco, o que derrubaria o servidor no meio da rodada. Freando um
// e-mail descartavel, o resto do teste segue com os de verdade.
const chutado = "freio-de-teste@iqv.com.br";
for (let i = 0; i < 8; i++) await postar("/entrar", { email: chutado, senha: "chuteichutei" });
r = await postar("/entrar", { email: chutado, senha: "chuteichutei" });
j = await r.json();
t("porta: oito erros seguidos freiam aquele e-mail", r.status === 429 && j.freado === true, JSON.stringify(j));

r = await postar("/entrar", { email: "carla@iqv.com.br", senha: "umasenhaboa" });
guardar("carla", r);
t("porta: e o freio é por e-mail, não fecha a casa inteira", r.status === 200, `status=${r.status}`);

// ---------- cadastrar equipe ----------
r = await postar("/pessoas", { nome: "Beatriz", email: "bia@iqv.com.br", papel: "colaborador", senha: "primeira123" }, "carla");
j = await r.json();
t("pessoas: a gestora cadastra", r.status === 200 && j.pessoa.papel === "colaborador", JSON.stringify(j.pessoa || j));
t("pessoas: quem é cadastrada troca a senha na primeira entrada", j.pessoa && j.pessoa.precisa_trocar === true);

r = await postar("/pessoas", { nome: "Outra", email: "bia@iqv.com.br", papel: "colaborador", senha: "primeira123" }, "carla");
t("pessoas: o mesmo e-mail duas vezes é recusado", r.status === 409, `status=${r.status}`);

r = await postar("/pessoas", { nome: "X", email: "x@iqv.com.br", papel: "chefe", senha: "primeira123" }, "carla");
t("pessoas: papel inventado é recusado", r.status === 400, `status=${r.status}`);

r = await postar("/pessoas", { nome: "Marina", email: "marina@cliente.com", papel: "cliente", senha: "primeira123" }, "carla");
t("pessoas: cliente também é cadastrado aqui", r.status === 200, `status=${r.status}`);

r = await fetch(`${B}/pessoas`);
t("pessoas: sem entrar, a lista é 401", r.status === 401, `status=${r.status}`);

// ---------- o papel filtra DADO, e não só tela ----------
r = await postar("/entrar", { email: "marina@cliente.com", senha: "primeira123" });
j = await r.json();
guardar("marina", r);
t("porta: quem foi cadastrada entra com a senha que recebeu", r.status === 200, `status=${r.status}`);
t("porta: e é avisada de que precisa trocar", j.eu && j.eu.precisa_trocar === true);

r = await fetch(`${B}/leads`, com("marina"));
t("leads: cliente NÃO lê a mesa, nem com o endereço na mão", r.status === 403, `status=${r.status}`);

r = await fetch(`${B}/pessoas`, com("marina"));
t("pessoas: cliente não lê a lista da equipe", r.status === 403, `status=${r.status}`);

r = await postar("/entrar", { email: "bia@iqv.com.br", senha: "primeira123" });
guardar("bia", r);
r = await fetch(`${B}/leads`, com("bia"));
t("leads: colaboradora lê a mesa", r.status === 200, `status=${r.status}`);

r = await postar("/pessoas", { nome: "Z", email: "z@iqv.com.br", papel: "gestor", senha: "primeira123" }, "bia");
t("pessoas: colaboradora não cadastra ninguém", r.status === 403, `status=${r.status}`);

r = await fetch(`${B}/leads`, com("carla"));
t("leads: a gestora lê a mesa", r.status === 200, `status=${r.status}`);

r = await fetch(`${B}/leads`);
j = await r.json();
t("leads: sem entrar  401", r.status === 401 && j.erro === "não autorizado", JSON.stringify(j));

r = await fetch(`${B}/leads`, { method: "PATCH", body: JSON.stringify({ id: 1, status: "contatado" }) });
t("leads: PATCH sem entrar  401", r.status === 401, `status=${r.status}`);

r = await fetch(`${B}/leads`, { method: "POST" });
t("leads: POST  405", r.status === 405, `status=${r.status}`);

r = await fetch(`${B}/leads`, { method: "DELETE" });
t("leads: DELETE  405", r.status === 405, `status=${r.status}`);

// ---------- trocar a própria senha ----------
r = await postar("/minha-senha", { atual: "erradaerrada", nova: "outrasenha1" }, "bia");
t("senha: a atual errada não troca nada", r.status === 400, `status=${r.status}`);

r = await postar("/minha-senha", { atual: "primeira123", nova: "curta" }, "bia");
t("senha: a nova curta é recusada", r.status === 400, `status=${r.status}`);

r = await postar("/minha-senha", { atual: "primeira123", nova: "outrasenha1" }, "bia");
t("senha: com a atual certa, troca", r.status === 200, `status=${r.status}`);

r = await postar("/entrar", { email: "bia@iqv.com.br", senha: "primeira123" });
t("senha: a antiga para de entrar", r.status === 401, `status=${r.status}`);

r = await postar("/entrar", { email: "bia@iqv.com.br", senha: "outrasenha1" });
j = await r.json();
guardar("bia", r);
t("senha: a nova entra, e a marca de trocar sai", r.status === 200 && j.eu.precisa_trocar === false, JSON.stringify(j.eu || {}));

// ---------- a casa nunca fica sem gestor ----------
const listaAgora = await (await fetch(`${B}/pessoas`, com("carla"))).json();
const idDaCarla = listaAgora.pessoas.find((p) => p.email === "carla@iqv.com.br").id;
const idDaBia = listaAgora.pessoas.find((p) => p.email === "bia@iqv.com.br").id;

r = await fetch(`${B}/pessoas`, com("carla", { method: "PATCH", body: JSON.stringify({ id: idDaCarla, papel: "colaborador" }) }));
t("casa: a única gestora não consegue se rebaixar", r.status === 409, `status=${r.status}`);

r = await fetch(`${B}/pessoas`, com("carla", { method: "PATCH", body: JSON.stringify({ id: idDaCarla, ativo: false }) }));
t("casa: e não consegue desligar o próprio acesso", r.status === 409, `status=${r.status}`);

r = await fetch(`${B}/pessoas`, com("carla", { method: "DELETE", body: JSON.stringify({ id: idDaCarla }) }));
t("casa: nem se remover", r.status === 409, `status=${r.status}`);

// ---------- desligar alguém derruba a sessão dela na hora ----------
r = await fetch(`${B}/pessoas`, com("carla", { method: "PATCH", body: JSON.stringify({ id: idDaBia, ativo: false }) }));
t("casa: a gestora desliga a colaboradora", r.status === 200, `status=${r.status}`);

r = await fetch(`${B}/leads`, com("bia"));
t("casa: quem foi desligada cai na hora, e não daqui a um mês", r.status === 401, `status=${r.status}`);

r = await postar("/entrar", { email: "bia@iqv.com.br", senha: "outrasenha1" });
t("casa: e não consegue entrar de novo", r.status === 401, `status=${r.status}`);

// ---------- sair ----------
r = await fetch(`${B}/sair`, com("carla", { method: "POST" }));
t("sair: responde ok", r.status === 200, `status=${r.status}`);

r = await fetch(`${B}/leads`, com("carla"));
t("sair: o crachá antigo morre no servidor, e não só no navegador", r.status === 401, `status=${r.status}`);

r = await fetch(`${B}/eu`, { method: "POST" });
t("eu: POST  405", r.status === 405, `status=${r.status}`);

r = await fetch(`${B}/eu`);
const corpoEu = await r.text();
t("eu: não vaza a lista de quem tem acesso", !/carla@iqv/.test(corpoEu) && corpoEu.length < 200, `${corpoEu.length} bytes`);

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
process.exit(bad ? 1 : 0);
