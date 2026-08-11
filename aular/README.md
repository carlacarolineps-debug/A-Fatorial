# 🐾 AuLar — Rede de Adoção e Gestão Animal

Plataforma de adoção responsável e gestão para ONGs e protetores de animais,
começando pelo Grande ABC e já preparada para o Brasil inteiro.

**Para usar: abra o arquivo `index.html` no navegador.** Sem instalação, sem
servidor, sem internet obrigatória. Os dados ficam salvos no próprio navegador.

A primeira tela é o **site de divulgação** — a porta de entrada, com o que é,
para quem serve, os planos e as perguntas frequentes. Dali se entra no portal.

> A estratégia do negócio — pesquisa de mercado, as 18 formas de monetizar, a
> arquitetura de credibilidade do Fundo de Impacto (incluindo o que precisa
> estar resolvido juridicamente) e como isso vira produção — está em
> **[PROJETO.md](PROJETO.md)**.

---

## Entrar

Cada pessoa tem a **própria conta**, com e-mail, senha e papel. A tela de login
lista as contas de demonstração — clique em uma e o formulário se preenche.
A senha de todas é `aular123`.

| Conta | Papel | Enxerga |
|---|---|---|
| `carla@aular.app` | Dona da plataforma | o negócio inteiro |
| `dono@patas-do-abc.org` | Dona da ONG | tudo da organização, incluindo plano e equipe |
| `patricia@patasdoabc.org` | Gestora | o dia a dia, menos plano, cobrança e equipe |
| `marcelo@patasdoabc.org` | Voluntário | animais, adoções, lares e feiras |
| `helena@vetlar.com.br` | Veterinária | animais e carteira de vacinas — nada de dinheiro |

A permissão é aplicada **na entrada da tela**, não apenas escondendo o menu:
digitar o endereço de uma tela proibida também não passa.

---

## Várias pessoas ao mesmo tempo

| O que | Situação |
|---|---|
| Cada pessoa com conta, senha e papel próprios | ✅ funciona |
| Ver quem está online agora e em que tela | ✅ funciona |
| Duas janelas do mesmo computador se atualizando sozinhas | ✅ funciona |
| Cada ação assinada por quem a fez | ✅ funciona |
| **Computadores diferentes** | ⚠️ **exige servidor** |

Os três primeiros itens dá para testar agora: abra o sistema em **duas janelas**
do navegador, entre com contas diferentes e cadastre um animal numa delas — a
outra se atualiza sozinha, e o avatar de quem está online aparece no topo.

O último item não é questão de esforço: dois navegadores em máquinas distintas
não compartilham memória, e nenhuma quantidade de JavaScript resolve isso sem um
banco no meio. Essa peça está pronta em **[`servidor/schema.sql`](servidor/schema.sql)** —
Postgres completo com isolamento por organização (RLS), controle de edição
simultânea, tempo real e a régua de cobrança rodando no banco. Foi executado
contra um PostgreSQL 16 de verdade: 18 tabelas, 58 políticas de segurança, e os
testes de isolamento e de conflito passaram.

---

## Os três perfis

O botão **Trocar de perfil** (canto inferior esquerdo) alterna a qualquer momento.

| Perfil | O que vê |
|---|---|
| **🧭 Adotante** | Vitrine com swipe e compatibilidade, doações, Fundo de Impacto, lar temporário, achados e perdidos, agenda |
| **🏢 ONG / protetor** | Gestão completa: animais, vacinas, adoções, lares, doações, estoque, prestação de contas, Selo de Confiança, rede de proteção |
| **📊 Dono da plataforma** | Assinaturas, cobrança, Fundo de Impacto, patrocínios, monetização e expansão |

---

## O que dá para fazer

### Quem adota
- **Descobrir** — cartões estilo Tinder (arraste ou use os botões), ordenados
  por compatibilidade de verdade, não só por foto.
- **Teste de compatibilidade** — 13 perguntas sobre espaço, horas fora,
  orçamento e convivência. Cada animal passa a mostrar uma nota e o motivo
  dela, incluindo o que vai dar trabalho.
- **Perfil do animal** — história, jeito, energia, custo mensal, vacinas, tempo
  de espera e o cartaz para imprimir com QR.
- **Meus interesses** — em que etapa está cada conversa com cada ONG.
- **Doar** — Pix, cartão, doação mensal, apadrinhamento e lista de presentes de
  ração. Com a opção de cobrir a taxa para a ONG receber 100%.
- **Fundo de Impacto** — para quem quer ajudar mas não sabe escolher. O valor é
  dividido todo mês entre as ONGs certificadas: 60% pela quantidade de animais
  sob cuidado, 40% pela nota do Selo. O extrato de quem recebeu o quê é público,
  e a taxa de gestão aparece na tela antes de você confirmar.
- **Apoiar a AuLar** — cotas de patrocínio para empresas e apoio mensal para
  pessoas. A tela avisa em letras grandes que este valor **não** vai para os
  animais: a AuLar é empresa, não ONG.
- **Ser lar temporário** — cadastro de capacidade e disponibilidade.
- **Achados e perdidos** — publicar animal perdido ou encontrado por região.
- **Agenda** — feiras de adoção e mutirões de castração das prefeituras do ABC.

### Quem cuida (ONG)
- **Painel** — abre dizendo o que precisa de você hoje, em uma frase por item.
- **Animais** — cadastro completo com fotos, personalidade, convivência,
  microchip e RGA. O que é preenchido aqui alimenta o match.
- **Saúde e vacinas** — o calendário **se monta sozinho** a partir da espécie e
  da idade, seguindo o protocolo brasileiro (V10/V4, antirrábica, gripe,
  giárdia, vermífugo, antipulgas). Confirme a aplicação e o reforço seguinte
  entra na agenda.
- **Adoções** — funil em kanban do interesse até o termo, com alerta de
  conversa parada, geração do termo de adoção responsável e acompanhamento
  pós-adoção agendado em 7, 30, 90 e 180 dias.
- **Lares temporários** — quem hospeda, quantas vagas restam e o SOS.
- **Doações** — histórico, doadores recorrentes, padrinhos e o convite pronto
  para transformar doador avulso em mensal.
- **Estoque e ração** — quantos **dias** de comida ainda restam, com aviso antes
  de acabar e pedido de doação pronto para o grupo.
- **Prestação de contas** — página pública que se monta sozinha com os dados do
  sistema, traduzindo valores em impacto concreto.
- **Equipe e acessos** — convide pessoas, defina o papel de cada uma e veja o
  histórico assinado de quem fez o quê.
- **Meu selo** — a nota do Selo de Confiança, o que está pesando contra, quanto
  já entrou do Fundo e a cota estimada da próxima rodada. O plano contratado
  não vale um ponto: o selo mede trabalho, não pagamento.
- **Feiras e eventos** — um clique gera os cartazes com QR de todos os animais.
- **Rede de proteção** — lista de ocorrências compartilhada entre as ONGs, que
  aparece como alerta na hora da triagem.

### Quem é dono do negócio
- **Visão do dono** — MRR, taxas, inadimplência e um parágrafo que lê os números
  e diz qual é a próxima ação.
- **ONGs e assinaturas** — carteira completa, com LTV, e o botão de entrar na
  conta da ONG para dar suporte vendo o que ela vê.
- **Cobrança** — a régua configurável: bloqueio, suspensão e remoção.
- **Fundo de Impacto** — saldo, prévia do rateio, fechamento da rodada e o selo
  de cada ONG. A taxa de gestão e o dia da distribuição são configuráveis.
- **Patrocínios** — carteira de empresas, três cotas e o argumento de venda
  pronto com os números reais da rede.
- **Monetização** — as 18 fontes de receita, com simulador.
- **Expansão** — praças, densidade por cidade e as 27 UFs prontas.

---

## A régua de cobrança

Exatamente como pedido, e configurável em **Plataforma → Cobrança**:

| Momento | O que acontece |
|---|---|
| Vencimento | Aviso no painel e faixa vermelha no topo |
| + carência (padrão **0 dias**) | **Bloqueio** — a gestão trava por completo |
| + 30 dias | **Suspensão** — a ONG e os animais saem da vitrine pública |
| + 90 dias | **Remoção** — perfil removido, com aviso 15 dias antes |

O **modo de bloqueio** tem duas opções. O padrão, "preservar vitrine", trava a
gestão inteira mas mantém no ar as páginas dos animais já publicados até a
suspensão — para que nenhuma adoção se perca por causa de uma fatura. "Bloqueio
total" tira tudo do ar já no primeiro dia. O raciocínio por trás dessa escolha
está em [PROJETO.md](PROJETO.md#a-o-bloqueio-no-dia-seguinte-preserve-a-vitrine-dos-animais).

**Para ver funcionando:** em **Plataforma → Configurações**, use os botões de
viagem no tempo (+30, +60 dias). As faturas vencem, as ONGs bloqueiam, suspendem
e são removidas de verdade.

---

## Estrutura

```
aular/
├── index.html            moldura da aplicação
├── css/app.css           design system (tokens, tema claro e escuro)
├── js/
│   ├── 00-core.js        estado, datas, moeda, roteador, modal, QR, Pix
│   ├── 01-seed.js        dados de demonstração do ABC + praças e UFs
│   ├── 02-vacinas.js     protocolo vacinal e geração da agenda
│   ├── 03-match.js       compatibilidade entre pessoa e animal
│   ├── 04-billing.js     planos, faturas, régua e fontes de receita
│   ├── 05-publico.js     telas de quem adota, doa e hospeda
│   ├── 06-gestao.js      telas da ONG
│   ├── 07-plataforma.js  telas do dono do negócio
│   ├── 09-fundo.js       selo, fundo de impacto e patrocínio
│   ├── 10-site.js        site de divulgação (a porta de entrada)
│   ├── 11-contas.js      contas, papéis, presença e sincronização
│   └── 08-app.js         menu, login e inicialização
├── css/site.css          identidade do site de divulgação
├── servidor/schema.sql   Postgres com RLS, para o acesso entre computadores
├── PROJETO.md            estratégia, pesquisa e monetização
└── README.md
```

### Onde mexer

| Quero mudar | Arquivo / função |
|---|---|
| Preços e limites dos planos | `01-seed.js` → `PLANOS_PADRAO` |
| Regra de bloqueio e remoção | `04-billing.js` → `aplicarRegua`, `podeUsarGestao`, `vitrineVisivel` |
| Peso de cada critério do match | `03-match.js` → `PESOS` e `compatibilidade` |
| Perguntas do teste | `03-match.js` → `QUIZ` |
| Protocolo de vacinas | `02-vacinas.js` → `PROTOCOLO` |
| Fontes de receita e simulador | `04-billing.js` → `FONTES_RECEITA` |
| Critérios e pesos do Selo | `09-fundo.js` → `CRITERIOS` e `NIVEIS` |
| Rateio e taxa do Fundo | `09-fundo.js` → `cotasFundo`, `fundo().taxaGestao` |
| Cotas de patrocínio | `09-fundo.js` → `COTAS_PATROCINIO` |
| Cidades e praças de operação | `01-seed.js` → `PRACAS` e `UFS` |
| Cores e tipografia | `css/app.css` → bloco `:root` |
| Textos e seções do site | `10-site.js` → `montarSite` e as funções de seção |
| Papéis e permissões | `11-contas.js` → `PAPEIS` |
| Banco de produção | `servidor/schema.sql` |

---

## Detalhes que valem saber

- **Funciona offline.** Nenhuma chamada de rede é necessária. As fontes vêm do
  Google Fonts quando há internet e caem para a fonte do sistema quando não há.
- **QR Code próprio.** Codificador escrito do zero (modo byte, nível L, versões
  1 a 9, escolha de máscara por penalidade). Verificado com decodificador real:
  2.512 símbolos gerados, 2.512 lidos corretamente.
- **Pix copia-e-cola** gerado no padrão BR Code (EMV), com CRC16 e sem acento
  nos campos de nome e cidade, como manda a especificação.
- **Tema claro e escuro**, no botão 🌙 do topo.
- **Responsivo**, testado até 390px de largura.
- **Imprimível** — o cartaz do pet, o termo de adoção e a prestação de contas
  saem limpos no `Ctrl+P`, sem menu nem botões.
- **Seus dados são seus.** Em Meu plano → Meus dados, a ONG baixa tudo em JSON —
  inclusive quando a conta está bloqueada.

---

## As três formas de dinheiro entrar — e por que ficam separadas

| | Quem paga | Para onde vai |
|---|---|---|
| **Doar para uma ONG** | doador que já escolheu | 100% para ela, menos a taxa de serviço (que o doador pode cobrir) |
| **Fundo de Impacto** | doador que não sabe escolher | dividido entre as ONGs certificadas; 12% de gestão ficam com a AuLar |
| **Apoiar a AuLar** | empresa (patrocínio) ou pessoa | 100% para a AuLar — e a tela diz isso com todas as letras |

Nenhuma tela deixa o dinheiro mudar de dono sem avisar antes, no mesmo lugar e
no mesmo tamanho de letra. É isso que sustenta a credibilidade que o Fundo
existe para criar.

O **Selo de Confiança** decide quem recebe do Fundo. São nove critérios
calculados ao vivo sobre o trabalho de verdade — e **o plano contratado não vale
um único ponto**, de propósito: no dia em que pagar mensalidade melhorar a nota,
a nota deixa de valer. Há um teste automatizado que falha se alguém mexer nisso.

---

## Dados da demonstração

Seis ONGs fictícias em Santo André, São Bernardo, São Caetano, Diadema, Mauá e
Ribeirão Pires, com 20 animais, 14 adoções, 70 doações, lares temporários,
estoque, eventos reais da região e duas ONGs propositalmente em atraso — para
que a régua de cobrança tenha o que mostrar.

Para começar do zero: **Plataforma → Configurações → Apagar tudo e recomeçar**.
