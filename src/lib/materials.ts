import { prisma } from "@/lib/prisma";

export type MaterialCategoryOption = { id: string; name: string };

/**
 * Categories offered in the pickers. Retired ones (active = false) stay in the table so
 * the materials pointing at them keep their label, they just stop being selectable.
 */
export function listActiveMaterialCategories(): Promise<MaterialCategoryOption[]> {
  return prisma.materialCategory.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  });
}

/** Rejects ids that don't exist or were retired, so the picker and the API agree. */
export async function isSelectableCategory(id: string): Promise<boolean> {
  const found = await prisma.materialCategory.findFirst({
    where: { id, active: true },
    select: { id: true },
  });
  return !!found;
}
