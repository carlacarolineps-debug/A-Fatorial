# Testar o app no seu celular, hoje

Você não precisa de loja, nem de Mac, nem de Android Studio para usar o app
como aplicativo. Ele já funciona: tela cheia, ícone na tela de início, sem
barra de navegador. São dois passos, e o primeiro você faz uma vez só.

---

## Passo 1: ligar o endereço (uma vez, 2 minutos)

O site já está pronto dentro do repositório, na pasta `docs`. Falta só
apertar o interruptor do GitHub.

1. Abra <https://github.com/carlacarolineps-debug/A-Fatorial/settings/pages>
2. Em **Source**, escolha **Deploy from a branch**.
3. Em **Branch**, escolha `claude/strategy-cards-mentoring-vygy1x`.
4. Ao lado, na pasta, escolha **`/docs`**.
5. Clique em **Save**.

Espere de 1 a 3 minutos. Recarregue a página: aparece uma faixa verde com o
endereço. Ele vai ser:

```
https://carlacarolineps-debug.github.io/A-Fatorial/
```

Se você preferir, dá para trocar depois para a branch `main`: é o mesmo
botão.

---

## Passo 2: virar aplicativo no celular (30 segundos)

Abra aquele endereço no celular e faça isto:

**No Android (Chrome)**
Toque nos três pontinhos, no canto de cima, e escolha
**Instalar aplicativo** (ou **Adicionar à tela inicial**).

**No iPhone (Safari)**
Toque no botão de compartilhar (o quadrado com a seta para cima), role a
lista e escolha **Adicionar à Tela de Início**.

Pronto. O ícone do escudo dourado aparece junto com os outros aplicativos.
Ao abrir por ele, o app ocupa a tela inteira, sem barra de endereço, e
funciona sem internet depois da primeira abertura.

---

## O que muda entre isto e a versão da loja

| | Pelo endereço (hoje) | Pela loja (depois) |
|---|---|---|
| Ícone na tela de início | sim | sim |
| Tela cheia | sim | sim |
| Funciona sem internet | sim | sim |
| Login com e-mail e senha | sim | sim |
| Aparece na busca da loja | não | sim |
| Notificação empurrada | não | sim |
| Botão físico de voltar do Android | do navegador | do app |

Ou seja: **para testar, e até para a turma usar, isto já basta**. A loja é
sobre encontrabilidade e sobre notificação, não sobre o app funcionar.

---

## Atualizar o app depois de uma mudança

O site sai do mesmo arquivo do app. Quando o `.html` for atualizado, o
`docs/index.html` é atualizado junto, e o endereço passa a servir a versão
nova em 1 a 3 minutos. Quem já instalou não precisa reinstalar: o app se
atualiza sozinho ao abrir com internet.

---

## Um aviso sobre o endereço ser público

O repositório é público, então qualquer pessoa que descobrir o endereço
consegue abrir a **tela de login**. E só. Sem um e-mail com acesso liberado,
não passa daí: quem decide isso é a regra dentro do banco, não o
aplicativo. A chave que fica no arquivo é a chave pública (`anon`), feita
justamente para isso.

Se ainda assim você preferir um endereço que ninguém adivinhe, dá para
publicar em outro lugar com nome sorteado (Netlify, arrastando a pasta
`docs` em <https://app.netlify.com/drop>).
