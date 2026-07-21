# A! Multiplicadora — orientações do projeto

Sistema de página única (um arquivo HTML, sem build, JavaScript puro) para o
programa de multiplicadores de vendas da **A! Multiplicadora**. Persistência no
navegador (localStorage). Visual dark-luxury (ouro sobre preto), fontes Fraunces
+ Manrope.

## Arquivos

- `multiplicadora-body.html` — **fonte** (conteúdo: `<style>` + HTML + `<script>`,
  sem as tags `<!doctype>/<html>/<head>/<body>`). É o que vai para o Artifact.
- `multiplicadora.html` — **standalone** gerado a partir do body + cabeçalho
  (fontes do Google, `<title>`). É o que se abre no navegador.

Para gerar o standalone a partir do body: envolver o `body` com o `<head>`
(fontes) e fechar `</body></html>`, removendo o `<title>` duplicado do body.

## REGRA DE ENTREGA (vale para TODAS as conversas)

Sempre que finalizar e enviar o HTML para a cliente, **nomeie o arquivo** no
formato:

```
Multiplicadora DDMM.VV
```

- **Multiplicadora** — nome do projeto.
- **DDMM** — data de criação do arquivo (dia+mês). Ex.: 21/07 → `2107`.
- **VV** — versão com 2 dígitos, começando em `01` e incrementando a cada nova
  entrega. Reinicia em `01` quando a data (DDMM) muda.

Exemplo: `Multiplicadora 2107.01`

A mesma string de versão deve ficar **carimbada dentro do HTML**: atualize a
constante `APP_VERSION` no `<script>` (função de boot). Ela aparece no rodapé do
login e do menu lateral. Ao subir uma nova versão, atualize `APP_VERSION` e o
nome do arquivo enviado juntos.

## Outras convenções

- Sem dados fictícios: o sistema começa vazio e é preenchido pelo cadastro.
- Dados só no navegador (localStorage) — não é segurança de produção; para
  multiusuário seguro, seria necessário um backend.
- Nunca incluir identificadores internos de modelo em nada versionado.
