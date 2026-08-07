/**
 * @jest-environment jsdom
 *
 * Subtarea 09 — Etapa final: tests de SharedList (página /shared).
 * Cubre el render de la tabla con las columnas de compartidos, la búsqueda
 * server-side vía router.push con ?search=, el botón de limpiar y el estado
 * vacío.
 *
 * Patrón seguido: PromptFilters.test.tsx (mock de next/navigation con push)
 * y mensajes en-GB reales vía NextIntlClientProvider.
 */

import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { NextIntlClientProvider } from "next-intl"
import { SharedList, type SharedPrompt } from "@/components/shared/SharedList"
import messages from "../../messages/en-GB.json"

const mockPush = jest.fn()

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}))

const sharedPrompts: SharedPrompt[] = [
  {
    id: "sp1",
    title: "Weekly review",
    description: "A shared review prompt",
    type: "USER",
    status: "PRODUCTION",
    language: "en",
    categories: [{ category: { id: "c1", name: "Writing", slug: "writing" } }],
    tags: [{ tag: { id: "tg1", name: "Important", slug: "important" } }],
    clientProjects: [{ clientProject: { id: "cp1", name: "Acme", slug: "acme" } }],
    useCases: [{ useCase: { id: "uc1", name: "Email", slug: "email" } }],
    useCase: null,
  },
  {
    id: "sp2",
    title: "Refactor helper",
    description: null,
    type: "TOOL",
    status: "DRAFT",
    language: "es",
    categories: [],
    tags: [],
    clientProjects: [],
    useCases: [],
    // Legacy free-text use case, shown when the N:M relation is empty.
    useCase: "Coding",
  },
]

function renderSharedList(
  prompts: SharedPrompt[] = sharedPrompts,
  initialSearch = ""
) {
  return render(
    <NextIntlClientProvider locale="en-GB" messages={messages}>
      <SharedList prompts={prompts} initialSearch={initialSearch} />
    </NextIntlClientProvider>
  )
}

describe("SharedList", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("renders the table with all shared columns and the prompt data", () => {
    // Arrange & Act
    renderSharedList()

    // Assert — the 8 columns of the shared list plus translated row values:
    // type labels come from MetadataSegment, status/language stay raw, and
    // the N:M relation names render as badges.
    expect(screen.getByText("Title")).toBeInTheDocument()
    expect(screen.getByText("Status")).toBeInTheDocument()
    expect(screen.getByText("Type")).toBeInTheDocument()
    expect(screen.getByText("Language")).toBeInTheDocument()
    expect(screen.getByText("Categories")).toBeInTheDocument()
    expect(screen.getByText("Tags")).toBeInTheDocument()
    expect(screen.getByText("Client / Project")).toBeInTheDocument()
    expect(screen.getByText("Use Case")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Weekly review" })).toHaveAttribute(
      "href",
      "/shared/sp1"
    )
    expect(screen.getByText("PRODUCTION")).toBeInTheDocument()
    expect(screen.getByText("User")).toBeInTheDocument()
    expect(screen.getByText("Writing")).toBeInTheDocument()
    expect(screen.getByText("Important")).toBeInTheDocument()
    expect(screen.getByText("Acme")).toBeInTheDocument()
    expect(screen.getByText("Email")).toBeInTheDocument()
    // Second row: TOOL type label, legacy free-text use case.
    expect(screen.getByText("Tool")).toBeInTheDocument()
    expect(screen.getByText("Coding")).toBeInTheDocument()
  })

  it("navigates to /shared with the search param when the search is submitted", async () => {
    // Arrange
    const user = userEvent.setup()
    renderSharedList()

    // Act — type a query and submit the form (Enter).
    await user.type(
      screen.getByPlaceholderText("Search shared prompts..."),
      "weekly{enter}"
    )

    // Assert — the server-side search pattern: push with ?search=.
    expect(mockPush).toHaveBeenCalledWith("/shared?search=weekly")
  })

  it("navigates back to /shared when the search is cleared", async () => {
    // Arrange
    const user = userEvent.setup()
    renderSharedList()

    // Act — type something so the Clear button appears, then click it.
    await user.type(screen.getByPlaceholderText("Search shared prompts..."), "abc")
    await user.click(screen.getByRole("button", { name: "Clear" }))

    // Assert — the query is reset and the list reloads without params.
    expect(mockPush).toHaveBeenCalledWith("/shared")
  })

  it("shows the empty message when there are no shared prompts", () => {
    // Arrange & Act
    renderSharedList([])

    // Assert — SharedPage.noSharedFound.
    expect(screen.getByText("No shared prompts found")).toBeInTheDocument()
    expect(screen.queryByRole("table")).not.toBeInTheDocument()
  })
})
