# Auditoria comercial: o que era venda do app e o que é conteúdo da mentoria

Feita antes de mexer em qualquer linha, porque a regra número um era não
tocar no material pedagógico. O app menciona "R$", "preço", "investimento",
"pagamento" e "compra" centenas de vezes, e a quase totalidade disso é a
mentoria falando do negócio do aluno.

## Método

Varredura em todos os arquivos-fonte por: `instagram`, `wa.me`, `t.me`,
`whatsapp`, `telegram`, `renovaç`, `renovar`, `assinar`, `assinatura`,
`comprar`, `compra`, `checkout`, `hotmart`, `kiwify`, `eduzz`, `indicar`,
`indicaç`, `convite`, `embaixador`, `loja`, `matricul`. Cada ocorrência foi
lida no contexto e classificada em uma de duas categorias.

## O que era comércio do app: removido

| Onde | O que era | O que foi feito |
|---|---|---|
| `INVITE_URL` | Link para o perfil comercial no Instagram | Removido |
| `openReferral()` | Tela "Indique e ganhe" com WhatsApp, Telegram e e-mail | Virou função vazia, sem nenhuma porta de entrada |
| `regReferral()` | Contava convites e dava 120 XP por canal | Virou função vazia |
| `copiarConvite()` | Copiava o texto de venda com o link | Virou função vazia |
| Tela Mais | Bloco "Construa junto e ganhe" com "Indicar a mentoria" | Virou "Construa junto", só com sugestão e nível |
| Pesquisas | "Cada um se abre quando você indica a mentoria para alguém" | "Cada um se abre conforme você avança no método" |
| Pesquisas, faixa | "N de 7 desbloqueadas. Cada indicação libera a próxima" | "N de 7 liberados" com o próximo e o que falta fazer |
| Pesquisas, cartão travado | "Libere indicando: faltam N indicações" | "Conclua N trilhas (você tem N)" |
| `TEST_GATES` | 7 instrumentos travados por 1 a 7 indicações | Régua nova, pelo trabalho feito |
| Troféu "Embaixador(a)" | "Indicou a Operação Blindada para alguém" | Virou "Presente": confirmou presença em um encontro |
| O Ano, aba ritmo | "12 meses + renovação antecipada. Quem renova antecipado mantém a condição de fundador e não devolve a vaga para a fila" | "Um ciclo de 12 meses", falando do arco do ano |
| Folha de impressão A4 | Rodapé com o arroba do perfil comercial | Só "Mentoria de Carla Caroline" |
| Tela de acesso pendente | "Não encontramos uma compra ativa", "se você acabou de comprar" | "Ainda não encontramos um acesso liberado", "se a sua inscrição foi confirmada agora" |
| Tela de login | "o mesmo e-mail que você usou na compra" | "o mesmo e-mail que você usou na inscrição da mentoria" |

As funções `openReferral`, `regReferral` e `copiarConvite` continuam
existindo, vazias, de propósito: se alguma chamada antiga tiver escapado da
varredura, ela não quebra a tela de quem está usando. `openPointsCenter`
passou a abrir a patente, que é o que a pessoa queria ver quando clicava.

## O que é conteúdo da mentoria: preservado, intocado

Nenhuma destas ocorrências foi alterada. Todas falam do negócio do aluno.

- **Trilhas de Finanças**: capital de giro, prazo de fornecedor, "não
  financie necessidade de longo prazo com dívida de curto prazo",
  investimento fixo, câmbio, "às vezes alugar sai mais barato que comprar".
- **Trilha de Preço e margem**: preço, margem, ticket médio, o que sobra.
- **Trilhas de Processos e Delegação**: "compra acima de certo valor" como
  exemplo de alçada, a padaria que delegou o deslocamento e não a compra,
  teto em reais para compra semanal.
- **Trilha de Estratégia**: fusão e aquisição, "uma empresa compra outra",
  crescimento interno contra externo.
- **Trilhas de Pessoas**: recrutamento interno e externo, "sempre comprar um
  curso pronto" como resposta errada de quiz, renovação como um dos seis
  ritos de cultura de Beyer e Trice.
- **Apostila, ferramenta de transição**: "acaba o atendimento por WhatsApp
  pessoal de cada vendedor" como exemplo de fim de uma fase.
- **Apostila, networking**: "indicar a Ana para o Marcos" como exemplo de
  ação de rede do aluno, não de indicação do app.
- **Comunidade, cartão de membro**: "Instagram, e-mail ou WhatsApp" como
  exemplo do contato que a própria pessoa escolhe mostrar.
- **Termo de Blindagem**: "assinar" no sentido de firmar um compromisso.
- **A Bússola**: "cole no WhatsApp" ao copiar o próprio plano de ação.

## A régua nova de desbloqueio

Antes: cada instrumento abria quando a pessoa mandava um convite. O
instrumento virava moeda de captação.

Agora: abre quando a pessoa tem o trabalho feito que aquele instrumento
exige para ser interpretado.

| Instrumento | Abre com |
|---|---|
| Perfil DISC | O autodiagnóstico do negócio respondido |
| Pesquisa de Clima | 1 trilha concluída |
| Inteligência Emocional | 2 trilhas |
| Âncoras de Carreira | 4 trilhas |
| Cultura Organizacional | 6 trilhas |
| Estrutura de Caráter | 8 trilhas |
| Estilo de Liderança | 10 trilhas |

Três coisas continuam valendo:

1. `S.unlocks[id]` é chave mestra: a mentora libera manualmente quando quiser.
2. Quem já tinha um instrumento aberto não perde nada.
3. Quando uma trilha fecha e isso abre um instrumento, o app avisa na hora,
   com notificação e aviso na tela. Sem isso a régua ficaria invisível.

## O enquadramento nas lojas

Com o comércio fora, o app se enquadra como ferramenta de empresa para
cliente já contratado (regra 3.1.3(b) da Apple, e o equivalente do Google).
O acesso vem da mentoria contratada fora do aplicativo, e o app não vende,
não oferece e não menciona compra em lugar nenhum.

Um único botão de compra derruba esse enquadramento e obriga a usar a
compra dentro do aplicativo, com a comissão de 30%. É por isso que a
indicação saiu inteira, e não apenas o link.
