"use client"

import { useId } from "react"
import { useTranslations } from "next-intl"

interface TaxonomyItem {
  id: string
  name: string
}

interface TaxonomyMultiSelectProps {
  label: string
  items: TaxonomyItem[]
  selectedIds: string[]
  onChange: (id: string) => void
}

export default function TaxonomyMultiSelect({
  label,
  items,
  selectedIds,
  onChange,
}: TaxonomyMultiSelectProps) {
  const groupId = useId()
  const t = useTranslations("TaxonomyMultiSelect")

  // If no items to select from, show an empty state
  if (items.length === 0) {
    return (
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold text-foreground">{label}</legend>
        <p className="text-sm text-muted-foreground">{t("noOptionsAvailable")}</p>
      </fieldset>
    )
  }

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-semibold text-foreground">{label}</legend>
      <div className="grid grid-cols-2 gap-2">
        {items.map((item) => {
          const isSelected = selectedIds.includes(item.id)
          return (
            <label
              key={item.id}
              htmlFor={`${groupId}-${item.id}`}
              className="flex items-center space-x-2 cursor-pointer"
            >
              <input
                type="checkbox"
                id={`${groupId}-${item.id}`}
                checked={isSelected}
                onChange={() => onChange(item.id)}
                className="h-4 w-4 rounded border-input"
              />
              <span
                className={`text-sm ${
                  isSelected ? "font-medium text-foreground" : "text-muted-foreground"
                }`}
              >
                {item.name}
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
