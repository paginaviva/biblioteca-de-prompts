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

import { POST as registerPOST } from "@/app/api/auth/register/route"
import { NextRequest } from "next/server"

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}))

// Mock bcrypt
jest.mock("bcryptjs", () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}))

describe("Authentication API", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("POST /api/auth/register", () => {
    it("should register a new user with valid data", async () => {
      const { prisma } = require("@/lib/prisma")
      const { hash } = require("bcryptjs")

      prisma.user.findUnique.mockResolvedValue(null)
      hash.mockResolvedValue("hashed_password")
      prisma.user.create.mockResolvedValue({
        id: "1",
        name: "Test User",
        email: "test@example.com",
        role: "user",
      })

      const request = new NextRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: "Test User",
          email: "test@example.com",
          password: "password123",
        }),
      })

      const response = await registerPOST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.data).toHaveProperty("id")
      expect(data.data.email).toBe("test@example.com")
    })

    it("should return error for duplicate email", async () => {
      const { prisma } = require("@/lib/prisma")

      prisma.user.findUnique.mockResolvedValue({
        id: "1",
        email: "test@example.com",
      })

      const request = new NextRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: "Test User",
          email: "test@example.com",
          password: "password123",
        }),
      })

      const response = await registerPOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe("User with this email already exists")
    })

    it("should return error for invalid data", async () => {
      const request = new NextRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: "T",
          email: "invalid-email",
          password: "123",
        }),
      })

      const response = await registerPOST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBeDefined()
    })
  })
})
