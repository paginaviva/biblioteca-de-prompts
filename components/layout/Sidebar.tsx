"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import {
  Boxes,
  Briefcase,
  ChevronDown,
  ChevronRight,
  CircleDot,
  Cpu,
  FileText,
  FolderTree,
  Home,
  Languages,
  Library,
  PanelLeftClose,
  PanelLeftOpen,
  Puzzle,
  Share2,
  Tag,
  Type,
  User,
} from "lucide-react"
import { useUIContext } from "@/contexts/UIContext"

const TOOLTIP_CLASSES =
  "pointer-events-none absolute left-full ml-2 z-50 whitespace-nowrap rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"

export function Sidebar() {
  const pathname = usePathname()
  const { data: session, status } = useSession()
  const t = useTranslations("Sidebar")
  const tTaxonomy = useTranslations("Taxonomy")
  const { sidebarCollapsed, setSidebarCollapsed } = useUIContext()
  const isAdmin = session?.user?.role === "admin"
  // The taxonomy submenu also covers /categories and /tags (they moved under
  // the Taxonomy section), so it opens on any of those routes.
  const isOnTaxonomyRoute =
    pathname.startsWith("/taxonomy") ||
    pathname.startsWith("/categories") ||
    pathname.startsWith("/tags")
  const [isTaxonomyOpen, setIsTaxonomyOpen] = useState(() => isOnTaxonomyRoute)

  // Keep the submenu open when navigating to any taxonomy route from
  // outside the sidebar (client-side navigation).
  useEffect(() => {
    setIsTaxonomyOpen(isOnTaxonomyRoute)
  }, [isOnTaxonomyRoute])

  const navigation = [
    { name: t("prompts"), href: "/prompts", icon: FileText },
    { name: t("shared"), href: "/shared", icon: Share2 },
  ]

  const taxonomyItems = [
    { name: tTaxonomy("categories"), href: "/categories", icon: FolderTree },
    { name: tTaxonomy("tags"), href: "/tags", icon: Tag },
    { name: tTaxonomy("type"), href: "/taxonomy/type", icon: Type },
    { name: tTaxonomy("status"), href: "/taxonomy/status", icon: CircleDot },
    { name: tTaxonomy("language"), href: "/taxonomy/language", icon: Languages },
    { name: tTaxonomy("platforms"), href: "/taxonomy/platforms", icon: Boxes },
    { name: tTaxonomy("clientProjects"), href: "/taxonomy/client-projects", icon: Briefcase },
    { name: tTaxonomy("useCases"), href: "/taxonomy/use-cases", icon: Puzzle },
    { name: tTaxonomy("modelHints"), href: "/taxonomy/model-hints", icon: Cpu },
  ]

  return (
    <div
      className={cn(
        "flex flex-col border-r gradient-sidebar shadow-lg transition-all duration-300",
        sidebarCollapsed ? "w-16" : "w-64"
      )}
    >
      <div
        className={cn(
          "flex h-16 shrink-0 items-center border-b border-white/20 transition-all duration-300",
          sidebarCollapsed ? "justify-center gap-1 px-1" : "px-6"
        )}
      >
        <Link
          href="/"
          aria-label={t("appName")}
          className={cn("flex items-center gap-2 text-white", sidebarCollapsed && "justify-center")}
        >
          <div className="rounded-lg bg-white/20 p-1.5">
            <Home className="h-5 w-5 text-white" />
          </div>
          {!sidebarCollapsed && <span className="text-lg font-bold text-white">{t("appName")}</span>}
        </Link>
        <button
          type="button"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          aria-label={sidebarCollapsed ? t("expandSidebar") : t("collapseSidebar")}
          title={sidebarCollapsed ? t("expandSidebar") : t("collapseSidebar")}
          className={cn(
            "rounded-lg p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white",
            !sidebarCollapsed && "ml-auto"
          )}
        >
          {sidebarCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
        </button>
      </div>
      <nav className="flex-1 space-y-2 p-4">
        {navigation.map((item) => {
          const Icon = item.icon
          const isActive = pathname.startsWith(item.href)
          return (
            <span key={item.name} className={cn("group relative", sidebarCollapsed && "flex justify-center")}>
              <Link
                href={item.href}
                aria-label={sidebarCollapsed ? item.name : undefined}
                className={cn(
                  "flex items-center rounded-lg py-2.5 text-sm font-medium transition-all duration-200",
                  sidebarCollapsed ? "justify-center px-2" : "gap-3 px-3",
                  isActive
                    ? "bg-white/20 text-white shadow-md backdrop-blur-sm"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                )}
              >
                <Icon className="h-5 w-5" />
                {!sidebarCollapsed && item.name}
              </Link>
              {sidebarCollapsed && <span className={TOOLTIP_CLASSES}>{item.name}</span>}
            </span>
          )
        })}
        {isAdmin && (
          <span className={cn("group relative", sidebarCollapsed && "flex justify-center")}>
            <button
              type="button"
              onClick={() => setIsTaxonomyOpen((open) => !open)}
              aria-label={sidebarCollapsed ? t("taxonomy") : undefined}
              aria-expanded={isTaxonomyOpen}
              aria-controls="taxonomy-submenu"
              className={cn(
                "flex w-full items-center rounded-lg py-2.5 text-sm font-medium transition-all duration-200",
                sidebarCollapsed ? "justify-center px-2" : "gap-3 px-3",
                isOnTaxonomyRoute
                  ? "bg-white/20 text-white shadow-md backdrop-blur-sm"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              )}
            >
              <Library className="h-5 w-5 shrink-0" />
              {!sidebarCollapsed && (
                <>
                  <span className="flex-1 text-left">{t("taxonomy")}</span>
                  {isTaxonomyOpen ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-white/70" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-white/70" />
                  )}
                </>
              )}
            </button>
            {sidebarCollapsed && <span className={TOOLTIP_CLASSES}>{t("taxonomy")}</span>}
            {!sidebarCollapsed && isTaxonomyOpen && (
              <div
                id="taxonomy-submenu"
                role="group"
                aria-label={t("taxonomy")}
                className="mt-1 flex flex-col space-y-1"
              >
                {taxonomyItems.map((item) => {
                  const SubIcon = item.icon
                  const isSubActive = pathname.startsWith(item.href)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg py-2 pl-10 pr-3 text-sm font-medium transition-all duration-200",
                        isSubActive
                          ? "bg-white/20 text-white shadow-md backdrop-blur-sm"
                          : "text-white/80 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      <SubIcon className="h-4 w-4 shrink-0" />
                      {item.name}
                    </Link>
                  )
                })}
              </div>
            )}
          </span>
        )}
      </nav>
      {status === "authenticated" && session?.user && (
        <div className="border-t border-white/20 p-4">
          <span className={cn("group relative", sidebarCollapsed && "flex justify-center")}>
            <Link
              href="/auth/profile"
              aria-label={sidebarCollapsed ? session.user.name ?? undefined : undefined}
              className={cn(
                "flex items-center rounded-lg py-2.5 text-sm font-medium transition-all duration-200",
                sidebarCollapsed ? "justify-center px-2" : "gap-3 px-3",
                pathname.startsWith("/auth/profile")
                  ? "bg-white/20 text-white shadow-md backdrop-blur-sm"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              )}
            >
              <User className="h-5 w-5" />
              {!sidebarCollapsed && <span className="truncate">{session.user.name}</span>}
            </Link>
            {sidebarCollapsed && <span className={TOOLTIP_CLASSES}>{session.user.name}</span>}
          </span>
        </div>
      )}
    </div>
  )
}
