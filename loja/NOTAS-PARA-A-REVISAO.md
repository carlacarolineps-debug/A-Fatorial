# O que escrever para os revisores das lojas

Este arquivo tem os textos prontos para copiar e colar. Não é um resumo:
é o que vai literalmente nos campos, e cada um está escrito do jeito que
reduz a chance de reprovação.

---

## 1. App Store: o campo "Notes" (Notas para a revisão)

Fica em App Store Connect, na versão do app, em **App Review Information
→ Notes**. É o campo mais importante do envio inteiro: é onde se explica
o modelo de negócio antes de o revisor tirar a conclusão dele.

**Cole isto, em inglês** (o revisor da Apple lê em inglês):

```
ABOUT THIS APP

Operação Blindada is the companion app for a paid business mentorship
program delivered by Carla Caroline in Brazil. Participants enroll in the
mentorship through a separate business relationship (contract and invoice,
handled entirely outside of any Apple platform). The app is a free tool
that lets already-enrolled participants access the material they have
already acquired: recorded lessons, audio, written modules, worksheets
and their own progress.

NO PURCHASES ANYWHERE IN THE APP

The app contains no purchase flow, no subscription, no price, no
"upgrade", no coupon or license key, and no link or call to action of any
kind pointing to an external purchase. There is not a single outbound
link in the entire application. Enrollment is never sold, offered or
suggested inside the app.

People who are not enrolled can install the app and create an account,
but they will see a screen explaining that access is not active and
telling them to contact support. That screen contains no purchase option.

HOW ACCESS WORKS

Access is granted server side, by e-mail address, when the enrollment is
confirmed outside the app. The participant receives a temporary password
by e-mail and is required to choose their own password on first sign-in.

DEMO ACCOUNT

  E-mail:   [PREENCHER]
  Password: [PREENCHER]

This account has active access and is ready to use. No e-mail
confirmation, no code and no additional hardware is required to sign in.

USER-GENERATED CONTENT (Guideline 1.2)

The app has a community area where participants can post photos and a
short member card. All four required mechanisms are implemented:
  - a moderation agreement that must be accepted before first use, on a
    blocking screen;
  - "Report" on every photo and every member card;
  - "Block" on every user, taking effect immediately on the device;
  - a moderation panel where the mentor removes content and suspends
    accounts, with a stated commitment of 24 hours.
Published contact information is inside the app, in Profile → Support,
and on the public support page.

ACCOUNT DELETION (Guideline 5.1.1(v))

In the app: More → My profile → Delete my account. It is immediate and
it deletes the authentication account itself, not just the profile row.

PRIVACY

Privacy policy: https://carlacarolineps-debug.github.io/A-Fatorial/privacidade.html
Terms of use:   https://carlacarolineps-debug.github.io/A-Fatorial/termos.html
Support:        https://carlacarolineps-debug.github.io/A-Fatorial/suporte.html
Data deletion:  https://carlacarolineps-debug.github.io/A-Fatorial/excluir-conta.html

Thank you for reviewing.
```

**Troque `[PREENCHER]` pelos dados da conta de teste** antes de enviar.
Como criar essa conta está no passo 3 do guia.

---

## 2. Se a Apple reprovar citando a regra 3.1.1

Acontece, e não quer dizer que acabou: é uma conversa. Responda pela
Resolution Center, com calma, em inglês:

```
Thank you for the review.

We would like to clarify the business model, as we believe the app falls
under Guideline 3.1.3 rather than 3.1.1.

Operação Blindada does not sell anything, anywhere in the app. There is
no in-app purchase flow, no subscription, no price displayed, no license
key, no coupon, and no link or button that leads to a purchase, inside or
outside the app. We verified this: the application contains zero outbound
links of any kind.

The mentorship is a business-to-business service sold in Brazil through a
separate contractual relationship, with invoicing under Brazilian tax law.
The app is a free companion tool that lets an already-enrolled
participant read and work through material they have already acquired.

We are happy to make any change required to comply. Could you tell us
which specific element in the app you consider to be a purchase mechanism
or a call to action to purchase, so we can remove it?
```

A última pergunta é o que faz a conversa andar: ela obriga o revisor a
apontar um elemento concreto, e como não existe nenhum, o caso costuma
ser liberado.

---

## 3. Play Console: Segurança de dados (Data safety)

Responda assim, campo por campo:

| Pergunta | Resposta |
|---|---|
| O app coleta ou compartilha dados? | **Sim, coleta. Não compartilha.** |
| Os dados são criptografados em trânsito? | **Sim** |
| O usuário pode pedir a exclusão dos dados? | **Sim** |
| URL de exclusão de conta | `https://carlacarolineps-debug.github.io/A-Fatorial/excluir-conta.html` |

Tipos de dados a declarar:

| Tipo | Coletado | Obrigatório | Para quê |
|---|---|---|---|
| Nome | Sim | Não | Funcionalidade do app |
| Endereço de e-mail | Sim | Sim | Funcionalidade, gerenciamento de conta |
| Fotos | Sim | Não | Funcionalidade do app |
| Outras ações no app | Sim | Não | Funcionalidade do app (o progresso) |
| Conteúdo gerado pelo usuário | Sim | Não | Funcionalidade, comunicação |

Não marque nada em **publicidade**, **análise de terceiros**,
**localização precisa**, **informações financeiras**, **saúde**,
**contatos**, **mensagens** ou **arquivos e documentos**. Nada disso é
coletado.

---

## 4. Play Console: Classificação de conteúdo

O questionário é da IARC. Responda com honestidade, e atenção a estas:

- **Violência, sexo, drogas, linguagem imprópria, jogos de azar**: não.
- **O app permite que usuários interajam ou troquem conteúdo?**
  **SIM.** É a comunidade. Esconder isso é o erro que derruba o app depois
  do lançamento, quando alguém reclama.
- **O app permite compartilhar a localização do usuário?** Não. O mapa de
  membros usa apenas cidade e estado, digitados pela própria pessoa, e só
  aparece para quem ligou o cartão.
- **Compras dentro do app?** Não.

A classificação deve sair como **Livre** ou **10+**, dependendo das
respostas sobre interação.

---

## 5. Play Console: Público-alvo

- Faixa etária: **18 anos ou mais**.
- Não marque nenhuma faixa infantil. O app é para donos de empresa, e
  marcar faixa infantil traz as regras da Play Families, que são muito
  mais rígidas e exigem coisas que este app não tem.

---

## 6. App Store Connect: Classificação etária

Responda **Nenhum** em quase tudo, e atenção a esta:

- **Conteúdo gerado por usuário sem controle**: responda que o app tem
  conteúdo de usuário **com** moderação. É verdade e é o que evita a
  classificação 17+ desnecessária.

A classificação deve sair **4+** ou **12+**.

---

## 7. App Privacy (App Store Connect)

O equivalente ao Data safety do Google. Declare:

| Dado | Ligado à identidade | Usado para |
|---|---|---|
| Endereço de e-mail | Sim | Funcionalidade do app |
| Nome | Sim | Funcionalidade do app |
| Fotos | Sim | Funcionalidade do app |
| Conteúdo do usuário | Sim | Funcionalidade do app |
| Identificador de usuário | Sim | Funcionalidade do app |

Não declare rastreamento. O app **não rastreia** ninguém, não tem
publicidade, não tem ferramenta de análise e não manda dado para nenhum
terceiro além do próprio servidor da mentoria.
