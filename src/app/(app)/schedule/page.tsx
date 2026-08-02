import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/permissions";
import { sortClasses } from "@/lib/classes";
import { ScheduleClient } from "./schedule-client";
import { addDays, sundaysBetween, today as getToday, utcDate } from "@/lib/dates";

// All sundays from the current week through Dec 31 of this year — the schedule
// is rebuilt fresh each January, so there's no need to look further ahead.
function sundaysThroughYearEnd(): Date[] {
  const weekStart = addDays(getToday(), -getToday().getUTCDay());
  return sundaysBetween(weekStart, utcDate(weekStart.getUTCFullYear(), 11, 31));
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

  const sundays = sundaysThroughYearEnd();

  const from = sundays[0];
  const to = sundays[sundays.length - 1];

  const { date } = await searchParams;
  let initialSundayIdx = 0;
  if (date) {
    const target = new Date(date).toISOString().slice(0, 10);
    const found = sundays.findIndex((s) => s.toISOString().slice(0, 10) === target);
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
