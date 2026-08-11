# A! Multiplicadora — orientações do projeto

Plataforma SaaS de página única (um arquivo HTML, sem build, JavaScript puro)
para **gestão de alavancagem de vendas / programa de multiplicadores**.
Empresas assinam mensalidade. Persistência no navegador (localStorage).

## Visual (a partir da v2107.02)

- **Tema claro apenas** (não é mais dark). Paleta **Verde Crescimento**:
  base branca/verde-clara, **verde-esmeralda `#0B8457`** como cor primária,
  **dourado `#C89B3C`** só como destaque (marca "A!"). Semânticos: verde
  (bom), âmbar (aviso), vermelho (crítico), azul (info).
- No CSS, o token `--brand*` é o verde primário; `--accent*` é o dourado.
  A marca `.amark` usa `--accent-grad` (dourada). Fontes Fraunces + Manrope.
- Traga movimento com bom senso (reveals no scroll, count-ups, hovers),
  respeitando `prefers-reduced-motion`.

## Estrutura

- **Site público** (`#site`) antes do login: hero, como funciona, recursos,
  **planos/preços** (Essencial 497, Crescimento 997, Escala 1997), depoimentos,
  CTA. Fluxo: splash → site → login → app.
- **Perfis**: `admin` = **Dona/Plataforma** (vê tudo + Painel da Dona com MRR);
  `funcionario` = consultor (opera programas, sem plataforma/admin);
  `cliente` = empresa assinante; `vendedor` = portal individual.
- **Painel da Dona** (`RENDER.plataforma`): MRR, ARR, ativas/trial/churn,
  tabela de assinantes, receita por plano.
- **Dados de exemplo**: `seedDemo()` cria 5 empresas + vendedores + vendas +
  método + billing e 3 usuários demo (senha `demo`). Botão `data-act="seed-demo"`.

## Arquivos

- `multiplicadora-body.html` — **fonte** (`<style>` + HTML + `<script>`, sem as
  tags `<!doctype>/<html>/<head>/<body>`). É o que vai para o Artifact.
- `multiplicadora.html` — **standalone** (body + `<head>` com fontes + `<title>`).

## REGRA DE ENTREGA (vale para TODAS as conversas)

Sempre que finalizar e enviar o HTML, **nomeie o arquivo** assim:

```
Multiplicadora DDMM.VV
```

- **DDMM** — data de criação (dia+mês). Ex.: 21/07 → `2107`.
- **VV** — versão 2 dígitos, começa em `01`, incrementa a cada entrega;
  reinicia em `01` quando a data muda.

A mesma string fica **carimbada no HTML**: atualize a constante `APP_VERSION`
no `<script>` (aparece no rodapé do site, do login e do menu). Atualize
`APP_VERSION` e o nome do arquivo juntos.

## Outras convenções

- Sem dados fictícios por padrão (começa vazio); o exemplo é opcional.
- Dados só no navegador (localStorage) — não é segurança de produção; para
  multiusuário seguro/nuvem, seria necessário um backend.
- Nunca incluir identificadores internos de modelo em nada versionado.
