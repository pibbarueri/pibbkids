import { MaterialCategory } from "@prisma/client";

export const MATERIAL_CATEGORY_LABELS: Record<MaterialCategory, string> = {
  PAPELARIA: "Papelaria",
  DECORACAO: "Decoração",
  LEMBRANCINHA: "Lembrancinha",
  TEATRO_FANTOCHES: "Teatro e Fantoches",
  BRINQUEDOS: "Brinquedos",
  ELETRONICOS: "Eletrônicos",
};

export function isMaterialCategory(value: unknown): value is MaterialCategory {
  return typeof value === "string" && value in MATERIAL_CATEGORY_LABELS;
}
