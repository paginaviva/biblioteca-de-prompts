"use client"

import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Edit, Trash2, AlertTriangle, Search } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "next-intl"

interface Category {
  id: string
  name: string
  slug: string
  parentId: string | null
  sortOrder: number
  parent: Category | null
  children: Category[]
  _count: {
    prompts: number
  }
}

// Error boundary to prevent page crashes from rendering errors
class CategoryErrorBoundary extends React.Component<
  {
    children: React.ReactNode
    errorTitle: string
    errorMessage: string
    reloadPage: string
  },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: {
    children: React.ReactNode
    errorTitle: string
    errorMessage: string
    reloadPage: string
  }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Category page error:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-12">
          <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">
            {this.props.errorTitle}
          </h2>
          <p className="text-muted-foreground mb-4">
            {this.props.errorMessage}
          </p>
          <pre className="text-sm text-red-600 dark:text-red-400 bg-red-500/10 p-4 rounded-lg max-w-lg overflow-auto mb-4">
            {this.state.error?.message}
          </pre>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null })
              window.location.reload()
            }}
            className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-strong transition-colors"
          >
            {this.props.reloadPage}
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

function CategoriesPage() {
  const router = useRouter()
  const t = useTranslations("CategoriesPage")
  const tCommon = useTranslations("Common")
  const tTaxonomy = useTranslations("TaxonomyPage")
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [formData, setFormData] = useState<{
    name: string
    slug: string
    parentId: string | null
    sortOrder: number
  }>({
    name: "",
    slug: "",
    parentId: null,
    sortOrder: 0,
  })

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
      const res = await fetch(`${basePath}/api/categories`)
      const data = await res.json()
      // Validate response is an array before setting state
      if (Array.isArray(data)) {
        setCategories(data)
      } else {
        console.error("API returned non-array response:", data)
        setCategories([])
      }
    } catch (error) {
      console.error("Error fetching categories:", error)
      setCategories([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const payload: {
        name: string
        slug: string
        parentId?: string
        sortOrder: number
      } = {
        name: formData.name,
        slug: formData.slug,
        sortOrder: parseInt(String(formData.sortOrder)) || 0,
      }
      
      // Only include parentId if it's not null
      if (formData.parentId) {
        payload.parentId = formData.parentId
      }

      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
      const url = editingCategory
        ? `${basePath}/api/categories/${editingCategory.id}`
        : `${basePath}/api/categories`
      const method = editingCategory ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        setDialogOpen(false)
        setEditingCategory(null)
        setFormData({ name: "", slug: "", parentId: null, sortOrder: 0 })
        fetchCategories()
        router.refresh()
      } else {
        const error = await response.json()
        toast.error(tCommon("errorToast", { message: error.error }))
      }
    } catch (error) {
      console.error("Error saving category:", error)
      toast.error(t("saveFailed"))
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    const category = categories.find((cat) => cat.id === id)
    const hasChildren = category && category.children && category.children.length > 0
    const message = hasChildren
      ? t("deleteConfirmWithChildren", { name: category.name })
      : t("deleteConfirm")
    if (!confirm(message)) return

    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || ''
      const response = await fetch(`${basePath}/api/categories/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        fetchCategories()
        router.refresh()
      } else {
        const error = await response.json()
        toast.error(tCommon("errorToast", { message: error.error }))
      }
    } catch (error) {
      console.error("Error deleting category:", error)
      toast.error(t("deleteFailed"))
    }
  }

  const handleEdit = (category: Category) => {
    setEditingCategory(category)
    setFormData({
      name: category.name,
      slug: category.slug,
      parentId: category.parentId || null,
      sortOrder: category.sortOrder || 0,
    })
    setDialogOpen(true)
  }

  const handleNew = () => {
    setEditingCategory(null)
    setFormData({ name: "", slug: "", parentId: null, sortOrder: 0 })
    setDialogOpen(true)
  }

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
  }

  // Client-side name filter that keeps a node when its own name matches or
  // when any descendant matches, so searching for a subcategory still shows
  // its ancestors (pure recursion, no mutation).
  const filterCategories = (cats: Category[]): Category[] => {
    const query = search.trim().toLowerCase()
    if (!query) return cats
    return cats
      .map((cat) => ({ ...cat, children: filterCategories(cat.children ?? []) }))
      .filter(
        (cat) => cat.name.toLowerCase().includes(query) || cat.children.length > 0
      )
  }

  const renderCategory = (category: Category, level = 0) => {
    return (
      <div key={category.id} className="ml-4">
        <Card className="mb-2 gradient-card shadow-glow hover:shadow-glow-hover transition-all border-accent">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex-1">
              <div className="font-semibold">{category.name}</div>
              <div className="text-sm text-muted-foreground">
                {t("promptCount", { slug: category.slug, count: category._count?.prompts ?? 0 })}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEdit(category)}
                className="border-accent hover:bg-accent-soft hover:border-accent"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDelete(category.id)}
                className="hover:bg-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
        {category.children?.map((child) => renderCategory(child, level + 1))}
      </div>
    )
  }

  const topLevelCategories = filterCategories(
    Array.isArray(categories) ? categories.filter((cat) => !cat.parentId) : []
  )

  if (loading && categories.length === 0) {
    return <div>{tCommon("loading")}</div>
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-[var(--accent-color)] to-pink-500 bg-clip-text text-transparent mb-2">
            {t("title")}
          </h1>
          <p className="text-muted-foreground font-medium">
            {t("subtitle")}
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleNew} className="gradient-primary shadow-glow hover:shadow-glow-hover transition-all">
              <Plus className="mr-2 h-4 w-4" />
              {t("newCategory")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? t("editCategory") : t("newCategory")}
              </DialogTitle>
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

              <div>
                <Label htmlFor="parentId">{t("parentCategory")}</Label>
                <Select
                  value={formData.parentId || undefined}
                  onValueChange={(value) =>
                    setFormData({ ...formData, parentId: value === "none" ? null : value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={tCommon("none")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{tCommon("none")}</SelectItem>
                    {categories
                      .filter((cat) => cat.id !== editingCategory?.id)
                      .filter((cat) => !cat.parentId)
                      .map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="sortOrder">{t("sortOrder")}</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      sortOrder: parseInt(e.target.value) || 0,
                    })
                  }
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

      <div>
        {topLevelCategories.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              {t("noCategories")}
            </CardContent>
          </Card>
        ) : (
          topLevelCategories.map((category) => renderCategory(category))
        )}
      </div>
    </div>
  )
}

// Wrap with ErrorBoundary to catch rendering errors
export default function CategoriesPageWithErrorBoundary() {
  const t = useTranslations("CategoriesPage")

  return (
    <CategoryErrorBoundary
      errorTitle={t("errorTitle")}
      errorMessage={t("errorMessage")}
      reloadPage={t("reloadPage")}
    >
      <CategoriesPage />
    </CategoryErrorBoundary>
  )
}

