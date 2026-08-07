import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { getTranslations } from "next-intl/server"
import { getLocaleFromRequest } from "@/lib/locale"

const updateCategorySchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  parentId: z.string().nullable().optional(),
  sortOrder: z.number().optional(),
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
    const data = updateCategorySchema.parse(body)

    // Validate: prevent self-reference (category cannot be its own parent)
    if (data.parentId === params.id) {
      return NextResponse.json(
        { error: t("categorySelfParent") },
        { status: 400 }
      )
    }

    // Validate: if parentId provided, verify it exists and is level-1
    if (data.parentId) {
      const parentCategory = await prisma.category.findUnique({
        where: { id: data.parentId },
        select: { parentId: true },
      })
      if (!parentCategory) {
        return NextResponse.json(
          { error: t("parentCategoryNotFound") },
          { status: 400 }
        )
      }
      if (parentCategory.parentId !== null) {
        return NextResponse.json(
          { error: t("maxDepthExceeded") },
          { status: 400 }
        )
      }
    }

    // Build update payload
    const updateData: {
      name?: string
      slug?: string
      parentId?: string | null
      sortOrder?: number
    } = {}

    if (data.name !== undefined) updateData.name = data.name
    if (data.slug !== undefined) updateData.slug = data.slug
    if (data.parentId !== undefined) {
      updateData.parentId = data.parentId || null
    }
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder

    const category = await prisma.category.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json({ data: category })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: t("invalidInput"), details: error.errors },
        { status: 400 }
      )
    }
    console.error("Error updating category:", error)
    return NextResponse.json(
      { error: t("failedToUpdateCategory") },
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

    await prisma.category.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ data: { message: t("categoryDeleted") } })
  } catch (error) {
    console.error("Error deleting category:", error)
    return NextResponse.json(
      { error: t("failedToDeleteCategory") },
      { status: 500 }
    )
  }
}


