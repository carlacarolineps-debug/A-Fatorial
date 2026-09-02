// Abre o sistema num navegador e passa por todas as telas, com os tres
// papeis. Quem entra e criado pelo servidor, e a troca de papel e feita
// entrando com outra pessoa: papel nao e mais coisa que o navegador decide.
import { chromium } from "playwright";
import { spawnSync } from "node:child_process";
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

// A casa comeca vazia: o primeiro acesso so responde sem ninguem
// cadastrado, e as tres pessoas sao criadas por ele e pela rota da equipe.
spawnSync("npx", ["wrangler", "d1", "execute", "ideia-que-vende", "--local",
  "--command", "delete from sessoes; delete from pessoas; delete from freio;"],
  { stdio: "ignore" });

// A colaboradora e o cliente nascem com a marca de trocar a senha, e a
// sessao de quem nao trocou so serve para trocar. Quem semeia gente aqui
// tem que trocar a senha de cada uma antes de usar a conta.

const SENHA = "senhadeteste1";
const entrarComo = async (email) => {
  await pg.evaluate(async ([e, s]) => {
    await fetch("/sair", { method: "POST", headers: { accept: "application/json" } });
    await fetch("/entrar", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ email: e, prova: await provaDaSenha(e, s) }),
    });
  }, [email, SENHA]);
  await pg.reload({ waitUntil: "networkidle" });
  await pg.waitForTimeout(900);
};

await pg.goto(`${B}/sistema/`, { waitUntil: "networkidle" });
await pg.waitForTimeout(600);

// 1. A porta, sem ninguem cadastrado
const porta = await pg.textContent("#porta");
t("com a casa vazia, a porta pede para criar a primeira gestora", /Este sistema é/.test(porta));
t("e nao pede senha de ninguem antes de existir gente", !/Bem-vinda de/.test(porta));
await pg.screenshot({ path: `${S}/sis-0-porta.png` });

// 2. As tres pessoas, criadas pelo servidor, e entrar como gestora
await pg.evaluate(async ([s]) => {
  // A pagina ja carregou, entao provaDaSenha e as regras do servidor estao
  // aqui dentro: a semeadura embaralha a senha do mesmo jeito que a tela.
  const mandar = (caminho, corpo) => fetch(caminho, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(corpo),
  });
  const pv = (email) => provaDaSenha(email, s);
  await mandar("/primeiro-acesso", { nome: "Carla Caroline", email: "carla@iqv.com.br", prova: await pv("carla@iqv.com.br") });
  await mandar("/pessoas", { nome: "Beatriz", email: "bia@iqv.com.br", papel: "colaborador", prova: await pv("bia@iqv.com.br") });
  await mandar("/pessoas", { nome: "Marina Alves", email: "marina@cliente.com", papel: "cliente", prova: await pv("marina@cliente.com") });
  // As duas cadastradas nascem com a marca de trocar a senha, que
  // prenderia esta verificacao na tela de troca. Aqui elas ja trocaram:
  // o que se quer provar sao as telas, e a troca tem verificacao propria.
  for (const email of ["bia@iqv.com.br", "marina@cliente.com"]) {
    await fetch("/sair", { method: "POST", headers: { accept: "application/json" } });
    await mandar("/entrar", { email, prova: await pv(email) });
    await mandar("/minha-senha", { atual: await pv(email), nova: await provaDaSenha(email, s + "x") });
    await mandar("/minha-senha", { atual: await provaDaSenha(email, s + "x"), nova: await pv(email) });
  }
}, [SENHA]);

await entrarComo("carla@iqv.com.br");

const telas = await pg.evaluate(() => TELAS.filter((x) => EU.pode(x.k)).map((x) => x.k));
t("o gestor enxerga as dez telas", telas.length === 10, telas.join(", "));

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
await entrarComo("bia@iqv.com.br");
const doColab = await pg.evaluate(() => TELAS.filter((x) => EU.pode(x.k)).map((x) => x.k));
t("colaborador não vê o dinheiro", !doColab.includes("dinheiro"), doColab.join(", "));
t("colaborador não vê A casa", !doColab.includes("casa"));
t("colaborador vê a mesa e as entregas", doColab.includes("ideias") && doColab.includes("entrega"));
t("colaborador edita o formulário, cliente não", doColab.includes("formulario"));

await entrarComo("marina@cliente.com");
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
// planta o residuo e volta para o gestor ANTES de instrumentar, porque a
// recarga apagaria o espiao junto com o resto da pagina
await pg.evaluate(() => {
  localStorage.setItem("af_usuarios", JSON.stringify([{ nome: "Equipe do outro negocio" }]));
  localStorage.setItem("af_fin", JSON.stringify({ saldo: 999999 }));
});
await entrarComo("carla@iqv.com.br");
await pg.evaluate(() => {
  window.__lidas = [];
  const original = Storage.prototype.getItem;
  Storage.prototype.getItem = function (k) { window.__lidas.push(k); return original.call(this, k); };
});
for (const k of ["semana", "ideias", "leitura", "projetos", "entrega", "roteiros", "dinheiro", "cliente", "casa"]) {
  await pg.evaluate((kk) => irPara(kk), k);
  await pg.waitForTimeout(180);
}
const leuAf = await pg.evaluate(() => window.__lidas.filter((k) => String(k).indexOf("af_") === 0));
t("nunca lê o conteúdo de uma chave do outro negócio", leuAf.length === 0, leuAf.join(", "));
const aindaLa = await pg.evaluate(() => localStorage.getItem("af_fin") !== null);
t("e nunca apaga sozinho: o resíduo continua lá", aindaLa);
const casaTexto = await pg.textContent("#tela-casa");
t("mas A casa avisa que o resíduo existe", /guarda 2 chave/.test(casaTexto));

// 7. A casa explica o papel ANTES de cadastrar, e a explicacao sai da
// mesma lista que manda de verdade.
await pg.evaluate(() => irPara("casa"));
await pg.waitForTimeout(900);
await pg.selectOption("#casaPapel", "gestor");
await pg.waitForTimeout(250);
let dica = await pg.textContent("#casaPapelDica");
t("ao escolher Gestor, a casa diz que ele vê todas as telas", /todas as 10 telas/.test(dica), dica);

await pg.selectOption("#casaPapel", "colaborador");
await pg.waitForTimeout(250);
dica = await pg.textContent("#casaPapelDica");
t("ao escolher Colaborador, ela diz quantas e quais", /8 das 10 telas/.test(dica) && /Minha semana/.test(dica), dica);
t("e não promete o que o colaborador não vê", !/Contratado e recebido/.test(dica), dica);

await pg.selectOption("#casaPapel", "cliente");
await pg.waitForTimeout(250);
dica = await pg.textContent("#casaPapelDica");
t("ao escolher Cliente, ela diz que é uma tela só", /1 das 10 telas/.test(dica), dica);

t("nenhum erro de JavaScript em todo o caminho", erros.length === 0, erros.slice(0, 4).join(" | "));

console.log(`\n${ok} passaram, ${bad} falharam`);
await nav.close();
process.exit(bad ? 1 : 0);
