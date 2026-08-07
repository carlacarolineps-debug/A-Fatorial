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

- `Operação Blindada 0608.03.html`: **PRODUTO PRINCIPAL** (unificado). A mentoria
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

### O erro que só aparecia no Supabase de verdade (0608.04)
A Carla mandou o erro: *"não é possível atualizar a tabela access porque ela
não possui uma identidade de réplica e publica atualizações"*, na linha 91.

**A causa, e por que o meu teste não pegava.** No Supabase a publicação
`supabase_realtime` costuma nascer como **FOR ALL TABLES**: a tabela passa a
publicar atualizações no instante em que é criada. O meu banco de teste criava
a publicação **vazia**, então o cenário dela nunca acontecia aqui. O arquivo
configurava a identidade de réplica na linha 110, mas o primeiro `update` em
`access` estava na linha 91, dezenove linhas antes. No banco dela, morria ali,
e as 18 tabelas não nasciam.

Corrigido com `replica identity full` logo depois do `create table` (não
depende de índice nenhum), trocado mais abaixo pela versão por índice, que é
mais barata, quando o único já existe.

**Um segundo erro apareceu logo atrás:** `alter publication supabase_realtime
add table` **falha** quando a publicação é FOR ALL TABLES, com um código
diferente de `duplicate_object`. O `exception` só pegava o duplicado, então o
arquivo morria de novo, agora na linha 817. Virou `when others`, com aviso:
numa publicação que já publica tudo, não há o que acrescentar.

**A lição, e o que mudou no teste:** `supabase/testes/00-aplicar-schema.sh`
agora aplica o schema **nos dois modos de publicação**, três vezes em cada, e
roda o ataque nos dois. Banco de teste que não reproduz a configuração do
banco de verdade é banco de teste que aprova o que vai quebrar.

Resultado nos dois modos: **0 erros, 18 tabelas, 37 cenários de ataque
passando**, e idempotente em três rodadas seguidas.

### O pg_cron derrubava o schema inteiro (0608.04)
A Carla: "me mande o arquivo que tenho que colocar no SQL pois deu erro".

O `create extension if not exists pg_cron;` era a única linha do arquivo que
eu **não conseguia testar aqui**: no Postgres local eu trocava ela por um
comentário. Numa conta em que o pg_cron não está ligado, ela falha, e a falha
derruba o arquivo na linha 770: **as 18 tabelas não são criadas por causa de
um agendamento** que serve para uma régua de cobrança que ela nem usa ainda.

Agora o bloco inteiro vive dentro de um `do $$` com `exception when others`:
se o pg_cron não existir, o schema **avisa e segue**. Testado com o schema
`cron` apagado do banco de teste: 18 tabelas criadas, zero erros, e os 37
cenários de ataque continuam passando. Rodar por cima de novo também dá zero.

Lição que vale para o resto: toda linha que depende de extensão ou de
permissão de plataforma precisa ser opcional, senão ela decide o destino de
tudo que vem depois dela.

### Auditoria completa e o guia para leigo (0608.03)
A Carla: "quero que já de uma olhada em tudo para ver o que está funcionando
ou não, e no final me falar tudo que eu ainda tenho que fazer eu mesmo passo a
passo para um burro conseguir fazer".

**A auditoria** (`testes/auditoria.cjs`) abre o arquivo do jeito que ela abre,
com dois cliques, em `file://`, sem banco nenhum, e confere 46 coisas: as 16
telas, as 5 abas da mesa, os 6 campos de publicar, as 8 funções de conta e
moderação, o visual e a contagem de conteúdo. **46 conferências, 0 falhas,
nenhum erro de JavaScript.**

**A mesa só aparece para a conta da mentoria.** Cheguei a deixar um modo
amostra para ela conhecer as telas sem banco, e ela cortou na hora:
"preciso que o admin só apareça quando fazer login nessa conta". Está certa,
e a regra ficou limpa: `adEhMentora()` depende só de `OB.isMentor()`, que lê
`eh_mentora()` no banco, que lê a tabela `mentoras`. Nem em pré-visualização
local a mesa existe. Testado em três situações: arquivo local sem login,
aluna logada e a conta da mentoria.

**O guia** ficou em `COMECE-POR-AQUI.md`: quatro passos obrigatórios, cada um
com o link direto, o que clicar, o que tem que aparecer quando dá certo e o
que fazer quando dá errado. Mais a parte de usar a mesa (publicar áudio,
subir aula, marcar encontro, liberar aluna) e uma tabela de problemas comuns.

### A porta do app virou cartão de vidro (0608.02)
Segunda referência que a Carla trouxe do 21st.dev (`modern-stunning-sign-in`):
"coloque na parte do login mas que fique com a cara da operação".

**O que veio:** o cartão de vidro centrado (raio de 26px, gradiente do branco
translúcido para o fundo, blur e sombra funda), o logo em medalhão circular no
topo, os campos com fundo translúcido em vez de caixa com borda dura, o botão
em pílula, o fio de separação com opacidade baixa e o rodapé discreto.

**O que não veio, e por quê:**
- **o "Continue with Google".** O acesso é pelo e-mail da inscrição na TMB. Um
  login por Google criaria conta com um e-mail que pode não ser aquele, e a
  pessoa cairia na parede de acesso não liberado sem entender. Seria um
  caminho a mais para dar errado, não a menos;
- **os quatro avatares e o "junte-se a milhares"**. São fotos de pessoas reais
  de um serviço externo, o app precisa abrir sem rede, e o número seria
  inventado;
- **o "Sign up, it's free"**. O app não vende. Quem entra pela primeira vez usa
  o próprio botão de primeiro acesso, que já estava ali.

**Detalhe de engenharia:** o estilo desta tela mora dentro do próprio motor
(`OB_CSS`, injetado por `overlay()`), separado do CSS do app. É a única tela
do produto que **precisa aparecer certa mesmo que o resto falhe em carregar**:
se ela depender de qualquer outra coisa, o dia em que aquela coisa falhar a
pessoa fica olhando para uma página branca sem saber o que fazer.
As 21 chamadas que montavam `style="..."` com as constantes `btnCss`,
`inpCss` e `linkCss` viraram `class="obg-bt"` e companhia.

### A barra de baixo virou pílula flutuante (0608.01)
A Carla rodou o 21st.dev na máquina dela e trouxe o `floating-nav`: "use esse
mas mantenha as cores".

**O que veio de lá foi a ideia, não o código.** Aquilo é React com Tailwind, e
este app é JavaScript puro num arquivo só: converter as 22 mil linhas para
React seria refazer o produto inteiro para ganhar uma barra. Portei as três
ideias que fazem o componente:

1. **a barra flutua**, em pílula, 10px acima da borda, com sombra e blur, em
   vez de colada embaixo com borda reta;
2. **um indicador único desliza**: `navFio()` mede o botão ativo
   (`getBoundingClientRect`) e leva a pílula até ele. O `spring` deles
   (stiffness 400, damping 30) virou `cubic-bezier(.34,1.32,.42,1)`, que é o
   mesmo assentamento sem biblioteca. O traço de 3px que ficava em cima de
   cada aba (`.anav.active::after`) saiu: agora é um só, e ele anda;
3. **abaixo de 360px o rótulo sai** e ficam só os ícones.

**O que não veio, de propósito:** o azul e o branco do original (a cor
continua carbono e ouro), e o `mb-64`, que empurrava a barra 16rem para cima
e era sobra da demonstração deles.

**Dois detalhes que só aparecem em uso:** a primeira medição roda com
`.sem-anim`, senão a pílula entra voando da esquerda toda vez que o app abre;
e `document.fonts.ready` remede, porque a fonte que chega depois muda a
largura do rótulo e a pílula ficaria fora de lugar.

### A revisão adversarial achou quatro furos críticos (0508.07)
Deixei rodando uma revisão com cinco leituras independentes (RLS, webhook,
entrada, moderação, lojas) e três céticos por achado, tentando derrubar cada
um. Voltou com **27 achados confirmados por maioria**, 4 críticos. Conferi os
quatro no código antes de mexer, e os quatro eram reais.

**1. O app nunca abria sem internet, e a promessa dos 7 dias era código
morto.** Testei no navegador com o pacote embutido: o supabase-js **não
rejeita** quando a rede falha, ele **resolve com `error` e `status: 0`**. Como
`lerAcesso` fazia `if (r.error || !r.data) return PENDENTE`, qualquer falha de
transporte virava "acesso não liberado": a aluna em modo avião via a parede
com um acesso pago e ativo, e `showOffline`, `caminhoOffline` e
`LIMITE_OFFLINE` nunca executavam. Pior: `marcaOnline()` era chamado em
conferências que nunca chegaram ao servidor, então o relógio dos 7 dias se
renovava sozinho num aparelho offline. Agora o `status` separa "o servidor
disse não" (401, 403, 406: PENDENTE) de "a pergunta nem chegou lá" (0, 5xx,
`!navigator.onLine`: OFFLINE).

**2. Perda de progresso ao trocar de celular.** `pullState` fazia
`if (r.error) return;`, calado. Quem reinstala ou troca de aparelho chega com
o localStorage vazio: a leitura falhava, o app abria no cadastro do zero, ela
digitava o nome e o primeiro `save()` subia o estado vazio por cima de meses
de trabalho. Agora `leituraOk` trava o envio (`push` guarda no aparelho e não
sobrescreve o servidor) e, com o aparelho vazio, a tela diz **"não consegui
carregar o seu progresso, nada foi perdido"** em vez de abrir em branco.

**3. XSS na galeria.** `modAcoesUGC` montava o `onclick` com o texto do
usuário, e o `escapeHtml` do app troca `&`, `<`, `>` mas **não troca aspas**.
Uma legenda como `Top" onmouseover="..."` injetava um atributo no botão e o
código rodava no aparelho de quem só passou o dedo pela galeria (reproduzido
em Chromium: o atributo aparecia e a variável marcada ia para 1). E uma
legenda com apóstrofo quebrava o clique, então a foto ficava **sem o botão de
denunciar**, que é justamente o conteúdo que alguém escolheria para atacar.
Agora o botão carrega só um índice e o texto mora numa lista
(`window.__modUGC`, zerada a cada render). O mesmo passe escapou o nome no
ranking e a URL da foto no `src`.

**4. O balde `galeria` não existia.** `cmPublicarFoto` subia para
`OB.midiaUpload(f,'galeria')`, mas o schema só cria `audios` e `midia`. Toda
foto caía no salvamento local: ninguém mais via, e o item local não tem
`user_id`, então aparecia **sem Denunciar e sem Bloquear**. É exatamente o que
a revisão da loja testa. Passou a usar `midia`, que existe e tem policy.

**Mais um, no banco:** `aplicar_regua_inadimplencia()` é `security definer` e
escreve em `access`. O Postgres dá `EXECUTE` para `PUBLIC` em toda função
nova, então qualquer pessoa logada podia disparar a régua. Fechado com
`revoke execute ... from public, anon, authenticated`.

**Também corrigido:** dentro da tela travada do termo, os links de Termos e
Privacidade não abriam nada (o próprio `modal()` recusa ser sobrescrito
enquanto uma tela espera decisão). Agora `modLerDoTermo` abre o documento e
oferece voltar para as regras.

**Os 23 achados restantes** (webhook sem checagem de erro, ordem de eventos,
número de parcela, ranking sem filtro de bloqueio, `excluir_minha_conta` e as
parcelas por e-mail) estão no relatório e ficaram para o próximo passe: são
altos e médios, não críticos, e nenhum deles impede subir.

### A barra de baixo entrou no padrão do mercado (0508.06)
A Carla: "quero que pegue os melhores apps do mercado e faça para que fique
igual para que rode igual de forma simples, pois não é um app complicado".

**Antes de mexer, medi.** Num celular simulado 4x mais lento que o computador
(a referência que o Google usa para "aparelho mediano"): primeira pintura em
**256ms**, carga completa em **805ms**, troca de tela entre **8 e 47ms**
(abaixo de 100ms o olho lê como instantâneo), rolagem a **60 quadros por
segundo**, e **753KB comprimidos** uma única vez (o Instagram passa de 2MB só
de JavaScript). Ou seja: velocidade não era o problema, e não havia o que
consertar ali.

**O que estava fora do padrão era a barra de baixo: sete destinos.** A
diretriz da Apple fala em até 5, a do Android em 3 a 5, e todo app grande
respeita. Com sete, cada alvo cai para 59px num celular de 412px, os rótulos
encolhem e a barra passa a parecer menu de site. Agora são cinco, o caminho de
todo dia: **Início, Treino, Trilhas, Plano, Mais**.
A Bússola e o Diário não sumiram: abrem a lista da tela Mais, seguem no mapa
da operação na Home e continuam sendo o que o mentor mais indica. Para voltar
ao que era, basta devolver os dois nomes à linha do `PRIMARY`.

### Senha, primeiro acesso por código, e o que só existe no aparelho (0508.05)
A Carla: "preciso que tenha recuperacao de senha, codigo de 6 digitos para
primeiro acesso"; "o email da pessoa precisa ser o mesmo email em que ela vai
comprar na TMB"; "quero que tenha varias funcoes com o iphone tambem".

**1. A entrada virou senha, e isso resolve um problema de aprovação.** Antes
era código a cada login. Três motivos para mudar: a pessoa entra em 3 segundos
sem depender de o e-mail chegar (dependência de e-mail é a coisa mais frágil
de um app); sem rede boa o código simplesmente não chega; e **a revisão da App
Store precisa de uma conta de teste, e o revisor não tem acesso a caixa de
e-mail nenhuma**, então login só por código trava o revisor e reprova. É uma
das causas mais comuns de reprovação.
O código continua onde é insubstituível: **provar que o e-mail é seu**, no
primeiro acesso e na recuperação. Fluxo: e-mail e senha na tela principal, com
"é o meu primeiro acesso" e "esqueci a minha senha" levando ao mesmo caminho
de código, e daí para criar a senha. `esperandoSenha` trava o
`onAuthStateChange`: a sessão nasce no código, mas o app **não abre** antes de
a senha existir.
**Senha errada e conta inexistente dão a mesma mensagem**, de propósito: dizer
qual dos dois é entrega a lista de e-mails da turma para quem tenta adivinhar.
Regra da senha: 8 caracteres, não só números, não conter o e-mail. No
Supabase, dois interruptores documentados: mínimo de 8 no servidor e a
proteção contra senha já vazada.

**2. O e-mail da TMB.** A tela de acesso pendente passou a dizer, em ouro, que
o e-mail precisa ser **exatamente o mesmo** da inscrição, e o botão de suporte
abre um e-mail já escrito, com os dois endereços para a pessoa preencher.

**3. O que só existe no aparelho (`nativo.js`).** Face ID ou digital para
reabrir o app depois de 5 minutos fora (a senha continua sendo a verdade: a
biometria é o cadeado local, nenhuma senha fica guardada no aparelho por causa
disso); o **lembrete do treino** por notificação local, na hora que ela
escolher (local, não push: não precisa de servidor, nem de certificado da
Apple, e funciona sem internet); compartilhar pela folha do sistema; e vibração
curta no que se completa. Tudo defensivo: sem o plugin, a função não faz nada
e nada quebra.

**4. Trocar a senha dentro do app**, na tela Mais, junto com Face ID e o
lembrete, que só aparecem quando `window.EM_APP` é verdadeiro.

**Testes:** `testes/entrada.cjs` cobre os nove blocos da porta (24 conferências,
todas passando), incluindo a que mais importa: senha errada não entrega se a
conta existe. `testes/sessao.cjs` ficou com o que acontece depois de entrar.

### A mesa da mentoria, e o app rodando no celular (0508.04)
A Carla: "preciso que isso rode como um app mesmo"; "quero um lugar para ir
testando esse app, se der pelo celular"; "preciso de uma area de admin para
conseguir postar as coisas e fazer alteracoes, quero que essa parte de contas
fique totalmente pronta e segura".

**1. A área de admin (`admin.js`), uma mesa só.** Antes cada coisa que ela
precisa fazer morava numa tela diferente: o áudio na Mentora, o encontro na
Comunidade, a aula em O Ano, a caixinha em outro canto, as denúncias dentro de
Mais. Agora existe **A sua mesa**, com cinco abas: **Painel** (os números do
banco na hora, mais a fila do que está esperando decisão, com a denúncia em
vermelho), **Publicar** (áudio do dia, aula da semana e encontro, os três no
mesmo lugar), **Alunas** (busca, quem está dentro, há quanto tempo cada uma
mexeu, e os botões de liberar e encerrar), **Perguntas** e **Moderação**. Ela
abre a lista da tela Mais, e só existe para quem conduz.

**2. A segurança não mora na tela.** Cada ação da mesa passa por uma função no
banco que confere `eh_mentora()` **dentro dela**: `liberar_acesso(email)`,
`encerrar_acesso(email)`, `alunas_admin(busca)`, `resumo_admin()`. O cliente
continua sem escrever em `access`. Esconder o botão é cortesia com quem usa,
não é proteção. `encerrar_acesso` recusa encerrar quem está na lista de
mentoras (a Carla não se tranca fora por engano) e **não apaga progresso**:
quem voltar, volta de onde parou. O ataque ao banco foi de 22 para **37
cenários, todos passando**, com cinco novos só sobre o admin (aluna não se
libera, não encerra ninguém, não lista a turma, não vê os números e não lê o
progresso das outras).

**3. O app já roda como aplicativo, hoje, sem loja.** O mesmo arquivo virou
site em `docs/`, e `inject.cjs` passou a atualizar os dois de uma vez (sem
isso, um dia a cópia ficaria velha). A Carla liga o GitHub Pages uma vez e
abre o endereço no celular: **Instalar aplicativo** no Android, **Adicionar à
Tela de Início** no iPhone. Tela cheia, ícone do escudo, funciona sem
internet. Está em `TESTAR-NO-CELULAR.md`, com a tabela do que muda entre isso
e a versão da loja (resposta curta: encontrabilidade e notificação, não o app
funcionar).

**4. O pacote da loja, em `app/`.** `preparar.sh` monta o `www`, instala o
Capacitor, cria os projetos Android e iOS, gera os ícones do próprio isotipo e
sincroniza. O APK não sai deste ambiente porque o SDK do Android não está aqui
e a rede bloqueia o Google, então o script é feito para rodar na máquina dela.

**Corrigido no caminho:** o contador em cima das abas (denúncias, perguntas)
nascia do resumo, que chega depois do primeiro desenho, então o número só
aparecia quando ela trocasse de aba, que é quando já não importa. Agora a
barra se redesenha sozinha quando o resumo chega.

### O login fechado e o banco provado num Postgres de verdade (0508.03)
A Carla mandou a chave anon e pediu: "preciso que toda parte de login ja
esteja totalmente pronta e todo o backend esteja feito tambem"; "quero o
melhor aplicativo possivel e que ja esteja pronto para subir".

**1. O schema virou coisa testada, não coisa escrita.** Subi um PostgreSQL 16
local, simulei o que o Supabase traz pronto (papéis, `auth.uid()`, `auth.jwt()`,
schema `storage`, publicação do Realtime, dublê do pg_cron) e rodei o arquivo
de verdade. Ele acusou o que nenhuma leitura tinha visto: **`access` não tinha
identidade de réplica**. A tabela entra na publicação do Realtime (é ela que
fecha o app ao vivo quando o acesso cai), e tabela publicada que sofre update
precisa de `replica identity`. Sem isso, **todo update em `access` falharia**:
webhook que não libera, régua que não corta, suspensão que não suspende. Tudo
calado. Corrigido com `replica identity using index access_email_uk2`. O
arquivo agora aplica limpo **três vezes seguidas**, do zero. Os testes ficaram
em `supabase/testes/`.

**2. Escalada de privilégio, achada por revisão adversarial.** `revoke update
on profiles` travava `is_mentor` no update, mas o **INSERT estava aberto**: a
linha do perfil nasce no primeiro login, então bastava criar a própria linha
já com `is_mentor = true`, fora do app, direto na API com a chave anon. A
conta viraria mentora e leria a caixinha inteira com o e-mail de todas. Duas
correções sobrepostas: `revoke insert` com grant só nas quatro colunas de
identidade, e **`eh_mentora()` deixou de ler `profiles.is_mentor` e passou a
ler a tabela `mentoras`**, com RLS ligado e nenhuma policy (ninguém logado lê
nem escreve). A coluna continua, mas só para a interface saber o que desenhar.

**3. "Removi o conteúdo" não removia nada.** O botão do painel de moderação
só marcava a denúncia como resolvida, e a foto seguia visível para todo mundo.
É exatamente o teste que as lojas fazem. Agora existe `remover_conteudo(tipo,
id)`, que apaga de verdade, e o painel **mostra a foto denunciada**: decidir
sem ver não é decidir.

**4. O app não abria sem internet.** A leitura do perfil rejeitava antes de a
corrente chegar na checagem offline, e a pessoa ficava numa tela preta, sem
mensagem e sem botão. Cada etapa passou a cair sozinha (`seguro()`), falha de
rede virou OFFLINE e OFFLINE tem caminho.

**5. Progresso vazando entre contas no mesmo celular.** A Ana usa, sai, a Bia
entra no mesmo aparelho e, como a Bia não tem nada no servidor, o app mandava
o progresso da Ana para a conta da Bia. Agora o aparelho guarda **de quem é**
o que está nele (`ob:dono`), e o que não é de quem entra é descartado antes de
qualquer envio. E o que foi feito offline não é mais atropelado pelo servidor:
`ob:mudou` contra `ob:enviado` decide quem é a versão boa.

**6. O resto do login:** erro do servidor em português com o que fazer,
e-mail validado antes de gastar um envio, reenvio com espera de 60 segundos
(apertar cinco vezes batia no limite e a pessoa parava de receber), tela "não
recebi o código" com os quatro caminhos, código aceito com espaço colado.
Onze cenários testados no navegador com o Supabase trocado por um de mentira
(`testes/login.cjs`), a trava de acesso ligada.

**7. `get_ranking` não devolvia posição:** o app imprime `r.posicao` e todo
mundo fora do pódio saía como "undefined". E o "você" era marcado por empate
de XP. Agora a função devolve `posicao` e `eu_sou`.

**8. Menos passo manual para a Carla:** o schema já deixa o acesso dela ativo
e um gatilho marca a conta como mentora no primeiro login. E as capturas de
tela das duas lojas foram geradas do app rodando (`loja/capturas/`), nos dois
tamanhos exigidos.

**Ferramenta nova:** `tools/confere-schema.py` compara cada tabela, coluna,
função e bucket que o app usa contra o que o schema cria. Foi ele que achou o
`onConflict: "email"` batendo num índice de expressão `lower(email)`, que faria
**todo upsert do webhook morrer** com "no unique or exclusion constraint
matching".

### O app virou aplicativo publicável (0508.01)
A Carla: "preciso que esse app esteja pronto até sábado, preciso que esteja
tudo no jeito para começar". O prompt mestre pedia sair do estado atual até
poder subir nas duas lojas, com sete regras inegociáveis (conteúdo pedagógico
intocado, zero comércio do próprio app, RLS como autoridade, nenhuma chave
secreta no cliente, migration destrutiva só com aval, sem travessão,
identidade visual preservada).

**1. O comércio do app saiu inteiro, e a régua mudou de eixo.** A indicação
era o motor de desbloqueio: cada convite enviado abria uma pesquisa. Isso é
justamente o que faz a Apple exigir compra dentro do aplicativo, com 30%.
Saíram: `INVITE_URL` (o perfil comercial), `openReferral`, `regReferral`,
`copiarConvite`, o bloco "Construa junto e ganhe", a faixa de indicação em
Pesquisas, o troféu "Embaixador(a)" (virou "Presente", por confirmar presença
em encontro), a "renovação antecipada" em O Ano e o arroba no rodapé da folha
A4. As três funções continuam existindo **vazias**, para nenhuma chamada
esquecida quebrar a tela de quem usa.
A régua nova é a do método: **o instrumento abre quando existe trabalho feito
para interpretá-lo**. DISC pede o autodiagnóstico; Clima 1 trilha; Inteligência
Emocional 2; Âncoras 4; Cultura 6; Caráter 8; Estilo de Liderança 10.
`S.unlocks[id]` segue como chave mestra, e quando uma trilha fecha e abre um
instrumento o app avisa na hora (`testesAbertosAgora`), senão a régua seria
invisível. A auditoria linha a linha do que é venda e do que é conteúdo da
mentoria está em `loja/auditoria-comercial.md`: o "comprar" das trilhas de
Finanças, Processos e Estratégia **não foi tocado**.

**2. Moderação, porque existe conteúdo de usuário** (`moderacao.js`). As lojas
cobram quatro coisas juntas, e agora as quatro existem: a regra de convivência
numa tela **travada** antes do primeiro uso (sem × e sem fechar por fora, com
aceite gravado com data e versão em `S.termo` e na tabela `termos`); os botões
**Denunciar** e **Bloquear** em toda foto da galeria e todo cartão de membro;
o bloqueio com efeito **imediato** na tela (cache local em `MOD_BLOQ`, filtro
`modFiltra` em cada render, sem esperar servidor); e o **painel da mentora**,
com o relógio de cada caso virando vermelho depois de 20 horas, e as três
saídas (removi o conteúdo, suspender a conta, não viola a regra).
`modal()` ganhou `{trava:true}` e passou a **recusar ser sobrescrito** por um
aviso qualquer: tela que espera decisão não é roubada. O termo espera a vez
por até 10 minutos, em vez dos 14 segundos da primeira versão, que deixavam
a pessoa entrar na comunidade sem nunca ter visto a regra.

**3. Entrada por código de 6 dígitos.** O link mágico abre o navegador do
sistema, e o navegador não é o app: a sessão nascia do lado de fora e a pessoa
voltava para a mesma tela de login. Agora `signInWithOtp` sem `emailRedirectTo`
e `verifyOtp` com o código digitado ali dentro, com reenviar, trocar de e-mail
e avanço automático ao sexto dígito. **Exige um passo manual**: o modelo de
e-mail do Supabase precisa incluir `{{ .Token }}`.

**4. Acesso: máquina de estados e revalidação ao vivo.** `lerAcesso()` consulta
por `user_id` **ou** e-mail (a inscrição chega pelo webhook antes de a conta
existir, e o `user_id` é casado no primeiro login), devolve ATIVO, PENDENTE,
INATIVO ou OFFLINE, e **consulta vazia é sempre sem acesso**. `vigiarAcesso()`
liga Realtime na própria linha, reconferência a cada 15 minutos e no
`visibilitychange`: se o acesso cair durante o uso, a tela avisa em vez de
deixar a pessoa trabalhando num app que já não é dela. **Sete dias de tolerância
sem rede** (`LIMITE_OFFLINE`), senão bastava o modo avião para usar para sempre
um acesso encerrado.

**5. O app abre sem internet.** As três famílias de fonte viraram `@font-face`
em base64 (`fontes.css`, 262KB de base64 para 193KB de woff2) e os links do
Google saíram: antes, a primeira abertura sem rede saía com a fonte do sistema.
O supabase-js saiu do CDN e passou a ser embutido no arquivo. `sw.js` (rede
primeiro, cache como rede de segurança) e `manifest.json` para a versão
hospedada.

**6. Imprimir, dentro do app.** `window.print()` não faz nada no WebView do
iPhone nem no do Android: os botões "Imprimir A4" estavam mortos no build de
loja. `obImprimir()` mantém a caixa de impressão no navegador e, dentro do
app, transforma a folha em **arquivo** (`.html` autônomo com o mesmo CSS de
impressão, extraído do próprio build por `PRINT_CSS` no `inject.cjs`), para
guardar, mandar ou imprimir de fora.

**7. As regras da casa no aparelho** (`obNativo`). O botão físico de voltar do
Android fecha o modal, depois volta de tela, e só sai com dois toques na Home.
Link externo abre no navegador do sistema em vez de prender a pessoa dentro do
app. O teclado empurra a barra de baixo em vez de cobrir o campo. Voltar para
a frente reconfere o acesso.

**8. O que ficou fora do app**, em `loja/`: os ícones gerados **do próprio
isotipo** (192, 512, maskable, 1024, splash), `manifest.json`, `sw.js`,
`capacitor.config.json`, `package.json`, as três páginas públicas exigidas
pelas lojas (`privacidade.html`, `termos.html`, `suporte.html`), o passo a
passo completo (`README.md`), a auditoria comercial e o roteiro de teste
manual.

**Bug de CSS corrigido no caminho:** `.lg-forte` perdia a cor de ouro para
`.lg-box p`, que tinha mais especificidade. Virou `.lg-box p.lg-forte`.

**O que ainda depende da Carla:** rodar `supabase/01_schema.sql` no SQL Editor
(o banco está vazio: 0 tabelas, 0 usuários), colar a chave anon no lugar de
`COLE_AQUI_A_ANON_KEY`, incluir `{{ .Token }}` no modelo de e-mail e publicar
a Edge Function do webhook. O MCP do Supabase não é alcançável deste ambiente:
a política de rede bloqueia `mcp.supabase.com` no gateway.

### A condução, a cor por área e o movimento (3007.01)
A Carla: "quero que o sistema ajude o usuário a pensar e navegar, não dá para
ser solto"; "pense nas cores do sistema completo para ficar bonito, sexy,
moderno e agradável, não quero visual cansativo"; "coloque movimento, use
transições, inclua direcionamento após concluir para seguir para a próxima
etapa, as pessoas têm preguiça, então precisa ser conduzida de verdade".

**1. Nada termina em toast: a tela "feito, e agora" (`okFeito`).** Toda
conclusão passou a abrir uma tela com quatro partes: o visto que se desenha
(SVG `stroke-dashoffset`), o selo do que foi feito, o XP que sobe contando, a
lista do que aquilo alimentou (pilar do EMC, cofre, plano) e, em destaque, **o
próximo passo com botão grande**, vindo do mentor (`czProx` filtra a regra que
acabou de ser cumprida, para não repetir o que ela já fez). Ligado em: ação do
Plano concluída, sessão do treino, protocolo de 5 dias fechado, prova guardada,
check-in da semana, fechamento de ciclo, reflexão no Diário, dia do ciclo de 30
dias e desafio entregue.
Quando o fluxo já termina com um documento na tela (ferramenta, ferramenta do
líder, plano da carta, teste profundo), a conclusão **não abre modal por cima**:
o próximo passo entra embaixo do documento (`czDocProx`/`czDocProxNo`). Era o
erro da primeira versão: o `okFeito` ficava na fila esperando o modal fechar e
aparecia fora de contexto.

**2. Nenhuma tela termina sem saída: o rodapé "e agora" (`czRodape`).** As 13
telas internas passaram a terminar com um bloco de condução: a ação da vez, o
porquê em voz de mentoria, o botão, a área e o tempo, mais dois atalhos em
"depois disso". Ele **aponta para frente**: se a ação da vez mora naquela mesma
tela, o rodapé oferece a seguinte. Instalado por `czInstalar()`, que envolve as
13 funções de render, então o bloco sobrevive à troca de aba dentro da área
(Plano, Apostila, Treino, Gestão), que não passa pelo `go()`.

**3. Dentro da aula também se conduz (`czAulaSegue`).** Marcar um passo abre o
seguinte, rola até ele e acende a linha por 2 segundos. Quando os passos
terminam, a tela empurra para o quiz com o aviso do que falta para a trilha
fechar. Antes, marcar a aula deixava a pessoa parada na mesma tela.

**4. A cor do sistema, com significado.** A base saiu do marrom para carbono
neutro e profundo (`--ink:#0b0a0c`, `--ink-2:#141317`, `--ink-3:#1d1c22`), e o
fundo perdeu os gradientes quentes fixos: quem pinta agora é o **acento da
área**. Quatro famílias, uma por frente do método: **ouro** (Início, Trilhas,
Plano, Ferramentas, Conquistas), **verde jade** (Meu Treino e A Apostila, o
pilar Comportamento), **violeta** (A Bússola e o Diário, o pilar Mentalidade) e
**aço azul** (Gestão, Pesquisas, O Ano, Comunidade, A Mentora). `czArea(view)`
marca `body[data-area]` e o acento pinta o rótulo, a âncora do título, a aba
ativa, o fio do topo, a aurora do fundo e os blocos de condução. A pessoa passa
a saber onde está pela cor. O ouro segue sendo a marca: isotipo, botão primário
e o que mede.

**5. Movimento.** Barra de progresso que cresce da esquerda (`czGrow` em
`transform:scaleX`, funciona mesmo com largura inline), pílulas e selos que
entram com pop, visto que se desenha, XP que conta, seta que anda no hover,
cartão que sobe, aurora que faz transição de 1,1s ao trocar de área e a cascata
de entrada de tela que já existia. Tudo dentro de `prefers-reduced-motion`.

### A Apostila ganha a força visual das Trilhas, e o isotipo volta a existir (2907.02)
A Carla: "mas pode ficar distribuído de uma forma que chame mais a atenção
como fez em trilhas".

**1. Bandas em vez de lista.** A área usa agora a mesma linguagem dos módulos
(`.mod-band` + `.mod-marca` + `.mod-title` + pílula de progresso): os manuais
viraram **três cadernos** (A fundação, páginas 1 a 77; O comportamento, 78 a
154; A liderança aplicada, 155 a 214), cada um com isotipo, faixa de páginas e
contador de lidos. As 30 ferramentas viraram **cinco frentes** numeradas com
contador por frente, e os desafios viraram **três níveis** em banda, com os
pontos em jogo no rótulo e a banda da faixa atual destacada em ouro.

**2. Um herói que abre a área.** Selo em medalhão, "216 páginas", o placar de
quatro números (capítulos, ferramentas, pontos e dias do ciclo) clicáveis, e o
bloco **"o que a apostila cobra hoje"** com o botão da pendência da vez (dia do
ciclo, desafio ou ferramenta). Quando não há nada em aberto, ele diz isso e
manda para o treino. No celular o selo e o carimbo de páginas ficam na primeira
linha e o título ganha a linha inteira.

**3. O bug que estava apagando o isotipo do app inteiro.** `shieldSvg` gerava os
gradientes sempre com os mesmos ids (`obG`, `obGl`, `obGb`, `obGd`). Com id
repetido, **todo** `url(#obG)` da página aponta para a primeira definição, que
mora no medalhão da marca no topo, e esse medalhão fica `display:none` em toda
tela interna. Gradiente definido dentro de elemento oculto não pinta: o escudo
virava um borrão preto nas bandas das Trilhas, nas telas de cadeado, no
questionário e na Apostila. Agora cada isotipo carrega ids únicos
(`svg.replace(/obG/g,'obG'+(++shieldSeq))`) e o ouro voltou em todos os
tamanhos, em todas as telas.

### O plano baixado também perdeu a sigla (2907.01)
A Carla achou a sigla "OB" ainda viva no cabeçalho do **plano de ação que a
carta baixa** (`bPlanDownload`, o `.html` autônomo). Aquele arquivo tem
cabeçalho próprio e ficou de fora do passe de 2807.02. Agora ele usa a mesma
linguagem da folha de impressão: wordmark "Operação Blindada" em serifa com a
assinatura embaixo, o selo **OPB** discreto à direita e o fio de ouro na base.
Varredura confirmou que não sobrou nenhum "OB" visível no produto: as
ocorrências restantes são todas o namespace `window.OB` do motor Supabase.

### A apostila oficial entra no sistema (2807.03)
A Carla mandou os três cadernos da apostila oficial (216 páginas em PDF) e
pediu: "quero incluir no sistema da operação, distribua da melhor forma e
conecte o que precisar".

**A decisão:** apostila não vira PDF para baixar, vira prática. O material
entrou por quatro portas, mais a ficha da mentoria preenchida sozinha.

**1. Seis trilhas novas, o módulo 07 "Alta Performance".** Escritas a partir
dos manuais dela, com as frases dela: `ap-planejamento` (diagnóstico da
realidade, SWOT com honestidade brutal, SMART, quebra em 30 dias, KPI com
frequência, risco e plano B), `ap-networking` (os três princípios, o teste da
rede, o mapa e o pitch em três frases), `ap-accountability` (os cinco pilares,
o mapa da responsabilidade, a conversa de reposicionamento),
`ap-desculpability` (o diagnóstico das quatro perguntas, os três pilares, o
plano pessoal), `ap-psicologia` (ganho secundário, contrato psicológico não
dito, o sistema de cultura em cinco etapas, as quatro dinâmicas) e
`ap-influencia` (os cinco pilares, DESC completo, gatilhos e escuta ativa).
O app foi de 37 para **43 trilhas e 177 aulas**.
**Elas não entram na agenda das 52 semanas** (`pgNegocio` exclui o grupo, senão
o arco do negócio seria atropelado): têm semana fixa em `PG_SEM_APOSTILA`
(1, 9, 15, 23, 31 e 39), espalhadas na ordem da apostila. Dentro do módulo não
há escada (`isUnlocked` libera, como no baralho): cada uma abre na sua data.
Sem isso, seis trilhas abririam de uma vez e a trava anti-maratona cairia: com
a mudança, o dia 1 abre **3 de 43** trilhas (era 2 de 37).

**2. A caixa de ferramentas do líder: 30 modelos.** Os cadernos 2 e 3 são uma
sequência de "erro comum + modelo nomeado + exercício". Todos viraram
ferramenta que se preenche em dois minutos e sai como documento: DESC, CNV,
STAR, CAR, 3C, pitch, mapa de rede, Eisenhower, 5W2H, ABC, SMART, SWOT, visão
atual e ideal, mapa de microcomportamentos, contrato psicológico, manual de
funcionamento pessoal, liderança situacional, 4D, regra 70/30, Johari, mapa da
responsabilidade, PDCA, SCAMPER, PAD, 4P, 3 Cs, risco e plano B, Kotter,
transição em três fases e RER. Motor único e declarativo (`AP_FERRS` +
`apFerr`/`apFerrSalvar`): o resultado passa por `withResultActions` (salvar,
imprimir A4, Plano 30d, PDCA, agenda, diário) e tem **"virar ação no Plano
30d"** com prazo de 14 dias. Cada uma vale 25 XP, uma vez.

**3. Os Desafios dos Líderes de Alta Performance.** Os seis desafios dela, nos
três níveis (Jogador Estratégico, Executor de Elite acima de 30, Mestre da Alta
Performance acima de 60 com os seis entregues). **Sem evidência não há ponto**:
o texto da entrega vira **prova no cofre** (com o pilar EMC certo) e dá 40 XP.
As regras do jogo estão visíveis, incluindo o **cartão amarelo**: encontro que
passou sem presença confirmada tira 10 pontos, e justificar é um clique
(`apCartoes` lê `CM().eventos`, então quem não tem encontro publicado nunca
leva cartão).

**4. O ciclo de 30 dias contra o desculpability.** O plano pessoal das páginas
71 a 76 virou mecânica: a pessoa declara as áreas, as justificativas que usa, as
ações de correção e a **frase de blindagem**; depois marca **um dia por dia de
calendário** com a pergunta central ("hoje eu corrigi mais ou me expliquei
mais?"), o compromisso da manhã, a ação corrigida e a reflexão. Quadro de 30
quadrados (verde corrigi, vermelho me justifiquei), reflexão final em quatro
perguntas, prova no cofre e impressão do quadro inteiro em A4, com as linhas
vazias para quem preferir caneta.

**5. A ficha de Feedback de Acompanhamento, preenchida pelo app.** A ficha que
se repete a cada caderno agora sai pronta: evolução antes/agora nos três
pilares, nível de comprometimento (adesão ao treino), dedicação (provas e
pontos), ações pendentes, objetivos concluídos, procrastinação e progresso
financeiro do alvo (moeda antes do número). As três perguntas de fecho saem em
branco de propósito: elas se respondem à mão, no encontro.

**6. O índice que conecta.** A aba "Os manuais" lista os 12 capítulos com a
frase-chave, as páginas e **onde cada um vive no app** (trilha, ferramenta,
desafio ou área), com botão que abre. Nada de seção escondida.

**O que ficou ligado:** `emcScores` conta as ferramentas no pilar E, as trilhas
da apostila no M e o ciclo de 30 dias no C (com as três linhas novas no
detalhe); `pgExtras` oferece o dia do ciclo, o desafio da vez e a ferramenta
pendente como trabalho extra (não ocupa sessão); o mentor ganhou quatro regras
(`ap_ciclo` 89, `ap_cartao` 87, `ap_desafio` 63, `ap_ferr` 44); `XP_GRUPOS`
ganhou o grupo "A Apostila" com as seis formas de pontuar; a área entrou no
`GATES`, no `OVERFLOW`, na tela Mais e no mapa da operação.

### Patente de 12 meses, legibilidade e a folha de impressão (2807.02)
Cinco pedidos da Carla, todos com causa identificada.

**1. Fonte pequena demais.** O app tinha texto de 11px e rótulos de 9,5px.
Piso novo: nada abaixo de 12px, corpo em 15,5px, `.tiny` em 13px, rótulo de
seção em 11px. Quem usa todo dia agradece.

**2. "Pontua toda hora e sobe de nível fácil demais, sem critério."** Era
verdade: a escada terminava em 3.050 XP e uma semana do programa rende ~210,
então dava para zerar as 11 patentes em 15 semanas de um programa de 52.
- **A escada virou 12 meses**: `LEVELS` vai a 13.000 XP e ganhou `LEVEL_SEMANAS`,
  a segunda trava. `levelForXp` agora devolve **o menor** entre o nível por XP e
  o nível por **semanas fechadas com check-in**. Não dá para comprar tempo: a
  semana só fecha com as três sessões, a prova e o check-in.
- **O app parou de comemorar cada clique**: `addXp` só emite aviso e grava no
  histórico a partir de 20 XP. O resto soma calado.
- **O critério ficou visível**: `XP_GRUPOS` lista as 27 formas de pontuar,
  agrupadas (o treino, o plano, o conteúdo, a Bússola, a cadência), com o valor
  de cada uma. A tela Conquistas virou "Reconhecimento": patente atual, quanto
  falta de XP **e** de semanas, a tabela inteira, a escada com as duas travas em
  cada degrau, e as medalhas em aberto legíveis (78% em vez de 42%), porque é o
  texto delas que ensina o que fazer.

**3. Indicar: copiar o texto com o link.** `copiarConvite()` põe o convite
inteiro na área de transferência, com reserva para navegador que bloqueia
(abre o texto selecionável).

**4. Cor de fundo nas seleções.** O `<select>` usava o menu nativo (branco com
azul do sistema). Agora tem `appearance:none`, seta de ouro em SVG, fundo
carbono e `option{background:#171410}`, com `color-scheme:dark` nos campos de
data e hora.

**5. Fechamento de Ciclo sem exemplo.** As três perguntas ganharam
`placeholder` com exemplo real e uma linha em itálico (`.fld-ex`) que ensina o
critério: o que vale como vitória, como escrever o padrão ("sempre que ___, eu
___") e por que o ajuste precisa ser observável.

**6. A impressão.** Estava com texto cinza-claro sobre branco, caixas apagadas e
a sigla "OB". Reescrita inteira:
- **a sigla saiu**: o cabeçalho é o wordmark "Operação Blindada" em serifa, com
  o selo **OPB** discreto à direita e o fio de ouro embaixo;
- preto de verdade (`#22201c`) em 11,6pt, títulos em Fraunces de 26px;
- caixas com fundo creme (`#faf7ef`), fio de ouro à esquerda, e verde ou
  vermelho quando o conteúdo pede;
- a sequência numerada ganhou medalhão de ouro impresso, e os dias viraram
  **quadrados de 30px para marcar à caneta**;
- rodapé com **linha de assinatura** e a marca: o documento vira ferramenta,
  não folheto.

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
