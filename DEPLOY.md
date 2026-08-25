# Publicar na Cloudflare

Tudo num domínio só, num projeto só:

```
ideiaquevende.com.br/            landing, pública
ideiaquevende.com.br/sistema/    sistema, atrás do Cloudflare Access
ideiaquevende.com.br/typeform    recebe o webhook (só quem assina passa)
ideiaquevende.com.br/leads       lê os leads (só quem passou pelo Access)
```

## Como o repositório está organizado

| Pasta | O que é |
|-------|---------|
| `public/` | o site. É isso que o Pages publica |
| `public/index.html` | a landing |
| `public/sistema/index.html` | o sistema de gestão |
| `functions/` | vira `/typeform` e `/leads` no mesmo domínio |
| `schema.sql` | registro do que já foi aplicado no banco |
| `wrangler.toml` | amarra tudo |

As duas rotas são **Pages Functions**: sobem junto com o site, no mesmo
deploy. Não existe Worker separado nem rota para configurar.

## O que já está pronto

- Banco D1 `ideia-que-vende` criado, com as tabelas `leads` e `webhook_log`
  e os índices. O `database_id` já está no `wrangler.toml`.
- As duas rotas escritas e testadas.
- A landing com o link "Entrar no sistema" apontando para `/sistema/`.

## O que falta, e só você pode fazer

**1. Criar o projeto no Pages**

Workers & Pages → Create → Pages → conecte este repositório.

- Build command: deixe vazio (não há build)
- Build output directory: `public`

**2. Ligar o banco ao projeto**

Settings → Bindings → D1 database binding:
- Variable name: `DB`
- Database: `ideia-que-vende`

Sem isso as rotas sobem, mas quebram ao tocar no banco.

**3. Pôr o segredo**

Settings → Variables and Secrets → Add:
- Nome: `TYPEFORM_WEBHOOK_SECRET`
- Tipo: **Secret** (não "Text", senão fica visível)
- Valor: uma senha longa e aleatória, inventada por você

A mesma senha vai no Typeform, no passo 5.

**4. Domínio**

Custom domains → adicione `ideiaquevende.com.br`.

Depois troque `https://ideiaquevende.com.br/` pelo domínio real em quatro
lugares do `public/index.html` (`canonical`, `og:url`, `og:image`,
`twitter:image` — há um comentário marcando) e em `public/robots.txt` e
`public/sitemap.xml`.

**5. Ligar o Typeform**

No formulário: Connect → Webhooks → Add a webhook.

- Endpoint: `https://ideiaquevende.com.br/typeform`
- Secret: a mesma senha do passo 3

Mande um teste pelo painel do próprio Typeform. Deve responder `{"ok":true}`.
Se der 401, a senha está diferente entre os dois lados.

**6. A parede de login**

Zero Trust → Access → Applications → Add an application → Self-hosted.

Uma aplicação para `ideiaquevende.com.br/sistema` e outra para
`ideiaquevende.com.br/leads`, ambas com a regra dos e-mails de quem pode
entrar.

Pegue o seu subdomínio do Zero Trust (algo como `grupoa.cloudflareaccess.com`),
ponha em `TEAM_DOMAIN` no `wrangler.toml` e publique de novo. **Sem isso a
rota `/leads` recusa todo mundo**, por segurança.

## Conferindo depois de publicar

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

## Como as rotas se comportam

- **Conferem a assinatura sobre o corpo cru.** Mudou um byte depois de
  assinado, não passa. Testado.
- **Gravam o payload cru antes de processar.** Quando der problema em
  produção, esse log é a única coisa que vai existir para explicar.
- **Não duplicam.** O Typeform reenvia quando não recebe 200; o `token` da
  resposta é único, então reenvio atualiza em vez de criar outro lead.
- **Respondem 200 quando entenderam o payload**, mesmo se falharem depois.
  Erro nosso não é motivo para o Typeform ficar reenviando. Fica no log.
- **Não leem por posição.** Cada resposta é casada com a pergunta pelo id do
  campo. Mudou o formulário, o campo novo entra em `respostas` sem quebrar.
- **`/leads` confere o JWT do Access contra as chaves públicas do time.** O
  cabeçalho sozinho não basta: mandar ele na mão devolve 401.

## O que ainda falta no sistema

O sistema guarda tudo em `localStorage`, no navegador de quem abriu, naquele
aparelho. Ele ainda não lê a rota `/leads` — essa é a próxima etapa.

Vale saber que isso vale para o sistema inteiro: hoje duas pessoas que abrem
o sistema veem dados diferentes, porque cada uma tem o seu próprio
armazenamento local. Pôr o Access na frente resolve *quem entra*, não faz os
dados serem compartilhados.
