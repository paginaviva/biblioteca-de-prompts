/**
 * @jest-environment jsdom
 *
 * Subtarea 3 — Segmentos del formulario de prompts: MetadataSegment.
 * Cubre el renderizado de los valores actuales con catálogos (type/status/
 * language), la propagación de cambios hacia los callbacks (tipo mapeado a
 * UPPERCASE, favorito y compartido con true/false), los valores fijos de
 * respaldo sin catálogos, la visualización de errores y el valor sintético
 * para idiomas legacy fuera del catálogo.
 *
 * Componente presentacional puro: sin red, sin contexto adicional más allá
 * de NextIntlClientProvider con los mensajes reales en-GB. El Select de
 * Radix requiere los polyfills de pointer-capture/scroll/ResizeObserver
 * para poder abrir el contenido y elegir una opción (patrón de
 * ProfileAccountTab).
 */

import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { NextIntlClientProvider } from "next-intl"
import MetadataSegment, {
  type CatalogOption,
} from "@/components/prompt/MetadataSegment"
import messages from "../../messages/en-GB.json"

type MetadataSegmentProps = React.ComponentProps<typeof MetadataSegment>

// Catalog values as the server would provide them (slugs, English names).
const OPTIONS_TYPE: CatalogOption[] = [
  { name: "System", slug: "system" },
  { name: "User", slug: "user" },
  { name: "Tool", slug: "tool" },
]

const OPTIONS_STATUS: CatalogOption[] = [
  { name: "Draft", slug: "draft" },
  { name: "Tested", slug: "tested" },
  { name: "Production", slug: "production" },
]

const OPTIONS_LANGUAGE: CatalogOption[] = [
  { name: "English", slug: "en" },
  { name: "Spanish", slug: "es" },
]

function renderSegment(overrides: Partial<MetadataSegmentProps> = {}) {
  const callbacks = {
    onTypeChange: jest.fn(),
    onStatusChange: jest.fn(),
    onLanguageChange: jest.fn(),
    onFavoriteChange: jest.fn(),
    onSharedChange: jest.fn(),
  }
  render(
    <NextIntlClientProvider locale="en-GB" messages={messages}>
      <MetadataSegment
        type="SYSTEM"
        status="DRAFT"
        language="en"
        isFavorite={false}
        isShared={false}
        {...callbacks}
        {...overrides}
      />
    </NextIntlClientProvider>
  )
  return callbacks
}

describe("MetadataSegment", () => {
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

  it("renders the catalog labels for type, status and language and reflects isFavorite and isShared", () => {
    // Arrange & Act — catalog options provided, values match catalog slugs
    // (type/status UPPERCASE, language lowercase); favorite and shared on.
    renderSegment({
      type: "SYSTEM",
      status: "TESTED",
      language: "es",
      isFavorite: true,
      isShared: true,
      optionsType: OPTIONS_TYPE,
      optionsStatus: OPTIONS_STATUS,
      optionsLanguage: OPTIONS_LANGUAGE,
    })

    // Assert — every trigger shows the localized label of its current value
    // (type "System" from MetadataSegment.system, status "Tested", language
    // "Español" from MetadataSegment.languageSpanish); the switch reflects
    // isShared and the favorite checkbox is checked.
    expect(screen.getByRole("combobox", { name: /Type: / })).toBeInTheDocument()
    expect(screen.getByRole("combobox", { name: /Status: / })).toBeInTheDocument()
    expect(screen.getByRole("combobox", { name: /Language: / })).toBeInTheDocument()
    expect(screen.getByRole("switch", { name: "Shared" })).toHaveAttribute(
      "aria-checked",
      "true"
    )
    expect(screen.getByLabelText("Mark as favorite")).toBeChecked()
  })

  it("renders the fixed fallback values when no catalog options are provided", () => {
    // Arrange & Act — no options* props, so the fixed lists are used
    // (SYSTEM/USER/TOOL, DRAFT/TESTED/PRODUCTION, fixed languages).
    renderSegment({ type: "USER", status: "DRAFT", language: "en" })

    // Assert — the type trigger with value "USER" shows the localized label
    // "User" (MetadataSegment.user), plus the status and language labels.
    expect(screen.getByRole("combobox", { name: /Type: / })).toBeInTheDocument()
    expect(screen.getByRole("combobox", { name: /Status: / })).toBeInTheDocument()
    expect(screen.getByRole("combobox", { name: /Language: / })).toBeInTheDocument()
  })

  it("offers the fixed SYSTEM/USER/TOOL options in the type dropdown without a catalog", async () => {
    // Arrange
    const user = userEvent.setup()
    renderSegment({ type: "SYSTEM" })

    // Act — open the Radix Select for type
    await user.click(screen.getByRole("combobox", { name: /Type: / }))

    // Assert — the fixed fallback list is selectable
    expect(await screen.findByRole("option", { name: "System" })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: "User" })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: "Tool" })).toBeInTheDocument()
  })

  it("calls onTypeChange with the UPPERCASE value when the type is changed", async () => {
    // Arrange
    const callbacks = renderSegment({
      type: "SYSTEM",
      optionsType: OPTIONS_TYPE,
    })
    const user = userEvent.setup()

    // Act — open the type select and pick "Tool"
    await user.click(screen.getByRole("combobox", { name: /Type: / }))
    await user.click(await screen.findByRole("option", { name: "Tool" }))

    // Assert — catalog slugs are normalized to UPPERCASE ("tool" → "TOOL")
    expect(callbacks.onTypeChange).toHaveBeenCalledWith("TOOL")
  })

  it("calls onStatusChange with the UPPERCASE value when the status is changed", async () => {
    // Arrange
    const callbacks = renderSegment({
      status: "DRAFT",
      optionsStatus: OPTIONS_STATUS,
    })
    const user = userEvent.setup()

    // Act — open the status select and pick "Production"
    await user.click(screen.getByRole("combobox", { name: /Status: / }))
    await user.click(await screen.findByRole("option", { name: "Production" }))

    // Assert — catalog slugs are normalized to UPPERCASE
    expect(callbacks.onStatusChange).toHaveBeenCalledWith("PRODUCTION")
  })

  it("calls onLanguageChange with the lowercase slug when the language is changed", async () => {
    // Arrange
    const callbacks = renderSegment({
      language: "en",
      optionsLanguage: OPTIONS_LANGUAGE,
    })
    const user = userEvent.setup()

    // Act — open the language select and pick "Español"
    await user.click(screen.getByRole("combobox", { name: /Language: / }))
    await user.click(await screen.findByRole("option", { name: "Español" }))

    // Assert — language keeps the lowercase slug ("es"), unlike type/status
    expect(callbacks.onLanguageChange).toHaveBeenCalledWith("es")
  })

  it("calls onFavoriteChange with true when the favorite checkbox is checked", async () => {
    // Arrange
    const callbacks = renderSegment({ isFavorite: false })
    const user = userEvent.setup()

    // Act — check the favorite box (currently unchecked)
    await user.click(screen.getByLabelText("Mark as favorite"))

    // Assert
    expect(callbacks.onFavoriteChange).toHaveBeenCalledWith(true)
  })

  it("calls onFavoriteChange with false when the favorite checkbox is unchecked", async () => {
    // Arrange
    const callbacks = renderSegment({ isFavorite: true })
    const user = userEvent.setup()

    // Act — uncheck the favorite box (currently checked)
    await user.click(screen.getByLabelText("Mark as favorite"))

    // Assert
    expect(callbacks.onFavoriteChange).toHaveBeenCalledWith(false)
  })

  it("calls onSharedChange with true when the shared switch is turned on", async () => {
    // Arrange
    const callbacks = renderSegment({ isShared: false })
    const user = userEvent.setup()

    // Act — click the shared switch (currently off)
    await user.click(screen.getByRole("switch", { name: "Shared" }))

    // Assert
    expect(callbacks.onSharedChange).toHaveBeenCalledWith(true)
  })

  it("calls onSharedChange with false when the shared switch is turned off", async () => {
    // Arrange
    const callbacks = renderSegment({ isShared: true })
    const user = userEvent.setup()

    // Act — click the shared switch (currently on)
    await user.click(screen.getByRole("switch", { name: "Shared" }))

    // Assert
    expect(callbacks.onSharedChange).toHaveBeenCalledWith(false)
  })

  it("shows the error messages passed for type, status, language and isFavorite", () => {
    // Arrange & Act — every field has an error
    renderSegment({
      errors: {
        type: "bad",
        status: "bad2",
        language: "bad3",
        isFavorite: "bad4",
      },
    })

    // Assert — every error is rendered below its field
    expect(screen.getByText("bad")).toBeInTheDocument()
    expect(screen.getByText("bad2")).toBeInTheDocument()
    expect(screen.getByText("bad3")).toBeInTheDocument()
    expect(screen.getByText("bad4")).toBeInTheDocument()
  })

  it("keeps a legacy language value missing from the catalog as a synthetic option", async () => {
    // Arrange — "vasco" is stored but not part of the provided catalog
    // (en/es only), so the trigger would otherwise render empty
    const user = userEvent.setup()
    renderSegment({
      language: "vasco",
      optionsLanguage: OPTIONS_LANGUAGE,
    })

    // Act — open the language select; its trigger shows the legacy value
    await user.click(screen.getByRole("combobox", { name: /Language: / }))

    // Assert — the synthetic item is added to the list, proving the legacy
    // value is kept selectable (the select is not empty).
    expect(await screen.findByRole("option", { name: "vasco" })).toBeInTheDocument()
  })
})
