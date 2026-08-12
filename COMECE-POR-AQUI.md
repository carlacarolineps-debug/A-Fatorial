# O que falta você fazer, passo a passo

Escrito para ser seguido sem entender nada de programação. Cada passo diz
exatamente onde clicar e o que tem que aparecer na tela quando dá certo.

**Sobraram 6 passos.** Uns 36 minutos no total.

Os passos 1 a 4 fazem o app funcionar. O **passo 5** é o que faz a venda
na TMB virar acesso sozinha, sem você liberar ninguém na mão.

---

## O que eu já fiz por você (não precisa mexer)

Eu entrei no seu Supabase e deixei pronto:

- as **18 tabelas** do banco, com todas as proteções ligadas
- a coluna da **foto de perfil** e o lugar onde as fotos ficam guardadas
- as **16 funções** de segurança, e fechei o acesso delas: quem não está
  logado não consegue chamar nenhuma
- as **duas funções do servidor** publicadas: a `liberar-aluna` (que manda
  a senha temporária) e a `tmb-webhook` (que recebe a inscrição da TMB)
- o **seu acesso ativo** e a sua conta marcada como mentora

**Só falta o que depende de você**, porque envolve a sua conta do Google e
os seus segredos, que eu não posso nem devo ver.

---

# PASSO 0: ver o app agora (1 minuto)

1. Baixe o arquivo `Operação Blindada 0608.05.html` que eu te mandei.
2. **Dê dois cliques nele.** Abre no navegador.
3. Passeie à vontade.

O app inteiro funciona aqui, com as 43 trilhas, as 170 cartas, a apostila,
o plano, o diário, guardando no próprio computador.

**A sua mesa de mentoria não aparece aqui, e isso é de propósito.** Ela só
existe depois que você entra com a conta `gestaogrupoa@gmail.com`, e quem
decide isso é a regra dentro do banco, não o aplicativo. Se bastasse abrir
o arquivo para ver a área de admin, qualquer pessoa que baixasse o app
veria também.

---

# PASSO 1: a senha de aplicativo do Google (8 minutos)

Isso é o que faz os e-mails saírem. São dois e-mails diferentes (a senha
temporária e o link de esqueci a senha), e os dois usam esta mesma senha.

### 1.1 Ligar a verificação em duas etapas

Se você já tem, pule para o 1.2.

1. Abra: **https://myaccount.google.com/security**
2. Entre com `gestaogrupoa@gmail.com`
3. Procure **Verificação em duas etapas** e clique
4. **Começar**, e siga: ele pede o seu celular e manda um código
5. No fim tem que aparecer **Ativada**

### 1.2 Criar a senha de aplicativo

É uma senha separada, só para o app usar. Ela não é a sua senha do Gmail,
e você pode apagar quando quiser sem mexer na sua conta.

1. Abra: **https://myaccount.google.com/apppasswords**
2. Se pedir a senha do Gmail de novo, digite
3. No campo do nome, escreva: `Operacao Blindada`
4. **Criar**
5. Aparece uma caixa amarela com **16 letras**, tipo `abcd efgh ijkl mnop`

**COPIE ESSAS 16 LETRAS AGORA.** O Google só mostra uma vez. Cole no Bloco
de Notas: você vai usar nos passos 2 e 3.

> **Na hora de colar, tire os espaços.** O que aparece como
> `abcd efgh ijkl mnop` você cola como `abcdefghijklmnop`.

**Se a página disser que não está disponível:** a verificação em duas
etapas ainda não está ligada. Volte ao 1.1.

---

# PASSO 2: o e-mail do "esqueci a senha" (8 minutos)

### 2.1 O SMTP

1. Abra: **https://supabase.com/dashboard/project/okoylfnniukzwoxevyow/settings/auth**
2. Role até **SMTP Settings**
3. Ligue a chavinha **Enable Custom SMTP**
4. Preencha:

| Campo | O que colocar |
|---|---|
| **Sender email** | `gestaogrupoa@gmail.com` |
| **Sender name** | `Operação Blindada` |
| **Host** | `smtp.gmail.com` |
| **Port number** | `587` |
| **Username** | `gestaogrupoa@gmail.com` |
| **Password** | as 16 letras do passo 1.2, **sem espaços** |

5. Se houver **Minimum interval between emails**, deixe `60`
6. **Save**

> **Vai aparecer um aviso: "Check your SMTP provider".** Ele diz que o
> provedor que você colocou é de e-mail pessoal, não transacional. É um
> **aviso, não um erro**: pode salvar e seguir. O Supabase mostra isso para
> qualquer Gmail, Outlook ou Yahoo.
>
> Escolhi o Gmail de propósito. Sem domínio próprio, um serviço de terceiro
> mandando em nome de um `@gmail.com` não consegue provar que tem
> autorização, e os provedores tratam como suspeito: cai no spam. Saindo do
> próprio Gmail, o e-mail chega na caixa de entrada, porque não tem como
> parecer falso.
>
> **Confira uma coisa:** o **Sender email** precisa ser exatamente igual ao
> **Username** (`gestaogrupoa@gmail.com`). O Google obriga o e-mail a sair
> como a conta autenticada, e se estiver diferente ele reescreve ou recusa.

### 2.2 O texto do e-mail

Com o SMTP ligado, os modelos ficam editáveis (antes aparecia aquele aviso
cinza *"Set up custom SMTP to edit templates"*).

1. Abra: **https://supabase.com/dashboard/project/okoylfnniukzwoxevyow/auth/templates**
2. Clique em **Reset Password**. É este, **não** o Magic Link
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

5. **Save**

> O pedaço `{{ .ConfirmationURL }}` é o que vira o link. Precisa ficar
> escrito exatamente assim. Sem ele, o e-mail chega sem link.

### 2.3 Para onde o link volta

1. Ainda em **Authentication**, procure **URL Configuration**
2. Em **Site URL**, coloque:
   `https://carlacarolineps-debug.github.io/A-Fatorial/`
3. Em **Redirect URLs**, acrescente o mesmo endereço
4. **Save**

Sem isso o link do e-mail leva para um lugar que não existe.

---

# PASSO 3: os três segredos (4 minutos)

Isso é o que faz a senha temporária sair. A função já está publicada, ela
só não sabe ainda de qual e-mail mandar.

1. Abra: **https://supabase.com/dashboard/project/okoylfnniukzwoxevyow/settings/functions**
2. Procure **Edge Function Secrets**

A página tem duas listas. **Ignore a de baixo, "Default secrets"**: aqueles
são do próprio Supabase, já existem e você não mexe neles. A que importa é
**Custom secrets**, que começa vazia dizendo *"No custom secrets created"*.

### O jeito rápido: os três de uma vez

No formulário do topo tem um link escrito *"Insert or update multiple
secrets at once by pasting key-value pairs"*. Clique nele e cole:

```
GMAIL_USER=gestaogrupoa@gmail.com
GMAIL_APP_PASSWORD=COLE_AQUI_AS_16_LETRAS
APP_URL=https://carlacarolineps-debug.github.io/A-Fatorial/
```

Troque `COLE_AQUI_AS_16_LETRAS` pelas 16 letras do passo 1.2, **sem espaço
nenhum**. Depois **Save**.

### Ou um por um

O formulário do topo tem **Name** e **Value**. Preencha o primeiro, clique
em **Add another**, preencha o segundo, **Add another**, o terceiro, e
**Save**.

| Name | Value |
|---|---|
| `GMAIL_USER` | `gestaogrupoa@gmail.com` |
| `GMAIL_APP_PASSWORD` | as 16 letras do passo 1.2, **sem espaços** |
| `APP_URL` | `https://carlacarolineps-debug.github.io/A-Fatorial/` |

### Deu certo quando

A lista **Custom secrets** deixa de dizer "No custom secrets created" e
passa a mostrar os três nomes, cada um com um **Digest SHA256** do lado.
Esse digest é uma marca embaralhada: o Supabase nunca mostra o valor de
volta, nem para você. Para trocar um deles depois, é só gravar por cima com
o mesmo nome.

**Estes segredos ficam só no servidor.** Eles nunca entram no aplicativo, e
ninguém que baixe o app consegue lê-los.

---

# PASSO 4: ligar o app no seu celular (3 minutos)

O repositório já tem uma automação que publica o app a cada mudança. Ela
tentou **ligar o GitHub Pages sozinha** e o GitHub recusou:

```
Create Pages site failed. Error: Resource not accessible by integration
```

A automação tem permissão para publicar, mas **não para criar o site pela
primeira vez**. Isso só a dona da conta pode fazer, e é este o passo.

### 4.1

Abra: **https://github.com/carlacarolineps-debug/A-Fatorial/settings/pages**

### 4.2

Em **Source**, escolha **GitHub Actions**.

> **Não escolha "Deploy from a branch".** As duas funcionariam, mas a
> automação já existe e é feita para a primeira: escolhendo GitHub Actions,
> ela passa a publicar sozinha a cada mudança e você nunca mais mexe aqui.
> Com a outra opção, a automação continuaria falhando e mandando e-mail de
> erro a cada envio.

Não tem botão de Save nessa opção: ela salva ao escolher.

### 4.3 A segunda trava, que só aparece agora

Ao ligar o Pages, o GitHub cria um ambiente chamado `github-pages` com uma
regra de fábrica: **só o branch principal pode publicar**. Como o app vive
num branch de trabalho, a publicação é recusada antes de começar, em dois
segundos, sem log nenhum.

1. Abra: **https://github.com/carlacarolineps-debug/A-Fatorial/settings/environments**
2. Clique em **github-pages**
3. Role até **Deployment branches and tags**
4. Onde está **Selected branches and tags**, escolha **No restriction**

> Se preferir manter a trava, clique em **Add deployment branch or tag
> rule** e digite `claude/*`. Dá o mesmo resultado e continua barrando
> branch estranho.

### 4.4

Vá em **Actions**, no menu de cima do repositório, clique em **Publicar o
app** na lista da esquerda, e depois em **Run workflow**.

Isso dispara a publicação. Ela leva cerca de 1 minuto e fica verde quando
termina.

### 4.5

Volte em **Settings**, **Pages**. Aparece uma faixa com o endereço:

**https://carlacarolineps-debug.github.io/A-Fatorial/**

### 4.6

Abra esse endereço **no seu celular**.

- **Android**: três pontinhos em cima, **Instalar aplicativo**
- **iPhone**: botão de compartilhar (quadrado com seta para cima), role
  para baixo, **Adicionar à Tela de Início**

Pronto: o ícone do escudo dourado aparece junto com os outros aplicativos,
e abre em tela cheia.

> **Se o endereço der 404:** espere mais 2 minutos e recarregue. O GitHub
> demora um pouco para o endereço começar a responder na primeira vez.

---

# PASSO 5: a venda virar acesso sozinha (6 minutos)

Este é o passo que você pediu: a pessoa compra na TMB e **recebe o e-mail
com o acesso dela sem você fazer nada**. O caminho inteiro já está escrito
e publicado; falta ligar as duas pontas.

## O que vai acontecer depois deste passo

1. a pessoa compra na TMB;
2. a TMB avisa o app, na hora;
3. o app cria a conta **com o mesmo e-mail da compra**;
4. o app sorteia uma senha temporária;
5. a pessoa recebe um e-mail dizendo **qual é o e-mail dela** e **qual é a
   senha temporária**;
6. ela entra, e o app exige que ela troque a senha antes de abrir.

Você não toca em nada. O botão "Liberar" da mesa continua existindo para
a exceção: a convidada, a cortesia, a inscrição que não veio.

## 5.1 Invente o segredo

É uma senha que só a TMB e o app conhecem, e serve para ninguém mais
conseguir liberar acesso fingindo ser a TMB.

**Não copie nenhuma linha que esteja escrita aqui.** Este arquivo mora no
GitHub, que é público: qualquer linha impressa nele já nasce queimada, e
quem a lesse conseguiria liberar acesso de graça. (Este aviso existe
porque a primeira versão deste guia trazia um exemplo com cara de senha
de verdade, e exemplo com cara de senha vira senha.)

Gere a sua assim, sem inventar de cabeça:

- **no celular**: abra o app de notas e escreva 30 letras e números
  batendo o dedo sem olhar, ou use qualquer gerador de senha;
- **no computador**: abra https://www.random.org/strings/ e peça 3
  sequências de 12 caracteres, depois junte as três.

Escreva a sua num papel. Você vai colar essa mesma linha em dois lugares,
e tem que ser **idêntica** nos dois, sem espaço sobrando no fim.

**Nunca mande esse segredo por mensagem, e nunca escreva num arquivo do
projeto.** Ele vive só nos dois campos abaixo. Se um dia ele vazar, troque
nos dois lugares e pronto: nada mais quebra.

## 5.2 Cole no Supabase

1. Abra https://supabase.com/dashboard/project/okoylfnniukzwoxevyow/settings/functions
2. Em **Edge Function Secrets**, clique em **Add new secret**
3. Name: `TMB_WEBHOOK_SECRET`
4. Value: a linha que você inventou
5. **Save**

## 5.3 Cole na TMB

Na TMB, procure **Integrações**, **Webhooks** ou **Notificações**
(o nome muda conforme a versão). Você vai cadastrar **dois**, os dois
apontando para o mesmo endereço:

| Campo | O que colar |
|---|---|
| Endereço / URL | `https://okoylfnniukzwoxevyow.supabase.co/functions/v1/tmb-webhook` |
| Método | `POST` |
| Cabeçalho (header) | nome `x-webhook-secret`, valor: a sua linha |

Cadastre um para **Vendas** e outro para **Financeiro**. Se a TMB só
deixar cadastrar um, cadastre o de Vendas: é ele que libera o acesso. O
Financeiro serve para a mensalidade (corta quem parou de pagar e devolve
quando volta a pagar).

## 5.4 Confira, sem precisar esperar uma venda

Abra o app: **Mais → A sua mesa → Vendas**. É uma aba nova, e ela responde
a única pergunta que importa:

- **"A TMB ainda não chamou o app"**: nada chegou. O cadastro na TMB não
  está certo, ou a TMB ainda não teve venda nenhuma desde que você
  cadastrou;
- **linha verde**: chegou e o acesso saiu. Se a aluna disser que não
  recebeu, o e-mail caiu no spam dela;
- **linha vermelha**: chegou e deu problema, e a linha diz qual.

Para testar de verdade sem esperar cliente: faça uma compra de teste na
TMB, se ela permitir. Se não permitir, o teste do **PASSO 4** (liberar
pela mesa) já prova que a parte do e-mail funciona, e a aba Vendas prova
a parte da TMB assim que a primeira venda entrar.

## Se aparecer uma linha vermelha dizendo "status que o app não conhece"

Quer dizer que a TMB usa uma palavra diferente da esperada para dizer
"pagou". **Ninguém foi liberado e ninguém foi cortado**, de propósito:
liberar no escuro daria o produto para quem não pagou. Me mande a palavra
exata que aparece na linha e eu acrescento na lista.

---

# PASSO 6: trazer quem comprou ANTES (6 minutos)

O webhook do passo 5 avisa das vendas **daqui para a frente**. Quem
comprou antes dele existir está sem acesso e sem e-mail neste momento.

A TMB tem uma API que responde "quem comprou", e eu liguei o app nela. A
função pergunta, compara com quem tem acesso aqui, e mostra quem falta.
**Ela nao muda nada ate voce mandar.**

## 6.1 Pegue o token na TMB

1. Portal do Produtor da TMB
2. **Integracoes, depois TMB API**
3. Gere o **token de acesso** e copie
4. Anote tambem o **endereco da API** e o **ID do produto**, se aparecer

## 6.2 Cadastre no Supabase

https://supabase.com/dashboard/project/okoylfnniukzwoxevyow/settings/functions

Em **Edge Function Secrets**, tres vezes **Add new secret**:

| Name | Value |
|---|---|
| `TMB_API_TOKEN` | o token |
| `TMB_API_BASE` | o endereco da API |
| `TMB_PRODUTO_ID` | o ID do produto (so se existir) |

## 6.3 Publique a funcao

**Edge Functions, depois Create function**, nome `tmb-importar`, cole o
arquivo `supabase/functions/tmb-importar/index.ts`, **Deploy**.

## 6.4 Confira, e so entao libere

No app: **Mais, A sua mesa, Vendas, Ver quem esta faltando**.

Aparece quantos pedidos a TMB devolveu, quem ja tem acesso e a lista de
quem comprou e ainda nao entrou. **Nada foi mudado.**

Se a lista estiver certa, toque em **Liberar as N e mandar a senha**. Cada
uma recebe o e-mail. Quem ja usa o app nao recebe nada e nao perde a senha
dela.

**Repita uma vez por semana.** E como se descobre o webhook que se perdeu
no caminho, e leva 10 segundos.

---

# AGORA TESTE (5 minutos)

## A. Criar a SUA conta (só a sua, e uma vez)

O schema deixa o seu acesso ativo e a sua marca de mentora prontos, mas
**não cria a conta em si**. Ela precisa nascer no painel, uma vez.

> Isto vale só para você. A conta das alunas nasce sozinha quando a
> inscrição chega, ou quando você libera na mesa.

**Por que o "Esqueci a minha senha" não resolve isto:** ele só manda
e-mail se a conta existir, e mostra **a mesma mensagem** exista ou não, de
propósito. Dizer "esse e-mail não tem cadastro" entregaria a lista da
turma para quem ficasse chutando endereços. A proteção está certa, mas é
ela que esconde justamente este caso.

1. Abra: **https://supabase.com/dashboard/project/okoylfnniukzwoxevyow/auth/users**
2. **Add user**, depois **Create new user**
3. **Email**: `gestaogrupoa@gmail.com`
4. **Password**: escolha a sua, pelo menos 8 caracteres com letras e
   números. **Anote em lugar seguro**
5. Marque **Auto Confirm User**. Sem isso o Supabase pede uma confirmação
   por e-mail antes de deixar você entrar
6. **Create user**

Agora abra o app e entre com esse e-mail e essa senha. Em **Mais**, o
primeiro item é **A sua mesa**.

## A.2 Testar o e-mail, e nesta ordem

Cada teste isola uma coisa. Fazendo na ordem, você sabe onde mexer sem
chutar.

**Teste 1, o e-mail em si.** Saia da conta e clique em **Esqueci a minha
senha**. Se o e-mail chegar agora, o **passo 2** (o SMTP do Gmail) está
certo.

**Teste 2, a senha temporária.** É o B abaixo. Se chegar, o **passo 3**
(os três segredos) está certo.

Se o teste 1 falhar, o problema é o SMTP. Se o 1 passar e o 2 falhar, é um
dos três segredos. No Supabase, em **Logs**, procure **Auth Logs**: o erro
aparece lá com todas as letras. Me manda o print.

## B. A senha temporária

1. Na sua mesa, aba **Alunas**
2. No campo de e-mail, coloque **outro e-mail seu** (um Gmail pessoal)
3. **Liberar e mandar a senha**

**Deu certo se:** aparecer *"A senha temporária foi para o e-mail dela"*, e
chegar um e-mail preto e dourado com uma senha de 10 caracteres.

**Se disser "acesso liberado, mas a senha não foi por e-mail":** algum dos
três segredos do passo 3 está errado. Confira principalmente se as 16
letras foram coladas sem espaço.

4. Abra o app numa **janela anônima**, entre com aquele e-mail e a senha do
   e-mail. **Tem que aparecer a tela pedindo para criar a senha.**

---

# Usando a sua mesa

Entre no app, **Mais**, **A sua mesa**.

## Publicar o áudio do dia

1. Aba **Publicar**, primeiro quadro
2. Título (opcional)
3. Em **Arquivo do áudio**, escolha o áudio do celular. Ou cole o endereço
   no campo de baixo, se ele já estiver na internet
4. Se quiser, a transcrição (ajuda quem não pode ouvir na hora)
5. **Publicar o áudio**

Deu certo quando aparecer, em verde: *Publicado. Já aparece no Início das
alunas.*

## Subir a aula da semana

1. Mesma aba, segundo quadro
2. Título, **Link do vídeo** (YouTube ou Vimeo), e em uma frase o que a
   pessoa leva daquela aula
3. **Publicar a aula**

Ela aparece em **O Ano**, na aba das aulas da semana.

## Marcar o encontro

1. Terceiro quadro
2. Título, data, hora, online ou presencial, o link da sala, a pauta
3. **Publicar o encontro**

Quem confirmar presença ganha o lembrete 24 horas antes e a entrada na
agenda do celular.

## Liberar uma aluna na mão

1. Aba **Alunas**, digite o e-mail, **Liberar e mandar a senha**

Ela recebe a senha temporária na hora. Entra com aquele mesmo e-mail e
aquela senha, e o app já pede para ela criar a senha dela.

Se alguém perdeu a senha e não consegue nem usar o "esqueci", procure o
nome na lista e clique em **Reenviar a senha**: sai outra temporária, e o
progresso não é tocado.

Para tirar o acesso de alguém: **Encerrar**. O progresso **não é apagado**:
se voltar, volta de onde parou.

---

# Depois, sem pressa

## A. O limite de e-mails

O Gmail entrega 500 por dia, e isso cobre uma turma inteira com folga.
Quando a base passar disso, vale comprar um domínio (cerca de R$ 40 por
ano) e usar o Resend, que faz 3.000 por mês sem custo.

## B. As lojas

O caminho completo, campo a campo, está em `SUBIR-NAS-LOJAS.md`. O que
importa agora: **o Google exige 14 dias de teste com 12 pessoas antes de
deixar publicar**, então é por ele que se começa. A Apple costuma aprovar
antes.

---

# Se algo der errado

| O que aparece | O que fazer |
|---|---|
| "Set up custom SMTP to edit templates" | O passo 2.1 não terminou |
| A senha temporária não chega | Olhe o spam. Confira os 3 segredos do passo 3 |
| Você pede o link e não chega nada | A sua conta ainda não existe em Authentication > Users. Veja o A |
| "acesso liberado, mas a senha não foi por e-mail" | Segredo errado. Quase sempre é espaço nas 16 letras |
| O link do "esqueci a senha" não chega | Passo 2.2 sem o `{{ .ConfirmationURL }}`, ou 2.1 incompleto |
| O link leva para uma página em branco | A Site URL do passo 2.3 está faltando |
| "Acesso ainda não liberado" | Você entrou com outro e-mail |
| "E-mail ou senha não conferem" | Use a senha que veio por e-mail, ou toque em Esqueci a minha senha |
| O endereço do site dá 404 | Espere mais 2 minutos. O GitHub demora na primeira vez |
| A publicação fica vermelha em Actions | O Source do 4.2 não está como GitHub Actions |
| A publicação falha em 2 segundos, sem log | É a trava do 4.3: o ambiente github-pages só deixa o branch principal publicar |
| A mesa não aparece em Mais | Você entrou com outro e-mail. Precisa ser o gestaogrupoa@gmail.com |

Em qualquer um deles: me manda o print da tela que eu te digo o que é.
