import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AlertTriangle } from "lucide-react";
import { EventsCalendar } from "@/components/dashboard/events-calendar";
import { NextSundaySchedule } from "@/components/dashboard/next-sunday-schedule";
import { BirthdaysSection } from "@/components/dashboard/birthdays-section";
import { computeUpcomingBirthdays } from "@/lib/birthdays";
import { canManage } from "@/lib/permissions";
import { parseAppSettings, resolveLayout } from "@/lib/navigation";
import { addDays, nextSunday as getNextSunday, today as getToday } from "@/lib/dates";
import { getNotificationDots } from "@/lib/notifications";

// Tailwind can't generate a class from an interpolated string, so map them explicitly.
const GRID_COLS: Record<number, string> = {
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
};


export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const role = session.user.role;

  const nextSunday = getNextSunday();
  const isManager = canManage(role);

  const today = getToday();
  const in30Days = addDays(today, 30);

  const [hasApoioGeral, events, scheduleSlots, upcomingEvents30d, birthdayChildren, birthdayVolunteers, lowSnacks] = await Promise.all([
    prisma.volunteerFunction.findFirst({
      where: { userId: session.user.id, function: "SUPPORT" },
    }),
    prisma.event.findMany({
      where: { date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
      orderBy: { date: "asc" },
      select: { id: true, title: true, date: true, endDate: true, description: true },
    }),
    prisma.scheduleSlot.findMany({
      // date is a DATE column now, so plain equality matches the whole Sunday.
      where: { date: nextSunday, userId: session.user.id },
      orderBy: { slotType: "asc" },
      include: {
        user: { select: { name: true } },
        classGroup: { select: { name: true } },
      },
    }),
    prisma.event.findMany({
      where: { date: { gte: today, lt: in30Days } },
      orderBy: { date: "asc" },
      select: { id: true, title: true, date: true, endDate: true },
    }),
    prisma.child.findMany({ where: { active: true }, select: { name: true, birthdate: true } }),
    prisma.user.findMany({
      where: { active: true, birthdate: { not: null } },
      select: { name: true, birthdate: true },
    }),
    isManager
      ? prisma.snack.findMany({ where: { quantity: { lte: 5 } }, select: { description: true, quantity: true, unit: true } })
      : Promise.resolve([]),
  ]);

  const settingsRow = await prisma.userSettings.findUnique({ where: { userId: session.user.id } });
  const { dashboard: shortcuts, columns } = resolveLayout(
    role,
    { hasApoioGeral: !!hasApoioGeral },
    parseAppSettings(settingsRow?.appSettings)
  );
  const dots = await getNotificationDots(session.user.id, role, !!hasApoioGeral);

  const lowSnacksMessage = lowSnacks.length > 0
    ? lowSnacks.map((s) => `Temos ${s.quantity} ${s.unit} de ${s.description}`).join("\n")
    : null;

  const birthdays = computeUpcomingBirthdays([
    ...birthdayChildren.map((c) => ({ name: c.name, birthdate: c.birthdate, kind: "child" as const })),
    ...birthdayVolunteers
      .filter((v) => v.birthdate)
      .map((v) => ({ name: v.name, birthdate: v.birthdate as Date, kind: "volunteer" as const })),
  ]);

  return (
    <div className="p-4 space-y-4">
      {shortcuts.length > 0 && (
        <div className={`grid ${GRID_COLS[columns]} gap-2`}>
          {shortcuts.map((s) => (
            <Link
              key={s.id}
              href={s.href}
              className="flex flex-col items-center gap-1 p-2 border rounded-lg bg-background hover:bg-muted/50 transition-all active:scale-95"
            >
              <span className="relative">
                <s.icon className="h-5 w-5 shrink-0" />
                {dots[s.id as keyof typeof dots] && (
                  <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-orange-500" />
                )}
              </span>
              <span className="text-xs text-center leading-tight break-words">{s.label}</span>
            </Link>
          ))}
        </div>
      )}

      {lowSnacksMessage && (
        <div className="flex gap-2 p-3 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
          <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-orange-800 dark:text-orange-200">O LANCHE ESTÁ ACABANDO!</p>
            <p className="text-sm text-orange-700 dark:text-orange-300 whitespace-pre-line">{lowSnacksMessage}</p>
          </div>
        </div>
      )}

      <NextSundaySchedule
        date={nextSunday.toISOString()}
        slots={scheduleSlots}
        events={upcomingEvents30d.map((e) => ({ ...e, date: e.date.toISOString(), endDate: e.endDate?.toISOString() ?? null }))}
      />

      <EventsCalendar
        events={events.map((e) => ({ ...e, date: e.date.toISOString(), endDate: e.endDate?.toISOString() ?? null }))}
        birthdays={[...birthdayChildren, ...birthdayVolunteers]
          .filter((p) => p.birthdate)
          .map((p) => ({
            name: p.name,
            day: (p.birthdate as Date).getUTCDate(),
            month: (p.birthdate as Date).getUTCMonth() + 1,
          }))}
      />

      <BirthdaysSection
        birthdays={birthdays.map((b) => ({ name: b.name, label: b.label, date: b.date.toISOString() }))}
      />
    </div>
  );
}
