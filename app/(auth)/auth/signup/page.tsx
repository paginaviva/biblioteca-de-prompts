import { SignupForm } from "@/components/auth/SignupForm"
import Link from "next/link"
import { getTranslations } from "next-intl/server"

export const dynamic = 'force-dynamic'

export default async function SignUpPage() {
  const t = await getTranslations("Auth")

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">{t("signUpTitle")}</h1>
          <p className="mt-2 text-muted-foreground">
            {t("signUpSubtitle")}
          </p>
        </div>
        <SignupForm />
        <p className="text-center text-sm text-muted-foreground">
          {t("haveAccount")}{" "}
          <Link href="/auth/signin" className="text-blue-600 hover:underline">
            {t("signInLink")}
          </Link>
        </p>
      </div>
    </div>
  )
}
