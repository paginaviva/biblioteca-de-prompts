import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { getTranslations } from "next-intl/server"
import { getLocaleFromRequest } from "@/lib/locale"
import {
  extractClientIp,
  failedAttemptUpdate,
  fetchIpAttempt,
  isAccountLocked,
  isIpLocked,
  registerIpFailure,
  resetIpAttempt,
} from "@/lib/auth-security"

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
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

    // Normalized client IP for the per-IP attempt limit. The lookup below is
    // fail-open on DB errors (availability), while a successfully loaded
    // locked IP fails closed.
    const ip = extractClientIp(request.headers)

    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json(
        { error: t("invalidInput") },
        { status: 400 }
      )
    }
    const data = changePasswordSchema.parse(body)

    // The user is already authenticated, so fetching by session id
    // introduces no account-enumeration risk. OAuth-only accounts
    // (no stored password) get the same generic error as a wrong one.
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        password: true,
        failedLoginAttempts: true,
        lockoutUntil: true,
      },
    })

    if (!user?.password) {
      return NextResponse.json(
        { error: t("wrongCurrentPassword") },
        { status: 400 }
      )
    }

    // Brute-force protection: reject attempts while the account is locked.
    if (isAccountLocked(user.lockoutUntil)) {
      return NextResponse.json(
        { error: t("accountLocked") },
        { status: 400 }
      )
    }

    // IP-based brute-force protection: reject attempts while the IP is
    // locked. A dedicated message (not accountLocked) keeps the reason
    // honest — the account itself may be perfectly fine.
    const ipAttempt = await fetchIpAttempt(ip)
    if (isIpLocked(ipAttempt?.lockoutUntil)) {
      return NextResponse.json(
        { error: t("tooManyAttempts") },
        { status: 400 }
      )
    }

    const passwordsMatch = await bcrypt.compare(data.currentPassword, user.password)
    if (!passwordsMatch) {
      // Count the failed attempt and lock the account at the threshold.
      await prisma.user.update({
        where: { id: session.user.id },
        data: failedAttemptUpdate(user.failedLoginAttempts),
      })
      // Count the failed attempt for the IP too (fail-open on DB errors).
      await registerIpFailure(ip, ipAttempt?.failedAttempts ?? 0)
      return NextResponse.json(
        { error: t("wrongCurrentPassword") },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(data.newPassword, 10)
    // Bumping tokenVersion revokes every previously issued JWT — including
    // the current session's — so the next authenticated request forces a
    // re-login. That is the intended revocation pattern for a password change.
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        password: hashedPassword,
        tokenVersion: { increment: 1 },
        failedLoginAttempts: 0,
        lockoutUntil: null,
      },
    })
    // Successful change: clear the IP attempt state too (fail-open).
    await resetIpAttempt(ip)

    return NextResponse.json({
      data: { message: t("passwordChanged") },
      success: true,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      const isNewPasswordTooShort = error.issues.some(
        (issue) => issue.path[0] === "newPassword" && issue.code === "too_small"
      )
      return NextResponse.json(
        {
          error: isNewPasswordTooShort ? t("passwordTooShort") : t("invalidInput"),
          details: error.errors,
        },
        { status: 400 }
      )
    }
    console.error("Error changing password:", error)
    return NextResponse.json(
      { error: t("failedToChangePassword") },
      { status: 500 }
    )
  }
}
