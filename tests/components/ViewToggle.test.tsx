/**
 * @jest-environment jsdom
 *
 * Subtarea 2 — Segmentos pequeños del formulario de prompts: ViewToggle.
 * Cubre el renderizado de los botones Cards/List con el modo activo según
 * initialViewMode del ViewModeProvider y el cambio de modo al hacer click.
 *
 * A diferencia de los otros segmentos, ViewToggle consume el contexto de
 * modo de vista; el provider persiste la preferencia con un PATCH a
 * /api/user/preferences, por lo que global.fetch se mockea (jsdom no lo
 * expone) para mantener los tests deterministas.
 */

import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { NextIntlClientProvider } from "next-intl"
import { ViewToggle } from "@/components/prompt/ViewToggle"
import { ViewModeProvider } from "@/contexts/ViewModeContext"
import messages from "../../messages/en-GB.json"

function renderToggle(initialViewMode: "cards" | "list" = "cards") {
  return render(
    <NextIntlClientProvider locale="en-GB" messages={messages}>
      <ViewModeProvider initialViewMode={initialViewMode}>
        <ViewToggle />
      </ViewModeProvider>
    </NextIntlClientProvider>
  )
}

describe("ViewToggle", () => {
  beforeEach(() => {
    // The provider persists the preference with a PATCH request.
    global.fetch = jest.fn().mockResolvedValue({ ok: true } as Response) as typeof fetch
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("renders Cards and List buttons with Cards active for the default cards mode", () => {
    // Arrange & Act
    renderToggle("cards")

    // Assert — Cards carries the default variant (active, disabled) and
    // List the ghost variant.
    expect(screen.getByRole("button", { name: "Cards" })).toHaveClass("bg-primary")
    expect(screen.getByRole("button", { name: "Cards" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "List" })).toHaveClass("hover:bg-accent")
  })

  it("renders List as the active mode when the provider starts in list mode", () => {
    // Arrange & Act
    renderToggle("list")

    // Assert — List carries the default variant (active, disabled) and
    // Cards the ghost variant.
    expect(screen.getByRole("button", { name: "List" })).toHaveClass("bg-primary")
    expect(screen.getByRole("button", { name: "List" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Cards" })).toHaveClass("hover:bg-accent")
  })

  it("switches the active mode to List when the List button is clicked", async () => {
    // Arrange
    const user = userEvent.setup()
    renderToggle("cards")

    // Act
    await user.click(screen.getByRole("button", { name: "List" }))

    // Assert — the List button becomes the active (default variant) one.
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "List" })).toHaveClass("bg-primary")
    })
    expect(screen.getByRole("button", { name: "Cards" })).not.toHaveClass("bg-primary")
  })

  it("persists the selected mode with a PATCH request to the preferences endpoint", async () => {
    // Arrange
    const user = userEvent.setup()
    renderToggle("cards")

    // Act
    await user.click(screen.getByRole("button", { name: "List" }))

    // Assert — the preference endpoint is PATCHed with the new mode.
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promptListViewPreference: "list" }),
      })
    })
  })
})
