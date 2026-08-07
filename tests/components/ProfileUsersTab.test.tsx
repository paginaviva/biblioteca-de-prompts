/**
 * @jest-environment jsdom
 *
 * Subtarea 06 — Fase C: tests de la pestaña de usuarios del perfil.
 * Cubre la lista (render/loading/error/empty), alta (POST), desactivación
 * (PATCH con confirm) y borrado (DELETE con confirm) de ProfileUsersTab, y
 * el trigger condicional "Users" (solo admin) en UserProfile.
 *
 * Patrón seguido: ProfileAccountTab.test.tsx (mocks de next-auth/react,
 * next/navigation, fetch global, polyfills Radix, mensajes en-GB reales) y
 * ProfileDashboardTab.test.tsx (UIContextProvider para UserProfile).
 */

import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { NextIntlClientProvider } from "next-intl"
import { toast } from "sonner"
import { ProfileUsersTab } from "@/components/auth/ProfileUsersTab"
import { UserProfile } from "@/components/auth/UserProfile"
import { UIContextProvider } from "@/contexts/UIContext"
import {
  ALL_COLUMN_KEYS,
  DEFAULT_COLUMN_KEYS,
  DEFAULT_FILTER_ORDER,
  UI_PREFERENCES_DEFAULTS,
} from "@/lib/ui-preferences"
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

// GET /api/users payloads (the session user id "3" is deliberately not in
// the list so every row keeps its action buttons enabled).
const adminUser = {
  id: "1",
  name: "Ada Lovelace",
  email: "ada@example.com",
  role: "admin",
  isActive: true,
  createdAt: "2026-01-15T10:00:00.000Z",
  updatedAt: "2026-01-15T10:00:00.000Z",
}

const regularUser = {
  id: "2",
  name: "Grace Hopper",
  email: "grace@example.com",
  role: "user",
  isActive: false,
  createdAt: "2026-02-20T10:00:00.000Z",
  updatedAt: "2026-02-20T10:00:00.000Z",
}

function jsonResponse(body: unknown): Response {
  return { ok: true, json: jest.fn().mockResolvedValue(body) } as unknown as Response
}

function mockSession(role: "admin" | "user" = "admin") {
  const { useSession } = require("next-auth/react") as { useSession: jest.Mock }
  useSession.mockReturnValue({
    data: {
      user: {
        id: "3",
        name: "Root Admin",
        email: "root@example.com",
        role,
      },
    },
    status: "authenticated",
    update: jest.fn().mockResolvedValue({ ok: true }),
  })
}

function renderUsersTab() {
  return render(
    <NextIntlClientProvider locale="en-GB" messages={messages}>
      <ProfileUsersTab />
    </NextIntlClientProvider>
  )
}

function renderUserProfile(role: "admin" | "user") {
  mockSession(role)
  return render(
    <NextIntlClientProvider locale="en-GB" messages={messages}>
      <UIContextProvider
        initialTheme="light"
        initialAccentColor="#7c3aed"
        initialFilterOrder={[...DEFAULT_FILTER_ORDER]}
        initialColumns={{
          visible: [...DEFAULT_COLUMN_KEYS],
          order: [...ALL_COLUMN_KEYS],
        }}
      >
        <UserProfile
          initialLanguage="en-GB"
          initialPreferences={UI_PREFERENCES_DEFAULTS}
        />
      </UIContextProvider>
    </NextIntlClientProvider>
  )
}

describe("ProfileUsersTab", () => {
  beforeAll(() => {
    // Radix Select relies on PointerEvent and pointer-capture APIs that
    // jsdom does not implement; polyfill them so the dialog's Select can
    // mount (same pattern as ProfileAccountTab.test.tsx).
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
    // jsdom does not expose fetch; provide it for GET/POST/PATCH/DELETE
    // (pattern of UIContext/ProfileDashboardTab tests).
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({}),
    } as unknown as Response) as typeof fetch
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("renders the user list with names, status badges and action buttons", async () => {
    // Arrange
    global.fetch = jest
      .fn()
      .mockResolvedValue(jsonResponse({ data: [adminUser, regularUser] }))
    renderUsersTab()

    // Act & Assert — both users, their Active/Inactive badges and the
    // per-row actions (Deactivate for the active user, Activate for the
    // inactive one, plus edit/delete for both rows).
    expect(await screen.findByText("Ada Lovelace")).toBeInTheDocument()
    expect(screen.getByText("Grace Hopper")).toBeInTheDocument()
    expect(screen.getByText("Active")).toBeInTheDocument()
    expect(screen.getByText("Inactive")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Deactivate" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Activate" })).toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: "Edit user" })).toHaveLength(2)
    expect(screen.getAllByRole("button", { name: "Delete user" })).toHaveLength(2)
  })

  it("shows the loading message while the list is being fetched", () => {
    // Arrange — a never-resolving fetch keeps the component in the initial
    // loading state.
    global.fetch = jest.fn().mockReturnValue(new Promise<Response>(() => {}))
    renderUsersTab()

    // Act & Assert
    expect(screen.getByText("Loading users...")).toBeInTheDocument()
  })

  it("shows an error alert when the list cannot be loaded", async () => {
    // Arrange
    jest.spyOn(console, "error").mockImplementation(() => {})
    global.fetch = jest.fn().mockRejectedValue(new Error("network down"))
    renderUsersTab()

    // Act & Assert — Common.errorToast wraps the Api.internalServerError
    // fallback message.
    const alert = await screen.findByRole("alert")
    expect(alert).toHaveTextContent("Error: Internal server error")
  })

  it("shows the empty message when the API returns no users", async () => {
    // Arrange
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({ data: [] }))
    renderUsersTab()

    // Act & Assert
    expect(await screen.findByText("No users found")).toBeInTheDocument()
  })

  it("creates a user via POST with the form values and shows the success toast", async () => {
    // Arrange
    const user = userEvent.setup()
    global.fetch = jest
      .fn()
      .mockResolvedValue(jsonResponse({ data: [adminUser, regularUser] }))
    renderUsersTab()
    await screen.findByText("Ada Lovelace")

    // Act — open the "New user" dialog, fill name/email/password (role
    // keeps the default "user") and submit.
    await user.click(screen.getByRole("button", { name: "New user" }))
    await user.type(await screen.findByLabelText("Name"), "New Person")
    await user.type(screen.getByLabelText("Email"), "new@example.com")
    await user.type(screen.getByLabelText("Password"), "secret123")
    await user.type(screen.getByLabelText("Confirm new password"), "secret123")
    await user.click(screen.getByRole("button", { name: "Save" }))

    // Assert
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/users",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "New Person",
            email: "new@example.com",
            password: "secret123",
            role: "user",
          }),
        })
      )
    })
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("User created successfully")
    })
  })

  it("deactivates an active user via PATCH after confirmation and shows the success toast", async () => {
    // Arrange
    const user = userEvent.setup()
    jest.spyOn(window, "confirm").mockReturnValue(true)
    global.fetch = jest
      .fn()
      .mockResolvedValue(jsonResponse({ data: [adminUser, regularUser] }))
    renderUsersTab()
    await screen.findByText("Ada Lovelace")

    // Act — Ada is active and not the session user, so "Deactivate" is the
    // clickable action for her row.
    await user.click(screen.getByRole("button", { name: "Deactivate" }))

    // Assert — the confirm dialog uses Users.deactivateConfirm and the
    // PATCH targets /api/users/:id with { isActive: false }.
    expect(window.confirm).toHaveBeenCalledWith(
      "All open sessions will be closed and the user will not be able to log in. Continue?"
    )
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/users/1",
        expect.objectContaining({
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: false }),
        })
      )
    })
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("User deactivated successfully")
    })
  })

  it("deletes a user via DELETE after confirmation and shows the returned message", async () => {
    // Arrange
    const user = userEvent.setup()
    jest.spyOn(window, "confirm").mockReturnValue(true)
    // The list GET must resolve with users; the DELETE returns the message.
    global.fetch = jest.fn((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes("/api/users/") && url !== "/api/users") {
        return Promise.resolve(
          jsonResponse({ data: { message: "User deleted successfully" } })
        )
      }
      return Promise.resolve(jsonResponse({ data: [adminUser, regularUser] }))
    }) as typeof fetch
    renderUsersTab()
    await screen.findByText("Ada Lovelace")
    const adaRow = screen.getByText("Ada Lovelace").closest("tr")
    if (!adaRow) throw new Error("Row for Ada Lovelace not found")

    // Act — delete from Ada's row (both rows have a "Delete user" button).
    await user.click(within(adaRow).getByRole("button", { name: "Delete user" }))

    // Assert — the confirm warns about prompts (Users.deleteConfirm) and
    // the DELETE response message is shown as the success toast.
    expect(window.confirm).toHaveBeenCalledWith(
      "This will permanently delete the user and all their prompts. This action cannot be undone."
    )
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/users/1",
        expect.objectContaining({ method: "DELETE" })
      )
    })
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("User deleted successfully")
    })
  })
})

describe("UserProfile users tab trigger", () => {
  beforeAll(() => {
    // ProfileAccountTab (rendered as the default tab) mounts a Radix Select;
    // same polyfills as ProfileAccountTab.test.tsx.
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
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({}),
    } as unknown as Response) as typeof fetch
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("renders the Users tab trigger when the session role is admin", () => {
    // Arrange & Act
    renderUserProfile("admin")

    // Assert
    expect(screen.getByRole("tab", { name: "Users" })).toBeInTheDocument()
  })

  it("does not render the Users tab trigger when the session role is user", () => {
    // Arrange & Act
    renderUserProfile("user")

    // Assert — the base tabs still render but the admin-only one is absent.
    expect(screen.queryByRole("tab", { name: "Users" })).not.toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Account" })).toBeInTheDocument()
  })
})
