/**
 * Helpers de data. O fuso do negócio é America/Sao_Paulo — o Notion gravava
 * tudo nesse fuso e as fórmulas `now()` / `today()` dele assumiam isso.
 *
 * Datas "sem hora" (`@db.Date` no schema) são tratadas como meia-noite local
 * para não escorregarem um dia ao cruzar o UTC.
 */

import {
  endOfMonth,
  endOfWeek,
  endOfYear,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from 'date-fns'

export const FUSO_NEGOCIO = 'America/Sao_Paulo'

/** Segunda-feira, como no planner semanal do Notion. */
const INICIO_SEMANA = { weekStartsOn: 1 } as const

export function hoje(referencia: Date = new Date()): Date {
  return startOfDay(referencia)
}

export interface Intervalo {
  inicio: Date
  fim: Date
}

export function intervaloDoMes(referencia: Date = new Date()): Intervalo {
  return { inicio: startOfMonth(referencia), fim: endOfMonth(referencia) }
}

export function intervaloDaSemana(referencia: Date = new Date()): Intervalo {
  return {
    inicio: startOfWeek(referencia, INICIO_SEMANA),
    fim: endOfWeek(referencia, INICIO_SEMANA),
  }
}

export function intervaloDoAno(referencia: Date = new Date()): Intervalo {
  return { inicio: startOfYear(referencia), fim: endOfYear(referencia) }
}

export function dentroDoIntervalo(data: Date | null | undefined, intervalo: Intervalo): boolean {
  if (!data) return false
  return data >= intervalo.inicio && data <= intervalo.fim
}

/** Converte um `Decimal` do Prisma (ou null) para number na borda de exibição. */
export function paraNumero(valor: { toString(): string } | null | undefined): number {
  if (valor === null || valor === undefined) return 0
  const n = Number(valor.toString())
  return Number.isFinite(n) ? n : 0
}

export function formatarBRL(valor: number): string {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function formatarData(data: Date | null | undefined): string {
  if (!data) return '—'
  return data.toLocaleDateString('pt-BR', { timeZone: FUSO_NEGOCIO })
}

/** Chave `AAAA-MM` — usada por `agruparPorMes()` em formulas.ts. */
export function chaveMes(data: Date): string {
  const ano = data.getFullYear()
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  return `${ano}-${mes}`
}

export const NOMES_MESES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
] as const
