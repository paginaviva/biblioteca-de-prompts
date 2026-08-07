/**
 * @jest-environment jsdom
 *
 * Subtarea 2 — Segmentos pequeños del formulario de prompts:
 * BasicInfoSegment. Cubre el renderizado de los valores iniciales (título,
 * descripción, contenido), la propagación de cambios hacia los callbacks y
 * la visualización de errores.
 *
 * Componente presentacional puro: sin red, sin contexto adicional más allá
 * de NextIntlClientProvider con los mensajes reales en-GB.
 */

import { render, screen, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { NextIntlClientProvider } from "next-intl"
import BasicInfoSegment from "@/components/prompt/BasicInfoSegment"
import messages from "../../messages/en-GB.json"

type BasicInfoSegmentProps = React.ComponentProps<typeof BasicInfoSegment>

function renderSegment(overrides: Partial<BasicInfoSegmentProps> = {}) {
  const callbacks = {
    onTitleChange: jest.fn(),
    onDescriptionChange: jest.fn(),
    onBodyChange: jest.fn(),
  }
  render(
    <NextIntlClientProvider locale="en-GB" messages={messages}>
      <BasicInfoSegment
        title="Write a test"
        description="A short description"
        body="Hello world"
        {...callbacks}
        {...overrides}
      />
    </NextIntlClientProvider>
  )
  return callbacks
}

describe("BasicInfoSegment", () => {
  it("renders the initial values in the title, description and body fields", () => {
    // Arrange & Act
    renderSegment()

    // Assert — every field shows its initial value.
    expect(screen.getByLabelText("Title *")).toHaveValue("Write a test")
    expect(screen.getByLabelText("Description")).toHaveValue("A short description")
    expect(screen.getByLabelText("Prompt Body *")).toHaveValue("Hello world")
  })

  it("calls onTitleChange with the typed text when the title changes", () => {
    // Arrange
    const callbacks = renderSegment()

    // Act — controlled component: fireEvent.change replaces the full value.
    fireEvent.change(screen.getByLabelText("Title *"), {
      target: { value: "Write a better test" },
    })

    // Assert
    expect(callbacks.onTitleChange).toHaveBeenCalledWith("Write a better test")
  })

  it("calls onDescriptionChange with the typed text when the description changes", () => {
    // Arrange
    const callbacks = renderSegment()

    // Act — controlled component: fireEvent.change replaces the full value.
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "A much longer description" },
    })

    // Assert
    expect(callbacks.onDescriptionChange).toHaveBeenCalledWith(
      "A much longer description"
    )
  })

  it("calls onBodyChange with the typed text when the body changes", () => {
    // Arrange
    const callbacks = renderSegment()

    // Act — controlled component: fireEvent.change replaces the full value.
    fireEvent.change(screen.getByLabelText("Prompt Body *"), {
      target: { value: "New prompt body" },
    })

    // Assert
    expect(callbacks.onBodyChange).toHaveBeenCalledWith("New prompt body")
  })

  it("shows the error messages passed for title, description and body", () => {
    // Arrange & Act
    renderSegment({
      errors: {
        title: "Title is required",
        description: "Description must be shorter",
        body: "Body must not be empty",
      },
    })

    // Assert — every error is rendered below its field.
    expect(screen.getByText("Title is required")).toBeInTheDocument()
    expect(screen.getByText("Description must be shorter")).toBeInTheDocument()
    expect(screen.getByText("Body must not be empty")).toBeInTheDocument()
  })
})
