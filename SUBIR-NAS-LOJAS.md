# Subir nas lojas: o que falta você fazer

Escrito para ser seguido sem entender nada de programação. Cada passo diz
onde clicar, o que aparece quando dá certo, e o que fazer quando dá errado.

---

## O que eu já deixei pronto (não precisa mexer)

O aplicativo em si está em conformidade. Isso foi **conferido por teste
automático**, não por opinião: `testes/lojas.cjs` abre o app e verifica
item por item das diretrizes. Roda com 0 falhas.

| Exigência | Regra | Como está |
|---|---|---|
| Nenhum caminho de compra dentro do app | Apple 3.1.1 e 3.1.3 | **0 links externos** nas 16 telas |
| Denunciar, bloquear, moderar, contato | Apple 1.2 | os quatro existem e funcionam |
| Regra de convivência antes do primeiro uso | Apple 1.2 | tela travada, sem botão de fechar |
| Excluir a conta dentro do app | Apple 5.1.1(v) | apaga a conta de verdade, não só esconde |
| Privacidade e termos dentro do app | Apple 5.1.1 | no Perfil, em Documentos |
| Página pública de exclusão | Google (obrigatório) | `excluir-conta.html`, no ar |
| Textos de permissão do iPhone | Apple 2.1 | escritos sozinhos pelo `preparar.sh` |
| Ícones, capturas, páginas públicas | as duas | prontos em `loja/` |

**O que eu não posso fazer por você:** criar as contas de desenvolvedor
(exigem documento e cartão seus), gerar o pacote do iPhone (só sai num
Mac) e preencher os formulários das lojas.

---

## Uma coisa que você precisa saber antes de começar

O seu app entrega conteúdo de uma mentoria que é **vendida fora dele**. A
Apple tem uma regra (3.1.1) que diz que desbloquear conteúdo dentro do app
exige a compra pela Apple, com 15 a 30% para eles. E tem outra (3.1.3) que
abre exceção para app que só dá acesso a conteúdo já adquirido.

O seu app está do lado certo dessa linha, e com folga: ele **não vende
nada, não mostra preço, não tem link nenhum para fora**. Ainda assim, um
revisor pode ler pela regra errada e reprovar na primeira volta.

**Isso é normal e não significa que acabou.** Deixei em
`loja/NOTAS-PARA-A-REVISAO.md` dois textos prontos: o que escrever no
envio para evitar a confusão, e o que responder se ela acontecer. É
conversa, e costuma ser resolvida em uma ou duas respostas.

**Minha recomendação: comece pelo Google.** Ele demora mais por causa do
teste de 14 dias, então quanto antes começar, melhor, e a aprovação lá é
mais previsível. Faça a Apple em paralelo.

---

## PASSO 1: as duas contas (30 minutos, mais espera)

### Google Play Console: R$ 130, uma vez só

1. Abra https://play.google.com/console/signup
2. Entre com a conta Google da mentoria
3. Escolha **Pessoal** (a menos que queira o CNPJ no lugar do seu nome:
   aí escolha Organização, que pede mais documentos)
4. Pague os 25 dólares
5. Confirme a identidade: eles pedem documento com foto. **Leva de 1 a 3
   dias.**

### Apple Developer: 99 dólares por ano

1. Abra https://developer.apple.com/programs/enroll/
2. Entre com o seu Apple ID
3. Escolha **Individual** (mostra o seu nome como vendedor) ou
   **Organização** (mostra o nome da empresa, mas exige um número D-U-N-S,
   que leva de 5 a 14 dias para sair)
4. Pague

**Se você tem pressa, escolha Individual nos dois.** Dá para mudar depois.

---

## PASSO 2: a conta de teste para o revisor (10 minutos)

**Este é o passo que mais reprova app, e é o mais fácil de fazer.** O
revisor não tem acesso à caixa de e-mail de ninguém: se ele não conseguir
entrar, ele reprova sem olhar o resto.

1. Crie um e-mail novo e só para isso, por exemplo
   `revisao.operacaoblindada@gmail.com`
2. Abra o app, entre com a sua conta de mentora
3. Vá em **Mais → A sua mesa → Alunas**
4. Escreva o e-mail da revisão e toque em **Liberar e mandar a senha**
5. Abra a caixa desse e-mail novo e pegue a senha temporária
6. **Entre no app com ele e crie uma senha definitiva.** Anote essa senha.
7. Saia e entre de novo com a senha definitiva, para confirmar que ela
   funciona e que o app **não pede** para trocar de novo

**O que tem que acontecer:** o app abre direto no Início, sem pedir nada.
Se ele pedir para criar senha de novo, o passo 6 não pegou: refaça.

**Guarde o e-mail e a senha.** Eles vão nos dois envios.

---

## PASSO 3: gerar os pacotes

Isto roda na **sua máquina**, não aqui. Você precisa do
[Node.js](https://nodejs.org) instalado.

```
cd app
bash preparar.sh
```

O script monta tudo, gera os ícones, e no Mac ainda escreve sozinho os
textos de permissão do iPhone (sem eles o app **fecha** quando a pessoa
toca em "Colocar uma foto", e a Apple reprova).

### Android (funciona em qualquer computador)

```
npx cap open android
```

No Android Studio: **Build → Generate Signed Bundle / APK → Android App
Bundle**. Na primeira vez ele pede para criar uma chave de assinatura.

> **Guarde essa chave e a senha dela em dois lugares.** Se você perder,
> **nunca mais** consegue atualizar o app: teria que publicar outro, do
> zero, e as pessoas que instalaram não recebem a atualização. É o erro
> mais caro que existe nessa história.

Sai um arquivo `.aab`. É ele que você envia.

### iPhone (só no Mac, com Xcode)

```
npx cap open ios
```

No Xcode: escolha **Any iOS Device** em cima, depois **Product → Archive**,
depois **Distribute App → App Store Connect**.

**Se você não tem Mac:** dá para alugar um na nuvem (MacinCloud, cerca de
30 dólares por mês) ou usar o Mac de alguém por uma tarde. Não há outro
caminho: a Apple só aceita pacote gerado no sistema dela.

---

## PASSO 4: preencher a Play Store

Em https://play.google.com/console → **Criar app**.

| Campo | O que pôr |
|---|---|
| Nome do app | `Operação Blindada` |
| Idioma padrão | Português (Brasil) |
| App ou jogo | App |
| Gratuito ou pago | **Gratuito** |

Depois, em **Painel**, ele lista o que falta. Os que importam:

**Segurança de dados**, **Classificação de conteúdo**, **Público-alvo** e
**Política de privacidade**: as respostas prontas, campo por campo, estão
em `loja/NOTAS-PARA-A-REVISAO.md`, nas seções 3, 4 e 5. Copie de lá.

**Endereços que ele pede:**

- Política de privacidade:
  `https://carlacarolineps-debug.github.io/A-Fatorial/privacidade.html`
- Exclusão de conta:
  `https://carlacarolineps-debug.github.io/A-Fatorial/excluir-conta.html`
- Suporte:
  `https://carlacarolineps-debug.github.io/A-Fatorial/suporte.html`

**Ficha da loja:**

- Ícone: `loja/icones/icone-512.png`
- Capturas: as que começam com `play-` em `loja/capturas/`
- Descrição curta (até 80 caracteres):
  `A ferramenta de trabalho da mentoria Operação Blindada.`
- Descrição completa: use a de `loja/README.md`

**Acesso ao app:** marque que o app **exige credenciais** e cole o e-mail
e a senha do PASSO 2.

---

## PASSO 5: o teste fechado do Google (14 dias)

Se a sua conta é **Pessoal** e foi criada depois de novembro de 2023, o
Google exige, antes de deixar publicar:

- **12 pessoas** instaladas no teste fechado
- durante **14 dias seguidos**

Não tem como pular. Por isso: **faça este passo primeiro de tudo.**

1. Play Console → **Teste** → **Teste fechado** → criar uma versão
2. Suba o `.aab`
3. Em **Testadores**, crie uma lista com 12 e-mails **do Gmail** de pessoas
   reais (alunas, amigas, familiares)
4. Copie o link do teste e mande para elas
5. **Cada uma precisa instalar e abrir.** Instalar e não abrir não conta.
6. Depois dos 14 dias, o Play Console libera o botão de produção

**Dica:** avise as 12 que elas não podem desinstalar durante os 14 dias.

---

## PASSO 6: preencher a App Store

Em https://appstoreconnect.apple.com → **Meus apps** → **+**

| Campo | O que pôr |
|---|---|
| Nome | `Operação Blindada` |
| Idioma principal | Português (Brasil) |
| Bundle ID | `com.operacaoblindada.app` |
| SKU | `operacao-blindada-01` |
| Preço | **Gratuito** |

**Informações de revisão:** cole o e-mail e a senha do PASSO 2, e cole no
campo **Notes** o texto inteiro da seção 1 de `loja/NOTAS-PARA-A-REVISAO.md`.
Esse texto é o que evita a confusão com a regra 3.1.1.

**Privacidade do app:** as respostas estão na seção 7 do mesmo arquivo.

**Capturas:** as que começam com `apple-` em `loja/capturas/`.

---

## Quanto tempo leva

| | Prazo |
|---|---|
| Conta Google confirmada | 1 a 3 dias |
| Conta Apple confirmada | 1 dia (Individual) ou 5 a 14 (Organização) |
| Teste fechado do Google | **14 dias** |
| Revisão do Google | 1 a 7 dias |
| Revisão da Apple | 1 a 3 dias |

**Do zero ao ar: cerca de três semanas**, e quem manda no relógio é o
teste de 14 dias do Google.

---

## Se der errado

| O que aparece | O que fazer |
|---|---|
| "Guideline 3.1.1: apps must use IAP" | Não entre em pânico. Responda com o texto da seção 2 de `NOTAS-PARA-A-REVISAO.md` |
| "Guideline 2.1: unable to sign in" | A conta de teste falhou. Refaça o PASSO 2 e confirme que ela entra sem pedir troca de senha |
| "Guideline 1.2: UGC" | Aponte no Resolution Center onde estão o Denunciar, o Bloquear e a regra de convivência |
| O app fecha ao tocar em "Colocar uma foto" | O passo 5 do `preparar.sh` não rodou. Rode `bash preparar.sh` de novo, no Mac |
| Google: "Data deletion URL required" | Cole `https://carlacarolineps-debug.github.io/A-Fatorial/excluir-conta.html` |
| Google: "Target API level" | Abra `android/app/build.gradle` e suba o `targetSdkVersion` para o número que o aviso pedir |

---

## Enquanto isso, a turma já pode usar

Nada disso trava a mentoria. O app já funciona no celular, hoje, pelo
endereço https://carlacarolineps-debug.github.io/A-Fatorial/ , e instala na
tela de início sem loja nenhuma. O passo a passo está em
`TESTAR-NO-CELULAR.md`.

A loja muda duas coisas: as pessoas te acham procurando o nome, e o app
pode mandar notificação. Não muda o app funcionar.
