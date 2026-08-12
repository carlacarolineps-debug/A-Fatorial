# Onde subir isso

Levantado em **11 de agosto de 2026**, e refeito depois que ela decidiu
**adiar a API oficial da Meta**. Essa decisão muda a escolha, então ela
está no topo e não numa nota de rodapé.

> **Preço de hospedagem muda toda semana, e o checkout é a única fonte que
> vale.** Os números vieram de busca e de comparativo de terceiro. Confira
> na hora de comprar, principalmente o **preço de renovação**.

---

## O que mudou com a decisão de adiar a Meta

A versão anterior girava em torno de uma exigência: **webhook não pode
dormir**. Se o servidor está adormecido quando o cliente manda mensagem no
WhatsApp, a Meta tenta entregar, falha, e a conversa some.

**Sem a API oficial, essa exigência não existe.** A saída pelo WhatsApp
passa a ser link `wa.me` que alguém clica, e link não precisa de servidor
acordado. Isso derruba a parte cara da conta e abre opções que antes
estavam descartadas.

O que sobra para o servidor fazer:

| O que | Quem vê | Aguenta o servidor demorar para acordar? |
|---|---|---|
| `/lead`, o diagnóstico do site | ninguém, é gravação de fundo | **sim** |
| **Documento e portal do cliente** | **o cliente, clicando no link** | **mal.** É a cara da empresa |
| Currículo, envio e leitura | candidato e você | sim |
| Contas de equipe, base compartilhada | você e a equipe | sim |
| Governança e auditoria | você | sim |
| Varredura de obrigação e prazo de currículo | ninguém | precisa acordar de vez em quando |

**Só uma coisa exige velocidade: o link de documento que o cliente abre.**
Você manda para um cliente grande e ele espera 30 segundos numa tela
branca. Isso descarta plano que hiberna fundo, tipo o Render gratuito.

A varredura é o outro detalhe. Ela roda a cada 15 minutos e faz duas
coisas: dispara obrigação vencida e **apaga currículo que passou de 365
dias**, que é obrigação de LGPD. Servidor que nunca acorda nunca apaga.
Precisa acordar pelo menos uma vez por dia.

---

## 1. Servir o arquivo

| Serviço | Preço | Banda | Uso comercial |
|---|---|---|---|
| **Cloudflare Pages** | **grátis** | **ilimitada** | **permitido** |
| Netlify | grátis | 100 GB por mês | permitido |
| GitHub Pages | grátis | ~100 GB por mês | **exige repositório público** |
| Vercel Hobby | grátis | 100 GB | **proibido** |
| Compartilhada KingHost / Hostinger | R$ 10 a 30 por mês | limitada | permitido |

**Cloudflare Pages**, sem discussão. **Não compre hospedagem compartilhada
para isso:** você pagaria de R$ 120 a R$ 360 por ano por algo pior do que o
gratuito.

---

## 2. Rodar o servidor

| Opção | Promoção | Renovação | Máquina | Serve agora? |
|---|---|---|---|---|
| Hostinger **compartilhada** | R$ 10 a 25 | dobra | compartilhada | **não. Sem root, sem Node** |
| **KingHost Node.js gerenciado** | **R$ 14,45** | conferir | gerenciada | **sim, é a recomendação** |
| KingHost VPS entrada | ~R$ 27,90 | ~R$ 55 a 60 | 1 vCPU, 1 GB | sim, apertado |
| Hostinger VPS KVM 1 | ~R$ 29,99 | ~R$ 59,99 | 1 vCPU, 4 GB | sim, e você vira administrador |
| Render gratuito | grátis | grátis | dorme em 15 min | **não.** Cliente esperando 30s |
| Oracle Always Free | grátis | grátis | 2 OCPU, 12 GB | tecnicamente sim, veja o aviso |

### Por que o gerenciado da KingHost passou para a frente

Enquanto existia webhook, plano gerenciado era arriscado: se a aplicação
hiberna, a mensagem some. **Sem webhook, esse risco sai**, e o que sobra é
uma lista de vantagens que valem mais do que RAM:

- **R$ 14,45 por mês**, metade de qualquer VPS
- **Você não administra servidor nenhum.** Esse é o maior custo escondido
  de toda esta página, e ele não aparece em tabela de preço
- Empresa brasileira, grupo Locaweb. Real, nota fiscal, suporte em
  português 24 horas, datacenter em São Paulo
- SSL Let's Encrypt já ligado

### O aviso da Oracle

A primeira versão deste documento recomendava Oracle Always Free. **Caiu.**
Em junho de 2026 a Oracle cortou o plano ARM gratuito de 4 núcleos e 24 GB
para 2 e 12, sem anúncio nenhum, com aplicação em **18 de agosto de 2026** e
**desligamento automático de quem passar do teto**. Tecnicamente 2 e 12
ainda sobram. O problema é o que isso ensina sobre o fornecedor.

### Hostinger, se for de VPS

Dá 4 GB por ~R$ 30, o dobro da KingHost pelo mesmo preço, com datacenter em
São Paulo. Mas o preço promocional exige **contrato de 24 meses pago à
vista, cerca de R$ 720 de uma vez**, a renovação dobra, a empresa é lituana
e a nota fiscal para o seu CNPJ precisa ser confirmada antes.

E de novo, porque é a armadilha mais cara desta página: **a hospedagem
compartilhada da Hostinger não roda Node.** Sem root, sem aplicação Node.

---

## As quatro perguntas antes de comprar

Ligue para a KingHost e pergunte, sobre o **plano Node.js**:

1. **A aplicação fica no ar o tempo todo, ou hiberna sem acesso?** Se
   hiberna, em quanto tempo ela responde a primeira visita? Mais de 5
   segundos é ruim: é o cliente abrindo o documento.
2. **A aplicação pode gravar arquivo no disco dela?** Documento e currículo
   de até 6 MB, não só leitura.
3. **Posso apontar meu domínio próprio com HTTPS?**
4. **Quanto de disco vem?** Currículo ocupa: 100 candidatos por ano dão uns
   600 MB, e ficam guardados 365 dias.

**Quatro sim: pegue o gerenciado, R$ 14,45.**
**Um não que seja: vá de VPS**, e aí é Hostinger por máquina ou KingHost
por tranquilidade.

---

## 3. Domínio

**Registre direto no [registro.br](https://registro.br): R$ 40 por ano,
fixos**, no registro e na renovação, sem promoção que explode no segundo
ano. Registrar fora da hospedagem também deixa você trocar de fornecedor
sem pedir liberação para ninguém.

---

## A conta fechada

| | Por ano | Por mês |
|---|---|---|
| Domínio no registro.br | R$ 40 | R$ 3,33 |
| Cloudflare Pages | R$ 0 | R$ 0 |
| KingHost Node.js gerenciado | R$ 173 | R$ 14,45 |
| **Total** | **R$ 213** | **R$ 17,78** |

Pelo caminho da VPS Hostinger seria R$ 400 no primeiro ano e R$ 760 na
renovação, com R$ 720 pagos à vista na entrada.

**Só o site, sem servidor: R$ 40 por ano.** O sistema funciona, o
diagnóstico funciona, o documento imprime local com aviso. Some o registro
do lead e a entrega de documento online.

---

## 4. Backup

**Numa VPS o backup é seu, e ninguém faz por você.** A pasta
`backend/dados/` tem documento de cliente, currículo e o estado da equipe.
É o item que mais some das listas de hospedagem e o único cuja falta custa
dado de cliente.

No plano gerenciado da KingHost o backup entra no serviço. Pergunte a
frequência e por quantos dias eles guardam.

---

## O que eu faria, na ordem

1. **Hoje, R$ 40 no ano:** domínio no registro.br apontando para
   **Cloudflare Pages**. Site e sistema no ar em meia hora.
2. **Ligue para a KingHost** com as quatro perguntas. Passando, R$ 14,45
   por mês resolve documento online, currículo, equipe junta e captura de
   lead, sem administrar servidor.
3. **Não compre VPS antes de fazer essas quatro perguntas.** É o dobro do
   preço e traz um servidor Linux para a sua vida.
4. **API da Meta só quando doer.** Muda uma função no código. Nada do que
   for feito agora vira retrabalho.

---

## O aviso que não é sobre hospedagem

O sistema guarda os dados no **navegador de quem abre** (localStorage). Se
você abrir no seu computador e a Karen no dela, são **duas bases
diferentes**, e nenhuma sabe da outra.

Enquanto for você usando, funciona. No dia em que a equipe entrar junto, o
dado precisa sair do navegador e ir para o servidor. O caminho já está
começado (o `backend/` tem contas de equipe e `dados/estado.json`), mas é
trabalho de verdade, não configuração.

**Esse é o limite real do sistema hoje, e ele é de arquitetura, não de onde
o arquivo está guardado. Nenhuma escolha desta página resolve isso.**
