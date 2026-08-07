import { prisma } from "@/lib/prisma"

// Función auxiliar para normalizar nombres (D-06)
export function normalizeName(name: string): string {
  return name.trim().toLowerCase()
}

// Función auxiliar para crear slug desde nombre
export function createSlug(name: string): string {
  return normalizeName(name).replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
}

// Importar entidades relacionadas (platforms, clientProjects, useCases, modelHints)
export async function upsertEntity(
  entityType: "platform" | "clientProject" | "useCase" | "modelHint",
  name: string
): Promise<string> {
  const normalizedName = normalizeName(name)
  const slug = createSlug(name)

  // Buscar existente (case-insensitive) usando switch para type safety
  let existing: { id: string } | null = null
  
  switch (entityType) {
    case "platform":
      existing = await prisma.platform.findFirst({
        where: { name: { equals: normalizedName, mode: "insensitive" } },
      })
      break
    case "clientProject":
      existing = await prisma.clientProject.findFirst({
        where: { name: { equals: normalizedName, mode: "insensitive" } },
      })
      break
    case "useCase":
      existing = await prisma.useCase.findFirst({
        where: { name: { equals: normalizedName, mode: "insensitive" } },
      })
      break
    case "modelHint":
      existing = await prisma.modelHint.findFirst({
        where: { name: { equals: normalizedName, mode: "insensitive" } },
      })
      break
  }

  if (existing) {
    return existing.id
  }

  // Crear nuevo usando switch para type safety
  let created: { id: string }
  
  switch (entityType) {
    case "platform":
      created = await prisma.platform.create({
        data: { name: normalizedName, slug: slug || normalizedName, sortOrder: 0 },
      })
      break
    case "clientProject":
      created = await prisma.clientProject.create({
        data: { name: normalizedName, slug: slug || normalizedName, sortOrder: 0 },
      })
      break
    case "useCase":
      created = await prisma.useCase.create({
        data: { name: normalizedName, slug: slug || normalizedName, sortOrder: 0 },
      })
      break
    case "modelHint":
      created = await prisma.modelHint.create({
        data: { name: normalizedName, slug: slug || normalizedName, sortOrder: 0 },
      })
      break
  }

  return created.id
}

// Importar categoría (con manejo de parent)
export async function upsertCategory(
  catData: { name: string; slug: string; parent?: string | null; sortOrder?: number },
  categoryMap: Map<string, string>
): Promise<string> {
  // Verificar si ya existe por slug
  let existing = await prisma.category.findUnique({
    where: { slug: catData.slug },
  })

  if (existing) {
    // Actualizar si es necesario
    existing = await prisma.category.update({
      where: { id: existing.id },
      data: {
        name: catData.name,
        sortOrder: catData.sortOrder ?? existing.sortOrder,
      },
    })
    categoryMap.set(catData.name, existing.id)
    return existing.id
  }

  // Crear nueva
  const created = await prisma.category.create({
    data: {
      name: catData.name,
      slug: catData.slug,
      sortOrder: catData.sortOrder ?? 0,
    },
  })
  categoryMap.set(catData.name, created.id)
  return created.id
}

// Importar tag
export async function upsertTag(
  tagData: { name: string; slug: string },
  tagMap: Map<string, string>
): Promise<string> {
  // Verificar si ya existe por slug
  const existing = await prisma.tag.findUnique({
    where: { slug: tagData.slug },
  })

  if (existing) {
    tagMap.set(tagData.name, existing.id)
    return existing.id
  }

  // Crear nuevo
  const created = await prisma.tag.create({
    data: {
      name: tagData.name,
      slug: tagData.slug,
    },
  })
  tagMap.set(tagData.name, created.id)
  return created.id
}
