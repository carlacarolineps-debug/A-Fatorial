/**
 * Substitui a database `Resumo` do Notion.
 *
 * Lá era uma linha única ligada por relation a *todas* as outras databases, com
 * ~60 rollups em cima — e cada database carregava uma propriedade `Resumo`
 * obrigatória só para alimentá-la ("This property must be filled out in order
 * to link to the Summary in the main page"). Isso existia porque o Notion não
 * faz agregação global, não porque fosse um dado.
 *
 * Aqui é uma query. NÃO recrie uma tabela `Resumo`.
 */

import { db } from '@/lib/db'
import {
  intervaloDaSemana,
  intervaloDoAno,
  intervaloDoMes,
  paraNumero,
  hoje,
} from '@/lib/datas'
import {
  lucroLiquido,
  progressoDaMeta,
  progressoDeConteudo,
  progressoDoSetup,
  progressoFaturasPagas,
  taxaDeConclusao,
} from '@/lib/formulas'

export interface Resumo {
  clientes: { total: number; ativos: number }
  projetos: { total: number; emAndamento: number; finalizados: number }
  tarefas: { total: number; pendentes: number; vencidas: number; concluidasNaSemana: number }
  leads: { total: number; abertos: number; ganhosNoMes: number; valorEmAberto: number }
  financeiro: {
    receitasDoMes: number
    despesasDoMes: number
    lucroDoMes: number
    metaDeLucro: number
    progresso: number
    receitasDoAno: number
    despesasDoAno: number
    lucroDoAno: number
  }
  faturas: { total: number; pagas: number; venceEsteMes: number; progresso: number }
  metas: { total: number; alcancadas: number; vencidas: number }
  conteudo: { publicadosNoMes: number; agendadosNaSemana: number; progresso: number }
  habitos: { totalAtivos: number; feitosHoje: number; taxaHoje: number }
  planner: { hojePlanejado: boolean; semanaPlanejada: boolean; mesPlanejado: boolean }
  setup: { total: number; feitas: number; progresso: number }
  reunioes: { proximasNoMes: number }
  portfolio: { total: number; publicados: number }
}

/**
 * Uma passada só. Todas as contagens vão em paralelo — é uma página de
 * dashboard, não vale serializar 30 round-trips.
 */
export async function carregarResumo(referencia: Date = new Date()): Promise<Resumo> {
  const mes = intervaloDoMes(referencia)
  const semana = intervaloDaSemana(referencia)
  const ano = intervaloDoAno(referencia)
  const inicioDeHoje = hoje(referencia)

  const [
    clientesTotal,
    clientesAtivos,
    projetosTotal,
    projetosEmAndamento,
    projetosFinalizados,
    tarefasTotal,
    tarefasPendentes,
    tarefasVencidas,
    tarefasConcluidasNaSemana,
    leadsTotal,
    leadsAbertos,
    leadsGanhosNoMes,
    leadsValorEmAberto,
    receitasMes,
    despesasMes,
    receitasAno,
    despesasAno,
    metaDoMes,
    faturasTotal,
    faturasPagas,
    faturasVenceEsteMes,
    metasTotal,
    metasAlcancadas,
    metasVencidas,
    postagensPublicadasNoMes,
    postagensAgendadasNaSemana,
    postagensPlanejadasNoMes,
    habitosAtivos,
    registroDeHoje,
    plannerDeHoje,
    plannerDaSemana,
    plannerDoMes,
    setupTotal,
    setupFeitas,
    reunioesProximas,
    portfolioTotal,
    portfolioPublicados,
  ] = await Promise.all([
    db.cliente.count(),
    db.cliente.count({ where: { status: 'ATIVO' } }),
    db.projeto.count(),
    db.projeto.count({ where: { status: 'EM_ANDAMENTO' } }),
    db.projeto.count({ where: { status: 'FEITO' } }),
    db.tarefa.count(),
    db.tarefa.count({ where: { concluida: false } }),
    db.tarefa.count({ where: { concluida: false, prazo: { lt: inicioDeHoje } } }),
    db.tarefa.count({
      where: { concluida: true, concluidaEm: { gte: semana.inicio, lte: semana.fim } },
    }),
    db.lead.count(),
    db.lead.count({
      where: { status: { notIn: ['FECHAMENTO_GANHO', 'FECHAMENTO_PERDIDO'] } },
    }),
    db.lead.count({
      where: {
        status: 'FECHAMENTO_GANHO',
        dataFechamento: { gte: mes.inicio, lte: mes.fim },
      },
    }),
    db.lead.aggregate({
      _sum: { valorEstimado: true },
      where: { status: { notIn: ['FECHAMENTO_GANHO', 'FECHAMENTO_PERDIDO'] } },
    }),
    db.receita.aggregate({ _sum: { valor: true }, where: { data: { gte: mes.inicio, lte: mes.fim } } }),
    db.despesa.aggregate({ _sum: { valor: true }, where: { data: { gte: mes.inicio, lte: mes.fim } } }),
    db.receita.aggregate({ _sum: { valor: true }, where: { data: { gte: ano.inicio, lte: ano.fim } } }),
    db.despesa.aggregate({ _sum: { valor: true }, where: { data: { gte: ano.inicio, lte: ano.fim } } }),
    db.mesFinanceiro.findUnique({
      where: { ano_mes: { ano: referencia.getFullYear(), mes: referencia.getMonth() + 1 } },
      select: { metaLucro: true },
    }),
    db.fatura.count(),
    db.fatura.count({ where: { pago: true } }),
    db.fatura.count({
      where: { pago: false, dataEntrega: { gte: mes.inicio, lte: mes.fim } },
    }),
    db.meta.count(),
    db.meta.count({ where: { status: 'ALCANCADA' } }),
    db.meta.count({
      where: { status: { not: 'ALCANCADA' }, prazo: { lt: inicioDeHoje } },
    }),
    db.postagem.count({
      where: { status: 'PUBLICADO', publicadaEm: { gte: mes.inicio, lte: mes.fim } },
    }),
    db.postagem.count({
      where: { status: 'AGENDADO', agendadaPara: { gte: semana.inicio, lte: semana.fim } },
    }),
    db.postagem.count({
      where: {
        OR: [
          { agendadaPara: { gte: mes.inicio, lte: mes.fim } },
          { publicadaEm: { gte: mes.inicio, lte: mes.fim } },
        ],
      },
    }),
    db.habito.count({ where: { ativo: true } }),
    db.registroHabito.findUnique({
      where: { data: inicioDeHoje },
      select: { marcacoes: { where: { feito: true }, select: { id: true } } },
    }),
    db.plannerEntrada.findFirst({
      where: { periodo: 'DIA', inicio: inicioDeHoje },
      select: { status: true },
    }),
    db.plannerEntrada.findFirst({
      where: { periodo: 'SEMANA', inicio: semana.inicio },
      select: { status: true },
    }),
    db.plannerEntrada.findFirst({
      where: { periodo: 'MES', inicio: mes.inicio },
      select: { status: true },
    }),
    db.etapaSetup.count(),
    db.etapaSetup.count({ where: { status: 'FEITA' } }),
    db.reuniao.count({
      where: { status: 'AGENDADA', inicio: { gte: referencia, lte: mes.fim } },
    }),
    db.projetoPortfolio.count(),
    db.projetoPortfolio.count({ where: { status: 'PUBLICADO' } }),
  ])

  const receitasDoMes = paraNumero(receitasMes._sum.valor)
  const despesasDoMes = paraNumero(despesasMes._sum.valor)
  const receitasDoAno = paraNumero(receitasAno._sum.valor)
  const despesasDoAno = paraNumero(despesasAno._sum.valor)
  const metaDeLucro = paraNumero(metaDoMes?.metaLucro)
  const lucroDoMes = lucroLiquido(receitasDoMes, despesasDoMes)
  const feitosHoje = registroDeHoje?.marcacoes.length ?? 0

  const planejado = (status: string | null | undefined) =>
    status === 'PLANEJADO' || status === 'EM_ANDAMENTO' || status === 'CONCLUIDO'

  return {
    clientes: { total: clientesTotal, ativos: clientesAtivos },
    projetos: {
      total: projetosTotal,
      emAndamento: projetosEmAndamento,
      finalizados: projetosFinalizados,
    },
    tarefas: {
      total: tarefasTotal,
      pendentes: tarefasPendentes,
      vencidas: tarefasVencidas,
      concluidasNaSemana: tarefasConcluidasNaSemana,
    },
    leads: {
      total: leadsTotal,
      abertos: leadsAbertos,
      ganhosNoMes: leadsGanhosNoMes,
      valorEmAberto: paraNumero(leadsValorEmAberto._sum.valorEstimado),
    },
    financeiro: {
      receitasDoMes,
      despesasDoMes,
      lucroDoMes,
      metaDeLucro,
      progresso: progressoDaMeta(lucroDoMes, metaDeLucro),
      receitasDoAno,
      despesasDoAno,
      lucroDoAno: lucroLiquido(receitasDoAno, despesasDoAno),
    },
    faturas: {
      total: faturasTotal,
      pagas: faturasPagas,
      venceEsteMes: faturasVenceEsteMes,
      progresso: progressoFaturasPagas(faturasPagas, faturasTotal),
    },
    metas: { total: metasTotal, alcancadas: metasAlcancadas, vencidas: metasVencidas },
    conteudo: {
      publicadosNoMes: postagensPublicadasNoMes,
      agendadosNaSemana: postagensAgendadasNaSemana,
      progresso: progressoDeConteudo(postagensPublicadasNoMes, postagensPlanejadasNoMes),
    },
    habitos: {
      totalAtivos: habitosAtivos,
      feitosHoje,
      taxaHoje: taxaDeConclusao(feitosHoje, habitosAtivos),
    },
    planner: {
      hojePlanejado: planejado(plannerDeHoje?.status),
      semanaPlanejada: planejado(plannerDaSemana?.status),
      mesPlanejado: planejado(plannerDoMes?.status),
    },
    setup: {
      total: setupTotal,
      feitas: setupFeitas,
      progresso: progressoDoSetup(setupFeitas, setupTotal),
    },
    reunioes: { proximasNoMes: reunioesProximas },
    portfolio: { total: portfolioTotal, publicados: portfolioPublicados },
  }
}

/** Resumo vazio — usado quando o banco ainda não foi migrado. */
export function resumoVazio(): Resumo {
  return {
    clientes: { total: 0, ativos: 0 },
    projetos: { total: 0, emAndamento: 0, finalizados: 0 },
    tarefas: { total: 0, pendentes: 0, vencidas: 0, concluidasNaSemana: 0 },
    leads: { total: 0, abertos: 0, ganhosNoMes: 0, valorEmAberto: 0 },
    financeiro: {
      receitasDoMes: 0,
      despesasDoMes: 0,
      lucroDoMes: 0,
      metaDeLucro: 0,
      progresso: 0,
      receitasDoAno: 0,
      despesasDoAno: 0,
      lucroDoAno: 0,
    },
    faturas: { total: 0, pagas: 0, venceEsteMes: 0, progresso: 0 },
    metas: { total: 0, alcancadas: 0, vencidas: 0 },
    conteudo: { publicadosNoMes: 0, agendadosNaSemana: 0, progresso: 0 },
    habitos: { totalAtivos: 0, feitosHoje: 0, taxaHoje: 0 },
    planner: { hojePlanejado: false, semanaPlanejada: false, mesPlanejado: false },
    setup: { total: 0, feitas: 0, progresso: 0 },
    reunioes: { proximasNoMes: 0 },
    portfolio: { total: 0, publicados: 0 },
  }
}
