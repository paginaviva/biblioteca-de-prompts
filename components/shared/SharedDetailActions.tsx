"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Copy } from "lucide-react"
import { Button } from "@/components/ui/button"

interface SharedDetailActionsProps {
  promptId: string
  body: string
}

// Read-only actions for the shared detail page: copying the prompt body to
// the clipboard also increments the usage counter (the usage API already
// accepts prompts shared by other users).
export function SharedDetailActions({ promptId, body }: SharedDetailActionsProps) {
  const t = useTranslations("Common")
  const tForm = useTranslations("PromptForm")
  const [isCopying, setIsCopying] = useState(false)

  const handleCopy = async () => {
    setIsCopying(true)
    try {
      await navigator.clipboard.writeText(body)
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
      const response = await fetch(`${basePath}/api/prompts/${promptId}/usage`, { method: "PATCH" })
      if (!response.ok) {
        console.warn("Usage counter not updated for shared prompt:", response.status)
      }
      toast.success(tForm("copiedToClipboard"))
    } catch (error) {
      console.error("Failed to copy:", error)
      toast.error(tForm("copyFailed"))
    } finally {
      setIsCopying(false)
    }
  }

  return (
    <Button
      variant="outline"
      onClick={handleCopy}
      disabled={isCopying}
      className="border-accent hover:bg-accent-soft hover:border-accent hover:text-accent-strong transition-all"
    >
      <Copy className="mr-2 h-4 w-4" />
      {isCopying ? t("loading") : t("copy")}
    </Button>
  )
}
