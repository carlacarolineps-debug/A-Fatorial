# Fase 2 — kit de backend (TMB)

Arquivos para ligar a Operação Blindada ao Supabase + Netlify, recebendo pela **TMB** (boleto e PIX parcelados). Passo a passo completo em [`../docs/GUIA-Fase2-TMB.md`](../docs/GUIA-Fase2-TMB.md).

| Arquivo | O que é | Onde vai |
|---|---|---|
| `01b-tmb-schema-patch.sql` | Patch idempotente: garante as colunas/tabelas que a TMB usa (`access`, `automation_log`). Rode **depois** do seu `01-supabase-schema.sql`. | Supabase › SQL Editor |
| `02-tmb-webhook.ts` | Edge Function `tmb-webhook`: recebe os eventos da TMB e libera/bloqueia acesso. Substitui o antigo `cakto-webhook`. | Supabase › Edge Functions |

**Você já tem** (do kit anterior, agnósticos de gateway — não mudam com a TMB): `01-supabase-schema.sql` e `03-integracao-cliente.js`.

## O que confirmar no painel da TMB
1. **Checkout hospedado** com PIX/boleto/cartão parcelados → cole a URL em `PAY.checkoutUrl` na página de vendas.
2. **Webhook** apontando para `https://SEU-PROJETO.supabase.co/functions/v1/tmb-webhook`.
3. **Segredo** igual ao secret `TMB_WEBHOOK_SECRET` do Supabase.
4. **Nomes técnicos dos eventos** (aprovado / pendente / cancelado / reembolso) → mapeie no objeto `EVENT_ACTION` no topo de `02-tmb-webhook.ts`. Os nomes já vêm com exemplos comuns; ajuste aos exatos da TMB.

> Segurança: só a chave **anon public** vai no HTML. A `service_role` fica **apenas** nos secrets da Edge Function.
