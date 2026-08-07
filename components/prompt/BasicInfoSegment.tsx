"use client"

import { useTranslations } from "next-intl"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface BasicInfoSegmentProps {
  title: string
  description: string
  body: string
  onTitleChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onBodyChange: (value: string) => void
  errors?: Record<string, string | undefined>
}

export default function BasicInfoSegment({
  title,
  description,
  body,
  onTitleChange,
  onDescriptionChange,
  onBodyChange,
  errors,
}: BasicInfoSegmentProps) {
  const t = useTranslations("BasicInfoSegment")

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="title">{t("titleLabel")}</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          required
        />
        {errors?.title && (
          <p className="mt-1 text-sm text-red-500">{errors.title}</p>
        )}
      </div>

      <div>
        <Label htmlFor="description">{t("descriptionLabel")}</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          rows={3}
        />
        {errors?.description && (
          <p className="mt-1 text-sm text-red-500">{errors.description}</p>
        )}
      </div>

      <div>
        <Label htmlFor="body">{t("bodyLabel")}</Label>
        <Textarea
          id="body"
          value={body}
          onChange={(e) => onBodyChange(e.target.value)}
          rows={10}
          required
          className="font-mono text-sm"
        />
        {errors?.body && (
          <p className="mt-1 text-sm text-red-500">{errors.body}</p>
        )}
      </div>
    </div>
  )
}
