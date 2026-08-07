/**
 * @jest-environment jsdom
 *
 * Tests de PromptForm — switch de compartido (Subtarea 09) y flujos
 * principales (Subtarea 04): guardado nuevo (POST) y en edición (PUT),
 * error del servidor al guardar, duplicado, borrado con confirmación,
 * copiado al portapapeles y creación de entidades desde el formulario.
 *
 * Patrón seguido: ProfileUsersTab.test.tsx (fetch global, useSession mock,
 * next/navigation mock con push/refresh capturables, sonner mock, polyfills
 * Radix Select, mensajes en-GB reales) y SharedDetailActions.test.tsx
 * (clipboard definido por test, nunca en beforeEach + clearAllMocks).
 */

import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { NextIntlClientProvider } from "next-intl"
import { toast } from "sonner"
import { PromptForm } from "@/components/prompt/PromptForm"
import messages from "../../messages/en-GB.json"

jest.mock("next-auth/react", () => ({
  useSession: jest.fn(() => ({ data: null, status: "unauthenticated" })),
}))

// Module-level mocks so tests can assert router.push / router.refresh.
// Jest hoisting permits identifiers prefixed with "mock" in the factory.
const mockPush = jest.fn()
const mockRefresh = jest.fn()

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}))

// sonner toasts are asserted as calls (deterministic) instead of mounting the
// real Toaster (portals + timers would make the suite flaky in jsdom).
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

// A complete editable prompt (edit mode pre-fills every field so the Save
// flow works without typing required inputs).
const editPrompt = {
  id: "p1",
  title: "Weekly review",
  description: "A shared review prompt",
  body: "Write an essay",
  type: "USER",
  platform: null,
  modelHint: null,
  language: "en",
  useCase: null,
  clientOrProject: null,
  status: "DRAFT",
  isFavorite: false,
  isShared: false,
  version: 1,
  changelog: null,
  notes: null,
  prePrompt: null,
  manualDeUso: null,
  createdAt: "2026-01-01T10:00:00.000Z",
  updatedAt: "2026-01-01T10:00:00.000Z",
  categories: [],
  tags: [],
  platforms: [],
  clientProjects: [],
  useCases: [],
  modelHints: [],
}

function renderForm(options: { prompt?: typeof editPrompt } = {}) {
  return render(
    <NextIntlClientProvider locale="en-GB" messages={messages}>
      <PromptForm
        prompt={options.prompt}
        categories={[]}
        tags={[]}
        platforms={[]}
        clientProjects={[]}
        useCases={[]}
        modelHints={[]}
      />
    </NextIntlClientProvider>
  )
}

function okJson(body: unknown): Response {
  return { ok: true, json: jest.fn().mockResolvedValue(body) } as unknown as Response
}

function errorJson(error: string): Response {
  return { ok: false, json: jest.fn().mockResolvedValue({ error }) } as unknown as Response
}

function extractBody(fetchMock: jest.Mock, url: string): Record<string, unknown> {
  const call = fetchMock.mock.calls.find(([calledUrl]) => calledUrl === url)
  if (!call) throw new Error(`No fetch call found for ${url}`)
  return JSON.parse(call[1].body as string) as Record<string, unknown>
}

// The clipboard does not exist in jsdom; it is installed per test so that a
// later afterEach restoreAllMocks cannot detach the instance mid-test
// (SharedDetailActions corrected pattern).
function installClipboardMock(): jest.Mock {
  const writeTextMock = jest.fn().mockResolvedValue(undefined)
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: writeTextMock },
    configurable: true,
  })
  return writeTextMock
}

async function fillRequiredFields(
  user: ReturnType<typeof userEvent.setup>,
  title: string,
  body: string
) {
  await user.type(screen.getByLabelText("Title *"), title)
  await user.type(screen.getByLabelText("Prompt Body *"), body)
}

beforeAll(() => {
  // MetadataSegment mounts three Radix Selects; polyfill the APIs that
  // jsdom does not implement (ProfileAccountTab pattern).
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
  // jsdom does not expose fetch; provide it for the save PUT/POST.
  global.fetch = jest.fn().mockResolvedValue(okJson({ data: { id: "p1" } })) as typeof fetch
})

afterEach(() => {
  Reflect.deleteProperty(navigator, "clipboard")
  jest.restoreAllMocks()
})

describe("PromptForm shared switch", () => {
  it("renders the Shared switch with the value of the prompt being edited", () => {
    // Arrange & Act — edit a prompt that is already shared.
    renderForm({ prompt: { ...editPrompt, isShared: true } })

    // Assert — the switch state comes from the prompt (PromptForm.sharedLabel).
    expect(screen.getByRole("switch", { name: "Shared" })).toHaveAttribute(
      "aria-checked",
      "true"
    )
  })

  it("saves the prompt via PUT with isShared true after toggling the switch", async () => {
    // Arrange
    const user = userEvent.setup()
    renderForm({ prompt: editPrompt })

    // Act — toggle the Shared switch and save.
    await user.click(screen.getByRole("switch", { name: "Shared" }))
    await user.click(screen.getByRole("button", { name: "Save" }))

    // Assert — the PUT body carries isShared: true for the edited prompt.
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/prompts/p1",
        expect.objectContaining({ method: "PUT" })
      )
    })
    expect(
      extractBody(global.fetch as jest.Mock, "/api/prompts/p1")
    ).toMatchObject({ isShared: true, title: "Weekly review" })
  })

  it("creates a new prompt via POST with isShared true when the switch is enabled", async () => {
    // Arrange
    const user = userEvent.setup()
    renderForm()

    // Act — fill the required fields, enable the switch and save.
    await user.type(screen.getByLabelText("Title *"), "New shared prompt")
    await user.type(screen.getByLabelText("Prompt Body *"), "Hello world")
    await user.click(screen.getByRole("switch", { name: "Shared" }))
    await user.click(screen.getByRole("button", { name: "Save" }))

    // Assert — the POST body carries isShared: true.
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/prompts",
        expect.objectContaining({ method: "POST" })
      )
    })
    expect(
      extractBody(global.fetch as jest.Mock, "/api/prompts")
    ).toMatchObject({
      title: "New shared prompt",
      isShared: true,
    })
  })
})

describe("PromptForm main flows", () => {
  it("saves a new prompt via POST and navigates to the created prompt", async () => {
    // Arrange
    const user = userEvent.setup()
    renderForm()

    // Act — fill the required fields and save.
    await fillRequiredFields(user, "My new prompt", "Hello world")
    await user.click(screen.getByRole("button", { name: "Save" }))

    // Assert — POST /api/prompts with method, headers and the full payload
    // (isFavorite/isShared false by default), then router.push to the detail.
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/prompts",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })
      )
    })
    expect(extractBody(global.fetch as jest.Mock, "/api/prompts")).toEqual({
      title: "My new prompt",
      description: "",
      body: "Hello world",
      type: "USER",
      language: "es",
      status: "DRAFT",
      isFavorite: false,
      isShared: false,
      version: 1,
      changelog: "",
      notes: "",
      prePrompt: "",
      manualDeUso: "",
      categoryIds: [],
      platformIds: [],
      tagIds: [],
      clientProjectIds: [],
      useCaseIds: [],
      modelHintIds: [],
    })
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/prompts/p1")
    })
  })

  it("saves an edited prompt via PUT and refreshes the page", async () => {
    // Arrange
    const user = userEvent.setup()
    renderForm({ prompt: editPrompt })

    // Act — save without touching any field (all pre-filled).
    await user.click(screen.getByRole("button", { name: "Save" }))

    // Assert — PUT to /api/prompts/{id} with the pre-filled payload and
    // router.refresh (edit mode does not navigate).
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/prompts/p1",
        expect.objectContaining({ method: "PUT" })
      )
    })
    expect(extractBody(global.fetch as jest.Mock, "/api/prompts/p1")).toEqual({
      title: "Weekly review",
      description: "A shared review prompt",
      body: "Write an essay",
      type: "USER",
      language: "en",
      status: "DRAFT",
      isFavorite: false,
      isShared: false,
      version: 1,
      changelog: "",
      notes: "",
      prePrompt: "",
      manualDeUso: "",
      categoryIds: [],
      platformIds: [],
      tagIds: [],
      clientProjectIds: [],
      useCaseIds: [],
      modelHintIds: [],
    })
    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled()
    })
    expect(mockPush).not.toHaveBeenCalled()
  })

  it("shows the Common.errorToast message when the server rejects the save", async () => {
    // Arrange
    const user = userEvent.setup()
    global.fetch = jest.fn().mockResolvedValue(errorJson("Server message")) as typeof fetch
    renderForm()

    // Act
    await fillRequiredFields(user, "My new prompt", "Hello world")
    await user.click(screen.getByRole("button", { name: "Save" }))

    // Assert — the server error is interpolated into Common.errorToast
    // ("Error: {message}") and no navigation happens.
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Error: Server message")
    })
    expect(mockPush).not.toHaveBeenCalled()
  })

  it("shows PromptForm.saveFailed when the save request throws", async () => {
    // Arrange
    const user = userEvent.setup()
    jest.spyOn(console, "error").mockImplementation(() => {})
    global.fetch = jest.fn().mockRejectedValue(new Error("network down")) as typeof fetch
    renderForm()

    // Act
    await fillRequiredFields(user, "My new prompt", "Hello world")
    await user.click(screen.getByRole("button", { name: "Save" }))

    // Assert — the catch branch toasts PromptForm.saveFailed.
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to save prompt")
    })
  })

  it("duplicates the prompt via POST with the (Copy) title and version 1, then navigates", async () => {
    // Arrange
    const user = userEvent.setup()
    renderForm({ prompt: editPrompt })

    // Act
    await user.click(screen.getByRole("button", { name: "Duplicate" }))

    // Assert — POST /api/prompts with PromptForm.duplicateTitle "{title} (Copy)",
    // version reset to 1 and the changelog "Duplicated from version 1", then
    // router.push to the new duplicate detail page.
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/prompts",
        expect.objectContaining({ method: "POST" })
      )
    })
    expect(extractBody(global.fetch as jest.Mock, "/api/prompts")).toEqual({
      title: "Weekly review (Copy)",
      description: "A shared review prompt",
      body: "Write an essay",
      type: "USER",
      language: "en",
      status: "DRAFT",
      isFavorite: false,
      isShared: false,
      version: 1,
      changelog: "Duplicated from version 1",
      notes: "",
      prePrompt: "",
      manualDeUso: "",
      categoryIds: [],
      platformIds: [],
      tagIds: [],
      clientProjectIds: [],
      useCaseIds: [],
      modelHintIds: [],
    })
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/prompts/p1")
    })
  })

  it("shows the server error toast when duplicating fails", async () => {
    // Arrange
    const user = userEvent.setup()
    global.fetch = jest.fn().mockResolvedValue(errorJson("Duplicate failed")) as typeof fetch
    renderForm({ prompt: editPrompt })

    // Act
    await user.click(screen.getByRole("button", { name: "Duplicate" }))

    // Assert — the server message is interpolated into Common.errorToast.
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Error: Duplicate failed")
    })
    expect(mockPush).not.toHaveBeenCalled()
  })

  it("deletes the prompt via DELETE after confirmation and navigates to the list", async () => {
    // Arrange
    const user = userEvent.setup()
    jest.spyOn(window, "confirm").mockReturnValue(true)
    renderForm({ prompt: editPrompt })

    // Act
    await user.click(screen.getByRole("button", { name: "Delete" }))

    // Assert — the confirmation uses PromptForm.deleteConfirm, the DELETE
    // targets /api/prompts/{id} and the user lands on the prompts list.
    expect(window.confirm).toHaveBeenCalledWith(
      "Are you sure you want to delete this prompt?"
    )
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/prompts/p1", {
        method: "DELETE",
      })
    })
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/prompts")
    })
    expect(mockRefresh).toHaveBeenCalled()
  })

  it("does not call the API when the delete confirmation is cancelled", async () => {
    // Arrange
    const user = userEvent.setup()
    jest.spyOn(window, "confirm").mockReturnValue(false)
    renderForm({ prompt: editPrompt })

    // Act
    await user.click(screen.getByRole("button", { name: "Delete" }))

    // Assert — no request is sent without confirmation.
    expect(window.confirm).toHaveBeenCalled()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it("shows the server error toast when the delete fails", async () => {
    // Arrange
    const user = userEvent.setup()
    jest.spyOn(window, "confirm").mockReturnValue(true)
    global.fetch = jest.fn().mockResolvedValue(errorJson("Cannot delete")) as typeof fetch
    renderForm({ prompt: editPrompt })

    // Act
    await user.click(screen.getByRole("button", { name: "Delete" }))

    // Assert — the server message is interpolated into Common.errorToast.
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Error: Cannot delete")
    })
    expect(mockPush).not.toHaveBeenCalled()
  })

  it("copies the body, increments the usage counter and shows the success toast", async () => {
    // Arrange
    const user = userEvent.setup()
    const writeTextMock = installClipboardMock()
    renderForm({ prompt: editPrompt })

    // Act
    await user.click(screen.getByRole("button", { name: "Copy Prompt" }))

    // Assert — the body goes to the clipboard, the usage endpoint is PATCHed
    // and PromptForm.copiedToClipboard is toasted.
    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith("Write an essay")
    })
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/prompts/p1/usage", {
        method: "PATCH",
      })
    })
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Copied to clipboard!")
    })
  })

  it("shows the copy error toast and skips the usage PATCH when the clipboard fails", async () => {
    // Arrange
    const user = userEvent.setup()
    jest.spyOn(console, "error").mockImplementation(() => {})
    const writeTextMock = installClipboardMock()
    writeTextMock.mockRejectedValueOnce(new Error("clipboard denied"))
    renderForm({ prompt: editPrompt })

    // Act
    await user.click(screen.getByRole("button", { name: "Copy Prompt" }))

    // Assert — PromptForm.copyFailed is toasted and no usage request is sent.
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to copy to clipboard")
    })
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it("creates a new platform from the form and clears the input", async () => {
    // Arrange
    const user = userEvent.setup()
    global.fetch = jest
      .fn()
      .mockResolvedValue(okJson({ data: { id: "plat1", name: "OpenAI", slug: "openai" } })) as typeof fetch
    renderForm()

    // Act — type a platform name and click the create button next to the input.
    const platformInput = screen.getByPlaceholderText("New platform...")
    await user.type(platformInput, "OpenAI")
    await user.click(platformInput.nextElementSibling as HTMLElement)

    // Assert — POST /api/platforms with the typed name; the input is reset.
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/platforms",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "OpenAI" }),
        })
      )
    })
    await waitFor(() => {
      expect(platformInput).toHaveValue("")
    })
  })

  it("does not create a platform when the name is empty", async () => {
    // Arrange
    const user = userEvent.setup()
    renderForm()

    // Act — the create button is disabled while the input is empty and
    // pressing Enter on the empty input is a no-op.
    const platformInput = screen.getByPlaceholderText("New platform...")
    expect(platformInput.nextElementSibling as HTMLElement).toBeDisabled()
    await user.type(platformInput, "{Enter}")

    // Assert — no request is sent for an empty name.
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it("includes a platform created in the form in the saved prompt payload", async () => {
    // Arrange
    const user = userEvent.setup()
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(okJson({ data: { id: "plat1", name: "OpenAI", slug: "openai" } }))
      .mockResolvedValueOnce(okJson({ data: { id: "p1" } })) as typeof fetch
    renderForm()

    // Act — create the platform, then fill the required fields and save.
    const platformInput = screen.getByPlaceholderText("New platform...")
    await user.type(platformInput, "OpenAI")
    await user.click(platformInput.nextElementSibling as HTMLElement)
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/platforms",
        expect.objectContaining({ method: "POST" })
      )
    })
    await fillRequiredFields(user, "My new prompt", "Hello world")
    await user.click(screen.getByRole("button", { name: "Save" }))

    // Assert — the newly created platform is attached as platformIds.
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/prompts",
        expect.objectContaining({ method: "POST" })
      )
    })
    expect(extractBody(global.fetch as jest.Mock, "/api/prompts")).toMatchObject({
      platformIds: ["plat1"],
    })
  })
})
