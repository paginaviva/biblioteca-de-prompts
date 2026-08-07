"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { ArrowDown, ArrowUp, Check, Moon, Sun } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useUIContext } from "@/contexts/UIContext"

// Preset accent colors (the current purple is the default).
const ACCENT_COLORS = [
  { value: "#7c3aed" }, // purple
  { value: "#2563eb" }, // blue
  { value: "#16a34a" }, // green
  { value: "#dc2626" }, // red
  { value: "#ea580c" }, // orange
  { value: "#db2777" }, // pink
  { value: "#0d9488" }, // teal
  { value: "#475569" }, // slate
] as const

type ThemeValue = "light" | "dark"

// Reorder helper: swaps two adjacent items, returns a new array (immutable).
function nextOrder(items: string[], index: number, direction: -1 | 1): string[] {
  const target = index + direction
  if (target < 0 || target >= items.length) return items
  const next = [...items]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}

export function ProfileDashboardTab() {
  const t = useTranslations("UserProfile")
  const tColumns = useTranslations("Columns")
  const tFilterBoxes = useTranslations("FilterBoxes")

  const {
    theme,
    setTheme,
    accentColor,
    setAccentColor,
    filterOrder,
    setFilterOrder,
    columns,
    setColumns,
  } = useUIContext()

  // Local preview for the free HEX input so we don't PATCH on every picker
  // event; persisted on blur (the context setter fires the PATCH).
  const [hexPreview, setHexPreview] = useState(accentColor)

  const handleThemeChange = (value: ThemeValue) => {
    if (value === theme) return
    setTheme(value)
  }

  const handleAccentPresetChange = (value: string) => {
    if (value === accentColor) return
    setAccentColor(value)
    setHexPreview(value)
  }

  const handleCustomColorBlur = () => {
    if (hexPreview === accentColor) return
    setAccentColor(hexPreview)
  }

  const handleMoveFilterBox = (index: number, direction: -1 | 1) => {
    const next = nextOrder(filterOrder, index, direction)
    if (next === filterOrder) return
    setFilterOrder(next)
  }

  const handleMoveColumn = (index: number, direction: -1 | 1) => {
    const nextOrderValue = nextOrder(columns.order, index, direction)
    if (nextOrderValue === columns.order) return
    // Keep visible in sync with the new order (visible ⊆ order, same sequence).
    const visibleSet = new Set(columns.visible)
    setColumns({
      visible: nextOrderValue.filter((key) => visibleSet.has(key)),
      order: nextOrderValue,
    })
  }

  const handleToggleColumn = (key: string) => {
    const isVisible = columns.visible.includes(key)
    // Rule: at least one column must remain visible.
    if (isVisible && columns.visible.length <= 1) return
    const visible = isVisible
      ? columns.visible.filter((columnKey) => columnKey !== key)
      : [...columns.visible, key]
    setColumns({ ...columns, visible })
  }

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">{t("themeLabel")}</h3>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={theme === "light" ? "default" : "outline"}
            onClick={() => handleThemeChange("light")}
            aria-pressed={theme === "light"}
          >
            <Sun className="mr-2 h-4 w-4" />
            {t("lightMode")}
          </Button>
          <Button
            type="button"
            variant={theme === "dark" ? "default" : "outline"}
            onClick={() => handleThemeChange("dark")}
            aria-pressed={theme === "dark"}
          >
            <Moon className="mr-2 h-4 w-4" />
            {t("darkMode")}
          </Button>
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">{t("accentColorLabel")}</h3>
        <div className="flex flex-wrap items-center gap-2">
          {ACCENT_COLORS.map((color) => {
            const selected = accentColor.toLowerCase() === color.value
            return (
              <button
                key={color.value}
                type="button"
                onClick={() => handleAccentPresetChange(color.value)}
                aria-label={`${t("accentColorLabel")} ${color.value}`}
                aria-pressed={selected}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-transform",
                  selected
                    ? "border-background ring-2 ring-foreground ring-offset-2 ring-offset-background"
                    : "border-background/50 hover:scale-105"
                )}
                style={{ backgroundColor: color.value }}
              >
                {selected && <Check className="h-4 w-4 text-white" />}
              </button>
            )
          })}
          <div className="ml-2 flex items-center gap-2">
            <Label htmlFor="accent-hex" className="text-xs text-muted-foreground">
              {t("accentHexLabel")}
            </Label>
            <Input
              id="accent-hex"
              type="color"
              value={hexPreview}
              onChange={(e) => setHexPreview(e.target.value)}
              onBlur={handleCustomColorBlur}
              className="h-9 w-12 cursor-pointer p-1"
              aria-label={t("accentHexLabel")}
            />
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">{t("filterOrderLabel")}</h3>
        <p className="text-xs text-muted-foreground">{t("filterOrderHint")}</p>
        <ul className="space-y-2">
          {filterOrder.map((key, index) => (
            <li
              key={key}
              className="flex items-center justify-between rounded-md border border-input bg-background px-3 py-2"
            >
              <span className="text-sm">{tFilterBoxes(key)}</span>
              <span className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => handleMoveFilterBox(index, -1)}
                  disabled={index === 0}
                  aria-label={t("moveUp")}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => handleMoveFilterBox(index, 1)}
                  disabled={index === filterOrder.length - 1}
                  aria-label={t("moveDown")}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold">{t("columnsLabel")}</h3>
        <p className="text-xs text-muted-foreground">{t("columnsHint")}</p>
        <ul className="space-y-2">
          {columns.order.map((key, index) => {
            const isVisible = columns.visible.includes(key)
            const isLastVisible = isVisible && columns.visible.length === 1
            return (
              <li
                key={key}
                className="flex items-center justify-between rounded-md border border-input bg-background px-3 py-2"
              >
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={isVisible}
                    disabled={isLastVisible}
                    onChange={() => handleToggleColumn(key)}
                    className="h-4 w-4 rounded border-input"
                  />
                  {tColumns(key)}
                </label>
                <span className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => handleMoveColumn(index, -1)}
                    disabled={index === 0}
                    aria-label={t("moveUp")}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => handleMoveColumn(index, 1)}
                    disabled={index === columns.order.length - 1}
                    aria-label={t("moveDown")}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                </span>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
