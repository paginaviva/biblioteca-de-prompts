// Shared slug normalization: lowercase, diacritics folded to base letters,
// spaces and runs of non-alphanumerics collapsed to single hyphens.
export function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}
