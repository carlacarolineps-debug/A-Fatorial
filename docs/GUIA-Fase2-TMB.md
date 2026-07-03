# OPERAÇÃO BLINDADA — Fase 2 · Guia Completo (TMB)

> Versão **TMB** do guia de configuração da Fase 2 (antes estava em Cakto).
> Você trocou o gateway: agora recebe pela **TMB**, que permite **boleto e PIX parcelados**.
> O restante da arquitetura (Supabase + Netlify) continua igual — só muda o **webhook** e a **configuração do painel de pagamento**.

De app local para produto com login, ranking e acesso pago automático.
**Supabase + Netlify + TMB**, passo a passo.

| Seção | Conteúdo |
|---|---|
| 1 | O que muda e como tudo se conecta |
| 2 | Conta 1: Supabase (banco de dados e webhook) |
| 3 | Conta 2: Hospedagem com Netlify |
| 4 | Conta 3: **TMB** (produto e webhook) |
| 5 | Conectar o app ao Supabase (3 edições no HTML) |
| 6 | Teste de ponta a ponta |
| 7 | Custos, limites e checklist final |

---

## O que mudou em relação ao guia Cakto

| Antes (Cakto) | Agora (TMB) |
|---|---|
| Função `cakto-webhook` | Função **`tmb-webhook`** (`fase2/02-tmb-webhook.ts`) |
| Secret `CAKTO_WEBHOOK_SECRET` | Secret **`TMB_WEBHOOK_SECRET`** |
| Webhook no painel da Cakto | Webhook no painel da **TMB** |
| Só cartão/PIX à vista | **Boleto e PIX parcelados** (motivo da troca) |
| Eventos Cakto (`purchase_approved`…) | Eventos TMB (confirmar nomes no painel) |

Os arquivos `01-supabase-schema.sql` e `03-integracao-cliente.js` que você já tem **continuam válidos** (são agnósticos de gateway). Rode a mais o patch **`fase2/01b-tmb-schema-patch.sql`** para garantir as colunas que o webhook da TMB usa.

---

## Seção 1 — O que muda e como tudo se conecta

Na Fase 1, o progresso da aluna fica salvo só no navegador dela. Trocou de aparelho, perdeu tudo; não dá para barrar quem cancelou; não há ranking real. A Fase 2 resolve isso com um servidor (**Supabase**) que guarda tudo na nuvem, vinculado ao **e-mail da compra**.

**A regra de ouro:** o e-mail da compra na **TMB** TEM QUE SER o mesmo usado para login no app. Isso já está destacado na página de vendas ("Use o mesmo e-mail da compra para acessar o app").

**Como as 3 contas conversam:**

```
   TMB                Supabase              Netlify (App)
Gerencia a venda  →  Recebe o webhook   ←  Aluna faz login
Webhook avisa a       Libera/bloqueia       App consulta acesso
cada evento           o e-mail na tabela    e sincroniza progresso
```

**Os arquivos que você usa:**

| Arquivo | O que faz | Onde colar |
|---|---|---|
| `01-supabase-schema.sql` | Tabelas, travas de segurança e ranking | Supabase › SQL Editor |
| `01b-tmb-schema-patch.sql` | **Novo:** colunas/tabelas que a TMB usa | Supabase › SQL Editor (depois do 01) |
| `02-tmb-webhook.ts` | **Trocado:** escuta a TMB e libera/bloqueia | Supabase › Edge Functions |
| `03-integracao-cliente.js` | Liga o app ao login, acesso e sincronização | Dentro do seu HTML |

---

## Seção 2 — Supabase (banco de dados e webhook)

### Parte A — Criar o projeto
1. Abra **supabase.com** e clique em *Start your project* (entre com Google ou GitHub).
2. *New project* → Nome: `operacao-blindada` · Region: **South America (São Paulo)** · Database Password: crie uma forte e **guarde**.
3. Aguarde ~2 min até o projeto criar.

### Parte B — Criar as tabelas
1. Menu › **SQL Editor** › *+ New query*.
2. Cole todo o `01-supabase-schema.sql`, clique **Run**.
3. Abra uma nova query, cole o **`01b-tmb-schema-patch.sql`** e clique **Run**.
4. Em **Table Editor**, confirme as tabelas: `profiles`, `progress`, `access`, `caixinha` e `automation_log`.

### Parte C — Ligar o login por e-mail
1. **Authentication › Providers** → confirme que **Email** está ligado, com *Confirm email* ligado (o link mágico cuida disso).
2. **Authentication › URL Configuration** → em *Site URL* e *Redirect URLs*, coloque o endereço do app (na fase de testes, use a URL do Netlify `algo.netlify.app`; troque pelo domínio final depois).

### Parte D — Pegar as chaves do app
1. **Project Settings › API**.
2. Copie a **Project URL** (`https://XXXX.supabase.co`).
3. Copie a chave **anon public** (só ela vai no HTML). **Nunca** coloque a `service_role` no HTML.

### Parte E — Subir a função do webhook (TMB)
1. Menu › **Edge Functions** › *Create a new function*. Nome EXATO: **`tmb-webhook`** (minúsculo, com traço).
2. Apague o exemplo, cole o **`fase2/02-tmb-webhook.ts`**, clique **Deploy**.
3. Em *Settings* da função, **desligue Verify JWT** (a TMB não manda JWT; a verificação é pelo segredo).
4. Em *Manage secrets*, crie o secret **`TMB_WEBHOOK_SECRET`** com um valor forte (ex.: `ob_tmb_a8f3_92kx`). **Guarde** — você vai digitar igual na TMB.
   - Os secrets `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já existem por padrão nas Edge Functions.
5. Copie a URL da função: `https://SEU-PROJETO.supabase.co/functions/v1/tmb-webhook`.

---

## Seção 3 — Hospedagem com Netlify

1. Renomeie o app para **`index.html`**.
2. Crie a pasta `operacao-blindada` com `index.html` + `03-integracao-cliente.js`.
3. Em **app.netlify.com**, arraste a pasta para *Drag and drop your site folder here*.
4. Guarde o endereço temporário (`algo.netlify.app`) e confirme que o app carrega.
5. (Opcional) Domínio próprio via **registro.br** (~R$40/ano); ligue em *Domain settings* e atualize o *Site URL* no Supabase. HTTPS é automático.

---

## Seção 4 — TMB (produto e webhook)

Aqui você cria o produto na TMB e configura o webhook que avisa o Supabase a cada evento.

### Parte A — Criar o produto/checkout
1. Entre no painel da **TMB**.
2. Crie o produto **Operação Blindada** com a oferta (mensal e/ou anual) e habilite **PIX, boleto e cartão**, com **parcelamento em até 12x** no boleto/PIX/cartão (é o motivo da troca).
3. Copie a **URL do checkout hospedado** — ela vai em `PAY.checkoutUrl` na página de vendas.
4. (Opcional) configure o **order bump** "Diagnóstico de Blindagem 1:1" (+R$197).

### Parte B — Configurar o webhook
1. No painel da TMB, vá em **Integrações › Webhooks** › *Adicionar*.
2. Nome: `Operação Blindada · acesso`.
3. URL: cole a URL da função `https://SEU-PROJETO.supabase.co/functions/v1/tmb-webhook`.
4. Segredo/assinatura: informe **exatamente** o mesmo valor de `TMB_WEBHOOK_SECRET`.
   - A TMB pode enviar o segredo como **header** (`x-webhook-secret`) ou como **assinatura HMAC** (`x-tmb-signature`). O `02-tmb-webhook.ts` aceita as duas formas.
5. **Eventos:** marque os que **liberam** e os que **bloqueiam** o acesso. Nomes técnicos variam por gateway — confirme os exatos da TMB e mapeie no topo do `02-tmb-webhook.ts` (objeto `EVENT_ACTION`):

| Ação | Evento (exemplos — confirmar na TMB) |
|---|---|
| **LIBERA** | pagamento aprovado / pedido pago, assinatura criada, assinatura renovada |
| **PENDENTE** (não libera) | boleto gerado, PIX aguardando pagamento |
| **BLOQUEIA** | assinatura cancelada/expirada, reembolso, chargeback |

> **Boleto/PIX parcelado:** o acesso é liberado **só quando o pagamento é confirmado** (evento LIBERA). Enquanto o boleto está gerado e não pago, o webhook grava `status = pending` e **não** libera — igual ao que a página de vendas promete no FAQ.

6. Salve o webhook.

---

## Seção 5 — Conectar o app ao Supabase (3 edições no HTML)

Idêntico ao guia anterior — **não muda com a TMB** (o app não fala com o gateway, só com o Supabase):

1. **Edição 1:** no topo do `03-integracao-cliente.js`, preencha:
   ```js
   var SUPABASE_URL = 'https://XXXX.supabase.co';
   var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1Ni...';
   ```
2. **Edição 2:** no `<head>` do `index.html`, **antes** do script principal do app, carregue a lib do Supabase e o arquivo 03 (a ordem importa).
3. **Edição 3:** no final do script do app, troque `boot();` por `OB.start().then(boot);` e, dentro de `save()`, adicione `OB.push(S);` logo após salvar localmente.
4. Faça o upload da pasta atualizada no Netlify.

---

## Seção 6 — Teste de ponta a ponta

**Teste 1 — compra libera acesso**
1. Faça uma compra de teste na TMB (modo teste ou um PIX de valor simbólico) com um e-mail seu.
2. Supabase › Table Editor › `access`: deve surgir a linha com seu e-mail e `status = active`.
   - Se pagou por **boleto**, o status fica `pending` até a compensação; depois vira `active`.
3. Faça login no app com o **mesmo e-mail**, clique no link mágico, confirme que o app abre e o progresso sincroniza em outro aparelho.

**Teste 2 — cancelamento bloqueia**
1. Cancele/reembolse a compra de teste na TMB.
2. `access` deve ficar `status = blocked`; o app deve barrar o login com aviso de acesso inativo.

Se o webhook não chegou, veja **Edge Functions › tmb-webhook › Logs** e a tabela `automation_log` (todo evento recebido fica registrado ali).

---

## Seção 7 — Custos, limites e checklist

**Custos**
| Item | No início | Quando crescer |
|---|---|---|
| Supabase | R$0 (free) | ~US$25/mês (Pro) ao passar dos limites |
| Netlify | R$0 | Continua grátis na prática |
| Domínio .com.br | ~R$40/ano | Igual |
| **TMB** | Conforme a tabela da TMB | Taxas por venda + boleto/PIX parcelado |

**Pontos de atenção**
1. **E-mail tem que bater:** comprou com um e-mail e tenta logar com outro → o app barra. Já está avisado na página de vendas.
2. **Última escrita vence** na sincronização (uso normal de 1 pessoa/1 aparelho por vez é tranquilo).
3. **LGPD:** a partir da Fase 2 você guarda dados pessoais. Consulta jurídica recomendada antes das funções de localização (Fase 3).

**Checklist final**

- SUPABASE: projeto SP · rodar `01` + `01b` · Email provider · Site/Redirect URLs · copiar Project URL + anon key · Edge Function `tmb-webhook` (arquivo 02) · **desligar Verify JWT** · criar secret `TMB_WEBHOOK_SECRET` · copiar URL da função.
- NETLIFY: renomear para `index.html` · pasta com `index.html` + `03` · arrastar no Netlify · (opcional) domínio · atualizar Site URL.
- APP: preencher `SUPABASE_URL`/`SUPABASE_ANON_KEY` no 03 · 2 scripts no `<head>` · `OB.start().then(boot)` · `OB.push(S)` no `save()` · upload no Netlify.
- **TMB:** criar produto (PIX/boleto/cartão parcelados) · copiar `checkoutUrl` → `PAY.checkoutUrl` da landing · webhook → URL da função · mesmo `TMB_WEBHOOK_SECRET` · mapear eventos em `EVENT_ACTION` · salvar.
- TESTES: compra → `active`; boleto → `pending` → `active`; cancelamento → `blocked`.

Tudo marcado e testado? É só abrir as vendas.
