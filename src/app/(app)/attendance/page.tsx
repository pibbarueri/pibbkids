import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/permissions";
import { Role } from "@prisma/client";
import { AttendanceClient } from "./attendance-client";

function currentSunday(): Date {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = date.getDay();
  if (day !== 0) date.setDate(date.getDate() - day);
  return date;
}

export default async function AttendancePage() {
  const session = await auth();
  const role = session!.user.role;

  if (role !== Role.RECEPCAO && !canManage(role)) redirect("/dashboard");

  const sunday = currentSunday();
  const nextDay = new Date(sunday);
  nextDay.setDate(nextDay.getDate() + 1);

  const [children, classes, attendance] = await Promise.all([
    prisma.child.findMany({
      where: { registrationStatus: "APROVADO", active: true },
      include: { classGroup: { select: { id: true, name: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.classGroup.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.attendance.findMany({
      where: { date: { gte: sunday, lt: nextDay } },
    }),
  ]);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold">Presença</h1>
      <AttendanceClient
        children={children as any}
        classes={classes}
        initialAttendance={attendance as any}
        sunday={sunday.toISOString()}
      />
    </div>
  );
}
