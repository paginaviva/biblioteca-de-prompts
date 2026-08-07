"use client"

import { TaxonomyManager } from "@/components/taxonomy/TaxonomyManager"

export default function PlatformsTaxonomyPage() {
  return (
    <TaxonomyManager
      apiPath="/api/platforms"
      entityKey="platforms"
      showPromptsCount={true}
      postAcceptsSlugAndSortOrder={false}
    />
  )
}
