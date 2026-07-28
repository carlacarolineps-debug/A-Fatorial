# Convenções do projeto — A! Fatorial

## Entrega de cada versão

Ao finalizar qualquer trabalho, além de commitar e enviar para a branch,
**entregar o `index.html` no chat** como arquivo, nomeado assim:

```
Grupo A! <DDMM>.<VV>.html
```

- `DDMM` — dia e mês da entrega (ex.: 28 de julho → `2807`)
- `VV` — número da versão do dia, com dois dígitos, começando em `01`
  (a segunda entrega do mesmo dia é `.02`, e assim por diante)

Exemplo: `Grupo A! 2807.01.html`

O arquivo enviado deve ser **idêntico** ao `index.html` commitado — é o sistema
inteiro, para abrir direto no navegador.

## Estrutura

- `index.html` — a aplicação completa (página única, JavaScript puro, sem build).
- `backend/` — ponte opcional com a API oficial do WhatsApp (Cloud API da Meta),
  usada só pelo modo automático do Kanban operacional.
- `README.md` — o que cada tela faz e onde mexer no código.
