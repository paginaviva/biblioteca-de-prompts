import { Prisma, PrismaClient } from "@prisma/client"

function isPrismaClientKnownRequestError(
  error: unknown
): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError
}

const prisma = new PrismaClient()

/**
 * Script de migración de datos: Transforma campos string existentes en relaciones N:M
 * 
 * Campos que se migran:
 * - platform → Platform + PromptPlatform
 * - useCase → UseCase + PromptUseCase
 * - clientOrProject → ClientProject + PromptClientProject
 * - modelHint → ModelHint + PromptModelHint
 * 
 * Normalización:
 * - Platform: trim() + toUpperCase() para coincidir con enum legacy
 * - Otros campos: trim()
 * 
 * El script es idempotente (usa upsert) y atómico (usa $transaction)
 */
async function main() {
  console.log("🚀 Iniciando migración de datos string → relaciones N:M...")
  
  let promptsProcessed = 0
  let entitiesCreated = 0
  let relationsCreated = 0
  
  await prisma.$transaction(async (tx) => {
    // Obtener todos los prompts con al menos un campo string no nulo
    const prompts = await tx.prompt.findMany({
      where: {
        OR: [
          { platform: { not: null } },
          { useCase: { not: null } },
          { clientOrProject: { not: null } },
          { modelHint: { not: null } },
        ],
      },
    })
    
    console.log(`📊 Encontrados ${prompts.length} prompts con campos string para migrar`)
    
    for (const prompt of prompts) {
      promptsProcessed++
      
      // ==============================
      // MIGRAR PLATFORM
      // ==============================
      if (prompt.platform && prompt.platform.trim()) {
        const platformName = prompt.platform.trim().toUpperCase()
        
        // Crear o obtener Platform
        const platform = await tx.platform.upsert({
          where: { slug: platformName.toLowerCase().replace(/\s+/g, '-') },
          update: {},
          create: {
            name: platformName,
            slug: platformName.toLowerCase().replace(/\s+/g, '-'),
            sortOrder: 999, // Valores migrados van al final
          },
        })
        
        // Crear relación PromptPlatform (upsert para evitar duplicados)
        try {
          await tx.promptPlatform.upsert({
            where: {
              promptId_platformId: {
                promptId: prompt.id,
                platformId: platform.id,
              },
            },
            update: {},
            create: {
              promptId: prompt.id,
              platformId: platform.id,
            },
          })
          relationsCreated++
        } catch (error: unknown) {
          if (isPrismaClientKnownRequestError(error)) { // Ignorar duplicados
            if (error.code !== 'P2002') throw error
          } else {
            throw error
          }
        }
      }
      
      // ==============================
      // MIGRAR USE CASE
      // ==============================
      if (prompt.useCase && prompt.useCase.trim()) {
        const useCaseName = prompt.useCase.trim()
        
        const useCase = await tx.useCase.upsert({
          where: { slug: useCaseName.toLowerCase().replace(/\s+/g, '-') },
          update: {},
          create: {
            name: useCaseName,
            slug: useCaseName.toLowerCase().replace(/\s+/g, '-'),
            sortOrder: 999,
          },
        })
        
        try {
          await tx.promptUseCase.upsert({
            where: {
              promptId_useCaseId: {
                promptId: prompt.id,
                useCaseId: useCase.id,
              },
            },
            update: {},
            create: {
              promptId: prompt.id,
              useCaseId: useCase.id,
            },
          })
          relationsCreated++
        } catch (error: unknown) {
          if (isPrismaClientKnownRequestError(error)) {
            if (error.code !== 'P2002') throw error
          } else {
            throw error
          }
        }
      }
      
      // ==============================
      // MIGRAR CLIENT PROJECT
      // ==============================
      if (prompt.clientOrProject && prompt.clientOrProject.trim()) {
        const clientProjectName = prompt.clientOrProject.trim()
        
        const clientProject = await tx.clientProject.upsert({
          where: { slug: clientProjectName.toLowerCase().replace(/\s+/g, '-') },
          update: {},
          create: {
            name: clientProjectName,
            slug: clientProjectName.toLowerCase().replace(/\s+/g, '-'),
            sortOrder: 999,
          },
        })
        
        try {
          await tx.promptClientProject.upsert({
            where: {
              promptId_clientProjectId: {
                promptId: prompt.id,
                clientProjectId: clientProject.id,
              },
            },
            update: {},
            create: {
              promptId: prompt.id,
              clientProjectId: clientProject.id,
            },
          })
          relationsCreated++
        } catch (error: unknown) {
          if (isPrismaClientKnownRequestError(error)) {
            if (error.code !== 'P2002') throw error
          } else {
            throw error
          }
        }
      }
      
      // ==============================
      // MIGRAR MODEL HINT
      // ==============================
      if (prompt.modelHint && prompt.modelHint.trim()) {
        const modelHintName = prompt.modelHint.trim()
        
        const modelHint = await tx.modelHint.upsert({
          where: { slug: modelHintName.toLowerCase().replace(/\s+/g, '-') },
          update: {},
          create: {
            name: modelHintName,
            slug: modelHintName.toLowerCase().replace(/\s+/g, '-'),
            sortOrder: 999,
          },
        })
        
        try {
          await tx.promptModelHint.upsert({
            where: {
              promptId_modelHintId: {
                promptId: prompt.id,
                modelHintId: modelHint.id,
              },
            },
            update: {},
            create: {
              promptId: prompt.id,
              modelHintId: modelHint.id,
            },
          })
          relationsCreated++
        } catch (error: unknown) {
          if (isPrismaClientKnownRequestError(error)) {
            if (error.code !== 'P2002') throw error
          } else {
            throw error
          }
        }
      }
    }
  })
  
  console.log("\n✅ Migración completada exitosamente!")
  console.log("📊 Resumen:")
  console.log(`   - Prompts procesados: ${promptsProcessed}`)
  console.log(`   - Entidades creadas: ${entitiesCreated}`)
  console.log(`   - Relaciones creadas: ${relationsCreated}`)
  console.log("\n⚠️  NOTA: Los campos string legacy (platform, useCase, clientOrProject, modelHint)")
  console.log("   se conservan para compatibilidad dual. Serán eliminados en un Sprint futuro.")
}

main()
  .catch((e) => {
    console.error("❌ Error en migración de datos:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
