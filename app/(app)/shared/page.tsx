import { redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { Prisma } from "@prisma/client"
import { prisma, PROMPT_INCLUDES } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { SharedList, type SharedPrompt } from "@/components/shared/SharedList"

export const dynamic = "force-dynamic"

// Shared prompts by OTHER users only (own prompts are hidden from this
// section). Search splits into words and requires ALL words to match
// (same AND logic as the prompts page and GET /api/shared/prompts).
async function getSharedPrompts(search: string | undefined, userId: string) {
  const where: Prisma.PromptWhereInput = {
    isShared: true,
    userId: { not: userId },
  }

  if (search) {
    const searchWords = search.trim().split(/\s+/).filter((word) => word.length > 0)

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

  const prompts = await prisma.prompt.findMany({
    where,
    include: PROMPT_INCLUDES,
    orderBy: {
      updatedAt: "desc",
    },
  })

  // Transform to the lean shape consumed by the SharedList client component.
  const items: SharedPrompt[] = prompts.map((prompt) => ({
    id: prompt.id,
    title: prompt.title,
    description: prompt.description,
    type: prompt.type,
    status: prompt.status,
    language: prompt.language,
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
    useCase: prompt.useCase,
  }))

  return items
}

export default async function SharedPage({
  searchParams,
}: {
  searchParams: { search?: string }
}) {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/auth/signin")
  }

  const t = await getTranslations("SharedPage")
  const prompts = await getSharedPrompts(searchParams.search, session.user.id)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-[var(--accent-color)] to-pink-500 bg-clip-text text-transparent">
          {t("title")}
        </h1>
        <p className="text-muted-foreground font-medium">{t("subtitle")}</p>
        <p className="text-sm text-muted-foreground">{t("readOnlyNote")}</p>
      </div>
      <SharedList prompts={prompts} initialSearch={searchParams.search ?? ""} />
    </div>
  )
}
