/**
 * @jest-environment jsdom
 *
 * Subtarea 01 — pruebas de componente de los botones de transferencia de
 * datos del perfil (DataTransferButtons): exportación (GET /api/export/prompts
 * + descarga vía ancla) e importación (diálogo, selección de archivo,
 * POST /api/import/prompts), incluyendo fallos de servidor, JSON inválido y
 * el estado ocupado con botones deshabilitados.
 *
 * Patrón seguido: SharedDetailActions.test.tsx (fetch global con jest.fn,
 * sonner con avisos como llamadas deterministas, mensajes reales en-GB) y
 * ProfileUsersTab.test.tsx (mock de next/navigation, polyfills de Radix para
 * el diálogo, casts `as unknown as Response` sin `any`).
 */

import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { NextIntlClientProvider } from "next-intl"
import { toast } from "sonner"
import { DataTransferButtons } from "@/components/profile/DataTransferButtons"
import messages from "../../messages/en-GB.json"

// The router refresh is asserted after a successful import; the variable
// name keeps the `mock` prefix required by Jest's factory hoisting.
const mockRefresh = jest.fn()

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), refresh: mockRefresh }),
}))

// sonner toasts are asserted as calls (deterministic) instead of mounting the
// real Toaster (portals + timers would make the suite flaky in jsdom).
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

function renderButtons() {
  return render(
    <NextIntlClientProvider locale="en-GB" messages={messages}>
      <DataTransferButtons />
    </NextIntlClientProvider>
  )
}

// jsdom does not implement URL.createObjectURL/revokeObjectURL; install them
// per test and remove them in afterEach (same pattern as the clipboard mock
// in SharedDetailActions.test.tsx).
function installBlobUrlMocks() {
  window.URL.createObjectURL = jest.fn().mockReturnValue("blob:mock-url")
  window.URL.revokeObjectURL = jest.fn()
}

describe("DataTransferButtons", () => {
  beforeAll(() => {
    // Radix Dialog relies on PointerEvent and pointer-capture APIs that
    // jsdom does not implement; polyfill them so the dialog can mount
    // (same pattern as ProfileUsersTab.test.tsx).
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
    // jsdom does not implement File.prototype.text(); the import flow reads
    // the selected file via .text(), so provide a controllable mock.
    Object.defineProperty(File.prototype, "text", {
      configurable: true,
      writable: true,
      value: jest.fn(),
    })
  })

  beforeEach(() => {
    jest.clearAllMocks()
    // jsdom does not expose fetch; provide it for the export/import calls.
    global.fetch = jest.fn().mockResolvedValue({ ok: true } as unknown as Response) as typeof fetch
  })

  afterEach(() => {
    Reflect.deleteProperty(window.URL, "createObjectURL")
    Reflect.deleteProperty(window.URL, "revokeObjectURL")
    jest.restoreAllMocks()
  })

  it("downloads the exported prompts file when the export API succeeds", async () => {
    // Arrange
    const user = userEvent.setup()
    const blob = new Blob(["data"])
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      blob: jest.fn().mockResolvedValue(blob),
    } as unknown as Response) as typeof fetch
    installBlobUrlMocks()
    // The component creates the anchor internally; spying on the prototype
    // click lets us capture the element without triggering a real jsdom
    // navigation (robust, no createElement mocking).
    let clickedAnchor: HTMLAnchorElement | undefined
    jest
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(function (this: HTMLAnchorElement) {
        clickedAnchor = this
      })
    renderButtons()

    // Act
    await user.click(screen.getByRole("button", { name: "Export" }))

    // Assert — the export endpoint is fetched, the download anchor is
    // clicked with a prompts-export-<date>.json filename and no error toast
    // is shown.
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/export/prompts")
    })
    await waitFor(() => {
      expect(clickedAnchor).toBeDefined()
    })
    expect(clickedAnchor?.href).toBe("blob:mock-url")
    expect(clickedAnchor?.download).toMatch(/^prompts-export-\d{4}-\d{2}-\d{2}\.json$/)
    expect(window.URL.createObjectURL).toHaveBeenCalledWith(blob)
    expect(window.URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url")
    expect(toast.error).not.toHaveBeenCalled()
  })

  it("shows the export failure toast when the export API fails", async () => {
    // Arrange
    const user = userEvent.setup()
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {})
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
    } as unknown as Response) as typeof fetch
    renderButtons()

    // Act
    await user.click(screen.getByRole("button", { name: "Export" }))

    // Assert — Topbar.exportFailed is toasted and the error is logged.
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to export prompts")
    })
    expect(consoleErrorSpy).toHaveBeenCalledWith("Export failed:", expect.any(Error))
  })

  it("imports a selected JSON file via POST and shows the success toast", async () => {
    // Arrange
    const user = userEvent.setup()
    global.fetch = jest.fn().mockResolvedValue({ ok: true } as unknown as Response) as typeof fetch
    ;(File.prototype.text as jest.Mock).mockResolvedValue('{"title":"T"}')
    renderButtons()

    // Act — open the dialog, pick the file and submit the import (the dialog
    // action button shares the "Import" name with the trigger, so the action
    // is scoped with within(dialog)).
    await user.click(screen.getByRole("button", { name: "Import" }))
    const dialog = await screen.findByRole("dialog")
    expect(screen.getByText("Import Prompts")).toBeInTheDocument()
    const fileInput = dialog.querySelector('input[type="file"]')
    if (!(fileInput instanceof HTMLInputElement)) throw new Error("File input not found")
    fireEvent.change(fileInput, {
      target: { files: [new File(['{"title":"T"}'], "prompts.json", { type: "application/json" })] },
    })
    await user.click(within(dialog).getByRole("button", { name: "Import" }))

    // Assert — the POST carries the parsed JSON, the success toast appears,
    // the dialog closes and the router refreshes.
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/import/prompts",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "T" }),
        })
      )
    })
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Import successful!")
    })
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    })
    expect(mockRefresh).toHaveBeenCalled()
  })

  it("shows the server error message when the import API rejects the file", async () => {
    // Arrange
    const user = userEvent.setup()
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: jest.fn().mockResolvedValue({ error: "Server error message" }),
    } as unknown as Response) as typeof fetch
    ;(File.prototype.text as jest.Mock).mockResolvedValue('{"title":"T"}')
    renderButtons()

    // Act — open the dialog, pick a file and submit the import.
    await user.click(screen.getByRole("button", { name: "Import" }))
    const dialog = await screen.findByRole("dialog")
    const fileInput = dialog.querySelector('input[type="file"]')
    if (!(fileInput instanceof HTMLInputElement)) throw new Error("File input not found")
    fireEvent.change(fileInput, {
      target: { files: [new File(['{"title":"T"}'], "prompts.json", { type: "application/json" })] },
    })
    await user.click(within(dialog).getByRole("button", { name: "Import" }))

    // Assert — Topbar.importFailed interpolates the API error message.
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Import failed: Server error message")
    })
  })

  it("shows the fallback toast and logs the error when the file is not valid JSON", async () => {
    // Arrange
    const user = userEvent.setup()
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {})
    ;(File.prototype.text as jest.Mock).mockResolvedValue("not-json")
    renderButtons()

    // Act — pick a file whose contents are not valid JSON and submit.
    await user.click(screen.getByRole("button", { name: "Import" }))
    const dialog = await screen.findByRole("dialog")
    const fileInput = dialog.querySelector('input[type="file"]')
    if (!(fileInput instanceof HTMLInputElement)) throw new Error("File input not found")
    fireEvent.change(fileInput, {
      target: { files: [new File(["not-json"], "prompts.json", { type: "application/json" })] },
    })
    await user.click(within(dialog).getByRole("button", { name: "Import" }))

    // Assert — JSON.parse throws before any request, so Topbar.importFailedFallback
    // is toasted and no POST is attempted.
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to import prompts")
    })
    expect(consoleErrorSpy).toHaveBeenCalledWith("Import failed:", expect.any(SyntaxError))
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it("disables the export button while the export request is in flight and re-enables it afterwards", async () => {
    // Arrange — a controllable promise keeps the request pending so the
    // busy state can be observed.
    const user = userEvent.setup()
    let resolveFetch!: (value: Response) => void
    global.fetch = jest.fn().mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveFetch = resolve
      })
    )
    installBlobUrlMocks()
    jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {})
    renderButtons()

    // Act — start an export that does not resolve yet.
    await user.click(screen.getByRole("button", { name: "Export" }))

    // Assert — the export button is disabled while the request is pending.
    expect(screen.getByRole("button", { name: "Export" })).toBeDisabled()

    // Act — the request completes successfully.
    await act(async () => {
      resolveFetch({
        ok: true,
        blob: jest.fn().mockResolvedValue(new Blob(["data"])),
      } as unknown as Response)
    })

    // Assert — the export button is enabled again.
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Export" })).toBeEnabled()
    })
  })
})
