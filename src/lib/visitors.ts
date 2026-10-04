import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { MAX_VISITOR_AGE_MONTHS, visitorClassName } from "@/lib/age";

export const ageMonthsField = z.number().int().min(0).max(MAX_VISITOR_AGE_MONTHS);

/**
 * The class follows the age (or birthdate), it's never picked by hand. Resolved on every
 * create/update so the turma can't drift from the age stored next to it.
 */
export async function classGroupIdForVisitor(v: { birthdate: Date | null; ageMonths: number | null }) {
  const name = visitorClassName(v);
  if (!name) return null;
  const cls = await prisma.classGroup.findFirst({ where: { name }, select: { id: true } });
  return cls?.id ?? null;
}
