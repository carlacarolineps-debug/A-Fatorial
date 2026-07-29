/**
 * Cliente do Notion + extratores de propriedade.
 *
 * A API do Notion devolve cada propriedade como um objeto discriminado por
 * `type`. Estes helpers achatam isso para valores simples e devolvem `null` no
 * lugar de explodir — uma propriedade renomeada no Notion não deve derrubar a
 * migração inteira.
 */

import { Client } from '@notionhq/client'

export function criarClienteNotion(): Client {
  const auth = process.env.NOTION_TOKEN
  if (!auth) {
    throw new Error(
      'NOTION_TOKEN não definido. Copie .env.example para .env e preencha o token.\n' +
        'Crie a integração em https://www.notion.so/my-integrations e compartilhe a\n' +
        'página raiz com ela (⋯ → Conexões → sua integração), senão a API devolve 404.',
    )
  }
  return new Client({ auth })
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type Props = Record<string, any>

export function texto(props: Props, nome: string): string | null {
  const p = props?.[nome]
  if (!p) return null
  const partes =
    p.type === 'title' ? p.title : p.type === 'rich_text' ? p.rich_text : null
  if (!partes) return null
  const s = partes.map((t: any) => t?.plain_text ?? '').join('').trim()
  return s || null
}

export function numero(props: Props, nome: string): number | null {
  const p = props?.[nome]
  if (p?.type !== 'number') return null
  return typeof p.number === 'number' ? p.number : null
}

export function checkbox(props: Props, nome: string): boolean {
  const p = props?.[nome]
  return p?.type === 'checkbox' ? Boolean(p.checkbox) : false
}

/** Rótulo cru de select / status / multi_select (primeiro valor). */
export function selecao(props: Props, nome: string): string | null {
  const p = props?.[nome]
  if (!p) return null
  if (p.type === 'select') return p.select?.name ?? null
  if (p.type === 'status') return p.status?.name ?? null
  if (p.type === 'multi_select') return p.multi_select?.[0]?.name ?? null
  return null
}

export function selecaoMultipla(props: Props, nome: string): string[] {
  const p = props?.[nome]
  if (p?.type !== 'multi_select') return []
  return (p.multi_select ?? []).map((o: any) => o?.name).filter(Boolean)
}

export function data(props: Props, nome: string): Date | null {
  const p = props?.[nome]
  if (p?.type !== 'date' || !p.date?.start) return null
  const d = new Date(p.date.start)
  return Number.isNaN(d.getTime()) ? null : d
}

export function dataFim(props: Props, nome: string): Date | null {
  const p = props?.[nome]
  if (p?.type !== 'date' || !p.date?.end) return null
  const d = new Date(p.date.end)
  return Number.isNaN(d.getTime()) ? null : d
}

export function email(props: Props, nome: string): string | null {
  const p = props?.[nome]
  if (p?.type === 'email') return p.email || null
  return texto(props, nome)
}

export function telefone(props: Props, nome: string): string | null {
  const p = props?.[nome]
  if (p?.type === 'phone_number') return p.phone_number || null
  return texto(props, nome)
}

export function url(props: Props, nome: string): string | null {
  const p = props?.[nome]
  if (p?.type === 'url') return p.url || null
  return texto(props, nome)
}

/** IDs das páginas relacionadas. */
export function relacao(props: Props, nome: string): string[] {
  const p = props?.[nome]
  if (p?.type !== 'relation') return []
  return (p.relation ?? []).map((r: any) => r?.id).filter(Boolean)
}

export function relacaoUnica(props: Props, nome: string): string | null {
  return relacao(props, nome)[0] ?? null
}

/** IDs dos usuários de uma property `person`. */
export function pessoas(props: Props, nome: string): string[] {
  const p = props?.[nome]
  if (p?.type !== 'people') return []
  return (p.people ?? []).map((u: any) => u?.id).filter(Boolean)
}

export interface ArquivoNotion {
  nome: string
  url: string
}

export function arquivos(props: Props, nome: string): ArquivoNotion[] {
  const p = props?.[nome]
  if (p?.type !== 'files') return []
  return (p.files ?? [])
    .map((f: any) => ({
      nome: f?.name ?? 'arquivo',
      // URLs de `file` do Notion expiram em ~1h; as de `external` não.
      url: f?.type === 'external' ? f.external?.url : f?.file?.url,
    }))
    .filter((f: ArquivoNotion) => Boolean(f.url))
}

export function primeiroArquivoUrl(props: Props, nome: string): string | null {
  return arquivos(props, nome)[0]?.url ?? null
}

/** Primeira property de `nomes` que existir — para databases com nomes divergentes. */
export function primeiroQueExistir<T>(
  props: Props,
  nomes: readonly string[],
  extrator: (props: Props, nome: string) => T | null,
): T | null {
  for (const nome of nomes) {
    const valor = extrator(props, nome)
    if (valor !== null && valor !== undefined && valor !== '') return valor
  }
  return null
}

/**
 * Percorre uma data source inteira, respeitando a paginação (100/página).
 * Aceita tanto database_id quanto data_source_id.
 */
export async function* paginarDatabase(
  notion: Client,
  databaseId: string,
): AsyncGenerator<any, void, unknown> {
  let cursor: string | undefined
  do {
    const resposta: any = await (notion as any).databases.query({
      database_id: databaseId,
      start_cursor: cursor,
      page_size: 100,
    })
    for (const pagina of resposta.results ?? []) yield pagina
    cursor = resposta.has_more ? resposta.next_cursor ?? undefined : undefined
  } while (cursor)
}

/** Conta registros sem carregar tudo na memória — usado pelo --dry-run. */
export async function contarRegistros(notion: Client, databaseId: string): Promise<number> {
  let total = 0
  for await (const _ of paginarDatabase(notion, databaseId)) total += 1
  return total
}

/**
 * Converte um rótulo do Notion no valor do enum do Prisma.
 * O `@map` de cada enum guarda o rótulo exato, então o de-para vive aqui.
 */
export function mapearEnum<T extends string>(
  rotulo: string | null | undefined,
  mapa: Record<string, T>,
  padrao: T | null = null,
): T | null {
  if (!rotulo) return padrao
  const chave = rotulo.trim()
  if (chave in mapa) return mapa[chave]
  // Tolera diferenças de caixa/acento residuais.
  const normalizar = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
  const alvo = normalizar(chave)
  for (const [k, v] of Object.entries(mapa)) {
    if (normalizar(k) === alvo) return v
  }
  return padrao
}
