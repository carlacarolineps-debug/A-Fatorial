# Convenções do projeto, A! Fatorial

## Entrega de cada versão

Ao finalizar qualquer trabalho, além de commitar e enviar para a branch:

1. **Rodar `python3 site/juntar.py`**, que junta o site, a página da Carla e o
   sistema num arquivo só, `Grupo A! Fatorial.html`.
2. **Entregar esse arquivo no chat**, nomeado assim:

```
Grupo A! <DDMM>.<VV>.html
```

- `DDMM` é o dia e o mês da entrega no **horário de Brasília** (ex.: 28 de
  julho vira `2807`); o servidor roda em UTC, então confira o dia local antes
  de nomear
- `VV` é o número da versão do dia, com dois dígitos, começando em `01`
  (a segunda entrega do mesmo dia é `.02`, e assim por diante)

Exemplo: `Grupo A! 2807.01.html`

O arquivo enviado deve ser **idêntico** ao `Grupo A! Fatorial.html` commitado.
É o ecossistema inteiro numa página só, para abrir direto no navegador.

> **Atenção.** Editar `index.html` sozinho NÃO atualiza o que ela recebe.
> `index.html` é só o sistema; o site vive em `site/index.html`, e só o
> `juntar.py` faz os dois virarem o arquivo que vai para o chat. Entregar o
> `index.html` cru já aconteceu e ela recebeu o sistema sem o site.

## Estrutura

- `Grupo A! Fatorial.html` é a entrega: site, página da Carla e sistema no
  mesmo arquivo. Gerado, nunca editado à mão.
- `index.html` é o **sistema** (página única, JavaScript puro, sem build).
- `site/index.html` é o **site público** mais a página da Carla.
- `site/juntar.py` é quem junta os dois, prefixando o CSS do site com `#porta`
  para as 833 classes do sistema e as 209 do site não se pintarem.
- `backend/` é o servidor: WhatsApp, atendente de IA, equipe ao mesmo tempo,
  governança, obrigações, documentos e currículos.
- `PEDIDOS.md` é a lista viva do que ela pediu, para nada se perder.
- `README.md` conta o que cada tela faz e onde mexer no código.
