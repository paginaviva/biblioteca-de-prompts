"use client"

import { TaxonomyManager } from "@/components/taxonomy/TaxonomyManager"

export default function ModelHintsTaxonomyPage() {
  return (
    <TaxonomyManager
      apiPath="/api/model-hints"
      entityKey="modelHints"
      showPromptsCount={true}
      postAcceptsSlugAndSortOrder={false}
    />
  )
}
