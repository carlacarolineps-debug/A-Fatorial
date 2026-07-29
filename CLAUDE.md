# A! Fatorial — convenções do repositório

## Estrutura

| Pasta | O que é |
|---|---|
| `index.html` | Sistema de gestão em arquivo único (JS puro, sem build). Abre direto no navegador. |
| `grupo-a-sistema/` | Aplicação Next.js que substitui o Notion `Grupo A! \| Organização \| Produtividade \| Foco`. Tem `CLAUDE.md` próprio — leia antes de mexer no schema. |

## Registro de entrega

**Sempre que finalizar uma tarefa, publique um artifact HTML** com o registro
da entrega. Ele é o comprovante do que foi feito e do que ficou em aberto.

Nomenclatura — `Sistema Grupo A!` + `DDMM` + `.NN`:

```
Sistema Grupo A!2907.01     primeira entrega de 29 de julho
Sistema Grupo A!2907.02     segunda entrega do mesmo dia
Sistema Grupo A!3007.01     primeira entrega de 30 de julho
```

- `DDMM` é a data do dia da entrega, sem separador.
- `.NN` reinicia em `01` a cada dia e incrementa a cada entrega nova.
- Antes de escolher o número, liste os artifacts existentes para não repetir
  um `.NN` já usado no mesmo dia.

O registro deve conter, no mínimo:

- **nome, data e versão efetiva** em destaque;
- o que foi entregue, com os números reais (arquivos, models, commit, branch);
- **verificação** — os comandos que rodaram e o resultado de cada um, não a
  afirmação genérica de que "funciona";
- decisões estruturais, quando houver;
- o que ficou em aberto, separando *atenção* (risco conhecido) de *a fazer*.

Uma entrega nova gera um artifact novo, com URL própria. Corrigir uma entrega
já publicada é republicar o mesmo arquivo, mantendo a URL e a versão.

## Entregas publicadas

| Versão | Data | Escopo | URL |
|---|---|---|---|
| 2907.01 | 29.07.2026 | Scaffold do `grupo-a-sistema/` — schema, fórmulas, dashboard, migração do Notion | https://claude.ai/code/artifact/de54f25a-65c9-491d-b9bd-94f9eaea9fd5 |
