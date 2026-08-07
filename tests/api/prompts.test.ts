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

import { POST, GET } from "@/app/api/prompts/route"
import { PUT, GET as GETById } from "@/app/api/prompts/[id]/route"
import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"

// Mock Prisma with $transaction support
jest.mock("@/lib/prisma", () => ({
  prisma: {
    prompt: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    promptTag: {
      deleteMany: jest.fn(),
    },
    promptCategory: {
      deleteMany: jest.fn(),
    },
    promptPlatform: {
      deleteMany: jest.fn(),
    },
    promptClientProject: {
      deleteMany: jest.fn(),
    },
    promptUseCase: {
      deleteMany: jest.fn(),
    },
    promptModelHint: {
      deleteMany: jest.fn(),
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
        },
        promptCategory: {
          deleteMany: jest.fn(),
        },
        promptPlatform: {
          deleteMany: jest.fn(),
        },
        promptClientProject: {
          deleteMany: jest.fn(),
        },
        promptUseCase: {
          deleteMany: jest.fn(),
        },
        promptModelHint: {
          deleteMany: jest.fn(),
        },
      })
    }),
  },
}))

describe("/api/prompts", () => {
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

  describe("POST", () => {
    it("should create a prompt successfully", async () => {
      const mockPrompt = {
        id: "test-id",
        title: "Test Prompt",
        body: "Test body",
        type: "USER",
        platform: "CURSOR",
        language: "en",
        useCase: "Testing",
        status: "DRAFT",
        isFavorite: false,
        version: 1,
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        category: null,
        tags: [],
        user: {
          id: "test-user-id",
          name: "Test User",
          email: "test@example.com",
        },
      }

      ;(prisma.prompt.create as jest.Mock).mockResolvedValue(mockPrompt)

      const request = new NextRequest("http://localhost:3000/api/prompts", {
        method: "POST",
        body: JSON.stringify({
          title: "Test Prompt",
          body: "Test body",
          type: "USER",
          platform: "CURSOR",
          language: "en",
          useCase: "Testing",
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.data.title).toBe("Test Prompt")
      expect(prisma.prompt.create).toHaveBeenCalledTimes(1)
    })

    it("should accept isShared flag when creating a prompt", async () => {
      const mockPrompt = {
        id: "test-id",
        title: "Test Prompt",
        body: "Test body",
        type: "USER",
        language: "en",
        status: "DRAFT",
        isFavorite: false,
        isShared: true,
        version: 1,
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        platforms: [],
        categories: [],
        tags: [],
        user: {
          id: "test-user-id",
          name: "Test User",
          email: "test@example.com",
        },
      }

      ;(prisma.prompt.create as jest.Mock).mockResolvedValue(mockPrompt)

      const request = new NextRequest("http://localhost:3000/api/prompts", {
        method: "POST",
        body: JSON.stringify({
          title: "Test Prompt",
          body: "Test body",
          type: "USER",
          language: "en",
          isShared: true,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.data.isShared).toBe(true)
      expect(prisma.prompt.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isShared: true,
          }),
        })
      )
    })

    it("should return 400 for invalid input", async () => {
      const request = new NextRequest("http://localhost:3000/api/prompts", {
        method: "POST",
        body: JSON.stringify({
          title: "", // Invalid: empty title
          body: "Test body",
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe("Invalid input")
    })
  })

  describe("GET", () => {
    it("should return 401 without authentication", async () => {
      mockAuth.mockResolvedValue(null)

      const request = new NextRequest("http://localhost:3000/api/prompts")

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
      expect(prisma.prompt.findMany).not.toHaveBeenCalled()
    })

    it("should return prompts", async () => {
      const mockPrompts = [
        {
          id: "test-id",
          title: "Test Prompt",
          category: null,
          tags: [],
        },
      ]

      ;(prisma.prompt.findMany as jest.Mock).mockResolvedValue(mockPrompts)

      const request = new NextRequest("http://localhost:3000/api/prompts")

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.items).toHaveLength(1)
      expect(prisma.prompt.findMany).toHaveBeenCalledTimes(1)
    })

    it("should only fetch prompts belonging to the authenticated user", async () => {
      ;(prisma.prompt.findMany as jest.Mock).mockResolvedValue([])

      const request = new NextRequest("http://localhost:3000/api/prompts")

      await GET(request)

      expect(prisma.prompt.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: "test-user-id",
          }),
        })
      )
    })

    it("should filter by search query", async () => {
      ;(prisma.prompt.findMany as jest.Mock).mockResolvedValue([])

      const request = new NextRequest(
        "http://localhost:3000/api/prompts?search=test"
      )

      await GET(request)

      expect(prisma.prompt.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({
                OR: expect.arrayContaining([
                  expect.objectContaining({ title: expect.any(Object) }),
                  expect.objectContaining({ description: expect.any(Object) }),
                  expect.objectContaining({ body: expect.any(Object) }),
                  expect.objectContaining({ prePrompt: expect.any(Object) }),
                  expect.objectContaining({ manualDeUso: expect.any(Object) }),
                ]),
              }),
            ]),
          }),
        })
      )
    })

    it("should use AND logic between multiple search words", async () => {
      ;(prisma.prompt.findMany as jest.Mock).mockResolvedValue([])

      const request = new NextRequest(
        "http://localhost:3000/api/prompts?search=hello%20world"
      )

      await GET(request)

      expect(prisma.prompt.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              // First word condition
              expect.objectContaining({
                OR: expect.arrayContaining([
                  expect.objectContaining({ title: { contains: "hello", mode: "insensitive" } }),
                ]),
              }),
              // Second word condition
              expect.objectContaining({
                OR: expect.arrayContaining([
                  expect.objectContaining({ title: { contains: "world", mode: "insensitive" } }),
                ]),
              }),
            ]),
          }),
        })
      )
    })

    it("should be case-insensitive when searching", async () => {
      ;(prisma.prompt.findMany as jest.Mock).mockResolvedValue([])

      const request = new NextRequest(
        "http://localhost:3000/api/prompts?search=OPENCODER"
      )

      await GET(request)

      expect(prisma.prompt.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({
                OR: expect.arrayContaining([
                  expect.objectContaining({ title: { contains: "OPENCODER", mode: "insensitive" } }),
                ]),
              }),
            ]),
          }),
        })
      )
    })

    it("should filter by multiple categories with AND logic", async () => {
      ;(prisma.prompt.findMany as jest.Mock).mockResolvedValue([])

      const request = new NextRequest(
        "http://localhost:3000/api/prompts?categoryIds=cat-1&categoryIds=cat-2"
      )

      await GET(request)

      expect(prisma.prompt.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              // First category condition
              expect.objectContaining({
                categories: { some: { categoryId: "cat-1" } },
              }),
              // Second category condition
              expect.objectContaining({
                categories: { some: { categoryId: "cat-2" } },
              }),
            ]),
          }),
        })
      )
    })

    it("should combine search and category filter with AND logic", async () => {
      ;(prisma.prompt.findMany as jest.Mock).mockResolvedValue([])

      const request = new NextRequest(
        "http://localhost:3000/api/prompts?search=test&categoryIds=cat-1&categoryIds=cat-2"
      )

      await GET(request)

      expect(prisma.prompt.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              // Search word condition
              expect.objectContaining({
                OR: expect.arrayContaining([
                  expect.objectContaining({ title: { contains: "test", mode: "insensitive" } }),
                ]),
              }),
              // Category conditions
              expect.objectContaining({
                categories: { some: { categoryId: "cat-1" } },
              }),
              expect.objectContaining({
                categories: { some: { categoryId: "cat-2" } },
              }),
            ]),
          }),
        })
      )
    })
  })

  describe("POST with N:M relations", () => {
    it("should create a prompt with platformIds array", async () => {
      const mockPrompt = {
        id: "test-id",
        title: "Test Prompt",
        body: "Test body",
        type: "USER",
        language: "en",
        status: "DRAFT",
        isFavorite: false,
        version: 1,
        usageCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        platforms: [],
        categories: [],
        tags: [],
        user: {
          id: "test-user-id",
          name: "Test User",
          email: "test@example.com",
        },
      }

      ;(prisma.prompt.create as jest.Mock).mockResolvedValue(mockPrompt)

      const request = new NextRequest("http://localhost:3000/api/prompts", {
        method: "POST",
        body: JSON.stringify({
          title: "Test Prompt",
          body: "Test body",
          type: "USER",
          language: "en",
          platformIds: ["platform-1", "platform-2"],
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(prisma.prompt.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: "test-user-id",
            platforms: expect.objectContaining({
              create: expect.arrayContaining([
                expect.objectContaining({ platformId: "platform-1" }),
                expect.objectContaining({ platformId: "platform-2" }),
              ]),
            }),
          }),
        })
      )
    })

    it("should create a prompt with categoryIds array", async () => {
      const mockPrompt = {
        id: "test-id",
        title: "Test Prompt",
        body: "Test body",
        type: "USER",
        language: "en",
        status: "DRAFT",
        categories: [],
        tags: [],
        user: { id: "test-user-id", name: "Test", email: "test@example.com" },
      }

      ;(prisma.prompt.create as jest.Mock).mockResolvedValue(mockPrompt)

      const request = new NextRequest("http://localhost:3000/api/prompts", {
        method: "POST",
        body: JSON.stringify({
          title: "Test Prompt",
          body: "Test body",
          type: "USER",
          language: "en",
          categoryIds: ["category-1"],
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(201)
      expect(prisma.prompt.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            categories: expect.objectContaining({
              create: expect.arrayContaining([
                expect.objectContaining({ categoryId: "category-1" }),
              ]),
            }),
          }),
        })
      )
    })

    it("should create a prompt with multiple N:M relations", async () => {
      const mockPrompt = {
        id: "test-id",
        title: "Test Prompt",
        body: "Test body",
        type: "USER",
        language: "es",
        status: "DRAFT",
        platforms: [],
        categories: [],
        clientProjects: [],
        useCases: [],
        modelHints: [],
        tags: [],
        user: { id: "test-user-id", name: "Test", email: "test@example.com" },
      }

      ;(prisma.prompt.create as jest.Mock).mockResolvedValue(mockPrompt)

      const request = new NextRequest("http://localhost:3000/api/prompts", {
        method: "POST",
        body: JSON.stringify({
          title: "Test Prompt",
          body: "Test body",
          type: "USER",
          language: "es",
          platformIds: ["platform-1"],
          categoryIds: ["category-1", "category-2"],
          clientProjectIds: ["client-1"],
          useCaseIds: ["usecase-1"],
          modelHintIds: ["hint-1"],
          tagIds: ["tag-1"],
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(201)
    })

    it("should accept language enum values", async () => {
      const mockPrompt = {
        id: "test-id",
        title: "Test",
        body: "body",
        type: "USER",
        language: "es",
        status: "DRAFT",
        platforms: [],
        categories: [],
        tags: [],
        user: { id: "test-user-id", name: "Test", email: "test@example.com" },
      }

      ;(prisma.prompt.create as jest.Mock).mockResolvedValue(mockPrompt)

      // Test with "es" (default)
      let request = new NextRequest("http://localhost:3000/api/prompts", {
        method: "POST",
        body: JSON.stringify({
          title: "Test",
          body: "body",
          type: "USER",
          language: "es",
        }),
      })

      let response = await POST(request)
      expect(response.status).toBe(201)

      // Test with "nl"
      request = new NextRequest("http://localhost:3000/api/prompts", {
        method: "POST",
        body: JSON.stringify({
          title: "Test",
          body: "body",
          type: "USER",
          language: "nl",
        }),
      })

      response = await POST(request)
      expect(response.status).toBe(201)

      // Test with "fr"
      request = new NextRequest("http://localhost:3000/api/prompts", {
        method: "POST",
        body: JSON.stringify({
          title: "Test",
          body: "body",
          type: "USER",
          language: "fr",
        }),
      })

      response = await POST(request)
      expect(response.status).toBe(201)
    })

    it("should use 'es' as default language", async () => {
      const mockPrompt = {
        id: "test-id",
        title: "Test",
        body: "body",
        type: "USER",
        language: "es",
        status: "DRAFT",
        platforms: [],
        categories: [],
        tags: [],
        user: { id: "test-user-id", name: "Test", email: "test@example.com" },
      }

      ;(prisma.prompt.create as jest.Mock).mockResolvedValue(mockPrompt)

      const request = new NextRequest("http://localhost:3000/api/prompts", {
        method: "POST",
        body: JSON.stringify({
          title: "Test",
          body: "body",
          type: "USER",
          // language not provided, should default to "es"
        }),
      })

      const response = await POST(request)
      expect(response.status).toBe(201)
    })

    it("should reject invalid language value", async () => {
      const request = new NextRequest("http://localhost:3000/api/prompts", {
        method: "POST",
        body: JSON.stringify({
          title: "Test",
          body: "body",
          type: "USER",
          language: "zh", // Invalid: Chinese not in enum
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
      expect(response.json()).resolves.toEqual(
        expect.objectContaining({
          error: "Invalid input",
        })
      )
    })

    it("should create prompt without N:M relations (all arrays optional)", async () => {
      const mockPrompt = {
        id: "test-id",
        title: "Test Prompt",
        body: "Test body",
        type: "USER",
        language: "en",
        status: "DRAFT",
        platforms: [],
        categories: [],
        tags: [],
        user: { id: "test-user-id", name: "Test", email: "test@example.com" },
      }

      ;(prisma.prompt.create as jest.Mock).mockResolvedValue(mockPrompt)

      const request = new NextRequest("http://localhost:3000/api/prompts", {
        method: "POST",
        body: JSON.stringify({
          title: "Test Prompt",
          body: "Test body",
          type: "USER",
          language: "en",
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(201)
    })
  })

  interface MockPrismaTransaction {
    prompt: {
      update: jest.Mock;
    };
    promptTag: {
      deleteMany: jest.Mock;
    };
    promptCategory: {
      deleteMany: jest.Mock;
    };
    promptPlatform: {
      deleteMany: jest.Mock;
    };
    promptClientProject: {
      deleteMany: jest.Mock;
    };
    promptUseCase: {
      deleteMany: jest.Mock;
    };
    promptModelHint: {
      deleteMany: jest.Mock;
    };
  }

  describe("PUT with $transaction", () => {
    let mockTx: MockPrismaTransaction

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
      // Mock checkOwnership to return authorized
      prisma.prompt.findUnique = jest.fn().mockResolvedValue({
        userId: "test-user-id",
      })

      // Setup mock transaction
      mockTx = {
        prompt: {
          update: jest.fn(),
        },
        promptTag: {
          deleteMany: jest.fn(),
        },
        promptCategory: {
          deleteMany: jest.fn(),
        },
        promptPlatform: {
          deleteMany: jest.fn(),
        },
        promptClientProject: {
          deleteMany: jest.fn(),
        },
        promptUseCase: {
          deleteMany: jest.fn(),
        },
        promptModelHint: {
          deleteMany: jest.fn(),
        },
      }

      ;(prisma.$transaction as jest.Mock).mockImplementation(async (fn) => {
        return await fn(mockTx)
      })
    })

    it("should update prompt with new platformIds using $transaction", async () => {
      const mockUpdatedPrompt = {
        id: "test-id",
        title: "Updated Prompt",
        body: "Updated body",
        type: "USER",
        language: "en",
        status: "DRAFT",
        platforms: [],
        categories: [],
        tags: [],
        user: {
          id: "test-user-id",
          name: "Test User",
          email: "test@example.com",
        },
      }

      mockTx.prompt.update.mockResolvedValue(mockUpdatedPrompt)

      const request = new NextRequest("http://localhost:3000/api/prompts/test-id", {
        method: "PUT",
        body: JSON.stringify({
          title: "Updated Prompt",
          platformIds: ["platform-new-1", "platform-new-2"],
        }),
      })

      const response = await PUT(request, { params: { id: "test-id" } })

      expect(response.status).toBe(200)
      expect(prisma.$transaction).toHaveBeenCalled()
      expect(mockTx.promptTag.deleteMany).toHaveBeenCalled()
      expect(mockTx.promptPlatform.deleteMany).toHaveBeenCalled()
    })

    it("should delete all platform relations when platformIds is empty array", async () => {
      const mockUpdatedPrompt = {
        id: "test-id",
        title: "Updated Prompt",
        body: "Updated body",
        type: "USER",
        language: "en",
        status: "DRAFT",
        platforms: [],
        categories: [],
        tags: [],
        user: { id: "test-user-id", name: "Test", email: "test@example.com" },
      }

      mockTx.prompt.update.mockResolvedValue(mockUpdatedPrompt)

      const request = new NextRequest("http://localhost:3000/api/prompts/test-id", {
        method: "PUT",
        body: JSON.stringify({
          title: "Updated Prompt",
          platformIds: [],
        }),
      })

      const response = await PUT(request, { params: { id: "test-id" } })

      expect(response.status).toBe(200)
      // Verify deleteMany was called for all relation tables
      expect(mockTx.promptPlatform.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { promptId: "test-id" },
        })
      )
    })

    it("should update with partial arrays without affecting other relations", async () => {
      const mockUpdatedPrompt = {
        id: "test-id",
        title: "Updated Prompt",
        body: "Updated body",
        type: "USER",
        language: "en",
        status: "DRAFT",
        platforms: [],
        categories: [],
        tags: [],
        user: { id: "test-user-id", name: "Test", email: "test@example.com" },
      }

      mockTx.prompt.update.mockResolvedValue(mockUpdatedPrompt)

      const request = new NextRequest("http://localhost:3000/api/prompts/test-id", {
        method: "PUT",
        body: JSON.stringify({
          title: "Updated Prompt",
          platformIds: ["platform-1"],
          // Not sending categoryIds, useCaseIds, etc.
        }),
      })

      const response = await PUT(request, { params: { id: "test-id" } })

      expect(response.status).toBe(200)
      // All deleteMany should be called (for all relation tables)
      expect(mockTx.promptTag.deleteMany).toHaveBeenCalled()
      expect(mockTx.promptCategory.deleteMany).toHaveBeenCalled()
      expect(mockTx.promptPlatform.deleteMany).toHaveBeenCalled()
    })
  })
})
