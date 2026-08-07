"use client"

import { TaxonomyManager } from "@/components/taxonomy/TaxonomyManager"

export default function UseCasesTaxonomyPage() {
  return (
    <TaxonomyManager
      apiPath="/api/use-cases"
      entityKey="useCases"
      showPromptsCount={true}
      postAcceptsSlugAndSortOrder={false}
    />
  )
}
