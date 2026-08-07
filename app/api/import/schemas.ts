import { z } from "zod"

// Schema base común para prompts
const promptBaseSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  description: z.string().nullable().optional(),
  body: z.string(),
  type: z.string().nullable().optional(),
  status: z.string().optional(),
  language: z.string().optional(),
  isFavorite: z.boolean().optional(),
  version: z.number().optional(),
  changelog: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  prePrompt: z.string().nullable().optional(),
  manualDeUso: z.string().nullable().optional(),
  usageCount: z.number().optional(),
  lastUsedAt: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
})

// Schema v2.0 (nuevo formato con relaciones N:M)
const promptV2Schema = promptBaseSchema.extend({
  platforms: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
  clientProjects: z.array(z.string()).optional(),
  useCases: z.array(z.string()).optional(),
  modelHints: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  // Legacy fields (compatibilidad)
  platform: z.string().nullable().optional(),
  clientOrProject: z.string().nullable().optional(),
  useCase: z.string().nullable().optional(),
  modelHint: z.string().nullable().optional(),
})

// Schema v1.0 (formato antiguo con campos string)
const promptV1Schema = promptBaseSchema.extend({
  platform: z.string().nullable().optional(),
  clientOrProject: z.string().nullable().optional(),
  useCase: z.string().nullable().optional(),
  modelHint: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
})

const categorySchema = z.object({
  name: z.string(),
  slug: z.string(),
  parent: z.string().nullable().optional(),
  sortOrder: z.number().optional(),
})

const tagSchema = z.object({
  name: z.string(),
  slug: z.string(),
})

const importV2Schema = z.object({
  version: z.literal("2.0"),
  exportedAt: z.string().optional(),
  prompts: z.array(promptV2Schema),
  categories: z.array(categorySchema).optional(),
  tags: z.array(tagSchema).optional(),
})

const importV1Schema = z.object({
  version: z.string().optional(),
  exportedAt: z.string().optional(),
  prompts: z.array(promptV1Schema),
  categories: z.array(categorySchema).optional(),
  tags: z.array(tagSchema).optional(),
})

export {
  promptBaseSchema,
  promptV2Schema,
  promptV1Schema,
  categorySchema,
  tagSchema,
  importV2Schema,
  importV1Schema,
}

export type PromptV2Input = z.infer<typeof promptV2Schema>
export type PromptV1Input = z.infer<typeof promptV1Schema>
export type ImportV2Input = z.infer<typeof importV2Schema>
export type ImportV1Input = z.infer<typeof importV1Schema>
export type CategoryInput = z.infer<typeof categorySchema>
export type TagInput = z.infer<typeof tagSchema>
