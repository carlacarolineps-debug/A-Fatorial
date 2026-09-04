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
t("o gestor enxerga as onze telas", telas.length === 11, telas.join(", "));

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
t("ao escolher Gestor, a casa diz que ele vê todas as telas", /todas as 11 telas/.test(dica), dica);

await pg.selectOption("#casaPapel", "colaborador");
await pg.waitForTimeout(250);
dica = await pg.textContent("#casaPapelDica");
t("ao escolher Colaborador, ela diz quantas e quais", /9 das 11 telas/.test(dica) && /Minha semana/.test(dica), dica);
t("e não promete o que o colaborador não vê", !/Contratado e recebido/.test(dica), dica);

await pg.selectOption("#casaPapel", "cliente");
await pg.waitForTimeout(250);
dica = await pg.textContent("#casaPapelDica");
t("ao escolher Cliente, ela diz que é uma tela só", /1 das 11 telas/.test(dica), dica);

/* =====================================================================
   O ao vivo.

   Nao basta o selo aparecer: o que precisa ser verdade e que a tela troque
   sozinha quando o banco muda, sem ninguem clicar em nada. Entao aqui uma
   aplicacao e escrita direto no banco com a tela aberta, e a conferencia
   espera a tela reagir por conta propria.

   As duas outras metades da regra tambem sao conferidas, porque sao elas
   que fazem isso caber no plano gratis: aba escondida nao pergunta nada, e
   tela que nao esta ao vivo nao pergunta nada.
   ===================================================================== */
await entrarComo("carla@iqv.com.br");

const batidas = [];
pg.on("request", (r) => { if (r.url().includes("/api/mesa/pulso")) batidas.push(1); });

await pg.evaluate(() => irPara("semana"));
await pg.waitForTimeout(4000);
t("numa tela que mora no navegador, o ao vivo nao pergunta nada ao servidor",
  batidas.length === 0, `${batidas.length} batidas`);
t("e o selo do ao vivo fica escondido",
  (await pg.locator("[data-ao-vivo]:visible").count()) === 0);

await pg.evaluate(() => irPara("ideias"));
await pg.waitForTimeout(3500);
t("na mesa das aplicacoes o selo aparece e diz que esta ao vivo",
  /ao vivo/.test(await pg.locator("[data-ao-vivo]:visible").first().innerText().catch(() => "")),
  (await pg.locator("[data-ao-vivo]:visible").first().innerText().catch(() => "")).replace(/\n/g, " "));
t("e ela passa a perguntar ao servidor sozinha", batidas.length > 0, `${batidas.length} batidas`);

const quantasAntes = await pg.evaluate(() => IDEIAS.itens.length);
spawnSync("npx", ["wrangler", "d1", "execute", "ideia-que-vende", "--local", "--command",
  "insert into leads (typeform_response_id, nome, email, whatsapp, respostas, origem) " +
  "values ('aovivo:1', 'Chegou Sozinha', 'sozinha@exemplo.com.br', '11999990000', '{}', 'landing')"],
  { stdio: "ignore" });

let virou = false;
for (let i = 0; i < 30; i++) {
  await pg.waitForTimeout(400);
  if ((await pg.evaluate(() => IDEIAS.itens.length)) === quantasAntes + 1) { virou = true; break; }
}
t("uma aplicacao escrita no banco aparece na tela sem ninguem clicar em nada",
  virou, `${quantasAntes} -> ` + (await pg.evaluate(() => IDEIAS.itens.length)));
t("e ela aparece com o nome de quem chegou",
  /Chegou Sozinha/.test(await pg.textContent("#ideias-corpo")));

const antesDeEsconder = batidas.length;
await pg.evaluate(() => Object.defineProperty(document, "hidden", { value: true, configurable: true }));
await pg.waitForTimeout(6000);
t("com a aba escondida, o ao vivo para de perguntar",
  batidas.length - antesDeEsconder <= 1, `${batidas.length - antesDeEsconder} batidas`);
await pg.evaluate(() => Object.defineProperty(document, "hidden", { value: false, configurable: true }));

spawnSync("npx", ["wrangler", "d1", "execute", "ideia-que-vende", "--local", "--command",
  "delete from leads where typeform_response_id = 'aovivo:1'"], { stdio: "ignore" });

/* =====================================================================
   As duas matrizes, e a cor que voltou a apontar alguma coisa.

   "O que cada papel enxerga" e "os tres niveis" desenhavam tres cartoes
   com a mesma lista dentro: trinta e tres rotulos para onze telas, vinte
   e quatro para oito entregas. O que se confere aqui e que o rotulo
   aparece UMA vez e que a marca de cada caso continua clicavel, porque
   uma matriz bonita que nao deixa mais mudar permissao seria uma piora.
   ===================================================================== */
await entrarComo("carla@iqv.com.br");
await pg.evaluate(() => irPara("casa"));
await pg.waitForTimeout(900);

const matrizPapeis = await pg.evaluate(() => {
  const t = document.querySelector("#casaPermissoes table.matriz");
  if (!t) return null;
  const titulos = Array.from(t.querySelectorAll("tbody td[data-t]")).map((c) => c.textContent.trim());
  return {
    linhas: titulos.length,
    colunas: t.querySelectorAll("thead th.col").length,
    marcas: t.querySelectorAll("td.marca input[type=checkbox]").length,
    // "Minha semana" escrito uma vez, e nao uma por papel.
    vezesQueUmNomeAparece: titulos.filter((x) => x === "Minha semana").length,
    editaveis: t.querySelectorAll("td.marca input:not(:disabled)").length,
    travadas: t.querySelectorAll("td.marca input:disabled").length,
  };
});
t("os papéis viram uma matriz, e não três listas", !!matrizPapeis, JSON.stringify(matrizPapeis));
t("uma linha por tela e uma coluna por papel",
  matrizPapeis.linhas === 11 && matrizPapeis.colunas === 3 && matrizPapeis.marcas === 33,
  JSON.stringify(matrizPapeis));
t("o nome de cada tela aparece uma vez, e não uma por papel",
  matrizPapeis.vezesQueUmNomeAparece === 1, String(matrizPapeis.vezesQueUmNomeAparece));
t("a gestora não consegue tirar Configurações de si mesma",
  matrizPapeis.travadas === 1 && matrizPapeis.editaveis === 32, JSON.stringify(matrizPapeis));

// Clicar continua mudando a permissão de verdade, e o menu junto.
const antesDoClique = await pg.evaluate(() => (PERMISSOES.cliente || []).indexOf("propostas") >= 0);
await pg.evaluate(() => casaAlternarTela("cliente", "propostas"));
await pg.waitForTimeout(400);
const depoisDoClique = await pg.evaluate(() => (PERMISSOES.cliente || []).indexOf("propostas") >= 0);
t("marcar na matriz muda a permissão de verdade", antesDoClique !== depoisDoClique,
  `${antesDoClique} -> ${depoisDoClique}`);
await pg.evaluate(() => casaAlternarTela("cliente", "propostas"));   // devolve como estava

/* Os níveis: a matriz, e o que ela deixou aparecer. */
await pg.evaluate(() => irPara("roteiros"));
await pg.waitForTimeout(900);
const matrizNiveis = await pg.evaluate(() => {
  const t = document.querySelector("#roteirosNiveis table.matriz");
  const titulos = t ? Array.from(t.querySelectorAll("tbody td[data-t] b")).map((c) => c.textContent.trim()) : [];
  return {
    linhas: titulos.length,
    colunas: t ? t.querySelectorAll("thead th.col").length : 0,
    vezesQueUmNomeAparece: titulos.filter((x) => x === "Precificação").length,
    // As oito vêm agrupadas pelas quatro fases do método.
    faixas: t ? t.querySelectorAll("tbody tr.grupo").length : 0,
    achado: (document.querySelector("#roteirosNiveis > p.dica") || {}).textContent || "",
    dobraDeValores: !!document.querySelector("#roteirosNiveis details"),
  };
});
t("os níveis viram uma matriz de oito linhas por três colunas",
  matrizNiveis.linhas === 8 && matrizNiveis.colunas === 3, JSON.stringify(matrizNiveis));
t("o nome de cada entrega aparece uma vez, e não uma por nível",
  matrizNiveis.vezesQueUmNomeAparece === 1, String(matrizNiveis.vezesQueUmNomeAparece));
t("as oito vêm agrupadas pelas quatro fases do método", matrizNiveis.faixas === 4,
  String(matrizNiveis.faixas));
t("dois níveis com o mesmo escopo passam a ser ditos em voz alta",
  /entregam exatamente a mesma coisa/.test(matrizNiveis.achado), matrizNiveis.achado.slice(0, 80));
t("e os valores saem da leitura para uma dobra", matrizNiveis.dobraDeValores);

/* As oito entregas: cor só na minoria. */
const cores = await pg.evaluate(() => {
  const conta = () => document.querySelectorAll("#roteirosEntregas > details .eti").length;
  const escrever = (quantas) => {
    const m = roteirosLer();
    ENTREGAS.forEach((e, i) => {
      m.roteiros[e.k] = Object.assign({}, m.roteiros[e.k],
        { definicaoPronto: i < quantas ? ["um critério"] : [] });
    });
    iqvGravar(CHAVES.metodo, m);
    DESENHO.roteiros();
    return conta();
  };
  return { zero: escrever(0), duas: escrever(2), seis: escrever(6), oito: escrever(8) };
});
t("com nenhuma escrita, nenhuma das oito ganha etiqueta", cores.zero === 0, String(cores.zero));
t("com duas escritas, a cor marca as duas, e não as seis", cores.duas === 2, String(cores.duas));
t("com seis escritas, a cor marca as duas que faltam", cores.seis === 2, String(cores.seis));
t("com as oito escritas, nenhuma etiqueta de novo", cores.oito === 0, String(cores.oito));

/* =====================================================================
   O eixo do "Dia a dia".

   Ele mentia: quatro linhas igualmente espacadas com o numero de cada uma
   arredondado. Com teto 4, escrevia 4, 3, 1, 0, e o 3 estava desenhado
   onde mora o 2,67. Isto confere a regra, e nao um retrato: degraus
   inteiros, iguais, e cobrindo o maior valor.
   ===================================================================== */
const eixos = await pg.evaluate(() => {
  const casos = [1, 2, 3, 4, 5, 6, 9, 12, 17, 37, 51, 99, 137, 250, 1234];
  return casos.map((c) => {
    const e = formEscala(c);
    const degraus = [];
    for (let k = 0; k <= e.divisoes; k++) degraus.push(e.topo - e.passo * k);
    return {
      valor: c,
      degraus: degraus,
      inteiros: degraus.every((v) => Number.isInteger(v)),
      iguais: degraus.every((v, k) => k === 0 || degraus[k - 1] - v === e.passo),
      cobre: e.topo >= c,
      fecha: degraus[degraus.length - 1] === 0,
    };
  });
});
t("o eixo tem degraus inteiros", eixos.every((e) => e.inteiros),
  JSON.stringify(eixos.filter((e) => !e.inteiros)));
t("e igualmente espacados, que era o defeito", eixos.every((e) => e.iguais),
  JSON.stringify(eixos.filter((e) => !e.iguais)));
t("o teto cobre o maior valor, e o eixo termina no zero",
  eixos.every((e) => e.cobre && e.fecha), JSON.stringify(eixos.filter((e) => !(e.cobre && e.fecha))));
t("com teto 4 ele conta de um em um, e nao 4, 3, 1",
  String(eixos.find((e) => e.valor === 4).degraus) === "4,3,2,1,0",
  String(eixos.find((e) => e.valor === 4).degraus));

/* Um periodo sem nenhum envio. Ate agora a tela dizia "o dia mais cheio
   foi 05/08, com 0" e desenhava o fio do pico apontando para o zero. */
await pg.evaluate(() => irPara("formulario"));
await pg.waitForTimeout(800);
const semEnvio = await pg.evaluate(() => {
  AO_VIVO.telas = {};                       // a batida repoe o dado de verdade
  FORM.aba = "medidas";
  FORM.medEstado = "ok";
  const dias = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date(2026, 7, 5 + i);
    dias.push({
      dia: d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" +
           String(d.getDate()).padStart(2, "0"),
      abriu: i === 25 ? 4 : 0, enviou: 0,
    });
  }
  FORM.med = { funil: { abriu: 4, comecou: 0, enviou: 0 }, tempo: {}, perguntas: [],
               por_dia: dias, por_aparelho: [], por_origem: [], por_referencia: [],
               por_plano: [], recusadas: {} };
  formDesenhar();
  const cartao = Array.from(document.querySelectorAll(".cartao"))
    .find((c) => (c.querySelector(".cartao-t") || {}).textContent?.indexOf("Dia a dia") === 0);
  const ponto = cartao && cartao.querySelector(".graf-ponto");
  return {
    frase: cartao ? (cartao.querySelector("p.dica") || {}).textContent || "" : "(sem cartão)",
    eixo: cartao ? Array.from(cartao.querySelectorAll(".graf-eixo span")).map((e) => e.textContent).join(" ") : "",
    temPico: !!(cartao && cartao.querySelector(".graf-ponto.pico")),
    larguraDoPonto: ponto ? ponto.offsetWidth : 0,
    alturaDoPonto: ponto ? ponto.offsetHeight : 0,
  };
});
t("sem nenhum envio, a tela nao anuncia um dia mais cheio com zero",
  !/dia mais cheio/.test(semEnvio.frase), semEnvio.frase.slice(0, 90));
t("ela diz que ninguem terminou, e o que olhar no lugar",
  /Ninguém terminou/.test(semEnvio.frase), semEnvio.frase.slice(0, 90));
t("e nao desenha o ponto do pico apontando para o zero", !semEnvio.temPico);
t("o eixo desse periodo conta de um em um", semEnvio.eixo === "4 3 2 1 0", semEnvio.eixo);
// O ponto e HTML, e nao um circulo dentro do SVG que estica: dentro dele
// ele saia oval no computador e virava tracinho no telefone.
t("os pontos do desenho sao redondos em qualquer largura",
  semEnvio.larguraDoPonto > 0 && semEnvio.larguraDoPonto === semEnvio.alturaDoPonto,
  `${semEnvio.larguraDoPonto} por ${semEnvio.alturaDoPonto}`);

t("nenhum erro de JavaScript em todo o caminho", erros.length === 0, erros.slice(0, 4).join(" | "));

console.log(`\n${ok} passaram, ${bad} falharam`);
await nav.close();
process.exit(bad ? 1 : 0);
