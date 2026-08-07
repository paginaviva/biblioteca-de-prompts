import { PromptForm } from "@/components/prompt/PromptForm"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

export const dynamic = 'force-dynamic'

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

export default async function NewPromptPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/auth/signin")
  }

  const [categories, tags, platforms, clientProjects, useCases, modelHints, catalogTypes, catalogStatuses, catalogLanguages] = await Promise.all([
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

  return <PromptForm categories={categories} tags={tags} platforms={platforms} clientProjects={clientProjects} useCases={useCases} modelHints={modelHints} optionsType={catalogTypes} optionsStatus={catalogStatuses} optionsLanguage={catalogLanguages} />
}
