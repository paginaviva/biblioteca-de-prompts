"use client"

import { useEffect, useMemo } from "react"
import { PromptFilters } from "@/components/prompt/PromptFilters"
import { PromptList } from "@/components/prompt/PromptList"
import { useUIContext } from "@/contexts/UIContext"

export interface TransformedPrompt {
  id: string
  title: string
  description: string | null
  body: string
  type: string
  platform: string
  modelHint: string | null
  language: string
  useCase: string | null
  clientOrProject: string | null
  status: string
  isFavorite: boolean
  version: number
  changelog: string | null
  notes: string | null
  usageCount: number
  lastUsedAt: string | null
  category: null
  categories: { category: { id: string; name: string; slug: string } }[]
  tags: { tag: { id: string; name: string; slug: string } }[]
  platforms: { platform: { id: string; name: string; slug: string } }[]
  clientProjects: { clientProject: { id: string; name: string; slug: string } }[]
  useCases: { useCase: { id: string; name: string; slug: string } }[]
  user: { name: string; email: string } | null
  createdAt: string
  updatedAt: string
}

export interface PromptFiltersParams {
  search?: string
  categoryId?: string
  categoryIds?: string | string[]
  tagIds?: string | string[]
  platform?: string
  platformIds?: string | string[]
  status?: string | string[]
  type?: string | string[]
  isFavorite?: string
  language?: string | string[]
  clientProjectIds?: string | string[]
  useCaseIds?: string | string[]
}

interface PromptsPageContentProps {
  prompts: TransformedPrompt[]
  categories: Array<{ id: string; name: string; slug: string }>
  tags: Array<{ id: string; name: string; slug: string }>
  platforms: Array<{ id: string; name: string; slug: string }>
  clients: Array<{ id: string; name: string; slug: string }>
  useCases: Array<{ id: string; name: string; slug: string }>
  optionsType?: Array<{ name: string; slug: string }>
  optionsStatus?: Array<{ name: string; slug: string }>
  optionsLanguage?: Array<{ name: string; slug: string }>
  initialFilters: PromptFiltersParams
}

const ACTIVE_FILTER_KEYS = [
  "search",
  "categoryId",
  "categoryIds",
  "tagIds",
  "platform",
  "platformIds",
  "status",
  "type",
  "language",
  "clientProjectIds",
  "useCaseIds",
  "isFavorite",
] as const

// Cada clave del searchParams con al menos un valor cuenta como 1 filtro activo
function countActiveFilters(filters: PromptFiltersParams): number {
  return ACTIVE_FILTER_KEYS.reduce((count, key) => {
    const value = filters[key]
    if (value === undefined || value === null) return count
    return value.length > 0 ? count + 1 : count
  }, 0)
}

export function PromptsPageContent({
  prompts,
  categories,
  tags,
  platforms,
  clients,
  useCases,
  optionsType,
  optionsStatus,
  optionsLanguage,
  initialFilters,
}: PromptsPageContentProps) {
  const { filtersVisible, setActiveFilterCount, filterOrder, columns } = useUIContext()

  const activeFilterCount = useMemo(
    () => countActiveFilters(initialFilters),
    [initialFilters],
  )

  useEffect(() => {
    setActiveFilterCount(activeFilterCount)
    return () => setActiveFilterCount(0)
  }, [activeFilterCount, setActiveFilterCount])

  return (
    <div className="flex gap-6">
      {filtersVisible && (
        <div className="w-64 flex-shrink-0">
          <PromptFilters
            categories={categories}
            tags={tags}
            platforms={platforms}
            clients={clients}
            useCases={useCases}
            optionsType={optionsType}
            optionsStatus={optionsStatus}
            optionsLanguage={optionsLanguage}
            initialFilters={initialFilters}
            filterOrder={filterOrder}
          />
        </div>
      )}
      <div className="flex-1">
        <PromptList prompts={prompts} columns={columns} />
      </div>
    </div>
  )
}
