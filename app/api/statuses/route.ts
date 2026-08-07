import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { getTranslations } from "next-intl/server"
import { getLocaleFromRequest } from "@/lib/locale"
import { slugify } from "@/lib/slug"

const createStatusSchema = z.object({
  name: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase with hyphens"),
  sortOrder: z.number().int().optional(),
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

    const statuses = await prisma.status.findMany({
      where: search
        ? { name: { contains: search, mode: "insensitive" } }
        : undefined,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    })

    return NextResponse.json(statuses)
  } catch (error) {
    console.error("Error fetching statuses:", error)
    return NextResponse.json(
      { error: t("failedToFetchStatuses") },
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
    const data = createStatusSchema.parse(body)

    // Normalize the slug with the shared helper (consistent with the other
    // catalog entities).
    data.slug = slugify(data.slug)

    // Slug uniqueness: pre-check for a clear 409, plus P2002 as a safety
    // net for concurrent requests (same pattern as POST /api/users).
    const existing = await prisma.status.findUnique({
      where: { slug: data.slug },
      select: { id: true },
    })

    if (existing) {
      return NextResponse.json(
        { error: t("slugAlreadyExists") },
        { status: 409 }
      )
    }

    const status = await prisma.status.create({
      data,
    })

    return NextResponse.json({ data: status, success: true }, { status: 201 })
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
    console.error("Error creating status:", error)
    return NextResponse.json(
      { error: t("failedToCreateStatus") },
      { status: 500 }
    )
  }
}
