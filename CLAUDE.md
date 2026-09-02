# Ideia Que Vende

Dois sites num projeto só, publicados como um Worker da Cloudflare no
domínio `ideiaquevende.com.br`.

    public/index.html          landing pública      (~310 KB, gerada)
    public/aplicar/index.html  o formulário da casa (~216 KB, gerado)
    public/sistema/index.html  sistema de gestão    (~603 KB, gerado)
    src/                       rotas do servidor
    fonte/                     de onde a landing é gerada
    fonte/aplicar/             de onde o formulário é gerado
    fonte/sistema/             de onde o sistema é gerado

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

### As dez telas e os três papéis

`semana`, `ideias`, `formulario`, `leitura`, `projetos`, `entrega`,
`roteiros`, `dinheiro`, `cliente`, `casa`. Cada uma é um par
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

### As seis rotas do formulário

Todas sob `/api/`, resolvidas por `rotasAplicar()` em `src/aplicar.js`:

    GET  /api/formulario           a definição no ar, pública e podada
    POST /api/resposta             recebe uma aplicação, pública
    POST /api/evento               recebe os passos, pública
    GET  /api/mesa/formulario      a definição inteira, com login
    PUT  /api/mesa/formulario      publica uma versão nova, com login
    GET  /api/mesa/metricas        os números, com login

**O prefixo `/api/mesa/` continua valendo, mesmo sem o Access.** Ele
nasceu porque o Access protegia por caminho e não por método, e cobrir
`/api` inteiro derrubaria o formulário público. Hoje quem separa é o
código, mas o prefixo continua sendo a linha visível entre o que qualquer
um na internet alcança e o que só a mesa alcança, e é ele que faz essa
diferença aparecer no roteador em vez de ficar escondida numa função.

As três públicas são as que qualquer um na internet alcança: elas têm
limite de tamanho, limite por sessão e freio por origem, e recusam o resto
com 400. As três da mesa respondem 401 para quem não entrou e 403 para
quem entrou como cliente, igual `/leads`.

A submissão grava na **mesma tabela `leads`**, com o título de cada
pergunta como chave do objeto `respostas`, e com `typeform_response_id`
valendo `aplicar:<envio>`: a coluna passou a significar "id da resposta na
origem". A tela "Ideias que chegaram" desenha isso sem saber de nada.

### Onde a informação mora

Tudo em `localStorage`, com o prefixo `iqv_` (`iqv_projetos`,
`iqv_usuarios`, `iqv_permissoes`, `iqv_metodo`, `iqv_sessao`…).
Consequência prática: **os dados são por navegador**. Duas pessoas
abrindo o sistema veem coisas diferentes.

Nunca use o prefixo `af_`, nem para ler. É do outro negócio, na mesma
origem. "A casa" oferece apagar essas chaves, com confirmação escrita, e
esse é o único lugar que encosta nelas.

É por isso que aplicação não mora no navegador. As respostas caem no banco
D1 pela rota `/api/resposta`, e a rota `/leads` devolve para quem estiver
autenticado.

**"Ideias que chegaram" é a exceção.** É a única tela que fala com o
servidor: lê o `/leads` e escreve o andamento de volta pelo
`PATCH /leads`. Por isso ela tem estados que nenhuma outra tem
(carregando, sem servidor, login vencido, servidor sem configuração) e é
o único lugar onde entra texto escrito por desconhecido, o que explica o
`esc()` antes de qualquer coisa virar HTML.

## Testes

```sh
npm test
```

Roda duas suítes: as 74 rotas de sempre e as 104 do formulário. Sobe
wrangler local, bate nas rotas por HTTP e derruba tudo no fim. Roda no
banco local; não encosta em produção.

São 74 verificações nas rotas de sempre: o site estático com os cabeçalhos
certos, o `robots.txt` e o `sitemap.xml`, e a porta inteira, do primeiro
acesso ao freio de força bruta, passando por errar e-mail e errar senha
respondendo a mesma frase, pelo cliente que não lê a mesa e por desligar
alguém e ver a sessão dela cair na hora.

As outras 104 são do formulário: a definição, a publicação, a submissão
virando lead, os passos que alimentam as medidas, e os limites das duas
rotas abertas.

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
node fonte/sistema/verifica.mjs        # 36: as dez telas, os três papéis
node fonte/sistema/verifica-login.mjs  # 35: a porta, do primeiro dia em diante
node verifica-aplicar.mjs              # 95: o formulário, nas duas larguras
```

São 344 verificações no total: 178 de rota e 166 de navegador.

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
