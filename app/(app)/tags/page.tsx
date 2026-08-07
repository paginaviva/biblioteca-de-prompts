"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Trash2, Search } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "next-intl"

interface Tag {
  id: string
  name: string
  slug: string
  _count: {
    prompts: number
  }
}

export default function TagsPage() {
  const router = useRouter()
  const t = useTranslations("TagsPage")
  const tCommon = useTranslations("Common")
  const tTaxonomy = useTranslations("TaxonomyPage")
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTag, setEditingTag] = useState<Tag | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
  })

  useEffect(() => {
    fetchTags()
  }, [])

  const fetchTags = async () => {
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
      const res = await fetch(`${basePath}/api/tags`)
      const data = await res.json()
      setTags(data)
    } catch (error) {
      console.error("Error fetching tags:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
      const url = editingTag ? `${basePath}/api/tags/${editingTag.id}` : `${basePath}/api/tags`
      const method = editingTag ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        setDialogOpen(false)
        setEditingTag(null)
        setFormData({ name: "", slug: "" })
        fetchTags()
        router.refresh()
      } else {
        const error = await response.json()
        toast.error(tCommon("errorToast", { message: error.error }))
      }
    } catch (error) {
      console.error("Error saving tag:", error)
      toast.error(t("saveFailed"))
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t("deleteConfirm"))) return

    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
      const response = await fetch(`${basePath}/api/tags/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        fetchTags()
        router.refresh()
      } else {
        const error = await response.json()
        toast.error(tCommon("errorToast", { message: error.error }))
      }
    } catch (error) {
      console.error("Error deleting tag:", error)
      toast.error(t("deleteFailed"))
    }
  }

  const handleEdit = (tag: Tag) => {
    setEditingTag(tag)
    setFormData({
      name: tag.name,
      slug: tag.slug,
    })
    setDialogOpen(true)
  }

  const handleNew = () => {
    setEditingTag(null)
    setFormData({ name: "", slug: "" })
    setDialogOpen(true)
  }

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
  }

  const query = search.trim().toLowerCase()
  const filteredTags = query
    ? tags.filter((tag) => tag.name.toLowerCase().includes(query))
    : tags

  if (loading && tags.length === 0) {
    return <div>{tCommon("loading")}</div>
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("title")}</h1>
          <p className="text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleNew}>
              <Plus className="mr-2 h-4 w-4" />
              {t("newTag")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingTag ? t("editTag") : t("newTag")}</DialogTitle>
              <DialogDescription>
                {t("dialogDescription")}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">{t("nameLabel")}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      name: e.target.value,
                      slug: generateSlug(e.target.value),
                    })
                  }}
                  required
                />
              </div>

              <div>
                <Label htmlFor="slug">{t("slugLabel")}</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({ ...formData, slug: e.target.value })
                  }
                  required
                />
              </div>

              <Button type="submit" disabled={loading}>
                {loading ? tCommon("saving") : tCommon("save")}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative mb-6 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-accent" />
        <Input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={tTaxonomy("searchPlaceholder")}
          className="pl-10"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredTags.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              {t("noTags")}
            </CardContent>
          </Card>
        ) : (
          filteredTags.map((tag) => (
            <Card key={tag.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex-1">
                  <Badge variant="secondary" className="mb-2">
                    {tag.name}
                  </Badge>
                  <div className="text-sm text-muted-foreground">
                    {t("promptCount", { slug: tag.slug, count: tag._count.prompts })}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(tag)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(tag.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}


