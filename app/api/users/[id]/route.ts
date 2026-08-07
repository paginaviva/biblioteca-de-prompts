import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { getTranslations } from "next-intl/server"
import { getLocaleFromRequest } from "@/lib/locale"
import { LastAdminError, runSerializable } from "@/lib/auth-security"

// PATCH /api/users/[id] - Activate or deactivate a user (admin only)
const toggleActiveSchema = z.object({
  isActive: z.boolean(),
})

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
}

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

// PATCH /api/users/[id] - Activate or deactivate a user (admin only)
export async function PATCH(
  request: Request,
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
    const { isActive } = toggleActiveSchema.parse(body)

    // An administrator must not deactivate their own account.
    if (params.id === session.user.id && isActive === false) {
      return NextResponse.json(
        { error: t("cannotDeactivateOwnAccount") },
        { status: 400 }
      )
    }

    try {
      // Serializable transaction: the last-admin check and the mutation are
      // atomic, so two concurrent admins cannot both pass the check.
      const user = await runSerializable(async (tx) => {
        const target = await tx.user.findUnique({
          where: { id: params.id },
          select: { id: true, role: true, isActive: true },
        })

        if (!target) {
          throw new Error("NOT_FOUND")
        }

        // The last active administrator cannot be deactivated.
        if (
          target.role === "admin" &&
          target.isActive &&
          isActive === false &&
          (await isLastActiveAdmin(tx))
        ) {
          throw new LastAdminError()
        }

        // Deactivation bumps tokenVersion so every open session is revoked
        // immediately (the JWT callback in lib/auth.ts strips revoked tokens).
        // Reactivation leaves tokenVersion untouched so existing sessions work.
        return tx.user.update({
          where: { id: params.id },
          data: isActive
            ? { isActive: true }
            : { isActive: false, tokenVersion: { increment: 1 } },
          select: userSelect,
        })
      })

      return NextResponse.json({ data: user, success: true })
    } catch (error) {
      if (error instanceof LastAdminError) {
        return NextResponse.json(
          { error: t("cannotDeactivateLastAdmin") },
          { status: 400 }
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

    console.error("Error updating user activation:", error)
    return NextResponse.json(
      { error: t("internalServerError") },
      { status: 500 }
    )
  }
}

// DELETE /api/users/[id] - Delete user and their prompts (admin only)
export async function DELETE(
  request: Request,
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

    // Prevent deleting yourself
    if (params.id === session.user.id) {
      return NextResponse.json(
        { error: t("cannotDeleteOwnAccount") },
        { status: 400 }
      )
    }

    try {
      // Serializable transaction: the last-admin check and the deletion are
      // atomic, so two concurrent admins cannot both pass the check.
      await runSerializable(async (tx) => {
        const target = await tx.user.findUnique({
          where: { id: params.id },
          select: { id: true, role: true, isActive: true },
        })

        if (!target) {
          throw new Error("NOT_FOUND")
        }

        // The last active administrator cannot be deleted.
        if (
          target.role === "admin" &&
          target.isActive &&
          (await isLastActiveAdmin(tx))
        ) {
          throw new LastAdminError()
        }

        // Delete the user's prompts and the account atomically. The N:M
        // junction tables cascade from Prompt, so no cleanup is needed.
        await tx.prompt.deleteMany({ where: { userId: params.id } })
        await tx.user.delete({ where: { id: params.id } })
      })

      return NextResponse.json(
        { data: { message: t("userDeleted") }, success: true }
      )
    } catch (error) {
      if (error instanceof LastAdminError) {
        return NextResponse.json(
          { error: t("cannotDeleteLastAdmin") },
          { status: 400 }
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
    console.error("Error deleting user:", error)
    return NextResponse.json(
      { error: t("internalServerError") },
      { status: 500 }
    )
  }
}
