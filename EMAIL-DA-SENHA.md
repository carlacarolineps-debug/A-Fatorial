# O e-mail que manda a senha (20 minutos)

O app não usa mais código de 6 dígitos. Agora funciona assim, e é o mesmo
jeito que a Aliança Divergente e a maioria dos apps de curso usam:

1. a inscrição é confirmada (pela TMB, ou você libera na sua mesa);
2. o servidor **cria a conta**, sorteia uma **senha temporária** e manda
   por e-mail;
3. a aluna entra com o e-mail da inscrição e aquela senha;
4. o app **exige na hora** que ela crie a senha dela. A temporária morre
   nesse momento.

Quem esquece a senha usa **Esqueci a minha senha** na tela de entrada, e
recebe um link para escolher outra.

São dois e-mails diferentes, e cada um sai de um lugar:

| E-mail | Quem manda | O que você configura |
|---|---|---|
| A senha temporária | A função `liberar-aluna` (parte C) | Gmail + senha de aplicativo |
| O link de esqueci a senha | O próprio Supabase | O mesmo Gmail, no SMTP |

Por isso os dois passos abaixo: o **A** prepara o Gmail (serve para os
dois), o **B** liga o Supabase e o **C** publica a função.

---

## Por que o seu próprio Gmail

O Google deixa o seu Gmail mandar e-mails automáticos, de graça, até
**500 por dia**. Como o e-mail sai de verdade dos servidores do Google,
ele **chega na caixa de entrada**: não tem como parecer falso, porque
não é.

Serviços de terceiros mandariam **em nome do seu Gmail sem ser o
Gmail**. Os provedores desconfiam disso: o e-mail chega marcado como
suspeito e cai no spam. O estrago seria exatamente onde dói: a aluna
paga, não recebe a senha, e escreve para você achando que o app quebrou.

Para uma turma de mentoria, 500 por dia sobra muito.

---

# PASSO A: preparar o Google (8 minutos)

O Google só libera isso para contas com a verificação em duas etapas
ligada. Se você já tem, pule para o A.2.

## A.1 Ligar a verificação em duas etapas

1. Abra: **https://myaccount.google.com/security**
2. Entre com `gestaogrupoa@gmail.com`
3. Procure **Verificação em duas etapas** e clique
4. Clique em **Começar** e siga: ele pede o seu número de celular e manda
   um código por mensagem
5. No fim tem que aparecer **Ativada**

> Isso deixa a sua conta mais segura de qualquer forma. Mesmo que alguém
> descubra a sua senha, não entra sem o seu celular.

## A.2 Criar a senha de aplicativo

Esta é uma senha separada, só para o app usar. Ela não é a sua senha do
Gmail, e você pode apagar quando quiser sem mexer na sua conta.

1. Abra: **https://myaccount.google.com/apppasswords**
2. Se ele pedir a senha do Gmail de novo, digite
3. No campo do nome, escreva: `Operacao Blindada`
4. Clique em **Criar**
5. Vai aparecer uma caixa amarela com **16 letras**, tipo `abcd efgh ijkl mnop`

**COPIE ESSAS 16 LETRAS AGORA.** O Google só mostra uma vez. Cole no Bloco
de Notas: você vai usar duas vezes, no passo B e no passo C.

> **Importante:** na hora de colar, **tire os espaços**. O que aparece
> como `abcd efgh ijkl mnop` você cola como `abcdefghijklmnop`.

**Se a página de senhas de aplicativo disser que não está disponível:**
é porque a verificação em duas etapas ainda não está ligada. Volte ao A.1.

---

# PASSO B: o e-mail do "esqueci a senha" (5 minutos)

1. Abra: **https://supabase.com/dashboard/project/okoylfnniukzwoxevyow/settings/auth**
2. Role a página até **SMTP Settings**
3. Ligue a chavinha **Enable Custom SMTP**
4. Preencha exatamente assim:

| Campo | O que colocar |
|---|---|
| **Sender email** | `gestaogrupoa@gmail.com` |
| **Sender name** | `Operação Blindada` |
| **Host** | `smtp.gmail.com` |
| **Port number** | `587` |
| **Username** | `gestaogrupoa@gmail.com` |
| **Password** | as 16 letras do passo A.2, **sem espaços** |

5. Se aparecer um campo **Minimum interval between emails**, deixe em `60`
6. Clique em **Save**

> **O aviso "Check your SMTP provider" vai aparecer.** Ele diz que o
> provedor é de e-mail pessoal, não transacional. É aviso, não erro: salve
> e siga. O Supabase mostra isso para todo Gmail, Outlook e Yahoo.
>
> O que ele está dizendo de verdade são três coisas, e nenhuma impede hoje:
> o teto de 500 por dia; o Google pode segurar um envio em massa; e o
> remetente é fixo, então o **Sender email** tem que ser exatamente igual ao
> **Username**, senão o Google reescreve ou recusa.

## B.2 Deixar o texto do e-mail em português

Com o SMTP ligado, os modelos ficam editáveis.

1. Abra: **https://supabase.com/dashboard/project/okoylfnniukzwoxevyow/auth/templates**
2. Clique em **Reset Password** (é este, não o Magic Link)
3. Em **Subject**, apague e escreva:

```
Escolher uma senha nova: Operacao Blindada
```

4. Em **Body**, apague tudo e cole:

```html
<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:28px;background:#0b0a0c;color:#e8e6e1;border-radius:16px">
  <p style="color:#c8a24a;font-size:11px;letter-spacing:4px;margin:0 0 4px">OPERACAO</p>
  <h1 style="font-size:26px;letter-spacing:3px;margin:0 0 22px;color:#efe9de">BLINDADA</h1>
  <p style="font-size:15px;line-height:1.6;margin:0 0 20px">Voce pediu para trocar a sua senha. Toque no botao abaixo e escolha a nova.</p>
  <p style="margin:0 0 22px"><a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#d9a53a;color:#20180a;text-decoration:none;font-weight:bold;font-size:15px;padding:13px 30px;border-radius:999px">Escolher a senha nova</a></p>
  <p style="font-size:13px;line-height:1.6;color:#9a8f78;margin:0">Abra este e-mail no mesmo celular em que voce usa o app. O link vale por 1 hora. Se nao foi voce quem pediu, ignore.</p>
</div>
```

5. Clique em **Save**

> O pedacinho `{{ .ConfirmationURL }}` é o que vira o link. Precisa ficar
> escrito exatamente assim. Sem ele, o e-mail chega sem link e ninguém
> troca a senha.

## B.3 Dizer para onde o link volta

1. Ainda em **Authentication**, procure **URL Configuration**
2. Em **Site URL**, coloque o endereço do app:
   `https://carlacarolineps-debug.github.io/A-Fatorial/`
3. Em **Redirect URLs**, acrescente o mesmo endereço
4. **Save**

Sem isso o link do e-mail leva para um lugar que não existe.

---

# PASSO C: a função que manda a senha temporária (7 minutos)

Esta é a parte que faz a aluna receber a senha assim que a inscrição é
confirmada. Sem ela, o acesso é liberado mas ninguém avisa a pessoa.

## C.1 Guardar os três segredos

1. Abra: **https://supabase.com/dashboard/project/okoylfnniukzwoxevyow/settings/functions**
2. Procure **Edge Function Secrets** (ou **Secrets**)
3. Clique em **Add new secret** e crie os três, um de cada vez:

| Name | Value |
|---|---|
| `GMAIL_USER` | `gestaogrupoa@gmail.com` |
| `GMAIL_APP_PASSWORD` | as 16 letras do passo A.2, **sem espaços** |
| `APP_URL` | `https://carlacarolineps-debug.github.io/A-Fatorial/` |

**Estes segredos ficam só no servidor.** Eles nunca entram no aplicativo,
e ninguém que baixe o app consegue lê-los.

## C.2 Publicar as duas funções

Se você tem o **Supabase CLI** no computador, é um comando:

```
supabase functions deploy liberar-aluna
supabase functions deploy tmb-webhook
```

Se não tem, dá para fazer pelo navegador:

1. Abra: **https://supabase.com/dashboard/project/okoylfnniukzwoxevyow/functions**
2. **Deploy a new function**, nome exatamente `liberar-aluna`
3. Apague o exemplo, e cole o conteúdo de
   `supabase/functions/liberar-aluna/index.ts`
4. **Deploy**
5. Repita com o nome `tmb-webhook` e o arquivo
   `supabase/functions/tmb-webhook/index.ts`

> Se você ainda não vai usar a liberação automática pela TMB, publique
> só a `liberar-aluna`: é ela que o botão da sua mesa usa.

---

# PASSO D: testar (3 minutos)

## D.1 A senha temporária

1. Abra o app e entre com a sua conta
2. Vá em **Mais**, **A sua mesa**, aba **Alunas**
3. No campo de e-mail, coloque **um e-mail seu que não seja o da
   mentoria** (pode ser um Gmail pessoal)
4. **Liberar e mandar a senha**

**Deu certo se:** a mesa disser *"A senha temporária foi para o e-mail
dela"*, e chegar um e-mail preto e dourado com uma senha de 10
caracteres.

**Se disser "acesso liberado, mas a senha não foi por e-mail":** a função
não está publicada, ou algum dos três segredos está errado. Volte ao
passo C.

5. Abra o app numa janela anônima, entre com aquele e-mail e a senha do
   e-mail. **Tem que aparecer a tela pedindo para criar a senha.**

## D.2 O esqueci a senha

1. Na tela de entrada, **Esqueci a minha senha**
2. Digite aquele mesmo e-mail
3. Abra o e-mail e toque no link

**Deu certo se:** o app abrir direto na tela de escolher a senha nova.

**Se não chegou nada:** no Supabase, em **Logs**, procure **Auth Logs**.
O erro aparece lá com todas as letras. Me manda o print.

---

# Perguntas que você vai ter

**Isso é seguro? A senha do meu Gmail fica lá?**
Não. A senha de aplicativo é diferente da sua senha, e serve só para
mandar e-mail. Se você apagar ela em
`myaccount.google.com/apppasswords`, o acesso morre na hora, e a sua
conta do Gmail continua igual.

**A senha temporária pode ser adivinhada?**
Ela tem 10 caracteres sorteados pelo servidor (3 letras, 4 números, 3
letras), e vale para uma entrada só: o app cobra a troca antes de abrir.

**E se a aluna pagar em parcelas? A senha muda todo mês?**
Não. A senha temporária sai **uma vez**, na primeira liberação. As
parcelas seguintes só reativam o acesso, e a senha que ela escolheu
continua valendo.

**500 e-mails por dia dá?**
Dá com folga. Cada aluna gasta 1 e-mail no primeiro acesso e mais 1 se
esquecer a senha. Uma turma de 50 pessoas entrando no mesmo dia gasta 50.

**E quando a turma crescer muito?**
Aí vale comprar um domínio (cerca de R$ 40 por ano) e usar o Resend, que
faz 3.000 por mês sem custo e não tem esse teto diário. Mas isso é
problema de quando acontecer, não de hoje.

**Meu e-mail pessoal vai ficar poluído?**
Não. Ele só manda, não recebe nada. Nada muda na sua caixa de entrada.
