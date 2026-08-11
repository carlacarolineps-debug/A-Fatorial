# AuLar — o projeto por trás do sistema

Documento de estratégia. O sistema em si está em `index.html` (abra no navegador).
Aqui está o raciocínio: o que o mercado mostrou, o que eu mudaria no seu plano
original e por quê, as 18 formas de ganhar dinheiro, a arquitetura de
credibilidade do Fundo de Impacto e o caminho do ABC até o Brasil.

---

## 1. O que a pesquisa mostrou (e o que isso muda no plano)

### O mercado é grande, mas o dinheiro não está onde parece

| Número | Fonte |
|---|---|
| R$ 81,2 bi de faturamento previsto para o setor pet em 2026 | [Abempet / Times Brasil](https://timesbrasil.com.br/empresas-e-negocios/mercado-pet-brasileiro-deve-bater-recorde-de-faturamento-em-2026/) |
| 166,8 milhões de pets no Brasil; 62,5 milhões são cães | [Luvet — Estatísticas 2026](https://www.luvet.com.br/estatisticas-mercado-pet) |
| ~4,8 milhões de cães e gatos em situação de vulnerabilidade | [Instituto Pet Brasil via CNN](https://www.cnnbrasil.com.br/nacional/brasil-tem-quase-185-mil-animais-resgatados-por-ongs-diz-instituto/) |
| 201 mil animais sob tutela de ONGs e protetores independentes | Instituto Pet Brasil |
| Pouco mais de **400 ONGs** formais monitoradas — 45% no Sudeste | Instituto Pet Brasil |

**A conta incômoda:** 400 ONGs formais. Se todas pagassem R$ 100/mês, o teto
seria R$ 40 mil/mês — e nenhuma plataforma converte 100% de um mercado. Além
disso, **[4Pets.app](https://4pets.app/ong-animais) e
[AutoPet](https://www.autopet.com.br/projeto-ajude-um-pouco.html) já oferecem
gestão gratuita para ONGs no Brasil**, e a americana Petstablished é grátis
também. Cobrar mensalidade de ONG é vender para quem não tem caixa, competindo
com quem não cobra nada.

**Conclusão que muda o desenho do negócio:** a mensalidade deve existir (está
implementada exatamente como você pediu), mas ela é a *menor* das receitas. O
dinheiro de verdade está no movimento que a plataforma cria — doação, adoção,
tutor, comércio local, empresa e prefeitura. As 18 fontes da seção 4 seguem essa
lógica: **14 delas não dependem de nenhuma ONG pagar nada.**

### O "Tinder de pets" já existe — e é por isso que ele não basta

[PetPonto](https://olhardigital.com.br/2021/09/08/internet-e-redes-sociais/tinder-dos-pets-conheca-o-petponto-app-de-adocao-de-animais/),
DeuPetch e Na.Mosca já fazem swipe com geolocalização. Copiar isso é entrar num
espaço ocupado sem nada novo.

O que nenhum deles resolve: **o animal que volta**. A literatura sobre adoção
mostra que taxas de devolução caem quando a triagem é feita com calma e sobem
quando o processo é apressado ou idealizado. Swipe puro acelera o "quero" e não
acelera o "consigo".

Por isso o AuLar tem swipe **com nota de compatibilidade calculada** (arquivo
`js/03-match.js`): 13 perguntas sobre espaço, horas sozinho, energia disponível,
convivência, experiência e orçamento, cruzadas com sete atributos do animal. A
nota nunca esconde ninguém — ela ordena a fila e diz, em português, o que vai
dar trabalho: *"ele sofre depois de ~4h sozinho, e você fica fora 9h"*. Um
"não" informado hoje vale mais do que uma devolução em 60 dias.

### Pix Automático é a virada para doação recorrente

A [Resolução BCB nº 505/2025](https://blog.asaas.com/pix-automatico/) tornou
obrigatório o Pix Automático para débitos recorrentes com recebedor pessoa
jurídica, com adequação dos contratos até 1º de janeiro de 2026. Na prática:
**doação mensal sem cartão de crédito**, autorizada uma única vez.

Isso importa mais para ONG do que para qualquer outro setor: o doador típico de
protetor de animais não tem cartão de crédito com limite sobrando, e a doação
via cartão morre quando o cartão vence. O AuLar já oferece Pix Automático como
opção padrão para doação recorrente e apadrinhamento.

### O que a lei exige (e vira funcionalidade)

- **RGA** é obrigatório em São Paulo capital para cães e gatos acima de 3 meses,
  e o **microchip é exigido para animal comercializado ou doado**
  ([Prefeitura de SP](https://prefeitura.sp.gov.br/web/saude/w/saude_e_protecao_ao_animal_domestico/272497)).
  Campos de RGA e microchip estão no cadastro e entram automaticamente no termo
  de adoção.
- **Art. 32 da Lei 9.605/1998** (maus-tratos) está citado no termo gerado.
- **LGPD (Lei 13.709/2018)**: consentimento explícito no cadastro, CPF exibido
  mascarado nas telas, exportação completa dos dados em um clique e aviso de
  15 dias antes de qualquer remoção por inadimplência.

### O ABC já tem política pública — e ela é o seu ímã de público

Santo André realiza a feira **"Eu amo, eu adoto"** no último domingo do mês no
Parque Central, opera o **Castramóvel** com cerca de 400 castrações gratuitas por
mês e [digitalizou o agendamento de castração](https://web.santoandre.sp.gov.br/portal/noticias/0/3/18918/santo-andre-digitaliza-agendamento-de-castracao-gratuita-de-caes-e-gatos).
Mauá oferece castração gratuita aos domingos.

Esses eventos **já reúnem, presencialmente, exatamente o público que você quer**.
A agenda pública do AuLar nasce semeada com eles: é conteúdo útil desde o
primeiro dia, antes mesmo de a vitrine estar cheia — e é a porta de entrada
natural para o contrato com a prefeitura (seção 4, fonte 9).

---

## 2. O que eu mudaria no que você pediu

Três pontos. Tudo está implementado como você pediu; estas são recomendações,
com o botão para mudar dentro do sistema.

### a) O bloqueio no dia seguinte: preserve a vitrine dos animais

Você pediu: *não pagou no dia, bloqueia*. Está implementado, com o dia da
carência configurável.

O que eu recomendo, e que é o **padrão de fábrica**: bloquear a **gestão**
imediatamente (cadastrar, editar, relatório, exportação — tudo trava e a ONG
não consegue operar) mas manter no ar, por 30 dias, as **páginas dos animais já
publicados**.

Motivo prático: derrubar a vitrine tira do ar um cão que pode estar a um clique
da adoção. Se isso acontecer uma vez, a história vira post — *"a plataforma
sumiu com meus cães porque atrasei R$ 39"* — e o custo dessa frase é maior do
que a mensalidade de qualquer ONG. A pressão para pagar continua inteira, porque
sem o sistema a ONG não consegue trabalhar.

Em **Plataforma → Cobrança → Modo de bloqueio** há a opção "bloqueio total". A
decisão é sua e muda em um clique.

### b) Carência de 3 dias em vez de zero

Boleto compensa em até 3 dias úteis e Pix agendado às vezes cai no dia seguinte.
Bloquear quem já pagou gera atrito, mensagem no WhatsApp e pedido de desculpas —
e você perde mais tempo com isso do que ganha com um dia a mais de pressão.
Está configurável no mesmo lugar; hoje vem com zero, como você pediu.

### c) O plano grátis não é caridade, é aquisição

O plano **Semente** (até 15 animais, R$ 0) existe por cálculo. Vitrine cheia é o
que traz adotante; adotante é o que traz doação; doação é o que gera a taxa; e a
taxa não depende de ONG nenhuma pagar assinatura. Uma ONG pequena que entra de
graça e cresce bate no limite de 15 animais sozinha — e aí a mudança de plano
acontece sem vendedor.

---

## 3. O que ninguém no mercado está fazendo (e o AuLar faz)

### Rede de proteção — a razão de ninguém sair depois de entrar

Quem revende filhote ou maltrata **não volta na mesma ONG**: vai na próxima, na
cidade vizinha, que não tem como saber. Hoje isso circula em print de WhatsApp
entre protetoras, sem qualquer organização.

No AuLar, a ocorrência registrada por uma organização aparece como alerta para
todas as outras **no momento exato da triagem**, dentro da ficha do interessado.
Guarda apenas iniciais e CPF parcial, exige descrição do fato, permite que outra
ONG confirme (uma ocorrência confirmada por duas pesa diferente de uma isolada) e
é consultável pelo titular conforme o art. 18 da LGPD. Alerta não é veto: a
decisão continua sendo de cada ONG.

**Por que isso é o coração do negócio:** é a única funcionalidade que fica mais
valiosa a cada ONG que entra, e que a ONG perde inteira se sair. Software de
gestão se troca em um fim de semana. Rede, não.

### Lista de presentes em vez de "aceitamos doação de ração"

Ração doada solta chega em marca trocada, perto do vencimento, e alguém precisa
buscar. A ONG publica o que precisa (tipo lista de casamento), o doador compra no
pet shop parceiro e a entrega vai direto. Resolve o seu pedido de "receber doação
de ração" de um jeito que escala — e rende comissão.

### Tradução de impacto

Ninguém doa para "custo operacional". No AuLar, R$ 50 aparece como *"12 dias de
comida para um animal que está esperando"*, e a prestação de contas se monta
sozinha com os dados que já estão no sistema. Transparência aqui não é
burocracia: é o que faz o doador voltar no mês seguinte.

### Cartaz com QR para a feira

Um clique gera os cartazes de todos os animais que vão para a feira, cada um com
QR que abre o perfil completo. Quem passou na barraca e foi embora ainda
consegue ver a história do cão em casa — e demonstrar interesse dali.
(O gerador de QR é próprio, sem biblioteca externa; veja a seção 7.)

### Acompanhamento pós-adoção agendado sozinho

Contatos em 7, 30, 90 e 180 dias entram na agenda no instante em que a adoção é
concluída. Quase toda devolução acontece nos primeiros 90 dias, e quase sempre
por algo que uma conversa resolveria: xixi fora do lugar, latido, ciúme do gato.

### Foco no que ninguém quer

Filtros para "urgentes", "necessidade especial" e "esperando há mais de 6 meses",
e o apadrinhamento existe **para os que provavelmente nunca serão adotados**:
idosos, FIV+, com deficiência. É a resposta para o caso do Zeca da demonstração —
sete anos vendo quarenta cães saírem antes dele.

---

## 4. As 18 formas de ganhar dinheiro

As três primeiras são as que você já tinha em mente. As outras quinze saíram da
pesquisa e do desenho do Fundo (seção 4.1). Todas estão no sistema, em
**Plataforma → Monetização**, com simulador.

| # | Fonte | Quem paga | Modelo | Prazo |
|---|---|---|---|---|
| 1 | **Mensalidade das ONGs** | ONGs e protetores | R$ 0 / 39,90 / 99,90 / 399 por mês | já |
| 2 | **Taxa sobre doações** | doador (opcional) ou ONG | 3% a 5% por transação | já |
| 3 | **Apadrinhamento recorrente** | quem não pode adotar | R$ 20 a 80/mês por animal | já |
| 4 | **Lista de presentes** | doadores + pet shops | 8% sobre o valor | 90 dias |
| 5 | **Comissão de plano de saúde pet** | seguradoras | 15% a 30% da 1ª anuidade | 6 meses |
| 6 | **Kit adoção** | adotantes | R$ 90 a 180, margem dividida | 90 dias |
| 7 | **Vitrine patrocinada** | comércio local | R$ 149 a 490/mês | 90 dias |
| 8 | **Patrocínio corporativo e ESG** | empresas | R$ 6k a 60k/ano | 6 meses |
| 9 | **Contrato com prefeituras** | poder público | R$ 2k a 15k/mês | 12 meses |
| 10 | **Clube AuLar** | tutores | R$ 19,90/mês | 12 meses |
| 11 | **Rifas e vaquinhas** | comunidade | 6% sobre o arrecadado | 90 dias |
| 12 | **Focinho ID** | marca patrocinadora | patrocínio | 12 meses |
| 13 | **Academia AuLar** | protetores | R$ 197 por curso | 12 meses |
| 14 | **Troco solidário** | clientes do comércio | patrocínio + taxa | 12 meses |
| 15 | **Inteligência de mercado** | indústria pet | relatório trimestral | 18 meses |
| 16 | **Gestão do Fundo de Impacto** | doadores que não escolhem a ONG | 12% sobre o arrecadado | já |
| 17 | **Patrocínio da plataforma** | empresas | R$ 490 a 6.500/mês por cota | 90 dias |
| 18 | **Apoio de pessoas à plataforma** | quem gosta da ferramenta | a partir de R$ 9,90/mês | já |

### As quatro que eu colocaria acima da mensalidade

**5 — Plano de saúde pet.** A assinatura do termo de adoção é o momento de maior
intenção de compra da vida inteira de um tutor: ele acabou de levar um animal
para casa e está pensando exatamente em "e se ele adoecer?". Comissão de
seguradora é alta e o custo de aquisição, aqui, é zero.

**9 — Prefeituras.** Santo André, São Bernardo, São Caetano, Diadema e Mauá já
fazem feira de adoção, castramóvel e RGA — e controlam isso em planilha. Um
contrato municipal vale de 20 a 100 assinaturas de ONG, tem previsão
orçamentária e renova sozinho. É a receita mais difícil de conseguir e a mais
difícil de perder.

**10 — Clube AuLar.** Existem 400 ONGs no país e dezenas de milhões de tutores.
Carteirinha digital do pet, lembrete de vacina, teleorientação veterinária e
desconto na rede parceira, por R$ 19,90/mês. **É aqui que este negócio deixa de
ter teto.** Mil assinantes já superam toda a receita possível de mensalidade de
ONG no Brasil inteiro.

**2 — Taxa sobre doações, com a caixinha marcada.** O truque não é cobrar mais:
é deixar "quero cobrir a taxa" marcado por padrão. A maioria dos doadores
aceita, a ONG recebe 100% e você fatura sem tirar um centavo de ninguém que
precisa. Acima de 8% a ONG passa a pedir Pix direto e você perde a transação
inteira — o simulador mostra esse ponto.

---

## 4.1 Fundo de Impacto, Selo e Patrocínio — a arquitetura da credibilidade

Você pediu três coisas ao mesmo tempo: **dar visibilidade a quem leva a sério**,
**não tirar do doador a liberdade de escolher** e **ter receita para bancar o
seu trabalho**. As três cabem juntas, mas só se forem instrumentos **separados**.
Misturar é o jeito mais rápido de destruir exatamente a credibilidade que eles
existem para criar.

### Os três instrumentos, e por que nunca se encostam

| | Quem paga | Para onde vai | Como a tela chama |
|---|---|---|---|
| **Doação para uma ONG** | doador que já escolheu | 100% para a ONG (menos a taxa de serviço, que o doador pode cobrir) | "Doar" |
| **Fundo de Impacto** | doador que não sabe escolher | dividido entre as ONGs certificadas; 12% de gestão fica com a AuLar | "Doar ao Fundo" |
| **Patrocínio / Apoio** | empresa ou pessoa | 100% para a AuLar | "Apoiar a AuLar" — a palavra *doação* não aparece |

A regra que amarra tudo: **em nenhuma tela o dinheiro muda de dono sem o
usuário ser avisado antes, na mesma tela e no mesmo tamanho de letra.** Na tela
do Fundo, o doador vê "R$ 44,00 vão para as ONGs / R$ 6,00 ficam com a AuLar"
*antes* de confirmar. Na tela de apoio à plataforma, o aviso é ainda mais
direto: *"este valor não vai para os animais"*, com link para as outras duas
opções. Isso não é excesso de escrúpulo: é o que separa uma marca confiável de
uma denúncia no Procon.

### O Selo de Confiança é o ativo — a taxa é o troco

O Fundo rende 12% de gestão. Isso é pouco. O que ele **realmente** compra é
autoridade: **quem decide quais ONGs são sérias vira a referência do setor.** É
com quem a prefeitura conversa, é quem a marca procura para patrocinar, é quem a
imprensa liga quando quer falar de adoção. E é o que faz uma ONG querer estar na
plataforma mesmo quando não precisa do software.

O Selo é calculado ao vivo, sobre nove critérios que saem de dados que a ONG já
alimenta — nada é auto-declarado:

| Critério | Peso |
|---|---|
| Presta contas em público | 15 |
| Saúde dos animais em dia | 15 |
| Acompanha depois da adoção | 15 |
| Poucas devoluções | 12 |
| Responde quem demonstra interesse | 12 |
| Perfis completos e com história | 11 |
| Animais adultos castrados | 10 |
| Microchip e RGA | 5 |
| Tempo de estrada na plataforma | 5 |

Níveis: **Em avaliação** (< 40, não recebe do Fundo) → **Verificada** (40) →
**Confiança** (60) → **Referência** (80).

Uma decisão que parece contraintuitiva e é o coração da coisa: **o plano
contratado não vale um único ponto no Selo.** Uma ONG do plano gratuito pode ter
nota maior que uma do plano mais caro — e receber mais do Fundo por isso. No dia
em que pagar mensalidade melhorar a nota, a nota deixa de significar qualquer
coisa, e junto com ela vai embora o ativo inteiro. Há um teste automatizado que
falha se alguém mexer nisso.

Efeito colateral que vale ouro: o Selo faz as ONGs **quererem** publicar contas,
manter vacina em dia e acompanhar o pós-adoção — o que melhora os dados da
plataforma, que melhoram o match, que melhoram as adoções. Ele é, ao mesmo
tempo, o produto de marketing e o motor de qualidade.

### Como o Fundo divide

`60% pela necessidade` (animais sob cuidado) `+ 40% pelo mérito` (nota do Selo).

Só necessidade premiaria acumular animal. Só mérito concentraria tudo em duas ou
três ONGs grandes e organizadas, e o Fundo perderia o sentido. A regra fica
publicada e **não muda caso a caso** — no minuto em que houver exceção para uma
ONG amiga, o Selo vira favor e acabou.

### Patrocínio: a receita mais limpa que existe aqui

Três cotas mensais — **Apoiador R$ 490**, **Parceiro R$ 1.900**, **Mantenedor
R$ 6.500** — vendendo o que a empresa realmente precisa: visibilidade associada
a impacto e um relatório pronto para o balanço de sustentabilidade.

O detalhe que faz fechar mais rápido: **patrocínio não é filantropia, é
marketing.** Sai do orçamento de comunicação, não do de doação; tem nota fiscal
de serviço, contrato e contrapartida objetiva. Empresa aprova despesa de
marketing muito mais fácil do que doação — e ninguém precisa discutir se aquilo
era caridade.

### O que precisa estar resolvido antes do primeiro real

Aqui é onde eu preciso ser direta com você, porque é a única parte disso que
não se resolve com código:

1. **O Fundo não pode passar pela conta da empresa.** Uma S/A ou LTDA que recebe
   dinheiro "para animais" e redistribui está, na prática, administrando recurso
   de terceiro. Dois caminhos limpos, e você escolhe um:
   - **Escrow no PSP** (Asaas, Pagar.me): o dinheiro fica numa conta de
     pagamento e é dividido por *split* no dia do repasse. Nunca entra no seu
     caixa; só a taxa de 12% entra. É o caminho mais rápido.
   - **Instituto AuLar**, uma associação sem fins lucrativos separada da
     empresa, que administra o Fundo e contrata a plataforma como prestadora.
     Dá mais trabalho, abre porta para editais e doação dedutível, e é o que
     eu faria se o Fundo passar de uns R$ 20 mil por mês.
2. **Contrato de adesão com cada ONG**, autorizando a AuLar a receber em nome
   dela e descrevendo a regra de rateio. Sem isso, o repasse é informal e você
   fica exposta.
3. **A taxa precisa estar no contrato e na tela.** Já está na tela. Falta o
   contrato.
4. **"Apoio à plataforma" não é doação** e não gera recibo de doação. É receita
   da empresa, com nota fiscal de serviço. O sistema já separa esse registro dos
   demais justamente para o contador não misturar.
5. **Converse com o contador sobre a natureza da taxa de gestão** antes de
   transacionar. E fique de olho no *split payment* tributário do IBS/CBS, que
   entra em vigor gradualmente a partir de 2026 e muda como o imposto é retido
   em plataformas.

Nada disso é caro nem demorado. Mas se ficar para depois, trava o lançamento
exatamente no dia em que o dinheiro começar a entrar.

---

## 5. Do ABC para o Brasil

Adoção é mercado **local**: ninguém atravessa o estado para conhecer um cão. O
valor da plataforma é ter, na mesma cidade, várias ONGs, muitos lares
temporários e público suficiente para a vitrine parecer viva. **Uma praça densa
vale mais que vinte praças vazias.** Por isso a expansão é por praça, não por
estado — mas o cadastro já aceita as 27 unidades da federação desde o primeiro
dia.

**Roteiro de abertura de praça** (implementado em Plataforma → Expansão):

1. **ONG âncora.** A mais organizada da cidade entra de graça e vira referência.
   Ela traz as outras: protetor confia em protetor, não em vendedor.
2. **Agenda pública no ar.** Publicar as feiras e o castramóvel da prefeitura
   atrai público antes de existir vitrine cheia.
3. **Campanha de lar temporário.** Sem lar não há resgate. É o gargalo real e o
   que destrava o crescimento da praça.
4. **Comércio e prefeitura.** Com movimento comprovado, vende-se vitrine
   patrocinada para o comércio local e o contrato para o CCZ.

Ordem sugerida: **Grande ABC → São Paulo capital → Baixada Santista → Campinas**,
e só então outros estados, começando pelas capitais do Sudeste, onde estão 45%
das ONGs do país.

---

## 6. Como isso vira produção

A demonstração é um aplicativo de página única, sem build, com dados no
`localStorage` — de propósito: abre no navegador e funciona, inclusive numa
barraca de feira sem internet. Para virar produto de verdade:

| Camada | Escolha sugerida | Por quê |
|---|---|---|
| Banco e API | **Supabase** (Postgres + RLS) | multi-tenant com isolamento por linha; `ong_id` em toda tabela |
| Autenticação | Supabase Auth com papéis | adotante, ONG, plataforma — os três já existem no código |
| Pagamentos | **Asaas** ou **Pagar.me** | Pix Automático, split de pagamento e cartão recorrente no mesmo contrato |
| Arquivos | Supabase Storage | as fotos hoje viram base64; em produção vão para bucket com CDN |
| Mensagens | WhatsApp Business API | o Brasil resolve tudo por WhatsApp; hoje o sistema abre `wa.me` |
| Front | mesmo HTML/CSS/JS, ou React se a equipe crescer | a lógica de negócio (`03-match.js`, `04-billing.js`) migra sem mudança |
| Hospedagem | Vercel ou Netlify | o front é estático |

**Régua de cobrança em produção:** hoje ela roda no `boot` do navegador. Em
produção vira um `cron` diário que reavalia as assinaturas, dispara e-mail e
WhatsApp e grava a mudança de situação. A lógica inteira está isolada em
`aplicarRegua()` — muda o gatilho, não a regra.

**Split de pagamento:** com Asaas ou Pagar.me a doação já cai dividida — a parte
da ONG na conta dela, a sua taxa na sua conta, sem passar dinheiro de terceiro
pela sua conta. Isso importa fiscal e juridicamente: você é intermediário, não
depositário. (Atenção também ao *split payment* tributário do IBS/CBS, que entra
em vigor gradualmente a partir de 2026 — assunto para o contador antes do
primeiro real transacionado.)

**Antes de faturar o primeiro real:** contrato de intermediação com cada ONG,
termos de uso, política de privacidade, definição do papel de controlador e
operador na LGPD, e conversa com contador sobre a natureza da taxa sobre doação.
Nada disso é código, mas tudo isso trava o lançamento se ficar para depois.

---

## 6.1 Acesso simultâneo: o que já funciona e o que exige servidor

Você pediu que o portal suportasse várias pessoas ao mesmo tempo. Isso é, na
verdade, quatro problemas diferentes — e eles têm respostas diferentes.

| # | O problema | Onde se resolve |
|---|---|---|
| 1 | Cada pessoa com conta e permissão próprias | navegador — **feito** |
| 2 | Saber quem está online agora | navegador — **feito** |
| 3 | Duas janelas da mesma máquina se atualizando | navegador — **feito** |
| 4 | **Computadores diferentes** | **só com servidor** |

### 1 a 3 — resolvidos em `js/11-contas.js`

- **Contas de verdade**: e-mail, senha (SHA-256, conferido contra a
  implementação do Node) e papel dentro da organização. Quatro papéis —
  dono, gestor, voluntário e veterinário — cada um com um conjunto de telas.
  A permissão é checada **na entrada da tela**, no roteador, não só escondendo
  o item do menu.
- **Presença**: cada aba anuncia quem é e em que tela está, com pulso a cada
  12 segundos, e some sozinha 40 segundos depois de fechar. Os avatares
  aparecem na barra do topo.
- **Sincronização entre janelas**: `BroadcastChannel` avisa na hora, e o evento
  `storage` cobre navegadores que não têm o canal. Cada gravação incrementa uma
  revisão; quem recebe o aviso relê a base e redesenha a tela — sem F5.
- **Autoria**: toda atividade guarda quem a fez. Vira o histórico assinado em
  *Equipe e acessos*, que é o que responde "quem foi que marcou este animal
  como adotado?".

### 4 — a peça que só o servidor entrega

Dois navegadores em máquinas distintas não compartilham memória. Não existe
truque de JavaScript que resolva: precisa de um banco no meio. O arquivo
`servidor/schema.sql` é exatamente essa peça, e não é rascunho — **foi executado
contra um PostgreSQL 16 real**, com os testes descritos abaixo passando.

O que ele traz:

- **18 tabelas** cobrindo tudo que o sistema usa hoje.
- **58 políticas de RLS**. Toda tabela tem `organizacao_id` e uma política que
  só devolve as linhas da organização de que a pessoa participa. **O isolamento
  entre ONGs mora no banco, não no JavaScript** — se alguém abrir o console e
  tentar puxar dados de outra organização, o Postgres devolve zero linhas.
  Testado: a Carla vê os animais dela, o Marcos vê os dele e a vitrine pública,
  e a tentativa de escrever na organização alheia é recusada pelo banco.
- **Controle de edição simultânea**. Cada registro tem uma `versao`; se duas
  pessoas abrem o mesmo cadastro e a segunda salva com a versão velha, o banco
  levanta erro em vez de apagar o trabalho da primeira em silêncio. Testado:
  a segunda gravação recebe *"conflito: este registro foi alterado por outra
  pessoa"*.
- **Tempo real** via `supabase_realtime`, já filtrado pelo RLS — ninguém recebe
  evento de organização que não é dele.
- **O Selo calculado no banco** (`view selo_organizacoes`). Isso importa: a nota
  decide quanto cada ONG recebe do Fundo. Calculada no navegador, bastaria abrir
  o console para "melhorar" a própria nota.
- **A régua de cobrança como função** (`aplicar_regua`), para rodar num `cron`
  diário em vez de depender de alguém abrir o sistema. Testado: 45 dias de
  atraso deixaram a organização suspensa, como manda a regra.

### Para ligar isso

1. Criar um projeto no Supabase.
2. Colar `servidor/schema.sql` no SQL Editor e rodar.
3. Trocar a camada de persistência: onde hoje há `localStorage`, passa a haver
   chamada ao PostgREST. As regras de negócio — compatibilidade, protocolo
   vacinal, selo, régua — não mudam de forma; passam a rodar do lado seguro
   da porta.
4. Publicar o front em Vercel ou Netlify (é estático).

Custo estimado no começo: **zero**. O plano gratuito do Supabase e da Vercel
aguenta as primeiras ONGs com folga. A conta só aparece quando o volume
justificar.

---

## 7. Notas técnicas

**Gerador de QR Code próprio.** O cartaz do pet e o Pix copia-e-cola precisam de
QR, e adicionar biblioteca externa quebraria a promessa de abrir o arquivo sem
internet. O codificador está em `js/00-core.js`: modo byte, nível L, versões 1 a
9, com as 8 máscaras da norma avaliadas por penalidade (ISO/IEC 18004 §8.8).

Foi verificado, não só escrito: 314 conteúdos diferentes (de 1 a 230 bytes,
incluindo o BR Code real do Pix) × 8 máscaras = **2.512 símbolos, todos lidos
corretamente pelo decodificador ZXing**. As síndromes Reed-Solomon dão zero em
todos e a matriz de padrões fixos é idêntica à de uma implementação de
referência.

**Protocolo vacinal.** `js/02-vacinas.js` conhece o protocolo brasileiro para
cães (V10, antirrábica, gripe canina, giárdia, vermífugo, antipulgas) e gatos
(V4, antirrábica, FeLV, vermífugo, antipulgas), com as datas calculadas pela
idade e reforços encadeados. O sistema organiza; a prescrição continua sendo do
veterinário responsável.

**Site de divulgação.** `js/10-site.js` e `css/site.css`. A direção visual não é
"site de startup": é cartaz de rua — manchete pesada, ficha do bicho com fita
adesiva e carimbo. Os números exibidos saem da própria base, nunca inventados.
É a primeira tela de quem chega; quem já entrou uma vez vai direto ao portal.

**Testes.** A aplicação inteira é percorrida por um roteiro automatizado em
navegador real: **74 verificações** cobrindo o site de divulgação, os três
perfis, o swipe, o quiz, o cadastro de animal, a geração automática de vacinas,
o funil, o Fundo de Impacto (rateio, taxa e exclusão de não certificada), a
régua de cobrança com viagem no tempo, o login por senha, as permissões por
papel e — abrindo **duas janelas de verdade** — a presença e a sincronização
entre elas.

Além disso, o `servidor/schema.sql` é executado contra um PostgreSQL 16 real,
com testes de isolamento entre organizações e de conflito de edição simultânea.

---

## 8. O que eu faria nas primeiras semanas

1. **Escolher a ONG âncora do ABC** e colocar os animais dela no ar. Vitrine
   vazia não convence ninguém.
2. **Publicar a agenda das feiras e do castramóvel** de Santo André e Mauá. É
   conteúdo útil que já existe e não custa nada.
3. **Campanha de lar temporário**, com a mensagem certa: diga o que a pessoa
   *não* precisa fazer — não precisa adotar, não precisa pagar nada, não é para
   sempre.
4. **Ligar a taxa sobre doação com a caixinha marcada.** É a primeira receita a
   entrar, e não depende de convencer ninguém a assinar nada.
5. **Fechar a primeira parceria de pet shop** para a lista de presentes. Começa a
   resolver a ração e já testa o modelo de comissão.
6. **Bater na porta de uma prefeitura do ABC** com o sistema funcionando e a
   agenda deles já publicada. Chegar com a coisa pronta muda a conversa.
