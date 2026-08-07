import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { getTranslations } from "next-intl/server"
import { getLocaleFromRequest } from "@/lib/locale"

export async function PATCH(
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

    // Access check: the prompt must exist AND belong to the authenticated
    // user OR be shared by another user (copying a shared prompt also counts
    // as a use). Returns 404 (not 403) to avoid revealing the existence of
    // other users' prompts.
    const prompt = await prisma.prompt.findFirst({
      where: {
        OR: [
          { id: params.id, userId: session.user.id },
          { id: params.id, isShared: true },
        ],
      },
      select: { id: true },
    })

    if (!prompt) {
      return NextResponse.json(
        { error: t("promptNotFound") },
        { status: 404 }
      )
    }

    const updatedPrompt = await prisma.prompt.update({
      where: { id: params.id },
      data: {
        usageCount: {
          increment: 1,
        },
        lastUsedAt: new Date(),
      },
      include: {
        categories: true,
        tags: {
          include: {
            tag: true,
          },
        },
      },
    })

    return NextResponse.json(updatedPrompt)
  } catch (error) {
    console.error("Error updating prompt usage:", error)
    return NextResponse.json(
      { error: t("failedToUpdatePromptUsage") },
      { status: 500 }
    )
  }
}


