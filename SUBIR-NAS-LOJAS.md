# Subir nas lojas, explicado para quem nunca fez

Escrito assumindo que você nunca publicou um aplicativo. Sem jargão. Onde
tiver termo técnico, ele vem explicado na hora.

---

## Primeiro: entenda o que você tem nas mãos

Um aplicativo, hoje, é uma dessas duas coisas:

**Um site que se comporta como app.** Você já tem isso. Abre em tela cheia,
tem ícone na tela do celular, funciona sem internet. Não passa por loja
nenhuma, não paga taxa e você publica quando quiser. É o `TESTAR-NO-CELULAR.md`.

**Um pacote instalado pela loja.** É o mesmo app por dentro, embrulhado num
programa que o celular reconhece. Ganha: aparecer na busca da loja, mandar
notificação, Face ID. Custa: taxas, revisão humana e tempo.

O segundo não é melhor que o primeiro em qualidade. É melhor em alcance. Vale
saber disso para não achar que o app "não está pronto" enquanto a loja não
aprova: ele está pronto, e já pode ser usado pela turma inteira.

---

## O caminho, na ordem que economiza tempo

O gargalo é o Google: ele exige **14 dias de teste fechado com 12 pessoas**
antes de deixar publicar. Então esse é o primeiro passo, e ele roda em
paralelo com todo o resto.

| Quando | O que fazer | Quanto demora |
|---|---|---|
| Hoje | Ligar o site e testar no seu celular | 5 minutos |
| Hoje | Rodar o SQL, e o app está funcionando de verdade | 15 minutos |
| Dia 1 | Abrir a conta do Google Play e começar o teste fechado | 2 horas |
| Dia 1 | Abrir a conta Apple (a aprovação da conta leva dias) | 1 hora |
| Dia 2 | Gerar o pacote Android e subir para o teste | 2 horas |
| Dia 3 | Gerar o pacote iPhone e mandar para revisão | 3 horas |
| Dia 5 | A Apple responde | 1 a 3 dias |
| Dia 15 | O Google libera a publicação | depois dos 14 dias |

Ou seja: **a Apple pode estar no ar antes do Google**. Isso surpreende
quase todo mundo.

---

## Passo 1: as contas

### Google Play Console
<https://play.google.com/console> · **25 dólares, uma vez na vida**

Você vai preencher um formulário dizendo que é uma pessoa física ou uma
empresa. Se tiver CNPJ, use o CNPJ: contas de empresa não precisam mostrar
seu endereço pessoal na ficha do app.

### Apple Developer
<https://developer.apple.com/programs/> · **99 dólares por ano**

A Apple demora de 1 a 5 dias para aprovar a conta, e às vezes liga para
confirmar quem você é. **Abra essa conta primeiro**, antes de qualquer
coisa, porque é a espera mais imprevisível.

Se você tem CNPJ, vai precisar de um número D-U-N-S (é um registro gratuito
de empresa, a Apple explica no formulário e leva alguns dias). Se for como
pessoa física, não precisa, e o nome que aparece na loja é o seu nome civil.

---

## Passo 2: gerar os pacotes

Precisa de um computador. Para o iPhone, precisa de um **Mac**: não existe
caminho legal sem isso. Se você não tem, as opções são pedir emprestado por
um dia, alugar um Mac na nuvem (MacinCloud, cerca de 30 dólares no mês) ou
pedir para alguém que tenha.

```bash
cd app
./preparar.sh
```

Esse comando faz tudo: monta o app, instala o que falta, cria os projetos e
gera os ícones. Depois:

- **Android**: `npx cap open android`, e no Android Studio vá em **Build**,
  **Generate Signed Bundle / APK**, escolha **Android App Bundle**.
  Ele vai pedir para criar uma **keystore**: é um arquivo de assinatura, a
  identidade do seu app. **Guarde esse arquivo e a senha dele em dois
  lugares.** Se você perder, não existe recuperação: o app fica órfão e você
  precisa publicar outro, do zero, e ninguém atualiza.
- **iPhone**: `npx cap open ios`, e no Xcode vá em **Product**, **Archive**,
  depois **Distribute App**.

---

## Passo 3: o que preencher, campo a campo

### As duas lojas pedem

- **Nome**: Operação Blindada
- **Descrição curta** (80 caracteres): `A ferramenta da mentoria Operação Blindada: método, plano e acompanhamento.`
- **Categoria**: Negócios / Business
- **Classificação etária**: 18+
- **Política de privacidade**: o endereço do seu site, `/privacidade.html`
- **Suporte**: `/suporte.html` e gestaogrupoa@gmail.com
- **Capturas de tela**: já estão em `loja/capturas/`

### A conta de teste para o revisor: sem isso, reprova

Este é o campo que mais reprova app de mentoria, e você já está protegida:
o app tem senha.

1. Crie um e-mail só para isso, por exemplo `revisor@operacaoblindada.com`
   (ou um Gmail qualquer).
2. Na sua mesa, aba **Alunas**, libere esse e-mail. Ele recebe a senha
   temporária na hora.
3. Entre no app com ele uma vez e **crie uma senha definitiva**.
4. No formulário da loja, informe esse e-mail e essa senha.

> O revisor entra só com e-mail e senha, sem depender de caixa de e-mail
> nenhuma. É por isso que a entrada por código de 6 dígitos saiu: ela
> travava o revisor e é uma das causas mais comuns de reprovação.

Escreva na observação para o revisor, em inglês:

> This app is the working tool of a paid business mentoring program. Access
> is granted to enrolled clients only; the app does not sell anything and
> contains no purchase flow. Test account: revisor@... / password: ...
> Sign in with email and password on the first screen.

### A pergunta da Apple sobre conteúdo pago

Ela vai perguntar se o app dá acesso a conteúdo pago fora da loja. A resposta
verdadeira, e que enquadra na regra 3.1.3(b):

> The mentoring program is contracted outside the app, and the app neither
> sells, offers, nor mentions any purchase. It is a companion tool for
> clients who already contracted the service.

É por isso que a indicação e todo link comercial saíram do app. **Um único
botão de compra derruba esse enquadramento** e obriga a usar a compra dentro
do aplicativo, com 30% de comissão.

---

## Passo 4: o teste fechado do Google

O Google exige 12 pessoas usando por 14 dias seguidos antes de deixar
publicar para todo mundo. É chato, mas é simples:

1. Na Play Console, **Testing**, **Closed testing**, crie uma faixa.
2. Adicione os 12 e-mails (Gmail) das pessoas. Vale usar o seu próprio grupo.
3. Suba o arquivo AAB.
4. Mande o link para as 12 pessoas instalarem.
5. **Elas precisam manter instalado por 14 dias.** Peça para abrirem de vez
   em quando.

Comece por aqui no primeiro dia, porque esse relógio corre sozinho enquanto
você faz o resto.

---

## O que pode dar errado, e o que fazer

**"Falta a política de privacidade"**
O endereço precisa estar no ar e abrir sem login. Confira no navegador
anônimo.

**"Não conseguimos entrar no app"**
A conta de teste não estava com o acesso liberado, ou a senha estava errada.
Confira entrando você mesma com aquele e-mail e aquela senha.

**"O app tem conteúdo gerado por usuários"**
Eles vão testar quatro coisas, e as quatro já existem: a regra de convivência
antes do primeiro uso, o botão de denunciar, o de bloquear, e a resposta em
24 horas. Se perguntarem, responda que o app tem os quatro e diga onde.

**"Guideline 4.2: minimum functionality"**
É a reclamação de que o app é "só um site". Responda que o app funciona sem
internet, guarda o progresso no aparelho, usa Face ID, notificação local e a
folha de compartilhar do sistema, e mande as capturas de tela.

**Reprovou**
Não é o fim: você lê o motivo, corrige e reenvia. A média de apps de primeira
viagem é de 2 tentativas. A Apple responde em 1 a 3 dias por rodada.

---

## Enquanto isso, a turma já pode usar

Não espere as lojas para começar a mentoria. O endereço do site já entrega o
app completo, e migrar depois não custa nada para as alunas: **a conta é a
mesma, o progresso é o mesmo**, porque tudo vive no banco, não no aparelho.
Quem instalar pela loja depois entra com o mesmo e-mail e a mesma senha e
encontra tudo onde parou.
