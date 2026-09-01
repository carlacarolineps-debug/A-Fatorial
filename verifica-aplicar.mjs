// Abre a página de aplicação num navegador de verdade e responde o
// formulário do começo ao fim, como uma pessoa responderia: no
// computador e depois num aparelho de 390 pontos de largura.
//
// Esta é a ÚNICA verificação de navegador desta página. Existiram duas
// por um tempo, esta e uma em fonte/aplicar/verifica.mjs, conferindo em
// grande parte as mesmas coisas e cada uma deixando de fora o que a
// outra guardava. Quem mudasse a página rodaria uma das duas e acharia
// que tinha conferido. As duas viraram esta, e a outra foi apagada.
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

// Quantas perguntas o formulário tem. Nunca escrito na mão aqui: ligar
// uma pergunta nova é o próximo passo previsto da tela de edição, e um
// número cravado neste arquivo faria a verificação inteira cair no dia em
// que isso acontecesse, acusando a página de um defeito que é do teste.
let TOTAL = null;
const doisDigitos = (n) => String(n).padStart(2, "0");
const alvoDaContagem = (n) => `${doisDigitos(n)} / ${doisDigitos(TOTAL)}`;

const naPergunta = async (pg, numero, prazo = 8000) =>
  Number.isFinite(TOTAL) &&
  (await ate(pg, (alvo) => document.getElementById("contagemNumero").textContent.trim() === alvo,
             alvoDaContagem(numero), prazo)) &&
  (await assentou(pg));

const naTela = (pg, classe) =>
  pg.locator(classe).waitFor({ timeout: 20000 }).then(() => assentou(pg)).catch(() => false);

const contagem = (pg) => pg.locator("#contagemNumero").innerText().catch(() => "(sem contagem)");

// Ler texto de um lugar que sumiu não pode matar a rodada: vira texto
// vazio, uma conferência vermelha e as outras continuam acontecendo.
const texto = (alvo) => alvo.innerText().then((v) => v.trim()).catch(() => "");
const valor = (alvo) => alvo.inputValue().catch(() => "");
const computado = (pg, seletor, campo) =>
  pg.$eval(seletor, (el, qual) => getComputedStyle(el)[qual], campo).catch(() => "");
// Quanto a barra fina do alto já andou, de 0 a 1. Sem a barra na moldura,
// devolve um número que não é nenhum dos esperados, e a conferência fica
// vermelha em vez de derrubar a rodada.
const andarDaBarra = (pg) =>
  pg.$eval("#progresso", (el) => Number(el.style.getPropertyValue("--p") || 0))
    .catch(() => -1);
const cabeNaLargura = (pg) =>
  pg.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

/* A definição vem do servidor quando ele responde. Quando não responde, a
   página abre com a cópia que o build embutiu nela, e é isso que a pessoa
   veria: erro que ela não precisa resolver não vira tela de erro. */
let doServidor = null;
try {
  const r = await fetch(new URL("/api/formulario", B));
  const j = await r.json();
  if (j?.ok && j.formulario?.perguntas?.length) {
    doServidor = JSON.stringify(j);
    // O tipo "recado" é uma tela de leitura, e não conta na numeração.
    TOTAL = j.formulario.perguntas.filter((p) => p.tipo !== "recado").length;
  }
} catch {
  // sem servidor, a página se vira com a cópia embutida, e o total dela
  // é lido da própria tela lá embaixo
}

/* As respostas que esta verificação dá, pela chave estável de cada
   pergunta. Nas de escolha, a chave da opção: a letra que escolhe e a
   posição do cartão saem da tela, e não deste arquivo. */
const RESPOSTAS = {
  nome: "Marina Alves",
  email: "marina@exemplo.com.br",
  o_que_transformar:
    "Sou nutricionista ha doze anos e quero montar uma mentoria para outras nutricionistas.",
  atuacao: "liberal",
  estagio: "cobra",
  atende_clientes: "recorrente",
  faturamento: "de_15k_a_50k",
  objetivo: "estruturar",
};

// A letra desenhada segue a posição da opção na tela. Procurar a opção
// pela chave dela, e tirar a letra da posição, faz esta verificação
// sobreviver a trocar a ordem das perguntas e o número de opções.
const posicaoDaOpcao = (pg, opcaoChave) =>
  pg.$$eval(".opcao input", (campos, chave) => campos.findIndex((c) => c.value === chave), opcaoChave);

const escolherPelaLetra = async (pg, opcaoChave) => {
  const posicao = await posicaoDaOpcao(pg, opcaoChave);
  if (posicao < 0) return false;
  await pg.keyboard.press(String.fromCharCode(97 + posicao));
  return true;
};

const escolherNoCartao = async (pg, opcaoChave) => {
  const alvo = pg.locator(`.opcao:has(input[value="${opcaoChave}"])`);
  if (!(await alvo.count())) return false;
  await alvo.click();
  return true;
};

// Qual pergunta está na tela, pela chave estável: o nome do grupo de
// opções é a chave da pergunta.
const chaveNaTela = (pg) => pg.$eval(".opcao input", (c) => c.name).catch(() => null);

// A tela de escolha mostra o visto e espera um instante antes de passar
// sozinha. Esperar a pergunta virar outra, e nao so a troca terminar, e o
// que impede esta verificacao de responder duas vezes a mesma pergunta.
const saiuDaPergunta = (pg, chave) => ate(pg, (anterior) => {
  if (document.querySelector(".revisao-tela")) return true;
  const campo = document.querySelector(".opcao input");
  return !!campo && campo.name !== anterior;
}, chave);

// Responde as escolhas que faltam até a tela de conferir aparecer.
async function responderAsEscolhasQueFaltam(pg, { toque = false } = {}) {
  for (let volta = 0; volta < 20; volta += 1) {
    if (await pg.locator(".revisao-tela").count()) return true;
    const chave = await chaveNaTela(pg);
    if (!chave || !RESPOSTAS[chave]) return false;
    const foi = toque
      ? await escolherNoCartao(pg, RESPOSTAS[chave])
      : await escolherPelaLetra(pg, RESPOSTAS[chave]);
    if (!foi) return false;
    if (!(await saiuDaPergunta(pg, chave))) return false;
    await assentou(pg);
  }
  return false;
}

/* O texto que a pessoa lê, tela por tela. As regras da casa sobre emoji e
   exclamação valem para o que está escrito na tela, e não para o código
   da página: "!==" e "!important" são exclamação para quem conta
   caractere, e não para quem lê. */
const lidos = [];
const anotarTexto = async (pg) => {
  lidos.push(await pg.locator("#palco").innerText().catch(() => ""));
};

// Os caracteres procurados são escritos pelo código deles, e não de
// letra, para nem este arquivo ter um travessão ou um emoji dentro.
const contarNoDocumento = async (pg) => {
  const doc = await pg.content();
  return {
    travessao: (doc.match(/\u2014/g) || []).length,
    emoji: (doc.match(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu) || []).length,
    tempoReal: (doc.match(/tempo real/gi) || []).length,
  };
};

const modos = { atual: "ok" };
const enviadas = [];
async function preparar(pg, { semServidor = false } = {}) {
  await pg.route("**/api/formulario", (rota) => (doServidor && !semServidor
    ? rota.fulfill({ status: 200, contentType: "application/json", body: doServidor })
    : rota.abort()));
  await pg.route("**/api/evento", (rota) => rota.fulfill({
    status: 200, contentType: "application/json", body: '{"ok":true,"gravados":1}',
  }));
  await pg.route("**/api/resposta", (rota) => {
    enviadas.push(JSON.parse(rota.request().postData() || "{}"));
    if (modos.atual === "recusa") {
      return rota.fulfill({
        status: 503, contentType: "application/json",
        body: '{"ok":false,"erro":"não consegui gravar agora","pode_repetir":true}',
      });
    }
    if (modos.atual === "rede") return rota.abort();
    return rota.fulfill({
      status: 200, contentType: "application/json",
      body: '{"ok":true,"lead_id":9,"recebido_em":"2026-08-31 10:00:00"}',
    });
  });
}

// A página desenha na hora com a cópia embutida e refaz a tela quando o
// servidor responde. Esperar a rede sossegar antes de tocar em qualquer
// coisa evita clicar numa tela que está para ser refeita.
async function abrir(pg, opcoes = {}) {
  await preparar(pg, opcoes);
  await pg.goto(B, { waitUntil: "networkidle" });
  await assentou(pg);
}

// Devolve em quantos comandos a capa saiu do lugar, e zero quando ela não
// saiu. São duas coisas diferentes, e cada uma vira uma conferência: se o
// formulário começa, e se ele começa no primeiro comando. Insistir sem
// dizer quantas vezes insistiu foi o que escondeu, por um tempo, o
// primeiro comando engolido.
//
// A capa é reconferida antes de cada nova tentativa. Sem isso, uma capa
// que já saiu do palco deixaria o comando seguinte esperando por um botão
// que não existe mais, e a rodada morreria ali, com um rastro de
// biblioteca no lugar das outras cinquenta conferências.
async function comecar(pg, { teclado = false } = {}) {
  for (let vez = 1; vez <= 4; vez += 1) {
    if (!(await pg.locator(".capa .comecar").count())) return 0;
    if (teclado) await pg.keyboard.press("Enter");
    else await pg.locator(".capa .comecar").click();

    if (!Number.isFinite(TOTAL)) {
      // Sem servidor, quem sabe o total é a própria página.
      const apareceu = await ate(
        pg, () => /^\d+ \/ \d+$/.test(document.getElementById("contagemNumero").textContent.trim()),
        null, 2500,
      );
      if (apareceu) TOTAL = Number((await contagem(pg)).split("/")[1].trim());
    }
    if (await naPergunta(pg, 1, 2500)) return vez;
  }
  return 0;
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
await anotarTexto(pg);

// 1. A capa
t("a página abre, com servidor ou sem ele", await pg.locator(".capa").isVisible(),
  doServidor ? "com as perguntas do servidor" : "com a cópia embutida na página");
t("a capa não mostra contagem de pergunta nenhuma", await pg.locator("#contagem").isHidden());
t("a barra de progresso começa no zero", (await andarDaBarra(pg)) === 0);
t("a capa não trata a dona pelo primeiro nome com quem acabou de chegar",
  !/Carla/.test(await texto(pg.locator(".capa"))));
// O botão é o MESMO da página de vendas: pílula, laranja em degradê,
// verniz por dentro. Esta conferência já pediu o contrário, um retângulo
// liso, porque eu tinha decidido por conta própria que a pílula era
// genérica. A pílula é a marca, e quem clica nela na capa do site clica
// na mesma coisa aqui. Conferido no computado, porque o que a pessoa vê é
// o computado, e não o que está escrito na folha de estilo.
const desenhoBotao = await pg.$eval(".capa .btn-o", (el) => {
  const c = getComputedStyle(el);
  return { canto: c.borderTopLeftRadius, fundo: c.backgroundImage, sombra: c.boxShadow };
}).catch(() => ({}));
t("o botão principal é o mesmo da página de vendas: pílula, degradê e verniz",
  parseInt(desenhoBotao.canto, 10) >= 24 &&
  /linear-gradient/.test(desenhoBotao.fundo || "") &&
  /inset/.test(desenhoBotao.sombra || ""),
  JSON.stringify(desenhoBotao));
await pg.screenshot({ path: `${S}/aplicar-1-capa.png` });

// 2. A primeira pergunta aparece, pelo teclado, num comando só
const comandosNoComputador = await comecar(pg, { teclado: true });
t("o Enter começa o formulário", comandosNoComputador > 0, await contagem(pg));
t("e a capa atende no primeiro comando, sem engolir o primeiro Enter",
  comandosNoComputador === 1, `precisou de ${comandosNoComputador} comando(s)`);
t("e a contagem sabe quantas perguntas existem", Number.isFinite(TOTAL) && TOTAL > 0, String(TOTAL));
t("a primeira é a pergunta do nome",
  (await texto(pg.locator(".pergunta").first())).includes("Nome completo"));
t("o título da aba acompanha a pergunta",
  (await pg.title()) === `Pergunta 1 de ${TOTAL}, Ideia Que Vende`, await pg.title());
t("o foco cai no campo, e dá para responder sem tocar no mouse",
  await pg.evaluate(() => document.activeElement?.classList.contains("campo") === true));

// 3. Sem resposta, não avança, e o recado diz o que fazer
await pg.keyboard.press("Enter");
const veioRecado = await ate(pg, () =>
  document.querySelector(".recado")?.innerText.trim().length > 0);
const recado = veioRecado ? await texto(pg.locator(".recado").first()) : "";
t("com o campo obrigatório vazio, o Enter não avança",
  (await contagem(pg)) === alvoDaContagem(1));
t("e o recado diz o que fazer, com verbo na frente",
  /^(Escreva|Escolha|Confira|Conte)/.test(recado), JSON.stringify(recado));
t("o recado não mostra código nem nome de campo",
  recado.length > 0 && !/[<>{}]|null|undefined/i.test(recado));
t("e o campo fica marcado para quem ouve a tela",
  (await pg.locator(".campo").first().getAttribute("aria-invalid").catch(() => null)) === "true");
t("a pergunta fica centrada na tela, e não encostada à esquerda",
  (await computado(pg, ".pergunta-tela", "textAlign")) === "center");
await anotarTexto(pg);
await pg.screenshot({ path: `${S}/aplicar-2-recado.png` });

// 4. A mensagem some no instante em que a resposta fica boa
await pg.locator(".campo").first().fill(RESPOSTAS.nome);
t("a mensagem some no instante em que a resposta fica boa",
  await ate(pg, () => document.querySelector(".recado").innerText.trim() === ""));
await pg.keyboard.press("Enter");
t("com a resposta escrita, o Enter avança", await naPergunta(pg, 2));
const barraNaDois = await andarDaBarra(pg);
t("a barra de progresso anda junto", barraNaDois > 0.05 && barraNaDois < 0.3, String(barraNaDois));

// 5. E-mail: o torto é recusado, e o domínio parecido vira pergunta
await pg.locator(".campo").first().fill("marina.exemplo.com.br");
await pg.keyboard.press("Enter");
const veioRecadoEmail = await ate(pg, () =>
  document.querySelector(".recado")?.innerText.trim().length > 0);
const recadoEmail = veioRecadoEmail ? await texto(pg.locator(".recado").first()) : "";
t("e-mail sem arroba não passa", (await contagem(pg)) === alvoDaContagem(2));
t("e o recado é uma frase em português, sem código",
  /^Confira o e-mail/.test(recadoEmail) && !/[<>{}]/.test(recadoEmail), JSON.stringify(recadoEmail));

await pg.locator(".campo").first().fill("marina@gmail.con");
t("pergunta se o domínio não seria outro",
  await ate(pg, () => document.querySelector(".sugestao")?.innerText.includes("marina@gmail.com")));
await pg.locator(".js-corrigir").click();
t("e conserta quando a pessoa aceita",
  await ate(pg, () => document.querySelector(".campo").value === "marina@gmail.com"));
await pg.locator(".campo").first().fill(RESPOSTAS.email);
await pg.keyboard.press("Enter");
t("com o e-mail certo, segue", await naPergunta(pg, 3));
const barraNaTres = await andarDaBarra(pg);
t("e a barra de progresso anda para a frente junto", barraNaTres > barraNaDois,
  `${barraNaTres} contra ${barraNaDois}`);

// 6. Voltar mantém o que já foi respondido
await pg.locator("#setaVoltar").click();
t("voltar leva para a pergunta anterior", await naPergunta(pg, 2));
t("e a resposta continua lá",
  (await valor(pg.locator(".campo").first())) === RESPOSTAS.email,
  await valor(pg.locator(".campo").first()));
const barraAoVoltar = await andarDaBarra(pg);
t("a barra volta junto, em vez de ficar adiantada", barraAoVoltar < barraNaTres,
  `${barraAoVoltar} contra ${barraNaTres}`);
await pg.locator(".campo").first().press("Enter");
await naPergunta(pg, 3);

// 7. Telefone: o número de fora curto demais é recusado já aqui, e não só
// no envio, senão a pessoa só descobre depois de responder tudo.
async function escolherPais(nome) {
  await pg.locator(".js-pais").click();
  await pg.locator("#paisesBusca").waitFor();
  await pg.locator("#paisesBusca").fill(nome);
  await ate(pg, () => document.querySelectorAll(".pais-item").length > 0);
  await pg.locator(".pais-item").first().click();
  await ate(pg, () => !document.querySelector("#paisesBusca")?.offsetParent);
}
await escolherPais("Portugal");
await pg.locator(".campo").first().fill("912345");
await pg.keyboard.press("Enter");
t("número de fora curto demais para o envio é recusado já na pergunta",
  (await contagem(pg)) === alvoDaContagem(3), await contagem(pg));
await escolherPais("Brasil");
await pg.locator(".campo").first().fill("");
await pg.locator(".campo").first().click();
await pg.keyboard.type("11988887777");
t("o número brasileiro ganha máscara enquanto se digita",
  (await valor(pg.locator(".campo").first())) === "(11) 98888-7777",
  await valor(pg.locator(".campo").first()));
await pg.keyboard.press("Enter");
t("e segue para a pergunta de escolha", await naPergunta(pg, 4));

// 8. A letra escolhe, e ela segue a posição
const letras = await pg.locator(".opcao .letra").allInnerTexts();
t("as letras seguem a posição da opção, e não o texto",
  letras.join("") === letras.map((x, i) => String.fromCharCode(65 + i)).join(""), letras.join(","));
const posicaoLiberal = await posicaoDaOpcao(pg, RESPOSTAS.atuacao);
const opcaoEscolhida = await texto(pg.locator(".opcao .rotulo").nth(posicaoLiberal));
await anotarTexto(pg);
await pg.screenshot({ path: `${S}/aplicar-3-escolha.png` });
t("a letra da opção escolhe, e a tela passa sozinha",
  (await escolherPelaLetra(pg, RESPOSTAS.atuacao)) && (await naPergunta(pg, 5)));
const rascunho = await pg.evaluate(() => JSON.parse(localStorage.getItem("iqv_aplicar_rascunho") || "{}"));
t("e o que ficou guardado é a chave da opção, não o texto dela",
  rascunho?.respostas?.atuacao === RESPOSTAS.atuacao, JSON.stringify(rascunho?.respostas?.atuacao));
t("o rascunho guarda pela chave da pergunta, não pelo título",
  rascunho?.respostas?.nome === RESPOSTAS.nome, Object.keys(rascunho?.respostas ?? {}).join(","));

// 9. Texto longo: Enter quebra a linha, Ctrl com Enter avança
await pg.locator(".campo-longo").fill(RESPOSTAS.o_que_transformar);
await pg.keyboard.press("Enter");
t("no texto longo o Enter não avança, ele quebra a linha",
  (await ate(pg, (alvo) => document.getElementById("contagemNumero").textContent.trim() !== alvo,
             alvoDaContagem(5), 1200)) === false);
await pg.keyboard.press("Control+Enter");
t("e Ctrl com Enter avança", await naPergunta(pg, 6));

// 10. Recarregar no meio: o rascunho volta e a página diz que voltou
const versaoLida = await pg.evaluate(
  () => JSON.parse(localStorage.getItem("iqv_aplicar_rascunho") || "{}").versao);
t("a página sabe qual versão do formulário está desenhando",
  typeof versaoLida === "number", String(versaoLida));
await pg.reload({ waitUntil: "networkidle" });
await assentou(pg);
t("recarregar retoma onde parou", await naPergunta(pg, 6), await contagem(pg));
t("e diz por escrito que retomou",
  (await texto(pg.locator(".dica-linha").last())).includes("continuamos de onde parou"));
t("com o que já tinha sido respondido no lugar",
  (await pg.evaluate(() => JSON.parse(localStorage.getItem("iqv_aplicar_rascunho")).respostas.nome))
    === RESPOSTAS.nome);
await pg.screenshot({ path: `${S}/aplicar-4-retomada.png` });

// 11. A linha da retomada vale para a tela em que a pessoa voltou, e some
// da seguinte em diante: texto que vale para todo estado da tela não é
// recado, é ruído.
const chaveNaSexta = await chaveNaTela(pg);
t("a sexta pergunta é de escolha, e é ela que a retomada devolveu",
  !!chaveNaSexta && !!RESPOSTAS[chaveNaSexta], String(chaveNaSexta));
await escolherPelaLetra(pg, RESPOSTAS[chaveNaSexta]);
await naPergunta(pg, 7);
t("a linha da retomada não persegue a pessoa nas telas seguintes",
  !(await texto(pg.locator(".pergunta-tela"))).includes("continuamos de onde parou"));

// 12. As escolhas que faltam
t("as escolhas que faltam levam até a tela de conferir",
  await responderAsEscolhasQueFaltam(pg));

// 13. Conferir antes de enviar
t("depois da última pergunta vem a tela de conferir", await naTela(pg, ".revisao-tela"));
t("com todas as respostas na frente da pessoa",
  (await pg.locator(".revisao-item").count()) === TOTAL,
  String(await pg.locator(".revisao-item").count()));
const conferencia = await texto(pg.locator(".revisao-lista"));
t("a escolha aparece pelo texto que ela leu, não pela chave",
  conferencia.includes(opcaoEscolhida), opcaoEscolhida);
t("e o telefone aparece no formato que a mesa espera",
  conferencia.includes("+55 11 98888-7777"));
t("a barra chega no fim quando não falta mais nada", (await andarDaBarra(pg)) === 1);
await anotarTexto(pg);
await pg.screenshot({ path: `${S}/aplicar-5-conferir.png`, fullPage: true });

// 14. O botão de voltar do navegador
await pg.goBack();
t("o botão de voltar do navegador volta uma pergunta", await naPergunta(pg, TOTAL));
t("e a resposta anterior continua marcada",
  (await pg.locator(".opcao input:checked").count()) === 1);
await pg.goForward();
await naTela(pg, ".revisao-tela");

// 15. O envio recusado: a pessoa lê o que aconteceu e nada se perde.
// Sem esta parte, mover a limpeza do rascunho para o clique de enviar
// passaria despercebido, e quem perdesse a rede no meio perderia tudo o
// que digitou.
modos.atual = "recusa";
await pg.locator(".revisao-tela .js-avancar").click();
t("quando o servidor recusa, a pessoa lê o que aconteceu",
  await naTela(pg, ".falha"),
  (await texto(pg.locator(".falha"))).slice(0, 60));
t("e a explicação não mostra código nenhum",
  !/[<>{}]|\b(503|500|429)\b/.test(await texto(pg.locator(".falha"))));
t("o que ela escreveu continua guardado",
  await pg.evaluate(() => !!localStorage.getItem("iqv_aplicar_rascunho")));
t("e a tela de conferir continua ali, com as respostas dela",
  (await pg.locator(".revisao-item").count()) === TOTAL);
await anotarTexto(pg);
await pg.screenshot({ path: `${S}/aplicar-6-falha.png`, fullPage: true });

// 16. E então o envio passa
modos.atual = "ok";
await pg.locator(".revisao-tela .js-avancar").click();
t("preencher tudo e enviar chega na tela de fim", await naTela(pg, ".fim"));
t("e a tela de fim diz o que acontece agora",
  (await texto(pg.locator(".fim"))).length > 60);
t("só então o rascunho some",
  await pg.evaluate(() => localStorage.getItem("iqv_aplicar_rascunho") === null));
t("e fica guardado que a aplicação foi enviada",
  await pg.evaluate(() => !!localStorage.getItem("iqv_aplicar_enviado")));
await anotarTexto(pg);
await pg.screenshot({ path: `${S}/aplicar-7-fim.png` });

// 17. O que viajou no envio
const enviada = enviadas.filter((e) => !e.parcial).pop();
t("a aplicação viaja com a chave estável de cada pergunta",
  !!enviada && Object.keys(enviada.respostas ?? {}).length === TOTAL,
  enviada ? Object.keys(enviada.respostas).join(",") : "nenhuma");
t("a escolha viaja como chave de opção, não como texto",
  enviada?.respostas?.atuacao === RESPOSTAS.atuacao &&
  enviada?.respostas?.faturamento === RESPOSTAS.faturamento);
t("com identificação no formato que a rota confere",
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(enviada?.envio ?? ""));
t("o identificador da visita nunca viaja junto do envio",
  !!enviada && !JSON.stringify(enviada).includes("visita"));
t("a armadilha do robô vai vazia, porque quem responde é gente",
  enviada?.sobre_voce_extra === "");
t("e o envio diz a mesma versão que a pessoa leu, sem trocar o número no caminho",
  enviada?.versao === versaoLida, `${enviada?.versao} contra ${versaoLida}`);

// 18. Reabrir depois de enviar
await pg.goto(B, { waitUntil: "networkidle" });
await assentou(pg);
t("reabrir mostra o agradecimento, não um formulário em branco",
  await pg.locator(".fim").isVisible());

// 19. As regras da casa. A página carrega dentro dela os textos de todas
// as telas, então conferir o documento inteiro cobre também o que ainda
// não apareceu. A exclamação é contada só no que a pessoa leu: no código
// da página ela é comparação, e não grito.
const noDocumento = await contarNoDocumento(pg);
const textoLido = lidos.join("\n");
t("não existe travessão em texto nenhum da página", noDocumento.travessao === 0,
  `${noDocumento.travessao} encontrado(s)`);
t("nem emoji", noDocumento.emoji === 0, `${noDocumento.emoji} encontrado(s)`);
t("nem a expressão que promete resposta na hora", noDocumento.tempoReal === 0,
  `${noDocumento.tempoReal} encontrada(s)`);
t("e nenhuma tela grita com quem está respondendo",
  !textoLido.includes("!"), textoLido.split("\n").find((l) => l.includes("!")) ?? "");
t("nenhuma chave do outro negócio foi escrita no navegador",
  await pg.evaluate(() => Object.keys(localStorage).every((k) => k.indexOf("af_") !== 0)),
  await pg.evaluate(() => Object.keys(localStorage).join(",")));
t("nada escapa para os lados no computador", await cabeNaLargura(pg));
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
t("e nada escapa para os lados", await cabeNaLargura(cel),
  await cel.evaluate(() => `${document.documentElement.scrollWidth} de ${window.innerWidth}`));

const toquesNoCelular = await comecar(cel);
t("o dedo na capa começa o formulário", toquesNoCelular > 0, await contagem(cel));
t("e a capa atende no primeiro toque, sem engolir o primeiro dedo",
  toquesNoCelular === 1, `precisou de ${toquesNoCelular} toque(s)`);
t("o botão de seguir vive na barra de baixo, onde o polegar alcança",
  await cel.locator("#barra").isVisible());
t("e sai do meio da tela, para o teclado não cobrir a pergunta",
  await cel.locator(".tela .avancar").isHidden());
await cel.screenshot({ path: `${S}/aplicar-8-celular.png` });

await cel.locator("#barraAcao").click();
const recadoCel = await ate(cel, () =>
  document.querySelector(".recado")?.innerText.trim().length > 10);
t("com o campo vazio, o botão da barra também não avança, e explica",
  (await contagem(cel)) === alvoDaContagem(1) && recadoCel,
  await texto(cel.locator(".recado").first()));

await cel.locator(".campo").first().fill(RESPOSTAS.nome);
await cel.locator("#barraAcao").click();
t("respondendo, ela segue", await naPergunta(cel, 2));

await cel.locator(".campo").first().fill(RESPOSTAS.email);
await cel.locator("#barraAcao").click();
await naPergunta(cel, 3);
await cel.locator(".campo").first().fill("(11) 98888-7777");
await cel.locator("#barraAcao").click();
t("e chega na primeira escolha pela barra de baixo", await naPergunta(cel, 4));

t("no toque, a opção é escolhida no cartão e a tela passa sozinha",
  (await escolherNoCartao(cel, RESPOSTAS.atuacao)) && (await naPergunta(cel, 5)));

await cel.locator(".campo-longo").fill(RESPOSTAS.o_que_transformar);
await cel.locator("#barraAcao").click();
t("e o texto longo segue pelo botão da barra", await naPergunta(cel, 6));
t("as escolhas que faltam levam até a tela de conferir",
  await responderAsEscolhasQueFaltam(cel, { toque: true }));

t("a tela de conferir também aparece no aparelho pequeno", await naTela(cel, ".revisao-tela"));
t("e a lista de respostas não escapa para os lados", await cabeNaLargura(cel),
  await cel.evaluate(() => `${document.documentElement.scrollWidth} de ${window.innerWidth}`));
await anotarTexto(cel);
await cel.screenshot({ path: `${S}/aplicar-9-celular-conferir.png`, fullPage: true });

// No aparelho pequeno o botão de enviar também vive na barra de baixo.
await cel.locator("#barraAcao").click();
t("e a mesma aplicação chega ao fim no aparelho pequeno", await naTela(cel, ".fim"));
await anotarTexto(cel);
await cel.screenshot({ path: `${S}/aplicar-10-celular-fim.png` });

const noDocumentoCel = await contarNoDocumento(cel);
t("no aparelho pequeno também não existe travessão, emoji nem promessa de hora",
  noDocumentoCel.travessao === 0 && noDocumentoCel.emoji === 0 && noDocumentoCel.tempoReal === 0,
  JSON.stringify(noDocumentoCel));
t("nem grito em tela nenhuma das duas larguras",
  !lidos.join("\n").includes("!"));
t("nenhum erro de JavaScript nas duas larguras", erros.length === 0, erros.slice(0, 3).join(" | "));

/* =====================================================================
   Sem o servidor: a página abre com a cópia que o build embutiu nela.

   Erro que a pessoa não precisa resolver não vira tela de erro. Aqui a
   rota da definição é recusada de propósito, e o que se confere é que ela
   nem percebe, além da linha que diz de quando é o formulário que ela
   está lendo.
   ===================================================================== */
const semRede = await nav.newContext({ viewport: { width: 1280, height: 900 } });
const solta = await semRede.newPage();
ouvir(solta, "sem servidor");
await abrir(solta, { semServidor: true });

t("a capa abre mesmo sem o servidor responder", await solta.locator(".capa").isVisible());
t("e diz de que dia é a versão que ela está usando",
  /versão de \d+ de \w+ do formulário/.test(await texto(solta.locator(".rodape"))),
  (await texto(solta.locator(".rodape"))).split("\n").pop());
t("e a cópia embutida faz as mesmas perguntas, na mesma contagem",
  (await comecar(solta)) > 0 && (await contagem(solta)) === alvoDaContagem(1),
  await contagem(solta));
await anotarTexto(solta);
await solta.screenshot({ path: `${S}/aplicar-11-sem-servidor.png` });

t("nenhum erro de JavaScript em caminho nenhum", erros.length === 0, erros.slice(0, 3).join(" | "));

console.log(`\n${ok} passaram, ${bad} falharam`);
await nav.close();
process.exit(bad ? 1 : 0);
