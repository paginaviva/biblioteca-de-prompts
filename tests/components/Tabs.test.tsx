/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

function renderTabs() {
  return render(
    <Tabs defaultValue="account">
      <TabsList>
        <TabsTrigger value="account">Account</TabsTrigger>
        <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
      </TabsList>
      <TabsContent value="account">Account content</TabsContent>
      <TabsContent value="dashboard">Dashboard content</TabsContent>
    </Tabs>
  )
}

describe("Tabs", () => {
  it("renders both triggers and shows the content of the default tab", () => {
    // Arrange & Act
    renderTabs()

    // Assert
    expect(screen.getByRole("tab", { name: "Account" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Dashboard" })).toBeInTheDocument()
    expect(screen.getByText("Account content")).toBeInTheDocument()
    expect(screen.queryByText("Dashboard content")).not.toBeInTheDocument()
  })

  it("switches the visible content when another trigger is clicked", async () => {
    // Arrange
    const user = userEvent.setup()
    renderTabs()

    // Act
    await user.click(screen.getByRole("tab", { name: "Dashboard" }))

    // Assert
    expect(screen.getByText("Dashboard content")).toBeInTheDocument()
    expect(screen.queryByText("Account content")).not.toBeInTheDocument()
  })

  it("marks the active trigger with aria-selected true and the inactive one with false", () => {
    // Arrange & Act
    renderTabs()

    // Assert
    expect(screen.getByRole("tab", { name: "Account" })).toHaveAttribute("aria-selected", "true")
    expect(screen.getByRole("tab", { name: "Dashboard" })).toHaveAttribute("aria-selected", "false")
  })
})
