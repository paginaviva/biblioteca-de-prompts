"use client"

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react'

type ViewMode = 'cards' | 'list'

interface ViewModeContextType {
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
}

const ViewModeContext = createContext<ViewModeContextType | undefined>(undefined)

export function ViewModeProvider({ children, initialViewMode }: {
  children: ReactNode
  initialViewMode: ViewMode
}) {
  const [viewMode, setViewModeState] = useState<ViewMode>(initialViewMode)

  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeState(mode)
    
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
    fetch(`${basePath}/api/user/preferences`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ promptListViewPreference: mode }),
    }).catch((error) => {
      console.error("Failed to update view preference:", error)
    })
  }, [])

  return (
    <ViewModeContext.Provider value={{ viewMode, setViewMode }}>
      {children}
    </ViewModeContext.Provider>
  )
}

export function useViewMode() {
  const context = useContext(ViewModeContext)
  if (!context) {
    throw new Error('useViewMode must be used within ViewModeProvider')
  }
  return context
}
