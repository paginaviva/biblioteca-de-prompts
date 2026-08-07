import { hasLocale } from "next-intl"
import { activeLocales, defaultLocale, type Locale } from "../i18n/locales"

// Bare language codes map to their active regional variant.
// Region-tagged codes (e.g. 'es-MX', 'en-US') are served only via exact match.
const PREFIX_TO_LOCALE: Partial<Record<string, Locale>> = {
  es: "es-ES",
  en: "en-GB",
}

const NORMALIZED_ACTIVE_LOCALES = activeLocales.map((locale) => locale.toLowerCase())

function findExactActiveMatch(normalizedCandidate: string): Locale | undefined {
  if (!hasLocale(NORMALIZED_ACTIVE_LOCALES, normalizedCandidate)) {
    return undefined
  }
  // hasLocale is case-sensitive, so recover the canonical casing from activeLocales.
  return activeLocales.find((locale) => locale.toLowerCase() === normalizedCandidate)
}

// Pure negotiation: full code match first, then bare language prefix,
// following the priority order of the Accept-Language header.
export function resolveLocaleFromAcceptLanguage(acceptLanguage: string | null | undefined): Locale {
  if (!acceptLanguage) {
    return defaultLocale
  }

  const candidates = acceptLanguage
    .split(",")
    .map((part) => part.split(";")[0]?.trim().toLowerCase())
    .filter((candidate): candidate is string => Boolean(candidate))

  for (const candidate of candidates) {
    const exactMatch = findExactActiveMatch(candidate)
    if (exactMatch) {
      return exactMatch
    }

    const mappedPrefix = PREFIX_TO_LOCALE[candidate]
    if (mappedPrefix) {
      return mappedPrefix
    }
  }

  return defaultLocale
}

export function getLocaleFromRequest(request: Request): Locale {
  return resolveLocaleFromAcceptLanguage(request.headers.get("accept-language"))
}
