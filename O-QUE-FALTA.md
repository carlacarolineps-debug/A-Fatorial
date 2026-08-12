# Tudo que falta você fazer, numa lista só

Este é o mapa completo. Os outros arquivos explicam cada passo em detalhe;
aqui está a **ordem**, o **tempo** e o **porquê** de cada um.

Marque conforme for fazendo.

---

## Como ler esta lista

| Marca | O que quer dizer |
|---|---|
| **TRAVA** | sem isto, alguma coisa não funciona para as alunas |
| **ESPERA** | depende de outra pessoa ou de um prazo, comece cedo |
| **PODE ESPERAR** | melhora, mas nada quebra sem |

---

# BLOCO 1: o app funcionando (é o que a turma usa hoje)

### 1.1 Republicar o banco e as funções **TRAVA**
`⏱ 10 minutos`

A auditoria achou defeitos graves e eu consertei, **mas o conserto só vale
depois que você republicar**. Enquanto não fizer isto, quem comprar
continua sem receber a senha.

1. Supabase → **SQL Editor** → cole o `supabase/01_schema.sql` inteiro → **Run**
2. Supabase → **Edge Functions** → `liberar-aluna` → substitua pelo arquivo novo → **Deploy**
3. Supabase → **Edge Functions** → `tmb-webhook` → substitua pelo arquivo novo → **Deploy**

**Como saber que deu certo:** o SQL termina sem linha vermelha, e as duas
funções mostram a data de hoje.

### 1.2 Testar a ponta a ponta **TRAVA**
`⏱ 5 minutos`

App → **Mais → A sua mesa → Alunas** → escreva um e-mail seu →
**Liberar e mandar a senha**.

**Tem que acontecer:** o e-mail chega em menos de 1 minuto, mostrando o
endereço de acesso e a senha; você entra com ele; o app exige que você
crie uma senha sua.

**Se não chegar:** vá em **Vendas** na mesa. A linha vermelha diz o motivo.

### 1.3 A logo **TRAVA (é você quem tem o arquivo)**
`⏱ 3 minutos`

O arquivo que você mandou não chegou no meu ambiente: eu vejo a imagem na
conversa, mas o arquivo em si não veio. Como você pediu para não inventar
outra, não redesenhei.

1. Abra https://github.com/carlacarolineps-debug/A-Fatorial
2. **Add file → Upload files**
3. Arraste a logo e renomeie o arquivo para `logo.png`
4. **Commit changes**
5. Me avise

A esteira está pronta e testada: ela tira o fundo branco, recorta a
margem, gera os cinco tamanhos das lojas e troca a marca em **todas** as
telas de uma vez.

---

# BLOCO 2: a venda virando acesso sozinha

### 2.1 Os dois webhooks **você já fez**
Feito hoje: Supabase, TMB Vendas e TMB Financeiro.

> **Confira uma coisa:** o segredo tem que ser o mesmo nos três, e o
> primeiro que você usou (`blindada-tmb-7f4c...`) **não serve**, porque era
> o exemplo escrito num arquivo público. Se ainda estiver em algum dos
> três, troque pelo que eu gerei.

### 2.2 A API da TMB: trazer quem comprou ANTES **TRAVA**
`⏱ 15 minutos`

Você me contou da API, e ela resolve um problema que o webhook **não**
resolve. O webhook avisa das vendas **daqui para a frente**. Quem comprou
antes de hoje está sem acesso e sem e-mail, e a única saída seria liberar
uma por uma na mão.

Construí a função `tmb-importar`: ela pergunta à TMB quem comprou e libera
quem falta. **Ela nasce em modo de conferência**: mostra o que faria, sem
escrever nada e sem mandar e-mail. Você vê a lista e decide.

**Passo a passo:**

1. No **Portal do Produtor da TMB**, procure **Integrações → TMB API** e
   gere o **token de acesso**. Copie.
2. Na mesma página, anote o **endereço da API** (algo como
   `https://api.tmbeducacao.com.br`) e, se aparecer, o **ID do seu produto**.
3. Supabase → **Edge Functions → Secrets** → **Add new secret**, três vezes:

   | Name | Value |
   |---|---|
   | `TMB_API_TOKEN` | o token que você copiou |
   | `TMB_API_BASE` | o endereço da API |
   | `TMB_PRODUTO_ID` | o ID do produto (só se existir) |

4. Supabase → **Edge Functions** → **Create function** → nome
   `tmb-importar` → cole o arquivo `supabase/functions/tmb-importar/index.ts`
   → **Deploy**
5. No app: **Mais → A sua mesa → Vendas → Ver quem está faltando**

**O que aparece:** quantos pedidos a TMB devolveu, quem já tem acesso,
e a lista de quem comprou e ainda não entrou. **Nada foi mudado ainda.**

6. Se a lista estiver certa, toque em **Liberar as N e mandar a senha**.
   Cada uma recebe o e-mail. Quem já usa o app não recebe nada e não perde
   a senha dela.

**Se aparecer "a TMB usou palavra que o app não conhece":** me mande a
palavra exata. Ninguém foi liberado nem cortado por causa dela, de
propósito.

**Vale repetir isso uma vez por semana**, para achar o webhook que se
perdeu no caminho. Leva 10 segundos.

---

# BLOCO 3: as lojas

Detalhe campo a campo em `SUBIR-NAS-LOJAS.md`. Aqui só a ordem e o prazo.

### 3.1 Conta Google Play Console **ESPERA**
`⏱ 20 min + 1 a 3 dias` · R$ 130 uma vez

### 3.2 Conta Apple Developer **ESPERA**
`⏱ 20 min + 1 a 14 dias` · 99 dólares por ano
Escolha **Individual** se tiver pressa: Organização exige um número
D-U-N-S que leva até 14 dias.

### 3.3 A conta de teste do revisor **TRAVA**
`⏱ 10 minutos`

**É o passo que mais reprova app.** O revisor não tem acesso a caixa de
e-mail nenhuma. Crie um e-mail só para isso, libere pela mesa, **e entre
com ele uma vez para criar a senha definitiva**. Se pular essa parte, o
revisor bate na troca de senha obrigatória e reprova sem ver o app.

### 3.4 Gerar os pacotes
`⏱ 40 minutos`

Na sua máquina: `cd app` e `bash preparar.sh`.

Android sai em qualquer computador. **iPhone só no Mac.** Se você não tem,
dá para alugar um na nuvem por uns 30 dólares.

> ⚠️ Ao gerar o Android ele cria uma **chave de assinatura**. Guarde a
> chave e a senha em dois lugares. Se perder, **nunca mais** consegue
> atualizar o app.

### 3.5 Teste fechado do Google: 12 pessoas, 14 dias **ESPERA**
`⏱ 30 min + 14 dias de calendário`

Não tem como pular, e é o que manda no relógio de tudo. **Comece por aqui.**

### 3.6 Preencher as duas lojas
`⏱ 2 horas`

Todas as respostas prontas para copiar estão em
`loja/NOTAS-PARA-A-REVISAO.md`: o texto do revisor da Apple, o Data safety
do Google, a classificação de conteúdo e o App Privacy.

### 3.7 Se a Apple reprovar por 3.1.1
Está previsto e tem resposta pronta na seção 2 daquele mesmo arquivo. É
conversa, não é o fim.

---

# BLOCO 4: o que melhora, sem pressa

### 4.1 Domínio próprio **PODE ESPERAR**
`⏱ 30 min` · cerca de R$ 40 por ano

Hoje o app vive no endereço do GitHub, que funciona mas tem cara de
técnico. Com domínio próprio (por exemplo `app.afatorial.com.br`) o
endereço fica seu, e você pode trocar o Gmail por um serviço de e-mail que
entrega melhor.

### 4.2 Trocar o Gmail pelo Resend **PODE ESPERAR**
`⏱ 40 min` · grátis até 3.000 por mês

O Gmail entrega 500 e-mails por dia, o que cobre a turma com folga. Passando
disso, ou se os e-mails começarem a cair em spam, o Resend resolve. **Exige
o domínio do item 4.1.**

### 4.3 Notificação de verdade (push) **PODE ESPERAR**
`⏱ depende`

Hoje o lembrete do treino é local: funciona no aparelho, sem internet, mas
só dispara na hora que a pessoa escolheu. Notificação enviada por você (do
tipo "o áudio de hoje saiu") exige o app publicado nas lojas e certificado.
Não faz sentido antes do bloco 3.

### 4.4 Os 33 achados menores da auditoria **PODE ESPERAR**

Sobraram itens médios e baixos que não impedem nada: régua de cobrança que
não devolve o acesso sozinha em um caso, duas abas do mesmo app se
sobrescrevendo, senha temporária sem prazo de validade. Ficam para o
próximo passe. Nenhum deles impede alguém de entrar ou permite alguém
entrar sem pagar.

---

# A ordem que eu faria, se fosse você

**Hoje:**
1. Republicar banco e funções (1.1)
2. Testar o e-mail (1.2)
3. Subir a logo (1.3)

**Amanhã:**
4. Token da TMB e importar a turma antiga (2.2) ← é o que destrava quem já pagou
5. Abrir as duas contas de desenvolvedor (3.1, 3.2)

**Esta semana:**
6. Conta de teste do revisor (3.3)
7. Gerar os pacotes (3.4)
8. **Começar o teste fechado do Google** (3.5) ← o relógio de 14 dias começa a correr

**Nas duas semanas seguintes:**
9. Preencher as lojas (3.6) enquanto o teste corre
10. Enviar para revisão nas duas

**Do zero ao ar: cerca de três semanas**, e quem manda no relógio é o
teste de 14 dias do Google.

---

# Enquanto nada disso acontece

A mentoria não está parada. O app **já funciona** no celular, hoje, pelo
endereço https://carlacarolineps-debug.github.io/A-Fatorial/ , e instala
na tela de início sem loja nenhuma (`TESTAR-NO-CELULAR.md`).

A loja muda duas coisas: as pessoas te acharem procurando o nome, e a
notificação enviada por você. Não muda o app funcionar.
