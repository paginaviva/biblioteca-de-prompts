import { headers } from "next/headers"
import { getRequestConfig } from "next-intl/server"
import { auth } from "@/lib/auth"
import { resolveLocaleFromAcceptLanguage } from "../lib/locale"
import { activeLocales } from "./locales"

export default getRequestConfig(async () => {
  const headersStore = await headers()
  const acceptLanguage = headersStore.get("accept-language")

  // Account language takes priority over browser negotiation for signed-in users.
  let locale: string = resolveLocaleFromAcceptLanguage(acceptLanguage)
  try {
    const session = await auth()
    const userLanguage = session?.user?.language
    if (
      userLanguage &&
      activeLocales.includes(userLanguage as (typeof activeLocales)[number])
    ) {
      locale = userLanguage
    }
  } catch {
    // auth() can throw outside a request context (e.g. static generation/build).
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  }
})
