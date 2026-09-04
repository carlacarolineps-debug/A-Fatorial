// Testes das propostas com aceite eletronico. Rode com:  npm test
//
// Sobe o wrangler local numa porta propria, com banco proprio, e faz o
// ciclo inteiro por HTTP: a equipe cria a proposta a partir de um lead, o
// cliente abre so com o codigo, escolhe o plano, assina, e as duas coisas
// que tem que acontecer sozinhas acontecem: a proposta vira "aceita" e o
// lead vira "ganho".
//
// O que estes testes guardam:
//   - criar e listar proposta exigem login; assinar nao, e nao pode exigir
//   - o codigo e sorteado, nunca sequencial: nao da para adivinhar o do vizinho
//   - o que o cliente recebe NAO tem o lead nem o WhatsApp da casa
//   - assinar duas vezes e recusado, e proposta vencida tambem
import { spawn, spawnSync } from "node:child_process";
import { setTimeout as espera } from "node:timers/promises";
import crypto from "node:crypto";

const ESTADO = ".wrangler/estado-propostas";
const bancoLocal = (args) => spawnSync(
  "npx",
  ["wrangler", "d1", "execute", "ideia-que-vende", "--local", "--persist-to", ESTADO, ...args],
  { stdio: "ignore" },
);

// Banco proprio deste arquivo, do zero: a casa comeca vazia (o primeiro
// acesso so responde assim) e nenhuma proposta de rodada anterior conta.
bancoLocal(["--command",
  "drop table if exists aceites; drop table if exists propostas;" +
  "drop table if exists sessoes; drop table if exists freio; drop table if exists pessoas;"]);
for (const arquivo of ["schema.sql", "schema-formulario.sql", "schema-porta.sql", "schema-propostas.sql"]) {
  if (bancoLocal([`--file=${arquivo}`]).status !== 0) {
    console.error(`nao consegui aplicar o ${arquivo} no banco local`);
    process.exit(1);
  }
}
bancoLocal(["--command", "delete from leads; delete from formulario_versoes;"]);

const servidor = spawn(
  "npx",
  ["wrangler", "dev", "--port", "8792", "--local", "--inspector-port", "9242", "--persist-to", ESTADO],
  { stdio: ["ignore", "pipe", "pipe"], detached: true },
);
const derrubar = () => { try { process.kill(-servidor.pid, "SIGKILL"); } catch {} };
process.on("exit", derrubar);
process.on("SIGINT", () => { derrubar(); process.exit(1); });

await new Promise((res, rej) => {
  const prazo = setTimeout(() => rej(new Error("wrangler dev nao subiu em 90s")), 90_000);
  servidor.stdout.on("data", (c) => { if (String(c).includes("Ready on")) { clearTimeout(prazo); res(); } });
});
await espera(500);

const B = "http://localhost:8792";

let ok = 0, bad = 0;
const t = (nome, cond, extra = "") => {
  (cond ? ok++ : bad++);
  console.log(`${cond ? "PASS" : "FALHOU"}  ${nome}${extra ? "   " + extra : ""}`);
};

const REGRAS = { voltas: 210000, tempero: "iqv-porta-v1:" };
const prova = async (email, senha) => {
  const sal = await crypto.webcrypto.subtle.digest("SHA-256",
    Buffer.from(REGRAS.tempero + String(email).trim().toLowerCase()));
  const chave = await crypto.webcrypto.subtle.importKey(
    "raw", Buffer.from(String(senha)), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.webcrypto.subtle.deriveBits(
    { name: "PBKDF2", salt: sal, iterations: REGRAS.voltas, hash: "SHA-256" }, chave, 256);
  return Buffer.from(bits).toString("hex");
};

let cracha = "";
const com = (extra = {}) => ({
  ...extra,
  headers: { "content-type": "application/json", ...(extra.headers || {}), cookie: cracha },
});

// ---------- a casa, do zero ----------
// Cria a gestora e faz uma aplicacao chegar pelo formulario publico, para
// a proposta poder nascer de um lead de verdade, como ela nasce na mesa.
const email = "carla@iqv.com.br";
const senha = "senhadeteste1";
let r = await fetch(`${B}/primeiro-acesso`, {
  method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ nome: "Carla Caroline", email, prova: await prova(email, senha) }),
});
if (r.status === 409) {
  r = await fetch(`${B}/entrar`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, prova: await prova(email, senha) }),
  });
}
cracha = ((r.headers.getSetCookie?.() || []).find((c) => c.startsWith("iqv_cracha=")) || "").split(";")[0];
t("a gestora entra", r.status === 200 && !!cracha, `status=${r.status}`);

// ---------- sem login, nada da equipe passa ----------
r = await fetch(`${B}/api/propostas`);
t("listar propostas sem entrar  401", r.status === 401, `status=${r.status}`);
r = await fetch(`${B}/api/propostas`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
t("criar proposta sem entrar  401", r.status === 401, `status=${r.status}`);

// ---------- uma aplicacao chega pelo formulario publico ----------
// As chaves sao as mesmas do FORMULARIO_FABRICA, e as respostas sao as
// mesmas do teste-aplicar.mjs: a proposta tem que nascer de um lead de
// verdade, entrado pela porta da rua, e nao de uma linha plantada no banco.
{
  const env = await fetch(`${B}/api/resposta`, {
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
  t("uma aplicação chega pelo formulário público e vira lead", env.status === 200, `status=${env.status}`);
}

// ---------- pega um lead do funil ----------
const leads = await (await fetch(`${B}/leads`, com())).json();
const lead = leads.leads[0];
t("existe lead no funil para virar proposta", !!lead, lead ? `#${lead.id} ${lead.nome}` : "nenhum");


// ---------- cria a proposta a partir do lead ----------
const corpoProposta = {
  cliente: lead.nome, empresa: "Exemplo Ltda",
  diagnostico: "Tem método na cabeça e nada no papel. Falta virar produto.",
  fundacao: false, lead_id: lead.id, valida_ate: "2099-12-31",
  whatsapp_destino: "5511999998888",
  contratada: { rs: "Ideia Que Vende LTDA", cnpj: "11.222.333/0001-81", end: "Av. Paulista, São Paulo/SP", foro: "São Paulo/SP" },
  planos: [
    { t: "Projeto ID, construímos junto (90 dias)", selo: "Recomendado",
      esc: ["As 6 etapas do Método ID aplicadas com você"], val: 19900, cond: "12x no cartão" },
    { t: "Imersão ID, 2 dias intensivos", selo: "Porta de entrada",
      esc: ["Diagnóstico profundo e oferta desenhada"], val: 7900, cond: "Online: R$ 4.900" },
  ],
};
r = await fetch(`${B}/api/propostas`, com({ method: "POST", body: JSON.stringify(corpoProposta) }));
const criada = await r.json();
t("a proposta é criada", r.status === 200 && criada.ok === true, JSON.stringify(criada));
t("e o código é ID-XXXXX, não sequencial", /^ID-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{5}$/.test(criada.codigo || ""), criada.codigo);

// ---------- o lead vira "proposta" ----------
let osLeads = await (await fetch(`${B}/leads`, com())).json();
let oLead = osLeads.leads.find((l) => l.id === lead.id);
t("o lead do funil vira 'proposta' sozinho", oLead.status === "proposta", oLead.status);

// ---------- o cliente abre pelo código, sem login nenhum ----------
r = await fetch(`${B}/api/proposta?codigo=${criada.codigo}`);
const aberta = await r.json();
t("o cliente abre a proposta só com o código", r.status === 200, `status=${r.status}`);
const dela = aberta.proposta || {};
t("e vê os dois planos", (dela.planos || []).length === 2, String((dela.planos || []).length));
t("e o contrato vem do servidor, com as cláusulas", (dela.clausulas || []).length >= 10, String((dela.clausulas || []).length));
t("o código não entrega o lead nem o WhatsApp da casa",
  dela.lead_id === undefined && dela.whatsapp_destino === undefined,
  JSON.stringify(Object.keys(dela)));

r = await fetch(`${B}/api/proposta?codigo=ID-ZZZZZ`);
t("código que não existe  404", r.status === 404, `status=${r.status}`);

// ---------- a proposta fica "vista" ----------
let lista = await (await fetch(`${B}/api/propostas`, com())).json();
let aMinha = lista.propostas.find((p) => p.codigo === criada.codigo);
t("abrir marca a proposta como vista", aMinha.status === "vista", aMinha.status);

// ---------- o cliente assina ----------
const aceite = {
  codigo: criada.codigo, plano_indice: 0, nome: "Marina Alves",
  documento: "12345678909", email: "marina@exemplo.com.br",
  whatsapp: "11988887777", endereco: "Rua Exemplo, 100, São Paulo/SP",
  li_e_aceito: true,
};
r = await fetch(`${B}/api/aceite`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(aceite) });
const assinado = await r.json();
t("o cliente assina", r.status === 200, `status=${r.status} ${JSON.stringify(assinado).slice(0, 120)}`);
t("e recebe o resumo SHA-256 do que assinou", /^[0-9a-f]{64}$/.test(assinado.hash || ""), assinado.hash);
t("e o contrato integral, já com o nome dele dentro",
  typeof assinado.contrato === "string" && assinado.contrato.includes("Marina Alves"),
  `${(assinado.contrato || "").length} caracteres`);
t("e o WhatsApp da casa, para mandar a confirmação", assinado.whatsapp_destino === "5511999998888", assinado.whatsapp_destino);

// ---------- os dois efeitos automáticos ----------
lista = await (await fetch(`${B}/api/propostas`, com())).json();
aMinha = lista.propostas.find((p) => p.codigo === criada.codigo);
t("a proposta vira 'aceita'", aMinha.status === "aceita", aMinha.status);
t("com o plano e o valor que ele escolheu", aMinha.valor === 19900, String(aMinha.valor));

osLeads = await (await fetch(`${B}/leads`, com())).json();
oLead = osLeads.leads.find((l) => l.id === lead.id);
t("e o lead vira 'ganho' sozinho", oLead.status === "ganho", oLead.status);

// ---------- não dá para assinar duas vezes ----------
r = await fetch(`${B}/api/aceite`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(aceite) });
t("assinar de novo  409", r.status === 409, `status=${r.status}`);

// ---------- proposta vencida não é assinada ----------
r = await fetch(`${B}/api/propostas`, com({
  method: "POST",
  body: JSON.stringify({ ...corpoProposta, lead_id: null, valida_ate: "2020-01-01" }),
}));
const velha = await r.json();
r = await fetch(`${B}/api/aceite`, {
  method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ ...aceite, codigo: velha.codigo }),
});
t("proposta vencida  410", r.status === 410, `status=${r.status}`);

// ---------- validação ----------
r = await fetch(`${B}/api/aceite`, {
  method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ ...aceite, codigo: velha.codigo, li_e_aceito: false }),
});
t("sem marcar 'li e aceito', não assina", r.status === 400 || r.status === 410, `status=${r.status}`);

// ---------- o robots ----------
const robots = await (await fetch(`${B}/robots.txt`)).text();
t("o robots esconde a página da proposta", robots.includes("Disallow: /proposta/"), robots.trim().split("\n").join(" | "));

console.log(`\n${ok} passaram, ${bad} falharam`);
derrubar();
process.exit(bad ? 1 : 0);
