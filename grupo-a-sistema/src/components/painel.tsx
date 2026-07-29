import Link from 'next/link'

export function Secao({
  titulo,
  acao,
  children,
}: {
  titulo: string
  acao?: { href: string; rotulo: string }
  children: React.ReactNode
}) {
  return (
    <section className="mb-10">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-tinta-fraca">
          {titulo}
        </h2>
        {acao ? (
          <Link href={acao.href} className="text-xs text-ouro hover:text-ouro-claro">
            {acao.rotulo} →
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  )
}

export function Grade({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">{children}</div>
  )
}

export function Cartao({
  rotulo,
  valor,
  detalhe,
  tom = 'neutro',
  href,
}: {
  rotulo: string
  valor: string
  detalhe?: string
  tom?: 'neutro' | 'ok' | 'alerta' | 'erro'
  href?: string
}) {
  const cor = {
    neutro: 'text-tinta',
    ok: 'text-ok',
    alerta: 'text-alerta',
    erro: 'text-erro',
  }[tom]

  const conteudo = (
    <>
      <div className="text-[11px] uppercase tracking-wider text-tinta-fraca">{rotulo}</div>
      <div className={`mt-2 text-2xl font-semibold tabular-nums ${cor}`}>{valor}</div>
      {detalhe ? <div className="mt-1 text-xs text-tinta-suave">{detalhe}</div> : null}
    </>
  )

  const classe =
    'rounded-xl border border-borda bg-painel p-4 transition-colors' +
    (href ? ' hover:border-ouro/40' : '')

  return href ? (
    <Link href={href} className={classe}>
      {conteudo}
    </Link>
  ) : (
    <div className={classe}>{conteudo}</div>
  )
}

export function Barra({ valor, rotulo }: { valor: number; rotulo?: string }) {
  const pct = Math.min(100, Math.max(0, Math.round(valor * 100)))
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-tinta-suave">
        <span>{rotulo}</span>
        <span className="tabular-nums">{pct}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full bg-linear-to-r from-ouro-fundo to-ouro-claro"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

export function Aviso({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="mb-8 rounded-xl border border-alerta/30 bg-alerta/5 p-5">
      <div className="mb-1 text-sm font-semibold text-alerta">{titulo}</div>
      <div className="text-sm text-tinta-suave">{children}</div>
    </div>
  )
}
