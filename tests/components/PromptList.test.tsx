import { render, screen } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import { PromptList } from "@/components/prompt/PromptList"
import { ViewModeProvider } from "@/contexts/ViewModeContext"
import messages from "../../messages/en-GB.json"

const mockPrompts = [
  {
    id: "1",
    title: "Test Prompt 1",
    description: "Test description",
    platform: "CURSOR",
    status: "PRODUCTION",
    isFavorite: true,
    lastUsedAt: new Date().toISOString(),
    usageCount: 5,
    category: { name: "Coding" },
    tags: [{ tag: { name: "refactoring" } }],
    platforms: [{ platform: { name: "CURSOR" } }],
    categories: [{ category: { name: "Coding" } }],
    clientProjects: [],
    user: { name: "Test User", email: "test@example.com" },
    body: "Test prompt body",
  },
  {
    id: "2",
    title: "Test Prompt 2",
    description: null,
    platform: "CHATGPT",
    status: "DRAFT",
    isFavorite: false,
    lastUsedAt: null,
    usageCount: 0,
    category: null,
    tags: [],
    platforms: [],
    categories: [],
    clientProjects: [],
    user: null,
    body: "Test prompt body 2",
  },
]

function renderWithViewModeProvider(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en-GB" messages={messages}>
      <ViewModeProvider initialViewMode="cards">
        {ui}
      </ViewModeProvider>
    </NextIntlClientProvider>
  )
}

describe("PromptList", () => {
  it("renders prompts", () => {
    renderWithViewModeProvider(<PromptList prompts={mockPrompts} />)

    expect(screen.getByText("Test Prompt 1")).toBeInTheDocument()
    expect(screen.getByText("Test Prompt 2")).toBeInTheDocument()
  })

  it("renders empty state when no prompts", () => {
    renderWithViewModeProvider(<PromptList prompts={[]} />)

    expect(screen.getByText("No prompts found.")).toBeInTheDocument()
  })

  it("displays prompt metadata", () => {
    renderWithViewModeProvider(<PromptList prompts={[mockPrompts[0]]} />)

    expect(screen.getByText("CURSOR")).toBeInTheDocument()
    expect(screen.getByText("PRODUCTION")).toBeInTheDocument()
    expect(screen.getByText("Coding")).toBeInTheDocument()
    expect(screen.getByText("refactoring")).toBeInTheDocument()
  })
})


