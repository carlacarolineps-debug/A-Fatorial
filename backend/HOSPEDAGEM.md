# Onde hospedar

Levantado em agosto de 2026. Preço e limite de plano grátis mudam sem aviso:
confira antes de decidir, principalmente a parte da Vercel e da Meta.

## Antes de comparar: são dois trabalhos diferentes

Confundir os dois é o que faz a escolha dar errado.

| | O que é | Precisa de |
|---|---|---|
| **Servir o arquivo** | `Grupo A! Fatorial.html`, 2,1 MB de HTML estático | HTTPS, domínio próprio, banda |
| **Rodar o servidor** | `backend/`, o webhook do WhatsApp e a IA | processo sempre acordado, Node, disco |

O site sozinho não precisa de servidor. O atendente automático não funciona
sem ele. Dá para começar só com o primeiro.

---

## 1. Servir o arquivo

Conta de banda que importa aqui: o arquivo tem **2,1 MB**. Cada abertura da
página baixa isso (na segunda vez o navegador usa o cache).

| Serviço | Aceita empresa no grátis? | Banda | Pega |
|---|---|---|---|
| **Cloudflare Pages** | **sim** | **ilimitada** | 500 builds por mês, 100 domínios |
| Netlify | sim | 100 GB por mês | passou disso, ~US$ 55 por 100 GB |
| GitHub Pages | sim | ~100 GB por mês | o repositório precisa ser público |
| Vercel Hobby | **não** | 100 GB | **proíbe uso comercial** |

**Cloudflare Pages** é a escolha. Banda ilimitada no grátis não é promoção de
lançamento: é como eles vendem, e nenhum concorrente grande faz igual em 2026.

Em número: no Netlify, 100 GB dão cerca de **47 mil aberturas por mês** deste
arquivo. É bastante, mas é um teto que existe, e o excedente é caro. Na
Cloudflare não há teto.

**A Vercel está fora, e não é por limite técnico.** O plano Hobby proíbe uso
comercial, e a definição deles é ampla: vale para site que vende, que tem
anúncio, que aceita doação, ou que foi feito por alguém pago para fazer. O seu
é os três primeiros casos. Para usar Vercel legalmente seria o Pro, US$ 20 por
mês. Ela é ótima, mas nesse cenário deixa de competir com uma opção gratuita.

**GitHub Pages** só serve se você aceitar o repositório público. Hoje o seu é
privado, e o sistema tem dado de cliente dentro.

---

## 2. Rodar o servidor

Aqui a exigência muda de figura: **webhook não pode dormir**. Se o servidor
está adormecido quando o cliente manda mensagem, a Meta tenta entregar, falha,
e o atendimento não acontece. Não é lentidão, é mensagem perdida.

| Serviço | Sempre acordado? | Grátis de verdade? | Pega |
|---|---|---|---|
| **Oracle Cloud Always Free** | **sim** | **sim, sem prazo** | é uma máquina: você administra |
| Cloudflare Workers | sim | sim, 100 mil req/dia | **não roda Node**: exige reescrever o backend |
| Render Free | **não**, dorme em 15 min parado | sim | dormindo, perde webhook |
| Supabase Edge Functions | pausa em 7 dias sem uso | sim | Deno, não Node |
| Fly.io | sim | não mais | cobra por uso desde 2024 |
| Railway | sim | não | só crédito de teste |

**Oracle Cloud Always Free** é a recomendação: 4 núcleos ARM e 24 GB de RAM,
sem prazo de validade, com acesso root. Roda o `backend/` que já existe sem
mudar uma linha, e sobra máquina para muito mais do que isso.

O custo dela não é dinheiro, é atenção: é um servidor Linux de verdade, e
alguém precisa atualizar, configurar o HTTPS e reiniciar quando cair. Umas duas
horas para subir a primeira vez, e depois quase nada.

**Cloudflare Workers** seria mais simples de manter (não existe máquina para
administrar), mas não roda Express: o `server.js` teria de ser reescrito. Vale
considerar se o backend crescer e a manutenção da máquina incomodar.

**Render** aparece em toda lista de "hospedagem grátis" e é a armadilha mais
comum deste caso: dorme depois de 15 minutos parado. Para um site, o visitante
espera 30 segundos e pronto. Para um webhook, a mensagem some.

---

## 3. Banco de dados

**Hoje você não precisa de um.** O `backend/` grava em arquivo, dentro de
`backend/dados/`, e numa máquina Oracle isso funciona bem para o volume de uma
consultoria. Fazer backup dessa pasta é a única obrigação.

Quando precisar (equipe grande, acesso de vários lugares, relatório histórico):

| Serviço | Grátis | Pega |
|---|---|---|
| Supabase | 500 MB de Postgres | **pausa depois de 7 dias sem nenhuma consulta** |
| Neon | Postgres com escala a zero | acorda sozinho, mas a primeira consulta demora |

A pausa do Supabase assusta menos do que parece **se o atendente estiver
rodando**: qualquer conversa no WhatsApp já é consulta, e o relógio de 7 dias
zera sozinho. Ela morde quem usa de vez em quando. Se for o caso, um ping
diário de um cron externo resolve.

---

## O que eu faria, na ordem

1. **Cloudflare Pages** com o `Grupo A! Fatorial.html`, apontando
   `grupoafatorial.com.br`. Grátis, sem teto de banda, meia hora de trabalho.
   Isso já coloca o site e o sistema no ar.
2. Só depois, **Oracle Always Free** para o `backend/`, quando você quiser o
   atendente automático e o lead caindo no funil. Até lá o sistema funciona no
   navegador e o WhatsApp funciona por link direto.
3. **Banco de dados só quando doer.** Arquivo em disco resolve por bastante
   tempo, e trocar depois é mais fácil do que administrar cedo demais.

---

## O aviso que não é sobre hospedagem

O sistema inteiro guarda os dados no **navegador de quem abre** (localStorage).
Isso não muda com a hospedagem: se você abrir no seu computador e a Karen
abrir no dela, são **duas bases diferentes**, e nenhuma das duas sabe da outra.

Enquanto for você usando, funciona. No dia em que a equipe entrar junto, o dado
precisa sair do navegador e ir para o servidor. O caminho já está começado (o
`backend/` tem contas de equipe e `dados/estado.json`), mas é trabalho de
verdade, não configuração.

**Esse é o limite real do sistema hoje, e ele é de arquitetura, não de onde o
arquivo está guardado.** Nenhuma escolha desta página resolve isso.
