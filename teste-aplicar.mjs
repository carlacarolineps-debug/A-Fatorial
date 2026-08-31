import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import https from "node:https";
// Testes das rotas do formulário de aplicação.
//
// Sobe dois wrangler locais, bate nas seis rotas de verdade por HTTP e
// derruba os dois no fim. Roda no banco local; não encosta em produção.
//
// O que estes testes guardam, e por que valem o trabalho:
//   - a rota que a página pública lê abre para qualquer um, e não deixa
//     escapar recado interno, fiação de coluna nem pergunta desligada
//   - as três rotas com login ficam fechadas enquanto TEAM_DOMAIN e
//     ACCESS_AUD faltarem, passam a exigir login quando existirem, e
//     fazem o trabalho delas quando quem bate mostra um crachá bom
//   - uma aplicação vira UMA linha na mesa, com nome, e-mail e WhatsApp
//     nas colunas certas e as respostas com o título como chave
//   - reenvio depois de queda de rede atualiza a mesma linha, não duplica,
//     e não apaga a observação que a mesa escreveu no meio
//   - o que vem grande demais, torto ou de robô é recusado antes de virar
//     linha, e texto com marca de script é guardado como texto
//   - a rota de métrica nunca recebe o que a pessoa escreveu
//
// O segundo servidor existe para a outra metade da porta: com as duas
// variáveis preenchidas as rotas fechadas respondem 401 em vez de abrir,
// e com um crachá bom elas abrem e trabalham.
import { spawn, spawnSync } from "node:child_process";
import { setTimeout as espera } from "node:timers/promises";
import {
  FORMULARIO_FABRICA, podar, validarDefinicao, normalizarEventos,
} from "./src/aplicar.js";

// O segundo servidor guarda o banco dele num diretório próprio: dois
// wrangler rodando juntos não podem disputar o mesmo estado local.
const ESTADO_PORTA = ".wrangler/estado-aplicar";

const bancoLocal = (argumentos, onde = null) => spawnSync(
  "npx",
  ["wrangler", "d1", "execute", "ideia-que-vende", "--local",
   ...(onde ? ["--persist-to", onde] : []), ...argumentos],
  { stdio: "ignore" },
);

// O banco local nasce vazio num clone novo. As tabelas do formulário são
// as seis novas mais as que já existiam, e as duas listas de criação
// podem rodar quantas vezes for preciso.
//
// As versões publicadas são apagadas junto. Sem isso, quem publicasse uma
// vez pelo editor contra o servidor local passaria a ver as conferências
// da rota aberta vermelhas em toda rodada, acusando a poda de deixar
// passar o que na verdade alguém pôs no ar de propósito. Com a tabela
// limpa, a de fábrica volta a ser a que está no ar em toda rodada.
for (const onde of [null, ESTADO_PORTA]) {
  for (const arquivo of ["schema.sql", "schema-formulario.sql"]) {
    if (bancoLocal([`--file=${arquivo}`], onde).status !== 0) {
      console.error(`não consegui criar as tabelas de ${arquivo} no banco local`);
      process.exit(1);
    }
  }
  bancoLocal(["--command", "delete from formulario_versoes"], onde);
}

// O banco do segundo servidor é só deste arquivo: nada de ninguém mora
// ali, e ele começa limpo. As contas de funil e de distribuição de opções
// dizem números exatos, e sem isso a segunda rodada da mesma máquina
// veria o dobro de tudo e acusaria os números de estarem errados quando o
// errado seria o teste.
bancoLocal(["--command", [
  "delete from formulario_visitas",
  "delete from formulario_eventos",
  "delete from formulario_escolhas",
  "delete from formulario_baldes",
  "delete from formulario_dia",
  "delete from webhook_log",
  "delete from leads",
].join("; ")], ESTADO_PORTA);

/* --------------------------------------------------------------------
   O crachá da porta.

   O Cloudflare Access assina um crachá e o Worker confere a assinatura
   contra as chaves públicas que o time publica. Para exercitar o que
   existe DEPOIS da porta, e não só a porta, o time daqui é um servidor de
   chaves que sobe nesta mesma máquina: ele publica a chave pública do par
   sorteado aqui, e o crachá é assinado com a privada.

   O Worker vai buscar essas chaves por conexão segura, então o servidor
   precisa de um certificado, e o wrangler precisa saber que esse
   certificado vale. É só isso que NODE_EXTRA_CA_CERTS faz aqui, e ele
   vale só para o processo que este arquivo levanta.
   -------------------------------------------------------------------- */
const PORTA_DAS_CHAVES = 8791;
const TIME_DE_TESTE = `localhost:${PORTA_DAS_CHAVES}`;
const ETIQUETA = "aud-de-teste";
const QUEM_ENTRA = "carla@exemplo.com.br";

const pastaDaPorta = fs.mkdtempSync(path.join(os.tmpdir(), "iqv-porta-"));
const certificado = path.join(pastaDaPorta, "cert.pem");
const chaveDoCertificado = path.join(pastaDaPorta, "chave.pem");
const certificadoFeito = spawnSync("openssl", [
  "req", "-x509", "-newkey", "rsa:2048", "-keyout", chaveDoCertificado,
  "-out", certificado, "-days", "1", "-nodes", "-subj", "/CN=localhost",
  "-addext", "subjectAltName=DNS:localhost",
], { stdio: "ignore" }).status === 0;

const parDeChaves = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
const chavesPublicadas = JSON.stringify({
  keys: [{ ...parDeChaves.publicKey.export({ format: "jwk" }), kid: "porta", alg: "RS256", use: "sig" }],
});

let servidorDeChaves = null;
if (certificadoFeito) {
  servidorDeChaves = https.createServer(
    { key: fs.readFileSync(chaveDoCertificado), cert: fs.readFileSync(certificado) },
    (pedido, resposta) => {
      resposta.writeHead(200, { "content-type": "application/json" });
      resposta.end(chavesPublicadas);
    },
  );
  await new Promise((pronto) => servidorDeChaves.listen(PORTA_DAS_CHAVES, pronto));
}

const emBase64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const cracha = (trocas = {}) => {
  const cabeca = emBase64({ alg: "RS256", kid: "porta", typ: "JWT" });
  const corpo = emBase64({
    iss: `https://${TIME_DE_TESTE}`,
    aud: [ETIQUETA],
    email: QUEM_ENTRA,
    exp: Math.floor(Date.now() / 1000) + 600,
    ...trocas,
  });
  const assinatura = crypto
    .sign("sha256", Buffer.from(`${cabeca}.${corpo}`), parDeChaves.privateKey)
    .toString("base64url");
  return `${cabeca}.${corpo}.${assinatura}`;
};
const comCracha = (trocas = {}) => ({ "cf-access-jwt-assertion": cracha(trocas) });

// Portas próprias: assim este arquivo e o teste.mjs podem rodar um atrás
// do outro sem esperar porta ser liberada.
const servidor = spawn(
  "npx",
  ["wrangler", "dev", "--port", "8789", "--local", "--inspector-port", "9239"],
  { stdio: ["ignore", "pipe", "pipe"], detached: true },
);

// "npx" cria um neto, e matar só o filho deixaria o wrangler vivo
// segurando a porta: a rodada seguinte não subiria. detached faz do filho
// o líder do grupo, e o sinal negativo derruba o grupo inteiro.
const derrubar = () => { try { process.kill(-servidor.pid, "SIGKILL"); } catch {} };
process.on("exit", derrubar);
process.on("SIGINT", () => { derrubar(); process.exit(1); });

// O mesmo Worker, com a porta de entrada configurada. Sem ele, o 401
// nunca é exercitado: só o 503 de configuração faltando seria, e nada do
// que as três rotas fazem depois de a porta abrir chegaria a rodar.
const servidorPorta = spawn(
  "npx",
  ["wrangler", "dev", "--port", "8790", "--local", "--inspector-port", "9240",
   "--persist-to", ESTADO_PORTA,
   "--var", `TEAM_DOMAIN:${TIME_DE_TESTE}`, "--var", `ACCESS_AUD:${ETIQUETA}`],
  {
    stdio: ["ignore", "pipe", "pipe"], detached: true,
    env: { ...process.env, NODE_EXTRA_CA_CERTS: certificado },
  },
);
const derrubarPorta = () => { try { process.kill(-servidorPorta.pid, "SIGKILL"); } catch {} };
process.on("exit", derrubarPorta);

const pronto = (proc, nome) => new Promise((res, rej) => {
  const prazo = setTimeout(() => rej(new Error(`${nome} não subiu em 90s`)), 90_000);
  proc.stdout.on("data", (c) => {
    if (String(c).includes("Ready on")) { clearTimeout(prazo); res(); }
  });
});
await Promise.all([
  pronto(servidor, "wrangler dev"),
  pronto(servidorPorta, "wrangler dev (porta configurada)"),
]);
await espera(500);

const B = "http://localhost:8789";
const BP = "http://localhost:8790";   // o mesmo Worker, com TEAM_DOMAIN e ACCESS_AUD preenchidos
let ok = 0, bad = 0;
const t = (nome, cond, extra = "") => {
  (cond ? ok++ : bad++);
  console.log(`${cond ? "PASS" : "FALHOU"}  ${nome}${extra ? "   " + extra : ""}`);
};

/* --------------------------------------------------------------------
   A mesa lê as aplicações pela rota que fica atrás do Cloudflare Access.
   Algumas conferências são feitas pela MESMA consulta que aquela rota
   faz, direto no banco local: as mesmas colunas, e as respostas lidas do
   mesmo jeito.
   -------------------------------------------------------------------- */
const consultarEm = (sql, onde) => {
  const saida = spawnSync(
    "npx",
    ["wrangler", "d1", "execute", "ideia-que-vende", "--local",
     ...(onde ? ["--persist-to", onde] : []), "--json", "--command", sql],
    { encoding: "utf8" },
  );
  const texto = saida.stdout ?? "";
  const comeco = texto.indexOf("[");
  if (comeco < 0) return [];
  try {
    return JSON.parse(texto.slice(comeco))[0]?.results ?? [];
  } catch {
    return [];
  }
};
const consultar = (sql) => consultarEm(sql, null);

const aplicacaoDaMesa = (envio) => {
  const linhas = consultar(`
    select id, criado_em, atualizado_em, nome, email, whatsapp,
           plano, origem, status, observacoes, respostas, typeform_form_id
    from leads where typeform_response_id = 'aplicar:${envio}'
  `.replace(/\s+/g, " "));
  if (!linhas.length) return null;
  const l = linhas[0];
  return { ...l, respostas: JSON.parse(l.respostas || "{}") };
};

// Cada cenário recebe um endereço próprio. O endereço não é gravado em
// lugar nenhum: ele só serve para o freio saber que uma tentativa veio do
// mesmo lugar da outra, e endereços separados impedem que o freio de um
// teste sobre para o seguinte.
//
// O sorteio do começo troca a cada rodada porque o freio vale por hora:
// endereços fixos fariam a segunda rodada da mesma hora nascer freada.
// A faixa é a reservada para documentação, e nunca é de ninguém.
const rodada = crypto.randomInt(0x10000).toString(16);
let contaLugar = 0;
const outroLugar = () => `2001:db8:${rodada}:${(contaLugar += 1).toString(16)}::1`;

// Uma aplicação inteira, como a página manda: a chave estável de cada
// pergunta, e a chave da opção escolhida nas de escolha. A de fábrica é a
// versão zero, e é ela que está no ar enquanto ninguém publicou nada.
const aplicacao = (mudancas = {}) => {
  const { respostas, ...resto } = mudancas;
  return {
    envio: crypto.randomUUID(),
    versao: 0,
    plano: "pro",
    origem: "landing",
    parcial: false,
    parou_em: null,
    sobre_voce_extra: "",
    ...resto,
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
      ...(respostas ?? {}),
    },
  };
};

// Ler o banco pelo caminho de fora leva alguns segundos, e nesse tempo o
// servidor às vezes fecha a conexão que ficou parada. A segunda tentativa
// resolve isso e não esconde defeito nenhum: pedido que falha de verdade
// falha nas duas, e reenvio com o mesmo identificador é justamente o que
// esta rota trata como uma coisa só.
// Enquanto os seis caminhos não estiverem ligados no Worker, o servidor
// devolve a página de "não encontrei" no lugar da resposta. Ler isso sem
// susto faz o teste falhar dizendo qual conferência não passou, em vez de
// estourar na primeira linha e esconder as outras.
const lerJson = async (r) => {
  try {
    return await r.json();
  } catch {
    return {};
  }
};

const chamar = async (endereco, opcoes) => {
  try {
    return await fetch(endereco, opcoes);
  } catch {
    return fetch(endereco, opcoes);
  }
};

const enviarPara = (base, corpo, lugar) => chamar(`${base}/api/resposta`, {
  method: "POST",
  headers: { "content-type": "application/json", "cf-connecting-ip": lugar },
  body: typeof corpo === "string" ? corpo : JSON.stringify(corpo),
});
const enviar = (corpo, lugar) => enviarPara(B, corpo, lugar);

const passosPara = (base, corpo, lugar) => chamar(`${base}/api/evento`, {
  method: "POST",
  headers: { "content-type": "application/json", "cf-connecting-ip": lugar },
  body: typeof corpo === "string" ? corpo : JSON.stringify(corpo),
});
const passos = (corpo, lugar) => passosPara(B, corpo, lugar);

let r, j;

// ---------- a definição que a página pública lê ----------
r = await chamar(`${B}/api/formulario`);
j = await lerJson(r);
// Enquanto os caminhos não estiverem ligados, isto vem vazio, e cada
// conferência abaixo falha dizendo o que falta em vez de estourar.
const noAr = j.formulario ?? {};
const perguntasNoAr = Array.isArray(noAr.perguntas) ? noAr.perguntas : [];
t("formulário: a rota abre para quem não entrou em lugar nenhum", r.status === 200 && j.ok === true, `status=${r.status}`);
t("formulário: vem com as perguntas e a abertura",
  perguntasNoAr.length > 0 && !!noAr.abertura?.botao);
t("formulário: as nove perguntas, na ordem que a dona confirmou",
  perguntasNoAr.map((p) => p.chave).join(",") === [
    "nome", "email", "whatsapp", "atuacao", "o_que_transformar",
    "estagio", "atende_clientes", "faturamento", "objetivo",
  ].join(","),
  perguntasNoAr.map((p) => p.chave).join(","));
t("formulário: o estágio da ideia é a sexta pergunta",
  perguntasNoAr[5]?.titulo === "Em que estágio sua ideia está?", perguntasNoAr[5]?.titulo);
t("formulário: recado interno não viaja para a rua",
  perguntasNoAr.length > 0 && !JSON.stringify(noAr).includes('"nota"') && !("publicado_por" in noAr));
t("formulário: a fiação que liga pergunta a coluna também não",
  perguntasNoAr.length > 0 && !perguntasNoAr.some((p) => "papel" in p));
t("formulário: a resposta não fica guardada em cache",
  r.headers.get("cache-control") === "no-store",
  r.headers.get("cache-control") || "(ausente)");
t("formulário: cada pergunta traz o texto que a pessoa lê quando erra",
  perguntasNoAr.length > 0 && perguntasNoAr.every((p) => typeof p.erro === "string"));

r = await chamar(`${B}/api/formulario`, { method: "POST" });
j = await lerJson(r);
t("formulário: método que não existe nesse caminho  405", r.status === 405 && j.erro === "método", `status=${r.status}`);

r = await chamar(`${B}/api/inventado`);
t("um caminho de dados que não existe  404", r.status === 404, `status=${r.status}`);

// ---------- gravar a definição: só com login ----------
const definicaoBoa = JSON.stringify({
  base_versao: 0, publicar: true, nota: "tentativa sem login",
  definicao: FORMULARIO_FABRICA,
});

r = await chamar(`${B}/api/formulario`, { method: "PUT", body: definicaoBoa });
j = await lerJson(r);
t("gravar formulário: sem a configuração da porta  503 dizendo o que falta",
  r.status === 503 && /TEAM_DOMAIN/.test(j.erro) && /ACCESS_AUD/.test(j.erro), JSON.stringify(j));
// A conferência olha só o que ESTE pedido gravaria. Contar a tabela
// inteira acusaria a porta de ter deixado passar sempre que alguém
// tivesse publicado alguma coisa pelo editor contra o servidor local.
t("gravar formulário: e não deixa passar, nada do que ele mandava foi gravado",
  consultar("select count(*) as quantas from formulario_versoes where nota = 'tentativa sem login'")[0]?.quantas === 0);

r = await chamar(`${BP}/api/formulario`, { method: "PUT", body: definicaoBoa });
j = await lerJson(r);
t("gravar formulário: com a porta configurada e sem login  401",
  r.status === 401 && j.erro === "não autorizado", JSON.stringify(j));

r = await chamar(`${BP}/api/formulario`, {
  method: "PUT", headers: { "cf-access-jwt-assertion": "token.forjado.aqui" }, body: definicaoBoa,
});
t("gravar formulário: login forjado  401", r.status === 401, `status=${r.status}`);

r = await chamar(`${B}/api/formulario/versoes`);
j = await lerJson(r);
t("versões: sem a configuração da porta  503", r.status === 503 && /TEAM_DOMAIN/.test(j.erro), JSON.stringify(j));

r = await chamar(`${BP}/api/formulario/versoes`);
t("versões: com a porta configurada e sem login  401", r.status === 401, `status=${r.status}`);

r = await chamar(`${B}/api/formulario/versoes`, { method: "DELETE" });
t("versões: método que não existe nesse caminho  405", r.status === 405, `status=${r.status}`);

// ---------- os números: só com login ----------
r = await chamar(`${B}/api/metricas`);
j = await lerJson(r);
t("números: sem a configuração da porta  503 dizendo o que falta",
  r.status === 503 && /TEAM_DOMAIN/.test(j.erro), JSON.stringify(j));

r = await chamar(`${BP}/api/metricas`);
j = await lerJson(r);
t("números: com a porta configurada e sem login  401",
  r.status === 401 && j.erro === "não autorizado", JSON.stringify(j));

r = await chamar(`${BP}/api/metricas`, { headers: { "cf-access-jwt-assertion": "token.forjado.aqui" } });
t("números: login forjado  401", r.status === 401, `status=${r.status}`);

r = await chamar(`${B}/api/metricas`, { method: "POST" });
t("números: método que não existe nesse caminho  405", r.status === 405, `status=${r.status}`);

r = await chamar(`${BP}/api/metricas`);
const corpoBarrado = await r.text();
t("números: quem é barrado não recebe nada além do motivo", corpoBarrado.length < 120, `${corpoBarrado.length} bytes`);

/* ====================================================================
   A porta que abre, e o que existe atrás dela.

   Até aqui só a portaria foi exercitada. Nada do que as três rotas fazem
   depois dela chegava a rodar: as quinze consultas dos números, a conta
   de versão de quem publica e a contagem de respostas por versão. Como as
   três terminam num catch que devolve uma frase, um erro de coluna
   atravessaria todas as conferências e chegaria na Carla como "não
   consegui ler os números agora", sem nada no caminho para pegar antes.
   ==================================================================== */

// Uma conferência antes das outras, para uma quebra aqui dizer o próprio
// nome em vez de virar dez linhas vermelhas acusando o Worker.
r = await chamar(`${BP}/api/formulario/versoes`, { headers: comCracha() });
const portaAbriu = r.status === 200;
t("a porta abre para quem mostra um crachá bom",
  portaAbriu,
  portaAbriu ? "" : (certificadoFeito
    ? `status=${r.status}. O Worker não conseguiu ler o servidor de chaves desta máquina, então nenhum crachá passa.`
    : "não consegui criar o certificado do servidor de chaves. O openssl está instalado?"));

j = await lerJson(r);
t("com a tabela vazia, o editor recebe a de fábrica inteira, com a fiação da mesa",
  j.atual === 0 && Array.isArray(j.versoes) && j.versoes.length === 0 &&
  j.formulario?.perguntas?.some((p) => p.papel === "nome"),
  JSON.stringify({ atual: j.atual, versoes: j.versoes?.length, papeis: (j.formulario?.perguntas ?? []).filter((p) => p.papel).map((p) => p.papel) }));

r = await chamar(`${BP}/api/metricas`, { headers: comCracha({ exp: 1 }) });
t("crachá vencido não entra, mesmo com a assinatura boa", r.status === 401, `status=${r.status}`);

r = await chamar(`${BP}/api/metricas`, { headers: comCracha({ aud: ["etiqueta-de-outra-aplicacao"] }) });
t("crachá de outra aplicação do mesmo time não entra", r.status === 401, `status=${r.status}`);

r = await chamar(`${BP}/api/metricas`, { headers: comCracha({ iss: "https://outro-time.invalid" }) });
t("crachá de outro time não entra", r.status === 401, `status=${r.status}`);

// ---------- publicar, e o que a publicação muda ----------
const publicar = (corpo) => chamar(`${BP}/api/formulario`, {
  method: "PUT",
  headers: { ...comCracha(), "content-type": "application/json" },
  body: JSON.stringify(corpo),
});

r = await publicar({ base_versao: 0, publicar: true, nota: "as nove primeiras", definicao: FORMULARIO_FABRICA });
j = await lerJson(r);
t("a primeira publicação vira a versão 1, carimbada com quem publicou",
  r.status === 200 && j.versao === 1 && !!j.publicado_em && j.publicado_por === QUEM_ENTRA,
  JSON.stringify(j));

r = await chamar(`${BP}/api/formulario`);
j = await lerJson(r);
t("e a rota aberta passa a servir a versão publicada",
  j.formulario?.versao === 1 && j.formulario?.perguntas?.length === 9,
  `versão ${j.formulario?.versao} com ${j.formulario?.perguntas?.length} perguntas`);

r = await chamar(`${BP}/api/formulario/versoes`, { headers: comCracha() });
j = await lerJson(r);
t("a lista de versões conta as perguntas e quantas respostas cada uma recebeu",
  j.atual === 1 && j.versoes?.length === 1 && j.versoes[0].perguntas === 9 &&
  j.versoes[0].respostas_recebidas === 0 && j.versoes[0].nota === "as nove primeiras",
  JSON.stringify(j.versoes?.[0]));

r = await chamar(`${BP}/api/formulario/versoes?versao=1`, { headers: comCracha() });
j = await lerJson(r);
t("uma versão pedida volta inteira, sem poda, para quem edita",
  r.status === 200 && j.formulario?.perguntas?.length === 9 &&
  j.formulario.perguntas.some((p) => p.papel === "whatsapp"), `status=${r.status}`);

r = await chamar(`${BP}/api/formulario/versoes?versao=99`, { headers: comCracha() });
t("uma versão que não existe  404", r.status === 404, `status=${r.status}`);
r = await chamar(`${BP}/api/formulario/versoes?versao=abc`, { headers: comCracha() });
t("um número de versão que não é número  400", r.status === 400, `status=${r.status}`);

r = await publicar({ base_versao: 0, publicar: true, nota: "editando em cima do velho", definicao: FORMULARIO_FABRICA });
j = await lerJson(r);
t("quem publica em cima de uma versão vencida é recusado, e recebe a nova inteira",
  r.status === 409 && j.atual === 1 && j.formulario?.perguntas?.length === 9,
  JSON.stringify({ status: r.status, atual: j.atual, erro: j.erro }));

r = await publicar({ base_versao: 1, publicar: false, nota: "primeiro rascunho", definicao: FORMULARIO_FABRICA });
j = await lerJson(r);
const numeroDoRascunho = j.versao;
t("o rascunho é gravado sem data de publicação",
  r.status === 200 && j.versao === 2 && j.publicado_em === null, JSON.stringify(j));

r = await chamar(`${BP}/api/formulario`);
j = await lerJson(r);
t("e quem abre o formulário continua vendo a versão que está no ar",
  j.formulario?.versao === 1, `versão ${j.formulario?.versao}`);

r = await publicar({ base_versao: 1, publicar: false, nota: "segundo rascunho", definicao: FORMULARIO_FABRICA });
j = await lerJson(r);
t("um rascunho novo sobrescreve o anterior em vez de virar outro número",
  r.status === 200 && j.versao === numeroDoRascunho,
  `${j.versao} contra ${numeroDoRascunho}`);

r = await publicar({ base_versao: 1, publicar: true, nota: "publicando o rascunho", definicao: FORMULARIO_FABRICA });
j = await lerJson(r);
t("publicar o rascunho carimba a data nele, sem criar número novo",
  r.status === 200 && j.versao === numeroDoRascunho && !!j.publicado_em, JSON.stringify(j));

const semNome = structuredClone(FORMULARIO_FABRICA);
semNome.perguntas = semNome.perguntas.map((p) => (p.papel === "nome" ? { ...p, papel: null } : p));
r = await publicar({ base_versao: 2, publicar: true, nota: "sem quem guarda o nome", definicao: semNome });
j = await lerJson(r);
t("uma definição sem a pergunta que guarda o nome é recusada, com a frase para gente ler",
  r.status === 422 && /nome/.test(j.erro ?? "") && !/[{}<>]/.test(j.erro ?? ""), JSON.stringify(j));

r = await chamar(`${BP}/api/formulario/versoes`, { headers: comCracha() });
j = await lerJson(r);
t("e a recusa não deixou versão nenhuma para trás",
  j.versoes?.length === 2, `${j.versoes?.length} versões`);

// ---------- os números, com gente de verdade passando pelo formulário ----------
// Os passos e a aplicação entram pelas rotas abertas do MESMO servidor, e
// não por SQL escrito à mão: assim o que os números leem é exatamente o
// que a página grava.
const visitaQueTerminou = crypto.randomUUID();
const visitaQueParou = crypto.randomUUID();
const lugarDosNumeros = outroLugar();

await passosPara(BP, {
  visita: visitaQueTerminou, versao: 1,
  contexto: { aparelho: "celular", origem: "instagram", campanha: "agosto", referencia: "instagram.com", plano: "pro" },
  eventos: [
    { seq: 1, tipo: "abriu", chave: null, ordem: null, ms: 0 },
    { seq: 2, tipo: "comecou", chave: null, ordem: null, ms: 0 },
    { seq: 3, tipo: "viu", chave: "nome", ordem: 1, ms: 0 },
    { seq: 4, tipo: "respondeu", chave: "nome", ordem: 1, ms: 8000 },
    { seq: 5, tipo: "viu", chave: "email", ordem: 2, ms: 0 },
    { seq: 6, tipo: "respondeu", chave: "email", ordem: 2, ms: 6000 },
    { seq: 7, tipo: "revisou", chave: null, ordem: null, ms: 0 },
    { seq: 8, tipo: "enviou", chave: null, ordem: null, ms: 190000 },
  ],
}, lugarDosNumeros);

await passosPara(BP, {
  visita: visitaQueParou, versao: 1,
  contexto: { aparelho: "computador", origem: "direto", campanha: null, referencia: null, plano: null },
  eventos: [
    { seq: 1, tipo: "abriu", chave: null, ordem: null, ms: 0 },
    { seq: 2, tipo: "comecou", chave: null, ordem: null, ms: 0 },
    { seq: 3, tipo: "viu", chave: "nome", ordem: 1, ms: 0 },
    { seq: 4, tipo: "respondeu", chave: "nome", ordem: 1, ms: 9000 },
    { seq: 5, tipo: "viu", chave: "email", ordem: 2, ms: 0 },
    { seq: 6, tipo: "erro_campo", chave: "email", ordem: 2, ms: 0, detalhe: "formato" },
  ],
}, lugarDosNumeros);

const aplicacaoDosNumeros = aplicacao({ versao: 1 });
r = await enviarPara(BP, aplicacaoDosNumeros, outroLugar());
j = await lerJson(r);
t("uma aplicação da versão publicada é aceita pelo servidor da porta",
  r.status === 200 && Number.isInteger(j.lead_id), JSON.stringify(j));

r = await chamar(`${BP}/api/metricas`, { headers: comCracha() });
const numeros = await lerJson(r);
t("os números respondem para quem entrou", r.status === 200 && numeros.ok === true, `status=${r.status}`);
t("o funil conta visitas, e não passos",
  numeros.funil?.abriu === 2 && numeros.funil?.comecou === 2 &&
  numeros.funil?.revisou === 1 && numeros.funil?.enviou === 1 &&
  numeros.funil?.abandono === 1,
  JSON.stringify(numeros.funil));
t("e a conta de quem termina é enviou sobre começou, com três casas",
  numeros.funil?.conclusao_sobre_comecou === 0.5, String(numeros.funil?.conclusao_sobre_comecou));
t("o tempo até enviar sai do que o navegador mediu",
  numeros.tempo?.amostra === 1 && numeros.tempo?.mediana_ms === 190000, JSON.stringify(numeros.tempo));

const porChave = Object.fromEntries((numeros.perguntas ?? []).map((p) => [p.chave, p]));
t("pergunta a pergunta, quem viu e quem respondeu",
  porChave.nome?.viu === 2 && porChave.nome?.respondeu === 2 &&
  porChave.email?.viu === 2 && porChave.email?.respondeu === 1,
  JSON.stringify({ nome: porChave.nome, email: porChave.email }));
t("e onde a página recusou o que a pessoa escreveu",
  porChave.email?.erro_campo === 1 && porChave.email?.abandonou === 1,
  JSON.stringify(porChave.email));
t("a pergunta que mais perde gente é apontada pelo nome",
  numeros.pior_pergunta?.chave === "email", JSON.stringify(numeros.pior_pergunta));
t("a pergunta traz o título que a pessoa leu, e não a chave",
  porChave.faturamento?.titulo === "Faixa de faturamento mensal", porChave.faturamento?.titulo);
t("a distribuição das opções vem do envio aceito, e não de passo forjável",
  porChave.faturamento?.opcoes?.find((o) => o.chave === "de_15k_a_50k")?.quantas === 1,
  JSON.stringify(porChave.faturamento?.opcoes?.map((o) => `${o.chave}:${o.quantas}`)));
t("os números separam aparelho, origem e quem indicou",
  numeros.por_aparelho?.some((a) => a.aparelho === "celular" && a.visitas === 1) &&
  numeros.por_origem?.some((o) => o.origem === "instagram") &&
  numeros.por_referencia?.some((v) => v.veio_de === "instagram.com"),
  JSON.stringify({ aparelho: numeros.por_aparelho, origem: numeros.por_origem }));
t("e a série por dia tem um dia com as duas visitas",
  (numeros.por_dia ?? []).some((d) => d.abriu === 2),
  JSON.stringify((numeros.por_dia ?? []).filter((d) => d.abriu > 0)));
t("a resposta diz de quando ela foi lida, sem prometer nada de instantâneo",
  /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(numeros.lido_em ?? ""), numeros.lido_em);

r = await chamar(`${BP}/api/metricas?de=2026-13-40&ate=2026-08-31`, { headers: comCracha() });
j = await lerJson(r);
t("uma data que não existe é recusada, com frase e sem código",
  r.status === 400 && typeof j.erro === "string" && !/[{}<>]/.test(j.erro), JSON.stringify(j));

r = await chamar(`${BP}/api/metricas?de=2020-01-01&ate=2026-08-31`, { headers: comCracha() });
t("um período maior que um ano também", r.status === 400, `status=${r.status}`);

r = await chamar(`${BP}/api/formulario/versoes`, { headers: comCracha() });
j = await lerJson(r);
t("e a lista de versões passa a contar a aplicação que chegou",
  j.versoes?.find((v) => v.versao === 1)?.respostas_recebidas === 1,
  JSON.stringify(j.versoes?.map((v) => `v${v.versao}:${v.respostas_recebidas}`)));

// ---------- uma aplicação inteira vira uma linha na mesa ----------
const completa = aplicacao();
r = await enviar(completa, outroLugar());
j = await lerJson(r);
t("aplicação completa: aceita, com o número da linha",
  r.status === 200 && j.ok === true && Number.isInteger(j.lead_id), JSON.stringify(j));
const primeiroId = j.lead_id;

const naMesa = aplicacaoDaMesa(completa.envio);
t("a aplicação chega na mesa", !!naMesa, naMesa ? `linha ${naMesa.id}` : "não achei");
t("nome, e-mail e WhatsApp nas colunas certas",
  naMesa?.nome === "Marina Alves" &&
  naMesa?.email === "marina@exemplo.com.br" &&
  naMesa?.whatsapp === "+55 11 98888-7777",
  `${naMesa?.nome} | ${naMesa?.email} | ${naMesa?.whatsapp}`);
t("as respostas guardam o título da pergunta como chave, na ordem em que foram feitas",
  JSON.stringify(Object.keys(naMesa?.respostas ?? {})) === JSON.stringify([
    "Nome completo", "E-mail", "WhatsApp", "Atuação profissional",
    "O que você quer transformar em produto?", "Em que estágio sua ideia está?",
    "Você já atende clientes nesse tema?", "Faixa de faturamento mensal",
    "Seu principal objetivo",
  ]), Object.keys(naMesa?.respostas ?? {}).join(" | "));
t("a escolha é guardada pelo texto que a pessoa leu, não pela chave",
  naMesa?.respostas["Faixa de faturamento mensal"] === "R$ 15 mil a R$ 50 mil",
  naMesa?.respostas["Faixa de faturamento mensal"]);
t("o andamento nasce novo e a observação nasce vazia",
  naMesa?.status === "novo" && !naMesa?.observacoes, `${naMesa?.status} | ${naMesa?.observacoes}`);
t("o nível e a origem da página vão junto",
  naMesa?.plano === "pro" && naMesa?.origem === "landing", `${naMesa?.plano} | ${naMesa?.origem}`);
t("a mesa sabe qual formulário a pessoa respondeu",
  naMesa?.typeform_form_id === "aplicar:v0", naMesa?.typeform_form_id);

// A mesa anota alguma coisa, e então a mesma aplicação chega de novo:
// é o repique depois de queda de rede, e ele não pode apagar a anotação
// nem virar uma segunda aplicação.
consultar(`update leads set observacoes = 'ligar na terça' where id = ${primeiroId}`);
r = await enviar(completa, outroLugar());
j = await lerJson(r);
t("o mesmo envio duas vezes atualiza a mesma linha, não cria outra",
  r.status === 200 && j.lead_id === primeiroId, JSON.stringify(j));
const depoisDoRepique = aplicacaoDaMesa(completa.envio);
t("o repique não apaga o que a mesa anotou no meio",
  depoisDoRepique?.observacoes === "ligar na terça", depoisDoRepique?.observacoes);
t("e continua sendo uma aplicação só",
  consultar(`select count(*) as quantas from leads where typeform_response_id = 'aplicar:${completa.envio}'`)[0]?.quantas === 1);

// ---------- o que é recusado antes de virar linha ----------
const gigante = aplicacao({ respostas: { o_que_transformar: "a".repeat(2500) } });
r = await enviar(gigante, outroLugar());
j = await lerJson(r);
t("resposta grande demais para o campo é recusada, com o texto daquela pergunta",
  r.status === 422 && j.campos?.[0]?.chave === "o_que_transformar" && j.campos[0].erro.length > 10,
  JSON.stringify(j.campos?.[0] ?? j));
t("e a recusa não deixa linha na mesa", aplicacaoDaMesa(gigante.envio) === null);

r = await enviar(JSON.stringify({ ...aplicacao(), recheio: "x".repeat(400_000) }), outroLugar());
j = await lerJson(r);
t("corpo grande demais é recusado sem nem ser lido  413", r.status === 413 && j.ok === false, JSON.stringify(j));

const semObrigatorias = aplicacao({ respostas: { email: "", o_que_transformar: "" } });
r = await enviar(semObrigatorias, outroLugar());
j = await lerJson(r);
t("aplicação sem as respostas obrigatórias é recusada, com todas as faltas de uma vez",
  r.status === 422 && (j.campos ?? []).map((c) => c.chave).join(",") === "email,o_que_transformar",
  JSON.stringify(j.campos));
t("e a frase da recusa é para gente ler, sem código",
  typeof j.erro === "string" && /precisa|precisam/.test(j.erro) && !/[{}<>]/.test(j.erro), j.erro);

const opcaoInventada = aplicacao({ respostas: { faturamento: "bilionario" } });
r = await enviar(opcaoInventada, outroLugar());
j = await lerJson(r);
t("escolha que não existe na pergunta é recusada",
  r.status === 422 && j.campos?.[0]?.chave === "faturamento", JSON.stringify(j.campos));

const torta = aplicacao();
torta.envio = "1234";
r = await enviar(torta, outroLugar());
t("aplicação sem identificação de envio  400", r.status === 400, `status=${r.status}`);

r = await enviar("isto não é json", outroLugar());
t("corpo que não dá para ler  400", r.status === 400, `status=${r.status}`);

r = await chamar(`${B}/api/resposta`);
t("aplicação: método que não existe nesse caminho  405", r.status === 405, `status=${r.status}`);

// ---------- texto com marca de script é texto, e nada mais ----------
const veneno = 'Marina <script>alert("oi")</script> Alves';
const comHtml = aplicacao({
  respostas: {
    nome: veneno,
    o_que_transformar: 'Quero <b>vender</b> mentoria & consultoria para <img src=x onerror="alert(1)"> quem começa.',
  },
});
r = await enviar(comHtml, outroLugar());
j = await lerJson(r);
t("texto com marca de script é aceito como texto", r.status === 200 && j.ok === true, JSON.stringify(j));
const guardado = aplicacaoDaMesa(comHtml.envio);
t("e chega na mesa igualzinho, sem nada apagado e sem nada executado",
  guardado?.nome === veneno && guardado?.respostas["Nome completo"] === veneno,
  JSON.stringify(guardado?.nome));
t("o texto longo também chega inteiro",
  (guardado?.respostas["O que você quer transformar em produto?"] ?? "").includes("<img src=x onerror="));

// ---------- a armadilha do robô ----------
const robo = aplicacao({ sobre_voce_extra: "http://compre-aqui.exemplo" });
r = await enviar(robo, outroLugar());
j = await lerJson(r);
t("aplicação de robô recebe a mesma resposta de sempre, e assim ele não aprende a desviar",
  r.status === 200 && j.ok === true && j.lead_id === null, JSON.stringify(j));
t("mas não vira linha na mesa", aplicacaoDaMesa(robo.envio) === null);
t("e fica registrada, para o descarte ter dono",
  (consultar("select count(*) as quantas from webhook_log where origem = 'formulario' and erro = 'armadilha'")[0]?.quantas ?? 0) > 0);

// ---------- o freio de quem insiste ----------
// A janela do balde é a hora do relógio. Começar o bloco às 20h59m57s
// faria as três primeiras contarem numa janela e as três seguintes na
// outra, e a sexta passaria: a linha viraria vermelha em cima de código
// que está certo. Quando a hora vira no meio, o bloco é refeito; ela não
// vira duas vezes seguidas em seis chamadas.
const janelaDaHora = () => Math.floor(Date.now() / 3600e3);
const medirOFreio = async () => {
  const lugar = outroLugar();
  const comecou = janelaDaHora();
  const respostas = [];
  for (let i = 0; i < 6; i++) {
    respostas.push((await enviar(aplicacao(), lugar)).status);
  }
  return { lugar, respostas, virouAHora: janelaDaHora() !== comecou };
};
let freio = await medirOFreio();
if (freio.virouAHora) freio = await medirOFreio();
t("cinco aplicações do mesmo lugar passam, a sexta é freada",
  freio.respostas.slice(0, 5).every((s) => s === 200) && freio.respostas[5] === 429,
  freio.respostas.join(","));
j = await lerJson(await enviar(aplicacao(), freio.lugar));
t("e quem foi freado lê o motivo, sem código",
  j.erro === "muitas tentativas seguidas deste mesmo lugar" && j.tente_em === "1 hora", JSON.stringify(j));

// A captura parcial repete o mesmo envio a cada resposta confirmada. Se
// ela contasse no freio, quem responde nove perguntas travaria sozinho no
// meio do próprio formulário.
const lugarDaParcial = outroLugar();
const emAndamento = aplicacao({ parcial: true, parou_em: "atuacao", respostas: { o_que_transformar: "", faturamento: "" } });
const parciais = [];
for (let i = 0; i < 6; i++) {
  const tentativa = await enviar(emAndamento, lugarDaParcial);
  parciais.push(tentativa.status);
}
t("aplicação incompleta do mesmo envio não conta no freio",
  parciais.every((s) => s === 200), parciais.join(","));
const incompleta = aplicacaoDaMesa(emAndamento.envio);
t("e a mesa recebe a aplicação incompleta com uma frase escrita para ela ler",
  typeof incompleta?.respostas["Aplicação incompleta"] === "string" &&
  incompleta.respostas["Aplicação incompleta"].length > 10,
  incompleta?.respostas["Aplicação incompleta"]);

// ---------- os passos que viram número ----------
const visita = crypto.randomUUID();
const lugarDosPassos = outroLugar();

r = await passos({
  visita, versao: 0,
  eventos: [{ seq: 1, tipo: "explodiu", chave: null, ordem: null, ms: 0 }],
}, lugarDosPassos);
j = await lerJson(r);
t("passo com tipo inventado não entra, e não derruba o lote",
  r.status === 200 && j.ok === true && j.gravados === 0, JSON.stringify(j));

r = await passos({
  visita, versao: 0,
  eventos: [{ seq: 2, tipo: "viu", chave: "pergunta_que_nao_existe", ordem: 1, ms: 0 }],
}, lugarDosPassos);
j = await lerJson(r);
t("passo de uma pergunta que não existe naquela versão também não entra",
  r.status === 200 && j.gravados === 0, JSON.stringify(j));

const lote = {
  visita, versao: 0,
  contexto: { aparelho: "celular", origem: "instagram", campanha: "agosto", referencia: "instagram.com", plano: "pro" },
  eventos: [
    { seq: 3, tipo: "abriu", chave: null, ordem: null, ms: 0, texto: "Marina Alves" },
    { seq: 4, tipo: "viu", chave: "nome", ordem: 1, ms: 0 },
    { seq: 5, tipo: "respondeu", chave: "nome", ordem: 1, ms: 8400, escolha: "liberal" },
  ],
};
r = await passos(lote, lugarDosPassos);
j = await lerJson(r);
t("um lote de passos é gravado", r.status === 200 && j.gravados === 3, JSON.stringify(j));

r = await passos(lote, lugarDosPassos);
j = await lerJson(r);
t("o mesmo lote mandado duas vezes grava uma vez só", r.status === 200 && j.gravados === 0, JSON.stringify(j));

const gravadosDaVisita = consultar(
  `select tipo, pergunta, ordem, ms, detalhe from formulario_eventos where visita = '${visita}'`,
);
t("o passo guardado tem só a pergunta e o tempo",
  gravadosDaVisita.length === 3 &&
  !JSON.stringify(gravadosDaVisita).includes("Marina") &&
  !JSON.stringify(gravadosDaVisita).includes("liberal"),
  JSON.stringify(gravadosDaVisita));
t("e a visita nunca é gravada junto do envio",
  consultar(`select count(*) as quantas from leads where respostas like '%${visita}%'`)[0]?.quantas === 0);

r = await passos({ visita: "abc", versao: 0, eventos: [{ seq: 1, tipo: "abriu" }] }, lugarDosPassos);
t("lote sem identificação  400", r.status === 400, `status=${r.status}`);

r = await passos({
  visita, versao: 0,
  eventos: Array.from({ length: 21 }, (x, i) => ({ seq: 100 + i, tipo: "viu", chave: "nome", ordem: 1, ms: 0 })),
}, lugarDosPassos);
t("lote com mais de vinte passos  400", r.status === 400, `status=${r.status}`);

r = await passos(JSON.stringify({ visita, versao: 0, recheio: "x".repeat(5000), eventos: [{ seq: 200, tipo: "abriu" }] }), lugarDosPassos);
t("lote grande demais  413", r.status === 413, `status=${r.status}`);

r = await chamar(`${B}/api/evento`);
t("passos: método que não existe nesse caminho  405", r.status === 405, `status=${r.status}`);

// ---------- a porta da mesa continua fechada ----------
r = await chamar(`${B}/leads`);
t("a mesa continua fechada para quem não entrou", r.status === 503, `status=${r.status}`);
r = await chamar(`${BP}/leads`);
t("e com a porta configurada ela exige login", r.status === 401, `status=${r.status}`);

// ---------- o que a definição recusa, sem precisar de servidor ----------
// A conferência que importa aqui é função pura, e por isso não precisa de
// servidor nenhum para rodar.
const comChaveRepetida = structuredClone(FORMULARIO_FABRICA);
comChaveRepetida.perguntas[1].chave = "nome";
t("definição: duas perguntas com a mesma chave é recusada",
  !!validarDefinicao(comChaveRepetida).erro, validarDefinicao(comChaveRepetida).erro);

const semEmail = structuredClone(FORMULARIO_FABRICA);
semEmail.perguntas = semEmail.perguntas.filter((p) => p.chave !== "email");
t("definição: sem a pergunta de e-mail é recusada, dizendo por quê",
  /e-mail/.test(validarDefinicao(semEmail).erro ?? ""), validarDefinicao(semEmail).erro);

const semWhatsapp = structuredClone(FORMULARIO_FABRICA);
semWhatsapp.perguntas = semWhatsapp.perguntas.filter((p) => p.chave !== "whatsapp");
t("definição: sem a pergunta de WhatsApp é recusada",
  !!validarDefinicao(semWhatsapp).erro, validarDefinicao(semWhatsapp).erro);

const escolhaSemOpcoes = structuredClone(FORMULARIO_FABRICA);
escolhaSemOpcoes.perguntas[3].opcoes = [];
t("definição: escolha sem opções é recusada", !!validarDefinicao(escolhaSemOpcoes).erro);

const comDesligada = structuredClone(FORMULARIO_FABRICA);
comDesligada.perguntas[8].ativa = false;
const podada = podar(comDesligada);
t("a poda tira a pergunta desligada e a fiação, e nada mais",
  podada.perguntas.length === 8 && !podada.perguntas.some((p) => "papel" in p || "nota" in p),
  `${podada.perguntas.length} perguntas`);

t("passo com tempo absurdo vira zero em vez de recusar o lote",
  normalizarEventos([{ seq: 1, tipo: "abriu", ms: 99_999_999 }], new Set())[0]?.ms === 0);

console.log(`\n${ok} passaram, ${bad} falharam`);
if (servidorDeChaves) servidorDeChaves.close();
fs.rmSync(pastaDaPorta, { recursive: true, force: true });
derrubar();
derrubarPorta();
process.exit(bad ? 1 : 0);
