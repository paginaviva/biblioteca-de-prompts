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

import { GET, PUT, DELETE } from "@/app/api/prompts/[id]/route"
import { prisma, PROMPT_INCLUDES } from "@/lib/prisma"
import { NextRequest } from "next/server"

// Mock Prisma
jest.mock("@/lib/prisma", () => {
  // Mirror of the real PROMPT_INCLUDES so GET calls can be asserted exactly.
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
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      promptTag: {
        deleteMany: jest.fn(),
        create: jest.fn(),
      },
      promptCategory: {
        deleteMany: jest.fn(),
        create: jest.fn(),
      },
      promptPlatform: {
        deleteMany: jest.fn(),
        create: jest.fn(),
      },
      promptClientProject: {
        deleteMany: jest.fn(),
        create: jest.fn(),
      },
      promptUseCase: {
        deleteMany: jest.fn(),
        create: jest.fn(),
      },
      promptModelHint: {
        deleteMany: jest.fn(),
        create: jest.fn(),
      },
      category: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn(async (fn) => {
        // Mock transaction by just executing the function
        return await fn({
          prompt: {
            update: jest.fn(),
          },
          promptTag: {
            deleteMany: jest.fn(),
            create: jest.fn(),
          },
          promptCategory: {
            deleteMany: jest.fn(),
            create: jest.fn(),
          },
          promptPlatform: {
            deleteMany: jest.fn(),
            create: jest.fn(),
          },
          promptClientProject: {
            deleteMany: jest.fn(),
            create: jest.fn(),
          },
          promptUseCase: {
            deleteMany: jest.fn(),
            create: jest.fn(),
          },
          promptModelHint: {
            deleteMany: jest.fn(),
            create: jest.fn(),
          },
        })
      }),
    },
    PROMPT_INCLUDES,
  }
})

describe("/api/prompts/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("GET", () => {
    it("should return 401 without authentication", async () => {
      // Mock unauthenticated session
      mockAuth.mockResolvedValue(null)

      const request = new NextRequest("http://localhost:3000/api/prompts/prompt-1")
      const response = await GET(request, { params: { id: "prompt-1" } })

      expect(response.status).toBe(401)
      expect(prisma.prompt.findUnique).not.toHaveBeenCalled()
    })

    it("should return 404 when prompt belongs to another user", async () => {
      // Mock authenticated session (not the owner)
      mockAuth.mockResolvedValue({
        user: {
          id: "user-123",
          name: "Test User",
          email: "test@example.com",
          role: "user",
        },
      })

      // Ownership-filtered findUnique returns null (prompt exists but is not theirs)
      ;(prisma.prompt.findUnique as jest.Mock).mockResolvedValue(null)

      const request = new NextRequest("http://localhost:3000/api/prompts/prompt-1")
      const response = await GET(request, { params: { id: "prompt-1" } })

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toBe("Prompt not found")
    })

    it("should fetch only prompts owned by the authenticated user", async () => {
      // Mock authenticated session
      mockAuth.mockResolvedValue({
        user: {
          id: "user-123",
          name: "Test User",
          email: "test@example.com",
          role: "user",
        },
      })

      ;(prisma.prompt.findUnique as jest.Mock).mockResolvedValue({
        id: "prompt-1",
        title: "Test Prompt",
        userId: "user-123",
      })

      const request = new NextRequest("http://localhost:3000/api/prompts/prompt-1")
      await GET(request, { params: { id: "prompt-1" } })

      expect(prisma.prompt.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "prompt-1", userId: "user-123" },
        })
      )
    })

    it("should return 200 with prompt and N:M relations", async () => {
      // Mock authenticated session
      mockAuth.mockResolvedValue({
        user: {
          id: "user-123",
          name: "Test User",
          email: "test@example.com",
          role: "user",
        },
      })

      // Mock prompt with N:M relations
      ;(prisma.prompt.findUnique as jest.Mock).mockResolvedValue({
        id: "prompt-1",
        title: "Test Prompt",
        body: "Prompt body",
        userId: "user-123",
        platforms: [{ platform: { id: "p1", name: "CHATGPT" } }],
        categories: [{ category: { id: "c1", name: "Writing" } }],
        clientProjects: [{ clientProject: { id: "cp1", name: "Project A" } }],
        useCases: [{ useCase: { id: "u1", name: "Email" } }],
        modelHints: [{ modelHint: { id: "m1", name: "GPT-4" } }],
        tags: [{ tag: { id: "t1", name: "Important" } }],
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const request = new NextRequest("http://localhost:3000/api/prompts/prompt-1")
      const response = await GET(request, { params: { id: "prompt-1" } })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toHaveProperty("data")
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty("id", "prompt-1")
      expect(data.data).toHaveProperty("platforms")
      expect(data.data).toHaveProperty("categories")
    })

    it("should return 200 read-only when the prompt is shared by another user", async () => {
      // Mock authenticated session (not the owner)
      mockAuth.mockResolvedValue({
        user: {
          id: "user-123",
          name: "Test User",
          email: "test@example.com",
          role: "user",
        },
      })

      // The ownership-filtered lookup misses; the shared fallback matches
      ;(prisma.prompt.findUnique as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: "prompt-1",
          title: "Shared Prompt",
          userId: "owner-456",
          isShared: true,
        })

      const request = new NextRequest("http://localhost:3000/api/prompts/prompt-1")
      const response = await GET(request, { params: { id: "prompt-1" } })

      // Assert — read-only access is granted to shared prompts of other users
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.data.id).toBe("prompt-1")
      expect(prisma.prompt.findUnique).toHaveBeenNthCalledWith(1, {
        where: { id: "prompt-1", userId: "user-123" },
        include: PROMPT_INCLUDES,
      })
      expect(prisma.prompt.findUnique).toHaveBeenNthCalledWith(2, {
        where: { id: "prompt-1", isShared: true },
        include: PROMPT_INCLUDES,
      })
    })

    it("should return 404 after checking both ownership and shared fallback", async () => {
      // Mock authenticated session (not the owner)
      mockAuth.mockResolvedValue({
        user: {
          id: "user-123",
          name: "Test User",
          email: "test@example.com",
          role: "user",
        },
      })

      // Neither the ownership filter nor the shared fallback match
      ;(prisma.prompt.findUnique as jest.Mock).mockResolvedValue(null)

      const request = new NextRequest("http://localhost:3000/api/prompts/prompt-1")
      const response = await GET(request, { params: { id: "prompt-1" } })

      // Assert — a non-shared prompt of another user stays hidden (404)
      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toBe("Prompt not found")
      expect(prisma.prompt.findUnique).toHaveBeenCalledTimes(2)
    })
  })

  describe("PUT", () => {
    it("should return 401 without authentication", async () => {
      // Mock unauthenticated session
      mockAuth.mockResolvedValue(null)

      const request = new NextRequest("http://localhost:3000/api/prompts/prompt-1", {
        method: "PUT",
        body: JSON.stringify({ title: "Updated" }),
      })
      const response = await PUT(request, { params: { id: "prompt-1" } })

      expect(response.status).toBe(401)
    })

    it("should update prompt when user is owner", async () => {
      // Mock authenticated session (owner)
      mockAuth.mockResolvedValue({
        user: {
          id: "owner-123",
          name: "Owner User",
          email: "owner@example.com",
          role: "user",
        },
      })

      // Mock existing prompt (owned by user)
      ;(prisma.prompt.findUnique as jest.Mock).mockResolvedValue({
        id: "prompt-1",
        userId: "owner-123",
      })

      // Mock prompt update
      ;(prisma.prompt.update as jest.Mock).mockResolvedValue({
        id: "prompt-1",
        title: "Updated Prompt",
        userId: "owner-123",
      })

      const request = new NextRequest("http://localhost:3000/api/prompts/prompt-1", {
        method: "PUT",
        body: JSON.stringify({ title: "Updated Prompt" }),
      })
      const response = await PUT(request, { params: { id: "prompt-1" } })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
    })

    it("should return 404 when user is not owner (no existence oracle)", async () => {
      // Mock authenticated session (not owner)
      mockAuth.mockResolvedValue({
        user: {
          id: "other-user",
          name: "Other User",
          email: "other@example.com",
          role: "user",
        },
      })

      // Mock existing prompt (owned by different user)
      ;(prisma.prompt.findUnique as jest.Mock).mockResolvedValue({
        id: "prompt-1",
        userId: "owner-123",
      })

      const request = new NextRequest("http://localhost:3000/api/prompts/prompt-1", {
        method: "PUT",
        body: JSON.stringify({ title: "Hacked" }),
      })
      const response = await PUT(request, { params: { id: "prompt-1" } })

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data).toEqual({ error: "Prompt not found" })
    })

    it("should NOT allow admin to update another user's prompt (Fase D isolation)", async () => {
      // Mock authenticated session (admin)
      mockAuth.mockResolvedValue({
        user: {
          id: "admin-123",
          name: "Admin User",
          email: "admin@example.com",
          role: "admin",
        },
      })

      // Mock existing prompt (owned by different user)
      ;(prisma.prompt.findUnique as jest.Mock).mockResolvedValue({
        id: "prompt-1",
        userId: "other-user",
      })

      const request = new NextRequest("http://localhost:3000/api/prompts/prompt-1", {
        method: "PUT",
        body: JSON.stringify({ title: "Admin Updated" }),
      })
      const response = await PUT(request, { params: { id: "prompt-1" } })

      // Isolation rule: every user (admin included) only touches their own prompts
      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data.error).toBe("Prompt not found")
    })

    it("should update N:M relations with $transaction", async () => {
      // Mock authenticated session (owner)
      mockAuth.mockResolvedValue({
        user: {
          id: "owner-123",
          name: "Owner User",
          email: "owner@example.com",
          role: "user",
        },
      })

      // Mock existing prompt
      ;(prisma.prompt.findUnique as jest.Mock).mockResolvedValue({
        id: "prompt-1",
        userId: "owner-123",
      })

      // Mock prompt update
      ;(prisma.prompt.update as jest.Mock).mockResolvedValue({
        id: "prompt-1",
        userId: "owner-123",
      })

      const request = new NextRequest("http://localhost:3000/api/prompts/prompt-1", {
        method: "PUT",
        body: JSON.stringify({
          title: "Updated",
          platformIds: ["p1", "p2"],
          categoryIds: ["c1"],
          tagIds: ["t1", "t2"],
        }),
      })
      await PUT(request, { params: { id: "prompt-1" } })

      // Verify $transaction was called for N:M relations
      expect(prisma.$transaction).toHaveBeenCalled()
    })
  })

  describe("DELETE", () => {
    it("should return 401 without authentication", async () => {
      // Mock unauthenticated session
      mockAuth.mockResolvedValue(null)

      const request = new NextRequest("http://localhost:3000/api/prompts/prompt-1", {
        method: "DELETE",
      })
      const response = await DELETE(request, { params: { id: "prompt-1" } })

      expect(response.status).toBe(401)
    })

    it("should delete prompt when user is owner", async () => {
      // Mock authenticated session (owner)
      mockAuth.mockResolvedValue({
        user: {
          id: "owner-123",
          name: "Owner User",
          email: "owner@example.com",
          role: "user",
        },
      })

      // Mock existing prompt (owned by user)
      ;(prisma.prompt.findUnique as jest.Mock).mockResolvedValue({
        id: "prompt-1",
        userId: "owner-123",
      })

      // Mock prompt delete
      ;(prisma.prompt.delete as jest.Mock).mockResolvedValue({
        id: "prompt-1",
      })

      const request = new NextRequest("http://localhost:3000/api/prompts/prompt-1", {
        method: "DELETE",
      })
      const response = await DELETE(request, { params: { id: "prompt-1" } })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
    })

    it("should return 404 when user is not owner (no existence oracle)", async () => {
      // Mock authenticated session (not owner)
      mockAuth.mockResolvedValue({
        user: {
          id: "other-user",
          name: "Other User",
          email: "other@example.com",
          role: "user",
        },
      })

      // Mock existing prompt (owned by different user)
      ;(prisma.prompt.findUnique as jest.Mock).mockResolvedValue({
        id: "prompt-1",
        userId: "owner-123",
      })

      const request = new NextRequest("http://localhost:3000/api/prompts/prompt-1", {
        method: "DELETE",
      })
      const response = await DELETE(request, { params: { id: "prompt-1" } })

      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data).toEqual({ error: "Prompt not found" })
    })

    it("should NOT allow admin to delete another user's prompt (Fase D isolation)", async () => {
      // Mock authenticated session (admin)
      mockAuth.mockResolvedValue({
        user: {
          id: "admin-123",
          name: "Admin User",
          email: "admin@example.com",
          role: "admin",
        },
      })

      // Mock existing prompt (owned by different user)
      ;(prisma.prompt.findUnique as jest.Mock).mockResolvedValue({
        id: "prompt-1",
        userId: "other-user",
      })

      const request = new NextRequest("http://localhost:3000/api/prompts/prompt-1", {
        method: "DELETE",
      })
      const response = await DELETE(request, { params: { id: "prompt-1" } })

      // Isolation rule: every user (admin included) only touches their own prompts
      expect(response.status).toBe(404)
      const data = await response.json()
      expect(data).toEqual({ error: "Prompt not found" })
    })
  })
})
