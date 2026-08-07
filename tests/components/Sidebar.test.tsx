/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import { Sidebar } from "@/components/layout/Sidebar"
import { UIContextProvider } from "@/contexts/UIContext"
import messages from "../../messages/en-GB.json"

jest.mock("next-auth/react", () => ({
  useSession: jest.fn(),
  signOut: jest.fn(),
}))

jest.mock("next/navigation", () => ({
  usePathname: () => "/prompts",
}))

function mockSession(role?: "admin" | "user") {
  const { useSession } = require("next-auth/react") as { useSession: jest.Mock }
  useSession.mockReturnValue({
    data: { user: { name: "Test User", role } },
    status: "authenticated",
  })
}

function renderSidebar(initialSidebarCollapsed = false) {
  return render(
    <NextIntlClientProvider locale="en-GB" messages={messages}>
      <UIContextProvider initialSidebarCollapsed={initialSidebarCollapsed}>
        <Sidebar />
      </UIContextProvider>
    </NextIntlClientProvider>
  )
}

describe("Sidebar", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSession("user")
    // jsdom does not expose fetch; provide it for the PATCH calls
    global.fetch = jest.fn().mockResolvedValue({ ok: true } as Response) as typeof fetch
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("renders app name and navigation links in expanded mode by default", () => {
    // Arrange & Act
    const { container } = renderSidebar()

    // Assert — the base links (Prompts, Shared) and the profile are
    // rendered; Categories/Tags moved under the admin-only Taxonomy
    // dropdown, so they are absent for a regular user.
    expect(screen.getByText("Prompt DB")).toBeInTheDocument()
    expect(screen.getByText("Prompts")).toBeInTheDocument()
    expect(screen.getByText("Shared")).toBeInTheDocument()
    expect(screen.queryByText("Categories")).not.toBeInTheDocument()
    expect(screen.queryByText("Tags")).not.toBeInTheDocument()
    expect(screen.getByText("Test User")).toBeInTheDocument()
    expect(container.firstChild).toHaveClass("w-64")
  })

  it("collapses to icon-only width and hides labels when initialSidebarCollapsed is true", () => {
    // Arrange & Act
    const { container } = renderSidebar(true)

    // Assert
    expect(container.firstChild).toHaveClass("w-16")
    expect(screen.queryByText("Prompt DB")).not.toBeInTheDocument()
    // Nav names only exist as opacity-0 tooltips when collapsed
    expect(screen.queryByText("Prompts")).toHaveClass("opacity-0")
  })

  it("persists the new collapsed state via a PATCH request when the collapse button is clicked", () => {
    // Arrange
    renderSidebar()

    // Act
    fireEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }))

    // Assert
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/user/preferences",
      expect.objectContaining({
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uiPreferences: { sidebarCollapsed: true } }),
      })
    )
  })

  it("shows the Taxonomy dropdown with its submenu only for admin users", () => {
    // Arrange
    mockSession("admin")
    renderSidebar()

    // Act — expand the dropdown.
    fireEvent.click(screen.getByRole("button", { name: "Taxonomy" }))

    // Assert — the submenu lists Categories and Tags first, then the seven
    // managed elements.
    expect(screen.getByRole("link", { name: "Categories" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Tags" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Type" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Status" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Language" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Platforms" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Client / Projects" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Use Cases" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Model Hints" })).toBeInTheDocument()
  })

  it("hides the Taxonomy dropdown for non-admin users while keeping the Shared link", () => {
    // Arrange — default session role is "user"
    mockSession("user")
    renderSidebar()

    // Act & Assert — Shared is available to every authenticated user but the
    // admin-only Taxonomy dropdown (and its submenu) is absent.
    expect(screen.getByText("Shared")).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Taxonomy" })
    ).not.toBeInTheDocument()
    expect(screen.queryByRole("link", { name: "Type" })).not.toBeInTheDocument()
  })
})
