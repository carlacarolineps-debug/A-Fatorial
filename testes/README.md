# O teste do login

O login é a única parte do app que não dá para conferir só olhando: ela
depende de rede, de sessão, de e-mail e de um servidor do outro lado. Este
teste troca o Supabase por um de mentira e percorre o caminho inteiro, no
navegador de verdade, com a trava de acesso **ligada** (roda em `http://`,
não em `file://`).

## Como rodar

```bash
node servidor.cjs            # serve o .html em http://127.0.0.1:8731
NODE_PATH=$(npm root -g) node login.cjs
```

O `supabase-de-mentira.js` define `window.supabase` com um setter que
engole a escrita, porque o arquivo do app traz o supabase-js de verdade
embutido e ele grava na mesma propriedade depois. Sem isso o de mentira
seria substituído e o teste falaria com a internet.

## Os onze cenários

1. primeira entrada: pede o e-mail, e o app não aparece por trás
2. e-mail inválido não passa e não gasta um envio
3. o código: normaliza o e-mail, avança sozinho no sexto dígito, recusa
   código errado e segura o reenvio por 60 segundos
4. conta criada mas sem acesso: explica, sem nenhum caminho de compra
5. acesso liberado no meio: o app abre sem sair e voltar
6. linha que nasceu só com e-mail: chama `casar_meu_acesso`, sem escrever
   direto na tabela
7. **troca de conta no mesmo celular**: o progresso de uma pessoa não vai
   para a conta da outra, e o que ficou no aparelho é apagado
8. sem rede: abre dentro dos 7 dias, e depois deles pede uma conexão
9. trabalho feito offline não é atropelado pelo servidor: sobe
10. acesso cortado durante o uso: a tela avisa na hora
11. erro do servidor sai em português, não em inglês

O teste 7 existe por um motivo: sem a marca de dono no aparelho, a segunda
pessoa a entrar no mesmo celular recebia o progresso inteiro da primeira,
porque o app enviava o que estava guardado localmente para a conta nova.
