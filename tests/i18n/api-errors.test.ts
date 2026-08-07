/**
 * @jest-environment node
 */

// Mock next-intl/server BEFORE importing the route. The real module only
// exposes client-side stubs under Jest (it would throw "not supported in
// Client Components"), so we provide a translator backed by the REAL message
// catalogs: the route's locale negotiation and message selection are still
// exercised end-to-end against the actual translation files.
jest.mock("next-intl/server", () => {
  const messagesByLocale = {
    "en-GB": require("../../messages/en-GB.json"),
    "es-ES": require("../../messages/es-ES.json"),
  } as Record<string, Record<string, Record<string, string>>>

  return {
    getTranslations: jest.fn(
      async ({ locale, namespace }: { locale: string; namespace: string }) => {
        const section = messagesByLocale[locale]?.[namespace] ?? {}
        return (key: string) => section[key] ?? key
      }
    ),
  }
})

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

import { GET } from "@/app/api/prompts/[id]/route"
import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"

// Mock Prisma so the route never touches a database
jest.mock("@/lib/prisma", () => ({
  prisma: {
    prompt: {
      findUnique: jest.fn(),
    },
    category: {
      findMany: jest.fn(),
    },
  },
  PROMPT_INCLUDES: {},
}))

describe("/api/prompts/[id] — translated error messages", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAuth.mockResolvedValue({
      user: {
        id: "test-user-id",
        name: "Test User",
        email: "test@example.com",
        role: "user",
      },
    })
    // A non-existent prompt triggers the 404 branch of the GET handler
    ;(prisma.prompt.findUnique as jest.Mock).mockResolvedValue(null)
  })

  it("returns the es-ES error message when accept-language is es-ES", async () => {
    // Arrange
    const request = new NextRequest(
      "http://localhost:3000/api/prompts/nonexistent-id",
      { headers: { "accept-language": "es-ES" } }
    )

    // Act
    const response = await GET(request, { params: { id: "nonexistent-id" } })
    const data = await response.json()

    // Assert
    expect(response.status).toBe(404)
    expect(data.error).toBe("Prompt no encontrado")
  })

  it("returns the en-GB error message when accept-language is en-GB", async () => {
    // Arrange
    const request = new NextRequest(
      "http://localhost:3000/api/prompts/nonexistent-id",
      { headers: { "accept-language": "en-GB" } }
    )

    // Act
    const response = await GET(request, { params: { id: "nonexistent-id" } })
    const data = await response.json()

    // Assert
    expect(response.status).toBe(404)
    expect(data.error).toBe("Prompt not found")
  })

  it("returns the en-GB error message when no accept-language header is present", async () => {
    // Arrange
    const request = new NextRequest(
      "http://localhost:3000/api/prompts/nonexistent-id"
    )

    // Act
    const response = await GET(request, { params: { id: "nonexistent-id" } })
    const data = await response.json()

    // Assert
    expect(response.status).toBe(404)
    expect(data.error).toBe("Prompt not found")
  })
})
