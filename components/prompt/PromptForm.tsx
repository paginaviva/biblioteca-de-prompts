"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useTranslations, useFormatter } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Copy, Plus } from "lucide-react"
import { toast } from "sonner"
import BasicInfoSegment from "./BasicInfoSegment"
import MetadataSegment, { type CatalogOption } from "./MetadataSegment"
import AdvancedSegment from "./AdvancedSegment"
import TaxonomyMultiSelect from "./TaxonomyMultiSelect"

interface Category {
  id: string
  name: string
  slug: string
  parentId: string | null
}

interface Tag {
  id: string
  name: string
  slug?: string
}

interface Platform {
  id: string
  name: string
  slug: string
}

interface ClientProject {
  id: string
  name: string
  slug: string
}

interface UseCase {
  id: string
  name: string
  slug: string
}

interface ModelHint {
  id: string
  name: string
  slug: string
}

interface PromptFormProps {
  prompt?: {
    id: string
    title: string
    description: string | null
    body: string
    type: string
    platform: string | null
    modelHint: string | null
    language: string
    useCase: string | null
    clientOrProject: string | null
    status: string
    isFavorite: boolean
    isShared: boolean
    version: number
    changelog: string | null
    notes: string | null
    prePrompt: string | null
    manualDeUso: string | null
    createdAt: string
    updatedAt: string
    categories: { category: { id: string; name: string } }[]
    tags: { tag: { id: string; name: string } }[]
    platforms: { platform: { id: string; name: string } }[]
    clientProjects: { clientProject: { id: string; name: string } }[]
    useCases: { useCase: { id: string; name: string } }[]
    modelHints: { modelHint: { id: string; name: string } }[]
  }
  categories: Category[]
  tags: Tag[]
  platforms: Platform[]
  clientProjects: ClientProject[]
  useCases: UseCase[]
  modelHints: ModelHint[]
  optionsType?: CatalogOption[]
  optionsStatus?: CatalogOption[]
  optionsLanguage?: CatalogOption[]
}

export function PromptForm({ prompt, categories, tags, platforms, clientProjects, useCases, modelHints, optionsType, optionsStatus, optionsLanguage }: PromptFormProps) {
  useSession()
  const router = useRouter()
  const t = useTranslations("PromptForm")
  const tCommon = useTranslations("Common")
  const format = useFormatter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<{
    title: string
    description: string
    body: string
    type: string
    language: string
    status: string
    isFavorite: boolean
    isShared: boolean
    version: number
    changelog: string
    notes: string
    prePrompt: string
    manualDeUso: string
    categoryIds: string[]
    platformIds: string[]
    tagIds: string[]
    clientProjectIds: string[]
    useCaseIds: string[]
    modelHintIds: string[]
  }>({
    title: prompt?.title || "",
    description: prompt?.description || "",
    body: prompt?.body || "",
    type: prompt?.type || "USER",
    language: prompt?.language || "es",
    status: prompt?.status || "DRAFT",
    isFavorite: prompt?.isFavorite || false,
    isShared: prompt?.isShared || false,
    version: prompt?.version || 1,
    changelog: prompt?.changelog || "",
    notes: prompt?.notes || "",
    prePrompt: prompt?.prePrompt || "",
    manualDeUso: prompt?.manualDeUso || "",
    categoryIds: prompt?.categories?.map((c) => c.category.id) || [],
    platformIds: prompt?.platforms?.map((p) => p.platform.id) || [],
    tagIds: prompt?.tags.map((t) => t.tag.id) || [],
    clientProjectIds: prompt?.clientProjects?.map((cp) => cp.clientProject.id) || [],
    useCaseIds: prompt?.useCases?.map((uc) => uc.useCase.id) || [],
    modelHintIds: prompt?.modelHints?.map((mh) => mh.modelHint.id) || [],
  })

  const [selectedTags, setSelectedTags] = useState<Tag[]>(
    prompt?.tags.map((t) => t.tag as Tag) || []
  )

  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(
    prompt?.platforms?.map((p) => p.platform as Platform) || []
  )

  const [selectedCategories, setSelectedCategories] = useState<Category[]>(
    prompt?.categories?.map((c) => c.category as Category) || []
  )

  const [selectedClientProjects, setSelectedClientProjects] = useState<ClientProject[]>(
    prompt?.clientProjects?.map((cp) => cp.clientProject as ClientProject) || []
  )

  const [selectedUseCases, setSelectedUseCases] = useState<UseCase[]>(
    prompt?.useCases?.map((uc) => uc.useCase as UseCase) || []
  )

  const [selectedModelHints, setSelectedModelHints] = useState<ModelHint[]>(
    prompt?.modelHints?.map((mh) => mh.modelHint as ModelHint) || []
  )

  const [newPlatformName, setNewPlatformName] = useState("")
  const [creatingPlatform, setCreatingPlatform] = useState(false)

  const [newClientProjectName, setNewClientProjectName] = useState("")
  const [creatingClientProject, setCreatingClientProject] = useState(false)

  const [newUseCaseName, setNewUseCaseName] = useState("")
  const [creatingUseCase, setCreatingUseCase] = useState(false)

  const [newModelHintName, setNewModelHintName] = useState("")
  const [creatingModelHint, setCreatingModelHint] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const payload = {
        ...formData,
        platformIds: selectedPlatforms.map((p) => p.id),
        categoryIds: selectedCategories.map((c) => c.id),
        tagIds: selectedTags.map((t) => t.id),
        clientProjectIds: selectedClientProjects.map((cp) => cp.id),
        useCaseIds: selectedUseCases.map((uc) => uc.id),
        modelHintIds: selectedModelHints.map((mh) => mh.id),
      }

      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
      const url = prompt ? `${basePath}/api/prompts/${prompt.id}` : `${basePath}/api/prompts`
      const method = prompt ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        const result = await response.json()
        if (!prompt && result.data?.id) {
          router.push(`/prompts/${result.data.id}`)
        } else {
          router.refresh()
        }
      } else {
        const error = await response.json()
        toast.error(tCommon("errorToast", { message: error.error }))
      }
    } catch (error) {
      console.error("Error saving prompt:", error)
      toast.error(t("saveFailed"))
    } finally {
      setLoading(false)
    }
  }

  const handleDuplicate = async () => {
    if (!prompt) return

    setLoading(true)
    try {
      const payload = {
        ...formData,
        title: t("duplicateTitle", { title: formData.title }),
        version: 1,
        changelog: t("duplicatedFromVersion", { version: prompt.version }),
        platformIds: selectedPlatforms.map((p) => p.id),
        categoryIds: selectedCategories.map((c) => c.id),
        tagIds: selectedTags.map((t) => t.id),
        clientProjectIds: selectedClientProjects.map((cp) => cp.id),
        useCaseIds: selectedUseCases.map((uc) => uc.id),
        modelHintIds: selectedModelHints.map((mh) => mh.id),
      }

      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
      const response = await fetch(`${basePath}/api/prompts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        const result = await response.json()
        if (result.data?.id) {
          router.push(`/prompts/${result.data.id}`)
        } else {
          router.push("/prompts")
        }
      } else {
        const error = await response.json()
        toast.error(tCommon("errorToast", { message: error.error }))
      }
    } catch (error) {
      console.error("Error duplicating prompt:", error)
      toast.error(t("duplicateFailed"))
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formData.body)
      if (prompt) {
        const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
        await fetch(`${basePath}/api/prompts/${prompt.id}/usage`, { method: "PATCH" })
      }
      toast.success(t("copiedToClipboard"))
    } catch (error) {
      console.error("Failed to copy:", error)
      toast.error(t("copyFailed"))
    }
  }

  const handleDelete = async () => {
    if (!prompt) return
    if (!confirm(t("deleteConfirm"))) return

    setLoading(true)
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
      const response = await fetch(`${basePath}/api/prompts/${prompt.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        router.push("/prompts")
        router.refresh()
      } else {
        const error = await response.json()
        toast.error(tCommon("errorToast", { message: error.error }))
      }
    } catch (error) {
      console.error("Error deleting prompt:", error)
      toast.error(t("deleteFailed"))
    } finally {
      setLoading(false)
    }
  }

  const toggleTag = (tag: Tag) => {
    if (selectedTags.find((t) => t.id === tag.id)) {
      setSelectedTags(selectedTags.filter((t) => t.id !== tag.id))
    } else {
      setSelectedTags([...selectedTags, tag])
    }
  }

  const togglePlatform = (platform: Platform) => {
    if (selectedPlatforms.find((p) => p.id === platform.id)) {
      setSelectedPlatforms(selectedPlatforms.filter((p) => p.id !== platform.id))
    } else {
      setSelectedPlatforms([...selectedPlatforms, platform])
    }
  }

  const toggleCategory = (category: Category) => {
    if (selectedCategories.find((c) => c.id === category.id)) {
      setSelectedCategories(selectedCategories.filter((c) => c.id !== category.id))
    } else {
      setSelectedCategories([...selectedCategories, category])
    }
  }

  const toggleClientProject = (clientProject: ClientProject) => {
    if (selectedClientProjects.find((cp) => cp.id === clientProject.id)) {
      setSelectedClientProjects(selectedClientProjects.filter((cp) => cp.id !== clientProject.id))
    } else {
      setSelectedClientProjects([...selectedClientProjects, clientProject])
    }
  }

  const toggleUseCase = (useCase: UseCase) => {
    if (selectedUseCases.find((uc) => uc.id === useCase.id)) {
      setSelectedUseCases(selectedUseCases.filter((uc) => uc.id !== useCase.id))
    } else {
      setSelectedUseCases([...selectedUseCases, useCase])
    }
  }

  const toggleModelHint = (modelHint: ModelHint) => {
    if (selectedModelHints.find((mh) => mh.id === modelHint.id)) {
      setSelectedModelHints(selectedModelHints.filter((mh) => mh.id !== modelHint.id))
    } else {
      setSelectedModelHints([...selectedModelHints, modelHint])
    }
  }

  const handleCreatePlatform = async () => {
    if (!newPlatformName.trim()) return

    setCreatingPlatform(true)
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
      const response = await fetch(`${basePath}/api/platforms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newPlatformName }),
      })

      if (response.ok) {
        const result = await response.json()
        const newPlatform: Platform = result.data
        setSelectedPlatforms([...selectedPlatforms, newPlatform])
        setNewPlatformName("")
      } else {
        const error = await response.json()
        toast.error(tCommon("errorToast", { message: error.error }))
      }
    } catch (error) {
      console.error("Error creating platform:", error)
      toast.error(t("createPlatformFailed"))
    } finally {
      setCreatingPlatform(false)
    }
  }

  const handlePlatformKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleCreatePlatform()
    }
  }

  const handleCreateClientProject = async () => {
    if (!newClientProjectName.trim()) return

    setCreatingClientProject(true)
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
      const response = await fetch(`${basePath}/api/client-projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newClientProjectName }),
      })

      if (response.ok) {
        const result = await response.json()
        const newClientProject: ClientProject = result.data
        setSelectedClientProjects([...selectedClientProjects, newClientProject])
        setNewClientProjectName("")
      } else {
        const error = await response.json()
        toast.error(tCommon("errorToast", { message: error.error }))
      }
    } catch (error) {
      console.error("Error creating client-project:", error)
      toast.error(t("createClientProjectFailed"))
    } finally {
      setCreatingClientProject(false)
    }
  }

  const handleClientProjectKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleCreateClientProject()
    }
  }

  const handleCreateUseCase = async () => {
    if (!newUseCaseName.trim()) return

    setCreatingUseCase(true)
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
      const response = await fetch(`${basePath}/api/use-cases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newUseCaseName }),
      })

      if (response.ok) {
        const result = await response.json()
        const newUseCase: UseCase = result.data
        setSelectedUseCases([...selectedUseCases, newUseCase])
        setNewUseCaseName("")
      } else {
        const error = await response.json()
        toast.error(tCommon("errorToast", { message: error.error }))
      }
    } catch (error) {
      console.error("Error creating use-case:", error)
      toast.error(t("createUseCaseFailed"))
    } finally {
      setCreatingUseCase(false)
    }
  }

  const handleUseCaseKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleCreateUseCase()
    }
  }

  const handleCreateModelHint = async () => {
    if (!newModelHintName.trim()) return

    setCreatingModelHint(true)
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
      const response = await fetch(`${basePath}/api/model-hints`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newModelHintName }),
      })

      if (response.ok) {
        const result = await response.json()
        const newModelHint: ModelHint = result.data
        setSelectedModelHints([...selectedModelHints, newModelHint])
        setNewModelHintName("")
      } else {
        const error = await response.json()
        toast.error(tCommon("errorToast", { message: error.error }))
      }
    } catch (error) {
      console.error("Error creating model-hint:", error)
      toast.error(t("createModelHintFailed"))
    } finally {
      setCreatingModelHint(false)
    }
  }

  const handleModelHintKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleCreateModelHint()
    }
  }

  const handleCategoryChange = (id: string) => {
    const item = categories.find((c) => c.id === id)
    if (item) toggleCategory(item)
  }

  const handleTagChange = (id: string) => {
    const item = tags.find((t) => t.id === id)
    if (item) toggleTag(item)
  }

  const handleUseCaseChange = (id: string) => {
    const item = useCases.find((uc) => uc.id === id)
    if (item) toggleUseCase(item)
  }

  const handleClientProjectChange = (id: string) => {
    const item = clientProjects.find((cp) => cp.id === id)
    if (item) toggleClientProject(item)
  }

  const handlePlatformSelectChange = (id: string) => {
    const item = platforms.find((p) => p.id === id)
    if (item) togglePlatform(item)
  }

  const handleModelHintChange = (id: string) => {
    const item = modelHints.find((mh) => mh.id === id)
    if (item) toggleModelHint(item)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">
          {prompt ? t("titleEdit") : t("titleNew")}
        </h1>
        <div className="flex gap-2">
          {prompt && (
            <>
              <Button type="button" variant="outline" onClick={handleCopy}>
                <Copy className="mr-2 h-4 w-4" />
                {t("copyPrompt")}
              </Button>
              <Button type="button" variant="outline" onClick={handleDuplicate}>
                {tCommon("duplicate")}
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
              >
                {tCommon("delete")}
              </Button>
            </>
          )}
          <Button type="submit" disabled={loading}>
            {loading ? tCommon("saving") : tCommon("save")}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("basicInformation")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <BasicInfoSegment
              title={formData.title}
              description={formData.description}
              body={formData.body}
              onTitleChange={(v) => setFormData({ ...formData, title: v })}
              onDescriptionChange={(v) => setFormData({ ...formData, description: v })}
              onBodyChange={(v) => setFormData({ ...formData, body: v })}
            />

            <div>
              <Label htmlFor="prePrompt">{t("prePrompt")}</Label>
              <Textarea
                id="prePrompt"
                value={formData.prePrompt}
                onChange={(e) =>
                  setFormData({ ...formData, prePrompt: e.target.value })
                }
                rows={6}
                className="font-mono text-sm"
                placeholder={t("prePromptPlaceholder")}
              />
            </div>

            <div>
              <Label htmlFor="manualDeUso">{t("manualDeUso")}</Label>
              <Textarea
                id="manualDeUso"
                value={formData.manualDeUso}
                onChange={(e) =>
                  setFormData({ ...formData, manualDeUso: e.target.value })
                }
                rows={6}
                className="font-mono text-sm"
                placeholder={t("manualDeUsoPlaceholder")}
              />
            </div>

            {prompt && (
              <>
                <div>
                  <Label>{t("createdAt")}</Label>
                  <Input
                    value={format.dateTime(new Date(prompt.createdAt), {
                      day: "numeric",
                      month: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "numeric",
                      second: "numeric",
                    })}
                    readOnly
                    disabled
                  />
                </div>

                <div>
                  <Label>{t("updatedAt")}</Label>
                  <Input
                    value={format.dateTime(new Date(prompt.updatedAt), {
                      day: "numeric",
                      month: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "numeric",
                      second: "numeric",
                    })}
                    readOnly
                    disabled
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("metadata")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <MetadataSegment
              type={formData.type}
              status={formData.status}
              language={formData.language}
              isFavorite={formData.isFavorite}
              isShared={formData.isShared}
              onTypeChange={(v) => setFormData({ ...formData, type: v })}
              onStatusChange={(v) => setFormData({ ...formData, status: v })}
              onLanguageChange={(v) => setFormData({ ...formData, language: v })}
              onFavoriteChange={(v) => setFormData({ ...formData, isFavorite: v })}
              onSharedChange={(v) => setFormData({ ...formData, isShared: v })}
              optionsType={optionsType}
              optionsStatus={optionsStatus}
              optionsLanguage={optionsLanguage}
            />

            <TaxonomyMultiSelect
              label={t("categories")}
              items={categories}
              selectedIds={selectedCategories.map((c) => c.id)}
              onChange={handleCategoryChange}
            />

            <TaxonomyMultiSelect
              label={t("tags")}
              items={tags}
              selectedIds={selectedTags.map((t) => t.id)}
              onChange={handleTagChange}
            />

            <TaxonomyMultiSelect
              label={t("useCases")}
              items={useCases}
              selectedIds={selectedUseCases.map((uc) => uc.id)}
              onChange={handleUseCaseChange}
            />
            <div className="flex gap-2">
              <Input
                placeholder={t("newUseCasePlaceholder")}
                value={newUseCaseName}
                onChange={(e) => setNewUseCaseName(e.target.value)}
                onKeyDown={handleUseCaseKeyDown}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleCreateUseCase}
                disabled={creatingUseCase || !newUseCaseName.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <TaxonomyMultiSelect
              label={t("clientProject")}
              items={clientProjects}
              selectedIds={selectedClientProjects.map((cp) => cp.id)}
              onChange={handleClientProjectChange}
            />
            <div className="flex gap-2">
              <Input
                placeholder={t("newClientProjectPlaceholder")}
                value={newClientProjectName}
                onChange={(e) => setNewClientProjectName(e.target.value)}
                onKeyDown={handleClientProjectKeyDown}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleCreateClientProject}
                disabled={creatingClientProject || !newClientProjectName.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <TaxonomyMultiSelect
              label={t("platforms")}
              items={platforms}
              selectedIds={selectedPlatforms.map((p) => p.id)}
              onChange={handlePlatformSelectChange}
            />
            <div className="flex gap-2">
              <Input
                placeholder={t("newPlatformPlaceholder")}
                value={newPlatformName}
                onChange={(e) => setNewPlatformName(e.target.value)}
                onKeyDown={handlePlatformKeyDown}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleCreatePlatform}
                disabled={creatingPlatform || !newPlatformName.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <TaxonomyMultiSelect
              label={t("modelHints")}
              items={modelHints}
              selectedIds={selectedModelHints.map((mh) => mh.id)}
              onChange={handleModelHintChange}
            />
            <div className="flex gap-2">
              <Input
                placeholder={t("newModelHintPlaceholder")}
                value={newModelHintName}
                onChange={(e) => setNewModelHintName(e.target.value)}
                onKeyDown={handleModelHintKeyDown}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleCreateModelHint}
                disabled={creatingModelHint || !newModelHintName.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("advanced")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <AdvancedSegment
            version={formData.version}
            changelog={formData.changelog}
            notes={formData.notes}
            onVersionChange={(v) => setFormData({ ...formData, version: v })}
            onChangelogChange={(v) => setFormData({ ...formData, changelog: v })}
            onNotesChange={(v) => setFormData({ ...formData, notes: v })}
          />
        </CardContent>
      </Card>
    </form>
  )
}
