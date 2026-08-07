import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

// Passwords come from environment variables (never commit real credentials).
// The seed only creates/updates the two base accounts when run explicitly.
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD
const USER_PASSWORD = process.env.SEED_USER_PASSWORD

async function main() {
  if (!ADMIN_PASSWORD || !USER_PASSWORD) {
    throw new Error(
      "SEED_ADMIN_PASSWORD and SEED_USER_PASSWORD must be set to run the seed."
    )
  }

  // ==============================
  // USERS ONLY - No seed data
  // ==============================
  
  // Admin user
  const adminPassword = await bcrypt.hash(ADMIN_PASSWORD, 10)
  const admin = await prisma.user.upsert({
    where: { email: "server@paginaviva.net" },
    update: {
      password: adminPassword,
      role: "admin",
    },
    create: {
      email: "server@paginaviva.net",
      name: "Administrador",
      password: adminPassword,
      role: "admin",
      emailVerified: new Date(),
      promptListViewPreference: "cards",
    },
  })

  // Additional user
  const userPassword = await bcrypt.hash(USER_PASSWORD, 10)
  const user = await prisma.user.upsert({
    where: { email: "chamed@paginaviva.net" },
    update: {
      password: userPassword,
      role: "user",
    },
    create: {
      email: "chamed@paginaviva.net",
      name: "Usuario",
      password: userPassword,
      role: "user",
      emailVerified: new Date(),
      promptListViewPreference: "cards",
    },
  })

  // Catalog entities (taxonomy): type, status and language values used by
  // the prompt form and filters. Upsert so the seed is idempotent.
  const typeValues = [
    { name: "System", slug: "system", sortOrder: 0 },
    { name: "User", slug: "user", sortOrder: 1 },
    { name: "Tool", slug: "tool", sortOrder: 2 },
  ]
  for (const value of typeValues) {
    await prisma.type.upsert({
      where: { slug: value.slug },
      update: {},
      create: value,
    })
  }

  const statusValues = [
    { name: "Draft", slug: "draft", sortOrder: 0 },
    { name: "Tested", slug: "tested", sortOrder: 1 },
    { name: "Production", slug: "production", sortOrder: 2 },
  ]
  for (const value of statusValues) {
    await prisma.status.upsert({
      where: { slug: value.slug },
      update: {},
      create: value,
    })
  }

  const languageValues = [
    { name: "English", slug: "en", sortOrder: 0 },
    { name: "Spanish", slug: "es", sortOrder: 1 },
    { name: "French", slug: "fr", sortOrder: 2 },
    { name: "German", slug: "de", sortOrder: 3 },
    { name: "Italian", slug: "it", sortOrder: 4 },
    { name: "Portuguese", slug: "pt", sortOrder: 5 },
    { name: "Dutch", slug: "nl", sortOrder: 6 },
    { name: "Polish", slug: "pl", sortOrder: 7 },
    { name: "Russian", slug: "ru", sortOrder: 8 },
    { name: "Japanese", slug: "ja", sortOrder: 9 },
    { name: "Chinese", slug: "zh", sortOrder: 10 },
    { name: "Korean", slug: "ko", sortOrder: 11 },
  ]
  for (const value of languageValues) {
    await prisma.language.upsert({
      where: { slug: value.slug },
      update: {},
      create: value,
    })
  }

  console.log("✅ Users created/updated:", { admin: admin.id, user: user.id })
  console.log("✅ Seed data completed successfully!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
