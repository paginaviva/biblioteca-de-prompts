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

// Mock auth module BEFORE importing the routes
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

// Mock Prisma BEFORE importing the routes. The catalog routes reach the
// database through the type/status/language delegates (new catalogs) and the
// platform/clientProject/useCase/modelHint delegates (existing N:M entities).
jest.mock("@/lib/prisma", () => {
  const model = () => ({
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  })
  return {
    prisma: {
      type: model(),
      status: model(),
      language: model(),
      platform: model(),
      clientProject: model(),
      useCase: model(),
      modelHint: model(),
    },
  }
})

import { GET as GETTypes, POST as POSTTypes } from "@/app/api/types/route"
import { PUT as PUTTypes, DELETE as DELETETypes } from "@/app/api/types/[id]/route"
import { GET as GETStatuses, POST as POSTStatuses } from "@/app/api/statuses/route"
import { PUT as PUTStatuses, DELETE as DELETEStatuses } from "@/app/api/statuses/[id]/route"
import { GET as GETLanguages, POST as POSTLanguages } from "@/app/api/languages/route"
import { PUT as PUTLanguages, DELETE as DELETELanguages } from "@/app/api/languages/[id]/route"
import { GET as GETPlatforms, POST as POSTPlatforms } from "@/app/api/platforms/route"
import { PUT as PUTPlatforms, DELETE as DELETEPlatforms } from "@/app/api/platforms/[id]/route"
import { GET as GETClientProjects, POST as POSTClientProjects } from "@/app/api/client-projects/route"
import { PUT as PUTClientProjects, DELETE as DELETEClientProjects } from "@/app/api/client-projects/[id]/route"
import { GET as GETUseCases, POST as POSTUseCases } from "@/app/api/use-cases/route"
import { PUT as PUTUseCases, DELETE as DELETEUseCases } from "@/app/api/use-cases/[id]/route"
import { GET as GETModelHints, POST as POSTModelHints } from "@/app/api/model-hints/route"
import { PUT as PUTModelHints, DELETE as DELETEModelHints } from "@/app/api/model-hints/[id]/route"
import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"

const adminSession = { user: { id: "admin-1", name: "Admin", role: "admin" } }
const userSession = { user: { id: "user-1", name: "Regular User", role: "user" } }

function jsonRequest(path: string, method: string, body?: unknown) {
  return new NextRequest(`http://localhost:3000${path}`, {
    method,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
}

describe("/api/types (catalog: prompt types)", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAuth.mockResolvedValue(adminSession)
  })

  describe("GET /api/types", () => {
    it("returns 401 unauthorized without a session", async () => {
      // Arrange
      mockAuth.mockResolvedValue(null)
      const request = jsonRequest("/api/types", "GET")

      // Act
      const response = await GETTypes(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
      expect(prisma.type.findMany).not.toHaveBeenCalled()
    })

    it("returns 200 with the type list for any authenticated role", async () => {
      // Arrange — the form and filters must read catalogs for every user
      mockAuth.mockResolvedValue(userSession)
      const types = [
        { id: "t1", name: "System", slug: "system", sortOrder: 1 },
        { id: "t2", name: "User", slug: "user", sortOrder: 2 },
      ]
      ;(prisma.type.findMany as jest.Mock).mockResolvedValue(types)
      const request = jsonRequest("/api/types", "GET")

      // Act
      const response = await GETTypes(request)
      const data = await response.json()

      // Assert — the route returns the raw array, sorted by sortOrder/name
      expect(response.status).toBe(200)
      expect(data).toEqual(types)
      expect(prisma.type.findMany).toHaveBeenCalledWith({
        where: undefined,
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      })
    })

    it("passes the search filter to findMany", async () => {
      // Arrange
      ;(prisma.type.findMany as jest.Mock).mockResolvedValue([])
      const request = jsonRequest("/api/types?search=sys", "GET")

      // Act
      const response = await GETTypes(request)

      // Assert — ?search= filters by name, case-insensitive
      expect(response.status).toBe(200)
      expect(prisma.type.findMany).toHaveBeenCalledWith({
        where: { name: { contains: "sys", mode: "insensitive" } },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      })
    })
  })

  describe("POST /api/types", () => {
    it("returns 401 unauthorized without a session", async () => {
      // Arrange
      mockAuth.mockResolvedValue(null)
      const request = jsonRequest("/api/types", "POST", { name: "System", slug: "system" })

      // Act
      const response = await POSTTypes(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
      expect(prisma.type.create).not.toHaveBeenCalled()
    })

    it("returns 401 unauthorized for a non-admin role", async () => {
      // Arrange — catalog management is admin-only
      mockAuth.mockResolvedValue(userSession)
      const request = jsonRequest("/api/types", "POST", { name: "System", slug: "system" })

      // Act
      const response = await POSTTypes(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
      expect(prisma.type.create).not.toHaveBeenCalled()
    })

    it("returns 201 and creates the type with a normalized slug", async () => {
      // Arrange — the slug is slugified before the uniqueness pre-check
      ;(prisma.type.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.type.create as jest.Mock).mockResolvedValue({
        id: "t9",
        name: "System",
        slug: "system",
        sortOrder: 1,
      })
      const request = jsonRequest("/api/types", "POST", {
        name: "System",
        slug: "system",
        sortOrder: 1,
      })

      // Act
      const response = await POSTTypes(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(201)
      expect(data).toEqual({ data: { id: "t9", name: "System", slug: "system", sortOrder: 1 }, success: true })
      expect(prisma.type.findUnique).toHaveBeenCalledWith({
        where: { slug: "system" },
        select: { id: true },
      })
      expect(prisma.type.create).toHaveBeenCalledWith({
        data: { name: "System", slug: "system", sortOrder: 1 },
      })
    })

    it("returns 409 slugAlreadyExists when the slug is taken", async () => {
      // Arrange — the pre-check finds an existing value with the slug
      ;(prisma.type.findUnique as jest.Mock).mockResolvedValue({ id: "t1" })
      const request = jsonRequest("/api/types", "POST", { name: "System", slug: "system" })

      // Act
      const response = await POSTTypes(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(409)
      expect(data.error).toBe("A value with this slug already exists")
      expect(prisma.type.create).not.toHaveBeenCalled()
    })
  })

  describe("PUT /api/types/[id]", () => {
    it("returns 401 unauthorized for a non-admin role", async () => {
      // Arrange
      mockAuth.mockResolvedValue(userSession)
      const request = jsonRequest("/api/types/type-1", "PUT", { name: "Renamed" })

      // Act
      const response = await PUTTypes(request, { params: { id: "type-1" } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
      expect(prisma.type.update).not.toHaveBeenCalled()
    })

    it("returns 404 typeNotFound when the target does not exist", async () => {
      // Arrange
      ;(prisma.type.findUnique as jest.Mock).mockResolvedValue(null)
      const request = jsonRequest("/api/types/ghost", "PUT", { name: "Renamed" })

      // Act
      const response = await PUTTypes(request, { params: { id: "ghost" } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(404)
      expect(data.error).toBe("Type not found")
      expect(prisma.type.update).not.toHaveBeenCalled()
    })

    it("returns 409 slugAlreadyExists when the slug belongs to another type", async () => {
      // Arrange — the value exists but another one already holds the slug
      ;(prisma.type.findUnique as jest.Mock)
        .mockResolvedValueOnce({ id: "type-1" })
        .mockResolvedValueOnce({ id: "type-9" })
      const request = jsonRequest("/api/types/type-1", "PUT", { slug: "system" })

      // Act
      const response = await PUTTypes(request, { params: { id: "type-1" } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(409)
      expect(data.error).toBe("A value with this slug already exists")
      expect(prisma.type.update).not.toHaveBeenCalled()
    })

    it("returns 200 and updates the type", async () => {
      // Arrange — the slug is not part of this update, so no uniqueness check
      ;(prisma.type.findUnique as jest.Mock).mockResolvedValue({ id: "type-1" })
      ;(prisma.type.update as jest.Mock).mockResolvedValue({
        id: "type-1",
        name: "Renamed",
        slug: "system",
      })
      const request = jsonRequest("/api/types/type-1", "PUT", { name: "Renamed" })

      // Act
      const response = await PUTTypes(request, { params: { id: "type-1" } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(prisma.type.update).toHaveBeenCalledWith({
        where: { id: "type-1" },
        data: { name: "Renamed" },
      })
    })
  })

  describe("DELETE /api/types/[id]", () => {
    it("returns 401 unauthorized for a non-admin role", async () => {
      // Arrange
      mockAuth.mockResolvedValue(userSession)
      const request = jsonRequest("/api/types/type-1", "DELETE")

      // Act
      const response = await DELETETypes(request, { params: { id: "type-1" } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
      expect(prisma.type.delete).not.toHaveBeenCalled()
    })

    it("returns 404 typeNotFound when the target does not exist", async () => {
      // Arrange
      ;(prisma.type.findUnique as jest.Mock).mockResolvedValue(null)
      const request = jsonRequest("/api/types/ghost", "DELETE")

      // Act
      const response = await DELETETypes(request, { params: { id: "ghost" } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(404)
      expect(data.error).toBe("Type not found")
      expect(prisma.type.delete).not.toHaveBeenCalled()
    })

    it("returns 200 with a message and deletes the catalog value", async () => {
      // Arrange — catalogs are plain values: prompts keep their string
      ;(prisma.type.findUnique as jest.Mock).mockResolvedValue({ id: "type-1" })
      ;(prisma.type.delete as jest.Mock).mockResolvedValue({ id: "type-1" })
      const request = jsonRequest("/api/types/type-1", "DELETE")

      // Act
      const response = await DELETETypes(request, { params: { id: "type-1" } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toEqual({
        data: { message: "Type deleted successfully" },
        success: true,
      })
      expect(prisma.type.delete).toHaveBeenCalledWith({
        where: { id: "type-1" },
      })
    })
  })
})

describe("/api/statuses (catalog: prompt statuses)", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAuth.mockResolvedValue(adminSession)
  })

  describe("GET /api/statuses", () => {
    it("returns 401 unauthorized without a session", async () => {
      // Arrange
      mockAuth.mockResolvedValue(null)
      const request = jsonRequest("/api/statuses", "GET")

      // Act
      const response = await GETStatuses(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
      expect(prisma.status.findMany).not.toHaveBeenCalled()
    })

    it("returns 200 with the status list for any authenticated role", async () => {
      // Arrange — filters read statuses for every user, not just admins
      mockAuth.mockResolvedValue(userSession)
      const statuses = [
        { id: "s1", name: "Draft", slug: "draft", sortOrder: 1 },
        { id: "s2", name: "Tested", slug: "tested", sortOrder: 2 },
      ]
      ;(prisma.status.findMany as jest.Mock).mockResolvedValue(statuses)
      const request = jsonRequest("/api/statuses", "GET")

      // Act
      const response = await GETStatuses(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toEqual(statuses)
      expect(prisma.status.findMany).toHaveBeenCalledWith({
        where: undefined,
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      })
    })
  })

  describe("POST /api/statuses", () => {
    it("returns 401 unauthorized for a non-admin role", async () => {
      // Arrange
      mockAuth.mockResolvedValue(userSession)
      const request = jsonRequest("/api/statuses", "POST", { name: "Tested", slug: "tested" })

      // Act
      const response = await POSTStatuses(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
      expect(prisma.status.create).not.toHaveBeenCalled()
    })

    it("returns 201 and creates the status with a normalized slug", async () => {
      // Arrange
      ;(prisma.status.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.status.create as jest.Mock).mockResolvedValue({
        id: "s9",
        name: "Tested",
        slug: "tested",
        sortOrder: 2,
      })
      const request = jsonRequest("/api/statuses", "POST", {
        name: "Tested",
        slug: "tested",
        sortOrder: 2,
      })

      // Act
      const response = await POSTStatuses(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(201)
      expect(data).toEqual({ data: { id: "s9", name: "Tested", slug: "tested", sortOrder: 2 }, success: true })
      expect(prisma.status.create).toHaveBeenCalledWith({
        data: { name: "Tested", slug: "tested", sortOrder: 2 },
      })
    })

    it("returns 409 slugAlreadyExists when the slug is taken", async () => {
      // Arrange
      ;(prisma.status.findUnique as jest.Mock).mockResolvedValue({ id: "s1" })
      const request = jsonRequest("/api/statuses", "POST", { name: "Tested", slug: "tested" })

      // Act
      const response = await POSTStatuses(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(409)
      expect(data.error).toBe("A value with this slug already exists")
      expect(prisma.status.create).not.toHaveBeenCalled()
    })
  })

  describe("PUT /api/statuses/[id]", () => {
    it("returns 401 unauthorized for a non-admin role", async () => {
      // Arrange
      mockAuth.mockResolvedValue(userSession)
      const request = jsonRequest("/api/statuses/status-1", "PUT", { name: "Renamed" })

      // Act
      const response = await PUTStatuses(request, { params: { id: "status-1" } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
      expect(prisma.status.update).not.toHaveBeenCalled()
    })

    it("returns 409 slugAlreadyExists when the slug belongs to another status", async () => {
      // Arrange
      ;(prisma.status.findUnique as jest.Mock)
        .mockResolvedValueOnce({ id: "status-1" })
        .mockResolvedValueOnce({ id: "status-9" })
      const request = jsonRequest("/api/statuses/status-1", "PUT", { slug: "tested" })

      // Act
      const response = await PUTStatuses(request, { params: { id: "status-1" } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(409)
      expect(data.error).toBe("A value with this slug already exists")
      expect(prisma.status.update).not.toHaveBeenCalled()
    })

    it("returns 200 and updates the status", async () => {
      // Arrange
      ;(prisma.status.findUnique as jest.Mock).mockResolvedValue({ id: "status-1" })
      ;(prisma.status.update as jest.Mock).mockResolvedValue({
        id: "status-1",
        name: "Renamed",
        slug: "tested",
      })
      const request = jsonRequest("/api/statuses/status-1", "PUT", { name: "Renamed" })

      // Act
      const response = await PUTStatuses(request, { params: { id: "status-1" } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(prisma.status.update).toHaveBeenCalledWith({
        where: { id: "status-1" },
        data: { name: "Renamed" },
      })
    })
  })

  describe("DELETE /api/statuses/[id]", () => {
    it("returns 401 unauthorized for a non-admin role", async () => {
      // Arrange
      mockAuth.mockResolvedValue(userSession)
      const request = jsonRequest("/api/statuses/status-1", "DELETE")

      // Act
      const response = await DELETEStatuses(request, { params: { id: "status-1" } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
      expect(prisma.status.delete).not.toHaveBeenCalled()
    })

    it("returns 200 with a message and deletes the catalog value", async () => {
      // Arrange — deleting a status never touches existing prompts
      ;(prisma.status.findUnique as jest.Mock).mockResolvedValue({ id: "status-1" })
      ;(prisma.status.delete as jest.Mock).mockResolvedValue({ id: "status-1" })
      const request = jsonRequest("/api/statuses/status-1", "DELETE")

      // Act
      const response = await DELETEStatuses(request, { params: { id: "status-1" } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toEqual({
        data: { message: "Status deleted successfully" },
        success: true,
      })
      expect(prisma.status.delete).toHaveBeenCalledWith({
        where: { id: "status-1" },
      })
    })
  })
})

describe("/api/languages (catalog: prompt languages)", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAuth.mockResolvedValue(adminSession)
  })

  describe("GET /api/languages", () => {
    it("returns 401 unauthorized without a session", async () => {
      // Arrange
      mockAuth.mockResolvedValue(null)
      const request = jsonRequest("/api/languages", "GET")

      // Act
      const response = await GETLanguages(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
      expect(prisma.language.findMany).not.toHaveBeenCalled()
    })

    it("returns 200 with the language list for any authenticated role", async () => {
      // Arrange — the prompt form reads languages for every user
      mockAuth.mockResolvedValue(userSession)
      const languages = [
        { id: "l1", name: "English", slug: "english", sortOrder: 1 },
        { id: "l2", name: "Spanish", slug: "spanish", sortOrder: 2 },
      ]
      ;(prisma.language.findMany as jest.Mock).mockResolvedValue(languages)
      const request = jsonRequest("/api/languages", "GET")

      // Act
      const response = await GETLanguages(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toEqual(languages)
      expect(prisma.language.findMany).toHaveBeenCalledWith({
        where: undefined,
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      })
    })
  })

  describe("POST /api/languages", () => {
    it("returns 401 unauthorized for a non-admin role", async () => {
      // Arrange
      mockAuth.mockResolvedValue(userSession)
      const request = jsonRequest("/api/languages", "POST", { name: "English", slug: "english" })

      // Act
      const response = await POSTLanguages(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
      expect(prisma.language.create).not.toHaveBeenCalled()
    })

    it("returns 201 and creates the language with a normalized slug", async () => {
      // Arrange
      ;(prisma.language.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.language.create as jest.Mock).mockResolvedValue({
        id: "l9",
        name: "English",
        slug: "english",
        sortOrder: 1,
      })
      const request = jsonRequest("/api/languages", "POST", {
        name: "English",
        slug: "english",
        sortOrder: 1,
      })

      // Act
      const response = await POSTLanguages(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(201)
      expect(data).toEqual({ data: { id: "l9", name: "English", slug: "english", sortOrder: 1 }, success: true })
      expect(prisma.language.create).toHaveBeenCalledWith({
        data: { name: "English", slug: "english", sortOrder: 1 },
      })
    })

    it("returns 409 slugAlreadyExists when the slug is taken", async () => {
      // Arrange
      ;(prisma.language.findUnique as jest.Mock).mockResolvedValue({ id: "l1" })
      const request = jsonRequest("/api/languages", "POST", { name: "English", slug: "english" })

      // Act
      const response = await POSTLanguages(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(409)
      expect(data.error).toBe("A value with this slug already exists")
      expect(prisma.language.create).not.toHaveBeenCalled()
    })
  })

  describe("PUT /api/languages/[id]", () => {
    it("returns 401 unauthorized for a non-admin role", async () => {
      // Arrange
      mockAuth.mockResolvedValue(userSession)
      const request = jsonRequest("/api/languages/language-1", "PUT", { name: "Renamed" })

      // Act
      const response = await PUTLanguages(request, { params: { id: "language-1" } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
      expect(prisma.language.update).not.toHaveBeenCalled()
    })

    it("returns 409 slugAlreadyExists when the slug belongs to another language", async () => {
      // Arrange
      ;(prisma.language.findUnique as jest.Mock)
        .mockResolvedValueOnce({ id: "language-1" })
        .mockResolvedValueOnce({ id: "language-9" })
      const request = jsonRequest("/api/languages/language-1", "PUT", { slug: "english" })

      // Act
      const response = await PUTLanguages(request, { params: { id: "language-1" } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(409)
      expect(data.error).toBe("A value with this slug already exists")
      expect(prisma.language.update).not.toHaveBeenCalled()
    })

    it("returns 200 and updates the language", async () => {
      // Arrange
      ;(prisma.language.findUnique as jest.Mock).mockResolvedValue({ id: "language-1" })
      ;(prisma.language.update as jest.Mock).mockResolvedValue({
        id: "language-1",
        name: "Renamed",
        slug: "english",
      })
      const request = jsonRequest("/api/languages/language-1", "PUT", { name: "Renamed" })

      // Act
      const response = await PUTLanguages(request, { params: { id: "language-1" } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(prisma.language.update).toHaveBeenCalledWith({
        where: { id: "language-1" },
        data: { name: "Renamed" },
      })
    })
  })

  describe("DELETE /api/languages/[id]", () => {
    it("returns 401 unauthorized for a non-admin role", async () => {
      // Arrange
      mockAuth.mockResolvedValue(userSession)
      const request = jsonRequest("/api/languages/language-1", "DELETE")

      // Act
      const response = await DELETELanguages(request, { params: { id: "language-1" } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
      expect(prisma.language.delete).not.toHaveBeenCalled()
    })

    it("returns 200 with a message and deletes the catalog value", async () => {
      // Arrange — deleting a language never touches existing prompts
      ;(prisma.language.findUnique as jest.Mock).mockResolvedValue({ id: "language-1" })
      ;(prisma.language.delete as jest.Mock).mockResolvedValue({ id: "language-1" })
      const request = jsonRequest("/api/languages/language-1", "DELETE")

      // Act
      const response = await DELETELanguages(request, { params: { id: "language-1" } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toEqual({
        data: { message: "Language deleted successfully" },
        success: true,
      })
      expect(prisma.language.delete).toHaveBeenCalledWith({
        where: { id: "language-1" },
      })
    })
  })
})

describe("/api/platforms (N:M entity, admin-managed)", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAuth.mockResolvedValue(adminSession)
  })

  describe("GET /api/platforms", () => {
    it("returns 401 unauthorized without a session", async () => {
      // Arrange
      mockAuth.mockResolvedValue(null)
      const request = jsonRequest("/api/platforms", "GET")

      // Act
      const response = await GETPlatforms(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
      expect(prisma.platform.findMany).not.toHaveBeenCalled()
    })

    it("returns 200 with the platform list for any authenticated role", async () => {
      // Arrange — prompts select platforms, so any logged-in user may read
      mockAuth.mockResolvedValue(userSession)
      const platforms = [
        { id: "p1", name: "CHATGPT", slug: "chatgpt", _count: { prompts: 2 } },
      ]
      ;(prisma.platform.findMany as jest.Mock).mockResolvedValue(platforms)
      const request = jsonRequest("/api/platforms", "GET")

      // Act
      const response = await GETPlatforms(request)
      const data = await response.json()

      // Assert — the prompt count is scoped to the session user
      expect(response.status).toBe(200)
      expect(data).toEqual(platforms)
      expect(prisma.platform.findMany).toHaveBeenCalledWith({
        where: undefined,
        include: {
          _count: {
            select: {
              prompts: {
                where: { prompt: { userId: "user-1" } },
              },
            },
          },
        },
        orderBy: { name: "asc" },
      })
    })
  })

  describe("POST /api/platforms", () => {
    it("returns 401 unauthorized without a session", async () => {
      // Arrange
      mockAuth.mockResolvedValue(null)
      const request = jsonRequest("/api/platforms", "POST", { name: "Cursor" })

      // Act
      const response = await POSTPlatforms(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
      expect(prisma.platform.create).not.toHaveBeenCalled()
    })

    it("returns 401 unauthorized for a non-admin role (security fix)", async () => {
      // Arrange — POST was previously open to any user; it is admin-only now
      mockAuth.mockResolvedValue(userSession)
      const request = jsonRequest("/api/platforms", "POST", { name: "Cursor" })

      // Act
      const response = await POSTPlatforms(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
      expect(prisma.platform.findUnique).not.toHaveBeenCalled()
      expect(prisma.platform.create).not.toHaveBeenCalled()
    })

    it("returns 201 and creates the platform with a normalized name and slug", async () => {
      // Arrange — the name is uppercased and the slug derived from it
      ;(prisma.platform.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.platform.create as jest.Mock).mockResolvedValue({
        id: "p9",
        name: "CHATGPT",
        slug: "chatgpt",
      })
      const request = jsonRequest("/api/platforms", "POST", { name: "ChatGPT" })

      // Act
      const response = await POSTPlatforms(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(201)
      expect(data).toEqual({ data: { id: "p9", name: "CHATGPT", slug: "chatgpt" }, success: true })
      expect(prisma.platform.findUnique).toHaveBeenCalledWith({
        where: { slug: "chatgpt" },
        select: { id: true },
      })
      expect(prisma.platform.create).toHaveBeenCalledWith({
        data: { name: "CHATGPT", slug: "chatgpt" },
      })
    })

    it("returns 409 slugAlreadyExists when the slug is taken", async () => {
      // Arrange
      ;(prisma.platform.findUnique as jest.Mock).mockResolvedValue({ id: "p1" })
      const request = jsonRequest("/api/platforms", "POST", { name: "ChatGPT" })

      // Act
      const response = await POSTPlatforms(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(409)
      expect(data.error).toBe("A value with this slug already exists")
      expect(prisma.platform.create).not.toHaveBeenCalled()
    })
  })

  describe("PUT /api/platforms/[id]", () => {
    it("returns 401 unauthorized for a non-admin role", async () => {
      // Arrange
      mockAuth.mockResolvedValue(userSession)
      const request = jsonRequest("/api/platforms/platform-1", "PUT", { name: "Renamed" })

      // Act
      const response = await PUTPlatforms(request, { params: { id: "platform-1" } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
      expect(prisma.platform.update).not.toHaveBeenCalled()
    })

    it("returns 200 and updates the platform", async () => {
      // Arrange
      ;(prisma.platform.findUnique as jest.Mock).mockResolvedValue({ id: "platform-1" })
      ;(prisma.platform.update as jest.Mock).mockResolvedValue({
        id: "platform-1",
        name: "Renamed",
        slug: "renamed",
      })
      const request = jsonRequest("/api/platforms/platform-1", "PUT", { name: "Renamed" })

      // Act
      const response = await PUTPlatforms(request, { params: { id: "platform-1" } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(prisma.platform.update).toHaveBeenCalledWith({
        where: { id: "platform-1" },
        data: { name: "Renamed" },
      })
    })
  })

  describe("DELETE /api/platforms/[id]", () => {
    it("returns 401 unauthorized for a non-admin role", async () => {
      // Arrange
      mockAuth.mockResolvedValue(userSession)
      const request = jsonRequest("/api/platforms/platform-1", "DELETE")

      // Act
      const response = await DELETEPlatforms(request, { params: { id: "platform-1" } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
      expect(prisma.platform.delete).not.toHaveBeenCalled()
    })

    it("returns 200 with a message and deletes the platform (junctions cascade)", async () => {
      // Arrange — PromptPlatform rows cascade from this side, so only the
      // platform row itself is deleted and prompts keep their other relations
      ;(prisma.platform.findUnique as jest.Mock).mockResolvedValue({ id: "platform-1" })
      ;(prisma.platform.delete as jest.Mock).mockResolvedValue({ id: "platform-1" })
      const request = jsonRequest("/api/platforms/platform-1", "DELETE")

      // Act
      const response = await DELETEPlatforms(request, { params: { id: "platform-1" } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toEqual({
        data: { message: "Platform deleted successfully" },
        success: true,
      })
      expect(prisma.platform.delete).toHaveBeenCalledWith({
        where: { id: "platform-1" },
      })
    })
  })
})

describe("/api/client-projects (N:M entity, admin-managed)", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAuth.mockResolvedValue(adminSession)
  })

  describe("GET /api/client-projects", () => {
    it("returns 401 unauthorized without a session", async () => {
      // Arrange
      mockAuth.mockResolvedValue(null)
      const request = jsonRequest("/api/client-projects", "GET")

      // Act
      const response = await GETClientProjects(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
      expect(prisma.clientProject.findMany).not.toHaveBeenCalled()
    })

    it("returns 200 with the client/project list for any authenticated role", async () => {
      // Arrange — prompts select client/projects, so any logged-in user may read
      mockAuth.mockResolvedValue(userSession)
      const clientProjects = [
        { id: "cp1", name: "ACME CORP", slug: "acme-corp", _count: { prompts: 2 } },
      ]
      ;(prisma.clientProject.findMany as jest.Mock).mockResolvedValue(clientProjects)
      const request = jsonRequest("/api/client-projects", "GET")

      // Act
      const response = await GETClientProjects(request)
      const data = await response.json()

      // Assert — the prompt count is scoped to the session user
      expect(response.status).toBe(200)
      expect(data).toEqual(clientProjects)
      expect(prisma.clientProject.findMany).toHaveBeenCalledWith({
        where: undefined,
        include: {
          _count: {
            select: {
              prompts: {
                where: { prompt: { userId: "user-1" } },
              },
            },
          },
        },
        orderBy: { name: "asc" },
      })
    })
  })

  describe("POST /api/client-projects", () => {
    it("returns 401 unauthorized without a session", async () => {
      // Arrange
      mockAuth.mockResolvedValue(null)
      const request = jsonRequest("/api/client-projects", "POST", { name: "Acme Corp" })

      // Act
      const response = await POSTClientProjects(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
      expect(prisma.clientProject.create).not.toHaveBeenCalled()
    })

    it("returns 401 unauthorized for a non-admin role (security fix)", async () => {
      // Arrange — POST was previously open to any user; it is admin-only now
      mockAuth.mockResolvedValue(userSession)
      const request = jsonRequest("/api/client-projects", "POST", { name: "Acme Corp" })

      // Act
      const response = await POSTClientProjects(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
      expect(prisma.clientProject.findUnique).not.toHaveBeenCalled()
      expect(prisma.clientProject.create).not.toHaveBeenCalled()
    })

    it("returns 201 and creates the client/project with a normalized name and slug", async () => {
      // Arrange — the name is uppercased and the slug derived from it
      ;(prisma.clientProject.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.clientProject.create as jest.Mock).mockResolvedValue({
        id: "cp9",
        name: "ACME CORP",
        slug: "acme-corp",
      })
      const request = jsonRequest("/api/client-projects", "POST", { name: "Acme Corp" })

      // Act
      const response = await POSTClientProjects(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(201)
      expect(data).toEqual({ data: { id: "cp9", name: "ACME CORP", slug: "acme-corp" }, success: true })
      expect(prisma.clientProject.findUnique).toHaveBeenCalledWith({
        where: { slug: "acme-corp" },
        select: { id: true },
      })
      expect(prisma.clientProject.create).toHaveBeenCalledWith({
        data: { name: "ACME CORP", slug: "acme-corp" },
      })
    })

    it("returns 409 slugAlreadyExists when the slug is taken", async () => {
      // Arrange
      ;(prisma.clientProject.findUnique as jest.Mock).mockResolvedValue({ id: "cp1" })
      const request = jsonRequest("/api/client-projects", "POST", { name: "Acme Corp" })

      // Act
      const response = await POSTClientProjects(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(409)
      expect(data.error).toBe("A value with this slug already exists")
      expect(prisma.clientProject.create).not.toHaveBeenCalled()
    })
  })

  describe("PUT /api/client-projects/[id]", () => {
    it("returns 401 unauthorized for a non-admin role", async () => {
      // Arrange
      mockAuth.mockResolvedValue(userSession)
      const request = jsonRequest("/api/client-projects/client-project-1", "PUT", { name: "Renamed" })

      // Act
      const response = await PUTClientProjects(request, { params: { id: "client-project-1" } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
      expect(prisma.clientProject.update).not.toHaveBeenCalled()
    })

    it("returns 404 clientProjectNotFound when the target does not exist", async () => {
      // Arrange
      ;(prisma.clientProject.findUnique as jest.Mock).mockResolvedValue(null)
      const request = jsonRequest("/api/client-projects/ghost", "PUT", { name: "Renamed" })

      // Act
      const response = await PUTClientProjects(request, { params: { id: "ghost" } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(404)
      expect(data.error).toBe("Client/project not found")
      expect(prisma.clientProject.update).not.toHaveBeenCalled()
    })

    it("returns 409 slugAlreadyExists when the slug belongs to another client/project", async () => {
      // Arrange — the value exists but another one already holds the slug
      ;(prisma.clientProject.findUnique as jest.Mock)
        .mockResolvedValueOnce({ id: "client-project-1" })
        .mockResolvedValueOnce({ id: "client-project-9" })
      const request = jsonRequest("/api/client-projects/client-project-1", "PUT", { slug: "acme-corp" })

      // Act
      const response = await PUTClientProjects(request, { params: { id: "client-project-1" } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(409)
      expect(data.error).toBe("A value with this slug already exists")
      expect(prisma.clientProject.update).not.toHaveBeenCalled()
    })

    it("returns 200 and updates the client/project", async () => {
      // Arrange — the slug is not part of this update, so no uniqueness check
      ;(prisma.clientProject.findUnique as jest.Mock).mockResolvedValue({ id: "client-project-1" })
      ;(prisma.clientProject.update as jest.Mock).mockResolvedValue({
        id: "client-project-1",
        name: "Renamed",
        slug: "renamed",
      })
      const request = jsonRequest("/api/client-projects/client-project-1", "PUT", { name: "Renamed" })

      // Act
      const response = await PUTClientProjects(request, { params: { id: "client-project-1" } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(prisma.clientProject.update).toHaveBeenCalledWith({
        where: { id: "client-project-1" },
        data: { name: "Renamed" },
      })
    })
  })

  describe("DELETE /api/client-projects/[id]", () => {
    it("returns 401 unauthorized for a non-admin role", async () => {
      // Arrange
      mockAuth.mockResolvedValue(userSession)
      const request = jsonRequest("/api/client-projects/client-project-1", "DELETE")

      // Act
      const response = await DELETEClientProjects(request, { params: { id: "client-project-1" } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
      expect(prisma.clientProject.delete).not.toHaveBeenCalled()
    })

    it("returns 404 clientProjectNotFound when the target does not exist", async () => {
      // Arrange
      ;(prisma.clientProject.findUnique as jest.Mock).mockResolvedValue(null)
      const request = jsonRequest("/api/client-projects/ghost", "DELETE")

      // Act
      const response = await DELETEClientProjects(request, { params: { id: "ghost" } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(404)
      expect(data.error).toBe("Client/project not found")
      expect(prisma.clientProject.delete).not.toHaveBeenCalled()
    })

    it("returns 200 with a message and deletes the client/project (junctions cascade)", async () => {
      // Arrange — PromptClientProject rows cascade from this side, so only the
      // client/project row itself is deleted and prompts keep their relations
      ;(prisma.clientProject.findUnique as jest.Mock).mockResolvedValue({ id: "client-project-1" })
      ;(prisma.clientProject.delete as jest.Mock).mockResolvedValue({ id: "client-project-1" })
      const request = jsonRequest("/api/client-projects/client-project-1", "DELETE")

      // Act
      const response = await DELETEClientProjects(request, { params: { id: "client-project-1" } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toEqual({
        data: { message: "Client/project deleted successfully" },
        success: true,
      })
      expect(prisma.clientProject.delete).toHaveBeenCalledWith({
        where: { id: "client-project-1" },
      })
    })
  })
})

describe("/api/use-cases (N:M entity, admin-managed)", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAuth.mockResolvedValue(adminSession)
  })

  describe("GET /api/use-cases", () => {
    it("returns 401 unauthorized without a session", async () => {
      // Arrange
      mockAuth.mockResolvedValue(null)
      const request = jsonRequest("/api/use-cases", "GET")

      // Act
      const response = await GETUseCases(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
      expect(prisma.useCase.findMany).not.toHaveBeenCalled()
    })

    it("returns 200 with the use case list for any authenticated role", async () => {
      // Arrange — prompts select use cases, so any logged-in user may read
      mockAuth.mockResolvedValue(userSession)
      const useCases = [
        { id: "u1", name: "CONTENT WRITING", slug: "content-writing", _count: { prompts: 2 } },
      ]
      ;(prisma.useCase.findMany as jest.Mock).mockResolvedValue(useCases)
      const request = jsonRequest("/api/use-cases", "GET")

      // Act
      const response = await GETUseCases(request)
      const data = await response.json()

      // Assert — the prompt count is scoped to the session user
      expect(response.status).toBe(200)
      expect(data).toEqual(useCases)
      expect(prisma.useCase.findMany).toHaveBeenCalledWith({
        where: undefined,
        include: {
          _count: {
            select: {
              prompts: {
                where: { prompt: { userId: "user-1" } },
              },
            },
          },
        },
        orderBy: { name: "asc" },
      })
    })
  })

  describe("POST /api/use-cases", () => {
    it("returns 401 unauthorized without a session", async () => {
      // Arrange
      mockAuth.mockResolvedValue(null)
      const request = jsonRequest("/api/use-cases", "POST", { name: "Content Writing" })

      // Act
      const response = await POSTUseCases(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
      expect(prisma.useCase.create).not.toHaveBeenCalled()
    })

    it("returns 401 unauthorized for a non-admin role (security fix)", async () => {
      // Arrange — POST was previously open to any user; it is admin-only now
      mockAuth.mockResolvedValue(userSession)
      const request = jsonRequest("/api/use-cases", "POST", { name: "Content Writing" })

      // Act
      const response = await POSTUseCases(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
      expect(prisma.useCase.findUnique).not.toHaveBeenCalled()
      expect(prisma.useCase.create).not.toHaveBeenCalled()
    })

    it("returns 201 and creates the use case with a normalized name and slug", async () => {
      // Arrange — the name is uppercased and the slug derived from it
      ;(prisma.useCase.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.useCase.create as jest.Mock).mockResolvedValue({
        id: "u9",
        name: "CONTENT WRITING",
        slug: "content-writing",
      })
      const request = jsonRequest("/api/use-cases", "POST", { name: "Content Writing" })

      // Act
      const response = await POSTUseCases(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(201)
      expect(data).toEqual({ data: { id: "u9", name: "CONTENT WRITING", slug: "content-writing" }, success: true })
      expect(prisma.useCase.findUnique).toHaveBeenCalledWith({
        where: { slug: "content-writing" },
        select: { id: true },
      })
      expect(prisma.useCase.create).toHaveBeenCalledWith({
        data: { name: "CONTENT WRITING", slug: "content-writing" },
      })
    })

    it("returns 409 slugAlreadyExists when the slug is taken", async () => {
      // Arrange
      ;(prisma.useCase.findUnique as jest.Mock).mockResolvedValue({ id: "u1" })
      const request = jsonRequest("/api/use-cases", "POST", { name: "Content Writing" })

      // Act
      const response = await POSTUseCases(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(409)
      expect(data.error).toBe("A value with this slug already exists")
      expect(prisma.useCase.create).not.toHaveBeenCalled()
    })
  })

  describe("PUT /api/use-cases/[id]", () => {
    it("returns 401 unauthorized for a non-admin role", async () => {
      // Arrange
      mockAuth.mockResolvedValue(userSession)
      const request = jsonRequest("/api/use-cases/use-case-1", "PUT", { name: "Renamed" })

      // Act
      const response = await PUTUseCases(request, { params: { id: "use-case-1" } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
      expect(prisma.useCase.update).not.toHaveBeenCalled()
    })

    it("returns 404 useCaseNotFound when the target does not exist", async () => {
      // Arrange
      ;(prisma.useCase.findUnique as jest.Mock).mockResolvedValue(null)
      const request = jsonRequest("/api/use-cases/ghost", "PUT", { name: "Renamed" })

      // Act
      const response = await PUTUseCases(request, { params: { id: "ghost" } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(404)
      expect(data.error).toBe("Use case not found")
      expect(prisma.useCase.update).not.toHaveBeenCalled()
    })

    it("returns 409 slugAlreadyExists when the slug belongs to another use case", async () => {
      // Arrange — the value exists but another one already holds the slug
      ;(prisma.useCase.findUnique as jest.Mock)
        .mockResolvedValueOnce({ id: "use-case-1" })
        .mockResolvedValueOnce({ id: "use-case-9" })
      const request = jsonRequest("/api/use-cases/use-case-1", "PUT", { slug: "content-writing" })

      // Act
      const response = await PUTUseCases(request, { params: { id: "use-case-1" } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(409)
      expect(data.error).toBe("A value with this slug already exists")
      expect(prisma.useCase.update).not.toHaveBeenCalled()
    })

    it("returns 200 and updates the use case", async () => {
      // Arrange — the slug is not part of this update, so no uniqueness check
      ;(prisma.useCase.findUnique as jest.Mock).mockResolvedValue({ id: "use-case-1" })
      ;(prisma.useCase.update as jest.Mock).mockResolvedValue({
        id: "use-case-1",
        name: "Renamed",
        slug: "renamed",
      })
      const request = jsonRequest("/api/use-cases/use-case-1", "PUT", { name: "Renamed" })

      // Act
      const response = await PUTUseCases(request, { params: { id: "use-case-1" } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(prisma.useCase.update).toHaveBeenCalledWith({
        where: { id: "use-case-1" },
        data: { name: "Renamed" },
      })
    })
  })

  describe("DELETE /api/use-cases/[id]", () => {
    it("returns 401 unauthorized for a non-admin role", async () => {
      // Arrange
      mockAuth.mockResolvedValue(userSession)
      const request = jsonRequest("/api/use-cases/use-case-1", "DELETE")

      // Act
      const response = await DELETEUseCases(request, { params: { id: "use-case-1" } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
      expect(prisma.useCase.delete).not.toHaveBeenCalled()
    })

    it("returns 404 useCaseNotFound when the target does not exist", async () => {
      // Arrange
      ;(prisma.useCase.findUnique as jest.Mock).mockResolvedValue(null)
      const request = jsonRequest("/api/use-cases/ghost", "DELETE")

      // Act
      const response = await DELETEUseCases(request, { params: { id: "ghost" } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(404)
      expect(data.error).toBe("Use case not found")
      expect(prisma.useCase.delete).not.toHaveBeenCalled()
    })

    it("returns 200 with a message and deletes the use case (junctions cascade)", async () => {
      // Arrange — PromptUseCase rows cascade from this side, so only the
      // use case row itself is deleted and prompts keep their relations
      ;(prisma.useCase.findUnique as jest.Mock).mockResolvedValue({ id: "use-case-1" })
      ;(prisma.useCase.delete as jest.Mock).mockResolvedValue({ id: "use-case-1" })
      const request = jsonRequest("/api/use-cases/use-case-1", "DELETE")

      // Act
      const response = await DELETEUseCases(request, { params: { id: "use-case-1" } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toEqual({
        data: { message: "Use case deleted successfully" },
        success: true,
      })
      expect(prisma.useCase.delete).toHaveBeenCalledWith({
        where: { id: "use-case-1" },
      })
    })
  })
})

describe("/api/model-hints (N:M entity, admin-managed)", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAuth.mockResolvedValue(adminSession)
  })

  describe("GET /api/model-hints", () => {
    it("returns 401 unauthorized without a session", async () => {
      // Arrange
      mockAuth.mockResolvedValue(null)
      const request = jsonRequest("/api/model-hints", "GET")

      // Act
      const response = await GETModelHints(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
      expect(prisma.modelHint.findMany).not.toHaveBeenCalled()
    })

    it("returns 200 with the model hint list for any authenticated role", async () => {
      // Arrange — prompts select model hints, so any logged-in user may read
      mockAuth.mockResolvedValue(userSession)
      const modelHints = [
        { id: "mh1", name: "SUMMARIZE", slug: "summarize", _count: { prompts: 2 } },
      ]
      ;(prisma.modelHint.findMany as jest.Mock).mockResolvedValue(modelHints)
      const request = jsonRequest("/api/model-hints", "GET")

      // Act
      const response = await GETModelHints(request)
      const data = await response.json()

      // Assert — the prompt count is scoped to the session user
      expect(response.status).toBe(200)
      expect(data).toEqual(modelHints)
      expect(prisma.modelHint.findMany).toHaveBeenCalledWith({
        where: undefined,
        include: {
          _count: {
            select: {
              prompts: {
                where: { prompt: { userId: "user-1" } },
              },
            },
          },
        },
        orderBy: { name: "asc" },
      })
    })
  })

  describe("POST /api/model-hints", () => {
    it("returns 401 unauthorized without a session", async () => {
      // Arrange
      mockAuth.mockResolvedValue(null)
      const request = jsonRequest("/api/model-hints", "POST", { name: "Summarize" })

      // Act
      const response = await POSTModelHints(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
      expect(prisma.modelHint.create).not.toHaveBeenCalled()
    })

    it("returns 401 unauthorized for a non-admin role (security fix)", async () => {
      // Arrange — POST was previously open to any user; it is admin-only now
      mockAuth.mockResolvedValue(userSession)
      const request = jsonRequest("/api/model-hints", "POST", { name: "Summarize" })

      // Act
      const response = await POSTModelHints(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
      expect(prisma.modelHint.findUnique).not.toHaveBeenCalled()
      expect(prisma.modelHint.create).not.toHaveBeenCalled()
    })

    it("returns 201 and creates the model hint with a normalized name and slug", async () => {
      // Arrange — the name is uppercased and the slug derived from it
      ;(prisma.modelHint.findUnique as jest.Mock).mockResolvedValue(null)
      ;(prisma.modelHint.create as jest.Mock).mockResolvedValue({
        id: "mh9",
        name: "SUMMARIZE",
        slug: "summarize",
      })
      const request = jsonRequest("/api/model-hints", "POST", { name: "Summarize" })

      // Act
      const response = await POSTModelHints(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(201)
      expect(data).toEqual({ data: { id: "mh9", name: "SUMMARIZE", slug: "summarize" }, success: true })
      expect(prisma.modelHint.findUnique).toHaveBeenCalledWith({
        where: { slug: "summarize" },
        select: { id: true },
      })
      expect(prisma.modelHint.create).toHaveBeenCalledWith({
        data: { name: "SUMMARIZE", slug: "summarize" },
      })
    })

    it("returns 409 slugAlreadyExists when the slug is taken", async () => {
      // Arrange
      ;(prisma.modelHint.findUnique as jest.Mock).mockResolvedValue({ id: "mh1" })
      const request = jsonRequest("/api/model-hints", "POST", { name: "Summarize" })

      // Act
      const response = await POSTModelHints(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(409)
      expect(data.error).toBe("A value with this slug already exists")
      expect(prisma.modelHint.create).not.toHaveBeenCalled()
    })
  })

  describe("PUT /api/model-hints/[id]", () => {
    it("returns 401 unauthorized for a non-admin role", async () => {
      // Arrange
      mockAuth.mockResolvedValue(userSession)
      const request = jsonRequest("/api/model-hints/model-hint-1", "PUT", { name: "Renamed" })

      // Act
      const response = await PUTModelHints(request, { params: { id: "model-hint-1" } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
      expect(prisma.modelHint.update).not.toHaveBeenCalled()
    })

    it("returns 404 modelHintNotFound when the target does not exist", async () => {
      // Arrange
      ;(prisma.modelHint.findUnique as jest.Mock).mockResolvedValue(null)
      const request = jsonRequest("/api/model-hints/ghost", "PUT", { name: "Renamed" })

      // Act
      const response = await PUTModelHints(request, { params: { id: "ghost" } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(404)
      expect(data.error).toBe("Model hint not found")
      expect(prisma.modelHint.update).not.toHaveBeenCalled()
    })

    it("returns 409 slugAlreadyExists when the slug belongs to another model hint", async () => {
      // Arrange — the value exists but another one already holds the slug
      ;(prisma.modelHint.findUnique as jest.Mock)
        .mockResolvedValueOnce({ id: "model-hint-1" })
        .mockResolvedValueOnce({ id: "model-hint-9" })
      const request = jsonRequest("/api/model-hints/model-hint-1", "PUT", { slug: "summarize" })

      // Act
      const response = await PUTModelHints(request, { params: { id: "model-hint-1" } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(409)
      expect(data.error).toBe("A value with this slug already exists")
      expect(prisma.modelHint.update).not.toHaveBeenCalled()
    })

    it("returns 200 and updates the model hint", async () => {
      // Arrange — the slug is not part of this update, so no uniqueness check
      ;(prisma.modelHint.findUnique as jest.Mock).mockResolvedValue({ id: "model-hint-1" })
      ;(prisma.modelHint.update as jest.Mock).mockResolvedValue({
        id: "model-hint-1",
        name: "Renamed",
        slug: "renamed",
      })
      const request = jsonRequest("/api/model-hints/model-hint-1", "PUT", { name: "Renamed" })

      // Act
      const response = await PUTModelHints(request, { params: { id: "model-hint-1" } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(prisma.modelHint.update).toHaveBeenCalledWith({
        where: { id: "model-hint-1" },
        data: { name: "Renamed" },
      })
    })
  })

  describe("DELETE /api/model-hints/[id]", () => {
    it("returns 401 unauthorized for a non-admin role", async () => {
      // Arrange
      mockAuth.mockResolvedValue(userSession)
      const request = jsonRequest("/api/model-hints/model-hint-1", "DELETE")

      // Act
      const response = await DELETEModelHints(request, { params: { id: "model-hint-1" } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
      expect(prisma.modelHint.delete).not.toHaveBeenCalled()
    })

    it("returns 404 modelHintNotFound when the target does not exist", async () => {
      // Arrange
      ;(prisma.modelHint.findUnique as jest.Mock).mockResolvedValue(null)
      const request = jsonRequest("/api/model-hints/ghost", "DELETE")

      // Act
      const response = await DELETEModelHints(request, { params: { id: "ghost" } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(404)
      expect(data.error).toBe("Model hint not found")
      expect(prisma.modelHint.delete).not.toHaveBeenCalled()
    })

    it("returns 200 with a message and deletes the model hint (junctions cascade)", async () => {
      // Arrange — PromptModelHint rows cascade from this side, so only the
      // model hint row itself is deleted and prompts keep their relations
      ;(prisma.modelHint.findUnique as jest.Mock).mockResolvedValue({ id: "model-hint-1" })
      ;(prisma.modelHint.delete as jest.Mock).mockResolvedValue({ id: "model-hint-1" })
      const request = jsonRequest("/api/model-hints/model-hint-1", "DELETE")

      // Act
      const response = await DELETEModelHints(request, { params: { id: "model-hint-1" } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toEqual({
        data: { message: "Model hint deleted successfully" },
        success: true,
      })
      expect(prisma.modelHint.delete).toHaveBeenCalledWith({
        where: { id: "model-hint-1" },
      })
    })
  })
})
