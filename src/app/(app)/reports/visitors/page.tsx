import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { visitorAgeText } from "@/lib/age";
import { personKey } from "@/lib/visitor-people";
import { VisitorsListClient, type VisitingChild } from "./visitors-list-client";

export default async function VisitorsReportPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const visits = await prisma.visitor.findMany({
    include: { classGroup: { select: { name: true } }, child: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  // One entry per child (see lib/visitor-people.ts), described by the latest visit.
  const children = new Map<string, VisitingChild>();
  for (const v of visits) {
    const key = personKey(v);
    const existing = children.get(key);
    if (existing) {
      existing.visits += 1;
      existing.promoted ||= !!v.childId;
      continue;
    }
    children.set(key, {
      id: v.id,
      // Linked to a registered child: show the registered name.
      name: v.child?.name ?? v.name,
      ageText: visitorAgeText(v),
      className: v.classGroup?.name ?? null,
      lastVisit: v.createdAt.toISOString(),
      visits: 1,
      promoted: !!v.childId,
    });
  }

  return (
    <div className="p-4 pb-24">
      <VisitorsListClient items={[...children.values()]} />
    </div>
  );
}
