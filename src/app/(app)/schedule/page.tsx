import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/permissions";
import { sortClasses } from "@/lib/classes";
import { ScheduleClient } from "./schedule-client";
import { nextSunday, sundaysBetween, today as getToday, utcDate } from "@/lib/dates";

// The schedule is rebuilt fresh each January, so the year is the natural window — and it
// has to start in January, not at the current week, or nobody can look back at a past
// sunday. The end stretches past December 31 when needed, because from the monday after
// the year's last sunday the upcoming sunday already belongs to next year, and landing on
// it is the whole point.
function scheduleWindow(today: Date): Date[] {
  const yearStart = utcDate(today.getUTCFullYear(), 0, 1);
  const yearEnd = utcDate(today.getUTCFullYear(), 11, 31);
  const upcoming = nextSunday(today);
  return sundaysBetween(yearStart, upcoming > yearEnd ? upcoming : yearEnd);
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
  const sundays = scheduleWindow(today);

  const from = sundays[0];
  const to = sundays[sundays.length - 1];

  // These are UTC-midnight calendar dates, so compare them in UTC. dayKey() from
  // src/lib/dates.ts formats in the app timezone and would report the previous day here.
  const dayKey = (d: Date) => d.toISOString().slice(0, 10);
  // Land on the sunday the ministry is working toward: today when today is a sunday,
  // otherwise the next one. Never a past sunday — those stay reachable by paging back.
  const upcoming = nextSunday(today);
  const found = sundays.findIndex((s) => dayKey(s) === dayKey(upcoming));
  // scheduleWindow() always includes the upcoming sunday, so -1 is unreachable — guarded
  // only so an unexpected miss lands on a real index instead of crashing the client.
  let initialSundayIdx = found === -1 ? sundays.length - 1 : found;

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
