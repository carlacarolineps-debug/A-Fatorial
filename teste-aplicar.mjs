import crypto from "node:crypto";
// Testes das rotas do formulário de aplicação.
//
// Sobe dois wrangler locais, bate nas seis rotas de verdade por HTTP e
// derruba os dois no fim. Roda no banco local; não encosta em produção.
//
// O que estes testes guardam, e por que valem o trabalho:
//   - a rota que a página pública lê abre para qualquer um, e não deixa
//     escapar recado interno, fiação de coluna nem pergunta desligada
//   - as três rotas com login ficam fechadas enquanto TEAM_DOMAIN e
//     ACCESS_AUD faltarem, e passam a exigir login quando existirem
//   - uma aplicação vira UMA linha na mesa, com nome, e-mail e WhatsApp
//     nas colunas certas e as respostas com o título como chave
//   - reenvio depois de queda de rede atualiza a mesma linha, não duplica,
//     e não apaga a observação que a mesa escreveu no meio
//   - o que vem grande demais, torto ou de robô é recusado antes de virar
//     linha, e texto com marca de script é guardado como texto
//   - a rota de métrica nunca recebe o que a pessoa escreveu
//
// O segundo servidor existe só para a outra metade da porta: com as duas
// variáveis preenchidas as rotas fechadas respondem 401 em vez de abrir.
import { spawn, spawnSync } from "node:child_process";
import { setTimeout as espera } from "node:timers/promises";
import {
  FORMULARIO_FABRICA, podar, validarDefinicao, normalizarEventos,
} from "./src/aplicar.js";

// O banco local nasce vazio num clone novo. As tabelas do formulário são
// as seis novas mais as que já existiam, e as duas listas de criação
// podem rodar quantas vezes for preciso.
for (const arquivo of ["schema.sql", "schema-formulario.sql"]) {
  const feito = spawnSync(
    "npx",
    ["wrangler", "d1", "execute", "ideia-que-vende", "--local", `--file=${arquivo}`],
    { stdio: "ignore" },
  );
  if (feito.status !== 0) {
    console.error(`não consegui criar as tabelas de ${arquivo} no banco local`);
    process.exit(1);
  }
}

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
// nunca é exercitado: só o 503 de configuração faltando seria.
const servidorPorta = spawn(
  "npx",
  ["wrangler", "dev", "--port", "8790", "--local", "--inspector-port", "9240",
   // banco próprio: dois wrangler rodando juntos não podem disputar o
   // mesmo diretório de estado local
   "--persist-to", ".wrangler/estado-aplicar",
   "--var", "TEAM_DOMAIN:teste.invalid", "--var", "ACCESS_AUD:aud-de-teste"],
  { stdio: ["ignore", "pipe", "pipe"], detached: true },
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
   A mesa lê as aplicações pela rota que fica atrás do Cloudflare Access,
   e não existe login de verdade para forjar aqui. Então a conferência é
   feita pela MESMA consulta que aquela rota faz, direto no banco local:
   as mesmas colunas, e as respostas lidas do mesmo jeito. Junto vai o
   teste de que a porta continua fechada para quem não entrou.
   -------------------------------------------------------------------- */
const consultar = (sql) => {
  const saida = spawnSync(
    "npx",
    ["wrangler", "d1", "execute", "ideia-que-vende", "--local", "--json", "--command", sql],
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
// pergunta, e a chave da opção escolhida nas de escolha.
const aplicacao = (mudancas = {}) => {
  const { respostas, ...resto } = mudancas;
  return {
    envio: crypto.randomUUID(),
    versao: 1,
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
      atende_clientes: "recorrente",
      faturamento: "de_15k_a_50k",
      objetivo: "estruturar",
      estagio: "cobra",
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

const enviar = (corpo, lugar) => chamar(`${B}/api/resposta`, {
  method: "POST",
  headers: { "content-type": "application/json", "cf-connecting-ip": lugar },
  body: typeof corpo === "string" ? corpo : JSON.stringify(corpo),
});

const passos = (corpo, lugar) => chamar(`${B}/api/evento`, {
  method: "POST",
  headers: { "content-type": "application/json", "cf-connecting-ip": lugar },
  body: typeof corpo === "string" ? corpo : JSON.stringify(corpo),
});

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
t("formulário: as nove perguntas no ar, sem a que está desligada",
  perguntasNoAr.length === 9 && !perguntasNoAr.some((p) => p.chave === "pergunta_6"),
  perguntasNoAr.map((p) => p.chave).join(","));
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
t("gravar formulário: e não deixa passar, nenhuma versão foi gravada",
  consultar("select count(*) as quantas from formulario_versoes")[0]?.quantas === 0);

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
    "O que você quer transformar em produto?", "Você já atende clientes nesse tema?",
    "Faixa de faturamento mensal", "Seu principal objetivo", "Em que estágio sua ideia está?",
  ]), Object.keys(naMesa?.respostas ?? {}).join(" | "));
t("a escolha é guardada pelo texto que a pessoa leu, não pela chave",
  naMesa?.respostas["Faixa de faturamento mensal"] === "R$ 15 mil a R$ 50 mil",
  naMesa?.respostas["Faixa de faturamento mensal"]);
t("o andamento nasce novo e a observação nasce vazia",
  naMesa?.status === "novo" && !naMesa?.observacoes, `${naMesa?.status} | ${naMesa?.observacoes}`);
t("o nível e a origem da página vão junto",
  naMesa?.plano === "pro" && naMesa?.origem === "landing", `${naMesa?.plano} | ${naMesa?.origem}`);
t("a mesa sabe qual formulário a pessoa respondeu",
  naMesa?.typeform_form_id === "aplicar:v1", naMesa?.typeform_form_id);

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

r = await enviar(JSON.stringify({ ...aplicacao(), recheio: "x".repeat(41_000) }), outroLugar());
j = await lerJson(r);
t("corpo de 40 KB é recusado sem nem ser lido  413", r.status === 413 && j.ok === false, JSON.stringify(j));

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
const mesmoLugar = outroLugar();
const respostasDoFreio = [];
for (let i = 0; i < 6; i++) {
  const tentativa = await enviar(aplicacao(), mesmoLugar);
  respostasDoFreio.push(tentativa.status);
}
t("cinco aplicações do mesmo lugar passam, a sexta é freada",
  respostasDoFreio.slice(0, 5).every((s) => s === 200) && respostasDoFreio[5] === 429,
  respostasDoFreio.join(","));
j = await lerJson(await enviar(aplicacao(), mesmoLugar));
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
  visita, versao: 1,
  eventos: [{ seq: 1, tipo: "explodiu", chave: null, ordem: null, ms: 0 }],
}, lugarDosPassos);
j = await lerJson(r);
t("passo com tipo inventado não entra, e não derruba o lote",
  r.status === 200 && j.ok === true && j.gravados === 0, JSON.stringify(j));

r = await passos({
  visita, versao: 1,
  eventos: [{ seq: 2, tipo: "viu", chave: "pergunta_que_nao_existe", ordem: 1, ms: 0 }],
}, lugarDosPassos);
j = await lerJson(r);
t("passo de uma pergunta que não existe naquela versão também não entra",
  r.status === 200 && j.gravados === 0, JSON.stringify(j));

const lote = {
  visita, versao: 1,
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

r = await passos({ visita: "abc", versao: 1, eventos: [{ seq: 1, tipo: "abriu" }] }, lugarDosPassos);
t("lote sem identificação  400", r.status === 400, `status=${r.status}`);

r = await passos({
  visita, versao: 1,
  eventos: Array.from({ length: 21 }, (x, i) => ({ seq: 100 + i, tipo: "viu", chave: "nome", ordem: 1, ms: 0 })),
}, lugarDosPassos);
t("lote com mais de vinte passos  400", r.status === 400, `status=${r.status}`);

r = await passos(JSON.stringify({ visita, versao: 1, recheio: "x".repeat(5000), eventos: [{ seq: 200, tipo: "abriu" }] }), lugarDosPassos);
t("lote grande demais  413", r.status === 413, `status=${r.status}`);

r = await chamar(`${B}/api/evento`);
t("passos: método que não existe nesse caminho  405", r.status === 405, `status=${r.status}`);

// ---------- a porta da mesa continua fechada ----------
r = await chamar(`${B}/leads`);
t("a mesa continua fechada para quem não entrou", r.status === 503, `status=${r.status}`);
r = await chamar(`${BP}/leads`);
t("e com a porta configurada ela exige login", r.status === 401, `status=${r.status}`);

// ---------- o que a definição recusa, sem precisar de servidor ----------
// Estas três só acontecem com login, e login de verdade não existe aqui.
// A conferência que importa é a mesma, e ela é função pura.
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

const podada = podar(FORMULARIO_FABRICA);
t("a poda tira a pergunta desligada e a fiação, e nada mais",
  podada.perguntas.length === 9 && !podada.perguntas.some((p) => "papel" in p || "nota" in p));

t("passo com tempo absurdo vira zero em vez de recusar o lote",
  normalizarEventos([{ seq: 1, tipo: "abriu", ms: 99_999_999 }], new Set())[0]?.ms === 0);

console.log(`\n${ok} passaram, ${bad} falharam`);
derrubar();
derrubarPorta();
process.exit(bad ? 1 : 0);

// A linha do package.json, em "scripts":
//     "teste-aplicar": "node teste-aplicar.mjs"
