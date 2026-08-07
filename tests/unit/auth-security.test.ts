/**
 * @jest-environment node
 */

// Mock Prisma: lib/auth-security talks to the DB only through @/lib/prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    ipAttempt: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}))

import { prisma } from "@/lib/prisma"
import {
  extractClientIp,
  failedAttemptUpdate,
  fetchIpAttempt,
  ipFailedAttemptUpdate,
  isAccountLocked,
  isIpLocked,
  isSessionRevoked,
  registerIpFailure,
  resetIpAttempt,
  revokeTokenPayload,
  LOCKOUT_DURATION_MS,
  MAX_FAILED_ATTEMPTS,
} from "@/lib/auth-security"

describe("auth-security", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("isAccountLocked", () => {
    it("returns true when lockoutUntil is in the future", () => {
      expect(isAccountLocked(new Date(Date.now() + 60_000))).toBe(true)
    })

    it("returns false when lockoutUntil is in the past", () => {
      expect(isAccountLocked(new Date(Date.now() - 60_000))).toBe(false)
    })

    it("returns false when lockoutUntil is null or undefined", () => {
      expect(isAccountLocked(null)).toBe(false)
      expect(isAccountLocked(undefined)).toBe(false)
    })
  })

  describe("failedAttemptUpdate", () => {
    it("increments the counter below the threshold", () => {
      expect(failedAttemptUpdate(2)).toEqual({
        failedLoginAttempts: 3,
        lockoutUntil: null,
      })
    })

    it("locks the account and resets the counter at the threshold", () => {
      const update = failedAttemptUpdate(MAX_FAILED_ATTEMPTS - 1)

      expect(update.failedLoginAttempts).toBe(0)
      expect(update.lockoutUntil).toBeInstanceOf(Date)
      const lockoutUntil = update.lockoutUntil as Date
      expect(lockoutUntil.getTime()).toBeGreaterThan(Date.now())
      expect(lockoutUntil.getTime()).toBeLessThanOrEqual(
        Date.now() + LOCKOUT_DURATION_MS
      )
    })
  })

  describe("isSessionRevoked", () => {
    it("returns false when the stored tokenVersion matches", async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({ tokenVersion: 3 })

      await expect(isSessionRevoked("u1", 3)).resolves.toBe(false)
    })

    it("returns true when the stored tokenVersion differs (password rotated)", async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({ tokenVersion: 4 })

      await expect(isSessionRevoked("u1", 3)).resolves.toBe(true)
    })

    it("returns true when the user no longer exists", async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(isSessionRevoked("u1", 3)).resolves.toBe(true)
    })

    it("fails open (returns false) when the database query fails", async () => {
      ;(prisma.user.findUnique as jest.Mock).mockRejectedValue(
        new Error("db down")
      )

      await expect(isSessionRevoked("u1", 3)).resolves.toBe(false)
    })

    it("queries tokenVersion and isActive in a single request", async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        tokenVersion: 3,
        isActive: true,
      })

      await isSessionRevoked("u1", 3)

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: "u1" },
        select: { tokenVersion: true, isActive: true },
      })
    })

    it("revokes sessions of deactivated users (isActive false)", async () => {
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        tokenVersion: 3,
        isActive: false,
      })

      await expect(isSessionRevoked("u1", 3)).resolves.toBe(true)
    })
  })

  describe("extractClientIp", () => {
    it("returns the leftmost value of x-forwarded-for (proxy chain)", () => {
      expect(
        extractClientIp({ "x-forwarded-for": "1.2.3.4, 10.0.0.1, 10.0.0.2" })
      ).toBe("1.2.3.4")
    })

    it("falls back to x-real-ip when x-forwarded-for is absent", () => {
      expect(extractClientIp({ "x-real-ip": "5.6.7.8" })).toBe("5.6.7.8")
    })

    it("prefers x-forwarded-for over x-real-ip", () => {
      expect(
        extractClientIp({
          "x-forwarded-for": "9.9.9.9",
          "x-real-ip": "8.8.8.8",
        })
      ).toBe("9.9.9.9")
    })

    it("returns 'unknown' when neither header is present", () => {
      expect(extractClientIp({})).toBe("unknown")
    })

    it("normalizes the value (trim + lowercase) and treats an empty leftmost value as absent", () => {
      expect(extractClientIp({ "x-forwarded-for": " 2001:DB8::1 " })).toBe(
        "2001:db8::1"
      )
      // Leftmost value after the comma split wins; an empty first hop means
      // the header is malformed → x-real-ip fallback → "unknown".
      expect(extractClientIp({ "x-forwarded-for": " , 5.6.7.8 " })).toBe(
        "unknown"
      )
      expect(extractClientIp({ "x-real-ip": " 1.2.3.4 " })).toBe("1.2.3.4")
    })

    it("accepts a Headers instance", () => {
      const headers = new Headers({ "x-real-ip": "77.77.77.77" })
      expect(extractClientIp(headers)).toBe("77.77.77.77")
    })
  })

  describe("isIpLocked", () => {
    it("delegates to isAccountLocked semantics", () => {
      expect(isIpLocked(new Date(Date.now() + 60_000))).toBe(true)
      expect(isIpLocked(new Date(Date.now() - 60_000))).toBe(false)
      expect(isIpLocked(null)).toBe(false)
      expect(isIpLocked(undefined)).toBe(false)
    })
  })

  describe("ipFailedAttemptUpdate", () => {
    it("increments the counter below the threshold", () => {
      expect(ipFailedAttemptUpdate(2)).toEqual({
        failedAttempts: 3,
        lockoutUntil: null,
      })
    })

    it("locks the IP and resets the counter at the threshold", () => {
      const update = ipFailedAttemptUpdate(MAX_FAILED_ATTEMPTS - 1)

      expect(update.failedAttempts).toBe(0)
      expect(update.lockoutUntil).toBeInstanceOf(Date)
      const lockoutUntil = update.lockoutUntil as Date
      expect(lockoutUntil.getTime()).toBeGreaterThan(Date.now())
      expect(lockoutUntil.getTime()).toBeLessThanOrEqual(
        Date.now() + LOCKOUT_DURATION_MS
      )
    })
  })

  describe("fetchIpAttempt", () => {
    it("returns the stored row for the IP", async () => {
      ;(prisma.ipAttempt.findUnique as jest.Mock).mockResolvedValue({
        failedAttempts: 2,
        lockoutUntil: null,
      })

      await expect(fetchIpAttempt("1.2.3.4")).resolves.toEqual({
        failedAttempts: 2,
        lockoutUntil: null,
      })

      expect(prisma.ipAttempt.findUnique).toHaveBeenCalledWith({
        where: { ip: "1.2.3.4" },
        select: { failedAttempts: true, lockoutUntil: true },
      })
    })

    it("returns null when no row exists", async () => {
      ;(prisma.ipAttempt.findUnique as jest.Mock).mockResolvedValue(null)

      await expect(fetchIpAttempt("1.2.3.4")).resolves.toBeNull()
    })

    it("fails open (returns null) when the database query fails", async () => {
      ;(prisma.ipAttempt.findUnique as jest.Mock).mockRejectedValue(
        new Error("db down")
      )

      await expect(fetchIpAttempt("1.2.3.4")).resolves.toBeNull()
    })
  })

  describe("registerIpFailure", () => {
    it("upserts the next counter state for the IP", async () => {
      ;(prisma.ipAttempt.upsert as jest.Mock).mockResolvedValue({})

      await registerIpFailure("1.2.3.4", 0)

      expect(prisma.ipAttempt.upsert).toHaveBeenCalledWith({
        where: { ip: "1.2.3.4" },
        create: { ip: "1.2.3.4", failedAttempts: 1, lockoutUntil: null },
        update: { failedAttempts: 1, lockoutUntil: null },
      })
    })

    it("locks the IP at the threshold", async () => {
      ;(prisma.ipAttempt.upsert as jest.Mock).mockResolvedValue({})

      await registerIpFailure("1.2.3.4", MAX_FAILED_ATTEMPTS - 1)

      const upsertArgs = (prisma.ipAttempt.upsert as jest.Mock).mock.calls[0][0]
      expect(upsertArgs.update.failedAttempts).toBe(0)
      expect(upsertArgs.update.lockoutUntil).toBeInstanceOf(Date)
      expect((upsertArgs.update.lockoutUntil as Date).getTime()).toBeGreaterThan(
        Date.now()
      )
    })

    it("fails open (resolves) when the database write fails", async () => {
      ;(prisma.ipAttempt.upsert as jest.Mock).mockRejectedValue(
        new Error("db down")
      )

      await expect(registerIpFailure("1.2.3.4", 0)).resolves.toBeUndefined()
    })
  })

  describe("resetIpAttempt", () => {
    it("clears the counter and lockout for the IP", async () => {
      ;(prisma.ipAttempt.updateMany as jest.Mock).mockResolvedValue({ count: 1 })

      await resetIpAttempt("1.2.3.4")

      expect(prisma.ipAttempt.updateMany).toHaveBeenCalledWith({
        where: { ip: "1.2.3.4" },
        data: { failedAttempts: 0, lockoutUntil: null },
      })
    })

    it("fails open (resolves) when the database write fails", async () => {
      ;(prisma.ipAttempt.updateMany as jest.Mock).mockRejectedValue(
        new Error("db down")
      )

      await expect(resetIpAttempt("1.2.3.4")).resolves.toBeUndefined()
    })
  })

  describe("revokeTokenPayload", () => {
    it("strips identity fields while preserving the rest of the token", () => {
      const revoked = revokeTokenPayload({
        id: "u1",
        role: "admin",
        language: "es",
        name: "Ana",
        tokenVersion: 2,
      })

      expect(revoked.id).toBeUndefined()
      expect(revoked.role).toBeUndefined()
      expect(revoked.language).toBeNull()
      expect(revoked.name).toBe("Ana")
      expect(revoked.tokenVersion).toBe(2)
    })
  })
})
