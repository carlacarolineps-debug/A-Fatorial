# O e-mail que manda o código (15 minutos)

Você caiu na tela certa dos modelos, e viu aquele aviso cinza:

> Set up custom SMTP to edit templates

O Supabase **não deixa editar o modelo** enquanto você não configurar um
e-mail próprio. E o modelo padrão manda só um link, não o código de 6
dígitos que o app pede. Então isso virou obrigatório.

---

## Por que NÃO vamos usar o Brevo

O Brevo funciona, mas ele mandaria os e-mails **em nome do seu Gmail sem
ser o Gmail**. Os provedores hoje desconfiam disso: o e-mail chega marcado
como suspeito e cai no spam, ou é recusado.

O estrago seria exatamente onde dói: a aluna se inscreve, abre o app, pede
o código, e o código não chega. Ela fica parada na porta e escreve para
você achando que o app está quebrado.

## O que vamos usar: o próprio Gmail

O Google deixa o seu Gmail mandar e-mails automáticos, de graça, até **500
por dia**. Como o e-mail sai de verdade dos servidores do Google, ele
**chega na caixa de entrada**: não tem como parecer falso, porque não é.

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
de Notas enquanto faz o próximo passo.

> **Importante:** na hora de colar no Supabase, **tire os espaços**. O que
> aparece como `abcd efgh ijkl mnop` você cola como `abcdefghijklmnop`.

**Se a página de senhas de aplicativo disser que não está disponível:**
é porque a verificação em duas etapas ainda não está ligada. Volte ao A.1.

---

# PASSO B: preencher no Supabase (5 minutos)

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

**Confira os nomes na tela**: o Supabase muda o painel de vez em quando, e
eu não consigo abrir a sua conta daqui para ver. Se algum campo tiver nome
diferente, me manda o print.

---

# PASSO C: agora sim, o modelo do e-mail (3 minutos)

Com o SMTP ligado, aquele aviso cinza some e os campos ficam editáveis.

1. Volte em: **https://supabase.com/dashboard/project/okoylfnniukzwoxevyow/auth/templates**
2. Clique em **Magic link or OTP** (é a tela que você já tinha achado)
3. Se houver um botão **Source** e outro **Preview**, clique em **Source**
4. Em **Subject**, apague e escreva:

```
Seu codigo de acesso: Operacao Blindada
```

5. Em **Body**, apague tudo e cole:

```html
<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:28px;background:#0b0a0c;color:#e8e6e1;border-radius:16px">
  <p style="color:#c8a24a;font-size:11px;letter-spacing:4px;margin:0 0 4px">OPERACAO</p>
  <h1 style="font-size:26px;letter-spacing:3px;margin:0 0 22px;color:#efe9de">BLINDADA</h1>
  <p style="font-size:15px;line-height:1.6;margin:0 0 18px">Digite este codigo no aplicativo:</p>
  <p style="font-size:38px;letter-spacing:10px;font-weight:bold;color:#f0cd7e;margin:0 0 18px">{{ .Token }}</p>
  <p style="font-size:13px;line-height:1.6;color:#9a8f78;margin:0">O codigo vale por 1 hora e so pode ser usado uma vez. Se nao foi voce quem pediu, ignore este e-mail.</p>
</div>
```

6. Clique em **Save**

> O pedacinho `{{ .Token }}` é o que vira o número. Precisa ficar escrito
> exatamente assim, com os espaços dentro das chaves. Sem ele, o e-mail
> chega sem código e ninguém entra.

---

# PASSO D: testar (2 minutos)

1. Abra o app
2. Clique em **É o meu primeiro acesso**
3. Digite `gestaogrupoa@gmail.com`
4. Olhe o seu e-mail

**Deu certo se:** chegou um e-mail preto e dourado com 6 números grandes,
**na caixa de entrada**, em menos de 1 minuto.

**Se caiu no spam:** marque como "não é spam" uma vez. Como o remetente é o
seu próprio Gmail, o Google aprende rápido e os próximos vão para a caixa
de entrada.

**Se não chegou nada:** volte no Supabase, em **Logs**, e procure
**Auth Logs**. O erro aparece lá com todas as letras. Me manda o print.

---

# Perguntas que você vai ter

**Isso é seguro? A senha do meu Gmail fica lá?**
Não. A senha de aplicativo é diferente da sua senha, e serve só para
mandar e-mail. Se você apagar ela em
`myaccount.google.com/apppasswords`, o acesso morre na hora, e a sua conta
do Gmail continua igual.

**500 e-mails por dia dá?**
Dá com folga. Cada aluna gasta 1 e-mail no primeiro acesso e mais 1 se
esquecer a senha. Uma turma de 50 pessoas entrando no mesmo dia gasta 50.

**E quando a turma crescer muito?**
Aí vale comprar um domínio (cerca de R$ 40 por ano) e usar o Resend, que
faz 3.000 por mês sem custo e não tem esse teto diário. Mas isso é problema
de quando acontecer, não de hoje.

**Meu e-mail pessoal vai ficar poluído?**
Não. Ele só manda, não recebe nada. Nada muda na sua caixa de entrada.
