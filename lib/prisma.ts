import { Prisma, PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export const PROMPT_INCLUDES = {
  categories: {
    include: {
      category: true,
    },
  },
  tags: {
    include: {
      tag: true,
    },
  },
  platforms: {
    include: {
      platform: true,
    },
  },
  clientProjects: {
    include: {
      clientProject: true,
    },
  },
  useCases: {
    include: {
      useCase: true,
    },
  },
  modelHints: {
    include: {
      modelHint: true,
    },
  },
} satisfies Prisma.PromptInclude


