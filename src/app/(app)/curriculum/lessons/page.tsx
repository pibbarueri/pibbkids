import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/permissions";
import { sortClasses } from "@/lib/classes";
import { Role } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { LessonsClient } from "./lessons-client";

// Bounded to the school-year calendar: first Sunday of February through the
// last Sunday of December — matches how classes actually run through the year.
function sundaysInSchoolYear(year: number): Date[] {
  const sundays: Date[] = [];
  const date = new Date(year, 1, 1);
  while (date.getDay() !== 0) date.setDate(date.getDate() + 1);
  const yearEnd = new Date(year, 11, 31);
  while (date <= yearEnd) {
    sundays.push(new Date(date));
    date.setDate(date.getDate() + 7);
  }
  return sundays;
}

export default async function LessonsPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const role = session.user.role;
  const isManager = canManage(role);

  const now = new Date();
  const year = now.getFullYear();
  const sundays = sundaysInSchoolYear(year);
  const from = sundays[0];
  const to = sundays[sundays.length - 1];

  // Default to this week's Sunday (or the nearest upcoming one) instead of Feb 1.
  const todayKey = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  let initialSundayIdx = sundays.findIndex((s) => s.getTime() >= todayKey);
  if (initialSundayIdx === -1) initialSundayIdx = sundays.length - 1;

  const [plans, classes, journals, myClasses] = await Promise.all([
    prisma.sundayPlan.findMany({
      where: { date: { gte: from, lte: to } },
      include: {
        classGroup: { select: { id: true, name: true } },
        journal: { select: { id: true, title: true, series: true, edition: true } },
      },
      orderBy: [{ date: "asc" }, { tipo: "asc" }],
    }),
    prisma.classGroup.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    isManager
      ? prisma.journal.findMany({
          select: { id: true, title: true, series: true, edition: true, classGroupId: true, usage: true },
        })
      : Promise.resolve([]),
    isManager
      ? Promise.resolve([])
      : prisma.userPreferredClass.findMany({
          where: { userId: session.user.id },
          select: { classGroupId: true },
        }),
  ]);

  const myClassIds = myClasses.map((c) => c.classGroupId);

  return (
    <div className="p-4 space-y-4">
      {role === Role.TEACHER && (
        <div className="flex items-center justify-end gap-2">
          <Link href="/attendance/overview">
            <Button variant="outline" size="sm">Frequência de alunos</Button>
          </Link>
        </div>
      )}
      <LessonsClient
        initialPlans={plans as any}
        classes={sortClasses(classes)}
        journals={journals}
        sundays={sundays.map((d) => d.toISOString())}
        initialSundayIdx={initialSundayIdx}
        isManager={isManager}
        myClassIds={myClassIds}
      />
    </div>
  );
}
