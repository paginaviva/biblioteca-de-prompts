/**
 * @jest-environment jsdom
 *
 * Subtarea 09 — Etapa final: tests de SharedDetailActions.
 * Cubre el copiado del body al portapapeles con incremento del contador de
 * usos (PATCH a /api/prompts/:id/usage) y el toast de éxito, y el caso de
 * error cuando el portapapeles falla (sin PATCH y con toast de error).
 *
 * El portapapeles no existe en jsdom; se define en la instancia dentro de
 * cada test (el patrón con beforeEach resultó frágil con restoreAllMocks).
 */

import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { NextIntlClientProvider } from "next-intl"
import { toast } from "sonner"
import { SharedDetailActions } from "@/components/shared/SharedDetailActions"
import messages from "../../messages/en-GB.json"

jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

function renderActions(promptId = "sp1", body = "Write an essay") {
  return render(
    <NextIntlClientProvider locale="en-GB" messages={messages}>
      <SharedDetailActions promptId={promptId} body={body} />
    </NextIntlClientProvider>
  )
}

function installClipboardMock(): jest.Mock {
  const writeTextMock = jest.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: writeTextMock },
    configurable: true,
  })
  return writeTextMock
}

describe("SharedDetailActions", () => {
  beforeEach(() => {
    // jsdom does not expose fetch; provide it for the usage PATCH.
    global.fetch = jest.fn().mockResolvedValue({ ok: true } as Response) as typeof fetch
  })

  afterEach(() => {
    Reflect.deleteProperty(navigator, "clipboard")
    jest.restoreAllMocks()
  })

  it("copies the body to the clipboard, increments the usage counter and shows the success toast", async () => {
    // Arrange
    const user = userEvent.setup()
    const writeTextMock = installClipboardMock()
    renderActions("sp1", "Write an essay")

    // Act
    await user.click(screen.getByRole("button", { name: "Copy" }))

    // Assert — the body goes to the clipboard, the shared usage endpoint is
    // PATCHed and PromptForm.copiedToClipboard is toasted.
    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith("Write an essay")
    })
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/prompts/sp1/usage", {
        method: "PATCH",
      })
    })
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Copied to clipboard!")
    })
  })

  it("shows the error toast and skips the usage PATCH when the clipboard fails", async () => {
    // Arrange
    const user = userEvent.setup()
    jest.spyOn(console, "error").mockImplementation(() => {})
    const writeTextMock = installClipboardMock()
    writeTextMock.mockRejectedValueOnce(new Error("clipboard denied"))
    renderActions()

    // Act
    await user.click(screen.getByRole("button", { name: "Copy" }))

    // Assert — PromptForm.copyFailed is toasted and no usage request is sent.
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to copy to clipboard")
    })
    expect(global.fetch).not.toHaveBeenCalled()
  })
})
