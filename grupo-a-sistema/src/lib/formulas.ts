/**
 * As fórmulas do Notion, traduzidas.
 *
 * Cada função cita no comentário a propriedade Notion de origem — a database e
 * o nome exato da property. Quando você adicionar uma fórmula nova aqui, cite a
 * propriedade correspondente se ela existir.
 *
 * Convenções:
 * - Nada aqui toca o banco. São funções puras sobre dados já carregados.
 * - Dinheiro entra como `number` (converta o `Decimal` com `paraNumero()` na
 *   borda) e sai como `number`.
 * - As fórmulas `Etiqueta *` do Notion NÃO estão aqui: eram rótulos de UI
 *   (texto tipo "3 tarefas vencidas"), não cálculo. Viraram strings nos
 *   componentes. Ver CLAUDE.md.
 */

import {
  chaveMes,
  dentroDoIntervalo,
  hoje,
  intervaloDaSemana,
  intervaloDoAno,
  intervaloDoMes,
  type Intervalo,
} from './datas'

// ---------------------------------------------------------------------------
// Predicados temporais
//
// No Notion isto era repetido dezenas de vezes como `formatDate(prop("Data"),
// "YYYYMM") == formatDate(now(), "YYYYMM")`.
// ---------------------------------------------------------------------------

/** Notion: `Overview Financeiro` → `This month`; `Mês` → `Este mês`. */
export function esteMes(data: Date | null | undefined, referencia = new Date()): boolean {
  return dentroDoIntervalo(data, intervaloDoMes(referencia))
}

/** Notion: `Semana` → `Esta semana`. */
export function estaSemana(data: Date | null | undefined, referencia = new Date()): boolean {
  return dentroDoIntervalo(data, intervaloDaSemana(referencia))
}

/** Notion: `Meta anual` → `Este ano?`. */
export function esteAno(data: Date | null | undefined, referencia = new Date()): boolean {
  return dentroDoIntervalo(data, intervaloDoAno(referencia))
}

/** Notion: `Resumo` → `Hoje`; `Rastreador de hábitos` → `Hoje`. */
export function eHoje(data: Date | null | undefined, referencia = new Date()): boolean {
  if (!data) return false
  return hoje(data).getTime() === hoje(referencia).getTime()
}

/** Notion: `Rastreador de hábitos` → `Ontem`. */
export function eOntem(data: Date | null | undefined, referencia = new Date()): boolean {
  const ontem = new Date(hoje(referencia))
  ontem.setDate(ontem.getDate() - 1)
  return eHoje(data, ontem)
}

/** Notion: `Rastreador de hábitos` → `Amanhã`. */
export function eAmanha(data: Date | null | undefined, referencia = new Date()): boolean {
  const amanha = new Date(hoje(referencia))
  amanha.setDate(amanha.getDate() + 1)
  return eHoje(data, amanha)
}

/** Notion: `Faturas` → `Dias restantes` (dateBetween(prop("Data de entrega"), now(), "days")). */
export function diasRestantes(prazo: Date | null | undefined, referencia = new Date()): number | null {
  if (!prazo) return null
  const msPorDia = 24 * 60 * 60 * 1000
  return Math.round((hoje(prazo).getTime() - hoje(referencia).getTime()) / msPorDia)
}

/** Notion: `Tarefas` → `Atrasado?`. Concluída nunca conta como atrasada. */
export function estaAtrasado(
  prazo: Date | null | undefined,
  concluida: boolean,
  referencia = new Date(),
): boolean {
  if (concluida || !prazo) return false
  return hoje(prazo).getTime() < hoje(referencia).getTime()
}

/** Notion: `Faturas` → `Vence este mês`. */
export function venceEsteMes(
  prazo: Date | null | undefined,
  pago: boolean,
  referencia = new Date(),
): boolean {
  if (pago) return false
  return esteMes(prazo, referencia)
}

/** Notion: `Faturas` → `Pago este mês`. */
export function pagoEsteMes(
  pagoEm: Date | null | undefined,
  pago: boolean,
  referencia = new Date(),
): boolean {
  return pago && esteMes(pagoEm, referencia)
}

// ---------------------------------------------------------------------------
// Financeiro
// ---------------------------------------------------------------------------

/** Notion: `Overview Financeiro` → `Receitas 2` / `Receitas realizadas` (rollup sum). */
export function somarValores<T>(itens: readonly T[], obter: (item: T) => number): number {
  return itens.reduce((total, item) => total + (obter(item) || 0), 0)
}

/** Notion: `Overview Financeiro` → `Lucro líquido` (receitas − despesas). */
export function lucroLiquido(receitas: number, despesas: number): number {
  return receitas - despesas
}

/**
 * Notion: `Overview Financeiro` → `Progresso`; `Meta anual` → `Progresso`.
 * Devolve 0..1. Meta zero ou negativa devolve 0 em vez de dividir por zero.
 */
export function progressoDaMeta(realizado: number, meta: number): number {
  if (!meta || meta <= 0) return 0
  return Math.max(0, realizado / meta)
}

/** Notion: `Meta anual` → `Média de Lucro Mensal`. */
export function mediaLucroMensal(lucroTotal: number, mesesComDados: number): number {
  if (mesesComDados <= 0) return 0
  return lucroTotal / mesesComDados
}

/** Notion: `Faturas` → `Valor total` (preço fixo, ou horas × valor/hora). */
export function valorTotalDaFatura(
  tipo: 'PRECO_FIXO' | 'PRECO_POR_HORA',
  precoFixo: number,
  custoDasHoras: number,
): number {
  return tipo === 'PRECO_FIXO' ? precoFixo : custoDasHoras
}

/** Notion: `Planilha de Horas` → `Custo da hora` (horas × valor da hora). */
export function custoDaHora(horas: number, valorHora: number): number {
  return (horas || 0) * (valorHora || 0)
}

/** Notion: `Faturas` → `Total pago`. Só conta se o checkbox `Pago` estiver marcado. */
export function totalPago(valorTotal: number, pago: boolean): number {
  return pago ? valorTotal : 0
}

/** Notion: `Resumo` → `Progresso de faturas pagas`. */
export function progressoFaturasPagas(pagas: number, total: number): number {
  if (total <= 0) return 0
  return pagas / total
}

/**
 * Substitui as colunas `Total Janeiro`…`Total Dezembro`, que eram 24 fórmulas
 * repetidas em 4 databases. Agrupa por `AAAA-MM`; no SQL, prefira um GROUP BY.
 */
export function agruparPorMes<T>(
  itens: readonly T[],
  obterData: (item: T) => Date | null | undefined,
  obterValor: (item: T) => number,
): Map<string, number> {
  const porMes = new Map<string, number>()
  for (const item of itens) {
    const data = obterData(item)
    if (!data) continue
    const chave = chaveMes(data)
    porMes.set(chave, (porMes.get(chave) ?? 0) + (obterValor(item) || 0))
  }
  return porMes
}

/** Série de 12 posições (Jan..Dez) para um ano, a partir de `agruparPorMes()`. */
export function serieAnual(porMes: Map<string, number>, ano: number): number[] {
  return Array.from({ length: 12 }, (_, i) => {
    const chave = `${ano}-${String(i + 1).padStart(2, '0')}`
    return porMes.get(chave) ?? 0
  })
}

// ---------------------------------------------------------------------------
// Tarefas, metas e projetos
// ---------------------------------------------------------------------------

/** Notion: `Resumo` → `Tarefas não finalizadas` (rollup unchecked). */
export function contarPendentes<T>(itens: readonly T[], concluida: (item: T) => boolean): number {
  return itens.filter((item) => !concluida(item)).length
}

/** Notion: `Resumo` → `Tarefas vencidas`. */
export function contarAtrasadas<T>(
  itens: readonly T[],
  prazo: (item: T) => Date | null | undefined,
  concluida: (item: T) => boolean,
  referencia = new Date(),
): number {
  return itens.filter((item) => estaAtrasado(prazo(item), concluida(item), referencia)).length
}

/** Notion: `Metas` → `Alcançada`. */
export function metaAlcancada(progresso: number): boolean {
  return progresso >= 100
}

/** Notion: `Metas` → `Vencida`. */
export function metaVencida(
  prazo: Date | null | undefined,
  progresso: number,
  referencia = new Date(),
): boolean {
  if (metaAlcancada(progresso) || !prazo) return false
  return hoje(prazo).getTime() < hoje(referencia).getTime()
}

/** Notion: `Projetos` → `Não está em andamento?` (usado para contar finalizados). */
export function projetoFinalizado(status: string): boolean {
  return status === 'FEITO'
}

/** Notion: `Cliente` → `Cliente Ativo?`. */
export function clienteAtivo(status: string): boolean {
  return status === 'ATIVO'
}

/** Notion: `Projetos` → `Verificar Cliente Vazio`. */
export function projetoSemCliente(clienteId: string | null | undefined): boolean {
  return !clienteId
}

// ---------------------------------------------------------------------------
// Hábitos
// ---------------------------------------------------------------------------

/**
 * Notion: `Rastreador de hábitos` → `Taxa de conclusão` / `Progresso`.
 * Lá o denominador era fixo em 5 (`Hábito 1`…`Hábito 5`); aqui é a quantidade
 * de hábitos ativos, que pode ser qualquer uma.
 */
export function taxaDeConclusao(feitos: number, totalDeHabitos: number): number {
  if (totalDeHabitos <= 0) return 0
  return feitos / totalDeHabitos
}

/** Sequência de dias consecutivos concluídos, do mais recente para trás. */
export function sequenciaAtual(
  registros: readonly { data: Date; completo: boolean }[],
): number {
  const ordenados = [...registros].sort((a, b) => b.data.getTime() - a.data.getTime())
  let sequencia = 0
  for (const registro of ordenados) {
    if (!registro.completo) break
    sequencia += 1
  }
  return sequencia
}

// ---------------------------------------------------------------------------
// Planner
// ---------------------------------------------------------------------------

/** Notion: `Resumo` → `O planejamento de hoje não foi feito`. */
export function planejamentoPendente(status: string | null | undefined): boolean {
  return !status || status === 'NAO_PLANEJADO'
}

/** Notion: `Semana` → `Nome deste mês`. */
export function rotuloDoPeriodo(inicio: Date, fim: Date | null | undefined): string {
  const fmt = (d: Date) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  return fim ? `${fmt(inicio)} – ${fmt(fim)}` : fmt(inicio)
}

// ---------------------------------------------------------------------------
// Conteúdo
// ---------------------------------------------------------------------------

/** Notion: `Resumo` → `Publicados esta semana` / `Publicados este mês`. */
export function contarPublicados<T>(
  itens: readonly T[],
  publicadaEm: (item: T) => Date | null | undefined,
  intervalo: Intervalo,
): number {
  return itens.filter((item) => dentroDoIntervalo(publicadaEm(item), intervalo)).length
}

/** Notion: `Resumo` → `Progresso conteúdos da semana` / `Progress Conteúdos do mês`. */
export function progressoDeConteudo(publicados: number, planejados: number): number {
  if (planejados <= 0) return 0
  return publicados / planejados
}

/** Notion: `Resumo` → `Setup feito` / `Total de etapas do setup`. */
export function progressoDoSetup(feitas: number, total: number): number {
  if (total <= 0) return 0
  return feitas / total
}
