"use client"

import { useEffect, useMemo, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"
import { Pencil, Plus, Search, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { slugify } from "@/lib/slug"

/** Keys of the Taxonomy namespace — the page title for each managed element. */
export type TaxonomyEntityKey =
  | "type"
  | "status"
  | "language"
  | "platforms"
  | "clientProjects"
  | "useCases"
  | "modelHints"

export interface TaxonomyItem {
  id: string
  name: string
  slug: string
  sortOrder: number
  _count?: { prompts: number } | null
}

export interface TaxonomyManagerProps {
  /** Base API path, e.g. "/api/types" (GET list, POST create, PUT/DELETE with [id]). */
  apiPath: string
  /** Taxonomy namespace key used for the page heading. */
  entityKey: TaxonomyEntityKey
  /** True for the N:M entities (Platform/ClientProject/UseCase/ModelHint) whose
   *  GET response includes _count.prompts; false for the plain catalogs. */
  showPromptsCount: boolean
  /** True when POST accepts slug/sortOrder (catalogs); the N:M entities
   *  generate slug and sortOrder server-side, so POST only receives name. */
  postAcceptsSlugAndSortOrder: boolean
}

interface ErrorResponse {
  error?: string
}

interface FormState {
  name: string
  slug: string
  sortOrder: number
}

const EMPTY_FORM: FormState = { name: "", slug: "", sortOrder: 0 }

function apiUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_BASE_PATH || ""}${path}`
}

/**
 * Configurable CRUD manager for the seven taxonomy elements (Type, Status,
 * Language catalogs and Platform/ClientProject/UseCase/ModelHint entities).
 * Admin-only UI: non-admin roles see the "unauthorized" message (the APIs
 * enforce the same rule server-side with 401).
 */
export function TaxonomyManager({
  apiPath,
  entityKey,
  showPromptsCount,
  postAcceptsSlugAndSortOrder,
}: TaxonomyManagerProps) {
  const router = useRouter()
  const { data: session, status: sessionStatus } = useSession()
  const t = useTranslations("TaxonomyPage")
  const tEntity = useTranslations("Taxonomy")
  const tCommon = useTranslations("Common")
  const tApi = useTranslations("Api")

  const [items, setItems] = useState<TaxonomyItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<TaxonomyItem | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const isAdmin = session?.user?.role === "admin"

  useEffect(() => {
    // Skip the initial fetch while the session is resolving, and never fetch
    // for non-admin roles (the UI gates them below anyway).
    if (sessionStatus === "loading" || !isAdmin) return
    void fetchItems()
    // Initial load only; refetches happen explicitly after each mutation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStatus, isAdmin])

  // GET returns a plain array; failures surface the server-side translated
  // { error } payload or a fallback message (ProfileUsersTab pattern).
  const fetchItems = async () => {
    setLoading(true)
    try {
      const response = await fetch(apiUrl(apiPath))
      const data = (await response.json().catch(() => null)) as
        | TaxonomyItem[]
        | ErrorResponse
        | null
      if (!response.ok || !Array.isArray(data)) {
        const errorBody = Array.isArray(data)
          ? null
          : (data as ErrorResponse | null)?.error
        setLoadError(errorBody ?? tApi("internalServerError"))
        return
      }
      setItems(data)
      setLoadError(null)
    } catch (error) {
      console.error("Failed to fetch taxonomy items:", error)
      setLoadError(tApi("internalServerError"))
    } finally {
      setLoading(false)
    }
  }

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return items
    return items.filter((item) => item.name.toLowerCase().includes(query))
  }, [items, search])

  const openCreateDialog = () => {
    setEditingItem(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  const openEditDialog = (item: TaxonomyItem) => {
    setEditingItem(item)
    setForm({
      name: item.name,
      slug: item.slug,
      sortOrder: item.sortOrder ?? 0,
    })
    setDialogOpen(true)
  }

  const closeDialog = () => {
    setDialogOpen(false)
    setEditingItem(null)
    setForm(EMPTY_FORM)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    // Empty slug means "generate it from the name" (slugify pattern).
    const slug = form.slug.trim() || slugify(form.name)
    const payload: { name: string; slug?: string; sortOrder?: number } = {
      name: form.name.trim(),
    }
    // PUT accepts slug/sortOrder for every element; POST only for the
    // catalogs (N:M entities normalize name and generate slug server-side).
    if (editingItem || postAcceptsSlugAndSortOrder) {
      payload.slug = slug
      payload.sortOrder = form.sortOrder
    }
    setSaving(true)
    try {
      const response = await fetch(
        apiUrl(editingItem ? `${apiPath}/${editingItem.id}` : apiPath),
        {
          method: editingItem ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      )
      const data = (await response.json().catch(() => null)) as
        | ErrorResponse
        | null
      if (!response.ok) {
        toast.error(data?.error ?? tApi("internalServerError"))
        return
      }
      closeDialog()
      void fetchItems()
      router.refresh()
    } catch (error) {
      console.error("Failed to save taxonomy item:", error)
      toast.error(tApi("internalServerError"))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (item: TaxonomyItem) => {
    if (!confirm(t("deleteConfirm"))) return
    setSaving(true)
    try {
      const response = await fetch(apiUrl(`${apiPath}/${item.id}`), {
        method: "DELETE",
      })
      const data = (await response.json().catch(() => null)) as {
        data?: { message?: string } | null
        error?: string
      } | null
      if (!response.ok) {
        toast.error(data?.error ?? tApi("internalServerError"))
        return
      }
      // DELETE returns the localized message in data.message.
      if (data?.data?.message) {
        toast.success(data.data.message)
      }
      void fetchItems()
      router.refresh()
    } catch (error) {
      console.error("Failed to delete taxonomy item:", error)
      toast.error(tApi("internalServerError"))
    } finally {
      setSaving(false)
    }
  }

  // Gate before data loading: hooks above are already unconditional.
  if (sessionStatus === "loading") {
    return <div>{tCommon("loading")}</div>
  }
  if (!isAdmin) {
    return (
      <div
        role="alert"
        className="rounded-md border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive"
      >
        {tApi("unauthorized")}
      </div>
    )
  }

  if (loading && items.length === 0) {
    return <div>{tCommon("loading")}</div>
  }
  // Keep the last loaded rows visible when a refetch fails.
  if (loadError && items.length === 0) {
    return (
      <div
        role="alert"
        className="rounded-md border border-destructive/50 bg-destructive/5 p-4 text-sm text-destructive"
      >
        {tCommon("errorToast", { message: loadError })}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{tEntity(entityKey)}</h1>
          <p className="text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button type="button" onClick={openCreateDialog} disabled={saving}>
          <Plus className="mr-2 h-4 w-4" />
          {t("newValue")}
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-accent" />
        <Input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t("searchPlaceholder")}
          className="pl-10"
        />
      </div>

      {filteredItems.length === 0 ? (
        <div className="rounded-md border p-6 text-center text-sm text-muted-foreground">
          {t("empty")}
        </div>
      ) : (
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th scope="col" className="px-3 py-2 font-medium">
                  {t("name")}
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  {t("slug")}
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  {t("sortOrder")}
                </th>
                {showPromptsCount && (
                  <th scope="col" className="px-3 py-2 font-medium">
                    {t("promptsCount")}
                  </th>
                )}
                <th scope="col" className="px-3 py-2 text-right">
                  <span className="sr-only">{t("editValue")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="px-3 py-2 font-medium">{item.name}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {item.slug}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {item.sortOrder}
                  </td>
                  {showPromptsCount && (
                    <td className="px-3 py-2 text-muted-foreground">
                      {item._count?.prompts ?? 0}
                    </td>
                  )}
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(item)}
                        disabled={saving}
                        aria-label={t("editValue")}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => void handleDelete(item)}
                        disabled={saving}
                        aria-label={tCommon("delete")}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) closeDialog()
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? t("editValue") : t("newValue")}
            </DialogTitle>
            <DialogDescription>{t("subtitle")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="taxonomy-name">{t("name")}</Label>
              <Input
                id="taxonomy-name"
                value={form.name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                }
                required
              />
            </div>

            {/* Slug and order are only meaningful when the API accepts them:
                the four N:M entities generate both server-side on create, so
                hide the fields there (editing still sends them via PUT). */}
            {(editingItem || postAcceptsSlugAndSortOrder) && (
              <div className="space-y-2">
                <Label htmlFor="taxonomy-slug">{t("slug")}</Label>
                <Input
                  id="taxonomy-slug"
                  value={form.slug}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, slug: event.target.value }))
                  }
                  placeholder={form.slug.trim() === "" ? slugify(form.name) : undefined}
                />
                {form.slug.trim() === "" && (
                  <p className="text-xs text-muted-foreground">
                    {t("slug")}: {slugify(form.name) || "—"}
                  </p>
                )}
              </div>
            )}

            {(editingItem || postAcceptsSlugAndSortOrder) && (
              <div className="space-y-2">
                <Label htmlFor="taxonomy-sort-order">{t("sortOrder")}</Label>
                <Input
                  id="taxonomy-sort-order"
                  type="number"
                  value={form.sortOrder}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      sortOrder: parseInt(event.target.value) || 0,
                    }))
                  }
                />
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeDialog}
                disabled={saving}
              >
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? tCommon("saving") : t("save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
