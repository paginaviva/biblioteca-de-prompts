import { NextRequest, NextResponse } from "next/server"
import { prisma, PROMPT_INCLUDES } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { enrichWithParentCategories } from "@/lib/category-utils"
import { getTranslations } from "next-intl/server"
import { getLocaleFromRequest } from "@/lib/locale"

const updatePromptSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  body: z.string().min(1).optional(),
  type: z.enum(["SYSTEM", "USER", "TOOL"]).optional(),
  platform: z.enum(["CHATGPT", "CURSOR", "MIDJOURNEY", "SUNO", "OTHER"]).optional(),
  platformIds: z.array(z.string()).optional(),
  modelHint: z.string().optional(),
  modelHintIds: z.array(z.string()).optional(),
  language: z.enum(["en", "es", "nl", "fr", "de", "pt", "it", "catalán/valenciano", "vasco", "gallego"]).optional(),
  useCase: z.string().optional(),
  useCaseIds: z.array(z.string()).optional(),
  clientOrProject: z.string().optional(),
  clientProjectIds: z.array(z.string()).optional(),
  status: z.enum(["DRAFT", "TESTED", "PRODUCTION"]).optional(),
  isFavorite: z.boolean().optional(),
  isShared: z.boolean().optional(),
  version: z.number().optional(),
  changelog: z.string().optional(),
  notes: z.string().optional(),
  prePrompt: z.string().optional(),
  manualDeUso: z.string().optional(),
  categoryId: z.string().nullable().optional(),
  categoryIds: z.array(z.string()).optional(),
  tagIds: z.array(z.string()).optional(),
})

type OwnershipResult =
  | { authorized: true }
  | { authorized: false; errorKey: "promptNotFound" | "forbidden"; status: 404 | 403 }

// Helper function to check ownership. Per the product decision (Fase D),
// EVERY user — including admins — can only modify their own prompts.
// Returns 404 (not 403) so the API never reveals whether another user's
// prompt exists.
async function checkOwnership(
  promptId: string,
  userId: string
): Promise<OwnershipResult> {
  const prompt = await prisma.prompt.findUnique({
    where: { id: promptId },
    select: { userId: true }
  })

  if (!prompt || prompt.userId !== userId) {
    return { authorized: false, errorKey: "promptNotFound", status: 404 }
  }

  return { authorized: true }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Ownership filter: each user (admin included) can only fetch their own prompts.
    // Returns 404 (not 403) to avoid revealing the existence of other users' prompts.
    let prompt = await prisma.prompt.findUnique({
      where: { id: params.id, userId: session.user.id },
      include: PROMPT_INCLUDES,
    })

    // Shared prompts by OTHER users are readable (read-only access). The
    // PUT/DELETE handlers still enforce ownership via checkOwnership.
    if (!prompt) {
      prompt = await prisma.prompt.findUnique({
        where: { id: params.id, isShared: true },
        include: PROMPT_INCLUDES,
      })
    }

    if (!prompt) {
      return NextResponse.json({ error: t("promptNotFound") }, { status: 404 })
    }

    return NextResponse.json({ data: prompt, success: true })
  } catch (error) {
    console.error("Error fetching prompt:", error)
    return NextResponse.json(
      { error: t("failedToFetchPrompt") },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const locale = getLocaleFromRequest(request)
  const t = await getTranslations({ locale, namespace: "Api" })

  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: t("unauthorized") },
        { status: 401 }
      )
    }

    const ownership = await checkOwnership(
      params.id,
      session.user.id
    )

    if (!ownership.authorized) {
      return NextResponse.json(
        { error: t(ownership.errorKey) },
        { status: ownership.status }
      )
    }

    const body = await request.json()
    const data = updatePromptSchema.parse(body)

    const { tagIds, categoryIds, platformIds, clientProjectIds, useCaseIds, modelHintIds, ...promptData } = data

    // Auto-add parent categories when a child is selected without its parent
    const enrichedCategoryIds = await enrichWithParentCategories(categoryIds)

    // Use explicit transaction for atomic update of all relations (D-07)
    const prompt = await prisma.$transaction(async (tx) => {
      // Delete existing relations for all N:M tables
      await tx.promptTag.deleteMany({ where: { promptId: params.id } })
      await tx.promptCategory.deleteMany({ where: { promptId: params.id } })
      await tx.promptPlatform.deleteMany({ where: { promptId: params.id } })
      await tx.promptClientProject.deleteMany({ where: { promptId: params.id } })
      await tx.promptUseCase.deleteMany({ where: { promptId: params.id } })
      await tx.promptModelHint.deleteMany({ where: { promptId: params.id } })

      // Update prompt and create new relations
      return await tx.prompt.update({
        where: { id: params.id },
        data: {
          ...promptData,
          tags: tagIds?.length
            ? {
                create: tagIds.map((tagId) => ({ tagId })),
              }
            : undefined,
          categories: enrichedCategoryIds?.length
            ? {
                create: enrichedCategoryIds.map((categoryId) => ({ categoryId })),
              }
            : undefined,
          platforms: platformIds?.length
            ? {
                create: platformIds.map((platformId) => ({ platformId })),
              }
            : undefined,
          clientProjects: clientProjectIds?.length
            ? {
                create: clientProjectIds.map((clientProjectId) => ({ clientProjectId })),
              }
            : undefined,
          useCases: useCaseIds?.length
            ? {
                create: useCaseIds.map((useCaseId) => ({ useCaseId })),
              }
            : undefined,
          modelHints: modelHintIds?.length
            ? {
                create: modelHintIds.map((modelHintId) => ({ modelHintId })),
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
    })

    return NextResponse.json({ data: prompt, success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: t("invalidInput"), details: error.errors },
        { status: 400 }
      )
    }
    console.error("Error updating prompt:", error)
    return NextResponse.json(
      { error: t("failedToUpdatePrompt") },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const locale = getLocaleFromRequest(request)
  const t = await getTranslations({ locale, namespace: "Api" })

  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: t("unauthorized") },
        { status: 401 }
      )
    }

    const ownership = await checkOwnership(
      params.id,
      session.user.id
    )

    if (!ownership.authorized) {
      return NextResponse.json(
        { error: t(ownership.errorKey) },
        { status: ownership.status }
      )
    }

    await prisma.prompt.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ data: { message: t("promptDeleted") }, success: true })
  } catch (error) {
    console.error("Error deleting prompt:", error)
    return NextResponse.json(
      { error: t("failedToDeletePrompt") },
      { status: 500 }
    )
  }
}


