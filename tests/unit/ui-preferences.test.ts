/**
 * @jest-environment node
 */

// Pure function tests (subtask 11, Fase B): shared uiPreferences schema
// (lib/ui-preferences.ts) used by PATCH /api/user/preferences and the
// authenticated layout. No mocks needed.
import {
  parseUIPreferences,
  UI_PREFERENCES_DEFAULTS,
  DEFAULT_FILTER_ORDER,
  DEFAULT_COLUMN_KEYS,
  ALL_COLUMN_KEYS,
} from "../../lib/ui-preferences"

describe("parseUIPreferences", () => {
  it("returns complete defaults for null input", () => {
    // Arrange & Act
    const result = parseUIPreferences(null)

    // Assert — every field falls back to its default:
    // sidebarCollapsed false, filtersVisible true, theme light,
    // accentColor #7c3aed, filterOrder (7 keys), columns.visible
    // (5 keys = DEFAULT_COLUMN_KEYS), columns.order (8 keys = ALL_COLUMN_KEYS)
    expect(result).toEqual(UI_PREFERENCES_DEFAULTS)
  })

  it("returns complete defaults for an empty object", () => {
    // Arrange & Act
    const result = parseUIPreferences({})

    // Assert
    expect(result).toEqual(UI_PREFERENCES_DEFAULTS)
  })

  it("keeps the provided field and applies NESTED defaults for the rest", () => {
    // Arrange & Act
    const result = parseUIPreferences({ sidebarCollapsed: true })

    // Assert — only sidebarCollapsed changes; the other (nested) fields
    // still get their defaults instead of being dropped
    expect(result).toEqual({ ...UI_PREFERENCES_DEFAULTS, sidebarCollapsed: true })
  })

  it("resets an invalid accentColor to the default WITHOUT losing the other fields", () => {
    // Arrange & Act — legacy value "purple" fails the HEX regex; the
    // per-field .catch("") must only reset accentColor, not the whole object
    const result = parseUIPreferences({ accentColor: "purple", theme: "dark" })

    // Assert
    expect(result).toEqual({ ...UI_PREFERENCES_DEFAULTS, theme: "dark" })
  })

  it("keeps a valid custom accentColor", () => {
    // Arrange & Act
    const result = parseUIPreferences({ accentColor: "#2563eb" })

    // Assert
    expect(result).toEqual({ ...UI_PREFERENCES_DEFAULTS, accentColor: "#2563eb" })
  })

  it("returns defaults for corrupted JSON input (string)", () => {
    // Arrange & Act — not an object → object .catch({}) → defaults
    const result = parseUIPreferences("not-json")

    // Assert
    expect(result).toEqual(UI_PREFERENCES_DEFAULTS)
  })

  it("returns defaults for a non-object input (number)", () => {
    // Arrange & Act
    const result = parseUIPreferences(123)

    // Assert
    expect(result).toEqual(UI_PREFERENCES_DEFAULTS)
  })

  it("keeps theme dark", () => {
    // Arrange & Act
    const result = parseUIPreferences({ theme: "dark" })

    // Assert
    expect(result).toEqual({ ...UI_PREFERENCES_DEFAULTS, theme: "dark" })
  })

  it("keeps an incomplete filterOrder as-is (completion lives in the dashboard, not here)", () => {
    // Arrange & Act — filterOrder is z.array(...) WITHOUT .min, and both
    // values are valid enum members, so ["status", "tags"] passes and is
    // returned untouched. Filling missing keys is the responsibility of
    // ProfileDashboardTab's normalizeFilterOrder, NOT parseUIPreferences.
    const result = parseUIPreferences({ filterOrder: ["status", "tags"] })

    // Assert
    expect(result.filterOrder).toEqual(["status", "tags"])
    expect(result.columns).toEqual(UI_PREFERENCES_DEFAULTS.columns)
  })

  it("keeps a columns config with a visible list of exactly 1", () => {
    // Arrange & Act — visible has min(1), both arrays use valid enum keys
    const result = parseUIPreferences({
      columns: { visible: ["status"], order: ["status", "tags"] },
    })

    // Assert
    expect(result.columns).toEqual({
      visible: ["status"],
      order: ["status", "tags"],
    })
  })

  it("returns defaults when columns.visible is empty (min 1 violation)", () => {
    // Arrange & Act — visible [] fails min(1); columns has no per-field
    // .catch, so the WHOLE object falls back via .catch({}) → full defaults
    const result = parseUIPreferences({ columns: { visible: [], order: [] } })

    // Assert
    expect(result).toEqual(UI_PREFERENCES_DEFAULTS)
  })

  it("does not mutate UI_PREFERENCES_DEFAULTS when parsing", () => {
    // Arrange
    const snapshot = JSON.parse(JSON.stringify(UI_PREFERENCES_DEFAULTS))

    // Act
    const result = parseUIPreferences({ sidebarCollapsed: true })
    result.filterOrder.push("mutated")
    result.columns.visible.pop()

    // Assert — the default constants are untouched by parsing nor by
    // mutating the returned object (fresh copies, not shared references)
    expect(UI_PREFERENCES_DEFAULTS).toEqual(snapshot)
  })

  it("returns fresh copies of the default arrays (no shared references)", () => {
    // Arrange & Act
    const result = parseUIPreferences(null)

    // Assert
    expect(result.filterOrder).not.toBe(UI_PREFERENCES_DEFAULTS.filterOrder)
    expect(result.columns.visible).not.toBe(UI_PREFERENCES_DEFAULTS.columns.visible)
    expect(result.columns.order).not.toBe(UI_PREFERENCES_DEFAULTS.columns.order)
  })

  it("exposes the expected default constant lengths", () => {
    // Arrange & Act — constants are the source of truth for the defaults
    const filterOrder = DEFAULT_FILTER_ORDER.length
    const visible = DEFAULT_COLUMN_KEYS.length
    const order = ALL_COLUMN_KEYS.length

    // Assert
    expect(filterOrder).toBe(8)
    expect(visible).toBe(5)
    expect(order).toBe(8)
  })
})
