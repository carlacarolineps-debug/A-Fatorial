// O ciclo da proposta num navegador de verdade: a mesa cria a partir de
// uma aplicacao, o cliente abre com o codigo noutra aba e assina.
//
// As outras verificacoes olham um lado so. Esta e a unica que junta os
// dois: o que a Carla faz atras da porta e o que o cliente faz sem login
// nenhum acontecem em contextos separados do navegador, como na vida.
//
// Semeia o que precisa: esvazia a casa, cria a gestora pela propria tela
// de primeiro acesso e manda uma aplicacao pelo formulario publico. Assim
// roda em qualquer maquina, e na ordem que for.
import { chromium } from "playwright";
import { spawnSync } from "node:child_process";

const S = process.env.SAIDA || "/tmp";
const B = "http://localhost:8787";

// A casa comeca vazia: o primeiro acesso so responde sem ninguem
// cadastrado. As propostas tambem, senao a lista cresce a cada rodada e
// "ela entra na lista de enviadas" passaria por engano.
spawnSync("npx", ["wrangler", "d1", "execute", "ideia-que-vende", "--local",
  // O formulario publico tem freio proprio, por origem, na tabela dos
  // baldes: cinco aplicacoes por hora do mesmo lugar. Sem esvaziar isso,
  // a segunda rodada seguida desta verificacao semeia zero aplicacao e
  // falha na primeira linha, dizendo 429.
  "--command", "delete from sessoes; delete from pessoas; delete from freio; delete from aceites; " +
    "delete from propostas; delete from formulario_baldes;"],
  { stdio: "ignore" });

// Uma aplicacao de verdade, entrada pela porta da rua: a proposta tem que
// nascer de um lead do funil, e nao de uma linha plantada no banco.
const semeada = await fetch(`${B}/api/resposta`, {
  method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({
    envio: crypto.randomUUID(), versao: 0, plano: "pro", origem: "landing",
    respostas: {
      nome: "Marina Alves",
      email: "marina@exemplo.com.br",
      whatsapp: "+55 11 98888-7777",
      atuacao: "liberal",
      o_que_transformar: "Sou nutricionista ha doze anos e quero montar uma mentoria para outras nutricionistas.",
      estagio: "cobra",
      atende_clientes: "recorrente",
      faturamento: "de_15k_a_50k",
      objetivo: "estruturar",
    },
  }),
});

const nav = await chromium.launch({
  executablePath: process.env.CHROMIUM || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
});
const ctx = await nav.newContext({ viewport: { width: 1440, height: 980 } });
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

t("uma aplicação chega pelo formulário público", semeada.status === 200, `status=${semeada.status}`);

// ---- a gestora cria o proprio acesso e entra
await pg.goto(`${B}/sistema/`, { waitUntil: "networkidle" });
await esperar(900);
await pg.fill("#portaNome", "Carla Caroline");
await pg.fill("#portaEmail", "carla@ideiaquevende.com.br");
await pg.fill("#portaSenha", "umasenhaboa");
await pg.fill("#portaSenha2", "umasenhaboa");
await pg.click("text=Criar meu acesso");
await esperar(2200);
t("a gestora entra no sistema", await pg.evaluate(() => EU.papel === "gestor"), await pg.evaluate(() => EU.papel));
t("e vê as onze telas", (await pg.evaluate(() => TELAS.filter((x) => EU.pode(x.k)).length)) === 11,
  String(await pg.evaluate(() => TELAS.filter((x) => EU.pode(x.k)).length)));
t("Propostas está no menu", await pg.evaluate(() => !!document.getElementById("menu-propostas")));

// ---- da mesa, o botao "Gerar proposta"
await pg.evaluate(() => irPara("ideias"));
await esperar(1800);
const temBotao = await pg.locator("text=Gerar proposta").count();
t("a mesa tem o botão Gerar proposta em cada aplicação", temBotao > 0, `${temBotao} botão(ões)`);
await pg.screenshot({ path: `${S}/prop-1-mesa.png` });

await pg.locator("text=Gerar proposta").first().click();
await esperar(1500);
t("clicar abre a tela de propostas", await pg.evaluate(() => TELA_ATUAL === "propostas"), await pg.evaluate(() => TELA_ATUAL));
t("e ela já vem ligada àquela aplicação", await pg.evaluate(() => PROP_LEAD !== null), String(await pg.evaluate(() => PROP_LEAD)));
const cliente = await pg.inputValue("#propCliente");
t("com o nome de quem contou a ideia já preenchido", cliente.length > 0, cliente);

// ---- as máscaras dos campos que viram contrato
//
// Digitado tecla a tecla, e não com fill: a máscara roda no evento de
// digitação, e preencher de uma vez não provaria que ela funciona para
// quem está digitando.
await pg.click("#propCnpj");
await pg.type("#propCnpj", "11222333000181", { delay: 5 });
t("o CNPJ ganha ponto e barra sozinho", (await pg.inputValue("#propCnpj")) === "11.222.333/0001-81",
  await pg.inputValue("#propCnpj"));

await pg.fill("#propCnpj", "");
await pg.type("#propCnpj", "ab11cd222", { delay: 5 });
t("letra não entra no CNPJ", (await pg.inputValue("#propCnpj")) === "11.222", await pg.inputValue("#propCnpj"));

await pg.fill("#propCnpj", "");
await pg.type("#propCnpj", "112223330001819999", { delay: 4 });
t("e ele para nos 14 dígitos", (await pg.inputValue("#propCnpj")) === "11.222.333/0001-81",
  await pg.inputValue("#propCnpj"));

// Corrigir um dígito no meio não pode jogar o cursor para o fim: sem a
// conta do cursor, a pessoa digita o resto do número de trás para frente.
await pg.evaluate(() => { const e = document.getElementById('propCnpj'); e.focus(); e.setSelectionRange(4, 4); });
await pg.keyboard.press("Backspace");
await pg.type("#propCnpj", "9", { delay: 10 });
t("corrigir no meio mantém o cursor no lugar",
  (await pg.inputValue("#propCnpj")) === "11.922.333/0001-81"
  && (await pg.evaluate(() => document.getElementById('propCnpj').selectionStart)) === 4,
  await pg.inputValue("#propCnpj"));

await pg.click("#propZap");
await pg.type("#propZap", "5511999998888", { delay: 5 });
t("o WhatsApp ganha o código do país e os parênteses",
  (await pg.inputValue("#propZap")) === "+55 (11) 99999-8888", await pg.inputValue("#propZap"));

// ---- os dados do contrato
await pg.fill("#propRs", "Ideia Que Vende LTDA");
await pg.fill("#propEnd", "Av. Paulista, 1000, São Paulo/SP");
await pg.fill("#propDiag", "Tem método na cabeça e nada no papel. Falta virar produto.");

// Um CNPJ com o dígito verificador errado não vira contrato.
await pg.fill("#propCnpj", "");
await pg.type("#propCnpj", "11222333000182", { delay: 4 });
await pg.click("#propCriarBt");
await esperar(800);
t("CNPJ com dígito errado é recusado", /não confere/.test(await pg.textContent("#propErro")),
  (await pg.textContent("#propErro")).slice(0, 40));

await pg.fill("#propCnpj", "");
await pg.type("#propCnpj", "11222333000181", { delay: 4 });
await pg.screenshot({ path: `${S}/prop-2-nova.png`, fullPage: true });

await pg.click("#propCriarBt");
await esperar(2500);
const feito = await pg.textContent("#propFeito");
const codigo = (feito.match(/ID-[A-Z2-9]{5}/) || [])[0];
t("a proposta é criada e o código aparece", !!codigo, String(codigo));
t("e a tela diz o que fazer com ele", /Mande o link e o código/.test(feito));
await pg.screenshot({ path: `${S}/prop-3-codigo.png` });

const naLista = await pg.textContent("#propLista");
t("ela entra na lista de enviadas", naLista.includes(codigo));
t("como ainda não aberta", /ainda não abriu/.test(naLista));

// ---- o cliente, noutra aba, sem login nenhum
const cli = await (await nav.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
const errosCli = [];
cli.on("pageerror", (e) => errosCli.push(e.message));
await cli.goto(`${B}/proposta/`, { waitUntil: "networkidle" });
await esperar(700);
t("o cliente vê a tela de código, sem login", await cli.isVisible("#g-code"));
await cli.screenshot({ path: `${S}/prop-4-codigo-cliente.png` });

await cli.fill("#g-code", codigo);
await cli.click("#g-go");
await esperar(1500);
t("o código abre a proposta", await cli.isVisible("#p-opts"));
const titulo = await cli.textContent("#p-title");
t("com o nome do cliente no título", titulo.length > 20, titulo);
const planos = await cli.locator(".opt").count();
t("e os planos que a mesa marcou", planos >= 1, `${planos} planos`);
await cli.screenshot({ path: `${S}/prop-5-proposta.png`, fullPage: true });

// O contrato ja esta desenhado antes de escolher: quem le quer saber o que
// esta assinando antes de decidir o quanto vai pagar.
const contratoAntes = await cli.textContent("#p-contract");
t("o contrato aparece antes de escolher, com o lugar do plano em branco",
  /\[o plano que você escolher acima\]/.test(contratoAntes));

await cli.locator(".opt").first().click();
await esperar(500);
const contratoDepois = await cli.textContent("#p-contract");
t("escolher o plano escreve o nome dele dentro do contrato",
  !/\[o plano que você escolher acima\]/.test(contratoDepois) && contratoDepois.includes("R$"));

await cli.fill("#a-nome", "Marina Alves Souza");
// O CPF e o WhatsApp de quem assina, digitados tecla a tecla.
await cli.click("#a-doc");
await cli.type("#a-doc", "12345678909", { delay: 5 });
t("o CPF de quem assina ganha ponto e traço", (await cli.inputValue("#a-doc")) === "123.456.789-09",
  await cli.inputValue("#a-doc"));
await cli.fill("#a-doc", "");
await cli.type("#a-doc", "11222333000181", { delay: 4 });
t("e vira CNPJ sozinho quando passa de 11 dígitos",
  (await cli.inputValue("#a-doc")) === "11.222.333/0001-81", await cli.inputValue("#a-doc"));

await cli.click("#a-tel");
await cli.type("#a-tel", "11988887777", { delay: 5 });
t("o WhatsApp de quem assina ganha parênteses", (await cli.inputValue("#a-tel")) === "(11) 98888-7777",
  await cli.inputValue("#a-tel"));

// Documento que não existe não vira assinatura.
await cli.fill("#a-doc", "");
await cli.type("#a-doc", "12345678900", { delay: 4 });
await cli.fill("#a-nome", "Marina Alves Souza");
await cli.fill("#a-mail", "marina@exemplo.com.br");
await cli.check("#a-li");
await cli.click("#a-btn");
await esperar(700);
t("CPF com dígito errado é recusado antes de assinar",
  /não confere/.test(await cli.textContent("#a-err")), (await cli.textContent("#a-err")).slice(0, 40));
await cli.uncheck("#a-li");

await cli.fill("#a-doc", "");
await cli.type("#a-doc", "12345678909", { delay: 4 });
await cli.fill("#a-mail", "marina@exemplo.com.br");
await cli.fill("#a-end", "Rua Exemplo, 100, São Paulo/SP");
await esperar(400);
const contratoComNome = await cli.textContent("#p-contract");
t("e o nome de quem assina entra no contrato enquanto ela digita",
  contratoComNome.includes("Marina Alves Souza"));

await cli.click("#a-btn");
await esperar(600);
t("sem marcar a caixa, não assina", /Marque a caixa/.test(await cli.textContent("#a-err")));

await cli.check("#a-li");
await cli.click("#a-btn");
await esperar(2500);
t("com a caixa marcada, assina", await cli.isVisible("#a-receipt"));
t("e o comprovante traz o código de verificação",
  /^[0-9a-fA-F]{12,}$/.test((await cli.textContent("#r-hash")).trim()), await cli.textContent("#r-hash"));
t("e o botão de confirmar no WhatsApp",
  (await cli.getAttribute("#r-zap", "href")).startsWith("https://wa.me/5511999998888"));
await cli.screenshot({ path: `${S}/prop-6-assinado.png`, fullPage: true });

// ---- de volta na mesa: os dois efeitos automaticos
await pg.evaluate(() => propCarregar());
await esperar(1800);
const listaDepois = await pg.textContent("#propLista");
t("a mesa mostra a proposta como aceita", /aceita/.test(listaDepois));
t("com o plano e o valor que o cliente escolheu", /R\$/.test(listaDepois),
  listaDepois.replace(/\s+/g, " ").slice(0, 120));

// A mesa carrega a lista uma vez so. Quem assinou mexeu no andamento de
// outro computador, entao voltar para a mesa tem que buscar de novo
// sozinho, senao ela mostraria o andamento de antes.
await pg.evaluate(() => irPara("ideias"));
await esperar(2500);
// O rotulo na tela e "Virou projeto"; o que se confere aqui e o VALOR que
// o servidor devolveu, e nao o texto que o desenho escolheu para ele.
const oLead = await pg.evaluate(() => (IDEIAS.itens.find((l) => l.id === PROP_LEAD) || {}).status);
t("e a aplicação virou 'ganho' na mesa sozinha", oLead === "ganho", String(oLead));
await pg.screenshot({ path: `${S}/prop-7-ganho.png` });

t("nenhum erro de JavaScript no sistema", erros.length === 0, erros.slice(0, 3).join(" | "));
t("nenhum erro de JavaScript na página do cliente", errosCli.length === 0, errosCli.slice(0, 3).join(" | "));

console.log(`\n${ok} passaram, ${bad} falharam`);
await nav.close();
process.exit(bad ? 1 : 0);
