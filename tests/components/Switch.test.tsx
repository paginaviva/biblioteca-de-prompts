/**
 * @jest-environment jsdom
 */

import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Switch } from "@/components/ui/switch"

describe("Switch", () => {
  it("renders an unchecked switch with role switch and aria-checked false", () => {
    // Arrange & Act
    render(<Switch checked={false} onCheckedChange={jest.fn()} />)

    // Assert
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "false")
  })

  it("calls onCheckedChange with true when an unchecked switch is clicked", async () => {
    // Arrange
    const onCheckedChange = jest.fn()
    const user = userEvent.setup()
    render(<Switch checked={false} onCheckedChange={onCheckedChange} />)

    // Act
    await user.click(screen.getByRole("switch"))

    // Assert
    expect(onCheckedChange).toHaveBeenCalledWith(true)
  })

  it("renders a checked switch with aria-checked true", () => {
    // Arrange & Act
    render(<Switch checked={true} onCheckedChange={jest.fn()} />)

    // Assert
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true")
  })
})
