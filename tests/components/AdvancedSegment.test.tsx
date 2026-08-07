/**
 * @jest-environment jsdom
 *
 * Subtarea 2 — Segmentos pequeños del formulario de prompts: AdvancedSegment.
 * Cubre el renderizado de los valores iniciales (versión, changelog, notas),
 * la propagación de cambios hacia los callbacks (parseo de versión con
 * fallback a 1 para valores inválidos) y la visualización de errores.
 *
 * Componente presentacional puro: sin red, sin contexto adicional más allá
 * de NextIntlClientProvider con los mensajes reales en-GB.
 */

import { render, screen, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { NextIntlClientProvider } from "next-intl"
import AdvancedSegment from "@/components/prompt/AdvancedSegment"
import messages from "../../messages/en-GB.json"

type AdvancedSegmentProps = React.ComponentProps<typeof AdvancedSegment>

function renderSegment(overrides: Partial<AdvancedSegmentProps> = {}) {
  const callbacks = {
    onVersionChange: jest.fn(),
    onChangelogChange: jest.fn(),
    onNotesChange: jest.fn(),
  }
  render(
    <NextIntlClientProvider locale="en-GB" messages={messages}>
      <AdvancedSegment
        version={3}
        changelog="Added error handling"
        notes="Internal notes"
        {...callbacks}
        {...overrides}
      />
    </NextIntlClientProvider>
  )
  return callbacks
}

describe("AdvancedSegment", () => {
  it("renders the initial values in the version, changelog and notes fields", () => {
    // Arrange & Act
    renderSegment()

    // Assert — every field shows its initial value (version as a number).
    expect(screen.getByLabelText("Version")).toHaveValue(3)
    expect(screen.getByLabelText("Changelog")).toHaveValue("Added error handling")
    expect(screen.getByLabelText("Notes")).toHaveValue("Internal notes")
  })

  it("calls onVersionChange with the parsed number when the version changes", () => {
    // Arrange
    const callbacks = renderSegment()

    // Act — the component is controlled (callbacks do not update props), so
    // a full-value change replaces the displayed value.
    fireEvent.change(screen.getByLabelText("Version"), {
      target: { value: "7" },
    })

    // Assert — the version is parsed from the input as a number.
    expect(callbacks.onVersionChange).toHaveBeenCalledWith(7)
  })

  it("calls onVersionChange with 1 when the version value is invalid", () => {
    // Arrange
    const callbacks = renderSegment()

    // Act
    fireEvent.change(screen.getByLabelText("Version"), {
      target: { value: "abc" },
    })

    // Assert — parseInt yields NaN and the fallback value 1 is reported.
    expect(callbacks.onVersionChange).toHaveBeenCalledWith(1)
  })

  it("calls onChangelogChange with the typed text when the changelog changes", () => {
    // Arrange
    const callbacks = renderSegment()

    // Act — controlled component: fireEvent.change replaces the full value.
    fireEvent.change(screen.getByLabelText("Changelog"), {
      target: { value: "Refactored the save flow" },
    })

    // Assert
    expect(callbacks.onChangelogChange).toHaveBeenCalledWith(
      "Refactored the save flow"
    )
  })

  it("calls onNotesChange with the typed text when the notes change", () => {
    // Arrange
    const callbacks = renderSegment()

    // Act — controlled component: fireEvent.change replaces the full value.
    fireEvent.change(screen.getByLabelText("Notes"), {
      target: { value: "Needs QA review" },
    })

    // Assert
    expect(callbacks.onNotesChange).toHaveBeenCalledWith("Needs QA review")
  })

  it("shows the error messages passed for version, changelog and notes", () => {
    // Arrange & Act
    renderSegment({
      errors: {
        version: "Version must be a positive number",
        changelog: "Changelog is required",
        notes: "Notes are too long",
      },
    })

    // Assert — every error is rendered below its field.
    expect(screen.getByText("Version must be a positive number")).toBeInTheDocument()
    expect(screen.getByText("Changelog is required")).toBeInTheDocument()
    expect(screen.getByText("Notes are too long")).toBeInTheDocument()
  })
})
