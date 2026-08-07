"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import { useTranslations } from "next-intl"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Star, Copy, Edit } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useViewMode } from "@/contexts/ViewModeContext"
import { ALL_COLUMN_KEYS, DEFAULT_COLUMN_KEYS } from "@/lib/ui-preferences"

interface Prompt {
  id: string
  title: string
  description: string | null
  body: string
  platform: string
  status: string
  isFavorite: boolean
  lastUsedAt: string | null
  usageCount: number
  // Configurable column data. Optional on purpose: legacy rows or unit
  // tests may not provide them (the page transform always does).
  type?: string
  language?: string
  useCase?: string | null
  category: {
    name: string
  } | null
  tags: {
    tag: {
      name: string
    }
  }[]
  platforms: {
    platform: {
      name: string
    }
  }[]
  categories: {
    category: {
      name: string
    }
  }[]
  clientProjects: {
    clientProject: {
      name: string
    }
  }[]
  // N:M use cases (not always fetched; falls back to the legacy useCase
  // text field when absent).
  useCases?: {
    useCase: {
      name: string
    }
  }[]
  user: {
    name: string
    email: string
  } | null
}

interface PromptListProps {
  prompts: Prompt[]
  columns?: { visible: string[]; order: string[] }
}

// All configurable column keys, as a set for O(1) validation of the
// preference arrays coming from UIContext.
const COLUMN_KEYS_SET: ReadonlySet<string> = new Set<string>(ALL_COLUMN_KEYS)

// Maps prompt.type values to existing MetadataSegment translation keys so
// the column shows "User/System/Tool" instead of the raw enum.
const TYPE_LABEL_KEYS: Record<string, string> = {
  USER: "user",
  SYSTEM: "system",
  TOOL: "tool",
}

// Cards skip a configurable block when the prompt has nothing to show for
// it (the table keeps its "-" placeholders instead).
function hasColumnContent(key: string, prompt: Prompt): boolean {
  switch (key) {
    case "platforms":
      return prompt.platforms.length > 0 || Boolean(prompt.platform)
    case "categories":
      return prompt.categories.length > 0
    case "tags":
      return prompt.tags.length > 0
    case "clientProject":
      return prompt.clientProjects.length > 0
    case "useCase":
      return Boolean(prompt.useCases && prompt.useCases.length > 0) || Boolean(prompt.useCase)
    case "language":
      return Boolean(prompt.language)
    case "type":
      return Boolean(prompt.type)
    default:
      return true
  }
}

export function PromptList({ prompts, columns = { visible: [], order: [] } }: PromptListProps) {
  const { viewMode } = useViewMode()
  const t = useTranslations("PromptList")
  const tCommon = useTranslations("Common")
  const tColumns = useTranslations("Columns")
  const tMetadata = useTranslations("MetadataSegment")

  // Configurable columns to render: `order` filtered to the `visible`
  // subset. Missing/invalid preferences (legacy data, provider-less
  // renders) fall back to the default keys, keeping a minimum of 1.
  const knownOrder = columns.order.filter((key) => COLUMN_KEYS_SET.has(key))
  const baseOrder = knownOrder.length > 0 ? knownOrder : [...DEFAULT_COLUMN_KEYS]
  const visibleSet = new Set<string>(
    columns.visible.length > 0 ? columns.visible : [...DEFAULT_COLUMN_KEYS],
  )
  const renderedColumns = baseOrder.filter((key) => visibleSet.has(key))
  const configurableColumns = renderedColumns.length > 0 ? renderedColumns : [...DEFAULT_COLUMN_KEYS]

  const handleCopy = async (body: string, id: string) => {
    try {
      await navigator.clipboard.writeText(body)
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
      await fetch(`${basePath}/api/prompts/${id}/usage`, { method: "PATCH" })
    } catch (error) {
      console.error("Failed to copy:", error)
    }
  }

  if (prompts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">{t("noPromptsFound")}</p>
        <Link href="/prompts/new" className="mt-4">
          <Button>{t("createFirstPrompt")}</Button>
        </Link>
      </div>
    )
  }

  const getPlatformColor = (platform: string) => {
    const colors: Record<string, string> = {
      CHATGPT: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
      CURSOR: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
      MIDJOURNEY: "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20",
      SUNO: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
      OTHER: "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20",
    }
    return colors[platform] || colors.OTHER
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PRODUCTION: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      TESTED: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
      DRAFT: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    }
    return colors[status] || "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20"
  }

  // Header labels: the 5 classic keys keep their PromptList translations,
  // the new ones (useCase, language, type) use the Columns namespace.
  const COLUMN_HEADERS: Record<string, string> = {
    status: t("colStatus"),
    platforms: t("colPlatforms"),
    categories: t("colCategories"),
    tags: t("colTags"),
    clientProject: t("colClientProject"),
    useCase: tColumns("useCase"),
    language: tColumns("language"),
    type: tColumns("type"),
  }

  // Key → badge content shared by the table cells and the card blocks. The
  // wrapper (flex container) is provided by each view.
  const COLUMN_CONTENT: Record<string, (prompt: Prompt) => ReactNode> = {
    status: (prompt) => (
      <Badge
        variant="outline"
        className={`${getStatusColor(prompt.status)} font-medium border`}
      >
        {prompt.status}
      </Badge>
    ),
    platforms: (prompt) =>
      prompt.platforms.length > 0 ? (
        prompt.platforms.map((pp) => (
          <Badge
            key={pp.platform.name}
            variant="outline"
            className={`${getPlatformColor(pp.platform.name)} font-medium border text-xs`}
          >
            {pp.platform.name}
          </Badge>
        ))
      ) : (
        <span className="text-xs text-muted-foreground">{prompt.platform}</span>
      ),
    categories: (prompt) =>
      prompt.categories.map((pc) => (
        <Badge
          key={pc.category.name}
          variant="secondary"
          className="bg-accent-soft text-accent-strong border-accent text-xs"
        >
          {pc.category.name}
        </Badge>
      )),
    tags: (prompt) =>
      prompt.tags.map((pt) => (
        <Badge
          key={pt.tag.name}
          variant="outline"
          className="text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
        >
          {pt.tag.name}
        </Badge>
      )),
    clientProject: (prompt) =>
      prompt.clientProjects.length > 0 ? (
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
      ),
    // N:M use cases when the relation is loaded; falls back to the legacy
    // free-text useCase field.
    useCase: (prompt) =>
      prompt.useCases && prompt.useCases.length > 0 ? (
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
      ),
    language: (prompt) =>
      prompt.language ? (
        <Badge
          variant="outline"
          className="text-xs bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20"
        >
          {prompt.language}
        </Badge>
      ) : (
        <span className="text-xs text-muted-foreground">-</span>
      ),
    type: (prompt) => {
      const labelKey = prompt.type ? TYPE_LABEL_KEYS[prompt.type] : undefined
      return (
        <Badge
          variant="outline"
          className="text-xs bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20"
        >
          {labelKey ? tMetadata(labelKey) : prompt.type || "-"}
        </Badge>
      )
    },
  }

  // List view - table format
  if (viewMode === "list") {
    return (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-border">
              <th className="text-center py-3 px-4 font-semibold text-foreground">★</th>
              <th className="text-left py-3 px-4 font-semibold text-foreground">{t("colCopy")}</th>
              <th className="text-left py-3 px-4 font-semibold text-foreground">{t("colEdit")}</th>
              <th className="text-left py-3 px-4 font-semibold text-foreground">{t("colTitle")}</th>
              {configurableColumns.map((key) => (
                <th key={key} className="text-left py-3 px-4 font-semibold text-foreground">
                  {COLUMN_HEADERS[key] ?? key}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {prompts.map((prompt) => (
              <tr key={prompt.id} className="border-b border-border hover:bg-muted transition-colors">
                <td className="py-3 px-4 text-center">
                  {prompt.isFavorite && (
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 inline" />
                  )}
                </td>
                <td className="py-3 px-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(prompt.body, prompt.id)}
                    className="border-accent hover:bg-accent-soft hover:border-accent hover:text-accent-strong"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </td>
                <td className="py-3 px-4">
                  <Link href={`/prompts/${prompt.id}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-accent hover:bg-accent-soft hover:border-accent hover:text-accent-strong"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </Link>
                </td>
                <td className="py-3 px-4">
                  <span className="font-medium text-foreground">{prompt.title}</span>
                </td>
                {configurableColumns.map((key) => (
                  <td key={key} className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">{COLUMN_CONTENT[key]?.(prompt) ?? null}</div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  // Cards view - base structure (title, description, usage counter, author,
  // copy/edit buttons) with the configurable fields inserted in the chosen
  // order, skipping blocks the prompt has no content for.
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {prompts.map((prompt) => (
        <Card 
          key={prompt.id} 
          className="flex flex-col gradient-card shadow-glow hover:shadow-glow-hover transition-all duration-300 border-accent overflow-hidden group"
        >
          <div className="h-1 bg-gradient-to-r from-[var(--accent-color)] via-pink-500 to-blue-500"></div>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <CardTitle className="flex-1 text-lg font-bold text-foreground group-hover:text-accent transition-colors">
                {prompt.title}
              </CardTitle>
              {prompt.isFavorite && (
                <Star className="h-5 w-5 fill-yellow-400 text-yellow-400 drop-shadow-sm" />
              )}
            </div>
            {prompt.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                {prompt.description}
              </p>
            )}
          </CardHeader>
          <CardContent className="flex-1 space-y-3">
            {configurableColumns.map((key) =>
              hasColumnContent(key, prompt) ? (
                <div key={key} className="flex flex-wrap gap-2">
                  {COLUMN_CONTENT[key]?.(prompt)}
                </div>
              ) : null,
            )}

            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
              <span className="flex items-center gap-1">
                <span className="font-medium text-foreground">{prompt.usageCount}</span>
                <span>{t("uses", { count: prompt.usageCount })}</span>
                {prompt.lastUsedAt && (
                  <>
                    <span>•</span>
                    <span>{new Date(prompt.lastUsedAt).toLocaleDateString()}</span>
                  </>
                )}
              </span>
              {prompt.user && (
                <span className="text-xs text-muted-foreground">
                  {t("byUser", { name: prompt.user.name })}
                </span>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => handleCopy(prompt.body, prompt.id)}
                className="flex-1 border-accent hover:bg-accent-soft hover:border-accent hover:text-accent-strong transition-all"
              >
                <Copy className="mr-2 h-4 w-4" />
                {tCommon("copy")}
              </Button>
              <Link href={`/prompts/${prompt.id}`} className="flex-1">
                <Button 
                  variant="outline" 
                  className="w-full border-accent hover:bg-accent-soft hover:border-accent hover:text-accent-strong transition-all"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  {tCommon("edit")}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
