"use client"

import { useEffect, useState, type FormEvent } from "react"
import { useSession } from "next-auth/react"
import { useFormatter, useTranslations } from "next-intl"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type UserRole = "user" | "admin"

interface AdminUser {
  id: string
  name: string
  email: string
  role: UserRole
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface UsersListResponse {
  data?: AdminUser[]
  error?: string
}

interface ErrorResponse {
  error?: string
}

interface UserFormState {
  name: string
  email: string
  password: string
  confirmPassword: string
  role: UserRole
}

const EMPTY_FORM: UserFormState = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  role: "user",
}

function apiUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_BASE_PATH || ""}${path}`
}

// Admin-only user management tab (the parent only renders this component for
// admins; the API enforces the same rule with a 401 for other roles).
export function ProfileUsersTab() {
  const { data: session } = useSession()
  const t = useTranslations("Users")
  const tApi = useTranslations("Api")
  const tCommon = useTranslations("Common")
  const format = useFormatter()

  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const [form, setForm] = useState<UserFormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void fetchUsers()
    // Initial load only; refetches happen explicitly after each mutation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // GET /api/users returns { data: users }; every failure surfaces the
  // server-side translated { error } payload or a fallback message.
  const fetchUsers = async () => {
    setLoading(true)
    try {
      const response = await fetch(apiUrl("/api/users"))
      const data = (await response.json().catch(() => null)) as
        | UsersListResponse
        | null
      if (!response.ok || !data?.data || !Array.isArray(data.data)) {
        setLoadError(data?.error ?? tApi("internalServerError"))
        return
      }
      setUsers(data.data)
      setLoadError(null)
    } catch (error) {
      console.error("Failed to fetch users:", error)
      setLoadError(tApi("internalServerError"))
    } finally {
      setLoading(false)
    }
  }

  const openCreateDialog = () => {
    setEditingUser(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  const openEditDialog = (user: AdminUser) => {
    setEditingUser(user)
    setForm({ ...EMPTY_FORM, name: user.name, role: user.role })
    setDialogOpen(true)
  }

  const closeDialog = () => {
    setDialogOpen(false)
    setEditingUser(null)
    setForm(EMPTY_FORM)
  }

  const handleRoleChange = (value: string) => {
    if (value === "user" || value === "admin") {
      setForm((prev) => ({ ...prev, role: value }))
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (editingUser) {
      void handleEdit()
    } else {
      void handleCreate()
    }
  }

  const handleCreate = async () => {
    // The confirmation field must match the new password before sending.
    if (form.password !== form.confirmPassword) {
      toast.error(t("passwordMismatch"))
      return
    }
    setSaving(true)
    try {
      const response = await fetch(apiUrl("/api/users"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          role: form.role,
        }),
      })
      const data = (await response.json().catch(() => null)) as
        | ErrorResponse
        | null
      if (!response.ok) {
        toast.error(data?.error ?? tApi("internalServerError"))
        return
      }
      toast.success(tApi("userCreated"))
      closeDialog()
      void fetchUsers()
    } catch (error) {
      console.error("Failed to create user:", error)
      toast.error(tApi("internalServerError"))
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = async () => {
    if (!editingUser) return
    // If a new password is set, the confirmation field must match it.
    if (form.password !== form.confirmPassword) {
      toast.error(t("passwordMismatch"))
      return
    }
    setSaving(true)
    try {
      const payload: {
        id: string
        name: string
        password?: string
        role: UserRole
      } = {
        id: editingUser.id,
        name: form.name.trim(),
        role: form.role,
      }
      // Empty password means "keep the current one".
      if (form.password) {
        payload.password = form.password
      }
      const response = await fetch(apiUrl("/api/users"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = (await response.json().catch(() => null)) as
        | ErrorResponse
        | null
      if (!response.ok) {
        toast.error(data?.error ?? tApi("internalServerError"))
        return
      }
      toast.success(tApi("userUpdated"))
      closeDialog()
      void fetchUsers()
    } catch (error) {
      console.error("Failed to update user:", error)
      toast.error(tApi("internalServerError"))
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (user: AdminUser) => {
    const activate = !user.isActive
    const confirmMessage = activate
      ? t("activateConfirm")
      : t("deactivateConfirm")
    if (!confirm(confirmMessage)) return
    setSaving(true)
    try {
      const response = await fetch(apiUrl(`/api/users/${user.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: activate }),
      })
      const data = (await response.json().catch(() => null)) as
        | ErrorResponse
        | null
      if (!response.ok) {
        toast.error(data?.error ?? tApi("internalServerError"))
        return
      }
      toast.success(activate ? tApi("userActivated") : tApi("userDeactivated"))
      void fetchUsers()
    } catch (error) {
      console.error("Failed to toggle user activation:", error)
      toast.error(tApi("internalServerError"))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (user: AdminUser) => {
    if (!confirm(t("deleteConfirm"))) return
    setSaving(true)
    try {
      const response = await fetch(apiUrl(`/api/users/${user.id}`), {
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
      toast.success(data?.data?.message ?? tApi("userDeleted"))
      void fetchUsers()
    } catch (error) {
      console.error("Failed to delete user:", error)
      toast.error(tApi("internalServerError"))
    } finally {
      setSaving(false)
    }
  }

  if (loading && users.length === 0) {
    return <div>{t("loading")}</div>
  }

  // Only replace the table with the error state when there is nothing to
  // show; a failed refetch keeps the last loaded rows visible.
  if (loadError && users.length === 0) {
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">{t("title")}</h3>
          <p className="text-xs text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={openCreateDialog}
          disabled={saving}
        >
          <Plus className="mr-1 h-4 w-4" />
          {t("newUser")}
        </Button>
      </div>

      {users.length === 0 ? (
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
                  {t("email")}
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  {t("role")}
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  {t("status")}
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  {t("createdAt")}
                </th>
                <th scope="col" className="px-3 py-2 text-right">
                  <span className="sr-only">{t("editUser")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const isSelf = user.id === session?.user?.id
                return (
                  <tr key={user.id} className="border-b last:border-0">
                    <td className="px-3 py-2">
                      <span className="font-medium">{user.name}</span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {user.email}
                    </td>
                    <td className="px-3 py-2">
                      <Badge
                        variant={user.role === "admin" ? "default" : "secondary"}
                      >
                        {user.role === "admin" ? t("roleAdmin") : t("roleUser")}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant={user.isActive ? "default" : "secondary"}>
                        {user.isActive ? t("active") : t("inactive")}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {format.dateTime(new Date(user.createdAt), {
                        day: "numeric",
                        month: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(user)}
                          disabled={saving}
                          aria-label={t("editUser")}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void handleToggleActive(user)}
                          disabled={saving || (isSelf && user.isActive)}
                        >
                          {user.isActive ? t("deactivate") : t("activate")}
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => void handleDelete(user)}
                          disabled={saving || isSelf}
                          aria-label={t("deleteUser")}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
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
              {editingUser ? t("editUser") : t("newUser")}
            </DialogTitle>
            <DialogDescription>{t("subtitle")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="user-name">{t("name")}</Label>
              <Input
                id="user-name"
                value={form.name}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, name: event.target.value }))
                }
                required
              />
            </div>
            {!editingUser && (
              <div className="space-y-2">
                <Label htmlFor="user-email">{t("email")}</Label>
                <Input
                  id="user-email"
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, email: event.target.value }))
                  }
                  required
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="user-password">{t("password")}</Label>
              <Input
                id="user-password"
                type="password"
                minLength={6}
                value={form.password}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    password: event.target.value,
                  }))
                }
                required={!editingUser}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-confirm-password">{t("confirmPassword")}</Label>
              <Input
                id="user-confirm-password"
                type="password"
                minLength={6}
                value={form.confirmPassword}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    confirmPassword: event.target.value,
                  }))
                }
                required={!editingUser}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-role">{t("role")}</Label>
              <Select value={form.role} onValueChange={handleRoleChange}>
                <SelectTrigger id="user-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">{t("roleUser")}</SelectItem>
                  <SelectItem value="admin">{t("roleAdmin")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
