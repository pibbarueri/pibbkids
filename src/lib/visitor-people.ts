import { prisma } from "@/lib/prisma";
import { normalize } from "@/lib/text";

// A child who visited several times has one Visitor row per visit, all under the same name
// (the name match on check-in, or a manual "Juntar", makes sure of that). Grouping by the
// normalized name turns those rows back into one child.
export function personKey(name: string) {
  return normalize(name);
}

/** Every visit of the child that `visitorId` belongs to, oldest first. */
export async function visitsOfPerson(visitorId: string) {
  const visitor = await prisma.visitor.findUnique({ where: { id: visitorId }, select: { name: true } });
  if (!visitor) return null;
  const key = personKey(visitor.name);
  const all = await prisma.visitor.findMany({
    include: { classGroup: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });
  return all.filter((v) => personKey(v.name) === key);
}
