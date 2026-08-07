"use client"

import { useTransition } from "react"
import { useTranslations } from "next-intl"
import { LayoutGrid, List } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useViewMode } from "@/contexts/ViewModeContext"

export function ViewToggle() {
  const { viewMode, setViewMode } = useViewMode()
  const [isPending, startTransition] = useTransition()
  const t = useTranslations("ViewToggle")

  const handleViewChange = (mode: "cards" | "list") => {
    startTransition(() => {
      setViewMode(mode)
    })
  }

  return (
    <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
      <Button
        variant={viewMode === "cards" ? "default" : "ghost"}
        size="sm"
        onClick={() => handleViewChange("cards")}
        disabled={isPending || viewMode === "cards"}
        className="h-8 px-3"
      >
        <LayoutGrid className="h-4 w-4 mr-2" />
        {t("cards")}
      </Button>
      <Button
        variant={viewMode === "list" ? "default" : "ghost"}
        size="sm"
        onClick={() => handleViewChange("list")}
        disabled={isPending || viewMode === "list"}
        className="h-8 px-3"
      >
        <List className="h-4 w-4 mr-2" />
        {t("list")}
      </Button>
    </div>
  )
}
