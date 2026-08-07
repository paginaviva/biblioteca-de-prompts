import Link from "next/link"
import { getTranslations } from "next-intl/server"

export const dynamic = 'force-dynamic'

// NextAuth redirects here on authentication failures (lib/auth.ts pages.error
// and middleware.ts treat it as a public route). The `error` query param
// carries the failure code; we show a generic message regardless to avoid
// leaking details (the sign-in form reports specific errors on its own).
export default async function AuthErrorPage() {
  const t = await getTranslations("Auth")

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-8 p-8 text-center">
        <div className="text-3xl font-bold">⚠️</div>
        <h1 className="text-3xl font-bold">{t("errorTitle")}</h1>
        <p className="mt-2 text-muted-foreground">{t("errorSubtitle")}</p>
        <p className="text-sm text-muted-foreground">{t("errorGeneric")}</p>
        <div className="flex flex-col items-center gap-3 pt-2">
          <Link
            href="/auth/signin"
            className="inline-flex h-10 items-center justify-center rounded-md bg-purple-600 px-6 text-sm font-medium text-white transition-colors hover:bg-purple-700"
          >
            {t("backToSignIn")}
          </Link>
          <Link href="/auth/signin" className="text-sm text-blue-600 hover:underline">
            {t("tryAgain")}
          </Link>
        </div>
      </div>
    </div>
  )
}
