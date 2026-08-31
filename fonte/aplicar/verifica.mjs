// Abre a pagina de aplicacao num navegador de verdade e responde o
// formulario inteiro, do comeco ao fim, como uma pessoa responderia.
//
// As tres rotas de aplicacao sao respondidas aqui dentro, e nao pelo
// servidor: o que esta sendo conferido e a pagina, e as rotas ja tem a
// conferencia delas em teste.mjs. Assim isto roda com o wrangler de pe,
// com um servidor de arquivos qualquer, e antes de as rotas existirem.
//
// Com um "npx wrangler dev" na porta 8787:
//
//     node fonte/aplicar/verifica.mjs
//
// Ou apontando para outro lugar:
//
//     BASE=http://localhost:8899/aplicar/ node fonte/aplicar/verifica.mjs
import { chromium } from "playwright";
const S = process.env.SAIDA || "/tmp";
const B = process.env.BASE || "http://localhost:8787/aplicar/";

const nav = await chromium.launch({ executablePath: process.env.CHROMIUM || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });

let ok = 0, bad = 0;
const t = (nome, cond, extra = "") => {
  (cond ? ok++ : bad++);
  console.log(`${cond ? "PASS" : "FALHOU"}  ${nome}${extra ? "   " + extra : ""}`);
};

const erros = [];
function ouvir(pg, quem) {
  pg.on("pageerror", (e) => erros.push(`EXCECAO ${quem}: ${e.message}`));
  pg.on("console", (m) => {
    if (m.type() === "error" && !/Failed to load resource|ERR_FAILED/.test(m.text())) {
      erros.push(`CONSOLE ${quem}: ${m.text()}`);
    }
  });
}

// A definicao vem do socorro embutido: a rota e recusada de proposito, e
// e assim que se confere que a pagina abre sem o servidor.
let recebidos = [];
let modo = "ok";
async function preparar(pg) {
  await pg.route("**/api/formulario", (r) => r.abort());
  await pg.route("**/api/evento", (r) =>
    r.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true,"gravados":1}' }));
  await pg.route("**/api/resposta", (r) => {
    recebidos.push(JSON.parse(r.request().postData() || "{}"));
    if (modo === "rede") return r.abort();
    return r.fulfill({
      status: 200, contentType: "application/json",
      body: '{"ok":true,"lead_id":7,"recebido_em":"2026-08-31 10:00:00"}',
    });
  });
}

const ctx = await nav.newContext({ viewport: { width: 1280, height: 900 } });
const pg = await ctx.newPage();
ouvir(pg, "pagina");
await preparar(pg);
await pg.goto(B, { waitUntil: "networkidle" });
await pg.waitForTimeout(700);

// 1. A capa
t("a capa abre mesmo sem o servidor responder", await pg.locator(".capa").isVisible());
t("e diz de que dia é a versão que ela está usando",
  /versão de \d+ de \w+ do formulário/.test(await pg.locator(".rodape").innerText()));
t("a contagem não aparece na capa", await pg.locator("#contagem").isHidden());
await pg.screenshot({ path: `${S}/apl-0-capa.png` });

// 2. Comecar pelo teclado
await pg.keyboard.press("Enter");
await pg.waitForTimeout(600);
t("Enter começa o formulário", (await pg.locator(".pergunta").first().innerText()).includes("Nome completo"));
t("a contagem comeca em 01 de 09", (await pg.locator("#contagemNumero").innerText()) === "01 / 09");
t("o titulo da aba acompanha", (await pg.title()) === "Pergunta 1 de 9, Ideia Que Vende");

// 3. Recusa com o texto da definicao, e conserto
await pg.keyboard.press("Enter");
await pg.waitForTimeout(400);
t("não deixa seguir sem resposta",
  (await pg.locator(".recado").first().innerText()).includes("Escreva o seu nome completo"));
t("e marca o campo para quem ouve",
  (await pg.locator(".campo").first().getAttribute("aria-invalid")) === "true");
await pg.screenshot({ path: `${S}/apl-1-recado.png` });
await pg.locator(".campo").first().fill("Marina Alves");
await pg.waitForTimeout(200);
t("a mensagem some no instante em que a resposta fica boa",
  (await pg.locator(".recado").first().innerText()).trim() === "");
await pg.keyboard.press("Enter");
await pg.waitForTimeout(600);

// 4. E-mail, com o dominio parecido
await pg.locator(".campo").first().fill("marina@gmail.con");
await pg.waitForTimeout(250);
t("pergunta se o domínio não seria outro",
  (await pg.locator(".sugestao").innerText()).includes("marina@gmail.com"));
await pg.locator(".js-corrigir").click();
await pg.waitForTimeout(200);
t("e conserta quando a pessoa aceita",
  (await pg.locator(".campo").first().inputValue()) === "marina@gmail.com");
await pg.keyboard.press("Enter");
await pg.waitForTimeout(600);

// 5. Telefone com mascara
await pg.locator(".campo").first().click();
await pg.keyboard.type("11988887777");
await pg.waitForTimeout(200);
t("o número brasileiro sai com máscara",
  (await pg.locator(".campo").first().inputValue()) === "(11) 98888-7777");
await pg.keyboard.press("Enter");
await pg.waitForTimeout(700);

// 6. A letra desenhada bate com a posicao
const letras = await pg.locator(".opcao .letra").allInnerTexts();
t("a letra desenhada segue a posição da opção", letras.join("") === "ABCDEF", letras.join(","));
const segunda = await pg.locator(".opcao .rotulo").nth(1).innerText();
await pg.screenshot({ path: `${S}/apl-2-escolha.png` });
await pg.keyboard.press("b");
await pg.waitForTimeout(700);
t("a letra B escolhe a segunda opção e a tela passa sozinha",
  (await pg.locator("#contagemNumero").innerText()) === "05 / 09");

// 7. Texto longo: Enter quebra a linha, Ctrl com Enter avanca
await pg.locator(".campo-longo").fill("Sou nutricionista ha doze anos");
await pg.keyboard.press("Enter");
await pg.waitForTimeout(300);
t("no texto longo o Enter não avança", (await pg.locator("#contagemNumero").innerText()) === "05 / 09");
await pg.locator(".campo-longo").fill(
  "Sou nutricionista ha doze anos e quero montar uma mentoria para outras nutricionistas.");
await pg.keyboard.press("Control+Enter");
await pg.waitForTimeout(700);
t("mas Ctrl com Enter avança", (await pg.locator("#contagemNumero").innerText()) === "06 / 09");

// 8. Recarregar no meio: o rascunho volta
const guardado = await pg.evaluate(() => localStorage.getItem("iqv_aplicar_rascunho"));
t("o rascunho guarda pela chave da pergunta, não pelo título",
  !!guardado && JSON.parse(guardado).respostas.o_que_transformar !== undefined);
await pg.reload({ waitUntil: "networkidle" });
await pg.waitForTimeout(900);
t("recarregar retoma onde parou", (await pg.locator("#contagemNumero").innerText()) === "06 / 09");
t("e diz por escrito que retomou",
  (await pg.locator(".dica-linha").last().innerText()).includes("continuamos de onde parou"));
t("com o que já tinha sido respondido no lugar",
  JSON.parse(await pg.evaluate(() => localStorage.getItem("iqv_aplicar_rascunho"))).respostas.nome === "Marina Alves");
await pg.screenshot({ path: `${S}/apl-3-retomada.png` });

// 9. As quatro escolhas que faltam
for (const tecla of ["a", "c", "b", "d"]) {
  await pg.keyboard.press(tecla);
  await pg.waitForTimeout(700);
}

// 10. Conferir antes de enviar
t("a tela de conferir aparece antes do envio", await pg.locator(".revisao-tela").isVisible());
t("com as nove respostas", (await pg.locator(".revisao-item").count()) === 9);
const conferir = await pg.locator(".revisao-lista").innerText();
t("o telefone aparece no formato que a mesa espera", conferir.includes("+55 11 98888-7777"));
t("a escolha aparece pelo texto que a pessoa leu", conferir.includes(segunda));
await pg.screenshot({ path: `${S}/apl-4-conferir.png`, fullPage: true });

// 11. Voltar pelo navegador
await pg.goBack();
await pg.waitForTimeout(700);
t("o botão de voltar do navegador volta uma pergunta",
  (await pg.locator("#contagemNumero").innerText()) === "09 / 09");
t("e a resposta anterior continua marcada", (await pg.locator(".opcao input:checked").count()) === 1);
await pg.goForward();
await pg.waitForTimeout(700);

// 12. Falha de envio: o rascunho fica
modo = "rede";
await pg.locator(".revisao-tela .js-avancar").click();
await pg.waitForTimeout(14500);
t("quando o envio falha, a pessoa lê o que aconteceu",
  (await pg.locator(".falha").innerText()).includes("Não consegui enviar agora"));
t("e o que ela escreveu continua guardado",
  await pg.evaluate(() => !!localStorage.getItem("iqv_aplicar_rascunho")));
await pg.screenshot({ path: `${S}/apl-5-falha.png` });

// 13. Enviar de verdade
modo = "ok";
recebidos = [];
await pg.locator(".revisao-tela .js-avancar").click();
await pg.waitForTimeout(1500);
t("a tela de fim aparece", await pg.locator(".fim").isVisible());
t("e só então o rascunho some",
  await pg.evaluate(() => localStorage.getItem("iqv_aplicar_rascunho") === null));
t("fica guardado que a aplicação foi enviada",
  await pg.evaluate(() => !!localStorage.getItem("iqv_aplicar_enviado")));
await pg.screenshot({ path: `${S}/apl-6-fim.png` });

const completo = recebidos.filter((r) => !r.parcial)[0];
t("a submissão viaja com a chave estável de cada pergunta",
  !!completo && Object.keys(completo.respostas).length === 9,
  completo ? Object.keys(completo.respostas).join(",") : "nenhuma");
t("a escolha viaja como chave de opção, não como texto",
  !!completo && completo.respostas.atuacao === "liberal");
t("o identificador do envio tem o formato que a rota confere",
  !!completo && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(completo.envio));
t("o identificador da visita nunca viaja junto do envio",
  !!completo && !JSON.stringify(completo).includes("visita"));
t("a armadilha do robô vai vazia", !!completo && completo.sobre_voce_extra === "");

// 14. Reabrir depois de enviar
await pg.goto(B, { waitUntil: "networkidle" });
await pg.waitForTimeout(700);
t("reabrir mostra o agradecimento, não um formulário em branco",
  await pg.locator(".fim").isVisible());

// 15. Nada do outro negocio
t("nenhuma chave do outro negócio foi escrita",
  await pg.evaluate(() => Object.keys(localStorage).every((k) => k.indexOf("af_") !== 0)));

// 16. Celular: a barra de baixo toma o lugar do botao
const cel = await ctx.newPage();
ouvir(cel, "celular");
await preparar(cel);
await cel.setViewportSize({ width: 390, height: 780 });
await cel.goto(B, { waitUntil: "networkidle" });
await cel.evaluate(() => localStorage.clear());
await cel.reload({ waitUntil: "networkidle" });
await cel.waitForTimeout(700);
await cel.locator(".comecar").click();
await cel.waitForTimeout(700);
t("no celular o botão vive na barra de baixo", await cel.locator("#barra").isVisible());
t("e sai do fluxo da tela", await cel.locator(".tela .avancar").isHidden());
await cel.screenshot({ path: `${S}/apl-7-celular.png` });

t("nenhum erro de JavaScript em todo o caminho", erros.length === 0, erros.slice(0, 4).join(" | "));

console.log(`\n${ok} passaram, ${bad} falharam`);
await nav.close();
process.exit(bad ? 1 : 0);
