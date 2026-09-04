# Ideia Que Vende

Dois sites num projeto só, publicados como um Worker da Cloudflare no
domínio `ideiaquevende.com.br`.

    public/index.html          landing pública      (~310 KB, gerada)
    public/aplicar/index.html  o formulário da casa (~216 KB, gerado)
    public/sistema/index.html  sistema de gestão    (~669 KB, gerado)
    public/proposta/index.html a proposta do cliente (~127 KB, gerada)
    src/                       rotas do servidor
    fonte/                     de onde a landing é gerada
    fonte/aplicar/             de onde o formulário é gerado
    fonte/sistema/             de onde o sistema é gerado
    fonte/proposta/            de onde a proposta é gerada

O repositório se chama `A-Fatorial` por herança: até 26 de agosto ele
serviu o sistema de gestão de outro negócio, o A! Fatorial, neste mesmo
endereço `/sistema/`. Aquele sistema não existe mais aqui. O que sobrou
dele são as chaves `af_` que podem estar vivas no navegador de quem
abriu naquela época, e que este sistema nunca lê nem apaga sozinho.

**Estado da publicação: leia o `DEPLOY.md`.** Ele começa com um bloco
"Onde estamos" com o que já funciona, o que falta e em que ordem.

Branch de trabalho: `claude/animated-shader-hero-thcafz`. É esse o
Production branch configurado em Settings → Builds, e é dele que a
Cloudflare publica. Push em outro branch não chega no domínio.

## Regras que valem sempre

**Não altere nada no Supabase.** Existe outro projeto sendo feito lá, de
outra pessoa. As ferramentas do Supabase podem estar disponíveis nesta
sessão; não é permissão. Só mexa se a Carla pedir explicitamente.

**Nada de travessão no site.** A Carla pediu que o caractere `—` não
apareça em texto nenhum da landing. Use vírgula, dois-pontos ou ponto.

**Escreva em português.** Comentários no código, mensagens de commit e
documentação. O código deste repositório é lido por quem toca o negócio,
não só por quem programa.

**Nada de linguagem de programador na tela.** Nome de variável de
ambiente, rota HTTP, caminho de arquivo do repositório e linha de shell
são para quem publica, e ficam nos comentários. Quem abre o sistema é a
Carla e a equipe dela.

**Aviso que aparece sempre não é aviso.** É parágrafo com borda colorida.
Se o texto vale para todo estado da tela, ele é uma linha em `.dica`, ou
não existe.

**A manchete é para o que precisa de alguém hoje.** A landing é capa de
revista e pode abrir com 46px. O sistema é ferramenta aberta quarenta vezes
por dia: manchete grande anunciando que nada aconteceu empurra para baixo
da dobra a única coisa que precisa ser feita. Quando não há notícia, a
frase é curta.

**A tira de números não repete a manchete.** Ela dá o que a manchete não
deu e que muda a decisão do dia. Zero sai apagado, com a classe `.zero`:
número que não aconteceu não grita do tamanho do que aconteceu.

**Número que vira contrato tem máscara, e não confiança.** CNPJ, CPF e
telefone entram em documento assinado, então o campo não deixa escrever
errado: aceita só dígito, para no comprimento certo e vai pondo ponto,
barra e parêntese enquanto a pessoa digita. Os dígitos verificadores são
conferidos antes de criar a proposta e antes de assinar. O motor está em
`30-base.js` (`mascararTudo`, ligado dentro do `escrever`) e repetido em
`fonte/proposta/30-motor.js`, que é outro pacote. O servidor continua
limpando o que chega, então a máscara é só o que se vê.

**Laranja é ação, e não "esta linha existe".** Se toda linha de uma lista
tem a mesma cor, a cor parou de significar alguma coisa. Vale para o
laranja da marca e para as etiquetas de sinal.

**O sistema é o miolo da mesma revista que a capa, e tem que parecer.**
A landing tem pílula com brilho, degradê laranja, cartão de canto redondo
com preenchimento radial e luz quente no fundo. O sistema tinha ficado com
canto de 4px, nenhuma sombra, botão de contorno chapado e preto liso, que
é o desenho de painel antigo. Os valores estão em `10-estilo.css`, tirados
de `fonte/page.tpl.html`: `--o-grad`, `--r-pilula`, `--sombra-1` e
`--luz-topo`. Ao criar componente novo, use esses, e não valores soltos.

**O que é objeto ganha caixa; o que é assunto ganha fio.** `.cartao` é um
projeto, um nível, uma pessoa: tem borda, canto e sombra curta. `.secao` é
uma divisão de assunto: é só um fio em cima e ar embaixo. Caixa dentro de
caixa some sozinha, pela regra do `:has` no fim do arquivo.

**Tela de trabalho não abre com formulário.** O que se olha todo dia vem
primeiro; o que se preenche de vez em quando mora numa `.dobra`, o
`<details>` da casa, que abre no clique e no teclado sem JavaScript. Foi
assim que "Roteiros e níveis" saiu de 13.322px de altura para 1.629.

## A landing não se edita direto

`public/index.html` é **gerado**. As duas fontes, o logotipo e o favicon
entram embutidos em base64, e é por isso que o arquivo tem 300 KB e não
faz nenhuma requisição a terceiros.

Para mudar a landing, edite `fonte/page.tpl.html` e rode:

```sh
cd fonte && python3 build.py
```

Editar o `public/index.html` na mão funciona uma vez e se perde no build
seguinte.

O `fonte/mklogo.py` reconstrói o logotipo horizontal a partir da arte
original. Só é necessário se a marca mudar.

## O sistema também é gerado

`public/sistema/index.html` sai de `fonte/sistema/`, com um build só dele:

```sh
cd fonte/sistema && python3 build.py
```

A ordem é `00-cabeca.html`, `10-estilo.css`, `20-moldura.html`, as dez
telas de `telas/`, `30-base.js` e `90-fim.js`. Os 35 ícones e a marca são
extraídos do `page.tpl.html` da landing na hora do build: os dois produtos
usam o mesmo desenho para a mesma coisa, e não há um segundo conjunto para
manter em dia. Regra em `fonte/sistema/CONTRATO.md`.

**O logotipo é o desenho, e não o nome escrito.** Até 04/09 a lombada e a
porta traziam o símbolo mais "IDEIA QUE VENDE" escrito com a fonte da casa
e espaço entre as letras, que é uma imitação do logotipo: o desenho de
verdade tem o triângulo dentro do A, o branco e o laranja se revezando e
os dois fios em volta do QUE. Agora entra o `fonte/logo_h_660.png`, o
mesmo arquivo que a landing embute, em base64 dentro do
`10-estilo.css`, uma vez só, como fundo de `.marca-h`. A altura fixa o
tamanho e o `aspect-ratio` dá a largura: 20px na lombada, 22px na porta.

### As onze telas e os três papéis

`semana`, `ideias`, `formulario`, `leitura`, `projetos`, `entrega`,
`roteiros`, `dinheiro`, `cliente`, `propostas`, `casa`.

A chave `casa` aparece na tela como **Configurações** desde 04/09. A chave
não mudou de propósito: ela está gravada nas permissões do navegador de
quem já usou o sistema, e trocá-la apagaria a tela para essas pessoas. Cada uma é um par
`telas/<chave>.html` mais `telas/<chave>.js`, e registra o próprio desenho
em `DESENHO[<chave>]`.

Os papéis são `gestor`, `colaborador` e `cliente`.

**A porta é da casa, e a senha mora no servidor.** Desde 02/09 a pessoa
entra com e-mail e senha, conferidos pelo `src/porta.js`. O Cloudflare
Access saiu: ele funcionava, mas a tela de entrada era dele, e a Carla
pediu login e senha para separar cada colaborador.

O que isso muda, e não é pouco:

- **A lista de pessoas saiu do navegador.** Ela vive na tabela `pessoas`
  do D1, então cadastrar alguém vale em qualquer computador. Antes cada
  navegador tinha a sua lista, e quem era cadastrada no computador da
  Carla simplesmente não existia no dela.
- **O papel filtra DADO, e não só tela.** `/leads` e `/api/mesa/` exigem
  `gestor` ou `colaborador`, conferidos no banco a cada pedido. Cliente
  não lê a mesa nem com o endereço na mão.
- **A senha nunca sai do navegador.** O que viaja é a **prova**: 210 mil
  voltas de PBKDF2 sobre a senha, com sal tirado do próprio e-mail. O
  servidor faz 2 mil voltas por cima disso e guarda só o resultado.

      guardado = barato( caro( senha ) )

  Isso existe por causa do plano grátis do Worker, que dá 10 ms de
  processador por pedido: as 210 mil voltas gastam uns 120, e o login
  falharia. Fazendo a conta no navegador, ela custa uns 100 ms na máquina
  de quem entra, uma vez por mês, e o servidor gasta menos de 2 ms.

  **O que importa continua de pé:** quem roubar a tabela inteira ainda
  precisa dar as 210 mil voltas para cada chute. O custo por chute não
  mudou, mudou de máquina.

  O sal sai do e-mail (`SHA-256` de `iqv-porta-v1:` mais o e-mail), e não
  de uma consulta. Perguntar "qual é o sal desta pessoa" antes de ela
  provar quem é contaria a qualquer um quais e-mails existem. Sal não
  precisa ser secreto: precisa ser diferente por pessoa.

  As regras (voltas e tempero) vêm do servidor, na resposta do `/eu`, para
  os dois lados nunca discordarem.
- **Quem cadastra escolhe a primeira senha**, sorteada pela tela, e a
  pessoa troca antes de ver qualquer coisa. Senha que andou por WhatsApp
  não fica valendo.
- **Desligar alguém derruba as sessões dela na hora**, e não daqui a um
  mês.
- **A casa nunca fica sem gestor**: a última gestora não consegue se
  rebaixar, se desligar nem se remover.

O crachá é um número sorteado de 32 bytes, num cookie `HttpOnly`, e o que
fica no banco é o SHA-256 dele. Vale 30 dias: doze logins por ano.

**Roda no plano grátis**, e é por isso que a conta cara mora no
navegador. Se um dia o `REGRAS_DA_PROVA.voltas` mudar, quem já tem senha
para de entrar: o número usado fica gravado em `senha_voltas` só para o
passo do servidor, e o do navegador é global. Mudar exige uma versão nova
no `REGRAS_DA_PROVA` e um período em que o navegador manda as duas provas.

### As oito rotas da porta

    GET    /eu               quem está entrando, e se já existe gente
    POST   /entrar           e-mail e senha
    POST   /sair             encerra a sessão no servidor, não só o cookie
    POST   /primeiro-acesso  a primeira gestora, só com a casa vazia
    POST   /minha-senha      a pessoa troca a própria senha
    GET    /pessoas          a lista (gestor e colaborador)
    POST   /pessoas          cadastra (só gestor)
    PATCH  /pessoas          papel, ligar, desligar, nova senha (só gestor)
    DELETE /pessoas          remove de vez (só gestor)

Tela nova não pode nascer invisível: as permissões ficam salvas no
navegador e foram escritas antes de ela existir. Ao criar uma tela,
acrescente a chave em três lugares do `30-base.js`, mais um no build:

    TELAS                 a entrada com nome, ícone, grupo e título
    PERMISSOES_DEFAULT    quais papéis a enxergam
    TELAS_NOVAS           senão ela nasce invisível para quem já usou
    build.py              a chave na lista de montagem

É `carregarPermissoes()` que compara `TELAS_NOVAS` com o que está salvo e
apresenta a tela para quem já tinha permissões guardadas.

## O formulário também é gerado

`public/aplicar/index.html` sai de `fonte/aplicar/`:

```sh
cd fonte/aplicar && python3 build.py
```

É a página que a landing abre em `/aplicar`, uma pergunta por tela. As
nove perguntas de fábrica moram em **`src/aplicar.js`**, em
`FORMULARIO_FABRICA`, e é de lá que o build lê: `fonte/aplicar/formulario.json`
é só socorro para quando o build não consegue ler o módulo. Uma lista só,
num lugar só, senão as duas divergem sem ninguém notar.

Fonte, marca e os 35 ícones entram embutidos, e o build **recusa a
montagem** se sobrar qualquer requisição a terceiros.

### As sete rotas do formulário

Todas sob `/api/`, resolvidas por `rotasAplicar()` em `src/aplicar.js`:

    GET  /api/formulario           a definição no ar, pública e podada
    POST /api/resposta             recebe uma aplicação, pública
    POST /api/evento               recebe os passos, pública
    GET  /api/mesa/formulario      a definição inteira, com login
    PUT  /api/mesa/formulario      publica uma versão nova, com login
    GET  /api/mesa/metricas        os números, com login
    GET  /api/mesa/pulso           mudou alguma coisa?, com login

**O prefixo `/api/mesa/` continua valendo, mesmo sem o Access.** Ele
nasceu porque o Access protegia por caminho e não por método, e cobrir
`/api` inteiro derrubaria o formulário público. Hoje quem separa é o
código, mas o prefixo continua sendo a linha visível entre o que qualquer
um na internet alcança e o que só a mesa alcança, e é ele que faz essa
diferença aparecer no roteador em vez de ficar escondida numa função.

As três públicas são as que qualquer um na internet alcança: elas têm
limite de tamanho, limite por sessão e freio por origem, e recusam o resto
com 400. As quatro da mesa respondem 401 para quem não entrou e 403 para
quem entrou como cliente, igual `/leads`.

A submissão grava na **mesma tabela `leads`**, com o título de cada
pergunta como chave do objeto `respostas`, e com `typeform_response_id`
valendo `aplicar:<envio>`: a coluna passou a significar "id da resposta na
origem". A tela "Ideias que chegaram" desenha isso sem saber de nada.

### A mesa é ao vivo

Desde 04/09, "Ideias que chegaram" e as medidas do formulário se
atualizam sozinhas, sem ninguém clicar em "buscar de novo". Uma aplicação
que chega às onze e meia aparece na tela em cerca de três segundos.

Como: o navegador pergunta ao servidor "mudou alguma coisa?" de três em
três segundos, pela `GET /api/mesa/pulso`, e só refaz a leitura cara
quando a resposta muda. A rota do pulso não devolve dado nenhum, devolve a
**assinatura** do que existe: três leituras de ponta de índice, que o
SQLite responde sem abrir tabela. Ler as medidas custa quinze consultas
com janela e mediana, e é isso que a batida evita repetir.

Avisar de verdade, com o servidor empurrando, pediria uma conexão aberta
por pessoa o dia inteiro, e é justamente o que o plano grátis não dá.

Três regras fazem isso caber, e valem mais que o intervalo:

- **Só bate com a aba na frente.** Aba escondida não pergunta nada, e
  volta perguntando na hora em que reaparece.
- **Só bate com uma tela ao vivo aberta.** As telas que moram no navegador
  não têm o que atualizar, e a aba das perguntas do formulário está fora
  de propósito: redesenhar um formulário debaixo dos dedos de quem está
  escrevendo é pior que número velho.
- **Falhou, recua.** Cada falha seguida dobra a espera, até um minuto, e o
  primeiro acerto volta para três segundos.

A tela não pisca: quem atualiza busca em silêncio, sem passar por
"carregando", e o que a pessoa está fazendo sobrevive à troca (nota sendo
digitada, linha aberta, busca e filtro). O que muda de valor sozinho
pisca uma vez, e só o que mudou.

O motor mora em `30-base.js` (`aoVivoRegistrar`, `aoVivoBater`,
`aoVivoSelo`, `aoVivoPiscar`). Tela nova que fale com o servidor entra com
uma linha: `aoVivoRegistrar('<chave>', <atualizar>, <quer?>)`.

As propostas ficaram **de fora** da assinatura de propósito: nenhuma das
duas telas ao vivo depende delas, e somar aquela tabela faria a batida do
coração depender de um arquivo de tabelas que ela não usa.

### Onde a informação mora

Tudo em `localStorage`, com o prefixo `iqv_` (`iqv_projetos`,
`iqv_usuarios`, `iqv_permissoes`, `iqv_metodo`, `iqv_sessao`…).
Consequência prática: **os dados são por navegador**. Duas pessoas
abrindo o sistema veem coisas diferentes.

Nunca use o prefixo `af_`, nem para ler. É do outro negócio, na mesma
origem. "Configurações" oferece apagar essas chaves, com confirmação escrita, e
esse é o único lugar que encosta nelas.

É por isso que aplicação não mora no navegador. As respostas caem no banco
D1 pela rota `/api/resposta`, e a rota `/leads` devolve para quem estiver
autenticado.

**Duas telas são a exceção**, e falam com o servidor: "Ideias que
chegaram", que lê o `/leads` e escreve o andamento de volta pelo
`PATCH /leads`, e "Propostas". Por isso elas têm estados que nenhuma outra
tem (carregando, sem servidor, login vencido) e são onde entra texto
escrito por desconhecido, o que explica o `esc()` antes de qualquer coisa
virar HTML.

## A proposta com aceite

A décima primeira tela, `propostas`, monta uma proposta a partir de uma
aplicação da mesa e devolve um código de cinco letras. O cliente abre
`/proposta/`, digita o código, escolhe o plano, lê o contrato inteiro e
assina. Duas coisas acontecem sozinhas: a proposta vira "aceita" e a
aplicação vira "ganho" na mesa.

O código é sorteado, e não sequencial: `ID-` mais cinco de
`ABCDEFGHJKMNPQRSTUVWXYZ23456789`, sem as letras que se confundem com
número. Sequencial deixaria qualquer um ler a proposta do vizinho somando
um. E o código sozinho **não** entrega o lead, o WhatsApp da casa nem o
valor das outras propostas: a rota pública devolve só o que aquela pessoa
precisa ver para decidir.

### As quatro rotas da proposta

    GET  /api/propostas   a lista, com login (gestor ou colaborador)
    POST /api/propostas   cria e sorteia o código, com login
    GET  /api/proposta    abre pelo código, pública
    POST /api/aceite      registra a assinatura, pública

As duas públicas são as que o cliente alcança sem entrar em lugar nenhum.
Assinar duas vezes responde 409, e proposta vencida responde 410.

O que fica guardado da assinatura é o nome, o documento, o contato, o
plano escolhido e o **resumo SHA-256 do contrato inteiro, já com o nome
dentro**. É esse resumo que aparece no comprovante: ele prova que o texto
não mudou depois, sem precisar guardar uma cópia por assinatura.

As tabelas `propostas` e `aceites` moram no `schema-propostas.sql`.

### A página do cliente também é gerada

`public/proposta/index.html` sai de `fonte/proposta/`:

```sh
cd fonte/proposta && python3 build.py
```

Mesma regra das outras: fonte e marca embutidas, e o build **recusa a
montagem** se sobrar requisição a terceiros, travessão, ou se o texto do
contrato vazar para dentro da página. O contrato vem do servidor, para uma
cópia velha no navegador de alguém nunca virar o que foi assinado.

**As doze cláusulas precisam de leitura de advogado antes do primeiro
envio de verdade.** Elas vieram prontas no pacote de origem e ninguém do
Direito olhou ainda.

## Testes

```sh
npm test
```

Roda três suítes: as 87 rotas de sempre, as 114 do formulário e as 25 da
proposta. Sobe wrangler local, bate nas rotas por HTTP e derruba tudo no
fim. Roda no banco local; não encosta em produção.

São 87 verificações nas rotas de sempre: o site estático com os cabeçalhos
certos, o `robots.txt`, o `sitemap.xml`, a prova de dono do Google, e a
porta inteira, do primeiro
acesso ao freio de força bruta, passando por errar e-mail e errar senha
respondendo a mesma frase, pelo cliente que não lê a mesa e por desligar
alguém e ver a sessão dela cair na hora.

As outras 114 são do formulário: a definição, a publicação, a submissão
virando lead, os passos que alimentam as medidas, os limites das duas
rotas abertas, e o pulso, que precisa mudar de assinatura quando chega
aplicação e ficar igual quando não acontece nada.

As 25 da proposta fazem o ciclo inteiro por HTTP: uma aplicação entra pelo
formulário público, vira proposta com código sorteado, o cliente abre só
com o código, assina, e os dois andamentos viram sozinhos. Conferem também
o que o código NÃO entrega a quem o tem, assinar duas vezes e proposta
vencida.

Não precisa de preparo nenhum: os três schemas são aplicados no banco
local e a casa é esvaziada antes de começar. O `openssl` deixou de ser
necessário: a suíte do formulário fabricava um par de chaves, um
certificado e um servidor de chaves de mentira só para o Worker ter uma
assinatura do Access para conferir. Agora ela entra com e-mail e senha,
como a Carla entra, e sessenta linhas viraram uma.

Antes de qualquer push que mexa em `src/` ou `wrangler.toml`, rode.

As telas têm verificação própria, num navegador de verdade. Com um
`npx wrangler dev` de pé na porta 8787:

```sh
node fonte/sistema/verifica.mjs           # 72: as onze telas, as matrizes, o ao vivo, o eixo
node fonte/sistema/verifica-login.mjs     # 42: a porta, do primeiro dia em diante
node fonte/sistema/verifica-propostas.mjs # 38: o ciclo da proposta, nas duas pontas
node verifica-aplicar.mjs                 # 95: o formulário, nas duas larguras
```

São 473 verificações no total: 226 de rota e 247 de navegador.

`verifica-login.mjs` e `verifica-propostas.mjs` esvaziam a casa no banco
local antes de começar, porque o primeiro acesso só responde sem ninguém
cadastrado. Rodar qualquer uma das duas apaga as pessoas do seu banco de
desenvolvimento, e nunca o de produção.

## A prova de dono do Google

`public/google54f449901e81080f.html` é o arquivo que o Search Console pede
para confirmar que o site é da casa. Ele tem uma linha só e é servido em
`/google54f449901e81080f.html`, direto da borda.

**Ele não pode sair do lugar, mudar de nome nem mudar de conteúdo.** Se
isso acontecer, o Google desverifica o domínio e os relatórios de busca
somem sem aviso nenhum. Por isso ele é conferido no `npm test`, junto do
`robots.txt` e do `sitemap.xml`.

O `robots.txt` continua liberando o caminho dele: só `/sistema/` e
`/proposta/` ficam de fora da busca.

## Cuidados no que já está de pé

- O nome em `wrangler.toml` (`ideia-que-vende`) tem que continuar igual ao
  do Worker no painel. Diferente, o build falha ou nasce um segundo Worker
  sem domínio.
- Em Settings → Builds, o **Production branch** tem que ser o branch de
  trabalho acima, e "Builds for non-production branches" fica desmarcado.
  Um dia inteiro se perdeu com isso apontando para `main`, que só tem um
  README: cada push publicava, e o domínio nunca mudava.
- `TYPEFORM_WEBHOOK_SECRET` é secret do painel, nunca do repositório.
- **Este Worker não tem mais variável de configuração nenhuma.** Nada de
  login vive fora do repositório, e não há painel para preencher.
- **A aplicação do Cloudflare Access precisa continuar apagada.** Se
  alguém recriar uma cobrindo `/sistema`, `/leads`, `/eu` ou `/api/mesa`,
  a pessoa passa a ver duas telas de login seguidas, e os pedidos que o
  sistema faz por dentro voltam como a página de entrada do Access em vez
  de dados.
- **O cálculo da senha cabe no plano grátis de propósito.** Se alguém
  mover as 210 mil voltas de volta para o servidor "para ficar mais
  seguro", o login passa a estourar os 10 ms de processador e falha sem
  erro claro. A segurança já está preservada onde ela está.
