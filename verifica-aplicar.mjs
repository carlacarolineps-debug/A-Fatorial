// Abre a página de aplicação num navegador de verdade e responde o
// formulário do começo ao fim, como uma pessoa responderia: no
// computador e depois num aparelho de 390 pontos de largura.
//
// Com um servidor de pé na porta 8787:
//
//     node verifica-aplicar.mjs
//
// Ou apontando para outro lugar:
//
//     BASE=http://localhost:8789/aplicar/ node verifica-aplicar.mjs
//
// As duas rotas que gravam são respondidas aqui dentro, e não pelo
// servidor: o que está sendo conferido é a página, e as rotas têm a
// conferência delas em teste-aplicar.mjs. Assim esta verificação roda
// mesmo antes de as rotas estarem ligadas, e nada do que ela faz vira
// linha no banco. A definição das perguntas é a do servidor quando ele
// responde, e a cópia embutida na página quando ele não responde, que é
// o mesmo socorro que a pessoa receberia.
import path from "node:path";
import { pathToFileURL } from "node:url";

// O Playwright mora no Node do sistema, e não nas dependências deste
// repositório: aqui não existe npm no front. Quando o nome sozinho não
// resolve, a segunda tentativa é o lugar onde ele foi instalado.
let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  const nosistema = path.join(
    path.dirname(path.dirname(process.execPath)), "lib", "node_modules", "playwright", "index.js",
  );
  try {
    const modulo = await import(pathToFileURL(nosistema).href);
    chromium = modulo.chromium ?? modulo.default?.chromium;
  } catch {
    console.error("não achei o Playwright. Instale com: npm install -g playwright");
    process.exit(1);
  }
}

const S = process.env.SAIDA || "/tmp";
const B = process.env.BASE || "http://localhost:8787/aplicar/";

let ok = 0, bad = 0;
const t = (nome, cond, extra = "") => {
  (cond ? ok++ : bad++);
  console.log(`${cond ? "PASS" : "FALHOU"}  ${nome}${extra ? "   " + extra : ""}`);
};

const erros = [];
const ouvir = (pg, quem) => {
  pg.on("pageerror", (e) => erros.push(`EXCECAO ${quem}: ${e.message}`));
  pg.on("console", (m) => {
    if (m.type() === "error" && !/Failed to load resource|ERR_FAILED|ERR_ABORTED/.test(m.text())) {
      erros.push(`CONSOLE ${quem}: ${m.text()}`);
    }
  });
};

// Esperar por uma condição, e não por um relógio: assim a verificação não
// depende da duração da animação e não vira falha de vez em quando.
const ate = (pg, condicao, valor = null, prazo = 8000) =>
  pg.waitForFunction(condicao, valor, { timeout: prazo }).then(() => true).catch(() => false);

// Enquanto a troca de telas corre, a página não aceita comando nenhum, e
// a tela que sai ainda está no palco junto com a que entra. A troca só
// terminou quando sobrou uma tela e ela não está mais entrando. Esperar
// por isso é o que faz cada passo daqui acontecer na tela certa, em vez
// de bater numa página que ainda está trocando.
const assentou = (pg) => ate(pg, () => {
  const telas = document.querySelectorAll("#palco .tela");
  return telas.length === 1 && !telas[0].dataset.estado;
});

const naPergunta = async (pg, numero, prazo = 8000) =>
  (await ate(pg, (n) => document.getElementById("contagemNumero").textContent.trim() === n, numero, prazo)) &&
  (await assentou(pg));

const naTela = (pg, classe) =>
  pg.locator(classe).waitFor({ timeout: 15000 }).then(() => assentou(pg)).catch(() => false);

const contagem = (pg) => pg.locator("#contagemNumero").innerText();
const andarDaBarra = (pg) =>
  pg.$eval("#progresso", (el) => Number(el.style.getPropertyValue("--p") || 0));

/* A definição vem do servidor quando ele responde. Quando não responde, a
   página abre com a cópia que o build embutiu nela, e é isso que a pessoa
   veria: erro que ela não precisa resolver não vira tela de erro. */
let doServidor = null;
try {
  const r = await fetch(new URL("/api/formulario", B));
  const j = await r.json();
  if (j?.ok && j.formulario?.perguntas?.length) doServidor = JSON.stringify(j);
} catch {
  // sem servidor, a página se vira com a cópia embutida
}

const enviadas = [];
async function preparar(pg) {
  await pg.route("**/api/formulario", (rota) => (doServidor
    ? rota.fulfill({ status: 200, contentType: "application/json", body: doServidor })
    : rota.abort()));
  await pg.route("**/api/evento", (rota) => rota.fulfill({
    status: 200, contentType: "application/json", body: '{"ok":true,"gravados":1}',
  }));
  await pg.route("**/api/resposta", (rota) => {
    enviadas.push(JSON.parse(rota.request().postData() || "{}"));
    return rota.fulfill({
      status: 200, contentType: "application/json",
      body: '{"ok":true,"lead_id":9,"recebido_em":"2026-08-31 10:00:00"}',
    });
  });
}

// A página desenha na hora com a cópia embutida e refaz a tela quando o
// servidor responde. Esperar a rede sossegar antes de tocar em qualquer
// coisa evita clicar numa tela que está para ser refeita.
async function abrir(pg) {
  await preparar(pg);
  await pg.goto(B, { waitUntil: "networkidle" });
  await assentou(pg);
}

// A capa é refeita no lugar quando a definição chega do servidor, e por
// um instante depois disso a página ainda não aceita comando. Quem clica
// bem nesse instante clica de novo, e a verificação faz o mesmo: o que
// está sendo medido é o formulário, não a rede.
async function comecar(pg) {
  for (let tentativa = 0; tentativa < 4; tentativa += 1) {
    await pg.locator(".capa .comecar").click();
    if (await naPergunta(pg, "01 / 09", 2500)) return true;
  }
  return false;
}

const nav = await chromium.launch({
  executablePath: process.env.CHROMIUM || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
});

/* =====================================================================
   No computador
   ===================================================================== */
const ctx = await nav.newContext({ viewport: { width: 1280, height: 900 } });
const pg = await ctx.newPage();
ouvir(pg, "computador");
await abrir(pg);

t("a página abre, com servidor ou sem ele", await pg.locator(".capa").isVisible(),
  doServidor ? "com as perguntas do servidor" : "com a cópia embutida na página");
t("a capa não mostra contagem de pergunta nenhuma", await pg.locator("#contagem").isHidden());
t("a barra de progresso começa no zero", (await andarDaBarra(pg)) === 0);
await pg.screenshot({ path: `${S}/aplicar-1-capa.png` });

// 1. A primeira pergunta aparece e recebe o foco
t("a primeira pergunta aparece", await comecar(pg),
  await contagem(pg).catch(() => "(sem contagem)"));
t("e ela é a pergunta do nome",
  (await pg.locator(".pergunta").first().innerText()).includes("Nome completo"));
t("o foco cai no campo, e dá para responder sem tocar no mouse",
  await pg.evaluate(() => document.activeElement?.classList.contains("campo") === true));

// 2. Sem resposta, não avança, e o recado diz o que fazer
await pg.keyboard.press("Enter");
await pg.waitForTimeout(400);
const recado = (await pg.locator(".recado").first().innerText()).trim();
t("com o campo obrigatório vazio, o Enter não avança", (await contagem(pg)) === "01 / 09");
t("e o recado diz o que fazer, com verbo na frente",
  /^(Escreva|Escolha|Confira|Conte)/.test(recado), JSON.stringify(recado));
t("o recado não mostra código nem nome de campo",
  recado.length > 0 && !/[<>{}]|null|undefined/i.test(recado));
t("e o campo fica marcado para quem ouve a tela",
  (await pg.locator(".campo").first().getAttribute("aria-invalid")) === "true");
await pg.screenshot({ path: `${S}/aplicar-2-recado.png` });

// 3. Enter avança
await pg.locator(".campo").first().fill("Marina Alves");
await pg.keyboard.press("Enter");
t("com a resposta escrita, o Enter avança", await naPergunta(pg, "02 / 09"));
const barraNaDois = await andarDaBarra(pg);
t("a barra de progresso anda junto", barraNaDois > 0.11 && barraNaDois < 0.3, String(barraNaDois));

// 4. E-mail torto é recusado, em português
await pg.locator(".campo").first().fill("marina.exemplo.com.br");
await pg.keyboard.press("Enter");
await pg.waitForTimeout(400);
const recadoEmail = (await pg.locator(".recado").first().innerText()).trim();
t("e-mail sem arroba não passa", (await contagem(pg)) === "02 / 09");
t("e o recado é uma frase em português, sem código",
  /^Confira o e-mail/.test(recadoEmail) && !/[<>{}]/.test(recadoEmail),
  JSON.stringify(recadoEmail));
await pg.locator(".campo").first().fill("marina@exemplo.com.br");
await pg.keyboard.press("Enter");
t("com o e-mail certo, segue", await naPergunta(pg, "03 / 09"));
const barraNaTres = await andarDaBarra(pg);
t("e a barra de progresso anda para a frente junto", barraNaTres > barraNaDois,
  `${barraNaTres} contra ${barraNaDois}`);

// 5. Voltar mantém o que já foi respondido
await pg.locator("#setaVoltar").click();
t("voltar leva para a pergunta anterior", await naPergunta(pg, "02 / 09"));
t("e a resposta continua lá",
  (await pg.locator(".campo").first().inputValue()) === "marina@exemplo.com.br",
  await pg.locator(".campo").first().inputValue());
const barraAoVoltar = await andarDaBarra(pg);
t("a barra volta junto, em vez de ficar adiantada", barraAoVoltar < barraNaTres,
  `${barraAoVoltar} contra ${barraNaTres}`);
await pg.locator(".campo").first().press("Enter");
await naPergunta(pg, "03 / 09");

// 6. Telefone
await pg.locator(".campo").first().click();
await pg.keyboard.type("11988887777");
t("o número brasileiro ganha máscara enquanto se digita",
  (await pg.locator(".campo").first().inputValue()) === "(11) 98888-7777",
  await pg.locator(".campo").first().inputValue());
await pg.keyboard.press("Enter");
t("e segue para a pergunta de escolha", await naPergunta(pg, "04 / 09"));

// 7. A letra escolhe
const letras = await pg.locator(".opcao .letra").allInnerTexts();
t("as letras seguem a posição da opção, e não o texto", letras.join("") === "ABCDEF", letras.join(","));
const segundaOpcao = (await pg.locator(".opcao .rotulo").nth(1).innerText()).trim();
await pg.screenshot({ path: `${S}/aplicar-3-escolha.png` });
await pg.keyboard.press("b");
t("a letra B escolhe a segunda opção e a tela passa sozinha", await naPergunta(pg, "05 / 09"));
const rascunho = await pg.evaluate(() => JSON.parse(localStorage.getItem("iqv_aplicar_rascunho") || "{}"));
t("e o que ficou guardado é a segunda opção mesmo",
  rascunho?.respostas?.atuacao === "liberal", JSON.stringify(rascunho?.respostas?.atuacao));

// 8. Texto longo: Enter quebra a linha, Ctrl com Enter avança
await pg.locator(".campo-longo").fill(
  "Sou nutricionista ha doze anos e quero montar uma mentoria para outras nutricionistas.");
await pg.keyboard.press("Enter");
await pg.waitForTimeout(300);
t("no texto longo o Enter não avança, ele quebra a linha", (await contagem(pg)) === "05 / 09");
await pg.keyboard.press("Control+Enter");
t("e Ctrl com Enter avança", await naPergunta(pg, "06 / 09"));

// 9. As quatro escolhas que faltam, pela letra
for (const [tecla, numero] of [["c", "07 / 09"], ["d", "08 / 09"], ["b", "09 / 09"]]) {
  await pg.keyboard.press(tecla);
  await naPergunta(pg, numero);
}
await pg.keyboard.press("a");

// 10. Conferir e enviar
t("depois da última pergunta vem a tela de conferir", await naTela(pg, ".revisao-tela"));
t("com as nove respostas na frente da pessoa",
  (await pg.locator(".revisao-item").count()) === 9,
  String(await pg.locator(".revisao-item").count()));
const conferencia = await pg.locator(".revisao-lista").innerText();
t("a escolha aparece pelo texto que ela leu, não pela chave",
  conferencia.includes(segundaOpcao), segundaOpcao);
t("e o telefone aparece no formato que a mesa espera",
  conferencia.includes("+55 11 98888-7777"));
t("a barra chega no fim quando não falta mais nada", (await andarDaBarra(pg)) === 1);
await pg.screenshot({ path: `${S}/aplicar-4-conferir.png`, fullPage: true });

await pg.locator(".revisao-tela .js-avancar").click();
t("preencher tudo e enviar chega na tela de fim", await naTela(pg, ".fim"));
t("e a tela de fim diz o que acontece agora",
  (await pg.locator(".fim").innerText()).trim().length > 60);
await pg.screenshot({ path: `${S}/aplicar-5-fim.png` });

const enviada = enviadas.find((e) => !e.parcial);
t("a aplicação viaja com a chave estável de cada pergunta",
  !!enviada && Object.keys(enviada.respostas ?? {}).length === 9,
  enviada ? Object.keys(enviada.respostas).join(",") : "nenhuma");
t("a escolha viaja como chave de opção",
  enviada?.respostas?.atuacao === "liberal" && enviada?.respostas?.faturamento === "de_15k_a_50k");
t("com identificação no formato que a rota confere",
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(enviada?.envio ?? ""));
t("a armadilha do robô vai vazia, porque quem responde é gente",
  enviada?.sobre_voce_extra === "");
t("o rascunho só some depois de o envio ser aceito",
  await pg.evaluate(() => localStorage.getItem("iqv_aplicar_rascunho") === null));
t("nenhuma chave do outro negócio foi escrita no navegador",
  await pg.evaluate(() => Object.keys(localStorage).every((k) => k.indexOf("af_") !== 0)),
  await pg.evaluate(() => Object.keys(localStorage).join(",")));

// 11. Travessão em lugar nenhum. A página carrega dentro dela os textos
// de todas as telas, então conferir o documento inteiro cobre também o
// que ainda não apareceu. O caractere procurado é escrito pelo código
// dele, e não de letra, para nem este arquivo ter um travessão dentro.
const travessoes = ((await pg.content()).match(/\u2014/g) || []).length;
t("não existe travessão em texto nenhum da página", travessoes === 0, `${travessoes} encontrado(s)`);

t("nenhum erro de JavaScript no caminho inteiro", erros.length === 0, erros.slice(0, 3).join(" | "));

/* =====================================================================
   No aparelho de 390 pontos, que é onde a maioria vai responder
   ===================================================================== */
const bolso = await nav.newContext({
  viewport: { width: 390, height: 780 },
  hasTouch: true, isMobile: true, deviceScaleFactor: 2,
});
const cel = await bolso.newPage();
ouvir(cel, "celular");
await abrir(cel);

t("no aparelho pequeno a página também abre", await cel.locator(".capa").isVisible());
t("e nada escapa para os lados",
  await cel.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  await cel.evaluate(() => `${document.documentElement.scrollWidth} de ${window.innerWidth}`));

t("a primeira pergunta aparece", await comecar(cel));
t("o botão de seguir vive na barra de baixo, onde o polegar alcança",
  await cel.locator("#barra").isVisible());
t("e sai do meio da tela, para o teclado não cobrir a pergunta",
  await cel.locator(".tela .avancar").isHidden());
await cel.screenshot({ path: `${S}/aplicar-6-celular.png` });

await cel.locator("#barraAcao").click();
await cel.waitForTimeout(400);
t("com o campo vazio, o botão da barra também não avança, e explica",
  (await contagem(cel)) === "01 / 09" &&
  (await cel.locator(".recado").first().innerText()).trim().length > 10,
  (await cel.locator(".recado").first().innerText()).trim());

await cel.locator(".campo").first().fill("Marina Alves");
await cel.locator("#barraAcao").click();
t("respondendo, ela segue", await naPergunta(cel, "02 / 09"));

await cel.locator(".campo").first().fill("marina@exemplo.com.br");
await cel.locator("#barraAcao").click();
await naPergunta(cel, "03 / 09");
await cel.locator(".campo").first().fill("(11) 98888-7777");
await cel.locator("#barraAcao").click();
await naPergunta(cel, "04 / 09");

// No toque, a opção se escolhe com o dedo, no cartão inteiro
await cel.locator(".opcao").nth(1).click();
t("no toque, a opção é escolhida no cartão e a tela passa sozinha",
  await naPergunta(cel, "05 / 09"));

await cel.locator(".campo-longo").fill(
  "Sou nutricionista ha doze anos e quero montar uma mentoria para outras nutricionistas.");
await cel.locator("#barraAcao").click();
await naPergunta(cel, "06 / 09");
for (const [posicao, numero] of [[2, "07 / 09"], [3, "08 / 09"], [1, "09 / 09"], [0, null]]) {
  await cel.locator(".opcao").nth(posicao).click();
  if (numero) await naPergunta(cel, numero);
}

t("a tela de conferir também aparece no aparelho pequeno", await naTela(cel, ".revisao-tela"));
t("e a lista de respostas não escapa para os lados",
  await cel.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  await cel.evaluate(() => `${document.documentElement.scrollWidth} de ${window.innerWidth}`));
await cel.screenshot({ path: `${S}/aplicar-7-celular-conferir.png`, fullPage: true });

// No aparelho pequeno o botão de enviar também vive na barra de baixo.
await cel.locator("#barraAcao").click();
t("e a mesma aplicação chega ao fim no aparelho pequeno", await naTela(cel, ".fim"));
await cel.screenshot({ path: `${S}/aplicar-8-celular-fim.png` });

t("no aparelho pequeno também não existe travessão",
  ((await cel.content()).match(/\u2014/g) || []).length === 0);
t("nenhum erro de JavaScript nas duas larguras", erros.length === 0, erros.slice(0, 3).join(" | "));

console.log(`\n${ok} passaram, ${bad} falharam`);
await nav.close();
process.exit(bad ? 1 : 0);

// A linha do package.json, em "scripts":
//     "verifica-aplicar": "node verifica-aplicar.mjs"
