/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react"
import { NextIntlClientProvider } from "next-intl"
import { PromptsPageContent } from "@/components/prompt/PromptsPageContent"
import { UIContextProvider, useUIContext } from "@/contexts/UIContext"
import { ViewModeProvider } from "@/contexts/ViewModeContext"
import messages from "../../messages/en-GB.json"

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/prompts",
}))

// Test consumer: exposes the activeFilterCount stored in the UI context
function ActiveFilterCountDisplay() {
  const { activeFilterCount } = useUIContext()
  return <span data-testid="active-filter-count">{activeFilterCount}</span>
}

function renderPageContent(
  initialFilters: React.ComponentProps<typeof PromptsPageContent>["initialFilters"],
  initialFiltersVisible = true
) {
  return render(
    <NextIntlClientProvider locale="en-GB" messages={messages}>
      <UIContextProvider initialFiltersVisible={initialFiltersVisible}>
        <ViewModeProvider initialViewMode="cards">
          <ActiveFilterCountDisplay />
          <PromptsPageContent
            prompts={[]}
            categories={[]}
            tags={[]}
            platforms={[]}
            clients={[]}
            useCases={[]}
            initialFilters={initialFilters}
          />
        </ViewModeProvider>
      </UIContextProvider>
    </NextIntlClientProvider>
  )
}

describe("PromptsPageContent", () => {
  it("renders the filters panel and empty prompt list with no active filters", () => {
    // Arrange & Act
    renderPageContent({})

    // Assert
    expect(screen.getByText("Filters")).toBeInTheDocument()
    expect(screen.getByText("No prompts found.")).toBeInTheDocument()
    expect(screen.getByTestId("active-filter-count")).toHaveTextContent("0")
  })

  it("reports one active filter per populated filter key in the UI context", () => {
    // Arrange & Act
    renderPageContent({ status: ["DRAFT"], tagIds: ["t1"], isFavorite: "true" })

    // Assert
    expect(screen.getByTestId("active-filter-count")).toHaveTextContent("3")
  })

  it("hides the filters panel when filtersVisible is false", () => {
    // Arrange & Act
    renderPageContent({}, false)

    // Assert
    expect(screen.queryByText("Filters")).not.toBeInTheDocument()
    expect(screen.getByText("No prompts found.")).toBeInTheDocument()
  })
})
