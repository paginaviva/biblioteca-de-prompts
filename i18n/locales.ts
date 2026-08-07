// All locales the app is designed for (declared, not necessarily translated yet).
export const locales = [
  "en-GB",
  "es-ES",
  "es-MX",
  "ca",
  "ca-ES-valencia",
  "gl",
  "pt-PT",
  "fr",
  "ru",
  "zh-CN",
] as const

export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = "en-GB"

// Locales with messages available right now. Locales declared but not
// listed here are never served until their translations exist.
export const activeLocales: readonly Locale[] = ["en-GB", "es-ES"] as const
