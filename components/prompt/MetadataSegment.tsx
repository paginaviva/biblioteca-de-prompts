"use client"

import { useTranslations } from "next-intl"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

export interface CatalogOption {
  name: string
  slug: string
}

interface MetadataSegmentProps {
  type: string
  status: string
  language: string
  isFavorite: boolean
  isShared: boolean
  onTypeChange: (value: string) => void
  onStatusChange: (value: string) => void
  onLanguageChange: (value: string) => void
  onFavoriteChange: (value: boolean) => void
  onSharedChange: (value: boolean) => void
  optionsType?: CatalogOption[]
  optionsStatus?: CatalogOption[]
  optionsLanguage?: CatalogOption[]
  errors?: Record<string, string | undefined>
}

// Slug → translation key for the known catalog values. Catalog names come
// from the DB seed (English); the existing keys keep the localized labels
// for known values, and unknown slugs fall back to the catalog name.
const TYPE_LABEL_KEYS: Record<string, string> = {
  system: "system",
  user: "user",
  tool: "tool",
}

const STATUS_LABEL_KEYS: Record<string, string> = {
  draft: "draft",
  tested: "tested",
  production: "production",
}

const LANGUAGE_LABEL_KEYS: Record<string, string> = {
  "catalán/valenciano": "languageCatalan",
  "catalan/valenciano": "languageCatalan",
  de: "languageDeutsch",
  en: "languageEnglish",
  es: "languageSpanish",
  vasco: "languageEuskara",
  fr: "languageFrench",
  gallego: "languageGalician",
  it: "languageItalian",
  nl: "languageDutch",
  pl: "languagePolish",
  pt: "languagePortuguese",
  ru: "languageRussian",
  ja: "languageJapanese",
  zh: "languageChinese",
  ko: "languageKorean",
}

export default function MetadataSegment({
  type,
  status,
  language,
  isFavorite,
  isShared,
  onTypeChange,
  onStatusChange,
  onLanguageChange,
  onFavoriteChange,
  onSharedChange,
  optionsType,
  optionsStatus,
  optionsLanguage,
  errors,
}: MetadataSegmentProps) {
  const t = useTranslations("MetadataSegment")
  const tForm = useTranslations("PromptForm")

  // Catalog options win when the server provides them. Prompts store type
  // and status in UPPERCASE and language in lowercase, so option values are
  // normalized to match the stored values (Radix Select matches item value
  // against the controlled `value`). Without options the fixed lists keep
  // working (tests, renders without catalog data).
  const typeItems =
    optionsType && optionsType.length > 0
      ? optionsType.map((option) => ({
          value: option.slug.toUpperCase(),
          label: TYPE_LABEL_KEYS[option.slug] ? t(TYPE_LABEL_KEYS[option.slug]) : option.name,
        }))
      : [
          { value: "SYSTEM", label: t("system") },
          { value: "USER", label: t("user") },
          { value: "TOOL", label: t("tool") },
        ]

  const statusItems =
    optionsStatus && optionsStatus.length > 0
      ? optionsStatus.map((option) => ({
          value: option.slug.toUpperCase(),
          label: STATUS_LABEL_KEYS[option.slug] ? t(STATUS_LABEL_KEYS[option.slug]) : option.name,
        }))
      : [
          { value: "DRAFT", label: t("draft") },
          { value: "TESTED", label: t("tested") },
          { value: "PRODUCTION", label: t("production") },
        ]

  const languageItems =
    optionsLanguage && optionsLanguage.length > 0
      ? optionsLanguage.map((option) => ({
          value: option.slug,
          label: LANGUAGE_LABEL_KEYS[option.slug] ? t(LANGUAGE_LABEL_KEYS[option.slug]) : option.name,
        }))
      : [
          { value: "catalán/valenciano", label: t("languageCatalan") },
          { value: "de", label: t("languageDeutsch") },
          { value: "en", label: t("languageEnglish") },
          { value: "es", label: t("languageSpanish") },
          { value: "vasco", label: t("languageEuskara") },
          { value: "fr", label: t("languageFrench") },
          { value: "gallego", label: t("languageGalician") },
          { value: "it", label: t("languageItalian") },
          { value: "nl", label: t("languageDutch") },
          { value: "pt", label: t("languagePortuguese") },
        ]

  // Keep the currently stored value selectable even when it is not in the
  // catalog (legacy values like "vasco"): a controlled Radix Select shows an
  // empty trigger when no item matches the value, which would silently let
  // users overwrite the original language on save.
  const languageValuePresent = languageItems.some((item) => item.value === language)
  const displayLanguageItems =
    languageValuePresent || language === ""
      ? languageItems
      : [{ value: language, label: language }, ...languageItems]

  const typeValuePresent = typeItems.some((item) => item.value === type)
  const displayTypeItems = typeValuePresent || type === "" ? typeItems : [{ value: type, label: type }, ...typeItems]

  const statusValuePresent = statusItems.some((item) => item.value === status)
  const displayStatusItems =
    statusValuePresent || status === ""
      ? statusItems
      : [{ value: status, label: status }, ...statusItems]

  // Accessible names include the current value so screen readers announce
  // both the field and its selection (aria-label overrides the visible text).
  const currentTypeLabel =
    displayTypeItems.find((item) => item.value === type)?.label ?? type
  const currentStatusLabel =
    displayStatusItems.find((item) => item.value === status)?.label ?? status
  const currentLanguageLabel =
    displayLanguageItems.find((item) => item.value === language)?.label ?? language

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="type">{t("type")}</Label>
        <Select value={type} onValueChange={onTypeChange}>
          <SelectTrigger aria-label={`${t("type")}: ${currentTypeLabel}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {displayTypeItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors?.type && <p className="mt-1 text-sm text-red-500">{errors.type}</p>}
      </div>
      <div>
        <Label htmlFor="status">{t("status")}</Label>
        <Select value={status} onValueChange={onStatusChange}>
          <SelectTrigger aria-label={`${t("status")}: ${currentStatusLabel}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {displayStatusItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors?.status && <p className="mt-1 text-sm text-red-500">{errors.status}</p>}
      </div>
      <div>
        <Label htmlFor="language">{t("language")}</Label>
        <Select value={language} onValueChange={onLanguageChange}>
          <SelectTrigger aria-label={`${t("language")}: ${currentLanguageLabel}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {displayLanguageItems.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors?.language && <p className="mt-1 text-sm text-red-500">{errors.language}</p>}
      </div>
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="isFavorite"
          checked={isFavorite}
          onChange={(e) => onFavoriteChange(e.target.checked)}
          className="h-4 w-4 rounded border-input"
        />
        <Label htmlFor="isFavorite" className="cursor-pointer">
          {t("markAsFavorite")}
        </Label>
      </div>
      {errors?.isFavorite && <p className="mt-1 text-sm text-red-500">{errors.isFavorite}</p>}
      <div className="flex items-center space-x-2 pt-1">
        <Switch id="isShared" checked={isShared} onCheckedChange={onSharedChange} />
        <Label htmlFor="isShared" className="cursor-pointer">
          {tForm("sharedLabel")}
        </Label>
      </div>
      <p className="text-sm text-muted-foreground">{tForm("sharedHint")}</p>
    </div>
  )
}
