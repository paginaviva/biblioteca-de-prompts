import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Topbar } from "@/components/layout/Topbar"
import { Sidebar } from "@/components/layout/Sidebar"
import { UIContextProvider } from "@/contexts/UIContext"
import { parseUIPreferences, UI_PREFERENCES_DEFAULTS } from "@/lib/ui-preferences"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  let uiPreferences = UI_PREFERENCES_DEFAULTS
  if (session?.user?.id) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { uiPreferences: true },
      })
      uiPreferences = parseUIPreferences(user?.uiPreferences)
    } catch {
      // Fail-open: si la BD falla, usar defaults (el UIContext no se rompe)
    }
  }
  return (
    <div className="flex h-screen overflow-hidden">
      <UIContextProvider
        initialSidebarCollapsed={uiPreferences.sidebarCollapsed}
        initialFiltersVisible={uiPreferences.filtersVisible}
        initialTheme={uiPreferences.theme}
        initialAccentColor={uiPreferences.accentColor}
        initialFilterOrder={uiPreferences.filterOrder}
        initialColumns={uiPreferences.columns}
      >
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Topbar />
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </UIContextProvider>
    </div>
  )
}
