import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { getTranslations } from "next-intl/server"
import { getLocaleFromRequest } from "@/lib/locale"

const updateNameSchema = z.object({
  name: z.string().min(1).max(100),
})

export async function PATCH(request: NextRequest) {
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

    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json(
        { error: t("invalidInput") },
        { status: 400 }
      )
    }
    const data = updateNameSchema.parse(body)

    // Only the name is updated; email and other fields are never touched.
    // The JWT session caches the name — the client refreshes it via
    // useSession().update() (handled in a later subtask).
    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: { name: data.name },
      select: { name: true },
    })

    return NextResponse.json({ data: { name: user.name }, success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: t("invalidInput"), details: error.errors },
        { status: 400 }
      )
    }
    console.error("Error updating profile name:", error)
    return NextResponse.json(
      { error: t("failedToUpdateName") },
      { status: 500 }
    )
  }
}
