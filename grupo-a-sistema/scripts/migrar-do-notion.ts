/**
 * Migração Notion → Postgres.
 *
 *   npm run migrar:dry    lista quantos registros viriam de cada database, sem escrever
 *   npm run migrar        importa de verdade
 *
 * Idempotente: cada página do Notion vira uma linha em `notion_id_map`
 * (notionId → registro local). Rodar duas vezes atualiza, não duplica.
 *
 * Três fases, porque as relações têm ordem:
 *   1. Independentes  — categorias, hábitos, planner, metas anuais/mensais,
 *                       clientes, postagens, portfólio, setup, metas.
 *   2. Dependentes    — leads, propostas, contratos, projetos (precisam de cliente),
 *                       receitas/despesas (precisam de categoria e mês).
 *   3. Relações       — tarefas, faturas, planilha de horas, reuniões, feedbacks,
 *                       stats, arquivos (precisam de tudo que veio antes).
 *
 * O que NÃO é migrado, de propósito (ver CLAUDE.md):
 *   - as duas databases `Resumo` (viraram `src/lib/resumo.ts`);
 *   - as ~35 propriedades `Etiqueta *` (eram rótulos de UI);
 *   - as relations órfãs `Relacionado a X (Y)` (databases duplicadas do template);
 *   - `Organização Pessoal` (só tinha a coluna `Nome`).
 */

import { PrismaClient, type FaseMigracao } from '@prisma/client'
import type { Client } from '@notionhq/client'
import {
  arquivos,
  checkbox,
  contarRegistros,
  criarClienteNotion,
  data,
  dataFim,
  email,
  mapearEnum,
  numero,
  paginarDatabase,
  pessoas,
  primeiroArquivoUrl,
  primeiroQueExistir,
  relacaoUnica,
  selecao,
  selecaoMultipla,
  telefone,
  texto,
  url,
} from '../src/lib/notion'

const db = new PrismaClient()
const DRY_RUN = process.argv.includes('--dry-run')

// ---------------------------------------------------------------------------
// IDs das data sources reais do workspace
// ---------------------------------------------------------------------------

const DS = {
  clientes: '29cfe715-bf5e-81fb-9c70-000bb32c0bc8',
  projetos: '29cfe715-bf5e-812b-9666-000bfbc74846',
  tarefasPrincipal: '29cfe715-bf5e-81b1-afe5-000bbf35bfa4',
  tarefasWidget: '29cfe715-bf5e-8181-a205-000b3973945b',
  leadsNovo: '2e2fe715-bf5e-8111-ab86-000b3a760366',
  leadsLegado: '29cfe715-bf5e-8150-a2ff-000b538719d2',
  leadStats: '2e2fe715-bf5e-81dc-b7a3-000b4bb0ddfc',
  propostas: '29cfe715-bf5e-8156-9dab-000b910f3d5b',
  contratos: '29cfe715-bf5e-816a-9c62-000b2b004fa6',
  feedbacks: '29cfe715-bf5e-813e-8fc9-000b59c953c4',
  faturas: '29cfe715-bf5e-81ad-ba67-000bbd6af450',
  planilhaHoras: '29cfe715-bf5e-81b3-ac8c-000bc91c3c1e',
  receitas: '29cfe715-bf5e-810a-b97e-000b80f5deec',
  despesas: '29cfe715-bf5e-811f-b63d-000bd7b86ff7',
  categoriasReceita: '29cfe715-bf5e-8119-b6be-000b0362a14b',
  categoriasDespesa: '29cfe715-bf5e-8137-a570-000bb916769e',
  overviewFinanceiro: '29cfe715-bf5e-8148-bd3a-000b5aef62ec',
  metaAnual: '29cfe715-bf5e-8120-a3b1-000b376aaead',
  metas: '29cfe715-bf5e-818d-80e9-000b2e9600d6',
  reunioes: '29cfe715-bf5e-8170-8e0d-000b9a2b2f96',
  postagens: '29cfe715-bf5e-811a-a8b5-000bcdc0a087',
  portfolio: '29cfe715-bf5e-8158-bb3e-000b99fdd25e',
  setup: '29cfe715-bf5e-8192-8490-000b2902bfc5',
  habitos: '29cfe715-bf5e-8165-9fc1-000b619ef970',
  plannerDia: '29cfe715-bf5e-81bf-814c-000b20f911b1',
  plannerSemana: '29cfe715-bf5e-81e1-adf4-000be1ebc01e',
  plannerMes: '29cfe715-bf5e-8135-a8ef-000ba5e1b6b0',
} as const

/** Ignoradas de propósito. O --dry-run reporta para você conferir. */
const IGNORADAS: Record<string, string> = {
  '29cfe715-bf5e-819d-91c3-000bd5a92ef9': 'Resumo (1) — virou src/lib/resumo.ts',
  '29cfe715-bf5e-81ea-8846-000be6f91da5': 'Resumo — virou src/lib/resumo.ts',
  '29cfe715-bf5e-811c-96ac-000b17b6a181': 'Organização Pessoal — só tinha a coluna Nome',
}

// ---------------------------------------------------------------------------
// De-para dos enums (rótulo no Notion → valor no Prisma)
// ---------------------------------------------------------------------------

const STATUS_CLIENTE = { Ativo: 'ATIVO', Inativo: 'INATIVO' } as const
const FONTE_CLIENTE = { LinkedIn: 'LINKEDIN', Site: 'SITE' } as const

const CANAL_LEAD = {
  Instagram: 'INSTAGRAM',
  WhatsApp: 'WHATSAPP',
  Indicação: 'INDICACAO',
  Linkedln: 'LINKEDIN',
  LinkedIn: 'LINKEDIN',
  Site: 'SITE',
  Parceiros: 'PARCEIROS',
  Outros: 'OUTROS',
} as const

const FONTE_LEAD_LEGADO = {
  Website: 'WEBSITE',
  Instagram: 'INSTAGRAM',
  Indicação: 'INDICACAO',
  LinkedIn: 'LINKEDIN',
} as const

const ETAPA_LEAD = {
  Descoberta: 'DESCOBERTA',
  Diagnóstico: 'DIAGNOSTICO',
  Apresentação: 'APRESENTACAO',
  Proposta: 'PROPOSTA',
  'Follow-up': 'FOLLOW_UP',
  Fechamento: 'FECHAMENTO',
} as const

/** CRM novo (6 status) — equivalência direta. */
const STATUS_LEAD_NOVO = {
  Lead: 'LEAD',
  Qualificação: 'QUALIFICACAO',
  Negociação: 'NEGOCIACAO',
  Proposta: 'PROPOSTA',
  'Fechamento Ganho': 'FECHAMENTO_GANHO',
  'Fechamento Perdido': 'FECHAMENTO_PERDIDO',
} as const

/**
 * CRM legado (5 status) — INTERPRETAÇÃO, não equivalência exata.
 * `Convertido` e `Em conversação` são os dois casos duvidosos.
 * Ver docs/MAPA-NOTION.md §8 antes de confiar nestes valores.
 */
const STATUS_LEAD_LEGADO = {
  Descoberto: 'LEAD',
  'Em conversação': 'NEGOCIACAO',
  Qualificado: 'QUALIFICACAO',
  Convertido: 'FECHAMENTO_GANHO',
  Perdido: 'FECHAMENTO_PERDIDO',
} as const

const STATUS_PROJETO = {
  'Não iniciado': 'NAO_INICIADO',
  Onboarding: 'ONBOARDING',
  Pesquisa: 'PESQUISA',
  'Em andamento': 'EM_ANDAMENTO',
  'Off boarding': 'OFF_BOARDING',
  Feito: 'FEITO',
} as const

const TIPO_PROJETO = {
  Website: 'WEBSITE',
  Branding: 'BRANDING',
  Marketing: 'MARKETING',
  Outros: 'OUTROS',
} as const

/** As duas databases de tarefa usavam vocabulários diferentes. */
const STATUS_TAREFA = {
  'A fazer': 'A_FAZER',
  'Em andamento': 'EM_ANDAMENTO',
  Completa: 'COMPLETA',
} as const

const PRIORIDADE_TAREFA = {
  Baixa: 'BAIXA',
  Média: 'MEDIA',
  Alta: 'ALTA',
  'Alta 🔥': 'ALTA',
} as const

const TAG_TAREFA = {
  Financeiro: 'FINANCEIRO',
  Projetos: 'PROJETOS',
  Vendas: 'VENDAS',
  Marketing: 'MARKETING',
  Outros: 'OUTROS',
} as const

const TIPO_FATURA = {
  'Preço fixo': 'PRECO_FIXO',
  'Preço por hora': 'PRECO_POR_HORA',
} as const

/** Os 3 vocabulários do planner colapsados. */
const STATUS_PLANNER = {
  'Não planejado': 'NAO_PLANEJADO',
  Planejado: 'PLANEJADO',
  'Em andamento': 'EM_ANDAMENTO',
  'Em progresso': 'EM_ANDAMENTO',
  Concluído: 'CONCLUIDO',
} as const

// ---------------------------------------------------------------------------
// Infra da migração
// ---------------------------------------------------------------------------

interface Contexto {
  notion: Client
  fase: FaseMigracao
}

const stats = {
  criados: 0,
  atualizados: 0,
  ignorados: 0,
  erros: [] as string[],
}

function log(msg: string) {
  process.stdout.write(`${msg}\n`)
}

/** Cria ou atualiza, sempre passando pelo notion_id_map. */
async function upsert<T extends { id: string }>(
  notionId: string,
  entidade: string,
  dataSourceId: string,
  fase: FaseMigracao,
  criar: () => Promise<T>,
  atualizar: (id: string) => Promise<T>,
): Promise<string | null> {
  try {
    const existente = await db.notionIdMap.findUnique({ where: { notionId } })
    if (existente) {
      await atualizar(existente.registroId)
      await db.notionIdMap.update({
        where: { notionId },
        data: { entidade, dataSourceId, fase },
      })
      stats.atualizados += 1
      return existente.registroId
    }
    const criado = await criar()
    await db.notionIdMap.create({
      data: { notionId, entidade, registroId: criado.id, dataSourceId, fase },
    })
    stats.criados += 1
    return criado.id
  } catch (erro) {
    const msg = erro instanceof Error ? erro.message : String(erro)
    stats.erros.push(`${entidade} ${notionId}: ${msg}`)
    return null
  }
}

/** Resolve o ID local a partir do ID da página no Notion. */
async function local(notionId: string | null | undefined): Promise<string | null> {
  if (!notionId) return null
  const registro = await db.notionIdMap.findUnique({ where: { notionId } })
  return registro?.registroId ?? null
}

/** Salva os anexos de uma property `files` na tabela polimórfica `Arquivo`. */
async function salvarArquivos(
  props: Record<string, unknown>,
  nomeProp: string,
  tipo: 'CAPA' | 'PDF' | 'MIDIA' | 'OUTRO',
  tipoEntidade:
    | 'CLIENTE' | 'PROJETO' | 'TAREFA' | 'LEAD' | 'PROPOSTA' | 'CONTRATO'
    | 'FATURA' | 'POSTAGEM' | 'PROJETO_PORTFOLIO' | 'REUNIAO' | 'META' | 'PLANNER',
  entidadeId: string,
) {
  for (const arquivo of arquivos(props, nomeProp)) {
    const ja = await db.arquivo.findFirst({
      where: { tipoEntidade, entidadeId, nome: arquivo.nome },
    })
    if (ja) continue
    await db.arquivo.create({
      data: { nome: arquivo.nome, url: arquivo.url, tipo, tipoEntidade, entidadeId },
    })
  }
}

/** Garante um Usuario local para cada `person` do Notion. */
async function usuarioDoNotion(notionUserId: string | null): Promise<string | null> {
  if (!notionUserId) return null
  const existente = await db.usuario.findUnique({ where: { notionUserId } })
  if (existente) return existente.id
  const criado = await db.usuario.create({
    data: {
      nome: `Usuário Notion ${notionUserId.slice(0, 8)}`,
      // Placeholder — o e-mail real vem quando o Auth.js entrar.
      email: `${notionUserId}@import.notion.local`,
      notionUserId,
    },
  })
  return criado.id
}

// ---------------------------------------------------------------------------
// Fase 1 — independentes
// ---------------------------------------------------------------------------

async function fase1({ notion }: Contexto) {
  const fase: FaseMigracao = 'FASE_1'
  log('\n▸ Fase 1 — independentes')

  // Categorias
  for (const [ds, modelo] of [
    [DS.categoriasReceita, 'categoriaReceita'],
    [DS.categoriasDespesa, 'categoriaDespesa'],
  ] as const) {
    for await (const p of paginarDatabase(notion, ds)) {
      const nome = primeiroQueExistir(p.properties, ['Nome', 'Name', 'Categoria'], texto)
      if (!nome) { stats.ignorados += 1; continue }
      await upsert(
        p.id, modelo, ds, fase,
        () => (db[modelo] as any).create({ data: { nome } }),
        (id) => (db[modelo] as any).update({ where: { id }, data: { nome } }),
      )
    }
  }

  // Meta anual
  for await (const p of paginarDatabase(notion, DS.metaAnual)) {
    const nome = primeiroQueExistir(p.properties, ['Name', 'Nome'], texto) ?? 'Meta anual'
    const referencia = data(p.properties, 'Data')
    const ano = referencia?.getFullYear() ?? Number(nome.match(/\d{4}/)?.[0]) ?? new Date().getFullYear()
    const campos = {
      nome,
      ano,
      moeda: texto(p.properties, 'Moeda') ?? 'BRL',
      texto: texto(p.properties, 'Texto'),
      capaUrl: primeiroArquivoUrl(p.properties, 'Capa'),
    }
    await upsert(
      p.id, 'metaAnual', DS.metaAnual, fase,
      () => db.metaAnual.create({ data: campos }),
      (id) => db.metaAnual.update({ where: { id }, data: campos }),
    )
  }

  // Overview Financeiro (um registro por mês)
  for await (const p of paginarDatabase(notion, DS.overviewFinanceiro)) {
    const nome = primeiroQueExistir(p.properties, ['Month', 'Mês', 'Nome'], texto) ?? 'Mês'
    const referencia = data(p.properties, 'Date') ?? data(p.properties, 'Data')
    if (!referencia) { stats.ignorados += 1; continue }
    const campos = {
      nome,
      ano: referencia.getFullYear(),
      mes: referencia.getMonth() + 1,
      metaLucro: numero(p.properties, 'Meta de Lucro'),
      moeda: texto(p.properties, 'Moeda') ?? 'BRL',
      capaUrl: primeiroArquivoUrl(p.properties, 'Capa'),
    }
    await upsert(
      p.id, 'mesFinanceiro', DS.overviewFinanceiro, fase,
      () => db.mesFinanceiro.create({ data: campos }),
      (id) => db.mesFinanceiro.update({ where: { id }, data: campos }),
    )
  }

  // Clientes
  for await (const p of paginarDatabase(notion, DS.clientes)) {
    const nomeEmpresa =
      primeiroQueExistir(p.properties, ['Nome da empresa', 'Nome', 'Name'], texto) ?? 'Sem nome'
    const campos = {
      nomeEmpresa,
      contatoPessoal: texto(p.properties, 'Contato Pessoal'),
      email: email(p.properties, 'E-mail'),
      telefone: telefone(p.properties, 'Telefone'),
      cnpj: texto(p.properties, 'CNPJ'),
      cpf: texto(p.properties, 'CPF'),
      endereco: texto(p.properties, 'Endereço'),
      cidade: texto(p.properties, 'Cidade'),
      uf: texto(p.properties, 'UF'),
      cep: texto(p.properties, 'CEP'),
      status: mapearEnum(selecao(p.properties, 'Status'), STATUS_CLIENTE, 'ATIVO')!,
      fonte: mapearEnum(selecao(p.properties, 'Fonte'), FONTE_CLIENTE),
      ultimoProjeto: data(p.properties, 'Último projeto'),
      capaUrl: primeiroArquivoUrl(p.properties, 'Imagem de Capa'),
    }
    const id = await upsert(
      p.id, 'cliente', DS.clientes, fase,
      () => db.cliente.create({ data: campos }),
      (cid) => db.cliente.update({ where: { id: cid }, data: campos }),
    )
    if (id) await salvarArquivos(p.properties, 'Imagem de Capa', 'CAPA', 'CLIENTE', id)
  }

  // Metas
  for await (const p of paginarDatabase(notion, DS.metas)) {
    const titulo = primeiroQueExistir(p.properties, ['Nome', 'Name', 'Meta'], texto) ?? 'Meta'
    const progresso = Math.round((numero(p.properties, 'Progresso') ?? 0) * 100) || 0
    const campos = {
      titulo,
      descricao: texto(p.properties, 'Descrição'),
      progresso: Math.min(100, Math.max(0, progresso)),
      prazo: data(p.properties, 'Prazo') ?? data(p.properties, 'Data'),
      status: checkbox(p.properties, 'Alcançada')
        ? ('ALCANCADA' as const)
        : ('EM_ANDAMENTO' as const),
    }
    await upsert(
      p.id, 'meta', DS.metas, fase,
      () => db.meta.create({ data: campos }),
      (id) => db.meta.update({ where: { id }, data: campos }),
    )
  }

  // Postagens
  for await (const p of paginarDatabase(notion, DS.postagens)) {
    const titulo = primeiroQueExistir(p.properties, ['Nome', 'Name', 'Título'], texto) ?? 'Postagem'
    const publicadaEm = data(p.properties, 'Publicado em') ?? data(p.properties, 'Data')
    const agendadaPara = data(p.properties, 'Agendado para') ?? data(p.properties, 'Data')
    const campos = {
      titulo,
      pauta: texto(p.properties, 'Pauta'),
      legenda: texto(p.properties, 'Legenda'),
      status: checkbox(p.properties, 'Publicado')
        ? ('PUBLICADO' as const)
        : agendadaPara
          ? ('AGENDADO' as const)
          : ('IDEIA' as const),
      publicadaEm: checkbox(p.properties, 'Publicado') ? publicadaEm : null,
      agendadaPara,
      link: url(p.properties, 'Link'),
      capaUrl: primeiroArquivoUrl(p.properties, 'Capa'),
    }
    const id = await upsert(
      p.id, 'postagem', DS.postagens, fase,
      () => db.postagem.create({ data: campos }),
      (pid) => db.postagem.update({ where: { id: pid }, data: campos }),
    )
    if (id) await salvarArquivos(p.properties, 'Capa', 'CAPA', 'POSTAGEM', id)
  }

  // Portfólio
  for await (const p of paginarDatabase(notion, DS.portfolio)) {
    const nome = primeiroQueExistir(p.properties, ['Nome', 'Name'], texto) ?? 'Projeto'
    const publicado = checkbox(p.properties, 'Publicado')
    const campos = {
      nome,
      resumo: texto(p.properties, 'Resumo') ?? texto(p.properties, 'Descrição'),
      status: publicado ? ('PUBLICADO' as const) : ('RASCUNHO' as const),
      publicadoEm: publicado ? data(p.properties, 'Data') : null,
      link: url(p.properties, 'Link'),
      capaUrl: primeiroArquivoUrl(p.properties, 'Capa'),
    }
    const id = await upsert(
      p.id, 'projetoPortfolio', DS.portfolio, fase,
      () => db.projetoPortfolio.create({ data: campos }),
      (pid) => db.projetoPortfolio.update({ where: { id: pid }, data: campos }),
    )
    if (id) await salvarArquivos(p.properties, 'Capa', 'CAPA', 'PROJETO_PORTFOLIO', id)
  }

  // Setup do negócio
  let ordemSetup = 0
  for await (const p of paginarDatabase(notion, DS.setup)) {
    const nome = primeiroQueExistir(p.properties, ['Nome', 'Name', 'Etapa'], texto) ?? 'Etapa'
    const feita = checkbox(p.properties, 'Feito') || checkbox(p.properties, 'Concluído')
    const campos = {
      nome,
      descricao: texto(p.properties, 'Descrição'),
      status: feita ? ('FEITA' as const) : ('NAO_INICIADA' as const),
      ordem: ordemSetup++,
      concluidaEm: feita ? data(p.properties, 'Data') : null,
    }
    await upsert(
      p.id, 'etapaSetup', DS.setup, fase,
      () => db.etapaSetup.create({ data: campos }),
      (id) => db.etapaSetup.update({ where: { id }, data: campos }),
    )
  }

  await migrarPlanner(notion, fase)
  await migrarHabitos(notion, fase)
}

/** As 3 databases do planner (Dia / Semana / Mês) viram uma tabela só. */
async function migrarPlanner(notion: Client, fase: FaseMigracao) {
  const fontes = [
    { ds: DS.plannerDia, periodo: 'DIA' as const },
    { ds: DS.plannerSemana, periodo: 'SEMANA' as const },
    { ds: DS.plannerMes, periodo: 'MES' as const },
  ]

  for (const { ds, periodo } of fontes) {
    try {
      for await (const p of paginarDatabase(notion, ds)) {
        const nome = primeiroQueExistir(p.properties, ['Nome', 'Name'], texto) ?? periodo
        const inicio = data(p.properties, 'Data')
        if (!inicio) { stats.ignorados += 1; continue }
        const campos = {
          nome,
          periodo,
          inicio,
          fim: dataFim(p.properties, 'Data'),
          status: mapearEnum(selecao(p.properties, 'Status'), STATUS_PLANNER, 'NAO_PLANEJADO')!,
          capaUrl: primeiroArquivoUrl(p.properties, 'Capa'),
        }
        await upsert(
          p.id, 'plannerEntrada', ds, fase,
          () => db.plannerEntrada.create({ data: campos }),
          (id) => db.plannerEntrada.update({ where: { id }, data: campos }),
        )
      }
    } catch (erro) {
      const msg = erro instanceof Error ? erro.message : String(erro)
      stats.erros.push(`planner ${periodo} (${ds}): ${msg}`)
    }
  }
}

/**
 * `Hábito 1`…`Hábito 5` eram checkboxes fixos. Viram 5 registros em `Habito` +
 * um `RegistroHabito` por linha + uma `MarcacaoHabito` por checkbox.
 */
async function migrarHabitos(notion: Client, fase: FaseMigracao) {
  const NOMES_FIXOS = ['Hábito 1', 'Hábito 2', 'Hábito 3', 'Hábito 4', 'Hábito 5']

  const habitos = new Map<string, string>()
  for (const [i, nome] of NOMES_FIXOS.entries()) {
    const existente = await db.habito.findFirst({ where: { nome } })
    const registro =
      existente ?? (await db.habito.create({ data: { nome, ordem: i } }))
    habitos.set(nome, registro.id)
  }

  for await (const p of paginarDatabase(notion, DS.habitos)) {
    const dia = data(p.properties, 'Data')
    if (!dia) { stats.ignorados += 1; continue }
    const campos = { nome: texto(p.properties, 'Nome'), data: dia }

    const registroId = await upsert(
      p.id, 'registroHabito', DS.habitos, fase,
      () => db.registroHabito.create({ data: campos }),
      (id) => db.registroHabito.update({ where: { id }, data: campos }),
    )
    if (!registroId) continue

    for (const nome of NOMES_FIXOS) {
      const habitoId = habitos.get(nome)!
      const feito = checkbox(p.properties, nome)
      await db.marcacaoHabito.upsert({
        where: { registroId_habitoId: { registroId, habitoId } },
        create: { registroId, habitoId, feito },
        update: { feito },
      })
    }
  }
}

// ---------------------------------------------------------------------------
// Fase 2 — dependentes
// ---------------------------------------------------------------------------

async function fase2({ notion }: Contexto) {
  const fase: FaseMigracao = 'FASE_2'
  log('▸ Fase 2 — dependentes')

  // Leads — CRM novo
  for await (const p of paginarDatabase(notion, DS.leadsNovo)) {
    const nome = primeiroQueExistir(p.properties, ['Name', 'Nome'], texto) ?? 'Lead'
    const campos = {
      nome,
      telefone: telefone(p.properties, 'Telefone '),
      cnpj: texto(p.properties, 'CNPJ'),
      etapa: mapearEnum(selecao(p.properties, 'Etapa'), ETAPA_LEAD),
      status: mapearEnum(selecao(p.properties, 'Status'), STATUS_LEAD_NOVO, 'LEAD')!,
      canal: mapearEnum(selecao(p.properties, 'Canal'), CANAL_LEAD),
      valorEstimado: numero(p.properties, 'Valor'),
      dataContato: data(p.properties, 'Date'),
      dataInicio: data(p.properties, 'Data de Início '),
      dataFechamento: data(p.properties, 'Data de Fechamento '),
      fechado: checkbox(p.properties, 'Fechamento '),
    }
    await upsert(
      p.id, 'lead', DS.leadsNovo, fase,
      () => db.lead.create({ data: campos }),
      (id) => db.lead.update({ where: { id }, data: campos }),
    )
  }

  // Leads — CRM legado. Status é interpretação: ver docs/MAPA-NOTION.md §8.
  for await (const p of paginarDatabase(notion, DS.leadsLegado)) {
    const nome = primeiroQueExistir(p.properties, ['Nome', 'Name'], texto) ?? 'Lead'
    const campos = {
      nome,
      contatoPessoal: texto(p.properties, 'Contato Pessoal'),
      email: email(p.properties, 'E-mail'),
      status: mapearEnum(selecao(p.properties, 'Status'), STATUS_LEAD_LEGADO, 'LEAD')!,
      fonteLegado: mapearEnum(selecao(p.properties, 'Fonte'), FONTE_LEAD_LEGADO),
      valorEstimado: numero(p.properties, 'Valor estimado'),
      dataContato: data(p.properties, 'Data'),
    }
    await upsert(
      p.id, 'lead', DS.leadsLegado, fase,
      () => db.lead.create({ data: campos }),
      (id) => db.lead.update({ where: { id }, data: campos }),
    )
  }

  // Propostas
  for await (const p of paginarDatabase(notion, DS.propostas)) {
    const titulo = primeiroQueExistir(p.properties, ['Nome', 'Name', 'Título'], texto) ?? 'Proposta'
    const campos = {
      titulo,
      valor: numero(p.properties, 'Valor'),
      enviadaEm: data(p.properties, 'Enviada em') ?? data(p.properties, 'Data'),
      validaAte: data(p.properties, 'Válida até'),
      observacoes: texto(p.properties, 'Observações'),
      clienteId: await local(relacaoUnica(p.properties, 'Cliente')),
      leadId: await local(relacaoUnica(p.properties, 'Leads')),
    }
    await upsert(
      p.id, 'proposta', DS.propostas, fase,
      () => db.proposta.create({ data: campos }),
      (id) => db.proposta.update({ where: { id }, data: campos }),
    )
  }

  // Contratos
  for await (const p of paginarDatabase(notion, DS.contratos)) {
    const titulo = primeiroQueExistir(p.properties, ['Nome', 'Name', 'Título'], texto) ?? 'Contrato'
    const campos = {
      titulo,
      valor: numero(p.properties, 'Valor'),
      assinadoEm: data(p.properties, 'Assinado em') ?? data(p.properties, 'Data'),
      inicioVigencia: data(p.properties, 'Início'),
      fimVigencia: data(p.properties, 'Fim'),
      link: url(p.properties, 'Link'),
      clienteId: await local(relacaoUnica(p.properties, 'Cliente')),
      propostaId: await local(relacaoUnica(p.properties, 'Proposta')),
    }
    await upsert(
      p.id, 'contrato', DS.contratos, fase,
      () => db.contrato.create({ data: campos }),
      (id) => db.contrato.update({ where: { id }, data: campos }),
    )
  }

  // Projetos
  for await (const p of paginarDatabase(notion, DS.projetos)) {
    const nome = primeiroQueExistir(p.properties, ['Nome', 'Name'], texto) ?? 'Projeto'
    const tipos = selecaoMultipla(p.properties, 'Tipo do projeto')
      .map((t) => mapearEnum(t, TIPO_PROJETO))
      .filter((t): t is 'WEBSITE' | 'BRANDING' | 'MARKETING' | 'OUTROS' => Boolean(t))
    const campos = {
      nome,
      status: mapearEnum(selecao(p.properties, 'Status'), STATUS_PROJETO, 'NAO_INICIADO')!,
      tipos,
      valor: numero(p.properties, 'Valor'),
      inicio: data(p.properties, 'Data do projeto'),
      termino: dataFim(p.properties, 'Data do projeto'),
      link: url(p.properties, 'Link'),
      texto: texto(p.properties, 'Texto'),
      capaUrl: primeiroArquivoUrl(p.properties, 'Capa'),
      clienteId: await local(relacaoUnica(p.properties, 'Cliente')),
      propostaId: await local(relacaoUnica(p.properties, 'Proposta')),
      contratoId: await local(relacaoUnica(p.properties, 'Contrato')),
    }
    const id = await upsert(
      p.id, 'projeto', DS.projetos, fase,
      () => db.projeto.create({ data: campos }),
      (pid) => db.projeto.update({ where: { id: pid }, data: campos }),
    )
    if (id) await salvarArquivos(p.properties, 'Capa', 'CAPA', 'PROJETO', id)
  }

  // Receitas / Despesas
  for (const [ds, modelo, propCategoria] of [
    [DS.receitas, 'receita', 'Categoria'],
    [DS.despesas, 'despesa', 'Categoria'],
  ] as const) {
    for await (const p of paginarDatabase(notion, ds)) {
      const descricao =
        primeiroQueExistir(p.properties, ['Nome', 'Name', 'Descrição'], texto) ?? 'Lançamento'
      const quando = data(p.properties, 'Data') ?? data(p.properties, 'Date')
      if (!quando) { stats.ignorados += 1; continue }
      const campos = {
        descricao,
        valor: numero(p.properties, 'Valor') ?? 0,
        data: quando,
        observacoes: texto(p.properties, 'Observações'),
        categoriaId: await local(relacaoUnica(p.properties, propCategoria)),
        mesId: await local(relacaoUnica(p.properties, 'Mês')),
        ...(modelo === 'receita'
          ? { recebido: checkbox(p.properties, 'Recebido') }
          : { pago: checkbox(p.properties, 'Pago') }),
      }
      await upsert(
        p.id, modelo, ds, fase,
        () => (db[modelo] as any).create({ data: campos }),
        (id) => (db[modelo] as any).update({ where: { id }, data: campos }),
      )
    }
  }
}

// ---------------------------------------------------------------------------
// Fase 3 — relações
// ---------------------------------------------------------------------------

async function fase3({ notion }: Contexto) {
  const fase: FaseMigracao = 'FASE_3'
  log('▸ Fase 3 — relações')

  // Tarefas — database principal
  for await (const p of paginarDatabase(notion, DS.tarefasPrincipal)) {
    const titulo = primeiroQueExistir(p.properties, ['Título', 'Nome', 'Name'], texto) ?? 'Tarefa'
    const concluida = checkbox(p.properties, 'Concluído')
    const campos = {
      titulo,
      notas: texto(p.properties, 'Notas'),
      status: concluida ? ('COMPLETA' as const) : ('A_FAZER' as const),
      prioridade: mapearEnum(selecao(p.properties, 'Prioridade'), PRIORIDADE_TAREFA),
      tag: mapearEnum(selecao(p.properties, 'Tag'), TAG_TAREFA),
      prazo: data(p.properties, 'Data de vencimento'),
      concluida,
      origem: 'PRINCIPAL' as const,
      projetoId: await local(relacaoUnica(p.properties, 'Projeto')),
      leadId: await local(relacaoUnica(p.properties, 'Leads')),
      postagemId: await local(relacaoUnica(p.properties, 'Social Media')),
      responsavelId: await usuarioDoNotion(pessoas(p.properties, 'Responsável')[0] ?? null),
    }
    const id = await upsert(
      p.id, 'tarefa', DS.tarefasPrincipal, fase,
      () => db.tarefa.create({ data: campos }),
      (tid) => db.tarefa.update({ where: { id: tid }, data: campos }),
    )
    if (id) await salvarArquivos(p.properties, 'Arquivos e mídia', 'MIDIA', 'TAREFA', id)
  }

  // Tarefas — widget (vocabulário diferente, mesma tabela)
  for await (const p of paginarDatabase(notion, DS.tarefasWidget)) {
    const titulo = primeiroQueExistir(p.properties, ['Nome', 'Name'], texto) ?? 'Tarefa'
    const status = mapearEnum(selecao(p.properties, 'Status'), STATUS_TAREFA, 'A_FAZER')!
    const campos = {
      titulo,
      status,
      prioridade: mapearEnum(selecao(p.properties, 'Prioridade'), PRIORIDADE_TAREFA),
      prazo: data(p.properties, 'Prazo'),
      concluida: status === 'COMPLETA',
      origem: 'WIDGET' as const,
      responsavelId: await usuarioDoNotion(pessoas(p.properties, 'Responsável')[0] ?? null),
    }
    await upsert(
      p.id, 'tarefa', DS.tarefasWidget, fase,
      () => db.tarefa.create({ data: campos }),
      (id) => db.tarefa.update({ where: { id }, data: campos }),
    )
  }

  // Faturas
  for await (const p of paginarDatabase(notion, DS.faturas)) {
    const numeroFatura = primeiroQueExistir(p.properties, ['Número', 'Nome', 'Name'], texto) ?? 'S/N'
    const pago = checkbox(p.properties, 'Pago')
    const entrega = data(p.properties, 'Data de entrega')
    const campos = {
      numero: numeroFatura,
      tipo: mapearEnum(selecao(p.properties, 'Tipo'), TIPO_FATURA, 'PRECO_FIXO')!,
      status: pago
        ? ('PAGA' as const)
        : entrega && entrega < new Date()
          ? ('VENCIDA' as const)
          : ('EMITIDA' as const),
      precoFixo: numero(p.properties, 'Preço fixo'),
      emitidaEm: data(p.properties, 'Emitido em'),
      dataEntrega: entrega,
      pago,
      pdfUrl: primeiroArquivoUrl(p.properties, 'PDF da Fatura'),
      capaUrl: primeiroArquivoUrl(p.properties, 'Capa'),
      projetoId: await local(relacaoUnica(p.properties, 'Projeto')),
    }
    const id = await upsert(
      p.id, 'fatura', DS.faturas, fase,
      () => db.fatura.create({ data: campos }),
      (fid) => db.fatura.update({ where: { id: fid }, data: campos }),
    )
    if (id) {
      await salvarArquivos(p.properties, 'PDF da Fatura', 'PDF', 'FATURA', id)
      await salvarArquivos(p.properties, 'Capa', 'CAPA', 'FATURA', id)
    }
  }

  // Planilha de horas
  for await (const p of paginarDatabase(notion, DS.planilhaHoras)) {
    const descricao =
      primeiroQueExistir(p.properties, ['Nome', 'Name', 'Descrição'], texto) ?? 'Apontamento'
    const campos = {
      descricao,
      data: data(p.properties, 'Data'),
      horas: numero(p.properties, 'Horas') ?? 0,
      valorHora: numero(p.properties, 'Valor da hora') ?? numero(p.properties, 'Preço por hora'),
      faturaId: await local(relacaoUnica(p.properties, 'Fatura')),
    }
    await upsert(
      p.id, 'planilhaHoras', DS.planilhaHoras, fase,
      () => db.planilhaHoras.create({ data: campos }),
      (id) => db.planilhaHoras.update({ where: { id }, data: campos }),
    )
  }

  // Reuniões
  for await (const p of paginarDatabase(notion, DS.reunioes)) {
    const titulo = primeiroQueExistir(p.properties, ['Nome', 'Name', 'Título'], texto) ?? 'Reunião'
    const inicio = data(p.properties, 'Data')
    const campos = {
      titulo,
      inicio,
      fim: dataFim(p.properties, 'Data'),
      local: texto(p.properties, 'Local'),
      pauta: texto(p.properties, 'Pauta'),
      notas: texto(p.properties, 'Notas'),
      status: inicio && inicio < new Date() ? ('REALIZADA' as const) : ('AGENDADA' as const),
      projetoId: await local(relacaoUnica(p.properties, 'Projeto')),
    }
    await upsert(
      p.id, 'reuniao', DS.reunioes, fase,
      () => db.reuniao.create({ data: campos }),
      (id) => db.reuniao.update({ where: { id }, data: campos }),
    )
  }

  // Feedbacks
  for await (const p of paginarDatabase(notion, DS.feedbacks)) {
    const titulo = primeiroQueExistir(p.properties, ['Nome', 'Name', 'Título'], texto) ?? 'Feedback'
    const campos = {
      titulo,
      nota: numero(p.properties, 'Nota') ?? null,
      comentario: texto(p.properties, 'Comentário'),
      recebidoEm: data(p.properties, 'Data'),
      projetoId: await local(relacaoUnica(p.properties, 'Projeto')),
    }
    await upsert(
      p.id, 'feedback', DS.feedbacks, fase,
      () => db.feedback.create({ data: campos }),
      (id) => db.feedback.update({ where: { id }, data: campos }),
    )
  }

  // Stats do funil
  for await (const p of paginarDatabase(notion, DS.leadStats)) {
    const rotulo = primeiroQueExistir(p.properties, ['Name', 'Nome'], texto) ?? 'Stat'
    const campos = {
      rotulo,
      valor: numero(p.properties, 'Valor'),
      referencia: data(p.properties, 'Data'),
      leadId: await local(relacaoUnica(p.properties, 'Leads')),
    }
    await upsert(
      p.id, 'leadStat', DS.leadStats, fase,
      () => db.leadStat.create({ data: campos }),
      (id) => db.leadStat.update({ where: { id }, data: campos }),
    )
  }
}

// ---------------------------------------------------------------------------
// --dry-run
// ---------------------------------------------------------------------------

async function dryRun(notion: Client) {
  log('\nMigração Notion → Postgres — SIMULAÇÃO (nada será escrito)\n')

  const linhas: { nome: string; registros: number | string }[] = []
  let total = 0

  for (const [nome, ds] of Object.entries(DS)) {
    try {
      const n = await contarRegistros(notion, ds)
      total += n
      linhas.push({ nome, registros: n })
    } catch (erro) {
      const msg = erro instanceof Error ? erro.message : String(erro)
      const motivo = msg.includes('Could not find')
        ? 'inacessível (compartilhe com a integração)'
        : msg.slice(0, 48)
      linhas.push({ nome, registros: `erro — ${motivo}` })
    }
  }

  const largura = Math.max(...linhas.map((l) => l.nome.length))
  for (const linha of linhas) {
    log(`  ${linha.nome.padEnd(largura)}  ${String(linha.registros).padStart(6)}`)
  }

  log(`\n  ${'TOTAL'.padEnd(largura)}  ${String(total).padStart(6)}\n`)

  log('Ignoradas de propósito:')
  for (const [id, motivo] of Object.entries(IGNORADAS)) {
    log(`  ${id}  ${motivo}`)
  }

  log('\nConfira se os números batem com o que você vê no Notion.')
  log('Se alguma linha deu "inacessível", compartilhe a página raiz com a')
  log('integração (⋯ → Conexões → sua integração) e rode de novo.')
  log('\nQuando estiver certo:  npm run migrar\n')
}

// ---------------------------------------------------------------------------

async function main() {
  const notion = criarClienteNotion()

  if (DRY_RUN) {
    await dryRun(notion)
    return
  }

  log('\nMigração Notion → Postgres\n')
  const inicio = Date.now()

  await fase1({ notion, fase: 'FASE_1' })
  await fase2({ notion, fase: 'FASE_2' })
  await fase3({ notion, fase: 'FASE_3' })

  const segundos = ((Date.now() - inicio) / 1000).toFixed(1)
  log(`\n  criados      ${stats.criados}`)
  log(`  atualizados  ${stats.atualizados}`)
  log(`  ignorados    ${stats.ignorados}`)
  log(`  tempo        ${segundos}s`)

  if (stats.erros.length) {
    log(`\n  ${stats.erros.length} erro(s):`)
    for (const erro of stats.erros.slice(0, 20)) log(`    ${erro}`)
    if (stats.erros.length > 20) log(`    … e mais ${stats.erros.length - 20}`)
  }
  log('')
}

main()
  .catch((erro) => {
    console.error('\nMigração abortada:', erro instanceof Error ? erro.message : erro)
    process.exitCode = 1
  })
  .finally(async () => {
    await db.$disconnect()
  })
