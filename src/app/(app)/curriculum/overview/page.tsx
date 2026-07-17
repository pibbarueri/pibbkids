import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isLeadership } from "@/lib/permissions";
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

export default async function OverviewPage() {
  const session = await auth();
  const role = session!.user.role;
  if (!isLeadership(role)) redirect("/dashboard");

  const now = new Date();
  const year = now.getFullYear();
  const semester = now.getMonth() < 6 ? 1 : 2;
  const start = semester === 1 ? new Date(year, 0, 1) : new Date(year, 6, 1);
  const end = semester === 1 ? new Date(year, 5, 30) : new Date(year, 11, 31);
  const sundays = sundaysInRange(start, end);

  const [plans, classes] = await Promise.all([
    prisma.sundayPlan.findMany({
      where: { date: { gte: start, lte: end } },
      include: {
        classGroup: { select: { id: true, name: true } },
        journal: { select: { id: true, title: true, edition: true } },
      },
    }),
    prisma.classGroup.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">Vista semestral — {semester}º semestre {year}</h1>
      <OverviewClient
        plans={plans as any}
        classes={classes}
        sundays={sundays.map((d) => d.toISOString())}
      />
    </div>
  );
}
