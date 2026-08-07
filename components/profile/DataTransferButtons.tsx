"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Download, Upload } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export function DataTransferButtons() {
  const router = useRouter()
  const t = useTranslations("Topbar")
  const [importOpen, setImportOpen] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)

  const handleExport = async () => {
    if (busy) return
    setBusy(true)
    try {
      const response = await fetch(`/api/export/prompts`)
      if (!response.ok) throw new Error(`Export failed: ${response.status}`)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `prompts-export-${new Date().toISOString().split("T")[0]}.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Export failed:", error)
      toast.error(t("exportFailed"))
    } finally {
      setBusy(false)
    }
  }

  const handleImport = async () => {
    if (!importFile || busy) return
    setBusy(true)

    try {
      const text = await importFile.text()
      const data = JSON.parse(text)

      const response = await fetch(`/api/import/prompts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        toast.success(t("importSuccess"))
        setImportOpen(false)
        setImportFile(null)
        router.refresh()
      } else {
        const error = (await response.json()) as { error?: string }
        toast.error(t("importFailed", { message: error.error ?? t("importFailedFallback") }))
      }
    } catch (error) {
      console.error("Import failed:", error)
      toast.error(t("importFailedFallback"))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        onClick={handleExport}
        disabled={busy}
        className="border-accent hover:bg-accent-soft hover:border-accent"
      >
        <Download className="mr-2 h-4 w-4" />
        {t("export")}
      </Button>

      <Dialog
        open={importOpen}
        onOpenChange={(open) => {
          setImportOpen(open)
          if (!open) setImportFile(null)
        }}
      >
        <DialogTrigger asChild>
          <Button variant="outline" className="border-accent hover:bg-accent-soft hover:border-accent">
            <Upload className="mr-2 h-4 w-4" />
            {t("import")}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("importTitle")}</DialogTitle>
            <DialogDescription>
              {t("importDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              type="file"
              accept=".json"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) setImportFile(file)
              }}
            />
            <Button onClick={handleImport} disabled={!importFile || busy}>
              {t("import")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
