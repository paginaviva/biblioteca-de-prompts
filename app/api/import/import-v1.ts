import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { importV1Schema } from "./schemas"
import { upsertCategory, upsertTag } from "./upsert-entity"

async function importV1(
  data: z.infer<typeof importV1Schema>,
  userId: string
): Promise<{ imported: number; upserted: number; created: number }> {
  const categoryMap = new Map<string, string>()
  const tagMap = new Map<string, string>()
  let importedCount = 0
  let upsertedCount = 0
  let createdCount = 0

  // Importar categorías primero
  if (data.categories) {
    for (const cat of data.categories) {
      await upsertCategory(cat, categoryMap)
    }

    // Actualizar relaciones parent
    for (const cat of data.categories) {
      if (cat.parent) {
        const parentId = categoryMap.get(cat.parent)
        const childId = categoryMap.get(cat.name)
        if (parentId && childId) {
          await prisma.category.update({
            where: { id: childId },
            data: { parentId },
          })
        }
      }
    }
  }

  // Importar tags
  if (data.tags) {
    for (const tag of data.tags) {
      await upsertTag(tag, tagMap)
    }
  }

  // Importar prompts
  for (const promptData of data.prompts) {
    // Buscar existente por userId + id o userId + title (D-02)
    const existing = await prisma.prompt.findFirst({
      where: {
        userId: userId,
        OR: [
          { id: promptData.id },
          { title: promptData.title },
        ],
      },
    })

    // Resolver categoryId
    const categoryId = promptData.category
      ? categoryMap.get(promptData.category) || null
      : null

    // Tags
    const tagIds: string[] = []
    if (promptData.tags) {
      for (const name of promptData.tags) {
        const id = tagMap.get(name)
        if (id) tagIds.push(id)
      }
    }

    if (existing) {
      // UPSERT: Actualizar prompt existente (campos legacy como strings)
      await prisma.prompt.update({
        where: { id: existing.id },
        data: {
          title: promptData.title,
          description: promptData.description,
          body: promptData.body,
          type: promptData.type ?? "USER",
          platform: promptData.platform,
          modelHint: promptData.modelHint,
          language: promptData.language || "es",
          useCase: promptData.useCase,
          clientOrProject: promptData.clientOrProject,
          status: promptData.status || "DRAFT",
          isFavorite: promptData.isFavorite ?? false,
          version: promptData.version ?? existing.version,
          changelog: promptData.changelog,
          notes: promptData.notes,
          prePrompt: promptData.prePrompt,
          manualDeUso: promptData.manualDeUso,
        },
      })

      // Actualizar category si existe (usando junction table)
      if (categoryId) {
        await prisma.$transaction([
          prisma.promptCategory.deleteMany({ where: { promptId: existing.id } }),
          prisma.promptCategory.create({
            data: { promptId: existing.id, categoryId },
          }),
        ])
      }

      // Reemplazar tags
      await prisma.$transaction([
        prisma.promptTag.deleteMany({ where: { promptId: existing.id } }),
        ...tagIds.map((id) =>
          prisma.promptTag.create({
            data: { promptId: existing.id, tagId: id },
          })
        ),
      ])

      upsertedCount++
    } else {
      // CREATE: Nuevo prompt (campos legacy como strings)
      const prompt = await prisma.prompt.create({
        data: {
          userId: userId,
          title: promptData.title,
          description: promptData.description,
          body: promptData.body,
          type: promptData.type ?? "USER",
          platform: promptData.platform,
          modelHint: promptData.modelHint,
          language: promptData.language || "es",
          useCase: promptData.useCase,
          clientOrProject: promptData.clientOrProject,
          status: promptData.status || "DRAFT",
          isFavorite: promptData.isFavorite ?? false,
          version: promptData.version ?? 1,
          changelog: promptData.changelog,
          notes: promptData.notes,
          prePrompt: promptData.prePrompt,
          manualDeUso: promptData.manualDeUso,
        },
      })

      // Crear category si existe (usando junction table)
      if (categoryId) {
        await prisma.promptCategory.create({
          data: { promptId: prompt.id, categoryId },
        })
      }

      // Crear tags
      if (tagIds.length > 0) {
        await prisma.$transaction(
          tagIds.map((id) =>
            prisma.promptTag.create({
              data: { promptId: prompt.id, tagId: id },
            })
          )
        )
      }

      createdCount++
    }

    importedCount++
  }

  return { imported: importedCount, upserted: upsertedCount, created: createdCount }
}

export { importV1 }
export type ImportV1Result = { imported: number; upserted: number; created: number }
