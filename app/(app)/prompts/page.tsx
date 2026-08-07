import { PromptsPageContent, type TransformedPrompt } from "@/components/prompt/PromptsPageContent"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { auth } from "@/lib/auth"
import { ViewToggle } from "@/components/prompt/ViewToggle"
import { ViewModeProvider } from "@/contexts/ViewModeContext"
import { getTranslations } from "next-intl/server"

export const dynamic = 'force-dynamic'

async function getPrompts(searchParams: {
  search?: string
  categoryId?: string
  categoryIds?: string[]
  tagIds?: string[]
  platform?: string
  platformIds?: string[]
  status?: string | string[]
  type?: string | string[]
  isFavorite?: string
  language?: string | string[]
  clientProjectIds?: string[]
  useCaseIds?: string[]
}, userId: string) {
  // Isolation: each user only sees their own prompts (Fase D)
  const where: Prisma.PromptWhereInput = { userId }

  if (searchParams.search) {
    const searchWords = searchParams.search.trim().split(/\s+/).filter((word) => word.length > 0)

    if (searchWords.length > 0) {
      where.AND = searchWords.map((word) => ({
        OR: [
          { title: { contains: word, mode: "insensitive" } },
          { description: { contains: word, mode: "insensitive" } },
          { body: { contains: word, mode: "insensitive" } },
          { prePrompt: { contains: word, mode: "insensitive" } },
          { manualDeUso: { contains: word, mode: "insensitive" } },
        ],
      }))
    }
  }

  // Build AND conditions for N:M filters (each selected value must match)
  const andConditions: Prisma.PromptWhereInput[] = []

  if (searchParams.categoryIds && searchParams.categoryIds.length > 0) {
    for (const catId of searchParams.categoryIds) {
      andConditions.push({
        categories: { some: { categoryId: catId } },
      })
    }
  } else if (searchParams.categoryId) {
    andConditions.push({
      categories: { some: { categoryId: searchParams.categoryId } },
    })
  }

  if (searchParams.platformIds && searchParams.platformIds.length > 0) {
    for (const platId of searchParams.platformIds) {
      andConditions.push({
        platforms: { some: { platformId: platId } },
      })
    }
  } else if (searchParams.platform) {
    where.platform = searchParams.platform
  }

  if (searchParams.tagIds && searchParams.tagIds.length > 0) {
    for (const tagId of searchParams.tagIds) {
      andConditions.push({
        tags: { some: { tagId: tagId } },
      })
    }
  }

  if (searchParams.clientProjectIds && searchParams.clientProjectIds.length > 0) {
    for (const cpId of searchParams.clientProjectIds) {
      andConditions.push({
        clientProjects: { some: { clientProjectId: cpId } },
      })
    }
  }

  if (searchParams.useCaseIds && searchParams.useCaseIds.length > 0) {
    for (const ucId of searchParams.useCaseIds) {
      andConditions.push({
        useCases: { some: { useCaseId: ucId } },
      })
    }
  }

  // Merge AND conditions with existing search where.AND
  if (andConditions.length > 0) {
    if (where.AND) {
      where.AND = [...(Array.isArray(where.AND) ? where.AND : [where.AND]), ...andConditions]
    } else {
      where.AND = andConditions
    }
  }

  if (searchParams.status) {
    const statuses = Array.isArray(searchParams.status) ? searchParams.status : [searchParams.status]
    if (statuses.length > 0) {
      where.status = {
        in: statuses,
      }
    }
  }

  if (searchParams.type) {
    const types = Array.isArray(searchParams.type) ? searchParams.type : [searchParams.type]
    if (types.length > 0) {
      where.type = {
        in: types,
      }
    }
  }

  if (searchParams.isFavorite !== undefined && searchParams.isFavorite !== null) {
    where.isFavorite = searchParams.isFavorite === "true"
  }

  if (searchParams.language) {
    const languages = Array.isArray(searchParams.language) ? searchParams.language : [searchParams.language]
    if (languages.length > 0) {
      where.language = {
        in: languages,
      }
    }
  }

    const prompts = await prisma.prompt.findMany({
      where,
      include: {
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
      },
      orderBy: {
        updatedAt: "desc",
      },
    })

    const transformedPrompts = prompts.map((prompt) => {
      const result: TransformedPrompt = {
        id: prompt.id,
        title: prompt.title,
        description: prompt.description,
        body: prompt.body,
        type: prompt.type,
        platform: prompt.platform ?? "",
        modelHint: prompt.modelHint,
        language: prompt.language,
        useCase: prompt.useCase,
        clientOrProject: prompt.clientOrProject,
        status: prompt.status,
        isFavorite: prompt.isFavorite,
        version: prompt.version,
        changelog: prompt.changelog,
        notes: prompt.notes,
        usageCount: prompt.usageCount,
        lastUsedAt: prompt.lastUsedAt ? prompt.lastUsedAt.toISOString() : null,
        category: null,
        categories: prompt.categories.map((pc) => ({
          category: {
            id: pc.category.id,
            name: pc.category.name,
            slug: pc.category.slug,
          },
        })),
        tags: prompt.tags.map((pt) => ({
          tag: {
            id: pt.tag.id,
            name: pt.tag.name,
            slug: pt.tag.slug,
          },
        })),
        platforms: prompt.platforms.map((pp) => ({
          platform: {
            id: pp.platform.id,
            name: pp.platform.name,
            slug: pp.platform.slug,
          },
        })),
        clientProjects: prompt.clientProjects.map((cp) => ({
          clientProject: {
            id: cp.clientProject.id,
            name: cp.clientProject.name,
            slug: cp.clientProject.slug,
          },
        })),
        useCases: prompt.useCases.map((pu) => ({
          useCase: {
            id: pu.useCase.id,
            name: pu.useCase.name,
            slug: pu.useCase.slug,
          },
        })),
        user: null,
        createdAt: prompt.createdAt.toISOString(),
        updatedAt: prompt.updatedAt.toISOString(),
      }
      return result
    })

    return { items: transformedPrompts, total: transformedPrompts.length }
}

async function getCategories(userId: string) {
  const categories = await prisma.category.findMany({
    include: {
      parent: true,
      children: true,
      _count: {
        select: {
          // Filtered relation count: only count prompts owned by this user
          prompts: {
            where: { prompt: { userId } },
          },
        },
      },
    },
    orderBy: [
      { sortOrder: "asc" },
      { name: "asc" },
    ],
  })

  return categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    parentId: cat.parentId,
    sortOrder: cat.sortOrder,
    parent: cat.parent ? {
      id: cat.parent.id,
      name: cat.parent.name,
      slug: cat.parent.slug,
      parentId: cat.parent.parentId,
      sortOrder: cat.parent.sortOrder,
    } : null,
    children: cat.children.map((child) => ({
      id: child.id,
      name: child.name,
      slug: child.slug,
      parentId: child.parentId,
      sortOrder: child.sortOrder,
    })),
    _count: cat._count,
  }))
}

async function getTags(userId: string) {
  const tags = await prisma.tag.findMany({
    include: {
      _count: {
        select: {
          // Filtered relation count: only count prompts owned by this user
          prompts: {
            where: { prompt: { userId } },
          },
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  })

  return tags.map((tag) => ({
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
    _count: tag._count,
  }))
}

async function getPlatforms() {
  const platforms = await prisma.platform.findMany({
    orderBy: { name: "asc" },
  })

  return platforms.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
  }))
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
    // Catalog unavailable → empty array; the filters fall back to fixed values.
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
    // Catalog unavailable → empty array; the filters fall back to fixed values.
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
    // Catalog unavailable → empty array; the filters fall back to fixed values.
    return []
  }
}

async function getClientProjects() {
  const clientProjects = await prisma.clientProject.findMany({
    orderBy: { name: "asc" },
  })

  return clientProjects.map((cp) => ({
    id: cp.id,
    name: cp.name,
    slug: cp.slug,
  }))
}

async function getUseCases() {
  const useCases = await prisma.useCase.findMany({
    orderBy: { name: "asc" },
  })

  return useCases.map((uc) => ({
    id: uc.id,
    name: uc.name,
    slug: uc.slug,
  }))
}

async function getUserViewPreference(userId?: string): Promise<"cards" | "list"> {
  if (!userId) return "cards"
  
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      promptListViewPreference: true,
    },
  })
  
  return (user?.promptListViewPreference as "cards" | "list") || "cards"
}

export default async function PromptsPage({
  searchParams,
}: {
  searchParams: {
    search?: string
    categoryId?: string
    categoryIds?: string | string[]
    tagIds?: string | string[]
    platform?: string
    platformIds?: string | string[]
    status?: string | string[]
    type?: string | string[]
    isFavorite?: string
    language?: string | string[]
    clientProjectIds?: string | string[]
    useCaseIds?: string | string[]
  }
}) {
  const session = await auth()
  // Isolation: empty string (no session) returns 0 prompts — safe by design
  const userId = session?.user?.id ?? ""
  const t = await getTranslations("PromptsPage")
  
  const tagIds = Array.isArray(searchParams.tagIds)
    ? searchParams.tagIds
    : searchParams.tagIds
    ? [searchParams.tagIds]
    : []

  const categoryIds = Array.isArray(searchParams.categoryIds)
    ? searchParams.categoryIds
    : searchParams.categoryIds
    ? [searchParams.categoryIds]
    : []

  const platformIds = Array.isArray(searchParams.platformIds)
    ? searchParams.platformIds
    : searchParams.platformIds
    ? [searchParams.platformIds]
    : []

  const clientProjectIds = Array.isArray(searchParams.clientProjectIds)
    ? searchParams.clientProjectIds
    : searchParams.clientProjectIds
    ? [searchParams.clientProjectIds]
    : []

  const useCaseIds = Array.isArray(searchParams.useCaseIds)
    ? searchParams.useCaseIds
    : searchParams.useCaseIds
    ? [searchParams.useCaseIds]
    : []

  const status = Array.isArray(searchParams.status)
    ? searchParams.status
    : searchParams.status
    ? [searchParams.status]
    : []

  const language = Array.isArray(searchParams.language)
    ? searchParams.language
    : searchParams.language
    ? [searchParams.language]
    : []

  const [prompts, categories, tags, platforms, clients, useCases, viewMode, catalogTypes, catalogStatuses, catalogLanguages] = await Promise.all([
    getPrompts({ ...searchParams, tagIds, categoryIds, platformIds, clientProjectIds, useCaseIds }, userId),
    getCategories(userId),
    getTags(userId),
    getPlatforms(),
    getClientProjects(),
    getUseCases(),
    getUserViewPreference(userId),
    getCatalogTypes(),
    getCatalogStatuses(),
    getCatalogLanguages(),
  ])

  return (
    <ViewModeProvider initialViewMode={viewMode}>
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-[var(--accent-color)] to-pink-500 bg-clip-text text-transparent">
            {t("title")}
          </h1>
          <ViewToggle />
        </div>
        <p className="text-muted-foreground font-medium">
          {t("promptsFound", { count: prompts.total })}
        </p>
      </div>
      <PromptsPageContent
        prompts={prompts.items}
        categories={categories}
        tags={tags}
        platforms={platforms}
        clients={clients}
        useCases={useCases}
        optionsType={catalogTypes}
        optionsStatus={catalogStatuses}
        optionsLanguage={catalogLanguages}
        initialFilters={{ ...searchParams, categoryIds, platformIds, clientProjectIds, useCaseIds, status, language }}
      />
    </ViewModeProvider>
  )
}
