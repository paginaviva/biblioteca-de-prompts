import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { getTranslations } from "next-intl/server"
import { getLocaleFromRequest } from "@/lib/locale"
import { slugify } from "@/lib/slug"

const createUseCaseSchema = z.object({
  name: z.string().min(1),
})

export async function GET(request: NextRequest) {
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

    const search = request.nextUrl.searchParams.get("search")

    const useCases = await prisma.useCase.findMany({
      where: search
        ? { name: { contains: search, mode: "insensitive" } }
        : undefined,
      include: {
        _count: {
          select: {
            prompts: {
              where: { prompt: { userId: session.user.id } },
            },
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    })

    return NextResponse.json(useCases)
  } catch (error) {
    console.error("Error fetching use-cases:", error)
    return NextResponse.json(
      { error: t("failedToFetchUseCases") },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const locale = getLocaleFromRequest(request)
  const t = await getTranslations({ locale, namespace: "Api" })

  try {
    const session = await auth()
    
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { error: t("unauthorized") },
        { status: 401 }
      )
    }

    const body = await request.json()
    const data = createUseCaseSchema.parse(body)

    // Normalización: trim + uppercase (D-06)
    const normalizedName = data.name.trim().toUpperCase()
    const normalizedSlug = slugify(data.name)

    // Slug duplicado → 409 (no upsert silencioso)
    const existing = await prisma.useCase.findUnique({
      where: { slug: normalizedSlug },
      select: { id: true },
    })
    if (existing) {
      return NextResponse.json(
        { error: t("slugAlreadyExists") },
        { status: 409 }
      )
    }

    const useCase = await prisma.useCase.create({
      data: {
        name: normalizedName,
        slug: normalizedSlug,
      },
    })

    return NextResponse.json({ data: useCase, success: true }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: t("invalidInput"), details: error.errors },
        { status: 400 }
      )
    }
    console.error("Error creating use-case:", error)
    return NextResponse.json(
      { error: t("failedToCreateUseCase") },
      { status: 500 }
    )
  }
}
