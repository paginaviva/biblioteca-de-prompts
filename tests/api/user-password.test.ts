/**
 * @jest-environment node
 */

// Mock next-intl/server: the next-intl plugin wires `next-intl/config` via a
// webpack alias that next/jest does not apply, so the real getTranslations
// throws in Jest. Resolve messages from the en-GB catalog instead (requests
// without accept-language fall back to en-GB, keeping API error literals).
jest.mock("next-intl/server", () => ({
  getTranslations: jest.fn(async ({ locale, namespace }: { locale: string; namespace: string }) => {
    const messages = require("../../messages/en-GB.json")
    const namespaceMessages = messages[namespace] ?? {}
    return (key: string) => namespaceMessages[key] ?? key
  }),
}))

// Mock auth module BEFORE importing the route
const mockAuth = jest.fn()
jest.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
  signIn: jest.fn(),
  signOut: jest.fn(),
  handlers: {
    GET: jest.fn(),
    POST: jest.fn(),
  },
}))

// Mock bcrypt BEFORE importing the route
jest.mock("bcryptjs", () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}))

// Mock Prisma BEFORE importing the route
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

import { PATCH } from "@/app/api/user/password/route"
import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

describe("PATCH /api/user/password", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAuth.mockResolvedValue({ user: { id: "u1" } })
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
      password: "$2a$10$stored-hash",
      failedLoginAttempts: 0,
      lockoutUntil: null,
    })
    ;(prisma.ipAttempt.findUnique as jest.Mock).mockResolvedValue(null)
    ;(prisma.ipAttempt.upsert as jest.Mock).mockResolvedValue({})
    ;(prisma.ipAttempt.updateMany as jest.Mock).mockResolvedValue({ count: 1 })
  })

  it("returns 401 unauthorized when there is no session", async () => {
    // Arrange
    mockAuth.mockResolvedValue(null)
    const request = new NextRequest("http://localhost:3000/api/user/password", {
      method: "PATCH",
      body: JSON.stringify({
        currentPassword: "old-password",
        newPassword: "new-password123",
      }),
    })

    // Act
    const response = await PATCH(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(401)
    expect(data.error).toBe("Unauthorized")
    expect(prisma.user.findUnique).not.toHaveBeenCalled()
  })

  it("returns 400 wrongCurrentPassword and counts the failed attempt when the current password does not match", async () => {
    // Arrange
    ;(bcrypt.compare as jest.Mock).mockResolvedValue(false)
    const request = new NextRequest("http://localhost:3000/api/user/password", {
      method: "PATCH",
      body: JSON.stringify({
        currentPassword: "wrong-password",
        newPassword: "new-password123",
      }),
    })

    // Act
    const response = await PATCH(request)
    const data = await response.json()

    // Assert — compare ran against the stored hash (distinguishes this
    // branch from the OAuth no-password branch), and the failure is counted.
    expect(response.status).toBe(400)
    expect(data.error).toBe("Current password is incorrect")
    expect(bcrypt.compare).toHaveBeenCalledWith(
      "wrong-password",
      "$2a$10$stored-hash"
    )
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { failedLoginAttempts: 1, lockoutUntil: null },
    })
  })

  it("returns 400 passwordTooShort when newPassword is shorter than 6", async () => {
    // Arrange — z.string().min(6) fails → ZodError mapped to passwordTooShort
    const request = new NextRequest("http://localhost:3000/api/user/password", {
      method: "PATCH",
      body: JSON.stringify({
        currentPassword: "old-password",
        newPassword: "12345",
      }),
    })

    // Act
    const response = await PATCH(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(400)
    expect(data.error).toBe("Password must be at least 6 characters")
    expect(bcrypt.compare).not.toHaveBeenCalled()
  })

  it("updates the password and returns a success message", async () => {
    // Arrange
    ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)
    ;(bcrypt.hash as jest.Mock).mockResolvedValue("$2a$10$new-hash")
    ;(prisma.user.update as jest.Mock).mockResolvedValue({ id: "u1" })
    const request = new NextRequest("http://localhost:3000/api/user/password", {
      method: "PATCH",
      body: JSON.stringify({
        currentPassword: "old-password",
        newPassword: "new-password123",
      }),
    })

    // Act
    const response = await PATCH(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(data).toEqual({
      data: { message: "Password changed successfully" },
      success: true,
    })
    expect(bcrypt.hash).toHaveBeenCalledWith("new-password123", 10)
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: {
        password: "$2a$10$new-hash",
        tokenVersion: { increment: 1 },
        failedLoginAttempts: 0,
        lockoutUntil: null,
      },
    })
  })

  it("locks the account on the 5th failed attempt and resets the counter", async () => {
    // Arrange — 4 previous failures, this is the 5th
    ;(bcrypt.compare as jest.Mock).mockResolvedValue(false)
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
      password: "$2a$10$stored-hash",
      failedLoginAttempts: 4,
      lockoutUntil: null,
    })
    const request = new NextRequest("http://localhost:3000/api/user/password", {
      method: "PATCH",
      body: JSON.stringify({
        currentPassword: "wrong-password",
        newPassword: "new-password123",
      }),
    })

    // Act
    const response = await PATCH(request)
    const data = await response.json()

    // Assert — counter reset to 0 and a future lockoutUntil persisted
    expect(response.status).toBe(400)
    expect(data.error).toBe("Current password is incorrect")
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: {
        failedLoginAttempts: 0,
        lockoutUntil: expect.any(Date),
      },
    })
    const updateArgs = (prisma.user.update as jest.Mock).mock.calls[0][0]
    expect((updateArgs.data.lockoutUntil as Date).getTime()).toBeGreaterThan(
      Date.now()
    )
  })

  it("returns 400 accountLocked without checking the password while locked", async () => {
    // Arrange — account is locked for another minute
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
      password: "$2a$10$stored-hash",
      failedLoginAttempts: 0,
      lockoutUntil: new Date(Date.now() + 60_000),
    })
    const request = new NextRequest("http://localhost:3000/api/user/password", {
      method: "PATCH",
      body: JSON.stringify({
        currentPassword: "old-password",
        newPassword: "new-password123",
      }),
    })

    // Act
    const response = await PATCH(request)
    const data = await response.json()

    // Assert — lockout is checked before bcrypt.compare, nothing is mutated
    expect(response.status).toBe(400)
    expect(data.error).toBe("Account temporarily locked. Try again later.")
    expect(bcrypt.compare).not.toHaveBeenCalled()
    expect(prisma.user.update).not.toHaveBeenCalled()
  })

  it("returns 400 wrongCurrentPassword for an OAuth account without a stored password", async () => {
    // Arrange — user has no password (OAuth-only) → same generic error,
    // and bcrypt.compare is never reached
    ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({ password: null })
    const request = new NextRequest("http://localhost:3000/api/user/password", {
      method: "PATCH",
      body: JSON.stringify({
        currentPassword: "old-password",
        newPassword: "new-password123",
      }),
    })

    // Act
    const response = await PATCH(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(400)
    expect(data.error).toBe("Current password is incorrect")
    expect(bcrypt.compare).not.toHaveBeenCalled()
    expect(prisma.user.update).not.toHaveBeenCalled()
  })

  it("returns 400 tooManyAttempts without checking the password while the IP is locked", async () => {
    // Arrange — IP is locked for another minute (request carries the header)
    ;(prisma.ipAttempt.findUnique as jest.Mock).mockResolvedValue({
      failedAttempts: 0,
      lockoutUntil: new Date(Date.now() + 60_000),
    })
    const request = new NextRequest("http://localhost:3000/api/user/password", {
      method: "PATCH",
      headers: { "x-forwarded-for": "203.0.113.9" },
      body: JSON.stringify({
        currentPassword: "old-password",
        newPassword: "new-password123",
      }),
    })

    // Act
    const response = await PATCH(request)
    const data = await response.json()

    // Assert — IP lockout is checked before bcrypt.compare, nothing is mutated
    expect(response.status).toBe(400)
    expect(data.error).toBe("Too many attempts. Try again later.")
    expect(prisma.ipAttempt.findUnique).toHaveBeenCalledWith({
      where: { ip: "203.0.113.9" },
      select: { failedAttempts: true, lockoutUntil: true },
    })
    expect(bcrypt.compare).not.toHaveBeenCalled()
    expect(prisma.user.update).not.toHaveBeenCalled()
    expect(prisma.ipAttempt.upsert).not.toHaveBeenCalled()
  })
})
