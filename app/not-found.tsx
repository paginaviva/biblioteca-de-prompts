import Link from "next/link"
import { Button } from "@/components/ui/button"
import { getTranslations } from "next-intl/server"

export default async function NotFound() {
  const t = await getTranslations("NotFound")

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <h1 className="text-4xl font-bold mb-4">{t("code")}</h1>
      <p className="text-muted-foreground mb-6">{t("message")}</p>
      <Link href="/prompts">
        <Button>{t("goToPrompts")}</Button>
      </Link>
    </div>
  )
}


