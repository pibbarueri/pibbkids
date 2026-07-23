import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/permissions";
import { Role } from "@prisma/client";
import { AttendanceViewClient } from "./attendance-view-client";

function currentSunday(): Date {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = date.getDay();
  if (day !== 0) date.setDate(date.getDate() - day);
  return date;
}

// Read-only presence list — SUPPORT's Presença tab. Unlike /attendance (RECEPTIONIST/
// leadership), this never toggles presence, just shows who's checked in today.
export default async function AttendanceViewPage() {
  const session = await auth();
  if (!session) redirect("/login");
  const role = session.user.role;

  if (role !== Role.SUPPORT && !canManage(role)) redirect("/dashboard");

  const sunday = currentSunday();
  const nextDay = new Date(sunday);
  nextDay.setDate(nextDay.getDate() + 1);

  const [children, attendance] = await Promise.all([
    prisma.child.findMany({
      where: { classGroupId: { not: null }, active: true },
      include: { classGroup: { select: { id: true, name: true } } },
      orderBy: [{ classGroup: { name: "asc" } }, { name: "asc" }],
    }),
    prisma.attendance.findMany({
      where: { date: { gte: sunday, lt: nextDay } },
    }),
  ]);

  return (
    <div className="p-4 space-y-4">
      <AttendanceViewClient
        children={children as any}
        initialAttendance={attendance as any}
        currentSunday={sunday.toISOString()}
      />
    </div>
  );
}
