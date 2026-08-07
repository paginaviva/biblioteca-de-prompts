/**
 * @jest-environment node
 */

// Mock Prisma BEFORE importing authorizeCredentials: the login flow reads
// users (account lockout) and IpAttempt rows (per-IP lockout) through it.
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    ipAttempt: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}))

// Mock bcrypt so no real hashing happens during tests.
jest.mock("bcryptjs", () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}))

import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { authorizeCredentials } from "@/lib/auth-credentials"

const PASSWORD_HASH = "$2a$10$stored-hash"

function loginRequest(ip?: string): Request {
  return new Request("http://localhost:3000/api/auth/callback/credentials", {
    method: "POST",
    headers: ip ? { "x-forwarded-for": ip } : {},
  })
}

describe("authorizeCredentials (login with per-IP attempt limit)", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "u1",
      email: "user@example.com",
      password: PASSWORD_HASH,
      isActive: true,
      lockoutUntil: null,
      failedLoginAttempts: 0,
    })
    ;(prisma.ipAttempt.findUnique as jest.Mock).mockResolvedValue(null)
    ;(prisma.ipAttempt.upsert as jest.Mock).mockResolvedValue({})
    ;(prisma.ipAttempt.updateMany as jest.Mock).mockResolvedValue({ count: 1 })
    ;(prisma.user.update as jest.Mock).mockResolvedValue({})
  })

  it("returns the user and resets the IP counter on a successful login", async () => {
    // Arrange — previous failures exist both on the account and the IP
    ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)
    ;(prisma.ipAttempt.findUnique as jest.Mock).mockResolvedValue({
      failedAttempts: 3,
      lockoutUntil: null,
    })

    // Act
    const result = await authorizeCredentials(
      { email: "user@example.com", password: "password123" },
      loginRequest("203.0.113.9")
    )

    // Assert — the IP is read from x-forwarded-for and both counters reset
    expect(result).toMatchObject({ id: "u1", email: "user@example.com" })
    expect(prisma.ipAttempt.findUnique).toHaveBeenCalledWith({
      where: { ip: "203.0.113.9" },
      select: { failedAttempts: true, lockoutUntil: true },
    })
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { failedLoginAttempts: 0, lockoutUntil: null },
    })
    expect(prisma.ipAttempt.updateMany).toHaveBeenCalledWith({
      where: { ip: "203.0.113.9" },
      data: { failedAttempts: 0, lockoutUntil: null },
    })
  })

  it("counts a failed login for the IP (first failure)", async () => {
    // Arrange
    ;(bcrypt.compare as jest.Mock).mockResolvedValue(false)

    // Act
    const result = await authorizeCredentials(
      { email: "user@example.com", password: "wrong-password" },
      loginRequest("203.0.113.9")
    )

    // Assert — generic result, account counter incremented, IP upserted
    expect(result).toBeNull()
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { failedLoginAttempts: 1, lockoutUntil: null },
    })
    expect(prisma.ipAttempt.upsert).toHaveBeenCalledWith({
      where: { ip: "203.0.113.9" },
      create: { ip: "203.0.113.9", failedAttempts: 1, lockoutUntil: null },
      update: { failedAttempts: 1, lockoutUntil: null },
    })
  })

  it("locks the IP on the 5th failed login and resets its counter", async () => {
    // Arrange — 4 previous failures, this is the 5th
    ;(bcrypt.compare as jest.Mock).mockResolvedValue(false)
    ;(prisma.ipAttempt.findUnique as jest.Mock).mockResolvedValue({
      failedAttempts: 4,
      lockoutUntil: null,
    })

    // Act
    const result = await authorizeCredentials(
      { email: "user@example.com", password: "wrong-password" },
      loginRequest("203.0.113.9")
    )

    // Assert — IP counter reset to 0 with a future lockoutUntil persisted
    expect(result).toBeNull()
    const upsertArgs = (prisma.ipAttempt.upsert as jest.Mock).mock.calls[0][0]
    expect(upsertArgs.update.failedAttempts).toBe(0)
    expect(upsertArgs.update.lockoutUntil).toBeInstanceOf(Date)
    expect((upsertArgs.update.lockoutUntil as Date).getTime()).toBeGreaterThan(
      Date.now()
    )
  })

  it("rejects with a dummy compare (timing equalized) when the IP is locked", async () => {
    // Arrange — IP locked for another minute; even a correct password fails
    ;(prisma.ipAttempt.findUnique as jest.Mock).mockResolvedValue({
      failedAttempts: 0,
      lockoutUntil: new Date(Date.now() + 60_000),
    })

    // Act
    const result = await authorizeCredentials(
      { email: "user@example.com", password: "password123" },
      loginRequest("203.0.113.9")
    )

    // Assert — one compare (dummy hash), no mutation of account or IP
    expect(result).toBeNull()
    expect(bcrypt.compare).toHaveBeenCalledTimes(1)
    expect(prisma.user.update).not.toHaveBeenCalled()
    expect(prisma.ipAttempt.upsert).not.toHaveBeenCalled()
    expect(prisma.ipAttempt.updateMany).not.toHaveBeenCalled()
  })

  it("fails open when the IP lookup errors: login still proceeds", async () => {
    // Arrange — DB errors on the IP lookup and on the failure upsert
    ;(bcrypt.compare as jest.Mock).mockResolvedValue(false)
    ;(prisma.ipAttempt.findUnique as jest.Mock).mockRejectedValue(
      new Error("db down")
    )
    ;(prisma.ipAttempt.upsert as jest.Mock).mockRejectedValue(
      new Error("db down")
    )

    // Act — must not throw; generic failure result
    await expect(
      authorizeCredentials(
        { email: "user@example.com", password: "wrong-password" },
        loginRequest("203.0.113.9")
      )
    ).resolves.toBeNull()

    // Account-level tracking still ran
    expect(prisma.user.update).toHaveBeenCalled()
  })

  it("does not track malformed credentials (same behavior as the account counter)", async () => {
    // Act — invalid email format fails zod before any user lookup
    const result = await authorizeCredentials(
      { email: "not-an-email", password: "password123" },
      loginRequest("203.0.113.9")
    )

    // Assert — the IP is checked first (read-only, fail-open) but nothing
    // is registered: no user lookup, no failure tracking.
    expect(result).toBeNull()
    expect(prisma.user.findUnique).not.toHaveBeenCalled()
    expect(prisma.ipAttempt.findUnique).toHaveBeenCalled()
    expect(prisma.ipAttempt.upsert).not.toHaveBeenCalled()
  })
})
