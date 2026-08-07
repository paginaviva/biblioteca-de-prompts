import type { User } from "next-auth"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import {
  extractClientIp,
  failedAttemptUpdate,
  fetchIpAttempt,
  isAccountLocked,
  isIpLocked,
  registerIpFailure,
  resetIpAttempt,
} from "@/lib/auth-security"

// Public bcrypt hash (cost 10) of "password" (well-known example hash, see
// OWASP bcrypt samples). Used ONLY for timing equalization — the compare
// result is discarded — so response time never reveals the real reason.
const DUMMY_PASSWORD_HASH =
  "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy"

/**
 * Credentials-provider authorize logic for the login flow. Extracted into
 * its own module (no NextAuth initialization side effects) so the full
 * brute-force flow — per-account AND per-IP — is unit-testable by calling
 * it directly with a plain Request.
 *
 * The second argument is the original Web Request (verified against
 * @auth/core 0.41.2 / next-auth 5.0.0-beta.31:
 * `authorize(credentials, request: Request)`), so the client IP is read
 * straight from its headers — no route-handler wrapping needed.
 *
 * IP handling is fail-open on DB errors (availability, same trade-off as
 * isSessionRevoked): a failed lookup is treated as "no record" and tracking
 * failures never take the flow down. When a locked IP IS successfully
 * loaded, the login fails closed with equalized timing.
 */
export async function authorizeCredentials(
  credentials: Partial<Record<string, unknown>> | undefined,
  request: Request
): Promise<User | null> {
  const ip = extractClientIp(request.headers)

  // IP-based brute-force protection first: a locked IP is rejected with a
  // dummy compare so timing stays uniform, and checking before the user
  // lookup keeps the query count (and therefore timing) identical whether
  // the account exists or not. Fail-open on the lookup: a DB error reads as
  // "no record" (availability); a successfully loaded locked IP fails closed.
  const ipAttempt = await fetchIpAttempt(ip)
  if (isIpLocked(ipAttempt?.lockoutUntil)) {
    await bcrypt.compare("dummy", DUMMY_PASSWORD_HASH)
    return null
  }

  const parsedCredentials = z
    .object({ email: z.string().email(), password: z.string().min(6) })
    .safeParse(credentials)

  if (parsedCredentials.success) {
    const { email, password } = parsedCredentials.data
    const user = await prisma.user.findUnique({ where: { email } })

    // Timing equalization: unknown accounts and locked accounts run a
    // dummy compare so response time does not reveal their state.
    if (!user || !user.password) {
      await bcrypt.compare(password, DUMMY_PASSWORD_HASH)
      return null
    }

    // Brute-force protection: a locked account gets the same generic
    // "invalid credentials" result — the lockout state is never revealed.
    if (isAccountLocked(user.lockoutUntil)) {
      await bcrypt.compare(password, user.password)
      return null
    }

    // Deactivated accounts (admin-managed) are rejected with the same
    // generic message and timing as a wrong password.
    if (user.isActive === false) {
      await bcrypt.compare(password, user.password)
      return null
    }

    const passwordsMatch = await bcrypt.compare(password, user.password)
    if (passwordsMatch) {
      // Successful login: clear any previous failures. The extra updates
      // are the standard trade-off for attempt tracking. Both are fail-open.
      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockoutUntil: null },
      })
      await resetIpAttempt(ip)
      return user
    }

    // Failed login: count the attempt and lock the account (and the IP) at
    // the threshold. IP tracking is fail-open on DB errors.
    await prisma.user.update({
      where: { id: user.id },
      data: failedAttemptUpdate(user.failedLoginAttempts),
    })
    await registerIpFailure(ip, ipAttempt?.failedAttempts ?? 0)
  }

  console.warn("Invalid credentials")
  return null
}
