"use client"

import { TaxonomyManager } from "@/components/taxonomy/TaxonomyManager"

export default function TypeTaxonomyPage() {
  return (
    <TaxonomyManager
      apiPath="/api/types"
      entityKey="type"
      showPromptsCount={false}
      postAcceptsSlugAndSortOrder={true}
    />
  )
}
