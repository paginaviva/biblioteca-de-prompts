"use client"

import { useTranslations } from "next-intl"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface AdvancedSegmentProps {
  version: number
  changelog: string
  notes: string
  onVersionChange: (value: number) => void
  onChangelogChange: (value: string) => void
  onNotesChange: (value: string) => void
  errors?: Record<string, string | undefined>
}

export default function AdvancedSegment({
  version,
  changelog,
  notes,
  onVersionChange,
  onChangelogChange,
  onNotesChange,
  errors,
}: AdvancedSegmentProps) {
  const t = useTranslations("AdvancedSegment")

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="version">{t("version")}</Label>
        <Input
          id="version"
          type="number"
          value={version}
          onChange={(e) =>
            onVersionChange(parseInt(e.target.value) || 1)
          }
        />
        {errors?.version && (
          <p className="mt-1 text-sm text-red-500">{errors.version}</p>
        )}
      </div>

      <div>
        <Label htmlFor="changelog">{t("changelog")}</Label>
        <Textarea
          id="changelog"
          value={changelog}
          onChange={(e) => onChangelogChange(e.target.value)}
          rows={3}
        />
        {errors?.changelog && (
          <p className="mt-1 text-sm text-red-500">{errors.changelog}</p>
        )}
      </div>

      <div>
        <Label htmlFor="notes">{t("notes")}</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          rows={4}
        />
        {errors?.notes && (
          <p className="mt-1 text-sm text-red-500">{errors.notes}</p>
        )}
      </div>
    </div>
  )
}
