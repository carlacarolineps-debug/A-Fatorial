# Os testes do navegador

O login é a única parte do app que não dá para conferir só olhando: ela
depende de rede, de sessão, de e-mail e de um servidor do outro lado. Este
teste troca o Supabase por um de mentira e percorre o caminho inteiro, no
navegador de verdade, com a trava de acesso **ligada** (roda em `http://`,
não em `file://`).

## Como rodar

```bash
node servidor.cjs                            # serve o build mais novo
NODE_PATH=$(npm root -g) node entrada.cjs    # senha, primeiro acesso e recuperacao
NODE_PATH=$(npm root -g) node sessao.cjs     # troca de conta, offline, acesso cortado
NODE_PATH=$(npm root -g) node admin.cjs      # a mesa da mentoria
```

O `supabase-de-mentira.js` define `window.supabase` com um setter que
engole a escrita, porque o arquivo do app traz o supabase-js de verdade
embutido e ele grava na mesma propriedade depois. Sem isso o de mentira
seria substituído e o teste falaria com a internet.

## `entrada.cjs`: a porta do app

1. a tela pede e-mail e senha, com primeiro acesso e esqueci a senha
2. **senha errada não entrega se a conta existe**: mensagem única para os
   dois casos, senão qualquer pessoa descobre a lista de e-mails da turma
3. primeiro acesso: código de 6 dígitos, código errado recusado, e só então
   a tela de criar senha. **O app não abre antes de a senha existir**
4. a senha tem regra: mínimo de 8, não só números, e as duas iguais
5. salvar a senha abre o app
6. da próxima vez entra direto, **sem mandar e-mail nenhum**
7. esqueci a senha: mesmo caminho, senha nova, e entra
8. sem acesso: a tela cobra o mesmo e-mail da inscrição, sem caminho de compra
9. trocar a senha de dentro do app

## `sessao.cjs`: o que acontece depois de entrar

1. linha que nasceu só com e-mail: chama `casar_meu_acesso`, sem escrever
   direto na tabela
2. **troca de conta no mesmo celular**: o progresso de uma pessoa não vai
   para a conta da outra, e o que ficou no aparelho é apagado
3. sem rede: abre dentro dos 7 dias, e depois deles pede uma conexão
4. trabalho feito offline não é atropelado pelo servidor: sobe
5. acesso cortado durante o uso: a tela avisa na hora
6. erro do servidor sai em português, não em inglês

O teste da troca de conta existe por um motivo: sem a marca de dono no aparelho, a segunda
pessoa a entrar no mesmo celular recebia o progresso inteiro da primeira,
porque o app enviava o que estava guardado localmente para a conta nova.


---

# O teste da mesa da mentoria (`admin.cjs`)

Sete blocos, e o primeiro é o que importa mais: **quem não é mentora não vê
nada**. Nem o item na tela Mais, nem os formulários, nem a lista de alunas,
mesmo digitando o caminho na mão.

Os outros seis: o painel traz os números e a fila do que espera decisão; os
três formulários de publicar (áudio, aula, encontro) publicam de verdade;
a lista de alunas mostra quem está fora e há quanto tempo cada uma mexeu;
liberar chama a função do banco; encerrar pede confirmação antes de chamar;
e as abas de perguntas e moderação montam na mesma mesa.

Vale lembrar o que este teste **não** prova: ele roda contra um Supabase de
mentira, então ele mostra que a tela pede a coisa certa. Quem prova que o
pedido é recusado para quem não pode é `supabase/testes/01-ataque-ao-banco.sql`,
que roda contra um Postgres de verdade.


---

# A medição de velocidade (`velocidade.cjs`)

Roda com o processador freado em 4x, que é a referência do Google para
aparelho mediano, e mede quatro coisas: a primeira abertura, a troca de tela,
a rolagem e o tamanho. Os números da versão 0508.06:

| | Medido | O que é aceitável |
|---|---|---|
| Primeira pintura | 256ms | abaixo de 1,8s é bom |
| Carga completa | 805ms | abaixo de 3s é bom |
| Trocar de tela | 8 a 47ms | abaixo de 100ms parece instantâneo |
| Rolagem | 60 quadros/s | 60 é o teto da tela |
| Tamanho comprimido | 753KB | uma vez só, depois fica no aparelho |

Vale rodar de novo depois de qualquer mudança grande: número que piora sem
ninguém perceber é como o app fica lento com o tempo.


---

# O diagnóstico (`diagnostico.cjs`)

Abre as telas de verdade, uma por uma, e confere o que o desenho promete.
26 conferências, e cinco retratos em `z_diag-*.png`.

O que ele mede, e por que cada item está aí:

| Conferência | O defeito que ela pega |
|---|---|
| a escala é de evidência | voltar para "concordo totalmente" mede opinião, e opinião sobre si mesmo é o que a pessoa erra |
| a tela NÃO pula sozinha | o avanço automático transformava 19 frases em 19 batidas na mesma coluna |
| o eco traz a resposta por extenso | selecionar sem ler o que foi selecionado não é decidir |
| o app interrompe no automático | cinco iguais seguidas, ou resposta em menos de 1,5 segundo |
| a medição chega inteira ao resultado | foi assim que apareceu o `qzFechar` zerando o `QZ` antes de medir |
| barras ordenadas, sem radar | ângulo não se compara, comprimento sim |
| a mais fraca em coral, com etiqueta | é a resposta para "por onde eu começo" |
| contraste com o gradiente lido parada a parada | a `background-color` de um botão de ouro é transparente, e a conta ingênua reprova o que está certo |

O teste responde de verdade: ele clica nas opções, deixa a pausa disparar e
sai dela pelo caminho de quem segue mesmo assim. Teste que fabrica o estado
final por dentro aprova o que vai quebrar na mão de quem usa.
