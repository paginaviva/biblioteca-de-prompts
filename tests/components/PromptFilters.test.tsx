/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import { PromptFilters } from "@/components/prompt/PromptFilters"
import messages from "../../messages/en-GB.json"

function renderWithI18n(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en-GB" messages={messages}>
      {ui}
    </NextIntlClientProvider>
  )
}

const mockPush = jest.fn()

// The search params hook is a second source of truth for the filter state. Tests
// set it independently from the `initialFilters` prop on purpose, so they can
// reproduce the case where the hook lags behind the server-rendered props.
let currentSearchParams = new URLSearchParams()

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => currentSearchParams,
  usePathname: () => "/prompts",
}))

// Reads back the query string the component actually navigated to. A real
// URLSearchParams is used on purpose: asserting on the produced URL is what
// makes these tests capable of detecting a dropped or resurrected filter.
function pushedParams(): URLSearchParams {
  const lastCall = mockPush.mock.calls[mockPush.mock.calls.length - 1]
  const url = (lastCall?.[0] as string) ?? ""
  return new URLSearchParams(url.split("?")[1] ?? "")
}

describe("PromptFilters", () => {
  const mockCategories = [
    { id: "cat-1", name: "Writing", slug: "writing" },
    { id: "cat-2", name: "Code", slug: "code" },
  ]

  const mockTags = [
    { id: "tag-1", name: "Important", slug: "important" },
    { id: "tag-2", name: "Reviewed", slug: "reviewed" },
  ]

  const mockPlatforms = [
    { id: "plat-1", name: "CHATGPT", slug: "chatgpt" },
    { id: "plat-2", name: "CURSOR", slug: "cursor" },
  ]

  const mockClients = [
    { id: "client-1", name: "Project A", slug: "project-a" },
  ]

  const mockUseCases = [
    { id: "use-1", name: "Email", slug: "email" },
  ]

  function renderFilters(initialFilters: Record<string, string | string[]> = {}) {
    return renderWithI18n(
      <PromptFilters
        categories={mockCategories}
        tags={mockTags}
        platforms={mockPlatforms}
        clients={mockClients}
        useCases={mockUseCases}
        initialFilters={initialFilters}
      />
    )
  }

  beforeEach(() => {
    jest.clearAllMocks()
    currentSearchParams = new URLSearchParams()
  })

  it("should render with empty filters", () => {
    renderFilters()

    expect(screen.getByText("Filters")).toBeInTheDocument()
    expect(screen.getByText("Category")).toBeInTheDocument()
    expect(screen.getByText("Tags")).toBeInTheDocument()
    expect(screen.getByText("Platform")).toBeInTheDocument()
  })

  it("should toggle platform and add to URL params", () => {
    renderFilters()

    fireEvent.click(screen.getByLabelText("CHATGPT"))

    expect(pushedParams().getAll("platformIds")).toEqual(["plat-1"])
  })

  it("should toggle platform and remove from URL params", () => {
    currentSearchParams = new URLSearchParams("platformIds=plat-1")
    renderFilters({ platformIds: "plat-1" })

    fireEvent.click(screen.getByLabelText("CHATGPT"))

    expect(pushedParams().getAll("platformIds")).toEqual([])
  })

  it("should toggle category and add to URL params", () => {
    renderFilters()

    fireEvent.click(screen.getByLabelText("Writing"))

    expect(pushedParams().getAll("categoryIds")).toEqual(["cat-1"])
  })

  it("should toggle category and remove from URL params", () => {
    currentSearchParams = new URLSearchParams("categoryIds=cat-1")
    renderFilters({ categoryIds: "cat-1" })

    fireEvent.click(screen.getByLabelText("Writing"))

    expect(pushedParams().getAll("categoryIds")).toEqual([])
  })

  it("should toggle tag and add to URL params", () => {
    renderFilters()

    fireEvent.click(screen.getByLabelText("Important"))

    expect(pushedParams().getAll("tagIds")).toEqual(["tag-1"])
  })

  it("should keep the filters that are already active when adding a new one", () => {
    currentSearchParams = new URLSearchParams("platformIds=plat-1")
    renderFilters({ platformIds: "plat-1" })

    fireEvent.click(screen.getByLabelText("CURSOR"))

    const params = pushedParams()
    expect(params.getAll("platformIds")).toEqual(["plat-1", "plat-2"])
  })

  it("should clear all filters when clear filters is clicked", () => {
    currentSearchParams = new URLSearchParams("platformIds=plat-1&categoryIds=cat-1&tagIds=tag-1")
    renderFilters({ platformIds: "plat-1", categoryIds: "cat-1", tagIds: "tag-1" })

    fireEvent.click(screen.getByRole("button", { name: /clear filters/i }))

    expect(mockPush).toHaveBeenCalledWith("/prompts")
  })

  it("preserves the search term and the favourites filter when toggling", () => {
    currentSearchParams = new URLSearchParams("search=report&isFavorite=true")
    renderFilters({ search: "report", isFavorite: "true" })

    fireEvent.click(screen.getByLabelText("Important"))

    const params = pushedParams()
    expect(params.get("search")).toBe("report")
    expect(params.get("isFavorite")).toBe("true")
    expect(params.getAll("tagIds")).toEqual(["tag-1"])
  })

  it("rebuilds the query string from the rendered state, not from the search params hook", () => {
    // The hook is stale: it still reports a filter that is no longer rendered as
    // checked. The next navigation must not resurrect it.
    currentSearchParams = new URLSearchParams("platformIds=plat-1&tagIds=tag-1")
    renderFilters({ tagIds: "tag-1" })

    fireEvent.click(screen.getByLabelText("Reviewed"))

    const params = pushedParams()
    expect(params.getAll("tagIds")).toEqual(["tag-1", "tag-2"])
    expect(params.getAll("platformIds")).toEqual([])
  })
})
