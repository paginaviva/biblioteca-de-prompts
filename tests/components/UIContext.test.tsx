/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent } from "@testing-library/react"
import { UIContextProvider, useUIContext } from "@/contexts/UIContext"

// Test consumer: renders the context values so assertions can read them
function ContextConsumer() {
  const { sidebarCollapsed, filtersVisible, activeFilterCount, setSidebarCollapsed, setFiltersVisible } = useUIContext()
  return (
    <div>
      <span data-testid="sidebar-collapsed">{String(sidebarCollapsed)}</span>
      <span data-testid="filters-visible">{String(filtersVisible)}</span>
      <span data-testid="active-filter-count">{activeFilterCount}</span>
      <button type="button" onClick={() => setSidebarCollapsed(true)}>
        collapse sidebar
      </button>
      <button type="button" onClick={() => setFiltersVisible(false)}>
        hide filters
      </button>
    </div>
  )
}

describe("UIContext", () => {
  beforeEach(() => {
    // jsdom does not expose fetch; provide it for the PATCH calls
    global.fetch = jest.fn().mockResolvedValue({ ok: true } as Response) as typeof fetch
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("provides default values when no initial props are passed", () => {
    // Arrange & Act
    render(
      <UIContextProvider>
        <ContextConsumer />
      </UIContextProvider>
    )

    // Assert
    expect(screen.getByTestId("sidebar-collapsed")).toHaveTextContent("false")
    expect(screen.getByTestId("filters-visible")).toHaveTextContent("true")
  })

  it("initialises state from initialSidebarCollapsed and initialFiltersVisible props", () => {
    // Arrange & Act
    render(
      <UIContextProvider initialSidebarCollapsed={true} initialFiltersVisible={false}>
        <ContextConsumer />
      </UIContextProvider>
    )

    // Assert
    expect(screen.getByTestId("sidebar-collapsed")).toHaveTextContent("true")
    expect(screen.getByTestId("filters-visible")).toHaveTextContent("false")
  })

  it("updates the local sidebarCollapsed state when setSidebarCollapsed is called", () => {
    // Arrange
    render(
      <UIContextProvider>
        <ContextConsumer />
      </UIContextProvider>
    )

    // Act
    fireEvent.click(screen.getByRole("button", { name: "collapse sidebar" }))

    // Assert
    expect(screen.getByTestId("sidebar-collapsed")).toHaveTextContent("true")
  })

  it("persists the sidebar preference via a PATCH request when setSidebarCollapsed is called", () => {
    // Arrange
    render(
      <UIContextProvider>
        <ContextConsumer />
      </UIContextProvider>
    )

    // Act
    fireEvent.click(screen.getByRole("button", { name: "collapse sidebar" }))

    // Assert
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/user/preferences",
      expect.objectContaining({
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uiPreferences: { sidebarCollapsed: true } }),
      })
    )
  })

  it("updates the local filtersVisible state when setFiltersVisible is called", () => {
    // Arrange
    render(
      <UIContextProvider>
        <ContextConsumer />
      </UIContextProvider>
    )

    // Act
    fireEvent.click(screen.getByRole("button", { name: "hide filters" }))

    // Assert
    expect(screen.getByTestId("filters-visible")).toHaveTextContent("false")
  })

  it("persists the filters preference via a PATCH request when setFiltersVisible is called", () => {
    // Arrange
    render(
      <UIContextProvider>
        <ContextConsumer />
      </UIContextProvider>
    )

    // Act
    fireEvent.click(screen.getByRole("button", { name: "hide filters" }))

    // Assert
    expect(global.fetch).toHaveBeenCalledWith(
      "/api/user/preferences",
      expect.objectContaining({
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uiPreferences: { filtersVisible: false } }),
      })
    )
  })

  it("throws an error when useUIContext is used outside UIContextProvider", () => {
    // Arrange & Act & Assert
    expect(() => render(<ContextConsumer />)).toThrow(
      "useUIContext must be used within UIContextProvider"
    )
  })
})
