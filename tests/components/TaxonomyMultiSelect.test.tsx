/**
 * @jest-environment jsdom
 *
 * Subtarea 2 — Segmentos pequeños del formulario de prompts:
 * TaxonomyMultiSelect. Cubre el renderizado de un checkbox por elemento
 * (con los seleccionados marcados), la propagación del id al hacer click y
 * el estado vacío (mensaje TaxonomyMultiSelect.noOptionsAvailable en-GB y
 * ningún checkbox).
 *
 * Componente presentacional puro: sin red, solo NextIntlClientProvider con
 * los mensajes reales en-GB.
 */

import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { NextIntlClientProvider } from "next-intl"
import TaxonomyMultiSelect from "@/components/prompt/TaxonomyMultiSelect"
import messages from "../../messages/en-GB.json"

type TaxonomyMultiSelectProps = React.ComponentProps<typeof TaxonomyMultiSelect>

const items = [
  { id: "cat-1", name: "Coding" },
  { id: "cat-2", name: "Writing" },
  { id: "cat-3", name: "Marketing" },
]

function renderMultiSelect(overrides: Partial<TaxonomyMultiSelectProps> = {}) {
  const onChange = jest.fn()
  render(
    <NextIntlClientProvider locale="en-GB" messages={messages}>
      <TaxonomyMultiSelect
        label="Categories"
        items={items}
        selectedIds={["cat-1"]}
        onChange={onChange}
        {...overrides}
      />
    </NextIntlClientProvider>
  )
  return onChange
}

describe("TaxonomyMultiSelect", () => {
  it("renders a checkbox for every item and marks the selected ones as checked", () => {
    // Arrange & Act
    renderMultiSelect()

    // Assert — the group label and every item name are visible, and only
    // the ids in selectedIds are checked.
    expect(screen.getByText("Categories")).toBeInTheDocument()
    expect(screen.getByRole("checkbox", { name: "Coding" })).toBeChecked()
    expect(screen.getByRole("checkbox", { name: "Writing" })).not.toBeChecked()
    expect(screen.getByRole("checkbox", { name: "Marketing" })).not.toBeChecked()
  })

  it("calls onChange with the item id when a checkbox is clicked", async () => {
    // Arrange
    const user = userEvent.setup()
    const onChange = renderMultiSelect()

    // Act
    await user.click(screen.getByRole("checkbox", { name: "Writing" }))

    // Assert — the id of the clicked item is reported, not its name.
    expect(onChange).toHaveBeenCalledWith("cat-2")
  })

  it("shows the empty state with no checkboxes when there are no items", () => {
    // Arrange & Act
    renderMultiSelect({ items: [] })

    // Assert — the real en-GB message is shown and no checkbox is rendered.
    expect(screen.getByText("No options available")).toBeInTheDocument()
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0)
  })
})
