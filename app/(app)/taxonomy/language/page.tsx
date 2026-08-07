"use client"

import { TaxonomyManager } from "@/components/taxonomy/TaxonomyManager"

export default function LanguageTaxonomyPage() {
  return (
    <TaxonomyManager
      apiPath="/api/languages"
      entityKey="language"
      showPromptsCount={false}
      postAcceptsSlugAndSortOrder={true}
    />
  )
}
