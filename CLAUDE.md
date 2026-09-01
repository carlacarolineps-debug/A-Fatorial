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

Os papéis são `gestor`, `colaborador` e `cliente`. Quem entra escolhe o
próprio nome na porta e digita a senha dela; a senha nunca é guardada em
texto puro, e sim como SHA-256 de `senha + ':' + id`. Quando o Cloudflare
Access estiver ligado, a rota `/eu` diz qual e-mail ele autenticou, e quem
já provou quem é na porta da rua não prova de novo na porta da sala.

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
    GET  /api/mesa/formulario      a definição inteira, atrás do Access
    PUT  /api/mesa/formulario      publica uma versão nova, atrás do Access
    GET  /api/mesa/metricas        os números, atrás do Access

**O prefixo `/api/mesa/` não é enfeite.** O Access protege por caminho e
não por método: enquanto publicar era `PUT /api/formulario` e ler era
`GET` no mesmo caminho, não havia como trancar um sem trancar o outro, e
qualquer aplicação do Access que cobrisse `/api` derrubaria o formulário
público. As três da mesa moram sob um prefixo só delas, e é esse prefixo
que entra no Access.

As três públicas são as que qualquer um na internet alcança: elas têm
limite de tamanho, limite por sessão e freio por origem, e recusam o resto
com 400. As três com Access respondem 503 dizendo o que falta enquanto
`TEAM_DOMAIN` e `ACCESS_AUD` estiverem vazios, igual `/leads`.

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

Roda duas suítes: as 39 rotas de sempre e as 104 do formulário. Sobe
wrangler local, bate nas rotas por HTTP e derruba tudo no fim. Roda no
banco local; não encosta em produção.

São 39 verificações nas rotas de sempre: o site estático com os cabeçalhos
certos, o `robots.txt` e o `sitemap.xml`, e o `/leads` e o `/eu` com
`TEAM_DOMAIN` e `ACCESS_AUD` preenchidos passando a exigir login em vez de
abrir. O segundo servidor existe só para essa última parte.

As outras 104 são do formulário: a definição, a publicação, a submissão
virando lead, os passos que alimentam as medidas, e os limites das duas
rotas abertas.

Quase não precisa de preparo: o schema é aplicado no banco local e o
segredo de teste entra por `--var`. A suíte do formulário fabrica um
certificado para o servidor de chaves de mentira, e para isso usa o
`openssl` da máquina. Sem ele, essa parte falha.

Antes de qualquer push que mexa em `src/` ou `wrangler.toml`, rode.

As telas têm verificação própria, num navegador de verdade. Com um
`npx wrangler dev` de pé na porta 8787:

```sh
node fonte/sistema/verifica.mjs        # 36: as dez telas, os três papéis
node fonte/sistema/verifica-login.mjs  # 28: a porta, do primeiro dia em diante
node verifica-aplicar.mjs              # 95: o formulário, nas duas larguras
```

São 302 verificações no total: 143 de rota e 159 de navegador.

## Cuidados no que já está de pé

- O nome em `wrangler.toml` (`ideia-que-vende`) tem que continuar igual ao
  do Worker no painel. Diferente, o build falha ou nasce um segundo Worker
  sem domínio.
- Em Settings → Builds, o **Production branch** tem que ser o branch de
  trabalho acima, e "Builds for non-production branches" fica desmarcado.
  Um dia inteiro se perdeu com isso apontando para `main`, que só tem um
  README: cada push publicava, e o domínio nunca mudava.
- `TYPEFORM_WEBHOOK_SECRET` é secret do painel, nunca do repositório.
- `TEAM_DOMAIN` e `ACCESS_AUD` vão no `wrangler.toml`, não no painel: as
  variáveis de texto do painel são sobrescritas a cada deploy.
- `TEAM_DOMAIN` e `ACCESS_AUD` vazios fazem `/leads` e `/eu` responderem
  503 de propósito. Não "conserte" isso deixando passar.
