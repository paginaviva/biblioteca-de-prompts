import { LoginForm } from "@/components/auth/LoginForm"
import Link from "next/link"
import { getTranslations } from "next-intl/server"

export const dynamic = 'force-dynamic'

export default async function SignInPage() {
  const t = await getTranslations("Auth")

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">{t("signInTitle")}</h1>
          <p className="mt-2 text-muted-foreground">
            {t("signInSubtitle")}
          </p>
        </div>
        <LoginForm />
        <p className="text-center text-sm text-muted-foreground">
          {t("noAccount")}{" "}
          <Link href="/auth/signup" className="text-blue-600 hover:underline">
            {t("signUpLink")}
          </Link>
        </p>
      </div>
    </div>
  )
}
