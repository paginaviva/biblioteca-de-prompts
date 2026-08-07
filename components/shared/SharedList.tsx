"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export interface SharedPrompt {
  id: string
  title: string
  description: string | null
  type: string
  status: string
  language: string
  categories: { category: { id: string; name: string; slug: string } }[]
  tags: { tag: { id: string; name: string; slug: string } }[]
  clientProjects: { clientProject: { id: string; name: string; slug: string } }[]
  useCases: { useCase: { id: string; name: string; slug: string } }[]
  // Legacy free-text use case: shown when the N:M relation is empty.
  useCase: string | null
}

interface SharedListProps {
  prompts: SharedPrompt[]
  initialSearch: string
}

// Maps prompt.type values to existing MetadataSegment translation keys so
// the column shows "User/System/Tool" instead of the raw enum.
const TYPE_LABEL_KEYS: Record<string, string> = {
  USER: "user",
  SYSTEM: "system",
  TOOL: "tool",
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    PRODUCTION: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    TESTED: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    DRAFT: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  }
  return colors[status] || "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20"
}

export function SharedList({ prompts, initialSearch }: SharedListProps) {
  const router = useRouter()
  const t = useTranslations("SharedPage")
  const tCommon = useTranslations("Common")
  const tPromptList = useTranslations("PromptList")
  const tColumns = useTranslations("Columns")
  const tMetadata = useTranslations("MetadataSegment")
  const [searchQuery, setSearchQuery] = useState(initialSearch)

  // Server-side search: navigate with ?search= (same pattern as the Topbar
  // search box) so the server page re-runs getSharedPrompts.
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (searchQuery.trim()) {
      params.set("search", searchQuery.trim())
    }
    router.push(params.toString() ? `/shared?${params.toString()}` : "/shared")
  }

  const handleClear = () => {
    setSearchQuery("")
    router.push("/shared")
  }

  const getTypeLabel = (type: string): string => {
    const labelKey = TYPE_LABEL_KEYS[type]
    return labelKey ? tMetadata(labelKey) : type
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex max-w-md items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-accent" />
          <Input
            type="text"
            placeholder={t("searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 border-accent focus:border-accent focus:ring-accent"
          />
        </div>
        {searchQuery.length > 0 && (
          <Button type="button" variant="ghost" size="sm" onClick={handleClear}>
            {tCommon("clear")}
          </Button>
        )}
      </form>

      {prompts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground">{t("noSharedFound")}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-border">
                <th className="text-left py-3 px-4 font-semibold text-foreground">
                  {tPromptList("colTitle")}
                </th>
                <th className="text-left py-3 px-4 font-semibold text-foreground">
                  {tColumns("status")}
                </th>
                <th className="text-left py-3 px-4 font-semibold text-foreground">
                  {tColumns("type")}
                </th>
                <th className="text-left py-3 px-4 font-semibold text-foreground">
                  {tColumns("language")}
                </th>
                <th className="text-left py-3 px-4 font-semibold text-foreground">
                  {tColumns("categories")}
                </th>
                <th className="text-left py-3 px-4 font-semibold text-foreground">
                  {tColumns("tags")}
                </th>
                <th className="text-left py-3 px-4 font-semibold text-foreground">
                  {tColumns("clientProject")}
                </th>
                <th className="text-left py-3 px-4 font-semibold text-foreground">
                  {tColumns("useCase")}
                </th>
              </tr>
            </thead>
            <tbody>
              {prompts.map((prompt) => (
                <tr key={prompt.id} className="border-b border-border hover:bg-muted transition-colors">
                  <td className="py-3 px-4">
                    <Link
                      href={`/shared/${prompt.id}`}
                      className="font-medium text-foreground hover:text-accent transition-colors"
                    >
                      {prompt.title}
                    </Link>
                  </td>
                  <td className="py-3 px-4">
                    <Badge
                      variant="outline"
                      className={`${getStatusColor(prompt.status)} font-medium border`}
                    >
                      {prompt.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    <Badge
                      variant="outline"
                      className="text-xs bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20"
                    >
                      {getTypeLabel(prompt.type)}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    {prompt.language ? (
                      <Badge
                        variant="outline"
                        className="text-xs bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20"
                      >
                        {prompt.language}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {prompt.categories.map((pc) => (
                        <Badge
                          key={pc.category.name}
                          variant="secondary"
                          className="bg-accent-soft text-accent-strong border-accent text-xs"
                        >
                          {pc.category.name}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {prompt.tags.map((pt) => (
                        <Badge
                          key={pt.tag.name}
                          variant="outline"
                          className="text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                        >
                          {pt.tag.name}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {prompt.clientProjects.length > 0 ? (
                        prompt.clientProjects.map((cp) => (
                          <Badge
                            key={cp.clientProject.name}
                            variant="outline"
                            className="bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20 text-xs"
                          >
                            {cp.clientProject.name}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {prompt.useCases.length > 0 ? (
                        prompt.useCases.map((pu) => (
                          <Badge
                            key={pu.useCase.name}
                            variant="outline"
                            className="text-xs bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                          >
                            {pu.useCase.name}
                          </Badge>
                        ))
                      ) : prompt.useCase ? (
                        <Badge
                          variant="outline"
                          className="text-xs bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                        >
                          {prompt.useCase}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
