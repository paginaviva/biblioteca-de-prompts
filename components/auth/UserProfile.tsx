"use client"

import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProfileAccountTab } from "@/components/auth/ProfileAccountTab"
import { ProfileDashboardTab } from "@/components/auth/ProfileDashboardTab"
import { ProfileUsersTab } from "@/components/auth/ProfileUsersTab"
import type { UIPreferences } from "@/lib/ui-preferences"

interface UserProfileProps {
  initialLanguage: string | null
  initialPreferences: UIPreferences
}

export function UserProfile({
  initialLanguage,
  initialPreferences,
}: UserProfileProps) {
  const { data: session, status } = useSession()
  const t = useTranslations("UserProfile")
  const tCommon = useTranslations("Common")

  if (status === "loading") {
    return <div>{tCommon("loading")}</div>
  }

  if (!session?.user) {
    return null
  }

  // The user management tab is restricted to administrators; the API
  // enforces the same rule, this only controls what the UI renders.
  const isAdmin = session.user.role === "admin"

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>
      <Tabs defaultValue="account">
        <TabsList>
          <TabsTrigger value="account">{t("accountTab")}</TabsTrigger>
          <TabsTrigger value="dashboard">{t("dashboardTab")}</TabsTrigger>
          {isAdmin && <TabsTrigger value="users">{t("usersTab")}</TabsTrigger>}
        </TabsList>
        <TabsContent value="account">
          <ProfileAccountTab initialLanguage={initialLanguage} />
        </TabsContent>
        <TabsContent value="dashboard">
          <ProfileDashboardTab />
        </TabsContent>
        {isAdmin && (
          <TabsContent value="users">
            <ProfileUsersTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
