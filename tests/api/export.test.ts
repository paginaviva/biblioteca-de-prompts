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

import { GET } from "@/app/api/export/prompts/route"
import { prisma } from "@/lib/prisma"
import { NextRequest } from "next/server"

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    prompt: {
      findMany: jest.fn(),
    },
    category: {
      findMany: jest.fn(),
    },
    tag: {
      findMany: jest.fn(),
    },
  },
}))

describe("/api/export/prompts", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("GET", () => {
    it("should return 401 without authentication", async () => {
      // Mock unauthenticated session
      mockAuth.mockResolvedValue(null)

      const request = new NextRequest("http://localhost:3000/api/export/prompts")
      const response = await GET(request)

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data).toEqual({ error: "Unauthorized" })
    })

    it("should return 200 with authenticated session", async () => {
      // Mock authenticated session
      mockAuth.mockResolvedValue({
        user: {
          id: "test-user-id",
          name: "Test User",
          email: "test@example.com",
          role: "user",
        },
      })

      // Mock empty prompts
      ;(prisma.prompt.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.category.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.tag.findMany as jest.Mock).mockResolvedValue([])

      const request = new NextRequest("http://localhost:3000/api/export/prompts")
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toHaveProperty("data")
      expect(data.data).toHaveProperty("prompts")
      expect(data.data).toHaveProperty("exportedAt")
      expect(data.data).toHaveProperty("version", "2.0")
    })

    it("should filter prompts by userId", async () => {
      // Mock authenticated session
      mockAuth.mockResolvedValue({
        user: {
          id: "user-123",
          name: "Test User",
          email: "test@example.com",
          role: "user",
        },
      })

      // Mock prompts - should only return prompts for this user
      const mockPrompt = {
        id: "prompt-1",
        title: "My Prompt",
        userId: "user-123",
        platforms: [],
        categories: [],
        clientProjects: [],
        useCases: [],
        modelHints: [],
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        platform: null,
        clientOrProject: null,
        useCase: null,
        modelHint: null,
      }
      ;(prisma.prompt.findMany as jest.Mock).mockResolvedValue([mockPrompt])
      ;(prisma.category.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.tag.findMany as jest.Mock).mockResolvedValue([])

      const request = new NextRequest("http://localhost:3000/api/export/prompts")
      await GET(request)

      // Verify that findMany was called with userId filter
      expect(prisma.prompt.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: "user-123",
          },
        })
      )
    })

    it("should include N:M relations as arrays of names", async () => {
      // Mock authenticated session
      mockAuth.mockResolvedValue({
        user: {
          id: "test-user-id",
          name: "Test User",
          email: "test@example.com",
          role: "user",
        },
      })

      // Mock prompt with N:M relations
      const mockPrompt = {
        id: "prompt-1",
        title: "Test Prompt",
        userId: "test-user-id",
        platforms: [{ platform: { name: "CHATGPT" } }, { platform: { name: "CURSOR" } }],
        categories: [{ category: { name: "Writing" } }],
        clientProjects: [{ clientProject: { name: "Project A" } }],
        useCases: [{ useCase: { name: "Email" } }],
        modelHints: [{ modelHint: { name: "GPT-4" } }],
        tags: [{ tag: { name: "Important" } }],
        createdAt: new Date(),
        updatedAt: new Date(),
        platform: null,
        clientOrProject: null,
        useCase: null,
        modelHint: null,
      }
      ;(prisma.prompt.findMany as jest.Mock).mockResolvedValue([mockPrompt])
      ;(prisma.category.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.tag.findMany as jest.Mock).mockResolvedValue([])

      const request = new NextRequest("http://localhost:3000/api/export/prompts")
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      
      // Verify N:M relations are transformed to arrays of names
      const prompt = data.data.prompts[0]
      expect(prompt.platforms).toEqual(["CHATGPT", "CURSOR"])
      expect(prompt.categories).toEqual(["Writing"])
      expect(prompt.clientProjects).toEqual(["Project A"])
      expect(prompt.useCases).toEqual(["Email"])
      expect(prompt.modelHints).toEqual(["GPT-4"])
      expect(prompt.tags).toEqual(["Important"])
    })

    it("should include prePrompt and manualDeUso fields", async () => {
      // Mock authenticated session
      mockAuth.mockResolvedValue({
        user: {
          id: "test-user-id",
          name: "Test User",
          email: "test@example.com",
          role: "user",
        },
      })

      // Mock prompt with prePrompt and manualDeUso
      const mockPrompt = {
        id: "prompt-1",
        title: "Test Prompt",
        userId: "test-user-id",
        prePrompt: "You are an expert assistant",
        manualDeUso: "Use this for writing tasks",
        platforms: [],
        categories: [],
        clientProjects: [],
        useCases: [],
        modelHints: [],
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        platform: null,
        clientOrProject: null,
        useCase: null,
        modelHint: null,
      }
      ;(prisma.prompt.findMany as jest.Mock).mockResolvedValue([mockPrompt])
      ;(prisma.category.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.tag.findMany as jest.Mock).mockResolvedValue([])

      const request = new NextRequest("http://localhost:3000/api/export/prompts")
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      
      // Verify new fields are included
      const prompt = data.data.prompts[0]
      expect(prompt).toHaveProperty("prePrompt", "You are an expert assistant")
      expect(prompt).toHaveProperty("manualDeUso", "Use this for writing tasks")
    })

    it("should maintain legacy fields for backward compatibility", async () => {
      // Mock authenticated session
      mockAuth.mockResolvedValue({
        user: {
          id: "test-user-id",
          name: "Test User",
          email: "test@example.com",
          role: "user",
        },
      })

      // Mock prompt with legacy fields
      const mockPrompt = {
        id: "prompt-1",
        title: "Test Prompt",
        userId: "test-user-id",
        platform: "CURSOR",
        clientOrProject: "Project X",
        useCase: "Writing",
        modelHint: "GPT-4",
        platforms: [],
        categories: [],
        clientProjects: [],
        useCases: [],
        modelHints: [],
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      ;(prisma.prompt.findMany as jest.Mock).mockResolvedValue([mockPrompt])
      ;(prisma.category.findMany as jest.Mock).mockResolvedValue([])
      ;(prisma.tag.findMany as jest.Mock).mockResolvedValue([])

      const request = new NextRequest("http://localhost:3000/api/export/prompts")
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      
      // Verify legacy fields are maintained
      const prompt = data.data.prompts[0]
      expect(prompt).toHaveProperty("platform", "CURSOR")
      expect(prompt).toHaveProperty("clientOrProject", "Project X")
      expect(prompt).toHaveProperty("useCase", "Writing")
      expect(prompt).toHaveProperty("modelHint", "GPT-4")
    })
  })
})
