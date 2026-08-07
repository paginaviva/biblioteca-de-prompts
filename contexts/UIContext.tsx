"use client"

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import type { UIPreferences, UIPreferencesPatch } from '@/lib/ui-preferences'
import { hexToHsl } from '@/lib/color'

interface UIContextType {
  sidebarCollapsed: boolean
  filtersVisible: boolean
  activeFilterCount: number
  theme: "light" | "dark"
  accentColor: string
  filterOrder: string[]
  columns: { visible: string[]; order: string[] }
  setSidebarCollapsed: (collapsed: boolean) => void
  setFiltersVisible: (visible: boolean) => void
  setActiveFilterCount: (count: number) => void
  setTheme: (theme: "light" | "dark") => void
  setAccentColor: (color: string) => void
  setFilterOrder: (order: string[]) => void
  setColumns: (columns: { visible: string[]; order: string[] }) => void
}

const UIContext = createContext<UIContextType | undefined>(undefined)

// Fire-and-forget persistence: PATCH the shared preferences endpoint without
// blocking the UI. Failures are logged only (same pattern as the previous
// sidebar/filters setters).
function patchUIPreferences(patch: UIPreferencesPatch): void {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
  fetch(`${basePath}/api/user/preferences`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uiPreferences: patch }),
  }).catch((error) => {
    console.error("Failed to update UI preferences:", error)
  })
}

export function UIContextProvider({
  children,
  initialSidebarCollapsed = false,
  initialFiltersVisible = true,
  initialTheme = "light",
  initialAccentColor = "#7c3aed",
  initialFilterOrder = [],
  initialColumns = { visible: [], order: [] },
}: {
  children: ReactNode
  initialSidebarCollapsed?: boolean
  initialFiltersVisible?: boolean
  initialTheme?: UIPreferences["theme"]
  initialAccentColor?: UIPreferences["accentColor"]
  initialFilterOrder?: UIPreferences["filterOrder"]
  initialColumns?: UIPreferences["columns"]
}) {
  const [sidebarCollapsed, setSidebarCollapsedState] = useState<boolean>(initialSidebarCollapsed)
  const [filtersVisible, setFiltersVisibleState] = useState<boolean>(initialFiltersVisible)
  const [activeFilterCount, setActiveFilterCountState] = useState<number>(0)
  const [theme, setThemeState] = useState<UIPreferences["theme"]>(initialTheme)
  const [accentColor, setAccentColorState] = useState<UIPreferences["accentColor"]>(initialAccentColor)
  const [filterOrder, setFilterOrderState] = useState<UIPreferences["filterOrder"]>(initialFilterOrder)
  const [columns, setColumnsState] = useState<UIPreferences["columns"]>(initialColumns)

  // Applies the "dark" class to <html> and overrides the accent CSS
  // variables (--accent-hue/--accent-saturation/--accent-lightness) with the
  // user-chosen color, so every component using the accent utilities follows
  // it. Invalid hex values fall back to the default purple (262/83/58), which
  // matches the :root defaults in globals.css.
  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle("dark", theme === "dark")

    const hsl = hexToHsl(accentColor)
    root.style.setProperty("--accent-hue", hsl ? String(Math.round(hsl.h)) : "262")
    root.style.setProperty("--accent-saturation", hsl ? `${Math.round(hsl.s)}%` : "83%")
    root.style.setProperty("--accent-lightness", hsl ? `${Math.round(hsl.l)}%` : "58%")
  }, [theme, accentColor])

  const setSidebarCollapsed = useCallback((collapsed: boolean) => {
    setSidebarCollapsedState(collapsed)
    patchUIPreferences({ sidebarCollapsed: collapsed })
  }, [])

  const setFiltersVisible = useCallback((visible: boolean) => {
    setFiltersVisibleState(visible)
    patchUIPreferences({ filtersVisible: visible })
  }, [])

  const setActiveFilterCount = useCallback((count: number) => {
    setActiveFilterCountState(count)
  }, [])

  const setTheme = useCallback((value: UIPreferences["theme"]) => {
    setThemeState(value)
    patchUIPreferences({ theme: value })
  }, [])

  const setAccentColor = useCallback((color: UIPreferences["accentColor"]) => {
    setAccentColorState(color)
    patchUIPreferences({ accentColor: color })
  }, [])

  const setFilterOrder = useCallback((order: UIPreferences["filterOrder"]) => {
    setFilterOrderState(order)
    patchUIPreferences({ filterOrder: order })
  }, [])

  const setColumns = useCallback((nextColumns: UIPreferences["columns"]) => {
    setColumnsState(nextColumns)
    patchUIPreferences({ columns: nextColumns })
  }, [])

  return (
    <UIContext.Provider value={{
      sidebarCollapsed,
      filtersVisible,
      activeFilterCount,
      theme,
      accentColor,
      filterOrder,
      columns,
      setSidebarCollapsed,
      setFiltersVisible,
      setActiveFilterCount,
      setTheme,
      setAccentColor,
      setFilterOrder,
      setColumns,
    }}>
      {children}
    </UIContext.Provider>
  )
}

export function useUIContext() {
  const context = useContext(UIContext)
  if (!context) {
    throw new Error('useUIContext must be used within UIContextProvider')
  }
  return context
}
