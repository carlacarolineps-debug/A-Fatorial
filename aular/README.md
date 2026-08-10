# 🐾 AuLar — Rede de Adoção e Gestão Animal

Plataforma de adoção responsável e gestão para ONGs e protetores de animais,
começando pelo Grande ABC e já preparada para o Brasil inteiro.

**Para usar: abra o arquivo `index.html` no navegador.** Sem instalação, sem
servidor, sem internet obrigatória. Os dados ficam salvos no próprio navegador.

> A estratégia do negócio — pesquisa de mercado, as 15 formas de monetizar,
> o que eu recomendo mudar no plano e como isso vira produção — está em
> **[PROJETO.md](PROJETO.md)**.

---

## Os três perfis

A tela inicial deixa escolher por onde entrar, e o botão **Trocar de perfil**
(canto inferior esquerdo) alterna a qualquer momento.

| Perfil | O que vê |
|---|---|
| **🧭 Adotante** | Vitrine com swipe e compatibilidade, doações, lar temporário, achados e perdidos, agenda |
| **🏢 ONG / protetor** | Gestão completa: animais, vacinas, adoções, lares, doações, estoque, prestação de contas, rede de proteção |
| **📊 Dono da plataforma** | Assinaturas, cobrança, receita, monetização e expansão |

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
- **Feiras e eventos** — um clique gera os cartazes com QR de todos os animais.
- **Rede de proteção** — lista de ocorrências compartilhada entre as ONGs, que
  aparece como alerta na hora da triagem.

### Quem é dono do negócio
- **Visão do dono** — MRR, taxas, inadimplência e um parágrafo que lê os números
  e diz qual é a próxima ação.
- **ONGs e assinaturas** — carteira completa, com LTV, e o botão de entrar na
  conta da ONG para dar suporte vendo o que ela vê.
- **Cobrança** — a régua configurável: bloqueio, suspensão e remoção.
- **Monetização** — as 15 fontes de receita, com simulador.
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
│   └── 08-app.js         menu, login e inicialização
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
| Cidades e praças de operação | `01-seed.js` → `PRACAS` e `UFS` |
| Cores e tipografia | `css/app.css` → bloco `:root` |

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

## Dados da demonstração

Seis ONGs fictícias em Santo André, São Bernardo, São Caetano, Diadema, Mauá e
Ribeirão Pires, com 20 animais, 14 adoções, 70 doações, lares temporários,
estoque, eventos reais da região e duas ONGs propositalmente em atraso — para
que a régua de cobrança tenha o que mostrar.

Para começar do zero: **Plataforma → Configurações → Apagar tudo e recomeçar**.
