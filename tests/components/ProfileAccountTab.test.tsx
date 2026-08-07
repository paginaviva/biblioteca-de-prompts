/**
 * @jest-environment jsdom
 */

import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { NextIntlClientProvider } from "next-intl"
import { ProfileAccountTab } from "@/components/auth/ProfileAccountTab"
import messages from "../../messages/en-GB.json"

jest.mock("next-auth/react", () => ({
  useSession: jest.fn(),
  signOut: jest.fn(),
}))

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}))

describe("ProfileAccountTab", () => {
  const mockUpdate = jest.fn()

  function renderAccountTab(initialLanguage: string | null = null) {
    return render(
      <NextIntlClientProvider locale="en-GB" messages={messages}>
        <ProfileAccountTab initialLanguage={initialLanguage} />
      </NextIntlClientProvider>
    )
  }

  beforeAll(() => {
    // Radix Select relies on PointerEvent and pointer-capture APIs that
    // jsdom does not implement; polyfill them so the dropdown can be
    // opened and an option picked.
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
    const { useSession } = require("next-auth/react") as { useSession: jest.Mock }
    useSession.mockReturnValue({
      data: {
        user: {
          id: "1",
          name: "Test User",
          email: "test@example.com",
          role: "user",
        },
      },
      status: "authenticated",
      update: mockUpdate,
    })
    mockUpdate.mockResolvedValue({ ok: true })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("renders the language selector and the name and password inputs", () => {
    // Arrange & Act
    renderAccountTab()

    // Assert
    expect(screen.getByRole("combobox", { name: "Language" })).toBeInTheDocument()
    expect(screen.getByLabelText("Name")).toBeInTheDocument()
    expect(screen.getByLabelText("Current password")).toBeInTheDocument()
    expect(screen.getByLabelText("New password")).toBeInTheDocument()
    expect(screen.getByLabelText("Confirm new password")).toBeInTheDocument()
  })

  it("persists the selected language via PATCH and refreshes the session", async () => {
    // Arrange
    const user = userEvent.setup()
    renderAccountTab()

    // Act — open the Radix Select and pick the Spanish option
    await user.click(screen.getByRole("combobox", { name: "Language" }))
    await user.click(await screen.findByRole("option", { name: "Español" }))

    // Assert
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/user/preferences",
        expect.objectContaining({
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ language: "es-ES" }),
        })
      )
    })
    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({ language: "es-ES" })
    })
  })

  it("persists the new name via PATCH and refreshes the session", async () => {
    // Arrange
    const user = userEvent.setup()
    renderAccountTab()
    const nameInput = screen.getByLabelText("Name")

    // Act
    await user.clear(nameInput)
    await user.type(nameInput, "New Name")
    await user.click(screen.getByRole("button", { name: "Save name" }))

    // Assert
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/user/profile",
        expect.objectContaining({
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "New Name" }),
        })
      )
    })
    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({ name: "New Name" })
    })
  })

  it("persists the password change via PATCH", async () => {
    // Arrange
    const user = userEvent.setup()
    renderAccountTab()

    // Act
    await user.type(screen.getByLabelText("Current password"), "old-password")
    await user.type(screen.getByLabelText("New password"), "new-password")
    await user.type(
      screen.getByLabelText("Confirm new password"),
      "new-password"
    )
    await user.click(screen.getByRole("button", { name: "Change password" }))

    // Assert
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/user/password",
        expect.objectContaining({
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            currentPassword: "old-password",
            newPassword: "new-password",
          }),
        })
      )
    })
  })
})
