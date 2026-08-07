import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { getTranslations } from "next-intl/server"
import { getLocaleFromRequest } from "@/lib/locale"

export async function GET(request: NextRequest) {
  const locale = getLocaleFromRequest(request)
  const t = await getTranslations({ locale, namespace: "Api" })

  try {
    // Action 1: Auth check - FIRST operation before any DB access
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: t("unauthorized") },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // Action 2 & 3: Filter by userId + Include all N:M relations
    const prompts = await prisma.prompt.findMany({
      where: {
        userId: userId,
      },
      include: {
        platforms: { include: { platform: true } },
        categories: { include: { category: true } },
        clientProjects: { include: { clientProject: true } },
        useCases: { include: { useCase: true } },
        modelHints: { include: { modelHint: true } },
        tags: { include: { tag: true } },
      },
      orderBy: { createdAt: "desc" },
    })

    const categories = await prisma.category.findMany({
      include: {
        parent: true,
      },
    })

    const tags = await prisma.tag.findMany()

    // Action 4: Transform to JSON format with N:M relations
    const exportData = {
      version: "2.0",
      exportedAt: new Date().toISOString(),
      prompts: prompts.map((prompt) => ({
        id: prompt.id,
        title: prompt.title,
        description: prompt.description,
        body: prompt.body,
        prePrompt: prompt.prePrompt,
        manualDeUso: prompt.manualDeUso,
        type: prompt.type,
        status: prompt.status,
        language: prompt.language,
        isFavorite: prompt.isFavorite,
        version: prompt.version,
        changelog: prompt.changelog,
        notes: prompt.notes,
        usageCount: prompt.usageCount,
        lastUsedAt: prompt.lastUsedAt,
        createdAt: prompt.createdAt.toISOString(),
        updatedAt: prompt.updatedAt.toISOString(),

        // N:M relations (new format)
        platforms: prompt.platforms.map((pp) => pp.platform.name),
        categories: prompt.categories.map((pc) => pc.category.name),
        clientProjects: prompt.clientProjects.map((cp) => cp.clientProject.name),
        useCases: prompt.useCases.map((uc) => uc.useCase.name),
        modelHints: prompt.modelHints.map((mh) => mh.modelHint.name),
        tags: prompt.tags.map((pt) => pt.tag.name),

        // Legacy fields (maintain for backward compatibility with old imports)
        platform: prompt.platform,
        clientOrProject: prompt.clientOrProject,
        useCase: prompt.useCase,
        modelHint: prompt.modelHint,
      })),
      categories: categories.map((cat) => ({
        name: cat.name,
        slug: cat.slug,
        parent: cat.parent?.name || null,
        sortOrder: cat.sortOrder,
      })),
      tags: tags.map((tag) => ({
        name: tag.name,
        slug: tag.slug,
      })),
    }

    // Action 5: Response structure following R6 (HTTP response convention)
    return NextResponse.json({
      data: exportData,
    }, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="prompts-export-${new Date().toISOString().split("T")[0]}.json"`,
      },
    })
  } catch (error) {
    console.error("Error exporting prompts:", error)
    return NextResponse.json(
      { error: t("failedToExportPrompts") },
      { status: 500 }
    )
  }
}
