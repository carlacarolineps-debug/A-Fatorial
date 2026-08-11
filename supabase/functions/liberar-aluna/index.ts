// =====================================================================
// OPERAÇÃO BLINDADA · liberar-aluna
//
// Uma função, três usos, sempre o mesmo caminho:
//   1. a inscrição chega pela TMB e o webhook chama aqui;
//   2. a Carla aperta "Liberar o acesso" na mesa dela;
//   3. a aluna pede "reenviar a minha senha temporária".
//
// O que ela faz, na ordem:
//   a. sorteia uma senha temporária legível;
//   b. cria a conta (ou troca a senha, se a conta já existir), e marca
//      no perfil que aquela senha é temporária;
//   c. deixa o acesso ativo;
//   d. manda o e-mail com a senha.
//
// A marca "senha_temporaria" é o que faz o app EXIGIR que a pessoa
// escolha a senha dela antes de abrir. Sem essa marca, ela continuaria
// usando para sempre uma senha que passou por e-mail.
//
// Deploy:
//   supabase functions deploy liberar-aluna
// Segredos:
//   supabase secrets set GMAIL_USER=gestaogrupoa@gmail.com
//   supabase secrets set GMAIL_APP_PASSWORD=as16letrassemespaco
//   supabase secrets set APP_URL=https://carlacarolineps-debug.github.io/A-Fatorial/
// =====================================================================
import { createClient } from "jsr:@supabase/supabase-js@2";
/* denomailer, e não o pacote do JSR: o @denodrivers/smtp existe no
   deno.land mas NÃO está publicado no JSR, e o bundler da Edge Function
   recusa a publicação inteira quando não acha o pacote. */
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const URL_SB  = Deno.env.get("SUPABASE_URL")!;
const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GMAIL   = Deno.env.get("GMAIL_USER") ?? "";
const GMAIL_PW= Deno.env.get("GMAIL_APP_PASSWORD") ?? "";
const APP_URL = Deno.env.get("APP_URL") ?? "";

const db = createClient(URL_SB, SERVICE, { auth: { persistSession: false } });

/* ---------------------------------------------------------------------
   A senha temporária: 3 letras, 4 números, 3 letras.
   Sem i, l, 1, o, 0: são as que a pessoa erra ao copiar do e-mail para o
   celular, e cada erro desses vira uma mensagem para a Carla.
   --------------------------------------------------------------------- */
function senhaTemporaria(): string {
  const letras = "abcdefghjkmnpqrstuvwxyz";
  const nums   = "23456789";
  /* Rejeição, e não módulo direto. 256 não é múltiplo de 23 (o alfabeto
     de letras, sem i, l e o): 256 = 11x23 + 3, então os índices 0, 1 e 2
     recebiam 12 bytes cada e os outros 20 recebiam 11, e as letras a, b e
     c saíam 9% mais que as demais. A perda de entropia hoje é
     desprezível, mas a função é reaproveitável, e o dia em que alguém
     gerar com ela um código de vida longa o viés vai junto sem ninguém
     lembrar de conferir. Descartar a sobra custa alguns bytes e devolve a
     distribuição uniforme que um sorteio de senha deve ter. */
  const sorteia = (alfabeto: string, n: number) => {
    const teto = 256 - (256 % alfabeto.length);
    let saida = "";
    while (saida.length < n) {
      const bytes = new Uint8Array(n * 2);
      crypto.getRandomValues(bytes);
      for (const b of bytes) {
        if (b >= teto) continue;
        saida += alfabeto[b % alfabeto.length];
        if (saida.length === n) break;
      }
    }
    return saida;
  };
  return sorteia(letras, 3) + sorteia(nums, 4) + sorteia(letras, 3);
}

/* ---------------------------------------------------------------------
   O E-MAIL QUE A ALUNA RECEBE

   É o primeiro contato do produto com quem acabou de pagar, e é o único
   passo do caminho que não acontece dentro do app: se ele falhar, a pessoa
   pagou e não entra. Por isso ele é escrito com mais cuidado do que uma
   tela.

   Cinco decisões, e o motivo de cada uma:

   1. TABELA, e não div com flex. Não é preguiça nem código antigo: o
      Outlook desktop renderiza com o motor do Word, que ignora flex, grid
      e boa parte do CSS moderno. Tabela com atributo bgcolor é o que
      atravessa todos os clientes de e-mail que existem.

   2. FUNDO ESCURO DECLARADO NO bgcolor, não só no style. É a marca, e sem
      o atributo o Outlook pinta branco por baixo: o texto claro sumiria.
      O mesmo vale para a moldura clara de reserva.

   3. ACENTO DE VOLTA. A versão anterior escrevia "voce" e "senha
      temporaria" sem acento, por medo de encoding. O corpo vai declarado
      como UTF-8, então o acento chega certo, e texto sem acento num
      e-mail de cobrança tem cara de golpe: é exatamente o padrão que o
      brasileiro aprendeu a desconfiar.

   4. PREHEADER. A primeira linha do corpo é o que o celular mostra na
      lista, ao lado do assunto. Sem ela, aparece "OPERACAO BLINDADA",
      que não diz nada. Com ela, aparece o que a pessoa precisa saber
      antes de abrir.

   5. OS TRÊS PASSOS NUMERADOS. Quem recebe isto acabou de pagar e está
      ansiosa. A pergunta dela é "e agora?". A resposta vai numerada, com
      o e-mail e a senha no meio, e um aviso de que a senha morre no
      primeiro uso.
   --------------------------------------------------------------------- */
function escapar(s: string): string {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

const OURO = "#d9a53a";
const OURO_CLARO = "#f0cd7e";
const CARBONO = "#0b0a0c";
const CARTAO = "#141317";
const TEXTO = "#e8e6e1";
const TEXTO_2 = "#b9b6ad";

function corpoHtml(email: string, senha: string, primeiraVez: boolean): string {
  const titulo = primeiraVez ? "O seu acesso está liberado" : "A sua senha temporária";
  /* O PREHEADER NUNCA LEVA A SENHA.
     Ele é o texto que o celular mostra na TELA DE BLOQUEIO, sem ninguém
     desbloquear nada, e que o computador destravado mostra na lista da
     caixa de entrada. A aluna compra às 21h com o celular em cima da mesa
     do restaurante: com a senha aqui, qualquer pessoa que passe os olhos
     na tela leva o e-mail e a senha inteiros. A senha é o único dado
     deste e-mail que exige o aparelho na mão de quem comprou, e por isso
     ela só existe dentro do corpo. */
  const preheader = primeiraVez
    ? "A sua conta está pronta. Abra para ver o seu acesso e criar a sua senha."
    : "Geramos uma senha nova para você. Abra para ver e entrar.";
  const e = escapar(email);

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>${escapar(titulo)}</title>
</head>
<body style="margin:0;padding:0;background:${CARBONO};">
<!-- o que aparece na lista do celular, ao lado do assunto -->
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0">
  ${escapar(preheader)}
</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${CARBONO}" style="background:${CARBONO};margin:0;padding:0">
 <tr><td align="center" style="padding:28px 16px">

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;width:100%">

   <!-- marca -->
   <tr><td align="center" style="padding:0 0 22px">
     <div style="font-family:Georgia,'Times New Roman',serif;color:${OURO};font-size:11px;letter-spacing:5px;margin:0 0 4px">OPERAÇÃO</div>
     <div style="font-family:Georgia,'Times New Roman',serif;color:#efe9de;font-size:26px;letter-spacing:4px;font-weight:bold;line-height:1.1">BLINDADA</div>
   </td></tr>

   <!-- cartão -->
   <tr><td bgcolor="${CARTAO}" style="background:${CARTAO};border-radius:18px;padding:28px 24px">

     <div style="font-family:Arial,Helvetica,sans-serif;font-size:19px;font-weight:bold;color:#efe9de;margin:0 0 8px">${escapar(titulo)}</div>
     <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:${TEXTO_2};margin:0 0 22px">
       ${primeiraVez
         ? "A sua inscrição foi confirmada e a sua conta já está pronta. São três passos, e leva menos de um minuto."
         : "Geramos uma senha nova para você entrar. São três passos, e leva menos de um minuto."}
     </div>

     <!-- passo 1 -->
     <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:2px;color:${OURO};margin:0 0 8px">PASSO 1: ABRA O APLICATIVO</div>
     ${APP_URL ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 6px">
       <tr><td bgcolor="${OURO}" style="background:${OURO};border-radius:999px">
         <a href="${escapar(APP_URL)}" style="display:block;padding:14px 30px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#20180a;text-decoration:none;line-height:1.2">Abrir a Operação Blindada</a>
       </td></tr></table>
       <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#8b8574;margin:0 0 22px">
         Se o botão não funcionar, copie este endereço:<br>
         <span style="color:${TEXTO_2};word-break:break-all">${escapar(APP_URL)}</span>
       </div>`
       : `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:${TEXTO_2};margin:0 0 22px">Abra o aplicativo da Operação Blindada.</div>`}

     <!-- passo 2 -->
     <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:2px;color:${OURO};margin:0 0 8px">PASSO 2: ENTRE COM ESTES DOIS DADOS</div>
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${CARBONO}" style="background:${CARBONO};border-radius:14px;margin:0 0 10px">
      <tr><td style="padding:18px 16px" align="center">
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:2px;color:#8b8574;margin:0 0 6px">O SEU E-MAIL</div>
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:bold;color:${OURO_CLARO};word-break:break-all;margin:0 0 18px">${e}</div>
        <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:2px;color:#8b8574;margin:0 0 6px">A SUA SENHA TEMPORÁRIA</div>
        <div style="font-family:'Courier New',Courier,monospace;font-size:28px;font-weight:bold;color:${OURO_CLARO};letter-spacing:3px;line-height:1.2">${senha}</div>
      </td></tr>
     </table>
     <div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;color:${TEXTO_2};margin:0 0 22px">
       É este endereço mesmo, o da sua inscrição. O aplicativo não reconhece outro.
     </div>

     <!-- passo 3 -->
     <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:2px;color:${OURO};margin:0 0 8px">PASSO 3: CRIE A SUA SENHA</div>
     <div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:${TEXTO_2};margin:0 0 4px">
       Assim que você entrar, o aplicativo pede uma senha sua. A senha acima
       deixa de valer nesse momento: ela serve só para esta primeira entrada.
     </div>

   </td></tr>

   <!-- pé -->
   <tr><td style="padding:22px 8px 0">
     <div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.7;color:#8b8574">
       Ficou com dúvida? Responda este e-mail, que ele chega em mim.
     </div>
     <div style="font-family:Georgia,'Times New Roman',serif;font-size:15px;color:${TEXTO};margin:14px 0 0">Carla Caroline</div>
     <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#6f6a61;margin:16px 0 0;border-top:1px solid rgba(255,255,255,.08);padding-top:14px">
       Você recebeu este e-mail porque a sua inscrição na mentoria Operação
       Blindada foi confirmada. Se não foi você quem se inscreveu, ignore esta
       mensagem: sem a senha acima ninguém entra na conta.
     </div>
   </td></tr>

  </table>
 </td></tr>
</table>
</body>
</html>`;
}

function corpoTexto(email: string, senha: string, primeiraVez: boolean): string {
  return `OPERAÇÃO BLINDADA
${primeiraVez ? "O seu acesso está liberado" : "A sua senha temporária"}

${primeiraVez
  ? "A sua inscrição foi confirmada e a sua conta já está pronta."
  : "Geramos uma senha nova para você entrar."}
São três passos, e leva menos de um minuto.

PASSO 1: ABRA O APLICATIVO
${APP_URL || "Abra o aplicativo da Operação Blindada."}

PASSO 2: ENTRE COM ESTES DOIS DADOS
O seu e-mail: ${email}
A sua senha temporária: ${senha}

É este endereço mesmo, o da sua inscrição. O aplicativo não reconhece outro.

PASSO 3: CRIE A SUA SENHA
Assim que você entrar, o aplicativo pede uma senha sua. A senha acima deixa
de valer nesse momento: ela serve só para esta primeira entrada.

Ficou com dúvida? Responda este e-mail, que ele chega em mim.
Carla Caroline

Você recebeu este e-mail porque a sua inscrição na mentoria Operação Blindada
foi confirmada. Se não foi você quem se inscreveu, ignore esta mensagem: sem a
senha acima ninguém entra na conta.`;
}

async function mandarEmail(para: string, senha: string, primeiraVez: boolean) {
  if (!GMAIL || !GMAIL_PW) throw new Error("faltam os segredos GMAIL_USER e GMAIL_APP_PASSWORD");
  const cliente = new SMTPClient({
    connection: {
      hostname: "smtp.gmail.com",
      port: 465,
      tls: true,
      auth: { username: GMAIL, password: GMAIL_PW },
    },
  });
  try {
    await cliente.send({
      /* o nome do remetente é o da mentoria, e não o endereço cru: na lista
         do celular aparece "Operação Blindada", que é o que ela reconhece */
      from: `Operação Blindada <${GMAIL}>`,
      to: para,
      /* Responder tem que chegar em alguém. Sem replyTo, a resposta vai para
         a caixa de onde o robô mandou, e o e-mail convida a responder. */
      replyTo: GMAIL,
      subject: primeiraVez
        ? "O seu acesso à Operação Blindada está liberado"
        : "A sua nova senha temporária",
      content: corpoTexto(para, senha, primeiraVez),
      html: corpoHtml(para, senha, primeiraVez),
      /* Auto-Submitted diz ao servidor do outro lado que isto é automático:
         evita resposta automática de férias voltando em laço.
         X-Auto-Response-Suppress faz o mesmo do lado da Microsoft.

         DOIS CABEÇALHOS QUE NÃO ESTÃO AQUI, DE PROPÓSITO:

         Precedence: bulk marca a mensagem como mala direta. Isto é o
         oposto: transacional, um destinatário, disparado por uma compra.
         Marcar como bulk empurra o e-mail para a aba de promoções, que é
         justamente onde a senha não pode cair.

         List-Unsubscribe não se aplica. Ele existe para quem manda em
         massa, e não há do que a compradora se descadastrar: este é o
         e-mail que entrega o acesso que ela pagou. Um botão de sair da
         lista aqui seria um botão de perder o próprio acesso. */
      headers: {
        "Auto-Submitted": "auto-generated",
        "X-Auto-Response-Suppress": "OOF, AutoReply",
      },
    });
  } finally {
    try { await cliente.close(); } catch { /* fechar não pode derrubar o resto */ }
  }
}

/* ---------------------------------------------------------------------
   Quem é a conta hoje: existe? já tem senha escolhida por ela?
   --------------------------------------------------------------------- */
async function achar(email: string): Promise<
  { id: string | null; jaTemSenhaPropria: boolean; jaRecebeuSenha: boolean }
> {
  const { data } = await db.rpc("user_id_por_email", { p_email: email });
  if (!data) return { id: null, jaTemSenhaPropria: false, jaRecebeuSenha: false };
  const id = data as string;
  const { data: u } = await db.auth.admin.getUserById(id);
  const meta = (u?.user?.user_metadata ?? {}) as Record<string, unknown>;
  const jaEntrou = !!u?.user?.last_sign_in_at;

  /* DUAS CONDIÇÕES, E NÃO UMA. A versão anterior perguntava só pela
     marca: "não tem senha_temporaria ligada, logo já escolheu a senha
     dela". Esse raciocínio tem um buraco enorme, e ele engoliu todas as
     vendas automáticas: uma conta recém-criada também não tem a marca,
     porque não tem metadata nenhum. undefined !== true dá verdadeiro, e a
     conta sem senha alguma era tratada como conta com senha própria.

     Agora vale o que é observável: só tem senha própria quem JÁ ENTROU
     alguma vez. Quem nunca entrou não pode ter escolhido senha, por
     definição. A marca continua valendo para o caso normal (entrou uma
     vez com a temporária e ainda não trocou). */
  const jaTemSenhaPropria = jaEntrou && meta.senha_temporaria !== true;

  /* E uma terceira pergunta, para não mandar dois e-mails. Vendas e
     Financeiro chegam quase juntos e os dois liberam acesso: sem isto, a
     aluna recebia duas senhas diferentes com minutos de diferença e só a
     segunda funcionava, o que é pior do que não receber nada. Se a senha
     temporária foi enviada há pouco e ainda não foi usada, ela continua
     valendo e não se manda outra. */
  const em = Number(meta.senha_em ?? 0);
  const recente = em > 0 && (Date.now() - em) < 24 * 3600 * 1000;
  const jaRecebeuSenha = !jaEntrou && meta.senha_temporaria === true && recente;

  return { id, jaTemSenhaPropria, jaRecebeuSenha };
}

/* Cria ou troca a senha, e sempre deixa a marca de temporária ligada.

   A marca vai com CARIMBO DE HORA (senha_em). Sem ele não dá para
   responder duas perguntas que aparecem em produção: "esta senha foi
   mandada agora ou há três meses?" e "quem recebeu a senha e nunca
   entrou?". É o carimbo que impede o segundo e-mail quando Vendas e
   Financeiro chegam juntos.

   Todas as escritas conferem o erro. Uma troca de senha que falha em
   silêncio, seguida de um e-mail que sai, entrega para a aluna uma senha
   que não existe na conta dela. */
async function prepararConta(email: string, senha: string, id: string | null): Promise<{ id: string | null; nova: boolean }> {
  const marca = { senha_temporaria: true, senha_em: Date.now() };
  if (id) {
    const { error } = await db.auth.admin.updateUserById(id, {
      password: senha,
      email_confirm: true,
      user_metadata: marca,
    });
    if (error) throw new Error("nao consegui trocar a senha: " + error.message);
    return { id, nova: false };
  }
  const { data: novo, error } = await db.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,                       // sem isto ela precisaria confirmar antes de entrar
    user_metadata: marca,
  });
  if (error) {
    /* corrida: alguém criou entre a busca e a criação */
    const { data: denovo } = await db.rpc("user_id_por_email", { p_email: email });
    if (denovo) {
      const { error: e2 } = await db.auth.admin.updateUserById(denovo as string, {
        password: senha, user_metadata: marca,
      });
      if (e2) throw new Error("nao consegui trocar a senha: " + e2.message);
      return { id: denovo as string, nova: false };
    }
    throw new Error("nao consegui criar a conta: " + error.message);
  }
  return { id: novo?.user?.id ?? null, nova: true };
}

async function ativarAcesso(email: string, id: string | null) {
  const linha: Record<string, unknown> = {
    email, status: "active", atualizado_em: new Date().toISOString(),
  };
  if (id) linha.user_id = id;
  await db.from("access").upsert(linha, { onConflict: "email" });
}

/* ---------------------------------------------------------------------
   O caminho inteiro, num lugar só.

   soSeNova existe por causa da régua de parcelas: o webhook Financeiro
   confirma pagamento todo mês e reativa o acesso a cada um. Sem esta
   trava, cada parcela paga sortearia uma senha nova e derrubaria a senha
   que a aluna escolheu. Com ela, o e-mail sai uma vez só, e as
   reativações seguintes só mexem no acesso.
   --------------------------------------------------------------------- */
export async function liberar(emailBruto: string, motivo: string, soSeNova = false) {
  const email = String(emailBruto || "").trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, erro: "e-mail invalido" };
  }
  const antes = await achar(email);
  if (soSeNova && antes.id && antes.jaTemSenhaPropria) {
    await ativarAcesso(email, antes.id);
    return { ok: true, email, acao: "acesso reativado, a senha dela continua valendo" };
  }
  /* Vendas e Financeiro chegam quase juntos, e os dois liberam acesso.
     Sem esta segunda trava a aluna recebia dois e-mails com senhas
     diferentes em minutos, e só a segunda funcionava: pior do que não
     receber nada, porque ela tenta a primeira e conclui que o app está
     quebrado. Se a senha temporária saiu há menos de 24h e ainda não foi
     usada, ela continua valendo. */
  if (soSeNova && antes.id && antes.jaRecebeuSenha) {
    await ativarAcesso(email, antes.id);
    return { ok: true, email, acao: "acesso confirmado, a senha temporaria enviada ha pouco continua valendo" };
  }

  const senha = senhaTemporaria();
  const conta = await prepararConta(email, senha, antes.id);
  await ativarAcesso(email, conta.id);

  /* O e-mail é a última coisa: se ele falhar, o acesso já está liberado e
     a Carla consegue reenviar pela mesa, sem a aluna ficar sem acesso. */
  try {
    await mandarEmail(email, senha, conta.nova);
  } catch (e) {
    await db.from("webhook_log").insert({
      origem: "liberar-aluna", processado: false,
      erro: "acesso liberado mas o e-mail falhou: " + String((e as Error)?.message ?? e),
      payload: { email, motivo } as never,
    });
    return { ok: true, email, aviso: "acesso liberado, mas o e-mail nao saiu" };
  }
  return { ok: true, email, nova: conta.nova };
}

/* ---------------------------------------------------------------------
   Quem pode chamar: a mentora (pelo app, com o token dela) ou o próprio
   servidor (o webhook, com a service_role). Mais ninguém.
   --------------------------------------------------------------------- */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors() });
  }
  if (req.method !== "POST") return new Response("metodo", { status: 405, headers: cors() });

  let corpo: { email?: string; motivo?: string; so_se_nova?: boolean } = {};
  try { corpo = await req.json(); } catch { /* corpo vazio cai na validação */ }

  const auth = req.headers.get("authorization") ?? "";
  const token = auth.replace(/^Bearer\s+/i, "");
  let autorizado = false;

  if (token && token === SERVICE) {
    autorizado = true;                                   // o próprio servidor
  } else if (token) {
    /* é a mentora? quem responde é o banco, com o token dela */
    const comToken = createClient(URL_SB, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });
    const { data } = await comToken.rpc("eh_mentora");
    autorizado = data === true;
  }

  if (!autorizado) {
    return new Response(JSON.stringify({ erro: "nao autorizado" }), {
      status: 401, headers: { ...cors(), "content-type": "application/json" },
    });
  }

  try {
    const r = await liberar(corpo.email ?? "", corpo.motivo ?? "manual", corpo.so_se_nova === true);
    return new Response(JSON.stringify(r), {
      status: 200, headers: { ...cors(), "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, erro: String((e as Error)?.message ?? e) }), {
      status: 200, headers: { ...cors(), "content-type": "application/json" },
    });
  }
});

function cors() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "authorization, content-type, apikey",
    "access-control-allow-methods": "POST, OPTIONS",
  };
}
