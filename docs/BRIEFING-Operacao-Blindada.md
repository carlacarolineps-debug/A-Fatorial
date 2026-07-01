# OPERAÇÃO BLINDADA — Briefing de Continuidade (para Claude Code)

> Cole este arquivo no Claude Code para continuar o projeto. Ele descreve **tudo que já foi construído**, a **arquitetura**, os **pontos de integração** e o que **falta** (Fase 2 / backend).

---

## 1. Contexto

- **Produto:** *Operação Blindada* — mentoria paga gamificada. Tagline: **"Estrutura que protege. Estratégia que escala."**
- **Dona/mentora:** Carla Caroline (Grupo A! Fatorial). Título: **Mentora Comportamental e Estrategista de Negócios**. Metodologia **EMC (Estratégia, Mentalidade e Comportamento)**.
- **Idioma:** tudo em **PT-BR**.
- **Marca:** carbono/preto + dourado; escudo com cadeado (logo registrado no INPI — `logo-operacao-blindada.png`). Fontes: **Playfair Display** (display), **Inter** (texto), **JetBrains Mono** (dados/labels).
- **E-mail da mentora (no app):** `gestaogrupoa@gmail.com` · contato: `contato@afatorial.com.br` · @pscarlacaroline · WhatsApp +55 (11) 91101-2147.

### Princípios de produto (não violar)
- **Teoria → prática.** Nada pode terminar em "só leitura". Todo conteúdo/laudo desemboca em ação, documento ou compromisso.
- **Marcar em vez de escrever.** Interfaces guiadas (ticar/selecionar/poucos campos); evitar caixas de texto em branco.
- Comunicação **curta e grossa, cirúrgica**, focada em aplicação e lucro. Sem linguagem motivacional genérica.
- Visual **minimalista, sofisticado, alto impacto.**
- **Executar sem perguntar demais**; propor melhorias além do pedido.

---

## 2. Arquitetura (2 fases)

**Fase 1 (atual):** apps **single-file HTML + `localStorage`**. Cada usuário guarda seu estado no próprio navegador. Sem backend real.

**Fase 2 (a construir):** **Supabase** (auth, dados, RLS) + **webhooks de pagamento**. Todos os pontos de integração já estão marcados no código com comentários:
- `// === BACKEND (Supabase — Fase 2) ===`
- `// === TMB ===` (checkout/pagamento)

São **3 artefatos independentes** (arquivos separados de propósito — o app do cliente NÃO pode conter o painel admin):

| Artefato | Arquivo | O que é |
|---|---|---|
| App do mentoreado | `Operacao-Blindada-v18.html` (~395 KB) | Portal do cliente pagante |
| Console de gestão | `Operacao-Blindada-Console-Admin.html` (~54 KB) | Back office com acessos por equipe |
| Página de vendas | `Operacao-Blindada-Pagina-de-Vendas.html` (~77 KB) | Landing + checkout TMB + liberação |
| Logo | `logo-operacao-blindada.png` | Marca (INPI) |

---

## 3. APP DO MENTOREADO (`Operacao-Blindada-v18.html`)

Arquivo de trabalho legado: `Operacao-Blindada-v6.html` (contém o conteúdo mais novo; é editado e exportado versionado).

### 3.1 Estrutura técnica
- **2 blocos `<script>`:** (1) CDN Supabase + módulo `window.OB` (Fase 2); (2) app principal.
- Estado global **`S`**; `localStorage` chave **`operacaoblindada:state:v1`** via `Store.get/set`. `defaultState()` + `boot()` faz merge `{...defaultState(),...S}` com *guards* por campo. `save()` = debounce + `OB.push(S)`.
- Roteamento `NAV` → views: `home, trilhas, ferramentas, pesquisas, diario, plano, conquistas, mentora` (+ `lesson`). `go(view)`, `current` = view atual.
- Helpers: `el/$/$$`, `modal(html)/closeModal()`, `toast`, `addXp(n,label)`, `grantTrophy(id)`, `pushNotif`, `escapeHtml`, `signature()`.
- **Campos de estado** (defaultState + boot): `xp, level, modules, deepTests, surveys, tools, diary, plan, notes, notifs, log, streak, retake` **+ (execução)** `pdca, agenda, suggestions, referrals, unlocks, results`.

### 3.2 Conteúdo
- **19 trilhas / 19 testes profundos** em **5 GROUPS**: `raiox`(🔍), `descompressao`(🌬️), `lideranca`(🎯), `engenharia`(⚙️), `financas`(💰). `MOD_MAP` mapeia trilha→grupo; `m.group` fica setado em cada módulo.
- **DEEP_TESTS** por trilha (modes `maturity` | `profile`), com laudo (`showDeepTestResult`).
- Conteúdo **parafraseado** de PDFs CENES (finanças/estratégia) — **nunca copiar verbatim**.

### 3.3 FERRAMENTAS (motor guiado generativo) — 9
`TOOLS[]` = `{id, icon, mod(group), title, desc, intro, steps[], build(d)}`. Tipos de step: `pick`, `multi`(+`more`), `scale`, `text`, `number`.
Ferramentas: `posicionamento, decisao` (raiox) · `ficha` (descompressao) · `feedback, conflito, bemestar` (lideranca) · `governanca` (engenharia) · `giro, equilibrio` (financas).
Funções: `renderFerramentas, openTool, tgStepHtml, tgCollect, tgGenerate, tgSave, tgCopy, tgPick/tgToggle/tgScale`, helpers `tgEsc/tgList/tgMoney`. Cada resultado sai com a **barra universal de ações** (ver 3.5).

### 3.4 PESQUISAS & TESTES (motor com laudo) — 7
`SURVEYS[]` com `kind:'climate'|'profile'`:
- **climate:** `clima` (18 itens), `cultura` (13). Relatório por categoria.
- **profile:** `disc` (24, 4 tipos), `carater` (25, 5 tipos Reich/Lowen — com disclaimer "não é diagnóstico clínico"), `ancoras` (24, 8 âncoras Schein), `ie` (16, 4 domínios Goleman), `lideranca-estilo` (16, 4 estilos). Cada um: `dims`, `desc` (laudo por tipo), `reportTop`.
- Funções: `renderPesquisas, fillSurveyCards, openSurvey, likertSurvey, pickSurvey, submitSurvey, profileScores, descBlock, showProfileResult, showSurveyResult, avgScore/avgPct`, `FIELD_ORDER/FIELD_LABELS`.

### 3.5 MOTOR DE EXECUÇÃO (barra universal em todo resultado)
`withResultActions(opts)` guarda o artefato em `_art` e injeta a barra: **💾 Salvar · 🖨️ Imprimir A4 · 🎯 Plano 30d · 🔁 PDCA · 📅 Agenda · 📔 Diário**. Plugada em: `tgGenerate` (tools), `showSurveyResult` (clima), `showProfileResult` (perfil), `showDeepTestResult` (trilhas).
- Ações: `actSave, actPrint, actToPlano/confirmToPlano, actToPdca, actToAgenda/confirmAgenda, actToDiario/confirmDiario`.
- **PDCA:** `PDCA_STAGES`, `newPdca` (guiado), `openPdca`, `savePdca(id,analyze)`, `delPdca`, **`showPdcaAnalysis(id)`** (gera laudo: % preenchido, diagnóstico por fase, próximo passo).
- **Agenda:** `gcalUrl(title,ts,details)` (link **Google Agenda** real), `exportAgendaICS` (.ics Apple/Outlook), `delAgenda`.
- **Resultados salvos:** `S.results` + `reopenResult, delResult`.
- **Impressão A4 premium:** `#printSheet` + `@media print` (cabeçalho com escudo, dourado, Playfair; `ps-top/ps-shield/ps-brand/ps-titlebar/ps-doc/ps-meta/ph-body/ps-foot`; `print-color-adjust:exact`).

### 3.6 Plano = Central de Execução (hub com abas)
`renderPlano` + `planTab` ∈ {`acoes, pdca, agenda, resultados`}. `goPlano(tab)`. **Dashboards na Home:** `planAgendaDashboards()` (anel de progresso do plano + próximos itens da agenda). Ações: `addPlan, addPlanFrom, togglePlan, delPlan, planDueLabel, exportPlanICS`.

### 3.7 Composers guiados (marcar, não escrever)
`openComposer/composerConfirm` (reusa `tgStepHtml`/`tgCollect`).
- **Diário:** `diaryGuided` (guiado) + `toggleDiaryFree` (modo livre opcional).
- **Plano:** `PLAN_LIBRARY` (ações prontas por área) + `openPlanLibrary/confirmPlanLibrary`.
- **PDCA:** `newPdca` guiado.

### 3.8 Aplicação prática nas trilhas
Ao concluir (ou pelo botão **🎯 Aplicar na prática** no card): `applyPracticeModal(modId,{completed})` → 3 passos: **(1) gerar documento** (abre a ferramenta do grupo — `TOOLS.filter(t=>t.mod===m.group)`), **(2) comprometer** (`applyCommit` → composer → vira ação no Plano com prazo), **(3) aprofundar/refletir** (teste profundo + `diaryGuided`). `APPLY_ACTIONS` por grupo. `moduleCompleteModal(m)` = `applyPracticeModal(m.id,{completed:true})`.

### 3.9 Indicação & Desbloqueio (crescimento)
**Regra:** TODAS as pesquisas/testes começam **bloqueados**; **1 desbloqueio por indicação**, nesta ordem:
```
TEST_GATES = { disc:1, clima:2, cultura:3, ie:4, ancoras:5, carater:6, 'lideranca-estilo':7 }
```
- `refCount()` = nº de indicações enviadas (`S.referrals.length`). `testLock(s)` aplica a **todas** as SURVEYS. `S.unlocks[id]` pode sobrescrever.
- `openReferral` (WhatsApp/Telegram/Email via `inviteText()`), `regReferral(ch)` (registra, +XP, notifica desbloqueio, re-render).
- **[PENDING] `INVITE_URL`** aponta hoje para `https://instagram.com/pscarlacaroline` → **trocar pela URL real de checkout/landing** (a página de vendas).
- **Sugestão (co-criação):** `openSuggestion/submitSuggestion` (+XP, troféu `cocriador`, envia por mailto para `gestaogrupoa@gmail.com`).
- Troféus novos: `cocriador` (💡), `embaixador` (🚀).

### 3.10 Evolução (histórico de versões)
v12 (módulo 05 Finanças) → v13 (Ferramentas guiadas generativas) → v14 (Pesquisas com laudo + DISC/Caráter/Âncoras/IE) → v15 (motor de execução + barra universal + Plano hub + sugestão + indicação + impressão A4) → v16 (desbloqueio por indicação + composers guiados + A4 premium) → v17 (PDCA gera análise + Agenda Google + tudo bloqueado 1/indicação + dashboards Home) → **v18 (aplicação prática: cada trilha vira documento + compromisso + ação)**.

### 3.11 Validação obrigatória ao editar
- Extrair os **2 blocos `<script>`** por regex e rodar **`node --check`** em cada.
- Splices grandes: **Python** (`str.index` + slice). Heredoc bash: delimitador **`'JSEOF'`** (aspas simples). **Evitar** process substitution `<(...)` (o `sh` quebra).
- Cuidado com aspas aninhadas em `onclick` dentro de template literals.

---

## 4. CONSOLE DE GESTÃO (`Operacao-Blindada-Console-Admin.html`)

Back office **separado**, mesma identidade (denso/operacional). Login por **papel** (demo, sem senha — auth real é Fase 2).

- **Papéis (`ROLES`)** com módulos permitidos: `admin` (tudo + equipe), `comercial`, `suporte`, `sac`, `financeiro`, `sucesso`, `marketing`.
- **Módulos (`MODS` → render fns):** `overview, membros, comercial, suporte, financeiro, sucesso, marketing, equipe`.
  - **Membros:** tabela + busca/filtro + **drawer** com painel individual (plano, status, saúde, NPS, engajamento, chamados, depoimento).
  - **Comercial:** funil (leads→trials→pagantes) + top indicadores.
  - **Suporte & SAC:** chamados/sugestões (assumir/resolver/reabrir).
  - **Financeiro:** MRR, receita por plano, inadimplentes (cobrar).
  - **Sucesso do Cliente:** health score, distribuição, **contato prioritário** (risco de churn) + playbook.
  - **Marketing:** **avaliações & depoimentos** (aprovar/reprovar, copiar, **exportar CSV** dos aprovados).
  - **Equipe & Acessos** (admin): CRUD de usuários + papel + **matriz de permissões**.
- **Camada de dados `DB`** (overlay em `localStorage`) com **seed determinístico** (`mulberry32`): ~48 membros, ~34 chamados, ~22 depoimentos. Todos os reads/writes marcam `// === BACKEND ===`.
- **Fase 2:** trocar seed por Supabase; auth por e-mail/senha; permissões por **RLS**; financeiro/inadimplência via **webhooks Cakto/TMB**; chamados e depoimentos vindos do app.

---

## 5. PÁGINA DE VENDAS (`Operacao-Blindada-Pagina-de-Vendas.html`)

Landing de conversão (logo embutido em WebP data URI). Fluxo: **vendas → checkout TMB → liberação automática de acesso**.

### Configuração (topo do `<script>`)
```js
const PAY = {
  provider:'TMB',
  checkoutUrl:'',                 // === TMB === URL do checkout hospedado (vazio = modo demo)
  returnUrl: location.origin+location.pathname, // TMB volta com ?status=paid
  maxParcelas:12,
};
const PORTAL_URL='./Operacao-Blindada-v18.html'; // === BACKEND === URL real do portal
const OFFER = { anual:{price:970,full:1164,...}, mensal:{price:97,...}, bump:{price:197} };
```

### Componentes
- Herói (logo), dores, solução (teoria→prática), entregáveis, prova social (**placeholder — trocar pelos depoimentos aprovados no Console**), **oferta+checkout**, fluxo de acesso, automações, FAQ, footer (marca INPI).
- **Checkout:** toggle Anual/Mensal · métodos **PIX / Boleto / Cartão** com **parcelamento até 12x (TMB)** e cálculo da parcela ao vivo · **order bump** (+R$197) · campos nome/e-mail/WhatsApp · garantia 7 dias.
- **Funções:** `setPlan, setMethod, renderPrice, total, irPagamento, captureLead` (abandono), `releaseAccess` (gera token + magic link → overlay "Acesso liberado"), `checkReturn()` (detecta `?status=paid`), `toast`.
- **Modo demo:** se `PAY.checkoutUrl` vazio, `irPagamento()` simula aprovação e dispara `releaseAccess`.

### Fase 2 (ligar de verdade)
1. `PAY.checkoutUrl` = URL do produto na **TMB** (PIX/boleto parcelado/cartão).
2. **Webhook TMB** `order.paid` (e `boleto.pending`) → backend → cria usuário no **Supabase** → envia **magic link** por e-mail/WhatsApp.
3. `PORTAL_URL` = URL real do portal hospedado.
4. Cada venda deve **aparecer no Console** (Comercial/Financeiro/Sucesso).

---

## 6. Integrações & decisões em aberto

- **Pagamento:** a **página de vendas usa TMB** (boleto/PIX parcelado). Histórico do projeto citava **Cakto** para assinatura recorrente/NFe. **Definir** o provedor final (ou usar ambos) e reconciliar `INVITE_URL`/checkout.
- **Supabase (Fase 2):** auth, tabelas `members, tickets, testimonials, referrals, orders, leads, suggestions`; RLS por papel; sincronizar estado do app (`S`) do mentoreado.
- **Loop de prova social:** falta o **captador de depoimento/avaliação no app do mentoreado** → grava no Supabase → aparece no **Console › Marketing** → alimenta a **página de vendas**. (Próximo elo natural.)

## 7. Pendências (backlog)
1. [PENDING] Trocar `INVITE_URL` (app) pela landing/checkout real.
2. [PENDING] Definir provedor de pagamento e colar `PAY.checkoutUrl` (TMB).
3. [PENDING] Backend Fase 2: Supabase + webhooks (provisionamento automático de acesso).
4. [PENDING] Captador de depoimento no app (fecha o ciclo de marketing).
5. [PENDING] Autenticação real + RLS no Console (hoje é login demo por papel).
6. (Ideia) Medidor de "aplicação" na Home do app (quantas trilhas viraram ação).

## 8. Convenções de desenvolvimento
- Tudo **PT-BR**; tom curto e direto; UI guiada.
- **Single-file HTML** por artefato; sem dependências além de fontes Google e (Fase 2) CDN Supabase.
- **Validar JS** com `node --check` nos blocos `<script>` após cada edição.
- Manter os marcadores `// === BACKEND ===` e `// === TMB ===` intactos — são os pontos de virada da Fase 2.
- Estética carbono/dourado; Playfair/Inter/JetBrains Mono; escudo como assinatura.

---
*Gerado como handoff do estado do projeto até a v18 do app + Console Admin + Página de Vendas.*
