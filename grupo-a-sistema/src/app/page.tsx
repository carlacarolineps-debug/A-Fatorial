import { Aviso, Barra, Cartao, Grade, Secao } from '@/components/painel'
import { formatarBRL, NOMES_MESES } from '@/lib/datas'
import { carregarResumo, resumoVazio, type Resumo } from '@/lib/resumo'

// O resumo agrega o banco inteiro — nada disso pode ser pré-renderizado.
export const dynamic = 'force-dynamic'

export default async function Dashboard() {
  const agora = new Date()

  let resumo: Resumo
  let bancoIndisponivel = false
  try {
    resumo = await carregarResumo(agora)
  } catch {
    // Antes de `npm run db:migrate` a página ainda precisa abrir.
    resumo = resumoVazio()
    bancoIndisponivel = true
  }

  const mesAtual = NOMES_MESES[agora.getMonth()]
  const { financeiro, tarefas, leads, projetos, clientes, faturas, habitos, planner } = resumo

  return (
    <>
      <header className="mb-8">
        <h1 className="text-2xl font-semibold">Organização | Produtividade | Foco</h1>
        <p className="mt-1 text-sm text-tinta-suave">
          {mesAtual} de {agora.getFullYear()}
        </p>
      </header>

      {bancoIndisponivel ? (
        <Aviso titulo="Banco não disponível">
          Não consegui ler o Postgres. Confira o <code>DATABASE_URL</code> no{' '}
          <code>.env</code> e rode <code>npm run db:migrate</code>. Os números
          abaixo estão zerados.
        </Aviso>
      ) : null}

      <Secao titulo={`Financeiro — ${mesAtual}`} acao={{ href: '/financeiro', rotulo: 'Abrir' }}>
        <Grade>
          <Cartao rotulo="Receitas do mês" valor={formatarBRL(financeiro.receitasDoMes)} tom="ok" />
          <Cartao
            rotulo="Despesas do mês"
            valor={formatarBRL(financeiro.despesasDoMes)}
            tom="erro"
          />
          <Cartao
            rotulo="Lucro do mês"
            valor={formatarBRL(financeiro.lucroDoMes)}
            tom={financeiro.lucroDoMes >= 0 ? 'ok' : 'erro'}
            detalhe={
              financeiro.metaDeLucro > 0
                ? `Meta: ${formatarBRL(financeiro.metaDeLucro)}`
                : 'Sem meta definida'
            }
          />
          <Cartao
            rotulo="Lucro do ano"
            valor={formatarBRL(financeiro.lucroDoAno)}
            tom={financeiro.lucroDoAno >= 0 ? 'ok' : 'erro'}
          />
        </Grade>
        {financeiro.metaDeLucro > 0 ? (
          <div className="mt-4 max-w-md">
            <Barra valor={financeiro.progresso} rotulo="Progresso da meta de lucro" />
          </div>
        ) : null}
      </Secao>

      <Secao titulo="Comercial" acao={{ href: '/leads', rotulo: 'Ver funil' }}>
        <Grade>
          <Cartao
            rotulo="Clientes ativos"
            valor={String(clientes.ativos)}
            detalhe={`${clientes.total} no total`}
            href="/clientes"
          />
          <Cartao
            rotulo="Leads abertos"
            valor={String(leads.abertos)}
            detalhe={`${formatarBRL(leads.valorEmAberto)} em aberto`}
            href="/leads"
          />
          <Cartao
            rotulo="Ganhos no mês"
            valor={String(leads.ganhosNoMes)}
            tom={leads.ganhosNoMes > 0 ? 'ok' : 'neutro'}
          />
          <Cartao
            rotulo="Faturas a vencer"
            valor={String(faturas.venceEsteMes)}
            tom={faturas.venceEsteMes > 0 ? 'alerta' : 'neutro'}
            detalhe={`${faturas.pagas}/${faturas.total} pagas`}
          />
        </Grade>
      </Secao>

      <Secao titulo="Execução" acao={{ href: '/tarefas', rotulo: 'Ver tarefas' }}>
        <Grade>
          <Cartao
            rotulo="Tarefas pendentes"
            valor={String(tarefas.pendentes)}
            href="/tarefas"
          />
          <Cartao
            rotulo="Tarefas vencidas"
            valor={String(tarefas.vencidas)}
            tom={tarefas.vencidas > 0 ? 'erro' : 'ok'}
            href="/tarefas"
          />
          <Cartao
            rotulo="Concluídas na semana"
            valor={String(tarefas.concluidasNaSemana)}
            tom="ok"
          />
          <Cartao
            rotulo="Projetos em andamento"
            valor={String(projetos.emAndamento)}
            detalhe={`${projetos.finalizados} finalizados`}
            href="/projetos"
          />
        </Grade>
      </Secao>

      <Secao titulo="Rotina" acao={{ href: '/planner', rotulo: 'Abrir planner' }}>
        <Grade>
          <Cartao
            rotulo="Planejamento de hoje"
            valor={planner.hojePlanejado ? 'Feito' : 'Pendente'}
            tom={planner.hojePlanejado ? 'ok' : 'alerta'}
            href="/planner"
          />
          <Cartao
            rotulo="Planejamento da semana"
            valor={planner.semanaPlanejada ? 'Feito' : 'Pendente'}
            tom={planner.semanaPlanejada ? 'ok' : 'alerta'}
            href="/planner"
          />
          <Cartao
            rotulo="Hábitos de hoje"
            valor={`${habitos.feitosHoje}/${habitos.totalAtivos}`}
            tom={
              habitos.totalAtivos > 0 && habitos.feitosHoje === habitos.totalAtivos
                ? 'ok'
                : 'neutro'
            }
            href="/habitos"
          />
          <Cartao
            rotulo="Reuniões no mês"
            valor={String(resumo.reunioes.proximasNoMes)}
            detalhe="ainda por vir"
          />
        </Grade>
      </Secao>

      <Secao titulo="Conteúdo e portfólio">
        <Grade>
          <Cartao rotulo="Publicados no mês" valor={String(resumo.conteudo.publicadosNoMes)} />
          <Cartao
            rotulo="Agendados na semana"
            valor={String(resumo.conteudo.agendadosNaSemana)}
          />
          <Cartao
            rotulo="Portfólio publicado"
            valor={String(resumo.portfolio.publicados)}
            detalhe={`${resumo.portfolio.total} projetos`}
          />
          <Cartao
            rotulo="Metas alcançadas"
            valor={`${resumo.metas.alcancadas}/${resumo.metas.total}`}
            tom={resumo.metas.vencidas > 0 ? 'alerta' : 'neutro'}
            detalhe={resumo.metas.vencidas > 0 ? `${resumo.metas.vencidas} vencidas` : undefined}
          />
        </Grade>
      </Secao>

      {resumo.setup.total > 0 ? (
        <Secao titulo="Setup do negócio">
          <div className="max-w-md rounded-xl border border-borda bg-painel p-5">
            <Barra
              valor={resumo.setup.progresso}
              rotulo={`${resumo.setup.feitas} de ${resumo.setup.total} etapas`}
            />
          </div>
        </Secao>
      ) : null}
    </>
  )
}
