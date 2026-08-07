import { z } from "zod"

// Shared schema for UI preferences stored in User.uiPreferences.
// Used by both the API route (validation on write/read) and the
// authenticated layout (hydration), so they cannot diverge.

// Default filter box order (current fixed order in PromptFilters)
export const DEFAULT_FILTER_ORDER = [
  "category",
  "tags",
  "platform",
  "status",
  "type",
  "language",
  "clientProject",
  "useCase",
] as const

// All configurable column keys (fixed columns ★, copy, edit, title are always shown)
export const ALL_COLUMN_KEYS = [
  "status",
  "platforms",
  "categories",
  "tags",
  "clientProject",
  "useCase",
  "language",
  "type",
] as const

// Default visible columns (current fixed columns in list view)
export const DEFAULT_COLUMN_KEYS = [
  "status",
  "platforms",
  "categories",
  "tags",
  "clientProject",
] as const

// Strict shape for incoming PATCH bodies (invalid values → 400).
export const uiPreferencesShapeSchema = z.object({
  sidebarCollapsed: z.boolean().optional(),
  filtersVisible: z.boolean().optional(),
  theme: z.enum(["light", "dark"]).optional(),
  // Strict HEX validation (with #). Presets, the color input and the default
  // all produce #rrggbb.
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  filterOrder: z.array(z.enum(DEFAULT_FILTER_ORDER)).optional(),
  columns: z
    .object({
      visible: z.array(z.enum(ALL_COLUMN_KEYS)).min(1),
      order: z.array(z.enum(ALL_COLUMN_KEYS)),
    })
    .optional(),
})

// Partial patch accepted by PATCH /api/user/preferences for the uiPreferences
// field. Kept aligned with UIPreferences (string arrays) on purpose: the API
// route re-validates against uiPreferencesShapeSchema at runtime.
export type UIPreferencesPatch = {
  sidebarCollapsed?: boolean
  filtersVisible?: boolean
  theme?: "light" | "dark"
  accentColor?: string
  filterOrder?: string[]
  columns?: {
    visible: string[]
    order: string[]
  }
}

// Tolerant read schema: per-field .catch so a single legacy invalid field
// (e.g. accentColor "purple") only resets that field instead of discarding
// the whole object; `.catch({})` still tolerates corrupted JSON. The catch
// fallback "" fails the regex later in parseUIPreferences, which applies the
// default accent via the nullish check.
export const uiPreferencesSchema = uiPreferencesShapeSchema
  .extend({
    accentColor: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .catch("")
      .optional(),
  })
  .catch({})

// Output shape with required fields; consumers apply defaults.
export interface UIPreferences {
  sidebarCollapsed: boolean
  filtersVisible: boolean
  theme: "light" | "dark"
  accentColor: string
  filterOrder: string[]
  columns: {
    visible: string[]
    order: string[]
  }
}

// Parse stored JSON and apply defaults, returning a fully-typed object.
export function parseUIPreferences(value: unknown): UIPreferences {
  const parsed = uiPreferencesSchema.parse(value ?? {})
  return {
    sidebarCollapsed: parsed.sidebarCollapsed ?? false,
    filtersVisible: parsed.filtersVisible ?? true,
    theme: parsed.theme ?? "light",
    // "" is the per-field catch fallback for legacy invalid values
    accentColor: parsed.accentColor || "#7c3aed",
    filterOrder: parsed.filterOrder ?? [...DEFAULT_FILTER_ORDER],
    columns: parsed.columns ?? {
      visible: [...DEFAULT_COLUMN_KEYS],
      order: [...ALL_COLUMN_KEYS],
    },
  }
}

export const UI_PREFERENCES_DEFAULTS: UIPreferences = {
  sidebarCollapsed: false,
  filtersVisible: true,
  theme: "light",
  accentColor: "#7c3aed",
  filterOrder: [...DEFAULT_FILTER_ORDER],
  columns: {
    visible: [...DEFAULT_COLUMN_KEYS],
    order: [...ALL_COLUMN_KEYS],
  },
}
