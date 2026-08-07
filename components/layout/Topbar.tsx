"use client"

import { Suspense, useState } from "react"
import { useSession, signOut } from "next-auth/react"
import { useTranslations } from "next-intl"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { useUIContext } from "@/contexts/UIContext"
import { Plus, Search, SlidersHorizontal } from "lucide-react"

function FavoritesSwitch() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const t = useTranslations("Topbar")

  const isFavorite = searchParams.get("isFavorite") === "true"

  const handleToggle = (checked: boolean) => {
    const params = new URLSearchParams(searchParams.toString())
    if (checked) {
      params.set("isFavorite", "true")
    } else {
      params.delete("isFavorite")
    }
    const query = params.toString()
    if (pathname === "/prompts") {
      router.push(query ? `/prompts?${query}` : "/prompts")
    } else {
      router.push(checked ? "/prompts?isFavorite=true" : "/prompts")
    }
  }

  return (
    <label
      htmlFor="favorites-only-switch"
      className="flex cursor-pointer items-center gap-2 whitespace-nowrap"
    >
      <Switch
        id="favorites-only-switch"
        checked={isFavorite}
        onCheckedChange={handleToggle}
      />
      <span className="text-sm text-foreground">{t("showFavoritesOnly")}</span>
    </label>
  )
}

export function Topbar() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const { filtersVisible, setFiltersVisible, activeFilterCount } = useUIContext()
  const t = useTranslations("Topbar")
  const tCommon = useTranslations("Common")
  const [searchQuery, setSearchQuery] = useState("")

  const showFilterBadge = !filtersVisible && pathname === "/prompts" && activeFilterCount > 0

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (searchQuery) {
      params.set("search", searchQuery)
    }
    router.push(params.toString() ? `/prompts?${params.toString()}` : "/prompts")
  }

  return (
    <div className="flex h-16 items-center justify-between border-b border-border bg-background/80 backdrop-blur-sm px-6 shadow-sm">
      <div className="flex items-center gap-2 flex-1 max-w-md">
        <form onSubmit={handleSearch} className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-accent" />
            <Input
              type="text"
              placeholder={t("searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-accent focus:border-accent focus:ring-accent"
            />
          </div>
        </form>
        {searchQuery.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery("")
              router.push("/prompts")
            }}
            className="text-sm text-accent hover:text-accent-strong hover:underline px-1 whitespace-nowrap"
          >
            {tCommon("clear")}
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        {status === "loading" ? (
          <div className="text-sm text-muted-foreground">{tCommon("loading")}</div>
        ) : session?.user ? (
          <>
            <Link href="/prompts/new">
              <Button className="gradient-primary shadow-glow hover:shadow-glow-hover transition-all">
                <Plus className="mr-2 h-4 w-4" />
                {t("newPrompt")}
              </Button>
            </Link>

            <Button
              variant="outline"
              onClick={() => setFiltersVisible(!filtersVisible)}
              aria-label={filtersVisible ? t("hideFilters") : t("showFilters")}
              className="border-accent hover:bg-accent-soft hover:border-accent"
            >
              <span className="relative">
                <SlidersHorizontal className="mr-2 h-4 w-4" />
                {showFilterBadge && (
                  <span
                    role="status"
                    aria-label={t("filtersActive", { count: activeFilterCount })}
                    className="absolute -top-2 -right-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white"
                  >
                    {activeFilterCount}
                  </span>
                )}
              </span>
              {filtersVisible ? t("hideFilters") : t("showFilters")}
            </Button>

            <Suspense fallback={null}>
              <FavoritesSwitch />
            </Suspense>

            <Link href="/auth/profile">
              <Button variant="ghost" className="border-accent hover:bg-accent-soft hover:border-accent">
                {session.user.name}
              </Button>
            </Link>

            <Button
              variant="ghost"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="border-accent hover:bg-accent-soft hover:border-accent"
            >
              {t("signOut")}
            </Button>
          </>
        ) : (
          <>
            <Link href="/auth/signin">
              <Button variant="ghost" className="border-accent hover:bg-accent-soft hover:border-accent">
                {t("signIn")}
              </Button>
            </Link>
            <Link href="/auth/signup">
              <Button className="gradient-primary shadow-glow hover:shadow-glow-hover transition-all">
                {t("signUp")}
              </Button>
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
