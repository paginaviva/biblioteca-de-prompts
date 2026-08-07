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

// Mock Prisma BEFORE importing the route
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      update: jest.fn(),
    },
  },
}))

import { PATCH } from "@/app/api/user/profile/route"
import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"

describe("PATCH /api/user/profile", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAuth.mockResolvedValue({ user: { id: "u1" } })
  })

  it("returns 401 unauthorized when there is no session", async () => {
    // Arrange
    mockAuth.mockResolvedValue(null)
    const request = new NextRequest("http://localhost:3000/api/user/profile", {
      method: "PATCH",
      body: JSON.stringify({ name: "New Name" }),
    })

    // Act
    const response = await PATCH(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(401)
    expect(data.error).toBe("Unauthorized")
    expect(prisma.user.update).not.toHaveBeenCalled()
  })

  it("updates the name and returns it with success: true", async () => {
    // Arrange
    ;(prisma.user.update as jest.Mock).mockResolvedValue({ name: "New Name" })
    const request = new NextRequest("http://localhost:3000/api/user/profile", {
      method: "PATCH",
      body: JSON.stringify({ name: "New Name" }),
    })

    // Act
    const response = await PATCH(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(data).toEqual({ data: { name: "New Name" }, success: true })
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { name: "New Name" },
      select: { name: true },
    })
  })

  it("returns 400 invalidInput for an empty name", async () => {
    // Arrange — z.string().min(1) fails → ZodError → 400
    const request = new NextRequest("http://localhost:3000/api/user/profile", {
      method: "PATCH",
      body: JSON.stringify({ name: "" }),
    })

    // Act
    const response = await PATCH(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(400)
    expect(data.error).toBe("Invalid input")
    expect(prisma.user.update).not.toHaveBeenCalled()
  })

  it("returns 400 invalidInput for a name longer than 100 characters", async () => {
    // Arrange — z.string().max(100) fails → ZodError → 400
    const request = new NextRequest("http://localhost:3000/api/user/profile", {
      method: "PATCH",
      body: JSON.stringify({ name: "a".repeat(101) }),
    })

    // Act
    const response = await PATCH(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(400)
    expect(data.error).toBe("Invalid input")
    expect(prisma.user.update).not.toHaveBeenCalled()
  })
})
