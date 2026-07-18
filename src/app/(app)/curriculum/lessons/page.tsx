import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/permissions";
import { Role } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { LessonsClient } from "./lessons-client";

const CAN_MARK: Role[] = [Role.LIDERANCA, Role.COORDENACAO, Role.PROFESSOR];

function sundaysInMonth(year: number, month: number): Date[] {
  const sundays: Date[] = [];
  const date = new Date(year, month, 1);
  while (date.getDay() !== 0) date.setDate(date.getDate() + 1);
  while (date.getMonth() === month) {
    sundays.push(new Date(date));
    date.setDate(date.getDate() + 7);
  }
  return sundays;
}

export default async function LessonsPage() {
  const session = await auth();
  const role = session!.user.role;
  const isManager = canManage(role);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const sundays = sundaysInMonth(year, month);
  const from = sundays[0];
  const to = sundays[sundays.length - 1];

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
          where: { userId: session!.user.id },
          select: { classGroupId: true },
        }),
  ]);

  const myClassIds = myClasses.map((c) => c.classGroupId);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold">Aulas</h1>
        {isManager && (
          <Link href="/curriculum/overview">
            <Button variant="outline" size="sm">Vista semestral</Button>
          </Link>
        )}
      </div>
      <LessonsClient
        initialPlans={plans as any}
        classes={classes}
        journals={journals}
        sundays={sundays.map((d) => d.toISOString())}
        isManager={isManager}
        canMark={CAN_MARK.includes(role)}
        myClassIds={myClassIds}
      />
    </div>
  );
}
