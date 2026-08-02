import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/permissions";
import { sortClasses } from "@/lib/classes";
import { ScheduleClient } from "./schedule-client";
import { addDays, sundaysBetween, today as getToday, utcDate } from "@/lib/dates";

// Every sunday of the current year. The schedule is rebuilt fresh each January, so
// the year is the natural window — and it has to start in January, not at the current
// week, or nobody can look back at a past sunday.
function sundaysThisYear(year: number): Date[] {
  return sundaysBetween(utcDate(year, 0, 1), utcDate(year, 11, 31));
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  const role = session.user.role;
  // Read-only view of the full schedule is open to every role; only management can edit.
  const canViewAll = true;
  const canEdit = canManage(role);

  const today = getToday();
  const sundays = sundaysThisYear(today.getUTCFullYear());

  const from = sundays[0];
  const to = sundays[sundays.length - 1];

  const dayKey = (d: Date) => d.toISOString().slice(0, 10);
  // Land on the coming sunday; the past ones are still reachable by paging back.
  const thisWeek = addDays(today, -today.getUTCDay());
  let initialSundayIdx = Math.max(0, sundays.findIndex((s) => dayKey(s) === dayKey(thisWeek)));

  const { date } = await searchParams;
  if (date) {
    const target = dayKey(new Date(date));
    const found = sundays.findIndex((s) => dayKey(s) === target);
    if (found !== -1) initialSundayIdx = found;
  }

  const [slots, classes, volunteers] = await Promise.all([
    prisma.scheduleSlot.findMany({
      where: { date: { gte: from, lte: to } },
      include: {
        user: { select: { id: true, name: true } },
        classGroup: { select: { id: true, name: true } },
      },
      orderBy: [{ date: "asc" }, { slotType: "asc" }],
    }),
    prisma.classGroup.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    canEdit
      ? prisma.user.findMany({
          where: { active: true, status: "APPROVED" },
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            role: true,
            inclusionEnabled: true,
            preferredClasses: { select: { classGroupId: true } },
            functions: { select: { function: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="p-4 pb-24 space-y-4">
      <ScheduleClient
        initialSlots={slots as any}
        classes={sortClasses(classes)}
        volunteers={volunteers}
        sundays={sundays.map((d) => d.toISOString())}
        initialSundayIdx={initialSundayIdx}
        currentUserId={session.user.id}
        canViewAll={canViewAll}
        canEdit={canEdit}
      />
    </div>
  );
}
