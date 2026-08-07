import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

/** Max consecutive failed logins before the account is locked. */
export const MAX_FAILED_ATTEMPTS = 5
/** Lockout duration after reaching MAX_FAILED_ATTEMPTS (15 minutes). */
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000

/**
 * Thrown inside a serializable transaction when the "last active admin"
 * protection must abort the operation.
 */
export class LastAdminError extends Error {
  constructor() {
    super("Last active administrator protection triggered")
    this.name = "LastAdminError"
  }
}

/**
 * Runs `fn` inside a SERIALIZABLE transaction with retry on serialization
 * failures (P2034). Used by admin mutations that check-then-act on the
 * active-administrator count: two concurrent mutations can no longer leave
 * the system with zero active admins (TOCTOU race).
 */
export async function runSerializable<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  const MAX_ATTEMPTS = 3
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await prisma.$transaction(fn, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      })
    } catch (error) {
      const isSerializationConflict =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034"
      if (isSerializationConflict && attempt < MAX_ATTEMPTS) {
        continue
      }
      throw error
    }
  }
  throw new Error("Serializable transaction failed after retries")
}

/**
 * True when the account is currently locked out. A null/undefined
 * lockoutUntil (or one that has already expired) means the account is free.
 */
export function isAccountLocked(
  lockoutUntil: Date | null | undefined,
  now: Date = new Date()
): boolean {
  return Boolean(lockoutUntil && lockoutUntil > now)
}

/**
 * Shared core of the failed-attempt state machine: increments the counter
 * below the threshold; at the threshold returns a lockout and resets the
 * counter so a successful attempt after the lockout starts from zero.
 * Used by both the per-account (failedAttemptUpdate) and per-IP
 * (ipFailedAttemptUpdate) counters so the threshold logic lives once.
 */
function nextAttemptState(currentAttempts: number): {
  attempts: number
  lockoutUntil: Date | null
} {
  const nextAttempts = currentAttempts + 1
  if (nextAttempts >= MAX_FAILED_ATTEMPTS) {
    return {
      attempts: 0,
      lockoutUntil: new Date(Date.now() + LOCKOUT_DURATION_MS),
    }
  }
  return { attempts: nextAttempts, lockoutUntil: null }
}

/**
 * Computes the fields to persist after a failed login attempt. The counter
 * is incremented below the threshold; at the threshold the account is locked
 * for LOCKOUT_DURATION_MS and the counter is reset so a successful login
 * after the lockout starts from zero.
 */
export function failedAttemptUpdate(currentAttempts: number): {
  failedLoginAttempts: number
  lockoutUntil: Date | null
} {
  const { attempts, lockoutUntil } = nextAttemptState(currentAttempts)
  return { failedLoginAttempts: attempts, lockoutUntil }
}

/**
 * Extracts the client IP from request headers. x-forwarded-for may contain
 * a comma-separated chain of proxies — the leftmost (original client) value
 * wins; x-real-ip is the fallback; "unknown" when neither is present. The
 * value is normalized (trimmed, lowercased) so IPv6 hex casing and stray
 * whitespace cannot split one IP into multiple IpAttempt rows.
 */
export function extractClientIp(headers: Headers | HeadersInit): string {
  const all = new Headers(headers)

  const forwardedFor = all.get("x-forwarded-for")
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim().toLowerCase()
    if (first) return first
  }

  const realIp = all.get("x-real-ip")
  if (realIp) {
    const normalized = realIp.trim().toLowerCase()
    if (normalized) return normalized
  }

  return "unknown"
}

/**
 * True when the IP is currently locked out. Delegates to isAccountLocked —
 * the lockout semantics (future lockoutUntil means locked) are identical.
 */
export function isIpLocked(
  lockoutUntil: Date | null | undefined,
  now: Date = new Date()
): boolean {
  return isAccountLocked(lockoutUntil, now)
}

/**
 * Computes the fields to persist after a failed attempt from an IP. Same
 * threshold logic as failedAttemptUpdate (shared via nextAttemptState), with
 * the field name matching the IpAttempt model.
 */
export function ipFailedAttemptUpdate(currentAttempts: number): {
  failedAttempts: number
  lockoutUntil: Date | null
} {
  const { attempts, lockoutUntil } = nextAttemptState(currentAttempts)
  return { failedAttempts: attempts, lockoutUntil }
}

/**
 * Loads the IpAttempt row for a normalized IP. Fail-open: any DB error
 * returns null ("no record"), so an outage never blocks logins — same
 * availability trade-off as isSessionRevoked. When a row IS loaded and its
 * lockoutUntil is in the future, callers must fail closed on isIpLocked.
 */
export async function fetchIpAttempt(
  ip: string
): Promise<{ failedAttempts: number; lockoutUntil: Date | null } | null> {
  try {
    return await prisma.ipAttempt.findUnique({
      where: { ip },
      select: { failedAttempts: true, lockoutUntil: true },
    })
  } catch {
    return null
  }
}

/**
 * Records a failed attempt from an IP: upserts the row with the next counter
 * state (locking the IP at the threshold). Fail-open: a DB error is swallowed
 * so the login flow keeps working (availability over strictness).
 */
export async function registerIpFailure(
  ip: string,
  currentAttempts: number
): Promise<void> {
  try {
    const { failedAttempts, lockoutUntil } = ipFailedAttemptUpdate(currentAttempts)
    await prisma.ipAttempt.upsert({
      where: { ip },
      create: { ip, failedAttempts, lockoutUntil },
      update: { failedAttempts, lockoutUntil },
    })
  } catch {
    // Ignored: attempt tracking must never take the login flow down.
  }
}

/**
 * Clears the attempt state for an IP after a successful credential check.
 * updateMany (not upsert) so a successful login never creates a row: rows
 * only exist after a failure, and a no-op reset leaves an empty table clean.
 * Fail-open: a DB error is swallowed (the login already succeeded).
 */
export async function resetIpAttempt(ip: string): Promise<void> {
  try {
    await prisma.ipAttempt.updateMany({
      where: { ip },
      data: { failedAttempts: 0, lockoutUntil: null },
    })
  } catch {
    // Ignored: attempt tracking must never take the login flow down.
  }
}

/**
 * Checks whether a session token has been revoked by a password change
 * (tokenVersion bumped in the DB) or by account deactivation (isActive
 * false). Returns true when the user no longer exists, is inactive, or the
 * stored version differs from the token's. Fail-open: any DB error keeps the
 * session valid so an outage never locks users out.
 */
export async function isSessionRevoked(
  tokenId: string,
  tokenVersion: number
): Promise<boolean> {
  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: tokenId },
      select: { tokenVersion: true, isActive: true },
    })
    return (
      !dbUser ||
      dbUser.isActive === false ||
      dbUser.tokenVersion !== tokenVersion
    )
  } catch {
    return false
  }
}

/**
 * Produces a "revoked" token payload: same structure, but without identity
 * fields (id/role) and with language nulled, forcing a re-login. All other
 * JWT fields (name, email, iat, exp...) are preserved.
 */
export function revokeTokenPayload<T extends {
  id?: string
  role?: string
  language?: string | null
}>(token: T): T {
  return { ...token, id: undefined, role: undefined, language: null }
}
