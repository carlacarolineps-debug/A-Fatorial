# O que a Carla pediu

Lista viva. Existe para que nada se perca entre uma conversa e outra, que
foi um pedido dela. Varrida da conversa inteira, não de memória.

Ordem: **aberto** primeiro, porque é o que importa. **Entregue** fica
embaixo, para conferência.

---

## ABERTO

Nada. Tudo o que ela pediu para construir está construído, e o que está
em cada bloco tem prova rodando. O que resta depende dela, logo abaixo.

---

## O PEDIDO QUE MOVEU TUDO

Vale guardar, porque é dele que sai quase todo o resto.

### Nada baixado no computador de ninguém
**Revisado por ela, e o pedido ficou maior e melhor do que "bloquear
download".** O que ela quer:

- proposta, contrato (no D4Sign) e laudo **online**, sempre
- o cliente aprova, assina e baixa **se ele quiser**
- o funcionário **nunca precisa baixar nada**
- reduz o risco de material usado indevidamente
- reduz processo perdido e documento esquecido no computador de alguém

O motivo está na frase dela: *"hoje eles esquecem de mandar uma
confirmação de agenda e controlar frequência de mentoria, imagina um monte
de documento baixado e perdido. Não quero ninguém de babá de funcionário."*

Então não é só travar o download. São duas coisas juntas:

1. **O documento não vira arquivo.** Vive no servidor, é visto no
   navegador com marca d'água, e o cliente recebe link com prazo, não
   anexo.
2. **O envio não é decisão de ninguém.** O processo dispara, cobra e
   escala sozinho. Ninguém precisa lembrar.

Dentro disso, os dois casos que ela citou como já doendo hoje:
- confirmação de agenda que não é mandada
- frequência de mentoria que ninguém controla

**As duas metades estão construídas.**

A metade 2 é o `backend/obrigacoes.js`: o processo gera a obrigação, o
servidor cumpre sozinho o que consegue, cobra o dono e escala para a
direção. Os dois casos acima são os dois primeiros que ela resolve.

A metade 1 é o `backend/documentos.js`, e o documento não vira arquivo:

- montado **no servidor**, na hora de ver, e nunca existe como arquivo no
  computador de ninguém
- o funcionário **vê**, com marca d'água com o nome dele; a rota de baixar
  não existe para a equipe, não é botão escondido
- o cliente recebe **link com prazo**, amarrado ao telefone dele, e
  confirma os 4 últimos dígitos para abrir. Abrir é a prova de que chegou,
  e fecha sozinha a obrigação
- **baixar é direito do cliente**, não da equipe
- o **portal do cliente** guarda tudo o que já foi enviado, e esse
  endereço não expira
- contrato continua indo para o **D4Sign**, que já está integrado; o que
  muda é que ninguém precisa baixar o PDF para mandar

**Ligado às telas**, e é o que está no bloco de entregues abaixo.

---

## ABERTO · depende dela

Nada disso eu consigo fazer daqui.

- [ ] **Vetor do símbolo** (SVG, AI ou EPS) com o designer. O que está no
      ar é a minha leitura, tirada da foto da parede. Print colado na
      conversa não vira arquivo: precisa vir anexado.
- [ ] Confirmar se **11 9.1101-2147** é mesmo o celular que atende no
      WhatsApp
- [ ] Um número de WhatsApp **próprio para a mentoria** (`WHATSAPP_CC`)
- [ ] Revisar os números da capa: 12 anos, +500 empresárias, 83 serviços
- [ ] Revisar os textos de **Operação Blindada** e **Comunicação Pão com
      Manteiga** na página dela. O do DNA da Liderança veio do catálogo do
      sistema, com as palavras dela; os outros dois eu escrevi a partir do
      nome, porque não existem descritos em lugar nenhum do projeto
- [ ] Abrir `site/marca.html` e conferir que o laudo de contraste segue
      aprovado
- [ ] Contratar o VPS, apontar o domínio e subir o `backend/`
      (ver `backend/HOSPEDAGEM.md`)
- [ ] Criar o app na Meta e pegar a chave do modelo, para ligar o
      atendente (ver `backend/README.md`)
- [ ] **Trocar a senha `admin`** da conta de dona antes de qualquer pessoa
      entrar no sistema

---

## REGRAS PERMANENTES

Valem para tudo, sem precisar repetir.

- **Sem travessão.** Nem no site, nem no sistema, nem na documentação,
  nem nas respostas no chat. Vírgula, dois-pontos ou ponto final.
- **A palavra "ritual" não se usa.** Virou "reunião".
- **Entrega no chat** como `Grupo A! <DDMM>.<VV>.html`, com o dia no
  **horário de Brasília**, idêntico ao commitado.
- **Tudo num arquivo só**: site, página da Carla e sistema.
- **O EMC é da Carla**, não do grupo.
- **As duas frentes se completam**, uma não anula a outra.
- Trabalho em `claude/kanban-whatsapp-integration-xeorrc`.

---

## ENTREGUE

Cada linha tem commit. `git log` conta a história completa.

**Identidade e site**
- Logo real no lugar do nome escrito, sub-logos nos devidos lugares
- O símbolo, na leitura tirada da foto da parede
- Site e sistema num arquivo só, e depois a página da Carla como terceiro lado
- Fundo que viaja: cada seção com a sua luz, em vez do mesmo chão
- Pé da escala de tipos maior, e dez tamanhos cravados abaixo do piso
- Menu travado no topo e seta de voltar ao início
- Quadro de rolagem eliminado, título sem o "Cinco"
- Zero travessões, e a palavra "ritual" fora
- A foto dela: retrato, selo da mentoria e avatar no sistema

**Página da Carla**
- Terceiro lado do arquivo, com a paleta do Instagram: preto, cinza,
  branco, dourado e fúcsia
- O EMC como bússola, movida pela rolagem
- Operação Blindada, DNA da Liderança e Comunicação Pão com Manteiga

**Comercial**
- Aprofundamento do diagnóstico: cinco perguntas, leitura na tela e lead
  gravado a cada resposta
- Conversa no WhatsApp começando com o resumo escrito

**Atendimento**
- Atendente de IA no `backend/`, que qualifica antes do humano e não
  inventa preço, prazo nem agenda

**Equipe ao mesmo tempo**
- Sincronização provada com duas contas: campos diferentes somam, mesmo
  campo registra a sobrescrita
- A tela não cai de ninguém: espera modal, digitação e seleção, e devolve
  a rolagem
- `syncReentrar`: a sessão volta sozinha quando some do servidor
- Quem está neste registro agora, dentro do cartão
- Desvios de processo passaram a sair do navegador

**Governança**
- Trilha com quem, de onde, o quê, antes e depois
- Regra que barra, pedido de autorização com liberação de uso único
- Desfazer que reverte e não roda duas vezes
- Marca d'água com o nome de quem está vendo

**Documento do cliente**
- O documento nasce e vive no servidor, e a equipe não tem rota de baixar
- Envio recusado para qualquer número que não seja o do cliente
- Link com prazo de 14 dias, aberto só com os 4 últimos dígitos do
  WhatsApp dele
- Portal do cliente que não expira e guarda tudo o que já foi enviado
- Trilha visual no documento: enviado, aberto por você, aprovado
- Visual refeito para cliente visual: cabeçalho da marca em ouro sobre
  breu, corpo claro para ler e imprimir, um desenho por tipo de documento

**Banco de talentos**
- Sete provas: julgamento situacional, fit cultural, DISC, números
  aplicados, atenção ao detalhe, motivadores e escrita
- Setenta questões, com o fit trazendo itens invertidos para pegar quem
  responde o que soa bonito
- Índice de 0 a 100 com pesos à vista, e a recomendação escrita:
  entrevistar, vale conversar ou não agora
- Bandeiras: parou no meio, respostas incoerentes, rápido demais, escrita
  em branco, sigilo frouxo, não assume o que pega, perfil distante
- O que perguntar na entrevista, gerado das notas mais baixas
- Comparação com a média do banco
- Nenhuma pergunta sobre idade, estado civil, filhos, religião, política,
  saúde, deficiência, cor, origem, sindicato ou antecedentes
- Dado sensível escrito pela pessoa por conta própria fica oculto e só
  aparece com a autorização dela, que fica registrada
- Consentimento, finalidade e prazo de guarda de 12 meses na tela de quem
  responde
- O cadastro público emenda direto na prova, com rascunho salvo a cada
  resposta para ninguém perder o trabalho

**Importar e distribuir leads**
- Colar a lista ou subir CSV, com as colunas reconhecidas escritas de
  qualquer jeito
- Conferência antes de gravar: sem nome, sem contato, telefone quebrado,
  e-mail inválido, repetido na lista e repetido na base, cada um com o
  motivo escrito
- Distribuição pessoa por pessoa, na quantidade que ela quiser, com
  atalho de dividir igual, e o que não for distribuído cai no painel
  livre
- Só quem tem contrato assinado aparece para receber
- Telefone normalizado com código do país, valor lido no formato
  brasileiro, e a importação inteira registrada na trilha

**Currículo em arquivo**
- A pessoa anexa no cadastro, o arquivo vive no servidor
- A dona abre por endereço, e a abertura entra na trilha
- Não existe rota de baixar, e o arquivo abre no navegador sem ficar no
  disco de quem leu
- Executável ou HTML renomeado para .pdf é recusado pela assinatura do
  arquivo, não pelo nome
- Reenviar troca, não acumula, e o antigo some
- Apagado sozinho depois de 12 meses, que é o prazo que a tela promete

**Os três desfechos da seleção**
- Convite de entrevista, aprovado e não aprovado saem pelo motor de
  obrigações, com o texto pronto e igual dos dois lados
- A recusa sai em até uma hora, porque é a que mais deixa de sair
- Ela pede dia e hora como data, e o lembrete de 24 horas antes fica
  agendado; sem data legível o lembrete fica aberto para uma pessoa, em
  vez de sair junto com o convite
- O motivo da recusa fica só no sistema e nunca vai na mensagem

**Histórico entre processos**
- Cada bateria vira uma avaliação datada
- Quem se cadastra de novo é reconhecida pelo documento, e-mail ou
  WhatsApp, e as fichas viram uma só
- A evolução aparece em uma frase, e a tabela mostra índice, recomendação
  e escopo de cada época

**Governança na tela**
- A trilha com quem, de onde, o quê, e o que mudou campo a campo
- Filtro por pessoa, por ação e só o que foi barrado
- Botão "Barrar" em qualquer linha, que vira regra a partir de um caso
  real, para a pessoa toda ou só para quem fez
- Pedido de autorização com autorizar de uso único ou recusar
- Desfazer com um clique, que devolve o valor de antes e também fica na
  trilha
- Ação da própria governança não se barra nem se desfaz, para ninguém
  ficar sem saída

**Os documentos ligados às telas**
- Os nove laudos (valuation, franqueabilidade, COF, POP, diagnóstico,
  precificação, reestruturação, lista de documentos e contrato) saem pelo
  servidor em vez da janela de impressão
- O desenho de cada laudo é preservado e fica preso dentro do corpo do
  documento, para uma regra de laudo não alcançar o resto da página
- A equipe abre por vista assinada de duas horas, e envia ao cliente pelo
  botão da própria página, que é onde o servidor sabe o número
- Lista de leads e de lançamentos deixam de virar arquivo e viram
  documento no servidor, com carimbo e sem rota de baixar
- Backup completo é só da administração, com aviso e registro
- Impressão não se bloqueia no navegador, então o carimbo com o nome vai
  junto na folha e a ação entra na trilha
- O documento segue o padrão visual do sistema: mesma paleta, mesma
  esteira, mesmos botões, vindos de `backend/estilo.js`

**Obrigações**
- O processo gera a obrigação, o servidor cumpre o que consegue sozinho,
  cobra o dono e escala para a direção
- Confirmação de agenda e frequência de mentoria deixam de depender de
  alguém lembrar

**Documentação**
- `backend/HOSPEDAGEM.md`, comparativo com números
- `site/LEIA-ME.md`, o padrão visual e o porquê de cada decisão
