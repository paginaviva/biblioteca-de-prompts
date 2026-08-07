import { notFound, redirect } from "next/navigation"
import { getTranslations } from "next-intl/server"
import { prisma, PROMPT_INCLUDES } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SharedDetailActions } from "@/components/shared/SharedDetailActions"

export const dynamic = "force-dynamic"

// Maps prompt.type values to MetadataSegment translation keys so badges show
// "User/System/Tool" instead of the raw enum (same as PromptList).
const TYPE_LABEL_KEYS: Record<string, string> = {
  USER: "user",
  SYSTEM: "system",
  TOOL: "tool",
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    PRODUCTION: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    TESTED: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    DRAFT: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  }
  return colors[status] || "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20"
}

export default async function SharedPromptDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/auth/signin")
  }

  // Read-only detail: only prompts shared by OTHER users are visible here.
  // Own prompts are hidden (404) and unshared/unknown prompts return 404
  // (no existence oracle).
  const prompt = await prisma.prompt.findUnique({
    where: { id: params.id, isShared: true },
    include: PROMPT_INCLUDES,
  })

  if (!prompt || prompt.userId === session.user.id) {
    notFound()
  }

  const tForm = await getTranslations("PromptForm")
  const tAdvanced = await getTranslations("AdvancedSegment")
  const tMetadata = await getTranslations("MetadataSegment")
  const tSidebar = await getTranslations("Sidebar")

  const typeLabelKey = TYPE_LABEL_KEYS[prompt.type]

  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[var(--accent-color)] to-pink-500 bg-clip-text text-transparent">
            {prompt.title}
          </h1>
          {prompt.description && (
            <p className="mt-2 text-muted-foreground">{prompt.description}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="outline" className="text-xs bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20">
              {typeLabelKey ? tMetadata(typeLabelKey) : prompt.type}
            </Badge>
            <Badge
              variant="outline"
              className={`${getStatusColor(prompt.status)} font-medium border`}
            >
              {prompt.status}
            </Badge>
            {prompt.language && (
              <Badge
                variant="outline"
                className="text-xs bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20"
              >
                {prompt.language}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex-shrink-0">
          <SharedDetailActions promptId={prompt.id} body={prompt.body} />
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{tForm("basicInformation")}</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
            {prompt.body}
          </pre>
        </CardContent>
      </Card>

      {prompt.prePrompt && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{tForm("prePrompt")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {prompt.prePrompt}
            </p>
          </CardContent>
        </Card>
      )}

      {prompt.manualDeUso && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{tForm("manualDeUso")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {prompt.manualDeUso}
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{tForm("metadata")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-28 flex-shrink-0 font-medium text-muted-foreground">
              {tAdvanced("version")}
            </span>
            <span className="text-foreground">{prompt.version}</span>
          </div>
          {prompt.changelog && (
            <div className="flex items-start gap-2">
              <span className="w-28 flex-shrink-0 font-medium text-muted-foreground">
                {tAdvanced("changelog")}
              </span>
              <span className="whitespace-pre-wrap text-foreground">{prompt.changelog}</span>
            </div>
          )}
          {prompt.notes && (
            <div className="flex items-start gap-2">
              <span className="w-28 flex-shrink-0 font-medium text-muted-foreground">
                {tAdvanced("notes")}
              </span>
              <span className="whitespace-pre-wrap text-foreground">{prompt.notes}</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{tSidebar("taxonomy")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {prompt.categories.length > 0 && (
            <div className="flex items-start gap-2">
              <span className="w-32 flex-shrink-0 pt-0.5 text-sm font-medium text-muted-foreground">
                {tForm("categories")}
              </span>
              <div className="flex flex-wrap gap-1">
                {prompt.categories.map((pc) => (
                  <Badge
                    key={pc.category.name}
                    variant="secondary"
                    className="bg-accent-soft text-accent-strong border-accent text-xs"
                  >
                    {pc.category.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {prompt.tags.length > 0 && (
            <div className="flex items-start gap-2">
              <span className="w-32 flex-shrink-0 pt-0.5 text-sm font-medium text-muted-foreground">
                {tForm("tags")}
              </span>
              <div className="flex flex-wrap gap-1">
                {prompt.tags.map((pt) => (
                  <Badge
                    key={pt.tag.name}
                    variant="outline"
                    className="text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                  >
                    {pt.tag.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {prompt.platforms.length > 0 && (
            <div className="flex items-start gap-2">
              <span className="w-32 flex-shrink-0 pt-0.5 text-sm font-medium text-muted-foreground">
                {tForm("platforms")}
              </span>
              <div className="flex flex-wrap gap-1">
                {prompt.platforms.map((pp) => (
                  <Badge
                    key={pp.platform.name}
                    variant="outline"
                    className="text-xs bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"
                  >
                    {pp.platform.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {prompt.clientProjects.length > 0 && (
            <div className="flex items-start gap-2">
              <span className="w-32 flex-shrink-0 pt-0.5 text-sm font-medium text-muted-foreground">
                {tForm("clientProject")}
              </span>
              <div className="flex flex-wrap gap-1">
                {prompt.clientProjects.map((cp) => (
                  <Badge
                    key={cp.clientProject.name}
                    variant="outline"
                    className="bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20 text-xs"
                  >
                    {cp.clientProject.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {prompt.useCases.length > 0 && (
            <div className="flex items-start gap-2">
              <span className="w-32 flex-shrink-0 pt-0.5 text-sm font-medium text-muted-foreground">
                {tForm("useCases")}
              </span>
              <div className="flex flex-wrap gap-1">
                {prompt.useCases.map((pu) => (
                  <Badge
                    key={pu.useCase.name}
                    variant="outline"
                    className="text-xs bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                  >
                    {pu.useCase.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {prompt.modelHints.length > 0 && (
            <div className="flex items-start gap-2">
              <span className="w-32 flex-shrink-0 pt-0.5 text-sm font-medium text-muted-foreground">
                {tForm("modelHints")}
              </span>
              <div className="flex flex-wrap gap-1">
                {prompt.modelHints.map((pm) => (
                  <Badge
                    key={pm.modelHint.name}
                    variant="outline"
                    className="text-xs bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20"
                  >
                    {pm.modelHint.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </article>
  )
}
