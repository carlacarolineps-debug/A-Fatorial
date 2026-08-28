// O login por pessoa, do primeiro dia ate tres pessoas com papeis
// diferentes entrando cada uma no seu.
import { chromium } from "playwright";
const S = process.env.SAIDA || "/tmp";
const B = "http://localhost:8787";

const nav = await chromium.launch({ executablePath: process.env.CHROMIUM || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
const ctx = await nav.newContext({ viewport: { width: 1420, height: 980 } });
const pg = await ctx.newPage();
const erros = [];
pg.on("pageerror", (e) => erros.push("EXCECAO: " + e.message));
pg.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) erros.push("CONSOLE: " + m.text()); });

let ok = 0, bad = 0;
const t = (nome, cond, extra = "") => { (cond ? ok++ : bad++); console.log(`${cond ? "PASS" : "FALHOU"}  ${nome}${extra ? "   " + extra : ""}`); };
const esperar = (ms) => pg.waitForTimeout(ms);

// ---------- 1. primeiro dia: ninguem cadastrado ----------
await pg.goto(`${B}/sistema/`, { waitUntil: "networkidle" });
await esperar(600);
let porta = await pg.textContent("#porta");
t("primeiro dia pede para criar o gestor", /Ninguém usa este sistema/.test(porta));
t("e explica que o resto da equipe vem depois", /cadastra o resto da equipe/.test(porta));
await pg.screenshot({ path: `${S}/log-1-primeiro.png` });

// recusa senha curta e senhas diferentes
await pg.fill("#portaNome", "Carla Caroline");
await pg.fill("#portaEmail", "carla@ideiaquevende.com.br");
await pg.fill("#portaSenha", "123");
await pg.fill("#portaSenha2", "123");
await pg.click("text=Criar meu acesso");
await esperar(300);
t("senha curta é recusada", /pelo menos 6/.test(await pg.textContent("#portaErro")));

await pg.fill("#portaSenha", "segredo123");
await pg.fill("#portaSenha2", "outracoisa");
await pg.click("text=Criar meu acesso");
await esperar(300);
t("senhas diferentes são recusadas", /não são iguais/.test(await pg.textContent("#portaErro")));

await pg.fill("#portaSenha2", "segredo123");
await pg.click("text=Criar meu acesso");
await esperar(700);
t("gestor entra depois de criar", await pg.evaluate(() => EU.papel === "gestor"), await pg.evaluate(() => EU.papel));
t("a senha NÃO fica guardada em texto puro", await pg.evaluate(() => {
  const p = JSON.parse(localStorage.getItem("iqv_usuarios"))[0];
  return p.senha && p.senha !== "segredo123" && p.senha.length === 64;
}));
t("o gestor vê as nove telas", (await pg.evaluate(() => TELAS.filter((x) => EU.pode(x.k)).length)) === 9);

// ---------- 2. o gestor cadastra a equipe ----------
await pg.evaluate(() => irPara("casa"));
await esperar(400);
for (const [nome, email, papel] of [["Beatriz", "bia@ideiaquevende.com.br", "colaborador"],
                                     ["Marina Alves", "marina@cliente.com", "cliente"]]) {
  await pg.fill("#casaNome", nome);
  await pg.fill("#casaEmail", email);
  await pg.selectOption("#casaPapel", papel);
  await pg.click("text=Acrescentar");
  await esperar(350);
}
const casa = await pg.textContent("#casaPessoas");
t("as três pessoas aparecem em A casa", /Carla/.test(casa) && /Beatriz/.test(casa) && /Marina/.test(casa));
t("quem foi cadastrada ainda não tem senha", /escolhe na 1a entrada/.test(casa));
t("quem tem senha aparece marcada", /senha criada/.test(casa));
await pg.screenshot({ path: `${S}/log-2-casa.png` });

// ---------- 3. sair e entrar como colaborador ----------
await pg.evaluate(() => sair());
await esperar(700);
porta = await pg.textContent("#porta");
t("a porta agora lista as pessoas", /Quem está/.test(porta) && /Beatriz/.test(porta));
t("e marca quem ainda não entrou", /primeira entrada/.test(porta));
await pg.screenshot({ path: `${S}/log-3-lista.png` });

await pg.click("text=Beatriz");
await esperar(400);
t("pede a senha da pessoa escolhida", /sua .*senha|senha/i.test(await pg.textContent("#porta-titulo")));
await pg.fill("#portaSenhaLogin", "bia123456");
await pg.click("text=Entrar");
await esperar(700);
t("colaborador entra escolhendo a própria senha", await pg.evaluate(() => EU.papel === "colaborador"), await pg.evaluate(() => EU.papel));
const doColab = await pg.evaluate(() => TELAS.filter((x) => EU.pode(x.k)).map((x) => x.k));
t("colaborador não vê o dinheiro nem A casa", !doColab.includes("dinheiro") && !doColab.includes("casa"), doColab.join(", "));

// ---------- 4. senha errada ----------
await pg.evaluate(() => sair());
await esperar(600);
await pg.click("text=Beatriz");
await esperar(300);
await pg.fill("#portaSenhaLogin", "chutando");
await pg.click("text=Entrar");
await esperar(500);
t("senha errada é recusada", /Senha errada/.test(await pg.textContent("#portaErro")));
t("e diz como recuperar", /gestor redefine/.test(await pg.textContent("#portaErro")));
t("e não deixa entrar", await pg.evaluate(() => EU.papel === null));

// a senha certa continua valendo
await pg.fill("#portaSenhaLogin", "bia123456");
await pg.click("text=Entrar");
await esperar(600);
t("a senha certa entra na sequência", await pg.evaluate(() => EU.papel === "colaborador"));

// ---------- 5. a sessao sobrevive a recarga ----------
await pg.reload({ waitUntil: "networkidle" });
await esperar(800);
t("recarregar não pede senha de novo", await pg.evaluate(() => EU.papel === "colaborador"), await pg.evaluate(() => EU.papel));

// ---------- 6. cliente ----------
await pg.evaluate(() => sair());
await esperar(600);
await pg.click("text=Marina Alves");
await esperar(300);
await pg.fill("#portaSenhaLogin", "marina123");
await pg.click("text=Entrar");
await esperar(700);
const doCliente = await pg.evaluate(() => TELAS.filter((x) => EU.pode(x.k)).map((x) => x.k));
t("cliente vê uma tela só", doCliente.length === 1 && doCliente[0] === "cliente", doCliente.join(", "));
t("cliente entra sem barra lateral", await pg.evaluate(() => document.getElementById("app").classList.contains("sozinho")));
await pg.screenshot({ path: `${S}/log-4-cliente.png` });

// ---------- 7. gestor zera a senha de alguem ----------
await pg.evaluate(() => sair());
await esperar(600);
await pg.click("text=Carla Caroline");
await esperar(300);
await pg.fill("#portaSenhaLogin", "segredo123");
await pg.click("text=Entrar");
await esperar(700);
await pg.evaluate(() => irPara("casa"));
await esperar(400);
pg.once("dialog", (d) => d.accept("ZERAR"));
await pg.evaluate(() => {
  const bia = pessoas().find((p) => p.nome === "Beatriz");
  casaZerarSenha(bia.id);
});
await esperar(400);
t("zerar senha volta a pessoa para a primeira entrada",
  await pg.evaluate(() => !pessoas().find((p) => p.nome === "Beatriz").senha));
t("e a senha do gestor continua intacta",
  await pg.evaluate(() => !!pessoas().find((p) => p.nome === "Carla Caroline").senha));

t("nenhum erro de JavaScript em todo o caminho", erros.length === 0, erros.slice(0, 3).join(" | "));
console.log(`\n${ok} passaram, ${bad} falharam`);
await nav.close();
process.exit(bad ? 1 : 0);
