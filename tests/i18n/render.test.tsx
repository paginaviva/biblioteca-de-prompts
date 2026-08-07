/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import { ViewToggle } from "@/components/prompt/ViewToggle"
import { ViewModeProvider } from "@/contexts/ViewModeContext"
import messagesEnGB from "../../messages/en-GB.json"
import messagesEsES from "../../messages/es-ES.json"

describe("ViewToggle i18n rendering", () => {
  it("renders the en-GB labels with the real en-GB messages", () => {
    // Arrange
    render(
      <NextIntlClientProvider locale="en-GB" messages={messagesEnGB}>
        <ViewModeProvider initialViewMode="cards">
          <ViewToggle />
        </ViewModeProvider>
      </NextIntlClientProvider>
    )

    // Assert
    expect(screen.getByText("Cards")).toBeInTheDocument()
    expect(screen.getByText("List")).toBeInTheDocument()
  })

  it("renders the es-ES labels with the real es-ES messages", () => {
    // Arrange
    render(
      <NextIntlClientProvider locale="es-ES" messages={messagesEsES}>
        <ViewModeProvider initialViewMode="cards">
          <ViewToggle />
        </ViewModeProvider>
      </NextIntlClientProvider>
    )

    // Assert
    expect(screen.getByText("Tarjetas")).toBeInTheDocument()
    expect(screen.getByText("Lista")).toBeInTheDocument()
  })
})
