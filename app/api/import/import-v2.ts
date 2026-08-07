import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { importV2Schema } from "./schemas"
import { upsertEntity, upsertCategory, upsertTag } from "./upsert-entity"

async function importV2(
  data: z.infer<typeof importV2Schema>,
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

    // Resolver IDs de entidades relacionadas
    const platformIds: string[] = []
    const clientProjectIds: string[] = []
    const useCaseIds: string[] = []
    const modelHintIds: string[] = []
    const categoryIds: string[] = []

    // N:M relations (v2.0 format)
    if (promptData.platforms) {
      for (const name of promptData.platforms) {
        const id = await upsertEntity("platform", name)
        platformIds.push(id)
      }
    }
    if (promptData.clientProjects) {
      for (const name of promptData.clientProjects) {
        const id = await upsertEntity("clientProject", name)
        clientProjectIds.push(id)
      }
    }
    if (promptData.useCases) {
      for (const name of promptData.useCases) {
        const id = await upsertEntity("useCase", name)
        useCaseIds.push(id)
      }
    }
    if (promptData.modelHints) {
      for (const name of promptData.modelHints) {
        const id = await upsertEntity("modelHint", name)
        modelHintIds.push(id)
      }
    }
    if (promptData.categories) {
      for (const name of promptData.categories) {
        const id = categoryMap.get(name)
        if (id) categoryIds.push(id)
      }
    }

    // Tags
    const tagIds: string[] = []
    if (promptData.tags) {
      for (const name of promptData.tags) {
        const id = tagMap.get(name)
        if (id) tagIds.push(id)
      }
    }

    if (existing) {
      // UPSERT: Actualizar prompt existente
      await prisma.prompt.update({
        where: { id: existing.id },
        data: {
          title: promptData.title,
          description: promptData.description,
          body: promptData.body,
          type: promptData.type ?? "USER",
          status: promptData.status,
          language: promptData.language || "es",
          isFavorite: promptData.isFavorite ?? false,
          version: promptData.version ?? existing.version,
          changelog: promptData.changelog,
          notes: promptData.notes,
          prePrompt: promptData.prePrompt,
          manualDeUso: promptData.manualDeUso,
          usageCount: promptData.usageCount ?? existing.usageCount,
          lastUsedAt: promptData.lastUsedAt ? new Date(promptData.lastUsedAt) : existing.lastUsedAt,
        },
      })

      // Reemplazar relaciones N:M (delete + create en transacción)
      await prisma.$transaction([
        prisma.promptPlatform.deleteMany({ where: { promptId: existing.id } }),
        prisma.promptCategory.deleteMany({ where: { promptId: existing.id } }),
        prisma.promptClientProject.deleteMany({ where: { promptId: existing.id } }),
        prisma.promptUseCase.deleteMany({ where: { promptId: existing.id } }),
        prisma.promptModelHint.deleteMany({ where: { promptId: existing.id } }),
        prisma.promptTag.deleteMany({ where: { promptId: existing.id } }),
        ...platformIds.map((id) =>
          prisma.promptPlatform.create({
            data: { promptId: existing.id, platformId: id },
          })
        ),
        ...categoryIds.map((id) =>
          prisma.promptCategory.create({
            data: { promptId: existing.id, categoryId: id },
          })
        ),
        ...clientProjectIds.map((id) =>
          prisma.promptClientProject.create({
            data: { promptId: existing.id, clientProjectId: id },
          })
        ),
        ...useCaseIds.map((id) =>
          prisma.promptUseCase.create({
            data: { promptId: existing.id, useCaseId: id },
          })
        ),
        ...modelHintIds.map((id) =>
          prisma.promptModelHint.create({
            data: { promptId: existing.id, modelHintId: id },
          })
        ),
        ...tagIds.map((id) =>
          prisma.promptTag.create({
            data: { promptId: existing.id, tagId: id },
          })
        ),
      ])

      upsertedCount++
    } else {
      // CREATE: Nuevo prompt
      const prompt = await prisma.prompt.create({
        data: {
          userId: userId,
          title: promptData.title,
          description: promptData.description,
          body: promptData.body,
          type: promptData.type ?? "USER",
          status: promptData.status,
          language: promptData.language || "es",
          isFavorite: promptData.isFavorite ?? false,
          version: promptData.version ?? 1,
          changelog: promptData.changelog,
          notes: promptData.notes,
          prePrompt: promptData.prePrompt,
          manualDeUso: promptData.manualDeUso,
          usageCount: promptData.usageCount ?? 0,
          lastUsedAt: promptData.lastUsedAt ? new Date(promptData.lastUsedAt) : null,
        },
      })

      // Crear relaciones N:M en transacción
      await prisma.$transaction([
        ...platformIds.map((id) =>
          prisma.promptPlatform.create({
            data: { promptId: prompt.id, platformId: id },
          })
        ),
        ...categoryIds.map((id) =>
          prisma.promptCategory.create({
            data: { promptId: prompt.id, categoryId: id },
          })
        ),
        ...clientProjectIds.map((id) =>
          prisma.promptClientProject.create({
            data: { promptId: prompt.id, clientProjectId: id },
          })
        ),
        ...useCaseIds.map((id) =>
          prisma.promptUseCase.create({
            data: { promptId: prompt.id, useCaseId: id },
          })
        ),
        ...modelHintIds.map((id) =>
          prisma.promptModelHint.create({
            data: { promptId: prompt.id, modelHintId: id },
          })
        ),
        ...tagIds.map((id) =>
          prisma.promptTag.create({
            data: { promptId: prompt.id, tagId: id },
          })
        ),
      ])

      createdCount++
    }

    importedCount++
  }

  return { imported: importedCount, upserted: upsertedCount, created: createdCount }
}

export { importV2 }
export type ImportV2Result = { imported: number; upserted: number; created: number }
