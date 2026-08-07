import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { getTranslations } from "next-intl/server"
import { getLocaleFromRequest } from "@/lib/locale"
import { slugify } from "@/lib/slug"

const updateUseCaseSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase with hyphens")
    .optional(),
  sortOrder: z.number().int().optional(),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const data = updateUseCaseSchema.parse(body)

    const existing = await prisma.useCase.findUnique({
      where: { id: params.id },
      select: { id: true },
    })

    if (!existing) {
      return NextResponse.json(
        { error: t("useCaseNotFound") },
        { status: 404 }
      )
    }

    // Slug uniqueness: another use case must not hold the slug.
    if (data.slug) {
      const normalizedSlug = slugify(data.slug)
      const slugTaken = await prisma.useCase.findUnique({
        where: { slug: normalizedSlug },
        select: { id: true },
      })

      if (slugTaken && slugTaken.id !== params.id) {
        return NextResponse.json(
          { error: t("slugAlreadyExists") },
          { status: 409 }
        )
      }
      data.slug = normalizedSlug
    }

    const useCase = await prisma.useCase.update({
      where: { id: params.id },
      data,
    })

    return NextResponse.json({ data: useCase, success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: t("invalidInput"), details: error.errors },
        { status: 400 }
      )
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: t("slugAlreadyExists") },
        { status: 409 }
      )
    }
    console.error("Error updating use-case:", error)
    return NextResponse.json(
      { error: t("failedToUpdateUseCase") },
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

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { error: t("unauthorized") },
        { status: 401 }
      )
    }

    const existing = await prisma.useCase.findUnique({
      where: { id: params.id },
      select: { id: true },
    })

    if (!existing) {
      return NextResponse.json(
        { error: t("useCaseNotFound") },
        { status: 404 }
      )
    }

    // N:M junction rows (PromptUseCase) are deleted by the existing
    // onDelete: Cascade from this side, so prompts simply lose this
    // use case while keeping all their other relations.
    await prisma.useCase.delete({
      where: { id: params.id },
    })

    return NextResponse.json({
      data: { message: t("useCaseDeleted") },
      success: true,
    })
  } catch (error) {
    console.error("Error deleting use-case:", error)
    return NextResponse.json(
      { error: t("failedToDeleteUseCase") },
      { status: 500 }
    )
  }
}
