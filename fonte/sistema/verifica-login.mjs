// A porta, num navegador de verdade: e-mail e senha, do primeiro dia ate
// tres pessoas com papeis diferentes entrando cada uma no seu.
//
// Ate 01/09 esta verificacao mexia em localStorage para fingir gente
// cadastrada, porque a lista morava la. Agora a lista mora no servidor, e
// o teste passou a fazer o que a Carla faz: preencher os campos e clicar.
// Ficou mais lento e vale mais.
import { chromium } from "playwright";
import { spawnSync } from "node:child_process";

const S = process.env.SAIDA || "/tmp";
const B = "http://localhost:8787";

// A casa comeca vazia: o primeiro acesso so responde sem ninguem
// cadastrado, e sem isso esta verificacao so passaria uma vez por maquina.
spawnSync("npx", ["wrangler", "d1", "execute", "ideia-que-vende", "--local",
  "--command", "delete from sessoes; delete from pessoas; delete from freio;"],
  { stdio: "ignore" });

// A colaboradora e o cliente nascem com a marca de trocar a senha, e a
// sessao de quem nao trocou so serve para trocar. Quem semeia gente aqui
// tem que trocar a senha de cada uma antes de usar a conta.

const nav = await chromium.launch({
  executablePath: process.env.CHROMIUM || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
});
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
const esperar = (ms) => pg.waitForTimeout(ms);

const abrir = async () => { await pg.goto(`${B}/sistema/`, { waitUntil: "networkidle" }); await esperar(500); };

// A senha sorteada por "A casa" aparece uma vez so, no aviso. E de la que
// o teste a pega, exatamente como a Carla faria para passar adiante.
const senhaDoAviso = async () => {
  const txt = (await pg.textContent("#casaAvisoAccess")) || "";
  const achou = txt.match(/[a-z]{4}-[0-9]{3}-[a-z]{4}/);
  return achou ? achou[0] : null;
};

/* ---------- 1. primeiro dia: ninguem cadastrado ---------- */
await abrir();
let porta = await pg.textContent("#porta");
t("primeiro dia pede para criar o gestor", /Este sistema é/.test(porta));
t("e explica que o resto da equipe vem depois", /cadastra o resto da equipe/.test(porta));
t("e diz que a senha fica no servidor, embaralhada", /embaralhada/.test(porta));
await pg.screenshot({ path: `${S}/log-1-primeiro.png` });

await pg.fill("#portaNome", "Carla Caroline");
await pg.fill("#portaEmail", "carla@ideiaquevende.com.br");
await pg.fill("#portaSenha", "curta");
await pg.fill("#portaSenha2", "curta");
await pg.click("text=Criar meu acesso");
await esperar(400);
t("senha curta é recusada", /8 caracteres/.test(await pg.textContent("#portaErro")));

await pg.fill("#portaSenha", "umasenhaboa");
await pg.fill("#portaSenha2", "outrasenha1");
await pg.click("text=Criar meu acesso");
await esperar(400);
t("senhas diferentes são recusadas", /não são iguais/.test(await pg.textContent("#portaErro")));

await pg.fill("#portaSenha", "umasenhaboa");
await pg.fill("#portaSenha2", "umasenhaboa");
await pg.click("text=Criar meu acesso");
await esperar(1200);
t("gestora entra depois de criar", await pg.evaluate(() => EU.papel === "gestor"), await pg.evaluate(() => EU.papel));
t("a gestora vê as dez telas", (await pg.evaluate(() => TELAS.filter((x) => EU.pode(x.k)).length)) === 10);
t("a senha NÃO fica guardada no navegador", await pg.evaluate(() => {
  const tudo = JSON.stringify(localStorage);
  return !/umasenhaboa/.test(tudo);
}));

/* ---------- 2. a gestora cadastra a equipe, em A casa ---------- */
await pg.evaluate(() => irPara("casa"));
await esperar(900);

await pg.fill("#casaNome", "Beatriz");
await pg.fill("#casaEmail", "bia@ideiaquevende.com.br");
await pg.selectOption("#casaPapel", "colaborador");
await pg.click("text=Acrescentar");
await esperar(1200);
const senhaDaBia = await senhaDoAviso();
t("cadastrar sorteia uma senha e mostra uma vez só", !!senhaDaBia, String(senhaDaBia));

await pg.fill("#casaNome", "Marina Alves");
await pg.fill("#casaEmail", "marina@cliente.com");
await pg.selectOption("#casaPapel", "cliente");
await pg.click("text=Acrescentar");
await esperar(1200);
const senhaDaMarina = await senhaDoAviso();
t("e a segunda pessoa recebe uma senha diferente", !!senhaDaMarina && senhaDaMarina !== senhaDaBia, String(senhaDaMarina));

const casa = await pg.textContent("#casaPessoas");
t("as três pessoas aparecem em A casa", /Carla/.test(casa) && /Beatriz/.test(casa) && /Marina/.test(casa));
t("quem foi cadastrada aparece como quem ainda vai trocar a senha", /troca na 1a entrada/.test(casa));
t("e a gestora aparece com senha própria", /senha própria/.test(casa));
await pg.screenshot({ path: `${S}/log-2-casa.png` });

/* ---------- 3. a colaboradora entra e troca a senha ---------- */
await pg.evaluate(() => sair());
await esperar(1500);
porta = await pg.textContent("#porta");
t("depois de sair, a porta pede e-mail e senha", /Bem-vinda de/.test(porta) && /E-mail/.test(porta));
t("e não lista quem tem acesso", !/Beatriz/.test(porta) && !/Carla/.test(porta));
await pg.screenshot({ path: `${S}/log-3-entrar.png` });

await pg.fill("#portaEmail", "bia@ideiaquevende.com.br");
await pg.fill("#portaSenha", "chuteichutei");
await pg.click("#portaBotao");
await esperar(1500);
t("senha errada é recusada", /não conferem/i.test(await pg.textContent("#portaErro")));
t("e não deixa entrar", await pg.evaluate(() => EU.papel === null));
t("e o campo da senha é limpo", (await pg.inputValue("#portaSenha")) === "");

await pg.fill("#portaSenha", senhaDaBia);
await pg.click("#portaBotao");
await esperar(1500);
porta = await pg.textContent("#porta");
t("com a senha recebida, a porta pede uma senha própria", /Escolha a sua/.test(porta));
t("e ela ainda não entrou no sistema", await pg.evaluate(() => EU.papel === null));

await pg.fill("#portaAtual", senhaDaBia);
await pg.fill("#portaNova", "senhadabia1");
await pg.fill("#portaNova2", "senhadabia1");
await pg.click("#portaBotao");
await esperar(2000);
t("depois de trocar, a colaboradora entra", await pg.evaluate(() => EU.papel === "colaborador"), await pg.evaluate(() => EU.papel));
const doColab = await pg.evaluate(() => TELAS.filter((x) => EU.pode(x.k)).map((x) => x.k));
t("colaborador não vê o dinheiro nem A casa", !doColab.includes("dinheiro") && !doColab.includes("casa"), doColab.join(", "));

await pg.reload({ waitUntil: "networkidle" });
await esperar(1200);
t("recarregar não pede senha de novo", await pg.evaluate(() => EU.papel === "colaborador"), await pg.evaluate(() => EU.papel));

/* ---------- 4. a senha antiga morreu ---------- */
await pg.evaluate(() => sair());
await esperar(1500);
await pg.fill("#portaEmail", "bia@ideiaquevende.com.br");
await pg.fill("#portaSenha", senhaDaBia);
await pg.click("#portaBotao");
await esperar(1500);
t("a senha que a gestora sorteou não serve mais", await pg.evaluate(() => EU.papel === null));

await pg.fill("#portaSenha", "senhadabia1");
await pg.click("#portaBotao");
await esperar(1500);
t("a senha escolhida por ela serve", await pg.evaluate(() => EU.papel === "colaborador"));

/* ---------- 5. o cliente ---------- */
await pg.evaluate(() => sair());
await esperar(1500);
await pg.fill("#portaEmail", "marina@cliente.com");
await pg.fill("#portaSenha", senhaDaMarina);
await pg.click("#portaBotao");
await esperar(1500);
await pg.fill("#portaAtual", senhaDaMarina);
await pg.fill("#portaNova", "senhadamarina1");
await pg.fill("#portaNova2", "senhadamarina1");
await pg.click("#portaBotao");
await esperar(2000);
const doCliente = await pg.evaluate(() => TELAS.filter((x) => EU.pode(x.k)).map((x) => x.k));
t("cliente vê uma tela só", doCliente.length === 1 && doCliente[0] === "cliente", doCliente.join(", "));
t("cliente entra sem barra lateral", await pg.evaluate(() => document.getElementById("app").classList.contains("sozinho")));
await pg.screenshot({ path: `${S}/log-4-cliente.png` });

// O papel filtra DADO, e nao so tela: a mesa esta fechada para o cliente
// mesmo com o endereco na mao.
const paraOCliente = await pg.evaluate(async () => {
  const r = await fetch("/leads", { headers: { accept: "application/json" } });
  return r.status;
});
t("e a mesa continua fechada para ele mesmo pelo endereço", paraOCliente === 403, `status=${paraOCliente}`);

/* ---------- 6. a gestora desliga alguem, e cai na hora ---------- */
await pg.evaluate(() => sair());
await esperar(1500);
await pg.fill("#portaEmail", "carla@ideiaquevende.com.br");
await pg.fill("#portaSenha", "umasenhaboa");
await pg.click("#portaBotao");
await esperar(1500);
await pg.evaluate(() => irPara("casa"));
await esperar(1200);

await pg.click("text=Desligar");
await esperar(400);
t("desligar pergunta numa caixa da propria casa, sem prompt do navegador",
  (await pg.locator(".dialogo").count()) === 1);
t("e o foco ja esta no botao que confirma",
  await pg.evaluate(() => document.activeElement && document.activeElement.id === "dlg-sim"));
await pg.keyboard.press("Escape");
await esperar(300);
t("Escape fecha sem desligar ninguem", (await pg.locator(".dialogo").count()) === 0);

await pg.click("text=Desligar");
await esperar(400);
await pg.click("#dlg-sim");
await esperar(1500);
t("desligar marca a pessoa na lista", /desligada/.test(await pg.textContent("#casaPessoas")));

/* ---------- 7. a gestora sorteia uma senha nova ---------- */
await pg.click("text=Nova senha");
await esperar(400);
await pg.click("#dlg-sim");
await esperar(1500);
const senhaNova = await senhaDoAviso();
t("nova senha sorteia outra e mostra uma vez só", !!senhaNova && senhaNova !== senhaDaBia, String(senhaNova));

/* ---------- 8. a casa nunca fica sem gestora ---------- */
const semGestora = await pg.evaluate(async () => {
  const eu = EU.id;
  const r = await fetch("/pessoas", {
    method: "PATCH",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ id: eu, papel: "colaborador" }),
  });
  return r.status;
});
t("a única gestora não consegue se rebaixar", semGestora === 409, `status=${semGestora}`);

t("nenhum erro de JavaScript em todo o caminho", erros.length === 0, erros.slice(0, 3).join(" | "));
console.log(`\n${ok} passaram, ${bad} falharam`);
await nav.close();
process.exit(bad ? 1 : 0);
