import { prisma } from "@/lib/prisma";
import { normalize } from "@/lib/text";

// A child who visited several times has one Visitor row per visit. Visits already linked to
// a registered child group by that child; the others group by normalized name (the name
// match on check-in, or a manual "Juntar", keeps one child under one name). Two unrelated
// "Rebeca" visits stay apart once one of them is linked.
export function personKey(v: { name: string; childId: string | null }) {
  return v.childId ? `child:${v.childId}` : `name:${normalize(v.name)}`;
}

/** Every visit of the child that `visitorId` belongs to, oldest first. */
export async function visitsOfPerson(visitorId: string) {
  const visitor = await prisma.visitor.findUnique({ where: { id: visitorId }, select: { name: true, childId: true } });
  if (!visitor) return null;
  const key = personKey(visitor);
  const all = await prisma.visitor.findMany({
    include: { classGroup: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });
  return all.filter((v) => personKey(v) === key);
}
