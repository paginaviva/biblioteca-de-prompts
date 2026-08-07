import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { getTranslations } from "next-intl/server"
import { getLocaleFromRequest } from "@/lib/locale"

const updateTagSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
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
    const data = updateTagSchema.parse(body)

    const tag = await prisma.tag.update({
      where: { id: params.id },
      data,
    })

    return NextResponse.json({ data: tag })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: t("invalidInput"), details: error.errors },
        { status: 400 }
      )
    }
    console.error("Error updating tag:", error)
    return NextResponse.json(
      { error: t("failedToUpdateTag") },
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

    await prisma.tag.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ data: { message: t("tagDeleted") } })
  } catch (error) {
    console.error("Error deleting tag:", error)
    return NextResponse.json(
      { error: t("failedToDeleteTag") },
      { status: 500 }
    )
  }
}


