import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { NextIntlClientProvider } from "next-intl"
import { getLocale, getMessages, getTranslations } from "next-intl/server"
import { SessionProvider } from "@/components/auth/SessionProvider"
import { Toaster } from "sonner"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { parseUIPreferences } from "@/lib/ui-preferences"

const inter = Inter({ subsets: ["latin"] })

export const dynamic = "force-dynamic"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Metadata")

  return {
    title: t("title"),
    description: t("description"),
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = await getLocale()
  const messages = await getMessages()

  // Server-side theme for the first paint: applies "dark" on <html> before
  // hydration to avoid a light flash (FOUC) when reloading in dark mode.
  // The UIContextProvider (client) re-applies the class idempotently.
  // Extra cost: one lightweight PK select per request (the (app) layout does
  // another for the provider) — acceptable.
  const session = await auth()
  let isDark = false
  if (session?.user?.id) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { uiPreferences: true },
      })
      isDark = parseUIPreferences(user?.uiPreferences).theme === "dark"
    } catch {
      // Fail-open: si la BD falla, primer render en claro (el cliente corregirá)
    }
  }

  return (
    <html lang={locale} className={isDark ? "dark" : undefined}>
      <body className={inter.className}>
        {/* v4 hereda locale/messages; se pasan explícitos por claridad */}
        <NextIntlClientProvider locale={locale} messages={messages}>
          <SessionProvider>{children}</SessionProvider>
        </NextIntlClientProvider>
        <Toaster />
      </body>
    </html>
  )
}
