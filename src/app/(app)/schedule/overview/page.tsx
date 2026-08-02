import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/permissions";
import { sortClasses } from "@/lib/classes";
import { OverviewClient } from "./overview-client";
import { sundaysBetween, today as getToday, utcDate } from "@/lib/dates";

export default async function ScheduleOverviewPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const role = session.user.role;
  if (!canManage(role)) redirect("/dashboard");

  const now = getToday();
  const year = now.getUTCFullYear();
  const semester = now.getUTCMonth() < 6 ? 1 : 2;
  const start = semester === 1 ? utcDate(year, 0, 1) : utcDate(year, 6, 1);
  const end = semester === 1 ? utcDate(year, 5, 30) : utcDate(year, 11, 31);
  const sundays = sundaysBetween(start, end);

  const [slots, classes] = await Promise.all([
    prisma.scheduleSlot.findMany({
      where: { date: { gte: start, lte: end } },
      include: {
        user: { select: { name: true, username: true } },
        classGroup: { select: { id: true, name: true } },
      },
    }),
    prisma.classGroup.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="p-4 space-y-4">
      <p className="text-sm text-muted-foreground">{semester}º semestre {year}</p>
      <OverviewClient
        slots={slots.map((s) => ({ ...s, date: s.date.toISOString() }))}
        classes={sortClasses(classes)}
        sundays={sundays.map((d) => d.toISOString())}
      />
    </div>
  );
}
