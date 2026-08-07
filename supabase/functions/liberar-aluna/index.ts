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
import { SMTPClient } from "jsr:@denodrivers/smtp@0.12";

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
  const sorteia = (alfabeto: string, n: number) => {
    const bytes = new Uint8Array(n);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => alfabeto[b % alfabeto.length]).join("");
  };
  return sorteia(letras, 3) + sorteia(nums, 4) + sorteia(letras, 3);
}

/* ---------------------------------------------------------------------
   O e-mail. Vai como texto E como html: cliente de e-mail que recusa
   html ainda mostra a senha, e é a senha que importa.
   --------------------------------------------------------------------- */
function corpoHtml(senha: string, primeiraVez: boolean): string {
  const titulo = primeiraVez ? "O seu acesso está liberado" : "A sua senha temporária";
  return `
<div style="font-family:Arial,Helvetica,sans-serif;background:#0b0a0c;padding:30px 20px">
  <div style="max-width:460px;margin:0 auto;background:#141317;border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:30px 26px;color:#e8e6e1">
    <p style="color:#c8a24a;font-size:11px;letter-spacing:5px;margin:0 0 3px">OPERACAO</p>
    <h1 style="font-size:25px;letter-spacing:3px;margin:0 0 22px;color:#efe9de;font-weight:700">BLINDADA</h1>
    <p style="font-size:17px;color:#efe9de;margin:0 0 14px;font-weight:600">${titulo}</p>
    <p style="font-size:14.5px;line-height:1.6;margin:0 0 20px;color:#b9b6ad">
      Entre no aplicativo com o <b style="color:#e8e6e1">seu e-mail</b> e a senha abaixo.
      Assim que entrar, o app pede para voce criar a sua propria senha.
    </p>
    <div style="background:#0b0a0c;border:1px solid rgba(233,184,76,.3);border-radius:14px;padding:18px;text-align:center;margin:0 0 20px">
      <p style="font-size:11px;letter-spacing:2px;color:#9a8f78;margin:0 0 8px">SUA SENHA TEMPORARIA</p>
      <p style="font-size:30px;letter-spacing:4px;font-weight:bold;color:#f0cd7e;margin:0;font-family:monospace">${senha}</p>
    </div>
    ${APP_URL ? `<p style="text-align:center;margin:0 0 20px">
      <a href="${APP_URL}" style="display:inline-block;background:#d9a53a;color:#20180a;text-decoration:none;font-weight:bold;font-size:15px;padding:13px 30px;border-radius:999px">Abrir o aplicativo</a>
    </p>` : ""}
    <p style="font-size:13px;line-height:1.6;color:#9a8f78;margin:0 0 6px">
      Esta senha e temporaria e serve so para a primeira entrada. Se nao foi voce quem
      se inscreveu, ignore este e-mail.
    </p>
    <p style="font-size:13px;line-height:1.6;color:#9a8f78;margin:0">
      Duvida? Responda este e-mail.
    </p>
  </div>
</div>`;
}

function corpoTexto(senha: string): string {
  return `OPERACAO BLINDADA

Entre no aplicativo com o seu e-mail e a senha abaixo.
Assim que entrar, o app pede para voce criar a sua propria senha.

SUA SENHA TEMPORARIA: ${senha}
${APP_URL ? `\nAbra o aplicativo: ${APP_URL}\n` : ""}
Esta senha e temporaria e serve so para a primeira entrada.
Se nao foi voce quem se inscreveu, ignore este e-mail.`;
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
      from: `Operacao Blindada <${GMAIL}>`,
      to: para,
      subject: primeiraVez ? "O seu acesso a Operacao Blindada esta liberado" : "A sua senha temporaria",
      content: corpoTexto(senha),
      html: corpoHtml(senha, primeiraVez),
    });
  } finally {
    try { await cliente.close(); } catch { /* fechar não pode derrubar o resto */ }
  }
}

/* ---------------------------------------------------------------------
   Quem é a conta hoje: existe? já tem senha escolhida por ela?
   --------------------------------------------------------------------- */
async function achar(email: string): Promise<{ id: string | null; jaTemSenhaPropria: boolean }> {
  const { data } = await db.rpc("user_id_por_email", { p_email: email });
  if (!data) return { id: null, jaTemSenhaPropria: false };
  const id = data as string;
  const { data: u } = await db.auth.admin.getUserById(id);
  /* a marca só existe enquanto a senha é a que veio por e-mail. Conta
     antiga, de antes desta versão, não tem marca nenhuma: tratar como
     senha própria é o certo, senão a régua de cobrança resetaria a senha
     de quem já usa o app. */
  const meta = (u?.user?.user_metadata ?? {}) as Record<string, unknown>;
  return { id, jaTemSenhaPropria: meta.senha_temporaria !== true };
}

/* Cria ou troca a senha, e sempre deixa a marca de temporária ligada. */
async function prepararConta(email: string, senha: string, id: string | null): Promise<{ id: string | null; nova: boolean }> {
  if (id) {
    await db.auth.admin.updateUserById(id, {
      password: senha,
      email_confirm: true,
      user_metadata: { senha_temporaria: true },
    });
    return { id, nova: false };
  }
  const { data: novo, error } = await db.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,                       // sem isto ela precisaria confirmar antes de entrar
    user_metadata: { senha_temporaria: true },
  });
  if (error) {
    /* corrida: alguém criou entre a busca e a criação */
    const { data: denovo } = await db.rpc("user_id_por_email", { p_email: email });
    if (denovo) {
      await db.auth.admin.updateUserById(denovo as string, {
        password: senha, user_metadata: { senha_temporaria: true },
      });
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
