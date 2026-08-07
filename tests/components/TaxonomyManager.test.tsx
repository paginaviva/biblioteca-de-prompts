/**
 * @jest-environment jsdom
 *
 * Subtarea 09 — Etapa final: tests de TaxonomyManager.
 * Cubre el render de la lista (GET), el buscador client-side, el gate de
 * administrador (solo admin ve la gestión y solo admin dispara el fetch),
 * el alta (POST con name/slug/sortOrder para catálogos y solo name para
 * las entidades N:M) y el borrado (DELETE con confirm).
 *
 * Patrón seguido: ProfileUsersTab.test.tsx (fetch global, useSession mock,
 * confirm mock, sonner mock, polyfills Radix, mensajes en-GB reales).
 */

import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { NextIntlClientProvider } from "next-intl"
import { toast } from "sonner"
import { TaxonomyManager, type TaxonomyManagerProps } from "@/components/taxonomy/TaxonomyManager"
import messages from "../../messages/en-GB.json"

jest.mock("next-auth/react", () => ({
  useSession: jest.fn(),
  signOut: jest.fn(),
}))

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}))

// sonner toasts are asserted as calls (deterministic) instead of mounting the
// real Toaster (portals + timers would make the suite flaky in jsdom).
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

// GET /api/types payload for the catalog case (plain array, no _count).
const typeItems = [
  { id: "t1", name: "System", slug: "system", sortOrder: 1 },
  { id: "t2", name: "User", slug: "user", sortOrder: 2 },
  { id: "t3", name: "Tool", slug: "tool", sortOrder: 3 },
]

// GET /api/platforms payload for the N:M case (includes _count.prompts).
const platformItems = [
  { id: "p1", name: "ChatGPT", slug: "chatgpt", sortOrder: 1, _count: { prompts: 3 } },
  { id: "p2", name: "Cursor", slug: "cursor", sortOrder: 2, _count: { prompts: 0 } },
]

function jsonResponse(body: unknown): Response {
  return { ok: true, json: jest.fn().mockResolvedValue(body) } as unknown as Response
}

function mockSession(role: "admin" | "user") {
  const { useSession } = require("next-auth/react") as { useSession: jest.Mock }
  useSession.mockReturnValue({
    data: {
      user: {
        id: "1",
        name: "Root Admin",
        email: "root@example.com",
        role,
      },
    },
    status: "authenticated",
  })
}

function renderManager(props: Partial<TaxonomyManagerProps> = {}) {
  return render(
    <NextIntlClientProvider locale="en-GB" messages={messages}>
      <TaxonomyManager
        apiPath="/api/types"
        entityKey="type"
        showPromptsCount={false}
        postAcceptsSlugAndSortOrder={true}
        {...props}
      />
    </NextIntlClientProvider>
  )
}

describe("TaxonomyManager", () => {
  beforeAll(() => {
    // Radix Dialog (and its focus management) relies on PointerEvent and
    // pointer-capture APIs that jsdom does not implement; polyfill them so
    // the create/edit dialog can mount (ProfileUsersTab pattern).
    Object.defineProperty(window, "PointerEvent", {
      value: MouseEvent,
      configurable: true,
    })
    Element.prototype.hasPointerCapture = jest.fn()
    Element.prototype.releasePointerCapture = jest.fn()
    Element.prototype.scrollIntoView = jest.fn()
    global.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  })

  beforeEach(() => {
    jest.clearAllMocks()
    mockSession("admin")
    // jsdom does not expose fetch; provide it for GET/POST/DELETE.
    global.fetch = jest.fn().mockResolvedValue(jsonResponse(typeItems)) as typeof fetch
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("renders the list of values returned by the GET endpoint", async () => {
    // Arrange & Act
    renderManager()

    // Assert — heading with the entity name plus one row per catalog value
    // with its slug and order.
    expect(await screen.findByRole("heading", { name: "Type" })).toBeInTheDocument()
    expect(screen.getByText("System")).toBeInTheDocument()
    expect(screen.getByText("User")).toBeInTheDocument()
    expect(screen.getByText("Tool")).toBeInTheDocument()
    expect(screen.getByText("system")).toBeInTheDocument()
    expect(screen.getByText("tool")).toBeInTheDocument()
  })

  it("shows the prompts count column when showPromptsCount is true", async () => {
    // Arrange
    global.fetch = jest
      .fn()
      .mockResolvedValue(jsonResponse(platformItems)) as typeof fetch
    renderManager({
      apiPath: "/api/platforms",
      entityKey: "platforms",
      showPromptsCount: true,
      postAcceptsSlugAndSortOrder: false,
    })

    // Act & Assert — the count column header and the per-row counts render.
    expect(await screen.findByRole("heading", { name: "Platforms" })).toBeInTheDocument()
    expect(screen.getByText("Prompts")).toBeInTheDocument()
    expect(screen.getByText("3")).toBeInTheDocument()
    expect(screen.getByText("0")).toBeInTheDocument()
  })

  it("filters the values client-side by name as the user types", async () => {
    // Arrange
    const user = userEvent.setup()
    renderManager()
    await screen.findByText("System")

    // Act — type a query that only matches one value.
    await user.type(screen.getByPlaceholderText("Search by name..."), "sys")

    // Assert — only the matching row stays visible.
    expect(screen.getByText("System")).toBeInTheDocument()
    expect(screen.queryByText("User")).not.toBeInTheDocument()
    expect(screen.queryByText("Tool")).not.toBeInTheDocument()
  })

  it("shows the unauthorized message and never fetches for non-admin users", async () => {
    // Arrange
    mockSession("user")
    renderManager()

    // Act & Assert — the gate renders Api.unauthorized as an alert and the
    // fetch for the list is never triggered.
    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent("Unauthorized")
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it("fetches the list from the apiPath prop when the session role is admin", async () => {
    // Arrange & Act
    renderManager()

    // Assert — the GET goes to the configured apiPath with no extra params.
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/types")
    })
  })

  it("creates a catalog value via POST with name, slug and sortOrder", async () => {
    // Arrange
    const user = userEvent.setup()
    global.fetch = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const method = init?.method || "GET"
      if (method === "POST") return Promise.resolve(jsonResponse({}))
      return Promise.resolve(jsonResponse(typeItems))
    }) as typeof fetch
    renderManager()
    await screen.findByText("System")

    // Act — open the dialog, type the name and save (slug is generated from
    // the name, order keeps its default 0).
    await user.click(screen.getByRole("button", { name: "New value" }))
    await user.type(await screen.findByLabelText("Name"), "Agent")
    await user.click(screen.getByRole("button", { name: "Save" }))

    // Assert — POST targets apiPath with the catalog payload.
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/types",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Agent", slug: "agent", sortOrder: 0 }),
        })
      )
    })
  })

  it("creates an N:M value via POST with only the name when the API generates slug/order", async () => {
    // Arrange
    const user = userEvent.setup()
    global.fetch = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const method = init?.method || "GET"
      if (method === "POST") return Promise.resolve(jsonResponse({}))
      return Promise.resolve(jsonResponse(platformItems))
    }) as typeof fetch
    renderManager({
      apiPath: "/api/platforms",
      entityKey: "platforms",
      showPromptsCount: true,
      postAcceptsSlugAndSortOrder: false,
    })
    await screen.findByText("ChatGPT")

    // Act — the dialog hides the slug/order fields for N:M entities.
    await user.click(screen.getByRole("button", { name: "New value" }))
    await user.type(await screen.findByLabelText("Name"), "Claude")
    expect(screen.queryByLabelText("Slug")).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Save" }))

    // Assert — POST sends only { name }.
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/platforms",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Claude" }),
        })
      )
    })
  })

  it("deletes a value via DELETE to /[id] after confirmation and shows the returned message", async () => {
    // Arrange
    const user = userEvent.setup()
    jest.spyOn(window, "confirm").mockReturnValue(true)
    global.fetch = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const method = init?.method || "GET"
      if (method === "DELETE") {
        return Promise.resolve(
          jsonResponse({ data: { message: "Type deleted successfully" } })
        )
      }
      if (url === "/api/types") {
        return Promise.resolve(jsonResponse(typeItems))
      }
      return Promise.resolve(jsonResponse([]))
    }) as typeof fetch
    renderManager()
    await screen.findByText("System")

    // Act — delete from the first row (System).
    await user.click(screen.getAllByRole("button", { name: "Delete" })[0])

    // Assert — the confirm uses TaxonomyPage.deleteConfirm and the DELETE
    // targets /api/types/:id; the returned message becomes the success toast.
    expect(window.confirm).toHaveBeenCalledWith(
      "This will remove the value from the list. Prompts using it are not affected."
    )
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/types/t1",
        expect.objectContaining({ method: "DELETE" })
      )
    })
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Type deleted successfully")
    })
  })

  it("does not delete when the confirmation is cancelled", async () => {
    // Arrange
    const user = userEvent.setup()
    jest.spyOn(window, "confirm").mockReturnValue(false)
    renderManager()
    await screen.findByText("System")

    // Act — cancel the confirm dialog.
    await user.click(screen.getAllByRole("button", { name: "Delete" })[0])

    // Assert — no DELETE request is sent.
    expect(window.confirm).toHaveBeenCalled()
    expect(global.fetch).not.toHaveBeenCalledWith(
      "/api/types/t1",
      expect.objectContaining({ method: "DELETE" })
    )
  })
})
