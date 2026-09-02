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
   Onde a senha e embaralhada, e o que isso custa de verdade.

   Embaralhar senha precisa ser caro: e o custo por chute que faz roubar o
   banco nao virar roubar as senhas. Mas o plano gratis do Worker da 10 ms
   de processador por pedido, e 210 mil voltas de PBKDF2 gastam uns 120.
   No plano gratis, entrar simplesmente falharia.

   Entao o trabalho caro e feito no NAVEGADOR de quem esta entrando, antes
   de mandar qualquer coisa. O que viaja e o resultado disso, que este
   arquivo chama de PROVA. O servidor faz por cima dela um passo proprio e
   guarda so isso.

       guardado = servidor( navegador( senha ) )

   ATE ONDE ISSO PROTEGE, sem exagero.

   O sal do navegador sai do proprio e-mail, entao ele e PUBLICO: qualquer
   um que saiba o e-mail da Carla consegue calcular a metade cara sem ter
   o banco. Um atacante que escolhe um alvo pode gastar meses ANTES de
   qualquer roubo montando uma tabela de senha para prova, e no dia em que
   o banco vazar cada chute custa a ele so a metade do servidor.

   Ou seja: contra quem mira uma pessoa especifica e se prepara, o custo
   por chute e o do servidor, e nao a soma. Isso e menos do que um
   PBKDF2 de 210 mil voltas guardado do jeito classico daria, e esta
   escrito aqui porque a versao anterior deste comentario dizia que o
   custo continuava o mesmo, e nao continua.

   Por que ainda assim vale a pena:

   1. O sal ser por e-mail impede a tabela unica que serve para todo
      mundo. Cada alvo custa uma preparacao propria de 210 mil voltas por
      senha testada.
   2. Contra quem rouba o banco sem ter se preparado antes, o custo e a
      soma das duas metades.
   3. A metade do servidor e a maior que cabe nos 10 ms do plano gratis, e
      nao um numero simbolico.
   4. A senha crua nunca sai do navegador. Nao aparece em log, em erro nem
      em pedido nenhum, porque nao e mandada.

   O que fecharia o buraco de vez seria um sal sorteado por pessoa, mas o
   navegador precisa dele ANTES de provar quem e, e servir esse sal a quem
   pergunta entrega tanto o sal quanto a lista de quem existe. A troca foi
   feita de olhos abertos.
   -------------------------------------------------------------------- */

// O que o navegador faz. O numero fica escrito aqui porque e o servidor
// que ensina a regra ao navegador, na resposta do /eu: assim os dois nunca
// discordam, e mudar isto e mudar num lugar so.
//
// A VERSAO E GRAVADA POR PESSOA, na coluna prova_versao. Ela ainda nao e
// LIDA por ninguem, e isso e de proposito: o que ela guarda e o dado que
// a migracao vai precisar no dia em que este numero mudar. Sem a coluna,
// mudar as voltas ou o tempero trancaria todo mundo para fora de uma vez,
// sem nem dar para saber quem foi calculado com o que.
//
// A migracao, quando vier, e o navegador mandar as provas das DUAS
// versoes durante um tempo e o servidor escolher pela versao de cada
// pessoa. Nao esta escrita ainda porque so ha uma versao, e escrever
// migracao antes de existir de onde migrar e escrever bug.
//
// O que NAO da para fazer e o servidor dizer ao navegador qual e a versao
// daquela pessoa antes de ela provar quem e: isso responderia "existe" ou
// "nao existe" para qualquer e-mail perguntado.
export const REGRAS_DA_PROVA = {
  versao: 1,
  voltas: 210000,
  tempero: "iqv-porta-v1:",
};

// O passo deste lado. 12 mil voltas gastam uns 6 ms, e o teto do plano
// gratis e 10 por pedido: e o maior numero que cabe com folga para o
// resto do pedido. Ele nao e enfeite, e a unica coisa que um atacante
// preparado paga por chute.
const VOLTAS = 12000;

// A prova tem 32 bytes em hexadecimal, sempre. Recusar aqui o que nao tem
// essa cara evita que um pedido torto chegue no calculo.
const pareceProva = (v) => typeof v === "string" && /^[0-9a-f]{64}$/.test(v);

// Um sal fixo, so para dar trabalho igual quando o e-mail nao existe. Ele
// nunca protege nada: existe para o relogio nao contar quem esta na lista.
const SAL_DE_MENTIRA = "00000000000000000000000000000000";

// Um mes. E o intervalo em que a pessoa digita a senha de novo: doze
// vezes por ano, e nao uma por dia.
const DIAS_DE_SESSAO = 30;

/* --------------------------------------------------------------------
   O freio, e por que ele NAO conta so por e-mail.

   A primeira versao contava erros por e-mail. Parecia certo e era um
   buraco: quem soubesse o e-mail da Carla mandava oito pedidos com
   qualquer coisa no lugar da senha e a trancava por quinze minutos, sem
   nunca ter chegado perto da senha dela. Repetindo a cada quinze, a
   Carla ficava de fora para sempre e sem ter o que fazer.

   Agora o balde principal e de QUEM ESTA TENTANDO, e nao de quem esta
   sendo tentado: a chave junta o e-mail com o endereco de onde veio o
   pedido. Errar oito vezes fecha a porta para AQUELE tentante, e nao para
   a dona da conta, que continua entrando do computador dela.

   O segundo balde e so do endereco, com numero mais alto: ele pega quem
   nao esta insistindo num e-mail so, e sim varrendo uma lista inteira
   testando a mesma senha em cada um. Esse ataque nao encostava no
   primeiro balde, porque cada e-mail levava um erro so.

   Endereco vem do cabecalho que a propria borda da Cloudflare carimba, e
   nao de nada que o pedido escolha. Sem ele (so acontece em teste local),
   sobra o balde do e-mail sozinho: pior que o de agora, melhor que nada.
   -------------------------------------------------------------------- */
const ERROS_ATE_FREAR = 8;         // por e-mail e endereco juntos
const ERROS_DO_ENDERECO = 40;      // o mesmo endereco varrendo muitos e-mails
const MINUTOS_DE_FREIO = 15;

const PAPEIS = ["gestor", "colaborador", "cliente"];

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

/* O passo barato por cima da prova que veio do navegador. O sal sorteado
   entra junto para duas pessoas com a mesma prova guardarem coisas
   diferentes, e as voltas entram por fora para poderem mudar sem
   invalidar o que ja esta gravado. */
async function resumoDaProva(prova, salHex, voltas) {
  const chave = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(String(prova)), "PBKDF2", false, ["deriveBits"],
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
  // O tamanho e olhado ANTES de montar a string. Lendo primeiro, um pedido
  // de 100 MB (o teto de upload da Cloudflare) viraria uns 200 MB de texto
  // na memoria antes de ser recusado, e isso derruba o Worker. E /entrar
  // nao pede cracha nenhum para chegar ate aqui.
  const anunciado = Number(request.headers.get("content-length") || 0);
  if (anunciado > limite) return null;

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
   para barrar, e null quando pode seguir. `papeis` limita a quem.

   QUEM AINDA NAO TROCOU A PRIMEIRA SENHA NAO PASSA DAQUI. A marca
   precisa_trocar existia so na tela, e tela e sugestao: quem recebesse a
   senha sorteada e chamasse o endereco direto ganhava um cracha de trinta
   dias com o acesso inteiro, sem nunca trocar nada. E a senha que anda por
   WhatsApp e justamente a que mais gente ve. Agora a sessao existe, mas
   so serve para trocar a senha, e nada mais.

   O `deixarTrocar` e para as duas rotas que precisam funcionar nesse
   estado: a que diz quem voce e, e a que troca a senha. */
export async function exigirEntrada(request, env, papeis, deixarTrocar) {
  const eu = await quemEsta(request, env);
  if (!eu) return { barrado: json({ ok: false, erro: "não autorizado" }, 401) };

  if (eu.precisa_trocar && !deixarTrocar) {
    return {
      barrado: json({
        ok: false,
        erro: "escolha a sua senha antes de continuar",
        precisa_trocar: true,
      }, 403),
    };
  }

  if (papeis && !papeis.includes(eu.papel)) {
    return { barrado: json({ ok: false, erro: "sem permissão" }, 403) };
  }
  return { eu };
}

/* ====================================================================
   O freio
   ==================================================================== */

// O endereco de quem pediu, carimbado pela borda. "sem-endereco" so
// aparece rodando na propria maquina, no teste.
const dondeVeio = (request) =>
  request.headers.get("cf-connecting-ip") || "sem-endereco";

const chavesDoFreio = (request, email) => {
  const ip = dondeVeio(request);
  return { tentante: `t:${ip}|${email}`, endereco: `e:${ip}` };
};

async function freado(env, request, email) {
  const { tentante, endereco } = chavesDoFreio(request, email);
  const { results } = await env.DB.prepare(
    "select chave, tentativas, ate from freio where chave in (?1, ?2)",
  ).bind(tentante, endereco).all();

  const hoje = agora();
  for (const l of results) {
    if (l.ate <= hoje) continue;   // janela vencida nao freia; ela e apagada na faxina
    const teto = l.chave === endereco ? ERROS_DO_ENDERECO : ERROS_ATE_FREAR;
    if (l.tentativas >= teto) return true;
  }
  return false;
}

async function contarErro(env, request, email) {
  const { tentante, endereco } = chavesDoFreio(request, email);
  const ate = daquiA(MINUTOS_DE_FREIO * 60e3);
  const subir = env.DB.prepare(`
    insert into freio (chave, tentativas, ate) values (?1, 1, ?2)
    on conflict(chave) do update set
      tentativas = case when freio.ate <= ?3 then 1 else freio.tentativas + 1 end,
      ate = ?2
  `);
  await env.DB.batch([
    subir.bind(tentante, ate, agora()),
    subir.bind(endereco, ate, agora()),
  ]);
}

// Entrar limpa o balde de quem entrou, e nao o do endereco: quem acertou
// nao e mais suspeito, mas o endereco que varreu cinquenta e-mails
// continua sendo, mesmo tendo acertado um.
const limparFreio = (env, request, email) =>
  env.DB.prepare("delete from freio where chave = ?1")
    .bind(chavesDoFreio(request, email).tentante).run();


/* ====================================================================
   As rotas
   ==================================================================== */

/* --------------------------------------------------------------------
   De onde o pedido veio.

   O cookie tem SameSite=Lax, e isso ja impede que um site qualquer faca o
   navegador de outra pessoa mandar um POST com o cracha dela junto. Esta
   conferencia e a segunda tranca: ela custa nada, nao depende de o
   navegador implementar SameSite direito, e recusa por escrito em vez de
   depender de o cookie nao ter viajado.

   Pedido sem Origin passa: e o que acontece quando a pessoa digita o
   endereco, e tambem nos testes.
   -------------------------------------------------------------------- */
function veioDeFora(request, url) {
  const origem = request.headers.get("origin");
  if (!origem) return false;
  try { return new URL(origem).host !== url.host; } catch { return true; }
}

export async function rotasPorta(request, env, url) {
  const m = request.method;

  if (m !== "GET" && veioDeFora(request, url)) {
    return json({ ok: false, erro: "pedido veio de outro site" }, 403);
  }
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
    // A regra de embaralhar vai junto: o navegador nao a tem escrita nele,
    // ele pergunta. Assim os dois lados nunca discordam sobre quantas
    // voltas dar, e mudar o numero e mexer num arquivo so.
    regras: REGRAS_DA_PROVA,
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
  const prova = String(corpo?.prova || "");

  // Uma frase so para tudo que da errado aqui. Dizer "este e-mail nao
  // existe" entregaria de graca quais e-mails existem.
  const naoEntrou = () =>
    json({ ok: false, erro: "e-mail ou senha não conferem" }, 401);

  if (!pareceEmail(email) || !pareceProva(prova)) return naoEntrou();

  if (await freado(env, request, email)) {
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
  //
  // A conta e feita MESMO quando nao ha ninguem, contra um sal de mentira.
  // Sem isso, e-mail que existe demorava uns 6 ms a mais que e-mail que
  // nao existe, e essa diferenca, medida algumas vezes, entrega a lista de
  // quem tem acesso, que e justamente o que as respostas iguais escondem.
  const alvo = (p && p.ativo === 1 && p.senha_hash) ? p : null;
  const resumo = await resumoDaProva(
    prova,
    alvo ? alvo.senha_sal : SAL_DE_MENTIRA,
    alvo ? (alvo.senha_voltas || VOLTAS) : VOLTAS,
  );

  if (!alvo || !iguais(resumo, alvo.senha_hash)) {
    await contarErro(env, request, email);
    return naoEntrou();
  }

  await limparFreio(env, request, email);
  const cracha = await abrirSessao(env, alvo.id);

  return comCookie(
    json({
      ok: true,
      eu: {
        id: alvo.id, nome: alvo.nome, email: alvo.email,
        papel: alvo.papel, precisa_trocar: alvo.precisa_trocar === 1,
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

  // Faxina barata: sessao e freio vencidos so ocupam espaco, e apagar aqui
  // evita precisar de tarefa agendada so para isso.
  //
  // Dentro de try porque ela vem DEPOIS de a sessao ja estar gravada: se o
  // banco tossir na faxina, o login deu certo e nao pode virar erro. A
  // sujeira fica para a proxima entrada.
  try {
    await env.DB.batch([
      env.DB.prepare("delete from sessoes where expira_em <= ?1").bind(agora()),
      env.DB.prepare("delete from freio where ate <= ?1").bind(agora()),
    ]);
  } catch (e) { /* limpar e desejavel, entrar e obrigatorio */ }

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
  const prova = String(corpo?.prova || "");

  // O tamanho minimo da senha e conferido no navegador, porque e la que a
  // senha existe: aqui chega a prova, que tem sempre o mesmo tamanho. Quem
  // contornar a tela e puser uma senha curta so enfraquece a propria
  // conta, e nao a de mais ninguem.
  const erro = !nome ? "escreva o seu nome"
    : !pareceEmail(email) ? "escreva um e-mail válido"
    : !pareceProva(prova) ? "não recebi a senha embaralhada. Recarregue a página e tente de novo."
    : null;
  if (erro) return json({ ok: false, erro }, 400);

  const sal = sorteio(16);
  const hash = await resumoDaProva(prova, sal, VOLTAS);

  const feito = await env.DB.prepare(`
    insert into pessoas (email, nome, papel, ativo, senha_hash, senha_sal, senha_voltas, prova_versao)
    values (?1, ?2, 'gestor', 1, ?3, ?4, ?5, ?6)
  `).bind(email, nome, hash, sal, VOLTAS, REGRAS_DA_PROVA.versao).run();

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
  const { barrado, eu } = await exigirEntrada(request, env, null, true);
  if (barrado) return barrado;

  const corpo = await corpoJson(request);
  const atual = String(corpo?.atual || "");
  const nova = String(corpo?.nova || "");

  if (!pareceProva(atual) || !pareceProva(nova)) {
    return json({ ok: false, erro: "não recebi as senhas embaralhadas. Recarregue a página e tente de novo." }, 400);
  }
  // Comparar as duas provas equivale a comparar as duas senhas: a mesma
  // senha, do mesmo e-mail, sempre da a mesma prova.
  if (nova === atual) {
    return json({ ok: false, erro: "a senha nova é igual à antiga" }, 400);
  }

  const p = await env.DB.prepare(
    "select senha_hash, senha_sal, senha_voltas from pessoas where id = ?1",
  ).bind(eu.id).first();

  const confere = await resumoDaProva(atual, p.senha_sal, p.senha_voltas || VOLTAS);
  if (!iguais(confere, p.senha_hash)) {
    return json({ ok: false, erro: "a senha atual não confere" }, 400);
  }

  const sal = sorteio(16);
  const hash = await resumoDaProva(nova, sal, VOLTAS);
  await env.DB.prepare(`
    update pessoas set senha_hash = ?2, senha_sal = ?3, senha_voltas = ?4,
                       prova_versao = ?5, precisa_trocar = 0, atualizado_em = ?6
    where id = ?1
  `).bind(eu.id, hash, sal, VOLTAS, REGRAS_DA_PROVA.versao, agora()).run();

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
  const prova = String(corpo?.prova || "");

  const erro = !nome ? "escreva o nome"
    : !pareceEmail(email) ? "escreva um e-mail válido"
    : !PAPEIS.includes(papel) ? "papel que não existe"
    : !pareceProva(prova) ? "não recebi a primeira senha embaralhada. Recarregue a página e tente de novo."
    : null;
  if (erro) return json({ ok: false, erro }, 400);

  const jaTem = await env.DB.prepare("select id from pessoas where email = ?1").bind(email).first();
  if (jaTem) return json({ ok: false, erro: "já existe alguém com esse e-mail" }, 409);

  const sal = sorteio(16);
  const hash = await resumoDaProva(prova, sal, VOLTAS);

  const feito = await env.DB.prepare(`
    insert into pessoas (email, nome, papel, ativo, senha_hash, senha_sal, senha_voltas, precisa_trocar, prova_versao)
    values (?1, ?2, ?3, 1, ?4, ?5, ?6, 1, ?7)
  `).bind(email, nome, papel, hash, sal, VOLTAS, REGRAS_DA_PROVA.versao).run();

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
  if (corpo.prova !== undefined) {
    const prova = String(corpo.prova);
    if (!pareceProva(prova)) {
      return json({ ok: false, erro: "não recebi a senha embaralhada. Recarregue a página e tente de novo." }, 400);
    }
    const sal = sorteio(16);
    mudar("senha_hash", await resumoDaProva(prova, sal, VOLTAS));
    mudar("senha_sal", sal);
    mudar("senha_voltas", VOLTAS);
    mudar("prova_versao", REGRAS_DA_PROVA.versao);
    mudar("precisa_trocar", 1);
  }

  if (!campos.length) return json({ ok: false, erro: "nada para mudar" }, 400);

  mudar("atualizado_em", agora());

  const sets = campos.map((c, i) => `${c} = ?${i + 1}`).join(", ");

  // A conferencia de "sobra outro gestor" foi feita la em cima, mas dois
  // pedidos simultaneos passariam os dois por ela e a casa acabaria sem
  // gestor nenhum, sem volta. Por isso ela vai TAMBEM para dentro do
  // proprio update: mexer no papel ou no ativo de um gestor so acontece
  // se, no instante da escrita, existir outro gestor ativo.
  const mexeNoGestor = corpo.papel !== undefined || corpo.ativo !== undefined;
  const trava = (mexeNoGestor && alvo.papel === "gestor")
    ? ` and exists (select 1 from pessoas where papel = 'gestor' and ativo = 1 and id <> ?${campos.length + 1})`
    : "";

  const feito = await env.DB.prepare(
    `update pessoas set ${sets} where id = ?${campos.length + 1}${trava}`,
  ).bind(...valores, id).run();

  if (trava && feito.meta.changes === 0) {
    return json({ ok: false, erro: "esta é a única pessoa com acesso de gestor. Faça outra gestora antes." }, 409);
  }

  // Desligar alguem ou zerar a senha dela derruba as sessoes abertas.
  // Sem isto, quem foi desligada continuaria dentro ate o cracha vencer,
  // e "tirei o acesso dela" seria mentira por ate um mes.
  if (corpo.ativo === false || corpo.prova !== undefined) {
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
