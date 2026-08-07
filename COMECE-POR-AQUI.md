# O que falta você fazer, passo a passo

Escrito para ser seguido sem entender nada de programação. Cada passo diz
exatamente onde clicar e o que tem que aparecer na tela quando dá certo.

São 4 passos obrigatórios. Uns 20 minutos no total.

---

# PASSO 0: ver o app agora (1 minuto)

Antes de qualquer coisa, dá para você já olhar tudo.

1. Baixe o arquivo `Operação Blindada 0608.03.html` que eu te mandei.
2. **Dê dois cliques nele.** Abre no navegador.
3. Passeie à vontade.

O que você vai ver: o app inteiro funcionando, com as 43 trilhas, as 170
cartas, a apostila, o plano, o diário. Tudo isso já roda sem banco nenhum,
guardando no próprio computador.

**A sua mesa de mentoria não aparece aqui, e isso é de propósito.** Ela só
existe depois que você entra com a conta `gestaogrupoa@gmail.com`, e quem
decide isso é a regra dentro do banco de dados, não o aplicativo. Se
bastasse abrir o arquivo para ver a área de admin, qualquer pessoa que
baixasse o app veria também. Os passos abaixo é que ligam a sua conta.

---

# PASSO 1: ligar o banco de dados (5 minutos)

O banco é onde ficam as contas das alunas, o progresso, os áudios, as aulas.
Sem ele o app funciona, mas cada pessoa fica sozinha no próprio celular.

### 1.1

Clique aqui: **https://supabase.com/dashboard/project/okoylfnniukzwoxevyow/sql/new**

Vai abrir uma tela preta grande, com um botão verde escrito **Run** no canto
de baixo à direita.

### 1.2

Abra esta outra página numa aba nova:

**https://github.com/carlacarolineps-debug/A-Fatorial/blob/claude/strategy-cards-mentoring-vygy1x/supabase/01_schema.sql**

No canto de cima do quadro de código tem um **ícone de duas folhinhas**
(copiar). Clique nele. Pronto, copiou tudo.

### 1.3

Volte na aba do Supabase, clique dentro da área preta e cole
(**Ctrl + V**, ou **Cmd + V** no Mac).

### 1.4

Clique em **Run**.

**Deu certo se:** aparecer **Success. No rows returned** em verde embaixo.

**Deu errado se:** aparecer uma faixa vermelha. Nesse caso copie a mensagem
inteira e me mande. Não rode de novo antes de eu olhar.

> Pode rodar esse mesmo arquivo quantas vezes quiser. Ele foi feito para
> isso, e não apaga nada de ninguém.

**Se preferir, use o arquivo que eu te mandei no chat** em vez de copiar do
GitHub. Abra ele no Bloco de Notas, selecione tudo (Ctrl + A), copie
(Ctrl + C) e cole no Supabase. Às vezes o botão de copiar do GitHub não pega
o arquivo inteiro quando ele é grande, e aí o final fica faltando e dá erro.

**Sobre duas mensagens específicas:** se aparecer algo com `pg_cron` ou com
`publicacao`, **pode ignorar**. As duas agora são avisos, não erros. O resto
do arquivo roda normalmente e as 18 tabelas são criadas do mesmo jeito.

### 1.5 Conferir se deu certo mesmo (30 segundos)

Não precisa procurar tabela nenhuma na mão. Abra o arquivo
`supabase/02_conferir.sql`, copie tudo, cole no mesmo SQL Editor e clique em
**Run**.

Ele não muda nada, só olha. A resposta vem em cinco linhas, em português:

```
1. tabelas     TUDO CERTO: as 18 tabelas existem
2. seguranca   TUDO CERTO: todas protegidas
3. funcoes     TUDO CERTO: as 9 funcoes existem
4. seu acesso  TUDO CERTO: o seu acesso esta ativo
5. mentora     TUDO CERTO: voce esta na lista de mentoras
```

Se as cinco disserem TUDO CERTO, pode seguir para o passo 2. Se alguma
disser ATENCAO ou FALTAM, me manda o print.

---

# PASSO 2: o e-mail com o código (3 minutos)

O app manda um código de 6 dígitos no primeiro acesso. Por padrão o Supabase
manda só um link, então precisamos avisar que queremos o código.

### 2.1

Clique aqui: **https://supabase.com/dashboard/project/okoylfnniukzwoxevyow/auth/templates**

### 2.2

Se a tela pedir **Host**, **Port**, **Username**, você caiu na aba errada
(aquela é **SMTP Settings**). Procure no alto a aba **Templates** e clique
nela.

### 2.3

Na lista de modelos, clique em **Magic Link**.

### 2.4

No campo grande do meio, **apague tudo** e cole exatamente isto:

```html
<h2>Seu codigo de acesso</h2>
<p>Digite este codigo no aplicativo Operacao Blindada:</p>
<p style="font-size:34px;letter-spacing:8px;font-weight:bold">{{ .Token }}</p>
<p>O codigo vale por 1 hora.</p>
```

### 2.5

Clique em **Save**.

> O pedacinho `{{ .Token }}` é o que vira o número. Ele precisa ficar escrito
> exatamente assim, com os espaços dentro das chaves.

---

# PASSO 3: entrar no app e virar a mentora (3 minutos)

### 3.1

Abra o arquivo do app **hospedado**, não o do seu computador. Se você ainda
não fez o passo 4, pode pular para lá e voltar aqui depois.

### 3.2

Na tela de entrada, clique em **É o meu primeiro acesso**.

### 3.3

Digite `gestaogrupoa@gmail.com` e clique em **Receber o código**.

### 3.4

Abra o seu e-mail. **Olhe também o spam**, o primeiro sempre cai lá.
Digite os 6 números no app.

### 3.5

Crie a sua senha. Pelo menos 8 caracteres, com letras e números. **Anote em
lugar seguro.**

### 3.6

Pronto, o app abre. Vá em **Mais**: o primeiro item da lista é **A sua mesa**.

> Você não precisa fazer o "Comece por aqui" das alunas. Quem conduz entra
> com tudo aberto.

**Se aparecer "Acesso ainda não liberado":** significa que o passo 1 não
terminou. Volte e confira se apareceu o Success verde.

---

# PASSO 4: ligar o app no seu celular (2 minutos)

### 4.1

Clique aqui: **https://github.com/carlacarolineps-debug/A-Fatorial/settings/pages**

### 4.2

Em **Source**, escolha **Deploy from a branch**.

### 4.3

Em **Branch**, abra a listinha e escolha:
`claude/strategy-cards-mentoring-vygy1x`

### 4.4

Na listinha ao lado (a da pasta), escolha **`/docs`**.

### 4.5

Clique em **Save**.

### 4.6

Espere 2 minutos e recarregue a página. Vai aparecer uma faixa verde com um
endereço parecido com este:

**https://carlacarolineps-debug.github.io/A-Fatorial/**

### 4.7

Abra esse endereço **no seu celular**.

- **Android**: toque nos três pontinhos em cima e escolha
  **Instalar aplicativo**
- **iPhone**: toque no botão de compartilhar (quadrado com seta para cima),
  role para baixo e escolha **Adicionar à Tela de Início**

Pronto: o ícone do escudo dourado aparece junto com os outros aplicativos, e
abre em tela cheia.

---

# Agora sim: usando a sua mesa

Entre no app, vá em **Mais**, depois **A sua mesa**.

## Publicar o áudio do dia

1. Aba **Publicar**
2. No primeiro quadro, **O áudio do dia**
3. Escreva um título (opcional)
4. Em **Arquivo do áudio**, escolha o áudio que você gravou no celular.
   Ou, se ele já está em algum lugar na internet, cole o endereço no campo
   de baixo
5. Se quiser, escreva a transcrição (ajuda quem não pode ouvir na hora)
6. **Publicar o áudio**

Deu certo quando aparecer, em verde: *Publicado. Já aparece no Início das
alunas.*

## Subir a aula da semana

1. Mesma aba **Publicar**, segundo quadro
2. Título da aula
3. **Link do vídeo**: cole o endereço do YouTube ou do Vimeo
4. Escreva em uma frase o que a pessoa leva daquela aula
5. **Publicar a aula**

Ela aparece em **O Ano**, na aba das aulas da semana, com o contador de
quantas já saíram naquela semana.

## Marcar o encontro

1. Terceiro quadro
2. Título, data, hora
3. Online ou presencial
4. Cole o link da sala (ou o endereço, se for presencial)
5. Escreva a pauta
6. **Publicar o encontro**

Quem confirmar presença ganha o lembrete 24 horas antes e a entrada na
agenda do celular.

## Liberar uma aluna na mão

1. Aba **Alunas**
2. Digite o e-mail dela no primeiro campo
3. **Liberar o acesso**

Ela entra com aquele mesmo e-mail, recebe o código, cria a senha e está
dentro. Serve para quando a inscrição não chegou sozinha, ou para uma
convidada.

Para tirar o acesso de alguém: procure o nome na lista e clique em
**Encerrar**. O progresso dela **não é apagado**: se voltar, volta de onde
parou.

---

# Depois, sem pressa

Estas três coisas não impedem você de começar hoje.

## A. E-mail próprio (antes de abrir para a turma)

O e-mail de teste do Supabase manda pouquíssimos por hora. Com a turma
inteira entrando no mesmo dia, as últimas não recebem o código.

Se você **tem domínio próprio**, use o Resend. Se **não tem**, use o Brevo,
que aceita e-mail comum e manda 300 por dia sem custo. Depois é só preencher
em **Project Settings**, **Authentication**, **SMTP Settings**. Os detalhes
estão em `loja/passo-a-passo-supabase.md`.

## B. A liberação automática pela TMB

Hoje você libera cada aluna na mão, pela aba Alunas. Para a inscrição virar
acesso sozinha, tem o passo 5 do arquivo `loja/passo-a-passo-supabase.md`.
Dá para fazer tudo pelo navegador, em 10 minutos.

## C. As lojas

O caminho completo, campo a campo, está em `SUBIR-NAS-LOJAS.md`. O que
importa saber agora: **o Google exige 14 dias de teste com 12 pessoas antes
de deixar publicar**, então é por ele que se começa. A Apple costuma
aprovar antes.

---

# Se algo der errado

| O que aparece | O que fazer |
|---|---|
| Faixa vermelha no Supabase | Copie a mensagem inteira e me mande |
| "Acesso ainda não liberado" | O passo 1 não terminou. Confira o Success verde |
| O código não chega | Olhe o spam. Espere 1 minuto e toque em reenviar |
| "E-mail ou senha não conferem" | Se é o primeiro acesso, use o botão de primeiro acesso |
| O endereço do site dá 404 | Espere mais 2 minutos. O GitHub demora para publicar |
| A mesa não aparece em Mais | Você entrou com outro e-mail. Precisa ser o gestaogrupoa@gmail.com |

Em qualquer um deles: me manda o print da tela que eu te digo o que é.
