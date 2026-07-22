import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/permissions";
import { sortClasses } from "@/lib/classes";
import { OverviewClient } from "./overview-client";

function sundaysInRange(start: Date, end: Date): Date[] {
  const sundays: Date[] = [];
  const date = new Date(start);
  while (date.getDay() !== 0) date.setDate(date.getDate() + 1);
  while (date <= end) {
    sundays.push(new Date(date));
    date.setDate(date.getDate() + 7);
  }
  return sundays;
}

export default async function ScheduleOverviewPage() {
  const session = await auth();
  const role = session!.user.role;
  if (!canManage(role)) redirect("/dashboard");

  const now = new Date();
  const year = now.getFullYear();
  const semester = now.getMonth() < 6 ? 1 : 2;
  const start = semester === 1 ? new Date(year, 0, 1) : new Date(year, 6, 1);
  const end = semester === 1 ? new Date(year, 5, 30) : new Date(year, 11, 31);
  const sundays = sundaysInRange(start, end);

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
