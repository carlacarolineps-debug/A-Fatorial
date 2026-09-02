# Publicar o site

A landing e o sistema sobem juntos, num projeto só, num domínio só.
Não existe passo de build: o site é HTML pronto.

    ideiaquevende.com.br/           landing (pública)
    ideiaquevende.com.br/aplicar    o formulário da casa (público)
    ideiaquevende.com.br/sistema/   sistema (atrás de login)
    ideiaquevende.com.br/api/*      o formulário conversa por aqui
    ideiaquevende.com.br/leads      devolve os leads para a mesa (e anota o andamento)

---

## Onde estamos (31/08/2026)

Este bloco é o resumo para quem chegar agora. O resto do arquivo é o passo
a passo completo.

**A base, no ar e conferida:**

- Worker **`ideia-que-vende`** publicado, com o domínio
  `ideiaquevende.com.br` ligado nele e o banco D1 conectado (binding `DB`).
- **A landing está no ar.** Desde 31/08 todos os botões de chamada dela
  levam para `/aplicar`, o formulário da própria casa. O Typeform saiu:
  a rota, o segredo do webhook e as verificações dele foram removidos.
- A branch de publicação foi corrigida em 28/08: estava apontando para a
  `main`, que só tem o sistema de outro negócio. Leia a seção seguinte, é
  a armadilha que custou um dia.
- **"Builds for non-production branches" desmarcado**, então nenhuma outra
  conversa consegue publicar neste domínio.
- Cada push chega no domínio em cerca de 28 segundos.

**O sistema de gestão, em `/sistema/`:**

- **Dez telas.** Quem entra escolhe o próprio nome na porta e digita a
  senha dela. A senha nunca é guardada em texto puro: fica como SHA-256 de
  `senha + ':' + id`. Quem cadastra outra pessoa não escolhe a senha dela,
  ela escolhe na primeira entrada.
- Três papéis: **gestor** (as dez telas), **colaborador** (sem dinheiro e
  sem A casa) e **cliente** (uma tela só, sem barra lateral).

**O formulário da casa, em `/aplicar`:**

- Nove perguntas, uma por tela, com teclado, barra de progresso, volta sem
  perder o que foi escrito e rascunho que sobrevive a fechar a aba.
- Fonte, marca e os 35 ícones vão embutidos: **nenhuma requisição a
  terceiros**, e o build recusa a montagem se aparecer alguma.
- As respostas caem na tabela `leads`, com o título de cada pergunta como
  chave. A tela "Ideias que chegaram" desenha sem nenhuma mudança nela. As
  duas colunas com nome de Typeform continuam ali por herança: renomear
  custaria uma migração e não mudaria o que elas fazem.
- A tela **"O formulário"**, dentro do sistema, é onde a Carla edita as
  perguntas, publica, volta uma versão atrás e lê as medidas.

**Banco D1 `ideia-que-vende`**, oito tabelas: `leads`, `webhook_log` e as
seis do formulário (`formulario_versoes`, `formulario_visitas`,
`formulario_eventos`, `formulario_escolhas`, `formulario_baldes`,
`formulario_dia`).

**As verificações, todas verdes:**

    npm test                                 39 + 104 = 143 rotas
    node verifica-aplicar.mjs                 95 a página, em navegador
    node fonte/sistema/verifica.mjs           36 as dez telas, três papéis
    node fonte/sistema/verifica-login.mjs     28 a porta
                                             ---
                                             302

As três de navegador pedem um `npx wrangler dev` de pé na porta 8787.

**O que ainda não protege, e precisa ficar claro:**

- **Sem o Cloudflare Access, o endereço do sistema não tem porta.** A senha
  de dentro diz quem é a pessoa e o que ela enxerga; ela não impede ninguém
  de chegar até a tela de login. A própria porta escreve isso enquanto o
  Access não existir.
- Enquanto ele não existir, **a aba de medidas e a edição do formulário
  ficam fechadas**, com 503 de propósito, e as duas telas explicam por quê
  sem escrever código na tela. O formulário público continua no ar e
  continua recebendo: só a parte de dentro é que espera.
- Foi assim que o sistema do outro negócio ficou exposto em 26/08.

**Falta, em ordem:**

1. **Criar o Cloudflare Access** e preencher `TEAM_DOMAIN` e `ACCESS_AUD`
   (seção 5). É o passo que fecha a porta, libera as medidas e a edição do
   formulário, e destrava a leitura das aplicações. É o mais urgente, e é
   o único que depende da Carla.
2. Desligar o endereço `.workers.dev`, que ainda serve o mesmo site.
3. Se a automação do Typeform ainda existir na conta de lá, apagar. Ela
   nunca chegou a ser ligada (ficou em rascunho, com o gatilho desligado),
   e deste lado não existe mais rota para ela bater.

---

## O sistema e interno, e so isso (01/09)

Chegou a ser considerado dar acesso ao cliente, para ele acompanhar o
proprio projeto. **Foi descartado.** O sistema e da equipe: gestor e
colaborador. Cliente nao entra.

Isso resolve tres coisas de uma vez:

- **O Cloudflare Access serve, e continua grátis.** As 50 vagas do plano
  Free sobram para uma equipe de gestores e colaboradores. Nao existe a
  parede que existiria com cliente entrando: passando de 50 ativos no mes,
  a Cloudflare bloqueia quem tentar entrar, em vez de cobrar.
- **Nao ha segundo servico.** Fica so a Cloudflare: dominio, site, Worker,
  banco e login. Uma conta, uma fatura, US$ 5 por mes.
- **O banco continua onde esta.** O D1 nao tem endereco na internet, so o
  Worker fala com ele, e nao ha senha de banco para vazar. O Supabase
  entraria pela trava por linha, uma tranca a mais que custaria US$ 25 por
  mes, uma segunda conta e um segundo painel, e que hoje nem entraria em
  acao, porque o Worker fica na frente do banco de qualquer jeito.

A tela "Meu projeto" e o papel `cliente` continuam existindo: e por eles
que a mesa confere o que o cliente veria, pelo botao "Ver o que ele ve" em
Minha semana. O que nao existe e login de cliente.

### Uma correcao, para nao assustar a toa

As aplicacoes **nao estao expostas hoje**. Sem `TEAM_DOMAIN` e `ACCESS_AUD`
o servidor recusa entregar os leads: quem abrir o endereco do sistema ve
uma casca vazia, sem dado de ninguem.

O problema e o outro lado: **a Carla tambem nao le**. O formulario esta no
ar recebendo, e "Ideias que chegaram" so funciona depois do Access. E por
isso que a secao 5 e o proximo passo, e o mais urgente.

---

## A armadilha que custou um dia inteiro

Em 28/08 o dominio passou a mostrar coisa errada, e a causa nao estava no
codigo nem no dominio: estava em **Settings > Builds**, do Worker.

Dois campos, os dois errados:

**Production branch** estava em `main`. So que a `main` deste repositorio
tem dois arquivos: um README e o `index.html` do sistema do A! Fatorial,
outro negocio. Todo o Ideia Que Vende (landing, sistema, `src/`,
`wrangler.toml`) vive na branch de trabalho. A Cloudflare estava tentando
publicar do lugar onde o projeto nao esta.

**"Builds for non-production branches"** estava marcado. Este repositorio
tem 21 branches, de conversas diferentes. Com essa caixa ligada, qualquer
push em qualquer uma delas dispara build. Era a mistura, com nome e
sobrenome: trabalho de outra conversa chegando neste dominio.

O conserto, nessa mesma tela:

    Production branch                    claude/animated-shader-hero-thcafz
    Builds for non-production branches   DESMARCADO

A segunda linha e a que garante a separacao: nenhuma outra conversa
consegue tocar neste dominio, por mais branches que aparecam.

**Como saber se voce caiu nisto de novo.** O dominio mostra algo que voce
nao reconhece, e o codigo publicado nao bate com o ultimo commit da branch
de trabalho. Antes de mexer em qualquer outra coisa, abra Settings > Builds
e confira esses dois campos.

---

## Sobre o nome do Worker

O Worker se chamava **a-fatorial**, batizado automaticamente pelo nome do
repositório, que é de outro negócio. Foi renomeado para **ideia-que-vende**
em 26/08, e o `wrangler.toml` mudou junto no mesmo push: nome diferente
entre painel e código faz o build falhar.

O texto abaixo continua valendo para o nome de hoje.

O Worker se chama **ideia-que-vende** no painel, batizado pelo nome do
repositório. O `wrangler.toml` usa o mesmo nome, e os dois **têm que
continuar iguais**: nome diferente faz o build falhar ou, pior, um
`wrangler deploy` cria um segundo Worker sem o domínio.

Se um dia renomear no painel, mude o `name` no `wrangler.toml` junto.

---

## 1. Ligar o repositório

1. **Workers & Pages** → botão **Criar aplicativo** (Create application)
2. Na caixa **Importar um repositório** (Import a repository) →
   **Começar** (Get started)
3. Escolha a conta do GitHub e autorize a Cloudflare a ver o repositório
   `A-Fatorial` (se ele não aparecer, clique em *Add account* /
   *Configure* e libere o repositório na tela do GitHub)
4. Selecione **A-Fatorial**
5. Na tela de configuração:

   | Campo                     | O que colocar                       |
   |---------------------------|-------------------------------------|
   | Nome do Worker            | `ideia-que-vende`                   |
   | Branch de produção        | `claude/animated-shader-hero-thcafz`|
   | Comando de build          | **deixe vazio**                     |
   | Comando de deploy         | `npx wrangler deploy`               |
   | Diretório raiz            | `/`                                 |

   > Comando de build vazio é de propósito. O site já é HTML pronto,
   > não há nada para compilar.

6. **Save and Deploy**

Ao final aparece um endereço `ideia-que-vende.gestaogrupoa.workers.dev`.
Abra: a landing tem que carregar. Esse é o teste de que subiu.

---

## 2. Ligar o banco (D1)

O banco `ideia-que-vende` já existe e as tabelas já estão criadas. Falta
só ligar ao Worker.

1. **Workers & Pages** → **ideia-que-vende** → **Settings**
2. **Bindings** → **Add** → **D1 database**
3. Variable name: `DB` · D1 database: `ideia-que-vende`
4. **Deploy**

> O `wrangler.toml` já traz esse binding, então ele costuma aparecer
> sozinho. Se já estiver lá, não faça nada.

---

## 3. Colocar o domínio

1. Ainda em **Settings** → **Domains & Routes** → **Add** → **Custom domain**
2. Digite `ideiaquevende.com.br` → **Add domain**
3. Repita com `www.ideiaquevende.com.br`, senão quem digitar o "www" na
   frente não chega ao site.

Confira nessa mesma tela que o domínio está no Worker **ideia-que-vende**.

### Apontar o Registro.br para a Cloudflare

O domínio já está na conta Cloudflare, mas só passa a valer quando o
Registro.br apontar para os servidores dela.

**Antes de qualquer clique, confira o que mais usa esse domínio hoje.**
No momento em que os nameservers mudam, a Cloudflare passa a ser a única
resposta para `ideiaquevende.com.br`. Tudo que não estiver na lista de DNS
dela some no mesmo segundo: e-mail, site antigo, subdomínio, sistema de
terceiro. Hoje a lista tem `MX` nulo e `v=spf1 -all`, que significam
"este domínio não recebe e-mail". Se existe e-mail nesse domínio (KingHost
ou qualquer outro), ele para. Copie os registros do provedor atual para a
Cloudflare **antes** de trocar.

**1. Pegue os dois nameservers.** Cloudflare → o domínio → **DNS** →
**Records**, role até o fim: bloco **Cloudflare nameservers**, com dois
endereços no formato `nome.ns.cloudflare.com`. São sorteados por conta, os
seus são diferentes dos de qualquer outra pessoa.

**2. Desligue o DNSSEC no Registro.br, se estiver ligado.** No painel do
domínio, seção **DNSSEC**. Se houver registro DS, remova e salve. Trocar
os nameservers com DNSSEC apontando para o provedor antigo não deixa o
domínio lento: derruba ele por completo, e o erro não explica o motivo.

**3. Troque os servidores.**

1. Entre em `registro.br` (CPF/CNPJ e senha, ou conta gov.br)
2. Painel → clique em **ideiaquevende.com.br**
3. Seção **Servidores DNS** → **Alterar** / ícone de edição
4. Escolha usar servidores DNS **próprios**, não o DNS do Registro.br
5. Apague os que estiverem lá e ponha os dois da Cloudflare, um em cada
   campo. Deixe os campos de IP **vazios**.
6. Salvar

O Registro.br testa se os servidores respondem pelo domínio antes de
aceitar. Como a zona já existe na Cloudflare, passa. Se der "servidor DNS
não responde", espere uns minutos e salve de novo.

**4. Espere.** O `.br` publica em lotes: costuma valer em algumas horas,
com prazo formal de 24h. Na Cloudflare o domínio sai de *Pending
Nameserver Update* e vira **Active**, e chega um e-mail avisando.

**5. Depois de Active.** Ligue **SSL/TLS** → **Edge Certificates** →
**Always Use HTTPS**. Abra `https://ideiaquevende.com.br`: tem que
aparecer a landing.

### Depois que o domínio funcionar, desligue o endereço de teste

O `.workers.dev` serve o `/sistema/` para qualquer um que souber o
endereço, e o Access (passo 5) protege só o domínio de verdade.

**Settings** → **Domains & Routes** → na linha `workers.dev` →
**Disable** (ou o "..." → Remove)

---

## 5. A porta: e-mail e senha

**Não há nada para configurar no painel.** Isto é uma mudança de 02/09, e
vale escrever por que: o Cloudflare Access trancava o endereço até então,
funcionava, e mesmo assim saiu.

O motivo é a tela. O Access mostra a tela DELE, e desde 18/06/2026 toda
conta nova do Zero Trust nasce oferecendo só "entrar com a conta da
Cloudflare", que a equipe não tem. Dava para ligar o código por e-mail em
três cliques, mas a Carla pediu login e senha, duas vezes, para separar
cada colaborador com o acesso dele. Login e senha o Access não faz: ele
não guarda senha de ninguém.

### 5a. O que fazer no painel

**Apagar a aplicação do Access**, se ela ainda existir:

1. **Zero Trust** → **Access controls** → **Applications**
2. Abra a aplicação `ideiaquevende.com.br`
3. Aba **Additional settings** → **Delete**, lá embaixo

Enquanto ela existir, quem abre `/sistema/` vê duas telas de login
seguidas: a da Cloudflare e a da casa. E pior, os pedidos que o sistema
faz por dentro (`/leads`, `/eu`, `/api/mesa`) voltam como a página de
entrada do Access em vez de dados.

### 5b. O plano continua o grátis, e isso é de propósito

Não precisa pagar nada. Vale saber por quê, porque parece que deveria.

Embaralhar senha precisa ser caro: é o custo por chute que faz roubar o
banco não virar roubar as senhas. Mas o plano grátis do Worker dá 10 ms de
processador por pedido, e as 210 mil voltas gastam uns 120. No grátis, o
login simplesmente falharia.

Então a conta cara mudou de lado: quem faz as 210 mil voltas é o navegador
de quem está entrando, e o que viaja é o resultado. O servidor faz um passo
barato por cima e gasta menos de 2 ms.

**A proteção continua a mesma.** Quem roubar a tabela inteira ainda precisa
dar as 210 mil voltas para cada chute. O custo por chute não mudou, mudou
de máquina: saiu do servidor, que é cobrado por milissegundo, e foi para o
computador de quem entra, que tem processador de sobra e faz isso uma vez
por mês.

Custo prático: entrar leva uns 100 ms a mais num computador, e talvez meio
segundo num telefone antigo. O botão avisa enquanto calcula.

### 5c. O primeiro acesso

Abra `ideiaquevende.com.br/sistema/`. Com a tabela vazia, a porta pede
para criar a primeira gestora: nome, e-mail e senha.

**Essa tela só aparece uma vez.** Depois da primeira pessoa existir, ela
responde 409 para sempre, senão qualquer um se cadastraria como gestor no
dia seguinte.

Dali em diante, quem cadastra o resto da equipe é a tela "A casa": nome,
e-mail e papel. O sistema sorteia a primeira senha e mostra uma vez só,
para você passar adiante. A pessoa troca na primeira entrada.

### 5d. Conferir que pegou

Numa janela anônima:

1. `ideiaquevende.com.br/sistema/` pede **e-mail e senha**, sem nenhum
   botão de "entrar com".
2. `ideiaquevende.com.br/aplicar` abre normal, sem pedir nada.
3. Entrando, a tela "Ideias que chegaram" carrega as aplicações.

## O que falta depois disso

- Uma tela de leads dentro do sistema, lendo `/leads`. Ainda não existe.

> **O domínio já está certo no código.** O endereço que estava escrito como
> exemplo, `ideiaquevende.com.br`, é o domínio de verdade. As quatro tags do
> topo do `public/index.html` (`canonical`, `og:url`, `og:image`,
> `twitter:image`) não precisam de troca nenhuma. O `robots.txt` e o
> `sitemap.xml` também não: são montados na hora, a partir do domínio que o
> visitante pediu.

---

## Como isso é publicado dali em diante

Todo `git push` na branch `claude/animated-shader-hero-thcafz` refaz o
deploy sozinho. Para acompanhar: **ideia-que-vende** → **Deployments**.
