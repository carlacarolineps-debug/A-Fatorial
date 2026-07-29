import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'

export const metadata: Metadata = {
  title: 'Grupo A! — Organização | Produtividade | Foco',
  description: 'Sistema interno do Grupo A! Fatorial.',
}

const NAVEGACAO = [
  { href: '/', rotulo: 'Início' },
  { href: '/clientes', rotulo: 'Clientes' },
  { href: '/leads', rotulo: 'Leads' },
  { href: '/projetos', rotulo: 'Projetos' },
  { href: '/tarefas', rotulo: 'Tarefas' },
  { href: '/financeiro', rotulo: 'Financeiro' },
  { href: '/planner', rotulo: 'Planner' },
  { href: '/habitos', rotulo: 'Hábitos' },
] as const

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen">
        <div className="flex min-h-screen flex-col lg:flex-row">
          <aside className="border-b border-borda bg-painel lg:w-64 lg:shrink-0 lg:border-r lg:border-b-0">
            <div className="flex items-center gap-3 px-5 py-6">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-ouro font-bold text-black">
                A!
              </span>
              <span>
                <span className="block text-sm font-semibold">Grupo A!</span>
                <span className="block text-[10px] uppercase tracking-widest text-tinta-fraca">
                  Fatorial
                </span>
              </span>
            </div>
            <nav className="flex flex-wrap gap-1 px-3 pb-4 lg:flex-col">
              {NAVEGACAO.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-3 py-2 text-sm text-tinta-suave transition-colors hover:bg-white/5 hover:text-tinta"
                >
                  {item.rotulo}
                </Link>
              ))}
            </nav>
          </aside>
          <main className="flex-1 px-5 py-8 lg:px-10">{children}</main>
        </div>
      </body>
    </html>
  )
}
