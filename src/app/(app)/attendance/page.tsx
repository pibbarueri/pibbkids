import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManage } from "@/lib/permissions";
import { Role } from "@prisma/client";
import { Button } from "@/components/ui/button";
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
  if (!session) redirect("/login");
  const role = session.user.role;

  if (role !== Role.RECEPTIONIST && !canManage(role)) redirect("/dashboard");

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
      {canManage(role) && (
        <div className="flex justify-end">
          <Link href="/attendance/overview">
            <Button variant="outline" size="sm">Visão semestral</Button>
          </Link>
        </div>
      )}
      <AttendanceClient
        children={children as any}
        initialAttendance={attendance as any}
        currentSunday={sunday.toISOString()}
        isAdmin={canManage(role)}
      />
    </div>
  );
}
