# Operação Blindada: o que falta para estar nas lojas

Este diretório tem tudo que o app precisa para virar aplicativo publicável.
O que está aqui já está pronto. O que depende de conta, senha ou cartão
está listado como passo manual, na ordem de fazer.

---

## O que já está pronto no app

| Exigência das lojas | Onde ficou |
|---|---|
| Nenhuma venda dentro do app | Indicação removida, sem link para perfil comercial, sem renovação |
| Regras de convivência aceitas antes do uso | Tela travada no primeiro acesso, aceite gravado com data e versão |
| Denunciar conteúdo | Botão em toda foto da galeria e em todo cartão de membro |
| Bloquear pessoa | Ao lado do denunciar, com efeito imediato na tela |
| Resposta em até 24h | Painel de denúncias da mentora, com o relógio de cada caso |
| Política de privacidade | Dentro do app e em `privacidade.html` |
| Termos de uso | Dentro do app e em `termos.html` |
| Apagar a conta pelo app | Mais, excluir a minha conta, com dupla confirmação |
| Login sem sair do app | Código de 6 dígitos por e-mail |
| Funciona sem internet | Fontes e biblioteca embutidas, limite de 7 dias offline |
| Ícone e splash | `icones/`, gerados do próprio isotipo |
| Capturas de tela | `capturas/`, nos dois tamanhos que as lojas pedem |

---

## Passo 1: o banco de dados (15 minutos)

O projeto Supabase existe e está vazio. Falta rodar o schema.

1. Abra <https://supabase.com/dashboard/project/okoylfnniukzwoxevyow/sql/new>
2. Abra o arquivo `supabase/01_schema.sql` deste repositório, copie tudo e cole.
3. Aperte **Run**. Deve terminar com sucesso e sem aviso vermelho.
4. Confira em **Table Editor**: devem aparecer 18 tabelas, todas com o
   cadeado de RLS ligado.

O script cria tudo do zero e não apaga nada, porque não há nada para apagar
(o banco tem 0 usuários e 0 tabelas hoje).

### Passo 1.1: a chave do app

1. Em **Project Settings**, **API Keys**, copie a chave **anon public**.
2. Abra o arquivo `Operação Blindada 0508.03.html`, procure por
   `COLE_AQUI_A_ANON_KEY` e troque pela chave.
3. Salve. Só isso liga o app ao banco.

A chave anon é feita para ficar no cliente: quem manda no acesso é a regra
do banco (RLS), não ela. A chave `service_role` nunca entra aqui.

### Passo 1.2: a sua conta de mentora

Não precisa fazer nada: o schema já deixa o seu acesso ativo e marca a sua
conta como mentora assim que ela nascer, no primeiro login. Entre no app com
`gestaogrupoa@gmail.com` e o painel de denúncias está lá.

Quem manda mora na tabela `mentoras`, com RLS ligado e nenhuma política:
nenhuma conta logada lê ou escreve aquilo. Para acrescentar outra pessoa, é
uma linha no SQL Editor e rodar o arquivo de novo.

### Passo 1.3: o e-mail com o código de 6 dígitos

Por padrão o Supabase manda só o link. O app pede o código, então o modelo
precisa ter o código.

1. **Authentication**, **Emails**, modelo **Magic Link**.
2. No corpo do e-mail, inclua o código em destaque:
   ```html
   <h2>{{ .Token }}</h2>
   <p>Digite este código de 6 dígitos no aplicativo. Ele vale por 1 hora.</p>
   ```
3. Salve.

Enquanto o e-mail de teste do Supabase estiver em uso, o limite é baixo
(poucos por hora). Antes de abrir para a turma, configure um SMTP próprio
em **Project Settings**, **Auth**, **SMTP Settings**. Resend, Postmark e
Amazon SES servem.

### Passo 1.4: o webhook da TMB

1. Instale o CLI: `npm i -g supabase`
2. `supabase login`
3. `supabase link --project-ref okoylfnniukzwoxevyow`
4. `supabase secrets set TMB_WEBHOOK_SECRET=<invente um segredo longo>`
5. `supabase functions deploy tmb-webhook --no-verify-jwt`
6. Na TMB, cadastre os dois webhooks (Vendas e Financeiro) apontando para
   `https://okoylfnniukzwoxevyow.supabase.co/functions/v1/tmb-webhook`
   com o cabeçalho `x-webhook-secret: <o mesmo segredo>`.

Antes de confiar, mande um pedido de teste e confira a tabela
`webhook_log`: o payload cru fica lá, mesmo quando algo falha.

---

## Passo 2: hospedar a versão web (10 minutos)

Serve para duas coisas: as lojas exigem endereço público para privacidade,
termos e suporte, e a versão web é o plano B de quem tem problema no app.

1. Copie para uma pasta: o `.html` do app **renomeado para `index.html`**,
   mais `manifest.json`, `sw.js` e a pasta `icones/`, mais
   `privacidade.html`, `termos.html` e `suporte.html`.
2. Publique. As duas opções sem custo:
   - **GitHub Pages**: suba a pasta num repositório, ative Pages nas
     configurações. O endereço vira `https://<usuario>.github.io/<repo>/`.
   - **Netlify Drop**: arraste a pasta em <https://app.netlify.com/drop>.
     Sai um endereço em segundos.
3. Guarde os três endereços, você vai precisar deles nas duas lojas:
   - `.../privacidade.html`
   - `.../termos.html`
   - `.../suporte.html`

---

## Passo 3: virar aplicativo (Capacitor)

Precisa de um computador com Node instalado. Para o iPhone, precisa de um
Mac com Xcode: não existe caminho sem isso.

```bash
# na pasta loja/
mkdir -p www/icones
cp "../Operação Blindada 0508.03.html" www/index.html
cp manifest.json sw.js www/
cp icones/* www/icones/
cp privacidade.html termos.html suporte.html www/

npm install
npx cap init "Operação Blindada" com.operacaoblindada.app --web-dir=www
npx cap add android
npx cap add ios          # só no Mac
npx cap sync
```

Depois:
- Android: `npx cap open android`, e no Android Studio faça
  **Build**, **Generate Signed Bundle**, formato **AAB**.
- iPhone: `npx cap open ios`, e no Xcode **Product**, **Archive**.

Os ícones: no Android Studio, botão direito em `res`, **New**,
**Image Asset**, e use `icones/icone-1024.png`. No Xcode, arraste os
tamanhos para `Assets.xcassets`, ou use `npx @capacitor/assets generate`
apontando para `icones/icone-1024.png`.

---

## Passo 4: as contas das lojas

| | Google Play | App Store |
|---|---|---|
| Custo | 25 dólares, uma vez | 99 dólares por ano |
| Onde | play.google.com/console | developer.apple.com |
| Prazo de análise | 1 a 7 dias | 1 a 3 dias |
| Exige teste fechado antes | Sim: 12 pessoas por 14 dias | Não |

O teste fechado do Google é a parte que leva mais tempo: comece por ele.
São 12 contas de e-mail reais que instalam e usam o app por 14 dias
seguidos. Vale usar o próprio grupo da mentoria.

### O que preencher nas duas

- **Nome**: Operação Blindada
- **Categoria**: Negócios (Google) e Business (Apple)
- **Classificação**: 18 anos ou mais
- **Privacidade**: o endereço do passo 2
- **Suporte**: o endereço do passo 2 e gestaogrupoa@gmail.com
- **Conta de teste para o revisor**: crie um e-mail só para isso, deixe o
  acesso ativo no banco e informe o e-mail no formulário, explicando que a
  entrada é por código de 6 dígitos enviado para aquele e-mail. **Sem isso a
  Apple reprova**, porque o revisor não consegue passar da tela de login.

### A pergunta que a Apple faz e a resposta certa

> "O app permite acesso a conteúdo pago fora da loja?"

O acesso vem da mentoria contratada fora do aplicativo, e o app não vende,
não oferece e não menciona compra em nenhum lugar. Esse é o enquadramento
de app de empresa para cliente já contratado, previsto na regra 3.1.3(b).
É por isso que a indicação e qualquer link comercial saíram: um único botão
de compra derruba esse enquadramento.

---

## Passo 5: as capturas de tela

Cada loja quer imagens do app rodando.

- Google Play: no mínimo 2, de 1080x1920.
- App Store: no mínimo 3, de 1290x2796 (iPhone 6.7 polegadas).

As melhores telas para mostrar: o treino de hoje, o painel EMC, uma carta
da Bússola aberta, o plano de ação e as trilhas.

---

## O que ainda depende de você decidir

1. **Fotos e áudios: público ou assinado.** Hoje os arquivos ficam em
   endereço público (quem tem o link, abre). Assinado é mais fechado, mas
   exige gerar o link a cada abertura. Para galeria de comunidade, público
   costuma bastar.
2. **A hora da régua de inadimplência.** Está marcada para 6h17 (UTC), que
   é 3h17 da manhã no Brasil. Mudar é uma linha no schema.
3. **A régua nova de desbloqueio dos instrumentos.** Está assim:
   DISC abre com o autodiagnóstico; Clima com 1 trilha; Inteligência
   Emocional com 2; Âncoras com 4; Cultura com 6; Caráter com 8; Estilo de
   Liderança com 10. Qualquer número desses muda em uma linha
   (`TEST_GATES`, dentro do arquivo do app).
