// A porta: entrar com e-mail e senha.
//
//   GET    /eu               quem esta entrando agora, e se ja existe gente
//   POST   /entrar           e-mail e senha, devolve o cracha num cookie
//   POST   /sair             encerra a sessao deste navegador
//   POST   /primeiro-acesso  cria a primeira gestora, so com a casa vazia
//   POST   /minha-senha      a pessoa troca a propria senha
//   GET    /pessoas          a lista, so para gestor
//   POST   /pessoas          cadastra, so para gestor
//   PATCH  /pessoas          muda papel, liga, desliga, zera senha
//   DELETE /pessoas          remove de vez
//
// Por que isto existe. Ate 01/09 quem trancava o endereco era o Cloudflare
// Access, e a tela de entrada era a dele. Funcionava, mas a Carla queria a
// porta da casa: e-mail e senha, com a marca dela. Trocar a portaria de
// lugar tem um preco, e ele esta escrito no DEPLOY.md: quem confere quem
// entra passa a ser este arquivo.
//
// Tres regras que o resto do arquivo obedece:
//
//   1. Senha nunca fica gravada. Fica o resumo PBKDF2 dela, com sal por
//      pessoa. Nem eu nem quem ler o banco consegue voltar para a senha.
//   2. Errar e-mail e errar senha respondem exatamente a mesma coisa.
//      Responder diferente conta para quem esta tentando quais e-mails
//      existem, e ai falta so a senha.
//   3. Todo caminho que muda alguma coisa confere o papel no BANCO, na
//      hora. Papel que veio do navegador nao vale nada.
import { json } from "./lib.js";

/* --------------------------------------------------------------------
   Quanto trabalho a senha custa.

   Cada volta e uma passada de SHA-256, e sao as voltas que fazem tentar
   senha por forca bruta caro. 210 mil gastam uns 120 ms de processador
   por entrada, e entrada acontece uma vez por mes por pessoa.

   ISTO PEDE O PLANO PAGO DO WORKER. O plano gratis da 10 ms de
   processador por pedido, e este calculo passa disso com folga. Se um dia
   for preciso voltar para o gratis, este numero desce para uns 10 mil, e
   quem ja tem senha continua entrando: o numero usado fica gravado junto
   com o resumo de cada pessoa.
   -------------------------------------------------------------------- */
const VOLTAS = 210000;

// Um mes. E o intervalo em que a pessoa digita a senha de novo: doze
// vezes por ano, e nao uma por dia.
const DIAS_DE_SESSAO = 30;

// Oito erros em quinze minutos fecham a porta para aquele e-mail por
// mais quinze. Numero folgado para quem so errou o Caps Lock, e apertado
// para quem esta chutando.
const ERROS_ATE_FREAR = 8;
const MINUTOS_DE_FREIO = 15;

const PAPEIS = ["gestor", "colaborador", "cliente"];
const SENHA_MINIMA = 8;

const COOKIE = "iqv_cracha";

/* ====================================================================
   Pecas
   ==================================================================== */

const agora = () => new Date().toISOString().slice(0, 19).replace("T", " ");
const daquiA = (ms) =>
  new Date(Date.now() + ms).toISOString().slice(0, 19).replace("T", " ");

const emHex = (bytes) =>
  Array.from(new Uint8Array(bytes)).map((b) => b.toString(16).padStart(2, "0")).join("");

const deHex = (txt) => {
  const s = String(txt || "");
  const fora = new Uint8Array(s.length / 2);
  for (let i = 0; i < fora.length; i++) fora[i] = parseInt(s.substr(i * 2, 2), 16);
  return fora;
};

const sorteio = (bytes) => emHex(crypto.getRandomValues(new Uint8Array(bytes)));

async function resumoSHA(texto) {
  return emHex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto)));
}

/* O resumo da senha. O sal entra junto para duas pessoas com a mesma
   senha guardarem coisas diferentes, e as voltas entram por fora para
   poderem mudar sem invalidar o que ja esta gravado. */
async function resumoSenha(senha, salHex, voltas) {
  const chave = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(String(senha)), "PBKDF2", false, ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: deHex(salHex), iterations: voltas, hash: "SHA-256" },
    chave, 256,
  );
  return emHex(bits);
}

/* Comparacao de tempo constante. Com === o servidor responde um pouquinho
   mais rapido quanto mais cedo os dois textos divergem, e esse pouquinho,
   medido muitas vezes, entrega o resumo letra por letra. */
function iguais(a, b) {
  const x = String(a || ""), y = String(b || "");
  let dif = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    dif |= (x.charCodeAt(i) || 0) ^ (y.charCodeAt(i) || 0);
  }
  return dif === 0;
}

const limparEmail = (v) => String(v || "").trim().toLowerCase();
const pareceEmail = (v) => /^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(v) && v.length <= 254;

async function corpoJson(request, limite = 4096) {
  const txt = await request.text();
  if (txt.length > limite) return null;
  try { return JSON.parse(txt); } catch { return null; }
}

/* --------------------------------------------------------------------
   O cookie do cracha.

   HttpOnly para JavaScript de pagina nenhuma conseguir ler; SameSite=Lax
   para outro site nao conseguir usar o cracha em nome da pessoa; Secure
   sempre, menos em localhost, onde o teste roda sem https.
   -------------------------------------------------------------------- */
function craxaDoPedido(request) {
  const cru = request.headers.get("cookie") || "";
  for (const pedaco of cru.split(";")) {
    const [n, ...resto] = pedaco.trim().split("=");
    if (n === COOKIE) return resto.join("=");
  }
  return null;
}

function cookieDe(request, valor, segundos) {
  const local = new URL(request.url).hostname;
  const seguro = local === "localhost" || local === "127.0.0.1" ? "" : " Secure;";
  return `${COOKIE}=${valor}; Path=/; HttpOnly;${seguro} SameSite=Lax; Max-Age=${segundos}`;
}

const comCookie = (resposta, cookie) => {
  const r = new Response(resposta.body, resposta);
  r.headers.append("set-cookie", cookie);
  return r;
};

/* ====================================================================
   Quem esta entrando

   Esta e a funcao que o resto do Worker usa. Devolve a pessoa quando o
   cracha vale, e null quando nao vale, sem nunca explicar o motivo para
   fora: para quem esta do lado de la, cracha vencido e cracha inventado
   sao a mesma coisa.
   ==================================================================== */
export async function quemEsta(request, env) {
  const cracha = craxaDoPedido(request);
  if (!cracha || cracha.length < 32) return null;

  const linha = await env.DB.prepare(`
    select p.id, p.email, p.nome, p.papel, p.precisa_trocar, s.expira_em, s.id as sessao
    from sessoes s join pessoas p on p.id = s.pessoa_id
    where s.id = ?1 and p.ativo = 1
  `).bind(await resumoSHA(cracha)).first();

  if (!linha) return null;
  if (linha.expira_em <= agora()) return null;

  return {
    id: linha.id,
    email: linha.email,
    nome: linha.nome,
    papel: linha.papel,
    precisa_trocar: linha.precisa_trocar === 1,
    sessao: linha.sessao,
  };
}

/* Portaria pronta para as outras rotas: devolve uma Response quando e
   para barrar, e null quando pode seguir. `papeis` limita a quem. */
export async function exigirEntrada(request, env, papeis) {
  const eu = await quemEsta(request, env);
  if (!eu) return { barrado: json({ ok: false, erro: "não autorizado" }, 401) };
  if (papeis && !papeis.includes(eu.papel)) {
    return { barrado: json({ ok: false, erro: "sem permissão" }, 403) };
  }
  return { eu };
}

/* ====================================================================
   O freio
   ==================================================================== */

async function freado(env, chave) {
  const l = await env.DB.prepare("select tentativas, ate from freio where chave = ?1")
    .bind(chave).first();
  if (!l) return false;
  if (l.ate <= agora()) {
    await env.DB.prepare("delete from freio where chave = ?1").bind(chave).run();
    return false;
  }
  return l.tentativas >= ERROS_ATE_FREAR;
}

async function contarErro(env, chave) {
  await env.DB.prepare(`
    insert into freio (chave, tentativas, ate) values (?1, 1, ?2)
    on conflict(chave) do update set
      tentativas = case when freio.ate <= ?3 then 1 else freio.tentativas + 1 end,
      ate = ?2
  `).bind(chave, daquiA(MINUTOS_DE_FREIO * 60e3), agora()).run();
}

const limparFreio = (env, chave) =>
  env.DB.prepare("delete from freio where chave = ?1").bind(chave).run();

/* ====================================================================
   As rotas
   ==================================================================== */

export async function rotasPorta(request, env, url) {
  const m = request.method;
  switch (url.pathname) {
    case "/eu":
      return m === "GET" ? contarQuemSou(request, env) : metodo();
    case "/entrar":
      return m === "POST" ? entrar(request, env) : metodo();
    case "/sair":
      return m === "POST" ? sair(request, env) : metodo();
    case "/primeiro-acesso":
      return m === "POST" ? primeiroAcesso(request, env) : metodo();
    case "/minha-senha":
      return m === "POST" ? trocarMinhaSenha(request, env) : metodo();
    case "/pessoas":
      if (m === "GET") return listarPessoas(request, env);
      if (m === "POST") return cadastrarPessoa(request, env);
      if (m === "PATCH") return mudarPessoa(request, env);
      if (m === "DELETE") return removerPessoa(request, env);
      return metodo();
  }
  return json({ ok: false, erro: "este caminho não existe" }, 404);
}

const metodo = () => json({ ok: false, erro: "método" }, 405);

/* --------------------------------------------------------------------
   GET /eu

   Uma rota so responde as duas perguntas que a porta faz ao abrir: ja
   existe alguem cadastrado, e quem esta entrando agora. Duas rotas
   custariam duas idas ao servidor antes de qualquer pixel aparecer.
   -------------------------------------------------------------------- */
async function contarQuemSou(request, env) {
  const conta = await env.DB.prepare("select count(*) as n from pessoas").first();
  const eu = await quemEsta(request, env);

  return json({
    ok: true,
    casa_vazia: (conta?.n || 0) === 0,
    entrou: !!eu,
    eu: eu ? {
      id: eu.id, nome: eu.nome, email: eu.email,
      papel: eu.papel, precisa_trocar: eu.precisa_trocar,
    } : null,
  });
}

/* --------------------------------------------------------------------
   POST /entrar
   -------------------------------------------------------------------- */
async function entrar(request, env) {
  const corpo = await corpoJson(request);
  const email = limparEmail(corpo?.email);
  const senha = String(corpo?.senha || "");

  // Uma frase so para tudo que da errado aqui. Dizer "este e-mail nao
  // existe" entregaria de graca quais e-mails existem.
  const naoEntrou = () =>
    json({ ok: false, erro: "e-mail ou senha não conferem" }, 401);

  if (!pareceEmail(email) || !senha) return naoEntrou();

  if (await freado(env, email)) {
    return json({
      ok: false,
      erro: `muitas tentativas seguidas. Espere ${MINUTOS_DE_FREIO} minutos e tente de novo.`,
      freado: true,
    }, 429);
  }

  const p = await env.DB.prepare(`
    select id, email, nome, papel, ativo, senha_hash, senha_sal, senha_voltas, precisa_trocar
    from pessoas where email = ?1
  `).bind(email).first();

  // Pessoa que nao existe, pessoa desligada e pessoa sem senha caem todas
  // no mesmo lugar. E o freio conta os tres, senao ele nao freia quem
  // esta varrendo e-mails.
  if (!p || p.ativo !== 1 || !p.senha_hash) {
    await contarErro(env, email);
    return naoEntrou();
  }

  const resumo = await resumoSenha(senha, p.senha_sal, p.senha_voltas || VOLTAS);
  if (!iguais(resumo, p.senha_hash)) {
    await contarErro(env, email);
    return naoEntrou();
  }

  await limparFreio(env, email);
  const cracha = await abrirSessao(env, p.id);

  return comCookie(
    json({
      ok: true,
      eu: {
        id: p.id, nome: p.nome, email: p.email,
        papel: p.papel, precisa_trocar: p.precisa_trocar === 1,
      },
    }),
    cookieDe(request, cracha, DIAS_DE_SESSAO * 86400),
  );
}

async function abrirSessao(env, pessoaId) {
  const cracha = sorteio(32);
  await env.DB.prepare(`
    insert into sessoes (id, pessoa_id, expira_em, visto_em) values (?1, ?2, ?3, ?4)
  `).bind(await resumoSHA(cracha), pessoaId, daquiA(DIAS_DE_SESSAO * 86400e3), agora()).run();

  await env.DB.prepare("update pessoas set entrou_em = ?2 where id = ?1")
    .bind(pessoaId, agora()).run();

  // Faxina barata: sessao vencida so ocupa espaco, e apagar aqui evita
  // precisar de tarefa agendada so para isso.
  await env.DB.prepare("delete from sessoes where expira_em <= ?1").bind(agora()).run();

  return cracha;
}

/* --------------------------------------------------------------------
   POST /sair

   Apaga a sessao no banco, e nao so o cookie. Cookie apagado so no
   navegador continuaria valendo se alguem tivesse copiado o valor.
   -------------------------------------------------------------------- */
async function sair(request, env) {
  const cracha = craxaDoPedido(request);
  if (cracha) {
    await env.DB.prepare("delete from sessoes where id = ?1")
      .bind(await resumoSHA(cracha)).run();
  }
  return comCookie(json({ ok: true }), cookieDe(request, "", 0));
}

/* --------------------------------------------------------------------
   POST /primeiro-acesso

   So funciona com a tabela vazia, e essa e a unica trava. Nao ha nenhuma
   outra forma de criar gestor sem ja ser gestor: se esta rota respondesse
   depois da primeira pessoa existir, qualquer um se cadastraria como
   gestor no dia seguinte.
   -------------------------------------------------------------------- */
async function primeiroAcesso(request, env) {
  const conta = await env.DB.prepare("select count(*) as n from pessoas").first();
  if ((conta?.n || 0) > 0) {
    return json({ ok: false, erro: "a casa já tem gente. Peça a quem é gestor para cadastrar você." }, 409);
  }

  const corpo = await corpoJson(request);
  const nome = String(corpo?.nome || "").trim().slice(0, 120);
  const email = limparEmail(corpo?.email);
  const senha = String(corpo?.senha || "");

  const erro = !nome ? "escreva o seu nome"
    : !pareceEmail(email) ? "escreva um e-mail válido"
    : senha.length < SENHA_MINIMA ? `a senha precisa de pelo menos ${SENHA_MINIMA} caracteres`
    : null;
  if (erro) return json({ ok: false, erro }, 400);

  const sal = sorteio(16);
  const hash = await resumoSenha(senha, sal, VOLTAS);

  const feito = await env.DB.prepare(`
    insert into pessoas (email, nome, papel, ativo, senha_hash, senha_sal, senha_voltas)
    values (?1, ?2, 'gestor', 1, ?3, ?4, ?5)
  `).bind(email, nome, hash, sal, VOLTAS).run();

  const id = feito.meta.last_row_id;
  const cracha = await abrirSessao(env, id);

  return comCookie(
    json({ ok: true, eu: { id, nome, email, papel: "gestor", precisa_trocar: false } }),
    cookieDe(request, cracha, DIAS_DE_SESSAO * 86400),
  );
}

/* --------------------------------------------------------------------
   POST /minha-senha

   Pede a senha atual junto. Sem isso, quem sentasse no computador de
   alguem com a sessao aberta trocaria a senha e tomaria a conta.
   -------------------------------------------------------------------- */
async function trocarMinhaSenha(request, env) {
  const { barrado, eu } = await exigirEntrada(request, env);
  if (barrado) return barrado;

  const corpo = await corpoJson(request);
  const atual = String(corpo?.atual || "");
  const nova = String(corpo?.nova || "");

  if (nova.length < SENHA_MINIMA) {
    return json({ ok: false, erro: `a senha nova precisa de pelo menos ${SENHA_MINIMA} caracteres` }, 400);
  }
  if (nova === atual) {
    return json({ ok: false, erro: "a senha nova é igual à antiga" }, 400);
  }

  const p = await env.DB.prepare(
    "select senha_hash, senha_sal, senha_voltas from pessoas where id = ?1",
  ).bind(eu.id).first();

  const confere = await resumoSenha(atual, p.senha_sal, p.senha_voltas || VOLTAS);
  if (!iguais(confere, p.senha_hash)) {
    return json({ ok: false, erro: "a senha atual não confere" }, 400);
  }

  const sal = sorteio(16);
  const hash = await resumoSenha(nova, sal, VOLTAS);
  await env.DB.prepare(`
    update pessoas set senha_hash = ?2, senha_sal = ?3, senha_voltas = ?4,
                       precisa_trocar = 0, atualizado_em = ?5
    where id = ?1
  `).bind(eu.id, hash, sal, VOLTAS, agora()).run();

  // Trocar senha derruba as OUTRAS sessoes, e mantem esta. E o que a
  // pessoa espera de "troquei porque achei que alguem descobriu".
  await env.DB.prepare("delete from sessoes where pessoa_id = ?1 and id <> ?2")
    .bind(eu.id, eu.sessao).run();

  return json({ ok: true });
}

/* --------------------------------------------------------------------
   As pessoas, so para gestor
   -------------------------------------------------------------------- */
async function listarPessoas(request, env) {
  // Colaborador LE a lista, porque a semana, os projetos e as entregas
  // dizem de quem e cada coisa, e sem os nomes essas telas ficam mudas.
  // Cadastrar, mudar papel e desligar continuam so com gestor, logo
  // abaixo. Cliente nao le: ele so ve o proprio projeto.
  const { barrado } = await exigirEntrada(request, env, ["gestor", "colaborador"]);
  if (barrado) return barrado;

  const { results } = await env.DB.prepare(`
    select id, nome, email, papel, ativo, precisa_trocar, criado_em, entrou_em,
           (senha_hash is not null) as tem_senha
    from pessoas order by nome
  `).all();

  return json({
    ok: true,
    papeis: PAPEIS,
    pessoas: results.map((p) => ({
      ...p, ativo: p.ativo === 1, tem_senha: p.tem_senha === 1,
      precisa_trocar: p.precisa_trocar === 1,
    })),
  });
}

async function cadastrarPessoa(request, env) {
  const { barrado } = await exigirEntrada(request, env, ["gestor"]);
  if (barrado) return barrado;

  const corpo = await corpoJson(request);
  const nome = String(corpo?.nome || "").trim().slice(0, 120);
  const email = limparEmail(corpo?.email);
  const papel = String(corpo?.papel || "colaborador");
  const senha = String(corpo?.senha || "");

  const erro = !nome ? "escreva o nome"
    : !pareceEmail(email) ? "escreva um e-mail válido"
    : !PAPEIS.includes(papel) ? "papel que não existe"
    : senha.length < SENHA_MINIMA ? `a primeira senha precisa de pelo menos ${SENHA_MINIMA} caracteres`
    : null;
  if (erro) return json({ ok: false, erro }, 400);

  const jaTem = await env.DB.prepare("select id from pessoas where email = ?1").bind(email).first();
  if (jaTem) return json({ ok: false, erro: "já existe alguém com esse e-mail" }, 409);

  const sal = sorteio(16);
  const hash = await resumoSenha(senha, sal, VOLTAS);

  const feito = await env.DB.prepare(`
    insert into pessoas (email, nome, papel, ativo, senha_hash, senha_sal, senha_voltas, precisa_trocar)
    values (?1, ?2, ?3, 1, ?4, ?5, ?6, 1)
  `).bind(email, nome, papel, hash, sal, VOLTAS).run();

  return json({
    ok: true,
    pessoa: {
      id: feito.meta.last_row_id, nome, email, papel,
      ativo: true, tem_senha: true, precisa_trocar: true,
    },
  });
}

async function mudarPessoa(request, env) {
  const { barrado, eu } = await exigirEntrada(request, env, ["gestor"]);
  if (barrado) return barrado;

  const corpo = await corpoJson(request);
  const id = Number(corpo?.id);
  if (!Number.isInteger(id) || id < 1) return json({ ok: false, erro: "quem?" }, 400);

  const alvo = await env.DB.prepare("select id, papel, ativo from pessoas where id = ?1")
    .bind(id).first();
  if (!alvo) return json({ ok: false, erro: "essa pessoa não existe" }, 404);

  // A lista de campos e montada aqui e numerada la embaixo. Coluna nunca
  // vem do navegador: cada nome abaixo esta escrito neste arquivo, e o
  // valor e o unico que viaja.
  const campos = [], valores = [];
  const mudar = (coluna, valor) => { campos.push(coluna); valores.push(valor); };

  if (corpo.nome !== undefined) {
    const nome = String(corpo.nome).trim().slice(0, 120);
    if (!nome) return json({ ok: false, erro: "o nome não pode ficar vazio" }, 400);
    mudar("nome", nome);
  }

  if (corpo.papel !== undefined) {
    if (!PAPEIS.includes(corpo.papel)) return json({ ok: false, erro: "papel que não existe" }, 400);
    // A casa nao pode ficar sem gestor: sem nenhum, ninguem cadastra,
    // ninguem religa e ninguem zera senha. So sobra mexer no banco.
    if (alvo.papel === "gestor" && corpo.papel !== "gestor" && await ultimoGestor(env, id)) {
      return json({ ok: false, erro: "esta é a única pessoa com acesso de gestor. Faça outra gestora antes." }, 409);
    }
    mudar("papel", corpo.papel);
  }

  if (corpo.ativo !== undefined) {
    const ativo = corpo.ativo ? 1 : 0;
    if (!ativo && id === eu.id) {
      return json({ ok: false, erro: "não dá para desligar o seu próprio acesso" }, 409);
    }
    if (!ativo && alvo.papel === "gestor" && await ultimoGestor(env, id)) {
      return json({ ok: false, erro: "esta é a única pessoa com acesso de gestor. Faça outra gestora antes." }, 409);
    }
    mudar("ativo", ativo);
  }

  // Zerar senha: o gestor escolhe uma nova e passa adiante, e a pessoa
  // troca na primeira entrada. Nao existe "senha em branco" aqui: conta
  // sem senha nao entra, e ficaria travada esperando um e-mail que este
  // sistema nao manda.
  if (corpo.senha !== undefined) {
    const senha = String(corpo.senha);
    if (senha.length < SENHA_MINIMA) {
      return json({ ok: false, erro: `a senha precisa de pelo menos ${SENHA_MINIMA} caracteres` }, 400);
    }
    const sal = sorteio(16);
    mudar("senha_hash", await resumoSenha(senha, sal, VOLTAS));
    mudar("senha_sal", sal);
    mudar("senha_voltas", VOLTAS);
    mudar("precisa_trocar", 1);
  }

  if (!campos.length) return json({ ok: false, erro: "nada para mudar" }, 400);

  mudar("atualizado_em", agora());

  const sets = campos.map((c, i) => `${c} = ?${i + 1}`).join(", ");
  await env.DB.prepare(`update pessoas set ${sets} where id = ?${campos.length + 1}`)
    .bind(...valores, id).run();

  // Desligar alguem ou zerar a senha dela derruba as sessoes abertas.
  // Sem isto, quem foi desligada continuaria dentro ate o cracha vencer,
  // e "tirei o acesso dela" seria mentira por ate um mes.
  if (corpo.ativo === false || corpo.senha !== undefined) {
    await env.DB.prepare("delete from sessoes where pessoa_id = ?1").bind(id).run();
  }

  return json({ ok: true });
}

async function removerPessoa(request, env) {
  const { barrado, eu } = await exigirEntrada(request, env, ["gestor"]);
  if (barrado) return barrado;

  const corpo = await corpoJson(request);
  const id = Number(corpo?.id);
  if (!Number.isInteger(id) || id < 1) return json({ ok: false, erro: "quem?" }, 400);
  if (id === eu.id) return json({ ok: false, erro: "não dá para remover você mesma" }, 409);

  const alvo = await env.DB.prepare("select papel from pessoas where id = ?1").bind(id).first();
  if (!alvo) return json({ ok: false, erro: "essa pessoa não existe" }, 404);
  if (alvo.papel === "gestor" && await ultimoGestor(env, id)) {
    return json({ ok: false, erro: "esta é a única pessoa com acesso de gestor. Faça outra gestora antes." }, 409);
  }

  await env.DB.prepare("delete from sessoes where pessoa_id = ?1").bind(id).run();
  await env.DB.prepare("delete from pessoas where id = ?1").bind(id).run();
  return json({ ok: true });
}

async function ultimoGestor(env, id) {
  const l = await env.DB.prepare(
    "select count(*) as n from pessoas where papel = 'gestor' and ativo = 1 and id <> ?1",
  ).bind(id).first();
  return (l?.n || 0) === 0;
}
