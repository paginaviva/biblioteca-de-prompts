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

import { POST } from "@/app/api/import/prompts/route"
import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    prompt: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    platform: {
      findFirst: jest.fn(),
      create: jest.fn().mockResolvedValue({ id: "platform-1" }),
      upsert: jest.fn(),
    },
    category: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
    },
    tag: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
    },
    clientProject: {
      findFirst: jest.fn(),
      create: jest.fn().mockResolvedValue({ id: "client-project-1" }),
      upsert: jest.fn(),
    },
    useCase: {
      findFirst: jest.fn(),
      create: jest.fn().mockResolvedValue({ id: "use-case-1" }),
      upsert: jest.fn(),
    },
    modelHint: {
      findFirst: jest.fn(),
      create: jest.fn().mockResolvedValue({ id: "model-hint-1" }),
      upsert: jest.fn(),
    },
    promptPlatform: {
      deleteMany: jest.fn(),
      create: jest.fn(),
    },
    promptCategory: {
      deleteMany: jest.fn(),
      create: jest.fn(),
    },
    promptTag: {
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
    $transaction: jest.fn(async (ops) => {
      // Mock transaction by executing all operations
      const results = []
      for (const op of ops) {
        results.push(await op)
      }
      return results
    }),
  },
}))

describe("/api/import/prompts", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("POST", () => {
    it("should return 401 without authentication", async () => {
      // Mock unauthenticated session
      mockAuth.mockResolvedValue(null)

      const body = {
        version: "2.0",
        data: {
          prompts: [],
        },
      }

      const request = new NextRequest("http://localhost:3000/api/import/prompts", {
        method: "POST",
        body: JSON.stringify(body),
      })
      const response = await POST(request)

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data).toEqual({ error: "Unauthorized" })
    })

    it("should import JSON v1.0 format successfully", async () => {
      // Mock authenticated session
      mockAuth.mockResolvedValue({
        user: {
          id: "user-123",
          name: "Test User",
          email: "test@example.com",
          role: "user",
        },
      })

      // Mock v1.0 format (legacy fields as strings)
      const v1Data = {
        prompts: [
          {
            id: "prompt-1",
            title: "Legacy Prompt",
            body: "Prompt body",
            platform: "CURSOR",
            clientOrProject: "Project A",
            useCase: "Writing",
            modelHint: "GPT-4",
            category: "Writing",
          },
        ],
      }

      // Mock no existing prompt (create new)
      ;(prisma.prompt.findFirst as jest.Mock).mockResolvedValue(null)
      
      // Mock prompt creation
      ;(prisma.prompt.create as jest.Mock).mockResolvedValue({
        id: "prompt-1",
        title: "Legacy Prompt",
        userId: "user-123",
      })

      const request = new NextRequest("http://localhost:3000/api/import/prompts", {
        method: "POST",
        body: JSON.stringify(v1Data),
      })
      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.imported).toBeDefined()
    })

    it("should import JSON v2.0 format with N:M relations", async () => {
      // Mock authenticated session
      mockAuth.mockResolvedValue({
        user: {
          id: "user-123",
          name: "Test User",
          email: "test@example.com",
          role: "user",
        },
      })

      // Mock v2.0 format (arrays of names for N:M relations)
      const v2Data = {
        version: "2.0",
        exportedAt: new Date().toISOString(),
        prompts: [
          {
            id: "prompt-1",
            title: "Modern Prompt",
            body: "Prompt body",
            description: "Test description",
            type: "USER",
            status: "DRAFT",
            language: "en",
            isFavorite: false,
            version: 1,
            platforms: ["CHATGPT", "CURSOR"],
            categories: ["Writing", "Code"],
            clientProjects: ["Project A"],
            useCases: ["Email", "Documentation"],
            modelHints: ["GPT-4", "Claude"],
            tags: ["Important", "Reviewed"],
            prePrompt: "You are an expert",
            manualDeUso: "Use for writing",
            usageCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        categories: [],
        tags: [],
      }

      // Mock no existing prompt (create new)
      ;(prisma.prompt.findFirst as jest.Mock).mockResolvedValue(null)
      
      // Mock prompt creation
      ;(prisma.prompt.create as jest.Mock).mockResolvedValue({
        id: "prompt-1",
        title: "Modern Prompt",
        userId: "user-123",
      })

      // Mock entity findFirst (return null = doesn't exist)
      ;(prisma.platform.findFirst as jest.Mock).mockResolvedValue(null)
      ;(prisma.category.findFirst as jest.Mock).mockResolvedValue(null)
      ;(prisma.tag.findFirst as jest.Mock).mockResolvedValue(null)
      ;(prisma.clientProject.findFirst as jest.Mock).mockResolvedValue(null)
      ;(prisma.useCase.findFirst as jest.Mock).mockResolvedValue(null)
      ;(prisma.modelHint.findFirst as jest.Mock).mockResolvedValue(null)

      // Mock entity creates (route uses create, not upsert)
      ;(prisma.platform.create as jest.Mock).mockResolvedValue({ id: "platform-1", name: "CHATGPT" })
      ;(prisma.category.upsert as jest.Mock).mockResolvedValue({ id: "category-1", name: "Writing" })
      ;(prisma.tag.upsert as jest.Mock).mockResolvedValue({ id: "tag-1", name: "Important" })
      ;(prisma.clientProject.create as jest.Mock).mockResolvedValue({ id: "client-1", name: "Project A" })
      ;(prisma.useCase.create as jest.Mock).mockResolvedValue({ id: "usecase-1", name: "Email" })
      ;(prisma.modelHint.create as jest.Mock).mockResolvedValue({ id: "model-1", name: "GPT-4" })

      const request = new NextRequest("http://localhost:3000/api/import/prompts", {
        method: "POST",
        body: JSON.stringify(v2Data),
      })
      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.format).toBe("2.0")
    })

    it("should assign imported prompts to authenticated user's userId", async () => {
      // Mock authenticated session
      mockAuth.mockResolvedValue({
        user: {
          id: "user-456",
          name: "Test User",
          email: "test@example.com",
          role: "user",
        },
      })

      const importData = {
        prompts: [
          {
            id: "prompt-1",
            title: "Imported Prompt",
            body: "Prompt body",
          },
        ],
      }

      // Mock no existing prompt
      ;(prisma.prompt.findFirst as jest.Mock).mockResolvedValue(null)
      
      // Mock prompt creation
      ;(prisma.prompt.create as jest.Mock).mockResolvedValue({
        id: "prompt-1",
        title: "Imported Prompt",
        userId: "user-456",
      })

      const request = new NextRequest("http://localhost:3000/api/import/prompts", {
        method: "POST",
        body: JSON.stringify(importData),
      })
      await POST(request)

      // Verify that prompt was created with correct userId
      expect(prisma.prompt.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: "user-456",
          }),
        })
      )
    })

    it("should upsert prompt when matching by userId + id", async () => {
      // Mock authenticated session
      mockAuth.mockResolvedValue({
        user: {
          id: "user-123",
          name: "Test User",
          email: "test@example.com",
          role: "user",
        },
      })

      const importData = {
        prompts: [
          {
            id: "existing-prompt",
            title: "Updated Prompt",
            body: "Updated body",
          },
        ],
      }

      // Mock existing prompt with same userId + id
      ;(prisma.prompt.findFirst as jest.Mock).mockResolvedValue({
        id: "existing-prompt",
        title: "Old Prompt",
        userId: "user-123",
      })

      // Mock prompt update
      ;(prisma.prompt.update as jest.Mock).mockResolvedValue({
        id: "existing-prompt",
        title: "Updated Prompt",
        userId: "user-123",
      })

      const request = new NextRequest("http://localhost:3000/api/import/prompts", {
        method: "POST",
        body: JSON.stringify(importData),
      })
      const response = await POST(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.imported.upserted).toBeGreaterThanOrEqual(0)
      
      // Verify update was called (not create)
      expect(prisma.prompt.update).toHaveBeenCalled()
      expect(prisma.prompt.create).not.toHaveBeenCalled()
    })

    it("should upsert prompt when matching by userId + title", async () => {
      // Mock authenticated session
      mockAuth.mockResolvedValue({
        user: {
          id: "user-123",
          name: "Test User",
          email: "test@example.com",
          role: "user",
        },
      })

      const importData = {
        prompts: [
          {
            id: "new-id",
            title: "Existing Title",
            body: "Updated body",
          },
        ],
      }

      // Mock existing prompt with same userId + title (different id)
      ;(prisma.prompt.findFirst as jest.Mock).mockResolvedValue({
        id: "old-id",
        title: "Existing Title",
        userId: "user-123",
      })

      // Mock prompt update
      ;(prisma.prompt.update as jest.Mock).mockResolvedValue({
        id: "old-id",
        title: "Existing Title",
        userId: "user-123",
      })

      const request = new NextRequest("http://localhost:3000/api/import/prompts", {
        method: "POST",
        body: JSON.stringify(importData),
      })
      await POST(request)

      // Verify update was called (not create)
      expect(prisma.prompt.update).toHaveBeenCalled()
      expect(prisma.prompt.create).not.toHaveBeenCalled()
    })

    it("should create related entities if they don't exist (v2.0)", async () => {
      // Mock authenticated session
      mockAuth.mockResolvedValue({
        user: {
          id: "user-123",
          name: "Test User",
          email: "test@example.com",
          role: "user",
        },
      })

      const v2Data = {
        version: "2.0",
        exportedAt: new Date().toISOString(),
        prompts: [
          {
            id: "prompt-1",
            title: "Prompt",
            body: "Body",
            description: "Test description",
            type: "USER",
            status: "DRAFT",
            language: "en",
            isFavorite: false,
            version: 1,
            platforms: ["New Platform"],
            categories: ["New Category"],
            tags: ["New Tag"],
            usageCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        categories: [],
        tags: [],
      }

      // Mock no existing prompt
      ;(prisma.prompt.findFirst as jest.Mock).mockResolvedValue(null)
      
      // Mock prompt creation
      ;(prisma.prompt.create as jest.Mock).mockResolvedValue({
        id: "prompt-1",
        userId: "user-123",
      })

      // Mock entity findFirst (return null = doesn't exist)
      ;(prisma.platform.findFirst as jest.Mock).mockResolvedValue(null)
      ;(prisma.category.findFirst as jest.Mock).mockResolvedValue(null)
      ;(prisma.tag.findFirst as jest.Mock).mockResolvedValue(null)

      // Mock entity creates (route uses create, not upsert)
      ;(prisma.platform.create as jest.Mock).mockResolvedValue({ id: "platform-1", name: "New Platform" })
      ;(prisma.category.upsert as jest.Mock).mockResolvedValue({ id: "category-1", name: "New Category" })
      ;(prisma.tag.upsert as jest.Mock).mockResolvedValue({ id: "tag-1", name: "New Tag" })

      const request = new NextRequest("http://localhost:3000/api/import/prompts", {
        method: "POST",
        body: JSON.stringify(v2Data),
      })
      await POST(request)

      // Verify platform.create was called for the upsertEntity path
      expect(prisma.platform.create).toHaveBeenCalled()
    })
  })
})
