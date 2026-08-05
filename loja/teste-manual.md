# Roteiro de teste manual, antes de mandar para as lojas

O que os testes automáticos já garantem: as 15 telas abrem sem erro, nenhuma
estoura a largura do celular, não há texto de venda em lugar nenhum, a régua
nova trava e destrava certo, o termo aparece travado no primeiro acesso, as
fontes carregam sem internet e o supabase-js está embutido.

O que só uma pessoa consegue testar está aqui. Marque cada linha.

## 1. A primeira entrada (aparelho limpo)

- [ ] Instalar e abrir. A tela de login pede e-mail.
- [ ] Digitar um e-mail **que não está inscrito**. O código chega.
- [ ] Digitar o código. Aparece "Acesso ainda não liberado", sem nenhum
      botão de compra, com o e-mail do suporte.
- [ ] Sair e entrar com um e-mail **inscrito**. O app abre.
- [ ] Aparecem as boas-vindas do método. Fechar.
- [ ] Logo depois aparece "Como a gente convive aqui". **Não dá para fechar
      por fora nem pelo x.** Só o botão passa.
- [ ] Aceitar. Recarregar o app: o termo não aparece de novo.

## 2. O código de 6 dígitos

- [ ] O código chega em menos de 1 minuto.
- [ ] Digitar 6 dígitos entra sozinho, sem apertar o botão.
- [ ] Digitar um código errado mostra o aviso e limpa o campo.
- [ ] "Reenviar o código" manda outro, e o novo funciona.
- [ ] "Usar outro e-mail" volta para a tela de e-mail.

## 3. Moderação (precisa de duas contas)

- [ ] Na conta A, publicar uma foto na galeria.
- [ ] Na conta B, ver a foto. Existem os botões **Denunciar** e **Bloquear**.
- [ ] Denunciar: escolher motivo, escrever e enviar. Aparece a confirmação e
      a oferta de bloquear.
- [ ] Bloquear: a foto some **na hora**, sem recarregar.
- [ ] Ir em Mais, Pessoas bloqueadas: a pessoa está lá. Desbloquear.
- [ ] Recarregar: a foto voltou.
- [ ] No mapa de membros, o cartão da outra pessoa tem os mesmos dois botões.
- [ ] Na conta da mentora, abrir Mais, Painel de denúncias: a denúncia está
      lá, com as horas correndo, e passa a vermelho depois de 20 horas.
- [ ] "Removi o conteúdo" tira da fila.
- [ ] "Suspender a conta" derruba o acesso da outra pessoa (confira: ela
      recarrega e cai na tela de acesso não liberado).

## 4. Conta e privacidade

- [ ] Mais, Privacidade: o documento abre e rola inteiro.
- [ ] Mais, Termos de uso: idem.
- [ ] Mais, Excluir a minha conta: escrever qualquer coisa que não seja
      EXCLUIR não deixa passar.
- [ ] Escrever EXCLUIR e confirmar (use uma conta de teste). O app volta para
      a tela de login e a conta sumiu do banco.

## 5. Acesso ao vivo

- [ ] Com o app aberto, mudar no banco `access.status` para `inactive`.
      Em segundos a tela de acesso não liberado aparece por cima.
- [ ] Voltar para `active`: o app recarrega sozinho e volta ao normal.
- [ ] Fechar e reabrir o app: reconfere sem pedir login de novo.

## 6. Sem internet

- [ ] Colocar em modo avião e abrir o app. Ele abre e funciona.
- [ ] As fontes estão certas (título em serifa, não a fonte do sistema).
- [ ] Marcar uma aula, escrever no diário: tudo salva.
- [ ] Voltar a internet: o progresso sobe para a conta.
- [ ] (Opcional, exige mudar a data do aparelho) Passar 8 dias sem rede: o
      app pede uma conexão para reconferir, dizendo quantos dias faz.

## 7. Dentro do aplicativo (só depois de empacotar)

- [ ] O botão físico de voltar do Android: fecha o modal, depois volta de
      tela, e só sai do app com dois toques na Home.
- [ ] Um link externo (o link de um encontro) abre no navegador do sistema,
      não preso dentro do app.
- [ ] O teclado não cobre o campo que está sendo digitado.
- [ ] A barra de baixo não fica embaixo da barra de gestos do celular.
- [ ] "Imprimir A4" abre a tela "Documento pronto" e o arquivo salva.
- [ ] Abrir o arquivo salvo: sai formatado, com o cabeçalho da Operação
      Blindada e a linha de assinatura.
- [ ] O ícone na tela de início é o escudo, sem borda branca e sem corte.

## 8. Antes de apertar publicar

- [ ] A conta de teste do revisor está criada e com o acesso ativo.
- [ ] O texto explicando o login por código está no campo de observações
      para o revisor.
- [ ] Os três endereços (privacidade, termos, suporte) abrem no navegador.
- [ ] As capturas de tela estão no tamanho que cada loja pede.
- [ ] A classificação está em 18 anos ou mais.
