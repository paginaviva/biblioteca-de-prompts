import { PromptForm } from "@/components/prompt/PromptForm"
import { notFound, redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export const dynamic = 'force-dynamic'

const PROMPT_INCLUDES = {
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
} as const

// Only the owner can see a prompt, plus shared prompts of other users
// (read-only). Mirrors the GET /api/prompts/[id] access rule; anything
// else returns null so the page renders 404 (no existence oracle).
async function getPrompt(id: string, userId: string) {
  let prompt = await prisma.prompt.findUnique({
    where: { id, userId },
    include: PROMPT_INCLUDES,
  })

  if (!prompt) {
    prompt = await prisma.prompt.findUnique({
      where: { id, isShared: true },
      include: PROMPT_INCLUDES,
    })
  }

  return prompt
}

async function getCategories() {
  const categories = await prisma.category.findMany({
    include: {
      parent: true,
    },
    orderBy: [
      { sortOrder: "asc" },
      { name: "asc" },
    ],
  })

  return categories
}

async function getTags() {
  const tags = await prisma.tag.findMany({
    orderBy: {
      name: "asc",
    },
  })

  return tags
}

async function getPlatforms() {
  const platforms = await prisma.platform.findMany({
    orderBy: {
      name: "asc",
    },
  })

  return platforms
}

async function getClientProjects() {
  const clientProjects = await prisma.clientProject.findMany({
    orderBy: {
      name: "asc",
    },
  })

  return clientProjects
}

async function getUseCases() {
  const useCases = await prisma.useCase.findMany({
    orderBy: {
      name: "asc",
    },
  })

  return useCases
}

async function getModelHints() {
  const modelHints = await prisma.modelHint.findMany({
    orderBy: {
      name: "asc",
    },
  })

  return modelHints
}

async function getCatalogTypes(): Promise<Array<{ name: string; slug: string }>> {
  try {
    const types = await prisma.type.findMany({
      orderBy: { sortOrder: "asc" },
    })

    return types.map((type) => ({
      name: type.name,
      slug: type.slug,
    }))
  } catch {
    // Catalog unavailable → empty array; MetadataSegment falls back to fixed values.
    return []
  }
}

async function getCatalogStatuses(): Promise<Array<{ name: string; slug: string }>> {
  try {
    const statuses = await prisma.status.findMany({
      orderBy: { sortOrder: "asc" },
    })

    return statuses.map((status) => ({
      name: status.name,
      slug: status.slug,
    }))
  } catch {
    // Catalog unavailable → empty array; MetadataSegment falls back to fixed values.
    return []
  }
}

async function getCatalogLanguages(): Promise<Array<{ name: string; slug: string }>> {
  try {
    const languages = await prisma.language.findMany({
      orderBy: { sortOrder: "asc" },
    })

    return languages.map((language) => ({
      name: language.name,
      slug: language.slug,
    }))
  } catch {
    // Catalog unavailable → empty array; MetadataSegment falls back to fixed values.
    return []
  }
}

export default async function PromptDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await auth()

  if (!session?.user?.id) {
    notFound()
  }

  const [prompt, categories, tags, platforms, clientProjects, useCases, modelHints, catalogTypes, catalogStatuses, catalogLanguages] = await Promise.all([
    getPrompt(params.id, session.user.id),
    getCategories(),
    getTags(),
    getPlatforms(),
    getClientProjects(),
    getUseCases(),
    getModelHints(),
    getCatalogTypes(),
    getCatalogStatuses(),
    getCatalogLanguages(),
  ])

  if (!prompt) {
    notFound()
  }

  // A shared prompt owned by someone else is read-only: show it through the
  // dedicated shared detail page (no edit form, no favorite).
  if (prompt.userId !== session.user.id) {
    redirect(`/shared/${params.id}`)
  }

  // Serialize dates to ISO strings for client component
  const serializedPrompt = {
    ...prompt,
    createdAt: prompt.createdAt.toISOString(),
    updatedAt: prompt.updatedAt.toISOString(),
  }

  return <PromptForm prompt={serializedPrompt} categories={categories} tags={tags} platforms={platforms} clientProjects={clientProjects} useCases={useCases} modelHints={modelHints} optionsType={catalogTypes} optionsStatus={catalogStatuses} optionsLanguage={catalogLanguages} />
}
