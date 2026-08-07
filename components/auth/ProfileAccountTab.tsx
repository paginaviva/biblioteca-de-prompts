"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DataTransferButtons } from "@/components/profile/DataTransferButtons"
import type { UIPreferencesPatch } from "@/lib/ui-preferences"

// Sentinel select value for "auto" (browser detection). Radix Select rejects
// empty-string item values, and PATCH /api/user/preferences only accepts
// null | "en-GB" | "es-ES" for language, so "" is mapped to null on write.
const LANGUAGE_AUTO = "auto"

// Only the two active locales are offered; the account language takes
// priority over browser detection, and null means "auto" (browser).
const ACTIVE_LANGUAGE_OPTIONS = [
  { value: "en-GB", metadataKey: "languageEnglish" },
  { value: "es-ES", metadataKey: "languageSpanish" },
] as const

interface ProfileAccountTabProps {
  initialLanguage: string | null
}

// PATCH /api/user/preferences following the same pattern as UIContext
// (basePath + endpoint). Returns true on success and reports errors via toast.
async function handlePreferencePatch(
  body: { language?: string | null; uiPreferences?: UIPreferencesPatch },
  fallbackError: string
): Promise<boolean> {
  try {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ""
    const response = await fetch(`${basePath}/api/user/preferences`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as {
        error?: string
      } | null
      toast.error(data?.error ?? fallbackError)
      return false
    }
    return true
  } catch (error) {
    console.error("Failed to update preferences:", error)
    toast.error(fallbackError)
    return false
  }
}

export function ProfileAccountTab({ initialLanguage }: ProfileAccountTabProps) {
  const { data: session, update } = useSession()
  const router = useRouter()
  const t = useTranslations("UserProfile")
  const tApi = useTranslations("Api")
  const tMetadata = useTranslations("MetadataSegment")

  const [language, setLanguage] = useState<string>(
    initialLanguage ?? LANGUAGE_AUTO
  )
  const [name, setName] = useState("")
  const [savingName, setSavingName] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmNewPassword, setConfirmNewPassword] = useState("")
  const [changingPassword, setChangingPassword] = useState(false)

  // Keep the name input in sync with the session (initial load and after
  // saveName → useSession().update() refreshes the cached name).
  useEffect(() => {
    if (session?.user?.name) {
      setName(session.user.name)
    }
  }, [session?.user?.name])

  const handleLanguageChange = async (value: string) => {
    const previous = language
    setLanguage(value)
    const languageValue = value === LANGUAGE_AUTO ? null : value

    const ok = await handlePreferencePatch(
      { language: languageValue },
      tApi("failedToUpdatePreferences")
    )
    if (!ok) {
      setLanguage(previous)
      return
    }
    // Refresh the JWT-backed session so the next-intl locale resolution
    // (and any other session consumer) sees the new language immediately.
    await update({ language: languageValue }).catch(() => undefined)
    // Re-render server components so the current page translates instantly.
    router.refresh()
  }

  const handleSaveName = async () => {
    const trimmed = name.trim()
    if (!trimmed || savingName) return
    setSavingName(true)
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ""
      const response = await fetch(`${basePath}/api/user/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      })
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as {
          error?: string
        } | null
        toast.error(data?.error ?? tApi("failedToUpdateName"))
        return
      }
      toast.success(t("nameUpdated"))
      // The JWT caches the name; update() refreshes it without re-login.
      await update({ name: trimmed }).catch(() => undefined)
    } catch (error) {
      console.error("Failed to update name:", error)
      toast.error(tApi("failedToUpdateName"))
    } finally {
      setSavingName(false)
    }
  }

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || changingPassword) return
    // The confirmation field must match the new password before sending.
    if (newPassword !== confirmNewPassword) {
      toast.error(t("passwordMismatch"))
      return
    }
    setChangingPassword(true)
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ""
      const response = await fetch(`${basePath}/api/user/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = (await response.json().catch(() => null)) as {
        error?: string
        data?: { message?: string }
      } | null
      if (!response.ok) {
        toast.error(data?.error ?? tApi("failedToChangePassword"))
        return
      }
      toast.success(data?.data?.message ?? tApi("passwordChanged"))
      setCurrentPassword("")
      setNewPassword("")
      setConfirmNewPassword("")
    } catch (error) {
      console.error("Failed to change password:", error)
      toast.error(tApi("failedToChangePassword"))
    } finally {
      setChangingPassword(false)
    }
  }

  if (!session?.user) {
    return null
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div>
          <span className="text-sm font-medium">{t("name")}</span>
          <span className="ml-2 text-sm">{session.user.name}</span>
        </div>
        <div>
          <span className="text-sm font-medium">{t("email")}</span>
          <span className="ml-2 text-sm">{session.user.email}</span>
        </div>
        <div>
          <span className="text-sm font-medium">{t("role")}</span>
          <span className="ml-2 text-sm capitalize">{session.user.role}</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="language-select">{t("languageLabel")}</Label>
        <Select value={language} onValueChange={handleLanguageChange}>
          <SelectTrigger
            id="language-select"
            className="w-full sm:w-64"
            aria-label={t("languageLabel")}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={LANGUAGE_AUTO}>{t("autoLanguage")}</SelectItem>
            {ACTIVE_LANGUAGE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {tMetadata(option.metadataKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">{t("languageNote")}</p>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">{t("changeName")}</h3>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Label htmlFor="profile-name">{t("nameLabel")}</Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
              aria-label={t("nameLabel")}
            />
          </div>
          <Button
            onClick={handleSaveName}
            disabled={
              savingName || !name.trim() || name === (session.user.name ?? "")
            }
          >
            {t("saveName")}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">{t("changePassword")}</h3>
        <div className="space-y-2">
          <div>
            <Label htmlFor="current-password">{t("currentPassword")}</Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="new-password">{t("newPassword")}</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="confirm-new-password">{t("confirmPassword")}</Label>
            <Input
              id="confirm-new-password"
              type="password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              className="mt-1"
            />
          </div>
          <Button
            onClick={handleChangePassword}
            disabled={
              !currentPassword ||
              !newPassword ||
              !confirmNewPassword ||
              changingPassword
            }
          >
            {t("changePasswordButton")}
          </Button>
        </div>
      </div>

      <DataTransferButtons />

      <Button
        onClick={() => signOut({ callbackUrl: "/" })}
        variant="destructive"
      >
        {t("signOut")}
      </Button>
    </div>
  )
}
