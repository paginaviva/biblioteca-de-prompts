"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

// Errors currently returned by /api/auth/register. Subtasks 10/11 will
// translate them server-side; until then this map shows localized messages.
// Unknown responses fall through unchanged (they will already be translated).
const REGISTER_ERROR_TO_API_KEY: Record<string, string> = {
  "Name must be at least 2 characters": "nameTooShort",
  "Invalid email address": "invalidEmail",
  "Password must be at least 6 characters": "passwordTooShort",
  "User with this email already exists": "emailAlreadyExists",
  "Internal server error": "internalServerError",
}

export function SignupForm() {
  const router = useRouter()
  const t = useTranslations("SignupForm")
  const tApi = useTranslations("Api")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const response = await fetch(`/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        const apiKey = REGISTER_ERROR_TO_API_KEY[data.error ?? ""]
        setError(apiKey ? tApi(apiKey) : data.error || t("registrationFailed"))
      } else {
        router.push("/auth/signin?registered=true")
      }
    } catch (error) {
      setError(t("genericError"))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">{t("name")}</Label>
        <Input
          id="name"
          type="text"
          placeholder={t("namePlaceholder")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          disabled={isLoading}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">{t("email")}</Label>
        <Input
          id="email"
          type="email"
          placeholder={t("emailPlaceholder")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isLoading}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">{t("password")}</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={isLoading}
        />
      </div>
      {error && (
        <div className="text-sm text-red-500">{error}</div>
      )}
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? t("creatingAccount") : t("signUp")}
      </Button>
    </form>
  )
}
