import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canManage, isLeadership } from "@/lib/permissions";
import { ScheduleClient } from "./schedule-client";

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

export default async function SchedulePage() {
  const session = await auth();
  const role = session!.user.role;
  const canViewAll = canManage(role);
  const canEdit = isLeadership(role);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const sundays = sundaysInMonth(year, month);

  const from = sundays[0];
  const to = sundays[sundays.length - 1];

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
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    canEdit
      ? prisma.user.findMany({
          where: { active: true, volunteerStatus: "APROVADO" },
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            role: true,
            preferredClasses: { select: { classGroupId: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="p-4 pb-24 space-y-4">
      <h1 className="text-xl font-bold">Escala</h1>
      <ScheduleClient
        initialSlots={slots as any}
        classes={classes}
        volunteers={volunteers}
        sundays={sundays.map((d) => d.toISOString())}
        currentUserId={session!.user.id}
        canViewAll={canViewAll}
        canEdit={canEdit}
      />
    </div>
  );
}
