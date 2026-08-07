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

// Mock bcrypt BEFORE importing the routes
jest.mock("bcryptjs", () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}))

// Mock Prisma BEFORE importing the routes. The users routes reach the
// database through: user.findMany/findUnique/create/update/delete,
// user.count (inline isLastActiveAdmin helper), prompt.deleteMany and
// $transaction supports both forms: callback (serializable tx used by the
// admin mutations) and array (atomic user+prompts deletion).
jest.mock("@/lib/prisma", () => {
  const txClient = {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    prompt: {
      deleteMany: jest.fn(),
    },
  }
  return {
    prisma: {
      ...txClient,
      $transaction: jest.fn(async (arg: unknown, _options?: unknown) => {
        if (typeof arg === "function") {
          // Callback form: run with the transaction client.
          return (arg as (tx: typeof txClient) => Promise<unknown>)(txClient)
        }
        // Array form: resolve the operations in order.
        return Promise.all(arg as Promise<unknown>[])
      }),
    },
  }
})

import { GET, POST, PUT } from "@/app/api/users/route"
import { PATCH, DELETE } from "@/app/api/users/[id]/route"
import { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { Prisma } from "@prisma/client"

// Mirrors the select used by the routes so call assertions match exactly.
const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
}

const createUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  isActive: true,
}

const adminSession = { user: { id: "admin-1", name: "Admin", role: "admin" } }

describe("/api/users (admin user management)", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAuth.mockResolvedValue(adminSession)
  })

  describe("GET /api/users", () => {
    it("returns 401 unauthorized when the session user is not an admin", async () => {
      // Arrange — a regular user must not list accounts
      mockAuth.mockResolvedValue({ user: { id: "user-1", role: "user" } })
      const request = new NextRequest("http://localhost:3000/api/users")

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
      expect(prisma.user.findMany).not.toHaveBeenCalled()
    })

    it("returns 200 with the user list including isActive", async () => {
      // Arrange
      const users = [
        {
          id: "u1",
          name: "Admin One",
          email: "admin1@example.com",
          role: "admin",
          isActive: true,
          createdAt: new Date("2026-01-01"),
          updatedAt: new Date("2026-01-01"),
        },
        {
          id: "u2",
          name: "Regular User",
          email: "user@example.com",
          role: "user",
          isActive: false,
          createdAt: new Date("2026-02-01"),
          updatedAt: new Date("2026-02-01"),
        },
      ]
      ;(prisma.user.findMany as jest.Mock).mockResolvedValue(users)
      const request = new NextRequest("http://localhost:3000/api/users")

      // Act
      const response = await GET(request)
      const data = await response.json()

      // Assert — the payload carries the activation flag (needed by the
      // Users tab to render the active/inactive state)
      expect(response.status).toBe(200)
      expect(data.data).toHaveLength(2)
      expect(data.data[0]).toEqual(
        expect.objectContaining({ id: "u1", isActive: true })
      )
      expect(data.data[1]).toEqual(
        expect.objectContaining({ id: "u2", isActive: false })
      )
      expect(prisma.user.findMany).toHaveBeenCalledWith({
        select: userSelect,
        orderBy: { createdAt: "desc" },
      })
    })
  })

  describe("POST /api/users", () => {
    it("returns 401 unauthorized when the session user is not an admin", async () => {
      // Arrange
      mockAuth.mockResolvedValue({ user: { id: "user-1", role: "user" } })
      const request = new NextRequest("http://localhost:3000/api/users", {
        method: "POST",
        body: JSON.stringify({
          name: "New User",
          email: "new@example.com",
          password: "password123",
          role: "user",
        }),
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
      expect(prisma.user.create).not.toHaveBeenCalled()
    })

    it("returns 201 and creates the user with role and isActive: true", async () => {
      // Arrange — no account owns the email yet; the password is hashed
      // before persisting and the account starts active
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
      ;(bcrypt.hash as jest.Mock).mockResolvedValue("hashed_password")
      ;(prisma.user.create as jest.Mock).mockResolvedValue({
        id: "u9",
        name: "New User",
        email: "new@example.com",
        role: "user",
        isActive: true,
      })
      const request = new NextRequest("http://localhost:3000/api/users", {
        method: "POST",
        body: JSON.stringify({
          name: "New User",
          email: "new@example.com",
          password: "password123",
          role: "user",
        }),
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(201)
      expect(data).toEqual({
        data: {
          id: "u9",
          name: "New User",
          email: "new@example.com",
          role: "user",
          isActive: true,
        },
        success: true,
      })
      expect(bcrypt.hash).toHaveBeenCalledWith("password123", 10)
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          name: "New User",
          email: "new@example.com",
          password: "hashed_password",
          role: "user",
          isActive: true,
        },
        select: createUserSelect,
      })
    })

    it("returns 400 invalidInput for an invalid email", async () => {
      // Arrange — z.string().email() fails → ZodError → 400
      const request = new NextRequest("http://localhost:3000/api/users", {
        method: "POST",
        body: JSON.stringify({
          name: "New User",
          email: "not-an-email",
          password: "password123",
          role: "user",
        }),
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toBe("Invalid input")
      expect(prisma.user.findUnique).not.toHaveBeenCalled()
      expect(prisma.user.create).not.toHaveBeenCalled()
    })

    it("returns 409 emailAlreadyExists when the email is taken", async () => {
      // Arrange — the pre-check finds an existing account
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: "u1" })
      const request = new NextRequest("http://localhost:3000/api/users", {
        method: "POST",
        body: JSON.stringify({
          name: "New User",
          email: "taken@example.com",
          password: "password123",
          role: "user",
        }),
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(409)
      expect(data.error).toBe("User with this email already exists")
      expect(prisma.user.create).not.toHaveBeenCalled()
    })

    it("returns 409 emailAlreadyExists when create hits the unique constraint (race)", async () => {
      // Arrange — the pre-check passes but a concurrent request inserts
      // the same email first, so create throws P2002
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
      ;(bcrypt.hash as jest.Mock).mockResolvedValue("hashed_password")
      ;(prisma.user.create as jest.Mock).mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError(
          "Unique constraint failed on the fields: (`email`)",
          { code: "P2002", clientVersion: "5.19.1" }
        )
      )
      const request = new NextRequest("http://localhost:3000/api/users", {
        method: "POST",
        body: JSON.stringify({
          name: "New User",
          email: "racing@example.com",
          password: "password123",
          role: "user",
        }),
      })

      // Act
      const response = await POST(request)
      const data = await response.json()

      // Assert — the race is reported as a duplicate, never a 500
      expect(response.status).toBe(409)
      expect(data.error).toBe("User with this email already exists")
    })
  })

  describe("PUT /api/users", () => {
    it("returns 401 unauthorized when the session user is not an admin", async () => {
      // Arrange
      mockAuth.mockResolvedValue({ user: { id: "user-1", role: "user" } })
      const request = new NextRequest("http://localhost:3000/api/users", {
        method: "PUT",
        body: JSON.stringify({ id: "u2", name: "Renamed" }),
      })

      // Act
      const response = await PUT(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
      expect(prisma.user.update).not.toHaveBeenCalled()
    })

    it("returns 404 userNotFound when the target user does not exist", async () => {
      // Arrange
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
      const request = new NextRequest("http://localhost:3000/api/users", {
        method: "PUT",
        body: JSON.stringify({ id: "ghost", name: "Renamed" }),
      })

      // Act
      const response = await PUT(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(404)
      expect(data.error).toBe("User not found")
      expect(prisma.user.update).not.toHaveBeenCalled()
    })

    it("returns 400 cannotDemoteLastAdmin when demoting the last active admin", async () => {
      // Arrange — target is an active admin and only one remains
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "u2",
        email: "u2@example.com",
        role: "admin",
        isActive: true,
      })
      ;(prisma.user.count as jest.Mock).mockResolvedValue(1)
      const request = new NextRequest("http://localhost:3000/api/users", {
        method: "PUT",
        body: JSON.stringify({ id: "u2", role: "user" }),
      })

      // Act
      const response = await PUT(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toBe("Cannot demote the last active administrator")
      expect(prisma.user.update).not.toHaveBeenCalled()
    })

    it("returns 200 and bumps tokenVersion when the role changes", async () => {
      // Arrange — promoting a regular user revokes any stale sessions that
      // would otherwise keep the old role cached in their JWTs
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "u2",
        email: "u2@example.com",
        role: "user",
        isActive: true,
      })
      ;(prisma.user.update as jest.Mock).mockResolvedValue({
        id: "u2",
        name: "Regular User",
        email: "u2@example.com",
        role: "admin",
        isActive: true,
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-01"),
      })
      const request = new NextRequest("http://localhost:3000/api/users", {
        method: "PUT",
        body: JSON.stringify({ id: "u2", role: "admin" }),
      })

      // Act
      const response = await PUT(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "u2" },
        data: { role: "admin", tokenVersion: { increment: 1 } },
        select: userSelect,
      })
    })

    it("returns 200 and bumps tokenVersion when the password is reset", async () => {
      // Arrange — a password reset must log every open session out
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "u2",
        email: "u2@example.com",
        role: "user",
        isActive: true,
      })
      ;(bcrypt.hash as jest.Mock).mockResolvedValue("hashed_password")
      ;(prisma.user.update as jest.Mock).mockResolvedValue({
        id: "u2",
        name: "Regular User",
        email: "u2@example.com",
        role: "user",
        isActive: true,
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-01"),
      })
      const request = new NextRequest("http://localhost:3000/api/users", {
        method: "PUT",
        body: JSON.stringify({ id: "u2", password: "newpassword123" }),
      })

      // Act
      const response = await PUT(request)
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(bcrypt.hash).toHaveBeenCalledWith("newpassword123", 10)
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "u2" },
        data: { password: "hashed_password", tokenVersion: { increment: 1 } },
        select: userSelect,
      })
    })

    it("returns 200 without touching tokenVersion when only the name changes", async () => {
      // Arrange — a cosmetic rename must keep existing sessions valid
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "u2",
        email: "u2@example.com",
        role: "user",
        isActive: true,
      })
      ;(prisma.user.update as jest.Mock).mockResolvedValue({
        id: "u2",
        name: "Renamed",
        email: "u2@example.com",
        role: "user",
        isActive: true,
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-01"),
      })
      const request = new NextRequest("http://localhost:3000/api/users", {
        method: "PUT",
        body: JSON.stringify({ id: "u2", name: "Renamed" }),
      })

      // Act
      const response = await PUT(request)
      const data = await response.json()

      // Assert — exact data match proves no tokenVersion key is sent
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "u2" },
        data: { name: "Renamed" },
        select: userSelect,
      })
    })
  })

  describe("PATCH /api/users/[id]", () => {
    it("returns 401 unauthorized when the session user is not an admin", async () => {
      // Arrange
      mockAuth.mockResolvedValue({ user: { id: "user-1", role: "user" } })
      const request = new NextRequest("http://localhost:3000/api/users/u2", {
        method: "PATCH",
        body: JSON.stringify({ isActive: false }),
      })

      // Act
      const response = await PATCH(request, { params: { id: "u2" } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
      expect(prisma.user.update).not.toHaveBeenCalled()
    })

    it("returns 400 cannotDeactivateOwnAccount when deactivating yourself", async () => {
      // Arrange — the admin session belongs to the target account
      const request = new NextRequest("http://localhost:3000/api/users/admin-1", {
        method: "PATCH",
        body: JSON.stringify({ isActive: false }),
      })

      // Act
      const response = await PATCH(request, { params: { id: "admin-1" } })
      const data = await response.json()

      // Assert — the guard runs before any DB read
      expect(response.status).toBe(400)
      expect(data.error).toBe("You cannot deactivate your own account")
      expect(prisma.user.findUnique).not.toHaveBeenCalled()
    })

    it("returns 400 cannotDeactivateLastAdmin when deactivating the last active admin", async () => {
      // Arrange — target is an active admin and only one remains
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "u2",
        role: "admin",
        isActive: true,
      })
      ;(prisma.user.count as jest.Mock).mockResolvedValue(1)
      const request = new NextRequest("http://localhost:3000/api/users/u2", {
        method: "PATCH",
        body: JSON.stringify({ isActive: false }),
      })

      // Act
      const response = await PATCH(request, { params: { id: "u2" } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toBe("Cannot deactivate the last active administrator")
      expect(prisma.user.update).not.toHaveBeenCalled()
    })

    it("returns 404 userNotFound when the target user does not exist", async () => {
      // Arrange
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
      const request = new NextRequest("http://localhost:3000/api/users/ghost", {
        method: "PATCH",
        body: JSON.stringify({ isActive: false }),
      })

      // Act
      const response = await PATCH(request, { params: { id: "ghost" } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(404)
      expect(data.error).toBe("User not found")
      expect(prisma.user.update).not.toHaveBeenCalled()
    })

    it("returns 200 and revokes sessions when deactivating a user", async () => {
      // Arrange
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "u2",
        role: "user",
        isActive: true,
      })
      ;(prisma.user.update as jest.Mock).mockResolvedValue({
        id: "u2",
        name: "Regular User",
        email: "u2@example.com",
        role: "user",
        isActive: false,
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-01"),
      })
      const request = new NextRequest("http://localhost:3000/api/users/u2", {
        method: "PATCH",
        body: JSON.stringify({ isActive: false }),
      })

      // Act
      const response = await PATCH(request, { params: { id: "u2" } })
      const data = await response.json()

      // Assert — deactivation bumps tokenVersion so every open session is
      // revoked immediately
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "u2" },
        data: { isActive: false, tokenVersion: { increment: 1 } },
        select: userSelect,
      })
    })

    it("returns 200 without touching tokenVersion when reactivating a user", async () => {
      // Arrange
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "u2",
        role: "user",
        isActive: false,
      })
      ;(prisma.user.update as jest.Mock).mockResolvedValue({
        id: "u2",
        name: "Regular User",
        email: "u2@example.com",
        role: "user",
        isActive: true,
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-01"),
      })
      const request = new NextRequest("http://localhost:3000/api/users/u2", {
        method: "PATCH",
        body: JSON.stringify({ isActive: true }),
      })

      // Act
      const response = await PATCH(request, { params: { id: "u2" } })
      const data = await response.json()

      // Assert — exact data match proves no tokenVersion key is sent
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "u2" },
        data: { isActive: true },
        select: userSelect,
      })
    })
  })

  describe("DELETE /api/users/[id]", () => {
    it("returns 401 unauthorized when the session user is not an admin", async () => {
      // Arrange
      mockAuth.mockResolvedValue({ user: { id: "user-1", role: "user" } })
      const request = new NextRequest("http://localhost:3000/api/users/u2", {
        method: "DELETE",
      })

      // Act
      const response = await DELETE(request, { params: { id: "u2" } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(data.error).toBe("Unauthorized")
      expect(prisma.user.delete).not.toHaveBeenCalled()
    })

    it("returns 400 cannotDeleteOwnAccount when deleting yourself", async () => {
      // Arrange — the admin session belongs to the target account
      const request = new NextRequest("http://localhost:3000/api/users/admin-1", {
        method: "DELETE",
      })

      // Act
      const response = await DELETE(request, { params: { id: "admin-1" } })
      const data = await response.json()

      // Assert — the guard runs before any DB read
      expect(response.status).toBe(400)
      expect(data.error).toBe("Cannot delete your own account")
      expect(prisma.user.findUnique).not.toHaveBeenCalled()
    })

    it("returns 400 cannotDeleteLastAdmin when deleting the last active admin", async () => {
      // Arrange — target is an active admin and only one remains
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "u2",
        role: "admin",
        isActive: true,
      })
      ;(prisma.user.count as jest.Mock).mockResolvedValue(1)
      const request = new NextRequest("http://localhost:3000/api/users/u2", {
        method: "DELETE",
      })

      // Act
      const response = await DELETE(request, { params: { id: "u2" } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toBe("Cannot delete the last active administrator")
      expect(prisma.user.delete).not.toHaveBeenCalled()
    })

    it("returns 404 userNotFound when the target user does not exist", async () => {
      // Arrange
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue(null)
      const request = new NextRequest("http://localhost:3000/api/users/ghost", {
        method: "DELETE",
      })

      // Act
      const response = await DELETE(request, { params: { id: "ghost" } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(404)
      expect(data.error).toBe("User not found")
      expect(prisma.user.delete).not.toHaveBeenCalled()
    })

    it("returns 200 and deletes the prompts and the user in one transaction", async () => {
      // Arrange — the user's prompts are wiped atomically with the account
      // (N:M junction tables cascade from Prompt, so nothing else is needed)
      ;(prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "u2",
        role: "user",
        isActive: true,
      })
      ;(prisma.prompt.deleteMany as jest.Mock).mockResolvedValue({ count: 3 })
      ;(prisma.user.delete as jest.Mock).mockResolvedValue({ id: "u2" })
      const request = new NextRequest("http://localhost:3000/api/users/u2", {
        method: "DELETE",
      })

      // Act
      const response = await DELETE(request, { params: { id: "u2" } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data).toEqual({
        data: { message: "User deleted successfully" },
        success: true,
      })
      expect(prisma.prompt.deleteMany).toHaveBeenCalledWith({
        where: { userId: "u2" },
      })
      expect(prisma.user.delete).toHaveBeenCalledWith({
        where: { id: "u2" },
      })
      expect(prisma.$transaction).toHaveBeenCalledTimes(1)
      // Serializable callback form: the deletion runs inside the tx client.
      const transactionArg = (prisma.$transaction as jest.Mock).mock
        .calls[0][0]
      expect(typeof transactionArg).toBe("function")
    })
  })
})
