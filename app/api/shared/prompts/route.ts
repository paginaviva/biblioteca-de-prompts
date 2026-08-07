import { NextRequest, NextResponse } from "next/server"
import { prisma, PROMPT_INCLUDES } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { auth } from "@/lib/auth"
import { getTranslations } from "next-intl/server"
import { getLocaleFromRequest } from "@/lib/locale"

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

    const search = request.nextUrl.searchParams.get("search")

    // Only prompts shared by OTHER users; the caller's own prompts are hidden.
    const where: Prisma.PromptWhereInput = {
      isShared: true,
      userId: { not: session.user.id },
    }

    if (search) {
      // Split search into individual words and require ALL words to match
      // (same AND logic as GET /api/prompts).
      const searchWords = search.trim().split(/\s+/).filter(word => word.length > 0)

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

    return NextResponse.json({ items: prompts, total: prompts.length })
  } catch (error) {
    console.error("Error fetching shared prompts:", error)
    return NextResponse.json(
      { error: t("failedToFetchSharedPrompts") },
      { status: 500 }
    )
  }
}
