# Supabase, clique a clique (o painel está em inglês)

O nome em inglês de cada botão está em **negrito**. O menu fica sempre na
coluna da esquerda.

Seu projeto: `okoylfnniukzwoxevyow`

---

## Passo 1: criar as tabelas (5 minutos)

**Onde:** menu da esquerda, **SQL Editor**.
Link direto: <https://supabase.com/dashboard/project/okoylfnniukzwoxevyow/sql/new>

1. Abra o arquivo do schema no GitHub e clique no botão de copiar (o ícone de
   duas folhinhas, no canto superior direito do código):
   <https://github.com/carlacarolineps-debug/A-Fatorial/blob/claude/strategy-cards-mentoring-vygy1x/supabase/01_schema.sql>
2. Volte no Supabase, clique dentro da área preta do **SQL Editor** e cole
   (Ctrl+V, ou Cmd+V no Mac).
3. Clique em **Run** (botão verde no canto de baixo, à direita). Ou aperte
   Ctrl+Enter.
4. Espere uns 10 segundos. Tem que aparecer **Success. No rows returned**,
   em verde, embaixo.

**Como conferir que deu certo:** menu da esquerda, **Table Editor**. Devem
aparecer 18 tabelas na lista: `profiles`, `mentoras`, `access`, `bloqueios`,
`progress`, `audios`, `videos`, `eventos`, `caixinha`, `provas`, `membros`,
`presencas`, `galeria`, `termos`, `denuncias`, `parcelas`, `webhook_log` e
`push_tokens`.

Se der erro vermelho, copie a mensagem inteira e me mande. Não rode de novo
sem olhar: o erro diz exatamente qual linha reclamou.

---

## Passo 2: pegar a chave e colar no app (3 minutos)

**Onde:** menu da esquerda, lá embaixo, **Project Settings** (o ícone de
engrenagem). Dentro dele, **API Keys**.
Link direto: <https://supabase.com/dashboard/project/okoylfnniukzwoxevyow/settings/api-keys>

O que procurar na tela:

- Se aparecer uma chave chamada **anon** ou **anon public**, é essa. Ela é
  gigante e começa com `eyJ`.
- Se a tela tiver duas abas e a chave não estiver na primeira, clique na aba
  **Legacy API keys** e pegue a **anon** de lá.
- Se aparecer **Publishable key** (começa com `sb_publishable_`), ela também
  serve.

Clique no ícone de copiar ao lado da chave.

**Agora no arquivo do app:**

1. Abra `Operação Blindada 0508.03.html` num editor de texto (Bloco de Notas
   serve, mas o Notepad++ ou o VS Code é melhor).
2. Aperte Ctrl+F e procure por: `COLE_AQUI_A_ANON_KEY`
3. Selecione só o `COLE_AQUI_A_ANON_KEY` (sem mexer nas aspas em volta) e
   cole a chave por cima.
4. Salve.

Fica assim:

```js
var SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3Mi...";
```

Essa chave é feita para ficar no aplicativo, isso é normal e seguro: quem
manda no acesso é a regra dentro do banco, não ela. A outra chave, a
**service_role**, nunca pode entrar no arquivo do app.

---

## Passo 3: o e-mail com o código de 6 dígitos (3 minutos)

Por padrão o Supabase manda só um link. O app pede o código, então o e-mail
precisa mostrar o código.

**Onde:** menu da esquerda, **Authentication**. Dentro dele, **Emails**.
Link direto: <https://supabase.com/dashboard/project/okoylfnniukzwoxevyow/auth/templates>

1. Na lista de modelos, escolha **Magic Link**.
2. No campo grande do meio (o corpo do e-mail), apague o que está lá e cole:

```html
<h2>Seu codigo de acesso</h2>
<p>Digite este codigo no aplicativo Operacao Blindada:</p>
<p style="font-size:34px;letter-spacing:8px;font-weight:bold">{{ .Token }}</p>
<p>O codigo vale por 1 hora. Se nao foi voce quem pediu, ignore este e-mail.</p>
```

3. Clique em **Save** (ou **Save changes**).

**Importante:** `{{ .Token }}` tem que ficar escrito exatamente assim, com os
dois espaços dentro das chaves. É isso que vira o número.

**Um aviso sobre o e-mail de teste:** enquanto você usa o e-mail do próprio
Supabase, o limite é baixo (poucos por hora). Serve para testar, não serve
para abrir a turma inteira. Antes de liberar para todo mundo, configure um
e-mail próprio em **Project Settings**, **Authentication**, **SMTP Settings**.
Resend e Brevo têm plano sem custo e resolvem.

---

## Passo 4: o seu acesso (já vem pronto)

Não precisa fazer nada. O schema do passo 1 já faz as duas coisas:

- o seu acesso entra **ativo**, mesmo antes de você entrar pela primeira vez;
- quando a sua conta nascer (primeiro login), um gatilho marca você como
  mentora, sozinho.

É só entrar no app com `gestaogrupoa@gmail.com` e o modo mentora está lá:
publicar áudio, criar encontro, responder a caixinha e o painel de denúncias
em **Mais**.

**Para liberar uma aluna na mão** (antes de o webhook existir, ou para
resolver um caso), **SQL Editor**:

```sql
insert into public.access (email, status)
values ('email-da-aluna@exemplo.com', 'active')
on conflict (email) do update set status = 'active';
```

**Para acrescentar outra mentora**, inclua o e-mail na lista e rode:

```sql
insert into public.mentoras (email) values ('outra@exemplo.com')
on conflict (email) do nothing;

insert into public.access (email, status)
values ('outra@exemplo.com', 'active')
on conflict (email) do update set status = 'active';
```

Quem manda mora na tabela `mentoras`, não numa coluna que o aplicativo
consiga escrever. Foi assim de propósito: coluna que o cliente escreve é
coluna que um dia alguém escreve.

---

## Passo 5: o webhook da TMB (10 minutos)

Isso é o que liga a inscrição paga ao acesso no app, sozinho. Dá para fazer
tudo pelo navegador, sem instalar nada.

**Onde:** menu da esquerda, **Edge Functions**.
Link direto: <https://supabase.com/dashboard/project/okoylfnniukzwoxevyow/functions>

### 5.1 Criar a função

1. Clique em **Deploy a new function** e escolha a opção de escrever no
   navegador (**Via Editor**, ou **Create via editor**).
2. Em **Function name**, escreva exatamente: `tmb-webhook`
3. Apague o código de exemplo e cole o conteúdo deste arquivo:
   <https://github.com/carlacarolineps-debug/A-Fatorial/blob/claude/strategy-cards-mentoring-vygy1x/supabase/functions/tmb-webhook/index.ts>
4. Se aparecer uma opção **Verify JWT with legacy secret** ou
   **Enforce JWT verification**, **desligue**. A TMB não manda token do
   Supabase, ela manda o segredo no cabeçalho.
5. Clique em **Deploy**.

### 5.2 Guardar o segredo

1. Ainda em **Edge Functions**, procure a aba **Secrets** (em alguns painéis
   ela fica em **Project Settings**, **Edge Functions**, **Secrets**).
2. Clique em **Add new secret**.
3. Em **Name**: `TMB_WEBHOOK_SECRET`
4. Em **Value**: invente uma senha longa, sem espaço. Por exemplo:
   `opblindada-2026-x7k29fmq3z`. **Guarde essa senha**, você vai colar na TMB.
5. Clique em **Save**.

### 5.3 Avisar a TMB

Na TMB, nos dois webhooks (**Vendas** e **Financeiro**), cadastre:

- **URL:** `https://okoylfnniukzwoxevyow.supabase.co/functions/v1/tmb-webhook`
- **Cabeçalho** (header): nome `x-webhook-secret`, valor a senha que você
  inventou no 5.2.

### 5.4 Conferir se está funcionando

Depois do primeiro pedido de teste, volte no Supabase, **Table Editor**,
tabela `webhook_log`. O que a TMB mandou fica gravado ali inteiro, mesmo
quando algo dá errado. Se a coluna `processado` estiver marcada, funcionou.
Se tiver algo escrito em `erro`, me mande o texto.

---

## A ordem certa, resumida

1. **SQL Editor** → colar o schema → **Run**
2. **Project Settings** → **API Keys** → copiar a **anon** → colar no arquivo
   do app no lugar de `COLE_AQUI_A_ANON_KEY`
3. **Authentication** → **Emails** → **Magic Link** → colar o modelo com
   `{{ .Token }}` → **Save**
4. Entrar no app com o seu e-mail (o acesso e o modo mentora já vêm prontos)
5. **Edge Functions** → criar `tmb-webhook` → colar o código → **Deploy** →
   **Secrets** → cadastrar na TMB

Os passos 1 a 4 já deixam o app funcionando para você e para quem você
liberar na mão. O passo 5 é o que faz a liberação acontecer sozinha quando
alguém se inscreve.

## Se der erro no passo 1

O arquivo do schema foi rodado num PostgreSQL de verdade, três vezes
seguidas, antes de chegar até você: ele aplica limpo e pode ser rodado de
novo quantas vezes precisar. Se mesmo assim aparecer vermelho, copie a
mensagem inteira: ela diz a linha exata que reclamou.
