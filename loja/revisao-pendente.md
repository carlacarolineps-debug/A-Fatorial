# Revisão adversarial: o que ainda está em aberto

Cinco leituras independentes (RLS, webhook, entrada, moderação, lojas) e três
céticos por achado. Voltaram **27 achados confirmados por maioria**.

Os 4 críticos e o grant da régua foram corrigidos na 0508.07. O que segue
aqui é o que ficou, em ordem de gravidade. Nenhum deles impede subir.

## 5. [ALTO] aplicar_regua_inadimplencia() e security definer, escreve em access e continua com EXECUTE para PUBLIC: qualquer um com a chave anon roda o corte

**Onde:** `01_schema.sql`:624  ·  votos: 3/3

**O que acontece:** Toda funcao nasce com EXECUTE para PUBLIC. O arquivo so revoga isso em user_id_por_email (linha 176). aplicar_regua_inadimplencia nao tem grant nem revoke nenhum, nao recebe argumento, nao checa eh_mentora() e nao checa auth.uid(): ela reescreve o status de todas as linhas de access. Como esta no schema public, o PostgREST expoe como RPC para o papel anon. Cenario: a chave anon esta em texto claro no HTML publicado (operacao_base.html linha 630, e o bundle vai para as duas lojas). Qualquer pessoa faz curl -X POST https://okoylfnniukzwoxevyow.supabase.co/rest/v1/rpc/aplicar_regua_inadimplencia -H 'apikey: <anon>' -H 'Content-Type: application/json' -d '{}' e dispara a regua fora de hora, quantas vezes quiser. Efeito pratico: uma aluna que renegociou (o codigo trata DELETED sem acao, entao a parcela fica como vencida) e foi reativada na mao pela Carla volta para inactive no segundo seguinte, e a chamada pode ser repetida em loop como negacao de servico de escrita sobre access.

**Conserto:**

```
revoke execute on function public.aplicar_regua_inadimplencia() from public, anon, authenticated;
grant  execute on function public.aplicar_regua_inadimplencia() to service_role;

O cron continua funcionando, porque cron.schedule roda como o dono do job. Vale a mesma higiene para as outras (revoke ... from public antes de cada grant execute ... to authenticated): tem_acesso, eh_mentora, casar_meu_acesso, bloqueado, get_ranking e excluir_minha_conta hoje sao inofensivas para o anon porque auth.uid() vem nulo, mas o padrao certo e revogar de PUBLIC e conceder so ao papel que precisa.
```

## 6. [ALTO] O bucket midia e publico e a policy de leitura e to public: da para listar e baixar a midia de todo mundo sem estar logado

**Onde:** `01_schema.sql`:559  ·  votos: 3/3

**O que acontece:** O bucket midia e criado com public true (linha 541) e midia_le e for select to public using (bucket_id = 'midia'). O papel anon esta dentro de public, entao a rota de listagem do Storage responde para quem so tem a chave anon: curl -X POST https://okoylfnniukzwoxevyow.supabase.co/storage/v1/object/list/midia -H 'apikey: <anon>' -H 'Content-Type: application/json' -d '{"prefix":"","limit":1000}' devolve o caminho de todos os arquivos, e como o caminho e <uuid do dono>/<timestamp>_<nome>, sai tambem a lista de uuids das alunas. Depois cada arquivo baixa por /storage/v1/object/public/midia/<caminho>, sem autenticacao. O que vaza: as fotos que as alunas publicam (que os Termos prometem exibir apenas dentro do app, para os outros membros) e o audio ou video que a mentora grava respondendo a pergunta de uma aluna especifica na caixinha, que a policy caixinha_le trata como privado. A Politica de privacidade do app afirma o contrario: cada pessoa le e escreve apenas o que e dela.

**Conserto:**

```
Fechar o bucket e a policy:

update storage.buckets set public = false where id = 'midia';
drop policy if exists midia_le on storage.objects;
create policy midia_le on storage.objects
  for select to authenticated
  using (bucket_id = 'midia'
         and ((storage.foldername(name))[1] = auth.uid()::text
              or public.tem_acesso() or public.eh_mentora()));

E no app (operacao_base.html, midiaUpload por volta da linha 1133) parar de usar getPublicUrl: guardar o path e gerar a URL na hora de mostrar com sb.storage.from('midia').createSignedUrl(path, 3600). Se nao houver tempo de mexer no cliente antes de sabado, trocar so o to public por to authenticated ja mata a listagem anonima, que e o que transforma link dificil de adivinhar em baixar tudo.
```

## 7. [ALTO] A galeria envia a foto para um bucket chamado galeria, que o schema nunca cria nem tem policy: a foto nunca sai do aparelho

**Onde:** `comunidade.js`:264  ·  votos: 3/3

**O que acontece:** cmPublicarFoto chama OB.midiaUpload(f,'galeria'). O schema so cria os buckets audios e midia (linhas 539 a 542) e as policies de storage.objects so mencionam esses dois nomes. O upload devolve 404 Bucket not found, o catch da linha 269 cai no guardaLocal, a foto vira data URL dentro do localStorage e OB.galeriaPublicar nunca e chamado. Efeito: a aluna ve Publicada, ganha 8 XP e acha que publicou, mas a tabela public.galeria fica vazia para sempre, ninguem mais ve a foto, e toda a camada de moderacao de foto (denunciar, bloquear, apagar) nunca tem sobre o que agir. Some ainda que o bloqueio nao pode funcionar sem user_id vindo do servidor: modFiltra filtra por g.user_id, e o registro local nao tem esse campo.

**Conserto:**

```
Usar o bucket que ja existe e ja tem as tres policies com pasta por dono: em comunidade.js linha 264, trocar OB.midiaUpload(f,'galeria') por OB.midiaUpload(f,'midia'). Se quiser manter um bucket separado, criar tambem no 01_schema.sql: insert into storage.buckets (id,name,public) values ('galeria','galeria',false) on conflict (id) do nothing; e repetir as tres policies de midia trocando o bucket_id.
```

## 8. [ALTO] Nenhum retorno de erro do supabase-js é checado e processado = true é gravado sempre: qualquer falha de escrita vira "ok" no log

**Onde:** `index.ts`:208  ·  votos: 3/3

**O que acontece:** O supabase-js não lança exceção em erro de Postgres, ele resolve a promise com `{ error }`. Todas as escritas do arquivo ignoram esse retorno: `await db.from("access").upsert(...)` (linha 96), `await db.from("parcelas").upsert(...)` (linha 151) e o select das parcelas abertas (linha 163). O try/catch das linhas 202 a 223 só pega exceção de rede, então nunca vê erro de banco. Em seguida a linha 208 grava `processado: true` sem olhar se alguma escrita aconteceu. Cenário: o upsert em access falha com 42P10 (achado anterior), ou o RLS/permission muda, ou a coluna `external_ref` estoura o tamanho. O endpoint responde 200, o webhook_log fica com processado = true e erro = null, e a Carla não tem como descobrir que 40 alunas ficaram sem acesso, exatamente o oposto do que o cabeçalho do arquivo promete ("o log é a única coisa que vai existir para explicar o que aconteceu").

**Conserto:**

```
Checar todo retorno e só marcar processado quando houve escrita. Em `gravarAcesso`:

```ts
const { error } = await db.from("access").upsert(linha, { onConflict: "email" });
if (error) throw new Error("access upsert: " + error.message + " (" + error.code + ")");
```

Mesma coisa no upsert de parcelas e no select. No handler, marcar `processado: true` só quando o resultado disser que houve ação, gravar `erro` quando não houve, e responder 500 quando a falha for de banco (aí a TMB reenvia, que é o comportamento desejado):

```ts
if (log?.id) await db.from("webhook_log").update({ processado: r.ok === true, erro: r.ok ? null : String(r.motivo ?? "") }).eq("id", log.id);
```
```

## 9. [ALTO] O evento Vencido corta o acesso no mesmo dia e o cron nunca reverte: a régua escalonada de 1 a 10 dias nunca acontece

**Onde:** `index.ts`:174  ·  votos: 3/3

**O que acontece:** A seção 10 do schema documenta a régua: 1 a 5 dias de atraso mantém active ("boleto compensa em até 3 dias úteis"), 6 a 10 dias vira grace, 11 em diante vira inactive. Mas o webhook, ao receber status "Vencido", chama `gravarAcesso(email, "inactive", ref)` no ato. E `aplicar_regua_inadimplencia` tem `and a.status <> 'inactive'` (01_schema.sql linha 648), então o cron nunca mais toca naquela linha. Resultado: a tolerância de 1 a 5 dias e a faixa de grace são código morto. Passo a passo: parcela vence dia 10, a aluna paga o boleto no próprio dia 10 às 15h. Na madrugada do dia 11 a TMB emite "Vencido" (a compensação ainda não caiu) e o acesso vai para inactive na hora. A aluna abre o app no dia 11 e leva "Acesso ainda não liberado", mesmo tendo pago no prazo. Ela só volta se e quando o evento "Recebido" chegar e passar por todas as outras condições (achados sobre número da parcela, external_ref e corrida). Se esse único evento se perder, o cron não reativa e ela fica fora para sempre.

**Conserto:**

```
Tirar o corte imediato do webhook e deixar a escalada com o cron, que é onde a regra está escrita. Em index.ts:

```ts
if (status === "Vencido") {           // só registra, quem corta é a régua
  feito.push(`parcela ${numero} vencida, régua assume`);
  continue;
}
if (status === "Estornado") {         // estorno é dinheiro devolvido: corta na hora
  await gravarAcesso(email, "inactive", ref);
  feito.push("estornado, acesso cortado");
  continue;
}
```

E, no schema, deixar a régua também devolver quem quitou, senão qualquer evento perdido vira bloqueio permanente:

```sql
-- ao fim de aplicar_regua_inadimplencia
update public.access a
   set status = 'active', expires_at = null, atualizado_em = now()
 where a.status = 'grace'
   and not exists (select 1 from public.parcelas p
```

## 10. [ALTO] O número da parcela cai para 1 quando o campo não vem, e "3/12" vira 312: as parcelas colidem ou se multiplicam na chave única (external_ref, numero)

**Onde:** `index.ts`:133  ·  votos: 3/3

**O que acontece:** `const numero = Number(num(d.parcela ?? d.numero_parcela ?? d.numero) ?? 1) || 1;` transforma campo ausente, null, 0 e texto não numérico em 1. E `num` limpa a string com `replace(/[^\d,.-]/g,"")`, então "3/12" (formato comum de parcela) vira "312" e o número da parcela vira 312. A chave única de parcelas é (external_ref, numero) (01_schema.sql linha 500). Dois estragos concretos: (a) se o payload financeiro não trouxer o campo com um desses três nomes, as 12 parcelas do pedido PED-778 gravam todas em external_ref = 'PED-778', numero = 1, uma sobrescrevendo a outra, e a régua de inadimplência passa a enxergar uma parcela só; (b) mistura de formatos entre eventos quebra a idempotência: o evento "Vencido" chega com `parcela: "3/12"` (grava numero 312, status vencida) e o "Recebido" da mesma parcela chega com `parcela: 3` (grava outra linha, numero 3, status paga). A linha 312 continua vencida, a consulta da linha 163 acha 1 parcela vencida, o acesso não é reativado e o cron nunca reativa: a aluna pagou e fica fora para sempre.

**Conserto:**

```
Extrair só o primeiro inteiro e recusar a linha quando não houver número, em vez de inventar 1:

```ts
const bruto = d.parcela ?? d.numero_parcela ?? d.numero ?? d.installment;
const m = String(bruto ?? "").match(/(\d+)/);
const numero = m ? Number(m[1]) : null;
if (ref && numero == null) {
  feito.push(`parcela sem número em ${ref}: não gravada`);
  continue;   // com erro no webhook_log e processado = false
}
```

Depois de rodar o schema, checar em produção o primeiro payload financeiro real no webhook_log e confirmar o nome exato do campo antes da primeira cobrança.
```

## 11. [ALTO] Status desconhecido vira 'aberta', que é justamente o insumo do corte, e o casamento de status é exato e sensível a caixa

**Onde:** `index.ts`:148  ·  votos: 3/3

**O que acontece:** O mapa cobre quatro rótulos em português com capitalização de frase ("Aguardando pagamento", "Recebido", "Vencido", "Estornado") e `const st = mapa[status] ?? "aberta"` joga tudo o que sobra em 'aberta'. Só que a própria função, dez linhas acima, compara `status === "DELETED"`, caixa alta e inglês. As duas convenções não podem estar certas ao mesmo tempo, e a que não bater cai no default. Cenário concreto: a TMB envia "RECEBIDO" (ou "Pagamento recebido", ou "RECEIVED"). Nada casa: a parcela é gravada como 'aberta' com vencimento no passado, `feito` registra "status ignorado", o acesso não é reativado, e seis dias depois a `aplicar_regua_inadimplencia` enxerga uma parcela aberta e vencida e joga a aluna para grace, depois para inactive. Ou seja, um status desconhecido que significa "pago" produz corte de acesso de quem está em dia. A tabela parcelas também não tem check de status, então nada denuncia o valor errado.

**Conserto:**

```
Normalizar antes de comparar e nunca ter default silencioso:

```ts
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const MAPA: Record<string, string> = {
  "aguardando pagamento": "aberta", "pendente": "aberta", "pending": "aberta",
  "recebido": "paga", "received": "paga", "confirmado": "paga", "pago": "paga",
  "vencido": "vencida", "overdue": "vencida", "atrasado": "vencida",
  "estornado": "estornada", "refunded": "estornada", "chargeback": "estornada",
  "deleted": "cancelada", "cancelado": "cancelada",
};
const st = MAPA[norm(status)];
if (!st) { feito.push("status desconhecido: " + status); continue; }  // com erro no log
```

E travar o domínio no banco, para um valor novo aparecer como erro e não como corte:

```sql
alter table public.parcelas
  add constraint parcelas_status_ck
  check (status in ('aberta','paga','vencida','estornada','cancelada'));
```
```

## 12. [ALTO] Data e valor que não parseiam viram null em silêncio, e parcela com vencimento nulo nunca é cortada pela régua

**Onde:** `index.ts`:49  ·  votos: 3/3

**O que acontece:** `data()` só entende dd/mm/aaaa e aaaa-mm-dd. Um vencimento em "30/07/26" (ano com dois dígitos), "2026/07/30" ou "30 Jul 2026" devolve null, e a parcela é gravada com vencimento null. A `aplicar_regua_inadimplencia` filtra `p.vencimento is not null` (01_schema.sql linha 631), então essa parcela nunca entra na conta de atraso: a aluna para de pagar e mantém acesso indefinidamente, e nada aponta o problema porque o webhook respondeu 200 e marcou processado. A consulta da linha 163 também ignora null, então a parcela em aberto não bloqueia reativação nenhuma. O mesmo `num()` estraga o valor: `num("R$ 1.234,56")` limpa para "1.234,56", troca só a primeira vírgula e chega em Number("1.234.56") = NaN, gravando valor null em toda parcela que vier com separador de milhar.

**Conserto:**

```
Recusar a linha quando a data não for entendida (com erro no log, para reprocessar à mão) e aceitar mais formatos:

```ts
function data(v: unknown): string | null {
  const s = texto(v);
  if (!s) return null;
  let m = s.match(/^(\d{2})\/(\d{2})\/(\d{2,4})/);
  if (m) { const a = m[3].length === 2 ? "20" + m[3] : m[3]; return `${a}-${m[2]}-${m[1]}`; }
  m = s.match(/^(\d{4})[-\/](\d{2})[-\/](\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}
```

E, no laço do financeiro, `if (ref && !venc && (st === "aberta" || st === "vencida")) { feito.push("vencimento não entendido: " + texto(d.vencimento)); continue; }` com erro gravado no webhook_log. Para o valor:

```ts
const num = (v: unknown): number | null => {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  let s = String(v).replace(/[^\d,.-]/g, "");
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = Number(s);
```

## 13. [ALTO] Não existe guarda de ordem nem de reenvio: um evento antigo redistribuído reativa acesso cancelado e devolve parcela paga para aberta

**Onde:** `index.ts`:91  ·  votos: 3/3

**O que acontece:** `gravarAcesso` escreve o status novo com `atualizado_em: new Date().toISOString()` sem comparar com nada, e o upsert de parcelas sobrescreve o status atual sem condição. Não há chave de deduplicação de evento (webhook_log não tem coluna nem índice único de id de evento) nem leitura do horário do evento. Dois caminhos concretos: (a) alguém que não pagou recebe acesso: a aluna cancela, chega "Cancelado" e o acesso vai para inactive; horas depois a TMB reenvia por timeout o "Efetivado" original (o próprio código responde 200 para tudo justamente para evitar reenvio, mas reenvio por timeout de rede acontece antes da resposta chegar) e o acesso volta para active, sem nenhum pagamento novo; (b) quem pagou é cortada: a parcela 4 é paga e gravada como 'paga', depois a TMB reenvia o "Aguardando pagamento" da mesma parcela 4, o upsert devolve a linha para 'aberta' com vencimento no passado, e seis dias depois a régua corta o acesso de quem está quitada.

**Conserto:**

```
Mover as duas escritas para uma RPC com guarda monotônica, usando o horário do evento vindo do payload (`d.data_evento`, `p.data`, ou o `recebido_em` do log como reserva):

```sql
create or replace function public.gravar_acesso(
  p_email text, p_status text, p_ref text, p_evento_em timestamptz)
returns boolean language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update public.access
     set status = p_status,
         external_ref = coalesce(p_ref, external_ref),
         atualizado_em = greatest(now(), coalesce(p_evento_em, now()))
   where lower(email) = lower(p_email)
     and (p_evento_em is null or p_evento_em >= atualizado_em);
  get diagnostics n = row_count;
  if n = 0 and not exists (select 1 from public.access where lower(email) = lower(p_email))
  then insert into public.access (email, status, external_ref) values (lower(btrim(p_email)), p_status, p_ref); n := 1; end if;
  return n > 0;
end $$;
```

E, para parcelas, um `on conflict (external_ref, numero) do update ... where parcelas.status <> 'paga' or excluded.status in ('paga','estornada','cancelada')`, que o PostgREST não sabe escrever: precisa virar RPC também.
```

## 14. [ALTO] Sem external_ref a parcela não é gravada, mas o fluxo segue: no evento Recebido a própria parcela recém-paga bloqueia a reativação

**Onde:** `index.ts`:150  ·  votos: 2/3

**O que acontece:** O upsert de parcelas está dentro de `if (ref)`, mas o tratamento de status continua fora dele. Cenário: a parcela 3 de maria@exemplo.com está gravada como 'vencida' (vencimento 10/07). Chega o "Recebido" dessa parcela, só que nesse payload o identificador vem em outro nome (por exemplo `cobranca_id` em vez de `external_ref` ou `pedido_id`), então `ref` é "" e nada é gravado: a linha continua 'vencida' na tabela. Logo abaixo, a consulta da linha 163 procura parcelas em ('aberta','vencida') com vencimento anterior a hoje, acha justamente essa, e o código conclui "pago, mas ainda há 1 parcela vencida". O acesso não é reativado, o cron nunca reativa (a régua tem `a.status <> 'inactive'`), e a aluna que quitou fica fora para sempre. O endpoint devolve 200 e marca processado.

**Conserto:**

```
Não deixar o evento seguir sem chave, e não confiar em leitura pós-escrita para decidir. Primeiro:

```ts
if (!ref) { feito.push("linha sem external_ref: não gravada"); continue; }  // com erro no log
```

Depois, na checagem de pendências, excluir explicitamente a parcela do próprio evento em vez de supor que o upsert já surtiu efeito:

```ts
const { data: abertas, error } = await db.from("parcelas")
  .select("id").eq("email", email)
  .in("status", ["aberta", "vencida"])
  .not("vencimento", "is", null)
  .lt("vencimento", new Date().toISOString().slice(0, 10))
  .not("and", `(external_ref.eq.${ref},numero.eq.${numero})`);
if (error) throw new Error("parcelas select: " + error.message);
```

O ideal é a decisão inteira (marcar paga e reavaliar acesso) virar uma RPC única, como no achado da corrida.
```

## 15. [ALTO] pullState deixa o estado local antigo sobrescrever o servidor sem comparar atualizado_em, e o campo lido para isso e ignorado

**Onde:** `operacao_base.html`:1017  ·  votos: 3/3

**O que acontece:** A linha 1007 seleciona `state,atualizado_em`, mas `atualizado_em` nunca e usado: a decisao da linha 1017 e so `if (daqui && temPendente()) return subirEstado(daqui)`, ou seja, quem tem pendencia local ganha sempre, independente da idade. E `temPendente()` fica verdadeiro com facilidade: `marcaMudou()` roda em todo `push`, e `marcaEnviado()` so 1,2 segundo depois, no upsert; basta fechar o app logo apos a ultima acao. Cenario: dia 1, a aluna marca uma aula no celular e fecha o app na hora (`ob:mudou > ob:enviado`). Dias 2 a 8 ela trabalha no computador (o produto e feito para os dois: sessoes do treino, ferramentas, plano 30d, indicadores, tudo vai para o servidor). Dia 9 ela abre o celular: pullState ve `daqui` com pendencia e faz `subirEstado(daqui)` com a foto de 8 dias atras. O `state` do servidor e substituido inteiro e o localStorage nem e atualizado, entao boot carrega a versao velha e ela vira a verdade. Uma semana de trabalho apagada, sem nenhum aviso.

**Conserto:**

```
Usar o `atualizado_em` que ja vem na consulta e so deixar o local vencer quando ele for de fato mais novo:

```js
var servidorEm = (r.data && r.data.atualizado_em) ? new Date(r.data.atualizado_em).getTime() : 0;
var mudouEm = 0;
try { mudouEm = Number(localStorage.getItem("ob:mudou") || 0); } catch (e) {}
if (daqui && temPendente() && mudouEm > servidorEm) return subirEstado(daqui);
```

Quando o servidor for mais novo, seguir para o ramo `doServidor` normal. Se quiser proteger o trabalho offline que perdeu a disputa, gravar uma copia em `ob:descartado` antes de sobrescrever, para nao jogar fora sem chance de recuperar.
```

## 16. [ALTO] A tela de acesso pendente nao liga vigilancia nenhuma: quem acabou de pagar so entra se lembrar de tocar em Atualizar

**Onde:** `operacao_base.html`:1054  ·  votos: 3/3

**O que acontece:** Linha 1054: `if (a.status !== 'ATIVO') { showPending(...); return; }`. O `return` acontece antes de qualquer chamada a `vigiarAcesso()`, que so roda dentro de `abrirApp()` (linha 1033). Resultado: na tela pendente nao existe canal Realtime, nem a ronda de 15 minutos, nem o listener de `visibilitychange`, nem o de `online`. Cenario tipico do lancamento: a aluna paga na TMB, abre o app antes do webhook chegar, ve 'Acesso ainda nao liberado' e deixa o celular na mesa. O webhook grava `status='active'` 90 segundos depois e nada acontece na tela dela: o app so entra se ela voltar e tocar em Atualizar. Isso e exatamente o caso 'acesso liberado no meio da sessao'. Detalhe importante para o conserto: mesmo se `vigiarAcesso()` fosse chamado ali, o filtro Realtime da linha 934 e `user_id=eq.<uid>`, e a linha criada pelo webhook pode estar com `user_id` nulo ate `casar_meu_acesso()` rodar, entao o Realtime sozinho nao resolve o caso pendente.

**Conserto:**

```
Ligar uma ronda curta enquanto a tela pendente estiver aberta, e desliga-la ao abrir o app:

```js
var timerPend = null;
function vigiarPendente() {
  clearInterval(timerPend);
  timerPend = setInterval(reconferir, 60 * 1000);
  document.addEventListener("visibilitychange", pendVisivel);
  window.addEventListener("online", reconferir);
}
function pendVisivel() { if (!document.hidden) reconferir(); }
function pararPendente() { clearInterval(timerPend); timerPend = null; document.removeEventListener("visibilitychange", pendVisivel); window.removeEventListener("online", reconferir); }
```

Na linha 1054: `if (a.status !== "ATIVO") { showPending(...); vigiarPendente(); return; }` e chamar `pararPendente()` no inicio de `abrirApp()`. O `reconferir` ja faz `location.reload()` quando o status vira ATIVO, entao a entrada acontece sozinha.
```

## 17. [ALTO] Na primeira sessão o termo de conduta nunca aparece: modBoot só roda no boot e desiste quando ainda não há nome, e startJourney não o chama de volta

**Onde:** `moderacao.js`:313  ·  votos: 3/3

**O que acontece:** Conta nova: OB.start resolve, boot() vê `!S.name`, mostra o onboarding e chama modBoot() (operacao_base.html:10762). Dentro do modBoot, `if(!S.name) return;` na linha 313 encerra sem agendar nada. A pessoa digita o nome, startJourney() (operacao_base.html:7478) grava S.name e faz go('home'), sem nunca chamar modBoot de novo. Daí em diante, nessa sessão, S.termo continua null e nada mais tenta abrir a tela travada. Quem faz a jornada inteira de 8 passos na primeira sentada (é o comportamento esperado, o app conduz para isso) abre Comunidade, vê a galeria e o mapa de membros de outras pessoas sem nunca ter visto a regra de convivência, e sem aceite gravado em S.termo nem na tabela termos. O termo só aparece no lançamento seguinte do app.

**Conserto:**

```
Duas linhas, e as duas valem a pena. 1) No fim de startJourney(), em operacao_base.html:7478, depois de `go('home')`: `if(typeof modBoot==='function') modBoot();`. 2) Trancar a porta do conteúdo alheio no lugar onde ele é servido, em comunidade.js, primeira linha de renderComunidade: `if(typeof modTermoPendente==='function' && modTermoPendente()){ modTermoTela(renderComunidade); return; }`. Assim, mesmo se o boot falhar, ninguém chega na galeria antes de aceitar.
```

## 18. [ALTO] Dentro da tela travada do termo, os links Termos de uso e Política de privacidade não abrem nada

**Onde:** `moderacao.js`:68  ·  votos: 3/3

**O que acontece:** modTermoTela abre com `{trava:true}`, o que liga `_modalTrava=true` (operacao_base.html:7137). O texto de aceite tem `<a class="lg-link" onclick="modTermos()">Termos de uso</a>` e `onclick="modPrivacidade()"`, e as duas funções chamam modal(html) sem opts. A primeira linha do modal() é `if(_modalTrava && !(opts&&opts.trava)) return;`, então o clique não faz absolutamente nada: nenhum aviso, nenhuma tela. O revisor da loja (e a aluna) clica em Termos de uso antes de concordar, não acontece nada, e o único caminho é aceitar às cegas. É o passo que a revisão de EULA e privacidade testa primeiro.

**Conserto:**

```
Deixar os dois documentos abrirem por cima do termo, também travados, com volta para o termo. Em moderacao.js:68 trocar para `onclick="modTermos(1)"` e `onclick="modPrivacidade(1)"`, e nas duas funções: `function modTermos(doTermo){ modal(`...<div class="btn-row mt16"><button class="btn ghost" onclick="${doTermo?'modTermoTela()':'closeModal()'}">${doTermo?'Voltar':'Fechar'}</button></div>`, doTermo?{trava:true}:undefined); }` (idem em modPrivacidade). Como o modal() só recusa quando opts.trava é falso, abrir com trava por cima da trava funciona, e o botão Voltar reconstrói a tela de aceite sem destravar o app.
```

## 19. [ALTO] Suspender a conta fecha a denúncia sem tirar o conteúdo denunciado do ar

**Onde:** `moderacao.js`:215  ·  votos: 3/3

**O que acontece:** No painel, os três botões são alternativas: quem escolhe Suspender a conta (a saída para o caso mais grave, nudez ou ameaça) não passa por Remover o conteúdo. modSuspender chama OB.suspenderMembro e depois denunciaResolver com 'conta_suspensa'. A função suspender_membro (01_schema.sql:217) só faz `update public.access set status='inactive'` e `update public.membros set visivel=false`. A policy galeria_le é `public.tem_acesso() and not public.bloqueado(user_id)`, e o tem_acesso ali é o de QUEM está olhando, não o do autor. Então a foto da conta suspensa continua na galeria de todos os outros membros, com a denúncia já marcada como resolvida e fora da fila. Passo a passo: membro A publica foto proibida, membro B denuncia, Carla clica em Suspender a conta, o painel diz conta suspensa, B abre a galeria e a foto está lá.

**Conserto:**

```
Fazer a suspensão levar o conteúdo junto, no banco, que é a autoridade. Em 01_schema.sql, dentro de public.suspender_membro, depois do update de membros: `delete from public.galeria where user_id = p_alvo;` e `delete from public.caixinha where user_id = p_alvo;`. E, no cliente, passar o alvo para a remoção explícita: em moderacao.js:190 trocar para `onclick="modSuspender('${r.alvo_user_id}','${r.id}','${r.alvo_tipo||''}','${r.alvo_id||''}')"` e em modSuspender: `function modSuspender(alvoId,denunciaId,tipo,alvo){ if(!confirm(...)) return; const limpar=(tipo&&alvo&&OB.removerConteudo)?Promise.resolve(OB.removerConteudo(tipo,alvo)).catch(()=>null):Promise.resolve(null); limpar.then(()=>OB.suspenderMembro(alvoId)).then(()=>OB.denunciaResolver(denunciaId,'conta_suspensa')).then(()=>{ toast('','Conta suspensa','O acesso foi encerrado e o conteúdo saiu.'); modPainel(); }); }`.
```

## 20. [ALTO] O ranking imprime o nome de outra pessoa sem escapar: nome de exibição vira código na tela de todo mundo

**Onde:** `operacao_base.html`:1348  ·  votos: 3/3

**O que acontece:** loadObRanking concatena `(r.display_name || "Membro")` direto no innerHTML, sem passar pelo obEsc que existe logo abaixo (linha 1356) e que é usado no resto do arquivo. display_name é conteúdo de usuário gravável: o schema faz `revoke update on public.profiles from authenticated` e depois `grant update (email, display_name, full_name, atualizado_em)`, ou seja, qualquer aluna logada pode fazer `sb.from('profiles').update({display_name:'<img src=x onerror="...">'}).eq('user_id', ...)` com a chave anon que está no próprio HTML. A partir daí, toda pessoa que abrir a tela da Mentora carrega o ranking e executa aquilo. Não há botão de denunciar nem de bloquear nessa lista, então nem o caminho normal de reclamação existe.

**Conserto:**

```
Em operacao_base.html:1348 trocar `(r.display_name || "Membro")` por `obEsc(r.display_name || "Membro")`. Vale varrer o mesmo arquivo atrás de outros pontos que imprimem campo vindo do servidor sem obEsc.
```

## 21. [MEDIO] suspender_membro só casa por user_id e devolve true sempre: o painel anuncia "Conta suspensa" sem ter suspendido nada

**Onde:** `01_schema.sql`:155  ·  votos: 3/3

**O que acontece:** A função faz `update public.access set status = 'inactive' where user_id = p_alvo` e depois `return true`, sem olhar quantas linhas mudaram. A coluna access.user_id só é preenchida quando `casar_meu_acesso` roda, e essa chamada é disparada no cliente em modo dispare e esqueça, com os dois callbacks vazios (operacao_base.html linha 834). Cenário: a pessoa denunciada entrou pela primeira vez com a rede oscilando, a RPC de casamento falhou e o erro foi engolido; a linha dela em access continua com user_id null. A Carla abre o painel de moderação, clica em "Suspender a conta", a função atualiza zero linhas e devolve true, o `modSuspender` do moderacao.js encadeia direto no `.then` e mostra "Conta suspensa: o acesso foi encerrado". A pessoa continua entrando normalmente, porque `tem_acesso()` casa pelo ramo `lower(a.email) = lower(auth.jwt() ->> 'email')`. É exatamente o botão que a revisão das lojas testa.

**Conserto:**

```
Casar também por e-mail e devolver o que de fato aconteceu:

```sql
create or replace function public.suspender_membro(p_alvo uuid)
returns boolean language plpgsql volatile security definer
set search_path = public, auth as $$
declare n int; mail text;
begin
  if not public.eh_mentora() then raise exception 'apenas a mentoria pode suspender uma conta'; end if;
  if p_alvo is null or p_alvo = auth.uid() then return false; end if;
  select lower(u.email) into mail from auth.users u where u.id = p_alvo;
  update public.access set status = 'inactive', atualizado_em = now()
   where user_id = p_alvo or (mail is not null and lower(email) = mail);
  get diagnostics n = row_count;
  update public.membros set visivel = false where user_id = p_alvo;
  return n > 0;
end $$;
```

E, no moderacao.js, só mostrar "Conta suspensa" quando `r.data === true`, avisando a Carla quando vier false.
```

## 22. [MEDIO] excluir_minha_conta anonimiza parcelas por user_id, coluna que o webhook nunca preenche: o e-mail real sobrevive à exclusão da conta

**Onde:** `01_schema.sql`:611  ·  votos: 3/3

**O que acontece:** O upsert de parcelas do webhook grava apenas email, external_ref, numero, vencimento, valor, status e atualizado_em (index.ts linha 151). Nenhum caminho do sistema escreve parcelas.user_id, então a coluna é null em 100% das linhas. A função de exclusão faz `update public.parcelas set email = anon, user_id = null where user_id = uid`, que casa com zero linhas sempre. Cenário: a aluna pede exclusão da conta pela tela de privacidade (exigência das duas lojas e da LGPD), o app diz que apagou, o auth.users é removido, e o e-mail dela continua gravado em public.parcelas, agora sem nenhuma forma de ligar de volta para apagar. O mesmo vale para access quando a linha ficou sem user_id: o update não casa e a linha sobrevive com o e-mail real e o status intacto.

**Conserto:**

```
Capturar o e-mail antes de apagar a conta e anonimizar pelas duas chaves:

```sql
declare
  uid uuid := auth.uid();
  anon text;
  mail_antigo text;
begin
  if uid is null then raise exception 'sem sessão'; end if;
  anon := 'removido+' || replace(uid::text,'-','') || '@invalido.local';
  select lower(u.email) into mail_antigo from auth.users u where u.id = uid;
  ...
  update public.access
     set email = anon, user_id = null, status = 'inactive'
   where user_id = uid or (mail_antigo is not null and lower(email) = mail_antigo);
  update public.parcelas
     set email = anon, user_id = null
   where user_id = uid or (mail_antigo is not null and lower(email) = mail_antigo);
```

O `set search_path = public` da função precisa incluir `auth` para enxergar auth.users.
```

## 23. [MEDIO] Payload que a função não entende recebe 200, o corpo cru é descartado e o log fica com payload nulo: a inscrição some sem rastro e sem reenvio

**Onde:** `index.ts`:195  ·  votos: 3/3

**O que acontece:** `try { cru = await req.json(); } catch { cru = null; }` joga fora o corpo original. Com cru null, `Array.isArray(null)` é falso, então origem vira "vendas", o log grava payload null, `vendas({})` não acha e-mail e devolve `{ok:false}`, e o endpoint responde 200. A TMB não reenvia (200 é sucesso) e não existe nenhuma cópia do que chegou. O mesmo acontece com payload válido cujo e-mail esteja em caminho não previsto: o handler de vendas só olha `p.email` e `p.cliente_email`, enquanto o de financeiro já sabe que existe um envelope `dados`; se vendas também vier envelopado (`{"dados":{"email":"maria@exemplo.com","status_pedido":"Efetivado"}}`), o e-mail sai vazio, a resposta é 200, processado vira true e a aluna que pagou nunca recebe acesso, sem nenhum sinal de erro.

**Conserto:**

```
Guardar o corpo cru antes de tentar interpretar e nunca responder 200 para o que não foi processado:

```ts
const bruto = await req.text();
let cru: unknown = null;
try { cru = JSON.parse(bruto); } catch { cru = null; }
const { data: log } = await db.from("webhook_log")
  .insert({ origem, payload: cru as never, erro: cru == null ? "json inválido: " + bruto.slice(0, 2000) : null })
  .select("id").single();
if (cru == null) return new Response(JSON.stringify({ ok: false }), { status: 400 });
```

E, no handler de vendas, ler o envelope como o financeiro já faz: `const d = ((p as any).dados ?? p) as Record<string, unknown>;` antes de extrair email, status e ref. Quando o e-mail sair vazio, deixar `processado = false`, gravar `erro` e responder 422, para a falha aparecer no painel em vez de sumir.
```

## 24. [MEDIO] O ranking não filtra quem foi bloqueado, e o app nem tem como filtrar: get_ranking não devolve user_id

**Onde:** `01_schema.sql`:301  ·  votos: 3/3

**O que acontece:** A promessa que a pessoa aceita no termo e lê em modBloqueados é: 'quem está aqui não aparece para você em nenhum lugar do app'. As policies de galeria, membros e presencas têm `not public.bloqueado(user_id)`, mas get_ranking não tem, e a assinatura devolve apenas (posicao, display_name, xp, level, eu_sou). Cenário: a aluna bloqueia alguém depois de uma denúncia, abre a tela da Mentora e vê o nome da pessoa bloqueada no ranking, em segundo lugar. Como a função não devolve user_id, nem dá para consertar no cliente com modFiltra.

**Conserto:**

```
Na definição de public.get_ranking, acrescentar o filtro na cláusula where: `where public.tem_acesso() and not public.bloqueado(pg.user_id)`. A função é security definer e roda com o auth.uid() de quem chama, então bloqueado() enxerga a lista certa. Como a assinatura não muda, basta o create or replace já presente no arquivo.
```

## 25. [MEDIO] Uma consulta que falha apaga a lista local de bloqueios, e a pessoa fica sem conseguir desbloquear ninguém

**Onde:** `moderacao.js`:38  ·  votos: 3/3

**O que acontece:** OB.bloqueados (operacao_base.html:1295) devolve `r.error ? [] : dados`, ou seja, erro e lista vazia chegam iguais. Em modSincronizar a guarda é `if(!ids) return;`, e array vazio é verdadeiro em JS, então o erro passa e executa `S.bloqueios = []; MOD_BLOQ = new Set([]); save();`. Passo a passo: a pessoa bloqueou dois membros, abre o app num sinal ruim de 3G, a consulta a bloqueios falha, o app grava lista vazia e sobe esse estado. A tela Mais, pessoas bloqueadas, passa a dizer 'Você não bloqueou ninguém', então ela não consegue desbloquear (o servidor continua bloqueando, e as policies continuam escondendo aquelas pessoas), e o filtro local modFiltra deixa de valer para qualquer lista servida do cache offline.

**Conserto:**

```
Distinguir erro de vazio. Em operacao_base.html:1295: `.then(function(r){ return r.error ? null : (r.data||[]).map(function(x){ return x.bloqueado_id; }); })`. Em moderacao.js:38: `if(!Array.isArray(ids)) return;` e, para não perder bloqueio feito offline que ainda não subiu, unir em vez de substituir: `const uniao=Array.from(new Set(ids.concat(S.bloqueios||[]))); S.bloqueios=uniao; MOD_BLOQ=new Set(uniao); save();`.
```

## 26. [MEDIO] excluir_minha_conta deixa o e-mail da pessoa em public.parcelas: o webhook nunca grava user_id, então o update não acha linha nenhuma

**Onde:** `01_schema.sql`:723  ·  votos: 3/3

**O que acontece:** A função anonimiza com `update public.parcelas set email = anon, user_id = null where user_id = uid`. Mas quem grava parcelas é a Edge Function (supabase/functions/tmb-webhook/index.ts:151), e o upsert é `{email, external_ref, numero, vencimento, valor, status, atualizado_em}`: user_id não está no payload, nunca. Logo parcelas.user_id é sempre null e o where não casa com nada. Cenário: a aluna usa Mais, excluir a minha conta, o app diz que apagou tudo e a política de privacidade promete exclusão pela LGPD, mas o e-mail real dela continua em public.parcelas para sempre, junto com valores e vencimentos. O mesmo risco existe em access (linha 721) quando casar_meu_acesso não chegou a rodar por falha de rede: a linha fica com o e-mail real e status active depois da exclusão, porque user_id ainda é null e o delete de auth.users não a alcança.

**Conserto:**

```
Casar também por e-mail. No começo do bloco declare: `mail text := lower(coalesce(auth.jwt() ->> 'email',''));`. Depois: `update public.access set email = anon, user_id = null, status = 'inactive' where user_id = uid or (mail <> '' and lower(email) = mail);` e `update public.parcelas set email = anon, user_id = null where user_id = uid or (mail <> '' and lower(email) = mail);`. Os dois updates precisam vir antes do `delete from auth.users`, como já estão.
```

## 27. [MEDIO] A galeria imprime a URL da foto crua dentro do src, sem escapar e sem conferir a origem

**Onde:** `comunidade.js`:284  ·  votos: 3/3

**O que acontece:** A linha é `<img src="${g.url}" alt="${escAttr(...)}" loading="lazy">`: a legenda passa por escAttr, a url não passa por nada. A policy galeria_insere só exige `user_id = auth.uid() and public.tem_acesso()`, não valida o conteúdo do campo url. Uma aluna com a chave anon (que está no próprio HTML do app) insere uma linha com `url: 'x" onerror="...'` e todo membro que abrir a aba Galeria executa aquilo, sem clique nenhum. Mesmo sem ataque, uma url com aspas quebra a tag e desmonta o cartão da foto, levando junto o bloco mo-acoes com os botões de denunciar e bloquear.

**Conserto:**

```
Escapar e conferir a origem: `const src=/^(https:\/\/okoylfnniukzwoxevyow\.supabase\.co\/|data:image\/)/.test(g.url||'')?escAttr(g.url):''; ` e usar `<img src="${src}" ...>`, pulando o cartão quando src ficar vazio. No banco, apertar a policy galeria_insere com `and url like 'https://okoylfnniukzwoxevyow.supabase.co/storage/v1/object/public/midia/%'`, para a URL só poder apontar para o próprio storage.
```
