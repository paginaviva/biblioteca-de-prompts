"use client"

import { TaxonomyManager } from "@/components/taxonomy/TaxonomyManager"

export default function ClientProjectsTaxonomyPage() {
  return (
    <TaxonomyManager
      apiPath="/api/client-projects"
      entityKey="clientProjects"
      showPromptsCount={true}
      postAcceptsSlugAndSortOrder={false}
    />
  )
}
