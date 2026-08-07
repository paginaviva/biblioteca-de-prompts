"use client"

import { TaxonomyManager } from "@/components/taxonomy/TaxonomyManager"

export default function StatusTaxonomyPage() {
  return (
    <TaxonomyManager
      apiPath="/api/statuses"
      entityKey="status"
      showPromptsCount={false}
      postAcceptsSlugAndSortOrder={true}
    />
  )
}
