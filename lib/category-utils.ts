import { prisma } from "@/lib/prisma"

/**
 * Enriches an array of category IDs by adding parent categories when a child
 * is selected without its parent. This ensures the hierarchy is preserved.
 *
 * Example: user selects "sh scripts" (child) → automatically adds "scripts" (parent)
 *          user selects "scripts" (parent) → nothing extra added
 */
export async function enrichWithParentCategories(
  categoryIds: string[] | undefined
): Promise<string[] | undefined> {
  if (!categoryIds || categoryIds.length === 0) return categoryIds

  // Find which selected categories have a parent
  const selectedCategories = await prisma.category.findMany({
    where: { id: { in: categoryIds } },
    select: { id: true, parentId: true },
  })

  // Collect parent IDs that are NOT already in the selection
  const missingParentIds = selectedCategories
    .filter((cat) => cat.parentId !== null && !categoryIds.includes(cat.parentId!))
    .map((cat) => cat.parentId as string)

  if (missingParentIds.length === 0) return categoryIds

  return [...categoryIds, ...missingParentIds]
}
