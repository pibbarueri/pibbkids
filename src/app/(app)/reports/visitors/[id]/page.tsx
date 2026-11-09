import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canEditVisitor, canManage } from "@/lib/permissions";
import { visitorAgeText } from "@/lib/age";
import { dayKey } from "@/lib/dates";
import { mayBeSameChild } from "@/lib/visitor-names";
import { personKey, visitsOfPerson } from "@/lib/visitor-people";
import { VisitorDetailClient } from "./visitor-detail-client";

export default async function VisitorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) redirect("/login");
  const role = session.user.role;
  const isManager = canManage(role);

  const { id } = await params;
  const visits = await visitsOfPerson(id);
  if (!visits?.length) notFound();

  const latest = visits[visits.length - 1];
  const key = personKey(latest.name);
  const promoted = visits.some((v) => v.childId);
  const today = dayKey();

  // "Juntar" candidates: other not-yet-promoted children, likely matches first.
  let candidates: { id: string; name: string; ageText: string; className: string | null; likely: boolean }[] = [];
  if (isManager && !promoted) {
    const others = await prisma.visitor.findMany({
      where: { childId: null },
      include: { classGroup: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
    const seen = new Set<string>([key]);
    for (const v of others) {
      const k = personKey(v.name);
      if (seen.has(k)) continue;
      seen.add(k);
      candidates.push({
        id: v.id,
        name: v.name,
        ageText: visitorAgeText(v),
        className: v.classGroup?.name ?? null,
        likely: mayBeSameChild(v.name, latest.name),
      });
    }
    candidates = candidates.sort((a, b) => Number(b.likely) - Number(a.likely) || a.name.localeCompare(b.name, "pt-BR"));
  }

  return (
    <div className="p-4 pb-24">
      <VisitorDetailClient
        child={{
          id: latest.id,
          name: latest.name,
          birthdate: latest.birthdate?.toISOString() ?? null,
          ageMonths: latest.ageMonths,
          ageText: visitorAgeText(latest),
          classGroupId: latest.classGroupId,
          className: latest.classGroup?.name ?? null,
          promoted,
        }}
        visits={visits.map((v) => ({
          id: v.id,
          name: v.name,
          birthdate: v.birthdate?.toISOString() ?? null,
          ageMonths: v.ageMonths,
          type: v.type,
          day: dayKey(v.createdAt),
          canEdit: !v.childId && canEditVisitor(role, dayKey(v.createdAt), today),
        }))}
        isManager={isManager}
        candidates={candidates}
      />
    </div>
  );
}
