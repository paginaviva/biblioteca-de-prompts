import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { getTranslations } from "next-intl/server"
import { getLocaleFromRequest } from "@/lib/locale"
import { LastAdminError, runSerializable } from "@/lib/auth-security"

export const dynamic = 'force-dynamic'

// POST /api/users - Create a new user (admin only)
const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["user", "admin"]).default("user"),
})

// PUT /api/users - Update an existing user (admin only); all fields optional
const updateUserSchema = z.object({
  id: z.string(),
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(["user", "admin"]).optional(),
  password: z.string().min(6).optional(),
})

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect

// True when at most one active administrator remains. Must run inside a
// serializable transaction (via runSerializable) so concurrent mutations
// cannot both pass this check and leave zero active admins.
async function isLastActiveAdmin(
  tx: Prisma.TransactionClient
): Promise<boolean> {
  const activeAdminCount = await tx.user.count({
    where: { role: "admin", isActive: true },
  })
  return activeAdminCount <= 1
}

// GET /api/users - List all users (admin only)
export async function GET(request: Request) {
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

    const users = await prisma.user.findMany({
      select: userSelect,
      orderBy: { createdAt: "desc" }
    })

    return NextResponse.json({ data: users })
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json(
      { error: t("internalServerError") },
      { status: 500 }
    )
  }
}

// POST /api/users - Create a new user (admin only)
export async function POST(request: Request) {
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
    const validatedData = createUserSchema.parse(body)

    // The email must not belong to an existing account.
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
      select: { id: true },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: t("emailAlreadyExists") },
        { status: 409 }
      )
    }

    const hashedPassword = await bcrypt.hash(validatedData.password, 10)

    const user = await prisma.user.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        password: hashedPassword,
        role: validatedData.role,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    })

    return NextResponse.json({ data: user, success: true }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: t("invalidInput"),
          details: error.errors.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400 }
      )
    }

    // Concurrent creation with the same email: the unique constraint fires
    // after the pre-check passed — report it as a duplicate, not a 500.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: t("emailAlreadyExists") },
        { status: 409 }
      )
    }

    console.error("Error creating user:", error)
    return NextResponse.json(
      { error: t("internalServerError") },
      { status: 500 }
    )
  }
}

// PUT /api/users - Update user (admin only)
export async function PUT(request: Request) {
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
    const { id, name, email, role, password } = updateUserSchema.parse(body)

    try {
      // Serializable transaction: the last-admin check and the update are
      // atomic, so two concurrent admins cannot both pass the check.
      const user = await runSerializable(async (tx) => {
        const target = await tx.user.findUnique({
          where: { id },
          select: { id: true, email: true, role: true, isActive: true },
        })

        if (!target) {
          throw new Error("NOT_FOUND")
        }

        // The last active administrator cannot be demoted to a regular user.
        if (
          target.role === "admin" &&
          target.isActive &&
          role === "user" &&
          (await isLastActiveAdmin(tx))
        ) {
          throw new LastAdminError()
        }

        // An email change must not collide with another account.
        if (email && email !== target.email) {
          const existingUser = await tx.user.findUnique({
            where: { email },
            select: { id: true },
          })

          if (existingUser && existingUser.id !== target.id) {
            throw new Error("EMAIL_EXISTS")
          }
        }

        const updateData: Prisma.UserUpdateInput = {}
        if (name !== undefined) updateData.name = name
        if (email !== undefined) updateData.email = email
        if (role !== undefined) updateData.role = role
        if (password !== undefined) {
          updateData.password = await bcrypt.hash(password, 10)
        }

        // Role demotion and password resets must revoke all existing
        // sessions: a stale JWT would otherwise keep the old (elevated) role
        // alive until expiry. Bumping tokenVersion forces re-login.
        if (
          (role !== undefined && role !== target.role) ||
          password !== undefined
        ) {
          updateData.tokenVersion = { increment: 1 }
        }

        return tx.user.update({
          where: { id },
          data: updateData,
          select: userSelect,
        })
      })

      return NextResponse.json({ data: user, success: true })
    } catch (error) {
      if (error instanceof LastAdminError) {
        return NextResponse.json(
          { error: t("cannotDemoteLastAdmin") },
          { status: 400 }
        )
      }
      if (error instanceof Error && error.message === "EMAIL_EXISTS") {
        return NextResponse.json(
          { error: t("emailAlreadyExists") },
          { status: 409 }
        )
      }
      if (error instanceof Error && error.message === "NOT_FOUND") {
        return NextResponse.json(
          { error: t("userNotFound") },
          { status: 404 }
        )
      }
      throw error
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: t("invalidInput"),
          details: error.errors.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400 }
      )
    }

    // Concurrent email change hitting the unique constraint → duplicate.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: t("emailAlreadyExists") },
        { status: 409 }
      )
    }

    console.error("Error updating user:", error)
    return NextResponse.json(
      { error: t("internalServerError") },
      { status: 500 }
    )
  }
}
