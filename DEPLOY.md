# Publicar o site

A landing e o sistema sobem juntos, num projeto só, num domínio só.
Não existe passo de build: o site é HTML pronto.

    seudominio.com.br/           landing (pública)
    seudominio.com.br/sistema/   sistema (atrás de login)
    seudominio.com.br/typeform   recebe as respostas do Typeform
    seudominio.com.br/leads      devolve os leads para a mesa

---

## Antes de começar: apague o Worker de teste

Você criou um Worker chamado **orgulho-névoa-d805** (`proud-haze-d805`).
Ele é o "Hello World" que a Cloudflare cria sozinha e não serve para nada
aqui. Pior: quando um Worker é ligado a um repositório, o nome dele no
painel **precisa ser igual** ao nome que está no `wrangler.toml`
(`ideia-que-vende`). Nomes diferentes = build falha.

1. **Workers & Pages** → clique em **orgulho-névoa-d805**
2. **Settings** → role até o fim → **Delete** → confirme digitando o nome

---

## 1. Ligar o repositório

1. **Workers & Pages** → botão **Criar aplicativo** (Create application)
2. Na caixa **Importar um repositório** (Import a repository) →
   **Começar** (Get started)
3. Escolha a conta do GitHub e autorize a Cloudflare a ver o repositório
   `A-Fatorial` (se ele não aparecer, clique em *Add account* /
   *Configure* e libere o repositório na tela do GitHub)
4. Selecione **A-Fatorial**
5. Na tela de configuração:

   | Campo                     | O que colocar                       |
   |---------------------------|-------------------------------------|
   | Nome do Worker            | `ideia-que-vende`                   |
   | Branch de produção        | `claude/animated-shader-hero-thcafz`|
   | Comando de build          | **deixe vazio**                     |
   | Comando de deploy         | `npx wrangler deploy`               |
   | Diretório raiz            | `/`                                 |

   > Comando de build vazio é de propósito. O site já é HTML pronto,
   > não há nada para compilar.

6. **Save and Deploy**

Ao final aparece um endereço `ideia-que-vende.gestaogrupoa.workers.dev`.
Abra: a landing tem que carregar. Esse é o teste de que subiu.

---

## 2. Ligar o banco (D1)

O banco `ideia-que-vende` já existe e as tabelas já estão criadas. Falta
só ligar ao Worker.

1. **Workers & Pages** → **ideia-que-vende** → **Settings**
2. **Bindings** → **Add** → **D1 database**
3. Variable name: `DB` · D1 database: `ideia-que-vende`
4. **Deploy**

> O `wrangler.toml` já traz esse binding, então ele costuma aparecer
> sozinho. Se já estiver lá, não faça nada.

---

## 3. Colocar o domínio

1. Ainda em **Settings** → **Domains & Routes** → **Add** → **Custom domain**
2. Digite o domínio (ex.: `ideiaquevende.com.br`) → **Add domain**

O domínio precisa estar na sua conta Cloudflare. Se ainda não estiver:
**Websites** → **Add a site**, e troque os nameservers no registrador
(Registro.br, GoDaddy, onde o domínio foi comprado). Isso leva de minutos
a algumas horas para propagar.

### Depois que o domínio funcionar, desligue o endereço de teste

O `.workers.dev` serve o `/sistema/` para qualquer um que souber o
endereço, e o Access (passo 5) protege só o domínio de verdade.

**Settings** → **Domains & Routes** → na linha `workers.dev` →
**Disable** (ou o "..." → Remove)

---

## 4. Guardar o segredo do Typeform

1. Abra o Typeform → seu formulário → **Connect** → **Webhooks** →
   **Add a webhook**
2. Endpoint: `https://seudominio.com.br/typeform`
3. Ligue **Secret** e escreva uma senha longa e aleatória. **Copie.**
4. **Save** e depois **Test webhook** (guarde para o passo 6)

Agora no Cloudflare:

5. **ideia-que-vende** → **Settings** → **Variables and Secrets** → **Add**
6. Type: **Secret** (não "Text") · Name: `TYPEFORM_WEBHOOK_SECRET` ·
   Value: a senha que você copiou
7. **Deploy**

> Tem que ser tipo **Secret**. Como "Text" ele fica legível no painel.

---

## 5. Trancar o /sistema com o Cloudflare Access

Isso põe uma tela de login na frente do sistema sem escrever uma linha de
código de autenticação.

1. No menu da esquerda: **Zero Trust** (abre em outra aba)
2. Se for a primeira vez, ele pede para escolher um **team name**. Escolha
   (ex.: `grupoa`) e pegue o plano **Free**, que cobre até 50 pessoas.
3. **Access** → **Applications** → **Add an application** → **Self-hosted**
4. Preencha:

   | Campo             | Valor                    |
   |-------------------|--------------------------|
   | Application name  | Sistema                  |
   | Subdomain         | *(vazio)*                |
   | Domain            | `seudominio.com.br`      |
   | Path              | `sistema`                |

5. **Next** → crie uma policy:

   | Campo    | Valor                                  |
   |----------|----------------------------------------|
   | Name     | Equipe                                 |
   | Action   | Allow                                  |
   | Include  | **Emails** → liste os e-mails da equipe|

6. **Next** → **Add application**

Repita o mesmo para a rota de dados, senão o `/leads` fica aberto:

7. **Add an application** → **Self-hosted** → name `Leads`,
   domain `seudominio.com.br`, path `leads`, mesma policy.

### Pegue os dois valores que faltam

Ainda em **Access** → **Applications** → clique em **Sistema** → aba
**Overview**. Copie:

- o **team domain** (algo como `grupoa.cloudflareaccess.com`)
- a **Application Audience (AUD) Tag** (um hexadecimal comprido)

Me mande os dois. Eles entram no `wrangler.toml` e destrancam o `/leads`.
Enquanto estiverem vazios, o `/leads` responde:

    {"erro":"falta configurar no Worker: TEAM_DOMAIN, ACCESS_AUD"}

Isso é de propósito: sem eles não dá para conferir quem está entrando, e
deixar passar seria pior que fechar.

> Por que o AUD também: o mesmo Zero Trust assina o crachá de **todas** as
> aplicações da conta, e você tem outro projeto nela. Sem conferir o AUD,
> quem tem acesso a qualquer outra aplicação do time leria os leads daqui.

---

## 6. Conferir que o Typeform chegou

No Typeform, **Connect** → **Webhooks** → **View deliveries**. A entrega
de teste tem que aparecer com **200**.

Se der 401, o segredo do painel não é o mesmo do Typeform. Refaça o
passo 4.

Para ver o que chegou no banco, aqui no chat eu consulto direto. Ou pelo
painel: **Storage & Databases** → **D1** → **ideia-que-vende** →
**Console**:

```sql
select criado_em, nome, email, whatsapp, plano from leads order by id desc;
```

---

## O que falta depois disso

- Trocar o domínio de exemplo dentro do `public/index.html` (4 lugares:
  `canonical`, `og:url`, `og:image`, `twitter:image`). Um comando resolve:

  ```sh
  sed -i 's|ideiaquevende\.com\.br|SEUDOMINIO.com.br|g' public/index.html
  ```

  O `robots.txt` e o `sitemap.xml` **não** precisam: são montados na hora,
  a partir do domínio que o visitante pediu.

- Uma tela de leads dentro do sistema, lendo `/leads`. Ainda não existe.

---

## Como isso é publicado dali em diante

Todo `git push` na branch `claude/animated-shader-hero-thcafz` refaz o
deploy sozinho. Para acompanhar: **ideia-que-vende** → **Deployments**.
