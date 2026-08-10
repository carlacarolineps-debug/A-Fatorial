# O que a Carla pediu

Lista viva. Existe para que nada se perca entre uma conversa e outra, que
foi um pedido dela. Varrida da conversa inteira, não de memória.

Ordem: **aberto** primeiro, porque é o que importa. **Entregue** fica
embaixo, para conferência.

---

## ABERTO · construir

### 1. Tela de governança
A trilha, as regras, os pedidos e o desfazer já existem no servidor e
funcionam, testados. Falta a tela para ela usar: ver quem fez o quê e de
onde, filtrar por pessoa, criar regra, responder pedido de autorização e
desfazer com um clique.

### 2. Nada baixado no computador de ninguém
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

**Falta ligar isso às telas do sistema**, que é o item 5.

### 3. Importar e distribuir leads
Subir lista de leads por **serviço** ou **segmento**, e distribuir na
**quantidade** que ela quiser, para **quem** ela quiser.

### 4. Ligar os documentos às telas do sistema
O servidor está pronto e provado. O que falta é o sistema usar:

- a tela do cliente gera proposta, laudo e contrato pelo `POST /doc` em
  vez de montar PDF no navegador
- os **seis** pontos que hoje geram CSV e PDF direto no navegador
  (`cliExportarPDF`, `finExportarCSV`, `relatorioPDF`, `backupExportar`,
  `leadExportar` e o backup do sistema) passam a sair pelo servidor ou
  deixam de existir. Sem passar pelo servidor não há registro nem
  bloqueio possível
- o cartão do cliente mostra o endereço do portal dele e quem já abriu
  o quê

### 5. Cadastro de prestador e banco de talentos
O maior dos abertos. Pedido dela, por partes:

- página onde a pessoa **se cadastra como prestadora**
- envio de **currículo**
- **testes** que ela responde no cadastro
- o resultado vira **banco de talentos que só a Carla vê**
- a pessoa **só tem acesso ao sistema se for aprovada** e entrar na equipe
- **alerta jurídico**: o que a lei não permite usar numa seleção precisa
  de sinal e da **autorização dela** para ser compartilhado
- comunicação automática de **agenda de entrevista**, **aprovado** e
  **não aprovado**
- **painel e perfil** de cada pessoa, para seleção futura

Antes de construir, precisa da definição dela: **quais dados o teste
coleta**, porque isso decide o que é permitido guardar.

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

**Obrigações**
- O processo gera a obrigação, o servidor cumpre o que consegue sozinho,
  cobra o dono e escala para a direção
- Confirmação de agenda e frequência de mentoria deixam de depender de
  alguém lembrar

**Documentação**
- `backend/HOSPEDAGEM.md`, comparativo com números
- `site/LEIA-ME.md`, o padrão visual e o porquê de cada decisão
