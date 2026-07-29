import { PrismaClient } from '@prisma/client'

// Em dev o Next recarrega o módulo a cada mudança; sem o singleton o Postgres
// esgota as conexões depois de alguns hot reloads.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
