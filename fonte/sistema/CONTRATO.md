# Contrato das telas

Quem escreve uma tela deste sistema segue o que está aqui. O objetivo é
simples: nove telas escritas separadamente têm que parecer uma coisa só.

## Onde cada coisa mora

    fonte/sistema/00-cabeca.html   cabeçalho, fontes, favicon
    fonte/sistema/10-estilo.css    a linguagem visual inteira
    fonte/sistema/20-moldura.html  a porta, a barra lateral, o topo
    fonte/sistema/30-base.js       vocabulário, armazenamento, peças comuns
    fonte/sistema/telas/<k>.html   a marcação de uma tela
    fonte/sistema/telas/<k>.js     o comportamento de uma tela
    fonte/sistema/90-fim.js        a entrada (login pelo Access)

Para montar: `cd fonte/sistema && python3 build.py`. Sai
`public/sistema/index.html`, um arquivo só. **Não edite o resultado na
mão**, ele é sobrescrito no build seguinte.

## Como uma tela se declara

`telas/<k>.html` tem exatamente um elemento raiz:

```html
<section class="tela" id="tela-<k>">
  ...
</section>
```

`telas/<k>.js` registra o desenho e mais nada solto:

```js
DESENHO.<k> = function () { ... };
```

O roteador chama `DESENHO.<k>()` toda vez que a tela entra. Ela precisa
saber se redesenhar do zero a qualquer momento, sem depender do que já
estava na tela.

## O que já existe e não se reescreve

Vocabulário do negócio, vindo da landing:
`FASES` (4), `ETAPAS` (6), `ENTREGAS` (8), `NIVEIS_DEFAULT` (3),
`PERFIS` (6), `ESTAGIOS` (4), `ANDAMENTOS` (6), `ESTADOS_ENTREGA` (4).

Peças: `esc()`, `data()`, `dataCurta()`, `dataLonga()`, `diasDesde()`,
`haQuanto()`, `moeda()`, `hoje()`, `porChave()`, `nomeEntrega()`,
`nomeFase()`, `nomeEtapa()`, `etiqueta()`, `vazio()`, `aviso()`,
`porId()`, `escrever()`, `texto()`, `contador()`, `irPara()`.

Armazenamento: `iqvLer(chave, padrao)`, `iqvGravar(chave, valor)`,
`CHAVES.*`, `iqvOcupacao()`.

Quem é a pessoa: `EU.id`, `EU.papel`, `EU.email`, `EU.nome`,
`EU.origem`, `EU.pode(tela)`, `EU.ehGestor()`.

Os papéis são `'gestor'`, `'colaborador'` e `'cliente'`.

Pessoas e sessão: `pessoas()`, `gravarPessoas(lista)`,
`acharPessoaPorId(id)`, `resumoSenha(senha, id)`, `resumoIgual(a, b)`,
`sessaoGuardar(id)`, `sessaoLer()`, `sessaoApagar()`.

Classes de CSS: `.abertura`, `.selo`, `.cartao`, `.cartao-t`,
`.numeros`, `.numero`, `.numero.puxa`, `table.lista`, `.eti` com
`.eti-ok .eti-atencao .eti-alerta .eti-info .eti-marca .eti-neutra`,
`.bt` com `.bt-marca .bt-linha .bt-sm`, `.campo`, `.campo-sm`,
`.rotulo`, `.dica`, `.aviso` com `.aviso-ok .aviso-atencao
.aviso-alerta .aviso-info`, `.rolo-h`.

**Não invente classe nova.** Se faltar alguma coisa, use estilo em linha
ou peça para acrescentar no `10-estilo.css`.

## Os dados

Tudo em `localStorage`, prefixo `iqv_`, menos as aplicações, que vêm do
servidor.

**Nunca leia nem apague chave `af_`.** São de outro negócio que morou
neste mesmo endereço até 26/08. Limpar aquilo é botão em "A casa", com
confirmação escrita, e nunca automático.

### `iqv_projetos` — lista

```js
{
  id: 'p1', leadId: 12,           // leadId liga com leads.id do servidor
  rotulo: 'Marina, ago/26',        // primeiro nome e mês, o único dado repetido
  cliente: 'Marina Alves', email: '', whatsapp: '',
  perfil: 'consultor',             // chave de PERFIS
  nivelClicado: 'start',           // o que a pessoa clicou na landing
  nivelContratado: 'pro',          // o que de fato foi contratado
  valor: 19620,
  responsavelId: 'u1',
  inicio: '2026-08-20',            // AAAA-MM-DD
  produtoProntoEm: '2026-11-20',   // obrigatório: é a promessa de prazo
  fase: 2,                         // 1 a 4
  etapa: 3,                        // 1 a 6
  bola: { lado: 'cliente', desde: '2026-08-24' },   // 'casa' ou 'cliente'
  entregas: [                      // sempre as 8, na ordem de ENTREGAS
    { k: 'diagnostico', noEscopo: true, estado: 'aprovada',
      responsavelId: 'u1', prazo: '2026-09-01',
      checklist: [ { texto: '...', feito: true } ],
      campos: {},                  // os campos próprios daquela entrega
      links: [ { nome: 'Documento', url: 'https://...' } ],
      enviadaEm: null, aprovadaEm: null }
  ]
}
```

`noEscopo` fica congelado dentro da entrega de propósito: é o escopo
daquele contrato, e não uma consulta ao nível feita na hora de desenhar.

### `iqv_leituras` — lista, uma por aplicação

```js
{
  leadId: 12, perfil: 'consultor', estagio: 'resultado',
  precisa: ['diagnostico','posicionamento'],   // quais das 8
  nivelIndicado: 'pro', justificativa: '',     // obrigatória se divergir do clicado
  veredito: 'seguir',                          // 'seguir' | 'esperar' | 'fora'
  motivo: '', preparadaPor: '', assinadaPor: '', assinadaEm: null,
  devolutiva: { texto: '', canal: 'whatsapp', enviadaPor: '', enviadaEm: null }
}
```

### `iqv_metodo`

```js
{ niveis: [ ...NIVEIS_DEFAULT com valor e escopo editados... ],
  roteiros: { diagnostico: { checklist: ['...'], comoFazer: '' }, ... } }
```

### `iqv_recebimentos`

```js
{ projetoId: 'p1', parcelas: [ { n:1, vencimento:'2026-09-05', valor:1635,
  forma:'pix', pagoEm: null } ] }
```

### `iqv_usuarios`

```js
{ id:'u1', nome:'Carla Caroline', email:'carla@...', papel:'gestor',
  ativo:true, senha:'<resumo sha-256 de senha + id>' }
```

O `papel` é `'gestor'`, `'colaborador'` ou `'cliente'`.

**São duas portas, e elas fazem coisas diferentes.** O Cloudflare Access
decide quem chega até o endereço, e é ele que protege. Esta lista decide
quem é a pessoa aqui dentro e o que ela enxerga.

A senha nunca é guardada em texto: fica o resumo SHA-256 de senha mais id,
então duas pessoas com a mesma senha guardam coisas diferentes. Isso não
faz do sistema um cofre, e a porta diz isso por escrito: quem baixa o HTML
vê a lista de pessoas e pode tentar senha à vontade.

Quem cadastra **não escolhe a senha de ninguém**: a pessoa escolhe a dela
na primeira entrada. Esquecer é normal, e o gestor zera em "A casa".

## As aplicações, que vêm do servidor

Única parte que fala com a rede. `GET /leads` devolve
`{ok, status_possiveis, leads:[...]}` com até 500, mais recentes primeiro.
Cada lead: `id, criado_em, atualizado_em, nome, email, whatsapp, plano,
origem, status, observacoes, respostas`. O `respostas` é um objeto com as
perguntas do Typeform como chave.

`PATCH /leads` com `{id, status?, observacoes?}` grava o andamento.
**A lista de status é fechada**: `novo, contatado, qualificado, proposta,
ganho, perdido`. Inventar outro devolve 400.

Quatro estados que só estas telas têm, e cada um precisa de texto próprio:
carregando; sem servidor; login vencido (a resposta vem em HTML, não em
JSON); Worker sem configuração (503). Nunca mostre tabela vazia sem
explicar qual dos quatro é.

Desenhe as respostas do Typeform **na ordem em que vieram**, sem nome de
pergunta escrito no código: o formulário vai mudar, e aplicação velha e
nova precisam conviver na mesma tela.

## Como se escreve nesta casa

Frase curta, sujeito na frente, número antes do adjetivo.

O sistema fala como a empresa fala na landing. Não existe registro, item,
cadastro nem usuário na tela: existe aplicação, leitura, entrega, projeto
e pessoa. Os nomes das entregas, fases, etapas e níveis são copiados da
landing letra por letra, porque o cliente leu aquilo antes de pagar.

Estado vazio nunca diz que não há dados: diz o que ainda não aconteceu e
qual é o próximo passo, com o nome da tela para onde ir.

Erro explica o que aconteceu e o que fazer, no lugar do código.

**Nada de travessão.** Vírgula, dois pontos ou ponto. Nada de emoji, nada
de exclamação, e nunca a expressão "tempo real" numa tela que mostra um
retrato datado.

## O que não fazer

- Tela chamada Dashboard, CRM, Kanban ou Relatórios, e cartão que se
  arrasta entre colunas. A fase muda quando a entrega daquela fase é
  aprovada pelo cliente, não porque alguém mexeu num cartão.
- Guardar arquivo dentro do sistema. Campo de link, sempre.
- Mostrar número ao cliente sem carimbo de data.
- Escrever HTML com texto de fora sem passar por `esc()`.
- `setItem` fora de `iqvGravar()`.
