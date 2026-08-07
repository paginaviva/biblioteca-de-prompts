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

// Mock next/navigation
const mockPush = jest.fn()
const mockGetAll = jest.fn<string[], []>(() => [])
const mockToString = jest.fn<string, []>(() => "")
const mockDelete = jest.fn()
const mockAppend = jest.fn()
const mockSet = jest.fn()

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useSearchParams: () => ({
    getAll: mockGetAll,
    toString: mockToString,
  }),
  usePathname: () => "/prompts",
}))

// Mock URLSearchParams globally
const originalURLSearchParams = global.URLSearchParams
global.URLSearchParams = jest.fn(() => ({
  getAll: mockGetAll,
  toString: mockToString,
  delete: mockDelete,
  append: mockAppend,
  set: mockSet,
})) as any

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

  beforeEach(() => {
    jest.clearAllMocks()
    mockPush.mockClear()
    mockGetAll.mockClear()
    mockDelete.mockClear()
    mockAppend.mockClear()
    mockSet.mockClear()
  })

  it("should render with empty filters", () => {
    renderWithI18n(
      <PromptFilters
        categories={mockCategories}
        tags={mockTags}
        platforms={mockPlatforms}
        clients={mockClients}
        useCases={mockUseCases}
        initialFilters={{}}
      />
    )

    expect(screen.getByText("Filters")).toBeInTheDocument()
    expect(screen.getByText("Category")).toBeInTheDocument()
    expect(screen.getByText("Tags")).toBeInTheDocument()
    expect(screen.getByText("Platform")).toBeInTheDocument()
  })

  it("should toggle platform and add to URL params", () => {
    mockGetAll.mockReturnValue([]) // No existing platformIds
    mockToString.mockReturnValue("")

    renderWithI18n(
      <PromptFilters
        categories={mockCategories}
        tags={mockTags}
        platforms={mockPlatforms}
        clients={mockClients}
        useCases={mockUseCases}
        initialFilters={{}}
      />
    )

    // Find and click the first platform checkbox
    const platformCheckbox = screen.getByLabelText("CHATGPT")
    fireEvent.click(platformCheckbox)

    // Verify URL params were updated
    expect(mockAppend).toHaveBeenCalledWith("platformIds", "plat-1")
    expect(mockPush).toHaveBeenCalled()
  })

  it("should toggle platform and remove from URL params", () => {
    mockGetAll.mockReturnValue(["plat-1"]) // Existing platformIds
    mockToString.mockReturnValue("")

    renderWithI18n(
      <PromptFilters
        categories={mockCategories}
        tags={mockTags}
        platforms={mockPlatforms}
        clients={mockClients}
        useCases={mockUseCases}
        initialFilters={{}}
      />
    )

    // Find and click the first platform checkbox (to remove)
    const platformCheckbox = screen.getByLabelText("CHATGPT")
    fireEvent.click(platformCheckbox)

    // Verify URL params were updated (removed)
    expect(mockDelete).toHaveBeenCalledWith("platformIds")
    expect(mockPush).toHaveBeenCalled()
  })

  it("should toggle category and add to URL params", () => {
    mockGetAll.mockReturnValue([]) // No existing categoryIds
    mockToString.mockReturnValue("")

    renderWithI18n(
      <PromptFilters
        categories={mockCategories}
        tags={mockTags}
        platforms={mockPlatforms}
        clients={mockClients}
        useCases={mockUseCases}
        initialFilters={{}}
      />
    )

    // Find and click the first category checkbox
    const categoryCheckbox = screen.getByLabelText("Writing")
    fireEvent.click(categoryCheckbox)

    // Verify URL params were updated
    expect(mockAppend).toHaveBeenCalledWith("categoryIds", "cat-1")
    expect(mockPush).toHaveBeenCalled()
  })

  it("should toggle category and remove from URL params", () => {
    mockGetAll.mockReturnValue(["cat-1"]) // Existing categoryIds
    mockToString.mockReturnValue("")

    renderWithI18n(
      <PromptFilters
        categories={mockCategories}
        tags={mockTags}
        platforms={mockPlatforms}
        clients={mockClients}
        useCases={mockUseCases}
        initialFilters={{}}
      />
    )

    // Find and click the first category checkbox (to remove)
    const categoryCheckbox = screen.getByLabelText("Writing")
    fireEvent.click(categoryCheckbox)

    // Verify URL params were updated (removed)
    expect(mockDelete).toHaveBeenCalledWith("categoryIds")
    expect(mockPush).toHaveBeenCalled()
  })

  it("should toggle tag and add to URL params", () => {
    mockGetAll.mockReturnValue([]) // No existing tagIds
    mockToString.mockReturnValue("")

    renderWithI18n(
      <PromptFilters
        categories={mockCategories}
        tags={mockTags}
        platforms={mockPlatforms}
        clients={mockClients}
        useCases={mockUseCases}
        initialFilters={{}}
      />
    )

    // Find and click the first tag checkbox
    const tagCheckbox = screen.getByLabelText("Important")
    fireEvent.click(tagCheckbox)

    // Verify URL params were updated
    expect(mockAppend).toHaveBeenCalledWith("tagIds", "tag-1")
    expect(mockPush).toHaveBeenCalled()
  })

  it("should use params.append() for multiple selections (not params.set())", () => {
    // Simulate existing selections
    mockGetAll.mockReturnValue(["plat-1"])
    mockToString.mockReturnValue("platformIds=plat-1")

    renderWithI18n(
      <PromptFilters
        categories={mockCategories}
        tags={mockTags}
        platforms={mockPlatforms}
        clients={mockClients}
        useCases={mockUseCases}
        initialFilters={{}}
      />
    )

    // Click second platform to add
    const platformCheckbox = screen.getByLabelText("CURSOR")
    fireEvent.click(platformCheckbox)

    // Verify append was used (not set) for multi-select
    expect(mockAppend).toHaveBeenCalledWith("platformIds", "plat-2")
    expect(mockSet).not.toHaveBeenCalledWith("platformIds", expect.anything())
  })

  it("should clear all filters when clear filters is clicked", () => {
    mockToString.mockReturnValue("platformIds=plat-1&categoryIds=cat-1&tagIds=tag-1")

    renderWithI18n(
      <PromptFilters
        categories={mockCategories}
        tags={mockTags}
        platforms={mockPlatforms}
        clients={mockClients}
        useCases={mockUseCases}
        initialFilters={{ platformIds: "plat-1", categoryIds: "cat-1", tagIds: "tag-1" }}
      />
    )

    // Find and click clear filters button
    const clearButton = screen.getByRole("button", { name: /clear filters/i })
    fireEvent.click(clearButton)

    // Verify navigation to base /prompts URL (clears all params)
    expect(mockPush).toHaveBeenCalledWith("/prompts")
  })
})
