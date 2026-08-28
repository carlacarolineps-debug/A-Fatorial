# Publicar o site

A landing e o sistema sobem juntos, num projeto só, num domínio só.
Não existe passo de build: o site é HTML pronto.

    ideiaquevende.com.br/           landing (pública)
    ideiaquevende.com.br/sistema/   sistema (atrás de login)
    ideiaquevende.com.br/typeform   recebe as respostas do Typeform
    ideiaquevende.com.br/leads      devolve os leads para a mesa (e anota o andamento)

---

## Onde estamos (28/08/2026)

Este bloco é o resumo para quem chegar agora. O resto do arquivo é o passo
a passo completo.

**No ar e conferido:**

- Worker **`ideia-que-vende`** publicado, com o domínio
  `ideiaquevende.com.br` ligado nele e o banco D1 conectado (binding `DB`).
- **A landing está no ar**, com o botão "Entrar no sistema" no rodapé.
- A branch de publicação foi corrigida hoje: estava apontando para a `main`,
  que só tem o sistema de outro negócio. Leia a seção seguinte, é a
  armadilha que custou um dia.
- **"Builds for non-production branches" desmarcado**, então nenhuma outra
  conversa consegue publicar neste domínio.
- Banco D1 **`ideia-que-vende`** com as tabelas `leads` e `webhook_log`,
  ainda zerado: nenhuma resposta chegou.
- `npm test` passa nas 47 verificações, num clone novo, sem preparo.

**Pronto, mas ainda não publicado:**

- O sistema de gestão próprio, **nove telas**, feito a partir do método da
  landing. Conferido num navegador de verdade, 34 verificações.
- Ele **não entra no ar antes do Cloudflare Access**. Sem login, qualquer
  um com o endereço entra, e foi assim que o sistema do outro negócio
  ficou exposto em 26/08. Enquanto isso, o `/sistema/` mostra uma página
  dizendo que a área está sendo preparada.

**Falta, em ordem:**

1. Desligar o endereço `.workers.dev`, que ainda serve o mesmo site.
2. Ligar o Typeform: campo oculto, webhook e segredo (seção 4).
3. Criar as duas aplicações do Access e preencher `TEAM_DOMAIN` e
   `ACCESS_AUD` (seção 5).
4. Publicar o sistema, depois do passo 3.

---

## A armadilha que custou um dia inteiro

Em 28/08 o dominio passou a mostrar coisa errada, e a causa nao estava no
codigo nem no dominio: estava em **Settings > Builds**, do Worker.

Dois campos, os dois errados:

**Production branch** estava em `main`. So que a `main` deste repositorio
tem dois arquivos: um README e o `index.html` do sistema do A! Fatorial,
outro negocio. Todo o Ideia Que Vende (landing, sistema, `src/`,
`wrangler.toml`) vive na branch de trabalho. A Cloudflare estava tentando
publicar do lugar onde o projeto nao esta.

**"Builds for non-production branches"** estava marcado. Este repositorio
tem 21 branches, de conversas diferentes. Com essa caixa ligada, qualquer
push em qualquer uma delas dispara build. Era a mistura, com nome e
sobrenome: trabalho de outra conversa chegando neste dominio.

O conserto, nessa mesma tela:

    Production branch                    claude/animated-shader-hero-thcafz
    Builds for non-production branches   DESMARCADO

A segunda linha e a que garante a separacao: nenhuma outra conversa
consegue tocar neste dominio, por mais branches que aparecam.

**Como saber se voce caiu nisto de novo.** O dominio mostra algo que voce
nao reconhece, e o codigo publicado nao bate com o ultimo commit da branch
de trabalho. Antes de mexer em qualquer outra coisa, abra Settings > Builds
e confira esses dois campos.

---

## Sobre o nome do Worker

O Worker se chamava **a-fatorial**, batizado automaticamente pelo nome do
repositório, que é de outro negócio. Foi renomeado para **ideia-que-vende**
em 26/08, e o `wrangler.toml` mudou junto no mesmo push: nome diferente
entre painel e código faz o build falhar.

O texto abaixo continua valendo para o nome de hoje.

O Worker se chama **ideia-que-vende** no painel, batizado pelo nome do
repositório. O `wrangler.toml` usa o mesmo nome, e os dois **têm que
continuar iguais**: nome diferente faz o build falhar ou, pior, um
`wrangler deploy` cria um segundo Worker sem o domínio.

Se um dia renomear no painel, mude o `name` no `wrangler.toml` junto.

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
2. Digite `ideiaquevende.com.br` → **Add domain**
3. Repita com `www.ideiaquevende.com.br`, senão quem digitar o "www" na
   frente não chega ao site.

Confira nessa mesma tela que o domínio está no Worker **ideia-que-vende**.

### Apontar o Registro.br para a Cloudflare

O domínio já está na conta Cloudflare, mas só passa a valer quando o
Registro.br apontar para os servidores dela.

**Antes de qualquer clique, confira o que mais usa esse domínio hoje.**
No momento em que os nameservers mudam, a Cloudflare passa a ser a única
resposta para `ideiaquevende.com.br`. Tudo que não estiver na lista de DNS
dela some no mesmo segundo: e-mail, site antigo, subdomínio, sistema de
terceiro. Hoje a lista tem `MX` nulo e `v=spf1 -all`, que significam
"este domínio não recebe e-mail". Se existe e-mail nesse domínio (KingHost
ou qualquer outro), ele para. Copie os registros do provedor atual para a
Cloudflare **antes** de trocar.

**1. Pegue os dois nameservers.** Cloudflare → o domínio → **DNS** →
**Records**, role até o fim: bloco **Cloudflare nameservers**, com dois
endereços no formato `nome.ns.cloudflare.com`. São sorteados por conta, os
seus são diferentes dos de qualquer outra pessoa.

**2. Desligue o DNSSEC no Registro.br, se estiver ligado.** No painel do
domínio, seção **DNSSEC**. Se houver registro DS, remova e salve. Trocar
os nameservers com DNSSEC apontando para o provedor antigo não deixa o
domínio lento: derruba ele por completo, e o erro não explica o motivo.

**3. Troque os servidores.**

1. Entre em `registro.br` (CPF/CNPJ e senha, ou conta gov.br)
2. Painel → clique em **ideiaquevende.com.br**
3. Seção **Servidores DNS** → **Alterar** / ícone de edição
4. Escolha usar servidores DNS **próprios**, não o DNS do Registro.br
5. Apague os que estiverem lá e ponha os dois da Cloudflare, um em cada
   campo. Deixe os campos de IP **vazios**.
6. Salvar

O Registro.br testa se os servidores respondem pelo domínio antes de
aceitar. Como a zona já existe na Cloudflare, passa. Se der "servidor DNS
não responde", espere uns minutos e salve de novo.

**4. Espere.** O `.br` publica em lotes: costuma valer em algumas horas,
com prazo formal de 24h. Na Cloudflare o domínio sai de *Pending
Nameserver Update* e vira **Active**, e chega um e-mail avisando.

**5. Depois de Active.** Ligue **SSL/TLS** → **Edge Certificates** →
**Always Use HTTPS**. Abra `https://ideiaquevende.com.br`: tem que
aparecer a landing.

### Depois que o domínio funcionar, desligue o endereço de teste

O `.workers.dev` serve o `/sistema/` para qualquer um que souber o
endereço, e o Access (passo 5) protege só o domínio de verdade.

**Settings** → **Domains & Routes** → na linha `workers.dev` →
**Disable** (ou o "..." → Remove)

---

## 4. Ligar o Typeform

O formulário é o `m70jOwFd`, o mesmo que está escrito na landing. São
três partes, e a primeira é a que costuma ser esquecida.

### 4a. O campo oculto do plano

Quando alguém clica em "Solicitar análise" num dos três planos, a landing
abre o Typeform com `?plano=start`, `?plano=pro` ou `?plano=premium` no
endereço. Esse valor só chega até o sistema se o formulário tiver um
campo oculto com esse nome exato.

1. Abra o formulário no Typeform
2. **Settings** (ou o ícone de engrenagem) → **Hidden fields**
3. Acrescente um campo chamado **`plano`**, tudo minúsculo, sem acento
4. Salve e publique o formulário

Sem isso, tudo continua funcionando: o lead chega, o nome chega, o e-mail
chega. Só a coluna "plano" fica sempre vazia, e ninguém entende por quê.
É por isso que este passo vem primeiro.

### 4b. O webhook

1. **Connect** → **Webhooks** → **Add a webhook**
2. Endpoint:

       https://ideiaquevende.com.br/typeform

3. Ligue **Secret** e escreva uma senha longa e aleatória. **Copie agora**,
   ela não aparece de novo.
4. **Save**, e depois **Test webhook**

### 4c. O mesmo segredo no Worker

1. **Workers & Pages** → **ideia-que-vende** → **Settings** →
   **Variables and Secrets** → **Add**
2. Type: **Secret**, e não "Text"
3. Name: `TYPEFORM_WEBHOOK_SECRET`
4. Value: a mesma senha do passo 4b, sem espaço sobrando
5. **Deploy**

> Precisa ser do tipo **Secret**. Como "Text" ele fica legível para quem
> abrir o painel.

O servidor confere a assinatura sobre o corpo CRU da mensagem. Se o
segredo dos dois lados não for idêntico, byte a byte, a resposta é 401 e
o lead não entra. Isso é de propósito: sem essa conferência, qualquer um
que descobrisse o endereço encheria a sua mesa de lead falso.

---

## 5. Trancar o sistema com o Cloudflare Access

Isso põe uma tela de login na frente do sistema sem escrever uma linha de
código de autenticação.

**UMA aplicação só, com três caminhos dentro dela.** Isso não é detalhe de
gosto: cada aplicação do Access tem uma etiqueta própria, o AUD, e o
Worker confere **um** AUD. Se `/sistema` e `/leads` estiverem em
aplicações separadas, o login funciona, o sistema abre, e as rotas de
dados respondem 401 para sempre, sem explicação óbvia na tela.

### 5a. Criar o time, se ainda não existir

1. No menu da esquerda do painel: **Zero Trust** (abre em outra aba)
2. Na primeira vez ele pede um **team name**. Escolha (por exemplo
   `grupoa`) e pegue o plano **Free**, que cobre até 50 pessoas.

O nome que você escolher vira o endereço do time,
`<nome>.cloudflareaccess.com`, e é um dos dois valores que eu preciso no
fim.

### 5b. A aplicação

1. **Access** → **Applications** → **Add an application** → **Self-hosted**
2. **Application name:** `Ideia Que Vende`
3. No endereço público, preencha:

   | Subdomain | Domain                 | Path      |
   |-----------|------------------------|-----------|
   | *(vazio)* | `ideiaquevende.com.br` | `sistema` |

4. Procure **Add public hostname** (ou "Add domain", conforme a versão da
   tela) e acrescente **mais dois**, no mesmo formato:

   | Subdomain | Domain                 | Path    |
   |-----------|------------------------|---------|
   | *(vazio)* | `ideiaquevende.com.br` | `leads` |
   | *(vazio)* | `ideiaquevende.com.br` | `eu`    |

   O `/leads` traz as aplicações do Typeform e o `/eu` diz quem entrou.
   Os dois são chamados pelo próprio sistema, por dentro. Se ficarem de
   fora, o sistema abre e não consegue ler nada.

   **Não inclua `/typeform`.** Essa rota é o Typeform batendo na porta, e
   ele não tem como fazer login: ela se protege sozinha pela assinatura
   com o segredo. Se cair dentro do Access, o lead para de chegar.

5. **Next**, e crie a política:

   | Campo   | Valor                                    |
   |---------|------------------------------------------|
   | Name    | `Equipe`                                 |
   | Action  | `Allow`                                  |
   | Include | **Emails** e a lista de e-mails da equipe |

   Comece só com o seu e-mail. Acrescentar gente depois é uma linha nessa
   mesma política.

6. **Next** → **Add application**

### 5c. Os dois valores que eu preciso

**Access** → **Applications** → clique em **Ideia Que Vende** → aba
**Overview**. Copie:

- o **team domain**, algo como `grupoa.cloudflareaccess.com`
- a **Application Audience (AUD) Tag**, um hexadecimal comprido

**Me mande os dois aqui.** Eles entram no `wrangler.toml`, e não no
painel: as variáveis de texto do painel são sobrescritas pelo arquivo a
cada publicação, então preencher lá some sozinho no dia seguinte.

Nenhum dos dois é segredo: o AUD identifica a aplicação, não autoriza
ninguém.

Enquanto estiverem vazios, as rotas respondem:

    {"erro":"falta configurar no Worker: TEAM_DOMAIN, ACCESS_AUD"}

Isso é de propósito. Sem eles não dá para conferir quem está entrando, e
deixar passar seria pior que fechar.

> **Por que conferir o AUD, e não só a assinatura.** O mesmo Zero Trust
> assina o crachá de **todas** as aplicações da conta, e existe outro
> projeto nela. Sem conferir o AUD, quem tem acesso a qualquer outra
> aplicação do time leria os leads daqui.

### 5d. Conferir que pegou

Abra `https://ideiaquevende.com.br/sistema/` numa janela anônima. Tem que
aparecer a tela de login do Cloudflare, e não o sistema.

Depois que eu preencher os dois valores e publicar, a porta do sistema
para de oferecer a escolha de perfil e passa a reconhecer você pelo
e-mail do login.

---

## 6. Conferir que o Typeform chegou

No Typeform, **Connect** → **Webhooks** → **View deliveries**. A entrega
de teste tem que aparecer com **200**.

O que cada resposta quer dizer:

| Resposta | O que aconteceu | O que fazer |
|---|---|---|
| **200** | Chegou e foi gravado | Nada, está funcionando |
| **401** | O segredo dos dois lados não bate | Refaça o passo 4c, atenção a espaço sobrando |
| **405** | O Typeform mandou por GET | Confira o endereço do webhook |
| **404** | O endereço está errado | Tem que ser `/typeform`, sem barra no fim |

Depois de uma resposta de teste real, confira se o plano chegou. Se a
coluna `plano` vier vazia mesmo tendo clicado num plano na landing, o
campo oculto do passo 4a não foi criado.

Para ver o que chegou no banco, aqui no chat eu consulto direto. Ou pelo
painel: **Storage & Databases** → **D1** → **ideia-que-vende** →
**Console**:

```sql
select criado_em, nome, email, whatsapp, plano from leads order by id desc;
```

---

## O que falta depois disso

- Uma tela de leads dentro do sistema, lendo `/leads`. Ainda não existe.

> **O domínio já está certo no código.** O endereço que estava escrito como
> exemplo, `ideiaquevende.com.br`, é o domínio de verdade. As quatro tags do
> topo do `public/index.html` (`canonical`, `og:url`, `og:image`,
> `twitter:image`) não precisam de troca nenhuma. O `robots.txt` e o
> `sitemap.xml` também não: são montados na hora, a partir do domínio que o
> visitante pediu.

---

## Como isso é publicado dali em diante

Todo `git push` na branch `claude/animated-shader-hero-thcafz` refaz o
deploy sozinho. Para acompanhar: **ideia-que-vende** → **Deployments**.
