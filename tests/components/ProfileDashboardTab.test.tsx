/**
 * @jest-environment jsdom
 */

import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { NextIntlClientProvider } from "next-intl"
import { ProfileDashboardTab } from "@/components/auth/ProfileDashboardTab"
import { UIContextProvider } from "@/contexts/UIContext"
import {
  ALL_COLUMN_KEYS,
  DEFAULT_COLUMN_KEYS,
  DEFAULT_FILTER_ORDER,
} from "@/lib/ui-preferences"
import messages from "../../messages/en-GB.json"

describe("ProfileDashboardTab", () => {
  const initialFilterOrder = [...DEFAULT_FILTER_ORDER]
  const initialColumns = {
    visible: [...DEFAULT_COLUMN_KEYS],
    order: [...ALL_COLUMN_KEYS],
  }

  function renderDashboardTab() {
    return render(
      <NextIntlClientProvider locale="en-GB" messages={messages}>
        <UIContextProvider
          initialTheme="light"
          initialAccentColor="#7c3aed"
          initialFilterOrder={initialFilterOrder}
          initialColumns={initialColumns}
        >
          <ProfileDashboardTab />
        </UIContextProvider>
      </NextIntlClientProvider>
    )
  }

  // Scopes queries to the <section> that follows a heading so duplicated
  // labels between the filter and column lists ("Tags", "Status", ...) do
  // not collide.
  function sectionByHeading(name: string): HTMLElement {
    const heading = screen.getByRole("heading", { name })
    const section = heading.closest("section")
    if (!section) throw new Error(`No section found for heading "${name}"`)
    return section
  }

  beforeEach(() => {
    // jsdom does not expose fetch; provide it for the PATCH calls
    global.fetch = jest.fn().mockResolvedValue({ ok: true } as Response) as typeof fetch
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("renders theme buttons, 8 accent presets, 8 filter boxes and 8 column checkboxes", () => {
    // Arrange & Act
    renderDashboardTab()

    // Assert
    expect(screen.getByRole("button", { name: "Light" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Dark" })).toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: /^Interface color #/ })).toHaveLength(8)
    expect(within(sectionByHeading("Filter boxes order")).getAllByRole("listitem")).toHaveLength(8)
    expect(within(sectionByHeading("List and card columns")).getAllByRole("checkbox")).toHaveLength(8)
  })

  it("persists the dark theme via PATCH and marks the Dark button as pressed", async () => {
    // Arrange
    const user = userEvent.setup()
    renderDashboardTab()

    // Act
    await user.click(screen.getByRole("button", { name: "Dark" }))

    // Assert
    expect(screen.getByRole("button", { name: "Dark" })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("button", { name: "Light" })).toHaveAttribute("aria-pressed", "false")
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/user/preferences",
      expect.objectContaining({
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uiPreferences: { theme: "dark" } }),
      })
    )
  })

  it("persists the selected accent preset via PATCH", async () => {
    // Arrange
    const user = userEvent.setup()
    renderDashboardTab()

    // Act
    await user.click(screen.getByRole("button", { name: "Interface color #2563eb" }))

    // Assert
    expect(screen.getByRole("button", { name: "Interface color #2563eb" })).toHaveAttribute(
      "aria-pressed",
      "true"
    )
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/user/preferences",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ uiPreferences: { accentColor: "#2563eb" } }),
      })
    )
  })

  it("persists the reordered filter boxes when the second box is moved up", async () => {
    // Arrange
    const user = userEvent.setup()
    renderDashboardTab()
    const filterSection = sectionByHeading("Filter boxes order")
    const tagsItem = within(filterSection).getByText("Tags").closest("li")
    if (!tagsItem) throw new Error("Filter box item for Tags not found")

    // Act — moving index 1 (tags) up swaps it with index 0 (category); the
    // first item's move-up is disabled because its target index would be -1.
    await user.click(within(tagsItem as HTMLElement).getByRole("button", { name: "Move up" }))

    // Assert
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/user/preferences",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({
          uiPreferences: {
            filterOrder: [
              "tags",
              "category",
              "platform",
              "status",
              "type",
              "language",
              "clientProject",
              "useCase",
            ],
          },
        }),
      })
    )
  })

  it("disables the last remaining visible column checkbox", async () => {
    // Arrange
    const user = userEvent.setup()
    renderDashboardTab()
    const columnsSection = sectionByHeading("List and card columns")

    // Act — uncheck four of the five default visible columns (status stays)
    await user.click(within(columnsSection).getByLabelText("Platforms"))
    await user.click(within(columnsSection).getByLabelText("Categories"))
    await user.click(within(columnsSection).getByLabelText("Tags"))
    await user.click(within(columnsSection).getByLabelText("Client / Project"))

    // Assert — the only remaining visible column is locked so the minimum
    // of one visible column always holds
    expect(within(columnsSection).getByLabelText("Status")).toBeDisabled()
  })
})
