"use client"

import { Fragment, useCallback, useMemo, type ReactNode } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import { DEFAULT_FILTER_ORDER } from "@/lib/ui-preferences"

interface PromptFiltersProps {
  categories: Array<{ id: string; name: string; slug: string }>
  tags: Array<{ id: string; name: string; slug: string }>
  platforms: Array<{ id: string; name: string; slug: string }>
  clients: Array<{ id: string; name: string; slug: string }>
  useCases: Array<{ id: string; name: string; slug: string }>
  optionsType?: Array<{ name: string; slug: string }>
  optionsStatus?: Array<{ name: string; slug: string }>
  optionsLanguage?: Array<{ name: string; slug: string }>
  initialFilters: {
    categoryId?: string
    categoryIds?: string | string[]
    tagIds?: string | string[]
    platform?: string
    platformIds?: string | string[]
    status?: string | string[]
    type?: string | string[]
    language?: string | string[]
    clientProjectIds?: string | string[]
    useCaseIds?: string | string[]
  }
}

const LANGUAGES = [
  { code: "en", nameKey: "languageEnglish" },
  { code: "es", nameKey: "languageSpanish" },
  { code: "fr", nameKey: "languageFrench" },
  { code: "de", nameKey: "languageGerman" },
  { code: "it", nameKey: "languageItalian" },
  { code: "pt", nameKey: "languagePortuguese" },
  { code: "nl", nameKey: "languageDutch" },
  { code: "pl", nameKey: "languagePolish" },
  { code: "ru", nameKey: "languageRussian" },
  { code: "ja", nameKey: "languageJapanese" },
  { code: "zh", nameKey: "languageChinese" },
  { code: "ko", nameKey: "languageKorean" },
] as const

const STATUSES = [
  { value: "DRAFT", labelKey: "statusDraft" },
  { value: "TESTED", labelKey: "statusTested" },
  { value: "PRODUCTION", labelKey: "statusProduction" },
] as const

// Type values are stored UPPERCASE in prompts; the catalog slugs are
// lowercase, so option values are uppercased to match (same as status).
const TYPES = [
  { value: "SYSTEM", labelKey: "system" },
  { value: "USER", labelKey: "user" },
  { value: "TOOL", labelKey: "tool" },
] as const

const TYPE_LABEL_KEYS: Record<string, string> = {
  system: "system",
  user: "user",
  tool: "tool",
}

// Slug → translation key for the known catalog values. Catalog names come
// from the DB seed (English); the existing keys keep localized labels for
// known values, and unknown slugs fall back to the catalog name.
const STATUS_LABEL_KEYS: Record<string, string> = {
  draft: "statusDraft",
  tested: "statusTested",
  production: "statusProduction",
}

const LANGUAGE_LABEL_KEYS: Record<string, string> = {
  en: "languageEnglish",
  es: "languageSpanish",
  fr: "languageFrench",
  de: "languageGerman",
  it: "languageItalian",
  pt: "languagePortuguese",
  nl: "languageDutch",
  pl: "languagePolish",
  ru: "languageRussian",
  ja: "languageJapanese",
  zh: "languageChinese",
  ko: "languageKorean",
}

export function PromptFilters({
  categories,
  tags,
  platforms,
  clients,
  useCases,
  optionsType,
  optionsStatus,
  optionsLanguage,
  initialFilters,
  filterOrder = DEFAULT_FILTER_ORDER,
}: PromptFiltersProps & { filterOrder?: readonly string[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations("PromptFilters")
  const tMetadata = useTranslations("MetadataSegment")

  const toggleFilter = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    const currentValues = params.getAll(key)
    if (currentValues.includes(value)) {
      params.delete(key)
      currentValues
        .filter((v) => v !== value)
        .forEach((v) => params.append(key, v))
    } else {
      params.append(key, value)
    }
    router.push(`/prompts?${params.toString()}`)
  }, [searchParams, router])

  const clearFilters = () => {
    router.push("/prompts")
  }

  const selectedTagIds = Array.isArray(initialFilters.tagIds)
    ? initialFilters.tagIds
    : initialFilters.tagIds
    ? [initialFilters.tagIds]
    : []

  const selectedPlatformIds = Array.isArray(initialFilters.platformIds)
    ? initialFilters.platformIds
    : initialFilters.platformIds
    ? [initialFilters.platformIds]
    : []

  const selectedCategoryIds = Array.isArray(initialFilters.categoryIds)
    ? initialFilters.categoryIds
    : initialFilters.categoryIds
    ? [initialFilters.categoryIds]
    : []

  const selectedStatuses = Array.isArray(initialFilters.status)
    ? initialFilters.status
    : initialFilters.status
    ? [initialFilters.status]
    : []

  const selectedTypes = Array.isArray(initialFilters.type)
    ? initialFilters.type
    : initialFilters.type
    ? [initialFilters.type]
    : []

  const selectedLanguages = Array.isArray(initialFilters.language)
    ? initialFilters.language
    : initialFilters.language
    ? [initialFilters.language]
    : []

  const selectedClientProjectIds = Array.isArray(initialFilters.clientProjectIds)
    ? initialFilters.clientProjectIds
    : initialFilters.clientProjectIds
    ? [initialFilters.clientProjectIds]
    : []

  const selectedUseCaseIds = Array.isArray(initialFilters.useCaseIds)
    ? initialFilters.useCaseIds
    : initialFilters.useCaseIds
    ? [initialFilters.useCaseIds]
    : []

  const selectedArrays: Record<string, string[]> = useMemo(
    () => ({
      categoryIds: selectedCategoryIds,
      tagIds: selectedTagIds,
      platformIds: selectedPlatformIds,
      status: selectedStatuses,
      type: selectedTypes,
      language: selectedLanguages,
      clientProjectIds: selectedClientProjectIds,
      useCaseIds: selectedUseCaseIds,
    }),
    [
      selectedCategoryIds,
      selectedTagIds,
      selectedPlatformIds,
      selectedStatuses,
      selectedTypes,
      selectedLanguages,
      selectedClientProjectIds,
      selectedUseCaseIds,
    ],
  )

  const isSelected = useCallback(
    (key: string, value: string): boolean => {
      return selectedArrays[key]?.includes(value) ?? false
    },
    [selectedArrays],
  )

  // Only trust filterOrder when it lists every known box. Empty or partial
  // orders (legacy data, provider-less renders) fall back to the default so
  // the full panel is always shown; unknown keys are skipped at render time.
  const order: readonly string[] =
    DEFAULT_FILTER_ORDER.every((key) => filterOrder.includes(key))
      ? filterOrder
      : DEFAULT_FILTER_ORDER

  // Status/language options come from the catalog (server loaded) when
  // available; the fixed arrays are the fallback. Filter values must match
  // what prompts store: type/status are UPPERCASE, language is lowercase.
  const typeOptions =
    optionsType && optionsType.length > 0
      ? optionsType.map((option) => ({
          value: option.slug.toUpperCase(),
          label: TYPE_LABEL_KEYS[option.slug]
            ? tMetadata(TYPE_LABEL_KEYS[option.slug])
            : option.name,
        }))
      : TYPES.map((typeOption) => ({
          value: typeOption.value,
          label: tMetadata(typeOption.labelKey),
        }))

  const statusOptions =
    optionsStatus && optionsStatus.length > 0
      ? optionsStatus.map((option) => ({
          value: option.slug.toUpperCase(),
          label: STATUS_LABEL_KEYS[option.slug] ? t(STATUS_LABEL_KEYS[option.slug]) : option.name,
        }))
      : STATUSES.map((statusOption) => ({
          value: statusOption.value,
          label: t(statusOption.labelKey),
        }))

  const languageOptions =
    optionsLanguage && optionsLanguage.length > 0
      ? optionsLanguage.map((option) => ({
          value: option.slug,
          label: LANGUAGE_LABEL_KEYS[option.slug] ? t(LANGUAGE_LABEL_KEYS[option.slug]) : option.name,
        }))
      : LANGUAGES.map((languageOption) => ({
          value: languageOption.code,
          label: t(languageOption.nameKey),
        }))

  // Key → card map. Cards are functions so unknown filterOrder keys resolve
  // to nothing (optional chaining) instead of breaking the render.
  const FILTER_CARDS: Record<string, () => ReactNode> = {
    category: () => (
      <Card className="gradient-card shadow-glow border-accent">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-foreground">{t("category")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {categories.map((category) => {
            return (
              <label key={category.id} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSelected("categoryIds", category.id)}
                  onChange={() => toggleFilter("categoryIds", category.id)}
                  className="h-4 w-4 rounded border-input"
                />
                <span className="text-sm">{category.name}</span>
              </label>
            )
          })}
        </CardContent>
      </Card>
    ),
    tags: () => (
      <Card className="gradient-card shadow-glow border-accent">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-foreground">{t("tags")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {tags.map((tag) => {
            return (
              <label
                key={tag.id}
                className="flex items-center space-x-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={isSelected("tagIds", tag.id)}
                  onChange={() => toggleFilter("tagIds", tag.id)}
                  className="h-4 w-4 rounded border-input"
                />
                <span className="text-sm">{tag.name}</span>
              </label>
            )
          })}
        </CardContent>
      </Card>
    ),
    platform: () => (
      <Card className="gradient-card shadow-glow border-accent">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-foreground">{t("platform")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {platforms.map((platform) => {
            return (
              <label key={platform.id} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSelected("platformIds", platform.id)}
                  onChange={() => toggleFilter("platformIds", platform.id)}
                  className="h-4 w-4 rounded border-input"
                />
                <span className="text-sm">{platform.name}</span>
              </label>
            )
          })}
        </CardContent>
      </Card>
    ),
    status: () => (
      <Card className="gradient-card shadow-glow border-accent">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-foreground">{t("status")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {statusOptions.map((option) => {
            return (
              <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSelected("status", option.value)}
                  onChange={() => toggleFilter("status", option.value)}
                  className="h-4 w-4 rounded border-input"
                />
                <span className="text-sm">{option.label}</span>
              </label>
            )
          })}
        </CardContent>
      </Card>
    ),
    type: () => (
      <Card className="gradient-card shadow-glow border-accent">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-foreground">{tMetadata("type")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {typeOptions.map((option) => {
            return (
              <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSelected("type", option.value)}
                  onChange={() => toggleFilter("type", option.value)}
                  className="h-4 w-4 rounded border-input"
                />
                <span className="text-sm">{option.label}</span>
              </label>
            )
          })}
        </CardContent>
      </Card>
    ),
    language: () => (
      <Card className="gradient-card shadow-glow border-accent">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-foreground">{t("language")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {languageOptions.map((option) => {
            return (
              <label key={option.value} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSelected("language", option.value)}
                  onChange={() => toggleFilter("language", option.value)}
                  className="h-4 w-4 rounded border-input"
                />
                <span className="text-sm">{option.label}</span>
              </label>
            )
          })}
        </CardContent>
      </Card>
    ),
    clientProject: () => (
      <Card className="gradient-card shadow-glow border-accent">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-foreground">{t("clientProject")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {clients.map((client) => {
            return (
              <label key={client.id} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSelected("clientProjectIds", client.id)}
                  onChange={() => toggleFilter("clientProjectIds", client.id)}
                  className="h-4 w-4 rounded border-input"
                />
                <span className="text-sm">{client.name}</span>
              </label>
            )
          })}
        </CardContent>
      </Card>
    ),
    useCase: () => (
      <Card className="gradient-card shadow-glow border-accent">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-foreground">{t("useCase")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {useCases.map((useCase) => {
            return (
              <label key={useCase.id} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSelected("useCaseIds", useCase.id)}
                  onChange={() => toggleFilter("useCaseIds", useCase.id)}
                  className="h-4 w-4 rounded border-input"
                />
                <span className="text-sm">{useCase.name}</span>
              </label>
            )
          })}
        </CardContent>
      </Card>
    ),
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">{t("title")}</h2>
        {(initialFilters.categoryId ||
          selectedCategoryIds.length > 0 ||
          selectedPlatformIds.length > 0 ||
          selectedTagIds.length > 0 ||
          initialFilters.platform ||
          selectedStatuses.length > 0 ||
          selectedTypes.length > 0 ||
          selectedLanguages.length > 0 ||
          selectedClientProjectIds.length > 0 ||
          selectedUseCaseIds.length > 0) && (
          <Button variant="ghost" size="sm" onClick={clearFilters} aria-label={t("clearFilters")} className="hover:bg-accent-soft hover:text-accent-strong">
            <X className="h-4 w-4" />
            <span className="sr-only">{t("clearFilters")}</span>
          </Button>
        )}
      </div>

      {order.map((key) => (
        <Fragment key={key}>{FILTER_CARDS[key]?.()}</Fragment>
      ))}
    </div>
  )
}
