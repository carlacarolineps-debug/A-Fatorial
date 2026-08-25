# Ideia Que Vende na Cloudflare

Tudo num domínio só: a landing pública, o sistema atrás de login e as
respostas do Typeform caindo num banco que é só de vocês.

```
ideiaquevende.com.br/            landing, pública
ideiaquevende.com.br/sistema/    sistema, atrás do Cloudflare Access
ideiaquevende.com.br/typeform    recebe o webhook (só quem assina passa)
ideiaquevende.com.br/leads       lê os leads (só quem passou pelo Access)
```

## Por que Cloudflare e não Netlify

A landing é um arquivo estático: sobe em Netlify, Cloudflare, KingHost,
GitHub Pages, em qualquer lugar. Não é aí que a decisão se define.

A decisão se define no **login do sistema**. O site é público, o sistema
não pode ser. Na Cloudflare isso é o **Access**: uma parede de login na
frente de `/sistema/`, sem escrever uma linha de código de autenticação.
Você cadastra os e-mails que podem entrar e a Cloudflare cuida do resto.

No Netlify, proteger uma pasta por senha é recurso de plano pago, e o
Netlify Identity foi descontinuado para sites novos. Sobraria construir o
login dentro do `index.html`, que é bem mais trabalho e mais risco.

Some a isso o banco (D1) e a função do webhook (Worker) na mesma conta, e
a Cloudflare resolve as quatro peças em um lugar.

## Passo a passo

**1. Banco — já feito**

O banco `ideia-que-vende` já existe na conta de vocês, com as tabelas
`leads` e `webhook_log` criadas e o `database_id` já preenchido no
`wrangler.toml`. O `schema.sql` fica aqui como registro do que foi
aplicado; não precisa rodar de novo.

**2. Segredo do webhook**

Invente uma senha longa e aleatória. Ela vai nos dois lados: aqui e no
Typeform. Nunca no git.

```bash
npx wrangler secret put TYPEFORM_WEBHOOK_SECRET
```

**3. Subir o Worker**

```bash
npx wrangler deploy
```

**4. Ligar o Typeform**

No formulário: **Connect → Webhooks → Add a webhook**.

- Endpoint: `https://ideiaquevende.com.br/typeform`
- Secret: a mesma senha do passo 2

Manda um teste pelo próprio painel. Deve responder `{"ok":true}`.
Se der 401, a senha está diferente entre os dois lados.

**5. Landing e sistema**

Suba os arquivos no Cloudflare Pages:

- `ideia-que-vende.html` como `index.html` na raiz
- `og-image.png` na raiz, ao lado dele
- `index.html` (o sistema) dentro de `/sistema/`

**6. A parede de login**

Zero Trust → Access → Applications → Add an application → Self-hosted:

- Path: `ideiaquevende.com.br/sistema`
- Regra: e-mails de quem pode entrar, ou o domínio de e-mail de vocês

Faça o mesmo para `/leads`, com a mesma regra.

Pegue o seu subdomínio do Zero Trust (algo como `grupoa.cloudflareaccess.com`),
ponha em `TEAM_DOMAIN` no `wrangler.toml` e rode `npx wrangler deploy` de novo.
Sem isso a rota `/leads` recusa todo mundo, por segurança.

## Conferindo

```bash
# tem que responder 401: sem assinatura, ninguém entra
curl -i -X POST https://ideiaquevende.com.br/typeform -d '{}'

# o que chegou, inclusive o que falhou
npx wrangler d1 execute ideia-que-vende --remote \
  --command="select recebido_em, processado, erro from webhook_log order by id desc limit 10"

# os leads
npx wrangler d1 execute ideia-que-vende --remote \
  --command="select criado_em, nome, email, plano, status from leads order by id desc limit 20"
```

## Como o Worker se comporta

- **Confere a assinatura sobre o corpo cru.** Mudou um byte depois de
  assinado, não passa. Testado.
- **Grava o payload cru antes de processar.** Quando der problema em
  produção, esse log é a única coisa que vai existir para explicar.
- **Não duplica.** O Typeform reenvia quando não recebe 200; o `token` da
  resposta é único, então reenvio atualiza em vez de criar outro lead.
- **Responde 200 quando entendeu o payload**, mesmo se falhar depois. Erro
  nosso não é motivo para o Typeform ficar reenviando. O erro fica no log.
- **Não lê por posição.** Cada resposta é casada com a pergunta pelo id do
  campo. Mudou o formulário, o campo novo entra em `respostas` sem quebrar.

## O que ainda falta

O sistema (`index.html`) guarda tudo em `localStorage`, no navegador de
quem abriu, naquele aparelho. Ele ainda não lê a rota `/leads`. Essa é a
próxima etapa: uma tela de leads que busca de lá.

Vale saber que isso vale para o resto do sistema também: hoje duas pessoas
que abrem o arquivo veem dados diferentes, porque cada uma tem o seu
próprio armazenamento local.
