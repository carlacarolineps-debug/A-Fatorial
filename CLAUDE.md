# A! Fatorial: orientações para o Claude

## Regra de entrega de arquivos HTML (SEMPRE)

Ao final de qualquer trabalho que gere ou atualize um produto em HTML, **enviar
sempre o arquivo `.html` para download** (via SendUserFile), nomeado com
**Nome + Data + Versão**, no formato:

    <Nome do Método> <DDMM>.<VV>

Exemplos: `O Método Bússola 2407.01`, `Operação Blindada 2407.01`.

- `DDMM` = dia e mês da entrega (ex.: 24/07 → `2407`).
- `VV` = versão sequencial daquele dia/produto, com dois dígitos (`.01`, `.02`, …).
- Incrementar a versão a cada nova entrega do mesmo produto.

## Regra de escrita: nunca usar travessão (SEMPRE)

A Carla não quer travessão em nenhum texto do produto: para ela, travessão
"mostra que é de IA". Isso vale para os dois caracteres longos (em-dash, U+2014,
e en-dash, U+2013), que não devem aparecer em lugar algum.
Em qualquer texto novo (interface, cartas,
relatórios, arquivos gerados, e-mails), use pontuação natural:

- dois-pontos quando o que vem depois explica, define ou enumera;
- vírgula quando é continuação da frase (antes de "e", "ou", "mas", "só", "não");
- parênteses para aparte ou lista dentro de uma frase que já tem dois-pontos;
- intervalos numéricos com hífen (`1-4`, `90-99,9%`);
- assinatura da autora em linha própria (`<br>Carla Caroline`), sem travessão.

O conversor usado na limpeza geral está em `tools/dedash.py` (aplica essas
regras sem mexer na indentação do código). Rode-o se algum travessão voltar.

## Produtos neste repositório

- `Operação Blindada 2807.01.html`: **PRODUTO PRINCIPAL** (unificado). A mentoria
  Operação Blindada (jornada externa: módulos de estratégia, governança, blindagem
  financeira, liderança; diagnóstico, testes profundos, PDCA, plano 30d, gamificação,
  login/sync Supabase) **+** o motor comportamental **A Bússola** integrado como aba
  nativa (170 cartas, diagnóstico comportamental com radar, sorteio inteligente e
  adaptativo, trilhas de padrão, relatório de ciclo, Termo de Blindagem, intenções de
  implementação, protocolo de recaída, fechamento de ciclo). Tese: *blinde o negócio por
  fora e o gestor por dentro*. Identidade "Cofre e Estrategista" (carbono/ouro/aço).
  Compromissos das cartas caem no Plano 30d; XP alimenta a gamificação existente.
  Base preservada do arquivo enviado pela Carla (`PORTAL_2007.02`).
- `baralho.html`: versão standalone do Método Bússola (identidade obsidiana/ouro),
  agora absorvida no produto unificado acima. Mantida como referência.
- `index.html`: Sistema de Gestão A! Fatorial (plataforma, tema gamer/neon).

### Sistema de design: material, escala e movimento (2807.01)
A Carla: "está muito pobre, parece que foi feito por um amador e não por
profissional, seja especialista em design irresistível".

**O diagnóstico:** o passe anterior tirou o excesso, mas deixou o app plano.
Faltava **material**. Os quatro erros de amador que estavam ali:
1. superfície sem luz: retângulo quase preto com um fio de 1px, sem elevação,
   sem direção de luz, sem textura;
2. **caixa-alta em tudo**: rótulo, botão, aba, estado, meta. Quando toda palavra
   é versalete espaçado, nada parece desenhado, parece template;
3. raio inconsistente: 2px na base antiga, 20px nos blocos novos;
4. número tímido: em um produto que mede, o número tinha 13px como qualquer
   outro texto.

**O que passou a valer:**
- **Elevação em três níveis** (`--e1/--e2/--e3`), sempre com luz de cima
  (`inset 0 1px 0 rgba(255,255,255,.05)`) e sombra funda em vez de borda dura.
- **Grão** sobre a tela inteira (SVG turbulence a 5%, `mix-blend-mode:soft-light`).
  É a única coisa que separa preto barato de carbono caro.
- **Raio único**: 12px em controle, 18px em cartão, 24px em bloco herói.
- **Ouro como material**: `--ouro` é um gradiente de quatro paradas, com
  brilho interno no topo do botão e sombra quente embaixo.
- **Caixa-alta só no rótulo de seção.** Botão, aba, pílula e estado viraram
  frase, com peso 600. Foi a mudança que mais tirou cara de template.
- **Número tabular** (`font-variant-numeric:tabular-nums`) em todo painel, e
  número grande onde ele é o assunto.
- **Movimento**: `cubic-bezier(.2,.8,.2,1)` em tudo, cartão que sobe 3px ao
  toque, botão que afunda 1,5%, seta que anda 4px, barra que preenche em 700ms,
  e entrada de tela em cascata (respeitando `prefers-reduced-motion`).

**Os momentos que ficaram irresistíveis:**
- **O cartão do treino de hoje** foi redesenhado do zero: cabeçalho com a letra
  do pilar em medalhão e a semana à direita, título em serifa de 29px, o tempo
  como **número grande** ao lado, `dt/dd` com o rótulo na cor do pilar, o CTA de
  ouro em frase com seta que anda, e um rodapé com **três pontos** (as sessões da
  semana) e o atalho para a semana.
- **O painel EMC** virou dashboard: três anéis grossos nas cores dos pilares com
  o número em serifa, o total em 38px e o **delta em verde** (`+46`) que é a
  razão de tudo existir.
- **O alvo do ano**: anel de 116px com 74% em serifa de 34px, e o de/para em
  ouro dentro da frase.
- A saudação virou nome e data em serifa, no lugar do rótulo de sistema.

**Corrigido de passagem:** a pílula "você está aqui" quebrava em cima da linha
no mapa de níveis; a medalha trancada mostrava uma caixinha falsa; as abas do
Plano quebravam em duas linhas (agora deslizam, em formato de pílula).

### Passe visual e resgate de vocabulário (2707.02)
A Carla: "está visualmente feio, preciso que agora trabalhe totalmente no visual
e se perdeu alguma coisa entre as edições, recupere".

**O diagnóstico:** o problema não era cor nem tipografia, era **caixa dentro de
caixa**. Toda seção era um cartão com moldura contendo outros cartões com
moldura: tudo com o mesmo peso, nada com hierarquia, e a página virava pilha.
A Home tinha 18 blocos empilhados e 5.437px de altura no celular.

**A regra que passou a valer:** um bloco de ouro por tela (a ação de agora),
seções separadas por **fio e rótulo** (`.sx`), listas com **linhas** (`.lista`,
`.linha`) e caixa só para item clicável. Nada foi removido do app: o que saiu de
uma tela foi para onde já morava.

**1. A Home caiu de 5.437 para 3.657px** (desktop: 4.045 para 2.922). Ordem
nova: saudação, o treino de hoje, herói/constelação, o que vem depois do treino,
rotina, áudio do dia, a carta de hoje em faixa fina, mapa da operação, lema e
recado lado a lado, linha do tempo. Saíram da Home (e foram para a tela **Mais**,
sem perder nada): "Construa junto e ganhe" (indicar, sugerir), o progresso de
nível (o anel da patente no topo já faz isso, e o botão abre o detalhe) e os
cartões que duplicavam áreas já presentes no mapa (Padrão de Gestão, atividade
recente, agenda, o cartaz da Bússola).

**2. As Trilhas caíram de 14.513 para 7.385px.** O que o programa já abriu é
**cartão**; o que ainda tem data é **linha** com a semana em que entra
(`trilhaLinha`). Com 37 trilhas e 4 abertas, a página deixou de ser um muro e o
que está liberado passou a saltar aos olhos. A busca continua achando as duas
formas. As duas ações extras da trilha (teste profundo, aplicar na prática)
viraram uma linha de dois botões discretos em vez de duas barras empilhadas.

**3. As sessões do treino carregam a cor do pilar**: barra de 3px à esquerda,
letra do pilar em medalhão e um leve degradê da cor. Sessão fechada cai para 62%
com um visto verde. O trabalho extra virou lista de linhas com seta, a mesma
língua do mentor.

**4. O caminho das 52 semanas** abre nas semanas em volta de hoje (2.008px em
vez de 7.325px), com o botão "ver as 52 semanas, uma por uma".

**5. Conquistas viraram vitrine**: duas colunas no celular, quatro no
computador, medalha compacta (3.201px em vez de 4.644px).

**6. Bugs de layout corrigidos:** as "Sugestões das suas trilhas" tinham o texto
espremido numa coluna de duas palavras (`.challenge` virou grid); o cartão da
prática permanente tinha a caixa de marcar solta e o texto quebrado (virou grid
de duas colunas); "Registrar número" quebrava em duas linhas dentro do objetivo
(virou "Medir", com `white-space:nowrap` em todo `.btn.sm`); "Editar" foi para o
canto do cartão; a marca do módulo aparecia cortada; e as sete abas do Padrão de
Gestão quebravam em três linhas com um item órfão (agora deslizam na horizontal).

**7. O que estava perdido, recuperado.** As 18 trilhas escritas em 2607.01 foram
validadas contra travessão, mas **não contra o vocabulário religioso**. A
varredura achou e trocou: "o ritual de 10 minutos" (rotina), "vira ritual"
(automatismo), "com ritual agendado" (com hora marcada), "os rituais que
sustentam o padrão" (as rotinas), "Domingo: o pacto" (o termo), "releia o pacto
assinado" (o termo), "ela é sagrada" (intocável) e a carta **"Rituais Semanais"
virou "Rotinas Semanais"** no baralho e em todas as citações dentro das trilhas.
Restam só "desagrada" e "desagradar", que são palavras comuns.

### O Plano de Guerra: alvo, apostas, objetivos e práticas (2707.01)
A Carla mandou a análise de um app concorrente (Marca Passos, da Aliança
Divergente) e pediu: "analise o que faz sentido incluir sem copiar, a ideia é
fazer muito melhor adaptando no meu produto".

**O que o outro app tem de bom:** uma cadeia encadeada (sonho grande, fichas de
foco, meta, objetivos, percepções, decisões, ações) em que cada nível libera o
seguinte, hábitos com impacto declarado, e uma IA de apoio em cada item. **O que
foi adaptado, com vocabulário e mecânica próprios** (nada de cópia):

**1. `alvo.js`, a aba "Alvo" do Plano.** O Plano 30d era uma lista sem "para
quê". Agora existe a cadeia: **Alvo do ano → 5 fichas em até 6 frentes →
objetivos com de/para e prazo → ações amarradas**. Cada elo cobra o anterior:
- o alvo pede frase, número de partida, meta, unidade, data, o porquê que se lê
  no dia ruim e **o que você vai deixar de fazer** (a lista que autoriza o não);
- **as fichas são escassas**: 5 fichas para 6 frentes, e a regra que faz valer é
  `só cria objetivo a frente que recebeu ficha`. Tirar a ficha de uma frente
  manda os objetivos dela para a geladeira (nada é apagado, e voltam se a ficha
  voltar). Foco vira regra, não conselho;
- **objetivo sem número não salva**: de quanto para quanto, até quando. O card
  mostra a barra de/para, quantas ações estão em aberto e avisa quando é zero;
- toda ação do Plano pode ser **amarrada a um objetivo** (`p.obj`), e a aba Alvo
  denuncia quantas ações em aberto **não servem a objetivo nenhum**.

**2. "Estou travado", a resposta melhor que uma IA genérica.** Em vez de um
chatbot, quatro diagnósticos e a prescrição vinda do próprio método: não sei o
que fazer (a ferramenta do módulo da frente), sei e não sai (carta de Execução e
protocolo de 5 dias), depende de outra pessoa (roteiro de feedback e alçada),
falta dinheiro ou tempo (preço, margem e caixa, ou tirar ficha de outra frente).
Determinístico, offline, e na voz dela.

**3. Práticas permanentes: o que fica depois do protocolo.** Quando o protocolo
de 5 dias fecha, o app pergunta se aquilo entra na rotina de vez. A prática tem
**impacto declarado**, frequência, marcação de um dia por dia, adesão calculada
e **revisão marcada em 90 dias**: mantém ou encerra, e encerrar também é gestão.
É a ideia do "efeito paralelo" deles, só que **ganha na prática**, em vez de ser
declarada do nada, e alimenta o pilar Comportamento do EMC.

**4. O mural do ano.** As 52 semanas em 52 quadrados no topo da aba Caminho,
acendendo conforme os três pilares fecham, com marca nas 12 semanas de prova de
marco. O ano inteiro em uma olhada.

**5. Depois do encontro, uma decisão.** O encontro passado ganha o botão "o que
eu levo daqui": a nota de 1 a 5 vai para a mentora, e **a decisão vira ação no
Plano 30d** com prazo de 7 dias. Encontro que não vira decisão foi
entretenimento.

**6. O que entrou no motor:** `emcScores` passou a contar alvo, apostas,
objetivos medidos e alcançados no pilar E, e as práticas permanentes no pilar C;
`pgAuto` fecha a sessão de Estratégia quando o alvo, o objetivo ou a medição
acontecem; `pgExtras` oferece a cadeia a quem tem disciplina sobrando; e o
mentor ganhou seis regras novas (alvo 97, apostas 95, objetivo 93, objetivo
vencido 91, objetivo sem ação 74, objetivo sem medição há 14 dias 66, prática a
revisar 60). `renderPlano` virou "O seu plano", com a aba Alvo em primeiro.

**O que foi deliberadamente descartado:** o ranking de consumo de áudio
(regional, nacional, global) e o assistente de IA. O ranking é vaidade para um
público de donos de empresa, e a IA genérica seria pior do que o mentor e o
treinador que já existem, que falam o método dela.

### O sistema virou treinador: o Programa EMC (2607.02)
A Carla: "ainda está muito solto, faz o que quer, abre o que quer, não tem
direcionamento constante, apenas inicial, se o aluno quiser e tiver tempo pra zerar
os conteúdos num dia só ele pode?"; "o que ele vai aplicar na prática, para que, qual
o objetivo?"; "pense como um personal training que leva seus alunos até o resultado
pegando na mão, sem soltar de maneira nenhuma"; "vai ter gente super disciplinada e
gente com zero disciplina"; "os pilares do meu método é EMC: Estratégia, Mentalidade,
Comportamento, preciso de transformação nos 3 pilares e preciso de provas que venham
do aluno de que o método funciona"; "quando entro no sistema pela primeira vez abre o
diagnóstico antes do Comece por aqui, revise".

**1. O Programa EMC (`programa.js`), sétimo destino da barra de baixo.** A biblioteca
virou treino prescrito de 52 semanas. Toda semana tem três sessões, uma por pilar, e
cada sessão diz **o objetivo** e **o que você aplica**, com tempo estimado:
- **E, Estratégia**: a trilha da semana, trabalhada em bloco de 2 a 4 semanas em
  quatro modos diferentes (`estudar` → `aplicar` (a ferramenta do módulo) → `medir`
  (teste profundo ou Placar) → `documentar` (o report semanal));
- **M, Mentalidade**: o naipe do mês, em quatro modos (`padrao` (a trilha do gestor),
  `carta` (uma carta daquele naipe virando plano), `espelho` (fechamento de ciclo),
  `releitura`);
- **C, Comportamento**: o **protocolo de 5 dias** montado do `BPLAY` do naipe, variando
  a cada semana (micro-ação, cadência, elevar, protocolo de recaída).

**2. A resposta para "dá para zerar em um dia?": não, e o app explica por quê.**
Três travas somadas, verificadas em teste (`t23.cjs`):
- **calendário**: `isUnlocked` respeita `pgTrilhaLiberada`. Na semana 1, das 37 trilhas,
  **2 abrem e 35 recusam**, cada uma dizendo em que semana entra e em quantos dias.
  Nada fica escondido: o cartão mostra o selo "Semana N" e a aba "Caminho" lista as 52.
- **teto do dia**: 1 sessão por dia no ritmo Padrão, 2 no Intenso (`pgPodeHoje`), com
  a tela que explica que fazer mais atropela em vez de acelerar.
- **um dia por dia**: `pgDia()` guarda a data de calendário de cada marca, então o
  protocolo de 5 dias leva **5 dias**. Fazer o trabalho das três sessões hoje não fecha
  a semana, não dispara o check-in e não abre a semana seguinte.

**3. Para quem tem disciplina de sobra: trabalho extra, não conteúdo adiantado.**
`pgExtras()` oferece ferramenta pendente, teste profundo, report semanal, pesquisa,
carta extra e Diário. Nada disso conta como sessão, então pode ser feito hoje.
Para quem tem zero disciplina: **modo resgate** (adesão abaixo de 40% em 3 semanas)
perdoa o atraso e prescreve só a sessão de hoje. Entre os dois, o modo normal cobra a
dívida de até 2 semanas ("esta sessão ficou aberta na semana N").

**4. As sessões fecham sozinhas quando o trabalho acontece** (`pgAuto`): aula marcada,
ferramenta salva, teste enviado, KPI lançado, RSG fechado, carta virada em plano e
fechamento de ciclo. A pessoa nunca precisa lembrar de "marcar como feita", e o
auto-fechamento passa por cima do teto do dia (o teto governa a prescrição, não o
esforço já entregue).

**5. As provas vêm do aluno.** Uma prova por semana, do tipo que o trabalho daquela
semana pede (relato, documento, número, registro), mais **12 provas de marco**, uma no
fim de cada mês. Ficam no **cofre de provas**, alimentam o painel EMC e entram no
**relatório de transformação** (antes → agora por pilar, com as provas listadas, saindo
por `withResultActions`). Tabela `provas` com RLS em `supabase/comunidade.sql` (seção 8)
e `OB.provaEnviar`/`OB.provasList`: a mentora vê todas, o aluno vê as dele.

**6. Painel EMC**: três anéis (E, M, C) de 0 a 100 calculados **do que a pessoa
produziu**, não do que assistiu (diagnóstico, trilhas, ferramentas, placar, report,
cartas, registros, adesão ao treino, compromissos cumpridos, dias de protocolo,
fechamentos, provas). O "antes" é fotografado no **primeiro boot** com nome (não na
primeira visita ao painel, senão o antes já seria o agora).

**7. A Home abre pelo treino.** Ordem nova: saudação em uma linha, **o treino de hoje**
(pilar, tempo, semana, objetivo, o que aplicar, botão), herói/constelação, "depois do
treino, se sobrar tempo" (o mentor sem repetir o que o treinador já disse), áudio do
dia, mapa da operação. A jornada concluída desceu para o fim da Home. A rotina do dia
virou 4 itens: a sessão, o dia do protocolo, a carta e o Diário.

**8. O bug da primeira entrada, corrigido.** `startJourney()` abria um modal de
autodiagnóstico 500ms depois de entrar, que colidia com o `afMetodo(true)` disparado a
350ms por `afGuiaUpdate()`: por isso o diagnóstico aparecia antes do Comece por aqui.
O modal saiu. Quem recebe a pessoa é **uma** tela: o método EMC (os três pilares, a
regra que amarra e o aviso de que o treino é de 52 semanas com uma sessão por dia),
que entrega direto para a sequência. O diagnóstico continua tendo passo próprio, na
hora em que faz sentido, e o resultado dele agora aponta para o treino em vez de dizer
"abra suas trilhas".

**9. O que mudou em volta:** o tour ganhou a parada "Meu Treino" e o convite passou a
dizer "agora o treinador assume"; `afTrilhaSugerida` e `mtProximaTrilha` nunca sugerem
trilha de semana futura; `renderPrograma` também checa o `GATES` (as abas chamam a
função direto); as Trilhas ganharam a faixa "Semana N de 52" com o porquê do ritmo.

### O ano inteiro dentro do app, e o dobro de trilhas (2407.21)
A Carla mandou o print da página de vendas ("Um ano inteiro de ritmo, método e
companhia") e pediu: "inclua o conteúdo e já crie tudo dentro do sistema do que
está no print"; "os áudios 1 por dia, os vídeos 2 por semana e um espaço para link
dos encontros como calendário vinculado a notificação e agenda"; e depois: "crie
baseado nas cartas os conteúdos para mais trilhas do ano inteiro e aprofunde".

**1. Nova área "O Ano" (`ano.js`).** É o print virado produto, com quatro abas:
- **O ritmo**: os seis cartões da cadência (áudio todo dia, duas aulas por semana,
  encontro ao vivo toda semana, encontro híbrido todo mês, comunidade todo dia,
  onboarding com o time), o próximo encontro em destaque e o bloco dos 12 meses com
  renovação antecipada.
- **Encontros**: a mentora publica com data, hora, link e local. O membro entra pelo
  link, confirma presença (+10 XP) e clica em **Adicionar à agenda**, que cria a
  entrada na Agenda do app e baixa um `.ics` com alarme de 1 hora antes para o
  calendário do celular. `anAvisos()` roda no boot e avisa quando falta menos de 24h.
- **Aulas da semana**: as duas aulas gravadas por semana, com contador "N de 2
  publicadas", marcação de assistida (+15 XP) e histórico das semanas anteriores.
- **O ano inteiro**: os 12 meses com tema, descrição e o módulo ligado, marcando
  "você está aqui".
O topo mostra o anel de **semana N de 52** e o tema do mês. Local primeiro:
tudo funciona offline e sincroniza com Supabase (tabela `videos` nova em
`supabase/comunidade.sql`, encontros reaproveitam `eventos`).

**2. Dezoito trilhas novas, escritas para o ano.** Oito aprofundam os módulos mais
rasos: Processos que rodam sem você, A rotina de gestão da semana, Padronização e
qualidade (Engenharia); Delegar sem perder o controle, Os primeiros 90 dias
(Descompressão); Preço, margem e o que sobra, Caixa: o oxigênio da operação
(Finanças); Conversas difíceis (Liderança). E o **sexto módulo, "Blindagem do
Gestor"**, nasceu das 170 cartas: **as dez trilhas dos dez naipes** (Direção,
Plano, Resultados, Mente, Forças, Identidade, Execução, Padrões, Sabotagem e
Liderança), cada uma citando as cartas pelo nome e transformando o padrão em
protocolo de uma semana. Cada trilha tem 5 aulas, 4 perguntas de quiz e desafio
prático, com 2.200 a 2.800 palavras de conteúdo real. O app foi de 19 para
**37 trilhas e 147 aulas**. As dez do baralho não são escada: `isUnlocked`
libera todas, porque a pessoa começa pelo naipe que o Mapa Bússola apontou.

**3. Becos sem saída fechados (varredura em seis frentes).**
- **Bug real:** quem respondia o quiz antes de marcar as aulas nunca fechava a
  trilha. Agora `completeStep` também chama `maybeCompleteModule`, e o quiz enviado
  com aulas faltando abre a lista do que falta, com botão por aula.
- **Trilha concluída** deixou de ser um modal que some: `renderTrilhaFechada` põe um
  painel permanente no lugar do quiz respondido, com os próximos passos numerados.
- **Fim de módulo** passou a existir: `moduloFechado` dá selo, +150 XP, o resumo do
  que a pessoa produziu (ferramentas, testes, ações) e anuncia o módulo que abre.
- **Teste profundo** termina com ação: "seu ponto mais fraco é X", com botão que
  vira compromisso no Plano 30d (prazo de 14 dias) e outro que abre a ferramenta.
- **Os 7 dias** do plano da carta eram sete quadradinhos sem clique: agora marcam,
  gravam em `S.bussola.dias`, dão XP e comemoram a sequência.

### O sistema virou mentor (2407.20)
A Carla: "não estou entendendo o que é para fazer depois de concluir a primeira
trilha, está tudo meio que solto, não quero a impressão de 'e agora o que faço?'.
O sistema precisa pensar pela pessoa, nunca deixar a pessoa perdida, precisa agir
como mentor"; "quero o áudio diário na área de diário e na tela de início"; "pense
em como distribuir para não deixar as seções escondidas e perdidas".

**1. Motor de próximo passo (`mentor.js`).** 16 regras leem o estado real e
devolvem sempre uma próxima ação, com prioridade: compromisso atrasado (100),
retomada depois de sumir (96), vence hoje (92), encontro chegando (88),
autodiagnóstico (86), Mapa Bússola (84), carta do dia (80), aula pela metade (72),
ferramenta do módulo concluído (70), teste profundo (64), próxima trilha (62),
placar parado (58), fechamento de ciclo (56), rediagnóstico (50), diário (46),
pesquisa (40), padrão de gestão (38), comunidade (34) e uma rede de segurança que
sempre dispara (1). Cada regra tem título, **o porquê em voz de mentoria**, tempo
estimado e a chamada exata que abre o lugar.

**2. Onde isso aparece.** A Home abre com o bloco do mentor: a ação de agora, o
"depois disso" com as três seguintes e a **rotina do dia** (carta, uma aula, uma
linha no Diário) com marcação de 0 a 3. Em qualquer outra tela, a faixa do topo
(que na jornada era "próximo passo N/8") vira a voz do mentor. `addXp()` atualiza a
faixa a cada conquista, então ela nunca fica velha. Na Home a faixa some, porque
ali o bloco já é o mentor.

**3. A ponte de fim de trilha (`mtTrilhaConcluida`).** Era o beco exato que ela
descreveu. Agora, ao concluir uma trilha, abre uma tela numerada: transforme em
documento (a ferramenta daquele módulo), comprometa-se com uma prática (vai para o
Plano 30d), meça a maturidade (teste profundo) e siga para a próxima trilha, mais
"voltar para o meu próximo passo".

**4. Bug real encontrado na varredura:** quem fazia o quiz **antes** de marcar todas
as aulas nunca fechava a trilha, porque `maybeCompleteModule()` só era chamado ao
enviar o quiz. Agora também é chamado no fim de `completeStep()`.

**5. O que venceu aparece no Plano.** Bloco no topo da aba Ações: "Venceu e não foi
feito", com **Fiz** e **Nova data** (`planAdiar`, +7 dias) por item, e um aviso
discreto quando algo vence hoje.

**6. Mapa da operação.** Grade com as 10 áreas na Home (ícone, nome, uma linha e o
estado ao vivo: "3 de 19 concluídas", "9 de 9 preenchidas", "1 registro"). Nada de
seção escondida: se a pessoa não vê, ela não entra.

**7. Áudio do dia no Início e no Diário.** `loadObAudioHome(alvo)` agora aceita o
destino e o Diário abre com ele no topo. Sem áudio publicado (ou offline), aparece
o cartão explicando onde ele vai tocar, para o lugar nunca ficar vazio sem
explicação.

**8. A Home foi reordenada:** herói curto (sem botão repetido), mentor, áudio do
dia, mapa da operação, e só então lema, Padrão de Gestão, progresso e histórico. A
jornada concluída virou uma faixa fina com os 8 passos guardados em "ver".

### A jornada acontece em um lugar só (2407.19)
A Carla: "não quero que a pessoa fique indo e voltando no comece aqui, ela tem que
seguir uma sequência que tenha lógica"; "na hora que ela apertar fazer agora ela faz
e já volta, quero que ele faça tudo no mesmo lugar"; "tudo tem que ficar bloqueado
até terminar"; "o comece por aqui não está passando do número 5"; "deixe mais bonito
esse print, que é a resposta do diagnóstico".

**1. O bug do passo 5 era o modal de nível.** `addXp()` dispara `levelUpModal()`
depois de 400ms, e ele chamava `modal()` por cima do que estivesse aberto: o
resultado do diagnóstico, a carta, o termo. A tela trocava sozinha e o passo parecia
não fechar. Agora `levelUpModal` checa `telaOcupada()` (modal, questionário ou tour)
e espera a vez, virando aviso simples depois de 20 tentativas. O segundo motivo era
`bSignPacto()`, que só chamava `renderBussola()`: a jornada na Home não era
redesenhada e o passo continuava marcado como atual.

**2. Sequência nova, com lógica.** Você por dentro, a prática, o compromisso, a
empresa por fora, o conteúdo, a medição, a rotina:
método → **Mapa Bússola** → **carta vira plano** → **Termo de Blindagem** →
**autodiagnóstico do negócio** → **primeira aula** → **primeiro número no Placar** →
**primeiro fechamento de ciclo**. O autodiagnóstico ficou colado na primeira aula, que
é o momento em que ele faz sentido (era o pedido: "só aparece na hora de abrir a
trilha"). Cada passo mostra tempo estimado e o porquê dele.

**3. Tudo no mesmo lugar.** Nenhum passo navega para dentro do app: o Mapa e o
diagnóstico abrem o questionário em tela cheia, a carta, o termo, o placar e o
fechamento abrem modal. `afEmPasso` guarda o passo que a pessoa apertou e `afFeito()`
(chamado nos pontos de conclusão) devolve para a jornada, rolando até o passo
seguinte. Só a aula tem tela própria, e ali o topo vira "← Comece por aqui" com o
número do passo; ao marcar o primeiro passo da aula, volta sozinho.

**4. Nada abre antes do fim.** `afAreaAtual()` foi zerada: a exceção que abria a área
do passo da vez não existe mais, porque nenhum passo precisa dela. As 10 áreas ficam
trancadas até 8 de 8.

**5. O resultado do diagnóstico virou leitura.** Nota geral em anel com faixa
(Início, Estruturando, Consolidando, Blindado), radar com rótulos curtos na
tipografia do app (era monoespaçado azul, cortado nas bordas: agora `RADAR_CURTO`
encurta os nomes e a moldura ficou 470 de largura), as cinco notas em barras
ordenadas da mais fraca para a mais forte, e dois blocos: "já está forte" e "comece
por aqui", este apontando a trilha mais fraca do módulo. `AF_GRAU` perdeu o
"Pactuado" (virou "Assinado").

**6. Mais leve (auditoria de desempenho).** Rodei uma auditoria em seis frentes sobre
os fontes e apliquei o que era seguro: `resize` só redesenha a aula quando a
**largura** muda (no celular a barra do navegador dispara resize a cada rolagem e
reconstruía a aula inteira); a constelação da Home para de animar quando sai da tela
(IntersectionObserver liga `.cx-parada`, 80 animações infinitas a menos); `go()` só
grava no disco quando a tela é nova (antes gravava o estado inteiro a cada
navegação); o supabase-js do CDN virou `defer` (203 KB que travavam o parser antes de
o app existir); `body:has(.modal-bg.show)` virou uma classe no body (o `:has` forçava
recálculo de estilo do documento inteiro); e a busca de membros espera a pausa da
digitação em vez de consultar a cada tecla.

### Vocabulário sem termo religioso (SEMPRE)
A Carla: "substitua as palavras pacto, ritual, tudo que remeta palavra religiosa".
Trocas já feitas e que devem ser mantidas em qualquer texto novo:
`Pacto de Blindagem` virou **Termo de Blindagem**; `Ritual de Ciclo` virou
**Fechamento de Ciclo** (e "ritual" solto virou "rotina" ou "revisão");
`Mantra do dia` virou **Lema do dia**; `O Bloco Sagrado` virou **O Bloco
Intocável**; "espera salvação" virou "espera que alguém resolva"; "espírito de
competição" virou "competição saudável". **Só o texto visível mudou**: as chaves
de dados (`S.bussola.pacto`, `S.bussola.ritual`) e os nomes de função (`bPacto`,
`bRitual`) continuam iguais, senão os dados de quem já usa o app se perdem.

### Liberação só no fim, tour depois, questionário vivo (2407.18)
A Carla: "as páginas só podem ser liberadas até terminar tudo e depois vai fazendo
um passo a passo aprendendo a mexer no app"; "os diagnósticos [precisam ficar] de
uma forma mais legal e dinâmica"; "revise o código para deixar o app mais leve";
"o Diário precisa estar ali embaixo com um ícone de atalho"; "vai ser um
aplicativo que abra no computador e celular".

**1. Nada abre antes do fim.** `AREA_PASSO` (que liberava por etapas) saiu.
`gateDe(view)` agora só devolve aberto se `afCompleta()` **ou** se a área é a do
passo da vez (`afAreaAtual()`, novo campo `area` em `AF_JORNADA`: o passo 2 abre a
Bússola, o 3 abre as Trilhas, e assim por diante). Sem isso a própria jornada não
teria por onde acontecer. As 10 áreas ficam trancadas, **inclusive A Mentora**: a
tela de cadeado dela carrega "Limpar meus dados" e "Sair da conta", para ninguém
ficar preso. Os textos do `GATES` deixaram de ser barreira e viraram vitrine: cada
cadeado conta o que existe do outro lado.

**2. O tour (`tour.js`).** Quando o oitavo passo fecha, `gateCheckNovos()` grava
`S.unlocks.jornada_ok`, refaz a barra e chama `tourOferecer()`. São 8 paradas com
holofote em cima do elemento de verdade (`.tour-hole` com `box-shadow` de 9999px e
aro de ouro) e balão que se posiciona sozinho acima ou abaixo. O convite espera a
vez se houver modal ou questionário aberto. Refazer: link na tela Mais.

**3. Questionário vivo (`quiz.js`).** O padrão `.qz-*` (lista longa) virou um motor
de tela cheia com **uma pergunta por vez**: abertura com quantas frases e quantos
minutos, capítulo por módulo (com a nota do módulo anterior), pergunta em serifa
grande, escala de 5 linhas altas com rótulo em cada uma, avanço automático,
teclado (1 a 5, setas, Esc), **rascunho salvo** (continua de onde parou) e tela de
conferência antes de concluir. Usado pelos quatro: autodiagnóstico (19), Mapa
Bússola (10, com o Norte virando a primeira tela), pesquisas e testes profundos.
`qzAgrupar()` só cria capítulos quando o bloco tem pelo menos 2,5 frases em média
(a pesquisa de clima tinha 14 categorias para 18 frases: viraria interrupção).
As funções de submissão antigas continuam as mesmas, recebendo as respostas.

**4. Diário na barra de baixo.** `PRIMARY` passou a ter 6 destinos
(`home, bussola, trilhas, plano, diario, menu`) e o Diário saiu do `OVERFLOW`.
A 430px os rótulos e ícones encolhem um pouco: 6 alvos de 64px, sem estouro.

**5. Mais leve, sem mudar nada.** A primeira pintura caiu de **12.880ms para
340ms** no teste: as fontes do Google saíram do `@import` (que bloqueia a
renderização e, sem internet, trava a tela até o tempo esgotar) e viraram `<link>`
assíncrono com `preconnect`, mantendo exatamente as mesmas famílias. O histórico
(`S.log`) ganhou teto de 400 registros dentro do `save()`: a linha do tempo sempre
mostrou só 8, e o estado crescia para sempre em cada gravação. `saveSoon()`
(espera 700ms) segura a escrita durante cliques em sequência. Testado também com
`content-visibility` nas 170 cartas: **descartado**, porque mudava a altura da
rolagem (26.658px para 40.861px) e não acelerava nada.

**6. Isotipo.** Redesenhado em vetor a partir da imagem que a Carla enviou: escudo
de topo em bico, aro dourado com bisel, campo escuro, **duas faixas de patente de
cada lado** e cadeado central com rebites e fechadura. Se ela mandar o PNG
original (subindo no repositório ou por link direto), dá para trocar por ele.

### O topo virou insígnia (2407.17)
A Carla: "melhore essa parte de cima, pois ficou algo sem graça, não ficou muito
bonito, quero que fique bonito igual restante do app".

**A causa real:** a barra do topo tinha ficado para trás em todas as reformas. O
fundo ainda era `rgba(12,18,36,.96)`, **azul-marinho da paleta antiga**, enquanto o
app inteiro virou carbono quente (`--ink:#0a0806`); o sino era o emoji 🔔 (o único
emoji do chrome); e nível e XP eram duas pílulas retangulares que não diziam nada.

**1. A barra.** Carbono com duas auroras de ouro (`::before`), blur com saturação e
um **fio de ouro que atravessa a base** (`::after`) e **se acende ao rolar**
(`topbarScroll()` liga a classe `.scrolled`, que também traz a sombra). Sem borda
dura: o conteúdo dissolve por baixo.

**2. A marca.** O isotipo passou a morar em um medalhão com moldura dupla (aro de
ouro + fio interno) e sobe para 26px. "Operação Blindada" ganhou gradiente de
pergaminho (`background-clip:text` com `-webkit-text-fill-color`, mantendo `color`
como reserva) e a assinatura virou versalete com **losango de ouro** no lugar do "·".

**3. O vazio do meio virou intenção.** `.top-fio`: um fio de ouro que cresce
(`flex:1`) e liga a marca à patente, mais forte no centro e dissolvendo nas pontas.
Some abaixo de 860px.

**4. Nível e XP viraram patente.** As duas pílulas mortas viraram um **anel que mede
o XP que falta para o próximo nível** (mesma linguagem do anel da jornada:
conic-gradient com `--p`), com o número dentro em serifa, o nome da patente e
`Nível N ◆ N XP` em versalete. Clicar abre `openPatente()`: anel grande, barra de
progresso, "Faltam N XP para o Nível N+1" e a tabela **De onde vem o XP**
(`XP_FONTES`), que antes não existia em lugar nenhum do app.

**5. Sino e retrato.** O emoji virou SVG em traço (`TICO.sino`, junto com
`TICO.chama` da sequência de dias), com marcador de ouro em vez do coral. O avatar
ganhou aro de ouro cônico com miolo escuro e a inicial em serifa. As notificações
também perderam o emoji: `.nt-row` com losango de ouro para o que ainda não foi
lido e cinza para o resto.

**6. Título das telas internas** com âncora de ouro (`.screentitle::before`).

**Celular (até 620px):** some a assinatura, some o texto da patente (fica só o
anel), some a sequência de dias (ela vive em Conquistas) e o título fica em uma
linha só: 60px de altura, contra os 89px que a versão anterior produzia quebrando
o texto em três linhas.

### Camada conectada construída de verdade (2407.16)
A Carla: "quero que você já faça a criação de todos esses recursos dentro do
sistema, deixe tudo perfeito, faça isso completo" (sobre a lista "Próximos
recursos" da tela da Mentora).

**O que já existia:** o **áudio diário** (upload/link, publicação, player no
Início, histórico, transcrição, XP, selo NOVO) e a **caixinha de perguntas**
(texto) já estavam prontos, só constavam como "Em breve".

**1. Caixinha responde por áudio e vídeo.** `OB.caixinhaAnswer(id,text,url,tipo)`
agora aceita mídia, `OB.midiaUpload(file,bucket)` sobe o arquivo, `obMidiaPlayer(r)`
renderiza `<audio>`/`<video>` para a pessoa. A leitura pede `midia_url,midia_tipo`
e, se o banco ainda não tiver as colunas, cai na consulta antiga sem quebrar.

**2. Nova view `comunidade`** (`comunidade.js`, injetada junto com o motor), com
3 abas:
- **Encontros**: a mentora cria (título, quando, presencial/online, cidade, local
  ou link); o membro confirma presença ("Eu vou" / "Talvez", +10 XP). Cartão com
  medalhão de data, e evento passado fica esmaecido.
- **Membros próximos**: consentimento explícito (`.cm-switch`), cartão de membro
  (nome, negócio, cidade, UF, área, contato que a pessoa aceita mostrar), busca, e
  ordenação por proximidade com selo "mesma cidade" / "mesmo estado". Sair do mapa
  remove na hora (`OB.perfilRemover`).
- **Galeria**: foto com legenda, layout em colunas.

**3. Local-first.** Tudo funciona sem servidor (localStorage) e sincroniza quando
o Supabase responde; se a chamada falhar, cai no local sem erro. `CM()` guarda
`perfil/eventos/presencas/galeria/membros` em `S.comunidade`.

**4. SQL em `supabase/comunidade.sql`**: colunas de mídia na caixinha, tabelas
`membros`, `eventos`, `presencas`, `galeria`, buckets `midia` e `galeria`, tudo com
RLS (o mapa só mostra quem marcou `visivel`; a mentora administra via
`public.eh_mentora()`).

**5. A lista "Próximos recursos" virou "Recursos da camada conectada"**, com selo
Pronto nos dois primeiros e botão Abrir nos dois novos.

Bug corrigido no caminho: `cmSalvarPerfil` zerava o cartão quando era chamado de
fora do formulário; agora só sobrescreve o campo que está na tela.

### Diagnóstico dentro das Trilhas + padrão de questionário (2407.15)
A Carla: "esse diagnóstico tem relação aos conteúdos da trilha, para liberar a
trilha é necessário fazer esse diagnóstico, e deve estar na página da trilha e não
na página inicial"; "aprofunde as perguntas"; "melhore o visual não só desse
diagnóstico como para todos, criando um padrão para todo sistema".

**1. As 19 perguntas.** O `DIAGNOSTIC` cobria só 9 das 19 trilhas (faltava toda a
estratégia, governança e finanças). Agora tem **uma frase por trilha**, com
`{mod, t, dim, q}`: `mod` liga ao módulo (GROUPS), `t` à trilha. As frases viraram
comportamentais ("Antes de abrir uma vaga, tenho escrito o que a pessoa precisa
entregar e como vou medir isso") em vez de declarações vagas. `diagPorModulo(ans)`
agrega as 19 respostas nos 5 módulos, então o radar tem 5 eixos legíveis em vez de
19 (vale para o resultado, a evolução e a tela da Mentora).

**2. O diagnóstico mora nas Trilhas e é a chave delas.** `renderTrilhas()` começa
com `if(!S.diagnostic)` e devolve a `.gatepane`: isotipo, "O autodiagnóstico abre as
suas trilhas", os 5 módulos com quantas frases cada e o botão. O passo 3 da jornada
(`diagn`) agora faz `go('trilhas')` em vez de abrir modal na Home, e anuncia
`libera:'Trilhas'`. `AREA_PASSO.trilhas` virou 2 (a página abre para o passo 3
acontecer lá dentro; o conteúdo só aparece depois do diagnóstico).

**3. Padrão de questionário (`.qz-*`), para o sistema inteiro.** Mesma cabeça
(eyebrow, título, lead, **barra de progresso** ao vivo e legenda "1 não é o meu
caso / 5 é exatamente assim"), mesmas seções por módulo (`.qz-sec` com número e
fio), mesma pergunta (`.qz-item` com `.qz-dim` em versalete) e a **mesma escala**
(`.qz-scale`, alvos de 52px, selecionado em ouro). Rodapé fixo (`.qz-foot`) com o
botão e quantas faltam; ao submeter incompleto, rola até a pergunta e a destaca
(`.faltando`). Aplicado ao autodiagnóstico, ao Mapa Bússola (`openBDiag`, com
`bqzSync`) e, via `.likert` restilizado, às pesquisas e testes profundos.

**4. Confirmação do bloqueio.** Com 0 passos: Bússola, Trilhas, Plano, Diário,
Ferramentas, Padrão de Gestão, Pesquisas e Conquistas mostram tela de cadeado.
Só **A Mentora** fica aberta, de propósito: é a conta (login, sair, limpar dados).

### Liberação realmente sequencial + Cruzeiro do Sul (2407.14)
A Carla: "todas as páginas, acessos e botões estão liberados, quero que libere
após a conclusão do passo anterior"; "o comece por aqui precisa ser a primeira
página e só liberar as boas-vindas depois de finalizar todas as etapas"; e sobre
a constelação: "precisa parecer uma constelação, não um rabisco".

**1. Sequência de verdade.** O bug: os passos futuros tinham botão "Abrir", dava
para pular. Agora `afSeq()` conta só os passos concluídos **em sequência desde o
início**, e é ele que libera tudo. `afDo(id)` recusa passo à frente (avisa "um
passo de cada vez"). No card, só o passo da vez tem botão: os seguintes mostram
cadeado e "abre depois". `AREA_PASSO` liga cada área ao número de passos exigidos
(bussola 1, plano/diário 4, trilhas 5, ferramentas/gestão/pesquisas 6) e
`gateDe()` usa `afSeq()`.

**2. Comece por aqui é a primeira página.** Enquanto `afCompleta()` é falso,
`renderHome` devolve só `<div id="afHost">` e a jornada ocupa a tela inteira, com
isotipo, anel de progresso, grau (`AF_GRAU`: Iniciante → Blindado) e o selo "abre:
X" no passo atual. `bHomeHook` não injeta o card da Bússola nesse modo. As
boas-vindas (herói, faixa de instrumentos, mantra) só aparecem em 8/8.

**3. Cruzeiro do Sul.** A constelação genérica virou a cruz do sul: 5 estrelas com
magnitudes reais (Acrux a mais brilhante), as duas linhas da cruz, 78 estrelas de
fundo com cintilância, nebulosa em gradiente radial e glint de 4 pontas nas
acesas. Acende conforme as trilhas concluídas. Referência de mercado pesquisada:
Marca Passos (Aliança Divergente/Elton Euler), de onde vieram as ideias de grau de
progressão visível e de mostrar o que cada etapa libera.

### Isotipo próprio + jornada primeiro de tudo (2407.13)
A Carla: "a pessoa primeiro tem que fazer toda essa parte do comece por aqui e
depois ela vai ter acesso ao restante, apos isso o app libera para uso, e essa
parte precisa estar primeiro de tudo"; e mandou o isotipo (escudo dourado com
cadeado) para substituir o escudo anterior.

**1. Isotipo.** `shieldSvg(px)` (no IIFE `OB`) foi reescrito como o isotipo dela:
escudo com rima dourada (gradientes `obG/obGl/obGd`), interior escuro, duas faixas
por lado e um cadeado central com fechadura, tudo em vetor (nítido em qualquer
tamanho, offline). A marca do topo (`#brandMark`) é preenchida no boot com
`OB.shield(24)`; o onboarding usa um tile escuro com o isotipo (igual ao ícone de
app que ela enviou); o card de Padrão de Gestão e as telas de aula seguem usando
`OB.shield`.

**2. Jornada primeiro.** `renderJornada` agora insere o "Comece por aqui" como
**primeiro filho** de `#view-home` (antes do herói) enquanto não estiver completa,
com o selo "O app abre por etapas conforme você avança" e a fala "Antes de tudo,
faça esta sequência". Quando os 8 passos terminam, o card vira o estado
**"Operação liberada · Jornada concluída"** (verde) e desce para depois do herói.
A liberação real continua nos `GATES` (2407.12): cada passo abre a próxima área, e
a sequência dos passos é auto-consistente (todo passo que navega para uma área já
foi destravado por um passo anterior).

### Home com vida, liberação por etapas e ferramentas (2407.12)
A Carla: "arrume essa parte que ficou totalmente sem graça, sem vida, preciso que
fique bonito e diferenciado"; "a pessoa não pode ter o acesso inicial a tudo pois
ela precisa fazer o passo a passo primeiro"; "melhore muito as ferramentas".

**1. Home.** O herói virou um bloco só: `constelacaoSVG(done,total)` desenha 12
estrelas e **acende de verdade** as que correspondem às trilhas concluídas (linhas
`.viva`, brilho e pulsar suave que respeita `prefers-reduced-motion`). As 4 caixinhas
soltas viraram a `.hero-strip` dentro do próprio herói, separada por fios. O mantra
virou citação editorial (`.mantra`). O roteiro da jornada agora entra **depois** da
saudação, não antes. Emoji fora do chrome: `ICO` traz ícones em traço e o
`nextActionCard` usa `.nx-ico`.

**2. Liberação por etapas.** `GATES` define o que cada área exige, na ordem do
`AF_JORNADA`: Bússola pede o método entendido; Trilhas pedem o autodiagnóstico;
Plano e Diário pedem a 1ª carta; Ferramentas, Padrão de Gestão e Pesquisas pedem a
1ª trilha. Conquistas e Mentora ficam sempre abertas. `go()` chama `gateDe(view)` e,
se travado, renderiza `renderLocked` (cadeado, o porquê, progresso da jornada e o
botão que leva ao passo que falta) em vez da tela. A barra inferior e a tela "Mais"
mostram cadeado; `gateCheckNovos()` avisa quando algo abre (um aviso só, mesmo que
várias áreas abram juntas). Nada foi removido: só sequenciado.

**3. Ferramentas.** Deixou de ser uma grade solta: agora é **agrupada por módulo**
(`.fx-sec` com número e fio), cartões `.fx-card` com ícone em traço, descrição em
2 linhas, estado **preenchida** em verde e um anel de progresso no topo
(`.fx-ring`, "N/9").

Emoji: saíram das trilhas (medalhão numerado `.num-glyph`), do plano, das pesquisas,
do diário e da Mentora. **Só as medalhas de Conquistas mantêm ícone**, de propósito.
Corrigido de passagem: `radarSVG` não quebra mais com diagnóstico salvo pela metade.

### Painel de Indicadores: de planilha a painel de decisão (2407.11)
A Carla: "gostei da ideia mas não gostei de como ficou, não parece útil". Era uma
tabela de 8 colunas (820px mínimo), inútil no celular e sem dizer nada.
- **Cartões, não linhas** (`.kpi-card`): número grande, meta, % de atingimento,
  barra, **veredito em português** (`gVeredito`: "Faltam 27.000 para a meta") e
  tendência contra o anterior (`gTend`, já respeitando "menor é melhor").
- **Bloco de decisão no topo** (`.kpi-foco`): o pior indicador em vermelho, com
  botão que cria a ação no Plano 30d (`gKpiAcao`). Resumo por farol (`.kpi-sums`)
  e alerta quando passa de 8 indicadores (o método manda de 4 a 6 por área).
- **Duas zonas**: quem tem número vira cartão; quem não tem cai numa lista
  enxuta ("Ainda sem meta", `.kpi-pend`), para o sinal dominar a tela.
- **Estado inicial ensina**: escolher uma área pronta, não encarar linhas vazias.
- **Editor em modal** (`gKpiEdit`): o checkbox críptico "↓ melhor" virou a
  pergunta "qual direção é boa?" com exemplos. Era a origem do bug abaixo.
- **Travas de sanidade no `gFarol`**: acima de 300% o farol vira "checar" em vez
  de mentir. O print da Carla mostrava R$ 3.000 de R$ 30.000 como **1000% verde**
  (a direção estava invertida e a conta virava meta ÷ realizado); agora dá 10%
  vermelho, ou "checar" se a direção estiver trocada.
- `gNum` formata em pt-BR. RSG, PTM e a impressão A4 seguem lendo `g.kpis`.

### Limpeza geral dos travessões (2407.10)
Todos os travessões saíram do sistema (produto principal, `index.html`,
`baralho.html` e o arquivo de direção visual): 544 no base, 84 no motor, 59 nas
cartas, 291 no index e 104 no baralho. A troca é por pontuação, não apagamento
(ver a regra de escrita no topo). Conversor: `tools/dedash.py`.

### A moldura da carta envolve tudo + rolagem invisível (a partir de 2407.09)
A pedido da Carla ("ainda dá para melhorar o aspecto visual, e deixe o visual da carta
ao redor dela"; "remova barra de rolagem ou integrada na carta"):
- **O modal deixou de ser caixa: a carta é a caixa.** `.modal:has(.bo-card)` fica
  transparente, sem borda, sem padding; quem emoldura todo o conteúdo é `.bo-card`
  (moldura dupla via `::before`, fio de luz no topo via `::after`, brilho do naipe).
- **Índices dos cantos e marca d'água presos à moldura** (`.bo-corner.tl`/`.br`,
  `.bo-wm`), não rolam com o texto. O × mora no canto superior direito, que num
  baralho é justamente o canto livre.
- **Rolagem por dentro da carta, sem barra visível**: `.bo-scroll` é o único
  scroller (`scrollbar-width:none` + `::-webkit-scrollbar{display:none}`); a barra
  também foi escondida em todos os modais. Duas faixas `.bo-fade` (topo e base)
  fazem o texto **dissolver nas bordas** em vez de bater nos índices dos cantos: daí o padding maior no `.bo-scroll` (54px topo / 48px base).
- Refino editorial: rótulos das seções em versalete com fio (`.bo-sec h4::after`),
  faixa de atributos entre fios (`.bo-stats`), influências ± viraram **duas colunas
  com fio colorido** (saiu o bloco verde/vermelho que pesava), ferramenta como placa
  inscrita, título em `clamp()` e assinatura da Carla na cor do naipe.

### Carta aberta = carta de verdade + plano de ação (a partir de 2407.08)
A pedido da Carla ("mude o visual de como aparece a carta quando você dá um clique,
mas não altere nada de como ficaram as cartas... use a mesma identidade que está fora
e ela precisa ter aparência visual de carta"; e sobre o antigo formulário: "não tem
utilidade nenhuma nessa ferramenta, transforme a carta na maior sacada para aplicação
prática, para o aluno sair dali com um plano de ação, que ele possa imprimir e baixar,
rodar um PDCA, ou incluir no planner").

**Visual: a carta aberta virou uma carta.** (Nesta versão a moldura era o bloco
`.bo-face` no topo; a partir de 2407.09 ela virou `.bo-card` e envolve tudo: ver acima.)
Seção "CARTA ABERTA" do `premium.css`: moldura dupla (`::before`), **índices nos cantos** com naipe + número
(`.bo-corner.tl` / `.br` rotacionado 180°, como baralho impresso), **marca d'água** do
naipe (`.bo-wm`), fio de ouro ornamental (`.bo-rule`), pergunta-guia em serifa itálica
(`.bo-q`), os 4 atributos como **pips** (`.bo-stats`/`.bo-pips`), dimensão no pé
(`.bo-dim`) e brilho de gema na cor do naipe (`--sc`, mesma variável do baralho).
**O baralho (`.bcard`) não foi tocado**, só a carta aberta.

**Sacada prática: a carta produz um plano.** Fluxo em 3 telas (`bussola_engine.js`):
1. `openCard(idx)`: a face da carta + "O padrão em jogo" (leitura comportamental do
   naipe) + painéis + a ferramenta + CTA único **"Transformar em plano de ação"**.
2. `bPlanStart(idx)`: construtor em 3 passos onde **nada começa em branco**:
   (a) "onde você está nessa carta?" (`BNIVEL`: novo / oscilo / forte) **calibra o
   plano**; (b) 3 ações sugeridas e editáveis (`bPlanSugs`, derivadas do `BPLAY` do
   naipe + a ferramenta `c.x` da carta); (c) gatilho com chips prontos (`BGATILHOS`)
   + prazo. Métrica, risco e protocolo de recaída vêm pré-preenchidos em `<details>`.
3. `bPlanGo(idx)`: gera o **Plano de Ação**: compromisso (intenção de implementação),
   sequência de 4 passos sem repetição (`pega()` dedupe: a ação escolhida pode
   coincidir com o passo de 10 min ou com a cadência, conforme o nível), métrica,
   risco, protocolo e 7 caixinhas de marcação. Sai por `withResultActions` →
   **Salvar · Imprimir A4 · Plano 30d · PDCA · Agenda · Diário**, mais
   `bPlanDownload()` que **baixa um .html autônomo** (branded, imprime em A4, funciona
   sem internet). Já grava no `S.plan` com `bnaipe` (preserva o passo 4 da jornada),
   no `interrupts`, marca `worked`, dá XP e o troféu.

`BPLAY` = playbook por naipe (padrão, micro-ação de 10 min, cadência, como elevar,
métrica, risco, protocolo de interrupção): é o que dá substância de mentoria às
sugestões das 170 cartas. CSS das telas 2 e 3: `.bp-*` e `.pl-*`. Com modal aberto os
toasts sobem para o topo (`body:has(.modal-bg.show) .toast-zone`) para não cobrir a
barra de ações.

### Navegação de app nativo: pronto para as lojas (a partir de 2407.07)
A pedido da Carla ("repense a forma de entrar nas seções, pense como app pois iremos
subir na Play Store e na App Store; haja como designer de apps"). Trocamos a barra de
abas horizontal com rolagem (10 itens, padrão de site) por navegação **nativa**, sem
remover nenhuma seção:
- **Bottom tab bar** fixa (`.appnav`/`#appnav`), 5 destinos principais em `PRIMARY`
  = `home · bussola · trilhas · plano · menu`, com ícones em traço (SVG, sem emoji no
  chrome), alvo ≥52px, zona do polegar, indicador de aba ativa em ouro,
  `env(safe-area-inset-bottom)` para o notch/home-indicator, blur + fio de ouro no topo.
- **Tela "Mais"** (`view-menu`/`renderMenu()`) = hub das seções que não cabem na barra
  (`OVERFLOW` = ferramentas, gestão, pesquisas, diário, conquistas, mentora) em linhas
  grandes com ícone + título + subtítulo (`MENU_SUB`) + chevron; rodapé com "Limpar
  meus dados".
- **Topo contextual**: raiz mostra a marca; telas raiz não-home mostram o **título da
  tela**; telas secundárias mostram **‹ voltar** (`#topBack`/`navBack()`) + título.
  `syncChrome(view)` cuida disso e do estado ativo da barra; `lastPrimary` guarda a
  raiz para o voltar. `NAV_TITLE`/`NAV_SHORT`/`NAV_ICON` no motor da navegação.
- **Transição "entrar na tela"** (`.view-in`, keyframe `viewIn`, respeita
  `prefers-reduced-motion`). Barra inferior escondida no onboarding via `appnavShow()`
  (substituiu os antigos `$('#tabs').style.display`). CSS na seção "APP SHELL" do
  `premium.css`. A antiga `.tabs` foi aposentada (`display:none`).

### Orientação guiada: "pensa pela pessoa" (a partir de 2407.05)
A pedido da Carla (usuário novo não sabia por onde começar; "não remova nada").
Camada de wayfinding por cima de tudo, sem remover recursos: (1) **boas-vindas**
que explicam as duas frentes (negócio por fora + você por dentro); (2) roteiro
**"Comece por aqui · Sua jornada, passo a passo"** na Home: 8 passos numerados
com status/progresso e CTA que leva ao lugar certo; (3) faixa **"Próximo passo · N/8"**
sempre no topo (abaixo da nav), em toda tela. Estado em `S.af`; passos em
`AF_JORNADA` (detecta conclusão pelo estado real); `renderJornada()` (prepend na
Home via `bHomeHook`), `afGuiaUpdate()` (faixa, ligada em `go()`), `afMetodo()`
(boas-vindas). CSS na seção "ORIENTAÇÃO GUIADA" do `premium.css`.

### Evolução "Vivo: joia sobre carbono" (a partir de 2407.04)
A pedido da Carla ("cores mais vivas, algo mais interessante de ver"), a cor
voltou como **pedras preciosas profundas** (naipes: topázio, turquesa, âmbar,
ametista, safira, esmeralda, rubi, aço, rosa, citrino): cor vibrante no
**conteúdo**, chrome permanece ouro. Fundo com auroras de joia, cartas do baralho
como **gemas retroiluminadas** (glow na cor do naipe), radar com gradiente/brilho,
eixos coloridos. Hues em `BNAIPES`/`BEIXOS` (motor); brilhos/fundos na seção "VIVO"
do `premium.css`; radar enriquecido em `radarSVG` (base).

### Direção visual: "Cofre Privado" (a partir de 2407.03)
Linguagem premium: carbono quente + ouro-champanhe + pergaminho, tipografia
editorial (Fraunces + versaletes), fios de ouro, cantos secos, **sem emoji** no
chrome e **sem arco-íris** de naipes (monocromático ouro). Tokens retunados no
`:root` da base; camada de refinamento em `scratchpad/premium.css` (injetada por
último, vence a cascata); emojis de conteúdo removidos da base **fora** do bloco
de dados (módulos/troféus preservados). Ver conceito em
`Operação Blindada: Cofre Privado (direção visual) 2407.01.html`.

### Como regenerar o produto unificado
Motor da Bússola em `scratchpad/bussola_engine.js` + `bussola.css` + `premium.css`;
dados das 170 cartas em `scratchpad/data_D.txt`; injeção nos pontos exatos do
arquivo-base via `scratchpad/inject.cjs` (registra view, aba NAV, dispatch em
`go()`, campo em `defaultState()`/boot; injeta bússola.css + premium.css). Acesso:
`PREVIEW=true` quando aberto via `file://` (standalone, sem login); hospedado exige
login Supabase (trava de acesso mantida).

## Contexto

Autora: Carla Caroline. Bússola/frase-guia dos métodos:
*"Seus padrões de comportamento definem seus acontecimentos."<br>Carla Caroline*.
