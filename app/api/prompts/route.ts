import { NextRequest, NextResponse } from "next/server"
import { prisma, PROMPT_INCLUDES } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { enrichWithParentCategories } from "@/lib/category-utils"
import { getTranslations } from "next-intl/server"
import { getLocaleFromRequest } from "@/lib/locale"

const createPromptSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  body: z.string().min(1),
  type: z.enum(["SYSTEM", "USER", "TOOL"]),
  platform: z.enum(["CHATGPT", "CURSOR", "MIDJOURNEY", "SUNO", "OTHER"]).optional(),
  platformIds: z.array(z.string()).optional(),
  modelHint: z.string().optional(),
  modelHintIds: z.array(z.string()).optional(),
  language: z.enum(["en", "es", "nl", "fr", "de", "pt", "it", "catalán/valenciano", "vasco", "gallego"]).default("es"),
  useCase: z.string().optional(),
  useCaseIds: z.array(z.string()).optional(),
  clientOrProject: z.string().optional(),
  clientProjectIds: z.array(z.string()).optional(),
  status: z.enum(["DRAFT", "TESTED", "PRODUCTION"]).default("DRAFT"),
  isFavorite: z.boolean().default(false),
  isShared: z.boolean().optional(),
  version: z.number().default(1),
  changelog: z.string().optional(),
  notes: z.string().optional(),
  prePrompt: z.string().optional(),
  manualDeUso: z.string().optional(),
  categoryId: z.string().optional(),
  categoryIds: z.array(z.string()).optional(),
  tagIds: z.array(z.string()).optional(),
})

export async function GET(request: NextRequest) {
  const locale = getLocaleFromRequest(request)
  const t = await getTranslations({ locale, namespace: "Api" })

  try {
    // Auth check as FIRST operation (Fase D isolation)
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: t("unauthorized") },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get("search")
    const categoryId = searchParams.get("categoryId")
    const categoryIds = searchParams.getAll("categoryIds")
    const tagIds = searchParams.getAll("tagIds")
    const platform = searchParams.get("platform")
    const platformIds = searchParams.getAll("platformIds")
    const statuses = searchParams.getAll("status")
    const isFavorite = searchParams.get("isFavorite")
    const languages = searchParams.getAll("language")
    const clientProjectIds = searchParams.getAll("clientProjectIds")
    const useCaseIds = searchParams.getAll("useCaseIds")

    // Isolation: each user only sees their own prompts (admin included)
    const where: Prisma.PromptWhereInput = { userId: session.user.id }

    if (search) {
      // Split search into individual words and require ALL words to match (AND logic)
      const searchWords = search.trim().split(/\s+/).filter(word => word.length > 0)
      
      if (searchWords.length > 0) {
        // For each word, create conditions that check all fields
        // All words must match (AND logic)
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

    if (categoryIds && categoryIds.length > 0) {
      for (const catId of categoryIds) {
        andConditions.push({
          categories: { some: { categoryId: catId } },
        })
      }
    } else if (categoryId) {
      andConditions.push({
        categories: { some: { categoryId: categoryId } },
      })
    }

    if (platformIds && platformIds.length > 0) {
      for (const platId of platformIds) {
        andConditions.push({
          platforms: { some: { platformId: platId } },
        })
      }
    } else if (platform) {
      where.platform = platform
    }

    if (tagIds && tagIds.length > 0) {
      for (const tagId of tagIds) {
        andConditions.push({
          tags: { some: { tagId: tagId } },
        })
      }
    }

    if (clientProjectIds && clientProjectIds.length > 0) {
      for (const cpId of clientProjectIds) {
        andConditions.push({
          clientProjects: { some: { clientProjectId: cpId } },
        })
      }
    }

    if (useCaseIds && useCaseIds.length > 0) {
      for (const ucId of useCaseIds) {
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

    if (statuses && statuses.length > 0) {
      where.status = {
        in: statuses,
      }
    }

    if (isFavorite !== null && isFavorite !== undefined) {
      where.isFavorite = isFavorite === "true"
    }

    if (languages && languages.length > 0) {
      where.language = {
        in: languages,
      }
    }

    const prompts = await prisma.prompt.findMany({
      where,
      include: PROMPT_INCLUDES,
      orderBy: {
        updatedAt: "desc",
      },
    })

    return NextResponse.json({ items: prompts, total: prompts.length })
  } catch (error) {
    console.error("Error fetching prompts:", error)
    return NextResponse.json(
      { error: t("failedToFetchPrompts") },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const locale = getLocaleFromRequest(request)
  const t = await getTranslations({ locale, namespace: "Api" })

  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: t("unauthorized") },
        { status: 401 }
      )
    }

    const body = await request.json()
    const data = createPromptSchema.parse(body)

    const { tagIds, categoryIds, platformIds, clientProjectIds, useCaseIds, modelHintIds, ...promptData } = data

    // Auto-add parent categories when a child is selected without its parent
    const enrichedCategoryIds = await enrichWithParentCategories(categoryIds)

    const prompt = await prisma.prompt.create({
      data: {
        ...promptData,
        userId: session.user.id,
        tags: tagIds?.length
          ? {
              create: tagIds.map((tagId) => ({
                tagId,
              })),
            }
          : undefined,
        categories: enrichedCategoryIds?.length
          ? {
              create: enrichedCategoryIds.map((categoryId) => ({
                categoryId,
              })),
            }
          : undefined,
        platforms: platformIds?.length
          ? {
              create: platformIds.map((platformId) => ({
                platformId,
              })),
            }
          : undefined,
        clientProjects: clientProjectIds?.length
          ? {
              create: clientProjectIds.map((clientProjectId) => ({
                clientProjectId,
              })),
            }
          : undefined,
        useCases: useCaseIds?.length
          ? {
              create: useCaseIds.map((useCaseId) => ({
                useCaseId,
              })),
            }
          : undefined,
        modelHints: modelHintIds?.length
          ? {
              create: modelHintIds.map((modelHintId) => ({
                modelHintId,
              })),
            }
          : undefined,
      },
      include: {
        ...PROMPT_INCLUDES,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        }
      },
    })

    return NextResponse.json({ data: prompt, success: true }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: t("invalidInput"), details: error.errors },
        { status: 400 }
      )
    }
    console.error("Error creating prompt:", error)
    return NextResponse.json(
      { error: t("failedToCreatePrompt") },
      { status: 500 }
    )
  }
}

