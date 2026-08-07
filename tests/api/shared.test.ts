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

// Mock Prisma BEFORE importing the route. The shared route reaches the
// database through prompt.findMany only and imports PROMPT_INCLUDES to build
// the include clause, so the mock mirrors both exports.
jest.mock("@/lib/prisma", () => {
  const PROMPT_INCLUDES = {
    categories: { include: { category: true } },
    tags: { include: { tag: true } },
    platforms: { include: { platform: true } },
    clientProjects: { include: { clientProject: true } },
    useCases: { include: { useCase: true } },
    modelHints: { include: { modelHint: true } },
  }
  return {
    prisma: {
      prompt: {
        findMany: jest.fn(),
      },
    },
    PROMPT_INCLUDES,
  }
})

import { GET } from "@/app/api/shared/prompts/route"
import { prisma, PROMPT_INCLUDES } from "@/lib/prisma"
import { NextRequest } from "next/server"

const session = {
  user: { id: "user-1", name: "Test User", email: "test@example.com", role: "user" },
}

describe("/api/shared/prompts", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAuth.mockResolvedValue(session)
  })

  it("returns 401 unauthorized without a session", async () => {
    // Arrange
    mockAuth.mockResolvedValue(null)
    const request = new NextRequest("http://localhost:3000/api/shared/prompts")

    // Act
    const response = await GET(request)
    const data = await response.json()

    // Assert
    expect(response.status).toBe(401)
    expect(data.error).toBe("Unauthorized")
    expect(prisma.prompt.findMany).not.toHaveBeenCalled()
  })

  it("returns only prompts shared by OTHER users, hiding the caller's own", async () => {
    // Arrange — two shared prompts by other users
    const sharedPrompts = [
      { id: "p1", title: "Shared One", userId: "owner-1", isShared: true },
      { id: "p2", title: "Shared Two", userId: "owner-2", isShared: true },
    ]
    ;(prisma.prompt.findMany as jest.Mock).mockResolvedValue(sharedPrompts)
    const request = new NextRequest("http://localhost:3000/api/shared/prompts")

    // Act
    const response = await GET(request)
    const data = await response.json()

    // Assert — the where clause excludes the session user and requires isShared
    expect(response.status).toBe(200)
    expect(data).toEqual({ items: sharedPrompts, total: 2 })
    expect(prisma.prompt.findMany).toHaveBeenCalledWith({
      where: { isShared: true, userId: { not: "user-1" } },
      include: PROMPT_INCLUDES,
      orderBy: { updatedAt: "desc" },
    })
  })

  it("adds AND search terms to the shared where clause", async () => {
    // Arrange
    ;(prisma.prompt.findMany as jest.Mock).mockResolvedValue([])
    const request = new NextRequest(
      "http://localhost:3000/api/shared/prompts?search=hello"
    )

    // Act
    const response = await GET(request)
    const data = await response.json()

    // Assert — ?search= keeps the shared filter and searches title/description/body
    expect(response.status).toBe(200)
    expect(data).toEqual({ items: [], total: 0 })
    expect(prisma.prompt.findMany).toHaveBeenCalledWith({
      where: {
        isShared: true,
        userId: { not: "user-1" },
        AND: [
          {
            OR: [
              { title: { contains: "hello", mode: "insensitive" } },
              { description: { contains: "hello", mode: "insensitive" } },
              { body: { contains: "hello", mode: "insensitive" } },
              { prePrompt: { contains: "hello", mode: "insensitive" } },
              { manualDeUso: { contains: "hello", mode: "insensitive" } },
            ],
          },
        ],
      },
      include: PROMPT_INCLUDES,
      orderBy: { updatedAt: "desc" },
    })
  })

  it("uses AND logic between multiple search words", async () => {
    // Arrange
    ;(prisma.prompt.findMany as jest.Mock).mockResolvedValue([])
    const request = new NextRequest(
      "http://localhost:3000/api/shared/prompts?search=hello%20world"
    )

    // Act
    const response = await GET(request)
    const data = await response.json()

    // Assert — every word becomes its own OR block inside AND
    expect(response.status).toBe(200)
    expect(data).toEqual({ items: [], total: 0 })
    expect(prisma.prompt.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isShared: true,
          userId: { not: "user-1" },
          AND: expect.arrayContaining([
            expect.objectContaining({
              OR: expect.arrayContaining([
                { title: { contains: "hello", mode: "insensitive" } },
              ]),
            }),
            expect.objectContaining({
              OR: expect.arrayContaining([
                { title: { contains: "world", mode: "insensitive" } },
              ]),
            }),
          ]),
        }),
      })
    )
  })
})
