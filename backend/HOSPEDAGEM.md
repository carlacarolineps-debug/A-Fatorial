# Onde subir isso

Levantado em **11 de agosto de 2026**, com a KingHost e a Hostinger na
comparação porque ela pediu.

> **Preço de hospedagem muda toda semana, e o site da empresa é a única
> fonte que vale.** Os números aqui vieram de busca e de comparativos de
> terceiros, não do checkout. Confira no ato da compra, principalmente o
> **preço de renovação**, que é onde mora a pegadinha.

---

## Antes de comparar: são dois trabalhos diferentes

Confundir os dois é o que faz a escolha dar errado, e é exatamente o erro
que a hospedagem compartilhada barata provoca.

| | O que é | Precisa de |
|---|---|---|
| **Servir o arquivo** | `Grupo A! Fatorial.html`, 2,3 MB de HTML estático | HTTPS, domínio, banda |
| **Rodar o servidor** | `backend/`, o webhook do WhatsApp e a IA | processo sempre acordado, Node ≥18, disco para gravar |

O site sozinho não precisa de servidor. O atendente automático não existe
sem ele. **Dá para começar só com o primeiro, e é o que eu faria.**

O que o `backend/` exige, em concreto:

- **Node 18 ou mais.** Express, cors e dotenv, só isso.
- **Processo que não dorme.** Se o servidor está adormecido quando o
  cliente manda mensagem, a Meta tenta entregar, falha, e a mensagem some.
  Não é lentidão, é conversa perdida.
- **Disco com permissão de escrita.** Documentos, currículos e o estado da
  equipe são gravados em arquivo, em `backend/dados/`. Currículo vai a 6 MB
  cada e fica guardado 365 dias.
- **HTTPS com certificado válido e domínio próprio.** A Meta não aceita
  webhook sem isso.

---

## 1. Servir o arquivo

| Serviço | Preço | Banda | Uso comercial | Pega |
|---|---|---|---|---|
| **Cloudflare Pages** | **grátis** | **ilimitada** | **permitido** | 500 builds por mês |
| Netlify | grátis | 100 GB por mês | permitido | excedente caro |
| GitHub Pages | grátis | ~100 GB por mês | permitido | **repositório precisa ser público** |
| Vercel Hobby | grátis | 100 GB | **proibido** | o Pro é US$ 20 por mês |
| Compartilhada KingHost / Hostinger | R$ 10 a R$ 30 por mês | limitada | permitido | **você paga por algo que a Cloudflare dá** |

**Cloudflare Pages**, sem concorrência. Banda ilimitada, uso comercial
permitido, sem cartão. Nenhum concorrente grande faz igual em 2026.

**GitHub Pages** só serve com o repositório público. O seu é privado e tem
dado de cliente dentro, então está fora.

**Não compre hospedagem compartilhada para isso.** É a compra mais comum e
a mais desnecessária: você pagaria de R$ 120 a R$ 360 por ano por um
serviço pior do que o gratuito.

---

## 2. Rodar o servidor

Aqui está a decisão de verdade.

| Opção | Promoção | Renovação | Máquina | Onde | Roda o `backend/`? |
|---|---|---|---|---|---|
| **Hostinger compartilhada** | R$ 10 a R$ 25 por mês | dobra | compartilhada | São Paulo | **não.** Sem Node, sem root |
| **KingHost Node.js gerenciado** | a partir de R$ 14,45 por mês | a confirmar | gerenciada | São Paulo | **provavelmente sim, confirmar** |
| **KingHost VPS entrada** | ~R$ 27,90 por mês | ~R$ 55 a 60 | 1 vCPU, 1 GB, 50 GB | São Paulo | sim, com 1 GB apertado |
| **Hostinger VPS KVM 1** | ~R$ 29,99 por mês | ~R$ 59,99 | 1 vCPU, **4 GB**, 50 GB NVMe | São Paulo | sim, folgado |
| **Oracle Always Free** | grátis | grátis | 2 OCPU, 12 GB | fora | sim, **com o risco abaixo** |

### O aviso da Oracle, e ele é de agora

A versão anterior deste documento recomendava a Oracle Always Free. **Essa
recomendação caiu.**

Em junho de 2026 a Oracle cortou o plano gratuito ARM de 4 núcleos e 24 GB
para **2 núcleos e 12 GB**, sem anúncio, sem post no blog e sem avisar
cliente nenhum. A documentação mudou calada. O prazo de aplicação é **18 de
agosto de 2026**, daqui a uma semana, e **instância que passar do novo teto
é desligada automaticamente**.

Tecnicamente 2 núcleos e 12 GB continuam sobrando para o `backend/`. O
problema não é o tamanho: é o que o episódio ensina. Um fornecedor que
corta pela metade sem avisar e desliga máquina sozinho não é onde ficam o
webhook do WhatsApp e os documentos dos seus clientes.

### Hostinger

**A favor:** 4 GB de RAM por ~R$ 30, que é o dobro do que a KingHost
entrega pelo mesmo preço. Datacenter em São Paulo desde 2022. Painel fácil,
imagem pronta com Node já instalado.

**Contra:** o preço de R$ 29,99 exige **contrato de 24 meses pago à
vista**, cerca de R$ 720 de uma vez. A renovação vai a R$ 59,99, o dobro. A
empresa é lituana, e a questão da nota fiscal para o seu CNPJ precisa ser
confirmada antes, não depois.

**A hospedagem compartilhada da Hostinger não roda Node.** Ela não dá
acesso root, e sem root não sobe aplicação Node. Se você comprar o plano de
site achando que resolve o servidor, não resolve. Essa é a armadilha
principal desta página.

### KingHost

**A favor:** empresa brasileira, do grupo Locaweb. Cobrança em real, nota
fiscal sem discussão, suporte 24 horas em português e datacenter em São
Paulo. Para uma consultoria com CNPJ e clientes grandes, isso vale mais do
que os 3 GB de RAM a menos.

E tem uma coisa que a Hostinger não tem: **plano Node.js gerenciado**, a
partir de R$ 14,45 por mês. Se ele atender, você não administra servidor
nenhum, e esse é o maior custo escondido de toda esta página.

**Contra:** a VPS de entrada tem **1 GB de RAM**, apertado para Node mais o
atendente de IA. Suba um degrau. A renovação também mais que dobra. E o
preço da VPS aparece como R$ 22, R$ 27,90, R$ 29 e R$ 53 dependendo da
página que você abre, o que quer dizer que só o checkout diz a verdade.

---

## As três perguntas que decidem entre o gerenciado e a VPS

Antes de comprar, ligue para a KingHost e pergunte, sobre o **plano Node.js**:

1. **A aplicação fica no ar o tempo todo, ou dorme sem acesso?** Precisa
   ficar acordada: é webhook do WhatsApp, e dormindo a mensagem some.
2. **A aplicação pode gravar arquivo no disco dela?** Preciso guardar
   documentos e currículos de até 6 MB, não só ler.
3. **Posso apontar meu domínio próprio com HTTPS?** A Meta não aceita
   webhook sem certificado válido em domínio meu.

**Três sim: pegue o gerenciado.** É metade do preço e zero administração.
**Um não que seja: vá de VPS**, e aí a comparação passa a ser Hostinger
contra KingHost.

---

## 3. Domínio

**Registre direto no [registro.br](https://registro.br), não na
hospedagem.** São **R$ 40 por ano, fixos**, no registro e na renovação, sem
promoção de primeiro ano que explode no segundo. Toda empresa que vende
`.com.br` compra do registro.br e revende com margem.

Registrar fora da hospedagem também te deixa trocar de fornecedor sem pedir
liberação para ninguém.

---

## 4. Banco de dados

**Hoje você não precisa de um.** O `backend/` grava em arquivo, e para o
volume de uma consultoria isso resolve por bastante tempo.

O que você precisa é **backup da pasta `backend/dados/`**. Numa VPS isso é
obrigação sua, e ninguém faz por você. É o item que mais some das listas de
hospedagem e o único cuja falta custa dado de cliente.

---

## O que eu faria, na ordem

1. **Agora, R$ 40 por ano:** domínio no registro.br apontando para
   **Cloudflare Pages** com o `Grupo A! Fatorial.html`. Meia hora de
   trabalho, e o site e o sistema entram no ar. Nada aqui depende do
   servidor.
2. **Quando quiser o atendente de WhatsApp:** ligue para a KingHost com as
   três perguntas acima. Gerenciado se der, VPS se não der.
3. **Se for VPS:** Hostinger entrega mais máquina pelo mesmo dinheiro,
   KingHost entrega mais tranquilidade fiscal e de suporte. Para o seu
   caso, sem ninguém de TI, a tranquilidade vale mais.
4. **Banco de dados só quando doer.** Trocar depois é mais fácil do que
   administrar cedo demais.

---

## O aviso que não é sobre hospedagem

O sistema guarda os dados no **navegador de quem abre** (localStorage). Isso
não muda com a hospedagem: se você abrir no seu computador e a Karen abrir
no dela, são **duas bases diferentes**, e nenhuma sabe da outra.

Enquanto for você usando, funciona. No dia em que a equipe entrar junto, o
dado precisa sair do navegador e ir para o servidor. O caminho já está
começado (o `backend/` tem contas de equipe e `dados/estado.json`), mas é
trabalho de verdade, não configuração.

**Esse é o limite real do sistema hoje, e ele é de arquitetura, não de onde
o arquivo está guardado. Nenhuma escolha desta página resolve isso.**
