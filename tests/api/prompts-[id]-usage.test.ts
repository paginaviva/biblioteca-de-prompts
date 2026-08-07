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

import { PATCH } from "@/app/api/prompts/[id]/usage/route"
import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    prompt: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}))

describe("/api/prompts/[id]/usage", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock authenticated session by default
    mockAuth.mockResolvedValue({
      user: {
        id: "test-user-id",
        name: "Test User",
        email: "test@example.com",
        role: "user",
      },
    })
  })

  it("should return 401 without authentication", async () => {
    mockAuth.mockResolvedValue(null)

    const request = new NextRequest("http://localhost:3000/api/prompts/prompt-1/usage", {
      method: "PATCH",
    })
    const response = await PATCH(request, { params: { id: "prompt-1" } })

    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.error).toBe("Unauthorized")
    expect(prisma.prompt.findFirst).not.toHaveBeenCalled()
    expect(prisma.prompt.update).not.toHaveBeenCalled()
  })

  it("should return 404 when prompt belongs to another user", async () => {
    // Ownership check returns null: prompt exists but is not theirs
    ;(prisma.prompt.findFirst as jest.Mock).mockResolvedValue(null)

    const request = new NextRequest("http://localhost:3000/api/prompts/prompt-1/usage", {
      method: "PATCH",
    })
    const response = await PATCH(request, { params: { id: "prompt-1" } })

    expect(response.status).toBe(404)
    const data = await response.json()
    expect(data.error).toBe("Prompt not found")
    expect(prisma.prompt.update).not.toHaveBeenCalled()
  })

  it("should check access with id + (userId OR isShared) before updating usage", async () => {
    ;(prisma.prompt.findFirst as jest.Mock).mockResolvedValue({ id: "prompt-1" })
    ;(prisma.prompt.update as jest.Mock).mockResolvedValue({
      id: "prompt-1",
      usageCount: 3,
      lastUsedAt: new Date(),
    })

    const request = new NextRequest("http://localhost:3000/api/prompts/prompt-1/usage", {
      method: "PATCH",
    })
    const response = await PATCH(request, { params: { id: "prompt-1" } })

    expect(response.status).toBe(200)
    expect(prisma.prompt.findFirst).toHaveBeenCalledWith({
      where: {
        OR: [
          { id: "prompt-1", userId: "test-user-id" },
          { id: "prompt-1", isShared: true },
        ],
      },
      select: { id: true },
    })
  })

  it("should allow incrementing usage of a shared prompt by another user", async () => {
    // Prompt exists and is shared (not owned): the OR access check matches
    ;(prisma.prompt.findFirst as jest.Mock).mockResolvedValue({ id: "prompt-1" })
    ;(prisma.prompt.update as jest.Mock).mockResolvedValue({
      id: "prompt-1",
      usageCount: 5,
      lastUsedAt: new Date(),
    })

    const request = new NextRequest("http://localhost:3000/api/prompts/prompt-1/usage", {
      method: "PATCH",
    })
    const response = await PATCH(request, { params: { id: "prompt-1" } })

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.usageCount).toBe(5)
    expect(prisma.prompt.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "prompt-1" },
        data: expect.objectContaining({
          usageCount: { increment: 1 },
        }),
      })
    )
  })

  it("should increment usageCount and set lastUsedAt when user owns the prompt", async () => {
    ;(prisma.prompt.findFirst as jest.Mock).mockResolvedValue({ id: "prompt-1" })
    const mockUpdated = {
      id: "prompt-1",
      usageCount: 4,
      lastUsedAt: new Date("2026-08-06T00:00:00Z"),
    }
    ;(prisma.prompt.update as jest.Mock).mockResolvedValue(mockUpdated)

    const request = new NextRequest("http://localhost:3000/api/prompts/prompt-1/usage", {
      method: "PATCH",
    })
    const response = await PATCH(request, { params: { id: "prompt-1" } })

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.usageCount).toBe(4)
    expect(prisma.prompt.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "prompt-1" },
        data: expect.objectContaining({
          usageCount: { increment: 1 },
          lastUsedAt: expect.any(Date),
        }),
      })
    )
  })
})
