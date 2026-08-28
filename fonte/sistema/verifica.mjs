// Confere o sistema num navegador de verdade: as nove telas, os tres
// papeis, e a regra de nunca encostar nas chaves do outro negocio.
//
// Precisa do site rodando em localhost:8787 (npx wrangler dev) e do
// playwright instalado. Nao entra no npm test porque depende de navegador,
// e o npm test roda em clone novo sem preparo nenhum.
//
// Abre o sistema novo num navegador e passa por todas as telas, com os
// tres papeis. O Access nao esta ligado, entao a porta oferece a escolha
// provisoria de papel, e e por ela que entramos.
import { chromium } from "playwright";
const S = process.env.SAIDA || "/tmp";
const B = "http://localhost:8787";

const nav = await chromium.launch({ executablePath: process.env.CHROMIUM || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await nav.newContext({ viewport: { width: 1420, height: 980 } });
const pg = await ctx.newPage();

const erros = [];
pg.on("pageerror", (e) => erros.push("EXCECAO: " + e.message));
pg.on("console", (m) => {
  if (m.type() === "error" && !/Failed to load resource/.test(m.text())) erros.push("CONSOLE: " + m.text());
});

let ok = 0, bad = 0;
const t = (nome, cond, extra = "") => {
  (cond ? ok++ : bad++);
  console.log(`${cond ? "PASS" : "FALHOU"}  ${nome}${extra ? "   " + extra : ""}`);
};

await pg.goto(`${B}/sistema/`, { waitUntil: "networkidle" });

// 1. A porta, com o Access desligado
const porta = await pg.textContent("#porta");
t("a porta diz que o login protegido não está ligado", /não está ligado/.test(porta));
t("a porta avisa que a área está aberta", /qualquer pessoa com o endereço/i.test(porta));
t("a porta oferece os três papéis", (await pg.locator(".papel").count()) === 3);
await pg.screenshot({ path: `${S}/sis-0-porta.png` });

// 2. Entrar como equipe e passar por todas as telas
await pg.evaluate(() => escolherPapelProvisorio("equipe"));
await pg.waitForTimeout(400);

const telas = await pg.evaluate(() => TELAS.filter((x) => EU.pode(x.k)).map((x) => x.k));
t("a equipe enxerga as nove telas", telas.length === 9, telas.join(", "));

for (const k of telas) {
  const antes = erros.length;
  await pg.evaluate((kk) => irPara(kk), k);
  await pg.waitForTimeout(260);
  const visivel = await pg.locator(`#tela-${k}.on`).count();
  const corpo = (await pg.textContent(`#tela-${k}`)) || "";
  t(`tela ${k}: abre, desenha e não estoura`,
    visivel === 1 && corpo.trim().length > 120 && erros.length === antes,
    `${corpo.trim().length} caracteres` + (erros.length > antes ? " | " + erros.slice(antes).join(" | ") : ""));
}

await pg.evaluate(() => irPara("semana"));
await pg.waitForTimeout(300);
await pg.screenshot({ path: `${S}/sis-1-semana.png` });
await pg.evaluate(() => irPara("roteiros"));
await pg.waitForTimeout(300);
await pg.screenshot({ path: `${S}/sis-2-roteiros.png` });
await pg.evaluate(() => irPara("casa"));
await pg.waitForTimeout(300);
await pg.screenshot({ path: `${S}/sis-3-casa.png` });

// 3. Nenhuma tela pode aparecer vazia de verdade: estado vazio e obrigatorio
for (const k of telas) {
  await pg.evaluate((kk) => irPara(kk), k);
  await pg.waitForTimeout(200);
  const vazias = await pg.evaluate((kk) => {
    const el = document.getElementById("tela-" + kk);
    const corpos = [...el.querySelectorAll("tbody")];
    return corpos.filter((b) => !b.textContent.trim()).length;
  }, k);
  t(`tela ${k}: nenhuma tabela em branco sem explicação`, vazias === 0, `${vazias} vazia(s)`);
}

// 4. Colaborador ve menos, cliente ve uma so
await pg.evaluate(() => { sair(); });
await pg.waitForTimeout(500);
await pg.evaluate(() => escolherPapelProvisorio("colaborador"));
await pg.waitForTimeout(400);
const doColab = await pg.evaluate(() => TELAS.filter((x) => EU.pode(x.k)).map((x) => x.k));
t("colaborador não vê o dinheiro", !doColab.includes("dinheiro"), doColab.join(", "));
t("colaborador não vê A casa", !doColab.includes("casa"));
t("colaborador vê a mesa e as entregas", doColab.includes("ideias") && doColab.includes("entrega"));

await pg.evaluate(() => { sair(); });
await pg.waitForTimeout(500);
await pg.evaluate(() => escolherPapelProvisorio("cliente"));
await pg.waitForTimeout(400);
const doCliente = await pg.evaluate(() => TELAS.filter((x) => EU.pode(x.k)).map((x) => x.k));
t("cliente vê uma tela só, o próprio projeto", doCliente.length === 1 && doCliente[0] === "cliente", doCliente.join(", "));
t("cliente entra sem barra lateral", await pg.evaluate(() => document.getElementById("app").classList.contains("sozinho")));
const telaCliente = await pg.textContent("#tela-cliente");
t("cliente vê o estado de avaliação, não uma tela quebrada", /avaliação/i.test(telaCliente));
await pg.screenshot({ path: `${S}/sis-4-cliente.png` });

// 5. O sistema do outro negocio nao pode estar aqui dentro. Citar o nome
// dele e legitimo: a tela "A casa" precisa dizer o que sao as chaves af_
// antes de oferecer apagar. O que nao pode e o SISTEMA dele.
const tudo = await pg.content();
const marcasDoOutro = ["Esteira comercial", "Gestão à vista", "Portal do colaborador",
  "Arquitetura de Lucro", "Catálogo de serviços", "AUTH.login("];
const achadas = marcasDoOutro.filter((m) => tudo.includes(m));
t("o sistema do outro negócio não está aqui dentro", achadas.length === 0, achadas.join(", "));
t("citar o nome dele é permitido: A casa precisa explicar as chaves af_",
  (tudo.match(/A! Fatorial/g) || []).length > 0);

// 6. Comportamento, e nao texto: com uma chave af_ plantada no navegador,
// o sistema nao pode LER o valor dela em tela nenhuma.
await pg.evaluate(() => {
  localStorage.setItem("af_usuarios", JSON.stringify([{ nome: "Equipe do outro negocio" }]));
  localStorage.setItem("af_fin", JSON.stringify({ saldo: 999999 }));
  window.__lidas = [];
  const original = Storage.prototype.getItem;
  Storage.prototype.getItem = function (k) { window.__lidas.push(k); return original.call(this, k); };
});
await pg.evaluate(() => { sair(); });
await pg.waitForTimeout(400);
await pg.evaluate(() => escolherPapelProvisorio("equipe"));
await pg.waitForTimeout(400);
for (const k of ["semana", "ideias", "leitura", "projetos", "entrega", "roteiros", "dinheiro", "cliente", "casa"]) {
  await pg.evaluate((kk) => irPara(kk), k);
  await pg.waitForTimeout(180);
}
const leuAf = await pg.evaluate(() => window.__lidas.filter((k) => String(k).indexOf("af_") === 0));
t("nunca lê o conteúdo de uma chave do outro negócio", leuAf.length === 0, leuAf.join(", "));
const aindaLa = await pg.evaluate(() => localStorage.getItem("af_fin") !== null);
t("e nunca apaga sozinho: o resíduo continua lá", aindaLa);
const casaTexto = await pg.textContent("#tela-casa");
t("mas A casa avisa que o resíduo existe", /ainda guarda 2 chave/.test(casaTexto), casaTexto.slice(0, 0));

t("nenhum erro de JavaScript em todo o caminho", erros.length === 0, erros.slice(0, 4).join(" | "));

console.log(`\n${ok} passaram, ${bad} falharam`);
await nav.close();
process.exit(bad ? 1 : 0);
